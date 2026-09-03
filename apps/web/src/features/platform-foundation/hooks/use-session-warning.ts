import { useState, useEffect } from 'react';

export function useSessionWarning(idleTimeoutMinutes = 30, warningThresholdMinutes = 5) {
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let lastActivity = Date.now();

    const handleUserActivity = () => {
      lastActivity = Date.now();
      setIsWarningActive(false);
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    const interval = setInterval(() => {
      const elapsedMinutes = (Date.now() - lastActivity) / 60000;
      if (elapsedMinutes >= idleTimeoutMinutes) {
        setIsExpired(true);
      } else if (elapsedMinutes >= idleTimeoutMinutes - warningThresholdMinutes) {
        setIsWarningActive(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      clearInterval(interval);
    };
  }, [idleTimeoutMinutes, warningThresholdMinutes]);

  return { isWarningActive, isExpired };
}
