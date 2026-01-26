import { ScrollArea } from '@/components/ui/scroll-area';
import { ReactNode } from 'react';

interface NavPageLayoutProps {
  sectionLabel: string;
  title: string;
  subtitle?: string;
  isMobileV2: boolean;
  onTitleClick?: () => void;
  titleClassName?: string;
  children: ReactNode;
  actions?: ReactNode;
}

/**
 * Shared layout component for all mobile V2 nav pages.
 * Provides consistent header positioning and scrollable content area
 * that properly accounts for footer height and safe-area insets.
 */
export function NavPageLayout({
  sectionLabel,
  title,
  subtitle,
  isMobileV2,
  onTitleClick,
  titleClassName = '',
  children,
  actions,
}: NavPageLayoutProps) {
  if (!isMobileV2) {
    // Desktop layout - return children without wrapper
    return <>{children}</>;
  }

  const showDebugMarker =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' &&
      window.localStorage.getItem('qrc.debug.mobileV2') === '1');

  return (
    <section className="qrc-v2-section max-w-full relative">
      {/* Consistent Header Block - Always left-aligned */}
      <div className="mb-0 pb-3">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-1">
          {sectionLabel}
        </p>
        <div className="flex items-center justify-between gap-2">
          <h2
            className={`text-lg font-semibold cursor-pointer hover:text-primary/80 transition-colors ${titleClassName}`}
            onClick={onTitleClick}
          >
            {title}
          </h2>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {showDebugMarker && (
          <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-muted-foreground/50">
            v2-layout-active
          </p>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col overflow-hidden">
        <ScrollArea className="qrc-v2-scroll-container qrc-no-scroll-x max-w-full w-full min-w-0">
          <div className="flex flex-col min-h-0 qrc-v2-scroll-content min-w-0">
            {children}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
