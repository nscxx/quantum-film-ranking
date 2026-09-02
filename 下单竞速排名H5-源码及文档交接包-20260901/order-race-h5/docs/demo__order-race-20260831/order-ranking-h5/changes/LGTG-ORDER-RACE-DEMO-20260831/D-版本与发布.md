---
task_id: "LGTG-ORDER-RACE-DEMO-20260831"
title: "下单竞速排名H5演示版"
document: "D-版本与发布"
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
required_readers: "评估、合入、发布、验收 AI"
decision_owner: "Implementation/Release Owner"
content_role: "版本治理与发布控制"
update_mode: "按候选与发布轮次追加"
document_stage: "候选、评审与发布"
completion_target: "QA"
updated_at: "2026-08-31T13:25:36.000Z"
---

# 下单竞速排名H5演示版｜版本与发布

> 本文件合并原 09/10：版本治理与发布控制的唯一权威源，候选冻结后开始维护。
> 快速通道不使用本文件（发布事实记录在 C 的轮次日志）。
> 候选、评审和 Git 记录按 SHA 追加；发布执行记录按环境和 build 追加；
> 回滚方案必须在发布前存在。

## 1. 版本与边界

| 项 | 值 |
| --- | --- |
| 仓库 | `order-race-h5` |
| iteration branch | `demo/order-race-20260831` |
| Base SHA | `f1492c7102034e88391fbb85aace7ee2417d302f` |
| Candidate SHA | `0d588f683faa42899ac86e843c9266e147591735` |
| 允许路径 | `app/**,components/order-race/**,db/**,lib/order-race/**,drizzle/**,public/**,package.json,package-lock.json,docs/**` |
| 实际路径 | `.openai/hosting.json`、`app/**`、`components/order-race/**`、`db/**`、`lib/order-race/**`、`drizzle/**`、`public/order-race-social-card.png`、`package.json`、本任务 `docs/**` |
| diff/fingerprint | 初版 `ba098f5`：25 files changed, 2074 insertions, 247 deletions；页面分离 Candidate `0d588f6`：6 files changed, 128 insertions, 40 deletions；产品改动仅删除大屏入口及其样式 |

## 2. 代码评审

### 2.1 Owner 代码审查

| 检查项 | 结论 | 证据/备注 |
| --- | --- | --- |
| 需求和边界一致 | 通过 | 姓名导入/新增、独立录单、全场订单去重、实时排名和科技横屏均已实现；明日问题未越界实现 |
| 无越界修改（对照 B.3.4 变更预算） | 通过 | 仅修改独立 `order-race-h5` 项目和本任务档案 |
| API/model 生成边界正确 | 通过 | API 使用 Vinext route；SQL 以 `db/schema.ts` 为权威源并由 Drizzle 生成迁移；go-zero/goctl 不适用 |
| 状态/权限/资金/事务/并发正确 | 通过 | D1 唯一约束保证全场订单去重；并发实测 201+409 且仅增加 1；演示权限风险明确保留为 Owner 私有访问 |
| 兼容、迁移、配置和回滚可控 | 通过 | 首次独立站点，无旧数据兼容；迁移文件已生成；Sites 可回退到上一保存版本 |
| 测试映射和证据完整 | 通过 | RUN-LOCAL-001~003 对应 TC-001~010，证据见 `evidence/local-validation-20260831.md` |
| 页面职责分离 | 通过 | Candidate `0d588f6` 中大屏无“录入控制台”文字、按钮、链接和专属样式；`/control` 与排名 API 均为 200，证据见 `evidence/separated-pages-validation-20260831.md` |

### 2.2 独立评估

不适用：风险通道不强制独立评估；Owner 自审已完成。

| 轮次 | Candidate SHA | Evaluator/模型 | Evidence | 阻断缺陷（P0） | 应修缺陷（P1） | 后续问题（P2） | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | `ba098f5d9f9f7b64ad8d05adfb374937144fd4c2` | 不适用（标准通道） | `evidence/local-validation-20260831.md` | 0 | 0 | 正式鉴权、误录改绑、活动历史按 A.3.2 明日确认 | 不适用 |
| R2 | `0d588f683faa42899ac86e843c9266e147591735` | 不适用（标准通道） | `evidence/separated-pages-validation-20260831.md` | 0 | 0 | 正式鉴权、误录改绑、活动历史按 A.3.2 明日确认 | 不适用 |

### 2.3 Findings 与修复

| Finding ID | 级别 | 问题 | 修复/延期 | 新 SHA | 复评结论 |
| --- | --- | --- | --- | --- | --- |
| REVIEW-NOTE-001 | 通过备注 | 本地验证发现的导入提示、首屏时钟和短横屏裁切均已在提交前修复并重跑 | 见 DEF-LOCAL-001~003 | `ba098f5d9f9f7b64ad8d05adfb374937144fd4c2` | 通过 |
| REVIEW-NOTE-002 | 阻断缺陷已修复 | Owner 指出大屏不应出现录入控制台按钮 | 删除大屏入口、空榜中的控制台提示和未使用样式，保持 `/control` 独立可达 | `0d588f683faa42899ac86e843c9266e147591735` | TC-011 通过 |

