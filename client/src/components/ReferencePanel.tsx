import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Edit3, Save, X, FileText, Eye } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReferencePanelProps {
  novelId: string;
  type: "worldSetting" | "rules";
  title: string;
  content?: string | null;
  placeholder: string;
}

export default function ReferencePanel({ 
  novelId, 
  type, 
  title, 
  content, 
  placeholder 
}: ReferencePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (newContent: string) => {
      const endpoint = type === "worldSetting" 
        ? `/api/novels/${novelId}/world-setting`
        : `/api/novels/${novelId}/rules`;
      
      const body = type === "worldSetting" 
        ? { worldSetting: newContent }
        : { rules: newContent };

      return await apiRequest("PUT", endpoint, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/novels", novelId] });
      setIsEditing(false);
      toast({
        title: "저장 완료",
        description: `${title}이 성공적으로 업데이트되었습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: `${title} 저장 중 오류가 발생했습니다.`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(editContent);
  };

  const handleCancel = () => {
    setEditContent(content || "");
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              data-testid={`button-edit-${type}`}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              수정하기
            </Button>
          </div>

          {content ? (
            <div className="prose prose-slate max-w-none">
              <div 
                className="text-slate-800 leading-relaxed whitespace-pre-wrap"
                data-testid={`${type}-content-display`}
              >
                {content}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-slate-400 mb-4">
                <FileText className="h-12 w-12 mx-auto mb-3" />
                <p className="text-lg font-medium">아직 작성된 {title}이 없습니다</p>
                <p className="text-sm">참여자들을 위한 가이드를 작성해보세요!</p>
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                data-testid={`button-start-${type}`}
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
                disabled={updateMutation.isPending}
                data-testid={`button-cancel-${type}`}
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid={`button-save-${type}`}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>

          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder={placeholder}
            className="min-h-[400px] text-base leading-relaxed resize-none border-slate-200 focus:border-blue-300"
            data-testid={`textarea-${type}`}
          />

          <div className="mt-4 text-sm text-slate-500">
            {type === "worldSetting" ? (
              <>
                <p>• 소설의 배경이 되는 세계에 대한 상세한 설명을 작성해주세요</p>
                <p>• 시간적 배경, 지리적 특성, 사회 구조, 특별한 법칙 등을 포함하세요</p>
                <p>• 참여자들이 일관성 있는 내용을 작성할 수 있도록 명확하게 설명해주세요</p>
              </>
            ) : (
              <>
                <p>• 이 소설에 참여할 때 지켜야 할 규칙을 명확하게 작성해주세요</p>
                <p>• 문체, 등장인물 설정, 스토리 진행 방향 등에 대한 가이드라인을 포함하세요</p>
                <p>• 금기사항이나 주의사항이 있다면 반드시 명시해주세요</p>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}