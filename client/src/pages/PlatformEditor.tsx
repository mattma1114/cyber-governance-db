import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Sparkles, Globe, Plus, X, ChevronRight,
  Loader2, Building2, MapPin, Calendar, Tag, Layers,
  FileText, Clock, Link as LinkIcon, Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── 七维画像维度 ───────────────────────────────────────────────
const PORTRAIT_DIMS = [
  { key: "types", label: "平台类型", placeholder: "如：社交媒体、短视频、即时通讯" },
  { key: "structure", label: "平台结构", placeholder: "描述平台的组织架构和运营模式" },
  { key: "contentSource", label: "内容来源", placeholder: "UGC / PGC / PUGC / 算法推荐等" },
  { key: "networkEffect", label: "网络效应", placeholder: "单边/双边/多边网络效应分析" },
  { key: "businessModel", label: "商业模式", placeholder: "如：广告、订阅、电商、数据变现" },
  { key: "openness", label: "开放程度", placeholder: "API 开放程度、第三方生态、互操作性" },
  { key: "crossBorder", label: "跨境特征", placeholder: "跨境数据流动、本地化策略、监管应对" },
] as const;

type PortraitKey = typeof PORTRAIT_DIMS[number]["key"];

interface RuleVersion {
  versionId: string;
  versionLabel: string;
  date: string;
  url?: string;
  content?: string;
}

interface Rule {
  id: string;
  title: string;
  type: string;
  versions: RuleVersion[];
}

interface TimelineItem {
  date: string;
  event: string;
}

// ─── Underline Input ────────────────────────────────────────────
function UInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full bg-transparent border-0 border-b border-border/50 focus:border-primary outline-none py-2 text-sm placeholder:text-muted-foreground/50 transition-colors",
        className
      )}
    />
  );
}

function UTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full bg-transparent border-0 border-b border-border/50 focus:border-primary outline-none py-2 text-sm placeholder:text-muted-foreground/50 transition-colors resize-none",
        className
      )}
    />
  );
}

