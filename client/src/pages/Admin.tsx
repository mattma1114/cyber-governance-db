import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ShieldCheck, Plus, Pencil, Trash2, Eye, EyeOff, Search,
  Database, LayoutGrid, ChevronLeft, ChevronRight, LogIn, AlertTriangle,
  Tag, Globe, X, Settings, Key, Save, Loader2, CheckCircle2, XCircle, FlaskConical,
  RefreshCw, FileText, MoreHorizontal, EyeOff as Unpublish, CheckSquare, Square, MinusSquare, Bot, ChevronDown, ChevronUp, Info} from "lucide-react";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 15;

// ── Case Form ──────────────────────────────────────────────────────────────────
function CaseForm({
  initial,
  topics,
  jurisdictions,
  onSave,
  onCancel,
  saving,
}: {
  initial?: any;
  topics: any[];
  jurisdictions: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    titleEn: initial?.titleEn ?? "",
    type: initial?.type ?? "judicial",
    topicId: initial?.topicId ?? "",
    jurisdictionId: initial?.jurisdictionId ?? "",
    date: initial?.date ?? "",
    source: initial?.source ?? "",
    sourceUrl: initial?.sourceUrl ?? "",
    abstract: initial?.abstract ?? "",
    aiSummary: initial?.aiSummary ?? "",
    aiAnalysis: initial?.aiAnalysis ?? "",
    tags: Array.isArray(initial?.tags)
      ? initial.tags.join(", ")
      : (initial?.tags ? JSON.parse(initial.tags).join(", ") : ""),
    published: initial ? initial.status === 'published' : true,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("标题不能为空"); return; }
    if (!form.type) { toast.error("请选择内容类型"); return; }
    onSave({
      ...form,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      status: form.published ? 'published' as const : 'draft' as const,
    });
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>标题 *</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="内容标题" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>英文标题</Label>
          <Input value={form.titleEn} onChange={(e) => set("titleEn", e.target.value)} placeholder="English Title" />
        </div>
        <div className="space-y-1.5">
          <Label>内容类型 *</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="judicial">司法内容</SelectItem>
              <SelectItem value="regulatory">监管执法</SelectItem>
              <SelectItem value="legislation">立法政策</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>日期</Label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>研究专题</Label>
          <Select value={form.topicId || "none"} onValueChange={(v) => set("topicId", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="选择专题" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">不指定</SelectItem>
              {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>司法辖区</Label>
          <Select value={form.jurisdictionId || "none"} onValueChange={(v) => set("jurisdictionId", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="选择辖区" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">不指定</SelectItem>
              {jurisdictions.map((j) => <SelectItem key={j.id} value={j.id}>{j.flag} {j.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>来源</Label>
          <Input value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="来源机构或媒体" />
        </div>
        <div className="space-y-1.5">
          <Label>来源链接</Label>
          <Input value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://..." />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>内容摘要</Label>
          <Textarea value={form.abstract} onChange={(e) => set("abstract", e.target.value)} rows={3} placeholder="内容摘要" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>AI 摘要</Label>
          <Textarea value={form.aiSummary} onChange={(e) => set("aiSummary", e.target.value)} rows={3} placeholder="AI 摘要解读" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>深度分析</Label>
          <Textarea value={form.aiAnalysis} onChange={(e) => set("aiAnalysis", e.target.value)} rows={3} placeholder="法律深度分析" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>标签（逗号分隔）</Label>
          <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="GDPR, 数据保护, 罚款" />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <Switch checked={form.published} onCheckedChange={(v) => set("published", v)} />
          <Label>{form.published ? "已发布" : "草稿（不公开）"}</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Simple Tag Form (Topics & Jurisdictions) ─────────────────────────────────
function SimpleTagForm({ initial, fields, onSave, onCancel, saving, tagType }: {
  initial?: any; fields: string[]; tagType: "topic" | "jurisdiction";
  onSave: (d: any) => void; onCancel: () => void; saving: boolean;
}) {
  const LABELS: Record<string, string> = { id: "ID（唯一标识）", label: "中文名称", labelEn: "英文名称", color: "颜色（HEX）", flag: "旗帜 Emoji", desc: "描述" };
  const isNew = !initial;
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f, initial?.[f] ?? ""]))
  );
  const [suggesting, setSuggesting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestMutation = trpc.ai.suggestTagFields.useMutation();

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleLabelChange = (v: string) => {
    set("label", v);
    if (!isNew) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim() || v.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSuggesting(true);
      try {
        const result = await suggestMutation.mutateAsync({ label: v.trim(), type: tagType });
        setForm((prev) => ({
          ...prev,
          ...(result.id && !prev.id ? { id: result.id } : {}),
          ...(result.labelEn && !prev.labelEn ? { labelEn: result.labelEn } : {}),
          ...((result as any).color && !prev.color ? { color: (result as any).color } : {}),
        }));
      } catch {
        // silently ignore
      } finally {
        setSuggesting(false);
      }
    }, 600);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="space-y-3">
      {suggesting && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded px-3 py-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          AI 正在自动预填写其它字段…
        </div>
      )}
      {fields.map((f) => (
        <div key={f} className="space-y-1.5">
          <Label>{LABELS[f] ?? f}</Label>
          {f === "label" ? (
            <Input
              value={form[f]}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="输入名称后 AI 自动预填其它字段"
            />
          ) : f === "color" ? (
            <div className="flex gap-2 items-center">
              <Input value={form[f]} onChange={(e) => set(f, e.target.value)} placeholder="#1a73e8" className="flex-1" />
              {form[f] && <div className="w-9 h-9 rounded border shrink-0" style={{ background: form[f] }} />}
            </div>
          ) : (
            <Input
              value={form[f]}
              onChange={(e) => set(f, e.target.value)}
              disabled={f === "id" && !!initial}
            />
          )}
        </div>
      ))}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={() => onSave(form)} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
      </DialogFooter>
    </div>
  );
}

// ── Platform Form ─────────────────────────────────────────────────────────────
const PORTRAIT_DIMS = [
  { key: "structure", label: "平台结构" },
  { key: "contentSource", label: "内容来源" },
  { key: "networkEffect", label: "网络效应" },
  { key: "businessModel", label: "商业模式" },
  { key: "openness", label: "开放程度" },
  { key: "crossBorder", label: "跨境特征" },
  { key: "governance", label: "治理机制" },
];

function PlatformForm({ initial, onSave, onCancel, saving, jurisdictions }: {
  initial?: any; onSave: (d: any) => void; onCancel: () => void; saving: boolean;
  jurisdictions?: Array<{ id: string; label: string; flag?: string | null }>;
}) {
  const isEdit = !!initial;
  const initPortrait = initial?.portrait
    ? (typeof initial.portrait === "string" ? JSON.parse(initial.portrait) : initial.portrait)
    : {};
  const initJuris: string[] = initial?.jurisdiction
    ? (typeof initial.jurisdiction === "string" ? JSON.parse(initial.jurisdiction) : initial.jurisdiction)
    : [];
  const initTimeline: Array<{ date: string; event: string }> = initial?.timeline
    ? (typeof initial.timeline === "string" ? JSON.parse(initial.timeline) : initial.timeline)
    : [];
  const initRules: Array<{ date: string; title: string; type: string; url: string }> = initial?.rules
    ? (typeof initial.rules === "string" ? JSON.parse(initial.rules) : initial.rules)
    : [];

  const [basic, setBasic] = useState({
    id: initial?.id ?? "",
    name: initial?.name ?? "",
    company: initial?.company ?? "",
    hq: initial?.hq ?? "",
    founded: initial?.founded?.toString() ?? "",
    color: initial?.color ?? "",
    abbr: initial?.abbr ?? "",
    description: initial?.description ?? "",
    isActive: initial?.isActive ?? true,
  });
  const [jurisSel, setJurisSel] = useState<string[]>(initJuris);
  const [types, setTypes] = useState<string>(initPortrait.types?.join(", ") ?? "");
  const [portrait, setPortrait] = useState<Record<string, string>>(
    Object.fromEntries(PORTRAIT_DIMS.map((d) => [d.key, initPortrait[d.key] ?? ""]))
  );
  const [timeline, setTimeline] = useState<Array<{ date: string; event: string }>>(initTimeline);
  const [rules, setRules] = useState<Array<{ date: string; title: string; type: string; url: string }>>(initRules);
  const [formTab, setFormTab] = useState("basic");

  const setB = (k: string, v: any) => setBasic((p) => ({ ...p, [k]: v }));
  const toggleJuris = (id: string) => setJurisSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const buildPayload = () => ({
    id: basic.id,
    name: basic.name,
    company: basic.company,
    hq: basic.hq,
    founded: basic.founded ? parseInt(basic.founded) : undefined,
    color: basic.color,
    abbr: basic.abbr,
    description: basic.description,
    isActive: basic.isActive,
    jurisdiction: jurisSel,
    portrait: { ...portrait, types: types.split(",").map((t) => t.trim()).filter(Boolean) },
    timeline,
    rules,
  });

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-1">
      <Tabs value={formTab} onValueChange={setFormTab}>
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="basic" className="flex-1">基本信息</TabsTrigger>
          <TabsTrigger value="portrait" className="flex-1">结构画像</TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1">时间线</TabsTrigger>
          <TabsTrigger value="rules" className="flex-1">规则文件</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-3">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>ID（唯一标识，如 tiktok）</Label>
              <Input value={basic.id} onChange={(e) => setB("id", e.target.value)} placeholder="tiktok" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>平台名称</Label>
              <Input value={basic.name} onChange={(e) => setB("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>缩写</Label>
              <Input value={basic.abbr} onChange={(e) => setB("abbr", e.target.value)} placeholder="TK" />
            </div>
            <div className="space-y-1.5">
              <Label>母公司</Label>
              <Input value={basic.company} onChange={(e) => setB("company", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>总部</Label>
              <Input value={basic.hq} onChange={(e) => setB("hq", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>成立年份</Label>
              <Input value={basic.founded} onChange={(e) => setB("founded", e.target.value)} type="number" />
            </div>
            <div className="space-y-1.5">
              <Label>品牌色（HEX）</Label>
              <div className="flex gap-2">
                <Input value={basic.color} onChange={(e) => setB("color", e.target.value)} placeholder="#1a73e8" />
                {basic.color && <div className="w-9 h-9 rounded border shrink-0" style={{ background: basic.color }} />}
              </div>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>平台简介</Label>
              <Textarea value={basic.description} onChange={(e) => setB("description", e.target.value)} rows={3} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>平台类型（逗号分隔）</Label>
            <Input value={types} onChange={(e) => setTypes(e.target.value)} placeholder="社交媒体, 短视频" />
          </div>
          <div className="space-y-1.5">
            <Label>司法辖区</Label>
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
          <div className="flex items-center gap-2">
            <Switch checked={basic.isActive} onCheckedChange={(v) => setB("isActive", v)} />
            <Label>已激活（公开展示）</Label>
          </div>
        </TabsContent>

        <TabsContent value="portrait" className="space-y-3">
          <p className="text-xs text-muted-foreground">填写平台七大结构维度画像，每项支持 Markdown 格式。</p>
          {PORTRAIT_DIMS.map((d) => (
            <div key={d.key} className="space-y-1.5">
              <Label>{d.label}</Label>
              <Textarea
                value={portrait[d.key]}
                onChange={(e) => setPortrait((p) => ({ ...p, [d.key]: e.target.value }))}
                rows={2}
                placeholder={`描述平台的${d.label}特征…`}
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">平台发展历史时间线</p>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setTimeline((p) => [...p, { date: "", event: "" }])}>
              <Plus className="w-3.5 h-3.5" />新增
            </Button>
          </div>
          {timeline.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                className="w-28 shrink-0"
                value={item.date}
                onChange={(e) => setTimeline((p) => p.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}
                placeholder="2012"
              />
              <Input
                value={item.event}
                onChange={(e) => setTimeline((p) => p.map((x, j) => j === i ? { ...x, event: e.target.value } : x))}
                placeholder="事件描述"
              />
              <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0 text-destructive" onClick={() => setTimeline((p) => p.filter((_, j) => j !== i))}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="rules" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">平台规则文件列表</p>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setRules((p) => [...p, { date: "", title: "", type: "", url: "" }])}>
              <Plus className="w-3.5 h-3.5" />新增
            </Button>
          </div>
          {rules.map((item, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  className="w-28 shrink-0"
                  value={item.date}
                  onChange={(e) => setRules((p) => p.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}
                  placeholder="2023-01"
                />
                <Input
                  value={item.type}
                  onChange={(e) => setRules((p) => p.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                  placeholder="类型（如隐私政策）"
                />
                <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0 text-destructive" onClick={() => setRules((p) => p.filter((_, j) => j !== i))}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Input
                value={item.title}
                onChange={(e) => setRules((p) => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                placeholder="文件标题"
              />
              <Input
                value={item.url}
                onChange={(e) => setRules((p) => p.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                placeholder="https://..."
              />
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <div className="pt-3 border-t border-border mt-3">
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={() => onSave(buildPayload())} disabled={saving || !basic.id || !basic.name}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </div>
    </div>
  );
}

/// ── Settings Tab ──────────────────────────────────────────────
function SettingsTab() {
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string } | null>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  // LLM config state
  const [llmProvider, setLlmProvider] = useState<string>("");
  const [llmApiKey, setLlmApiKey] = useState<string>("");
  const [llmModel, setLlmModel] = useState<string>("");
  const [llmBaseUrl, setLlmBaseUrl] = useState<string>("");
  const [llmApiVersion, setLlmApiVersion] = useState<string>("");
  const [llmTestResult, setLlmTestResult] = useState<{ ok: boolean; message: string; provider?: string; model?: string } | null>(null);
  const [llmTesting, setLlmTesting] = useState(false);
  const utils = trpc.useUtils();

  const testApiKeyMutation = trpc.scraper.testApiKey.useMutation({
    onSuccess: (data, variables) => {
      setTestResults((prev) => ({ ...prev, [variables.service]: { ok: data.ok, message: data.message } }));
      setTestingKey(null);
    },
    onError: (e, variables) => {
      setTestResults((prev) => ({ ...prev, [variables.service]: { ok: false, message: e.message } }));
      setTestingKey(null);
    },
  });

  const SERVICE_MAP: Record<string, "firecrawl" | "jina" | "scrapingbee"> = {
    FIRECRAWL_API_KEY: "firecrawl",
    JINA_API_KEY: "jina",
    SCRAPINGBEE_API_KEY: "scrapingbee",
  };

  const { data: settings, isLoading } = trpc.settings.getAll.useQuery();

  const upsertMutation = trpc.settings.upsert.useMutation({
    onSuccess: () => {
      toast.success("API 配置已保存");
      utils.settings.getAll.invalidate();
      setKeyInput(""); setValueInput(""); setLabelInput("");
    },
    onError: (e) => toast.error(`保存失败：${e.message}`),
  });

  const deleteMutation = trpc.settings.delete.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.settings.getAll.invalidate(); },
    onError: (e) => toast.error(`删除失败：${e.message}`),
  });
  const testLlmMutation = trpc.ai.testLlm.useMutation({
    onSuccess: (data) => {
      setLlmTestResult({ ok: data.ok, message: data.message, provider: data.provider, model: data.model });
      setLlmTesting(false);
    },
    onError: (e) => {
      setLlmTestResult({ ok: false, message: e.message });
      setLlmTesting(false);
    },
  });
  const saveLlmConfig = () => {
    if (!llmProvider || llmProvider === "builtin") {
      // Save provider as builtin (clears external config)
      upsertMutation.mutate({ key: "LLM_PROVIDER", value: "builtin", label: "LLM 服务商" });
      return;
    }
    if (!llmApiKey.trim()) { toast.error("请输入 API Key"); return; }
    const ops = [
      { key: "LLM_PROVIDER", value: llmProvider, label: "LLM 服务商" },
      { key: "LLM_API_KEY", value: llmApiKey.trim(), label: "LLM API Key" },
    ];
    if (llmModel.trim()) ops.push({ key: "LLM_MODEL", value: llmModel.trim(), label: "LLM 模型" });
    if (llmBaseUrl.trim()) ops.push({ key: "LLM_BASE_URL", value: llmBaseUrl.trim(), label: "LLM 自定义端点" });
    if (llmApiVersion.trim()) ops.push({ key: "LLM_API_VERSION", value: llmApiVersion.trim(), label: "Azure API 版本" });
    ops.forEach((op) => upsertMutation.mutate(op));
    toast.success("LLM 配置已保存");
  };
  // Load existing LLM config from settings
  const existingProvider = settings?.find((s) => s.key === "LLM_PROVIDER")?.value ?? "";
  const existingModel = settings?.find((s) => s.key === "LLM_MODEL")?.value ?? "";
  const existingBaseUrl = settings?.find((s) => s.key === "LLM_BASE_URL")?.value ?? "";
  const LLM_PROVIDERS = [
    { value: "builtin", label: "Manus 内置 LLM（默认）", hint: "使用平台内置 LLM，无需配置，开箱即用" },
    { value: "openai", label: "OpenAI", hint: "GPT-4o、GPT-4o-mini、GPT-4-turbo 等" },
    { value: "deepseek", label: "DeepSeek", hint: "deepseek-chat（V3）、deepseek-reasoner（R1）" },
    { value: "anthropic", label: "Anthropic Claude", hint: "Claude 3.5 Sonnet、Claude 3 Haiku 等" },
    { value: "azure", label: "Azure OpenAI", hint: "需要额外配置 Endpoint URL 和 API 版本" },
    { value: "openai_compat", label: "OpenAI 兼容端点", hint: "Ollama、Together.ai、Groq 等兼容 OpenAI 格式的服务" },
  ];

  // ── Per-task LLM config ──────────────────────────────────────────────────
  const { data: llmTasks } = trpc.ai.getLlmTasks.useQuery();
  const [taskConfigs, setTaskConfigs] = useState<Record<string, { provider: string; model: string }>>({});
  const [taskConfigExpanded, setTaskConfigExpanded] = useState(false);

  // Initialize task configs from existing settings
  const initTaskConfigs = () => {
    if (!settings || !llmTasks) return;
    const init: Record<string, { provider: string; model: string }> = {};
    llmTasks.forEach((t) => {
      init[t.key] = {
        provider: settings.find((s) => s.key === `LLM_TASK_${t.key}_PROVIDER`)?.value ?? "",
        model: settings.find((s) => s.key === `LLM_TASK_${t.key}_MODEL`)?.value ?? "",
      };
    });
    setTaskConfigs(init);
  };

  const saveTaskConfigs = () => {
    if (!llmTasks) return;
    llmTasks.forEach((t) => {
      const cfg = taskConfigs[t.key];
      if (!cfg) return;
      if (cfg.provider) {
        // Save provider (including "builtin" which explicitly overrides global)
        upsertMutation.mutate({ key: `LLM_TASK_${t.key}_PROVIDER`, value: cfg.provider, label: `${t.label} - 服务商` });
      } else {
        // Empty = "follow global" → delete the task-level provider key
        deleteMutation.mutate({ key: `LLM_TASK_${t.key}_PROVIDER` });
      }
      if (cfg.model) {
        upsertMutation.mutate({ key: `LLM_TASK_${t.key}_MODEL`, value: cfg.model, label: `${t.label} - 模型` });
      } else {
        // Empty model → delete so it falls back to provider default
        deleteMutation.mutate({ key: `LLM_TASK_${t.key}_MODEL` });
      }
    });
    toast.success("按功能 LLM 配置已保存");
  };
  const DEFAULT_MODEL_HINTS: Record<string, string> = {
    openai: "gpt-4o",
    deepseek: "deepseek-chat",
    anthropic: "claude-3-5-sonnet-20241022",
    azure: "gpt-4o（部署名称）",
    openai_compat: "视服务商而定",
  };

  const PRESET_KEYS = [
    { key: "FIRECRAWL_API_KEY", label: "Firecrawl API Key", hint: "主力抓取服务，用于平台规则文件、内容页面抓取（优先使用）" },
    { key: "JINA_API_KEY", label: "Jina Reader API Key", hint: "备用抓取服务，无 Key 也可免费使用，配置后可提升额度上限" },
    { key: "SCRAPINGBEE_API_KEY", label: "ScrapingBee API Key", hint: "底座备用抓取服务，适用于强反爬防护的页面（Cloudflare 等）" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold">API 密鑰配置</h2>
        <p className="text-sm text-muted-foreground mt-1">
          配置第三方抓取 API Key。系统采用梯级降级策略：Firecrawl（主力）→ Jina Reader（备用）→ ScrapingBee（底座），任一成功即返回结果。密鑰加密存储在数据库中。
        </p>
      </div>

      {/* Preset keys */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Firecrawl 配置</h3>
        {PRESET_KEYS.map((preset) => {
          const existing = settings?.find((s) => s.key === preset.key);
          return (
            <div key={preset.key} className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{preset.label}</span>
                    {existing && <Badge variant="secondary" className="text-xs">已配置</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{preset.hint}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  className="h-8 text-sm font-mono flex-1"
                  placeholder={existing ? "已配置，输入新密鑰可更新" : "输入 API Key"}
                  id={`preset-${preset.key}`}
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    const el = document.getElementById(`preset-${preset.key}`) as HTMLInputElement;
                    const val = el?.value?.trim();
                    if (!val) { toast.error("请输入 API Key"); return; }
                    upsertMutation.mutate({ key: preset.key, value: val, label: preset.label });
                    if (el) el.value = "";
                  }}
                  disabled={upsertMutation.isPending}
                >
                  {upsertMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </Button>
                {/* Test button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  title="测试 API Key 是否有效"
                  disabled={testingKey === preset.key}
                  onClick={() => {
                    const service = SERVICE_MAP[preset.key];
                    if (!service) return;
                    // Check if there's a new key in the input
                    const el = document.getElementById(`preset-${preset.key}`) as HTMLInputElement;
                    const inputVal = el?.value?.trim();
                    setTestingKey(preset.key);
                    setTestResults((prev) => ({ ...prev, [service]: null }));
                    testApiKeyMutation.mutate({ service, apiKey: inputVal || undefined });
                  }}
                >
                  {testingKey === preset.key
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <FlaskConical className="w-3.5 h-3.5" />}
                  <span className="text-xs">测试</span>
                </Button>
                {existing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate({ key: preset.key })}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {/* Test result */}
              {(() => {
                const service = SERVICE_MAP[preset.key];
                const result = service ? testResults[service] : undefined;
                if (!result) return null;
                return (
                  <div className={`flex items-center gap-1.5 text-xs mt-1 ${
                    result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  }`}>
                    {result.ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{result.message}</span>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* External LLM Configuration */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">AI 大模型配置</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            配置外部 LLM 服务商，用于摘要生成、法律分析、平台信息填写、专题/辖区预填写等 AI 功能。
            未配置时自动使用 Manus 内置 LLM。外部 LLM 调用失败时自动降级到内置 LLM。
          </p>
        </div>
        <div className="rounded-lg border border-border p-4 space-y-4">
          {/* Provider selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">服务商</Label>
            <Select
              value={llmProvider || existingProvider || "builtin"}
              onValueChange={(v) => { setLlmProvider(v); setLlmTestResult(null); setLlmModel(""); setLlmBaseUrl(""); setLlmApiVersion(""); }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="选择 LLM 服务商" />
              </SelectTrigger>
              <SelectContent>
                {LLM_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex flex-col">
                      <span>{p.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(() => {
              const p = LLM_PROVIDERS.find((p) => p.value === (llmProvider || existingProvider || "builtin"));
              return p ? <p className="text-xs text-muted-foreground">{p.hint}</p> : null;
            })()}
          </div>

          {/* API Key (hidden for builtin) */}
          {(llmProvider || existingProvider || "builtin") !== "builtin" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">API Key</Label>
                <Input
                  type="password"
                  className="h-8 text-sm font-mono"
                  placeholder={settings?.find((s) => s.key === "LLM_API_KEY") ? "已配置，输入新 Key 可更新" : "输入 API Key"}
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  模型名称
                  <span className="text-muted-foreground font-normal ml-1">
                    （留空使用默认：{DEFAULT_MODEL_HINTS[llmProvider || existingProvider] ?? "自动"}）
                  </span>
                </Label>
                <Input
                  className="h-8 text-sm font-mono"
                  placeholder={existingModel || (DEFAULT_MODEL_HINTS[llmProvider || existingProvider] ?? "默认模型")}
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                />
              </div>

              {/* Azure / openai_compat extra fields */}
              {["azure", "openai_compat"].includes(llmProvider || existingProvider) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {(llmProvider || existingProvider) === "azure" ? "Azure Endpoint URL" : "自定义 Base URL"}
                  </Label>
                  <Input
                    className="h-8 text-sm font-mono"
                    placeholder={existingBaseUrl || ((llmProvider || existingProvider) === "azure"
                      ? "https://YOUR_RESOURCE.openai.azure.com"
                      : "https://api.example.com/v1")}
                    value={llmBaseUrl}
                    onChange={(e) => setLlmBaseUrl(e.target.value)}
                  />
                </div>
              )}
              {(llmProvider || existingProvider) === "azure" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Azure API 版本</Label>
                  <Input
                    className="h-8 text-sm font-mono"
                    placeholder="2024-02-01"
                    value={llmApiVersion}
                    onChange={(e) => setLlmApiVersion(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8" onClick={saveLlmConfig} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                : <Save className="w-3.5 h-3.5 mr-1.5" />}
              保存配置
            </Button>
            {(llmProvider || existingProvider || "builtin") !== "builtin" && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={llmTesting}
                onClick={() => {
                  const provider = (llmProvider || existingProvider) as "openai" | "deepseek" | "anthropic" | "azure" | "openai_compat";
                  const key = llmApiKey.trim() || settings?.find((s) => s.key === "LLM_API_KEY")?.value || "";
                  if (!key) { toast.error("请先输入或保存 API Key"); return; }
                  setLlmTesting(true);
                  setLlmTestResult(null);
                  testLlmMutation.mutate({
                    provider,
                    apiKey: key,
                    model: llmModel.trim() || existingModel || undefined,
                    baseUrl: llmBaseUrl.trim() || existingBaseUrl || undefined,
                    apiVersion: llmApiVersion.trim() || undefined,
                  });
                }}
              >
                {llmTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                <span className="text-xs">连通测试</span>
              </Button>
            )}
          </div>

          {/* Test result */}
          {llmTestResult && (
            <div className={`flex items-center gap-1.5 text-xs ${llmTestResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {llmTestResult.ok
                ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                : <XCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>{llmTestResult.message}</span>
              {llmTestResult.ok && llmTestResult.model && (
                <Badge variant="secondary" className="text-xs ml-1">{llmTestResult.provider} / {llmTestResult.model}</Badge>
              )}
            </div>
          )}

          {/* Current config display */}
          {existingProvider && existingProvider !== "builtin" && (
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <span className="text-xs text-muted-foreground">当前配置：</span>
              <Badge variant="outline" className="text-xs">{existingProvider}</Badge>
              {existingModel && <Badge variant="outline" className="text-xs">{existingModel}</Badge>}
              {settings?.find((s) => s.key === "LLM_API_KEY") && (
                <Badge variant="secondary" className="text-xs">API Key 已配置</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Per-task LLM Configuration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-primary" />
              按功能指定模型
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              为每个 AI 功能单独指定服务商和模型。未配置时使用上方全局设置，全局未配置则使用内置 LLM。
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => {
              if (!taskConfigExpanded) initTaskConfigs();
              setTaskConfigExpanded((v) => !v);
            }}
          >
            {taskConfigExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {taskConfigExpanded ? "收起" : "展开配置"}
          </Button>
        </div>

        {taskConfigExpanded && (
          <div className="rounded-lg border border-border divide-y divide-border">
            {(llmTasks ?? []).map((task) => {
              const cfg = taskConfigs[task.key] ?? { provider: "", model: "" };
              const effectiveProvider = cfg.provider || existingProvider || "builtin";
              return (
                <div key={task.key} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{task.label}</p>
                      <p className="text-xs text-muted-foreground">{task.desc}</p>
                    </div>
                    <Badge
                      variant={cfg.provider && cfg.provider !== "builtin" ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {cfg.provider && cfg.provider !== "builtin"
                        ? cfg.provider
                        : existingProvider && existingProvider !== "builtin"
                          ? `全局: ${existingProvider}`
                          : "内置 LLM"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">服务商（留空使用全局）</label>
                      <Select
                        value={cfg.provider || "__global__"}
                        onValueChange={(v) =>
                          setTaskConfigs((prev) => ({
                            ...prev,
                            [task.key]: { ...prev[task.key], provider: v === "__global__" ? "" : v },
                          }))
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__global__">
                            <span className="text-muted-foreground">跟随全局配置</span>
                          </SelectItem>
                          <SelectItem value="builtin">Manus 内置 LLM</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="deepseek">DeepSeek</SelectItem>
                          <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                          <SelectItem value="azure">Azure OpenAI</SelectItem>
                          <SelectItem value="openai_compat">OpenAI 兼容端点</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        模型（留空使用{" "}
                        {DEFAULT_MODEL_HINTS[effectiveProvider] ?? "默认"}）
                      </label>
                      <Input
                        className="h-7 text-xs font-mono"
                        placeholder={DEFAULT_MODEL_HINTS[effectiveProvider] ?? "默认模型"}
                        value={cfg.model}
                        onChange={(e) =>
                          setTaskConfigs((prev) => ({
                            ...prev,
                            [task.key]: { ...prev[task.key], model: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="px-4 py-3">
              <Button size="sm" className="h-7 text-xs" onClick={saveTaskConfigs} disabled={upsertMutation.isPending}>
                {upsertMutation.isPending
                  ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  : <Save className="w-3 h-3 mr-1" />}
                保存按功能配置
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Custom key-value */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">自定义配置项</h3>
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Key</Label>
              <Input className="h-8 text-sm font-mono" placeholder="MY_API_KEY" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">展示名称</Label>
              <Input className="h-8 text-sm" placeholder="配置名称" value={labelInput} onChange={(e) => setLabelInput(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Value</Label>
              <Input className="h-8 text-sm font-mono" type="password" placeholder="密鑰内容" value={valueInput} onChange={(e) => setValueInput(e.target.value)} />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (!keyInput.trim() || !valueInput.trim()) { toast.error("请填写 Key 和 Value"); return; }
              upsertMutation.mutate({ key: keyInput.trim(), value: valueInput.trim(), label: labelInput.trim() || undefined });
            }}
            disabled={upsertMutation.isPending}
          >
            {upsertMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            添加
          </Button>
        </div>
      </div>

      {/* Existing settings list */}
      {settings && settings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">已配置项</h3>
          <div className="rounded-lg border border-border divide-y divide-border">
            {settings.map((s) => (
              <div key={s.key} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{s.key}</span>
                    {s.label && <span className="text-xs text-muted-foreground">{s.label}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {s.value ? `${'*'.repeat(Math.min(s.value.length, 8))}...` : '未配置'}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate({ key: s.key })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Site Settings Tab ─────────────────────────────────────────────────────────
function SiteSettingsTab() {
  const utils = trpc.useUtils();
  const { data: allSettings, isLoading } = trpc.siteSettings.getAll.useQuery();
  const updateMutation = trpc.siteSettings.updateBatch.useMutation({
    onSuccess: () => {
      toast.success("网站信息已保存");
      utils.siteSettings.getAll.invalidate();
      utils.siteSettings.getPublic.invalidate();
    },
    onError: (e) => toast.error(`保存失败：${e.message}`),
  });

  // Local edits state: key -> value
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // Initialize edits from loaded settings
  useEffect(() => {
    if (allSettings) {
      const init: Record<string, string> = {};
      allSettings.forEach((s) => { init[s.key] = s.value; });
      setEdits(init);
      setDirty(false);
    }
  }, [allSettings]);

  const set = (key: string, value: string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    const items = Object.entries(edits).map(([key, value]) => ({ key, value }));
    updateMutation.mutate(items);
  };

  const GROUPS = [
    { key: "home", label: "首页内容", icon: "🏠" },
    { key: "about", label: "关于我们", icon: "ℹ️" },
    { key: "legal", label: "法律声明", icon: "⚖️" },
    { key: "org", label: "主办机构", icon: "🏛️" },
    { key: "footer", label: "底部栏", icon: "📋" },
    { key: "cases", label: "内容数据库说明", icon: "🗂️" },
    { key: "platforms", label: "平台画像库说明", icon: "🖼️" },
  ];

  const FIELD_LABELS: Record<string, { label: string; multiline?: boolean; hint?: string }> = {
    "home.badge": { label: "首页标签文字", hint: "显示在主标题上方的小标签" },
    "home.title_line1": { label: "主标题第一行" },
    "home.title_line2": { label: "主标题第二行" },
    "home.description": { label: "首页描述文字", multiline: true },
    "about.title": { label: "关于我们标题" },
    "about.content": { label: "关于我们正文", multiline: true },
    "about.team": { label: "团队介绍", multiline: true },
    "about.contact": { label: "联系方式", hint: "可填写邮箱或联系地址" },
    "legal.title": { label: "法律声明标题" },
    "legal.content": { label: "法律声明正文", multiline: true },
    "org.name": { label: "机构名称" },
    "org.department": { label: "院系名称" },
    "org.website": { label: "机构官网 URL", hint: "以 https:// 开头" },
    "org.email": { label: "联系邮箱" },
    "footer.copyright": { label: "版权声明" },
    "footer.disclaimer": { label: "免责声明" },
    "cases.page_title": { label: "页面标题" },
    "cases.page_description": { label: "页面描述", multiline: true },
    "platforms.page_title": { label: "页面标题" },
    "platforms.page_description": { label: "页面描述", multiline: true },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">网站信息管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">管理首页内容、关于我们、法律声明等网站公开信息</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || updateMutation.isPending}
          className="gap-1.5"
        >
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {dirty ? "保存修改" : "已保存"}
        </Button>
      </div>

      {GROUPS.map((group) => {
        const groupSettings = allSettings?.filter((s) => s.group === group.key) ?? [];
        if (groupSettings.length === 0) return null;
        return (
          <Card key={group.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{group.icon}</span>
                {group.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupSettings.map((setting) => {
                const meta = FIELD_LABELS[setting.key];
                const isMultiline = meta?.multiline ?? false;
                return (
                  <div key={setting.key} className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      {meta?.label ?? setting.label ?? setting.key}
                    </Label>
                    {meta?.hint && (
                      <p className="text-xs text-muted-foreground">{meta.hint}</p>
                    )}
                    {isMultiline ? (
                      <Textarea
                        value={edits[setting.key] ?? ""}
                        onChange={(e) => set(setting.key, e.target.value)}
                        rows={4}
                        className="text-sm resize-y"
                      />
                    ) : (
                      <Input
                        value={edits[setting.key] ?? ""}
                        onChange={(e) => set(setting.key, e.target.value)}
                        className="text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Main Admin Page ──────────────────────────────────────────────
export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const [, navigate] = useLocation();
  const [tab, setTab] = useState("cases");
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [inputVal, setInputVal] = useState("");

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: number; title?: string; isBatch?: boolean }>({ open: false });
  // Topic/Jurisdiction dialog
  const [topicDialog, setTopicDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [jurisDialog, setJurisDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: topics } = trpc.topics.list.useQuery();
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: stats } = trpc.cases.stats.useQuery();

  const { data: casesData, isLoading: casesLoading } = trpc.cases.listAdmin.useQuery({
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: platforms, isLoading: platformsLoading } = trpc.platforms.list.useQuery({});

  const createTopic = trpc.topics.create.useMutation({
    onSuccess: () => { toast.success("专题已创建"); utils.topics.list.invalidate(); setTopicDialog({ open: false }); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateTopic = trpc.topics.update.useMutation({
    onSuccess: () => { toast.success("专题已更新"); utils.topics.list.invalidate(); setTopicDialog({ open: false }); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteTopic = trpc.topics.delete.useMutation({
    onSuccess: () => { toast.success("专题已删除"); utils.topics.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const createJuris = trpc.jurisdictions.create.useMutation({
    onSuccess: () => { toast.success("辖区已创建"); utils.jurisdictions.list.invalidate(); setJurisDialog({ open: false }); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateJuris = trpc.jurisdictions.update.useMutation({
    onSuccess: () => { toast.success("辖区已更新"); utils.jurisdictions.list.invalidate(); setJurisDialog({ open: false }); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteJuris = trpc.jurisdictions.delete.useMutation({
    onSuccess: () => { toast.success("辖区已删除"); utils.jurisdictions.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteCase = trpc.cases.delete.useMutation({
    onSuccess: () => {
      toast.success("内容已删除");
      utils.cases.listAdmin.invalidate();
      utils.cases.stats.invalidate();
      setDeleteDialog({ open: false });
    },
    onError: (e) => toast.error(e.message),
  });

  const togglePublish = trpc.cases.togglePublish.useMutation({
    onSuccess: () => utils.cases.listAdmin.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.cases.updateStatus.useMutation({
    onSuccess: () => { utils.cases.listAdmin.invalidate(); utils.cases.stats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const batchUpdateStatus = trpc.cases.batchUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`已更新 ${data.count} 条内容状态`);
      setSelectedIds(new Set());
      utils.cases.listAdmin.invalidate();
      utils.cases.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const batchDelete = trpc.cases.batchDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`已删除 ${data.count} 条内容`);
      setSelectedIds(new Set());
      setDeleteDialog({ open: false });
      utils.cases.listAdmin.invalidate();
      utils.cases.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [refetchingFullText, setRefetchingFullText] = useState(false);
  const refetchFullTextMutation = trpc.cases.refetchFullText.useMutation({
    onSuccess: (data) => {
      setRefetchingFullText(false);
      utils.cases.listAdmin.invalidate();
      if (data.failed === 0) {
        toast.success(`原文抓取完成：${data.succeeded} 条成功`);
      } else {
        toast.warning(`原文抓取完成：${data.succeeded} 条成功，${data.failed} 条失败（无原文链接或抓取超时）`);
      }
    },
    onError: (e) => {
      setRefetchingFullText(false);
      toast.error(e.message);
    },
  });

  if (loading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center">
        <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-bold mb-2">需要登录</h2>
        <p className="text-muted-foreground mb-6">请登录后访问管理员后台</p>
        <Button asChild>
          <a href={getLoginUrl()}>
            <LogIn className="w-4 h-4 mr-2" />
            登录
          </a>
        </Button>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="container py-20 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h2 className="text-xl font-bold mb-2">权限不足</h2>
        <p className="text-muted-foreground mb-6">您没有管理员权限</p>
        <Button asChild variant="outline">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    );
  }

  const totalPages = casesData ? Math.ceil(casesData.total / PAGE_SIZE) : 1;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                管理员后台
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                欢迎，{user.name} · 互联网平台治理数据库
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/">返回前台</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: "内容总数", value: stats?.total ?? 0 },
              { label: "司法内容", value: stats?.judicial ?? 0 },
              { label: "监管执法", value: stats?.regulatory ?? 0 },
              { label: "立法政策", value: stats?.legislation ?? 0 },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-bold text-primary">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="cases" className="gap-1.5">
              <Database className="w-3.5 h-3.5" />
              内容管理
            </TabsTrigger>
            <TabsTrigger value="platforms" className="gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              平台管理
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              专题/辖区
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              API 配置
            </TabsTrigger>
            <TabsTrigger value="siteinfo" className="gap-1.5">
              <Info className="w-3.5 h-3.5" />
              网站信息
            </TabsTrigger>
          </TabsList>

          {/* Cases Tab */}
          <TabsContent value="cases">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm"
                  placeholder="搜索内容…"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { setKeyword(inputVal); setPage(1); setSelectedIds(new Set()); } }}
                />
              </div>
              <Button size="sm" className="h-8" onClick={() => { setKeyword(inputVal); setPage(1); setSelectedIds(new Set()); }}>搜索</Button>
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); setSelectedIds(new Set()); }}>
                <SelectTrigger className="h-8 w-28 text-sm">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="published">已发布</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="unpublished">已下架</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={refetchingFullText || !casesData?.items?.length}
                onClick={() => {
                  const ids = casesData?.items
                    ?.filter((c: any) => c.sourceUrl && !c.hasFullText)
                    ?.map((c: any) => c.id) ?? [];
                  if (ids.length === 0) { toast.info("当前页所有内容均已有原文，或缺少原文链接"); return; }
                  setRefetchingFullText(true);
                  toast.info(`开始重新抓取 ${ids.length} 条原文，请稍候…`);
                  refetchFullTextMutation.mutate({ ids });
                }}
              >
                {refetchingFullText ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                重抓原文
              </Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={() => navigate("/admin/cases/new")}>
                <Plus className="w-4 h-4" />新增内容
              </Button>
            </div>

            {/* Batch action bar — shown when items are selected */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm font-medium text-primary">已选 {selectedIds.size} 条</span>
                <div className="flex-1" />
                <Button
                  size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                  disabled={batchUpdateStatus.isPending}
                  onClick={() => batchUpdateStatus.mutate({ ids: Array.from(selectedIds), status: "published" })}
                >
                  <Eye className="w-3 h-3" />批量发布
                </Button>
                <Button
                  size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                  disabled={batchUpdateStatus.isPending}
                  onClick={() => batchUpdateStatus.mutate({ ids: Array.from(selectedIds), status: "unpublished" })}
                >
                  <EyeOff className="w-3 h-3" />批量下架
                </Button>
                <Button
                  size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                  disabled={batchUpdateStatus.isPending}
                  onClick={() => batchUpdateStatus.mutate({ ids: Array.from(selectedIds), status: "draft" })}
                >
                  <FileText className="w-3 h-3" />设为草稿
                </Button>
                <Button
                  size="sm" variant="outline" className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setDeleteDialog({ open: true, isBatch: true, title: `${selectedIds.size} 条内容` })}
                >
                  <Trash2 className="w-3 h-3" />批量删除
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                  <X className="w-3 h-3" />取消选择
                </Button>
              </div>
            )}

            {casesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-3 w-10">
                        <Checkbox
                          checked={
                            (casesData?.items?.length ?? 0) > 0 &&
                            (casesData?.items ?? []).every((c: any) => selectedIds.has(c.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(new Set(casesData?.items?.map((c: any) => c.id) ?? []));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                          aria-label="全选"
                        />
                      </th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">标题</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground w-24">类型</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground w-24 hidden md:table-cell">日期</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground w-24">状态</th>
                      <th className="text-right px-3 py-3 font-medium text-muted-foreground w-16">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {casesData?.items.map((c: any, i: number) => {
                      const isSelected = selectedIds.has(c.id);
                      const statusConfig = {
                        published: { label: "已发布", icon: Eye, cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
                        draft: { label: "草稿", icon: FileText, cls: "bg-muted text-muted-foreground" },
                        unpublished: { label: "已下架", icon: EyeOff, cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
                      }[c.status as string] ?? { label: c.status, icon: FileText, cls: "bg-muted text-muted-foreground" };
                      const StatusIcon = statusConfig.icon;
                      return (
                        <tr key={c.id} className={cn("border-t border-border hover:bg-muted/30 transition-colors", isSelected ? "bg-primary/5" : i % 2 !== 0 ? "bg-muted/10" : "")}>
                          <td className="px-3 py-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(c.id); else next.delete(c.id);
                                  return next;
                                });
                              }}
                              aria-label={`选择 ${c.title}`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium line-clamp-1">{c.title}</div>
                            {c.titleEn && <div className="text-xs text-muted-foreground line-clamp-1 italic">{c.titleEn}</div>}
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="secondary" className={cn("text-xs", TYPE_BADGE_CLASS[c.type])}>
                              {TYPE_LABELS[c.type]?.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">{c.date}</td>
                          <td className="px-3 py-3">
                            <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full", statusConfig.cls)}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="w-7 h-7">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => navigate(`/admin/cases/${c.id}/edit`)}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" />编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {c.status !== "published" && (
                                    <DropdownMenuItem onClick={() => updateStatus.mutate({ id: c.id, status: "published" })}>
                                      <Eye className="w-3.5 h-3.5 mr-2" />发布
                                    </DropdownMenuItem>
                                  )}
                                  {c.status !== "unpublished" && (
                                    <DropdownMenuItem onClick={() => updateStatus.mutate({ id: c.id, status: "unpublished" })}>
                                      <EyeOff className="w-3.5 h-3.5 mr-2" />下架
                                    </DropdownMenuItem>
                                  )}
                                  {c.status !== "draft" && (
                                    <DropdownMenuItem onClick={() => updateStatus.mutate({ id: c.id, status: "draft" })}>
                                      <FileText className="w-3.5 h-3.5 mr-2" />设为草稿
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setDeleteDialog({ open: true, id: c.id, title: c.title })}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />删除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {casesData?.items.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">暂无数据</div>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">第 {page} / {totalPages} 页</span>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">共 {platforms?.length ?? 0} 个平台</p>
              <Button size="sm" className="gap-1.5" onClick={() => navigate("/admin/platforms/new")}>
                <Plus className="w-4 h-4" />
                新增平台
              </Button>
            </div>
            {platformsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">平台</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">母公司</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">总部</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platforms?.map((p: any, i: number) => (
                      <tr key={p.id} className={cn("border-t border-border hover:bg-muted/30 transition-colors", i % 2 === 0 ? "" : "bg-muted/10")}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: p.color ?? "var(--primary)" }}
                            >
                              {p.abbr ?? p.name[0]}
                            </div>
                            <span className="font-medium">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.company}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.hq}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7"
                              onClick={() => navigate(`/admin/platforms/${p.id}/edit`)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7"
                              asChild
                            >
                              <Link href={`/platforms/${p.id}`}>
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Topics & Jurisdictions Tab */}
          <TabsContent value="taxonomy">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Topics */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />研究专题</h3>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setTopicDialog({ open: true })}>
                    <Plus className="w-3.5 h-3.5" />新增
                  </Button>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">名称</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-16">颜色</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topics?.map((t: any, i: number) => (
                        <tr key={t.id} className={cn("border-t border-border hover:bg-muted/30", i % 2 ? "bg-muted/10" : "")}>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-sm">{t.label}</div>
                            <div className="text-xs text-muted-foreground">{t.id}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            {t.color && <div className="w-5 h-5 rounded-full border" style={{ background: t.color }} />}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setTopicDialog({ open: true, editing: t })}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:text-destructive" onClick={() => deleteTopic.mutate({ id: t.id })}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Jurisdictions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />司法辖区</h3>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setJurisDialog({ open: true })}>
                    <Plus className="w-3.5 h-3.5" />新增
                  </Button>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">名称</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-16">旗帜</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jurisdictions?.map((j: any, i: number) => (
                        <tr key={j.id} className={cn("border-t border-border hover:bg-muted/30", i % 2 ? "bg-muted/10" : "")}>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-sm">{j.label}</div>
                            <div className="text-xs text-muted-foreground">{j.id}</div>
                          </td>
                          <td className="px-3 py-2.5 text-lg">{j.flag}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setJurisDialog({ open: true, editing: j })}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:text-destructive" onClick={() => deleteJuris.mutate({ id: j.id })}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>

          {/* Site Info Tab */}
          <TabsContent value="siteinfo">
            <SiteSettingsTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Topic Dialog */}
      <Dialog open={topicDialog.open} onOpenChange={(o) => setTopicDialog({ open: o })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{topicDialog.editing ? "编辑专题" : "新增专题"}</DialogTitle></DialogHeader>
          <SimpleTagForm
            initial={topicDialog.editing}
            fields={["id", "label", "labelEn", "color"]}
            tagType="topic"
            onSave={(d) => topicDialog.editing ? updateTopic.mutate(d) : createTopic.mutate(d)}
            onCancel={() => setTopicDialog({ open: false })}
            saving={createTopic.isPending || updateTopic.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Jurisdiction Dialog */}
      <Dialog open={jurisDialog.open} onOpenChange={(o) => setJurisDialog({ open: o })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{jurisDialog.editing ? "编辑辖区" : "新增辖区"}</DialogTitle></DialogHeader>
          <SimpleTagForm
            initial={jurisDialog.editing}
            fields={["id", "label", "labelEn", "flag"]}
            tagType="jurisdiction"
            onSave={(d) => jurisDialog.editing ? updateJuris.mutate(d) : createJuris.mutate(d)}
            onCancel={() => setJurisDialog({ open: false })}
            saving={createJuris.isPending || updateJuris.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog({ open: o })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteDialog.isBatch ? "确认批量删除" : "确认删除"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.isBatch
                ? `确定要删除所选的 ${deleteDialog.title}吗？删除后相关附件也将一并删除，此操作不可撤销。`
                : `确定要删除内容「${deleteDialog.title}」吗？此操作不可撤销。`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteDialog.isBatch) {
                  batchDelete.mutate({ ids: Array.from(selectedIds) });
                } else if (deleteDialog.id) {
                  deleteCase.mutate({ id: deleteDialog.id });
                }
              }}
            >
              {(deleteCase.isPending || batchDelete.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
