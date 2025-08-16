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

// 기본 라우트들
app.get('/health', (req, res) => {
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
app.get('/auth/status', (req, res) => {
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

// 카카오 로그인 라우트
app.get('/auth/kakao', (req, res, next) => {
  if (!process.env.KAKAO_CLIENT_ID || !process.env.KAKAO_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: "Kakao authentication not configured",
      reason: "Missing KAKAO_CLIENT_ID or KAKAO_CLIENT_SECRET"
    });
  }
  
  console.log('=== KAKAO LOGIN INITIATED ===');
  passport.authenticate("kakao")(req, res, next);
});

// 카카오 콜백
app.get('/auth/kakao/callback', 
  passport.authenticate("kakao", { 
    failureRedirect: "/landing?error=kakao_auth_failed" 
  }),
  (req, res) => {
    console.log('=== KAKAO AUTHENTICATION SUCCESSFUL ===');
    res.redirect("/");
  }
);

// 카카오 테스트 엔드포인트
app.get('/auth/kakao/test', (req, res) => {
  res.json({
    message: '카카오 테스트 엔드포인트',
    query: req.query,
    kakaoEnabled: !!(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET),
    timestamp: new Date().toISOString()
  });
});

// 로그아웃
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect("/");
  });
});

// SPA 폴백 (모든 다른 요청은 클라이언트로)
app.get('*', (req, res) => {
  // API 요청이 아닌 경우 간단한 HTML 응답
  if (!req.path.startsWith('/api/')) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>위키소설</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div id="root">Loading...</div>
          <script>console.log('Vercel serving basic HTML');</script>
        </body>
      </html>
    `;
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});

export default app;
