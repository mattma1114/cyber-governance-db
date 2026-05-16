import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, ExternalLink, Calendar, Building2, Tag, BookOpen,
  Scale, FileText, Gavel, Quote, Copy, Check, ChevronDown, ChevronUp,
  Download, Loader2, MapPin, Layers, Paperclip, FileDown, Languages, AlignLeft, AlignJustify, Columns2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS, formatDate } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { FilePreviewModal, canPreview, type PreviewFile } from "@/components/FilePreviewModal";
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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

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

  const previewFiles: PreviewFile[] = attachments.map(a => ({
    id: a.id,
    filename: a.filename,
    fileUrl: a.fileUrl,
    mimeType: a.mimeType,
    fileSize: a.fileSize,
  }));

  return (
    <>
      <CollapsibleSection icon={<Paperclip className="w-3.5 h-3.5" />} title="相关文件" defaultOpen={true}>
        <div className="divide-y divide-border/50">
          {attachments.map((att, idx) => {
            const pf: PreviewFile = {
              id: att.id, filename: att.filename,
              fileUrl: att.fileUrl, mimeType: att.mimeType, fileSize: att.fileSize,
            };
            const previewable = canPreview(pf);
            return (
              <div key={att.id} className="flex items-center gap-2.5 py-2 group">
                <span className="text-base shrink-0">{getFileIcon(att.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  {previewable ? (
                    <button
                      className="text-xs font-medium truncate text-left w-full hover:text-primary transition-colors cursor-pointer"
                      onClick={() => setPreviewIndex(idx)}
                    >
                      {att.filename}
                    </button>
                  ) : (
                    <p className="text-xs font-medium truncate">{att.filename}</p>
                  )}
                  {att.fileSize && (
                    <p className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {previewable && (
                    <button
                      className="text-xs text-muted-foreground/60 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors"
                      onClick={() => setPreviewIndex(idx)}
                    >
                      预览
                    </button>
                  )}
                  <a
                    href={att.fileUrl}
                    download={att.filename}
                    className="inline-flex items-center justify-center"
                    title="下载"
                  >
                    <Download className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>
      {previewIndex !== null && (
        <FilePreviewModal
          files={previewFiles}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </>
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
  const downloadBlob = (base64: string, filename: string, mime: string) => {
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const exportPdf = trpc.cases.exportPdf.useMutation({
    onSuccess: (data) => {
      downloadBlob(data.base64, data.filename, "application/pdf");
      toast.success("PDF 已生成，正在下载");
    },
    onError: (err) => { toast.error(`PDF 生成失败：${err.message}`); },
  });
  const exportDocx = trpc.cases.exportDocx.useMutation({
    onSuccess: (data) => {
      downloadBlob(data.base64, data.filename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      toast.success("Word 文档已生成，正在下载");
    },
    onError: (err) => { toast.error(`Word 生成失败：${err.message}`); },
  });

  // ── Translation state + localStorage cache + progress ─────────────────────────────────────────────────────────────────────────────────────
  type TranslationPair = { original: string; translated: string };
  type ViewMode = "original" | "translated" | "bilingual";
  type TranslationCache = {
    pairs: TranslationPair[];
    viewMode: ViewMode;
    fullTextLength: number; // used to detect stale cache when fullText changes
  };

  const CACHE_KEY = `cgdb_translation_${caseId}`;

  // Start with null; restore from localStorage once case data is loaded (see useEffect below)
  const [translationPairs, setTranslationPairs] = useState<TranslationPair[] | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("bilingual");
  const cacheRestoredRef = useRef(false);

  // Restore translation cache once case data has loaded (so fullTextLength comparison is valid)
  useEffect(() => {
    if (!c || cacheRestoredRef.current) return;
    cacheRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const cached: TranslationCache = JSON.parse(raw);
      // Invalidate if fullText has changed since last translation
      if (cached.fullTextLength !== (c.fullText?.length ?? 0)) return;
      setTranslationPairs(cached.pairs);
      setViewMode(cached.viewMode);
    } catch {
      // ignore parse errors
    }
  }, [c?.id, c?.fullText?.length]);

  // Progress state: 0-100 (estimated)
  const [translateProgress, setTranslateProgress] = useState(0);
  const [translateBatchLabel, setTranslateBatchLabel] = useState("");
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper: write translation result to localStorage
  const saveTranslationCache = useCallback((pairs: TranslationPair[], mode: ViewMode) => {
    try {
      const cache: TranslationCache = {
        pairs,
        viewMode: mode,
        fullTextLength: c?.fullText?.length ?? 0,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded)
    }
  }, [CACHE_KEY, c?.fullText?.length]);

  // Keep viewMode in cache in sync when user switches tabs
  useEffect(() => {
    if (!translationPairs) return;
    saveTranslationCache(translationPairs, viewMode);
  }, [viewMode]);

  const translateMutation = trpc.cases.translateFullText.useMutation({
    onMutate: () => {
      setIsTranslating(true);
      setTranslateProgress(5);
      setTranslateBatchLabel("正在准备翻译…");
      // Simulate gradual progress while waiting for the backend
      // We advance to ~85% over ~30s; the final jump to 100% happens onSuccess.
      let tick = 0;
      progressTimerRef.current = setInterval(() => {
        tick++;
        // Slow logarithmic growth: fast at start, plateaus near 85
        const next = Math.min(85, 5 + Math.round(80 * (1 - Math.exp(-tick / 12))));
        setTranslateProgress(next);
        // Update batch label based on estimated progress
        if (next < 30) setTranslateBatchLabel("正在翻译第 1 批…");
        else if (next < 55) setTranslateBatchLabel("正在翻译中间段落…");
        else if (next < 75) setTranslateBatchLabel("即将完成，正在整理结果…");
        else setTranslateBatchLabel("翻译即将完成…");
      }, 2500);
    },
    onSuccess: (data) => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setTranslateProgress(100);
      const totalB = data.totalBatches ?? 1;
      setTranslateBatchLabel(`共 ${data.totalParagraphs} 个段落，${totalB} 个批次`);
      setTimeout(() => {
        setIsTranslating(false);
        setTranslateProgress(0);
        setTranslateBatchLabel("");
      }, 600);
      setTranslationPairs(data.pairs);
      setViewMode("bilingual");
      saveTranslationCache(data.pairs, "bilingual");
      toast.success(`翻译完成！共 ${data.totalParagraphs} 个段落`);
    },
    onError: (err) => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setIsTranslating(false);
      setTranslateProgress(0);
      setTranslateBatchLabel("");
      toast.error(`翻译失败：${err.message}`);
    },
  });

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (progressTimerRef.current) clearInterval(progressTimerRef.current); };
  }, []);

  const handleTranslate = useCallback(() => {
    if (!caseId) return;
    translateMutation.mutate({ caseId });
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

  // Split fullText into paragraphs strictly by double-newline (\n\n).
  // We do NOT fall back to single-newline or sentence-boundary splitting,
  // as that would destroy the original document's paragraph structure.
  const fullTextParagraphs = c.fullText
    ? (() => {
        const raw = c.fullText!;
        // Strict: only split on double (or more) newlines — preserves original layout.
        // Do NOT fall back to single-newline or sentence-boundary splitting,
        // as that would destroy the original document's paragraph structure.
        return raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
      })()
    : [];

  // 彻底去除所有 Markdown 符号（**bold** / *italic* / # heading / `code` 等）
  const stripMd = (text: string) =>
    text
      .replace(/\*\*([^*]*)\*\*/g, "$1")   // **bold** → text
      .replace(/\*([^*]*)\*/g, "$1")         // *italic* → text
      .replace(/^#{1,6}\s+/gm, "")           // # heading
      .replace(/^[-*+]\s+/gm, "")            // - list
      .replace(/`([^`]*)`/g, "$1")           // `code`
      .replace(/\*\*/g, "")                  // 残余 **
      .replace(/\*/g, "")                    // 残余 *
      .replace(/\s{2,}/g, " ")              // 合并多余空格
      .trim();

  // 按编号（1. 2. 3. ...）拆分段落
  // 策略：先将所有换行合并为空格（避免同一编号段被换行截断），
  // 再按编号前缀拆分，最后去除 Markdown 符号
  const analysisParagraphs = c.aiAnalysis
    ? (() => {
        const raw = c.aiAnalysis!;
        // 将换行替换为空格，使整段文字在同一行便于按编号拆分
        const oneLine = raw.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
        // 按 "数字. " 前缀拆分（lookahead 保留编号）
        const segments = oneLine
          .split(/(?=\d+\.\s)/)
          .map((p) => p.trim())
          .filter(Boolean);
        // 如果拆分失败（无编号格式），回退到按换行分段
        const result = segments.length > 1
          ? segments
          : raw.split(/\n+/).map((p) => p.trim()).filter(Boolean);
        return result.map(stripMd).filter(Boolean);
      })()
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={exportPdf.isPending || exportDocx.isPending}
                >
                  {(exportPdf.isPending || exportDocx.isPending)
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />生成中…</>
                    : <><FileDown className="w-3.5 h-3.5" />导出档案<ChevronDown className="w-3 h-3 ml-0.5" /></>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportPdf.mutate({ id: c.id })}>
                  <Download className="w-3.5 h-3.5 mr-2" />导出为 PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportDocx.mutate({ id: c.id })}>
                  <FileText className="w-3.5 h-3.5 mr-2" />导出为 Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

            {/* Citation */}
            <CitationBox
              c={c}
              jurisLabel={juris?.label}
              typeLabel={TYPE_LABELS[c.type]?.label}
            />

            <Separator />

            {/* Related */}
            <RelatedCases caseId={c.id} topicId={c.topicId ?? ""} />
            {/* Related Files — at the bottom of sidebar */}
            <Separator />
            <AttachmentsSection caseId={c.id} />

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
              <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    原文正文
                  </h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                      本处配置为自动翻译，可能并不准确
                    </p>
                    {/* AI Translate button – only shown when there is text content */}
                    {fullTextParagraphs.length > 0 && (
                      <button
                        onClick={handleTranslate}
                        disabled={isTranslating}
                        className="inline-flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 font-medium"
                      >
                        {isTranslating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            AI 翻译中…
                          </>
                        ) : (
                          <>
                            <Languages className="w-3 h-3" />
                            {translationPairs ? '重新翻译' : '一键 AI 翻译'}
                          </>
                        )}
                      </button>
                    )}
                    {/* Cached indicator */}
                    {translationPairs && !isTranslating && (
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">已缓存</span>
                    )}
                  </div>
                  {/* Progress bar – shown while translating */}
                  {isTranslating && (
                    <div className="mt-2 space-y-1">
                      <Progress value={translateProgress} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground/60">
                        {translateBatchLabel} {translateProgress > 0 && translateProgress < 100 ? `${translateProgress}%` : ''}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* View mode toggle – only shown when translation is available */}
                  {translationPairs && (
                    <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                      <button
                        onClick={() => setViewMode('original')}
                        title="仅原文"
                        className={cn(
                          "p-1 rounded transition-colors",
                          viewMode === 'original' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('bilingual')}
                        title="双语对照"
                        className={cn(
                          "p-1 rounded transition-colors",
                          viewMode === 'bilingual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Columns2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode('translated')}
                        title="仅译文"
                        className={cn(
                          "p-1 rounded transition-colors",
                          viewMode === 'translated' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <AlignJustify className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {/* PDF download link */}
                  {(c as any).fullTextPdfUrl && (
                    <a
                      href={(c as any).fullTextPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      下载 PDF
                    </a>
                  )}
                </div>
              </div>

              {/* PDF Reader: shown when fullTextPdfUrl exists */}
{/* Helper: render text paragraphs according to viewMode */}
              {(() => {
                // Render a single text-only block (original / translated / bilingual)
                const renderTextBlock = () => {
                  if (!translationPairs) {
                    // No translation yet – show original paragraphs
                    return (
                      <div className="space-y-4">
                        {fullTextParagraphs.map((para, i) => (
                          <p key={i} className="text-[15px] leading-[1.85] text-foreground/90 whitespace-pre-line">
                            {para}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  if (viewMode === 'original') {
                    return (
                      <div className="space-y-4">
                        {translationPairs.map((pair, i) => (
                          <p key={i} className="text-[15px] leading-[1.85] text-foreground/90 whitespace-pre-line">
                            {pair.original}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  if (viewMode === 'translated') {
                    return (
                      <div className="space-y-4">
                        {translationPairs.map((pair, i) => (
                          <p key={i} className="text-[15px] leading-[1.85] text-foreground/90 whitespace-pre-line">
                            {pair.translated}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  // bilingual mode
                  return (
                    <div className="space-y-0">
                      {translationPairs.map((pair, i) => (
                        <div key={i} className="py-3 border-b border-border/40 last:border-b-0 space-y-1.5">
                          <p className="text-[13px] leading-[1.75] text-muted-foreground whitespace-pre-line">
                            {pair.original}
                          </p>
                          <p className="text-[15px] leading-[1.85] text-foreground whitespace-pre-line">
                            {pair.translated}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                };

                // PDF mode
                if ((c as any).fullTextPdfUrl) {
                  return (
                    <div className="space-y-3">
                      <div className="w-full rounded-lg overflow-hidden border border-border bg-muted/20">
                        <iframe
                          src={`${(c as any).fullTextPdfUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                          className="w-full"
                          style={{ height: "800px", border: "none" }}
                          title="原文 PDF 阅读器"
                        />
                      </div>
                      {/* Text version (collapsible) – supports translation view */}
                      {fullTextParagraphs.length > 0 && (
                        <details className="mt-4">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none py-2">
                            {translationPairs
                              ? '译文视图已启用，展开文本区域查看对照'
                              : '查看文本版原文'}
                          </summary>
                          <div className="mt-3 pt-3 border-t border-border">
                            {renderTextBlock()}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                }

                // Text-only mode
                if (fullTextParagraphs.length > 0) {
                  return renderTextBlock();
                }

                // Empty state
                return (
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
                );
              })()}
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
