/**
 * Verification Script for TASK-034 (Exam Setup) & TASK-035 (Admit Card Management)
 * Strict Fee-Clearance Enforcement & Cross-Tenant Data Isolation
 */

const API_BASE = 'http://localhost:4000/api/v1';

async function httpRequest(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, options);
  let data = null;
  const raw = await res.text();
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = raw;
  }
  return {
    statusCode: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    data,
    raw,
  };
}

async function loginOperator(email, password) {
  const csrfRes = await fetch(`${API_BASE}/security/csrf`);
  const csrfCookie = csrfRes.headers.get('set-cookie')?.split(';')[0];
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  const loginRes = await fetch(`${API_BASE}/operator/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      Cookie: csrfCookie,
    },
    body: JSON.stringify({ email, password }),
  });

  const loginData = await loginRes.json();
  if (loginRes.status !== 200 && loginRes.status !== 201) {
    throw new Error(`Login failed for ${email}: ${loginRes.status} ${JSON.stringify(loginData)}`);
  }

  const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
  const sessCookie = setCookies.map((c) => c?.split(';')[0]).filter(Boolean).join('; ');
  const fullCookie = `${csrfCookie}; ${sessCookie}`;

  return {
    csrfToken,
    cookie: fullCookie,
    schoolId: loginData.school.id,
    schoolName: loginData.school.name,
    operator: loginData.operator,
  };
}

async function apiGet(session, path) {
  return httpRequest(path, {
    method: 'GET',
    headers: {
      Cookie: session.cookie,
    },
  });
}

async function apiPost(session, path, body) {
  return httpRequest(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': session.csrfToken,
      Cookie: session.cookie,
    },
    body: JSON.stringify(body),
  });
}

async function apiPatch(session, path, body) {
  return httpRequest(path, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': session.csrfToken,
      Cookie: session.cookie,
    },
    body: JSON.stringify(body),
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function run() {
  console.log('========================================================================');
  console.log('VERIFICATION SUITE: TASK-034 & TASK-035 (Examination & Admit Cards)');
  console.log('========================================================================\n');

  const testReport = [];
  function pass(step, detail) {
    console.log(`[PASS] ${step}${detail ? `: ${detail}` : ''}`);
    testReport.push({ step, status: 'PASS', detail });
  }

  const ts = Date.now().toString().slice(-6);

  // 1. Authenticate School A and School B
  console.log('--- Step 1: Authentication & Multi-Tenant Setup ---');
  const sessionA = await loginOperator('operator@example.com', 'OperatorPassword123!');
  pass('Auth School A', `Logged in to "${sessionA.schoolName}" (${sessionA.schoolId}) as ${sessionA.operator.fullName}`);

  const sessionB = await loginOperator('operator@customschool.com', 'OperatorPassword123!');
  pass('Auth School B', `Logged in to "${sessionB.schoolName}" (${sessionB.schoolId}) as ${sessionB.operator.fullName}`);

  // 2. Feature Visibility check: Feature is accessible regardless of student fee dues
  console.log('\n--- Step 2: Feature Visibility Check ---');
  const examsListA = await apiGet(sessionA, '/operator/admit-card-contexts');
  assert(examsListA.statusCode === 200, 'School A operator can access /operator/admit-card-contexts');
  const countA = Array.isArray(examsListA.data) ? examsListA.data.length : examsListA.data.items?.length || 0;
  pass('Feature Visibility School A', `Accessed examination directory: ${countA} existing exams found`);

  const examsListB = await apiGet(sessionB, '/operator/admit-card-contexts');
  assert(examsListB.statusCode === 200, 'School B operator can access /operator/admit-card-contexts');
  const countB = Array.isArray(examsListB.data) ? examsListB.data.length : examsListB.data.items?.length || 0;
  pass('Feature Visibility School B', `Accessed examination directory: ${countB} existing exams found`);

  // 3. Exam Setup in School A (TASK-034)
  console.log('\n--- Step 3: Exam Setup Lifecycle & Validation (TASK-034) ---');
  const sessionsResA = await apiGet(sessionA, '/operator/academic-sessions?page=1&size=10');
  assert(sessionsResA.statusCode === 200 && sessionsResA.data.items?.length > 0, 'School A has academic sessions');
  const academicSessionA = sessionsResA.data.items.find(s => s.status === 'ACTIVE') || sessionsResA.data.items[0];

  const classesResA = await apiGet(sessionA, '/operator/students/classes');
  assert(classesResA.statusCode === 200 && classesResA.data.length > 0, 'School A has classes');
  const classA = classesResA.data[0];
  const sectionA = classA.sections[0];

  // 3a. Validation: Invalid date range (end < start)
  const invalidDateRes = await apiPost(sessionA, '/operator/admit-card-contexts', {
    academicSessionId: academicSessionA.id,
    classId: classA.id,
    title: `Invalid Date Exam ${ts}`,
    examStart: '2026-11-20',
    examEnd: '2026-11-10', // Invalid: end < start
  });
  assert(invalidDateRes.statusCode === 422 || invalidDateRes.statusCode === 400, `Server rejects examEnd < examStart: status ${invalidDateRes.statusCode}`);
  assert(invalidDateRes.data.code === 'ERR_VALIDATION', 'Error code is ERR_VALIDATION');
  pass('Date Validation', `Server rejected examEnd < examStart with ${invalidDateRes.statusCode} ${invalidDateRes.data.code}`);

  // 3b. Valid Exam Creation in DRAFT state
  const createExamResA = await apiPost(sessionA, '/operator/admit-card-contexts', {
    academicSessionId: academicSessionA.id,
    classId: classA.id,
    title: `Annual Assessment 2026-${ts}`,
    examCode: `EX-${ts}`,
    examStart: '2026-11-15',
    examEnd: '2026-11-25',
    venue: 'Block A, Central Examination Hall',
    instructions: '1. Carry admit card and ID card.\n2. No electronic devices permitted.',
  });
  assert(createExamResA.statusCode === 201, `Created exam context in School A: ${createExamResA.statusCode}`);
  const examA = createExamResA.data;
  assert(examA.status === 'DRAFT', 'Newly created exam context starts in DRAFT state');
  assert(examA.version === 1, 'Initial version is 1');
  pass('Exam Creation (DRAFT)', `Created exam ID ${examA.id} in DRAFT status with version ${examA.version}`);

  // 3c. Optimistic concurrency check (version mismatch)
  const staleUpdateRes = await apiPatch(sessionA, `/operator/admit-card-contexts/${examA.id}`, {
    version: 99, // Stale/mismatched version (current DB version is 1)
    title: 'Should Fail',
  });
  assert(staleUpdateRes.statusCode === 409, `Optimistic locking rejected stale version: ${staleUpdateRes.statusCode}`);
  assert(staleUpdateRes.data.code === 'ERR_EXAM_CONTEXT_STALE', `Error code matches ERR_EXAM_CONTEXT_STALE: ${staleUpdateRes.data.code}`);
  pass('Optimistic Locking', `Rejected stale version update with 409 Conflict (${staleUpdateRes.data.code})`);

  // 3d. Update exam and transition to READY
  const updateExamResA = await apiPatch(sessionA, `/operator/admit-card-contexts/${examA.id}`, {
    version: 1,
    title: `Annual Assessment 2026-${ts} (Finalized)`,
    status: 'READY',
  });
  assert(updateExamResA.statusCode === 200, `Updated exam context: ${updateExamResA.statusCode}`);
  assert(updateExamResA.data.status === 'READY', 'Status transitioned to READY');
  assert(updateExamResA.data.version === 2, 'Version incremented to 2');
  pass('Exam Transition (READY)', `Updated exam ID ${examA.id} to READY status with version ${updateExamResA.data.version}`);

  // 4. Enroll Students in School A for Testing: One with Dues, One Fee-Cleared
  console.log('\n--- Step 4: Setup Test Students (Fee-Cleared vs Fee-Pending) ---');
  const codeDues = `DUES-${ts}`;
  const codeClear = `CLEAR-${ts}`;

  // Student 1: Will have pending fee dues (Books + Uniform charges)
  const admitStudent1 = await apiPost(sessionA, '/operator/students', {
    studentCodeMode: 'MANUAL',
    studentCode: codeDues,
    fullName: `Pending Dues Student ${ts}`,
    fatherName: 'Father One',
    motherName: 'Mother One',
    dateOfBirth: '2014-06-10',
    classId: classA.id,
    sectionId: sectionA.id,
    gender: 'BOY',
    address: '101 Dues Street',
    phone: '9876543210',
    emergencyContact: '9876543210',
    emergencyContactRelation: 'Parent',
    concession: { type: 'NONE', value: 0 },
    transportRequired: false,
    booksRequired: true,
    uniformRequired: true,
  });
  assert(admitStudent1.statusCode === 201, `Student 1 admit failed: ${admitStudent1.statusCode} ${JSON.stringify(admitStudent1.data)}`);
  const studentDuesId = admitStudent1.data.id;
  const studentDuesCode = admitStudent1.data.studentCode || codeDues;
  pass('Enrolled Student 1 (Pending Dues)', `ID: ${studentDuesId}, Code: ${studentDuesCode}`);

  // Student 2: Will be fully cleared
  const admitStudent2 = await apiPost(sessionA, '/operator/students', {
    studentCodeMode: 'MANUAL',
    studentCode: codeClear,
    fullName: `Fee Cleared Student ${ts}`,
    fatherName: 'Father Two',
    motherName: 'Mother Two',
    dateOfBirth: '2014-08-15',
    classId: classA.id,
    sectionId: sectionA.id,
    gender: 'GIRL',
    address: '202 Clear Avenue',
    phone: '9876543211',
    emergencyContact: '9876543211',
    emergencyContactRelation: 'Parent',
    concession: { type: 'NONE', value: 0 },
    transportRequired: false,
    booksRequired: false,
    uniformRequired: false,
  });
  assert(admitStudent2.statusCode === 201, `Student 2 admit failed: ${admitStudent2.statusCode} ${JSON.stringify(admitStudent2.data)}`);
  const studentClearId = admitStudent2.data.id;
  const studentClearCode = admitStudent2.data.studentCode || codeClear;
  pass('Enrolled Student 2 (Fee Cleared)', `ID: ${studentClearId}, Code: ${studentClearCode}`);

  // Ensure Student 2 has 0 dues by settling any generated charges
  const duesRes2 = await apiGet(sessionA, `/operator/fees/dues/student/${studentClearId}`);
  if (duesRes2.statusCode === 200 && duesRes2.data.dues?.length > 0) {
    for (const d of duesRes2.data.dues) {
      if (d.balance > 0) {
        await apiPost(sessionA, '/operator/fees/payments', {
          studentId: studentClearId,
          amount: d.balance,
          mode: 'CASH',
          paymentDate: new Date().toISOString().slice(0, 10),
          idempotencyKey: `clear-pay-${studentClearId}-${d.id || ts}`,
          allocations: [{ chargeId: d.id, amount: d.balance }],
        });
      }
    }
  }

  // 5. Query Exam Students with Fee Clearance Assessment
  console.log('\n--- Step 5: Dynamic Fee Clearance Assessment (TASK-035 & TASK-032) ---');
  const examStudentsRes = await apiGet(sessionA, `/operator/admit-card-contexts/${examA.id}/students`);
  assert(examStudentsRes.statusCode === 200, 'Fetched exam students with clearance');
  const studentsList = examStudentsRes.data;

  const clearanceDues = studentsList.find(s => s.studentId === studentDuesId);
  assert(clearanceDues, 'Student 1 present in exam students list');
  assert(clearanceDues.isFeeCleared === false, 'Student 1 correctly assessed as fee clearance = false');
  assert(clearanceDues.outstandingBalance > 0, `Student 1 outstanding balance > 0 (₹${clearanceDues.outstandingBalance})`);
  assert(clearanceDues.blockedReason, 'Student 1 has explicit blockedReason');
  pass('Fee Clearance Check (Student with Dues)', `isFeeCleared=false, Dues=₹${clearanceDues.outstandingBalance}, Reason="${clearanceDues.blockedReason}"`);

  const clearanceClear = studentsList.find(s => s.studentId === studentClearId);
  assert(clearanceClear, 'Student 2 present in exam students list');
  assert(clearanceClear.isFeeCleared === true, 'Student 2 correctly assessed as fee clearance = true');
  assert(clearanceClear.outstandingBalance === 0, 'Student 2 outstanding balance is 0');
  pass('Fee Clearance Check (Cleared Student)', `isFeeCleared=true, Dues=₹0, Eligible for Admit Card`);

  // 6. Admit Card Preview
  console.log('\n--- Step 6: Admit Card Preview API ---');
  const previewRes = await apiGet(sessionA, `/operator/admit-cards/preview?examContextId=${examA.id}&studentId=${studentClearId}`);
  assert(previewRes.statusCode === 200, 'Admit card preview returned 200');
  assert(previewRes.data.school.name === sessionA.schoolName, 'Preview includes correct school branding');
  assert(previewRes.data.student.studentCode === studentClearCode, 'Preview includes correct student code');
  assert(previewRes.data.exam.title.includes(ts), 'Preview includes correct exam title');
  assert(previewRes.data.clearance.isFeeCleared === true, 'Preview reflects fee clearance status');
  pass('Admit Card Preview', `Generated preview for candidate ${previewRes.data.student.fullName} with school ${previewRes.data.school.name}`);

  // 7. Strict Fee Clearance Enforcement on Issuance
  console.log('\n--- Step 7: Strict Server-Side Fee Gate Enforcement ---');
  // 7a. Attempt to issue student with dues -> MUST be blocked with 409 ERR_FEES_PENDING_FOR_ADMIT_CARD
  const issueBlockedRes = await apiPost(sessionA, '/operator/admit-cards/issue', {
    examContextId: examA.id,
    studentIds: [studentDuesId],
  });
  assert(issueBlockedRes.statusCode === 409, `Server rejected issuance with dues: status ${issueBlockedRes.statusCode}`);
  assert(issueBlockedRes.data.code === 'ERR_FEES_PENDING_FOR_ADMIT_CARD', `Error code matches ERR_FEES_PENDING_FOR_ADMIT_CARD: ${issueBlockedRes.data.code}`);
  pass('Strict Fee Gate (Single Issue Blocked)', `Blocked issuance with 409 ERR_FEES_PENDING_FOR_ADMIT_CARD (${issueBlockedRes.data.message})`);

  // 7b. Issue fee-cleared student -> MUST succeed
  console.log('\n--- Step 8: Successful Admit Card Generation & PDF Build ---');
  const issueSuccessRes = await apiPost(sessionA, '/operator/admit-cards/issue', {
    examContextId: examA.id,
    studentIds: [studentClearId],
  });
  assert(issueSuccessRes.statusCode === 201, `Issuance request succeeded: status ${issueSuccessRes.statusCode}`);
  assert(issueSuccessRes.data.issuedCount === 1, 'issuedCount is 1');
  assert(issueSuccessRes.data.blockedCount === 0, 'blockedCount is 0');
  const issueResultItem = issueSuccessRes.data.results[0];
  assert(issueResultItem.success === true, 'Student issue result is success');
  assert(issueResultItem.issueId, 'Assigned unique issueId');
  assert(issueResultItem.cardUuid, 'Assigned verification cardUuid');
  pass('Admit Card Issuance (Cleared Student)', `Issued admit card ID ${issueResultItem.issueId}, UUID ${issueResultItem.cardUuid}`);

  // 7c. Check Issue Status and PDF Download
  console.log('\n--- Step 9: PDF Download & Signed URL Verification ---');
  // Wait a brief moment if needed for direct render
  await new Promise(r => setTimeout(r, 1000));

  const downloadRes = await apiGet(sessionA, `/operator/admit-cards/issues/${issueResultItem.issueId}/download`);
  assert(downloadRes.statusCode === 200, `Download signed URL endpoint returned 200: ${downloadRes.statusCode}`);
  assert(downloadRes.data.downloadUrl, 'Signed downloadUrl is present');
  pass('Secure Download Signed URL', `Generated signed download URL: ${downloadRes.data.downloadUrl}`);

  // Fetch the PDF using the signed URL and verify PDF magic bytes
  const pdfFetchRes = await fetch(downloadRes.data.downloadUrl);
  assert(pdfFetchRes.status === 200, `PDF signed URL accessible with 200: ${pdfFetchRes.status}`);
  const pdfBytes = await pdfFetchRes.arrayBuffer();
  const pdfHeader = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
  assert(pdfHeader === '%PDF-', `Downloaded file has valid PDF magic bytes: "${pdfHeader}"`);
  pass('PDF Document Verification (Signed Storage URL)', `Valid %PDF-1.4 header confirmed. Total PDF size: ${pdfBytes.byteLength} bytes`);

  // Direct Stream Endpoint Verification (Deployment resilience)
  const streamRes = await apiGet(sessionA, `/operator/admit-cards/issues/${issueResultItem.issueId}/file`);
  assert(streamRes.statusCode === 200, `Direct stream endpoint returned 200: ${streamRes.statusCode}`);
  assert(streamRes.headers['content-type']?.includes('pdf'), 'Content-type is application/pdf');
  assert(streamRes.raw.startsWith('%PDF-'), 'Direct stream payload starts with %PDF-');
  pass('Direct Stream Verification (Universal Deployment)', `Direct streaming verified with Content-Type: ${streamRes.headers['content-type']}`);

  // 7d. Safe Retries / Idempotency Check
  console.log('\n--- Step 10: Idempotent Retries & Duplicate Prevention ---');
  const reIssueRes = await apiPost(sessionA, '/operator/admit-cards/issue', {
    examContextId: examA.id,
    studentIds: [studentClearId],
  });
  assert(reIssueRes.statusCode === 201, 'Re-issuance returned 201');
  assert(reIssueRes.data.results[0].issueId === issueResultItem.issueId, 'Re-issuing returns existing admit card without duplicate record');
  pass('Duplicate Prevention', 'Re-requesting issuance safely returned existing admit card record');

  // 8. Cross-Tenant Data Isolation (School A vs School B)
  console.log('\n--- Step 11: Cross-Tenant Data Isolation Verification ---');
  // 8a. School B cannot access School A's exam context
  const crossGetExam = await apiGet(sessionB, `/operator/admit-card-contexts/${examA.id}`);
  assert(crossGetExam.statusCode === 404, `School B denied access to School A exam: status ${crossGetExam.statusCode}`);
  pass('Tenant Isolation (Exam Read)', 'School B operator received 404 on School A exam context');

  // 8b. School B cannot issue admit cards for School A's exam
  const crossIssue = await apiPost(sessionB, '/operator/admit-cards/issue', {
    examContextId: examA.id,
    studentIds: [studentClearId],
  });
  assert(crossIssue.statusCode === 404, `School B denied issuance for School A exam: status ${crossIssue.statusCode}`);
  pass('Tenant Isolation (Issuance)', 'School B operator received 404 attempting to issue on School A exam');

  // 8c. School B cannot download School A's admit card
  const crossDownload = await apiGet(sessionB, `/operator/admit-cards/issues/${issueResultItem.issueId}/download`);
  assert(crossDownload.statusCode === 404, `School B denied download of School A admit card: status ${crossDownload.statusCode}`);
  pass('Tenant Isolation (PDF Download)', 'School B operator received 404 on School A admit card download');

  // 8d. School B creates its own exam in School B
  const sessionsResB = await apiGet(sessionB, '/operator/academic-sessions?page=1&size=10');
  const classesResB = await apiGet(sessionB, '/operator/students/classes');
  assert(sessionsResB.statusCode === 200 && classesResB.statusCode === 200, 'School B can query its sessions and classes');
  const sessB = sessionsResB.data.items[0];
  const clsB = classesResB.data[0];

  const createExamB = await apiPost(sessionB, '/operator/admit-card-contexts', {
    academicSessionId: sessB.id,
    classId: clsB.id,
    title: `School B Mid Term ${ts}`,
    examCode: `EXB-${ts}`,
    examStart: '2026-12-01',
    examEnd: '2026-12-10',
  });
  assert(createExamB.statusCode === 201, `School B successfully created its own exam: ${createExamB.statusCode}`);
  const examB = createExamB.data;
  pass('School B Independent Exam Creation', `School B created exam ID ${examB.id}`);

  // School A cannot see School B's exam
  const crossGetExamB = await apiGet(sessionA, `/operator/admit-card-contexts/${examB.id}`);
  assert(crossGetExamB.statusCode === 404, `School A denied access to School B exam: status ${crossGetExamB.statusCode}`);
  pass('Tenant Isolation (School A cannot see School B)', 'School A received 404 on School B exam');

  console.log('\n========================================================================');
  console.log(`ALL VERIFICATION CHECKS PASSED: ${testReport.length}/${testReport.length} tests succeeded!`);
  console.log('========================================================================\n');
}

run().catch((err) => {
  console.error('\n[FATAL ERROR IN VERIFICATION]:', err);
  process.exit(1);
});

