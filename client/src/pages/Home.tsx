import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Database, LayoutGrid, Scale, Gavel, FileText, Globe, TrendingUp, BookOpen } from "lucide-react";
import { TYPE_BADGE_CLASS, TYPE_LABELS, formatDate, truncate } from "@/lib/utils";
import { cn } from "@/lib/utils";

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex flex-col gap-1 p-5 rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function CaseCard({ c, topics, jurisdictions }: { c: any; topics: any[]; jurisdictions: any[] }) {
  const topic = topics.find((t) => t.id === c.topicId);
  const juris = jurisdictions.find((j) => j.id === c.jurisdictionId);
  return (
    <Link href={`/cases/${c.id}`}>
      <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="secondary" className={cn("text-xs shrink-0", TYPE_BADGE_CLASS[c.type])}>
              {TYPE_LABELS[c.type]?.label}
            </Badge>
            <span className="text-xs text-muted-foreground shrink-0">{c.date}</span>
          </div>
          <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {c.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
            {truncate(c.abstract || c.aiSummary || "", 120)}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-auto">
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
        </CardContent>
      </Card>
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
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--brand-subtle),transparent_60%)]" />
        <div className="container relative py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs">
                全球平台治理研究
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              互联网平台
              <span className="text-primary block">治理数据库</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              系统收录全球互联网平台治理领域的司法案例、监管执法与立法政策，
              覆盖中国、欧盟、美国、东南亚四大司法辖区，聚焦数据隐私、人工智能治理、
              反垄断与内容治理四大专题。
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/cases">
                  <Database className="w-4 h-4" />
                  浏览案例数据库
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/platforms">
                  <LayoutGrid className="w-4 h-4" />
                  查看平台画像库
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats ? (
            <>
              <StatCard label="收录案例总数" value={stats.total} icon={<BookOpen className="w-4 h-4" />} color="var(--primary)" />
              <StatCard label="司法案例" value={stats.judicial} icon={<Gavel className="w-4 h-4" />} color="oklch(46% 0.22 245)" />
              <StatCard label="监管执法" value={stats.regulatory} icon={<Scale className="w-4 h-4" />} color="oklch(48% 0.18 162)" />
              <StatCard label="立法政策" value={stats.legislation} icon={<FileText className="w-4 h-4" />} color="oklch(54% 0.18 55)" />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          )}
        </div>
      </section>

      {/* Coverage */}
      <section className="container pb-10">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Jurisdictions */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              覆盖司法辖区
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {jurisdictions.map((j) => {
                const count = stats?.byJurisdiction.find((b) => b.jurisdictionId === j.id)?.count ?? 0;
                return (
                  <Link key={j.id} href={`/cases?jurisdiction=${j.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <span className="text-2xl">{j.flag}</span>
                      <div>
                        <div className="text-sm font-medium">{j.label}</div>
                        <div className="text-xs text-muted-foreground">{count} 条记录</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Topics */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              核心研究专题
            </h2>
            <div className="flex flex-col gap-3">
              {topics.map((t) => {
                const count = stats?.byTopic.find((b) => b.topicId === t.id)?.count ?? 0;
                const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <Link key={t.id} href={`/cases?topic=${t.id}`}>
                    <div className="flex items-center gap-3 cursor-pointer group">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">{t.label}</span>
                          <span className="text-xs text-muted-foreground">{count} 条</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
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

      {/* Recent Cases */}
      <section className="container pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">最新收录</h2>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
            <Link href="/cases">
              查看全部
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentCases?.items ? (
            recentCases.items.map((c) => (
              <CaseCard key={c.id} c={c} topics={topics} jurisdictions={jurisdictions} />
            ))
          ) : (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>互联网平台治理数据库</span>
            <span className="text-border">|</span>
            <span>浙江传媒学院</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-foreground transition-colors">关于</Link>
            <Link href="/cases" className="hover:text-foreground transition-colors">案例数据库</Link>
            <Link href="/platforms" className="hover:text-foreground transition-colors">平台画像库</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
