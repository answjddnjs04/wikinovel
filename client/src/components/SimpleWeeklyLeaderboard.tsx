import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Eye, TrendingUp, Trophy } from "lucide-react";
import { Link } from "wouter";

interface SimpleWeeklyLeaderboardProps {
  className?: string;
}

export default function SimpleWeeklyLeaderboard({ className = "" }: SimpleWeeklyLeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'novels' | 'proposals' | 'applied'>('novels');

  const { data: weeklyStats, isLoading } = useQuery({
    queryKey: ['/api/weekly-stats'],
    queryFn: async () => {
      const response = await fetch('/api/weekly-stats');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-lg">주간 리더보드</h3>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 h-12 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case 'novels':
        return weeklyStats?.topNovels || [];
      case 'proposals':
        return weeklyStats?.topProposals || [];
      case 'applied':
        return weeklyStats?.topApplied || [];
      default:
        return [];
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'novels':
        return <Eye className="h-4 w-4" />;
      case 'proposals':
        return <TrendingUp className="h-4 w-4" />;
      case 'applied':
        return <Crown className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-lg">주간 리더보드</h3>
        </div>
        <Link href="/weekly-leaderboard">
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            전체보기
          </Button>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 bg-slate-100 p-1 rounded-lg">
        {[
          { key: 'novels', label: '소설' },
          { key: 'proposals', label: '제안' },
          { key: 'applied', label: '반영' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            data-testid={`tab-${tab.key}`}
          >
            {getTabIcon(tab.key)}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Content */}
      <div className="space-y-2">
        {getCurrentData().slice(0, 5).map((item: any, index: number) => (
          <div
            key={item.id || index}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
            data-testid={`leaderboard-item-${index}`}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                index === 1 ? 'bg-slate-100 text-slate-700' :
                index === 2 ? 'bg-amber-100 text-amber-700' :
                'bg-slate-50 text-slate-600'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {activeTab === 'novels' ? item.title : 
                   activeTab === 'proposals' ? item.title :
                   item.username}
                </p>
                {(activeTab === 'proposals' || activeTab === 'applied') && (
                  <p className="text-xs text-slate-500 truncate">
                    {item.username}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">
                {activeTab === 'novels' ? formatCount(item.views) :
                 activeTab === 'proposals' ? formatCount(item.views) :
                 formatCount(item.appliedCount)}
              </p>
              <p className="text-xs text-slate-500">
                {activeTab === 'novels' ? '조회' :
                 activeTab === 'proposals' ? '조회' :
                 '반영'}
              </p>
            </div>
          </div>
        ))}

        {getCurrentData().length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">아직 데이터가 없습니다</p>
          </div>
        )}
      </div>
    </Card>
  );
}