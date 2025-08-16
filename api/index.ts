// api/index.ts - 완전한 버전
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

// 모든 요청 로깅
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Query:`, req.query);
  next();
});

// 세션 설정 (간단한 메모리 저장소)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
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

// API 라우트들
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

// 인증 상태 확인 (세션 기반)
app.get('/api/auth/status', (req, res) => {
  const user = req.session.user;
  res.json({
    authenticated: !!user,
    user: user || null,
    timestamp: new Date().toISOString()
  });
});

// React 앱에서 사용하는 사용자 정보 API
app.get('/api/auth/user', (req, res) => {
  const user = req.session.user;
  
  if (!user) {
    return res.status(401).json({ 
      message: 'Not authenticated',
      authenticated: false 
    });
  }
  
  res.json({
    id: user.id,
    nickname: user.nickname,
    provider: user.provider,
    profilePicture: user.profilePicture,
    isNewUser: false // 기본값
  });
});

// 카카오 로그인 라우트 (강화된 리다이렉트)
app.get('/api/auth/kakao', (req, res) => {
  console.log('=== KAKAO LOGIN REQUEST RECEIVED ===');

  if (!process.env.KAKAO_CLIENT_ID) {
    console.error('KAKAO_CLIENT_ID missing');
    return res.status(503).json({ 
      message: "Kakao CLIENT_ID not configured"
    });
  }

  try {
    // 카카오 OAuth URL 직접 생성
    const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize');
    kakaoAuthUrl.searchParams.set('client_id', process.env.KAKAO_CLIENT_ID);
    kakaoAuthUrl.searchParams.set('redirect_uri', process.env.KAKAO_CALLBACK_URL || 'https://wikinovel-lirg.vercel.app/api/auth/kakao/callback');
    kakaoAuthUrl.searchParams.set('response_type', 'code');
    kakaoAuthUrl.searchParams.set('scope', 'profile_nickname');

    const redirectUrl = kakaoAuthUrl.toString();
    console.log('Redirecting to Kakao:', redirectUrl);
    
    // 명시적인 리다이렉트 헤더 설정
    res.writeHead(302, {
      'Location': redirectUrl,
      'Cache-Control': 'no-cache'
    });
    res.end();
  } catch (error) {
    console.error('Error generating Kakao URL:', error);
    res.status(500).json({ error: 'Failed to generate Kakao login URL' });
  }
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

    // 세션에 사용자 정보 저장
    req.session.user = {
      id: userData.id,
      nickname: userData.properties?.nickname || `kakao_${userData.id}`,
      provider: 'kakao',
      profilePicture: userData.properties?.profile_image || null
    };

    console.log('User logged in:', req.session.user);

    // 성공 응답 - 홈으로 깔끔하게 리다이렉트
    res.redirect("/");
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
  console.log('User logged out:', req.session.user);
  
  // 세션에서 사용자 정보 제거
  req.session.user = null;
  
  res.redirect("/");
});

// SPA 폴백 (실제 클라이언트가 dist/public에서 제공됨)
app.get('*', (req, res) => {
  // API 요청만 처리, 나머지는 정적 파일이 처리
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ 
      error: "API endpoint not found",
      path: req.path,
      availableEndpoints: [
        "/api/health",
        "/api/auth/status", 
        "/api/auth/kakao/test",
        "/api/auth/kakao",
        "/api/auth/kakao/callback"
      ]
    });
  } else {
    // 이 경우는 발생하지 않아야 함 (정적 파일이 먼저 처리됨)
    res.status(404).json({ error: "Page not found" });
  }
});

export default app;
