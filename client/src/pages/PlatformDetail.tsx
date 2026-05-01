import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Building2, MapPin, Calendar, Globe, ExternalLink,
  LayoutGrid, Clock, FileText, Scale, Network
} from "lucide-react";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS } from "@/lib/utils";

function PortraitItem({ label, value }: { label: string; value: string | string[] }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-border last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
          ))}
        </div>
      ) : (
        <span className="text-sm text-foreground">{value}</span>
      )}
    </div>
  );
}

export default function PlatformDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: p, isLoading } = trpc.platforms.getById.useQuery({ id: id ?? "" }, { enabled: !!id });
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: topics } = trpc.topics.list.useQuery();

  if (isLoading) {
    return (
      <div className="container py-8 max-w-4xl">
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
  const jurisLabels = jurisArr.map((id) => jurisdictions?.find((j) => j.id === id)).filter(Boolean);

  const portrait: any = p.portrait
    ? (typeof p.portrait === "string" ? JSON.parse(p.portrait) : p.portrait)
    : null;

  const rules: any[] = p.rules
    ? (typeof p.rules === "string" ? JSON.parse(p.rules) : p.rules)
    : [];

  const timeline: any[] = p.timeline
    ? (typeof p.timeline === "string" ? JSON.parse(p.timeline) : p.timeline)
    : [];

  const relatedCaseIds: string[] = p.relatedCaseIds
    ? (typeof p.relatedCaseIds === "string" ? JSON.parse(p.relatedCaseIds) : p.relatedCaseIds)
    : [];

  // Fetch related cases
  const { data: relatedCasesData } = trpc.cases.list.useQuery(
    { page: 1, pageSize: 20 },
    { enabled: relatedCaseIds.length > 0 }
  );
  const relatedCases = relatedCasesData?.items.filter((c) =>
    relatedCaseIds.includes(String(c.id))
  ) ?? [];

  const PORTRAIT_LABELS: Record<string, string> = {
    types: "平台类型",
    structure: "市场结构",
    contentSource: "内容来源",
    networkEffect: "网络效应",
    businessModel: "商业模式",
    openness: "开放程度",
    crossBorder: "跨境运营",
  };

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30">
        <div className="container py-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground -ml-2">
            <Link href="/platforms">
              <ArrowLeft className="w-3.5 h-3.5" />
              返回平台列表
            </Link>
          </Button>
        </div>
      </div>

      {/* Color bar */}
      <div className="h-1.5 w-full" style={{ background: p.color ?? "var(--primary)" }} />

      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-start gap-5 mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md shrink-0"
            style={{ background: p.color ?? "var(--primary)" }}
          >
            {p.abbr ?? p.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-1">{p.name}</h1>
            {p.company && (
              <p className="text-base text-muted-foreground flex items-center gap-1.5 mb-3">
                <Building2 className="w-4 h-4 shrink-0" />
                {p.company}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
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
            <div className="flex flex-wrap gap-2 mt-3">
              {jurisLabels.map((j) => j && (
                <Badge key={j.id} variant="outline" className="gap-1">
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
          <p className="text-sm leading-relaxed text-foreground/90 mb-8 p-4 rounded-xl bg-muted/50 border border-border">
            {p.description}
          </p>
        )}

        <Separator className="mb-8" />

        {/* Tabs */}
        <Tabs defaultValue="portrait">
          <TabsList className="mb-6">
            <TabsTrigger value="portrait" className="gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              平台画像
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              发展时间线
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              规则文件
            </TabsTrigger>
            {relatedCases.length > 0 && (
              <TabsTrigger value="cases" className="gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                关联案例
              </TabsTrigger>
            )}
          </TabsList>

          {/* Portrait */}
          <TabsContent value="portrait">
            {portrait ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Network className="w-4 h-4 text-primary" />
                    平台结构七维画像
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(PORTRAIT_LABELS).map(([key, label]) => {
                    const val = portrait[key];
                    if (!val) return null;
                    return <PortraitItem key={key} label={label} value={val} />;
                  })}
                </CardContent>
              </Card>
            ) : (
              <p className="text-muted-foreground text-sm">暂无画像数据</p>
            )}
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline">
            {timeline.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4 pl-10">
                  {timeline.map((item: any, i: number) => (
                    <div key={i} className="relative">
                      <div
                        className="absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-primary bg-background"
                      />
                      <div className="p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow">
                        <span className="text-xs font-mono text-muted-foreground">{item.date}</span>
                        <p className="text-sm mt-1">{item.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">暂无时间线数据</p>
            )}
          </TabsContent>

          {/* Rules */}
          <TabsContent value="rules">
            {rules.length > 0 ? (
              <div className="space-y-3">
                {rules.map((rule: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{rule.type}</Badge>
                          <span className="text-xs text-muted-foreground">{rule.date}</span>
                        </div>
                        <p className="text-sm font-medium">{rule.title}</p>
                      </div>
                      {rule.url && (
                        <Button size="sm" variant="ghost" asChild className="shrink-0">
                          <a href={rule.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">暂无规则文件</p>
            )}
          </TabsContent>

          {/* Related Cases */}
          <TabsContent value="cases">
            <div className="space-y-3">
              {relatedCases.map((c) => {
                const topic = topics?.find((t) => t.id === c.topicId);
                const juris = jurisdictions?.find((j) => j.id === c.jurisdictionId);
                return (
                  <Link key={c.id} href={`/cases/${c.id}`}>
                    <Card className="hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer">
                      <CardContent className="p-4 flex items-start gap-3">
                        <Badge variant="secondary" className={cn("text-xs shrink-0 mt-0.5", TYPE_BADGE_CLASS[c.type])}>
                          {TYPE_LABELS[c.type]?.label}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{c.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{c.date}</span>
                            {juris && <span>{juris.flag} {juris.label}</span>}
                            {topic && <span>{topic.label}</span>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom nav */}
        <div className="mt-12 pt-6 border-t border-border">
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
