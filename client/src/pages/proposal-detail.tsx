import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { EditProposal } from "@shared/schema";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, ThumbsUp, ThumbsDown, Clock, User, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function ProposalDetail() {
  const { novelId, proposalId } = useParams<{ novelId: string; proposalId: string }>();
  const [commentContent, setCommentContent] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Voting mutations - must be declared at top level
  const voteMutation = useMutation({
    mutationFn: async ({ voteType }: { voteType: "approve" | "reject" }) => {
      return await apiRequest("POST", "/api/proposal-votes", { 
        proposalId, 
        voteType 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', proposalId] });
      toast({
        title: "투표 완료",
        description: "투표가 성공적으로 등록되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "투표 실패",
        description: "투표 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const { data: proposal, isLoading: proposalLoading, error } = useQuery<EditProposal>({
    queryKey: ['/api/proposals', proposalId],
    enabled: !!proposalId
  });

  console.log('Router path params check:', { novelId, proposalId });
  console.log('URL check:', window.location.pathname);

  // Extract novelId from proposal data if not available in params
  const actualNovelId = novelId || (proposal as any)?.novelId;

  console.log('Proposal data:', proposal);
  console.log('Proposal loading:', proposalLoading);
  console.log('Proposal error:', error);
  console.log('Proposal ID:', proposalId);
  console.log('Novel ID from params:', novelId);
  console.log('Actual Novel ID:', actualNovelId);

  const { data: novel, isLoading: novelLoading } = useQuery({
    queryKey: ['/api/novels', actualNovelId],
    enabled: !!actualNovelId
  });

  if (proposalLoading || novelLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-12">
            <p className="text-slate-600">제안을 찾을 수 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

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
      case 'approved': return '승인됨';
      case 'rejected': return '거부됨';
      case 'expired': return '만료됨';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="text-slate-600 hover:text-slate-800"
            onClick={() => {
              window.location.href = `/novels/${actualNovelId}/proposals`;
            }}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            제안 목록으로 돌아가기
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-800">{proposal.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proposal.status)}`}>
              {getStatusText(proposal.status)}
            </span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-slate-600">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>제안자: {(proposal as any).proposer?.username || '익명'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>조회수: {(proposal as any).views || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>
                {formatDistanceToNow(new Date((proposal as any).createdAt), { 
                  addSuffix: true, 
                  locale: ko 
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Content Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Original Content */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
              기존 내용
            </h2>
            <div className="prose prose-slate max-w-none">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="whitespace-pre-wrap text-slate-700">
                  {(proposal as any).originalText}
                </p>
              </div>
            </div>
          </Card>

          {/* Proposed Content */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              제안 내용
            </h2>
            <div className="prose prose-slate max-w-none">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p className="whitespace-pre-wrap text-slate-700">
                  {(proposal as any).proposedText}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Reason */}
        {(proposal as any).reason && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">제안 이유</h2>
            <p className="text-slate-700 whitespace-pre-wrap">{(proposal as any).reason}</p>
          </Card>
        )}

        {/* Voting Section */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">투표 현황</h2>
          
          {(() => {
            const approveCount = parseInt((proposal as any).approveCount || 0);
            const rejectCount = parseInt((proposal as any).rejectCount || 0);
            const totalVotes = approveCount + rejectCount;
            const approveRate = totalVotes > 0 ? ((approveCount / totalVotes) * 100).toFixed(1) : 0;
            const rejectRate = totalVotes > 0 ? ((rejectCount / totalVotes) * 100).toFixed(1) : 0;
            
            return (
              <>
                {/* Vote Statistics */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-medium text-slate-700">전체 투표수: {totalVotes}표</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ThumbsUp className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">찬성 {approveCount}표</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">{approveRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${approveRate}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ThumbsDown className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">반대 {rejectCount}표</span>
                      </div>
                      <span className="text-lg font-bold text-red-600">{rejectRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${rejectRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          {(proposal as any).status === 'pending' && (
            <div className="flex space-x-4">
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="button-approve"
                onClick={() => voteMutation.mutate({ voteType: "approve" })}
                disabled={voteMutation.isPending}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                찬성
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                data-testid="button-reject"
                onClick={() => voteMutation.mutate({ voteType: "reject" })}
                disabled={voteMutation.isPending}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                반대
              </Button>
            </div>
          )}

          {(proposal as any).status !== 'pending' && (
            <div className="text-center py-4 text-slate-500">
              투표가 종료되었습니다.
            </div>
          )}
        </Card>

        {/* Comments Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">댓글</h2>
          
          {/* Comment Form */}
          <div className="mb-6">
            <Textarea
              placeholder="댓글을 작성해주세요..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              className="mb-3"
              rows={3}
              data-testid="textarea-comment"
            />
            <Button
              onClick={() => {
                // TODO: Implement comment submission
                toast({
                  title: "댓글 기능",
                  description: "댓글 기능이 곧 추가될 예정입니다.",
                });
              }}
              disabled={!commentContent.trim()}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-submit-comment"
            >
              <Send className="h-4 w-4 mr-2" />
              댓글 작성
            </Button>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            <div className="text-center py-8 text-slate-500">
              <p>아직 댓글이 없습니다.</p>
              <p className="text-sm">첫 번째 댓글을 작성해보세요!</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}