export function bindMatchRatingPopovers(root) {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const hover = matchMedia(
    "(hover: hover) and (pointer: fine) and (min-width: 601px)",
  );
  const entries = [...root.querySelectorAll(".match-rating-player")];
  const close = (except) =>
    entries.forEach((entry) => {
      if (entry !== except) entry.open = false;
    });
  const position = (entry) => {
    entry.classList.remove("opens-above");
    const panel = entry.querySelector(".match-rating-dimensions");
    const row = entry.getBoundingClientRect();
    if (
      row.bottom + panel.offsetHeight + 12 > innerHeight &&
      row.top > panel.offsetHeight + 12
    )
      entry.classList.add("opens-above");
  };
  const open = (entry) => {
    close(entry);
    entry.open = true;
    position(entry);
  };
  for (const entry of entries) {
    const summary = entry.querySelector("summary");
    summary.setAttribute("aria-expanded", "false");
    entry.addEventListener(
      "pointerenter",
      (event) => {
        if (hover.matches && event.pointerType !== "touch") open(entry);
      },
      options,
    );
    entry.addEventListener(
      "pointerleave",
      () => {
        if (hover.matches && !summary.matches(":focus-visible"))
          entry.open = false;
      },
      options,
    );
    summary.addEventListener(
      "click",
      (event) => {
        if (hover.matches) {
          event.preventDefault();
          open(entry);
        }
      },
      options,
    );
    entry.addEventListener(
      "focusin",
      () => {
        if (hover.matches) open(entry);
      },
      options,
    );
    entry.addEventListener(
      "focusout",
      (event) => {
        if (!entry.contains(event.relatedTarget)) entry.open = false;
      },
      options,
    );
    entry.addEventListener(
      "toggle",
      () => {
        summary.setAttribute("aria-expanded", String(entry.open));
        if (entry.open) {
          close(entry);
          position(entry);
        }
      },
      options,
    );
  }
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!event.target.closest(".match-rating-player")) close();
    },
    options,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") close();
    },
    options,
  );
  window.addEventListener("resize", () => close(), options);
  return () => {
    controller.abort();
    close();
  };
}
