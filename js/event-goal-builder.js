import { objectiveGoals, MAX_EVENT_GOALS } from "./event-goals.js";
import { missionObjectivePreview } from "./mission-objective-preview.js";
import { eventIcon, icon } from "./icons.js";
import { esc } from "./ui.js";

export function mountGoalBuilder(root, {objective, pane, readLeaf, writeLeaf, changed}) {
  let goals=structuredClone(objectiveGoals(objective)), active=null;
  const commit=()=>{
    const goal=goals.find(goal=>goal.id===active);
    if(goal) Object.assign(goal,readLeaf());
  };
  const read=()=>{commit();return {metric:"all",target:100,goals:structuredClone(goals)};};
  const render=()=>{
    root.innerHTML=goals.map((goal,index)=>{
      const preview=missionObjectivePreview({objective:goal});
      return `<article class="event-goal ${active===goal.id?"is-editing":""}" data-goal="${esc(goal.id)}"><div class="event-goal-heading"><button type="button" class="event-goal-summary" data-goal-edit="${esc(goal.id)}" aria-expanded="${active===goal.id}"><span class="event-goal-symbol">${icon(eventIcon({objective:goal}))}</span><span><small>Meta ${index+1}</small><strong>${esc(preview.text)}</strong>${preview.criteria?`<span>${esc(preview.criteria)}</span>`:""}</span>${icon("edit")}</button><div class="event-goal-tools"><button type="button" class="btn btn-icon btn-ghost" data-goal-up="${esc(goal.id)}" aria-label="Subir meta ${index+1}" ${index===0?"disabled":""}>${icon("arrow","goal-up")}</button><button type="button" class="btn btn-icon btn-ghost" data-goal-remove="${esc(goal.id)}" aria-label="Remover meta ${index+1}">${icon("trash")}</button></div></div><div class="event-goal-fields"></div></article>`;
    }).join("")+`<div class="event-goal-pane-parking" hidden></div><button type="button" class="event-goal-add" ${goals.length>=MAX_EVENT_GOALS?"disabled":""}>${icon("plus")}<span>Adicionar nova meta</span><small>${goals.length} / ${MAX_EVENT_GOALS}</small></button><p class="muted event-goal-note">${goals.length?"É necessário cumprir todas as metas. Podes editar e reordenar sem reiniciar as contagens.":"Adiciona a primeira meta: resultados, estrelas ou totais do histórico."}</p>`;
    const current=goals.find(goal=>goal.id===active);
    pane.hidden=!current;
    (current ? [...root.querySelectorAll("[data-goal]")].find(el=>el.dataset.goal===active).querySelector(".event-goal-fields") : root.querySelector(".event-goal-pane-parking")).append(pane);
    if(current) writeLeaf(current);
  };
  root.addEventListener("click",event=>{
    const button=event.target.closest("button");if(!button||button.disabled)return;
    if(!button.matches(".event-goal-add,[data-goal-edit],[data-goal-remove],[data-goal-up]"))return;
    commit();
    if(button.matches(".event-goal-add")) {
      active=crypto.randomUUID();goals.push({id:active,metric:"games",target:3});
    } else if(button.dataset.goalEdit) active=active===button.dataset.goalEdit?null:button.dataset.goalEdit;
    else if(button.dataset.goalRemove) {goals=goals.filter(goal=>goal.id!==button.dataset.goalRemove);if(active===button.dataset.goalRemove)active=null;}
    else {const index=goals.findIndex(goal=>goal.id===button.dataset.goalUp);[goals[index-1],goals[index]]=[goals[index],goals[index-1]];}
    render();changed();
    const focus=active ? [...root.querySelectorAll("[data-goal-edit]")].find(el=>el.dataset.goalEdit===active) : root.querySelector(".event-goal-add");
    focus?.focus({preventScroll:true});
  });
  render();
  const updateSummary=()=>{
    commit();const goal=goals.find(goal=>goal.id===active);if(!goal)return;
    const article=[...root.querySelectorAll("[data-goal]")].find(el=>el.dataset.goal===active);
    const preview=missionObjectivePreview({objective:goal});
    article.querySelector(".event-goal-summary strong").textContent=preview.text;
    const copy=article.querySelector(".event-goal-summary > span:nth-child(2)");
    let criteria=copy.querySelector(":scope > span");
    if(preview.criteria) {
      if(!criteria) { criteria=document.createElement("span");copy.append(criteria); }
      criteria.textContent=preview.criteria;
    } else criteria?.remove();
    article.querySelector(".event-goal-symbol").innerHTML=icon(eventIcon({objective:goal}));
  };
  root.addEventListener("input",updateSummary);
  root.addEventListener("change",updateSummary);
  root.addEventListener("click",updateSummary);
  return {read};
}
