import {symbol} from './symbols.js';
import {CONFIG,purchasePrice} from './engine.js';

export function reactorSeal(mode='core'){
 const b=CONFIG.bonuses[mode]||CONFIG.bonuses.core;
 return `<div class="reactor-seal" data-reactor="${mode}" aria-hidden="true"><svg class="seal-chassis" viewBox="0 0 240 240"><circle class="seal-track" cx="120" cy="120" r="108"/><circle class="seal-ticks" cx="120" cy="120" r="98"/><path class="seal-gates" d="M80 16 120 3 160 16 150 33 120 24 90 33ZM224 80 237 120 224 160 207 150 216 120 207 90ZM160 224 120 237 80 224 90 207 120 216 150 207ZM16 160 3 120 16 80 33 90 24 120 33 150Z"/><path class="seal-circuit" d="M120 30 198 75 198 165 120 210 42 165 42 75Z"/></svg><div class="seal-heart">${symbol(b.art)}</div><i class="seal-pulse"></i><i class="seal-pulse"></i></div>`;
}
const launch=label=>`<button class="primary reactor-launch" id="continue"><span>${label}</span><b aria-hidden="true">↗</b></button>`;
const identity=(mode,kicker)=>`<div class="bonus-hero">${reactorSeal(mode)}<div class="bonus-heading"><span class="bonus-dialog-eyebrow">${kicker}</span><h1>${CONFIG.bonuses[mode].name}</h1></div></div>`;

export function bonusSheet(record,pt){
 const mode=record.intro,b=CONFIG.bonuses[mode];
 const ability={core:pt?['EVOLUÇÃO DO NÚCLEO','Ao atingir ×10, três símbolos normais transformam-se no mesmo premium na próxima oportunidade.']:['CORE EVOLUTION','Reach ×10 to transform three normal symbols into the same premium at the next opportunity.'],rift:pt?['ASCENSÃO DIMENSIONAL','Começas em ×3, com poderes mais frequentes do que no CORE. O multiplicador mantém-se entre spins.']:['DIMENSIONAL ASCENSION','Start at ×3, with more frequent powers than CORE. Every cascade can open a new opportunity.'],overdrive:pt?['REATIVIDADE MÁXIMA','Pelo menos um Wild em cada free spin. Ultrapassa ×25 e ×50 para preparar mais dois Wilds no spin seguinte.']:['MAXIMUM REACTIVITY','At least one Wild in every free spin. Cross ×25 and ×50 to prepare two extra Wilds for the next spin.']}[mode];
 return `<div class="bonus-dialog" data-kind="intro">${identity(mode,pt?'FUSÃO CONCLUÍDA · BÓNUS ATIVADO':'FUSION COMPLETE · BONUS ACTIVATED')}<div class="bonus-payload"><div class="bonus-dialog-spins amount"><strong>${record.awarded}</strong> <span>FREE SPINS</span></div><div class="payload-copy"><b>${pt?'O REATOR É TEU.':'THE REACTOR IS YOURS.'}</b><p>${pt?'Spins gratuitos. O multiplicador cresce contigo.':'Free spins. Your multiplier grows with you.'}</p></div></div><div class="reactor-briefing"><div class="reactor-ability"><span class="brief-symbol" aria-hidden="true">${mode==='core'?'⬡':mode==='rift'?'⌁':'ϟ'}</span><div><h2>${ability[0]}</h2><p>${ability[1]}</p></div></div><div class="brief-rule"><strong>×${b.startGlobal} <span>→</span> ×${b.maxGlobal}</strong><p>${pt?'Sobe +1 a cada 3 vitórias. Mantém-se entre free spins.':'Add +1 every 3 wins. Carries between free spins.'}</p></div><div class="brief-rule"><strong>3 ${pt?'portais':'portals'} <span>→</span> +${b.retrigger}&nbsp;FS</strong><p>${pt?'Cada portal acima de 3 dá +2 FS. Até 40 FS no total.':'Each portal above 3 adds +2 FS. Up to 40 FS in total.'}</p></div></div>${launch(pt?'ATIVAR O REATOR':'ACTIVATE REACTOR')}<small class="bonus-footnote">${pt?'Aposta de referência mantida · sem novos débitos':'Reference bet preserved · no additional debits'}</small></div>`;
}

