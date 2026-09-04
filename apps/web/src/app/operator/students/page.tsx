'use client';

import React, { useState } from 'react';
import { ExportJobTray } from '../../../features/platform-foundation/components/export-job-tray';
import { SessionExpiredGate } from '../../../features/platform-foundation/components/session-expired-gate';
import { JobRecord } from '@custom-school/contracts';

export default function OperatorStudentsPage() {
  const [crossTenantModal, setCrossTenantModal] = useState<{ open: boolean; message: string; auditLogged: boolean }>({
    open: false,
    message: '',
    auditLogged: false,
  });
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [jobs, setJobs] = useState<JobRecord[]>([
    {
      id: 'job-exp-001',
      schoolId: 'school-aaa-111',
      jobType: 'EXCEL_EXPORT',
      status: 'COMPLETED',
      idempotencyKey: 'idem-20260903-01',
      payloadSnapshot: { classId: 'cls-10-A', academicYear: '2026-2027' },
      fileId: 'file-export-999',
      errorMessage: null,
      enqueuedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3500000),
    },
  ]);

  // Students scoped strictly to School A (school-aaa-111)
  const students = [
    { id: 'stu-a-101', name: 'Zaid Khan', class: 'Grade 10-A', rollNo: '1001', feeStatus: 'PAID' },
    { id: 'stu-a-102', name: 'Fatima Shaikh', class: 'Grade 10-A', rollNo: '1002', feeStatus: 'PENDING' },
    { id: 'stu-a-103', name: 'Yusuf Patel', class: 'Grade 9-B', rollNo: '0915', feeStatus: 'PARTIAL' },
    { id: 'stu-a-104', name: 'Amina Begum', class: 'Grade 8-A', rollNo: '0804', feeStatus: 'PAID' },
  ];

  const handleTestCrossTenantProbe = () => {
    // Simulate what happens when TenantGuard / TenantRepository intercepts a cross-tenant request
    setCrossTenantModal({
      open: true,
      message: 'HTTP 404 ERR_TENANT_CROSS_SCHOOL: Student UUID "stu-b-888" belongs to tenant "school-bbb-222". Cross-tenant access denied.',
      auditLogged: true,
    });
  };

  const handleEnqueueExport = () => {
    const newJob: JobRecord = {
      id: 'job-exp-' + Date.now().toString().slice(-4),
      schoolId: 'school-aaa-111',
      jobType: 'FEE_REPORT_EXPORT',
      status: 'PROCESSING',
      idempotencyKey: 'idem-' + Date.now(),
      payloadSnapshot: { filter: 'PENDING_FEES_AY2026' },
      fileId: null,
      errorMessage: null,
      enqueuedAt: new Date(),
      completedAt: null,
    };
    setJobs((prev) => [newJob, ...prev]);
    setIsTrayOpen(true);

    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJob.id
            ? { ...j, status: 'COMPLETED', fileId: 'file-dl-' + Date.now().toString().slice(-4), completedAt: new Date() }
            : j
        )
      );
    }, 2500);
  };

  return (
    <div>
      {/* Tenant Context Header */}
      <div
        style={{
          background: 'var(--color-brand-primary-50, #eff6ff)',
          border: '1px solid var(--color-brand-primary-100, #dbeafe)',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-brand-primary-700, #1d4ed8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Tenant Context (MOD-000)
          </span>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: '4px 0 0 0' }}>
            Al-Noor Model Academy &bull; <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary, #475569)' }}>UUID: school-aaa-111</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleTestCrossTenantProbe}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'var(--color-danger-50, #fef2f2)',
              color: 'var(--color-danger-700, #b91c1c)',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Probe Cross-Tenant (Security Test)
          </button>
          <button
            type="button"
            onClick={handleEnqueueExport}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'var(--color-brand-primary-600, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Trigger Async Export Job
          </button>
          <button
            type="button"
            onClick={() => setSessionExpiredOpen(true)}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#ffffff',
              color: 'var(--text-secondary, #475569)',
              border: '1px solid var(--border-strong, #cbd5e1)',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Simulate Session Timeout
          </button>
        </div>
      </div>

      {/* Student List Scoped to Tenant */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: '0 0 4px 0' }}>
          Enrolled Students
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary, #475569)', margin: 0 }}>
          Operator Plane View &bull; Strictly filtered by active school scope (<code style={{ color: 'var(--color-brand-primary-700, #1d4ed8)' }}>WHERE school_id = &apos;school-aaa-111&apos;</code>)
        </p>
      </div>

      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-elevated, #f8fafc)', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Roll No</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Student Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Class & Section</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Fee Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Tenant Binding</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} style={{ borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-brand-primary-700, #1d4ed8)' }}>
                  {student.rollNo}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                  {student.name}
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #475569)' }}>{student.class}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background:
                        student.feeStatus === 'PAID'
                          ? 'var(--color-success-50, #f0fdf4)'
                          : student.feeStatus === 'PENDING'
                          ? 'var(--color-danger-50, #fef2f2)'
                          : 'var(--color-warning-50, #fffbeb)',
                      color:
                        student.feeStatus === 'PAID'
                          ? 'var(--color-success-700, #15803d)'
                          : student.feeStatus === 'PENDING'
                          ? 'var(--color-danger-700, #b91c1c)'
                          : 'var(--color-warning-700, #b45309)',
                    }}
                  >
                    {student.feeStatus}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                  school-aaa-111 (Verified)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cross-Tenant Modal Simulation */}
      {crossTenantModal.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cross-tenant-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '90%',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-danger-50, #fef2f2)',
                  color: 'var(--color-danger-700, #b91c1c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '18px',
                }}
              >
                &times;
              </div>
              <h3 id="cross-tenant-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-danger-700, #b91c1c)' }}>
                Cross-Tenant Security Boundary Enforced
              </h3>
            </div>
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#991b1b',
                lineHeight: 1.5,
                marginBottom: '16px',
              }}
            >
              {crossTenantModal.message}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary, #475569)', marginBottom: '20px' }}>
              <strong>Security Invariant (TC-SEC-000-002):</strong> An audit row with action <code>SECURITY_CROSS_TENANT_ATTEMPT</code> was automatically created and tied to request correlation ID. No existence of external school records was leaked.
            </div>
            <button
              type="button"
              onClick={() => setCrossTenantModal({ open: false, message: '', auditLogged: false })}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--color-neutral-900, #0f172a)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Dismiss Security Alert
            </button>
          </div>
        </div>
      )}

      {/* Export Job Tray Floating UI */}
      <ExportJobTray
        jobs={jobs}
        isOpen={isTrayOpen}
        onToggle={() => setIsTrayOpen((prev) => !prev)}
        onDownloadFile={(fileId) => alert(`Downloading verified school file: ${fileId} (presigned URL TTL ≤ 300s)`)}
      />

      {/* Session Expired Gate Simulation */}
      <SessionExpiredGate
        isOpen={sessionExpiredOpen}
        onLoginRedirect={() => {
          setSessionExpiredOpen(false);
          alert('Redirecting to authenticated sign-in page...');
        }}
      />
    </div>
  );
}
