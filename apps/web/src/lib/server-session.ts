import { cookies } from 'next/headers';import { redirect } from 'next/navigation';
const internal=process.env.API_INTERNAL_URL||process.env.NEXT_PUBLIC_API_BASE_URL||'http://localhost:4000/api/v1';
async function call(path:string){const store=await cookies();const cookie=store.getAll().map(c=>`${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`).join('; ');return fetch(`${internal}${path}`,{headers:{cookie},cache:'no-store'});}
export async function requireAdmin(){const r=await call('/platform/auth/session');if(!r.ok)redirect('/admin/login');return r.json();}
export async function requireOperator(){const r=await call('/operator/auth/session');if(!r.ok)redirect('/operator/login');return r.json();}
export async function redirectAdminIfAuthenticated(){const r=await call('/platform/auth/session');if(r.ok)redirect('/admin/dashboard');}
export async function redirectOperatorIfAuthenticated(){const r=await call('/operator/auth/session');if(r.ok)redirect('/operator');}
