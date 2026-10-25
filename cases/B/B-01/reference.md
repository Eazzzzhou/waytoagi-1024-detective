---
case_id: "B-01"
reference_status: "人工已确认"
confirmed_by: "乙（本对话用户）"
confirmed_at: "2026-10-25T13:55:51+08:00"
---
<!--
人工参考判断（已确认，保留已列未知）。禁止作为系统运行输入。
当前版本已获本对话用户人工确认；范围、声明及保留项见 §8。
-->

# B-01 · 人工参考判断（已确认）

> **仅限人工评估与复核。禁止送入系统运行、检索、身份确认或回答生成。**
>
> 材料与证据在 `case.md`；独立复核在 `review.md`。当前 `reference_status=人工已确认`；用户确认的是经 §8.2 辅助核对修订后的参考版本，未知和争议仍保留。独立复核及系统对照未完成。

> **阅读提示：下文主体为 2026-10-24 草稿；本轮核对结果及需修正判断见 §8.2。原始摘录与逐 E 标记见 [case.md §7.6](case.md)。历史自检“通过”不等于本轮人工通过。**

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
| Q3 | 哪些材料支持、反驳、只是条件不同或主观偏好？ | 支持“某些 well-scoped 任务能成”的有 E11、E14；E17 仅支持会求助，不证明任务完成；提供 2025 样本内失败与省时反例的有 E10、E12、E13、E16、E18；条件不同的是 E8 的官方窄任务定义和 E14 的本地测试场景；主观偏好/证据不足的是 E19（未明确使用 Devin）和 E20（对数字的分析）。 | 已分类（见 §4） | E10–E20 | 反例只覆盖报告的任务与时期；不能直接推到所有场景/2026 |
| Q4 | 是否存在真正的事实冲突？版本/条件能解释多少？ | 存在待解释张力，同条件事实矛盾尚未证实。X1：官方 broad claim（2024/2026） vs 独立测试与 HN 直接报告。X2：当前官方页的 broad autonomy vs 2025 官方回顾的“can't independently tackle ambiguous end-to-end / junior at execution”。2025 官方缩窄能解释一部分（清晰任务 vs 模糊项目），但当前 2026 页面仍 broad，且没有 2026 独立测试；不能宣称冲突已完全解决。 | 张力保留；同条件事实冲突待核 | E1、E2、E5、E6、E7、E8、E9、E10、E12、E13、E16、E18 | 版本/时间映射不完整（G1/G2） |
| Q5 | 来源是否独立？是否存在同作者/同帖/同上游？ | 官方 E1–E9 同属 Cognition，只能证明官方口径；Answer.AI E10–E13 是独立第三方测试；HN E14–E16 同一评论/同一作者，E17–E18 同一评论/同一作者，不能按摘录数计；E19/E20 是评论/分析，不计入独立性能证据。 | 已查明（独立性） | E1–E20 | HN 作者只有公开 handle；未核实真实身份/雇主（G7） |
| Q6 | 现有证据能支持到什么程度，不能支持什么？ | 能支持：Devin 在一些清晰、可验证、局部任务上能产出可用结果；不能支持：Devin 是 general autonomous software engineer、能替代资深工程师端到端处理模糊项目、或“开发者普遍认为它不行/行”。2026 产品的 broad claim 仍缺独立验证。 | 部分查明（支持有限＋证据不足） | E3、E4、E8、E9、E10、E11、E14、E20 | 2026 独立测试缺失（G1）；不能外推开发者共识 |

### 2.1 一句话参考答案（草稿）

> 官方 2024/2026 的 “first autonomous software engineer / independently complete tasks / ships production code on its own” 是 broad claim。独立测试与 HN 直接使用报告只支持“部分清晰、可验证的局部任务能成”；20 个真实任务中 3 成功、14 失败、3 无结论，直接使用者还报告多余改动、清理成本和未节省时间。2025 年官方自己的性能回顾也把强项缩窄到 4–8 小时的初级任务，并承认无法像资深工程师那样独立处理模糊项目。因此广泛自主能力仍未获充分支持，文本有解释张力；同条件直接事实冲突尚未证实；但这不是说 Devin 完全不能用。本案尚未取得 2026 当前产品的独立测试，不能把 2025 的结果直接外推到 2026。

