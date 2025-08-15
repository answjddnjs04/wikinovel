import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Vote, Award, AlertCircle, FileText, Edit3, TrendingUp, PenTool } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function Landing() {
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch real stats data
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/weekly-stats'],
    queryFn: async () => {
      const response = await fetch('/api/weekly-stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  const defaultStats = {
    totalNovels: 0,
    totalCharacters: 0,
    activeWriters: 0,
    weeklyContributions: 0
  };

  const currentStats = statsData || defaultStats;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const details = urlParams.get('details');
    
    if (error) {
      let message = '';
      switch (error) {
        case 'kakao_oauth_error':
          message = `카카오 OAuth 오류: ${details || '알 수 없는 오류'}`;
          break;
        case 'kakao_auth_error':
          message = '카카오 인증 과정에서 오류가 발생했습니다.';
          break;
        case 'kakao_no_user':
          message = '카카오 로그인에서 사용자 정보를 받아올 수 없습니다.';
          break;
        case 'kakao_no_code':
          message = '카카오에서 인증 코드를 받지 못했습니다.';
          break;
        case 'kakao_auth_failed':
          message = '카카오 인증이 실패했습니다.';
          break;
        default:
          message = `로그인 오류: ${error}`;
      }
      setErrorMessage(message);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-slate-800">
                <BookOpen className="inline mr-2 text-primary" />
                위키소설
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => window.location.href = '/api/auth/kakao'}
                className="bg-yellow-400 hover:bg-yellow-500 text-black"
                data-testid="button-kakao-login"
              >
                카카오 로그인
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-replit-login"
              >
                Replit 로그인
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 mx-4 mt-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-800 mb-6">
            모든 사람이 작가가 되는<br />
            <span className="text-primary">위키형 참여소설</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            위키백과의 집단 참여 시스템을 웹소설 창작에 접목한 혁신적인 플랫폼입니다. 
            독자와 작가가 함께 스토리를 만들어가세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/auth/kakao'}
              className="text-lg px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-black"
              data-testid="button-kakao-get-started"
            >
              카카오로 시작하기
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => window.location.href = '/api/login'}
              className="text-lg px-8 py-3"
              data-testid="button-replit-get-started"
            >
              Replit으로 시작하기
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">
            위키소설의 특별한 기능들
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <BookOpen className="h-8 w-8 text-primary mb-2" />
                <CardTitle>블록 단위 편집</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  소설을 블록 단위로 나누어 특정 부분만 수정 제안할 수 있습니다.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Vote className="h-8 w-8 text-primary mb-2" />
                <CardTitle>민주적 투표</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  수정 제안에 대해 기여도 기반의 가중 투표로 반영 여부를 결정합니다.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>협업 창작</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  여러 작가가 함께 참여하여 하나의 완성된 작품을 만들어갑니다.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Award className="h-8 w-8 text-primary mb-2" />
                <CardTitle>칭호 시스템</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  기여도에 따라 다양한 칭호를 획득하고 작가로서의 성장을 확인하세요.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Platform Statistics */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">
            플랫폼 현황
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <FileText className="h-8 w-8 text-primary mx-auto mb-3" />
                <div className="text-2xl font-bold text-slate-800" data-testid="text-total-novels">
                  {statsLoading ? '...' : currentStats.totalNovels.toLocaleString()}
                </div>
                <p className="text-sm text-slate-600">총 소설 수</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <Edit3 className="h-8 w-8 text-primary mx-auto mb-3" />
                <div className="text-2xl font-bold text-slate-800" data-testid="text-total-characters">
                  {statsLoading ? '...' : currentStats.totalCharacters.toLocaleString()}
                </div>
                <p className="text-sm text-slate-600">총 작성 글자 수</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <PenTool className="h-8 w-8 text-primary mx-auto mb-3" />
                <div className="text-2xl font-bold text-slate-800" data-testid="text-active-writers">
                  {statsLoading ? '...' : currentStats.activeWriters.toLocaleString()}
                </div>
                <p className="text-sm text-slate-600">활성 작가 수</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <TrendingUp className="h-8 w-8 text-primary mx-auto mb-3" />
                <div className="text-2xl font-bold text-slate-800" data-testid="text-weekly-contributions">
                  {statsLoading ? '...' : currentStats.weeklyContributions.toLocaleString()}
                </div>
                <p className="text-sm text-slate-600">주간 기여 횟수</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">
            어떻게 작동하나요?
          </h2>
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">소설 선택 및 읽기</h3>
                <p className="text-slate-600">
                  장르별로 분류된 다양한 소설 중에서 관심 있는 작품을 선택하여 읽어보세요.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">블록 선택 및 수정 제안</h3>
                <p className="text-slate-600">
                  마음에 들지 않는 부분이나 개선할 수 있는 부분을 선택하여 수정안을 제안하세요.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">투표 참여</h3>
                <p className="text-slate-600">
                  다른 사람들의 수정 제안에 대해 투표하고, 내 제안에 대한 피드백을 받으세요.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">기여도 축적 및 성장</h3>
                <p className="text-slate-600">
                  승인된 제안을 통해 기여도를 쌓고, 더 높은 칭호와 투표 권한을 획득하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          © 2024 위키소설. 모든 기여는 Creative Commons 라이선스 하에 공유됩니다.
        </div>
      </footer>
    </div>
  );
}
