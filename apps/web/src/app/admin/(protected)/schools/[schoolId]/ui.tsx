'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { SchoolNav } from '@/components/school-nav';

export default function SchoolUi({ schoolId }: { schoolId: string }) {
  const [s, setS] = useState<any>();
  const [topErr, setTopErr] = useState('');
  const [topMsg, setTopMsg] = useState('');

  // Mode state: default is read-only (false)
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [isEditingPrincipal, setIsEditingPrincipal] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [isEditingSig, setIsEditingSig] = useState(false);

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

  // Handle ESC key to close in-page image modal
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalImage(null);
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

  async function handleLogoError() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'}/platform/schools/${schoolId}/logo/view`, {
        credentials: 'include',
      });
      if (res.ok) {
        const blob = await res.blob();
        setLogoUrl(URL.createObjectURL(blob));
      }
    } catch { }
  }

  async function handleSigError() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'}/platform/schools/${schoolId}/principal/signature/view`, {
        credentials: 'include',
      });
      if (res.ok) {
        const blob = await res.blob();
        setSignatureUrl(URL.createObjectURL(blob));
      }
    } catch { }
  }

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
      setProfileMsg('Profile saved successfully');
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
      await load();
      setIsEditingPrincipal(false);
    } catch (e: any) {
      setPrincipalErr(e.message || 'Failed to save principal details');
    } finally {
      setProfileSaving(false);
    }
  }

  async function upload(path: string, file: File | undefined) {
    if (!file) return;
    const isLogo = path.includes('logo');
    const isSig = path.includes('signature');

    // Immediately display preview on screen so user can confirm right away
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
        setLogoMsg('School logo uploaded and saved successfully');
        setIsEditingLogo(false);
      }
      if (isSig) {
        setSigMsg('Principal signature uploaded and saved successfully');
        setIsEditingSig(false);
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
        setLogoErr('');
        setIsEditingLogo(false);
      }
      if (isSig) {
        setSignatureUrl(null);
        if (sigInputRef.current) sigInputRef.current.value = '';
        setSigMsg('Principal signature removed successfully');
        setSigErr('');
        setIsEditingSig(false);
      }
      await load();
    } catch (e: any) {
      if (isLogo) setLogoErr(e.message);
      if (isSig) setSigErr(e.message);
    }
  }

  if (!s) return <div className="container">{topErr || 'Loading…'}</div>;

  return (
    <div className="container">
      <SchoolNav schoolId={schoolId} />

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>{s.name}</h1>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>School UUID:</span>
            <code style={{
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: 700,
              color: '#1d4ed8',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '2px 8px',
              borderRadius: 4
            }}>
              {s.id}
            </code>
          </div>
        </div>
        <div className="row">
          <span className="badge">{s.status}</span>
          {s.status !== 'ACTIVE' ? (
            <button
              className="btn btn-primary"
              onClick={async () => {
                try {
                  await api(`/platform/schools/${schoolId}/status`, {
                    method: 'POST',
                    body: JSON.stringify({ status: 'ACTIVE' }),
                  });
                  setTopMsg('School activated successfully');
                  load();
                } catch (e: any) {
                  setTopErr(e.message);
                }
              }}
            >
              Activate
            </button>
          ) : (
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (confirm('Deactivate school and revoke operator sessions?')) {
                  try {
                    await api(`/platform/schools/${schoolId}/status`, {
                      method: 'POST',
                      body: JSON.stringify({ status: 'INACTIVE' }),
                    });
                    setTopMsg('School deactivated');
                    load();
                  } catch (e: any) {
                    setTopErr(e.message);
                  }
                }
              }}
            >
              Deactivate
            </button>
          )}
        </div>
      </div>

      {topErr && (
        <p className="error" role="alert" style={{ marginBottom: 16 }}>
          {topErr}
        </p>
      )}
      {topMsg && (
        <p className="success" role="status" style={{ marginBottom: 16 }}>
          {topMsg}
        </p>
      )}

      <div className="grid grid-2">
        {/* ===================== School Details ===================== */}
        <div className="card grid" style={{ alignContent: 'start', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>School Details</h2>
            {!isEditingSchool ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => {
                  setIsEditingSchool(true);
                  setProfileMsg('');
                  setProfileErr('');
                }}
              >
                Edit School
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => {
                  setIsEditingSchool(false);
                  setProfileErr('');
                }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Inline Feedback */}
          {profileMsg && (
            <div
              className="success"
              role="status"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontWeight: 600,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 6
              }}
            >
              <span style={{ fontSize: 14 }}>✓</span> {profileMsg}
            </div>
          )}
          {profileErr && (
            <div
              className="error"
              role="alert"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontWeight: 600,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 6
              }}
            >
              ⚠ {profileErr}
            </div>
          )}

          {!isEditingSchool ? (
            /* Read-Only Details View */
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                  School Name
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                  {s.name}
                </div>
              </div>

              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                  Address
                </div>
                <div style={{ fontSize: 14, color: s.address ? '#1e293b' : '#94a3b8', whiteSpace: 'pre-wrap' }}>
                  {s.address || 'Not provided'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <div>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                    Phone
                  </div>
                  <div style={{ fontSize: 14, color: s.phone ? '#1e293b' : '#94a3b8' }}>
                    {s.phone || 'Not provided'}
                  </div>
                </div>

                <div>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                    Email
                  </div>
                  <div style={{ fontSize: 14, color: s.email ? '#1e293b' : '#94a3b8' }}>
                    {s.email || 'Not provided'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Editable Form View */
            <form className="grid" onSubmit={profile} style={{ gap: 12 }}>
              <div className="field">
                <label>Name</label>
                <input name="name" defaultValue={s.name} required />
              </div>
              <div className="field">
                <label>Address</label>
                <textarea name="address" defaultValue={s.address || ''} rows={3} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input name="phone" defaultValue={s.phone || ''} />
              </div>
              <div className="field">
                <label>Email</label>
                <input name="email" type="email" defaultValue={s.email || ''} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save School'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditingSchool(false);
                    setProfileErr('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ===================== School Logo ===================== */}
        <div className="card grid" style={{ gap: 16, alignContent: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>School Logo</h2>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
                Private PNG/JPEG, maximum 5 MB.
              </p>
            </div>
            {!isEditingLogo ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => {
                  setIsEditingLogo(true);
                  setLogoMsg('');
                  setLogoErr('');
                }}
              >
                {s.logoFileId ? 'Edit Logo' : 'Upload Logo'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => {
                  setIsEditingLogo(false);
                  setLogoErr('');
                }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Inline Feedback */}
          {logoMsg && (
            <div
              className="success"
              role="status"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontWeight: 600,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 6
              }}
            >
              <span style={{ fontSize: 14 }}>✓</span> {logoMsg}
            </div>
          )}
          {logoErr && (
            <div
              className="error"
              role="alert"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontWeight: 600,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 6
              }}
            >
              ⚠ {logoErr}
            </div>
          )}

          {/* Logo Visual Presentation */}
          {logoUrl ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 16,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ✓ Uploaded School Logo
                </span>
                <span className="badge" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', fontSize: 11 }}>
                  Saved
                </span>
              </div>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 140,
                  maxHeight: 220,
                  cursor: 'pointer'
                }}
                title="Click to view full image"
                onClick={() => openFullImage(`/platform/schools/${schoolId}/logo`, `${s.name} — School Logo`, logoUrl)}
              >
                <img
                  src={logoUrl}
                  alt="Uploaded School Logo"
                  onError={handleLogoError}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 190,
                    objectFit: 'contain'
                  }}
                />
              </div>
              <div className="row" style={{ marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 13, padding: '6px 12px' }}
                  onClick={() => openFullImage(`/platform/schools/${schoolId}/logo`, `${s.name} — School Logo`, logoUrl)}
                >
                  View Full Image
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '24px 16px',
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: 8,
              textAlign: 'center',
              color: '#64748b',
              fontSize: 13
            }}>
              No school logo uploaded yet.
            </div>
          )}

          {/* Editable Upload/Replace Section */}
          {isEditingLogo && (
            <div style={{
              padding: 16,
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              display: 'grid',
              gap: 12
            }}>
              <div className="field">
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  {s.logoFileId ? 'Upload New Logo to Replace Current' : 'Choose Logo File to Upload'}
                </label>
                <input
                  ref={logoInputRef}
                  aria-label="Choose school logo"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => upload(`/platform/schools/${schoolId}/logo`, e.target.files?.[0])}
                />
                {uploadingLogo && <span className="muted" style={{ fontSize: 12 }}>Uploading logo...</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {s.logoFileId && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ fontSize: 13, padding: '6px 12px' }}
                    onClick={() => remove(`/platform/schools/${schoolId}/logo`)}
                  >
                    Remove Current Logo
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 13, padding: '6px 12px' }}
                  onClick={() => setIsEditingLogo(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===================== Principal Details ===================== */}
        <div className="card grid" style={{ alignContent: 'start', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Principal Details</h2>
            {!isEditingPrincipal ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => {
                  setIsEditingPrincipal(true);
                  setPrincipalMsg('');
                  setPrincipalErr('');
                }}
              >
                Edit Principal
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => {
                  setIsEditingPrincipal(false);
                  setPrincipalErr('');
                }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Inline Feedback */}
          {principalMsg && (
            <div
              className="success"
              role="status"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontWeight: 600,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 6
              }}
            >
              <span style={{ fontSize: 14 }}>✓</span> {principalMsg}
            </div>
          )}
          {principalErr && (
            <div
              className="error"
              role="alert"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontWeight: 600,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 6
              }}
            >
              ⚠ {principalErr}
            </div>
          )}

          {!isEditingPrincipal ? (
            /* Read-Only Principal View */
            s.principal ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                    Principal Name
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                    {s.principal.name}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                      Phone
                    </div>
                    <div style={{ fontSize: 14, color: s.principal.phone ? '#1e293b' : '#94a3b8' }}>
                      {s.principal.phone || 'Not provided'}
                    </div>
                  </div>

                  <div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                      Email
                    </div>
                    <div style={{ fontSize: 14, color: s.principal.email ? '#1e293b' : '#94a3b8' }}>
                      {s.principal.email || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '20px 16px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 8,
                color: '#64748b',
                fontSize: 14
              }}>
                No principal details recorded yet. Click <strong>Edit Principal</strong> to add details.
              </div>
            )
          ) : (
            /* Editable Form View */
            <form className="grid" onSubmit={principal} style={{ gap: 12 }}>
              <div className="field">
                <label>Name</label>
                <input name="name" defaultValue={s.principal?.name || ''} required />
              </div>
              <div className="field">
                <label>Phone</label>
                <input name="phone" defaultValue={s.principal?.phone || ''} />
              </div>
              <div className="field">
                <label>Email</label>
                <input name="email" type="email" defaultValue={s.principal?.email || ''} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" disabled={principalSaving}>
                  {principalSaving ? 'Saving...' : 'Save Principal'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditingPrincipal(false);
                    setPrincipalErr('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ===================== Principal Signature ===================== */}
        <div className="card grid" style={{ gap: 16, alignContent: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>Principal Signature</h2>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
                Private PNG/JPEG signature specimen.
              </p>
            </div>
            {!isEditingSig ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '6px 14px' }}
                disabled={!s.principal}
                onClick={() => {
                  setIsEditingSig(true);
                  setSigMsg('');
                  setSigErr('');
                }}
              >
                {s.principal?.signatureFileId ? 'Edit Signature' : 'Upload Signature'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => {
                  setIsEditingSig(false);
                  setSigErr('');
                }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Inline Feedback */}
          {sigMsg && (
            <div
              className="success"
              role="status"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontWeight: 600,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 6
              }}
            >
              <span style={{ fontSize: 14 }}>✓</span> {sigMsg}
            </div>
          )}
          {sigErr && (
            <div
              className="error"
              role="alert"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontWeight: 600,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 6
              }}
            >
              ⚠ {sigErr}
            </div>
          )}

          {/* Signature Visual Presentation */}
          {signatureUrl ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 16,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ✓ Uploaded Principal Signature
                </span>
                <span className="badge" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', fontSize: 11 }}>
                  Saved
                </span>
              </div>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 100,
                  maxHeight: 160,
                  cursor: 'pointer'
                }}
                title="Click to view full image"
                onClick={() => openFullImage(`/platform/schools/${schoolId}/principal/signature`, `${s.principal?.name || 'Principal'} — Signature Specimen`, signatureUrl)}
              >
                <img
                  src={signatureUrl}
                  alt="Uploaded Principal Signature"
                  onError={handleSigError}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 130,
                    objectFit: 'contain'
                  }}
                />
              </div>
              <div className="row" style={{ marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 13, padding: '6px 12px' }}
                  onClick={() => openFullImage(`/platform/schools/${schoolId}/principal/signature`, `${s.principal?.name || 'Principal'} — Signature Specimen`, signatureUrl)}
                >
                  View Full Image
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '24px 16px',
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: 8,
              textAlign: 'center',
              color: '#64748b',
              fontSize: 13
            }}>
              {s.principal
                ? 'No signature specimen uploaded yet.'
                : 'Save principal details first to enable signature upload.'}
            </div>
          )}

          {/* Editable Upload/Replace Section */}
          {isEditingSig && (
            <div style={{
              padding: 16,
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              display: 'grid',
              gap: 12
            }}>
              <div className="field">
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  {s.principal?.signatureFileId ? 'Upload New Signature to Replace Current' : 'Choose Signature File to Upload'}
                </label>
                <input
                  ref={sigInputRef}
                  aria-label="Choose principal signature"
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={!s.principal}
                  onChange={(e) => upload(`/platform/schools/${schoolId}/principal/signature`, e.target.files?.[0])}
                />
                {uploadingSig && <span className="muted" style={{ fontSize: 12 }}>Uploading signature...</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {s.principal?.signatureFileId && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ fontSize: 13, padding: '6px 12px' }}
                    onClick={() => remove(`/platform/schools/${schoolId}/principal/signature`)}
                  >
                    Remove Current Signature
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 13, padding: '6px 12px' }}
                  onClick={() => setIsEditingSig(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!s.principal && <div className="muted" style={{ fontSize: 13 }}>Save principal details first.</div>}
        </div>
      </div>

      {/* ===================== In-Page Full Image Lightbox Modal ===================== */}
      {modalImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modalImage.title}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
          onClick={() => setModalImage(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              width: 'min(780px, 92vw)',
              maxHeight: '90vh',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    padding: '6px 14px',
                    fontWeight: 600
                  }}
                  onClick={() => setModalImage(null)}
                >
                  ← Back to Details
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                  {modalImage.title}
                </span>
              </div>

              <button
                type="button"
                aria-label="Close image modal"
                style={{
                  background: 'transparent',
                  border: 0,
                  fontSize: 22,
                  lineHeight: 1,
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6
                }}
                onClick={() => setModalImage(null)}
              >
                ✕
              </button>
            </div>

            {/* Modal Image Body */}
            <div style={{
              padding: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              background: '#ffffff',
              minHeight: 220,
              maxHeight: '68vh'
            }}>
              <img
                src={modalImage.url}
                alt={modalImage.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '64vh',
                  objectFit: 'contain',
                  borderRadius: 6
                }}
              />
            </div>

            {/* Modal Bottom Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: 12,
              color: '#64748b'
            }}>
              <span>Press <kbd style={{ padding: '2px 6px', background: '#e2e8f0', borderRadius: 4, fontFamily: 'monospace' }}>Esc</kbd> or click outside to return</span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={() => setModalImage(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
