/** @type {import('next').NextConfig} */

// Public env vars, each with the legacy Vite name we still accept as a fallback
// during the migration. Resolved once here so the inlined `env` map, the
// rewrite origin, and startup validation all agree on the same values.
const PUBLIC_ENV_FALLBACKS = {
  NEXT_PUBLIC_API_BASE_URL: 'VITE_API_BASE_URL',
  NEXT_PUBLIC_APP_URL: 'VITE_PUBLIC_APP_URL',
  NEXT_PUBLIC_MOBILE_UI_V2: 'VITE_MOBILE_UI_V2',
  NEXT_PUBLIC_SUPABASE_URL: 'VITE_SUPABASE_URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'VITE_SUPABASE_ANON_KEY',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
};

function resolveEnv(name) {
  const fallback = PUBLIC_ENV_FALLBACKS[name];
  return process.env[name] || (fallback ? process.env[fallback] : undefined) || '';
}

const publicEnv = Object.fromEntries(
  Object.keys(PUBLIC_ENV_FALLBACKS).map((name) => [name, resolveEnv(name)]),
);

// Fail loudly when the app is built/started without the configuration it needs
// to talk to Supabase. Without this the Supabase client silently falls back to
// a local placeholder and every auth/data call fails at runtime instead.
function validatePublicEnv() {
  const missing = [];
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (
    !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  ) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');
  }

  if (missing.length === 0) return;

  const message =
    `[env] Missing required Supabase configuration: ${missing.join(', ')}.\n` +
    '      Auth and data features will not work. See README "Migration architecture".';

  // Treat a misconfigured production build/start as fatal; warn in development
  // so local work without a backend is still possible.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  }
  console.warn(`\x1b[33m${message}\x1b[0m`);
}

validatePublicEnv();

const isDev = process.env.NODE_ENV === 'development';

// `next dev` only: mirror production proxying locally so the app behaves the
// same against a running backend. Static export ignores rewrites, so prod
// proxying lives in vercel.json — and omitting this key outside dev keeps the
// export build warning-free.
async function devRewrites() {
  const apiOrigin = (
    process.env.API_PROXY_ORIGIN ||
    publicEnv.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:3000'
  ).replace(/\/+$/, '');

  return [
    { source: '/r/:id/:random', destination: `${apiOrigin}/r/:id/:random` },
    { source: '/adaptive/:id/:random', destination: `${apiOrigin}/adaptive/:id/:random` },
    { source: '/public/:path*', destination: `${apiOrigin}/public/:path*` },
    { source: '/v/:slug', destination: `${apiOrigin}/public/pages/v/:slug` },
    {
      source:
        '/:owner((?!v$|menu$|file$|r$|adaptive$|public$|assets$|api$|_next$|inspector$|login$|forgot-password$|reset-password$|terms$|privacy$|support$|data-deletion$|faq$)[^/]+)/:slug',
      destination: `${apiOrigin}/public/pages/:owner/:slug`,
    },
    // Map the real viewer URLs onto their single static shells (mirrors vercel.json).
    { source: '/file/:id/:random', destination: '/file' },
    { source: '/menu/:id/:random', destination: '/menu' },
  ];
}

const nextConfig = {
  // SPA / static-export mode: the app ships as plain static files so there is
  // no per-request server compute on Vercel. All production proxying to the
  // backend lives in `vercel.json`. (SSR is intentionally parked — see
  // README "Migration architecture".)
  output: 'export',
  devIndicators: false,
  env: publicEnv,
  ...(isDev ? { rewrites: devRewrites } : {}),
};

export default nextConfig;
