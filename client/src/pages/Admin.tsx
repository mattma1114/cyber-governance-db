import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
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
  Database, LayoutGrid, ChevronLeft, ChevronRight, LogIn, AlertTriangle
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
    aiAnalysis: initial?.aiAnalysis ?? "",
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

// ── Main Admin Page ────────────────────────────────────────────────────────────
export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const [tab, setTab] = useState("cases");
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [inputVal, setInputVal] = useState("");

  // Case dialog
  const [caseDialog, setCaseDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: number; title?: string }>({ open: false });

  const { data: topics } = trpc.topics.list.useQuery();
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: stats } = trpc.cases.stats.useQuery();

  const { data: casesData, isLoading: casesLoading } = trpc.cases.listAdmin.useQuery({
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
  });

  const { data: platforms, isLoading: platformsLoading } = trpc.platforms.list.useQuery({});

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
      <div className="border-b border-border bg-muted/30">
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
                onClick={() => setCaseDialog({ open: true })}
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
                              onClick={() => setCaseDialog({ open: true, editing: c })}
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
              <Button size="sm" className="gap-1.5" onClick={() => toast.info("平台编辑功能即将上线")}>
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
                              onClick={() => toast.info("平台编辑功能即将上线")}
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
        </Tabs>
      </div>

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

      {/* Delete Confirm Dialog */}
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
    </div>
  );
}
