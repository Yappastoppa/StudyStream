import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/auth/login";
import MapPage from "@/pages/dashboard/map";
import NotFound from "@/pages/not-found";

function App() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const handleLoginSuccess = (code: string) => {
    setInviteCode(code);
  };

  const handleLogout = () => {
    setInviteCode(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {!inviteCode ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        ) : (
          <Switch>
            <Route path="/" component={() => <MapPage inviteCode={inviteCode} onLogout={handleLogout} />} />
            <Route path="/map" component={() => <MapPage inviteCode={inviteCode} onLogout={handleLogout} />} />
            <Route component={NotFound} />
          </Switch>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
