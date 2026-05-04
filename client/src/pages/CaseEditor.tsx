import { useState, useEffect } from "react";
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
import { ArrowLeft, Loader2, Wand2, Link2, X, Plus } from "lucide-react";

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

export default function CaseEditor() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!params.id && params.id !== "new";
  const caseId = isEdit ? Number(params.id) : null;

  const [form, setForm] = useState<CaseForm>(defaultForm);
  const [tagInput, setTagInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { data: topics } = trpc.topics.list.useQuery();
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: existingCase, isLoading: caseLoading } = trpc.cases.getById.useQuery(
    { id: caseId! },
    { enabled: !!caseId }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.cases.create.useMutation({
    onSuccess: (data) => {
      toast.success("内容已创建");
      utils.cases.list.invalidate();
      navigate(`/cases/${data.id}`);
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
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        titleEn: data.titleEn || prev.titleEn,
        abstract: data.abstract || data.aiSummary || prev.abstract,
        type: (data.type as CaseForm["type"]) || prev.type,
        date: data.date || prev.date,
        aiAnalysis: data.aiAnalysis || prev.aiAnalysis,
      }));
      toast.success("AI 已自动提取内容信息");
    },
    onError: (e) => toast.error(`AI 提取失败：${e.message}`),
  });

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
    setIsAiLoading(true);
    try {
      await extractFromUrlMutation.mutateAsync({ url: urlInput.trim() });
      if (urlInput.trim() && !form.sourceUrl) {
        setForm((prev) => ({ ...prev, sourceUrl: urlInput.trim() }));
      }
    } finally {
      setIsAiLoading(false);
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

  if (isEdit && caseLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
                  placeholder="粘贴内容原文 URL，AI 自动提取标题、摘要、类型等信息"
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
              提取后可手动修改各字段。「原文全文」需单独粘贴。
            </p>
          </div>
        </div>

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

          {/* Title ZH */}
          <div>
            <label className={ulLabel}>内容标题（中文）*</label>
            <input
              className={ulInput + " text-base font-medium"}
              placeholder="请输入内容标题"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
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
                onChange={(e) => handleChange("sourceUrl", e.target.value)}
              />
            </div>
          </div>

          {/* Language */}
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
            <label className={ulLabel}>AI 分析</label>
            <textarea
              className={ulTextarea + " min-h-[160px]"}
              placeholder="AI 生成的详细分析内容"
              value={form.aiAnalysis}
              onChange={(e) => handleChange("aiAnalysis", e.target.value)}
            />
          </div>
        </section>

        {/* Section: 原文全文 — main content area */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">原文全文</h2>
            <span className="text-xs text-muted-foreground">
              粘贴判决书、执法决定、法规全文等原始文本
            </span>
          </div>
          <textarea
            className="w-full bg-transparent border-b border-border rounded-none px-0 py-3 text-sm font-mono focus:outline-none focus:ring-0 focus:border-foreground placeholder:text-muted-foreground/40 transition-colors resize-none min-h-[400px]"
            placeholder="在此粘贴原文全文内容…"
            value={form.fullText}
            onChange={(e) => handleChange("fullText", e.target.value)}
          />
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
