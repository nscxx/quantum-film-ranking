# 在线演示验证证据｜2026-08-31

- 任务：`LGTG-ORDER-RACE-DEMO-20260831`
- 演示地址：`https://order-race-demo-20260831.vk2wrn7zjk.chatgpt.site`
- Candidate：`ba098f5d9f9f7b64ad8d05adfb374937144fd4c2`
- Sites source：`988fc30d4bd3d4bca2531a4b5a58b2eb27f6cae7`
- 保存版本：Version 1

## 1. 发布事实

| 检查 | 结果 |
| --- | --- |
| 保存版本 | 成功；source SHA 与打包文件来自同一已构建状态 |
| 私有发布 | 成功；部署状态 `succeeded` |
| 访问范围 | `custom`；当前用户角色为 Owner；仅 1 个允许账号；0 个工作区群组；0 个租户群组；0 个外部访客 |
| D1 binding | `DB` 存在 |
| D1 表 | `participants`、`orders` 均存在，迁移已应用 |

## 2. 浏览器前置

- 在线地址可到达 Sites 登录页，标题为“需要登录”。
- 点击“使用 ChatGPT 继续”后进入账号选择和授权页。
- 授权页说明会把基本个人资料用于关联账号；自动化在最终“继续”前停止，没有代替用户分享资料。
- 当前 `participants` 为 0 行，说明尚未进入业务页面触发演示种子；这不是迁移失败。

## 3. 当前结论与继续条件

- `QA部署完成`：通过。
- 在线数据库前置：通过。
- 在线业务 smoke：等待 Owner 首次打开私有链接并完成 ChatGPT 登录授权。
- 登录后执行：打开 `/control` 新增一名演示人员，登记一张新订单，重复登记同订单，返回 `/` 检查 1 秒内数量和名次更新。
- 本文件不记录账号邮箱、授权 token、Cookie 或真实订单数据。
