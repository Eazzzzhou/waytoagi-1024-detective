---
case_id: "B-01"
case_type: "B"
title: "Devin 自主软件工程能力"
owner: "乙"
created_at: "2026-10-24T22:34:00+08:00"
updated_at: "2026-10-24T22:37:26+08:00"
status:
  material: "人工已确认"
  system: "已运行；结构评估未通过"
  review: "未复核"
question_sha256: "b53901e4c8505769745d6601abe55a87e65e175f9a793934c0d7fb7a4cb468f7"
system_run_id: "formal-2026-10-25T07-17-01-085Z"
snapshot_id: "9ebf5968-e18d-4c89-8ef9-262896a200fc"
snapshot_version: 1
---

# B-01 · Devin 自主软件工程能力

> 材料状态：人工已确认 · 系统状态：真实任务已完成，结构评估 FAIL · 复核状态：未复核
>
> 本文件记录真实官方材料、海外原文、主张关系、冲突与系统阻塞，不记录人工参考答案。参考判断在 `reference.md`，独立复核在 `review.md`。
>
> **当前材料/参考已由乙（本对话用户）确认通过，保留已列未知。** 确认依据与范围见 reference.md §8；本轮正式运行见 §12.5，独立复核未完成。

## 1. 案例标识

| 字段 | 值 | 说明 |
|---|---|---|
| 案例 ID | B-01 | 与目录、索引一致 |
| 类型 | B | 海外开发者观点与真实冲突 |
| 当前组织 | 乙丙 | 材料、关系、交付完整性；历史owner原值保留 |
| 创建／更新时间 | 2026-10-24T22:34:00+08:00 / 2026-10-24T22:37:26+08:00 | Asia/Shanghai |
| 材料状态 | 人工已确认 | 用户确认当前辅助修订版本，保留已列未知；详见 reference.md §8 |
| 系统状态 | SUCCEEDED／结构评估 FAIL | 正式 API／Worker 已生成快照；来源分类不全，见 §12.5 |
| 复核状态 | 未复核 | 实际独立复核尚未完成 |

## 2. 问题与意图

### 2.1 用户问题原话

> Cognition 官方称 Devin 是“first autonomous software engineer”并能独立完成软件工程任务；Hacker News 和独立测试的实际使用报告是否支持这一说法？

- 问题来源／获取时间：用户本轮指定 B 类模板 + 产品，2026-10-24T22:30:00+08:00
- 是否包含多个问题：是；拆为 §5 的 Q1–Q6
- 回答意图：客观搜查

### 2.2 系统提交问题

| 字段 | 值 |
|---|---|
| 提交问题（API `question`） | `Cognition 官方称 Devin 是“first autonomous software engineer”并能独立完成软件工程任务；Hacker News 和独立测试的实际使用报告是否支持这一说法？` |
| SHA-256（UTF-8 字节） | `b53901e4c8505769745d6601abe55a87e65e175f9a793934c0d7fb7a4cb468f7` |
| 是否与 2.1 一致 | 是 |

## 3. 产品身份

| 字段 | 值 | 说明 |
|---|---|---|
| 产品名 | Devin | Cognition 的自主软件工程产品；不是 Devin Review 单一功能，也不是 Devin Desktop |
| 官方站点 | https://devin.ai/；https://cognition.com/ | 产品页与公司页 |
| 版本 | `null`（无公开版本号） | 2024-03-12 发布；2025-11-14 官方回顾；当前 2026 页面未标版本 |
| 套餐 | `null` | 本案例核对能力宣称，不是套餐额度 |
| 地区 | `null` | 云端/本地产品；官方页面未强调地区限制；非本案例核心 |
| 账号类型 | `null` | 企业/团队产品；本案例不核对定价或席位 |
| 身份状态 | CONFIRMED | 官方产品页、公司页与 2024 发布文可定位 |
| 歧义／消歧说明 | 只讨论 Devin 自主编码代理；不把 Devin Review、Devin Desktop 或 Cognition 其他产品混入 | 见 §3.1 |

### 3.1 身份依据

| # | URL | 原句（≤300） | 获取时间 | 确认理由 |
|---|---|---|---|---|
| I1 | https://devin.ai/ | Meet Devin, your team's autonomous software engineer | 2026-10-24T22:32:03+08:00 | 官方产品页命名 Devin 并给出自主软件工程师定位 |
| I2 | https://cognition.com/blog/introducing-devin | Introducing Devin, the first AI software engineer | 2026-10-24T22:31:59+08:00 | 官方发布文命名产品与首发宣称 |
| I3 | https://cognition.com/ | the first autonomous software engineer | 2026-10-24T22:32:01+08:00 | 公司首页当前定位；原文句子为 “Cognition operates Devin, the first autonomous software engineer.”，链接文字在 Devin 前后有空格 |

> `CONFIRMED` 只表示产品与官方来源可确认，不表示能力宣称已被独立证据支持。

## 4. 时间与适用

| 字段 | 值 | 说明 |
|---|---|---|
| 研究开始 | 2026-10-24T22:30:00+08:00 | 本次检索开始 |
| 研究结束 | 2026-10-24T22:34:00+08:00 | 本次检索结束 |
| 事实基准日 | 2026-10-24 | 结论依据材料截止到该日 |
| 事实适用起 | 2024-03-12 | 2024 发布文声称的起点；不是独立验证起点 |
| 事实适用止 | `null` | 当前官网仍使用 broad claim；没有官方结束日 |
| 适用依据 | 2024 发布文、2025 官方回顾、当前产品/公司页 | 见 §7 |
| 时区 | Asia/Shanghai（显示） | 存储用含偏移 ISO 8601 |

> 时间线是本案例的核心条件：2024-03-12 官方发布；2025-01-08 Answer.AI 实测；2025-01-17 HN 讨论；2025-11-14 官方性能回顾；2026-10-24 当前页面仍写 “first autonomous software engineer / ships production code on its own”。2025 实测不能自动代表 2026 产品，2024 宣称也不能自动代表当前实现。

## 5. 核查范围与原子问题

### 5.1 范围

- 在范围内：Devin 的自主软件工程能力宣称；2024 发布文；2025 官方性能回顾；2025-01 Answer.AI 实测；2025-01 HN 直接使用报告；当前 2026 官方页面。
- 不在范围内：Devin 定价与席位；Devin Review/Desktop 单独功能；所有客户案例；未公开的企业内部版本；2026 产品的独立实测（未取得）。
- 回答意图：客观搜查。

### 5.2 原子问题

| Q-ID | 原子问题 | 关联主张 | 判断标准／需要的证据 |
|---|---|---|---|
| Q1 | 官方到底宣称了什么能力、在什么时间和条件下？ | C1、C2、C3、C9 | 官方原句、日期、版本/阶段、benchmark 条件 |
| Q2 | 独立测试与 HN 直接使用者具体报告了什么？ | C4、C5、C6、C7、C10 | 原文、作者、时间、场景、版本、第一手/转述 |
| Q3 | 哪些材料支持、反驳、只是条件不同或主观偏好？ | C4、C5、C6、C7 | 按同一能力范围逐条分类 |
| Q4 | 是否存在真正的事实冲突？版本/条件能解释多少？ | C7、C8、C11 | 双方原句、条件、未解决部分 |
| Q5 | 来源是否独立？是否存在同作者/同帖/同上游？ | C13 | 作者、评论 ID、thread、上游 |
| Q6 | 现有证据能支持到什么程度，不能支持什么？ | C4、C6、C10、C12 | 结论强度不超过证据；保留 2026 缺口 |

