import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut } from "lucide-react";
import { Link } from "wouter";

export default function Header() {
  const { user, isAuthenticated } = useAuth();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return firstName[0] + lastName[0];
    }
    if (firstName) return firstName[0];
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName}${user.lastName}`;
    }
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return "사용자";
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-slate-800" data-testid="link-home">
                <BookOpen className="inline mr-2 text-primary" />
                위키소설
              </h1>
            </Link>
            <nav className="hidden md:ml-8 md:flex space-x-8">
              <Link 
                href="/" 
                className="text-slate-600 hover:text-primary transition-colors"
                data-testid="link-home-nav"
              >
                홈
              </Link>
              <Link 
                href="/" 
                className="text-slate-600 hover:text-primary transition-colors"
                data-testid="link-genres"
              >
                장르별 소설
              </Link>
              <Link 
                href="/contributions" 
                className="text-slate-600 hover:text-primary transition-colors"
                data-testid="link-contributions"
              >
                내 기여
              </Link>
            </nav>
          </div>

          {isAuthenticated && user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-slate-600">
                  <span className="px-2 py-1 bg-success text-white text-xs rounded-full" data-testid="text-user-title">
                    {user.title || "참여자"}
                  </span>
                  <span className="ml-2" data-testid="text-user-name">
                    {getDisplayName()}
                  </span>
                </span>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium" data-testid="avatar-user">
                  {getUserInitials(user.firstName, user.lastName)}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
