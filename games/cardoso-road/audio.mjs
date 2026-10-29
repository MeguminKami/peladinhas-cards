import { createVoicePlayer, voiceForEvent, STEP_CLIPS } from "./voices.mjs";
// Music has its own volume. All game feedback shares one replaceable channel.
export function createAudio(getSettings, now = () => performance.now()) {
  let track = new Audio();
  track.loop = true;
  track.preload = "none";
  const tracks = new Map([["easy_medium_hard", track]]);
  let ctx,
    trackName = "",
    unlocked = false,
    destroyed = false,
    timer = null,
    beatAt = 0;
  let generation = 0,
    clip = null,
    cue = null,
    voicePending = false,
    lossIndex = 0,
    lastStepAt = -Infinity;
  const recordings = new Map();
  const volume = () => Math.max(0, Math.min(1, getSettings().volume));
  function context() {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  }
  function mix() {
    track.volume = Math.max(0, Math.min(1, getSettings().musicVolume ?? 0.3));
  }
  const voices = createVoicePlayer({
    context,
    getSettings,
    isHidden: () => destroyed || document.hidden,
    onState: (detail) => {
      voicePending = false;
      mix();
      document.dispatchEvent(new CustomEvent("cardoso:voice", { detail }));
    },
  });
  function stopFeedback() {
    generation++;
    voicePending = false;
    voices.stop();
    if (clip) {
      const old = clip;
      clip = null;
      old.onended = null;
      old.onerror = null;
      old.pause();
      old.currentTime = 0;
    }
    if (cue) {
      const old = cue;
      cue = null;
      old.source.onended = null;
      try {
        old.source.stop();
      } catch {}
      old.source.disconnect();
      old.gain.disconnect();
    }
    mix();
  }
  function start() {
    if (destroyed) return;
    const settings = getSettings(),
      name = settings.mode === "extreme" ? "extreme" : "easy_medium_hard";
    if (trackName !== name) {
      track.pause();
      let next = tracks.get(name);
      if (!next) {
        next = new Audio();
        next.loop = true;
        next.preload = "auto";
        tracks.set(name, next);
      }
      track = next;
      if (!track.src) {
        track.src = `assets/audio/${name}.mp3`;
        track.load();
      }
      trackName = name;
      clearInterval(timer);
      timer = null;
    }
    mix();
    if (unlocked && settings.music && track.volume > 0 && !document.hidden) {
      if (track.paused) void track.play().catch(() => {});
      if (!timer)
        timer = setInterval(
          () => {
            beatAt = performance.now();
          },
          settings.mode === "extreme" ? 95 : 125,
        );
    } else {
      track.pause();
      clearInterval(timer);
      timer = null;
    }
  }
  function recordingFor(name) {
    let current = recordings.get(name);
    if (!current) {
      current = new Audio("assets/audio/" + name + ".ogg");
      current.preload = "auto";
      recordings.set(name, current);
    }
    return current;
  }
  function recording(name, request) {
    const current = recordingFor(name);
    clip = current;
    current.currentTime = 0;
    current.volume = volume();
    mix();
    const done = () => {
      if (request !== generation || clip !== current) return;
      clip = null;
      mix();
    };
    current.onended = done;
    current.onerror = done;
    void current.play().catch(done);
  }
  function stepCue() {
    const a = context(),
      source = a.createOscillator(),
      gain = a.createGain(),
      t = a.currentTime;
    source.type = "triangle";
    source.frequency.setValueAtTime(440, t);
    source.frequency.exponentialRampToValueAtTime(880, t + 0.15);
    gain.gain.setValueAtTime(Math.max(0.001, volume() * 0.3), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    source.connect(gain).connect(a.destination);
    const current = { source, gain };
    cue = current;
    mix();
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (cue === current) {
        cue = null;
        mix();
      }
    };
    source.start();
    source.stop(t + 0.2);
  }
  function event(kind, step) {
    const at = now(),
      rapidStep = kind === "step" && at - lastStepAt < 1200;
    lastStepAt = kind === "step" ? at : -Infinity;
    stopFeedback();
    if (destroyed || document.hidden || volume() <= 0 || rapidStep) return;
    const settings = getSettings();
    if (kind === "step") {
      const choices = [
        ...(settings.voices ? STEP_CLIPS.map((voice) => ({ voice })) : []),
        ...(settings.effects
          ? ["unlearnthematrix", "maluco"].map((recording) => ({ recording }))
          : []),
      ];
      const choice = choices.length
        ? choices[Math.floor(Math.random() * choices.length)]
        : null;
      if (choice?.recording) {
        recording(choice.recording, generation);
        return;
      }
      if (choice?.voice) {
        voicePending = true;
        voices.voice(choice.voice);
        mix();
        return;
      }
    }
    // Supplied recordings replace legacy voices and synthesized fanfares.
    const name =
      kind === "start"
        ? "starrt_1"
        : kind === "lost"
          ? `perdeu_${1 + (lossIndex++ % 2)}`
          : ["won", "paid"].includes(kind)
            ? "win_1"
            : null;
    if (name && settings.effects) {
      recording(name, generation);
      return;
    }
    if (settings.voices) {
      voicePending = true;
      voices.voice(voiceForEvent(kind, step));
      mix();
    } else if (kind === "step" && settings.effects) {
      try {
        void context()
          .resume()
          .catch(() => {});
        stepCue();
      } catch {}
    }
  }
  function configure() {
    const settings = getSettings();
    if (
      volume() <= 0 ||
      document.hidden ||
      (!settings.effects && clip) ||
      (!settings.effects && cue) ||
      (!settings.voices && (voicePending || voices.playing))
    )
      stopFeedback();
    else {
      voices.configure();
      if (clip) clip.volume = volume();
      if (cue) cue.gain.gain.value = volume() * 0.3;
    }
    start();
  }
  function visibility() {
    if (document.hidden) stopFeedback();
    start();
  }
  function pageHide() {
    stopFeedback();
    track.pause();
    clearInterval(timer);
    timer = null;
  }
  function pageShow(e) {
    if (e.persisted) configure();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    pageHide();
    for (const media of recordings.values()) {
      media.removeAttribute("src");
      media.load();
    }
    recordings.clear();
    for (const media of tracks.values()) {
      media.pause();
      media.removeAttribute("src");
      media.load();
    }
    tracks.clear();
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", pageHide);
    window.removeEventListener("pageshow", pageShow);
    if (ctx) void ctx.close().catch(() => {});
  }
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", pageHide);
  window.addEventListener("pageshow", pageShow);
  return {
    prepare() {
      return Promise.resolve().then(() => {
        if (destroyed) return;
        const settings = getSettings();
        if (settings.voices) {
          try {
            context();
          } catch {}
        }
        if (settings.effects)
          for (const name of [
            "starrt_1",
            "win_1",
            "perdeu_1",
            "perdeu_2",
            "unlearnthematrix",
            "maluco",
          ])
            recordingFor(name);
        if (settings.music) {
          track.preload = "auto";
          start();
        }
      });
    },
    configure,
    stop: stopFeedback,
    event,
    unlock() {
      if (destroyed) return;
      unlocked = true;
      start();
    },
    destroy,
    get beatAt() {
      return beatAt;
    },
  };
}
