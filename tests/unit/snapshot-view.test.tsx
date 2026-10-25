import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SnapshotView } from "../../src/components/investigation/SnapshotView";
import { makeAnswer, makeSnapshot } from "../fixtures/snapshot";

it("renders evidence, translations, judgments, gaps and citation anchors as escaped text", () => {
  const snapshot = makeSnapshot();
  const answer = makeAnswer(snapshot);
  snapshot.evidence[0]!.originalExcerpt = '<img src=x onerror="alert(1)">';
  answer.citations[0]!.quotes![0]!.originalExcerpt = snapshot.evidence[0]!.originalExcerpt;
  snapshot.evidence[0]!.translation = "明确分开的译文";
  const html = renderToStaticMarkup(<SnapshotView data={{ snapshot, answers: [answer] }} />);
  expect(html).toContain("&lt;img");
  expect(html).not.toContain('<img src="x"');
  expect(html).toContain("明确分开的译文");
  expect(html).toContain("尚未核查");
  expect(html).toContain(`href="#evidence-${snapshot.evidence[0]!.id}"`);
  expect(html).toContain("证据缺口");
});

it("matches exact overlapping and special markers, preserving repeated multi-source links and legacy fallback", () => {
  const snapshot = makeSnapshot();
  const first = snapshot.evidence[0]!;
  const second = { ...first, id: "00000000-0000-4000-8000-000000000002" };
  snapshot.evidence.push(second);
  const answer = makeAnswer(snapshot);
  const citation = answer.citations[0]!;
  citation.marker = "[1].*";
  citation.evidenceIds.push(second.id);
  citation.quotes!.push({ evidenceId: second.id, originalExcerpt: second.originalExcerpt! });
  answer.citations.push({ ...citation, marker: "[1]", quotes: undefined });
  answer.body = "<script>alert(1)</script> [1].* [1].* [1]";
  const html = renderToStaticMarkup(<SnapshotView data={{ snapshot, answers: [answer] }} />);
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  for (const evidence of [first, second]) {
    expect(html).toContain(`id="ref-${answer.id}-0-${evidence.id}"`);
    expect(html).toContain(`id="ref-${answer.id}-1-${evidence.id}"`);
    expect(html).toContain(`id="ref-${answer.id}-2-${evidence.id}"`);
    expect(html).toContain(`href="#quote-${evidence.id}"`);
    expect(html).toContain(`href="#evidence-${evidence.id}"`);
  }
  expect(html).toContain("历史回答未保存独立引用预览");
  expect(html.indexOf("冲突与证据缺口")).toBeLessThan(html.indexOf("条来源记录"));
});

it("renders claim types, explicit conflict ownership and source relationships without inference", () => {
  const snapshot = makeSnapshot();
  const claim = snapshot.claims[0]!;
  claim.kind = "OFFICIAL_CLAIM";
  claim.verificationStatus = "DISPUTED";
  const first = snapshot.evidence[0]!;
  first.metadata.independence = "SHARED_ORIGIN";
  first.metadata.originGroupId = "provided-group";
  first.metadata.upstreamUrl = "https://example.com/provided-upstream";
  first.metadata.independenceReason = "Data-provided relationship";
  const second = { ...first, id: "00000000-0000-4000-8000-000000000002", metadata: { ...first.metadata, independence: "UNKNOWN" as const, originGroupId: null, upstreamUrl: null, independenceReason: null } };
  snapshot.evidence.push(second);
  snapshot.conflicts.push({ id: "00000000-0000-4000-8000-000000000003", claimIds: [claim.id], evidenceIds: [first.id, second.id], description: "Test conflict", resolution: null });
  snapshot.gaps.push({ id: "00000000-0000-4000-8000-000000000004", claimIds: [], kind: "INSUFFICIENT_EVIDENCE", description: "Unassigned gap", searchScope: null });
  const html = renderToStaticMarkup(<SnapshotView data={{ snapshot, answers: [] }} />);
  expect(html).toContain("官方宣称");
  expect(html).toContain("存在争议");
  expect(html).toContain(`id="claim-${claim.id}"`);
  expect(html).toContain(`href="#claim-${claim.id}"`);
  expect(html).toContain("影响主张：");
  expect(html).toContain("关联由调查数据提供");
  expect(html).toContain('aria-label="来源关系"');
  expect(html).toContain('href="https://example.com/provided-upstream"');
  expect(html).toContain("provided-group");
  expect(html).toContain("上游：未知");
  expect(html).toContain("同源：未知");
});

it("shows an unlabelled type fallback without guessing from verification", () => {
  const snapshot = makeSnapshot();
  Reflect.deleteProperty(snapshot.claims[0]!, "kind");
  const html = renderToStaticMarkup(<SnapshotView data={{ snapshot, answers: [] }} />);
  expect(html).toContain("未标注类型");
  expect(html).toContain("尚未核查");
});
