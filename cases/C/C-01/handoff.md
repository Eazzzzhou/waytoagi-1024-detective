# C-01 核查说明 · 给甲和丙

日期：2026-10-24 · 负责人：乙 · 状态：材料待人工核实；系统未运行

## 1. 一句话结论（草稿，未确认）

“GitHub Copilot Free 每月 2,000 次补全 + 50 次 chat requests”最早出自 **2024-12-18 的 GitHub/VS Code 官方发布**。SD Times 明确引用 GitHub；vscode.js.cn 与 vscode.com.tw 是 VS Code 博客的中文翻译；2026 年的 YixScout 仍复述 50，并把 50 写成“含 Copilot Edits”。

这些页面看起来是多个站点，但都能追到同一个 2024 官方源头：**独立第三方第一手来源为 0**。2026-10-24 当前 GitHub Docs 只明确 **2,000 completions + AI credits allowance**，没有列出固定 50。因此：

- 2,000 completions/month：当前官方支持，但仍是一个官方源头，不是“多源独立证实”。
- 50 chat requests：2024 官方说法，被多站重复；当前 Docs 未列固定 50，且没有独立第一手测试。不能写成“多个独立来源证实 50”，也不能写成“50 从未存在”。

## 2. 固定问题与身份

- 问题原文：`关于 GitHub Copilot Free 每月包含 2,000 次代码补全和 50 次 chat requests 的几条说法，哪些是独立来源，哪些只是同一作者或同一文章的转载？`
- 问题 SHA-256：`a00babf0802eba93d6957cfbd35ec3e3eb99157812df749dc69042e0d411b99d`
- 产品：GitHub Copilot Free
- 版本：无独立版本号；2024-12-18 发布；2026-10-24 当前 Docs
- 范围：Free 套餐的 2,000 completions + 50 chat 说法；不含 Pro premium requests

## 3. 来源关系（已核实）

| 组 | 来源 | 关系 | 是否独立 |
|---|---|---|---|
| G1 | GitHub Changelog 2024-12-18 | 官方原始 2,000/50 | 否（官方声明） |
| G1 | VS Code Blog 2024-12-18 | 同日官方 2,000/50 | 否（同一发布事件） |
| G2 | SD Times 2024-12-19 | 引用 GitHub CEO post；二次改写 | 否 |
| G3 | vscode.js.cn 2024-12-18 | VS Code Blog 简体中文翻译 | 否 |
| G3 | vscode.com.tw 2024-12-18 | VS Code Blog 繁体中文翻译 | 否 |
| G4 | YixScout 2026-07-11 | 重复 2,000/50；称已对照 GitHub 页；无 chat 测试 | 否/未知 |
| G5 | GitHub Docs 2026-10-24 | 2,000 completions + AI credits；未列固定 50 | 官方当前基线，不是独立 |
| G5 | GitHub Legacy 2026-10-24 | premium requests 仅 Pro/Pro+ 年度 legacy | 官方范围限定 |
| G6 | C114/IT之家 | HTTP 403，未读取 | 未核实，不计 |

**独立第三方第一手来源：0。** 6 个“50”页面不是 6 个独立来源：官方 2 页 + 1 个明确引用 + 2 个翻译 + 1 个 2026 二手复述。

## 4. 关键时间线

| 时间 | 事件 |
|---|---|
| 2024-12-18 | GitHub Changelog + VS Code Blog：2,000 completions + 50 chat |
| 2024-12-19 | SD Times 引用 GitHub CEO post，重复 2,000/50 |
| 2024-12-18 | vscode.js.cn / vscode.com.tw 翻译 VS Code Blog |
| 2026-07-11 | YixScout 仍写 2,000/50，并加“含 Copilot Edits” |
| 2026-10-24 | GitHub Docs：2,000 completions + AI credits，未列固定 50；legacy 仅 Pro/Pro+ |

## 5. 已知与未知

### 已知

- 2024 官方原文确实写 2,000 + 50。
- SD Times 明确引用 GitHub CEO post。
- 两个中文站是 VS Code Blog 的翻译/镜像，不是独立来源。
- YixScout 2026 仍复述 50，并加“含 Copilot Edits”；无独立 chat 配额测试。
- 当前 Docs 只明确 2,000 + AI credits；未列固定 50。
- Legacy 文档只适用于 Pro/Pro+ 年度 legacy，不适用于 Free。

### 未知

- 2024 的 50 说法何时、是否被 AI credits 取代。
- 当前 Copilot Free 是否仍存在某种等价于 50 的 chat 限额；Docs 未列。
- YixScout 在 2026-07-11 看到的具体 GitHub 页面/版本。
- 中文翻译的译者身份；只影响翻译责任人，不影响上游关系。
- 独立第一手 50 chat 测试；未登录、未绕过限制，本次没有账户实测。
- C114/IT之家 403 的原文；未核实，不计。

## 6. 真实冲突/非冲突

- **X1**：YixScout 2026 的 50 vs 当前 Docs 的 AI credits。当前口径冲突；YixScout 是二手，具体上游未取得。
- **X2**：2024 官方 50 vs 2026 Docs AI credits。时间/版本变化，不是同一时点矛盾；50 适用于 2024 公告。
- **X3**：YixScout 的“含 Copilot Edits” vs 2024 官方原句。二次转写增加范围，不是官方原文。
- **X4**：多个 URL 重复 vs 独立来源。不是冲突，是计数问题；独立 0。

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

1. 先只读问题和 E1–E16 的原始页面，不读 `reference.md`。
2. 独立回答 Q1–Q6，写下依据和不确定项，填 `review.md` §3。
3. 再读 `reference.md`，逐 Q 记录同意／分歧，填 §4。
4. 重点复核：E1/E2 是否同一发布事件；E4/E5 是否确实引用 GitHub；E6–E9 是否翻译同一篇；E10/E11 的 50 是否独立；E12–E16 当前 Docs 是否真的没有固定 50；C114 403 是否保留。
5. 跑 X1–X12；有阻断就写 `不通过`，不要用其他项抵扣。
6. 签署后才可标“已独立复核”。

## 9. 不要写的内容

- 不要写“6 个来源都证实 50”；它们同源/派生。
- 不要写“50 从未存在”；2024 官方原文明确有。
- 不要写“2026 当前确定还有固定 50”；当前 Docs 未列，独立测试没有。
- 不要写“2,000 completions 有多个独立来源证实”；只有一个官方源头。
- 不要写“翻译站是独立媒体”；它们是 VS Code Blog 的翻译/镜像。
- 不要写“YixScout 的‘含 Copilot Edits’是官方原文”；这是二次转写增加的范围。
- 不要写“C114 没有这篇文章”；它是 403，不是不存在。
- 不要写“系统已运行”或“已有快照”；当前是阻塞。
- 不要用 `reference.md` 的内容作为系统输入。

## 10. 文件

- `case.md`：问题、身份、时间线、16 条证据、来源关系表、传播图、主张、冲突、缺口、系统阻塞。
- `reference.md`：人工参考草稿、逐问判断、待确认项、系统对照占位、评估自检。
- `review.md`：丙的独立复核工作位，当前未复核。
- 本文件：给甲／丙的简短交接说明。
