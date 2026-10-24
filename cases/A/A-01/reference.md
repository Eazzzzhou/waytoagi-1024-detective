---
case_id: "A-01"
reference_status: "待人工核实"
confirmed_by: null
confirmed_at: null
---
<!--
人工参考判断草稿。禁止作为系统运行输入。
当前未经乙确认，不是人工金标准。
-->

# A-01 · 人工参考判断草稿

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
| Q1 | 是否存在 Free Tier？官方名称与性质？ | 存在。官方称 “Free Tier”／“Free tier”，并称其为 perpetual Free tier。它是持续可用的免费层，不是一次性试用。 | 已查明（支持） | E4、E11；I1、I2 | 官方没有给“Free Tier”单独版本号 |
| Q2 | 月度额度具体是多少？ | 两个不同额度：① 每月 50 次 agentic requests；② 每月 1,000 行代码的 Java 升级转换额度。二者不能合并成一个数字。 | 部分查明（支持＋缺口） | E1、E7、E10 | 代码补全是否有单独月限额未列出（G3） |
| Q3 | 按什么计量、在什么条件下消耗？ | agentic requests 按请求计：Q&A chat 或 agentic coding 交互，通过 IDE 或 CLI 都计入。Java 转换按 LOC 计：只有收到建议升级代码的提交才计入，注释和空行不计。官方没有把它们描述为 token 或 AI credits。 | 已查明（支持）＋缺口 | E2、E3、E8、E9 | 多步 agentic 任务的工具调用如何计数未说明（G5） |
| Q4 | 按月重置、滚动窗口，还是一次性？ | 官方写 monthly limits／per month，且为 perpetual Free tier；因此是持续可用的月度限额，不是一次性额度。官方未写具体重置日、时刻、时区，也未写滚动 30 天。 | 部分查明（支持＋缺口） | E1、E4、E11 | 具体重置边界未知（G1）；不能断言 1 日 00:00 |
| Q5 | 适用于哪些账户、界面、地区和版本？ | IDE 的 Free Tier 限额仅 Builder ID 用户；IAM 用户按账号级别计；Free tier 面向 Builder ID 个人账户。Console 映射未在本案确认。产品无独立版本号。官方页面未列地区限制；IDE 插件支持到 2027-04-30。 | 部分查明（支持＋缺口） | E5、E6、E12、E13 | 地区可用性未验证（G2）；Console 映射未确认（G8）；2027-04-30 后 CLI／Console 未说明（G7） |
| Q6 | 官方页面是否一致？更新时间和未知项？ | 已查 Free 数值一致：50 requests／month、1,000 LOC／month。产品页用 “50 agentic chat interactions” 的较窄措辞；定价页/FAQ 的 “agentic requests” 定义更宽。General Reference 的 Pro 配额表有单位异常，但限定 Pro，不是 Free。未找到官方生效日。 | 部分查明（支持＋缺口） | E1、E2、E7、E10、E14 | 文档异常待 AWS 澄清（G4）；生效日未知（G6） |

### 2.1 一句话参考答案（草稿）

> Amazon Q Developer 的 Free Tier 是持续可用的免费层，不是一次性试用。官方定价表列出每月 50 次 agentic requests（问答聊天和 agentic coding，IDE／CLI 的请求都计入），以及每月 1,000 行代码的 Java 升级转换额度（只算返回升级建议的提交，注释和空行不计）。两项都以月为周期；但官方未写明具体重置日、时刻或时区。IDE 的 Free Tier 限额仅 Builder ID 用户，IAM 用户按账号级别计；官方未列代码补全的单独月限额，不能推定无限；也未列地区限制，本次未验证中国大陆。IDE 插件支持到 2027-04-30。

> 这段话是人工参考草稿，不是系统输出；待乙确认后才能作为参考金标准。

## 3. 主张级判断

