import { ratingQuorumCount } from "../js/rating-quorum.js";
// Exact hidden unlock conditions stay in Functions; clients receive hints and earned evidence.
import { asDate, average, FEEDBACK, themeName } from "../js/utils.js";
import {
  CARD_POLICY,
  CARD_MINIMUM_RATINGS,
  cardExpiry,
  qualifiedCardGame,
  mergeCardAchievements,
} from "../js/card-achievements.js";
export const CARD_MVP_MINIMUM = 4.5;
export function markCardMvps(players) {
  const eligible = (player) =>
    Number.isFinite(player.overall) &&
    ratingQuorumCount(player,"overall") >= CARD_MINIMUM_RATINGS;
  const best = Math.max(
    0,
    ...Object.values(players)
      .filter(eligible)
      .map((player) => player.overall),
  );
  for (const player of Object.values(players))
    player.mvp =
      eligible(player) &&
      player.overall >= CARD_MVP_MINIMUM &&
      player.overall === best;
  return players;
}
const time = (value) => (value == null ? NaN : +asDate(value));

export const CARD_CRITERIA = Object.freeze({
  "in-form": "Pelo menos 4,0 em cada um dos últimos dois jogos avaliados.",
  mvp: "Melhor avaliação geral do jogo, pelo menos 4,5 e sete avaliações recebidas. Empates contam.",
  "hot-streak": "Pelo menos 4,2 em cada um dos últimos três jogos avaliados.",
  playmaker:
    "Média de Passe / Jogo coletivo de pelo menos 4,4 nos últimos três jogos válidos.",
  sniper:
    "Média de Ataque / Finalização de pelo menos 4,4 nos últimos três jogos válidos.",
  "the-wall":
    "Média de Defesa de pelo menos 4,4 nos últimos três jogos válidos.",
  engine:
    "Média de Intensidade / Físico de pelo menos 4,6 nos últimos três jogos válidos.",
  "safe-hands":
    "Pelo menos duas avaliações de Guarda-redes de 4,3 ou mais nas últimas três válidas.",
  "legend-form":
    "Média geral de pelo menos 4,5 nos últimos cinco jogos avaliados, sem nenhum abaixo de 4,0.",
  "perfect-five": "5,0 na mesma dimensão em três jogos avaliados consecutivos.",
  icon: "Quinze jogos avaliados, média geral mínima de 4,0 nos últimos dez e duas distinções de Melhor em Campo.",
  "fut-heroes":
    "Vence uma equipa pelo menos três pontos de OVR superior, com nota geral superior a 3,6 e pelo menos um golo ou uma assistência.",
  "fut-birthday":
    "As primeiras cinco participações avaliadas, com média geral mínima de 3,6 e pelo menos uma nota geral de 4,0.",
  otw: "Nos primeiros três jogos, média geral mínima de 4,0, sem nenhum abaixo de 3,5.",
  "future-stars":
    "Depois da carta oficial, cinco jogos avaliados, média geral mínima de 3,8 e ganho de cinco pontos de OVR pela progressão dos jogos, sem bónus de recompensas.",
  futties:
    "Vencer a votação da época, com pelo menos quatro jogos avaliados e média de Atitude mínima de 4,3 para entrar na lista de candidatos.",
  shapeshifters:
    "Dois jogos registados em cada uma de duas posições, com média geral mínima de 3,6 em ambas.",
  supernova:
    "Soma pelo menos seis golos e assistências num jogo, com nota geral mínima de 4,5.",
  aurora:
    "Depois de dois jogos abaixo de 3,0, dois jogos com pelo menos 4,0 e subida de um ponto na média.",
  eclipse:
    "Em seis participações, duas vitórias contra equipas pelo menos 1,2 pontos de OVR superiores, com nota geral mínima de 4,2 nas duas.",
  inferno:
    "Marcar em três participações seguidas, somar oito golos e ter média de Ataque / Finalização mínima de 4,3.",
  glacial:
    "Três participações consecutivas como guarda-redes, todas com avaliação válida de GR e média desse critério de pelo menos 4,0.",
  dynasty:
    "Cinco vitórias nas últimas sete participações, com média geral mínima de 4,0.",
  tots: "Melhor jogador da posição numa época de dois meses, com seis jogos avaliados e média geral mínima de 3,8. Desempate pela dimensão da posição e OVR.",
  toty: "Melhor jogador da posição num ano da liga de quatro meses, com doze jogos avaliados e média geral mínima de 3,8. Desempate pela dimensão da posição e OVR.",
});
const dimension = (row, key) =>
  Number.isFinite(row[key]) &&
  ratingQuorumCount(row,key) >= CARD_MINIMUM_RATINGS;
const mean = (rows, key = "overall") =>
  rows.length
    ? Math.round(average(rows.map((row) => row[key])) * 1e12) / 1e12
    : 0;
