import { requireOperator } from '@/lib/server-session';
import { TransportsUI } from './ui';

export const metadata = {
  title: 'Transport Routes & Stoppages | Operator Portal',
  description: 'Manage school transport routes, vehicle numbers, schedules, and ordered stoppages with safe deactivation.',
};

export default async function TransportsPage() {
  const session = await requireOperator();
  return <TransportsUI session={session} />;
}
