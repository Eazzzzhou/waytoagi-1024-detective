# 元宝搜索 / Tencent Yuanbao Search (wsa, product 1806) — API 事实清单

> 只记录官方文档可验证的事实。每条断言后附来源编号，来源表见文末。
> `[未文档化]` = 官方文档未提及；`[推断]` = 由文档事实推导，非原文。

抓取时间：2026-10-24。文档最近更新时间（各页自述）：SearchPro 接口页 2026-10-20 02:26:15 [D1]；API 概览 2026-09-21 [D4]；计费 2026-10-09 [D7]。

---

## 1. 端点（Endpoints）

### 1.1 只有**一个**搜索接口：`SearchPro`

| 项 | 值 | 来源 |
|---|---|---|
| 接口名 | `SearchPro`（"元宝搜索"） | [D1][D4] |
| 版本 | `2025-05-08` | [D1] |
| 产品简称 | `wsa` | [D1][D10] |
| 是否还有 web/news/image/video 独立接口 | **没有**。产品 1806 的完整文档目录中，"搜索相关接口"下只有 `SearchPro` 一个 API | [D4] + 目录枚举 [D18] |

[推断] 新闻/图片/视频检索要靠 `Industry=news`、`Mode`、返回体里的 `pics` 字段实现，不存在独立的垂类检索端点。

### 1.2 两种接入方式、两个域名（关键）

| 差异项 | 方式一：腾讯云标准方式（AK/SK） | 方式二：服务 API KEY 方式 |
|---|---|---|
| 服务域名 | `wsa.tencentcloudapi.com` | `api.wsa.cloud.tencent.com` |
| 路径 | `POST /`（Action 走 Header） | `POST /SearchPro` |
| Auth Header | `Authorization: TC3-HMAC-SHA256 Credential=.../wsa/tc3_request, SignedHeaders=content-type;host, Signature=...` + `X-TC-Action` / `X-TC-Version` / `X-TC-Timestamp` | `Authorization: Bearer sk-****` |
| 鉴权体系 | 腾讯云 CAM | 元宝搜索服务自行鉴权 |

来源：接入方式对比表 [D3]；AK/SK 公共参数格式 [D10]；API KEY 方式 `POST https://api.wsa.cloud.tencent.com/SearchPro`、`Authorization: Bearer sk-209b****e23d`、`Content-Type: application/json; charset=UTF-8` [D2]。

API KEY 方式的完整可运行最小示例（官方 Python 代码，`http.client.HTTPSConnection`）：

```python
secret_key = os.getenv("TENCENTCLOUD_WSA_APIKEY")
host, uri = "api.wsa.cloud.tencent.com", "/SearchPro"
headers = {"Authorization": "Bearer " + secret_key,
           "Content-Type": "application/json; charset=utf-8"}
# body: '{"Query":"三星堆的由来"}'
```
来源：[D2]（其中环境变量名即为 `TENCENTCLOUD_WSA_APIKEY`）。

### 1.3 标准方式的地域域名

`wsa.tencentcloudapi.com` 为就近接入（仅非金融区）；可指定 `wsa.ap-guangzhou|ap-shanghai|ap-nanjing|ap-beijing|ap-chengdu|ap-chongqing|ap-hongkong|ap-singapore|ap-jakarta|ap-bangkok|ap-seoul|ap-tokyo|na-ashburn|na-siliconvalley|sa-saopaulo|eu-frankfurt.tencentcloudapi.com`，金融区另有 `ap-shanghai-fsi` / `ap-shenzhen-fsi`。方法支持 POST（推荐）/GET，UTF-8。来源：[D9]。

`Region` 参数：SearchPro **不需要**传（文档明写"本接口不需要传递此参数"）[D1]。

---

## 2. 请求参数（完整列表）

### 2.1 SearchPro 入参（逐字摘自 [D1]）

