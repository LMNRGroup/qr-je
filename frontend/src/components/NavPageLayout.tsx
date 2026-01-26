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

  return (
    <section className="qrc-v2-section">
      {/* Consistent Header Block - Always left-aligned */}
      <div className="mb-0 pb-2">
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
      </div>

      {/* Scrollable Content Area */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col overflow-hidden">
        <ScrollArea className="qrc-v2-scroll-container qrc-no-scroll-x max-w-full w-full">
          <div className="flex flex-col min-h-0 qrc-v2-scroll-content">
            {children}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
