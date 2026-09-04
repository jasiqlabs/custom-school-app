'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useHealthStatus } from '../hooks/use-health-status';
import { useSessionWarning } from '../hooks/use-session-warning';
import { SessionExpiredGate } from '../components/session-expired-gate';

interface ShellContextType {
  healthStatus: string;
  isSessionExpired: boolean;
}

const ShellContext = createContext<ShellContextType>({
  healthStatus: 'loading',
  isSessionExpired: false,
});

export const useShellContext = () => useContext(ShellContext);

export const ShellProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { status: healthStatus } = useHealthStatus();
  const { isExpired: isSessionExpired } = useSessionWarning();

  const handleLoginRedirect = () => {
    window.location.href = '/login';
  };

  return (
    <ShellContext.Provider value={{ healthStatus, isSessionExpired }}>
      {children}
      <SessionExpiredGate isOpen={isSessionExpired} onLoginRedirect={handleLoginRedirect} />
    </ShellContext.Provider>
  );
};
