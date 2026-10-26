import { requireOperator } from '@/lib/server-session';
import { PendingFeesUi } from './ui';

export const metadata = {
  title: 'Pending Fees Report & XLSX Export | Operator Portal',
  description: 'View month-wise pending fees, class aggregates, and export reports to spreadsheet.',
};

export default async function PendingFeesPage() {
  const session = await requireOperator();
  return <PendingFeesUi session={session} />;
}