### 2.4 最终审查结论

- 代码审查结论：通过（页面分离 Candidate `0d588f683faa42899ac86e843c9266e147591735`）
- 阻断缺陷/应修缺陷/后续问题（P0/P1/P2）：阻断缺陷 0；应修缺陷 0；后续问题为正式鉴权、误录改绑、活动生命周期和人数规则。
- 残余风险与 Owner：演示录入入口没有鉴权，必须保持 Owner 私有访问；Owner 为 Human/Product Owner 与 Codex。

## 3. Commit、Push、合入与部署版本关系

| 时间 | 动作 | Source SHA | Target ref/SHA | 包含/等价证据 | 结果 |
| --- | --- | --- | --- | --- | --- |
| 2026-08-31 21:06 | 本地 commit | 工作区基于 `960c843e3116` | `ba098f5d9f9f7b64ad8d05adfb374937144fd4c2` | 25 个文件；产品、迁移、分享图与本地证据完整包含 | 通过；尚未推送共享 Git 分支 |
| 2026-08-31 21:07 | 文档 commit | `ba098f5d9f9f7b64ad8d05adfb374937144fd4c2` | `988fc30d4bd3d4bca2531a4b5a58b2eb27f6cae7` | 仅补充候选自审和发布准备；完整包含 Candidate | 通过 |
| 2026-08-31 21:08 | 推送 Sites source | `988fc30d4bd3d4bca2531a4b5a58b2eb27f6cae7` | Sites source `main` 同 SHA | Git push 成功，远端 HEAD 等于打包 source | 通过 |
| 2026-08-31 21:09 | 保存并私有发布 | `988fc30d4bd3d4bca2531a4b5a58b2eb27f6cae7` | Sites Version 1；私有演示 URL | 打包包含 `dist/server/index.js`、hosting metadata、Drizzle migration | 部署成功 |
| 2026-08-31 21:22 | 页面分离 commit | `07c1c42b2d436d09ab96fae9e3a8763e4e244421` | `0d588f683faa42899ac86e843c9266e147591735` | 产品改动仅在 `big-screen.tsx` 与 `globals.css`；同时包含 V2 需求、设计与本地验证证据 | 通过；准备发布新 Sites 版本 |
| 2026-08-31 21:22 | 发布准备文档 commit | `0d588f683faa42899ac86e843c9266e147591735` | `2519e4b15c682d456165ae3f9ddbe72266caae0d` | 仅补充 Candidate、发布状态和验证证据；完整包含页面分离 Candidate | 通过 |
| 2026-08-31 21:23 | 推送 Sites source | `2519e4b15c682d456165ae3f9ddbe72266caae0d` | Sites source `main` 同 SHA | Git push 成功，远端从 `988fc30...` 前进到 `2519e4b...` | 通过 |
| 2026-08-31 21:24~21:25 | 保存并私有发布 | `2519e4b15c682d456165ae3f9ddbe72266caae0d` | Sites Version 2；原私有演示 URL | 精确 source 重新构建并打包；deployment `succeeded` | QA部署完成 |

## 4. QA 发布检查

### 4.1 QA 发布清单

| 顺序 | 仓库/服务 | QA SHA | Jenkins Job | migration/config/cache | 可达性/业务探针 | 结果 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Sites 私有演示 | source `988fc30d4bd3d4bca2531a4b5a58b2eb27f6cae7`；Version 1 | 不适用 | D1 迁移随站点包发布；无额外配置/缓存 | 部署 succeeded；私有登录可达；D1 两表存在；业务 smoke 等待 Owner 首次授权 | QA部署完成 |
| 2 | Sites 私有演示（页面分离） | source `2519e4b15c682d456165ae3f9ddbe72266caae0d`；Version 2 | 不适用 | schema/config/cache 无变化；继续使用原 D1 | 部署 succeeded；Owner-only 策略不变；稳定地址已切换 Version 2 | QA部署完成 |

### 4.2 QA 验收前置

| 项 | 预期 | 实际 | Evidence | 结论 |
| --- | --- | --- | --- | --- |
| 候选包含/等价 | Sites 保存版本包含候选及后续文档提交 | source `988fc30d4bd3d4bca2531a4b5a58b2eb27f6cae7` 完整包含 Candidate `ba098f5...` | `evidence/hosted-validation-20260831.md` | 通过 |
| migration/config/cache | 包含 Drizzle migration；无额外配置/缓存 | `DB` 下存在 `participants`、`orders` | `evidence/hosted-validation-20260831.md` | 通过 |
| 服务可达 | 私有登录入口可达；登录后业务页可达 | 登录页可达；最终授权由 Owner 完成 | `evidence/hosted-validation-20260831.md` | QA验收中 |
| fixture/Case | 演示种子 + L3 新增/录单/重复拒绝 | 表为空，尚未进入业务页触发种子；待首次登录后执行 | `evidence/hosted-validation-20260831.md` | QA验收中 |

