import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import WebNovelReader from "@/components/WebNovelReader";
import ReferencePanel from "@/components/ReferencePanel";

import ContributorRanking from "@/components/ContributorRanking";
import EpisodeList from "@/components/EpisodeList";
import { useState } from "react";
import { BookOpen, FileText, Settings, ArrowLeft, List, Crown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import WorldSettingEditor from "@/components/WorldSettingEditor";
import RulesEditor from "@/components/RulesEditor";
import type { Novel } from "@shared/schema";

export default function NovelDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("episodes");
  
  // URL에서 episode 파라미터 읽기
  const urlParams = new URLSearchParams(window.location.search);
  const episodeParam = urlParams.get('episode');
  const selectedEpisode = episodeParam ? parseInt(episodeParam) : null;

  const { data: novel } = useQuery<Novel>({
    queryKey: ["/api/novels", id],
  });

  if (!novel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-slate-600" data-testid="text-loading">소설을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button */}
        <div className="mb-6 flex justify-between items-center">
          <Link href="/">
            <Button variant="ghost" className="text-slate-600 hover:text-slate-800" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              소설 목록으로
            </Button>
          </Link>
          
          <Link href={`/novels/${novel.id}/proposals`}>
            <Button 
              variant="outline" 
              className="text-slate-600 hover:text-slate-800" 
              data-testid="button-proposals"
            >
              <List className="h-4 w-4 mr-2" />
              제안 목록
            </Button>
          </Link>
        </div>

        {/* Novel Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-800 mb-3" data-testid="text-novel-title">
              {novel.title}
            </h1>
            <div className="flex items-center justify-center space-x-6 text-sm text-slate-600 mb-4">
              <span className="px-3 py-1 bg-slate-100 rounded-full" data-testid="text-novel-genre">
                {novel.genre}
              </span>
              <span data-testid="text-total-chars">
                {novel.content?.length || 0}자
              </span>
            </div>
            {novel.description && (
              <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed" data-testid="text-novel-description">
                {novel.description}
              </p>
            )}
          </div>
        </div>

        {/* Main Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white rounded-lg shadow-sm border border-slate-200">
            <TabsTrigger value="episodes" className="flex items-center space-x-2" data-testid="tab-episodes">
              <BookOpen className="h-4 w-4" />
              <span>읽기</span>
            </TabsTrigger>
            <TabsTrigger value="episodes-list" className="flex items-center space-x-2" data-testid="tab-episodes-list">
              <List className="h-4 w-4" />
              <span>회차</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center space-x-2" data-testid="tab-ranking">
              <Crown className="h-4 w-4" />
              <span>순위</span>
            </TabsTrigger>
            <TabsTrigger value="worldSetting" className="flex items-center space-x-2" data-testid="tab-world">
              <Globe className="h-4 w-4" />
              <span>세계관</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center space-x-2" data-testid="tab-rules">
              <BookOpen className="h-4 w-4" />
              <span>규칙</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="episodes" className="space-y-0">
            {selectedEpisode ? (
              <WebNovelReader novel={novel} selectedEpisode={selectedEpisode} />
            ) : (
              <EpisodeList 
                novel={novel} 
                onEpisodeSelect={(ep) => {
                  window.location.href = `/novels/${novel.id}?episode=${ep}`;
                }}
                selectedEpisode={selectedEpisode}
              />
            )}
          </TabsContent>

          <TabsContent value="episodes-list" className="space-y-0">
            <EpisodeList 
              novel={novel} 
              onEpisodeSelect={(ep) => {
                window.location.href = `/novels/${novel.id}?episode=${ep}`;
              }}
              selectedEpisode={selectedEpisode}
            />
          </TabsContent>

          <TabsContent value="ranking" className="space-y-0">
            <ContributorRanking novelId={novel.id} />
          </TabsContent>

          <TabsContent value="worldSetting" className="space-y-0">
            <WorldSettingEditor novel={novel} />
          </TabsContent>

          <TabsContent value="rules" className="space-y-0">
            <RulesEditor novel={novel} />
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
}
