import { z } from "zod";
import type { PrismaClient } from "../../generated/prisma/client";
import { AcceptedAdviceRequestSchema, AcceptedInvestigationSchema, AdviceRequestDetailSchema, ConfirmationRequestSchema, CreateAdviceRequestSchema, CreateInvestigationSchema, IdSchema, IdentityConfirmationBodySchema, InvestigationDetailSchema, RetryBodySchema, SnapshotResponseSchema, TextSchema } from "../../contracts";
import { InvestigationRepository } from "../storage/repository";
import { AdviceRepository } from "../storage/advice-repository";
import { PostgresInvestigationQueue, readQueueConfig, redactFailure } from "../queue";
import { retryAvailability } from "../queue/retry-policy";
import { HttpError, JSON_HEADERS as headers, apiFailure } from "./errors";

function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new HttpError(400, "INVALID_INPUT", "输入格式不正确，请检查问题、调查 ID、幂等键或确认数据。");
  return parsed.data;
}

export class InvestigationHttpApi {
  // Default is the existing shared local workspace, not a user identity/authentication system.
  constructor(private readonly db: PrismaClient, private readonly canAccessAdviceInvestigation: (request: Request, investigationId: string) => boolean | Promise<boolean> = () => true) {}
  get queue(): PostgresInvestigationQueue {
    try { return new PostgresInvestigationQueue(this.db, readQueueConfig()); }
    catch { throw new HttpError(503, "STORAGE_UNAVAILABLE", "任务配置尚未就绪，请检查服务端配置。"); }
  }

