---
task_id: "LGTG-ORDER-RACE-DEMO-20260831"
title: "下单竞速排名H5演示版"
document: "B-设计与影响"
iteration_branch: "demo/order-race-20260831"
iteration_slug: "demo__order-race-20260831"
module_key: "order-ranking-h5"
change_type: "initial"
parent_task_ids: "NONE"
module_baseline_before: "NONE"
baseline_effect: "business"
module_baseline_after: "PENDING"
risk_lane: "标准"
owner: "Codex"
required_readers: "实施、测试、评估、发布 AI"
decision_owner: "Technical/Test Owner；必须交付（P0）口径与新增业务影响由 Human/Product Owner 确认"
content_role: "技术事实与验证契约"
update_mode: "当前态维护"
document_stage: "技术设计与开发准备"
derived_from_business_baseline: "BIZ-ORDER-RANKING-H5-V2"
updated_at: "2026-08-31T13:17:56.000Z"
---

# 下单竞速排名H5演示版｜设计与影响

## 1. 技术设计

### 1.1 当前实现与真实调用链

Base SHA `f1492c7102034e88391fbb85aace7ee2417d302f` 是 Sites 新项目脚手架：只有占位首页、空 D1 schema 和基础 UI 组件，没有下单排名业务代码、API、表或历史数据。调用链为浏览器 -> Vinext 页面；D1 binding 已在 `.openai/hosting.json` 声明但尚未定义业务表。

### 1.2 目标架构与数据流

```text
大屏 /                 录入页 /control
   \                     /
    GET /api/ranking（每秒轮询）
    POST /api/participants
    POST /api/participants/import
    POST /api/orders
                 |
          db/order-race.ts
                 |
        Cloudflare D1（DB）
        participants + orders
```

- 大屏和录入页均以服务端 D1 为权威数据，不使用浏览器存储保存业务数据。
- 排名通过 `orders` 聚合计算，避免额外维护可漂移的分数字段。
- 同分默认按达到当前订单数的时间升序，再按人员创建时间升序；大屏最多展示前 10 名。这两项仅是演示默认值。
- 大屏每 1 秒查询一次排名，更新时在浏览器内执行平滑换位和光轨增长动效。
- 路由职责保持单向隔离：`/` 只渲染大屏排名，不包含指向 `/control` 的按钮、链接或导航；`/control` 仍作为工作人员持有的独立地址直接访问。

### 1.3 模块职责与修改入口

| 仓库/模块 | 当前职责 | 本次职责 | 入口文件/函数 | 不允许越界的职责 |
| --- | --- | --- | --- | --- |
| `app` | Sites/Vinext 页面与路由 | 大屏页、录入页和 4 个 JSON API | `app/page.tsx`、`app/control/page.tsx`、`app/api/**/route.ts` | 不连接其他 LGTG 服务 |
| `components/order-race` | 新增模块 | 排行榜、录入表单、科技背景和状态反馈 | `big-screen.tsx`、`control-panel.tsx` | 不实现 D1 SQL |
| `db` | D1 binding 和 schema | 表结构、初始化、排名和写入 | `db/schema.ts`、`db/order-race.ts` | 不承担页面状态 |
| `lib/order-race` | 新增模块 | 共享类型、输入标准化与浏览器 API 客户端 | `types.ts`、`validation.ts`、`api-client.ts` | 不持久化业务数据 |

### 1.4 API/SQL/goctl 生成契约

| 项目 | 是否涉及 | 权威源 | 仓库确认的版本/命令/style | 生成产物 | 允许手工实现位置 |
| --- | --- | --- | --- | --- | --- |
| SQL/model | 是 | `db/schema.ts` Drizzle schema | `npm run db:generate`，Drizzle Kit 0.31.10 | `drizzle/*.sql` | `db/order-race.ts` 中使用 D1 prepared statements；不手改生成迁移 |
| API/types/routes/handler/logic | 是，但不是 go-zero | `app/api/**/route.ts` 与 `lib/order-race/types.ts` | Vinext 1.0.0-beta.5；goctl 不适用 | 无 goctl 生成产物 | 框架约定的 route handler 和共享 types 可手工实现 |

### 1.5 状态、事务、幂等、并发与兼容策略

- 姓名和订单号均去除首尾空格；订单号统一大写后再比较。
- `participants.normalized_name` 建唯一索引，演示版同名只保留一个并报告忽略数量。
- `orders.order_no_normalized` 建唯一索引；数据库约束是订单全场去重的最终控制。
- 并发提交同一订单时，一次 INSERT 成功，其余收到唯一约束失败；失败请求再查询原订单并返回归属姓名，禁止额外写入。
- 排名查询只读，以 `COUNT(orders.id)` 为订单数；数据刷新、返回和多标签页不会改变权威状态。
- 首次新建，无旧数据迁移。schema 初始化使用逐条 prepared statement，并保留 Drizzle 迁移文件用于部署。

## 2. 精确契约

### 2.1 数据对象、表与字段

