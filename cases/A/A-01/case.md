---
case_id: "A-01"
case_type: "A"
title: "Amazon Q Developer Free Tier 额度"
owner: "乙"
created_at: "2026-10-24T21:59:06+08:00"
updated_at: "2026-10-24T22:03:38+08:00"
status:
  material: "待人工核实"
  system: "未运行"
  review: "未复核"
question_sha256: "dce259e238cc27e4b99bf2e4cdbb568d22a590da94c8b32e6c1dadee2838ea97"
system_run_id: null
snapshot_id: null
snapshot_version: null
---

# A-01 · Amazon Q Developer Free Tier 额度

> 材料状态：待人工核实 · 系统状态：未运行 · 复核状态：未复核
>
> 本文件记录真实材料与系统阻塞，不记录人工参考答案。参考判断在 `reference.md`，独立复核在 `review.md`。
>
> **当前不是人工金标准。** 所有结论待实际核查者逐条确认；系统提供方未接入，未提交调查，无调查 ID 或快照 ID。

## 1. 案例标识

| 字段 | 值 | 说明 |
|---|---|---|
| 案例 ID | A-01 | 与目录、索引一致 |
| 类型 | A | 功能、套餐与版本事实 |
| 当前组织 | 乙丙 | 材料、关系、交付完整性；历史owner原值保留 |
| 创建／更新时间 | 2026-10-24T21:59:06+08:00 / 2026-10-24T22:03:38+08:00 | Asia/Shanghai |
| 材料状态 | 待人工核实 | 已有真实材料与参考草稿；未经实际核查者确认 |
| 系统状态 | 未运行 | 正式提供方未接入，见 §12 |
| 复核状态 | 未复核 | 实际独立复核尚未完成 |

## 2. 问题与意图

### 2.1 用户问题原话

> Amazon Q Developer 的免费版（Free Tier）额度是多少？按月重置、按次消耗，还是一次性额度？

- 问题来源／获取时间：用户本轮指定模板 + 产品名，2026-10-24T21:56:00+08:00
- 是否包含多个问题：是；拆为 §5 的 Q1–Q6
- 回答意图：客观搜查

### 2.2 系统提交问题

| 字段 | 值 |
|---|---|
| 提交问题（API `question`） | `Amazon Q Developer 的免费版（Free Tier）额度是多少？按月重置、按次消耗，还是一次性额度？` |
| SHA-256（UTF-8 字节） | `dce259e238cc27e4b99bf2e4cdbb568d22a590da94c8b32e6c1dadee2838ea97` |
| 是否与 2.1 一致 | 是 |

## 3. 产品身份

| 字段 | 值 | 说明 |
|---|---|---|
| 产品名 | Amazon Q Developer | 不是 Amazon Q Business，也不是 Amazon Q Developer in chat applications |
| 官方站点 | https://aws.amazon.com/q/developer/ | AWS 官方产品页 |
| 版本 | `null` | 服务持续更新；未发现独立版本号 |
| 套餐 | Free Tier（Free tier） | 官方定价页与文档使用该名称 |
| 地区 | `null`（待确认） | 已查官方页面未列地区限制；未验证中国大陆等区域 |
| 账号类型 | AWS Builder ID（个人）／IAM 用户／IAM Identity Center | IDE／CLI 的 Free Tier 限额仅 Builder ID；IAM 用户按账号级别；Console 映射未在本案确认 |
| 身份状态 | CONFIRMED | 官方产品页与定价页可定位 |
| 歧义／消歧说明 | 官方产品页明确为 Amazon Q Developer；排除 Amazon Q Business | 见 §3.1 |

### 3.1 身份依据

| # | URL | 原句（≤300） | 获取时间 | 确认理由 |
|---|---|---|---|---|
| I1 | https://aws.amazon.com/q/developer/ | The Amazon Q Developer perpetual Free Tier gives you 50 agentic chat interactions per month. | 2026-10-24T21:57:20+08:00 | 官方产品页同时命名 Amazon Q Developer 与 Free Tier |
| I2 | https://aws.amazon.com/q/developer/pricing/ | Amazon Q Developer offers a perpetual Free Tier with monthly limits | 2026-10-24T21:57:17+08:00 | 官方定价页确认 Free Tier 为产品套餐并给出限额口径 |

