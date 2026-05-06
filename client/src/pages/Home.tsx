import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Database, Scale, Gavel, FileText, Globe, TrendingUp, BookOpen, ChevronDown } from "lucide-react";
import { TYPE_BADGE_CLASS, TYPE_LABELS, truncate } from "@/lib/utils";
import { cn } from "@/lib/utils";

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 px-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[11px] leading-none">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground leading-tight" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>{value}</div>
    </div>
  );
}

function CaseCard({ c, topics, jurisdictions }: { c: any; topics: any[]; jurisdictions: any[] }) {
  const topic = topics.find((t) => t.id === c.topicId);
  const juris = jurisdictions.find((j) => j.id === c.jurisdictionId);
  return (
    <Link href={`/cases/${c.id}`}>
      <div className="group border-b border-border py-4 hover:bg-muted/30 transition-colors cursor-pointer px-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant="secondary" className={cn("text-xs shrink-0", TYPE_BADGE_CLASS[c.type])}>
            {TYPE_LABELS[c.type]?.label}
          </Badge>
          <span className="text-xs text-muted-foreground shrink-0">{c.date}</span>
        </div>
        <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
          {c.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {truncate(c.abstract || c.aiSummary || "", 100)}
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {juris && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span>{juris.flag}</span>
              {juris.label}
            </span>
          )}
          {topic && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {topic.label}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { data: stats } = trpc.cases.stats.useQuery();
  const { data: topicsData } = trpc.topics.list.useQuery();
  const { data: jurisdictionsData } = trpc.jurisdictions.list.useQuery();
  const { data: recentCases } = trpc.cases.list.useQuery({ page: 1, pageSize: 6 });

  const topics = topicsData ?? [];
  const jurisdictions = jurisdictionsData ?? [];

  return (
    <div className="min-h-screen">
      {/* Hero + Stats */}
      <section className="relative overflow-hidden bg-white border-b border-border min-h-[calc(100vh-3.5rem)] flex flex-col justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--brand-subtle),transparent_60%)]" />
        <div className="container relative py-12 md:py-16 flex-1 flex flex-col justify-center">
          {/* Title + Description */}
          <div className="max-w-2xl mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs">
                全球平台治理研究
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              互联网平台
              <span className="text-primary block">治理数据库</span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              系统收录全球互联网平台治理领域的司法内容、监管执法与立法政策，
              覆盖中国、欧盟、美国、东南亚四大司法辖区，聚焦数据隐私、人工智能治理、
              反垂断与内容治理四大专题。
            </p>
          </div>
          {/* Stats: horizontal, evenly distributed */}
          <div className="flex flex-row items-start justify-between gap-4 border-t border-border pt-3 mb-1">
            {stats ? (
              <>
                <StatCard label="收录内容总数" value={stats.total} icon={<BookOpen className="w-3.5 h-3.5" />} />
                <div className="w-px self-stretch bg-border" />
                <StatCard label="司法内容" value={stats.judicial} icon={<Gavel className="w-3.5 h-3.5" />} />
                <div className="w-px self-stretch bg-border" />
                <StatCard label="监管执法" value={stats.regulatory} icon={<Scale className="w-3.5 h-3.5" />} />
                <div className="w-px self-stretch bg-border" />
                <StatCard label="立法政策" value={stats.legislation} icon={<FileText className="w-3.5 h-3.5" />} />
              </>
            ) : (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 flex-1 rounded-lg" />
              ))
            )}
          </div>
          {/* Scroll hint */}
          <div className="flex justify-center mt-8 pb-0">
            <div className="flex flex-col items-center gap-1 text-muted-foreground/50 select-none" style={{ animation: 'scrollHintBounce 2s ease-in-out infinite' }}>
              <span className="text-[11px] tracking-wide">向下滑动</span>
              <ChevronDown className="w-5 h-5" style={{ animation: 'scrollHintBounce 2s ease-in-out infinite 0.15s' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Recent Cases */}
      <section className="container pb-10 density-section">
        <div className="flex items-center justify-between py-5 border-b border-border mb-0">
          <h2 className="text-base font-semibold">最新收录</h2>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
            <Link href="/cases">
              查看全部
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
          {recentCases?.items ? (
            recentCases.items.map((c) => (
              <CaseCard key={c.id} c={c} topics={topics} jurisdictions={jurisdictions} />
            ))
          ) : (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 my-2" />
            ))
          )}
        </div>
      </section>

      {/* Coverage */}
      <section className="container pb-16 density-section">
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
          {/* Jurisdictions */}
          <div>
            <div className="flex items-center gap-2 py-4 border-t border-b border-border mb-0">
              <Globe className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">覆盖司法辖区</h2>
            </div>
            <div>
              {jurisdictions.map((j) => {
                const count = stats?.byJurisdiction.find((b) => b.jurisdictionId === j.id)?.count ?? 0;
                return (
                  <Link key={j.id} href={`/cases?jurisdiction=${j.id}`}>
                    <div className="flex items-center gap-3 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer px-1">
                      <span className="text-xl">{j.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{j.label}</div>
                        {j.labelEn && <div className="text-xs text-muted-foreground">{j.labelEn}</div>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{count} 条</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Topics */}
          <div>
            <div className="flex items-center gap-2 py-4 border-t border-b border-border mb-0">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">核心研究专题</h2>
            </div>
            <div>
              {topics.map((t) => {
                const count = stats?.byTopic.find((b) => b.topicId === t.id)?.count ?? 0;
                const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <Link key={t.id} href={`/cases?topic=${t.id}`}>
                    <div className="flex items-center gap-3 py-3 border-b border-border cursor-pointer group px-1">
                      <div
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ background: t.color ?? "var(--primary)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">{t.label}</span>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">{count} 条</span>
                        </div>
                        <div className="h-1 bg-muted overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{ width: `${pct}%`, background: t.color ?? "var(--primary)" }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>互联网平台治理数据库</span>
            <span className="text-border">|</span>
            <span>浙江传媒学院</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/legal" className="hover:text-foreground transition-colors text-xs">法律声明</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
