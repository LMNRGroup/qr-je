'use client';

import { useState } from 'react';

/**
 * Read `/{base}/:id/:random` path segments from the live browser URL.
 *
 * In SPA (static-export) mode we don't ship a dynamic `[id]/[random]` route —
 * Vercel rewrites the real URL (e.g. `/file/abc/xyz`) onto a single static
 * shell, so Next's `useParams()` can't see the segments. These viewer screens
 * are loaded via `dynamic(..., { ssr: false })`, so `window` is always present
 * on first render and we can read the path synchronously (no flash/refetch).
 */
export function useIdRandomFromPath(): { id: string; random: string } {
  const [params] = useState(() => {
    if (typeof window === 'undefined') return { id: '', random: '' };
    const segments = window.location.pathname.split('/').filter(Boolean);
    // segments[0] is the base (`file` | `menu`); the id/random follow it.
    return { id: segments[1] ?? '', random: segments[2] ?? '' };
  });
  return params;
}