> `CONFIRMED` 只表示产品与套餐身份可确认，不表示额度结论已由人工确认。

## 4. 时间与适用

| 字段 | 值 | 说明 |
|---|---|---|
| 研究开始 | 2026-10-24T21:56:00+08:00 | 本次检索开始 |
| 研究结束 | 2026-10-24T21:59:00+08:00 | 本次检索结束 |
| 事实基准日 | 2026-10-24 | 结论依据材料截止到该日 |
| 事实适用起 | `null` | 官方页面未写生效日；不能把页面更新时间当规则生效日 |
| 事实适用止 | `null` | 官方页面未写结束日；IDE 插件支持另有 2027-04-30 结束通知，见 C8 |
| 适用依据 | 官方定价页、套餐页、产品页、文档；页面更新元数据 | 见 §7 |
| 时区 | Asia/Shanghai（显示） | 存储用含偏移 ISO 8601 |

> 研究时间只说明“何时查”。本案例能确认的是 2026-10-24 查阅到的官方口径；不能推断在此之前或之后一直相同。E1–E9 的 `publishedAt` 取自页面 `meta og:updated_time`，是最后更新时间元数据，不是首次发布时间；E11–E14 页面未显示日期，按 `null` 处理。

## 5. 核查范围与原子问题

### 5.1 范围

- 在范围内：Amazon Q Developer；Free Tier；AWS Builder ID／IAM／IAM Identity Center 的免费层账户口径；IDE／CLI；英文官方页面；2026-10-24 查阅。
- 不在范围内：Pro 付费套餐的完整权益；实际调用测试；代码补全质量；其他 AWS 产品；中国大陆等特定区域的可用性；2027-04-30 之后 IDE 插件的状态。
- 回答意图：客观搜查。

### 5.2 原子问题

| Q-ID | 原子问题 | 关联主张 | 判断标准／需要的证据 |
|---|---|---|---|
| Q1 | Amazon Q Developer 是否存在名为 Free Tier 的免费层？官方名称与基本性质是什么？ | C1、C4 | 官方定价／文档明确 Free Tier 与 monthly limits |
| Q2 | Free Tier 的月度额度具体是多少？ | C2、C3、C7、C10 | 分别给出 agentic requests 与 Java 转换 LOC；不混为一种额度 |
| Q3 | 这些额度按什么计量、在什么条件下消耗？ | C2、C3、C7 | 说明 request 与 LOC 的计量单位和计数条件 |
| Q4 | 额度是按月重置、滚动窗口，还是一次性？ | C4、C5 | 官方是否说明周期和重置边界 |
| Q5 | 适用于哪些账户、界面、地区和产品版本？ | C6、C8、C9 | 区分 Builder ID／IAM、IDE／CLI／Console、Free／Pro |
| Q6 | 官方页面之间是否一致？更新时间、冲突和未知项是什么？ | C5、C9、C10、C11 | 保留措辞差异、Pro 表格异常和未知项 |

### 5.3 类型特有门槛

- A：额度数值与重置／消耗方式分别回答；版本、套餐、地区明确。本案例的额度数值明确，重置边界和地区仍为缺口。

## 6. 检索记录

| R-ID | 提供方 | 查询词／目标 | 调用时间 | 状态 | 错误 | 返回来源／采用情况 |
|---|---|---|---|---|---|---|
| R1 | 手工网页搜索（非系统提供方） | Amazon Q Developer Free Tier 50 agentic requests per month official pricing | 2026-10-24T21:56+08:00 | SUCCEEDED | null | 定位 AWS 定价页、产品页、文档；采用为 E1–E14 的线索 |
| R2 | 直接抓取（curl） | https://aws.amazon.com/q/developer/pricing/ | 2026-10-24T21:57:17+08:00 | SUCCEEDED | null | 保存原始 HTML；采用 E1–E9 |
| R3 | 直接抓取（curl） | https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-tiers.html | 2026-10-24T21:57:18+08:00 | SUCCEEDED | null | 采用 E11–E12 |
| R4 | 直接抓取（curl） | https://docs.aws.amazon.com/general/latest/gr/amazonqdev.html | 2026-10-24T21:57:19+08:00 | SUCCEEDED | null | 采用 E14（Pro 配额表异常） |
| R5 | 直接抓取（curl） | https://aws.amazon.com/q/developer/ | 2026-10-24T21:57:20+08:00 | SUCCEEDED | null | 采用 E10、I1 |
| R6 | 直接抓取（curl） | https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/what-is.html | 2026-10-24T21:57:20+08:00 | SUCCEEDED | null | 采用 E13 |

