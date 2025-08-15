import React from 'react';

interface CommentTextRendererProps {
  text: string;
  className?: string;
}

export default function CommentTextRenderer({ text, className = "" }: CommentTextRendererProps) {
  // %% 주석 문법을 처리하는 함수
  const renderTextWithComments = (content: string) => {
    const parts = content.split(/(%%.+?%%)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('%%') && part.endsWith('%%')) {
        // 주석 부분 - 투명도 적용
        const commentText = part.slice(2, -2); // %% 제거
        return (
          <span key={index} className="text-slate-400 opacity-50 italic">
            {commentText}
          </span>
        );
      } else {
        // 일반 텍스트
        return <span key={index}>{part}</span>;
      }
    });
  };

  return (
    <div className={className}>
      {renderTextWithComments(text)}
    </div>
  );
}