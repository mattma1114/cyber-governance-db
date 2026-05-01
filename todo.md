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
- [ ] 专题与辖区标签管理界面（当前通过数据库直接管理）
- [ ] 平台画像完整编辑表单（当前显示"即将上线"）

## 已修复
- [x] /admin 使用 ProtectedRoute 包装，未登录/无权限用户无法进入后台
- [x] CaseDetail 添加同专题关联案例区块
- [x] Platforms 添加平台类型筛选器
- [x] About 联系方式提供真实邮箱链接 cyberdb@zjicm.edu.cn

## 测试
- [x] 后端 tRPC 路由单元测试（auth/cases/topics/platforms）- 7 tests passed
- [x] 受保护路由验证（ProtectedRoute 组件）
- [x] TypeScript 编译（仅剩框架层 storageProxy.ts 1个错误，非业务代码）
