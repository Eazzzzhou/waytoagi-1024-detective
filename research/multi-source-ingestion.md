# 多源内容接入矩阵 — B站 / 抖音 / YouTube / Reddit / HN / GitHub / V2EX / 小红书 / 知乎

> 目标：给「查一个 AI 产品好不好用」补齐 **博主测评（视频/图文）+ 开发者社区真实评价 + 优点缺点 + 热度**。
> 规则：每条结论后附来源编号；官方文档可验证的写事实，推导的标 `[INFERENCE]`，官方文档未提及的标 `[未文档化]`。
> 采集时间：2026-10-24。所有**实测**均在同一台机器上用 Node/Bun `fetch` + `yt-dlp 2026.10.21` 完成。

---

## 0. 环境说明（必须先读，否则会误判「可达性」）

本机实测时 `https://www.google.com/generate_204` → **204**、`facebook.com` → 200、`x.com` → 200，即**出口已有全局代理**。
所以下文「实测 200」只能证明**接口本身能用**，不能证明**裸大陆服务器能直连**。
「中国大陆可达」一列按 **hosting 归属 + 已知 GFW 行为**判定，并标注是否需要代理；上线前请在**真实部署机**上跑一次 `curl -o /dev/null -w '%{http_code}'` 复核。

判定依据（实测响应头）：`hn.algolia.com` → `via: 1.1 google` / `server: Google Frontend`（Google 前端，大陆被墙的高置信信号）；`hacker-news.firebaseio.com` → Firebase（Google 资产）；`api.tikhub.io`、`www.v2ex.com` → Cloudflare；`api.bilibili.com` → 自建；`open.douyin.com` → Tengine；`www.xiaohongshu.com` → openresty。

---

## 1. B站（bilibili）——**今晚可上线，第一名**

| 项 | 结论 |
|---|---|
| 最省事路径 | **① 单视频元数据：`yt-dlp -J --skip-download <url>`**（无需 cookie）。**② 站内搜索：自己算 wbi 签名打 `x/web-interface/wbi/search/type`**（无需登录，只要一个 `buvid3`）。**③ 评论：`x/v2/reply/wbi/main`**（同样 wbi 签名）。 |
| 认证 | 无。不需要 AppKey/AppSecret，不需要账号。 |
| 免费额度 | 无官方配额概念；实测无限流头。 |
| 限速/反爬 | 搜索接口**必须**带 `w_rid`+`wts` 签名与 `buvid3`，否则 `code 0` 但只回 `v_voucher`（实测）；裸 `search/type` 直接 **HTTP 412**（实测）。风控按 IP，高频会 -412。 |
| 大陆可达 | ✅ 直连（`api.bilibili.com` 自建 CDN，实测 71–157ms）。 |
| 工时 | 元数据 1.5h；wbi 搜索 1.5–2h；评论 1h。**合计 3–4h**。 |
| ToS 风险 | 用的是**未公开**的内部 Web API（非开放平台授权），违反用户协议中「不得用自动化程序访问」条款的概率高；仅展示不转存、控制 QPS 可降低风险。 |

**实测证据**（本次运行）：
```
yt-dlp -J --skip-download https://www.bilibili.com/video/BV1GJ411x7h7
→ 2393ms, BiliBili, title/upload_date=20191231/view=107610620/like=2961346/comment=238521/duration=212
```
wbi 搜索（`search_type=video&keyword=notion`）返回 10 条，字段含 `bvid / title / play / video_review / favorites / pubdate / author`，`code:0`。

**可直接抄的最小 wbi 签名（本次实测通过，Node 24）**：

