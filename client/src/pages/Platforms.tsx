import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, ArrowRight, Building2, MapPin, Calendar } from "lucide-react";
import { truncate } from "@/lib/utils";

export default function Platforms() {
  const [keyword, setKeyword] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: platforms, isLoading } = trpc.platforms.list.useQuery({ keyword: keyword || undefined });
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();

  const handleSearch = () => {
    setKeyword(inputVal);
  };

  const clearFilters = () => {
    setKeyword("");
    setInputVal("");
    setJurisdictionFilter("all");
    setTypeFilter("all");
  };

  const filtered = platforms?.filter((p) => {
    const jurisArr: string[] = Array.isArray(p.jurisdiction)
      ? p.jurisdiction
      : (p.jurisdiction ? JSON.parse(p.jurisdiction as string) : []);
    if (jurisdictionFilter !== "all" && !jurisArr.includes(jurisdictionFilter)) return false;
    if (typeFilter !== "all") {
      const portrait: any = p.portrait
        ? (typeof p.portrait === "string" ? JSON.parse(p.portrait) : p.portrait)
        : null;
      const types: string[] = portrait?.types ?? [];
      if (!types.includes(typeFilter)) return false;
    }
    return true;
  }) ?? [];

  // Collect all unique platform types from data
  const allTypes = Array.from(new Set(
    platforms?.flatMap((p) => {
      const portrait: any = p.portrait
        ? (typeof p.portrait === "string" ? JSON.parse(p.portrait) : p.portrait)
        : null;
      return portrait?.types ?? [];
    }) ?? []
  )) as string[];

  const hasFilters = keyword || jurisdictionFilter !== "all" || typeFilter !== "all";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="container py-8">
          <h1 className="text-2xl font-bold mb-1">平台画像库</h1>
          <p className="text-muted-foreground text-sm">
            全球典型互联网平台结构画像，涵盖商业模式、治理规则与监管动态
          </p>
        </div>
      </div>

      <div className="container py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="搜索平台名称…"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} size="sm">搜索</Button>
          </div>

          <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="司法辖区" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部辖区</SelectItem>
              {jurisdictions?.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.flag} {j.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="平台类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {allTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
              清除筛选
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {isLoading ? "加载中…" : `共 ${filtered.length} 个平台`}
        </p>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>未找到符合条件的平台</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => {
              const jurisArr: string[] = Array.isArray(p.jurisdiction)
                ? p.jurisdiction
                : (p.jurisdiction ? JSON.parse(p.jurisdiction as string) : []);
              const jurisLabels = jurisArr
                .map((id) => jurisdictions?.find((j) => j.id === id))
                .filter(Boolean);
              const portrait: any = p.portrait
                ? (typeof p.portrait === "string" ? JSON.parse(p.portrait) : p.portrait)
                : null;
              const types: string[] = portrait?.types ?? [];

              return (
                <Link key={p.id} href={`/platforms/${p.id}`}>
                  <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group overflow-hidden">
                    {/* Color accent bar */}
                    <div
                      className="h-1.5 w-full"
                      style={{ background: p.color ?? "var(--primary)" }}
                    />
                    <CardContent className="p-5 flex flex-col gap-3 h-full">
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0"
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

                      {/* Meta */}
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

                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
                        {truncate(p.description ?? "", 120)}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        {types.slice(0, 3).map((t) => (
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
        )}
      </div>
    </div>
  );
}
