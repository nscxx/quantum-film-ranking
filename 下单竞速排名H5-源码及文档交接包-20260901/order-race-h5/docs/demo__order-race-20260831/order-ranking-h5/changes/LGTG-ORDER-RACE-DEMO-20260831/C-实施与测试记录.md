---
task_id: "LGTG-ORDER-RACE-DEMO-20260831"
title: "下单竞速排名H5演示版"
document: "C-实施与测试记录"
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
required_readers: "所有接手与执行 AI"
decision_owner: "Current Task Owner"
content_role: "过程控制与执行证据"
update_mode: "TODO 当前态维护；轮次与执行记录仅追加"
document_stage: "全生命周期"
task_status: "QA验收中"
append_only_rounds: true
updated_at: "2026-08-31T13:25:36.000Z"
---

# 下单竞速排名H5演示版｜实施与测试记录

## 1. TODO 与施工顺序

### 1.1 全量 TODO

| TODO ID | 业务交付级别 | 顺序 | 任务 | 依赖 | 文件/表/API/页面 | Rule/Case | 完成标准 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TODO-001 | 必须交付（P0） | 1 | 建立 participants/orders schema、D1 helper 和 4 个 API | A/B 已确认 | `db/**`、`drizzle/**`、`app/api/**` | RULE-ORDER-RANKING-H5-001~004；TC-ORDER-RANKING-H5-001~005/008/009 | migration 可生成；API 正向、拒绝和并发结果符合契约 | 已完成 |
| TODO-002 | 必须交付（P0）/本期应做（P1） | 2 | 实现横向科技风大屏、轮询、排名和动效 | TODO-001 排名返回结构 | `app/page.tsx`、`components/order-race/big-screen.tsx`、`app/globals.css` | RULE-ORDER-RANKING-H5-004/005；TC-ORDER-RANKING-H5-001/006/007/009 | 首屏可识别；横向尺寸清晰；更新和失败状态正确 | 已完成 |
| TODO-003 | 必须交付（P0） | 3 | 实现独立录入页、单个新增、批量导入和订单去重反馈 | TODO-001 写 API | `app/control/**`、`components/order-race/control-panel.tsx`、`lib/order-race/**` | RULE-ORDER-RANKING-H5-001~005；TC-ORDER-RANKING-H5-002~006/008/009 | 主流程可操作，重复/非法不产生错误写入 | 已完成 |
| TODO-004 | 必须交付（P0）/本期应做（P1） | 4 | 执行构建、API、刷新、并发和横屏视觉验收，修复后重跑 | TODO-001~003 | 测试与 `evidence/**` | RULE-ORDER-RANKING-H5-001~006；TC-ORDER-RANKING-H5-001~010 | L0/L1/L2 全部有可追溯结果，必测失败已修复重跑 | 已完成 |
| TODO-005 | 本期应做（P1） | 5 | 发布私有演示地址，完成 L3 单点验收并整理明日问题 | TODO-004 | Sites 发布、A.3.2、D | TC-ORDER-RANKING-H5-001~009 | 演示地址可访问；大屏与录入页联动；问题按优先级列明 | 进行中 |
| TODO-006 | 必须交付（P0） | 6 | 删除大屏上的录入控制台入口，保持 `/control` 独立地址可直接访问 | `BIZ-ORDER-RANKING-H5-V2` 已确认 | `components/order-race/big-screen.tsx`、`app/globals.css`、`docs/**` | RULE-ORDER-RANKING-H5-007；TC-ORDER-RANKING-H5-011 | 大屏源码与渲染结果均无录入入口；`/control` 返回 200；构建和受影响检查通过 | 已完成 |

### 1.2 延期项（P1/P2/PC）

