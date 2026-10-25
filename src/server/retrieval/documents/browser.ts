import { publicUrl, requestText } from "../http";
import type { DocumentRenderer } from "./types";

/** Isolated browser; every HTTP resource is fetched by our pinned-public-IP transport. */
export function createSafeBrowserRenderer(options: { executablePath: string; maxRequests?: number; maxBytes?: number }): DocumentRenderer {
  return async (url, signal, onAttempt) => {
    publicUrl(url); signal.throwIfAborted();
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({ executablePath: options.executablePath, headless: true,
      args: ["--disable-background-networking", "--disable-quic", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"] });
    const close = () => { void browser.close().catch(() => undefined); };
    signal.addEventListener("abort", close, { once: true });
    try {
      signal.throwIfAborted();
      const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: false, ignoreHTTPSErrors: false });
      await context.routeWebSocket("**", socket => socket.close());
      let requests = 0; let bytes = 0;
      let mainError: string | null = null;
      let limitError: string | null = null;
      await context.route("**/*", async route => {
        const request = route.request();
        try {
          const target = publicUrl(request.url());
          if (!["GET", "HEAD"].includes(request.method())) throw new Error("Renderer only permits read-only GET/HEAD requests");
          if (++requests > (options.maxRequests ?? 100)) { limitError = "Renderer request budget exhausted"; throw new Error(limitError); }
          // Images, fonts and media are not needed to obtain original article text.
          if (["image", "font", "media"].includes(request.resourceType())) { await route.abort(); return; }
          const response = await requestText(target.href, signal, { method: request.method(), followRedirects: false, maxBytes: 8_000_000,
            ...(onAttempt ? { onAttempt } : {}) });
          bytes += response.byteLength ?? Buffer.byteLength(response.text);
          if (bytes > (options.maxBytes ?? 30_000_000)) { limitError = "Renderer total byte budget exhausted"; throw new Error(limitError); }
          if (request.isNavigationRequest() && request.frame() === context.pages()[0]?.mainFrame() && response.status >= 400) {
            mainError = `Rendered source HTTP ${response.status}`;
          }
          await route.fulfill({ status: response.status, headers: response.headers ?? { "content-type": response.contentType },
            body: response.rawBytes ?? Buffer.from(response.text, "utf8") });
        } catch (error) {
          if (request.isNavigationRequest()) mainError ??= error instanceof Error ? error.message : "Renderer navigation failed";
          await route.abort().catch(() => undefined);
        }
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      // Wait for the application's network work, bounded by the caller's total signal.
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      signal.throwIfAborted();
      if (mainError || limitError) throw new Error(mainError ?? limitError!);
      const html = await page.content();
      if (/captcha|verify you are human|just a moment|access denied/i.test(html.slice(0, 12000))) throw new Error("Rendered source returned access challenge; no bypass attempted");
      return { html, finalUrl: publicUrl(page.url()).href, engine: "playwright-core", version: `1.64.1/chromium-${browser.version()}` };
    } finally {
      signal.removeEventListener("abort", close);
      await browser.close();
    }
  };
}