> 本次是 D1 人工核查，不是系统提供方检索；未使用元宝，也不把网页搜索当成系统运行。原始 HTML 保存在忽略的 `.cache/d1/a-01/raw/`，不纳入交付；证据以 URL、原句、定位和 hash 为准。

## 7. 证据

### 7.1 来源与元数据

| E-ID | URL（直达） | 标题／站点 | 作者／公开账号 | 发布时间 | 获取时间 | 语言 | sourceType | contentKind | 版本／套餐 | readStatus | readError |
|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | https://aws.amazon.com/q/developer/pricing/ | AI for Software Development – Amazon Q Developer Pricing／aws.amazon.com | Amazon Web Services | 2026-10-15T20:44:21-07:00 | 2026-10-24T21:57:17+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E2 | https://aws.amazon.com/q/developer/pricing/ | 同上 | Amazon Web Services | 2026-10-15T20:44:21-07:00 | 2026-10-24T21:57:17+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E3 | https://aws.amazon.com/q/developer/pricing/ | 同上 | Amazon Web Services | 2026-10-15T20:44:21-07:00 | 2026-10-24T21:57:17+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E4 | https://aws.amazon.com/q/developer/pricing/ | 同上 | Amazon Web Services | 2026-10-15T20:44:21-07:00 | 2026-10-24T21:57:17+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E5 | https://aws.amazon.com/q/developer/pricing/ | 同上 | Amazon Web Services | 2026-10-15T20:44:21-07:00 | 2026-10-24T21:57:17+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E6 | https://aws.amazon.com/q/developer/pricing/ | 同上 | Amazon Web Services | 2026-10-15T20:44:21-07:00 | 2026-10-24T21:57:17+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E7 | https://aws.amazon.com/q/developer/pricing/ | 同上 | Amazon Web Services | 2026-10-15T20:44:21-07:00 | 2026-10-24T21:57:17+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E8 | https://aws.amazon.com/q/developer/pricing/ | 同上 | Amazon Web Services | 2026-10-15T20:44:21-07:00 | 2026-10-24T21:57:17+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E9 | https://aws.amazon.com/q/developer/pricing/ | 同上 | Amazon Web Services | 2026-10-15T20:44:21-07:00 | 2026-10-24T21:57:17+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E10 | https://aws.amazon.com/q/developer/ | Coding Assistant – Amazon Q Developer – AWS／aws.amazon.com | Amazon Web Services | 2026-10-15T20:44:02-07:00 | 2026-10-24T21:57:20+08:00 | en | OFFICIAL | OFFICIAL_CLAIM | null／Free Tier | READ | null |
| E11 | https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-tiers.html | Tiers of service for Q Developer – Free and Pro／docs.aws.amazon.com | Amazon Web Services | null | 2026-10-24T21:57:18+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E12 | https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-tiers.html | 同上 | Amazon Web Services | null | 2026-10-24T21:57:18+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E13 | https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/what-is.html | What is Amazon Q Developer?／docs.aws.amazon.com | Amazon Web Services | null | 2026-10-24T21:57:20+08:00 | en | OFFICIAL | FACT | null／Free Tier | READ | null |
| E14 | https://docs.aws.amazon.com/general/latest/gr/amazonqdev.html | Amazon Q Developer endpoints and quotas／docs.aws.amazon.com | Amazon Web Services | null | 2026-10-24T21:57:19+08:00 | en | OFFICIAL | FACT | null／Pro（非 Free） | READ | null |

### 7.2 原文、译文与定位

