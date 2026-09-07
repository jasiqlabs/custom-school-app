import {
  CreateSchoolRequest,
  UpdateSchoolProfileRequest,
  UpdatePrincipalRequest,
  ChangeSchoolStatusRequest,
  CreateClassRequest,
  UpdateClassRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  ProvisionOperatorRequest,
  GenerateTcRequest,
} from '@custom-school/contracts';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const ADMIN_TOKEN_KEY = 'cs_admin_token';

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setStoredAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearStoredAdminToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    clearStoredAdminToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
      window.location.href = '/admin/login';
    }
  }

  return res;
}

export async function adminLogin(payload: { email: string; password: string }) {
  const res = await fetch(`${API_BASE}/api/v1/platform/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');

  if (data.token) {
    setStoredAdminToken(data.token);
  }
  return data;
}

export async function adminLogout() {
  const token = getStoredAdminToken();
  try {
    await fetch(`${API_BASE}/api/v1/platform/auth/logout`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
  } finally {
    clearStoredAdminToken();
  }
}

export async function fetchAdminMe() {
  const res = await adminFetch('/api/v1/platform/auth/me');
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function fetchSchools(params?: { search?: string; status?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await adminFetch(`/api/v1/platform/schools?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load schools');
  return data;
}

export async function fetchSchoolById(schoolId: string) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'School not found');
  return data;
}

export async function createSchool(payload: CreateSchoolRequest) {
  const res = await adminFetch('/api/v1/platform/schools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error: any = new Error(data.message || 'Failed to create school');
    error.code = data.code;
    error.matchedSchool = data.matchedSchool;
    throw error;
  }
  return data;
}

export async function updateSchoolProfile(schoolId: string, payload: UpdateSchoolProfileRequest) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update school profile');
  return data;
}

export async function updatePrincipal(schoolId: string, payload: UpdatePrincipalRequest) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/principal`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update principal details');
  return data;
}

// Academics API
export async function fetchClasses(schoolId: string) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/classes`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load classes');
  return data;
}

export async function createClass(schoolId: string, payload: CreateClassRequest) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create class');
  return data;
}

export async function updateClass(schoolId: string, classId: string, payload: UpdateClassRequest) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/classes/${classId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update class');
  return data;
}

export async function deleteClass(schoolId: string, classId: string) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/classes/${classId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error: any = new Error(data.message || 'Failed to delete class');
    error.code = data.code;
    error.canDeactivate = data.canDeactivate;
    throw error;
  }
}

export async function createSection(schoolId: string, classId: string, payload: CreateSectionRequest) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/classes/${classId}/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create section');
  return data;
}

export async function updateSection(schoolId: string, classId: string, sectionId: string, payload: UpdateSectionRequest) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/classes/${classId}/sections/${sectionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update section');
  return data;
}

export async function deleteSection(schoolId: string, classId: string, sectionId: string) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/classes/${classId}/sections/${sectionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error: any = new Error(data.message || 'Failed to delete section');
    error.code = data.code;
    error.canDeactivate = data.canDeactivate;
    throw error;
  }
}

export async function changeSchoolStatus(schoolId: string, payload: ChangeSchoolStatusRequest) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error: any = new Error(data.message || 'Failed to change school status');
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function fetchOperators(schoolId: string) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/operators`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load operators');
  return data;
}

export async function provisionOperator(schoolId: string, payload: ProvisionOperatorRequest) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/operators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error: any = new Error(data.message || 'Failed to provision operator');
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function updateOperatorStatus(schoolId: string, operatorId: string, status: 'ACTIVE' | 'INACTIVE' | 'LOCKED') {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/operators/${operatorId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update operator status');
  return data;
}

export async function generateTransferCertificate(schoolId: string, payload: GenerateTcRequest) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/transfer-certificate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error: any = new Error(data.message || 'Failed to enqueue TC generation');
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function fetchTcJobs(schoolId: string) {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/transfer-certificate/jobs`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch TC jobs');
  return data;
}

export async function fetchDashboardMetrics() {
  const res = await adminFetch('/api/v1/platform/dashboard/metrics');
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load dashboard metrics');
  return data;
}

export async function fetchSchoolSummary(params: { status?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());

  const res = await adminFetch(`/api/v1/platform/dashboard/school-summary?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load school summary');
  return data;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadSchoolLogo(schoolId: string, file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/logo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'image/png',
      dataUrlOrBase64: dataUrl,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to upload school logo');
  return data;
}

export async function uploadPrincipalSignature(schoolId: string, file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/principal/signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'image/png',
      dataUrlOrBase64: dataUrl,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to upload principal signature');
  return data;
}

export async function downloadTcJobPdf(schoolId: string, jobId: string, disposition: 'inline' | 'attachment' = 'attachment'): Promise<Blob> {
  const res = await adminFetch(`/api/v1/platform/schools/${schoolId}/transfer-certificate/jobs/${jobId}/download?disposition=${disposition}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to download certificate PDF');
  }
  return res.blob();
}

export function getSchoolFileDownloadUrl(schoolId: string, fileId: string): string {
  return `${API_BASE}/api/v1/platform/schools/${schoolId}/files/${fileId}/download`;
}
