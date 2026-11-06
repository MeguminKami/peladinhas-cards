/** Code-native hardware: separate pieces so the key and shackle can really move. */
export function lockHardware() {
  const lock = document.createElement('span');
  lock.className = 'acid-lock';
  lock.setAttribute('aria-hidden', 'true');
  lock.innerHTML = '<i class="lock-shackle"></i><i class="lock-body"><b class="lock-eye"></b><em></em></i>';
  return lock;
}

/** Decorative purchase entry only. Never fed to the model, engine or wallet. */
export function purchaseEntry(roundId, bonusId, scatterCount) {
  if (!Number.isInteger(scatterCount) || scatterCount < 3 || scatterCount > 5) throw Error('Entrada de compra inválida.');
  let state = 2166136261;
  for (const c of `${roundId}:${bonusId}`) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  const next = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; };
  const positions = Array.from({ length:25 }, (_,i) => i).filter(i => ![0,4,20,24].includes(i));
  for (let i=positions.length-1;i>0;i--) { const j=next()%(i+1); [positions[i],positions[j]]=[positions[j],positions[i]]; }
  const scatterCells = positions.slice(0,scatterCount);
  const scatterSet = new Set(scatterCells);
  const symbols = ['N1','N2','N3','N4','N5','P1','P2','P3','P4','P5'];
  const grid = Array.from({length:25},(_,i)=>[0,4,20,24].includes(i)?'X':scatterSet.has(i)?'S':symbols[next()%symbols.length]);
  return { grid, scatterCells, strips:Array.from({length:5},()=>Array.from({length:16},()=>symbols[next()%symbols.length])), stops:Array.from({length:5},(_,i)=>780+i*155+next()%100) };
}
