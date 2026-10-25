import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDocumentReader, extractDocument, hashText, validateFragment } from "../../src/server/retrieval/documents";
import type { HttpTextResponse } from "../../src/server/retrieval/http";

const dirs: string[] = [];
async function directory() { const path = await mkdtemp(join(tmpdir(), "anjuan-document-test-")); dirs.push(path); return path; }
afterEach(async () => { await Promise.all(dirs.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
const html = `<html lang="en"><title>Synthetic product specifications</title><body><nav>Navigation should not be article text.</nav><main>
<h1>Synthetic product specifications</h1><p>Original introduction describing the synthetic product and the scope of these test specifications.</p>
<table class="plainrowheaders"><tr><th>Model</th><th>Context</th><th>Output</th></tr><tr><td>Alpha version 2</td><td>128K tokens</td><td>8K tokens</td></tr><tr><td>Beta version 3</td><td>256K tokens</td><td>16K tokens</td></tr></table>
<h2>License</h2><p>Commercial deployment requires a separate license. This statement is an explicit synthetic test fixture only.</p>
<pre>function example() {\n  return "preserve indentation";\n}</pre><div>Direct div text must be retained too.</div>
<p>Read the <a href="/license?utm_source=test">original license</a> and <a href="http://127.0.0.1/private">unsafe link</a>.</p></main></body></html>`;
function response(text = html, contentType = "text/html; charset=utf-8"): HttpTextResponse {
  return { url: "https://example.com/spec", status: 200, text, contentType, rawBytes: Buffer.from(text) };
}

describe("versioned source documents (all responses are explicit test doubles)", () => {
  it("saves full original material, table/cell ranges, code and links under separate raw/text hashes", async () => {
    const reader = createDocumentReader({ storageDir: await directory(), request: vi.fn(async () => response()) });
    const { document } = await reader.read("https://example.com/spec");
    expect(document.status).toBe("READ");
    expect(document.text).toContain("Direct div text must be retained too.");
    expect(document.text).toContain('function example() {\n  return "preserve indentation";\n}');
    expect(document.text).not.toContain("Navigation should");
    expect(document.rawHash).toBe(hashText(html));
    expect(document.textHash).toBe(hashText(document.text));
    expect(document.textHash).not.toBe(document.rawHash);
    const table = document.tables[0]!;
    expect(table.rows).toHaveLength(3);
    for (const row of table.rows) for (const cell of row.cells) expect(document.text.slice(cell.start, cell.end)).toBe(cell.text);
    expect(document.links).toEqual(expect.arrayContaining([expect.objectContaining({ url: "https://example.com/license", relation: "LINK", blockId: expect.any(String) })]));
    expect(document.links.some(l => l.url.includes("127.0.0.1"))).toBe(false);
    expect(await reader.load(document.id)).toEqual(document);
  });

  it("changes focus without another download and emits independently verifiable fragments", async () => {
    const request = vi.fn(async () => response());
    const reader = createDocumentReader({ storageDir: await directory(), request });
    const first = await reader.read("https://example.com/spec#model");
    const alpha = reader.select(first.document, { query: "Alpha context", maxFragments: 2, maxChars: 90 });
    const cached = await reader.read("https://example.com/spec?utm_source=other");
    const license = reader.select(cached.document, { query: "Commercial deployment license", maxFragments: 1 });
    expect(request).toHaveBeenCalledTimes(1); expect(cached.cacheHit).toBe(true);
    expect(alpha.length).toBeGreaterThan(0); expect(license[0]?.exactText).toContain("Commercial deployment");
    for (const fragment of [...alpha, ...license]) {
      validateFragment(first.document, fragment);
      expect(reader.toEvidence(first.document, fragment).contentHash).toBe(hashText(fragment.exactText));
    }
    expect(reader.journal.actions.filter(a => a.action === "SELECT")).toHaveLength(2);
    expect(() => validateFragment(first.document, { ...alpha[0]!, exactText: "Invented quote" })).toThrow();
  });

  it("keeps refresh as a new immutable acquisition and detects stored tampering", async () => {
    const request = vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(response(html.replace("128K", "192K")));
    const reader = createDocumentReader({ storageDir: await directory(), request });
    const old = (await reader.read("https://example.com/spec")).document;
    const updated = (await reader.read("https://example.com/spec", { refresh: true })).document;
    expect(updated.version).not.toBe(old.version); expect(updated.id).not.toBe(old.id);
    expect((await reader.load(old.id)).text).toContain("128K");
    await writeFile(updated.storage.textPath!, "tampered");
    await expect(reader.load(updated.id)).rejects.toThrow(/integrity/);
  });

  it("preserves multiple HN comments with real parent/author metadata and original links", async () => {
    const raw = JSON.stringify({ id: 10, title: "Synthetic HN story", url: "https://example.com/upstream", author: "submitter", children: [
      { id: 11, author: "first-author", text: "<p>I tried Blender and this is my first independent synthetic test comment.</p>", children: [{ id: 12, author: "reply-author", text: "<p>I tried CAD and this is an explicit synthetic reply about a different workflow.</p>" }] },
      { id: 13, author: "other-author", text: "<p>Another synthetic report with an <a href='https://example.com/experiment'>original experiment</a>.</p>" }
    ] });
    const reader = createDocumentReader({ storageDir: await directory(), request: vi.fn(async () => response(raw, "application/json")) });
    const { document } = await reader.read("https://news.ycombinator.com/item?id=10");
    expect(document.blocks).toHaveLength(3);
    expect(document.blocks[1]).toMatchObject({ id: "hn-12", parentId: "hn-11", author: "reply-author" });
    const fragment = reader.select(document, { query: "CAD", maxFragments: 1 })[0]!;
    const evidence = reader.toEvidence(document, fragment);
    expect(evidence.sourceUrl).toBe("https://news.ycombinator.com/item?id=12");
    expect(evidence.metadata).toMatchObject({ author: "reply-author", upstreamUrl: null, independence: "UNKNOWN" });
    expect(document.links).toContainEqual(expect.objectContaining({ relation: "STORY_UPSTREAM", url: "https://example.com/upstream" }));
  });

  it("records partial access failures without promoting shells or unsupported media to evidence", async () => {
    for (const item of [
      { ...response("forbidden"), status: 403 }, response("<div id='root'></div><script src='/app.js'></script>"), response("%PDF", "application/pdf")
    ]) {
      const reader = createDocumentReader({ storageDir: await directory(), request: vi.fn(async () => item) });
      const { document } = await reader.read("https://example.com/spec", { render: "never" });
      expect(document.status).not.toBe("READ"); expect(document.readError).toBeTruthy(); expect(reader.select(document, { query: "anything" })).toEqual([]);
      expect((await reader.load(document.id)).status).toBe(document.status);
    }
  });

  it("coalesces concurrent downloads and preserves distinct rendered acquisition hashes", async () => {
    const request = vi.fn(async () => response("<div id='root'></div><script src='/app.js'></script>"));
    const renderer = vi.fn(async () => ({ html, finalUrl: "https://example.com/spec", engine: "test-double", version: "1" }));
    const reader = createDocumentReader({ storageDir: await directory(), request, renderer });
    const [one, two] = await Promise.all([reader.read("https://example.com/spec"), reader.read("https://example.com/spec")]);
    expect(request).toHaveBeenCalledTimes(1); expect(renderer).toHaveBeenCalledTimes(1);
    expect(two.document.id).toBe(one.document.id); expect(two.cacheHit).toBe(true);
    expect(one.document.parser.mode).toBe("RENDERED");
    expect(one.document.rawSources).toHaveLength(2);
    expect(one.document.rawSources[0]?.hash).not.toBe(one.document.rawHash);
    await reader.load(one.document.id);
  });

  it("does not execute static inline scripts during article identification", () => {
    const extracted = extractDocument(html + '<script>throw new Error("This must not execute")</script>', "https://example.com/spec");
    expect(extracted.text).toContain("128K tokens"); expect(extracted.text).not.toContain("This must not execute");
  });

  it("keeps short original subjects intact and supports explicit non-overlapping reselection", async () => {
    const reader = createDocumentReader({ storageDir: await directory(), request: vi.fn(async () => response()) });
    const { document } = await reader.read("https://example.com/spec");
    const first = reader.select(document, { query: "license", maxFragments: 1 });
    const next = reader.select(document, { query: "license", maxFragments: 4, exclude: first });
    expect(next.every(f => f.end <= first[0]!.start || f.start >= first[0]!.end)).toBe(true);
    expect(first[0]?.exactText.length).toBeLessThanOrEqual(300);
  });

  it("follows an actual GitHub raw-file link and retains page/file acquisition hashes", async () => {
    const request = vi.fn().mockResolvedValueOnce({ ...response('<title>LICENSE</title><a href="https://github.com/example/repo/raw/refs/heads/main/LICENSE">Raw</a>'), url: "https://github.com/example/repo/blob/main/LICENSE" })
      .mockResolvedValueOnce({ ...response("Original license text, not the GitHub interface shell.", "text/plain"), url: "https://raw.githubusercontent.com/example/repo/refs/heads/main/LICENSE" });
    const reader = createDocumentReader({ storageDir: await directory(), request });
    const { document } = await reader.read("https://github.com/example/repo/blob/main/LICENSE");
    expect(document.text).toBe("Original license text, not the GitHub interface shell.");
    expect(document.requestedUrl).toContain("/blob/main/LICENSE");
    expect(document.finalUrl).toContain("raw.githubusercontent.com");
    expect(document.rawSources).toHaveLength(2); await reader.load(document.id);
  });

  it("persists a cancelled attempt while retaining previous successful acquisitions", async () => {
    const controller = new AbortController();
    const request = vi.fn().mockResolvedValueOnce(response()).mockImplementationOnce(async () => {
      controller.abort(new DOMException("Explicit synthetic cancellation", "AbortError")); throw controller.signal.reason;
    });
    const reader = createDocumentReader({ storageDir: await directory(), signal: controller.signal, request });
    const good = (await reader.read("https://example.com/spec")).document;
    await expect(reader.read("https://example.com/another")).rejects.toMatchObject({ name: "AbortError" });
    expect(reader.journal.actions.map(a => a.status)).toEqual(["READ", "FAILED"]);
    expect(good.text).toContain("128K tokens");
    expect(reader.journal.actions[1]?.documentId).toMatch(/^[a-f0-9]{64}$/);
  });
});
