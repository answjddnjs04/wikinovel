import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as KakaoStrategy } from "passport-kakao";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

async function upsertKakaoUser(
  profile: any,
) {
  await storage.upsertUser({
    id: profile.id.toString(),
    email: profile._json.kakao_account?.email || null,
    firstName: profile.displayName || profile.username,
    lastName: "",
    profileImageUrl: profile._json.kakao_account?.profile?.profile_image_url || null,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Kakao OAuth Strategy
  if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
    console.log('Setting up Kakao OAuth with:', {
      clientID: process.env.KAKAO_CLIENT_ID,
      callbackURL: process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}/api/auth/kakao/callback`
        : "http://localhost:5000/api/auth/kakao/callback"
    });
    
    passport.use(new KakaoStrategy({
      clientID: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      callbackURL: process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}/api/auth/kakao/callback`
        : "http://localhost:5000/api/auth/kakao/callback",

    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      console.log('=== KAKAO STRATEGY CALLBACK ===');
      console.log('Access token received:', accessToken ? 'YES' : 'NO');
      console.log('Refresh token received:', refreshToken ? 'YES' : 'NO');
      console.log('Profile received:', {
        id: profile?.id,
        username: profile?.username,
        displayName: profile?.displayName,
        emails: profile?.emails,
        photos: profile?.photos,
        _json: profile?._json ? 'PRESENT' : 'MISSING'
      });
      
      try {
        await upsertKakaoUser(profile);
        console.log('User upserted successfully');
        
        const user = {
          id: profile.id.toString(),
          provider: 'kakao',
          accessToken,
          refreshToken,
          profile
        };
        
        console.log('Returning user object:', {
          id: user.id,
          provider: user.provider,
          hasAccessToken: !!user.accessToken
        });
        
        return done(null, user);
      } catch (error) {
        console.error('Error in Kakao strategy callback:', error);
        return done(error);
      }
    }));
  }

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Kakao OAuth routes
  app.get("/api/auth/kakao", (req, res, next) => {
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

  app.get("/api/auth/kakao/callback", 
    (req, res, next) => {
      console.log('=== KAKAO CALLBACK RECEIVED ===');
      console.log('Query parameters:', req.query);
      console.log('Request URL:', req.url);
      console.log('Full URL:', `${req.protocol}://${req.get('host')}${req.originalUrl}`);
      
      // Check for errors in callback
      if (req.query.error) {
        console.error('Kakao OAuth error in callback:', {
          error: req.query.error,
          error_description: req.query.error_description,
          state: req.query.state
        });
        return res.redirect('/landing?error=kakao_oauth_error&details=' + encodeURIComponent(String(req.query.error_description || req.query.error || 'unknown')));
      }
      
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
      console.log('User authenticated:', req.user ? 'YES' : 'NO');
      console.log('Session:', req.session.id);
      res.redirect("/");
    }
  );

  // Error handling for Kakao auth
  app.get("/api/auth/kakao/error", (req, res) => {
    console.log('=== KAKAO AUTH ERROR ENDPOINT ===');
    console.log('Query params:', req.query);
    res.json({
      error: 'Kakao authentication failed',
      details: req.query,
      timestamp: new Date().toISOString()
    });
  });

  // Direct test endpoint for Kakao
  app.get("/api/auth/kakao/test", (req, res) => {
    console.log('=== KAKAO TEST ENDPOINT ===');
    res.json({
      message: '테스트 콜백 성공',
      query: req.query,
      timestamp: new Date().toISOString()
    });
  });

  // Direct Kakao callback for testing (without Passport)
  app.get("/api/kakao-direct", (req, res) => {
    console.log('=== DIRECT KAKAO CALLBACK ===');
    console.log('Query parameters:', req.query);
    
    if (req.query.error) {
      console.error('Kakao OAuth error:', req.query.error);
      return res.json({
        error: 'Kakao OAuth error',
        details: req.query,
        timestamp: new Date().toISOString()
      });
    }
    
    if (req.query.code) {
      console.log('Authorization code received:', req.query.code);
      return res.json({
        success: true,
        message: 'Kakao 인증 코드 수신 성공!',
        code: req.query.code,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      message: 'Direct Kakao callback reached',
      query: req.query,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Handle Kakao users (they don't have expires_at)
  if (user.provider === 'kakao') {
    return next();
  }

  // Handle Replit users with token expiration
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
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
