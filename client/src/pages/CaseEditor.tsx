import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  { value: "judicial", label: "司法案例" },
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
  aiSummary: string;
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
  aiSummary: "",
  aiAnalysis: "",
  fullText: "",
  tags: [],
  language: "zh",
  status: "draft",
};

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
      toast.success("案例已创建");
      utils.cases.list.invalidate();
      navigate(`/cases/${data.id}`);
    },
    onError: (e) => toast.error(`创建失败：${e.message}`),
  });

  const updateMutation = trpc.cases.update.useMutation({
    onSuccess: () => {
      toast.success("案例已更新");
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
        abstract: data.abstract || prev.abstract,
        type: (data.type as CaseForm["type"]) || prev.type,
        date: data.date || prev.date,
        aiSummary: data.aiSummary || prev.aiSummary,
        aiAnalysis: data.aiAnalysis || prev.aiAnalysis,
      }));
      toast.success("AI 已自动提取案例信息");
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
        abstract: existingCase.abstract || "",
        aiSummary: existingCase.aiSummary || "",
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
      toast.error("请输入案例 URL");
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
      toast.error("请填写案例标题");
      return;
    }
    if (isEdit && caseId) {
      updateMutation.mutate({ id: caseId, ...form });
    } else {
      createMutation.mutate(form);
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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-base font-semibold">
                {isEdit ? "编辑案例" : "新增案例"}
              </h1>
              {isEdit && (
                <p className="text-xs text-muted-foreground">ID: {caseId}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={form.status}
              onValueChange={(v) => handleChange("status", v)}
            >
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSubmit} disabled={isSaving} size="sm">
              {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {isEdit ? "保存更改" : "创建案例"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Main info */}
          <div className="lg:col-span-2 space-y-5">
            {/* AI URL extraction */}
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI 自动提取（通过 URL）</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9 text-sm"
                    placeholder="粘贴案例原文 URL，AI 自动提取标题、摘要、类型等信息"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAiExtract()}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleAiExtract}
                  disabled={isAiLoading || extractFromUrlMutation.isPending}
                >
                  {(isAiLoading || extractFromUrlMutation.isPending) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "AI 提取"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                提取后可手动修改各字段。「原文全文」需单独填写（如需保存原始文本）。
              </p>
            </div>

            {/* Basic info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">案例类型 *</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => handleChange("type", v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CASE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">日期</Label>
                  <Input
                    type="date"
                    className="h-9"
                    value={form.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">案例标题（中文）*</Label>
                <Input
                  className="h-9"
                  placeholder="请输入案例标题"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">案例标题（英文）</Label>
                <Input
                  className="h-9"
                  placeholder="Case title in English"
                  value={form.titleEn}
                  onChange={(e) => handleChange("titleEn", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">研究专题</Label>
                  <Select
                    value={form.topicId || "_none"}
                    onValueChange={(v) => handleChange("topicId", v === "_none" ? "" : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择专题" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">无</SelectItem>
                      {topics?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">司法辖区</Label>
                  <Select
                    value={form.jurisdictionId || "_none"}
                    onValueChange={(v) => handleChange("jurisdictionId", v === "_none" ? "" : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择辖区" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">无</SelectItem>
                      {jurisdictions?.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.flag} {j.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">来源机构</Label>
                  <Input
                    className="h-9"
                    placeholder="如：欧盟法院、FTC"
                    value={form.source}
                    onChange={(e) => handleChange("source", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">来源 URL</Label>
                  <Input
                    className="h-9"
                    placeholder="https://..."
                    value={form.sourceUrl}
                    onChange={(e) => handleChange("sourceUrl", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">案例摘要</Label>
                <Textarea
                  className="min-h-[100px] text-sm"
                  placeholder="简要描述案例背景和核心内容"
                  value={form.abstract}
                  onChange={(e) => handleChange("abstract", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">AI 摘要</Label>
                <Textarea
                  className="min-h-[100px] text-sm"
                  placeholder="AI 生成的简短摘要"
                  value={form.aiSummary}
                  onChange={(e) => handleChange("aiSummary", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">AI 分析</Label>
                <Textarea
                  className="min-h-[160px] text-sm"
                  placeholder="AI 生成的详细分析内容"
                  value={form.aiAnalysis}
                  onChange={(e) => handleChange("aiAnalysis", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Right: Meta */}
          <div className="space-y-5">
            {/* Tags */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="text-sm font-medium">标签</h3>
              <div className="flex gap-2">
                <Input
                  className="h-8 text-sm flex-1"
                  placeholder="添加标签"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addTag(); }
                  }}
                />
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={addTag}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <button onClick={() => removeTag(tag)}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="text-sm font-medium">语言</h3>
              <Select
                value={form.language}
                onValueChange={(v) => handleChange("language", v)}
              >
                <SelectTrigger className="h-9">
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

            {/* Full text */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="text-sm font-medium">原文全文</h3>
              <p className="text-xs text-muted-foreground">
                粘贴案例原始文本（判决书、执法决定、法规全文等）
              </p>
              <Textarea
                className="min-h-[200px] text-xs font-mono"
                placeholder="粘贴原文全文内容…"
                value={form.fullText}
                onChange={(e) => handleChange("fullText", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
