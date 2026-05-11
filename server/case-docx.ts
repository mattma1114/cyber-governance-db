import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from "docx";

const TYPE_LABELS: Record<string, string> = {
  judicial: "司法内容",
  regulatory: "监管执法",
  legislative: "立法政策",
  academic: "学术研究",
  other: "其他",
};

/** Strip Markdown markers from text */
function stripMd(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/__([^_]*)__/g, "$1")
    .replace(/_([^_]*)_/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/`([^`]*)`/g, "$1")
    .trim();
}

/** Split AI analysis into numbered paragraphs */
function splitAnalysis(text: string | null | undefined): string[] {
  if (!text) return [];
  const merged = text.replace(/\r?\n/g, " ").replace(/\s{2,}/g, " ").trim();
  const rawParts = merged.split(/(?=\d+\.\s)/).map((s) => s.trim()).filter(Boolean);
  const parts = rawParts.length > 1 ? rawParts : [merged];
  return parts.map((p) => stripMd(p));
}

export interface CaseDocxData {
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

export async function generateCaseDocx(data: CaseDocxData): Promise<Buffer> {
  const typeLabel = TYPE_LABELS[data.type] ?? data.type;
  const tags = data.tags ?? [];
  const now = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

  const children: Paragraph[] = [];

  // ── Cover ──────────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: typeLabel, size: 18, color: "FFFFFF", bold: true, font: "Noto Sans SC" })],
      shading: { type: ShadingType.SOLID, color: "1A3A6E", fill: "1A3A6E" },
      spacing: { before: 0, after: 120 },
    }),
    new Paragraph({
      text: data.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    }),
  );

  if (data.titleEn) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: data.titleEn, italics: true, color: "5A6A8A", size: 22 })],
        spacing: { before: 0, after: 240 },
      }),
    );
  }

  // Meta table
  const metaRows: Array<[string, string]> = [];
  if (data.date) metaRows.push(["日期", data.date]);
  if (data.source) metaRows.push(["来源机构", data.source]);
  if (data.jurisdictionLabel) metaRows.push(["司法辖区", `${data.jurisdictionFlag ?? ""} ${data.jurisdictionLabel}`.trim()]);
  if (data.topicLabel) metaRows.push(["研究专题", data.topicLabel]);
  if (data.sourceUrl) metaRows.push(["原文链接", data.sourceUrl]);

  if (metaRows.length > 0) {
    const tableRows = metaRows.map(([label, val]) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: "8A9AB5" })] })],
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "F8FAFF", fill: "F8FAFF" },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
            },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: val, size: 18 })] })],
            width: { size: 80, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
            },
          }),
        ],
      })
    );

    children.push(
      new Paragraph({ text: "", spacing: { before: 120, after: 0 } }),
    );
    // @ts-ignore — Table is a valid child in docx
    children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }) as any);
    children.push(new Paragraph({ text: "", spacing: { before: 240, after: 0 } }));
  }

  // ── Section helper ─────────────────────────────────────────────────────────
  const addSection = (title: string, body: string, paragraphs?: string[]) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "│ ", color: "1A3A6E", bold: true }),
          new TextRun({ text: title, bold: true, size: 26, color: "0D1B3E" }),
        ],
        spacing: { before: 360, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" } },
      }),
    );

    if (paragraphs && paragraphs.length > 0) {
      paragraphs.forEach((p) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: p, size: 22 })],
            spacing: { before: 80, after: 80 },
            indent: { firstLine: 440 },
          }),
        );
      });
    } else if (body) {
      const lines = body.split(/\n/).filter(Boolean);
      lines.forEach((line) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 22 })],
            spacing: { before: 60, after: 60 },
          }),
        );
      });
    }
  };

  if (data.abstract) addSection("内容摘要", stripMd(data.abstract));
  if (data.aiSummary) addSection("AI 摘要解读", stripMd(data.aiSummary));
  if (data.aiAnalysis) addSection("深度法律分析", "", splitAnalysis(data.aiAnalysis));

  if (tags.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "│ ", color: "1A3A6E", bold: true }),
          new TextRun({ text: "相关标签", bold: true, size: 26, color: "0D1B3E" }),
        ],
        spacing: { before: 360, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" } },
      }),
      new Paragraph({
        children: [new TextRun({ text: tags.join("  ·  "), size: 20, color: "1A3A6E" })],
        spacing: { before: 80, after: 80 },
      }),
    );
  }

  if (data.fullText) addSection("原文全文", stripMd(data.fullText));

  // ── Footer ─────────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({ text: "", spacing: { before: 480, after: 0 } }),
    new Paragraph({
      children: [
        new TextRun({ text: "互联网平台治理数据库 · 浙江传媒学院", size: 16, color: "8A9AB5" }),
        new TextRun({ text: "  |  ", size: 16, color: "C8D3E8" }),
        new TextRun({ text: `导出日期：${now}`, size: 16, color: "8A9AB5" }),
      ],
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" } },
      spacing: { before: 120, after: 0 },
    }),
  );

  const doc = new Document({
    creator: "互联网平台治理数据库",
    title: data.title,
    description: data.abstract ?? "",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
