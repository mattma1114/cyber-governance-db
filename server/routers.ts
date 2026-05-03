import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { cases, platforms, topics, jurisdictions, apiSettings } from "../drizzle/schema";
import { eq, like, and, desc, asc, sql, or, inArray } from "drizzle-orm";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";

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
        page: z.number().default(1),
        pageSize: z.number().default(12),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { items: [], total: 0, page: 1, pageSize: 12 };
        const page = input?.page ?? 1;
        const pageSize = input?.pageSize ?? 12;
        const offset = (page - 1) * pageSize;
        const conditions = [eq(platforms.isActive, true)];
        if (input?.keyword) {
          conditions.push(or(
            like(platforms.name, `%${input.keyword}%`),
            like(platforms.company, `%${input.keyword}%`),
          )!);
        }
        const where = and(...conditions);
        const [items, countResult] = await Promise.all([
          db.select().from(platforms).where(where).orderBy(asc(platforms.sortOrder)).limit(pageSize).offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(platforms).where(where),
        ]);
        return { items, total: Number(countResult[0]?.count ?? 0), page, pageSize };
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

  // ── Scheduled endpoint (for future use) ───────────────────────────────────────────
  scheduled: router({
    ping: publicProcedure.query(() => ({ ok: true })),
  }),

  // ── AI URL Extraction ─────────────────────────────────────────────────────────────────────────
  ai: router({
    extractFromUrl: adminProcedure
      .input(z.object({ url: z.string().url() }))
      .mutation(async ({ input }) => {
        // Step 1: Fetch page content via Firecrawl REST API
        // Read Firecrawl key from api_settings table (admin-configurable)
        const db = await getDb();
        const [firecrawlRow] = await db!.select().from(apiSettings).where(eq(apiSettings.key, "firecrawl_api_key"));
        const firecrawlKey = firecrawlRow?.value || process.env.FIRECRAWL_API_KEY;
        if (!firecrawlKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "未配置 Firecrawl API Key，请前往管理员后台 → API 配置进行配置" });

        let pageContent = "";
        try {
          const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${firecrawlKey}` },
            body: JSON.stringify({ url: input.url, formats: ["markdown"], onlyMainContent: true }),
          });
          const scrapeData = await scrapeRes.json() as any;
          pageContent = scrapeData?.data?.markdown ?? scrapeData?.markdown ?? "";
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `网页抓取失败: ${(e as Error).message}` });
        }

        if (!pageContent || pageContent.length < 50) {
          throw new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: "未能获取到有效页面内容，请检查 URL 是否可公开访问" });
        }

        // Step 2: LLM structured extraction
        const prompt = `你是一个互联网平台治理领域的法律数据库录入助手。请从以下网页内容中提取案例信息，输出为严格 JSON。

网页内容：
${pageContent.slice(0, 8000)}

请提取并返回以下 JSON 格式（所有字段均为可选，无法确定的留空）：
{
  "title": "案例标题（中文）",
  "titleEn": "案例标题（英文，如有）",
  "type": "案例类型：judicial/regulatory/legislation 三选一",
  "date": "日期（YYYY-MM-DD 或 YYYY-MM 或 YYYY）",
  "source": "来源机构名称",
  "sourceUrl": "原始来源 URL",
  "abstract": "案例摘要（200-500字，中文）",
  "aiSummary": "内容解读（主要事实、监管动态、处罚内容，300-800字）",
  "aiAnalysis": "法律分析（法律依据、合规启示、影响意义，300-800字）",
  "tags": ["标签1", "标签2"],
  "language": "原文语言代码，如 zh/en/de/fr",
  "topicId": "建议归属的专题ID（如果能判断）",
  "jurisdictionId": "建议归属的辖区 ID（如果能判断）"
}

只返回 JSON，不要包含其他文字。`;

        const llmRes = await invokeLLM({
          messages: [
            { role: "system", content: "你是一个专业的法律数据提取助手，严格返回 JSON 格式。" },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const rawContent2 = llmRes?.choices?.[0]?.message?.content;
        const raw = (typeof rawContent2 === "string" ? rawContent2 : JSON.stringify(rawContent2)) ?? "{}";
        let extracted: Record<string, any> = {};
        try { extracted = JSON.parse(raw); } catch { extracted = {}; }

        return {
          success: true,
          data: {
            title: extracted.title ?? "",
            titleEn: extracted.titleEn ?? "",
            type: ["judicial", "regulatory", "legislation"].includes(extracted.type) ? extracted.type : "",
            date: extracted.date ?? "",
            source: extracted.source ?? "",
            sourceUrl: extracted.sourceUrl ?? input.url,
            abstract: extracted.abstract ?? "",
            aiSummary: extracted.aiSummary ?? "",
            aiAnalysis: extracted.aiAnalysis ?? "",
            tags: Array.isArray(extracted.tags) ? extracted.tags : [],
            language: extracted.language ?? "zh",
            topicId: extracted.topicId ?? "",
            jurisdictionId: extracted.jurisdictionId ?? "",
          },
          rawContent: pageContent.slice(0, 2000),
        };
      }),
    generateContent: adminProcedure
      .input(z.object({
        type: z.enum(["summary", "analysis"]),
        title: z.string(),
        abstract: z.string().optional(),
        aiSummary: z.string().optional(),
        type_: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const typeLabel = input.type_ === "judicial" ? "司法案例" : input.type_ === "regulatory" ? "监管执法" : "立法政策";
        let systemPrompt = "";
        let userPrompt = "";

        if (input.type === "summary") {
          systemPrompt = "你是一位专注于互联网平台治理的资深法律分析师。请基于提供的案例信息，撰写一篇详尽、岂专、客观的内容解读。要求：300-800字，涵盖事件背景、主要事实、处罚结果、平台回应。直接输出正文，不需标题。";
          userPrompt = `案例类型：${typeLabel}
案例标题：${input.title}
摘要：${input.abstract ?? "无"}

请撰写内容解读：`;
        } else {
          systemPrompt = "你是一位专注于数字平台合规的资深法律顾问。请基于案例信息，撰写一篇深度、专业、具有实务指导意义的法律分析。要求：300-800字，涵盖适用法律依据、监管逻辑、合规启示、行业影响。直接输出正文，不需标题。";
          userPrompt = `案例类型：${typeLabel}
案例标题：${input.title}
摘要：${input.abstract ?? "无"}
内容解读：${input.aiSummary ?? "无"}

请撰写法律分析：`;
        }

        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        const content = typeof result.choices[0].message.content === "string"
          ? result.choices[0].message.content
          : (result.choices[0].message.content as any[])
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("");
        return { content };
      }),
  }),

  // API Settings (admin only)
  settings: router({
    list: adminProcedure.query(async () => {
      const db = await getDb();
      const rows = await db!.select().from(apiSettings);
      return rows.map((r: typeof apiSettings.$inferSelect) => ({
        key: r.key,
        label: r.label,
        hasValue: !!r.value,
        updatedAt: r.updatedAt,
      }));
    }),
    set: adminProcedure
      .input(z.object({
        key: z.string().min(1).max(128),
        value: z.string(),
        label: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        await db!
          .insert(apiSettings)
          .values({ key: input.key, value: input.value, label: input.label ?? input.key })
          .onDuplicateKeyUpdate({ set: { value: input.value, label: input.label ?? input.key } });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        await db!.delete(apiSettings).where(eq(apiSettings.key, input.key));
        return { success: true };
      }),
    getValue: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const [row] = await db!.select().from(apiSettings).where(eq(apiSettings.key, input.key));
        return { value: row?.value ?? null };
      }),
  }),
});
export type AppRouter = typeof appRouter;
