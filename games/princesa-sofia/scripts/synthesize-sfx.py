"""Sintetiza os efeitos cristalinos e de interface da slot Princesa Sofia.

Sem dependencias externas alem de numpy; grava WAV temporarios e converte para MP3
com ffmpeg (obrigatorio no PATH). Nomes fixos conforme 04-sons-musicas.md.
Uso: python scripts/synthesize-sfx.py [--only nome1,nome2]
"""
import os
import subprocess
import sys
import tempfile

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "ui", "audio", "sfx")

# Frequencias (Hz) de notas
NOTE = {
    "G3": 196.00,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00, "B4": 493.88,
    "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99, "A5": 880.00, "B5": 987.77,
    "C6": 1046.50, "D6": 1174.66, "E6": 1318.51, "F6": 1396.91, "G6": 1567.98, "A6": 1760.00, "B6": 1975.53,
    "C7": 2093.00, "E7": 2637.02, "G7": 3135.96,
}


def t(dur):
    return np.linspace(0, dur, int(SR * dur), endpoint=False)


def env_ad(n, attack, decay):
    """Envelope ataque/decaimento exponencial."""
    a = max(1, int(SR * attack))
    d = max(1, n - a)
    return np.concatenate([np.linspace(0, 1, a), np.exp(-np.linspace(0, 6, d))])


def bell(freq, dur, bright=1.0, detune=0.0):
    """Sino cristalino magico: fundamental + parciais cristalinos, cauda longa."""
    x = t(dur)
    f = freq * (1 + detune)
    out = np.sin(2 * np.pi * f * x) * np.exp(-x * 2.5)
    out += 0.35 * bright * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 4.0)
    out += 0.18 * bright * np.sin(2 * np.pi * f * 5.40 * x) * np.exp(-x * 6.0)
    out += 0.08 * bright * np.sin(2 * np.pi * f * 8.93 * x) * np.exp(-x * 9.0)
    out += 0.03 * bright * np.sin(2 * np.pi * f * 13.4 * x) * np.exp(-x * 12.0)
    return out * env_ad(len(x), 0.005, dur)


def pluck(freq, dur, bright=0.8):
    """Corda dedilhada suave: menos harmonicos, ataque mais suave."""
    x = t(dur)
    out = np.sin(2 * np.pi * freq * x) * np.exp(-x * 4.0)
    out += 0.20 * bright * np.sin(2 * np.pi * freq * 2 * x) * np.exp(-x * 6.0)
    out += 0.08 * bright * np.sin(2 * np.pi * freq * 3 * x) * np.exp(-x * 9.0)
    return out * env_ad(len(x), 0.006, dur)


def pad(freq, dur, attack=0.15):
    """Acorde suave tipo cordas: duas senoides desafinadas com vibrato leve."""
    x = t(dur)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * x)
    out = np.sin(2 * np.pi * freq * vib * x) + 0.7 * np.sin(2 * np.pi * freq * 1.003 * vib * x)
    out += 0.4 * np.sin(2 * np.pi * freq * 2 * x)
    e = np.minimum(1, x / attack) * np.minimum(1, (dur - x) / (attack * 1.5))
    return out * np.clip(e, 0, 1) * 0.5


def noise(dur, low=0.0, high=1.0):
    """Ruido branco filtrado por media movel simples (low<1 suaviza)."""
    n = int(SR * dur)
    x = np.random.default_rng(7).standard_normal(n)
    if low < 1.0:
        k = max(2, int(2 + (1 - low) * 40))
        x = np.convolve(x, np.ones(k) / k, mode="same")
    if high < 1.0:
        k = max(2, int(2 + high * 30))
        sm = np.convolve(x, np.ones(k) / k, mode="same")
        x = x - sm
    return x


def shimmer(dur, base=3500, rise=1.0):
    """Poeira de fada magica: ruido cristalino com varrimento etereo."""
    x = noise(dur, low=0.1, high=0.8)
    n = len(x)
    mod = np.sin(2 * np.pi * (base * (1 + 0.2 * np.sin(2 * np.pi * 4 * t(dur)))) * t(dur))
    out = x * mod * 0.12
    e = np.linspace(0, 1, n) ** 0.4 if rise >= 1 else np.linspace(0, 1, n) ** 0.4 * np.exp(-t(dur) * 1.2)
    return out * e


