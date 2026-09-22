export const dynamic = 'force-dynamic';

import { requireOperator } from '@/lib/server-session';
import { OperatorShell } from '@/components/shell';

export default async function FeesLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOperator();

  return (
    <OperatorShell session={session}>
      {children}
    </OperatorShell>
  );
}
