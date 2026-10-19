import { auth, db } from "./firebase.js";
import { detachPushForLogout } from "./push.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { normalizeUsername, technicalEmail } from "./utils.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";
export let currentUser = null;
let registration = null;
export function startAuth(onChange, onError) {
  return onAuthStateChanged(
    auth,
    async (user) => {
      try {
        if (registration) await registration;
        currentUser = auth.currentUser;
        await onChange(currentUser);
      } catch (e) {
        onError(e);
      }
    },
    onError,
  );
}
export async function register(username, password, details) {
  const u = normalizeUsername(username);
  let release;
  registration = new Promise((r) => (release = r));
  let created;
  try {
    const c = await createUserWithEmailAndPassword(
      auth,
      technicalEmail(u),
      password,
    );
    created = c.user;
    await setDoc(doc(db, "users", c.user.uid), {
      ...details,
      uid: c.user.uid,
      username: u,
      role: "member",
      disabled: false,
      photoURL: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return c.user;
  } catch (error) {
    if (created) {
      try {
        await deleteUser(created);
      } catch (rollbackError) {
        console.error(
          "Registo incompleto: não foi possível remover a conta recém-criada",
          rollbackError,
        );
      }
    }
    throw error;
  } finally {
    release();
    registration = null;
  }
}
export const login = (username, password) =>
  signInWithEmailAndPassword(
    auth,
    technicalEmail(normalizeUsername(username)),
    password,
  );
export async function recoverPassword(username, code, password) {
  const normalized = normalizeUsername(username);
  await httpsCallable(getFunctions(undefined, "europe-west1"), "completePasswordRecovery")({
    username:normalized, code:code.trim(), password,
  });
  try { return await login(normalized, password); }
  catch { throw Error("Password atualizada. Volta ao login e entra com a nova password."); }
}
export const logout = async () => {
  await detachPushForLogout();
  return signOut(auth);
};
export async function loadProfile() {
  if (!currentUser) return null;
  const s = await getDoc(doc(db, "users", currentUser.uid));
  return s.exists() ? { ...s.data(), uid: s.id } : null;
}
