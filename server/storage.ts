import {
  users,
  novels,
  blocks,
  blockContributions,
  proposals,
  votes,
  novelUserTitles,
  type User,
  type UpsertUser,
  type Novel,
  type InsertNovel,
  type Block,
  type InsertBlock,
  type BlockContribution,
  type Proposal,
  type InsertProposal,
  type Vote,
  type InsertVote,
  type NovelUserTitle,
  type InsertNovelUserTitle,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sum, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Novel operations
  getNovels(): Promise<Novel[]>;
  getNovelsByGenre(genre: string): Promise<Novel[]>;
  getNovel(id: string): Promise<Novel | undefined>;
  createNovel(novel: InsertNovel): Promise<Novel>;
  getNovelCountsByGenre(): Promise<Record<string, number>>;
  
  // Block operations
  getBlocksByNovel(novelId: string): Promise<Block[]>;
  getBlock(id: string): Promise<Block | undefined>;
  createBlock(block: InsertBlock): Promise<Block>;
  updateBlock(id: string, content: string): Promise<Block>;
  
  // Contribution operations
  addBlockContribution(blockId: string, userId: string, charCount: number): Promise<BlockContribution>;
  getUserContributionsByNovel(userId: string, novelId: string): Promise<number>;
  
  // Proposal operations
  getProposals(): Promise<Proposal[]>;
  getProposalsByBlock(blockId: string): Promise<Proposal[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposalStatus(id: string, status: string): Promise<Proposal>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getVotesByProposal(proposalId: string): Promise<Vote[]>;
  getUserVote(proposalId: string, userId: string): Promise<Vote | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Novel operations
  async getNovels(): Promise<Novel[]> {
    return await db.select().from(novels).orderBy(desc(novels.updatedAt));
  }

  async getNovelsByGenre(genre: string): Promise<Novel[]> {
    return await db
      .select()
      .from(novels)
      .where(eq(novels.genre, genre))
      .orderBy(desc(novels.updatedAt));
  }

  async getNovel(id: string): Promise<Novel | undefined> {
    const [novel] = await db.select().from(novels).where(eq(novels.id, id));
    return novel;
  }

  async createNovel(novel: InsertNovel): Promise<Novel> {
    const [newNovel] = await db.insert(novels).values(novel).returning();
    return newNovel;
  }

  async getNovelCountsByGenre(): Promise<Record<string, number>> {
    const result = await db
      .select({
        genre: novels.genre,
        count: count(),
      })
      .from(novels)
      .groupBy(novels.genre);
    
    return result.reduce((acc, row) => {
      acc[row.genre] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Block operations
  async getBlocksByNovel(novelId: string): Promise<Block[]> {
    return await db
      .select()
      .from(blocks)
      .where(eq(blocks.novelId, novelId))
      .orderBy(blocks.orderIndex);
  }

  async getBlock(id: string): Promise<Block | undefined> {
    const [block] = await db.select().from(blocks).where(eq(blocks.id, id));
    return block;
  }

  async createBlock(block: InsertBlock): Promise<Block> {
    const [newBlock] = await db.insert(blocks).values(block).returning();
    return newBlock;
  }

  async updateBlock(id: string, content: string): Promise<Block> {
    const [updatedBlock] = await db
      .update(blocks)
      .set({ content, updatedAt: new Date() })
      .where(eq(blocks.id, id))
      .returning();
    return updatedBlock;
  }

  // Contribution operations
  async addBlockContribution(blockId: string, userId: string, charCount: number): Promise<BlockContribution> {
    const [contribution] = await db
      .insert(blockContributions)
      .values({ blockId, userId, charCount })
      .returning();
    return contribution;
  }

  async getUserContributionsByNovel(userId: string, novelId: string): Promise<number> {
    const result = await db
      .select({ total: sum(blockContributions.charCount) })
      .from(blockContributions)
      .innerJoin(blocks, eq(blockContributions.blockId, blocks.id))
      .where(and(
        eq(blockContributions.userId, userId),
        eq(blocks.novelId, novelId)
      ));
    
    return Number(result[0]?.total || 0);
  }

  // Proposal operations
  async getProposals(): Promise<Proposal[]> {
    return await db.select().from(proposals).orderBy(desc(proposals.createdAt));
  }

  async getProposalsByBlock(blockId: string): Promise<Proposal[]> {
    return await db
      .select()
      .from(proposals)
      .where(eq(proposals.blockId, blockId))
      .orderBy(desc(proposals.createdAt));
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const [newProposal] = await db.insert(proposals).values(proposal).returning();
    return newProposal;
  }

  async updateProposalStatus(id: string, status: string): Promise<Proposal> {
    const [updatedProposal] = await db
      .update(proposals)
      .set({ status })
      .where(eq(proposals.id, id))
      .returning();
    return updatedProposal;
  }

  // Vote operations
  async createVote(vote: InsertVote): Promise<Vote> {
    const [newVote] = await db.insert(votes).values(vote).returning();
    return newVote;
  }

  async getVotesByProposal(proposalId: string): Promise<Vote[]> {
    return await db.select().from(votes).where(eq(votes.proposalId, proposalId));
  }

  async getUserVote(proposalId: string, userId: string): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(
        eq(votes.proposalId, proposalId),
        eq(votes.userId, userId)
      ));
    return vote;
  }
}

export const storage = new DatabaseStorage();
