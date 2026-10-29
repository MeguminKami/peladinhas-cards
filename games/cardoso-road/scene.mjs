import { multiplier } from "./engine.mjs";
import {
  stagePosition,
  visualDestination,
  progressionPose,
  TRAVEL_MS,
} from "./progression.mjs";
import { stageVillain, villainPose, defeatPose, VILLAINS } from "./enemies.mjs";
const prizeLabels = Object.fromEntries(
  ["easy", "normal", "hard", "extreme"].map((mode) => [
    mode,
    Array.from(
      { length: 10 },
      (_, i) =>
        multiplier(mode, i + 1).toLocaleString("pt-PT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + "×",
    ),
  ]),
);
export const ZONES = [
  "Entrada do ginásio",
  "Zona dos halteres",
  "Zona de cardio",
  "Shakers & suplementos",
  "Máquinas de peito",
  "Pesos pesados",
  "Tentações alimentares",
  "Sala das fritadeiras",
  "Boss do Óleo",
  "VIP · Sofia",
];
export function cameraLayout(width, step) {
  const lane = width / 4.7,
    anchor = width * 0.23;
  return { lane, anchor, camera: step * lane, visibleStages: 4 };
}
export function backgroundLayout(width, height, imageWidth, imageHeight) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  return {
    x: (width - imageWidth * scale) / 2,
    y: (height - imageHeight * scale) / 2,
    width: imageWidth * scale,
    height: imageHeight * scale,
    scale,
  };
}
export function createScene(canvas, get) {
  const c = canvas.getContext("2d"),
    atlas = new Image(),
    poses = new Image();
  atlas.src = "assets/optimized/characters.webp";
  poses.src = "assets/optimized/cardoso-poses-realistic.webp";
  const relax = new Image();
  relax.src = "assets/optimized/cardoso-relax-v1.webp";
  const backgrounds = Object.fromEntries(
    ["easy", "normal", "hard", "extreme"].map((mode) => {
      const image = new Image();
      image.src = `assets/optimized/gym-${mode}-v2.webp`;
      return [mode, image];
    }),
  );
  const gym = backgrounds.normal;
  let w = 1000,
    h = 500,
    last = 0,
    time = 0,
    position = 0,
    camera = 0,
    eventAt = -10000,
    event = "idle",
    debug = {},
    defeatStart = null,
    motionFrom = 0,
    roundId = null,
    motionEvent = "idle",
    motionAt = -10000;
  const enemySprites = VILLAINS.map(({ sprite: path }) => {
    const sprite = new Image();
    sprite.src = path;
    return { sprite };
  });
  const glows = new Map(),
    speakerGrille = new Path2D();
  for (let y = -103; y < -10; y += 5)
    for (let x = -20; x < 23; x += 5) speakerGrille.rect(x, y, 1, 1);
  const observer = new ResizeObserver(() => {
    const b = canvas.getBoundingClientRect();
    w = b.width;
    h = b.height;
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = w * d;
    canvas.height = h * d;
    c.setTransform(d, 0, 0, d, 0, 0);
  });
  observer.observe(canvas);
  function box(x, y, bw, bh, color, r = 6) {
    c.fillStyle = color;
    c.beginPath();
    c.roundRect(x, y, bw, bh, r);
    c.fill();
  }
  function text(t, x, y, size, color = "#f0f3ff", align = "center") {
    c.fillStyle = color;
    c.font = `900 ${size}px Manrope, sans-serif`;
    c.textAlign = align;
    c.fillText(t, x, y);
  }
  function glow(x, y, r, color) {
    let surface = glows.get(color);
    if (!surface) {
      surface = document.createElement("canvas");
      surface.width = surface.height = 128;
      const ctx = surface.getContext("2d"),
        g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, color);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      glows.set(color, surface);
    }
    c.drawImage(surface, x - r, y - r, r * 2, r * 2);
  }
  function speaker(x, y, size, beat, reduced) {
    c.save();
    c.translate(x, y);
    const pulse = reduced ? 0 : beat * 0.018;
    c.scale(size * (1 + pulse), size * (1 - pulse));
    glow(0, -40, 90, "#4f47ff55");
    c.fillStyle = "#090e1dcc";
    c.beginPath();
    c.ellipse(0, 3, 39, 10, 0, 0, Math.PI * 2);
    c.fill();
    box(-31, -116, 62, 117, "#101527", 10);
    box(26, -109, 10, 105, "#080d1a", 4);
    box(-25, -109, 48, 100, "#242c40", 7);
    c.fillStyle = "#73819855";
    c.fill(speakerGrille);
    for (let i = 0; i < 2; i++) {
      const yy = -79 + i * 48;
      const color = `hsl(${(time * 0.07 + i * 120) % 360} 100% 70%)`;
      c.strokeStyle = color;
      c.lineWidth = 3.4;
      c.beginPath();
      c.ellipse(0, yy, 20 + beat, 20 + beat, 0, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "#111a2c";
      c.beginPath();
      c.arc(0, yy, 14, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#54637a";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, yy, 7, 0, Math.PI * 2);
      c.stroke();
    }
    box(-11, -15, 22, 11, "#ff6d25", 1);
    text("JBL", 0, -6, 8, "#fff");
    box(-17, -124, 34, 8, "#2d3549", 3);
    box(-30, 0, 13, 5, "#090d18", 2);
    box(18, 0, 13, 5, "#090d18", 2);
    c.restore();
  }
  // Each villain is a complete painted sprite; no procedural accessories.
  function food(x, y, type, size, age = 0, reduced = false) {
    const sprite = enemySprites[type]?.sprite;
    if (!sprite?.complete || !sprite.naturalWidth) return;
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    if (!reduced) c.rotate(Math.sin(time * 0.003 + type) * 0.045);
    const hh = 160,
      ww = (hh * sprite.naturalWidth) / sprite.naturalHeight;
    c.fillStyle = "#10133766";
    c.beginPath();
    c.ellipse(0, 5, ww * 0.3, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.drawImage(sprite, -ww / 2, -hh * 0.9, ww, hh);
    c.restore();
  }
  function character(x, y, sofia, size, pose, age, reduced) {
    if (!atlas.complete || !atlas.naturalWidth) return;
    c.save();
    c.translate(x, y);
    const sway = reduced ? 0 : Math.sin(time * 0.0025) * 0.012;
    let rotation = sway,
      sy = 1 + (!reduced ? Math.sin(time * 0.003) * 0.008 : 0),
      sx = 1;
    if (pose === "lost") {
      const lean = Math.max(
        0.06,
        Math.min(0.45, (x - size * 0.16 - 12) / size),
      );
      rotation = reduced ? -lean : -Math.min(1, age / 600) * lean;
      sy = 0.92;
    }
    if (pose === "step" && !reduced && age < 550) {
      rotation = Math.sin(age * 0.022) * 0.045;
      sx = 1 + Math.sin(age * 0.016) * 0.025;
    }
    if (pose === "paid" && !reduced) {
      rotation = Math.sin(time * 0.008) * 0.035;
      sy = 1.025;
    }
    c.rotate(rotation);
    c.scale(sx, sy);
    let sheet = atlas,
      columns = 2,
      column = sofia ? 1 : 0;
    if (!sofia) {
      if (!poses.complete || !poses.naturalWidth) {
        c.restore();
        return;
      }
      let poseIndex = 2;
      if (pose === "lost") poseIndex = 3;
      else if (pose === "paid" || pose === "won") poseIndex = 2;
      else if (pose === "step" && age < 650)
        poseIndex = reduced ? 0 : Math.floor(age / 110) % 2;
      else if (!reduced && time % 10000 > 8000) poseIndex = 2;
      if (poseIndex >= 0) {
        sheet = poses;
        columns = 4;
        column = poseIndex;
      }
    }
    const cellWidth = sheet.naturalWidth / columns,
      sh = sheet.naturalHeight;
    const inset = sheet === poses && column === 3 ? cellWidth * 0.09 : 0;
    const sw = cellWidth - inset,
      ww = (size * sw) / sh;
    // The preceding running pose extends into the flex pose at foot level.
    // Exclude only that corner, preserving the full upper-body silhouette.
    if (sheet === poses && column === 2) {
      const left = -ww / 2,
        edge = left + ww * 0.09;
      c.beginPath();
      c.rect(left + ww * 0.04, -size, ww * 0.96, size);
      c.clip();
      c.beginPath();
      c.moveTo(left, -size);
      c.lineTo(ww / 2, -size);
      c.lineTo(ww / 2, 0);
      c.lineTo(left, 0);
      c.lineTo(left, -size * 0.08);
      c.lineTo(edge, -size * 0.08);
      c.lineTo(edge, -size * 0.17);
      c.lineTo(left, -size * 0.17);
      c.closePath();
      c.clip();
    }
    c.drawImage(
      sheet,
      column * cellWidth + inset,
      0,
      sw,
      sh,
      -ww / 2,
      -size,
      ww,
      size,
    );
    c.restore();
  }
  function frame(now) {
    const { round: r, mode, reduced, music = false, beatAt = 0 } = get();
    if (!r) {
      position = 0;
      camera = 0;
      motionFrom = 0;
      motionEvent = "idle";
    }
    const dt = Math.min(40, now - last || 16);
    last = now;
    if (!document.hidden) {
      if (!reduced) time += dt;
      const target = r?.step || 0,
        lost = r?.status === "lost",
        age = now - eventAt;
      if (roundId !== (r?.id ?? null)) {
        roundId = r?.id ?? null;
        position = visualDestination(r);
        motionFrom = position;
      }
      const motionAge = now - motionAt,
        motion = progressionPose({
          round: r,
          event: motionEvent,
          age: motionAge,
          from: motionFrom,
          reduced,
        }),
        won = motion.phase === "celebration";
      const approaching = motion.phase === "travel" || motion.phase === "fight",
        shownSteps =
          approaching && ["step", "won"].includes(motionEvent)
            ? Math.max(0, target - 1)
            : target,
        focusStage = approaching ? motion.stage : target;
      const { lane, anchor } = cameraLayout(w, target);
      position = motion.position;
      const targetCamera = Math.max(0, position - (won ? 1 : 0)) * lane;
      camera = reduced
        ? targetCamera
        : camera + (targetCamera - camera) * (1 - Math.exp(-dt / 180));
      const floor = h * 0.83,
        mobile = w < 620,
        victoryBannerY = mobile ? 26 : h * 0.045,
        victoryBannerHeight = h < 300 ? 44 : 60;
      const playerHeight = Math.min(
          h * (won ? 0.58 : 0.69),
          mobile ? 310 : 440,
          won
            ? Math.max(50, floor - victoryBannerY - victoryBannerHeight - 8)
            : Infinity,
        ),
        base = anchor - camera;
      let playerX = base + position * lane;
      const bg = c.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "#23365b");
      bg.addColorStop(0.6, "#654388");
      bg.addColorStop(1, "#186d79");
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);
      const backdrop =
        backgrounds[mode]?.complete && backgrounds[mode].naturalWidth
          ? backgrounds[mode]
          : gym;
      if (backdrop.complete && backdrop.naturalWidth) {
        const fit = backgroundLayout(
          w,
          h,
          backdrop.naturalWidth,
          backdrop.naturalHeight,
        );
        c.drawImage(backdrop, fit.x, fit.y, fit.width, fit.height);
      }
      // Depth layers: individual training bays, luminous floor, foreground route markers.
      const fog = c.createLinearGradient(0, 0, 0, h);
      fog.addColorStop(0, "#17154610");
      fog.addColorStop(0.65, "#17133300");
      fog.addColorStop(1, "#0b123bd9");
      c.fillStyle = fog;
      c.fillRect(0, 0, w, h);
      const colors = [
        "#a3ff8c",
        "#5ff5ef",
        "#80b8ff",
        "#e19bff",
        "#ff8eda",
        "#ffbe6c",
        "#ff9f73",
        "#d69aff",
        "#ff6c94",
        "#ffe39b",
      ];
      for (let i = 0; i < 10; i++) {
        const x = base + stagePosition(i) * lane;
        if (x < -lane || x > w + lane) continue;
        const accent = colors[i],
          completed = shownSteps >= i + 1,
          next = focusStage === i;
        c.save();
        c.globalAlpha = 0.72;
        box(x - lane * 0.42, h * 0.16, lane * 0.84, h * 0.45, "#17234066", 12);
        box(x - lane * 0.42, h * 0.16, lane * 0.84, 3, accent, 2);
        c.restore();
        const name = ZONES[i].toUpperCase();
        box(x - lane * 0.43, h * 0.19, lane * 0.86, 25, "#18213bd9", 5);
        text(
          String(i + 1).padStart(2, "0") + " / " + name,
          x,
          h * 0.19 + 16,
          Math.max(6, Math.min(10, lane / 17)),
          accent,
        );
        if (i === 9) {
          glow(x, h * 0.45, lane * 1.1, "#ffbd8b55");
          for (let j = 0; j < 3; j++)
            box(
              x - lane * 0.4 + j * lane * 0.35,
              h * 0.27,
              lane * 0.09,
              h * 0.34,
              "#fff0b41a",
            );
          text("VIP", x, h * 0.4, Math.min(30, lane * 0.25), "#ffe6a3");
          if (!won)
            text(
              "SOFIA ESTÁ À ESPERA",
              x,
              h * 0.52,
              Math.min(9, lane * 0.07),
              "#ffe8bd",
            );
        }
        // Obstacle approach lanes stay above the payoff markers.
        if (
          !won &&
          (!lost || motion.phase === "travel") &&
          !completed &&
          !(motion.phase === "fight" && i === motion.stage)
        ) {
          const enemy = villainPose(i, {
            base,
            lane,
            height: h,
            mobile,
            time,
            reduced,
            round: r,
          });
          food(enemy.x, enemy.y, enemy.type, enemy.size, age, reduced);
        }
        const panelW = Math.min(142, lane * 0.86),
          panelY = Math.min(h * 0.86, h - 42);
        glow(
          x,
          panelY + 9,
          panelW * 0.65,
          completed ? "#a0ff7133" : next ? "#67ffe144" : "#8d64ff22",
        );
        box(
          x - panelW * 0.5,
          panelY,
          panelW,
          36,
          completed ? "#a9ef7e" : next ? "#1f626b" : "#242a4eea",
          9,
        );
        c.strokeStyle = completed ? "#d2ff99" : next ? "#7dfce8" : "#9186d170";
        c.lineWidth = next ? 2 : 1;
        c.strokeRect(x - panelW * 0.5 + 3, panelY + 3, panelW - 6, 30);
        text(
          prizeLabels[mode][i],
          x,
          panelY + 24,
          Math.max(11, Math.min(20, panelW * 0.17)),
          completed ? "#233726" : next ? "#d6fff4" : "#c9c5ec",
        );
      }
      if (base > -lane && base < w + lane) {
        const py = Math.min(h * 0.86, h - 42),
          pw = Math.min(120, lane * 0.82);
        box(base - pw / 2, py, pw, 36, "#253e43", 9);
        text(
          "PARTIDA",
          base,
          py + 23,
          Math.max(10, Math.min(14, pw * 0.15)),
          "#b8e9de",
        );
      }
      if (mode === "extreme") {
        glow(w * 0.8, h * 0.3, w * 0.65, "#ff305433");
        glow(w * 0.1, h * 0.35, w * 0.45, "#9f30ff33");
        if (!reduced) {
          c.save();
          c.globalAlpha = 0.16;
          c.strokeStyle = "#ff65d9";
          c.lineWidth = 2;
          for (let ray = 0; ray < 7; ray++) {
            const x = ((time * 0.018 + (ray * w) / 6) % (w * 1.3)) - w * 0.15;
            c.beginPath();
            c.moveTo(w / 2, h * 0.1);
            c.lineTo(x, h * 0.78);
            c.stroke();
          }
          c.restore();
        }
      } else if (mode === "hard") {
        glow(w * 0.8, h * 0.3, w * 0.65, "#ff97351a");
      }
      if (won) {
        const finishX = w * 0.46;
        playerX = reduced
          ? finishX
          : playerX + Math.min(1, age / 1400) * (finishX - playerX);
        glow(w * 0.6, h * 0.45, w * 0.6, "#ffd68055");
        character(
          w * 0.72,
          floor,
          true,
          playerHeight * 0.92,
          "idle",
          age,
          reduced,
        );
      }
      const musicalBeat =
        music && !reduced ? Math.max(0, 1 - (now - beatAt) / 190) : 0;
      const burst =
        !reduced && age < 2500 && ["paid", "won", "step"].includes(event)
          ? Math.max(0, Math.sin(age * 0.02)) * (1 - age / 2500)
          : 0;
      const beat = Math.max(musicalBeat, burst);
      const speakerScale = (playerHeight / 230) * (r ? 1 : 0.78);
      const speakerX = Math.max(
        playerHeight * 0.18,
        playerX - playerHeight * (r ? 0.24 : 0.34),
      );
      const hop =
        event === "step" && age < 550 && !reduced
          ? Math.sin((age / 550) * Math.PI) * h * 0.035
          : 0;
      c.save();
      c.translate(speakerX, floor + 8);
      c.scale(1, 0.25);
      glow(0, 0, playerHeight * 0.38, "#95b7ff33");
      c.restore();
      if (r) speaker(speakerX, floor + 5, speakerScale, beat, reduced);
      if (beat > 0.1) {
        c.strokeStyle = "#a3b8ff55";
        c.lineWidth = 2;
        for (let ring = 0; ring < 2; ring++) {
          c.beginPath();
          c.arc(
            speakerX,
            floor - playerHeight * 0.3,
            playerHeight * (0.25 + ring * 0.06 + beat * 0.06),
            -0.8,
            0.6,
          );
          c.stroke();
        }
      }
      if (!r && relax.complete && relax.naturalWidth) {
        const rw = Math.min(w * 0.5, playerHeight * 1.15),
          rh = (rw * relax.naturalHeight) / relax.naturalWidth;
        c.drawImage(
          relax,
          Math.max(6, anchor - rw * 0.45),
          floor + h * 0.05 - rh,
          rw,
          rh,
        );
      } else {
        c.fillStyle = "#0c102c77";
        c.beginPath();
        c.ellipse(playerX, floor, playerHeight * 0.15, 10, 0, 0, Math.PI * 2);
        c.fill();
        character(
          playerX,
          floor - hop,
          false,
          playerHeight,
          motion.phase === "travel"
            ? "step"
            : motion.phase === "fight"
              ? lost
                ? "lost"
                : "paid"
              : lost
                ? "lost"
                : event,
          motion.phase === "travel"
            ? Math.min(motionAge, 600)
            : Math.max(0, motionAge - TRAVEL_MS),
          reduced,
        );
      }
      if (!r) speaker(speakerX, floor + 5, speakerScale, beat, reduced);
      let attacker = null;
      if (motion.phase === "fight") {
        const origin = villainPose(motion.stage, {
          base,
          lane,
          height: h,
          mobile,
          time: defeatStart?.time ?? time,
          reduced,
          round: r,
        });
        const opponent = defeatPose(origin, {
          playerX,
          floor,
          playerHeight,
          age: motion.progress * 520,
          reduced,
        });
        c.save();
        if (!lost) c.globalAlpha = 1 - motion.progress * 0.85;
        food(
          opponent.x,
          opponent.y,
          opponent.type,
          opponent.size,
          age,
          reduced,
        );
        c.restore();
        if (lost) {
          attacker = opponent;
          glow(playerX, h * 0.5, h * 0.4, "#ff563b22");
        }
      }

      if (
        (event === "step" || event === "paid" || event === "won") &&
        age < (won ? 6500 : 2200)
      ) {
        const count = won ? (mobile ? 24 : 48) : event === "paid" ? 24 : 12;
        for (let i = 0; i < count; i++) {
          const a = i * 2.4,
            dist = ((reduced ? 40 : age / 15) * ((i % 3) + 1)) / 3;
          const xx = (won ? w * 0.5 : playerX) + Math.cos(a) * dist,
            yy =
              (won ? h * 0.3 : floor - playerHeight * 0.5) +
              Math.sin(a) * dist +
              (reduced ? 0 : age * age * 0.000018);
          c.globalAlpha = reduced
            ? 0.6
            : Math.max(0, 1 - age / (won ? 6500 : 2200));
          box(
            xx,
            yy,
            i % 2 ? 4 : 7,
            i % 2 ? 9 : 5,
            won
              ? ["#ffd566", "#ff93c9", "#aaeeff"][i % 3]
              : event === "paid"
                ? "#ffdd71"
                : "#a8ffc6",
            2,
          );
        }
        c.globalAlpha = 1;
      }
      if (event === "paid" && age < 5000) {
        const summaryW = Math.min(240, w * 0.46),
          summaryX = w - summaryW / 2 - 12,
          summaryY = Math.max(40, h * 0.12);
        box(summaryX - summaryW / 2, summaryY, summaryW, 55, "#211f42e8", 12);
        text(
          "GAINS NO BOLSO",
          summaryX,
          summaryY + 22,
          Math.min(11, summaryW / 16),
          "#ffdd7e",
        );
        text(
          (r.payment / 100).toLocaleString("pt-PT", {
            minimumFractionDigits: 2,
          }) + " CRÉDITOS",
          summaryX,
          summaryY + 43,
          Math.min(20, summaryW / 12),
          "#fff2bd",
        );
      }
      if (won) {
        const bannerY = victoryBannerY;
        box(
          w * 0.5 - Math.min(w * 0.44, 260),
          bannerY,
          Math.min(w * 0.88, 520),
          victoryBannerHeight,
          "#211d44dc",
          13,
        );
        text(
          "ZERO ÓLEO. 100% AMOR.",
          w / 2,
          bannerY + (victoryBannerHeight === 44 ? 20 : 26),
          mobile ? 16 : 27,
          "#ffedb4",
        );
        text(
          "MISSÃO CUMPRIDA · CARDOSO CHEGOU À SOFIA",
          w / 2,
          bannerY + (victoryBannerHeight === 44 ? 35 : 46),
          mobile ? 7 : 10,
          "#ffe2e0",
        );
      }
      debug = {
        background: {
          mode,
          source: backdrop.src,
          naturalWidth: backdrop.naturalWidth,
          naturalHeight: backdrop.naturalHeight,
          ...backgroundLayout(
            w,
            h,
            backdrop.naturalWidth || 1,
            backdrop.naturalHeight || 1,
          ),
        },
        resting: !r,
        phase: !r ? "resting" : motion.phase,
        destination: motion.destination,
        fightStage: motion.phase === "fight" ? motion.stage : null,
        firstPrizeX: base + lane,
        currentPrizeX: target > 0 ? base + target * lane : null,
        camera,
        position,
        playerX,
        anchor,
        lane,
        visibleStages: 4,
        sofiaVisible: won,
        playerHeight,
        attacker: attacker
          ? { ...attacker, id: VILLAINS[attacker.type].id, stage: target }
          : null,
        stageEnemies: Array.from({ length: 10 }, (_, stage) => ({
          stage,
          type: stageVillain(stage, r),
          id: VILLAINS[stageVillain(stage, r)].id,
          drawn:
            !won &&
            (!lost || motion.phase === "travel") &&
            stage >= shownSteps &&
            !(motion.phase === "fight" && stage === motion.stage) &&
            base + stagePosition(stage) * lane >= -lane &&
            base + stagePosition(stage) * lane <= w + lane,
        })),
      };
      canvas.dataset.camera = JSON.stringify(debug);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    ready: Promise.all([
      document.fonts.ready,
      ...[
        atlas,
        poses,
        relax,
        ...Object.values(backgrounds),
        ...enemySprites.map((e) => e.sprite),
      ].map((image) => image.decode().catch(() => {})),
    ]),
    event(type) {
      const now = performance.now();
      event = type;
      eventAt = now;
      motionFrom = position;
      motionEvent = type;
      motionAt = now;
      roundId = get().round?.id ?? null;
      if (type === "start") {
        position = 0;
        motionFrom = 0;
        camera = 0;
      }
      defeatStart = type === "lost" ? { time } : null;
    },
    inspect() {
      return debug;
    },
  };
}
