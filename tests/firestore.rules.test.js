import { readFileSync } from "node:fs";
import { DEFAULT_POLICY } from "../js/system-policy.js";
import { test, before, after, beforeEach } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
let env;
test("password recovery approvals remain private and server-only", async () => {
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "passwordRecoveries/joao"), {status:"authorized", codeHash:"private"});
  });
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext("joao"), env.authenticatedContext("boss")]) {
    const ref = doc(context.firestore(), "passwordRecoveries/joao");
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, {status:"authorized",codeHash:"forged"}));
  }
});
test("personal paths and attempts are private and progression is server-only", async () => {
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "pathStates/joao"), { uid: "joao", nodes: {}, active: null });
    await setDoc(doc(c.firestore(), "pathStates/joao/attempts/test"), { status: "success" });
    await setDoc(doc(c.firestore(), "pathStates/joao/audit/test"), { action: "accept" });
  });
  await assertSucceeds(getDoc(doc(signed("joao"), "pathStates/joao")));
  await assertFails(getDoc(doc(signed("pedro"), "pathStates/joao")));
  await assertSucceeds(getDoc(doc(signed("boss"), "pathStates/joao")));
  await assertSucceeds(getDoc(doc(signed("joao"), "pathStates/joao/attempts/test")));
  await assertFails(getDoc(doc(signed("joao"), "pathStates/joao/audit/test")));
  await assertFails(setDoc(doc(signed("joao"), "pathStates/joao"), { nodes: { forged: { progress: 100 } } }));
  await assertFails(setDoc(doc(signed("boss"), "pathStates/joao/attempts/forged"), { status: "success" }));
});
test("system policies are server-only; read-only and rating switches protect direct writes", async () => {
  const config=structuredClone(DEFAULT_POLICY);
  config.features.mode="readOnly";
  await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),"settings/system"),{revision:1,timeline:[{version:1,effectiveMillis:0,effectiveAt:"1970-01-01",config}]}));
  await assertFails(updateDoc(doc(signed("boss"),"settings/system"),{revision:99}));
  await assertSucceeds(getDoc(doc(signed("joao"),"settings/system")));
  await assertFails(updateDoc(doc(signed("boss"),"games/open"),{title:"Bloqueado",updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(signed("joao"),"initialRatings/joao"),{uid:"joao",ratings20:{pace:10},completed:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  config.features.mode="normal";config.features.ratings=false;
  await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),"settings/system"),{revision:2,timeline:[{version:2,effectiveMillis:0,effectiveAt:"1970-01-01",config}]}));
  await assertFails(updateDoc(doc(signed("boss"),"games/open"),{title:"Disponível",updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(signed("joao"),"initialRatings/joao"),{uid:"joao",ratings20:{pace:10},completed:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
});
test("restricted admins cannot write capabilities directly or read private drafts",async()=> {
  await env.withSecurityRulesDisabled(async c=>{
    await updateDoc(doc(c.firestore(),"users/boss"),{adminCapabilities:["audit"]});
    await setDoc(doc(c.firestore(),"systemDrafts/boss"),{private:true});
  });
  await assertFails(updateDoc(doc(signed("boss"),"users/boss"),{adminCapabilities:null,updatedAt:serverTimestamp()}));
  await assertFails(getDoc(doc(signed("boss"),"systemDrafts/boss")));
  await assertFails(getDoc(doc(signed("joao"),"systemDrafts/boss")));
});
test("revoked sessions cannot read profile or mutate data even before ID-token expiry",async()=> {
  await env.withSecurityRulesDisabled(async c=>updateDoc(doc(c.firestore(),"users/joao"),{tokensValidAfter:Math.floor(Date.now()/1000)+3600}));
  await assertFails(getDoc(doc(signed("joao"),"users/joao")));
  await assertFails(getDocs(collection(signed("joao"),"games")));
  await assertFails(updateDoc(doc(signed("boss"),"users/joao"),{tokensValidAfter:0,updatedAt:serverTimestamp()}));
});
test("push subscriptions and receipt capabilities are inaccessible to all frontend roles", async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "pushDevices/private-device"), {
      uid: "pedro",
      subscription: { endpoint: "private" },
    });
    await setDoc(doc(c.firestore(), "pushDeliveries/private-receipt"), {
      uid: "pedro",
      token: "private",
    });
  });
  for (const uid of ["pedro", "joao", "boss"])
    for (const collectionName of ["pushDevices", "pushDeliveries"]) {
      const db = signed(uid);
      await assertFails(
        getDoc(
          doc(
            db,
            collectionName,
            collectionName === "pushDevices"
              ? "private-device"
              : "private-receipt",
          ),
        ),
      );
      await assertFails(getDocs(collection(db, collectionName)));
      await assertFails(
        setDoc(doc(db, collectionName, "forged"), { uid, token: "forged" }),
      );
    }
});
before(async () => {
  const [host, port] = (
    process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085"
  ).split(":");
  env = await initializeTestEnvironment({
    projectId: "demo-peladinhas-rules",
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
after(async () => env?.cleanup());
const user = (uid, role = "member") => ({
  uid,
  username: uid,
  displayName: uid,
  country: "Portugal",
  countryCode: "PT",
  photoURL: "",
  role,
  disabled: false,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
});
const game = (status = "closed") => ({
  title: "Teste",
  location: "",
  notes: "",
  scheduledAt: Timestamp.now(),
  creatorId: "pedro",
  teamA: { starters: ["pedro"], bench: [] },
  teamB: { starters: ["joao"], bench: [] },
  score: { teamA: 8, teamB: 6 },
  status,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  closedAt: status === "closed" ? Timestamp.now() : null,
  closedBy: status === "closed" ? "pedro" : null,
});
const signed = (uid) =>
  env
    .authenticatedContext(uid, { email: `${uid}@auth.weeklyfc.app` })
    .firestore();
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    for (const uid of ["pedro", "joao", "outsider", "boss"])
      await setDoc(
        doc(c.firestore(), `users/${uid}`),
        user(uid, uid === "boss" ? "admin" : "member"),
      );
    await setDoc(doc(c.firestore(), "games/closed"), game());
    await setDoc(doc(c.firestore(), "games/open"), game("open"));
  });
});

