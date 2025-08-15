import {
  users,
  novels,
  novelContributions,
  editProposals,
  proposalVotes,
  proposalComments,
  novelUserTitles,
  novelViews,
  proposalViews,
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
import { eq, desc, and, sum, count, sql, gte, ne } from "drizzle-orm";

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
  
  // Additional proposal operations
  getProposal(id: string): Promise<EditProposal | undefined>;
  checkAndApplyProposal(proposalId: string): Promise<boolean>;
  
  // Comment operations
  createProposalComment(comment: InsertProposalComment): Promise<ProposalComment>;
  getCommentsByProposal(proposalId: string): Promise<any[]>;
  
  // User proposal management
  getUserProposals(userId: string): Promise<any[]>;
  deleteProposal(proposalId: string, userId: string): Promise<boolean>;
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
        approveCount: sql<number>`sum(case when ${proposalVotes.voteType} = 'approve' then ${proposalVotes.weight} else 0 end)`.as('approve_count'),
        rejectCount: sql<number>`sum(case when ${proposalVotes.voteType} = 'reject' then ${proposalVotes.weight} else 0 end)`.as('reject_count')
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
    console.log('Creating edit proposal with data:', proposal);
    try {
      const [newProposal] = await db.insert(editProposals).values(proposal).returning();
      console.log('Successfully created proposal:', newProposal);
      return newProposal;
    } catch (error) {
      console.error('Error creating edit proposal:', error);
      throw error;
    }
  }

  async getProposalById(proposalId: string): Promise<any> {
    console.log('Fetching proposal by ID:', proposalId);
    
    const proposalsWithDetails = await db
      .select({
        proposal: editProposals,
        proposer: users,
        approveCount: sql<number>`sum(case when ${proposalVotes.voteType} = 'approve' then ${proposalVotes.weight} else 0 end)`.as('approve_count'),
        rejectCount: sql<number>`sum(case when ${proposalVotes.voteType} = 'reject' then ${proposalVotes.weight} else 0 end)`.as('reject_count')
      })
      .from(editProposals)
      .leftJoin(users, eq(editProposals.proposerId, users.id))
      .leftJoin(proposalVotes, eq(editProposals.id, proposalVotes.proposalId))
      .where(eq(editProposals.id, proposalId))
      .groupBy(editProposals.id, users.id);

    if (proposalsWithDetails.length === 0) {
      console.log('No proposal found with ID:', proposalId);
      return null;
    }

    const result = proposalsWithDetails[0];
    const flattenedProposal = {
      ...result.proposal,
      proposer: result.proposer,
      approveCount: result.approveCount,
      rejectCount: result.rejectCount
    };

    console.log('Found proposal:', flattenedProposal);
    return flattenedProposal;
  }

  async deleteEditProposal(proposalId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(editProposals)
      .where(and(
        eq(editProposals.id, proposalId),
        eq(editProposals.proposerId, userId),
        eq(editProposals.status, 'pending')
      ))
      .returning();

    return result.length > 0;
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

  async getProposal(id: string): Promise<EditProposal | undefined> {
    const [proposal] = await db.select().from(editProposals).where(eq(editProposals.id, id));
    return proposal;
  }

  async checkAndApplyProposal(proposalId: string): Promise<boolean> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal || proposal.status !== 'pending') {
      return false;
    }

    const votes = await this.getVotesByProposal(proposalId);
    const totalWeight = votes.reduce((sum, vote) => sum + (vote.weight || 1), 0);
    const approveWeight = votes.filter(v => v.voteType === 'approve').reduce((sum, vote) => sum + (vote.weight || 1), 0);
    
    if (totalWeight > 0) {
      const approvalRate = approveWeight / totalWeight;
      
      if (approvalRate >= 0.5) {
        // Apply the proposal based on type
        if (proposal.proposalType === 'modification') {
          await this.updateNovelContent(proposal.novelId, proposal.proposedText);
        } else if (proposal.proposalType === 'worldSetting') {
          await this.updateNovelWorldSetting(proposal.novelId, proposal.proposedText);
        } else if (proposal.proposalType === 'rules') {
          await this.updateNovelRules(proposal.novelId, proposal.proposedText);
        }
        
        await this.updateProposalStatus(proposal.id, 'approved');
        
        // Add contribution record for the proposer
        const charCount = proposal.proposedText.length;
        const contributionType = proposal.proposalType === 'modification' ? 'story' : proposal.proposalType;
        await this.addNovelContribution(proposal.novelId, proposal.proposerId, charCount, contributionType);
        
        console.log(`Proposal ${proposalId} automatically approved with ${(approvalRate * 100).toFixed(1)}% approval rate`);
        return true;
      }
    }
    
    return false;
  }

  // Comment operations
  async createProposalComment(comment: InsertProposalComment): Promise<ProposalComment> {
    const [newComment] = await db.insert(proposalComments).values(comment).returning();
    return newComment;
  }

  async getCommentsByProposal(proposalId: string): Promise<any[]> {
    const commentsWithUsers = await db
      .select({
        comment: proposalComments,
        user: users
      })
      .from(proposalComments)
      .leftJoin(users, eq(proposalComments.userId, users.id))
      .where(eq(proposalComments.proposalId, proposalId))
      .orderBy(proposalComments.createdAt);

    return commentsWithUsers.map(item => ({
      ...item.comment,
      user: item.user
    }));
  }

  // Contributor ranking operations
  async getContributorsByNovel(novelId: string): Promise<any[]> {
    const contributors = await db
      .select({
        userId: novelContributions.userId,
        userName: users.firstName,
        userEmail: users.email,
        totalContribution: sum(novelContributions.charCount).as('total_contribution')
      })
      .from(novelContributions)
      .leftJoin(users, eq(novelContributions.userId, users.id))
      .where(eq(novelContributions.novelId, novelId))
      .groupBy(novelContributions.userId, users.firstName, users.email)
      .orderBy(desc(sum(novelContributions.charCount)));

    // Calculate total novel content for percentage
    const totalResult = await db
      .select({
        total: sum(novelContributions.charCount)
      })
      .from(novelContributions)
      .where(eq(novelContributions.novelId, novelId));

    const total = Number(totalResult[0]?.total || 1);

    return contributors.map((contributor, index) => {
      const contributionAmount = Number(contributor.totalContribution || 0);
      const percentage = (contributionAmount / total) * 100;
      
      // Determine title based on contribution percentage
      let title = "참여자";
      if (percentage >= 40) {
        title = "원작자";
      } else if (percentage >= 20) {
        title = "공동작가";
      } else if (percentage >= 10) {
        title = "주요 기여자";
      } else if (percentage >= 1) {
        title = "기여자";
      }

      return {
        userId: contributor.userId,
        userName: contributor.userName || contributor.userEmail || '익명',
        totalContribution: contributionAmount,
        contributionPercentage: percentage,
        title,
        rank: index + 1
      };
    });
  }

  // Auto-apply proposals with majority vote
  async checkAndApplyProposals(): Promise<void> {
    const expiredProposals = await db
      .select()
      .from(editProposals)
      .where(and(
        eq(editProposals.status, 'pending'),
        sql`${editProposals.expiresAt} <= now()`
      ));

    for (const proposal of expiredProposals) {
      const votes = await this.getVotesByProposal(proposal.id);
      const totalWeight = votes.reduce((sum, vote) => sum + (vote.weight || 1), 0);
      const approveWeight = votes.filter(v => v.voteType === 'approve').reduce((sum, vote) => sum + (vote.weight || 1), 0);
      
      if (totalWeight > 0) {
        const approvalRate = approveWeight / totalWeight;
        
        if (approvalRate >= 0.5) {
          // Apply the proposal based on type
          if (proposal.proposalType === 'modification') {
            await this.updateNovelContent(proposal.novelId, proposal.proposedText);
          } else if (proposal.proposalType === 'worldSetting') {
            await this.updateNovelWorldSetting(proposal.novelId, proposal.proposedText);
          } else if (proposal.proposalType === 'rules') {
            await this.updateNovelRules(proposal.novelId, proposal.proposedText);
          }
          
          await this.updateProposalStatus(proposal.id, 'approved');
          
          // Add contribution record for the proposer
          const charCount = proposal.proposedText.length;
          const contributionType = proposal.proposalType === 'modification' ? 'story' : proposal.proposalType;
          await this.addNovelContribution(proposal.novelId, proposal.proposerId, charCount, contributionType);
          
          // Mark other pending proposals of the same type as needing review
          await this.markProposalsForReview(proposal.novelId, proposal.proposalType, proposal.id);
        } else {
          await this.updateProposalStatus(proposal.id, 'rejected');
        }
      } else {
        await this.updateProposalStatus(proposal.id, 'expired');
      }
    }
  }

  // Weekly leaderboard operations
  async getWeeklyLeaderboard(): Promise<any> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // This week's Monday
    weekStart.setHours(0, 0, 0, 0);

    // 1. 가장 많이 반영된 소설 랭킹
    const approvedSuggestions = await db
      .select({
        id: novels.id,
        title: novels.title,
        value: count(editProposals.id).as('approved_count')
      })
      .from(novels)
      .leftJoin(editProposals, and(
        eq(editProposals.novelId, novels.id),
        eq(editProposals.status, 'approved'),
        gte(editProposals.createdAt, weekStart)
      ))
      .groupBy(novels.id, novels.title)
      .orderBy(desc(count(editProposals.id)))
      .limit(10);

    // 2. 소설 조회수 랭킹
    const novelViewsRanking = await db
      .select({
        id: novels.id,
        title: novels.title,
        value: count(novelViews.id).as('view_count')
      })
      .from(novels)
      .leftJoin(novelViews, and(
        eq(novelViews.novelId, novels.id),
        gte(novelViews.viewedAt, weekStart)
      ))
      .groupBy(novels.id, novels.title)
      .orderBy(desc(count(novelViews.id)))
      .limit(10);

    // 3. 제안 조회수 랭킹
    const suggestionViewsRanking = await db
      .select({
        id: editProposals.id,
        title: sql`concat(${novels.title}, ' - 제안')`.as('proposal_title'),
        value: count(proposalViews.id).as('view_count')
      })
      .from(editProposals)
      .leftJoin(novels, eq(editProposals.novelId, novels.id))
      .leftJoin(proposalViews, and(
        eq(proposalViews.proposalId, editProposals.id),
        gte(proposalViews.viewedAt, weekStart)
      ))
      .where(gte(editProposals.createdAt, weekStart))
      .groupBy(editProposals.id, novels.title)
      .orderBy(desc(count(proposalViews.id)))
      .limit(10);

    // 4. 승인률 랭킹 (최소 3개 제안)
    const approvalRatesRanking = await db
      .select({
        id: users.id,
        title: sql`coalesce(${users.firstName}, ${users.email}, '익명')`.as('user_name'),
        value: sql`cast(round(cast((sum(case when ${editProposals.status} = 'approved' then 1 else 0 end)::float / count(${editProposals.id}) * 100) as numeric), 1) as float)`.as('approval_rate'),
        percentage: sql`cast(round(cast((sum(case when ${editProposals.status} = 'approved' then 1 else 0 end)::float / count(${editProposals.id}) * 100) as numeric), 1) as float)`.as('approval_percentage')
      })
      .from(users)
      .leftJoin(editProposals, and(
        eq(editProposals.proposerId, users.id),
        gte(editProposals.createdAt, weekStart)
      ))
      .groupBy(users.id, users.firstName, users.email)
      .having(sql`count(${editProposals.id}) >= 3`)
      .orderBy(desc(sql`cast(round(cast((sum(case when ${editProposals.status} = 'approved' then 1 else 0 end)::float / count(${editProposals.id}) * 100) as numeric), 1) as float)`))
      .limit(10);

    // Format results with rank
    const formatWithRank = (data: any[]) => 
      data.map((item, index) => ({
        ...item,
        rank: index + 1,
        value: Number(item.value || 0)
      }));

    return {
      approvedSuggestions: formatWithRank(approvedSuggestions),
      novelViews: formatWithRank(novelViewsRanking),
      suggestionViews: formatWithRank(suggestionViewsRanking),
      approvalRates: formatWithRank(approvalRatesRanking)
    };
  }

  // Track novel views
  async trackNovelView(novelId: string, userId?: string, ipAddress?: string): Promise<void> {
    await db.insert(novelViews).values({
      novelId,
      userId,
      ipAddress
    });
  }

  // Track proposal views
  async trackProposalView(proposalId: string, userId?: string, ipAddress?: string): Promise<void> {
    await db.insert(proposalViews).values({
      proposalId,
      userId,
      ipAddress
    });
  }

  // Mark proposals for review when original content changes
  async markProposalsForReview(novelId: string, proposalType: string, approvedProposalId: string): Promise<void> {
    await db
      .update(editProposals)
      .set({ status: 'needs_review' })
      .where(
        and(
          eq(editProposals.novelId, novelId),
          eq(editProposals.proposalType, proposalType),
          eq(editProposals.status, 'pending'),
          ne(editProposals.id, approvedProposalId)
        )
      );
  }

  // Get user's proposals with novel information
  async getUserProposals(userId: string): Promise<any[]> {
    const proposals = await db
      .select({
        id: editProposals.id,
        title: editProposals.title,
        proposalType: editProposals.proposalType,
        status: editProposals.status,
        reason: editProposals.reason,
        createdAt: editProposals.createdAt,
        expiresAt: editProposals.expiresAt,
        novelId: editProposals.novelId,
        novelTitle: novels.title,
        approveCount: sql`count(case when ${proposalVotes.voteType} = 'approve' then 1 end)`.as('approveCount'),
        rejectCount: sql`count(case when ${proposalVotes.voteType} = 'reject' then 1 end)`.as('rejectCount')
      })
      .from(editProposals)
      .leftJoin(novels, eq(editProposals.novelId, novels.id))
      .leftJoin(proposalVotes, eq(proposalVotes.proposalId, editProposals.id))
      .where(eq(editProposals.proposerId, userId))
      .groupBy(
        editProposals.id,
        editProposals.title,
        editProposals.proposalType,
        editProposals.status,
        editProposals.reason,
        editProposals.createdAt,
        editProposals.expiresAt,
        editProposals.novelId,
        novels.title
      )
      .orderBy(desc(editProposals.createdAt));

    return proposals.map(proposal => ({
      ...proposal,
      approveCount: Number(proposal.approveCount),
      rejectCount: Number(proposal.rejectCount)
    }));
  }

  // Delete proposal (only by the proposer, only if not approved)
  async deleteProposal(proposalId: string, userId: string): Promise<boolean> {
    const proposal = await db
      .select()
      .from(editProposals)
      .where(eq(editProposals.id, proposalId));
    
    if (!proposal[0]) {
      return false;
    }
    
    // Check if user is the proposer and proposal is not approved
    if (proposal[0].proposerId !== userId || proposal[0].status === 'approved') {
      return false;
    }
    
    // Delete associated votes and comments first
    await db.delete(proposalVotes).where(eq(proposalVotes.proposalId, proposalId));
    await db.delete(proposalComments).where(eq(proposalComments.proposalId, proposalId));
    await db.delete(proposalViews).where(eq(proposalViews.proposalId, proposalId));
    
    // Delete the proposal
    await db.delete(editProposals).where(eq(editProposals.id, proposalId));
    
    return true;
  }
}

export const storage = new DatabaseStorage();