### 5.3 类型特有门槛

- B：至少一条官方宣称 READ、至少一条海外原文 READ；真实冲突找到并保留；同源关系识别；结论带范围。本案例满足前两项，冲突见 §9。

## 6. 检索记录

| R-ID | 提供方 | 查询词／目标 | 调用时间 | 状态 | 错误 | 返回来源／采用情况 |
|---|---|---|---|---|---|---|
| R1 | 手工网页搜索（非系统提供方） | Devin first AI software engineer official Hacker News review | 2026-10-24T22:30+08:00 | SUCCEEDED | null | 定位官方博客、Answer.AI、HN；采用为 E1–E20 的线索 |
| R2 | 直接抓取（curl） | https://cognition.com/blog/introducing-devin | 2026-10-24T22:31:59+08:00 | SUCCEEDED | null | E1–E4、I2 |
| R3 | 直接抓取（curl） | https://cognition.com/blog/devin-annual-performance-review-2025 | 2026-10-24T22:31:59+08:00 | SUCCEEDED | null | E8–E9 |
| R4 | 直接抓取（curl） | https://www.answer.ai/posts/2025-01-08-devin | 2026-10-24T22:32:00+08:00 | SUCCEEDED | null | E10–E13 |
| R5 | 直接抓取（curl） | https://cognition.com/ | 2026-10-24T22:32:01+08:00 | SUCCEEDED | null | E5–E6、I3 |
| R6 | 直接抓取（curl） | https://devin.ai/ | 2026-10-24T22:32:03+08:00 | SUCCEEDED | null | E7、I1 |
| R7 | HN 网页/API | https://news.ycombinator.com/item?id=42734681 | 2026-10-24T22:32:00+08:00 | SUCCEEDED | null | HN thread 元数据；评论 E14–E20 |
| R8 | HN 评论页 | 42734916／42736857／42735023／42735633 | 2026-10-24T22:32:40–45+08:00 | SUCCEEDED | null | 保存评论原文与时间 |

> 本次是 D1 人工核查，不是系统提供方检索；未使用元宝，也不把 HN 讨论当成系统运行。只访问公开页面，未绕过登录、付费墙或反爬。原始 HTML 保存在忽略的 `.cache/d1/b-01/raw/`，不纳入交付；证据以 URL、原句、定位和 hash 为准。

## 7. 证据

### 7.1 来源与元数据

| E-ID | URL（直达） | 标题／站点 | 作者／公开账号 | 发布时间 | 获取时间 | 语言 | sourceType | contentKind | 版本／套餐 | readStatus | readError |
|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | https://cognition.com/blog/introducing-devin | Introducing Devin, the first AI software engineer／cognition.com | Scott Wu | 2024-03-12T00:00:00Z | 2026-10-24T22:31:59+08:00 | en | OFFICIAL | OFFICIAL_CLAIM | 2024 launch／null | READ | null |
| E2 | https://cognition.com/blog/introducing-devin | 同上 | Scott Wu | 2024-03-12T00:00:00Z | 2026-10-24T22:31:59+08:00 | en | OFFICIAL | OFFICIAL_CLAIM | 2024 launch／null | READ | null |
| E3 | https://cognition.com/blog/introducing-devin | 同上 | Scott Wu | 2024-03-12T00:00:00Z | 2026-10-24T22:31:59+08:00 | en | OFFICIAL | OFFICIAL_CLAIM | 2024 launch／null | READ | null |
| E4 | https://cognition.com/blog/introducing-devin | 同上 | Scott Wu | 2024-03-12T00:00:00Z | 2026-10-24T22:31:59+08:00 | en | OFFICIAL | OFFICIAL_CLAIM | 2024 launch／null | READ | null |
| E5 | https://cognition.com/ | Cognition／cognition.com | Cognition | null | 2026-10-24T22:32:01+08:00 | en | OFFICIAL | OFFICIAL_CLAIM | current 2026 site／null | READ | null |
| E6 | https://cognition.com/ | 同上 | Cognition | null | 2026-10-24T22:32:01+08:00 | en | OFFICIAL | OFFICIAL_CLAIM | current 2026 site／null | READ | null |
| E7 | https://devin.ai/ | Meet Devin, your team's autonomous software engineer／devin.ai | Cognition | null | 2026-10-24T22:32:03+08:00 | en | OFFICIAL | OFFICIAL_CLAIM | current 2026 site／null | READ | null |
| E8 | https://cognition.com/blog/devin-annual-performance-review-2025 | Devin's 2025 Performance Review／cognition.com | The Cognition Team | 2025-11-14T00:00:00Z | 2026-10-24T22:31:59+08:00 | en | OFFICIAL | OFFICIAL_CLAIM | 2025 review／null | READ | null |
| E9 | https://cognition.com/blog/devin-annual-performance-review-2025 | 同上 | The Cognition Team | 2025-11-14T00:00:00Z | 2026-10-24T22:31:59+08:00 | en | OFFICIAL | OFFICIAL_CLAIM | 2025 review／null | READ | null |
| E10 | https://www.answer.ai/posts/2025-01-08-devin | Thoughts On A Month With Devin／answer.ai | Hamel Husain、Isaac Flath、Johno Whitaker | 2025-01-08T00:00:00Z | 2026-10-24T22:32:00+08:00 | en | THIRD_PARTY | FACT | Jan 2025 test／null | READ | null |
| E11 | https://www.answer.ai/posts/2025-01-08-devin | 同上 | Hamel Husain、Isaac Flath、Johno Whitaker | 2025-01-08T00:00:00Z | 2026-10-24T22:32:00+08:00 | en | THIRD_PARTY | FACT | Jan 2025 test／null | READ | null |
| E12 | https://www.answer.ai/posts/2025-01-08-devin | 同上 | Hamel Husain、Isaac Flath、Johno Whitaker | 2025-01-08T00:00:00Z | 2026-10-24T22:32:00+08:00 | en | THIRD_PARTY | FACT | Jan 2025 test／null | READ | null |
| E13 | https://www.answer.ai/posts/2025-01-08-devin | 同上 | Hamel Husain、Isaac Flath、Johno Whitaker | 2025-01-08T00:00:00Z | 2026-10-24T22:32:00+08:00 | en | THIRD_PARTY | FACT | Jan 2025 test／null | READ | null |
| E14 | https://news.ycombinator.com/item?id=42734916 | HN comment 42734916／news.ycombinator.com | tlarkworthy | 2025-01-17T07:17:11Z | 2026-10-24T22:32:40+08:00 | en | COMMUNITY | USER_REPORT | Jan 2025 test／null | READ | null |
| E15 | https://news.ycombinator.com/item?id=42734916 | 同上 | tlarkworthy | 2025-01-17T07:17:11Z | 2026-10-24T22:32:40+08:00 | en | COMMUNITY | USER_REPORT | Jan 2025 test／null | READ | null |
| E16 | https://news.ycombinator.com/item?id=42734916 | 同上 | tlarkworthy | 2025-01-17T07:17:11Z | 2026-10-24T22:32:40+08:00 | en | COMMUNITY | USER_REPORT | Jan 2025 test／null | READ | null |
| E17 | https://news.ycombinator.com/item?id=42736857 | HN comment 42736857／news.ycombinator.com | rfoo | 2025-01-17T12:34:21Z | 2026-10-24T22:32:41+08:00 | en | COMMUNITY | USER_REPORT | Jan 2025 test／null | READ | null |
| E18 | https://news.ycombinator.com/item?id=42736857 | 同上 | rfoo | 2025-01-17T12:34:21Z | 2026-10-24T22:32:41+08:00 | en | COMMUNITY | USER_REPORT | Jan 2025 test／null | READ | null |
| E19 | https://news.ycombinator.com/item?id=42735023 | HN comment 42735023／news.ycombinator.com | davedx | 2025-01-17T07:42:22Z | 2026-10-24T22:32:43+08:00 | en | COMMUNITY | OPINION | Jan 2025 discussion／null | READ | null |
| E20 | https://news.ycombinator.com/item?id=42735633 | HN comment 42735633／news.ycombinator.com | falcor84 | 2025-01-17T09:23:04Z | 2026-10-24T22:32:45+08:00 | en | COMMUNITY | OPINION | Jan 2025 discussion／null | READ | null |

