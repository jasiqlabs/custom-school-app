'use client';

import React, { useState } from 'react';
import { changeSchoolStatus } from '../api/admin-api-client';

interface SchoolStatusBannerProps {
  school: {
    id: string;
    name: string;
    status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  };
  onUpdated: (updatedSchool: any) => void;
}

export function SchoolStatusBanner({ school, onUpdated }: SchoolStatusBannerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleActivate = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const updated = await changeSchoolStatus(school.id, { status: 'ACTIVE' });
      onUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate school');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!reason.trim()) {
      setErrorMsg('Deactivation reason is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const updated = await changeSchoolStatus(school.id, {
        status: 'INACTIVE',
        reason: reason.trim(),
      });
      setShowDeactivateModal(false);
      setReason('');
      onUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to deactivate school');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor:
          school.status === 'ACTIVE'
            ? '#f0fdf4'
            : school.status === 'DRAFT'
            ? '#fffbeb'
            : '#fef2f2',
        border: `1px solid ${
          school.status === 'ACTIVE'
            ? '#bbf7d0'
            : school.status === 'DRAFT'
            ? '#fde68a'
            : '#fecaca'
        }`,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: '0.9375rem',
              color:
                school.status === 'ACTIVE'
                  ? '#166534'
                  : school.status === 'DRAFT'
                  ? '#92400e'
                  : '#991b1b',
            }}
          >
            {school.status === 'ACTIVE'
              ? '● School is Active and Fully Operational'
              : school.status === 'DRAFT'
              ? '● School is in Draft Mode'
              : '● School is Deactivated (Inactive)'}
          </span>
        </div>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#4b5563' }}>
          {school.status === 'ACTIVE'
            ? 'Operators can login and manage daily operations. Deactivating this school will immediately terminate all operator sessions.'
            : school.status === 'DRAFT'
            ? 'Complete profile, classes and principal verification, then activate to allow operator provisioning.'
            : 'Operators are blocked from accessing this school. You may restore active status at any time.'}
        </p>
        {errorMsg && (
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8125rem', color: '#dc2626', fontWeight: 500 }}>
            {errorMsg}
          </p>
        )}
      </div>

      <div>
        {school.status === 'ACTIVE' ? (
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setShowDeactivateModal(true);
            }}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#b91c1c',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Deactivate School
          </button>
        ) : (
          <button
            type="button"
            onClick={handleActivate}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#15803d',
              backgroundColor: '#dcfce7',
              border: '1px solid #86efac',
              borderRadius: '6px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Activating...' : school.status === 'DRAFT' ? 'Activate School' : 'Restore / Reactivate School'}
          </button>
        )}
      </div>

      {/* Deactivation Modal */}
      {showDeactivateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', color: '#111827' }}>
              Deactivate School Tenant
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#4b5563' }}>
              Deactivating <strong>{school.name}</strong> will immediately revoke all active operator sessions and prevent any new logins.
            </p>

            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              Reason for Deactivation <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Regulatory audit, administrative review, payment default..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                marginBottom: '1rem',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                disabled={isSubmitting}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isSubmitting || !reason.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  cursor: isSubmitting || !reason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