test("coleções e escolhas são públicas na liga e só o servidor pode atribuir ou selecionar", async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "cardCollections/pedro"), {
      uid: "pedro",
      awards: [],
    });
    await setDoc(doc(c.firestore(), "cardSelections/pedro"), {
      uid: "pedro",
      selectedCardId: "base",
    });
  });
  for (const path of ["cardCollections/pedro", "cardSelections/pedro"]) {
    await assertSucceeds(getDoc(doc(signed("joao"), path)));
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), path)),
    );
    for (const uid of ["pedro", "joao", "boss"])
      await assertFails(
        setDoc(doc(signed(uid), path), {
          uid: "pedro",
          awards: [{ id: "toty" }],
        }),
      );
  }
});

test("posições no jogo são escritas apenas pelas Functions", async () => {
  const value = {
    ...game("draft"),
    creatorId: "boss",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    positions: { pedro: "GR", joao: "AV" },
  };
  await assertFails(
    setDoc(doc(signed("boss"), "games/positions-valid"), value),
  );
  await assertFails(
    setDoc(doc(signed("boss"), "games/positions-other"), {
      ...value,
      positions: { outsider: "GR" },
    }),
  );
  await assertFails(
    setDoc(doc(signed("boss"), "games/positions-invalid"), {
      ...value,
      positions: { pedro: "SCRIPT" },
    }),
  );
});
test("tickets: leitura só do proprietário/admin e sem escrita directa", async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "tickets/support"), {
      title: "Ajuda",
      ownerId: "pedro",
      status: "closed",
    });
    await setDoc(doc(c.firestore(), "tickets/support/messages/one"), {
      authorId: "boss",
      body: "Resposta",
    });
  });
  for (const uid of ["pedro", "boss"]) {
    await assertSucceeds(getDoc(doc(signed(uid), "tickets/support")));
    await assertSucceeds(
      getDocs(collection(signed(uid), "tickets/support/messages")),
    );
    await assertFails(
      updateDoc(doc(signed(uid), "tickets/support"), { status: "open" }),
    );
    await assertFails(
      setDoc(doc(signed(uid), "tickets/support/messages/new"), {
        body: "Hack",
      }),
    );
  }
  await assertFails(getDoc(doc(signed("outsider"), "tickets/support")));
  await assertFails(
    getDocs(collection(signed("outsider"), "tickets/support/messages")),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(signed("pedro"), "tickets"),
        where("ownerId", "==", "pedro"),
      ),
    ),
  );
  await assertFails(getDocs(collection(signed("pedro"), "tickets")));
});
test("membro não promove role nem edita outro perfil", async () => {
  await assertFails(
    updateDoc(doc(signed("pedro"), "users/pedro"), {
      role: "admin",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "users/joao"), {
      displayName: "Hack",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(signed("pedro"), "users/pedro"), {
      displayName: "Pedro",
      heightCm: 178,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "users/pedro"), {
      heightCm: 999,
      updatedAt: serverTimestamp(),
    }),
  );
});
test("roles são alteradas apenas por Functions, incluindo para administradores", async () => {
  await assertFails(
    updateDoc(doc(signed("boss"), "users/joao"), {
      role: "admin",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("boss"), "users/boss"), {
      role: "member",
      updatedAt: serverTimestamp(),
    }),
  );
});
const vote = (raterId = "pedro", targetId = "joao", submitted = true) => ({
  gameId: "closed",
  raterId,
  targetId,
  ratings: {
    overall: 4,
    attack: 4,
    passing: 4,
    defense: 4,
    physical: 4,
    attitude: 4,
    goalkeeping: null,
  },
  submitted,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  submittedAt: submitted ? serverTimestamp() : null,
});
test("feedback do jogo não pode ser submetido diretamente pelo navegador", async () => {
  await assertFails(
    setDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), vote()),
  );
  await assertFails(
    setDoc(
      doc(signed("outsider"), "games/closed/feedback/outsider_joao"),
      vote("outsider"),
    ),
  );
  await assertFails(
    setDoc(
      doc(signed("pedro"), "games/closed/feedback/pedro_pedro"),
      vote("pedro", "pedro"),
    ),
  );
  await assertFails(
    setDoc(doc(signed("pedro"), "games/closed/feedback/duplicado"), vote()),
  );
});
test("rascunhos e submissões de feedback exigem a função e o histórico atómico", async () => {
  const v = vote("pedro", "joao", false);
  v.ratings = { overall: 4 };
  await assertFails(
    setDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), v),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), {
      ratings: vote().ratings,
      submitted: true,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), {
      ratings: vote().ratings,
      updatedAt: serverTimestamp(),
    }),
  );
});
test("raw privados: query filtrada funciona, outra identidade não", async () => {
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), "games/closed/feedback/pedro_joao"), vote()));
  await assertSucceeds(
    getDocs(
      query(
        collection(signed("pedro"), "games/closed/feedback"),
        where("raterId", "==", "pedro"),
      ),
    ),
  );
  await assertFails(
    getDoc(doc(signed("joao"), "games/closed/feedback/pedro_joao")),
  );
  await assertSucceeds(
    getDocs(collection(signed("boss"), "games/closed/feedback")),
  );
});
test("jogos abertos e fechados rejeitam todas as alterações diretas", async () => {
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/closed"), {
      title: "Outra",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("boss"), "games/closed"), {
      title: "Correcção",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/open"), {
      teamB: { starters: ["pedro"], bench: [] },
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/open"), {
      score: { teamA: -1, teamB: 0 },
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/open"), {
      creatorId: "joao",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/open"), {
      status: "closed",
      closedAt: serverTimestamp(),
      closedBy: "pedro",
      updatedAt: serverTimestamp(),
    }),
  );
});
test("initial 0–20; agregados e snapshots não são manipuláveis", async () => {
  await assertSucceeds(
    setDoc(doc(signed("pedro"), "initialRatings/pedro"), {
      uid: "pedro",
      ratings20: { pace: 0 },
      completed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "initialRatings/pedro"), {
      ratings20: { pace: 21 },
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(signed("pedro"), "communitySummaries/pedro"), {
      count: 3,
      ratings20: { pace: 20 },
    }),
  );
  await assertFails(
    setDoc(doc(signed("pedro"), "users/pedro/cardHistory/2026-W41"), {
      ovr: 99,
    }),
  );
});
test("novo jogador: leitura de rascunho ausente e submissão única", async () => {
  await assertSucceeds(
    getDoc(doc(signed("pedro"), "communityRatings/pedro_joao")),
  );
  const r = {
    raterId: "pedro",
    targetId: "joao",
    ratings20: { pace: 14 },
    submitted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    submittedAt: null,
  };
  await assertSucceeds(
    setDoc(doc(signed("pedro"), "communityRatings/pedro_joao"), r),
  );
  await assertFails(getDoc(doc(signed("joao"), "communityRatings/pedro_joao")));
  await assertFails(
    setDoc(doc(signed("pedro"), "communityRatings/pedro_pedro"), {
      ...r,
      targetId: "pedro",
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "communityRatings/pedro_joao"), {
      submitted: true,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test("comunidade: editar voto próprio completo sem voltar a rascunho", async () => {
  const ref = doc(signed("pedro"), "communityRatings/pedro_joao");
  const ratings20 = Object.fromEntries(
    [
      "pace",
      "shooting",
      "passing",
      "dribbling",
      "defending",
      "physical",
      "goalkeeping",
      "stamina",
      "vision",
      "positioning",
      "teamwork",
      "composure",
    ].map((key) => [key, 15]),
  );
  await assertSucceeds(
    setDoc(ref, {
      raterId: "pedro",
      targetId: "joao",
      ratings20,
      submitted: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      submittedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(ref, {
      ratings20: { ...ratings20, pace: 18 },
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(ref, { submitted: false, updatedAt: serverTimestamp() }),
  );
  await assertFails(
    updateDoc(ref, { ratings20: { pace: 18 }, updatedAt: serverTimestamp() }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "communityRatings/pedro_joao"), {
      ratings20,
      updatedAt: serverTimestamp(),
    }),
  );
});

test("pesos OVR: leitura de membros ativos e escrita exclusiva do backend", async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "settings/ovr"), {
      weights: { pace: 100 },
    });
    await updateDoc(doc(c.firestore(), "users/outsider"), { disabled: true });
  });
  await assertSucceeds(getDoc(doc(signed("pedro"), "settings/ovr")));
  await assertSucceeds(getDoc(doc(signed("boss"), "settings/ovr")));
  await assertFails(getDoc(doc(signed("outsider"), "settings/ovr")));
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "settings/ovr")),
  );
  for (const uid of ["pedro", "boss"])
    await assertFails(
      setDoc(doc(signed(uid), "settings/ovr"), {
        weights: { passing: 100 },
      }),
    );
});

test("equilíbrio de jogos: membros leem, ninguém altera a referência pelo browser", async () => {
  await env.withSecurityRulesDisabled(async (c) =>
    setDoc(doc(c.firestore(), "gameBalances/test"), { boostA: 3, boostB: -3 }),
  );
  await assertSucceeds(getDoc(doc(signed("pedro"), "gameBalances/test")));
  for (const uid of ["pedro", "boss"])
    await assertFails(
      setDoc(doc(signed(uid), "gameBalances/test"), { boostA: 99 }),
    );
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "gameBalances/test")),
  );
});