| TODO ID | 延期原因 | 风险 | Owner | 触发条件 | 计划版本 |
| --- | --- | --- | --- | --- | --- |
| DEFER-001 | 误录撤销/改绑和操作审计需明日确认 | 误录后演示版暂时无法修正 | Human/Product Owner | 明确修改权限和留痕规则 | 正式版 V2 |
| DEFER-002 | 登录/口令和角色权限需明日确认 | 演示录入链接不可公开传播 | Human/Product Owner | 多人或公开使用 | 正式版 V2 |
| DEFER-003 | 同分、人数、锁榜、历史场次、Excel 文件、品牌/音效和导出规则未确认 | 演示默认值可能需要替换 | Human/Product Owner | 明日按 A.3.2 顺序确认 | Demo 反馈迭代 |
| DEFER-004 | 永久 `lgtg_e2e_test` 回归资产暂不写入当前脏共享工作区 | 本轮先有本地/部署证据，跨任务复用性尚未形成 | Codex | 稳定演示 URL + 可用独立 E2E worktree | Demo 验收后 |

### 1.3 工程生成与执行顺序

1. `db/schema.ts` 定义 D1 表/索引。
2. 运行 `npm run db:generate` 生成并检查 `drizzle/*.sql`。
3. 在 `db/order-race.ts` 实现 prepared schema init、查询和写入。
4. 实现 Vinext `app/api/**/route.ts`；go-zero/goctl 不适用。
5. 先完成可识别的大屏首屏并展示预览，再扩展录入页和完整交互。
6. 每个实现点执行构建或窄 API 验证；最后执行 L0/L1/L2 和部署后 L3。

## 2. 测试执行与证据

### 2.1 执行策略

| 门禁/层级 | 范围 | 时点 | 命令/入口 | 通过标准 |
| --- | --- | --- | --- | --- |
| 本地快速 L0/L1 | 构建、lint、schema、4 个 API | 每个 TODO | `npm run build`、`npm run lint`、本地 API 请求 | 无构建错误；TC-ORDER-RANKING-H5-001~005/008 响应和 D1 影响正确 |
| 受影响回归 L2 | 大屏、录入页、刷新、并发、横屏尺寸、允许路径 | 固定候选 | 本地浏览器 + API 重放 + `git diff --check` | TC-ORDER-RANKING-H5-001~010 通过或有明确延期依据 |
| QA L3 | 私有演示地址的大屏/录入联动 | Sites 发布完成后 | 部署地址单点 smoke | 新增姓名、录入新订单、重复拒绝和自动刷新通过 |

### 2.2 环境、账号与数据

| 环境 | 版本/SHA | 账号/角色 | fixture/run_id | 写入范围 | 清理/保留策略 |
| --- | --- | --- | --- | --- | --- |
| 本地 Sites + D1 | 开发工作区；候选后回填 SHA | 无登录；演示录单人/观众 | `order-race-demo-local-20260831` | 项目专属本地 D1 | 保留演示数据；不触碰其他环境 |
| Sites 私有演示 | 部署后回填 deploy 标识 | 受控链接访客 | `order-race-demo-hosted-20260831` | 项目专属 D1 | 作为明日演示数据保留 |

### 2.3 执行记录（仅追加，禁止覆写旧 Run）

