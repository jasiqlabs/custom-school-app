'use client';

import React, { useState } from 'react';
import {
  createClass,
  updateClass,
  deleteClass,
  createSection,
  updateSection,
  deleteSection,
} from '../api/admin-api-client';

interface ClassItem {
  id: string;
  name: string;
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  sections: Array<{
    id: string;
    classId: string;
    name: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>;
}

interface ClassListProps {
  schoolId: string;
  classes: ClassItem[];
  onRefresh: () => void;
}

export function ClassList({ schoolId, classes, onRefresh }: ClassListProps) {
  const [newClassName, setNewClassName] = useState('');
  const [newClassOrder, setNewClassOrder] = useState('1');
  const [newSectionNames, setNewSectionNames] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inUseAlert, setInUseAlert] = useState<{ id: string; name: string; type: 'CLASS' | 'SECTION'; classId?: string } | null>(null);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createClass(schoolId, {
        name: newClassName.trim(),
        displayOrder: parseInt(newClassOrder, 10) || 0,
      });
      setNewClassName('');
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSection = async (classId: string) => {
    const secName = (newSectionNames[classId] || '').trim();
    if (!secName) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createSection(schoolId, classId, { name: secName });
      setNewSectionNames({ ...newSectionNames, [classId]: '' });
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create section');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleClassStatus = async (classId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateClass(schoolId, classId, { status: newStatus as any });
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update class status');
    }
  };

  const handleToggleSectionStatus = async (classId: string, sectionId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateSection(schoolId, classId, sectionId, { status: newStatus as any });
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update section status');
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    setErrorMessage(null);
    try {
      await deleteClass(schoolId, classId);
      onRefresh();
    } catch (err: any) {
      if (err.code === 'ERR_ACADEMIC_IN_USE') {
        setInUseAlert({ id: classId, name: className, type: 'CLASS' });
      } else {
        setErrorMessage(err.message || 'Failed to delete class');
      }
    }
  };

  const handleDeleteSection = async (classId: string, sectionId: string, sectionName: string) => {
    setErrorMessage(null);
    try {
      await deleteSection(schoolId, classId, sectionId);
      onRefresh();
    } catch (err: any) {
      if (err.code === 'ERR_ACADEMIC_IN_USE') {
        setInUseAlert({ id: sectionId, name: sectionName, type: 'SECTION', classId });
      } else {
        setErrorMessage(err.message || 'Failed to delete section');
      }
    }
  };

  return (
    <div>
      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* BR-CLS-002 Protected Deletion Banner */}
      {inUseAlert && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            color: '#92400e',
            fontSize: '0.875rem',
          }}
        >
          <strong>⚠️ Active Student Enrollment Protection (BR-CLS-002)</strong>
          <p style={{ margin: '0.5rem 0' }}>
            &ldquo;{inUseAlert.name}&rdquo; cannot be physically deleted because it contains active student records. You can deactivate it to remove it from future placement lists while preserving student history.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={async () => {
                if (inUseAlert.type === 'CLASS') {
                  await handleToggleClassStatus(inUseAlert.id, 'ACTIVE');
                } else if (inUseAlert.classId) {
                  await handleToggleSectionStatus(inUseAlert.classId, inUseAlert.id, 'ACTIVE');
                }
                setInUseAlert(null);
              }}
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: '#b45309',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              Deactivate Instead
            </button>
            <button
              onClick={() => setInUseAlert(null)}
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: 'transparent',
                border: '1px solid #d97706',
                color: '#92400e',
                borderRadius: '4px',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Add Class Form */}
      <form
        onSubmit={handleAddClass}
        style={{
          background: '#ffffff',
          padding: '1.25rem',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: 2 }}>
          <label
            htmlFor="new-class-name"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}
          >
            New Class Name
          </label>
          <input
            id="new-class-name"
            type="text"
            required
            placeholder="e.g. Grade 1 or Standard X"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ flex: 1, maxWidth: '120px' }}>
          <label
            htmlFor="new-class-order"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}
          >
            Display Order
          </label>
          <input
            id="new-class-order"
            type="number"
            value={newClassOrder}
            onChange={(e) => setNewClassOrder(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          id="btn-add-class"
          disabled={isSubmitting}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            height: '38px',
          }}
        >
          + Add Class
        </button>
      </form>

      {/* Classes & Sections List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {classes.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#6b7280' }}>
            No classes defined yet. Add the first class above to configure sections.
          </div>
        ) : (
          classes.map((c) => (
            <div
              key={c.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
                    {c.name}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: c.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                      color: c.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {c.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Order: {c.displayOrder}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleToggleClassStatus(c.id, c.status)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    {c.status === 'ACTIVE' ? 'Deactivate Class' : 'Activate Class'}
                  </button>
                  <button
                    onClick={() => handleDeleteClass(c.id, c.name)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #fca5a5',
                      background: '#fef2f2',
                      color: '#b91c1c',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Sections under this Class */}
              <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.5rem' }}>
                  Sections ({c.sections?.length || 0}):
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {c.sections && c.sections.length > 0 ? (
                    c.sections.map((sec) => (
                      <span
                        key={sec.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.25rem 0.625rem',
                          background: sec.status === 'ACTIVE' ? '#f3f4f6' : '#fee2e2',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <strong style={{ color: sec.status === 'ACTIVE' ? '#111827' : '#991b1b' }}>{sec.name}</strong>
                        <span style={{ fontSize: '0.7rem', color: sec.status === 'ACTIVE' ? '#15803d' : '#b91c1c' }}>
                          ({sec.status})
                        </span>
                        <button
                          onClick={() => handleToggleSectionStatus(c.id, sec.id, sec.status)}
                          title={sec.status === 'ACTIVE' ? 'Deactivate Section' : 'Activate Section'}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                          }}
                        >
                          ⚙
                        </button>
                        <button
                          onClick={() => handleDeleteSection(c.id, sec.id, sec.name)}
                          title="Delete Section"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            color: '#ef4444',
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>No sections added yet.</span>
                  )}
                </div>

                {/* Add Section inline input */}
                <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '300px' }}>
                  <input
                    type="text"
                    placeholder="New Section (e.g. A, B)"
                    value={newSectionNames[c.id] || ''}
                    onChange={(e) =>
                      setNewSectionNames({ ...newSectionNames, [c.id]: e.target.value })
                    }
                    style={{
                      flex: 1,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.8125rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSection(c.id)}
                    style={{
                      padding: '0.25rem 0.625rem',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Section
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
