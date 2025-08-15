import {
  users,
  novels,
  novelContributions,
  editProposals,
  proposalVotes,
  proposalComments,
  novelUserTitles,
  type User,
  type UpsertUser,
  type Novel,
  type InsertNovel,
  type NovelContribution,
  type InsertNovelContribution,
  type EditProposal,
  type InsertEditProposal,
  type ProposalVote,
  type InsertProposalVote,
  type ProposalComment,
  type InsertProposalComment,
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
  updateNovelContent(id: string, content: string): Promise<Novel>;
  updateNovelWorldSetting(id: string, worldSetting: string): Promise<Novel>;
  updateNovelRules(id: string, rules: string): Promise<Novel>;
  getNovelCountsByGenre(): Promise<Record<string, number>>;
  
  // Contribution operations
  addNovelContribution(novelId: string, userId: string, charCount: number, type: string): Promise<NovelContribution>;
  getUserContributionsByNovel(userId: string, novelId: string): Promise<number>;
  
  // Proposal operations
  getProposalsByNovel(novelId: string): Promise<EditProposal[]>;
  createEditProposal(proposal: InsertEditProposal): Promise<EditProposal>;
  updateProposalStatus(id: string, status: string): Promise<EditProposal>;
  
  // Vote operations
  createProposalVote(vote: InsertProposalVote): Promise<ProposalVote>;
  getVotesByProposal(proposalId: string): Promise<ProposalVote[]>;
  getUserVote(proposalId: string, userId: string): Promise<ProposalVote | undefined>;
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

  async getNovelsByGenre(genre: string): Promise<(Novel & { contributorCount: number; activeContributorCount: number; pendingProposals: number })[]> {
    const novelList = await db
      .select({
        novel: novels,
        contributorCount: sql<number>`count(distinct ${novelContributions.userId})`.as('contributor_count'),
        activeContributorCount: sql<number>`count(distinct case when ${novelContributions.createdAt} > now() - interval '30 days' then ${novelContributions.userId} end)`.as('active_contributor_count'),
        pendingProposals: sql<number>`(select count(*) from ${editProposals} ep where ep.novel_id = ${novels.id} and ep.status = 'pending' and ep.expires_at > now())`.as('pending_proposals')
      })
      .from(novels)
      .leftJoin(novelContributions, eq(novels.id, novelContributions.novelId))
      .where(eq(novels.genre, genre))
      .groupBy(novels.id)
      .orderBy(desc(novels.createdAt));
    
    return novelList.map(item => ({
      ...item.novel,
      contributorCount: item.contributorCount || 0,
      activeContributorCount: item.activeContributorCount || 0,
      pendingProposals: item.pendingProposals || 0
    }));
  }

  async getNovel(id: string): Promise<Novel | undefined> {
    const [novel] = await db.select().from(novels).where(eq(novels.id, id));
    return novel;
  }

  async createNovel(novel: InsertNovel): Promise<Novel> {
    const [newNovel] = await db.insert(novels).values(novel).returning();
    return newNovel;
  }

  async updateNovelContent(id: string, content: string): Promise<Novel> {
    const [updatedNovel] = await db
      .update(novels)
      .set({ content, updatedAt: new Date() })
      .where(eq(novels.id, id))
      .returning();
    return updatedNovel;
  }

  async updateNovelWorldSetting(id: string, worldSetting: string): Promise<Novel> {
    const [updatedNovel] = await db
      .update(novels)
      .set({ worldSetting, updatedAt: new Date() })
      .where(eq(novels.id, id))
      .returning();
    return updatedNovel;
  }

  async updateNovelRules(id: string, rules: string): Promise<Novel> {
    const [updatedNovel] = await db
      .update(novels)
      .set({ rules, updatedAt: new Date() })
      .where(eq(novels.id, id))
      .returning();
    return updatedNovel;
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

  // Contribution operations
  async addNovelContribution(novelId: string, userId: string, charCount: number, type: string): Promise<NovelContribution> {
    const [contribution] = await db
      .insert(novelContributions)
      .values({ novelId, userId, charCount, contributionType: type })
      .returning();
    return contribution;
  }

  async getUserContributionsByNovel(userId: string, novelId: string): Promise<number> {
    const result = await db
      .select({ total: sum(novelContributions.charCount) })
      .from(novelContributions)
      .where(and(
        eq(novelContributions.userId, userId),
        eq(novelContributions.novelId, novelId)
      ));
    
    return Number(result[0]?.total || 0);
  }

  // Proposal operations
  async getProposalsByNovel(novelId: string): Promise<any[]> {
    const proposalsWithDetails = await db
      .select({
        proposal: editProposals,
        proposer: users,
        approveCount: sql<number>`count(case when ${proposalVotes.voteType} = 'approve' then 1 end)`.as('approve_count'),
        rejectCount: sql<number>`count(case when ${proposalVotes.voteType} = 'reject' then 1 end)`.as('reject_count')
      })
      .from(editProposals)
      .leftJoin(users, eq(editProposals.proposerId, users.id))
      .leftJoin(proposalVotes, eq(editProposals.id, proposalVotes.proposalId))
      .where(eq(editProposals.novelId, novelId))
      .groupBy(editProposals.id, users.id)
      .orderBy(desc(editProposals.createdAt));

    // Get comments for each proposal
    const proposalsWithComments = await Promise.all(
      proposalsWithDetails.map(async (item) => {
        const comments = await this.getCommentsByProposal(item.proposal.id);
        return {
          ...item.proposal,
          proposer: item.proposer,
          voteCount: {
            approve: item.approveCount || 0,
            reject: item.rejectCount || 0
          },
          comments
        };
      })
    );

    return proposalsWithComments;
  }

  async createEditProposal(proposal: InsertEditProposal): Promise<EditProposal> {
    const [newProposal] = await db.insert(editProposals).values(proposal).returning();
    return newProposal;
  }

  async updateProposalStatus(id: string, status: string): Promise<EditProposal> {
    const [updatedProposal] = await db
      .update(editProposals)
      .set({ status })
      .where(eq(editProposals.id, id))
      .returning();
    return updatedProposal;
  }

  // Vote operations
  async createProposalVote(vote: InsertProposalVote): Promise<ProposalVote> {
    const [newVote] = await db.insert(proposalVotes).values(vote).returning();
    return newVote;
  }

  async getVotesByProposal(proposalId: string): Promise<ProposalVote[]> {
    return await db.select().from(proposalVotes).where(eq(proposalVotes.proposalId, proposalId));
  }

  async getUserVote(proposalId: string, userId: string): Promise<ProposalVote | undefined> {
    const [vote] = await db
      .select()
      .from(proposalVotes)
      .where(and(
        eq(proposalVotes.proposalId, proposalId),
        eq(proposalVotes.userId, userId)
      ));
    return vote;
  }

  // Comment operations
  async createProposalComment(comment: InsertProposalComment): Promise<ProposalComment> {
    const [newComment] = await db.insert(proposalComments).values(comment).returning();
    return newComment;
  }

  async getCommentsByProposal(proposalId: string): Promise<ProposalComment[]> {
    return await db
      .select()
      .from(proposalComments)
      .where(eq(proposalComments.proposalId, proposalId))
      .orderBy(proposalComments.createdAt);
  }
}

export const storage = new DatabaseStorage();
