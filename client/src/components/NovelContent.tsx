import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import VotingInterface from "./VotingInterface";
import type { Block } from "@shared/schema";

interface NovelContentProps {
  blocks: Block[];
  onProposeEdit: (block: Block) => void;
}

export default function NovelContent({ blocks, onProposeEdit }: NovelContentProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const handleBlockClick = (blockId: string) => {
    setSelectedBlockId(selectedBlockId === blockId ? null : blockId);
  };

  return (
    <div className="p-6">
      {blocks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-600 mb-4" data-testid="text-no-blocks">
            이 소설에는 아직 내용이 없습니다.
          </p>
          <Button data-testid="button-add-first-block">
            <Plus className="mr-2 h-4 w-4" />
            첫 번째 블록 추가
          </Button>
        </div>
      ) : (
        <>
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className="prose max-w-none mb-8 block-container"
              data-testid={`block-${block.id}`}
            >
              <div className="relative group">
                <p
                  className={`text-slate-800 leading-relaxed mb-4 cursor-pointer p-2 rounded transition-colors ${
                    selectedBlockId === block.id ? "bg-blue-50 border-l-4 border-primary" : "hover:bg-slate-50"
                  }`}
                  onClick={() => handleBlockClick(block.id)}
                  data-testid="text-block-content"
                >
                  {block.content}
                </p>
                
                <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    onClick={() => onProposeEdit(block)}
                    data-testid="button-propose-edit"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    수정 제안
                  </Button>
                </div>
                
                <div className="text-xs text-slate-500 mt-2" data-testid="text-block-info">
                  <span>Block #{index + 1}</span> • 
                  <span> {block.content.length}자</span> • 
                  <span> 버전 {block.version}</span>
                </div>
              </div>

              {/* Show voting interface for blocks with active proposals */}
              {Math.random() > 0.7 && ( // Simulate some blocks having active proposals
                <VotingInterface blockId={block.id} />
              )}
            </div>
          ))}

          {/* Add New Block */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
            <Button 
              variant="ghost" 
              className="text-slate-600 hover:text-primary"
              data-testid="button-add-block"
            >
              <Plus className="mr-2 h-6 w-6" />
              <div>
                <p className="font-medium">새로운 블록 추가</p>
                <p className="text-sm text-slate-500">이야기를 계속 이어가세요</p>
              </div>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}