---
case_id: "<TYPE>-<NN>"
case_type: "<A|B|C>"
title: "<产品／能力／问题的简短标题>"
owner: "乙"
created_at: null
updated_at: null
status:
  material: "未开始" # 未开始 | 待人工核实 | 人工已确认
  system: "未运行" # 未运行 | 已提交未完成 | 系统已运行（失败） | 系统已运行（成功）
  review: "未复核" # 未复核 | 已独立复核
question_sha256: null
system_run_id: null
snapshot_id: null
snapshot_version: null
---
<!--
模板，不是案例。复制到 cases/<TYPE>/<ID>/case.md 后：
1. 删除本注释和所有“模板”提示；
2. 替换所有 <...> 占位符；
3. 未发生的运行、快照、复核保持未运行／null，不得预填；
4. reference.md 是人工参考判断，禁止作为系统运行输入。
-->

# <案例 ID> · <标题>

> 材料状态：<未开始／待人工核实／人工已确认> · 系统状态：<未运行／…> · 复核状态：<未复核／已独立复核>
>
> 本文件记录材料与系统运行，不记录人工参考答案。参考判断在 `reference.md`，独立复核在 `review.md`。

## 1. 案例标识

| 字段 | 值 | 说明 |
|---|---|---|
| 案例 ID | `<TYPE>-<NN>` | 与目录、索引一致；不复用 |
| 类型 | `<A／B／C>` | 与类型目录一致 |
| 负责人 | 乙 | 材料、关系、交付完整性 |
| 创建／更新时间 | `null` / `null` | ISO 8601，含时区 |
| 材料状态 | 未开始 | 见入口状态模型 |
| 系统状态 | 未运行 | 见入口状态模型 |
| 复核状态 | 未复核 | 见入口状态模型 |

## 2. 问题与意图

### 2.1 用户问题原话

> （逐字粘贴用户问题；不要改写、补全或润色）

- 问题来源／获取时间：`（待填写）`
- 是否包含多个问题：`（是／否；若是，拆分到 §5）`
- 默认回答意图：`客观搜查`（如果用户明确要求建议，改为 `适配建议`，并记录真实用户条件）

### 2.2 系统提交问题

| 字段 | 值 |
|---|---|
| 提交问题（API `question`） | `（必须与 2.1 逐字一致；API 仅去首尾空白）` |
| SHA-256（UTF-8 字节） | `null` |
| 是否与 2.1 一致 | `（是／否）` |

## 3. 产品身份

| 字段 | 值 | 说明 |
|---|---|---|
| 产品名 | `（待填写）` | 同名产品需消歧 |
| 官方站点 | `（待填写／null）` | 不能拿应用商店页冒充官网 |
| 版本 | `（待填写／null）` | 未知不写“最新” |
| 套餐 | `（待填写／null）` | `Free` 是套餐，不是版本 |
| 地区 | `（待填写／null）` | 影响价格／额度／功能时必填；D1 扩展字段 |
| 账号类型 | `（待填写／null）` | 个人／企业／教育等，若影响权益 |
| 身份状态 | `（UNRESOLVED／NEEDS_CONFIRMATION／CONFIRMED）` | 与共享契约语义一致 |
| 歧义／消歧说明 | `（待填写）` | 同名、改名、收购、不同国家站点 |

### 3.1 身份依据

| # | URL | 原句（≤300） | 获取时间 | 确认理由 |
|---|---|---|---|---|
| I1 | `（待填写）` | `（待填写）` | `（待填写）` | `（待填写）` |

> `CONFIRMED` 至少需要官网和一条可定位依据。仅有搜索结果标题不算确认。

## 4. 时间与适用

| 字段 | 值 | 说明 |
|---|---|---|
| 研究开始 | `null` | 实际检索开始 |
| 研究结束 | `null` | 实际检索结束 |
| 事实基准日 | `null` | 结论依据材料截止到该日；不等于抓取时间 |
| 事实适用起 | `null` | 有官方生效日／发布说明时填写 |
| 事实适用止 | `null` | 未知则 null；不能外推未来 |
| 适用依据 | `（待填写）` | 官方更新、版本发布、套餐变更 |
| 时区 | `Asia/Shanghai`（显示） | 存储用含偏移 ISO 8601 |

> 研究时间只说明“何时查”；事实适用期说明“结论对哪个时间段成立”。二者不能混用。来源发布时间和获取时间逐条记录在 §7。

