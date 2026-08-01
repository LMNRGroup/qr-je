'use client';

import dynamic from 'next/dynamic';

import { PageLoading } from './page-loading';

// Browser-only studio (localStorage, canvas/QR rendering); never server-rendered.
const StudioScreen = dynamic(() => import('@/components/studio/StudioScreen'), {
  ssr: false,
  loading: PageLoading,
});

export default function StudioRoute() {
  return <StudioScreen />;
}
