# 案卷 · AI 产品调查与证据核查平台

v4 后端已并入根工程，调查与建议由同一 Worker 消费；结构与审核记录见 [后端 v4 结构说明](docs/后端v4结构说明.md) 和 [审核记录](docs/后端v4审核记录.md)。

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

打开 [本地页面](http://127.0.0.1:3405)。根页面默认使用 `src/frontend` 的正式入口，已接调查提交／状态轮询／身份澄清／重试／快照与建议；演示样稿有独立入口和明确标记。Web 不自动启动 Worker；独立 Worker 分别消费调查和建议任务，离线时任务保持排队。Ctrl+C 关闭进程；npm run db:stop 停止数据库并保留开发库卷。

生产构建的本地预览：npm run build 后执行 npm start，Worker 仍需单独启动并安装完整依赖。当前仅供本地协作，尚无公开部署、认证、权限或限流方案。

## 协作者拉取更新

在各自项目根目录保留已有 `.env`。Git 不传递 `.env`、密钥 CSV、数据库卷或原文缓存；配置路径按各自电脑填写，程序没有要求使用提交者的路径。例如原集成电脑可继续使用 `TENCENTCLOUD_WSA_APIKEY_FILE=C:/Users/qianchen/Downloads/apikey.csv`；数据库 URL、Chrome 路径和 local-tun 设置也保留各自实际环境。新增可选变量按 `.env.example` 合并，不覆盖原文件。

先处理个人未提交代码并停止 Web／Worker（Windows 下运行中的 Next 会锁住编译库），再在仓库根目录更新并执行：

```powershell
git pull --ff-only
npm ci
npm run db:migrate
npm run services:check
```

随后重启 Web 和独立 Worker，分别执行 `npm run dev`、`npm run worker`；生产预览改为重新 `npm run build` 后 `npm start`。已有可用 PostgreSQL 时不必另起默认容器，也不要替换原数据库账号或端口。验证时使用独立 TEST_DATABASE_URL，先运行 `npm run db:test:migrate` 再运行 verify。services:check 只检查配置存在，不代替真实调用。

本地调查记录、原始网页缓存不会因拉取提交自动出现在另一台电脑的数据库。仓库中的正式评估 JSON 和截图是留档，不能当作对方数据库已有这些调查；对方可用自己的配置发起新调查。

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
| npm run audit:bundles | 客户端产物中的受检配置值、服务端运行时、夹具导入、演示语料隔离和初始 JS 预算 |
| npm run docs:check | 活跃文档的本地链接和标题锚点；跳过 `.cache/` 机器本地证据 |
| npm run hygiene | Git 跟踪文件中的可执行/压缩包和超过 2 MB 的大文件 |
| npm run services:check | 离线服务配置检查，不输出凭据值或发网络请求；不代表服务已可用 |
| npm run advice:capture -- 调查ID 请求ID 新文件.json | 只读采集真实建议请求及绑定快照／客观回答，拒绝覆盖；默认本地 3405 端口 |
| npm run verify | 顺序执行上述检查，失败即停止 |
| npm audit | 依赖漏洞检查，需网络；不包含在 verify 中 |

单独运行 test:runtime、audit:bundles 前先 build。数据库测试必须使用不同库名、以 _test 结尾的 TEST_DATABASE_URL，测试只写随机 schema，不清理业务库。[CI](.github/workflows/verify.yml)复用 verify；本地通过不代表托管 CI 已运行。

D1 评估命令见 [runs 约定](cases/runs/README.md)。测试夹具只证明工程行为，不能证明真实搜索质量。

## 文件归属

- src/contracts：唯一可执行业务契约；src/server、src/worker：服务端与任务运行。
- src/app、src/frontend：页面、客户端交互与样式；当前团队统一维护全部模块。
- prisma、config、infra、scripts、tests：乙丙维护的公共工程与验收工具。
- docs：当前状态、分工、乙丙任务；cases：真实案例、参考、复核及只追加运行记录。
- [参考资料](docs/reference/队友交接包/README.md)：外部资料入口及素材收藏，不作为当前任务清单。
- public：favicon 等静态资源。正文与标题字体由 `src/app/layout.tsx` 的 Google Fonts 提供；离线时回退系统字体，仓库不再维护未使用的本地字体产物。

不提交 .env、缓存、构建产物、生成 Client 或密钥；不把参考判断和测试夹具导入正式调查。
