import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Genre {
  name: string;
  slug: string;
  count: number;
}

interface SidebarProps {
  genres: Genre[];
  selectedGenre: string;
  onGenreSelect: (genre: string) => void;
}

export default function Sidebar({ genres, selectedGenre, onGenreSelect }: SidebarProps) {
  return (
    <aside className="w-full lg:w-64 bg-white rounded-lg shadow-sm border border-slate-200 p-6 h-fit">
      <h3 className="text-lg font-semibold text-slate-800 mb-4" data-testid="text-genres-title">
        장르별 소설
      </h3>
      
      <div className="space-y-2">
        {genres.map((genre) => (
          <Button
            key={genre.slug}
            variant={selectedGenre === genre.slug ? "default" : "ghost"}
            className={`w-full justify-between ${
              selectedGenre === genre.slug 
                ? "bg-primary text-white" 
                : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => onGenreSelect(genre.slug)}
            data-testid={`button-genre-${genre.slug}`}
          >
            <span>{genre.name}</span>
            <Badge variant="secondary" className="ml-2" data-testid={`badge-count-${genre.slug}`}>
              {genre.count}
            </Badge>
          </Button>
        ))}
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h4 className="text-sm font-medium text-slate-700 mb-3">플랫폼 통계</h4>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>총 소설</span>
            <span data-testid="text-total-novels">
              {genres.reduce((sum, genre) => sum + genre.count, 0)}편
            </span>
          </div>
          <div className="flex justify-between">
            <span>활성 기여자</span>
            <span data-testid="text-active-contributors">247명</span>
          </div>
          <div className="flex justify-between">
            <span>진행중인 투표</span>
            <span data-testid="text-active-votes">18건</span>
          </div>
        </div>
      </div>
    </aside>
  );
}