> 这段话属于本次人工确认的参考版本，须结合 §8.2 修正和保留项使用；不是系统输出。

## 3. 主张级判断

| C-ID | statement | kind | verificationStatus | reason | scope | 依据 E |
|---|---|---|---|---|---|---|
| C1 | 2024 官方宣称 Devin 是“first AI software engineer”，能独立完成任务并规划/执行复杂工程任务。 | OFFICIAL_CLAIM | SUPPORTED | E1/E2 原文；这是官方自我宣称，不是独立验证。 | 2024-03-12 发布文；early access | E1、E2 |
| C2 | 当前官方仍称 Devin 是“first autonomous software engineer”，能自行规划、编写、测试并交付生产代码，直到 PR 可合并才停止。 | OFFICIAL_CLAIM | SUPPORTED | E5/E6/E7 原文；当前官方定位。 | 2026-10-24 当前页面 | E5、E6、E7 |
| C3 | 2025 官方回顾把能力缩窄为清晰、可验证、4–8h 初级任务，并承认无法独立处理模糊项目。 | OFFICIAL_CLAIM | SUPPORTED | E8/E9 原文；官方自述局限。 | 2025-11-14 回顾 | E8、E9 |
| C4 | 独立证据支持“Devin 能在广泛真实任务上独立完成”的 general claim。 | FACT | INSUFFICIENT | 本轮语义复查：2025 测试与报告有失败反例，足以限制结论，但有限样本不直接反驳全部广泛任务/2026 能力；保留样本内反例。 | 2024/Jan2025；非 2026 | E10、E12、E13、E16、E18 |
| C5 | Devin 能完成至少一些 well-scoped 任务并产出可用代码。 | FACT | SUPPORTED | E11 early wins；E14 本地测试/格式化；E17 仅是求助上下文。 | Jan 2025 特定任务/场景，非 2026 能力结论 | E11、E14；E17（CONTEXT） |
| C6 | Devin 在真实任务上总体上节省开发者时间。 | FACT | INSUFFICIENT | E15/E16 说更多清理、没节省；E8 只给任务范围及 4–8h，不是节省时间的测量；4x/67% 本轮已补 E21/E22，但仍仅为官方自述，无同一任务测量。 | 测试任务与官方窄任务 | E8、E15、E16 |
| C7 | Cognition 在 2025 官方回顾中自述 Devin 无法像资深工程师一样独立端到端处理模糊编码项目。 | OFFICIAL_CLAIM | SUPPORTED | E9 证明该官方局限表述存在，不等于独立实测；E10/E13 仅作 Jan 2025 上下文。 | 2025-11 官方自述，非 2026 独立实测 | E9；E10、E13（CONTEXT） |
| C8 | 2024/当前 broad claim 与 2025 官方回顾存在真实张力。 | FACT | INSUFFICIENT | 本轮语义复查：宽泛定位与清晰任务/模糊项目局限存在解释张力；时间、任务不同，尚未证实同条件事实矛盾。 | 官方文本；2024–2026 | E1、E2、E5、E6、E7、E8、E9 |
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
| C4 | E10 | "14 failures, 3 successes ... 3 inconclusive"；Answer.AI | CONTEXT | 2025 样本内反例；不直接代表全部任务或 2026 |
| C4 | E12 | "it rarely worked"；Answer.AI | CONTEXT | 2025 样本内反例；不直接代表全部任务或 2026 |
| C4 | E13 | "took days rather than hours"；Answer.AI | CONTEXT | 2025 样本内反例；不直接代表全部任务或 2026 |
| C4 | E16 | "not actually saving time"；HN | CONTEXT | 2025 样本内反例；不直接代表全部任务或 2026 |
| C4 | E18 | "running in circles"；HN | CONTEXT | 2025 样本内反例；不直接代表全部任务或 2026 |
| C5 | E11 | "When it worked, it was impressive" | SUPPORTS | 早期任务 |
| C5 | E14 | "impressive when it understands ... local test setup" | SUPPORTS | 本地测试/格式化 |
| C5 | E17 | "does ask for help" | CONTEXT | 只证明求助，不证明任务完成 |
| C6 | E15 | "requires more cleanup"；HN | REFUTES | 直接使用 |
| C6 | E16 | "not actually saving time"；HN | REFUTES | 直接使用 |
| C7 | E9 | "can't independently tackle ... like a senior engineer" | SUPPORTS | 支持该官方自述局限存在，不证明独立实测 |
| C7 | E10 | 3/20 | CONTEXT | Jan 2025 测试；不直接对应模糊项目 |
| C7 | E13 | days/dead-ends | CONTEXT | Jan 2025 失败模式；非 2026 实测 |
| C8 | E1、E2、E5、E6、E7 | broad claim | CONTEXT | 一侧 |
| C8 | E8、E9 | narrow/limit | CONTEXT | 另一侧 |
| C9 | E3、E4 | 13.86%，25% subset，unassisted | CONTEXT | benchmark |
| C9 | E20 | 3/20≈13.86% | CONTEXT | 数值近似，不是同一任务 |
| C12 | E5、E6、E7 | official self-positioning | SUPPORTS | 当前官方 |
| C13 | E14–E18 | 2 位直接使用者 | CONTEXT | HN 少量样本 |

