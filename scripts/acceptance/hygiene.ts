import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";

const MAX_BYTES = 2_000_000;
const FORBIDDEN = /\.(?:exe|dll|dylib|so|node|pdb|pyc|zip|7z|rar)$/i;

// `git ls-files` reads the index, so ignored/generated files do not trip this check.
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "buffer" }).toString("utf8").split("\0").filter(Boolean);
const forbidden: string[] = [];
const oversized: { path: string; bytes: number }[] = [];
for (const path of tracked) {
  if (FORBIDDEN.test(path)) forbidden.push(path);
  const info = await stat(path);
  if (info.size > MAX_BYTES) oversized.push({ path, bytes: info.size });
}
const result = { status: forbidden.length || oversized.length ? "failed" : "passed", trackedFiles: tracked.length, maxBytes: MAX_BYTES, forbidden, oversized };
await mkdir(".cache/acceptance", { recursive: true });
await writeFile(".cache/acceptance/hygiene.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
assert.equal(forbidden.length, 0, "Tracked files include an executable or archive");
assert.equal(oversized.length, 0, "Tracked files exceed the repository size budget");
