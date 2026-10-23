import { pathAttributeLimit } from "./path-model.js";

export function maintenanceLimits(config, page = "cards") {
  const r = config.rewards, p = config.progression;
  const number = value => Number(value).toLocaleString("pt-PT");
  const budget = value => value ? `${number(value)} pontos` : "Sem teto de orçamento";
  const rows = [
    {origin:"shared", title:"Escala das cartas", value:"0–99", help:"Escala final dos atributos e do OVR. Os bónus não permitem ultrapassar 99; não é um orçamento de prémios."},
    {origin:"games", title:"Evolução nos jogos", value:`+${number(p.gainCap)} / −${number(p.lossCap)}`, help:"Máximo de ganho / perda por atributo e por jogo. Não é um prémio de missão."},
    {origin:"shared", title:"Bónus temporários ativos", value:`+${number(r.temporaryAttribute)} por atributo`, help:`Teto acumulado entre missões e eventos. Cada prémio temporário pode somar até ${number(r.temporaryAward)} pontos entre os atributos.`},
    {origin:"shared", title:"Bónus permanentes", value:`+${number(r.permanentAttribute)} por atributo`, help:"Teto acumulado entre missões e eventos ao longo do histórico. O ETC tem um teto separado."},
    {origin:"missions", title:"Missões pessoais", value:budget(r.missionBudget), help:"Orçamento semanal por jogador. Também respeita os tetos por atributo e os orçamentos gerais."},
    {origin:"events", title:"Eventos", value:budget(r.eventBudget), help:"Orçamento semanal por jogador. Também respeita os tetos por atributo e os orçamentos gerais."},
    {origin:"path", title:"Escolhe o teu caminho", value:`+${pathAttributeLimit("passing")} por atributo · +${pathAttributeLimit("goalkeeping")} a GR`, help:"Teto permanente próprio. Cada nó entrega +1 nos seus atributos. Os orçamentos gerais também se aplicam, com contabilização própria do ETC."},
    {origin:"shared", title:"Orçamentos gerais por jogador", value:`Dia: ${budget(r.dailyBudget)} · Semana: ${budget(r.weeklyBudget)} · Mês: ${budget(r.monthlyBudget)}`, help:"Limitam a soma dos pontos entregues, não o número de cartas. Zero significa sem teto de orçamento; não elimina os limites por atributo."},
    {origin:"shared", title:"Quando um limite é atingido", value:({reduce:"Reduzir ao disponível",reject:"Não entregar enquanto exceder",defer:"Adiar o prémio completo"})[r.overflow], help:"Comportamento para recompensas que excedem os limites. Uma carta especial não aumenta estes tetos."},
  ];
  const origins = page === "missions" ? ["shared","missions","path"] : page === "events" ? ["shared","events"] : ["shared","games","missions","events","path"];
  return rows.filter(row => origins.includes(row.origin));
}