def whoosh(dur, up=True, bright=0.6):
    """Whoosh de ar suave: ruido mais grave, envelope mais suave."""
    x = noise(dur, low=0.5, high=0.3)
    n = len(x)
    pos = np.linspace(0, 1, n)
    e = np.sin(np.pi * pos) ** 2.0
    sweep = np.linspace(1 if up else 1.8, 1.8 if up else 1, n)
    mod = np.sin(2 * np.pi * np.cumsum(400 * sweep) / SR)
    return x * mod * e * bright * 0.7


def place(track, sig, at):
    """Soma sig em track no instante at (segundos)."""
    i = int(SR * at)
    j = min(len(track), i + len(sig))
    if i < j:
        track[i:j] += sig[: j - i]


def render(dur):
    return np.zeros(int(SR * dur))


def normalize(sig, peak=0.89):
    m = np.max(np.abs(sig))
    return sig * (peak / m) if m > 0 else sig


def chord(freqs, dur, fn=bell, **kw):
    out = render(dur)
    for f in freqs:
        out += fn(f, dur, **kw)
    return out


# ------------------------- cues -------------------------

def cue_spin_whoosh():
    out = render(1.1)
    place(out, whoosh(1.0, up=True, bright=0.45), 0.0)
    for i, n in enumerate(["E6", "G6", "B6", "E7"]):
        place(out, bell(NOTE[n], 0.4, bright=0.7) * 0.3, 0.18 + i * 0.14)
    place(out, shimmer(0.6) * 0.3, 0.3)
    return out


def cue_symbols_land():
    out = render(0.3)
    x = t(0.1)
    thud = np.sin(2 * np.pi * 100 * x) * np.exp(-x * 30)
    place(out, thud * 0.35, 0.0)
    place(out, bell(NOTE["G4"], 0.25, bright=0.25) * 0.15, 0.02)
    return out


def cue_hit_small():
    out = render(0.7)
    place(out, bell(NOTE["E6"], 0.5, bright=0.9), 0.0)
    place(out, bell(NOTE["G6"], 0.55, bright=0.9), 0.1)
    place(out, shimmer(0.4) * 0.3, 0.05)
    return out


def cue_hit_medium():
    out = render(1.0)
    for i, n in enumerate(["C6", "E6", "G6", "C7"]):
        place(out, bell(NOTE[n], 0.6, bright=1.0), i * 0.09)
    place(out, pad(NOTE["C5"], 0.8) * 0.25, 0.12)
    place(out, shimmer(0.6) * 0.4, 0.2)
    return out


def cue_hit_large():
    out = render(1.4)
    for i, n in enumerate(["C5", "E5", "G5", "C6", "E6", "G6"]):
        place(out, pluck(NOTE[n], 0.9, bright=0.8) * 0.7, i * 0.08)
    place(out, chord([NOTE["C5"], NOTE["E5"], NOTE["G5"]], 1.1, fn=pad) * 0.35, 0.3)
    place(out, shimmer(1.0) * 0.5, 0.5)
    return out


def cue_hit_epic():
    out = render(2.0)
    for i in range(14):  # glissando de harpa magico
        f = NOTE["C5"] * 2 ** (i * 2.5 / 12)
        place(out, pluck(f, 0.7, bright=0.7) * 0.6, i * 0.04)
    place(out, chord([NOTE["C5"], NOTE["E5"], NOTE["G5"], NOTE["C6"]], 1.5, fn=pad) * 0.4, 0.55)
    for i, n in enumerate(["E6", "G6", "C7", "E7", "G7"]):
        place(out, bell(NOTE[n], 1.0, bright=1.2) * 0.5, 0.6 + i * 0.1)
    place(out, shimmer(1.5) * 0.8, 0.7)
    return out


def cue_win_count():
    # loop de 2 s: pulso suave de caixa de musica, comeca e acaba em zero
    out = render(2.0)
    for i in range(8):
        n = ["E6", "G6", "B6", "G6"][i % 4]
        place(out, bell(NOTE[n], 0.18, bright=0.5) * 0.4, i * 0.25)
    fade = int(SR * 0.05)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def cue_win_count_end():
    out = render(0.7)
    place(out, chord([NOTE["E6"], NOTE["G6"], NOTE["C7"]], 0.6, fn=bell, bright=0.8) * 0.6, 0.0)
    return out


