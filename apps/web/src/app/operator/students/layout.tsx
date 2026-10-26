export const dynamic = 'force-dynamic';

import { requireOperator } from '@/lib/server-session';

export default async function StudentsLayout({ children }: { children: React.ReactNode }) {
  await requireOperator();
  return <>{children}</>;
}
