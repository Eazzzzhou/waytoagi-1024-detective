import type { InvestigationStage, InvestigationStatus } from "@/contracts";

export const STATUS_LABELS: Record<InvestigationStatus, string> = {
  PENDING: "排队中", RUNNING: "调查进行中", AWAITING_CONFIRMATION: "等待身份确认", SUCCEEDED: "调查完成", FAILED: "调查失败", CANCELLED: "已取消"
};
export const STAGE_LABELS: Record<InvestigationStage, string> = {
  CREATED: "任务已创建", IDENTITY: "解析产品身份", RETRIEVAL: "联网检索", SOURCE_FETCH: "获取来源原文", VERIFICATION: "核查主张", ANSWER: "整理回答", COMPLETED: "结果已保存"
};
export const VERIFICATION_LABELS = { UNVERIFIED: "尚未核查", SUPPORTED: "材料支持", REFUTED: "材料反驳", DISPUTED: "存在争议", INSUFFICIENT: "证据不足" };
export const RELATION_LABELS = { SUPPORTS: "支持", REFUTES: "反驳", CONTEXT: "上下文", IRRELEVANT: "无关", UNCERTAIN: "无法判断" };
export const READ_LABELS = { READ: "已取得原文", NOT_FETCHED: "尚未获取", FAILED: "读取失败", RESTRICTED: "访问受限", SNIPPET_ONLY: "仅有搜索摘要" };
export const CONTENT_LABELS = { FACT: "事实陈述", OFFICIAL_CLAIM: "官方宣称", USER_REPORT: "使用者报告", OPINION: "观点", UNKNOWN: "未知" };
export const SOURCE_LABELS = { OFFICIAL: "官方材料", COMMUNITY: "社区材料", THIRD_PARTY: "第三方材料", UNKNOWN: "未知" };
export const GAP_LABELS = { NOT_FETCHED: "原文尚未取得", READ_FAILED: "来源读取失败", NOT_FOUND_IN_SCOPE: "限定范围内未找到可用证据", IDENTITY_UNCLEAR: "产品身份不明确", INSUFFICIENT_EVIDENCE: "证据不足" };
export function formatTime(value: string) {
  return `${new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Shanghai" }).format(new Date(value))}（上海时间）`;
}
