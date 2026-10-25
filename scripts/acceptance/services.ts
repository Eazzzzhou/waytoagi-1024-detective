import "dotenv/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createModelProvider } from "../../src/server/models";
import { readDatabaseUrl, readTestDatabaseUrl } from "../../src/server/env";

/** Offline preflight only: never print values, paths, URLs, exception text or keys. */
export function inspectServices(env: Record<string, string | undefined>, exists: (path: string) => boolean = existsSync) {
  const present = (key: string) => Boolean(env[key]?.trim());
  const model = (prefix: string) => {
    const required = ["BASE_URL", "NAME", "API_KEY"].map(suffix => `${prefix}_${suffix}`);
    const missing = required.filter(key => !present(key));
    if (missing.length) return { status: "MISSING" as const, missing, identity: null };
    try {
      const config = createModelProvider({ env, prefix }).config!();
      return { status: "CONFIGURED_NOT_VERIFIED" as const, missing: [], identity: `${config.provider}/${config.model}` };
    } catch { return { status: "INVALID_CONFIG" as const, missing: [], identity: null }; }
  };
  const primary = model("MODEL"), second = model("REVIEW_MODEL");
  const safeModel = ({ status, missing }: ReturnType<typeof model>) => ({ status, missing });
  const reviewer = { ...safeModel(second), independentIdentity: primary.identity && second.identity ? primary.identity !== second.identity : null };
  const direct = present("TENCENTCLOUD_WSA_APIKEY");
  const keyFile = present("TENCENTCLOUD_WSA_APIKEY_FILE") && exists(env.TENCENTCLOUD_WSA_APIKEY_FILE!);
  const imported = present("YUANBAO_IMPORT_PATH") && exists(env.YUANBAO_IMPORT_PATH!);
  const search = { status: direct || keyFile ? "CONFIGURED_NOT_VERIFIED" : "MISSING", keySource: direct ? "ENVIRONMENT" : keyFile ? "FILE_NOT_VALIDATED" : "NONE", manualImport: imported ? "FILE_PRESENT_QUERY_NOT_VERIFIED" : "NOT_CONFIGURED" };
  let database = "INVALID_OR_MISSING", testDatabase = "INVALID_OR_MISSING";
  try { readDatabaseUrl(env); database = "CONFIGURED_NOT_CONNECTED"; } catch { /* no URL in output */ }
  try { readTestDatabaseUrl(env); testDatabase = "CONFIGURED_NOT_CONNECTED"; } catch { /* no URL in output */ }
  return {
    scope: "OFFLINE_CONFIG_ONLY", primary: safeModel(primary), reviewer, search, database, testDatabase,
    tavily: present("TAVILY_API_KEY") ? "AUTH_CONFIGURED_NOT_VERIFIED" : "KEYLESS_FALLBACK_NOT_VERIFIED",
    browser: present("COLLECTION_BROWSER_EXECUTABLE") ? exists(env.COLLECTION_BROWSER_EXECUTABLE!) ? "EXECUTABLE_PRESENT_NOT_VERIFIED" : "EXECUTABLE_MISSING" : "AUTO_DISCOVERY_NOT_VERIFIED",
    readyForAuthenticatedInvestigation: primary.status === "CONFIGURED_NOT_VERIFIED" && (direct || keyFile),
    note: "Configuration presence does not prove authentication, quota, connectivity, real generation or acceptance. No network requests were sent."
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = inspectServices(process.env);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.readyForAuthenticatedInvestigation ? 0 : 2;
}
