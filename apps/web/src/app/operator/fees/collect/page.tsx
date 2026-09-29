import { Suspense } from 'react';
import { CollectFeeUi } from './ui';

export const metadata = {
  title: 'Collect Fee & Print Receipt | Operator Portal',
  description: 'Search student, review monthly dues, record partial or full fee payments, and issue receipts.',
};

export default function CollectFeePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading fee collection...</div>}>
      <CollectFeeUi />
    </Suspense>
  );
}
