import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

function sources(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => entry.name === "generated" ? [] : entry.isDirectory() ? sources(join(folder, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(folder, entry.name)] : []);
}
it("keeps production imports out of test fixtures and keeps Worker/contracts independent of Next", () => {
  const violations: string[] = [];
  for (const path of sources("src")) {
    const name = path.replaceAll("\\", "/");
    const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
    function check(specifier: string) {
      const target = specifier.startsWith(".") ? relative(resolve("."), resolve(path, "..", specifier)).replaceAll("\\", "/") : specifier;
      if (/(^|\/)tests(\/|$)/.test(target)) violations.push(`${name}: test import`);
      if (/^src\/(server|worker|contracts)\//.test(name) && /^(next(?:\/|$)|server-only$)/.test(specifier)) violations.push(`${name}: Next runtime import`);
      if (/^src\/(components|frontend)\//.test(name) && /(?:^|\/)(server|worker|generated)(?:\/|$)|^(pg$|@prisma\/|node:)/.test(target)) violations.push(`${name}: server import`);
    }
    function visit(node: ts.Node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) check(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === "require")) {
        const first = node.arguments[0];
        if (first && ts.isStringLiteralLike(first)) check(first.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  expect(violations).toEqual([]);
});
