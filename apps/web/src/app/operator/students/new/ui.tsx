'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { studentsApi, type SchoolClassWithSections } from '@/features/students/api/students-api-client';
import type { ConcessionType, StudentGender } from '@custom-school/contracts';

export function AdmitStudentUi({ session }: { session: any }) {
  const router = useRouter();

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classes, setClasses] = useState<SchoolClassWithSections[]>([]);
  const [autoCodePreview, setAutoCodePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [codeMode, setCodeMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [manualCode, setManualCode] = useState('');

  // Personal
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<StudentGender>('BOY');
  const [nationality, setNationality] = useState('Indian');
  const [bloodGroup, setBloodGroup] = useState('');

  // Academic
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [penNumber, setPenNumber] = useState('');
  const [udiseCode, setUdiseCode] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [previousTcNumber, setPreviousTcNumber] = useState('');

  // Contact
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Parent');

  // Private Vault (Encrypted PII)
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [religion, setReligion] = useState('');
  const [caste, setCaste] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  // Bank
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [branch, setBranch] = useState('');

  // Financial & Transport
  const [concessionType, setConcessionType] = useState<ConcessionType>('NONE');
  const [concessionValue, setConcessionValue] = useState<number>(0);
  const [transportRequired, setTransportRequired] = useState(false);

  // Load Classes and Auto Code on mount
  useEffect(() => {
    Promise.all([
      studentsApi.getClasses(),
      studentsApi.getIdSuggestion()
    ])
      .then(([cls, sug]) => {
        setClasses(cls);
        setAutoCodePreview(sug.suggestedCode);
        if (cls.length > 0) {
          setClassId(cls[0].id);
          if (cls[0].sections.length > 0) {
            setSectionId(cls[0].sections[0].id);
          }
        }
      })
      .catch(err => {
        console.warn('Failed to load classes or suggested code', err);
      })
      .finally(() => setLoadingClasses(false));
  }, []);

  const selectedClass = classes.find(c => c.id === classId);
  const sections = selectedClass?.sections || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side quick checks
    if (!fullName.trim()) return setError('Full Name is required');
    if (!fatherName.trim()) return setError('Father Name is required');
    if (!motherName.trim()) return setError('Mother Name is required');
    if (!dob) return setError('Date of Birth is required');
    if (!classId || !sectionId) return setError('Class and Section enrollment are required');
    if (!address.trim()) return setError('Residential Address is required');
    if (!phone.trim()) return setError('Contact Phone is required');
    if (!emergencyContact.trim()) return setError('Emergency Contact is required');

    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, '');
    if (!/^\d{12}$/.test(cleanAadhaar)) {
      return setError('Aadhaar Number must be exactly 12 digits');
    }

    if (codeMode === 'MANUAL' && !manualCode.trim()) {
      return setError('Manual student code is required');
    }

    setSubmitting(true);
    try {
      const payload: any = {
        studentCodeMode: codeMode,
        studentCode: codeMode === 'MANUAL' ? manualCode.trim().toUpperCase() : undefined,
        fullName: fullName.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        familyCode: familyCode.trim() || undefined,
        dateOfBirth: dob,
        gender,
        classId,
        sectionId,
        admissionDate: admissionDate || undefined,
        penNumber: penNumber.trim() || undefined,
        udiseCode: udiseCode.trim() || undefined,
        previousSchool: previousSchool.trim() || undefined,
        previousTcNumber: previousTcNumber.trim() || undefined,
        bloodGroup: bloodGroup.trim() || undefined,
        nationality: nationality.trim() || 'Indian',
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        emergencyContact: emergencyContact.trim(),
        emergencyContactRelation: emergencyRelation.trim(),
        aadhaarNumber: cleanAadhaar,
        panNumber: panNumber.trim().toUpperCase() || undefined,
        religion: religion.trim() || undefined,
        caste: caste.trim() || undefined,
        medicalConditions: medicalConditions.trim() || undefined,
        allergies: allergies.trim() || undefined,
        bank: bankName.trim() && accountNumber.trim() ? {
          bankName: bankName.trim(),
          accountHolderName: accountHolderName.trim() || fullName.trim(),
          accountNumber: accountNumber.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          branch: branch.trim() || undefined
        } : undefined,
        concession: {
          type: concessionType,
          value: Number(concessionValue) || 0
        },
        transportRequired
      };

      const res = await studentsApi.admitStudent(payload);
      router.push(`/operator/students/${res.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to admit student. Please check input details.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Breadcrumb & Title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginBottom: 8 }}>
          <Link href="/operator/students" style={{ color: '#2563eb', textDecoration: 'none' }}>Students</Link>
          <span>/</span>
          <span>New Admission</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Student Admission Record
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
          Register a new student, allocate identification, enroll into active class/section, and encrypt sensitive PII.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            marginBottom: 24,
            fontSize: 13,
            fontWeight: 500
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Identification & Code Allocation */}
        <div className="card" style={{ marginBottom: 20, padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🏷️</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Student Identifier & Admission Sequence
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Code Allocation Mode
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: codeMode === 'AUTO' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: codeMode === 'AUTO' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500
                  }}
                >
                  <input
                    type="radio"
                    name="codeMode"
                    value="AUTO"
                    checked={codeMode === 'AUTO'}
                    onChange={() => setCodeMode('AUTO')}
                  />
                  <span>Auto Generate</span>
                </label>

                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: codeMode === 'MANUAL' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: codeMode === 'MANUAL' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500
                  }}
                >
                  <input
                    type="radio"
                    name="codeMode"
                    value="MANUAL"
                    checked={codeMode === 'MANUAL'}
                    onChange={() => setCodeMode('MANUAL')}
                  />
                  <span>Manual Input</span>
                </label>
              </div>
            </div>

            {codeMode === 'AUTO' ? (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Suggested Next Code
                </label>
                <div
                  style={{
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#2563eb'
                  }}
                >
                  {autoCodePreview || 'Allocating on save...'}
                </div>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Next sequential identifier based on school's prefix and active year.
                </span>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Custom Student Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-2026-999"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Must be unique across all active and inactive students in this school.
                </span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Admission Date
              </label>
              <input
                type="date"
                value={admissionDate}
                onChange={e => setAdmissionDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Personal Details */}
        <div className="card" style={{ marginBottom: 20, padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>👤</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Student Personal Details
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="Student official full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Father Name *
              </label>
              <input
                type="text"
                required
                placeholder="Father / Primary guardian"
                value={fatherName}
                onChange={e => setFatherName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Mother Name *
              </label>
              <input
                type="text"
                required
                placeholder="Mother name"
                value={motherName}
                onChange={e => setMotherName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={e => setDob(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Gender *
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as StudentGender)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="BOY">Boy</option>
                <option value="GIRL">Girl</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={e => setBloodGroup(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="">Unknown / Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Nationality
              </label>
              <input
                type="text"
                value={nationality}
                onChange={e => setNationality(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Family Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. FAM-012"
                value={familyCode}
                onChange={e => setFamilyCode(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Academic Enrollment */}
        <div className="card" style={{ marginBottom: 20, padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🏫</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Academic Enrollment
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Class *
              </label>
              <select
                required
                value={classId}
                onChange={e => {
                  const cid = e.target.value;
                  setClassId(cid);
                  const cls = classes.find(c => c.id === cid);
                  if (cls && cls.sections.length > 0) {
                    setSectionId(cls.sections[0].id);
                  } else {
                    setSectionId('');
                  }
                }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="">Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Section *
              </label>
              <select
                required
                disabled={!classId || sections.length === 0}
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: !classId ? '#f8fafc' : '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="">Select Section</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                PEN Number (Optional)
              </label>
              <input
                type="text"
                placeholder="Permanent Education Number"
                value={penNumber}
                onChange={e => setPenNumber(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                UDISE Code (Optional)
              </label>
              <input
                type="text"
                placeholder="School UDISE ID"
                value={udiseCode}
                onChange={e => setUdiseCode(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Previous School (Optional)
              </label>
              <input
                type="text"
                placeholder="Name of previous institution"
                value={previousSchool}
                onChange={e => setPreviousSchool(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Contact & Emergency */}
        <div className="card" style={{ marginBottom: 20, padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📞</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Contact & Emergency Information
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Residential Address *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Permanent street, locality, city, pin code"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Email (Optional)
              </label>
              <input
                type="email"
                placeholder="guardian@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Emergency Contact Number *
              </label>
              <input
                type="tel"
                required
                placeholder="Emergency telephone"
                value={emergencyContact}
                onChange={e => setEmergencyContact(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Emergency Relation *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Father, Mother, Uncle"
                value={emergencyRelation}
                onChange={e => setEmergencyRelation(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Section 5: Private PII Vault (AES-256-GCM Encrypted) */}
        <div className="card" style={{ marginBottom: 20, padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                Private Vault (Encrypted PII)
              </h3>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 999,
                background: '#dbeafe',
                color: '#1e40af'
              }}
            >
              AES-256-GCM Secure
            </span>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
            Data entered here is stored strictly encrypted in a segregated vault and masked across operator screens.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Aadhaar Number * (12 Digits)
              </label>
              <input
                type="text"
                required
                placeholder="12-digit UID"
                maxLength={14}
                value={aadhaarNumber}
                onChange={e => setAadhaarNumber(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                PAN Number (Optional)
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="ABCDE1234F"
                value={panNumber}
                onChange={e => setPanNumber(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'monospace', textTransform: 'uppercase', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Religion (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Hindu, Muslim, Christian"
                value={religion}
                onChange={e => setReligion(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Caste / Category (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. General, OBC, SC, ST"
                value={caste}
                onChange={e => setCaste(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Medical Conditions (Optional)
              </label>
              <input
                type="text"
                placeholder="Chronic conditions, asthma, etc."
                value={medicalConditions}
                onChange={e => setMedicalConditions(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Allergies (Optional)
              </label>
              <input
                type="text"
                placeholder="Food or drug allergies"
                value={allergies}
                onChange={e => setAllergies(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #cbd5e1' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#475569' }}>
              Student Bank Account Details (Optional)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <input
                  type="text"
                  placeholder="Bank Name"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Account Holder Name"
                  value={accountHolderName}
                  onChange={e => setAccountHolderName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Account Number"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="IFSC Code"
                  value={ifsc}
                  onChange={e => setIfsc(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'monospace', textTransform: 'uppercase', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Fees & Concessions, Transport */}
        <div className="card" style={{ marginBottom: 28, padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>💳</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Concessions & Transport Requirement
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Fee Concession Type
              </label>
              <select
                value={concessionType}
                onChange={e => setConcessionType(e.target.value as ConcessionType)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="NONE">None (Full Fee)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
            </div>

            {concessionType !== 'NONE' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Concession Value ({concessionType === 'PERCENTAGE' ? '%' : '₹'}) *
                </label>
                <input
                  type="number"
                  min={0}
                  max={concessionType === 'PERCENTAGE' ? 100 : 999999}
                  value={concessionValue}
                  onChange={e => setConcessionValue(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            )}

            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: transportRequired ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: transportRequired ? '#eff6ff' : '#ffffff'
                }}
              >
                <input
                  type="checkbox"
                  checked={transportRequired}
                  onChange={e => setTransportRequired(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Transport Required</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Sets transport setup state to <code>SETUP_PENDING</code>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <Link
            href="/operator/students"
            className="btn"
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting || loadingClasses}
            className="btn"
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              background: '#2563eb',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Admitting Student...' : 'Complete Admission'}
          </button>
        </div>
      </form>
    </div>
  );
}
