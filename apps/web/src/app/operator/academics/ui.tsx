'use client';

import { AcademicSessionsView } from '@/features/academics/components/academic-sessions-view';

export default function OperatorAcademicsUi({ session }: { session: any }) {
  const isReportViewer = session?.role === 'REPORT_VIEWER' || session?.operator?.role === 'REPORT_VIEWER';
  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px' }}>
      <AcademicSessionsView
        baseApiUrl="/operator/academic-sessions"
        title="Academic Sessions & Term Configuration"
        canManage={!isReportViewer}
      />
    </div>
  );
}