## 5. 冲突处理

| X-ID | 双方各说什么 | 适用条件 | 能否解释 | 未解决部分 |
|---|---|---|---|---|
| X1 | 官方 broad claim：独立完成/自主交付；Answer.AI+HN：3/20、rarely worked、清理成本、原地打转 | 2024/2026 claim vs Jan 2025 test；版本未说明 | 部分：2025 官方缩窄到清晰任务；但不能完全解释当前 2026 broad 页面 | 本案未取得 2026 产品独立测试；broad claim 仍未被独立支持 |
| X2 | 当前官方页：plans/writes/tests/ships on its own / won't stop until PR ready；2025 官方回顾：can't independently tackle ambiguous end-to-end like senior / junior at execution | 同一公司官方文本，2025-11 vs 2026 当前页 | 部分：清晰 vs 模糊、junior vs senior 的范围差异；当前页未写限制 | 当前页是否仍暗示 general autonomy；未解决 |
| X3 | 历史草稿记官方回顾 4x faster / 67% PR merged；HN：more cleanup / not saving time | 不同任务、指标、版本；E8 未摘录 4x/67% | 本轮已补 E21/E22 原句，仍不能用 E8 代证或跨任务直接比较 | 保留可比性缺口，不以此确认生产力冲突 |
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

- 确认人：`乙（本对话用户）`
- 确认时间：`2026-10-25T13:55:51+08:00`（本轮收到确认后的落档时间；未另行提供逐项核对起止时间）
- 确认依据：用户在本对话明确表示：“经过我的核对你的辅助的没有问题可以正式通过”。
- 确认范围：当前案例材料、参考判断及 §8.2 模型辅助修订/标注，由用户确认通过；模型仅按用户明确确认落档，不推定用户逐页访问的具体过程。参考中保留的未知、读取限制及证据不足均不因此变为已解决。
- 阅读顺序：用户已接触模型辅助及参考，本次为非盲人工确认；没有据此记录独立复核或系统运行通过。
- 保留说明：2026 独立测试、版本映射、同任务生产力及来源关联等缺口保留；认可 C4/C8 收窄和官方 4x/67% 仅为自述的处理，不把文本张力升级为同条件矛盾。
- 仍未解决：X1/X2/X3、G1–G7，尤其 本案未取得 2026 产品独立测试、版本映射、HN 代表性。

### 8.1 需实际核查者核实

- [ ] 确认官方 “first autonomous software engineer” 是否应被解释为 general capability claim，而不是类别标签。
- [ ] 确认 2024 broad claim 与 2025 官方回顾的张力是否需要保留为 X2；不要把范围差异直接判为“官方自相矛盾”。
- [ ] 确认 Answer.AI 与 Cognition 无未披露隶属关系；如发现，重新评估独立性。
- [ ] 确认 HN `tlarkworthy`、`rfoo` 是直接使用 Devin 的公开报告；只保留公开 handle，不调查私人身份。
- [ ] 确认 `davedx`、`falcor84` 只作上下文，不算直接性能证据。
- [ ] 确认 2025 官方回顾的 4x/67% 指标不能当独立验证。
- [ ] 确认 本案未取得 2026 产品独立测试，保留 G1；不能把 2025 结果外推到 2026。
- [ ] 确认冲突结论是“broad general autonomy 未被支持”，不是“Devin 完全不能用/开发者共识”。

