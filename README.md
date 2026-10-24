# 案卷 · AI 产品调查与证据核查平台

公共工程交接版。已完成 Next.js Web、PostgreSQL/Prisma、可靠异步队列、独立 Worker、Zod 数据契约、最小调查页面与验收工具。

**真实产品身份解析、元宝搜索、原文获取、模型核查与回答生成仍待甲接入。** 当前正式调查在 Worker 中明确失败为 `PROVIDER_NOT_CONFIGURED`，不会制造成功结果、原句或进度。公共工程验收通过不等于真实搜索业务完成。

## 已实现与边界

- 幂等创建调查与任务，数据库唯一约束和原子事务防止重复创建。
- SKIP LOCKED 领取、数据库时间租约、心跳、执行截止、过期恢复、有限自动重试和执行历史。
- 失效令牌不能续租或发布；快照／回答与完成状态在同一受令牌保护的事务发布。
- 快照版本唯一、数据库拒绝普通覆盖；JSONB 写前与读后校验，引用 ID 与所标原句匹配。
- 五个本地 HTTP API：首页提交、详情轮询、身份确认、有限手动重试、回答与证据展示。
- 测试使用专用测试数据库中的随机 schema，未配置真实服务时明确失败。

本版不包含真实搜索算法、D1 真实案例录入、补查执行、自动建议、认证／权限或限流。仅用于本地协作，不直接公开部署付费搜索入口。

## 完整启动步骤

要求 Node.js **24.x**、npm **11+**、运行中的 Docker Desktop 或 Docker Engine + Compose，终端能识别 `docker`。依赖精确版本由 package.json 和 package-lock.json 锁定；在项目根目录执行所有命令。

首次安装与迁移：

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run db:up
npm run db:migrate
npm run db:test:migrate
```

保留已有 `.env`。数据库变量与 Worker 参数的用途、默认值均写在 [.env.example](.env.example)。本地开发库为 localhost:55432/investigation，使用持久命名卷；测试库为 localhost:55433/investigation_test，容器重建后需重新迁移。容器端口只绑定回环地址，示例密码仅用于本地。

终端 A 启动 Web：

```powershell
npm run dev
```

终端 B 启动 Worker：

```powershell
npm run worker
```

打开 [127.0.0.1:3000](http://127.0.0.1:3000)，输入实际问题并提交。Worker 未启动时保持排队；当前提供方未配置时，Worker 保存真实失败，刷新仍可查看。Web 不自动启动 Worker，也不直接执行调查。

Ctrl+C 优雅关闭 Web/Worker。`npm run db:stop` 停止本工程数据库并保留开发库卷。Docker CLI 不在 PATH 时先补齐 Docker Desktop 的 CLI bin 路径并新开终端，不把机器安装路径写入工程脚本。

生产构建的本地预览：先 `npm run build`，再 `npm start`，Worker 仍需单独启动。当前 Worker 通过 tsx 运行 TypeScript，本地请安装完整依赖；未来生产部署需单独准备 Worker 构建／运行包，尚未提供公开部署配置。

## 验收命令

数据库启动、配置专用 TEST_DATABASE_URL 后：

```powershell
npm run db:validate
npm run verify
npm audit
```

| 命令 | 实际检查范围 |
|---|---|
| npm run check | 严格类型、ESLint、契约／边界／转义单元测试 |
| npm run test:db | 真实 PostgreSQL 竞争、恢复、引用、不可变、HTTP 与 Worker 集成测试 |
| npm run build | Prisma Client 生成与 Next.js 生产构建 |
| npm run test:runtime | 全新隔离 schema 的真实 Prisma migrate deploy、生产 Web/独立 Worker 进程、实际 HTTP、优雅关闭 |
| npm run audit:bundles | 构建产物未含当前配置的服务端敏感值、数据库运行时或夹具导入 |
| npm run docs:check | 活跃文档的本地链接有效性 |
| npm run verify | 顺序、失败即停止地执行上述验收；不跳过数据库测试 |

独立运行 test:runtime、audit:bundles 前先 build。详细结果、限制与修复项见 [公共工程验收记录与结论](docs/公共工程验收记录与结论.md)。测试夹具只证明基础设施和显示行为，不证明真实搜索或核查效果。

## 团队交接入口

- [系统架构与信任边界](docs/系统架构与信任边界.md)：运行单元、依赖、存储与信任边界。
- [业务数据契约与字段说明](docs/业务数据契约与字段说明.md)：唯一 Schema、字段、原句引用与历史兼容策略。
- [异步任务队列与租约恢复机制](docs/异步任务队列与租约恢复机制.md)：归属、时钟、状态、重试和发布语义。
- [HTTP接口与错误码说明](docs/HTTP接口与错误码说明.md)：请求、响应、错误码与仅文档预留的补查／建议契约。
- [三人职责分工与协作边界](docs/三人职责分工与协作边界.md)：甲的全部入口、丙的接口和组件／展示规范。
- [甲的真实服务接入方法](docs/甲的真实服务接入方法.md) · [丙的真实服务接入方法](docs/丙的真实服务接入方法.md)。

## 目录结构

```text
config/                 Vitest 与独立 Worker 的 TS 配置
infra/                  本地 PostgreSQL Compose（项目名和卷保持不变）
prisma/                 关系模型、已追加的迁移；禁止用 db push 代替迁移
public/fonts/           本地字体与许可
scripts/
  acceptance/           独立进程、构建配置泄露与文档检查
  db/                   测试库迁移命令
  investigation/        命令行幂等入队
src/
  app/                  Next 页面与 API Route Handlers
  components/investigation/  最小前端与 CSS Modules
  contracts/            浏览器与 Node 共用的 Zod 契约
  server/               公共队列／存储／HTTP，及待甲实现的服务接口
  worker/               独立 Node 生命周期与执行循环
  generated/            忽略的 Prisma 自动生成文件
tests/
  unit/                 无数据库的契约、安全与依赖边界测试
  integration/          真实 PostgreSQL 集成测试
  fixtures/             明确标识的测试数据，不能导入正式源码
  support/              隔离 schema、进程和浏览器测试宿主
docs/
  archive/              历史阶段记录，不是当前启动说明
  reference/队友交接包/  原始策划与素材，整体保留内部相对链接
  *.md                  当前唯一交接文档
.cache/                 忽略的 npm、TS 缓存、设计记录和验收报告
.next/、node_modules/    标准工具产物，不纳入源码交付
```

根目录仅保留 README、包与锁文件、Next/TypeScript/Prisma/ESLint 必要入口及环境约定。移动记录和维护原则见 [项目目录结构与文件迁移记录](docs/项目目录结构与文件迁移记录.md)。旧文档合并到中文业务契约、队列说明及三人协作文档；历史版本只留 archive，原始资料只留 reference。

密钥不写入仓库、浏览器、结果或 generationConfig。`.env`、缓存、构建物、自动生成 Client 均已忽略。当前尚无真实服务密钥变量；甲接入时同步实际环境校验和示例，不新增演示成功模式。