### 7.2 原文、译文与定位

| E-ID | originalExcerpt（原文，≤300） | translation（译文，非原话） | originalLocation（kind／locator／context） | contentHash（SHA-256） |
|---|---|---|---|---|
| E1 | Devin is a tireless, skilled teammate, equally ready to build alongside you or independently complete tasks for you to review. | Devin 是一个不知疲倦、技术娴熟的队友，既能与你并肩构建，也能独立完成任务供你审阅。 | TEXT／2024 blog > 开头第一段／发布文的 broad claim | 11cb3794a8d50a16b4cfc025730b96bd0e08ab798e21200405ded5f178a04895 |
| E2 | Devin can plan and execute complex engineering tasks requiring thousands of decisions. | Devin 能够规划和执行需要数千次决策的复杂工程任务。 | TEXT／2024 blog > "Devin's Capabilities" > 第一段／能力范围 | 11cb3794a8d50a16b4cfc025730b96bd0e08ab798e21200405ded5f178a04895 |
| E3 | Devin correctly resolves 13.86%* of the issues end-to-end, far exceeding the previous state-of-the-art of 1.96%. | Devin 能端到端正确解决 13.86%* 的 issue，远超此前最先进的 1.96%。 | TEXT／2024 blog > "Devin's Performance" > 第一段／官方 benchmark 数字 | 11cb3794a8d50a16b4cfc025730b96bd0e08ab798e21200405ded5f178a04895 |
| E4 | Devin was evaluated on a random 25% subset of the dataset. Devin was unassisted, whereas all other models were assisted (meaning the model was told exactly which files need to be edited). | Devin 在数据集的随机 25% 子集上评估。Devin 是无辅助的，而其他所有模型都是有辅助的（即模型被明确告知需要编辑哪些文件）。 | TEXT／2024 blog > "Devin's Performance" > 图表后段落／benchmark 条件 | 11cb3794a8d50a16b4cfc025730b96bd0e08ab798e21200405ded5f178a04895 |
| E5 | the first autonomous software engineer | 第一位自主软件工程师 | TEXT／cognition.com 首页 section 01／完整句为 “Cognition operates Devin, the first autonomous software engineer.”；链接文字在 Devin 前后有空格 | fe1c45f246c73f90d5d775dffec96ce7414f1af64506635252478ce7afb5a0a4 |
| E6 | Devin plans, writes, tests, and ships production code on its own, working inside your codebase and the tools your team already uses. | Devin 能自行规划、编写、测试并交付生产代码，在你的代码库和团队现有工具中工作。 | TEXT／cognition.com 首页 section 01 > 段落／当前 broad claim | fe1c45f246c73f90d5d775dffec96ce7414f1af64506635252478ce7afb5a0a4 |
| E7 | Devin runs in the cloud or on your machine, tests in its own browser, and won't stop until the PR is ready to merge | Devin 能在云端或你的机器上运行，在自己的浏览器中测试，并且在 PR 准备好合并之前不会停下。 | TEXT／devin.ai hero 段落／当前产品页的 autonomy 措辞 | c44c63f80ba1c0beb08189447b700ae0e8695ab846569a40062659d4994987a9 |
| E8 | Devin excels at tasks with clear, upfront requirements and verifiable outcomes that would take a junior engineer 4-8 hrs of work. | Devin 擅长需求清晰、结果可验证、原本需要初级工程师 4–8 小时完成的任务。 | TEXT／2025 review > "Strength pattern #1" > 第一段／官方后来缩窄的能力范围 | 49725411f002b3520d7f3b53c712acdc825d00c7c5452dc68a727bcd6e262238 |
| E9 | Devin can't independently tackle an ambiguous coding project end-to-end like a senior engineer could, using its own judgement. | Devin 无法像资深工程师那样，凭借自己的判断独立端到端处理模糊的编码项目。 | TEXT／2025 review > "Devin's areas for improvement" > "Independent execution on ambiguous requirements"／官方自述局限 | 49725411f002b3520d7f3b53c712acdc825d00c7c5452dc68a727bcd6e262238 |
| E10 | Out of 20 tasks, we had 14 failures, 3 successes (including our 2 initial ones), and 3 inconclusive results. | 在 20 个任务中，我们有 14 个失败、3 个成功（包括最初的两个）和 3 个无结论结果。 | TEXT／Answer.AI > "Scaling Up Our Testing"／独立测试结果 | dfb27421da13760e03e62979573a72ac21016ad3d7cc36cff870160118ad892f |
| E11 | When it worked, it was impressive. | 当它奏效时，令人印象深刻。 | TEXT／Answer.AI > "Early Wins"／正面但有条件 | dfb27421da13760e03e62979573a72ac21016ad3d7cc36cff870160118ad892f |
| E12 | But that’s the problem - it rarely worked. | 但问题就在这里——它很少奏效。 | TEXT／Answer.AI > "Conclusion"／负面总结 | dfb27421da13760e03e62979573a72ac21016ad3d7cc36cff870160118ad892f |
| E13 | Tasks that seemed straightforward often took days rather than hours, with Devin getting stuck in technical dead-ends or producing overly complex, unusable solutions. | 看似直接的任务常常要花几天而不是几小时，Devin 会陷入技术死胡同，或产出过于复杂、不可用的方案。 | TEXT／Answer.AI > "Scaling Up Our Testing"／使用条件与失败模式 | dfb27421da13760e03e62979573a72ac21016ad3d7cc36cff870160118ad892f |
| E14 | Also trialed Devin, it's quite impressive when it understands the code formatting and local test setup, producing well formatted and test case passing code | 我也试用过 Devin；当它理解代码格式和本地测试设置时相当令人印象深刻，能产出格式良好且通过测试用例的代码。 | TEXT／HN comment 42734916 > 第一段／直接使用；条件性正面 | f139bbe37472cebd3b9372456e0b6582176b59e70d74d09240b31f7d8aaefc05 |
| E15 | it seems to always add extraneous changes beyond the task that can break other things. And it can't seem to undo those changes if you ask. So everything requires more cleanup. | 但它似乎总会在任务之外加入多余改动，可能破坏其他东西；而且你要求时它似乎无法撤销这些改动。所以一切都需要更多清理。 | TEXT／HN comment 42734916 > 第一段／直接使用；负面 | f139bbe37472cebd3b9372456e0b6582176b59e70d74d09240b31f7d8aaefc05 |
| E16 | I am gonna recommend cancelling it because it's not actually saving time and it's quite expensive. | 我会建议取消它，因为它实际上没有节省时间，而且相当贵。 | TEXT／HN comment 42734916 > 第一段结尾／直接使用；负面 | f139bbe37472cebd3b9372456e0b6582176b59e70d74d09240b31f7d8aaefc05 |
| E17 | Devin does ask for help when it can't do something. | Devin 在无法完成某事时确实会求助。 | TEXT／HN comment 42736857 > 第一段／直接使用；条件性正面 | f7d8406233cbe192ed0f5e71b20b4f162e2ccff54627f6cb10436ce4d6cf0f18 |
| E18 | The problem is it really really hate asking for help if it had a skill issue, it would prefer running in circles than admitting it just can't do something. | 问题是，如果它自身能力不足，它非常非常讨厌求助；它宁愿原地打转，也不愿承认自己就是做不到。 | TEXT／HN comment 42736857 > 第二段／直接使用；负面 | f7d8406233cbe192ed0f5e71b20b4f162e2ccff54627f6cb10436ce4d6cf0f18 |
| E19 | there doesn't seem to be an "ask for help" escape hatch in it - it would work away for literally days on a task where any human would admit they were stuck? | 它似乎没有“求助”的逃生口——它会在任何人类都会承认卡住的任务上连续工作好几天？ | TEXT／HN comment 42735023 > 第一段／对文章的直接反应；未明确自称使用 Devin | 4afe3e23c001cd82e7ea53ec2cd507cfc53d98dc6f1c119db408bba45166e5da |
| E20 | it seems that its stated 13.86% almost exactly matches this 3 successes out of 20 pilot outcome. | 它声称的 13.86% 似乎几乎正好对应这个 20 次试点中 3 次成功的结果。 | TEXT／HN comment 42735633 > 第一段／对文章数字的分析；非直接使用 | 056e5205458939150004dcbac920cd60fe1803899fea2991ff81933826b56b0b |