```js
const TAB=[46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36';
const H={'user-agent':UA,referer:'https://www.bilibili.com/'};
const buvid3=(await (await fetch('https://api.bilibili.com/x/frontend/finger/spi',{headers:H})).json()).data.b_3;
const w=(await (await fetch('https://api.bilibili.com/x/web-interface/nav',{headers:{...H,cookie:'buvid3='+buvid3}})).json()).data.wbi_img;
const raw=w.img_url.split('/').pop().split('.')[0]+w.sub_url.split('/').pop().split('.')[0];
const mix=TAB.map(i=>raw[i]).join('').slice(0,32);
const sign=p=>{const wts=Math.floor(Date.now()/1e3);
  const q=Object.keys(p).sort().map(k=>encodeURIComponent(k)+'='+encodeURIComponent(String(p[k]).replace(/[!'()*]/g,''))).join('&');
  return q+'&wts='+wts+'&w_rid='+require('crypto').createHash('md5').update(q+'&wts='+wts+mix).digest('hex');};
// GET https://api.bilibili.com/x/web-interface/wbi/search/type? + sign({search_type:'video',keyword:'notion',page:1,page_size:10,order:'totalrank'})
// 必须带 referer: https://search.bilibili.com/ 与 cookie buvid3，否则 412 或只回 v_voucher
```

**已知坑**：`yt-dlp "bilisearch3:notion"` 直接 **HTTP 412 Precondition Failed**（实测），所以**搜索不要走 yt-dlp**，只走 wbi。2026 年 B站风控明显收紧：yt-dlp 仓库近半年 22 个 bilibili issue，含 `#17605 Bilibili view API: code -412`、`#17894 Unable to extract initial state`、`#17879 Formats not detected`、`#17847 HTTP 567` [S3]。

**注意**：单视频元数据实测稳（2.4s/次），但**批量 50+ 条要串行 + 200–500ms 间隔**，否则触发 -412。`--skip-download` 只是不写盘，仍会请求 playurl；只要元数据用 `-J`（隐含 `--simulate`）[S2]。

---

## 2. YouTube —— **今晚可上线，第二名**

| 项 | 结论 |
|---|---|
| 最省事路径 | **① 搜索 + 统计：YouTube Data API v3**（`search.list` 拿 videoId，再 `videos.list?part=snippet,statistics`）。**② 免 key 兜底：`yt-dlp -J`**（实测可用，且能拿 description 全文）。 |
| 认证 | Google Cloud 项目 + 启用 YouTube Data API v3 + API Key（浏览器 key 即可，10 分钟）。yt-dlp 不需要 key。 |
| 免费额度 | **2026 新配额模型**：`search.list` 独立桶 **100 次/天**（每次 1 单位）；`videos.insert` 独立桶 100 次/天；**其余所有端点合计 10,000 单位/天**；`videos.list` 每次 **1 单位** [S4]。太平洋时间零点重置。 |
| 限速/反爬 | API 无额外限速，只有日配额；超配额 403 `quotaExceeded`。yt-dlp 侧：YouTube 现在需要 JS 运行时（`yt-dlp-ejs` + deno/node/bun）才能完整支持 [S2]；实测本机 node 24 环境下正常。 |
| 大陆可达 | ❌ 需代理。`www.googleapis.com`、`www.youtube.com` 在大陆被墙（本机因全局代理才通）。 |
| 工时 | Data API 1h；yt-dlp 兜底 0.5h。**合计 1.5h**。 |
| ToS 风险 | Data API 合规、有官方条款，但**对缓存/存储时长、衍生数据与训练用途有限制**（逐条见 API Services Terms，需产品文案照抄其要求）[S21]。yt-dlp 抓取违反 YouTube ToS（下载视频尤其），**只取元数据**风险低但仍属灰区。 |

**关键回答：`statistics` 字段**：`videos.list?part=statistics` 返回 `viewCount / likeCount / commentCount / favoriteCount`（数值为字符串）；`part=snippet` 给 `title / description / publishedAt / channelTitle / tags / thumbnails` [S5]。
**成本**：`search.list` = 1 单位但**只给 100 次/天**；`videos.list` = 1 单位，10,000/天 → 一天可查 1 万条视频统计。所以正确姿势是：**搜索走元宝/B站/TikHub，YouTube 只用 `videos.list` 批量补统计**（一次最多 50 个 id）。

实测（免 key 路径）：`yt-dlp -J https://www.youtube.com/watch?v=dQw4w9WgXcQ` → 3393ms，title/date=20091025/view=1829918272/like=19494130/comment=2400000/desc 2376 字。`comment_count` 被平台截断为 2400000（YouTube 侧上限），不是 bug。

