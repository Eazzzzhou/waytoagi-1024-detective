import assert from "node:assert/strict";
import { readFile, readdir, access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

async function markdown(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  return (await Promise.all(entries.filter((entry) => !["archive", "reference"].includes(entry.name)).map((entry) => entry.isDirectory() ? markdown(join(folder, entry.name)) : Promise.resolve(entry.name.endsWith(".md") ? [join(folder, entry.name)] : [])))).flat();
}
const paths = ["README.md", ...await markdown("docs"), ...await markdown("cases")];
const broken: string[] = [];
for (const path of paths) {
  const source = await readFile(path, "utf8");
  for (const match of source.matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))\)/g)) {
    const target = (match[1] ?? match[2])!.split("#")[0]!;
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    try { await access(resolve(dirname(path), decodeURIComponent(target))); }
    catch { broken.push(`${path}: ${target}`); }
  }
}
const result = { status: broken.length ? "failed" : "passed", documents: paths.length, broken };
await mkdir(".cache/acceptance", { recursive: true });
await writeFile(".cache/acceptance/docs.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
assert.equal(broken.length, 0, "Active documentation has broken local links");
