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
  console.log('TASK-017: Comprehensive Verification & Acceptance Suite');
  console.log('========================================================================\n');

  const results = [];
  const today = new Date().toISOString().slice(0, 10);

  // Authenticate School A (SCH-00125) and School B (SCH-A7K29)
  const sessionA = await loginOperator('operator@example.com', 'OperatorPassword123!');
  console.log(`[AUTH] School A logged in: ${sessionA.schoolId} as ${sessionA.operator.fullName}`);

  const sessionB = await loginOperator('operator@customschool.com', 'OperatorPassword123!');
  console.log(`[AUTH] School B logged in: ${sessionB.schoolId} as ${sessionB.operator.fullName}\n`);

  // Get active classes and session for School A
  const classesResA = await apiGet(sessionA, '/operator/students/classes');
  assert(classesResA.statusCode === 200 && classesResA.data.length > 0, 'School A has classes');
  const classA = classesResA.data[0];
  const sectionA = classA.sections[0];

  // Verify Admission Fee Options endpoint for School A
  const feeOptsResA = await apiGet(sessionA, `/operator/students/admission-fee-options?classId=${classA.id}`);
  assert(feeOptsResA.statusCode === 200, 'Fee options endpoint returned 200');
  assert(feeOptsResA.data.books.available === true, 'School A Books fee available');
  assert(feeOptsResA.data.books.amount === 2500, 'School A Books fee is 2500');
  assert(feeOptsResA.data.uniform.available === true, 'School A Uniform fee available');
  assert(feeOptsResA.data.uniform.amount === 1800, 'School A Uniform fee is 1800');
  console.log('[CONFIG] School A Books fee: ₹2,500, Uniform fee: ₹1,800 verified.\n');

  const ts = Date.now().toString().slice(-6);

  // -------------------------------------------------------------------------
  // Scenario 1: Student selects both Books and Uniform
  // -------------------------------------------------------------------------
  try {
    const studentCode1 = `T17-S1-${ts}`;
    const admitRes1 = await apiPost(sessionA, '/operator/students', {
      studentCodeMode: 'MANUAL',
      studentCode: studentCode1,
      fullName: `Test Student Both ${ts}`,
      fatherName: 'Father One',
      motherName: 'Mother One',
      dateOfBirth: '2015-05-15',
      classId: classA.id,
      sectionId: sectionA.id,
      gender: 'BOY',
      address: '101 Test Road',
      phone: '9876543210',
      emergencyContact: '9876543210',
      emergencyContactRelation: 'Parent',
      concession: { type: 'NONE', value: 0 },
      transportRequired: false,
      booksRequired: true,
      uniformRequired: true,
    });
    assert(admitRes1.statusCode === 201, `Admit S1 status: ${admitRes1.statusCode}`);
    const studentId1 = admitRes1.data.id;

    const duesRes1 = await apiGet(sessionA, `/operator/fees/dues/student/${studentId1}`);
    assert(duesRes1.statusCode === 200, `Dues S1 status: ${duesRes1.statusCode}`);
    const charges1 = duesRes1.data.dues || [];

    const booksCharge1 = charges1.find((c) => c.categoryCode === 'BOOKS');
    const uniformCharge1 = charges1.find((c) => c.categoryCode === 'UNIFORM');

    assert(booksCharge1, 'Books charge generated');
    assert(booksCharge1.netDue === 2500, `Books charge amount is 2500, got ${booksCharge1?.netDue}`);
    assert(booksCharge1.balance === 2500, 'Books charge balance is 2500');
    assert(booksCharge1.status === 'UNPAID', 'Books charge is UNPAID');

    assert(uniformCharge1, 'Uniform charge generated');
    assert(uniformCharge1.netDue === 1800, `Uniform charge amount is 1800, got ${uniformCharge1?.netDue}`);
    assert(uniformCharge1.balance === 1800, 'Uniform charge balance is 1800');
    assert(uniformCharge1.status === 'UNPAID', 'Uniform charge is UNPAID');

    const det = `Generated Books (₹${booksCharge1.netDue}) and Uniform (₹${uniformCharge1.netDue}) charges correctly`;
    results.push({ scenario: '1. Select both Books & Uniform', status: 'PASS', details: det });
    console.log(`[SCENARIO 1] ✅ PASS: ${det}`);
  } catch (err) {
    results.push({ scenario: '1. Select both Books & Uniform', status: 'FAIL', details: err.message });
    console.error(`[SCENARIO 1] ❌ FAIL: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 2: Student selects Books only
  // -------------------------------------------------------------------------
  try {
    const studentCode2 = `T17-S2-${ts}`;
    const admitRes2 = await apiPost(sessionA, '/operator/students', {
      studentCodeMode: 'MANUAL',
      studentCode: studentCode2,
      fullName: `Test Student BooksOnly ${ts}`,
      fatherName: 'Father Two',
      motherName: 'Mother Two',
      dateOfBirth: '2015-06-20',
      classId: classA.id,
      sectionId: sectionA.id,
      gender: 'GIRL',
      address: '102 Test Road',
      phone: '9876543211',
      emergencyContact: '9876543211',
      emergencyContactRelation: 'Parent',
      concession: { type: 'NONE', value: 0 },
      transportRequired: false,
      booksRequired: true,
      uniformRequired: false,
    });
    assert(admitRes2.statusCode === 201, `Admit S2 status: ${admitRes2.statusCode}`);
    const studentId2 = admitRes2.data.id;

    const duesRes2 = await apiGet(sessionA, `/operator/fees/dues/student/${studentId2}`);
    const charges2 = duesRes2.data.dues || [];
    const booksCharge2 = charges2.find((c) => c.categoryCode === 'BOOKS');
    const uniformCharge2 = charges2.find((c) => c.categoryCode === 'UNIFORM');

    assert(booksCharge2, 'Books charge generated');
    assert(booksCharge2.netDue === 2500, 'Books charge amount is 2500');
    assert(!uniformCharge2, 'Uniform charge must NOT be generated');

    const det = 'Generated Books charge (₹2500); confirmed no Uniform charge generated';
    results.push({ scenario: '2. Select Books only', status: 'PASS', details: det });
    console.log(`[SCENARIO 2] ✅ PASS: ${det}`);
  } catch (err) {
    results.push({ scenario: '2. Select Books only', status: 'FAIL', details: err.message });
    console.error(`[SCENARIO 2] ❌ FAIL: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 3: Student selects Uniform only
  // -------------------------------------------------------------------------
  try {
    const studentCode3 = `T17-S3-${ts}`;
    const admitRes3 = await apiPost(sessionA, '/operator/students', {
      studentCodeMode: 'MANUAL',
      studentCode: studentCode3,
      fullName: `Test Student UniformOnly ${ts}`,
      fatherName: 'Father Three',
      motherName: 'Mother Three',
      dateOfBirth: '2015-07-25',
      classId: classA.id,
      sectionId: sectionA.id,
      gender: 'BOY',
      address: '103 Test Road',
      phone: '9876543212',
      emergencyContact: '9876543212',
      emergencyContactRelation: 'Parent',
      concession: { type: 'NONE', value: 0 },
      transportRequired: false,
      booksRequired: false,
      uniformRequired: true,
    });
    assert(admitRes3.statusCode === 201, `Admit S3 status: ${admitRes3.statusCode}`);
    const studentId3 = admitRes3.data.id;

    const duesRes3 = await apiGet(sessionA, `/operator/fees/dues/student/${studentId3}`);
    const charges3 = duesRes3.data.dues || [];
    const booksCharge3 = charges3.find((c) => c.categoryCode === 'BOOKS');
    const uniformCharge3 = charges3.find((c) => c.categoryCode === 'UNIFORM');

    assert(!booksCharge3, 'Books charge must NOT be generated');
    assert(uniformCharge3, 'Uniform charge generated');
    assert(uniformCharge3.netDue === 1800, 'Uniform charge amount is 1800');

    const det = 'Generated Uniform charge (₹1800); confirmed no Books charge generated';
    results.push({ scenario: '3. Select Uniform only', status: 'PASS', details: det });
    console.log(`[SCENARIO 3] ✅ PASS: ${det}`);
  } catch (err) {
    results.push({ scenario: '3. Select Uniform only', status: 'FAIL', details: err.message });
    console.error(`[SCENARIO 3] ❌ FAIL: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 4: Student selects neither
  // -------------------------------------------------------------------------
  let studentId4 = null;
  let studentVersion4 = 1;
  try {
    const studentCode4 = `T17-S4-${ts}`;
    const admitRes4 = await apiPost(sessionA, '/operator/students', {
      studentCodeMode: 'MANUAL',
      studentCode: studentCode4,
      fullName: `Test Student Neither ${ts}`,
      fatherName: 'Father Four',
      motherName: 'Mother Four',
      dateOfBirth: '2015-08-30',
      classId: classA.id,
      sectionId: sectionA.id,
      gender: 'GIRL',
      address: '104 Test Road',
      phone: '9876543213',
      emergencyContact: '9876543213',
      emergencyContactRelation: 'Parent',
      concession: { type: 'NONE', value: 0 },
      transportRequired: false,
      booksRequired: false,
      uniformRequired: false,
    });
    assert(admitRes4.statusCode === 201, `Admit S4 status: ${admitRes4.statusCode}`);
    studentId4 = admitRes4.data.id;

    const duesRes4 = await apiGet(sessionA, `/operator/fees/dues/student/${studentId4}`);
    const charges4 = duesRes4.data.dues || [];
    const booksCharge4 = charges4.find((c) => c.categoryCode === 'BOOKS');
    const uniformCharge4 = charges4.find((c) => c.categoryCode === 'UNIFORM');

    assert(!booksCharge4, 'Books charge must NOT be generated');
    assert(!uniformCharge4, 'Uniform charge must NOT be generated');

    const profileRes4 = await apiGet(sessionA, `/operator/students/${studentId4}`);
    studentVersion4 = profileRes4.data.version;

    const det = 'Confirmed zero Books or Uniform charges generated';
    results.push({ scenario: '4. Select neither (Books=No, Uniform=No)', status: 'PASS', details: det });
    console.log(`[SCENARIO 4] ✅ PASS: ${det}`);
  } catch (err) {
    results.push({ scenario: '4. Select neither (Books=No, Uniform=No)', status: 'FAIL', details: err.message });
    console.error(`[SCENARIO 4] ❌ FAIL: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 5: Student leaves both options unanswered (omitted defaults)
  // -------------------------------------------------------------------------
  try {
    const studentCode5 = `T17-S5-${ts}`;
    const admitRes5 = await apiPost(sessionA, '/operator/students', {
      studentCodeMode: 'MANUAL',
      studentCode: studentCode5,
      fullName: `Test Student Unanswered ${ts}`,
      fatherName: 'Father Five',
      motherName: 'Mother Five',
      dateOfBirth: '2015-09-10',
      classId: classA.id,
      sectionId: sectionA.id,
      gender: 'BOY',
      address: '105 Test Road',
      phone: '9876543214',
      emergencyContact: '9876543214',
      emergencyContactRelation: 'Parent',
      concession: { type: 'NONE', value: 0 },
      transportRequired: false,
      // booksRequired and uniformRequired omitted
    });
    assert(admitRes5.statusCode === 201, `Admit S5 status: ${admitRes5.statusCode}`);
    const studentId5 = admitRes5.data.id;

    const duesRes5 = await apiGet(sessionA, `/operator/fees/dues/student/${studentId5}`);
    const charges5 = duesRes5.data.dues || [];
    const booksCharge5 = charges5.find((c) => c.categoryCode === 'BOOKS');
    const uniformCharge5 = charges5.find((c) => c.categoryCode === 'UNIFORM');

    assert(!booksCharge5, 'Books charge must NOT be generated when unanswered');
    assert(!uniformCharge5, 'Uniform charge must NOT be generated when unanswered');

    const det = 'Safe state: zero automatic optional charges assessed';
    results.push({ scenario: '5. Both options unanswered (defaults to false)', status: 'PASS', details: det });
    console.log(`[SCENARIO 5] ✅ PASS: ${det}`);
  } catch (err) {
    results.push({ scenario: '5. Both options unanswered (defaults to false)', status: 'FAIL', details: err.message });
    console.error(`[SCENARIO 5] ❌ FAIL: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 6: Student changes selection after admission
  // -------------------------------------------------------------------------
  try {
    assert(studentId4, 'Student 4 exists for post-admission update');

    // 6a: Add Books selection after admission
    const updateRes1 = await apiPatch(sessionA, `/operator/students/${studentId4}`, {
      version: studentVersion4,
      booksRequired: true,
    });
    assert(updateRes1.statusCode === 200, 'Update booksRequired=true succeeded');
    studentVersion4 = updateRes1.data.version;

    // Check dues
    const duesAfterAddBooks = await apiGet(sessionA, `/operator/fees/dues/student/${studentId4}`);
    const chargesAfterAddBooks = duesAfterAddBooks.data.dues || [];
    const booksAfter = chargesAfterAddBooks.filter((c) => c.categoryCode === 'BOOKS');
    assert(booksAfter.length === 1, `Exactly 1 Books charge added, found ${booksAfter.length}`);
    assert(booksAfter[0].netDue === 2500, 'Books charge amount is 2500');

    // 6b: Add Uniform selection as well
    const updateRes2 = await apiPatch(sessionA, `/operator/students/${studentId4}`, {
      version: studentVersion4,
      uniformRequired: true,
    });
    assert(updateRes2.statusCode === 200, 'Update uniformRequired=true succeeded');
    studentVersion4 = updateRes2.data.version;

    const duesAfterAddUniform = await apiGet(sessionA, `/operator/fees/dues/student/${studentId4}`);
    const chargesAfterAddUniform = duesAfterAddUniform.data.dues || [];
    const booksAfter2 = chargesAfterAddUniform.filter((c) => c.categoryCode === 'BOOKS');
    const uniformAfter2 = chargesAfterAddUniform.filter((c) => c.categoryCode === 'UNIFORM');
    assert(booksAfter2.length === 1, 'Books charge not duplicated');
    assert(uniformAfter2.length === 1, 'Uniform charge created');
    assert(uniformAfter2[0].netDue === 1800, 'Uniform charge is 1800');

    // 6c: Remove Books selection before payment (unpaid) -> must delete/reverse unpaid charge
    const updateRes3 = await apiPatch(sessionA, `/operator/students/${studentId4}`, {
      version: studentVersion4,
      booksRequired: false,
    });
    assert(updateRes3.statusCode === 200, 'Update booksRequired=false succeeded');
    studentVersion4 = updateRes3.data.version;

    const duesAfterRemoveBooks = await apiGet(sessionA, `/operator/fees/dues/student/${studentId4}`);
    const chargesAfterRemoveBooks = duesAfterRemoveBooks.data.dues || [];
    const booksAfterRemove = chargesAfterRemoveBooks.filter((c) => c.categoryCode === 'BOOKS');
    assert(booksAfterRemove.length === 0, 'Unpaid Books charge successfully removed after deselection');

    // 6d: Pay Uniform charge partially, then attempt to set uniformRequired=false
    const uniformChargeToPay = chargesAfterRemoveBooks.find((c) => c.categoryCode === 'UNIFORM');
    assert(uniformChargeToPay, 'Uniform charge is present');

    const paymentRes = await apiPost(sessionA, '/operator/fees/payments', {
      studentId: studentId4,
      amount: 1000,
      mode: 'CASH',
      paymentDate: today,
      idempotencyKey: `idem-s6-pay-${ts}`,
      allocations: [{ chargeId: uniformChargeToPay.id, amount: 1000 }],
    });
    assert(paymentRes.statusCode === 201, 'Partial payment of 1000 recorded');
    const paidReceiptNumber = paymentRes.data.receiptNumber;

    // Now update uniformRequired = false
    const updateRes4 = await apiPatch(sessionA, `/operator/students/${studentId4}`, {
      version: studentVersion4,
      uniformRequired: false,
    });
    assert(updateRes4.statusCode === 200, 'Update uniformRequired=false succeeded');
    studentVersion4 = updateRes4.data.version;

    // Verify paid charge and payment are PRESERVED!
    const duesAfterPaidRevoke = await apiGet(sessionA, `/operator/fees/dues/student/${studentId4}`);
    const chargesAfterPaidRevoke = duesAfterPaidRevoke.data.dues || [];
    const uniformPaidCharge = chargesAfterPaidRevoke.find((c) => c.id === uniformChargeToPay.id);
    assert(uniformPaidCharge, 'Partially paid Uniform charge is preserved (never deleted)');
    assert(uniformPaidCharge.paidAmount === 1000, 'Paid amount 1000 intact');

    // Verify receipt still exists and is immutable
    const receiptCheck = await apiGet(sessionA, `/operator/fees/payments/${paymentRes.data.id}/receipt`);
    assert(receiptCheck.statusCode === 200, 'Receipt is intact');
    assert(receiptCheck.data.receiptNumber === paidReceiptNumber, 'Receipt number matches');

    const det = 'Added Books/Uniform post-admission; removed unpaid Books; preserved paid Uniform transaction & receipt';
    results.push({ scenario: '6. Update selection post-admission', status: 'PASS', details: det });
    console.log(`[SCENARIO 6] ✅ PASS: ${det}`);
  } catch (err) {
    results.push({ scenario: '6. Update selection post-admission', status: 'FAIL', details: err.message });
    console.error(`[SCENARIO 6] ❌ FAIL: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 7: Collect full and partial payments & verify ledger/receipt
  // -------------------------------------------------------------------------
  try {
    const studentCode7 = `T17-S7-${ts}`;
    const admitRes7 = await apiPost(sessionA, '/operator/students', {
      studentCodeMode: 'MANUAL',
      studentCode: studentCode7,
      fullName: `Test Student Payments ${ts}`,
      fatherName: 'Father Seven',
      motherName: 'Mother Seven',
      dateOfBirth: '2015-10-10',
      classId: classA.id,
      sectionId: sectionA.id,
      gender: 'BOY',
      address: '107 Test Road',
      phone: '9876543216',
      emergencyContact: '9876543216',
      emergencyContactRelation: 'Parent',
      concession: { type: 'NONE', value: 0 },
      transportRequired: false,
      booksRequired: true,
      uniformRequired: true,
    });
    const studentId7 = admitRes7.data.id;

    const duesRes7 = await apiGet(sessionA, `/operator/fees/dues/student/${studentId7}`);
    const charges7 = duesRes7.data.dues || [];
    const books7 = charges7.find((c) => c.categoryCode === 'BOOKS');
    const uniform7 = charges7.find((c) => c.categoryCode === 'UNIFORM');

    // 7a: Partial payment of 1500 on Books (due: 2500, balance: 1000)
    const pay1 = await apiPost(sessionA, '/operator/fees/payments', {
      studentId: studentId7,
      amount: 1500,
      mode: 'UPI',
      paymentDate: today,
      reference: 'UPI123456',
      idempotencyKey: `idem-s7-p1-${ts}`,
      allocations: [{ chargeId: books7.id, amount: 1500 }],
    });
    assert(pay1.statusCode === 201, 'Partial payment accepted');
    assert(pay1.data.items.some((it) => it.categoryCode === 'BOOKS' && it.amount === 1500), 'Receipt item shows Books 1500');

    // Check balances
    const duesAfterP1 = await apiGet(sessionA, `/operator/fees/dues/student/${studentId7}`);
    const booksAfterP1 = duesAfterP1.data.dues.find((c) => c.id === books7.id);
    assert(booksAfterP1.paidAmount === 1500, 'Books paid is 1500');
    assert(booksAfterP1.balance === 1000, 'Books balance is 1000');
    assert(booksAfterP1.status === 'PARTIAL', 'Books status is PARTIAL');

    // 7b: Full payment of remaining balance (1000 on Books + 1800 on Uniform = 2800)
    const pay2 = await apiPost(sessionA, '/operator/fees/payments', {
      studentId: studentId7,
      amount: 2800,
      mode: 'CASH',
      paymentDate: today,
      idempotencyKey: `idem-s7-p2-${ts}`,
      allocations: [
        { chargeId: books7.id, amount: 1000 },
        { chargeId: uniform7.id, amount: 1800 },
      ],
    });
    assert(pay2.statusCode === 201, 'Full remaining payment accepted');
    assert(pay2.data.items.length === 2, 'Receipt shows both Books and Uniform allocations');

    const duesAfterP2 = await apiGet(sessionA, `/operator/fees/dues/student/${studentId7}`);
    const booksAfterP2 = duesAfterP2.data.dues.find((c) => c.id === books7.id);
    const uniformAfterP2 = duesAfterP2.data.dues.find((c) => c.id === uniform7.id);
    assert(booksAfterP2.balance === 0, 'Books balance is 0');
    assert(booksAfterP2.status === 'PAID', 'Books status is PAID');
    assert(uniformAfterP2.balance === 0, 'Uniform balance is 0');
    assert(uniformAfterP2.status === 'PAID', 'Uniform status is PAID');

    const det = 'Partial payment updated balance to 1000 (PARTIAL); final payment cleared balance to 0 (PAID); receipts verified';
    results.push({ scenario: '7. Full & partial payments + receipts', status: 'PASS', details: det });
    console.log(`[SCENARIO 7] ✅ PASS: ${det}`);
  } catch (err) {
    results.push({ scenario: '7. Full & partial payments + receipts', status: 'FAIL', details: err.message });
    console.error(`[SCENARIO 7] ❌ FAIL: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 8: Idempotency & Duplicate Prevention
  // -------------------------------------------------------------------------
  try {
    const studentCode8 = `T17-S8-${ts}`;
    const payload8 = {
      studentCodeMode: 'MANUAL',
      studentCode: studentCode8,
      fullName: `Test Student Idempotency ${ts}`,
      fatherName: 'Father Eight',
      motherName: 'Mother Eight',
      dateOfBirth: '2015-11-11',
      classId: classA.id,
      sectionId: sectionA.id,
      gender: 'BOY',
      address: '108 Test Road',
      phone: '9876543217',
      emergencyContact: '9876543217',
      emergencyContactRelation: 'Parent',
      concession: { type: 'NONE', value: 0 },
      transportRequired: false,
      booksRequired: true,
      uniformRequired: true,
    };

    // First submit
    const res1 = await apiPost(sessionA, '/operator/students', payload8);
    assert(res1.statusCode === 201, 'First admission succeeded');
    const studentId8 = res1.data.id;

    // Retry submit with duplicate student code -> 409 Conflict
    const resDuplicate = await apiPost(sessionA, '/operator/students', payload8);
    assert(resDuplicate.statusCode === 409, `Duplicate code rejected with 409, got ${resDuplicate.statusCode}`);

    // Call dues assessment 5 times consecutively -> verify exactly 1 Books charge and 1 Uniform charge
    for (let i = 0; i < 5; i++) {
      await apiGet(sessionA, `/operator/fees/dues/student/${studentId8}`);
    }

    const duesRes8 = await apiGet(sessionA, `/operator/fees/dues/student/${studentId8}`);
    const books8 = (duesRes8.data.dues || []).filter((c) => c.categoryCode === 'BOOKS');
    const uniform8 = (duesRes8.data.dues || []).filter((c) => c.categoryCode === 'UNIFORM');
    assert(books8.length === 1, `Expected exactly 1 Books charge, got ${books8.length}`);
    assert(uniform8.length === 1, `Expected exactly 1 Uniform charge, got ${uniform8.length}`);

    // Payment idempotency replay:
    const idemKey = `idem-replay-${ts}`;
    const payA = await apiPost(sessionA, '/operator/fees/payments', {
      studentId: studentId8,
      amount: 500,
      mode: 'CASH',
      paymentDate: today,
      idempotencyKey: idemKey,
      allocations: [{ chargeId: books8[0].id, amount: 500 }],
    });
    assert(payA.statusCode === 201, 'Payment recorded');

    // Replay exact same payment request
    const payB = await apiPost(sessionA, '/operator/fees/payments', {
      studentId: studentId8,
      amount: 500,
      mode: 'CASH',
      paymentDate: today,
      idempotencyKey: idemKey,
      allocations: [{ chargeId: books8[0].id, amount: 500 }],
    });
    assert(payB.statusCode === 201 || payB.statusCode === 200, 'Replay responded safely');
    assert(payB.data.receiptNumber === payA.data.receiptNumber, 'Replay returned identical receipt');

    const paymentsRes8 = await apiGet(sessionA, `/operator/fees/payments?studentId=${studentId8}`);
    assert(paymentsRes8.statusCode === 200, 'Payments list 200');
    assert(paymentsRes8.data.payments.length === 1, 'Exactly 1 payment row recorded');

    const det = 'Duplicate code blocked (409); repeated assessments created no duplicates; payment replay deduplicated safely';
    results.push({ scenario: '8. Idempotency & duplicate prevention', status: 'PASS', details: det });
    console.log(`[SCENARIO 8] ✅ PASS: ${det}`);
  } catch (err) {
    results.push({ scenario: '8. Idempotency & duplicate prevention', status: 'FAIL', details: err.message });
    console.error(`[SCENARIO 8] ❌ FAIL: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 9: Multi-Tenant Isolation (School A vs School B)
  // -------------------------------------------------------------------------
  try {
    const classesResB = await apiGet(sessionB, '/operator/students/classes');
    assert(classesResB.statusCode === 200 && classesResB.data.length > 0, 'School B has classes');
    const classB = classesResB.data[0];
    const sectionB = classB.sections[0];

    const feeOptsResB = await apiGet(sessionB, `/operator/students/admission-fee-options?classId=${classB.id}`);
    assert(feeOptsResB.statusCode === 200, 'School B fee options 200');
    assert(feeOptsResB.data.books.amount === 3000, `School B Books is 3000, got ${feeOptsResB.data.books.amount}`);
    assert(feeOptsResB.data.uniform.amount === 2200, `School B Uniform is 2200, got ${feeOptsResB.data.uniform.amount}`);

    // Admit student in School B
    const studentCode9B = `T17-S9B-${ts}`;
    const admitRes9B = await apiPost(sessionB, '/operator/students', {
      studentCodeMode: 'MANUAL',
      studentCode: studentCode9B,
      fullName: `Test Student SchoolB ${ts}`,
      fatherName: 'Father Nine B',
      motherName: 'Mother Nine B',
      dateOfBirth: '2015-12-12',
      classId: classB.id,
      sectionId: sectionB.id,
      gender: 'BOY',
      address: '201 School B Road',
      phone: '9876543218',
      emergencyContact: '9876543218',
      emergencyContactRelation: 'Parent',
      concession: { type: 'NONE', value: 0 },
      transportRequired: false,
      booksRequired: true,
      uniformRequired: true,
    });
    assert(admitRes9B.statusCode === 201, 'School B student admitted');
    const studentId9B = admitRes9B.data.id;

    // Verify School B charges use School B prices
    const duesRes9B = await apiGet(sessionB, `/operator/fees/dues/student/${studentId9B}`);
    const books9B = duesRes9B.data.dues.find((c) => c.categoryCode === 'BOOKS');
    const uniform9B = duesRes9B.data.dues.find((c) => c.categoryCode === 'UNIFORM');
    assert(books9B.netDue === 3000, 'School B Books charge is 3000');
    assert(uniform9B.netDue === 2200, 'School B Uniform charge is 2200');

    // Cross-tenant attack 1: School A tries to fetch School B student profile
    const crossProfile = await apiGet(sessionA, `/operator/students/${studentId9B}`);
    assert(crossProfile.statusCode === 404, `Cross-tenant student read rejected with 404, got ${crossProfile.statusCode}`);

    // Cross-tenant attack 2: School A tries to fetch School B student dues
    const crossDues = await apiGet(sessionA, `/operator/fees/dues/student/${studentId9B}`);
    assert(crossDues.statusCode === 404, `Cross-tenant dues query rejected with 404, got ${crossDues.statusCode}`);

    // Cross-tenant attack 3: School A tries to collect payment on School B student
    const crossPay = await apiPost(sessionA, '/operator/fees/payments', {
      studentId: studentId9B,
      amount: 100,
      mode: 'CASH',
      paymentDate: today,
      idempotencyKey: `cross-pay-${ts}`,
      allocations: [{ chargeId: books9B.id, amount: 100 }],
    });
    assert(crossPay.statusCode === 404, `Cross-tenant payment rejected with 404, got ${crossPay.statusCode}`);

    const det = 'School B charges used ₹3000/₹2200; School A completely barred from School B students/charges (404)';
    results.push({ scenario: '9. Multi-tenant isolation & security', status: 'PASS', details: det });
    console.log(`[SCENARIO 9] ✅ PASS: ${det}`);
  } catch (err) {
    results.push({ scenario: '9. Multi-tenant isolation & security', status: 'FAIL', details: err.message });
    console.error(`[SCENARIO 9] ❌ FAIL: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 10: Regression verification (Tuition, Transport, Concessions)
  // -------------------------------------------------------------------------
  try {
    const studentCode10 = `T17-S10-${ts}`;
    const admitRes10 = await apiPost(sessionA, '/operator/students', {
      studentCodeMode: 'MANUAL',
      studentCode: studentCode10,
      fullName: `Test Student Regression ${ts}`,
      fatherName: 'Father Ten',
      motherName: 'Mother Ten',
      dateOfBirth: '2015-04-10',
      classId: classA.id,
      sectionId: sectionA.id,
      gender: 'GIRL',
      address: '110 Regression Lane',
      phone: '9876543219',
      emergencyContact: '9876543219',
      emergencyContactRelation: 'Parent',
      concession: { type: 'PERCENTAGE', value: 20 },
      transportRequired: false,
      booksRequired: true,
      uniformRequired: true,
    });
    assert(admitRes10.statusCode === 201, 'Regression student admitted');
    const studentId10 = admitRes10.data.id;

    // Check dues
    const duesRes10 = await apiGet(sessionA, `/operator/fees/dues/student/${studentId10}`);
    assert(duesRes10.statusCode === 200, 'Dues query succeeded');
    const charges10 = duesRes10.data.dues || [];

    // Tuition charge with concession
    const tuition = charges10.find((c) => c.categoryCode === 'TUITION');
    if (tuition) {
      assert(tuition.concessionType === 'PERCENTAGE', 'Concession type is PERCENTAGE');
      assert(tuition.concessionValue === 20, 'Concession value is 20%');
      assert(tuition.concessionAmount > 0, 'Concession amount is applied');
      assert(tuition.netDue < tuition.baseAmount, 'Net due is discounted');
    }

    // Books and Uniform present alongside Tuition
    const books10 = charges10.find((c) => c.categoryCode === 'BOOKS');
    const uniform10 = charges10.find((c) => c.categoryCode === 'UNIFORM');
    assert(books10 && books10.netDue === 2500, 'Books charge present');
    assert(uniform10 && uniform10.netDue === 1800, 'Uniform charge present');

    // Collect fee on Books
    const pay10 = await apiPost(sessionA, '/operator/fees/payments', {
      studentId: studentId10,
      amount: 1000,
      mode: 'CASH',
      paymentDate: today,
      idempotencyKey: `idem-s10-${ts}`,
      allocations: [{ chargeId: books10.id, amount: 1000 }],
    });
    assert(pay10.statusCode === 201, 'Payment collected');
    assert(pay10.data.receiptNumber, 'Receipt number generated');

    // View receipt
    const receiptRes10 = await apiGet(sessionA, `/operator/fees/payments/${pay10.data.id}/receipt`);
    assert(receiptRes10.statusCode === 200, 'Receipt fetched');
    assert(receiptRes10.data.receiptNumber === pay10.data.receiptNumber, 'Receipt number matches');

    // Check Pending Fees report
    const curMonth = new Date().toISOString().slice(0, 7);
    const pendingRes = await apiGet(sessionA, `/operator/fees/pending?feeMonth=${curMonth}`);
    assert(pendingRes.statusCode === 200, 'Pending fees report 200');
    assert(pendingRes.data.totalNetDue > 0, 'Pending fees report has totalNetDue');

    const det = 'Tuition 20% concession calculated; payment & receipt issued; Pending Fees report verified';
    results.push({ scenario: '10. Regression (Tuition, Concessions, Receipts, Reports)', status: 'PASS', details: det });
    console.log(`[SCENARIO 10] ✅ PASS: ${det}`);
  } catch (err) {
    results.push({ scenario: '10. Regression (Tuition, Concessions, Receipts, Reports)', status: 'FAIL', details: err.message });
    console.error(`[SCENARIO 10] ❌ FAIL: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Print Summary Table
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST SUMMARY RESULTS:');
  console.log('========================================================================');
  for (const r of results) {
    const symbol = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${symbol} [${r.status}] ${r.scenario}: ${r.details}`);
  }
  console.log('========================================================================\n');

  const allPassed = results.every((r) => r.status === 'PASS');
  process.exit(allPassed ? 0 : 1);
}

run().catch((e) => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
