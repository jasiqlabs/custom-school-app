import { requireOperator } from '@/lib/server-session';
import { AdmissionFormPrintUi } from './ui';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOperator();
  const { id } = await params;

  return <AdmissionFormPrintUi session={session} studentId={id} />;
}
