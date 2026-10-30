import { requireManager } from '@/lib/server-session';
import { NumberingUi } from './ui';
export default async function NumberingSettingsPage(){await requireManager();return <NumberingUi/>;}
