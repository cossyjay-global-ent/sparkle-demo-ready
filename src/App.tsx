import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CloudDataProvider } from "@/contexts/CloudDataContext";
import { RBACProvider } from "@/contexts/RBACContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { DateFilterProvider } from "@/contexts/DateFilterContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpdateNotification } from "@/components/UpdateNotification";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Install from "./pages/Install";
import About from "./pages/About";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Upgrade from "./pages/Upgrade";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});


const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <AuthProvider>
                <RBACProvider>
                  <SubscriptionProvider>
                    <DateFilterProvider>
                      <CurrencyProvider>
                        <CloudDataProvider>
                          <Toaster />
                          <Sonner />
                          <UpdateNotification />
                          <OfflineIndicator />
                          <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="/auth" element={<Auth />} />
                            <Route path="/auth/login" element={<Auth />} />
                            <Route path="/auth/register" element={<Auth />} />
                            <Route path="/dashboard/*" element={
                              <ProtectedRoute>
                                <Dashboard />
                              </ProtectedRoute>
                            } />
                            <Route path="/install" element={<Install />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/support" element={<Support />} />
                            <Route path="/upgrade" element={
                              <ProtectedRoute>
                                <Upgrade />
                              </ProtectedRoute>
                            } />
                            <Route path="/settings" element={
                              <ProtectedRoute>
                                <Settings />
                              </ProtectedRoute>
                            } />
                            <Route path="/profile" element={
                              <ProtectedRoute>
                                <Profile />
                              </ProtectedRoute>
                            } />
                            <Route path="/billing" element={
                              <ProtectedRoute>
                                <Billing />
                              </ProtectedRoute>
                            } />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </CloudDataProvider>
                      </CurrencyProvider>
                    </DateFilterProvider>
                  </SubscriptionProvider>
                </RBACProvider>
              </AuthProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