test("DBS usa Functions e não pode editar jogos diretamente", async () => {
  await assertFails(
    updateDoc(doc(signed("joao"), "users/joao"), {
      role: "dbs",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("boss"), "users/joao"), {
      role: "dbs",
      updatedAt: serverTimestamp(),
    }),
  );
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), "users/joao"), {role:"dbs"});
  });
  await assertFails(
    updateDoc(doc(signed("joao"), "games/open"), {
      title: "Editado pelo DBS",
      notes: "Equipas revistas",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "games/open"), {
      creatorId: "joao",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "games/closed"), {
      title: "Não permitido",
      updatedAt: serverTimestamp(),
    }),
  );
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "games/draft"), game("draft"));
  });
  await assertFails(
    updateDoc(doc(signed("joao"), "games/draft"), {
      title: "Não permitido",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "users/outsider"), {
      role: "dbs",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "users/joao"), {
      role: "admin",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "games/open"), {
      status: "closed",
      closedAt: serverTimestamp(),
      closedBy: "joao",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "games/open"), {
      notes: "Não pode editar após encerrar",
      updatedAt: serverTimestamp(),
    }),
  );
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "games/open"), game("open"));
  });
  await assertFails(
    updateDoc(doc(signed("boss"), "users/joao"), {
      role: "member",
      updatedAt: serverTimestamp(),
    }),
  );
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), "users/joao"), {role:"member"});
  });
  await assertFails(
    updateDoc(doc(signed("joao"), "games/open"), {
      title: "DBS removido",
      updatedAt: serverTimestamp(),
    }),
  );
});

