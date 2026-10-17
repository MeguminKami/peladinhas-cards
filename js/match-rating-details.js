export function bindMatchRatingDetails(root) {
  const onKeyDown = (event) => {
    if (event.key !== "Escape") return;
    const entry = event.target.closest(".postmatch-player[open]");
    if (!entry) return;
    entry.open = false;
    entry.querySelector("summary").focus();
  };
  root.addEventListener("keydown", onKeyDown);
  return () => root.removeEventListener("keydown", onKeyDown);
}
