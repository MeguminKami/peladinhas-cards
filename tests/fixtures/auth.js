import { users, saveProfile } from "./db.js";
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
export async function logout() {
  currentUser = null;
  await changed(null);
}
export async function register(username, password, details) {
  const uid = "new-user";
  (await users()).push({
    ...details,
    uid,
    username,
    role: "member",
    photoURL: "",
    disabled: false,
  });
  currentUser = { uid };
  await changed(currentUser);
  return currentUser;
}
