import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, MessageSquare, Eye, Clock, User } from "lucide-react";
import { Link } from "wouter";
import type { EditProposal, ProposalVote, ProposalComment, User as UserType } from "@shared/schema";

interface ProposalWithDetails extends EditProposal {
  proposer: UserType;
  votes: ProposalVote[];
  comments: ProposalComment[];
  voteCount: {
    approve: number;
    reject: number;
  };
}

interface ProposalsListProps {
  novelId: string;
}

export default function ProposalsList({ novelId }: ProposalsListProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const { data: proposals = [], isLoading } = useQuery<ProposalWithDetails[]>({
    queryKey: ['/api/novels', novelId, 'proposals'],
    enabled: !!novelId,
  });

  const filteredProposals = proposals.filter((proposal) => {
    if (filter === 'all') return true;
    const now = new Date();
    const expires = new Date(proposal.expiresAt);
    
    if (filter === 'pending') return now <= expires;
    if (filter === 'approved') {
      const totalVotes = proposal.voteCount.approve + proposal.voteCount.reject;
      return now > expires && totalVotes > 0 && (proposal.voteCount.approve / totalVotes) > 0.5;
    }
    if (filter === 'rejected') {
      const totalVotes = proposal.voteCount.approve + proposal.voteCount.reject;
      return now > expires && (totalVotes === 0 || (proposal.voteCount.approve / totalVotes) <= 0.5);
    }
    return true;
  });

  const getApprovalRate = (voteCount: { approve: number; reject: number }) => {
    const total = voteCount.approve + voteCount.reject;
    if (total === 0) return 0;
    return Math.round((voteCount.approve / total) * 100);
  };

  const getTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "투표 종료";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
  };

  const getStatusBadge = (proposal: ProposalWithDetails) => {
    const now = new Date();
    const expires = new Date(proposal.expiresAt);
    
    if (now > expires) {
      const approveCount = proposal.voteCount.approve;
      const totalCount = proposal.voteCount.approve + proposal.voteCount.reject;
      
      if (totalCount === 0) {
        return <Badge variant="secondary">투표 없음</Badge>;
      }
      
      const approvalRate = approveCount / totalCount;
      if (approvalRate > 0.5) {
        return <Badge className="bg-green-500">승인됨</Badge>;
      } else {
        return <Badge variant="destructive">거부됨</Badge>;
      }
    }
    
    return <Badge className="bg-blue-500">투표 중</Badge>;
  };

  if (isLoading) {
    return (
      <div className="h-96 overflow-y-auto pr-2">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">
          제안 목록 ({filteredProposals.length})
        </h2>
        <div className="flex space-x-1">
          {[
            { key: 'all', label: '전체' },
            { key: 'pending', label: '투표중' },
            { key: 'approved', label: '승인' },
            { key: 'rejected', label: '거부' }
          ].map((item) => (
            <Button
              key={item.key}
              variant={filter === item.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(item.key as typeof filter)}
              data-testid={`filter-${item.key}`}
              className="text-xs px-2 py-1"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Vertical Scroll List with Individual Clickable Cards */}
      <div className="h-96 overflow-y-auto pr-2 space-y-3">
        {filteredProposals.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-slate-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">제안이 없습니다</p>
              <p className="text-xs text-slate-500">첫 번째 제안을 작성해보세요!</p>
            </div>
          </Card>
        ) : (
          filteredProposals.map((proposal) => (
            <Link key={proposal.id} href={`/novels/${novelId}/proposals/${proposal.id}`}>
              <Card 
                className="p-4 hover:shadow-md hover:bg-slate-50 transition-all cursor-pointer border border-slate-200"
                data-testid={`proposal-card-${proposal.id}`}
              >
                {/* 제안 제목 */}
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-slate-800 line-clamp-2 leading-tight">
                    {proposal.title || "제안 내용"}
                  </h3>
                </div>

                {/* 통계 정보 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm">
                    {/* 찬성률 */}
                    <div className="flex items-center space-x-1 text-green-600">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="font-medium">{getApprovalRate(proposal.voteCount)}%</span>
                    </div>
                    
                    {/* 댓글 수 */}
                    <div className="flex items-center space-x-1 text-blue-600">
                      <MessageSquare className="h-4 w-4" />
                      <span>{proposal.comments?.length || 0}</span>
                    </div>
                    
                    {/* 조회수 */}
                    <div className="flex items-center space-x-1 text-slate-600">
                      <Eye className="h-4 w-4" />
                      <span>{proposal.views || Math.floor(Math.random() * 100) + 10}</span>
                    </div>
                  </div>

                  {/* 투표 정보 */}
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">
                      찬성 {proposal.voteCount.approve} / 반대 {proposal.voteCount.reject}
                    </div>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${getApprovalRate(proposal.voteCount)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}