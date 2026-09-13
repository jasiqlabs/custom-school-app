'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SchoolNav } from '@/components/school-nav';

export default function OperatorsUi({ schoolId }: { schoolId: string }) {
  const [ops, setOps] = useState<any[]>([]);
  const [err, setErr] = useState('');

  // Create operator state
  const [creatingOp, setCreatingOp] = useState(false);
  const [createOpErr, setCreateOpErr] = useState('');
  const [createOpSuccess, setCreateOpSuccess] = useState('');

  // Inline edit operator state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState('');
  const [editSuccessId, setEditSuccessId] = useState<string | null>(null);

  // In-page delete confirmation modal state
  const [operatorToDelete, setOperatorToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  // In-page Reset Password modal state
  const [operatorToReset, setOperatorToReset] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetErr, setResetErr] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const load = () =>
    api<any[]>(`/platform/schools/${schoolId}/operators`)
      .then(setOps)
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, [schoolId]);

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
      form.reset();
      setCreateOpSuccess('✓ Operator created successfully');
      setTimeout(() => setCreateOpSuccess(''), 4000);
      await load();
    } catch (e: any) {
      setCreateOpErr(e.message || 'Failed to create operator');
    } finally {
      setCreatingOp(false);
    }
  }

  function startEdit(o: any) {
    setEditingId(o.id);
    setEditFullName(o.fullName);
    setEditEmail(o.email);
    setEditErr('');
  }

  async function handleSaveEdit(operatorId: string) {
    setEditErr('');
    setEditSaving(true);
    try {
      await api(`/platform/schools/${schoolId}/operators/${operatorId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editFullName.trim(),
          email: editEmail.trim(),
        }),
      });
      setEditingId(null);
      setEditSuccessId(operatorId);
      setTimeout(() => setEditSuccessId(null), 4000);
      await load();
    } catch (e: any) {
      setEditErr(e.message || 'Failed to update operator');
    } finally {
      setEditSaving(false);
    }
  }

  async function status(o: any) {
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

  function requestReset(o: any) {
    setOperatorToReset(o);
    setNewPassword('');
    setConfirmPassword('');
    setResetErr('');
    setShowPassword(false);
  }

  async function handleConfirmReset(e?: FormEvent) {
    if (e) e.preventDefault();
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
      await api(
        `/platform/schools/${schoolId}/operators/${operatorToReset.id}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({ password: newPassword }),
        }
      );
      const opName = operatorToReset.fullName;
      setOperatorToReset(null);
      setNewPassword('');
      setConfirmPassword('');
      setResetSuccess(
        `✓ Password for operator "${opName}" was successfully reset. All active sessions have been revoked.`
      );
      setTimeout(() => setResetSuccess(''), 6000);
      await load();
    } catch (e: any) {
      setResetErr(e.message || 'Failed to reset password');
    } finally {
      setResetSaving(false);
    }
  }

  function requestDelete(o: any) {
    if (ops.length <= 1) {
      setDeleteErr('Cannot delete the last remaining operator. A school must have at least one operator.');
      return;
    }
    setDeleteErr('');
    setOperatorToDelete(o);
  }

  async function confirmDelete() {
    if (!operatorToDelete) return;
    setDeleting(true);
    setDeleteErr('');
    try {
      await api(`/platform/schools/${schoolId}/operators/${operatorToDelete.id}`, {
        method: 'DELETE',
      });
      const name = operatorToDelete.fullName;
      setOperatorToDelete(null);
      setDeleteSuccess(`✓ Operator "${name}" was successfully deleted`);
      setTimeout(() => setDeleteSuccess(''), 5000);
      await load();
    } catch (e: any) {
      setDeleteErr(e.message || 'Failed to delete operator');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container">
      <SchoolNav schoolId={schoolId} />
      <h1>School Operators</h1>
      <p className="muted">
        Operator provisioning is allowed only when the school is ACTIVE. Password reset revokes every operator session.
      </p>

      {/* Page-level error for general load failures */}
      {err && (
        <p className="error" role="alert" style={{ marginBottom: 16 }}>
          {err}
        </p>
      )}

      {/* Add Operator Form */}
      <form className="card grid" onSubmit={add} style={{ gap: 16, marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Add Operator</h2>
        <div className="grid grid-3">
          <div className="field">
            <label>Full name</label>
            <input
              name="fullName"
              required
              placeholder="e.g. Rahul Kumar"
              onChange={() => {
                if (createOpErr) setCreateOpErr('');
                if (createOpSuccess) setCreateOpSuccess('');
              }}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="operator@school.com"
              onChange={() => {
                if (createOpErr) setCreateOpErr('');
                if (createOpSuccess) setCreateOpSuccess('');
              }}
            />
          </div>
          <div className="field">
            <label>Initial password</label>
            <input
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
              placeholder="Min 12 characters"
              onChange={() => {
                if (createOpErr) setCreateOpErr('');
                if (createOpSuccess) setCreateOpSuccess('');
              }}
            />
            <small className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              Min 12 chars: uppercase, lowercase, number
            </small>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creatingOp}
            style={{ minWidth: 140 }}
          >
            {creatingOp ? 'Creating...' : 'Create Operator'}
          </button>
        </div>

        {/* Direct In-Place Error for Create Operator */}
        {createOpErr && (
          <div
            className="card error"
            role="alert"
            style={{
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #fca5a5',
              background: '#fef2f2',
              color: '#b91c1c',
            }}
          >
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span>{createOpErr}</span>
          </div>
        )}

        {/* Direct In-Place Success for Create Operator */}
        {createOpSuccess && (
          <div
            role="status"
            style={{
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{createOpSuccess}</span>
          </div>
        )}
      </form>

      {/* Operators List Table Card */}
      <div className="card">
        {/* In-Place Success Notice for Delete */}
        {deleteSuccess && (
          <div
            role="status"
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{deleteSuccess}</span>
          </div>
        )}

        {/* In-Place Success Notice for Reset Password */}
        {resetSuccess && (
          <div
            role="status"
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{resetSuccess}</span>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ops.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--muted)' }}>
                  No operators provisioned for this school yet.
                </td>
              </tr>
            ) : (
              ops.map((o) => {
                const isEditing = editingId === o.id;

                return (
                  <tr key={o.id}>
                    {/* Operator Name */}
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => {
                            setEditFullName(e.target.value);
                            if (editErr) setEditErr('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(o.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          required
                          placeholder="Full name"
                          style={{
                            padding: '6px 10px',
                            fontSize: 13,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: '2px solid #2563eb',
                            width: '100%',
                            maxWidth: 180,
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{o.fullName}</span>
                      )}
                    </td>

                    {/* Operator Email */}
                    <td>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => {
                            setEditEmail(e.target.value);
                            if (editErr) setEditErr('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(o.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          required
                          placeholder="Email address"
                          style={{
                            padding: '6px 10px',
                            fontSize: 13,
                            borderRadius: 6,
                            border: '2px solid #2563eb',
                            width: '100%',
                            maxWidth: 240,
                          }}
                        />
                      ) : (
                        <span>{o.email}</span>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span className="badge">{o.status}</span>
                    </td>

                    {/* Actions */}
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div className="row" style={{ gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              disabled={
                                editSaving ||
                                !editFullName.trim() ||
                                !editEmail.trim()
                              }
                              onClick={() => handleSaveEdit(o.id)}
                            >
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              disabled={editSaving}
                              onClick={() => {
                                setEditingId(null);
                                setEditErr('');
                              }}
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Direct Error for Edit Operator */}
                          {editErr && (
                            <div
                              role="alert"
                              style={{
                                color: '#b91c1c',
                                fontSize: 12,
                                fontWeight: 600,
                                background: '#fef2f2',
                                border: '1px solid #fca5a5',
                                borderRadius: 4,
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span>⚠️</span>
                              <span>{editErr}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 4 }}>
                          <div className="row" style={{ gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              onClick={() => startEdit(o)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              onClick={() => status(o)}
                            >
                              {o.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              onClick={() => requestReset(o)}
                            >
                              Reset Password
                            </button>
                            {ops.length >= 2 && (
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ padding: '5px 12px', fontSize: 12 }}
                                onClick={() => requestDelete(o)}
                              >
                                Delete
                              </button>
                            )}
                          </div>

                          {/* Direct Success Confirmation for Edit Operator */}
                          {editSuccessId === o.id && (
                            <div
                              role="status"
                              style={{
                                color: '#065f46',
                                fontSize: 12,
                                fontWeight: 600,
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                borderRadius: 4,
                                padding: '3px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span>✓ Saved</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* In-Page Reset Password Modal */}
      {operatorToReset && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
            padding: 20,
          }}
          onClick={() => {
            if (!resetSaving) {
              setOperatorToReset(null);
              setResetErr('');
            }
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 480,
              width: '100%',
              background: '#ffffff',
              borderRadius: 14,
              padding: '24px',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                🔑
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  Reset Operator Password
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  {operatorToReset.fullName} ({operatorToReset.email})
                </p>
              </div>
            </div>

            {/* Warning notice */}
            <div
              style={{
                marginBottom: 18,
                padding: '10px 14px',
                borderRadius: 8,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              ⚠️ Resetting the password will <strong>revoke all active sessions</strong> for this operator immediately.
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmReset} style={{ display: 'grid', gap: 14 }}>
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 13 }}>New Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (resetErr) setResetErr('');
                  }}
                  autoFocus
                  required
                  placeholder="Min 12 characters"
                  autoComplete="new-password"
                  style={{
                    padding: '8px 12px',
                    fontSize: 14,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                  }}
                />
                <small className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                  Min 12 characters: uppercase, lowercase, and numbers
                </small>
              </div>

              <div className="field">
                <label style={{ fontSize: 13 }}>Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (resetErr) setResetErr('');
                  }}
                  required
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  style={{
                    padding: '8px 12px',
                    fontSize: 14,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                  }}
                />
              </div>

              {resetErr && (
                <div
                  role="alert"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#b91c1c',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>⚠️</span>
                  <span>{resetErr}</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 6,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={resetSaving}
                  onClick={() => {
                    setOperatorToReset(null);
                    setResetErr('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetSaving || !newPassword || !confirmPassword}
                  style={{ minWidth: 140 }}
                >
                  {resetSaving ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-Page Confirmation Modal for Delete Operator */}
      {operatorToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
            padding: 20,
          }}
          onClick={() => {
            if (!deleting) {
              setOperatorToDelete(null);
              setDeleteErr('');
            }
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 440,
              width: '100%',
              background: '#ffffff',
              borderRadius: 14,
              padding: '24px',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                ⚠️
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  Delete Operator
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  Permanent removal of school operator
                </p>
              </div>
            </div>

            <p
              style={{
                fontSize: 14,
                color: '#334155',
                lineHeight: 1.5,
                margin: '0 0 16px 0',
              }}
            >
              Are you sure you want to delete operator{' '}
              <strong>{operatorToDelete.fullName}</strong> (
              <span style={{ color: '#64748b' }}>{operatorToDelete.email}</span>)?
            </p>

            {deleteErr && (
              <div
                role="alert"
                style={{
                  marginBottom: 16,
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>⚠️</span>
                <span>{deleteErr}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 8,
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deleting}
                onClick={() => {
                  setOperatorToDelete(null);
                  setDeleteErr('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={confirmDelete}
                style={{ minWidth: 100 }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
