import { requireManager } from '@/lib/server-session';
import { OpeningBalancesUi } from './ui';
export default async function OpeningBalancesPage(){await requireManager();return <OpeningBalancesUi/>;}
