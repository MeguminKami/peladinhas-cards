import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
for (const dir of [".", "js", "functions", "scripts"])
  for (const file of readdirSync(dir).filter((f) => /\.m?js$/.test(f))) {
    const r = spawnSync(process.execPath, ["--input-type=module", "--check"], {
      input: readFileSync(`${dir}/${file}`),
      encoding: "utf8",
    });
    if (r.status !== 0) {
      console.error(`${dir}/${file}: ${r.stderr}`);
      process.exitCode = 1;
    }
  }
if (!process.exitCode)
  console.log("Todos os módulos passam a verificação de sintaxe ES Modules.");
if (!process.exitCode) {
  const result = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit", "--noUnusedLocals", "--noUnusedParameters"], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status || 1;
}
