'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { studentsApi, type SchoolClassWithSections } from '@/features/students/api/students-api-client';
import { feesApi } from '@/features/fees/api/fees-api-client';
import { transportsApi } from '@/features/transports/api/transports-api-client';
import type {
  StudentProfileDto,
  StudentIdentifierHistoryItem,
  FeeDueDto,
  FeePaymentDto,
  PaymentReceiptDto,
  PaymentMode,
  ActiveTransportChoiceItem,
  StudentGender,
  ConcessionType,
} from '@custom-school/contracts';

type TabKey = 'overview' | 'vault' | 'fees' | 'transport' | 'history';

export function StudentProfileUi({ session, studentId }: { session: any; studentId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentProfileDto | null>(null);
  const [history, setHistory] = useState<StudentIdentifierHistoryItem[]>([]);
  const [fees, setFees] = useState<any>(null);
  const [transport, setTransport] = useState<any>(null);
  const [feeDues, setFeeDues] = useState<FeeDueDto[]>([]);
  const [feePayments, setFeePayments] = useState<FeePaymentDto[]>([]);
  const [classes, setClasses] = useState<SchoolClassWithSections[]>([]);

  // Per-box inline editing state
  const [editingBox, setEditingBox] = useState<string | null>(null);
  const [savingBox, setSavingBox] = useState(false);
  const [boxError, setBoxError] = useState<string | null>(null);
  const [boxSuccess, setBoxSuccess] = useState<string | null>(null);

  // Box 1: Personal & Family
  const [persFullName, setPersFullName] = useState('');
  const [persFatherName, setPersFatherName] = useState('');
  const [persMotherName, setPersMotherName] = useState('');
  const [persDob, setPersDob] = useState('');
  const [persGender, setPersGender] = useState<StudentGender>('BOY');
  const [persNationality, setPersNationality] = useState('Indian');
  const [persBloodGroup, setPersBloodGroup] = useState('');
  const [persFamilyCode, setPersFamilyCode] = useState('');

  // Box 2: Academic & Identifiers
  const [acadClassId, setAcadClassId] = useState('');
  const [acadSectionId, setAcadSectionId] = useState('');
  const [acadAdmissionDate, setAcadAdmissionDate] = useState('');
  const [acadPen, setAcadPen] = useState('');
  const [acadUdise, setAcadUdise] = useState('');
  const [acadPrevSchool, setAcadPrevSchool] = useState('');
  const [acadPrevTc, setAcadPrevTc] = useState('');

  // Box 3: Contact & Emergency
  const [contPhone, setContPhone] = useState('');
  const [contEmail, setContEmail] = useState('');
  const [contEmergPhone, setContEmergPhone] = useState('');
  const [contEmergRel, setContEmergRel] = useState('');
  const [contAddress, setContAddress] = useState('');

  // Box 4: Concession & Policy
  const [polConcessionType, setPolConcessionType] = useState<ConcessionType>('NONE');
  const [polConcessionValue, setPolConcessionValue] = useState(0);
  const [polTransportReq, setPolTransportReq] = useState(false);
  const [polRouteId, setPolRouteId] = useState('');
  const [polStoppageId, setPolStoppageId] = useState('');

  // Box 5: Vault Demographics & Health
  const [vaultAadhaar, setVaultAadhaar] = useState('');
  const [vaultPan, setVaultPan] = useState('');
  const [vaultReligion, setVaultReligion] = useState('');
  const [vaultCaste, setVaultCaste] = useState('');
  const [vaultMedical, setVaultMedical] = useState('');
  const [vaultAllergies, setVaultAllergies] = useState('');

  // Box 6: Vault Bank Account
  const [vaultBankName, setVaultBankName] = useState('');
  const [vaultHolderName, setVaultHolderName] = useState('');
  const [vaultAccountNum, setVaultAccountNum] = useState('');
  const [vaultIfsc, setVaultIfsc] = useState('');
  const [vaultBranch, setVaultBranch] = useState('');

  // Collect Fee modal state
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectDueId, setCollectDueId] = useState('');
  const [collectAmount, setPaymentAmount] = useState('');
  const [collectMode, setCollectMode] = useState<PaymentMode>('CASH');
  const [collectDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [collectReference, setCollectReference] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);

  // View Receipt modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceiptDto | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Transport management state
  const [transportChoices, setTransportChoices] = useState<ActiveTransportChoiceItem[]>([]);
  const [loadingChoices, setLoadingChoices] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedStoppageId, setSelectedStoppageId] = useState('');
  const [serviceStartDate, setServiceStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [serviceEndDate, setServiceEndDate] = useState('');
  const [endReason, setEndReason] = useState('');
  const [endSetNoPref, setEndSetNoPref] = useState(false);
  const [submittingTransport, setSubmittingTransport] = useState(false);
  const [transportModalError, setTransportModalError] = useState<string | null>(null);
  const [transportToast, setTransportToast] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Modals
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [renameReason, setRenameReason] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'INACTIVE'>('INACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editFatherName, setEditFatherName] = useState('');
  const [editMotherName, setEditMotherName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editConcessionType, setEditConcessionType] = useState<ConcessionType>('NONE');
  const [editConcessionValue, setEditConcessionValue] = useState(0);
  const [editTransportReq, setEditTransportReq] = useState(false);
  const [editRouteId, setEditRouteId] = useState('');
  const [editStoppageId, setEditStoppageId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, histData, feeData, trData, duesRes, paymentsRes, classesRes, choicesRes] = await Promise.all([
        studentsApi.getProfile(studentId),
        studentsApi.getIdentifierHistory(studentId).catch(() => []),
        studentsApi.getFeeSummary(studentId).catch(() => ({ availability: 'UNAVAILABLE' })),
        studentsApi.getTransportSummary(studentId).catch(() => ({ availability: 'UNAVAILABLE' })),
        feesApi.getStudentDues(studentId).catch(() => ({ dues: [] })),
        feesApi.listPayments({ studentId }).catch(() => ({ items: [] })),
        studentsApi.getClasses().catch(() => []),
        transportsApi.getActiveChoices().catch(() => ({ transports: [] })),
      ]);
      setStudent(profileData);
      setHistory(histData);
      setFees(feeData);
      setTransport(trData);
      setFeeDues(duesRes?.dues || []);
      setFeePayments(paymentsRes?.items || []);
      setClasses(classesRes || []);
      const choices = choicesRes?.transports || [];
      setTransportChoices(choices);

      // Pre-fill edit modal
      setEditFullName(profileData.fullName);
      setEditFatherName(profileData.fatherName);
      setEditMotherName(profileData.motherName);
      setEditPhone(profileData.phone);
      setEditAddress(profileData.address);
      setEditConcessionType(profileData.concessionType || 'NONE');
      setEditConcessionValue(profileData.concessionValue || 0);
      setEditTransportReq(Boolean(profileData.transportRequired));
      const initRouteId = trData?.assignment?.routeId || trData?.history?.[0]?.routeId || (Boolean(profileData.transportRequired) && choices[0]?.id ? choices[0].id : '');
      const initStoppageId = trData?.assignment?.stoppageId || trData?.history?.[0]?.stoppageId || (Boolean(profileData.transportRequired) && choices[0]?.stoppages?.[0]?.id ? choices[0].stoppages[0].id : '');
      setEditRouteId(initRouteId);
      setEditStoppageId(initStoppageId);
    } catch (err: any) {
      setError(err?.message || 'Failed to load student profile');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  function handleOpenCollect(due?: FeeDueDto) {
    setCollectError(null);
    if (due) {
      setCollectDueId(due.id);
      setPaymentAmount(String(due.balance));
    } else {
      const pendingDue = feeDues.find((d) => d.balance > 0);
      if (pendingDue) {
        setCollectDueId(pendingDue.id);
        setPaymentAmount(String(pendingDue.balance));
      } else if (feeDues.length > 0) {
        setCollectDueId(feeDues[0].id);
        setPaymentAmount(String(feeDues[0].balance));
      } else {
        setCollectDueId('');
        setPaymentAmount('');
      }
    }
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setCollectMode('CASH');
    setCollectReference('');
    setCollectModalOpen(true);
  }

  function handleDueSelect(dueId: string) {
    setCollectDueId(dueId);
    const due = feeDues.find((d) => d.id === dueId);
    if (due) {
      setPaymentAmount(String(due.balance));
    }
  }

  async function handleCollectPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!collectDueId) {
      setCollectError('Please select a fee due to collect');
      return;
    }
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      setCollectError('Please enter a valid positive payment amount');
      return;
    }
    const targetDue = feeDues.find((d) => d.id === collectDueId);
    if (targetDue && amt > targetDue.balance) {
      setCollectError(`Amount cannot exceed outstanding balance of ₹${targetDue.balance}`);
      return;
    }

    setSubmittingPayment(true);
    setCollectError(null);
    try {
      const idempotencyKey = `pay-${studentId}-${collectDueId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const receiptData = await feesApi.collectPayment({
        studentId,
        dueId: collectDueId,
        amount: amt,
        mode: collectMode,
        paymentDate: collectDate,
        reference: collectReference.trim() || undefined,
        idempotencyKey,
      });

      setCollectModalOpen(false);
      setSelectedReceipt(receiptData);
      setReceiptModalOpen(true);
      await loadData();
    } catch (err: any) {
      setCollectError(err.message || 'Failed to collect payment');
    } finally {
      setSubmittingPayment(false);
    }
  }

  async function handleViewReceipt(paymentId: string) {
    setLoadingReceipt(true);
    try {
      const receiptData = await feesApi.getReceipt(paymentId);
      setSelectedReceipt(receiptData);
      setReceiptModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load receipt');
    } finally {
      setLoadingReceipt(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim()) return;
    setRenaming(true);
    setRenameError(null);
    try {
      await studentsApi.changeIdentifier(studentId, {
        newStudentCode: newCode.trim().toUpperCase(),
        reason: renameReason.trim() || 'Identifier updated by operator',
        version: student?.version || 1
      });
      setRenameModalOpen(false);
      setNewCode('');
      setRenameReason('');
      await loadData();
    } catch (err: any) {
      setRenameError(err?.message || 'Failed to change student code');
    } finally {
      setRenaming(false);
    }
  }

  async function handleStatusChange(e: React.FormEvent) {
    e.preventDefault();
    if (targetStatus === 'INACTIVE' && !statusReason.trim()) {
      return setStatusError('Deactivation reason is mandatory');
    }
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      await studentsApi.changeStatus(studentId, {
        status: targetStatus,
        reason: statusReason.trim() || undefined
      });
      setStatusModalOpen(false);
      setStatusReason('');
      await loadData();
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to update student status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleEditProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!student) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await studentsApi.updateProfile(studentId, {
        version: student.version,
        fullName: editFullName.trim(),
        fatherName: editFatherName.trim(),
        motherName: editMotherName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        concession: {
          type: editConcessionType,
          value: editConcessionType === 'NONE' ? 0 : Number(editConcessionValue) || 0,
        },
        transportRequired: editTransportReq,
        stoppageId: editTransportReq ? editStoppageId || null : null,
      });
      setEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update profile');
    } finally {
      setSavingEdit(false);
    }
  }

  function handleStartEditBox(boxKey: string) {
    setBoxError(null);
    setBoxSuccess(null);
    if (!student) return;
    if (boxKey === 'personal') {
      setPersFullName(student.fullName || '');
      setPersFatherName(student.fatherName || '');
      setPersMotherName(student.motherName || '');
      setPersDob(student.dob ? new Date(student.dob).toISOString().slice(0, 10) : '');
      setPersGender(student.gender || 'BOY');
      setPersNationality(student.nationality || 'Indian');
      setPersBloodGroup(student.bloodGroup || '');
      setPersFamilyCode(student.familyCode || '');
    } else if (boxKey === 'academic') {
      const clsId = student.enrollment?.classId || (classes[0]?.id || '');
      setAcadClassId(clsId);
      const matchingCls = classes.find((c) => c.id === clsId);
      setAcadSectionId(student.enrollment?.sectionId || (matchingCls?.sections[0]?.id || ''));
      setAcadAdmissionDate(student.admissionDate ? new Date(student.admissionDate).toISOString().slice(0, 10) : '');
      setAcadPen(student.penNumber || '');
      setAcadUdise(student.udiseCode || '');
      setAcadPrevSchool(student.previousSchool || '');
      setAcadPrevTc(student.previousTcNumber || '');
    } else if (boxKey === 'contact') {
      setContPhone(student.phone || '');
      setContEmail(student.email || '');
      setContEmergPhone(student.emergencyContact || '');
      setContEmergRel(student.emergencyRelation || '');
      setContAddress(student.address || '');
    } else if (boxKey === 'policy') {
      setPolConcessionType(student.concessionType || 'NONE');
      setPolConcessionValue(student.concessionValue || 0);
      const isTrReq = Boolean(student.transportRequired);
      setPolTransportReq(isTrReq);
      const curRouteId = transport?.assignment?.routeId || transport?.history?.[0]?.routeId || (isTrReq && transportChoices[0]?.id ? transportChoices[0].id : '');
      const curStoppageId = transport?.assignment?.stoppageId || transport?.history?.[0]?.stoppageId || (isTrReq && transportChoices[0]?.stoppages?.[0]?.id ? transportChoices[0].stoppages[0].id : '');
      setPolRouteId(curRouteId);
      setPolStoppageId(curStoppageId);
      if (transportChoices.length === 0) {
        loadTransportChoices().then((loaded) => {
          if (loaded && loaded.length > 0 && isTrReq && !curRouteId) {
            setPolRouteId(loaded[0].id);
            setPolStoppageId(loaded[0].stoppages?.[0]?.id || '');
          }
        });
      }
    } else if (boxKey === 'vault-demographics') {
      setVaultAadhaar('');
      setVaultPan('');
      setVaultReligion(student.privateProfile?.religion || '');
      setVaultCaste(student.privateProfile?.caste || '');
      setVaultMedical(student.privateProfile?.medicalConditions || '');
      setVaultAllergies(student.privateProfile?.allergies || '');
    } else if (boxKey === 'vault-bank') {
      setVaultBankName(student.privateProfile?.bankMasked?.bankName || '');
      setVaultHolderName(student.privateProfile?.bankMasked?.accountHolderName || '');
      setVaultAccountNum('');
      setVaultIfsc(student.privateProfile?.bankMasked?.ifsc || '');
      setVaultBranch(student.privateProfile?.bankMasked?.branch || '');
    }
    setEditingBox(boxKey);
  }

  async function handleSaveBox(boxKey: string) {
    if (!student) return;
    setSavingBox(true);
    setBoxError(null);
    setBoxSuccess(null);
    try {
      const payload: any = { version: student.version };

      if (boxKey === 'personal') {
        if (!persFullName.trim()) throw new Error('Student name is required');
        if (!persFatherName.trim()) throw new Error('Father name is required');
        if (!persMotherName.trim()) throw new Error('Mother name is required');
        if (!persDob) throw new Error('Date of birth is required');
        payload.fullName = persFullName.trim();
        payload.fatherName = persFatherName.trim();
        payload.motherName = persMotherName.trim();
        payload.dob = persDob;
        payload.gender = persGender;
        payload.nationality = persNationality.trim() || 'Indian';
        payload.bloodGroup = persBloodGroup.trim() || null;
        payload.familyCode = persFamilyCode.trim() || null;
      } else if (boxKey === 'academic') {
        if (acadClassId) payload.classId = acadClassId;
        if (acadSectionId) payload.sectionId = acadSectionId;
        if (acadAdmissionDate) payload.admissionDate = acadAdmissionDate;
        payload.penNumber = acadPen.trim() || null;
        payload.udiseCode = acadUdise.trim() || null;
        payload.previousSchool = acadPrevSchool.trim() || null;
        payload.previousTcNumber = acadPrevTc.trim() || null;
      } else if (boxKey === 'contact') {
        if (!contPhone.trim()) throw new Error('Primary phone number is required');
        if (!contAddress.trim()) throw new Error('Address is required');
        payload.phone = contPhone.trim();
        payload.email = contEmail.trim() || null;
        payload.emergencyContact = contEmergPhone.trim() || contPhone.trim();
        payload.emergencyRelation = contEmergRel.trim() || 'Parent';
        payload.address = contAddress.trim();
      } else if (boxKey === 'policy') {
        payload.concession = {
          type: polConcessionType,
          value: polConcessionType === 'NONE' ? 0 : Number(polConcessionValue) || 0
        };
        payload.transportRequired = polTransportReq;
        if (polTransportReq && polStoppageId) {
          payload.stoppageId = polStoppageId;
        } else if (!polTransportReq) {
          payload.stoppageId = null;
        }
      } else if (boxKey === 'vault-demographics') {
        if (vaultAadhaar.trim()) {
          payload.aadhaarNumber = vaultAadhaar.trim();
        }
        if (vaultPan.trim()) {
          payload.panNumber = vaultPan.trim().toUpperCase();
        }
        payload.religion = vaultReligion.trim() || null;
        payload.caste = vaultCaste.trim() || null;
        payload.medicalConditions = vaultMedical.trim() || null;
        payload.allergies = vaultAllergies.trim() || null;
      } else if (boxKey === 'vault-bank') {
        payload.bank = {
          bankName: vaultBankName.trim() || undefined,
          accountHolderName: vaultHolderName.trim() || undefined,
          accountNumber: vaultAccountNum.trim() || undefined,
          ifsc: vaultIfsc.trim().toUpperCase() || undefined,
          branch: vaultBranch.trim() || undefined,
        };
      }

      await studentsApi.updateProfile(studentId, payload);
      setEditingBox(null);
      setBoxSuccess('Section updated successfully');
      setTimeout(() => setBoxSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setBoxError(err?.message || 'Failed to update section');
    } finally {
      setSavingBox(false);
    }
  }

  const loadTransportChoices = useCallback(async () => {
    try {
      setLoadingChoices(true);
      const res = await transportsApi.getActiveChoices();
      const choices = res.transports || [];
      setTransportChoices(choices);
      return choices;
    } catch (err: any) {
      console.error('Failed to load transport choices', err);
      return [];
    } finally {
      setLoadingChoices(false);
    }
  }, []);

  const handleOpenAssignModal = async () => {
    setTransportModalError(null);
    setServiceStartDate(new Date().toISOString().slice(0, 10));
    setServiceEndDate('');
    setAssignModalOpen(true);
    const choices = await loadTransportChoices();
    if (choices.length > 0) {
      setSelectedRouteId(choices[0].id);
      if (choices[0].stoppages.length > 0) {
        setSelectedStoppageId(choices[0].stoppages[0].id);
      } else {
        setSelectedStoppageId('');
      }
    }
  };

  const handleOpenReassignModal = async () => {
    setTransportModalError(null);
    setServiceStartDate(new Date().toISOString().slice(0, 10));
    setServiceEndDate('');
    setEndReason('');
    setReassignModalOpen(true);
    const choices = await loadTransportChoices();
    const curRouteId = transport?.assignment?.routeId || (choices[0]?.id || '');
    setSelectedRouteId(curRouteId);
    const curRoute = choices.find((r) => r.id === curRouteId);
    if (curRoute && curRoute.stoppages.length > 0) {
      setSelectedStoppageId(transport?.assignment?.stoppageId || curRoute.stoppages[0].id);
    } else {
      setSelectedStoppageId('');
    }
  };

  const handleOpenEndModal = () => {
    setTransportModalError(null);
    setEndReason('');
    setEndSetNoPref(false);
    setEndModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoppageId) {
      setTransportModalError('Please select a valid route and stoppage');
      return;
    }
    setSubmittingTransport(true);
    setTransportModalError(null);
    try {
      if (student && !student.transportRequired) {
        await studentsApi.updateProfile(studentId, {
          version: student.version,
          transportRequired: true,
        });
      }
      await transportsApi.assignStudent({
        studentId,
        stoppageId: selectedStoppageId,
        serviceStartDate: serviceStartDate || undefined,
        serviceEndDate: serviceEndDate || undefined,
      });
      setAssignModalOpen(false);
      setTransportToast('Transport route assigned successfully!');
      setTimeout(() => setTransportToast(null), 5000);
      await loadData();
    } catch (err: any) {
      setTransportModalError(err.message || 'Failed to assign transport route');
    } finally {
      setSubmittingTransport(false);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transport?.assignment?.id) return;
    if (!selectedStoppageId) {
      setTransportModalError('Please select a valid stoppage');
      return;
    }
    setSubmittingTransport(true);
    setTransportModalError(null);
    try {
      await transportsApi.reassignStudent(transport.assignment.id, {
        newStoppageId: selectedStoppageId,
        serviceStartDate: serviceStartDate || undefined,
        serviceEndDate: serviceEndDate || undefined,
        reason: endReason || undefined,
      });
      setReassignModalOpen(false);
      setTransportToast('Transport route reassigned successfully!');
      setTimeout(() => setTransportToast(null), 5000);
      await loadData();
    } catch (err: any) {
      setTransportModalError(err.message || 'Failed to reassign transport route');
    } finally {
      setSubmittingTransport(false);
    }
  };

  const handleEndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transport?.assignment?.id) return;
    setSubmittingTransport(true);
    setTransportModalError(null);
    try {
      await transportsApi.endAssignment(transport.assignment.id, {
        reason: endReason || undefined,
        setStudentPreferenceNo: endSetNoPref,
      });
      setEndModalOpen(false);
      setTransportToast('Transport service ended successfully.');
      setTimeout(() => setTransportToast(null), 5000);
      await loadData();
    } catch (err: any) {
      setTransportModalError(err.message || 'Failed to end transport service');
    } finally {
      setSubmittingTransport(false);
    }
  };

  const handleToggleTransportRequirement = async () => {
    if (!student) return;
    const nextReq = !student.transportRequired;
    const targetStoppageId = nextReq
      ? (transport?.assignment?.stoppageId || transport?.history?.[0]?.stoppageId || null)
      : null;
    try {
      await studentsApi.updateProfile(studentId, {
        version: student.version,
        transportRequired: nextReq,
        stoppageId: targetStoppageId,
      });
      setTransportToast(`Transport preference updated to ${nextReq ? 'Required' : 'Not Required'}.`);
      setTimeout(() => setTransportToast(null), 5000);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update transport preference');
    }
  };

  const currentSelectedRoute = transportChoices.find((r) => r.id === selectedRouteId);
  const availableStoppages = currentSelectedRoute ? currentSelectedRoute.stoppages : [];

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '60px auto', textAlign: 'center', color: '#64748b' }}>
        <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 12, fontSize: 14 }}>Loading student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: 24, textAlign: 'center', background: '#ffffff', borderRadius: 12, border: '1px solid #fee2e2' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 18, color: '#991b1b', margin: '0 0 8px' }}>Unable to load student</h2>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 16px' }}>{error || 'Student record was not found'}</p>
        <Link href="/operator/students" className="btn btn-secondary">Return to Directory</Link>
      </div>
    );
  }

  const initials = student.fullName.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
        <Link href="/operator" style={{ color: '#64748b', textDecoration: 'none' }}>Dashboard</Link>
        <span>&rsaquo;</span>
        <Link href="/operator/students" style={{ color: '#64748b', textDecoration: 'none' }}>Students</Link>
        <span>&rsaquo;</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{student.studentCode}</span>
      </div>

      {/* Profile Header Card */}
      <div className="modern-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          {/* Avatar & Identifiers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: student.gender === 'GIRL' ? '#fdf2f8' : '#eff6ff',
                color: student.gender === 'GIRL' ? '#db2777' : '#2563eb',
                border: student.gender === 'GIRL' ? '2px solid #fbcfe8' : '2px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {student.fullName}
                </h1>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: 13,
                    background: '#f1f5f9',
                    color: '#0f172a',
                    padding: '3px 9px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1'
                  }}
                >
                  {student.studentCode}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: student.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                    color: student.status === 'ACTIVE' ? '#166534' : '#991b1b'
                  }}
                >
                  {student.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 13, color: '#64748b' }}>
                <span>
                  🏫 <strong>{student.enrollment?.className || 'Unassigned'}</strong> - Sec {student.enrollment?.sectionName || 'N/A'}
                </span>
                <span>•</span>
                <span>{student.gender === 'BOY' ? 'Boy' : 'Girl'}</span>
                <span>•</span>
                <span>Admitted {new Date(student.admissionDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Link
              href={`/operator/students/${student.id}/admission-form`}
              className="btn"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              🖨️ Print Form
            </Link>

            <button
              type="button"
              onClick={async () => {
                let currentChoices = transportChoices;
                if (currentChoices.length === 0) {
                  currentChoices = await loadTransportChoices();
                }
                if (student) {
                  setEditFullName(student.fullName || '');
                  setEditFatherName(student.fatherName || '');
                  setEditMotherName(student.motherName || '');
                  setEditPhone(student.phone || '');
                  setEditAddress(student.address || '');
                  setEditConcessionType(student.concessionType || 'NONE');
                  setEditConcessionValue(student.concessionValue || 0);
                  const isTrReq = Boolean(student.transportRequired);
                  setEditTransportReq(isTrReq);
                  const rId = transport?.assignment?.routeId || transport?.history?.[0]?.routeId || (isTrReq && currentChoices[0]?.id ? currentChoices[0].id : '');
                  const sId = transport?.assignment?.stoppageId || transport?.history?.[0]?.stoppageId || (isTrReq && currentChoices[0]?.stoppages?.[0]?.id ? currentChoices[0].stoppages[0].id : '');
                  setEditRouteId(rId);
                  setEditStoppageId(sId);
                }
                setEditModalOpen(true);
              }}
              className="btn"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155'
              }}
            >
              Edit Profile
            </button>

            <button
              type="button"
              onClick={() => {
                setNewCode(student.studentCode);
                setRenameModalOpen(true);
              }}
              className="btn"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155'
              }}
            >
              Change Code
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetStatus(student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
                setStatusModalOpen(true);
              }}
              className="btn"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 8,
                border: student.status === 'ACTIVE' ? '1px solid #fecaca' : '1px solid #bbf7d0',
                background: student.status === 'ACTIVE' ? '#fff1f2' : '#f0fdf4',
                color: student.status === 'ACTIVE' ? '#be123c' : '#15803d'
              }}
            >
              {student.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        {(
          [
            ['overview', 'Overview & Academics'],
            ['vault', 'Private Vault (PII)'],
            ['fees', 'Fees'],
            ['transport', 'Transport'],
            ['history', `Identifier History (${history.length})`]
          ] as const
        ).map(([key, label]) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563eb' : '#64748b',
                border: 'none',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {boxSuccess && (
        <div
          style={{
            padding: '10px 16px',
            background: '#ecfdf5',
            border: '1px solid #6ee7b7',
            borderRadius: 8,
            color: '#065f46',
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>✓</span> {boxSuccess}
        </div>
      )}

      {/* Tab 1: Overview & Academics */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          {/* Box 1: Personal & Family Information */}
          <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                Personal & Family Information
              </h3>
              {editingBox !== 'personal' && (
                <button
                  type="button"
                  onClick={() => handleStartEditBox('personal')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {editingBox === 'personal' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveBox('personal'); }}>
                {boxError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>
                    {boxError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={persFullName}
                      onChange={(e) => setPersFullName(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Father Name *</label>
                    <input
                      type="text"
                      required
                      value={persFatherName}
                      onChange={(e) => setPersFatherName(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Mother Name *</label>
                    <input
                      type="text"
                      required
                      value={persMotherName}
                      onChange={(e) => setPersMotherName(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={persDob}
                      onChange={(e) => setPersDob(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Gender</label>
                    <select
                      value={persGender}
                      onChange={(e) => setPersGender(e.target.value as StudentGender)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    >
                      <option value="BOY">Boy</option>
                      <option value="GIRL">Girl</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Nationality</label>
                    <input
                      type="text"
                      value={persNationality}
                      onChange={(e) => setPersNationality(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Blood Group</label>
                    <select
                      value={persBloodGroup}
                      onChange={(e) => setPersBloodGroup(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    >
                      <option value="">None / Unspecified</option>
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
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Family Code</label>
                    <input
                      type="text"
                      value={persFamilyCode}
                      onChange={(e) => setPersFamilyCode(e.target.value)}
                      placeholder="e.g. FAM-001"
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    disabled={savingBox}
                    onClick={() => { setEditingBox(null); setBoxError(null); }}
                    style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBox}
                    style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', background: '#2563eb', color: '#ffffff', cursor: savingBox ? 'not-allowed' : 'pointer', opacity: savingBox ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {savingBox ? 'Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 14px', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>Father Name:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{student.fatherName}</span>

                <span style={{ color: '#64748b' }}>Mother Name:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{student.motherName}</span>

                <span style={{ color: '#64748b' }}>Date of Birth:</span>
                <span style={{ color: '#0f172a' }}>{new Date(student.dob).toLocaleDateString()}</span>

                <span style={{ color: '#64748b' }}>Gender:</span>
                <span style={{ color: '#0f172a' }}>{student.gender === 'BOY' ? 'Boy' : 'Girl'}</span>

                <span style={{ color: '#64748b' }}>Nationality:</span>
                <span style={{ color: '#0f172a' }}>{student.nationality}</span>

                <span style={{ color: '#64748b' }}>Blood Group:</span>
                <span style={{ color: '#0f172a' }}>{student.bloodGroup || 'N/A'}</span>

                <span style={{ color: '#64748b' }}>Family Code:</span>
                <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{student.familyCode || 'None'}</span>
              </div>
            )}
          </div>

          {/* Box 2: Academic & Government Identifiers */}
          <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                Academic & Government Identifiers
              </h3>
              {editingBox !== 'academic' && (
                <button
                  type="button"
                  onClick={() => handleStartEditBox('academic')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {editingBox === 'academic' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveBox('academic'); }}>
                {boxError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>
                    {boxError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Class Enrolled</label>
                    <select
                      value={acadClassId}
                      onChange={(e) => {
                        const newClassId = e.target.value;
                        setAcadClassId(newClassId);
                        const selCls = classes.find((c) => c.id === newClassId);
                        setAcadSectionId(selCls?.sections[0]?.id || '');
                      }}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    >
                      {classes.length === 0 && (
                        <option value={student.enrollment?.classId || ''}>{student.enrollment?.className || 'Current Class'}</option>
                      )}
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Section</label>
                    <select
                      value={acadSectionId}
                      onChange={(e) => setAcadSectionId(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    >
                      {classes.find((c) => c.id === acadClassId)?.sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      )) || (
                        <option value={student.enrollment?.sectionId || ''}>{student.enrollment?.sectionName || 'Section A'}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Admission Date</label>
                    <input
                      type="date"
                      value={acadAdmissionDate}
                      onChange={(e) => setAcadAdmissionDate(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>PEN Number</label>
                    <input
                      type="text"
                      value={acadPen}
                      onChange={(e) => setAcadPen(e.target.value)}
                      placeholder="Permanent Education Number"
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>UDISE Code</label>
                    <input
                      type="text"
                      value={acadUdise}
                      onChange={(e) => setAcadUdise(e.target.value)}
                      placeholder="UDISE / State Code"
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Previous School</label>
                    <input
                      type="text"
                      value={acadPrevSchool}
                      onChange={(e) => setAcadPrevSchool(e.target.value)}
                      placeholder="Previous school name"
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Previous TC Number</label>
                    <input
                      type="text"
                      value={acadPrevTc}
                      onChange={(e) => setAcadPrevTc(e.target.value)}
                      placeholder="Transfer certificate no."
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    disabled={savingBox}
                    onClick={() => { setEditingBox(null); setBoxError(null); }}
                    style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBox}
                    style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', background: '#2563eb', color: '#ffffff', cursor: savingBox ? 'not-allowed' : 'pointer', opacity: savingBox ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {savingBox ? 'Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px 14px', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>Class Enrolled:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{student.enrollment?.className || 'Unassigned'}</span>

                <span style={{ color: '#64748b' }}>Section:</span>
                <span style={{ color: '#0f172a' }}>{student.enrollment?.sectionName || 'N/A'}</span>

                <span style={{ color: '#64748b' }}>Admission Date:</span>
                <span style={{ color: '#0f172a' }}>{new Date(student.admissionDate).toLocaleDateString()}</span>

                <span style={{ color: '#64748b' }}>PEN Number:</span>
                <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{student.penNumber || 'None'}</span>

                <span style={{ color: '#64748b' }}>UDISE Code:</span>
                <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{student.udiseCode || 'None'}</span>

                <span style={{ color: '#64748b' }}>Previous School:</span>
                <span style={{ color: '#0f172a' }}>{student.previousSchool || 'N/A'}</span>

                {student.previousTcNumber && (
                  <>
                    <span style={{ color: '#64748b' }}>Previous TC:</span>
                    <span style={{ color: '#0f172a' }}>{student.previousTcNumber}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Box 3: Contact & Emergency */}
          <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                Contact & Emergency
              </h3>
              {editingBox !== 'contact' && (
                <button
                  type="button"
                  onClick={() => handleStartEditBox('contact')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {editingBox === 'contact' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveBox('contact'); }}>
                {boxError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>
                    {boxError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Primary Phone *</label>
                    <input
                      type="tel"
                      required
                      value={contPhone}
                      onChange={(e) => setContPhone(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Email Address</label>
                    <input
                      type="email"
                      value={contEmail}
                      onChange={(e) => setContEmail(e.target.value)}
                      placeholder="optional"
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Emergency Phone</label>
                    <input
                      type="tel"
                      value={contEmergPhone}
                      onChange={(e) => setContEmergPhone(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Emergency Relation</label>
                    <input
                      type="text"
                      value={contEmergRel}
                      onChange={(e) => setContEmergRel(e.target.value)}
                      placeholder="e.g. Father, Mother"
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Residential Address *</label>
                    <textarea
                      required
                      rows={2}
                      value={contAddress}
                      onChange={(e) => setContAddress(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    disabled={savingBox}
                    onClick={() => { setEditingBox(null); setBoxError(null); }}
                    style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBox}
                    style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', background: '#2563eb', color: '#ffffff', cursor: savingBox ? 'not-allowed' : 'pointer', opacity: savingBox ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {savingBox ? 'Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 14px', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>Primary Phone:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{student.phone}</span>

                <span style={{ color: '#64748b' }}>Email:</span>
                <span style={{ color: '#0f172a' }}>{student.email || 'N/A'}</span>

                <span style={{ color: '#64748b' }}>Emergency Phone:</span>
                <span style={{ color: '#0f172a' }}>{student.emergencyContact} ({student.emergencyRelation})</span>

                <span style={{ color: '#64748b' }}>Address:</span>
                <span style={{ color: '#0f172a' }}>{student.address}</span>
              </div>
            )}
          </div>

          {/* Box 4: Concessions & Transport Policy */}
          <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                Concession & Transport Policy
              </h3>
              {editingBox !== 'policy' && (
                <button
                  type="button"
                  onClick={() => handleStartEditBox('policy')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {editingBox === 'policy' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveBox('policy'); }}>
                {boxError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>
                    {boxError}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Concession Type</label>
                    <select
                      value={polConcessionType}
                      onChange={(e) => {
                        const newType = e.target.value as ConcessionType;
                        setPolConcessionType(newType);
                        if (newType === 'NONE') setPolConcessionValue(0);
                      }}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    >
                      <option value="NONE">None</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  {polConcessionType !== 'NONE' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        {polConcessionType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount (₹)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={polConcessionType === 'PERCENTAGE' ? 100 : undefined}
                        value={polConcessionValue}
                        onChange={(e) => setPolConcessionValue(Number(e.target.value))}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Transport Required</label>
                    <select
                      value={polTransportReq ? 'yes' : 'no'}
                      onChange={(e) => {
                        const isReq = e.target.value === 'yes';
                        setPolTransportReq(isReq);
                        if (isReq) {
                          if (transportChoices.length === 0) {
                            loadTransportChoices().then((loaded) => {
                              if (loaded && loaded.length > 0 && !polRouteId) {
                                setPolRouteId(loaded[0].id);
                                setPolStoppageId(loaded[0].stoppages?.[0]?.id || '');
                              }
                            });
                          } else if (!polRouteId && transportChoices.length > 0) {
                            setPolRouteId(transportChoices[0].id);
                            setPolStoppageId(transportChoices[0].stoppages?.[0]?.id || '');
                          }
                        }
                      }}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                    >
                      <option value="yes">Yes (Required)</option>
                      <option value="no">No (Not Required)</option>
                    </select>
                  </div>
                </div>

                {polTransportReq && (
                  <div style={{ marginTop: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                      Route & Stoppage Allocation (Optional)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Transport Route</label>
                        <select
                          value={polRouteId}
                          onChange={(e) => {
                            const newRouteId = e.target.value;
                            setPolRouteId(newRouteId);
                            const r = transportChoices.find((tc) => tc.id === newRouteId);
                            setPolStoppageId(r?.stoppages?.[0]?.id || '');
                          }}
                          style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                        >
                          <option value="">-- Select Route --</option>
                          {transportChoices.map((route) => (
                            <option key={route.id} value={route.id}>
                              {(route as any).transportNumber || (route as any).routeNumber ? `${(route as any).transportNumber || (route as any).routeNumber} - ` : ''}{route.name || (route as any).routeName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>Stoppage</label>
                        <select
                          value={polStoppageId}
                          disabled={!polRouteId}
                          onChange={(e) => setPolStoppageId(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: polRouteId ? '#fff' : '#f1f5f9', color: '#0f172a', boxSizing: 'border-box' }}
                        >
                          <option value="">-- Select Stoppage --</option>
                          {(transportChoices.find((r) => r.id === polRouteId)?.stoppages || []).map((stop) => (
                            <option key={stop.id} value={stop.id}>
                              {stop.name || (stop as any).stopName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
                      {polStoppageId ? '✅ Stoppage selected. Will activate immediately on save.' : '* If left unassigned, student will remain in Pending Setup until assigned on the Transport page.'}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    disabled={savingBox}
                    onClick={() => { setEditingBox(null); setBoxError(null); }}
                    style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBox}
                    style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', background: '#2563eb', color: '#ffffff', cursor: savingBox ? 'not-allowed' : 'pointer', opacity: savingBox ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {savingBox ? 'Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px 14px', fontSize: 13 }}>
                <span style={{ color: '#64748b' }}>Concession:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {student.concessionType === 'NONE'
                    ? 'None'
                    : student.concessionType === 'PERCENTAGE'
                    ? `${student.concessionValue}% Discount`
                    : `₹${student.concessionValue} Fixed Concession`}
                </span>

                <span style={{ color: '#64748b' }}>Transport Req:</span>
                <span style={{ color: '#0f172a' }}>{student.transportRequired ? 'Yes (Required)' : 'No (Not Required)'}</span>

                <span style={{ color: '#64748b' }}>Setup State:</span>
                <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{student.transportSetupState}</span>

                {transport?.assignment && (
                  <>
                    <span style={{ color: '#64748b' }}>Active Route:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {transport.assignment.routeNumber} - {transport.assignment.routeName}
                    </span>

                    <span style={{ color: '#64748b' }}>Active Stoppage:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {transport.assignment.stoppageName}
                    </span>
                  </>
                )}

                {student.status === 'INACTIVE' && (
                  <>
                    <span style={{ color: '#b91c1c' }}>Deactivation Reason:</span>
                    <span style={{ color: '#b91c1c', fontWeight: 500 }}>{student.deactivationReason || 'N/A'}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Private Vault */}
      {activeTab === 'vault' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Vault Banner */}
          <div className="card" style={{ padding: '16px 20px', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
                Encrypted Private Vault (Masked View)
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Strict zero-exposure policy: All private PII is stored AES-256-GCM encrypted and masked across operator interfaces.
              </p>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 999,
                background: '#dbeafe',
                color: '#1e40af'
              }}
            >
              🔒 Private Vault
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
            {/* Box 5: Identity, Demographics & Health */}
            <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                  Identity, Demographics & Health
                </h3>
                {editingBox !== 'vault-demographics' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditBox('vault-demographics')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#2563eb',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {editingBox === 'vault-demographics' ? (
                <form onSubmit={(e) => { e.preventDefault(); handleSaveBox('vault-demographics'); }}>
                  {boxError && (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>
                      {boxError}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Aadhaar Number
                      </label>
                      <input
                        type="text"
                        value={vaultAadhaar}
                        onChange={(e) => setVaultAadhaar(e.target.value)}
                        placeholder={student.privateProfile?.aadhaarMasked || '12-digit Aadhaar'}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                      <span style={{ fontSize: 11, color: '#64748b' }}>Leave blank to keep current</span>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        PAN Card
                      </label>
                      <input
                        type="text"
                        value={vaultPan}
                        onChange={(e) => setVaultPan(e.target.value)}
                        placeholder={student.privateProfile?.panMasked || '10-char PAN'}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Religion
                      </label>
                      <input
                        type="text"
                        value={vaultReligion}
                        onChange={(e) => setVaultReligion(e.target.value)}
                        placeholder="e.g. Hindu, Muslim, Sikh"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Caste / Category
                      </label>
                      <input
                        type="text"
                        value={vaultCaste}
                        onChange={(e) => setVaultCaste(e.target.value)}
                        placeholder="e.g. General, OBC, SC, ST"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Medical Conditions
                      </label>
                      <input
                        type="text"
                        value={vaultMedical}
                        onChange={(e) => setVaultMedical(e.target.value)}
                        placeholder="Any medical conditions"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Allergies
                      </label>
                      <input
                        type="text"
                        value={vaultAllergies}
                        onChange={(e) => setVaultAllergies(e.target.value)}
                        placeholder="Any allergies"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                    <button
                      type="button"
                      disabled={savingBox}
                      onClick={() => { setEditingBox(null); setBoxError(null); }}
                      style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingBox}
                      style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', background: '#2563eb', color: '#ffffff', cursor: savingBox ? 'not-allowed' : 'pointer', opacity: savingBox ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {savingBox ? 'Saving...' : '💾 Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Aadhaar Number</div>
                    <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                      {student.privateProfile?.aadhaarMasked || '•••• •••• ••••'}
                    </div>
                  </div>
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>PAN Card</div>
                    <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                      {student.privateProfile?.panMasked || 'Not provided'}
                    </div>
                  </div>
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Religion & Caste</div>
                    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>
                      {student.privateProfile?.religion || 'Unspecified'} {student.privateProfile?.caste ? `(${student.privateProfile.caste})` : ''}
                    </div>
                  </div>
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Medical & Allergies</div>
                    <div style={{ fontSize: 12, color: '#0f172a' }}>
                      <div><strong>Conditions:</strong> {student.privateProfile?.medicalConditions || 'None reported'}</div>
                      <div><strong>Allergies:</strong> {student.privateProfile?.allergies || 'None reported'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Box 6: Bank Account Details */}
            <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                  Bank Account Information
                </h3>
                {editingBox !== 'vault-bank' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditBox('vault-bank')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#2563eb',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {editingBox === 'vault-bank' ? (
                <form onSubmit={(e) => { e.preventDefault(); handleSaveBox('vault-bank'); }}>
                  {boxError && (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>
                      {boxError}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={vaultBankName}
                        onChange={(e) => setVaultBankName(e.target.value)}
                        placeholder="e.g. State Bank of India"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={vaultHolderName}
                        onChange={(e) => setVaultHolderName(e.target.value)}
                        placeholder="Name on account"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={vaultAccountNum}
                        onChange={(e) => setVaultAccountNum(e.target.value)}
                        placeholder={student.privateProfile?.bankMasked?.accountNumberMasked || 'Enter account number'}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                      <span style={{ fontSize: 11, color: '#64748b' }}>Leave blank to keep current</span>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={vaultIfsc}
                        onChange={(e) => setVaultIfsc(e.target.value)}
                        placeholder="e.g. SBIN0001234"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Branch Name
                      </label>
                      <input
                        type="text"
                        value={vaultBranch}
                        onChange={(e) => setVaultBranch(e.target.value)}
                        placeholder="Branch name or location"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                    <button
                      type="button"
                      disabled={savingBox}
                      onClick={() => { setEditingBox(null); setBoxError(null); }}
                      style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingBox}
                      style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', background: '#2563eb', color: '#ffffff', cursor: savingBox ? 'not-allowed' : 'pointer', opacity: savingBox ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {savingBox ? 'Saving...' : '💾 Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 13 }}>
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Bank Name</div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.privateProfile?.bankMasked?.bankName || 'Not provided'}</div>
                  </div>
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Account Holder</div>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.privateProfile?.bankMasked?.accountHolderName || 'Not provided'}</div>
                  </div>
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Account Number</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                      {student.privateProfile?.bankMasked?.accountNumberMasked || '•••• •••• ••••'}
                    </div>
                  </div>
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>IFSC & Branch</div>
                    <div style={{ color: '#0f172a' }}>
                      <code>{student.privateProfile?.bankMasked?.ifsc || 'N/A'}</code>
                      {student.privateProfile?.bankMasked?.branch ? ` - ${student.privateProfile.bankMasked.branch}` : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Fees */}
      {activeTab === 'fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header Card */}
          <div
            className="card"
            style={{
              padding: '20px 24px',
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                💳
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                  Student Fee Ledger & Account
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  Live assessed dues, payment records, and official receipts
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                href={`/operator/fees/collect?studentId=${student.id}`}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 0.15s ease',
                }}
              >
                <span>Counter View</span>
                <span>↗</span>
              </Link>

              {student.status === 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => handleOpenCollect()}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: '#16a34a',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <span>+</span>
                  <span>Collect Fee</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Financial Stat Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 16,
            }}
          >
            {/* Card 1: Monthly Base Fee */}
            <div
              className="card"
              style={{
                padding: '18px 20px',
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>
                Monthly Tuition Fee
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                ₹{Number(fees?.baseFee || 0).toLocaleString('en-IN')}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}> / mo</span>
              </div>
              <div>
                {student.concessionType === 'PERCENTAGE' ? (
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {student.concessionValue}% Concession Applied
                  </span>
                ) : student.concessionType === 'FIXED_AMOUNT' ? (
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    ₹{student.concessionValue} Flat Concession
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: '#64748b' }}>Standard class fee slab</span>
                )}
              </div>
            </div>

            {/* Card 2: Total Net Assessed */}
            <div
              className="card"
              style={{
                padding: '18px 20px',
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>
                Total Net Assessed
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                ₹{Number(fees?.netDue || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {feeDues.length} assessed billing period{feeDues.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Card 3: Total Paid */}
            <div
              className="card"
              style={{
                padding: '18px 20px',
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>
                Total Collected / Paid
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>
                ₹{Number(fees?.totalPaid || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {feePayments.length} recorded transaction{feePayments.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Card 4: Outstanding Balance */}
            <div
              className="card"
              style={{
                padding: '18px 20px',
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>
                Outstanding Balance
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: Number(fees?.outstandingBalance || 0) > 0 ? '#dc2626' : '#16a34a',
                  marginBottom: 8,
                }}
              >
                ₹{Number(fees?.outstandingBalance || 0).toLocaleString('en-IN')}
              </div>
              <div>
                {Number(fees?.outstandingBalance || 0) <= 0 ? (
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    ✓ All Fees Cleared
                  </span>
                ) : (
                  <span
                    style={{
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    ⚠️ Payment Outstanding
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Monthly Fee Dues Ledger */}
          <div
            className="card"
            style={{
              padding: 24,
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  Monthly Due Assessments ({feeDues.length})
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  Record of monthly tuition and net charges generated for this student
                </p>
              </div>

              {feeDues.some((d) => d.balance > 0) && student.status === 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => handleOpenCollect()}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Pay Outstanding
                </button>
              )}
            </div>

            {feeDues.length === 0 ? (
              <div
                style={{
                  padding: '32px 20px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                  No fee dues generated yet
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 13, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
                  Fee dues generate automatically for active enrollments when class fee structures are set.
                </p>
                <Link
                  href="/operator/fees/setup"
                  style={{
                    display: 'inline-block',
                    padding: '7px 14px',
                    borderRadius: 6,
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Configure Class Fees →
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        color: '#475569',
                        fontWeight: 600,
                      }}
                    >
                      <th style={{ padding: '10px 14px' }}>Month</th>
                      <th style={{ padding: '10px 14px' }}>Class</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Base Fee</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Concession</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Net Due</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Paid</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Balance</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeDues.map((due) => (
                      <tr
                        key={due.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          color: '#1e293b',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600, fontFamily: 'monospace' }}>
                          {due.feeMonth}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>
                          {due.className || student.enrollment?.className || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          ₹{Number(due.baseAmount).toLocaleString('en-IN')}
                        </td>
                        <td
                          style={{
                            padding: '12px 14px',
                            textAlign: 'right',
                            color: Number(due.concessionAmount) > 0 ? '#059669' : '#94a3b8',
                          }}
                        >
                          {Number(due.concessionAmount) > 0
                            ? `-₹${Number(due.concessionAmount).toLocaleString('en-IN')}`
                            : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                          ₹{Number(due.netDue).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: '#16a34a' }}>
                          ₹{Number(due.paidAmount).toLocaleString('en-IN')}
                        </td>
                        <td
                          style={{
                            padding: '12px 14px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: Number(due.balance) > 0 ? '#dc2626' : '#16a34a',
                          }}
                        >
                          ₹{Number(due.balance).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background:
                                due.status === 'PAID'
                                  ? '#dcfce7'
                                  : due.status === 'PARTIAL'
                                  ? '#fef3c7'
                                  : '#fee2e2',
                              color:
                                due.status === 'PAID'
                                  ? '#15803d'
                                  : due.status === 'PARTIAL'
                                  ? '#b45309'
                                  : '#b91c1c',
                            }}
                          >
                            {due.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {Number(due.balance) > 0 && student.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCollect(due)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                background: '#16a34a',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Collect
                            </button>
                          ) : (
                            <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 600 }}>
                              ✓ Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Payment History & Receipts */}
          <div
            className="card"
            style={{
              padding: 24,
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                Payment Transactions & Receipts ({feePayments.length})
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
                Complete payment ledger and receipts generated for this student
              </p>
            </div>

            {feePayments.length === 0 ? (
              <div
                style={{
                  padding: '24px 20px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                No payment transactions recorded for this student yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        color: '#475569',
                        fontWeight: 600,
                      }}
                    >
                      <th style={{ padding: '10px 14px' }}>Receipt #</th>
                      <th style={{ padding: '10px 14px' }}>Date</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '10px 14px' }}>Payment Mode</th>
                      <th style={{ padding: '10px 14px' }}>Reference</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feePayments.map((p) => (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          color: '#1e293b',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600, fontFamily: 'monospace', color: '#2563eb' }}>
                          {p.receiptNumber}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>
                          {p.paymentDate}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#475569',
                            }}
                          >
                            {p.mode}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>
                          {p.reference || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: p.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                              color: p.status === 'ACTIVE' ? '#15803d' : '#64748b',
                            }}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(p.id)}
                            disabled={loadingReceipt}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#2563eb',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            View Receipt
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

      {/* Tab 4: Transport */}
      {activeTab === 'transport' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Toast Notification */}
          {transportToast && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                fontSize: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✅</span>
                <strong>{transportToast}</strong>
              </div>
              <button
                type="button"
                onClick={() => setTransportToast(null)}
                style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Status & Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ padding: 16, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>Transport Requirement</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: student.transportRequired ? '#0f172a' : '#64748b' }}>
                  {student.transportRequired ? 'Requested by Guardian' : 'Not Requested'}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: student.transportRequired ? '#dcfce7' : '#f1f5f9',
                    color: student.transportRequired ? '#15803d' : '#64748b',
                  }}
                >
                  {student.transportRequired ? 'YES' : 'NO'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleTransportRequirement}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 11.5,
                  color: '#2563eb',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {student.transportRequired ? 'Mark as Not Required' : 'Mark as Required'}
              </button>
            </div>

            <div style={{ padding: 16, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>Setup State</div>
              <div style={{ marginBottom: 4 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    background:
                      student.transportSetupState === 'ACTIVE'
                        ? '#dcfce7'
                        : student.transportSetupState === 'SETUP_PENDING'
                        ? '#fef3c7'
                        : '#f1f5f9',
                    color:
                      student.transportSetupState === 'ACTIVE'
                        ? '#15803d'
                        : student.transportSetupState === 'SETUP_PENDING'
                        ? '#b45309'
                        : '#475569',
                  }}
                >
                  {student.transportSetupState}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                {student.transportSetupState === 'ACTIVE'
                  ? 'Assigned to active route'
                  : student.transportSetupState === 'SETUP_PENDING'
                  ? 'Route assignment pending'
                  : 'No transport service'}
              </div>
            </div>

            <div style={{ padding: 16, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>Assigned Route</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: transport?.assignment ? '#0f172a' : '#94a3b8' }}>
                {transport?.assignment?.routeName || 'None Allocated'}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                {transport?.assignment?.routeNumber ? `Code: ${transport.assignment.routeNumber}` : '—'}
              </div>
            </div>

            <div style={{ padding: 16, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>Boarding Stoppage</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: transport?.assignment ? '#0f172a' : '#94a3b8' }}>
                {transport?.assignment?.stoppageName ? `📍 ${transport.assignment.stoppageName}` : 'None Allocated'}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                {transport?.assignment?.vehicleNumber ? `Vehicle: ${transport.assignment.vehicleNumber}` : '—'}
              </div>
            </div>
          </div>

          {/* Active Assignment Card or Empty State */}
          {transport?.assignment ? (
            <div
              className="card"
              style={{
                padding: 24,
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #bae6fd',
                boxShadow: '0 2px 6px rgba(14, 165, 233, 0.08)',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  paddingBottom: 18,
                  borderBottom: '1px solid #e0f2fe',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: '#e0f2fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                    }}
                  >
                    🚌
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                        {transport.assignment.routeName}
                      </h3>
                      {transport.assignment.routeNumber && (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: '#f1f5f9',
                            color: '#334155',
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: 'monospace',
                          }}
                        >
                          {transport.assignment.routeNumber}
                        </span>
                      )}
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        ● Active Route
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                      Pickup & drop service currently allocated to this student
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleOpenReassignModal}
                    className="btn"
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span>🔄</span> Reassign Route / Stop
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenEndModal}
                    className="btn"
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid #fca5a5',
                      color: '#dc2626',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <span>⏹️</span> End Service
                  </button>

                  <Link
                    href={`/operator/transports/assignments?query=${encodeURIComponent(student.studentCode)}`}
                    className="btn"
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>📋</span> View in Directory
                  </Link>
                </div>
              </div>

              {/* Assignment Details Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    Designated Stoppage
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    📍 {transport.assignment.stoppageName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    Vehicle Registration
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                    🚌 {transport.assignment.vehicleNumber || 'Unassigned'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    Daily Route Schedule
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span>🌅 Pickup: <strong>{transport.assignment.pickupTime || 'Not set'}</strong></span>
                    <span>🌇 Drop: <strong>{transport.assignment.dropTime || 'Not set'}</strong></span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    Service Window
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                    <div>From: <strong>{transport.assignment.serviceStartDate || 'Immediate'}</strong></div>
                    <div style={{ color: transport.assignment.serviceEndDate ? '#0f172a' : '#64748b' }}>
                      To: <strong>{transport.assignment.serviceEndDate || 'Ongoing / Indefinite'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* No Active Assignment Card */
            <div
              className="card"
              style={{
                padding: '32px 24px',
                background: '#ffffff',
                borderRadius: 12,
                border: '1px dashed #cbd5e1',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  margin: '0 auto 16px',
                }}
              >
                🚌
              </div>

              <h4 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                No Active Transport Route Assigned
              </h4>

              <p style={{ margin: '0 auto 20px', maxWidth: 520, fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
                {student.transportRequired
                  ? 'The guardian requested transport service for this student during admission, but no route or stoppage has been allocated yet. Click below to assign an active route and stoppage.'
                  : 'Transport service is currently marked as not required for this student. You can assign a route and stoppage at any time when transport is needed.'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleOpenAssignModal}
                  className="btn"
                  style={{
                    padding: '9px 20px',
                    borderRadius: 6,
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: 13.5,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  <span>➕</span> Assign Transport Route & Stop
                </button>

                <Link
                  href="/operator/transports"
                  className="btn"
                  style={{
                    padding: '9px 18px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontSize: 13.5,
                    fontWeight: 500,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  Manage Routes & Stoppages
                </Link>
              </div>
            </div>
          )}

          {/* Transport History Section */}
          <div className="card" style={{ padding: 24, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  Transport Assignment History
                </h4>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Audit log of current and past transport allocations
                </div>
              </div>
              {transport?.history && transport.history.length > 0 && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: '#f1f5f9',
                    color: '#475569',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {transport.history.length} {transport.history.length === 1 ? 'Record' : 'Records'}
                </span>
              )}
            </div>

            {transport?.history && transport.history.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Route</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Stoppage</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Vehicle</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Schedule</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Service Period</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>End Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transport.history.map((item: any, idx: number) => (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: item.status === 'ACTIVE' ? '#f0fdf4' : '#ffffff',
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {item.routeName}
                          {item.routeNumber && (
                            <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 400 }}>
                              {item.routeNumber}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#1e293b' }}>
                          📍 {item.stoppageName}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontFamily: 'monospace' }}>
                          {item.vehicleNumber || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>
                          {item.pickupTime || item.dropTime ? (
                            <span>{item.pickupTime || '—'} / {item.dropTime || '—'}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                          {item.serviceStartDate || '—'} &rarr; {item.serviceEndDate || 'Ongoing'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              background: item.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                              color: item.status === 'ACTIVE' ? '#15803d' : '#64748b',
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>
                          {item.endedReason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
                No transport history records available for this student.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Identifier History */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: 24, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
            Student Code Mutation & Rename Audit
          </h3>

          {history.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
              No identifier renames recorded. The student has held code <code>{student.studentCode}</code> since admission.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Previous Code</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>New Code</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Reason</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#b91c1c' }}>
                        {item.oldCode}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>
                        {item.newCode}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {item.reason || 'Manual code reassignment'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>
                        {new Date(item.changedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Change Identifier (Rename) */}
      {renameModalOpen && (
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
            zIndex: 100,
            padding: 20
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Change Student Code
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Renaming a student code updates the primary identifier and permanently records the transition in audit history.
            </p>

            {renameError && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                {renameError}
              </div>
            )}

            <form onSubmit={handleRename}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  New Student Code *
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'monospace', textTransform: 'uppercase', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Reason for Change
                </label>
                <input
                  type="text"
                  placeholder="e.g. Correction of typo / system migration"
                  value={renameReason}
                  onChange={e => setRenameReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  className="btn"
                  style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renaming}
                  className="btn"
                  style={{ padding: '7px 16px', borderRadius: 6, background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 600 }}
                >
                  {renaming ? 'Updating...' : 'Confirm Rename'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Status */}
      {statusModalOpen && (
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
            zIndex: 100,
            padding: 20
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              {targetStatus === 'INACTIVE' ? 'Deactivate Student' : 'Reactivate Student'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              {targetStatus === 'INACTIVE'
                ? 'Deactivating a student removes them from active enrollment counts. A mandatory reason is required.'
                : 'Reactivating this student will restore their active status in directory and reports.'}
            </p>

            {statusError && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                {statusError}
              </div>
            )}

            <form onSubmit={handleStatusChange}>
              {targetStatus === 'INACTIVE' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Deactivation Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. TC issued, transfer to another school, fee default, etc."
                    value={statusReason}
                    onChange={e => setStatusReason(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="btn"
                  style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="btn"
                  style={{
                    padding: '7px 16px',
                    borderRadius: 6,
                    background: targetStatus === 'INACTIVE' ? '#dc2626' : '#16a34a',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  {updatingStatus ? 'Updating...' : targetStatus === 'INACTIVE' ? 'Deactivate Student' : 'Reactivate Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Profile */}
      {editModalOpen && (
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
            zIndex: 100,
            padding: 20
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 540,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Edit Student Details
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Update student information. Concurrency protected via optimistic version lock.
            </p>

            {editError && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Father Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFatherName}
                    onChange={e => setEditFatherName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Mother Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editMotherName}
                    onChange={e => setEditMotherName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Residential Address
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Fee Concession
                  </label>
                  <select
                    value={editConcessionType}
                    onChange={(e) => {
                      const t = e.target.value as ConcessionType;
                      setEditConcessionType(t);
                      if (t === 'NONE') setEditConcessionValue(0);
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  >
                    <option value="NONE">None</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                  </select>
                </div>

                {editConcessionType !== 'NONE' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      {editConcessionType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount (₹)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={editConcessionType === 'PERCENTAGE' ? 100 : undefined}
                      value={editConcessionValue}
                      onChange={(e) => setEditConcessionValue(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Transport Requirement
                    </label>
                    <select
                      value={editTransportReq ? 'yes' : 'no'}
                      onChange={(e) => {
                        const isReq = e.target.value === 'yes';
                        setEditTransportReq(isReq);
                        if (isReq) {
                          if (transportChoices.length === 0) {
                            loadTransportChoices().then((loaded) => {
                              if (loaded && loaded.length > 0 && !editRouteId) {
                                setEditRouteId(loaded[0].id);
                                setEditStoppageId(loaded[0].stoppages?.[0]?.id || '');
                              }
                            });
                          } else if (!editRouteId && transportChoices.length > 0) {
                            setEditRouteId(transportChoices[0].id);
                            setEditStoppageId(transportChoices[0].stoppages?.[0]?.id || '');
                          }
                        }
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                    >
                      <option value="yes">Yes (Required)</option>
                      <option value="no">No (Not Required)</option>
                    </select>
                  </div>
                )}

                {editConcessionType !== 'NONE' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Transport Requirement
                    </label>
                    <select
                      value={editTransportReq ? 'yes' : 'no'}
                      onChange={(e) => {
                        const isReq = e.target.value === 'yes';
                        setEditTransportReq(isReq);
                        if (isReq) {
                          if (transportChoices.length === 0) {
                            loadTransportChoices().then((loaded) => {
                              if (loaded && loaded.length > 0 && !editRouteId) {
                                setEditRouteId(loaded[0].id);
                                setEditStoppageId(loaded[0].stoppages?.[0]?.id || '');
                              }
                            });
                          } else if (!editRouteId && transportChoices.length > 0) {
                            setEditRouteId(transportChoices[0].id);
                            setEditStoppageId(transportChoices[0].stoppages?.[0]?.id || '');
                          }
                        }
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                    >
                      <option value="yes">Yes (Required)</option>
                      <option value="no">No (Not Required)</option>
                    </select>
                  </div>
                )}

                {editTransportReq && (
                  <div style={{ gridColumn: 'span 2', padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                      Route & Stoppage Allocation
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
                          Transport Route
                        </label>
                        <select
                          value={editRouteId}
                          onChange={(e) => {
                            const newRouteId = e.target.value;
                            setEditRouteId(newRouteId);
                            const r = transportChoices.find((tc) => tc.id === newRouteId);
                            setEditStoppageId(r?.stoppages?.[0]?.id || '');
                          }}
                          style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', boxSizing: 'border-box' }}
                        >
                          <option value="">-- Select Route --</option>
                          {transportChoices.map((route) => (
                            <option key={route.id} value={route.id}>
                              {(route as any).transportNumber || (route as any).routeNumber ? `${(route as any).transportNumber || (route as any).routeNumber} - ` : ''}{route.name || (route as any).routeName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
                          Stoppage
                        </label>
                        <select
                          value={editStoppageId}
                          disabled={!editRouteId}
                          onChange={(e) => setEditStoppageId(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1', background: editRouteId ? '#fff' : '#f1f5f9', color: '#0f172a', boxSizing: 'border-box' }}
                        >
                          <option value="">-- Select Stoppage --</option>
                          {(transportChoices.find((r) => r.id === editRouteId)?.stoppages || []).map((stop) => (
                            <option key={stop.id} value={stop.id}>
                              {stop.name || (stop as any).stopName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn"
                  style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn"
                  style={{ padding: '7px 16px', borderRadius: 6, background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 600 }}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Fee Modal */}
      {collectModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingPayment) setCollectModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>💳</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Collect Student Fee
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCollectModalOpen(false)}
                disabled={submittingPayment}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 13 }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>Student</div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {student?.fullName} <span style={{ color: '#64748b', fontWeight: 400 }}>({student?.studentCode})</span>
              </div>
            </div>

            {collectError && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, marginBottom: 16 }}>
                {collectError}
              </div>
            )}

            <form onSubmit={handleCollectPayment}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Select Fee Period / Due Month *
                </label>
                <select
                  value={collectDueId}
                  onChange={(e) => handleDueSelect(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', background: '#ffffff' }}
                >
                  {feeDues.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.feeMonth} — Net: ₹{d.netDue} | Paid: ₹{d.paidAmount} | Bal: ₹{d.balance} ({d.status})
                    </option>
                  ))}
                  {feeDues.length === 0 && (
                    <option value="" disabled>No dues available</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={collectAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Payment Mode *
                  </label>
                  <select
                    value={collectMode}
                    onChange={(e) => setCollectMode(e.target.value as PaymentMode)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', background: '#ffffff' }}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={collectDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Reference / Cheque #
                  </label>
                  <input
                    type="text"
                    placeholder="Optional reference"
                    value={collectReference}
                    onChange={(e) => setCollectReference(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCollectModalOpen(false)}
                  disabled={submittingPayment}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 13,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || !collectDueId}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: submittingPayment ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingPayment ? 'Recording...' : `Collect ₹${collectAmount || '0'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {receiptModalOpen && selectedReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReceiptModalOpen(false);
          }}
        >
          <div
            id="printable-receipt-modal"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: 580,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🧾</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                  Official Fee Receipt
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  id="btn-print-receipt"
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '7px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>🖨️</span> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '7px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>

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
                  {selectedReceipt.schoolName}
                </h2>
                {selectedReceipt.schoolAddress && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{selectedReceipt.schoolAddress}</p>
                )}
                {selectedReceipt.schoolPhone && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>Phone: {selectedReceipt.schoolPhone}</p>
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
                  Receipt No: <strong>{selectedReceipt.receiptNumber}</strong>
                </div>
                <div>
                  Date: <strong>{selectedReceipt.paymentDate}</strong>
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
                  Student: <strong style={{ color: '#0f172a' }}>{selectedReceipt.studentName}</strong>
                </div>
                <div>
                  Student ID: <strong style={{ color: '#0f172a' }}>{selectedReceipt.studentCode}</strong>
                </div>
                <div>
                  Class: <strong>{selectedReceipt.className || student?.enrollment?.className || 'General'}</strong>
                </div>
                <div>
                  Fee Month: <strong>{selectedReceipt.feeMonth}</strong>
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
                    <td style={{ textAlign: 'right', padding: '6px 0' }}>₹{Number(selectedReceipt.baseAmount).toFixed(2)}</td>
                  </tr>
                  {Number(selectedReceipt.concessionAmount) > 0 && (
                    <tr style={{ color: '#059669' }}>
                      <td style={{ padding: '6px 0' }}>Concession Applied</td>
                      <td style={{ textAlign: 'right', padding: '6px 0' }}>-₹{Number(selectedReceipt.concessionAmount).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr style={{ fontWeight: 600, borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 0' }}>Net Due</td>
                    <td style={{ textAlign: 'right', padding: '6px 0' }}>₹{Number(selectedReceipt.netDue).toFixed(2)}</td>
                  </tr>
                  <tr style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', borderTop: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '10px 0' }}>Amount Paid (This Receipt)</td>
                    <td style={{ textAlign: 'right', padding: '10px 0' }}>₹{Number(selectedReceipt.amountPaidThisReceipt).toFixed(2)}</td>
                  </tr>
                  <tr style={{ color: '#64748b', fontSize: 12 }}>
                    <td style={{ padding: '4px 0' }}>Remaining Balance</td>
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>₹{Number(selectedReceipt.remainingBalance).toFixed(2)}</td>
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
                  <div>Mode: <strong>{selectedReceipt.paymentMode}</strong></div>
                  {selectedReceipt.reference && <div>Ref: {selectedReceipt.reference}</div>}
                  <div>Status: <strong style={{ color: '#059669' }}>{selectedReceipt.status}</strong></div>
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

      {/* Assign Transport Modal */}
      {assignModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingTransport) setAssignModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: 500,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🚌</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Assign Transport Route
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                disabled={submittingTransport}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 13 }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>Student</div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {student?.fullName} <span style={{ color: '#64748b', fontWeight: 400 }}>({student?.studentCode})</span>
              </div>
            </div>

            {transportModalError && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, marginBottom: 16 }}>
                {transportModalError}
              </div>
            )}

            {student && !student.transportRequired && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: 12.5, marginBottom: 16 }}>
                ℹ️ Note: This student currently has transport requirement marked as No. Assigning a route will automatically update their profile preference to Required.
              </div>
            )}

            {loadingChoices ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                <div style={{ display: 'inline-block', width: 22, height: 22, border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: 8, fontSize: 13 }}>Loading available routes...</p>
              </div>
            ) : transportChoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: 13 }}>
                No active routes found. Please create routes and stoppages in the Transport Management module first.
              </div>
            ) : (
              <form onSubmit={handleAssignSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Select Route *
                  </label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => {
                      const rId = e.target.value;
                      setSelectedRouteId(rId);
                      const targetRoute = transportChoices.find((r) => r.id === rId);
                      if (targetRoute && targetRoute.stoppages.length > 0) {
                        setSelectedStoppageId(targetRoute.stoppages[0].id);
                      } else {
                        setSelectedStoppageId('');
                      }
                    }}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', background: '#ffffff' }}
                  >
                    {transportChoices.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.transportNumber}) {r.vehicleNumber ? `— Vehicle: ${r.vehicleNumber}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Select Stoppage *
                  </label>
                  <select
                    value={selectedStoppageId}
                    onChange={(e) => setSelectedStoppageId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', background: '#ffffff' }}
                  >
                    {availableStoppages.map((s) => (
                      <option key={s.id} value={s.id}>
                        📍 {s.name} (Stop #{s.sortOrder})
                      </option>
                    ))}
                    {availableStoppages.length === 0 && (
                      <option value="" disabled>No stoppages configured for this route</option>
                    )}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Service Start Date *
                    </label>
                    <input
                      type="date"
                      value={serviceStartDate}
                      onChange={(e) => setServiceStartDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Service End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={serviceEndDate}
                      onChange={(e) => setServiceEndDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    disabled={submittingTransport}
                    className="btn"
                    style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTransport || !selectedStoppageId}
                    className="btn"
                    style={{
                      padding: '7px 16px',
                      borderRadius: 6,
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {submittingTransport ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reassign Transport Modal */}
      {reassignModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingTransport) setReassignModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: 500,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🔄</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Reassign Transport Route / Stop
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                disabled={submittingTransport}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 13 }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>Current Assignment</div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                {transport?.assignment?.routeName} &bull; 📍 {transport?.assignment?.stoppageName}
              </div>
            </div>

            {transportModalError && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, marginBottom: 16 }}>
                {transportModalError}
              </div>
            )}

            <form onSubmit={handleReassignSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  New Route *
                </label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => {
                    const rId = e.target.value;
                    setSelectedRouteId(rId);
                    const targetRoute = transportChoices.find((r) => r.id === rId);
                    if (targetRoute && targetRoute.stoppages.length > 0) {
                      setSelectedStoppageId(targetRoute.stoppages[0].id);
                    } else {
                      setSelectedStoppageId('');
                    }
                  }}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', background: '#ffffff' }}
                >
                  {transportChoices.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.transportNumber}) {r.vehicleNumber ? `— Vehicle: ${r.vehicleNumber}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  New Stoppage *
                </label>
                <select
                  value={selectedStoppageId}
                  onChange={(e) => setSelectedStoppageId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', background: '#ffffff' }}
                >
                  {availableStoppages.map((s) => (
                    <option key={s.id} value={s.id}>
                      📍 {s.name} (Stop #{s.sortOrder})
                    </option>
                  ))}
                  {availableStoppages.length === 0 && (
                    <option value="" disabled>No stoppages configured for this route</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Effective Start Date *
                  </label>
                  <input
                    type="date"
                    value={serviceStartDate}
                    onChange={(e) => setServiceStartDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    New End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={serviceEndDate}
                    onChange={(e) => setServiceEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Reason for Reassignment (Optional)
                </label>
                <input
                  type="text"
                  value={endReason}
                  onChange={(e) => setEndReason(e.target.value)}
                  placeholder="e.g. Change of residence, route optimization"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  disabled={submittingTransport}
                  className="btn"
                  style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTransport || !selectedStoppageId}
                  className="btn"
                  style={{
                    padding: '7px 16px',
                    borderRadius: 6,
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {submittingTransport ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End Transport Service Modal */}
      {endModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingTransport) setEndModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#dc2626' }}>
                  End Transport Service
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEndModalOpen(false)}
                disabled={submittingTransport}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
              Are you sure you want to end active transport service for <strong>{student?.fullName}</strong>?
            </p>

            <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 13 }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>Active Assignment to be ended:</div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                {transport?.assignment?.routeName} &bull; 📍 {transport?.assignment?.stoppageName}
              </div>
            </div>

            {transportModalError && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, marginBottom: 16 }}>
                {transportModalError}
              </div>
            )}

            <form onSubmit={handleEndSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Reason for Ending Service (Optional)
                </label>
                <input
                  type="text"
                  value={endReason}
                  onChange={(e) => setEndReason(e.target.value)}
                  placeholder="e.g. Guardian requested cancellation, moved residence"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={endSetNoPref}
                    onChange={(e) => setEndSetNoPref(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>Mark transport preference as <strong>Not Required</strong> for this student</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setEndModalOpen(false)}
                  disabled={submittingTransport}
                  className="btn"
                  style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTransport}
                  className="btn"
                  style={{
                    padding: '7px 16px',
                    borderRadius: 6,
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {submittingTransport ? 'Ending Service...' : 'Confirm End Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-modal,
          #printable-receipt-modal * {
            visibility: visible !important;
          }
          #printable-receipt-modal {
            position: fixed !important;
            inset: 0 !important;
            max-width: 100% !important;
            max-height: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 10px !important;
            margin: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
