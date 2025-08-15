import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import NovelContent from "@/components/NovelContent";
import EditProposalModal from "@/components/EditProposalModal";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Novel, Block } from "@shared/schema";

export default function NovelDetail() {
  const { id } = useParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  const { data: novel } = useQuery<Novel>({
    queryKey: ["/api/novels", id],
  });

  const { data: blocks = [] } = useQuery<Block[]>({
    queryKey: ["/api/novels", id, "blocks"],
    enabled: !!id,
  });

  const handleProposeEdit = (block: Block) => {
    setSelectedBlock(block);
    setIsEditModalOpen(true);
  };

  const handleBackToListing = () => {
    window.history.back();
  };

  if (!novel) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-slate-600" data-testid="text-loading">소설을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          {/* Novel Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2" data-testid="text-novel-title">
                  {novel.title}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-slate-600">
                  <span data-testid="text-novel-genre">{novel.genre}</span>
                  <span>•</span>
                  <span data-testid="text-block-count">{blocks.length}개 블록</span>
                  <span>•</span>
                  <span data-testid="text-total-chars">
                    {blocks.reduce((total, block) => total + block.content.length, 0)}자
                  </span>
                </div>
                {novel.description && (
                  <p className="text-slate-600 mt-2" data-testid="text-novel-description">
                    {novel.description}
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleBackToListing}
                data-testid="button-back"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Novel Content */}
          <NovelContent 
            blocks={blocks} 
            onProposeEdit={handleProposeEdit}
          />
        </div>
      </div>

      {/* Edit Proposal Modal */}
      <EditProposalModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        block={selectedBlock}
      />
    </div>
  );
}
