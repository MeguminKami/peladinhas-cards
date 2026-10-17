import { cardWeek } from "./card-week.js";

// An open week's history tile must show the same live card as the rest of the UI.
// Closed snapshots remain untouched, even when the calculation changes later.
export function historyForDisplay(player, history, cycle = cardWeek()) {
  return history.map((snapshot) => {
    if (
      cycle.phase !== "open" ||
      snapshot.weekId !== cycle.weekId ||
      snapshot.locked ||
      !player.hasCard
    )
      return snapshot;
    return {
      ...snapshot,
      stats: player.stats,
      permanentStats: player.permanentStats,
      permanentOvr: player.permanentOvr,
      ovr: player.ovr,
      baseCard: player.cardType,
      selectedCardId: player.selectedCardId || null,
      specials: player.specials,
      eventBoosts: player.eventBoosts,
      inactivity: player.inactivity,
      primaryPosition: player.primaryPosition,
      official: player.official,
      cardPhoto: player.cardPhoto,
      ovrCalculation: player.cardCalculation,
      appearance: {
        displayName: player.displayName || player.username,
        photoURL: player.photoURL || "",
        countryCode: player.countryCode,
      },
    };
  });
}
