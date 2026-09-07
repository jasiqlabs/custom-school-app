'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSchool } from '../../../../features/platform-admin/api/admin-api-client';

export default function OnboardSchoolPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const created = await createSchool({
        name,
        address: address || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        confirmDuplicateName: confirmDuplicate,
      });

      router.push(`/admin/schools/${created.id}`);
    } catch (err: any) {
      if (err.code === 'ERR_DUPLICATE_SCHOOL_CONFIRMATION_REQUIRED') {
        setDuplicateWarning(err.matchedSchool || { name });
      } else {
        setErrorMessage(err.message || 'Failed to onboard school');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/admin/schools"
          style={{ color: '#2563eb', fontSize: '0.875rem', textDecoration: 'none' }}
        >
          ← Back to Schools Directory
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: '0.75rem 0 0.25rem 0' }}>
          Onboard New School Tenant
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          Create an initial school tenant in DRAFT status with an immutable UUID.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      {duplicateWarning && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            marginBottom: '1.25rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            color: '#92400e',
            fontSize: '0.875rem',
          }}
        >
          <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
            ⚠️ Potential Duplicate School Detected
          </strong>
          A school tenant named &ldquo;{duplicateWarning.name}&rdquo; already exists on the platform. If this is a distinct branch or separate institution, please confirm your intent below to proceed.
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <input
                id="confirm-duplicate-checkbox"
                type="checkbox"
                checked={confirmDuplicate}
                onChange={(e) => setConfirmDuplicate(e.target.checked)}
              />
              Yes, I confirm this is a separate school tenant with the same name.
            </label>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#ffffff',
          padding: '1.75rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="school-name-input"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
          >
            School Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="school-name-input"
            type="text"
            required
            placeholder="e.g. St. Xavier's International School"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.9375rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="school-address-input"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
          >
            Campus Address
          </label>
          <textarea
            id="school-address-input"
            rows={3}
            placeholder="Campus address, street, city, postal code"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.9375rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label
              htmlFor="school-email-input"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
            >
              Contact Email
            </label>
            <input
              id="school-email-input"
              type="email"
              placeholder="admin@school.edu"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.9375rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="school-phone-input"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
            >
              Contact Phone
            </label>
            <input
              id="school-phone-input"
              type="tel"
              placeholder="e.g. 9876543210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.9375rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          id="btn-submit-school"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: isSubmitting ? '#9ca3af' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9375rem',
            fontWeight: 500,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Creating School Tenant...' : 'Create Draft School Tenant'}
        </button>
      </form>
    </div>
  );
}
