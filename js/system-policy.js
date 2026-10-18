// Shared by the browser and trusted Functions. No Firebase dependency here.
export const POLICY_FIELDS = [
  [
    "rewards",
    "Recompensas",
    [
      ["temporaryAttribute", "Bónus temporário por atributo", 10, 0, 30],
      ["temporaryAward", "Soma de atributos por prémio temporário", 20, 0, 120],
      [
        "permanentAttribute",
        "Bónus permanente acumulado por atributo",
        10,
        0,
        30,
      ],
      [
        "dailyBudget",
        "Orçamento diário por jogador (0 = sem teto)",
        0,
        0,
        1000,
      ],
      [
        "weeklyBudget",
        "Orçamento semanal por jogador (0 = sem teto)",
        0,
        0,
        5000,
      ],
      [
        "monthlyBudget",
        "Orçamento mensal por jogador (0 = sem teto)",
        0,
        0,
        20000,
      ],
      [
        "missionBudget",
        "Orçamento semanal de missões (0 = sem teto)",
        0,
        0,
        5000,
      ],
      [
        "eventBudget",
        "Orçamento semanal de eventos (0 = sem teto)",
        0,
        0,
        5000,
      ],
      [
        "overflow",
        "Ao atingir um limite",
        "reduce",
        ["reduce", "reject", "defer"],
      ],
    ],
  ],
  [
    "rules",
    "Regras globais",
    [
      ["ratingEditDays", "Prazo de edição de avaliações (dias)", 7, 1, 30],
      ["communityMinimum", "Votos externos para carta oficial", 3, 1, 20],
      ["selfWeight", "Peso máximo inicial da autoavaliação", 0.2, 0, 0.2],
      ["maxRepeats", "Máximo de conclusões por missão", 12, 1, 100],
      ["maxWinners", "Máximo de posições premiadas", 20, 1, 100],
      ["maxVotes", "Máximo de escolhas por votante", 10, 1, 50],
      ["allowPermanent", "Permitir novos prémios permanentes", true],
      ["allowMonthly", "Permitir novos prémios mensais", true],
    ],
  ],
  [
    "progression",
    "Progressão e inatividade",
    [
      ["speed", "Velocidade de progressão", 2.3, 0.1, 4],
      ["gainCap", "Ganho máximo por atributo/jogo", 4, 0, 5],
      ["lossCap", "Perda máxima por atributo/jogo", 0.45, 0, 2],
      [
        "inactivityStart",
        "Jogos seguidos sem participar antes da penalização",
        4,
        1,
        30,
      ],
      ["inactivityMaximum", "Penalização máxima de OVR", 10, 0, 20],
      ["inactivityEnabled", "Aplicar penalização por inatividade", true],
    ],
  ],
  [
    "features",
    "Disponibilidade",
    [
      ["mode", "Modo da plataforma", "normal", ["normal", "readOnly"]],
      [
        "message",
        "Aviso público",
        "A plataforma está temporariamente em manutenção.",
      ],
      ["registration", "Permitir novos registos", true],
      ["games", "Permitir alterações a jogos", true],
      ["ratings", "Permitir avaliações", true],
      ["missions", "Permitir missões", true],
      ["events", "Permitir eventos e votações", true],
      ["claims", "Permitir receber recompensas", true],
    ],
  ],
  [
    "automation",
    "Automatizações",
    [
      ["cards", "Processar cartas semanais", true],
      ["events", "Processar desafios e expirações", true],
      ["collection", "Atualizar coleções", true],
      ["reminders", "Enviar lembretes automáticos", true],
      ["cleanup", "Limpar dados transitórios", true],
    ],
  ],
  [
    "cycle",
    "Calendário das cartas",
    [
      ["openHour", "Abertura à quinta-feira (hora Lisboa)", 12, 0, 23],
      ["closeHour", "Fecho à quarta-feira (hora Lisboa)", 12, 0, 23],
      ["seasonMonths", "Meses por época de coleção", 2, 1, 12],
      ["yearMonths", "Meses por ano de coleção", 4, 1, 12],
    ],
  ],
  [
    "notifications",
    "Notificações",
    [
      ["enabled", "Enviar notificações", true],
      ["quietStart", "Silêncio dos lembretes: início (hora Lisboa)", 22, 0, 23],
      ["quietEnd", "Silêncio dos lembretes: fim (hora Lisboa)", 8, 0, 23],
      ["maxDaily", "Máximo de lembretes por jogador/dia", 5, 1, 30],
      ["cooldownMinutes", "Intervalo mínimo entre lembretes", 60, 0, 1440],
      [
        "feedbackHours",
        "Primeiro lembrete de avaliação após (horas)",
        24,
        1,
        168,
      ],
    ],
  ],
  [
    "security",
    "Proteção e retenção",
    [
      [
        "requestsPerMinute",
        "Máximo por operação/utilizador/minuto",
        60,
        5,
        300,
      ],
      [
        "totalRequestsPerMinute",
        "Pedidos totais por utilizador/minuto",
        300,
        30,
        2000,
      ],
      ["requireAppCheck", "Exigir App Check nas operações de alteração", false],
      ["appCheckSiteKey", "Chave pública reCAPTCHA v3 para App Check", ""],
      ["notificationDays", "Conservar notificações lidas (dias)", 90, 7, 730],
      ["operationDays", "Conservar operações concluídas (dias)", 180, 30, 730],
    ],
  ],
];
export const DEFAULT_POLICY = Object.freeze(
  Object.fromEntries(
    POLICY_FIELDS.map(([section, , fields]) => [
      section,
      Object.freeze(
        Object.fromEntries(fields.map(([key, , value]) => [key, value])),
      ),
    ]),
  ),
);
let browserDocument = null;
let provider = () => browserDocument;
const compiledPolicies = new WeakMap();
export function normalizePolicy(value = {}) {
  return Object.fromEntries(
    POLICY_FIELDS.map(([section, , fields]) => [
      section,
      Object.fromEntries(
        fields.map(([key, , initial]) => [
          key,
          value?.[section]?.[key] ?? initial,
        ]),
      ),
    ]),
  );
}
function compile(document) {
  if (!document || typeof document !== "object") return [];
  if (compiledPolicies.has(document)) return compiledPolicies.get(document);
  let config = DEFAULT_POLICY;
  const entries = [...(document.timeline || [])]
    .sort((a, b) => +new Date(a.effectiveAt) - +new Date(b.effectiveAt))
    .map((row) => {
      config = row.config
        ? normalizePolicy(row.config)
        : normalizePolicy(
            Object.fromEntries(
              POLICY_FIELDS.map(([section]) => [
                section,
                { ...config[section], ...row.patch?.[section] },
              ]),
            ),
          );
      return { ...row, config };
    });
  compiledPolicies.set(document, entries);
  return entries;
}
function applicable(date, document) {
  const time = +new Date(date),
    entries = compile(document);
  let low = 0,
    high = entries.length - 1,
    result = null;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (+new Date(entries[middle].effectiveAt) <= time) {
      result = entries[middle];
      low = middle + 1;
    } else high = middle - 1;
  }
  return result;
}
export function setPolicyDocument(value) {
  browserDocument = value;
}
export function setPolicyProvider(value) {
  provider = value;
}
export function policyAt(date = new Date(), document = provider()) {
  return applicable(date, document)?.config || DEFAULT_POLICY;
}
export function policyVersion(date = new Date(), document = provider()) {
  return applicable(date, document)?.version || 0;
}
export function validatePolicy(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("Configuração inválida.");
  const result = {};
  if (
    Object.keys(input).some((key) => !POLICY_FIELDS.some(([id]) => key === id))
  )
    throw Error("Secção desconhecida.");
  for (const [section, , fields] of POLICY_FIELDS) {
    const values = input[section];
    if (
      !values ||
      typeof values !== "object" ||
      Object.keys(values).some((key) => !fields.some(([id]) => key === id))
    )
      throw Error(`Secção inválida: ${section}.`);
    result[section] = {};
    for (const [key, label, initial, min, max] of fields) {
      const value = values[key];
      const valid =
        typeof initial === "boolean"
          ? typeof value === "boolean"
          : typeof initial === "number"
            ? Number.isFinite(value) &&
              value >= min &&
              value <= max &&
              (Number.isInteger(initial) ? Number.isInteger(value) : true)
            : Array.isArray(min)
              ? min.includes(value)
              : typeof value === "string" &&
                value.length <= 300 &&
                !/[<>]/.test(value);
      if (!valid) throw Error(`Valor inválido: ${label}.`);
      result[section][key] = value;
    }
  }
  if (result.rewards.temporaryAward < result.rewards.temporaryAttribute)
    throw Error(
      "O limite por prémio não pode ser inferior ao limite por atributo.",
    );
  if (
    result.security.requireAppCheck &&
    !/^[A-Za-z0-9_-]{20,150}$/.test(result.security.appCheckSiteKey)
  )
    throw Error(
      "Configura uma chave pública válida antes de exigir App Check.",
    );
  if (
    result.security.appCheckSiteKey &&
    !/^[A-Za-z0-9_-]{20,150}$/.test(result.security.appCheckSiteKey)
  )
    throw Error("Chave pública App Check inválida.");
  if (
    12 % result.cycle.seasonMonths ||
    12 % result.cycle.yearMonths ||
    result.cycle.yearMonths % result.cycle.seasonMonths
  )
    throw Error(
      "Os períodos de coleção devem dividir o calendário e o ano deve conter épocas completas.",
    );
  const budgets = result.rewards;
  if (
    (budgets.dailyBudget &&
      budgets.weeklyBudget &&
      budgets.dailyBudget > budgets.weeklyBudget) ||
    (budgets.weeklyBudget &&
      budgets.monthlyBudget &&
      budgets.weeklyBudget > budgets.monthlyBudget)
  )
    throw Error("Os orçamentos diário, semanal e mensal devem ser coerentes.");
  return result;
}
export const CAPABILITIES = Object.freeze({
  settings: "Configurações globais",
  operations: "Operações e recuperação",
  audit: "Consulta e auditoria",
  access: "Acessos e contas",
  events: "Eventos e missões",
  games: "Jogos",
  ratings: "Avaliações",
  cards: "Cartas e OVR",
  messages: "Mensagens",
  support: "Apoio",
});
export function canManage(user, capability) {
  return (
    !!user &&
    !user.disabled &&
    user.role === "admin" &&
    (!Array.isArray(user.adminCapabilities) ||
      user.adminCapabilities.includes(capability))
  );
}
export function isQuietHour(settings, date = new Date()) {
  const hour = +new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    hour: "numeric",
    hourCycle: "h23",
  }).format(date);
  const { quietStart: a, quietEnd: b } = settings;
  return a === b
    ? false
    : a < b
      ? hour >= a && hour < b
      : hour >= a || hour < b;
}
export function budgetWindow(kind, date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Lisbon",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  if (kind === "month") return day.slice(0, 7);
  if (kind === "week") {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  }
  return day;
}
export function rewardBudget(
  configured,
  prior,
  source,
  date = new Date(),
  policy = policyAt(date),
) {
  const limits = policy.rewards;
  const permanent = configured.statDuration === "permanent";
  const boosts = {};
  const accepted = prior.filter((row) => !row.revokedAt && !row.pending);
  for (const [key, amount] of Object.entries(configured.boosts || {})) {
    const used = accepted
      .filter((row) =>
        permanent
          ? row.reward?.statDuration === "permanent"
          : row.reward?.statDuration !== "permanent" &&
            +new Date(row.expiresAt?.toDate?.() || row.expiresAt) > +date,
      )
      .reduce((n, row) => n + (row.reward?.boosts?.[key] || 0), 0);
    boosts[key] = Math.max(
      0,
      Math.min(
        amount,
        (permanent ? limits.permanentAttribute : limits.temporaryAttribute) -
          used,
      ),
    );
  }
  const issuedAt = (row) => {
    for (const value of [row.deliveredAt, row.createdAt, row.startsAt]) {
      const candidate = new Date(value?.toDate?.() || value || 0);
      if (Number.isFinite(+candidate) && +candidate > 0) return candidate;
    }
    return new Date(0);
  };
  const spent = (kind, origin) =>
    accepted
      .filter(
        (row) =>
          budgetWindow(kind, issuedAt(row)) === budgetWindow(kind, date) &&
          (!origin ||
            (row.source || (row.periodKey ? "mission" : "event")) === origin),
      )
      .reduce(
        (sum, row) =>
          sum +
          Object.values(row.reward?.boosts || {}).reduce((a, b) => a + b, 0),
        0,
      );
  const available = [
    !permanent ? limits.temporaryAward : Infinity,
    limits.dailyBudget ? limits.dailyBudget - spent("day") : Infinity,
    limits.weeklyBudget ? limits.weeklyBudget - spent("week") : Infinity,
    limits.monthlyBudget ? limits.monthlyBudget - spent("month") : Infinity,
    limits[`${source}Budget`]
      ? limits[`${source}Budget`] - spent("week", source)
      : Infinity,
  ];
  let remaining = Math.max(0, Math.min(...available));
  for (const key of Object.keys(boosts)) {
    boosts[key] = Math.min(boosts[key], remaining);
    remaining -= boosts[key];
  }
  const requested = Object.values(configured.boosts || {}).reduce(
    (a, b) => a + b,
    0,
  );
  const delivered = Object.values(boosts).reduce((a, b) => a + b, 0);
  return {
    boosts,
    requested,
    delivered,
    reduced: delivered < requested,
    overflow: limits.overflow,
  };
}
