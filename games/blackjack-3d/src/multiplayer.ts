import "./main"; // Reuse the established table, typography, chips and interaction styles.
import "./multiplayer.css";
import { BlackjackScene } from "./scene";
import { cardHTML, avatarHTML } from "./cards";
import { chipSelectorHTML } from "./chip-selector";
import { fresh, total, available, type Round, type Session } from "./engine";
import { money } from "../shared/core";
import { presentationSteps, pausePresentation } from "./presentation";
import { AudioBus } from "../shared/audio";
import { dialog, settings } from "../shared/ui";

interface Player {
  uid: string;
  name: string;
  seat: number;
  bet: number;
  activeUntil: number;
  leaving: boolean;
}
interface Table {
  id: string;
  revision: number;
  deadline: number;
  players: Player[];
  round: Round | null;
}
interface View {
  table: Table | null;
  uid: string;
  balance: number;
  now: number;
  pending: boolean;
}
interface Connection {
  command: (
    action?: string,
    amount?: number,
    seat?: number,
  ) => Promise<unknown>;
  subscribe: (fn: (view: View) => void) => () => void;
}
const escape = (s: string) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const shortName = (name: string) =>
  name.length > 14 ? name.split(/\s+/)[0] : name;

export function mountMultiplayer(root: HTMLElement, connection: Connection) {
  let view: View,
    displayed: Round | null = null,
    lastRound: Round | null = null,
    chip = 100,
    bet = 0,
    focusedSeat = 0,
    working = false,
    presenting = false,
    message = "",
    destroyed = false;
  let lastRevision = -1,
    abort = new AbortController(),
    offset = 0;
  const drafts = Array(5).fill(0);
  const undo = Array.from({ length: 5 }, () => [] as number[]);
  const audio = new AudioBus("atelier:blackjack:audio");
  root.innerHTML = `<main class="shell blackjack-shell multiplayer-shell"><header class="topbar"><div class="brand">PELADINHAS<small>MESA · <span data-people>0/5</span></small></div><div class="top-actions"><button data-action="rules">Regras</button><button data-action="settings" aria-label="Som e definições">♫</button></div></header><div class="stage"><span class="stage-label">BLACKJACK · 4 BARALHOS · S17</span><div class="dealer-hud"></div><section class="seats" aria-label="Jogadores à mesa"></section></div><section class="table-floor"><div class="decision-dock"></div></section><section class="control-bar"><div class="betting-wallet"><div class="chips" aria-label="Selecionar ficha"></div><div class="wallet"><small>O TEU SALDO · DJC</small><strong data-balance>—</strong></div></div><div class="stat"><small>A TUA APOSTA</small><strong data-bet>0,00</strong></div></section><div class="status" role="status" aria-live="polite"></div></main>`;
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const scene = new BlackjackScene(q(".stage"));
  const session = (round: Round | null): Session => ({
    ...fresh(),
    balance: view?.balance || 0,
    round,
  });
  const mine = () =>
    view?.table?.players.find(
      (p) => p.uid === view.uid && p.seat === focusedSeat,
    ) || view?.table?.players.find((p) => p.uid === view.uid);
  const owned = () =>
    view?.table?.players.filter((p) => p.uid === view.uid) || [];
  function focusSeat(seat: number) {
    const target = owned().find((p) => p.seat === seat);
    if (!target) return;
    const previous = mine();
    if (previous) drafts[previous.seat - 1] = bet;
    focusedSeat = seat;
    bet = drafts[seat - 1];
    message = "";
    render();
  }
  function render() {
    if (destroyed || !view?.table) return;
    const focus = (
      document.activeElement as HTMLElement
    )?.closest<HTMLButtonElement>("button");
    const focusAction = focus?.dataset.action,
      focusChip = focus?.dataset.chip;
    const t = view.table,
      r = displayed,
      p = mine(),
      locked = working || view.pending;
    q("[data-people]").textContent = `${t.players.length}/5`;
    q("[data-balance]").textContent = money(view.balance);
    q("[data-bet]").textContent = money(
      owned().reduce(
        (sum, p) =>
          sum + p.bet + (p.bet ? 0 : p === mine() ? bet : drafts[p.seat - 1]),
        0,
      ),
    );
    q(".chips").innerHTML = chipSelectorHTML(chip);
    q(".chips")
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((b) => (b.disabled = locked || !!t.round || !!p?.bet));
    q(".dealer-hud").innerHTML = r
      ? `<small>DEALER</small><div class="cards">${r.dealer.map((c, i) => cardHTML(i === 1 && !r.reveal ? null : c)).join("")}</div><output class="dealer-total" data-dealer-total aria-label="Total do dealer">${r.reveal ? total(r.dealer).value : r.dealer[0] ? total([r.dealer[0]]).value + " + ?" : "A distribuir"}</output>`
      : '<small>DEALER</small><div class="rules-note">Blackjack paga 3:2 · Para em 17</div>';
    q(".seats").innerHTML = Array.from({ length: 5 }, (_, i) => {
      const owner = t.players.find((p) => p.seat === i + 1),
        seat = r?.seats.find((s) => s.number === i + 1),
        active = seat?.hands.some((h) => h.id === r?.active),
        own = owner?.uid === view.uid;
      const shown =
        seat?.hands.find((h) => h.id === r?.active) ||
        seat?.hands.find((h) => !h.done) ||
        seat?.hands.at(-1);
      return `<article class="seat ${owner ? "occupied" : ""} ${own && owner.seat === p?.seat ? "viewed" : ""} ${active ? "active" : ""} ${!r ? "betting-seat" : ""}" aria-label="${owner ? escape(owner.name) : "Lugar livre"}" style="--seat-x:${[18, 34, 50, 66, 82][i]}%;--seat-y:${[48, 64, 70, 64, 48][i]}%;--seat-mobile-y:${[47, 59, 63, 59, 47][i]}%"><div class="table-hands ${seat && seat.hands.length > 1 ? "split-hands" : ""}">${seat?.hands.map((h, j) => `<div class="hand ${[h.id === r?.active ? "active" : "", h === shown ? "focused-hand" : ""].join(" ")} ${seat.hands.length > 1 && h !== shown ? "ghost-hand" : ""}" aria-label="Mão ${j + 1}"><div class="cards">${h.cards.map(cardHTML).join("")}</div><span class="hand-total">${total(h.cards).value}</span><span class="chip-anchor hand-chips" data-chip-hand="${h.id}" aria-hidden="true"></span>${h.result ? `<span class="hand-result">${escape(h.result)}</span>` : ""}${seat.hands.length > 1 ? `<span class="split-label">M${j + 1} · ${total(h.cards).value}</span>` : ""}</div>`).join("") || ""}</div><div class="seat-person">${!owner || own ? `<button class="avatar" data-action="${owner ? `focus-${i + 1}` : `occupy-${i + 1}`}" aria-label="${owner ? `Selecionar o teu lugar ${i + 1}` : `Ocupar lugar ${i + 1}`}" aria-pressed="${own && owner.seat === p?.seat}" ${locked ? "disabled" : ""}>${owner ? avatarHTML(i) : '<span class="empty-avatar">+</span>'}</button>` : `<div class="avatar">${avatarHTML(i)}</div>`}${active ? `<span class="turn-indicator">${own ? "A TUA VEZ" : "A JOGAR"}</span>` : ""}<span class="seat-name" title="${escape(owner?.name || "Lugar livre")}">${owner ? escape(shortName(owner.name)) + (own ? " · Tu" : "") : "Livre"}</span></div><div class="table-stake">${!t.round && own ? `<button class="wager-zone" data-action="add-${i + 1}" aria-label="Adicionar ficha à aposta do lugar ${i + 1}" ${locked || owner?.bet ? "disabled" : ""}><span class="chip-anchor" data-seat-chips="${i + 1}" aria-hidden="true"></span><strong>${money(owner?.bet || (owner?.seat === p?.seat ? bet : drafts[i]))}</strong><small>${owner?.bet ? "Pronto" : "Apostar"}</small></button>` : owner?.bet ? `<strong>${money(owner.bet)}</strong>` : ""}</div></article>`;
    }).join("");
    const activeOwner = t.players.find((p) =>
      t.round?.seats
        .find((s) => s.number === p.seat)
        ?.hands.some((h) => h.id === t.round?.active),
    );
    const a = available(session(t.round)),
      buttons = (items: [string, string, boolean?][]) =>
        items
          .map(
            ([action, label, disabled]) =>
              `<button data-action="${action}" ${(action === "retry" ? working : locked) || disabled ? "disabled" : ""}>${label}</button>`,
          )
          .join("");
    let caption = "",
      controls = "";
    if (view.pending) {
      caption = "A confirmar a tua jogada";
      controls = buttons([["retry", "Recuperar pedido"]]);
    } else if (t.round && presenting) {
      caption = "A distribuir as cartas…";
      controls = buttons([["skip", "Ver mesa"]]);
    } else if (!t.round) {
      caption = p?.bet
        ? `Lugar ${p.seat} · Aposta confirmada.`
        : `Lugar ${p?.seat} · Escolhe a tua aposta.`;
      controls = buttons([
        ["undo", "Reset", !p || !undo[p.seat - 1].length || !!p?.bet],
        ["clear", "Limpar", !bet || !!p?.bet],
        ["bet", p?.bet ? "Pronto ✓" : "Pronto", !bet || !!p?.bet],
      ]);
    } else if (t.round.phase === "insurance") {
      const seat = t.round.seats.find((s) => s.number === p?.seat);
      caption =
        seat?.insured === null
          ? "O dealer mostra Ás. Queres seguro?"
          : "A aguardar a decisão do seguro.";
      if (seat?.insured === null)
        controls = buttons([
          [
            "insure",
            `Seguro ${money(seat.initial / 2)}`,
            view.balance < seat.initial / 2,
          ],
          ["decline", "Sem seguro"],
        ]);
    } else if (t.round.phase === "summary") {
      const seats = t.round.seats.filter((s) =>
        owned().some((p) => p.seat === s.number),
      );
      const net = seats.reduce(
        (n, s) =>
          n +
          s.insuranceGross -
          s.insurance +
          s.hands.reduce((n, h) => n + h.gross - h.stake, 0),
        0,
      );
      caption = seats.length
        ? `${seats.length > 1 ? `${seats.length} lugares` : seats[0].hands.map((h) => h.result).join(" / ")} · ${net >= 0 ? "+" : ""}${money(net)} DJC`
        : "Ronda concluída. Entras na próxima.";
    } else if (activeOwner?.uid === view.uid) {
      caption = `É a tua vez · Lugar ${activeOwner.seat}`;
      controls = buttons([
        ["hit", "Carta", !!a.hit],
        ["stand", "Parar", !!a.stand],
        ["double", "Dobrar", !!a.double],
        ["split", "Dividir", !!a.split],
      ]);
    } else
      caption = activeOwner
        ? `${activeOwner.name} está a jogar. Acompanha a mesa.`
        : "Entras na próxima ronda.";
    q(".decision-dock").innerHTML =
      `<div class="decision-caption"><strong>${escape(caption)}</strong><span data-countdown></span></div><div class="controls">${controls}</div>`;
    q(".status").textContent =
      message ||
      "Cada pessoa joga contra o dealer. A sala fecha após 1 min sem jogo.";
    scene.chipTable.sync(
      session(r),
      t.players.reduce((bets, p) => {
        bets[p.seat - 1] =
          p.bet ||
          (p.uid === view.uid
            ? p.seat === mine()?.seat
              ? bet
              : drafts[p.seat - 1]
            : 0);
        return bets;
      }, Array(5).fill(0)),
    );
    if (focusAction)
      root
        .querySelector<HTMLButtonElement>(
          `button[data-action="${focusAction}"]:not(:disabled)`,
        )
        ?.focus({ preventScroll: true });
    if (focusChip)
      root
        .querySelector<HTMLButtonElement>(
          `button[data-chip="${focusChip}"]:not(:disabled)`,
        )
        ?.focus({ preventScroll: true });
    clock();
  }
  function clock() {
    if (!view?.table || destroyed) return;
    const now = Date.now() + offset,
      t = view.table,
      seconds = Math.max(0, Math.ceil((t.deadline - now) / 1000));
    const label = root.querySelector("[data-countdown]");
    if (label)
      label.textContent = t.deadline
        ? (t.round?.phase === "summary"
            ? "Próxima ronda"
            : t.round
              ? "Tempo da decisão"
              : "Apostas fecham") + ` · ${seconds}s`
        : "";
    const p = mine();
    const playing =
      t.round &&
      t.round.phase !== "summary" &&
      t.round.seats.some((s) => owned().some((p) => p.seat === s.number));
    if (p && !playing && p.activeUntil - now < 25000 && !message)
      q(".status").textContent =
        "Vais sair por inatividade. Participa na próxima ronda para continuar.";
  }
  async function receive(next: View) {
    if (destroyed) return;
    view = next;
    offset = next.now - Date.now();
    if (!view.table) return;
    if (!owned().some((p) => p.seat === focusedSeat) && owned().length) {
      focusedSeat = owned()[0].seat;
      bet = drafts[focusedSeat - 1];
    }
    if (lastRevision === view.table.revision) {
      render();
      return;
    }
    lastRevision = view.table.revision;
    abort.abort();
    abort = new AbortController();
    const signal = abort.signal;
    const round = view.table.round,
      previous = displayed;
    presenting = !!round;
    lastRound = round;
    if (!round) {
      presenting = false;
      displayed = null;
      if (previous) {
        bet = 0;
        drafts.fill(0);
        undo.forEach((h) => (h.length = 0));
      }
      render();
      scene.sync(session(null), Array(5).fill(0), false);
      return;
    }
    const steps = presentationSteps(previous, round);
    for (const [index, step] of steps.entries()) {
      if (signal.aborted || destroyed) return;
      displayed = step.round;
      render();
      if (!audio.settings.reduced || index === 0) audio.tone("card");
      if (!audio.settings.reduced) {
        const cards = step.dealer
          ? q(".dealer-hud .cards")
          : Array.from(root.querySelectorAll<HTMLElement>(".hand"))
              .find(
                (el) =>
                  el.querySelector<HTMLElement>("[data-chip-hand]")?.dataset
                    .chipHand === step.hand,
              )
              ?.querySelector(".cards");
        const card = (
          step.type === "reveal" ? cards?.children[1] : cards?.lastElementChild
        ) as HTMLElement | undefined;
        if (card) {
          const source = scene.shoeScreenPosition(),
            rect = card.getBoundingClientRect(),
            stage = q(".stage").getBoundingClientRect();
          const animation = card.animate(
            step.type === "reveal"
              ? [
                  { transform: "scaleX(.05)", opacity: 0.5 },
                  { transform: "scaleX(1)", opacity: 1 },
                ]
              : [
                  {
                    transform: `translate(${stage.left + source.x - rect.left - rect.width / 2}px,${stage.top + source.y - rect.top - rect.height / 2}px) rotate(-12deg) scale(.7)`,
                    opacity: 0.2,
                  },
                  {
                    transform: "translate(0,0) rotate(0) scale(1)",
                    opacity: 1,
                  },
                ],
            { duration: 320, easing: "cubic-bezier(.2,.65,.3,1)" },
          );
          const cancel = () => animation.cancel();
          signal.addEventListener("abort", cancel, { once: true });
          try {
            await animation.finished;
          } catch {
          } finally {
            signal.removeEventListener("abort", cancel);
          }
        }
      }
      await pausePresentation(
        audio.settings.reduced ? 0 : step.terminal ? 300 : 160,
        signal,
      );
    }
    if (signal.aborted || destroyed) return;
    displayed = round;
    presenting = false;
    render();
    scene.sync(session(round), Array(5).fill(0), false);
    if (round.phase === "summary" && previous?.phase !== "summary") {
      const net = round.seats
        .filter((s) => owned().some((p) => p.seat === s.number))
        .reduce(
          (n, s) =>
            n +
            s.hands.reduce((n, h) => n + h.gross - h.stake, 0) +
            s.insuranceGross -
            s.insurance,
          0,
        );
      audio.tone(net > 0 ? "win" : net < 0 ? "bust" : "push");
      await scene.chipTable.settle(round, audio.settings.reduced, signal);
    }
  }
  const unsubscribe = connection.subscribe((next) => {
    void receive(next).catch((e) => {
      message = e.message;
      render();
    });
  });
  async function action(name: string) {
    audio.unlock();
    if (name === "skip") {
      abort.abort();
      presenting = false;
      displayed = lastRound;
      render();
      scene.sync(session(displayed), Array(5).fill(0), false);
      return;
    }
    if (name.startsWith("focus-")) {
      focusSeat(Number(name.slice(6)));
      return;
    }
    if (name.startsWith("occupy-")) {
      if (working || view.pending) return;
      working = true;
      render();
      try {
        await connection.command("occupy", undefined, Number(name.slice(7)));
        focusSeat(Number(name.slice(7)));
      } finally {
        working = false;
        render();
      }
      return;
    }
    if (name.startsWith("add-")) {
      focusSeat(Number(name.slice(4)));
      name = "add";
    }
    if (name === "settings") {
      settings(root, audio);
      return;
    }
    if (name === "rules") {
      dialog(
        root,
        "Blackjack · Mesa partilhada",
        "<p>Cada pessoa pode ocupar vários dos cinco lugares e joga contra o mesmo dealer. Clica num + livre para ocupar e no teu avatar para escolher onde apostar. Quem entra durante uma ronda participa na seguinte.</p><p>Quatro baralhos, blackjack 3:2, vitória 1:1 e empate devolve a aposta. Dealer para em todo o 17. Dobrar em duas cartas, incluindo após split; até quatro mãos por lugar. Áses divididos recebem uma carta. Seguro custa metade da aposta e paga 2:1 de lucro.</p><p>Confirma a aposta em Pronto. A primeira aposta abre 15 segundos; a ronda começa antes se todos estiverem prontos. Cada decisão tem 30 segundos: o timeout para a mão ou recusa seguro. A sala fecha após um minuto sem ronda em curso, contado desde a abertura ou a última ronda terminada. Uma ronda pode durar mais de um minuto. Sem participar durante dois minutos sais da mesa; uma quebra de ligação reserva o lugar por 60 segundos. Apostas em curso são sempre resolvidas no servidor.</p>",
      );
      return;
    }
    if (working) return;
    if (["add", "undo", "clear"].includes(name)) {
      if (view.table?.round || mine()?.bet || view.pending) return;
      if (name === "add") {
        if (bet + chip > view.balance || bet + chip > 100000)
          throw Error("Saldo ou limite de aposta excedido.");
        undo[mine()!.seat - 1].push(bet);
        bet += chip;
      }
      if (name === "undo") bet = undo[mine()!.seat - 1].pop() ?? bet;
      if (name === "clear") {
        undo[mine()!.seat - 1].push(bet);
        bet = 0;
      }
      drafts[mine()!.seat - 1] = bet;
      render();
      return;
    }
    abort.abort();
    presenting = false;
    displayed = lastRound;
    working = true;
    message = "";
    render();
    try {
      await connection.command(
        name === "retry" ? undefined : name,
        name === "bet" ? bet : undefined,
        ["hit", "stand", "double", "split"].includes(name)
          ? view.table?.round?.seats.find((s) =>
              s.hands.some((h) => h.id === view.table?.round?.active),
            )?.number
          : mine()?.seat,
      );
    } finally {
      working = false;
      render();
    }
  }
  const click = (e: MouseEvent) => {
    const button = (e.target as Element).closest<HTMLButtonElement>("button");
    if (!button || button.disabled) return;
    if (button.dataset.chip) {
      chip = Number(button.dataset.chip);
      render();
    } else if (button.dataset.action)
      void action(button.dataset.action).catch((e) => {
        message = e.message;
        render();
      });
  };
  const key = (e: KeyboardEvent) => {
    if (
      e.repeat ||
      e.ctrlKey ||
      e.altKey ||
      e.metaKey ||
      (e.target as Element)?.closest(
        "input,button,a,select,textarea,[contenteditable]",
      ) ||
      root.querySelector("dialog[open]")
    )
      return;
    const a: Record<string, string> = {
      h: "hit",
      s: "stand",
      d: "double",
      p: "split",
    };
    if (a[e.key.toLowerCase()]) {
      const button = root.querySelector<HTMLButtonElement>(
        `[data-action="${a[e.key.toLowerCase()]}"]`,
      );
      if (!button || button.disabled) return;
      e.preventDefault();
      void action(a[e.key.toLowerCase()]).catch((e) => {
        message = e.message;
        render();
      });
    }
  };
  root.addEventListener("click", click);
  document.addEventListener("keydown", key);
  const timer = setInterval(clock, 1000);
  return {
    destroy() {
      destroyed = true;
      abort.abort();
      unsubscribe();
      clearInterval(timer);
      root.removeEventListener("click", click);
      document.removeEventListener("keydown", key);
      scene.destroy();
      audio.destroy();
      root.replaceChildren();
    },
  };
}
