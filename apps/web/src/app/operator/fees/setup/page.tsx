import { requireManager } from '@/lib/server-session';
import { FeesSetupUi } from './ui';

export const metadata = {
  title: 'Fee Setup & Due Generation | Operator Portal',
  description: 'Configure class monthly school fees and generate monthly dues.',
};

export default async function FeeSetupPage() {
  await requireManager();
  return <FeesSetupUi />;
}