| Run ID | 时间 | 环境/SHA | Case | 执行范围 | 结果 | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| RUN-LOCAL-001 | 2026-08-31 20:54~21:04 | 本地；工作区基于 `960c843e3116` | TC-001~005/008 | schema 生成、API 正向/非法/不存在人员/同名/全局并发去重 | 通过；同一订单并发提交为 201+409，订单数仅增加 1 | `evidence/local-validation-20260831.md` |
| RUN-LOCAL-002 | 2026-08-31 20:57~21:03 | 本地；工作区基于 `960c843e3116` | TC-001~003/006/007/009 | 浏览器新增人员、录入订单、重复提示、大屏同步、1920×1080 与 1366×768 | 通过；两个尺寸无滚动，前 10 名和页脚完整显示 | `evidence/local-validation-20260831.md` |
| RUN-LOCAL-003 | 2026-08-31 21:03 | 本地；工作区基于 `960c843e3116` | TC-001~010 | `npm run lint`、`npm run build`、`git diff --check` | 通过；构建识别大屏、控制台和 4 个 API | `evidence/local-validation-20260831.md` |
| RUN-QA-001 | 2026-08-31 21:08~21:11 | Sites 私有演示；Version 1；source `988fc30d4bd3d4bca2531a4b5a58b2eb27f6cae7` | TC-001/009 前置 | 部署状态、Owner 私有访问、D1 migration、首次访问登录流程 | 部署成功；D1 两表存在；业务页面 smoke 等待 Owner 完成首次 ChatGPT 登录授权 | `evidence/hosted-validation-20260831.md` |
| RUN-LOCAL-004 | 2026-08-31 21:18~21:21 | 本地；工作区基于 `07c1c42b2d436d09ab96fae9e3a8763e4e244421` | TC-011 | 大屏入口静态检查、根页面与 `/control`/排名 API 可达、lint、build、diff check | 通过；大屏中相关文字/按钮/链接 0 匹配，`/`、`/control`、`/api/ranking` 均为 200 | `evidence/separated-pages-validation-20260831.md` |
| RUN-QA-002 | 2026-08-31 21:23~21:25 | Sites 私有演示；Version 2；source `2519e4b15c682d456165ae3f9ddbe72266caae0d` | TC-011 发布核对 | 精确 source 推送、构建产物保存、Owner 私有发布、部署状态和访问范围 | QA部署完成；deployment `succeeded`，稳定地址已切到 Version 2；登录后页面查看仍待 Owner 首次授权 | `evidence/hosted-separation-deployment-20260831.md` |

### 2.4 缺陷、修复与重跑

| Defect ID | 首次发现 | 分类 | 问题 | 修复 | 重跑结论 |
| --- | --- | --- | --- | --- | --- |
| DEF-LOCAL-001 | RUN-LOCAL-001 | 测试发现的产品问题 | 批量名单中同一次输入的重名未计入“忽略人数” | 忽略数改为有效输入数减实际新增数 | 相同姓名输入两次：新增 2、忽略 1、无效 1；通过 |
| DEF-LOCAL-002 | RUN-LOCAL-002 | 测试发现的产品问题 | 服务端和浏览器时区不同导致时钟首屏水合不一致 | 首屏使用稳定占位，挂载后再更新时间 | 重载后无错误弹层，后续完整流程通过 |
| DEF-LOCAL-003 | RUN-LOCAL-002 | 测试发现的产品问题 | 1366×768 初版第 9~10 名与页脚发生裁切 | 短横屏压缩页头、卡片间距与榜单行高 | 10 行均在页脚上方，页面高度等于 768；通过 |
| DEF-LOCAL-004 | Owner 反馈 / RUN-LOCAL-004 | 用户反馈的产品问题 | 大屏页头存在“录入控制台”按钮，未满足展示页与录入页彻底分开 | 删除按钮、跳转依赖、专属样式和空榜中的控制台提示；不修改独立录入页 | TC-011 重跑通过；大屏 0 个入口匹配，`/control` 仍为 200 |

### 2.5 未执行项与残余风险

| Case/层级 | 未执行原因 | 风险 | Owner | 触发条件 |
| --- | --- | --- | --- | --- |
| L4/L5 | 独立首次演示，无跨模块发布；确定性并发 TC-ORDER-RANKING-H5-008 已覆盖当前高风险 | 未覆盖长时间高并发和跨模块组合 | Codex | 正式多人活动或接入 LGTG 迭代 |
| 永久 E2E 资产 | 稳定 URL 尚未形成，现有 E2E 共享工作区有他人未提交改动 | 后续任务暂不能一条命令复用 | Codex | 私有演示地址稳定且新建独立 E2E worktree |
| Sites L3 业务 smoke | 私有站点首次访问要求 Owner 通过“使用 ChatGPT 继续”授权；自动化在分享基本资料前按安全规则停止 | 已证明部署、访问策略和 D1 表就绪，但尚未对在线订单写入作最终断言 | Human/Product Owner + Codex | Owner 首次打开演示地址并完成登录后立即重跑 TC-001~009 单点流程 |

