import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import WebNovelReader from "@/components/WebNovelReader";
import ReferencePanel from "@/components/ReferencePanel";
import { useState } from "react";
import { BookOpen, FileText, Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import type { Novel } from "@shared/schema";

export default function NovelDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("story");

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
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-slate-600 hover:text-slate-800" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              소설 목록으로
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

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white rounded-lg shadow-sm border border-slate-200">
            <TabsTrigger value="story" className="flex items-center space-x-2" data-testid="tab-story">
              <BookOpen className="h-4 w-4" />
              <span>소설</span>
            </TabsTrigger>
            <TabsTrigger value="worldSetting" className="flex items-center space-x-2" data-testid="tab-world">
              <FileText className="h-4 w-4" />
              <span>세계관</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center space-x-2" data-testid="tab-rules">
              <Settings className="h-4 w-4" />
              <span>규칙</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="story" className="space-y-0">
            <WebNovelReader novel={novel} />
          </TabsContent>

          <TabsContent value="worldSetting" className="space-y-0">
            <ReferencePanel 
              novelId={novel.id} 
              type="worldSetting"
              title="세계관 설정"
              content={novel.worldSetting}
              placeholder="이 소설의 세계관을 설명해주세요. 예: 배경 시대, 지역, 마법 체계, 사회 구조 등"
            />
          </TabsContent>

          <TabsContent value="rules" className="space-y-0">
            <ReferencePanel 
              novelId={novel.id}
              type="rules"
              title="작성 규칙" 
              content={novel.rules}
              placeholder="이 소설에 참여할 때 지켜야 할 규칙을 작성해주세요. 예: 문체, 캐릭터 설정, 금기사항 등"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
