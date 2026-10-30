import { requireOperator } from '@/lib/server-session';
import OperatorTcUi from './ui';
export const dynamic = 'force-dynamic';
export default async function OperatorTcPage() {
  const session = await requireOperator();
  return <OperatorTcUi session={session} />;
}
