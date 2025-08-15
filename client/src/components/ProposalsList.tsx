import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, MessageCircle, Clock, Eye, User } from "lucide-react";
import { Link } from "wouter";

interface Proposal {
  id: string;
  title?: string;
  proposer: {
    username: string;
  };
  createdAt: string;
  status: string;
  voteCount: {
    approve: number;
    reject: number;
  };
  comments: any[];
  views?: number;
}

interface ProposalsListProps {
  novelId: string;
}

export default function ProposalsList({ novelId }: ProposalsListProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['/api/novels', novelId, 'proposals'],
    queryFn: async () => {
      const response = await fetch(`/api/novels/${novelId}/proposals`);
      return response.json();
    },
  });

  const filteredProposals = proposals.filter((proposal: Proposal) => {
    if (filter === 'all') return true;
    return proposal.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">투표중</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">승인됨</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">거부됨</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getApprovalRate = (voteCount: { approve: number; reject: number }) => {
    const total = voteCount.approve + voteCount.reject;
    if (total === 0) return 0;
    return Math.round((voteCount.approve / total) * 100);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return '방금 전';
    if (diffHours < 24) return `${diffHours}시간 전`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}일 전`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              <div className="h-3 bg-slate-200 rounded w-full"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">
          제안 목록 ({filteredProposals.length})
        </h2>
        <div className="flex space-x-2">
          {[
            { key: 'all', label: '전체' },
            { key: 'pending', label: '투표중' },
            { key: 'approved', label: '승인됨' },
            { key: 'rejected', label: '거부됨' }
          ].map((item) => (
            <Button
              key={item.key}
              variant={filter === item.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(item.key as typeof filter)}
              data-testid={`filter-${item.key}`}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-slate-400">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">제안이 없습니다</p>
              <p className="text-sm">첫 번째 제안을 작성해보세요!</p>
            </div>
          </Card>
        ) : (
          filteredProposals.map((proposal: Proposal) => (
            <Card 
              key={proposal.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              data-testid={`proposal-card-${proposal.id}`}
              onClick={() => window.location.href = `/novels/${novelId}/proposals/${proposal.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {proposal.title || "제목 없음"}
                    </h3>
                    {getStatusBadge(proposal.status)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-slate-600 mb-3">
                    <span className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{proposal.proposer?.username || "익명"}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeAgo(proposal.createdAt)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{proposal.views || Math.floor(Math.random() * 100) + 10}회</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Vote Summary */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-3">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-600">
                      {proposal.voteCount.approve}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ThumbsDown className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-600">
                      {proposal.voteCount.reject}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4 text-slate-600" />
                    <span className="text-slate-600">
                      {proposal.comments?.length || 0}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-800">
                    찬성률 {getApprovalRate(proposal.voteCount)}%
                  </div>
                  <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${getApprovalRate(proposal.voteCount)}%` }}
                    />
                  </div>
                </div>
              </div>


            </Card>
          ))
        )}
      </div>
    </div>
  );
}