| Data Contract ID | 系统/对象/表 | 字段 | 类型/约束 | before | after | 权威来源 | 索引/兼容 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DATA-ORDER-RANKING-H5-001 | D1 `participants` | `id`, `name`, `normalized_name`, `created_at` | TEXT；id 主键；name 1~20；normalized_name 唯一 | 表不存在 | 可保存姓名名单 | `db/schema.ts` | 唯一索引 `idx_participants_normalized_name` |
| DATA-ORDER-RANKING-H5-002 | D1 `orders` | `id`, `order_no`, `order_no_normalized`, `participant_id`, `created_at` | TEXT；id 主键；订单号 1~64；normalized 唯一；participant 外键 | 表不存在 | 每张有效订单一行 | `db/schema.ts` | 唯一索引 `idx_orders_order_no_normalized`；participant 查询索引 |
| DATA-ORDER-RANKING-H5-003 | 排名视图对象 | `rank`, `name`, `score`, `latestOrderAt` | API 派生字段，不单独落库 | 无 | 每次查询从两表聚合 | `db/order-race.ts` 查询 | 订单数降序；到达时间升序 |

### 2.2 API 契约

| API Contract ID | API | 调用方 | 请求字段/校验 | 响应/错误码 | 幂等/版本 | 权限 |
| --- | --- | --- | --- | --- | --- | --- |
| API-ORDER-RANKING-H5-001 | `GET /api/ranking` | 大屏、录入页 | 无 | 200 `{participants,stats,recentOrders,updatedAt}`；503 查询失败 | 只读 | 演示版公开只读 |
| API-ORDER-RANKING-H5-002 | `POST /api/participants` | 录入页 | `{name}`，1~20 字符 | 201 新增；409 同名；400 非法；503 失败 | normalized_name 唯一 | 演示版暂不鉴权，风险已列为边界 |
| API-ORDER-RANKING-H5-003 | `POST /api/participants/import` | 录入页 | `{names:string[]}`，最多 200 个，每个 1~20 字符 | 200 `{created,ignored,invalid}`；400 无有效姓名 | 每个 normalized_name 最多一行 | 演示版暂不鉴权 |
| API-ORDER-RANKING-H5-004 | `POST /api/orders` | 录入页 | `{participantId,orderNo}`，人员必须存在，订单号 1~64 | 201 成功；409 重复并返回 `existingParticipantName`；400 非法；404 人员不存在；503 失败 | order_no_normalized 全场唯一 | 演示版暂不鉴权 |

### 2.3 事件与回执契约

不适用：演示版通过客户端轮询读取 D1，没有消息事件、回执或外部订阅；已核对范围/证据：目标调用链仅包含 4 个 HTTP API 和 D1；风险 Owner：Codex；替代控制：1 秒轮询、服务端更新时间和失败重试；重新启用触发条件：正式版本需要 WebSocket、SSE 或外部商城事件；日期：2026-08-31。

### 2.4 状态机

| State Contract ID | 当前状态 | 动作 | 前置 | 目标状态/错误 | 持久化 | 审计/事件 | 恢复 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| STATE-ORDER-RANKING-H5-001 | 人员不存在 | 新增/导入姓名 | 合法且 normalized_name 不存在 | 人员可选择；同名返回忽略/冲突 | INSERT participants 1 行 | created_at | 修正姓名后重试 |
| STATE-ORDER-RANKING-H5-002 | 订单不存在 | 登记订单 | 人员存在且 normalized 订单号不存在 | 订单已登记 | INSERT orders 1 行 | created_at；无事件 | 查询排名即可恢复展示 |
| STATE-ORDER-RANKING-H5-003 | 订单已存在 | 再次登记 | 任意人员 | 409 重复，订单归属不变 | orders 0 行变化 | 无新增记录/事件 | 使用新订单号；误录改绑留待后续 |

### 2.5 权限与数据范围

| Permission Contract ID | 角色/主体 | 查看范围 | 允许动作 | 禁止动作 | 服务端校验 | 审计 |
| --- | --- | --- | --- | --- | --- | --- |
| PERM-ORDER-RANKING-H5-001 | 演示访客 | 当前唯一演示活动 | 查看大屏；通过受控链接进入录入页后新增姓名和订单 | 修改其他 LGTG 数据、删除或改绑 | 仅校验输入与数据归属；未实现身份校验 | created_at；操作者身份待正式版 |

权限风险说明：演示版地址不得作为公开生产录单入口；正式多人使用前必须由 Human/Product Owner 确认登录/口令和操作审计规则。

### 2.6 错误、日志与监控

| Error Contract ID | 条件 | 用户/API 反馈 | 日志字段 | 告警/监控 | 恢复动作 |
| --- | --- | --- | --- | --- | --- |
| ERROR-ORDER-RANKING-H5-001 | 字段为空、过长或人员不存在 | 400/404 + 自然中文提示 | route、error code、request id | 演示期浏览器与平台日志 | 修正输入后重试 |
| ERROR-ORDER-RANKING-H5-002 | 同名或重复订单 | 409；订单重复时返回原归属姓名 | route、normalized key 的不可逆摘要 | 统计 409，不作为系统异常 | 使用新姓名/订单号；误录规则待确认 |
| ERROR-ORDER-RANKING-H5-003 | D1 或网络不可用 | 503；大屏显示连接重试，保留上次成功画面 | route、error name、request id；不记订单原文 | 平台错误日志 | 自动或人工重试，不显示虚假成功 |

## 3. 影响面与变更预算

### 3.1 新增与修改清单

