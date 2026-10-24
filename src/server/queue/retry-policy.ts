import { ErrorSchema, type InvestigationStatus, type RetryAvailability } from "../../contracts";
import type { Job } from "../../generated/prisma/client";

export const MAX_MANUAL_RETRIES = 2;
export function retryAvailability(job: Job | null, status: InvestigationStatus): RetryAvailability {
  const remaining = job ? Math.max(0, MAX_MANUAL_RETRIES - job.manualRetryCount) : 0;
  const expectedAttemptCount = job?.attemptCount ?? 0;
  if (!job || job.status !== "FAILED" || status !== "FAILED") return { allowed: false, reason: "仅失败的调查可以手动重试。", remaining, expectedAttemptCount };
  const error = ErrorSchema.parse(job.lastError);
  if (!error.retryable) return { allowed: false, reason: "此错误不可重试，请先解决配置或输入问题，再发起新调查。", remaining, expectedAttemptCount };
  if (!remaining) return { allowed: false, reason: "已达到两次手动重试上限。", remaining, expectedAttemptCount };
  return { allowed: true, reason: "允许再执行一次；历史失败记录会保留。", remaining, expectedAttemptCount };
}
