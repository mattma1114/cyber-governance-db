import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Search, X, ChevronLeft, ChevronRight, Eye, Filter, RotateCcw, LayoutGrid, List } from "lucide-react";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS, truncate } from "@/lib/utils";

const PAGE_SIZE = 12;

const CASE_TYPES = [
  { value: "judicial", label: "司法案例" },
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: topics } = trpc.topics.list.useQuery();
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();

  // For multi-select, we send the first selected value to the backend
  // (backend supports single filter; multi-select handled client-side for UX)
  const { data, isLoading } = trpc.cases.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    type: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
    topicId: selectedTopics.length === 1 ? selectedTopics[0] : undefined,
    jurisdictionId: selectedJurisdictions.length === 1 ? selectedJurisdictions[0] : undefined,
  });

  // Client-side multi-filter when multiple values selected
  const filteredItems = data?.items.filter((c) => {
    if (selectedTypes.length > 1 && !selectedTypes.includes(c.type)) return false;
    if (selectedTopics.length > 1 && !selectedTopics.includes(c.topicId ?? "")) return false;
    if (selectedJurisdictions.length > 1 && !selectedJurisdictions.includes(c.jurisdictionId ?? "")) return false;
    return true;
  }) ?? data?.items ?? [];

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

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
      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="container py-8">
          <h1 className="text-2xl font-bold mb-1">案例数据库</h1>
          <p className="text-muted-foreground text-sm">
            收录全球互联网平台治理领域司法案例、监管执法与立法政策
          </p>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex gap-6">
          {/* ── Left sidebar filters ── */}
          <aside className="hidden md:flex flex-col gap-5 w-52 shrink-0">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="搜索案例…"
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

            <Separator />

            {/* Case Type */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">案例类型</span>
              </div>
              <div className="flex flex-col gap-1">
                {CASE_TYPES.map((t) => {
                  const active = selectedTypes.includes(t.value);
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
                      {active && <X className="w-3 h-3 opacity-70" />}
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
                      <span className="line-clamp-1">{t.label}</span>
                      {active && <X className="w-3 h-3 opacity-70 shrink-0" />}
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
                      <span className="flex items-center gap-1.5">
                        <span>{j.flag}</span>
                        <span className="line-clamp-1">{j.label}</span>
                      </span>
                      {active && <X className="w-3 h-3 opacity-70 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ── Right: results ── */}
          <div className="flex-1 min-w-0">
            {/* Active filter tags + count */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "加载中…" : `共 ${data?.total ?? 0} 条结果`}
                </p>
                {selectedTypes.map((v) => (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="gap-1 cursor-pointer text-xs"
                    onClick={() => toggleType(v)}
                  >
                    {CASE_TYPES.find((t) => t.value === v)?.label}
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
                {selectedTopics.map((v) => (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="gap-1 cursor-pointer text-xs"
                    onClick={() => toggleTopic(v)}
                  >
                    {topics?.find((t) => t.id === v)?.label}
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
                {selectedJurisdictions.map((v) => (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="gap-1 cursor-pointer text-xs"
                    onClick={() => toggleJurisdiction(v)}
                  >
                    {jurisdictions?.find((j) => j.id === v)?.flag}{" "}
                    {jurisdictions?.find((j) => j.id === v)?.label}
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
                {keyword && (
                  <Badge
                    variant="secondary"
                    className="gap-1 cursor-pointer text-xs"
                    onClick={() => { setKeyword(""); setInputVal(""); }}
                  >
                    "{keyword}"
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                )}
              </div>
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

            {/* Mobile search bar */}
            <div className="flex gap-2 mb-4 md:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="搜索案例…"
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
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>未找到符合条件的案例</p>
                <Button variant="link" onClick={clearFilters}>清除筛选条件</Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredItems.map((c) => {
                  const topic = topics?.find((t) => t.id === c.topicId);
                  const juris = jurisdictions?.find((j) => j.id === c.jurisdictionId);
                  return (
                    <Link key={c.id} href={`/cases/${c.id}`}>
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
                  );
                })}
              </div>
            ) : (
              /* List view */
              <div className="flex flex-col divide-y divide-border border border-border rounded-lg overflow-hidden">
                {filteredItems.map((c) => {
                  const topic = topics?.find((t) => t.id === c.topicId);
                  const juris = jurisdictions?.find((j) => j.id === c.jurisdictionId);
                  return (
                    <Link key={c.id} href={`/cases/${c.id}`}>
                      <div className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group">
                        <div className="flex items-start gap-3">
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
    </div>
  );
}
