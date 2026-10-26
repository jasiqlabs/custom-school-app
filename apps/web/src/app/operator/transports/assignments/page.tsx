import { Suspense } from 'react';
import { requireOperator } from '@/lib/server-session';
import { AssignmentsUI } from './ui';

export const metadata = {
  title: 'Student Transport Assignments | Operator Portal',
  description: 'Assign students to transport routes and stoppages, reassign routes atomically, end assignments, and query assignment directory.',
};

export default async function AssignmentsPage() {
  const session = await requireOperator();
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading assignments...</div>}>
      <AssignmentsUI session={session} />
    </Suspense>
  );
}