| 参数 | 必选 | 类型 | 说明 / 取值范围 |
|---|---|---|---|
| `Action` | 是 | String | 固定 `SearchPro`（标准方式下为公共参数） |
| `Version` | 是 | String | 固定 `2025-05-08` |
| `Region` | 否 | String | 不需要传 |
| `Query` | **是** | String | 搜索词，示例 `今天北京的天气` |
| `Mode` | 否 | Integer | 0=公开网页信源结果（默认）；1=优质权威垂直信源结果；2=混合结果。**极速版不支持**。旗舰版在 mode=0 时仍会额外返回一部分"优质权威垂直信源"结果 |
| `Site` | 否 | String | 指定网址搜索：`Site=qq.com`，**每次仅支持一个域名**；排除：`Site=exclude:qq.com\|sohu.com`，**最多排除 5 个域名**。与 `Mode` 同用时只对公开网页结果生效，对 VR 卡不生效。示例值 `zhihu.com` |
| `Cnt` | 否 | Integer | **10/20/30/40/50** 五档，只能取这五个值。**极速版不支持** |
| `Industry` | 否 | String | `gov`/`news`/`acad`/`finance`。**极速版不支持** |
| `Freshness` | 否 | String | 时效范围，五种形态不可混用（详见 §6） |
| `Deeplinks` | 否 | Boolean | 返回附件子链（仅旗舰版），单个 doc ≤10 条，默认不返回 |

### 2.2 明确**不存在**的参数（对赛道很关键）

| 需求 | 结论 |
|---|---|
| `top_n` / `limit` | 不存在；条数字段名是 `Cnt`，且是**枚举值**而非任意整数 [D1] |
| 安全搜索 / safe search / 内容过滤 | [未文档化]，参数表无此项 [D1] |
| 去重 / dedup / 聚合开关 | [未文档化] [D1] |
| 让接口直接生成答案 / summary / answer 参数 | [未文档化]。接口**不返回合成的 LLM 答案**，只返回 `passage`（抽取式标准摘要）与 `content`（动态摘要）[D1] |
| 时间参数 `FromTime`/`ToTime` | **2026-08-19 已删除**，改用 `Freshness` [D11] |
| 排序参数（按时间/热度） | [未文档化]；无排序入参 [D1] |

### 2.3 自然语言 query

`Query` 文档只写"搜索词"，示例为 `今天北京的天气`（自然语言句）[D1]；官方宣传称可解析口语、多语种混用、错别字、指代不明 [D15]。**长度上限**：官方 MCP 文档写明"UTF-8 字节数不超过 1500（约 500 个中英文字符）"[D13]；REST 接口页未写长度限制 [D1] — 视为同一后端约束。

### 2.4 标准方式下的 HTTP 限制（通用，非本接口专属）

GET 请求包 ≤32KB；POST + 签名 v1 ≤1MB；POST + 签名 v3 ≤10MB [D9]。

---

## 3. 响应结构（Response schema）

### 3.1 顶层（[D1] §3 输出参数）

| 字段 | 类型 | 说明 |
|---|---|---|
| `Query` | String | 原始查询语 |
| `Pages` | **Array of String** | 每条结果是**一个 JSON 字符串**，需二次 `JSON.parse`（示例值为 `["{\"passage\":\"aaa\"}", ...]`） |
| `Version` | String | 用户版本 `lite`/`standard`/`flagship`（2026-01-16 新增出参）[D1][D11] |
| `Msg` | String | 提示信息，示例 `hit black query` |
| `RequestId` | String | 唯一请求 ID |

> **实现要点**：`Pages[i]` 是字符串不是对象，必须 `JSON.parse(JSON.parse(body).Response.Pages[i])`。[推断，依据 D1 类型声明]

