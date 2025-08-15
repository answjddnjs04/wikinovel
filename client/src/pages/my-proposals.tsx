import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, RefreshCw, Eye, Edit3, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function MyProposals() {
  const { toast } = useToast();
  const { data: proposals, isLoading } = useQuery({
    queryKey: ["/api/my-proposals"],
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete proposal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-proposals"] });
      toast({
        title: "제안이 삭제되었습니다",
        description: "제안이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "제안을 삭제할 수 없습니다. (승인된 제안은 삭제할 수 없습니다)",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'expired': return <Clock className="h-4 w-4" />;
      case 'needs_review': return <RefreshCw className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '투표중';
      case 'approved': return '승인됨';
      case 'rejected': return '거절됨';
      case 'expired': return '만료됨';
      case 'needs_review': return '재검토 요청';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'needs_review': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProposalTypeText = (type: string) => {
    switch (type) {
      case 'modification': return '소설 내용';
      case 'worldSetting': return '세계관';
      case 'rules': return '규칙';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">내 제안 관리</h1>
          <p className="text-slate-600">제출한 제안들의 상태를 확인하고 관리하세요</p>
        </div>

        {!proposals || (proposals as any[]).length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-slate-400 mb-4">
              <Edit3 className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">아직 제안이 없습니다</h3>
            <p className="text-slate-500 mb-4">소설에 참여하여 첫 번째 제안을 해보세요!</p>
            <Link href="/">
              <Button data-testid="button-go-home">소설 둘러보기</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {(proposals as any[]).map((proposal: any) => (
              <Card 
                key={proposal.id} 
                className="p-6 hover:shadow-md transition-shadow"
                data-testid={`card-proposal-${proposal.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">
                        {proposal.title}
                      </h3>
                      <Badge 
                        className={`flex items-center space-x-1 ${getStatusColor(proposal.status)}`}
                        data-testid={`badge-status-${proposal.status}`}
                      >
                        {getStatusIcon(proposal.status)}
                        <span>{getStatusText(proposal.status)}</span>
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-slate-600 mb-3">
                      <span className="flex items-center space-x-1">
                        <span>소설:</span>
                        <span className="font-medium">{proposal.novelTitle}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>유형:</span>
                        <span className="font-medium">{getProposalTypeText(proposal.proposalType)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(proposal.createdAt), { addSuffix: true, locale: ko })}</span>
                      </span>
                    </div>
                    
                    <p className="text-slate-700 text-sm leading-relaxed line-clamp-2">
                      {proposal.reason}
                    </p>
                    
                    {/* 투표 정보 (pending 상태일 때만) */}
                    {proposal.status === 'pending' && (
                      <div className="mt-3 flex items-center space-x-4 text-sm">
                        <span className="text-green-600">
                          찬성 {proposal.approveCount || 0}
                        </span>
                        <span className="text-red-600">
                          반대 {proposal.rejectCount || 0}
                        </span>
                        <span className="text-slate-500">
                          만료: {formatDistanceToNow(new Date(proposal.expiresAt), { locale: ko })} 후
                        </span>
                      </div>
                    )}

                    {/* 재검토 요청 알림 */}
                    {proposal.status === 'needs_review' && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center space-x-2 text-orange-800">
                          <RefreshCw className="h-4 w-4" />
                          <span className="font-medium">재검토가 필요합니다</span>
                        </div>
                        <p className="text-orange-700 text-sm mt-1">
                          원본 내용이 변경되어 제안을 다시 검토해야 합니다.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Link href={`/novels/${proposal.novelId}/proposals/${proposal.id}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-view-${proposal.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        상세보기
                      </Button>
                    </Link>
                    
                    {proposal.status === 'needs_review' && (
                      <Link href={`/novels/${proposal.novelId}/proposals/${proposal.id}`}>
                        <Button 
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                          data-testid={`button-rewrite-${proposal.id}`}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          다시 제안하기
                        </Button>
                      </Link>
                    )}

                    {proposal.status !== 'approved' && (
                      <Button 
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => deleteProposalMutation.mutate(proposal.id)}
                        disabled={deleteProposalMutation.isPending}
                        data-testid={`button-delete-${proposal.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        삭제
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}