| 改动 ID | 新增/修改 | 文件/表/API/页面/配置 | before | after | 交付/风险级别 |
| --- | --- | --- | --- | --- | --- |
| IMP-001 | 修改/新增 | `app/page.tsx`、`app/control/page.tsx`、`components/order-race/**`、`app/globals.css` | 占位页 | 大屏和录入页 | 必须交付/本期应做（P0/P1） |
| IMP-002 | 新增 | `app/api/ranking`、`participants`、`participants/import`、`orders` | 无 API | 4 个 JSON API | 必须交付（P0） |
| IMP-003 | 修改/新增 | `db/schema.ts`、`db/order-race.ts`、`drizzle/**` | 空 schema | 2 张表、3 个索引和查询写入 | 必须交付（P0） |
| IMP-004 | 修改/新增 | `app/layout.tsx`、`lib/order-race/**`、`public/**` | 通用元数据 | 中文元数据、共享类型和演示标识 | 本期应做（P1） |
| IMP-005 | 修改 | `docs/**` | 无任务档案 | A/B/C/D 交付档案和证据 | 必须交付（P0） |
| IMP-006 | 修改 | `components/order-race/big-screen.tsx`、`app/globals.css`、`docs/**` | 大屏页头存在“录入控制台”跳转按钮及其专属样式 | 删除大屏录入入口和未再使用的样式；`/control` 页面与接口保持不变 | 必须交付（P0） |

### 3.2 上下游与旧功能影响

| 影响模块/功能 | 影响原因 | 必须回归的旧路径 | Rule/Case | Owner |
| --- | --- | --- | --- | --- |
| 新项目脚手架首页 | 被大屏替换 | 根路径能成功渲染且无占位文案 | RULE-ORDER-RANKING-H5-004 / TC-ORDER-RANKING-H5-007 | Codex |
| D1 binding | 从空 schema 增加业务表 | 项目构建、schema 初始化和只读查询 | RULE-ORDER-RANKING-H5-001~003 / TC-ORDER-RANKING-H5-001~009 | Codex |
| 其他 LGTG 仓库 | 无代码或运行时依赖 | 不适用：严格允许路径和独立仓库隔离 | RULE-ORDER-RANKING-H5-006 / TC-ORDER-RANKING-H5-010 | Codex |

### 3.3 兼容与迁移影响

| 类型 | 是否涉及 | 风险 | 处理 | 验证 |
| --- | --- | --- | --- | --- |
| 老数据/历史状态 | 否 | 首次新建无老数据 | 首次空库自动建表并可写入演示数据 | 空库启动和刷新测试 |
| 老接口/老前端 | 否 | 无既有业务入口 | 只替换脚手架占位页 | 构建与根路径 smoke |
| SQL/索引/默认值 | 是 | 唯一约束或索引遗漏会导致重复订单 | schema + 迁移 + runtime prepared 初始化 | migration inspection、重复/并发 Case |
| 配置/密钥/订阅/缓存 | 是 | D1 binding 不可用会导致 503 | 保留 `.openai/hosting.json` 的 `DB` binding；无密钥 | 本地/部署 API smoke |
| 权限/审计/导入导出/定时任务 | 部分 | 录入页暂不鉴权 | 限定为演示地址并列入明日 P0 问题；无导出/定时任务 | 页面标识“演示版”；正式上线前阻断 |

### 3.4 变更预算

- 预计修改的文件/模块与 diff 规模：`app/**`、`components/order-race/**`、`db/**`、`lib/order-race/**`、`drizzle/**`、`public/**`、`package.json`、`package-lock.json`、`docs/**`；约 18~28 个文件，产品代码约 1200~2000 行。
- 明确不得改动：其他 LGTG 仓库、现有 QA/生产配置、共享分支、Jenkins、外部商城接口、身份权限系统和范围外业务规则。
- 当前已知并行任务与文件交集：新仓库无并行任务；`lgtg_e2e_test` 当前共享工作区有他人改动，本轮不直接修改该脏工作区，先用本项目 API/浏览器测试并在 B.4.5 预留回归资产路径。
- 本次追加修改预算：仅 `components/order-race/big-screen.tsx`、`app/globals.css` 与本任务 `docs/**`；不得修改 `/control` 页面、API、D1 表、订单计数、轮询、视觉主题或响应式布局。

### 3.5 发现来源检查

| 发现来源 | 状态 | 发现的 IMP/风险 | 核对方法与证据 | Owner |
| --- | --- | --- | --- | --- |
| 生产代码路径、调用链、依赖注入 | 覆盖 | IMP-001~004；脚手架无业务代码 | 已读 app/db/vite/package 配置和 UI 组件导出 | Codex |
| API、route、页面、入口、调用方 | 覆盖 | IMP-001/002；4 个 API、2 个页面 | A 场景与 1.2 数据流映射 | Codex |
| DB、SQL、model、索引、历史数据 | 覆盖 | IMP-003；2 表 3 索引；首次空库 | D1/Drizzle 设计和 2.1 契约 | Codex |
| 事件、回执、重试、定时任务、消息 | 不适用：本期只有 HTTP 轮询；证据：1.2/2.3；替代控制：定时查询；Owner：Codex；重新启用触发条件：正式推送；日期：2026-08-31 | 无 | 2.3 完整不适用说明 | Codex |
| 状态、权限、金额、事务、并发 | 覆盖 | IMP-002/003；重复订单并发和演示权限风险 | 1.5、2.4、2.5、TC-ORDER-RANKING-H5-004/008 | Codex |
| 配置、密钥、订阅、缓存、迁移 | 覆盖 | IMP-003；DB binding 与迁移 | `.openai/hosting.json`、Drizzle 生成 | Codex |
| 上下游、外部系统、旧入口和回归 | 覆盖 | 新项目无外部调用；占位首页被替换 | A.3 边界与 3.2 | Codex |
| 并行任务、共享文件、发布资源、fixture | 覆盖 | 独立仓库；E2E 脏工作区只读 | git 状态核对；不改共享分支/fixture | Codex |

