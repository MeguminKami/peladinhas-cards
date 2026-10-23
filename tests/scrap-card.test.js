import test from "node:test";
import assert from "node:assert/strict";
import { calculateBaseCard, themeName, CATALOG_THEMES, informTheme, ATTRIBUTES } from "../js/utils.js";
import { card } from "../js/cards.js";
import { assembleLeague } from "../js/league-model.js";

test("Sucata is the base below 50; every existing metal threshold remains unchanged",()=>{
  for(const value of [0,1,35,49]) assert.equal(calculateBaseCard(value),"scrap");
  assert.equal(calculateBaseCard(50),"bronze-common");
  assert.equal(calculateBaseCard(59),"bronze-common");
  assert.equal(calculateBaseCard(60),"bronze-rare");
  assert.equal(themeName("scrap"),"Sucata");
  assert.ok(CATALOG_THEMES.includes("scrap"));
  assert.equal(informTheme("scrap",49),"in-form-bronze");
});

test("low base cards render repaired metal without edition titles, including legacy Bronze data",()=>{
  const player={uid:"low",displayName:"José Ferreira",hasCard:true,ovr:49,cardType:"bronze-common",selectedCardId:"base",stats:{}};
  const html=card(player);
  assert.match(html,/class="football-card card-md scrap"/);
  assert.match(html,/scrap-material/);
  assert.match(html,/scrap-tape/);
  assert.doesNotMatch(html,/Sucata|THE ULTIMATE|card-edition/);
  assert.match(html,/José Ferreira/);
  assert.match(card({...player,ovr:50}),/football-card card-md bronze-common/);
  assert.match(card({...player,hasCard:false,cardType:"scrap"}),/football-card card-md bronze-common/);
  assert.match(card({...player,selectedCardId:"mvp",specials:[{id:"mvp"}]}),/football-card card-md mvp/);
  assert.match(card(player,{theme:"gold-rare",preview:true}),/football-card card-md gold-rare/);
  const ids=[...`${html}${card(player)}`.matchAll(/pattern id="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,"each card owns its material patterns");
});

test("a locked low-rated legacy snapshot uses Sucata without rewriting its frozen stats",()=>{
  const stats=Object.fromEntries(ATTRIBUTES.map(([key])=>[key,49]));
  const snapshot={uid:"low",weekId:"2026-W43",baseCard:"bronze-common",ovr:49,stats,official:true,locked:true};
  const result=assembleLeague({users:[{uid:"low",username:"low"}],initials:[{uid:"low",ratings20:Object.fromEntries(ATTRIBUTES.map(([key])=>[key,10]))}],community:[],games:[],summaries:[],settings:{},balances:[],weeklyCards:[snapshot],weeklyPhotos:[],eventRewards:[],collections:[],selections:[],previousCards:{},cycle:{weekId:"2026-W43",phase:"closed"}});
  assert.equal(result.players[0].cardType,"scrap");
  assert.equal(result.players[0].ovr,49);
  assert.deepEqual(result.players[0].stats,stats);
  assert.equal(snapshot.baseCard,"bronze-common");
});
