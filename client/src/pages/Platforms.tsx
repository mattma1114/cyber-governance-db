import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Filter, Building2, MapPin, Calendar, LayoutGrid, List, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { truncate, cn } from "@/lib/utils";

export default function Platforms() {
  const [keyword, setKeyword] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: platforms, isLoading } = trpc.platforms.list.useQuery({ keyword: keyword || undefined });
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();

  const handleSearch = () => {
    setKeyword(inputVal);
  };

  const clearFilters = () => {
    setKeyword("");
    setInputVal("");
    setSelectedJurisdictions([]);
    setSelectedTypes([]);
  };

  // Parse jurisdiction and portrait for each platform
  const parsedPlatforms = useMemo(() => {
    return (platforms ?? []).map((p) => {
      const jurisArr: string[] = Array.isArray(p.jurisdiction)
        ? p.jurisdiction
        : (p.jurisdiction ? JSON.parse(p.jurisdiction as string) : []);
      const portrait: any = p.portrait
        ? (typeof p.portrait === "string" ? JSON.parse(p.portrait) : p.portrait)
        : null;
      const types: string[] = portrait?.types ?? [];
      return { ...p, jurisArr, types };
    });
  }, [platforms]);

  // Collect all unique platform types from data
  const allTypes = useMemo(() =>
    Array.from(new Set(parsedPlatforms.flatMap((p) => p.types))) as string[],
    [parsedPlatforms]
  );

  // Client-side filtering
  const filtered = useMemo(() => {
    return parsedPlatforms.filter((p) => {
      if (selectedJurisdictions.length > 0 && !selectedJurisdictions.some((j) => p.jurisArr.includes(j))) return false;
      if (selectedTypes.length > 0 && !selectedTypes.some((t) => p.types.includes(t))) return false;
      return true;
    });
  }, [parsedPlatforms, selectedJurisdictions, selectedTypes]);

  // Count per jurisdiction (from all platforms, not filtered)
  const jurisdictionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    parsedPlatforms.forEach((p) => {
      p.jurisArr.forEach((j) => {
        map[j] = (map[j] ?? 0) + 1;
      });
    });
    return map;
  }, [parsedPlatforms]);

  // Count per type (from all platforms, not filtered)
  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    parsedPlatforms.forEach((p) => {
      p.types.forEach((t) => {
        map[t] = (map[t] ?? 0) + 1;
      });
    });
    return map;
  }, [parsedPlatforms]);

  const toggleJurisdiction = (v: string) => {
    setSelectedJurisdictions((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const toggleType = (v: string) => {
    setSelectedTypes((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const hasFilters = keyword || selectedJurisdictions.length > 0 || selectedTypes.length > 0;

  const activeFilterCount = selectedJurisdictions.length + selectedTypes.length + (keyword ? 1 : 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white">
        <div className="container py-8">
          <h1 className="text-2xl font-bold mb-1">平台画像库</h1>
          <p className="text-muted-foreground text-sm">
            全球典型互联网平台结构画像，涵盖商业模式、治理规则与监管动态
          </p>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex gap-6 items-start">
          {/* ── Left: Sidebar Filters ── */}
          <aside className={cn(
            "shrink-0 flex flex-col gap-4 transition-all duration-200 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto",
            sidebarOpen ? "w-56" : "w-8"
          )}>
            {/* Collapse toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex items-center justify-center w-7 h-7 rounded-md border border-border hover:bg-muted transition-colors self-end shrink-0 mt-0.5"
              title={sidebarOpen ? "折叠筛选栏" : "展开筛选栏"}
            >
              {sidebarOpen
                ? <PanelLeftClose className="w-3.5 h-3.5 text-muted-foreground" />
                : <PanelLeftOpen className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            {sidebarOpen && (<>
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="搜索平台…"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} size="sm" className="h-8 px-2.5">
                <Search className="w-3.5 h-3.5" />
              </Button>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 gap-1.5 text-xs text-muted-foreground justify-start px-2"
              >
                <X className="w-3 h-3" />
                清除全部筛选 {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
            )}



            {/* Platform Type */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">平台类型</span>
              </div>
              <div className="flex flex-col gap-1">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 rounded-md" />
                  ))
                ) : allTypes.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-1.5">暂无类型数据</p>
                ) : (
                  allTypes.map((t) => {
                    const active = selectedTypes.includes(t);
                    const count = typeCounts[t] ?? 0;
                    return (
                      <button
                        key={t}
                        onClick={() => toggleType(t)}
                        className={cn(
                          "flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors text-left w-full",
                          active
                            ? "bg-primary text-primary-foreground font-medium"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <span className="line-clamp-1 flex-1">{t}</span>
                        <span className={cn(
                          "text-xs tabular-nums shrink-0 ml-1",
                          active ? "opacity-80" : "text-muted-foreground"
                        )}>
                          {active ? <X className="w-3 h-3 opacity-70" /> : count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>



            {/* Jurisdictions */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">司法辖区</span>
              </div>
              <div className="flex flex-col gap-1">
                {jurisdictions?.map((j) => {
                  const active = selectedJurisdictions.includes(j.id);
                  const count = jurisdictionCounts[j.id] ?? 0;
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

          {/* ── Right: Results ── */}
          <div className="flex-1 min-w-0">
            {/* Result header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {isLoading ? "加载中…" : `共 ${filtered.length} 个平台`}
                </span>
                {/* Active filter badges */}
                {selectedTypes.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="text-xs gap-1 cursor-pointer hover:bg-destructive/10"
                    onClick={() => toggleType(t)}
                  >
                    {t}
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
                {selectedJurisdictions.map((jId) => {
                  const j = jurisdictions?.find((x) => x.id === jId);
                  return j ? (
                    <Badge
                      key={jId}
                      variant="secondary"
                      className="text-xs gap-1 cursor-pointer hover:bg-destructive/10"
                      onClick={() => toggleJurisdiction(jId)}
                    >
                      {j.flag} {j.label}
                      <X className="w-2.5 h-2.5" />
                    </Badge>
                  ) : null;
                })}
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  )}
                  title="分块视图"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  )}
                  title="列表视图"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className={viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className={viewMode === "grid" ? "h-56 rounded-xl" : "h-16 rounded-lg"} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>未找到符合条件的平台</p>
                {hasFilters && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                    清除筛选条件
                  </Button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View */
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => {
                  const jurisLabels = p.jurisArr
                    .map((id) => jurisdictions?.find((j) => j.id === id))
                    .filter(Boolean);
                  return (
                    <Link key={p.id} href={`/platforms/${p.id}`}>
                      <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group overflow-hidden">
                        <div
                          className="h-1.5 w-full"
                          style={{ background: p.color ?? "var(--primary)" }}
                        />
                        <CardContent className="p-4 flex flex-col gap-3 h-full">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0"
                              style={{ background: p.color ?? "var(--primary)" }}
                            >
                              {p.abbr ?? p.name[0]}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                {p.name}
                              </h3>
                              {p.company && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{p.company}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {p.hq && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {p.hq}
                              </span>
                            )}
                            {p.founded && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {p.founded}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-4 flex-1">
                            {truncate(p.description ?? "", 180)}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-auto">
                            {p.types.slice(0, 3).map((t) => (
                              <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">
                                {t}
                              </Badge>
                            ))}
                            {jurisLabels.slice(0, 3).map((j) => j && (
                              <Badge key={j.id} variant="outline" className="text-xs px-1.5 py-0">
                                {j.flag} {j.label}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <div className="flex flex-col divide-y divide-border border border-border rounded-lg overflow-hidden">
                {filtered.map((p) => {
                  const jurisLabels = p.jurisArr
                    .map((id) => jurisdictions?.find((j) => j.id === id))
                    .filter(Boolean);
                  return (
                    <Link key={p.id} href={`/platforms/${p.id}`}>
                      <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group">
                        {/* Color dot + avatar */}
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ background: p.color ?? "var(--primary)" }}
                        >
                          {p.abbr ?? p.name[0]}
                        </div>

                        {/* Name + company */}
                        <div className="w-40 shrink-0">
                          <p className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                            {p.name}
                          </p>
                          {p.company && (
                            <p className="text-xs text-muted-foreground truncate">{p.company}</p>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 min-w-0">
                          {truncate(p.description ?? "", 200)}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 shrink-0 max-w-[160px] justify-end">
                          {p.types.slice(0, 2).map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">
                              {t}
                            </Badge>
                          ))}
                          {jurisLabels.slice(0, 2).map((j) => j && (
                            <Badge key={j.id} variant="outline" className="text-xs px-1.5 py-0">
                              {j.flag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
