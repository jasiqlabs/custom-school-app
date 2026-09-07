'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  fetchSchoolById,
  fetchOperators,
  provisionOperator,
  updateOperatorStatus,
} from '../../../../../features/platform-admin/api/admin-api-client';

export default function SchoolOperatorsPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const resolvedParams = use(params);
  const schoolId = resolvedParams.schoolId;

  const [school, setSchool] = useState<any | null>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Provisioning Modal State
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [schoolData, opsData] = await Promise.all([
        fetchSchoolById(schoolId),
        fetchOperators(schoolId).catch(() => []),
      ]);
      setSchool(schoolData);
      setOperators(opsData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load operator details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (temporaryPassword.length < 8) {
      setModalError('Temporary password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await provisionOperator(schoolId, {
        fullName,
        email,
        temporaryPassword,
      });
      // Clear sensitive form state immediately
      setFullName('');
      setEmail('');
      setTemporaryPassword('');
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to provision operator account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (operatorId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateOperatorStatus(schoolId, operatorId, nextStatus as any);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update operator status');
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '3rem auto', textAlign: 'center', color: '#6b7280' }}>
        Loading operators...
      </div>
    );
  }

  if (!school) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <h2>School Not Found</h2>
        <Link href="/admin/schools" style={{ color: '#2563eb' }}>← Back to Schools Directory</Link>
      </div>
    );
  }

  const isSchoolActive = school.status === 'ACTIVE';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/schools" style={{ color: '#2563eb', fontSize: '0.875rem', textDecoration: 'none' }}>
          ← Back to Schools Directory
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              {school.name}
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
              School Operators & Administrative Access
            </p>
          </div>
          <span
            style={{
              padding: '0.375rem 0.875rem',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: isSchoolActive ? '#dcfce7' : '#fef3c7',
              color: isSchoolActive ? '#15803d' : '#b45309',
            }}
          >
            {school.status}
          </span>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <Link
          href={`/admin/schools/${school.id}`}
          style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', textDecoration: 'none' }}
        >
          Overview & Profile
        </Link>
        <Link
          href={`/admin/schools/${school.id}/academics`}
          style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', textDecoration: 'none' }}
        >
          Classes & Sections
        </Link>
        <Link
          href={`/admin/schools/${school.id}/operators`}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#2563eb',
            borderBottom: '2px solid #2563eb',
            textDecoration: 'none',
          }}
        >
          School Operators
        </Link>
        <Link
          href={`/admin/schools/${school.id}/transfer-certificate`}
          style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', textDecoration: 'none' }}
        >
          Transfer Certificate
        </Link>
      </div>

      {/* School Status Alert if not active */}
      {!isSchoolActive && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: '#92400e', fontSize: '0.9375rem' }}>
              Operator Provisioning Locked
            </h4>
            <p style={{ margin: 0, color: '#b45309', fontSize: '0.8125rem' }}>
              This school is currently in <strong>{school.status}</strong> mode. Schools must be transitioned to <strong>ACTIVE</strong> status before operator logins can be created.
            </p>
          </div>
          <Link
            href={`/admin/schools/${school.id}`}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: '#ffffff',
              border: '1px solid #d97706',
              color: '#b45309',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Go to Status Controls →
          </Link>
        </div>
      )}

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
          Assigned Operators ({operators.length})
        </h2>
        <button
          type="button"
          disabled={!isSchoolActive}
          onClick={() => {
            setModalError(null);
            setShowModal(true);
          }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isSchoolActive ? '#2563eb' : '#9ca3af',
            color: '#ffffff',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '0.875rem',
            border: 'none',
            cursor: isSchoolActive ? 'pointer' : 'not-allowed',
          }}
        >
          + Provision New Operator
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Operators Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {operators.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            <p style={{ margin: 0, fontSize: '0.9375rem' }}>No operator accounts have been provisioned yet.</p>
            {isSchoolActive && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8125rem', color: '#9ca3af' }}>
                Click "+ Provision New Operator" to create administrative access for school staff.
              </p>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Full Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Email Address</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Created At</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => (
                <tr key={op.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#111827' }}>{op.fullName}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#4b5563' }}>{op.email}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: op.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                        color: op.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {op.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                    {new Date(op.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(op.id, op.status)}
                      style={{
                        padding: '0.25rem 0.625rem',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        color: op.status === 'ACTIVE' ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {op.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Provisioning Modal */}
      {showModal && (
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
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', color: '#111827' }}>
              Provision School Operator
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: '#6b7280' }}>
              Create an administrative user for <strong>{school.name}</strong>. The user will be strictly bound to this school tenant.
            </p>

            {modalError && (
              <div style={{ padding: '0.625rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleProvision}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Operator Full Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Sarah Jenkins"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Email Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., sarah@springdale.edu"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Temporary Password (min 8 chars) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', color: '#374151', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', borderRadius: '6px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
