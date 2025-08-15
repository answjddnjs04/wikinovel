import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  contributionScore: integer("contribution_score").default(0),
  title: varchar("title").default("참여자"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Novels table
export const novels = pgTable("novels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  genre: varchar("genre").notNull(),
  content: text("content").default(""), // 전체 소설 내용
  worldSetting: text("world_setting"), // 세계관 설정
  rules: text("rules"), // 소설 규칙
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 소설 수정 제안 (전체 텍스트 기반)
export const editProposals = pgTable("edit_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  novelId: varchar("novel_id").references(() => novels.id).notNull(),
  proposerId: varchar("proposer_id").references(() => users.id).notNull(),
  proposalType: varchar("proposal_type").notNull(), // 'addition', 'modification', 'worldSetting', 'rules'
  originalText: text("original_text"), // 수정할 기존 텍스트 (추가의 경우 null)
  proposedText: text("proposed_text").notNull(), // 제안하는 새 텍스트
  insertPosition: integer("insert_position"), // 텍스트 삽입 위치 (추가의 경우)
  reason: text("reason"),
  status: varchar("status").default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// 소설 기여도 추적
export const novelContributions = pgTable("novel_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  novelId: varchar("novel_id").references(() => novels.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  charCount: integer("char_count").notNull(),
  contributionType: varchar("contribution_type").notNull(), // 'story', 'worldSetting', 'rules'
  createdAt: timestamp("created_at").defaultNow(),
});

// Novel-specific user titles (소설별 칭호)
export const novelUserTitles = pgTable("novel_user_titles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  novelId: varchar("novel_id").references(() => novels.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  contributionPercentage: integer("contribution_percentage").notNull(),
  totalCharContribution: integer("total_char_contribution").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 제안에 대한 투표
export const proposalVotes = pgTable("proposal_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").references(() => editProposals.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  voteType: varchar("vote_type").notNull(), // approve, reject
  weight: integer("weight").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  novelContributions: many(novelContributions),
  editProposals: many(editProposals),
  proposalVotes: many(proposalVotes),
}));

export const novelsRelations = relations(novels, ({ many }) => ({
  contributions: many(novelContributions),
  editProposals: many(editProposals),
}));

export const novelContributionsRelations = relations(novelContributions, ({ one }) => ({
  novel: one(novels, {
    fields: [novelContributions.novelId],
    references: [novels.id],
  }),
  user: one(users, {
    fields: [novelContributions.userId],
    references: [users.id],
  }),
}));

export const editProposalsRelations = relations(editProposals, ({ one, many }) => ({
  novel: one(novels, {
    fields: [editProposals.novelId],
    references: [novels.id],
  }),
  proposer: one(users, {
    fields: [editProposals.proposerId],
    references: [users.id],
  }),
  votes: many(proposalVotes),
}));

export const proposalVotesRelations = relations(proposalVotes, ({ one }) => ({
  proposal: one(editProposals, {
    fields: [proposalVotes.proposalId],
    references: [editProposals.id],
  }),
  user: one(users, {
    fields: [proposalVotes.userId],
    references: [users.id],
  }),
}));

export const novelUserTitlesRelations = relations(novelUserTitles, ({ one }) => ({
  novel: one(novels, {
    fields: [novelUserTitles.novelId],
    references: [novels.id],
  }),
  user: one(users, {
    fields: [novelUserTitles.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNovelSchema = createInsertSchema(novels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEditProposalSchema = createInsertSchema(editProposals).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertProposalVoteSchema = createInsertSchema(proposalVotes).omit({
  id: true,
  createdAt: true,
});

export const insertNovelContributionSchema = createInsertSchema(novelContributions).omit({
  id: true,
  createdAt: true,
});

export const insertNovelUserTitleSchema = createInsertSchema(novelUserTitles).omit({
  id: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Novel = typeof novels.$inferSelect;
export type InsertNovel = z.infer<typeof insertNovelSchema>;
export type NovelContribution = typeof novelContributions.$inferSelect;
export type InsertNovelContribution = z.infer<typeof insertNovelContributionSchema>;
export type EditProposal = typeof editProposals.$inferSelect;
export type InsertEditProposal = z.infer<typeof insertEditProposalSchema>;
export type ProposalVote = typeof proposalVotes.$inferSelect;
export type InsertProposalVote = z.infer<typeof insertProposalVoteSchema>;
export type NovelUserTitle = typeof novelUserTitles.$inferSelect;
export type InsertNovelUserTitle = z.infer<typeof insertNovelUserTitleSchema>;
