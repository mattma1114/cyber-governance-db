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

## API 配置页输入框修复（当前迭代）
- [x] 修复 api_settings 表结构与 Drizzle schema 不一致导致 getAll 500 错误（缺少 id/createdAt 字段）
- [x] 重建 api_settings 表（包含 id/key/value/label/createdAt/updatedAt 字段）
- [x] 输入框可正常填写，保存成功后显示「已配置」徽章 + 删除按钮

## 新建内容保存失败修复（当前迭代）
- [x] 诊断 cases.create 路由保存失败原因：Drizzle MySQL2 insert 返回 [ResultSetHeader, FieldPacket[]] 数组，原代码 result.insertId 访问 undefined 导致 NaN
- [x] 修复保存逻辑：改为 Array.isArray(result) ? result[0] : result 正确获取 ResultSetHeader，insertId 正常返回
- [x] 确认内容列表页可实时同步展示新建内容（管理员后台内容管理 Tab 正常显示）
- [x] 15 个测试全部通过

## AI 提取升级（当前迭代）
- [x] 后端 ai.extractCaseFromUrl：LLM prompt 补充研究专题/司法辖区/来源机构/语言/标签字段提取，从数据库加载真实选项供 LLM 精确匹配
- [x] 后端 ai.extractCaseFromUrl：AI 分析内容加深至 800-1200 字，涵盖法律意义、核心争议、引用条款、合规启示、同类案件对比
- [x] 后端 ai.extractCaseFromUrl：自动抓取原文全文（最多 15000 字），优先使用 scraped 内容
- [x] 前端 CaseEditor：onSuccess 回调补全所有字段预填（topicId/jurisdictionId/source/language/tags/fullText/sourceUrl）
- [x] 前端 CaseEditor：新增三步骤 AI 加载动画覆盖层（抓取→分析→填充），含进度条和分步状态
- [x] 15 个测试全部通过

## 内容详情页导出 PDF（当前迭代）
- [x] 后端：新增 cases.exportPdf 路由，服务端生成包含标题/摘要/AI分析/原文全文的 PDF（base64 返回）
- [x] 前端：CaseDetail.tsx 添加「导出 PDF」按钮，调用路由后触发浏览器下载
- [x] PDF 样式：中文字体支持（Noto Serif CJK SC）、封面展示元数据、章节标题、页脚（来源机构+导出日期）
- [x] 测试：PDF 生成成功，显示「PDF 已生成，正在下载」 toast，15 个测试全部通过

## 内容列表页批量导出 PDF（当前迭代）
- [x] 后端：新增 cases.exportBatchPdf 路由，并行生成多份 PDF（每批 5 个）并用 archiver 打包为 ZIP
- [x] 前端：列表页右上角新增「批量选择」切换按钮
- [x] 前端：Grid 和 List 视图均支持勾选（选中高亮、Checkbox、阻止 Link 跳转）
- [x] 前端：底部浮动工具栏（全选/取消全选/导出 X 份 PDF/退出）
- [x] 前端：导出完成后自动下载 ZIP 并显示 toast 提示
- [x] 15 个测试全部通过

## 原文全文提取优化（当前迭代）
- [x] 安装 @mozilla/readability + jsdom，创建 server/content-extractor.ts（三级策略：Readability→语义标签提取→清洗 body）
- [x] 升级 scraper.ts：Firecrawl+Jina 返回 Markdown 用 cleanMarkdown 二次清洗；ScrapingBee 改为获取 HTML 再用 Readability 提取正文
- [x] 升级 scraper.ts：新增第 4 级兑底策略（直接 fetch + Readability），无需 API Key 也能提取正文
- [x] 噪音过滤覆盖 nav/aside/footer/header/广告/侧边栏/弹窗/评论区/社交分享等 50+ 选择器
- [x] 15 个测试全部通过，TypeScript 编译无新增错误

## 内容详情页样式优化（当前迭代）
- [x] 删除「AI 摘要解读」模块
- [x] 去掉方框样式，改为横线分隔不同模块
- [x] 补全缺失的「原文正文」模块（fullText 字段）
- [x] 15 个测试全部通过