> 以上任一项未经确认，不得把本文件标为“人工已确认”或“人工金标准”。

### 8.2 模型辅助核对结果与人工剩余重点

核对时间：2026-10-25T13:48:20+08:00；核对者：Codex（模型，已看参考，非盲）。以下结论仅为本轮辅助意见，不能代替实际核查者签署。逐 E 的网址、当前匹配、定位修正及保存依据见 [case.md](case.md)。

| 问题／主张 | 本轮结论 | 依据与限制 |
|---|---|---|
| Q1–Q2 / C1–C3、C7、C12 | 模型核对宣称存在 | 官方 broad 文本与明确任务条件/局限均存在；不是独立性能证实。 |
| Q3 / C4 | 需收窄判断 | 2025 样本不足以证实广泛自主能力；有失败反例，但不能直接反驳 2026 的全部能力或标题标签。 |
| Q3、Q6 / C5 | 有限支持 | 早期成功和条件性 HN 成功报告存在；E11 原句在 Conclusion，E17 不证明完成任务。 |
| Q3 / C6 | 保留证据不足 | 4x/67% 原句已补 E21/E22；只解决官方出处，不解决原始方法/同任务省时验证。 |
| Q4 / C8、C11 | 需区分张力与逻辑矛盾 | 宽泛定位与窄条件存在解释张力；不同时间/任务，不能直接认定同条件自相矛盾；版本映射仍不足。 |
| Q5 / C13 | 来源关系有限确认 | 同帖摘录按作者合并；Answer.AI 是自述测试、HN 是公开使用报告，未独立调查未披露利益关系，不宣称排除所有关联。 |
| Q6 / C9、C10 | 保留证据不足 | benchmark 与 20 任务不是同任务集；本轮未开展 2026 全网测试检索，不能写全网没有测试。 |

**你优先复看的内容：** 优先人工判断 C4/C8 的范围是否收窄合适，以及公开来源关系是否充分。E10/E11 的章节定位已在材料核查表纠正。4x/67% 不再缺官方原句（E21/E22），仍缺方法/原始数据的独立复核。2026 测试、版本映射与同任务省时证据未补；不要求调查私人身份。

其余“原句匹配”项可直接复看本轮标注和对应结论，无须重新从关键词搜索。确认时仍须注明实际阅读范围；未看过的项不并签。

**对历史草稿的修正口径：** C4 的普遍结论只能判证据不足；既有失败可作 2025 样本内反例，不能把该类反例直接扩大到全部广泛任务/2026。C8 保留文本张力，但同条件事实矛盾尚未成立。E10 正确定位为 A Deeper Look at What Went Wrong；E11 为 Conclusion。4x/67% 已补官方出处 E21/E22，G5 的独立方法/数据缺口继续保留。

## 9. 模型协助说明

- 是否使用模型：是。
- 用途：网页搜索线索、官方页面/Answer.AI/HN 抓取、评论 ID 与时间整理、英文原句的中文翻译候选。
- 模型没有做的事：没有代替乙签署人工确认；没有生成系统运行结果；没有补造 HN 评论或官方原文。
- 人工核对：用户已在本对话确认当前辅助修订版本通过，依据与范围见 §8；逐网页操作时间未另行提供。

## 10. 系统对照

> 系统未运行：正式 handler 返回 `unavailable("investigation orchestration")`，无调查 ID、无快照。以下是状态记录，不是对照结果。

