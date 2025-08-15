import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Proposal, Vote } from "@shared/schema";

interface VotingInterfaceProps {
  blockId: string;
}

export default function VotingInterface({ blockId }: VotingInterfaceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock proposal data - in real app, this would come from API
  const mockProposal: Proposal = {
    id: "mock-proposal-id",
    blockId,
    proposerId: "user-1",
    originalContent: "사람들은 공포에 질려 도망치기 시작했다.",
    proposedContent: "사람들은 처음엔 놀랐지만, 곧 호기심으로 가득한 눈으로 마법사를 바라보기 시작했다.",
    reason: "더 긍정적이고 흥미로운 방향으로 이야기를 전개하고 싶습니다.",
    status: "pending",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000), // 23 hours from now
  };

  // Mock votes data
  const mockVotes: Vote[] = [
    { id: "vote-1", proposalId: mockProposal.id, userId: "user-1", voteType: "approve", weight: 150, createdAt: new Date() },
    { id: "vote-2", proposalId: mockProposal.id, userId: "user-2", voteType: "approve", weight: 120, createdAt: new Date() },
    { id: "vote-3", proposalId: mockProposal.id, userId: "user-3", voteType: "reject", weight: 80, createdAt: new Date() },
  ];

  const voteMutation = useMutation({
    mutationFn: async (voteType: "approve" | "reject") => {
      return apiRequest("POST", "/api/votes", {
        proposalId: mockProposal.id,
        voteType,
      });
    },
    onSuccess: () => {
      toast({
        title: "투표 완료",
        description: "투표가 성공적으로 제출되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", mockProposal.id, "votes"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "투표 실패",
        description: "투표 제출에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // Calculate vote percentages
  const totalWeight = mockVotes.reduce((sum, vote) => sum + vote.weight, 0);
  const approveWeight = mockVotes
    .filter(vote => vote.voteType === "approve")
    .reduce((sum, vote) => sum + vote.weight, 0);
  const approvePercentage = totalWeight > 0 ? Math.round((approveWeight / totalWeight) * 100) : 0;
  const rejectPercentage = 100 - approvePercentage;

  // Calculate time remaining
  const timeRemaining = mockProposal.expiresAt.getTime() - Date.now();
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));

  const handleVote = (voteType: "approve" | "reject") => {
    voteMutation.mutate(voteType);
  };

  return (
    <Card className="border-2 border-warning border-opacity-30 bg-warning bg-opacity-5 mt-4" data-testid="voting-interface">
      <CardContent className="p-4">
        <div className="flex items-center mb-3">
          <Clock className="text-warning mr-2 h-4 w-4" />
          <span className="text-sm font-medium text-slate-800">투표 진행중인 수정 제안</span>
          <span className="ml-auto text-xs text-slate-600" data-testid="text-time-remaining">
            투표 마감: {hoursRemaining}시간 후
          </span>
        </div>

        <div className="mb-4">
          <p className="text-slate-800 leading-relaxed mb-2">
            <span className="line-through text-slate-500" data-testid="text-original-content">
              {mockProposal.originalContent}
            </span>
          </p>
          <p className="text-success font-medium" data-testid="text-proposed-content">
            → {mockProposal.proposedContent}
          </p>
        </div>

        {mockProposal.reason && (
          <div className="bg-slate-50 rounded p-3 mb-3">
            <p className="text-sm text-slate-700" data-testid="text-proposal-reason">
              <strong>수정 이유:</strong> {mockProposal.reason}
            </p>
          </div>
        )}

        <div className="bg-white rounded p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">투표 현황</span>
            <span className="text-xs text-slate-600">가중치 적용</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-success" data-testid="text-approve-percentage">
                  찬성 {approvePercentage}%
                </span>
                <span className="text-error" data-testid="text-reject-percentage">
                  반대 {rejectPercentage}%
                </span>
              </div>
              <Progress value={approvePercentage} className="h-2" />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => handleVote("approve")}
            disabled={voteMutation.isPending}
            className="bg-success hover:bg-emerald-700"
            data-testid="button-vote-approve"
          >
            <ThumbsUp className="mr-1 h-4 w-4" />
            찬성 투표
          </Button>
          <Button
            onClick={() => handleVote("reject")}
            disabled={voteMutation.isPending}
            variant="destructive"
            data-testid="button-vote-reject"
          >
            <ThumbsDown className="mr-1 h-4 w-4" />
            반대 투표
          </Button>
          <span className="text-xs text-slate-600" data-testid="text-vote-weight">
            내 투표 권한: 143자 (8.2%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}