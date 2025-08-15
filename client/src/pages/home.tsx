import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import NovelCard from "@/components/NovelCard";
import CreateNovelModal from "@/components/CreateNovelModal";
import SimpleWeeklyLeaderboard from "@/components/SimpleWeeklyLeaderboard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import type { Novel } from "@shared/schema";

export default function Home() {
  const [selectedGenre, setSelectedGenre] = useState<string>("판타지");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: novels = [], isLoading } = useQuery<Novel[]>({
    queryKey: ["/api/novels", selectedGenre],
    queryFn: async () => {
      const response = await fetch(`/api/novels?genre=${selectedGenre}`);
      return response.json();
    },
  });

  const { data: genreCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/novels/genre-counts"],
  });

  const genres = [
    { name: "판타지", slug: "판타지", count: genreCounts["판타지"] || 0 },
    { name: "로맨스", slug: "로맨스", count: genreCounts["로맨스"] || 0 },
    { name: "미스터리", slug: "미스터리", count: genreCounts["미스터리"] || 0 },
    { name: "SF", slug: "SF", count: genreCounts["SF"] || 0 },
    { name: "스릴러", slug: "스릴러", count: genreCounts["스릴러"] || 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <Sidebar 
            genres={genres}
            selectedGenre={selectedGenre}
            onGenreSelect={setSelectedGenre}
          />
          
          <main className="flex-1 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800" data-testid="text-genre-title">
                {selectedGenre} 소설
              </h2>
              <div className="flex space-x-3">
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  data-testid="button-create-novel"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  새 소설 시작
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-pulse">
                    <div className="h-6 bg-slate-200 rounded mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-slate-200 rounded w-20"></div>
                      <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : novels.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4" data-testid="text-empty-state">
                  {selectedGenre} 장르에 아직 소설이 없습니다.
                </p>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  data-testid="button-create-first-novel"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  첫 번째 소설을 시작해보세요
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {novels.map((novel) => (
                  <NovelCard key={novel.id} novel={novel} />
                ))}
              </div>
            )}
          </main>

          {/* Right Sidebar - Weekly Leaderboard */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="sticky top-8">
              <SimpleWeeklyLeaderboard />
            </div>
          </aside>
        </div>
      </div>
      
      <CreateNovelModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
