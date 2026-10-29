import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, extname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const documents = [resolve(root, "README.md"), resolve(root, "QuestETC.md"), resolve(root, "DEPLOY.md")];
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (entry.name.endsWith(".md")) documents.push(path);
  }
}
scan(resolve(root, "docs"));
scan(resolve(root, "design"));
const slug = (value) =>
  value
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}_\-\s]/gu, "")
    .replace(/\s/g, "-");
function anchors(file) {
  const text = readFileSync(file, "utf8");
  const seen = new Map();
  const list = new Set(
    [...text.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]),
  );
  for (const match of text.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const id = slug(match[1]);
    const n = seen.get(id) || 0;
    seen.set(id, n + 1);
    list.add(id + (n ? "-" + n : ""));
  }
  return list;
}
const errors = [];
let count = 0;
for (const file of documents) {
  const source = readFileSync(file, "utf8").replace(/```[^]*?```/g, "");
  const targets = [
    ...source.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g),
    ...source.matchAll(/\b(?:src|href)=["']([^"']+)["']/g),
  ].map((match) => match[1]);
  for (let target of targets) {
    if (/^(?:https?:|mailto:|data:)/.test(target)) continue;
    target = target.replace(/^<|>$/g, "");
    const [path, hash] = target.split("#");
    let resolved;
    try {
      resolved = path ? resolve(dirname(file), decodeURIComponent(path)) : file;
    } catch {
      errors.push(`${relative(root, file)}: invalid path ${target}`);
      continue;
    }
    count++;
    if (
      relative(root, resolved).startsWith(".." + sep) ||
      !existsSync(resolved)
    ) {
      errors.push(`${relative(root, file)}: missing ${target}`);
      continue;
    }
    if (
      hash &&
      extname(resolved) === ".md" &&
      !anchors(resolved).has(decodeURIComponent(hash))
    )
      errors.push(`${relative(root, file)}: missing anchor ${target}`);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Documentação: ${documents.length} documentos e ${count} referências locais válidas.`,
  );
