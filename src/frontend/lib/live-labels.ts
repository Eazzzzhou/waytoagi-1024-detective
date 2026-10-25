export const states: Record<string, string> = {
  PENDING: '排队中',
  RUNNING: '调查中',
  AWAITING_CONFIRMATION: '等待你确认产品',
  SUCCEEDED: '已完成',
  FAILED: '失败',
  CANCELLED: '已取消',
  INSUFFICIENT_CONDITIONS: '需要补充条件',
}

export const stages: Record<string, string> = {
  CREATED: '已创建任务',
  IDENTITY: '确认产品身份',
  RETRIEVAL: '查找来源',
  SOURCE_FETCH: '读取原文',
  VERIFICATION: '核对主张与证据',
  ANSWER: '生成客观回答',
  COMPLETED: '已保存结果',
}

export const kinds = {
  FACT: '事实主张',
  OFFICIAL_CLAIM: '官方宣称',
  USER_REPORT: '使用者报告',
  OPINION: '观点',
}

export const verification = {
  UNVERIFIED: '未核查',
  SUPPORTED: '有依据支持',
  REFUTED: '有反驳依据',
  DISPUTED: '存在分歧',
  INSUFFICIENT: '证据不足',
}

export const relations = {
  SUPPORTS: '支持',
  REFUTES: '反驳',
  CONTEXT: '背景',
  IRRELEVANT: '不相关',
  UNCERTAIN: '关系未确定',
}
