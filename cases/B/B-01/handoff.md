# B-01 核查说明 · 给甲和丙

日期：2026-10-24 · 负责人：乙 · 状态：材料待人工核实；系统未运行

## 1. 一句话结论（草稿，未确认）

Cognition 官方 2024/2026 的 **“first autonomous software engineer / independently complete tasks / ships production code on its own”** 是 broad claim。独立测试和 HN 直接使用报告只支持 **“部分清晰、可验证的局部任务能成”**；20 个真实任务中 3 成功、14 失败、3 无结论。2025 年官方自己的性能回顾也把强项缩窄到 4–8 小时的初级任务，并承认无法像资深工程师那样独立处理模糊项目。因此存在真实冲突：**broad general autonomy 未被支持**；但这不是说 Devin 完全不能用。

2026 当前产品没有独立测试，不能把 2025 的结果直接外推到 2026。

## 2. 固定问题与身份

- 问题原文：`Cognition 官方称 Devin 是“first autonomous software engineer”并能独立完成软件工程任务；Hacker News 和独立测试的实际使用报告是否支持这一说法？`
- 问题 SHA-256：`b53901e4c8505769745d6601abe55a87e65e175f9a793934c0d7fb7a4cb468f7`
- 产品：Devin（Cognition）
- 版本：无公开版本号；2024-03-12 发布，2025-11-14 官方回顾，2026 当前页面
- 范围：Devin 自主编码代理，不含 Devin Review/Desktop 单独功能

## 3. 官方时间线

| 时间 | 来源 | 关键原句 |
|---|---|---|
| 2024-03-12 | https://cognition.com/blog/introducing-devin | “Devin is a tireless, skilled teammate, equally ready to build alongside you or independently complete tasks for you to review.” |
| 2024-03-12 | 同上 | “Devin can plan and execute complex engineering tasks requiring thousands of decisions.” |
| 2024-03-12 | 同上 | “Devin correctly resolves 13.86%* of the issues end-to-end…”（随机 25% 子集、unassisted） |
| 2025-11-14 | https://cognition.com/blog/devin-annual-performance-review-2025 | “Devin excels at tasks with clear, upfront requirements and verifiable outcomes that would take a junior engineer 4-8 hrs of work.” |
| 2025-11-14 | 同上 | “Devin can't independently tackle an ambiguous coding project end-to-end like a senior engineer could, using its own judgement.” |
| 2026-10-24 | https://cognition.com/ | “Cognition operates Devin, the first autonomous software engineer.” |
| 2026-10-24 | https://cognition.com/ | “Devin plans, writes, tests, and ships production code on its own…” |
| 2026-10-24 | https://devin.ai/ | “Devin runs in the cloud or on your machine, tests in its own browser, and won't stop until the PR is ready to merge” |

## 4. 海外材料

### Answer.AI（独立测试，2025-01-08）

- URL：https://www.answer.ai/posts/2025-01-08-devin
- 作者：Hamel Husain、Isaac Flath、Johno Whitaker
- 结果：20 个任务，14 失败、3 成功、3 无结论；作者总结 “But that’s the problem - it rarely worked.”
- 早期成功：Notion→Google Sheets、planet tracker；作者说 “When it worked, it was impressive.”
- 场景：新建项目、研究、分析/修改现有代码；Jan 2025 Devin，版本未说明。

### HN 直接使用（2025-01-17）

