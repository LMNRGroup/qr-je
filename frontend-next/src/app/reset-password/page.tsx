import { Suspense } from 'react';
import type { Metadata } from 'next';

import { PageLoading } from '../page-loading';
import { ResetPasswordScreen } from './reset-password-screen';

export const metadata: Metadata = {
  title: 'Set a new password | QR Code Studio',
  description: 'Choose a new password for your QR Code Studio account.',
};

export default function ResetPasswordRoute() {
  // ResetPasswordScreen reads `useSearchParams`, which must sit under Suspense.
  return (
    <Suspense fallback={<PageLoading />}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
