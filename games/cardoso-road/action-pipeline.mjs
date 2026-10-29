// One financial command at a time. Cashout may replace confirmed presentation.
export function createActionPipeline({
  onPhase = () => {},
  paint = () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 0)),
    ),
} = {}) {
  let current = null,
    phase = "idle";
  const enter = (job, next) => {
    if (current !== job) return;
    phase = next;
    onPhase(next, job.kind);
  };
  async function run(kind, stages) {
    if (current) {
      if (kind !== "cashout" || phase !== "animate") return false;
      current.controller.abort();
    }
    const job = { kind, controller: new AbortController() };
    current = job;
    const signal = job.controller.signal;
    try {
      enter(job, "feedback");
      await paint();
      if (signal.aborted) return false;
      enter(job, "confirm");
      const result = await stages.confirm();
      enter(job, "present");
      stages.present(result);
      await paint();
      if (signal.aborted) return false;
      enter(job, "animate");
      await stages.animate(result, signal);
      if (signal.aborted) return false;
      enter(job, "sound");
      stages.sound(result);
      return true;
    } catch (error) {
      if (signal.aborted) return false;
      throw error;
    } finally {
      if (current === job) {
        current = null;
        phase = "idle";
        onPhase("idle", null);
      }
    }
  }
  return {
    run,
    get active() {
      return current !== null;
    },
    get phase() {
      return phase;
    },
  };
}
export function waitForPresentation(ms, signal) {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, Math.max(0, ms));
    signal.addEventListener("abort", finish, { once: true });
  });
}
