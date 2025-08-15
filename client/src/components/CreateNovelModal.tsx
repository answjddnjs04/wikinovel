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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CreateNovelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateNovelModal({ isOpen, onClose }: CreateNovelModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createNovelMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/novels", data);
    },
    onSuccess: () => {
      toast({
        title: "소설 생성 완료",
        description: "새로운 소설이 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/novels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/novels/genre-counts"] });
      onClose();
      setTitle("");
      setDescription("");
      setGenre("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "로그인 필요",
          description: "소설을 생성하려면 로그인해야 합니다.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "생성 실패",
        description: "소설 생성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !genre) {
      toast({
        title: "입력 오류",
        description: "제목과 장르를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    createNovelMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      genre,
    });
  };

  const handleClose = () => {
    onClose();
    setTitle("");
    setDescription("");
    setGenre("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="modal-create-novel">
        <DialogHeader>
          <DialogTitle>새 소설 시작하기</DialogTitle>
          <DialogDescription>
            여러 사람이 함께 만들어갈 새로운 이야기를 시작해보세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-slate-700 mb-2 block">
              소설 제목 *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="소설 제목을 입력하세요..."
              data-testid="input-novel-title"
            />
          </div>

          <div>
            <Label htmlFor="genre" className="text-sm font-medium text-slate-700 mb-2 block">
              장르 *
            </Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger data-testid="select-genre">
                <SelectValue placeholder="장르를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="판타지">판타지</SelectItem>
                <SelectItem value="로맨스">로맨스</SelectItem>
                <SelectItem value="미스터리">미스터리</SelectItem>
                <SelectItem value="SF">SF</SelectItem>
                <SelectItem value="스릴러">스릴러</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-slate-700 mb-2 block">
              소설 소개 (선택사항)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="소설에 대한 간단한 소개를 작성해주세요..."
              rows={3}
              className="resize-none"
              data-testid="textarea-description"
            />
          </div>

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
              disabled={createNovelMutation.isPending || !title.trim() || !genre}
              data-testid="button-create-novel"
            >
              {createNovelMutation.isPending ? "생성 중..." : "소설 시작"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}