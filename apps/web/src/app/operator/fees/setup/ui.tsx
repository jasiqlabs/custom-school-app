'use client';

import { useState, useEffect } from 'react';
import { FeesNav } from '@/features/fees/components/fees-nav';
import { feesApi, FeeClassSummary } from '@/features/fees/api/fees-api-client';
import type { ClassFeeConfigDto, GenerateDuesResultDto } from '@custom-school/contracts';

type SetupTab = 'monthly' | 'categories' | 'rules';

export function FeesSetupUi() {
  const [activeTab, setActiveTab] = useState<SetupTab>('monthly');
  const [classes, setClasses] = useState<FeeClassSummary[]>([]);
  const [configs, setConfigs] = useState<ClassFeeConfigDto[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [transports, setTransports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Config modal state (Legacy Monthly)
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

  // Category modal state (TASK-012)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [catCode, setCatCode] = useState('');
  const [catDisplayName, setCatDisplayName] = useState('');
  const [catChargeKind, setCatChargeKind] = useState('RECURRING');
  const [catDescription, setCatDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Rule modal state (TASK-012)
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleCatId, setRuleCatId] = useState('');
  const [ruleClassId, setRuleClassId] = useState('');
  const [ruleSessionId, setRuleSessionId] = useState('');
  const [ruleTransportId, setRuleTransportId] = useState('');
  const [ruleAmount, setRuleAmount] = useState('');
  const [ruleEffectiveFrom, setRuleEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [ruleValidUntil, setRuleValidUntil] = useState('');
  const [ruleRecurrence, setRuleRecurrence] = useState('MONTHLY');
  const [ruleDueOffset, setRuleDueOffset] = useState('10');
  const [savingRule, setSavingRule] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [clsList, cfgList, catList, rList, sList, tList] = await Promise.all([
        feesApi.getClasses(),
        feesApi.listConfigs(),
        feesApi.listCategories().catch(() => []),
        feesApi.listRules().catch(() => []),
        feesApi.getAcademicSessions().catch(() => []),
        feesApi.getTransports().catch(() => []),
      ]);
      setClasses(Array.isArray(clsList) ? clsList : (clsList as any)?.items || []);
      setConfigs(Array.isArray(cfgList) ? cfgList : (cfgList as any)?.items || []);
      setCategories(Array.isArray(catList) ? catList : (catList as any)?.items || []);
      setRules(Array.isArray(rList) ? rList : (rList as any)?.items || []);
      setSessions(Array.isArray(sList) ? sList : (sList as any)?.items || []);
      setTransports(Array.isArray(tList) ? tList : (tList as any)?.items || []);
      if (clsList.length > 0 && !editingClassId) {
        setEditingClassId(clsList[0].id);
      }
      if (catList.length > 0 && !ruleCatId) {
        setRuleCatId(catList[0].id);
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
      const result = await feesApi.generateDues({
        feeMonth: genMonth,
        classId: genClassId || undefined,
      });
      setGenResult(result);
    } catch (err: any) {
      setGenError(err.message || 'Failed to generate dues');
    } finally {
      setGenerating(false);
    }
  }

  // Handle Category Creation
  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setSavingCategory(true);
    setCategoryError(null);
    try {
      await feesApi.createCategory({
        code: catCode.trim().toUpperCase(),
        displayName: catDisplayName.trim(),
        chargeKind: catChargeKind,
        description: catDescription.trim() || undefined,
      });
      setCategoryModalOpen(false);
      setCatCode('');
      setCatDisplayName('');
      setCatDescription('');
      setConfigSuccess('Fee category created successfully');
      await loadData();
    } catch (err: any) {
      setCategoryError(err.message || 'Failed to create fee category');
    } finally {
      setSavingCategory(false);
    }
  }

  // Toggle Category Status
  async function handleToggleCategory(cat: any) {
    const nextStatus = cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await feesApi.updateCategory(cat.id, {
        status: nextStatus,
        version: cat.version,
      });
      setConfigSuccess(`Fee category ${cat.code} status updated to ${nextStatus}`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update fee category');
    }
  }

  // Handle Rule Creation
  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setSavingRule(true);
    setRuleError(null);
    const numAmount = parseFloat(ruleAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      setRuleError('Amount must be greater than or equal to zero');
      setSavingRule(false);
      return;
    }

    try {
      await feesApi.createRule({
        categoryId: ruleCatId,
        classId: ruleClassId || undefined,
        academicSessionId: ruleSessionId || undefined,
        transportId: ruleTransportId || undefined,
        amount: numAmount,
        effectiveFrom: ruleEffectiveFrom,
        validUntil: ruleValidUntil || undefined,
        recurrencePolicy: ruleRecurrence,
        paymentDueOffset: ruleDueOffset ? parseInt(ruleDueOffset, 10) : undefined,
      });
      setRuleModalOpen(false);
      setRuleAmount('');
      setRuleClassId('');
      setRuleSessionId('');
      setRuleTransportId('');
      setRuleValidUntil('');
      setConfigSuccess('Billing rule created successfully');
      await loadData();
    } catch (err: any) {
      setRuleError(err.message || 'Failed to create billing rule');
    } finally {
      setSavingRule(false);
    }
  }

  // Toggle Rule Status
  async function handleToggleRule(r: any) {
    const nextStatus = r.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await feesApi.updateRule(r.id, {
        status: nextStatus,
        version: r.version,
      });
      setConfigSuccess(`Billing rule status updated to ${nextStatus}`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update billing rule');
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 40px' }}>
      <FeesNav />

      {/* Page Title & Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#0f172a' }}>
          Fee Setup & Billing Rules
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b' }}>
          Define fee categories, rate schedules, billing rules, and generate student monthly dues.
        </p>
      </div>

      {/* Tab Switcher */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 10,
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('monthly')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'monthly' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'monthly' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          Monthly Tuition ({configs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'categories' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'categories' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          Fee Categories ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'rules' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'rules' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          Billing Rules ({rules.length})
        </button>
      </div>

      {/* Alerts */}
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

      {/* ================================================================= */}
      {/* TAB 1: MONTHLY TUITION (LEGACY COMPATIBILITY)                     */}
      {/* ================================================================= */}
      {activeTab === 'monthly' && (
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
                Configure Rate
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                Loading configurations...
              </div>
            ) : configs.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                <p style={{ fontSize: 15, margin: 0 }}>No class fee rates configured yet.</p>
                <p style={{ fontSize: 13, margin: '8px 0 0 0' }}>
                  Add a rate to enable automatic due generation for students.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Class</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Effective Month</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map((cfg) => (
                      <tr key={cfg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                          {cfg.className || 'Unknown'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>{cfg.effectiveMonth}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                          ₹{Number(cfg.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: cfg.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                              color: cfg.status === 'ACTIVE' ? '#15803d' : '#64748b',
                            }}
                          >
                            {cfg.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => openAddModal(cfg.classId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 600,
                              padding: 0,
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

          {/* Right Column: Generate Dues Panel */}
          <div className="fee-card">
            <div className="fee-card-header">
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Generate Monthly Dues
              </h2>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
              Batch create student fee dues for an academic month based on active rates.
            </p>

            <form onSubmit={handleGenerateDues}>
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="gen-month"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}
                >
                  Billing Month (YYYY-MM) *
                </label>
                <input
                  id="gen-month"
                  type="month"
                  required
                  value={genMonth}
                  onChange={(e) => setGenMonth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="gen-class"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}
                >
                  Class Filter (Optional)
                </label>
                <select
                  id="gen-class"
                  value={genClassId}
                  onChange={(e) => setGenClassId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
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

              {genError && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    color: '#b91c1c',
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {genError}
                </div>
              )}

              <button
                type="submit"
                id="btn-run-generate-dues"
                disabled={generating}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {generating ? 'Generating Dues...' : 'Run Due Generation'}
              </button>
            </form>

            {/* Generation Results */}
            {genResult && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px 0', color: '#0f172a' }}>
                  Execution Summary ({genResult.feeMonth})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Eligible Students: </span>
                    <strong style={{ color: '#0f172a' }}>{genResult.totalEligibleStudents}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Created Dues: </span>
                    <strong style={{ color: '#059669' }}>{genResult.createdCount}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Already Existed: </span>
                    <strong style={{ color: '#0f172a' }}>{genResult.existingCount}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Skipped: </span>
                    <strong style={{ color: genResult.skippedCount > 0 ? '#d97706' : '#0f172a' }}>
                      {genResult.skippedCount}
                    </strong>
                  </div>
                </div>

                {genResult.skippedReasons?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>
                      Skipped Students Details:
                    </span>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 12, color: '#64748b' }}>
                      {genResult.skippedReasons.slice(0, 5).map((s, idx) => (
                        <li key={idx}>
                          {s.studentName} ({s.studentCode}): {s.reason}
                        </li>
                      ))}
                      {genResult.skippedReasons.length > 5 && (
                        <li>...and {genResult.skippedReasons.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: FEE CATEGORIES (TASK-012)                                  */}
      {/* ================================================================= */}
      {activeTab === 'categories' && (
        <div className="fee-card" style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Fee Categories
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                Classify charges into Tuition, Admission, Exam, Transport, Registration, or custom categories.
              </p>
            </div>
            <button
              type="button"
              id="btn-add-fee-category"
              onClick={() => {
                setCatCode('');
                setCatDisplayName('');
                setCatDescription('');
                setCategoryError(null);
                setCategoryModalOpen(true);
              }}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              + Add Fee Category
            </button>
          </div>

          {categories.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <p style={{ fontSize: 15, margin: 0 }}>No fee categories created yet.</p>
              <p style={{ fontSize: 13, margin: '8px 0 0 0' }}>
                Click "+ Add Fee Category" above to define your school's billing categories.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Code</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Display Name</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Charge Kind</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                        <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                          {cat.code}
                        </code>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {cat.displayName}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            background:
                              cat.chargeKind === 'ONE_TIME'
                                ? '#fef3c7'
                                : cat.chargeKind === 'RECURRING'
                                ? '#dbeafe'
                                : '#f3e8ff',
                            color:
                              cat.chargeKind === 'ONE_TIME'
                                ? '#92400e'
                                : cat.chargeKind === 'RECURRING'
                                ? '#1e40af'
                                : '#6b21a8',
                          }}
                        >
                          {cat.chargeKind}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>
                        {cat.description || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor: cat.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                            color: cat.status === 'ACTIVE' ? '#15803d' : '#64748b',
                          }}
                        >
                          {cat.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: cat.status === 'ACTIVE' ? '#dc2626' : '#059669',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            padding: 0,
                          }}
                        >
                          {cat.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: BILLING RULES (TASK-012)                                   */}
      {/* ================================================================= */}
      {activeTab === 'rules' && (
        <div>
          {/* Precedence Notice Card */}
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#1e40af',
              fontSize: 13,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <div>
              <strong>Resolution Hierarchy:</strong> Specific rules take precedence over general defaults.
              Order: <em>Class + Academic Session</em> &gt; <em>Class-only</em> &gt; <em>Academic Session-only</em> &gt; <em>School-wide default</em>.
            </div>
          </div>

          <div className="fee-card" style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Effective Billing Rules
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                  Rules dictate how much is charged, for which class/session, and the recurrence policy.
                </p>
              </div>
              <button
                type="button"
                id="btn-add-billing-rule"
                onClick={() => {
                  setRuleAmount('');
                  setRuleClassId('');
                  setRuleSessionId('');
                  setRuleValidUntil('');
                  setRuleError(null);
                  if (categories.length > 0 && !ruleCatId) {
                    setRuleCatId(categories[0].id);
                  }
                  setRuleModalOpen(true);
                }}
                disabled={categories.length === 0}
                style={{
                  backgroundColor: categories.length === 0 ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: categories.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                + Add Billing Rule
              </button>
            </div>

            {rules.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                <p style={{ fontSize: 15, margin: 0 }}>No billing rules created yet.</p>
                <p style={{ fontSize: 13, margin: '8px 0 0 0' }}>
                  {categories.length === 0
                    ? 'Create at least one fee category first, then define billing rules.'
                    : 'Click "+ Add Billing Rule" to create your first rate rule.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Category</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Target Scope</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Recurrence</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Effective Window</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.categoryName || r.categoryCode}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{r.categoryCode}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {r.className ? `Class: ${r.className}` : 'All Classes (School-wide)'}
                          </div>
                          {(r.transportRouteName || r.transportRouteCode) && (
                            <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>
                              Route: {r.transportRouteCode ? `${r.transportRouteCode} - ` : ''}{r.transportRouteName}
                            </div>
                          )}
                          {r.sessionCode && (
                            <div style={{ fontSize: 12, color: '#2563eb' }}>
                              Session: {r.sessionLabel || r.sessionCode}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                            {r.recurrencePolicy}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                          ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                          <div>From: {r.effectiveFrom}</div>
                          <div>Until: {r.validUntil || 'Indefinite'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: r.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                              color: r.status === 'ACTIVE' ? '#15803d' : '#64748b',
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleRule(r)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: r.status === 'ACTIVE' ? '#dc2626' : '#059669',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 600,
                              padding: 0,
                            }}
                          >
                            {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD / UPDATE CLASS MONTHLY FEE                             */}
      {/* ================================================================= */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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

      {/* ================================================================= */}
      {/* MODAL: ADD FEE CATEGORY (TASK-012)                                */}
      {/* ================================================================= */}
      {categoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
              Create Fee Category
            </h3>
            <form onSubmit={handleCreateCategory}>
              {categoryError && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    color: '#b91c1c',
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  {categoryError}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="cat-code"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                >
                  Category Code *
                </label>
                <input
                  id="cat-code"
                  required
                  placeholder="e.g. TUITION, REGISTRATION, EXAM"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    textTransform: 'uppercase',
                  }}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>Unique alphanumeric code for this category.</span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="cat-name"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                >
                  Display Name *
                </label>
                <input
                  id="cat-name"
                  required
                  placeholder="e.g. Monthly Tuition Fee"
                  value={catDisplayName}
                  onChange={(e) => setCatDisplayName(e.target.value)}
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
                  htmlFor="cat-kind"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                >
                  Charge Kind
                </label>
                <select
                  id="cat-kind"
                  value={catChargeKind}
                  onChange={(e) => setCatChargeKind(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="RECURRING">RECURRING (Monthly/Quarterly/Annual recurring)</option>
                  <option value="ONE_TIME">ONE_TIME (Registration/Admission fee)</option>
                  <option value="EVENT">EVENT (Exam/Annual Day/Event fee)</option>
                  <option value="MANUAL">MANUAL (Ad-hoc or customized fine)</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="cat-desc"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                >
                  Description (Optional)
                </label>
                <textarea
                  id="cat-desc"
                  rows={2}
                  placeholder="Optional details or instructions..."
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
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
                  disabled={savingCategory}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: savingCategory ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingCategory ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD BILLING RULE (TASK-012)                                */}
      {/* ================================================================= */}
      {ruleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
              maxWidth: 480,
              boxSizing: 'border-box',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
              Create Effective Billing Rule
            </h3>
            <form onSubmit={handleCreateRule}>
              {ruleError && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    color: '#b91c1c',
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  {ruleError}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="rule-cat"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                >
                  Fee Category *
                </label>
                <select
                  id="rule-cat"
                  required
                  value={ruleCatId}
                  onChange={(e) => setRuleCatId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label
                    htmlFor="rule-class"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                  >
                    Target Class (Optional)
                  </label>
                  <select
                    id="rule-class"
                    value={ruleClassId}
                    onChange={(e) => setRuleClassId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">All Classes (Default)</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rule-session"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                  >
                    Academic Session
                  </label>
                  <select
                    id="rule-session"
                    value={ruleSessionId}
                    onChange={(e) => setRuleSessionId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">All Sessions</option>
                    {(Array.isArray(sessions) ? sessions : []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label || s.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="rule-transport"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                >
                  Transport Route (Optional)
                </label>
                <select
                  id="rule-transport"
                  value={ruleTransportId}
                  onChange={(e) => setRuleTransportId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">All Routes / General (Default)</option>
                  {(Array.isArray(transports) ? transports : []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.routeCode ? `${t.routeCode} - ${t.routeName || t.name}` : t.routeName || t.name}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Select a route if this rate rule applies specifically to that route.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label
                    htmlFor="rule-amount"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                  >
                    Amount (₹) *
                  </label>
                  <input
                    id="rule-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 900.00"
                    value={ruleAmount}
                    onChange={(e) => setRuleAmount(e.target.value)}
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

                <div>
                  <label
                    htmlFor="rule-recurrence"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                  >
                    Recurrence Policy *
                  </label>
                  <select
                    id="rule-recurrence"
                    value={ruleRecurrence}
                    onChange={(e) => setRuleRecurrence(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                    <option value="TERM">TERM</option>
                    <option value="ONE_TIME">ONE_TIME</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label
                    htmlFor="rule-effective-from"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                  >
                    Effective From *
                  </label>
                  <input
                    id="rule-effective-from"
                    type="date"
                    required
                    value={ruleEffectiveFrom}
                    onChange={(e) => setRuleEffectiveFrom(e.target.value)}
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

                <div>
                  <label
                    htmlFor="rule-valid-until"
                    style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
                  >
                    Valid Until (Optional)
                  </label>
                  <input
                    id="rule-valid-until"
                    type="date"
                    value={ruleValidUntil}
                    onChange={(e) => setRuleValidUntil(e.target.value)}
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRuleModalOpen(false)}
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
                  disabled={savingRule}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: savingRule ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingRule ? 'Saving Rule...' : 'Save Billing Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
