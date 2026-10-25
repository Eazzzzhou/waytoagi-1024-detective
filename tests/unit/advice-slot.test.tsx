import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AdviceSlot } from "../../src/components/investigation/AdviceSlot";
it("keeps unconnected advice entirely hidden without data", () => {
  expect(renderToStaticMarkup(<AdviceSlot />)).toBe("");
  expect(renderToStaticMarkup(<AdviceSlot enabled />)).toBe("");
});
