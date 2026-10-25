---
case_id: "<TYPE>-<NN>"
case_type: "<A|B|C>"
title: "<简短标题>"
owner: "乙丙"
created_at: null
updated_at: null
status:
  material: "未开始"
  system: "未运行"
  review: "未复核"
question_sha256: null
system_run_id: null
snapshot_id: null
snapshot_version: null
---

# <ID> · 材料与系统运行

模板不是案例；按[规范](../D1-案例规范.md)填写，复制到实际案例目录后调整规范链接为../../D1-案例规范.md。未发生的确认、运行和复核保持null／未完成。

## 1. 案例与范围

记录产品／官网、版本／套餐／地区／账号、身份依据、回答意图；研究起止、事实基准日与适用期；包含和排除的范围。

## 2. 问题

### 2.1 用户问题原话

> <实际问题，逐字保存>

记录UTF-8问题hash、提交输入清单与reference_used=false。

## 3. 原子问题

| Q-ID | 问题 | 对应C-ID |
|---|---|---|
| <ID> | <问题> | <主张> |

## 4. 检索与证据

逐次记录provider、query、calledAt、status、error、采用理由。每条E记录URL、作者／站点、发布／获取时间、版本套餐、来源／内容类型、readStatus／error、原句／译文／定位／hash、上游／独立性／分组／理由。

## 5. 主张及关系

逐C记录statement、kind、verificationStatus、reason、scope与Q；逐C/E记录关系和具体理由。冲突记录关联主张、两条不同证据、条件及解释；缺口记录类型、关联、描述和searchScope。

## 6. 系统运行

记录真实investigationId、时间、终态／stage／error；成功记录snapshotId、version、generatedAt和contractVersion。失败无快照也记录；未运行不能填造ID。

## 7. 参考与复核

参考和逐问对照写[reference.md](reference.md)，实际复核写[review.md](review.md)。本文件的结论和预期证据不能回灌系统，也不能提前给独立复核者。变更记录保留实际时间、内容和作者。
