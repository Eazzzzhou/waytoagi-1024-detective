/** Home-page examples and archive placeholders. Kept separate from the demo scenario corpus. */
export const EXAMPLES = [
  {
    scenarioId: 'fact',
    tag: '事实',
    question: 'DeepSeek API 的上下文长度是多少？',
  },
  {
    scenarioId: 'devin',
    tag: '分歧',
    question: 'Devin 的官方宣传与开发者实际反馈一致吗？',
  },
  {
    scenarioId: 'dify',
    tag: '按用途',
    question: '我想做自动化工作流，Dify 适合吗？',
  },
]

export const HOME_ARCHIVE = [
  {
    scenarioId: 'fact',
    at: '2026-10-18 20:10',
    date: '10.18',
    caseNo: 'A-2026-1018-03',
    question: 'DeepSeek API 的上下文长度是多少？',
    status: '已归档',
    tone: 'support' as const,
  },
  {
    scenarioId: 'dify',
    at: '2026-10-16 09:42',
    date: '10.16',
    caseNo: 'A-2026-1016-01',
    question: '我想做自动化工作流，Dify 适合吗？',
    status: '有条件值得',
    tone: 'unclear' as const,
  },
  {
    scenarioId: 'cursor',
    at: '2026-10-12 22:05',
    date: '10.12',
    caseNo: 'A-2026-1012-02',
    question: 'Cursor 支持在本地微调自己的模型吗？',
    status: '证据不足',
    tone: 'unclear' as const,
  },
]
