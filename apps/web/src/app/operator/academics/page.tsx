import { requireOperator } from '@/lib/server-session';
import OperatorAcademicsUi from './ui';

export default async function OperatorAcademicsPage() {
  const session = await requireOperator();
  return <OperatorAcademicsUi session={session} />;
}
