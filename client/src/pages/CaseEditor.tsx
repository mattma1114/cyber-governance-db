import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, Loader2, Link2, CheckCircle2, AlertCircle,
  FileText, Tag, Globe, Calendar, BookOpen, Lightbulb,
  Save, Eye, X, Plus, ShieldCheck, AlertTriangle, ScrollText
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS } from "@/lib/utils";

// ── Underline Input ────────────────────────────────────────────────────────────
// All text inputs use bottom-border-only style (no box)
function UInput({
  value, onChange, placeholder, disabled, className, type, onKeyDown,
}: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; disabled?: boolean; className?: string;
  type?: string; onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type={type ?? "text"}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full bg-transparent border-0 border-b border-border/60 rounded-none px-0 py-2",
        "text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary",
        "transition-colors disabled:opacity-50",
        className
      )}
    />
  );
}

// ── Underline Textarea ─────────────────────────────────────────────────────────
function UTextarea({
  value, onChange, placeholder, rows, className,
}: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number; className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows ?? 4}
      className={cn(
        "w-full bg-transparent border-0 border-b border-border/60 rounded-none px-0 py-2",
        "text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary",
        "transition-colors resize-none",
        className
      )}
    />
  );
}

// ── Section ────────────────────────────────────────────────────────────────────
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <span className="text-primary">{icon}</span>
        <h3 className="font-semibold text-sm text-foreground/80 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/70 pt-0.5">{hint}</p>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface CaseEditorProps {
  editId?: number;
}

