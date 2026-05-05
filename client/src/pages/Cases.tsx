import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Drawer } from "vaul";
import { Search as SearchIcon, X, ChevronLeft, ChevronRight, Eye, Filter, RotateCcw, LayoutGrid, List, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Download, Loader2, CheckSquare, Square, CheckCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS, truncate } from "@/lib/utils";

const PAGE_SIZE = 12;

const CASE_TYPES = [
  { value: "judicial", label: "司法内容" },
  { value: "regulatory", label: "监管执法" },
  { value: "legislation", label: "立法政策" },
];

export default function Cases() {
  const search = useSearch();
  const params = new URLSearchParams(search);

  const [keyword, setKeyword] = useState(params.get("q") ?? "");
  const [inputVal, setInputVal] = useState(keyword);
  // multi-select: arrays of selected values
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    params.get("type") ? [params.get("type")!] : []
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    params.get("topic") ? [params.get("topic")!] : []
  );
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>(
    params.get("jurisdiction") ? [params.get("jurisdiction")!] : []
  );
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "views">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Batch select state ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map((c) => c.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const { data: topics } = trpc.topics.list.useQuery();
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();
  const { data: statsRaw } = trpc.cases.stats.useQuery();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = statsRaw as any;

  // For multi-select, we send the first selected value to the backend
  // (backend supports single filter; multi-select handled client-side for UX)
  const { data, isLoading } = trpc.cases.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    type: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
    topicId: selectedTopics.length === 1 ? selectedTopics[0] : undefined,
    jurisdictionId: selectedJurisdictions.length === 1 ? selectedJurisdictions[0] : undefined,
    sortBy,
    sortDir,
  });

  // Toggle sort: same column → flip direction; different column → set new column with desc
  const handleSort = (col: "date" | "views") => {
    if (sortBy === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: "date" | "views" }) => {
    if (sortBy !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />;
  };

  // Client-side multi-filter when multiple values selected
  const filteredItems = data?.items.filter((c) => {
    if (selectedTypes.length > 1 && !selectedTypes.includes(c.type)) return false;
    if (selectedTopics.length > 1 && !selectedTopics.includes(c.topicId ?? "")) return false;
    if (selectedJurisdictions.length > 1 && !selectedJurisdictions.includes(c.jurisdictionId ?? "")) return false;
    return true;
  }) ?? data?.items ?? [];

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const exportBatch = trpc.cases.exportBatchPdf.useMutation({
    onSuccess: (data) => {
      const bytes = Uint8Array.from(atob(data.base64), (ch) => ch.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // toast is imported via sonner in CaseDetail; import it here too
      import("sonner").then(({ toast }) => toast.success(`已生成 ${selectedIds.size} 份 PDF，正在下载 ZIP`));
      setSelectMode(false);
      setSelectedIds(new Set());
    },
    onError: (err) => {
      import("sonner").then(({ toast }) => toast.error(`批量导出失败：${err.message}`));
    },
  });

  const handleSearch = () => {
    setKeyword(inputVal);
    setPage(1);
  };

  const clearFilters = () => {
    setKeyword("");
    setInputVal("");
    setSelectedTypes([]);
    setSelectedTopics([]);
    setSelectedJurisdictions([]);
    setPage(1);
  };

  const toggleType = (v: string) => {
    setSelectedTypes((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
    setPage(1);
  };

  const toggleTopic = (v: string) => {
    setSelectedTopics((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
    setPage(1);
  };

  const toggleJurisdiction = (v: string) => {
    setSelectedJurisdictions((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
    setPage(1);
  };

  const hasFilters =
    keyword ||
    selectedTypes.length > 0 ||
    selectedTopics.length > 0 ||
    selectedJurisdictions.length > 0;

  const activeTagCount =
    selectedTypes.length + selectedTopics.length + selectedJurisdictions.length;

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        <div className="flex gap-6 items-start">
          {/* ── Left sidebar filters ── */}
          <aside className={cn(
            "hidden md:flex flex-col gap-5 shrink-0 transition-all duration-200 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto",
            sidebarOpen ? "w-52" : "w-8"
          )}>            {/* Collapse toggle button */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex items-center justify-center w-7 h-7 rounded-md border border-border hover:bg-muted transition-colors self-end shrink-0 mt-0.5"
              title={sidebarOpen ? "折叠筛选栏" : "展开筛选栏"}
            >
              {sidebarOpen
                ? <PanelLeftClose className="w-3.5 h-3.5 text-muted-foreground" />
                : <PanelLeftOpen className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>

            {/* Sidebar content — hidden when collapsed */}
            {sidebarOpen && (<>
            {/* Page title */}
            <div className="pb-1">
              <h1 className="text-xl font-bold mb-0.5">内容数据库</h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                司法内容、监管执法与立法政策
              </p>
            </div>
            <Separator />
            {/* Search */}
            <div>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="搜索内容…"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="gap-1.5 text-muted-foreground w-full justify-start text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                清除全部筛选
                {activeTagCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
                    {activeTagCount}
                  </Badge>
                )}
              </Button>
            )}

            {/* Active filter tags - shown below clear button */}
            {hasFilters && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedTypes.map((v) => (
                  <Badge key={v} variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => toggleType(v)}>
                    {CASE_TYPES.find((t) => t.value === v)?.label}
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
                {selectedTopics.map((v) => (
                  <Badge key={v} variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => toggleTopic(v)}>
                    {topics?.find((t) => t.id === v)?.label}
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
                {selectedJurisdictions.map((v) => (
                  <Badge key={v} variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => toggleJurisdiction(v)}>
                    {jurisdictions?.find((j) => j.id === v)?.flag}{" "}
                    {jurisdictions?.find((j) => j.id === v)?.label}
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
                {keyword && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => { setKeyword(""); setInputVal(""); }}>
                    "{keyword}"
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                )}
              </div>
            )}

            <Separator />

            {/* Case Type */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">内容类型</span>
              </div>
              <div className="flex flex-col gap-1">
                {CASE_TYPES.map((t) => {
                  const active = selectedTypes.includes(t.value);
                  const count = stats ? (stats[t.value] ?? 0) as number : null;
                  return (
                    <button
                      key={t.value}
                      onClick={() => toggleType(t.value)}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors text-left w-full",
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <span>{t.label}</span>
                      <span className={cn(
                        "text-xs tabular-nums shrink-0",
                        active ? "opacity-80" : "text-muted-foreground"
                      )}>
                        {active ? <X className="w-3 h-3 opacity-70" /> : count !== null ? count : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Topics */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">研究专题</span>
              </div>
              <div className="flex flex-col gap-1">
                {topics?.map((t) => {
                  const active = selectedTopics.includes(t.id);
                  const count: number = stats?.byTopic?.find((r: any) => r.topicId === t.id)?.count ?? 0;
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTopic(t.id)}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors text-left w-full",
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <span className="line-clamp-1 flex-1">{t.label}</span>
                      <span className={cn(
                        "text-xs tabular-nums shrink-0 ml-1",
                        active ? "opacity-80" : "text-muted-foreground"
                      )}>
                        {active ? <X className="w-3 h-3 opacity-70" /> : count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Jurisdictions */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">司法辖区</span>
              </div>
              <div className="flex flex-col gap-1">
                {jurisdictions?.map((j) => {
                  const active = selectedJurisdictions.includes(j.id);
                  const count: number = stats?.byJurisdiction?.find((r: any) => r.jurisdictionId === j.id)?.count ?? 0;
                  return (
                    <button
                      key={j.id}
                      onClick={() => toggleJurisdiction(j.id)}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors text-left w-full",
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span>{j.flag}</span>
                        <span className="line-clamp-1">{j.label}</span>
                      </span>
                      <span className={cn(
                        "text-xs tabular-nums shrink-0 ml-1",
                        active ? "opacity-80" : "text-muted-foreground"
                      )}>
                        {active ? <X className="w-3 h-3 opacity-70" /> : count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            </>)}
          </aside>

          {/* ── Right: results ── */}
          <div className="flex-1 min-w-0">
            {/* Mobile filter drawer trigger */}
            <div className="flex md:hidden items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "加载中…" : `共 ${data?.total ?? 0} 条结果`}
              </p>
              <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
                <Drawer.Trigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-sm">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    筛选
                    {activeTagCount > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{activeTagCount}</Badge>
                    )}
                  </Button>
                </Drawer.Trigger>
                <Drawer.Portal>
                  <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
                  <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[85vh] flex flex-col">
                    <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mt-3 mb-2 shrink-0" />
                    <div className="px-4 pb-2 flex items-center justify-between shrink-0">
                      <h2 className="text-base font-semibold">筛选条件</h2>
                      <div className="flex items-center gap-2">
                        {hasFilters && (
                          <Button variant="ghost" size="sm" onClick={() => { clearFilters(); setDrawerOpen(false); }} className="text-xs gap-1 text-muted-foreground">
                            <RotateCcw className="w-3 h-3" />清除
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setDrawerOpen(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-y-auto px-4 pb-8 flex flex-col gap-5">
                      {/* Search */}
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input className="pl-8 h-9 text-sm" placeholder="搜索内容…" value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { handleSearch(); setDrawerOpen(false); } }} />
                      </div>
                      <Separator />
                      {/* Case Type */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">内容类型</p>
                        <div className="flex flex-wrap gap-2">
                          {CASE_TYPES.map((t) => {
                            const active = selectedTypes.includes(t.value);
                            const count = stats ? (stats[t.value] ?? 0) as number : null;
                            return (
                              <button key={t.value} onClick={() => toggleType(t.value)}
                                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors",
                                  active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                                {t.label}
                                {count !== null && <span className="text-xs opacity-70">{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <Separator />
                      {/* Topics */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">研究专题</p>
                        <div className="flex flex-wrap gap-2">
                          {topics?.map((t) => {
                            const active = selectedTopics.includes(t.id);
                            const count: number = stats?.byTopic?.find((r: any) => r.topicId === t.id)?.count ?? 0;
                            return (
                              <button key={t.id} onClick={() => toggleTopic(t.id)}
                                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors",
                                  active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                                {t.label}
                                <span className="text-xs opacity-70">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <Separator />
                      {/* Jurisdictions */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">司法辖区</p>
                        <div className="flex flex-wrap gap-2">
                          {jurisdictions?.map((j) => {
                            const active = selectedJurisdictions.includes(j.id);
                            const count: number = stats?.byJurisdiction?.find((r: any) => r.jurisdictionId === j.id)?.count ?? 0;
                            return (
                              <button key={j.id} onClick={() => toggleJurisdiction(j.id)}
                                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors",
                                  active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                                <span>{j.flag}</span>{j.label}
                                <span className="text-xs opacity-70">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <Button className="w-full mt-2" onClick={() => setDrawerOpen(false)}>应用筛选</Button>
                    </div>
                  </Drawer.Content>
                </Drawer.Portal>
              </Drawer.Root>
            </div>
            {/* Result count + view toggle */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "加载中…" : `共 ${data?.total ?? 0} 条结果`}
                </p>
                {selectMode && (
                  <span className="text-xs text-primary font-medium">
                    已选 {selectedIds.size} 条
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Batch select toggle */}
                <Button
                  variant={selectMode ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 text-xs h-7 px-2.5"
                  onClick={toggleSelectMode}
                >
                  {selectMode ? (
                    <><X className="w-3 h-3" />取消选择</>
                  ) : (
                    <><CheckSquare className="w-3 h-3" />批量选择</>
                  )}
                </Button>
                {/* Sort selector for grid view */}
                {viewMode === "grid" && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpDown className="w-3 h-3" />
                    <button
                      className={cn("px-1.5 py-0.5 rounded hover:bg-muted transition-colors", sortBy === "date" && "text-foreground font-medium")}
                      onClick={() => handleSort("date")}
                    >
                      日期{sortBy === "date" && (sortDir === "desc" ? "↓" : "↑")}
                    </button>
                    <span className="opacity-30">|</span>
                    <button
                      className={cn("px-1.5 py-0.5 rounded hover:bg-muted transition-colors", sortBy === "views" && "text-foreground font-medium")}
                      onClick={() => handleSort("views")}
                    >
                      热度{sortBy === "views" && (sortDir === "desc" ? "↓" : "↑")}
                    </button>
                  </div>
                )}
              {/* View toggle */}
              <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="分块视图"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="列表视图"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
              </div>
            </div>

            {/* Mobile search bar */}
            <div className="flex gap-2 mb-4 md:hidden">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="搜索内容…"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} size="sm">搜索</Button>
            </div>

            {/* Grid / List */}
            {isLoading ? (
              <div className={viewMode === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-3" : "flex flex-col gap-2"}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className={viewMode === "grid" ? "h-52 rounded-xl" : "h-24 rounded-lg"} />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <SearchIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>未找到符合条件的内容</p>
                <Button variant="link" onClick={clearFilters}>清除筛选条件</Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredItems.map((c) => {
                  const topic = topics?.find((t) => t.id === c.topicId);
                  const juris = jurisdictions?.find((j) => j.id === c.jurisdictionId);
                  const isSelected = selectedIds.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className="relative"
                      onClick={selectMode ? () => toggleSelectId(c.id) : undefined}
                    >
                      {selectMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectId(c.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-background shadow"
                          />
                        </div>
                      )}
                      {selectMode ? (
                        <Card className={cn(
                          "h-full transition-all cursor-pointer group",
                          isSelected
                            ? "border-primary shadow-md ring-2 ring-primary/30"
                            : "hover:shadow-md hover:border-primary/30"
                        )}>
                          <CardContent className="p-4 flex flex-col gap-2 h-full pl-8">
                            <div className="flex items-start justify-between gap-2">
                              <Badge variant="secondary" className={cn("text-xs shrink-0", TYPE_BADGE_CLASS[c.type])}>
                                {TYPE_LABELS[c.type]?.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground shrink-0">{c.date}</span>
                            </div>
                          <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {c.title}
                          </h3>
                          {c.titleEn && (
                            <p className="text-xs text-muted-foreground italic line-clamp-1">{c.titleEn}</p>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-5 flex-1">
                            {truncate(c.abstract || c.aiSummary || "", 280)}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {juris && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span>{juris.flag}</span>
                                  {juris.label}
                                </span>
                              )}
                              {topic && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  {topic.label}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {c.views ?? 0}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      ) : (
                        <Link href={`/cases/${c.id}`}>
                          <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                            <CardContent className="p-4 flex flex-col gap-2 h-full">
                              <div className="flex items-start justify-between gap-2">
                                <Badge variant="secondary" className={cn("text-xs shrink-0", TYPE_BADGE_CLASS[c.type])}>
                                  {TYPE_LABELS[c.type]?.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground shrink-0">{c.date}</span>
                              </div>
                              <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                {c.title}
                              </h3>
                              {c.titleEn && (
                                <p className="text-xs text-muted-foreground italic line-clamp-1">{c.titleEn}</p>
                              )}
                              <p className="text-xs text-muted-foreground line-clamp-5 flex-1">
                                {truncate(c.abstract || c.aiSummary || "", 280)}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {juris && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <span>{juris.flag}</span>
                                      {juris.label}
                                    </span>
                                  )}
                                  {topic && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      {topic.label}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {c.views ?? 0}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border border border-border rounded-lg overflow-hidden">
                {/* Sort header */}
                <div className="px-4 py-2 bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground select-none">
                  <span className="flex-1">标题 / 摘要</span>
                  <button
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded hover:bg-muted transition-colors",
                      sortBy === "date" && "text-foreground font-medium"
                    )}
                    onClick={() => handleSort("date")}
                  >
                    日期 <SortIcon col="date" />
                  </button>
                  <button
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded hover:bg-muted transition-colors",
                      sortBy === "views" && "text-foreground font-medium"
                    )}
                    onClick={() => handleSort("views")}
                  >
                    浏览量 <SortIcon col="views" />
                  </button>
                </div>
                {filteredItems.map((c) => {
                  const topic = topics?.find((t) => t.id === c.topicId);
                  const juris = jurisdictions?.find((j) => j.id === c.jurisdictionId);
                  const isSelected = selectedIds.has(c.id);
                  const rowContent = (
                    <div className={cn(
                      "px-4 py-3 transition-colors cursor-pointer group",
                      selectMode && isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    )}>
                      <div className="flex items-start gap-3">
                        {selectMode && (
                          <div className="pt-0.5 shrink-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectId(c.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className={cn("text-xs shrink-0", TYPE_BADGE_CLASS[c.type])}>
                              {TYPE_LABELS[c.type]?.label}
                            </Badge>
                            {juris && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <span>{juris.flag}</span>{juris.label}
                              </span>
                            )}
                            {topic && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {topic.label}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">{c.date}</span>
                          </div>
                          <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-1">
                            {c.title}
                          </h3>
                          {c.titleEn && (
                            <p className="text-xs text-muted-foreground italic line-clamp-1">{c.titleEn}</p>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {truncate(c.abstract || c.aiSummary || "", 300)}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 mt-1">
                          <Eye className="w-3 h-3" />
                          {c.views ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                  return selectMode ? (
                    <div key={c.id} onClick={() => toggleSelectId(c.id)}>
                      {rowContent}
                    </div>
                  ) : (
                    <Link key={c.id} href={`/cases/${c.id}`}>
                      {rowContent}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Batch export floating toolbar ── */}
      {selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border border-border rounded-2xl shadow-2xl px-5 py-3">
          <span className="text-sm font-medium">
            {selectedIds.size > 0 ? `已选 ${selectedIds.size} 条` : "点击内容进行勾选"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={selectAll}
              disabled={selectedIds.size === filteredItems.length}
            >
              <CheckCheck className="w-3 h-3" />全选
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
            >
              <Square className="w-3 h-3" />取消全选
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs h-7"
              disabled={selectedIds.size === 0 || exportBatch.isPending}
              onClick={() => exportBatch.mutate({ ids: Array.from(selectedIds) })}
            >
              {exportBatch.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin" />生成中…</>
              ) : (
                <><Download className="w-3 h-3" />导出 {selectedIds.size > 0 ? selectedIds.size : ""} 份 PDF</>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-7 text-muted-foreground"
              onClick={toggleSelectMode}
            >
              <X className="w-3 h-3" />退出
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
