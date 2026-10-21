import { assembleLeague } from "./league-model.js";
import * as Firebase from "./firebase.js";
import { setPolicyDocument, policyAt } from "./system-policy.js";
import { cardWeek } from "./card-week.js";
import * as DB from "./db.js";

export async function loadLeague() {
  const systemDocument = await DB.read("settings/system");
  setPolicyDocument(systemDocument);
  await Firebase.configureAppCheck?.(policyAt());

  const cycle = cardWeek();
  const usersTask = DB.users();
  const previousTask = usersTask.then((users) =>
    DB.previousCards(users, cycle),
  );
  const [
    users,
    initials,
    community,
    games,
    summaries,
    settings,
    balances,
    weeklyCards,
    weeklyPhotos,
    events,
    eventRewards,
    collections,
    selections,
    previousCards,
  ] = await Promise.all([
    usersTask,
    DB.initials(),
    DB.communitySummaries(),
    DB.games(),
    DB.gameSummaries(),
    DB.read("settings/ovr"),
    DB.list("gameBalances"),
    DB.list("weeklyCards"),
    DB.weeklyCardPhotos(cardWeek().weekId),
    DB.openEvents(),
    DB.list("eventRewards"),
    DB.list("cardCollections"),
    DB.list("cardSelections"),
    previousTask,
  ]);
  return assembleLeague({users, initials, community, games, summaries, settings, balances, weeklyCards, weeklyPhotos, events, eventRewards, collections, selections, previousCards, cycle});
}
