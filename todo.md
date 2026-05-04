# 互联网平台治理数据库 - TODO

## 数据库 & 后端
- [x] 设计并创建数据库 Schema（cases, platforms, topics, jurisdictions）
- [x] 编写种子数据脚本（15条案例 + 多个平台画像）
- [x] 案例 CRUD tRPC 路由（list/listAdmin/getById/create/update/delete/togglePublish/incrementView/stats）
- [x] 平台画像 CRUD tRPC 路由（list/listAdmin/getById/create/update/delete）
- [x] 专题/辖区管理路由（list/create/update/delete）
- [x] 浏览量统计路由（incrementView）
- [x] 管理员权限守卫（adminProcedure）

## 前端 - 全局
- [x] 全局配色主题（深海蓝/暗焰金/墨青碧 + 深色/浅色模式）
- [x] 全局字体（Noto Serif SC + DM Sans + Noto Sans SC）
- [x] 顶部导航栏（含用户菜单、移动端适配）
- [x] 主题切换面板（配色/明暗/字体/密度）

## 前端 - 公开页面
- [x] 首页（统计数据、最新条目、辖区覆盖、专题分布）
- [x] 案例数据库列表页（多维筛选 + 关键词搜索 + 分页）
- [x] 案例详情页（结构化摘要、AI分析、标签、来源、浏览量）
- [x] 平台画像库列表页（卡片展示 + 辖区筛选）
- [x] 平台画像详情页（七大维度、时间线、规则文件、关联案例）
- [x] 关于页面（简介、主办单位、覆盖范围、联系方式）

## 前端 - 管理员后台
- [x] 管理员登录/权限守卫（未登录/无权限提示）
- [x] 后台 Dashboard（统计概览）
- [x] 案例列表管理（搜索、编辑、删除、发布/下线）
- [x] 案例新增/编辑表单（完整字段）
- [x] 平台画像管理（列表展示 + 查看）
- [x] 专题与辖区标签管理界面（支持新增/编辑/删除）
- [x] 平台画像完整编辑表单（支持新增平台和编辑平台基本信息）

## 已修复
- [x] /admin 使用 ProtectedRoute 包装，未登录/无权限用户无法进入后台
- [x] CaseDetail 添加同专题关联案例区块
- [x] Platforms 添加平台类型筛选器
- [x] About 联系方式提供真实邮箱链接 cyberdb@zjicm.edu.cn

## 测试
- [x] 后端 tRPC 路由单元测试（auth/cases/topics/platforms）- 7 tests passed
- [x] 受保护路由验证（ProtectedRoute 组件）
- [x] TypeScript 编译（仅剩框架层 storageProxy.ts 1个错误，非业务代码）

## AI 辅助录入
- [x] 后端添加 ai.extractCaseFromUrl tRPC 接口（调用 LLM 提取结构化字段）
- [x] 前端 CaseEditor.tsx 添加“AI 辅助填充”面板（URL → AI 提取 → 自动填充）
- [x] 平台编辑页 PlatformEditor.tsx 支持 AI 关键词自动填充（ai.extractPlatformByKeyword）

## Admin 全屏编辑页面修复（当前迭代）
- [x] 修复 Admin.tsx：新增案例/平台按钮改为路由跳转（navigate），移除弹窗逻辑
- [x] 创建 CaseEditor.tsx：全屏案例编辑页，支持 AI URL 提取、原文全文字段
- [x] 创建 PlatformEditor.tsx：全屏平台编辑页，支持 AI 关键词自动填充（画像/历程/链接）
- [x] App.tsx 注册所有编辑路由（/admin/cases/new, /admin/cases/:id/edit, /admin/platforms/new, /admin/platforms/:id/edit）
- [x] Admin.tsx 新增 API 配置 Tab（Firecrawl API Key 管理）
- [x] schema.ts 添加 api_settings 表和 cases.fullText 字段
- [x] routers.ts 新增 settings 路由（getAll/upsert/delete）和 ai 路由（extractPlatformByKeyword/extractCaseFromUrl）
- [x] 数据库迁移执行成功（api_settings 表 + fullText 字段）
- [x] platforms 表新增 website/wikipediaUrl/crunchbaseUrl/profileFeatures/developmentHistory 字段并迁移
- [x] routers.ts platforms.create/update 添加新字段，确保 AI 填充内容可持久化
- [x] 修复 Cases.tsx JSX 嵌套标签错误
- [x] 15 个测试全部通过

## CaseEditor 重构（当前迭代）
- [x] 合并「案例摘要」和「AI 摘要」为单一摘要字段
- [x] 「原文全文」移至主内容区（非侧边栏），作为主要输入区域
- [x] 全部表单字段去除方框边框，改为横线（underline）版式

## 全站「案例」→「内容」文字替换（当前迭代）
- [x] 导航栏「案例数据库」→「内容数据库」
- [x] 所有页面标题、按钮、标签中的「案例」→「内容」
- [x] CaseEditor.tsx 表单标签全部替换
- [x] Admin.tsx 管理后台相关文字替换
- [x] Cases.tsx 列表页文字替换
- [x] CaseDetail.tsx 详情页文字替换
- [x] Home.tsx 首页文字替换
- [x] Navbar.tsx/About.tsx/Legal.tsx/PlatformDetail.tsx 文字替换
- [x] 10 个文件全部替换完成，15 个测试全部通过

## Firecrawl API 接入（已被三 API 梯级方案取代）
- [x] 后端创建 server/scraper.ts 服务（封装 Firecrawl/Jina/ScrapingBee 降级）
- [x] routers.ts 新增 scraper.scrapeUrl 路由（从 api_settings 读取 API Key）
- [x] ai.extractCaseFromUrl 升级：抓取原文+LLM 提取内容信息
- [x] PlatformEditor.tsx 规则文件 Tab：URL 输入 → 抓取全文 → 保存
- [x] CaseEditor.tsx URL 提取升级：优先使用 scraper 抓取原文，再交 LLM 提取
- [x] Admin API 配置 Tab：三个 API Key 配置入口均已完成

## 三 API 梯级冗余抓取接入（当前迭代）
- [x] 创建 server/scraper.ts：封装 Firecrawl→Jina Reader→ScrapingBee 降级策略
- [x] routers.ts 新增 scraper.scrapeUrl 路由（从 api_settings 读取各 API Key）
- [x] ai.extractCaseFromUrl 升级：先用 scraper 抓取原文，再交 LLM 提取结构化信息
- [x] Admin.tsx API 配置 Tab 添加 Jina/ScrapingBee API Key 配置入口，更新降级策略说明
- [x] PlatformEditor.tsx 规则文件 Tab：每条规则添加「抓取全文」按钮（梯级降级）
- [x] 15 个测试全部通过

## 规则文件 fullText 持久化验证（当前迭代）
- [x] platforms.create/update 的 rules 使用 z.any()，fullText 字段可完整传递
- [x] 数据库 rules 为 JSON 字段，原样存储整个对象（含 fullText）
- [x] PlatformEditor handleSubmit 中 rules: form.rules 完整传递（含 fullText）
- [x] 编辑回填时 p.rules 原样赋值给 form.rules，fullText 会重新显示

## API 配置页测试按钮（当前迭代）
- [x] 后端新增 scraper.testApiKey 路由（分别验证 Firecrawl/Jina/ScrapingBee）
- [x] Admin.tsx API 配置 Tab：每个 Key 旁添加「测试」按钮，显示验证结果（成功/失败/延迟）
- [x] 15 个测试全部通过
