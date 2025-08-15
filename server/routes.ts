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
        : await storage.getNovels();
      res.json(novels);
    } catch (error) {
      console.error("Error fetching novels:", error);
      res.status(500).json({ message: "Failed to fetch novels" });
    }
  });

  app.get('/api/novels/genre-counts', async (req, res) => {
    try {
      const counts = await storage.getNovelCountsByGenre();
      res.json(counts);
    } catch (error) {
      console.error("Error fetching genre counts:", error);
      res.status(500).json({ message: "Failed to fetch genre counts" });
    }
  });

  // Get weekly stats (real data)
  app.get('/api/weekly-stats', async (req, res) => {
    try {
      // Get real statistics using storage methods
      const stats = await storage.getWeeklyStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
      res.status(500).json({ message: "Failed to fetch weekly stats" });
    }
  });

  app.get('/api/novels/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // Increment view count and get novel
      const novel = await storage.incrementNovelViewCount(id);
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
      const novelData = insertNovelSchema.parse(req.body);
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
      const userId = req.user.claims.sub;

      const novel = await storage.updateNovelContent(id, content);
      
      // Add contribution record
      const charCount = content.length;
      await storage.addNovelContribution(id, userId, charCount, 'story');

      res.json(novel);
    } catch (error) {
      console.error("Error updating novel content:", error);
      res.status(500).json({ message: "Failed to update novel content" });
    }
  });

  app.put('/api/novels/:id/world-setting', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { worldSetting } = req.body;
      const userId = req.user.claims.sub;

      const novel = await storage.updateNovelWorldSetting(id, worldSetting);
      
      // Add contribution record
      const charCount = worldSetting.length;
      await storage.addNovelContribution(id, userId, charCount, 'worldSetting');

      res.json(novel);
    } catch (error) {
      console.error("Error updating world setting:", error);
      res.status(500).json({ message: "Failed to update world setting" });
    }
  });

  app.put('/api/novels/:id/rules', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { rules } = req.body;
      const userId = req.user.claims.sub;

      const novel = await storage.updateNovelRules(id, rules);
      
      // Add contribution record
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
      console.error("Error deleting proposal:", error);
      res.status(500).json({ message: "Failed to delete proposal" });
    }
  });

  // Get single proposal by ID
  app.get('/api/proposals/:proposalId', async (req, res) => {
    try {
      const { proposalId } = req.params;
      console.log('Fetching proposal with ID:', proposalId);
      
      const proposal = await storage.getProposalById(proposalId);
      if (!proposal) {
        console.log('Proposal not found:', proposalId);
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      console.log('Found proposal:', proposal);
      res.json(proposal);
    } catch (error) {
      console.error("Error fetching proposal:", error);
      res.status(500).json({ message: "Failed to fetch proposal" });
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
      
      const { novelId, proposalType, originalText, proposedText, reason, title, episodeNumber } = req.body;
      
      console.log('Received proposal data:', { novelId, proposalType, originalText, proposedText, reason, title, userId });
      
      // Set expiration to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const proposal = await storage.createEditProposal({
        novelId,
        proposerId: userId,
        proposalType,
        originalText,
        proposedText,
        reason,
        title: title || proposedText.substring(0, 50) + (proposedText.length > 50 ? '...' : ''),
        episodeNumber: episodeNumber || null,
        views: 0,
        expiresAt
      });

      res.status(201).json(proposal);
    } catch (error) {
      console.error("Error creating proposal:", error);
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  // Voting routes
  app.post('/api/proposal-votes', isAuthenticated, async (req: any, res) => {
    try {
      const { proposalId, voteType } = req.body;
      const userId = req.user.claims.sub;

      // Check if user already voted
      const existingVote = await storage.getUserVote(proposalId, userId);
      if (existingVote) {
        return res.status(400).json({ message: "User has already voted on this proposal" });
      }

      // Calculate vote weight based on user contributions to the novel
      const proposal = await storage.getProposal(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      const userContributions = await storage.getUserContributionsByNovel(userId, proposal.novelId);
      const weight = Math.max(1, Math.floor(userContributions / 100)); // 1 weight per 100 characters contributed, minimum 1

      const vote = await storage.createProposalVote({
        proposalId,
        userId,
        voteType,
        weight
      });

      // Check if proposal should be automatically applied after this vote
      const wasApplied = await storage.checkAndApplyProposal(proposalId);
      
      res.status(201).json({ 
        ...vote, 
        proposalApplied: wasApplied 
      });
    } catch (error) {
      console.error("Error creating vote:", error);
      res.status(500).json({ message: "Failed to create vote" });
    }
  });

  // Comment routes
  app.post('/api/proposal-comments', isAuthenticated, async (req: any, res) => {
    try {
      const { proposalId, content } = req.body;
      const userId = req.user.claims.sub;

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
      const userId = req.user?.claims?.sub;
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
      
      const result = await storage.incrementEpisodeViews(id, episodeNum);
      res.json({ message: "Episode view tracked successfully", episodeViews: result });
    } catch (error) {
      console.error("Error tracking episode view:", error);
      res.status(500).json({ message: "Failed to track episode view" });
    }
  });

  // Track proposal view
  app.post('/api/proposals/:id/view', async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const ipAddress = req.ip;
      
      await storage.trackProposalView(id, userId, ipAddress);
      res.json({ message: "View tracked successfully" });
    } catch (error) {
      console.error("Error tracking proposal view:", error);
      res.status(500).json({ message: "Failed to track view" });
    }
  });



  // Proposal vote routes
  app.get('/api/proposals/:id/votes', async (req, res) => {
    try {
      const { id } = req.params;
      const votes = await storage.getVotesByProposal(id);
      res.json(votes);
    } catch (error) {
      console.error("Error fetching votes:", error);
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

  app.post('/api/proposal-votes', isAuthenticated, async (req: any, res) => {
    try {
      // Handle different authentication providers (same as /api/auth/user)
      let userId: string;
      
      if (req.user.provider === 'kakao') {
        userId = req.user.id;
      } else {
        userId = req.user.claims.sub;
      }
      const { proposalId, voteType } = req.body;

      // Check if user already voted
      const existingVote = await storage.getUserVote(proposalId, userId);
      if (existingVote) {
        return res.status(400).json({ message: "User has already voted on this proposal" });
      }

      // Get the proposal to find the novel
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
      res.status(201).json(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      console.error("Error creating vote:", error);
      res.status(500).json({ message: "Failed to create vote" });
    }
  });

  // Update user profile
  app.patch('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.sub || user.id;
      const { firstName } = req.body;
      
      console.log('Profile update - User object:', user);
      console.log('Profile update - UserId:', userId);
      console.log('Profile update - Request body:', req.body);
      
      if (!firstName || firstName.trim().length === 0) {
        return res.status(400).json({ message: "닉네임은 필수입니다" });
      }
      
      if (firstName.length > 50) {
        return res.status(400).json({ message: "닉네임은 50자 이내로 입력해주세요" });
      }

      const updatedUser = await storage.updateUser(userId, {
        firstName: firstName.trim()
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "프로필 업데이트에 실패했습니다" });
    }
  });

  // User stats route
  app.get('/api/user/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // TODO: Calculate comprehensive user statistics
      const stats = {
        totalContribution: 0,
        approvalRate: 0,
        participatedNovels: 0,
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
