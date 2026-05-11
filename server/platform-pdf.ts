import puppeteer from "puppeteer-core";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from "docx";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PlatformExportData {
  id: string;
  name: string;
  abbr?: string | null;
  company?: string | null;
  hq?: string | null;
  founded?: number | null;
  website?: string | null;
  description?: string | null;
  portrait?: any;
  timeline?: any;
  rules?: any;
  jurisdictionLabels?: string[];
  profileFeatures?: string | null;
  developmentHistory?: string | null;
}

// ── HTML builder for PDF ──────────────────────────────────────────────────────
function buildPlatformHtml(p: PlatformExportData): string {
  const now = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const jurisStr = (p.jurisdictionLabels ?? []).join("、");

  // Portrait table
  const portraitData: Array<[string, string]> = [];
  if (p.portrait) {
    const portrait = typeof p.portrait === "string" ? JSON.parse(p.portrait) : p.portrait;
    const LABELS: Record<string, string> = {
      type: "平台类型", businessModel: "商业模式", userScale: "用户规模",
      revenueModel: "营收模式", dataType: "数据类型", marketPosition: "市场地位",
      regulatoryStatus: "监管状态", contentPolicy: "内容政策",
    };
    for (const [k, v] of Object.entries(portrait)) {
      if (v && LABELS[k]) portraitData.push([LABELS[k], String(v)]);
    }
  }
  const portraitRows = portraitData.map(([label, val]) => `
    <tr>
      <td class="label-cell">${label}</td>
      <td class="value-cell">${val}</td>
    </tr>`).join("");

  // Timeline
  const timelineData: Array<{ date: string; event: string }> = [];
  if (p.timeline) {
    const tl = typeof p.timeline === "string" ? JSON.parse(p.timeline) : p.timeline;
    if (Array.isArray(tl)) {
      tl.forEach((item: any) => {
        if (item.date || item.event) timelineData.push({ date: item.date ?? "", event: item.event ?? "" });
      });
    }
  }
  const timelineRows = timelineData.map(item => `
    <tr>
      <td class="date-cell">${item.date}</td>
      <td class="value-cell">${item.event}</td>
    </tr>`).join("");

  // Rules
  const rulesData: any[] = p.rules
    ? (typeof p.rules === "string" ? JSON.parse(p.rules) : p.rules)
    : [];
  const ruleGroupsMap = new Map<string, any[]>();
  rulesData.forEach((r: any) => {
    const key = r.title ?? r.type ?? "未命名协议";
    if (!ruleGroupsMap.has(key)) ruleGroupsMap.set(key, []);
    ruleGroupsMap.get(key)!.push(r);
  });
  const rulesHtml = Array.from(ruleGroupsMap.entries()).map(([groupTitle, versions]) => {
    const sorted = [...versions].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    const rows = sorted.map((r: any) => {
      const vLabel = [r.date, r.version].filter(Boolean).join("  ·  ");
      const linkCell = r.url
        ? `<a href="${r.url}" class="link">${r.url}</a>`
        : `<span class="muted">无链接</span>`;
      return `<tr>
        <td class="date-cell">${vLabel || "—"}</td>
        <td class="value-cell">${linkCell}</td>
      </tr>`;
    }).join("");
    return `<div class="rule-group">
      <div class="rule-group-title">${groupTitle}</div>
      <table class="data-table">${rows}</table>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${p.name} — 平台档案</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #1a202c;
      background: #fff;
      font-size: 13px;
      line-height: 1.7;
    }
    @page { margin: 18mm 20mm 22mm 20mm; size: A4; }
    .page { max-width: 170mm; margin: 0 auto; padding: 20mm 0 28mm; }

    /* Cover */
    .cover { border-bottom: 3px solid #1e3a5f; padding-bottom: 18px; margin-bottom: 24px; }
    .cover-badge {
      display: inline-block;
      background: #1e3a5f;
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: .08em;
      padding: 3px 10px;
      border-radius: 3px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    h1 { font-size: 24px; font-weight: 700; color: #1e3a5f; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #666; margin-top: 4px; }
    .meta-row { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 10px; font-size: 12px; color: #555; }
    .meta-item { display: flex; gap: 4px; }
    .meta-label { color: #999; }

    /* Section */
    .section { margin-top: 28px; }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e3a5f;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 14px;
      letter-spacing: .04em;
    }

    /* Description */
    .desc { font-size: 13px; line-height: 1.9; color: #2d3748; text-align: justify; }

    /* Tables */
    .data-table { width: 100%; border-collapse: collapse; }
    .label-cell {
      font-size: 11.5px;
      color: #718096;
      font-weight: 500;
      width: 90px;
      padding: 7px 12px 7px 0;
      vertical-align: top;
      border-bottom: 1px solid #f1f5f9;
    }
    .value-cell {
      font-size: 12.5px;
      color: #2d3748;
      padding: 7px 0;
      border-bottom: 1px solid #f1f5f9;
      line-height: 1.6;
    }
    .date-cell {
      font-size: 11px;
      font-family: monospace;
      color: #718096;
      width: 90px;
      padding: 7px 12px 7px 0;
      vertical-align: top;
      border-bottom: 1px solid #f1f5f9;
      white-space: nowrap;
    }

    /* Rules */
    .rule-group { margin-bottom: 18px; }
    .rule-group-title { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .link { font-size: 11.5px; color: #1e3a5f; word-break: break-all; text-decoration: none; }
    .muted { font-size: 11.5px; color: #bbb; }

    /* Long text sections */
    .longtext { font-size: 12.5px; line-height: 1.9; color: #2d3748; text-align: justify; white-space: pre-wrap; }

    /* Footer */
    .footer {
      position: fixed;
      bottom: 16px;
      left: 20mm;
      right: 20mm;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #a0aec0;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
    @media print {
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="cover">
    <div class="cover-badge">平台档案</div>
    <h1>${p.name}${p.abbr && p.abbr !== p.name ? ` (${p.abbr})` : ""}</h1>
    ${p.company ? `<div class="subtitle">${p.company}</div>` : ""}
    <div class="meta-row">
      ${p.hq ? `<div class="meta-item"><span class="meta-label">总部</span>${p.hq}</div>` : ""}
      ${p.founded ? `<div class="meta-item"><span class="meta-label">创立</span>${p.founded} 年</div>` : ""}
      ${jurisStr ? `<div class="meta-item"><span class="meta-label">司法辖区</span>${jurisStr}</div>` : ""}
      ${p.website ? `<div class="meta-item"><span class="meta-label">官网</span>${p.website}</div>` : ""}
    </div>
  </div>

  ${p.description ? `
  <div class="section">
    <div class="section-title">平台简介</div>
    <p class="desc">${p.description}</p>
  </div>` : ""}

  ${portraitRows ? `
  <div class="section">
    <div class="section-title">平台结构画像</div>
    <table class="data-table">${portraitRows}</table>
  </div>` : ""}

  ${p.profileFeatures ? `
  <div class="section">
    <div class="section-title">核心功能特征</div>
    <div class="longtext">${p.profileFeatures}</div>
  </div>` : ""}

  ${timelineRows ? `
  <div class="section">
    <div class="section-title">发展历程</div>
    <table class="data-table">${timelineRows}</table>
  </div>` : ""}

  ${p.developmentHistory ? `
  <div class="section">
    <div class="section-title">发展历史详述</div>
    <div class="longtext">${p.developmentHistory}</div>
  </div>` : ""}

  ${rulesHtml ? `
  <div class="section">
    <div class="section-title">规则文件</div>
    ${rulesHtml}
  </div>` : ""}

  <div class="footer">
    <span>互联网平台治理数据库 · 浙江传媒学院</span>
    <span>导出日期：${now}</span>
  </div>
</div>
</body>
</html>`;
}

// ── PDF export ────────────────────────────────────────────────────────────────
export async function generatePlatformPdf(data: PlatformExportData): Promise<Buffer> {
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
    const html = buildPlatformHtml(data);
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "24mm", left: "20mm", right: "20mm" },
      displayHeaderFooter: false,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// ── Word (docx) export ────────────────────────────────────────────────────────
export async function generatePlatformDocx(data: PlatformExportData): Promise<Buffer> {
  // docx section children can be Paragraph or Table
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(new Paragraph({
    text: `${data.name}${data.abbr && data.abbr !== data.name ? ` (${data.abbr})` : ""} — 平台档案`,
    heading: HeadingLevel.TITLE,
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1e3a5f" } },
  }));

  if (data.company) {
    children.push(new Paragraph({
      children: [new TextRun({ text: data.company, color: "555555", size: 24 })],
      spacing: { after: 100 },
    }));
  }

  // Meta info
  const metaItems: string[] = [];
  if (data.hq) metaItems.push(`总部：${data.hq}`);
  if (data.founded) metaItems.push(`创立：${data.founded} 年`);
  if (data.jurisdictionLabels?.length) metaItems.push(`司法辖区：${data.jurisdictionLabels.join("、")}`);
  if (data.website) metaItems.push(`官网：${data.website}`);
  if (metaItems.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: metaItems.join("    "), color: "666666", size: 20 })],
      spacing: { after: 400 },
    }));
  }

  const addSection = (title: string) => {
    children.push(new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }));
  };

  const addParagraph = (text: string) => {
    children.push(new Paragraph({
      children: [new TextRun({ text, size: 24 })],
      spacing: { after: 160 },
      alignment: AlignmentType.JUSTIFIED,
    }));
  };

  // Description
  if (data.description) {
    addSection("平台简介");
    addParagraph(data.description);
  }

  // Portrait
  if (data.portrait) {
    const portrait = typeof data.portrait === "string" ? JSON.parse(data.portrait) : data.portrait;
    const LABELS: Record<string, string> = {
      type: "平台类型", businessModel: "商业模式", userScale: "用户规模",
      revenueModel: "营收模式", dataType: "数据类型", marketPosition: "市场地位",
      regulatoryStatus: "监管状态", contentPolicy: "内容政策",
    };
    const rows = Object.entries(portrait).filter(([k, v]) => v && LABELS[k]);
    if (rows.length) {
      addSection("平台结构画像");
      const tableRows = rows.map(([k, v]) => new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: LABELS[k], bold: true, size: 20, color: "555555" })] })],
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "f8fafc" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(v), size: 22 })] })],
            width: { size: 80, type: WidthType.PERCENTAGE },
          }),
        ],
      }));
      children.push(new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
    }
  }

  // Profile Features
  if (data.profileFeatures) {
    addSection("核心功能特征");
    data.profileFeatures.split("\n").filter(Boolean).forEach(line => addParagraph(line));
  }

  // Timeline
  if (data.timeline) {
    const tl = typeof data.timeline === "string" ? JSON.parse(data.timeline) : data.timeline;
    if (Array.isArray(tl) && tl.length) {
      addSection("发展历程");
      const tableRows = tl.filter((item: any) => item.date || item.event).map((item: any) => new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.date ?? "", size: 20, color: "718096", font: "Courier New" })] })],
            width: { size: 18, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "f8fafc" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: item.event ?? "", size: 22 })] })],
            width: { size: 82, type: WidthType.PERCENTAGE },
          }),
        ],
      }));
      children.push(new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
    }
  }

  // Development History
  if (data.developmentHistory) {
    addSection("发展历史详述");
    data.developmentHistory.split("\n").filter(Boolean).forEach(line => addParagraph(line));
  }

  // Rules
  if (data.rules) {
    const rulesArr = typeof data.rules === "string" ? JSON.parse(data.rules) : data.rules;
    if (Array.isArray(rulesArr) && rulesArr.length) {
      addSection("规则文件");
      const ruleGroupsMap = new Map<string, any[]>();
      rulesArr.forEach((r: any) => {
        const key = r.title ?? r.type ?? "未命名协议";
        if (!ruleGroupsMap.has(key)) ruleGroupsMap.set(key, []);
        ruleGroupsMap.get(key)!.push(r);
      });
      for (const [groupTitle, versions] of Array.from(ruleGroupsMap.entries())) {
        children.push(new Paragraph({
          children: [new TextRun({ text: groupTitle, bold: true, size: 22 })],
          spacing: { before: 200, after: 100 },
        }));
        const sorted = [...versions].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
        sorted.forEach((r: any) => {
          const vLabel = [r.date, r.version].filter(Boolean).join("  ·  ");
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${vLabel ? vLabel + "  " : ""}`, color: "718096", size: 20 }),
              new TextRun({ text: r.url ?? "无链接", color: r.url ? "1e3a5f" : "aaaaaa", size: 20 }),
            ],
            spacing: { after: 80 },
          }));
        });
      }
    }
  }

  // Footer note
  const exportDate = new Date().toLocaleDateString("zh-CN");
  children.push(new Paragraph({
    children: [new TextRun({ text: `互联网平台治理数据库 · 浙江传媒学院    导出日期：${exportDate}`, color: "aaaaaa", size: 18 })],
    spacing: { before: 600 },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: "e2e8f0" } },
  }));

  const doc = new Document({
    creator: "互联网平台治理数据库",
    title: `${data.name} — 平台档案`,
    sections: [{
      properties: {},
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
