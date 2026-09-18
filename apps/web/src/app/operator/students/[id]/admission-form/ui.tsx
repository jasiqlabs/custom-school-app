'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { studentsApi } from '@/features/students/api/students-api-client';
import type { AdmissionFormPrintDto } from '@custom-school/contracts';

export function AdmissionFormPrintUi({ session, studentId }: { session: any; studentId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdmissionFormPrintDto | null>(null);

  useEffect(() => {
    studentsApi.getAdmissionFormPrint(studentId)
      .then(setData)
      .catch(err => setError(err?.message || 'Failed to load admission form record'))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
        <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 12, fontSize: 14 }}>Preparing printable admission record...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: 24, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid #fee2e2' }}>
        <h2 style={{ fontSize: 18, color: '#991b1b' }}>Admission Form Unavailable</h2>
        <p style={{ color: '#64748b', fontSize: 14 }}>{error || 'Student record could not be loaded'}</p>
        <Link href={`/operator/students/${studentId}`} className="btn btn-secondary">
          Back to Profile
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px 16px' }}>
      {/* Non-printed Top Action Header */}
      <div
        className="no-print"
        style={{
          maxWidth: 800,
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '12px 20px',
          borderRadius: 10,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0'
        }}
      >
        <Link
          href={`/operator/students/${studentId}`}
          className="btn"
          style={{ fontSize: 13, padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff' }}
        >
          ← Back to Student Profile
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn"
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 18px',
            borderRadius: 6,
            background: '#2563eb',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
            cursor: 'pointer'
          }}
        >
          🖨️ Print Admission Form
        </button>
      </div>

      {/* Printable Sheet (A4 size formatted) */}
      <div
        id="printable-admission-sheet"
        style={{
          maxWidth: 800,
          margin: '0 auto',
          background: '#ffffff',
          padding: '40px 48px',
          borderRadius: 8,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          color: '#0f172a',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}
      >
        {/* School Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
            {data.school.name}
          </h1>
          <p style={{ fontSize: 12, color: '#475569', margin: '0 0 8px' }}>
            {data.school.address || 'Official Student Admission & Registration Form'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
            <span>Admission No: <strong style={{ fontFamily: 'monospace' }}>{data.student.studentCode}</strong></span>
            <span>Date of Admission: <strong>{new Date(data.student.admissionDate).toLocaleDateString()}</strong></span>
          </div>
        </div>

        {/* Identification & Photo Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', width: 140, color: '#64748b', fontWeight: 600 }}>Full Name:</td>
                  <td style={{ padding: '6px 0', fontWeight: 700, fontSize: 15 }}>{data.student.fullName}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Enrolled Class:</td>
                  <td style={{ padding: '6px 0', fontWeight: 600 }}>
                    {data.student.enrollment?.className ? `${data.student.enrollment.className} - Section ${data.student.enrollment.sectionName}` : 'Unassigned'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Date of Birth:</td>
                  <td style={{ padding: '6px 0' }}>{new Date(data.student.dob).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Gender / Nationality:</td>
                  <td style={{ padding: '6px 0' }}>{data.student.gender === 'BOY' ? 'Boy' : 'Girl'} / {data.student.nationality}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Blood Group:</td>
                  <td style={{ padding: '6px 0' }}>{data.student.bloodGroup || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Photo Box */}
          <div
            style={{
              width: 110,
              height: 130,
              border: '1px dashed #94a3b8',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: 11,
              padding: 6
            }}
          >
            <span>Passport Photo</span>
          </div>
        </div>

        {/* Parent & Guardian Info */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 4, margin: '0 0 10px', textTransform: 'uppercase', color: '#334155' }}>
            Family & Guardian Particulars
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', width: 140, color: '#64748b', fontWeight: 600 }}>Father Name:</td>
                <td style={{ padding: '6px 0', fontWeight: 600 }}>{data.student.fatherName}</td>
                <td style={{ padding: '6px 0', width: 140, color: '#64748b', fontWeight: 600 }}>Mother Name:</td>
                <td style={{ padding: '6px 0', fontWeight: 600 }}>{data.student.motherName}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Primary Phone:</td>
                <td style={{ padding: '6px 0' }}>{data.student.phone}</td>
                <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Emergency Contact:</td>
                <td style={{ padding: '6px 0' }}>{data.student.emergencyContact} ({data.student.emergencyRelation})</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 600 }}>Address:</td>
                <td colSpan={3} style={{ padding: '6px 0' }}>{data.student.address}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Administrative & Concessions */}
        <div style={{ marginBottom: 36 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 4, margin: '0 0 10px', textTransform: 'uppercase', color: '#334155' }}>
            Administrative Details & Services
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', width: 160, color: '#64748b', fontWeight: 600 }}>Transport Service:</td>
                <td style={{ padding: '6px 0' }}>{data.student.transportRequired ? 'Requested (Setup Pending)' : 'Not Required'}</td>
                <td style={{ padding: '6px 0', width: 160, color: '#64748b', fontWeight: 600 }}>Fee Concession:</td>
                <td style={{ padding: '6px 0' }}>{data.student.concessionType === 'NONE' ? 'Standard (Full)' : data.student.concessionType}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Declaration & Signatures */}
        <div style={{ marginTop: 40, borderTop: '1px solid #0f172a', paddingTop: 20 }}>
          <p style={{ fontSize: 11, color: '#475569', textAlign: 'justify', lineHeight: 1.5, margin: '0 0 40px' }}>
            <strong>Declaration:</strong> I hereby declare that the particulars furnished above are true and accurate to the best of my knowledge. I agree to abide by the rules, policies, and code of conduct of {data.school.name}.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, textAlign: 'center' }}>
            <div>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: '1px solid #475569', paddingTop: 6, fontSize: 12, fontWeight: 600 }}>
                Parent / Guardian Signature
              </div>
            </div>

            <div>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: '1px solid #475569', paddingTop: 6, fontSize: 12, fontWeight: 600 }}>
                Class Teacher Signature
              </div>
            </div>

            <div>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: '1px solid #475569', paddingTop: 6, fontSize: 12, fontWeight: 600 }}>
                Principal & Seal
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #printable-admission-sheet {
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
