'use client';

import React from 'react';
import { GlobalErrorRecovery } from '../../../features/platform-foundation/components/global-error-recovery';

export default function UnavailablePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <GlobalErrorRecovery
      title="Platform Subsystem Unavailable"
      message="The platform API or database cluster is currently not reporting ready. Please wait a moment while the automated health probe verifies restoration."
      onRetry={handleRetry}
    />
  );
}
