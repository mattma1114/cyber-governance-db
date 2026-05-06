import { useState, useCallback } from "react";
import { Streamdown } from "streamdown";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Building2, MapPin, Calendar, Globe, ExternalLink,
  LayoutGrid, Clock, FileText, Scale, Network, ChevronRight, Download, Loader2
} from "lucide-react";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS } from "@/lib/utils";

// ── Portrait item: label + value, separated by bottom border ──
function PortraitItem({ label, value }: { label: string; value: string | string[] }) {
  return (
    <div className="flex flex-col gap-1.5 py-4 border-b border-border last:border-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
          ))}
        </div>
      ) : (
        <span className="text-sm text-foreground leading-relaxed">{value}</span>
      )}
    </div>
  );
}

// ── FullTextSection: renders rule full text with expand/collapse ──
function FullTextSection({ fullText }: { fullText: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = fullText.length > 3000;
  return (
    <div className="pt-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">规则全文</p>
        <span className="text-xs text-muted-foreground">{fullText.length.toLocaleString()} 字符</span>
      </div>
      <div
        className={`relative overflow-hidden transition-all duration-300 ${
          isLong && !expanded ? "max-h-[600px]" : ""
        }`}
      >
        <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground dark:prose-invert">
          <Streamdown>{fullText}</Streamdown>
        </div>
        {isLong && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs text-primary hover:underline focus:outline-none"
        >
          {expanded ? "收起" : "展开全文"}
        </button>
      )}
    </div>
  );
}

// ── Nav items config ──
const NAV_ITEMS = [
  { key: "portrait", label: "平台画像", icon: LayoutGrid },
  { key: "timeline", label: "发展时间线", icon: Clock },
  { key: "rules", label: "规则文件", icon: FileText },
  { key: "cases", label: "关联内容", icon: Scale },
] as const;

type NavKey = typeof NAV_ITEMS[number]["key"];

const PORTRAIT_LABELS: Record<string, string> = {
  types: "平台类型",
  structure: "市场结构",
  contentSource: "内容来源",
  networkEffect: "网络效应",
  businessModel: "商业模式",
  openness: "开放程度",
  crossBorder: "跨境运营",
};