test("golos e assistências exigem validação autoritativa na função", async () => {
  const ref = doc(signed("boss"), "games/open");
  const valid = {
    teamA: { goals: ["pedro", "pedro"], assists: ["pedro"] },
    teamB: { goals: [], assists: [] },
  };
  await assertFails(
    updateDoc(ref, { performance: valid, updatedAt: serverTimestamp() }),
  );
  for (const performance of [
    { ...valid, teamA: { goals: ["outsider"], assists: [] } },
    { ...valid, teamA: { goals: Array(1000).fill("pedro"), assists: [] } },
    { ...valid, teamA: { goals: [], assists: Array(1000).fill("joao") } },
    { ...valid, teamA: { goals: [42], assists: [] } },
    { ...valid, teamA: { goals: [], assists: [], unknown: 1 } },
  ])
    await assertFails(
      updateDoc(ref, { performance, updatedAt: serverTimestamp() }),
    );
  await assertFails(
    updateDoc(doc(signed("outsider"), "games/closed"), {
      performance: valid,
      updatedAt: serverTimestamp(),
    }),
  );
});
test("avaliações com atitude também exigem submissão pela função", async () => {
  const ref = doc(signed("pedro"), "games/closed/feedback/pedro_joao");
  const missing = vote();
  delete missing.ratings.attitude;
  await assertFails(setDoc(ref, missing));
  for (const attitude of [-1, 6, 2.5]) {
    const value = vote();
    value.ratings.attitude = attitude;
    await assertFails(setDoc(ref, value));
  }
  const value = vote();
  value.ratings.attitude = 0;
  await assertFails(setDoc(ref, value));
});

