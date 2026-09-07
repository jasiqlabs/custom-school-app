'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  fetchSchoolById,
  generateTransferCertificate,
  fetchTcJobs,
  downloadTcJobPdf,
} from '../../../../../features/platform-admin/api/admin-api-client';

export default function SchoolTcPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const resolvedParams = use(params);
  const schoolId = resolvedParams.schoolId;

  const [school, setSchool] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form options
  const [includeLogo, setIncludeLogo] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [schoolData, jobsData] = await Promise.all([
        fetchSchoolById(schoolId),
        fetchTcJobs(schoolId).catch(() => []),
      ]);
      setSchool(schoolData);
      setJobs(jobsData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  // Auto-poll while any job is in QUEUED or PROCESSING state
  useEffect(() => {
    const hasPending = jobs.some((j) => j.status === 'QUEUED' || j.status === 'PROCESSING');
    if (!hasPending) return;

    const interval = setInterval(async () => {
      try {
        const updated = await fetchTcJobs(schoolId);
        setJobs(updated);
      } catch (err) {
        // Silently ignore background polling errors
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobs, schoolId]);

  const handleViewPdf = async (jobId: string) => {
    try {
      setDownloadingJobId(jobId);
      const blob = await downloadTcJobPdf(schoolId, jobId, 'inline');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to open PDF');
    } finally {
      setDownloadingJobId(null);
    }
  };

  const handleDownloadPdf = async (jobId: string) => {
    try {
      setDownloadingJobId(jobId);
      const blob = await downloadTcJobPdf(schoolId, jobId, 'attachment');
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Transfer_Certificate_${school?.code || 'School'}_${jobId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to download PDF');
    } finally {
      setDownloadingJobId(null);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (includeSignature && !school?.principalSignatureFileId) {
      setErrorMsg('Principal signature must be uploaded before enabling signature on the certificate.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateTransferCertificate(schoolId, {
        includeLogo,
        includeSignature,
      });
      setSuccessMsg(`Transfer certificate generation job enqueued successfully (Job ID: ${res.jobId}).`);
      const updatedJobs = await fetchTcJobs(schoolId);
      setJobs(updatedJobs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate transfer certificate');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '3rem auto', textAlign: 'center', color: '#6b7280' }}>
        Loading Transfer Certificate details...
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
  const hasSignature = !!school.principalSignatureFileId;

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
              Official Transfer Certificate (TC) Generation & Archive
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
        <Link href={`/admin/schools/${school.id}`} style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', textDecoration: 'none' }}>
          Overview & Profile
        </Link>
        <Link href={`/admin/schools/${school.id}/academics`} style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', textDecoration: 'none' }}>
          Classes & Sections
        </Link>
        <Link href={`/admin/schools/${school.id}/operators`} style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', textDecoration: 'none' }}>
          School Operators
        </Link>
        <Link
          href={`/admin/schools/${school.id}/transfer-certificate`}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#2563eb',
            borderBottom: '2px solid #2563eb',
            textDecoration: 'none',
          }}
        >
          Transfer Certificate
        </Link>
      </div>

      {/* Status Warning if Inactive */}
      {!isSchoolActive && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <h4 style={{ margin: '0 0 0.25rem 0', color: '#92400e', fontSize: '0.9375rem' }}>
            Generation Restricted
          </h4>
          <p style={{ margin: 0, color: '#b45309', fontSize: '0.8125rem' }}>
            Transfer Certificates can only be issued for schools with <strong>ACTIVE</strong> operational status.
          </p>
        </div>
      )}

      {/* Generation Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: '0 0 0.5rem 0' }}>
          Generate New School Transfer Certificate
        </h2>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1.25rem 0' }}>
          Generates an authentic PDF certificate sealed with the school's immutable UUID (<code>{school.schoolUuid}</code>).
        </p>

        {errorMsg && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', color: '#15803d', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleGenerate}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeLogo}
                onChange={(e) => setIncludeLogo(e.target.checked)}
              />
              <span>Include Official School Logo in Header</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: hasSignature ? 'pointer' : 'not-allowed' }}>
              <input
                type="checkbox"
                checked={includeSignature}
                disabled={!hasSignature}
                onChange={(e) => setIncludeSignature(e.target.checked)}
              />
              <span>
                Include Principal Authorized Signature
                {!hasSignature && (
                  <span style={{ color: '#dc2626', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                    (No principal signature uploaded in School Profile)
                  </span>
                )}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!isSchoolActive || isGenerating}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: isSchoolActive ? '#2563eb' : '#9ca3af',
              color: '#ffffff',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.875rem',
              border: 'none',
              cursor: isSchoolActive && !isGenerating ? 'pointer' : 'not-allowed',
            }}
          >
            {isGenerating ? 'Enqueuing Generation Job...' : 'Generate Transfer Certificate'}
          </button>
        </form>
      </div>

      {/* Generation History */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
            Certificate Generation History ({jobs.length})
          </h3>
          <button
            type="button"
            onClick={loadData}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {jobs.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#6b7280' }}>
              No transfer certificates have been generated for this school yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Job ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Options</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Enqueued At</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Document</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#374151' }}>
                      {j.id.slice(0, 13)}...
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor:
                            j.status === 'COMPLETED'
                              ? '#dcfce7'
                              : j.status === 'FAILED'
                              ? '#fee2e2'
                              : '#fef3c7',
                          color:
                            j.status === 'COMPLETED'
                              ? '#15803d'
                              : j.status === 'FAILED'
                              ? '#b91c1c'
                              : '#b45309',
                        }}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.8125rem' }}>
                      {j.payloadSnapshot?.includeLogo && 'Logo '}
                      {j.payloadSnapshot?.includeSignature && 'Signature'}
                      {!j.payloadSnapshot?.includeLogo && !j.payloadSnapshot?.includeSignature && 'Standard'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                      {new Date(j.enqueuedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      {j.status === 'COMPLETED' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleViewPdf(j.id)}
                            disabled={downloadingJobId === j.id}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              cursor: downloadingJobId === j.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            👁 View PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(j.id)}
                            disabled={downloadingJobId === j.id}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: downloadingJobId === j.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            ⬇ Download PDF
                          </button>
                        </div>
                      ) : j.status === 'FAILED' ? (
                        <span style={{ color: '#dc2626', fontSize: '0.8125rem' }}>
                          {j.errorMessage || 'Generation failed'}
                        </span>
                      ) : j.status === 'PROCESSING' ? (
                        <span style={{ color: '#d97706', fontSize: '0.8125rem', fontWeight: 500 }}>
                          ⚙ Processing PDF...
                        </span>
                      ) : (
                        <span style={{ color: '#92400e', fontSize: '0.8125rem' }}>
                          ⏳ Queued in system...
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
