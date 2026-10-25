import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { isIP } from "node:net";

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

export async function requestText(input: string, signal: AbortSignal, options: {
  method?: string; body?: string; headers?: Record<string, string>; maxBytes?: number;
} = {}, redirects = 0): Promise<{ url: string; status: number; text: string; contentType: string }> {
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
  const result = await new Promise<{ status: number; text: string; location?: string; contentType: string }>((resolve, reject) => {
    const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      method: options.method ?? "GET", signal, family: address.family,
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
      headers: { "User-Agent": "Anjuan-Collection/1.0", Accept: "text/html,application/json,text/plain,application/rss+xml", "Accept-Encoding": "identity", ...options.headers }
    }, res => {
      const chunks: Buffer[] = []; let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > (options.maxBytes ?? 2_000_000)) { res.destroy(new Error("Source exceeds byte budget")); return; }
        chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8"),
        ...(res.headers.location ? { location: res.headers.location } : {}), contentType: res.headers["content-type"] ?? "" }));
    });
    req.on("error", reject); req.end(options.body);
  });
  if ([301, 302, 303, 307, 308].includes(result.status) && result.location) {
    if (redirects >= 3) throw new Error("Redirect budget exhausted");
    // Never forward credentials or POST bodies to a redirect destination.
    if (options.method === "POST" || options.headers?.Authorization) throw new Error("Authenticated redirects rejected");
    return requestText(new URL(result.location, url).href, signal, {}, redirects + 1);
  }
  return { ...result, url: url.href };
}
