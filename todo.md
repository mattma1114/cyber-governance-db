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
- [x] 后端 tRPC 路由单元测试（auth/cases/topics/platforms）- 15 tests passed
- [x] 受保护路由验证（ProtectedRoute 组件）
- [x] TypeScript 编译（仅剩框架层 storageProxy.ts 1个错误，非业务代码）

## 已完成（本次迭代）
- [x] 规则文件模块改为三栏布局（左：规则名称，中：版本历史，右：规则全文/原文链接）
- [x] Admin.tsx 平台表单规则 Tab 支持多版本管理（版本号/日期/链接/全文）
- [x] 兼容旧版 flat 格式规则数据（自动 normalize）

## AI 辅助录入（当前迭代）
- [x] 案例录入改为全屏独立页面 /admin/cases/new 和 /admin/cases/:id/edit
- [x] 全屏案例录入页：AI URL 自动填充模式（Firecrawl 抓取 + LLM 解析）
- [x] 全屏案例录入页：手工输入模式（兆底方案）
- [x] tRPC procedure: ai.extractFromUrl + ai.generateContent（adminProcedure）
- [x] Admin.tsx 平台管理：补全删除按鈕和删除确认弹窗
- [x] Admin.tsx 平台管理：补全激活/停用快捷切换
- [x] Admin.tsx 平台表单：新增「关联案例」 Tab
- [x] Admin.tsx 统计卡片：新增平台总数

## API 配置与 AI 辅助写作（当前迭代）
- [x] 数据库新增 api_settings 表（key/value 存储，仅管理员可读写）
- [x] tRPC 路由：settings.list / settings.set / settings.delete / settings.getValue（adminProcedure）
- [x] Admin.tsx 新增「API 配置」Tab（Firecrawl Key + AI 写作 API Key 配置界面）
- [x] CaseEditor.tsx 集成 AI 总结辅助（基于摘要生成内容解读）
- [x] CaseEditor.tsx 集成 AI 写作辅助（基于内容解读生成法律分析）
- [x] Firecrawl URL 自动填充：已配置时可用，未配置时显示「待配置」提示

## CaseEditor 字段调整（当前迭代）
- [x] CaseEditor.tsx：删除顶部栏「草稿」状态徽章 + 「保存草稿」 + 「保存并发布」按鈕区域
- [x] CaseEditor.tsx：删除「法律分析」字段及相关 AI 辅助按鈕
- [x] CaseEditor.tsx：新增「原文全文」字段（大文本输入）
- [x] CaseEditor.tsx：所有输入框改为上下横线风格（去除方框）
- [x] Admin.tsx CaseForm：删除「深度分析」字段，新增「原文全文」字段
