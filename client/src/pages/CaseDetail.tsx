import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, ExternalLink, Eye, Calendar, Building2, Tag, BookOpen,
  Scale, FileText, Gavel, Quote, Copy, Check, ChevronDown, ChevronUp,
  Download, Loader2, MapPin, Layers, Paperclip
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

  // MLA 9th
  let cite = `"${titleEn ?? title}." `;
  cite += `${source ?? org}, ${year}`;
  if (jurisLabel) cite += `, ${jurisLabel}`;
  cite += `. ${db}, ${org}`;
  if (sourceUrl) cite += `. ${sourceUrl}`;
  cite += `. Accessed ${accessDate}.`;
  return cite;
}

// ── Collapsible Section ───────────────────────────────────────────────────────
function CollapsibleSection({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 group"
      >
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
          {icon}
          {title}
        </h2>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// ── Citation Box ──────────────────────────────────────────────────────────────
function CitationBox({ c, jurisLabel, typeLabel }: {
  c: { title: string; titleEn?: string | null; source?: string | null; sourceUrl?: string | null; date?: string | null };
  jurisLabel?: string;
  typeLabel?: string;
}) {
  const [style, setStyle] = useState<CitationStyle>("gb");
  const [copied, setCopied] = useState(false);

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
    <CollapsibleSection icon={<Quote className="w-3.5 h-3.5" />} title="学术引用" defaultOpen={false}>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {styles.map((s) => (
          <button
            key={s.key}
            onClick={() => setStyle(s.key)}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors border",
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
        <div className="bg-muted/60 rounded-md px-3 py-2.5 pr-10 text-xs leading-relaxed font-mono text-foreground/80 select-all break-all">
          {citation}
        </div>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded hover:bg-background border border-border transition-colors"
          title="复制引用"
        >
          {copied
            ? <Check className="w-3 h-3 text-green-500" />
            : <Copy className="w-3 h-3 text-muted-foreground" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">点击文本框可全选，或使用右上角按钮一键复制</p>
    </CollapsibleSection>
  );
}

// ── Attachments Section ──────────────────────────────────────────────────────
function AttachmentsSection({ caseId }: { caseId: number }) {
  const { data: attachments, isLoading } = trpc.attachments.listByCaseId.useQuery({ caseId });

  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return "📄";
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
    if (mimeType.includes("image")) return "🖼️";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📊";
    if (mimeType.includes("text")) return "📃";
    return "📄";
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (isLoading) return null;
  if (!attachments || attachments.length === 0) return null;

  return (
    <CollapsibleSection icon={<Paperclip className="w-3.5 h-3.5" />} title="相关文件" defaultOpen={true}>
      <div className="divide-y divide-border/50">
        {attachments.map((att) => (
          <a
            key={att.id}
            href={att.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 py-2 hover:text-primary transition-colors group"
          >
            <span className="text-base shrink-0">{getFileIcon(att.mimeType)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{att.filename}</p>
              {att.fileSize && (
                <p className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</p>
              )}
            </div>
            <Download className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
          </a>
        ))}
      </div>
    </CollapsibleSection>
  );
}

// ── Related Cases ─────────────────────────────────────────────────────────────
function RelatedCases({ caseId, topicId }: { caseId: number; topicId: string }) {
  const { data: sameTopicData } = trpc.cases.list.useQuery(
    { page: 1, pageSize: 4, topicId: topicId || undefined },
    { enabled: !!topicId }
  );
  const related = sameTopicData?.items.filter((c) => c.id !== caseId).slice(0, 4) ?? [];
  if (related.length === 0) return null;

  return (
    <CollapsibleSection icon={<BookOpen className="w-3.5 h-3.5" />} title="同专题关联" defaultOpen={true}>
      <div className="space-y-0">
        {related.map((rc) => (
          <Link key={rc.id} href={`/cases/${rc.id}`}>
            <div className="flex items-start gap-2 py-2.5 border-b border-border/40 hover:text-primary transition-colors cursor-pointer group last:border-0">
              <Badge variant="secondary" className={cn("text-xs shrink-0 mt-0.5 px-1.5 py-0", TYPE_BADGE_CLASS[rc.type])}>
                {TYPE_LABELS[rc.type]?.label}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">{rc.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rc.date}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </CollapsibleSection>
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
  const exportPdf = trpc.cases.exportPdf.useMutation({
    onSuccess: (data) => {
      const bytes = Uint8Array.from(atob(data.base64), (ch) => ch.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF 已生成，正在下载");
    },
    onError: (err) => {
      toast.error(`PDF 生成失败：${err.message}`);
    },
  });

  useEffect(() => {
    if (caseId) incrementView.mutate({ id: caseId });
  }, [caseId]);

  if (isLoading) {
    return (
      <div className="container py-8 max-w-6xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-10 w-3/4 mb-3" />
        <Skeleton className="h-5 w-1/2 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground mb-4">内容不存在或已删除</p>
        <Button asChild variant="outline">
          <Link href="/cases">返回内容列表</Link>
        </Button>
      </div>
    );
  }

  const topic = topics?.find((t) => t.id === c.topicId);
  const juris = jurisdictions?.find((j) => j.id === c.jurisdictionId);
  const tags: string[] = Array.isArray(c.tags) ? c.tags : (c.tags ? JSON.parse(c.tags as string) : []);

  const typeIcon = c.type === "judicial" ? <Gavel className="w-3.5 h-3.5" /> :
    c.type === "regulatory" ? <Scale className="w-3.5 h-3.5" /> :
    <FileText className="w-3.5 h-3.5" />;

  // Split fullText into paragraphs for better readability
  const fullTextParagraphs = c.fullText
    ? c.fullText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

  // Split aiAnalysis into paragraphs
  const analysisParagraphs = c.aiAnalysis
    ? c.aiAnalysis.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="container max-w-6xl py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground -ml-2">
            <Link href="/cases">
              <ArrowLeft className="w-3.5 h-3.5" />
              返回内容列表
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => exportPdf.mutate({ id: c.id })}
              disabled={exportPdf.isPending}
            >
              {exportPdf.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />生成中…</>
                : <><Download className="w-3.5 h-3.5" />导出 PDF</>}
            </Button>
            {c.sourceUrl && (
              <Button asChild size="sm" className="gap-1.5">
                <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  查看原文
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-6xl py-8">
        {/* Page title area */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="secondary" className={cn("gap-1.5 text-xs", TYPE_BADGE_CLASS[c.type])}>
              {typeIcon}
              {TYPE_LABELS[c.type]?.label}
            </Badge>
            {juris && (
              <Badge variant="outline" className="gap-1.5 text-xs">
                <span>{juris.flag}</span>
                {juris.label}
              </Badge>
            )}
            {topic && (
              <Badge variant="outline" className="text-xs" style={{ borderColor: topic.color ?? undefined, color: topic.color ?? undefined }}>
                {topic.label}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-1.5">{c.title}</h1>
          {c.titleEn && (
            <p className="text-sm text-muted-foreground italic">{c.titleEn}</p>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">

          {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
          {/* On mobile: order-2 (shown below main); on desktop: order-1 (left column) */}
          <aside className="space-y-0 lg:sticky lg:top-[57px] order-2 lg:order-1">

            {/* Meta info */}
            <div className="pb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">基本信息</h2>
              <dl className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">发布日期</dt>
                    <dd className="text-sm font-medium">{formatDate(c.date)}</dd>
                  </div>
                </div>
                {c.source && (
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <dt className="text-xs text-muted-foreground">发布机构</dt>
                      <dd className="text-sm font-medium">{c.source}</dd>
                    </div>
                  </div>
                )}
                {juris && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <dt className="text-xs text-muted-foreground">司法辖区</dt>
                      <dd className="text-sm font-medium">{juris.flag} {juris.label}</dd>
                    </div>
                  </div>
                )}
                {topic && (
                  <div className="flex items-start gap-2">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <dt className="text-xs text-muted-foreground">研究专题</dt>
                      <dd className="text-sm font-medium" style={{ color: topic.color ?? undefined }}>{topic.label}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">浏览次数</dt>
                    <dd className="text-sm font-medium">{(c.views ?? 0) + 1}</dd>
                  </div>
                </div>
                {c.sourceUrl && (
                  <div className="flex items-start gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <dt className="text-xs text-muted-foreground">原文链接</dt>
                      <dd>
                        <a
                          href={c.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline break-all line-clamp-2"
                        >
                          {c.sourceUrl}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>

            <Separator />

            {/* Tags */}
            {tags.length > 0 && (
              <>
                <CollapsibleSection icon={<Tag className="w-3.5 h-3.5" />} title="相关标签" defaultOpen={true}>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Link key={tag} href={`/cases?q=${encodeURIComponent(tag)}`}>
                        <Badge variant="secondary" className="cursor-pointer text-xs hover:bg-primary/10 hover:text-primary transition-colors">
                          {tag}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Related Files */}
            <AttachmentsSection caseId={c.id} />
            <Separator />
            {/* Citation */}
            <CitationBox
              c={c}
              jurisLabel={juris?.label}
              typeLabel={TYPE_LABELS[c.type]?.label}
            />

            <Separator />

            {/* Related */}
            <RelatedCases caseId={c.id} topicId={c.topicId ?? ""} />

          </aside>

          {/* ── RIGHT MAIN CONTENT ───────────────────────────────────────── */}
          {/* On mobile: order-1 (shown above aside); on desktop: order-2 (right column) */}
          <main className="space-y-0 min-w-0 order-1 lg:order-2">

            {/* Abstract – collapsible */}
            {c.abstract && (
              <>
                <CollapsibleSection icon={<BookOpen className="w-3.5 h-3.5" />} title="内容摘要" defaultOpen={true}>
                  <p className="text-[15px] leading-[1.8] text-foreground/85">{c.abstract}</p>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* AI Analysis – collapsible, paragraphs */}
            {analysisParagraphs.length > 0 && (
              <>
                <CollapsibleSection icon={<Scale className="w-3.5 h-3.5" />} title="深度法律分析" defaultOpen={true}>
                  <div className="space-y-4">
                    {analysisParagraphs.map((para, i) => (
                      <p key={i} className="text-[15px] leading-[1.8] text-foreground/85">{para}</p>
                    ))}
                  </div>
                </CollapsibleSection>
                <Separator />
              </>
            )}

            {/* Full Text – always visible, most important */}
            <div className="pt-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                原文正文
              </h2>
              {fullTextParagraphs.length > 0 ? (
                <div className="prose prose-sm max-w-none space-y-4">
                  {fullTextParagraphs.map((para, i) => (
                    <p
                      key={i}
                      className="text-[15px] leading-[1.9] text-foreground/90 indent-[2em] first:indent-0"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="py-10 border border-dashed border-border rounded-lg text-center">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">暂无原文正文内容</p>
                  <p className="text-xs text-muted-foreground/70">
                    {c.sourceUrl
                      ? "可在管理后台使用「重新抓取原文」功能自动填充，或手动编辑内容"
                      : "请在编辑页面填写原文链接后，使用 AI 提取功能自动抓取"}
                  </p>
                  {c.sourceUrl && (
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      前往原文链接查看
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Fallback if no content */}
            {!c.abstract && analysisParagraphs.length === 0 && fullTextParagraphs.length === 0 && (
              <div className="py-16 text-center text-muted-foreground text-sm">
                暂无正文内容，请查看原文链接
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
