"""Efeitos v2 da slot Princesa Sofia: magia suave, tres familias para comparar.

Familias (mesmos momentos, timbres diferentes):
  a  Caixa de musica  - celesta/caixa de musica, redonda e quente
  b  Harpa e cristal  - harpa dedilhada (Karplus-Strong) com copos de cristal
  c  Po de fada       - mais ar: brilho granular, sopros filtrados, poucas notas

Principios: fundamentais entre C4 e C6 (longe da zona agressiva 2-4 kHz), ataques
de 6-20 ms em vez de cliques, escala pentatonica, agudos cortados acima de ~9 kHz,
reverberacao propria e loudness por categoria (nao tudo ao maximo).

Uso: python scripts/synthesize-sfx-v2.py <pasta-saida> [--only cue1,cue2]
Grava <pasta-saida>/<cue>/<familia>.mp3 (requer numpy, scipy e ffmpeg).
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
RNG = np.random.default_rng(20261102)


def hz(note):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    return 440.0 * 2 ** ((names[note[:-1]] + 12 * (int(note[-1]) + 1) - 69) / 12)


PENTA = ["C", "D", "E", "G", "A"]


def penta(start_octave, count, offset=0):
    out = []
    i = offset
    while len(out) < count:
        out.append(hz(PENTA[i % 5] + str(start_octave + i // 5)))
        i += 1
    return out


def tl(dur):
    return np.arange(int(SR * dur)) / SR


def soft_env(n, attack, release_rate):
    a = max(2, int(SR * attack))
    env = np.exp(-np.arange(n) / SR * release_rate)
    env[:a] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    return env


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR / 2 - 100)], "band", fs=SR, output="sos"), x)


# ---------- instrumentos ----------

def celesta(f, dur=1.2, decay=3.2):
    x = tl(dur)
    s = np.sin(2 * np.pi * f * x) + 0.22 * np.sin(2 * np.pi * 2 * f * x) * np.exp(-x * 3) \
        + 0.05 * np.sin(2 * np.pi * 3.01 * f * x) * np.exp(-x * 6)
    return lp(s * soft_env(len(x), 0.006, decay), 7000)


def harp(f, dur=1.4, bright=0.45):
    n = int(SR * dur)
    period = max(2, int(round(SR / f)))
    buf = lp(RNG.uniform(-1, 1, period), 1500 + 4000 * bright, 1) if period > 30 else RNG.uniform(-1, 1, period)
    out = np.zeros(n)
    damp = 0.996
    for i in range(n):
        v = buf[i % period]
        out[i] = v
        buf[i % period] = damp * 0.5 * (v + buf[(i + 1) % period])
    out = lp(out, 5500) * soft_env(n, 0.004, 1.6)
    return out / (np.abs(out).max() + 1e-9)


def glass(f, dur=1.6):
    x = tl(dur)
    s = np.sin(2 * np.pi * f * x) + 0.18 * np.sin(2 * np.pi * 2.32 * f * x) * np.exp(-x * 2.5) \
        + 0.06 * np.sin(2 * np.pi * 4.25 * f * x) * np.exp(-x * 5)
    vib = 1 + 0.03 * np.sin(2 * np.pi * 5 * x)
    return lp(s * vib * soft_env(len(x), 0.018, 2.4), 6500)


def pad(freqs, dur, attack=0.25):
    x = tl(dur)
    s = sum(np.sin(2 * np.pi * f * (1 + d) * x) for f in freqs for d in (-0.002, 0.002)) / (2 * len(freqs))
    env = np.minimum(1, x / attack) * np.minimum(1, (dur - x) / (dur * 0.45))
    return lp(s * env, 3500)


def breath(dur, lo=800, hi=6000, rise=True):
    """Sopro de ar filtrado com varrimento (substitui o whoosh de ruido branco)."""
    n = int(SR * dur)
    noise = RNG.normal(0, 1, n)
    out = np.zeros(n)
    blocks = 24
    edges = np.linspace(0, n, blocks + 1).astype(int)
    for b in range(blocks):
        k = b / (blocks - 1)
        k = k if rise else 1 - k
        c = lo * (hi / lo) ** k
        seg = bp(noise, c * 0.7, c * 1.3, 2)[edges[b]:edges[b + 1]]
        out[edges[b]:edges[b + 1]] = seg
    x = np.linspace(0, 1, n)
    env = np.sin(np.pi * x) ** 1.5
    return lp(out * env, 8000) * 0.6


def dust(dur, density=28, octave=6, level=0.18, rise=0.0):
    """Po de fada: graos minusculos de sino em pentatonica, timing aleatorio, muito suave."""
    n = int(SR * dur)
    out = np.zeros((n, 2))
    count = max(1, int(density * dur))
    for _ in range(count):
        t = RNG.uniform(0, dur * 0.9)
        k = t / dur
        f = hz(PENTA[RNG.integers(0, 5)] + str(octave + (1 if RNG.random() < 0.25 + rise * k else 0)))
        g = celesta(f, 0.35, 9) * level * RNG.uniform(0.4, 1.0)
        pan = RNG.uniform(0.15, 0.85)
        place(out, g, t, pan)
    return out


# ---------- mistura ----------

def place(buf, sig, t, pan=0.5):
    i = int(SR * t)
    if sig.ndim == 1:
        sig = np.stack([sig * np.sqrt(1 - pan), sig * np.sqrt(pan)], axis=1)
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[: j - i]
    return buf


def canvas(dur):
    return np.zeros((int(SR * dur), 2))


def impulse(seconds=2.2, tone=4500):
    n = int(SR * seconds)
    ir = np.zeros((n, 2))
    x = np.arange(n) / SR
    for ch in range(2):
        noise = lp(RNG.normal(0, 1, n), tone, 1)
        ir[:, ch] = noise * np.exp(-x * 2.6) * np.minimum(1, x / 0.015)
    return ir / np.sqrt((ir ** 2).sum())


IR = impulse()


def reverb(buf, wet=0.28):
    tail = int(SR * 1.2)
    padded = np.vstack([buf, np.zeros((tail, 2))])
    w = np.stack([fftconvolve(padded[:, c], IR[:, c])[: len(padded)] for c in range(2)], axis=1)
    return padded * (1 - wet * 0.5) + w * wet * 3.0


def k_loudness(st):
    # BS.1770 simplificado: pre-filtro K e media sobre os 400 ms mais altos
    sos1 = np.array([[1.53512485958697, -2.69169618940638, 1.19839281085285, 1.0, -1.69065929318241, 0.73248077421585]])
    sos2 = np.array([[1.0, -2.0, 1.0, 1.0, -1.99004745483398, 0.99007225036621]])
    k = sosfilt(sos2, sosfilt(sos1, st, axis=0), axis=0)
    p = (k ** 2).sum(axis=1)
    w = int(0.4 * SR)
    if len(p) <= w:
        m = p.mean()
    else:
        c = np.convolve(p, np.ones(w) / w, "valid")
        m = c.max()
    return -0.691 + 10 * np.log10(m + 1e-12)


def finish(buf, lufs, wet=0.28, fade_ms=30, loop=False):
    if not loop:
        buf = reverb(buf, wet)
    buf = np.stack([lp(hp(buf[:, c], 90), 9500) for c in range(2)], axis=1)
    # cortar cauda abaixo de -60 dB
    mag = np.abs(buf).max(axis=1)
    thr = mag.max() * 10 ** (-60 / 20)
    last = np.nonzero(mag > thr)[0]
    if len(last) and not loop:
        buf = buf[: last[-1] + 1]
    gain = 10 ** ((lufs - k_loudness(buf)) / 20)
    buf = buf * gain
    peak = np.abs(buf).max()
    if peak > 0.89:  # true peak de seguranca ~ -1 dBFS
        buf *= 0.89 / peak
    f = int(SR * fade_ms / 1000)
    buf[-f:] *= np.linspace(1, 0, f)[:, None]
    if loop:
        buf[:f] *= np.linspace(0, 1, f)[:, None]
    return buf


# ---------- vozes por familia ----------

def note_fn(fam):
    return {"a": lambda f, d=1.0: celesta(f, d), "b": lambda f, d=1.2: harp(f, d), "c": lambda f, d=1.2: glass(f, d)}[fam]


def arp(fam, freqs, step, dur=1.0, level=0.5, start=0.0, buf=None, spread=True):
    fn = note_fn(fam)
    for i, f in enumerate(freqs):
        pan = 0.5 + (0.25 * np.sin(i * 1.7) if spread else 0)
        place(buf, fn(f, dur) * level, start + i * step, pan)
    return buf


# ---------- cues ----------
# Cada cue devolve (buffer, loudness alvo LUFS, reverb)

def spin_whoosh(fam):
    b = canvas(1.0)
    if fam == "c":
        place(b, breath(0.85, 500, 5000) * 0.9, 0.0)
        place(b, dust(0.9, 18, 6, 0.12, rise=0.6), 0.05)
    else:
        place(b, breath(0.8, 400, 4000) * 0.7, 0.0)
        arp(fam, penta(5, 4, 0), 0.11, 0.6, 0.18, 0.25, b)
    return b, -27, 0.25


def symbols_land(fam):
    b = canvas(0.4)
    x = tl(0.3)
    thump = np.sin(2 * np.pi * 110 * x * (1 - 0.3 * x)) * soft_env(len(x), 0.006, 22)
    place(b, lp(thump, 600) * 0.6, 0)
    place(b, note_fn(fam)(hz("G5"), 0.35) * 0.12, 0.01)
    return b, -32, 0.18


def cascade_dissolve(fam):
    b = canvas(0.9)
    if fam == "c":
        place(b, dust(0.7, 40, 6, 0.14), 0)
        place(b, breath(0.6, 3000, 700, rise=False) * 0.4, 0.1)
    else:
        arp(fam, list(reversed(penta(5, 5, 2))), 0.06, 0.5, 0.18, 0, b)
        place(b, dust(0.6, 20, 6, 0.08), 0.05)
    return b, -30, 0.35


def hit(fam, tier):
    cfg = {"small": (3, 0.09, -27, 0), "medium": (5, 0.08, -25, 1), "large": (7, 0.07, -23, 2), "epic": (11, 0.05, -21, 3)}
    count, step, lufs, size = cfg[tier]
    b = canvas(0.8 + size * 0.45)
    base = penta(5 if size < 2 else 4, count, 0 if size < 2 else 2)
    if fam == "c":
        arp("c", base[: max(2, count // 2)], step * 1.6, 1.2, 0.25, 0, b)
        place(b, dust(0.5 + size * 0.35, 18 + size * 10, 6, 0.12, rise=0.3), 0.05)
    else:
        arp(fam, base, step, 1.0, 0.3, 0, b)
    if size >= 1:
        root = hz("C4") if size < 3 else hz("G3")
        place(b, pad([root, root * 1.5, root * 2.52], 0.6 + size * 0.4, 0.06) * (0.12 + 0.03 * size), 0.05)
    if size >= 2:
        place(b, dust(0.6 + size * 0.3, 14 + size * 6, 6, 0.08), 0.25)
    return b, lufs, 0.3 + size * 0.05


def win_count(fam):
    # loop de 2 s: tique-taque de caixa de musica muito discreto, sem melodia forte
    b = canvas(2.0)
    seq = [hz(n) for n in ["E5", "G5", "A5", "G5"]]
    fn = note_fn("a" if fam != "b" else "b")
    for i in range(8):
        place(b, fn(seq[i % 4], 0.22) * 0.18, i * 0.25)
    if fam == "c":
        place(b, dust(2.0, 10, 6, 0.05), 0)
    return b, -34, 0.0


def win_count_end(fam):
    b = canvas(1.0)
    fn = note_fn(fam)
    for i, n in enumerate(["C5", "E5", "G5"]):
        place(b, fn(hz(n), 1.0) * 0.22, i * 0.015)
    if fam == "c":
        place(b, dust(0.6, 20, 6, 0.08), 0.05)
    return b, -27, 0.35


def xp_fly(fam):
    b = canvas(0.7)
    place(b, breath(0.55, 1200, 5500) * 0.45, 0)
    place(b, dust(0.6, 30 if fam == "c" else 18, 6, 0.11, rise=0.8), 0.02)
    if fam != "c":
        arp(fam, penta(5, 3, 2), 0.09, 0.4, 0.12, 0.12, b)
    return b, -31, 0.4


def magic_ready(fam):
    b = canvas(1.3)
    place(b, pad([hz("C4"), hz("G4"), hz("D5")], 1.2, 0.35) * 0.25, 0)
    if fam == "c":
        place(b, dust(1.1, 26, 6, 0.1, rise=0.7), 0.2)
    else:
        arp(fam, penta(5, 4, 1), 0.16, 0.9, 0.16, 0.35, b)
    return b, -26, 0.4


def magic_cast(fam):
    b = canvas(2.3)
    gl = penta(4, 12, 0)
    if fam == "a":
        arp("a", gl, 0.05, 1.0, 0.2, 0, b)
    elif fam == "b":
        arp("b", gl, 0.045, 1.4, 0.24, 0, b)
    else:
        place(b, breath(1.0, 400, 4500) * 0.6, 0)
        arp("c", gl[::2], 0.09, 1.4, 0.18, 0.1, b)
    place(b, pad([hz("C4"), hz("E4"), hz("G4"), hz("D5")], 1.6, 0.2) * 0.2, 0.5)
    place(b, dust(1.5, 34, 6, 0.1, rise=0.4), 0.5)
    return b, -22, 0.45


def wild_place(fam):
    # tocado varias vezes seguidas (o jogo sobe o tom de cada wild): curto, redondo e sem cauda longa
    b = canvas(0.6)
    x = tl(0.15)
    place(b, lp(np.sin(2 * np.pi * 180 * x) * soft_env(len(x), 0.004, 30), 500) * 0.25, 0)
    place(b, note_fn(fam)(hz("C5"), 0.55) * 0.35, 0.005)
    if fam == "c":
        place(b, dust(0.35, 25, 6, 0.08), 0.02)
    return b, -27, 0.3


def scatter_land(fam):
    b = canvas(0.8)
    fn = note_fn(fam)
    place(b, fn(hz("G4"), 0.9) * 0.35, 0)
    place(b, fn(hz("D5"), 0.9) * 0.22, 0.04)
    place(b, dust(0.5, 16, 6, 0.08), 0.05)
    return b, -26, 0.35


def scatter_converge(fam):
    b = canvas(1.2)
    place(b, breath(0.9, 600, 5000) * 0.55, 0)
    arp(fam, penta(5, 6, 0), 0.1, 0.6, 0.15, 0.1, b)
    place(b, pad([hz("G4"), hz("D5"), hz("A5")], 0.9, 0.2) * 0.12, 0.45)
    place(b, dust(0.9, 22, 6, 0.09, rise=0.6), 0.15)
    return b, -25, 0.45


def music_transition(fam):
    # mascara a troca de musica: sopro que sobe + chuva de po de fada, sem notas fortes
    b = canvas(2.4)
    place(b, breath(1.8, 300, 4500) * 0.6, 0)
    place(b, dust(2.0, 22, 6, 0.09, rise=0.5), 0.3)
    if fam != "c":
        arp(fam, penta(5, 5, 0), 0.16, 0.9, 0.08, 0.7, b)
    return b, -29, 0.55


def retrigger(fam):
    b = canvas(1.6)
    arp(fam, penta(5, 7, 0), 0.06, 0.8, 0.22, 0, b)
    place(b, pad([hz("C4"), hz("G4"), hz("E5")], 1.0, 0.08) * 0.15, 0.3)
    place(b, dust(1.0, 26, 6, 0.1), 0.35)
    return b, -23, 0.45


def purchase_flowers(fam):
    b = canvas(2.2)
    fn = note_fn(fam)
    for i, n in enumerate(["C5", "E5", "G5", "A5", "C6"]):
        place(b, fn(hz(n), 0.9) * 0.24, i * 0.22, 0.2 + i * 0.15)
    place(b, breath(0.8, 600, 5000) * 0.5, 1.1)
    place(b, dust(0.9, 26, 6, 0.1, rise=0.6), 1.2)
    return b, -24, 0.45


def bonus_trigger(fam):
    b = canvas(2.6)
    chords = [["C4", "E4", "G4"], ["D4", "G4", "B4"], ["E4", "A4", "C5"]]
    for i, ch in enumerate(chords):
        place(b, pad([hz(n) for n in ch], 0.9, 0.08) * 0.25, i * 0.55)
        arp(fam, [hz(n) * 2 for n in ch], 0.04, 0.8, 0.14, i * 0.55, b)
    place(b, dust(1.4, 30, 6, 0.1, rise=0.5), 1.1)
    return b, -22, 0.5


def bonus_end(fam):
    b = canvas(3.0)
    place(b, pad([hz("F3"), hz("C4"), hz("A4"), hz("E5")], 2.6, 0.15) * 0.3, 0)
    arp(fam, [hz(n) for n in ["C5", "E5", "G5", "C6"]], 0.12, 1.4, 0.18, 0.2, b)
    place(b, dust(2.0, 20, 6, 0.08), 0.6)
    return b, -23, 0.5


def ui_click(fam):
    b = canvas(0.25)
    place(b, note_fn(fam)(hz("A5"), 0.2) * 0.3, 0)
    return b, -32, 0.1


def ui_spin_press(fam):
    b = canvas(0.3)
    x = tl(0.1)
    place(b, lp(np.sin(2 * np.pi * 150 * x) * soft_env(len(x), 0.003, 40), 400) * 0.3, 0)
    place(b, note_fn(fam)(hz("E5"), 0.3) * 0.3, 0.004)
    return b, -30, 0.12


def ui_bet_step(fam):
    b = canvas(0.15)
    place(b, celesta(hz("G5"), 0.12, 30) * 0.3, 0)
    return b, -34, 0.05


def ui_dialog(fam, up=True):
    b = canvas(0.4)
    notes = ["E5", "A5"] if up else ["A5", "E5"]
    arp(fam, [hz(n) for n in notes], 0.06, 0.3, 0.2, 0, b, spread=False)
    place(b, breath(0.25, 1500, 4000, rise=up) * 0.15, 0)
    return b, -32, 0.15


def ui_two(fam, notes, step=0.08, lufs=-31):
    b = canvas(0.5)
    arp(fam, [hz(n) for n in notes], step, 0.4, 0.22, 0, b, spread=False)
    return b, lufs, 0.15


def scatter_anticipation(fam):
    # tensao a subir sem estridencia: sopro ascendente, po de fada cada vez mais denso e um pad com pulsacao lenta
    dur = 1.8
    b = canvas(dur)
    place(b, breath(1.6, 250, 3800) * 0.5, 0)
    x = tl(dur)
    pulse = 0.55 + 0.45 * np.sin(2 * np.pi * (2.2 + 2.0 * x / dur) * x) ** 2
    root = hz("A3")
    p_ = pad([root, root * 1.5, root * 2], dur, 0.5) * pulse * 0.32
    place(b, p_, 0)
    place(b, dust(1.6, 26 if fam == "c" else 16, 6, 0.08, rise=0.9), 0.15)
    if fam != "c":
        arp(fam, penta(4, 6, 3), 0.22, 0.7, 0.1, 0.25, b)
    return b, -27, 0.45


def marimba(f, dur=0.45):
    # barra de madeira: fundamental + parcial 4x (caracteristico da marimba), decaimento rapido e redondo
    x = tl(dur)
    s = np.sin(2 * np.pi * f * x) * np.exp(-x * 9) + 0.22 * np.sin(2 * np.pi * 3.93 * f * x) * np.exp(-x * 26) \
        + 0.05 * np.sin(2 * np.pi * 9.2 * f * x) * np.exp(-x * 60)
    return lp(s * soft_env(len(x), 0.003, 0.0), 5000)


def kalimba(f, dur=0.5):
    x = tl(dur)
    s = np.sin(2 * np.pi * f * x) * np.exp(-x * 7) + 0.12 * np.sin(2 * np.pi * 5.9 * f * x) * np.exp(-x * 30) \
        + 0.08 * np.sin(2 * np.pi * 2 * f * x) * np.exp(-x * 14)
    return lp(s * soft_env(len(x), 0.004, 0.0), 4500)


def felt_thump(dur=0.18, f=95):
    x = tl(dur)
    return lp(np.sin(2 * np.pi * f * x * (1 - 0.25 * x / dur)) * soft_env(len(x), 0.004, 28), 400)


def reel_land(fam):
    # Uma coluna de simbolos a pousar: baque abafado + nota de madeira (o jogo sobe a nota por coluna).
    b = canvas(0.5)
    place(b, felt_thump() * 0.45, 0)
    if fam == "a":
        place(b, marimba(hz("C5")) * 0.5, 0.004)
    elif fam == "b":
        place(b, kalimba(hz("C5")) * 0.45, 0.004)
    else:
        place(b, marimba(hz("C5")) * 0.32, 0.004)
        place(b, glass(hz("C6"), 0.4) * 0.08, 0.01)
    return b, -31, 0.12


def choir(freqs, dur, attack=0.6):
    """Coro sem palavras aproximado: varias vozes desafinadas com vibrato lento e formante suave."""
    x = tl(dur)
    out = np.zeros(len(x))
    for f in freqs:
        for d in (-0.004, 0, 0.005):
            vib = 1 + 0.006 * np.sin(2 * np.pi * (4.6 + d * 100) * x)
            phase = 2 * np.pi * f * (1 + d) * np.cumsum(vib) / SR
            out += np.sin(phase)
    env = np.minimum(1, x / attack) * np.minimum(1, (dur - x) / (dur * 0.35))
    return bp(out / (3 * len(freqs)), 180, 2600, 2) * env


def gliss(fam, start_oct, count, step, level, at, b):
    arp(fam, penta(start_oct, count, 0), step, 1.2, level, at, b)


def intro_common(fam):
    # Jardim Encantado: luminoso e alegre - arpejo a abrir, flores em sinos, acorde quente
    b = canvas(5.0)
    gliss(fam, 4, 9, 0.07, 0.2, 0.0, b)
    for i, n in enumerate(["C5", "E5", "G5", "C6", "E6"]):
        place(b, note_fn("a" if fam == "c" else fam)(hz(n), 1.6) * 0.22, 0.75 + i * 0.22, 0.25 + i * 0.12)
    place(b, pad([hz("C4"), hz("G4"), hz("E5")], 3.8, 0.4) * 0.3, 0.6)
    place(b, dust(3.2, 22, 6, 0.09, rise=0.3), 0.9)
    return b, -21, 0.5


def intro_super(fam):
    # Baile ao Luar: valsa em 3/4 - baixo no 1, acordes no 2 e 3, melodia de celesta por cima
    b = canvas(5.2)
    beat = 0.42
    bars = [("F3", ["A4", "C5", "F5"]), ("C3", ["G4", "C5", "E5"]), ("D3", ["A4", "D5", "F5"]), ("A#2", ["A#4", "D5", "F5"])]
    fn = note_fn(fam)
    for k, (bass, chord) in enumerate(bars):
        t0 = k * 3 * beat
        place(b, marimba(hz(bass) * 2, 0.9) * 0.34, t0)
        for j in (1, 2):
            for n in chord:
                place(b, fn(hz(n), 0.6) * 0.09, t0 + j * beat, 0.35 + 0.1 * j)
    melody = [("C6", 0), ("A5", 1), ("F5", 2), ("G5", 3.5), ("A5", 5), ("C6", 6), ("D6", 7.5), ("C6", 9)]
    for n, t in melody:
        place(b, celesta(hz(n), 1.2) * 0.2, t * beat, 0.6)
    place(b, pad([hz("F3"), hz("C4"), hz("A4")], 4.8, 0.8) * 0.22, 0.2)
    place(b, dust(4.0, 12, 6, 0.06), 0.8)
    return b, -21, 0.5


def intro_secret(fam):
    # Coroa da Aurora: eterea e solene - coro sem palavras a crescer, sinos de cristal lentos
    b = canvas(6.0)
    place(b, choir([hz("D3"), hz("A3"), hz("F#4"), hz("E5")], 5.6, 1.6) * 0.5, 0)
    fn = note_fn("c" if fam == "a" else fam)
    for i, n in enumerate(["A5", "D6", "E6", "F#6", "A6"]):
        place(b, fn(hz(n), 2.2) * 0.14, 0.9 + i * 0.6, 0.2 + i * 0.15)
    place(b, pad([hz("D4"), hz("A4"), hz("G#5")], 5.0, 1.2) * 0.2, 0.4)
    place(b, dust(5.0, 18, 6, 0.07, rise=0.6), 0.6)
    return b, -21, 0.6


def max_win(fam):
    # Celebracao maxima: glissando de duas oitavas, acorde amplo a crescer, cascata de sinos e po de fada
    b = canvas(6.0)
    gliss(fam, 4, 14, 0.05, 0.24, 0.0, b)
    place(b, choir([hz("C3"), hz("G3"), hz("E4"), hz("C5")], 4.8, 0.9) * 0.45, 0.6)
    place(b, pad([hz("C3"), hz("G3"), hz("E4"), hz("G4"), hz("D5")], 5.0, 0.7) * 0.32, 0.6)
    for i in range(16):
        f = penta(6, 16, 0)[15 - i]
        place(b, celesta(f, 1.0) * 0.1, 1.4 + i * 0.12, RNG.uniform(0.15, 0.85))
    place(b, dust(4.5, 40, 6, 0.1, rise=0.2), 1.0)
    return b, -19, 0.55


# ---- Conjunto "Spin" (familia d): tudo em do pentatonico, a mesma paleta da marimba das colunas ----
SPIN_SET = {}


def spin_cue(name):
    def reg(fn):
        SPIN_SET[name] = fn
        return fn
    return reg


def soft_celesta(f, dur=0.6, decay=6.0):
    return celesta(f, dur, decay)


@spin_cue("hit-small")
def d_hit_small():
    # o som mais frequente: duas notas curtas e macias, quase sem cauda
    b = canvas(0.6)
    place(b, soft_celesta(hz("G5"), 0.45, 8) * 0.30, 0, 0.42)
    place(b, soft_celesta(hz("C6"), 0.5, 7) * 0.26, 0.07, 0.58)
    place(b, dust(0.35, 10, 6, 0.05), 0.05)
    return b, -29, 0.14


@spin_cue("hit-medium")
def d_hit_medium():
    b = canvas(0.9)
    for i, n in enumerate(["G5", "C6", "E6"]):
        place(b, soft_celesta(hz(n), 0.6, 6) * 0.26, i * 0.07, 0.35 + i * 0.15)
    place(b, marimba(hz("C4"), 0.5) * 0.18, 0)
    place(b, dust(0.6, 16, 6, 0.06), 0.1)
    return b, -27, 0.2


@spin_cue("hit-large")
def d_hit_large():
    b = canvas(1.6)
    for i, n in enumerate(["C5", "E5", "G5", "C6", "E6"]):
        place(b, soft_celesta(hz(n), 0.9, 4.5) * 0.24, i * 0.065, 0.25 + i * 0.12)
    place(b, marimba(hz("C4"), 0.6) * 0.22, 0)
    place(b, pad([hz("C4"), hz("G4"), hz("E5")], 1.2, 0.08) * 0.16, 0.12)
    place(b, dust(1.0, 26, 6, 0.08, rise=0.3), 0.2)
    return b, -24, 0.3


@spin_cue("hit-epic")
def d_hit_epic():
    b = canvas(2.4)
    arp("b", penta(3, 11, 2), 0.045, 1.2, 0.22, 0, b)
    place(b, pad([hz("C3"), hz("G3"), hz("E4"), hz("D5")], 1.9, 0.12) * 0.24, 0.45)
    for i, n in enumerate(["E5", "G5", "C6", "A5", "C6"]):
        place(b, soft_celesta(hz(n), 1.0, 4) * 0.12, 0.6 + i * 0.12, 0.2 + i * 0.15)
    place(b, dust(1.8, 30, 5, 0.09, rise=0.4), 0.5)
    return b, -22, 0.4


@spin_cue("wild-place")
def d_wild_place():
    # cada WILD: um cristal redondo (o jogo sobe o tom a cada um)
    b = canvas(0.5)
    place(b, felt_thump(0.14, 120) * 0.25, 0)
    place(b, glass(hz("C5"), 0.6) * 0.3, 0.004)
    place(b, soft_celesta(hz("C6"), 0.4, 9) * 0.1, 0.01)
    return b, -28, 0.2


@spin_cue("scatter-land")
def d_scatter_land():
    # flor a pousar: sino doce com um suspiro de brilho (o jogo sobe o tom a cada flor)
    b = canvas(0.8)
    place(b, felt_thump(0.16, 100) * 0.22, 0)
    place(b, soft_celesta(hz("E5"), 0.8, 4.5) * 0.28, 0.004)
    place(b, glass(hz("B5"), 0.7) * 0.12, 0.02)
    place(b, dust(0.45, 12, 6, 0.06, rise=0.5), 0.05)
    return b, -26, 0.25


@spin_cue("xp-fly")
def d_xp_fly():
    b = canvas(0.7)
    place(b, breath(0.5, 700, 2600) * 0.3, 0)
    place(b, dust(0.55, 18, 5, 0.08, rise=0.6), 0.02)
    return b, -32, 0.25


@spin_cue("magic-ready")
def d_magic_ready():
    b = canvas(1.4)
    place(b, pad([hz("C4"), hz("G4"), hz("D5")], 1.3, 0.45) * 0.26, 0)
    place(b, dust(1.2, 26, 6, 0.08, rise=0.8), 0.15)
    place(b, soft_celesta(hz("D6"), 1.0, 3) * 0.12, 0.55)
    return b, -26, 0.35


@spin_cue("magic-cast")
def d_magic_cast():
    b = canvas(2.4)
    arp("b", penta(3, 11, 2), 0.05, 1.3, 0.22, 0, b)
    place(b, choir([hz("C4"), hz("G4"), hz("E5")], 1.6, 0.25) * 0.25, 0.45)
    place(b, pad([hz("C4"), hz("E4"), hz("G4"), hz("D5")], 1.6, 0.2) * 0.16, 0.5)
    place(b, dust(1.6, 30, 5, 0.1, rise=0.5), 0.45)
    return b, -22, 0.4


@spin_cue("scatter-converge")
def d_scatter_converge():
    b = canvas(1.3)
    place(b, breath(1.0, 500, 4800) * 0.45, 0)
    arp("a", penta(5, 6, 0), 0.1, 0.6, 0.13, 0.1, b)
    place(b, pad([hz("G4"), hz("D5"), hz("A5")], 1.0, 0.25) * 0.12, 0.45)
    place(b, dust(1.0, 26, 6, 0.08, rise=0.7), 0.1)
    return b, -25, 0.4


@spin_cue("bonus-trigger")
def d_bonus_trigger():
    return bonus_trigger("a")


@spin_cue("retrigger")
def d_retrigger():
    b = canvas(1.6)
    for i, n in enumerate(["C5", "D5", "E5", "G5", "A5", "C6"]):
        place(b, soft_celesta(hz(n), 0.8, 5) * 0.2, i * 0.055, 0.2 + i * 0.12)
    place(b, pad([hz("C4"), hz("G4"), hz("E5")], 1.0, 0.08) * 0.16, 0.25)
    place(b, dust(1.0, 30, 6, 0.09), 0.3)
    return b, -23, 0.4


@spin_cue("purchase-flowers")
def d_purchase_flowers():
    return purchase_flowers("a")


@spin_cue("bonus-end")
def d_bonus_end():
    return bonus_end("a")


@spin_cue("win-count-end")
def d_win_count_end():
    return win_count_end("a")


# ---- Conjunto "Spin" v2: sem harpa. Caixa de musica (celesta), marimba, pads e po de fada ----
def music_box_run(notes, step, level, at, b, decay=4.5, dur=0.9):
    for i, n in enumerate(notes):
        place(b, celesta(hz(n), dur, decay) * level, at + i * step, 0.3 + 0.4 * (i / max(1, len(notes) - 1)))


@spin_cue("hit-epic")
def d_hit_epic():
    b = canvas(2.4)
    music_box_run(["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6"], 0.045, 0.2, 0, b)
    place(b, marimba(hz("C4"), 0.7) * 0.3, 0)
    for n in ["C5", "E5", "G5", "C6"]:
        place(b, celesta(hz(n), 1.6, 2.6) * 0.13, 0.42)
    place(b, pad([hz("C3"), hz("G3"), hz("E4"), hz("D5")], 1.8, 0.1) * 0.22, 0.4)
    place(b, dust(1.6, 26, 5, 0.08, rise=0.3), 0.45)
    return b, -22, 0.35


@spin_cue("magic-cast")
def d_magic_cast():
    # o feitico: corrida de caixa de musica a subir, e um acorde quente que floresce
    b = canvas(2.4)
    place(b, marimba(hz("C4"), 0.8) * 0.3, 0)
    music_box_run(["C5", "E5", "G5", "A5", "C6", "E6", "G6"], 0.07, 0.17, 0.05, b, decay=5)
    for n in ["C5", "G5", "E6"]:
        place(b, celesta(hz(n), 1.8, 2.2) * 0.12, 0.6)
    place(b, pad([hz("C4"), hz("G4"), hz("E5"), hz("D5")], 1.7, 0.25) * 0.22, 0.45)
    place(b, dust(1.5, 30, 5, 0.09, rise=0.6), 0.5)
    return b, -23, 0.35


@spin_cue("scatter-converge")
def d_scatter_converge():
    # a "musiquinha" das flores a juntarem-se: uma frase de caixa de musica em do maior
    b = canvas(2.2)
    melody = [("G5", 0.00), ("C6", 0.13), ("E6", 0.26), ("G6", 0.39), ("E6", 0.60), ("G6", 0.73), ("A6", 0.86), ("G6", 1.06), ("C6", 1.26)]
    for n, t in melody:
        place(b, celesta(hz(n), 0.9, 4.2) * 0.2, t, 0.45)
    for n, t in [("C4", 0.0), ("G3", 0.52), ("A3", 0.86), ("C4", 1.26)]:
        place(b, marimba(hz(n) * 2, 0.7) * 0.22, t, 0.5)
    for n in ["C5", "E5", "G5"]:
        place(b, celesta(hz(n), 1.2, 2.5) * 0.09, 1.26)
    place(b, dust(1.8, 22, 5, 0.07, rise=0.4), 0.0)
    return b, -24, 0.3


@spin_cue("bonus-trigger")
def d_bonus_trigger():
    # depois da musiquinha: so um acorde quente a abrir, para a introducao entrar por cima sem choque
    b = canvas(2.0)
    place(b, pad([hz("C4"), hz("G4"), hz("E5"), hz("D5")], 1.8, 0.35) * 0.3, 0)
    place(b, dust(1.6, 22, 5, 0.07, rise=0.8), 0.1)
    return b, -25, 0.4


@spin_cue("scatter-anticipation")
def d_scatter_anticipation():
    # tensao sem harpa: pad a pulsar devagar e po de fada a subir
    dur = 1.8
    b = canvas(dur)
    x = tl(dur)
    pulse = 0.55 + 0.45 * np.sin(2 * np.pi * (2.2 + 2.0 * x / dur) * x) ** 2
    root = hz("A3")
    place(b, pad([root, root * 1.5, root * 2], dur, 0.5) * pulse * 0.32, 0)
    place(b, breath(1.6, 250, 2600) * 0.35, 0)
    place(b, dust(1.6, 16, 5, 0.07, rise=0.9), 0.15)
    return b, -28, 0.4


CUES = {
    "intro-common": intro_common,
    "intro-super": intro_super,
    "intro-secret": intro_secret,
    "max-win": max_win,
    "reel-land": reel_land,
    "scatter-anticipation": scatter_anticipation,
    "spin-whoosh": spin_whoosh,
    "symbols-land": symbols_land,
    "cascade-dissolve": cascade_dissolve,
    "hit-small": lambda f: hit(f, "small"),
    "hit-medium": lambda f: hit(f, "medium"),
    "hit-large": lambda f: hit(f, "large"),
    "hit-epic": lambda f: hit(f, "epic"),
    "win-count": win_count,
    "win-count-end": win_count_end,
    "xp-fly": xp_fly,
    "magic-ready": magic_ready,
    "magic-cast": magic_cast,
    "wild-place": wild_place,
    "scatter-land": scatter_land,
    "scatter-converge": scatter_converge,
    "music-transition": music_transition,
    "retrigger": retrigger,
    "purchase-flowers": purchase_flowers,
    "bonus-trigger": bonus_trigger,
    "bonus-end": bonus_end,
    "ui-click": ui_click,
    "ui-spin-press": ui_spin_press,
    "ui-bet-step": ui_bet_step,
    "ui-dialog-open": lambda f: ui_dialog(f, True),
    "ui-dialog-close": lambda f: ui_dialog(f, False),
    "ui-hunt-on": lambda f: ui_two(f, ["C5", "G5", "C6"], 0.07, -30),
    "ui-hunt-off": lambda f: ui_two(f, ["G5", "C5"], 0.08, -32),
    "ui-speed": lambda f: ui_two(f, ["A5", "A5"], 0.06, -33),
    "ui-auto-start": lambda f: ui_two(f, ["C5", "E5", "G5"], 0.07, -31),
    "ui-auto-stop": lambda f: ui_two(f, ["G5", "D5"], 0.08, -32),
}


def write_mp3(buf, path):
    with tempfile.NamedTemporaryFile(suffix=".f32", delete=False) as t:
        t.write(buf.astype(np.float32).tobytes())
        raw = t.name
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", raw,
                    "-c:a", "libmp3lame", "-b:a", "160k", path], check=True)
    os.unlink(raw)


def main():
    out = sys.argv[1]
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    for name, fn in CUES.items():
        if only and name not in only:
            continue
        families = "abc" + ("d" if name in SPIN_SET else "")
        for fam in families:
            buf, lufs, wet = SPIN_SET[name]() if fam == "d" else fn(fam)
            loop = name == "win-count"
            buf = finish(buf, lufs, wet, loop=loop)
            write_mp3(buf, os.path.join(out, name, f"synth-{fam}.mp3"))
        print("ok", name)


if __name__ == "__main__":
    main()
