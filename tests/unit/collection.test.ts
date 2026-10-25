import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EvidenceSchema, ProductIdentitySchema, RetrievalRecordSchema } from "../../src/contracts";
import { createCollectionProviders, extractHtml } from "../../src/server/retrieval/collection";
import { isPublicAddress, publicUrl, requestText } from "../../src/server/retrieval/http";

vi.mock("../../src/server/retrieval/http", async importOriginal => {
  const actual = await importOriginal<typeof import("../../src/server/retrieval/http")>();
  return { ...actual, requestText: vi.fn() };
});
vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));
const request = vi.mocked(requestText);
const identity = ProductIdentitySchema.parse({ name: "Dify", officialWebsite: "https://dify.ai", version: null, plan: null, confirmationStatus: "NEEDS_CONFIRMATION", confirmationBasis: [] });
const html = '<html lang="en"><head><title>Dify</title></head><body><nav>Fake navigation claim</nav><main><p>Dify is an open-source platform for developing LLM applications, with workflows and tools.</p></main></body></html>';
beforeEach(() => { request.mockReset(); vi.stubEnv("TENCENTCLOUD_WSA_APIKEY", ""); vi.stubEnv("TENCENTCLOUD_WSA_APIKEY_FILE", ""); vi.stubEnv("YUANBAO_IMPORT_PATH", ""); vi.stubEnv("X_BEARER_TOKEN", ""); vi.stubEnv("TAVILY_API_KEY", ""); });
afterEach(() => vi.unstubAllEnvs());

