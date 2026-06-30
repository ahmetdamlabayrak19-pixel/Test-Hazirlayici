import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import HomePage from "@/pages/HomePage";
import TestWorkspacePage from "@/pages/TestWorkspacePage";
import SavedTestsPage from "@/pages/SavedTestsPage";
import TemplatesPage from "@/pages/TemplatesPage";
import SettingsPage from "@/pages/SettingsPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/tests/new" component={TestWorkspacePage} />
      <Route path="/tests" component={SavedTestsPage} />
      <Route path="/tests/:id" component={TestWorkspacePage} />
      <Route path="/templates" component={TemplatesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
