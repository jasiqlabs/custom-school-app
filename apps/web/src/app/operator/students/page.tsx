import { requireOperator } from '@/lib/server-session';
import { OperatorShell } from '@/components/shell';
import { StudentDirectoryUi } from './ui';

export default async function Page() {
  const session = await requireOperator();
  return (
    <OperatorShell session={session}>
      <StudentDirectoryUi session={session} />
    </OperatorShell>
  );
}
