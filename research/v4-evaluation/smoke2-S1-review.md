# Smoke2 S1 独立评估

评估依据为已冻结的 [reference-v1.md](reference-v1.md) 中 S1 五项；参考和本评估只用于离线评价，不得输入生成链。本次仅检查已导出的运行材料及相关生产代码，未修改生产代码、数据库或 Worker，未追加网络搜索。

结论：**0 E / 0 L / 3 U / 2 F；用户事实需求未通过。** 状态 `SUCCEEDED` 表示调查流程完成，不表示五个必答字段均已答对。回答避免把其他模型的规格移植给 deepseek-chat，也保留了数值缺口；但没有回答请求的三个具体数值组，并遗漏已下载官方更新日志中的关键退役/别名时效信息。

## 运行定位

- 问题：DeepSeek API 的 deepseek-chat 模型上下文长度、最大输出和价格分别是多少？
- Investigation：`852908bc-f6db-4e67-b72c-c19dc8ad342b`
- Snapshot：`799afe12-40eb-4da3-877f-33b7f7517a46`
- 原始记录：[investigation.json](../v4-runs/smoke2-20261025/v4/S1/852908bc-f6db-4e67-b72c-c19dc8ad342b/investigation.json)、[snapshot-response.json](../v4-runs/smoke2-20261025/v4/S1/852908bc-f6db-4e67-b72c-c19dc8ad342b/snapshot-response.json)、[validation.json](../v4-runs/smoke2-20261025/v4/S1/852908bc-f6db-4e67-b72c-c19dc8ad342b/validation.json)。
- 实际 UTC 开始 `2026-10-25T04:05:58.487Z`，完成 `2026-10-25T04:06:38.647Z`，约 40.16 秒。
- 模型记录：`api.deepseek.com / deepseek-flash`，promptVersion `a2-evidence-v4`；第二模型独立复核 `NOT_CONFIGURED`。

## 五字段判定

E 为有证据直接回答，L 为有用且明确限定的回答，U 为未解决但保留问题、尝试与限制，F 为遗漏或无支持。未知没有自动折算为质量通过。

| 字段 | 判定 | 理由 |
| --- | --- | --- |
| S1.1 当前状态及对应版本/模型 | F | 最终回答未交代官方已发布的停止使用日期及过渡阶段映射；这些资料已在保存的官方更新日志内。仅列出现行价目表的其他模型不能替代目标名称状态说明。 |
| S1.2 上下文长度及单位 | U | 明确保留无法给出 deepseek-chat 数值的缺口，未把其他模型 1M 上下文当成答案；但用户仍未得到目标数值或适用历史版本的限定答案。 |
| S1.3 最大输出、默认值与条件 | U | 明确保留缺口，未误用其他模型 384K 最大输出；未提供目标的上限/默认值及条件。 |
| S1.4 缓存输入、未缓存输入、输出价格及币种/单位 | U | 仅给通用每百万 tokens 计费与时段规则，并说明不等于目标单价；三个价格仍未解决。第三方旧价目不能自动作为官方当前价格。 |
| S1.5 日期/版本适用性，历史与当前区分 | F | 虽然提醒价格可能变动，也区分其他模型与目标模型，但遗漏已保存的明确日期与别名迁移过程，没有建立足以解释当前问题的时间轴。 |

回答中“根据已保存片段无法给出”属于有范围的材料说明，本评估**不将其指控为“官方或互联网不存在资料”**。失败的核心是已有相关材料未被选用与回答，而非这句有范围的未知说明。

## 已获取却遗漏的关键官方材料

官方更新日志 URL：`https://api-docs.deepseek.com/zh-cn/updates/?ref=codersera.com`。保存时间 `2026-10-25T04:06:25.060Z`。

- Document ID：`6150f7446822119dad1218c1d54c67753b630660b844f65d28070a41bd1acf8c`
- Version：`ec112cd24457663b731dab01ac9fafe5a8353e3dab3a6b69c7d142a46d5271af`
- Block：`b112`；标题路径：更新日志 / 时间:2026-04-24 / DeepSeek-V4
- 保存正文 UTF-16 区间：`[4758,4879)`，source.txt 第 225 行。
- textHash：`23edc39b0a19f3cb52052a9231f32399691fcc59d253e934613057908217af85`
- rawHash：`b206b3f638d21bc907a945281bde1e8f9279ec74c1f9905f5d9fdd1fc4812750`

原文：

> 旧有的 API 接口的两个模型名 deepseek-chat 与 deepseek-reasoner 将于三个月后（2026-07-24）停止使用。当前阶段内，这两个模型名分别指向 deepseek-v4-flash 的非思考模式与思考模式。

该条足以支持“官方于 2026-04-24 公告将在 2026-07-24 停用，公告当时映射至 V4 Flash 两种模式”。它不是实际 API 拒绝请求的独立测试，不能据此声称本次已验证接口实际停用。保存的同一更新日志还有 2025-12-01 的 V3.2 映射、2025-09-22 的 V3.1-Terminus 映射；旧条目不能直接当当前状态。

