import test from 'node:test';
import assert from 'node:assert/strict';
import {config,validateConfig,type Config,type Mode} from '../src/config.ts';
import {generate,validateBoard,type Board} from '../src/board.ts';
import {evaluate} from '../src/evaluate.ts';
import {neighbors,resolve} from '../src/powers.ts';
import {SeededRandom,type Random} from '../src/random.ts';
import {round,spin,start} from '../src/engine.ts';
import {settle} from '../src/settlement.ts';
import {simulate} from '../src/simulate.ts';
import {spawnSync} from 'node:child_process';
const zero:Random={next:()=>0};
const high:Random={next:()=>0.999999};
test('global persiste nos FS e P1 não acrescenta multiplicadores',()=>{
  const b=Array(24).fill('S') as Board;b[7]='W';b[6]='P4';
  const first=spin(start('superior'),20,zero,single(),true,b);
  assert.equal(first.next.global,3);
  const line=Array(24).fill('S') as Board;for(let i=0;i<6;i++)line[i]='P1';line[1]='W';line[7]='P1';
  const second=spin(first.next,20,zero,single(),true,line);
  assert.equal(second.detail!.globalBefore,3);assert.equal(second.detail!.global,3);
  assert.equal(second.detail!.lines[0].global,3);assert.equal(second.detail!.lines[0].local,1);
  assert.equal(second.paid,324);
  const third=spin(second.next,20,zero,single(),true,b);assert.equal(third.next.global,5);
  assert.equal(start('superior').global,1);
});
test('ativação natural leva o global da jogada base para o bónus',()=>{
  const b=Array(24).fill('N2') as Board;b[0]=b[8]=b[16]='S';b[7]='W';b[6]='P4';
  const r=spin(start('base'),20,zero,config,true,b);
  assert.equal(r.next.mode,'normal');assert.equal(r.next.global,3);
  const fs=spin(r.next,20,high,config,true,Array(24).fill('N1') as Board);
  assert.equal(fs.detail!.globalBefore,3);assert.equal(fs.detail!.global,3);
});
function blank():Board{return Array(24).fill('S');}
function single():Config{return {...structuredClone(config),payoutScaleBps:{base:10000,normal:10000,superior:10000,legend:10000},lines:[[0,0,0,0,0,0]]};}
test('configuração: 40 linhas únicas e dimensões/probabilidades válidas',()=>{
  validateConfig(config);assert.equal(new Set(config.lines.map(l=>l.join(''))).size,40);
  for(const mutate of [(c:Config)=>c.lines[0][0]=4,(c:Config)=>c.weights.base[0]=-1,(c:Config)=>c.steal.base=101,(c:Config)=>c.pays[0][0]=-1]){const c=structuredClone(config);mutate(c);assert.throws(()=>validateConfig(c));}
  assert.throws(()=>validateBoard(['W']));assert.throws(()=>validateBoard(Array(24).fill('bad')));
});
test('pagamentos exatos de todos os símbolos, comprimentos 3 a 6',()=>{
  for(let s=0;s<8;s++)for(let n=3;n<=6;n++){const b=blank();for(let i=0;i<n;i++)b[i]=(['N1','N2','N3','N4','P1','P2','P3','P4'] as const)[s];assert.equal(evaluate(b,new Set(),1,single()).hundredths,config.pays[s][n-3]);}
});
test('interrupção e sentido de avaliação',()=>{
  const b=blank();b[3]=b[4]=b[5]='P4';assert.equal(evaluate(b).hundredths,0);b[0]=b[1]='N1';assert.equal(evaluate(b).hundredths,0);b[2]='N2';assert.equal(evaluate(b).hundredths,0);
});
test('wilds iniciais, intermédios e linha só de wilds',()=>{
  const b=blank();b.splice(0,6,'W','P4','W','P4','P4','P4');assert.equal(evaluate(b,new Set(),1,single()).wins[0].symbol,'P4');
  b.splice(0,6,'W','W','W','W','W','W');const w=evaluate(b,new Set(),1,single()).wins[0];assert.equal(w.symbol,'P4');assert.equal(w.length,6);assert.equal(w.hundredths,1800);
});
test('escolhe maior pagamento final e desempata comprimento',()=>{
  const b=blank();b.splice(0,6,'W','W','W','N1','S','S');const c=single();c.pays[7][0]=100;assert.equal(evaluate(b,new Set(),1,c).wins[0].symbol,'P4');for(const pay of c.pays)pay[0]=10;c.pays[0][1]=10;assert.equal(evaluate(b,new Set(),1,c).wins[0].symbol,'N1');
});
test('avaliação não aplica multiplicadores locais antigos; global aplica uma vez',()=>{
  const b=blank();b.splice(0,6,'W','W','W','W','W','W');assert.equal(evaluate(b,new Set([0,1,2,3,4,5]),5,single()).hundredths,1800*5);
  b.splice(0,6,'N1','N1','N1','S','W','W');assert.equal(evaluate(b,new Set([4,5]),1,single()).hundredths,3);
});
test('adjacência nas quatro direções, sem diagonais/wrap',()=>{
  assert.deepEqual(neighbors(7),[1,13,6,8]);assert.deepEqual(neighbors(6),[0,12,7]);assert.deepEqual(neighbors(0),[6,1]);assert.deepEqual(neighbors(5),[11,4]);
  for(const position of [1,13,6,8]){const b=blank();b[7]='W';b[position]='P1';assert.equal(resolve(b,'superior',zero).steals[0].power,'P1');}
  for(const position of [0,2,12,14]){const b=blank();b[7]='W';b[position]='P1';assert.equal(resolve(b,'superior',zero).steals[0].success,false);}
  const edge=blank();edge[5]='W';edge[6]='P1';assert.equal(resolve(edge,'superior',zero).steals[0].success,false);
});
test('probabilidades de roubo e ausência de premium',()=>{
  const b=blank();b[7]='W';assert.equal(resolve(b,'superior',zero).steals[0].success,false);b[1]='P1';assert.equal(resolve(b,'base',high).steals[0].success,false);assert.equal(resolve(b,'base',zero).amplified.has(7),false);
});
test('P2 protege scatters, não cria roubo recursivo e permite sobreposição',()=>{
  const b=blank();b[7]='W';b[6]='P2';b[1]='N1';b[13]='N1';b[0]='P4';const r=resolve(b,'superior',zero);assert.equal(r.board[1],'W');assert.equal(r.board[13]==='W',false);assert.equal(r.steals.length,1);assert.equal(r.global,1);
  b[13]='S';assert.equal(resolve(b,'superior',zero).board[13],'S');
});
test('P3 converte depois de P2 e protege todos os Wilds',()=>{
  const b=blank();b[7]='W';b[6]='P2';b[1]='N1';b[13]='N2';b[10]='W';b[9]='P3';
  const r=resolve(b,'superior',zero);assert.equal(r.board[1],'W');assert.notEqual(r.board[13],'W');
  for(const e of r.events.filter(e=>e.power==='P3'))for(const p of e.targets)assert.notEqual(r.board[p],'W');
});

