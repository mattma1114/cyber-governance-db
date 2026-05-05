import puppeteer from "puppeteer-core";

interface PdfCaseData {
  title: string;
  titleEn?: string | null;
  type: string;
  date?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  abstract?: string | null;
  aiSummary?: string | null;
  aiAnalysis?: string | null;
  fullText?: string | null;
  topicLabel?: string | null;
  jurisdictionLabel?: string | null;
  jurisdictionFlag?: string | null;
  tags?: string[];
}

const TYPE_LABELS: Record<string, string> = {
  judicial: "司法内容",
  regulatory: "监管执法",
  legislative: "立法政策",
  academic: "学术研究",
  other: "其他",
};

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}

function buildHtml(data: PdfCaseData): string {
  const now = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const typeLabel = TYPE_LABELS[data.type] ?? data.type;
  const tags = data.tags ?? [];

  const sections: string[] = [];

  // Abstract
  if (data.abstract) {
    sections.push(`
      <section class="section">
        <h2 class="section-title">内容摘要</h2>
        <div class="section-body">${escapeHtml(data.abstract)}</div>
      </section>`);
  }

  // AI Summary
  if (data.aiSummary) {
    sections.push(`
      <section class="section ai-section">
        <h2 class="section-title ai-title">✦ AI 摘要解读</h2>
        <div class="section-body">${escapeHtml(data.aiSummary)}</div>
      </section>`);
  }

  // AI Analysis
  if (data.aiAnalysis) {
    sections.push(`
      <section class="section analysis-section">
        <h2 class="section-title analysis-title">⚖ 深度法律分析</h2>
        <div class="section-body">${escapeHtml(data.aiAnalysis)}</div>
      </section>`);
  }

  // Tags
  if (tags.length > 0) {
    const tagHtml = tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
    sections.push(`
      <section class="section">
        <h2 class="section-title">相关标签</h2>
        <div class="tags">${tagHtml}</div>
      </section>`);
  }

  // Full Text
  if (data.fullText) {
    sections.push(`
      <section class="section fulltext-section">
        <h2 class="section-title">原文全文</h2>
        <div class="section-body fulltext">${escapeHtml(data.fullText)}</div>
      </section>`);
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@400;500&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Noto Serif SC', 'Noto Serif CJK SC', 'Noto Sans CJK SC', serif;
      font-size: 13px;
      line-height: 1.8;
      color: #1a1a2e;
      background: #fff;
      padding: 0;
    }

    .cover {
      padding: 56px 60px 40px;
      border-bottom: 3px solid #1a3a6e;
      background: linear-gradient(135deg, #f8faff 0%, #eef3fb 100%);
      page-break-after: avoid;
    }

    .cover-badge {
      display: inline-block;
      padding: 3px 10px;
      background: #1a3a6e;
      color: #fff;
      font-size: 11px;
      border-radius: 3px;
      margin-bottom: 16px;
      font-family: 'Noto Sans SC', sans-serif;
    }

    .cover h1 {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.4;
      color: #0d1b3e;
      margin-bottom: 8px;
    }

    .cover .title-en {
      font-size: 13px;
      color: #5a6a8a;
      font-style: italic;
      margin-bottom: 20px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      margin-top: 20px;
    }

    .meta-item {
      font-size: 11.5px;
      color: #4a5568;
      font-family: 'Noto Sans SC', sans-serif;
    }

    .meta-item .label {
      color: #8a9ab5;
      margin-right: 4px;
    }

    .meta-item a {
      color: #1a3a6e;
      text-decoration: none;
      word-break: break-all;
    }

    .content {
      padding: 36px 60px 60px;
    }

    .section {
      margin-bottom: 28px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0d1b3e;
      border-left: 3px solid #1a3a6e;
      padding-left: 10px;
      margin-bottom: 12px;
      font-family: 'Noto Sans SC', sans-serif;
    }

    .ai-section {
      background: #f0f4ff;
      border-radius: 6px;
      padding: 16px 18px;
      border-left: 4px solid #3b5bdb;
    }

    .ai-title {
      color: #3b5bdb;
      border-left-color: #3b5bdb;
    }

    .analysis-section {
      background: #fffbf0;
      border-radius: 6px;
      padding: 16px 18px;
      border-left: 4px solid #d97706;
    }

    .analysis-title {
      color: #b45309;
      border-left-color: #d97706;
    }

    .section-body {
      font-size: 12.5px;
      line-height: 1.9;
      color: #2d3748;
      text-align: justify;
    }

    .fulltext-section {
      border-top: 1px dashed #c8d3e8;
      padding-top: 20px;
    }

    .fulltext {
      font-size: 11.5px;
      line-height: 1.85;
      color: #4a5568;
      max-height: none;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tag {
      display: inline-block;
      padding: 2px 10px;
      background: #e8edf8;
      color: #1a3a6e;
      border-radius: 20px;
      font-size: 11px;
      font-family: 'Noto Sans SC', sans-serif;
    }

    .footer {
      position: fixed;
      bottom: 20px;
      left: 60px;
      right: 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #8a9ab5;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      font-family: 'Noto Sans SC', sans-serif;
    }

    @media print {
      .section { page-break-inside: avoid; }
      .fulltext-section { page-break-before: always; }
    }
  </style>
</head>
<body>
  <!-- Cover / Header -->
  <div class="cover">
    <div class="cover-badge">${escapeHtml(typeLabel)}</div>
    <h1>${escapeHtml(data.title)}</h1>
    ${data.titleEn ? `<p class="title-en">${escapeHtml(data.titleEn)}</p>` : ""}
    <div class="meta-grid">
      ${data.date ? `<div class="meta-item"><span class="label">日期</span>${escapeHtml(data.date)}</div>` : ""}
      ${data.source ? `<div class="meta-item"><span class="label">来源机构</span>${escapeHtml(data.source)}</div>` : ""}
      ${data.jurisdictionLabel ? `<div class="meta-item"><span class="label">司法辖区</span>${data.jurisdictionFlag ? data.jurisdictionFlag + " " : ""}${escapeHtml(data.jurisdictionLabel)}</div>` : ""}
      ${data.topicLabel ? `<div class="meta-item"><span class="label">研究专题</span>${escapeHtml(data.topicLabel)}</div>` : ""}
      ${data.sourceUrl ? `<div class="meta-item" style="grid-column:1/-1"><span class="label">原文链接</span><a href="${escapeHtml(data.sourceUrl)}">${escapeHtml(data.sourceUrl)}</a></div>` : ""}
    </div>
  </div>

  <!-- Main Content -->
  <div class="content">
    ${sections.join("\n")}
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>${escapeHtml(data.source ?? "互联网平台治理数据库 · 浙江传媒学院")}</span>
    <span>导出日期：${now}</span>
  </div>
</body>
</html>`;
}

export async function generateCasePdf(data: PdfCaseData): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    const html = buildHtml(data);
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

    // Wait for fonts to load
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "28mm", left: "0", right: "0" },
      displayHeaderFooter: false,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
