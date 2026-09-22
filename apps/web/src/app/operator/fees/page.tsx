import { redirect } from 'next/navigation';

export default function FeesIndexPage() {
  redirect('/operator/fees/collect');
}