test('P4 soma incrementos ao global inicial ×1 e respeita distribuição',()=>{
  const b=blank();b[7]='W';b[6]='P4';b[10]='W';b[9]='P4';assert.equal(resolve(b,'superior',zero).global,5);
  let n=0;const rng={next:()=>++n<=4?0:0.99};assert.equal(resolve(b,'superior',rng).global,11);
  for(const [value,factor] of [[0,2],[0.8,3],[0.99,5]]){let i=0;assert.equal(resolve(b.map((s,p)=>p===10?'S':s),'superior',{next:()=>++i<=2?0:value}).global,1+factor);}
});
test('P3 usa a distribuição aprovada e limita aos alvos não Wild',()=>{
  const counts=Array(9).fill(0);
  for(let roll=0;roll<100;roll++){
    const b=Array(24).fill('N1') as Board;b[7]='W';b[6]='P3';let calls=0;
    const r=resolve(b,'superior',{next:()=>++calls===4?(roll+.5)/100:0});
    const e=r.events[0];counts[e.requested!-2]++;assert.equal(e.targets.length,e.requested!+1);assert.equal(new Set(e.targets).size,e.requested!+1);
  }
  assert.deepEqual(counts,[18,16,14,12,11,9,8,7,5]);
  const b=Array(24).fill('W') as Board;b[6]='P3';const r=resolve(b,'superior',zero);
  const targets=r.events.flatMap(e=>e.targets);assert.deepEqual(targets,[6]);assert.equal(r.board.filter(s=>s==='W').length,23);
});

