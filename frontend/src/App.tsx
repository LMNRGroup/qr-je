import { TooltipProvider } from "@/components/ui/tooltip";
import { DebugOverlay } from "@/components/DebugOverlay";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import MenuViewer from "./pages/MenuViewer";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import DataDeletion from "./pages/DataDeletion";
import FAQ from "./pages/FAQ";
import VCard from "./pages/VCard";
import FileViewer from "./pages/FileViewer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DebugOverlay />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {/* Desktop (>= 1024px): Allow body scrolling. Mobile V2 (< 768px): Height-locked container (handled by mobile-ui-v2.css) */}
          <div className="flex flex-col h-[100dvh] lg:h-auto lg:min-h-screen">
            <div className="flex-1 min-h-0 overflow-hidden lg:overflow-visible">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/support" element={<Support />} />
                <Route path="/data-deletion" element={<DataDeletion />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/v/:slug" element={<VCard />} />
                <Route path="/file/:id/:random" element={<FileViewer />} />
                <Route path="/menu/:id/:random" element={<MenuViewer />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <footer className="flex-shrink-0 px-4 py-2 sm:pb-6 sm:pt-8 text-center text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <a
                  href="/faq"
                  className="text-muted-foreground/70 hover:text-muted-foreground transition"
                >
                  FAQ
                </a>
                <span className="text-muted-foreground/30">•</span>
                <a
                  href="/terms"
                  className="text-muted-foreground/70 hover:text-muted-foreground transition"
                >
                  Terms & Conditions
                </a>
                <span className="text-muted-foreground/30">•</span>
                <a
                  href="/privacy"
                  className="text-muted-foreground/70 hover:text-muted-foreground transition"
                >
                  Privacy Policy
                </a>
              </div>
              <p className="mt-2">© {new Date().getFullYear()} GDev x Luminar Apps. Puerto Rico.</p>
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