### 2.6 证据索引

| Evidence ID | 文件 | 内容 | 隐私结论 |
| --- | --- | --- | --- |
| EVIDENCE-LOCAL-001 | `evidence/local-validation-20260831.md` | 构建、API、并发、浏览器流程和横屏尺寸结果 | 仅演示姓名与演示订单号；无 token、Cookie 或真实订单数据 |
| EVIDENCE-QA-001 | `evidence/hosted-validation-20260831.md` | Sites 版本、部署、私有访问、D1 表和登录阻断边界 | 不记录账号邮箱、token、Cookie 或真实订单数据 |
| EVIDENCE-LOCAL-002 | `evidence/separated-pages-validation-20260831.md` | 大屏无录入入口、独立录入地址可达、构建和受影响检查 | 无账号、token、Cookie、姓名或订单数据 |
| EVIDENCE-QA-002 | `evidence/hosted-separation-deployment-20260831.md` | Version 2 精确 source、私有访问与成功部署结果 | 不记录账号邮箱、token、Cookie 或真实订单数据 |

## 3. E2E 回归资产

本轮先保留目标资产映射，固定演示 URL 后在独立 `lgtg_e2e_test` worktree 落地；当前不修改有他人改动的共享工作区。

| 场景 ID | Tag | 测试文件（lgtg_e2e_test 内路径） | 层级 | 新增/更新 | 最近验证时间 |
| --- | --- | --- | --- | --- | --- |
| S-001/S-002 | `@order-ranking-h5-S001` / `@order-ranking-h5-S002` | `tests/modules/order-ranking-h5/specs/order-ranking-flow.spec.js` | L2/L3 | 计划新增 | 未执行 |
| S-003 | `@order-ranking-h5-S003` | `tests/modules/order-ranking-h5/specs/participant-management.spec.js` | L2/L3 | 计划新增 | 未执行 |
| S-004 | `@order-ranking-h5-S004` | `tests/modules/order-ranking-h5/specs/order-ranking-visual.spec.js` | L2/L3 | 计划新增 | 未执行 |
| S-005 | `@order-ranking-h5-S005` | `tests/modules/order-ranking-h5/specs/order-dedup.api.spec.js` | L1/L2/L3 | 计划新增 | 未执行 |
| S-006 | `@order-ranking-h5-S006` | `tests/modules/order-ranking-h5/specs/order-ranking-errors.spec.js` | L2/L3 | 计划新增 | 未执行 |
| S-007 | `@order-ranking-h5-S007` | `tests/modules/order-ranking-h5/specs/order-ranking-persistence.spec.js` | L2/L3 | 计划新增 | 未执行 |
| S-008 | `@order-ranking-h5-S008` | `tests/modules/order-ranking-h5/specs/order-ranking-separation.spec.js` | L0/L1/L2/L3 | 计划新增 | 未执行 |

## 4. 轮次日志（仅追加）

## R001 — 2026-08-31T12:48:00.000Z — 需求已确认

### 本轮目标

- 需求/问题：把已确认的“先做 demo”转成可开发的边界、技术设计和测试矩阵。
- 关联 Rule / Case / TODO：RULE-ORDER-RANKING-H5-001~006；TC-ORDER-RANKING-H5-001~010；TODO-001~005。
- 成功标准：A 中演示范围问题为 0；B 的影响、契约、Case、数据库影响和风险维度均有归属；生产代码尚未编辑。

### 实际工作

- 本轮设计/实现/测试/评审/发布摘要：初始化独立 Sites 项目和本地 Git；固定 Base SHA；建立 A/B/C/D 交付档案；从已确认对话整理业务目标、演示默认值、明日问题优先级和完整测试设计。
- 明确未修改：未编辑产品页面/API/schema；未修改其他 LGTG 仓库；未连接 QA/生产；未发布或写共享分支。
- 关联 TODO ID / Run ID / Evidence ID：TODO-001~005；尚无 Run/Evidence。
- 关联 Candidate/QA/Build 标识：Base `f1492c7102034e88391fbb85aace7ee2417d302f`；尚无候选/部署。
- 详细测试事实：尚未执行；代码/Git/发布事实：见 `D`。

