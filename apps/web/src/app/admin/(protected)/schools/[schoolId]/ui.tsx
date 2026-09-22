'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { SchoolNav } from '@/components/school-nav';
import { SchoolHeader } from '@/components/school-header';

export default function SchoolUi({ schoolId }: { schoolId: string }) {
  const [s, setS] = useState<any>();
  const [topErr, setTopErr] = useState('');
  const [topMsg, setTopMsg] = useState('');

  // Edit Modals
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [isEditingPrincipal, setIsEditingPrincipal] = useState(false);

  // In-page full image viewer modal state
  const [modalImage, setModalImage] = useState<{ url: string; title: string } | null>(null);

  // Section-specific feedback states
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [principalMsg, setPrincipalMsg] = useState('');
  const [principalErr, setPrincipalErr] = useState('');
  const [principalSaving, setPrincipalSaving] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoMsg, setLogoMsg] = useState('');
  const [logoErr, setLogoErr] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [sigMsg, setSigMsg] = useState('');
  const [sigErr, setSigErr] = useState('');
  const [uploadingSig, setUploadingSig] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const load = () =>
    api(`/platform/schools/${schoolId}`)
      .then(setS)
      .catch((e) => setTopErr(e.message));

  useEffect(() => {
    load();
  }, [schoolId]);

  // Handle ESC key to close in-page image modal or edit dialogs
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setModalImage(null);
        setIsEditingSchool(false);
        setIsEditingPrincipal(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Load server-persisted logo URL when school logoFileId is present
  useEffect(() => {
    let active = true;
    if (s?.logoFileId) {
      api<{ url: string }>(`/platform/schools/${schoolId}/logo`)
        .then((res) => {
          if (active && res?.url) setLogoUrl(res.url);
        })
        .catch(() => {
          if (active) {
            setLogoUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'}/platform/schools/${schoolId}/logo/view?t=${Date.now()}`);
          }
        });
    } else {
      setLogoUrl(null);
    }
    return () => {
      active = false;
    };
  }, [s?.logoFileId, schoolId]);

  // Load server-persisted principal signature URL when signatureFileId is present
  useEffect(() => {
    let active = true;
    if (s?.principal?.signatureFileId) {
      api<{ url: string }>(`/platform/schools/${schoolId}/principal/signature`)
        .then((res) => {
          if (active && res?.url) setSignatureUrl(res.url);
        })
        .catch(() => {
          if (active) {
            setSignatureUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'}/platform/schools/${schoolId}/principal/signature/view?t=${Date.now()}`);
          }
        });
    } else {
      setSignatureUrl(null);
    }
    return () => {
      active = false;
    };
  }, [s?.principal?.signatureFileId, schoolId]);

  async function openFullImage(path: string, title: string, existingUrl?: string | null) {
    if (existingUrl) {
      setModalImage({ url: existingUrl, title });
      return;
    }
    try {
      const x = await api<any>(path);
      if (x?.url) {
        setModalImage({ url: x.url, title });
      } else {
        setModalImage({
          url: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'}${path}/view`,
          title,
        });
      }
    } catch (e: any) {
      setTopErr(e.message);
    }
  }

  async function profile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setProfileSaving(true);
    const f = new FormData(e.currentTarget);
    try {
      await api(`/platform/schools/${schoolId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: f.get('name'),
          address: f.get('address') || null,
          phone: f.get('phone') || null,
          email: f.get('email') || null,
          version: s.version,
        }),
      });
      setProfileMsg('School details updated successfully');
      setTimeout(() => setProfileMsg(''), 4000);
      await load();
      setIsEditingSchool(false);
    } catch (e: any) {
      setProfileErr(e.message || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function principal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPrincipalMsg('');
    setPrincipalErr('');
    setPrincipalSaving(true);
    const f = new FormData(e.currentTarget);
    try {
      await api(`/platform/schools/${schoolId}/principal`, {
        method: 'PUT',
        body: JSON.stringify({
          name: f.get('name'),
          phone: f.get('phone') || null,
          email: f.get('email') || null,
        }),
      });
      setPrincipalMsg('Principal details saved successfully');
      setTimeout(() => setPrincipalMsg(''), 4000);
      await load();
      setIsEditingPrincipal(false);
    } catch (e: any) {
      setPrincipalErr(e.message || 'Failed to save principal details');
    } finally {
      setPrincipalSaving(false);
    }
  }

  async function upload(path: string, file: File | undefined) {
    if (!file) return;
    const isLogo = path.includes('logo');
    const isSig = path.includes('signature');

    // Display local preview immediately
    const localPreview = URL.createObjectURL(file);
    if (isLogo) {
      setLogoMsg('');
      setLogoErr('');
      setLogoUrl(localPreview);
      setUploadingLogo(true);
    } else if (isSig) {
      setSigMsg('');
      setSigErr('');
      setSignatureUrl(localPreview);
      setUploadingSig(true);
    }

    const f = new FormData();
    f.set('file', file);
    try {
      await api(path, { method: 'POST', body: f });
      if (isLogo) {
        setLogoMsg('School logo uploaded successfully');
        setTimeout(() => setLogoMsg(''), 4000);
      }
      if (isSig) {
        setSigMsg('Principal signature uploaded successfully');
        setTimeout(() => setSigMsg(''), 4000);
      }
      await load();
    } catch (e: any) {
      if (isLogo) {
        setLogoErr(e.message || 'File upload failed');
        if (!s?.logoFileId) setLogoUrl(null);
      }
      if (isSig) {
        setSigErr(e.message || 'File upload failed');
        if (!s?.principal?.signatureFileId) setSignatureUrl(null);
      }
    } finally {
      if (isLogo) setUploadingLogo(false);
      if (isSig) setUploadingSig(false);
    }
  }

  async function remove(path: string) {
    if (!confirm('Remove this current association? Previously issued documents keep their frozen asset.'))
      return;
    const isLogo = path.includes('logo');
    const isSig = path.includes('signature');
    try {
      await api(path, { method: 'DELETE' });
      if (isLogo) {
        setLogoUrl(null);
        if (logoInputRef.current) logoInputRef.current.value = '';
        setLogoMsg('School logo removed successfully');
        setTimeout(() => setLogoMsg(''), 4000);
        setLogoErr('');
      }
      if (isSig) {
        setSignatureUrl(null);
        if (sigInputRef.current) sigInputRef.current.value = '';
        setSigMsg('Principal signature removed successfully');
        setTimeout(() => setSigMsg(''), 4000);
        setSigErr('');
      }
      await load();
    } catch (e: any) {
      if (isLogo) setLogoErr(e.message);
      if (isSig) setSigErr(e.message);
    }
  }

  if (!s && !topErr) {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <SchoolHeader schoolId={schoolId} loading={true} />
        <SchoolNav schoolId={schoolId} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div style={{ height: 260, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }} />
          <div style={{ height: 260, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      {/* Hidden File Inputs for logo and signature */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={(e) => upload(`/platform/schools/${schoolId}/logo`, e.target.files?.[0])}
      />
      <input
        ref={sigInputRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={(e) =>
          upload(`/platform/schools/${schoolId}/principal/signature`, e.target.files?.[0])
        }
      />

      {/* Reusable School Header */}
      <SchoolHeader
        school={s}
        schoolId={schoolId}
        logoUrl={logoUrl}
        onStatusChange={() => load()}
        onEditSchool={() => {
          setProfileErr('');
          setIsEditingSchool(true);
        }}
      />

      {/* Tabs Navigation */}
      <SchoolNav schoolId={schoolId} />

      {/* Notifications */}
      {topErr && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#991b1b',
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{topErr}</span>
          <button
            type="button"
            onClick={() => {
              setTopErr('');
              load();
            }}
            style={{
              background: '#ffffff',
              border: '1px solid #fecaca',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}
      {topMsg && (
        <div
          role="status"
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#065f46',
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 20,
          }}
        >
          {topMsg}
        </div>
      )}

      {/* 2x2 Grid of Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}
      >
        {/* ========================================================= */}
        {/* CARD 1: School Information                                */}
        {/* ========================================================= */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 16,
              borderBottom: '1px solid #f1f5f9',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                School Information
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setProfileErr('');
                setIsEditingSchool(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dbeafe';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#eff6ff';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit</span>
            </button>
          </div>

          {/* Feedback */}
          {profileMsg && (
            <div style={{ color: '#047857', background: '#ecfdf5', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              ✓ {profileMsg}
            </div>
          )}

          {/* Card Body: Key-Value Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>School Name</span>
              <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{s.name || '—'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>School ID</span>
              <span style={{ fontSize: 13, color: '#334155', fontWeight: 600, fontFamily: 'monospace' }}>
                {s.id}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Phone</span>
              <span style={{ fontSize: 14, color: s.phone ? '#0f172a' : '#94a3b8' }}>{s.phone || '—'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Email</span>
              <span style={{ fontSize: 14, color: s.email ? '#0f172a' : '#94a3b8' }}>{s.email || '—'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Address</span>
              <span style={{ fontSize: 14, color: s.address ? '#0f172a' : '#94a3b8', lineHeight: 1.4 }}>
                {s.address || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 2: School Logo                                       */}
        {/* ========================================================= */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 16,
              borderBottom: '1px solid #f1f5f9',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                School Logo
              </h2>
            </div>

            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dbeafe';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#eff6ff';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>{uploadingLogo ? 'Uploading…' : logoUrl ? 'Change' : 'Upload'}</span>
            </button>
          </div>

          {/* Feedback */}
          {logoMsg && (
            <div style={{ color: '#047857', background: '#ecfdf5', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              ✓ {logoMsg}
            </div>
          )}
          {logoErr && (
            <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              ⚠ {logoErr}
            </div>
          )}

          {/* Card Body */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {logoUrl ? (
              /* Logo Present State */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div
                    style={{
                      width: 104,
                      height: 104,
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 8,
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <img
                      src={logoUrl}
                      alt="School Logo"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      Official School Emblem
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => openFullImage(`/platform/schools/${schoolId}/logo`, 'School Logo', logoUrl)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 12px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>View full size</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => remove(`/platform/schools/${schoolId}/logo`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 12px',
                          borderRadius: 6,
                          border: '1px solid #fecaca',
                          background: '#fff5f5',
                          color: '#b91c1c',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 18, fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                  This logo will be used on official documents such as transfer certificates.
                </div>
              </div>
            ) : (
              /* Logo Empty State */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    marginBottom: 12,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  No school logo yet
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                  Add a logo to use on official documents.
                </div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Upload logo</span>
                </button>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
                  Supports JPG, PNG (Max 2 MB)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 3: Principal Details                                 */}
        {/* ========================================================= */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 16,
              borderBottom: '1px solid #f1f5f9',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Principal Details
              </h2>
            </div>

            {s.principal?.name && (
              <button
                type="button"
                onClick={() => {
                  setPrincipalErr('');
                  setIsEditingPrincipal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#2563eb',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dbeafe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* Feedback */}
          {principalMsg && (
            <div style={{ color: '#047857', background: '#ecfdf5', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              ✓ {principalMsg}
            </div>
          )}

          {/* Card Body */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {s.principal?.name ? (
              /* Principal Present State */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Name</span>
                  <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{s.principal.name}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Email</span>
                  <span style={{ fontSize: 14, color: s.principal.email ? '#0f172a' : '#94a3b8' }}>
                    {s.principal.email || '—'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Phone</span>
                  <span style={{ fontSize: 14, color: s.principal.phone ? '#0f172a' : '#94a3b8' }}>
                    {s.principal.phone || '—'}
                  </span>
                </div>
              </div>
            ) : (
              /* Principal Empty State */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    marginBottom: 12,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  No principal details recorded yet.
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                  Add principal details to generate official documents.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPrincipalErr('');
                    setIsEditingPrincipal(true);
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Add Principal</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 4: Principal Signature                               */}
        {/* ========================================================= */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 16,
              borderBottom: '1px solid #f1f5f9',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                  <circle cx="11" cy="11" r="2" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Principal Signature
              </h2>
            </div>

            <button
              type="button"
              onClick={() => sigInputRef.current?.click()}
              disabled={uploadingSig}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                cursor: uploadingSig ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dbeafe';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#eff6ff';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>{uploadingSig ? 'Uploading…' : signatureUrl ? 'Change' : 'Upload'}</span>
            </button>
          </div>

          {/* Feedback */}
          {sigMsg && (
            <div style={{ color: '#047857', background: '#ecfdf5', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              ✓ {sigMsg}
            </div>
          )}
          {sigErr && (
            <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              ⚠ {sigErr}
            </div>
          )}

          {/* Card Body */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {signatureUrl ? (
              /* Signature Present State */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div
                    style={{
                      width: 130,
                      height: 70,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 6,
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <img
                      src={signatureUrl}
                      alt="Principal Signature"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      Authorized Specimen
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => openFullImage(`/platform/schools/${schoolId}/principal/signature`, 'Principal Signature', signatureUrl)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 12px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>View full size</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => remove(`/platform/schools/${schoolId}/principal/signature`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 12px',
                          borderRadius: 6,
                          border: '1px solid #fecaca',
                          background: '#fff5f5',
                          color: '#b91c1c',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 18, fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                  This signature will be used on official documents such as transfer certificates.
                </div>
              </div>
            ) : (
              /* Signature Empty State */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    marginBottom: 12,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                    <path d="M2 2l7.586 7.586" />
                    <circle cx="11" cy="11" r="2" />
                  </svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                  No principal signature yet
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                  Add the principal signature to use on official documents.
                </div>
                <button
                  type="button"
                  onClick={() => sigInputRef.current?.click()}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Upload signature</span>
                </button>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
                  Supports JPG, PNG (Max 2 MB)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Edit School Details                                */}
      {/* ========================================================= */}
      {isEditingSchool && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-school-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditingSchool(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 520,
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 id="edit-school-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Edit School Information
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingSchool(false)}
                aria-label="Close dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {profileErr && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠ {profileErr}
              </div>
            )}

            <form onSubmit={profile}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="field">
                  <label htmlFor="school-name-input">School Name *</label>
                  <input
                    id="school-name-input"
                    name="name"
                    required
                    defaultValue={s.name}
                    placeholder="e.g. Aryabhatta Public School"
                  />
                </div>

                <div className="field">
                  <label htmlFor="school-address-input">Address</label>
                  <textarea
                    id="school-address-input"
                    name="address"
                    rows={2}
                    defaultValue={s.address || ''}
                    placeholder="Full street address and location"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label htmlFor="school-phone-input">Phone</label>
                    <input
                      id="school-phone-input"
                      name="phone"
                      defaultValue={s.phone || ''}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="school-email-input">Email</label>
                    <input
                      id="school-email-input"
                      name="email"
                      type="email"
                      defaultValue={s.email || ''}
                      placeholder="e.g. info@school.edu"
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditingSchool(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Edit Principal Details                             */}
      {/* ========================================================= */}
      {isEditingPrincipal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-principal-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditingPrincipal(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 id="edit-principal-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {s.principal?.name ? 'Edit Principal Details' : 'Add Principal Details'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingPrincipal(false)}
                aria-label="Close dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {principalErr && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠ {principalErr}
              </div>
            )}

            <form onSubmit={principal}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="field">
                  <label htmlFor="principal-name-input">Principal Full Name *</label>
                  <input
                    id="principal-name-input"
                    name="name"
                    required
                    defaultValue={s.principal?.name || ''}
                    placeholder="e.g. Dr. Rajesh Kumar"
                  />
                </div>

                <div className="field">
                  <label htmlFor="principal-email-input">Email Address</label>
                  <input
                    id="principal-email-input"
                    name="email"
                    type="email"
                    defaultValue={s.principal?.email || ''}
                    placeholder="e.g. principal@school.edu"
                  />
                </div>

                <div className="field">
                  <label htmlFor="principal-phone-input">Phone Number</label>
                  <input
                    id="principal-phone-input"
                    name="phone"
                    defaultValue={s.principal?.phone || ''}
                    placeholder="e.g. 9123456789"
                  />
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditingPrincipal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={principalSaving}
                >
                  {principalSaving ? 'Saving…' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: In-Page Full Size Image Viewer                     */}
      {/* ========================================================= */}
      {modalImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modalImage.title}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalImage(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              overflow: 'hidden',
              maxWidth: 600,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {modalImage.title}
              </h3>
              <button
                type="button"
                onClick={() => setModalImage(null)}
                aria-label="Close full size view"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div
              style={{
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                minHeight: 280,
              }}
            >
              <img
                src={modalImage.url}
                alt={modalImage.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  objectFit: 'contain',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
