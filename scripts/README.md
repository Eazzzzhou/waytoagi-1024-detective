# scripts 索引

脚本按用途分组；根 README 只维护安装、启动和完整验证命令，本文件说明各脚本的定位。所有脚本都可能读取 `.env`，但不得输出或提交凭据值。

## 自动验收（由 `npm run verify` 调用）

| 脚本 | 命令 | 说明 |
|---|---|---|
| `acceptance/runtime.ts` | `npm run test:runtime` | 隔离 schema、生产 Web 与独立 Worker 的真实进程检查 |
| `acceptance/bundles.ts` | `npm run audit:bundles` | 检查客户端产物是否包含服务端密钥、运行时或测试夹具；验证演示语料不在首屏、初始 JS 不超预算 |
| `acceptance/docs.ts` | `npm run docs:check` | 活跃文档的本地链接、标题锚点；跳过 `.cache/` 机器本地证据 |
| `acceptance/hygiene.ts` | `npm run hygiene` | Git 跟踪文件中的 exe/dll/压缩包和超过 2 MB 的大文件 |
| `acceptance/services.ts` | `npm run services:check` | 离线检查配置是否存在，不验证服务可用性 |
| `acceptance/advice-capture.ts` | `npm run advice:capture -- …` | 只读采集真实建议请求与绑定快照 |
| `db/migrate-test.ts` | `npm run db:test:migrate` | 只对以 `_test` 结尾的测试库应用迁移 |
| `d1/evaluate.ts` | `npm run d1:evaluate -- …` | 只读评估真实调查并只追加 `cases/runs/` 记录 |

验收产物写入 `.cache/acceptance/`，被 Git 忽略。命令结果摘要维护在 [docs/README.md](../docs/README.md)。

## 人工调查与采集

| 脚本 | 说明 |
|---|---|
| `investigation/enqueue.ts` | 直接向数据库入队一条调查；仍由 Worker 执行 |
| `investigation/capture.ts` | 只读 HTTP 轮询并保存调查、快照和回答；默认 `127.0.0.1:3405` |
| `investigation/compare-v4.ts` | 可选的同预算对照；必须显式传入 `--prompts`，不内置个人路径 |

## 采集质量实验

`collection/` 下的脚本用于 Provider 和正文读取的定向实验（搜索、浏览器渲染、样本回放）。它们不进入 `verify`，需要真实凭据和网络，输出写入 `research/`，该目录被 Git 忽略。实验结果只能证明当次调用，不能替代正式调查、D1 案例或人工验收。