### 问题、状态与下一触发

| 问题 | 分类 | 影响主场景 | 处理 |
| --- | --- | --- | --- |
| 正式权限、误录修正和活动规则尚未确认 | 后续项 | 否（已从 demo 范围排除） | 记录在 A.3.2，明日按优先级确认 |
| 永久 E2E 目标仓库当前有他人改动 | QA观察 | 否（本轮先在独立项目与浏览器验证） | 稳定 URL 后使用独立 worktree 落地 |

- 当前主状态：需求已确认
- 本轮里程碑：`BIZ-ORDER-RANKING-H5-V1` 已确认；设计待脚本校验。
- 发布占用：未涉及。
- 残余风险：演示录入入口不鉴权，不得作为公开生产入口。
- 下一步 / Owner / 触发条件：Codex 执行 requirements/design 校验；通过后进入研发中并实施 TODO-001。

## R002 — 2026-08-31T12:55:00.000Z — 研发中

### 本轮目标

- 需求/问题：执行开发前文档检查并解除测试设计阻断。
- 关联 Rule / Case / TODO：RULE-ORDER-RANKING-H5-001~006；TC-ORDER-RANKING-H5-001~010；TODO-001。
- 成功标准：`requirements` 与 `design` 两阶段结构检查通过。

### 实际工作

- 本轮设计/实现/测试/评审/发布摘要：修正文档稳定 ID、来源映射、数据库影响和风险覆盖格式；`requirements`、`design` 均通过。
- 明确未修改：尚未编辑大屏、录入页、API 或 D1 schema。
- 关联 TODO ID / Run ID / Evidence ID：TODO-001；无 Run/Evidence。
- 关联 Candidate/QA/Build 标识：Base `f1492c7102034e88391fbb85aace7ee2417d302f`。
- 详细测试事实：开发前文档检查通过；代码/Git/发布事实：见 `D`。

### 问题、状态与下一触发

| 问题 | 分类 | 影响主场景 | 处理 |
| --- | --- | --- | --- |
| 无开发前阻断 | QA观察 | 否 | 进入 TODO-001 |

- 当前主状态：研发中
- 本轮里程碑：测试设计状态=`可开发`。
- 发布占用：未涉及。
- 残余风险：正式鉴权和误录修正仍在演示范围外。
- 下一步 / Owner / 触发条件：Codex 实施第一个可识别的大屏首屏并展示预览。

## R003 — 2026-08-31T13:05:00.000Z — QA发布中

### 本轮目标

- 需求/问题：完成大屏、录入页、D1/API 和本地验收，形成可发布的演示版本。
- 关联 Rule / Case / TODO：RULE-ORDER-RANKING-H5-001~006；TC-ORDER-RANKING-H5-001~010；TODO-001~005。
- 成功标准：本地构建、接口并发去重、真实浏览器录入联动和两档横屏布局全部通过。

### 实际工作

- 本轮设计/实现/测试/评审/发布摘要：实现深色霓虹竞速大屏、独立录入控制台、名单新增/批量导入、全场订单去重、D1 持久化和每秒榜单更新；完成科技风分享图；本地 L0/L1/L2 通过，开始发布仅 Owner 可访问的 Sites 演示。
- 明确未修改：未修改其他 LGTG 仓库、共享分支、QA/生产数据库或 Jenkins；未增加正式鉴权、误录改绑和活动历史。
- 关联 TODO ID / Run ID / Evidence ID：TODO-001~005；RUN-LOCAL-001~003；EVIDENCE-LOCAL-001。
- 关联 Candidate/QA/Build 标识：Candidate `ba098f5d9f9f7b64ad8d05adfb374937144fd4c2`；Sites 部署标识待发布后回填。
- 详细测试事实：见 `evidence/local-validation-20260831.md`；代码/Git/发布事实：见 `D`。

