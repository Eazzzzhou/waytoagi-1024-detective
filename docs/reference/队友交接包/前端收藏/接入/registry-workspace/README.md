# 只用于素材目录检索

这是frontend-shadcn MCP的固定检索工作目录，让其他项目中的agent也能发现本库登记的三个registry。它不是业务应用；不在这里运行组件add命令。

Shadcnblocks检索使用官方仍支持的Radix兼容入口 `/r/{name}`，避免当前shadcn MCP将样式占位符固定成旧目录。需要采用组件时，把 `../registries.fragment.json` 的registries逐项合并进目标项目的components.json，由项目自己的style选正确实现，再在目标项目执行安装命令。
