# 案卷 · AI 产品调查与证据核查平台

面向 AI 入门者，核查产品事实、官方宣称和使用报告，回答可回到原文；建议使用真实用户条件，证据不足就保留未知。

开发先读[当前状态](docs/README.md) → [甲与乙丙协作边界](docs/甲与乙丙协作边界.md)。乙丙执行[后续开发与验收方案](docs/乙丙开发与验收方案.md)。启动命令只在本文件维护。

## 本地启动

要求 Node.js 24.x、npm 11+、运行中的 Docker Engine / Desktop 和可用的 Docker Compose。在仓库根目录执行：

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run db:up
npm run db:migrate
npm run db:test:migrate
```

保留已有 .env；变量与默认值见 [.env.example](.env.example)。开发库为 localhost:55432/investigation，测试库为 localhost:55433/investigation_test，测试库重建后需重新迁移。

两个终端分别启动：

```powershell
npm run dev
```

```powershell
npm run worker
```

打开 [本地页面](http://127.0.0.1:3000)。Web 不自动启动 Worker；Worker 离线时任务保持排队。Ctrl+C 关闭进程；npm run db:stop 停止数据库并保留开发库卷。

生产构建的本地预览：npm run build 后执行 npm start，Worker 仍需单独启动并安装完整依赖。当前仅供本地协作，尚无公开部署、认证、权限或限流方案。

## 验证

```powershell
npm run db:validate
npm run verify
```

| 命令 | 检查范围 |
|---|---|
| npm run check | Web / Worker 类型、ESLint、单元测试 |
| npm run test:db | 专用 PostgreSQL 中的存储、队列、Worker、HTTP、D1 集成测试 |
| npm run build | Prisma Client 生成和生产构建 |
| npm run test:runtime | 隔离 schema 的真实迁移、生产 Web / 独立 Worker 进程与 HTTP |
| npm run audit:bundles | 客户端产物中的受检配置值、服务端运行时和夹具导入 |
| npm run docs:check | 活跃文档的内联本地链接目标 |
| npm run verify | 顺序执行上述检查，失败即停止 |
| npm audit | 依赖漏洞检查，需网络；不包含在 verify 中 |

单独运行 test:runtime、audit:bundles 前先 build。数据库测试必须使用不同库名、以 _test 结尾的 TEST_DATABASE_URL，测试只写随机 schema，不清理业务库。[CI](.github/workflows/verify.yml)复用 verify；本地通过不代表托管 CI 已运行。

D1 评估命令见 [runs 约定](cases/runs/README.md)。测试夹具只证明工程行为，不能证明真实搜索质量。

## 文件归属

- src/contracts：唯一可执行业务契约；src/server、src/worker：服务端与任务运行。
- src/app、src/components/investigation：甲维护的页面、客户端交互与样式。
- prisma、config、infra、scripts、tests：乙丙维护的公共工程与验收工具。
- docs：当前状态、分工、乙丙任务；cases：真实案例、参考、复核及只追加运行记录。
- [参考资料](docs/reference/队友交接包/README.md)：外部资料入口及素材收藏，不作为当前任务清单。
- public/fonts：本地字体及[来源与许可](public/fonts/字体文件来源与许可说明.md)。

不提交 .env、缓存、构建产物、生成 Client 或密钥；不把参考判断和测试夹具导入正式调查。
