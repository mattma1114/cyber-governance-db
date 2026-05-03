import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Building2, MapPin, Calendar, ExternalLink,
  LayoutGrid, Clock, FileText, Scale, Network, Languages, ChevronRight
} from "lucide-react";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS } from "@/lib/utils";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type NavSection = "portrait" | "timeline" | "rules" | "cases";

interface RuleVersion {
  versionId: string;
  versionLabel: string;
  date: string;
  url?: string;
  content?: string;
}

interface Rule {
  id: string;
  title: string;
  type: string;
  versions: RuleVersion[];
  // legacy support: flat fields
  date?: string;
  url?: string;
}

const NAV_ITEMS: { key: NavSection; label: string; icon: React.ReactNode }[] = [
  { key: "portrait", label: "平台画像", icon: <LayoutGrid className="w-4 h-4" /> },
  { key: "timeline", label: "平台大事件", icon: <Clock className="w-4 h-4" /> },
  { key: "rules", label: "规则文件", icon: <FileText className="w-4 h-4" /> },
  { key: "cases", label: "关联案例", icon: <Scale className="w-4 h-4" /> },
];

const PORTRAIT_LABELS: Record<string, string> = {
  types: "平台类型",
  structure: "市场结构",
  contentSource: "内容来源",
  networkEffect: "网络效应",
  businessModel: "商业模式",
  openness: "开放程度",
  crossBorder: "跨境运营",
};

// ── Normalize rules: support both legacy flat format and new versioned format ──
function normalizeRules(raw: any[]): Rule[] {
  return raw.map((r, idx) => {
    if (r.versions && Array.isArray(r.versions)) {
      // Already new format
      return r as Rule;
    }
    // Legacy flat format: { date, title, type, url }
    return {
      id: r.id ?? `rule-${idx}`,
      title: r.title ?? "未命名规则",
      type: r.type ?? "",
      versions: [
        {
          versionId: `v-${idx}-0`,
          versionLabel: "初始版本",
          date: r.date ?? "",
          url: r.url,
          content: r.content,
        },
      ],
    } as Rule;
  });
}

