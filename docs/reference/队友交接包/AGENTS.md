# 工程与协作约定

本文件根据用户在会话中提供的工程约定整理；前端收藏路径改为包内相对路径，便于跨机器交接。

## 协作

以《策划/迭代与任务派单.md》的成果要求为委托，以《策划/核查与交接规范.md》理解关键口径。执行者自主制定计划、选择方法与工具；影响他人交接、产品方向或资源需求时沟通即可。

两位队友主要承担独立核查、标注与展示口径；页面初步为有余力时的可选工作。

交付物、截止时间与验收标准由《策划/迭代与任务派单.md》固定；研究方法、工具与工作顺序自主。

## Engineering guidelines

1. Look for a suitable solution in this order: existing project code, the standard library, installed dependencies, then a new dependency. Before implementing unfamiliar or non-trivial functionality from scratch, search GitHub for comparable open-source projects with clear licenses and evidence of active maintenance. Compare their designs, version compatibility, dependencies, and known issues; prefer proven approaches and supported extension points. When reusing code, verify its provenance, license obligations, and compatibility with the project. When a new dependency is warranted, prefer reliable, secure open-source libraries. Build from scratch only when existing options cannot efficiently meet the project's requirements. Keep the search proportional to the task; do not turn a trivial helper into package research or add a dependency without a clear benefit. If research is unavailable or inconclusive, state that limitation rather than claiming an approach has been verified.
2. Choose the simplest solution that meets the requirements; avoid overengineering and speculative abstractions.
3. Always check current official API and library documentation; use version-compatible guidance rather than blindly upgrading.
4. Write only tests that provide meaningful confidence and prevent regressions; avoid redundant tests and unjustified release gates.

## 前端素材收藏

涉及前端界面、配色、插画、背景或动效素材时，读取 `前端收藏/AGENTS.md`，按任务访问对应条目；优先复用项目现有组件并核实免费范围与许可。收藏包提供选择，具体方案由执行者决定。

Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.