def cue_cascade_dissolve():
    out = render(0.9)
    for i, n in enumerate(["C7", "A6", "F6", "D6", "B5"]):  # shimmer descendente magico
        place(out, bell(NOTE[n], 0.4, bright=0.8) * 0.5, i * 0.06)
    place(out, shimmer(0.7, rise=0.4) * 0.6, 0.05)
    place(out, whoosh(0.35, up=False, bright=0.3) * 0.5, 0.5)
    return out


def cue_xp_fly():
    out = render(0.6)
    place(out, whoosh(0.5, up=True, bright=0.3) * 0.6, 0.0)
    for i, n in enumerate(["G6", "B6", "E7"]):
        place(out, bell(NOTE[n], 0.25, bright=0.9) * 0.35, 0.1 + i * 0.09)
    place(out, shimmer(0.4) * 0.4, 0.05)
    return out


def cue_magic_ready():
    out = render(1.2)
    place(out, chord([NOTE["C5"], NOTE["G5"], NOTE["E6"]], 1.1, fn=pad, attack=0.35) * 0.5, 0.0)
    place(out, bell(NOTE["C7"], 1.0, bright=0.8) * 0.35, 0.35)
    place(out, shimmer(1.0) * 0.5, 0.2)
    return out


def cue_magic_cast():
    out = render(2.2)
    for i in range(12):  # glissando de harpa magico ascendente
        f = NOTE["G4"] * 2 ** (i * 2.8 / 12)
        place(out, pluck(f, 0.8, bright=0.7) * 0.55, i * 0.045)
    place(out, chord([NOTE["C5"], NOTE["E5"], NOTE["G5"], NOTE["B5"]], 1.6, fn=pad, attack=0.2) * 0.45, 0.5)
    for i, n in enumerate(["G6", "C7", "E7", "G7"]):
        place(out, bell(NOTE[n], 1.1, bright=1.1) * 0.5, 0.55 + i * 0.12)
    place(out, shimmer(1.6) * 0.9, 0.5)
    return out


def cue_wild_place():
    out = render(0.5)
    place(out, bell(NOTE["E6"], 0.45, bright=1.0) * 0.7, 0.0)
    x = t(0.06)
    place(out, np.sin(2 * np.pi * 200 * x) * np.exp(-x * 50) * 0.25, 0.0)
    place(out, shimmer(0.3) * 0.4, 0.02)
    return out


def cue_scatter_land():
    out = render(0.6)
    place(out, bell(NOTE["F6"], 0.55, bright=1.0) * 0.75, 0.0)
    place(out, bell(NOTE["F6"] * 2, 0.4, bright=0.7) * 0.3, 0.06)
    place(out, shimmer(0.35) * 0.35, 0.04)
    return out


def cue_scatter_converge():
    out = render(1.1)
    place(out, whoosh(0.8, up=True, bright=0.4) * 0.7, 0.0)
    for i, n in enumerate(["C6", "E6", "G6", "C7"]):
        place(out, bell(NOTE[n], 0.45, bright=0.9) * 0.5, 0.12 + i * 0.12)
    place(out, chord([NOTE["E6"], NOTE["G6"]], 0.5, fn=pad) * 0.3, 0.65)
    place(out, shimmer(0.7) * 0.5, 0.3)
    return out


def cue_ui_click():
    out = render(0.12)
    x = t(0.05)
    place(out, np.sin(2 * np.pi * 1800 * x) * np.exp(-x * 90) * 0.6, 0.0)
    place(out, np.sin(2 * np.pi * 900 * x) * np.exp(-x * 70) * 0.3, 0.0)
    return out


def cue_ui_spin_press():
    out = render(0.18)
    x = t(0.07)
    place(out, np.sin(2 * np.pi * 700 * x) * np.exp(-x * 60) * 0.5, 0.0)
    place(out, bell(NOTE["E6"], 0.15, bright=0.7) * 0.4, 0.02)
    return out