---

## 3. Hacker News —— **今晚可上线，第三名（零成本）**

| 项 | 结论 |
|---|---|
| 最省事路径 | **Algolia HN Search API**：`https://hn.algolia.com/api/v1/search?query=<q>&tags=story`，一条请求直接给 `title / url / points / num_comments / created_at / author / story_text`。要评论正文用 `search?tags=comment` 或 `items/<id>`。 |
| 认证 | 无。 |
| 免费额度 | 无 key、无计费。Algolia 版是第三方托管（官方合作），Firebase 版是官方。 |
| 限速/反爬 | Firebase 官方文档明写 **“There is currently no rate limit”** [S6]。Algolia 版：实测无任何 `x-ratelimit-*` 响应头 [S1]，API 页未给出硬上限；按 1–2 QPS 用没问题 `[INFERENCE]`。 |
| 大陆可达 | ⚠️ **需代理（高置信）**。`hn.algolia.com` 实测响应头 `via: 1.1 google` + `server: Google Frontend` → GCP 前端，大陆被墙；`hacker-news.firebaseio.com` 是 Firebase（Google 资产），同样大概率被墙 [S1][S6]。`news.ycombinator.com` 网页本身通常可直连 `[INFERENCE]`。 |
| 工时 | 1h（含分页、`numericFilters=created_at_i>...` 时间过滤）。 |
| ToS 风险 | 极低：公开数据、官方/官方合作 API、无 key。 |

**两个 API 的分工**：
- **Algolia**（`hn.algolia.com/api/v1/`）：**全文搜索**是它唯一的强项 → 用它做「搜产品名」。支持 `tags=story|comment|show_hn|ask_hn`、`numericFilters=points>50,created_at_i>1735689600`、`search_by_date` 端点按时间排序。
- **Firebase**（`hacker-news.firebaseio.com/v0/`）：**实时榜单/单条详情**，`topstories.json`、`item/<id>.json`（`score`/`descendants`/`kids`/`text`）。要遍历评论树得自己递归拉 `kids`，很啰嗦 [S6]。
→ **26h 内只用 Algolia**；Firebase 只在需要「今天热榜」时补一条。

---

## 4. GitHub（repo + issues）—— **今晚可上线（第 1.5 梯队）**

| 项 | 结论 |
|---|---|
| 最省事路径 | REST v3：`GET /repos/{o}/{r}` → `stargazers_count / forks_count / open_issues_count / pushed_at / description`；`GET /repos/{o}/{r}/issues?state=all&sort=created` → issue 标题/正文/`reactions`；`GET /repos/{o}/{r}/issues/{n}/comments` → 评论；`GET /search/issues?q=repo:o/r+is:issue+<kw>` → 按关键词搜 issue。 |
| 认证 | 无 token 可用；**强烈建议**加 Personal Access Token（只读 public_repo 即可，0 成本）。 |
| 免费额度 | **未认证 60 次/小时/IP**；**认证 5,000 次/小时**（实测 `/rate_limit`：`core.limit=60`，`search.limit=10`）。搜索端点单独限速：未认证 **10 次/分**，认证 **30 次/分**（code search 认证后 10 次/分）[S7][S8]。 |
| 限速/反爬 | 只有 rate limit，无反爬。触发后 403/429 + `x-ratelimit-reset`。二级限速：并发 ≤100、单端点 ≤900 点/分 [S8]。 |
| 大陆可达 | ✅ 直连（`api.github.com` 实测 805ms，`server: github.com`）；偶发慢/重置，建议超时 5s + 重试 1 次。 |
| 工时 | 1.5h（含 star 趋势用 `/repos/{o}/{r}/stargazers?per_page=1&page=N` 或 `starred_at` 头估算）。 |
| ToS 风险 | 低：官方 API + 明确配额；注意 **不要抓取用户邮箱/隐私字段**，展示 issue 原文需署名。 |

