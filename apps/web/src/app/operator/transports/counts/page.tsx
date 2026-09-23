import { Suspense } from 'react';
import { CountsUI } from './ui';

export const metadata = {
  title: 'Transport & Stoppage Utilization Counts | Operator Portal',
  description: 'Inspect date-effective transport utilization, active routes, active stoppages, and effective student distribution under Asia/Kolkata business date.',
};

export default function CountsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading utilization counts...</div>}>
      <CountsUI />
    </Suspense>
  );
}
