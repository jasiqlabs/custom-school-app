'use client';

import { useState, useEffect } from 'react';
import { FeesNav } from '@/features/fees/components/fees-nav';
import { feesApi } from '@/features/fees/api/fees-api-client';
import type {
  FeePaymentDto,
  PaymentReceiptDto,
  PaymentMode,
  PaymentStatus,
} from '@custom-school/contracts';

export function PaymentHistoryUi() {
  const [payments, setPayments] = useState<FeePaymentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [feeMonth, setFeeMonth] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedMode, setSelectedMode] = useState<PaymentMode | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | ''>('');

  // Receipt modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceiptDto | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  // Void modal state
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [paymentToVoid, setPaymentToVoid] = useState<FeePaymentDto | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [page, feeMonth, fromDate, toDate, selectedMode, selectedStatus]);

  async function loadPayments() {
    setLoading(true);
    setError(null);
    try {
      const res = await feesApi.listPayments({
        page,
        limit,
        search: search.trim() || undefined,
        feeMonth: feeMonth || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        mode: (selectedMode as PaymentMode) || undefined,
        status: (selectedStatus as PaymentStatus) || undefined,
      });
      setPayments(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadPayments();
  }

  function handleResetFilters() {
    setSearch('');
    setFeeMonth('');
    setFromDate('');
    setToDate('');
    setSelectedMode('');
    setSelectedStatus('');
    setPage(1);
  }

  async function handleOpenReceipt(paymentId: string) {
    setLoadingReceipt(true);
    setReceiptError(null);
    setReceiptModalOpen(true);
    try {
      const data = await feesApi.getReceipt(paymentId);
      setActiveReceipt(data);
    } catch (err: any) {
      setReceiptError(err.message || 'Failed to fetch receipt details');
    } finally {
      setLoadingReceipt(false);
    }
  }

  function handleOpenVoidModal(payment: FeePaymentDto) {
    setPaymentToVoid(payment);
    setVoidReason('');
    setVoidError(null);
    setVoidModalOpen(true);
  }

  async function handleConfirmVoid(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentToVoid) return;

    if (!voidReason.trim() || voidReason.trim().length < 5) {
      setVoidError('Please provide a specific void reason (minimum 5 characters).');
      return;
    }

    setVoiding(true);
    setVoidError(null);

    try {
      await feesApi.voidPayment(paymentToVoid.id, {
        reason: voidReason.trim(),
      });
      setVoidModalOpen(false);
      setPaymentToVoid(null);
      setVoidReason('');
      await loadPayments();
    } catch (err: any) {
      setVoidError(err.message || 'Failed to void payment. Same-day policy may have expired.');
    } finally {
      setVoiding(false);
    }
  }

  const totalPages = Math.ceil(total / limit) || 1;

  // Active / Voided summary in view
  const activeAmountInView = payments
    .filter((p) => p.status === 'ACTIVE')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="operator-container" style={{ width: '100%', paddingBottom: 32 }}>
      {/* Header */}
      <div className="fee-page-header">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Payment History & Receipts
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0 0' }}>
          Chronological record of fee collections, receipt verification, and audited same-day voids.
        </p>
      </div>

      {/* Module Nav */}
      <FeesNav />

      {/* Filter Bar */}
      <div
        className="fee-card"
        style={{
          marginBottom: 20,
        }}
      >
        <form onSubmit={handleFilterSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Search */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Search Student / Receipt
            </label>
            <input
              type="text"
              id="filter-payment-search"
              placeholder="Receipt #, Name, Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* From Date */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              From Payment Date
            </label>
            <input
              type="date"
              id="filter-payment-from-date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* To Date */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              To Payment Date
            </label>
            <input
              type="date"
              id="filter-payment-to-date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Payment Mode
            </label>
            <select
              id="filter-payment-mode"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as PaymentMode | '')}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Status
            </label>
            <select
              id="filter-payment-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PaymentStatus | '')}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="VOIDED">Voided</option>
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button
              type="submit"
              id="btn-filter-payment-apply"
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Apply
            </button>
            <button
              type="button"
              id="btn-filter-payment-reset"
              onClick={handleResetFilters}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Summary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total Payments</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{total}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Active Volume (Current Page)</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#059669', marginTop: 2 }}>
            ₹{activeAmountInView.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Voided in Page</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', marginTop: 2 }}>
            {payments.filter((p) => p.status === 'VOIDED').length}
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Payments Table */}
      <div className="fee-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="fee-table-scroll-container">
          <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Receipt #</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Payment Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Student</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Mode</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reference</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    Loading payment records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    No payments found matching the selected filters.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isVoided = p.status === 'VOIDED';

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isVoided ? '#fef2f2' : undefined,
                        opacity: isVoided ? 0.85 : 1,
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                        {p.receiptNumber}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>{p.paymentDate}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.studentNameSnapshot}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{p.studentCodeSnapshot}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                          }}
                        >
                          {p.mode}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                        {p.reference || '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isVoided ? '#991b1b' : '#059669',
                          textDecoration: isVoided ? 'line-through' : 'none',
                        }}
                      >
                        ₹{p.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isVoided ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                              }}
                            >
                              VOIDED
                            </span>
                            {p.voidReason && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#7f1d1d',
                                  marginTop: 2,
                                  maxWidth: 160,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={`Reason: ${p.voidReason}${p.voidedAt ? ` at ${p.voidedAt}` : ''}`}
                              >
                                {p.voidReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              backgroundColor: '#ecfdf5',
                              color: '#065f46',
                            }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            id={`btn-view-receipt-${p.id}`}
                            onClick={() => handleOpenReceipt(p.id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 5,
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#0f172a',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Receipt
                          </button>
                          {!isVoided && (
                            <button
                              type="button"
                              id={`btn-void-payment-${p.id}`}
                              onClick={() => handleOpenVoidModal(p)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 5,
                                border: '1px solid #fecaca',
                                backgroundColor: '#fff5f5',
                                color: '#dc2626',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              title="Void this payment (Available on the same business day)"
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              fontSize: 13,
            }}
          >
            <div style={{ color: '#64748b' }}>
              Showing {payments.length} of {total} records (Page {page} of {totalPages})
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                id="btn-history-prev"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: page <= 1 ? '#94a3b8' : '#334155',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                Previous
              </button>
              <button
                type="button"
                id="btn-history-next"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: page >= totalPages ? '#94a3b8' : '#334155',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Receipt Modal */}
      {receiptModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-receipt-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: 580,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 id="history-receipt-modal-title" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Payment Receipt Details
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {activeReceipt && (
                  <button
                    type="button"
                    id="btn-print-history-receipt"
                    onClick={() => window.print()}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Print Receipt
                  </button>
                )}
                <button
                  type="button"
                  id="btn-close-history-receipt"
                  onClick={() => {
                    setReceiptModalOpen(false);
                    setActiveReceipt(null);
                  }}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {loadingReceipt && (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                Loading receipt details...
              </div>
            )}

            {receiptError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  borderRadius: 6,
                  padding: 12,
                  fontSize: 13,
                }}
              >
                {receiptError}
              </div>
            )}

            {activeReceipt && !loadingReceipt && (
              <div
                id="printable-history-receipt"
                style={{
                  border: '1px solid #cbd5e1',
                  padding: 24,
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                  position: 'relative',
                }}
              >
                {/* VOID WATERMARK / BANNER IF VOIDED */}
                {activeReceipt.status === 'VOIDED' && (
                  <div
                    style={{
                      backgroundColor: '#fee2e2',
                      border: '2px dashed #dc2626',
                      borderRadius: 6,
                      padding: '10px 14px',
                      marginBottom: 16,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#dc2626', letterSpacing: '0.1em' }}>
                      *** THIS RECEIPT HAS BEEN VOIDED ***
                    </div>
                    {activeReceipt.voidReason && (
                      <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>
                        Reason: {activeReceipt.voidReason}
                      </div>
                    )}
                    {activeReceipt.voidedAt && (
                      <div style={{ fontSize: 11, color: '#7f1d1d', marginTop: 2 }}>
                        Voided on: {activeReceipt.voidedAt}
                      </div>
                    )}
                  </div>
                )}

                {/* Receipt Header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 16 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a' }}>
                    {activeReceipt.schoolName}
                  </h2>
                  {activeReceipt.schoolAddress && (
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{activeReceipt.schoolAddress}</p>
                  )}
                  {activeReceipt.schoolPhone && (
                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>Phone: {activeReceipt.schoolPhone}</p>
                  )}
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: activeReceipt.status === 'VOIDED' ? '#dc2626' : '#0f172a',
                      color: '#ffffff',
                      padding: '3px 12px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      marginTop: 8,
                    }}
                  >
                    {activeReceipt.status === 'VOIDED' ? 'VOIDED RECEIPT' : 'FEE PAYMENT RECEIPT'}
                  </div>
                </div>

                {/* Receipt Meta */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                    marginBottom: 16,
                    color: '#334155',
                  }}
                >
                  <div>
                    Receipt No: <strong>{activeReceipt.receiptNumber}</strong>
                  </div>
                  <div>
                    Date: <strong>{activeReceipt.paymentDate}</strong>
                  </div>
                </div>

                {/* Student Details */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '10px 14px',
                    marginBottom: 16,
                    fontSize: 12.5,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                  }}
                >
                  <div>
                    Student: <strong style={{ color: '#0f172a' }}>{activeReceipt.studentName}</strong>
                  </div>
                  <div>
                    Student ID: <strong style={{ color: '#0f172a' }}>{activeReceipt.studentCode}</strong>
                  </div>
                  <div>
                    Class: <strong>{activeReceipt.className || 'General'}</strong>
                  </div>
                  <div>
                    Fee Month: <strong>{activeReceipt.feeMonth}</strong>
                  </div>
                </div>

                {/* Breakdown Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, marginBottom: 16 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b' }}>
                      <th style={{ textAlign: 'left', padding: '6px 0' }}>Description</th>
                      <th style={{ textAlign: 'right', padding: '6px 0' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '6px 0' }}>Monthly Tuition Fee</td>
                      <td style={{ textAlign: 'right', padding: '6px 0' }}>₹{activeReceipt.baseAmount.toFixed(2)}</td>
                    </tr>
                    {activeReceipt.concessionAmount > 0 && (
                      <tr style={{ color: '#059669' }}>
                        <td style={{ padding: '6px 0' }}>Concession Applied</td>
                        <td style={{ textAlign: 'right', padding: '6px 0' }}>-₹{activeReceipt.concessionAmount.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr style={{ fontWeight: 600, borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 0' }}>Net Due</td>
                      <td style={{ textAlign: 'right', padding: '6px 0' }}>₹{activeReceipt.netDue.toFixed(2)}</td>
                    </tr>
                    <tr style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderTop: '1px solid #cbd5e1' }}>
                      <td style={{ padding: '10px 0' }}>Amount Paid (This Receipt)</td>
                      <td style={{ textAlign: 'right', padding: '10px 0' }}>₹{activeReceipt.amountPaidThisReceipt.toFixed(2)}</td>
                    </tr>
                    <tr style={{ color: '#64748b', fontSize: 12 }}>
                      <td style={{ padding: '4px 0' }}>Remaining Balance</td>
                      <td style={{ textAlign: 'right', padding: '4px 0' }}>₹{activeReceipt.remainingBalance.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Payment Details Footer */}
                <div
                  style={{
                    borderTop: '1px dashed #cbd5e1',
                    paddingTop: 12,
                    fontSize: 11.5,
                    color: '#64748b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                  }}
                >
                  <div>
                    <div>Mode: <strong>{activeReceipt.paymentMode}</strong></div>
                    {activeReceipt.reference && <div>Ref: {activeReceipt.reference}</div>}
                    <div>
                      Status:{' '}
                      <strong style={{ color: activeReceipt.status === 'VOIDED' ? '#dc2626' : '#059669' }}>
                        {activeReceipt.status}
                      </strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ height: 32 }} />
                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 2 }}>Authorized Signatory</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {voidModalOpen && paymentToVoid && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="void-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: 24,
            }}
          >
            <h2 id="void-modal-title" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px 0', color: '#991b1b' }}>
              Confirm Payment Void
            </h2>

            <div
              style={{
                backgroundColor: '#fff5f5',
                border: '1px solid #fed7d7',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 13,
                color: '#7f1d1d',
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              <strong>Important Policy Rule:</strong>
              <div style={{ marginTop: 4 }}>
                Voiding receipt <strong>#{paymentToVoid.receiptNumber}</strong> will immediately:
              </div>
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                <li>Restore ₹{paymentToVoid.amount.toFixed(2)} back to the student&apos;s unpaid balance</li>
                <li>Mark this receipt status as <strong>VOIDED</strong> (cannot be un-voided)</li>
                <li>Retain permanent audit evidence of the transaction and reason</li>
              </ul>
            </div>

            {voidError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                {voidError}
              </div>
            )}

            <form onSubmit={handleConfirmVoid}>
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="input-void-reason"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}
                >
                  Mandatory Void Reason <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  id="input-void-reason"
                  rows={3}
                  required
                  placeholder="e.g., Cash entry error / wrong student selected / duplicate slip"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Minimum 5 characters. This will be stored for audit purposes.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  id="btn-cancel-void"
                  onClick={() => {
                    setVoidModalOpen(false);
                    setPaymentToVoid(null);
                    setVoidReason('');
                  }}
                  disabled={voiding}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-void"
                  disabled={voiding}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: voiding ? 'not-allowed' : 'pointer',
                    opacity: voiding ? 0.7 : 1,
                  }}
                >
                  {voiding ? 'Voiding...' : 'Confirm & Void Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