**注意**：`/search/issues` 只索引**标题+正文**，不索引评论；要评论必须走 `/issues/{n}/comments`。`open_issues_count` 含 PR，要精确数得用 `?state=open&per_page=1` + `Link` 头翻页。

---

## 5. V2EX —— **今晚可上线（第 1.5 梯队）**

| 项 | 结论 |
|---|---|
| 最省事路径 | **API 1.0（只读、免 key）**：`/api/topics/hot.json`、`/api/topics/latest.json`、`/api/topics/show.json?id=`、`/api/replies/show.json?topic_id=`。**API 2.0（需 PAT）**：`/api/v2/nodes/{node}/topics`、`/api/v2/topics/{id}`、`/api/v2/topics/{id}/replies`。 |
| 认证 | 1.0 免认证；2.0 需 `Authorization: Bearer <PAT>`（个人设置里自助生成，最多 10 个，有效期 30/60/90/180 天）[S9][S10]。 |
| 免费额度 | 免费，无计费。 |
| 限速/反爬 | **1.0：120 次/小时/IP**；**2.0：600 次/小时/IP**（响应头 `X-Rate-Limit-Limit/Remaining/Reset`）。CDN 可缓存的请求只在首次扣配额 [S9][S10]。实测 `hot.json` 200、37KB、724ms。 |
| 大陆可达 | ✅ 直连（Cloudflare，实测 724ms）。 |
| 工时 | 1h（1.0 足够；2.0 只在要按节点翻页时用）。 |
| ToS 风险 | 中：官方 API 公平使用规则**明确反对**「把 API 输出用于填充你的商业或个人网站内容」，只鼓励学术/客户端/扩展 [S9]。做产品展示要克制（摘要 + 跳转原文），别整站镜像。 |

**关键坑**：1.0 **没有搜索接口**。要做「搜产品名」，只能用 2.0 的节点列表 + 本地过滤，或者用元宝 `Site=v2ex.com` 限定搜索拿 topic id，再 `show.json` 补正文/回复数。

---

## 6. Reddit —— **26h 内基本不可行（政策闸门）**

| 项 | 结论 |
|---|---|
| 最省事路径 | 理论上 OAuth2 `client_credentials` → `oauth.reddit.com/r/<sub>/search?q=`。**实际被卡在审批**。 |
| 认证 | **必须 OAuth**，且 **2026 起必须先申请并获得人工批准**。官方 Data API Wiki（2026-10-17 更新）：「Clients must authenticate with a registered OAuth token… Traffic not using OAuth or login credentials will be blocked」[S11]；Responsible Builder Policy：「**Approval is required**: You must request access and get explicit approval before accessing any Reddit data through our API」[S12]。 |
| 免费额度 | 免费层 **100 QPM / OAuth client id**（10 分钟窗口平均，允许突发）[S11]。商业用途需单独签约、单独定价 [S13]。 |
| 限速/反爬 | 匿名 `.json` 已死：实测 `GET https://www.reddit.com/r/programming/top.json` → **HTTP 403**，页面正文写死 `You've been blocked by network security.`（189KB HTML，非 JSON）[S1]。`/api/v1/access_token` 可达（返回 `401 Unauthorized` JSON），说明 OAuth 端点活着、匿名读已封。 |
| 大陆可达 | ❌ 需代理（Reddit 全域被墙）。 |
| 工时 | 代码 0.5h，**审批不可控（天级）** → 26h 内按不可用计。 |
| ToS 风险 | 高：未获批就抓 = 直接违反 Responsible Builder Policy，且 Reddit 明确保留「永久封禁」权利；用 API 数据训练模型需权利人授权 [S13]。 |

**结论**：**不要为 Reddit 写代码**。要 Reddit 观点就走第三方聚合（TikHub 有 Reddit 端点，见 §10），把合规责任转移给供应商；或干脆放弃这一源。

---

## 7. 抖音（douyin）—— **官方无通用搜索；自建 26h 内不可行**