### 3.6 IMP 到验证的映射

| IMP ID | Rule IDs | 回归 Case IDs | 选择器/测试集/命令 | 状态 |
| --- | --- | --- | --- | --- |
| IMP-001 | RULE-ORDER-RANKING-H5-004/005 | TC-ORDER-RANKING-H5-001/006/007/009 | 构建 + 大屏/录入页浏览器 smoke | 已映射 |
| IMP-002 | RULE-ORDER-RANKING-H5-001/002/003/005 | TC-ORDER-RANKING-H5-001~006/008/009 | 4 个 API 的成功、拒绝和刷新 Case | 已映射 |
| IMP-003 | RULE-ORDER-RANKING-H5-001/002/003 | TC-ORDER-RANKING-H5-001~005/008/009 | migration + D1 API smoke + 并发重复 Case | 已映射 |
| IMP-004 | RULE-ORDER-RANKING-H5-004/005 | TC-ORDER-RANKING-H5-006/007 | 浏览器响应式与页面元数据 | 已映射 |
| IMP-005 | RULE-ORDER-RANKING-H5-006 | TC-ORDER-RANKING-H5-010 | 文档 requirements/design/candidate 校验 | 已映射 |
| IMP-006 | RULE-ORDER-RANKING-H5-007 | TC-ORDER-RANKING-H5-011 | 大屏源码/渲染结果无录入入口 + `/control` 独立地址 200 + 构建 | 已映射 |

## 4. 用例矩阵

### 4.1 业务规则

| Rule ID | 规则 | 来源 Scenario/Contract IDs | 权威数据源 | 业务交付级别 | Case IDs |
| --- | --- | --- | --- | --- | --- |
| RULE-ORDER-RANKING-H5-001 | 合法姓名可新增/导入，同名和非法姓名不产生重复或空数据 | S-003/S-006；DATA-001；API-002/003；STATE-001 | D1 participants | 必须交付（P0） | TC-ORDER-RANKING-H5-003/005 |
| RULE-ORDER-RANKING-H5-002 | 合法新订单只能写入一次并归属所选人员 | S-002；DATA-002；API-004；STATE-002 | D1 orders | 必须交付（P0） | TC-ORDER-RANKING-H5-002 |
| RULE-ORDER-RANKING-H5-003 | 重复或并发的同一订单最多产生一行业务结果，原归属不变 | S-005/S-007；DATA-002；STATE-003 | D1 orders 唯一索引 | 必须交付（P0） | TC-ORDER-RANKING-H5-004/008 |
| RULE-ORDER-RANKING-H5-004 | 排名由订单聚合产生，刷新和轮询后与服务端一致 | S-001/S-007；DATA-003；API-001 | D1 查询结果 | 必须交付（P0） | TC-ORDER-RANKING-H5-001/006/009 |
| RULE-ORDER-RANKING-H5-005 | 大屏在横向尺寸下展示清晰的科技竞速效果，失败时不显示虚假成功 | S-004/S-006；ERROR-001/003 | UI + API | 本期应做（P1） | TC-ORDER-RANKING-H5-006/007 |
| RULE-ORDER-RANKING-H5-006 | 代码和数据严格限制在新项目与演示 D1，不影响其他仓库/环境 | BOUNDARY-ORDER-RANKING-H5-002；PERM-ORDER-RANKING-H5-001；IMP-005 | Git diff + 环境配置 | 必须交付（P0） | TC-ORDER-RANKING-H5-010 |
| RULE-ORDER-RANKING-H5-007 | 大屏只承担排名展示，不包含录入控制台入口；录入页保持独立地址可直接访问 | REQ-ORDER-RANKING-H5-005；CAP-ORDER-RANKING-H5-006；S-008；AC-ORDER-RANKING-H5-008；IMP-006 | UI 路由与渲染结果 | 必须交付（P0） | TC-ORDER-RANKING-H5-011 |

### 4.2 状态、动作与不变量

| 当前状态 | 动作 | 前置条件 | 应允许 | 目标状态/错误 | Invariant ID | Case ID |
| --- | --- | --- | --- | --- | --- | --- |
| 人员不存在 | 新增姓名 | 姓名合法且未占用 | 是 | 人员存在 | INV-ORDER-RANKING-H5-001 | TC-ORDER-RANKING-H5-003 |
| 人员存在 | 录入新订单 | 订单合法且未占用 | 是 | 订单存在并归属该人 | INV-ORDER-RANKING-H5-002 | TC-ORDER-RANKING-H5-002 |
| 订单存在 | 重复录入 | 任意人员 | 否 | 409，原记录不变 | INV-ORDER-RANKING-H5-002/003 | TC-ORDER-RANKING-H5-004 |
| 订单不存在 | 两请求并发录入 | 同一 normalized 订单号 | 仅一个允许 | 最终只有一行 | INV-ORDER-RANKING-H5-002/003 | TC-ORDER-RANKING-H5-008 |
| 任意已保存状态 | 刷新/轮询 | API 可用 | 是 | UI 收敛到 D1 当前值 | INV-ORDER-RANKING-H5-004 | TC-ORDER-RANKING-H5-006/009 |

