'use client';

import React, { useState } from 'react';
import { updateSchoolProfile, uploadSchoolLogo, readFileAsDataUrl } from '../api/admin-api-client';

interface SchoolProfileFormProps {
  school: any;
  onUpdated: (updated: any) => void;
}

export function SchoolProfileForm({ school, onUpdated }: SchoolProfileFormProps) {
  const [name, setName] = useState(school.name || '');
  const [address, setAddress] = useState(school.address || '');
  const [contactEmail, setContactEmail] = useState(school.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(school.contactPhone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Logo upload state
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoMessage, setLogoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoMessage(null);
    if (!file) {
      setSelectedLogoFile(null);
      setLogoPreview(null);
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setLogoMessage({ type: 'error', text: 'School logo must be a PNG or JPEG image.' });
      setSelectedLogoFile(null);
      setLogoPreview(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoMessage({ type: 'error', text: 'Logo file exceeds 2 MB size limit.' });
      setSelectedLogoFile(null);
      setLogoPreview(null);
      return;
    }
    setSelectedLogoFile(file);
    readFileAsDataUrl(file).then((dataUrl) => setLogoPreview(dataUrl));
  };

  const handleUploadLogo = async () => {
    if (!selectedLogoFile) return;
    setIsUploadingLogo(true);
    setLogoMessage(null);
    try {
      const res = await uploadSchoolLogo(school.id, selectedLogoFile);
      setLogoMessage({ type: 'success', text: 'School logo uploaded and saved successfully.' });
      onUpdated(res.school);
      setSelectedLogoFile(null);
    } catch (err: any) {
      setLogoMessage({ type: 'error', text: err.message || 'Failed to upload logo.' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const updated = await updateSchoolProfile(school.id, {
        name,
        address: address || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
      });
      setMessage({ type: 'success', text: 'School profile updated successfully.' });
      onUpdated(updated);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      style={{
        background: '#ffffff',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem',
      }}
    >
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: '0 0 1rem 0' }}>
        School Profile & Campus Details
      </h3>

      {message && (
        <div
          role="alert"
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#f87171'}`,
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="edit-school-name"
          style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
        >
          School Name
        </label>
        <input
          id="edit-school-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="edit-school-address"
          style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
        >
          Campus Address
        </label>
        <textarea
          id="edit-school-address"
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label
            htmlFor="edit-school-email"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
          >
            Contact Email
          </label>
          <input
            id="edit-school-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="edit-school-phone"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
          >
            Contact Phone
          </label>
          <input
            id="edit-school-phone"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* School Logo & Branding Section */}
      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', margin: '0 0 0.5rem 0' }}>
          School Logo & Institutional Branding
        </h4>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
          Upload official school crest or emblem (PNG or JPEG, max 2 MB). Required for branded Transfer Certificate headers.
        </p>

        {logoMessage && (
          <div
            role="alert"
            style={{
              padding: '0.625rem 0.75rem',
              marginBottom: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              backgroundColor: logoMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: logoMessage.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${logoMessage.type === 'success' ? '#86efac' : '#f87171'}`,
            }}
          >
            {logoMessage.text}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Logo Preview box */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '8px',
              border: '2px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: '#f8fafc',
            }}
          >
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="School Logo Preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : school.logoFileId ? (
              <div style={{ textAlign: 'center', padding: '4px', fontSize: '0.6875rem', color: '#16a34a', fontWeight: 600 }}>
                ✓ Logo Configured
              </div>
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '4px' }}>
                No Logo
              </span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                id="school-logo-input"
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                disabled={isUploadingLogo}
                onChange={handleLogoFileSelect}
                style={{ fontSize: '0.8125rem', color: '#4b5563' }}
              />
              <button
                type="button"
                id="btn-upload-logo"
                onClick={handleUploadLogo}
                disabled={!selectedLogoFile || isUploadingLogo}
                style={{
                  padding: '0.4rem 0.85rem',
                  backgroundColor: !selectedLogoFile || isUploadingLogo ? '#9ca3af' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: !selectedLogoFile || isUploadingLogo ? 'not-allowed' : 'pointer',
                }}
              >
                {isUploadingLogo ? 'Uploading Logo...' : 'Upload Logo'}
              </button>
            </div>
            {school.logoFileId && (
              <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.75rem', color: '#15803d' }}>
                Active Logo Reference: <code style={{ backgroundColor: '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>{school.logoFileId}</code>
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        id="btn-save-profile"
        disabled={isSaving}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: isSaving ? '#9ca3af' : '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: isSaving ? 'not-allowed' : 'pointer',
        }}
      >
        {isSaving ? 'Saving Profile...' : 'Save Profile Changes'}
      </button>
    </form>
  );
}
