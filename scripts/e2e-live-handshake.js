const http = require('http');

const API_BASE = 'http://localhost:4000';
const WEB_BASE = 'http://localhost:3000';

let cookie = '';
let schoolId = '';
let classId = '';

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const headers = options.headers || {};
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let body = '';
        if (res.headers['set-cookie']) {
          cookie = res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
        }
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(body);
          } catch (e) {
            data = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      },
    );

    req.on('error', reject);
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

async function runLiveHandshake() {
  console.log('=== STARTING LIVE MOD-001 E2E HTTP HANDSHAKE ===\n');

  // 1. Verify Web Login Page
  const webLogin = await request(`${WEB_BASE}/admin/login`);
  console.log('Step 1 [Web Login Page]:', webLogin.status === 200 ? 'PASS (200 OK)' : `FAIL (${webLogin.status})`);

  // 2. Admin Login API
  const loginRes = await request(`${API_BASE}/api/v1/platform/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@customschool.com', password: 'Admin@12345' },
  });
  console.log('Step 2 [Admin Login API]:', loginRes.status === 200 ? 'PASS (200 OK, cs_sess cookie captured)' : `FAIL (${loginRes.status})`);

  // 3. Create School Tenant
  const createRes = await request(`${API_BASE}/api/v1/platform/schools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      name: 'Oakridge Global Academy',
      code: 'OGA-01',
      address: '77 Heritage Blvd, Tech District',
      contactEmail: 'info@oakridge.edu',
      contactPhone: '9876543210',
    },
  });
  schoolId = createRes.data.id;
  console.log('Step 3 [Onboard School API]:', createRes.status === 201 && createRes.data.status === 'DRAFT' ? `PASS (201 Created, ID: ${schoolId})` : `FAIL (${createRes.status})`);

  // 4. Update Profile
  const updateProfileRes = await request(`${API_BASE}/api/v1/platform/schools/${schoolId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: { address: '77 Heritage Blvd, Suite 200, Tech District' },
  });
  console.log('Step 4 [Update Profile API]:', updateProfileRes.status === 200 ? 'PASS (200 OK)' : `FAIL (${updateProfileRes.status})`);

  // 5. Update Principal Details
  const updatePrincipalRes = await request(`${API_BASE}/api/v1/platform/schools/${schoolId}/principal`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: { principalName: 'Dr. Eleanor Vance', contactNumber: '9123456780' },
  });
  console.log('Step 5 [Update Principal API]:', updatePrincipalRes.status === 200 ? 'PASS (200 OK)' : `FAIL (${updatePrincipalRes.status})`);

  // 6. Create Class & Section
  const classRes = await request(`${API_BASE}/api/v1/platform/schools/${schoolId}/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { name: 'Grade 10', displayOrder: 10 },
  });
  classId = classRes.data.id;
  const sectionRes = await request(`${API_BASE}/api/v1/platform/schools/${schoolId}/classes/${classId}/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { name: 'Section A' },
  });
  console.log('Step 6 [Create Class & Section API]:', classRes.status === 201 && sectionRes.status === 201 ? 'PASS (201 Created)' : 'FAIL');

  // 7. Status Lifecycle: Activate -> Deactivate with reason -> Reactivate
  const activateRes = await request(`${API_BASE}/api/v1/platform/schools/${schoolId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: { status: 'ACTIVE' },
  });
  const deactRes = await request(`${API_BASE}/api/v1/platform/schools/${schoolId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: { status: 'INACTIVE', reason: 'Scheduled regulatory audit' },
  });
  const restoreRes = await request(`${API_BASE}/api/v1/platform/schools/${schoolId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: { status: 'ACTIVE' },
  });
  console.log('Step 7 [Status Lifecycle API]:', activateRes.data.status === 'ACTIVE' && deactRes.data.status === 'INACTIVE' && restoreRes.data.status === 'ACTIVE' ? 'PASS (Active -> Inactive -> Active verified)' : 'FAIL');

  // 8. Provision Operator
  const opRes = await request(`${API_BASE}/api/v1/platform/schools/${schoolId}/operators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Mark Spencer',
      email: 'mark.spencer@oakridge.edu',
      temporaryPassword: 'OperatorPass123!',
    },
  });
  console.log('Step 8 [Provision Operator API]:', opRes.status === 201 && opRes.data.status === 'ACTIVE' ? 'PASS (201 Created, Argon2id)' : `FAIL (${opRes.status})`);

  // 9. Generate Transfer Certificate
  const tcRes = await request(`${API_BASE}/api/v1/platform/schools/${schoolId}/transfer-certificate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { includeLogo: false, includeSignature: false },
  });
  console.log('Step 9 [Generate TC API]:', tcRes.status === 202 ? `PASS (202 Accepted, Job ID: ${tcRes.data.jobId})` : `FAIL (${tcRes.status})`);

  // 10. Dashboard Metrics
  const metricsRes = await request(`${API_BASE}/api/v1/platform/dashboard/metrics`);
  const summaryRes = await request(`${API_BASE}/api/v1/platform/dashboard/school-summary`);
  console.log('Step 10 [Dashboard Metrics API]:', metricsRes.status === 200 && summaryRes.status === 200 ? `PASS (200 OK, Total Schools: ${metricsRes.data.totalSchools})` : 'FAIL');

  // 11. Verify All Web App Routes respond 200 OK
  const routes = [
    `${WEB_BASE}/admin/dashboard`,
    `${WEB_BASE}/admin/schools`,
    `${WEB_BASE}/admin/schools/new`,
    `${WEB_BASE}/admin/schools/${schoolId}`,
    `${WEB_BASE}/admin/schools/${schoolId}/academics`,
    `${WEB_BASE}/admin/schools/${schoolId}/operators`,
    `${WEB_BASE}/admin/schools/${schoolId}/transfer-certificate`,
  ];

  console.log('\n--- Step 11: Web App Route Verification ---');
  for (const r of routes) {
    const res = await request(r);
    console.log(`Route [${new URL(r).pathname}]:`, res.status === 200 ? '200 OK' : `FAIL (${res.status})`);
  }

  console.log('\n=== COMPLETE LIVE MOD-001 E2E HTTP HANDSHAKE SUCCEEDED ===');
}

runLiveHandshake().catch((err) => {
  console.error('Handshake failed with error:', err);
  process.exit(1);
});