| E-ID | originalExcerpt（原文，≤300） | translation（译文，非原话） | originalLocation（kind／locator／context） | contentHash（SHA-256） |
|---|---|---|---|---|
| E1 | 50 agentic requests per month | 每月 50 次 agentic 请求 | TEXT／Pricing Table > IDE plugins and CLI > row "Included agentic requests (Q&A chat, agentic coding)" > Free column／同表 Pro 列为 "Included (with limits)" | dae3aa3ecd2cea453dd5d91be0711a79aebe9e782e3649d55a02601f37004d2f |
| E2 | An agentic request is any Q&A chat or agentic coding interaction with Q Developer through either the IDE or Command Line Interface (CLI). | agentic 请求是指通过 IDE 或命令行界面（CLI）与 Q Developer 进行的任何问答聊天或 agentic 编码交互。 | TEXT／FAQ "What is an agentic request?" > 第一句／定义计量单位 | dae3aa3ecd2cea453dd5d91be0711a79aebe9e782e3649d55a02601f37004d2f |
| E3 | All requests made through both the IDE and CLI contribute to your usage limits. | 通过 IDE 和 CLI 发出的所有请求都计入你的使用限额。 | TEXT／FAQ "What is an agentic request?" > 第二句／说明 IDE 与 CLI 合并计数 | dae3aa3ecd2cea453dd5d91be0711a79aebe9e782e3649d55a02601f37004d2f |
| E4 | Amazon Q Developer offers a perpetual Free Tier with monthly limits | Amazon Q Developer 提供永久免费层，但有月度限额。 | TEXT／Pricing Table 下方注释 > "Amazon Q Developer offers a perpetual Free Tier..."／说明持续可用与月度周期 | dae3aa3ecd2cea453dd5d91be0711a79aebe9e782e3649d55a02601f37004d2f |
| E5 | Free Tier limits in the IDE are available only to Builder ID users. | 免费层限额在 IDE 中仅对 Builder ID 用户可用。 | TEXT／Pricing Table 下方注释 > 该句／说明 IDE 账户范围 | dae3aa3ecd2cea453dd5d91be0711a79aebe9e782e3649d55a02601f37004d2f |
| E6 | Free Tier limits apply at the account level when logged in as an IAM user, or at the user level for AWS Builder ID users. | 使用 IAM 用户登录时，免费层限额按账户级别计算；使用 AWS Builder ID 用户时，按用户级别计算。 | TEXT／Pricing Table 下方注释 > 该句／说明 IAM 与 Builder ID 的计数层级 | dae3aa3ecd2cea453dd5d91be0711a79aebe9e782e3649d55a02601f37004d2f |
| E7 | Amazon Q Developer Free Tier users can upgrade 1,000 LOC per month, per user. | Amazon Q Developer 免费层用户每月每用户可升级 1,000 LOC。 | TEXT／Pricing Table 下方注释 > "You can get started..." 段落 > 该句／Java 升级转换额度 | dae3aa3ecd2cea453dd5d91be0711a79aebe9e782e3649d55a02601f37004d2f |
| E8 | Only those submissions where you receive suggested upgrade code back are counted while those where you stop the job before completion or when a failure is encountered during the upgrade are not included. | 只有收到建议升级代码的提交才计入；在完成前停止作业或升级过程中遇到失败的提交不计入。 | TEXT／Pricing Table 脚注 "*" > 该句／LOC 计数条件 | dae3aa3ecd2cea453dd5d91be0711a79aebe9e782e3649d55a02601f37004d2f |
| E9 | Noncode lines in repositories such as comments and empty lines are not counted. | 代码注释和空行等非代码行不计入。 | TEXT／Pricing Table 脚注 "*" > 该句／LOC 计数排除项 | dae3aa3ecd2cea453dd5d91be0711a79aebe9e782e3649d55a02601f37004d2f |
| E10 | The Amazon Q Developer perpetual Free Tier gives you 50 agentic chat interactions per month. You can also transform up to 1,000 lines of code per month. | Amazon Q Developer 的永久免费层每月提供 50 次 agentic 聊天交互；每月还可转换最多 1,000 行代码。 | TEXT／Section "Amazon Q Developer pricing and the AWS Free Tier" > 段落／产品概览措辞较窄，只写 chat interactions | 323834f473858d065871021c252d1d4d5ee78816086f83d31bb5270660fe57b9 |
| E11 | Amazon Q Developer offers a perpetual Free tier with monthly limits. | Amazon Q Developer 提供永久免费层，但有月度限额。 | TEXT／Free tier > 第一段／官方文档确认 monthly limits | d71e9df56a1d3fe8147932951dacd38ad3a50305bb269c6f4033bce0aa19daa0 |
| E12 | The Free tier is available to users with personal accounts (Builder IDs) | 免费层面向拥有个人账户（Builder ID）的用户开放。 | TEXT／Free tier > 第二段 > 该句／原文链接文字在 "IAM Identity Center" 前有空格，摘录只取完整子句 | d71e9df56a1d3fe8147932951dacd38ad3a50305bb269c6f4033bce0aa19daa0 |
| E13 | On April 30, 2027, AWS will discontinue support for Amazon Q Developer IDE plugins. | 2027 年 4 月 30 日，AWS 将停止支持 Amazon Q Developer IDE 插件。 | TEXT／页面顶部 "End of support notice" > 该句／只约束 IDE 插件，不是所有界面 | 254d88209eeeed92d67a040eda3b78a30946dc6cb04c8ee6029f99fe578d774b |
| E14 | Agentic requests (Q&A chat, agentic coding) | Agentic 请求（问答聊天、agentic 编码） | TEXT／Amazon Q Developer Pro service quotas > Quotas for Amazon Q Developer Pro (in IDEs and CLI) > 该行／同一行配额单元格为 "1,000 lines of code per month"；该页标题限定 Pro，不是 Free | 6db47c3a05f92f72c82349f14dd4de4dc582eaeca48bb2be4d64b68a736d4f08 |

