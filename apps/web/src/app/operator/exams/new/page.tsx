export const dynamic = 'force-dynamic';

import { requireManager } from '@/lib/server-session';
import OperatorNewExamUi from './ui';

export default async function OperatorNewExamPage() {
  const session = await requireManager();
  return <OperatorNewExamUi session={session} />;
}

