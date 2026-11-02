import { users, saveProfile, callAdmin } from "./db.js";
export let currentUser = window.__guest ? null : { uid: "pedro" };
let changed;
export function startAuth(onChange) {
  changed = onChange;
  queueMicrotask(() => onChange(currentUser));
}
let cached;
export const loadProfile = async () => {
  if (!currentUser) return null;
  cached = (await users()).find((u) => u.uid === currentUser.uid) || cached;
  return cached;
};
export async function login() {
  currentUser = { uid: "pedro" };
  await changed(currentUser);
}
export async function recoverPassword(username, code, password) {
  window.__recoveryCalls = [...(window.__recoveryCalls || []), {username, code, password}];
  return login();
}
export async function logout() {
  currentUser = null;
  await changed(null);
}
export async function register(username, password, details) {
  const uid = "new-user";
  const { favoriteClubId, ...profile } = details;
  (await users()).push({
    ...profile,
    uid,
    username,
    role: "member",
    photoURL: "",
    disabled: false,
  });
  currentUser = { uid };
  window.__clubActor = uid;
  if (favoriteClubId) await callAdmin("selectFootballClub", { clubId: favoriteClubId });
  await changed(currentUser);
  return currentUser;
}
