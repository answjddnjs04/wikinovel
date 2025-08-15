import type { Express } from "express";
import { createServer, type Server } from "http";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertNovelSchema, insertEditProposalSchema, insertProposalVoteSchema, novels, editProposals } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      let userId: string;
      
      // Handle different authentication providers
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }
      
      const user = await storage.getUser(userId);
      
      // Check if this is a new user from session
      const isNewUser = (req.session as any)?.isNewUser || false;
      if (isNewUser) {
        console.log('New user flag detected in session, adding to response');
        // Clear the flag after first check
        delete (req.session as any).isNewUser;
      }
      
      res.json({ ...user, isNewUser });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Novel routes
  app.get('/api/novels', async (req, res) => {
    try {
      const { genre } = req.query;
      const novels = genre 
        ? await storage.getNovelsByGenre(genre as string)
        : await storage.getAllNovels();
      res.json(novels);
    } catch (error) {
      console.error("Error fetching novels:", error);
      res.status(500).json({ message: "Failed to fetch novels" });
    }
  });

  app.get('/api/novels/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const novel = await storage.getNovel(id);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }
      res.json(novel);
    } catch (error) {
      console.error("Error fetching novel:", error);
      res.status(500).json({ message: "Failed to fetch novel" });
    }
  });

  app.post('/api/novels', isAuthenticated, async (req: any, res) => {
    try {
      // Handle different authentication providers (same as /api/auth/user)
      let userId: string;
      
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }
      
      const novelData = insertNovelSchema.parse({ ...req.body, authorId: userId });
      const novel = await storage.createNovel(novelData);
      res.status(201).json(novel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid novel data", errors: error.errors });
      }
      console.error("Error creating novel:", error);
      res.status(500).json({ message: "Failed to create novel" });
    }
  });

  // Novel content update routes
  app.put('/api/novels/:id/content', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      // Handle different authentication providers (same as /api/auth/user)
      let userId: string;
      
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }

      const novel = await storage.updateNovelContent(id, content, userId);
      
      // Calculate character count for contribution tracking
      const charCount = content.length;
      await storage.addNovelContribution(id, userId, charCount, 'content');

      res.json(novel);
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  app.put('/api/novels/:id/rules', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { rules } = req.body;
      // Handle different authentication providers (same as /api/auth/user)
      let userId: string;
      
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }

      const novel = await storage.updateNovelRules(id, rules, userId);
      
      // Calculate character count for contribution tracking
      const charCount = rules.length;
      await storage.addNovelContribution(id, userId, charCount, 'rules');

      res.json(novel);
    } catch (error) {
      console.error("Error updating rules:", error);
      res.status(500).json({ message: "Failed to update rules" });
    }
  });

  // Edit proposal routes
  app.get('/api/novels/:id/proposals', async (req, res) => {
    try {
      const { id } = req.params;
      const proposals = await storage.getProposalsByNovel(id);
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  // Get user's proposals
  app.get('/api/my-proposals', isAuthenticated, async (req: any, res) => {
    try {
      // Handle different authentication providers (same as /api/auth/user)
      let userId: string;
      
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }
      const proposals = await storage.getUserProposals(userId);
      res.json(proposals);
    } catch (error) {
      console.error('Error fetching user proposals:', error);
      res.status(500).json({ message: 'Failed to fetch user proposals' });
    }
  });

  // Delete proposal
  app.delete('/api/proposals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      // Handle different authentication providers (same as /api/auth/user)
      let userId: string;
      
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }
      const success = await storage.deleteProposal(id, userId);
      
      if (!success) {
        return res.status(403).json({ message: "Cannot delete this proposal" });
      }
      
      res.json({ message: "Proposal deleted successfully" });
    } catch (error) {
      console.error('Error deleting proposal:', error);
      res.status(500).json({ message: 'Failed to delete proposal' });
    }
  });

  app.post('/api/proposals', isAuthenticated, async (req: any, res) => {
    try {
      // Handle different authentication providers (same as /api/auth/user)
      let userId: string;
      
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }
      const proposalData = insertEditProposalSchema.parse({ ...req.body, proposerId: userId });
      const proposal = await storage.createEditProposal(proposalData);
      res.status(201).json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid proposal data", errors: error.errors });
      }
      console.error("Error creating proposal:", error);
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  app.get('/api/proposals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const proposal = await storage.getProposal(id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      res.json(proposal);
    } catch (error) {
      console.error("Error fetching proposal:", error);
      res.status(500).json({ message: "Failed to fetch proposal" });
    }
  });

  // Voting routes
  app.post('/api/proposals/:id/votes', isAuthenticated, async (req: any, res) => {
    try {
      const { id: proposalId } = req.params;
      const { voteType } = req.body;
      
      // Handle different authentication providers (same as /api/auth/user)
      let userId: string;
      
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }

      // Get the proposal to determine which novel we're voting on
      const proposal = await storage.getProposal(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Calculate vote weight based on user contributions to the novel
      const userContributions = await storage.getUserContributionsByNovel(userId, proposal.novelId);
      const weight = Math.max(1, Math.floor(userContributions / 100)); // 100글자당 1가중치, 최소 1

      const voteData = insertProposalVoteSchema.parse({
        proposalId,
        userId,
        voteType,
        weight,
      });

      const vote = await storage.createProposalVote(voteData);
      
      // Check if proposal should be automatically applied after this vote
      const wasApplied = await storage.checkAndApplyProposal(proposalId);
      
      res.status(201).json({ 
        ...vote, 
        proposalApplied: wasApplied 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      console.error("Error creating vote:", error);
      res.status(500).json({ message: "Failed to create vote" });
    }
  });

  // Comment routes
  app.post('/api/proposal-comments', isAuthenticated, async (req: any, res) => {
    try {
      const { proposalId, content } = req.body;
      // Handle different authentication providers (same as /api/auth/user)
      let userId: string;
      
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }

      const comment = await storage.createProposalComment({
        proposalId,
        userId,
        content
      });

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get('/api/proposals/:id/comments', async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getCommentsByProposal(id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Contributor ranking routes
  app.get('/api/novels/:id/contributors', async (req, res) => {
    try {
      const { id } = req.params;
      const contributors = await storage.getContributorsByNovel(id);
      res.json(contributors);
    } catch (error) {
      console.error("Error fetching contributors:", error);
      res.status(500).json({ message: "Failed to fetch contributors" });
    }
  });

  // Auto-apply proposals endpoint (can be called by cron job)
  app.post('/api/proposals/auto-apply', async (req, res) => {
    try {
      await storage.checkAndApplyProposals();
      res.json({ message: "Proposals checked and applied successfully" });
    } catch (error) {
      console.error("Error auto-applying proposals:", error);
      res.status(500).json({ message: "Failed to auto-apply proposals" });
    }
  });

  // Weekly leaderboard endpoint
  app.get('/api/leaderboard/weekly', async (req, res) => {
    try {
      const leaderboard = await storage.getWeeklyLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching weekly leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch weekly leaderboard" });
    }
  });

  // Track novel view
  app.post('/api/novels/:id/view', async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      const ipAddress = req.ip;
      
      await storage.trackNovelView(id, userId, ipAddress);
      res.json({ message: "View tracked successfully" });
    } catch (error) {
      console.error("Error tracking novel view:", error);
      res.status(500).json({ message: "Failed to track view" });
    }
  });

  // Track episode view
  app.post('/api/novels/:id/episodes/:episodeNumber/view', async (req: any, res) => {
    try {
      const { id, episodeNumber } = req.params;
      const episodeNum = parseInt(episodeNumber);
      
      const result = await storage.incrementEpisodeView(id, episodeNum);
      res.json(result);
    } catch (error) {
      console.error("Error tracking episode view:", error);
      res.status(500).json({ message: "Failed to track episode view" });
    }
  });

  // User profile update route
  app.put('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      let userId: string;
      
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }
      
      const { username, bio } = req.body;
      
      if (!username || username.trim().length === 0) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      const updatedUser = await storage.updateUserProfile(userId, { username: username.trim(), bio: bio?.trim() });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      // Simple database connectivity check
      await storage.getAllNovels();
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ status: 'unhealthy', error: 'Database connection failed' });
    }
  });

  // Create HTTP server and return it
  const httpServer = createServer(app);
  return httpServer;
}
