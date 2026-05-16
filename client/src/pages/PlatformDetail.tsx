import { useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Building2, MapPin, Calendar, Globe, ExternalLink,
  LayoutGrid, Clock, FileText, Scale, Network, ChevronRight, Download, Loader2, ChevronDown,
  History, Paperclip, CheckCircle2
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
  const [isExporting, setIsExporting] = useState(false);

  const exportProfile = trpc.platforms.exportProfile.useMutation({
    onSuccess: (data) => {
      const bytes = Uint8Array.from(atob(data.base64), (ch) => ch.charCodeAt(0));
      const blob = new Blob([bytes], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExporting(false);
    },
    onError: (err) => {
      import("sonner").then(({ toast }) => toast.error(`导出失败：${err.message}`));
      setIsExporting(false);
    },
  });

  const handleExport = (format: "pdf" | "docx") => {
    if (!p || isExporting) return;
    setIsExporting(true);
    exportProfile.mutate({ id: p.id, format });
  };

  const { data: p, isLoading } = trpc.platforms.getById.useQuery({ id: id ?? "" }, { enabled: !!id });
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: topics } = trpc.topics.list.useQuery();

  // DB-driven platform rules
  const { data: dbRulesData } = trpc.platformRules.list.useQuery(
    { platformId: id ?? "" },
    { enabled: !!id && activeTab === "rules" }
  );
  const dbRules = (dbRulesData ?? []) as any[];

  // Selected rule for version history / attachments
  const [selectedDbRuleId, setSelectedDbRuleId] = useState<number | null>(null);
  const { data: dbRuleVersions } = trpc.platformRules.listVersions.useQuery(
    { ruleId: selectedDbRuleId ?? 0 },
    { enabled: !!selectedDbRuleId }
  );
  const { data: dbRuleAttachments } = trpc.platformRules.listAttachments.useQuery(
    { ruleId: selectedDbRuleId ?? 0 },
    { enabled: !!selectedDbRuleId }
  );

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
        return (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">规则文件</h2>
              {dbRules.length > 0 && (
                <span className="text-xs text-muted-foreground ml-1">({dbRules.length} 条)</span>
              )}
            </div>

            {dbRules.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8">暂无规则文件</p>
            ) : (
              <div className="space-y-4">
                {/* Rule cards */}
                {dbRules.map((rule: any) => {
                  const isSelected = selectedDbRuleId === rule.id;
                  const versions = isSelected ? (dbRuleVersions ?? []) as any[] : [];
                  const attachments = isSelected ? (dbRuleAttachments ?? []) as any[] : [];
                  return (
                    <div key={rule.id} className="rounded-lg border border-border overflow-hidden">
                      {/* Rule header */}
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{rule.title}</span>
                            {rule.type && <Badge variant="outline" className="text-xs">{rule.type}</Badge>}
                            {rule.versionLabel && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{rule.versionLabel}</span>
                            )}
                            {rule.date && <span className="text-xs text-muted-foreground">{rule.date}</span>}
                            {rule.fullText && (
                              <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />全文已提取
                              </span>
                            )}
                          </div>
                          {rule.changeNote && (
                            <p className="text-xs text-muted-foreground mt-1">{rule.changeNote}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {rule.url && (
                            <Button size="sm" variant="ghost" asChild className="h-7 px-2 text-xs">
                              <a href={rule.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                          )}
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            title="版本历史 / 附件"
                            onClick={() => setSelectedDbRuleId(isSelected ? null : rule.id)}
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Expandable: version history + attachments */}
                      {isSelected && (
                        <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                          {/* Version history timeline */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">版本历史</p>
                            {versions.length === 0 ? (
                              <p className="text-xs text-muted-foreground">暂无历史版本</p>
                            ) : (
                              <div className="relative pl-4">
                                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                                {versions.map((v: any, vi: number) => (
                                  <div key={v.id} className="relative mb-3 last:mb-0">
                                    <div className="absolute -left-2.5 top-1 w-2 h-2 rounded-full bg-primary" />
                                    <div className="pl-3">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {v.versionLabel && (
                                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{v.versionLabel}</span>
                                        )}
                                        {v.date && <span className="text-xs text-muted-foreground">{v.date}</span>}
                                        {vi === 0 && <span className="text-xs text-emerald-600 font-medium">最新</span>}
                                      </div>
                                      {v.changeNote && <p className="text-xs text-muted-foreground mt-0.5">{v.changeNote}</p>}
                                      {v.url && (
                                        <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-0.5 inline-flex items-center gap-1">
                                          <ExternalLink className="w-3 h-3" />查看该版本
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Attachments */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">相关附件</p>
                            {attachments.length === 0 ? (
                              <p className="text-xs text-muted-foreground">暂无附件</p>
                            ) : (
                              <div className="space-y-1.5">
                                {attachments.map((att: any) => (
                                  <a
                                    key={att.id}
                                    href={att.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 rounded border px-3 py-2 text-xs hover:bg-muted transition-colors"
                                  >
                                    <Paperclip className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                    <span className="flex-1 truncate">{att.filename}</span>
                                    {att.fileSize && <span className="text-muted-foreground shrink-0">{(att.fileSize / 1024).toFixed(0)} KB</span>}
                                    <Download className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Full text */}
                          {rule.fullText && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">规则全文</p>
                              <FullTextSection fullText={rule.fullText} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Full text (always visible if not expanded) */}
                      {!isSelected && rule.fullText && (
                        <div className="border-t border-border px-4 pb-4">
                          <FullTextSection fullText={rule.fullText} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
      {/* Breadcrumb */}
      <div className="border-b border-border bg-white">
        <div className="container py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground -ml-2">
            <Link href="/platforms">
              <ArrowLeft className="w-3.5 h-3.5" />
              返回平台列表
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={isExporting}>
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                导出档案
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FileText className="w-3.5 h-3.5 mr-2" />
                导出为 PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("docx")}>
                <FileText className="w-3.5 h-3.5 mr-2" />
                导出为 Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Color bar */}
      <div className="h-1.5 w-full" style={{ background: p.color ?? "var(--primary)" }} />

      <div className="container py-5 md:py-8">
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

            {/* Export buttons in sidebar — desktop only */}
            <div className="hidden md:flex md:flex-col gap-2 mt-6 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                导出 PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => handleExport("docx")}
                disabled={isExporting}
              >
                <FileText className="w-3.5 h-3.5" />
                导出 Word
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
