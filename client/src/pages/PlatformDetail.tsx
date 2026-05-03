import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Building2, MapPin, Calendar, ExternalLink,
  LayoutGrid, Clock, FileText, Scale, Network
} from "lucide-react";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS } from "@/lib/utils";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type NavSection = "portrait" | "timeline" | "rules" | "cases";

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

// ── Rules Section ─────────────────────────────────────────────────────────────
function RulesSection({ rules }: { rules: any[] }) {
  if (rules.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">暂无规则文件</p>;
  }
  return (
    <div>
      <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        规则文件
      </h2>
      <div>
        {rules.map((rule: any, i: number) => (
          <div key={i}>
            <div className="py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-xs">{rule.type}</Badge>
                  {rule.date && (
                    <span className="text-xs text-muted-foreground">{rule.date}</span>
                  )}
                </div>
                <p className="text-sm font-medium leading-snug">{rule.title}</p>
              </div>
              {rule.url && (
                <a
                  href={rule.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  title="查看原文"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {i < rules.length - 1 && <div className="border-t border-border/20" />}
          </div>
        ))}
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

  const rules: any[] = p.rules
    ? (typeof p.rules === "string" ? JSON.parse(p.rules) : p.rules)
    : [];

  const timeline: any[] = p.timeline
    ? (typeof p.timeline === "string" ? JSON.parse(p.timeline) : p.timeline)
    : [];

  const relatedCases = relatedCasesData?.items.filter((c) =>
    relatedCaseIds.includes(String(c.id))
  ) ?? [];

  // Badge counts for nav items
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
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md shrink-0"
            style={{ background: p.color ?? "var(--primary)" }}
          >
            {p.abbr ?? p.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-1">{p.name}</h1>
            {p.company && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                {p.company}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
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
            <div className="flex flex-wrap gap-2">
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
          <p className="text-sm leading-relaxed text-foreground/85 mb-8 pb-8 border-b border-border/20">
            {p.description}
          </p>
        )}

        {/* Two-column layout */}
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
              <RulesSection rules={rules} />
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
