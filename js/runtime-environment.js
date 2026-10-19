export function firebaseMode(hostname, configuredMode) {
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
  if (configuredMode === "fixtures") return "fixtures";
  if (configuredMode === "emulator") return "emulator";
  if (local && configuredMode !== "production")
    throw Error("Firebase bloqueado em localhost. Usa npm.cmd run dev para fixtures ou npm.cmd run dev:emulator para integração local.");
  return "production";
}
