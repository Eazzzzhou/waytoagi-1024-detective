---
case_id: "C-01"
reference_status: "待人工核实"
confirmed_by: null
confirmed_at: null
---
<!--
人工参考判断草稿。禁止作为系统运行输入。
当前未经乙确认，不是人工金标准。
-->

# C-01 · 人工参考判断草稿

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
| Q1 | 待核查说法逐条原文是什么？最早出处？ | 最早可定位的 2024-12-18 官方来源是 GitHub Changelog：“2000 Code Completions and 50 chat messages per month!”；同日 VS Code Blog 写“2000 code completions/month”和“50 chat requests/month”。 | 已查明 | E1、E2、E3 | 两个官方页面是同日发布，不是两个独立来源 |
| Q2 | 每条说法的 URL、作者、时间、定位？ | E1 GitHub Changelog；E2–E3 VS Code Blog（Burke Holland）；E4–E5 SD Times（Jenna Barron）；E6–E9 中文翻译；E10–E11 YixScout 2026；E12–E15 当前 Docs；E16 legacy。 | 已查明 | E1–E16 | 翻译译者未署名；YixScout 未给页面快照 |
| Q3 | 哪些是同一作者/文章/upstream？ | E1/E2 同一发布事件；E4/E5 引用 GitHub CEO post；E6–E9 是 E2 的中文翻译；E10/E11 是 2026 二手复述；E12–E16 是 GitHub 当前文档。 | 已查明 | E1–E16、§7.3 | YixScout 具体上游页面未知 |
| Q4 | 哪些可判独立？依据？ | 独立第三方第一手来源：**0**。官方发布组 1；翻译/改写/二手是派生；没有找到独立 chat 配额测试。 | 已查明（独立计数） | E1–E16 | C114 403；不代表“没有其他来源”，只代表本次未取得 |
| Q5 | 是否存在一手来源？转载是否改变原意？ | 一手来源是 GitHub/VS Code 2024 公告。SD Times 数字与原文一致；两个中文翻译数字一致；YixScout 把 50 写成“含 Copilot Edits”，这是二次转写增加的范围，不是 2024 官方原句。 | 已查明（有改写） | E10 vs E1/E2；E4；E6–E9 | 翻译措辞不同，但数字未变 |
| Q6 | 扣除重复来源后，证据能支持什么？ | 2,000 completions/month 仍有当前官方支持；50 chat requests 是 2024-12-18 官方说法，被多站重复，但没有独立第一手证实，且 2026 当前 Docs 改为 AI credits、未列固定 50。不能写“多个独立来源证实 50”。 | 部分查明＋证据不足 | E1–E16；X1–X4；G1–G7 | 2024 说法何时改变未知；当前 50 状态需官方澄清 |

### 2.1 一句话参考答案（草稿）

> “2,000 次代码补全 + 50 次 chat requests”最早出自 2024-12-18 的 GitHub Copilot Free 官方发布，GitHub Changelog 与 VS Code Blog 同日给出。SD Times 明确引用 GitHub；vscode.js.cn 与 vscode.com.tw 是 VS Code 博客的中文翻译；2026 年的 YixScout 仍复述 50，并把 50 写成“含 Copilot Edits”。这些页面看起来是多个站点，但都能追到同一个 2024 官方源头；独立第三方第一手来源为 0。2026-10-24 当前 GitHub Docs 只明确 2,000 completions + AI credits allowance，没有列出固定 50。因此：2,000 有当前官方支持；50 是 2024 官方说法，不能被当作“多个独立来源证实”的当前事实。

> 这段话是人工参考草稿，不是系统输出；待乙确认后才能作为参考金标准。

## 3. 主张级判断

