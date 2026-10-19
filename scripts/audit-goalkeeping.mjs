// Dry-run by default. --repair updates only stale goalkeeper summary fields,
// with an optimistic precondition; never alters votes, users or closed cards.
import { createRequire } from "node:module";
import { firebaseConfig } from "../js/config.js";
import { participants, calculateGameAggregate } from "../js/utils.js";
const emulator=process.env.FIRESTORE_EMULATOR_HOST;
if(emulator&&!process.env.GCLOUD_PROJECT?.startsWith("demo-"))throw Error("Emulador exige projeto demo.");
let accessToken="owner";
if(!emulator){
  const require=createRequire(import.meta.url),auth=require("firebase-tools/lib/auth.js");
  const account=auth.getGlobalDefaultAccount();
  if(!account)throw Error("Sem sessão Firebase.");
  accessToken=(await auth.getAccessToken(account.tokens.refresh_token,account.tokens.scopes)).access_token;
}
const base=`${emulator?`http://${emulator}`:"https://firestore.googleapis.com"}/v1/projects/${emulator?process.env.GCLOUD_PROJECT:firebaseConfig.projectId}/databases/(default)/documents`;
const decode=value=>value.mapValue?Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([k,v])=>[k,decode(v)])):
  value.arrayValue?(value.arrayValue.values||[]).map(decode):value.integerValue!==undefined?Number(value.integerValue):
  value.doubleValue??value.booleanValue??value.timestampValue??value.stringValue??null;
async function read(path,list=false){
  let rows=[],pageToken;
  do{
    const response=await fetch(`${base}/${path}${list?`?pageSize=1000${pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:""}`:""}`,{headers:{Authorization:`Bearer ${accessToken}`}});
    if(response.status===404)return list?[]:null;
    if(!response.ok)throw Error(`Leitura: HTTP ${response.status}`);
    const body=await response.json();
    const convert=doc=>({...decode({mapValue:{fields:doc.fields||{}}}),id:doc.name.split("/").at(-1),rawDocument:doc});
    if(!list)return convert(body);
    rows.push(...(body.documents||[]).map(convert));pageToken=body.nextPageToken;
  }while(pageToken);
  return rows;
}
const games=(await read("games",true)).filter(g=>g.status==="closed"&&!g.deleting).sort((a,b)=>+new Date(a.closedAt)-+new Date(b.closedAt));
const output=[];
const repair=process.argv.includes("--repair");
for(const [index,game] of games.entries()){
  const [votes,summary]=await Promise.all([read(`games/${game.id}/feedback`,true),read(`gameSummaries/${game.id}`)]);
  const result={game:index+1,closedAt:game.closedAt,participants:participants(game).length,selfNotKeeper:0,selfNotKeeperDraft:0,storedWithRating:0,storedEligible:0,recalculatedWithRating:0,peerRatingsIgnored:0,repaired:0};
  const rawPlayers=structuredClone(summary?.rawDocument?.fields?.players);
  const updateMask=[];
  for(const uid of participants(game)){
    const own=votes.filter(v=>v.targetId===uid&&participants(game).includes(v.raterId));
    const self=own.find(v=>v.raterId===uid);
    if(self?.ratings?.goalkeeping!==null)continue;
    if(!self.submitted){result.selfNotKeeperDraft++;continue;}
    result.selfNotKeeper++;
    if(Number.isFinite(summary?.players?.[uid]?.goalkeeping))result.storedWithRating++;
    if(summary?.players?.[uid]?.goalkeepingEligible!==false)result.storedEligible++;
    if(Number.isFinite(calculateGameAggregate(own).goalkeeping))result.recalculatedWithRating++;
    result.peerRatingsIgnored+=own.filter(v=>v.submitted&&v.raterId!==uid&&Number.isFinite(v.ratings?.goalkeeping)).length;
    const stored=summary?.players?.[uid];
    if(stored&&(stored.goalkeeping!==null||stored.goalkeepingEligible!==false||stored.ratingCounts?.goalkeeping!==0)){
      const fields=rawPlayers.mapValue.fields[uid].mapValue.fields;
      fields.goalkeeping={nullValue:null};fields.goalkeepingEligible={booleanValue:false};
      fields.ratingCounts||={mapValue:{fields:{}}};
      fields.ratingCounts.mapValue.fields.goalkeeping={integerValue:"0"};
      const field=uid.replace(/\\/g,"\\\\").replace(/`/g,"\\`");
      updateMask.push(`players.\`${field}\`.goalkeeping`,`players.\`${field}\`.goalkeepingEligible`,`players.\`${field}\`.ratingCounts.goalkeeping`);
      result.repaired++;
    }
  }
  if(repair&&updateMask.length){
    const response=await fetch(`${base}:commit`,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},
      body:JSON.stringify({writes:[{update:{name:summary.rawDocument.name,fields:{players:rawPlayers}},updateMask:{fieldPaths:updateMask},currentDocument:{updateTime:summary.rawDocument.updateTime}}]})});
    if(!response.ok)throw Error(`Correção não aplicada: HTTP ${response.status}. Repete a auditoria se houve uma edição concorrente.`);
  }
  if(!repair){result.needsRepair=result.repaired;result.repaired=0;}
  output.push(result);
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),mode:repair?"repair":"read-only",games:output},null,2));