| 项 | 结论 |
|---|---|
| 官方 API 能不能用 | **不能当通用搜索用**。开放平台确实有「搜索管理」能力，但文档写死限制：**「申请的关键词，必须与自身业务紧密相关，不可申请通用品类词，不可申请竞品品牌词」**，且**「搜索结果只返回最近 1 天发布的公开视频」**，scope `video.search` [S14]。→ 搜「Notion 好用吗」这种通用词**根本申请不下来**。2025-03-27 官方公告开放了面向移动/网站应用的「抖音搜索能力」[S15]，但需应用审核 + 权限申请，26h 内拿不到。 |
| 免 key 路径 | 网页搜索接口 `www.douyin.com/aweme/v1/web/general/search/single/` 实测 **HTTP 200 但 `data: []`** —— 缺 `a_bogus`/`X-Bogus` 签名，静默返空 [S1]。 |
| yt-dlp | 单视频实测失败：`ERROR: [Douyin] 7660354076114259226: Fresh cookies (not necessarily logged in) are needed`（已尝试自动带 `__ac_nonce` 仍失败）[S1]。仓库 2026 年 6 个 douyin issue 全部指向 cookie/signature 问题 [S3]。 |
| 免费额度/价格 | 官方开放平台免费但需资质；第三方见 §10。 |
| 大陆可达 | ✅ 直连。 |
| 工时 | 自建（headless 浏览器 + 签名逆向）：**8–16h 且上线后随时挂** → 不建议。走 TikHub：0.5h。 |
| ToS 风险 | 高：破解 `a_bogus` 属绕过技术保护措施；官方 API 又拿不到通用搜索权限。 |

**可行的替代**：用**元宝搜索**（`Site=douyin.com`）或 Google 拿 `douyin.com/video/<id>` 链接，再让 TikHub 按 `aweme_id` 取详情/评论——这样完全不碰签名。

---

## 8. 小红书（xiaohongshu）—— **官方无内容 API；自建不可行**

| 项 | 结论 |
|---|---|
| 官方 API | **没有面向个人/内容检索的开放 API**。`open.xiaohongshu.com` 是**电商开放平台**，应用类目全是「一键搬家 / 商品 / 订单 / 物流 / 客服」等电商场景 [S16]；另有 `openaccount.xiaohongshu.com`（账号/客服类）[S17]。**搜笔记、拿笔记正文与点赞，官方一律不提供。** |
| 自建抓取 | 实测：笔记页 `https://www.xiaohongshu.com/explore/<id>` **HTTP 200 但 `noteDetailMap` 为空**（SSR 不吐数据，前端再带 `x-s`/`x-t` 签名请求）[S1]；`edith.xiaohongshu.com/api/sns/web/v1/search/notes` 不带签名返回 404/空。签名算法在混淆 JS 里，需逆向 + 设备指纹 + 风控头像验证。 |
| yt-dlp | 有 `XiaoHongShu` extractor，但只能处理**视频笔记**，且 2026 年多个未修 issue（`#17763` xhslink 跳转、`#16519` 站点改名 rednote.com、`#15572` 最高画质失效）[S3]。**图文笔记（测评主力形态）拿不到。** |
| 免费额度/价格 | 官方无；第三方见 §10。 |
| 大陆可达 | ✅ 直连。 |
| 工时 | 自建 **12–24h**（签名逆向 + 风控）→ 26h 内不现实；TikHub 0.5h。 |
| ToS 风险 | 高：绕过签名/风控，明确违反平台协议，且有《网络安全法》相关灰区。 |

---

## 9. 知乎（zhihu）—— **不可行**

| 项 | 结论 |
|---|---|
| 官方 API | **没有公开的开发者 API**（`open.zhihu.com` 返回 422，无文档站）。 |
| 自建抓取 | 实测全线 403：`/api/v4/search_v3` → `{"HitLabels":null}`（400，缺 `x-zse-96` 签名）；`/api/v4/questions/.../answers` → `403 code 40362 您当前请求存在异常`；`/question/19550517` 网页 → **HTTP 403**（584B 拦截页）[S1]。 |
| 免 key 路径 | 没有。知乎反爬是**签名 + 账号风控**双锁，服务器 IP 无 cookie 基本全 403。 |
| 大陆可达 | ✅ 直连（但直连也 403，是反爬不是墙）。 |
| 工时 | 自建 ≥12h 且不稳定；不建议。 |
| ToS 风险 | 高：绕过 `x-zse-96` 属破解，且知乎对爬虫有明确诉讼先例。 |

