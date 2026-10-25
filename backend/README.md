# WaytoAGI 后端 v4

独立后端交付目录。包括 HTTP API、调查 Worker、搜索与全文采集、核查、数据契约及 PostgreSQL 迁移；不包含前端页面。来源为 v4 分支提交 `5bf59c6`。根目录的旧工程保持独立，本目录命令均在 `backend/` 执行，依赖不引用目录外源码。

## 启动

需要 Node.js 24.x、npm 11+、PostgreSQL；本地示例可使用 Docker Compose。

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm run db:up
npm run db:migrate
npm run dev
```

已有 `.env` 时保留原文件。编辑 `.env` 配置数据库、模型与元宝/Tavily服务密钥。另开终端在本目录执行 `npm run worker`。API默认 `http://127.0.0.1:3200`；生产本地运行使用 `npm run build`、`npm start`。`GET /` 返回服务信息。

`src/contracts/` 是请求响应的权威格式。创建调查使用 `POST /api/investigations`，JSON为 `{"question":"你的问题","researchDepth":"AUTO"}`；通过返回的调查ID轮询详情。API不直接执行调查，Worker必须独立运行。

运行 `npm run check` 检查类型、lint及单测；配置独立 `TEST_DATABASE_URL` 后运行 `npm run test:db`；`npm run verify` 包括构建与真实隔离API/Worker检查。测试数据库名必须以 `_test` 结束。

见 [结构说明](结构说明.md) 和 [审核记录](审核记录.md)。当前是本地协作后端，认证、权限与限流尚未提供，尚未通过公开部署验收。
