export const dynamic = 'force-dynamic';

import { requireOperator } from '@/lib/server-session';
import OperatorAdmitCardsUi from './ui';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOperator();
  const { id } = await params;
  return <OperatorAdmitCardsUi session={session} examContextId={id} />;
}