  private localOnly(request: Request) {
    const url = new URL(request.url);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new HttpError(403, "LOCAL_ONLY", "此版本仅支持本地访问，尚未开放公共服务。");
    // Next can canonicalize request.url to localhost. Validate the actual Host as well,
    // then compare Origin to that authority, never to an untrusted forwarded header.
    const host = request.headers.get("Host");
    if (host && !/^(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/.test(host)) throw new HttpError(403, "LOCAL_ONLY", "此版本仅支持本地访问，尚未开放公共服务。");
    let expectedOrigin = url.origin;
    try { if (host) expectedOrigin = new URL(`${url.protocol}//${host}`).origin; }
    catch { throw new HttpError(403, "LOCAL_ONLY", "本地访问地址不正确。"); }
    const origin = request.headers.get("Origin");
    if ((origin && origin !== expectedOrigin) || request.headers.get("Sec-Fetch-Site") === "cross-site") throw new HttpError(403, "LOCAL_ONLY", "不允许跨站访问本地调查接口。");
  }

  private async body(request: Request): Promise<unknown> {
    if (request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "请使用 application/json 请求体。");
    const maximum = 32768;
    if (Number(request.headers.get("Content-Length")) > maximum) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "请求内容超过 32 KiB。");
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, "INVALID_INPUT", "请求体不能为空。");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maximum) { await reader.cancel(); throw new HttpError(413, "PAYLOAD_TOO_LARGE", "请求内容超过 32 KiB。"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown; }
    catch { throw new HttpError(400, "INVALID_INPUT", "请求体不是有效的 JSON。"); }
  }

  private async serve(request: Request, action: () => Promise<Response>) {
    try { this.localOnly(request); return await action(); }
    catch (error) { return apiFailure(error); }
  }

  create(request: Request) {
    return this.serve(request, async () => {
      const input = parseInput(CreateInvestigationSchema, await this.body(request));
      const idempotencyKey = parseInput(TextSchema.max(200), request.headers.get("Idempotency-Key"));
      const result = await this.queue.enqueue({ ...input, idempotencyKey });
      return Response.json(AcceptedInvestigationSchema.parse({ investigationId: result.investigation?.id, reused: result.reused }), { status: 202, headers: { ...headers, Location: `/api/investigations/${result.investigation!.id}` } });
    });
  }

  detail(request: Request, idInput: unknown) {
    return this.serve(request, async () => {
      const id = parseInput(IdSchema, idInput);
      const data = await this.db.$transaction(async (tx) => {
        const investigation = await new InvestigationRepository(tx).findInvestigation(id);
        if (!investigation) throw new HttpError(404, "NOT_FOUND", "未找到这项调查。");
        if (investigation.error) investigation.error = redactFailure(investigation.error);
        const job = await tx.job.findUnique({ where: { investigationId: id } });
        const identityConfirmation = investigation.status === "AWAITING_CONFIRMATION" && job?.status === "AWAITING_CONFIRMATION" ? ConfirmationRequestSchema.parse(job.confirmationRequest) : null;
        return InvestigationDetailSchema.parse({ investigation, identityConfirmation, retry: retryAvailability(job, investigation.status) });
      }, { isolationLevel: "RepeatableRead", timeout: 5000 });
      return Response.json(data, { headers });
    });
  }

  identity(request: Request, idInput: unknown) {
    return this.serve(request, async () => {
      const id = parseInput(IdSchema, idInput);
      const body = parseInput(IdentityConfirmationBodySchema, await this.body(request));
      if (!await this.db.investigation.findUnique({ where: { id }, select: { id: true } })) throw new HttpError(404, "NOT_FOUND", "未找到这项调查。");
      await this.queue.confirmIdentity(id, body.identity, { requireWaiting: true, expectedAttemptCount: body.expectedAttemptCount });
      return Response.json(AcceptedInvestigationSchema.parse({ investigationId: id, reused: false }), { status: 202, headers });
    });
  }

  retry(request: Request, idInput: unknown) {
    return this.serve(request, async () => {
      const id = parseInput(IdSchema, idInput);
      const body = parseInput(RetryBodySchema, await this.body(request));
      if (!await this.db.investigation.findUnique({ where: { id }, select: { id: true } })) throw new HttpError(404, "NOT_FOUND", "未找到这项调查。");
      return Response.json(AcceptedInvestigationSchema.parse(await this.queue.retryFailed(id, body)), { status: 202, headers });
    });
  }

  snapshot(request: Request, idInput: unknown) {
    return this.serve(request, async () => {
      const id = parseInput(IdSchema, idInput);
      const data = await this.db.$transaction(async (tx) => {
        const repository = new InvestigationRepository(tx);
        const snapshot = await repository.findSnapshot(id);
        if (!snapshot) throw new HttpError(404, "NOT_FOUND", "尚无此快照，或快照 ID 不存在。");
        const rows = await tx.answer.findMany({ where: { snapshotId: id }, orderBy: [{ generatedAt: "desc" }, { id: "asc" }], select: { id: true } });
        const answers = await Promise.all(rows.map((row) => repository.findAnswer(row.id)));
        return SnapshotResponseSchema.parse({ snapshot, answers });
      }, { isolationLevel: "RepeatableRead", timeout: 5000 });
      return Response.json(data, { headers });
    });
  }

  private async adviceAccess(request: Request, idInput: unknown) {
    const id = parseInput(IdSchema, idInput);
    if (!await this.canAccessAdviceInvestigation(request, id)) throw new HttpError(403, "NOT_ALLOWED", "不允许访问此调查的建议任务。");
    return id;
  }

  createAdviceRequest(request: Request, investigationIdInput: unknown) {
    return this.serve(request, async () => {
      const investigationId = await this.adviceAccess(request, investigationIdInput);
      const body = parseInput(CreateAdviceRequestSchema, await this.body(request));
      const key = parseInput(TextSchema.max(200), request.headers.get("Idempotency-Key"));
      const maxAttempts = this.queue.options.maxAttempts;
      const result = await this.db.$transaction((tx) => new AdviceRepository(tx).createRequest(investigationId, body, key, maxAttempts), { timeout: 5000 });
      const adviceRequestId = result.request.id;
      return Response.json(AcceptedAdviceRequestSchema.parse({ adviceRequestId, reused: result.reused }), {
        status: 202, headers: { ...headers, Location: `/api/investigations/${investigationId}/advice-requests/${adviceRequestId}` }
      });
    });
  }

  adviceRequest(request: Request, investigationIdInput: unknown, requestIdInput: unknown) {
    return this.serve(request, async () => {
      const investigationId = await this.adviceAccess(request, investigationIdInput);
      const id = parseInput(IdSchema, requestIdInput);
      const result = await this.db.$transaction((tx) => new AdviceRepository(tx).findRequest(investigationId, id), { isolationLevel: "RepeatableRead", timeout: 5000 });
      if (result.request.error) result.request.error = redactFailure(result.request.error);
      return Response.json(AdviceRequestDetailSchema.parse(result), { headers });
    });
  }
}
