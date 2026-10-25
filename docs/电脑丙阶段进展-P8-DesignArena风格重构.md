# 电脑丙阶段进展 P8 · DesignArena 暖白风格重构

时间：2026-10-25（上海时间）。执行者：电脑丙（zcode）。接续 P7：应用户指令将视觉基线从蓝色品牌整体迁移到 DesignArena 式暖白＋香槟金＋鼠尾草系统，业务行为与契约再次零改动。

## 1. 设计 Skills 的安装与使用

- 已全局安装并通读：`frontend-design`（Anthropic）、`web-design-guidelines`（Vercel）、`vercel-react-best-practices`（Vercel 仓库中 react-best-practices 的实际名称）。安装命令按用户给定来源执行（`npx skills add … -g`），位置 `~/.agents/skills/`，未写入项目依赖。
- frontend-design 的两遍法（方案 → 通用默认自查 → 实现 → 截图自评）已执行：简报钉死的暖白＋金方向按规范"简报原文优先"照做，差异化依赖题材元素——「案」字印章徽记、汉字序数（壹贰叁/壹—伍）、弧形论坛建筑；规避其点名的按钮箭头、阿拉伯数字编号等生成痕迹（已移除主按钮箭头图标）。
- web-design-guidelines 按其要求抓取了 vercel-labs/web-interface-guidelines 最新规则并逐条自查（见 §4）。
- react-best-practices 对照 Quick Reference 检查（见 §5）。

## 2. 实际修改文件

| 文件 | 改动 |
| --- | --- |
| `src/app/globals.css` | 令牌整体迁移：暖白纸面/炭墨/香槟金/鼠尾草/语义三色新值；衬线字体栈加入 Cormorant Garamond 与 Noto Serif SC（零下载，系统回退）；基础字号 15px；新增 touch-action 与 tap-highlight；焦点环改深金 |
| `src/components/investigation/workbench.module.css` | 全量重写为暖色系统：导航、首页主视觉（印章徽记＋56px 衬线标题＋字距副题＋640px 提问卡＋流程胶囊）、炭墨主按钮、鼠尾草引用胶囊、金色引文块、暖色状态胶囊、三档响应式；≤640px 导航触控目标修至 44px（guidelines 审查发现） |
| `src/components/investigation/TempleScene.tsx` | 重绘为弧形论坛：椭圆透视环形柱廊（约 17 根）、弯曲檐口与檐上雕像（金顶珠）、环形阶梯广场、中央拱亭＋鎏金拱心石；坐标模块级计算、一位小数精度（react 规范 rendering-svg-precision / rendering-hoist-jsx） |
| `src/components/investigation/AppShell.tsx` | 徽记改为「案」字金环印章（SVG text，衬线字体族）；移除导航加号图标 |
| `src/app/page.tsx` | 首页改为印章→标题→副题→引导语→提问卡→三枚流程胶囊（壹贰叁）→建筑场景 |
| `src/components/investigation/NewInvestigationForm.tsx` | 移除主按钮箭头图标（frontend-design 指引），逻辑零改动 |
| `DESIGN.md` | 重写为第四版（暖白档案馆）设计系统 |

未改动：契约、服务端、Worker、api-client、hooks、labels、IdentityConfirmationForm、InvestigationDetail、SnapshotView、AnswerBody、全部测试。（InvestigationDetail/SnapshotView 的结构与文案自 P7 起保持，仅消费新样式类。）

## 3. 验证结果

- `npm run check`：typecheck＋lint＋77 项单元测试全部通过；`npm run build` 通过。
- 首页（dev 3000）：1440/1024/768/390 四宽度 scrollWidth === clientWidth（程序化）；印章、衬线标题、暖灰输入区、炭墨按钮、流程胶囊、弧形论坛建筑（双翼柱廊、雕像、广场椭圆）截图确认；390 单列布局正常。
- 隔离宿主（3100，随机 Schema，网络断言通过）：S06 成功页（衬线 H1＋绿胶囊＋五章＋吸顶目录＋金色引文块）、S05 身份确认（琥珀胶囊＋暖灰表单）、S08 失败（红卡＋PROVIDER_NOT_CONFIGURED＋禁用重试带原因）桌面与移动截图确认；引用点击跳转 hash 指向快照命名空间锚点且 `:target` 生效（程序化）；宿主 stop 文件优雅停止，browser_qa.cleaned。
- 场景覆盖：S01/S02/S03/S05/S06/S07/S08 浏览器实测（S07 长内容沿用隔离宿主 stress 链接渲染正常）；S04/S09/S10/S11/S12 由 77 项组件测试覆盖，未在浏览器复演，如实标注。

## 4. web-design-guidelines 自查记录

通过项：语义化标签与标题层级、跳过链接、aria-hidden 装饰图层、role=alert/status、aria-describedby 错误关联、占位符以…结尾、44px 触控（含本轮修复的移动端导航胶囊）、focus-visible 全局可见、输入聚焦等价指示（金环）、prefers-reduced-motion、transition 仅颜色/透明度/位移、无 transition: all、长词断行、锚点 scroll-margin、tabular-nums、text-wrap: balance、语言 zh-CN 与上海时区 Intl 格式。
已知取舍：`sectionKicker` 金色汉字序数为 aria-hidden 装饰（约 2.2:1），章节语义由相邻 h2 承载；输入框 focus 用等价金色柔环替代 outline（未见裸 outline-none）。

## 5. react-best-practices 自查记录

通过项：视觉层全部为服务端组件（page/AppShell/TempleScene 无 "use client"，新增客户端 JS 为零）；静态 SVG 几何在模块级计算并 hoist；SVG 坐标一位小数；无内联组件定义、无新依赖、无桶文件引入、无第三方脚本。既有 `@/contracts` 桶导出为项目原有模式，本轮未改动（记录为既有事实，不在视觉任务范围内重构）。

## 6. 已知限制与未完成项

- Cormorant Garamond / Noto Serif SC / Noto Sans SC 未打包（零下载字体栈）：本机实际渲染为系统宋体/雅黑回退，气质一致但非逐字节相同；如需精确可加 @fontsource 子集包（约数十 MB node_modules，按需决定）。
- 建筑为原创 SVG 线稿，密度与光影低于参考图的照片级渲染；如需更高写实度需引入位图素材（需合法版权来源，当前未引入，属素材缺口而非实现遗漏）。
- fullPage 截图在本环境有 sticky 拼接伪影，用超高视口/滚动分段截图替代。
- `npm run verify` 完整链未跑（test:db/runtime 需专用数据库流程；本轮不触及后端），check/build/docs:check 已过。
- 所有改动保持未提交，提交与否由用户决定。
