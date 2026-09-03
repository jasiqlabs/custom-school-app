import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminShellLayout } from '../components/admin-shell-layout';
import { OperatorShellLayout } from '../components/operator-shell-layout';
import { SessionExpiredGate } from '../components/session-expired-gate';
import { GlobalErrorRecovery } from '../components/global-error-recovery';

describe('MOD-000 Web Shell Test Suite (TC-UNIT-000-007, TC-INT-000-007)', () => {
  // TC-UNIT-000-007: AdminShellLayout renders skip link, nav, and main landmarks
  it('[TC-UNIT-000-007] AdminShellLayout renders accessible skip link, nav, and main landmarks', () => {
    render(
      <AdminShellLayout userName="Super Admin">
        <div data-testid="test-content">Dashboard Content</div>
      </AdminShellLayout>
    );

    // Skip Link
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    // Landmarks
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /platform admin navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();

    // Content rendered inside main
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('OperatorShellLayout renders school branding and operator navigation landmarks', () => {
    render(
      <OperatorShellLayout schoolName="Delhi Public Model School" userName="Principal Operator">
        <div>Operator View</div>
      </OperatorShellLayout>
    );

    expect(screen.getByText('Delhi Public Model School')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /school operator navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('SessionExpiredGate renders alertdialog modal with re-authentication button when open', () => {
    const onRedirect = jest.fn();
    render(<SessionExpiredGate isOpen={true} onLoginRedirect={onRedirect} />);

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/session expired/i)).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /go to sign in/i });
    button.click();
    expect(onRedirect).toHaveBeenCalledTimes(1);
  });

  // TC-INT-000-007: GlobalErrorRecovery renders service unavailable screen
  it('[TC-INT-000-007] GlobalErrorRecovery renders unavailable screen with recovery retry action', () => {
    const onRetry = jest.fn();
    render(
      <GlobalErrorRecovery
        title="Service Temporarily Unavailable"
        message="Backend API is restarting."
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('region', { name: /service error notification/i })).toBeInTheDocument();
    expect(screen.getByText('Service Temporarily Unavailable')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /check status & retry/i });
    retryBtn.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