| C-ID | statement | kind | verificationStatus | reason | scope | 依据 E |
|---|---|---|---|---|---|---|
| C1 | Amazon Q Developer 提供名为 Free Tier 的免费层，官方称其为 perpetual Free tier／Free Tier。 | FACT | SUPPORTED | E4、E11 直接写 perpetual Free tier；I1 命名产品与 Free Tier。 | Free Tier；官方文档；2026-10-24 | E4、E11 |
| C2 | Free Tier 每月包含 50 次 agentic requests，覆盖 Q&A chat 与 agentic coding；IDE／CLI 请求均计入。 | FACT | SUPPORTED | E1 给数值；E2 定义范围；E3 说明 IDE／CLI 合并计数。E10 只写 chat interactions，作背景。 | Free Tier；IDE／CLI；agentic requests | E1、E2、E3、E10（CONTEXT） |
| C3 | Free Tier 每月包含 1,000 行代码的 Java 升级转换额度；只计算返回升级建议的提交，注释和空行不计。 | FACT | SUPPORTED | E7 给 1,000 LOC；E8 限定成功返回；E9 排除非代码行；E10 交叉确认。 | Free Tier；Java transformation；按用户；每月 | E7、E8、E9、E10 |
| C4 | Free Tier 限额是持续可用的月度限额，不是一次性额度或免费试用。 | FACT | SUPPORTED | E4、E11 写 perpetual＋monthly limits；E10 写 perpetual Free Tier。 | Free Tier；周期性质 | E4、E11 |
| C5 | 已查官方页面没有说明具体重置日、时刻或时区；不能断言自然月 1 日 00:00 或滚动 30 天。 | FACT | INSUFFICIENT | 页面只写 per month／monthly limits；已查范围内没有 reset 边界。 | 5 个官方页面；2026-10-24；en-US | E1、E4、E11（CONTEXT） |
| C6 | Free Tier 的 IDE 限额仅对 Builder ID 用户开放；IAM 用户按账号级别计；Free tier 面向 Builder ID 个人账户。 | FACT | SUPPORTED | E5、E6、E12 直接说明 IDE／IAM／Builder ID 范围；Console 映射未逐项摘录，另记 G8。 | Free Tier；IDE／CLI；账户类型 | E5、E6、E12 |
| C7 | 官方定价表没有列出代码补全的单独月度上限；不能据此判断代码补全为无限。 | FACT | INSUFFICIENT | E1 的 Free 列只列 agentic requests 与 Java LOC；未列不等于无限。 | Free Tier；代码补全；定价表 | E1（CONTEXT） |
| C8 | Amazon Q Developer IDE 插件支持将于 2027-04-30 结束。 | FACT | SUPPORTED | E13 明确日期与对象为 IDE plugins。 | IDE 插件；未来范围 | E13 |
| C9 | 已查官方页面没有列出地区限制；本次未验证中国大陆等区域的可用性。 | FACT | INSUFFICIENT | E1、E4、E10 未列地区；不能写成全球可用或不可用。 | 5 个官方页面；2026-10-24；en-US | E1、E4、E10（CONTEXT） |
| C10 | 已查 Free 层数值在定价页与产品页一致：50 requests／month、1,000 LOC／month；未发现 Free 数值冲突。 | FACT | SUPPORTED | E1、E7、E10 数值一致；E2/E3 补充计量。 | Free Tier；已查官方页面；en-US；2026-10-24 | E1、E7、E10 |
| C11 | General Reference 的 Pro 配额表把 "Agentic requests" 行标为 "1,000 lines of code per month"；该表限定 Pro，不是 Free。 | FACT | SUPPORTED | E14 页面标题限定 Pro；同一行配额单元格写 1,000 LOC／month，与 Free 的 50 requests 不是同一范围。 | Pro 配额表；文档异常；不用于 Free | E14 |

## 4. 关键原句映射

| C-ID | E-ID | 原句关键词／定位 | 关系 | 范围／条件 |
|---|---|---|---|---|
| C2 | E1 | "50 agentic requests per month"；定价表 Free 列 | SUPPORTS | Free Tier；IDE／CLI |
| C2 | E2 | "any Q&A chat or agentic coding interaction"；FAQ 第一句 | SUPPORTS | agentic request 定义 |
| C2 | E3 | "All requests made through both the IDE and CLI"；FAQ 第二句 | SUPPORTS | IDE／CLI 合并计数 |
| C3 | E7 | "1,000 LOC per month, per user"；定价注释 | SUPPORTS | Java transformation；按用户 |
| C3 | E8 | "Only those submissions where you receive suggested upgrade code back"；脚注 | SUPPORTS | 成功返回才计 |
| C3 | E9 | "comments and empty lines are not counted"；脚注 | SUPPORTS | 非代码行排除 |
| C4 | E4、E11 | "perpetual Free Tier with monthly limits" | SUPPORTS | 持续免费层；月度 |
| C5 | E4、E11 | 只有 "monthly limits"，没有 reset 日／时刻 | CONTEXT | 未知边界 |
| C6 | E5 | "only to Builder ID users" | SUPPORTS | IDE 账户范围 |
| C6 | E6 | "account level ... IAM ... user level ... Builder ID" | SUPPORTS | 计数层级 |
| C8 | E13 | "April 30, 2027 ... discontinue ... IDE plugins" | SUPPORTS | IDE 插件 |
| C11 | E14 | "Agentic requests ... 1,000 lines of code per month"；Pro 表 | SUPPORTS | Pro-only，不是 Free |

