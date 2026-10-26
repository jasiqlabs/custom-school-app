import { requireManager } from '@/lib/server-session';
import { OperatorShell } from '@/components/shell';
import { StudentImportUi } from './ui';

export default async function Page() {
  const session = await requireManager();
  return (
    <OperatorShell session={session}>
      <StudentImportUi session={session} />
    </OperatorShell>
  );
}
