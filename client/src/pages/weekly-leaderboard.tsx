import Header from "@/components/Header";
import WeeklyLeaderboard from "@/components/WeeklyLeaderboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function WeeklyLeaderboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-slate-600 hover:text-slate-800" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              홈으로
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-800 mb-3" data-testid="text-page-title">
              주간 리더보드
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
              이번 주 가장 활발한 소설과 기여자들을 확인해보세요
            </p>
          </div>
        </div>

        {/* Leaderboard */}
        <WeeklyLeaderboard />
      </div>
    </div>
  );
}