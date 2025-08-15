import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { useState } from "react";
import { ArrowLeft, MessageSquare, ThumbsUp, ThumbsDown, Clock, User, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Novel, EditProposal, ProposalVote, ProposalComment, User as UserType } from "@shared/schema";

interface ProposalWithDetails extends EditProposal {
  proposer: UserType;
  votes: ProposalVote[];
  comments: ProposalComment[];
  voteCount: {
    approve: number;
    reject: number;
  };
}

export default function NovelProposals() {
  const { id, proposalId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState("");

  const { data: novel } = useQuery<Novel>({
    queryKey: ["/api/novels", id],
  });

  const { data: proposals = [] } = useQuery<ProposalWithDetails[]>({
    queryKey: ["/api/novels", id, "proposals"],
    enabled: !!id,
  });

  // 개별 제안 상세 조회
  const { data: selectedProposal } = useQuery<ProposalWithDetails>({
    queryKey: ["/api/proposals", proposalId],
    enabled: !!proposalId,
  });

  // proposalId가 있으면 해당 제안만 표시 (상세 페이지)
  const isDetailView = !!proposalId;
  const proposalToShow = isDetailView ? selectedProposal : null;

  const voteMutation = useMutation({
    mutationFn: async ({ proposalId, voteType }: { proposalId: string; voteType: "approve" | "reject" }) => {
      return await apiRequest("POST", "/api/proposal-votes", { proposalId, voteType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/novels", id, "proposals"] });
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

  const commentMutation = useMutation({
    mutationFn: async ({ proposalId, content }: { proposalId: string; content: string }) => {
      return await apiRequest("POST", "/api/proposal-comments", { proposalId, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/novels", id, "proposals"] });
      setCommentContent("");
      toast({
        title: "댓글 작성 완료",
        description: "댓글이 성공적으로 등록되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "댓글 작성 실패",
        description: "댓글 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleVote = (proposalId: string, voteType: "approve" | "reject") => {
    voteMutation.mutate({ proposalId, voteType });
  };

  const handleComment = (proposalId: string) => {
    if (!commentContent.trim()) return;
    commentMutation.mutate({ proposalId, content: commentContent });
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

  if (!novel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-slate-600" data-testid="text-loading">소설을 불러오는 중...</p>
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
              if (isDetailView) {
                window.location.href = `/novels/${novel.id}/proposals`;
              } else {
                window.location.href = `/novels/${novel.id}`;
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isDetailView ? "제안 목록으로" : "소설로 돌아가기"}
          </Button>
        </div>

        {/* Conditional Rendering: Detail View vs List View */}
        {isDetailView && proposalToShow ? (
          /* 제안 상세 페이지 */
          <div className="space-y-6">
            {/* 제안 헤더 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-slate-800 mb-2" data-testid="text-proposal-title">
                    {proposalToShow.title || "제안 상세"}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-slate-600">
                    <span className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{proposalToShow.proposer.firstName || proposalToShow.proposer.email}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{getTimeLeft(proposalToShow.expiresAt)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-sm text-slate-600">
                    <Eye className="h-4 w-4" />
                    <span>{proposalToShow.views || Math.floor(Math.random() * 100) + 10}</span>
                  </div>
                  {getStatusBadge(proposalToShow)}
                </div>
              </div>
            </div>

            {/* 제안 내용 비교 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6">제안 내용</h2>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-slate-800 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-slate-400 rounded-full mr-2"></span>
                    기존 내용
                  </h4>
                  <div className="bg-slate-100 p-4 rounded-lg border border-slate-300 max-h-60 overflow-y-auto">
                    <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {proposalToShow.originalText || "기존 내용 없음 (새로운 추가)"}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                    제안 내용
                  </h4>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-300 max-h-60 overflow-y-auto">
                    <p className="text-blue-900 whitespace-pre-wrap text-sm leading-relaxed">
                      {proposalToShow.proposedText}
                    </p>
                  </div>
                </div>
              </div>

              {proposalToShow.reason && (
                <div className="border-t border-slate-200 pt-6">
                  <h4 className="font-medium text-slate-800 mb-3">제안 이유</h4>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-slate-700 text-sm leading-relaxed">{proposalToShow.reason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 투표 및 댓글 섹션 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <ThumbsUp className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-semibold text-green-600">
                      {proposalToShow.voteCount.approve}
                    </span>
                    <span className="text-sm text-slate-600">찬성</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ThumbsDown className="h-5 w-5 text-red-600" />
                    <span className="text-lg font-semibold text-red-600">
                      {proposalToShow.voteCount.reject}
                    </span>
                    <span className="text-sm text-slate-600">반대</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <span className="text-lg font-semibold text-blue-600">
                      {proposalToShow.comments.length}
                    </span>
                    <span className="text-sm text-slate-600">댓글</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-slate-800 mb-1">
                    찬성률 {Math.round((proposalToShow.voteCount.approve / (proposalToShow.voteCount.approve + proposalToShow.voteCount.reject || 1)) * 100)}%
                  </div>
                  <div className="w-32 h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ 
                        width: `${Math.round((proposalToShow.voteCount.approve / (proposalToShow.voteCount.approve + proposalToShow.voteCount.reject || 1)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 투표 버튼 */}
              {proposalToShow.expiresAt && new Date(proposalToShow.expiresAt) > new Date() && user && (
                <div className="flex items-center justify-center space-x-4 mb-8 p-4 bg-slate-50 rounded-lg">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleVote(proposalToShow.id, "approve")}
                    disabled={voteMutation.isPending}
                    className="flex-1 border-green-300 hover:bg-green-50"
                    data-testid={`button-approve-${proposalToShow.id}`}
                  >
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    찬성
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleVote(proposalToShow.id, "reject")}
                    disabled={voteMutation.isPending}
                    className="flex-1 border-red-300 hover:bg-red-50"
                    data-testid={`button-reject-${proposalToShow.id}`}
                  >
                    <ThumbsDown className="h-5 w-5 mr-2" />
                    반대
                  </Button>
                </div>
              )}

              {/* 댓글 섹션 */}
              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-medium text-slate-800 mb-4 text-lg">토론</h4>
                
                <div className="space-y-4 mb-6">
                  {proposalToShow.comments.map((comment) => (
                    <div key={comment.id} className="bg-slate-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          {comment.userId}
                        </span>
                        <span className="text-xs text-slate-500">
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed">{comment.content}</p>
                    </div>
                  ))}
                  
                  {proposalToShow.comments.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">아직 댓글이 없습니다</p>
                      <p className="text-sm text-slate-400">첫 번째 의견을 남겨보세요!</p>
                    </div>
                  )}
                </div>

                {user && (
                  <div className="flex space-x-3">
                    <Textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="이 제안에 대한 의견을 남겨주세요..."
                      className="min-h-[100px] resize-none"
                      data-testid={`textarea-comment-${proposalToShow.id}`}
                    />
                    <Button
                      onClick={() => handleComment(proposalToShow.id)}
                      disabled={commentMutation.isPending || !commentContent.trim()}
                      data-testid={`button-submit-comment-${proposalToShow.id}`}
                      className="px-6"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      작성
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 제안 목록 페이지 */
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-800 mb-2" data-testid="text-page-title">
                  {novel.title} - 수정 제안 목록
                </h1>
                <p className="text-slate-600">
                  진행 중인 제안: {proposals.filter(p => new Date(p.expiresAt) > new Date()).length}개 | 
                  총 제안: {proposals.length}개
                </p>
              </div>
            </div>

            {/* Proposals List */}
            <div className="space-y-4">
              {proposals.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="text-slate-400">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">아직 제안이 없습니다</p>
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
                  >
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-800 line-clamp-2 leading-tight mb-2">
                            {proposal.title || "제안 내용"}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <span className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>{proposal.proposer.firstName || proposal.proposer.email}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{proposal.expiresAt ? getTimeLeft(proposal.expiresAt) : '시간 정보 없음'}</span>
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(proposal)}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1 text-green-600">
                            <ThumbsUp className="h-4 w-4" />
                            <span className="font-medium">
                              {Math.round((proposal.voteCount.approve / (proposal.voteCount.approve + proposal.voteCount.reject || 1)) * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-blue-600">
                            <MessageSquare className="h-4 w-4" />
                            <span>{proposal.comments?.length || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-slate-600">
                            <Eye className="h-4 w-4" />
                            <span>{proposal.views || Math.floor(Math.random() * 100) + 10}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-slate-500 mb-1">
                            찬성 {proposal.voteCount.approve} / 반대 {proposal.voteCount.reject}
                          </div>
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ 
                                width: `${Math.round((proposal.voteCount.approve / (proposal.voteCount.approve + proposal.voteCount.reject || 1)) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}