| Invariant ID | 任意操作后必须成立的规则 | 断言层 |
| --- | --- | --- |
| INV-ORDER-RANKING-H5-001 | participants 不存在空姓名，normalized_name 最多一行 | API/DB |
| INV-ORDER-RANKING-H5-002 | order_no_normalized 全场最多一行，且 participant_id 创建后不被本期接口修改 | API/DB |
| INV-ORDER-RANKING-H5-003 | 被拒绝的新增或录单不产生部分写入 | API/DB |
| INV-ORDER-RANKING-H5-004 | 榜单分数等于该人员 orders 行数，总订单数等于 orders 总行数 | UI/API/DB |
| INV-ORDER-RANKING-H5-005 | 页面刷新和多个只读大屏不会修改业务数据 | UI/API/DB |

### 4.3 用例矩阵

| Case ID | Rule IDs | Scenario/Contract IDs | 类型 | 业务交付级别 | 前置数据/角色/状态 | 操作步骤 | 预期与禁止结果 | 层级 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-ORDER-RANKING-H5-001 | RULE-ORDER-RANKING-H5-004 | S-001/API-001/DATA-003 | 正常/只读 | 必须交付（P0） | 演示 D1 已有人员和订单 | GET ranking 并打开大屏 | 数量、次序、统计一致；无写入 | L1/L2/L3 |
| TC-ORDER-RANKING-H5-002 | RULE-ORDER-RANKING-H5-002/004 | S-002/API-004/STATE-002 | 正常/联调 | 必须交付（P0） | 已有人员，新订单号 | POST order，等待大屏轮询 | 201；orders +1；对应分数 +1；禁止加错人 | L1/L2/L3 |
| TC-ORDER-RANKING-H5-003 | RULE-ORDER-RANKING-H5-001 | S-003/API-002/003/STATE-001 | 正常/边界 | 必须交付（P0） | 无目标姓名 | 单个新增，再导入含新名/重名的多行 | 新名创建、重名忽略、空行忽略 | L1/L2/L3 |
| TC-ORDER-RANKING-H5-004 | RULE-ORDER-RANKING-H5-003 | S-005/API-004/STATE-003 | 禁止/重复 | 必须交付（P0） | 订单已存在 | 再次提交给同人和另一人 | 409 返回原归属；orders 行数不变 | L1/L2/L3 |
| TC-ORDER-RANKING-H5-005 | RULE-ORDER-RANKING-H5-001/002 | S-006/API-002/003/004 | 异常/边界 | 必须交付（P0） | 空/过长字段、不存在人员 | 分别提交 | 400/404；participants/orders 不变 | L1/L2 |
| TC-ORDER-RANKING-H5-006 | RULE-ORDER-RANKING-H5-004/005 | S-006/S-007/ERROR-003 | 扰动/恢复 | 必须交付（P0） | 已有成功画面 | 模拟一次查询失败后恢复 | 显示重试状态，不清空最后数据；恢复后更新 | L2/L3 |
| TC-ORDER-RANKING-H5-007 | RULE-ORDER-RANKING-H5-005 | S-004/AC-004 | 视觉/响应式 | 本期应做（P1） | 代表性榜单 | 1920×1080、1366×768、超宽横屏查看 | 无横向滚动/裁切；科技动效不遮挡文字 | L2/L3 |
| TC-ORDER-RANKING-H5-008 | RULE-ORDER-RANKING-H5-003 | S-005/S-007/DATA-002 | 并发 | 必须交付（P0） | 新订单号、两个参与者 | 同时 POST 相同订单号 | 一个 201、一个 409；orders 只增加 1 | L1/L2 |
| TC-ORDER-RANKING-H5-009 | RULE-ORDER-RANKING-H5-004 | S-007/INV-ORDER-RANKING-H5-004/005 | 回归/刷新 | 必须交付（P0） | 已完成新增与录单 | 刷新两页面并再次 GET ranking | 数据不丢、次序一致、刷新不写数据 | L2/L3 |
| TC-ORDER-RANKING-H5-010 | RULE-ORDER-RANKING-H5-006 | A.3.3/A.3.4/IMP-005 | 结构/边界 | 必须交付（P0） | 候选 diff | 检查 changed paths 和工作区 | 仅允许路径有变化；无其他仓库写入 | L0/L2 |
| TC-ORDER-RANKING-H5-011 | RULE-ORDER-RANKING-H5-007 | S-008/AC-008/IMP-006 | UI/路由隔离 | 必须交付（P0） | 大屏与录入路由可运行 | 检查大屏源码与根页面渲染结果，再直接请求 `/control` | `/` 无“录入控制台”按钮、链接及 `/control` 跳转；`/control` 返回 200；禁止改变录入与计数逻辑 | L0/L1/L2/L3 |

### 4.4 数据库影响契约

