import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, ExternalLink, Eye, Calendar, BookOpen,
  Sparkles, Scale, Quote, Copy, Check, ChevronDown, ChevronUp, Building2, Link2
} from "lucide-react";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS, formatDate } from "@/lib/utils";
import { toast } from "sonner";

// ── Citation formats ──────────────────────────────────────────────────────────
type CitationStyle = "gb" | "apa" | "mla";

function buildCitation(
  style: CitationStyle,
  opts: {
    title: string;
    titleEn?: string | null;
    source?: string | null;
    sourceUrl?: string | null;
    date?: string | null;
    jurisLabel?: string;
    typeLabel?: string;
  }
): string {
  const { title, titleEn, source, sourceUrl, date, jurisLabel, typeLabel } = opts;
  const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
  const accessDate = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const db = "互联网平台治理数据库";
  const org = "浙江传媒学院";

  if (style === "gb") {
    let cite = `${source ?? org}. ${title}[EB/OL]. `;
    if (jurisLabel) cite += `${jurisLabel}, `;
    cite += `${year}`;
    if (sourceUrl) cite += `. ${sourceUrl}`;
    cite += `. (${accessDate}检索自${db})`;
    return cite;
  }
  if (style === "apa") {
    let cite = `${source ?? org}. (${year}). `;
    cite += titleEn ? `${titleEn}` : title;
    if (jurisLabel) cite += ` [${jurisLabel} ${typeLabel ?? "case"}]`;
    cite += `. ${db}.`;
    if (sourceUrl) cite += ` ${sourceUrl}`;
    return cite;
  }
  let cite = `"${titleEn ?? title}." `;
  cite += `${source ?? org}, ${year}`;
  if (jurisLabel) cite += `, ${jurisLabel}`;
  cite += `. ${db}, ${org}`;
  if (sourceUrl) cite += `. ${sourceUrl}`;
  cite += `. Accessed ${accessDate}.`;
  return cite;
}

