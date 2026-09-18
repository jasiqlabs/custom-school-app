import { requireOperator } from '@/lib/server-session';
import { OperatorShell } from '@/components/shell';
import { StudentProfileUi } from './ui';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOperator();
  const { id } = await params;

  return (
    <OperatorShell session={session}>
      <StudentProfileUi session={session} studentId={id} />
    </OperatorShell>
  );
}
