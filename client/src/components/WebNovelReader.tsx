import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Edit3, Plus, Save, X, Eye } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Novel } from "@shared/schema";

interface WebNovelReaderProps {
  novel: Novel;
}

export default function WebNovelReader({ novel }: WebNovelReaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(novel.content || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateContentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("PUT", `/api/novels/${novel.id}/content`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/novels", novel.id] });
      setIsEditing(false);
      toast({
        title: "저장 완료",
        description: "소설 내용이 성공적으로 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "소설 내용 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateContentMutation.mutate(editContent);
  };

  const handleCancel = () => {
    setEditContent(novel.content || "");
    setIsEditing(false);
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      {/* Reading Mode */}
      {!isEditing && (
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2 text-slate-600">
              <Eye className="h-4 w-4" />
              <span className="text-sm">읽기 모드</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-content"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                수정하기
              </Button>
            </div>
          </div>

          {novel.content ? (
            <div className="prose prose-slate max-w-none">
              <div 
                className="text-slate-800 leading-relaxed text-lg whitespace-pre-wrap"
                data-testid="novel-content-display"
              >
                {novel.content}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-slate-400 mb-4">
                <Plus className="h-12 w-12 mx-auto mb-3" />
                <p className="text-lg font-medium">아직 작성된 내용이 없습니다</p>
                <p className="text-sm">첫 번째 이야기를 시작해보세요!</p>
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                data-testid="button-start-writing"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                작성 시작하기
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Editing Mode */}
      {isEditing && (
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2 text-slate-600">
              <Edit3 className="h-4 w-4" />
              <span className="text-sm">편집 모드</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateContentMutation.isPending}
                data-testid="button-cancel-edit"
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateContentMutation.isPending}
                data-testid="button-save-content"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateContentMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>

          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="소설의 내용을 작성해주세요. 자연스러운 문체로 이야기를 이어가세요..."
            className="min-h-[500px] text-lg leading-relaxed resize-none border-slate-200 focus:border-blue-300"
            data-testid="textarea-novel-content"
          />

          <div className="mt-4 text-sm text-slate-500">
            <p>• 독자들이 쉽게 읽을 수 있도록 자연스러운 문체로 작성해주세요</p>
            <p>• 기존 내용과 어울리는 톤앤매너를 유지해주세요</p>
            <p>• 세계관과 규칙 탭에서 설정을 확인한 후 작성하시면 더 좋습니다</p>
          </div>
        </div>
      )}
    </Card>
  );
}