test("cartas semanais: leitura da liga, bloqueio e conteúdo só escritos pelo servidor", async () => {
  await env.withSecurityRulesDisabled(async (c) =>
    setDoc(doc(c.firestore(), "weeklyCards/joao"), {
      uid: "joao",
      locked: true,
      ovr: 80,
    }),
  );
  await assertSucceeds(getDoc(doc(signed("pedro"), "weeklyCards/joao")));
  for (const uid of ["pedro", "boss"])
    await assertFails(
      updateDoc(doc(signed(uid), "weeklyCards/joao"), {
        locked: false,
        ovr: 99,
      }),
    );
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "weeklyCards/joao")),
  );
});

test("fotografias semanais: leitura da liga e escrita apenas por função", async () => {
  const path = "weeklyCardPhotos/joao_2026-W41";
  await env.withSecurityRulesDisabled(async (c) =>
    setDoc(doc(c.firestore(), path), {
      uid: "joao",
      weekId: "2026-W41",
      photoURL: "https://example.com/card.webp",
      design: { photoScale: 140 },
    }),
  );
  await assertSucceeds(getDoc(doc(signed("pedro"), path)));
  for (const uid of ["pedro", "boss"]) {
    await assertFails(
      updateDoc(doc(signed(uid), path), {
        photoURL: "https://example.com/changed.webp",
      }),
    );
    await assertFails(
      setDoc(doc(signed(uid), "weeklyCardPhotos/joao_2026-W42"), {
        uid: "joao",
        weekId: "2026-W42",
        design: {},
      }),
    );
  }
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), path)),
  );
});

