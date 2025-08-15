import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import type { Novel } from "@shared/schema";

interface NovelCardProps {
  novel: Novel;
}

export default function NovelCard({ novel }: NovelCardProps) {
  const getStatusBadge = () => {
    // TODO: Implement actual status logic based on proposals and votes
    const statuses = ["최신", "제안 대기중", "투표중"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    switch (status) {
      case "최신":
        return <Badge className="bg-success text-white">최신</Badge>;
      case "제안 대기중":
        return <Badge className="bg-warning text-white">제안 대기중</Badge>;
      case "투표중":
        return <Badge className="bg-primary text-white">투표중</Badge>;
      default:
        return null;
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInHours = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "방금 전";
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}일 전`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow w-full" data-testid={`card-novel-${novel.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-6">
            <h3 className="text-xl font-bold text-slate-800 mb-3" data-testid="text-novel-title">
              {novel.title}
            </h3>
            
            {novel.description && (
              <p className="text-base text-slate-600 mb-4 line-clamp-2 leading-relaxed" data-testid="text-novel-description">
                {novel.description}
              </p>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-slate-500 mb-3">
              <span data-testid="text-contributors">
                기여자 {(novel as any).contributorCount || 0}명
                {(novel as any).activeContributorCount > 0 && (
                  <span className="ml-1 text-green-600">
                    (활성 {(novel as any).activeContributorCount}명)
                  </span>
                )}
              </span>
              <span data-testid="text-last-updated">
                {novel.updatedAt ? formatTimeAgo(novel.updatedAt) : "방금 전"} 업데이트
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              {getStatusBadge()}
              <span className="text-sm text-slate-500" data-testid="text-pending-proposals">
                제안 {(novel as any).pendingProposals || 0}건
              </span>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <Link href={`/novels/${novel.id}`}>
              <Button 
                variant="default"
                className="px-6 py-2"
                data-testid="link-read-novel"
              >
                읽기 →
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}