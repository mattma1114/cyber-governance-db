import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, ExternalLink, Eye, Calendar, Globe, Tag, BookOpen,
  Sparkles, Scale, FileText, Gavel
} from "lucide-react";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS, formatDate } from "@/lib/utils";

// ── Related Cases Component ────────────────────────────────────────────────────
function RelatedCases({ caseId, topicId, jurisdictionId }: { caseId: number; topicId: string; jurisdictionId: string }) {
  const { data: sameTopicData } = trpc.cases.list.useQuery(
    { page: 1, pageSize: 4, topicId: topicId || undefined },
    { enabled: !!topicId }
  );
  const related = sameTopicData?.items.filter((c) => c.id !== caseId).slice(0, 3) ?? [];
  if (related.length === 0) return null;
  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        同专题关联案例
      </h3>
      <div className="grid sm:grid-cols-3 gap-3">
        {related.map((rc) => (
          <Link key={rc.id} href={`/cases/${rc.id}`}>
            <Card className="h-full hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
              <CardContent className="p-4">
                <Badge variant="secondary" className={cn("text-xs mb-2", TYPE_BADGE_CLASS[rc.type])}>
                  {TYPE_LABELS[rc.type]?.label}
                </Badge>
                <p className="text-sm font-medium line-clamp-2 leading-snug">{rc.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{rc.date}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const caseId = parseInt(id ?? "0");

  const { data: c, isLoading } = trpc.cases.getById.useQuery({ id: caseId }, { enabled: !!caseId });
  const { data: topics } = trpc.topics.list.useQuery();
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const incrementView = trpc.cases.incrementView.useMutation();

  useEffect(() => {
    if (caseId) incrementView.mutate({ id: caseId });
  }, [caseId]);

  if (isLoading) {
    return (
      <div className="container py-8 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-6 w-2/3 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground mb-4">案例不存在或已删除</p>
        <Button asChild variant="outline">
          <Link href="/cases">返回案例列表</Link>
        </Button>
      </div>
    );
  }

  const topic = topics?.find((t) => t.id === c.topicId);
  const juris = jurisdictions?.find((j) => j.id === c.jurisdictionId);
  const tags: string[] = Array.isArray(c.tags) ? c.tags : (c.tags ? JSON.parse(c.tags as string) : []);

  const typeIcon = c.type === "judicial" ? <Gavel className="w-4 h-4" /> :
    c.type === "regulatory" ? <Scale className="w-4 h-4" /> :
    <FileText className="w-4 h-4" />;

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30">
        <div className="container py-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground -ml-2">
            <Link href="/cases">
              <ArrowLeft className="w-3.5 h-3.5" />
              返回案例列表
            </Link>
          </Button>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary" className={cn("gap-1.5", TYPE_BADGE_CLASS[c.type])}>
              {typeIcon}
              {TYPE_LABELS[c.type]?.label}
            </Badge>
            {juris && (
              <Badge variant="outline" className="gap-1.5">
                <span>{juris.flag}</span>
                {juris.label}
              </Badge>
            )}
            {topic && (
              <Badge variant="outline" style={{ borderColor: topic.color ?? undefined, color: topic.color ?? undefined }}>
                {topic.label}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2">{c.title}</h1>
          {c.titleEn && (
            <p className="text-base text-muted-foreground italic mb-4">{c.titleEn}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(c.date)}
            </span>
            {c.source && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {c.source}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {(c.views ?? 0) + 1} 次浏览
            </span>
            {c.sourceUrl && (
              <a
                href={c.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                查看原文
              </a>
            )}
          </div>
        </div>

        <Separator className="mb-8" />

        <div className="space-y-6">
          {/* Abstract */}
          {c.abstract && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  案例摘要
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/90">{c.abstract}</p>
              </CardContent>
            </Card>
          )}

          {/* AI Summary */}
          {c.aiSummary && (
            <Card className="border-primary/20 bg-primary/3">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI 摘要解读
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/90">{c.aiSummary}</p>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis */}
          {c.aiAnalysis && (
            <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Scale className="w-4 h-4" />
                  深度法律分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/90">{c.aiAnalysis}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                相关标签
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link key={tag} href={`/cases?q=${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Related Cases */}
        <RelatedCases caseId={c.id} topicId={c.topicId ?? ""} jurisdictionId={c.jurisdictionId ?? ""} />

        {/* Bottom nav */}
        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link href="/cases">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
            </Link>
          </Button>
          {c.sourceUrl && (
            <Button asChild variant="default" className="gap-2">
              <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                查看原始来源
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