**替代**：只把知乎当**搜索结果的落地页**——用元宝 `Site=zhihu.com` 拿标题+摘要+URL 做展示与跳转，不抓正文。这样 0 工时、0 风险。

---

## 10. 单一聚合器能否一把梭？（bilibili + douyin + 小红书 + YouTube + Reddit）

**能。TikHub 是唯一一个 26h 内可落地的答案。**

| 项 | TikHub 事实 |
|---|---|
| 覆盖 | **16 个平台，一把 key**：TikTok、**Douyin**、**RedNote(小红书)**、Instagram、Twitter/X、**YouTube**、Threads、LinkedIn、**Reddit**、**Bilibili**、Weibo、Lemon8、Kuaishou、WeChat、**Zhihu** … [S18][S19] |
| 你需要的端点 | B站：`/api/v1/bilibili/web/fetch_general_search`、`fetch_one_video`、`fetch_video_comments`；抖音：`search`/`fetch_one_video`；小红书：笔记搜索/详情；YouTube/Reddit 同名端点 [S19] |
| 价格 | **$0.001–0.01/请求**，日量大自动阶梯降价（30k+ → $0.0005，-50%）；**注册送 $0.05 免费额度（≈50 次）**；最低充值 $5；**支持支付宝** [S18] |
| 限速 | 默认 **10 RPS/端点**（按 endpoint 计，不共享）[S18] |
| 签名/登录 | 不需要。**不用注册 B站/抖音开发者，不用 OAuth，不用 cookie** [S19] |
| 大陆可达 | ⚠️ `api.tikhub.io` 在 Cloudflare 后面，实测 864ms 返回 401（缺 key 的正常响应）；Cloudflare 大陆可达性不稳定，**上线前必须在部署机复核** [S1][S18] |
| 工时 | **0.5–1h**（一个 Bearer token + 统一 JSON） |
| ToS 风险 | 中高：TikHub 自己声明「只返回公开数据、不绕过认证」，但它本质是灰产聚合；**连带责任在你**，且跨境传输中国用户数据涉及《个人信息保护法》。 |

**Apify**（备选，不推荐做主力）：免费层每月 **$5 平台额度**（无需信用卡），Actor 按事件或按 CU 计费，CU $0.2/CU [S20]。生态里 B站/小红书 Actor 覆盖零散、需要自己挑，且**没有抖音+小红书+B站统一 schema**；26h 内拼装成本高于 TikHub。
**Bright Data / RapidAPI**：Bright Data 是数据集/代理为主（按 GB 或按记录计费，需商务），RapidAPI 各家第三方 API 价格与稳定性参差；都不如 TikHub 省事 `[INFERENCE]`。

---

## 11. `yt-dlp` 专项回答

**Q：能否只取元数据不下载？**
能，且这是官方支持的主路径：`-J/--dump-json`（隐含 `--simulate`，只打印 JSON）、`--skip-download`（不下载但仍写附属文件）、`-O/--print <field>`（只打印指定字段，最省流量）[S2]。

**实测（2026.10.21，本机）**：

| URL | 结果 | 耗时 | 拿到字段 |
|---|---|---|---|
| `bilibili.com/video/BV1GJ411x7h7` | ✅ | 2393ms | title, upload_date, view_count, like_count, comment_count, duration, webpage_url |
| `youtube.com/watch?v=dQw4w9WgXcQ` | ✅ | 3393ms | 同上 + description 全文（2376 字） |
| `bilisearch3:notion`（B站搜索） | ❌ HTTP 412 | 2049ms | — |
| `douyin.com/video/7660...` | ❌ Fresh cookies needed | — | — |