## 5. 核查范围与原子问题

### 5.1 范围

- 在范围内：`（产品／版本／套餐／地区／时间／语言／来源类型）`
- 不在范围内：`（未查版本／地区／付费墙／实测／平台）`
- 回答意图：`客观搜查`

### 5.2 原子问题

| Q-ID | 原子问题 | 关联主张 | 判断标准／需要的证据 |
|---|---|---|---|
| Q1 | `（待填写）` | `C1` | `（待填写）` |
| Q2 | `（待填写）` | `C2` | `（待填写）` |

> 一个问题只包含一个可判断命题。A／B／C 类的必答问题见对应类型 README；不要只回答容易的部分。

### 5.3 类型特有门槛

- A：额度数值与重置／消耗方式分别回答；版本、套餐、地区明确。
- B：至少一条官方宣称 READ、至少一条海外原文 READ；真实冲突找到并保留，或明确报告未完成。
- C：至少三条说法／来源；至少一组同源关系评估，或明确报告未发现同源。

## 6. 检索记录

| R-ID | 提供方 | 查询词 | 调用时间 | 状态 | 错误 | 返回来源／采用情况 |
|---|---|---|---|---|---|---|
| R1 | `（待填写）` | `（待填写）` | `null` | `（SUCCEEDED／FAILED）` | `null` | `（URL／摘要；采用或拒绝理由）` |

> 搜索摘要不是原句；检索成功但返回空，和检索失败要分开记录。元宝是否实质参与，用采用理由和证据链说明，不靠调用次数。

## 7. 证据

### 7.1 来源与元数据

| E-ID | URL（直达） | 标题／站点 | 作者／公开账号 | 发布时间 | 获取时间 | 语言 | sourceType | contentKind | 版本／套餐 | readStatus | readError |
|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | `（待填写）` | `（待填写）` | `（待填写／未知）` | `（待填写／未知）` | `null` | `（待填写）` | `（OFFICIAL／COMMUNITY／THIRD_PARTY／UNKNOWN）` | `（FACT／OFFICIAL_CLAIM／USER_REPORT／OPINION／UNKNOWN）` | `（待填写／null）` | `（READ／SNIPPET_ONLY／NOT_FETCHED／FAILED／RESTRICTED）` | `null` |

### 7.2 原文、译文与定位

| E-ID | originalExcerpt（原文，≤300） | translation（译文，非原话） | originalLocation（kind／locator／context） | contentHash（SHA-256） |
|---|---|---|---|---|
| E1 | `（待填写；READ 必填）` | `（待填写／null）` | `（TEXT／COMMENT／PAGE／TIMECODE；定位；上下文）` | `（64 位小写十六进制／null）` |

> `READ` 必须有原句、定位、hash、无读取错误。非 READ 不得填原句、译文、定位、hash。译文不能作为引用原句。原句最多 300 字符，只摘关键句。

### 7.3 同源与独立性

| E-ID | upstreamUrl | independence | originGroupId | independenceReason |
|---|---|---|---|---|
| E1 | `（待填写／null）` | `（INDEPENDENT／SHARED_ORIGIN／UNKNOWN）` | `（待填写／null）` | `（待填写）` |

> 同一作者跨发、同文章转载、同新闻稿、同 upstream、同实验均同源。`UNKNOWN` 不计入独立支持。独立来源按源头计，不按 URL／平台计。

### 7.4 独立性汇总（B／C 类必填）

| 项 | 值 | 说明 |
|---|---|---|
| URL 总数 | `0` |  |
| 已识别源头组数 | `0` |  |
| 其中独立来源数 | `0` |  |
| 同源组 | `0` |  |
| 不确定（UNKNOWN） | `0` | 不计入独立 |
| 计数理由 | `（待填写）` |  |

## 8. 主张与证据关系

### 8.1 主张

| C-ID | statement（原子主张） | kind | verificationStatus | verificationReason | scope | answersQuestion |
|---|---|---|---|---|---|---|
| C1 | `（待填写）` | `（FACT／OFFICIAL_CLAIM／USER_REPORT／OPINION）` | `（SUPPORTED／REFUTED／DISPUTED／INSUFFICIENT／UNVERIFIED）` | `（待填写）` | `（版本／套餐／地区／时间／场景）` | `Q1` |

### 8.2 关系

