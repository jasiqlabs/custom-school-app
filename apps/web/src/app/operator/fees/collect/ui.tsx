'use client';

import { useState, useEffect } from 'react';
import { FeesNav } from '@/features/fees/components/fees-nav';
import { feesApi } from '@/features/fees/api/fees-api-client';
import { studentsApi } from '@/features/students/api/students-api-client';
import type {
  FeeDueDto,
  PaymentReceiptDto,
  PaymentMode,
} from '@custom-school/contracts';

export function CollectFeeUi() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [dues, setDues] = useState<FeeDueDto[]>([]);
  const [loadingDues, setLoadingDues] = useState(false);

  // Payment form state
  const [selectedDue, setSelectedDue] = useState<FeeDueDto | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Receipt modal state
  const [receipt, setReceipt] = useState<PaymentReceiptDto | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Search students debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await studentsApi.getDirectory({
          search: searchQuery.trim(),
          status: 'ACTIVE',
          limit: 10,
        });
        setSearchResults(res.items || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleSelectStudent(student: any) {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchQuery('');
    setSelectedDue(null);
    setPaymentAmount('');
    setFormError(null);
    setLoadingDues(true);

    try {
      const data = await feesApi.getStudentDues(student.id);
      setDues(data.dues || []);
      // Auto-select earliest unpaid/partial due
      const pendingDue = (data.dues || []).find((d) => d.balance > 0);
      if (pendingDue) {
        setSelectedDue(pendingDue);
        setPaymentAmount(String(pendingDue.balance));
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to fetch student dues');
    } finally {
      setLoadingDues(false);
    }
  }

  function handleSelectDue(due: FeeDueDto) {
    setSelectedDue(due);
    setPaymentAmount(String(due.balance));
    setFormError(null);
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !selectedDue) return;

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Please enter a valid positive payment amount');
      return;
    }
    if (amountNum > selectedDue.balance) {
      setFormError(`Payment amount (₹${amountNum}) cannot exceed due balance (₹${selectedDue.balance})`);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    // Generate unique idempotency key for this payment submission
    const idempotencyKey = `pay-${selectedStudent.id}-${selectedDue.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      const receiptData = await feesApi.collectPayment({
        studentId: selectedStudent.id,
        dueId: selectedDue.id,
        amount: amountNum,
        mode: paymentMode,
        paymentDate,
        reference: reference.trim() || undefined,
        idempotencyKey,
      });

      setReceipt(receiptData);
      setReceiptModalOpen(true);

      // Refresh dues
      const updatedDues = await feesApi.getStudentDues(selectedStudent.id);
      setDues(updatedDues.dues || []);
      const nextPending = (updatedDues.dues || []).find((d) => d.balance > 0);
      setSelectedDue(nextPending || null);
      setPaymentAmount(nextPending ? String(nextPending.balance) : '');
      setReference('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to record fee payment');
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const isStudentInactive = selectedStudent && selectedStudent.status !== 'ACTIVE';

  return (
    <div className="operator-container" style={{ width: '100%', paddingBottom: 32 }}>
      {/* Header */}
      <div className="fee-page-header">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Collect Student Fee
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0 0' }}>
          Search student by code or name, select monthly due, and issue printable receipts.
        </p>
      </div>

      <FeesNav />

      {/* Student Search Bar */}
      <div
        className="fee-card"
        style={{
          marginBottom: 24,
          position: 'relative',
          overflow: 'visible',
          zIndex: 40,
        }}
      >
        <label
          htmlFor="student-search-input"
          style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}
        >
          Find Active Student (by Code, SR, or Name)
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="student-search-input"
            type="text"
            placeholder="Type student code (e.g. STU-2026-0001) or full name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 14px',
              fontSize: 14,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              boxSizing: 'border-box',
            }}
          />
          {searching && (
            <div
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 12,
                color: '#64748b',
              }}
            >
              Searching...
            </div>
          )}

          {/* Dropdown Suggestions */}
          {searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                zIndex: 100,
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {searchResults.map((st) => (
                <div
                  key={st.id}
                  onClick={() => handleSelectStudent(st)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <div>
                    <strong style={{ color: '#0f172a', fontSize: 13.5 }}>{st.fullName}</strong>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Code: {st.studentCode} | Class: {st.className || 'Unassigned'}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: st.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                      color: st.status === 'ACTIVE' ? '#166534' : '#991b1b',
                    }}
                  >
                    {st.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                zIndex: 100,
                padding: '12px 16px',
                color: '#64748b',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              No active students found matching &ldquo;{searchQuery.trim()}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* Selected Student Banner */}
      {selectedStudent && (
        <div
          className="fee-card"
          style={{
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {selectedStudent.fullName}
              </h2>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: selectedStudent.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                  color: selectedStudent.status === 'ACTIVE' ? '#166534' : '#991b1b',
                }}
              >
                {selectedStudent.status}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Student Code: <strong style={{ color: '#0f172a' }}>{selectedStudent.studentCode}</strong> |
              Class: <strong style={{ color: '#0f172a' }}>{selectedStudent.className || 'Unassigned'}</strong>
            </div>
          </div>

          {isStudentInactive && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12.5,
                color: '#991b1b',
                fontWeight: 600,
              }}
            >
              Inactive Student — Fee Collection Disabled
            </div>
          )}
        </div>
      )}

      {/* Main Two-Column Layout: Due Cards List (Left) and Payment Box (Right) */}
      {selectedStudent && (
        <div className="fee-collect-grid">
          {/* Left: Monthly Dues Cards */}
          <div className="fee-card">
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px 0', color: '#1e293b' }}>
              Student Monthly Dues
            </h3>

            {loadingDues ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                Loading student dues...
              </div>
            ) : dues.length === 0 ? (
              <div
                style={{
                  padding: 30,
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: 13.5,
                }}
              >
                No dues have been generated for this student yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dues.map((due) => {
                  const isSelected = selectedDue?.id === due.id;
                  const isPaid = due.balance <= 0;

                  return (
                    <div
                      key={due.id}
                      onClick={() => !isPaid && handleSelectDue(due)}
                      style={{
                        padding: 16,
                        borderRadius: 10,
                        border: isSelected
                          ? '2px solid #059669'
                          : '1px solid #e2e8f0',
                        backgroundColor: isSelected
                          ? '#f0fdf4'
                          : isPaid
                          ? '#f8fafc'
                          : '#ffffff',
                        cursor: isPaid ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 15, color: '#0f172a' }}>
                            {due.feeMonth}
                          </strong>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontSize: 11,
                              fontWeight: 700,
                              backgroundColor:
                                due.status === 'PAID'
                                  ? '#dcfce7'
                                  : due.status === 'PARTIAL'
                                  ? '#fef9c3'
                                  : '#fee2e2',
                              color:
                                due.status === 'PAID'
                                  ? '#166534'
                                  : due.status === 'PARTIAL'
                                  ? '#854d0e'
                                  : '#991b1b',
                            }}
                          >
                            {due.status}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Balance Due</span>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: due.balance > 0 ? '#b91c1c' : '#059669',
                            }}
                          >
                            ₹{due.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                          gap: 6,
                          fontSize: 12,
                          color: '#475569',
                          backgroundColor: '#ffffff',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #f1f5f9',
                        }}
                      >
                        <div>Base: ₹{due.baseAmount}</div>
                        <div>Concession: ₹{due.concessionAmount}</div>
                        <div>Net Due: ₹{due.netDue}</div>
                        <div>Paid: ₹{due.paidAmount}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Payment Form */}
          <div className="fee-card">
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px 0', color: '#1e293b' }}>
              Record Payment
            </h3>

            {formError && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  color: '#b91c1c',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {formError}
              </div>
            )}

            {!selectedDue ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
                Select a pending monthly due card on the left to record a payment.
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                    Selected Due Month
                  </label>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    {selectedDue.feeMonth} (Balance: ₹{selectedDue.balance})
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label
                    htmlFor="payment-amount"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                  >
                    Payment Amount (₹) *
                  </label>
                  <input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedDue.balance}
                    required
                    disabled={isStudentInactive}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 15,
                      fontWeight: 600,
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(selectedDue.balance))}
                      style={{
                        padding: '3px 8px',
                        fontSize: 11,
                        borderRadius: 4,
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                      }}
                    >
                      Pay Full (₹{selectedDue.balance})
                    </button>
                    {selectedDue.balance > 500 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(Math.floor(selectedDue.balance / 2)))}
                        style={{
                          padding: '3px 8px',
                          fontSize: 11,
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          cursor: 'pointer',
                        }}
                      >
                        Pay 50%
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label
                    htmlFor="payment-mode"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                  >
                    Payment Mode *
                  </label>
                  <select
                    id="payment-mode"
                    value={paymentMode}
                    disabled={isStudentInactive}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label
                    htmlFor="payment-date"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                  >
                    Payment Date *
                  </label>
                  <input
                    id="payment-date"
                    type="date"
                    required
                    disabled={isStudentInactive}
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    htmlFor="payment-reference"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                  >
                    Reference / Transaction Note
                  </label>
                  <input
                    id="payment-reference"
                    type="text"
                    disabled={isStudentInactive}
                    placeholder="e.g. UPI Ref / Cheque No / Notes"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  id="btn-submit-fee-payment"
                  disabled={submitting || isStudentInactive}
                  style={{
                    width: '100%',
                    backgroundColor: submitting || isStudentInactive ? '#94a3b8' : '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '11px 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: submitting || isStudentInactive ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Recording Payment...' : `Record Payment of ₹${paymentAmount || '0'}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptModalOpen && receipt && (
        <div
          className="receipt-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="printable-receipt-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 28,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
            }}
          >
            {/* Action Bar (hidden when printing) */}
            <div
              className="receipt-actions no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: 12,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>
                ✓ Payment Successfully Recorded
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  id="btn-print-receipt"
                  onClick={handlePrint}
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Receipt Content Body */}
            <div
              id="printable-receipt-content"
              style={{
                border: '1px solid #cbd5e1',
                padding: 24,
                borderRadius: 8,
                backgroundColor: '#ffffff',
              }}
            >
              {/* Receipt Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a' }}>
                  {receipt.schoolName}
                </h2>
                {receipt.schoolAddress && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{receipt.schoolAddress}</p>
                )}
                {receipt.schoolPhone && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>Phone: {receipt.schoolPhone}</p>
                )}
                <div
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    padding: '3px 12px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    marginTop: 8,
                  }}
                >
                  FEE PAYMENT RECEIPT
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
                  Receipt No: <strong>{receipt.receiptNumber}</strong>
                </div>
                <div>
                  Date: <strong>{receipt.paymentDate}</strong>
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
                  Student: <strong style={{ color: '#0f172a' }}>{receipt.studentName}</strong>
                </div>
                <div>
                  Student ID: <strong style={{ color: '#0f172a' }}>{receipt.studentCode}</strong>
                </div>
                <div>
                  Class: <strong>{receipt.className || 'General'}</strong>
                </div>
                <div>
                  Fee Month: <strong>{receipt.feeMonth}</strong>
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
                    <td style={{ textAlign: 'right', padding: '6px 0' }}>₹{receipt.baseAmount.toFixed(2)}</td>
                  </tr>
                  {receipt.concessionAmount > 0 && (
                    <tr style={{ color: '#059669' }}>
                      <td style={{ padding: '6px 0' }}>Concession Applied</td>
                      <td style={{ textAlign: 'right', padding: '6px 0' }}>-₹{receipt.concessionAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr style={{ fontWeight: 600, borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 0' }}>Net Due</td>
                    <td style={{ textAlign: 'right', padding: '6px 0' }}>₹{receipt.netDue.toFixed(2)}</td>
                  </tr>
                  <tr style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderTop: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '10px 0' }}>Amount Paid (This Receipt)</td>
                    <td style={{ textAlign: 'right', padding: '10px 0' }}>₹{receipt.amountPaidThisReceipt.toFixed(2)}</td>
                  </tr>
                  <tr style={{ color: '#64748b', fontSize: 12 }}>
                    <td style={{ padding: '4px 0' }}>Remaining Balance</td>
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>₹{receipt.remainingBalance.toFixed(2)}</td>
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
                  <div>Mode: <strong>{receipt.paymentMode}</strong></div>
                  {receipt.reference && <div>Ref: {receipt.reference}</div>}
                  <div>Status: <strong style={{ color: '#059669' }}>{receipt.status}</strong></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ height: 32 }} />
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 2 }}>Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