> 原句逐字符摘录；E14–E16 来自同一条 HN 评论，E17–E18 来自另一条 HN 评论，不能当成多条独立报告。译文仅辅助理解，不能作为引用原句。所有 READ 证据都有定位和 SHA-256；hash 针对 2026-10-24 抓取的原始 HTML。

### 7.3 同源与独立性

| E-ID | upstreamUrl | independence | originGroupId | independenceReason |
|---|---|---|---|---|
| E1–E9 | null | SHARED_ORIGIN | cognition-official | 同一发布方 Cognition 的官方页面/博客；官方自我宣称，不作为独立证据 |
| E10–E13 | null | INDEPENDENT | answerai-test | Answer.AI 独立第三方测试；未披露与 Cognition 的隶属关系；同一文章内多条摘录不重复计数 |
| E14–E16 | null | INDEPENDENT | hn-tlarkworthy | 同一 HN 评论、同一作者的直接试用报告；三条摘录只算一个来源 |
| E17–E18 | null | INDEPENDENT | hn-rfoo | 同一 HN 评论、同一作者的直接使用报告；两条摘录只算一个来源 |
| E19 | https://www.answer.ai/posts/2025-01-08-devin | UNKNOWN | null | 对 Answer.AI 文章的直接反应；未明确自称使用 Devin，不能算直接使用报告 |
| E20 | https://www.answer.ai/posts/2025-01-08-devin | UNKNOWN | null | 对文章数字的分析；非直接使用，不能算独立性能证据 |

### 7.4 独立性汇总

| 项 | 值 | 说明 |
|---|---|---|
| 官方来源组 | 1 | Cognition 官方博客/公司页/产品页 |
| 独立第三方测试 | 1 | Answer.AI 的 20 任务测试 |
| HN 直接使用作者 | 2 | tlarkworthy、rfoo；各自一条评论，不能按摘录数计 |
| HN 上下文/分析作者 | 2 | davedx、falcor84；不计入独立性能证据 |
| 独立来源总数（性能证据） | 3 | Answer.AI + 2 位 HN 直接使用者；不是代表性样本 |
| 已列作者／文章分组 | 4 | cognition-official、answerai-test、hn-tlarkworthy、hn-rfoo；仅作来源关系索引，不是各主张的独立支持票数 |
| 开发者群体共识 | 否 | 2 位 HN 直接使用者 + 1 个 20 任务测试，不能代表开发者群体 |

### 7.5 海外原句与关系分类

| E-ID | 平台／作者／时间 | 场景与版本 | 一手／转述 | 分类 |
|---|---|---|---|---|
| E10 | Answer.AI／Hamel Husain 等／2025-01-08 | 20 个真实任务：新建项目、研究、分析/修改现有代码；Jan 2025 Devin，版本未说明 | 第一手独立测试 | 直接反驳“广泛真实任务”的 general claim；不是对“某些任务能成”的反驳 |
| E11 | Answer.AI／同上 | 早期 Notion→Google Sheets、planet tracker 等少数任务 | 第一手独立测试 | 直接支持“某些 well-scoped 任务能成”；条件成立 |
| E12 | Answer.AI／同上 | 同上 | 第一手独立测试 | 直接反驳 broad autonomy；作者总结 |
| E13 | Answer.AI／同上 | 任务看似直接但耗时数天；技术死胡同 | 第一手独立测试 | 直接反驳“节省时间/自主完成”的 general claim；条件不同 |
| E14 | HN／tlarkworthy／2025-01-17 | 代码格式、本地测试设置；Jan 2025，版本未说明 | 第一手使用报告 | 条件性支持：在本地测试/格式化场景能产出通过测试的代码 |
| E15 | HN／tlarkworthy／2025-01-17 | 同一试用；多余改动、不可撤销 | 第一手使用报告 | 直接反驳“可直接合并/低清理” |
| E16 | HN／tlarkworthy／2025-01-17 | 同一试用；没有节省时间、昂贵 | 第一手使用报告 | 直接反驳“generally saves time” |
| E17 | HN／rfoo／2025-01-17 | 需要人帮忙运行测试套件 | 第一手使用报告 | 条件性支持“会求助”；不证明自主 |
| E18 | HN／rfoo／2025-01-17 | 能力不足时不愿求助，原地打转 | 第一手使用报告 | 直接反驳“autonomous/不需要人”的 general claim |
| E19 | HN／davedx／2025-01-17 | 对文章的反应；未明确使用 Devin | 转述/评论 | 主观偏好/证据不足；只作上下文 |
| E20 | HN／falcor84／2025-01-17 | 对 3/20 与 13.86% 的数值比较 | 分析/评论 | 证据不足/上下文；不证明 general capability |

