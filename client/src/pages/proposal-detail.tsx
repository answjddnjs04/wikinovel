import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { EditProposal } from "@shared/schema";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, ThumbsUp, ThumbsDown, Clock, User, Send, Edit3, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function ProposalDetail() {
  const { novelId, proposalId } = useParams<{ novelId: string; proposalId: string }>();
  const [commentContent, setCommentContent] = useState("");
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [newProposalTitle, setNewProposalTitle] = useState("");
  const [newProposalContent, setNewProposalContent] = useState("");
  const [newProposalReason, setNewProposalReason] = useState("");
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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['/api/novels', actualNovelId] });
      
      if (data.proposalApplied) {
        toast({
          title: "제안 자동 승인됨! 🎉",
          description: "투표율 50%를 달성하여 제안이 소설에 반영되었습니다.",
        });
      } else {
        toast({
          title: "투표 완료",
          description: "투표가 성공적으로 등록되었습니다.",
        });
      }
    },
    onError: () => {
      toast({
        title: "투표 실패",
        description: "투표 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      return await apiRequest("POST", "/api/proposal-comments", { 
        proposalId, 
        content 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', proposalId, 'comments'] });
      setCommentContent("");
      toast({
        title: "댓글 작성 완료",
        description: "댓글이 성공적으로 작성되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "댓글 작성 실패",
        description: "댓글 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // New proposal creation mutation for review
  const createNewProposalMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/proposals`, {
        novelId: actualNovelId,
        title: newProposalTitle,
        proposalType: (proposal as any).proposalType,
        originalText: (novel as any)?.content || (novel as any)?.worldSetting || (novel as any)?.rules || "",
        proposedText: newProposalContent,
        reason: newProposalReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/novels", actualNovelId, "proposals"] });
      toast({
        title: "새 제안 작성 완료",
        description: "채택된 버전을 기반으로 새 제안이 성공적으로 등록되었습니다.",
      });
      setShowReviewDialog(false);
      setNewProposalTitle("");
      setNewProposalContent("");
      setNewProposalReason("");
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "제안을 등록하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleRewriteProposal = () => {
    // Get current content based on proposal type
    let currentContent = "";
    if ((proposal as any).proposalType === "modification") {
      currentContent = (novel as any)?.content || "";
    } else if ((proposal as any).proposalType === "worldSetting") {
      currentContent = (novel as any)?.worldSetting || "";
    } else if ((proposal as any).proposalType === "rules") {
      currentContent = (novel as any)?.rules || "";
    }

    setNewProposalContent(currentContent);
    setNewProposalTitle(`${(proposal as any).title} (재작성)`);
    setNewProposalReason("채택된 버전을 기반으로 재작성");
    setShowReviewDialog(true);
  };

  const submitComment = () => {
    if (!commentContent.trim()) {
      toast({
        title: "댓글 내용 필요",
        description: "댓글 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    commentMutation.mutate({ content: commentContent });
  };

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

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['/api/proposals', proposalId, 'comments'],
    enabled: !!proposalId
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
      case 'needs_review': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '승인됨';
      case 'rejected': return '거부됨';
      case 'expired': return '만료됨';
      case 'needs_review': return '재검토 요청';
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
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                (proposal as any).proposalType === 'modification' ? 'bg-slate-100 text-slate-800' :
                (proposal as any).proposalType === 'worldSetting' ? 'bg-blue-100 text-blue-800' :
                (proposal as any).proposalType === 'rules' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {(proposal as any).proposalType === 'modification' ? '소설' :
                 (proposal as any).proposalType === 'worldSetting' ? '세계관' :
                 (proposal as any).proposalType === 'rules' ? '규칙' :
                 '제안'}
              </span>
              <h1 className="text-3xl font-bold text-slate-800">{proposal.title}</h1>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proposal.status)}`}>
              {getStatusText(proposal.status)}
            </span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-slate-600">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>제안자: {(proposal as any).proposer?.username || (proposal as any).proposer?.firstName || '익명'}</span>
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
              기존 {(proposal as any).proposalType === 'modification' ? '소설' :
                     (proposal as any).proposalType === 'worldSetting' ? '세계관' :
                     (proposal as any).proposalType === 'rules' ? '규칙' : '내용'}
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
              제안 {(proposal as any).proposalType === 'modification' ? '소설' :
                    (proposal as any).proposalType === 'worldSetting' ? '세계관' :
                    (proposal as any).proposalType === 'rules' ? '규칙' : '내용'}
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
            const approveWeight = parseInt((proposal as any).approveCount || 0);
            const rejectWeight = parseInt((proposal as any).rejectCount || 0);
            const totalWeight = approveWeight + rejectWeight;
            const approveRate = totalWeight > 0 ? ((approveWeight / totalWeight) * 100).toFixed(1) : 0;
            const rejectRate = totalWeight > 0 ? ((rejectWeight / totalWeight) * 100).toFixed(1) : 0;
            
            return (
              <>
                {/* Vote Statistics */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-medium text-slate-700">전체 투표 가중치: {totalWeight}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ThumbsUp className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">찬성 {approveWeight}</span>
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
                        <span className="font-medium text-red-800">반대 {rejectWeight}</span>
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
                {voteMutation.isPending ? "투표 중..." : "찬성"}
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                data-testid="button-reject"
                onClick={() => voteMutation.mutate({ voteType: "reject" })}
                disabled={voteMutation.isPending}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                {voteMutation.isPending ? "투표 중..." : "반대"}
              </Button>
            </div>
          )}

          {(proposal as any).status === 'approved' && (
            <div className="text-center py-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-800 font-semibold">✅ 제안이 승인되어 소설에 반영되었습니다!</div>
              <div className="text-green-600 text-sm mt-1">투표율 50%를 달성했습니다.</div>
            </div>
          )}

          {(proposal as any).status === 'rejected' && (
            <div className="text-center py-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-semibold">❌ 제안이 거부되었습니다</div>
              <div className="text-red-600 text-sm mt-1">투표 결과 과반수 찬성을 얻지 못했습니다.</div>
            </div>
          )}

          {(proposal as any).status === 'expired' && (
            <div className="text-center py-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-800 font-semibold">⏰ 제안이 만료되었습니다</div>
              <div className="text-slate-600 text-sm mt-1">투표 기간이 종료되었습니다.</div>
            </div>
          )}

          {(proposal as any).status === 'needs_review' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-800 mb-2">재검토 요청</h3>
                  <p className="text-orange-700 mb-4">
                    기존 제안은 원본이 변경되어 바로 적용할 수 없습니다.
                    채택된 버전을 기반으로 새 제안을 작성하시겠습니까?
                  </p>
                  <Button
                    onClick={handleRewriteProposal}
                    className="bg-orange-600 hover:bg-orange-700"
                    data-testid="button-rewrite"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    다시 작성하기
                  </Button>
                </div>
              </div>
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
                if (commentContent.trim()) {
                  commentMutation.mutate({ content: commentContent.trim() });
                }
              }}
              disabled={!commentContent.trim() || commentMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-submit-comment"
            >
              <Send className="h-4 w-4 mr-2" />
              {commentMutation.isPending ? "작성 중..." : "댓글 작성"}
            </Button>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {commentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-4 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : comments && Array.isArray(comments) && comments.length > 0 ? (
              comments.map((comment: any) => (
                <div key={comment.id} className="border-b border-slate-200 pb-4 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-slate-800">
                          {comment.user?.firstName || comment.user?.email || '익명'}
                        </span>
                        <span className="text-sm text-slate-500">
                          {formatDistanceToNow(new Date(comment.createdAt), { 
                            addSuffix: true, 
                            locale: ko 
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>아직 댓글이 없습니다.</p>
                <p className="text-sm">첫 번째 댓글을 작성해보세요!</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* New Proposal Dialog for Review */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 제안 작성</DialogTitle>
            <DialogDescription>
              채택된 버전을 기반으로 새로운 제안을 작성해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">제안 제목</label>
              <Input
                value={newProposalTitle}
                onChange={(e) => setNewProposalTitle(e.target.value)}
                placeholder="제안 제목을 입력하세요"
                data-testid="input-proposal-title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">제안 내용</label>
              <Textarea
                value={newProposalContent}
                onChange={(e) => setNewProposalContent(e.target.value)}
                placeholder="새로운 내용을 입력하세요"
                rows={10}
                data-testid="textarea-proposal-content"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">제안 이유</label>
              <Textarea
                value={newProposalReason}
                onChange={(e) => setNewProposalReason(e.target.value)}
                placeholder="이 제안을 하는 이유를 설명해주세요"
                rows={3}
                data-testid="textarea-proposal-reason"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowReviewDialog(false)}
                data-testid="button-cancel"
              >
                취소
              </Button>
              <Button
                onClick={() => createNewProposalMutation.mutate()}
                disabled={createNewProposalMutation.isPending || !newProposalTitle.trim() || !newProposalContent.trim()}
                data-testid="button-submit-proposal"
              >
                {createNewProposalMutation.isPending ? "등록 중..." : "제안 등록"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}