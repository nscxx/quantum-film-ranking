# Cursor × Codex 分工

单一事实源：[PLAN.md](PLAN.md)。两套 Agent 都按它做，不另开需求。

工程目录：`下单竞速排名H5-源码及文档交接包-20260901/order-race-h5/`

## 谁做什么

| 人 | 负责 | 不碰 |
|---|---|---|
| **Codex** | 数据、规则、接口、后台、测试 | `big-screen.tsx` 视觉层、切图、叠图校准 |
| **Cursor** | 大屏一比一视觉、切图、1920×1080 叠图验收 | schema、积分公式、撤销、登录、权重 |

Codex 先把「骨」做硬；Cursor 只消费 `GET /api/ranking` 的类型，不在前端重算积分。

## 文件所有权

**Codex 独占**

- `db/schema.ts`、`db/order-race.ts`、`drizzle/**`
- `app/api/**`
- `lib/order-race/**`（含 `SCORE_COLOR_BANDS`、套餐权重、31 省常量、`RankingSnapshot`）
- `components/order-race/control-panel.tsx`
- `app/control/page.tsx`
- 积分 / 撤销 / 幂等 / 色档测试

**Cursor 独占**

- `components/order-race/big-screen.tsx`
- `app/globals.css` 里大屏相关样式（`.race-*` 可整段替换）
- `public/` 大屏素材（底板、3D 图标、城市剪影、logo、标准地图 SVG）
- 开发期叠图工具

**交接面（两人只读、Codex 先写死）**

- `GET /api/ranking` 响应类型
- `PACKAGE_WEIGHTS`（A130 / B170 / C100）
- `SCORE_COLOR_BANDS`（0–999 青蓝 … 7000+ 金）
- 31 省 `province_code` 列表

Cursor 大屏只渲染这些字段，禁止在浏览器里用套餐单数自己乘权重。

## 推荐顺序

```text
第 1 拍  Codex
         常量 + 新表 order_events + ranking/orders/revoke/login
         控制台：选省 + 选套餐 +1 + 撤销 + 口令
         大屏先留一个能显示 JSON 的占位（可丑）
         跑通 PLAN「测试与验收」里除截图以外的条目

第 2 拍  Cursor
         等 RankingSnapshot 类型稳定
         切图四层：科技底板 / 透明 3D / 动态 SVG 地图 / DOM 文字
         固定 1920×1080，按 1536×864 ×1.25 对位
         地图 fill 只读 colorBand，不写自己的色阶

第 3 拍  对打
         Codex 用后台连打加分/撤销/边界分
         Cursor 叠图看热力、三甲、底部三卡是否跟数据走且不跳布局
```

不要两个人同时改 `big-screen.tsx` 或 `db/order-race.ts`。

## 和旧讨论的差异（以 PLAN.md 为准）

- 地图要**动态着色**，不是纯切图死底板。
- 公开展示用自然资源部标准地图，不用运行时热链阿里 DataV。
- 要软撤销、`requestId` 幂等、控制台口令登录。
- 新空 D1，不迁旧人名，不写演示种子。
- 第 31 名在地图里，不进左右侧榜。

## 给 Codex 的开场提示词

把下面整段贴进 Codex（工作目录设到 `order-race-h5`）：

```text
按仓库根目录上一层的 PLAN.md 实施「骨」：积分规则、D1、API、控制台、测试。

不要做大屏视觉一比一，不要改 big-screen.tsx 的最终视觉。最多留一个能打 GET /api/ranking 的占位页。

必须：
- 套餐权重只在服务端：A130 B170 C100，客户端不能提交分数
- POST /api/orders { requestId, provinceCode, packageCode }
- POST /api/orders/[id]/revoke 软撤销
- GET /api/ranking 返回 31 省积分、排名、colorBand、套餐积分与占比、总积分
- SCORE_COLOR_BANDS 与 PLAN 五档阈值一致
- 删除人员新增、名单导入、订单号接口
- 控制台：选省、选 A/B/C、确认 +1、最近记录撤销、口令登录
- 新空 D1，不 seed 旧人名
- 先写死 lib/order-race 的类型和常量，供 Cursor 接大屏

验收用 PLAN.md「测试与验收」除截图叠图以外的全部条目。
```

## 给 Cursor 的开场（我这边）

等 Codex 把 `lib/order-race/types.ts` 和 ranking 接口合完后开始视觉。地图 SVG 的每个省 `data-code` 对齐 Codex 的 `province_code`，颜色只查 `colorBand`。
