import { requireOperator } from '@/lib/server-session';
import { PaymentHistoryUi } from './ui';

export const metadata = {
  title: 'Payment History & Receipts | Operator Portal',
  description: 'View chronological fee payment records, view receipts, and void same-day transactions.',
};

export default async function PaymentHistoryPage() {
  const session = await requireOperator();
  return <PaymentHistoryUi session={session} />;
}
