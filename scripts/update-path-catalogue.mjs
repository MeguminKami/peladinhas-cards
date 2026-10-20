import { readFile, writeFile } from "node:fs/promises";
import { PATH_ROUTES, PATH_FUSIONS } from "../js/path-model.js";
import {
  pathMissionTemplates,
  pathObjectiveLines,
} from "../js/path-missions.js";
const file = new URL(
  "../docs/reference/path-mission-catalogue.md",
  import.meta.url,
);
const routes = [...PATH_ROUTES, ...PATH_FUSIONS];
const old = await readFile(file, "utf8");
const first = old.indexOf("## " + routes[0].label);
if (first < 0) throw Error("Missing catalogue sections");
const intro = old.slice(0, first).trimEnd() + "\n\n";
const sections = routes.map((route) => {
  const rows = pathMissionTemplates(route.id, 0, 0).map(
    (row) =>
      pathMissionTemplates(route.id, 0, 1).find(
        (candidate) => candidate.templateId === row.templateId,
      ) || row,
  );
  return (
    "## " +
    route.label +
    "\n\n| Modelo | Família | Objetivo no próximo jogo |\n| --- | --- | --- |\n" +
    rows
      .map(
        (row) =>
          "| " +
          row.title +
          " | " +
          row.family +
          " | " +
          pathObjectiveLines(row.objective).join(" **e** ") +
          " |",
      )
      .join("\n")
  );
});
await writeFile(file, intro + sections.join("\n\n") + "\n");
console.log(
  "Catálogo atualizado: " +
    routes.reduce(
      (sum, route) => sum + pathMissionTemplates(route.id).length,
      0,
    ) +
    " modelos.",
);
