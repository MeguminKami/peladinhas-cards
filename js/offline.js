const retry = document.querySelector("#offline-retry");
retry.disabled = false;
retry.addEventListener("click", async () => {
  retry.disabled = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    // onLine can be true on a Wi-Fi network without Internet. Check the host itself.
    const response = await fetch(
      new URL(`./index.html?connection-check=${Date.now()}`, location.href),
      { cache: "no-store", signal: controller.signal },
    );
    if (!response.ok) throw Error("unavailable");
    const target = new URL("./", location.href);
    // The offline document can occupy the original app URL. A new query forces
    // a document navigation rather than a hash-only change to that document.
    target.searchParams.set("_reconnect", Date.now());
    target.hash = location.hash || "#/";
    location.replace(target);
  } catch {
    document.querySelector("#offline-status").textContent =
      "Ainda estás sem ligação. Verifica o Wi-Fi ou os dados móveis.";
    retry.disabled = false;
  } finally {
    clearTimeout(timer);
  }
});
window.addEventListener("online", () => {
  navigator.serviceWorker?.controller?.postMessage({
    type: "PUSH_FLUSH_READS",
  });
  document.querySelector("#offline-status").textContent =
    "A ligação voltou. Podes regressar à tua liga.";
  retry.textContent = "Voltar à liga";
});
