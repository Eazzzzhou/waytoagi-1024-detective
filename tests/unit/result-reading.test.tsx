// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { SnapshotView } from "../../src/components/investigation/SnapshotView";
import { AnswerBody } from "../../src/components/investigation/AnswerBody";
import { citationAnchor, resultAnchor } from "../../src/components/investigation/result-links";
import { SnapshotResponseSchema } from "../../src/contracts";
import { makeReadingCase } from "../fixtures/result-reading";

afterEach(cleanup);
it("keeps visual classifications tied to saved data and every reading destination keyboard focusable", () => {
  const data = makeReadingCase(); const { container } = render(<SnapshotView data={data} />);
  for (const evidence of data.snapshot.evidence) {
    const item = container.querySelector(`[id="${resultAnchor(data.snapshot.id, "evidence", evidence.id)}"]`)!;
    expect(item.getAttribute("data-kind")).toBe(evidence.metadata.contentKind);
    expect(item.getAttribute("data-read")).toBe(evidence.readStatus);
  }
  for (const link of container.querySelectorAll('a[href^="#"]')) {
    const destination = container.querySelector(`[id="${link.getAttribute("href")!.slice(1)}"]`)!;
    expect(destination.getAttribute("tabindex")).toBe("-1");
  }
});
it("renders the reading sequence and literal, clickable inline citations with exact snapshot targets", () => {
  const data = makeReadingCase(); const { container } = render(<SnapshotView data={data} />);
  expect(Array.from(container.querySelectorAll("h2")).map((h) => h.textContent)).toEqual(["调查回答", "主张核查", "引用与来源原文", "冲突和证据缺口", "快照版本与生成信息"]);
  const single = screen.getByRole("link", { name: "引用 [1]，查看来源原文" });
  expect(single.getAttribute("href")).toBe(`#${resultAnchor(data.snapshot.id, "evidence", data.snapshot.evidence[0]!.id)}`);
  const multiple = screen.getByRole("link", { name: "引用 [多源]，查看 2 条来源映射" });
  const mappingId = citationAnchor(data.snapshot.id, data.answers[0]!.id, 1);
  expect(multiple.getAttribute("href")).toBe(`#${mappingId}`);
  expect(container.querySelector(`[id="${mappingId}"]`)!.querySelectorAll('a[href*="-evidence-"]')).toHaveLength(2);
  for (const link of container.querySelectorAll('a[href^="#"]')) expect(container.querySelector(`[id="${link.getAttribute("href")!.slice(1)}"]`)).not.toBeNull();
  expect(container.querySelector("script")).toBeNull(); expect(container.textContent).toContain("<script>window.__unsafe = true</script>");
});

it("preserves newlines, repeated citation markers and regex-like literal markers without parsing HTML", () => {
  const data = makeReadingCase(); const answer = data.answers[0]!;
  answer.body = "段落甲\n\n段落乙[a.*]\n[a.*]<img src=x onerror=alert(1)>[未映射]";
  answer.citations = [{ ...answer.citations[0]!, marker: "[a.*]" }];
  const { container } = render(<AnswerBody answer={answer} snapshotId={data.snapshot.id} />);
  expect(container.textContent).toBe(answer.body); expect(container.querySelectorAll("a")).toHaveLength(2);
  expect(container.querySelector("img")).toBeNull(); expect(container.textContent).toContain("[未映射]");
});

it.each(["missing-evidence", "missing-claim", "missing-marker", "dangling-relation", "wrong-quote", "wrong-snapshot", "unsafe-url", "unread-excerpt"])("blocks %s without substituting sources", (kind) => {
  const data = makeReadingCase();
  if (kind === "missing-evidence") data.answers[0]!.citations[0]!.evidenceIds[0] = randomUUID();
  if (kind === "missing-claim") data.answers[0]!.citations[0]!.claimIds[0] = randomUUID();
  if (kind === "missing-marker") data.answers[0]!.body = "没有已登记引用标记的隔离文本";
  if (kind === "dangling-relation") data.snapshot.relations[0]!.evidenceId = randomUUID();
  if (kind === "wrong-quote") data.answers[0]!.citations[0]!.quotes![0]!.originalExcerpt = "不匹配原句";
  if (kind === "wrong-snapshot") data.answers[0]!.snapshotId = randomUUID();
  if (kind === "unsafe-url") data.snapshot.evidence[0]!.sourceUrl = "javascript:alert(1)";
  if (kind === "unread-excerpt") data.snapshot.evidence[3]!.originalExcerpt = "未读来源不能带原句";
  expect(SnapshotResponseSchema.safeParse(data).success).toBe(false);
  const { container } = render(<SnapshotView data={data} />);
  expect(screen.getByRole("alert").textContent).toContain("未通过共享契约校验");
  expect(container.querySelector("a")).toBeNull();
});

it("shows saved claim status, scope, relation reasons and exact linked limitations without deriving proof", () => {
  const data = makeReadingCase(); const { container } = render(<SnapshotView data={data} />);
  const claim = container.querySelector(`[id="${resultAnchor(data.snapshot.id, "claim", data.snapshot.claims[0]!.id)}"]`)!;
  expect(claim.textContent).toContain("主张类型：官方宣称"); expect(claim.textContent).toContain("证据不足");
  expect(claim.textContent).toContain(data.snapshot.claims[0]!.scope); expect(claim.textContent).toContain("上下文");
  expect(claim.textContent).toContain("隔离缺口：缺少独立实测。"); expect(claim.textContent).toContain("尚未解决的冲突");
  expect(claim.querySelector('a[href*="-gap-"]')).not.toBeNull();
});

