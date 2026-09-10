import { redirectAdminIfAuthenticated } from '@/lib/server-session';import AdminLoginForm from './ui';
export default async function Page(){await redirectAdminIfAuthenticated();return <AdminLoginForm/>}