def cue_ui_bet_step():
    out = render(0.1)
    x = t(0.04)
    place(out, np.sin(2 * np.pi * 2400 * x) * np.exp(-x * 110) * 0.5, 0.0)
    return out


def cue_ui_dialog_open():
    out = render(0.3)
    place(out, whoosh(0.22, up=True, bright=0.3) * 0.5, 0.0)
    place(out, bell(NOTE["G6"], 0.2, bright=0.6) * 0.3, 0.12)
    return out


def cue_ui_dialog_close():
    out = render(0.25)
    place(out, whoosh(0.18, up=False, bright=0.3) * 0.5, 0.0)
    place(out, bell(NOTE["E6"], 0.15, bright=0.5) * 0.25, 0.05)
    return out


def cue_ui_hunt_on():
    out = render(0.45)
    for i, n in enumerate(["C6", "E6", "G6"]):
        place(out, bell(NOTE[n], 0.3, bright=0.8) * 0.5, i * 0.07)
    return out


def cue_ui_hunt_off():
    out = render(0.35)
    for i, n in enumerate(["G6", "E6", "C6"]):
        place(out, bell(NOTE[n], 0.25, bright=0.6) * 0.45, i * 0.07)
    return out


def cue_ui_speed():
    out = render(0.18)
    place(out, bell(NOTE["E6"], 0.12, bright=0.8) * 0.45, 0.0)
    place(out, bell(NOTE["G6"], 0.12, bright=0.8) * 0.45, 0.07)
    return out


def cue_ui_auto_start():
    out = render(0.45)
    for i, n in enumerate(["C6", "E6", "G6"]):
        place(out, pluck(NOTE[n], 0.3) * 0.55, i * 0.09)
    return out


def cue_ui_auto_stop():
    out = render(0.35)
    for i, n in enumerate(["G6", "C6"]):
        place(out, pluck(NOTE[n], 0.28) * 0.5, i * 0.1)
    return out


CUES = {
    "spin-whoosh": cue_spin_whoosh,
    "symbols-land": cue_symbols_land,
    "hit-small": cue_hit_small,
    "hit-medium": cue_hit_medium,
    "hit-large": cue_hit_large,
    "hit-epic": cue_hit_epic,
    "win-count": cue_win_count,
    "win-count-end": cue_win_count_end,
    "cascade-dissolve": cue_cascade_dissolve,
    "xp-fly": cue_xp_fly,
    "magic-ready": cue_magic_ready,
    "magic-cast": cue_magic_cast,
    "wild-place": cue_wild_place,
    "scatter-land": cue_scatter_land,
    "scatter-converge": cue_scatter_converge,
    "ui-click": cue_ui_click,
    "ui-spin-press": cue_ui_spin_press,
    "ui-bet-step": cue_ui_bet_step,
    "ui-dialog-open": cue_ui_dialog_open,
    "ui-dialog-close": cue_ui_dialog_close,
    "ui-hunt-on": cue_ui_hunt_on,
    "ui-hunt-off": cue_ui_hunt_off,
    "ui-speed": cue_ui_speed,
    "ui-auto-start": cue_ui_auto_start,
    "ui-auto-stop": cue_ui_auto_stop,
}


def save_mp3(name, sig):
    sig = normalize(sig)
    pcm = (sig * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav = tmp.name
        # WAV PCM16 manual, sem dependencias
        import struct
        data = pcm.tobytes()
        tmp.write(b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVEfmt " +
                  struct.pack("<IHHIIHH", 16, 1, 1, SR, SR * 2, 2, 16) +
                  b"data" + struct.pack("<I", len(data)) + data)
    mp3 = os.path.join(OUT, name + ".mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav,
                    "-codec:a", "libmp3lame", "-b:a", "128k", mp3], check=True)
    os.unlink(wav)
    print(f"OK  {name}.mp3  ({os.path.getsize(mp3)//1024} KB)")


def main():
    os.makedirs(OUT, exist_ok=True)
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    for name, fn in CUES.items():
        if only and name not in only:
            continue
        target = os.path.join(OUT, name + ".mp3")
        if os.path.exists(target):
            print(f"SKIP {name}.mp3 (ja existe)")
            continue
        save_mp3(name, fn())
    print("Concluido.")


if __name__ == "__main__":
    main()