export default function PlatformDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<NavKey>("portrait");
  const [selectedRuleTitle, setSelectedRuleTitle] = useState<string>("");
  const [selectedRuleVersion, setSelectedRuleVersion] = useState<string>("");
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: p, isLoading } = trpc.platforms.getById.useQuery({ id: id ?? "" }, { enabled: !!id });
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: topics } = trpc.topics.list.useQuery();

  const relatedCaseIds: string[] = (() => {
    if (!p?.relatedCaseIds) return [];
    return typeof p.relatedCaseIds === "string"
      ? JSON.parse(p.relatedCaseIds)
      : (p.relatedCaseIds as string[]);
  })();

  const { data: relatedCasesData } = trpc.cases.list.useQuery(
    { page: 1, pageSize: 20 },
    { enabled: relatedCaseIds.length > 0 }
  );

  const handleExportPdf = useCallback(() => {
    if (!p) return;
    setIsPrinting(true);

    // 构建打印内容 HTML
    const jurisArrLocal: string[] = Array.isArray(p.jurisdiction)
      ? p.jurisdiction
      : (p.jurisdiction ? JSON.parse(p.jurisdiction as string) : []);
    const jurisLabelsLocal = jurisArrLocal
      .map((jid) => jurisdictions?.find((j) => j.id === jid))
      .filter(Boolean);
    const jurisLabelStrLocal = jurisLabelsLocal
      .map((j: any) => `${j?.flag ?? ""} ${j?.label ?? ""}`)
      .join("  ·  ");

    const portraitLocal: any = p.portrait
      ? (typeof p.portrait === "string" ? JSON.parse(p.portrait) : p.portrait)
      : null;

    const timelineLocal: any[] = p.timeline
      ? (typeof p.timeline === "string" ? JSON.parse(p.timeline) : p.timeline)
      : [];

    const portraitLabels: Record<string, string> = {
      types: "平台类型",
      structure: "市场结构",
      contentSource: "内容来源",
      networkEffect: "网络效应",
      businessModel: "商业模式",
      openness: "开放程度",
      crossBorder: "跨境运营",
    };

    const portraitRows = portraitLocal
      ? Object.entries(portraitLabels)
          .map(([key, label]) => {
            const val = portraitLocal[key];
            if (!val) return "";
            const display = Array.isArray(val) ? val.join("、") : val;
            return `<tr>
              <td style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.06em;width:90px;padding:8px 12px 8px 0;vertical-align:top;border-bottom:1px solid #f3f4f6">${label}</td>
              <td style="font-size:13px;color:#333;line-height:1.6;padding:8px 0;border-bottom:1px solid #f3f4f6">${display}</td>
            </tr>`;
          })
          .join("")
      : "";

    const timelineRows = timelineLocal
      .map(
        (item: any) =>
          `<tr>
            <td style="font-size:11px;font-family:monospace;color:#888;width:80px;padding:8px 12px 8px 0;vertical-align:top;border-bottom:1px solid #f3f4f6">${item.date ?? ""}</td>
            <td style="font-size:13px;color:#333;line-height:1.7;padding:8px 0;border-bottom:1px solid #f3f4f6">${item.event ?? ""}</td>
          </tr>`
      )
      .join("");

    // 规则文件模块：按名称分组，每组列出所有版本（名称、日期、链接）
    const rulesLocal: any[] = p.rules
      ? (typeof p.rules === "string" ? JSON.parse(p.rules) : p.rules)
      : [];
    // 按 title 分组
    const ruleGroupsLocal = new Map<string, any[]>();
    rulesLocal.forEach((r: any) => {
      const key = r.title ?? r.type ?? "未命名协议";
      if (!ruleGroupsLocal.has(key)) ruleGroupsLocal.set(key, []);
      ruleGroupsLocal.get(key)!.push(r);
    });
    const rulesHtml = Array.from(ruleGroupsLocal.entries())
      .map(([groupTitle, versions]) => {
        const sortedV = [...versions].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
        const versionRows = sortedV
          .map((r: any) => {
            const vLabel = [r.date, r.version].filter(Boolean).join("  ·  ");
            const linkCell = r.url
              ? `<a href="${r.url}" style="font-size:12px;color:#1e3a5f;word-break:break-all">${r.url}</a>`
              : `<span style="font-size:12px;color:#bbb">无链接</span>`;
            return `<tr>
              <td style="font-size:12px;color:#555;width:100px;padding:6px 12px 6px 0;vertical-align:top;border-bottom:1px solid #f3f4f6">${vLabel || "—"}</td>
              <td style="padding:6px 0;border-bottom:1px solid #f3f4f6">${linkCell}</td>
            </tr>`;
          })
          .join("");
        return `<div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:600;color:#444;margin-bottom:6px">${groupTitle}</div>
          <table style="width:100%;border-collapse:collapse">${versionRows}</table>
        </div>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${p.name} — 平台档案</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Noto Serif SC", "Source Han Serif SC", "SimSun", serif; color: #222; background: #fff; padding: 0; }
    @page { margin: 20mm 18mm; size: A4; }
    @media print { body { padding: 0; } }
    .page { max-width: 170mm; margin: 0 auto; padding: 20mm 0; }
    h1 { font-size: 22px; font-weight: bold; color: #1e3a5f; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #888; display: flex; gap: 16px; flex-wrap: wrap; margin-top: 6px; }
    .section-title { font-size: 14px; font-weight: 700; color: #1e3a5f; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; margin-top: 24px; }
    .desc { font-size: 13px; line-height: 1.8; color: #333; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #aaa; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
<div class="page">
  <div style="border-bottom:3px solid #1e3a5f;padding-bottom:16px;margin-bottom:8px">
    <h1>${p.name}${p.abbr && p.abbr !== p.name ? ` (${p.abbr})` : ""}</h1>
    ${p.company ? `<div style="font-size:13px;color:#555;margin-top:4px">${p.company}</div>` : ""}
    <div class="meta">
      ${p.hq ? `<span>总部：${p.hq}</span>` : ""}
      ${p.founded ? `<span>创立：${p.founded} 年</span>` : ""}
      ${jurisLabelStrLocal ? `<span>司法辖区：${jurisLabelStrLocal}</span>` : ""}
      ${p.website ? `<span>官网：${p.website}</span>` : ""}
    </div>
  </div>
  ${p.description ? `<p class="desc">${p.description}</p>` : ""}
  ${portraitRows ? `<div class="section-title">平台结构画像</div><table>${portraitRows}</table>` : ""}
  ${timelineRows ? `<div class="section-title">发展历程</div><table>${timelineRows}</table>` : ""}
  ${rulesHtml ? `<div class="section-title">规则文件</div>${rulesHtml}` : ""}
  <div class="footer">
    <span>互联网平台治理数据库</span>
    <span>导出日期：${new Date().toLocaleDateString("zh-CN")}</span>
  </div>
</div>
<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };<\/script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
    setTimeout(() => setIsPrinting(false), 1500);
  }, [p, jurisdictions]);

  if (isLoading) {
    return (
      <div className="container py-8 max-w-5xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground mb-4">平台不存在或已删除</p>
        <Button asChild variant="outline">
          <Link href="/platforms">返回平台列表</Link>
        </Button>
      </div>
    );
  }

  const jurisArr: string[] = Array.isArray(p.jurisdiction)
    ? p.jurisdiction
    : (p.jurisdiction ? JSON.parse(p.jurisdiction as string) : []);
  const jurisLabels = jurisArr.map((jid) => jurisdictions?.find((j) => j.id === jid)).filter(Boolean);

  const portrait: any = p.portrait
    ? (typeof p.portrait === "string" ? JSON.parse(p.portrait) : p.portrait)
    : null;

  const rules: any[] = p.rules
    ? (typeof p.rules === "string" ? JSON.parse(p.rules) : p.rules)
    : [];

  const timeline: any[] = p.timeline
    ? (typeof p.timeline === "string" ? JSON.parse(p.timeline) : p.timeline)
    : [];

  const relatedCases = relatedCasesData?.items.filter((c) =>
    relatedCaseIds.includes(String(c.id))
  ) ?? [];

  // ── Rules: group by title, then by version ──
  const ruleGroups: Map<string, any[]> = new Map();
  rules.forEach((r) => {
    const key = r.title ?? r.type ?? "未命名协议";
    if (!ruleGroups.has(key)) ruleGroups.set(key, []);
    ruleGroups.get(key)!.push(r);
  });
  const ruleTitles = Array.from(ruleGroups.keys());

  const activeRuleTitle = selectedRuleTitle || ruleTitles[0] || "";
  const versionsForTitle = ruleGroups.get(activeRuleTitle) ?? [];
  const sortedVersions = [...versionsForTitle].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? "")
  );
  const activeVersion = selectedRuleVersion || sortedVersions[0]?.date || sortedVersions[0]?.version || "";
  const activeRule = sortedVersions.find(
    (r) => (r.date ?? r.version ?? "") === activeVersion
  ) ?? sortedVersions[0];

  // ── Render content panel ──
  function renderContent() {
    switch (activeTab) {
      case "portrait":
        return portrait ? (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Network className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">平台结构七维画像</h2>
            </div>
            {Object.entries(PORTRAIT_LABELS).map(([key, label]) => {
              const val = portrait[key];
              if (!val) return null;
              return <PortraitItem key={key} label={label} value={val} />;
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-8">暂无画像数据</p>
        );

      case "timeline":
        return timeline.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">发展时间线</h2>
            </div>
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-0 pl-10">
                {timeline.map((item: any, i: number) => (
                  <div key={i} className="relative py-4 border-b border-border last:border-0">
                    <div className="absolute -left-7 top-5 w-2.5 h-2.5 rounded-full border-2 border-primary bg-background" />
                    <span className="text-xs font-mono text-muted-foreground block mb-1">{item.date}</span>
                    <p className="text-sm leading-relaxed">{item.event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-8">暂无时间线数据</p>
        );

      case "rules":
        return rules.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">规则文件</h2>
            </div>

            {/* Protocol selector row */}
            <div className="flex flex-wrap gap-2 mb-4">
              {ruleTitles.map((title) => (
                <button
                  key={title}
                  onClick={() => {
                    setSelectedRuleTitle(title);
                    setSelectedRuleVersion("");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    activeRuleTitle === title
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted text-foreground"
                  )}
                >
                  {title}
                </button>
              ))}
            </div>

            {/* Version selector */}
            {sortedVersions.length > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-5 pb-4 border-b border-border">
                <span className="text-xs text-muted-foreground shrink-0">版本 / 日期</span>
                <Select
                  value={activeVersion}
                  onValueChange={(v) => setSelectedRuleVersion(v)}
                >
                  <SelectTrigger className="h-8 text-xs w-full sm:w-52">
                    <SelectValue placeholder="选择版本" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedVersions.map((r, i) => {
                      const vLabel = r.date ?? r.version ?? `版本 ${i + 1}`;
                      return (
                        <SelectItem key={i} value={vLabel} className="text-xs">
                          {vLabel}{r.version && r.date ? ` (${r.version})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Active rule metadata */}
            {activeRule && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b border-border">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeRule.type && (
                      <Badge variant="outline" className="text-xs">{activeRule.type}</Badge>
                    )}
                    {activeRule.date && (
                      <span className="text-xs text-muted-foreground">{activeRule.date}</span>
                    )}
                    {activeRule.version && (
                      <span className="text-xs text-muted-foreground">版本：{activeRule.version}</span>
                    )}
                  </div>
                  {activeRule.url && (
                    <Button size="sm" variant="ghost" asChild className="gap-1.5 text-xs h-7">
                      <a href={activeRule.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                        查看原文
                      </a>
                    </Button>
                  )}
                </div>

                {/* Full text */}
                {activeRule.fullText ? (
                  <FullTextSection fullText={activeRule.fullText} />
                ) : (
                  <div className="pt-5 text-sm text-muted-foreground">
                    <p>暂无全文内容。</p>
                    {activeRule.url && (
                      <a
                        href={activeRule.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs mt-1 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        前往原始链接查看
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-8">暂无规则文件</p>
        );

      case "cases":
        return (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Scale className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">关联内容</h2>
              {relatedCases.length > 0 && (
                <span className="text-xs text-muted-foreground">共 {relatedCases.length} 条</span>
              )}
            </div>
            {relatedCases.length > 0 ? (
              <div>
                {relatedCases.map((c) => {
                  const topic = topics?.find((t) => t.id === c.topicId);
                  const juris = jurisdictions?.find((j) => j.id === c.jurisdictionId);
                  return (
                    <Link key={c.id} href={`/cases/${c.id}`}>
                      <div className="flex items-start gap-3 py-4 border-b border-border last:border-0 hover:bg-muted/40 -mx-2 px-2 rounded transition-colors cursor-pointer">
                        <Badge variant="secondary" className={cn("text-xs shrink-0 mt-0.5", TYPE_BADGE_CLASS[c.type])}>
                          {TYPE_LABELS[c.type]?.label}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2 mb-1">{c.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{c.date}</span>
                            {juris && <span>{juris.flag} {juris.label}</span>}
                            {topic && <span>{topic.label}</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-8">暂无关联内容</p>
            )}
          </div>
        );
    }
  }

  // ── Print-only archive view ──
  const jurisLabelStr = jurisLabels.map((j: any) => `${j?.flag ?? ""} ${j?.label ?? ""}`).join("  ·  ");

  return (
    <div className="min-h-screen">
      {/* ── Print-only archive ── */}
      <style>{`
        @media print {
          /* 隐藏页面上所有屏幕内容 */
          .platform-screen-content { display: none !important; }
          /* 显示打印内容 */
          #platform-print-root {
            position: static !important;
            left: auto !important;
            visibility: visible !important;
            display: block !important;
            width: 100% !important;
          }
          @page { margin: 20mm 18mm; size: A4; }
        }
        @media screen {
          /* 屏幕上不可见但保持布局（避免 Chrome 打印空白） */
          #platform-print-root {
            position: fixed;
            left: -9999px;
            top: 0;
            width: 210mm;
            visibility: hidden;
            pointer-events: none;
          }
        }
      `}</style>

      <div id="platform-print-root">
        {/* Cover */}
        <div style={{ borderBottom: "3px solid #1e3a5f", paddingBottom: "16px", marginBottom: "24px" }}>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1e3a5f", marginBottom: "4px" }}>
            {p.name}
          </div>
          {p.company && (
            <div style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>{p.company}</div>
          )}
          <div style={{ fontSize: "12px", color: "#888", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {p.hq && <span>总部：{p.hq}</span>}
            {p.founded && <span>创立：{p.founded} 年</span>}
            {jurisLabelStr && <span>司法辖区：{jurisLabelStr}</span>}
            {p.website && <span>官网：{p.website}</span>}
          </div>
        </div>

        {/* Description */}
        {p.description && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>平台简介</div>
            <p style={{ fontSize: "13px", lineHeight: "1.8", color: "#333" }}>{p.description}</p>
          </div>
        )}

        {/* Portrait */}
        {portrait && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", borderBottom: "1px solid #e5e7eb", paddingBottom: "6px", marginBottom: "12px" }}>
              平台结构画像
            </div>
            {Object.entries(PORTRAIT_LABELS).map(([key, label]) => {
              const val = (portrait as any)[key];
              if (!val) return null;
              const display = Array.isArray(val) ? val.join("、") : val;
              return (
                <div key={key} style={{ display: "flex", gap: "12px", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", width: "80px", flexShrink: 0, paddingTop: "2px" }}>{label}</span>
                  <span style={{ fontSize: "13px", color: "#333", lineHeight: "1.6" }}>{display}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a5f", borderBottom: "1px solid #e5e7eb", paddingBottom: "6px", marginBottom: "12px" }}>
              发展历程
            </div>
            {timeline.map((item: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: "16px", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#888", width: "72px", flexShrink: 0, paddingTop: "2px" }}>{item.date}</span>
                <p style={{ fontSize: "13px", color: "#333", lineHeight: "1.7", margin: 0 }}>{item.event}</p>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#aaa", display: "flex", justifyContent: "space-between" }}>
          <span>互联网平台治理数据库</span>
          <span>导出日期：{new Date().toLocaleDateString("zh-CN")}</span>
        </div>
      </div>

      {/* ── Screen view ── */}
      {/* Breadcrumb */}
      <div className="border-b border-border bg-white platform-screen-content">
        <div className="container py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground -ml-2">
            <Link href="/platforms">
              <ArrowLeft className="w-3.5 h-3.5" />
              返回平台列表
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleExportPdf}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            导出档案 PDF
          </Button>
        </div>
      </div>

      {/* Color bar */}
      <div className="h-1.5 w-full platform-screen-content" style={{ background: p.color ?? "var(--primary)" }} />

      <div className="container py-5 md:py-8 platform-screen-content">
        {/* Platform header */}
        <div className="flex items-start gap-3 md:gap-5 mb-5 md:mb-6">
          <div
            className="w-11 h-11 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-sm shrink-0"
            style={{ background: p.color ?? "var(--primary)" }}
          >
            {p.abbr ?? p.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold leading-tight mb-1">{p.name}</h1>
            {p.company && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                {p.company}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
              {p.hq && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {p.hq}
                </span>
              )}
              {p.founded && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  创立于 {p.founded} 年
                </span>
              )}
              {p.website && (
                <a
                  href={p.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Globe className="w-3 h-3" />
                  官网
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {jurisLabels.map((j) => j && (
                <Badge key={j.id} variant="outline" className="gap-1 text-xs">
                  <span>{j.flag}</span>
                  {j.label}
                </Badge>
              ))}
              {portrait?.types?.map((t: string) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        {p.description && (
          <p className="text-sm leading-relaxed text-foreground/80 mb-6 pb-6 border-b border-border">
            {p.description}
          </p>
        )}

        {/* Two-column layout: left nav + right content */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
          {/* ── Left: Section nav ── */}
          <aside className="w-full md:w-44 md:shrink-0 md:sticky md:top-4 md:self-start">
            <nav className="flex flex-row flex-wrap gap-1 md:flex-col md:gap-0 border-b border-border pb-3 mb-1 md:border-0 md:pb-0 md:mb-0">
              {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
                if (key === "cases" && relatedCases.length === 0) return null;
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-md text-xs md:text-sm transition-colors text-left md:w-full",
                      isActive
                        ? "bg-primary/8 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "")} />
                    {label}
                    {key === "rules" && rules.length > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">{ruleTitles.length}</span>
                    )}
                    {key === "cases" && relatedCases.length > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">{relatedCases.length}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Export button in sidebar too — desktop only */}
            <div className="hidden md:block mt-6 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={handleExportPdf}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                导出档案 PDF
              </Button>
            </div>
          </aside>

          {/* ── Right: Content ── */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="mt-8 md:mt-12 pt-6 border-t border-border">
          <Button variant="outline" asChild>
            <Link href="/platforms">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回平台列表
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