| C-ID | statement | kind | verificationStatus | reason | scope | 依据 E |
|---|---|---|---|---|---|---|
| C1 | 2024-12-18 GitHub Changelog 写 2,000 completions + 50 chat messages/month。 | FACT | SUPPORTED | E1 原文。 | 2024-12-18 launch | E1 |
| C2 | 2024-12-18 VS Code Blog 同日写 2,000 completions + 50 chat requests/month。 | FACT | SUPPORTED | E2/E3 原文。 | 2024-12-18 launch | E2、E3 |
| C3 | SD Times 的 2,000/50 是引用 GitHub CEO post 的二次改写。 | FACT | SUPPORTED | E4 数字；E5 引用句。 | 2024-12-19 | E4、E5 |
| C4 | vscode.js.cn / vscode.com.tw 是 VS Code Blog 的中文翻译/镜像。 | FACT | SUPPORTED | E6–E9 同标题/作者/日期/结构。 | 2024-12-18 翻译 | E6–E9 |
| C5 | YixScout 2026-07-11 仍重复 2,000/50，并写成“含 Copilot Edits”；无独立 chat 测试。 | FACT | SUPPORTED | E10/E11；无 chat 测试。 | 2026-07-11 | E10、E11 |
| C6 | 2026-10-24 当前 Docs 只明确 2,000 completions + AI credits；未列固定 50。 | FACT | SUPPORTED | E12–E15；E16 legacy 只限 Pro/Pro+。 | 2026 current docs | E12–E15 |
| C7 | 当前 Copilot Free 仍固定包含 50 chat requests/month。 | FACT | DISPUTED | E10/E11 说 50；E12–E15 说 AI credits、未列 50；无独立测试。 | 2026 current Free | E10–E15 |
| C8 | 多个页面重复 50 构成多个独立来源证实。 | FACT | REFUTED | E1–E11 全部同源/派生；独立第一手 0。 | 50 claim | E1–E11 |
| C9 | 2,000 completions/month 仍有当前官方支持。 | FACT | SUPPORTED | E12/E15 当前官方。 | current Free | E12、E15 |
| C10 | 2,000 completions/month 有多个独立来源分别证实。 | FACT | REFUTED | E1–E15 同一官方源头/派生；独立第三方 0。 | 2,000 claim | E1–E15 |
| C11 | YixScout 把 50 写成“含 Copilot Edits”，超出 2024 官方原句。 | FACT | SUPPORTED | E10 vs E1/E2；官方原句未写“含 Copilot Edits”。 | 2026 二次转写 | E10、E1、E2 |
| C12 | 没有独立第一手测试 50 chat 配额；C114 403 未读取。 | FACT | INSUFFICIENT | 本次检索未找到；R11 403。 | 本次范围 | E1–E16 |
| C13 | 多个 URL 重复同一说法 ≠ 多个独立来源证实。 | FACT | SUPPORTED | 来源关系表：6 个 50 页面 → 1 官方发布组 + 1 UNKNOWN。 | 方法论 | E1–E11 |

## 4. 关键原句映射

| C-ID | E-ID | 原句关键词／定位 | 关系 | 范围／条件 |
|---|---|---|---|---|
| C1 | E1 | "2000 Code Completions and 50 chat messages per month" | SUPPORTS | 2024-12-18 官方 |
| C2 | E2、E3 | "2000 code completions/month" + "50 chat requests/month" | SUPPORTS | 2024-12-18 官方 |
| C3 | E4、E5 | "2,000 code completions and 50 chat messages" + "wrote in a post" | SUPPORTS | SD Times 2024-12-19 |
| C4 | E6–E9 | 中文翻译的 2,000 + 50 | SUPPORTS | 翻译/镜像 |
| C5 | E10、E11 | "2,000 次补全、50 次聊天请求（含 Copilot Edits）" + "2026-07-11 ... 核验" | SUPPORTS | 2026 二手 |
| C6 | E12–E15 | 2,000 completions + AI credits；无 50 | SUPPORTS | 2026 当前 Docs |
| C7 | E10/E11 vs E12–E15 | 50 vs AI credits | CONTEXT | 当前口径冲突 |
| C8 | E1–E11 | 同源/派生链 | CONTEXT | 重复 ≠ 独立 |
| C11 | E10 vs E1/E2 | "含 Copilot Edits" vs 官方原句 | CONTEXT | 二次增加范围 |
| C13 | E1–E11 | 6 页面同源 | CONTEXT | 独立计数 0 |

