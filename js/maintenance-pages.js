import { POLICY_FIELDS } from "./system-policy.js";
import { parseLisbonDateInput } from "./match-time.js";
export const WEEKDAYS = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
export const MAINTENANCE_PAGES = [
  {id:"cards",label:"Início e cartas",icon:"profile",description:"Calendário semanal, evolução dos jogadores e limites das cartas.",groups:[
    ["Calendário semanal",["cycle.openDay","cycle.openHour","cycle.openMinute","cycle.closeDay","cycle.closeHour","cycle.closeMinute"]],
    ["Evolução e inatividade",["progression.*","rules.communityMinimum","rules.selfWeight"]],
    ["Coleção e prémios",["cycle.seasonMonths","cycle.yearMonths","rewards.temporaryAttribute","rewards.temporaryAward","rewards.permanentAttribute","rewards.dailyBudget","rewards.weeklyBudget","rewards.monthlyBudget","rewards.overflow","automation.cards","automation.collection"]],
  ]},
  {id:"games",label:"Jogos",icon:"games",description:"Disponibilidade da gestão de partidas e acesso ao calendário.",groups:[["Gestão de jogos",["features.games"]]]},
  {id:"ratings",label:"Avaliações",icon:"edit",description:"Prazos para avaliar e editar, e lembretes depois do jogo.",groups:[["Avaliações de jogadores",["features.ratings","rules.ratingEditDays","notifications.feedbackHours"]]]},
  {id:"missions",label:"Missões e caminhos",icon:"path",description:"Participação nas missões, resgate e orçamento das recompensas.",groups:[["Missões pessoais e ETC",["features.missions","features.claims","rules.maxRepeats","rewards.missionBudget"]]]},
  {id:"events",label:"Eventos e votações",icon:"trophy",description:"Competições, posições premiadas, votos e tipos de prémio.",groups:[["Regras dos desafios",["features.events","rules.maxWinners","rules.maxVotes","rules.allowPermanent","rules.allowMonthly","rewards.eventBudget","automation.events"]]]},
  {id:"players",label:"Jogadores",icon:"players",description:"Entrada de novos jogadores e ferramentas de acesso às contas.",groups:[["Registos",["features.registration"]]]},
  {id:"app",label:"App e notificações",icon:"settings",description:"Estado da aplicação, notificações, proteção e retenção de dados.",groups:[["Disponibilidade",["features.mode","features.message"]],["Notificações e lembretes",["notifications.enabled","notifications.quietStart","notifications.quietEnd","notifications.maxDaily","notifications.cooldownMinutes","automation.reminders"]],["Proteção e conservação",["security.*","automation.cleanup"]]]},
];
export const POLICY_FIELD_INDEX = new Map(POLICY_FIELDS.flatMap(([section,,fields]) => fields.map(field => [`${section}.${field[0]}`,{section,field}])));
export function pageGroups(page) {
  return page.groups.map(([label,patterns]) => ({label,fields:patterns.flatMap(pattern => [...POLICY_FIELD_INDEX].filter(([name])=>pattern.endsWith(".*") ? name.startsWith(pattern.slice(0,-1)) : name===pattern).map(([name,value])=>({name,...value})))}));
}
export function policyChanges(current,previous) {
  return [...POLICY_FIELD_INDEX].filter(([name,{section,field}])=>current?.[section]?.[field[0]] !== previous?.[section]?.[field[0]]).map(([name,{section,field}])=>({name,label:field[1],before:previous?.[section]?.[field[0]],after:current?.[section]?.[field[0]]}));
}
export function policyValue(name,value) {
  if (name==="cycle.openDay" || name==="cycle.closeDay") return WEEKDAYS[value] || "—";
  if(typeof value==="boolean") return value ? "Ativo" : "Desativado";
  if(typeof value==="number") return value.toLocaleString("pt-PT",{maximumFractionDigits:4});
  return ({reduce:"Reduzir ao disponível",reject:"Não entregar enquanto exceder",defer:"Adiar o prémio completo",normal:"Normal",readOnly:"Apenas consulta"})[value] || (value ?? "—");
}
export function nextPolicyOpening(cycle, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now).map(part=>[part.type,part.value]));
  const base = Date.UTC(+parts.year,+parts.month-1,+parts.day);
  for(let offset=0;offset<15;offset++) {
    const day = new Date(base+offset*86400000);
    if(day.getUTCDay()!==cycle.openDay) continue;
    const input=`${day.toISOString().slice(0,10)}T${String(cycle.openHour).padStart(2,"0")}:${String(cycle.openMinute).padStart(2,"0")}`;
    try { const date=parseLisbonDateInput(input); if(+date>+now+60000) return {input,date}; } catch { /* Skip a nonexistent clock time at a DST transition. */ }
  }
  throw Error("Não foi possível encontrar uma abertura futura válida.");
}
