'use client';

import dynamic from 'next/dynamic';

import { PageLoading } from '../page-loading';

// Browser-only viewer (renders PDFs via pdfjs); never server-rendered.
// Served as a single static shell — the real `/menu/:id/:random` URL is
// rewritten onto this page (see vercel.json) and read client-side.
const MenuViewerScreen = dynamic(() => import('./menu-viewer-screen'), {
  ssr: false,
  loading: PageLoading,
});

export default function MenuViewerRoute() {
  return <MenuViewerScreen />;
}
