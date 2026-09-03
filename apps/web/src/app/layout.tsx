import React from 'react';
import '@custom-school/design-tokens/tokens.css';
import { ShellProviders } from '../features/platform-foundation/providers/shell-providers';

export const metadata = {
  title: 'Custom School Management System',
  description: 'Enterprise Multi-Tenant School Management Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'var(--font-family-sans, sans-serif)' }}>
        <ShellProviders>{children}</ShellProviders>
      </body>
    </html>
  );
}
