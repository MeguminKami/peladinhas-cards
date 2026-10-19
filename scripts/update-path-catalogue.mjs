import { readFile, writeFile } from "node:fs/promises";
import { PATH_ROUTES, PATH_FUSIONS } from "../js/path-model.js";
import { pathMissionTemplates, pathObjectiveLines } from "../js/path-missions.js";

const file=new URL("../docs/reference/path-mission-catalogue.md",import.meta.url);
const routes=[...PATH_ROUTES,...PATH_FUSIONS];
let route=null,updated=0;
const content=(await readFile(file,"utf8")).replace(/\r\n/g,"\n").split("\n").map(line=>{
  if(line.startsWith("## "))route=routes.find(row=>line.slice(3)===row.label||line.slice(3).endsWith(`: ${row.label}`));
  if(!route||!line.startsWith("| "))return line;
  const columns=line.split("|");
  const title=columns[1].trim();
  const template=pathMissionTemplates(route.id,0,1).find(row=>row.title===title)
    ||pathMissionTemplates(route.id,0,0).find(row=>row.title===title);
  if(!template)return line;
  columns[3]=` ${pathObjectiveLines(template.objective).join(" **e** ")} `;
  updated++;
  return columns.join("|");
}).join("\n");
if(updated!==120)throw Error(`Esperava 120 modelos; encontrei ${updated}. Documento preservado.`);
await writeFile(file,content);
console.log(`Catálogo atualizado: ${updated} modelos.`);
