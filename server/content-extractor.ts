/**
 * server/content-extractor.ts
 *
 * 正文提取工具：从原始 HTML 中精准提取正文内容，过滤广告、banner、
 * 侧边栏、底部栏、导航栏等非正文区域。
 *
 * 策略（按优先级）：
 * 1. @mozilla/readability — 业界标准的正文提取算法（Firefox Reader View 同款）
 * 2. 语义化 HTML 标签提取 — 优先 <article>/<main>，次选 <section>
 * 3. 噪音标签清洗 — 移除 nav/aside/footer/header/script/style/noscript/
 *    iframe/form/figure/figcaption/[role=banner]/[role=navigation]/
 *    [class*=ad]/[class*=sidebar]/[class*=footer]/[class*=header]/
 *    [class*=nav]/[class*=menu]/[class*=cookie]/[class*=popup]/
 *    [class*=modal]/[class*=social]/[class*=share]/[class*=recommend]
 */

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

// 需要从 DOM 中移除的噪音选择器
const NOISE_SELECTORS = [
  "nav", "aside", "footer", "header",
  "script", "style", "noscript", "iframe",
  "form", "button",
  "[role='banner']", "[role='navigation']", "[role='complementary']",
  "[role='contentinfo']", "[role='dialog']", "[role='alertdialog']",
  // 广告相关
  "[class*='ad-']", "[class*='-ad']", "[id*='ad-']", "[id*='-ad']",
  "[class*='advert']", "[id*='advert']",
  "[class*='sponsor']", "[id*='sponsor']",
  // 侧边栏
  "[class*='sidebar']", "[id*='sidebar']",
  "[class*='side-bar']", "[id*='side-bar']",
  // 导航/菜单
  "[class*='navbar']", "[class*='nav-bar']",
  "[class*='navigation']", "[class*='menu']",
  "[class*='breadcrumb']",
  // 页眉/页脚
  "[class*='footer']", "[id*='footer']",
  "[class*='header']", "[id*='header']",
  // 弹窗/通知
  "[class*='cookie']", "[class*='popup']",
  "[class*='modal']", "[class*='overlay']",
  "[class*='banner']", "[id*='banner']",
  // 社交/分享
  "[class*='social']", "[class*='share']",
  "[class*='follow']", "[class*='subscribe']",
  // 推荐/相关内容
  "[class*='recommend']", "[class*='related']",
  "[class*='more-article']", "[class*='read-more']",
  "[class*='popular']", "[class*='trending']",
  // 评论区
  "[class*='comment']", "[id*='comment']",
  "[class*='disqus']", "[id*='disqus']",
  // 搜索框
  "[class*='search']", "[id*='search']",
  // 标签云
  "[class*='tag-cloud']", "[class*='tagcloud']",
  // 作者信息（通常在文章末尾）
  "[class*='author-bio']", "[class*='author-info']",
];

export interface ExtractedContent {
  title: string;
  text: string;
  excerpt: string;
  byline: string | null;
  siteName: string | null;
  publishedTime: string | null;
  /** 字符数 */
  length: number;
  /** 使用的提取策略 */
  strategy: "readability" | "semantic" | "cleaned-body";
}

/**
 * 从 HTML 字符串中提取正文内容
 * @param html 原始 HTML
 * @param url  文档的原始 URL（Readability 需要用于相对链接解析）
 */
export function extractMainContent(html: string, url: string): ExtractedContent {
  // ── 策略 1：Readability ──────────────────────────────────────────────────
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document, {
      charThreshold: 100,
      keepClasses: false,
    });
    const article = reader.parse();

    if (article && article.textContent && article.textContent.trim().length > 200) {
      const text = cleanText(article.textContent);
      return {
        title: article.title ?? "",
        text,
        excerpt: article.excerpt ?? text.slice(0, 300),
        byline: article.byline ?? null,
        siteName: article.siteName ?? null,
        publishedTime: article.publishedTime ?? null,
        length: text.length,
        strategy: "readability",
      };
    }
  } catch (e) {
    console.warn("[content-extractor] Readability failed:", e instanceof Error ? e.message : e);
  }

  // ── 策略 2：语义化标签提取 ───────────────────────────────────────────────
  try {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // 移除噪音节点
    removeNoise(doc);

    // 优先 <article>，次选 <main>，再选 <section>
    const candidates = [
      ...Array.from(doc.querySelectorAll("article")),
      ...Array.from(doc.querySelectorAll("main")),
      ...Array.from(doc.querySelectorAll("section")),
    ];

    for (const el of candidates) {
      const text = cleanText(el.textContent ?? "");
      if (text.length > 300) {
        const title = doc.querySelector("title")?.textContent ?? "";
        return {
          title: cleanText(title),
          text,
          excerpt: text.slice(0, 300),
          byline: null,
          siteName: null,
          publishedTime: null,
          length: text.length,
          strategy: "semantic",
        };
      }
    }
  } catch (e) {
    console.warn("[content-extractor] Semantic extraction failed:", e instanceof Error ? e.message : e);
  }

  // ── 策略 3：清洗后的 body 全文 ───────────────────────────────────────────
  try {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    removeNoise(doc);
    const text = cleanText(doc.body?.textContent ?? "");
    const title = doc.querySelector("title")?.textContent ?? "";
    return {
      title: cleanText(title),
      text,
      excerpt: text.slice(0, 300),
      byline: null,
      siteName: null,
      publishedTime: null,
      length: text.length,
      strategy: "cleaned-body",
    };
  } catch (e) {
    console.warn("[content-extractor] Cleaned-body extraction failed:", e instanceof Error ? e.message : e);
  }

  // 兜底：返回空内容
  return {
    title: "",
    text: "",
    excerpt: "",
    byline: null,
    siteName: null,
    publishedTime: null,
    length: 0,
    strategy: "cleaned-body",
  };
}