export default function CaseEditor({ editId }: CaseEditorProps) {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: topics } = trpc.topics.list.useQuery();
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: existingCase, isLoading: caseLoading } = trpc.cases.getById.useQuery(
    { id: editId! },
    { enabled: !!editId }
  );

  // ── AI URL state ──────────────────────────────────────────────────────────
  const [urlInput, setUrlInput] = useState("");
  const [aiMode, setAiMode] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const [savedCaseId, setSavedCaseId] = useState<number | null>(editId ?? null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "",
    titleEn: "",
    type: "" as "judicial" | "regulatory" | "legislation" | "",
    topicId: "",
    jurisdictionId: "",
    date: "",
    source: "",
    sourceUrl: "",
    abstract: "",
    aiSummary: "",
    fullText: "",        // 原文全文
    tags: [] as string[],
    language: "zh",
    status: "draft" as "published" | "draft",
  });
  const [tagInput, setTagInput] = useState("");

  // Load existing case for editing
  useEffect(() => {
    if (existingCase) {
      setForm({
        title: existingCase.title ?? "",
        titleEn: existingCase.titleEn ?? "",
        type: (existingCase.type as any) ?? "",
        topicId: existingCase.topicId ?? "",
        jurisdictionId: existingCase.jurisdictionId ?? "",
        date: existingCase.date ?? "",
        source: existingCase.source ?? "",
        sourceUrl: existingCase.sourceUrl ?? "",
        abstract: existingCase.abstract ?? "",
        aiSummary: existingCase.aiSummary ?? "",
        fullText: (existingCase as any).fullText ?? "",
        tags: Array.isArray(existingCase.tags) ? existingCase.tags : [],
        language: existingCase.language ?? "zh",
        status: existingCase.status ?? "draft",
      });
    }
  }, [existingCase]);

  // ── AI writing state ─────────────────────────────────────────────────────
  const [aiWriting, setAiWriting] = useState(false);

  // Check if services are configured
  const { data: settingsList } = trpc.settings.list.useQuery();
  const hasFirecrawl = settingsList?.some((s: any) => s.key === "firecrawl_api_key" && s.hasValue) ?? false;
  const hasAiWriting = settingsList?.some((s: any) => s.key === "openai_api_key" && s.hasValue) ?? false;

  // AI generate summary
  const generateSummary = trpc.ai.generateContent.useMutation({
    onSuccess: (res: { content: string }) => {
      setF("aiSummary", res.content);
      setAiWriting(false);
      toast.success("内容解读已生成，请检查并修改");
    },
    onError: (e: any) => {
      setAiWriting(false);
      toast.error(`AI 生成失败：${e.message}`);
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const extractFromUrl = trpc.ai.extractFromUrl.useMutation({
    onSuccess: (res) => {
      const d = res.data;
      setForm((prev) => ({
        ...prev,
        title: d.title || prev.title,
        titleEn: d.titleEn || prev.titleEn,
        type: (["judicial", "regulatory", "legislation"].includes(d.type) ? d.type : prev.type) as any,
        date: d.date || prev.date,
        source: d.source || prev.source,
        sourceUrl: d.sourceUrl || prev.sourceUrl,
        abstract: d.abstract || prev.abstract,
        aiSummary: d.aiSummary || prev.aiSummary,
        tags: d.tags?.length ? d.tags : prev.tags,
        language: d.language || prev.language,
        topicId: d.topicId || prev.topicId,
        jurisdictionId: d.jurisdictionId || prev.jurisdictionId,
      }));
      setAiMode("done");
      toast.success("AI 已自动填充内容，请检查并确认各字段");
    },
    onError: (e) => {
      setAiError(e.message);
      setAiMode("error");
      toast.error(`AI 提取失败：${e.message}`);
    },
  });

  const createCase = trpc.cases.create.useMutation({
    onSuccess: () => {
      toast.success("案例已创建");
      utils.cases.listAdmin.invalidate();
      utils.cases.stats.invalidate();
      navigate("/admin");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateCase = trpc.cases.update.useMutation({
    onSuccess: () => {
      toast.success("案例已更新");
      utils.cases.listAdmin.invalidate();
      navigate("/admin");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAiExtract = () => {
    if (!urlInput.trim()) { toast.error("请输入 URL"); return; }
    setAiMode("loading");
    setAiError("");
    extractFromUrl.mutate({ url: urlInput.trim() });
  };

  const setF = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setF("tags", [...form.tags, t]);
    setTagInput("");
  };

  const [previewing, setPreviewing] = useState(false);

  const handlePreview = async () => {
    if (!form.title) { toast.error("请填写案例标题"); return; }
    if (!form.type) { toast.error("请选择案例类型"); return; }
    if (!form.topicId) { toast.error("请选择所属专题"); return; }
    if (!form.jurisdictionId) { toast.error("请选择司法辖区"); return; }
    if (!form.date) { toast.error("请填写日期"); return; }
    setPreviewing(true);
    const payload = {
      ...form,
      type: form.type as "judicial" | "regulatory" | "legislation",
      status: form.status,
    };
    try {
      if (editId) {
        await updateCase.mutateAsync({ id: editId, ...payload });
        toast.success("已保存，正在打开预览...");
        window.open(`/cases/${editId}`, "_blank");
      } else {
        const res = await createCase.mutateAsync(payload) as any;
        const newId = res?.id;
        if (newId) {
          setSavedCaseId(newId);
          toast.success("已保存，正在打开预览...");
          window.open(`/cases/${newId}`, "_blank");
        } else {
          toast.error("保存成功但无法获取案例 ID，请手动预览");
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "保存失败，无法预览");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = (publish?: boolean) => {
    if (!form.title) { toast.error("请填写案例标题"); return; }
    if (!form.type) { toast.error("请选择案例类型"); return; }
    if (!form.topicId) { toast.error("请选择所属专题"); return; }
    if (!form.jurisdictionId) { toast.error("请选择司法辖区"); return; }
    if (!form.date) { toast.error("请填写日期"); return; }

    const payload = {
      ...form,
      type: form.type as "judicial" | "regulatory" | "legislation",
      status: publish ? "published" as const : form.status,
    };

    if (editId) {
      updateCase.mutate({ id: editId, ...payload });
    } else {
      createCase.mutate(payload);
    }
  };

  // ── Auth guards ───────────────────────────────────────────────────────────
  if (authLoading) {
    return <div className="container py-20 flex items-center justify-center"><Skeleton className="h-12 w-48" /></div>;
  }
  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center">
        <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-bold mb-2">需要登录</h2>
        <Button asChild><a href={getLoginUrl()}>登录</a></Button>
      </div>
    );
  }
  if (user?.role !== "admin") {
    return (
      <div className="container py-20 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h2 className="text-xl font-bold mb-2">权限不足</h2>
        <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
      </div>
    );
  }
  if (editId && caseLoading) {
    return <div className="container py-20 flex items-center justify-center"><Skeleton className="h-12 w-48" /></div>;
  }

  const isSaving = createCase.isPending || updateCase.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <div>
              <h1 className="text-sm font-semibold">{editId ? "编辑案例" : "新增案例"}</h1>
              <p className="text-xs text-muted-foreground">互联网平台治理数据库 · 管理后台</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-5xl">
        {/* ── AI URL Panel ── */}
        <div className={cn(
          "mb-8 rounded-2xl border p-5 transition-all",
          aiMode === "done" ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/10" :
          aiMode === "error" ? "border-destructive/30 bg-destructive/5" :
          "border-primary/20 bg-primary/3"
        )}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI 自动填充</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                粘贴案例原文 URL，AI 将自动抓取页面内容并解析填充所有字段。填充后请仔细核对每个字段。
              </p>
            </div>
            {aiMode === "done" && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />已填充
              </div>
            )}
          </div>

          {!hasFirecrawl && (
            <div className="mb-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Firecrawl API Key 未配置，无法使用 URL 自动填充。请前往管理员后台 → API 配置进行配置。</span>
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <UInput
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && hasFirecrawl && handleAiExtract()}
                placeholder="https://example.com/case-article"
                disabled={aiMode === "loading" || !hasFirecrawl}
                className="pl-8"
              />
            </div>
            <Button
              onClick={handleAiExtract}
              disabled={aiMode === "loading" || !urlInput.trim() || !hasFirecrawl}
              className="gap-2 shrink-0"
            >
              {aiMode === "loading" ? (
                <><Loader2 className="w-4 h-4 animate-spin" />分析中…</>
              ) : (
                <><Sparkles className="w-4 h-4" />AI 自动填充</>
              )}
            </Button>
          </div>

          {aiMode === "error" && (
            <div className="mt-3 flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{aiError || "提取失败，请检查 URL 或手工填写"}</span>
            </div>
          )}
          {aiMode === "done" && (
            <p className="mt-3 text-xs text-green-600 dark:text-green-400">
              AI 已完成填充，请向下滚动检查各字段，必要时手动修正。
            </p>
          )}
        </div>

        {/* ── Form ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Main content */}
          <div className="lg:col-span-2 space-y-10">

            {/* Basic Info */}
            <SectionCard icon={<FileText className="w-4 h-4" />} title="基本信息">
              <FieldRow label="案例标题（中文）" required>
                <UInput
                  value={form.title}
                  onChange={(e) => setF("title", e.target.value)}
                  placeholder="如：欧盟委员会对 Meta 数据跨境传输案"
                />
              </FieldRow>
              <FieldRow label="案例标题（英文）" hint="如有英文原名请填写">
                <UInput
                  value={form.titleEn}
                  onChange={(e) => setF("titleEn", e.target.value)}
                  placeholder="e.g. EU Commission v. Meta Data Transfer Case"
                />
              </FieldRow>
              <div className="grid grid-cols-2 gap-6">
                <FieldRow label="日期" required>
                  <UInput
                    value={form.date}
                    onChange={(e) => setF("date", e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </FieldRow>
                <FieldRow label="原文语言">
                  <Select value={form.language} onValueChange={(v) => setF("language", v)}>
                    <SelectTrigger className="border-0 border-b border-border/60 rounded-none px-0 h-9 focus:ring-0 shadow-none bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="en">英文</SelectItem>
                      <SelectItem value="de">德文</SelectItem>
                      <SelectItem value="fr">法文</SelectItem>
                      <SelectItem value="ja">日文</SelectItem>
                      <SelectItem value="ko">韩文</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <FieldRow label="来源机构">
                  <UInput
                    value={form.source}
                    onChange={(e) => setF("source", e.target.value)}
                    placeholder="如：欧盟委员会"
                  />
                </FieldRow>
                <FieldRow label="来源 URL">
                  <UInput
                    value={form.sourceUrl}
                    onChange={(e) => setF("sourceUrl", e.target.value)}
                    placeholder="https://..."
                  />
                </FieldRow>
              </div>
            </SectionCard>

            {/* Abstract */}
            <SectionCard icon={<BookOpen className="w-4 h-4" />} title="案例摘要">
              <FieldRow label="摘要" hint="200-500字，概述案例背景、主要事实和结果">
                <UTextarea
                  value={form.abstract}
                  onChange={(e) => setF("abstract", e.target.value)}
                  rows={5}
                  placeholder="请简要描述案例背景、涉及平台、主要违规行为及处理结果…"
                />
              </FieldRow>
            </SectionCard>

            {/* Content Summary */}
            <SectionCard icon={<Lightbulb className="w-4 h-4" />} title="内容解读">
              <FieldRow label="内容解读" hint="300-800字，详细描述监管动态、处罚内容、事件经过">
                <UTextarea
                  value={form.aiSummary}
                  onChange={(e) => setF("aiSummary", e.target.value)}
                  rows={8}
                  placeholder="详细描述案例的主要事实、监管机构的调查过程、处罚决定及金额、平台的回应措施等…"
                />
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-7 px-2 text-primary hover:text-primary"
                    disabled={aiWriting || !form.abstract || !hasAiWriting}
                    onClick={() => {
                      if (!hasAiWriting) { toast.error("请先在管理员后台配置 AI 写作 API Key"); return; }
                      setAiWriting(true);
                      generateSummary.mutate({ type: "summary", title: form.title, abstract: form.abstract, type_: form.type });
                    }}
                  >
                    {aiWriting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {aiWriting ? "AI 生成中…" : "AI 辅助写作"}
                    {!hasAiWriting && <span className="text-amber-500 ml-1">(需配置)</span>}
                  </Button>
                </div>
              </FieldRow>
            </SectionCard>

            {/* Full Text */}
            <SectionCard icon={<ScrollText className="w-4 h-4" />} title="原文全文">
              <FieldRow label="原文全文" hint="粘贴案例原始文件全文（可选）">
                <UTextarea
                  value={form.fullText}
                  onChange={(e) => setF("fullText", e.target.value)}
                  rows={12}
                  placeholder="粘贴原文全文内容…"
                />
              </FieldRow>
            </SectionCard>
          </div>

          {/* Right: Metadata */}
          <div className="space-y-8">

            {/* Classification */}
            <SectionCard icon={<Tag className="w-4 h-4" />} title="分类信息">
              <FieldRow label="案例类型" required>
                <Select value={form.type} onValueChange={(v) => setF("type", v)}>
                  <SelectTrigger className="border-0 border-b border-border/60 rounded-none px-0 h-9 focus:ring-0 shadow-none bg-transparent">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="judicial">⚖️ 司法案例</SelectItem>
                    <SelectItem value="regulatory">🏛️ 监管执法</SelectItem>
                    <SelectItem value="legislation">📋 立法政策</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow label="所属专题" required>
                <Select value={form.topicId} onValueChange={(v) => setF("topicId", v)}>
                  <SelectTrigger className="border-0 border-b border-border/60 rounded-none px-0 h-9 focus:ring-0 shadow-none bg-transparent">
                    <SelectValue placeholder="选择专题" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow label="司法辖区" required>
                <Select value={form.jurisdictionId} onValueChange={(v) => setF("jurisdictionId", v)}>
                  <SelectTrigger className="border-0 border-b border-border/60 rounded-none px-0 h-9 focus:ring-0 shadow-none bg-transparent">
                    <SelectValue placeholder="选择辖区" />
                  </SelectTrigger>
                  <SelectContent>
                    {jurisdictions?.map((j: any) => (
                      <SelectItem key={j.id} value={j.id}>{j.flag} {j.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            </SectionCard>

            {/* Tags */}
            <SectionCard icon={<Tag className="w-4 h-4" />} title="标签">
              <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs pr-1">
                    {tag}
                    <button
                      onClick={() => setF("tags", form.tags.filter((t) => t !== tag))}
                      className="hover:text-destructive transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <UInput
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="输入标签后按 Enter"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={addTag} className="shrink-0 h-8 w-8">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </SectionCard>

            {/* Publish status */}
            <SectionCard icon={<Eye className="w-4 h-4" />} title="发布状态">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium">{form.status === "published" ? "已发布" : "草稿"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {form.status === "published" ? "前台用户可见" : "仅管理员可见"}
                  </p>
                </div>
                <Switch
                  checked={form.status === "published"}
                  onCheckedChange={(v) => setF("status", v ? "published" : "draft")}
                />
              </div>
            </SectionCard>

            {/* Save buttons */}
            <div className="space-y-2 pt-2">
              <Button
                className="w-full gap-2"
                onClick={() => handleSave(true)}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                保存并发布
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                <Save className="w-4 h-4" />
                仅保存草稿
              </Button>
              {form.title && form.type && form.topicId && form.jurisdictionId && form.date && (
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-primary hover:text-primary"
                  onClick={handlePreview}
                  disabled={previewing || isSaving}
                >
                  {previewing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />保存并预览...</>
                  ) : (
                    <><Eye className="w-4 h-4" />保存并预览</>
                  )}
                </Button>
              )}
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/admin">取消，返回后台</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
