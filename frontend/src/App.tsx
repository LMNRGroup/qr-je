import { AppFooter } from "@/components/AppFooter";
import { DebugOverlay } from "@/components/DebugOverlay";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";

const queryClient = new QueryClient();

function useFooterHeightCssVariable(disabled = false) {
  const footerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (disabled) {
      root.style.setProperty("--qrc-footer-h", "0px");
      return;
    }
    const footer = footerRef.current;
    if (!footer) {
      root.style.setProperty("--qrc-footer-h", "0px");
      return;
    }

    const updateFooterHeight = () => {
      const height = Math.ceil(footer.getBoundingClientRect().height);
      root.style.setProperty("--qrc-footer-h", `${height}px`);
    };

    updateFooterHeight();

    const observer = new ResizeObserver(updateFooterHeight);
    observer.observe(footer);
    window.addEventListener("resize", updateFooterHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFooterHeight);
    };
  }, [disabled]);

  return footerRef;
}

const AppShell = () => {
  const location = useLocation();
  const hideFooter = location.pathname.startsWith("/v/");
  const footerRef = useFooterHeightCssVariable(hideFooter);

  return (
    <div className="flex flex-col h-[100dvh] lg:h-auto lg:min-h-screen">
      <div className="flex-1 min-h-0 overflow-hidden lg:overflow-visible">
        <AppRoutes />
      </div>
      <AppFooter ref={footerRef} className={hideFooter ? "hidden" : undefined} />
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <DebugOverlay />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {/* Desktop (>= 1024px): Allow body scrolling. Mobile V2 (< 768px): Height-locked container (handled by mobile-ui-v2.css) */}
            <AppShell />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
