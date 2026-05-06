import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw, Search, X, Filter, Building2, MapPin, Calendar, LayoutGrid, List, PanelLeftClose, PanelLeftOpen, SlidersHorizontal } from "lucide-react";
import { truncate, cn } from "@/lib/utils";
import { Drawer } from "vaul";

export default function Platforms() {
  const [keyword, setKeyword] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: platforms, isLoading } = trpc.platforms.list.useQuery({ keyword: keyword || undefined });
  const { data: siteSettingsData } = trpc.siteSettings.getPublic.useQuery();
  const getSetting = (key: string, fallback = "") =>
    siteSettingsData?.find((s: { key: string; value: string }) => s.key === key)?.value ?? fallback;
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();

  const handleSearch = () => setKeyword(inputVal);

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

  const allTypes = useMemo(() =>
    Array.from(new Set(parsedPlatforms.flatMap((p) => p.types))) as string[],
    [parsedPlatforms]
  );

  const filtered = useMemo(() => {
    return parsedPlatforms.filter((p) => {
      if (selectedJurisdictions.length > 0 && !selectedJurisdictions.some((j) => p.jurisArr.includes(j))) return false;
      if (selectedTypes.length > 0 && !selectedTypes.some((t) => p.types.includes(t))) return false;
      return true;
    });
  }, [parsedPlatforms, selectedJurisdictions, selectedTypes]);

  const jurisdictionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    parsedPlatforms.forEach((p) => {
      p.jurisArr.forEach((j) => { map[j] = (map[j] ?? 0) + 1; });
    });
    return map;
  }, [parsedPlatforms]);

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    parsedPlatforms.forEach((p) => {
      p.types.forEach((t) => { map[t] = (map[t] ?? 0) + 1; });
    });
    return map;
  }, [parsedPlatforms]);

  const toggleJurisdiction = (v: string) =>
    setSelectedJurisdictions((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const toggleType = (v: string) =>
    setSelectedTypes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const hasFilters = keyword || selectedJurisdictions.length > 0 || selectedTypes.length > 0;
  const activeFilterCount = selectedJurisdictions.length + selectedTypes.length + (keyword ? 1 : 0);

  // ── Shared filter panel content (used in both sidebar and drawer) ──
  const FilterContent = ({ onApply }: { onApply?: () => void }) => (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            className="h-8 text-sm"
            placeholder="搜索平台…"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { handleSearch(); onApply?.(); } }}
          />
        </div>
        <Button onClick={() => { handleSearch(); onApply?.(); }} size="sm" className="h-8 px-2.5">
          <Search className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Platform Type */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">平台类型</span>
        </div>
        <div className="flex flex-col gap-1">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-md" />)
          ) : allTypes.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-1.5">暂无类型数据</p>
          ) : (
            allTypes.map((t) => {
              const active = selectedTypes.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors text-left w-full",
                    active ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground"
                  )}
                >
                  <span className="line-clamp-1 flex-1">{t}</span>
                  <span className={cn("text-xs tabular-nums shrink-0 ml-1", active ? "opacity-80" : "text-muted-foreground")}>
                    {active ? <X className="w-3 h-3 opacity-70" /> : typeCounts[t] ?? 0}
                  </span>
                </button>
              );
            })
          )}
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
                  active ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground"
                )}
              >
                <span className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span>{j.flag}</span>
                  <span className="line-clamp-1">{j.label}</span>
                </span>
                <span className={cn("text-xs tabular-nums shrink-0 ml-1", active ? "opacity-80" : "text-muted-foreground")}>
                  {active ? <X className="w-3 h-3 opacity-70" /> : jurisdictionCounts[j.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {onApply && (
        <Button className="w-full mt-2" onClick={onApply}>应用筛选</Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        {/* ── Mobile: page header + filter drawer trigger ── */}
        <div className="flex md:hidden items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold leading-tight">{getSetting("platforms.page_title", "平台画像库")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{getSetting("platforms.page_description", "全球典型互联网平台结构画像")}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle (mobile) */}
            <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-1.5 rounded transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 rounded transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Filter drawer trigger */}
            <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
              <Drawer.Trigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 relative">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  筛选
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[85vh] flex flex-col">
                  <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border shrink-0">
                    <span className="font-semibold text-sm">筛选平台</span>
                    <div className="flex items-center gap-2">
                      {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={() => { clearFilters(); setDrawerOpen(false); }} className="text-xs gap-1 text-muted-foreground">
                          <RotateCcw className="w-3 h-3" />
                          清除
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setDrawerOpen(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-y-auto px-4 pb-8 pt-4">
                    <FilterContent onApply={() => setDrawerOpen(false)} />
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* ── Left: Sidebar Filters (desktop only) ── */}
          <aside className={cn(
            "hidden md:flex shrink-0 flex-col gap-4 transition-all duration-200 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto",
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
            {sidebarOpen && (
              <>
                <div className="pb-1">
                  <h1 className="text-xl font-bold mb-0.5">{getSetting("platforms.page_title", "平台画像库")}</h1>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {getSetting("platforms.page_description", "全球典型互联网平台结构画像，涵盖商业模式、治理规则与监管动态")}
                  </p>
                </div>
                <Separator />
                <FilterContent />
              </>
            )}
          </aside>

          {/* ── Right: Results ── */}
          <div className="flex-1 min-w-0">
            {/* Result header (desktop) */}
            <div className="hidden md:flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                {isLoading ? "加载中…" : `共 ${filtered.length} 个平台`}
              </span>
              <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn("p-1.5 rounded transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
                  title="分块视图"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("p-1.5 rounded transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
                  title="列表视图"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Result count (mobile) */}
            <div className="flex md:hidden items-center mb-3">
              <span className="text-xs text-muted-foreground">
                {isLoading ? "加载中…" : `共 ${filtered.length} 个平台`}
              </span>
            </div>

            {/* Active filter tags */}
            {hasFilters && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-2.5 py-1 hover:bg-muted"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  清除全部筛选
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0 text-xs font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {selectedTypes.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => toggleType(t)}>
                    {t}<X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
                {selectedJurisdictions.map((jId) => {
                  const j = jurisdictions?.find((x) => x.id === jId);
                  return j ? (
                    <Badge key={jId} variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => toggleJurisdiction(jId)}>
                      {j.flag} {j.label}<X className="w-2.5 h-2.5" />
                    </Badge>
                  ) : null;
                })}
                {keyword && (
                  <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => { setKeyword(""); setInputVal(""); }}>
                    "{keyword}"<X className="w-2.5 h-2.5" />
                  </Badge>
                )}
              </div>
            )}

            {isLoading ? (
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className={viewMode === "grid" ? "h-56 rounded-xl" : "h-16 rounded-lg"} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <Building2 className="w-10 h-10 opacity-30" />
                <p className="text-sm">未找到匹配的平台</p>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-xs">
                    <RotateCcw className="w-3 h-3" />
                    清除筛选条件
                  </Button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => {
                  const jurisLabels = p.jurisArr
                    .map((id) => jurisdictions?.find((j) => j.id === id))
                    .filter(Boolean);
                  return (
                    <Link key={p.id} href={`/platforms/${p.id}`}>
                      <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group overflow-hidden">
                        {/* Color bar */}
                        <div className="h-1.5 w-full" style={{ background: p.color ?? "var(--primary)" }} />
                        <CardContent className="p-4 flex flex-col gap-3 h-full">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
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
                                <MapPin className="w-3 h-3" />{p.hq}
                              </span>
                            )}
                            {p.founded && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />{p.founded}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-4 flex-1">
                            {truncate(p.description ?? "", 180)}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-auto">
                            {p.types.slice(0, 3).map((t) => (
                              <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">{t}</Badge>
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
                      <div className="flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors cursor-pointer group">
                        {/* Avatar */}
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ background: p.color ?? "var(--primary)" }}
                        >
                          {p.abbr ?? p.name[0]}
                        </div>
                        {/* Name + company */}
                        <div className="w-28 sm:w-40 shrink-0">
                          <p className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">{p.name}</p>
                          {p.company && (
                            <p className="text-xs text-muted-foreground truncate">{p.company}</p>
                          )}
                        </div>
                        {/* Description — hidden on xs, visible on sm+ */}
                        <p className="hidden sm:block text-xs text-muted-foreground line-clamp-2 flex-1 min-w-0">
                          {truncate(p.description ?? "", 200)}
                        </p>
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 shrink-0 justify-end ml-auto sm:ml-0 sm:max-w-[160px]">
                          {p.types.slice(0, 2).map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0 hidden sm:inline-flex">{t}</Badge>
                          ))}
                          {jurisLabels.slice(0, 2).map((j) => j && (
                            <Badge key={j.id} variant="outline" className="text-xs px-1.5 py-0">{j.flag}</Badge>
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
