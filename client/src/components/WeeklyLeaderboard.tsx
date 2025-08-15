import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Eye, CheckCircle, Calendar } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  title: string;
  value: number;
  rank: number;
  percentage?: number;
}

interface WeeklyLeaderboardData {
  approvedSuggestions: LeaderboardEntry[];
  novelViews: LeaderboardEntry[];
  suggestionViews: LeaderboardEntry[];
  approvalRates: LeaderboardEntry[];
}

export default function WeeklyLeaderboard() {
  const { data: leaderboard, isLoading } = useQuery<WeeklyLeaderboardData>({
    queryKey: ["/api/leaderboard/weekly"],
    refetchInterval: 5 * 60 * 1000, // 5분마다 갱신
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Trophy className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Trophy className="h-4 w-4 text-orange-500" />;
    return <span className="text-slate-500 font-semibold">{rank}</span>;
  };

  const formatValue = (value: number, type: string) => {
    switch (type) {
      case 'views':
        return `${value.toLocaleString()} 조회`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'count':
      default:
        return `${value}개`;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">이번 주 리더보드</h3>
          <Badge variant="outline" className="text-xs">실시간</Badge>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded mb-1"></div>
                <div className="h-3 bg-slate-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!leaderboard) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">이번 주 리더보드</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-500">아직 이번 주 데이터가 없습니다</p>
        </div>
      </Card>
    );
  }

  const renderLeaderboardList = (entries: LeaderboardEntry[], valueType: string) => (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">아직 데이터가 없습니다</p>
        </div>
      ) : (
        entries.map((entry) => (
          <div 
            key={entry.id} 
            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            data-testid={`leaderboard-item-${entry.id}`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8">
                {getRankBadge(entry.rank)}
              </div>
              
              <div>
                <div className="font-medium text-slate-800" data-testid={`entry-title-${entry.id}`}>
                  {entry.title}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-semibold text-slate-800" data-testid={`entry-value-${entry.id}`}>
                {formatValue(entry.value, valueType)}
              </div>

            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold" data-testid="title-weekly-leaderboard">이번 주 리더보드</h3>
          <Badge variant="outline" className="text-xs">실시간</Badge>
        </div>
      </div>

      <Tabs defaultValue="approved" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="approved" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            반영 소설
          </TabsTrigger>
          <TabsTrigger value="novelViews" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            소설 조회
          </TabsTrigger>
          <TabsTrigger value="suggestionViews" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            제안 조회
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approved" className="space-y-0">
          <div className="mb-2">
            <h4 className="font-medium text-slate-700">가장 많이 반영된 소설</h4>
            <p className="text-xs text-slate-500">이번 주 승인된 제안 수 기준</p>
          </div>
          {renderLeaderboardList(leaderboard.approvedSuggestions, 'count')}
        </TabsContent>

        <TabsContent value="novelViews" className="space-y-0">
          <div className="mb-2">
            <h4 className="font-medium text-slate-700">소설 조회수 랭킹</h4>
            <p className="text-xs text-slate-500">이번 주 조회수 기준</p>
          </div>
          {renderLeaderboardList(leaderboard.novelViews, 'views')}
        </TabsContent>

        <TabsContent value="suggestionViews" className="space-y-0">
          <div className="mb-2">
            <h4 className="font-medium text-slate-700">제안 조회수 랭킹</h4>
            <p className="text-xs text-slate-500">이번 주 제안 조회수 기준</p>
          </div>
          {renderLeaderboardList(leaderboard.suggestionViews, 'views')}
        </TabsContent>


      </Tabs>

      <div className="mt-4 pt-4 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-500">
          매주 월요일 00시에 초기화됩니다
        </p>
      </div>
    </Card>
  );
}