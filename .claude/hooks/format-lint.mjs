// PostToolUse hook: compacta (quita líneas en blanco), formatea con Prettier y
// corrige con ESLint los archivos React/TS/JS y Markdown que Claude crea o edita.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
const LINT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const FORMAT_ONLY_EXTS = new Set([".md"]);
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
let input = "";
for await (const chunk of process.stdin) input += chunk;
const filePath = JSON.parse(input || "{}").tool_input?.file_path;
if (!filePath) process.exit(0);
const absPath = path.resolve(projectDir, filePath);
const relPath = path.relative(projectDir, absPath);
if (relPath.startsWith("..") || path.isAbsolute(relPath)) process.exit(0);
const ext = path.extname(absPath).toLowerCase();
if (!LINT_EXTS.has(ext) && !FORMAT_ONLY_EXTS.has(ext)) process.exit(0);
// Quita líneas en blanco fuera de strings, template literals y texto JSX
// (ahí el contenido es significativo). Prettier no las vuelve a añadir.
const stripBlankLines = (code) => {
  const source = ts.createSourceFile(
    absPath,
    code,
    ts.ScriptTarget.Latest,
    true,
    ext === ".ts" ? ts.ScriptKind.TS : ts.ScriptKind.TSX,
  );
  const protectedRanges = [];
  const visit = (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node) ||
      ts.isJsxText(node)
    ) {
      protectedRanges.push([node.getStart(source), node.end]);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const isProtected = (pos) =>
    protectedRanges.some(([start, end]) => pos > start && pos < end);
  let offset = 0;
  return code
    .split("\n")
    .filter((line) => {
      const keep = line.trim() !== "" || isProtected(offset);
      offset += line.length + 1;
      return keep;
    })
    .join("\n");
};
if (LINT_EXTS.has(ext)) {
  const code = readFileSync(absPath, "utf8");
  const compact = stripBlankLines(code);
  if (compact !== code) writeFileSync(absPath, compact);
}
// .bin/*.cmd en Windows requiere shell; se pasa un único string ya entrecomillado.
const run = (bin, args) =>
  spawnSync(
    [`"${path.join(projectDir, "node_modules", ".bin", bin)}"`, ...args].join(
      " ",
    ),
    { cwd: projectDir, encoding: "utf8", shell: true },
  );
const quoted = `"${relPath}"`;
const prettier = run("prettier", ["--write", "--ignore-unknown", quoted]);
if (prettier.status !== 0) {
  process.stderr.write(`Prettier falló en ${relPath}:\n${prettier.stderr}`);
  process.exit(2);
}
if (LINT_EXTS.has(ext)) {
  const eslint = run("eslint", ["--fix", "--no-warn-ignored", quoted]);
  if (eslint.status !== 0) {
    process.stderr.write(
      `ESLint encontró errores en ${relPath}:\n${eslint.stdout}${eslint.stderr}`,
    );
    process.exit(2);
  }
}
