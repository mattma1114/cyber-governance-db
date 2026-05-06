import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { cases, platforms, topics, jurisdictions, apiSettings, caseAttachments } from "../drizzle/schema";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { routeLlm, routeLlmForTask, parseLlmConfig, LLM_TASKS, testLlmConfig, DEFAULT_MODELS } from "./llm-router";
import { generateCasePdf, generateBatchPdfZip } from "./pdf";
import { scrapeUrl, testFirecrawlKey, testJinaKey, testScrapingBeeKey } from "./scraper";
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
        if (scrapedFullText) {
          parsed.fullText = scrapedFullText.slice(0, 15000);
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
});

export type AppRouter = typeof appRouter;
