import { Suspense } from 'react';
import type { Metadata } from 'next';

import { PageLoading } from '../page-loading';
import { LoginScreen } from './login-screen';

export const metadata: Metadata = {
  title: 'Sign in | QR Code Studio',
  description: 'Sign in or create your QR Code Studio account.',
};

export default function LoginRoute() {
  // LoginScreen reads `useSearchParams`, which must sit under a Suspense
  // boundary in the App Router.
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginScreen />
    </Suspense>
  );
}
