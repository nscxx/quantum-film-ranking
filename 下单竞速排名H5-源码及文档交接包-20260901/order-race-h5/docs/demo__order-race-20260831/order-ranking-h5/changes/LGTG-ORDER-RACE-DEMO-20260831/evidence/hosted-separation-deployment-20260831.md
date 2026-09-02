# 页面分离 Version 2 在线发布证据（2026-08-31）

- Task：`LGTG-ORDER-RACE-DEMO-20260831`
- Case：`TC-ORDER-RANKING-H5-011`
- Candidate：`0d588f683faa42899ac86e843c9266e147591735`
- Sites source：`2519e4b15c682d456165ae3f9ddbe72266caae0d`
- 保存版本：Version 2
- 在线地址：`https://order-race-demo-20260831.vk2wrn7zjk.chatgpt.site`

## 发布结果

| 检查 | 结果 |
| --- | --- |
| source 推送 | 成功；远端 `main` 从 `988fc30...` 前进到 `2519e4b...` |
| 精确 source 构建 | 通过；`/`、`/control` 与 4 个 API 路由均生成 |
| Sites Version 2 保存 | 成功；保存版本绑定 source `2519e4b...` |
| 私有发布 | 成功；deployment 状态 `succeeded` |
| 访问范围 | `custom`；当前用户为 Owner；允许账号 1；群组 0；外部访客 0 |
| 稳定地址 | 与 Version 1 相同，已由 Version 2 接管 |

## 验收边界

Version 2 的打包产物来自已通过 `TC-ORDER-RANKING-H5-011` 的精确 source，已证明新代码部署成功且继续保持 Owner 私有访问。私有站点首次业务页面访问仍需要 Owner 完成 ChatGPT 登录授权；未绕过授权，因此在线页面的登录后人工查看与原有新增/录单业务流程仍保持 `QA验收中`，不能写成已全部验收。
