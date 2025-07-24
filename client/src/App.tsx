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
  // Bypass authentication for now - go straight to racing dashboard
  const handleLogout = () => {
    console.log("Logout clicked");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/" component={() => <MapPage inviteCode="ADMIN2025" onLogout={handleLogout} />} />
          <Route path="/map" component={() => <MapPage inviteCode="ADMIN2025" onLogout={handleLogout} />} />
          <Route path="/login" component={() => <LoginPage onLoginSuccess={() => {}} />} />
          <Route component={NotFound} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
