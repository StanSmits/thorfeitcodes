import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { SubscriptionProvider } from "./hooks/useSubscription";
import { ThemeProvider } from "./components/ThemeProvider";
import { AppSettingsGate } from "./components/AppSettingsGate";
import { Layout } from "./components/Layout";
import { PageTransition } from "./components/PageTransition";
import Search from "./pages/Search";
import Generator from "./pages/Generator";
import Kennisbank from "./pages/Kennisbank";
import SavedRvws from "./pages/SavedRvws";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Favorites from "./pages/Favorites";
import Pricing from "./pages/Pricing";
import Success from "./pages/Success";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Laden...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<Auth />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/success" element={<Success />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Search />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/generator/:code"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Generator />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kennisbank"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Kennisbank />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/opgeslagen"
          element={
            <ProtectedRoute>
              <PageTransition>
                <SavedRvws />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorieten"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Favorites />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Admin />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Settings />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem
      themes={["light", "dark", "amsterdam", "custom"]}
      storageKey="app-theme"
    >
      <AppSettingsGate>
        <AuthProvider>
          <SubscriptionProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AnimatedRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </AppSettingsGate>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
