import "dotenv/config";
import assert from "node:assert/strict";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

async function files(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(path, entry.name)) : Promise.resolve(/\.(js|json|map)$/.test(entry.name) ? [join(path, entry.name)] : [])))).flat();
}
const paths = await files(".next/static");
assert(paths.length > 0, "Build client assets before auditing them");
const secrets = Object.entries(process.env).filter(([key, value]) => /DATABASE_URL|(?:API_KEY|TOKEN|SECRET|PASSWORD)$/.test(key) && !key.startsWith("NEXT_PUBLIC_") && value && value.length >= 8);
const exposed = new Set<string>();
for (const path of paths) {
  const source = await readFile(path, "utf8");
  for (const [key, value] of secrets) if (source.includes(value!)) exposed.add(key);
  // Generated database clients or a production fixture import also violate the Web boundary.
  if (/prisma\/client\/runtime|tests\/fixtures\//.test(source)) exposed.add("SERVER_RUNTIME_OR_TEST_FIXTURE");
}
// The demo corpus must stay out of the initial live document. It may exist only in an async chunk.
const demoMarker = "官方宣传与独立实测存在分歧";
const initialHtml = await readFile(".next/server/app/index.html", "utf8");
const initialScripts = [...initialHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(match => match[1]!);
const initialFiles = new Set(initialScripts.map(src => join(".next", src.replace(/^\/_next\//, ""))));
let initialJsBytes = 0;
for (const path of initialFiles) initialJsBytes += (await readFile(path)).byteLength;
const initialJsBudget = 1_100_000;
const demoChunks: string[] = [];
for (const path of paths) {
  if (!path.endsWith(".js") || !path.includes(join(".next", "static", "chunks"))) continue;
  if ((await readFile(path, "utf8")).includes(demoMarker)) demoChunks.push(path);
}
const leakedDemo = demoChunks.filter(path => initialFiles.has(path));
const demoIsolation = {
  marker: demoMarker,
  initialScripts: initialScripts.length,
  initialDemoChunks: leakedDemo.map(path => basename(path)),
  inlineDemoMarker: initialHtml.includes(demoMarker),
  builtDemoChunks: demoChunks.map(path => basename(path)),
  initialJsBytes,
  initialJsBudget
};
const result = { status: exposed.size || leakedDemo.length || demoIsolation.inlineDemoMarker || !demoChunks.length || initialJsBytes > initialJsBudget ? "failed" : "passed", clientAssets: paths.length, configuredSecretNamesChecked: secrets.map(([key]) => key), exposedNames: [...exposed], demoIsolation };
await mkdir(".cache/acceptance", { recursive: true });
await writeFile(".cache/acceptance/bundles.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
assert.equal(exposed.size, 0, "Client bundles contain a configured server secret or server/test runtime");
assert.equal(leakedDemo.length, 0, "Demo scenario data is present in an initial page chunk");
assert.equal(demoIsolation.inlineDemoMarker, false, "Demo scenario data is inlined into the initial HTML");
assert.ok(demoChunks.length > 0, "Demo scenario chunk was not built; verify the demo entry still exists");
assert.ok(initialJsBytes <= initialJsBudget, `Initial JavaScript is ${initialJsBytes} bytes; budget is ${initialJsBudget}`);
