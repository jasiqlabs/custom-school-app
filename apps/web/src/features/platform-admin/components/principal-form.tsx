'use client';

import React, { useState } from 'react';
import { updatePrincipal, uploadPrincipalSignature, readFileAsDataUrl } from '../api/admin-api-client';

interface PrincipalFormProps {
  school: any;
  onUpdated: (updated: any) => void;
}

export function PrincipalForm({ school, onUpdated }: PrincipalFormProps) {
  const [principalName, setPrincipalName] = useState(school.principalName || '');
  const [contactNumber, setContactNumber] = useState(school.principalContactNumber || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Signature upload state
  const [selectedSigFile, setSelectedSigFile] = useState<File | null>(null);
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [isUploadingSig, setIsUploadingSig] = useState(false);
  const [sigMessage, setSigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSigFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSigMessage(null);
    if (!file) {
      setSelectedSigFile(null);
      setSigPreview(null);
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setSigMessage({ type: 'error', text: 'Principal signature must be a PNG or JPEG image.' });
      setSelectedSigFile(null);
      setSigPreview(null);
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setSigMessage({ type: 'error', text: 'Signature file exceeds 1 MB size limit.' });
      setSelectedSigFile(null);
      setSigPreview(null);
      return;
    }
    setSelectedSigFile(file);
    readFileAsDataUrl(file).then((dataUrl) => setSigPreview(dataUrl));
  };

  const handleUploadSig = async () => {
    if (!selectedSigFile) return;
    setIsUploadingSig(true);
    setSigMessage(null);
    try {
      const res = await uploadPrincipalSignature(school.id, selectedSigFile);
      setSigMessage({ type: 'success', text: 'Principal signature uploaded and saved successfully.' });
      onUpdated(res.school);
      setSelectedSigFile(null);
    } catch (err: any) {
      setSigMessage({ type: 'error', text: err.message || 'Failed to upload signature.' });
    } finally {
      setIsUploadingSig(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const updated = await updatePrincipal(school.id, {
        principalName: principalName || null,
        contactNumber: contactNumber || null,
      });
      setMessage({ type: 'success', text: 'Principal details updated successfully.' });
      onUpdated(updated);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update principal details.' });
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
        Principal & Authorised Signatory
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label
            htmlFor="principal-name-input"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
          >
            Principal Full Name
          </label>
          <input
            id="principal-name-input"
            type="text"
            placeholder="Dr. Arthur Pendelton"
            value={principalName}
            onChange={(e) => setPrincipalName(e.target.value)}
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
            htmlFor="principal-phone-input"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
          >
            Direct Contact (10 Digits)
          </label>
          <input
            id="principal-phone-input"
            type="tel"
            maxLength={10}
            placeholder="9876543210"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
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

      {/* Principal Signature Upload Section */}
      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#111827', margin: '0 0 0.5rem 0' }}>
          Principal Signature & Official Seal
        </h4>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
          Upload authorized principal signature specimen (PNG or JPEG, max 1 MB). Required to enable Transfer Certificate signature option.
        </p>

        {sigMessage && (
          <div
            role="alert"
            style={{
              padding: '0.625rem 0.75rem',
              marginBottom: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              backgroundColor: sigMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: sigMessage.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${sigMessage.type === 'success' ? '#86efac' : '#f87171'}`,
            }}
          >
            {sigMessage.text}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Signature Preview box */}
          <div
            style={{
              width: '140px',
              height: '60px',
              borderRadius: '8px',
              border: '2px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: '#f8fafc',
            }}
          >
            {sigPreview ? (
              <img
                src={sigPreview}
                alt="Signature Preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : school.principalSignatureFileId ? (
              <div style={{ textAlign: 'center', padding: '4px', fontSize: '0.6875rem', color: '#16a34a', fontWeight: 600 }}>
                ✓ Signature Uploaded
              </div>
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '4px' }}>
                No Signature
              </span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                id="principal-signature-input"
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                disabled={isUploadingSig}
                onChange={handleSigFileSelect}
                style={{ fontSize: '0.8125rem', color: '#4b5563' }}
              />
              <button
                type="button"
                id="btn-upload-signature"
                onClick={handleUploadSig}
                disabled={!selectedSigFile || isUploadingSig}
                style={{
                  padding: '0.4rem 0.85rem',
                  backgroundColor: !selectedSigFile || isUploadingSig ? '#9ca3af' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: !selectedSigFile || isUploadingSig ? 'not-allowed' : 'pointer',
                }}
              >
                {isUploadingSig ? 'Uploading Signature...' : 'Upload Signature'}
              </button>
            </div>
            {school.principalSignatureFileId && (
              <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.75rem', color: '#15803d' }}>
                Verified Signature Reference: <code style={{ backgroundColor: '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>{school.principalSignatureFileId}</code>
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        id="btn-save-principal"
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
        {isSaving ? 'Saving Principal...' : 'Save Principal Details'}
      </button>
    </form>
  );
}