> 分类只针对本条材料与主张的关系；“直接反驳”不表示 Devin 在所有场景失败，也不表示开发者群体共识。

### 7.6 模型辅助联网核查标注

> 本轮直接获取时间：2026-10-25T13:48:20+08:00（各 URL 的精确时间见保存清单）。Codex 已看参考，属于非盲模型辅助核查；人工状态及署名保持待确认。历史 §7.1/§7.2 的获取时间、原句、hash 不覆盖。
> 原句匹配仅表示空白归一化后在本次解析正文找到，语义/定位意见另列；不表示独立实测、人工通过或 D1 验收通过。网页搜索工具可能返回缓存，以下“直接”专指本机公开 GET。

本轮历史证据直接匹配 **20/20**。标记说明：原句匹配＝可先看对应结论；定位需修正＝按本表新定位复找；待复查＝不能视为本轮逐字核实。

| E-ID | 原始网址 | 本轮标记 | 对应结论与阅读提示 |
|---|---|---|---|
| E1 | [来源](https://cognition.com/blog/introducing-devin) | 原句匹配 | 发布文首段；只证明官方宣称存在。 |
| E2 | [来源](https://cognition.com/blog/introducing-devin) | 原句匹配 | Capabilities 段；仍是官方能力宣称。 |
| E3 | [来源](https://cognition.com/blog/introducing-devin) | 原句匹配 | Performance 段；数字为官方 benchmark 口径。 |
| E4 | [来源](https://cognition.com/blog/introducing-devin) | 原句匹配 | 图表后条件：随机 25% 子集、辅助条件不同；不能跨任务比较。 |
| E5 | [来源](https://cognition.com/) | 原句匹配 | 首页标题；自我定位不等于独立证实。 |
| E6 | [来源](https://cognition.com/) | 原句匹配 | 首页标题下正文；不能解读为所有任务都能自主完成。 |
| E7 | [来源](https://devin.ai/) | 原句匹配 | 产品页 hero；营销表述不是成功率保证。 |
| E8 | [来源](https://cognition.com/blog/devin-annual-performance-review-2025) | 原句匹配 | Strength pattern #1；任务范围/4–8h，不是 4x/67% 摘录。 |
| E9 | [来源](https://cognition.com/blog/devin-annual-performance-review-2025) | 原句匹配 | Independent execution on ambiguous requirements；支持官方局限自述。 |
| E10 | [来源](https://www.answer.ai/posts/2025-01-08-devin) | 原句匹配，原定位需修正 | 实际在 A Deeper Look at What Went Wrong 段、任务分类之后；不是 Scaling Up Our Testing。 |
| E11 | [来源](https://www.answer.ai/posts/2025-01-08-devin) | 原句匹配，原定位需修正 | 实际在 Conclusion 首段末；不是 Early Wins。 |
| E12 | [来源](https://www.answer.ai/posts/2025-01-08-devin) | 原句匹配 | Conclusion；作者对自身测试的总结，非所有版本普遍表现。 |
| E13 | [来源](https://www.answer.ai/posts/2025-01-08-devin) | 原句匹配 | Scaling Up Our Testing；2025 测试中的失败模式。 |
| E14 | [来源](https://news.ycombinator.com/item?id=42734916) | 原句匹配 | tlarkworthy 同一评论含正面条件；自述直接试用，非独立复现实验。 |
| E15 | [来源](https://news.ycombinator.com/item?id=42734916) | 原句匹配 | 同一评论的负面条件；不能与 E14/E16 算三位使用者。 |
| E16 | [来源](https://news.ycombinator.com/item?id=42734916) | 原句匹配 | 同一评论的时间/费用评价；不代表总体生产力。 |
| E17 | [来源](https://news.ycombinator.com/item?id=42736857) | 原句匹配 | rfoo 紧接着自述请教测试套件，支持直接接触；求助不证明完成任务。 |
| E18 | [来源](https://news.ycombinator.com/item?id=42736857) | 原句匹配 | rfoo 第二段；同作者个体报告，不能代表开发者共识。 |
| E19 | [来源](https://news.ycombinator.com/item?id=42735023) | 原句匹配 | davedx 反应文章，提到其他 agents 经验；不能当 Devin 直接使用证据。 |
| E20 | [来源](https://news.ycombinator.com/item?id=42735633) | 原句匹配 | falcor84 比较数字；3/20=15%，不等于 13.86%，任务集也不同。 |

**本轮新增取得的依据（模型整理，待人工确认）**

| E-ID | URL | 新摘录 | 定位／范围 | 获取时间 | 本轮 HTML SHA-256 |
|---|---|---|---|---|---|
| E21 | [来源](https://cognition.com/blog/devin-annual-performance-review-2025) | 4x faster at problem solving | Strength pattern #1，E8 后的 Over the past year 段。官方自述，不是独立复核。 | 2026-10-25T13:48:16+08:00 | `49725411f002b3520d7f3b53c712acdc825d00c7c5452dc68a727bcd6e262238` |
| E22 | [来源](https://cognition.com/blog/devin-annual-performance-review-2025) | 67% of its PRs are now merged vs 34% last year | 同段 PR 合并比例；不能等同任务成功率或总体省时。 | 2026-10-25T13:48:16+08:00 | `49725411f002b3520d7f3b53c712acdc825d00c7c5452dc68a727bcd6e262238` |

**保存依据**

公开响应原始字节和解析文本保存在本机忽略目录 `.cache/d1/network-check-2026-10-25/`；[本轮获取清单](../../../.cache/d1/network-check-2026-10-25/manifest.json)含每个 URL 的时间、状态、保存路径、新 hash，以及修改前 case/reference/review hash。此本机保存不随 Git 交付，P-07 仍未关闭。外站可能动态变化，整页新旧 hash 不同不能单独证明原句改变。

| URL | 本次直接获取 | 保存字节 SHA-256 | 本机原始响应 |
|---|---|---|---|
| [来源](https://cognition.com/) | 2026-10-25T13:48:16+08:00；HTTP 200 | `fe1c45f246c73f90d5d775dffec96ce7414f1af64506635252478ce7afb5a0a4` | [HTML](../../../.cache/d1/network-check-2026-10-25/d1d3dcb02036789a.html) |
| [来源](https://cognition.com/blog/devin-annual-performance-review-2025) | 2026-10-25T13:48:16+08:00；HTTP 200 | `49725411f002b3520d7f3b53c712acdc825d00c7c5452dc68a727bcd6e262238` | [HTML](../../../.cache/d1/network-check-2026-10-25/619d7bac08e7c5f0.html) |
| [来源](https://cognition.com/blog/introducing-devin) | 2026-10-25T13:48:16+08:00；HTTP 200 | `11cb3794a8d50a16b4cfc025730b96bd0e08ab798e21200405ded5f178a04895` | [HTML](../../../.cache/d1/network-check-2026-10-25/849efdba3289775f.html) |
| [来源](https://devin.ai/) | 2026-10-25T13:48:17+08:00；HTTP 200 | `ca891836a989e17e0e0507d3ac7262f37ae41b8b9454982358744147064c4389` | [HTML](../../../.cache/d1/network-check-2026-10-25/2a40d519ee4084f6.html) |
| [来源](https://news.ycombinator.com/item?id=42734916) | 2026-10-25T13:48:17+08:00；HTTP 200 | `f139bbe37472cebd3b9372456e0b6582176b59e70d74d09240b31f7d8aaefc05` | [HTML](../../../.cache/d1/network-check-2026-10-25/3076ca662bb8b355.html) |
| [来源](https://news.ycombinator.com/item?id=42735023) | 2026-10-25T13:48:18+08:00；HTTP 200 | `4afe3e23c001cd82e7ea53ec2cd507cfc53d98dc6f1c119db408bba45166e5da` | [HTML](../../../.cache/d1/network-check-2026-10-25/130fc7465a946740.html) |
| [来源](https://news.ycombinator.com/item?id=42735633) | 2026-10-25T13:48:18+08:00；HTTP 200 | `056e5205458939150004dcbac920cd60fe1803899fea2991ff81933826b56b0b` | [HTML](../../../.cache/d1/network-check-2026-10-25/7aa82371b2581aa1.html) |
| [来源](https://news.ycombinator.com/item?id=42736857) | 2026-10-25T13:48:18+08:00；HTTP 200 | `f7d8406233cbe192ed0f5e71b20b4f162e2ccff54627f6cb10436ce4d6cf0f18` | [HTML](../../../.cache/d1/network-check-2026-10-25/6b54a779bb1f5db8.html) |
| [来源](https://www.answer.ai/posts/2025-01-08-devin) | 2026-10-25T13:48:19+08:00；HTTP 200 | `8458e48c7419fb7d1458381b8531c4d0b8fa7b6e9598f2ab3c52570329794c99` | [HTML](../../../.cache/d1/network-check-2026-10-25/15fa73f32781aed7.html) |
## 8. 主张与证据关系

### 8.1 主张

| C-ID | statement（原子主张） | kind | verificationStatus | verificationReason | scope | answersQuestion |
|---|---|---|---|---|---|---|
| C1 | 2024 官方宣称 Devin 是“first AI software engineer”，是“tireless, skilled teammate”，能独立完成任务，并能规划/执行需要数千次决策的复杂工程任务。 | OFFICIAL_CLAIM | SUPPORTED | E1、E2 直接给出 2024 发布文原句；这是官方自我宣称，不是独立验证。 | 2024-03-12 发布文；early access | Q1 |
| C2 | 当前官方仍称 Devin 是“first autonomous software engineer”，能自行规划、编写、测试并交付生产代码，直到 PR 可合并才停止。 | OFFICIAL_CLAIM | SUPPORTED | E5、E6、E7 直接给出当前公司页/产品页原句；这是当前官方定位。 | 2026-10-24 当前页面；无版本号 | Q1 |
| C3 | 2025 官方性能回顾把能力缩窄为“需求清晰、结果可验证、初级工程师 4–8 小时”的任务，并承认无法像资深工程师那样独立处理模糊项目。 | OFFICIAL_CLAIM | SUPPORTED | E8、E9 直接给出官方回顾原句；这是官方后来对自身局限的表述。 | 2025-11-14 官方回顾；18 个月产品 | Q1 |
| C4 | 独立证据支持“Devin 能在广泛真实软件工程任务上独立完成”的 general claim。 | FACT | INSUFFICIENT | 本轮语义复查：2025 测试与报告有失败反例，足以限制结论，但有限样本不直接反驳全部广泛任务/2026 能力；保留样本内反例。 | 2024/Jan 2025 产品与任务；不是 2026 产品 | Q2、Q3、Q6 |
| C5 | Devin 能完成至少一些 well-scoped 任务并产出可用代码。 | FACT | SUPPORTED | E11 的早期成功与 E14 的 HN 条件性正面；E17 只说明求助，不证明任务完成。 | Jan 2025 特定任务/场景；不代表 2026 | Q2、Q3 |
| C6 | Devin 在真实任务上总体上节省开发者时间。 | FACT | INSUFFICIENT | E15、E16 的 HN 直接报告说需要更多清理、没有节省时间；E8 原句只给适用任务及 4–8h，未摘录 4x 指标，不能据此证明节省时间；缺同任务测量。 | 测试任务与官方窄任务；不能外推 | Q2、Q3、Q6 |
| C7 | Cognition 在 2025 官方回顾中自述，Devin 无法像资深工程师一样独立端到端处理模糊编码项目。 | OFFICIAL_CLAIM | SUPPORTED | E9 直接支持这项官方自述局限；不等于独立实测全部能力。E10/E13 仅作 Jan 2025 上下文。 | 2025-11 官方自述；非 2026 独立实测 | Q3、Q4 |
| C8 | 2024/当前 broad claim 与 2025 官方回顾的能力描述存在真实张力。 | FACT | INSUFFICIENT | 本轮语义复查：宽泛定位与清晰任务/模糊项目局限存在解释张力；时间、任务不同，尚未证实同条件事实矛盾。 | 官方文本；时间/范围差异 | Q4 |
| C9 | 官方 SWE-bench 13.86% 能支持“Devin 具备 general autonomous software engineering”结论。 | FACT | INSUFFICIENT | E3 的 13.86% 仅在随机 25% 子集、unassisted 条件下；E4 给出条件；E20 指出 3/20 约 15% 近似，但任务集不同；benchmark 不能替代真实任务。 | SWE-bench；2024 发布文 | Q1、Q6 |
| C10 | 当前 2026 产品的 broad claim 已被独立证据支持。 | FACT | INSUFFICIENT | 独立测试是 Jan 2025，未覆盖 2026 产品；官方 2025 回顾虽称改进，但不是独立验证。 | 2026 产品；无独立测试 | Q2、Q6 |
| C11 | 版本/时间可以完全解释官方 broad claim 与独立报告之间的冲突。 | FACT | INSUFFICIENT | 2025 官方回顾确实缩窄了范围，能解释一部分；但当前 2026 页面仍保留 broad claim，且无版本号/独立 2026 测试。 | 2024–2026 时间线 | Q4 |
| C12 | “first autonomous software engineer”是官方自我定位/营销 claim，不是独立验证的事实。 | FACT | SUPPORTED | E1/E2/E5/E6/E7 均来自 Cognition 官方；E10–E18 是外部材料，未把该称号当客观事实。 | 官方来源；外部证据 | Q6 |
| C13 | HN 直接使用报告是少量个体经验，不是开发者群体共识。 | FACT | SUPPORTED | 只有 tlarkworthy、rfoo 两位直接使用者；同一评论多条摘录按一个来源计；thread 有 187 条评论但不能当代表样本。 | HN thread 42734681；2025-01-17 | Q5 |

### 8.2 关系

| C-ID | E-ID | relation | reason |
|---|---|---|---|
| C1 | E1 | SUPPORTS | 原文直接给出“independently complete tasks” |
| C1 | E2 | SUPPORTS | 原文直接给出“complex engineering tasks requiring thousands of decisions” |
| C2 | E5 | SUPPORTS | 当前公司页称“the first autonomous software engineer” |
| C2 | E6 | SUPPORTS | 当前公司页称“plans, writes, tests, and ships production code on its own” |
| C2 | E7 | SUPPORTS | 当前产品页称“won't stop until the PR is ready to merge” |
| C3 | E8 | SUPPORTS | 官方回顾把强项限定为清晰、可验证、4–8h 初级任务 |
| C3 | E9 | SUPPORTS | 官方回顾承认无法独立端到端处理模糊项目 |
| C4 | E10 | CONTEXT | 2025 报告的样本内反例；广泛/当前能力仅作上下文，不能直接判普遍反驳。 |
| C4 | E12 | CONTEXT | 2025 报告的样本内反例；广泛/当前能力仅作上下文，不能直接判普遍反驳。 |
| C4 | E13 | CONTEXT | 2025 报告的样本内反例；广泛/当前能力仅作上下文，不能直接判普遍反驳。 |
| C4 | E16 | CONTEXT | 2025 报告的样本内反例；广泛/当前能力仅作上下文，不能直接判普遍反驳。 |
| C4 | E18 | CONTEXT | 2025 报告的样本内反例；广泛/当前能力仅作上下文，不能直接判普遍反驳。 |
| C5 | E11 | SUPPORTS | “When it worked, it was impressive” 及早期成功 |
| C5 | E14 | SUPPORTS | 本地测试/格式化场景能产出通过测试的代码 |
| C5 | E17 | CONTEXT | 求助行为不能证明任务完成或产出可用代码 |
| C6 | E15 | REFUTES | 多余改动、不可撤销、更多清理 |
| C6 | E16 | REFUTES | 没有节省时间、昂贵 |
| C6 | E8 | CONTEXT | 官方只对 4–8h 清晰任务声称效率；不是同一任务测量 |
| C7 | E9 | SUPPORTS | 支持“官方自述无法处理模糊项目”这一宣称的存在，不是独立实测 |
| C7 | E10 | CONTEXT | Jan 2025 的 20 任务测试不能直接对应模糊项目或 2026 能力 |
| C7 | E13 | CONTEXT | Jan 2025 报告的失败模式；不替代同版本同条件实测 |
| C8 | E1、E2、E5、E6、E7 | CONTEXT | broad claim 一侧 |
| C8 | E8、E9 | CONTEXT | 2025 官方缩窄一侧 |
| C9 | E3、E4 | CONTEXT | benchmark 数字与条件 |
| C9 | E20 | CONTEXT | 3/20 与 13.86% 的数值比较；不证明 general |
| C10 | E5、E6、E7 | CONTEXT | 2026 当前 broad claim |
| C10 | E10、E12、E13 | CONTEXT | 2025 独立测试，不能直接代表 2026 |
| C11 | E8、E9 | CONTEXT | 官方缩窄解释一部分冲突 |
| C11 | E5、E6、E7 | CONTEXT | 当前页面仍 broad，冲突未完全解释 |
| C12 | E1、E2、E5、E6、E7 | SUPPORTS | 官方来源直接给出自我定位 |
| C13 | E14、E15、E16、E17、E18 | CONTEXT | 两位直接使用者；同一评论多条摘录不独立 |
| C13 | E19、E20 | CONTEXT | 评论/分析，不是直接使用 |

> 只有 READ 证据用于 SUPPORTS／REFUTES。E19/E20 只作上下文；E14–E16、E17–E18 分别按同一作者/同一评论计，不按三条/两条独立报告计。

## 9. 冲突

| X-ID | 涉及主张 | 证据（≥2） | 冲突描述（双方、条件） | 处理结果 |
|---|---|---|---|---|
| X1 | C1、C2、C4、C7 | E1、E2、E5、E6、E7 对 E10、E12、E13、E16、E18 | 官方 broad claim：Devin 能独立完成软件工程任务/自主交付生产代码；独立测试与 HN 直接报告：20 任务 14 失败、rarely worked、需要清理、原地打转 | **真实冲突，保留**。部分可由 2025 官方缩窄（E8/E9）解释，但不能完全解释当前 2026 页面仍 broad；不能把 3 次成功说成 general autonomy |
| X2 | C2、C3、C7、C8 | E5、E6、E7 对 E8、E9 | 当前官方页称“plans, writes, tests, ships production code on its own / won't stop until PR ready”；2025 官方回顾称“can't independently tackle an ambiguous coding project end-to-end like a senior engineer / junior at execution” | **官方内部张力，保留**。可用“清晰任务 vs 模糊项目、junior vs senior”部分解释，但当前页面没有写明这一限制；不能宣称已消除 |
| X3 | C6 | E8 对 E15、E16 | 官方 2025 回顾称部分任务 4x faster / 67% PR merged；HN 直接使用者称需要更多清理、没有节省时间 | **可比性缺口**。E8 未摘录 4x/67%，不能用它确认这些数字；任务、指标、版本不同，需补对应原句及同任务测量 |
| X4 | C9 | E3、E4 对 E10、E20 | 官方 SWE-bench 13.86%（25% 子集、unassisted）与 Answer.AI 3/20≈15% 数值接近；但任务集不同 | **不是事实冲突**。保留为数值/条件对照；不能把相近比例当因果或 general 证明 |

> 真实冲突在 X1/X2：不是“Devin 完全不能用”，而是“官方 general autonomy claim”与“独立测试/HN 直接经验/官方后来缩窄”之间的冲突。X3 是生产力条件冲突；X4 是 benchmark 解释问题。

## 10. 缺口

| G-ID | 涉及主张 | kind | 描述 | searchScope |
|---|---|---|---|---|
| G1 | C10 | INSUFFICIENT_EVIDENCE | 没有 2026 产品的独立测试；Answer.AI 是 Jan 2025，官方 2025 回顾不是独立验证 | Cognition 官方页、Answer.AI、HN；2026-10-24；未找到 2026 独立实测 |
| G2 | C11 | INSUFFICIENT_EVIDENCE | 没有公开版本号把 2024 发布、Jan 2025 测试、2025 回顾、2026 页面精确对应 | 官方页面/博客；2026-10-24 |
| G3 | C13 | INSUFFICIENT_EVIDENCE | HN 直接使用者只有 2 位作者；thread 187 条评论，但不是代表性样本 | HN thread 42734681；2025-01-17 |
| G4 | C6 | INSUFFICIENT_EVIDENCE | 没有同一任务、同一版本、同一开发者的前后时间测量；官方 4x/67% 指标不可独立复核 | 官方 2025 回顾、Answer.AI、HN；2026-10-24 |
| G5 | C3、C6 | INSUFFICIENT_EVIDENCE | 2025 官方回顾的 4x faster、67% PR merged 等指标未提供可复核的方法/数据 | Cognition 2025 review；2026-10-24 |
| G6 | C9 | INSUFFICIENT_EVIDENCE | Answer.AI 的 20 任务不是 SWE-bench 同一任务集，不能直接比较 3/20 与 13.86% | Answer.AI、Cognition 2024 blog；2026-10-24 |
| G7 | C13 | IDENTITY_UNCLEAR | HN 作者只有公开 handle；未核实其真实身份、雇主或与 Cognition 的关系；不调查私人身份 | HN comment 42734916、42736857；2026-10-24 |

> `NOT_FOUND_IN_SCOPE` 本案例未使用；G1/G2/G4/G5/G6 是材料不足，G7 是公开身份不足以判断独立性，但不需要人肉核实。

## 11. 人工参考判断（不在本文件）

人工参考答案草稿、逐问判断、不确定性、需实际核查者确认项和系统对照写在 [reference.md](reference.md)。

> **禁止**把 `reference.md` 的内容复制到问题、身份依据、检索词、提示词或系统输入。本轮仅提交 §2.1 问题原文和 researchDepth=AUTO，没有传入参考或预期证据。

## 12. 系统运行

### 12.1 运行输入

以下 §12.1–§12.4 保留最初未运行时的输入准备与阻塞记录，不代表当前状态；本轮实际运行记录在 §12.5。

```yaml
system_inputs:
  question: "Cognition 官方称 Devin 是“first autonomous software engineer”并能独立完成软件工程任务；Hacker News 和独立测试的实际使用报告是否支持这一说法？"
  question_sha256: "b53901e4c8505769745d6601abe55a87e65e175f9a793934c0d7fb7a4cb468f7"
  identity_confirmation: null
  reference_used: null # 未运行，尚未声明 false
```

### 12.2 运行记录

| 字段 | 值 |
|---|---|
| investigation_id | null |
| submitted_at | null |
| terminal_status | null |
| stage | null |
| error（code／message／retryable） | 未提交；正式 handler `src/server/investigation/handler.ts` 返回 `unavailable("investigation orchestration")`，对应 `PROVIDER_NOT_CONFIGURED`／`investigation orchestration: real provider is not configured`／`false`。这是代码路径，不是实际运行记录。 |
| snapshot_id | null |
| snapshot_version | null |
| snapshot_generated_at | null |
| contract_version | null |
| identity_result | null |
| retrieval_records | null |
| answer_summary | null |

### 12.3 阻塞说明

- `src/server/investigation/handler.ts` 的正式入口仍直接抛出 `unavailable("investigation orchestration")`。
- `src/server/retrieval/index.ts`、`src/server/identity/index.ts` 的默认实现也返回不可用。
- `.env` 明确写有“Real provider adapters are not implemented in phase 1”。
- 因此本次**没有提交调查**，没有调查 ID、执行尝试或快照；不能把预期失败写成实际运行结果。
- 若甲接入后重跑，必须使用 §2.1 的同一问题原文，并记录真实 `investigation_id`、状态、错误和 `snapshot_id`。

### 12.4 运行前隔离检查

- [x] 提交问题与 §2.1 逐字一致，hash 已记录。
- [x] 未把 `reference.md`、预期主张、证据清单、评估标准、复核意见送入系统。
- [x] 身份依据来自公开官方原文，不是参考结论。
- [ ] 未运行：正式提供方未接入；不得伪造。

### 12.5 2026-10-25 正式 API／Worker 运行

- 调查 ID：`e76d1b58-83c6-4ad3-a7bf-4be5e4d615a0`；快照 ID：`9ebf5968-e18d-4c89-8ef9-262896a200fc`，版本 1；任务终态 SUCCEEDED／COMPLETED。
- 已保存 70 条 READ 原句、28 条主张及 1 份回答；来自真实服务调用，无测试替身。
- 只读评估记录：[formal-2026-10-25T07-17-01-085Z](../../runs/B-01/formal-2026-10-25T07-17-01-085Z.json)。R1–R3、R5–R10 通过；R4_SOURCE_METADATA 为 FAIL，部分来源 sourceType／contentKind 仍为 UNKNOWN，不能为通过补造分类。
- 输入为原问题与 AUTO 深度，reference_used=false；参考文件仅由评估 CLI 在生成结束后读取作 hash 绑定，没有进入生成链路。自动结构检查不等于逐 Q/C/E 语义对照或人工复核。
- 第二模型为 NOT_CONFIGURED；实际独立复核仍未发生。历史 NOT_RUN JSON 保留，不覆盖。

## 13. 对照与复核

- 系统对照：本轮正式结果及自动结构 FAIL 见 §12.5；逐 Q/C/E 语义对照仍待实际复核，reference.md §10 的旧未运行说明保留为历史。
- 独立复核：未完成；见 [review.md](review.md)。
- 本文件不复制参考结论。

## 14. 阻断性错误自检

> 以下为历史材料自检，不是本轮通过结论；后续修正和关闭条件见[案例状态](../../D1-状态与验收记录.md)。

| 阻断 ID | 是否成立 | 依据 |
|---|---|---|
| X1 虚构／不可定位引用 | 未发现 | E1–E20 均有 URL、原句、定位、hash |
| X2 错误证据关联 | 未发现 | 每条关系在 §8.2 单列理由；E19/E20 只作 CONTEXT |
| X3 证据不足却断言 | 未发现 | C9/C10/C11 标 INSUFFICIENT；未写“所有任务” |
| X4 同源转载当独立 | 未发现 | E14–E16 同一评论、E17–E18 同一评论，按作者计；E1–E9 同一官方组 |
| X5 官方宣称／benchmark 当独立实测 | 未发现 | E1–E9 标 OFFICIAL_CLAIM；13.86% 不当 general 证明 |
| X6 读取失败写成没有讨论 | 未发现 | 本次无失败读取 |
| X7 身份／版本／套餐／地区错配 | 未发现 | 2024/2025/2026 时间线分列；版本未知明示 |
| X8 过度推断／范围扩大 | 未发现 | 只支持“某些任务能成”，不支持“开发者共识”或“general autonomy” |
| X9 参考泄漏 | 未发现 | 本轮输入仅原问题与深度；参考在生成后由评估 CLI 读取 |
| X10 状态／过程造假 | 未发现 | 本轮真实 ID、快照、终态及结构 FAIL 见 §12.5；不代签人工 |
| X11 红线越界 | 未发现 | 无个人隐私、时政；原句均 ≤300 字符；未调查 HN 作者真实身份 |
| X12 冲突／缺口隐藏或类型错误 | 未发现 | X1–X4、G1–G7 已记录 |

## 15. 变更记录

| 日期 | 变更 | 变更人 |
|---|---|---|
| 2026-10-24 | 创建 B-01；记录 Devin 官方 claim、Answer.AI 测试、HN 直接报告、冲突和系统阻塞 | 乙 |
| 2026-10-25 | Codex 非盲复查：E17 对 C5 改为上下文；保留 Jan 2025 使用范围、2026 缺口及待人工确认状态 | Codex（模型协助） |
| 2026-10-25 | 新增模型辅助联网核查标注、新取得依据和范围修正；未代签人工、未运行正式调查，旧 runs 保留 | Codex（模型辅助、非盲） |
| 2026-10-25 | 用户明确确认当前材料/参考通过；同步材料状态；系统和复核保持实际未完成状态 | 乙确认；Codex 代录 |
