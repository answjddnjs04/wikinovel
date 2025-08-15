import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as KakaoStrategy } from "passport-kakao";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Replit 환경 변수가 없을 때 안전하게 처리
const isReplitEnabled = !!(process.env.REPL_ID && process.env.REPLIT_DOMAINS);

console.log('=== AUTH SETUP INITIALIZATION ===');
console.log('Replit enabled:', isReplitEnabled);
console.log('Environment variables check:', {
  REPL_ID: process.env.REPL_ID ? 'SET' : 'NOT_SET',
  REPLIT_DOMAINS: process.env.REPLIT_DOMAINS ? 'SET' : 'NOT_SET',
  KAKAO_CLIENT_ID: process.env.KAKAO_CLIENT_ID ? 'SET' : 'NOT_SET',
  KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET ? 'SET' : 'NOT_SET',
});

// Replit 설정이 있을 때만 OIDC 설정 초기화
const getOidcConfig = memoize(
  async () => {
    if (!isReplitEnabled) {
      throw new Error("Replit authentication not configured");
    }
    
    console.log('Initializing OIDC config for Replit...');
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!,
      process.env.REPL_SECRET
    );
  },
  { maxAge: 1000 * 60 * 60 } // 1 hour cache
);

function updateUserSession(user: any, tokenSet: any) {
  user.access_token = tokenSet.access_token;
  user.refresh_token = tokenSet.refresh_token;
  user.expires_at = tokenSet.expires_at;
}

