import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {config,type Mode,type SymbolId} from './config.ts';
import {SeededRandom} from './random.ts';
import {round,spin,start,type SpinResult} from './engine.ts';
import {simulate} from './simulate.ts';
function showSpin(s:SpinResult){
  console.log(`\nModo: ${s.mode} | aposta: ${(s.bet/100).toFixed(2)} | pagamento: ${(s.paid/100).toFixed(2)} | antes do teto: ${(s.beforeCap/100).toFixed(2)}`);
  if(s.detail){for(const [name,board] of [['Inicial',s.detail.initial],['Final',s.detail.final]] as const){console.log(name);for(let r=0;r<4;r++)console.log(board.slice(r*6,r*6+6).join(' '));}
    console.log('Roubos:',JSON.stringify(s.detail.steals));console.log('Poderes:',JSON.stringify(s.detail.events));console.log('Linhas:',JSON.stringify(s.detail.lines));console.log('Sticky novos:',s.detail.newSticky);}
  if(s.retrigger)console.log('RETRIGGER: +'+s.retrigger.awarded+' FREE SPINS');
  console.log('Próximo estado:',JSON.stringify(s.next));
}
function main(){
  const [command='help',...args]=process.argv.slice(2),opts:Record<string,string>={};
  const allowed=new Set(['seed','spins','rounds','bet','mode','output','board','bonus-hunt']);
  for(let i=0;i<args.length;i+=2){const key=args[i].slice(2);if(!args[i].startsWith('--')||!allowed.has(key)||!args[i+1]||args[i+1].startsWith('--')||key in opts)throw Error(`Argumento inválido: ${args[i]}`);opts[key]=args[i+1];}
  if(command==='help'){console.log('Comandos: spin | round | buy | simulate | evaluate\n--mode base|normal|superior|legend --bet 0.20 --seed exemplo --bonus-hunt on|off --rounds 1000 --output reports/test.json\nevaluate --board board.json (matriz 4×6 ou lista de 24 símbolos). buy exige normal, superior ou legend.');return;}
  if(!['spin','round','buy','simulate','evaluate'].includes(command))throw Error('Comando desconhecido');
  const mode=opts.mode??(command==='buy'?'normal':'base');if(!['base','normal','superior','legend'].includes(mode))throw Error('Modo inválido');
  if(opts['bonus-hunt']&&!['on','off'].includes(opts['bonus-hunt']))throw Error('--bonus-hunt exige on ou off');const bonusHunt=opts['bonus-hunt']==='on';if(bonusHunt&&mode!=='base')throw Error('Bonus Hunt apenas no jogo base');
  const m=mode as Mode,betText=(opts.bet??'0.20').replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(betText))throw Error('Aposta deve ter até duas casas decimais');
  const [whole,frac='']=betText.split('.'),bet=Number(whole)*100+Number(frac.padEnd(2,'0'));if(!config.bets.includes(bet))throw Error('Aposta fora da escada');
  if(opts.rounds&&opts.spins)throw Error('Usa --rounds ou --spins, não ambos');
  const countText=opts.rounds??opts.spins??'1';if(!/^\d+$/.test(countText))throw Error('Quantidade deve ser um inteiro positivo');const count=Number(countText);if(!Number.isSafeInteger(count)||count<1)throw Error('Quantidade inválida');
  const seed=opts.seed??'slot-0.1',rng=new SeededRandom(seed);let result:unknown;
  if(command==='simulate'){const report=simulate(m,bet,count,seed,config,bonusHunt);result=report;console.log(JSON.stringify(report,null,2));}
  else if(command==='spin'||command==='evaluate'){
    if(command==='spin'&&m!=='base')throw Error('spin executa apenas o jogo base; usa buy para um bónus completo');
    let board:SymbolId[]|undefined;
    if(command==='evaluate'){if(!opts.board)throw Error('Falta --board');const input=JSON.parse(readFileSync(opts.board,'utf8'));if(!Array.isArray(input))throw Error('Tabuleiro inválido');if(input.some(Array.isArray)&&(input.length!==4||input.some(row=>!Array.isArray(row)||row.length!==6)))throw Error('Matriz deve ter 4 linhas e 6 colunas');board=input.flat();}
    const s=spin(start(m,config,bonusHunt),bet,rng,config,true,board);result=s;showSpin(s);
    if(command==='evaluate')console.log('Modo de depuração: poderes e regras são aplicados ao tabuleiro fornecido.');
  }else{
    if(command==='buy'&&m==='base')throw Error('Compra exige modo normal, superior ou legend');if(command==='round'&&m!=='base')throw Error('round exige modo base');
    const r=round(m,bet,rng,config,true,bonusHunt);result=r;r.records.forEach(showSpin);console.log(`\nCusto: ${(r.cost/100).toFixed(2)} | pago: ${(r.paid/100).toFixed(2)} | retorno: ${(r.paid/bet).toFixed(2)}×`);
  }
  if(opts.output){mkdirSync(dirname(opts.output),{recursive:true});const output=command==='simulate'?result:{seed,finalRngState:rng.state(),result};writeFileSync(opts.output,JSON.stringify(output,null,2)+'\n');console.log(`Guardado: ${opts.output}`);}
}
try{main();}catch(error){console.error(`Erro: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1;}
