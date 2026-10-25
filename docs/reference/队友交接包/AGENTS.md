# 参考资料使用约定

当前开发只分甲与乙丙，前端后续完善交甲；职责见[协作边界](../../甲与乙丙协作边界.md)，乙丙任务见[执行方案](../../乙丙开发与验收方案.md)。本目录只保留资料和素材入口，不维护派单、排期或机器安装承诺。

## Engineering guidelines

1. Look for a suitable solution in this order: existing project code, the standard library, installed dependencies, then a new dependency. Before implementing unfamiliar or non-trivial functionality from scratch, search GitHub for comparable open-source projects with clear licenses and evidence of active maintenance. Compare their designs, version compatibility, dependencies, and known issues; prefer proven approaches and supported extension points. When reusing code, verify its provenance, license obligations, and compatibility with the project. When a new dependency is warranted, prefer reliable, secure open-source libraries. Build from scratch only when existing options cannot efficiently meet the project's requirements. Keep the search proportional to the task; do not turn a trivial helper into package research or add a dependency without a clear benefit. If research is unavailable or inconclusive, state that limitation rather than claiming an approach has been verified.
2. Choose the simplest solution that meets the requirements; avoid overengineering and speculative abstractions.
3. Always check current official API and library documentation; use version-compatible guidance rather than blindly upgrading.
4. Write only tests that provide meaningful confidence and prevent regressions; avoid redundant tests and unjustified release gates.

## 前端素材收藏

涉及前端界面、配色、插画、背景或动效素材时，读取 `前端收藏/AGENTS.md`，按任务访问对应条目；优先复用项目现有组件并核实免费范围与许可。收藏包提供选择，具体方案由执行者决定。

Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.
