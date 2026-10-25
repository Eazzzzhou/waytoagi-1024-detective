<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 协作与文档维护

- 先读 docs/README.md 和 docs/甲与乙丙协作边界.md；乙丙任务只在 docs/乙丙开发与验收方案.md 维护。前端后续完善由甲负责，公共 API、契约与任务通路由乙丙负责。
- README 只维护启动／验证，docs/README 维护最新状态，协作文件维护分工与约束，乙丙方案维护未完任务；实现字段以代码为准，不复制 DTO 或新增同义方案、阶段总结、验收流水账。
- 案例证据与实际确认／复核原位维护；历史署名、获取时间、问题和原句不因文档整理改造，cases/runs JSON 只追加。已看参考不能标盲评，模型不能代签人工确认。
- 调整文档后检查本地链接和标题锚点；历史通过不能写成当前通过，未接入能力不能用测试夹具冒充成功。