> 原句逐字符摘录，未改写。E12 的原文在链接边界处可能显示空格；此处只摘完整子句。译文仅辅助理解，不能作为引用原句。所有 READ 证据都有定位和 SHA-256；hash 针对 2026-10-24 抓取的原始 HTML。

### 7.3 同源与独立性

| E-ID | upstreamUrl | independence | originGroupId | independenceReason |
|---|---|---|---|---|
| E1–E9 | null | SHARED_ORIGIN | aws-official-pricing | 同一 AWS 官方定价页的不同段落；不构成独立第三方来源 |
| E10 | null | SHARED_ORIGIN | aws-official | 同一发布方 AWS 的官方产品页 |
| E11–E12 | null | SHARED_ORIGIN | aws-official-docs | 同一 AWS 官方文档页 |
| E13 | null | SHARED_ORIGIN | aws-official-docs | 同一 AWS 官方文档页 |
| E14 | null | SHARED_ORIGIN | aws-official-docs | 同一发布方 AWS 的官方文档；仅用于说明 Pro 表异常 |

### 7.4 独立性汇总

| 项 | 值 | 说明 |
|---|---|---|
| URL 总数 | 5 | 定价页、产品页、套餐页、what-is、General Reference |
| 已识别源头组数 | 1 | 全部为 AWS 官方发布 |
| 其中独立第三方来源数 | 0 | 未找到独立第三方核实；官方口径不等于独立实测 |
| 同源组 | 1 | aws-official |
| 不确定（UNKNOWN） | 0 | 来源归属明确 |
| 计数理由 | 官方页面同属 AWS；不把多个官方 URL 当成独立证实 |  |

## 8. 主张与证据关系

### 8.1 主张