// ─── Section Header ─────────────────────────────────────────────
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/30">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function PlatformEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  // ── AI mode state ──
  const [aiMode, setAiMode] = useState(!isEdit);
  const [aiKeyword, setAiKeyword] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [firecrawlConfigured, setFirecrawlConfigured] = useState<boolean | null>(null);
  const [aiExtractError, setAiExtractError] = useState<string | null>(null);
  const [aiExtractPartial, setAiExtractPartial] = useState(false);
  const [savedPlatformId, setSavedPlatformId] = useState<string | null>(id ?? null);

  // ── Form state ──
  const [basic, setBasic] = useState({
    id: "",
    name: "",
    company: "",
    hq: "",
    founded: "",
    abbr: "",
    color: "#3B82F6",
    description: "",
    isActive: true,
  });
  const [jurisSel, setJurisSel] = useState<string[]>([]);
  const [portrait, setPortrait] = useState<Record<PortraitKey, string>>({
    types: "", structure: "", contentSource: "", networkEffect: "",
    businessModel: "", openness: "", crossBorder: "",
  });
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [expandedRuleIdx, setExpandedRuleIdx] = useState<number | null>(null);
  const [expandedVersionIdx, setExpandedVersionIdx] = useState<Record<number, number | null>>({});
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  // ── Queries ──
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: existingPlatform } = trpc.platforms.getById.useQuery(
    { id: id! },
    { enabled: isEdit && Boolean(id) }
  );
  const firecrawlStatus = trpc.settings.getValue.useQuery(
    { key: "firecrawl_api_key" },
    { enabled: user?.role === "admin" }
  );

  // ── Mutations ──
  const createMutation = trpc.platforms.create.useMutation();
  const updateMutation = trpc.platforms.update.useMutation();
  const extractMutation = trpc.ai.extractPlatformByKeyword.useMutation();
  const extractFromUrlMutation = trpc.ai.extractPlatformFromUrl.useMutation();
  const utils = trpc.useUtils();

  // ── Check Firecrawl config ──
  useEffect(() => {
    if (firecrawlStatus.data !== undefined) {
      setFirecrawlConfigured(Boolean(firecrawlStatus.data?.value));
    }
  }, [firecrawlStatus.data]);

  // ── Load existing platform for edit ──
  useEffect(() => {
    if (existingPlatform) {
      const p = existingPlatform;
      setBasic({
        id: p.id,
        name: p.name,
        company: p.company ?? "",
        hq: p.hq ?? "",
        founded: p.founded ? String(p.founded) : "",
        abbr: p.abbr ?? "",
        color: p.color ?? "#3B82F6",
        description: p.description ?? "",
        isActive: p.isActive ?? true,
      });
      setJurisSel(Array.isArray(p.jurisdiction) ? p.jurisdiction : []);
      if (p.portrait) {
        const port = p.portrait as any;
        setPortrait({
          types: Array.isArray(port.types) ? port.types.join(", ") : (port.types ?? ""),
          structure: port.structure ?? "",
          contentSource: port.contentSource ?? "",
          networkEffect: port.networkEffect ?? "",
          businessModel: Array.isArray(port.businessModel) ? port.businessModel.join(", ") : (port.businessModel ?? ""),
          openness: port.openness ?? "",
          crossBorder: port.crossBorder ?? "",
        });
      }
      setTimeline(Array.isArray(p.timeline) ? p.timeline : []);
      setRules(Array.isArray(p.rules) ? (p.rules as Rule[]) : []);
      setAiMode(false);
    }
  }, [existingPlatform]);

  // ── Auth guard ──
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">无权限访问此页面</p>
      </div>
    );
  }

  // ── AI Extract ──
  const handleAiExtract = async () => {
    if (!aiKeyword.trim()) { toast.error("请输入平台名称关键词，如 Meta 或 TikTok"); return; }
    setAiLoading(true);
    setAiExtractError(null);
    setAiExtractPartial(false);
    try {
      const result = await extractMutation.mutateAsync({ keyword: aiKeyword.trim() });
      if (result.platform) {
        const p = result.platform as any;
        let filledCount = 0;
        setBasic((prev) => {
          const next = {
            ...prev,
            id: p.id ?? prev.id,
            name: p.name ?? prev.name,
            company: p.company ?? prev.company,
            hq: p.hq ?? prev.hq,
            founded: p.founded ? String(p.founded) : prev.founded,
            abbr: p.abbr ?? prev.abbr,
            color: p.color ?? prev.color,
            description: p.description ?? prev.description,
          };
          filledCount += [p.name, p.company, p.hq, p.founded, p.description].filter(Boolean).length;
          return next;
        });
        if (p.jurisdiction?.length) { setJurisSel(p.jurisdiction); filledCount++; }
        if (p.portrait) {
          const port = p.portrait;
          const hasPortrait = Object.values(port).some(Boolean);
          if (hasPortrait) filledCount++;
          setPortrait({
            types: Array.isArray(port.types) ? port.types.join(", ") : (port.types ?? ""),
            structure: port.structure ?? "",
            contentSource: port.contentSource ?? "",
            networkEffect: port.networkEffect ?? "",
            businessModel: Array.isArray(port.businessModel) ? port.businessModel.join(", ") : (port.businessModel ?? ""),
            openness: port.openness ?? "",
            crossBorder: port.crossBorder ?? "",
          });
        }
        if (p.timeline?.length) { setTimeline(p.timeline); filledCount++; }
        if (filledCount === 0) {
          setAiExtractError("未能从该页面提取到结构化平台信息，请尝试其他 URL（如维基百科页面）或手动填写。");
        } else {
          const isPartial = !p.portrait || !p.timeline?.length;
          if (isPartial) setAiExtractPartial(true);
          toast.success(`AI 已自动填充 ${filledCount} 个字段，请核对后保存`);
          setAiMode(false);
        }
      } else {
        setAiExtractError("提取结果为空，可能是页面访问受限。请尝试其他 URL 或手动填写。");
      }
    } catch (e: any) {
      setAiExtractError(e?.message ?? "AI 提取失败，请手动填写各字段。");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Preview ──
  const handlePreview = async () => {
    if (!basic.name.trim()) { toast.error("请先填写平台名称"); return; }
    if (!basic.id.trim()) { toast.error("请先填写平台 ID"); return; }
    setPreviewing(true);
    try {
      const platformId = isEdit ? id! : basic.id.trim().toLowerCase();
      const payload = {
        name: basic.name.trim(),
        company: basic.company || undefined,
        hq: basic.hq || undefined,
        founded: basic.founded ? parseInt(basic.founded) : undefined,
        abbr: basic.abbr || undefined,
        color: basic.color || undefined,
        description: basic.description || undefined,
        jurisdiction: jurisSel,
        portrait: {
          types: portrait.types.split(",").map((s) => s.trim()).filter(Boolean),
          structure: portrait.structure,
          contentSource: portrait.contentSource,
          networkEffect: portrait.networkEffect,
          businessModel: portrait.businessModel.split(",").map((s) => s.trim()).filter(Boolean),
          openness: portrait.openness,
          crossBorder: portrait.crossBorder,
        },
        timeline,
        rules,
        isActive: basic.isActive,
      };
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, ...payload });
      } else {
        await createMutation.mutateAsync({ id: platformId, ...payload });
      }
      setSavedPlatformId(platformId);
      await utils.platforms.list.invalidate();
      toast.success("已保存，正在打开预览...");
      window.open(`/platforms/${platformId}`, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "保存失败，无法预览");
    } finally {
      setPreviewing(false);
    }
  };

  // ── Save ──
  const handleSave = async (publish: boolean) => {
    if (!basic.name.trim()) { toast.error("平台名称不能为空"); return; }
    if (!basic.id.trim()) { toast.error("平台 ID 不能为空（如 meta、tiktok）"); return; }
    setSaving(true);
    try {
        const payload = {
        name: basic.name.trim(),
        company: basic.company || undefined,
        hq: basic.hq || undefined,
        founded: basic.founded ? parseInt(basic.founded) : undefined,
        abbr: basic.abbr || undefined,
        color: basic.color || undefined,
        description: basic.description || undefined,
        jurisdiction: jurisSel,
        portrait: {
          types: portrait.types.split(",").map((s) => s.trim()).filter(Boolean),
          structure: portrait.structure,
          contentSource: portrait.contentSource,
          networkEffect: portrait.networkEffect,
          businessModel: portrait.businessModel.split(",").map((s) => s.trim()).filter(Boolean),
          openness: portrait.openness,
          crossBorder: portrait.crossBorder,
        },
        timeline,
        rules,
        isActive: publish ? true : basic.isActive,
      };
      const platformId = isEdit ? id! : basic.id.trim().toLowerCase();
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, ...payload });
        toast.success("平台已更新");
      } else {
        await createMutation.mutateAsync({ id: platformId, ...payload });
        toast.success("平台已创建");
      }
      setSavedPlatformId(platformId);
      await utils.platforms.list.invalidate();
      if (!publish) return; // 不跳转，保留在页面以支持预览
      navigate("/admin");
    } catch (e: any) {
      toast.error(e?.message ?? "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const setB = (k: string, v: any) => setBasic((prev) => ({ ...prev, [k]: v }));
  const toggleJuris = (id: string) =>
    setJurisSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回管理后台
            </button>
            <span className="text-border/50">|</span>
            <h1 className="text-sm font-semibold">
              {isEdit ? `编辑平台：${basic.name || id}` : "新增平台"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isEdit && (
              <button
                onClick={() => setAiMode(!aiMode)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  aiMode
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground border border-border/50 hover:border-border"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI 自动填充
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="text-xs h-8"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "保存"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="text-xs h-8"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "保存并激活"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── AI Mode Banner ── */}
      {aiMode && !isEdit && (
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold mb-0.5">AI 自动填充</h2>
                <p className="text-xs text-muted-foreground">
                  输入平台名称关键词，AI 将自动检索平台官网、维基百科、Crunchbase 等来源，自动填充平台基本信息、画像特征和发展历程（规则文件除外）。
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={aiKeyword}
                  onChange={(e) => setAiKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAiExtract()}
                  placeholder="输入平台名称关键词，如 Meta、TikTok、微信、Spotify..."
                  className="pl-9 text-sm"
                  disabled={aiLoading}
                />
              </div>
              <Button
                onClick={handleAiExtract}
                disabled={aiLoading || !aiKeyword.trim()}
                className="gap-1.5 shrink-0"
              >
                {aiLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />分析中…</>
                ) : (
                  <><Wand2 className="w-4 h-4" />自动填充</>
                )}
              </Button>
            </div>
            {aiExtractError && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{aiExtractError}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              也可以
              <button
                className="text-primary underline underline-offset-2 mx-1"
                onClick={() => setAiMode(false)}
              >
                跳过，手动填写
              </button>
              所有字段
            </p>
          </div>
        </div>
      )}

      {/* ── Partial Fill Notice ── */}
      {aiExtractPartial && !aiMode && (
        <div className="max-w-6xl mx-auto px-6 pt-4">
          <div className="px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 flex items-center gap-2">
            <span>ℹ️</span>
            <span>AI 已填充基本信息，但平台画像和大事件部分可能需要手动补充。</span>
            <button className="ml-auto underline underline-offset-2 shrink-0" onClick={() => setAiExtractPartial(false)}>已知晓</button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left: Main Form ── */}
          <div className="lg:col-span-2 space-y-10">

            {/* 基本信息 */}
            <section>
              <SectionHeader icon={Building2} title="基本信息" />
              <div className="space-y-5">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">平台名称 *</Label>
                  <UInput
                    value={basic.name}
                    onChange={(e) => setB("name", e.target.value)}
                    placeholder="如：Meta（Facebook / Instagram / WhatsApp）"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">平台 ID *</Label>
                    <UInput
                      value={basic.id}
                      onChange={(e) => setB("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      placeholder="meta（小写字母+连字符）"
                      disabled={isEdit}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">缩写</Label>
                    <UInput
                      value={basic.abbr}
                      onChange={(e) => setB("abbr", e.target.value)}
                      placeholder="M（最多 4 字符）"
                      maxLength={4}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">运营公司</Label>
                  <UInput
                    value={basic.company}
                    onChange={(e) => setB("company", e.target.value)}
                    placeholder="Meta Platforms, Inc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">总部所在地</Label>
                    <UInput
                      value={basic.hq}
                      onChange={(e) => setB("hq", e.target.value)}
                      placeholder="美国加利福尼亚州门洛帕克"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">创立年份</Label>
                    <UInput
                      value={basic.founded}
                      onChange={(e) => setB("founded", e.target.value)}
                      placeholder="2004"
                      type="number"
                      min={1990}
                      max={2099}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">平台简介</Label>
                  <UTextarea
                    value={basic.description}
                    onChange={(e) => setB("description", e.target.value)}
                    placeholder="简要描述平台的定位、规模和核心业务（200 字以内）"
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* 七维画像 */}
            <section>
              <SectionHeader icon={Layers} title="平台结构七维画像" />
              <div className="space-y-5">
                {PORTRAIT_DIMS.map((dim) => (
                  <div key={dim.key}>
                    <Label className="text-xs text-muted-foreground mb-1 block">{dim.label}</Label>
                    <UTextarea
                      value={portrait[dim.key]}
                      onChange={(e) => setPortrait((p) => ({ ...p, [dim.key]: e.target.value }))}
                      placeholder={dim.placeholder}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 平台大事件 */}
            <section>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">平台大事件</h3>
                </div>
                <button
                  onClick={() => setTimeline((p) => [...p, { date: "", event: "" }])}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />新增
                </button>
              </div>
              <div className="space-y-3">
                {timeline.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">暂无事件，点击「新增」添加</p>
                )}
                {timeline.map((item, i) => (
                  <div key={i} className="flex gap-3 items-center pb-3 border-b border-border/20 last:border-0">
                    <UInput
                      value={item.date}
                      onChange={(e) => setTimeline((p) => p.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}
                      placeholder="2012"
                      className="w-24 shrink-0"
                    />
                    <UInput
                      value={item.event}
                      onChange={(e) => setTimeline((p) => p.map((x, j) => j === i ? { ...x, event: e.target.value } : x))}
                      placeholder="事件描述"
                    />
                    <button
                      onClick={() => setTimeline((p) => p.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* 规则文件 */}
            <section>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">规则文件</h3>
                </div>
                <button
                  onClick={() => {
                    const newIdx = rules.length;
                    setRules((p) => [
                      ...p,
                      {
                        id: `rule-${Date.now()}`,
                        title: "",
                        type: "",
                        versions: [{ versionId: `v-${Date.now()}-0`, versionLabel: "初始版本", date: "", url: "", content: "" }],
                      },
                    ]);
                    setExpandedRuleIdx(newIdx);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />新增规则
                </button>
              </div>
              <div className="space-y-2">
                {rules.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">暂无规则文件，点击「新增规则」添加</p>
                )}
                {rules.map((rule, i) => (
                  <div key={rule.id ?? i} className="border border-border/30 rounded-lg overflow-hidden">
                    {/* Rule header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/20">
                      <button
                        type="button"
                        className="flex-1 flex items-center gap-2 text-left"
                        onClick={() => setExpandedRuleIdx(expandedRuleIdx === i ? null : i)}
                      >
                        <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expandedRuleIdx === i && "rotate-90")} />
                        <span className="text-sm font-medium truncate">{rule.title || "（未命名规则）"}</span>
                        {rule.type && <Badge variant="outline" className="text-[10px] shrink-0">{rule.type}</Badge>}
                        <span className="text-xs text-muted-foreground shrink-0">{rule.versions?.length ?? 0} 个版本</span>
                      </button>
                      <button
                        onClick={() => setRules((p) => p.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Rule body */}
                    {expandedRuleIdx === i && (
                      <div className="px-4 py-4 space-y-4 border-t border-border/20">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">规则名称</Label>
                            <UInput
                              value={rule.title}
                              onChange={(e) => setRules((p) => p.map((r, j) => j === i ? { ...r, title: e.target.value } : r))}
                              placeholder="服务条款"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">规则类型</Label>
                            <UInput
                              value={rule.type}
                              onChange={(e) => setRules((p) => p.map((r, j) => j === i ? { ...r, type: e.target.value } : r))}
                              placeholder="ToS / Privacy / Community Standards"
                            />
                          </div>
                        </div>
                        {/* Versions */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs text-muted-foreground">版本历史</Label>
                            <button
                              onClick={() => {
                                setRules((p) => p.map((r, j) => j !== i ? r : {
                                  ...r,
                                  versions: [...r.versions, {
                                    versionId: `v-${Date.now()}-${r.versions.length}`,
                                    versionLabel: "",
                                    date: "",
                                    url: "",
                                    content: "",
                                  }],
                                }));
                                setExpandedVersionIdx((prev) => ({ ...prev, [i]: (rules[i]?.versions?.length ?? 0) }));
                              }}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              <Plus className="w-3 h-3" />新增版本
                            </button>
                          </div>
                          <div className="space-y-2">
                            {rule.versions.map((ver, vi) => (
                              <div key={ver.versionId ?? vi} className="border border-border/20 rounded-md overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 bg-muted/10">
                                  <button
                                    type="button"
                                    className="flex-1 flex items-center gap-2 text-left"
                                    onClick={() => setExpandedVersionIdx((prev) => ({ ...prev, [i]: prev[i] === vi ? null : vi }))}
                                  >
                                    <ChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform", expandedVersionIdx[i] === vi && "rotate-90")} />
                                    <span className="text-xs font-medium">{ver.versionLabel || "（未命名版本）"}</span>
                                    {ver.date && <span className="text-xs text-muted-foreground">{ver.date}</span>}
                                  </button>
                                  <button
                                    onClick={() => setRules((p) => p.map((r, j) => j !== i ? r : { ...r, versions: r.versions.filter((_, k) => k !== vi) }))}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                {expandedVersionIdx[i] === vi && (
                                  <div className="px-3 py-3 space-y-3 border-t border-border/20">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs text-muted-foreground mb-1 block">版本号</Label>
                                        <UInput
                                          value={ver.versionLabel}
                                          onChange={(e) => setRules((p) => p.map((r, j) => j !== i ? r : {
                                            ...r, versions: r.versions.map((v, k) => k === vi ? { ...v, versionLabel: e.target.value } : v),
                                          }))}
                                          placeholder="v2.0 / 2024版"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs text-muted-foreground mb-1 block">生效日期</Label>
                                        <UInput
                                          value={ver.date}
                                          onChange={(e) => setRules((p) => p.map((r, j) => j !== i ? r : {
                                            ...r, versions: r.versions.map((v, k) => k === vi ? { ...v, date: e.target.value } : v),
                                          }))}
                                          placeholder="2024-01-01"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground mb-1 block">原文链接</Label>
                                      <div className="relative">
                                        <LinkIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <UInput
                                          value={ver.url}
                                          onChange={(e) => setRules((p) => p.map((r, j) => j !== i ? r : {
                                            ...r, versions: r.versions.map((v, k) => k === vi ? { ...v, url: e.target.value } : v),
                                          }))}
                                          placeholder="https://..."
                                          className="pl-5"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground mb-1 block">规则全文</Label>
                                      <UTextarea
                                        value={ver.content}
                                        onChange={(e) => setRules((p) => p.map((r, j) => j !== i ? r : {
                                          ...r, versions: r.versions.map((v, k) => k === vi ? { ...v, content: e.target.value } : v),
                                        }))}
                                        placeholder="粘贴规则原文内容（可选）"
                                        rows={4}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── Right: Meta Panel ── */}
          <div className="space-y-6">
            {/* 辖区 */}
            <div className="sticky top-20">
              <div className="border border-border/30 rounded-xl p-5 space-y-5">
                <div>
                  <SectionHeader icon={MapPin} title="发源辖区" />
                  <div className="flex flex-wrap gap-2">
                    {jurisdictions?.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => toggleJuris(j.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs border transition-colors",
                          jurisSel.includes(j.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        {j.flag} {j.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/20 pt-4">
                  <SectionHeader icon={Tag} title="显示设置" />
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">品牌主色</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={basic.color}
                          onChange={(e) => setB("color", e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-border/50"
                        />
                        <UInput
                          value={basic.color}
                          onChange={(e) => setB("color", e.target.value)}
                          placeholder="#3B82F6"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">公开展示</Label>
                      <Switch
                        checked={basic.isActive}
                        onCheckedChange={(v) => setB("isActive", v)}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/20 pt-4 space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存并激活"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                  >
                    仅保存
                  </Button>
                  {basic.id.trim() && basic.name.trim() && (
                    <Button
                      variant="ghost"
                      className="w-full gap-1.5 text-primary hover:text-primary"
                      onClick={handlePreview}
                      disabled={previewing || saving}
                    >
                      {previewing ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />保存并预览...</>
                      ) : (
                        <><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>保存并预览</>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => navigate("/admin")}
                  >
                    返回后台
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