### 3.2 单条结果（`Pages[i]` 解析后的字段，逐字摘自 [D1]）

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | String | 结果标题 |
| `date` | String | **内容发布时间** |
| `url` | String | 内容发布源 url |
| `passage` | String | 标准摘要（三版本都返回） |
| `content` | String | 动态摘要（**极速版不返回**） |
| `site` | String | 网站名称，部分不知名站点可能为空 |
| `score` | Float | 相关性得分 0～1，越接近 1 越相关 |
| `authority_level` | Integer | 权威度 0～5（**仅旗舰版**） |
| `pics` | Array | 图片列表，单个 doc 0～10 条：`caption`（图片描述）、`origin_url`（源图 url） |
| `favicon` | String | 网站图标，部分站点可能为空 |
| `deeplinks` | Array | 附件子链，≤10 条（仅旗舰版，由 `Deeplinks=true` 控制）：`title`、`url` |

### 3.3 字段级结论（针对侦探赛道）

| 想要的信息 | 有无 | 依据 |
|---|---|---|
| 发布时间 | **有**，`date` | [D1] |
| 来源站点名 | **有**，`site`（可能为空）+ `favicon` + `url` 域名 | [D1] |
| 作者 / 账号名 | **没有** | 字段表无 author 类字段 [D1] |
| 阅读/点赞/评论/热度信号 | **没有** | 字段表无任何 engagement 字段 [D1] |
| 图片 | **有**，`pics[].origin_url` + `caption`（标准/旗舰版） | [D1] |
| 带引用的合成答案 | **没有**。只有抽取式 `passage` / `content` | [D1] |
| 权威度打分 | 有，`authority_level`（仅旗舰版） | [D1] |
| 相关性打分 | 有，`score` | [D1] |

### 3.4 文档内部不一致（实测前必须防）

1. **图片字段名**：SearchPro 接口页写作 `pics` [D1]；API KEY 方式页的样例返回里写作 `"images":[]` [D2]。
2. **`date` 格式**：SearchPro 页样例 `"2025/02/26 09:37:00"`（斜杠）[D1]；API KEY 页样例 `"2024-09-03 13:06:46"`（短横线）[D2]。
3. **索引规模**：产品页/发布文章称"千亿级"[D14][D15]，MCP 页称"百亿索引内容库"[D13]。

[推断] 解析器必须同时兼容 `pics`/`images` 与两种日期分隔符；`date` 时区未在文档中声明 → `[未文档化]`。

---

## 4. 限制、配额与价格

### 4.1 并发与延迟

| 项 | 值 | 来源 |
|---|---|---|
| QPS | 极速版 20 / 标准版 20 / 旗舰版 **5** | [D8] |
| 平均时延 | 600–800ms，P99 约 1200ms | [D8] |
| 最快响应 | "最快 300ms 返回结果"（边缘缓存） | [D6][D14] |
| 限频维度 | API + 接入地域 + 子账号 | [D4] |
| 超时 | [未文档化]（无接口级 timeout 承诺；SLA 正文在单独页面，本页仅给链接）[D8][D19] |  |

### 4.2 单次结果数

`Cnt` = 10/20/30/40/50，且极速版不支持该参数 [D1]；产品功能矩阵写"结果返回条数 5～10 条"，标准/旗舰"支持扩充至50条"[D6][D14]。→ 默认约 5–10 条，最大 50 条/次。

### 4.3 价格（按量，元/千次，日结、次日出账）

| 版本 | 价格 | 限制 |
|---|---|---|
| 极速版 lite | 14 元/千次 | 无 Mode/Cnt/Industry/图片/动态摘要 |
| 标准版 standard | 20 元/千次 | 无 authority_level / deeplinks |
| 旗舰版 flagship | 26 元/千次 | **仅限企业用户开通** |

来源：[D7]。资源包（预付费，有效期 1 年，不叠加、按购买顺序抵扣，调用失败不计费）：5 万次 950 元；100 万次 18,500 元；1000 万次 175,000 元 [D7]。

### 4.4 免费额度

- 官方文档（MCP 页）只说"登陆元宝搜索-活动专区页面，查看免费额度发放规则，具体规则以页面信息为准"，**未在文档中写明数额** [D13]。
- 腾讯云开发者社区官方发布文（产品团队发布稿，2026-10-21）写明："现在接入元宝搜索，可享 **2000 次免费调用额度/月**" [D15]。
- 计费文档中没有"免费额度"条目 [D7] → 免费额度属**限时活动**，以控制台活动页 `console.cloud.tencent.com/wsapi/activity` 为准 [D13][D16]。

