import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { ArrowLeft, MessageSquare, ThumbsUp, ThumbsDown, Clock, User, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { Novel, EditProposal, User as UserType } from "@shared/schema";

interface ProposalWithDetails extends EditProposal {
  proposer: UserType;
  approveCount: number;
  rejectCount: number;
}

export default function NovelProposals() {
  const { id } = useParams<{ id: string }>();

  const { data: novel } = useQuery<Novel>({
    queryKey: ["/api/novels", id],
  });

  const { data: proposals = [], isLoading } = useQuery<ProposalWithDetails[]>({
    queryKey: ["/api/novels", id, "proposals"],
    enabled: !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '✅ 승인됨';
      case 'rejected': return '❌ 거부됨';
      case 'expired': return '⏰ 만료됨';
      default: return status;
    }
  };

  const getProposalTypeText = (type: string) => {
    switch (type) {
      case 'modification': return '소설';
      case 'worldSetting': return '세계관';
      case 'rules': return '규칙';
      default: return type;
    }
  };

  const getProposalTypeColor = (type: string) => {
    switch (type) {
      case 'modification': return 'bg-slate-100 text-slate-800';
      case 'worldSetting': return 'bg-blue-100 text-blue-800';
      case 'rules': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="text-slate-600 hover:text-slate-800" 
            data-testid="button-back"
            onClick={() => {
              window.location.href = `/novels/${id}`;
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            소설로 돌아가기
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">수정 제안 목록</h1>
          {novel && (
            <p className="text-slate-600">
              <span className="font-medium">{novel.title}</span>의 수정 제안들
            </p>
          )}
        </div>

        {/* Proposals List */}
        <div className="space-y-4">
          {proposals.length === 0 ? (
            <Card className="p-8 text-center border border-slate-200">
              <div className="flex flex-col items-center space-y-3 text-slate-500">
                <MessageSquare className="h-12 w-12" />
                <h3 className="text-lg font-medium">아직 제안이 없습니다</h3>
                <p className="text-sm">첫 번째 수정 제안을 해보세요!</p>
              </div>
            </Card>
          ) : (
            proposals.map((proposal) => (
              <Card 
                key={proposal.id} 
                className="p-4 hover:shadow-md hover:bg-slate-50 transition-all cursor-pointer border border-slate-200"
                onClick={() => {
                  window.location.href = `/novels/${id}/proposals/${proposal.id}`;
                }}
                data-testid={`proposal-card-${proposal.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 line-clamp-2 leading-tight mb-2">
                      {proposal.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-slate-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{proposal.proposer?.username || '익명'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatDistanceToNow(new Date(proposal.createdAt), { 
                            addSuffix: true, 
                            locale: ko 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{proposal.views || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getProposalTypeColor(proposal.proposalType)}`}>
                        {getProposalTypeText(proposal.proposalType)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                        {getStatusText(proposal.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {proposal.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 text-green-600">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="text-sm font-medium">찬성 {proposal.voteCount?.approve || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-red-600">
                      <ThumbsDown className="h-4 w-4" />
                      <span className="text-sm font-medium">반대 {proposal.voteCount?.reject || 0}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    클릭하여 상세 보기
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}