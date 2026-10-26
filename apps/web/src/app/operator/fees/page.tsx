import { requireOperator, isReportViewer } from '@/lib/server-session';
import { redirect } from 'next/navigation';

export default async function FeesIndexPage() {
  const session = await requireOperator();
  if (isReportViewer(session)) {
    redirect('/operator/fees/pending');
  }
  redirect('/operator/fees/collect');
}