| C-ID | E-ID | relation | reason |
|---|---|---|---|
| C1 | E1 | `（SUPPORTS／REFUTES／CONTEXT／IRRELEVANT／UNCERTAIN）` | `（原句哪部分、在什么范围支持／反驳）` |

> 只有 `READ` 证据可以 SUPPORTS／REFUTES。关系理由不能只写“有关”。同一证据对不同主张要分别写理由。

## 9. 冲突

| X-ID | 涉及主张 | 证据（≥2） | 冲突描述（双方、条件） | 处理结果 |
|---|---|---|---|---|
| X1 | `（C-ID）` | `（E-ID, E-ID）` | `（待填写）` | `（null／尚不能消除；或解释条件）` |

> 没有冲突时不要留空：写“在已查范围内未发现冲突”，并在 §11 记录检索范围；或者写缺口。已知冲突不得删除。

## 10. 缺口

| G-ID | 涉及主张 | kind | 描述 | searchScope |
|---|---|---|---|---|
| G1 | `（C-ID）` | `（NOT_FETCHED／READ_FAILED／NOT_FOUND_IN_SCOPE／IDENTITY_UNCLEAR／INSUFFICIENT_EVIDENCE）` | `（缺什么、影响什么）` | `（NOT_FOUND_IN_SCOPE 必填：平台／查询词／语言／时间窗）` |

> `READ_FAILED` 不等于“没有讨论”；`NOT_FOUND_IN_SCOPE` 不能写成“整个互联网没有”。没有记录缺口不等于没有未知。

## 11. 人工参考判断（不在本文件）

人工参考判断、逐问结论、不确定性、系统对照和评估结论写在 [reference.md](reference.md)。

> **禁止**把 `reference.md` 的内容复制到问题、身份依据、检索词、提示词或系统输入。系统运行时只使用问题原文和必要的真实身份确认依据。

## 12. 系统运行

### 12.1 运行输入

```yaml
system_inputs:
  question: "<与 §2.1 逐字一致>"
  question_sha256: null
  identity_confirmation: null
  reference_used: null # 运行前确认未使用参考后填 false
```

### 12.2 运行记录

| 字段 | 值 |
|---|---|
| investigation_id | `null` |
| submitted_at | `null` |
| terminal_status | `null` |
| stage | `null` |
| error（code／message／retryable） | `null` |
| snapshot_id | `null` |
| snapshot_version | `null` |
| snapshot_generated_at | `null` |
| contract_version | `null` |
| identity_result | `null` |
| retrieval_records | `null` |
| answer_summary | `null` |

> 未配置提供方时，失败是真实结果；记录 `PROVIDER_NOT_CONFIGURED`，不手改数据库、不伪造成功。失败时 snapshot 相关字段保持 `null`。

### 12.3 运行前隔离检查

- [ ] 提交问题与 §2.1 逐字一致，hash 已记录。
- [ ] 没有把 reference.md、预期主张、证据清单、评估标准、复核意见送入系统。
- [ ] 身份确认依据来自用户真实提供或公开原文，不是参考结论。
- [ ] 运行通过正式 API／Worker，没有直接改数据库。

## 13. 对照与复核

- 系统对照：见 [reference.md](reference.md) 的“系统对照”与“评估”章节。
- 独立复核：见 [review.md](review.md)。
- 本文件不复制参考结论，避免把参考内容混入系统材料。

## 14. 阻断性错误自检

| 阻断 ID | 是否成立 | 依据 |
|---|---|---|
| X1 虚构／不可定位引用 | 未检查 |  |
| X2 错误证据关联 | 未检查 |  |
| X3 证据不足却断言 | 未检查 |  |
| X4 同源转载当独立 | 未检查 |  |
| X5 官方宣称／benchmark 当独立实测 | 未检查 |  |
| X6 读取失败写成没有讨论 | 未检查 |  |
| X7 身份／版本／套餐／地区错配 | 未检查 |  |
| X8 过度推断／范围扩大 | 未检查 |  |
| X9 参考泄漏 | 未检查 |  |
| X10 状态／过程造假 | 未检查 |  |
| X11 红线越界 | 未检查 |  |
| X12 冲突／缺口隐藏或类型错误 | 未检查 |  |

> 任一“是”即不通过；不要用其他项抵扣。完整标准见 [D1 评估标准](../D1-评估标准.md)。

## 15. 变更记录

| 日期 | 变更 | 变更人 |
|---|---|---|
| `null` | 创建 | 乙 |