## 5. 冲突处理

| X-ID | 双方各说什么 | 适用条件 | 能否解释 | 未解决部分 |
|---|---|---|---|---|
| X1 | YixScout 2026：Free 有 50 chat；当前 Docs 2026：AI credits，未列固定 50 | 2026-07-11 vs 2026-10-24 | 可能是官方页面在期间变化，或 YixScout 读的是旧页/摘要；不能确认 | 当前 Free 是否仍有固定 50；需官方澄清 |
| X2 | 2024 官方：50 chat；2026 Docs：AI credits | 2024-12-18 vs 2026-10-24 | 时间/版本变化可以解释；不是同一时点矛盾 | 具体切换日期未知（G2） |
| X3 | YixScout：“50 含 Copilot Edits”；2024 官方：50 chat messages/requests | 二次转写 vs 原文 | 二次文章增加范围；不能当官方原句 | 官方是否把 Copilot Edits 计入 50，未确认 |
| X4 | 多个 URL 重复 50 vs 独立来源 | 来源关系 | 可解释：同源/派生；独立 0 | 没有独立第一手测试（G1） |

## 6. 缺口处理

| G-ID | 涉及主张 | kind | 缺什么 | searchScope／影响 |
|---|---|---|---|---|
| G1 | C12 | INSUFFICIENT_EVIDENCE | 独立第一手 50 chat 测试 | 官方、SD Times、翻译、YixScout；2026-10-24 |
| G2 | C7 | INSUFFICIENT_EVIDENCE | 2024 50 何时被 AI credits 取代 | GitHub Changelog/Docs；2026-10-24 |
| G3 | C12 | READ_FAILED | C114/IT之家 403 | 该 URL；2026-10-24；HTTP 403 |
| G4 | C5、C11 | INSUFFICIENT_EVIDENCE | YixScout 2026-07-11 页面快照 | YixScout/GitHub pages；2026-10-24 |
| G5 | C4 | IDENTITY_UNCLEAR | 中文译者未署名 | vscode.js.cn/com.tw；2026-10-24 |
| G6 | C13 | NOT_FOUND_IN_SCOPE | 同语言全文转载 | 中英文搜索；2026-10-24；只找到翻译/改写 |
| G7 | C6、C7 | INSUFFICIENT_EVIDENCE | 搜索摘要与页面级 READ 不一致 | GitHub Docs/搜索索引；2026-10-24 |

## 7. 不确定性与可能改变判断的证据

| 项 | 当前判断 | 什么证据会改变 | 影响范围 |
|---|---|---|---|
| 50 当前状态 | 2024 有官方说法；2026 Docs 未列 | GitHub 官方澄清/当前套餐页原文 | Q6、C7 |
| 切换日期 | 未知 | changelog/定价页历史版本 | Q6、C7、G2 |
| YixScout 上游 | 未知 | 2026-07-11 页面快照/archive | Q2/Q3、C5、G4 |
| 独立测试 | 未找到 | 独立账户的用量记录/官方 quota 文档 | Q4、C12 |
| 翻译关系 | 同上游明确，译者不明 | 译者署名/原文对照 | Q3、C4、G5 |

## 8. 人工确认

- 确认人：`（乙；待签署）`
- 确认时间：`null`
- 确认声明：`（待填写：我已逐条核对 Q／C／E 与原文；以下为人工参考判断，不是系统输出；仍有哪些不确定）`
- 仍未解决：X1–X4、G1–G7，尤其当前 50 状态、切换日期、独立测试。

### 8.1 需乙亲自核实

- [ ] 确认 2024 GitHub Changelog 与 VS Code Blog 是同一发布事件，不按两个独立来源计。
- [ ] 确认 SD Times 的 “post” 链接确实指向 GitHub 官方公告，而不是另一个二手页。
- [ ] 确认 vscode.js.cn / vscode.com.tw 与 VS Code Blog 的对应关系；译者未署名不影响“同上游”判断。
- [ ] 确认 YixScout 是否真的在 2026-07-11 看到过含 50 的 GitHub 页面；没有快照就不能当当前证据。
- [ ] 确认当前 GitHub Docs 的 AI credits 口径是否已完全取代固定 50；需要官方澄清时保留 G1/G2。
- [ ] 确认 C114/IT之家 403 不绕过访问限制；不计入独立来源。
- [ ] 确认结论是“独立来源 0 / 无法证实 50”，不是“50 从未存在”或“Copilot Free 没有 chat”。
- [ ] 确认没有把 2,000 completions 的当前官方支持误写成“多个独立来源”。