| Case ID | 写入意图 | 权威系统/表与记录定位 | 操作 | 预计行数 | 字段 before -> after | 必须不变 | 关联/禁止副作用 | 一致性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-ORDER-RANKING-H5-001 | READ/READ_ONLY | D1 participants/orders，全表演示数据 | SELECT_ONLY | 写入 0 | 无 | 两表记录与计数 | 禁止 INSERT/UPDATE/DELETE | 立即一致 |
| TC-ORDER-RANKING-H5-002 | WRITE/APPLIED | D1 orders，`order_no_normalized=<run id>` | INSERT | 1 | ABSENT -> 指定订单/人员 | 既有订单、人员姓名 | 禁止额外订单或跨人修改 | 写后立即可查 |
| TC-ORDER-RANKING-H5-003 | WRITE/APPLIED | D1 participants，`normalized_name in <run names>` | INSERT | 新姓名数；重名 0 | ABSENT -> name/id/created_at | 既有人员和全部订单 | 禁止空姓名、重复 normalized 行 | 写后立即可查 |
| TC-ORDER-RANKING-H5-004 | WRITE/REJECTED | D1 orders，既有 normalized 订单号 | INSERT 拒绝 | 0 | existing -> existing | 原 participant_id、created_at | 禁止新增订单或改归属 | 立即一致 |
| TC-ORDER-RANKING-H5-005 | WRITE/REJECTED | D1 participants/orders，非法 key 或不存在 participant | INSERT 拒绝 | 0 | 无变化 | 全部既有记录 | 禁止部分写入 | 立即一致 |
| TC-ORDER-RANKING-H5-006 | READ/READ_ONLY | D1 participants/orders | SELECT_ONLY | 写入 0 | 无 | 两表记录 | 查询失败/恢复都禁止业务写入 | 最终在 2 秒内收敛 |
| TC-ORDER-RANKING-H5-008 | WRITE/APPLIED + WRITE/REJECTED | D1 orders，相同 normalized 新订单号 | 并发 INSERT | 总计 1 | ABSENT -> 唯一订单行 | 其他订单和人员 | 禁止 2 行、禁止两人各加 1 | 写后立即一致 |
| TC-ORDER-RANKING-H5-009 | READ/READ_ONLY | D1 participants/orders，当前 run id | SELECT_ONLY | 写入 0 | 无 | 刷新前记录 | 刷新/GET 禁止写入 | 立即一致 |
| TC-ORDER-RANKING-H5-010 | NONE/NO_WRITE | 无数据库操作；只检查 Git 路径 | NO_DB_ASSERTION | 0 | 无 | 所有业务数据 | 禁止访问其他环境 | 不适用；纯结构检查 |
| TC-ORDER-RANKING-H5-011 | NONE/NO_WRITE | 无数据库操作；只检查页面渲染和路由可达 | NO_DB_ASSERTION | 0 | 无 | participants/orders 全部记录 | 禁止因页面拆分产生任何业务写入 | 不适用；纯 UI/路由检查 |

### 4.5 测试资产路由与 E2E 打标

| Case ID | 场景 ID | 类型 | 目标仓库 | 计划测试文件 | Tag | 新增/修改 | 不能自动化时的原因与触发条件 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-ORDER-RANKING-H5-001 / TC-ORDER-RANKING-H5-002 | S-001/S-002 | Playwright/API | `lgtg_e2e_test` | `tests/modules/order-ranking-h5/specs/order-ranking-flow.spec.js` | `@order-ranking-h5-S001` / `@order-ranking-h5-S002` | 计划新增 | 本轮先用本地/部署浏览器和 API 证据；稳定演示 URL 后落永久资产 |
| TC-ORDER-RANKING-H5-003 | S-003 | Playwright/API | `lgtg_e2e_test` | `tests/modules/order-ranking-h5/specs/participant-management.spec.js` | `@order-ranking-h5-S003` | 计划新增 | 同上 |
| TC-ORDER-RANKING-H5-007 | S-004 | Playwright/人工视觉 | `lgtg_e2e_test` | `tests/modules/order-ranking-h5/specs/order-ranking-visual.spec.js` | `@order-ranking-h5-S004` | 计划新增 | 视觉质量仍需人工看图；自动化负责尺寸和溢出断言 |
| TC-ORDER-RANKING-H5-004 / TC-ORDER-RANKING-H5-008 | S-005 | API/并发 | `lgtg_e2e_test` | `tests/modules/order-ranking-h5/specs/order-dedup.api.spec.js` | `@order-ranking-h5-S005` | 计划新增 | 稳定演示 URL 后落永久资产 |
| TC-ORDER-RANKING-H5-005 / TC-ORDER-RANKING-H5-006 | S-006 | Playwright/API | `lgtg_e2e_test` | `tests/modules/order-ranking-h5/specs/order-ranking-errors.spec.js` | `@order-ranking-h5-S006` | 计划新增 | 稳定演示 URL 后落永久资产 |
| TC-ORDER-RANKING-H5-009 | S-007 | Playwright/API | `lgtg_e2e_test` | `tests/modules/order-ranking-h5/specs/order-ranking-persistence.spec.js` | `@order-ranking-h5-S007` | 计划新增 | 稳定演示 URL 后落永久资产 |
| TC-ORDER-RANKING-H5-010 | 无 | 结构 | `order-race-h5` | 交付脚本和 Git diff 检查 | `@order-ranking-h5` | 无新增文件 | 不适用：非业务场景基础检查 |
| TC-ORDER-RANKING-H5-011 | S-008 | Playwright/路由 | `lgtg_e2e_test` | `tests/modules/order-ranking-h5/specs/order-ranking-separation.spec.js` | `@order-ranking-h5-S008` | 计划新增 | 当前先以本项目源码、构建产物和两个路由的确定性检查验收；独立 E2E worktree 可用后落永久资产 |

### 4.6 执行层级