### 4.5 其他运维事实

- 版本切换生效约 5 分钟，30 分钟内仅可切换一次 [D17]。
- 错误码：`InternalError` / `InvalidParameter` / `RequestLimitExceeded` / `ResourceNotFound`（未开通）/ `ResourceUnavailable`（欠费）/ `UnauthorizedOperation`（KEY 错）[D1][D2]。
- 子账号需主账号在 CAM 授权 WSA 全读写；每个 subuin 最多同时持有 **3 个** API KEY，明文只在创建时显示一次 [D2]。

---

## 5. 内容覆盖（含 UGC 平台）

### 5.1 文档原话

- "以**互联网全网公开资源**为基础，**叠加腾讯优质内容生态**"[D1][D6]。
- 生态具体列举："包括**腾讯新闻、搜狗百科、企鹅号**等内容"[D6][D14]。这是文档中唯一点名的一串平台。
- "千亿级别网页索引资源" / "千亿级索引"[D12][D15]；MCP 页写"百亿索引内容库"[D13]。
- 权威信源："接入金融、医疗、法律、出行等 **13 个垂直行业**的 **157 个权威信源**，包括申万宏源、携程、飞常准、腾讯医典、腾讯地图等"；"A股、港股、美股、日股、韩股财报收录覆盖率达 99% 以上"[D15]。
- "信息自动去噪"[D6][D13]；入库前按站点/账号/页面三层评估质量、过滤低质内容 [D15]。

### 5.2 逐平台核对

| 平台 | 文档是否声称覆盖 | 依据 |
|---|---|---|
| 腾讯新闻 | **是**（点名） | [D6][D14] |
| 搜狗百科 | **是**（点名） | [D6][D14] |
| 企鹅号 | **是**（点名，且 API KEY 样例返回 `site: "企鹅号"`） | [D6][D2] |
| 知乎 | `[未文档化]` — 仅作为 `Site` 参数示例值 `zhihu.com` 出现（示例值≠覆盖承诺） | [D1][D13] |
| 微信公众号 | **明确不支持**："由于内容版权问题，元宝搜索暂不支持微信公众号内容" | [D8] |
| 小红书 / B站 / 微博 / V2EX / 掘金 / CSDN / X / Reddit / Hacker News / GitHub | 全部 `[未文档化]`。文档只做"全网公开资源"的整体声明，未逐站点承诺 | [D1][D6][D13][D15] |

### 5.3 结论（对产品决策）

- 官方**没有任何一句**承诺覆盖知乎/小红书/V2EX/掘金/CSDN 等开发者 UGC；只有"全网公开资源"这一笼统表述 [D6]。
- **公众号确定拿不到** [D8] — 中文技术圈大量一手内容在公众号，这是硬缺口。
- 因此"真实评价 vs 营销话术"这类判断必须**自己算**，接口只提供标题/摘要/URL/时间/站点/相关性分/权威度分，没有互动数据 [D1]。
- 验证路径：用 `Site=zhihu.com|v2ex.com|juejin.cn` 各发一次请求实测命中率（文档层面无法判定）。

---

## 6. 时效性（Freshness）

### 6.1 收录延迟

- 官方表述："**分钟级更新**"，可实时获取政策更新、新闻动态、天气变化、实时行情 [D6][D14]；发布稿："支持政策、新闻、天气、行情等内容实现分钟级更新"[D15]。
- 更细的"发布→可检索"SLA：`[未文档化]`。

### 6.2 `Freshness` 参数语义（逐字，[D1]）

| 形态 | 含义 | 边界 |
|---|---|---|
| `d[N]` | 最近 N 天 | N=1–30 整数，空则 N=1 |
| `m[N]` | 最近 N 月 | N=1–12，空则 N=1 |
| `y[N]` | 最近 N 年 | N=1–5，空则 N=1 |
| `yyyy-mm-dd` | 指定某一天 | ≥1970-01-01，≤请求当天 |
| `yyyy-mm-dd,yyyy-mm-dd` | A 到 B（含端点） | 均 ≥1970-01-01、≤请求当天 |