| C-ID | statement（原子主张） | kind | verificationStatus | verificationReason | scope | answersQuestion |
|---|---|---|---|---|---|---|
| C1 | Amazon Q Developer 提供名为 Free Tier 的免费层，官方称其为 perpetual Free tier／Free Tier。 | FACT | SUPPORTED | E4、E11 明确 perpetual Free tier；I1 产品页同时命名产品与 Free Tier。 | Free Tier；官方文档；2026-10-24 查阅 | Q1 |
| C2 | Free Tier 每月包含 50 次 agentic requests，覆盖 Q&A chat 与 agentic coding；通过 IDE 或 CLI 的请求均计入。 | FACT | SUPPORTED | E1 给出 50；E2 定义 agentic request 包含 Q&A chat 与 agentic coding；E3 说明 IDE／CLI 合并计数。E10 只写 chat interactions，作为范围较窄的背景。 | Free Tier；IDE／CLI；agentic requests；不含代码补全或 Pro 额度 | Q2、Q3 |
| C3 | Free Tier 每月包含 1,000 行代码的 Java 升级转换额度；只计算返回升级建议的提交，注释和空行不计。 | FACT | SUPPORTED | E7 给出 1,000 LOC；E8 说明成功返回才计；E9 排除注释和空行；E10 交叉确认 1,000 行。 | Free Tier；Java upgrade transformation；按用户；每月 | Q2、Q3 |
| C4 | Free Tier 限额是持续可用的月度限额，不是一次性额度或免费试用。 | FACT | SUPPORTED | E4、E11 均写 perpetual Free tier with monthly limits；E10 写 perpetual Free Tier。 | Free Tier；周期性质 | Q1、Q4 |
| C5 | 已查官方页面没有说明具体重置日、时刻或时区；不能断言自然月 1 日 00:00 或滚动 30 天。 | FACT | INSUFFICIENT | E1/E4/E11 只写 per month／monthly limits，没有 reset 边界；这是已查范围内的缺口，不是全网断言。 | 已查 5 个官方页面；2026-10-24；en-US | Q4、Q6 |
| C6 | Free Tier 的 IDE 限额仅对 Builder ID 用户开放；IAM 用户按账号级别计；Free tier 面向 Builder ID 个人账户。 | FACT | SUPPORTED | E5 明确 IDE 仅 Builder ID；E6 说明 IAM 账户级、Builder ID 用户级；E12 说明 Free tier 面向 Builder ID 个人账户。 | Free Tier；IDE／CLI；账户类型 | Q1、Q5 |
| C7 | 官方定价表没有列出代码补全的单独月度上限；不能据此判断代码补全为无限。 | FACT | INSUFFICIENT | E1 的 Free 列只列 agentic requests 与 Java LOC，没有代码补全额度；未列不等于无限。 | Free Tier；代码补全；已查定价表 | Q2、Q3、Q5 |
| C8 | Amazon Q Developer IDE 插件支持将于 2027-04-30 结束。 | FACT | SUPPORTED | E13 明确该日期停止支持 IDE plugins；未说明 CLI／Console 同步停止。 | IDE 插件；未来适用范围 | Q5 |
| C9 | 已查官方页面没有列出地区限制；本次未验证中国大陆等区域的可用性。 | FACT | INSUFFICIENT | E1/E3/E4/E10 未列地区；这是已查范围内的缺口，不能写成全球可用或不可用。 | 已查 5 个官方页面；2026-10-24；en-US | Q5、Q6 |
| C10 | 已查 Free 层数值在定价页与产品页一致：50 requests／month、1,000 LOC／month；未发现 Free 数值冲突。 | FACT | SUPPORTED | E1 的 50、E7 的 1,000、E10 的 50／1,000 一致；E2/E3 补充计量定义。 | Free Tier；已查官方页面；en-US；2026-10-24 | Q2、Q6 |
| C11 | General Reference 的 Pro 配额表把 "Agentic requests" 行标为 "1,000 lines of code per month"；该表限定 Pro，不是 Free。 | FACT | SUPPORTED | E14 的章节标题为 "Amazon Q Developer Pro service quotas"；同一行配额单元格写 1,000 LOC／month，与 Free 定价页的 50 requests 不是同一范围。 | Pro 配额表；文档异常；不用于 Free | Q6 |

### 8.2 关系

