// One wheel gesture advances one row. Momentum events belong to the same gesture.
export function bindRowScroll(list) {
  let previousWheel = -Infinity,
    direction = 0,
    moved = false,
    accumulated = 0;
  list.addEventListener(
    "wheel",
    (event) => {
      if (
        event.ctrlKey ||
        event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        !event.deltaY ||
        list.scrollHeight <= list.clientHeight + 1
      )
        return;
      event.preventDefault();
      const now = performance.now(),
        nextDirection = Math.sign(event.deltaY);
      if (now - previousWheel > 160 || nextDirection !== direction) {
        moved = false;
        accumulated = 0;
      }
      previousWheel = now;
      direction = nextDirection;
      if (moved) return;
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? list.clientHeight
            : 1);
      accumulated += Math.abs(delta);
      if (accumulated < 24) return;
      const tile = list.querySelector(".draw-player-card");
      if (!tile) return;
      const step =
        tile.getBoundingClientRect().height +
        (parseFloat(getComputedStyle(list).rowGap) || 0);
      moved = true;
      const target = Math.max(
        0,
        Math.min(
          list.scrollHeight - list.clientHeight,
          Math.round(list.scrollTop / step) * step + direction * step,
        ),
      );
      list.scrollTo({
        top: target,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    },
    { passive: false },
  );
}