- 五种形态**不可混用**；枚举示例值：`d7`、`m3`、`y2`、`2026-08-20`、`2026-08-20,2026-08-30` [D1]。
- 相对时间按"自然日/月/年"切分，不是滚动窗口。文档示例（原文，注意其自相矛盾处）："2026.6.15 分别传参 d2/m2/y2 …… 时间范围分别为'2026.6.15、2026.6.14'/'2026.6、2026.5'/'2026、2025'"——`y2` 在该例中只落到 2026/2025 两年 [D1]。MCP 页示例则是 `d7`→"2026.6.10-2026.6.4"、`y1`→"2026"[D13]。
- 极速版**支持**该参数（功能矩阵"指定时间范围检索 ✅"）[D6]。
- 返回体中对应字段为 `date`（内容发布时间）[D1]。

---

## 7. Skill / MCP

### 7.1 MCP（官方，腾讯云 MCP 广场）— 结构清晰，可直接接

| 项 | 值 |
|---|---|
| 服务地址 | `https://api.wsa.cloud.tencent.com/Mcp` |
| 方法 / 协议 | `POST`，JSON-RPC 2.0 over **Streamable HTTP**，MCP 协议版本 `2025-6-18` |
| 鉴权 | Header `Authorization: Bearer YOUR_WSA_API_KEY` |
| 工具数 | **1 个**：`SearchPro`（入参与 REST 一致：Query/Site/Mode/Freshness/Cnt/Industry；`Query` ≤1500 UTF-8 字节） |

配置（文档原样，无需安装）：

```json
{"mcpServers":{"yuanbao-websearch-mcp":{"type":"streamableHttp",
 "url":"https://api.wsa.cloud.tencent.com/Mcp",
 "headers":{"Authorization":"Bearer YOUR_WSA_API_KEY"}}}}
```
来源：[D13]。

### 7.2 Skill（SkillHub 上架）

- 上架页：`skillhub.cloud.tencent.com/skills/tencent-yuanbao-standard-search`，标识 `@user_f26e0ccb/tencent-yuanbao-standard-search`，名"（元宝）联网搜索Skill"[D16]。该页正文为前端渲染，抓取仅得到标题/描述。
- 社区镜像（同源 SKILL.md 文本，作者标注"腾讯开源"）：`openclaw skills install @tencent-adm/tencent-yuanbao-standard-search`[D20]；API KEY 以环境变量 `TENCENTCLOUD_WSA_APIKEY` 注入，调用形式为 `python3 scripts/websearch.py --query="..." [--site=...] [--freshness=day|week|month|year] [--mode=2]`，输出 markdown [D20]。
- 说明：SkillHub 页与镜像均**未**出现在 1806 产品文档目录内 [D18]；Skill 的权威形态以 SkillHub 页面为准，`[推断]` 其底层即调用 §1.2 的 `/SearchPro`。

---

## 8. 对赛道（侦探赛道 / 少点幻觉多点搜索）的硬约束汇总

| 能力 | 结论 | 一句话依据 |
|---|---|---|
| 站点过滤 | ✅ `Site=example.com`，单站点包含；`exclude:` 最多 5 个 | [D1] |
| 时间过滤 | ✅ `Freshness`：相对 d1-30/m1-12/y1-5 或绝对日期/区间 | [D1] |
| 返回发布时间 | ✅ `date`（格式两种，需兼容） | [D1][D2] |
| 返回热度/互动 | ❌ 完全没有；只有 `score`(0-1) 与 `authority_level`(0-5, 旗舰版) | [D1] |
| 合成答案+引用 | ❌ 只有抽取式摘要 `passage`/`content` | [D1] |
| 开发者 UGC 覆盖 | `[未文档化]`；公众号明确不支持 | [D8] |
| 单次条数 | 10/20/30/40/50 | [D1] |
| QPS / 延迟 | 20 / 20 / 5 QPS；均值 600–800ms，P99 1.2s | [D8] |
| 成本 | 14 / 20 / 26 元每千次；2000 次/月免费（活动） | [D7][D15] |

