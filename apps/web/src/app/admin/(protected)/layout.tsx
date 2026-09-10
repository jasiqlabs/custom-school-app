export const dynamic='force-dynamic';
import { AdminShell } from '@/components/shell';import { requireAdmin } from '@/lib/server-session';
export default async function Layout({children}:{children:React.ReactNode}){const session=await requireAdmin();return <AdminShell user={session.user}>{children}</AdminShell>}
