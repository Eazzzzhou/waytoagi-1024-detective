import assert from "node:assert/strict";
import { readFile, readdir, access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

async function markdown(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  return (await Promise.all(entries.filter((entry) => !["archive", "reference"].includes(entry.name)).map((entry) => entry.isDirectory() ? markdown(join(folder, entry.name)) : Promise.resolve(entry.name.endsWith(".md") ? [join(folder, entry.name)] : [])))).flat();
}
const paths = ["README.md", ...await markdown("docs"), ...await markdown("cases")];
const broken: string[] = [];
const brokenAnchors: string[] = [];
const skippedLocalEvidence: string[] = [];

/** GitHub-compatible enough for this repository: keep letters/numbers/CJK, spaces become dashes. */
function slug(heading: string): string {
  return heading.trim().toLowerCase().replaceAll("`", "").replace(/[^\p{L}\p{N}\-_ ]/gu, "").replaceAll(" ", "-");
}

const headingCache = new Map<string, Set<string>>();
async function anchors(path: string): Promise<Set<string>> {
  const cached = headingCache.get(path);
  if (cached) return cached;
  const result = new Set<string>();
  const seen = new Map<string, number>();
  const source = await readFile(path, "utf8");
  for (const match of source.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) {
    const base = slug(match[1]!);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    result.add(count === 0 ? base : `${base}-${count}`);
  }
  headingCache.set(path, result);
  return result;
}

for (const path of paths) {
  const source = await readFile(path, "utf8");
  for (const match of source.matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))\)/g)) {
    const link = (match[1] ?? match[2])!;
    const [rawTarget = "", rawAnchor = ""] = link.split("#");
    if (/^[a-z][a-z0-9+.-]*:/i.test(rawTarget)) continue;
    const target = decodeURIComponent(rawTarget);
    // Local evidence paths under .cache are deliberately machine-local and gitignored.
    if (/(^|\/)\.cache\//.test(target)) { skippedLocalEvidence.push(`${path}: ${target}`); continue; }
    const absolute = target ? resolve(dirname(path), target) : resolve(path);
    try { await access(absolute); }
    catch { broken.push(`${path}: ${target}`); continue; }
    if (!rawAnchor || !absolute.endsWith(".md")) continue;
    const anchor = decodeURIComponent(rawAnchor).toLowerCase();
    if (!(await anchors(absolute)).has(anchor)) brokenAnchors.push(`${path}: ${target}#${rawAnchor}`);
  }
}
const result = {
  status: broken.length || brokenAnchors.length ? "failed" : "passed",
  documents: paths.length, broken, brokenAnchors,
  skippedLocalEvidence: skippedLocalEvidence.length
};
await mkdir(".cache/acceptance", { recursive: true });
await writeFile(".cache/acceptance/docs.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
assert.equal(broken.length, 0, "Active documentation has broken local links");
assert.equal(brokenAnchors.length, 0, "Active documentation has broken heading anchors");
