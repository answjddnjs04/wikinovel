import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, AlertCircle, Users, Zap, Globe, Edit, Award, BarChart } from "lucide-react";

export default function Landing() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [replitError, setReplitError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      let message = '';
      switch (error) {
        case 'kakao_oauth_error':
          const details = urlParams.get('details');
          message = `카카오 OAuth 오류: ${details || '알 수 없는 오류'}`;
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

  // Replit 로그인 처리 함수
  const handleReplitLogin = async () => {
    try {
      setReplitError(null);
      
      // 먼저 Replit 로그인이 가능한지 확인
      const response = await fetch('/api/login', { method: 'HEAD' });
      
      if (response.status === 503) {
        setReplitError('Replit 로그인은 현재 이용할 수 없습니다. 카카오 로그인을 이용해주세요.');
        return;
      }
      
      if (response.status === 404) {
        setReplitError('Replit 인증이 설정되지 않았습니다. 관리자에게 문의하세요.');
        return;
      }
      
      // 정상적이면 리다이렉트
      window.location.href = '/api/login';
    } catch (error) {
      setReplitError('로그인 서비스에 연결할 수 없습니다.');
      console.error('Replit login error:', error);
    }
  };

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
              {/* 카카오 로그인 버튼 */}
              <Button 
                onClick={() => window.location.href = '/api/auth/kakao'}
                className="bg-yellow-400 hover:bg-yellow-500 text-black"
                data-testid="button-kakao-login"
              >
                카카오 로그인
              </Button>
              
              {/* Replit 로그인 버튼 - 오류 처리 추가 */}
              <Button 
                variant="outline"
                onClick={handleReplitLogin}
                disabled={!!replitError}
                data-testid="button-replit-login"
                className={replitError ? "opacity-50 cursor-not-allowed" : ""}
              >
                Replit 로그인
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 오류 메시지들 */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 mx-4 mt-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Replit 오류 메시지 */}
      {replitError && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 mx-4 mt-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
            <p className="text-amber-700">{replitError}</p>
            <button 
              onClick={() => setReplitError(null)}
              className="ml-auto text-amber-500 hover:text-amber-700"
            >
              ×
            </button>
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
          
          {/* 로그인 버튼들 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              onClick={() => window.location.href = '/api/auth/kakao'}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-8 py-3 text-lg"
              size="lg"
            >
              카카오로 시작하기
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleReplitLogin}
              disabled={!!replitError}
              className={`px-8 py-3 text-lg ${replitError ? "opacity-50 cursor-not-allowed" : ""}`}
              size="lg"
            >
              Replit으로 시작하기
            </Button>
          </div>
          
          {/* 추가 안내 메시지 */}
          <div className="text-center text-sm text-slate-500 mb-8">
            {replitError ? (
              <p>현재는 카카오 로그인만 이용 가능합니다</p>
            ) : (
              <p>원하는 방법으로 시작하세요</p>
            )}
          </div>

          {/* 플랫폼 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">5</div>
              <div className="text-sm text-slate-600">활성 소설</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">12,847</div>
              <div className="text-sm text-slate-600">총 글자 수</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">
            위키소설만의 특별한 기능
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 집단 창작 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">집단 창작</h3>
              <p className="text-slate-600">
                여러 작가가 함께 참여하여 하나의 스토리를 만들어가는 혁신적인 창작 방식
              </p>
            </Card>

            {/* 민주적 편집 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <Edit className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">민주적 편집</h3>
              <p className="text-slate-600">
                모든 참여자가 제안하고 투표하여 스토리의 방향을 결정하는 투명한 시스템
              </p>
            </Card>

            {/* 기여도 시스템 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <Award className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">기여도 시스템</h3>
              <p className="text-slate-600">
                참여도에 따른 가중 투표로 양질의 콘텐츠를 보장하는 공정한 평가 체계
              </p>
            </Card>

            {/* 실시간 협업 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">실시간 협업</h3>
              <p className="text-slate-600">
                즉석에서 아이디어를 제안하고 피드백을 주고받는 활발한 커뮤니티 환경
              </p>
            </Card>

            {/* 투명한 히스토리 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <BarChart className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">투명한 히스토리</h3>
              <p className="text-slate-600">
                모든 편집 과정과 의사결정이 기록되어 투명하게 공개되는 신뢰할 수 있는 시스템
              </p>
            </Card>

            {/* 글로벌 접근성 */}
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">글로벌 접근성</h3>
              <p className="text-slate-600">
                언제 어디서나 접근 가능하며 다양한 언어와 문화적 배경을 가진 참여자들과 협업
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">
            어떻게 작동하나요?
          </h2>
          
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">소설 선택 또는 생성</h3>
                <p className="text-slate-600">관심 있는 장르의 소설을 선택하거나 새로운 소설을 시작하세요.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">편집 제안 작성</h3>
                <p className="text-slate-600">스토리의 특정 부분에 대한 수정이나 추가 내용을 제안하세요.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">커뮤니티 투표</h3>
                <p className="text-slate-600">다른 참여자들이 제안을 검토하고 투표하여 최종 결정을 내립니다.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">자동 적용</h3>
                <p className="text-slate-600">승인된 제안은 자동으로 소설에 반영되어 스토리가 발전합니다.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            창작의 새로운 패러다임을 경험해보세요
          </h2>
          <p className="text-xl mb-8 opacity-90">
            혼자서는 불가능했던 거대한 스토리를 함께 만들어가는 즐거움
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => window.location.href = '/api/auth/kakao'}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-8 py-3 text-lg"
              size="lg"
            >
              지금 시작하기
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleReplitLogin}
              disabled={!!replitError}
              className={`border-white text-white hover:bg-white hover:text-primary px-8 py-3 text-lg ${replitError ? "opacity-50 cursor-not-allowed" : ""}`}
              size="lg"
            >
              Replit으로 시작하기
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="h-6 w-6 text-primary mr-2" />
            <span className="text-lg font-semibold">위키소설</span>
          </div>
          <p className="text-sm">
            함께 만들어가는 창작의 미래
          </p>
        </div>
      </footer>
    </div>
  );
}