### 4.3 页面分离 Version 2 发布核对

| 项 | 预期 | 实际 | Evidence | 结论 |
| --- | --- | --- | --- | --- |
| Candidate/source 包含 | source 完整包含 `0d588f6` | `2519e4b15c682d456165ae3f9ddbe72266caae0d` 是 Candidate 后续文档提交 | `evidence/hosted-separation-deployment-20260831.md` | 通过 |
| 页面与路由 | 大屏无录入入口，`/control` 独立可达 | 精确 source 本地 TC-011 通过并重新打包；两路由均在构建结果中 | 同上 + `evidence/separated-pages-validation-20260831.md` | 通过 |
| 发布与访问范围 | Version 2 部署成功且仍仅 Owner | deployment succeeded；custom；允许账号 1、群组 0、外部访客 0 | `evidence/hosted-separation-deployment-20260831.md` | QA部署完成 |
| 登录后人工查看 | Owner 可看到新大屏并确认无入口 | 等待 Owner 首次登录授权后打开页面 | 同上 | QA验收中 |

## 5. 生产发布与数据变更

完成目标仅为 QA 时，本节按完整格式写不适用：
`不适用：<原因>；已核对范围/证据：<范围/证据>；风险 Owner：<Owner>；
替代控制：<控制>；重新启用触发条件：<条件>；日期：<时间>`。

### 5.1 生产发布计划

| 顺序 | 目标/服务 | 版本 | 动作 | Owner | 停止条件 | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 不适用：本任务完成目标仅为 QA 私有演示 | 不适用 | 不执行生产发布 | Codex | 若需要公开或正式活动使用则创建新任务 | 本任务 A.2/A.3.4 |

### 5.2 数据、配置、密钥与缓存

| 资源 | before | 变更 | verify | rollback | Owner |
| --- | --- | --- | --- | --- | --- |
| Sites 演示 D1 | 新站点空库 | 首次访问建立两表并写入演示种子 | 排名 API 和录入页统计一致 | 删除演示站点数据或发布全新演示版本；不影响其他环境 | Codex |

## 6. 回滚方案

| 触发条件 | 代码回滚 | 数据/配置回滚 | 验证 | 负责人 | 预计时间 |
| --- | --- | --- | --- | --- | --- |
| 页面或 API 无法访问 | Sites 回退到上一个可用保存版本；首次发布无旧版时暂停演示 | 保留 D1 便于诊断；若数据规则错误则停止录入并新建修复任务 | `/`、`/control`、`/api/ranking` 重新通过 | Codex | 15 分钟 |

## 7. 监控与线上验证

| 指标/日志/业务探针 | 基线 | 观察窗 | 告警阈值 | 异常动作 | Evidence |
| --- | --- | --- | --- | --- | --- |
| 页面可达与排名 API | 本地 200；在线私有登录可达，D1 两表存在 | 本次演示与明日确认期间 | 登录后页面非 200、排名 API 非 200 或录入后 2 秒仍未更新 | 停止录入，回退/修复后重测 | `evidence/hosted-validation-20260831.md` |

线上验证收口三判据（`线上验证中` → `已完成` 前逐项确认，默认观察窗 24–48 小时）：

- [ ] 错误日志无本次改动面的新增异常
- [ ] 模块核心业务指标正常（单量/金额/同步成功率等按适用填写）
- [ ] 运营同学抽查一条真实流程通过
- 灰度情况：【内部/运营先用? 全量时间? 或 不适用】

## 8. Go/No-Go 与关闭

- QA 发布授权：用户明确要求先给可操作 demo；仅覆盖 Owner 私有 Sites 演示。
- 生产发布授权：无；本任务不执行正式生产发布。
- QA Go/No-Go：Sites Version 2 已部署；QA验收中，等待 Owner 首次 ChatGPT 登录授权后查看新大屏并执行在线业务 smoke。
- 生产 Go/No-Go：不适用：完成目标为私有演示 QA，不得扩展为公开或正式活动使用。
- 回滚可执行性：通过；可暂停使用或回退 Sites 保存版本，D1 不影响其他系统。
- 最终发布/验收版本：当前发布为 Sites Version 2；source `2519e4b15c682d456165ae3f9ddbe72266caae0d`；登录后验收尚未完成。
- 生产里程碑（完成目标含生产时记录）：`生产部署完成`/`线上验证通过`：不适用。
- 未解决风险、Owner 和触发条件：在线业务 smoke 待 Human/Product Owner 完成首次私有登录；正式权限、误录修正和活动规则按 A.3.2 明日确认。
