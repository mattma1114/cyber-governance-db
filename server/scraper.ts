/**
 * server/scraper.ts
 * 梯级冗余网页抓取服务：Firecrawl → Jina Reader → ScrapingBee
 *
 * 策略：按顺序尝试三个 API，任一成功即返回 Markdown 内容。
 * 全部失败时抛出错误，由调用方决定是否降级为纯 LLM 提取。
 */

export interface ScrapeResult {
  markdown: string;
  source: "firecrawl" | "jina" | "scrapingbee";
  url: string;
}

// ── Firecrawl ────────────────────────────────────────────────────────────────
async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 30000,
    }),
    signal: AbortSignal.timeout(35000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firecrawl error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { success: boolean; data?: { markdown?: string }; error?: string };
  if (!data.success || !data.data?.markdown) {
    throw new Error(`Firecrawl returned no markdown: ${data.error ?? "unknown"}`);
  }
  return data.data.markdown;
}

// ── Jina Reader ──────────────────────────────────────────────────────────────
async function scrapeWithJina(url: string, apiKey?: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "text/plain",
    "X-Return-Format": "markdown",
    "X-No-Cache": "true",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
  const res = await fetch(jinaUrl, {
    headers,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Jina Reader error ${res.status}`);
  }

  const text = await res.text();
  if (!text || text.length < 100) {
    throw new Error("Jina Reader returned empty content");
  }
  return text;
}

// ── ScrapingBee ──────────────────────────────────────────────────────────────
async function scrapeWithScrapingBee(url: string, apiKey: string): Promise<string> {
  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    render_js: "false",
    extract_rules: JSON.stringify({
      text: { selector: "body", output: "markdown" },
    }),
  });

  const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`, {
    signal: AbortSignal.timeout(35000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ScrapingBee error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { text?: string } | string;
  // ScrapingBee returns JSON with extracted fields or raw text
  if (typeof data === "object" && data.text) {
    return data.text;
  }
  const raw = typeof data === "string" ? data : JSON.stringify(data);
  if (!raw || raw.length < 100) {
    throw new Error("ScrapingBee returned empty content");
  }
  return raw;
}

// ── Main scrape function (with fallback) ─────────────────────────────────────
export interface ScrapeOptions {
  firecrawlKey?: string;
  jinaKey?: string;      // optional – Jina works without a key (rate-limited)
  scrapingbeeKey?: string;
}

export async function scrapeUrl(url: string, opts: ScrapeOptions): Promise<ScrapeResult> {
  const errors: string[] = [];

  // 1. Firecrawl (primary)
  if (opts.firecrawlKey) {
    try {
      const markdown = await scrapeWithFirecrawl(url, opts.firecrawlKey);
      return { markdown, source: "firecrawl", url };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Firecrawl: ${msg}`);
      console.warn("[scraper] Firecrawl failed, trying Jina:", msg);
    }
  }

  // 2. Jina Reader (secondary – works without key)
  try {
    const markdown = await scrapeWithJina(url, opts.jinaKey);
    return { markdown, source: "jina", url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Jina: ${msg}`);
    console.warn("[scraper] Jina failed, trying ScrapingBee:", msg);
  }

  // 3. ScrapingBee (tertiary)
  if (opts.scrapingbeeKey) {
    try {
      const markdown = await scrapeWithScrapingBee(url, opts.scrapingbeeKey);
      return { markdown, source: "scrapingbee", url };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`ScrapingBee: ${msg}`);
      console.warn("[scraper] ScrapingBee failed:", msg);
    }
  }

  throw new Error(`所有抓取服务均失败：\n${errors.join("\n")}`);
}

// ── API Key validation ────────────────────────────────────────────────────────
export interface TestApiKeyResult {
  ok: boolean;
  latencyMs: number;
  message: string;
}

export async function testFirecrawlKey(apiKey: string): Promise<TestApiKeyResult> {
  const start = Date.now();
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url: "https://example.com", formats: ["markdown"], onlyMainContent: true }),
      signal: AbortSignal.timeout(15000),
    });
    const latencyMs = Date.now() - start;
    if (res.status === 401 || res.status === 403) {
      return { ok: false, latencyMs, message: "API Key 无效或权限不足" };
    }
    if (res.status === 402) {
      return { ok: false, latencyMs, message: "API Key 额度已耗尽" };
    }
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, latencyMs, message: `HTTP ${res.status}: ${body.slice(0, 100)}` };
    }
    const data = await res.json() as { success?: boolean; error?: string };
    if (data.success === false && data.error?.includes("blocked")) {
      // example.com might be blocked but key is valid
      return { ok: true, latencyMs, message: `验证成功（${latencyMs}ms）` };
    }
    return { ok: true, latencyMs, message: `验证成功（${latencyMs}ms）` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function testJinaKey(apiKey?: string): Promise<TestApiKeyResult> {
  const start = Date.now();
  try {
    const headers: Record<string, string> = {
      Accept: "text/plain",
      "X-Return-Format": "markdown",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const res = await fetch(`https://r.jina.ai/${encodeURIComponent("https://example.com")}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    const latencyMs = Date.now() - start;
    if (res.status === 401 || res.status === 403) {
      return { ok: false, latencyMs, message: "API Key 无效" };
    }
    if (res.status === 429) {
      return { ok: false, latencyMs, message: "请求频率超限，请稍后重试" };
    }
    if (!res.ok) {
      return { ok: false, latencyMs, message: `HTTP ${res.status}` };
    }
    const text = await res.text();
    if (text.length < 50) {
      return { ok: false, latencyMs, message: "返回内容过短，可能异常" };
    }
    return { ok: true, latencyMs, message: apiKey ? `验证成功（${latencyMs}ms）` : `免费模式可用（${latencyMs}ms）` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function testScrapingBeeKey(apiKey: string): Promise<TestApiKeyResult> {
  const start = Date.now();
  try {
    // Use the account endpoint to verify key without consuming credits
    const res = await fetch(`https://app.scrapingbee.com/api/v1/usage?api_key=${encodeURIComponent(apiKey)}`, {
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (res.status === 403 || res.status === 401) {
      return { ok: false, latencyMs, message: "API Key 无效" };
    }
    if (!res.ok) {
      // Fallback: try a minimal scrape of example.com
      const params = new URLSearchParams({ api_key: apiKey, url: "https://example.com", render_js: "false" });
      const r2 = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`, { signal: AbortSignal.timeout(15000) });
      const l2 = Date.now() - start;
      if (r2.status === 401 || r2.status === 403) return { ok: false, latencyMs: l2, message: "API Key 无效" };
      if (r2.status === 402) return { ok: false, latencyMs: l2, message: "额度已耗尽" };
      if (!r2.ok) return { ok: false, latencyMs: l2, message: `HTTP ${r2.status}` };
      return { ok: true, latencyMs: l2, message: `验证成功（${l2}ms）` };
    }
    const data = await res.json() as { max_api_credits?: number; used_api_credits?: number };
    const remaining = (data.max_api_credits ?? 0) - (data.used_api_credits ?? 0);
    return { ok: true, latencyMs, message: `验证成功，剩余额度 ${remaining} 次（${latencyMs}ms）` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, message: e instanceof Error ? e.message : String(e) };
  }
}