## 5. 冲突处理

| X-ID | 双方各说什么 | 适用条件 | 能否解释 | 未解决部分 |
|---|---|---|---|---|
| X1 | 产品页 "50 agentic chat interactions"；定价页 "50 agentic requests (Q&A chat, agentic coding)" | 同一 Free Tier；产品概览 vs 定价/FAQ | 能；数值一致，产品页措辞较窄；定价页/FAQ 定义更具体 | 产品页是否故意只指 chat，还是概览省略 agentic coding；按更具体的定价页/FAQ 使用 |
| X0 | 未发现 Free 数值冲突 | 已查 5 个官方页面；2026-10-24 | 不适用 | 不能外推为全网无冲突 |

Pro 配额表的单位异常不是 Free 冲突，记录为 G4；不能据此改写 Free 的 50 requests。

## 6. 缺口处理

| G-ID | 涉及主张 | kind | 缺什么 | searchScope／影响 |
|---|---|---|---|---|
| G1 | C5 | INSUFFICIENT_EVIDENCE | 具体重置日／时刻／时区；自然月还是滚动 30 天 | 5 个官方页面；en-US；2026-10-24；影响“按月重置”的精确边界 |
| G2 | C9 | NOT_FOUND_IN_SCOPE | 地区可用性；中国大陆等区域 | 5 个官方页面；en-US；2026-10-24；不能写全球可用 |
| G3 | C7 | INSUFFICIENT_EVIDENCE | 代码补全是否有单独月限额／是否无限 | 定价页、套餐页、产品页；en-US；2026-10-24 |
| G4 | C11 | INSUFFICIENT_EVIDENCE | Pro 配额表 "Agentic requests" 行为何写 1,000 LOC／月 | General Reference Pro section；en-US；2026-10-24；可能是文档单位错误 |
| G5 | C2 | INSUFFICIENT_EVIDENCE | 多步 agentic 任务含多次工具调用时计一次还是多次 | 定价页 FAQ；en-US；2026-10-24 |
| G6 | C4、C10 | INSUFFICIENT_EVIDENCE | 50／1,000 规则的官方生效日 | 定价页、产品页、套餐页、General Reference；en-US；2026-10-24 |
| G7 | C8 | INSUFFICIENT_EVIDENCE | 2027-04-30 后 CLI／Console 是否继续 Free Tier | what-is 结束通知；en-US；2026-10-24 |
| G8 | C6 | INSUFFICIENT_EVIDENCE | Console 的 Free Tier 账户映射未逐项摘录；q-tiers 表有图标，未作为 READ 原句 | q-tiers Free tier availability table；en-US；2026-10-24 |

## 7. 不确定性与可能改变判断的证据

| 项 | 当前判断 | 什么证据会改变 | 影响范围 |
|---|---|---|---|
| 重置边界 | 只知 monthly limits，不知具体日期／时刻／时区 | AWS 官方计费/配额说明或控制台显示的周期重置时间 | Q4、C5 |
| 代码补全上限 | 未列单独限额；不推定无限 | 官方套餐表新增代码补全额度，或 AWS 支持确认 | Q2／Q3、C7 |
| 多步 agentic 计数 | 按 request 计，但未说明工具调用是否另计 | 官方 FAQ 更新或实测账单/用量页面 | Q3、C2 |
| 地区 | 未列限制；未验证中国大陆 | 官方区域可用性文档或实际账号验证 | Q5、C9 |
| Pro 表异常 | 视为 Pro-only 文档异常 | AWS 修正页面或支持确认 | C11、G4 |
| 2027-04-30 后 | 只确认 IDE 插件停止支持 | AWS 后续公告 | Q5、C8、G7 |

## 8. 人工确认

- 确认人：`（乙；待签署）`
- 确认时间：`null`
- 确认声明：`（待填写：我已逐条核对 Q／C／E 与原文；以下为人工参考判断，不是系统输出；仍有哪些不确定）`
- 仍未解决：G1–G8，尤其 G1 重置边界、G3 代码补全上限、G4 Pro 表异常。

### 8.1 需乙亲自核实

