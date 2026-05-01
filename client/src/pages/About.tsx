import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Database, Globe, Scale, BookOpen, Users, Mail, Building2,
  ArrowRight, Gavel, FileText, LayoutGrid
} from "lucide-react";

const COVERAGE = [
  { flag: "🇨🇳", label: "中国", desc: "网信办、工信部、市场监管总局监管执法及司法判决" },
  { flag: "🇪🇺", label: "欧盟", desc: "GDPR、DSA、DMA 等立法及欧盟法院、数据保护机构裁决" },
  { flag: "🇺🇸", label: "美国", desc: "FTC、DOJ 反垄断执法、联邦法院判决及国会立法动态" },
  { flag: "🌏", label: "东南亚", desc: "新加坡、印尼、泰国、越南等国数字平台监管政策" },
];

const TOPICS = [
  { icon: <Scale className="w-5 h-5" />, label: "数据隐私与保护", desc: "个人数据收集、处理、跨境传输及用户权利保护" },
  { icon: <Gavel className="w-5 h-5" />, label: "人工智能治理", desc: "AI 系统监管框架、算法透明度与责任分配机制" },
  { icon: <Database className="w-5 h-5" />, label: "反垄断与竞争", desc: "平台市场支配地位滥用、并购审查与互操作性要求" },
  { icon: <FileText className="w-5 h-5" />, label: "内容治理", desc: "违法内容移除、平台责任豁免与言论自由边界" },
];

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="container py-12">
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <Building2 className="w-3 h-3" />
            浙江传媒学院
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">关于本数据库</h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            互联网平台治理数据库是由浙江传媒学院主办的学术研究型数据库，
            致力于系统收录、整理和分析全球互联网平台治理领域的法律实践与政策动态。
          </p>
        </div>
      </div>

      <div className="container py-10 space-y-12 max-w-4xl">
        {/* Mission */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            数据库定位
          </h2>
          <div className="prose prose-sm max-w-none text-foreground/90 space-y-3">
            <p className="leading-relaxed">
              本数据库聚焦互联网平台治理这一新兴交叉领域，系统收录司法案例、监管执法决定与立法政策文件三大类型，
              为学术研究者、法律实务工作者及政策制定者提供权威、结构化的参考资源。
            </p>
            <p className="leading-relaxed">
              数据库采用结构化摘要与 AI 辅助分析相结合的方式，对每一条目进行多维度标注，
              包括案例类型、司法辖区、研究专题、关键标签等，支持精准检索与比较研究。
            </p>
          </div>
        </section>

        <Separator />

        {/* Coverage */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            覆盖范围
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {COVERAGE.map((c) => (
              <Card key={c.label}>
                <CardContent className="p-5 flex items-start gap-4">
                  <span className="text-3xl shrink-0">{c.flag}</span>
                  <div>
                    <h3 className="font-semibold mb-1">{c.label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* Topics */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            核心研究专题
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TOPICS.map((t) => (
              <div key={t.label} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {t.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{t.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Host */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            主办单位
          </h2>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">浙江传媒学院</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    浙江传媒学院是一所以传媒为特色、多学科协调发展的高等院校，
                    在数字媒体法律、互联网平台治理等交叉领域具有深厚的学术积累。
                    本数据库由学院相关研究团队负责建设与维护。
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    浙江省杭州市
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Contact */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            联系我们
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            如需提交数据更正建议、学术合作或其他事宜，欢迎通过以下方式联系数据库管理团队。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2" asChild>
              <a href="mailto:cyberdb@zjicm.edu.cn">
                <Mail className="w-4 h-4" />
                cyberdb@zjicm.edu.cn
              </a>
            </Button>
            <Button asChild variant="default" className="gap-2">
              <Link href="/cases">
                <Database className="w-4 h-4" />
                浏览数据库
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8 mt-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>互联网平台治理数据库</span>
            <span className="text-border">|</span>
            <span>浙江传媒学院</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/cases" className="hover:text-foreground transition-colors">案例数据库</Link>
            <Link href="/platforms" className="hover:text-foreground transition-colors">平台画像库</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Missing import fix
function MapPin({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
