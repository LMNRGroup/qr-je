'use client';

import dynamic from 'next/dynamic';

import { PageLoading } from '../page-loading';

// Public vCard URLs are served through a single static shell. Vercel/Next
// rewrites keep the visible URL (/v/:slug or /:owner/:slug), and the client
// screen reads that live pathname to resolve the vCard slug.
const PublicVcardScreen = dynamic(() => import('@/components/public-vcard-screen'), {
  ssr: false,
  loading: PageLoading,
});

export default function PublicVcardRoute() {
  return <PublicVcardScreen />;
}
