import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertNovelSchema, insertEditProposalSchema, insertProposalVoteSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
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

  app.post('/api/proposals', isAuthenticated, async (req: any, res) => {
    try {
      const { novelId, proposalType, originalText, proposedText, reason, title } = req.body;
      const userId = req.user.claims.sub;
      
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
        status: 'pending',
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

      const vote = await storage.createProposalVote({
        proposalId,
        userId,
        voteType,
        weight: 1 // TODO: Calculate based on user contributions
      });

      res.status(201).json(vote);
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

  app.post('/api/proposals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const proposalData = insertEditProposalSchema.parse({
        ...req.body,
        proposerId: userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      });

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
      const userId = req.user.claims.sub;
      const { proposalId, voteType } = req.body;

      // Check if user already voted
      const existingVote = await storage.getUserVote(proposalId, userId);
      if (existingVote) {
        return res.status(400).json({ message: "User has already voted on this proposal" });
      }

      // Calculate vote weight based on user's contribution to the novel
      // For now, use a simple weight calculation
      const weight = 100; // TODO: Calculate based on actual contributions

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
