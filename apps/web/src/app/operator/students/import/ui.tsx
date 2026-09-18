'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { studentsApi } from '@/features/students/api/students-api-client';
import { API_BASE } from '@/lib/api';
import type { BulkImportJobDto, BulkImportRowPreviewDto } from '@custom-school/contracts';

export function StudentImportUi({ session }: { session: any }) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [job, setJob] = useState<BulkImportJobDto | null>(null);
  const [rows, setRows] = useState<BulkImportRowPreviewDto[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const createdJob = await studentsApi.uploadImportFile(file);
      setJob(createdJob);
      const stagedRows = await studentsApi.getImportJobRows(createdJob.id, 100);
      setRows(stagedRows);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload and validate spreadsheet');
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirm() {
    if (!job) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const updated = await studentsApi.confirmImport(job.id);
      setJob(updated);
      setCompleted(true);
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to finalize student import');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginBottom: 8 }}>
          <Link href="/operator/students" style={{ color: '#2563eb', textDecoration: 'none' }}>Students</Link>
          <span>/</span>
          <span>Bulk Import</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Bulk Student Import (XLSX)
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
          Onboard multiple student records simultaneously with spreadsheet validation, encrypted staging, and error isolation.
        </p>
      </div>

      {/* Step Progress Indicator */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 28
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: !job ? '#eff6ff' : '#f8fafc',
            border: !job ? '2px solid #2563eb' : '1px solid #e2e8f0',
            color: !job ? '#1e40af' : '#64748b'
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Step 1</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>Upload & Validate</div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: job && !completed ? '#eff6ff' : '#f8fafc',
            border: job && !completed ? '2px solid #2563eb' : '1px solid #e2e8f0',
            color: job && !completed ? '#1e40af' : '#64748b'
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Step 2</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>Review Staged Rows</div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: job && job.errorRows > 0 ? '#fff7ed' : '#f8fafc',
            border: '1px solid #e2e8f0',
            color: job && job.errorRows > 0 ? '#c2410c' : '#64748b'
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Step 3</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>Error Isolation</div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: completed ? '#f0fdf4' : '#f8fafc',
            border: completed ? '2px solid #16a34a' : '1px solid #e2e8f0',
            color: completed ? '#15803d' : '#64748b'
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Step 4</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>Confirmation & Import</div>
        </div>
      </div>

      {/* Stage 1: Upload Card (if not yet uploaded) */}
      {!job && (
        <div className="card" style={{ padding: 24, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Select Spreadsheet File
            </h3>
            <a
              href={`${API_BASE}/operator/students-import/template`}
              download="student-import-template.xlsx"
              className="btn"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '7px 14px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              📥 Download Sample Template (.xlsx)
            </a>
          </div>

          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
            Ensure your spreadsheet matches the required column layout: Student Name, Father Name, Mother Name, Date of Birth, Gender, Class Name, Section Name, Address, Phone, Emergency Contact, Aadhaar Number.
          </p>

          {uploadError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {uploadError}
            </div>
          )}

          <form onSubmit={handleUpload}>
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 10,
                padding: '36px 20px',
                textAlign: 'center',
                background: '#f8fafc',
                marginBottom: 20
              }}
            >
              <input
                type="file"
                accept=".xlsx"
                onChange={e => setFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
              >
                <span style={{ fontSize: 32 }}>📊</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                  {file ? file.name : 'Click to choose an Excel (.xlsx) file'}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Maximum file size: 10MB'}
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Link href="/operator/students" className="btn btn-secondary">Cancel</Link>
              <button
                type="submit"
                disabled={!file || uploading}
                className="btn"
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: !file || uploading ? 'not-allowed' : 'pointer'
                }}
              >
                {uploading ? 'Validating Spreadsheet...' : 'Upload & Validate'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stage 2 & 3: Staged Rows & Summary */}
      {job && (
        <div>
          {/* Summary Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div style={{ padding: 16, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Total Rows Processed</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{job.totalRows}</div>
            </div>

            <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 12, color: '#166534' }}>Valid Rows Ready</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#15803d', marginTop: 4 }}>{job.validRows}</div>
            </div>

            <div style={{ padding: 16, background: job.errorRows > 0 ? '#fef2f2' : '#ffffff', borderRadius: 10, border: job.errorRows > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: job.errorRows > 0 ? '#991b1b' : '#64748b' }}>Error Rows</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: job.errorRows > 0 ? '#b91c1c' : '#0f172a', marginTop: 4 }}>{job.errorRows}</div>
            </div>

            <div style={{ padding: 16, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Import Status</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb', marginTop: 6, textTransform: 'uppercase' }}>{job.status}</div>
            </div>
          </div>

          {confirmError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {confirmError}
            </div>
          )}

          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              padding: '14px 18px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              marginBottom: 20
            }}
          >
            <div>
              {job.errorRows > 0 && (
                <a
                  href={`${API_BASE}/operator/students-import/jobs/${job.id}/errors`}
                  download="import-errors.xlsx"
                  className="btn"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid #fca5a5',
                    background: '#fff1f2',
                    color: '#be123c',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  📥 Download Error Workbook ({job.errorRows} Errors)
                </a>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!completed ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setJob(null); setRows([]); }}
                    className="btn"
                    style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13 }}
                  >
                    Start Over
                  </button>
                  <button
                    type="button"
                    disabled={job.validRows === 0 || confirming}
                    onClick={handleConfirm}
                    className="btn"
                    style={{
                      padding: '8px 20px',
                      borderRadius: 6,
                      background: '#16a34a',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: job.validRows === 0 || confirming ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {confirming ? 'Importing Students...' : `Confirm Import (${job.validRows} Students)`}
                  </button>
                </>
              ) : (
                <Link
                  href="/operator/students"
                  className="btn"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  Go to Student Directory →
                </Link>
              )}
            </div>
          </div>

          {/* Staged Rows Table */}
          <div className="card" style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
              Staged Row Inspection (Showing first {rows.length} rows)
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Row #</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Student Code</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Full Name</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Class & Section</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Gender</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Phone</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Validation Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.rowNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#64748b' }}>
                        {row.rowNumber}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: row.status === 'VALID' || row.status === 'IMPORTED' ? '#dcfce7' : '#fee2e2',
                            color: row.status === 'VALID' || row.status === 'IMPORTED' ? '#166534' : '#991b1b'
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>
                        {row.previewData?.studentCode || '(AUTO)'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {row.previewData?.fullName}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {row.previewData?.className} - {row.previewData?.sectionName}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {row.previewData?.gender}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {row.previewData?.phone}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        {row.errorMessages && row.errorMessages.length > 0 ? (
                          <span style={{ color: '#dc2626', fontWeight: 500 }}>
                            ⚠️ {row.errorMessages.join('; ')}
                          </span>
                        ) : (
                          <span style={{ color: '#16a34a' }}>✓ Ready for import</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
