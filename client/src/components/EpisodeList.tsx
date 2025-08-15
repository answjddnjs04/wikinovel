import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Eye } from "lucide-react";
import type { Novel } from "@shared/schema";

interface Episode {
  number: number;
  title: string;
  content: string;
  charCount: number;
  readTime: number;
  views?: number;
}

interface EpisodeListProps {
  novel: Novel;
  onEpisodeSelect: (episode: number) => void;
  selectedEpisode: number | null;
}

export default function EpisodeList({ novel, onEpisodeSelect, selectedEpisode }: EpisodeListProps) {
  // 소설 내용을 화별로 나누는 함수
  const getEpisodes = (): Episode[] => {
    if (!novel.content) return [];
    
    const threshold = novel.episodeThreshold || 3000;
    const content = novel.content;
    const episodes: Episode[] = [];
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
      
      const episodeContent = content.slice(start, episodeEnd);
      const charCount = episodeContent.length;
      const readTime = Math.ceil(charCount / 300); // 평균 독서속도: 분당 300자
      
      episodes.push({
        number: currentEpisode,
        title: `${currentEpisode}화`,
        content: episodeContent,
        charCount,
        readTime,
        views: Math.floor(Math.random() * 500) + 50 // 임시 조회수
      });
      
      start = episodeEnd;
      currentEpisode++;
    }
    
    return episodes;
  };

  const episodes = getEpisodes();

  if (episodes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-4">
          <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">아직 작성된 내용이 없습니다</p>
          <p className="text-sm">첫 번째 이야기를 제안해보세요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          전체 {episodes.length}화
        </h2>
        <div className="text-sm text-slate-600">
          총 {novel.content?.length || 0}자 • 예상 독서시간 {Math.ceil((novel.content?.length || 0) / 300)}분
        </div>
      </div>

      <div className="grid gap-4">
        {episodes.map((episode) => (
          <Card 
            key={episode.number}
            className={`p-4 hover:shadow-md transition-all cursor-pointer border-2 ${
              selectedEpisode === episode.number 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => onEpisodeSelect(episode.number)}
            data-testid={`episode-card-${episode.number}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                  selectedEpisode === episode.number 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {episode.number}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 mb-1">
                    {episode.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{episode.readTime}분</span>
                    </span>
                    <span>{episode.charCount}자</span>
                    <span className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{episode.views}회</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {episode.number === 1 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    첫화
                  </Badge>
                )}
                {episode.number === episodes.length && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    최신화
                  </Badge>
                )}
                <Button
                  size="sm"
                  className={selectedEpisode === episode.number ? "bg-blue-500" : ""}
                  data-testid={`button-read-${episode.number}`}
                >
                  <Play className="h-4 w-4 mr-1" />
                  읽기
                </Button>
              </div>
            </div>
            
            {/* 에피소드 미리보기 */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-sm text-slate-600 line-clamp-2">
                {episode.content.slice(0, 100)}...
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}