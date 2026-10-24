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
