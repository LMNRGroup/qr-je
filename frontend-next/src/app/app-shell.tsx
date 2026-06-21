'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { AppFooter } from '@/components/AppFooter';

function useFooterHeightCssVariable(disabled = false) {
  const footerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (disabled) {
      root.style.setProperty('--qrc-footer-h', '0px');
      return;
    }

    const footer = footerRef.current;
    if (!footer) {
      root.style.setProperty('--qrc-footer-h', '0px');
      return;
    }

    const updateFooterHeight = () => {
      const height = Math.ceil(footer.getBoundingClientRect().height);
      root.style.setProperty('--qrc-footer-h', `${height}px`);
    };

    updateFooterHeight();

    const observer = new ResizeObserver(updateFooterHeight);
    observer.observe(footer);
    window.addEventListener('resize', updateFooterHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateFooterHeight);
    };
  }, [disabled]);

  return footerRef;
}

export function AppShell({
  children,
  copyrightYear,
}: Readonly<{ children: React.ReactNode; copyrightYear: number }>) {
  const pathname = usePathname();
  const hideFooter =
    pathname.startsWith('/v/') || pathname === '/1vbilcikwj/ramn-figueroa-soto';
  const footerRef = useFooterHeightCssVariable(hideFooter);

  useEffect(() => {
    const root = document.documentElement;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!themeColor) return;

    const updateThemeColor = () => {
      themeColor.content = root.classList.contains('dark') ? '#111827' : '#ffffff';
    };

    updateThemeColor();
    const observer = new MutationObserver(updateThemeColor);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      data-app-shell
      suppressHydrationWarning
      className="flex h-[100dvh] flex-col lg:h-auto lg:min-h-screen"
    >
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain lg:overflow-visible">
        {children}
      </div>
      <AppFooter
        ref={footerRef}
        copyrightYear={copyrightYear}
        className={hideFooter ? 'hidden' : undefined}
      />
    </div>
  );
}