- [ ] 确认 “50 agentic requests” 确实包含 agentic coding，而不只是 chat；以定价页/FAQ 为准。
- [ ] 确认 1,000 LOC 是独立的 Java 升级转换额度，不是 agentic request 额度的一部分。
- [ ] 确认“按月”的具体重置边界；若官方无说明，保留 G1，不猜 1 日 00:00。
- [ ] 确认代码补全是否有单独月限额；不把“未列”写成“无限”。
- [ ] 确认 Builder ID／IAM／IAM IdC 与 IDE／CLI／Console 的适用范围；确认地区（尤其中国大陆）。
- [ ] 确认 General Reference 的 Pro 表异常只是文档错误，不影响 Free。
- [ ] 确认 2027-04-30 后 IDE 插件停止支持对本案结论的影响。
- [ ] 确认 2026-10-15 页面更新后至 2026-10-24 没有新的额度变更。

> 以上任一项未经确认，不得把本文件标为“人工已确认”或“人工金标准”。

## 9. 模型协助说明

- 是否使用模型：是。
- 用途：网页搜索线索、官方页面抓取、表格整理、英文原句的中文翻译候选。
- 模型没有做的事：没有代替乙签署人工确认；没有生成系统运行结果；没有补造官方未写的数值。
- 人工核对：待乙逐条核对原句、定位、关系和范围。

## 10. 系统对照

> 系统未运行：正式 handler 返回 `unavailable("investigation orchestration")`，无调查 ID、无快照。以下是状态记录，不是对照结果。

| Q-ID | 参考结论（摘要） | 系统结论（摘要） | 对照 | 差异／依据 |
|---|---|---|---|---|
| Q1 | Free Tier 存在，perpetual | 未运行 | 系统缺失 | 无 investigation_id／snapshot_id |
| Q2 | 50 requests／1,000 LOC | 未运行 | 系统缺失 | 同上 |
| Q3 | request／LOC 计量 | 未运行 | 系统缺失 | 同上 |
| Q4 | 月度、非一次性；重置边界未知 | 未运行 | 系统缺失 | 同上 |
| Q5 | Builder ID／IAM；地区未知；2027 结束 | 未运行 | 系统缺失 | 同上 |
| Q6 | 官方数值一致；Pro 表异常 | 未运行 | 系统缺失 | 同上 |

引用对照：无系统引用可查。运行输入未包含本文件；`reference_used` 未填 false，因为未运行。

## 11. 评估

> 这是参考草稿的自检，不是最终评估；最终结论需要乙确认与丙独立复核。

### 11.1 人工参考判断

| 标准 | 结论 | 依据 | 备注 |
|---|---|---|---|
| G1 身份／版本 | 通过 | 官方产品页＋定价页；Free vs Pro 分列 | 版本 null；套餐明确 |
| G2 事实 | 部分 | E1/E7/E10；G1、G3、G5 | 已知两项额度；未知边界 |
| G3 引用有效 | 通过 | E1–E14 有 URL、原句、定位、hash | 无悬空引用 |
| G4 原句支持 | 通过 | E1/E2/E3/E7/E8/E9；E10 作背景 | 未用产品页扩大范围 |
| G5 冲突／缺口 | 部分 | X1、X0、G1–G7 | Pro 异常与 Free 分开 |
| G6 过度推断 | 通过 | 未写“无限”；未写“全球”；未写“独立实测” | 保留限定 |
| G7 独立性 | 通过（适用） | 官方同组，独立第三方 0 | 不声称多方独立 |
| G8 六项完整 | 部分 | 材料齐全；复核未完成 | 待丙 |
| G9 状态诚实 | 通过 | 系统未运行；无调查 ID／快照 | 未伪造 |
| G10 参考隔离 | 通过 | 系统未运行；参考未送入 | 未发生泄漏 |
| G11 可复现 | 通过 | URL、定位、hash、获取时间 | 页面未来可能变化 |
| G12 范围／意图 | 部分 | 回答问题；未知项明确 | 不能回答精确重置边界 |

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
  - "乙逐条确认 Q1–Q6、C1–C11 与 E1–E14"
  - "G1 重置边界、G3 代码补全上限、G4 Pro 表异常仍未解决"
  - "丙完成独立复核"
evaluator: "乙（待确认）"
evaluated_at: null
```

## 13. 变更记录

| 日期 | 变更 | 变更人 |
|---|---|---|
| 2026-10-24 | 创建 A-01 人工参考草稿；标记待人工核实；无系统运行 | 乙 |
