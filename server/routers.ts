import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { cases, platforms, topics, jurisdictions, apiSettings } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { eq, like, and, desc, asc, sql, or, inArray } from "drizzle-orm";
import { z } from "zod";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Topics ──────────────────────────────────────────────────────────
  topics: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(topics).orderBy(asc(topics.sortOrder));
    }),
    create: adminProcedure
      .input(z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        labelEn: z.string().optional(),
        desc: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(topics).values(input);
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.string(),
        label: z.string().optional(),
        labelEn: z.string().optional(),
        desc: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...rest } = input;
        await db.update(topics).set(rest).where(eq(topics.id, id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(topics).where(eq(topics.id, input.id));
        return { success: true };
      }),
  }),

  // ── Jurisdictions ────────────────────────────────────────────────────
  jurisdictions: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(jurisdictions).orderBy(asc(jurisdictions.sortOrder));
    }),
    create: adminProcedure
      .input(z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        labelEn: z.string().optional(),
        flag: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(jurisdictions).values(input);
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.string(),
        label: z.string().optional(),
        labelEn: z.string().optional(),
        flag: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...rest } = input;
        await db.update(jurisdictions).set(rest).where(eq(jurisdictions.id, id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(jurisdictions).where(eq(jurisdictions.id, input.id));
        return { success: true };
      }),
  }),

  // ── Cases ────────────────────────────────────────────────────────────
  cases: router({
    list: publicProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(12),
        type: z.string().optional(),
        topicId: z.string().optional(),
        jurisdictionId: z.string().optional(),
        keyword: z.string().optional(),
        status: z.string().optional(),
        sortBy: z.enum(["date", "views"]).default("date"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0, page: 1, pageSize: 12 };
        const { page, pageSize, type, topicId, jurisdictionId, keyword, status, sortBy, sortDir } = input;
        const offset = (page - 1) * pageSize;

        const conditions = [];
        // Public only sees published unless admin requests
        if (!status) conditions.push(eq(cases.status, "published"));
        else if (status !== "all") conditions.push(eq(cases.status, status as "published" | "draft"));

        if (type) conditions.push(eq(cases.type, type as "judicial" | "regulatory" | "legislation"));
        if (topicId) conditions.push(eq(cases.topicId, topicId));
        if (jurisdictionId) conditions.push(eq(cases.jurisdictionId, jurisdictionId));
        if (keyword) {
          conditions.push(or(
            like(cases.title, `%${keyword}%`),
            like(cases.abstract, `%${keyword}%`),
            like(cases.aiSummary, `%${keyword}%`),
          ));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const sortCol = sortBy === "views" ? cases.views : cases.createdAt;
        const orderFn = sortDir === "asc" ? asc : desc;
        const [items, countResult] = await Promise.all([
          db.select().from(cases).where(where).orderBy(orderFn(sortCol)).limit(pageSize).offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(cases).where(where),
        ]);

        return {
          items,
          total: Number(countResult[0]?.count ?? 0),
          page,
          pageSize,
        };
      }),

    listAdmin: adminProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        keyword: z.string().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0, page: 1, pageSize: 20 };
        const { page, pageSize, keyword, status } = input;
        const offset = (page - 1) * pageSize;
        const conditions = [];
        if (status && status !== "all") conditions.push(eq(cases.status, status as "published" | "draft"));
        if (keyword) {
          conditions.push(or(
            like(cases.title, `%${keyword}%`),
            like(cases.abstract, `%${keyword}%`),
          ));
        }
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const [items, countResult] = await Promise.all([
          db.select().from(cases).where(where).orderBy(desc(cases.createdAt)).limit(pageSize).offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(cases).where(where),
        ]);
        return { items, total: Number(countResult[0]?.count ?? 0), page, pageSize };
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(cases).where(eq(cases.id, input.id)).limit(1);
        return result[0] ?? null;
      }),

    incrementView: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return;
        await db.update(cases).set({ views: sql`${cases.views} + 1` }).where(eq(cases.id, input.id));
      }),

    stats: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { total: 0, judicial: 0, regulatory: 0, legislation: 0, byTopic: [], byJurisdiction: [] };
      const [total, byType, byTopic, byJurisdiction] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(cases).where(eq(cases.status, "published")),
        db.select({ type: cases.type, count: sql<number>`count(*)` }).from(cases).where(eq(cases.status, "published")).groupBy(cases.type),
        db.select({ topicId: cases.topicId, count: sql<number>`count(*)` }).from(cases).where(eq(cases.status, "published")).groupBy(cases.topicId),
        db.select({ jurisdictionId: cases.jurisdictionId, count: sql<number>`count(*)` }).from(cases).where(eq(cases.status, "published")).groupBy(cases.jurisdictionId),
      ]);
      const typeMap = Object.fromEntries(byType.map(r => [r.type, Number(r.count)]));
      return {
        total: Number(total[0]?.count ?? 0),
        judicial: typeMap.judicial ?? 0,
        regulatory: typeMap.regulatory ?? 0,
        legislation: typeMap.legislation ?? 0,
        byTopic: byTopic.map(r => ({ topicId: r.topicId, count: Number(r.count) })),
        byJurisdiction: byJurisdiction.map(r => ({ jurisdictionId: r.jurisdictionId, count: Number(r.count) })),
      };
    }),

    create: adminProcedure
      .input(z.object({
        type: z.enum(["judicial", "regulatory", "legislation"]),
        title: z.string().min(1),
        titleEn: z.string().optional(),
        topicId: z.string().optional().default(""),
        jurisdictionId: z.string().optional().default(""),
        date: z.string().optional().default(""),
        source: z.string().optional(),
        sourceUrl: z.string().optional(),
        abstract: z.string().optional(),
        aiSummary: z.string().optional(),
        aiAnalysis: z.string().optional(),
        tags: z.array(z.string()).optional(),
        language: z.string().optional(),
        fullText: z.string().optional(),
        status: z.enum(["published", "draft"]).default("draft"),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(cases).values({
          ...input,
          tags: input.tags ?? [],
          views: 0,
        });
        return { success: true, id: Number((result as any).insertId) };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        type: z.enum(["judicial", "regulatory", "legislation"]).optional(),
        title: z.string().optional(),
        titleEn: z.string().optional(),
        topicId: z.string().optional(),
        jurisdictionId: z.string().optional(),
        date: z.string().optional(),
        source: z.string().optional(),
        sourceUrl: z.string().optional(),
        abstract: z.string().optional(),
        aiSummary: z.string().optional(),
        aiAnalysis: z.string().optional(),
        tags: z.array(z.string()).optional(),
        language: z.string().optional(),
        fullText: z.string().optional(),
        status: z.enum(["published", "draft"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...rest } = input;
        await db.update(cases).set(rest).where(eq(cases.id, id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(cases).where(eq(cases.id, input.id));
        return { success: true };
      }),

    togglePublish: adminProcedure
      .input(z.object({ id: z.number(), published: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(cases)
          .set({ status: input.published ? "published" : "draft" })
          .where(eq(cases.id, input.id));
        return { success: true };
      }),
  }),

  // ── Platforms ────────────────────────────────────────────────────────
  platforms: router({
    list: publicProcedure
      .input(z.object({
        keyword: z.string().optional(),
        jurisdictionId: z.string().optional(),
        type: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const conditions = [eq(platforms.isActive, true)];
        if (input?.keyword) {
          conditions.push(or(
            like(platforms.name, `%${input.keyword}%`),
            like(platforms.company, `%${input.keyword}%`),
          )!);
        }
        return db.select().from(platforms).where(and(...conditions)).orderBy(asc(platforms.sortOrder));
      }),

    listAdmin: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(platforms).orderBy(asc(platforms.sortOrder));
    }),

    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(platforms).where(eq(platforms.id, input.id)).limit(1);
        return result[0] ?? null;
      }),

    create: adminProcedure
      .input(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        company: z.string().optional(),
        jurisdiction: z.array(z.string()).optional(),
        founded: z.number().optional(),
        hq: z.string().optional(),
        color: z.string().optional(),
        abbr: z.string().optional(),
        description: z.string().optional(),
        portrait: z.any().optional(),
        rules: z.any().optional(),
        timeline: z.any().optional(),
        relatedCaseIds: z.array(z.string()).optional(),
        website: z.string().optional(),
        wikipediaUrl: z.string().optional(),
        crunchbaseUrl: z.string().optional(),
        profileFeatures: z.string().optional(),
        developmentHistory: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(platforms).values({ ...input, isActive: true });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        company: z.string().optional(),
        jurisdiction: z.array(z.string()).optional(),
        founded: z.number().optional(),
        hq: z.string().optional(),
        color: z.string().optional(),
        abbr: z.string().optional(),
        description: z.string().optional(),
        portrait: z.any().optional(),
        rules: z.any().optional(),
        timeline: z.any().optional(),
        relatedCaseIds: z.array(z.string()).optional(),
        website: z.string().optional(),
        wikipediaUrl: z.string().optional(),
        crunchbaseUrl: z.string().optional(),
        profileFeatures: z.string().optional(),
        developmentHistory: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...rest } = input;
        await db.update(platforms).set(rest).where(eq(platforms.id, id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(platforms).where(eq(platforms.id, input.id));
        return { success: true };
      }),
  }),

  // ── Settings (API keys) ──────────────────────────────────────────────
  settings: router({
    getAll: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(apiSettings);
      return rows;
    }),
    upsert: adminProcedure
      .input(z.object({ key: z.string(), value: z.string(), label: z.string().optional() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db
          .insert(apiSettings)
          .values({ key: input.key, value: input.value, label: input.label })
          .onDuplicateKeyUpdate({ set: { value: input.value, label: input.label } });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(apiSettings).where(eq(apiSettings.key, input.key));
        return { success: true };
      }),
  }),

  // ── AI helpers ────────────────────────────────────────────────────────
  ai: router({
    // Extract platform info by keyword (no Firecrawl needed)
    extractPlatformByKeyword: adminProcedure
      .input(z.object({ keyword: z.string() }))
      .mutation(async ({ input }) => {
        const systemPrompt = `You are a research assistant specializing in internet platform governance. Given a platform name or keyword, extract comprehensive information about the platform from your knowledge. Return a JSON object with these fields:
- name: string (official name)
- nameEn: string (English name if different)
- website: string (official website URL)
- wikipediaUrl: string (Wikipedia URL if exists)
- crunchbaseUrl: string (Crunchbase URL if exists)
- description: string (brief description in Chinese, 100-200 chars)
- descriptionEn: string (brief description in English)
- founded: string (founding year or date)
- headquarters: string (headquarters location)
- category: string (platform category: social_media/search/ecommerce/video/messaging/other)
- tags: string[] (relevant tags)
- profileFeatures: string (platform profile features in Chinese, 200-400 chars)
- developmentHistory: string (development history in Chinese, 200-400 chars)
Return ONLY valid JSON, no markdown.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Platform keyword: ${input.keyword}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "platform_info",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  nameEn: { type: "string" },
                  website: { type: "string" },
                  wikipediaUrl: { type: "string" },
                  crunchbaseUrl: { type: "string" },
                  description: { type: "string" },
                  descriptionEn: { type: "string" },
                  founded: { type: "string" },
                  headquarters: { type: "string" },
                  category: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  profileFeatures: { type: "string" },
                  developmentHistory: { type: "string" },
                },
                required: ["name", "nameEn", "website", "wikipediaUrl", "crunchbaseUrl", "description", "descriptionEn", "founded", "headquarters", "category", "tags", "profileFeatures", "developmentHistory"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0].message.content;
        return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      }),

    // Extract case info from URL
    extractCaseFromUrl: adminProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input }) => {
        const systemPrompt = `You are a legal research assistant specializing in internet platform governance cases. Given a URL to a legal case, regulatory enforcement, or legislative document, extract key information. Return a JSON object with:
- title: string (case title in Chinese)
- titleEn: string (case title in English)
- abstract: string (case abstract in Chinese, 200-400 chars)
- type: string (one of: judicial/enforcement/legislation/policy)
- date: string (date in YYYY-MM-DD format)
- jurisdiction: string (jurisdiction name)
- platform: string (platform name involved)
- aiSummary: string (AI analysis summary in Chinese, 300-500 chars)
- aiAnalysis: string (detailed AI analysis in Chinese, 500-800 chars)
Return ONLY valid JSON, no markdown.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Please extract information from this URL: ${input.url}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "case_info",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  titleEn: { type: "string" },
                  abstract: { type: "string" },
                  type: { type: "string" },
                  date: { type: "string" },
                  jurisdiction: { type: "string" },
                  platform: { type: "string" },
                  aiSummary: { type: "string" },
                  aiAnalysis: { type: "string" },
                },
                required: ["title", "titleEn", "abstract", "type", "date", "jurisdiction", "platform", "aiSummary", "aiAnalysis"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0].message.content;
        return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      }),
  }),

  // ── Scheduled endpoint (for future use) ─────────────────────────────
  scheduled: router({
    ping: publicProcedure.query(() => ({ ok: true })),
  }),
});

export type AppRouter = typeof appRouter;
