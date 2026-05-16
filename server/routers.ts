import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb, listUsers, updateUserRole, updateUserStatus, deleteUser, createAdminInvite, listAdminInvites, getAdminInviteByToken, consumeAdminInvite, revokeAdminInvite } from "./db";
import { randomBytes } from "crypto";
import { cases, platforms, topics, jurisdictions, apiSettings, caseAttachments, siteSettings, users, adminInvites, platformRules, ruleAttachments } from "../drizzle/schema";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";
import { routeLlm, routeLlmForTask, parseLlmConfig, LLM_TASKS, testLlmConfig, DEFAULT_MODELS } from "./llm-router";
import { extractTextFromPdf } from "./pdf-extractor";
import { generateCasePdf, generateBatchPdfZip } from "./pdf";
import { generateCaseDocx } from "./case-docx";
import { generatePlatformPdf, generatePlatformDocx } from "./platform-pdf";
import { scrapeUrl, testFirecrawlKey, testJinaKey, testScrapingBeeKey } from "./scraper";
import { eq, like, and, desc, asc, sql, or, inArray, isNotNull, isNull } from "drizzle-orm";
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
    // Admin password login
    adminLogin: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Find user by username (stored as openId with prefix 'admin:')
        const [user] = await db.select().from(users)
          .where(eq(users.openId, `admin:${input.username}`))
          .limit(1);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
        }
        if (user.role !== 'admin') {
          throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员账号可使用此方式登录" });
        }
        if (user.status === 'frozen') {
          throw new TRPCError({ code: "FORBIDDEN", message: "账号已被冻结，请联系管理员" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
        }
        // Create session cookie
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? input.username });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user: { id: user.id, name: user.name, role: user.role } };
      }),
    // Set/change admin password (admin only, or self)
    setAdminPassword: protectedProcedure
      .input(z.object({
        username: z.string().min(1).optional(),
        newPassword: z.string().min(8, "密码至少8位"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const targetUsername = input.username ?? ctx.user.openId.replace('admin:', '');
        const openId = `admin:${targetUsername}`;
        const hash = await bcrypt.hash(input.newPassword, 12);
        // Upsert admin user
        const [existing] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
        if (existing) {
          await db.update(users).set({ passwordHash: hash }).where(eq(users.openId, openId));
        } else {
          await db.insert(users).values({
            openId,
            name: targetUsername,
            role: 'admin',
            status: 'active',
            loginMethod: 'password',
            passwordHash: hash,
            lastSignedIn: new Date(),
          });
        }
        return { success: true };
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
        // Exclude full_text (large field) from list queries to reduce network transfer
        const selectFields = {
          id: cases.id,
          type: cases.type,
          title: cases.title,
          titleEn: cases.titleEn,
          topicId: cases.topicId,
          jurisdictionId: cases.jurisdictionId,
          date: cases.date,
          source: cases.source,
          sourceUrl: cases.sourceUrl,
          abstract: cases.abstract,
          aiSummary: cases.aiSummary,
          aiAnalysis: cases.aiAnalysis,
          tags: cases.tags,
          language: cases.language,
          status: cases.status,
          views: cases.views,
          createdAt: cases.createdAt,
          updatedAt: cases.updatedAt,
        };
        const [items, countResult] = await Promise.all([
          db.select(selectFields).from(cases).where(where).orderBy(orderFn(sortCol)).limit(pageSize).offset(offset),
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
        // Exclude full_text from admin list queries, but include hasFullText flag
        const selectFields = {
          id: cases.id,
          type: cases.type,
          title: cases.title,
          titleEn: cases.titleEn,
          topicId: cases.topicId,
          jurisdictionId: cases.jurisdictionId,
          date: cases.date,
          source: cases.source,
          sourceUrl: cases.sourceUrl,
          abstract: cases.abstract,
          aiSummary: cases.aiSummary,
          aiAnalysis: cases.aiAnalysis,
          tags: cases.tags,
          language: cases.language,
          status: cases.status,
          views: cases.views,
          createdAt: cases.createdAt,
          updatedAt: cases.updatedAt,
          // Lightweight flag instead of returning the full text content
          hasFullText: sql<number>`CASE WHEN ${cases.fullText} IS NOT NULL AND ${cases.fullText} != '' THEN 1 ELSE 0 END`,
          // Flag: has PDF uploaded but no fullText yet (pending AI parse)
          hasPdf: sql<number>`CASE WHEN ${cases.fullTextPdfUrl} IS NOT NULL AND ${cases.fullTextPdfUrl} != '' THEN 1 ELSE 0 END`,
          pendingPdfParse: sql<number>`CASE WHEN ${cases.fullTextPdfUrl} IS NOT NULL AND ${cases.fullTextPdfUrl} != '' AND (${cases.fullText} IS NULL OR ${cases.fullText} = '') THEN 1 ELSE 0 END`,
        };
        const [items, countResult] = await Promise.all([
          db.select(selectFields).from(cases).where(where).orderBy(desc(cases.createdAt)).limit(pageSize).offset(offset),
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
        // Fire-and-forget: don't block the response waiting for the DB update
        getDb().then((db) => {
          if (!db) return;
          db.update(cases)
            .set({ views: sql`${cases.views} + 1` })
            .where(eq(cases.id, input.id))
            .catch((err) => {
              console.warn(`[incrementView] Failed to update views for case ${input.id}:`, err?.message ?? err);
            });
        }).catch((err) => {
          console.warn(`[incrementView] Failed to get DB:`, err?.message ?? err);
        });
        return { success: true };
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
        // Drizzle MySQL2 returns [ResultSetHeader, FieldPacket[]] for insert
        const resultHeader = Array.isArray(result) ? result[0] : result;
        return { success: true, id: Number((resultHeader as any).insertId) };
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

    // Update status of a single case (published / draft / unpublished)
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["published", "draft", "unpublished"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(cases).set({ status: input.status }).where(eq(cases.id, input.id));
        return { success: true };
      }),

    // Batch update status for multiple cases
    batchUpdateStatus: adminProcedure
      .input(z.object({
        ids: z.array(z.number()).min(1).max(100),
        status: z.enum(["published", "draft", "unpublished"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(cases).set({ status: input.status }).where(inArray(cases.id, input.ids));
        return { success: true, count: input.ids.length };
      }),

    // Batch delete multiple cases
    batchDelete: adminProcedure
      .input(z.object({
        ids: z.array(z.number()).min(1).max(100),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Also delete associated attachments
        await db.delete(caseAttachments).where(inArray(caseAttachments.caseId, input.ids));
        await db.delete(cases).where(inArray(cases.id, input.ids));
        return { success: true, count: input.ids.length };
      }),

    exportPdf: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Fetch case
        const result = await db.select().from(cases).where(eq(cases.id, input.id)).limit(1);
        const c = result[0];
        if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "内容不存在" });

        // Fetch topic and jurisdiction labels
        const [topicsData, jurisdictionsData] = await Promise.all([
          db.select().from(topics),
          db.select().from(jurisdictions),
        ]);
        const topic = topicsData.find((t) => t.id === c.topicId);
        const juris = jurisdictionsData.find((j) => j.id === c.jurisdictionId);

        const tags: string[] = Array.isArray(c.tags)
          ? (c.tags as string[])
          : c.tags
          ? JSON.parse(c.tags as string)
          : [];

        const pdfBuffer = await generateCasePdf({
          title: c.title,
          titleEn: c.titleEn,
          type: c.type,
          date: c.date,
          source: c.source,
          sourceUrl: c.sourceUrl,
          abstract: c.abstract,
          aiSummary: c.aiSummary,
          aiAnalysis: c.aiAnalysis,
          fullText: c.fullText,
          topicLabel: topic?.label ?? null,
          jurisdictionLabel: juris?.label ?? null,
          jurisdictionFlag: juris?.flag ?? null,
          tags,
        });

        // Return as base64 so tRPC can serialize it
        return {
          base64: pdfBuffer.toString("base64"),
          filename: `${c.title.slice(0, 50).replace(/[/\\?%*:|"<>]/g, "-")}.pdf`,
        };
      }),

    exportBatchPdf: publicProcedure
      .input(z.object({ ids: z.array(z.number()).min(1).max(20) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Fetch all requested cases
        const rows = await db.select().from(cases).where(inArray(cases.id, input.ids));
        if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "未找到内容" });

        // Fetch topic and jurisdiction lookup tables
        const [topicsData, jurisdictionsData] = await Promise.all([
          db.select().from(topics),
          db.select().from(jurisdictions),
        ]);

        const items = rows.map((c) => {
          const topic = topicsData.find((t) => t.id === c.topicId);
          const juris = jurisdictionsData.find((j) => j.id === c.jurisdictionId);
          const tags: string[] = Array.isArray(c.tags)
            ? (c.tags as string[])
            : c.tags ? JSON.parse(c.tags as string) : [];
          const safeTitle = c.title.slice(0, 50).replace(/[/\\?%*:|"<>]/g, "-");
          return {
            title: c.title,
            titleEn: c.titleEn,
            type: c.type,
            date: c.date,
            source: c.source,
            sourceUrl: c.sourceUrl,
            abstract: c.abstract,
            aiSummary: c.aiSummary,
            aiAnalysis: c.aiAnalysis,
            fullText: c.fullText,
            topicLabel: topic?.label ?? null,
            jurisdictionLabel: juris?.label ?? null,
            jurisdictionFlag: juris?.flag ?? null,
            tags,
            filename: `${safeTitle}.pdf`,
          };
        });

        const zipBuffer = await generateBatchPdfZip(items);
        const now = new Date().toISOString().slice(0, 10);
        return {
          base64: zipBuffer.toString("base64"),
          filename: `互联网平台治理数据库_批量报告_${now}.zip`,
        };
       }),

    // ── Export single case as Word docx ──────────────────────────────────────────────────────────────────
    exportDocx: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.select().from(cases).where(eq(cases.id, input.id)).limit(1);
        const c = result[0];
        if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "内容不存在" });
        const [topicsData, jurisdictionsData] = await Promise.all([
          db.select().from(topics),
          db.select().from(jurisdictions),
        ]);
        const topic = topicsData.find((t) => t.id === c.topicId);
        const juris = jurisdictionsData.find((j) => j.id === c.jurisdictionId);
        const tags: string[] = Array.isArray(c.tags) ? (c.tags as string[]) : c.tags ? JSON.parse(c.tags as string) : [];
        const docxBuffer = await generateCaseDocx({
          title: c.title,
          titleEn: c.titleEn,
          type: c.type,
          date: c.date,
          source: c.source,
          sourceUrl: c.sourceUrl,
          abstract: c.abstract,
          aiSummary: c.aiSummary,
          aiAnalysis: c.aiAnalysis,
          fullText: c.fullText,
          topicLabel: topic?.label ?? null,
          jurisdictionLabel: juris?.label ?? null,
          jurisdictionFlag: juris?.flag ?? null,
          tags,
        });
        return {
          base64: docxBuffer.toString("base64"),
          filename: `${c.title.slice(0, 50).replace(/[\/\\?%*:|"<>]/g, "-")}.docx`,
        };
      }),

    // ── Upload full-text PDF (S3) ─────────────────────────────────────────
    uploadFullTextPdf: adminProcedure
      .input(z.object({
        caseId: z.number(),
        filename: z.string().max(512),
        dataBase64: z.string(), // base64 encoded PDF content
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });
        const buffer = Buffer.from(input.dataBase64, "base64");
        const ext = input.filename.split('.').pop()?.toLowerCase() ?? 'pdf';
        const safeExt = /^[a-z0-9]+$/.test(ext) ? `.${ext}` : '.pdf';
        const uuid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const safeFilename = `${uuid}${safeExt}`;
        const fileKey = `full-text-pdf/${input.caseId}/${safeFilename}`;
        const { key, url } = await storagePut(fileKey, buffer, "application/pdf");
        await db.update(cases).set({
          fullTextPdfUrl: url,
          fullTextPdfKey: key,
        }).where(eq(cases.id, input.caseId));
        return { success: true, url, key, filename: input.filename };
      }),

    // ── Delete full-text PDF ──────────────────────────────────────────────
    deleteFullTextPdf: adminProcedure
      .input(z.object({ caseId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });
        await db.update(cases).set({
          fullTextPdfUrl: null,
          fullTextPdfKey: null,
        }).where(eq(cases.id, input.caseId));
        return { success: true };
      }),

    // ── Parse PDF full text via AI ──────────────────────────────────────────────────
    parsePdfFullText: adminProcedure
      .input(z.object({ caseId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });

        // 1. Load case to get PDF URL
        const rows = await db.select({
          id: cases.id,
          fullTextPdfUrl: cases.fullTextPdfUrl,
          fullTextPdfKey: cases.fullTextPdfKey,
          title: cases.title,
        }).from(cases).where(eq(cases.id, input.caseId)).limit(1);

        const caseRow = rows[0];
        if (!caseRow) throw new TRPCError({ code: "NOT_FOUND", message: "内容不存在" });
        if (!caseRow.fullTextPdfUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "该内容未上传 PDF原文" });

        // 2. Download PDF from storage
        const pdfUrl = caseRow.fullTextPdfUrl.startsWith("/")
          ? `http://localhost:${process.env.PORT ?? 3000}${caseRow.fullTextPdfUrl}`
          : caseRow.fullTextPdfUrl;

        let pdfBuffer: Buffer;
        try {
          const resp = await fetch(pdfUrl);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const arrayBuf = await resp.arrayBuffer();
          pdfBuffer = Buffer.from(arrayBuf);
        } catch (e: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `PDF 下载失败: ${e.message}` });
        }

        // 3. Extract raw text from PDF
        let rawText: string;
        let numPages: number;
        try {
          const extracted = await extractTextFromPdf(pdfBuffer);
          rawText = extracted.text;
          numPages = extracted.numPages;
        } catch (e: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `PDF 文本提取失败: ${e.message}` });
        }

        if (!rawText || rawText.trim().length < 50) {
          throw new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: "PDF 文本内容过少，可能是扫描件或加密 PDF，无法自动提取" });
        }

        // 4. LLM clean-up: fix OCR artefacts, normalise paragraphs, keep original language
        // Truncate to 30000 chars to stay within LLM context window
        const truncated = rawText.length > 30000 ? rawText.slice(0, 30000) + "\n\n[文本过长，已截断至 30000 字符]" : rawText;

        const llmRows = await db.select().from(apiSettings);

        let cleanedText: string;
        try {
          const llmResp = await routeLlmForTask(llmRows, "PDF_EXTRACT", {
            messages: [
              {
                role: "system",
                content: `你是一个文本整理专家。你的任务是清洗从 PDF 提取的原始文本，严格保留原文的段落结构和排版，输出整理后的完整正文。

核心要求（必须严格遵守）：
1. 【严禁合并段落】绝对不得将不同段落合并为一段。每个自然段落之间必须保留一个空行（即 \n\n）
2. 【严格保留段落分隔】原文中的每一个段落分隔（包括条款、款项、项之间的分隔）必须在输出中保留为空行
3. 修复明显的 OCR 识别错误（如错误的字符替换、断词），但不得改变句子结构
4. 删除页眉、页脚、页码等非正文内容，但保留条款编号、标题等结构性内容
5. 保留原始语言（中文输出中文，英文输出英文，不得翻译）
6. 不得添加任何总结、评论、解释或前言后记
7. 直接输出整理后的正文，段落之间用空行（\n\n）分隔`,
              },
              {
                role: "user",
                content: `请整理以下从 PDF 提取的文本（共 ${numPages} 页）：\n\n${truncated}`,
              },
            ],
          });
          cleanedText = (llmResp.choices?.[0]?.message?.content as string) ?? rawText;
        } catch {
          // LLM failed – fall back to raw extracted text
          cleanedText = rawText;
        }

        // 5. Save to fullText field
        await db.update(cases).set({ fullText: cleanedText }).where(eq(cases.id, input.caseId));

        // Paragraph integrity check
        const paragraphCount = cleanedText
          ? cleanedText.split(/\n{2,}/).filter((p: string) => p.trim().length > 0).length
          : 0;
        const _paragraphWarning = cleanedText.length > 500 && paragraphCount <= 1;

        return {
          success: true,
          numPages,
          charCount: cleanedText.length,
          paragraphCount,
          _paragraphWarning,
          preview: cleanedText.slice(0, 300),
        };
      }),

    // ── Batch parse PDF full text ───────────────────────────────────────────────
    batchParsePdf: adminProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });

        // Find all cases with PDF uploaded but fullText empty/null
        const pending = await db.select({
          id: cases.id,
          title: cases.title,
          fullTextPdfUrl: cases.fullTextPdfUrl,
          fullTextPdfKey: cases.fullTextPdfKey,
        }).from(cases)
          .where(
            and(
              isNotNull(cases.fullTextPdfUrl),
              or(
                isNull(cases.fullText),
                eq(cases.fullText, "")
              )
            )
          )
          .orderBy(asc(cases.id));

        const llmRows = await db.select().from(apiSettings);
        const results: Array<{ id: number; title: string; success: boolean; charCount?: number; error?: string }> = [];

        for (const row of pending) {
          try {
            if (!row.fullTextPdfUrl) {
              results.push({ id: row.id, title: row.title, success: false, error: "无 PDF URL" });
              continue;
            }

            // Download PDF
            const pdfUrl = row.fullTextPdfUrl.startsWith("/")
              ? `http://localhost:${process.env.PORT ?? 3000}${row.fullTextPdfUrl}`
              : row.fullTextPdfUrl;

            const resp = await fetch(pdfUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const arrayBuf = await resp.arrayBuffer();
            const pdfBuffer = Buffer.from(arrayBuf);

            // Extract text
            const extracted = await extractTextFromPdf(pdfBuffer);
            if (!extracted.text || extracted.text.trim().length < 50) {
              results.push({ id: row.id, title: row.title, success: false, error: "文本内容过少（可能是扫描件或加密 PDF）" });
              continue;
            }

            // LLM clean-up
            const truncated = extracted.text.length > 30000
              ? extracted.text.slice(0, 30000) + "\n\n[文本过长，已截断至 30000 字符]"
              : extracted.text;

            let cleanedText: string;
            try {
              const llmResp = await routeLlmForTask(llmRows, "PDF_EXTRACT", {
                messages: [
                  {
                    role: "system",
                    content: `你是一个文本整理专家。你的任务是清洗从 PDF 提取的原始文本，严格保留原文的段落结构和排版，输出整理后的完整正文。

核心要求（必须严格遵守）：
1. 【严禁合并段落】绝对不得将不同段落合并为一段。每个自然段落之间必须保留一个空行（即 \n\n）
2. 【严格保留段落分隔】原文中的每一个段落分隔（包括条款、款项、项之间的分隔）必须在输出中保留为空行
3. 修复明显的 OCR 识别错误（如错误的字符替换、断词），但不得改变句子结构
4. 删除页眉、页脚、页码等非正文内容，但保留条款编号、标题等结构性内容
5. 保留原始语言（中文输出中文，英文输出英文，不得翻译）
6. 不得添加任何总结、评论、解释或前言后记
7. 直接输出整理后的正文，段落之间用空行（\n\n）分隔`,
                  },
                  {
                    role: "user",
                    content: `请整理以下从 PDF 提取的文本（共 ${extracted.numPages} 页）：\n\n${truncated}`,
                  },
                ],
              });
              cleanedText = (llmResp.choices?.[0]?.message?.content as string) ?? extracted.text;
            } catch {
              cleanedText = extracted.text;
            }

            await db.update(cases).set({ fullText: cleanedText }).where(eq(cases.id, row.id));
            results.push({ id: row.id, title: row.title, success: true, charCount: cleanedText.length });
          } catch (e: any) {
            results.push({ id: row.id, title: row.title, success: false, error: e.message ?? "未知错误" });
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        return { total: pending.length, successCount, failCount, results };
      }),

    // ── Check duplicate (title similarity + sourceUrl exact match) ─────────────────────────────────
    checkDuplicate: adminProcedure
      .input(z.object({
        title: z.string().optional(),
        sourceUrl: z.string().optional(),
        excludeId: z.number().optional(), // exclude current case when editing
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        if (!input.title && !input.sourceUrl) return [];

        // ── Step 1: Keyword coarse filter ─────────────────────────────────
        const conditions: any[] = [];
        if (input.sourceUrl && input.sourceUrl.trim().length > 0) {
          conditions.push(like(cases.sourceUrl, `%${input.sourceUrl.trim()}%`));
        }
        if (input.title && input.title.trim().length >= 2) {
          const titleTrimmed = input.title.trim();
          // Multi-keyword strategy: use first 6 chars, middle segment, and last 6 chars
          // to maximise recall for titles with different phrasing
          const len = titleTrimmed.length;
          const kw1 = titleTrimmed.slice(0, Math.min(6, len));
          conditions.push(like(cases.title, `%${kw1}%`));
          if (len > 12) {
            const mid = Math.floor(len / 2);
            const kw2 = titleTrimmed.slice(mid - 3, mid + 3);
            if (kw2.trim().length >= 2) conditions.push(like(cases.title, `%${kw2}%`));
          }
          if (len > 8) {
            const kw3 = titleTrimmed.slice(Math.max(0, len - 6));
            if (kw3.trim().length >= 2) conditions.push(like(cases.title, `%${kw3}%`));
          }
        }
        if (conditions.length === 0) return [];

        const rawRows = await db.select({
          id: cases.id,
          title: cases.title,
          status: cases.status,
          date: cases.date,
          sourceUrl: cases.sourceUrl,
          createdAt: cases.createdAt,
        }).from(cases)
          .where(or(...conditions))
          .orderBy(desc(cases.createdAt))
          .limit(15);

        // Exclude current case when editing
        const candidates = input.excludeId
          ? rawRows.filter(r => r.id !== input.excludeId)
          : rawRows;

        if (candidates.length === 0) return [];

        // ── Step 2: LLM semantic similarity scoring ───────────────────────
        // Only run LLM if we have a title to compare
        if (!input.title || input.title.trim().length < 2) {
          return candidates.slice(0, 5).map(r => ({
            ...r,
            similarityScore: null as number | null,
            reason: null as string | null,
          }));
        }

        try {
          const llmRows = await db.select().from(apiSettings);
          const candidateList = candidates.slice(0, 10).map((r, i) => `${i + 1}. [ID:${r.id}] ${r.title}`).join("\n");

          const llmResp = await routeLlmForTask(llmRows, "DUP_CHECK", {
            messages: [
              {
                role: "system",
                content: `你是一个内容去重专家。给定一个查询标题，判断候选列表中每条标题与查询标题的语义相似度。
相似度评分标准（0-100）：
- 90-100：几乎完全相同，只有细微措辞差异
- 70-89：高度相似，描述同一事件/文件但表述不同
- 50-69：中度相似，主题相关但可能是不同事件
- 0-49：低相似度，基本不重复

请以 JSON 数组格式返回，每项包含：id（候选ID）、score（0-100整数）、reason（一句话判断理由，20字以内）。
只返回 score >= 50 的结果。如果没有相似的，返回空数组 []。
直接输出 JSON，不要加任何说明。`,
              },
              {
                role: "user",
                content: `查询标题：「${input.title.trim()}」\n\n候选列表：\n${candidateList}`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "dup_check_result",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          score: { type: "integer" },
                          reason: { type: "string" },
                        },
                        required: ["id", "score", "reason"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["results"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = llmResp.choices?.[0]?.message?.content as string;
          let llmResults: Array<{ id: number; score: number; reason: string }> = [];
          try {
            const parsed = JSON.parse(content);
            llmResults = Array.isArray(parsed) ? parsed : (parsed.results ?? []);
          } catch { /* fall through to raw results */ }

          // Read threshold from siteSettings (default 60)
          const settingsRows = await db.select().from(siteSettings);
          const thresholdStr = settingsRows.find(r => r.key === "dupCheckThreshold")?.value;
          const threshold = thresholdStr ? parseInt(thresholdStr, 10) : 60;

          // Merge LLM scores back into candidate rows
          const scoreMap = new Map(llmResults.map(r => [r.id, r]));
          const scored = candidates
            .map(r => ({
              ...r,
              similarityScore: scoreMap.get(r.id)?.score ?? null as number | null,
              reason: scoreMap.get(r.id)?.reason ?? null as string | null,
            }))
            .filter(r => r.similarityScore === null || r.similarityScore >= threshold)
            .sort((a, b) => (b.similarityScore ?? 0) - (a.similarityScore ?? 0))
            .slice(0, 5);

          return scored;
        } catch {
          // LLM failed – return raw keyword matches without scores
          return candidates.slice(0, 5).map(r => ({
            ...r,
            similarityScore: null as number | null,
            reason: null as string | null,
          }));
        }
      }),

    // ── Refetch fullText for existing cases ───────────────────────────────
    refetchFullText: adminProcedure
      .input(z.object({
        ids: z.array(z.number()).min(1).max(50),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Load API settings for scraper (key-value store)
        const settingsRows = await db.select().from(apiSettings);
        const getKey = (key: string) => settingsRows.find((r) => r.key === key)?.value ?? undefined;
        const scrapeOpts = {
          firecrawlKey: getKey("FIRECRAWL_API_KEY"),
          jinaKey: getKey("JINA_API_KEY"),
          scrapingbeeKey: getKey("SCRAPINGBEE_API_KEY"),
        };

        // Fetch target cases
        const rows = await db.select().from(cases).where(inArray(cases.id, input.ids));
        const results: { id: number; success: boolean; error?: string }[] = [];

        for (const c of rows) {
          if (!c.sourceUrl) {
            results.push({ id: c.id, success: false, error: "无原文链接" });
            continue;
          }
          try {
            const scraped = await scrapeUrl(c.sourceUrl, scrapeOpts);
            const fullText = scraped.markdown.slice(0, 15000);
            await db.update(cases).set({ fullText }).where(eq(cases.id, c.id));
            results.push({ id: c.id, success: true });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push({ id: c.id, success: false, error: msg });
          }
        }

        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        return { results, succeeded, failed };
      }),
  }),

  // ── Attachments ──────────────────────────────────────────────────────
  attachments: router({
    // 获取某内容的所有附件
    listByCaseId: publicProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(caseAttachments)
          .where(eq(caseAttachments.caseId, input.caseId))
          .orderBy(asc(caseAttachments.createdAt));
      }),

    // 上传附件（base64 编码，管理员专用）
    upload: adminProcedure
      .input(z.object({
        caseId: z.number(),
        filename: z.string().max(512),
        mimeType: z.string().max(128),
        fileSize: z.number().optional(),
        dataBase64: z.string(), // base64 encoded file content
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });
        // 将 base64 解码为 Buffer
        const buffer = Buffer.from(input.dataBase64, "base64");
        // 上传到 S3: 文件名只保留 ASCII 安全字符，中文等 unicode 字符用 UUID 替代
        // S3/CloudFront 签名 URL 要求路径只含 ASCII 字符
        const ext = input.filename.split('.').pop()?.toLowerCase() ?? '';
        const safeExt = /^[a-z0-9]+$/.test(ext) ? `.${ext}` : '';
        const uuid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const safeFilename = `${uuid}${safeExt}`;
        const fileKey = `attachments/${input.caseId}/${safeFilename}`;
        const { key, url } = await storagePut(fileKey, buffer, input.mimeType);
        // 写入数据库
        const result = await db.insert(caseAttachments).values({
          caseId: input.caseId,
          filename: input.filename,
          fileKey: key,
          fileUrl: url,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
        });
        const header = Array.isArray(result) ? result[0] : result;
        const insertId = (header as any).insertId;
        return { id: Number(insertId), filename: input.filename, fileUrl: url, fileKey: key };
      }),

    // 删除附件（管理员专用）
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库未连接" });
        await db.delete(caseAttachments).where(eq(caseAttachments.id, input.id));
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
    // ── Export platform profile as PDF or Word ─────────────────────────
    exportProfile: publicProcedure
      .input(z.object({
        id: z.string(),
        format: z.enum(["pdf", "docx"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rows = await db.select().from(platforms).where(eq(platforms.id, input.id)).limit(1);
        if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "平台不存在" });
        const p = rows[0];
        const jurisData = await db.select().from(jurisdictions);
        const jurisIds: string[] = Array.isArray(p.jurisdiction)
          ? (p.jurisdiction as string[])
          : p.jurisdiction ? JSON.parse(p.jurisdiction as string) : [];
        const jurisLabels = jurisIds
          .map((jid) => jurisData.find((j) => j.id === jid)?.label ?? jid)
          .filter(Boolean);
        const exportData = {
          id: p.id,
          name: p.name,
          abbr: p.abbr,
          company: p.company,
          hq: p.hq,
          founded: p.founded,
          website: p.website,
          description: p.description,
          portrait: p.portrait,
          timeline: p.timeline,
          rules: p.rules,
          jurisdictionLabels: jurisLabels,
          profileFeatures: p.profileFeatures,
          developmentHistory: p.developmentHistory,
        };
        if (input.format === "pdf") {
          const buf = await generatePlatformPdf(exportData);
          const safeTitle = p.name.replace(/[/\\?%*:|"<>]/g, "-");
          return { base64: buf.toString("base64"), filename: `${safeTitle}_平台档案.pdf`, mimeType: "application/pdf" };
        } else {
          const buf = await generatePlatformDocx(exportData);
          const safeTitle = p.name.replace(/[/\\?%*:|"<>]/g, "-");
          return { base64: buf.toString("base64"), filename: `${safeTitle}_平台档案.docx`, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
        }
      }),
  }),
  // ── Settings (API keys) ───────────────────────────────────────────────
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

  // ── Scraper (Firecrawl → Jina → ScrapingBee fallback) ──────────────────────
  scraper: router({
    scrapeUrl: adminProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rows = await db.select().from(apiSettings);
        const get = (key: string) => rows.find((r) => r.key === key)?.value ?? undefined;
        const result = await scrapeUrl(input.url, {
          firecrawlKey: get("FIRECRAWL_API_KEY"),
          jinaKey: get("JINA_API_KEY"),
          scrapingbeeKey: get("SCRAPINGBEE_API_KEY"),
        });
        return result;
      }),
    testApiKey: adminProcedure
      .input(z.object({
        service: z.enum(["firecrawl", "jina", "scrapingbee"]),
        // If provided, test with this key; otherwise use the saved key from DB
        apiKey: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Resolve the key: use provided key or fall back to saved key
        let key: string | undefined = input.apiKey;
        if (!key) {
          const rows = await db.select().from(apiSettings);
          const keyMap: Record<string, string> = {
            firecrawl: "FIRECRAWL_API_KEY",
            jina: "JINA_API_KEY",
            scrapingbee: "SCRAPINGBEE_API_KEY",
          };
          key = rows.find((r) => r.key === keyMap[input.service])?.value ?? undefined;
        }

        if (input.service === "firecrawl") {
          if (!key) return { ok: false, latencyMs: 0, message: "未配置 Firecrawl API Key" };
          return testFirecrawlKey(key);
        } else if (input.service === "jina") {
          return testJinaKey(key); // Jina works without a key
        } else {
          if (!key) return { ok: false, latencyMs: 0, message: "未配置 ScrapingBee API Key" };
          return testScrapingBeeKey(key);
        }
      }),
  }),
  // ── AI helpers ────────────────────────────────────────────────────────
  ai: router({
    // Extract platform info by keyword (no Firecrawl needed)
    extractPlatformByKeyword: adminProcedure
      .input(z.object({ keyword: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rows = await db.select().from(apiSettings);
        const systemPrompt = `You are a senior research analyst specializing in internet platform governance, digital regulation, and platform economics. Given a platform name or keyword, extract comprehensive information about the platform from your knowledge. Return a JSON object with ALL of the following fields:

## Basic Info
- name: string (official Chinese name or transliteration)
- nameEn: string (official English name)
- website: string (official website URL, e.g. https://www.tiktok.com)
- wikipediaUrl: string (Wikipedia URL, e.g. https://en.wikipedia.org/wiki/TikTok)
- crunchbaseUrl: string (Crunchbase URL, e.g. https://www.crunchbase.com/organization/tiktok)
- description: string (brief description in Chinese, 100-200 chars, covering what the platform does and its significance)
- descriptionEn: string (brief description in English, 80-150 words)
- founded: string (founding year, e.g. "2016")
- headquarters: string (headquarters city and country in Chinese, e.g. "北京，中国")
- category: string (one of: social_media | search | ecommerce | video | messaging | cloud | fintech | other)
- tags: string[] (3-6 relevant keyword tags in Chinese)
- profileFeatures: string (detailed platform profile features in Chinese, 300-500 chars, covering: user scale, core product features, content ecosystem, monetization model, cross-border presence)
- developmentHistory: string (development history summary in Chinese, 300-500 chars, covering: founding background, key milestones, major acquisitions, regulatory events)

## Portrait (platform characteristics)
- portrait_types: string[] (platform types, 1-3 items from: 社交媒体 | 短视频 | 搜索引擎 | 电商平台 | 即时通讯 | 长视频 | 新闻资讯 | 云服务 | 支付平台 | 游戏平台 | 内容创作 | 职业社交)
- portrait_structure: string (platform structure type: UGC | PGC | PUGC | B2C | B2B | B2B2C | C2C | 混合)
- portrait_contentSource: string (content source: 用户生成 | 专业生产 | 混合 | 算法推荐 | 爬取聚合)
- portrait_networkEffect: string (network effect type: 直接网络效应 | 间接网络效应 | 双边市场 | 多边市场 | 无明显网络效应)
- portrait_businessModel: string[] (business models, 1-3 items from: 广告 | 订阅 | 电商佣金 | 增值服务 | 数据变现 | SaaS | 交易手续费 | 内容付费)
- portrait_openness: string (openness level: 开放平台 | 半开放 | 封闭生态)
- portrait_crossBorder: string (cross-border presence: 全球化运营 | 区域性平台 | 本土平台 | 出海扩张中)

## Rules (major regulatory documents/policies, up to 5 most important)
- rules: array of objects, each with:
  - date: string (YYYY-MM-DD or YYYY-MM or YYYY)
  - title: string (document title in Chinese)
  - type: string (one of: privacy_policy | terms_of_service | community_guidelines | transparency_report | other)
  - url: string (direct URL to the document)

## Timeline (key development milestones, 5-10 items)
- timeline: array of objects, each with:
  - date: string (YYYY-MM-DD or YYYY-MM or YYYY)
  - event: string (milestone description in Chinese, 30-80 chars)

Return ONLY valid JSON, no markdown, no explanation. Ensure all URLs are real and verifiable.`;
        const response = await routeLlmForTask(rows, "PLATFORM_FILL", {
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
                  portrait_types: { type: "array", items: { type: "string" } },
                  portrait_structure: { type: "string" },
                  portrait_contentSource: { type: "string" },
                  portrait_networkEffect: { type: "string" },
                  portrait_businessModel: { type: "array", items: { type: "string" } },
                  portrait_openness: { type: "string" },
                  portrait_crossBorder: { type: "string" },
                  rules: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        title: { type: "string" },
                        type: { type: "string" },
                        url: { type: "string" },
                      },
                      required: ["date", "title", "type", "url"],
                      additionalProperties: false,
                    },
                  },
                  timeline: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        event: { type: "string" },
                      },
                      required: ["date", "event"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["name", "nameEn", "website", "wikipediaUrl", "crunchbaseUrl", "description", "descriptionEn", "founded", "headquarters", "category", "tags", "profileFeatures", "developmentHistory", "portrait_types", "portrait_structure", "portrait_contentSource", "portrait_networkEffect", "portrait_businessModel", "portrait_openness", "portrait_crossBorder", "rules", "timeline"],
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
        // Step 1: Try to scrape full text with fallback chain
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rows = await db.select().from(apiSettings);
        const get = (key: string) => rows.find((r) => r.key === key)?.value ?? undefined;
        let scrapedFullText = "";
        let scrapeSource = "";
        try {
          const scraped = await scrapeUrl(input.url, {
            firecrawlKey: get("FIRECRAWL_API_KEY"),
            jinaKey: get("JINA_API_KEY"),
            scrapingbeeKey: get("SCRAPINGBEE_API_KEY"),
          });
          scrapedFullText = scraped.markdown;
          scrapeSource = scraped.source;
        } catch {
          // fallback: LLM will use URL only
        }
        // Fetch available topics and jurisdictions for accurate matching
        const topicsData = await db.select().from(topics).orderBy(asc(topics.sortOrder));
        const jurisdictionsData = await db.select().from(jurisdictions).orderBy(asc(jurisdictions.sortOrder));
        const topicsList = topicsData.map((t) => `${t.id}: ${t.label} (${t.labelEn})`).join(", ");
        const jurisdictionsList = jurisdictionsData.map((j) => `${j.id}: ${j.label} (${j.labelEn})`).join(", ");

        const systemPrompt = `You are a senior legal research analyst specializing in internet platform governance, data protection, antitrust, and AI regulation. Your task is to extract and deeply analyze a legal case, regulatory enforcement action, or legislative document.

Available research topics (use the exact id): ${topicsList}
Available jurisdictions (use the exact id): ${jurisdictionsList}

Return a JSON object with ALL of the following fields:
- title: string — case/document title in Chinese (concise, professional)
- titleEn: string — case/document title in English
- abstract: string — factual summary in Chinese covering: parties involved, core issue, key facts, outcome/decision, and legal basis (300-500 chars)
- type: string — one of exactly: judicial | regulatory | legislation
- date: string — primary date in YYYY-MM-DD format (decision date, enactment date, or publication date)
- topicId: string — the single most relevant topic id from the available list above
- jurisdictionId: string — the single most relevant jurisdiction id from the available list above
- source: string — name of the issuing authority, court, or institution (e.g. "爱尔兰数据保护委员会", "EU Court of Justice", "中国国家互联网信息办公室")
- language: string — primary language of the source document, one of: zh | en | de | fr | ja | ko | other
- tags: array of strings — 3-6 precise keyword tags in Chinese (e.g. ["GDPR", "数据跨境传输", "标准合同条款", "Meta"])
- aiAnalysis: string — DETAILED legal analysis in Chinese (800-1200 chars) covering: (1) legal significance and background context; (2) core legal issues and reasoning; (3) key legal provisions cited; (4) implications for platform operators and compliance practitioners; (5) comparison with similar cases or regulatory trends if relevant
- fullText: string — the complete original text content as scraped (preserve as-is, up to 15000 chars; if no content was scraped, return empty string)

Return ONLY valid JSON, no markdown, no explanation.`;

        const userContent = scrapedFullText
          ? `URL: ${input.url}\n\nFull page content (scraped via ${scrapeSource}):\n\n${scrapedFullText.slice(0, 14000)}`
          : `Please extract and analyze information from this URL: ${input.url}`;

        const response = await routeLlmForTask(rows, "CASE_EXTRACT", {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
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
                  topicId: { type: "string" },
                  jurisdictionId: { type: "string" },
                  source: { type: "string" },
                  language: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  aiAnalysis: { type: "string" },
                  fullText: { type: "string" },
                },
                required: ["title", "titleEn", "abstract", "type", "date", "topicId", "jurisdictionId", "source", "language", "tags", "aiAnalysis", "fullText"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0].message.content;
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        // Validate topicId and jurisdictionId against actual data; fall back to empty if not found
        const validTopicIds = topicsData.map((t) => t.id);
        const validJurisdictionIds = jurisdictionsData.map((j) => j.id);
        if (!validTopicIds.includes(parsed.topicId)) parsed.topicId = "";
        if (!validJurisdictionIds.includes(parsed.jurisdictionId)) parsed.jurisdictionId = "";
        // Always prefer scraped full text over LLM-generated content
        // Clean Markdown artifacts from scraped content to preserve paragraph structure
        if (scrapedFullText) {
          const cleanedScraped = scrapedFullText
            // Remove Markdown headings (## Title → Title)
            .replace(/^#{1,6}\s+/gm, '')
            // Remove bold/italic markers (**text** → text, *text* → text)
            .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
            // Remove inline code backticks
            .replace(/`([^`]+)`/g, '$1')
            // Remove Markdown links [text](url) → text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove horizontal rules
            .replace(/^[-*_]{3,}\s*$/gm, '')
            // Normalize multiple blank lines to double newline
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          parsed.fullText = cleanedScraped.slice(0, 15000);
        }
        // Paragraph integrity check: warn if fullText has no paragraph breaks
        const paragraphCount = parsed.fullText
          ? parsed.fullText.split(/\n\n+/).filter((p: string) => p.trim().length > 0).length
          : 0;
        if (parsed.fullText && parsed.fullText.length > 500 && paragraphCount <= 1) {
          // Flag for frontend to show warning
          parsed._paragraphWarning = true;
          parsed._paragraphCount = paragraphCount;
        } else {
          parsed._paragraphWarning = false;
          parsed._paragraphCount = paragraphCount;
        }
        // Validate AI analysis depth — if too short, append a note for the editor
        if (parsed.aiAnalysis && parsed.aiAnalysis.length < 400) {
          parsed.aiAnalysis = parsed.aiAnalysis + "\n\n[注：AI 分析内容较简短，建议手动补充法律意义、核心争议及合规建议。]";
        }
        return parsed;
      }),
    // ── Tag auto-suggest ────────────────────────────────────────────────
    suggestTagFields: adminProcedure
      .input(z.object({
        label: z.string().min(1),
        type: z.enum(["topic", "jurisdiction"]),
      }))
      .mutation(async ({ input }) => {
        const isJuris = input.type === "jurisdiction";
        const systemPrompt = isJuris
          ? `You are a database assistant. Given a Chinese jurisdiction name, return a JSON object with:
- id: a short lowercase kebab-case English identifier (e.g. "european-union", "united-states", "china")
- labelEn: the standard English name of the jurisdiction
Return ONLY valid JSON, no explanation.`
          : `You are a database assistant. Given a Chinese research topic name for an internet governance database, return a JSON object with:
- id: a short lowercase kebab-case English identifier (e.g. "data-privacy", "content-moderation", "antitrust")
- labelEn: the standard English name of the topic
- color: a semantically appropriate HEX color code (e.g. "#1a73e8" for data, "#e8710a" for content, "#34a853" for competition)
Return ONLY valid JSON, no explanation.`;
        const dbInst = await getDb();
        const llmRows = dbInst ? await dbInst.select().from(apiSettings) : [];
        const response = await routeLlmForTask(llmRows, "TAG_SUGGEST", {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.label },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "tag_fields",
              strict: true,
              schema: isJuris
                ? {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      labelEn: { type: "string" },
                    },
                    required: ["id", "labelEn"],
                    additionalProperties: false,
                  }
                : {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      labelEn: { type: "string" },
                      color: { type: "string" },
                    },
                    required: ["id", "labelEn", "color"],
                    additionalProperties: false,
                  },
            },
          },
        });
        const content = response.choices[0].message.content;
        return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      }),

    // ── Get task definitions ──────────────────────────────────────────
    getLlmTasks: adminProcedure
      .query(() => LLM_TASKS.map((t) => ({ key: t.key, label: t.label, desc: t.desc }))),

    // ── Test external LLM connectivity ──────────────────────────────────
    testLlm: adminProcedure
      .input(z.object({
        provider: z.enum(["openai", "deepseek", "anthropic", "azure", "openai_compat"]),
        apiKey: z.string().min(1),
        model: z.string().optional(),
        baseUrl: z.string().optional(),
        apiVersion: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return testLlmConfig({
          provider: input.provider,
          apiKey: input.apiKey,
          model: input.model,
          baseUrl: input.baseUrl,
          apiVersion: input.apiVersion,
        });
      }),
  }),
  // ── Scheduled endpoint (for future use) ──────────────────────────────
  scheduled: router({
    ping: publicProcedure.query(() => ({ ok: true })),
  }),

  // ── Site Settings ─────────────────────────────────────────────────────
  siteSettings: router({
    // 获取所有设置（管理员）
    getAll: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(siteSettings).orderBy(asc(siteSettings.group), asc(siteSettings.key));
    }),
    // 按 group 获取设置（公开）
    getByGroup: publicProcedure
      .input(z.object({ group: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(siteSettings).where(eq(siteSettings.group, input.group));
      }),
    // 获取所有公开设置（公开，用于前端批量加载）
    getPublic: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(siteSettings).orderBy(asc(siteSettings.group), asc(siteSettings.key));
    }),
    // 更新单个设置（管理员）
    update: adminProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(siteSettings)
          .set({ value: input.value })
          .where(eq(siteSettings.key, input.key));
        return { success: true };
      }),
    // 批量更新设置（管理员）
    updateBatch: adminProcedure
      .input(z.array(z.object({
        key: z.string(),
        value: z.string(),
      })))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        for (const item of input) {
          await db.update(siteSettings)
            .set({ value: item.value })
            .where(eq(siteSettings.key, item.key));
        }
        return { success: true };
      }),
   }),

  // ── Platform Rules Router ──────────────────────────────────────────────
  platformRules: router({
    // List all rules for a platform (public)
    list: publicProcedure
      .input(z.object({ platformId: z.string(), latestOnly: z.boolean().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const conditions: any[] = [eq(platformRules.platformId, input.platformId)];
        if (input.latestOnly) conditions.push(eq(platformRules.isLatest, true));
        return db.select().from(platformRules)
          .where(and(...conditions))
          .orderBy(asc(platformRules.sortOrder), desc(platformRules.createdAt));
      }),

    // List all versions of a specific rule (by title similarity)
    listVersions: publicProcedure
      .input(z.object({ ruleId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const current = await db.select().from(platformRules)
          .where(eq(platformRules.id, input.ruleId)).limit(1);
        if (!current[0]) return [];
        const { platformId, title } = current[0];
        const kw = title.slice(0, Math.min(20, title.length));
        return db.select().from(platformRules)
          .where(and(
            eq(platformRules.platformId, platformId),
            like(platformRules.title, `%${kw}%`)
          ))
          .orderBy(desc(platformRules.createdAt));
      }),

    // Create a new rule
    create: adminProcedure
      .input(z.object({
        platformId: z.string(),
        title: z.string().min(1),
        type: z.string().default("policy"),
        url: z.string().optional(),
        date: z.string().optional(),
        fullText: z.string().optional(),
        versionLabel: z.string().optional(),
        versionDate: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.insert(platformRules).values({
          platformId: input.platformId,
          title: input.title,
          type: input.type,
          url: input.url,
          date: input.date,
          fullText: input.fullText,
          versionLabel: input.versionLabel,
          versionDate: input.versionDate,
          isLatest: true,
          sortOrder: input.sortOrder ?? 0,
        });
        return { success: true, id: Number((result as any).insertId) };
      }),

    // Update a rule
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        type: z.string().optional(),
        url: z.string().optional(),
        date: z.string().optional(),
        fullText: z.string().optional(),
        versionLabel: z.string().optional(),
        versionDate: z.string().optional(),
        isLatest: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...rest } = input;
        await db.update(platformRules).set(rest).where(eq(platformRules.id, id));
        return { success: true };
      }),

    // Delete a rule
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(ruleAttachments).where(eq(ruleAttachments.ruleId, input.id));
        await db.delete(platformRules).where(eq(platformRules.id, input.id));
        return { success: true };
      }),

    // Add a new version of an existing rule
    addVersion: adminProcedure
      .input(z.object({
        parentRuleId: z.number(),
        title: z.string().min(1),
        type: z.string().default("policy"),
        url: z.string().optional(),
        date: z.string().optional(),
        fullText: z.string().optional(),
        versionLabel: z.string().optional(),
        versionDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const parent = await db.select().from(platformRules)
          .where(eq(platformRules.id, input.parentRuleId)).limit(1);
        if (!parent[0]) throw new TRPCError({ code: "NOT_FOUND", message: "父规则不存在" });
        const kw = parent[0].title.slice(0, Math.min(20, parent[0].title.length));
        await db.update(platformRules)
          .set({ isLatest: false })
          .where(and(
            eq(platformRules.platformId, parent[0].platformId),
            like(platformRules.title, `%${kw}%`)
          ));
        const result = await db.insert(platformRules).values({
          platformId: parent[0].platformId,
          title: input.title,
          type: input.type,
          url: input.url,
          date: input.date,
          fullText: input.fullText,
          versionLabel: input.versionLabel,
          versionDate: input.versionDate,
          parentRuleId: input.parentRuleId,
          isLatest: true,
          sortOrder: parent[0].sortOrder,
        });
        await db.update(platformRules)
          .set({ newVersionHint: null })
          .where(eq(platformRules.id, input.parentRuleId));
        return { success: true, id: Number((result as any).insertId) };
      }),

    // AI: check if a new version exists for a rule
    checkNewVersion: adminProcedure
      .input(z.object({ ruleId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rule = await db.select().from(platformRules)
          .where(eq(platformRules.id, input.ruleId)).limit(1);
        if (!rule[0]) throw new TRPCError({ code: "NOT_FOUND" });
        const r = rule[0];
        if (!r.url) throw new TRPCError({ code: "BAD_REQUEST", message: "该规则文件无 URL，无法检测新版本" });
        let currentContent = "";
        try {
          const scrapeRows = await db.select().from(apiSettings);
          const getScrape = (key: string) => scrapeRows.find((row) => row.key === key)?.value ?? undefined;
          const scraped = await scrapeUrl(r.url, {
            firecrawlKey: getScrape("FIRECRAWL_API_KEY"),
            jinaKey: getScrape("JINA_API_KEY"),
            scrapingbeeKey: getScrape("SCRAPINGBEE_API_KEY"),
          });
          currentContent = scraped.markdown;
        } catch (e: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `抓取失败: ${e.message}` });
        }
        const llmRows = await db.select().from(apiSettings);
        const llmResp = await routeLlmForTask(llmRows, "RULE_CHECK", {
          messages: [
            {
              role: "system",
              content: `你是平台政策监测专家。判断规则文件是否有新版本。返回 JSON: {"hasNewVersion":boolean,"newVersionDate":string|null,"newVersionLabel":string|null,"summary":string,"confidence":string}`,
            },
            {
              role: "user",
              content: `标题：${r.title}\n已知版本：${r.versionLabel ?? "未知"}\n已知日期：${r.date ?? "未知"}\n\n网页内容（前 3000 字）：\n${currentContent.slice(0, 3000)}`,
            },
          ],
        });
        const content = llmResp.choices?.[0]?.message?.content as string;
        let result: any = { hasNewVersion: false, summary: "检测完成", confidence: "low" };
        try { result = JSON.parse(content); } catch { /* use default */ }
        const hint = result.hasNewVersion
          ? `检测到新版本：${result.newVersionLabel ?? ""}（${result.newVersionDate ?? ""}）- ${result.summary}`
          : null;
        await db.update(platformRules)
          .set({ newVersionHint: hint, newVersionCheckedAt: new Date() })
          .where(eq(platformRules.id, input.ruleId));
        return { ...result, hint };
      }),

    // AI: batch check new versions for all latest rules of a platform
    batchCheckNewVersion: adminProcedure
      .input(z.object({ platformId: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rules = await db.select().from(platformRules)
          .where(and(
            eq(platformRules.platformId, input.platformId),
            eq(platformRules.isLatest, true),
            isNotNull(platformRules.url)
          ));
        const results: Array<{ id: number; title: string; hasNewVersion: boolean; hint: string | null; error?: string }> = [];
        for (const rule of rules) {
          try {
            let currentContent = "";
            try {
              const scrapeRows = await db.select().from(apiSettings);
              const getScrape = (key: string) => scrapeRows.find((row) => row.key === key)?.value ?? undefined;
              const scraped = await scrapeUrl(rule.url!, {
                firecrawlKey: getScrape("FIRECRAWL_API_KEY"),
                jinaKey: getScrape("JINA_API_KEY"),
                scrapingbeeKey: getScrape("SCRAPINGBEE_API_KEY"),
              });
              currentContent = scraped.markdown;
            } catch { /* skip */ }
            if (!currentContent) { results.push({ id: rule.id, title: rule.title, hasNewVersion: false, hint: null, error: "无法抓取页面" }); continue; }
            const llmRows = await db.select().from(apiSettings);
            const llmResp = await routeLlmForTask(llmRows, "RULE_CHECK", {
              messages: [
                { role: "system", content: `判断规则文件是否有新版本。返回 JSON: {"hasNewVersion":boolean,"newVersionDate":string|null,"newVersionLabel":string|null,"summary":string,"confidence":string}` },
                { role: "user", content: `标题：${rule.title}\n已知版本：${rule.versionLabel ?? "未知"}\n已知日期：${rule.date ?? "未知"}\n\n网页内容：\n${currentContent.slice(0, 2000)}` },
              ],
            });
            const c = llmResp.choices?.[0]?.message?.content as string;
            let rv: any = { hasNewVersion: false, summary: "" };
            try { rv = JSON.parse(c); } catch { /* use default */ }
            const hint = rv.hasNewVersion ? `检测到新版本：${rv.newVersionLabel ?? ""}（${rv.newVersionDate ?? ""}）- ${rv.summary}` : null;
            await db.update(platformRules).set({ newVersionHint: hint, newVersionCheckedAt: new Date() }).where(eq(platformRules.id, rule.id));
            results.push({ id: rule.id, title: rule.title, hasNewVersion: rv.hasNewVersion, hint });
          } catch (e: any) {
            results.push({ id: rule.id, title: rule.title, hasNewVersion: false, hint: null, error: e.message });
          }
        }
        return { total: rules.length, results };
      }),

    // AI: extract full text for a single rule
    extractFullText: adminProcedure
      .input(z.object({ ruleId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rule = await db.select().from(platformRules)
          .where(eq(platformRules.id, input.ruleId)).limit(1);
        if (!rule[0]) throw new TRPCError({ code: "NOT_FOUND" });
        if (!rule[0].url) throw new TRPCError({ code: "BAD_REQUEST", message: "该规则文件无 URL" });
        const scrapeRows = await db.select().from(apiSettings);
        const getScrape = (key: string) => scrapeRows.find((row) => row.key === key)?.value ?? undefined;
        const scraped = await scrapeUrl(rule[0].url, {
          firecrawlKey: getScrape("FIRECRAWL_API_KEY"),
          jinaKey: getScrape("JINA_API_KEY"),
          scrapingbeeKey: getScrape("SCRAPINGBEE_API_KEY"),
        });
        const text = scraped.markdown;
        if (!text || text.trim().length < 50) throw new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: "抓取内容过少" });
        await db.update(platformRules).set({ fullText: text }).where(eq(platformRules.id, input.ruleId));
        return { success: true, charCount: text.length };
      }),

    // AI: batch extract full text for all rules without fullText
    batchExtractFullText: adminProcedure
      .input(z.object({ platformId: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const pending = await db.select().from(platformRules)
          .where(and(
            eq(platformRules.platformId, input.platformId),
            isNotNull(platformRules.url),
            or(isNull(platformRules.fullText), eq(platformRules.fullText, ""))
          ));
        const results: Array<{ id: number; title: string; success: boolean; charCount?: number; error?: string }> = [];
        for (const rule of pending) {
          try {
            const scrapeRows2 = await db.select().from(apiSettings);
            const getScrape2 = (key: string) => scrapeRows2.find((row) => row.key === key)?.value ?? undefined;
            const scraped = await scrapeUrl(rule.url!, {
              firecrawlKey: getScrape2("FIRECRAWL_API_KEY"),
              jinaKey: getScrape2("JINA_API_KEY"),
              scrapingbeeKey: getScrape2("SCRAPINGBEE_API_KEY"),
            });
            const text = scraped.markdown;
            if (!text || text.trim().length < 50) { results.push({ id: rule.id, title: rule.title, success: false, error: "内容过少" }); continue; }
            await db.update(platformRules).set({ fullText: text }).where(eq(platformRules.id, rule.id));
            results.push({ id: rule.id, title: rule.title, success: true, charCount: text.length });
          } catch (e: any) {
            results.push({ id: rule.id, title: rule.title, success: false, error: e.message });
          }
        }
        return { total: pending.length, successCount: results.filter(r => r.success).length, failCount: results.filter(r => !r.success).length, results };
      }),

    // Upload attachment for a rule
    uploadAttachment: adminProcedure
      .input(z.object({
        ruleId: z.number(),
        filename: z.string(),
        fileBase64: z.string(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const buf = Buffer.from(input.fileBase64, "base64");
        const ext = input.filename.split(".").pop() ?? "bin";
        const key = `rule-attachments/${input.ruleId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, buf, input.mimeType ?? "application/octet-stream");
        await db.insert(ruleAttachments).values({
          ruleId: input.ruleId,
          filename: input.filename,
          fileKey: key,
          fileUrl: url,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
        });
        return { success: true, url, key };
      }),

    // List attachments for a rule
    listAttachments: publicProcedure
      .input(z.object({ ruleId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(ruleAttachments)
          .where(eq(ruleAttachments.ruleId, input.ruleId))
          .orderBy(desc(ruleAttachments.createdAt));
      }),

    // Delete attachment
    deleteAttachment: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(ruleAttachments).where(eq(ruleAttachments.id, input.id));
        return { success: true };
      }),
  }),

   // ── Admin Users ──────────────────────────────
  users: router({
    list: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return next({ ctx });
      })
      .input(z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }).optional())
      .query(async ({ input }) => {
        return listUsers({ page: input?.page, pageSize: input?.pageSize });
      }),
    updateRole: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return next({ ctx });
      })
      .input(z.object({
        id: z.number().int(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Prevent admin from demoting themselves
        if (ctx.user.id === input.id && input.role === "user") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能降级自己的管理员权限" });
        }
        await updateUserRole(input.id, input.role);
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return next({ ctx });
      })
      .input(z.object({
        id: z.number().int(),
        status: z.enum(["active", "frozen"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能冒结自己的账号" });
        }
        await updateUserStatus(input.id, input.status);
        return { success: true };
      }),

    delete: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return next({ ctx });
      })
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能删除自己的账号" });
        }
        await deleteUser(input.id);
        return { success: true };
      }),
  }),

  // ── Admin Invites ──────────────────────────────────────────────────────────────
  invites: router({
    list: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return next({ ctx });
      })
      .query(async () => {
        return listAdminInvites();
      }),

    generate: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return next({ ctx });
      })
      .input(z.object({
        note: z.string().max(200).optional(),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = randomBytes(24).toString("hex");
        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 86400_000)
          : undefined;
        await createAdminInvite({
          token,
          note: input.note,
          createdBy: ctx.user.id,
          expiresAt,
        });
        return { token };
      }),

    revoke: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return next({ ctx });
      })
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await revokeAdminInvite(input.id);
        return { success: true };
      }),

    // Public: validate invite token (used on invite landing page)
    validate: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invite = await getAdminInviteByToken(input.token);
        if (!invite) return { valid: false, reason: "邀请码不存在" };
        if (invite.usedBy) return { valid: false, reason: "邀请码已被使用" };
        if (invite.expiresAt && invite.expiresAt < new Date()) return { valid: false, reason: "邀请码已过期" };
        return { valid: true, note: invite.note };
      }),

    // Protected: consume invite (called after OAuth login)
    consume: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const invite = await getAdminInviteByToken(input.token);
        if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "邀请码不存在" });
        if (invite.usedBy) throw new TRPCError({ code: "BAD_REQUEST", message: "邀请码已被使用" });
        if (invite.expiresAt && invite.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "邀请码已过期" });
        }
        await consumeAdminInvite(input.token, ctx.user.id);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
