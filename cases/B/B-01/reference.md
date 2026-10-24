---
case_id: "B-01"
reference_status: "待人工核实"
confirmed_by: null
confirmed_at: null
---
<!--
人工参考判断草稿。禁止作为系统运行输入。
当前未经乙确认，不是人工金标准。
-->

# B-01 · 人工参考判断草稿

> **仅限人工评估与复核。禁止送入系统运行、检索、身份确认或回答生成。**
>
> 材料与证据在 `case.md`；独立复核在 `review.md`。本文件是草稿，`reference_status=待人工核实`，未经乙确认，不得作为金标准或“已确认”结论。

## 1. 使用边界

- 系统未运行；若以后运行，只接收问题原文和必要的真实身份确认依据。
- 本文件不得进入问题、提示词、检索词、身份依据或系统输入。
- 对照只能在系统快照发布后进行；离线工具可以同时读快照与本文件，但不得把本文件回灌到调查、检索或生成。
- 如果本文件与原文冲突，以原文为准；先修正参考，再评估系统。

## 2. 逐问参考结论

| Q-ID | 问题 | 参考结论（草稿） | 状态 | 依据 E／定位 | 不确定性 |
|---|---|---|---|---|---|
| Q1 | 官方到底宣称了什么能力、在什么时间和条件下？ | 2024-03-12 发布文称 Devin 是 “first AI software engineer”，是 “tireless, skilled teammate”，能“independently complete tasks”并“plan and execute complex engineering tasks requiring thousands of decisions”。当前 2026 公司页仍称 “the first autonomous software engineer”，产品页称会“plans, writes, tests, and ships production code on its own”并“won't stop until the PR is ready to merge”。2025-11-14 官方回顾又把强项缩窄为“clear, upfront requirements and verifiable outcomes ... junior engineer 4-8 hrs”，并承认无法像资深工程师那样独立处理模糊项目。 | 已查明（官方文本） | E1、E2、E5、E6、E7、E8、E9 | 官方“first autonomous”是自我定位；当前页面没有版本号/日期 |
| Q2 | 独立测试与 HN 直接使用者具体报告了什么？ | Answer.AI 用 20 个真实任务测试：14 失败、3 成功、3 无结论；作者总结“it rarely worked”，任务常耗时数天。HN 直接使用者 tlarkworthy 说在本地测试/格式化场景能产出通过测试的代码，但总加多余改动、无法撤销、需要更多清理、没有节省时间且昂贵；rfoo 说它会求助，但能力不足时宁愿原地打转。 | 部分查明（支持＋反驳＋条件） | E10、E11、E12、E13、E14、E15、E16、E17、E18 | 测试是 Jan 2025，版本未说明；HN 只有 2 位直接使用者 |
| Q3 | 哪些材料支持、反驳、只是条件不同或主观偏好？ | 直接支持“某些 well-scoped 任务能成”的有 E11、E14、E17；直接反驳 broad general autonomy/节省时间的有 E10、E12、E13、E16、E18；条件不同的是 E8 的官方窄任务定义和 E14 的本地测试场景；主观偏好/证据不足的是 E19（未明确使用 Devin）和 E20（对数字的分析）。 | 已分类（见 §4） | E10–E20 | “直接反驳”只针对 broad claim，不表示所有场景失败 |
| Q4 | 是否存在真正的事实冲突？版本/条件能解释多少？ | 存在。X1：官方 broad claim（2024/2026） vs 独立测试与 HN 直接报告。X2：当前官方页的 broad autonomy vs 2025 官方回顾的“can't independently tackle ambiguous end-to-end / junior at execution”。2025 官方缩窄能解释一部分（清晰任务 vs 模糊项目），但当前 2026 页面仍 broad，且没有 2026 独立测试；不能宣称冲突已完全解决。 | 争议（真实冲突保留） | E1、E2、E5、E6、E7、E8、E9、E10、E12、E13、E16、E18 | 版本/时间映射不完整（G1/G2） |
| Q5 | 来源是否独立？是否存在同作者/同帖/同上游？ | 官方 E1–E9 同属 Cognition，只能证明官方口径；Answer.AI E10–E13 是独立第三方测试；HN E14–E16 同一评论/同一作者，E17–E18 同一评论/同一作者，不能按摘录数计；E19/E20 是评论/分析，不计入独立性能证据。 | 已查明（独立性） | E1–E20 | HN 作者只有公开 handle；未核实真实身份/雇主（G7） |
| Q6 | 现有证据能支持到什么程度，不能支持什么？ | 能支持：Devin 在一些清晰、可验证、局部任务上能产出可用结果；不能支持：Devin 是 general autonomous software engineer、能替代资深工程师端到端处理模糊项目、或“开发者普遍认为它不行/行”。2026 产品的 broad claim 仍缺独立验证。 | 部分查明（支持有限＋证据不足） | E3、E4、E8、E9、E10、E11、E14、E20 | 2026 独立测试缺失（G1）；不能外推开发者共识 |

