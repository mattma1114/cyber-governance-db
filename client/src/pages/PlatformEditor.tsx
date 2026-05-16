import { useState, useEffect, useRef } from "react";
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
import {
  ArrowLeft,
  Loader2,
  Wand2,
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  BookOpen,
  TrendingUp,
  Zap,
  Sparkles,
  FileText,
  CheckCircle2,
  History,
  Bell,
  Upload,
  Paperclip,
  Download,
  RefreshCw,
  AlertTriangle,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// ── AI loading steps for platform extraction ─────────────────────────────────
const PLATFORM_AI_STEPS = [
  { id: "search", icon: Globe, label: "正在检索平台信息", desc: "通过官网、Wikipedia、Crunchbase 多渠道获取数据…" },
  { id: "analyze", icon: Sparkles, label: "AI 深度分析中", desc: "提取画像特征、发展历程、监管信息…" },
  { id: "fill", icon: FileText, label: "自动填充表单", desc: "将分析结果写入各字段…" },
];

function PlatformAiLoadingOverlay({ step }: { step: number }) {
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
          {PLATFORM_AI_STEPS.map((s, i) => {
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
        {/* Animated progress bar */}
        <div className="mt-6 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${((step + 0.5) / PLATFORM_AI_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

type PortraitData = {
  types: string[];
  structure: string;
  contentSource: string;
  networkEffect: string;
  businessModel: string[];
  openness: string;
  crossBorder: string;
};

type RuleItem = {
  date: string;
  title: string;
  type: string;
  url: string;
  fullText?: string; // scraped full text via Firecrawl/Jina/ScrapingBee
};

type TimelineItem = {
  date: string;
  event: string;
};

type PlatformForm = {
  id: string;
  name: string;
  company: string;
  jurisdiction: string[];
  founded: string;
  hq: string;
  color: string;
  abbr: string;
  description: string;
  portrait: PortraitData;
  rules: RuleItem[];
  timeline: TimelineItem[];
  relatedCaseIds: string[];
  sortOrder: string;
  isActive: boolean;
  // Extra fields from AI (stored in description as JSON or separate)
  website: string;
  wikipediaUrl: string;
  crunchbaseUrl: string;
  profileFeatures: string;
  developmentHistory: string;
};

const defaultPortrait: PortraitData = {
  types: [],
  structure: "",
  contentSource: "",
  networkEffect: "",
  businessModel: [],
  openness: "",
  crossBorder: "",
};

const defaultForm: PlatformForm = {
  id: "",
  name: "",
  company: "",
  jurisdiction: [],
  founded: "",
  hq: "",
  color: "#3B82F6",
  abbr: "",
  description: "",
  portrait: defaultPortrait,
  rules: [],
  timeline: [],
  relatedCaseIds: [],
  sortOrder: "0",
  isActive: true,
  website: "",
  wikipediaUrl: "",
  crunchbaseUrl: "",
  profileFeatures: "",
  developmentHistory: "",
};

export default function PlatformEditor() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!params.id && params.id !== "new";
  const platformId = isEdit ? params.id! : null;

  const [form, setForm] = useState<PlatformForm>(defaultForm);
  const [keyword, setKeyword] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "portrait" | "rules" | "timeline">("basic");

  const { data: existingPlatform, isLoading: platformLoading } = trpc.platforms.getById.useQuery(
    { id: platformId! },
    { enabled: !!platformId }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.platforms.create.useMutation({
    onSuccess: () => {
      toast.success("平台已创建");
      utils.platforms.list.invalidate();
      utils.platforms.listAdmin.invalidate();
      navigate(`/platforms/${form.id}`);
    },
    onError: (e) => toast.error(`创建失败：${e.message}`),
  });

  const updateMutation = trpc.platforms.update.useMutation({
    onSuccess: () => {
      toast.success("平台已更新");
      utils.platforms.list.invalidate();
      utils.platforms.listAdmin.invalidate();
      utils.platforms.getById.invalidate({ id: platformId! });
      navigate(`/platforms/${platformId}`);
    },
    onError: (e) => toast.error(`更新失败：${e.message}`),
  });

  const aiExtractMutation = trpc.ai.extractPlatformByKeyword.useMutation({
    onSuccess: (data: any) => {
      setForm((prev) => ({
        ...prev,
        // 基本信息
        name: data.name || prev.name,
        company: data.nameEn || data.name || prev.company,
        hq: data.headquarters || prev.hq,
        founded: data.founded || prev.founded,
        description: data.description || prev.description,
        website: data.website || prev.website,
        wikipediaUrl: data.wikipediaUrl || prev.wikipediaUrl,
        crunchbaseUrl: data.crunchbaseUrl || prev.crunchbaseUrl,
        profileFeatures: data.profileFeatures || prev.profileFeatures,
        developmentHistory: data.developmentHistory || prev.developmentHistory,
        // 画像特征
        portrait: {
          types: data.portrait_types?.length ? data.portrait_types : (data.tags?.slice(0, 3) || prev.portrait.types),
          structure: data.portrait_structure || prev.portrait.structure,
          contentSource: data.portrait_contentSource || prev.portrait.contentSource,
          networkEffect: data.portrait_networkEffect || prev.portrait.networkEffect,
          businessModel: data.portrait_businessModel?.length ? data.portrait_businessModel : prev.portrait.businessModel,
          openness: data.portrait_openness || prev.portrait.openness,
          crossBorder: data.portrait_crossBorder || prev.portrait.crossBorder,
        },
        // 规则文件（保留已有规则，追加 AI 提取的）
        rules: data.rules?.length
          ? [
              ...prev.rules,
              ...data.rules.filter((r: any) =>
                r.url && !prev.rules.some((existing) => existing.url === r.url)
              ),
            ]
          : prev.rules,
        // 发展历程（保留已有时间线，追加 AI 提取的）
        timeline: data.timeline?.length
          ? [
              ...prev.timeline,
              ...data.timeline.filter((t: any) =>
                t.date && t.event && !prev.timeline.some((existing) => existing.date === t.date && existing.event === t.event)
              ),
            ].sort((a, b) => a.date.localeCompare(b.date))
          : prev.timeline,
      }));
      const rulesCount = data.rules?.length ?? 0;
      const timelineCount = data.timeline?.length ?? 0;
      toast.success(`AI 已自动填充全部模块：基本信息、画像特征、${rulesCount} 条规则文件、${timelineCount} 个时间节点`);
    },
    onError: (e) => toast.error(`AI 提取失败：${e.message}`),
  });

  useEffect(() => {
    if (existingPlatform) {
      const p = existingPlatform as any;
      setForm({
        id: p.id || "",
        name: p.name || "",
        company: p.company || "",
        jurisdiction: p.jurisdiction || [],
        founded: p.founded ? String(p.founded) : "",
        hq: p.hq || "",
        color: p.color || "#3B82F6",
        abbr: p.abbr || "",
        description: p.description || "",
        portrait: p.portrait || defaultPortrait,
        rules: p.rules || [],
        timeline: p.timeline || [],
        relatedCaseIds: p.relatedCaseIds || [],
        sortOrder: String(p.sortOrder ?? 0),
        isActive: p.isActive ?? true,
        website: p.website || "",
        wikipediaUrl: p.wikipediaUrl || "",
        crunchbaseUrl: p.crunchbaseUrl || "",
        profileFeatures: p.profileFeatures || "",
        developmentHistory: p.developmentHistory || "",
      });
    }
  }, [existingPlatform]);

  const handleChange = (field: keyof PlatformForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePortraitChange = (field: keyof PortraitData, value: any) => {
    setForm((prev) => ({ ...prev, portrait: { ...prev.portrait, [field]: value } }));
  };

  const handleAiExtract = async () => {
    if (!keyword.trim()) {
      toast.error("请输入平台关键词");
      return;
    }
    // Clear any existing timer
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    setAiStep(0);
    setIsAiLoading(true);
    // Advance step 0 → 1 after ~2s (simulating search phase)
    stepTimerRef.current = setTimeout(() => {
      setAiStep(1);
      // Advance step 1 → 2 after another ~2s (simulating analyze phase)
      stepTimerRef.current = setTimeout(() => {
        setAiStep(2);
      }, 2000);
    }, 2000);
    try {
      await aiExtractMutation.mutateAsync({ keyword: keyword.trim() });
    } finally {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      setIsAiLoading(false);
      setAiStep(0);
    }
  };

  // ── Platform Rules (new table-based) ──────────────────────────────────────
  const { data: platformRulesData, refetch: refetchPlatformRules } = trpc.platformRules.list.useQuery(
    { platformId: platformId! },
    { enabled: !!platformId }
  );
  const platformRules = (platformRulesData ?? []) as any[];

  // Version management dialog
  const [versionDialogRule, setVersionDialogRule] = useState<any | null>(null);
  const { data: ruleVersionsData, refetch: refetchVersions } = trpc.platformRules.listVersions.useQuery(
    { ruleId: versionDialogRule?.id ?? 0 },
    { enabled: !!versionDialogRule }
  );
  const ruleVersions = (ruleVersionsData ?? []) as any[];

  // Add version dialog
  const [addVersionDialogRule, setAddVersionDialogRule] = useState<any | null>(null);
  const [newVersionForm, setNewVersionForm] = useState({ versionLabel: "", date: "", url: "", changeNote: "" });

  const addVersionMutation = trpc.platformRules.addVersion.useMutation({
    onSuccess: () => {
      toast.success("新版本已添加");
      refetchPlatformRules();
      if (versionDialogRule) refetchVersions();
      setAddVersionDialogRule(null);
      setNewVersionForm({ versionLabel: "", date: "", url: "", changeNote: "" });
    },
    onError: (e) => toast.error(`添加失败：${e.message}`),
  });

  // AI check new version
  const [checkingVersionRuleId, setCheckingVersionRuleId] = useState<number | null>(null);
  const [batchCheckingVersions, setBatchCheckingVersions] = useState(false);
  const [versionCheckResults, setVersionCheckResults] = useState<Record<number, { hasNew: boolean; summary: string }>>({});

  const checkNewVersionMutation = trpc.platformRules.checkNewVersion.useMutation({
    onSuccess: (data, variables) => {
      setVersionCheckResults((prev) => ({ ...prev, [variables.ruleId]: data }));
      setCheckingVersionRuleId(null);
      if (data.hasNew) {
        toast.success(`检测到新版本：${data.summary}`);
      } else {
        toast.info("未检测到新版本");
      }
    },
    onError: (e) => {
      toast.error(`检测失败：${e.message}`);
      setCheckingVersionRuleId(null);
    },
  });

  const batchCheckNewVersionMutation = trpc.platformRules.batchCheckNewVersion.useMutation({
    onSuccess: (data) => {
      const results: Record<number, { hasNew: boolean; summary: string }> = {};
      data.results.forEach((r: any) => { results[r.ruleId] = { hasNew: r.hasNew, summary: r.summary }; });
      setVersionCheckResults(results);
      setBatchCheckingVersions(false);
      const newCount = data.results.filter((r: any) => r.hasNew).length;
      toast.success(`批量检测完成：${newCount} 条规则有新版本`);
    },
    onError: (e) => { toast.error(`批量检测失败：${e.message}`); setBatchCheckingVersions(false); },
  });

  // Batch extract full text
  const [batchExtractingRules, setBatchExtractingRules] = useState(false);
  const [extractingRuleId, setExtractingRuleId] = useState<number | null>(null);

  const extractFullTextMutation = trpc.platformRules.extractFullText.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`全文已提取（${data.charCount} 字符）`);
      refetchPlatformRules();
      setExtractingRuleId(null);
    },
    onError: (e) => { toast.error(`提取失败：${e.message}`); setExtractingRuleId(null); },
  });

  const batchExtractFullTextMutation = trpc.platformRules.batchExtractFullText.useMutation({
    onSuccess: (data) => {
      setBatchExtractingRules(false);
      refetchPlatformRules();
      toast.success(`批量提取完成：成功 ${data.successCount} 条，失败 ${data.failCount} 条`);
    },
    onError: (e) => { toast.error(`批量提取失败：${e.message}`); setBatchExtractingRules(false); },
  });

  // Rule attachments
  const [attachmentRuleId, setAttachmentRuleId] = useState<number | null>(null);
  const { data: ruleAttachmentsData, refetch: refetchRuleAttachments } = trpc.platformRules.listAttachments.useQuery(
    { ruleId: attachmentRuleId ?? 0 },
    { enabled: !!attachmentRuleId }
  );
  const ruleAttachments = (ruleAttachmentsData ?? []) as any[];
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const deleteAttachmentMutation = trpc.platformRules.deleteAttachment.useMutation({
    onSuccess: () => { toast.success("附件已删除"); refetchRuleAttachments(); },
    onError: (e: any) => toast.error(`删除失败：${e.message}`),
  });

  const uploadAttachmentMutation = trpc.platformRules.uploadAttachment.useMutation({
    onSuccess: () => { toast.success("附件已上传"); refetchRuleAttachments(); setUploadingAttachment(false); },
    onError: (e: any) => { toast.error(`上传失败：${e.message}`); setUploadingAttachment(false); },
  });

  const handleUploadRuleAttachment = async (ruleId: number, file: File) => {
    setUploadingAttachment(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await uploadAttachmentMutation.mutateAsync({
          ruleId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          fileBase64: base64,
        });
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      toast.error(`上传失败：${e.message}`);
      setUploadingAttachment(false);
    }
  };

  // Add new rule to DB
  const createRuleMutation = trpc.platformRules.create.useMutation({
    onSuccess: () => { toast.success("规则文件已添加"); refetchPlatformRules(); },
    onError: (e) => toast.error(`添加失败：${e.message}`),
  });

  const updateRuleDbMutation = trpc.platformRules.update.useMutation({
    onSuccess: () => { toast.success("已保存"); refetchPlatformRules(); },
    onError: (e) => toast.error(`保存失败：${e.message}`),
  });

  const deleteRuleDbMutation = trpc.platformRules.delete.useMutation({
    onSuccess: () => { toast.success("规则文件已删除"); refetchPlatformRules(); },
    onError: (e) => toast.error(`删除失败：${e.message}`),
  });

  // Inline edit state for DB rules
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editingRuleForm, setEditingRuleForm] = useState<any>({});

  const [scrapingRuleIdx, setScrapingRuleIdx] = useState<number | null>(null);
  const scrapeUrlMutation = trpc.scraper.scrapeUrl.useMutation({
    onSuccess: (data, variables) => {
      // Find the rule index by matching the URL
      const idx = form.rules.findIndex((r) => r.url === variables.url);
      if (idx >= 0) {
        setForm((prev) => {
          const rules = [...prev.rules];
          rules[idx] = { ...rules[idx], fullText: data.markdown };
          return { ...prev, rules };
        });
        toast.success(`已通过 ${data.source} 抓取规则文件全文（${data.markdown.length} 字符）`);
      }
      setScrapingRuleIdx(null);
    },
    onError: (e) => {
      toast.error(`抓取失败：${e.message}`);
      setScrapingRuleIdx(null);
    },
  });

  const addRule = () => {
    setForm((prev) => ({
      ...prev,
      rules: [...prev.rules, { date: "", title: "", type: "policy", url: "" }],
    }));
  };

  const updateRule = (idx: number, field: keyof RuleItem, value: string) => {
    setForm((prev) => {
      const rules = [...prev.rules];
      rules[idx] = { ...rules[idx], [field]: value };
      return { ...prev, rules };
    });
  };

  const removeRule = (idx: number) => {
    setForm((prev) => ({ ...prev, rules: prev.rules.filter((_, i) => i !== idx) }));
  };

  const addTimeline = () => {
    setForm((prev) => ({
      ...prev,
      timeline: [...prev.timeline, { date: "", event: "" }],
    }));
  };

  const updateTimeline = (idx: number, field: keyof TimelineItem, value: string) => {
    setForm((prev) => {
      const timeline = [...prev.timeline];
      timeline[idx] = { ...timeline[idx], [field]: value };
      return { ...prev, timeline };
    });
  };

  const removeTimeline = (idx: number) => {
    setForm((prev) => ({ ...prev, timeline: prev.timeline.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("请填写平台名称");
      return;
    }
    if (!isEdit && !form.id.trim()) {
      toast.error("请填写平台 ID（英文小写，如 tiktok）");
      return;
    }

    const payload = {
      id: form.id,
      name: form.name,
      company: form.company || undefined,
      jurisdiction: form.jurisdiction,
      founded: form.founded ? Number(form.founded) : undefined,
      hq: form.hq || undefined,
      color: form.color || undefined,
      abbr: form.abbr || undefined,
      description: form.description || undefined,
      portrait: form.portrait,
      rules: form.rules,
      timeline: form.timeline,
      relatedCaseIds: form.relatedCaseIds,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && platformLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs = [
    { key: "basic", label: "基本信息" },
    { key: "portrait", label: "画像特征" },
    { key: "rules", label: "规则文件" },
    { key: "timeline", label: "发展历程" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* AI Loading Overlay */}
      {isAiLoading && <PlatformAiLoadingOverlay step={aiStep} />}
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-base font-semibold">
                {isEdit ? `编辑平台：${form.name}` : "新增平台"}
              </h1>
              {isEdit && (
                <p className="text-xs text-muted-foreground">ID: {platformId}</p>
              )}
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={isSaving} size="sm">
            {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {isEdit ? "保存更改" : "创建平台"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="container border-t border-border flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container py-6">
        {/* ── Basic Info Tab ── */}
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* AI keyword auto-fill */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">AI 自动填充（通过平台关键词）</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  输入平台名称关键词，AI 将自动检索并提取官网、Wikipedia、Crunchbase 链接，以及画像特征和发展历程等信息。<strong>规则文件需在「规则文件」Tab 中单独抓取。</strong>
                </p>
                <div className="flex gap-2">
                  <Input
                    className="h-9 text-sm flex-1"
                    placeholder="输入平台名称，如：TikTok、Meta、微信"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAiExtract()}
                  />
                  <Button
                    size="sm"
                    onClick={handleAiExtract}
                    disabled={isAiLoading || aiExtractMutation.isPending}
                  >
                    {(isAiLoading || aiExtractMutation.isPending) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "AI 填充"
                    )}
                  </Button>
                </div>
              </div>

              {/* Platform ID (only for new) */}
              {!isEdit && (
                <div className="space-y-1.5">
                  <Label className="text-xs">平台 ID *（英文小写，创建后不可修改）</Label>
                  <Input
                    className="h-9 font-mono"
                    placeholder="如：tiktok、meta、wechat"
                    value={form.id}
                    onChange={(e) => handleChange("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">平台名称 *</Label>
                  <Input
                    className="h-9"
                    placeholder="如：TikTok"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">缩写</Label>
                  <Input
                    className="h-9"
                    placeholder="如：TT"
                    value={form.abbr}
                    onChange={(e) => handleChange("abbr", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">所属公司</Label>
                  <Input
                    className="h-9"
                    placeholder="如：ByteDance"
                    value={form.company}
                    onChange={(e) => handleChange("company", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">成立年份</Label>
                  <Input
                    className="h-9"
                    type="number"
                    placeholder="如：2016"
                    value={form.founded}
                    onChange={(e) => handleChange("founded", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">总部所在地</Label>
                  <Input
                    className="h-9"
                    placeholder="如：北京 / 新加坡"
                    value={form.hq}
                    onChange={(e) => handleChange("hq", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">主题色</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => handleChange("color", e.target.value)}
                      className="w-9 h-9 rounded border border-border cursor-pointer"
                    />
                    <Input
                      className="h-9 font-mono flex-1"
                      value={form.color}
                      onChange={(e) => handleChange("color", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">平台简介</Label>
                <Textarea
                  className="min-h-[100px] text-sm"
                  placeholder="简要描述平台的定位和功能"
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">画像特征（AI 填充）</Label>
                <Textarea
                  className="min-h-[100px] text-sm"
                  placeholder="平台的核心特征描述"
                  value={form.profileFeatures}
                  onChange={(e) => handleChange("profileFeatures", e.target.value)}
                />
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-5">
              {/* Links */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  外部链接
                </h3>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">官方网站</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="https://..."
                      value={form.website}
                      onChange={(e) => handleChange("website", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Wikipedia</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="https://en.wikipedia.org/..."
                      value={form.wikipediaUrl}
                      onChange={(e) => handleChange("wikipediaUrl", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Crunchbase</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="https://www.crunchbase.com/..."
                      value={form.crunchbaseUrl}
                      onChange={(e) => handleChange("crunchbaseUrl", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sort order */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-medium">排序权重</h3>
                <Input
                  className="h-9"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => handleChange("sortOrder", e.target.value)}
                />
              </div>

              {/* Active */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-medium">可见性</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => handleChange("isActive", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm">
                    在前台展示
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Portrait Tab ── */}
        {activeTab === "portrait" && (
          <div className="max-w-2xl space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs">平台类型（多选，逗号分隔）</Label>
              <Input
                className="h-9"
                placeholder="如：社交媒体, 短视频, UGC"
                value={form.portrait.types.join(", ")}
                onChange={(e) =>
                  handlePortraitChange(
                    "types",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">平台架构</Label>
              <Input
                className="h-9"
                placeholder="如：双边市场、多边平台"
                value={form.portrait.structure}
                onChange={(e) => handlePortraitChange("structure", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">内容来源</Label>
              <Input
                className="h-9"
                placeholder="如：UGC、PGC、算法推荐"
                value={form.portrait.contentSource}
                onChange={(e) => handlePortraitChange("contentSource", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">网络效应</Label>
              <Input
                className="h-9"
                placeholder="如：强双边网络效应"
                value={form.portrait.networkEffect}
                onChange={(e) => handlePortraitChange("networkEffect", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">商业模式（多选，逗号分隔）</Label>
              <Input
                className="h-9"
                placeholder="如：广告、订阅、电商"
                value={form.portrait.businessModel.join(", ")}
                onChange={(e) =>
                  handlePortraitChange(
                    "businessModel",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">开放程度</Label>
              <Input
                className="h-9"
                placeholder="如：半开放、封闭生态"
                value={form.portrait.openness}
                onChange={(e) => handlePortraitChange("openness", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">跨境运营</Label>
              <Input
                className="h-9"
                placeholder="如：全球化运营、本地化合规"
                value={form.portrait.crossBorder}
                onChange={(e) => handlePortraitChange("crossBorder", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Rules Tab (DB-driven) ── */}
        {activeTab === "rules" && (
          <div className="max-w-4xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">规则文件</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEdit ? `共 ${platformRules.length} 条规则文件，支持多版本管理、AI 检测新版本、批量提取全文` : "保存平台后可管理规则文件"}
                </p>
              </div>
              {isEdit && (
                <div className="flex items-center gap-2">
                  {/* Batch AI check new version */}
                  <Button
                    size="sm" variant="outline"
                    disabled={batchCheckingVersions || platformRules.length === 0}
                    onClick={() => {
                      setBatchCheckingVersions(true);
                      batchCheckNewVersionMutation.mutate({ platformId: platformId! });
                    }}
                  >
                    {batchCheckingVersions ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Bell className="w-3.5 h-3.5 mr-1.5" />}
                    批量检测新版本
                  </Button>
                  {/* Batch extract full text */}
                  <Button
                    size="sm" variant="outline"
                    disabled={batchExtractingRules || platformRules.length === 0}
                    onClick={() => {
                      setBatchExtractingRules(true);
                      batchExtractFullTextMutation.mutate({ platformId: platformId! });
                    }}
                  >
                    {batchExtractingRules ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    一键批量提取全文
                  </Button>
                  {/* Add new rule */}
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingRuleId(-1);
                      setEditingRuleForm({ title: "", type: "policy", date: "", url: "", version: "", changeNote: "" });
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />添加规则
                  </Button>
                </div>
              )}
            </div>

            {/* New rule inline form */}
            {editingRuleId === -1 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">新增规则文件</span>
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setEditingRuleId(null)}><X className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">标题 *</Label>
                    <Input className="h-8 text-sm" value={editingRuleForm.title} onChange={(e) => setEditingRuleForm((p: any) => ({ ...p, title: e.target.value }))} placeholder="规则文件标题" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">类型</Label>
                    <Select value={editingRuleForm.type || "policy"} onValueChange={(v) => setEditingRuleForm((p: any) => ({ ...p, type: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="policy">平台政策</SelectItem>
                        <SelectItem value="terms">服务条款</SelectItem>
                        <SelectItem value="privacy">隐私政策</SelectItem>
                        <SelectItem value="community">社区准则</SelectItem>
                        <SelectItem value="transparency">透明度报告</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">日期</Label>
                    <Input className="h-8 text-sm" type="date" value={editingRuleForm.date} onChange={(e) => setEditingRuleForm((p: any) => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">版本号</Label>
                    <Input className="h-8 text-sm" value={editingRuleForm.version} onChange={(e) => setEditingRuleForm((p: any) => ({ ...p, version: e.target.value }))} placeholder="如 v1.0、2024版" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">URL</Label>
                    <Input className="h-8 text-sm" value={editingRuleForm.url} onChange={(e) => setEditingRuleForm((p: any) => ({ ...p, url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">变更说明</Label>
                    <Input className="h-8 text-sm" value={editingRuleForm.changeNote} onChange={(e) => setEditingRuleForm((p: any) => ({ ...p, changeNote: e.target.value }))} placeholder="本版本主要变更说明（可空）" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingRuleId(null)}>取消</Button>
                  <Button size="sm" disabled={createRuleMutation.isPending} onClick={() => {
                    if (!editingRuleForm.title.trim()) { toast.error("请填写标题"); return; }
                    createRuleMutation.mutate({ platformId: platformId!, ...editingRuleForm });
                    setEditingRuleId(null);
                  }}>
                    {createRuleMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}保存
                  </Button>
                </div>
              </div>
            )}

            {/* Not in edit mode: show AI-prefilled rules from form.rules */}
            {!isEdit && form.rules.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-lg">
                AI 填充后将自动预置规则文件链接，保存平台后可进行管理
              </div>
            )}
            {!isEdit && form.rules.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">以下规则文件链接由 AI 自动爬取预置，保存后将导入数据库，可删除不需要的条目</p>
                {form.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{rule.title || "未命名规则"}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{rule.type}</span>
                        {rule.date && <span className="text-xs text-muted-foreground">{rule.date}</span>}
                      </div>
                      {rule.url && (
                        <a href={rule.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline truncate block mt-0.5">
                          {rule.url}
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="删除此条规则"
                      onClick={() => handleChange("rules", form.rules.filter((_, i) => i !== idx))}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* DB-driven rules list */}
            {isEdit && platformRules.length === 0 && editingRuleId !== -1 && (
              <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-lg">
                暂无规则文件，点击「添加规则」手动录入
              </div>
            )}

            {isEdit && platformRules.map((rule: any) => {
              const checkResult = versionCheckResults[rule.id];
              const isEditingThis = editingRuleId === rule.id;
              const isShowingAttachments = attachmentRuleId === rule.id;
              return (
                <div key={rule.id} className={`rounded-lg border p-4 space-y-3 transition-colors ${
                  checkResult?.hasNew ? "border-amber-400 bg-amber-50/30 dark:bg-amber-950/20" : "border-border"
                }`}>
                  {/* Rule header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{rule.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{rule.type}</span>
                        {rule.version && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{rule.version}</span>}
                        {rule.date && <span className="text-xs text-muted-foreground">{rule.date}</span>}
                        {rule.fullText && <span className="text-xs text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />全文已提取</span>}
                      </div>
                      {rule.url && (
                        <a href={rule.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block mt-0.5">{rule.url}</a>
                      )}
                      {checkResult?.hasNew && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>检测到新版本：{checkResult.summary}</span>
                        </div>
                      )}
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* AI check new version */}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        disabled={!rule.url || checkingVersionRuleId === rule.id}
                        title="AI 检测新版本"
                        onClick={() => {
                          setCheckingVersionRuleId(rule.id);
                          checkNewVersionMutation.mutate({ ruleId: rule.id });
                        }}
                      >
                        {checkingVersionRuleId === rule.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                      </Button>
                      {/* Extract full text */}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        disabled={!rule.url || extractingRuleId === rule.id}
                        title="提取全文"
                        onClick={() => {
                          setExtractingRuleId(rule.id);
                          extractFullTextMutation.mutate({ ruleId: rule.id });
                        }}
                      >
                        {extractingRuleId === rule.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      </Button>
                      {/* Version history */}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        title="版本历史"
                        onClick={() => setVersionDialogRule(rule)}
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      {/* Attachments */}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        title="附件管理"
                        onClick={() => setAttachmentRuleId(isShowingAttachments ? null : rule.id)}
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </Button>
                      {/* Edit */}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        onClick={() => {
                          if (isEditingThis) { setEditingRuleId(null); return; }
                          setEditingRuleId(rule.id);
                          setEditingRuleForm({ title: rule.title, type: rule.type, date: rule.date || "", url: rule.url || "", version: rule.version || "", changeNote: rule.changeNote || "" });
                        }}
                      >
                        {isEditingThis ? <X className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      </Button>
                      {/* Delete */}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`确认删除「${rule.title}」？`)) deleteRuleDbMutation.mutate({ id: rule.id }); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {isEditingThis && (
                    <div className="border-t pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">标题</Label>
                          <Input className="h-8 text-sm" value={editingRuleForm.title} onChange={(e) => setEditingRuleForm((p: any) => ({ ...p, title: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">类型</Label>
                          <Select value={editingRuleForm.type || "policy"} onValueChange={(v) => setEditingRuleForm((p: any) => ({ ...p, type: v }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="policy">平台政策</SelectItem>
                              <SelectItem value="terms">服务条款</SelectItem>
                              <SelectItem value="privacy">隐私政策</SelectItem>
                              <SelectItem value="community">社区准则</SelectItem>
                              <SelectItem value="transparency">透明度报告</SelectItem>
                              <SelectItem value="other">其他</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">日期</Label>
                          <Input className="h-8 text-sm" type="date" value={editingRuleForm.date} onChange={(e) => setEditingRuleForm((p: any) => ({ ...p, date: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">版本号</Label>
                          <Input className="h-8 text-sm" value={editingRuleForm.version} onChange={(e) => setEditingRuleForm((p: any) => ({ ...p, version: e.target.value }))} placeholder="如 v1.0" />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">URL</Label>
                          <Input className="h-8 text-sm" value={editingRuleForm.url} onChange={(e) => setEditingRuleForm((p: any) => ({ ...p, url: e.target.value }))} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">变更说明</Label>
                          <Input className="h-8 text-sm" value={editingRuleForm.changeNote} onChange={(e) => setEditingRuleForm((p: any) => ({ ...p, changeNote: e.target.value }))} placeholder="本版本主要变更说明" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingRuleId(null)}>取消</Button>
                        <Button size="sm" disabled={updateRuleDbMutation.isPending} onClick={() => {
                          updateRuleDbMutation.mutate({ id: rule.id, ...editingRuleForm });
                          setEditingRuleId(null);
                        }}>保存更改</Button>
                      </div>
                    </div>
                  )}

                  {/* Attachments panel */}
                  {isShowingAttachments && (
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">附件（{ruleAttachments.length}）</span>
                        <div className="flex items-center gap-2">
                          <input
                            ref={attachmentInputRef}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadRuleAttachment(rule.id, file);
                              e.target.value = "";
                            }}
                          />
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            disabled={uploadingAttachment}
                            onClick={() => attachmentInputRef.current?.click()}
                          >
                            {uploadingAttachment ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                            上传附件
                          </Button>
                        </div>
                      </div>
                      {ruleAttachments.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">暂无附件</p>
                      ) : (
                        <div className="space-y-1.5">
                          {ruleAttachments.map((att: any) => (
                            <div key={att.id} className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">{att.filename}</span>
                                {att.fileSize && <span className="text-muted-foreground shrink-0">{(att.fileSize / 1024).toFixed(0)} KB</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <Button size="icon" variant="ghost" className="w-6 h-6"><Download className="w-3 h-3" /></Button>
                                </a>
                                <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive hover:text-destructive"
                                  onClick={() => deleteAttachmentMutation.mutate({ id: att.id })}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full text preview */}
                  {rule.fullText && (
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs text-emerald-600 font-medium">全文已提取 ({rule.fullText.length.toLocaleString()} 字符)</span>
                      </div>
                      <div className="rounded border border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/20 p-3 text-xs text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {rule.fullText.slice(0, 600)}{rule.fullText.length > 600 ? `\n\n…（共 ${rule.fullText.length.toLocaleString()} 字符）` : ""}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Version history dialog */}
            <Dialog open={!!versionDialogRule} onOpenChange={(o) => { if (!o) setVersionDialogRule(null); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>版本历史：{versionDialogRule?.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {ruleVersions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">暂无历史版本</p>
                  ) : (
                    ruleVersions.map((v: any) => (
                      <div key={v.id} className="rounded border p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          {v.version && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{v.version}</span>}
                          {v.date && <span className="text-xs text-muted-foreground">{v.date}</span>}
                        </div>
                        {v.changeNote && <p className="text-xs text-muted-foreground">{v.changeNote}</p>}
                        {v.url && <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block truncate">{v.url}</a>}
                      </div>
                    ))
                  )}
                </div>
                <DialogFooter>
                  <Button size="sm" variant="outline"
                    onClick={() => {
                      setAddVersionDialogRule(versionDialogRule);
                      setVersionDialogRule(null);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />添加新版本
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setVersionDialogRule(null)}>关闭</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add version dialog */}
            <Dialog open={!!addVersionDialogRule} onOpenChange={(o) => { if (!o) setAddVersionDialogRule(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>添加新版本：{addVersionDialogRule?.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">版本号</Label>
                    <Input className="h-8 text-sm" value={newVersionForm.versionLabel} onChange={(e) => setNewVersionForm((p) => ({ ...p, versionLabel: e.target.value }))} placeholder="如 v2.0、2025版" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">日期</Label>
                    <Input className="h-8 text-sm" type="date" value={newVersionForm.date} onChange={(e) => setNewVersionForm((p) => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">URL</Label>
                    <Input className="h-8 text-sm" value={newVersionForm.url} onChange={(e) => setNewVersionForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">变更说明</Label>
                    <Input className="h-8 text-sm" value={newVersionForm.changeNote} onChange={(e) => setNewVersionForm((p) => ({ ...p, changeNote: e.target.value }))} placeholder="本版本主要变更内容" />
                  </div>
                </div>
                <DialogFooter>
                  <Button size="sm" variant="outline" onClick={() => setAddVersionDialogRule(null)}>取消</Button>
                  <Button size="sm" disabled={addVersionMutation.isPending}
                    onClick={() => {
                      if (!addVersionDialogRule) return;
                      addVersionMutation.mutate({
                        parentRuleId: addVersionDialogRule.id,
                        title: addVersionDialogRule.title,
                        type: addVersionDialogRule.type,
                        ...newVersionForm,
                      });
                    }}
                  >
                    {addVersionMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}添加版本
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ── Timeline Tab ── */}
        {activeTab === "timeline" && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">发展历程</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  记录平台的关键发展节点
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addTimeline}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                添加节点
              </Button>
            </div>

            {/* AI development history */}
            {form.developmentHistory && (
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">AI 提取的发展历程</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{form.developmentHistory}</p>
              </div>
            )}

            {form.timeline.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-lg">
                暂无发展历程，点击「添加节点」录入
              </div>
            )}

            {form.timeline.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mt-3" />
                  {idx < form.timeline.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 rounded-lg border border-border p-3 space-y-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-7 text-xs w-32"
                      placeholder="日期"
                      value={item.date}
                      onChange={(e) => updateTimeline(idx, "date", e.target.value)}
                    />
                    <Input
                      className="h-7 text-xs flex-1"
                      placeholder="事件描述"
                      value={item.event}
                      onChange={(e) => updateTimeline(idx, "event", e.target.value)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-destructive hover:text-destructive shrink-0"
                      onClick={() => removeTimeline(idx)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
