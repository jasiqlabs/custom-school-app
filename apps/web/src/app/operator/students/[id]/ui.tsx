'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { studentsApi } from '@/features/students/api/students-api-client';
import type {
  StudentProfileDto,
  StudentIdentifierHistoryItem
} from '@custom-school/contracts';

type TabKey = 'overview' | 'vault' | 'fees' | 'transport' | 'history';

export function StudentProfileUi({ session, studentId }: { session: any; studentId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentProfileDto | null>(null);
  const [history, setHistory] = useState<StudentIdentifierHistoryItem[]>([]);
  const [fees, setFees] = useState<any>(null);
  const [transport, setTransport] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Modals
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [renameReason, setRenameReason] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'INACTIVE'>('INACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editFatherName, setEditFatherName] = useState('');
  const [editMotherName, setEditMotherName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, histData, feeData, trData] = await Promise.all([
        studentsApi.getProfile(studentId),
        studentsApi.getIdentifierHistory(studentId).catch(() => []),
        studentsApi.getFeeSummary(studentId).catch(() => ({ availability: 'UNAVAILABLE' })),
        studentsApi.getTransportSummary(studentId).catch(() => ({ availability: 'UNAVAILABLE' }))
      ]);
      setStudent(profileData);
      setHistory(histData);
      setFees(feeData);
      setTransport(trData);

      // Pre-fill edit modal
      setEditFullName(profileData.fullName);
      setEditFatherName(profileData.fatherName);
      setEditMotherName(profileData.motherName);
      setEditPhone(profileData.phone);
      setEditAddress(profileData.address);
    } catch (err: any) {
      setError(err?.message || 'Failed to load student profile');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim()) return;
    setRenaming(true);
    setRenameError(null);
    try {
      await studentsApi.changeIdentifier(studentId, {
        newStudentCode: newCode.trim().toUpperCase(),
        reason: renameReason.trim() || 'Identifier updated by operator',
        version: student?.version || 1
      });
      setRenameModalOpen(false);
      setNewCode('');
      setRenameReason('');
      await loadData();
    } catch (err: any) {
      setRenameError(err?.message || 'Failed to change student code');
    } finally {
      setRenaming(false);
    }
  }

  async function handleStatusChange(e: React.FormEvent) {
    e.preventDefault();
    if (targetStatus === 'INACTIVE' && !statusReason.trim()) {
      return setStatusError('Deactivation reason is mandatory');
    }
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      await studentsApi.changeStatus(studentId, {
        status: targetStatus,
        reason: statusReason.trim() || undefined
      });
      setStatusModalOpen(false);
      setStatusReason('');
      await loadData();
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to update student status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleEditProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!student) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await studentsApi.updateProfile(studentId, {
        version: student.version,
        fullName: editFullName.trim(),
        fatherName: editFatherName.trim(),
        motherName: editMotherName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim()
      });
      setEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update profile');
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '60px auto', textAlign: 'center', color: '#64748b' }}>
        <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 12, fontSize: 14 }}>Loading student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: 24, textAlign: 'center', background: '#ffffff', borderRadius: 12, border: '1px solid #fee2e2' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 18, color: '#991b1b', margin: '0 0 8px' }}>Unable to load student</h2>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 16px' }}>{error || 'Student record was not found'}</p>
        <Link href="/operator/students" className="btn btn-secondary">Return to Directory</Link>
      </div>
    );
  }

  const initials = student.fullName.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        <Link href="/operator/students" style={{ color: '#2563eb', textDecoration: 'none' }}>Students</Link>
        <span>/</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{student.studentCode}</span>
      </div>

      {/* Profile Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          {/* Avatar & Identifiers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: student.gender === 'GIRL' ? '#fdf2f8' : '#eff6ff',
                color: student.gender === 'GIRL' ? '#db2777' : '#2563eb',
                border: student.gender === 'GIRL' ? '2px solid #fbcfe8' : '2px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {student.fullName}
                </h1>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: 13,
                    background: '#f1f5f9',
                    color: '#0f172a',
                    padding: '3px 9px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1'
                  }}
                >
                  {student.studentCode}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: student.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                    color: student.status === 'ACTIVE' ? '#166534' : '#991b1b'
                  }}
                >
                  {student.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 13, color: '#64748b' }}>
                <span>
                  🏫 <strong>{student.enrollment?.className || 'Unassigned'}</strong> - Sec {student.enrollment?.sectionName || 'N/A'}
                </span>
                <span>•</span>
                <span>{student.gender === 'BOY' ? 'Boy' : 'Girl'}</span>
                <span>•</span>
                <span>Admitted {new Date(student.admissionDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Link
              href={`/operator/students/${student.id}/admission-form`}
              className="btn"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              🖨️ Print Form
            </Link>

            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="btn"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155'
              }}
            >
              Edit Profile
            </button>

            <button
              type="button"
              onClick={() => {
                setNewCode(student.studentCode);
                setRenameModalOpen(true);
              }}
              className="btn"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155'
              }}
            >
              Change Code
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetStatus(student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
                setStatusModalOpen(true);
              }}
              className="btn"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 8,
                border: student.status === 'ACTIVE' ? '1px solid #fecaca' : '1px solid #bbf7d0',
                background: student.status === 'ACTIVE' ? '#fff1f2' : '#f0fdf4',
                color: student.status === 'ACTIVE' ? '#be123c' : '#15803d'
              }}
            >
              {student.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        {(
          [
            ['overview', 'Overview & Academics'],
            ['vault', 'Private Vault (PII)'],
            ['fees', 'Fees'],
            ['transport', 'Transport'],
            ['history', `Identifier History (${history.length})`]
          ] as const
        ).map(([key, label]) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563eb' : '#64748b',
                border: 'none',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Academics */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Personal & Family Details */}
          <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
              Personal & Family Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 14px', fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>Father Name:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{student.fatherName}</span>

              <span style={{ color: '#64748b' }}>Mother Name:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{student.motherName}</span>

              <span style={{ color: '#64748b' }}>Date of Birth:</span>
              <span style={{ color: '#0f172a' }}>{new Date(student.dob).toLocaleDateString()}</span>

              <span style={{ color: '#64748b' }}>Gender:</span>
              <span style={{ color: '#0f172a' }}>{student.gender === 'BOY' ? 'Boy' : 'Girl'}</span>

              <span style={{ color: '#64748b' }}>Nationality:</span>
              <span style={{ color: '#0f172a' }}>{student.nationality}</span>

              <span style={{ color: '#64748b' }}>Blood Group:</span>
              <span style={{ color: '#0f172a' }}>{student.bloodGroup || 'N/A'}</span>

              <span style={{ color: '#64748b' }}>Family Code:</span>
              <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{student.familyCode || 'None'}</span>
            </div>
          </div>

          {/* Academic & Government Enrollment */}
          <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
              Academic & Government Identifiers
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px 14px', fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>Class Enrolled:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{student.enrollment?.className || 'Unassigned'}</span>

              <span style={{ color: '#64748b' }}>Section:</span>
              <span style={{ color: '#0f172a' }}>{student.enrollment?.sectionName || 'N/A'}</span>

              <span style={{ color: '#64748b' }}>Admission Date:</span>
              <span style={{ color: '#0f172a' }}>{new Date(student.admissionDate).toLocaleDateString()}</span>

              <span style={{ color: '#64748b' }}>PEN Number:</span>
              <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{student.penNumber || 'None'}</span>

              <span style={{ color: '#64748b' }}>UDISE Code:</span>
              <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{student.udiseCode || 'None'}</span>

              <span style={{ color: '#64748b' }}>Previous School:</span>
              <span style={{ color: '#0f172a' }}>{student.previousSchool || 'N/A'}</span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
              Contact & Emergency
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 14px', fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>Primary Phone:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{student.phone}</span>

              <span style={{ color: '#64748b' }}>Email:</span>
              <span style={{ color: '#0f172a' }}>{student.email || 'N/A'}</span>

              <span style={{ color: '#64748b' }}>Emergency Phone:</span>
              <span style={{ color: '#0f172a' }}>{student.emergencyContact} ({student.emergencyRelation})</span>

              <span style={{ color: '#64748b' }}>Address:</span>
              <span style={{ color: '#0f172a' }}>{student.address}</span>
            </div>
          </div>

          {/* Concessions & Status */}
          <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
              Concession & Transport Policy
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px 14px', fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>Concession:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {student.concessionType === 'NONE'
                  ? 'None'
                  : student.concessionType === 'PERCENTAGE'
                  ? `${student.concessionValue}% Discount`
                  : `₹${student.concessionValue} Fixed Concession`}
              </span>

              <span style={{ color: '#64748b' }}>Transport Req:</span>
              <span style={{ color: '#0f172a' }}>{student.transportRequired ? 'Yes (Requested)' : 'No'}</span>

              <span style={{ color: '#64748b' }}>Setup State:</span>
              <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{student.transportSetupState}</span>

              {student.status === 'INACTIVE' && (
                <>
                  <span style={{ color: '#b91c1c' }}>Deactivation Reason:</span>
                  <span style={{ color: '#b91c1c', fontWeight: 500 }}>{student.deactivationReason || 'N/A'}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Private Vault */}
      {activeTab === 'vault' && (
        <div className="card" style={{ padding: 24, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                Encrypted Private Vault (Masked View)
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Strict zero-exposure policy: All private PII is stored AES-256-GCM encrypted and masked across operator interfaces.
              </p>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: 999,
                background: '#dbeafe',
                color: '#1e40af'
              }}
            >
              🔒 Private Vault
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 20 }}>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Aadhaar Number</div>
              <div style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                {student.privateProfile?.aadhaarMasked || '•••• •••• ••••'}
              </div>
            </div>

            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>PAN Card</div>
              <div style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                {student.privateProfile?.panMasked || 'Not provided'}
              </div>
            </div>

            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Religion & Caste</div>
              <div style={{ fontSize: 14, color: '#0f172a' }}>
                {student.privateProfile?.religion || 'Unspecified'} {student.privateProfile?.caste ? `(${student.privateProfile.caste})` : ''}
              </div>
            </div>

            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Medical & Allergies</div>
              <div style={{ fontSize: 13, color: '#0f172a' }}>
                <div><strong>Conditions:</strong> {student.privateProfile?.medicalConditions || 'None reported'}</div>
                <div><strong>Allergies:</strong> {student.privateProfile?.allergies || 'None reported'}</div>
              </div>
            </div>

            {student.privateProfile?.bankMasked && (
              <div style={{ gridColumn: 'span 2', padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Bank Account Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 13 }}>
                  <div><span style={{ color: '#64748b' }}>Bank:</span> {student.privateProfile.bankMasked.bankName}</div>
                  <div><span style={{ color: '#64748b' }}>Holder:</span> {student.privateProfile.bankMasked.accountHolderName}</div>
                  <div><span style={{ color: '#64748b' }}>Account:</span> <code style={{ fontWeight: 600 }}>{student.privateProfile.bankMasked.accountNumberMasked}</code></div>
                  <div><span style={{ color: '#64748b' }}>IFSC:</span> <code>{student.privateProfile.bankMasked.ifsc}</code></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Fees */}
      {activeTab === 'fees' && (
        <div className="card" style={{ padding: 24, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>💳</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
              Fee Summary (Sibling Module MOD-004)
            </h3>
          </div>

          <div
            style={{
              padding: '16px 20px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              color: '#475569',
              fontSize: 13
            }}
          >
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
              Fee Management Sibling Module (MOD-004)
            </div>
            <p style={{ margin: '0 0 10px', color: '#64748b' }}>
              Status: <strong>{fees?.availability || 'UNAVAILABLE'}</strong>
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              In accordance with fail-closed architectural boundaries, student fee ledgers and collection history will activate seamlessly once MOD-004 is deployed.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Transport */}
      {activeTab === 'transport' && (
        <div className="card" style={{ padding: 24, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🚌</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
              Transport Service (Sibling Module MOD-005)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Transport Requirement</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                {student.transportRequired ? 'Transport Requested by Guardian' : 'Transport Not Required'}
              </div>
            </div>

            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Transport Setup State</div>
              <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                {student.transportSetupState}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px 20px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              color: '#475569',
              fontSize: 13
            }}
          >
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
              Transport Route & Vehicle Assignment (MOD-005)
            </div>
            <p style={{ margin: '0 0 10px', color: '#64748b' }}>
              Status: <strong>{transport?.availability || 'UNAVAILABLE'}</strong>
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              Vehicle route allocation, pickup stops, and tracking will activate upon deployment of MOD-005.
            </p>
          </div>
        </div>
      )}

      {/* Tab 5: Identifier History */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: 24, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
            Student Code Mutation & Rename Audit
          </h3>

          {history.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
              No identifier renames recorded. The student has held code <code>{student.studentCode}</code> since admission.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Previous Code</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>New Code</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Reason</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#b91c1c' }}>
                        {item.oldCode}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>
                        {item.newCode}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {item.reason || 'Manual code reassignment'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>
                        {new Date(item.changedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Change Identifier (Rename) */}
      {renameModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Change Student Code
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Renaming a student code updates the primary identifier and permanently records the transition in audit history.
            </p>

            {renameError && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                {renameError}
              </div>
            )}

            <form onSubmit={handleRename}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  New Student Code *
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'monospace', textTransform: 'uppercase', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Reason for Change
                </label>
                <input
                  type="text"
                  placeholder="e.g. Correction of typo / system migration"
                  value={renameReason}
                  onChange={e => setRenameReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  className="btn"
                  style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renaming}
                  className="btn"
                  style={{ padding: '7px 16px', borderRadius: 6, background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 600 }}
                >
                  {renaming ? 'Updating...' : 'Confirm Rename'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Status */}
      {statusModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              {targetStatus === 'INACTIVE' ? 'Deactivate Student' : 'Reactivate Student'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              {targetStatus === 'INACTIVE'
                ? 'Deactivating a student removes them from active enrollment counts. A mandatory reason is required.'
                : 'Reactivating this student will restore their active status in directory and reports.'}
            </p>

            {statusError && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                {statusError}
              </div>
            )}

            <form onSubmit={handleStatusChange}>
              {targetStatus === 'INACTIVE' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Deactivation Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. TC issued, transfer to another school, fee default, etc."
                    value={statusReason}
                    onChange={e => setStatusReason(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="btn"
                  style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="btn"
                  style={{
                    padding: '7px 16px',
                    borderRadius: 6,
                    background: targetStatus === 'INACTIVE' ? '#dc2626' : '#16a34a',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  {updatingStatus ? 'Updating...' : targetStatus === 'INACTIVE' ? 'Deactivate Student' : 'Reactivate Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Profile */}
      {editModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 540,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Edit Student Details
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Update student information. Concurrency protected via optimistic version lock.
            </p>

            {editError && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Father Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFatherName}
                    onChange={e => setEditFatherName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Mother Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editMotherName}
                    onChange={e => setEditMotherName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Residential Address
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn"
                  style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn"
                  style={{ padding: '7px 16px', borderRadius: 6, background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 600 }}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
