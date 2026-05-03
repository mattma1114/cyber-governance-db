import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 专题分类
export const topics = mysqlTable("topics", {
  id: varchar("id", { length: 64 }).primaryKey(),
  label: varchar("label", { length: 128 }).notNull(),
  labelEn: varchar("labelEn", { length: 128 }),
  desc: text("desc"),
  color: varchar("color", { length: 64 }),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Topic = typeof topics.$inferSelect;

// 司法辖区
export const jurisdictions = mysqlTable("jurisdictions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  label: varchar("label", { length: 128 }).notNull(),
  labelEn: varchar("labelEn", { length: 128 }),
  flag: varchar("flag", { length: 16 }),
  color: varchar("color", { length: 64 }),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Jurisdiction = typeof jurisdictions.$inferSelect;

// 案例条目（司法案例/监管案例/法律法规）
export const cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["judicial", "regulatory", "legislation"]).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  titleEn: varchar("titleEn", { length: 512 }),
  topicId: varchar("topicId", { length: 64 }).notNull(),
  jurisdictionId: varchar("jurisdictionId", { length: 64 }).notNull(),
  date: varchar("date", { length: 32 }).notNull(),
  source: varchar("source", { length: 256 }),
  sourceUrl: text("sourceUrl"),
  abstract: text("abstract"),
  aiSummary: text("aiSummary"),
  aiAnalysis: text("aiAnalysis"),
  tags: json("tags").$type<string[]>().default([]),
  language: varchar("language", { length: 8 }).default("zh"),
  status: mysqlEnum("status", ["published", "draft"]).default("draft").notNull(),
  views: int("views").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

// 平台画像
export const platforms = mysqlTable("platforms", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  company: varchar("company", { length: 256 }),
  jurisdiction: json("jurisdiction").$type<string[]>().default([]),
  founded: int("founded"),
  hq: varchar("hq", { length: 256 }),
  color: varchar("color", { length: 64 }),
  abbr: varchar("abbr", { length: 8 }),
  description: text("description"),
  portrait: json("portrait").$type<{
    types: string[];
    structure: string;
    contentSource: string;
    networkEffect: string;
    businessModel: string[];
    openness: string;
    crossBorder: string;
  }>(),
  rules: json("rules").$type<Array<{
    id: string;
    title: string;
    type: string;
    versions: Array<{
      versionId: string;
      versionLabel: string;
      date: string;
      url?: string;
      content?: string;
    }>;
  }>>().default([]),
  timeline: json("timeline").$type<Array<{
    date: string;
    event: string;
  }>>().default([]),
  relatedCaseIds: json("relatedCaseIds").$type<string[]>().default([]),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Platform = typeof platforms.$inferSelect;
export type InsertPlatform = typeof platforms.$inferInsert;

// API 配置（管理员存储第三方 API Key）
export const apiSettings = mysqlTable("api_settings", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: text("value").notNull(),
  label: varchar("label", { length: 256 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ApiSetting = typeof apiSettings.$inferSelect;