// ── 辅助函数 ─────────────────────────────────────────────────────────────────

function removeNoise(doc: Document): void {
  for (const selector of NOISE_SELECTORS) {
    try {
      doc.querySelectorAll(selector).forEach((el) => el.remove());
    } catch {
      // 忽略无效选择器
    }
  }
}

function cleanText(raw: string): string {
  return raw
    // 合并连续空白
    .replace(/[ \t]+/g, " ")
    // 合并连续换行（最多保留两个）
    .replace(/\n{3,}/g, "\n\n")
    // 移除行首行尾空白
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

/**
 * 从 Markdown 文本中提取正文（用于 Jina/Firecrawl 已返回 Markdown 的情况）
 * 过滤掉常见的 Markdown 噪音模式（导航链接列表、图片行、分隔线等）
 * 并将行内链接替换为纯文本（去掉 URL，保留链接文字）
 */
export function cleanMarkdown(md: string): string {
  /**
   * 将行内 Markdown 链接替换为纯文本，并移除裸 URL
   * [text](url) → text（若 text 本身是 URL 则整体删除）
   * ![alt](url) → 删除
   * https://... → 删除
   */
  function stripLinks(text: string): string {
    return text
      // 图片链接 → 删除
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
      // 普通链接 [text](url) → 保留 text（若 text 是 URL 或空则删除）
      .replace(/\[([^\]]*)\]\([^)]+\)/g, (_m, t) => {
        const clean = t.trim();
        if (!clean || /^https?:\/\//i.test(clean)) return "";
        return clean;
      })
      // 裸 URL → 删除
      .replace(/https?:\/\/[^\s)>"'\]]+/g, "")
      .trim();
  }

  const lines = md.split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过纯图片行
    if (/^!\[.*\]\(.+\)$/.test(trimmed)) continue;
    // 跳过分隔线
    if (/^[-*_]{3,}$/.test(trimmed)) continue;
    // 跳过只有数字/符号的行（页码、版权符号等）
    if (/^[\d©®™\s|·•–—]+$/.test(trimmed)) continue;
    // 跳过版权声明行
    if (/(\u00a9|Copyright|All rights reserved|版权所有)/i.test(trimmed) && trimmed.length < 120) continue;
    // 跳过常见 UI/导航单行关键词
    if (/^(首页|Home|导航|Navigation|登录|Login|注册|Register|搜索|Search|返回顶部|Back to top|Cookie|Privacy Policy|Terms of Service|版权所有|All rights reserved|Share this page|Show external content|Remember my choice|Your choice will be saved)$/i.test(trimmed)) continue;

    // 对行内链接进行清洗
    const stripped = stripLinks(trimmed);

    // 清洗后为空 → 跳过
    if (!stripped) continue;
    // 清洗后极短（< 4 字符）→ 跳过
    if (stripped.length < 4) continue;

    // 列表项：清洗后文字很短（< 25 字符）且不含中文/英文实质内容 → 可能是导航项，跳过
    const isBullet = /^[-*+]\s/.test(trimmed);
    if (isBullet && stripped.length < 25 && !/[\u4e00-\u9fa5]/.test(stripped)) continue;

    // 保留行（用清洗后内容替换原行，保留缩进）
    const indent = line.match(/^(\s*)/)?.[1] ?? "";
    // 标题行：保留 # 符号
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const headingText = stripLinks(headingMatch[2]);
      if (headingText.length >= 4) {
        cleaned.push(`${indent}${headingMatch[1]} ${headingText}`);
      }
      continue;
    }
    // 列表行：保留列表符号
    if (isBullet) {
      const bulletContent = stripLinks(trimmed.replace(/^[-*+]\s+/, ""));
      if (bulletContent.length >= 4) {
        cleaned.push(`${indent}- ${bulletContent}`);
      }
      continue;
    }

    cleaned.push(`${indent}${stripped}`);
  }

  // 合并连续空行
  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
