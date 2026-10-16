import { calculateOverallDetails, calculateInitialBaseline, calculatePlayerStatsDetails } from "../../js/utils.js";

/** Pure audit projection. Stored snapshots and OVR remain untouched. */
export function ovrAuditData(player, history, week, weights) {
    const snapshot = history.find((h) => h.weekId === week);
    const historical = !!snapshot;
    const stats = snapshot?.stats || player.stats;
    const knownPosition =
      !historical || Object.hasOwn(snapshot, "primaryPosition");
    const position = historical
      ? snapshot.primaryPosition
      : player.primaryPosition;
    const calculation =
      snapshot?.ovrCalculation ||
      (player.cardLocked ? player.cardCalculation : null) ||
      calculateOverallDetails(
        stats,
        weights,
        position,
        player.inactivity,
      );
    const displayedOvr = snapshot?.ovr ?? player.ovr;
    const exact = calculation.exact.toLocaleString("pt-PT", {
      maximumFractionDigits: 6,
    });
    const preview = {
      ...player,
      cardPhoto: historical ? snapshot.cardPhoto || null : player.cardPhoto,
      stats,
      ovr: displayedOvr,
      ovrDelta: historical
        ? Number.isFinite(snapshot.previousOvr)
          ? snapshot.ovr - snapshot.previousOvr
          : null
        : player.ovrDelta,
      cardType: snapshot?.baseCard || player.cardType,
      specials: snapshot?.specials || player.specials,
      primaryPosition: position || player.primaryPosition,
    };
    const topFour = ["top-four-70-30-v1", "top-four-weighted-v2"].includes(
      calculation.version,
    );
    const individual = ["stat-weights-v3", "position-weights-v4"].includes(
      calculation.version,
    );
    const percentages = topFour || individual;
    const format = (n) =>
      n.toLocaleString("pt-PT", { maximumFractionDigits: 6 });
    const formula = individual
      ? `${calculation.rows.map((r) => `${r.value} × ${format(r.weight)}%`).join(" + ")} = ${format(calculation.rawExact ?? calculation.exact)}${calculation.inactivity?.penalty ? ` − ${calculation.inactivity.penalty} = ${exact}` : ""}`
      : topFour
        ? `${format(calculation.topAverage)} × ${calculation.topWeight ?? 70}% + ${format(calculation.remainingAverage)} × ${calculation.remainingWeight ?? 30}% = ${exact}`
        : `${calculation.total} ÷ ${calculation.divisor} = ${exact}`;
    const currentDetails =
      !historical && !player.cardLocked
        ? player.progression ||
          calculatePlayerStatsDetails(
            calculateInitialBaseline(player.initial, player.community),
            player.cardAggregates || [],
            {
              weights: weights,
              position: player.primaryPosition,
            },
          )
        : null;

return { snapshot, historical, knownPosition, position, calculation, displayedOvr, exact, preview, topFour, individual, percentages, formula, currentDetails };
}