| C-ID | E-ID | relation | reason |
|---|---|---|---|
| C1 | E4 | SUPPORTS | 原文写 "perpetual Free Tier with monthly limits" |
| C1 | E11 | SUPPORTS | 官方文档写 "perpetual Free tier with monthly limits" |
| C2 | E1 | SUPPORTS | Free 列明确 "50 agentic requests per month" |
| C2 | E2 | SUPPORTS | 原文把 agentic request 定义为 Q&A chat 或 agentic coding interaction |
| C2 | E3 | SUPPORTS | 原文说明 IDE 与 CLI 的所有请求都计入 |
| C2 | E10 | CONTEXT | 产品页写 50 次 chat interactions，数值一致但范围较窄；不用于证明 agentic coding 也计入 |
| C3 | E7 | SUPPORTS | 原文写 1,000 LOC per month, per user |
| C3 | E8 | SUPPORTS | 原文限定只有收到建议升级代码的提交才计入 |
| C3 | E9 | SUPPORTS | 原文排除注释和空行 |
| C3 | E10 | SUPPORTS | 产品页写 transform up to 1,000 lines of code per month |
| C4 | E4 | SUPPORTS | 原文写 perpetual Free Tier with monthly limits |
| C4 | E11 | SUPPORTS | 原文写 perpetual Free tier with monthly limits |
| C5 | E1 | CONTEXT | 页面只写 per month，没有重置日／时刻／时区 |
| C5 | E4 | CONTEXT | 页面只写 monthly limits，没有重置边界 |
| C5 | E11 | CONTEXT | 页面只写 monthly limits，没有重置边界 |
| C6 | E5 | SUPPORTS | 原文写 IDE 限额仅 Builder ID 用户 |
| C6 | E6 | SUPPORTS | 原文写 IAM 账户级、Builder ID 用户级 |
| C6 | E12 | SUPPORTS | 原文写 Free tier 面向个人账户（Builder IDs） |
| C7 | E1 | CONTEXT | 定价表未列代码补全额度；未列不等于无限 |
| C8 | E13 | SUPPORTS | 原文写 2027-04-30 停止支持 IDE plugins |
| C9 | E1 | CONTEXT | 页面未列地区限制 |
| C9 | E4 | CONTEXT | 页面未列地区限制 |
| C9 | E10 | CONTEXT | 页面未列地区限制 |
| C10 | E1 | SUPPORTS | 定价页写 50 requests／month |
| C10 | E7 | SUPPORTS | 定价页写 1,000 LOC／month |
| C10 | E10 | SUPPORTS | 产品页写 50／1,000 |
| C11 | E14 | SUPPORTS | Pro 配额表同一行写 1,000 LOC／month；页面标题限定 Pro |

> 只有 READ 证据用于 SUPPORTS／REFUTES。E10 的产品页是官方营销描述，只在数值一致处作背景，不用它扩大 "chat interactions" 的范围。

## 9. 冲突

| X-ID | 涉及主张 | 证据（≥2） | 冲突描述（双方、条件） | 处理结果 |
|---|---|---|---|---|
| X0 | C10 | E1、E7、E10 | 在已查 5 个官方页面中未发现 Free 层 50 requests／1,000 LOC 的相反数值 | 不适用；检索范围见 §10，不能外推为全网无冲突 |
| X1 | C2 | E1、E10 | 产品页写 "50 agentic chat interactions"；定价页写 "50 agentic requests (Q&A chat, agentic coding)"；数值一致，范围措辞不同 | 以定价页与 FAQ 的 agentic request 定义为准；产品页作为背景；不构成数值冲突 |

> Pro 配额表的单位异常不是 Free 层冲突；它被记录在 §10 G4，不能拿来改写 Free 结论。

## 10. 缺口