本次生成曾选用较旧的 2025-09-22 映射并产生主张 `7e94da8a-fe03-4054-afe3-3a2f47410193`，核查未通过后未进入答案；最新且与状态直接相关的 b112 没有被用于答复。这说明至少状态/时效缺口属于材料选择和处理问题，不能全部归因为外部材料缺失。

## 原文、引用及检索审计

独立读取导出文件重新核对：7 份 source.txt 均等于对应 manifest.text；6 份成功文档的正文与原始字节 SHA-256 均匹配；4 条引用中合计 13 个 excerpt 均精确对应证据，excerpt hash 和 documentReference 的正文切片均相等。导出的程序校验另记录 41 个 documentReference 通过。失败文档无原始字节，不计入 6 份成功文件完整性结果。

这些检查证明保存与定位完整性，**不等于所有陈述语义支持均通过**。引用 [2] 的中文表格片段从 `i.deepseek.com/anthropic模型版本DeepSeek...` 开始，包含 1M/384K，但没有模型名称表头；引用 [1] 的英文片段包含 `MODELdeepseek-flash(1)deepseek-v4-pro...`。完整保存表格支持其归属，未发现把表格数值实际错归给 deepseek-chat；不过 [2] 独立展示时缺表头，应合并相应表头片段，使读者能核对模型归属。

导出的语义校验对“摘录中没有出现目标数值”的有范围观察判定不一致：先接受，后又按全局不存在式否定拒绝类似句子。人工评价需区分材料范围描述与全局断言，不能仅凭这一自动判定得出存在全局无数据幻觉。

实际检索与成本记录：

- 3 次搜索，全部使用 Yuanbao；本次未观察到 Tavily 调用，不能宣称多搜索通道已验证。
- 7 次文档抓取：6 成功、1 因证书过期失败；6 次片段选择，41 份片段，duplicateFragments 为 0；未观察到同 URL 重复网络抓取。
- 41 份证据最终全部 `SHARED_ORIGIN`；同一文档多片段及同一官方发布者不构成独立实验。
- 10 次模型调用，实测输入 91,917 tokens、输出 6,556 tokens，unknownUsage 为 0。未配置货币计价依据，不推算费用金额。
- COMPARISON 配额：180 秒总时长、45 秒最终回答保留、6 次搜索、10 次文档抓取、18 次选择、44 次模型调用、125,000 exploration tokens / 180,000 total tokens。
- 约 40 秒停止，停止理由为 `Research model/token budget exhausted`，不是跑满 180 秒。运行时预算采用 `ceil(prompt.length/2)+4000` 的保守预留，累积 reservedTokens 不按实际消耗回调，按 measured/reserved 较大者检查后续调用。这是配置/保守预算耗尽，不代表供应商已实际计费 125,000 tokens。

最终缺口段较长且重复，并把内部预算结构、错误文本及抓取失败细节带入用户答案；可以保留可理解的限制说明，但当前表达并未弥补核心事实欠缺。

## 推荐资格机制：运行版本与当前修改分开记录

初次代码检查和本次保存运行中，片段默认构造仅把官方内容标为 OFFICIAL_CLAIM，其余 UNKNOWN，独立性 UNKNOWN（`src/server/retrieval/documents/fragments.ts:89–92`）；当时核查只产生 Claim.kind，没有将证据写为 USER_REPORT / INDEPENDENT 的路径。`recommendationPolicy` 要求 READ、Evidence.contentKind USER_REPORT、INDEPENDENT、独立性理由，且至少 3 组/2 站（`src/server/research/state.ts:90–95`）。因此在当时默认生产路径下，真实报告即便被读取，推荐资格也无法到达；这是生产元数据分类路径的缺失，而非仅仅阈值严格。旧 groupOrigins 只能合并共同来源，并不能建立独立性。

报告落盘前再次检查共享工作区，已看到主实现新增以下路径：

- `src/server/research/verification.ts:11–19,117–133` 增加 reportProvenance 的任务/过程/结果精确原句、同报告定位、第一手与作者条件，允许写入 USER_REPORT / INDEPENDENT。
- `src/server/verification/index.ts:60,87–88` 增加 preserveConfirmedReports；`src/server/research/engine.ts:102` 已调用。

因此不能再断言“当前代码完全无写入入口”。该修复发生在 smoke 后，**本次 S1 不能证明新路径已端到端有效**，也不能把修复后的行为追记到旧运行中。建议针对报告任务验证：一份报告的多个片段只计一组；同作者跨站转载不增加独立组；明确共享上游应合并；作者/独立性未知保留 UNKNOWN。已知作者、第一手叙述且无已记录 upstreamUrl 本身不足以证明不同站点之间不存在转载关系；具体新规则仍需独立实例验证。

## 评价范围

这是一个真实 S1 smoke 的独立离线审核，不是 S0–S7 全套质量结论，也不是新推荐路径的验收。没有引用旧模型报告作为真值，没有给生成链提供参考答案。安全保守性有所体现，但事实覆盖与用户有用性未通过；下一轮应在同预算下检查是否能利用已获取的时效材料，同时保留确实无法解决的数值缺口。