### 2.1 一句话参考答案（草稿）

> 官方 2024/2026 的 “first autonomous software engineer / independently complete tasks / ships production code on its own” 是 broad claim。独立测试与 HN 直接使用报告只支持“部分清晰、可验证的局部任务能成”；20 个真实任务中 3 成功、14 失败、3 无结论，直接使用者还报告多余改动、清理成本和未节省时间。2025 年官方自己的性能回顾也把强项缩窄到 4–8 小时的初级任务，并承认无法像资深工程师那样独立处理模糊项目。因此存在真实冲突：broad general autonomy 未被支持；但这不是说 Devin 完全不能用。2026 当前产品没有独立测试，不能把 2025 的结果直接外推到 2026。

> 这段话是人工参考草稿，不是系统输出；待乙确认后才能作为参考金标准。

## 3. 主张级判断

| C-ID | statement | kind | verificationStatus | reason | scope | 依据 E |
|---|---|---|---|---|---|---|
| C1 | 2024 官方宣称 Devin 是“first AI software engineer”，能独立完成任务并规划/执行复杂工程任务。 | OFFICIAL_CLAIM | SUPPORTED | E1/E2 原文；这是官方自我宣称，不是独立验证。 | 2024-03-12 发布文；early access | E1、E2 |
| C2 | 当前官方仍称 Devin 是“first autonomous software engineer”，能自行规划、编写、测试并交付生产代码，直到 PR 可合并才停止。 | OFFICIAL_CLAIM | SUPPORTED | E5/E6/E7 原文；当前官方定位。 | 2026-10-24 当前页面 | E5、E6、E7 |
| C3 | 2025 官方回顾把能力缩窄为清晰、可验证、4–8h 初级任务，并承认无法独立处理模糊项目。 | OFFICIAL_CLAIM | SUPPORTED | E8/E9 原文；官方自述局限。 | 2025-11-14 回顾 | E8、E9 |
| C4 | 独立证据支持“Devin 能在广泛真实任务上独立完成”的 general claim。 | FACT | REFUTED | E10 3/20；E12/E13 rarely worked；E16/E18 HN 直接报告；范围是 2024/Jan2025。 | 2024/Jan2025；非 2026 | E10、E12、E13、E16、E18 |
| C5 | Devin 能完成至少一些 well-scoped 任务并产出可用代码。 | FACT | SUPPORTED | E11 early wins；E14 本地测试/格式化；E17 会求助。 | 特定任务/场景 | E11、E14、E17 |
| C6 | Devin 在真实任务上总体上节省开发者时间。 | FACT | DISPUTED | E15/E16 说更多清理、没节省；E8 官方只对窄任务给 4–8h/4x；无同一任务测量。 | 测试任务与官方窄任务 | E8、E15、E16 |
| C7 | Devin 能像资深工程师一样独立端到端处理模糊编码项目。 | FACT | REFUTED | E9 官方自己说不能；E10/E13 独立测试大量失败。 | 模糊/端到端 | E9、E10、E13 |
| C8 | 2024/当前 broad claim 与 2025 官方回顾存在真实张力。 | FACT | SUPPORTED | E1/E2/E5/E6/E7 vs E8/E9；不是单纯措辞差异。 | 官方文本；2024–2026 | E1、E2、E5、E6、E7、E8、E9 |
| C9 | SWE-bench 13.86% 能支持 general autonomous software engineering 结论。 | FACT | INSUFFICIENT | E3/E4 的 25% 子集、unassisted 条件；E20 的 3/20≈15% 只是数值近似，任务不同。 | SWE-bench；2024 | E3、E4、E20 |
| C10 | 当前 2026 产品的 broad claim 已被独立证据支持。 | FACT | INSUFFICIENT | 独立测试是 Jan 2025；2025 官方回顾不是独立验证；无 2026 独立测试。 | 2026 产品 | E5、E6、E7、E10、E12、E13 |
| C11 | 版本/时间可以完全解释冲突。 | FACT | INSUFFICIENT | 2025 回顾缩窄能解释一部分；当前页面仍 broad；无版本号/2026 测试。 | 2024–2026 | E5、E6、E7、E8、E9 |
| C12 | “first autonomous software engineer”是官方自我定位/营销 claim，不是独立验证事实。 | FACT | SUPPORTED | E1/E2/E5/E6/E7 官方来源；外部材料未把它当客观事实。 | 官方来源 | E1、E2、E5、E6、E7 |
| C13 | HN 直接使用报告是少量个体经验，不是开发者群体共识。 | FACT | SUPPORTED | 2 位直接使用者；同一评论多条摘录按一个来源；187 条评论不是代表样本。 | HN 42734681；2025-01-17 | E14–E18 |