**Q：2026 有没有大面积失效？**
有，且是结构性的：
- **B站**：近半年 22 个 issue，`-412 request was banned`、`Unable to extract initial state`、`HTTP 567` 都还开着 [S3]。**单视频元数据目前稳定**，但**搜索/列表接口已不可靠**。
- **YouTube**：`master` README 现在把 `yt-dlp-ejs` + JS 运行时（deno/node/bun）列为 **Strongly recommended，full YouTube support 必需** [S2]；2026-08 以来 157 个 YouTube issue，多为 live/长会话失效。元数据路径本身正常。
- **抖音**：必须「新鲜 cookie」，2026 年 6 个 issue 全部未解 [S3]。

**结论**：yt-dlp 当 **「已知 URL → 元数据」的解析器** 用，非常可靠（2–3s/条）；当 **「搜索器」** 用，B站/抖音都别指望。

---

## 12. 排名表（按「今晚能不能上线」排序）

| # | 源 | 路线 | 要 key? | 免费额度 | 大陆直连? | 工时 | 风险 |
|---|---|---|---|---|---|---|---|
| 1 | **B站** | `yt-dlp -J` 取元数据 + 自算 **wbi** 打搜索/评论 | 否 | 无配额（IP 风控） | ✅ | **3–4h** | 中高（未公开 API） |
| 2 | **YouTube** | Data API v3（`search.list` 100/天 + `videos.list` 10k 单位/天）;备用 `yt-dlp -J` | 是（GCP key） | 100 搜索/天、10k 单位/天 | ❌ 需代理 | **1.5h** | 低（API）/中（yt-dlp） |
| 3 | **Hacker News** | Algolia `hn.algolia.com/api/v1/search` | 否 | 无（无硬限） | ❌ 需代理（GCP） | **1h** | 极低 |
| 4 | **GitHub** | REST `/repos`、`/issues`、`/issues/{n}/comments` | 建议 token | 60/h → 5,000/h | ✅ | **1.5h** | 低 |
| 5 | **V2EX** | API 1.0 `hot/latest/show/replies`（只读免 key） | 否 | 120/h/IP（1.0）、600/h（2.0） | ✅ | **1h** | 中（公平使用规则禁商用填充） |
| 6 | **知乎** | ❌ 只做「元宝搜索结果落地页」，不抓正文 | — | — | ✅（但反爬 403） | 0.5h（仅展示链接） | 低 |
| 7 | **抖音** | ❌ 官方仅「与我相关关键词 + 最近 1 天」；自建需破 `a_bogus` | — | — | ✅ | 自建 8–16h **不可行** | 高 |
| 8 | **小红书** | ❌ 无官方内容 API；笔记页 SSR 为空，需 `x-s` 签名 | — | — | ✅ | 自建 12–24h **不可行** | 高 |
| 9 | **Reddit** | ❌ 匿名 `.json` 已 403；OAuth 需**人工审批** | 是 + 审批 | 100 QPM（获批后） | ❌ 需代理 | 审批不可控 **不可行** | 高 |
| — | **聚合兜底** | **TikHub**：B站+抖音+小红书+YouTube+Reddit+知乎 一把 key | 是（$0.05 免费） | ~50 次免费，$0.001/次 | ⚠️ CF，需验证 | **0.5–1h/源** | 中高（灰产连带） |

---

## 13. 建议的 26h 落地方案（一句话版）

1. **发现层**：元宝 `SearchPro`（`Site=bilibili.com` / `youtube.com` / `reddit.com` / `xiaohongshu.com` / `zhihu.com`）负责「找到 URL + 标题 + 时间 + 摘要」——0 工时新增，复用现有接入。
2. **增强层（今晚写）**：B站 → `yt-dlp -J` 补 play/like/comment + wbi 搜索补热度；YouTube → `videos.list` 批量补 statistics；GitHub/V2EX/HN → 直接打 API。
3. **放弃层**：抖音、小红书、知乎正文、Reddit —— 要么用元宝摘要 + 跳转原文，要么用 TikHub 兜底，**不要自己写爬虫**。

---

## 来源

