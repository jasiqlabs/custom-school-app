'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SchoolNav } from '@/components/school-nav';

type EditTarget =
  | { type: 'class'; id: string; field: 'name' | 'sortOrder'; value: string }
  | { type: 'section'; classId: string; id: string; field: 'name' | 'sortOrder'; value: string }
  | null;

export default function AcademicsUi({ schoolId }: { schoolId: string }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<EditTarget>(null);
  const [submitting, setSubmitting] = useState(false);

  // Add Class state
  const [addingClass, setAddingClass] = useState(false);
  const [addClassErr, setAddClassErr] = useState('');
  const [addClassSuccess, setAddClassSuccess] = useState('');

  // Add Section state (keyed by classId)
  const [addingSectionClassId, setAddingSectionClassId] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const [sectionSuccesses, setSectionSuccesses] = useState<Record<string, string>>({});

  const load = () =>
    api<any[]>(`/platform/schools/${schoolId}/classes`)
      .then(setClasses)
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, [schoolId]);

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
      form.reset();
      setAddClassSuccess('✓ Class added successfully');
      setTimeout(() => setAddClassSuccess(''), 4000);
      await load();
    } catch (e: any) {
      setAddClassErr(e.message || 'Failed to add class');
    } finally {
      setAddingClass(false);
    }
  }

  async function addSection(classId: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSectionErrors((prev) => ({ ...prev, [classId]: '' }));
    setSectionSuccesses((prev) => ({ ...prev, [classId]: '' }));
    setAddingSectionClassId(classId);

    const form = e.currentTarget;
    const f = new FormData(form);

    try {
      await api(`/platform/schools/${schoolId}/classes/${classId}/sections`, {
        method: 'POST',
        body: JSON.stringify({
          name: f.get('name'),
          sortOrder: Number(f.get('sortOrder') || 0),
        }),
      });
      form.reset();
      setSectionSuccesses((prev) => ({ ...prev, [classId]: '✓ Section added successfully' }));
      setTimeout(() => {
        setSectionSuccesses((prev) => ({ ...prev, [classId]: '' }));
      }, 4000);
      await load();
    } catch (e: any) {
      setSectionErrors((prev) => ({ ...prev, [classId]: e.message || 'Failed to add section' }));
    } finally {
      setAddingSectionClassId(null);
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
      // setErr handled inside patch
    } finally {
      setSubmitting(false);
    }
  }

  async function del(kind: 'class' | 'section', ids: string[]) {
    if (!confirm('Permanently delete this academic master? Use INACTIVE when history must be retained.'))
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
    <div className="container">
      <SchoolNav schoolId={schoolId} />
      <h1>Classes & Sections</h1>
      <p className="muted">
        Deactivation preserves history. Destructive delete is protected against active enrollment.
      </p>

      {/* Generic error display for page-level or delete errors */}
      {err && (
        <p className="error" role="alert" style={{ marginBottom: 16 }}>
          {err}
        </p>
      )}

      {/* Add Class Form Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <form
          onSubmit={addClass}
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label>Class name</label>
            <input
              name="name"
              required
              placeholder="e.g. Class 1 or Grade 10"
              onChange={() => {
                if (addClassErr) setAddClassErr('');
                if (addClassSuccess) setAddClassSuccess('');
              }}
            />
          </div>
          <div className="field" style={{ width: 120 }}>
            <label>Order</label>
            <input name="sortOrder" type="number" min="0" defaultValue="0" />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={addingClass}
            style={{ height: 42, minWidth: 120 }}
          >
            {addingClass ? 'Adding...' : 'Add Class'}
          </button>
        </form>

        {/* In-Place Error Message for Add Class */}
        {addClassErr && (
          <div
            className="card error"
            role="alert"
            style={{
              marginTop: 14,
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
            <span>{addClassErr}</span>
          </div>
        )}

        {/* In-Place Success Message for Add Class */}
        {addClassSuccess && (
          <div
            role="status"
            style={{
              marginTop: 14,
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
            <span>{addClassSuccess}</span>
          </div>
        )}
      </div>

      {/* Classes List */}
      <div className="grid" style={{ gap: 20 }}>
        {classes.map((c) => {
          const isEditingClassName =
            editing?.type === 'class' && editing.id === c.id && editing.field === 'name';
          const isEditingClassOrder =
            editing?.type === 'class' && editing.id === c.id && editing.field === 'sortOrder';

          return (
            <div className="card" key={c.id} style={{ display: 'grid', gap: 16 }}>
              {/* Class Header Bar */}
              <div
                className="row"
                style={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--line)',
                }}
              >
                {/* Left Side: Name, Status, Order with Inline Inputs */}
                <div className="row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* Inline Class Name Edit */}
                  {isEditingClassName ? (
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
                          padding: '6px 10px',
                          fontSize: 15,
                          fontWeight: 700,
                          borderRadius: 6,
                          border: '2px solid #2563eb',
                          width: 200,
                        }}
                        placeholder="Class name"
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        disabled={submitting || !editing.value.trim()}
                        onClick={handleSaveEdit}
                      >
                        {submitting ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        disabled={submitting}
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <strong style={{ fontSize: 17, color: 'var(--text)' }}>{c.name}</strong>
                  )}

                  <span className="badge">{c.status}</span>

                  {/* Inline Class Order Edit */}
                  {isEditingClassOrder ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                        Order:
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        autoFocus
                        style={{
                          padding: '6px 10px',
                          fontSize: 14,
                          borderRadius: 6,
                          border: '2px solid #2563eb',
                          width: 80,
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        disabled={submitting || editing.value === ''}
                        onClick={handleSaveEdit}
                      >
                        {submitting ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        disabled={submitting}
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="muted" style={{ fontSize: 14 }}>
                      Order {c.sortOrder}
                    </span>
                  )}
                </div>

                {/* Right Side: Action Buttons */}
                <div className="row" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className={`btn ${isEditingClassName ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      if (isEditingClassName) {
                        setEditing(null);
                      } else {
                        setEditing({ type: 'class', id: c.id, field: 'name', value: c.name });
                      }
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className={`btn ${isEditingClassOrder ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      if (isEditingClassOrder) {
                        setEditing(null);
                      } else {
                        setEditing({
                          type: 'class',
                          id: c.id,
                          field: 'sortOrder',
                          value: String(c.sortOrder),
                        });
                      }
                    }}
                  >
                    Order
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      patch('class', [c.id], {
                        status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                      })
                    }
                  >
                    {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => del('class', [c.id])}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Sections Table */}
              <table>
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {c.sections.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: 'var(--muted)' }}>
                        No sections yet. Add a section below.
                      </td>
                    </tr>
                  ) : (
                    c.sections.map((s: any) => {
                      const isEditingSectionName =
                        editing?.type === 'section' &&
                        editing.id === s.id &&
                        editing.field === 'name';
                      const isEditingSectionOrder =
                        editing?.type === 'section' &&
                        editing.id === s.id &&
                        editing.field === 'sortOrder';

                      return (
                        <tr key={s.id}>
                          {/* Section Name Cell (inline editing) */}
                          <td>
                            {isEditingSectionName ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <input
                                  type="text"
                                  value={editing.value}
                                  onChange={(e) =>
                                    setEditing({ ...editing, value: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit();
                                    if (e.key === 'Escape') setEditing(null);
                                  }}
                                  autoFocus
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: 13,
                                    borderRadius: 5,
                                    border: '2px solid #2563eb',
                                    width: 140,
                                  }}
                                  placeholder="Section name"
                                />
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: 12 }}
                                  disabled={submitting || !editing.value.trim()}
                                  onClick={handleSaveEdit}
                                >
                                  {submitting ? '...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: 12 }}
                                  disabled={submitting}
                                  onClick={() => setEditing(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontWeight: 600 }}>{s.name}</span>
                            )}
                          </td>

                          {/* Section Order Cell (inline editing) */}
                          <td>
                            {isEditingSectionOrder ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={editing.value}
                                  onChange={(e) =>
                                    setEditing({ ...editing, value: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit();
                                    if (e.key === 'Escape') setEditing(null);
                                  }}
                                  autoFocus
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: 13,
                                    borderRadius: 5,
                                    border: '2px solid #2563eb',
                                    width: 70,
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: 12 }}
                                  disabled={submitting || editing.value === ''}
                                  onClick={handleSaveEdit}
                                >
                                  {submitting ? '...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: 12 }}
                                  disabled={submitting}
                                  onClick={() => setEditing(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span>{s.sortOrder}</span>
                            )}
                          </td>

                          {/* Status Cell */}
                          <td>
                            <span className="badge">{s.status}</span>
                          </td>

                          {/* Actions Cell */}
                          <td>
                            <div className="row" style={{ gap: 6 }}>
                              <button
                                type="button"
                                className={`btn ${isEditingSectionName ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '4px 10px', fontSize: 12 }}
                                onClick={() => {
                                  if (isEditingSectionName) {
                                    setEditing(null);
                                  } else {
                                    setEditing({
                                      type: 'section',
                                      classId: c.id,
                                      id: s.id,
                                      field: 'name',
                                      value: s.name,
                                    });
                                  }
                                }}
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                className={`btn ${isEditingSectionOrder ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '4px 10px', fontSize: 12 }}
                                onClick={() => {
                                  if (isEditingSectionOrder) {
                                    setEditing(null);
                                  } else {
                                    setEditing({
                                      type: 'section',
                                      classId: c.id,
                                      id: s.id,
                                      field: 'sortOrder',
                                      value: String(s.sortOrder),
                                    });
                                  }
                                }}
                              >
                                Order
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: 12 }}
                                onClick={() =>
                                  patch('section', [c.id, s.id], {
                                    status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                  })
                                }
                              >
                                {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ padding: '4px 10px', fontSize: 12 }}
                                onClick={() => del('section', [c.id, s.id])}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Add Section Form Area */}
              <div style={{ paddingTop: 8, borderTop: '1px dashed var(--line)' }}>
                <form
                  className="row"
                  onSubmit={(e) => addSection(c.id, e)}
                  style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}
                >
                  <div className="field" style={{ flex: 1, maxWidth: 260 }}>
                    <label style={{ fontSize: 12 }}>New Section</label>
                    <input
                      name="name"
                      required
                      placeholder="e.g. A, B, or Rose"
                      onChange={() => {
                        if (sectionErrors[c.id]) {
                          setSectionErrors((prev) => ({ ...prev, [c.id]: '' }));
                        }
                        if (sectionSuccesses[c.id]) {
                          setSectionSuccesses((prev) => ({ ...prev, [c.id]: '' }));
                        }
                      }}
                    />
                  </div>
                  <div className="field" style={{ width: 100 }}>
                    <label style={{ fontSize: 12 }}>Order</label>
                    <input name="sortOrder" type="number" min="0" defaultValue="0" />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={addingSectionClassId === c.id}
                    style={{ height: 38, padding: '0 16px', fontSize: 13, minWidth: 120 }}
                  >
                    {addingSectionClassId === c.id ? 'Adding...' : 'Add Section'}
                  </button>
                </form>

                {/* In-Place Error Message for Add Section */}
                {sectionErrors[c.id] && (
                  <div
                    className="card error"
                    role="alert"
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      border: '1px solid #fca5a5',
                      background: '#fef2f2',
                      color: '#b91c1c',
                    }}
                  >
                    <span style={{ fontSize: 15 }}>⚠️</span>
                    <span>{sectionErrors[c.id]}</span>
                  </div>
                )}

                {/* In-Place Success Message for Add Section */}
                {sectionSuccesses[c.id] && (
                  <div
                    role="status"
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 6,
                      background: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>{sectionSuccesses[c.id]}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
