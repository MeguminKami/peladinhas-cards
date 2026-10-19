import { participants, matchPerformance } from "../js/utils.js";
import { PATH_ROUTES, PATH_FUSIONS, evaluatePathMission } from "../js/path-model.js";
import { pathMissionTemplates } from "../js/path-missions.js";
import { pathReviewDeadline } from "../js/path-window.js";

const numericMetrics=new Set(["goals","assists","contributions","teamGoals","conceded"]);
const percent=(count,total)=>total?+(100*count/total).toFixed(1):null;
function distribution(values){
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b),n=sorted.length;
  return {count:n,mean:n?+(sorted.reduce((sum,value)=>sum+value,0)/n).toFixed(2):null,
    median:n?(sorted[Math.floor((n-1)/2)]+sorted[Math.ceil((n-1)/2)])/2:null,
    histogram:Object.fromEntries([...new Set(sorted)].map(value=>[value,sorted.filter(v=>v===value).length]))};
}
export function analyzeGoalDifficulty(rows, now=Date.now()){
  rows=rows.filter(({game})=>game.status==="closed"&&!game.deleting&&+new Date(game.closedAt)<=now);
  const records=rows.flatMap(({game})=>participants(game).map(uid=>{
    const side=[...(game.teamA?.starters||[]),...(game.teamA?.bench||[])].includes(uid)?"teamA":"teamB";
    const performance=game.pathPerformance?.[uid]||matchPerformance(uid,game);
    return {...performance,contributions:performance.goals+performance.assists,
      teamGoals:game.score?.[side],conceded:game.score?.[side==="teamA"?"teamB":"teamA"]};
  }));
  const teams=rows.flatMap(({game})=>[game.score?.teamA,game.score?.teamB]);
  const statistics={games:rows.length,participations:records.length,teamGoals:distribution(teams),
    goals:distribution(records.map(r=>r.goals)),assists:distribution(records.map(r=>r.assists)),
    contributions:distribution(records.map(r=>r.contributions)),
    thresholds:Object.fromEntries([...numericMetrics].map(metric=>[metric,Array.from({length:metric==="teamGoals"||metric==="conceded"?12:7},(_,target)=>{
      const values=metric==="teamGoals"||metric==="conceded"?teams:records.map(r=>r[metric]);
      const valid=values.filter(Number.isFinite),met=valid.filter(value=>metric==="conceded"?value<=target:value>=target).length;
      return {target,met,sample:valid.length,percent:percent(met,valid.length)};
    })])),
    combined:[1,2,3].flatMap(goals=>[1,2].map(assists=>({goals,assists,met:records.filter(r=>r.goals>=goals&&r.assists>=assists).length,
      percent:percent(records.filter(r=>r.goals>=goals&&r.assists>=assists).length,records.length)}))),
    formats:Object.fromEntries([...new Set(rows.map(({game})=>game.teamSize||5))].map(size=>[size,rows.filter(({game})=>(game.teamSize||5)===size).length]))};
  const missions=[];
  for(const route of [...PATH_ROUTES,...PATH_FUSIONS])for(const stage of [0,1,2])for(const difficulty of [0,1,2]){
    for(const template of pathMissionTemplates(route.id,stage,difficulty)){
      if(!template.objective.conditions.some(c=>numericMetrics.has(c.metric)))continue;
      const counts={success:0,failure:0,waiting:0,cancelled:0,windowPending:0};
      for(const {game,summary} of rows)for(const uid of participants(game)){
        if(template.objective.conditions.some(c=>c.metric==="rating")&&pathReviewDeadline(game)>now){counts.windowPending++;continue;}
        counts[evaluatePathMission(template.objective,game,summary,uid).status]++;
      }
      const eligible=counts.success+counts.failure;
      missions.push({templateId:template.templateId,stage,difficulty,conditions:template.objective.conditions,...counts,eligible,
        successPercent:percent(counts.success,eligible)});
    }
  }
  return {statistics,missions,note:"Observed historical frequencies, not forecasts. Rating combinations use votes reconstructed at 48h; missing samples and ineligible positions are reported separately. Team observations are correlated with player participations."};
}
