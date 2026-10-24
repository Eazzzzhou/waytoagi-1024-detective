# MCP快速使用

| 服务名 | 覆盖素材 | 当前状态 |
|---|---|---|
| frontend-shadcn | React Bits、Aceternity、Shadcnblocks | 已安装；公共检索实测通过 |
| frontend-magicui | Magic UI | 已安装；公共检索实测通过 |
| frontend-21st | 21st.dev | 已配置但禁用，等待API_KEY_21ST |

新会话或重启Codex后加载新增服务。配置在 `C:\Users\qianchen\.codex\config.toml`，其余MCP保持原样；实测报告在 `mcp-verification.json`。

直接对agent说：“用frontend-shadcn找Aceternity的3D卡片”，或“用frontend-magicui搜索marquee”。它会返回真实条目、源码说明或安装命令。

shadcn MCP在 `registry-workspace` 中检索收藏目录。真正采用组件时，将 `registries.fragment.json` 合并进**目标项目**的components.json，再到目标项目安装。MCP不改变素材原有的免费/Pro权限。

21st需在[官方接入页](https://21st.dev/magic/console)取得自己的密钥，放入本机环境变量API_KEY_21ST后，再把frontend-21st的enabled改为true。密钥不放入本收藏库。当前代码获取额度为2次/日。

其他agent可参考 `mcp.portable.json`，按其客户端配置格式合并；没有自动修改其他客户端。

其他站点未核实专用官方MCP时，直接用官网代码、下载或色值。Asciify和ascii.rest的Skill/文档入口已记在数据中，不将Skill当成MCP。

官方依据：[shadcn](https://ui.shadcn.com/docs/mcp)、[React Bits](https://reactbits.dev/get-started/mcp)、[Aceternity](https://ui.aceternity.com/components/cli)、[Shadcnblocks](https://www.shadcnblocks.com/shadcn-mcp)、[Magic UI](https://github.com/magicuidesign/mcp)、[21st](https://docs.21st.dev/blog/introducing-agents-cli)。