| 评论 | 作者 | 关键原句 | 分类 |
|---|---|---|---|
| [42734916](https://news.ycombinator.com/item?id=42734916) | tlarkworthy | “quite impressive when it understands the code formatting and local test setup...” | 条件性支持 |
| 同上 | tlarkworthy | “always add extraneous changes... everything requires more cleanup.” | 直接反驳“低清理/可直接合并” |
| 同上 | tlarkworthy | “not actually saving time and it's quite expensive.” | 直接反驳“节省时间” |
| [42736857](https://news.ycombinator.com/item?id=42736857) | rfoo | “Devin does ask for help when it can't do something.” | 条件性支持“会求助” |
| 同上 | rfoo | “prefer running in circles than admitting it just can't do something.” | 直接反驳“自主/可靠” |

### HN 仅作上下文

- [42735023](https://news.ycombinator.com/item?id=42735023) davedx：没有“ask for help”逃生口；未明确自称使用 Devin，只作上下文。
- [42735633](https://news.ycombinator.com/item?id=42735633) falcor84：3/20≈13.86% 的数值比较；任务集不同，不能当 general 证明。

## 5. 已知与未知

### 已知

- 官方 2024/2026 broad claim 与 2025 官方缩窄同时存在。
- Answer.AI 20 任务测试 3/20 成功；HN 两位直接使用者报告“有条件可用”但“不省时/需清理/会打转”。
- 13.86% 是 SWE-bench 随机 25% 子集、unassisted；不是 general 软件工程能力。
- 3/20≈15% 与 13.86% 数值接近，但任务集不同；不能互为复现。

### 未知／不能断言

- 2026 当前产品的独立表现；没有 2026 独立测试。
- 2024/Jan2025/2025-11/2026 的精确版本映射。
- HN 两位作者的真实身份/雇主/与 Cognition 关系；只保留公开 handle。
- “开发者群体共识”；2 位作者 + 1 个 20 任务测试不构成代表样本。
- 官方 2025 的 4x/67% 指标的方法和数据；不能当独立验证。

## 6. 真实冲突

- **X1**：官方 broad claim vs Answer.AI/HN 直接报告。真实冲突，部分由 2025 官方缩窄解释，但当前 2026 页面仍 broad；不能完全消解。
- **X2**：当前官方页“on its own / won't stop until PR ready” vs 2025 官方回顾“can't independently tackle ambiguous end-to-end like senior / junior at execution”。官方内部张力；范围差异可解释一部分，但当前页未写限制。
- **X3**：官方 4x/67% vs HN “not saving time / more cleanup”。任务/指标/版本不同；条件冲突，不能判谁对谁错。
- **X4**：13.86% vs 3/20≈15%。不是冲突；数值近似，任务不同；不能当 general 证明。

## 7. 给甲：系统运行状态

- 当前正式 handler `src/server/investigation/handler.ts` 返回 `unavailable("investigation orchestration")`；`retrieval`、`identity` 默认实现也不可用。
- `.env` 写明真实适配器尚未实现。
- 因此**没有提交调查**，没有 investigation ID、execution attempt 或 snapshot ID；不要伪造运行结果。
- 若接入后运行，必须：
  1. 只用固定问题原文，不加参考结论、预期主张、URL 列表或评估标准；
  2. 记录真实 investigation ID、状态、错误、snapshot ID／版本；
  3. 不要把 `reference.md` 或 `case.md` 的结论作为提示词、检索词或身份依据；
  4. 运行后按 Q1–Q6 对照，并把结果写回 `reference.md` §10，不改历史快照。

## 8. 给丙：独立复核怎么做

1. 先只读问题和 E1–E20 的原始页面／评论，不读 `reference.md`。
2. 独立回答 Q1–Q6，写下依据和不确定项，填 `review.md` §3。
3. 再读 `reference.md`，逐 Q 记录同意／分歧，填 §4。
4. 重点复核：官方 broad vs 2025 官方缩窄（X2）；Answer.AI 3/20 与 HN 直接报告的区别；E14–E16 同一评论、E17–E18 同一评论的同源计数；2026 无独立测试（G1）；13.86% vs 3/20（X4）。
5. 跑 X1–X12；有阻断就写 `不通过`，不要用其他项抵扣。
6. 签署后才可标“已独立复核”。

## 9. 不要写的内容

- 不要写“开发者普遍认为 Devin 不行/行”；2 位 HN 作者不是共识。
- 不要写“Devin 完全不能用”；它在某些本地测试/格式化/早期任务上能成。
- 不要写“2026 产品已被证明失败/成功”；没有 2026 独立测试。
- 不要写“13.86% 证明 general autonomy”或“3/20 复现了 13.86%”；任务集不同。
- 不要写“官方已承认全部造假”；官方 2025 回顾是缩窄范围，不是全面撤回。
- 不要写“系统已运行”或“已有快照”；当前是阻塞。
- 不要用 `reference.md` 的内容作为系统输入。

## 10. 文件

- `case.md`：问题、身份、时间线、检索、20 条证据、主张、冲突、缺口、系统阻塞。
- `reference.md`：人工参考草稿、待确认项、系统对照占位、评估自检。
- `review.md`：丙的独立复核工作位，当前未复核。
- 本文件：给甲／丙的简短交接说明。