describe("real collection boundaries (responses below are explicit test doubles)", () => {
  it("keeps missing credentials a failed search and never invents a request", async () => {
    const result = await createCollectionProviders().search("new question", identity);
    expect(RetrievalRecordSchema.parse(result).status).toBe("FAILED");
    expect(result.error).toMatch(/Missing/); expect(request).not.toHaveBeenCalled();
  });
  it("does not treat HTTP 200 service errors as search success", async () => {
    vi.stubEnv("TENCENTCLOUD_WSA_APIKEY", "sk-test-only");
    request.mockResolvedValue({ url: "https://api.wsa.cloud.tencent.com/SearchPro", status: 200, contentType: "application/json", text: JSON.stringify({ Response: { Error: { Code: "UnauthorizedOperation" } } }) });
    const result = await createCollectionProviders().search("new question", identity);
    expect(result.status).toBe("FAILED"); expect(result.error).toContain("UnauthorizedOperation"); expect(result.returnedSources).toEqual([]);
  });
  it("never upgrades search snippets to original evidence", async () => {
    vi.stubEnv("TENCENTCLOUD_WSA_APIKEY", "sk-test-only");
    request.mockResolvedValue({ url: "https://api.wsa.cloud.tencent.com/SearchPro", status: 200, contentType: "application/json", text: JSON.stringify({ Response: { Pages: [JSON.stringify({ url: "https://example.com/story", title: "Test", passage: "summary only" })] } }) });
    const result = await createCollectionProviders().search("new question", identity);
    expect(result.returnedSources[0]).toMatchObject({ snippet: "summary only", adoption: "PENDING", evidenceId: null });
  });
  it("persists exact normalized article text, reproducible location and excerpt hash", async () => {
    request.mockResolvedValue({ url: "https://dify.ai/", status: 200, contentType: "text/html; charset=utf-8", text: html });
    const result = EvidenceSchema.parse(await createCollectionProviders().fetch("https://dify.ai", { question: "Dify open-source", officialWebsite: "https://dify.ai" }));
    expect(result.readStatus).toBe("READ"); expect(result.originalExcerpt).toBe(extractHtml(html, "Dify open-source")?.excerpt);
    expect(result.contentHash).toBe(createHash("sha256").update(result.originalExcerpt!).digest("hex"));
    expect(result.originalLocation?.locator).toContain("normalized UTF-16");
    expect(result.metadata).toMatchObject({ sourceType: "OFFICIAL", originGroupId: "official-publisher:dify.ai", independence: "UNKNOWN", author: null, publishedAt: null, productVersion: null, plan: null });
    expect(result.originalExcerpt).not.toContain("Fake navigation");
  });
  it("returns unread states with no invented quotes for challenge, shell, unsupported media and HTTP errors", async () => {
    for (const response of [
      { status: 403, contentType: "text/html", text: "forbidden" },
      { status: 200, contentType: "text/html", text: "<html><body><script>app()</script></body></html>" },
      { status: 200, contentType: "application/pdf", text: "%PDF" },
      { status: 200, contentType: "text/html", text: "<title>Just a moment</title>" }
    ]) {
      request.mockResolvedValue({ url: "https://example.com/", ...response });
      const result = EvidenceSchema.parse(await createCollectionProviders().fetch("https://example.com"));
      expect(result.readStatus).not.toBe("READ"); expect(result.originalExcerpt).toBeNull(); expect(result.contentHash).toBeNull(); expect(result.readError).toBeTruthy();
    }
  });
  it("keeps unknown and ambiguous identities unresolved without requiring user research materials", async () => {
    for (const question of ["UnknownProduct features?", "Compare Dify and Cursor"]) {
      expect((await createCollectionProviders().resolve(question)).confirmationStatus).toBe("UNRESOLVED");
    }
    expect(request).not.toHaveBeenCalled();
  });
  it("propagates cancellation instead of returning a misleading failed source", async () => {
    const controller = new AbortController();
    request.mockImplementation(async () => { controller.abort(new DOMException("Cancelled", "AbortError")); throw controller.signal.reason; });
    await expect(createCollectionProviders({ signal: controller.signal }).fetch("https://example.com")).rejects.toMatchObject({ name: "AbortError" });
  });
  it("marks X without access restricted and never reads its HTML shell", async () => {
    const result = await createCollectionProviders().fetch("https://x.com/dify_ai/status/123456");
    expect(result.readStatus).toBe("RESTRICTED"); expect(result.originalExcerpt).toBeNull(); expect(request).not.toHaveBeenCalled();
  });
  it("rejects loopback, private networks, credentials and non-HTTP protocols", () => {
    for (const url of ["http://127.0.0.1/", "http://10.0.0.1/", "http://[::1]/", "https://user:secret@example.com/", "file:///tmp/secret", "http://169.254.169.254/"]) expect(() => publicUrl(url)).toThrow();
    expect(isPublicAddress("198.18.1.2")).toBe(false); expect(isPublicAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicAddress("1.1.1.1")).toBe(true);
  });
  it("refuses a manual export for a different question", async () => {
    vi.stubEnv("YUANBAO_IMPORT_PATH", "test-double-only.json");
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({ mode: "MANUAL_YUANBAO", query: "old question", calledAt: "2026-01-01T00:00:00Z", capturedAt: "2026-01-01T00:01:00Z", entryUrl: "https://yuanbao.tencent.com/", captureMethod: "explicit test double", responseText: "test response", returnedSources: [] }));
    const result = await createCollectionProviders().search("new question", identity);
    expect(result.status).toBe("FAILED"); expect(result.error).toContain("exactly match"); expect(request).not.toHaveBeenCalled();
  });
  it("never confirms an identity redirected to an unrelated host", async () => {
    vi.stubEnv("TENCENTCLOUD_WSA_APIKEY", "sk-test-only");
    request.mockResolvedValueOnce({ url: "https://api.wsa.cloud.tencent.com/SearchPro", status: 200, contentType: "application/json", text: JSON.stringify({ Response: { Pages: [{ url: "https://dify.ai" }] } }) });
    request.mockResolvedValue({ url: "https://unrelated.example/", status: 200, contentType: "text/html", text: html });
    expect((await createCollectionProviders().resolve("What is Dify?")).confirmationStatus).toBe("UNRESOLVED");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("keeps official subdomains official and lookalike domains unknown", async () => {
    for (const [url, expected] of [["https://docs.dify.ai/home", "OFFICIAL"], ["https://dify-china.com/", "UNKNOWN"]]) {
      request.mockResolvedValue({ url: url!, status: 200, contentType: "text/html", text: html });
      expect((await createCollectionProviders().fetch(url!, { officialWebsite: "https://dify.ai" })).metadata.sourceType).toBe(expected);
    }
  });
  it("reads an individual HN comment with its actual author, timestamp and locator", async () => {
    request.mockResolvedValue({ url: "https://hn.algolia.com/api/v1/items/123", status: 200, contentType: "application/json", text: JSON.stringify({ id: 123, title: "Test story", url: "https://github.com/example/project", children: [{ id: 456, author: "test-author", created_at: "2026-01-01T00:00:00Z", text: "<p>I tried Dify for a specific task and this is my original comment.</p>", children: [] }] }) });
    const result = await createCollectionProviders().fetch("https://news.ycombinator.com/item?id=123", { question: "Dify" });
    expect(result.metadata).toMatchObject({ author: "test-author", publishedAt: "2026-01-01T00:00:00.000Z", contentKind: "UNKNOWN", independence: "UNKNOWN", upstreamUrl: "https://github.com/example/project" });
    expect(result.originalLocation).toMatchObject({ kind: "COMMENT" }); expect(result.originalLocation?.locator).toContain("HN comment #456"); expect(result.originalExcerpt).not.toContain("Test story");
  });

  it("searches an unlisted question with unresolved identity and discovers it from real-read shaped material", async () => {
    vi.stubEnv("TENCENTCLOUD_WSA_APIKEY", "sk-test-only");
    const question = "Quillbench 有哪些功能？";
    request.mockImplementation(async url => url.includes("SearchPro")
      ? { url, status: 200, contentType: "application/json", text: JSON.stringify({ Response: { Pages: [{ url: "https://quillbench.test/docs" }] } }) }
      : url.includes("bing.com") ? { url, status: 200, contentType: "application/rss+xml", text: "<rss><channel/></rss>" }
      : { url, status: 200, contentType: "text/html", text: "<title>Quillbench documentation</title><main><p>Quillbench is a synthetic test product with documented features for this regression test.</p></main>" });
    const result = await createCollectionProviders().collect(question);
    expect(result.retrievalRecords).toHaveLength(2);
    expect(result.retrievalRecords[0]).toMatchObject({ query: question, status: "SUCCEEDED" });
    expect(result.evidence[0]?.readStatus).toBe("READ");
    expect(result.identity).toMatchObject({ name: "Quillbench", confirmationStatus: "CONFIRMED", officialWebsite: "https://quillbench.test" });
  });

  it("retains valid results around malformed links and preserves an individual failed read", async () => {
    vi.stubEnv("TENCENTCLOUD_WSA_APIKEY", "sk-test-only");
    request.mockImplementation(async url => url.includes("SearchPro")
      ? { url, status: 200, contentType: "application/json", text: JSON.stringify({ Response: { Pages: [
        { url: "https://example.com/ok" }, "broken JSON", { url: "http://127.0.0.1/private" }, { url: "https://example.com/fail" }
      ] } }) }
      : { url, status: url.endsWith("fail") ? 404 : 200, contentType: "text/html", text: html });
    const result = await createCollectionProviders().execute({ query: "arbitrary question", entry: "yuanbao" });
    expect(result.retrievalRecords[0]?.status).toBe("SUCCEEDED");
    expect(result.retrievalRecords[0]?.returnedSources).toHaveLength(2);
    expect(result.diagnostics).toHaveLength(2);
    expect(result.evidence.map(e => e.readStatus)).toEqual(["READ", "FAILED"]);
    expect(result.retrievalRecords[0]?.returnedSources.map(s => s.adoption)).toEqual(["ADOPTED", "REJECTED"]);
  });

  it("executes only the selected entry/query and keeps keyless Tavily content a search snippet", async () => {
    request.mockResolvedValue({ url: "https://api.tavily.com/search", status: 200, contentType: "application/json", text: JSON.stringify({ results: [{ url: "https://example.com/story", content: "This is a search summary, not a fetched page." }] }) });
    const result = await createCollectionProviders().execute({ query: "AI selected followup", entry: "tavily", readUrls: [] });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[2]).toMatchObject({ headers: { "X-Tavily-Access-Mode": "keyless" } });
    expect(JSON.parse(request.mock.calls[0]?.[2]?.body ?? "{}").query).toBe("AI selected followup");
    expect(result.evidence).toEqual([]);
    expect(result.retrievalRecords[0]?.returnedSources[0]).toMatchObject({ adoption: "PENDING", evidenceId: null, snippet: expect.any(String) });
  });

  it("reports the exact configuration condition when Tavily capped access is exhausted", async () => {
    request.mockResolvedValue({ url: "https://api.tavily.com/search", status: 429, contentType: "application/json", text: "{}" });
    const record = await createCollectionProviders().searchSecondary("a question");
    expect(record).toMatchObject({ status: "FAILED", error: expect.stringContaining("TAVILY_API_KEY") });
    expect(record.returnedSources).toEqual([]);
  });

  it("retains completed evidence and search links in the journal when a later read is cancelled", async () => {
    vi.stubEnv("TENCENTCLOUD_WSA_APIKEY", "sk-test-only");
    const controller = new AbortController();
    request.mockImplementation(async url => {
      if (url.includes("SearchPro")) return { url, status: 200, contentType: "application/json", text: JSON.stringify({ Response: { Pages: [{ url: "https://example.com/one" }, { url: "https://example.com/two" }] } }) };
      if (url.endsWith("two")) { controller.abort(new DOMException("Cancelled", "AbortError")); throw controller.signal.reason; }
      return { url, status: 200, contentType: "text/html", text: html };
    });
    const provider = createCollectionProviders({ signal: controller.signal });
    await expect(provider.execute({ query: "arbitrary question", entry: "yuanbao" })).rejects.toMatchObject({ name: "AbortError" });
    expect(provider.journal.evidence.map(e => e.readStatus)).toEqual(["READ", "FAILED"]);
    expect(provider.journal.retrievalRecords[0]?.returnedSources[0]).toMatchObject({ adoption: "ADOPTED", evidenceId: provider.journal.evidence[0]!.id });
    expect(provider.journal.evidence[1]?.readError).toBe("Cancelled");
  });

  it("reads each normalized URL once and does not promote a budgeted snippet to original text", async () => {
    vi.stubEnv("TENCENTCLOUD_WSA_APIKEY", "sk-test-only");
    request.mockImplementation(async url => url.includes("SearchPro")
      ? { url, status: 200, contentType: "application/json", text: JSON.stringify({ Response: { Pages: [
        { url: "https://example.com/a#one" }, { url: "https://example.com/a?utm_source=search" }, { url: "https://example.com/b", passage: "summary" }
      ] } }) } : { url, status: 200, contentType: "text/html", text: html });
    const result = await createCollectionProviders().execute({ query: "anything", entry: "yuanbao", maxReads: 1 });
    expect(request).toHaveBeenCalledTimes(2);
    expect(result.evidence.map(e => e.readStatus)).toEqual(["READ", "SNIPPET_ONLY"]);
    expect(result.evidence[1]?.originalExcerpt).toBeNull();
    expect(result.retrievalRecords[0]?.returnedSources[0]?.evidenceId).toBe(result.retrievalRecords[0]?.returnedSources[1]?.evidenceId);
  });

  it("extracts a short table row including cells containing paragraphs for a Chinese fact query", () => {
    const table = '<title>Quillbench API</title><main><p>Quillbench API is a long introductory description for all developers.</p><table><tr><td><p>上下文长度</p></td><td><p>128K</p></td></tr></table></main>';
    expect(extractHtml(table, "Quillbench API 的上下文长度是多少？")?.excerpt).toBe("上下文长度128K");
  });

  it("keeps a per-request timeout local and reads the next source within the shared budget", async () => {
    vi.stubEnv("TENCENTCLOUD_WSA_APIKEY", "sk-test-only");
    request.mockImplementation(async (url, signal) => {
      if (url.includes("SearchPro")) return { url, status: 200, contentType: "application/json", text: JSON.stringify({ Response: { Pages: [{ url: "https://example.com/slow" }, { url: "https://example.com/ok" }] } }) };
      if (url.endsWith("slow")) await new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
      return { url, status: 200, contentType: "text/html", text: html };
    });
    const result = await createCollectionProviders({ timeoutMs: 1000 }).execute({ query: "anything", entry: "yuanbao" }, { timeoutMs: 20 });
    expect(result.evidence.map(e => e.readStatus)).toEqual(["FAILED", "READ"]);
    expect(result.evidence[0]?.readError).toBe("Request time budget exhausted");
  });
});
