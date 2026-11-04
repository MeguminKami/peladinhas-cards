/**
 * PONTO DE LIGAÇÃO VISUAL (Fase 2: apresentação mínima e legível).
 *
 *   await visual.play(evento, ctx)
 *
 * Chamado para cada evento, por ordem. A apresentação decide quanto tempo demora (sempre através de
 * ctx.tempo, nunca com setTimeout). Quando termina, a grelha do DOM tem de mostrar ctx.model: a
 * forma mais simples é chamar ctx.render(). A app chama ctx.render() de novo no fim, por segurança.
 * A Fase 3 substitui este ficheiro mantendo a assinatura; o contrato do ctx está em docs/estrutura-ui.md.
 *
 * Durações em ms da velocidade Normal. Nada aqui decide resultados.
 */
import { fusionName, POWER_NAME, LEVEL_NAME, symName, xBet, money, winCents, BONUS_NAME } from './texto.js';

const D = {
  drop: 260, hit: 520, amount: 620, remove: 170, refill: 230, tag: 620, tagShort: 380,
  power: 420, move: 230, walk: 150, respin: 420, wild: 260, corner: 420, police: 900, mult: 260,
};

function pause(ctx, ms) {
  if (ctx.skip()) return Promise.resolve();
  return ctx.tempo.wait(ctx.reduced ? Math.min(ms, 160) : ms, ctx.skip);
}
function anim(ctx, el, frames, ms) {
  if (!el || ctx.reduced || ctx.skip()) return Promise.resolve();
  const a = ctx.tempo.animate(el, frames, { duration: ms, easing: 'ease-out' });
  return a ? a.finished.catch(() => {}) : Promise.resolve();
}
function tag(ctx, title, sub = '', ms = D.tag, color = null) {
  if (ctx.skip()) return Promise.resolve();
  const el = document.createElement('div');
  el.className = 'tag';
  el.textContent = title;
  if (color) el.style.borderColor = color;
  if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
  ctx.flash.append(el);
  return pause(ctx, ms).then(() => el.remove());
}
function mark(ctx, cells, cls) { for (const c of cells) ctx.cells[c]?.classList.add(cls); }
function unmark(ctx, cells, cls) { for (const c of cells) ctx.cells[c]?.classList.remove(cls); }
function centre(ctx, cells) {
  const box = ctx.flash.getBoundingClientRect(); // as etiquetas vivem na camada por cima da grelha
  let x = 0, y = 0;
  for (const c of cells) { const r = ctx.cells[c].getBoundingClientRect(); x += r.left + r.width / 2; y += r.top + r.height / 2; }
  const k = ctx.scale || 1;
  return { x: (x / cells.length - box.left) / k, y: (y / cells.length - box.top) / k };
}