test("eventos: rascunhos privados, votos privados e recompensas apenas por função", async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "events/draft"), { status: "draft" });
    await setDoc(doc(c.firestore(), "events/open"), {
      status: "open",
      rewardPrivacy: 1,
    });
    await setDoc(doc(c.firestore(), "events/legacy"), {
      status: "open",
      questions: [{ id: "q1", reward: { boosts: { vision: 15 } } }],
    });
    await setDoc(doc(c.firestore(), "events/open/private/rewards"), {
      questions: { q1: { boosts: { vision: 15 }, specialId: "mvp" } },
    });
    await setDoc(doc(c.firestore(), "events/open/votes/pedro"), {
      answers: { q1: "joao" },
    });
    await setDoc(doc(c.firestore(), "eventRewards/reward"), { uid: "pedro" });
    await setDoc(doc(c.firestore(), "ovrPresets/preset"), { name: "teste" });
  });
  await assertFails(getDoc(doc(signed("pedro"), "events/draft")));
  await assertSucceeds(getDoc(doc(signed("boss"), "events/draft")));
  await assertSucceeds(
    getDocs(
      query(
        collection(signed("pedro"), "events"),
        where("status", "==", "open"),
        where("rewardPrivacy", "==", 1),
      ),
    ),
  );
  await assertSucceeds(getDoc(doc(signed("pedro"), "events/open/votes/pedro")));
  await assertFails(
    getDoc(doc(signed("pedro"), "events/open/private/rewards")),
  );
  await assertSucceeds(
    getDoc(doc(signed("boss"), "events/open/private/rewards")),
  );
  await assertFails(getDoc(doc(signed("pedro"), "events/legacy")));
  await assertSucceeds(getDoc(doc(signed("boss"), "events/legacy")));
  await assertFails(
    setDoc(doc(signed("boss"), "events/open/private/rewards"), {
      questions: {},
    }),
  );
  await assertFails(getDoc(doc(signed("joao"), "events/open/votes/pedro")));
  await assertSucceeds(getDoc(doc(signed("pedro"), "eventRewards/reward")));
  await assertFails(getDoc(doc(signed("pedro"), "ovrPresets/preset")));
  for (const uid of ["pedro", "boss"]) {
    await assertFails(
      setDoc(doc(signed(uid), "events/evil"), { status: "open" }),
    );
    await assertFails(
      setDoc(doc(signed(uid), "eventRewards/evil"), { uid: "pedro" }),
    );
    await assertFails(
      setDoc(doc(signed(uid), "events/open/votes/pedro"), {
        answers: { q1: "pedro" },
      }),
    );
  }
});

test("ciclo de jogos não admite transições diretas nem por DBS", async () => {
  await assertFails(
    updateDoc(doc(signed("boss"), "users/joao"), {
      role: "dbs",
      updatedAt: serverTimestamp(),
    }),
  );
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), "users/joao"), {role:"dbs"});
  });
  const draft = {
    ...game("draft"),
    creatorId: "joao",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await assertFails(setDoc(doc(signed("joao"), "games/cycle"), draft));
  await assertFails(
    setDoc(doc(signed("pedro"), "games/member-draft"), {
      ...draft,
      creatorId: "pedro",
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "games/cycle"), {
      status: "closed",
      closedBy: "joao",
      closedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "games/cycle"), {
      status: "open",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "games/cycle"), {
      status: "draft",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "games/cycle"), {
      status: "open",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("joao"), "games/cycle"), {
      status: "closed",
      closedBy: "joao",
      closedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  for (const uid of ["joao", "boss"])
    await assertFails(
      updateDoc(doc(signed(uid), "games/cycle"), {
        status: "open",
        updatedAt: serverTimestamp(),
      }),
    );
});

test("jogos a eliminar bloqueiam novos votos", async () => {
  await env.withSecurityRulesDisabled(async (c) =>
    updateDoc(doc(c.firestore(), "games/closed"), { deleting: true }),
  );
  await assertFails(
    setDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), vote()),
  );
});

