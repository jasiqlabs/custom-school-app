'use client';

import { useState, useEffect } from 'react';
import { FeesNav } from '@/features/fees/components/fees-nav';
import { feesApi, FeeClassSummary } from '@/features/fees/api/fees-api-client';
import type { ClassFeeConfigDto, GenerateDuesResultDto } from '@custom-school/contracts';

export function FeesSetupUi() {
  const [classes, setClasses] = useState<FeeClassSummary[]>([]);
  const [configs, setConfigs] = useState<ClassFeeConfigDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Config modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState('');
  const [effectiveMonth, setEffectiveMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [amount, setAmount] = useState('');
  const [configStatus, setConfigStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  // Due generation state
  const [genMonth, setGenMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [genClassId, setGenClassId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateDuesResultDto | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [clsList, cfgList] = await Promise.all([
        feesApi.getClasses(),
        feesApi.listConfigs(),
      ]);
      setClasses(clsList);
      setConfigs(cfgList);
      if (clsList.length > 0 && !editingClassId) {
        setEditingClassId(clsList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load fee configuration');
    } finally {
      setLoading(false);
    }
  }

  function openAddModal(classId?: string) {
    if (classId) setEditingClassId(classId);
    setAmount('');
    setConfigStatus('ACTIVE');
    setModalOpen(true);
    setConfigSuccess(null);
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!editingClassId) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Fee amount must be a positive number');
      return;
    }

    setSavingConfig(true);
    setError(null);
    try {
      await feesApi.upsertConfig({
        classId: editingClassId,
        effectiveMonth,
        amount: numAmount,
        status: configStatus,
      });
      setConfigSuccess('Fee configuration saved successfully');
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save fee configuration');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleGenerateDues(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenResult(null);
    setGenError(null);

    try {
      const res = await feesApi.generateDues({
        feeMonth: genMonth,
        classId: genClassId || undefined,
      });
      setGenResult(res);
    } catch (err: any) {
      setGenError(err.message || 'Failed to generate dues');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="operator-container" style={{ width: '100%', paddingBottom: 32 }}>
      {/* Header */}
      <div className="fee-page-header">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Fee Setup & Due Generation
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0 0' }}>
          Define class monthly school fee rates and generate snapshot dues for active students.
        </p>
      </div>

      {/* Tabs */}
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

      {configSuccess && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            color: '#166534',
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {configSuccess}
        </div>
      )}

      {/* Main Grid: Config Table on Left, Due Generation Panel on Right */}
      <div className="fee-setup-grid">
        {/* Left Column: Fee Configuration Rates */}
        <div className="fee-card">
          <div className="fee-card-header">
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Class Monthly Fee Rates
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0 0' }}>
                Effective amounts applied during due generation
              </p>
            </div>
            <button
              type="button"
              id="btn-add-fee-config"
              onClick={() => openAddModal()}
              className="fee-header-btn"
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                minHeight: 38,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Fee Rate</span>
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              Loading fee configurations...
            </div>
          ) : configs.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                border: '1px dashed #cbd5e1',
              }}
            >
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 12px 0' }}>
                No class fee configurations have been established yet.
              </p>
              <button
                type="button"
                onClick={() => openAddModal()}
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Configure First Class Fee
              </button>
            </div>
          ) : (
            <div className="fee-table-scroll-container">
              <table className="fee-setup-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ fontWeight: 600 }}>Class</th>
                    <th style={{ fontWeight: 600 }}>Effective Month</th>
                    <th style={{ fontWeight: 600 }}>Monthly Amount</th>
                    <th style={{ fontWeight: 600 }}>Status</th>
                    <th style={{ fontWeight: 600, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((cfg) => (
                    <tr
                      key={cfg.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {cfg.className || 'Class'}
                      </td>
                      <td style={{ color: '#334155' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'nowrap' }}>
                          {cfg.effectiveMonth}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        ₹{cfg.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: cfg.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                            color: cfg.status === 'ACTIVE' ? '#166534' : '#64748b',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cfg.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="fee-action-btn"
                          onClick={() => {
                            setEditingClassId(cfg.classId);
                            setEffectiveMonth(cfg.effectiveMonth);
                            setAmount(String(cfg.amount));
                            setConfigStatus(cfg.status as any);
                            setModalOpen(true);
                          }}
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Due Generation Panel */}
        <div className="fee-card">
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px 0', color: '#1e293b' }}>
            Generate Monthly Dues
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px 0' }}>
            Batch generate student dues with automated concession snapshots.
          </p>

          <form onSubmit={handleGenerateDues}>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="gen-fee-month"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}
              >
                Target Fee Month (YYYY-MM) *
              </label>
              <input
                id="gen-fee-month"
                type="month"
                required
                value={genMonth}
                onChange={(e) => setGenMonth(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  minHeight: 44,
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="gen-class-scope"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}
              >
                Class Scope
              </label>
              <select
                id="gen-class-scope"
                value={genClassId}
                onChange={(e) => setGenClassId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  minHeight: 44,
                }}
              >
                <option value="">All Active Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 12.5,
                color: '#475569',
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              <strong>Policy Note:</strong> Concession rules (None, Fixed, or Percentage) are frozen when
              dues are generated. Later student concession adjustments apply exclusively to subsequent months.
            </div>

            <button
              type="submit"
              id="btn-trigger-due-generation"
              disabled={generating}
              style={{
                width: '100%',
                backgroundColor: generating ? '#94a3b8' : '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '11px 16px',
                fontSize: 14,
                fontWeight: 700,
                cursor: generating ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {generating ? 'Processing Dues...' : `Generate Dues for ${genMonth}`}
            </button>
          </form>

          {genError && (
            <div
              role="alert"
              style={{
                marginTop: 16,
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                color: '#b91c1c',
                fontSize: 13,
              }}
            >
              {genError}
            </div>
          )}

          {/* Results Summary Box */}
          {genResult && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 8,
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#166534', margin: '0 0 10px 0' }}>
                Due Generation Summary: {genResult.feeMonth}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <div style={{ backgroundColor: '#ffffff', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>
                    {genResult.createdCount}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Created</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
                    {genResult.existingCount}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Existing</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: genResult.skippedCount > 0 ? '#ea580c' : '#64748b' }}>
                    {genResult.skippedCount}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Skipped</div>
                </div>
              </div>

              {genResult.skippedReasons.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9a3412', marginBottom: 4 }}>
                    Skipped Students:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#7c2d12' }}>
                    {genResult.skippedReasons.map((r, i) => (
                      <li key={i} style={{ marginBottom: 3 }}>
                        <strong>{r.studentCode}</strong> ({r.studentName}): {r.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Config Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 440,
              boxSizing: 'border-box',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
              Configure Class Monthly Fee
            </h3>
            <form onSubmit={handleSaveConfig}>
              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="cfg-class-id"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                >
                  Class *
                </label>
                <select
                  id="cfg-class-id"
                  required
                  value={editingClassId}
                  onChange={(e) => setEditingClassId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="cfg-effective-month"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                >
                  Effective Month (YYYY-MM) *
                </label>
                <input
                  id="cfg-effective-month"
                  type="month"
                  required
                  value={effectiveMonth}
                  onChange={(e) => setEffectiveMonth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="cfg-amount"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                >
                  Monthly Amount (₹) *
                </label>
                <input
                  id="cfg-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 1500.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="cfg-status"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                >
                  Status
                </label>
                <select
                  id="cfg-status"
                  value={configStatus}
                  onChange={(e) => setConfigStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
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
                  disabled={savingConfig}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: savingConfig ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