| Q-ID | 参考结论（摘要） | 系统结论（摘要） | 对照 | 差异／依据 |
|---|---|---|---|---|
| Q1 | 官方 2024/2026 broad + 2025 缩窄 | 未运行 | 系统缺失 | 无 investigation_id／snapshot_id |
| Q2 | Answer.AI 3/20；HN 直接报告混合 | 未运行 | 系统缺失 | 同上 |
| Q3 | 部分支持/反驳/条件/主观 | 未运行 | 系统缺失 | 同上 |
| Q4 | X1/X2 张力；同条件矛盾待核 | 未运行 | 系统缺失 | 同上 |
| Q5 | 官方同组；AnswerAI 独立；2 位 HN 作者 | 未运行 | 系统缺失 | 同上 |
| Q6 | 支持有限；2026 缺独立测试 | 未运行 | 系统缺失 | 同上 |

引用对照：无系统引用可查。运行输入未包含本文件；`reference_used` 未填 false，因为未运行。

## 11. 评估

> 以下为历史参考草稿自检，不是本轮通过结论；后续修正和关闭条件见[案例状态](../../D1-状态与验收记录.md)。

### 11.1 人工参考判断

| 标准 | 结论 | 依据 | 备注 |
|---|---|---|---|
| G1 身份／版本 | 通过 | 官方页面/发布文；Devin 与 Devin Review 等分列 | 版本无公开号 |
| G2 事实 | 部分 | E1–E13；X1/X2；G1/G2 | 官方文本与独立测试均有 |
| G3 引用有效 | 通过 | E1–E20 有 URL、原句、定位、hash | 无悬空引用 |
| G4 原句支持 | 部分 | E1–E18；E19/E20 只作 CONTEXT | 不把官方营销当独立事实 |
| G5 冲突／缺口 | 部分 | X1–X4、G1–G7 | 保留文本张力；真实冲突验收项需实际复核 |
| G6 过度推断 | 通过 | 未写“开发者共识”；未写“完全不能用”；未写 2026 失败 | 范围限定 |
| G7 独立性 | 通过 | 官方 1 组；AnswerAI 1；HN 2 位作者；E14–E16/E17–E18 同源 | 不按摘录数计 |
| G8 六项完整 | 部分 | 材料齐全；复核未完成 | 待实际独立复核 |
| G9 状态诚实 | 通过 | 系统未运行；无调查 ID／快照 | 未伪造 |
| G10 参考隔离 | 通过 | 系统未运行；参考未送入 | 未发生泄漏 |
| G11 可复现 | 通过 | URL、定位、hash、获取时间 | HN 评论页/官方页未来可能变化 |
| G12 范围／意图 | 部分 | 回答 B 问题；2026/版本缺口明示 | 不能给 general 结论 |

### 11.2 系统结果

系统未运行，无法评估；不把预期失败写成结果。系统评估结论：`无法评估`。

### 11.3 阻断检查

| 阻断 ID | 是否成立 | 证据 | 处理 |
|---|---|---|---|
| X1–X12 | 未发现（材料自检） | 见 case.md §14 | 待实际独立复核 |

## 12. 最终结论

```yaml
object: "reference"
verdict: "通过" # 当前参考版本人工确认，保留未知；不代表 D1 整体验收通过
blocking: []
conditions:
  - "2026 独立测试、版本映射、同任务生产力及来源关联等缺口保留；认可 C4/C8 收窄和官方 4x/67% 仅为自述的处理，不把文本张力升级为同条件矛盾。"
  - "独立复核、保存依据交付和真实系统对照仍按 D1 状态记录推进"
evaluator: "乙（本对话用户）"
evaluated_at: "2026-10-25T13:55:51+08:00"
```

## 13. 变更记录

| 日期 | 变更 | 变更人 |
|---|---|---|
| 2026-10-24 | 创建 B-01 人工参考草稿；标记待人工核实；无系统运行 | 乙 |
| 2026-10-25 | Codex 非盲复查：E17 对 C5 改为上下文；保留 Jan 2025 使用范围、2026 缺口及待人工确认状态 | Codex（模型协助） |
| 2026-10-25 | 新增 §8.2 联网辅助核对及人工优先项，修订有过度推断风险的判断；人工签署保持空 | Codex（模型辅助、非盲） |
| 2026-10-25 | 根据本对话用户明确确认，将当前参考版本记为人工已确认/参考通过；保留未知和非盲属性，未签独立复核或 D1 验收 | 乙确认；Codex 代录 |