// ── Citation Box ──────────────────────────────────────────────────────────────
function CitationBox({ c, jurisLabel, typeLabel }: {
  c: { title: string; titleEn?: string | null; source?: string | null; sourceUrl?: string | null; date?: string | null };
  jurisLabel?: string;
  typeLabel?: string;
}) {
  const [style, setStyle] = useState<CitationStyle>("gb");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const citation = buildCitation(style, { ...c, jurisLabel, typeLabel });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(citation);
    setCopied(true);
    toast.success("引用格式已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  const styles: { key: CitationStyle; label: string }[] = [
    { key: "gb", label: "GB/T 7714" },
    { key: "apa", label: "APA 7th" },
    { key: "mla", label: "MLA 9th" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
          <Quote className="w-3.5 h-3.5 text-primary" />
          学术引用
        </h3>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {open ? <><ChevronUp className="w-3.5 h-3.5" />收起</> : <><ChevronDown className="w-3.5 h-3.5" />展开</>}
        </button>
      </div>
      {open && (
        <div>
          <div className="flex gap-1.5 mb-3">
            {styles.map((s) => (
              <button
                key={s.key}
                onClick={() => setStyle(s.key)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                  style === s.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <div className="bg-muted/60 rounded-lg px-4 py-3 pr-12 text-sm leading-relaxed font-mono text-foreground/90 select-all">
              {citation}
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-md hover:bg-background border border-border transition-colors"
              title="复制引用"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-green-500" />
                : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            点击文本框可全选，或使用右上角按钮一键复制
          </p>
        </div>
      )}
    </div>
  );
}

// ── Related Content (right column bottom) ────────────────────────────────────
function RelatedContent({ caseId, topicId }: { caseId: number; topicId: string }) {
  const { data: sameTopicData } = trpc.cases.list.useQuery(
    { page: 1, pageSize: 5, topicId: topicId || undefined },
    { enabled: !!topicId }
  );
  const { data: platformsData } = trpc.platforms.list.useQuery({ page: 1, pageSize: 20 });

  const relatedCases = sameTopicData?.items.filter((c) => c.id !== caseId).slice(0, 3) ?? [];
  const relatedPlatforms = (platformsData?.items ?? []).slice(0, 3);

  if (relatedCases.length === 0 && relatedPlatforms.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-border/20">
      <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
        <Link2 className="w-4 h-4 text-primary" />
        关联内容
      </h2>

      {relatedCases.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">同专题案例</h3>
          <div>
            {relatedCases.map((rc, i) => (
              <div key={rc.id}>
                <Link href={`/cases/${rc.id}`}>
                  <div className="py-3 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors cursor-pointer group">
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className={cn("text-xs shrink-0 mt-0.5", TYPE_BADGE_CLASS[rc.type])}>
                        {TYPE_LABELS[rc.type]?.label}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">{rc.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rc.date}</p>
                      </div>
                    </div>
                  </div>
                </Link>
                {i < relatedCases.length - 1 && <div className="border-t border-border/15" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {relatedPlatforms.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">平台画像库</h3>
          <div>
            {relatedPlatforms.map((p: any, i: number) => (
              <div key={p.id}>
                <Link href={`/platforms/${p.id}`}>
                  <div className="py-3 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors cursor-pointer group flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: p.color ?? "#6b7280" }}
                    >
                      {p.abbr ?? p.name?.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{p.name}</p>
                      {p.company && <p className="text-xs text-muted-foreground truncate">{p.company}</p>}
                    </div>
                  </div>
                </Link>
                {i < relatedPlatforms.length - 1 && <div className="border-t border-border/15" />}
              </div>
            ))}
            <Link href="/platforms">
              <p className="text-xs text-primary hover:underline mt-2 cursor-pointer">查看全部平台 →</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
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
      <div className="container py-8 max-w-7xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-10">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 max-w-7xl">

        {/* Back */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
            <Link href="/cases">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              返回案例列表
            </Link>
          </Button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-10 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:sticky lg:top-[57px] lg:max-h-[calc(100vh-80px)] lg:overflow-y-auto pb-4">

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className={cn("text-xs", TYPE_BADGE_CLASS[c.type])}>
                {TYPE_LABELS[c.type]?.label}
              </Badge>
              {juris && (
                <Badge variant="outline" style={{ borderColor: juris.color ?? undefined, color: juris.color ?? undefined }}>
                  {juris.flag} {juris.label}
                </Badge>
              )}
              {topic && (
                <Badge variant="outline" style={{ borderColor: topic.color ?? undefined, color: topic.color ?? undefined }}>
                  {topic.label}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold leading-tight mb-2">{c.title}</h1>
            {c.titleEn && (
              <p className="text-sm text-muted-foreground italic mb-5">{c.titleEn}</p>
            )}

            {/* Metadata */}
            <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {formatDate(c.date)}
              </span>
              {c.source && (
                <span className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  {c.source}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 shrink-0" />
                {(c.views ?? 0) + 1} 次浏览
              </span>
              {c.sourceUrl && (
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  查看原文
                </a>
              )}
            </div>

            {/* Abstract */}
            {c.abstract && (
              <div className="border-t border-border/20 pt-5 mb-5">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground/80">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  内容摘要
                </h2>
                <p className="text-sm leading-relaxed text-foreground/80">{c.abstract}</p>
              </div>
            )}

            {/* AI Summary */}
            {c.aiSummary && (
              <div className="border-t border-border/20 pt-5 mb-5">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground/80">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  AI 摘要解读
                </h2>
                <p className="text-sm leading-relaxed text-foreground/80">{c.aiSummary}</p>
              </div>
            )}

            {/* Citation */}
            <div className="border-t border-border/20 pt-5">
              <CitationBox
                c={c}
                jurisLabel={juris?.label}
                typeLabel={TYPE_LABELS[c.type]?.label}
              />
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div>

            {/* Full text */}
            {c.aiAnalysis ? (
              <div>
                <h2 className="text-base font-semibold mb-5 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" />
                  全文内容
                </h2>
                <div className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
                  {c.aiAnalysis}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-16 text-center">
                <Scale className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>暂无全文内容</p>
                {c.sourceUrl && (
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline mt-2 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    前往原始来源查阅
                  </a>
                )}
              </div>
            )}

            {/* Related Content */}
            <RelatedContent caseId={c.id} topicId={c.topicId ?? ""} />
          </div>
        </div>
      </div>
    </div>
  );
}