## 内容详情页两栏布局重构（当前迭代）
- [x] 重构为左右两栏：左侧（280px固定）+右侧（自动充展），左侧 sticky 吸附屏幕
- [x] 左侧：基本信息（日期/发布机构/司法辖区/研究专题/浏览次数/原文链接）+相关标签+学术引用（默认折叠）+同专题关联
- [x] 右侧上方：内容摘要（可折叠）+深度法律分析（可折叠，多段落显示）
- [x] 右侧下方：原文正文（最重要模块，多段落首行缩进，行高 1.9，无折叠）
- [x] 顶部导航栏 sticky：含返回按钮、导出 PDF 、查看原文按钮
- [x] 移动端响应式：小屏幕单栏堆叠，大屏幕左右两栏
- [x] 15 个测试全部通过

## 原文正文始终显示 + 批量重抓 fullText（当前迭代）
- [x] CaseDetail.tsx：原文正文区域始终显示，fullText 为空时显示占位提示（含编辑入口和原文链接）
- [x] 后端：新增 cases.refetchFullText mutation，接收 id 数组，批量重新抓取 sourceUrl 并更新 fullText
- [x] 管理后台：内容管理页工具栏新增「重抓原文」按钮，自动过滤当前页有 sourceUrl 但无 fullText 的内容并批量抓取
- [x] 修复 PlatformDetail.tsx Rules of Hooks 错误（trpc.cases.list.useQuery 移至所有条件返回之前）
- [x] 15 个测试全部通过

## 内容详情页「相关文件」模块（当前迭代）
- [x] 数据库新增 case_attachments 表（id/caseId/filename/fileKey/fileUrl/fileSize/mimeType/createdAt），直接执行 SQL 迁移
- [x] 后端：新增 attachments.upload（base64 编码上传到 S3，单文件限制 20MB）、attachments.listByCaseId、attachments.delete 路由
- [x] 前端 CaseEditor.tsx：附件管理区域（上传按钮、已上传列表、删除按钮），支持 PDF/Word/Excel/图片等多种格式
- [x] 前端 CaseDetail.tsx：左侧「相关文件」模块（学术引用上方），展示文件图标/名称/大小/下载链接
- [x] 15 个测试全部通过

## 相关文件在线预览功能（当前迭代）
- [x] 创建 FilePreviewModal 组件：PDF 使用 iframe 内嵌预览（含工具栏），图片使用灯箱全屏展示（含缩放/翻页）
- [x] CaseDetail.tsx 附件列表：点击文件名触发预览弹窗（PDF/图片），其他格式仍为下载链接
- [x] CaseEditor.tsx 附件列表：同样支持点击预览（编辑页也可预览已上传文件）
- [x] 15 个测试全部通过

## 全站性能优化（当前迭代）
- [x] 诊断加载慢根因：数据库连接延迟 1156ms（每次新建连接），cases 表仅有主键索引，cases.list 返回 full_text 大字段
- [x] 数据库关键字段添加索引（idx_cases_status/topicId/jurisdictionId/type/status_date/status_views）
- [x] 修复数据库连接池：server/db.ts 改用 mysql2 createPool（connectionLimit: 10），连接复用后查询从 1156ms 降至 <10ms
- [x] 优化 cases.list 和 cases.listAdmin：使用 db.select({...}) 明确排除 fullText 大字段，减少网络传输
- [x] cases.incrementView 异步化：改为 fire-and-forget（不阻塞响应，后台更新浏览量）
- [x] 前端路由懒加载：App.tsx 使用 React.lazy + Suspense 对 8 个重型页面实现代码分割
- [x] 修复附件上传中文文件名导致 S3 URL 签名失败：改用 UUID + 扩展名作为存储键
- [x] 15 个测试全部通过

## 管理后台内容管理功能完善（当前迭代）
- [x] 后端：新增 cases.batchUpdateStatus 路由（批量发布/下架/草稿）
- [x] 后端：新增 cases.batchDelete 路由（批量删除，含权限守卫）
- [x] 后端：listAdmin 增加 statusFilter 参数（按 published/draft/unpublished 筛选）
- [x] 前端：修复状态显示 bug（c.published → c.status 三态匹配）
- [x] 前端：状态 badge 区分三种状态（已发布/草稿/已下架），颜色语义化
- [x] 前端：单条操作下拉菜单（编辑/发布/下架/设为草稿/删除），替代现有图标按鈕
- [x] 前端：表格头部添加全选 Checkbox，每行添加 Checkbox
- [x] 前端：顶部工具栏添加状态筛选 Select（全部/已发布/草稿/已下架）
- [x] 前端：选中内容后显示批量操作工具栏（批量发布/下架/删除）
- [x] 前端：批量删除添加确认弹窗
- [x] 22 个测试全部通过（2 个测试文件，新增 7 个批量操作测试）

