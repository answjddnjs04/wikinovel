import { Button } from "@/components/ui/button";
import { BookOpen, User, LogOut } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <BookOpen className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-slate-800" data-testid="text-app-title">
                위키노벨
              </h1>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/"
                className="text-slate-600 hover:text-slate-800 transition-colors font-medium"
                data-testid="link-home"
              >
                홈
              </Link>
              <Link 
                href="/my-proposals"
                className="text-slate-600 hover:text-slate-800 transition-colors font-medium"
                data-testid="link-my-proposals"
              >
                내 제안
              </Link>
              <Link 
                href="/leaderboard"
                className="text-slate-600 hover:text-slate-800 transition-colors font-medium"
                data-testid="link-leaderboard"
              >
                리더보드
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-2" data-testid="user-info">
                {(user as any).profileImageUrl && (
                  <img 
                    src={(user as any).profileImageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                    data-testid="img-user-avatar"
                  />
                )}
                <span className="text-sm text-slate-700" data-testid="text-username">
                  {(user as any).firstName || (user as any).email}
                </span>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}