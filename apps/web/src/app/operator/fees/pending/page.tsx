import { PendingFeesUi } from './ui';

export const metadata = {
  title: 'Pending Fees Report & XLSX Export | Operator Portal',
  description: 'View month-wise pending fees, class aggregates, and export reports to spreadsheet.',
};

export default function PendingFeesPage() {
  return <PendingFeesUi />;
}
