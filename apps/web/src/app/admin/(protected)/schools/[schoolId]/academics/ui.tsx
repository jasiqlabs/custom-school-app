'use client';

import { FormEvent, useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { SchoolNav } from '@/components/school-nav';
import { SchoolHeader } from '@/components/school-header';

type EditTarget =
  | { type: 'class'; id: string; field: 'name' | 'sortOrder'; value: string }
  | { type: 'section'; classId: string; id: string; field: 'name' | 'sortOrder'; value: string }
  | null;

export default function AcademicsUi({ schoolId }: { schoolId: string }) {
  const [school, setSchool] = useState<any>();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<EditTarget>(null);
  const [submitting, setSubmitting] = useState(false);

  // Accordion state: Set of expanded class IDs (default: expand the first class)
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(new Set());

  // Add Class Modal state
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [addingClass, setAddingClass] = useState(false);
  const [addClassErr, setAddClassErr] = useState('');
  const [addClassSuccess, setAddClassSuccess] = useState('');

  // Add Section Modal state (target class)
  const [targetClassForSection, setTargetClassForSection] = useState<any | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [addSectionErr, setAddSectionErr] = useState('');
  const [addSectionSuccess, setAddSectionSuccess] = useState('');

  // Dropdown menu state for Class actions
  const [openClassMenuId, setOpenClassMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const [s, cList] = await Promise.all([
        api(`/platform/schools/${schoolId}`),
        api<any[]>(`/platform/schools/${schoolId}/classes`),
      ]);
      setSchool(s);
      setClasses(cList);

      // Auto-expand first class if none expanded yet
      setExpandedClassIds((prev) => {
        if (prev.size === 0 && cList.length > 0) {
          return new Set([cList[0].id]);
        }
        return prev;
      });

      // Fetch logo if present
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

  // Click outside to close class menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenClassMenuId(null);
      }
    }
    if (openClassMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openClassMenuId]);

  function toggleExpandClass(classId: string) {
    setExpandedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  }

  async function addClass(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddClassErr('');
    setAddClassSuccess('');
    setAddingClass(true);

    const form = e.currentTarget;
    const f = new FormData(form);

    try {
      await api(`/platform/schools/${schoolId}/classes`, {
        method: 'POST',
        body: JSON.stringify({
          name: f.get('name'),
          sortOrder: Number(f.get('sortOrder') || 0),
        }),
      });
      setShowAddClassModal(false);
      form.reset();
      await load();
    } catch (e: any) {
      setAddClassErr(e.message || 'Failed to add class');
    } finally {
      setAddingClass(false);
    }
  }

  async function addSection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!targetClassForSection) return;
    setAddSectionErr('');
    setAddSectionSuccess('');
    setAddingSection(true);

    const form = e.currentTarget;
    const f = new FormData(form);

    try {
      await api(`/platform/schools/${schoolId}/classes/${targetClassForSection.id}/sections`, {
        method: 'POST',
        body: JSON.stringify({
          name: f.get('name'),
          sortOrder: Number(f.get('sortOrder') || 0),
        }),
      });
      // Ensure target class is expanded so user sees the new section immediately
      setExpandedClassIds((prev) => new Set([...prev, targetClassForSection.id]));
      setTargetClassForSection(null);
      form.reset();
      await load();
    } catch (e: any) {
      setAddSectionErr(e.message || 'Failed to add section');
    } finally {
      setAddingSection(false);
    }
  }

  async function patch(kind: 'class' | 'section', ids: string[], data: any) {
    const path =
      kind === 'class'
        ? `/platform/schools/${schoolId}/classes/${ids[0]}`
        : `/platform/schools/${schoolId}/classes/${ids[0]}/sections/${ids[1]}`;
    try {
      await api(path, { method: 'PATCH', body: JSON.stringify(data) });
      await load();
    } catch (e: any) {
      setErr(e.message);
      throw e;
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setErr('');
    setSubmitting(true);
    try {
      if (editing.type === 'class') {
        const data =
          editing.field === 'name'
            ? { name: editing.value.trim() }
            : { sortOrder: Number(editing.value) };
        await patch('class', [editing.id], data);
      } else {
        const data =
          editing.field === 'name'
            ? { name: editing.value.trim() }
            : { sortOrder: Number(editing.value) };
        await patch('section', [editing.classId, editing.id], data);
      }
      setEditing(null);
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  }

  async function del(kind: 'class' | 'section', ids: string[]) {
    if (
      !confirm(
        'Permanently delete this academic master? Use INACTIVE when history must be retained.'
      )
    )
      return;
    const path =
      kind === 'class'
        ? `/platform/schools/${schoolId}/classes/${ids[0]}`
        : `/platform/schools/${schoolId}/classes/${ids[0]}/sections/${ids[1]}`;
    try {
      await api(path, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setErr(e.message);
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

      {/* Main Academics Container */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        }}
      >
        {/* Title Bar & Action */}
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
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Classes & Sections
              </h2>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Manage classes and sections for student enrollment.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setAddClassErr('');
              setShowAddClassModal(true);
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
            <span>Add Class</span>
          </button>
        </div>

        {/* Informational Banner matching reference 3 */}
        <div
          style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#0369a1',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Note: Destructive delete is protected against active enrollment.</span>
        </div>

        {/* Global Error message */}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{err}</span>
            <button
              type="button"
              onClick={() => {
                setErr('');
                load();
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #fecaca',
                padding: '3px 10px',
                borderRadius: 5,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Classes List / Accordion */}
        {classes.length === 0 ? (
          /* Empty State */
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: 10,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              No classes configured yet
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Add classes and sections to begin student enrollment for this school.
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddClassModal(true)}
              style={{ padding: '8px 18px', fontSize: 13 }}
            >
              + Add Class
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {classes.map((c) => {
              const isExpanded = expandedClassIds.has(c.id);
              const isActive = c.status === 'ACTIVE';
              const isEditingClassName =
                editing?.type === 'class' && editing.id === c.id && editing.field === 'name';
              const sectionCount = c.sections?.length || 0;

              return (
                <div
                  key={c.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    overflow: 'visible',
                    background: '#ffffff',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* Class Header Bar */}
                  <div
                    style={{
                      padding: '14px 18px',
                      background: isExpanded ? '#f8fafc' : '#ffffff',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderRadius: isExpanded ? '10px 10px 0 0' : 10,
                    }}
                    onClick={() => toggleExpandClass(c.id)}
                  >
                    {/* Left: Chevron + Name + Section Count */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          color: '#64748b',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'transform 0.15s ease',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>

                      {/* Inline Rename input or static text */}
                      {isEditingClassName ? (
                        <div
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') setEditing(null);
                            }}
                            autoFocus
                            style={{
                              padding: '4px 8px',
                              fontSize: 14,
                              fontWeight: 700,
                              borderRadius: 6,
                              border: '2px solid #2563eb',
                              width: 180,
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            disabled={submitting || !editing.value.trim()}
                            onClick={handleSaveEdit}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setEditing(null)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                          {c.name}
                        </span>
                      )}

                      {/* Section count pill */}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#475569',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          padding: '2px 8px',
                          borderRadius: 20,
                        }}
                      >
                        {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
                      </span>
                    </div>

                    {/* Right: Status badge + Actions ⋮ */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 14 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '2px 10px',
                          borderRadius: 9999,
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

                      {/* Action Menu button */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenClassMenuId(openClassMenuId === c.id ? null : c.id)
                          }
                          aria-label="Class actions"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {openClassMenuId === c.id && (
                          <div
                            ref={menuRef}
                            role="menu"
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 'calc(100% + 4px)',
                              width: 170,
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: 8,
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                              zIndex: 40,
                              padding: '4px 0',
                            }}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenClassMenuId(null);
                                setEditing({
                                  type: 'class',
                                  id: c.id,
                                  field: 'name',
                                  value: c.name,
                                });
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 14px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: 13,
                                color: '#334155',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              Rename Class
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenClassMenuId(null);
                                patch('class', [c.id], {
                                  status: isActive ? 'INACTIVE' : 'ACTIVE',
                                });
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 14px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: 13,
                                color: isActive ? '#b45309' : '#059669',
                                cursor: 'pointer',
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
                                setOpenClassMenuId(null);
                                del('class', [c.id]);
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 14px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: 13,
                                color: '#dc2626',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              Delete Class
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section Table */}
                  {isExpanded && (
                    <div style={{ padding: '16px 20px', background: '#ffffff' }}>
                      {!c.sections || c.sections.length === 0 ? (
                        <div
                          style={{
                            padding: '20px 16px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: 13,
                            background: '#f8fafc',
                            borderRadius: 8,
                            marginBottom: 14,
                          }}
                        >
                          No sections configured in {c.name}.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                                  Section Name
                                </th>
                                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#64748b', width: 90 }}>
                                  Order
                                </th>
                                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#64748b', width: 120 }}>
                                  Status
                                </th>
                                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'right' }}>
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {c.sections.map((sec: any) => {
                                const isSecActive = sec.status === 'ACTIVE';
                                const isEditingSecName =
                                  editing?.type === 'section' &&
                                  editing.id === sec.id &&
                                  editing.field === 'name';

                                return (
                                  <tr key={sec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                                      {isEditingSecName ? (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                          <input
                                            type="text"
                                            value={editing.value}
                                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveEdit();
                                              if (e.key === 'Escape') setEditing(null);
                                            }}
                                            autoFocus
                                            style={{
                                              padding: '4px 8px',
                                              fontSize: 13,
                                              fontWeight: 600,
                                              borderRadius: 6,
                                              border: '2px solid #2563eb',
                                              width: 120,
                                            }}
                                          />
                                          <button
                                            type="button"
                                            className="btn btn-primary"
                                            style={{ padding: '3px 8px', fontSize: 11 }}
                                            disabled={submitting || !editing.value.trim()}
                                            onClick={handleSaveEdit}
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ padding: '3px 8px', fontSize: 11 }}
                                            onClick={() => setEditing(null)}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        sec.name
                                      )}
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>
                                      {sec.sortOrder}
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          padding: '2px 8px',
                                          borderRadius: 9999,
                                          background: isSecActive ? '#ecfdf5' : '#f1f5f9',
                                          color: isSecActive ? '#047857' : '#475569',
                                          border: `1px solid ${isSecActive ? '#a7f3d0' : '#cbd5e1'}`,
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: '50%',
                                            background: isSecActive ? '#10b981' : '#94a3b8',
                                          }}
                                        />
                                        {isSecActive ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditing({
                                              type: 'section',
                                              classId: c.id,
                                              id: sec.id,
                                              field: 'name',
                                              value: sec.name,
                                            })
                                          }
                                          style={{
                                            padding: '4px 8px',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: '#f8fafc',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 5,
                                            color: '#334155',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Rename
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            patch('section', [c.id, sec.id], {
                                              status: isSecActive ? 'INACTIVE' : 'ACTIVE',
                                            })
                                          }
                                          style={{
                                            padding: '4px 8px',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: '#f8fafc',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 5,
                                            color: isSecActive ? '#b45309' : '#059669',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          {isSecActive ? 'Deactivate' : 'Activate'}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => del('section', [c.id, sec.id])}
                                          style={{
                                            padding: '4px 8px',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: '#fef2f2',
                                            border: '1px solid #fecaca',
                                            borderRadius: 5,
                                            color: '#dc2626',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add Section CTA */}
                      <button
                        type="button"
                        onClick={() => {
                          setAddSectionErr('');
                          setTargetClassForSection(c);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#2563eb',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#dbeafe')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#eff6ff')}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Add Section</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: Add Class                                          */}
      {/* ========================================================= */}
      {showAddClassModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-class-modal-title"
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
            if (e.target === e.currentTarget) setShowAddClassModal(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 460,
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 id="add-class-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Add New Class
              </h3>
              <button
                type="button"
                onClick={() => setShowAddClassModal(false)}
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

            {addClassErr && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠ {addClassErr}
              </div>
            )}

            <form onSubmit={addClass}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="field">
                  <label htmlFor="class-name-input">Class Name *</label>
                  <input
                    id="class-name-input"
                    name="name"
                    required
                    placeholder="e.g. Class 1 or Grade 10"
                  />
                </div>

                <div className="field">
                  <label htmlFor="class-order-input">Sort Order</label>
                  <input
                    id="class-order-input"
                    name="sortOrder"
                    type="number"
                    min="0"
                    defaultValue="0"
                  />
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddClassModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addingClass}
                >
                  {addingClass ? 'Adding…' : 'Add Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Add Section                                        */}
      {/* ========================================================= */}
      {targetClassForSection && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-section-modal-title"
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
            if (e.target === e.currentTarget) setTargetClassForSection(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 460,
              padding: '24px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 id="add-section-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Add Section to {targetClassForSection.name}
              </h3>
              <button
                type="button"
                onClick={() => setTargetClassForSection(null)}
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

            {addSectionErr && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠ {addSectionErr}
              </div>
            )}

            <form onSubmit={addSection}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div className="field">
                  <label htmlFor="section-name-input">Section Name *</label>
                  <input
                    id="section-name-input"
                    name="name"
                    required
                    placeholder="e.g. A or Blue"
                  />
                </div>

                <div className="field">
                  <label htmlFor="section-order-input">Sort Order</label>
                  <input
                    id="section-order-input"
                    name="sortOrder"
                    type="number"
                    min="0"
                    defaultValue="0"
                  />
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setTargetClassForSection(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addingSection}
                >
                  {addingSection ? 'Adding…' : 'Add Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
