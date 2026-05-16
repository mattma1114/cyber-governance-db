import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Wand2, Link2, X, Plus, CheckCircle2, Globe, FileText, Sparkles, Paperclip, Trash2, Eye, Upload, FileUp, AlertCircle } from "lucide-react";
import { FilePreviewModal, canPreview, type PreviewFile } from "@/components/FilePreviewModal";

const CASE_TYPES = [
  { value: "judicial", label: "司法内容" },
  { value: "regulatory", label: "监管执法" },
  { value: "legislation", label: "立法政策" },
];

type CaseForm = {
  type: "judicial" | "regulatory" | "legislation";
  title: string;
  titleEn: string;
  topicId: string;
  jurisdictionId: string;
  date: string;
  source: string;
  sourceUrl: string;
  abstract: string;
  aiAnalysis: string;
  fullText: string;
  tags: string[];
  language: string;
  status: "published" | "draft";
};

const defaultForm: CaseForm = {
  type: "judicial",
  title: "",
  titleEn: "",
  topicId: "",
  jurisdictionId: "",
  date: "",
  source: "",
  sourceUrl: "",
  abstract: "",
  aiAnalysis: "",
  fullText: "",
  tags: [],
  language: "zh",
  status: "draft",
};

// Underline input style
const ulInput =
  "w-full bg-transparent border-0 border-b border-border rounded-none px-0 py-2 text-sm focus:outline-none focus:ring-0 focus:border-foreground placeholder:text-muted-foreground/50 transition-colors";
const ulTextarea =
  "w-full bg-transparent border-0 border-b border-border rounded-none px-0 py-2 text-sm focus:outline-none focus:ring-0 focus:border-foreground placeholder:text-muted-foreground/50 transition-colors resize-none";
const ulLabel = "block text-xs text-muted-foreground mb-1";

// Strip Markdown symbols helper
const stripMd = (text: string) =>
  text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/`(.+?)`/g, "$1")
    .trim();