---

## 来源

| 编号 | URL | 用途 |
|---|---|---|
| D1 | https://cloud.tencent.com/document/product/1806/121811 | SearchPro 接口（入参/出参/示例/错误码），更新于 2026-10-20 |
| D2 | https://cloud.tencent.com/document/product/1806/130615 | 服务 API KEY 方式：域名 `/SearchPro`、Bearer 鉴权、Python 示例 |
| D3 | https://cloud.tencent.com/document/product/1806/130616 | 两种接入方式对比表（域名/鉴权/场景） |
| D4 | https://cloud.tencent.com/document/product/1806/121821 | API 概览：仅 SearchPro；限频维度 |
| D5 | https://cloud.tencent.com/document/product/1806/121812 | 简介、术语、使用限制 |
| D6 | https://cloud.tencent.com/document/product/1806/121794 | 产品概述：三版本功能矩阵、四大特性（分钟级更新、腾讯生态列举） |
| D7 | https://cloud.tencent.com/document/product/1806/121798 | 计费概述：按量价、资源包、结算 |
| D8 | https://cloud.tencent.com/document/product/1806/121804 | 常见问题：QPS 20/20/5、时延 600-800ms/P99 1200ms、公众号不支持 |
| D9 | https://cloud.tencent.com/document/product/1806/121814 | 请求结构：地域域名、方法、包大小 |
| D10 | https://cloud.tencent.com/document/product/1806/121815 | 公共参数：TC3-HMAC-SHA256 Header 格式、service=wsa |
| D11 | https://cloud.tencent.com/document/product/1806/121822 | 更新历史：删除 FromTime/ToTime、新增 Freshness/Deeplinks/Cnt/Industry/Version |
| D12 | https://cloud.tencent.com/document/product/1806/121795 | 产品优势：千亿级索引、智能摘要表述 |
| D13 | https://cloud.tencent.com/developer/mcp/server/11764 | 元宝搜索 MCP：`/Mcp` 地址、streamable HTTP、工具 SearchPro、Query ≤1500 UTF-8 字节、免费额度入口 |
| D14 | https://cloud.tencent.com/product/wsa | 产品页：三版本规格与价格、毫秒级/分钟级更新、腾讯新闻/搜狗百科/企鹅号 |
| D15 | https://cloud.tencent.com/developer/article/2765522 | 腾讯云社区官方发布稿（2026-10-21）：2000 次/月免费额度、13 行业 157 信源、分钟级更新、索引/召回指标 |
| D16 | https://skillhub.cloud.tencent.com/skills/tencent-yuanbao-standard-search | SkillHub 上的元宝搜索 Skill 上架页 |
| D17 | https://cloud.tencent.com/document/product/1806/124503 | 服务管理：版本切换 5 分钟生效、30 分钟一次 |
| D18 | https://cloud.tencent.com/document/product/1806 | 产品文档目录枚举（导航 JSON）：无 Skill 文档、搜索接口仅 1 个 |
| D19 | https://cloud.tencent.com/document/product/1806/121805 | SLA 索引页（正文为外部链接，未展开） |
| D20 | https://clawhub.ai/tencent-adm/skills/tencent-yuanbao-standard-search | Skill 的 SKILL.md 文本镜像（安装命令、环境变量、脚本参数） |

## 待实测（文档无法回答）

1. 知乎/V2EX/掘金/CSDN 的实际命中率（用 `Site=` 逐个试）。
2. `date` 的时区，以及同一 query 下 `date` 缺失的比例。
3. 单条 `passage` 的字符长度分布（决定摘要能否直接展示）。
4. 极速版在 `Cnt` 不传时的确切返回条数。
5. 免费额度 2000 次/月的有效期与领取方式（需登录控制台活动页）。
