---
name: 案卷
description: 暖白档案馆：香槟金线稿建筑与炭墨衬线编辑版式
colors:
  ground: "#fefefc"
  surface: "#f7f6f3"
  surface-hover: "#f0efeb"
  paper: "#ffffff"
  border: "#e5e1db"
  border-soft: "#eeebe5"
  rule: "#efede8"
  border-focus: "#d2bea4"
  control: "#cfc9bf"
  ink: "#292930"
  muted: "#747680"
  gold: "#c4a16e"
  gold-soft: "#f2eadf"
  gold-deep: "#8c632c"
  sage: "#8ea79b"
  sage-soft: "#e7ece6"
  sage-deep: "#3e5a4b"
  negative: "#a33f47"
  negative-surface: "#f7e7e8"
  warning: "#8c632c"
  warning-surface: "#f6ecdd"
  positive: "#3b7655"
  positive-surface: "#e4efe8"
typography:
  headline:
    fontFamily: "Cormorant Garamond, 'Noto Serif SC', Georgia, 'Songti SC', 'STZhongsong', 'SimSun', serif"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.18em"
  title:
    fontFamily: "Cormorant Garamond, 'Noto Serif SC', Georgia, 'Songti SC', 'STZhongsong', 'SimSun', serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.55
  section:
    fontFamily: "Cormorant Garamond, 'Noto Serif SC', Georgia, 'Songti SC', 'STZhongsong', 'SimSun', serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist, 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif"
    fontSize: "15px"
    lineHeight: 1.7
  reading:
    fontFamily: "Geist, 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif"
    fontSize: "16px"
    lineHeight: 2
  label:
    fontFamily: "Geist, 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif"
    fontSize: "12px"
  code:
    fontFamily: "'Geist Mono', monospace"
    fontSize: "12px"
rounded:
  inline: "6px"
  control: "10px"
  card: "12px"
  capsule: "999px"
spacing:
  compact: "8px"
  gap: "16px"
  section: "24px"
  pad: "28px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#fdfdfb"
    rounded: "{rounded.capsule}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.capsule}"
    height: "44px"
  nav-action:
    backgroundColor: "{colors.paper}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.capsule}"
    height: "40px（移动端 44px）"
  status:
    backgroundColor: "{colors.sage-soft}"
    textColor: "{colors.sage-deep}"
    rounded: "{rounded.capsule}"
    padding: "4px 14px"
  citation:
    backgroundColor: "{colors.sage-soft}"
    textColor: "{colors.sage-deep}"
    rounded: "{rounded.inline}"
    size: "26px"
  quotation:
    borderLeft: "2px solid {colors.gold}"
    backgroundColor: "{colors.gold-soft}"
    rounded: "0 8px 8px 0"
---
# Design System: 案卷（第四版 · DesignArena 暖白档案馆）

## Overview

**Creative North Star: "暖白纸面上的金色档案馆"**

Neo-Classical Minimalism × Premium Editorial × Modern AI Interface：大面积暖白留白与中心对称构图，炭墨衬线品牌标题，香槟金细线承担装饰秩序，鼠尾草绿承担链接与辅助语义，语义三色独立表达状态。首页是一处弧形知识论坛——原创 SVG 环形柱廊（椭透视双翼、檐上鎏金顶珠雕像、环形阶梯广场、中央拱亭）承托居中的印章徽记与提问卡；详情页是同一纸面上的研究档案版式。

品牌徽记为「案」字金环印章（档案馆钤印意象），章节序数用汉字壹—伍/壹贰叁（内容确为顺序流程与装订章节），不使用阿拉伯数字编号与按钮箭头等生成页通用痕迹。

Source provenance: extracted from `src/app/globals.css` and the fully rewritten `src/components/investigation/workbench.module.css`（Revision 4, 2026-10-25，依据用户 DesignArena 视觉指令与《Stitch前端模板需求文档》）。fonts 与配色按用户简报钉死执行；frontend-design skill 的"暖白+衬线+金"默认脸预警因简报明示而不适用，差异化依赖题材元素（印章、汉字序数、弧形论坛）。历史第二/三版记录见 docs/ 阶段文档。

## Colors

### Paper
`#FEFEFC` 暖白地面承托 `#FFFFFF` 纸面与 `#F7F6F3/#F0EFEB` 暖灰填充；`#E5E1DB/#EEEBE5/#EFEDE8` 三级细线分离结构，`#D2BEA4` 聚焦边框。

### Ink
`#292930` 炭墨标题正文，`#747680` 次级文字（对比度 ≥4.5:1）。主按钮为炭墨胶囊，hover `#3D3D47`。

### Gold（装饰）
`#C4A16E` 线稿与徽记、`#F2EADF` 柔和填充、`#8C632C` 深金（同时用于官方宣称标签与聚焦环）。金色永不承载状态语义；`#8C632C` 在白底 4.6:1，满足聚焦指示对比。

### Sage（链接与辅助）
`#8EA79B/#E7ECE6` 辅助面，`#3E5A4B` 深鼠尾草用于链接、引用胶囊文字（≥6:1）与 PENDING/RUNNING 状态。

### Semantic
`#3B7655/#E4EFE8` 成功、`#8C632C/#F6ECDD` 警示（含官方宣称）、`#A33F47/#F7E7E8` 失败，成对使用且始终伴随文字；内容性质标签：官方宣称金褐、使用者报告深鼠尾草，与核查判断分列。