## 4. 关键原句映射

| C-ID | E-ID | 原句关键词／定位 | 关系 | 范围／条件 |
|---|---|---|---|---|
| C1 | E1 | "independently complete tasks"；2024 开头 | SUPPORTS | 2024 launch |
| C1 | E2 | "complex engineering tasks requiring thousands of decisions"；Capabilities | SUPPORTS | 2024 launch |
| C2 | E5 | "the first autonomous software engineer"；当前首页 | SUPPORTS | 2026 当前 |
| C2 | E6 | "plans, writes, tests, and ships production code on its own"；当前首页 | SUPPORTS | 2026 当前 |
| C2 | E7 | "won't stop until the PR is ready to merge"；产品页 | SUPPORTS | 2026 当前 |
| C3 | E8 | "clear, upfront requirements ... 4-8 hrs"；2025 review | SUPPORTS | 官方窄任务 |
| C3 | E9 | "can't independently tackle an ambiguous coding project"；2025 review | SUPPORTS | 官方自述局限 |
| C4 | E10 | "14 failures, 3 successes ... 3 inconclusive"；Answer.AI | REFUTES | 20 真实任务 |
| C4 | E12 | "it rarely worked"；Answer.AI | REFUTES | 同上 |
| C4 | E13 | "took days rather than hours"；Answer.AI | REFUTES | 同上 |
| C4 | E16 | "not actually saving time"；HN | REFUTES | 直接使用 |
| C4 | E18 | "running in circles"；HN | REFUTES | 直接使用 |
| C5 | E11 | "When it worked, it was impressive" | SUPPORTS | 早期任务 |
| C5 | E14 | "impressive when it understands ... local test setup" | SUPPORTS | 本地测试/格式化 |
| C5 | E17 | "does ask for help" | SUPPORTS | 协作，不是自主 |
| C6 | E15 | "requires more cleanup"；HN | REFUTES | 直接使用 |
| C6 | E16 | "not actually saving time"；HN | REFUTES | 直接使用 |
| C7 | E9 | "can't independently tackle ... like a senior engineer" | REFUTES | 官方自述 |
| C7 | E10 | 3/20 | REFUTES | 独立测试 |
| C7 | E13 | days/dead-ends | REFUTES | 独立测试 |
| C8 | E1、E2、E5、E6、E7 | broad claim | CONTEXT | 一侧 |
| C8 | E8、E9 | narrow/limit | CONTEXT | 另一侧 |
| C9 | E3、E4 | 13.86%，25% subset，unassisted | CONTEXT | benchmark |
| C9 | E20 | 3/20≈13.86% | CONTEXT | 数值近似，不是同一任务 |
| C12 | E5、E6、E7 | official self-positioning | SUPPORTS | 当前官方 |
| C13 | E14–E18 | 2 位直接使用者 | CONTEXT | HN 少量样本 |

## 5. 冲突处理

| X-ID | 双方各说什么 | 适用条件 | 能否解释 | 未解决部分 |
|---|---|---|---|---|
| X1 | 官方 broad claim：独立完成/自主交付；Answer.AI+HN：3/20、rarely worked、清理成本、原地打转 | 2024/2026 claim vs Jan 2025 test；版本未说明 | 部分：2025 官方缩窄到清晰任务；但不能完全解释当前 2026 broad 页面 | 2026 产品无独立测试；broad claim 仍未被独立支持 |
| X2 | 当前官方页：plans/writes/tests/ships on its own / won't stop until PR ready；2025 官方回顾：can't independently tackle ambiguous end-to-end like senior / junior at execution | 同一公司官方文本，2025-11 vs 2026 当前页 | 部分：清晰 vs 模糊、junior vs senior 的范围差异；当前页未写限制 | 当前页是否仍暗示 general autonomy；未解决 |
| X3 | 2025 官方回顾：4x faster / 67% PR merged；HN：more cleanup / not saving time | 不同任务、不同指标、不同版本 | 不能直接比较；缺同一任务测量 | 生产力结论不能统一 |
| X4 | 13.86% SWE-bench vs 3/20≈15% | 不同任务集；25% subset | 数值接近但任务不同；不是同一实验 | 不能把 13.86% 当 general 证明；也不能把 3/20 当 SWE-bench 复现 |