it("distinguishes read failure, restriction, snippets and not-fetched originals from absence in scope", () => {
  const data = makeReadingCase(); const { container } = render(<SnapshotView data={data} />);
  for (const evidence of data.snapshot.evidence.filter((item) => item.readStatus !== "READ")) {
    const article = container.querySelector(`[id="${resultAnchor(data.snapshot.id, "evidence", evidence.id)}"]`)!;
    expect(article.querySelector("blockquote")).toBeNull(); expect(article.textContent).toContain("未取得可引用原文");
    expect(article.textContent).toContain("原文未成功读取，不提供译文"); expect(article.textContent).toContain("未知（未保存定位）");
  }
  expect(screen.getAllByText(/限定范围内未找到可用证据/).length).toBeGreaterThan(0);
  expect(screen.getByText(/仅检查这些隔离测试材料/)).toBeTruthy();
  expect(screen.getByText(/搜索摘要不作为已读原文/)).toBeTruthy();
});

it("preserves independence reasons and labels official claims without inferring independent support", () => {
  const data = makeReadingCase(); const { container } = render(<SnapshotView data={data} />);
  expect(screen.getAllByText(/共享上游材料不能因页面数量增加/)).toHaveLength(2);
  expect(screen.getAllByText(/已保存判断：独立来源/)).toHaveLength(1);
  expect(screen.getAllByText(/此来源为官方材料/).length).toBeGreaterThan(0);
  expect(container.textContent).toContain("隔离测试保存的独立性判断，不是实际核验。");
  for (const link of container.querySelectorAll('a[target="_blank"]')) expect(link.getAttribute("rel")).toBe("noopener noreferrer");
});

it("keeps original and translation separate and shows unknown metadata explicitly", () => {
  const data = makeReadingCase(); const { container } = render(<SnapshotView data={data} />);
  const article = container.querySelector(`[id="${resultAnchor(data.snapshot.id, "evidence", data.snapshot.evidence[0]!.id)}"]`)!;
  expect(article.querySelector("blockquote")!.textContent).toBe(data.snapshot.evidence[0]!.originalExcerpt);
  expect(article.textContent).toContain("隔离译文，仅验证原文与译文分离。"); expect(article.querySelector("dl")!.textContent).toContain("未知");
  expect(article.textContent).toContain("定位上下文：未知");
});

it("has distinct empty states for answers, evidence and claims, never a manufactured conclusion", () => {
  const data = makeReadingCase(); data.answers = []; data.snapshot.evidence = []; data.snapshot.claims = []; data.snapshot.relations = []; data.snapshot.conflicts = []; data.snapshot.gaps = [];
  render(<SnapshotView data={data} />);
  expect(screen.getByText(/该快照尚未保存回答/)).toBeTruthy(); expect(screen.getByText(/该快照没有证据记录/)).toBeTruthy(); expect(screen.getByText(/该快照没有主张记录/)).toBeTruthy();
  expect(screen.getByText(/未记录证据缺口/)).toBeTruthy();
});

it("supports legacy quotes absence without inventing quotes, and displays per-answer and snapshot times", () => {
  const data = makeReadingCase(); delete data.answers[0]!.citations[0]!.quotes;
  render(<SnapshotView data={data} />);
  expect(screen.getByText(/此历史回答未单独保存引用原句/)).toBeTruthy();
  expect(screen.getByText(/回答生成于/).textContent).toContain("上海时间"); expect(screen.getByText("快照生成时间")).toBeTruthy();
});

it("renders long answers, long URLs and 150 sources without truncating or changing mappings", () => {
  const data = makeReadingCase(); const original = data.snapshot.evidence[0]!;
  data.answers[0]!.body += "很长的隔离测试文本\n".repeat(1500);
  original.sourceUrl = "https://example.com/" + "long-path-".repeat(100);
  while (data.snapshot.evidence.length < 150) data.snapshot.evidence.push({ ...structuredClone(original), id: randomUUID() });
  const { container } = render(<SnapshotView data={data} />);
  expect(container.querySelectorAll('article[id*="-evidence-"]')).toHaveLength(150);
  expect(container.textContent).toContain(data.answers[0]!.body.slice(-100));
  expect(screen.getAllByRole("link", { name: original.sourceUrl }).length).toBeGreaterThan(0);
});

it("separates resolved and unresolved conflicts and shows missing relation/scope honestly", () => {
  const data = makeReadingCase(); data.snapshot.conflicts.push({ ...data.snapshot.conflicts[0]!, id: randomUUID(), resolution: "隔离处理记录，未更改事实" });
  data.snapshot.claims[0]!.scope = null; data.snapshot.relations = [];
  render(<SnapshotView data={data} />);
  expect(screen.getAllByText("尚未解决的冲突").length).toBeGreaterThan(0);
  expect(screen.getByText("已有处理说明的冲突")).toBeTruthy();
  expect(screen.getByText(/未保存此主张的证据关系/)).toBeTruthy(); expect(screen.getByText(/未知（未记录适用范围）/)).toBeTruthy();
});
