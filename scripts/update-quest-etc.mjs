// Offline inventory of the actual templates, including phases and rare variants.
import { readFile, writeFile } from "node:fs/promises";
import { PATH_ROUTES, PATH_FUSIONS } from "../js/path-model.js";
import { pathMissionTemplates, pathObjectiveLines } from "../js/path-missions.js";
import { PATH_DIFFICULTY_REVISION, pathRareObjective } from "../js/path-difficulty.js";

const file = new URL("../QuestETC.md", import.meta.url);
const start = "<!-- QUEST_ETC_START -->", end = "<!-- QUEST_ETC_END -->";
const source = await readFile(file, "utf8");
if (source.indexOf(start) < 0 || source.indexOf(end) <= source.indexOf(start))
  throw Error("Marcadores QuestETC em falta.");
const routes = [...PATH_ROUTES, ...PATH_FUSIONS];
const levels = [
  { difficulty: 0, advance: 25, individual: "Bronze", fusion: "Ouro" },
  { difficulty: 1, advance: 50, individual: "Prata", fusion: "Ouro especial" },
  { difficulty: 2, advance: 100, individual: "Ouro", fusion: "Elite" },
  { difficulty: 2, advance: 150, individual: "Ícone", fusion: "Ícone" },
  { difficulty: 2, advance: 200, individual: "Ultimate", fusion: "Ultimate" },
];
const format = value => typeof value === "number" ? String(value).replace(".", ",") : value;
const total = routes.reduce((sum, route) => sum + pathMissionTemplates(route.id).length, 0);
const output = [`Revisão extraída: \`${PATH_DIFFICULTY_REVISION}\`. **${total} modelos**, ${routes.length} percursos/fusões.\n`,
  "### Intervalos por fase e raridade\n",
  "Envelopes conjuntos dos percursos individuais ou fusões, conforme indicado. A inexistência de uma condição num modelo não é um alvo zero. Os comparadores são preservados; `gte` significa ≥ e `gt` significa >. A normalização pode tornar o limiar de uma combinação mais forte.\n",
  "| Grupo | Fase | Raridade | Condição / critério / comparação | Alvos encontrados |",
  "| --- | --- | --- | --- | --- |"]; 
for (const [group, members] of [["Individual", PATH_ROUTES], ["Fusão", PATH_FUSIONS]]) {
  for (const phase of [0, 1, 2]) for (const level of levels) {
    const targets = new Map();
    for (const route of members) for (const template of pathMissionTemplates(route.id, phase, level.difficulty)) {
      const objective = pathRareObjective(template.objective, level.advance, route.id);
      for (const condition of objective.conditions) {
        const key = [condition.metric, condition.criterion || condition.criteria?.join("+") || "", condition.comparison || (condition.metric === "conceded" ? "≤" : condition.metric === "position" ? "=" : "gte")].filter(Boolean).join(" / ");
        if (!targets.has(key)) targets.set(key, []);
        targets.get(key).push(condition.target);
      }
    }
    for (const [key, values] of [...targets].sort(([a], [b]) => a.localeCompare(b))) {
      const unique = [...new Set(values)];
      const range = unique.every(value => typeof value === "number")
        ? Math.min(...unique) === Math.max(...unique) ? format(unique[0]) : `${format(Math.min(...unique))}–${format(Math.max(...unique))}`
        : unique.sort().join(", ");
      output.push(`| ${group} | F${phase} | ${group === "Individual" ? level.individual : level.fusion} | ${key} | ${range} |`);
    }
  }
}
output.push("\n### Exemplos reais de Ícone e Ultimate por caminho\n",
  "Variantes atuais em F0, extraídas dos mesmos modelos D2. Não substituem as restantes alternativas nem congelam os alvos das outras fases. Todas as condições são no próximo jogo.\n",
  "| Caminho | Modelo | Ícone · 150% | Ultimate · 200% |",
  "| --- | --- | --- | --- |");
const examples = {pace:"contribute",shooting:"goals",passing:"quality",dribbling:"contribute",defending:"solid",physical:"team-win",goalkeeping:"solid",stamina:"win",vision:"assists",positioning:"pass",teamwork:"quality",composure:"goal","fusion-predator":"serve","fusion-keeper":"solid","fusion-maestro":"contribute","fusion-central":"solid","fusion-winger":"contribute"};
for (const route of routes) {
  const templates = pathMissionTemplates(route.id,0,2);
  const template = templates.find(row=>row.templateId===`${route.id}:${examples[route.id]}`);
  if (!template) throw Error(`Exemplo em falta: ${route.id}`);
  const describe = advance => pathObjectiveLines(pathRareObjective(template.objective,advance,route.id)).join(" **e** ");
  output.push(`| ${route.label} | ${template.title} | ${describe(150)} | ${describe(200)} |`);
}
output.push("\n### Modelos disponíveis e raridades de entrada\n",
  "A lista mostra a elegibilidade do modelo, não uma garantia de aparecer no sorteio. «Desde» refere-se à primeira raridade dentro do respetivo tipo de percurso. Não existe uma regra global que reserve todas as combinações para Ouro: quase todos os modelos já podem surgir em D0, com alvos ajustados. A vitória isolada só existe em D0; empate, derrota obrigatória e jogo sem sofrer deixaram de integrar o catálogo atual.\n");
for (const route of routes) {
  const fusion = PATH_FUSIONS.some(row => row.id === route.id);
  output.push(`#### ${route.label}\n`, "| ID estável | Missão | Família | Raridades possíveis |", "| --- | --- | --- | --- |");
  for (const template of pathMissionTemplates(route.id, 0, 0)) {
    const allowed = levels.filter(level => pathMissionTemplates(route.id, 0, level.difficulty).some(row => row.templateId === template.templateId));
    // Guard against future phase-only eligibility changes being silently omitted.
    for (const phase of [1, 2]) for (const level of levels) {
      const available = pathMissionTemplates(route.id, phase, level.difficulty).some(row => row.templateId === template.templateId);
      if (available !== allowed.includes(level)) throw Error(`Elegibilidade varia por fase: ${template.templateId}. Atualizar o gerador.`);
    }
    output.push(`| \`${template.templateId}\` | ${template.title} | \`${template.family}\` | ${allowed.map(level => fusion ? level.fusion : level.individual).join(", ")} |`);
  }
  output.push("");
}
const result = source.slice(0, source.indexOf(start) + start.length) + "\n\n" + output.join("\n") + "\n" + source.slice(source.indexOf(end));
if (process.argv.includes("--check")) {
  if (result !== source) throw Error("QuestETC desatualizado. Executar node scripts/update-quest-etc.mjs.");
} else await writeFile(file, result);
console.log(`QuestETC: ${total} modelos, intervalos e elegibilidade conferidos offline.`);