export function rechargeSheet(record,pt){
 return `<div class="bonus-dialog recharge-dialog" data-kind="retrigger">${identity(record.mode,pt?'OS PORTAIS VOLTARAM A ALINHAR':'THE PORTALS ALIGNED AGAIN')}<div class="recharge-cell"><div class="charge-bars" aria-hidden="true">${Array.from({length:6},(_,i)=>`<i style="--cell:${i}"></i>`).join('')}</div><div class="bonus-dialog-spins amount"><strong>+${record.added}</strong> <span>FREE SPINS</span></div></div><h2 class="recharge-title">${pt?'MAIS ENERGIA. A MESMA MISSÃO.':'MORE ENERGY. SAME MISSION.'}</h2><p class="bonus-dialog-note">${pt?`O teu multiplicador ×${record.global??CONFIG.bonuses[record.mode].startGlobal} mantém-se. Ainda tens ${record.awarded-record.played} spins para continuar a crescer.`:`Keep your ×${record.global??CONFIG.bonuses[record.mode].startGlobal} multiplier. You have ${record.awarded-record.played} spins left to keep growing.`}</p><div class="recharge-progress"><span>${pt?'JOGADOS':'PLAYED'} <b>${record.played}</b></span><i aria-hidden="true"></i><span>${pt?'ATRIBUÍDOS':'AWARDED'} <b>${record.awarded}</b></span></div>${launch(pt?'VOLTAR AO REATOR':'BACK TO THE REACTOR')}</div>`;
}

export function winSheet(title,detail,mode,pt){
 return `<div class="celebration result-reactor"><div class="result-aura" aria-hidden="true"><i></i><i></i><i></i>${Array.from({length:12},(_,i)=>`<b style="--ray:${i}"></b>`).join('')}</div><div class="result-seal">${reactorSeal(mode)}</div><span class="bonus-dialog-eyebrow">${detail?(pt?'MISSÃO CONCLUÍDA':'MISSION COMPLETE'):(pt?'ENERGIA LIBERTADA':'ENERGY RELEASED')}</span><h1>${title}</h1><div class="result-readout"><span id="countLabel">${pt?'A EXTRAIR O GANHO':'EXTRACTING YOUR WIN'}</span><div class="amount" id="countAmount">0,00</div><div class="times" id="countTimes">0.00×</div></div><div class="energy-track" aria-hidden="true"><i></i></div><p class="result-detail">${detail||(pt?'A energia das cascatas transforma-se no teu ganho.':'Cascade energy becomes your win.')}</p>${launch(pt?'RECOLHER E CONTINUAR':'COLLECT AND CONTINUE')}</div>`;
}

export function bonusOffer(mode,bet,credit,pt){
 const count=CONFIG.bonusScatters[mode],cost=purchasePrice(mode,bet);
 return `<button class="bonus-offer" data-bonus="${mode}" id="buy-${mode}" aria-label="${CONFIG.bonuses[mode].name}: ${count} Scatters, ${credit(cost)}"><span class="bonus-offer-art" aria-hidden="true">${symbol(CONFIG.bonuses[mode].art)}</span><span class="bonus-offer-count"><b>${count}</b> SCATTERS</span><strong class="bonus-offer-price">${credit(cost)}</strong></button>`;
}

export function purchaseSheet(mode,bet,credit,pt){
 return `<div class="bonus-dialog" data-kind="purchase"><button class="close" id="cancelBonus" aria-label="${pt?'Fechar':'Close'}">×</button>${identity(mode,pt?'ABRIR UM PORTAL':'OPEN A PORTAL')}<div class="purchase-readout"><span>${pt?'CUSTO DA ATIVAÇÃO':'ACTIVATION COST'}</span><strong class="bonus-dialog-price">${credit(purchasePrice(mode,bet))}</strong><p>${CONFIG.bonusScatters[mode]} SCATTERS · ${pt?'Aposta':'Bet'} ${credit(bet)}</p></div><p class="bonus-dialog-note">${pt?'O custo é debitado ao confirmar. Os spins do bónus não cobram novas apostas.':'Charged on confirmation. Bonus spins do not charge additional bets.'}</p><div class="bonus-dialog-actions"><button class="secondary" id="cancelBuy">${pt?'VOLTAR':'BACK'}</button>${launch(pt?'ABRIR PORTAL':'OPEN PORTAL')}</div></div>`;
}

export function noticeSheet(title,body,mode,pt){
 return `<div class="celebration result-reactor"><div class="result-seal">${reactorSeal(mode)}</div><span class="bonus-dialog-eyebrow">RIFT // CORE · ${pt?'LIGAÇÃO AO REATOR':'REACTOR LINK'}</span><h1>${title}</h1>${body}${launch(pt?'CONTINUAR':'CONTINUE')}</div>`;
}