export const visual = {
  async play(e, ctx) {
    switch (e.type) {
      case 'step.start':
        ctx.flash.replaceChildren();
        if (e.kind === 'bonus') await tag(ctx, `${BONUS_NAME[e.bonusId]}`, `Free spin ${e.freeSpins.played + 1} / ${e.freeSpins.total}`, D.tagShort);
        return;
      case 'grid.drop':
        ctx.render();
        await Promise.all(ctx.cells.map((el, i) => anim(ctx, el, [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }], D.drop + (Math.floor(i / 5) * 30))));
        return;
      case 'win.cluster': {
        mark(ctx, e.cells, 'hit');
        const p = centre(ctx, e.cells);
        const label = document.createElement('div');
        label.className = 'win-amount';
        label.textContent = `${xBet(e.pay)}${e.multiplier > 1 ? ` (×${e.multiplier})` : ''} · ${money(winCents(e.pay, ctx.bet))}`;
        label.style.left = `${p.x}px`; label.style.top = `${p.y}px`;
        if (!ctx.skip()) ctx.flash.append(label);
        await pause(ctx, e.groupFinal ? D.amount + 200 : D.hit);
        label.remove();
        unmark(ctx, e.cells, 'hit');
        return;
      }
      case 'cap.hit': await tag(ctx, 'GANHO MÁXIMO', `${xBet(e.limit)} atingido`, D.police, '#ffd76a'); return;
      case 'multiplier.change':
        ctx.render();
        await anim(ctx, ctx.cells[e.cell], [{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], D.mult);
        return;
      case 'persona.awaken':
        mark(ctx, e.cluster, 'target');
        await tag(ctx, `${e.persona} ${e.kind === 'refire' ? 'VOLTA A DISPARAR' : 'DESPERTOU'}`, e.fusion ? 'fusão a caminho…' : POWER_NAME[e.persona] + (e.party ? ' · Party Mode' : ''), D.tag, `var(--${e.persona})`);
        unmark(ctx, e.cluster, 'target');
        return;
      case 'fusion.trigger': await tag(ctx, `${e.surprise ? 'FUSÃO SURPRESA' : 'FUSÃO'}: ${fusionName(e.fusionId)}`, e.pair.join(' + '), D.tag + 150, '#ffd76a'); return;
      case 'grid.remove':
        await Promise.all(e.cells.map(c => anim(ctx, ctx.cells[c], [{ opacity: 1 }, { opacity: 0, transform: 'scale(.8)' }], D.remove)));
        ctx.render();
        return;
      case 'grid.refill':
        ctx.render();
        await Promise.all(e.newCells.map(c => anim(ctx, ctx.cells[c], [{ opacity: 0, transform: 'translateY(-18px)' }, { opacity: 1, transform: 'none' }], D.refill)));
        return;
      case 'power.reality_break':
        mark(ctx, e.cells, 'target');
        await tag(ctx, 'LCD — REALITY BREAK', `${e.cells.length} células → ${symName(e.target)}`, D.power, 'var(--LCD)');
        ctx.render();
        await pause(ctx, D.tagShort);
        unmark(ctx, e.cells, 'target');
        return;
      case 'power.slow_motion.start':
        ctx.render();
        mark(ctx, e.cells, 'target');
        await tag(ctx, e.kind === 'frozen' ? 'FROZEN REALITY' : e.kind === 'freeze' ? 'FREEZE & FREAK' : 'WEED — SLOW MOTION', `grupo sticky de ${e.cells.length}`, D.power, 'var(--WEED)');
        unmark(ctx, e.cells, 'target');
        return;
      case 'power.slow_motion.grow':
        ctx.render();
        mark(ctx, e.cells, 'target');
        await pause(ctx, D.power);
        unmark(ctx, e.cells, 'target');
        return;
      case 'power.slow_motion.end': ctx.render(); await pause(ctx, D.tagShort); return;
      case 'power.rave_rush.move': {
        const cells = e.from >= 0 ? [e.from, e.to] : [e.to];
        mark(ctx, cells, 'target');
        await pause(ctx, D.move / 2);
        ctx.render();
        await anim(ctx, ctx.cells[e.to], [{ transform: 'scale(.7)' }, { transform: 'scale(1)' }], D.move);
        unmark(ctx, cells, 'target');
        return;
      }
      case 'power.drunk_walk.step':
        ctx.render();
        await anim(ctx, ctx.cells[e.cell], [{ transform: 'rotate(-12deg) scale(.8)' }, { transform: 'none' }], D.walk);
        return;
      case 'power.one_more_chance.armed': await tag(ctx, 'COPIUM ARMADO', 'respin no fim da sequência', D.tagShort, 'var(--COPIUM)'); return;
      case 'power.one_more_chance.respin':
        mark(ctx, e.held, 'target');
        await tag(ctx, 'COPIUM — RESPIN', `guarda ${symName(e.symbol)}`, D.respin, 'var(--COPIUM)');
        ctx.render();
        await Promise.all(ctx.cells.map((el, i) => e.held.includes(i) ? null : anim(ctx, el, [{ opacity: 0 }, { opacity: 1 }], D.refill)));
        unmark(ctx, e.held, 'target');
        return;
      case 'wild.place':
        ctx.render();
        await anim(ctx, ctx.cells[e.cell], [{ transform: 'translateY(-30px) scale(1.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], D.wild);
        return;
      case 'chemistry.level': await tag(ctx, `CHEMISTRY ${e.to}/5`, LEVEL_NAME[e.to] ?? '', D.tagShort, '#b477ff'); return;
      case 'corner.open':
        ctx.render();
        await anim(ctx, ctx.cells[e.cell], [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], D.corner);
        return;
      case 'chemistry.total': await tag(ctx, 'TOTAL CHEMISTRY', 'multiplicadores ×2 · poderes em Party Mode', D.police, '#ffd76a'); return;
      case 'police.enter':
        await tag(ctx, e.mode === 'calmer' ? 'CALMER' : 'JOINER', e.mode === 'calmer' ? '«Everybody calm down!»' : '«I\'m joining the party!»', D.police, e.mode === 'calmer' ? 'var(--calmer)' : 'var(--joiner)');
        return;
      case 'police.calmer.arrest':
        mark(ctx, e.cells, 'target');
        await pause(ctx, D.power);
        unmark(ctx, e.cells, 'target');
        ctx.render();
        return;
      case 'police.joiner.party_mode': await tag(ctx, 'PARTY MODE', e.personas.join(' · ') || 'para as próximas personagens', D.tag, 'var(--joiner)'); return;
      case 'bonus.trigger': await tag(ctx, `${e.scatters} SCATTERS`, BONUS_NAME[e.bonusId], D.tag, '#ffd76a'); return;
      default: ctx.render(); return;
    }
  },
};
