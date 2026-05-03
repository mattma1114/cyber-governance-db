import { useState } from "react";
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
  Tag, Globe, X, Settings, Key, CheckCircle2, AlertCircle, Save
} from "lucide-react";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS } from "@/lib/utils";

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
    fullText: (initial as any)?.fullText ?? "",
    tags: Array.isArray(initial?.tags)
      ? initial.tags.join(", ")
      : (initial?.tags ? JSON.parse(initial.tags).join(", ") : ""),
    published: initial ? initial.status === 'published' : true,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("标题不能为空"); return; }
    if (!form.type) { toast.error("请选择案例类型"); return; }
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
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="案例标题" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>英文标题</Label>
          <Input value={form.titleEn} onChange={(e) => set("titleEn", e.target.value)} placeholder="English Title" />
        </div>
        <div className="space-y-1.5">
          <Label>案例类型 *</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="judicial">司法案例</SelectItem>
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
          <Label>案例摘要</Label>
          <Textarea value={form.abstract} onChange={(e) => set("abstract", e.target.value)} rows={3} placeholder="案例摘要" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>AI 摘要</Label>
          <Textarea value={form.aiSummary} onChange={(e) => set("aiSummary", e.target.value)} rows={3} placeholder="AI 摘要解读" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>原文全文</Label>
          <Textarea value={form.fullText} onChange={(e) => set("fullText", e.target.value)} rows={4} placeholder="粘贴案例原始文件全文（可选）" />
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
function SimpleTagForm({ initial, fields, onSave, onCancel, saving }: {
  initial?: any; fields: string[];
  onSave: (d: any) => void; onCancel: () => void; saving: boolean;
}) {
  const LABELS: Record<string, string> = { id: "ID（唯一标识）", label: "中文名称", labelEn: "英文名称", color: "颜色（HEX）", flag: "旗帜 Emoji", desc: "描述" };
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f, initial?.[f] ?? ""]))
  );
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f} className="space-y-1.5">
          <Label>{LABELS[f] ?? f}</Label>
          <Input value={form[f]} onChange={(e) => set(f, e.target.value)} disabled={f === "id" && !!initial} />
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