test('P3 converte premiums e Scatters e preserva retrigger e ativação natural',()=>{
  const b=Array(24).fill('W') as Board;b[0]='P3';b[2]='S';b[3]='S';b[4]='S';
  for(const mode of ['base','superior'] as const){
    const r=spin(start(mode),20,zero,config,true,b);
    assert.equal(r.detail!.final[0],'P1');assert.equal(r.detail!.final[2],'P1');
    assert.equal(r.scatters.length,3);assert.equal(r.next.mode,mode==='base'?'normal':'superior');
    if(mode==='superior'){assert.equal(r.retrigger!.awarded,5);assert.equal(r.next.remaining,14);}
  }
});

test('P1 mantém global e não amplifica linhas após o passe',()=>{
  const b=blank();b[0]='P1';b[1]='W';b[2]='P1';b[7]='P1';b[10]='W';b[16]='P4';b[22]='W';
  const powers=resolve(b,'superior',zero);assert.equal(powers.global,5);assert.equal(powers.amplified.has(1),false);
  const win=evaluate(powers.board,powers.amplified,powers.global,single()).wins[0];assert.equal(win.local,1);assert.equal(win.global,5);assert.equal(win.hundredths,10*5);
  const p1=powers.events.find(e=>e.power==='P1')!;assert.equal(p1.factor,1);
});
test('stickies persistem, roubam novamente, poderes expiram e não repetem sorteio sticky',()=>{
  const b=blank();b[7]='W';b[6]='P1';const first=spin(start('superior'),20,zero,config,true,b);assert.deepEqual(first.next.sticky,[7]);assert.equal(first.detail!.lines.length,0);
  const next=blank();next[7]='W';const second=spin(first.next,20,zero,config,true,next);assert.deepEqual(second.next.sticky,[7]);assert.equal(second.metrics.newSticky,0);assert.equal(second.detail!.events.length,0);
  next[6]='P1';assert.equal(spin(second.next,20,zero,config,true,next).metrics.success,1);
  const failed=spin(start('superior'),20,high,config,true,b);assert.equal(failed.next.sticky.length,0);
});
test('wilds de expansão não ganham sticky',()=>{
  const b=blank();b[7]='W';b[6]='P2';b[1]='N1';const r=spin(start('superior'),20,zero,config,true,b);assert.deepEqual(r.next.sticky,[7]);assert.equal(r.detail!.final[1],'W');
});
test('geração de scatters, colunas únicas e Wilds fixos protegidos',()=>{
  for(let n=0;n<=4;n++){const c=structuredClone(config);c.scatterWeights=Array(5).fill(0);c.scatterWeights[n]=1;const b=generate('base',[],new SeededRandom(String(n)),c);assert.equal(b.filter(s=>s==='S').length,n);assert.equal(new Set(b.flatMap((s,p)=>s==='S'?[p%6]:[])).size,n);}
  for(const mode of ['normal','superior'] as const){const b=generate(mode,[7],zero);assert.equal(b.includes('S'),false);assert.equal(b[7],'W');}
});
test('três e quatro scatters ativam bónus natural; fim sem retrigger',()=>{
  for(const [n,mode] of [[3,'normal'],[4,'superior']] as const){const b=Array(24).fill('N1') as Board;for(let i=0;i<n;i++)b[i]='S';const r=spin(start('base'),20,zero,config,true,b);assert.equal(r.next.mode,mode);assert.equal(r.next.remaining,10);assert.equal(r.next.accumulated,r.paid);}
  const b=Array(24).fill('N1') as Board;const s={...start('normal'),remaining:1};assert.equal(spin(s,20,zero,config,true,b).next.done,true);
});
test('compras, custo, aposta de referência e sem grelha de ativação',()=>{
  for(const mode of ['normal','superior'] as const){const c=structuredClone(config);c.weights[mode]=[1,0,0,0,0,0,0,0,0];const r=round(mode,20,new SeededRandom('buy'),c);assert.equal(r.cost,20*c.prices[mode]);assert.equal(r.spins,10);assert.equal(r.basePaid,0);assert.equal(r.bonusPaid,r.paid);assert.ok(r.records.every(s=>s.bet===20));}
});
test('teto acumulado, alcançabilidade e terminação antecipada',()=>{
  const b=Array(24).fill('W') as Board;const s={...start('superior'),accumulated:199999,remaining:8};const r=spin(s,20,zero,config,true,b);assert.equal(r.paid,1);assert.equal(r.next.accumulated,200000);assert.equal(r.next.done,true);assert.equal(r.next.remaining,0);assert.throws(()=>spin(r.next,20,zero));
  // A sufficiently large accumulated global exceeds the round cap without P1.
  assert.ok(evaluate(b,new Set(),20).hundredths/100>10000);
  const attainable=Array(24).fill('W') as Board;attainable[0]='P4';let state=start('superior');let spins=0;
  while(!state.done){state=spin(state,20,high,config,true,attainable).next;spins++;}
  assert.equal(state.accumulated,200000);assert.ok(spins<10);
});
test('arredonda apenas total por spin com aritmética exata',()=>{
  assert.equal(settle(3,20,100).paid,0);assert.equal(settle(6,20,100).paid,1);assert.equal(settle(12345,20,100000).beforeCap,2469);assert.throws(()=>settle(-1,20,100));
  const b=blank();b[0]=b[1]=b[2]='N1';const c=single();c.lines=[[0,0,0,0,0,0],[0,0,0,1,1,1]];assert.equal(spin(start('base'),20,high,c,true,b).paid,1);
});
test('mesma seed reproduz ronda e desligar detalhes não altera resultado/RNG',()=>{
  for(const mode of ['base','normal','superior'] as Mode[]){const a=new SeededRandom('repeat'),b=new SeededRandom('repeat');const full=round(mode,20,a),fast=round(mode,20,b,config,false);assert.deepEqual({...full,records:[]},fast);assert.equal(a.state(),b.state());assert.deepEqual(full,round(mode,20,new SeededRandom('repeat')));}
});
test('invariantes aleatórios para todos os modos e apostas',()=>{
  const rng=new SeededRandom('invariants');for(const bet of config.bets)for(const mode of ['base','normal','superior'] as Mode[])for(let i=0;i<20;i++){const r=round(mode,bet,rng);assert.ok(r.paid>=0&&r.paid<=bet*10000);assert.ok(Number.isSafeInteger(r.paid));for(const s of r.records){validateBoard(s.detail!.initial);validateBoard(s.detail!.final);}}
});
test('estatísticas por ronda, custo das compras e histogramas completos',()=>{
  const r=simulate('normal',20,100,'stats');assert.equal(r.totalCostCents,'180000');assert.equal(Object.values(r.distribution).reduce((a,b)=>a+b,0),100);assert.equal(r.bonus.normal.count,100);assert.equal(r.totalSpins,1000+r.metrics.extraFreeSpins);assert.equal(r.metrics.extraFreeSpins,r.metrics.retriggers*5);assert.equal(r.observedRtpPercent,Number(r.totalPaidCents)/180000*100);assert.ok(r.ci95RtpPercent);assert.deepEqual(r,simulate('normal',20,100,'stats'));
  assert.equal(simulate('base',20,1,'one').ci95RtpPercent,null);
});
test('fatores estáticos por modo antes do arredondamento e do teto',()=>{
  assert.equal(settle(3,20,100,30000).paid,1);assert.equal(settle(3,20,100,220000).paid,13);
  assert.equal(settle(3,20,100,190000).paid,11);assert.equal(settle(10000,20,10,220000).paid,10);
  const b=Array(24).fill('N1') as Board;for(const mode of ['base','normal','superior'] as Mode[]){const s=spin(start(mode),20,zero,config,true,b);assert.equal(s.beforeCap,settle(3600,20,200000,config.payoutScaleBps[mode]).paid);}
});
test('CLI valida argumentos e mostra tabuleiro manual',()=>{
  for(const args of [['simulate','--rounds','1.5'],['simulate','--bet','0.21'],['buy','--mode','base'],['spin','--mode','superior'],['spin','--unknown','x']]){const r=spawnSync(process.execPath,['src/cli.ts',...args],{encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/Erro:/);}
  const r=spawnSync(process.execPath,['src/cli.ts','evaluate','--board','examples/board.json','--seed','test'],{encoding:'utf8'});assert.equal(r.status,0);assert.match(r.stdout,/Inicial/);assert.match(r.stdout,/Final/);assert.match(r.stdout,/depuração/);
});

test('sticky: aumento relativo de 50% fixa Wild abaixo de 18% e não no limite',()=>{
 assert.equal(config.sticky,18);
 const board=Array(24).fill('N1') as Board;board[7]='W';
 const below=spin(start('superior'),20,{next:()=>.17999},config,true,board);
 const boundary=spin(start('superior'),20,{next:()=>.18},config,true,board);
 assert.deepEqual(below.next.sticky,[7]);assert.deepEqual(boundary.next.sticky,[]);
});