## 内容数据库页筛选标签位置调整
- [x] 将「已选筛选标签」（清除全部筛选 + tag chips）从左侧筛选栏移到右侧内容列表上方（「共 X 条结果」行下方）

## 平台详情页重构（当前迭代）
- [x] 去除方框（Card）版式，改为横线分隔的平铺版式
- [x] 将平台画像/发展时间线/规则文件/关联内容改为左侧导航栏 + 右侧内容区布局
- [x] 规则文件模块：上方协议名称+版本选择器，下方规则全文展示
- [x] 关联内容模块同步改为横线版式（去除 Card 方框）

## 规则文件「一键获取」按钮改造（当前迭代）
- [x] 将 PlatformEditor.tsx 规则文件 Tab 中 Download 图标按钮改为带文字「一键获取」的 variant="default" 按钮（Zap 图标）
- [x] 加载中显示「获取中…」（Loader2 动画 + 文字）
- [x] 抓取成功后全文预览区显示绿色「全文已获取」状态标识 + 字符数统计 + 前 800 字符预览
- [x] 抓取中（无全文）时显示 Loader2 加载状态指示器

## 平台详情页 PDF 导出空白修复（当前迭代）
- [x] 诊断空白 PDF 根因（display:none 元素在 Chrome 打印时不渲染内容）
- [x] 改用新窗口打印方案（window.open + document.write + window.print()），彻底绕开 display:none 限制
- [x] 修复 TypeScript 编译错误（jurisLabels 在 useCallback 中的引用顺序问题）

## PDF 档案加入规则文件模块（当前迭代）
- [x] handleExportPdf 中解析 rules 字段，按名称分组，每组列出所有版本（日期、链接）
- [x] HTML 模板中在「发展历程」之后插入「规则文件」模块

## 专题/辖区新增弹窗 AI 自动预填写（当前迭代）
- [x] 后端 ai.suggestTagFields 路由：根据中文名称生成 id/labelEn/color（专题）或 id/labelEn（辖区）
- [x] 前端 SimpleTagForm 加入 tagType prop 和 debounce 600ms 的 AI 预填写逻辑
- [x] 专题和辖区两处 SimpleTagForm 调用均传入 tagType
- [x] 颜色字段加入色块预览（专题）

## 外部 LLM API 接入（当前迭代）
- [x] 设计外部 LLM 接入方案（支持 OpenAI/DeepSeek/Anthropic/Azure OpenAI）
- [x] 实现 server/llm-router.ts：优先外部 LLM，降级内置 Manus LLM
- [x] 将所有 AI 功能路由（extractCaseFromUrl/extractPlatformByKeyword/suggestTagFields）改为调用 llm-router
- [x] Admin.tsx API 配置页新增外部 LLM 配置区块（服务商/Key/模型/测试）
- [x] 后端新增 ai.testLlm 路由，验证外部 LLM 连通性

## 按功能分配 LLM 模型（当前迭代）
- [x] 设计数据库 key 约定（LLM_TASK_{TASK}_PROVIDER / MODEL）
- [x] 扩展 llm-router.ts：返回链：任务级 → 全局 → 内置
- [x] 更新 routers.ts 各 AI 路由传入 taskKey
- [x] Admin.tsx 新增「按功能配置」区块，每个功能独立选择服务商和模型

## 字体风格/信息密度修复 + 首页统计区紧凑化（当前迭代）
- [x] 修复字体风格 CSS：衬线体/无衬线体切换差异明显
- [x] 修复信息密度 CSS：补充 density-compact / density-airy 规则
- [x] 首页统计数据区域改得更紧凑（视觉编辑批注）

## 首页方框改横线风格（当前迭代）
- [x] CaseCard 去掉圆角边框，改为 border-b 横线分隔风格
- [x] 覆盖司法辖区区块去掉 rounded-xl border bg-card，改为 border-t/border-b 标题横线 + 条目 border-b 分隔线
- [x] 核心研究专题区块同上，进度条改为左侧彩色竖线 + 无圆角进度条

