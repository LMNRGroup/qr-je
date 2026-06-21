import type { Metadata } from 'next';

import { ForgotPasswordScreen } from './forgot-password-screen';

export const metadata: Metadata = {
  title: 'Reset your password | QR Code Studio',
  description: 'Request a password reset link for your QR Code Studio account.',
};

export default function ForgotPasswordRoute() {
  return <ForgotPasswordScreen />;
}