// ── Portrait Section ──────────────────────────────────────────────────────────
function PortraitSection({ portrait }: { portrait: any }) {
  if (!portrait) {
    return <p className="text-sm text-muted-foreground py-8 text-center">暂无画像数据</p>;
  }
  const entries = Object.entries(PORTRAIT_LABELS).filter(([key]) => portrait[key]);
  return (
    <div>
      <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
        <Network className="w-4 h-4 text-primary" />
        平台结构七维画像
      </h2>
      <div>
        {entries.map(([key, label], i) => {
          const val = portrait[key];
          return (
            <div key={key}>
              <div className="py-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  {label}
                </span>
                {Array.isArray(val) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {val.map((v: string) => (
                      <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-foreground">{val}</span>
                )}
              </div>
              {i < entries.length - 1 && <div className="border-t border-border/20" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Timeline Section ──────────────────────────────────────────────────────────
function TimelineSection({ timeline }: { timeline: any[] }) {
  if (timeline.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">暂无大事件记录</p>;
  }
  return (
    <div>
      <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        平台大事件
      </h2>
      <div className="relative">
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/40" />
        <div className="space-y-0 pl-7">
          {timeline.map((item: any, i: number) => (
            <div key={i}>
              <div className="relative py-4">
                <div className="absolute -left-7 top-5 w-2.5 h-2.5 rounded-full border-2 border-primary bg-background" />
                <span className="text-xs font-mono text-muted-foreground block mb-1">{item.date}</span>
                <p className="text-sm leading-relaxed">{item.event}</p>
              </div>
              {i < timeline.length - 1 && <div className="border-t border-border/15" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Rules Section — three-column layout ──────────────────────────────────────
function RulesSection({ rules: rawRules }: { rules: any[] }) {
  const rules = normalizeRules(rawRules);
  const [selectedRuleId, setSelectedRuleId] = useState<string>(rules[0]?.id ?? "");
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    rules[0]?.versions?.[0]?.versionId ?? ""
  );

  if (rules.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">暂无规则文件</p>;
  }

  const selectedRule = rules.find((r) => r.id === selectedRuleId) ?? rules[0];
  const selectedVersion = selectedRule?.versions?.find((v) => v.versionId === selectedVersionId)
    ?? selectedRule?.versions?.[0];

  const handleSelectRule = (rule: Rule) => {
    setSelectedRuleId(rule.id);
    setSelectedVersionId(rule.versions?.[0]?.versionId ?? "");
  };

  const handleGoogleTranslate = () => {
    if (!selectedVersion?.url) return;
    const url = `https://translate.google.com/translate?sl=auto&tl=zh-CN&u=${encodeURIComponent(selectedVersion.url)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        规则文件
      </h2>

      {/* Three-column grid */}
      <div className="grid grid-cols-[200px_180px_1fr] gap-0 border border-border/25 rounded-xl overflow-hidden min-h-[480px]">

        {/* ── Column 1: Rule Names ── */}
        <div className="border-r border-border/25 bg-muted/20 overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-border/20">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">规则名称</span>
          </div>
          <div className="py-1">
            {rules.map((rule) => {
              const isActive = rule.id === selectedRuleId;
              return (
                <button
                  key={rule.id}
                  onClick={() => handleSelectRule(rule)}
                  className={cn(
                    "w-full text-left px-3 py-3 transition-colors flex items-start gap-2 group",
                    isActive
                      ? "bg-primary/8 text-primary"
                      : "hover:bg-muted/60 text-foreground/80"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-medium leading-snug line-clamp-3",
                      isActive ? "text-primary" : "text-foreground/85 group-hover:text-foreground"
                    )}>
                      {rule.title}
                    </p>
                    {rule.type && (
                      <span className={cn(
                        "text-[10px] mt-1 block",
                        isActive ? "text-primary/60" : "text-muted-foreground"
                      )}>
                        {rule.type}
                      </span>
                    )}
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Column 2: Version / Date Selection ── */}
        <div className="border-r border-border/25 bg-muted/10 overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-border/20">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">版本历史</span>
          </div>
          <div className="py-1">
            {selectedRule?.versions?.length > 0 ? (
              selectedRule.versions.map((ver) => {
                const isActive = ver.versionId === selectedVersionId;
                return (
                  <button
                    key={ver.versionId}
                    onClick={() => setSelectedVersionId(ver.versionId)}
                    className={cn(
                      "w-full text-left px-3 py-3 transition-colors",
                      isActive
                        ? "bg-primary/8 border-l-2 border-primary"
                        : "hover:bg-muted/60 border-l-2 border-transparent"
                    )}
                  >
                    <p className={cn(
                      "text-xs font-medium leading-snug",
                      isActive ? "text-primary" : "text-foreground/85"
                    )}>
                      {ver.versionLabel}
                    </p>
                    {ver.date && (
                      <span className="text-[10px] text-muted-foreground mt-0.5 block font-mono">
                        {ver.date}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground px-3 py-4">暂无版本记录</p>
            )}
          </div>
        </div>

        {/* ── Column 3: Full Text / Content ── */}
        <div className="overflow-y-auto flex flex-col">
          {/* Content header */}
          <div className="px-5 py-3 border-b border-border/20 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground/80 truncate">{selectedRule?.title}</p>
              {selectedVersion?.date && (
                <span className="text-[10px] text-muted-foreground font-mono">{selectedVersion.date}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedVersion?.url && (
                <>
                  <a
                    href={selectedVersion.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border border-border/50 rounded-full px-2.5 py-1 transition-colors hover:border-primary/40"
                  >
                    <ExternalLink className="w-3 h-3" />
                    原文
                  </a>
                  <button
                    onClick={handleGoogleTranslate}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border border-border/50 rounded-full px-2.5 py-1 transition-colors hover:border-primary/40"
                  >
                    <Languages className="w-3 h-3" />
                    翻译
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content body */}
          <div className="flex-1 px-5 py-5 overflow-y-auto">
            {selectedVersion?.content ? (
              <div className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
                {selectedVersion.content}
              </div>
            ) : selectedVersion?.url ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <FileText className="w-10 h-10 text-muted-foreground/20" />
                <div>
                  <p className="text-sm text-muted-foreground mb-3">暂未录入规则全文</p>
                  <div className="flex items-center justify-center gap-3">
                    <a
                      href={selectedVersion.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      前往原始来源查阅
                    </a>
                    <button
                      onClick={handleGoogleTranslate}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Languages className="w-3.5 h-3.5" />
                      Google 翻译
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">暂无内容</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Related Cases Section ─────────────────────────────────────────────────────
function RelatedCasesSection({
  relatedCases,
  topics,
  jurisdictions,
}: {
  relatedCases: any[];
  topics: any[] | undefined;
  jurisdictions: any[] | undefined;
}) {
  if (relatedCases.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">暂无关联案例</p>;
  }
  return (
    <div>
      <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
        <Scale className="w-4 h-4 text-primary" />
        关联案例
      </h2>
      <div>
        {relatedCases.map((c: any, i: number) => {
          const topic = topics?.find((t) => t.id === c.topicId);
          const juris = jurisdictions?.find((j) => j.id === c.jurisdictionId);
          return (
            <div key={c.id}>
              <Link href={`/cases/${c.id}`}>
                <div className="py-4 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors cursor-pointer group">
                  <div className="flex items-start gap-2.5">
                    <Badge
                      variant="secondary"
                      className={cn("text-xs shrink-0 mt-0.5", TYPE_BADGE_CLASS[c.type])}
                    >
                      {TYPE_LABELS[c.type]?.label}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {c.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{c.date}</span>
                        {juris && <span>{juris.flag} {juris.label}</span>}
                        {topic && <span>{topic.label}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
              {i < relatedCases.length - 1 && <div className="border-t border-border/15" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Collapsible Description ──────────────────────────────────────────────────
const DESCRIPTION_THRESHOLD = 100; // chars before showing expand button

function CollapsibleDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > DESCRIPTION_THRESHOLD;

  return (
    <div className="text-sm leading-relaxed text-foreground/80">
      <span className={cn(!expanded && isLong && "line-clamp-3")}>
        {text}
      </span>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-1.5 text-xs text-primary hover:underline whitespace-nowrap"
        >
          {expanded ? "收起" : "展开全文"}
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PlatformDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeSection, setActiveSection] = useState<NavSection>("portrait");

  // ── ALL HOOKS UNCONDITIONALLY AT TOP ─────────────────────────────────────
  const { data: p, isLoading } = trpc.platforms.getById.useQuery(
    { id: id ?? "" },
    { enabled: !!id }
  );
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
  // ── END HOOKS ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="container py-8 max-w-6xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-24 w-full mb-4" />
        <div className="grid grid-cols-[200px_1fr] gap-8">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
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

  // Derived data
  const jurisArr: string[] = Array.isArray(p.jurisdiction)
    ? p.jurisdiction
    : (p.jurisdiction ? JSON.parse(p.jurisdiction as string) : []);
  const jurisLabels = jurisArr
    .map((jId) => jurisdictions?.find((j) => j.id === jId))
    .filter(Boolean);

  const portrait: any = p.portrait
    ? (typeof p.portrait === "string" ? JSON.parse(p.portrait) : p.portrait)
    : null;

  const rawRules: any[] = p.rules
    ? (typeof p.rules === "string" ? JSON.parse(p.rules) : p.rules)
    : [];

  const timeline: any[] = p.timeline
    ? (typeof p.timeline === "string" ? JSON.parse(p.timeline) : p.timeline)
    : [];

  const relatedCases = relatedCasesData?.items.filter((c) =>
    relatedCaseIds.includes(String(c.id))
  ) ?? [];

  const rules = normalizeRules(rawRules);

  const sectionCounts: Record<NavSection, number> = {
    portrait: portrait ? Object.keys(PORTRAIT_LABELS).filter((k) => portrait[k]).length : 0,
    timeline: timeline.length,
    rules: rules.length,
    cases: relatedCases.length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/20 bg-background/95 backdrop-blur-sm sticky top-[57px] z-10">
        <div className="container max-w-6xl py-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground -ml-2">
            <Link href="/platforms">
              <ArrowLeft className="w-3.5 h-3.5" />
              返回平台列表
            </Link>
          </Button>
        </div>
      </div>

      {/* Color accent bar */}
      <div className="h-1 w-full" style={{ background: p.color ?? "var(--primary)" }} />

      <div className="container max-w-6xl py-8">
        {/* Platform header */}
        <div className="flex items-start gap-5 mb-8 pb-8 border-b border-border/20">
          {/* Logo */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md shrink-0"
            style={{ background: p.color ?? "var(--primary)" }}
          >
            {p.abbr ?? p.name[0]}
          </div>

          {/* Name + meta + description */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-1">{p.name}</h1>
            {p.company && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                {p.company}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
              {p.hq && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {p.hq}
                </span>
              )}
              {p.founded && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  创立于 {p.founded} 年
                </span>
              )}
            </div>
            {/* Only show the first jurisdiction (origin country) + platform types */}
            <div className="flex flex-wrap gap-2 mb-3">
              {jurisLabels[0] && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <span>{jurisLabels[0].flag}</span>
                  {jurisLabels[0].label}
                </Badge>
              )}
              {portrait?.types?.map((t: string) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
            {/* Description inline under the name block */}
            {p.description && (
              <CollapsibleDescription text={p.description} />
            )}
          </div>
        </div>

        {/* Two-column layout: left nav + right content */}
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 items-start">

          {/* ── LEFT: Navigation ── */}
          <nav className="lg:sticky lg:top-[120px] flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const count = sectionCounts[item.key];
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                    isActive
                      ? "bg-primary/8 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={cn(isActive ? "text-primary" : "text-muted-foreground/70")}>
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  {count > 0 && (
                    <span className={cn(
                      "text-xs tabular-nums",
                      isActive ? "text-primary/70" : "text-muted-foreground/50"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* ── RIGHT: Content ── */}
          <div className="min-w-0">
            {activeSection === "portrait" && (
              <PortraitSection portrait={portrait} />
            )}
            {activeSection === "timeline" && (
              <TimelineSection timeline={timeline} />
            )}
            {activeSection === "rules" && (
              <RulesSection rules={rawRules} />
            )}
            {activeSection === "cases" && (
              <RelatedCasesSection
                relatedCases={relatedCases}
                topics={topics}
                jurisdictions={jurisdictions}
              />
            )}
          </div>
        </div>

        {/* Bottom back link */}
        <div className="mt-12 pt-6 border-t border-border/20">
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
