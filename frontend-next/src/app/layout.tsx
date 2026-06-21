import type { Metadata, Viewport } from 'next';

import '../index.css';
import '../styles/mobile-ui-v2.css';

import { AppProviders } from './providers';
import { AppShell } from './app-shell';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qrcode.luminarapps.com';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'Dynamic QR Menu & Smart QR Codes | QR Code Studio',
  description:
    'Create dynamic QR menus, smart QR codes, and adaptive QR codes for restaurants, digital signage, and lead generation. Free QR code tools with analytics.',
  keywords: [
    'dynamic qr menu',
    'smart qr codes',
    'adaptive qr',
    'digital signage',
    'qr code for restaurants',
    'qr code tools',
    'dynamic qr code',
    'qr code generator',
  ],
  authors: [{ name: 'Luminar Apps' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Dynamic QR Menu & Smart QR Codes | QR Code Studio',
    description:
      'Create dynamic QR menus, smart QR codes, and adaptive QR codes for restaurants, digital signage, and lead generation. Free QR code tools with analytics.',
    siteName: 'QR Code Studio',
    images: ['/assets/QRC App Icon.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dynamic QR Menu & Smart QR Codes | QR Code Studio',
    description:
      'Create dynamic QR menus, smart QR codes, and adaptive QR codes for restaurants, digital signage, and lead generation.',
    images: ['/assets/QRC App Icon.png'],
  },
  icons: {
    icon: '/assets/QRC App Icon.png',
    apple: '/assets/QRC App Icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const mobileUiV2Enabled = process.env.NEXT_PUBLIC_MOBILE_UI_V2 === 'true';
  const copyrightYear = new Date().getUTCFullYear();

  return (
    <html
      lang="en"
      data-mobile-ui={mobileUiV2Enabled ? 'v2' : undefined}
      suppressHydrationWarning
    >
      <head />
      <body suppressHydrationWarning>
        <AppProviders>
          <AppShell copyrightYear={copyrightYear}>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
