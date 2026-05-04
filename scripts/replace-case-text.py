#!/usr/bin/env python3
"""
批量将前端 UI 文本中的「案例」替换为「内容」。
仅替换字符串字面量（JSX 文本、字符串属性值、toast 消息等）中的「案例」，
不修改变量名、函数名、路由路径、数据库字段名等技术标识符。
"""
import re, sys

# 替换规则：按优先级从长到短排列，避免部分匹配
REPLACEMENTS = [
    # 完整词组
    ("案例数据库", "内容数据库"),
    ("案例标题（中文）", "内容标题（中文）"),
    ("案例标题（英文）", "内容标题（英文）"),
    ("案例标题", "内容标题"),
    ("案例类型", "内容类型"),
    ("案例摘要", "内容摘要"),
    ("案例总数", "内容总数"),
    ("案例管理", "内容管理"),
    ("收录案例总数", "收录内容总数"),
    ("案例不存在或已删除", "内容不存在或已删除"),
    ("案例原文 URL", "内容原文 URL"),
    ("案例 URL", "内容 URL"),
    ("案例信息", "内容信息"),
    ("司法案例、监管执法与立法政策", "司法内容、监管执法与立法政策"),
    ("司法案例、监管执法决定与立法政策文件三大类型", "司法内容、监管执法决定与立法政策文件三大类型"),
    ("司法案例", "司法内容"),
    ("关联案例", "关联内容"),
    ("同专题关联案例", "同专题关联内容"),
    ("新增案例", "新增内容"),
    ("编辑案例", "编辑内容"),
    ("创建案例", "创建内容"),
    ("删除案例", "删除内容"),
    ("搜索案例", "搜索内容"),
    ("案例已创建", "内容已创建"),
    ("案例已更新", "内容已更新"),
    ("案例已删除", "内容已删除"),
    ("返回案例列表", "返回内容列表"),
    ("未找到符合条件的案例", "未找到符合条件的内容"),
    ("请选择案例类型", "请选择内容类型"),
    ("请填写案例标题", "请填写内容标题"),
    ("请输入案例标题", "请输入内容标题"),
    ("AI 已自动提取案例信息", "AI 已自动提取内容信息"),
    ("粘贴案例原文 URL，AI 自动提取标题、摘要、类型等信息", "粘贴内容原文 URL，AI 自动提取标题、摘要、类型等信息"),
    ("简要描述案例背景和核心内容（AI 提取后可手动修改）", "简要描述内容背景和核心要点（AI 提取后可手动修改）"),
    ("案例背景和核心内容", "内容背景和核心要点"),
    # 通用「案例」（放最后，避免误替换）
    ("案例摘要、分析解读", "内容摘要、分析解读"),
    ("案例信息、法规文本", "内容信息、法规文本"),
    ("案例类型、司法辖区", "内容类型、司法辖区"),
]

FILES = [
    "client/src/components/Navbar.tsx",
    "client/src/lib/utils.ts",
    "client/src/pages/Home.tsx",
    "client/src/pages/Cases.tsx",
    "client/src/pages/CaseDetail.tsx",
    "client/src/pages/PlatformDetail.tsx",
    "client/src/pages/About.tsx",
    "client/src/pages/Legal.tsx",
    "client/src/pages/Admin.tsx",
    "client/src/pages/CaseEditor.tsx",
]

import os
base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

total_changes = 0
for rel_path in FILES:
    path = os.path.join(base, rel_path)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
    changes = sum(1 for a, b in zip(original, content) if a != b)
    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✓ {rel_path} (modified)")
        total_changes += 1
    else:
        print(f"  {rel_path} (no changes)")

print(f"\nDone: {total_changes} files modified.")
