import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import ProfileSetupModal from "@/components/ProfileSetupModal";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import NovelDetail from "@/pages/novel-detail";
import NovelProposals from "@/pages/novel-proposals-simple";
import ProposalDetail from "@/pages/proposal-detail";
import MyProposals from "@/pages/my-proposals";
import Profile from "@/pages/profile";
import WeeklyLeaderboardPage from "@/pages/weekly-leaderboard";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [hasCheckedNewUser, setHasCheckedNewUser] = useState(false);

  console.log('Router - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  console.log('Current path:', window.location.pathname);

  // Check if user is new and should see profile setup modal
  useEffect(() => {
    if (user && !hasCheckedNewUser && !isLoading) {
      setHasCheckedNewUser(true);
      const isNewUser = (user as any).isNewUser;
      if (isNewUser) {
        console.log('New user detected, showing profile setup modal');
        setShowProfileSetup(true);
      }
    }
  }, [user, isLoading, hasCheckedNewUser]);

  // Skip landing page if user is authenticated and on root path
  if (isAuthenticated && window.location.pathname === '/') {
    return (
      <>
        <ProfileSetupModal 
          open={showProfileSetup} 
          onClose={() => setShowProfileSetup(false)} 
        />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/leaderboard" component={WeeklyLeaderboardPage} />
          <Route path="/my-proposals" component={MyProposals} />
          <Route path="/profile" component={Profile} />
          <Route path="/novels/:id" component={NovelDetail} />
          <Route path="/novels/:id/proposals" component={NovelProposals} />
          <Route path="/novels/:novelId/proposals/:proposalId" component={ProposalDetail} />
          <Route component={NotFound} />
        </Switch>
      </>
    );
  }

  return (
    <>
      <ProfileSetupModal 
        open={showProfileSetup} 
        onClose={() => setShowProfileSetup(false)} 
      />
      <Switch>
        {isLoading ? (
          <Route component={() => <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-600"></div>
          </div>} />
        ) : !isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route component={Landing} />
          </>
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/leaderboard" component={WeeklyLeaderboardPage} />
            <Route path="/my-proposals" component={MyProposals} />
            <Route path="/profile" component={Profile} />
            <Route path="/novels/:id" component={NovelDetail} />
            <Route path="/novels/:id/proposals" component={NovelProposals} />
            <Route path="/novels/:novelId/proposals/:proposalId" component={ProposalDetail} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