## 6. 缺口处理

| G-ID | 涉及主张 | kind | 缺什么 | searchScope／影响 |
|---|---|---|---|---|
| G1 | C10 | INSUFFICIENT_EVIDENCE | 2026 产品的独立测试 | 官方页、Answer.AI、HN；2026-10-24；影响当前 broad claim |
| G2 | C11 | INSUFFICIENT_EVIDENCE | 2024/Jan2025/2025-11/2026 的版本映射 | 官方博客/页面；2026-10-24；影响冲突归因 |
| G3 | C13 | INSUFFICIENT_EVIDENCE | 代表性样本；只有 2 位 HN 直接使用者 | HN thread；2025-01-17；不能称开发者共识 |
| G4 | C6 | INSUFFICIENT_EVIDENCE | 同一任务、同版本、同一开发者的前后时间测量 | 官方 2025 review、HN、Answer.AI；2026-10-24 |
| G5 | C3、C6 | INSUFFICIENT_EVIDENCE | 官方 4x/67% 指标的方法和数据 | Cognition 2025 review；2026-10-24 |
| G6 | C9 | INSUFFICIENT_EVIDENCE | 同一任务集对比；3/20 非 SWE-bench | Answer.AI、Cognition 2024；2026-10-24 |
| G7 | C13 | IDENTITY_UNCLEAR | HN 作者真实身份/雇主/与 Cognition 关系；只保留公开 handle | HN comments；2026-10-24；不调查私人身份 |

## 7. 不确定性与可能改变判断的证据

| 项 | 当前判断 | 什么证据会改变 | 影响范围 |
|---|---|---|---|
| 官方 claim 的解释 | “first autonomous software engineer”是 general capability 还是 category label | Cognition 明确的范围声明/FAQ | Q1/Q4、C1/C2/C8 |
| 2026 产品 | 不能用 Jan 2025 测试代表 2026 | 2026 独立测试或可复现客户案例 | Q2/Q6、C10 |
| 生产力 | HN 说不节省；官方说 4x/67% | 同一任务同版本的前后测量 | Q3/Q6、C6 |
| 开发者共识 | 不能从 2 位 HN 作者推出 | 代表性样本/调查 | Q5/Q6、C13 |
| 3/20 vs 13.86% | 数值近似但任务不同 | 同一任务集复现 | Q1/Q6、C9 |
| 官方 2025 指标 | 未独立复核 | 原始数据/方法 | C3/C6、G5 |

## 8. 人工确认

- 确认人：`（乙；待签署）`
- 确认时间：`null`
- 确认声明：`（待填写：我已逐条核对 Q／C／E 与原文；以下为人工参考判断，不是系统输出；仍有哪些不确定）`
- 仍未解决：X1/X2/X3、G1–G7，尤其 2026 产品无独立测试、版本映射、HN 代表性。

### 8.1 需乙亲自核实

- [ ] 确认官方 “first autonomous software engineer” 是否应被解释为 general capability claim，而不是类别标签。
- [ ] 确认 2024 broad claim 与 2025 官方回顾的张力是否需要保留为 X2；不要把范围差异直接判为“官方自相矛盾”。
- [ ] 确认 Answer.AI 与 Cognition 无未披露隶属关系；如发现，重新评估独立性。
- [ ] 确认 HN `tlarkworthy`、`rfoo` 是直接使用 Devin 的公开报告；只保留公开 handle，不调查私人身份。
- [ ] 确认 `davedx`、`falcor84` 只作上下文，不算直接性能证据。
- [ ] 确认 2025 官方回顾的 4x/67% 指标不能当独立验证。
- [ ] 确认 2026 产品无独立测试，保留 G1；不能把 2025 结果外推到 2026。
- [ ] 确认冲突结论是“broad general autonomy 未被支持”，不是“Devin 完全不能用/开发者共识”。

