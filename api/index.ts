// api/index.ts (프로젝트 루트에 생성)
import express from "express";
import passport from "passport";
import session from "express-session";
import { Strategy as KakaoStrategy } from "passport-kakao";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 세션 설정 (간단한 메모리 저장소)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Vercel에서는 https가 자동으로 처리됨
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport 설정
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// 카카오 Strategy 설정
if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  passport.use(new KakaoStrategy({
    clientID: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
    callbackURL: process.env.KAKAO_CALLBACK_URL || "/api/auth/kakao/callback"
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const user = {
        id: String(profile.id),
        provider: 'kakao',
        username: profile.username || profile.displayName || `kakao_${profile.id}`,
        email: profile._json?.kakao_account?.email || null,
        profilePicture: profile._json?.properties?.profile_image || null
      };
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// 모든 요청 로깅
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Query:`, req.query);
  next();
});

// API 라우트들 (Vercel에서 /api/xxx로 접근됨)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    kakao: {
      clientId: process.env.KAKAO_CLIENT_ID ? 'SET' : 'NOT_SET',
      callbackUrl: process.env.KAKAO_CALLBACK_URL ? 'SET' : 'NOT_SET'
    }
  });
});

// 인증 상태 확인
app.get('/api/auth/status', (req, res) => {
  const user = req.user as any;
  res.json({
    authenticated: req.isAuthenticated(),
    user: user ? {
      id: user.id,
      provider: user.provider || 'kakao',
      username: user.username,
      email: user.email
    } : null,
    timestamp: new Date().toISOString()
  });
});

// 카카오 로그인 라우트 (직접 리다이렉트)
app.get('/api/auth/kakao', (req, res) => {
  console.log('=== KAKAO LOGIN REQUEST RECEIVED ===');
  console.log('Headers:', req.headers);

  if (!process.env.KAKAO_CLIENT_ID) {
    console.error('KAKAO_CLIENT_ID missing');
    return res.status(503).json({ 
      message: "Kakao CLIENT_ID not configured"
    });
  }

  // 카카오 OAuth URL 직접 생성
  const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize');
  kakaoAuthUrl.searchParams.set('client_id', process.env.KAKAO_CLIENT_ID);
  kakaoAuthUrl.searchParams.set('redirect_uri', process.env.KAKAO_CALLBACK_URL || 'https://wikinovel-lirg.vercel.app/api/auth/kakao/callback');
  kakaoAuthUrl.searchParams.set('response_type', 'code');
  kakaoAuthUrl.searchParams.set('scope', 'profile_nickname');

  console.log('Redirecting to Kakao:', kakaoAuthUrl.toString());
  
  // 직접 리다이렉트
  res.redirect(kakaoAuthUrl.toString());
});

// 카카오 콜백 (직접 처리)
app.get('/api/auth/kakao/callback', async (req, res) => {
  console.log('=== KAKAO CALLBACK RECEIVED ===');
  console.log('Query parameters:', req.query);

  const { code, error } = req.query;

  if (error) {
    console.error('Kakao OAuth error:', error);
    return res.redirect(`/?error=kakao_oauth_error&details=${error}`);
  }

  if (!code) {
    console.error('No authorization code received');
    return res.redirect('/?error=kakao_no_code');
  }

  try {
    // 카카오에서 액세스 토큰 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID!,
        client_secret: process.env.KAKAO_CLIENT_SECRET!,
        redirect_uri: process.env.KAKAO_CALLBACK_URL || 'https://wikinovel-lirg.vercel.app/api/auth/kakao/callback',
        code: code as string,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response:', tokenData);

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // 사용자 정보 요청
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    console.log('User data:', userData);

    // 성공 응답
    res.redirect(`/?success=kakao_login&user=${encodeURIComponent(JSON.stringify({
      id: userData.id,
      nickname: userData.properties?.nickname || `kakao_${userData.id}`,
    }))}`);

  } catch (error) {
    console.error('Kakao callback error:', error);
    res.redirect(`/?error=kakao_callback_failed&details=${encodeURIComponent(error.message)}`);
  }
});

// 카카오 테스트 엔드포인트
app.get('/api/auth/kakao/test', (req, res) => {
  res.json({
    message: '카카오 테스트 엔드포인트',
    query: req.query,
    kakaoEnabled: !!(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET),
    timestamp: new Date().toISOString()
  });
});

// 로그아웃
app.get('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect("/");
  });
});

// SPA 폴백 (모든 다른 요청은 클라이언트로)
app.get('*', (req, res) => {
  console.log(`Serving ${req.path} as SPA`);
  
  // API 요청이 아닌 경우 HTML 응답
  if (!req.path.startsWith('/api/')) {
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <title>위키소설</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; padding: 20px; 
              background: #f5f5f5;
            }
            .container { 
              max-width: 600px; margin: 0 auto; 
              background: white; padding: 20px; 
              border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .btn { 
              background: #fee500; color: #000; 
              padding: 12px 24px; border: none; 
              border-radius: 6px; cursor: pointer;
              text-decoration: none; display: inline-block;
              font-weight: bold;
            }
            .btn:hover { background: #fdd800; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎯 위키소설</h1>
            <p>위키형 협업 소설 플랫폼</p>
            
            <h3>🧪 테스트 링크들:</h3>
            <ul>
              <li><a href="/api/health">서버 상태 확인</a></li>
              <li><a href="/api/auth/status">인증 상태 확인</a></li>
              <li><a href="/api/auth/kakao/test">카카오 설정 확인</a></li>
            </ul>
            
            <div style="margin-top: 30px;">
              <a href="/api/auth/kakao" class="btn" onclick="console.log('카카오 로그인 버튼 클릭됨');">
                🍰 카카오 로그인 테스트
              </a>
              
              <div style="margin-top: 10px;">
                <small>
                  <a href="/api/auth/kakao" target="_blank" style="color: #666;">
                    새 탭에서 카카오 로그인 열기
                  </a>
                </small>
              </div>
            </div>
            
            <div style="margin-top: 20px;">
              <h4>🔗 직접 링크 테스트:</h4>
              <div style="background: #f8f8f8; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
                <a href="/api/auth/kakao" target="_blank">/api/auth/kakao</a>
              </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 4px;">
              <strong>현재 상태:</strong> Vercel 서버리스 함수가 정상 작동 중입니다!
            </div>
            
            <script>
              // URL 파라미터 확인하여 로그인 결과 표시
              const urlParams = new URLSearchParams(window.location.search);
              const error = urlParams.get('error');
              const success = urlParams.get('success');
              const user = urlParams.get('user');
              
              if (error) {
                const details = urlParams.get('details');
                document.body.insertAdjacentHTML('afterbegin', 
                  '<div style="background: #ffebee; color: #c62828; padding: 15px; margin: 10px; border-radius: 4px; border: 1px solid #ef5350;">' +
                  '<strong>❌ 오류:</strong> ' + error + (details ? '<br><small>' + decodeURIComponent(details) + '</small>' : '') +
                  '</div>'
                );
              }
              
              if (success && user) {
                try {
                  const userData = JSON.parse(decodeURIComponent(user));
                  document.body.insertAdjacentHTML('afterbegin',
                    '<div style="background: #e8f5e8; color: #2e7d32; padding: 15px; margin: 10px; border-radius: 4px; border: 1px solid #4caf50;">' +
                    '<strong>✅ 성공:</strong> 카카오 로그인 완료!<br>' +
                    '<strong>사용자:</strong> ' + userData.nickname + ' (ID: ' + userData.id + ')' +
                    '</div>'
                  );
                } catch (e) {
                  console.error('User data parse error:', e);
                }
              }
              
              // URL 정리
              if (error || success) {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            </script>
          </div>
        </body>
      </html>
    `;
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } else {
    res.status(404).json({ 
      error: "API endpoint not found",
      path: req.path,
      availableEndpoints: [
        "/api/health",
        "/api/auth/status", 
        "/api/auth/kakao/test",
        "/api/auth/kakao"
      ]
    });
  }
});

export default app;