### 问题、状态与下一触发

| 问题 | 分类 | 影响主场景 | 处理 |
| --- | --- | --- | --- |
| 批量导入忽略数、首屏时钟和短横屏裁切 | 已修复问题 | 否 | 均已修复并重跑通过，见 DEF-LOCAL-001~003 |
| 正式权限、误录修正和活动规则 | 后续项 | 否（演示范围外） | 明日按 A.3.2 顺序确认 |

- 当前主状态：QA发布中
- 本轮里程碑：开发自测通过。
- 发布占用：项目为独立 Sites 资源，无共享 LGTG 发布占用。
- 残余风险：录入页无鉴权，当前必须保持 Owner 私有访问。
- 下一步 / Owner / 触发条件：Codex 提交当前版本、发布私有 Sites 演示并执行部署后单点验收。

## R004 — 2026-08-31T13:11:00.000Z — QA验收中

### 本轮目标

- 需求/问题：把已通过本地验证的版本发布为 Owner 私有在线演示，并检查部署和在线数据前置。
- 关联 Rule / Case / TODO：RULE-ORDER-RANKING-H5-001~006；TC-ORDER-RANKING-H5-001~009；TODO-005。
- 成功标准：Sites Version 1 发布成功，访问范围仅 Owner，D1 两表存在；登录后可立即执行在线业务 smoke。

### 实际工作

- 本轮设计/实现/测试/评审/发布摘要：将 source `988fc30d4bd3d4bca2531a4b5a58b2eb27f6cae7` 保存为 Sites Version 1 并私有发布；部署状态为 succeeded；访问策略为 custom、仅 1 个 Owner、无群组和外部访客；在线 D1 已有 `participants`、`orders` 两表。
- 明确未修改：未扩大站点访问范围；未生成登录绕过 token；未在未经确认的情况下分享账号基本资料；未执行生产或共享 LGTG 发布。
- 关联 TODO ID / Run ID / Evidence ID：TODO-005；RUN-QA-001；EVIDENCE-QA-001。
- 关联 Candidate/QA/Build 标识：Candidate `ba098f5d9f9f7b64ad8d05adfb374937144fd4c2`；Sites source `988fc30d4bd3d4bca2531a4b5a58b2eb27f6cae7`；Version 1；部署成功。
- 详细测试事实：见 `evidence/hosted-validation-20260831.md`；代码/Git/发布事实：见 `D`。

### 问题、状态与下一触发

| 问题 | 分类 | 影响主场景 | 处理 |
| --- | --- | --- | --- |
| 私有站点首次访问需要 Owner 完成 ChatGPT 登录授权 | QA验收前置 | 是（仅影响在线业务 smoke，不影响已完成的本地全流程） | 已停在授权前，不代替用户分享账号资料；Owner 首次打开链接完成授权后继续 |

- 当前主状态：QA验收中
- 本轮里程碑：QA部署完成。
- 发布占用：独立 Sites 资源，无共享发布冲突。
- 残余风险：在线订单写入与轮询尚待登录后的单点重放；正式鉴权/误录规则仍是明日问题。
- 下一步 / Owner / 触发条件：Human/Product Owner 首次打开私有演示并完成“使用 ChatGPT 继续”；Codex 随后执行在线新增、录单、重复拒绝和大屏同步并更新结果。

## R005 — 2026-08-31T13:17:56.000Z — 研发中

### 本轮目标

- 需求/问题：根据 Owner 最新确认，将大屏与录入控制台彻底分开，大屏不再出现录入控制台按钮或入口。
- 关联 Rule / Case / TODO：RULE-ORDER-RANKING-H5-007；TC-ORDER-RANKING-H5-011；TODO-006。
- 成功标准：需求更新为 `BIZ-ORDER-RANKING-H5-V2` 并重新完成设计检查；随后仅删除大屏入口及其无用样式，独立 `/control` 地址和全部业务逻辑保持不变。

