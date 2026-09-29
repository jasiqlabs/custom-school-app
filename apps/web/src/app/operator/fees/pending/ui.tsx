'use client';

import { useState, useEffect } from 'react';
import { FeesNav } from '@/features/fees/components/fees-nav';
import { feesApi, FeeClassSummary } from '@/features/fees/api/fees-api-client';
import type { PendingFeeReportDto } from '@custom-school/contracts';

export function PendingFeesUi() {
  const [classes, setClasses] = useState<FeeClassSummary[]>([]);
  const [feeMonth, setFeeMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedClassId, setSelectedClassId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [report, setReport] = useState<PendingFeeReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    feesApi.getClasses().then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    loadReport();
  }, [feeMonth, selectedClassId, page]);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const data = await feesApi.getPendingReport({
        feeMonth,
        classId: selectedClassId || undefined,
        search: search.trim() || undefined,
        page,
        limit: 50,
      });
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending fee report');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadReport();
  }

  async function handleExportXlsx() {
    setExporting(true);
    setError(null);
    try {
      const blob = await feesApi.downloadPendingExport({
        feeMonth,
        classId: selectedClassId || undefined,
        search: search.trim() || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pending-fees-${feeMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="operator-container" style={{ width: '100%', paddingBottom: 32 }}>
      {/* Header */}
      <div className="fee-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Pending Fees & Reports
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0 0' }}>
            Authoritative outstanding dues by month, class aggregates, and Excel exports.
          </p>
        </div>

        <button
          type="button"
          id="btn-export-pending-fees"
          onClick={handleExportXlsx}
          disabled={exporting || loading}
          style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 16px',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: exporting || loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            minHeight: 38,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exporting ? 'Exporting...' : 'Export to XLSX'}
        </button>
      </div>

      <FeesNav />

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#b91c1c',
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div
        className="fee-card"
        style={{
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '0 0 180px' }}>
          <label
            htmlFor="filter-fee-month"
            style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}
          >
            Fee Month *
          </label>
          <input
            id="filter-fee-month"
            type="month"
            value={feeMonth}
            onChange={(e) => {
              setFeeMonth(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13.5,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ flex: '0 0 200px' }}>
          <label
            htmlFor="filter-class-id"
            style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}
          >
            Class Filter
          </label>
          <select
            id="filter-class-id"
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13.5,
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 240px', display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label
              htmlFor="filter-search-text"
              style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}
            >
              Search Student
            </label>
            <input
              id="filter-search-text"
              type="text"
              placeholder="Filter by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13.5,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              alignSelf: 'flex-end',
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            Filter
          </button>
        </form>
      </div>

      {/* Metric Cards Banner */}
      {report && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total Active Students</span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
              {report.totalStudents}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {report.studentsWithDuesCount} dues generated
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Pending Dues Count</span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c', marginTop: 4 }}>
              {report.studentsPendingCount}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {report.notGeneratedCount} not yet generated
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total Net Due</span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
              ₹{report.totalNetDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>
              ₹{report.totalConcessions} concessions
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total Collected</span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 4 }}>
              ₹{report.totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Outstanding Balance</span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c', marginTop: 4 }}>
              ₹{report.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Class Breakdown Summary Table */}
      {report && report.classSummaries.length > 0 && !selectedClassId && (
        <div className="fee-card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#1e293b' }}>
            Class-wise Collection Summary ({feeMonth})
          </h3>
          <div className="fee-table-scroll-container">
            <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Class</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Total Students</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Pending Students</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Total Net Due</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Collected</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Outstanding Balance</th>
                </tr>
              </thead>
              <tbody>
                {report.classSummaries.map((cs) => (
                  <tr key={cs.classId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{cs.className}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{cs.totalStudents}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: cs.pendingCount > 0 ? '#fee2e2' : '#dcfce7',
                          color: cs.pendingCount > 0 ? '#991b1b' : '#166534',
                        }}
                      >
                        {cs.pendingCount}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      ₹{cs.netDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                      ₹{cs.collected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: cs.outstanding > 0 ? '#b91c1c' : '#059669', fontWeight: 700 }}>
                      ₹{cs.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Rows Table */}
      <div className="fee-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#1e293b' }}>
            Student Dues Breakdown
          </h3>
          {report && (
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Showing {report.items.length} of {report.totalCount} records
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            Loading pending fees report...
          </div>
        ) : !report || report.items.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
            No student records found matching the filter criteria.
          </div>
        ) : (
          <div className="fee-table-scroll-container">
            <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Code</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Student Name</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Class</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Base</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Concession</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Net Due</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Paid</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Balance</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item) => (
                  <tr key={item.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                      {item.studentCode}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                      {item.studentName}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {item.className} {item.sectionName ? `(${item.sectionName})` : ''}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {item.status === 'NOT_GENERATED' ? '-' : `₹${item.baseAmount}`}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: item.concessionAmount > 0 ? '#059669' : '#64748b' }}>
                      {item.status === 'NOT_GENERATED' ? '-' : `₹${item.concessionAmount}`}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {item.status === 'NOT_GENERATED' ? '-' : `₹${item.netDue}`}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669' }}>
                      {item.status === 'NOT_GENERATED' ? '-' : `₹${item.paidAmount}`}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: item.balance > 0 ? '#b91c1c' : '#059669',
                      }}
                    >
                      {item.status === 'NOT_GENERATED' ? '-' : `₹${item.balance}`}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor:
                            item.status === 'PAID'
                              ? '#dcfce7'
                              : item.status === 'GENERATED_PENDING'
                              ? '#fee2e2'
                              : '#f1f5f9',
                          color:
                            item.status === 'PAID'
                              ? '#166534'
                              : item.status === 'GENERATED_PENDING'
                              ? '#991b1b'
                              : '#64748b',
                        }}
                      >
                        {item.status === 'GENERATED_PENDING'
                          ? 'Pending'
                          : item.status === 'PAID'
                          ? 'Paid'
                          : 'Not Generated'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {item.balance > 0 ? (
                        <a
                          href={`/operator/fees/collect?studentId=${item.studentId}`}
                          id={`btn-collect-fee-${item.studentCode}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 10px',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Collect Fee
                        </a>
                      ) : item.status === 'PAID' ? (
                        <a
                          href={`/operator/fees/collect?studentId=${item.studentId}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 10px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          View
                        </a>
                      ) : (
                        <a
                          href="/operator/fees/setup"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 8px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Setup Fee
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