| 层级 | 是否需要 | 触发时点 | 命令/入口 | 通过标准 |
| --- | --- | --- | --- | --- |
| L0 | 是 | 每个实现点/提交前 | `npm run build`、`npm run lint`、`git diff --check`、文档校验 | 零错误且仅允许路径变化 |
| L1 | 是 | 窄行为 | 本地 4 个 API 的 curl/并发脚本 + 两个页面路由检查 | TC-ORDER-RANKING-H5-001~005/008/011 响应、D1 结果和页面职责正确 |
| L2 | 是 | 固定候选 | 本地大屏/录入页验证 + 受影响 API 重放 | TC-ORDER-RANKING-H5-001~011 通过或按设计记录延期 |
| L3 | 是 | Sites 演示地址发布后 | 部署地址大屏/录入页单点 smoke | 新增人员、新订单、重复拒绝、自动刷新和大屏无录入入口通过 |
| L4 | 否 | nightly | 不适用：单场演示、操作集小；TC-ORDER-RANKING-H5-008 确定性并发替代 | 正式多人活动或增加撤销/改绑时启用 |
| L5 | 否 | 大版本/计划门禁 | 不适用：首次独立演示，无跨模块全量套件 | 接入正式 LGTG 迭代时启用 |
| L6 | 否 | 缺陷重放 | 当前无已知缺陷 | 发现产品缺陷后立即新增固定重放 |

### 4.7 来源覆盖闭环

| 来源 | Source ID | 业务交付级别 | Rule IDs | Case IDs | TODO IDs | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| A | REQ-ORDER-RANKING-H5-001 / CAP-ORDER-RANKING-H5-001 / CAP-ORDER-RANKING-H5-002 / S-001 / S-002 / AC-ORDER-RANKING-H5-001 / AC-ORDER-RANKING-H5-002 | 必须交付（P0） | RULE-ORDER-RANKING-H5-002/004 | TC-ORDER-RANKING-H5-001/002 | TODO-001/002/003 | 已覆盖 |
| A | REQ-ORDER-RANKING-H5-002 / CAP-ORDER-RANKING-H5-003 / S-003 / AC-ORDER-RANKING-H5-003 | 必须交付（P0） | RULE-ORDER-RANKING-H5-001 | TC-ORDER-RANKING-H5-003/005 | TODO-001/003 | 已覆盖 |
| A | REQ-ORDER-RANKING-H5-003 / S-005 / AC-ORDER-RANKING-H5-005 | 必须交付（P0） | RULE-ORDER-RANKING-H5-003 | TC-ORDER-RANKING-H5-004/008 | TODO-001/003 | 已覆盖 |
| A | REQ-ORDER-RANKING-H5-004 / CAP-ORDER-RANKING-H5-005 / S-004 / AC-ORDER-RANKING-H5-004 | 本期应做（P1） | RULE-ORDER-RANKING-H5-005 | TC-ORDER-RANKING-H5-007 | TODO-002/004 | 已覆盖 |
| A | CAP-ORDER-RANKING-H5-004 / S-006 / S-007 / AC-ORDER-RANKING-H5-006 / AC-ORDER-RANKING-H5-007 | 必须交付（P0） | RULE-ORDER-RANKING-H5-004/005 | TC-ORDER-RANKING-H5-005/006/009 | TODO-001/002/003/004 | 已覆盖 |
| A | BOUNDARY-ORDER-RANKING-H5-001 / BOUNDARY-ORDER-RANKING-H5-002 / BOUNDARY-ORDER-RANKING-H5-003 / BOUNDARY-ORDER-RANKING-H5-004 / BOUNDARY-ORDER-RANKING-H5-005 | 后续优化/条件触发（P2/PC） | RULE-ORDER-RANKING-H5-006 | TC-ORDER-RANKING-H5-010 | TODO-005 | 已覆盖 |
| A | REQ-ORDER-RANKING-H5-005 / CAP-ORDER-RANKING-H5-006 / S-008 / AC-ORDER-RANKING-H5-008 | 必须交付（P0） | RULE-ORDER-RANKING-H5-007 | TC-ORDER-RANKING-H5-011 | TODO-006 | 已覆盖 |
| B | DATA-ORDER-RANKING-H5-001 / DATA-ORDER-RANKING-H5-002 / DATA-ORDER-RANKING-H5-003 | 必须交付（P0） | RULE-ORDER-RANKING-H5-001/002/003/004 | TC-ORDER-RANKING-H5-001~005/008/009 | TODO-001 | 已覆盖 |
| B | API-ORDER-RANKING-H5-001 / API-ORDER-RANKING-H5-002 / API-ORDER-RANKING-H5-003 / API-ORDER-RANKING-H5-004 | 必须交付（P0） | RULE-ORDER-RANKING-H5-001/002/003/004/005 | TC-ORDER-RANKING-H5-001~006/008/009 | TODO-001/003 | 已覆盖 |
| B | STATE-ORDER-RANKING-H5-001 / STATE-ORDER-RANKING-H5-002 / STATE-ORDER-RANKING-H5-003 | 必须交付（P0） | RULE-ORDER-RANKING-H5-001/002/003 | TC-ORDER-RANKING-H5-002~005/008 | TODO-001/003 | 已覆盖 |
| B | PERM-ORDER-RANKING-H5-001 | 后续优化/条件触发（P2/PC） | RULE-ORDER-RANKING-H5-006 | TC-ORDER-RANKING-H5-010 | TODO-005 | 已覆盖 |
| B | ERROR-ORDER-RANKING-H5-001 / ERROR-ORDER-RANKING-H5-002 / ERROR-ORDER-RANKING-H5-003 | 必须交付（P0） | RULE-ORDER-RANKING-H5-001/003/005 | TC-ORDER-RANKING-H5-004~006/008 | TODO-001/003/004 | 已覆盖 |
| B | IMP-001 / IMP-002 / IMP-003 / IMP-004 / IMP-005 / IMP-006 | 必须交付/本期应做（P0/P1） | RULE-ORDER-RANKING-H5-001~007 | TC-ORDER-RANKING-H5-001~011 | TODO-001~006 | 已覆盖 |

