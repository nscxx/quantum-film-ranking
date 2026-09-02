# 大屏与录入页分离验证（2026-08-31）

- Task：`LGTG-ORDER-RACE-DEMO-20260831`
- Case：`TC-ORDER-RANKING-H5-011`
- Candidate：`0d588f683faa42899ac86e843c9266e147591735`
- 环境：本地 Sites 开发服务，工作区基于 `07c1c42b2d436d09ab96fae9e3a8763e4e244421`
- 数据策略：只读页面与接口检查；未新增、修改或删除 participants/orders 数据。

## 变更边界

- 删除 `components/order-race/big-screen.tsx` 中指向 `/control` 的按钮和 `next/link` 依赖。
- 删除 `app/globals.css` 中不再使用的 `.screen-control-link` 样式。
- 将大屏空榜提示改为纯展示文案，不再提及录入控制台。
- 未修改 `/control` 页面、API、D1 schema、排名计算、轮询和订单去重逻辑。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| 大屏源码、样式和根页面渲染结果中搜索“录入控制台”、`screen-control-link`、`href="/control"` | 通过：0 个匹配 |
| `GET http://localhost:3000/` | 200 |
| `GET http://localhost:3000/control` | 200 |
| `GET http://localhost:3000/api/ranking` | 200；排名响应结构仍存在 |
| `npm run lint`（项目指定 Node 运行时） | 通过；0 错误 |
| `npm run build`（项目指定 Node 运行时） | 通过；`/`、`/control` 和 4 个 API 路由均被识别 |
| `git diff --check` | 通过；0 错误 |

首次直接使用系统 Node 18 执行 lint/build 时，工具链因 Node 版本过低无法启动；改用项目指定的 Node 运行时后同一代码立即通过。该失败归类为本地执行环境不匹配，不是产品或测试断言失败。

## 结论

`TC-ORDER-RANKING-H5-011` 本地 L0/L1/L2 通过：大屏已成为纯排名展示页，录入控制台仍可通过独立 `/control` 地址直接访问，业务数据和计数逻辑没有被修改。
