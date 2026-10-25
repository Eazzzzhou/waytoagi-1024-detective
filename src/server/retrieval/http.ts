import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { isIP } from "node:net";
import { createHash } from "node:crypto";

// Resolve once and pin the selected public address during connection (including redirects).
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a = 0, b = 0] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && [0, 168].includes(b)) || (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
  }
  return isIP(address) === 6 && /^[23]/i.test(address) && !/^2001:(db8|0:)/i.test(address);
}

export function publicUrl(input: string): URL {
  const url = new URL(input);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
    (url.port && !["80", "443"].includes(url.port))) throw new Error("Unsupported source URL");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || (isIP(host) && !isPublicAddress(host))) throw new Error("Private source address rejected");
  return url;
}

/** Remove navigation/tracking decoration only; preserve semantic query parameters. */
export function normalizeSourceUrl(input: string): string {
  const url = publicUrl(input);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || /^(fbclid|gclid|msclkid|_hsenc|_hsmi|mkt_tok)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.href;
}

export interface HttpAttempt {
  url: string; method: string; startedAt: string; finishedAt: string | null;
  requestSent: boolean; status: number | null; error: string | null;
}
export interface HttpRequestOptions {
  method?: string; body?: string; headers?: Record<string, string>; maxBytes?: number;
  onAttempt?: (attempt: HttpAttempt) => void;
  followRedirects?: boolean;
}
export interface HttpTextResponse {
  url: string; status: number; text: string; contentType: string;
  /** Original response bytes, distinct from normalized document/fragment text. */
  rawBytes?: Buffer; rawHash?: string; byteLength?: number; headers?: Record<string, string>;
}

export async function requestText(input: string, signal: AbortSignal, options: HttpRequestOptions = {}, redirects = 0): Promise<HttpTextResponse> {
  const attempt: HttpAttempt = { url: publicUrl(input).href, method: options.method ?? "GET", startedAt: new Date().toISOString(),
    finishedAt: null, requestSent: false, status: null, error: null };
  options.onAttempt?.(attempt);
  try {
    return await requestTextAttempt(input, signal, options, redirects, attempt);
  } catch (error) {
    attempt.error = error instanceof Error ? error.message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 500) : "HTTP attempt failed";
    throw error;
  } finally {
    attempt.finishedAt = new Date().toISOString();
  }
}

async function requestTextAttempt(input: string, signal: AbortSignal, options: HttpRequestOptions, redirects: number, attempt: HttpAttempt): Promise<HttpTextResponse> {
  signal.throwIfAborted();
  const url = publicUrl(input);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  // DNS itself is raced against cancellation; a late DNS result cannot start a request.
  const addresses = await new Promise<Awaited<ReturnType<typeof lookup>>[]>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    lookup(host, { all: true }).then(value => { signal.removeEventListener("abort", abort); resolve(value); }, error => { signal.removeEventListener("abort", abort); reject(error); });
  });
  signal.throwIfAborted();
  const localTun = process.env.COLLECTION_DNS_MODE === "local-tun" && !isIP(host);
  const permitted = (address: string) => isPublicAddress(address) ||
    (localTun && /^198\.(18|19)\./.test(address));
  if (!addresses.length || addresses.some(a => !permitted(a.address))) throw new Error("Non-public DNS answer rejected (local TUN fake-IP DNS requires COLLECTION_DNS_MODE=local-tun)");
  const address = addresses[0]!;
  const result = await new Promise<Omit<HttpTextResponse, "url"> & { location?: string }>((resolve, reject) => {
    const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      method: options.method ?? "GET", signal, family: address.family,
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
      headers: { "User-Agent": "Anjuan-Collection/1.0", Accept: "text/html,application/json,text/plain,application/rss+xml", "Accept-Encoding": "identity", ...options.headers }
    }, res => {
      attempt.status = res.statusCode ?? 0;
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > (options.maxBytes ?? 2_000_000)) { res.destroy(new Error("Source exceeds byte budget")); return; }
        chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => {
        const rawBytes = Buffer.concat(chunks);
        const headers: Record<string, string> = {};
        for (const key of ["content-type", "content-security-policy", "location", "access-control-allow-origin", "access-control-allow-headers", "access-control-allow-methods", "cross-origin-resource-policy"]) {
          const value = res.headers[key]; if (typeof value === "string") headers[key] = value;
        }
        resolve({ status: res.statusCode ?? 0, text: rawBytes.toString("utf8"), rawBytes,
          rawHash: createHash("sha256").update(rawBytes).digest("hex"), byteLength: rawBytes.length, headers,
          ...(res.headers.location ? { location: res.headers.location } : {}), contentType: res.headers["content-type"] ?? "" });
      });
    });
    req.on("error", reject); attempt.requestSent = true; req.end(options.body);
  });
  if (options.followRedirects !== false && [301, 302, 303, 307, 308].includes(result.status) && result.location) {
    if (redirects >= 3) throw new Error("Redirect budget exhausted");
    // Never forward credentials or POST bodies to a redirect destination.
    if (options.method === "POST" || options.headers?.Authorization) throw new Error("Authenticated redirects rejected");
    return requestText(new URL(result.location, url).href, signal, options.onAttempt ? { onAttempt: options.onAttempt } : {}, redirects + 1);
  }
  return { ...result, url: url.href };
}