### 4.8 风险维度覆盖

| 风险维度 | 触发项/Contract ID | 必需 Case 类型 | Case IDs | 结论与不适用依据 |
| --- | --- | --- | --- | --- |
| 正向主流程 | S-001/S-002/S-003 | 正常 | TC-ORDER-RANKING-H5-001/TC-ORDER-RANKING-H5-002/TC-ORDER-RANKING-H5-003 | 覆盖 |
| 逆向、禁止、权限与数据范围 | S-005/S-006/PERM-ORDER-RANKING-H5-001 | 禁止/权限 | TC-ORDER-RANKING-H5-004/TC-ORDER-RANKING-H5-005/TC-ORDER-RANKING-H5-010 | 覆盖 |
| 参数、字段、空值、长度与极值 | ERROR-ORDER-RANKING-H5-001 | 异常/边界 | TC-ORDER-RANKING-H5-003/TC-ORDER-RANKING-H5-005 | 覆盖 |
| 下游失败、超时、事务回滚 | ERROR-ORDER-RANKING-H5-003 | 失败/回滚 | TC-ORDER-RANKING-H5-006 | 覆盖 |
| 重复、幂等、重试和补偿 | STATE-ORDER-RANKING-H5-003 | 重复/重试 | TC-ORDER-RANKING-H5-004/TC-ORDER-RANKING-H5-008 | 覆盖 |
| 并发、锁、乱序和版本冲突 | DATA-ORDER-RANKING-H5-002 | 并发/扰动 | TC-ORDER-RANKING-H5-008 | 覆盖 |
| 历史数据、兼容和旧入口回归 | IMP-001/IMP-003 | 历史/回归 | TC-ORDER-RANKING-H5-009/TC-ORDER-RANKING-H5-010 | 覆盖 |
| DB、迁移、索引、默认值 | DATA-ORDER-RANKING-H5-001/DATA-ORDER-RANKING-H5-002 | 数据/迁移 | TC-ORDER-RANKING-H5-001/TC-ORDER-RANKING-H5-002/TC-ORDER-RANKING-H5-003/TC-ORDER-RANKING-H5-004/TC-ORDER-RANKING-H5-005/TC-ORDER-RANKING-H5-008/TC-ORDER-RANKING-H5-009 | 覆盖 |
| 配置、密钥、订阅、缓存 | API-ORDER-RANKING-H5-001/IMP-003 | 配置/环境 | TC-ORDER-RANKING-H5-001/TC-ORDER-RANKING-H5-006 | 覆盖 |
| 可观测性、审计、禁止副作用 | ERROR-ORDER-RANKING-H5-001/ERROR-ORDER-RANKING-H5-002/ERROR-ORDER-RANKING-H5-003 | 日志/审计/零写入 | TC-ORDER-RANKING-H5-004/TC-ORDER-RANKING-H5-005/TC-ORDER-RANKING-H5-006/TC-ORDER-RANKING-H5-008 | 覆盖 |
| UI/API/Event/Target 多层一致性 | API-ORDER-RANKING-H5-001/API-ORDER-RANKING-H5-002/API-ORDER-RANKING-H5-003/API-ORDER-RANKING-H5-004 | 联调/L3 | TC-ORDER-RANKING-H5-001/TC-ORDER-RANKING-H5-002/TC-ORDER-RANKING-H5-003/TC-ORDER-RANKING-H5-004/TC-ORDER-RANKING-H5-005/TC-ORDER-RANKING-H5-006/TC-ORDER-RANKING-H5-007/TC-ORDER-RANKING-H5-008/TC-ORDER-RANKING-H5-009 | 覆盖 |
| 页面职责与直接导航 | S-008/IMP-006 | UI/路由隔离 | TC-ORDER-RANKING-H5-011 | 覆盖 |

## 5. 回归集选取

知识库尚无 `order-ranking-h5` 模块页和历史回归资产，因为这是首次建设。当前选择本任务全部 TC-ORDER-RANKING-H5-001~011；验收后再建立模块页并登记永久回归用例。

| 场景 ID | Tag | 测试文件 | 层级 | 选取理由（关联 IMP/影响） |
| --- | --- | --- | --- | --- |
| S-001~S-008 | `@order-ranking-h5` 及各场景 Tag | B.4.5 计划文件 | L1/L2/L3 | 首次建设，全部能力均受影响 |

- 模块全量回归命令：`npx playwright test --grep "@order-ranking-h5"`
- 本次选取范围与不选取的理由：选取全部首次建设场景；L4/L5 因独立 demo 和无历史模块而不执行，触发条件见 4.6。

## 6. 设计确认

- 必须交付（P0）业务影响与不可变旧流程确认人/依据：Human/Product Owner；A.6 对话确认；首次新建无旧流程。
- 技术影响面确认人/依据：Codex Technical Owner；已读脚手架、D1/Drizzle 配置、Sites 构建规范和完整允许路径。
- 测试覆盖审查人/依据：Codex Test Owner；A 全部稳定来源、B contract/IMP、风险维度均已映射到 TC/TODO。
- 新增业务决策：大屏与录入页完全分开，大屏不能出现录入控制台按钮或入口；已由 Human/Product Owner 于 2026-08-31 明确确认。
- 未知项数量：0
- 未映射来源数量：0
- 未覆盖必需风险维度：0
- 影响面确认结论：`通过`
- 测试覆盖确认结论：`通过`
- 测试设计状态：`可开发`
