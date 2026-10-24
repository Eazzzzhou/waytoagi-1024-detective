# HTTP API · 公共工程交接版

Next.js Route Handlers 仅做输入校验、数据库读写与队列控制，不执行搜索、抓取、核查或模型调用。使用 Node.js runtime，所有 JSON 响应 `Cache-Control: no-store`。动态路径的 `id` 均为 UUID；本阶段没有调查列表接口。

默认 `npm run dev` / `npm start` 绑定 127.0.0.1。API 同时验证本地 URL、Host 与同源 Origin，拒绝跨站请求，不开放 CORS。未实现身份认证、访问控制和限流，**仅用于本地开发，不得直接公开部署付费搜索入口**；这些本地检查不代替部署时的认证与授权，也不支持将公共代理伪装为本地 Host。

## 已实现接口

### POST /api/investigations

- Header：`Content-Type: application/json`、必填 `Idempotency-Key`（去除首尾空白后 1–200 字符）。
- Body：`{ "question": "具体调查问题" }`，1–4000 字符，拒绝未知字段。
- 成功：202 `{investigationId, reused}`，Location 指向状态 API。
- 同一键与标准化问题重复提交返回原 ID；不同问题 409。调用现有 queue.enqueue，调查与任务在同一事务创建。
- API 不关心 Worker 是否在线：离线时状态保持 PENDING；实际执行失败后由 Worker 保存具体错误。

### GET /api/investigations/:id

200 返回 `InvestigationDetailSchema`：

```ts
{
  investigation: Investigation,
  identityConfirmation: { identity: ProductIdentity, reason: string } | null,
  retry: {
    allowed: boolean,
    reason: string,
    remaining: number,
    expectedAttemptCount: number
  }
}
```

调查包含原问题、真实状态、真实阶段、已脱敏错误、创建／开始／更新／结束时间和 resultSnapshotId。身份确认数据只在调查与 Job 都为 AWAITING_CONFIRMATION 时提供。状态与控制信息在同一 RepeatableRead 事务读取。不存在时 404。

不返回 Job 的执行令牌、租约、Worker ID、请求 hash、幂等键、数据库连接或模型密钥。

### POST /api/investigations/:id/identity

Body：`{identity: ProductIdentity, expectedAttemptCount: number}`。identity 必须满足 `ConfirmedIdentitySchema`：CONFIRMED、有效官网、至少一条完整确认依据。原句、来源链接和实际获取时间由用户／真实业务数据提供，不自动填造。

在现有队列事务内先锁 Job，再检查 Job 与调查确实处于等待状态、attemptCount 与前端读取值一致，然后恢复 PENDING。成功 202 `{investigationId, reused:false}`。

重复、并发或过期确认返回 409；输入不合法 400；调查不存在 404。本 API 使用严格等待模式；第二阶段服务方法对相同确认的只读幂等回执行为保留，不开放为重复 HTTP 确认成功。

### POST /api/investigations/:id/retry

Body：`{expectedAttemptCount: number}`，使用状态 API 提供的值。

只有 Job 与调查均 FAILED，lastError.retryable 为 true，且尚未达到两次手动重试上限时允许。PROVIDER_NOT_CONFIGURED、非法输入等不可重试错误直接 409。

在短事务 Job 行锁内检查状态及 attemptCount，然后只增加一次执行机会：maxAttempts 加 1、manualRetryCount 加 1、状态转 PENDING，清除当前租约和执行令牌，availableAt 使用数据库时间。不会重置 failureCount、attemptCount，不删除或覆盖 ExecutionAttempt；下一次领取仍由原有领取方法生成新 token。重复点击与跨次重放返回 409，不叠加重试机会。

成功 202 `{investigationId, reused:false}`。新增的 manualRetryCount 有数据库 0–2 CHECK 约束；原领取、续租、回收、超时和完成的归属检查不变。

### GET /api/snapshots/:id

200 返回 `{snapshot: EvidenceSnapshot, answers: Answer[]}`；回答按生成时间降序排列。通过 Repository 重新校验 JSONB、关联列、回答引用，随后再用 `SnapshotResponseSchema` 校验响应。不存在 404；损坏或不支持的契约 500，不回退成虚构内容。

## 错误与输入限制

错误响应统一为 `{error:{code,message}}`，与调查自身的业务执行错误区分。

| HTTP | code | 含义 |
|---|---|---|
| 400 | INVALID_INPUT | JSON、字段、ID、幂等键或身份数据无效 |
| 403 | LOCAL_ONLY | 非本地或跨站访问 |
| 404 | NOT_FOUND | 调查／快照不存在 |
| 405 | NOT_ALLOWED | 不支持的 HTTP 方法，保持统一 JSON 并附 Allow |
| 409 | CONFLICT | 幂等参数冲突、状态不允许、确认过期或重试预算耗尽 |
| 413 | PAYLOAD_TOO_LARGE | 请求体超过 32 KiB，包括未声明 Content-Length 的流式请求 |
| 415 | UNSUPPORTED_MEDIA_TYPE | 非 application/json |
| 500 | INVALID_STORED_DATA / INTERNAL_ERROR | 持久化内容损坏或无法安全处理，不返回原始内部异常 |
| 503 | STORAGE_UNAVAILABLE | 数据库暂不可用 |

数据库／任务配置初始化失败也返回脱敏的 503 JSON，不落入框架 HTML 错误页。Web 只验证自己消费的队列配置，GET 读取不依赖 Worker 的心跳和轮询参数。关系列与 JSONB 不一致、引用原句不匹配等持久化完整性错误统一为 INVALID_STORED_DATA。

外部字段在入口使用 Zod 校验；Body 同时限制声明长度与实际读取字节数。快照内容是数据，不是可信 HTML；浏览器将其作为文本显示。

## 仅文档预留：不提供实际路由

以下是后续阶段的边界契约，不代表已经实现；不能用它们调用现有 API。

- 补查提议：`POST /api/investigations/:id/supplements`，Header Idempotency-Key，Body `{parentSnapshotId: UUID, question: string}`。接受后返回 202 `{investigationId, jobId}`；核查完成后创建同调查的新版本快照，保留父快照和历史回答。实施前需要扩展任务类型及 Job 唯一范围，不能覆盖当前已发布快照。
- 适配建议提议：`POST /api/advice`，Header Idempotency-Key，Body `{snapshotId: UUID, userConditions: UserConditions}`。接受后返回 202 `{adviceId, jobId}`；产物使用已有 Advice 契约独立保存，不改客观回答或证据快照。需要后续任务类型与甲的建议能力，当前不生成建议。

## 验证方法

`npm run test:db` 包含真实 PostgreSQL 的 HTTP handler 集成测试，覆盖 202、400、403、404、409、413、415、损坏 JSONB、确认竞争、重试上限、Worker 领取和刷新读取失败记录。

实际网络与浏览器验证在独立测试 schema 运行，使用同一生产 Route Handlers 和正式缺配置 handler：

```powershell
npm run build
npm exec tsx tests/support/browser-host.ts
```

该测试宿主在 127.0.0.1:3100 启动生产 Web 和独立于 Web 的 Worker 循环，先自动断言网络提交、同源幂等重复、状态读取、缺配置错误和已保存快照读取，再输出供浏览器验证的 URL。快照／身份／重试夹具全部明确标注为隔离测试，不是产品事实，未接入正式调查流程。Ctrl+C 清理进程与专用 schema；没有正式数据 seed。