// AI Analysis Field: textarea with preview toggle
function AiAnalysisField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [preview, setPreview] = useState(false);
  const paragraphs = useMemo(
    () =>
      value
        ? value.split(/\n+/).map((p) => stripMd(p.trim())).filter(Boolean)
        : [],
    [value]
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className={ulLabel}>AI 分析</label>
        {value && (
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="w-3 h-3" />
            {preview ? "编辑" : "预览"}
          </button>
        )}
      </div>
      {preview ? (
        <div className="py-2 space-y-3 border-b border-border">
          {paragraphs.length > 0 ? (
            paragraphs.map((para, i) => (
              <p key={i} className="text-sm leading-[1.8] text-foreground/85">{para}</p>
            ))
          ) : (
            <p className="text-sm text-muted-foreground/50">暂无内容</p>
          )}
        </div>
      ) : (
        <textarea
          className={ulTextarea + " min-h-[200px]"}
          placeholder="AI 生成的深度法律分析（含法律意义、核心争议、引用条款、合规启示等）"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// AI loading steps definition
const AI_STEPS = [
  { id: "scrape", icon: Globe, label: "正在抓取原文内容", desc: "通过多通道爬虫获取页面全文…" },
  { id: "analyze", icon: Sparkles, label: "AI 深度分析中", desc: "提取关键字段、生成法律分析…" },
];

function AiLoadingOverlay({ step }: { step: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI 自动提取</p>
            <p className="text-xs text-muted-foreground">正在处理，请稍候…</p>
          </div>
        </div>

        <div className="space-y-4">
          {AI_STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div key={s.id} className={`flex items-start gap-3 transition-opacity duration-300 ${i > step ? "opacity-30" : "opacity-100"}`}>
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${isDone ? "bg-green-500/20" : isActive ? "bg-primary/15" : "bg-muted"}`}>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className={`text-xs font-medium ${isActive ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                    {s.label}
                  </p>
                  {isActive && (
                    <p className="text-xs text-muted-foreground mt-0.5 animate-pulse">{s.desc}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>


      </div>
    </div>
  );
}

export default function CaseEditor() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!params.id && params.id !== "new";
  const caseId = isEdit ? Number(params.id) : null;

  const [form, setForm] = useState<CaseForm>(defaultForm);
  const [tagInput, setTagInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // PDF full-text upload state
  const [fullTextMode, setFullTextMode] = useState<"text" | "pdf">("text");
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Duplicate detection state (debounced)
  const [dupTitle, setDupTitle] = useState("");
  const [dupUrl, setDupUrl] = useState("");
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: dupResults } = trpc.cases.checkDuplicate.useQuery(
    { title: dupTitle || undefined, sourceUrl: dupUrl || undefined, excludeId: caseId ?? undefined },
    { enabled: (dupTitle.trim().length >= 4 || dupUrl.trim().length > 0) }
  );

  const triggerDupCheck = (title: string, url: string) => {
    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    dupTimerRef.current = setTimeout(() => {
      setDupTitle(title);
      setDupUrl(url);
    }, 600);
  };

  const { data: topics } = trpc.topics.list.useQuery();
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: existingCase, isLoading: caseLoading } = trpc.cases.getById.useQuery(
    { id: caseId! },
    { enabled: !!caseId }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.cases.create.useMutation({
    onSuccess: (data) => {
      toast.success("内容已创建，可继续上传附件");
      utils.cases.list.invalidate();
      // 跳转到编辑页，方便立即上传附件
      navigate(`/admin/cases/${data.id}/edit`);
    },
    onError: (e) => toast.error(`创建失败：${e.message}`),
  });

  const updateMutation = trpc.cases.update.useMutation({
    onSuccess: () => {
      toast.success("内容已更新");
      utils.cases.list.invalidate();
      utils.cases.getById.invalidate({ id: caseId! });
      navigate(`/cases/${caseId}`);
    },
    onError: (e) => toast.error(`更新失败：${e.message}`),
  });

  const extractFromUrlMutation = trpc.ai.extractCaseFromUrl.useMutation({
    onSuccess: (data) => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      // 立即填充表单并关闭弹窗
        // Map type value: backend may return 'enforcement' or 'policy', normalize to our enum
        const typeMap: Record<string, CaseForm["type"]> = {
          judicial: "judicial",
          regulatory: "regulatory",
          enforcement: "regulatory",
          legislation: "legislation",
          policy: "legislation",
        };
        const resolvedType = typeMap[data.type as string] || "judicial";

        setForm((prev) => ({
          ...prev,
          title: data.title || prev.title,
          titleEn: data.titleEn || prev.titleEn,
          abstract: data.abstract || prev.abstract,
          type: resolvedType,
          date: data.date || prev.date,
          topicId: (data as any).topicId || prev.topicId,
          jurisdictionId: (data as any).jurisdictionId || prev.jurisdictionId,
          source: (data as any).source || prev.source,
          language: (data as any).language || prev.language,
          tags: (data as any).tags?.length ? (data as any).tags : prev.tags,
          aiAnalysis: data.aiAnalysis || prev.aiAnalysis,
          fullText: (data as any).fullText || prev.fullText,
          sourceUrl: urlInput.trim() || prev.sourceUrl,
        }));

      setIsAiLoading(false);
      toast.success("AI 已自动提取并填充所有字段，请核对后保存");
    },
    onError: (e) => {
      setIsAiLoading(false);
      toast.error(`AI 提取失败：${e.message}`);
    },
  });

  // Sync PDF state from existing case
  useEffect(() => {
    if (existingCase) {
      const pdfUrl = (existingCase as any).fullTextPdfUrl;
      if (pdfUrl) {
        setFullTextMode("pdf");
        // Extract filename from URL or key
        const key = (existingCase as any).fullTextPdfKey ?? "";
        const name = key.split("/").pop() ?? "已上传的PDF文件.pdf";
        setPdfFilename(name);
      } else {
        setFullTextMode("text");
        setPdfFilename(null);
      }
    }
  }, [existingCase]);

  useEffect(() => {
    if (existingCase) {
      setForm({
        type: existingCase.type as CaseForm["type"],
        title: existingCase.title || "",
        titleEn: existingCase.titleEn || "",
        topicId: existingCase.topicId || "",
        jurisdictionId: existingCase.jurisdictionId || "",
        date: existingCase.date || "",
        source: existingCase.source || "",
        sourceUrl: existingCase.sourceUrl || "",
        abstract: existingCase.abstract || existingCase.aiSummary || "",
        aiAnalysis: existingCase.aiAnalysis || "",
        fullText: (existingCase as any).fullText || "",
        tags: existingCase.tags || [],
        language: existingCase.language || "zh",
        status: existingCase.status as CaseForm["status"],
      });
    }
  }, [existingCase]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, []);

  const handleChange = (field: keyof CaseForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleAiExtract = async () => {
    if (!urlInput.trim()) {
      toast.error("请输入内容 URL");
      return;
    }
    setAiStep(0);
    setIsAiLoading(true);

    // 约 3s 后切换到 AI 分析步骤（抓取预计完成）
    stepTimerRef.current = setTimeout(() => {
      setAiStep(1);
    }, 3000);

    try {
      await extractFromUrlMutation.mutateAsync({ url: urlInput.trim() });
    } catch {
      // error handled in onError
    }
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("请填写内容标题");
      return;
    }
    // map abstract → aiSummary for backward compat
    const payload = { ...form, aiSummary: form.abstract };
    if (isEdit && caseId) {
      updateMutation.mutate({ id: caseId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Attachments
  // PDF full-text mutations
  const uploadFullTextPdf = trpc.cases.uploadFullTextPdf.useMutation({
    onSuccess: (data) => {
      toast.success("PDF 已上传");
      setPdfFilename(data.filename);
      setIsUploadingPdf(false);
      utils.cases.getById.invalidate({ id: caseId! });
    },
    onError: (e) => {
      toast.error(`PDF 上传失败：${e.message}`);
      setIsUploadingPdf(false);
    },
  });

  const deleteFullTextPdf = trpc.cases.deleteFullTextPdf.useMutation({
    onSuccess: () => {
      toast.success("PDF 已删除");
      setPdfFilename(null);
      utils.cases.getById.invalidate({ id: caseId! });
    },
    onError: (e) => toast.error(e.message),
  });

  const [isParsing, setIsParsing] = useState(false);
  const parsePdfFullText = trpc.cases.parsePdfFullText.useMutation({
    onMutate: () => setIsParsing(true),
    onSuccess: (data) => {
      setIsParsing(false);
      // Directly fill fullText from the returned preview is not enough;
      // invalidate triggers re-fetch which updates existingCase, then the useEffect syncs form.
      // But we also explicitly set form.fullText here for immediate feedback.
      if (data.preview) {
        // The backend saved the full text; we need to fetch it.
        // We optimistically switch to text mode; the useEffect will fill in the full text after invalidation.
        setFullTextMode("text");
      }
      utils.cases.getById.invalidate({ id: caseId! });
      toast.success(`AI 解析完成！共 ${data.numPages} 页，提取 ${data.charCount.toLocaleString()} 字符，已自动填充到文本字段`);
    },
    onError: (e) => {
      setIsParsing(false);
      toast.error(`AI 解析失败：${e.message}`);
    },
  });

  const { data: attachments, refetch: refetchAttachments } = trpc.attachments.listByCaseId.useQuery(
    { caseId: caseId! },
    { enabled: !!caseId }
  );
  const uploadAttachment = trpc.attachments.upload.useMutation({
    onSuccess: () => {
      toast.success("附件上传成功");
      refetchAttachments();
      setIsUploadingFile(false);
    },
    onError: (e) => {
      toast.error(`上传失败：${e.message}`);
      setIsUploadingFile(false);
    },
  });
  const deleteAttachment = trpc.attachments.delete.useMutation({
    onSuccess: () => {
      toast.success("附件已删除");
      refetchAttachments();
    },
    onError: (e) => toast.error(e.message),
  });

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !caseId) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error("请选择 PDF 文件");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("PDF 文件大小不能超过 50MB");
      return;
    }
    setIsUploadingPdf(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFullTextPdf.mutate({
        caseId,
        filename: file.name,
        dataBase64: base64,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !caseId) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("文件大小不能超过 20MB");
      return;
    }
    setIsUploadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadAttachment.mutate({
        caseId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        dataBase64: base64,
      });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

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

  if (isEdit && caseLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* AI Loading Overlay */}
      {isAiLoading && <AiLoadingOverlay step={aiStep} />}

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-semibold tracking-wide">
              {isEdit ? "编辑内容" : "新增内容"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={form.status}
              onValueChange={(v) => handleChange("status", v)}
            >
              <SelectTrigger className="w-24 h-8 text-xs border-0 border-b border-border rounded-none bg-transparent focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSubmit} disabled={isSaving} size="sm" className="h-8 text-xs">
              {isSaving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              {isEdit ? "保存更改" : "创建内容"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content — single centered column */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {/* AI URL extraction */}
        <div className="flex items-start gap-3 py-4 border-b border-border">
          <Wand2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-xs font-medium text-primary">AI 自动提取（通过 URL）</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  className={ulInput + " pl-5"}
                  placeholder="粘贴内容原文 URL，AI 自动提取所有字段"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAiExtract()}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs shrink-0"
                onClick={handleAiExtract}
                disabled={isAiLoading || extractFromUrlMutation.isPending}
              >
                {(isAiLoading || extractFromUrlMutation.isPending) ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : "AI 提取"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              将自动提取：标题、类型、日期、研究专题、司法辖区、来源机构、语言、标签、摘要、AI 分析及原文全文，提取后可手动修改。
            </p>
          </div>
        </div>

        {/* Duplicate detection warning banner */}
        {dupResults && dupResults.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">注意：此内容可能已存在</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">AI 语义检测到以下疑似重复内容，请确认是否为新内容：</p>
              <ul className="mt-2 space-y-1.5">
                {dupResults.map((dup) => {
                  const score = (dup as any).similarityScore as number | null;
                  const reason = (dup as any).reason as string | null;
                  const riskLevel = score !== null
                    ? score >= 90 ? { label: "极高风险", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" }
                    : score >= 70 ? { label: "高风险", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" }
                    : { label: "中风险", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" }
                    : null;
                  return (
                    <li key={dup.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          dup.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                          dup.status === "draft" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" :
                          "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                        }`}>
                          {dup.status === "published" ? "已发布" : dup.status === "draft" ? "草稿" : "已下架"}
                        </span>
                        {riskLevel && (
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${riskLevel.cls}`}>
                            {riskLevel.label}{score !== null ? ` ${score}%` : ""}
                          </span>
                        )}
                        <a
                          href={`/cases/${dup.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-800 dark:text-amber-300 hover:underline truncate"
                        >
                          {dup.title}
                        </a>
                        <span className="text-amber-600/60 dark:text-amber-500/60 shrink-0">{dup.date}</span>
                      </div>
                      {reason && (
                        <p className="text-[11px] text-amber-600/70 dark:text-amber-500/70 pl-1">└ {reason}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Section: 基本信息 */}
        <section className="space-y-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">基本信息</h2>

          {/* Type + Date */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className={ulLabel}>内容类型 *</label>
              <Select value={form.type} onValueChange={(v) => handleChange("type", v)}>
                <SelectTrigger className="w-full border-0 border-b border-border rounded-none bg-transparent px-0 h-9 text-sm focus:ring-0 focus:border-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={ulLabel}>日期</label>
              <input
                type="date"
                className={ulInput}
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={ulLabel}>内容标题（中文）*</label>
            <input
              className={ulInput + " text-base font-medium"}
              placeholder="请输入内容标题"
              value={form.title}
              onChange={(e) => {
                handleChange("title", e.target.value);
                triggerDupCheck(e.target.value, form.sourceUrl);
              }}
            />
          </div>

          {/* Title EN */}
          <div>
            <label className={ulLabel}>内容标题（英文）</label>
            <input
              className={ulInput}
              placeholder="Case title in English"
              value={form.titleEn}
              onChange={(e) => handleChange("titleEn", e.target.value)}
            />
          </div>

          {/* Topic + Jurisdiction */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className={ulLabel}>研究专题</label>
              <Select
                value={form.topicId || "_none"}
                onValueChange={(v) => handleChange("topicId", v === "_none" ? "" : v)}
              >
                <SelectTrigger className="w-full border-0 border-b border-border rounded-none bg-transparent px-0 h-9 text-sm focus:ring-0 focus:border-foreground">
                  <SelectValue placeholder="选择专题" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">无</SelectItem>
                  {topics?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={ulLabel}>司法辖区</label>
              <Select
                value={form.jurisdictionId || "_none"}
                onValueChange={(v) => handleChange("jurisdictionId", v === "_none" ? "" : v)}
              >
                <SelectTrigger className="w-full border-0 border-b border-border rounded-none bg-transparent px-0 h-9 text-sm focus:ring-0 focus:border-foreground">
                  <SelectValue placeholder="选择辖区" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">无</SelectItem>
                  {jurisdictions?.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.flag} {j.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source + URL */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className={ulLabel}>来源机构</label>
              <input
                className={ulInput}
                placeholder="如：欧盟法院、FTC"
                value={form.source}
                onChange={(e) => handleChange("source", e.target.value)}
              />
            </div>
            <div>
              <label className={ulLabel}>来源 URL</label>
              <input
                className={ulInput}
                placeholder="https://..."
                value={form.sourceUrl}
                onChange={(e) => {
                  handleChange("sourceUrl", e.target.value);
                  triggerDupCheck(form.title, e.target.value);
                }}
              />
            </div>
          </div>

          {/* Language + Tags */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className={ulLabel}>语言</label>
              <Select value={form.language} onValueChange={(v) => handleChange("language", v)}>
                <SelectTrigger className="w-full border-0 border-b border-border rounded-none bg-transparent px-0 h-9 text-sm focus:ring-0 focus:border-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={ulLabel}>标签</label>
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <input
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/50"
                  placeholder="输入后按 Enter 添加"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                />
                <button onClick={addTag} className="text-muted-foreground hover:text-foreground">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                      {tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section: 摘要与分析 */}
        <section className="space-y-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">摘要与分析</h2>

          <div>
            <label className={ulLabel}>内容摘要</label>
            <textarea
              className={ulTextarea + " min-h-[80px]"}
              placeholder="简要描述内容背景和核心要点（AI 提取后可手动修改）"
              value={form.abstract}
              onChange={(e) => handleChange("abstract", e.target.value)}
            />
          </div>

          <div>
            <AiAnalysisField
              value={form.aiAnalysis}
              onChange={(v) => handleChange("aiAnalysis", v)}
            />
          </div>
        </section>

        {/* Section: 原文全文 — main content area */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">原文全文</h2>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <button
                type="button"
                onClick={() => {
                  if (fullTextMode === "pdf" && pdfFilename) {
                    if (!confirm("切换到文本模式将清除已上传的 PDF，确定继续？")) return;
                    if (caseId) deleteFullTextPdf.mutate({ caseId });
                    else setPdfFilename(null);
                  }
                  setFullTextMode("text");
                }}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  fullTextMode === "text"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                文本输入
              </button>
              <button
                type="button"
                onClick={() => {
                  if (fullTextMode === "text" && form.fullText.trim()) {
                    if (!confirm("切换到 PDF 模式将清除已填写的文本内容，确定继续？")) return;
                    handleChange("fullText", "");
                  }
                  setFullTextMode("pdf");
                }}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  fullTextMode === "pdf"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                上传 PDF
              </button>
            </div>
          </div>

          {fullTextMode === "text" ? (
            <textarea
              className="w-full bg-transparent border-b border-border rounded-none px-0 py-3 text-sm font-mono focus:outline-none focus:ring-0 focus:border-foreground placeholder:text-muted-foreground/40 transition-colors resize-none min-h-[400px]"
              placeholder="AI 提取后将自动填充原文内容，也可在此手动粘贴…"
              value={form.fullText}
              onChange={(e) => handleChange("fullText", e.target.value)}
            />
          ) : (
            <div className="border-b border-border pb-4">
              {pdfFilename ? (
                /* PDF already uploaded */
                <div className="flex items-center gap-3 py-3 px-4 bg-muted/40 rounded-lg">
                  <FileText className="w-8 h-8 text-red-500/80 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pdfFilename}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PDF 原文已上传，前台将显示在线阅读器</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {isEdit && caseId && (existingCase as any)?.fullTextPdfUrl && (
                      <button
                        type="button"
                        disabled={isParsing}
                        className="inline-flex items-center gap-1 text-xs text-primary/80 hover:text-primary px-2 py-1 rounded hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        onClick={() => {
                          if (confirm("AI 将自动提取 PDF 文本并填充到「原文全文」文本字段。如已有文本内容将被覆盖，确定继续？")) {
                            parsePdfFullText.mutate({ caseId });
                          }
                        }}
                      >
                        {isParsing ? (
                          <><Loader2 className="w-3 h-3 animate-spin" />解析中…</>
                        ) : (
                          <><Sparkles className="w-3 h-3" />AI 解析全文</>
                        )}
                      </button>
                    )}
                    {isEdit && (existingCase as any)?.fullTextPdfUrl && (
                      <a
                        href={(existingCase as any).fullTextPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        预览
                      </a>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      <Upload className="w-3 h-3" />
                      替换
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-destructive/70 hover:text-destructive px-2 py-1 rounded hover:bg-destructive/10 transition-colors"
                      onClick={() => {
                        if (confirm(`确定删除已上传的 PDF？`)) {
                          if (caseId) deleteFullTextPdf.mutate({ caseId });
                          else setPdfFilename(null);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                      删除
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload area */
                <div
                  className="flex flex-col items-center justify-center gap-3 py-10 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => {
                    if (!isEdit) {
                      toast.error("请先保存内容后再上传 PDF");
                      return;
                    }
                    pdfInputRef.current?.click();
                  }}
                >
                  {isUploadingPdf ? (
                    <>
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                      <p className="text-sm text-muted-foreground">正在上传 PDF…</p>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-8 h-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {isEdit ? "点击上传 PDF 文件" : "请先保存内容后再上传 PDF"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">支持 PDF 格式，最大 50MB</p>
                      </div>
                    </>
                  )}
                </div>
              )}
              <input
                ref={pdfInputRef}
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handlePdfSelect}
              />
            </div>
          )}
        </section>

        {/* Section: 相关文件 */}
        <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                相关文件
              </h2>
              <div className="flex items-center gap-2">
                {!isEdit && (
                  <span className="text-xs text-amber-600/80">请先保存内容后再上传附件</span>
                )}
                {isEdit && (
                  <>
                    <span className="text-xs text-muted-foreground">支持 PDF、Word、图片等，单文件最大 20MB</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs"
                      disabled={isUploadingFile}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploadingFile
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Plus className="w-3 h-3" />}
                      上传文件
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip"
                      onChange={handleFileSelect}
                    />
                  </>
                )}
              </div>
            </div>

            {/* 附件列表 */}
            {attachments && attachments.length > 0 ? (
              <>
                <div className="divide-y divide-border">
                  {attachments.map((att, idx) => {
                    const previewFile: PreviewFile = {
                      id: att.id,
                      filename: att.filename,
                      fileUrl: att.fileUrl,
                      mimeType: att.mimeType ?? undefined,
                      fileSize: att.fileSize ?? undefined,
                    };
                    const previewable = canPreview(previewFile);
                    return (
                      <div key={att.id} className="flex items-center gap-3 py-2.5">
                        <span className="text-lg shrink-0">{getFileIcon(att.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <button
                            className="text-sm truncate text-left hover:text-primary transition-colors w-full"
                            onClick={() => previewable ? setPreviewIndex(idx) : window.open(att.fileUrl, '_blank')}
                          >
                            {att.filename}
                          </button>
                          {att.fileSize && (
                            <p className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {previewable ? (
                            <button
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                              onClick={() => setPreviewIndex(idx)}
                            >
                              <Eye className="w-3 h-3" />
                              预览
                            </button>
                          ) : (
                            <a
                              href={att.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              下载
                            </a>
                          )}
                          <button
                            className="inline-flex items-center gap-1 text-xs text-destructive/70 hover:text-destructive px-2 py-1 rounded hover:bg-destructive/10 transition-colors"
                            onClick={() => {
                              if (confirm(`确定删除文件「${att.filename}」？`)) {
                                deleteAttachment.mutate({ id: att.id });
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                            删除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* File preview modal */}
                {previewIndex !== null && (
                  <FilePreviewModal
                    files={(attachments ?? []).map((att) => ({
                      id: att.id,
                      filename: att.filename,
                      fileUrl: att.fileUrl,
                      mimeType: att.mimeType ?? undefined,
                      fileSize: att.fileSize ?? undefined,
                    }))}
                    initialIndex={previewIndex}
                    onClose={() => setPreviewIndex(null)}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground/60 py-3 border-b border-border">
                暂无相关文件，点击「上传文件」添加
              </p>
            )}
          </section>

        {/* Bottom save */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "保存更改" : "创建内容"}
          </Button>
        </div>
      </div>
    </div>
  );
}
