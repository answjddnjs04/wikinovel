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
  const { id } = useParams();
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
          <Link href={`/novels/${novel.id}`}>
            <Button variant="ghost" className="text-slate-600 hover:text-slate-800" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              소설로 돌아가기
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
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
              <Card key={proposal.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <User className="h-4 w-4" />
                      <span>{proposal.proposer.firstName || proposal.proposer.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-500">
                      <Clock className="h-4 w-4" />
                      <span>{getTimeLeft(proposal.expiresAt)}</span>
                    </div>
                  </div>
                  {getStatusBadge(proposal)}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">제안 내용</h4>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                        {proposal.proposedText}
                      </p>
                    </div>
                  </div>

                  {proposal.reason && (
                    <div>
                      <h4 className="font-medium text-slate-800 mb-2">제안 이유</h4>
                      <p className="text-slate-600 text-sm">{proposal.reason}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-sm">
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                        <span className="text-slate-600">{proposal.voteCount.approve}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        <ThumbsDown className="h-4 w-4 text-red-500" />
                        <span className="text-slate-600">{proposal.voteCount.reject}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-600">{proposal.comments.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {new Date(proposal.expiresAt) > new Date() && user && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(proposal.id, "approve")}
                            disabled={voteMutation.isPending}
                            data-testid={`button-approve-${proposal.id}`}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            찬성
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(proposal.id, "reject")}
                            disabled={voteMutation.isPending}
                            data-testid={`button-reject-${proposal.id}`}
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            반대
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedProposal(
                          expandedProposal === proposal.id ? null : proposal.id
                        )}
                        data-testid={`button-toggle-comments-${proposal.id}`}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        토론
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                {expandedProposal === proposal.id && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="font-medium text-slate-800 mb-4">토론</h4>
                    
                    <div className="space-y-4 mb-6">
                      {proposal.comments.map((comment) => (
                        <div key={comment.id} className="bg-slate-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">
                              {comment.userId}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-700 text-sm">{comment.content}</p>
                        </div>
                      ))}
                      
                      {proposal.comments.length === 0 && (
                        <p className="text-slate-500 text-center py-4">아직 댓글이 없습니다</p>
                      )}
                    </div>

                    {user && (
                      <div className="flex space-x-3">
                        <Textarea
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          placeholder="의견을 남겨주세요..."
                          className="min-h-[80px] resize-none"
                          data-testid={`textarea-comment-${proposal.id}`}
                        />
                        <Button
                          onClick={() => handleComment(proposal.id)}
                          disabled={commentMutation.isPending || !commentContent.trim()}
                          data-testid={`button-submit-comment-${proposal.id}`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}