### 实际工作

- 本轮设计/实现/测试/评审/发布摘要：已先更新 A 的页面职责和验收标准，再从 V2 重新整理 B 的变更预算、规则、用例与验证方式；产品代码尚未编辑。
- 明确未修改：未修改 `/control` 页面、API、D1 schema、排名计算、轮询、订单去重、分享图和站点访问策略。
- 关联 TODO ID / Run ID / Evidence ID：TODO-006；尚无新 Run/Evidence。
- 关联 Candidate/QA/Build 标识：当前已部署版本仍为 Sites Version 1；新版本尚未形成。
- 详细测试事实：需求/设计检查待执行；代码/Git/发布事实：见 `D`。

### 问题、状态与下一触发

| 问题 | 分类 | 影响主场景 | 处理 |
| --- | --- | --- | --- |
| 大屏当前仍存在录入控制台按钮 | 产品缺陷 | 是 | 按确认后的 V2 需求删除并执行 TC-ORDER-RANKING-H5-011 |

- 当前主状态：研发中
- 本轮里程碑：`BIZ-ORDER-RANKING-H5-V2` 已确认，A/B 已重新整理。
- 发布占用：独立 Sites 资源，无共享发布冲突。
- 残余风险：新版本发布前，在线 Version 1 仍会显示旧入口。
- 下一步 / Owner / 触发条件：Codex 执行 requirements/design 检查；通过后修改 TODO-006，完成本地验证并重新发布私有 Demo。

## R006 — 2026-08-31T13:21:30.000Z — 研发中

### 本轮目标

- 需求/问题：实施并验证页面职责分离，修复 Owner 指出的旧大屏入口。
- 关联 Rule / Case / TODO：RULE-ORDER-RANKING-H5-007；TC-ORDER-RANKING-H5-011；TODO-006。
- 成功标准：大屏没有录入控制台相关文字、按钮、链接或样式；`/control` 和排名接口保持可达；构建通过。

### 实际工作

- 本轮设计/实现/测试/评审/发布摘要：删除大屏页头中的录入按钮、`next/link` 依赖和专属样式，并把空榜提示改为纯展示文案；本地 L0/L1/L2 全部通过。
- 明确未修改：未修改 `/control` 页面、API、D1 schema、排名计算、轮询、订单去重、分享图和站点访问策略；测试过程无业务写入。
- 关联 TODO ID / Run ID / Evidence ID：TODO-006；RUN-LOCAL-004；EVIDENCE-LOCAL-002。
- 关联 Candidate/QA/Build 标识：工作区基于 `07c1c42b2d436d09ab96fae9e3a8763e4e244421`；新 Candidate 待提交后回填 D。
- 详细测试事实：见 `evidence/separated-pages-validation-20260831.md`；代码/Git/发布事实：见 `D`。

### 问题、状态与下一触发

| 问题 | 分类 | 影响主场景 | 处理 |
| --- | --- | --- | --- |
| 系统 Node 18 无法启动当前构建工具链 | 环境阻断 | 否 | 使用项目指定的 Node 运行时重跑，lint/build 均通过 |
| 大屏存在录入入口 | 产品缺陷 | 是 | 修复后 TC-ORDER-RANKING-H5-011 通过 |

- 当前主状态：研发中
- 本轮里程碑：开发自测通过。
- 发布占用：独立 Sites 资源，无共享发布冲突。
- 残余风险：在线 Version 1 尚未替换，新版本发布前线上仍显示旧入口。
- 下一步 / Owner / 触发条件：Codex 精确提交本次修改，记录新 Candidate 后进入 QA发布中并重新发布私有 Sites Demo。

## R007 — 2026-08-31T13:22:27.000Z — QA发布中

### 本轮目标

