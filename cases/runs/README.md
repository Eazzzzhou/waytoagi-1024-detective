# D1 运行记录约定

路径为 cases/runs/<caseId>/<runId>.json，由scripts/d1/evaluate.ts只读数据库后以wx写入；同名报错，绝不覆盖旧记录。工具不写investigation / snapshot / answer / advice。

```powershell
npm run d1:evaluate -- --case A-01 --investigation <UUID> --snapshot <UUID> --run-id <唯一ID>
```

B-01 / C-01同样运行。execution=COMPLETED表示评估读取已完成，不代表业务或人工验收通过；verdict为PASS / FAIL / NEEDS_HUMAN / NOT_RUN，仍需检查语义及实际复核。当前CLI要求真实investigation和snapshot同时存在，失败无快照时先在case.md保留真实ID／错误，工具补齐任务见[乙丙方案](../../docs/乙丙开发与验收方案.md)。

未运行时使用 --not-run --reason <具体原因>；NOT_RUN没有调查／快照，不代指已运行失败。

snapshot / answers是运行时只读副本，权威数据仍在数据库；referenceSha256绑定当时参考文件，参考变化后不得将旧记录冒充新对照。review默认NOT_REVIEWED，只能关联实际参与者的意见，不自动产生独立复核。

现有记录：[A-01](A-01/stage5-A-01-NOT_RUN.json)、[B-01](B-01/stage5-B-01-NOT_RUN.json)、[C-01](C-01/stage5-C-01-NOT_RUN.json)。三份为历史NOT_RUN申明，未执行正式调查，不是实际失败运行记录。历史owner／版本／hash保留；测试夹具不能写入本目录。
