import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ThemeProvider from "./components/ThemeProvider";
import { I18nProvider } from "./components/I18nProvider";
import { AuthProvider } from "./components/AuthProvider";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Dashboard from "./pages/Dashboard";
import Detection from "./pages/Detection";
import Analytics from "./pages/Analytics";
import Market from "./pages/Market";
import ModelTraining from "./pages/ModelTraining";
import SystemFlow from "./pages/SystemFlow";
import TechStack from "./pages/TechStack";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <I18nProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* public */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<AdminLogin />} />

                {/* user protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/detection" element={<Detection />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/market" element={<Market />} />
                  </Route>
                </Route>

                {/* admin-only routes */}
                <Route element={<AdminRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/training" element={<ModelTraining />} />
                    <Route path="/system" element={<SystemFlow />} />
                    <Route path="/tech" element={<TechStack />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </I18nProvider>
  </ThemeProvider>
);

export default App;
