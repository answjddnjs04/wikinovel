import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Edit3, Plus, Send, X, Eye, MessageSquare, Vote, BookOpen, Globe } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Novel } from "@shared/schema";
import CommentTextRenderer from "./CommentTextRenderer";

interface WebNovelReaderProps {
  novel: Novel;
  selectedEpisode?: number;
}

export default function WebNovelReader({ novel, selectedEpisode }: WebNovelReaderProps) {
  const [isProposing, setIsProposing] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalContent, setProposalContent] = useState("");
  const [proposalReason, setProposalReason] = useState("");
  const [proposalType, setProposalType] = useState<"modification" | "worldSetting" | "rules" | "episodeTitle">("modification");
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track novel view on component mount
  const trackViewMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/novels/${novel.id}/view`, {});
    },
  });

  // Track episode view
  const trackEpisodeViewMutation = useMutation({
    mutationFn: async (episodeNumber: number) => {
      return await apiRequest("POST", `/api/novels/${novel.id}/episodes/${episodeNumber}/view`, {});
    },
  });

  // Track view when component mounts or episode changes
  useEffect(() => {
    trackViewMutation.mutate();
    if (selectedEpisode) {
      trackEpisodeViewMutation.mutate(selectedEpisode);
    }
  }, [novel.id, selectedEpisode]);

  const createProposalMutation = useMutation({
    mutationFn: async () => {
      // 첫 내용 작성인 경우 바로 반영
      if (!novel.content && proposalReason === "첫 내용 작성") {
        return await apiRequest("PATCH", `/api/novels/${novel.id}`, {
          content: proposalContent,
        });
      }
      
      return await apiRequest("POST", `/api/proposals`, {
        novelId: novel.id,
        title: proposalTitle,
        proposalType: proposalType,
        originalText: proposalType === "modification" ? novel.content || "" : 
                     proposalType === "worldSetting" ? novel.worldSetting || "" :
                     novel.rules || "",
        proposedText: proposalContent,
        reason: proposalReason,
      });
    },
    onSuccess: () => {
      if (!novel.content && proposalReason === "첫 내용 작성") {
        queryClient.invalidateQueries({ queryKey: ["/api/novels", novel.id] });
        toast({
          title: "첫 내용 작성 완료",
          description: "소설의 첫 내용이 성공적으로 작성되었습니다.",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/novels", novel.id, "proposals"] });
        toast({
          title: "제안 완료",
          description: "수정 제안이 성공적으로 등록되었습니다.",
        });
      }
      setIsProposing(false);
      setProposalTitle("");
      setProposalContent("");
      setProposalReason("");
    },
    onError: () => {
      toast({
        title: "작성 실패",
        description: "작성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitProposal = () => {
    if (!proposalTitle.trim()) {
      toast({
        title: "제목을 입력해주세요",
        description: "제안 제목을 작성해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!proposalContent.trim()) {
      toast({
        title: "내용을 입력해주세요",
        description: "제안할 내용을 작성해주세요.",
        variant: "destructive",
      });
      return;
    }
    createProposalMutation.mutate();
  };

  const handleStartProposal = () => {
    setProposalContent(novel.content || "");
    setProposalTitle("");
    setIsProposing(true);
  };

  const handleCancel = () => {
    setProposalTitle("");
    setProposalContent("");
    setProposalReason("");
    setIsProposing(false);
  };

  // 현재 내용을 화 단위로 나누는 함수
  const getEpisodes = () => {
    if (!novel.content) return [];
    
    const threshold = novel.episodeThreshold || 3000;
    const content = novel.content;
    const episodes = [];
    let currentEpisode = 1;
    let start = 0;
    
    while (start < content.length) {
      const end = Math.min(start + threshold, content.length);
      let episodeEnd = end;
      
      // 문장 끝에서 자르기 (마지막 마침표, 느낌표, 물음표 찾기)
      if (end < content.length) {
        const lastSentenceEnd = content.lastIndexOf('.', end);
        const lastExclamation = content.lastIndexOf('!', end);
        const lastQuestion = content.lastIndexOf('?', end);
        const lastKoreanEnd = content.lastIndexOf('다', end);
        
        const candidates = [lastSentenceEnd, lastExclamation, lastQuestion, lastKoreanEnd]
          .filter(pos => pos > start)
          .sort((a, b) => b - a);
        
        if (candidates.length > 0) {
          episodeEnd = candidates[0] + 1;
        }
      }
      
      episodes.push({
        number: currentEpisode,
        content: content.slice(start, episodeEnd),
        charCount: episodeEnd - start
      });
      
      start = episodeEnd;
      currentEpisode++;
    }
    
    return episodes;
  };

  const episodes = getEpisodes();

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      {/* Reading Mode */}
      {!isProposing && (
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2 text-slate-600">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">
                {selectedEpisode ? `${selectedEpisode}화 읽기` : "전체 읽기"}
              </span>
            </div>
            <div className="flex space-x-2">
              {!novel.content ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setIsProposing(true);
                    setProposalContent("");
                    setProposalReason("첫 내용 작성");
                    setProposalTitle("첫 내용 작성");
                  }}
                  data-testid="button-write-first"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  첫 내용 작성
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEpisodeList(!showEpisodeList)}
                    data-testid="button-episode-list"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    회차 목록
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartProposal}
                    data-testid="button-propose-edit"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    수정 제안
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Episode List Modal */}
          {showEpisodeList && novel.content && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
              <h4 className="font-semibold mb-3">회차 목록</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {episodes.map((episode) => (
                  <Button
                    key={episode.number}
                    variant={selectedEpisode === episode.number ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (selectedEpisode === episode.number) {
                        // 현재 선택된 화를 다시 클릭하면 전체 보기
                        window.location.href = `/novels/${novel.id}`;
                      } else {
                        window.location.href = `/novels/${novel.id}?episode=${episode.number}`;
                      }
                    }}
                    className="justify-center"
                    data-testid={`button-episode-${episode.number}`}
                  >
                    {episode.number}화
                  </Button>
                ))}
              </div>
            </div>
          )}

          {novel.content ? (
            <div className="space-y-8">
              {selectedEpisode ? (
                // 선택된 화만 표시
                <div className="pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-700" data-testid={`episode-title-${selectedEpisode}`}>
                      {selectedEpisode}화
                    </h3>
                    <span className="text-sm text-slate-500">
                      {episodes.find(ep => ep.number === selectedEpisode)?.charCount || 0}자
                    </span>
                  </div>
                  <div 
                    className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-lg whitespace-pre-wrap"
                    data-testid={`episode-content-${selectedEpisode}`}
                  >
                    <CommentTextRenderer 
                      text={episodes.find(ep => ep.number === selectedEpisode)?.content || ""}
                      className=""
                    />
                  </div>
                </div>
              ) : (
                // 전체 화 표시
                episodes.map((episode, index) => (
                  <div key={index} className="border-b border-slate-100 pb-8 last:border-b-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-700" data-testid={`episode-title-${episode.number}`}>
                        {episode.number}화
                      </h3>
                      <span className="text-sm text-slate-500">
                        {episode.charCount}자
                      </span>
                    </div>
                    <div 
                      className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-lg whitespace-pre-wrap"
                      data-testid={`episode-content-${episode.number}`}
                    >
                      <CommentTextRenderer 
                        text={episode.content}
                        className=""
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-slate-400 mb-4">
                <Plus className="h-12 w-12 mx-auto mb-3" />
                <p className="text-lg font-medium">아직 작성된 내용이 없습니다</p>
                <p className="text-sm">첫 번째 이야기를 제안해보세요!</p>
              </div>
              <Button
                onClick={() => setIsProposing(true)}
                data-testid="button-start-writing"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                첫 글 제안하기
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Proposal Mode - Split View */}
      {isProposing && (
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2 text-slate-600">
              <Edit3 className="h-4 w-4" />
              <div>
                <span className="text-sm font-medium">수정 제안 모드 - 좌측: 기존 내용, 우측: 제안 내용</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={createProposalMutation.isPending}
                data-testid="button-cancel-proposal"
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitProposal}
                disabled={createProposalMutation.isPending}
                data-testid="button-submit-proposal"
              >
                <Send className="h-4 w-4 mr-2" />
                {createProposalMutation.isPending ? "제안 중..." : "제안하기"}
              </Button>
            </div>
          </div>

          {/* 제안 제목 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              제안 제목
            </label>
            <input
              type="text"
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              placeholder="제안 제목을 입력해주세요 (예: 캐릭터 대화 개선, 스토리 전개 수정)"
              className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="input-proposal-title"
            />
          </div>

          {/* Split View Container */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Left: Original Content */}
            <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
              <h4 className="font-semibold text-slate-700 mb-3">기존 내용</h4>
              <div className="prose prose-slate max-w-none">
                <CommentTextRenderer 
                  text={novel.content || "아직 작성된 내용이 없습니다."}
                  className="text-slate-700 leading-relaxed text-base whitespace-pre-wrap max-h-[400px] overflow-y-auto"
                />
              </div>
            </div>

            {/* Right: Proposed Content */}
            <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold text-blue-700 mb-3">제안 내용</h4>
              <Textarea
                value={proposalContent}
                onChange={(e) => setProposalContent(e.target.value)}
                placeholder="수정할 내용을 작성해주세요..."
                className="min-h-[350px] text-base leading-relaxed resize-none border-blue-200 focus:border-blue-400 bg-white"
                data-testid="textarea-proposal-content"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              제안 이유 (선택사항)
            </label>
            <Textarea
              value={proposalReason}
              onChange={(e) => setProposalReason(e.target.value)}
              placeholder="왜 이런 수정이 필요한지 설명해주세요..."
              className="min-h-[100px] resize-none border-slate-200 focus:border-blue-300"
              data-testid="textarea-proposal-reason"
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <h4 className="font-medium mb-2">제안-투표 시스템 안내</h4>
            <ul className="space-y-1">
              <li>• 제안된 내용은 24시간 동안 투표를 받습니다</li>
              <li>• 다른 참여자들의 기여도에 따라 투표 가중치가 결정됩니다</li>
              <li>• 50% 이상 찬성 시 자동으로 적용됩니다</li>
              <li>• 세계관과 규칙을 확인한 후 제안해주세요</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}