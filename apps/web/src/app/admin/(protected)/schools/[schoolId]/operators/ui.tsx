'use client';

import { FormEvent, useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { SchoolNav } from '@/components/school-nav';
import { SchoolHeader } from '@/components/school-header';
import { PasswordInput } from '@/components/password-input';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'OP';
}

function getAvatarBg(name: string) {
  const colors = [
    'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
    'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
    'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
    'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % colors.length;
  return colors[hash];
}

export default function OperatorsUi({ schoolId }: { schoolId: string }) {
  const [school, setSchool] = useState<any>();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [ops, setOps] = useState<any[]>([]);
  const [err, setErr] = useState('');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Add operator modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingOp, setCreatingOp] = useState(false);
  const [createOpErr, setCreateOpErr] = useState('');
  const [createOpSuccess, setCreateOpSuccess] = useState('');

  // Edit operator modal state
  const [operatorToEdit, setOperatorToEdit] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState('');

  // Delete modal state
  const [operatorToDelete, setOperatorToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  // Reset password modal state
  const [operatorToReset, setOperatorToReset] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetErr, setResetErr] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Action menu dropdown state & dynamic positioning
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    openUpward: boolean;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<{ [id: string]: HTMLButtonElement | null }>({});

  const load = async () => {
    try {
      const [s, oList] = await Promise.all([
        api(`/platform/schools/${schoolId}`),
        api<any[]>(`/platform/schools/${schoolId}/operators`),
      ]);
      setSchool(s);
      setOps(oList);

      if (s?.logoFileId) {
        api<{ url: string }>(`/platform/schools/${schoolId}/logo`)
          .then((res) => {
            if (res?.url) setLogoUrl(res.url);
          })
          .catch(() => {
            setLogoUrl(
              `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'}/platform/schools/${schoolId}/logo/view?t=${Date.now()}`
            );
          });
      }
    } catch (e: any) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
  }, [schoolId]);

  // Dynamic popover positioning calculation
  useEffect(() => {
    if (!openMenuId) {
      setMenuPosition(null);
      return;
    }

    const computePosition = () => {
      const trigger = triggerRefs.current[openMenuId];
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuEl = menuRef.current;
      const menuWidth = menuEl?.offsetWidth || 170;
      const menuHeight = menuEl?.offsetHeight || 175;

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Intelligently choose upward if space below is insufficient and there is more space above
      const openUpward = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;

      // Align right edge of menu with right edge of button
      let left = rect.right - menuWidth;
      // Clamp horizontally so it stays within viewport boundaries on mobile/tablet
      if (left < 8) left = 8;
      if (left + menuWidth > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - menuWidth - 8);
      }

      if (openUpward) {
        setMenuPosition({
          bottom: viewportHeight - rect.top + 4,
          left,
          openUpward: true,
        });
      } else {
        setMenuPosition({
          top: rect.bottom + 4,
          left,
          openUpward: false,
        });
      }
    };

    computePosition();

    // Recompute on window resize or scroll in any scrollable container
    const handleReposition = () => computePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (openMenuId && triggerRefs.current[openMenuId]?.contains(target)) return;
      setOpenMenuId(null);
      setMenuPosition(null);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  // Filtered operators
  const filteredOps = useMemo(() => {
    return ops.filter((o) => {
      const matchesSearch =
        !searchQuery.trim() ||
        o.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ops, searchQuery, statusFilter]);

  // Paginated operators
  const totalCount = filteredOps.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedOps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOps.slice(start, start + pageSize);
  }, [filteredOps, currentPage, pageSize]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateOpErr('');
    setCreateOpSuccess('');
    setCreatingOp(true);

    const form = e.currentTarget;
    const f = new FormData(form);

    try {
      await api(`/platform/schools/${schoolId}/operators`, {
        method: 'POST',
        body: JSON.stringify({
          email: f.get('email'),
          fullName: f.get('fullName'),
          password: f.get('password'),
        }),
      });
      setShowAddModal(false);
      form.reset();
      await load();
    } catch (e: any) {
      setCreateOpErr(e.message || 'Failed to create operator');
    } finally {
      setCreatingOp(false);
    }
  }

  function startEdit(o: any) {
    setOperatorToEdit(o);
    setEditFullName(o.fullName);
    setEditEmail(o.email);
    setEditErr('');
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!operatorToEdit) return;
    setEditErr('');
    setEditSaving(true);
    try {
      await api(`/platform/schools/${schoolId}/operators/${operatorToEdit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editFullName.trim(),
          email: editEmail.trim(),
        }),
      });
      setOperatorToEdit(null);
      await load();
    } catch (e: any) {
      setEditErr(e.message || 'Failed to update operator');
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleStatus(o: any) {
    try {
      await api(`/platform/schools/${schoolId}/operators/${o.id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: o.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        }),
      });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  function startReset(o: any) {
    setOperatorToReset(o);
    setNewPassword('');
    setConfirmPassword('');
    setResetErr('');
    setResetSuccess('');
  }

  async function handleConfirmReset(e: FormEvent) {
    e.preventDefault();
    if (!operatorToReset) return;

    if (newPassword.length < 12) {
      setResetErr('Password must be at least 12 characters long');
      return;
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setResetErr('Password must include uppercase, lowercase, and numeric characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetErr('Passwords do not match');
      return;
    }

    setResetErr('');
    setResetSaving(true);
    try {
      await api(`/platform/schools/${schoolId}/operators/${operatorToReset.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword, newPassword }),
      });
      setResetSuccess('Password reset successfully and active sessions revoked.');
      setTimeout(() => {
        setOperatorToReset(null);
        setResetSuccess('');
      }, 1500);
    } catch (e: any) {
      setResetErr(e.message || 'Failed to reset password');
    } finally {
      setResetSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!operatorToDelete) return;
    setDeleting(true);
    setDeleteErr('');
    try {
      await api(`/platform/schools/${schoolId}/operators/${operatorToDelete.id}`, {
        method: 'DELETE',
      });
      setOperatorToDelete(null);
      await load();
    } catch (e: any) {
      setDeleteErr(e.message || 'Failed to delete operator');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      {/* Reusable School Header */}
      <SchoolHeader
        school={school}
        schoolId={schoolId}
        logoUrl={logoUrl}
        onStatusChange={() => load()}
      />

      {/* Reusable School Tabs */}
      <SchoolNav schoolId={schoolId} />

      {/* Main Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        }}
      >
        {/* Title & Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                School Operators
              </h2>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Manage users who can access this school.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setCreateOpErr('');
              setShowAddModal(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Operator</span>
          </button>
        </div>

        {/* Filter / Search Bar matching reference 4 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 20,
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 420 }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                display: 'inline-flex',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name or email..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                background: '#ffffff',
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: 150 }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 500,
                color: '#334155',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Global Error Banner */}
        {err && (
          <div
            role="alert"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#991b1b',
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 20,
            }}
          >
            {err}
          </div>
        )}

        {/* Operators Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                  Name
                </th>
                <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                  Email
                </th>
                <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b', width: 140 }}>
                  Status
                </th>
                <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'right', width: 90 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOps.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No operators found</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      {searchQuery || statusFilter
                        ? 'No school operators match the selected search or filter.'
                        : 'No operators have been added to this school yet.'}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOps.map((o) => {
                  const isActive = o.status === 'ACTIVE';
                  const initials = getInitials(o.fullName);
                  const avatarBg = getAvatarBg(o.fullName);

                  return (
                    <tr
                      key={o.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      {/* Name with initials Avatar */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: avatarBg,
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                              letterSpacing: '0.5px',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                            {o.fullName}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 18px', fontSize: 13, color: '#475569' }}>
                        {o.email}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 9999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: isActive ? '#ecfdf5' : '#f1f5f9',
                            color: isActive ? '#047857' : '#475569',
                            border: `1px solid ${isActive ? '#a7f3d0' : '#cbd5e1'}`,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: isActive ? '#10b981' : '#94a3b8',
                            }}
                          />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Action Menu ⋮ */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          ref={(el) => {
                            triggerRefs.current[o.id] = el;
                          }}
                          type="button"
                          onClick={() => {
                            if (openMenuId === o.id) {
                              setOpenMenuId(null);
                              setMenuPosition(null);
                            } else {
                              const trigger = triggerRefs.current[o.id];
                              if (trigger) {
                                const rect = trigger.getBoundingClientRect();
                                const viewportHeight = window.innerHeight;
                                const viewportWidth = window.innerWidth;
                                const menuWidth = 170;
                                const menuHeight = 175;

                                const spaceBelow = viewportHeight - rect.bottom;
                                const spaceAbove = rect.top;
                                const openUpward = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;

                                let left = rect.right - menuWidth;
                                if (left < 8) left = 8;
                                if (left + menuWidth > viewportWidth - 8) {
                                  left = Math.max(8, viewportWidth - menuWidth - 8);
                                }

                                setMenuPosition(
                                  openUpward
                                    ? { bottom: viewportHeight - rect.top + 4, left, openUpward: true }
                                    : { top: rect.bottom + 4, left, openUpward: false }
                                );
                              }
                              setOpenMenuId(o.id);
                            }
                          }}
                          aria-label="Operator options"
                          aria-expanded={openMenuId === o.id}
                          aria-haspopup="true"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: openMenuId === o.id ? '1px solid #94a3b8' : '1px solid #cbd5e1',
                            background: openMenuId === o.id ? '#f1f5f9' : '#ffffff',
                            color: '#475569',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease, border-color 0.15s ease',
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Counter and Pagination */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 18,
            fontSize: 13,
            color: '#64748b',
          }}
        >
          <div>
            Showing {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} operators
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage <= 1 ? 0.5 : 1,
              }}
            >
              ‹
            </button>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {currentPage}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage >= totalPages ? 0.5 : 1,
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Add Operator                                       */}
      {/* ========================================================= */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-operator-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 id="add-operator-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Add School Operator
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {createOpErr && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠ {createOpErr}
              </div>
            )}

            <form onSubmit={add}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="field">
                  <label htmlFor="operator-name-input">Full Name *</label>
                  <input
                    id="operator-name-input"
                    name="fullName"
                    required
                    placeholder="e.g. Rahul Kumar"
                  />
                </div>

                <div className="field">
                  <label htmlFor="operator-email-input">Email Address *</label>
                  <input
                    id="operator-email-input"
                    name="email"
                    type="email"
                    required
                    placeholder="e.g. rahul@school.edu"
                  />
                </div>

                <div className="field">
                  <label htmlFor="operator-password-input">Temporary Password *</label>
                  <PasswordInput
                    id="operator-password-input"
                    name="password"
                    required
                    placeholder="At least 12 chars (Upper, Lower, Digit)"
                  />
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingOp}
                >
                  {creatingOp ? 'Creating…' : 'Create Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Edit Operator                                      */}
      {/* ========================================================= */}
      {operatorToEdit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-operator-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOperatorToEdit(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 id="edit-operator-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Edit Operator Details
              </h3>
              <button
                type="button"
                onClick={() => setOperatorToEdit(null)}
                aria-label="Close dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {editErr && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠ {editErr}
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="field">
                  <label htmlFor="edit-name-input">Full Name *</label>
                  <input
                    id="edit-name-input"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="edit-email-input">Email Address *</label>
                  <input
                    id="edit-email-input"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOperatorToEdit(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSaving}
                >
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Reset Password                                     */}
      {/* ========================================================= */}
      {operatorToReset && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOperatorToReset(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 id="reset-password-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Reset Operator Password
              </h3>
              <button
                type="button"
                onClick={() => setOperatorToReset(null)}
                aria-label="Close dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>
              Resetting password for <strong>{operatorToReset.fullName}</strong> ({operatorToReset.email}). Any existing active sessions for this operator will be revoked.
            </p>

            {resetErr && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠ {resetErr}
              </div>
            )}
            {resetSuccess && (
              <div style={{ color: '#047857', background: '#ecfdf5', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ✓ {resetSuccess}
              </div>
            )}

            <form onSubmit={handleConfirmReset}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="field">
                  <label htmlFor="reset-new-password">New Password *</label>
                  <PasswordInput
                    id="reset-new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 12 chars (Upper, Lower, Digit)"
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="reset-confirm-password">Confirm Password *</label>
                  <PasswordInput
                    id="reset-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOperatorToReset(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetSaving}
                >
                  {resetSaving ? 'Resetting…' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Delete Operator Confirmation                       */}
      {/* ========================================================= */}
      {operatorToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-operator-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOperatorToDelete(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 440,
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 id="delete-operator-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Delete Operator
              </h3>
            </div>

            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.5, margin: '0 0 18px 0' }}>
              Are you sure you want to permanently delete operator <strong>{operatorToDelete.fullName}</strong>? Their access to this school will be permanently revoked.
            </p>

            {deleteErr && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠ {deleteErr}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOperatorToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? 'Deleting…' : 'Delete Operator'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Popover Action Menu */}
      {openMenuId && menuPosition && typeof document !== 'undefined' && createPortal(
        (() => {
          const o = ops.find((item) => item.id === openMenuId);
          if (!o) return null;
          const isActive = o.status === 'ACTIVE';

          return (
            <div
              ref={menuRef}
              role="menu"
              aria-label="Operator action menu"
              style={{
                position: 'fixed',
                top: menuPosition.top !== undefined ? menuPosition.top : 'auto',
                bottom: menuPosition.bottom !== undefined ? menuPosition.bottom : 'auto',
                left: menuPosition.left,
                width: 170,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 9999,
                padding: '4px 0',
                textAlign: 'left',
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenuId(null);
                  setMenuPosition(null);
                  startEdit(o);
                }}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Edit Details
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenuId(null);
                  setMenuPosition(null);
                  toggleStatus(o);
                }}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  color: isActive ? '#b45309' : '#059669',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {isActive ? 'Deactivate' : 'Activate'}
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenuId(null);
                  setMenuPosition(null);
                  startReset(o);
                }}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  color: '#2563eb',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Reset Password
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenuId(null);
                  setMenuPosition(null);
                  setOperatorToDelete(o);
                  setDeleteErr('');
                }}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  color: '#dc2626',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Delete Operator
              </button>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
