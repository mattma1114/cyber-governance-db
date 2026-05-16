import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, GitCommit, Layers, Cpu, Globe, Shield, Sparkles, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChangeItem {
  text: string;
  category: "backend" | "frontend" | "ai" | "fix" | "perf" | "security";
}

interface VersionSection {
  title: string;
  items: ChangeItem[];
}

interface Version {
  id: string;
  label: string;
  subtitle: string;
  period: string;
  color: string;
  sections: VersionSection[];
}

const CATEGORY_LABELS: Record<ChangeItem["category"], string> = {
  backend: "后端",
  frontend: "前端",
  ai: "AI",
  fix: "修复",
  perf: "性能",
  security: "安全",
};

const CATEGORY_COLORS: Record<ChangeItem["category"], string> = {
  backend: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  frontend: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ai: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  fix: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  perf: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  security: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

const VERSIONS: Version[] = [
  {
    id: "v5",
    label: "v5.0",
    subtitle: "AI 智能增强与内容质量提升",
    period: "2026年5月5日 – 2026年5月16日",
    color: "border-l-amber-500",
    sections: [
      {
        title: "AI 翻译与双语对照",
        items: [
          { text: "后端新增 cases.translateFullText 路由，调用 LLM 分段翻译为中文，返回段落对照数组", category: "ai" },
          { text: "前端「一键 AI 翻译」按钮，翻译中显示批次进度条（正在翻译第 X/N 批…）", category: "frontend" },
          { text: "支持「仅原文 / 双语对照 / 仅译文」三档视图切换", category: "frontend" },
          { text: "翻译结果写入 localStorage（含 fullTextLength 校验），刷新页面自动恢复，正文更新后旧缓存自动失效", category: "frontend" },
        ],
      },
      {
        title: "平台规则文件真实爬取",
        items: [
          { text: "extractPlatformByKeyword 路由拆分两步：LLM 填充基本信息后，Firecrawl/Jina 爬取官网提取真实规则 URL", category: "ai" },
          { text: "官网爬取不足 2 条时，自动对 /privacy、/terms 等 8 条常见路径发起 HEAD 探测补充", category: "backend" },
          { text: "前端新建态渲染 AI 预置规则列表，用户可在保存前删除不需要的条目", category: "frontend" },
        ],
      },
      {
        title: "内容录入体验优化",
        items: [
          { text: "CaseEditor.tsx 移除「文本输入/上传 PDF」互斥 Tab，改为两个独立并存区域", category: "frontend" },
          { text: "LLM 语义去重检测增强：先关键词粗筛，再 LLM 精筛并返回相似度得分（0-100）和判断理由", category: "ai" },
          { text: "去重警告横幅升级：显示高/中/低风险标识和 LLM 判断理由", category: "frontend" },
          { text: "去重阈值可配置（API 配置页滑块，默认 60，步长 5）", category: "frontend" },
        ],
      },
      {
        title: "规则文件多版本管理",
        items: [
          { text: "新建 platform_rules 表（支持 parentRuleId 历史版本关联、versionLabel、changeNote）和 rule_attachments 表", category: "backend" },
          { text: "后端 platformRules 路由：list/create/update/delete/addVersion/listVersions/checkNewVersion/batchCheckNewVersion/extractFullText/batchExtract/listAttachments/uploadAttachment/deleteAttachment", category: "backend" },
          { text: "管理后台规则文件 Tab 升级：DB 驱动列表、版本管理弹窗、AI 检测新版本（单条/批量）、批量 AI 提取全文、附件上传", category: "frontend" },
          { text: "前台规则文件 Tab 升级：卡片展示、点击展开版本历史时间轴 + 附件列表", category: "frontend" },
        ],
      },
      {
        title: "原文正文质量修复",
        items: [
          { text: "后端修复 AI 提取/LLM 清洗时的段落保留逻辑（严格保留 \\n\\n 段落分隔符）", category: "fix" },
          { text: "新增导入时段落完整性检查（字符数、段落数校验，不满足条件时返回警告）", category: "backend" },
          { text: "前端 CaseDetail.tsx 修复正文渲染（whitespace-pre-wrap + 逐段渲染）", category: "fix" },
        ],
      },
    ],
  },
  {
    id: "v4",
    label: "v4.0",
    subtitle: "性能优化、批量操作与文件管理",
    period: "2026年5月3日 – 2026年5月4日",
    color: "border-l-green-500",
    sections: [
      {
        title: "全站性能优化",
        items: [
          { text: "数据库关键字段添加复合索引（status/topicId/jurisdictionId/type/date/views）", category: "perf" },
          { text: "server/db.ts 改用 mysql2 createPool（connectionLimit: 10），连接复用后查询从 1156ms 降至 <10ms", category: "perf" },
          { text: "cases.list/listAdmin 使用 db.select({...}) 明确排除 fullText 大字段，减少网络传输", category: "perf" },
          { text: "cases.incrementView 异步化（fire-and-forget），不阻塞响应", category: "perf" },
          { text: "App.tsx 使用 React.lazy + Suspense 对 8 个重型页面实现代码分割", category: "perf" },
        ],
      },
      {
        title: "内容管理批量操作",
        items: [
          { text: "后端新增 cases.batchUpdateStatus（批量发布/下架/草稿）和 cases.batchDelete 路由", category: "backend" },
          { text: "listAdmin 增加 statusFilter 参数（按 published/draft/unpublished 筛选）", category: "backend" },
          { text: "前端：表格全选 Checkbox、单条操作下拉菜单（编辑/发布/下架/设为草稿/删除）", category: "frontend" },
          { text: "前端：选中内容后显示批量操作工具栏（批量发布/下架/删除），批量删除添加确认弹窗", category: "frontend" },
          { text: "状态 badge 区分三种状态（已发布/草稿/已下架），颜色语义化", category: "frontend" },
        ],
      },
      {
        title: "相关文件与附件管理",
        items: [
          { text: "数据库新增 case_attachments 表（id/caseId/filename/fileKey/fileUrl/fileSize/mimeType/createdAt）", category: "backend" },
          { text: "后端：attachments.upload（base64 编码上传 S3，单文件限制 20MB）、listByCaseId、delete 路由", category: "backend" },
          { text: "前端 CaseEditor.tsx：附件管理区域（上传/列表/删除），支持 PDF/Word/Excel/图片等格式", category: "frontend" },
          { text: "前端 CaseDetail.tsx：左侧「相关文件」模块（文件图标/名称/大小/下载链接）", category: "frontend" },
          { text: "创建 FilePreviewModal 组件：PDF 使用 iframe 内嵌预览，图片使用灯箱全屏展示（含缩放/翻页）", category: "frontend" },
        ],
      },
      {
        title: "PDF 功能完善",
        items: [
          { text: "后端：cases.exportPdf 路由，服务端生成包含标题/摘要/AI分析/原文全文的 PDF（base64 返回）", category: "backend" },
          { text: "后端：cases.exportBatchPdf 路由，并行生成多份 PDF（每批 5 个）并用 archiver 打包为 ZIP", category: "backend" },
          { text: "前端：内容列表页批量选择 + 底部浮动工具栏（全选/取消全选/导出 X 份 PDF/退出）", category: "frontend" },
          { text: "cases 表添加 fullTextPdfUrl/fullTextPdfKey 字段，支持 PDF 上传和在线阅读器（iframe 嵌入）", category: "backend" },
          { text: "后端：cases.parsePdfFullText 路由（下载 PDF → 提取文本 → LLM 清洗整理 → 保存 fullText）", category: "ai" },
          { text: "后端：cases.batchParsePdf 路由，批量 AI 解析已上传 PDF 的全文", category: "ai" },
        ],
      },
      {
        title: "原文提取优化",
        items: [
          { text: "安装 @mozilla/readability + jsdom，创建 server/content-extractor.ts（三级策略：Readability→语义标签→清洗 body）", category: "backend" },
          { text: "新增第 4 级兜底策略（直接 fetch + Readability），无需 API Key 也能提取正文", category: "backend" },
          { text: "噪音过滤覆盖 nav/aside/footer/header/广告/侧边栏/弹窗/评论区/社交分享等 50+ 选择器", category: "backend" },
          { text: "将 fullText/abstract/aiAnalysis/aiSummary 字段改为 MEDIUMTEXT（支持最大 16MB）", category: "backend" },
        ],
      },
    ],
  },
  {
    id: "v3",
    label: "v3.0",
    subtitle: "AI 能力深化与管理后台完善",
    period: "2026年5月2日 – 2026年5月2日",
    color: "border-l-blue-500",
    sections: [
      {
        title: "外部 LLM 接入与按功能配置",
        items: [
          { text: "实现 server/llm-router.ts：优先外部 LLM（OpenAI/DeepSeek/Anthropic/Azure OpenAI），降级内置 Manus LLM", category: "ai" },
          { text: "Admin.tsx API 配置页新增外部 LLM 配置区块（服务商/Key/模型/测试）", category: "frontend" },
          { text: "设计数据库 key 约定（LLM_TASK_{TASK}_PROVIDER / MODEL），支持按功能独立配置 LLM 模型", category: "backend" },
          { text: "后端新增 ai.testLlm 路由，验证外部 LLM 连通性", category: "backend" },
        ],
      },
      {
        title: "AI 提取能力升级",
        items: [
          { text: "ai.extractCaseFromUrl：LLM prompt 补充研究专题/司法辖区/来源机构/语言/标签字段提取，从数据库加载真实选项供 LLM 精确匹配", category: "ai" },
          { text: "AI 分析内容加深至 800-1200 字，涵盖法律意义、核心争议、引用条款、合规启示、同类案件对比", category: "ai" },
          { text: "前端 CaseEditor 新增三步骤 AI 加载动画覆盖层（抓取→分析→填充），含进度条和分步状态", category: "frontend" },
          { text: "专题/辖区新增弹窗 AI 自动预填写（id/labelEn/color），debounce 600ms 触发", category: "ai" },
        ],
      },
      {
        title: "管理后台功能完善",
        items: [
          { text: "数据库新增 site_settings 表，新增 siteSettings tRPC 路由（getAll/update）", category: "backend" },
          { text: "Admin.tsx 新增「网站信息」Tab，分模块编辑（首页/关于我们/法律声明/主办机构/底部栏等）", category: "frontend" },
          { text: "前台 Home.tsx/About.tsx/Legal.tsx/Cases.tsx/Platforms.tsx 动态读取 site_settings", category: "frontend" },
          { text: "管理员账号管理：users 表新增 status 字段，新增 admin_invites 邀请码表", category: "backend" },
          { text: "后端：generateInvite/listInvites/revokeInvite/freezeUser/deleteUser tRPC 路由", category: "backend" },
          { text: "前端：邀请码管理区（生成/复制/撤销）、冻结/解冻按钮、/invite/:token 邀请码注册页", category: "frontend" },
          { text: "OAuth 登录时检查用户 status，冻结用户拒绝登录", category: "security" },
        ],
      },
      {
        title: "内容详情页重构",
        items: [
          { text: "重构为左右两栏：左侧（280px 固定 sticky）+ 右侧（自动充展）", category: "frontend" },
          { text: "左侧：基本信息/相关标签/学术引用（默认折叠）/同专题关联；右侧：内容摘要/深度法律分析/原文正文", category: "frontend" },
          { text: "顶部导航栏 sticky：含返回按钮、导出 PDF、查看原文按钮", category: "frontend" },
          { text: "后端：cases.refetchFullText mutation，批量重新抓取 sourceUrl 并更新 fullText", category: "backend" },
        ],
      },
    ],
  },
  {
    id: "v2",
    label: "v2.0",
    subtitle: "平台画像深化与三 API 梯级抓取",
    period: "2026年4月30日 – 2026年5月1日",
    color: "border-l-violet-500",
    sections: [
      {
        title: "三 API 梯级冗余抓取",
        items: [
          { text: "创建 server/scraper.ts：封装 Firecrawl→Jina Reader→ScrapingBee 降级策略", category: "backend" },
          { text: "routers.ts 新增 scraper.scrapeUrl 路由（从 api_settings 读取各 API Key）", category: "backend" },
          { text: "Admin.tsx API 配置 Tab 添加 Jina/ScrapingBee API Key 配置入口，更新降级策略说明", category: "frontend" },
          { text: "后端新增 scraper.testApiKey 路由（分别验证 Firecrawl/Jina/ScrapingBee）", category: "backend" },
          { text: "Admin.tsx 每个 Key 旁添加「测试」按钮，显示验证结果（成功/失败/延迟）", category: "frontend" },
        ],
      },
      {
        title: "平台画像编辑完善",
        items: [
          { text: "platforms 表新增 website/wikipediaUrl/crunchbaseUrl/profileFeatures/developmentHistory 字段并迁移", category: "backend" },
          { text: "PlatformEditor.tsx 支持 AI 关键词自动填充（画像/历程/链接/规则文件）", category: "ai" },
          { text: "平台详情页重构：去除方框版式，改为横线分隔 + 左侧导航栏 + 右侧内容区布局", category: "frontend" },
          { text: "规则文件「一键获取」按钮改造：抓取成功后显示绿色「全文已获取」状态标识 + 字符数统计 + 前 800 字符预览", category: "frontend" },
          { text: "平台详情页 PDF 导出修复：改用新窗口打印方案，彻底绕开 display:none 限制", category: "fix" },
          { text: "PDF 档案加入规则文件模块（按名称分组，列出所有版本）", category: "frontend" },
        ],
      },
      {
        title: "数据库与后端修复",
        items: [
          { text: "修复 api_settings 表结构与 Drizzle schema 不一致导致 getAll 500 错误（缺少 id/createdAt 字段）", category: "fix" },
          { text: "修复 cases.create 路由保存失败：Drizzle MySQL2 insert 返回数组，正确获取 ResultSetHeader.insertId", category: "fix" },
          { text: "规则文件 fullText 持久化验证：platforms.create/update 的 rules 使用 z.any()，fullText 字段可完整传递", category: "fix" },
        ],
      },
      {
        title: "全站文字与样式统一",
        items: [
          { text: "全站「案例」→「内容」文字替换（10 个文件全部替换完成）", category: "frontend" },
          { text: "首页方框改横线风格：CaseCard/辖区区块/专题区块均去掉圆角边框，改为 border-b 横线分隔", category: "frontend" },
          { text: "平台画像库移动端自适应适配（筛选栏折叠、卡片网格响应式）", category: "frontend" },
          { text: "字体风格/信息密度 CSS 修复，衬线体/无衬线体切换差异明显", category: "fix" },
        ],
      },
    ],
  },
  {
    id: "v1",
    label: "v1.0",
    subtitle: "核心数据库与基础功能搭建",
    period: "2026年4月30日",
    color: "border-l-slate-500",
    sections: [
      {
        title: "数据库与后端基础",
        items: [
          { text: "设计并创建数据库 Schema（cases/platforms/topics/jurisdictions）", category: "backend" },
          { text: "编写种子数据脚本（15 条案例 + 多个平台画像）", category: "backend" },
          { text: "案例 CRUD tRPC 路由（list/listAdmin/getById/create/update/delete/togglePublish/incrementView/stats）", category: "backend" },
          { text: "平台画像 CRUD tRPC 路由（list/listAdmin/getById/create/update/delete）", category: "backend" },
          { text: "专题/辖区管理路由（list/create/update/delete）", category: "backend" },
          { text: "管理员权限守卫（adminProcedure）", category: "security" },
        ],
      },
      {
        title: "前端公开页面",
        items: [
          { text: "首页（统计数据、最新条目、辖区覆盖、专题分布）", category: "frontend" },
          { text: "内容数据库列表页（多维筛选 + 关键词搜索 + 分页）", category: "frontend" },
          { text: "内容详情页（结构化摘要、AI 分析、标签、来源、浏览量）", category: "frontend" },
          { text: "平台画像库列表页（卡片展示 + 辖区筛选）", category: "frontend" },
          { text: "平台画像详情页（七大维度、时间线、规则文件、关联内容）", category: "frontend" },
          { text: "关于页面（简介、主办单位、覆盖范围、联系方式）", category: "frontend" },
          { text: "全局配色主题（深海蓝/暗焰金/墨青碧 + 深色/浅色模式）", category: "frontend" },
          { text: "全局字体（Noto Serif SC + DM Sans + Noto Sans SC）", category: "frontend" },
        ],
      },
      {
        title: "管理员后台",
        items: [
          { text: "管理员登录/权限守卫（未登录/无权限提示）", category: "security" },
          { text: "后台 Dashboard（统计概览）", category: "frontend" },
          { text: "案例列表管理（搜索、编辑、删除、发布/下线）", category: "frontend" },
          { text: "全屏案例编辑页 CaseEditor.tsx（AI URL 提取、原文全文字段）", category: "frontend" },
          { text: "全屏平台编辑页 PlatformEditor.tsx（AI 关键词自动填充）", category: "frontend" },
          { text: "专题与辖区标签管理界面（支持新增/编辑/删除）", category: "frontend" },
          { text: "Admin.tsx 新增 API 配置 Tab（Firecrawl API Key 管理）", category: "frontend" },
          { text: "用户管理 Tab（用户列表/角色修改）", category: "frontend" },
        ],
      },
      {
        title: "AI 辅助录入（初版）",
        items: [
          { text: "后端 ai.extractCaseFromUrl tRPC 接口（调用 LLM 提取结构化字段）", category: "ai" },
          { text: "前端 CaseEditor.tsx 添加「AI 辅助填充」面板（URL → AI 提取 → 自动填充）", category: "ai" },
          { text: "平台编辑页 PlatformEditor.tsx 支持 AI 关键词自动填充（ai.extractPlatformByKeyword）", category: "ai" },
          { text: "CaseEditor 重构：合并摘要字段、原文全文移至主内容区、表单改为横线版式", category: "frontend" },
        ],
      },
    ],
  },
];

function CategoryBadge({ category }: { category: ChangeItem["category"] }) {
  return (
    <span className={cn("inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0", CATEGORY_COLORS[category])}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function SectionBlock({ section }: { section: VersionSection }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border last:border-b-0 pb-4 last:pb-0">
      <button
        className="flex items-center gap-2 w-full text-left py-2 group"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
        <span className="text-sm font-medium">{section.title}</span>
        <span className="text-xs text-muted-foreground ml-auto">{section.items.length} 项</span>
      </button>
      {open && (
        <ul className="space-y-2 pl-5 mt-1">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <CategoryBadge category={item.category} />
              <span className="text-sm text-muted-foreground leading-relaxed">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VersionCard({ version, defaultOpen }: { version: Version; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalItems = version.sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className={cn("border-l-4 pl-6 pb-8", version.color)}>
      {/* Version header */}
      <button
        className="flex items-start gap-4 w-full text-left group mb-4"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xl font-bold font-mono">{version.label}</span>
            <span className="text-base font-medium">{version.subtitle}</span>
            <Badge variant="outline" className="text-xs font-normal">{version.period}</Badge>
            <Badge variant="secondary" className="text-xs">{totalItems} 项更新</Badge>
          </div>
        </div>
        <div className="shrink-0 mt-1">
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>

      {open && (
        <div className="space-y-4 bg-muted/20 rounded-lg p-4">
          {version.sections.map((section, i) => (
            <SectionBlock key={i} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DevChangelog() {
  const [filter, setFilter] = useState<ChangeItem["category"] | "all">("all");

  const filteredVersions: Version[] = filter === "all"
    ? VERSIONS
    : VERSIONS.map((v) => ({
        ...v,
        sections: v.sections
          .map((s) => ({
            ...s,
            items: s.items.filter((item) => item.category === filter),
          }))
          .filter((s) => s.items.length > 0),
      })).filter((v) => v.sections.length > 0);

  const allCategories: ChangeItem["category"][] = ["backend", "frontend", "ai", "fix", "perf", "security"];

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <GitCommit className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">开发日志</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          记录互联网平台治理数据库各版本的功能迭代与技术改进，按时间倒序排列（最新版本在前）。
        </p>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap mb-8">
        <span className="text-xs text-muted-foreground mr-1">筛选类别：</span>
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "text-xs px-3 py-1 rounded-full border transition-colors",
            filter === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          全部
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-colors",
              filter === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Version timeline */}
      <div className="space-y-2">
        {filteredVersions.map((version, i) => (
          <VersionCard key={version.id} version={version} defaultOpen={i === 0} />
        ))}
        {filteredVersions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            当前筛选条件下无匹配记录
          </div>
        )}
      </div>
    </div>
  );
}