export async function setupAuth(app: Express) {
  console.log('=== SETTING UP AUTHENTICATION ===');
  
  // PostgreSQL 세션 설정
  const pgSession = connectPg(session);
  
  app.use(
    session({
      store: new pgSession({
        conString: process.env.DATABASE_URL!,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // === 카카오 Strategy 설정 (항상 활성화) ===
  if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
    console.log('Setting up Kakao authentication strategy...');
    
    passport.use(new KakaoStrategy({
      clientID: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      callbackURL: "/api/auth/kakao/callback"
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        console.log('=== KAKAO STRATEGY CALLBACK ===');
        console.log('Access Token received:', accessToken ? 'YES' : 'NO');
        console.log('Profile received:', {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          provider: profile.provider
        });
        
        const user = {
          id: String(profile.id),
          provider: 'kakao',
          username: profile.username || profile.displayName || `kakao_${profile.id}`,
          email: profile._json?.kakao_account?.email || null,
          profilePicture: profile._json?.properties?.profile_image || null
        };
        
        console.log('Creating/updating user in database:', user);
        await storage.ensureUser(user.id, user.username, user.email, user.profilePicture);
        
        console.log('Kakao authentication successful');
        return done(null, user);
      } catch (error) {
        console.error('Error in Kakao strategy:', error);
        return done(error, null);
      }
    }));
  } else {
    console.warn('Kakao authentication not configured - missing CLIENT_ID or CLIENT_SECRET');
  }

  // === Replit Strategy 설정 (조건부) ===
  if (isReplitEnabled) {
    try {
      console.log('Setting up Replit authentication strategy...');
      const oidcConfig = await getOidcConfig();
      
      passport.use(
        "oidc",
        new Strategy(
          {
            config: oidcConfig,
            client: {
              client_id: process.env.REPL_ID!,
              client_secret: process.env.REPL_SECRET,
            },
            params: {
              scope: "openid profile",
              redirect_uri: `https://${process.env.REPLIT_DOMAINS}/api/callback`,
            },
          },
          async (tokenSet: any, userinfo: any, done: VerifyFunction) => {
            try {
              console.log('=== REPLIT STRATEGY CALLBACK ===');
              console.log('Token set received:', !!tokenSet);
              console.log('User info:', userinfo);
              
              const user = {
                ...userinfo,
                ...tokenSet,
              };
              
              await storage.ensureUser(user.sub, user.name, user.email, user.picture);
              console.log('Replit authentication successful');
              return done(null, user);
            } catch (error) {
              console.error("Error during Replit authentication:", error);
              return done(error as Error);
            }
          }
        )
      );
      console.log('Replit authentication strategy configured successfully');
    } catch (error) {
      console.warn("Failed to setup Replit authentication:", error);
    }
  } else {
    console.log('Replit authentication disabled - missing environment variables');
  }

  // Passport 직렬화/역직렬화 설정
  passport.serializeUser((user: any, done) => {
    console.log('Serializing user:', user.id || user.sub);
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    console.log('Deserializing user:', user.id || user.sub);
    done(null, user);
  });

  // === 라우트 설정 ===

  // === Replit 로그인 라우트 (조건부) ===
  if (isReplitEnabled) {
    console.log('Setting up Replit login routes...');
    
    app.get("/api/login", (req, res, next) => {
      console.log('=== REPLIT LOGIN INITIATED ===');
      passport.authenticate("oidc")(req, res, next);
    });

    app.get("/api/callback", 
      passport.authenticate("oidc", { 
        failureRedirect: "/landing?error=replit_auth_failed" 
      }), 
      (req, res) => {
        console.log('=== REPLIT AUTHENTICATION SUCCESSFUL ===');
        const user = req.user as any;
        
        // 신규 사용자 체크
        if (user && !user.name) {
          console.log('New Replit user detected, setting session flag');
          (req.session as any).isNewUser = true;
        }
        
        res.redirect("/");
      }
    );
  } else {
    // Replit 로그인이 비활성화된 경우의 처리
    app.get("/api/login", (req, res) => {
      console.log('=== REPLIT LOGIN REQUEST (DISABLED) ===');
      res.status(503).json({ 
        message: "Replit authentication is not available in this environment",
        availableAuth: ["kakao"],
        reason: "Missing environment variables: REPL_ID, REPLIT_DOMAINS"
      });
    });

    app.get("/api/callback", (req, res) => {
      res.status(503).json({ 
        message: "Replit authentication callback not available",
        redirect: "/landing?error=replit_not_configured"
      });
    });
  }

  // === 카카오 로그인 라우트 (항상 활성화) ===
  app.get("/api/auth/kakao", (req, res, next) => {
    if (!process.env.KAKAO_CLIENT_ID || !process.env.KAKAO_CLIENT_SECRET) {
      console.error('Kakao authentication not configured');
      return res.status(503).json({ 
        message: "Kakao authentication not configured",
        reason: "Missing KAKAO_CLIENT_ID or KAKAO_CLIENT_SECRET"
      });
    }
    
    console.log('=== KAKAO LOGIN INITIATED ===');
    console.log('Request headers:', {
      host: req.get('host'),
      'user-agent': req.get('user-agent')?.substring(0, 50) + '...',
      referer: req.get('referer')
    });
    console.log('Environment check:', {
      KAKAO_CLIENT_ID: process.env.KAKAO_CLIENT_ID ? 'SET' : 'NOT_SET',
      KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET ? 'SET' : 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV
    });
    
    passport.authenticate("kakao")(req, res, next);
  });

  app.get("/api/auth/kakao/callback", 
    (req, res, next) => {
      console.log('=== KAKAO CALLBACK RECEIVED ===');
      console.log('Query parameters:', req.query);
      console.log('Request URL:', req.url);
      console.log('Full URL:', `${req.protocol}://${req.get('host')}${req.originalUrl}`);
      
      // 카카오 OAuth 오류 체크
      if (req.query.error) {
        console.error('Kakao OAuth error in callback:', {
          error: req.query.error,
          error_description: req.query.error_description,
          state: req.query.state
        });
        return res.redirect('/landing?error=kakao_oauth_error&details=' + encodeURIComponent(String(req.query.error_description || req.query.error || 'unknown')));
      }
      
      // 인증 코드 체크
      if (!req.query.code) {
        console.error('No authorization code received in callback');
        return res.redirect('/landing?error=kakao_no_code');
      }
      
      console.log('Authorization code received, proceeding with authentication');
      next();
    },
    passport.authenticate("kakao", { 
      failureRedirect: "/landing?error=kakao_auth_failed",
      failureFlash: false
    }),
    (req, res) => {
      console.log('=== KAKAO AUTHENTICATION SUCCESSFUL ===');
      const user = req.user as any;
      console.log('User authenticated:', user ? {
        id: user.id,
        provider: user.provider,
        username: user.username
      } : 'null');
      
      // 신규 사용자 체크
      if (user && !user.username) {
        console.log('New Kakao user detected, setting session flag');
        (req.session as any).isNewUser = true;
      }
      
      res.redirect("/");
    }
  );

  // === 로그아웃 라우트 ===
  app.get("/api/logout", (req, res) => {
    console.log('=== LOGOUT INITIATED ===');
    const user = req.user as any;
    console.log('Logging out user:', user ? (user.id || user.sub) : 'anonymous');
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      
      if (isReplitEnabled && user && user.provider !== 'kakao') {
        // Replit 사용자의 경우 Replit 로그아웃 처리
        try {
          const config = getOidcConfig();
          const logoutUrl = client.buildEndSessionUrl(config as any, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href;
          res.redirect(logoutUrl);
        } catch (error) {
          console.error('Error building Replit logout URL:', error);
          res.redirect("/");
        }
      } else {
        // 카카오 사용자 또는 일반 로그아웃
        res.redirect("/");
      }
    });
  });

  // === 디버깅 및 테스트 라우트 ===
  
  // 카카오 테스트 엔드포인트
  app.get("/api/auth/kakao/test", (req, res) => {
    console.log('=== KAKAO TEST ENDPOINT ===');
    res.json({
      message: '카카오 테스트 엔드포인트',
      query: req.query,
      kakakoEnabled: !!(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET),
      timestamp: new Date().toISOString()
    });
  });

  // 인증 상태 확인 엔드포인트
  app.get("/api/auth/status", (req, res) => {
    const user = req.user as any;
    res.json({
      authenticated: req.isAuthenticated(),
      user: user ? {
        id: user.id || user.sub,
        provider: user.provider || 'replit',
        username: user.username || user.name,
        email: user.email
      } : null,
      authMethods: {
        kakao: !!(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET),
        replit: isReplitEnabled
      },
      timestamp: new Date().toISOString()
    });
  });

  console.log('=== AUTHENTICATION SETUP COMPLETE ===');
  console.log('Available auth methods:', {
    kakao: !!(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET),
    replit: isReplitEnabled
  });
}

// === 인증 미들웨어 ===
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    console.log('Authentication check failed: user not authenticated');
    return res.status(401).json({ message: "Unauthorized" });
  }

  // 카카오 사용자는 토큰 만료 체크 안함
  if (user.provider === 'kakao') {
    console.log('Kakao user authenticated:', user.id);
    return next();
  }

  // Replit 사용자 토큰 만료 체크
  if (!user.expires_at) {
    console.log('Authentication check failed: no expires_at for Replit user');
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    console.log('Replit user token valid:', user.sub);
    return next();
  }

  // 토큰 갱신 시도
  const refreshToken = user.refresh_token;
  if (!refreshToken || !isReplitEnabled) {
    console.log('Authentication check failed: no refresh token or Replit disabled');
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    console.log('Attempting to refresh Replit token...');
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log('Replit token refreshed successfully');
    return next();
  } catch (error) {
    console.error('Token refresh failed:', error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
