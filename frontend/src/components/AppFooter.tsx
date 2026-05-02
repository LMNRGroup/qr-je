import { Link } from 'react-router-dom';
import { forwardRef } from 'react';

const FOOTER_LINKS = [
  { to: '/faq', label: 'FAQ' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/privacy', label: 'Privacy Policy' },
] as const;

const COPYRIGHT_YEAR = new Date().getFullYear();

export const AppFooter = forwardRef<HTMLElement>((_, ref) => (
  <footer
    ref={ref}
    className="flex-shrink-0 px-4 py-2 sm:pb-6 sm:pt-8 text-center text-xs text-muted-foreground"
  >
    <nav className="flex flex-wrap items-center justify-center gap-3 sm:gap-4" aria-label="Footer">
      {FOOTER_LINKS.map((link, index) => (
        <span key={link.to} className="contents">
          {index > 0 && <span className="text-muted-foreground/30">•</span>}
          <Link
            to={link.to}
            className="text-muted-foreground/70 hover:text-muted-foreground transition"
          >
            {link.label}
          </Link>
        </span>
      ))}
    </nav>
    <p className="mt-2">© {COPYRIGHT_YEAR} GDev x Luminar Apps. Puerto Rico.</p>
  </footer>
));

AppFooter.displayName = 'AppFooter';