const every = (rows, n, key, minimum) =>
  rows.length === n &&
  rows.every((row) => dimension(row, key) && row[key] >= minimum);
const evidence = (rows) => rows.map((row) => row.gameId);
export function achievementRecord(id, row, proof, extra = {}) {
  const duration = CARD_POLICY[id]?.duration;
  if (!duration || !Number.isFinite(time(row.date))) return null;
  return {
    id,
    themeId: id,
    name: themeName(id),
    criterion: CARD_CRITERIA[id] || "",
    duration,
    earnedAt: asDate(row.date).toISOString(),
    expiresAt: cardExpiry(row.date, duration)?.toISOString() || null,
    evidence: proof,
    ...extra,
  };
}

// Evaluate every historical endpoint once. Rebuilding never restarts a timer.
export function evaluateCardAchievements(
  aggregates,
  { date = new Date(), officialSince = null } = {},
) {
  const all = [...aggregates]
    .filter((row) => row.gameId && time(row.date) <= +date)
    .map((row) =>
      row.evaluatedAt && time(row.evaluatedAt) > +date
        ? { ...row, count: 0 }
        : row,
    )
    .sort(
      (a, b) => time(a.date) - time(b.date) || a.gameId.localeCompare(b.gameId),
    );
  const awards = [];
  const add = (id, row, proof) =>
    awards.push(
      achievementRecord(
        id,
        {
          ...row,
          date: new Date(
            Math.max(
              time(row.date),
              ...proof.map((game) => time(game.evaluatedAt || game.date)),
            ),
          ),
        },
        evidence(proof),
        {
          sourceGameId: row.gameId,
          sourceDate: asDate(row.date).toISOString(),
        },
      ),
    );
  for (let i = 0; i < all.length; i++) {
    const row = all[i];
    if (!qualifiedCardGame(row)) continue;
    const rated = all.slice(0, i + 1).filter(qualifiedCardGame);
    const last = (n) => rated.slice(-n),
      two = last(2),
      three = last(3),
      five = last(5);
    if (every(two, 2, "overall", 4)) add("in-form", row, two);
    if (row.mvp && row.overall >= CARD_MVP_MINIMUM) add("mvp", row, [row]);
    if (every(three, 3, "overall", 4.2)) add("hot-streak", row, three);
    if (every(five, 5, "overall", 4) && mean(five) >= 4.5)
      add("legend-form", row, five);
    if (three.length === 3 && FEEDBACK.some(([key]) => every(three, 3, key, 5)))
      add("perfect-five", row, three);
    for (const [id, key] of [
      ["playmaker", "passing"],
      ["sniper", "attack"],
      ["the-wall", "defense"],
      ["engine", "physical"],
    ]) {
      const recent = rated.filter((r) => dimension(r, key)).slice(-3);
      if (
        recent.length === 3 &&
        recent.at(-1).gameId === row.gameId &&
        mean(recent, key) >= (key === "physical" ? 4.6 : 4.4)
      )
        add(id, row, recent);
    }
    const keepers = rated.filter((r) => dimension(r, "goalkeeping")).slice(-3);
    if (
      dimension(row, "goalkeeping") &&
      keepers.filter((r) => r.goalkeeping >= 4.3).length >= 2
    )
      add("safe-hands", row, keepers);
    if (
      rated.length >= 15 &&
      mean(last(10)) >= 4 &&
      rated.filter((r) => r.mvp).length >= 2
    )
      add("icon", row, rated);
    if (
      i === 2 &&
      every(all.slice(0, 3), 3, "overall", 3.5) &&
      mean(all.slice(0, 3)) >= 4
    )
      add("otw", row, all.slice(0, 3));
    if (
      i === 4 &&
      rated.length === 5 &&
      mean(rated) >= 3.6 &&
      rated.some((r) => r.overall >= 4)
    )
      add("fut-birthday", row, rated);
    const involvement = Math.min(
      row.teamGoals ?? Infinity,
      (row.goals || 0) + (row.assists || 0),
    );
    if (row.teamGoals > 0 && involvement >= 6 && row.overall >= 4.5)
      add("supernova", row, [row]);
    const underdog = (r) =>
      r.outcome === 1 && Number.isFinite(r.teamOvrGap) && r.teamOvrGap >= 3;
    if (
      underdog(row) &&
      (row.goals || 0) + (row.assists || 0) >= 1 &&
      Math.round(row.overall * 1e12) / 1e12 > 3.6
    )
      add("fut-heroes", row, [row]);
    const six = all.slice(Math.max(0, i - 5), i + 1);
    const upsets = six.filter(
      (r) =>
        qualifiedCardGame(r) &&
        r.outcome === 1 &&
        Number.isFinite(r.teamOvrGap) &&
        r.teamOvrGap >= 1.2 &&
        r.overall >= 4.2,
    );
    if (upsets.length >= 2 && upsets.at(-1).gameId === row.gameId)
      add("eclipse", row, upsets);
    const four = last(4);
    if (
      four.length === 4 &&
      four.slice(0, 2).every((r) => r.overall < 3) &&
      four.slice(2).every((r) => r.overall >= 4) &&
      mean(four.slice(2)) - mean(four.slice(0, 2)) >= 1
    )
      add("aurora", row, four);
    const playedThree = all.slice(Math.max(0, i - 2), i + 1);
    if (
      every(playedThree, 3, "attack", 0) &&
      playedThree.every((r) => qualifiedCardGame(r) && r.goals >= 1) &&
      playedThree.reduce((sum, r) => sum + r.goals, 0) >= 8 &&
      mean(playedThree, "attack") >= 4.3
    )
      add("inferno", row, playedThree);
    const seven = all.slice(Math.max(0, i - 6), i + 1);
    if (
      seven.length === 7 &&
      seven.every(qualifiedCardGame) &&
      seven.filter((r) => r.outcome === 1).length >= 5 &&
      mean(seven) >= 4
    )
      add("dynasty", row, seven);
    const positioned = rated.filter((r) =>
      ["GR", "DEF", "ALA", "MED", "AV"].includes(r.position),
    );
    const positions = [...new Set(positioned.map((r) => r.position))].filter(
      (position) => {
        const rows = positioned
          .filter((r) => r.position === position)
          .slice(-2);
        return rows.length === 2 && mean(rows) >= 3.6;
      },
    );
    if (positions.length >= 2)
      add(
        "shapeshifters",
        row,
        positioned.filter((r) => positions.includes(r.position)),
      );
    const polar = all.slice(Math.max(0, i - 2), i + 1);
    if (
      row.position === "GR" &&
      polar.length === 3 &&
      polar.every(
        (r) =>
          qualifiedCardGame(r) &&
          r.position === "GR" &&
          dimension(r, "goalkeeping"),
      ) &&
      mean(polar, "goalkeeping") >= 4
    )
      add("glacial", row, polar);
    const growth = rated.filter(
      (r) => officialSince && time(r.date) >= time(officialSince),
    );
    if (
      growth.length >= 5 &&
      mean(growth) >= 3.8 &&
      Number.isFinite(row.progressionGain) &&
      row.progressionGain >= 5
    )
      add("future-stars", row, growth);
  }
  return mergeCardAchievements([], awards.filter(Boolean));
}