| G-ID | 涉及主张 | kind | 描述 | searchScope |
|---|---|---|---|---|
| G1 | C5 | INSUFFICIENT_EVIDENCE | 官方只写 per month／monthly limits，未说明重置日、时刻、时区，也未说明是自然月还是滚动 30 天 | AWS pricing page、q-tiers、what-is、General Reference；en-US；2026-10-24 |
| G2 | C9 | NOT_FOUND_IN_SCOPE | 已查官方页面未列地区限制；不能判断中国大陆等区域是否可用 | 同上 5 个官方页面；en-US；2026-10-24；未断言全球或某地区不可用 |
| G3 | C7 | INSUFFICIENT_EVIDENCE | 定价表未列代码补全的单独月度上限；未列不等于无限，也不能补造数值 | AWS pricing page、q-tiers、product page；en-US；2026-10-24 |
| G4 | C11 | INSUFFICIENT_EVIDENCE | General Reference 的 Pro 配额表把 "Agentic requests" 行写成 "1,000 lines of code per month"；该表限定 Pro，可能是文档单位错误，需 AWS 澄清 | General Reference Pro section；en-US；2026-10-24 |
| G5 | C2 | INSUFFICIENT_EVIDENCE | FAQ 说明任何 Q&A chat 或 agentic coding interaction 都计入，但未说明一个多步 agentic 任务含多次工具调用时计一次还是多次 | AWS pricing page FAQ "What is an agentic request?"；en-US；2026-10-24 |
| G6 | C4、C10 | INSUFFICIENT_EVIDENCE | 未找到 50／1,000 规则的官方生效日或变更日志；页面 meta 更新时间为 2026-10-15，但不能当生效日 | AWS pricing page、product page、q-tiers、General Reference；en-US；2026-10-24 |
| G7 | C8 | INSUFFICIENT_EVIDENCE | IDE 插件支持将在 2027-04-30 结束；CLI／Console 的 Free Tier 在该日期后是否继续，页面未说明 | what-is end-of-support notice；en-US；2026-10-24 |
| G8 | C6 | INSUFFICIENT_EVIDENCE | q-tiers 页面有 Console／IDE／CLI 与 Builder ID／IAM／IdC 的可用性表，但本案例没有把该表图标逐项摘录为 READ 原句；Console 映射不作确定结论 | q-tiers Free tier availability table；en-US；2026-10-24 |

> 缺口绑定到具体主张；`NOT_FOUND_IN_SCOPE` 只表示已查范围，不表示整个互联网没有。`READ_FAILED`／`RESTRICTED` 本案例没有出现。

## 11. 人工参考判断（不在本文件）

人工参考答案草稿、逐问判断、不确定性、需实际核查者确认项和系统对照写在 [reference.md](reference.md)。

> **禁止**把 `reference.md` 的内容复制到问题、身份依据、检索词、提示词或系统输入。系统未运行；即使以后运行，也只能提交问题原文和必要的真实身份确认依据。

## 12. 系统运行

### 12.1 运行输入

```yaml
system_inputs:
  question: "Amazon Q Developer 的免费版（Free Tier）额度是多少？按月重置、按次消耗，还是一次性额度？"
  question_sha256: "dce259e238cc27e4b99bf2e4cdbb568d22a590da94c8b32e6c1dadee2838ea97"
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

## 13. 对照与复核

- 系统对照：未运行，无对照；见 [reference.md](reference.md) §10。
- 独立复核：未完成；见 [review.md](review.md)。
- 本文件不复制参考结论。

## 14. 阻断性错误自检

> 这是材料自检，不是实际独立复核。

| 阻断 ID | 是否成立 | 依据 |
|---|---|---|
| X1 虚构／不可定位引用 | 未发现 | E1–E14 均有 URL、原句、定位、hash |
| X2 错误证据关联 | 未发现 | 每条关系在 §8.2 单列理由 |
| X3 证据不足却断言 | 未发现 | C5、C7、C9 标 INSUFFICIENT；未写无限 |
| X4 同源转载当独立 | 不适用 | 全部官方来源同组；未计独立第三方 |
| X5 官方宣称／benchmark 当独立实测 | 未发现 | E10 标 OFFICIAL_CLAIM，未当独立实测 |
| X6 读取失败写成没有讨论 | 未发现 | 本次无失败读取 |
| X7 身份／版本／套餐／地区错配 | 未发现 | Free 与 Pro 分列；地区标待确认 |
| X8 过度推断／范围扩大 | 未发现 | 未把代码补全写成无限；未把官方口径写成独立实测 |
| X9 参考泄漏 | 未发现 | 系统未运行；参考未送入输入 |
| X10 状态／过程造假 | 未发现 | 系统状态未运行；无调查 ID／快照 |
| X11 红线越界 | 未发现 | 无个人隐私、时政；原句均 ≤300 字符 |
| X12 冲突／缺口隐藏或类型错误 | 未发现 | X0／X1、G1–G8 已记录 |

## 15. 变更记录

| 日期 | 变更 | 变更人 |
|---|---|---|
| 2026-10-24 | 创建 A-01；记录 Amazon Q Developer Free Tier 官方材料、主张、缺口和系统阻塞 | 乙 |
