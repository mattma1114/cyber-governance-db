import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, ChevronLeft, ChevronRight, Eye, ExternalLink } from "lucide-react";
import { cn, TYPE_BADGE_CLASS, TYPE_LABELS, truncate } from "@/lib/utils";

const PAGE_SIZE = 12;

export default function Cases() {
  const search = useSearch();
  const params = new URLSearchParams(search);

  const [keyword, setKeyword] = useState(params.get("q") ?? "");
  const [type, setType] = useState(params.get("type") ?? "all");
  const [topicId, setTopicId] = useState(params.get("topic") ?? "all");
  const [jurisdictionId, setJurisdictionId] = useState(params.get("jurisdiction") ?? "all");
  const [page, setPage] = useState(1);
  const [inputVal, setInputVal] = useState(keyword);

  const { data: topics } = trpc.topics.list.useQuery();
  const { data: jurisdictions } = trpc.jurisdictions.list.useQuery();

  const { data, isLoading } = trpc.cases.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    keyword: keyword || undefined,
    type: type !== "all" ? type : undefined,
    topicId: topicId !== "all" ? topicId : undefined,
    jurisdictionId: jurisdictionId !== "all" ? jurisdictionId : undefined,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const handleSearch = () => {
    setKeyword(inputVal);
    setPage(1);
  };

  const clearFilters = () => {
    setKeyword("");
    setInputVal("");
    setType("all");
    setTopicId("all");
    setJurisdictionId("all");
    setPage(1);
  };

  const hasFilters = keyword || type !== "all" || topicId !== "all" || jurisdictionId !== "all";

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
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="flex gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="搜索案例标题、摘要…"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} size="sm">搜索</Button>
          </div>

          {/* Type */}
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="案例类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="judicial">司法案例</SelectItem>
              <SelectItem value="regulatory">监管执法</SelectItem>
              <SelectItem value="legislation">立法政策</SelectItem>
            </SelectContent>
          </Select>

          {/* Topic */}
          <Select value={topicId} onValueChange={(v) => { setTopicId(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="研究专题" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部专题</SelectItem>
              {topics?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Jurisdiction */}
          <Select value={jurisdictionId} onValueChange={(v) => { setJurisdictionId(v); setPage(1); }}>
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

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
              清除筛选
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "加载中…" : `共 ${data?.total ?? 0} 条结果`}
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>未找到符合条件的案例</p>
            <Button variant="link" onClick={clearFilters}>清除筛选条件</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.items.map((c) => {
              const topic = topics?.find((t) => t.id === c.topicId);
              const juris = jurisdictions?.find((j) => j.id === c.jurisdictionId);
              return (
                <Link key={c.id} href={`/cases/${c.id}`}>
                  <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                    <CardContent className="p-5 flex flex-col gap-3 h-full">
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
                      <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
                        {truncate(c.abstract || c.aiSummary || "", 130)}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
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
  );
}
