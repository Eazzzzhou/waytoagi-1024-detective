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
beforeEach(() => { request.mockReset(); vi.stubEnv("TENCENTCLOUD_WSA_APIKEY", ""); vi.stubEnv("TENCENTCLOUD_WSA_APIKEY_FILE", ""); vi.stubEnv("YUANBAO_IMPORT_PATH", ""); vi.stubEnv("X_BEARER_TOKEN", ""); });
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
  it("requires identity confirmation for unknown and ambiguous products without network guessing", async () => {
    for (const question of ["UnknownProduct features?", "Compare Dify and Cursor"]) {
      expect((await createCollectionProviders().resolve(question)).confirmationStatus).toBe("NEEDS_CONFIRMATION");
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
    request.mockResolvedValue({ url: "https://unrelated.example/", status: 200, contentType: "text/html", text: html });
    expect((await createCollectionProviders().resolve("What is Dify?")).confirmationStatus).toBe("NEEDS_CONFIRMATION");
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
});
