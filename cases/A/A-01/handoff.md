# A-01 核查说明 · 给甲和丙

日期：2026-10-24 · 负责人：乙 · 状态：材料待人工核实；系统未运行

## 1. 一句话结论（草稿，未确认）

Amazon Q Developer 的 **Free Tier** 是持续可用的免费层，不是一次性试用。官方定价表列出：

- **每月 50 次 agentic requests**：覆盖 Q&A chat 与 agentic coding，通过 IDE 或 CLI 的请求都计入。
- **每月 1,000 行代码** 的 Java 升级转换额度：只算返回升级建议的提交，注释和空行不计。

两项都以“月”为周期；官方未写明具体重置日、时刻或时区。不能写成“每月 1 日 00:00 重置”或“滚动 30 天”。

## 2. 固定问题与身份

- 问题原文：`Amazon Q Developer 的免费版（Free Tier）额度是多少？按月重置、按次消耗，还是一次性额度？`
- 问题 SHA-256：`dce259e238cc27e4b99bf2e4cdbb568d22a590da94c8b32e6c1dadee2838ea97`
- 产品：Amazon Q Developer（不是 Amazon Q Business）
- 套餐：Free Tier
- 版本：无独立版本号
- 地区：官方页面未列；本次未验证中国大陆
- 账户：IDE／CLI 的 Free Tier 限额仅 Builder ID；IAM 用户按账号级别；Console 映射未在本案确认

## 3. 证据入口

| E-ID | 用途 | URL |
|---|---|---|
| E1 | 50 agentic requests／month | https://aws.amazon.com/q/developer/pricing/ |
| E2–E3 | agentic request 定义与 IDE／CLI 计数 | 同上 |
| E4 | perpetual Free Tier with monthly limits | 同上 |
| E5–E6 | Builder ID／IAM 计数层级 | 同上 |
| E7–E9 | 1,000 LOC／month 与计数条件 | 同上 |
| E10 | 产品页交叉确认 50／1,000 | https://aws.amazon.com/q/developer/ |
| E11–E12 | 文档确认 perpetual 与 Builder ID | https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-tiers.html |
| E13 | IDE 插件 2027-04-30 停止支持 | https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/what-is.html |
| E14 | Pro 配额表单位异常（不用于 Free） | https://docs.aws.amazon.com/general/latest/gr/amazonqdev.html |

原始 HTML 的 SHA-256、原句、定位和获取时间在 `case.md` §7。页面会变；引用时以原句 + URL + 获取时间 + hash 为准。

## 4. 已知与未知

### 已知（有官方原文）

- Free Tier 是 perpetual Free tier，有 monthly limits。
- 50 次 agentic requests／月；agentic request 包含 Q&A chat 与 agentic coding；IDE／CLI 请求合并计数。
- 1,000 LOC／月 的 Java 升级转换额度；只算成功返回升级建议的提交，注释／空行不计。
- IDE 的 Free Tier 限额仅 Builder ID；IAM 用户按账号级别；Free tier 面向 Builder ID 个人账户。
- IDE 插件支持到 2027-04-30。

### 未知／不能断言

- 具体重置日、时刻、时区；自然月还是滚动 30 天。
- 代码补全是否有单独月限额；不能写“无限”。
- 多步 agentic 任务含多次工具调用时计一次还是多次。
- Console 的 Free Tier 账户映射；本次未逐项摘录。
- 中国大陆等地区的可用性。
- 2027-04-30 后 CLI／Console 是否继续 Free Tier。
- Pro 配额表为什么把 “Agentic requests” 行写成 “1,000 lines of code per month”；该表限定 Pro，不能拿来做 Free 结论。

## 5. 给甲：系统运行状态

- 当前正式 handler `src/server/investigation/handler.ts` 返回 `unavailable("investigation orchestration")`；`retrieval`、`identity` 默认实现也不可用。
- `.env` 写明真实适配器尚未实现。
- 因此**没有提交调查**，没有 investigation ID、execution attempt 或 snapshot ID；不要伪造运行结果。
- 若接入后运行，必须：
  1. 只用固定问题原文，不加参考结论、预期主张、URL 列表或评估标准；
  2. 记录真实 investigation ID、状态、错误、snapshot ID／版本；
  3. 不要把 `reference.md` 或 `case.md` 的结论作为提示词、检索词或身份依据；
  4. 运行后按 Q1–Q6 对照，并把结果写回 `reference.md` §10，不改历史快照。

## 6. 给丙：独立复核怎么做

1. 先只读问题和 E1–E14 的原始页面／原句，不读 `reference.md`。
2. 独立回答 Q1–Q6，写下依据和不确定项，填 `review.md` §3。
3. 再读 `reference.md`，逐 Q 记录同意／分歧，填 §4。
4. 检查 G1 重置边界、G3 代码补全上限、G4 Pro 表异常、G5 多步计数；不要把“未列”当成“无限”。
5. 跑 X1–X12；有阻断就写 `不通过`，不要用其他项抵扣。
6. 签署后才可标“已独立复核”。

## 7. 不要写的内容

- 不要写“每月 50 次 chat”而漏掉 agentic coding；官方定价页的定义更宽。
- 不要写“代码补全无限”；官方只是没有在定价表列出单独额度。
- 不要写“每月 1 日 00:00 重置”；官方未说明。
- 不要写“全球可用”或“中国大陆不可用”；地区未验证。
- 不要写“官方已独立实测”或“第三方证实”；只有 AWS 官方口径。
- 不要写“系统已运行”或“已有快照”；当前是阻塞。
- 不要用 `reference.md` 的内容作为系统输入。

## 8. 文件

- `case.md`：问题、身份、时间、范围、检索、证据、主张、冲突、缺口、系统阻塞。
- `reference.md`：人工参考草稿、待确认项、系统对照占位、评估自检。
- `review.md`：丙的独立复核工作位，当前未复核。
- 本文件：给甲／丙的简短交接说明。
