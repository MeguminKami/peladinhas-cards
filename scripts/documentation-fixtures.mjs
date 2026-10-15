// Executed only inside the isolated browser used by capture-doc-images.mjs.
// All identities and records below are fictional; no production data is read.
export async function seedDocumentation() {
  const {
    ATTRIBUTES,
    calculateInitialBaseline,
    calculatePlayerStats,
    calculateOverall,
    calculateBaseCard,
    isoWeek,
  } = await import("./js/utils.js");
  const { cardWeek } = await import("./js/card-week.js");
  const state = window.__testState;
  const base = state.users[1];
  const roster = [
    ["pedro", "Pedro Silva", "MED", 16],
    ["joao", "João Fernandes", "AV", 15],
    ["miguel", "Miguel Costa", "DEF", 14],
    ["ana", "Ana Rodrigues", "ALA", 17],
    ["rui", "Rui Martins", "GR", 13],
    ["ines", "Inês Santos", "MED", 16],
    ["tiago", "Tiago Almeida", "DEF", 15],
    ["beatriz", "Beatriz Sousa", "ALA", 14],
    ["diogo", "Diogo Pereira", "AV", 17],
    ["marta", "Marta Ferreira", "GR", 15],
  ];
  state.users = roster.map(([uid, displayName, primaryPosition], index) => ({
    ...base,
    uid,
    username: uid,
    displayName,
    primaryPosition,
    role: index === 0 ? "admin" : index === 2 ? "dbs" : "member",
    secondaryPositions: primaryPosition === "GR" ? [] : ["ALA"],
    shirtNumber: index + 7,
    heightCm: 168 + index * 2,
    preferredFoot: index % 3 === 1 ? "left" : "right",
    playerStyle: primaryPosition === "MED" ? "Organização e passe" : "",
  }));
  state.initialRatings = roster.map(([uid, , , rating], index) => ({
    uid,
    completed: true,
    ratings20: Object.fromEntries(
      ATTRIBUTES.map(([key], dimension) => [
        key,
        Math.min(19, Math.max(9, rating + ((index + dimension) % 5) - 2)),
      ]),
    ),
  }));
  state.communitySummaries = state.initialRatings.map((rating) => ({
    targetId: rating.uid,
    count: 4,
    ratings20: rating.ratings20,
  }));
  const now = Date.now(),
    day = 86400000;
  const sides = {
    teamA: { starters: ["pedro", "ana", "miguel", "rui"], bench: ["diogo"] },
    teamB: { starters: ["joao", "ines", "tiago", "marta"], bench: ["beatriz"] },
  };
  state.games = [
    {
      id: "demo-next",
      title: "Peladinha de sexta-feira",
      location: "Pavilhão Municipal",
      scheduledAt: new Date(now + 2 * day).toISOString(),
      status: "open",
      ...structuredClone(sides),
      score: { teamA: 0, teamB: 0 },
    },
    ...[
      "Peladinha de quarta-feira",
      "Encontro de domingo",
      "Peladinha de sexta-feira",
    ].map((title, index) => ({
      id: `demo-game-${index}`,
      title,
      location: "Pavilhão Municipal",
      status: "closed",
      scheduledAt: new Date(now - (index * 3 + 1) * day).toISOString(),
      closedAt: new Date(now - (index * 3 + 1) * day + 3600000).toISOString(),
      ...structuredClone(sides),
      score: { teamA: index === 1 ? 4 : 5, teamB: index === 1 ? 4 : 3 },
      performance: {
        teamA: {
          goals: [
            "pedro",
            "ana",
            "diogo",
            "ana",
            ...(index === 1 ? [] : ["pedro"]),
          ],
          assists: ["ana", "pedro", "miguel"],
        },
        teamB: {
          goals: ["joao", "ines", "joao", ...(index === 1 ? ["tiago"] : [])],
          assists: ["ines", "beatriz"],
        },
      },
    })),
  ];
  state.gameSummaries = state.games
    .filter((g) => g.status === "closed")
    .map((game) => ({
      id: game.id,
      players: Object.fromEntries(
        state.users.map((u, index) => [
          u.uid,
          {
            overall: 3.6 + (index % 5) * 0.2,
            attack: 3.8 + (index % 3) * 0.2,
            passing: 3.9 + (index % 4) * 0.2,
            defense: 3.5 + (index % 4) * 0.3,
            physical: 4.0,
            goalkeeping: u.primaryPosition === "GR" ? 4.2 : null,
            attitude: 4.5,
            count: 4,
          },
        ]),
      ),
    }));
  state.weeklyCards = state.users.map((u) => {
    const initial = state.initialRatings.find((r) => r.uid === u.uid).ratings20;
    const stats = calculatePlayerStats(calculateInitialBaseline(initial), []);
    const ovr = calculateOverall(stats, u.primaryPosition);
    return {
      id: u.uid,
      uid: u.uid,
      weekId: cardWeek().weekId,
      stats,
      ovr,
      baseCard: calculateBaseCard(ovr),
      specials: [],
      official: true,
      appearance: {
        displayName: u.displayName,
        countryCode: "PT",
        country: "Portugal",
        primaryPosition: u.primaryPosition,
      },
    };
  });
  state.communityRatings = state.users.slice(1).map((u) => ({
    raterId: "pedro",
    targetId: u.uid,
    submitted: true,
    ratings20: state.initialRatings.find((r) => r.uid === u.uid).ratings20,
  }));
  state.feedback = state.games
    .filter((g) => g.status === "closed" && g.id !== "demo-game-0")
    .flatMap((g) =>
      state.users
        .filter((u) => u.uid !== "pedro")
        .map((u) => ({
          gameId: g.id,
          raterId: "pedro",
          targetId: u.uid,
          submitted: true,
          ratings: {
            overall: 4,
            attack: 4,
            passing: 4,
            defense: 4,
            physical: 4,
            goalkeeping: null,
            attitude: 5,
          },
        })),
    );
  state.feedback.push({
    gameId: "demo-game-0",
    raterId: "pedro",
    targetId: "ana",
    submitted: false,
    ratings: {
      overall: 4,
      attack: 5,
      passing: 4,
      defense: 3,
      physical: 4,
      goalkeeping: null,
      attitude: 5,
    },
  });
  const own = state.weeklyCards[0];
  state.history = Array.from({ length: 5 }, (_, index) => {
    const stats = Object.fromEntries(
      Object.entries(own.stats).map(([key, value]) => [key, value - index - 1]),
    );
    const ovr = calculateOverall(stats, "MED");
    return {
      ...own,
      id: `history-${index}`,
      weekId: isoWeek(new Date(now - (index + 1) * 7 * day)),
      stats,
      ovr,
      baseCard: calculateBaseCard(ovr),
      locked: true,
      primaryPosition: "MED",
    };
  });
  const common = {
    schemaVersion: 2,
    status: "open",
    participantIds: state.users.map((u) => u.uid),
    startsAt: new Date(now - 14 * day).toISOString(),
    endsAt: new Date(now + 14 * day).toISOString(),
    cadence: "once",
    maxRepeats: 1,
    scope: "individual",
    difficulty: "easy",
    prerequisites: { missionIds: [], mode: "all" },
    progress: [{ uid: "pedro", progress: 3 }],
  };
  state.events = [
    {
      ...common,
      id: "demo-scorer",
      kind: "event",
      method: "objective",
      title: "Corrida aos 10 golos",
      description: "Acompanha a classificação e o teu progresso até à meta.",
      objective: { metric: "goals", target: 10 },
      progress: [{ uid: "pedro", progress: 6 }],
      positionCount: 3,
    },
    {
      ...common,
      id: "demo-games",
      kind: "mission",
      method: "objective",
      title: "Presença em campo",
      description: "Participa em cinco jogos da liga.",
      objective: { metric: "games", target: 5 },
    },
    {
      ...common,
      id: "demo-assists",
      kind: "mission",
      method: "objective",
      title: "Jogar para a equipa",
      description: "Soma seis assistências nos jogos da liga.",
      objective: { metric: "assists", target: 6 },
    },
    {
      ...common,
      id: "demo-wins",
      kind: "mission",
      method: "objective",
      title: "Rumo à vitória",
      description: "Conquista quatro vitórias com a tua equipa.",
      objective: { metric: "wins", target: 4 },
      progress: [{ uid: "pedro", progress: 2 }],
    },
    {
      ...common,
      id: "demo-vote",
      kind: "event",
      method: "vote",
      title: "Jogador do mês",
      description: "Reconhece o contributo dos jogadores da comunidade.",
      voting: { maxChoices: 1, selfVote: false, showLiveCounts: true },
      questions: [],
    },
  ];
  state.notifications = [
    {
      id: "demo-notice-game",
      title: "A próxima Peladinha já está marcada",
      body: "Consulta as equipas e os detalhes do próximo encontro.",
      href: "#/game/demo-next",
      read: false,
      createdAt: new Date(now),
    },
    {
      id: "demo-notice-event",
      title: "Corrida aos 10 golos",
      body: "A competição está ativa. Consulta o teu progresso nas missões.",
      href: "#/missions",
      read: false,
      createdAt: new Date(now - 3600 * 1000),
    },
  ];
  state.tickets = [
    {
      id: "demo-support",
      title: "Atualização do registo de assistências",
      status: "open",
      uid: "pedro",
      updatedAt: new Date(now),
    },
  ];
  state.ticketMessages = [
    {
      id: "message-1",
      authorId: "pedro",
      authorName: "Pedro Silva",
      authorRole: "member",
      body: "No último jogo ficou uma assistência por registar. Podem verificar o resultado?",
      createdAt: new Date(now - 1800 * 1000),
    },
    {
      id: "message-2",
      authorId: "support-demo",
      authorName: "Organização da liga",
      authorRole: "admin",
      body: "Vamos confirmar com o responsável pelo jogo e atualizar o registo se necessário.",
      createdAt: new Date(now - 900 * 1000),
    },
  ];
  location.hash = "#/players";
}