function PlatformForm({ initial, onSave, onCancel, saving, jurisdictions, allCases }: {
  initial?: any; onSave: (d: any) => void; onCancel: () => void; saving: boolean;
  jurisdictions?: Array<{ id: string; label: string; flag?: string | null }>;
  allCases?: Array<{ id: number; title: string; type?: string | null; date?: string | null }>;
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
  // Normalize rules to new versioned format
  const normalizeAdminRules = (raw: any[]): Array<{
    id: string; title: string; type: string;
    versions: Array<{ versionId: string; versionLabel: string; date: string; url: string; content: string }>;
  }> => raw.map((r, idx) => {
    if (r.versions && Array.isArray(r.versions)) return r;
    return {
      id: r.id ?? `rule-${idx}`,
      title: r.title ?? "",
      type: r.type ?? "",
      versions: [{ versionId: `v-${idx}-0`, versionLabel: "初始版本", date: r.date ?? "", url: r.url ?? "", content: r.content ?? "" }],
    };
  });
  const initRules = normalizeAdminRules(
    initial?.rules ? (typeof initial.rules === "string" ? JSON.parse(initial.rules) : initial.rules) : []
  );

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
  const [rules, setRules] = useState<Array<{
    id: string; title: string; type: string;
    versions: Array<{ versionId: string; versionLabel: string; date: string; url: string; content: string }>;
  }>>(initRules);
  const [expandedRuleIdx, setExpandedRuleIdx] = useState<number | null>(null);
  const [formTab, setFormTab] = useState("basic");
  const initRelatedCaseIds: number[] = initial?.relatedCaseIds
    ? (typeof initial.relatedCaseIds === "string" ? JSON.parse(initial.relatedCaseIds) : initial.relatedCaseIds)
    : [];
  const [relatedCaseIds, setRelatedCaseIds] = useState<number[]>(initRelatedCaseIds);
  const [caseSearch, setCaseSearch] = useState("");

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
    relatedCaseIds,
  });

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-1">
      <Tabs value={formTab} onValueChange={setFormTab}>
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="basic" className="flex-1">基本信息</TabsTrigger>
          <TabsTrigger value="portrait" className="flex-1">结构画像</TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1">时间线</TabsTrigger>
          <TabsTrigger value="rules" className="flex-1">规则文件</TabsTrigger>
          <TabsTrigger value="related" className="flex-1">关联案例</TabsTrigger>
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
            <p className="text-xs text-muted-foreground">平台规则文件列表（每条规则可添加多个版本）</p>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => {
              const newIdx = rules.length;
              setRules((p) => [...p, { id: `rule-${Date.now()}`, title: "", type: "", versions: [{ versionId: `v-${Date.now()}-0`, versionLabel: "初始版本", date: "", url: "", content: "" }] }]);
              setExpandedRuleIdx(newIdx);
            }}>
              <Plus className="w-3.5 h-3.5" />新增规则
            </Button>
          </div>
          {rules.map((rule, i) => (
            <div key={rule.id ?? i} className="border border-border/50 rounded-lg overflow-hidden">
              {/* Rule header */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30">
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
                <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 text-destructive" onClick={() => setRules((p) => p.filter((_, j) => j !== i))}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {/* Rule body (expanded) */}
              {expandedRuleIdx === i && (
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">规则名称</Label>
                      <Input
                        value={rule.title}
                        onChange={(e) => setRules((p) => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                        placeholder="如：用户服务协议"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">规则类型</Label>
                      <Input
                        value={rule.type}
                        onChange={(e) => setRules((p) => p.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                        placeholder="如：隐私政策"
                      />
                    </div>
                  </div>
                  {/* Versions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">版本历史</Label>
                      <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 px-2" onClick={() =>
                        setRules((p) => p.map((x, j) => j === i ? {
                          ...x,
                          versions: [...(x.versions ?? []), { versionId: `v-${Date.now()}`, versionLabel: "", date: "", url: "", content: "" }]
                        } : x))
                      }>
                        <Plus className="w-3 h-3" />添加版本
                      </Button>
                    </div>
                    {rule.versions?.map((ver, vi) => (
                      <div key={ver.versionId ?? vi} className="border border-border/30 rounded-md p-2.5 space-y-2">
                        <div className="flex gap-2 items-center">
                          <Input
                            className="w-28 shrink-0 h-7 text-xs"
                            value={ver.versionLabel}
                            onChange={(e) => setRules((p) => p.map((x, j) => j === i ? {
                              ...x,
                              versions: x.versions.map((v, k) => k === vi ? { ...v, versionLabel: e.target.value } : v)
                            } : x))}
                            placeholder="版本号（如 v2.0）"
                          />
                          <Input
                            className="w-28 shrink-0 h-7 text-xs"
                            value={ver.date}
                            onChange={(e) => setRules((p) => p.map((x, j) => j === i ? {
                              ...x,
                              versions: x.versions.map((v, k) => k === vi ? { ...v, date: e.target.value } : v)
                            } : x))}
                            placeholder="2024-01-01"
                          />
                          <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 text-destructive ml-auto" onClick={() =>
                            setRules((p) => p.map((x, j) => j === i ? {
                              ...x,
                              versions: x.versions.filter((_, k) => k !== vi)
                            } : x))
                          }>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <Input
                          className="h-7 text-xs"
                          value={ver.url}
                          onChange={(e) => setRules((p) => p.map((x, j) => j === i ? {
                            ...x,
                            versions: x.versions.map((v, k) => k === vi ? { ...v, url: e.target.value } : v)
                          } : x))}
                          placeholder="原文链接 https://..."
                        />
                        <Textarea
                          className="text-xs min-h-[60px]"
                          value={ver.content}
                          onChange={(e) => setRules((p) => p.map((x, j) => j === i ? {
                            ...x,
                            versions: x.versions.map((v, k) => k === vi ? { ...v, content: e.target.value } : v)
                          } : x))}
                          placeholder="规则全文（可选，留空则前端显示跳转原文链接）"
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="related" className="space-y-3">
          <p className="text-xs text-muted-foreground">选择与该平台直接相关的案例，将在平台详情页「关联案例」标签下展示。</p>
          <Input
            placeholder="搜索案例名称…"
            value={caseSearch}
            onChange={(e) => setCaseSearch(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
            {(allCases ?? []).filter((c) =>
              !caseSearch || c.title.toLowerCase().includes(caseSearch.toLowerCase())
            ).map((c) => (
              <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={relatedCaseIds.includes(c.id)}
                  onChange={(e) => setRelatedCaseIds((p) =>
                    e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)
                  )}
                  className="rounded"
                />
                <span className="text-sm flex-1 truncate">{c.title}</span>
                {c.date && <span className="text-xs text-muted-foreground shrink-0">{c.date}</span>}
              </label>
            ))}
            {(allCases ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">暂无案例数据</p>
            )}
          </div>
          {relatedCaseIds.length > 0 && (
            <p className="text-xs text-primary">已选择 {relatedCaseIds.length} 个关联案例</p>
          )}
        </TabsContent>
      </Tabs>

<div className="pt-3 mt-3">
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

// ── Main Admin Page ────────────────────────────────────────────────────────────
export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const [tab, setTab] = useState("cases");
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [inputVal, setInputVal] = useState("");

  // Case dialog
  const [, navigate] = useLocation();
  const [caseDialog, setCaseDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: number; title?: string }>({ open: false });
  // Platform dialog
  const [platformDialog, setPlatformDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [platformDeleteDialog, setPlatformDeleteDialog] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });
  // API Settings
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  // Topic/Jurisdiction dialog
  const [topicDialog, setTopicDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [jurisDialog, setJurisDialog] = useState<{ open: boolean; editing?: any }>({ open: false });

  const { data: topics } = trpc.topics.list.useQuery();
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: stats } = trpc.cases.stats.useQuery();

  // Fetch all cases (unpaginated) for platform related-cases selector
  const { data: allCasesForPlatform } = trpc.cases.listAdmin.useQuery({ page: 1, pageSize: 500, keyword: "" });

  const { data: casesData, isLoading: casesLoading } = trpc.cases.listAdmin.useQuery({
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
  });

  const { data: platformsData, isLoading: platformsLoading } = trpc.platforms.listAdmin.useQuery();
  const platforms = platformsData;

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
  const createPlatform = trpc.platforms.create.useMutation({
    onSuccess: () => { toast.success("平台已创建"); utils.platforms.list.invalidate(); setPlatformDialog({ open: false }); },
    onError: (e: any) => toast.error(e.message),
  });
  const updatePlatform = trpc.platforms.update.useMutation({
    onSuccess: () => { toast.success("平台已更新"); utils.platforms.list.invalidate(); utils.platforms.listAdmin.invalidate(); setPlatformDialog({ open: false }); },
    onError: (e: any) => toast.error(e.message),
  });
  const deletePlatform = trpc.platforms.delete.useMutation({
    onSuccess: () => { toast.success("平台已删除"); utils.platforms.list.invalidate(); utils.platforms.listAdmin.invalidate(); setPlatformDeleteDialog({ open: false }); },
    onError: (e: any) => toast.error(e.message),
  });
  const togglePlatformActive = trpc.platforms.update.useMutation({
    onSuccess: () => { utils.platforms.list.invalidate(); utils.platforms.listAdmin.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: apiSettingsList, refetch: refetchSettings } = trpc.settings.list.useQuery();
  const setApiSetting = trpc.settings.set.useMutation({
    onSuccess: () => { toast.success("配置已保存"); refetchSettings(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteApiSetting = trpc.settings.delete.useMutation({
    onSuccess: () => { toast.success("配置已清除"); refetchSettings(); },
    onError: (e: any) => toast.error(e.message),
  });

  const API_CONFIG_ITEMS = [
    {
      key: "firecrawl_api_key",
      label: "Firecrawl API Key",
      description: "用于 AI 自动从 URL 抓取案例内容。在 firecrawl.dev 获取（免费套餐 500 次/月）。",
      placeholder: "fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      docsUrl: "https://firecrawl.dev",
    },
    {
      key: "openai_api_key",
      label: "AI 写作 API Key (OpenAI 兼容)",
      description: "用于案例内容的 AI 总结、AI 写作辅助功能。支持 OpenAI、DeepSeek、其他兼容接口。",
      placeholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      docsUrl: "https://platform.openai.com/api-keys",
    },
    {
      key: "openai_base_url",
      label: "AI API Base URL（可选）",
      description: "自定义 AI API 地址，用于接入 DeepSeek、山岳等国产模型。留空则使用内置模型。",
      placeholder: "https://api.deepseek.com/v1",
      docsUrl: "",
    },
  ];

  const createCase = trpc.cases.create.useMutation({
    onSuccess: () => {
      toast.success("案例已创建");
      utils.cases.listAdmin.invalidate();
      utils.cases.stats.invalidate();
      setCaseDialog({ open: false });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateCase = trpc.cases.update.useMutation({
    onSuccess: () => {
      toast.success("案例已更新");
      utils.cases.listAdmin.invalidate();
      setCaseDialog({ open: false });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCase = trpc.cases.delete.useMutation({
    onSuccess: () => {
      toast.success("案例已删除");
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

  const handleSaveCase = (data: any) => {
    if (caseDialog.editing) {
      updateCase.mutate({ id: caseDialog.editing.id, ...data });
    } else {
      createCase.mutate(data);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white">
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
            {[
              { label: "平台总数", value: platforms?.length ?? 0 },
              { label: "案例总数", value: stats?.total ?? 0 },
              { label: "司法案例", value: stats?.judicial ?? 0 },
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
              案例管理
            </TabsTrigger>
            <TabsTrigger value="platforms" className="gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              平台管理
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              专题/辖区
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              API 配置
            </TabsTrigger>
          </TabsList>

          {/* Cases Tab */}
          <TabsContent value="cases">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="搜索案例…"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { setKeyword(inputVal); setPage(1); } }}
                />
              </div>
              <Button size="sm" onClick={() => { setKeyword(inputVal); setPage(1); }}>搜索</Button>
              <div className="flex-1" />
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => navigate("/admin/cases/new")}
              >
                <Plus className="w-4 h-4" />
                新增案例
              </Button>
            </div>

            {casesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">标题</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">类型</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24 hidden md:table-cell">日期</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">状态</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {casesData?.items.map((c: any, i: number) => (
                      <tr key={c.id} className={cn("border-t border-border hover:bg-muted/30 transition-colors", i % 2 === 0 ? "" : "bg-muted/10")}>
                        <td className="px-4 py-3">
                          <div className="font-medium line-clamp-1">{c.title}</div>
                          {c.titleEn && <div className="text-xs text-muted-foreground line-clamp-1 italic">{c.titleEn}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={cn("text-xs", TYPE_BADGE_CLASS[c.type])}>
                            {TYPE_LABELS[c.type]?.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.date}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => togglePublish.mutate({ id: c.id, published: !c.published })}
                            className={cn(
                              "flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors",
                              c.published
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {c.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {c.published ? "已发布" : "草稿"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7"
                              onClick={() => navigate(`/admin/cases/${c.id}/edit`)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteDialog({ open: true, id: c.id, title: c.title })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">状态</th>
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
                          <button
                            onClick={() => togglePlatformActive.mutate({ id: p.id, isActive: !p.isActive })}
                            className={cn(
                              "flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors",
                              p.isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {p.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {p.isActive ? "已激活" : "未激活"}
                          </button>
                        </td>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-destructive hover:text-destructive"
                              onClick={() => setPlatformDeleteDialog({ open: true, id: p.id, name: p.name })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* API Config Tab */}
          <TabsContent value="api">
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-1">第三方 API 配置</h3>
                <p className="text-xs text-muted-foreground mb-4">配置后可在案例录入页面中使用 AI 自动填充、AI 总结和 AI 写作功能。API Key 加密存储，仅显示是否已配置。</p>
                <div className="space-y-4">
                  {API_CONFIG_ITEMS.map((item) => {
                    const existing = apiSettingsList?.find((s: any) => s.key === item.key);
                    const inputVal = apiKeyInputs[item.key] ?? "";
                    return (
                      <div key={item.key} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Key className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-medium text-sm">{item.label}</span>
                              {existing?.hasValue ? (
                                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                  <CheckCircle2 className="w-3 h-3" /> 已配置
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                  <AlertCircle className="w-3 h-3" /> 未配置
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            {item.docsUrl && (
                              <a href={item.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-0.5 inline-block">
                                获取 API Key ↗
                              </a>
                            )}
                          </div>
                          {existing?.hasValue && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive shrink-0 h-7 text-xs"
                              onClick={() => deleteApiSetting.mutate({ key: item.key })}
                            >
                              <X className="w-3 h-3 mr-1" />清除
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder={existing?.hasValue ? "已配置（输入新内容可更新）" : item.placeholder}
                            value={inputVal}
                            onChange={(e) => setApiKeyInputs((prev) => ({ ...prev, [item.key]: e.target.value }))}
                            className="flex-1 font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            disabled={!inputVal.trim() || setApiSetting.isPending}
                            onClick={() => {
                              setApiSetting.mutate({ key: item.key, value: inputVal.trim(), label: item.label });
                              setApiKeyInputs((prev) => ({ ...prev, [item.key]: "" }));
                            }}
                          >
                            <Save className="w-3.5 h-3.5 mr-1" />保存
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
            onSave={(d) => jurisDialog.editing ? updateJuris.mutate(d) : createJuris.mutate(d)}
            onCancel={() => setJurisDialog({ open: false })}
            saving={createJuris.isPending || updateJuris.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Platform Edit Dialog */}
      <Dialog open={platformDialog.open} onOpenChange={(o) => setPlatformDialog({ open: o })}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{platformDialog.editing ? "编辑平台" : "新增平台"}</DialogTitle></DialogHeader>
          <PlatformForm
            initial={platformDialog.editing}
            jurisdictions={jurisdictions ?? []}
            allCases={(allCasesForPlatform?.items ?? []).map((c: any) => ({ id: c.id, title: c.title, type: c.type, date: c.date }))}
            onSave={(d) => platformDialog.editing ? updatePlatform.mutate(d) : createPlatform.mutate(d)}
            onCancel={() => setPlatformDialog({ open: false })}
            saving={createPlatform.isPending || updatePlatform.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Case Create/Edit Dialog */}
      <Dialog open={caseDialog.open} onOpenChange={(o) => setCaseDialog({ open: o })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{caseDialog.editing ? "编辑案例" : "新增案例"}</DialogTitle>
          </DialogHeader>
          <CaseForm
            initial={caseDialog.editing}
            topics={topics ?? []}
            jurisdictions={jurisdictions ?? []}
            onSave={handleSaveCase}
            onCancel={() => setCaseDialog({ open: false })}
            saving={createCase.isPending || updateCase.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Case Confirm Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog({ open: o })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除案例「{deleteDialog.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDialog.id && deleteCase.mutate({ id: deleteDialog.id })}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Platform Confirm Dialog */}
      <AlertDialog open={platformDeleteDialog.open} onOpenChange={(o) => setPlatformDeleteDialog({ open: o })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除平台</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除平台「{platformDeleteDialog.name}」吗？删除后该平台的所有数据将不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => platformDeleteDialog.id && deletePlatform.mutate({ id: platformDeleteDialog.id })}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
