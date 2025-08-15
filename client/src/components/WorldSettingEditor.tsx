import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Edit3, Plus, Send, X, Globe } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Novel } from "@shared/schema";

interface WorldSettingEditorProps {
  novel: Novel;
}

export default function WorldSettingEditor({ novel }: WorldSettingEditorProps) {
  const [isProposing, setIsProposing] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalContent, setProposalContent] = useState("");
  const [proposalReason, setProposalReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProposalMutation = useMutation({
    mutationFn: async () => {
      // 첫 세계관 작성인 경우 바로 반영
      if (!novel.worldSetting && proposalReason === "첫 세계관 작성") {
        return await apiRequest("PATCH", `/api/novels/${novel.id}`, {
          worldSetting: proposalContent,
        });
      }
      
      return await apiRequest("POST", `/api/proposals`, {
        novelId: novel.id,
        title: proposalTitle,
        proposalType: "worldSetting",
        originalText: novel.worldSetting || "",
        proposedText: proposalContent,
        reason: proposalReason,
      });
    },
    onSuccess: () => {
      if (!novel.worldSetting && proposalReason === "첫 세계관 작성") {
        queryClient.invalidateQueries({ queryKey: ["/api/novels", novel.id] });
        toast({
          title: "첫 세계관 작성 완료",
          description: "소설의 첫 세계관이 성공적으로 작성되었습니다.",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/novels", novel.id, "proposals"] });
        toast({
          title: "세계관 제안 완료",
          description: "세계관 제안이 성공적으로 등록되었습니다.",
        });
      }
      setIsProposing(false);
      setProposalTitle("");
      setProposalContent("");
      setProposalReason("");
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "제안을 등록하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleStartProposal = () => {
    setIsProposing(true);
    setProposalContent(novel.worldSetting || "");
    setProposalTitle("");
    setProposalReason("");
  };

  const handleSubmit = () => {
    if (!proposalTitle.trim()) {
      toast({
        title: "제목 필수",
        description: "제안 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (!proposalContent.trim()) {
      toast({
        title: "내용 필수",
        description: "세계관 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    createProposalMutation.mutate();
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      {/* Reading Mode */}
      {!isProposing && (
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2 text-slate-600">
              <Globe className="h-5 w-5" />
              <span className="text-lg font-semibold">세계관</span>
            </div>
            <div className="flex space-x-2">
              {!novel.worldSetting ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setIsProposing(true);
                    setProposalContent("");
                    setProposalReason("첫 세계관 작성");
                    setProposalTitle("첫 세계관 작성");
                  }}
                  data-testid="button-write-first-world"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  첫 세계관 작성
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartProposal}
                  data-testid="button-propose-world-edit"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  세계관 수정 제안
                </Button>
              )}
            </div>
          </div>

          {novel.worldSetting ? (
            <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
              {novel.worldSetting}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">아직 세계관이 설정되지 않았습니다</p>
              <p className="text-sm">첫 번째 세계관을 작성해보세요!</p>
            </div>
          )}
        </div>
      )}

      {/* Proposal Mode */}
      {isProposing && (
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800">
              {!novel.worldSetting ? "첫 세계관 작성" : "세계관 수정 제안"}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProposing(false)}
              data-testid="button-cancel-proposal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original Content */}
            {novel.worldSetting && (
              <Card className="p-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  기존 세계관
                </h4>
                <div className="prose prose-slate max-w-none">
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <p className="whitespace-pre-wrap text-slate-700">
                      {novel.worldSetting}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Proposal Content */}
            <Card className="p-6">
              <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                {!novel.worldSetting ? "새 세계관" : "제안 세계관"}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    제안 제목
                  </label>
                  <Input
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    placeholder="제안 제목을 입력하세요"
                    data-testid="input-proposal-title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    세계관 내용
                  </label>
                  <Textarea
                    value={proposalContent}
                    onChange={(e) => setProposalContent(e.target.value)}
                    placeholder="세계관 내용을 작성하세요..."
                    className="min-h-[300px] resize-none"
                    data-testid="textarea-proposal-content"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    제안 이유
                  </label>
                  <Textarea
                    value={proposalReason}
                    onChange={(e) => setProposalReason(e.target.value)}
                    placeholder="왜 이런 수정을 제안하시나요?"
                    className="min-h-[100px] resize-none"
                    data-testid="textarea-proposal-reason"
                  />
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsProposing(false)}
              data-testid="button-cancel"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createProposalMutation.isPending}
              data-testid="button-submit-proposal"
            >
              <Send className="h-4 w-4 mr-2" />
              {createProposalMutation.isPending ? "제출 중..." : 
               (!novel.worldSetting ? "작성하기" : "제안하기")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}