import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { D1CaseRecord } from "./rules";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const posix = (value: string) => value.split(sep).join("/");

function frontMatter(text: string): string {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) throw new Error("案例缺少 YAML front matter");
  return match[1];
}

function scalar(front: string, key: string): string | null {
  const match = front.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  if (!match?.[1]) return null;
  const value = match[1].trim();
  if (value === "null" || value === "~") return null;
  return value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

function questionFromCase(text: string): string {
  const section = text.split("### 2.1 用户问题原话")[1]?.split("\n## ")[0] ?? "";
  const line = section.split(/\r?\n/).map((item) => item.trim()).find((item) => item.startsWith(">") && !item.startsWith("> **") && !item.startsWith("> 本"));
  const question = line?.replace(/^>\s?/, "").trim() ?? "";
  if (!question) throw new Error("案例 §2.1 未找到用户问题原文");
  return question;
}

export async function loadCaseRecord(caseId: string): Promise<D1CaseRecord> {
  if (!/^[ABC]-\d{2}$/.test(caseId)) throw new Error(`案例 ID 必须是 A-01/B-01/C-01 形式：${caseId}`);
  const caseType = caseId[0] as "A" | "B" | "C";
  const casePath = join("cases", caseType, caseId, "case.md");
  const referencePath = join("cases", caseType, caseId, "reference.md");
  const [caseText, referenceText] = await Promise.all([readFile(casePath, "utf8"), readFile(referencePath, "utf8")]);
  const front = frontMatter(caseText);
  const referenceFront = frontMatter(referenceText);
  const question = questionFromCase(caseText);
  const questionSha256 = sha256(question);
  const declaredSha = scalar(front, "question_sha256");
  if (declaredSha && declaredSha !== questionSha256) throw new Error(`问题 hash 不匹配：${casePath}`);
  const declaredType = scalar(front, "case_type");
  if (declaredType && declaredType !== caseType) throw new Error(`case_type 与目录不一致：${casePath}`);
  const title = scalar(front, "title");
  if (!title) throw new Error(`案例缺少 title：${casePath}`);

  return {
    caseId,
    caseType,
    title,
    question,
    questionSha256,
    casePath: posix(relative(process.cwd(), casePath)),
    referencePath: posix(relative(process.cwd(), referencePath)),
    caseSha256: sha256(caseText),
    referenceSha256: sha256(referenceText),
    referenceStatus: scalar(referenceFront, "reference_status"),
    confirmedBy: scalar(referenceFront, "confirmed_by"),
    confirmedAt: scalar(referenceFront, "confirmed_at")
  };
}