// One winner per position, tied players share the award after all tie-breakers.
export function periodCardAwards(players, period, type = "tots") {
  const minimum = type === "toty" ? 12 : 6,
    threshold = 3.8;
  const dimensionKey = {
    GR: "goalkeeping",
    DEF: "defense",
    ALA: "attack",
    MED: "passing",
    AV: "attack",
  };
  const candidates = players
    .map((player) => {
      const rows = player.aggregates.filter(
        (row) =>
          qualifiedCardGame(row) &&
          time(row.date) >= +period.startsAt &&
          time(row.date) < +period.endsAt &&
          (!row.evaluatedAt ||
            time(row.evaluatedAt) <= +period.endsAt + 7 * 86400000),
      );
      const recordedPositions = rows
        .map((row) => row.position)
        .filter((position) => dimensionKey[position]);
      const position = recordedPositions.length
        ? [...new Set(recordedPositions)].sort(
            (a, b) =>
              recordedPositions.filter((p) => p === b).length -
                recordedPositions.filter((p) => p === a).length ||
              a.localeCompare(b),
          )[0]
        : player.position;
      const dimensionRows = rows.filter((row) =>
        dimension(row, dimensionKey[position]),
      );
      return {
        ...player,
        position,
        rows,
        mean: mean(rows),
        dimension: dimensionRows.length
          ? mean(dimensionRows, dimensionKey[position])
          : 0,
      };
    })
    .filter(
      (player) =>
        player.rows.length >= minimum &&
        player.mean >= threshold &&
        dimensionKey[player.position],
    );
  const result = [];
  for (const position of Object.keys(dimensionKey)) {
    const ranked = candidates
      .filter((player) => player.position === position)
      .sort(
        (a, b) => b.mean - a.mean || b.dimension - a.dimension || b.ovr - a.ovr,
      );
    const best = ranked[0];
    if (!best) continue;
    for (const player of ranked.filter(
      (p) =>
        p.mean === best.mean &&
        p.dimension === best.dimension &&
        p.ovr === best.ovr,
    )) {
      result.push({
        uid: player.uid,
        ...achievementRecord(
          type,
          { date: period.endsAt },
          evidence(player.rows),
          {
            id: `${type}@${period.id}`,
            themeId: type,
            periodId: period.id,
            name: `${type === "toty" ? "Apogeu" : "Equipa da Época"} · ${period.id}`,
            position,
          },
        ),
      });
    }
  }
  return result;
}
