# D1 评估运行记录

这里保存 `scripts/d1/evaluate.ts` 生成的运行记录。每个文件一次运行，只追加，不覆盖。

## 文件约定

- 路径：`cases/runs/<caseId>/<runId>.json`。
- 写入使用 `flag: "wx"`；同名文件已存在时工具报错，不覆盖旧记录。
- `execution`：
  - `COMPLETED`：读取到真实 investigation、终态、snapshot 和 answers。
  - `NOT_RUN`：系统模块未接入；没有 investigation/snapshot，不得用模拟结果代替。
- `verdict`：`PASS`／`FAIL`／`NEEDS_HUMAN`／`NOT_RUN`。
- `snapshot` 与 `answers` 是运行当时的只读副本；权威数据仍在数据库，评估器不写 investigation/snapshot/answer/advice。
- `case.referenceSha256` 绑定当时的人工参考文件；参考文件变化后不能把旧运行当成新参考的对照。
- `review` 默认 `NOT_REVIEWED`；工具不代替丙写复核意见。

## 已有记录

| 案例 | 记录 | 状态 |
|---|---|---|
| A-01 | [stage5-A-01-NOT_RUN.json](A-01/stage5-A-01-NOT_RUN.json) | NOT_RUN |
| B-01 | [stage5-B-01-NOT_RUN.json](B-01/stage5-B-01-NOT_RUN.json) | NOT_RUN |
| C-01 | [stage5-C-01-NOT_RUN.json](C-01/stage5-C-01-NOT_RUN.json) | NOT_RUN |

三份记录都因为正式 `InvestigationHandler` 返回 `unavailable("investigation orchestration")` 而未产生调查或快照。没有任何模拟系统答案。

## 真实运行（接入后）

```powershell
npm run d1:evaluate -- --case A-01 --investigation <UUID> --snapshot <UUID> --run-id <唯一ID>
```

工具只读 `InvestigationRepository`、`answer` 和 `advice` 表；不会创建、更新或删除调查、快照、回答或建议。

## 测试数据

单元测试使用 `tests/fixtures/snapshot.ts` 的明确测试夹具；测试夹具不会写到这里，也不会进入正式源码或用户界面。`cases/runs/` 只保存真实案例的运行记录。