test("eventos modernos: auditoria e identidade dos outros votantes só para ADMIN", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    await setDoc(doc(store, "events/managed-private"), {
      schemaVersion: 2,
      status: "open",
      rewardPrivacy: 1,
    });
    await setDoc(doc(store, "events/managed-private/votes/joao"), {
      selections: ["pedro"],
      submittedAt: Timestamp.now(),
    });
    await setDoc(doc(store, "events/managed-private/audit/entry"), {
      actorId: "joao",
      action: "vote-submitted",
    });
    await setDoc(doc(store, "events/managed-private/private/rewards"), {
      positions: [{ points: 5 }],
    });
  });
  await assertSucceeds(getDoc(doc(signed("pedro"), "events/managed-private")));
  for (const path of [
    "events/managed-private/votes/joao",
    "events/managed-private/audit/entry",
    "events/managed-private/private/rewards",
  ]) {
    await assertFails(getDoc(doc(signed("pedro"), path)));
    await assertSucceeds(getDoc(doc(signed("boss"), path)));
    await assertFails(setDoc(doc(signed("boss"), path), { forged: true }));
  }
  await assertFails(
    setDoc(doc(signed("joao"), "eventRewards/forged-managed"), {
      uid: "joao",
      reward: { points: 999 },
    }),
  );
});

test("locked missions cannot be read directly by a member", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "events/locked-mission"), {
      schemaVersion: 2,
      kind: "mission",
      status: "open",
      rewardPrivacy: 1,
      indefinite: true,
      endsAt: null,
      prerequisites: { mode: "all", missionIds: ["previous"] },
    });
  });
  await assertFails(getDoc(doc(signed("pedro"), "events/locked-mission")));
  await assertSucceeds(getDoc(doc(signed("boss"), "events/locked-mission")));
});

test("admin corrige jogo fechado apenas pela função", async () => {
  const ref = doc(signed("boss"), "games/closed");
  await assertFails(
    updateDoc(ref, {
      score: { teamA: 3, teamB: 1 },
      performance: {
        teamA: { goals: ["pedro"], assists: ["pedro"] },
        teamB: { goals: [], assists: [] },
      },
      location: "Local corrigido",
      updatedAt: serverTimestamp(),
    }),
  );
  for (const correction of [
    { status: "open" },
    { closedAt: serverTimestamp() },
    { closedBy: "boss" },
    { creatorId: "boss" },
    { teamA: { starters: ["pedro", "pedro"], bench: [] } },
  ]) {
    await assertFails(
      updateDoc(ref, { ...correction, updatedAt: serverTimestamp() }),
    );
  }
});

test("avaliações: edição dentro de 7 dias, sem reiniciar o prazo", async () => {
  const all = Object.fromEntries(
    [
      "pace",
      "shooting",
      "passing",
      "dribbling",
      "defending",
      "physical",
      "goalkeeping",
      "stamina",
      "vision",
      "positioning",
      "teamwork",
      "composure",
    ].map((key) => [key, 12]),
  );
  for (const days of [6, 8]) {
    const submittedAt = Timestamp.fromMillis(Date.now() - days * 86400000);
    const createdAt = Timestamp.fromMillis(Date.now() - 30 * 86400000);
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "initialRatings/pedro"), {
        uid: "pedro",
        ratings20: all,
        completed: true,
        submittedAt,
        createdAt,
        updatedAt: Timestamp.now(),
      });
      await setDoc(doc(context.firestore(), "communityRatings/pedro_joao"), {
        raterId: "pedro",
        targetId: "joao",
        ratings20: all,
        submitted: true,
        submittedAt,
        createdAt,
        updatedAt: Timestamp.now(),
      });
      await setDoc(
        doc(context.firestore(), "games/closed/feedback/pedro_joao"),
        { ...vote(), createdAt, submittedAt, updatedAt: Timestamp.now() },
      );
    });
    for (const [path, change] of [
      ["initialRatings/pedro", { ratings20: { ...all, pace: 13 } }],
      ["communityRatings/pedro_joao", { ratings20: { ...all, pace: 13 } }],
      ["games/closed/feedback/pedro_joao", { ratings: vote().ratings }],
    ]) {
      const ref = doc(signed("pedro"), path);
      await (days < 7 && !path.startsWith("games/") ? assertSucceeds : assertFails)(
        updateDoc(ref, { ...change, updatedAt: serverTimestamp() }),
      );
      await assertFails(
        updateDoc(ref, {
          ...change,
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(ref, {
          ...(path.startsWith("initial")
            ? { completed: false }
            : { submitted: false }),
          updatedAt: serverTimestamp(),
        }),
      );
    }
  }
});