> 以上任一项未经确认，不得把本文件标为“人工已确认”或“人工金标准”。

## 9. 模型协助说明

- 是否使用模型：是。
- 用途：网页搜索线索、官方/媒体/翻译页面抓取、来源关系整理、英文原句的中文翻译候选。
- 模型没有做的事：没有代替乙签署人工确认；没有生成系统运行结果；没有补造 C114 原文或 YixScout 页面快照。
- 人工核对：待乙逐条核对原句、定位、关系和范围。

## 10. 系统对照

> 系统未运行：正式 handler 返回 `unavailable("investigation orchestration")`，无调查 ID、无快照。以下是状态记录，不是对照结果。

| Q-ID | 参考结论（摘要） | 系统结论（摘要） | 对照 | 差异／依据 |
|---|---|---|---|---|
| Q1 | 2024 官方 2,000/50 | 未运行 | 系统缺失 | 无 investigation_id／snapshot_id |
| Q2 | 多站但同源 | 未运行 | 系统缺失 | 同上 |
| Q3 | 官方+引用+翻译+二手 | 未运行 | 系统缺失 | 同上 |
| Q4 | 独立第一手 0 | 未运行 | 系统缺失 | 同上 |
| Q5 | 翻译数字一致；YixScout 加范围 | 未运行 | 系统缺失 | 同上 |
| Q6 | 2,000 当前官方；50 不足/过时 | 未运行 | 系统缺失 | 同上 |

引用对照：无系统引用可查。运行输入未包含本文件；`reference_used` 未填 false，因为未运行。

## 11. 评估

> 这是参考草稿的自检，不是最终评估；最终结论需要乙确认与丙独立复核。

### 11.1 人工参考判断

| 标准 | 结论 | 依据 | 备注 |
|---|---|---|---|
| G1 身份／版本 | 通过 | Copilot Free 与 Pro/Legacy 分列 | 套餐明确 |
| G2 事实 | 部分 | 2024 官方 vs 2026 Docs；X1/X2 | 50 当前状态未定 |
| G3 引用有效 | 通过 | E1–E16 有 URL、原句、定位、hash | C114 403 未计入 |
| G4 原句支持 | 通过 | 翻译/引用/二手逐条对比 | 不把翻译当独立 |
| G5 冲突／缺口 | 部分 | X1–X4、G1–G7 | 真实时间/当前冲突保留 |
| G6 过度推断 | 通过 | 未写“多源证实 50”；未写“50 从未存在” | 范围限定 |
| G7 独立性 | 通过 | 官方 1 组；翻译/引用派生；独立 0 | 按源头计 |
| G8 六项完整 | 部分 | 材料齐全；复核未完成 | 待丙 |
| G9 状态诚实 | 通过 | 系统未运行；无调查 ID／快照 | 未伪造 |
| G10 参考隔离 | 通过 | 系统未运行；参考未送入 | 未发生泄漏 |
| G11 可复现 | 通过 | URL、定位、hash、获取时间 | 页面未来可能变化 |
| G12 范围／意图 | 部分 | 回答来源关系；当前 50 状态未定 | 不能给“确定当前额度”结论 |

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
  - "乙逐条确认 Q1–Q6、C1–C13 与 E1–E16"
  - "X1/X2 的当前 50 状态、G1/G2 的切换日期仍未解决"
  - "丙完成独立复核"
evaluator: "乙（待确认）"
evaluated_at: null
```

## 13. 变更记录

| 日期 | 变更 | 变更人 |
|---|---|---|
| 2026-10-24 | 创建 C-01 人工参考草稿；标记待人工核实；无系统运行 | 乙 |