## 平台画像库移动端自适应适配（当前迭代）
- [x] 优化 Platforms.tsx 移动端布局（筛选栏折叠、卡片网格响应式）
- [x] 优化 PlatformDetail.tsx 移动端布局（Tab 导航、侧边栏、规则文件表格）

## 管理员后台「网站信息」管理模块（当前迭代）
- [x] 数据库新增 site_settings 表（key/value/updatedAt），执行迁移
- [x] 新增 siteSettings tRPC 路由（getAll/update），前台页面动态读取配置
- [x] Admin.tsx 新增「网站信息」Tab，分模块编辑（首页/关于我们/法律声明/主办机构/底部栏/内容数据库说明/平台画像库说明）
- [x] 前台 Home.tsx/About.tsx/Legal.tsx/Cases.tsx/Platforms.tsx 动态读取 site_settings

## 管理员后台「用户管理」模块
- [x] 后端新增 users tRPC 路由：listUsers（管理员）、updateUserRole（管理员）
- [x] Admin.tsx 新增「用户管理」Tab：用户列表表格（姓名/邮箱/角色/注册时间/最后登录），支持修改角色（提升/降级管理员）
- [x] 防止管理员降级自身账号（保护机制）

## 管理员账号管理功能
- [x] 数据库：users 表新增 status 字段（active/frozen），新增 admin_invites 邀请码表
- [x] 后端：generateInvite（生成邀请码）、listInvites（列出邀请码）、revokeInvite（撤销邀请码）、freezeUser（冻结/解冻）、deleteUser（删除用户）tRPC 路由
- [x] 后端：OAuth 登录时检查用户 status，冻结用户拒绝登录
- [x] 前端：Admin.tsx 用户管理 Tab 新增邀请码管理区（生成/复制/撤销）、冻结/解冻按钮、删除用户按钮
- [x] 前端：新增 /invite/:token 邀请码注册页，完成 Manus OAuth 后自动提升为管理员

## 内容管理表单样式统一（当前迭代）
- [x] CaseEditor.tsx 新增/编辑表单：所有分组方框（Card/rounded/border）改为横线分隔

## AI 分析模块排版修复
- [x] CaseEditor.tsx：AI 分析字段改为「编辑/预览」双模式，预览时渲染 Markdown 段落、去除 ** 符号、优化段间距

## PDF 全文上传 + 在线阅读器（当前迭代）
- [x] cases 表添加 fullTextPdfUrl/fullTextPdfKey 字段，生成迁移 SQL
- [x] 后端新增 cases.uploadFullTextPdf 接口（S3 存储，返回 URL）
- [x] CaseEditor.tsx「原文全文」添加文本/PDF 切换模式，支持 PDF 上传
- [x] CaseDetail.tsx「原文正文」区域嵌入 PDF 阅读器（iframe），支持文本和 PDF 两种展示方式

## 超长文本导入修复 + 去重检测（当前迭代）
- [x] 将 fullText/abstract/aiAnalysis/aiSummary 字段改为 MEDIUMTEXT（支持最大 16MB）
- [x] 修复前端正文内容显示错乱问题（超长文本渲染优化）
- [x] 后端新增 cases.checkDuplicate 路由（标题相似度 + sourceUrl 重复检测）
- [x] 管理后台新增内容时在标题/URL 输入后自动触发去重检测，展示疑似重复提示

## PDF AI 解析全文（当前迭代）
- [x] 安装 pdf-parse 依赖，实现后端 PDF 文本提取工具函数
- [x] 新增 cases.parsePdfFullText tRPC 路由（下载 PDF → 提取文本 → LLM 清洗整理 → 保存 fullText 字段）
- [x] 前端 CaseEditor.tsx：PDF 模式下添加「AI 解析全文」按钮，展示解析进度，完成后自动切换到文本模式并填充内容
- [x] 39 个测试全部通过

## LLM 语义去重检测增强（当前迭代）
- [x] 升级 cases.checkDuplicate 路由：先关键词粗筛候选集，再调用 LLM 语义相似度精筛
- [x] LLM 返回每条候选的相似度得分（0-100）和判断理由
- [x] 前端去重警告横幅升级：显示相似度得分（高/中/低风险标识）和 LLM 判断理由
