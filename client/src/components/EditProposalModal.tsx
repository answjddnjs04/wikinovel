import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Block } from "@shared/schema";

interface EditProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: Block | null;
}

export default function EditProposalModal({ isOpen, onClose, block }: EditProposalModalProps) {
  const [proposedContent, setProposedContent] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProposalMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/proposals", data);
    },
    onSuccess: () => {
      toast({
        title: "제안 제출 완료",
        description: "수정 제안이 성공적으로 제출되었습니다. 24시간 동안 투표가 진행됩니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      onClose();
      setProposedContent("");
      setReason("");
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
        title: "제출 실패",
        description: "수정 제안 제출에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!block || !proposedContent.trim()) {
      toast({
        title: "입력 오류",
        description: "수정 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    createProposalMutation.mutate({
      blockId: block.id,
      originalContent: block.content,
      proposedContent: proposedContent.trim(),
      reason: reason.trim() || undefined,
    });
  };

  const handleClose = () => {
    onClose();
    setProposedContent("");
    setReason("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-edit-proposal">
        <DialogHeader>
          <DialogTitle>수정 제안하기</DialogTitle>
          <DialogDescription>
            블록의 내용을 개선할 수 있는 수정안을 제안해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Content */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              원본 텍스트
            </Label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600" data-testid="text-original-content">
              {block?.content}
            </div>
          </div>

          {/* Proposed Content */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              수정 제안 *
            </Label>
            <Textarea
              value={proposedContent}
              onChange={(e) => setProposedContent(e.target.value)}
              placeholder="수정된 내용을 입력하세요..."
              rows={4}
              className="resize-none"
              data-testid="textarea-proposed-content"
            />
            <p className="text-xs text-slate-500 mt-1">
              {proposedContent.length}자
            </p>
          </div>

          {/* Reason */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              수정 이유 (선택사항)
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="수정 이유를 간단히 설명해주세요..."
              rows={2}
              className="resize-none"
              data-testid="textarea-reason"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              data-testid="button-cancel"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createProposalMutation.isPending || !proposedContent.trim()}
              data-testid="button-submit-proposal"
            >
              {createProposalMutation.isPending ? "제출 중..." : "제안 제출"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
