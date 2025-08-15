import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();

  const { data: userStats } = useQuery({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
  });

  return (
    <aside className="lg:w-64 flex-shrink-0">
      {/* Genre Navigation */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>장르별 소설</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <nav className="space-y-1">
            {genres.map((genre) => (
              <button
                key={genre.slug}
                onClick={() => onGenreSelect(genre.slug)}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors rounded-lg mx-3 ${
                  selectedGenre === genre.slug
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                }`}
                data-testid={`button-genre-${genre.slug}`}
              >
                <span>{genre.name}</span>
                <span className="text-xs opacity-75">{genre.count}</span>
              </button>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* User Stats */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>내 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">총 기여도</span>
                <span className="font-medium text-slate-800" data-testid="text-total-contribution">
                  {userStats?.totalContribution || 0}자
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">제안 승인률</span>
                <span className="font-medium text-success" data-testid="text-approval-rate">
                  {userStats?.approvalRate || 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">참여 작품</span>
                <span className="font-medium text-slate-800" data-testid="text-participated-novels">
                  {userStats?.participatedNovels || 0}편
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
