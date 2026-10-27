import { clone } from "../shared/core";
import { total, type Card, type Round } from "./engine";
export interface PresentationStep {
  type: "card" | "reveal";
  round: Round;
  card?: Card;
  hand?: string;
  seat?: number;
  dealer: boolean;
  hidden: boolean;
  terminal: boolean;
}
/** Project committed events one at a time. Rendering never receives future cards/results. */
export function presentationSteps(
  previous: Round | null,
  final: Round,
): PresentationStep[] {
  const same = previous?.id === final.id,
    prior = same ? previous : null;
  const seen = new Set(
    prior?.seats.flatMap((p) =>
      p.hands.flatMap((h) => h.cards.map((c) => c.id)),
    ) || [],
  );
  let dealerCount = prior?.dealer.length || 0,
    revealed = prior?.reveal || false,
    active = prior?.active || final.active;
  const steps: PresentationStep[] = [];
  const project = (eventCount: number) => {
    const r = clone(final);
    r.events = r.events.slice(0, eventCount);
    r.dealer = r.dealer.slice(0, dealerCount);
    r.reveal = revealed;
    r.phase = "play";
    r.active = active;
    r.gross = 0;
    for (const p of r.seats) {
      p.insuranceGross = 0;
      for (const h of p.hands) {
        h.cards = h.cards.filter((c) => seen.has(c.id));
        delete h.result;
        h.gross = 0;
        h.done = total(h.cards).value >= 21;
      }
    }
    return r;
  };
  for (const [index, event] of final.events.entries()) {
    if (index < (prior?.events.length || 0)) continue;
    if (event.type === "card") {
      if (event.hand && event.card) seen.add(event.card.id);
      else dealerCount++;
      if (!event.hand && dealerCount > 2) active = null;
      const r = project(index + 1),
        hand = r.seats.flatMap((p) => p.hands).find((h) => h.id === event.hand);
      steps.push({
        type: "card",
        round: r,
        card: event.card,
        hand: event.hand,
        seat: event.seat,
        dealer: !event.hand,
        hidden: !!event.hidden,
        terminal: !!hand && total(hand.cards).value >= 21,
      });
    } else if (event.type === "reveal") {
      revealed = true;
      active = null;
      steps.push({
        type: "reveal",
        round: project(index + 1),
        card: event.card,
        dealer: true,
        hidden: false,
        terminal: false,
      });
    }
  }
  return steps;
}
export function pausePresentation(
  ms: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    let timer: number;
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    signal.addEventListener("abort", done, { once: true });
    timer = window.setTimeout(done, ms);
    if (signal.aborted) done();
  });
}
