import { requireOperator } from '@/lib/server-session';
import { OperatorShell } from '@/components/shell';
import { AdmitStudentUi } from './ui';

export default async function Page() {
  const session = await requireOperator();
  return (
    <OperatorShell session={session}>
      <AdmitStudentUi session={session} />
    </OperatorShell>
  );
}
