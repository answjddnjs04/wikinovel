import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Crown, Medal, Award, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ContributorRankingProps {
  novelId: string;
}

interface Contributor {
  userId: string;
  userName: string;
  totalContribution: number;
  contributionPercentage: number;
  title: string;
  rank: number;
}

const getTitleIcon = (title: string) => {
  switch (title) {
    case "원작자":
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case "공동작가":
      return <Medal className="h-4 w-4 text-silver-500" />;
    case "주요 기여자":
      return <Award className="h-4 w-4 text-bronze-500" />;
    case "기여자":
      return <Star className="h-4 w-4 text-blue-500" />;
    default:
      return <Users className="h-4 w-4 text-slate-500" />;
  }
};

const getTitleColor = (title: string) => {
  switch (title) {
    case "원작자":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "공동작가":
      return "bg-gray-100 text-gray-800 border-gray-300";
    case "주요 기여자":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "기여자":
      return "bg-blue-100 text-blue-800 border-blue-300";
    default:
      return "bg-slate-100 text-slate-800 border-slate-300";
  }
};

export default function ContributorRanking({ novelId }: ContributorRankingProps) {
  const { data: contributors = [], isLoading } = useQuery<Contributor[]>({
    queryKey: ["/api/novels", novelId, "contributors"],
    enabled: !!novelId,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">기여자 순위</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded mb-1"></div>
                <div className="h-3 bg-slate-200 rounded w-20"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (contributors.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">기여자 순위</h3>
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-500">아직 기여자가 없습니다</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Crown className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold" data-testid="title-contributor-ranking">기여자 순위</h3>
      </div>
      
      <div className="space-y-3">
        {contributors.map((contributor, index) => (
          <div 
            key={contributor.userId} 
            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            data-testid={`contributor-item-${contributor.userId}`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-semibold text-sm">
                {index + 1}
              </div>
              
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-slate-800" data-testid={`contributor-name-${contributor.userId}`}>
                    {contributor.userName}
                  </span>
                  <div className="flex items-center space-x-1">
                    {getTitleIcon(contributor.title)}
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getTitleColor(contributor.title)}`}
                      data-testid={`contributor-title-${contributor.userId}`}
                    >
                      {contributor.title}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {contributor.totalContribution.toLocaleString()}자 기여
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-semibold text-slate-800" data-testid={`contributor-percentage-${contributor.userId}`}>
                {contributor.contributionPercentage.toFixed(1)}%
              </div>
              <div className="w-16 h-2 bg-slate-200 rounded-full mt-1">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(contributor.contributionPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {contributors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            총 {contributors.length}명의 기여자가 참여했습니다
          </p>
        </div>
      )}
    </Card>
  );
}