**The Saved Meaning Rule.** 状态颜色只解释已保存的语义；来源身份、读取成功和证据成立分别表达。金色不参与状态表达。

## Typography

展示衬线栈 `Cormorant Garamond → Noto Serif SC → Georgia → 宋体族`，正文 `Geist → Noto Sans SC → 雅黑/苹方`，技术信息 Geist Mono——**零字体下载**，未打包 Noto/Cormorant 字体文件（避免庞大依赖），命中系统已装字体或回退；如需逐字节还原可后续加 @fontsource 子集。首页「案卷」clamp(40–56px)、字距 0.18em；副题 14px/字距 0.34em；详情问题标题 34px 衬线；章节标题 26px 衬线＋金色汉字序数；正文 15px，长回答 16px/行高 2/72ch；元数据 12px tabular-nums。标题使用 text-wrap: balance。

## Layout

顶部 72px 吸附条（≤1100px 68px、≤640px 64px）：印章＋衬线字标、定位语（≤1100px 隐藏）、白胶囊「发起调查」（`/#question`）、本地工作区标签（≤640px 隐藏）；跳过链接达 `#main`。

首页单列居中（max 760px）：印章徽记 → 大标题 → 副题 → 引导语 → 640px 提问卡 → 三枚流程胶囊（壹提出问题 → 贰查看真实状态 → 叁沿引用复核）→ 诚实版本说明；底部弧形论坛场景 `clamp(240px, 42vh, 440px)`，顶部轻柔渐隐，pointer-events none，≤640px 退为 150px 低对比局部。载入时一组 520–560ms 交错上浮（减少动效偏好下全部移除）。

详情 1240px 版心：衬线问题 H1 → 语义状态胶囊＋阶段＋最后读取时间＋可展开执行记录（创建/开始/结束/更新＋调查 ID）→ 结果文档（40–44px 内边距，正文列＋192px 吸顶阅读目录，48px 列距）；≤800px 目录转为正文上方横排，≤640px 单列 16px 边距。全部宽度保持 min-width:0 与 overflow-wrap:anywhere。

## Elevation & Depth

默认无阴影；唯一阴影是提问卡在建筑场景上的两层极弱投影。焦点为 3px 深金描边（偏移 3px）；输入框聚焦为金边框＋金色柔环（等价焦点指示）。文内定位目标保持 2px 金描边＋金柔底＋900ms 定位动画；胶囊与按钮 160–180ms 过渡；全局减少动效规则移除全部动画。

## Shapes

主/次按钮、导航、状态徽章、目录链接为胶囊（999px）；输入框 10px；引用角标 6px；卡片 12px。引文块为金色左边线＋`#F2EADF` 底＋非对称圆角。流程序数徽章为 26px 金柔底圆。

## Components

### Buttons
主按钮炭墨胶囊（44px、字重 600、无箭头图标），hover 深炭；次按钮白胶囊 hover 金柔底。按压下移 1px；禁用暖灰＋原因文字。提交中按钮文案变为「正在提交…」并锁定重复提交。

### Inputs
暖灰底（`#F7F6F3`）、`#E5E1DB` 边框、10px 圆角；hover 边框转 `#D2BEA4`，聚焦加金色柔环并转纸白底；校验失败转红并经 aria-describedby 关联错误。提问区 16px/行高 1.9/最小 148px（移动 14px/148px）。标签在输入框外，帮助文字与字数计数同行。

### Status badges
PENDING/RUNNING 鼠尾草、AWAITING_CONFIRMATION 琥珀、SUCCEEDED 绿、FAILED 红、CANCELLED 暖灰；主张核查与来源读取状态各有独立配色（争议/失败红、证据不足琥珀、官方宣称金褐、使用者报告深鼠尾草）。徽章永远文字＋颜色并用。

### Citations and disclosures
正文引用为鼠尾草胶囊角标（26px，移动端 44px 触控），锚点严格使用快照命名空间；目标金柔底＋金描边＋定位动画。折叠摘要 44px。章节序数（壹—伍）为金色衬线字＋渐隐金线，纯装饰（aria-hidden）。

### The forum scene
原创 SVG 弧形论坛（1440×460）：环形阶梯广场（五层椭圆）、约 17 根沿椭圆弧透视排列的凹槽柱（远端短、近侧高）、弯曲檐口与檐上矮墙、瓶形雕像＋金色顶珠、中央拱亭（双层拱圈＋藻井＋鎏金拱心石与圆徽）。暖灰线稿（#D8D2C6 系）＋白/暖灰填充，金色仅限拱心石、顶珠与广场心徽。aria-hidden、无交互、顶部渐隐。

## Do's and Don'ts

### Do:
- Do 保留「案卷」名称、印章徽记、零下载字体栈与系统中文回退。
- Do 使用真实状态文字、44px 触控目标、可见金色焦点、长 URL 换行与快照命名空间锚点。
- Do 窄屏将目录移到正文上方、元数据单列、建筑退为低对比局部。
- Do 金色只用于线稿、序数、引文边线与徽记，保持克制。

### Don't:
- Don't 用金色、官方身份或读取成功的颜色暗示主张已被证明。
- Don't 虚构菜单、指标、进度、来源或调查结果；PROVIDER_NOT_CONFIGURED 必须如实呈现。
- Don't 用同质卡片替代连续阅读，或恢复侧栏后台模板。
- Don't 让建筑遮挡输入区与证据；不引入大型动画/字体/WebGL 依赖。
