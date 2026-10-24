// 元宝搜索站点覆盖实测（ticket 02）
// 用法：把 key 放进环境变量后运行
//   PowerShell:  $env:TENCENTCLOUD_WSA_APIKEY="sk-..." ; node scripts/probe-sites.mjs
// 输出：矩阵到终端 + research/probe-results.json
import { writeFileSync, mkdirSync } from "node:fs";

const KEY = process.env.TENCENTCLOUD_WSA_APIKEY;
if (!KEY) {
  console.error("缺少 TENCENTCLOUD_WSA_APIKEY");
  process.exit(1);
}

const ENDPOINT = "https://api.wsa.cloud.tencent.com/SearchPro";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(body) {
  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const ms = Date.now() - t0;
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  const rawPages = json?.Response?.Pages ?? json?.Pages ?? [];
  const pages = rawPages.map((p) => {
    try { return typeof p === "string" ? JSON.parse(p) : p; } catch { return { parse_error: p }; }
  });
  return { status: res.status, ms, bytes: text.length, pages, raw: json ?? text.slice(0, 400) };
}

const normDate = (s) => (s ? String(s).replaceAll("/", "-").slice(0, 10) : null);

const SITES = [
  "zhihu.com", "xiaohongshu.com", "bilibili.com", "v2ex.com", "juejin.cn",
  "csdn.net", "sspai.com", "36kr.com", "jiqizhixin.com", "github.com",
  "x.com", "reddit.com", "news.ycombinator.com", "douyin.com", "weixin.qq.com",
];

const QUERIES = ["DeepSeek 评测", "AI coding"];

const out = { cst: new Date().toISOString(), version: null, sites: [], baseline: [], freshness: [], cnt: [] };

for (const query of QUERIES) {
  for (const site of SITES) {
    const r = await search({ Query: query, Site: site, Cnt: 10, Mode: 0 });
    out.version ??= r.raw?.Response?.Version ?? null;
    const dates = r.pages.map((p) => normDate(p.date)).filter(Boolean).sort();
    out.sites.push({
      query, site, status: r.status, ms: r.ms, count: r.pages.length,
      newest: dates.at(-1) ?? null, oldest: dates[0] ?? null,
      sample: r.pages[0] ? { title: (r.pages[0].title ?? "").slice(0, 60), url: r.pages[0].url, date: r.pages[0].date } : null,
      error: r.pages.length ? null : (r.raw?.Response?.Error?.Message ?? r.raw?.Response?.Msg ?? null),
    });
    console.log(`${query} | ${site.padEnd(22)} | ${r.status} | n=${String(r.pages.length).padStart(2)} | newest=${dates.at(-1) ?? "-"} | ${r.ms}ms`);
    await sleep(120); // QPS 20
  }

  // 不加站点：看真实全网构成与时效
  const base = await search({ Query: query, Cnt: 50, Mode: 0 });
  const bySite = {};
  for (const p of base.pages) bySite[p.site ?? "?"] = (bySite[p.site ?? "?"] ?? 0) + 1;
  out.baseline.push({ query, status: base.status, count: base.pages.length, ms: base.ms, bySite });
  console.log(`\n[baseline] ${query} n=${base.pages.length} ${base.ms}ms`, bySite, "\n");
  await sleep(120);

  for (const f of ["d1", "d7", "d30"]) {
    const fr = await search({ Query: query, Cnt: 50, Freshness: f });
    const dates = fr.pages.map((p) => normDate(p.date)).filter(Boolean).sort();
    out.freshness.push({ query, freshness: f, count: fr.pages.length, newest: dates.at(-1) ?? null, oldest: dates[0] ?? null });
    console.log(`[freshness ${f}] ${query} n=${fr.pages.length} range=${dates[0] ?? "-"}..${dates.at(-1) ?? "-"}`);
    await sleep(120);
  }
}

const cnt = await search({ Query: "AI 工具", Cnt: 50 });
out.cnt.push({ cnt: 50, count: cnt.pages.length, ms: cnt.ms });
console.log(`\n[Cnt=50] returned=${cnt.pages.length} in ${cnt.ms}ms`);

mkdirSync("research", { recursive: true });
writeFileSync("research/probe-results.json", JSON.stringify(out, null, 2));
console.log("\nwrote research/probe-results.json");
