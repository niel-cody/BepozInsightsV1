import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OrgProvider, useOrg } from "@/hooks/use-org";
import DashboardPage from "@/pages/dashboard";
import SalesTrendsPage from "@/pages/sales-trends";
import AIChatPage from "@/pages/ai-chat";
import NotFound from "@/pages/not-found";
import ChooseOrgPage from "@/pages/choose-org";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function AppRoutes() {
  const { selectedOrg, loading } = useOrg();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading organizations...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no org selected, show org selection
  if (!selectedOrg) {
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
  return <AppRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OrgProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </OrgProvider>
    </QueryClientProvider>
  );
}

export default App;