- [S1] 本次实测（2026-10-24，Node/Bun fetch，**经本机全局代理出口**）：响应码/耗时/响应头/正文字段，见正文各节引用的实测输出。
- [S2] yt-dlp README（master，`--simulate` / `--skip-download` / `-j, --dump-json` / `-O, --print`；`yt-dlp-ejs` 为 full YouTube support 必需）https://github.com/yt-dlp/yt-dlp/blob/master/README.md ；支持站点列表（含 `BiliBili`、`BiliBiliSearch`、`XiaoHongShu`、`Douyin`）https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md
- [S3] yt-dlp issue 检索（2026-04 起）：`repo:yt-dlp/yt-dlp bilibili` 22 条 / youtube 157 条 / douyin 6 条 / xiaohongshu 14 条 https://github.com/yt-dlp/yt-dlp/issues
- [S4] YouTube Data API — Quota Calculator（默认 100 `search.list`/天、100 `videos.insert`/天、其余合计 10,000 单位/天；`videos.list`=1 单位），2026-10-15 更新 https://developers.google.com/youtube/v3/determine_quota_cost
- [S5] YouTube Data API — `videos.list`（`part=statistics`，quota 1 unit）https://developers.google.com/youtube/v3/docs/videos/list
- [S6] Hacker News 官方 API 文档（Firebase；「There is currently no rate limit」；`score`/`descendants`/`text`）https://github.com/HackerNews/API
- [S7] GitHub REST — 认证前 60 次/小时、认证后 5,000 次/小时 https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- [S8] GitHub REST — 搜索端点限速（未认证 10/min，认证 30/min，code 10/min）https://docs.github.com/en/rest/search/search
- [S9] V2EX API 1.0 文档（免认证；120 次/小时/IP；公平使用规则反对填充商业/个人网站内容）https://www.v2ex.com/p/7v9teC53
- [S10] V2EX API 2.0 Beta（PAT 认证；600 次/小时；节点/主题/回复端点），2026-08-30 更新 https://www.v2ex.com/help/api
- [S11] Reddit Data API Wiki（2026-10-17 更新；必须 OAuth；未用 OAuth 的流量会被 block；免费 100 QPM/client id，10 分钟窗口平均）https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki
- [S12] Reddit Responsible Builder Policy（2026-10-05 更新；「Approval is required… before accessing any Reddit data through our API」）https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy
- [S13] Reddit Data API Terms（生效 2023-06-19，2026-07-20 修订；商业用途需单独协议；禁止未经授权用于训练模型）https://www.redditinc.com/policies/data-api-terms
- [S14] 抖音开放平台 —「视频搜索管理」能力（关键词须与自身业务紧密相关、不可申请通用品类词/竞品词；只返回最近 1 天发布的公开视频；scope `video.search`）https://open.douyin.com/platform/resource/docs/ability/search-management/video
- [S15] 抖音开放平台公告 —「抖音搜索能力正式开放！」（2025-03-27，面向移动/网站应用开发者）https://developer.open-douyin.com/announcement/297
- [S16] 小红书开放平台 — 应用类目（第三方开发者为「一键搬家/商品/订单/物流/客服」等电商场景）https://open.xiaohongshu.com/document/developer/file/33
- [S17] 小红书开放平台（账号/客服类 API 参考，2026-08-19 更新）https://openaccount.xiaohongshu.com/docs/api-reference
- [S18] TikHub 定价（$0.001–0.01/请求、$0.05 免费额度≈50 次、最低充值 $5、支付宝、10 RPS/端点、日阶梯折扣 30k+ 减 50%）https://tikhub.io/pricing
- [S19] TikHub 平台与端点（16 平台含 Bilibili/Douyin/RedNote/YouTube/Reddit/Zhihu；B站 `fetch_general_search`/`fetch_one_video`/`fetch_video_comments`）https://tikhub.io/api-reference 、https://tikhub.io/bilibili-api
- [S20] Apify 定价（Free $5 平台额度/月，无需信用卡；CU $0.2/CU）https://apify.com/pricing
- [S21] YouTube API Services Terms of Service（非授权数据/缓存与衍生数据限制）https://developers.google.com/youtube/terms/api-services-terms-of-service ；开发者政策 https://developers.google.com/youtube/terms/developer-policies
