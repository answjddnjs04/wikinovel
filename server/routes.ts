import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertNovelSchema, insertBlockSchema, insertProposalSchema, insertVoteSchema } from "@shared/schema";
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

  // Block routes
  app.get('/api/novels/:id/blocks', async (req, res) => {
    try {
      const { id } = req.params;
      const blocks = await storage.getBlocksByNovel(id);
      res.json(blocks);
    } catch (error) {
      console.error("Error fetching blocks:", error);
      res.status(500).json({ message: "Failed to fetch blocks" });
    }
  });

  app.post('/api/novels/:id/blocks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const blockData = insertBlockSchema.parse({
        ...req.body,
        novelId: id,
      });

      const block = await storage.createBlock(blockData);
      
      // Add contribution record
      const charCount = blockData.content.length;
      await storage.addBlockContribution(block.id, userId, charCount);

      res.status(201).json(block);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid block data", errors: error.errors });
      }
      console.error("Error creating block:", error);
      res.status(500).json({ message: "Failed to create block" });
    }
  });

  // Proposal routes
  app.get('/api/proposals', async (req, res) => {
    try {
      const proposals = await storage.getProposals();
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  app.get('/api/blocks/:id/proposals', async (req, res) => {
    try {
      const { id } = req.params;
      const proposals = await storage.getProposalsByBlock(id);
      res.json(proposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  app.post('/api/proposals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const proposalData = insertProposalSchema.parse({
        ...req.body,
        proposerId: userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      });

      const proposal = await storage.createProposal(proposalData);
      res.status(201).json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid proposal data", errors: error.errors });
      }
      console.error("Error creating proposal:", error);
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  // Vote routes
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

  app.post('/api/votes', isAuthenticated, async (req: any, res) => {
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

      const voteData = insertVoteSchema.parse({
        proposalId,
        userId,
        voteType,
        weight,
      });

      const vote = await storage.createVote(voteData);
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
