# D1 运行记录约定

路径为 cases/runs/<caseId>/<runId>.json，由scripts/d1/evaluate.ts只读数据库后以wx写入；同名报错，绝不覆盖旧记录。工具不写investigation / snapshot / answer / advice。

```powershell
npm run d1:evaluate -- --case A-01 --investigation <UUID> --snapshot <UUID> --run-id <唯一ID>
```

B-01 / C-01同样运行。execution=COMPLETED表示快照评估读取已完成，不代表业务或人工验收通过；verdict为PASS / FAIL / NEEDS_HUMAN / NOT_RUN，仍需检查语义及实际复核。成功结果评估仍须同时提供真实 investigation 和 snapshot。

实际调查已失败且没有结果快照时，先保存真实状态响应或日志文件，再执行：

```powershell
npm run d1:evaluate -- --case A-01 --failed --investigation <真实UUID> --reason "实际失败原因和范围" --evidence <已保存的状态或日志文件路径> --run-id <唯一ID>
```

工具只读数据库核实调查为 FAILED、结果快照为空且问题与案例一致；保存实际 ID、状态、阶段、错误、提交／完成时间，以及证据文件路径和 SHA-256。文件须存在且非空，并保留供复核；hash 不代替原始材料，文件不得含凭据。`execution=FAILED`、`verdict=FAIL`，不生成快照或回答，不算成功对照。无真实调查 ID／无数据库记录的提交错误保留在 case.md 的实际运行处，不用 NOT_RUN 冒充未执行，也不造 ID。

默认 run-id 含时间与随机 UUID；显式同名仍以 wx 拒绝。退出码：0 表示记录成功且无 FAIL（不代表人工验收），2 表示已保存 FAIL／实际失败记录，1 表示参数、读取或写入失败。失败模式不可提供 --snapshot，不能与 --not-run 混用；待处理／运行中／成功状态不能记为无快照失败。d1-run/1 新增可选 failure 字段及 FAILED execution，历史记录无需改写，评估器版本为 0.1.3。

未运行时使用 --not-run --reason <具体原因>；NOT_RUN没有调查／快照，不代指已运行失败。

snapshot / answers是运行时只读副本，权威数据仍在数据库；referenceSha256绑定当时参考文件，参考变化后不得将旧记录冒充新对照。review默认NOT_REVIEWED，只能关联实际参与者的意见，不自动产生独立复核。

本轮正式记录：[A-01](A-01/formal-2026-10-25T07-17-01-085Z.json)、[B-01](B-01/formal-2026-10-25T07-17-01-085Z.json)、[C-01](C-01/formal-2026-10-25T07-17-01-085Z.json)。实际任务均成功生成快照，但 R4 来源元数据不完整，verdict=FAIL，独立人工复核未完成。

历史记录：[A-01](A-01/stage5-A-01-NOT_RUN.json)、[B-01](B-01/stage5-B-01-NOT_RUN.json)、[C-01](C-01/stage5-C-01-NOT_RUN.json)。三份为当时的 NOT_RUN 申明，不覆盖；历史 owner／版本／hash 保留，测试夹具不能写入本目录。
