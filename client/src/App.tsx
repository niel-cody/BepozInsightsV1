import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import SalesTrendsPage from "@/pages/sales-trends";
import AIChatPage from "@/pages/ai-chat";
import NotFound from "@/pages/not-found";
import ChooseOrgPage from "@/pages/choose-org";

function AuthenticatedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Loading handled by AuthGuard
  }

  if (!user) {
    return <LoginPage />;
  }

  // If user has no org in token, force choose-org flow
  if (!user.orgId) {
    return <ChooseOrgPage />;
  }

  return (
    <Switch>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/sales-trends" component={SalesTrendsPage} />
      <Route path="/ai-chat" component={AIChatPage} />
      <Route path="/" component={DashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