test("autoavaliações antigas usam a criação como prazo quando não há submittedAt", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "initialRatings/pedro"), {
      uid: "pedro",
      ratings20: { pace: 12 },
      completed: true,
      createdAt: Timestamp.fromMillis(Date.now() - 8 * 86400000),
      updatedAt: Timestamp.now(),
    });
  });
  await assertFails(
    updateDoc(doc(signed("pedro"), "initialRatings/pedro"), {
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test("rascunho completo não inicia o prazo da autoavaliação antes da submissão", async () => {
  const ratings20 = Object.fromEntries(
    [
      "pace",
      "shooting",
      "passing",
      "dribbling",
      "defending",
      "physical",
      "goalkeeping",
      "stamina",
      "vision",
      "positioning",
      "teamwork",
      "composure",
    ].map((key) => [key, 12]),
  );
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "initialRatings/pedro"), {
      uid: "pedro",
      ratings20,
      completed: false,
      submittedAt: null,
      createdAt: Timestamp.fromMillis(Date.now() - 30 * 86400000),
      updatedAt: Timestamp.now(),
    });
  });
  await assertSucceeds(
    updateDoc(doc(signed("pedro"), "initialRatings/pedro"), {
      completed: true,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(signed("pedro"), "initialRatings/pedro"), {
      ratings20: { ...ratings20, pace: 13 },
      updatedAt: serverTimestamp(),
    }),
  );
});

test("match names and historical cards can only be written by the server", async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await updateDoc(doc(c.firestore(), "games/open"), {
      teamNames: { teamA: "Casa" },
      playerCards: { pedro: { ovr: 81 } },
      cardWeekId: "2026-W40",
    });
  });
  const ref = doc(signed("boss"), "games/open");
  await assertFails(
    updateDoc(ref, { title: "Novo titulo", updatedAt: serverTimestamp() }),
  );
  for (const change of [
    { teamNames: { teamA: "Outra" } },
    { playerCards: { pedro: { ovr: 99 } } },
    { cardWeekId: "2026-W41" },
  ]) {
    await assertFails(
      updateDoc(ref, { ...change, updatedAt: serverTimestamp() }),
    );
  }
});

test("self and peer goalkeeper feedback both require the revision-writing function", async () => {
  await assertFails(
    setDoc(
      doc(signed("joao"), "games/closed/feedback/joao_joao"),
      vote("joao", "joao"),
    ),
  );
  const peer = vote("pedro", "joao");
  peer.ratings.goalkeeping = 5;
  await assertFails(
    setDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), peer),
  );
  peer.ratings.goalkeeping = null;
  await assertFails(
    setDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), peer),
  );
});

test("game singleton and immutable vote revisions are inaccessible to browser roles",async()=>{
  await env.withSecurityRulesDisabled(async c=>{
    await updateDoc(doc(c.firestore(),"users/joao"),{role:"dbs"});
    await setDoc(doc(c.firestore(),"gameFlow/open"),{gameId:"open"});
    await setDoc(doc(c.firestore(),"games/closed/pathVoteRevisions/private"),{vote:{raterId:"pedro",targetId:"joao",ratings:{attack:4}}});
  });
  for(const uid of ["joao","pedro","boss"]){
    for(const path of ["gameFlow/open","games/closed/pathVoteRevisions/private"]){
      await assertFails(getDoc(doc(signed(uid),path)));
      await assertFails(setDoc(doc(signed(uid),path),{forged:true}));
    }
    await assertFails(setDoc(doc(signed(uid),`games/forged-${uid}`),game("draft")));
  }
});
