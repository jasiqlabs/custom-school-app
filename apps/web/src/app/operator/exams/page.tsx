export const dynamic = 'force-dynamic';

import { requireOperator } from '@/lib/server-session';
import OperatorExamsUi from './ui';

export default async function OperatorExamsPage() {
  const session = await requireOperator();
  return <OperatorExamsUi session={session} />;
}

