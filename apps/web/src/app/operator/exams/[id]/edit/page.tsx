export const dynamic = 'force-dynamic';

import { requireManager } from '@/lib/server-session';
import OperatorEditExamUi from './ui';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireManager();
  const { id } = await params;
  return <OperatorEditExamUi session={session} examContextId={id} />;
}

