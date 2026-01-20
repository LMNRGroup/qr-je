import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import MenuViewer from "./pages/MenuViewer";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import VCard from "./pages/VCard";
import FileViewer from "./pages/FileViewer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex flex-col sm:min-h-[100dvh]">
            <div className="sm:flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/v/:slug" element={<VCard />} />
                <Route path="/file/:id/:random" element={<FileViewer />} />
                <Route path="/menu/:id/:random" element={<MenuViewer />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <footer className="px-4 py-2 sm:pb-6 sm:pt-8 text-center text-xs text-muted-foreground">
              <a
                href="/terms"
                className="text-muted-foreground/70 hover:text-muted-foreground transition"
              >
                Terms & Conditions
              </a>
              <p className="mt-2">© {new Date().getFullYear()} GDev x Luminar Apps.</p>
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
