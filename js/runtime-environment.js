export function firebaseMode(hostname, configuredMode) {
  const host = hostname.toLowerCase();
  const local = !host || ["localhost", "[::1]", "::1", "0.0.0.0"].includes(host) ||
    host.endsWith(".localhost") || host.endsWith(".local") ||
    /^(127|10)\./.test(host) || /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host) ||
    /^\[?(fc|fd|fe[89ab])[0-9a-f]*:/i.test(host);
  if (configuredMode === "fixtures") return "fixtures";
  if (configuredMode === "emulator") return "emulator";
  if (local && configuredMode !== "production")
    throw Error("Firebase bloqueado em localhost. Usa npm.cmd run dev para fixtures ou npm.cmd run dev:emulator para integração local.");
  return "production";
}