> 以上任一项未经确认，不得把本文件标为“人工已确认”或“人工金标准”。

## 9. 模型协助说明

- 是否使用模型：是。
- 用途：网页搜索线索、官方页面/Answer.AI/HN 抓取、评论 ID 与时间整理、英文原句的中文翻译候选。
- 模型没有做的事：没有代替乙签署人工确认；没有生成系统运行结果；没有补造 HN 评论或官方原文。
- 人工核对：待乙逐条核对原句、定位、关系和范围。

## 10. 系统对照

> 系统未运行：正式 handler 返回 `unavailable("investigation orchestration")`，无调查 ID、无快照。以下是状态记录，不是对照结果。

| Q-ID | 参考结论（摘要） | 系统结论（摘要） | 对照 | 差异／依据 |
|---|---|---|---|---|
| Q1 | 官方 2024/2026 broad + 2025 缩窄 | 未运行 | 系统缺失 | 无 investigation_id／snapshot_id |
| Q2 | Answer.AI 3/20；HN 直接报告混合 | 未运行 | 系统缺失 | 同上 |
| Q3 | 部分支持/反驳/条件/主观 | 未运行 | 系统缺失 | 同上 |
| Q4 | 真实冲突 X1/X2；部分解释 | 未运行 | 系统缺失 | 同上 |
| Q5 | 官方同组；AnswerAI 独立；2 位 HN 作者 | 未运行 | 系统缺失 | 同上 |
| Q6 | 支持有限；2026 缺独立测试 | 未运行 | 系统缺失 | 同上 |

引用对照：无系统引用可查。运行输入未包含本文件；`reference_used` 未填 false，因为未运行。

## 11. 评估

> 这是参考草稿的自检，不是最终评估；最终结论需要乙确认与丙独立复核。

### 11.1 人工参考判断

| 标准 | 结论 | 依据 | 备注 |
|---|---|---|---|
| G1 身份／版本 | 通过 | 官方页面/发布文；Devin 与 Devin Review 等分列 | 版本无公开号 |
| G2 事实 | 部分 | E1–E13；X1/X2；G1/G2 | 官方文本与独立测试均有 |
| G3 引用有效 | 通过 | E1–E20 有 URL、原句、定位、hash | 无悬空引用 |
| G4 原句支持 | 部分 | E1–E18；E19/E20 只作 CONTEXT | 不把官方营销当独立事实 |
| G5 冲突／缺口 | 部分 | X1–X4、G1–G7 | 真实冲突保留；未强行消解 |
| G6 过度推断 | 通过 | 未写“开发者共识”；未写“完全不能用”；未写 2026 失败 | 范围限定 |
| G7 独立性 | 通过 | 官方 1 组；AnswerAI 1；HN 2 位作者；E14–E16/E17–E18 同源 | 不按摘录数计 |
| G8 六项完整 | 部分 | 材料齐全；复核未完成 | 待丙 |
| G9 状态诚实 | 通过 | 系统未运行；无调查 ID／快照 | 未伪造 |
| G10 参考隔离 | 通过 | 系统未运行；参考未送入 | 未发生泄漏 |
| G11 可复现 | 通过 | URL、定位、hash、获取时间 | HN 评论页/官方页未来可能变化 |
| G12 范围／意图 | 部分 | 回答 B 问题；2026/版本缺口明示 | 不能给 general 结论 |

### 11.2 系统结果

系统未运行，无法评估；不把预期失败写成结果。系统评估结论：`无法评估`。

### 11.3 阻断检查

| 阻断 ID | 是否成立 | 证据 | 处理 |
|---|---|---|---|
| X1–X12 | 未发现（材料自检） | 见 case.md §14 | 待丙独立复核 |

## 12. 最终结论

```yaml
object: "reference"
verdict: null # 待乙确认；当前不是人工金标准
blocking: []
conditions:
  - "乙逐条确认 Q1–Q6、C1–C13 与 E1–E20"
  - "X1/X2 的冲突分类与范围；2026 产品无独立测试（G1）"
  - "丙完成独立复核"
evaluator: "乙（待确认）"
evaluated_at: null
```

## 13. 变更记录

| 日期 | 变更 | 变更人 |
|---|---|---|
| 2026-10-24 | 创建 B-01 人工参考草稿；标记待人工核实；无系统运行 | 乙 |
