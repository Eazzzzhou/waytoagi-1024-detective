import "dotenv/config";
import assert from "node:assert/strict";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
const result = { status: exposed.size ? "failed" : "passed", clientAssets: paths.length, configuredSecretNamesChecked: secrets.map(([key]) => key), exposedNames: [...exposed] };
await mkdir(".cache/acceptance", { recursive: true });
await writeFile(".cache/acceptance/bundles.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
assert.equal(exposed.size, 0, "Client bundles contain a configured server secret or server/test runtime");
