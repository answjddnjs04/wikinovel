// server/replitAuth.ts 수정

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
const isReplitEnabled = process.env.REPL_ID && process.env.REPLIT_DOMAINS;

if (isReplitEnabled && !process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    if (!isReplitEnabled) {
      throw new Error("Replit authentication not configured");
    }
    
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!,
      process.env.REPL_SECRET
    );
  },
  { maxAge: 1000 * 60 * 60 } // 1 hour
);

// 나머지 코드는 동일하게 유지하되, Replit 관련 기능을 조건부로 처리
export async function setupAuth(app: Express) {
  // 세션 설정
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

  // 카카오 Strategy는 항상 설정
  if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
    passport.use(new KakaoStrategy({
      clientID: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      callbackURL: "/api/auth/kakao/callback"
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        console.log('=== KAKAO STRATEGY CALLBACK ===');
        console.log('Profile:', JSON.stringify(profile, null, 2));
        
        const user = {
          id: String(profile.id),
          provider: 'kakao',
          username: profile.username || profile.displayName || `kakao_${profile.id}`,
          email: profile._json?.kakao_account?.email || null,
          profilePicture: profile._json?.properties?.profile_image || null
        };
        
        await storage.ensureUser(user.id, user.username, user.email, user.profilePicture);
        return done(null, user);
      } catch (error) {
        console.error('Error in Kakao strategy:', error);
        return done(error, null);
      }
    }));
  }

  // Replit Strategy는 조건부로 설정
  if (isReplitEnabled) {
    try {
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
              const user = {
                ...userinfo,
                ...tokenSet,
              };
              await storage.ensureUser(user.sub, user.name, user.email, user.picture);
              return done(null, user);
            } catch (error) {
              console.error("Error during authentication:", error);
              return done(error as Error);
            }
          }
        )
      );
    } catch (error) {
      console.warn("Failed to setup Replit authentication:", error);
    }
  }

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  // 라우트 설정
  // Replit 로그인 라우트 (조건부)
  if (isReplitEnabled) {
    app.get("/api/login", passport.authenticate("oidc"));
    app.get("/api/callback", passport.authenticate("oidc", { 
      failureRedirect: "/landing" 
    }), (req, res) => {
      const user = req.user as any;
      if (user && !user.name) {
        (req.session as any).isNewUser = true;
      }
      res.redirect("/");
    });
  } else {
    // Replit 로그인이 비활성화된 경우의 처리
    app.get("/api/login", (req, res) => {
      res.status(503).json({ 
        message: "Replit authentication is not available in this environment",
        availableAuth: ["kakao"]
      });
    });
  }

  // 카카오 로그인 라우트는 항상 활성화
  app.get("/api/auth/kakao", (req, res, next) => {
    if (!process.env.KAKAO_CLIENT_ID || !process.env.KAKAO_CLIENT_SECRET) {
      return res.status(503).json({ 
        message: "Kakao authentication not configured" 
      });
    }
    
    console.log('=== KAKAO LOGIN INITIATED ===');
    console.log('Request headers:', {
      host: req.get('host'),
      'user-agent': req.get('user-agent'),
      referer: req.get('referer')
    });
    console.log('Environment check:', {
      KAKAO_CLIENT_ID: process.env.KAKAO_CLIENT_ID ? 'SET' : 'NOT_SET',
      KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET ? 'SET' : 'NOT_SET',
      REPLIT_DOMAINS: process.env.REPLIT_DOMAINS
    });
    
    passport.authenticate("kakao")(req, res, next);
  });

  // 나머지 카카오 라우트들...
  app.get("/api/auth/kakao/callback", 
    (req, res, next) => {
      console.log('=== KAKAO CALLBACK RECEIVED ===');
      console.log('Query parameters:', req.query);
      
      if (req.query.error) {
        console.error('Kakao OAuth error in callback:', req.query);
        return res.redirect('/landing?error=kakao_oauth_error');
      }
      
      if (!req.query.code) {
        console.error('No authorization code received in callback');
        return res.redirect('/landing?error=kakao_no_code');
      }
      
      next();
    },
    passport.authenticate("kakao", { 
      failureRedirect: "/landing?error=kakao_auth_failed",
      failureFlash: false
    }),
    (req, res) => {
      console.log('=== KAKAO AUTHENTICATION SUCCESSFUL ===');
      const user = req.user as any;
      if (user && !user.username) {
        (req.session as any).isNewUser = true;
      }
      res.redirect("/");
    }
  );

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      if (isReplitEnabled) {
        // Replit 로그아웃 처리
        const config = getOidcConfig();
        res.redirect(
          client.buildEndSessionUrl(config as any, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      } else {
        // 일반 로그아웃
        res.redirect("/");
      }
    });
  });
}

// isAuthenticated 미들웨어도 업데이트
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // 카카오 사용자는 토큰 만료 체크 안함
  if (user.provider === 'kakao') {
    return next();
  }

  // Replit 사용자 토큰 만료 체크
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // 토큰 갱신 로직...
  const refreshToken = user.refresh_token;
  if (!refreshToken || !isReplitEnabled) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