- 需求/问题：固定本次页面分离修改的精确版本，并准备替换私有在线 Demo。
- 关联 Rule / Case / TODO：RULE-ORDER-RANKING-H5-007；TC-ORDER-RANKING-H5-011；TODO-006。
- 成功标准：代码与对应需求、设计、测试证据形成同一精确提交；发布内容完整包含该 Candidate。

### 实际工作

- 本轮设计/实现/测试/评审/发布摘要：已将产品改动、A/B/C 更新和本地验证证据精确提交；标准通道 Owner 自审通过，进入私有 Sites 发布准备。
- 明确未修改：未扩大允许路径、站点访问范围或业务写入范围；未修改录入页、API 和 D1。
- 关联 TODO ID / Run ID / Evidence ID：TODO-006；RUN-LOCAL-004；EVIDENCE-LOCAL-002。
- 关联 Candidate/QA/Build 标识：Candidate `0d588f683faa42899ac86e843c9266e147591735`；Sites 新版本待保存和发布。
- 详细测试事实：见 `evidence/separated-pages-validation-20260831.md`；代码/Git/发布事实：见 `D`。

### 问题、状态与下一触发

| 问题 | 分类 | 影响主场景 | 处理 |
| --- | --- | --- | --- |
| 无新的产品或测试问题 | QA观察 | 否 | 继续发布；保持 Owner 私有访问 |

- 当前主状态：QA发布中
- 本轮里程碑：开发自测通过；精确 Candidate 已提交。
- 发布占用：独立 Sites 资源，无共享发布冲突。
- 残余风险：在线 Version 1 仍是旧页面，需完成新版本部署。
- 下一步 / Owner / 触发条件：Codex 将包含 Candidate 的 source 推送到项目专属 Sites source，保存并私有发布新版本。

## R008 — 2026-08-31T13:25:36.000Z — QA验收中

### 本轮目标

- 需求/问题：将页面分离 Candidate 发布到原私有演示地址，并核对精确版本和访问范围。
- 关联 Rule / Case / TODO：RULE-ORDER-RANKING-H5-007；TC-ORDER-RANKING-H5-011；TODO-005/006。
- 成功标准：Sites source 完整包含 Candidate，Version 2 私有发布成功，地址不变且仍仅 Owner 可访问。

### 实际工作

- 本轮设计/实现/测试/评审/发布摘要：source `2519e4b15c682d456165ae3f9ddbe72266caae0d` 已推送并重新构建，保存为 Sites Version 2 后私有发布成功；稳定地址不变。
- 明确未修改：未扩大访问范围；未修改 D1 数据、运行环境变量、域名、录入页、API 或其他仓库；未生成或使用登录绕过凭据。
- 关联 TODO ID / Run ID / Evidence ID：TODO-005/006；RUN-QA-002；EVIDENCE-QA-002。
- 关联 Candidate/QA/Build 标识：Candidate `0d588f683faa42899ac86e843c9266e147591735`；source `2519e4b15c682d456165ae3f9ddbe72266caae0d`；Sites Version 2；部署成功。
- 详细测试事实：见 `evidence/hosted-separation-deployment-20260831.md`；代码/Git/发布事实：见 `D`。

### 问题、状态与下一触发

| 问题 | 分类 | 影响主场景 | 处理 |
| --- | --- | --- | --- |
| 私有站点业务页面仍需 Owner 首次 ChatGPT 登录授权 | QA验收前置 | 是（只影响登录后的在线人工查看和业务写入 smoke） | 已保持私有访问且不绕过授权；Owner 打开链接后可直接查看 Version 2 |

- 当前主状态：QA验收中
- 本轮里程碑：QA部署完成（Sites Version 2）。
- 发布占用：独立 Sites 资源，无共享发布冲突。
- 残余风险：在线页面内容和原有新增/录单链路仍需 Owner 登录后单点查看；本地页面分离、路由和构建已通过。
- 下一步 / Owner / 触发条件：Human/Product Owner 打开大屏地址确认页面上已无录入入口；如已完成首次授权，Codex 再继续原有在线业务 smoke。
