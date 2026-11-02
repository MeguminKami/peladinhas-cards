"""Prepara os temas completos da slot Princesa Sofia para loop continuo.

Usa a faixa inteira (2-3 min) e aplica um crossfade no fim que dobra para o
inicio, tornando a repeticao impercetivel. Remove silencios iniciais/finais e
normaliza o loudness entre os temas. Le ui/audio/music/theme-*.opus, grava por
cima e guarda o original em *.full.opus na primeira execucao.

Uso: python scripts/loop-music.py [--only nome]
"""
import os
import struct
import subprocess
import sys
import tempfile

import numpy as np

DIR = os.path.join(os.path.dirname(__file__), "..", "ui", "audio", "music")
SR = 44100
XFADE = 4.0        # crossfade fim->inicio (segundos)
SILENCE_DB = -50   # limiar para cortar silencio inicial/final
TARGET_LUFS = -18  # loudness alvo entre temas


def load(path):
    with tempfile.NamedTemporaryFile(suffix=".f32", delete=False) as tmp:
        raw = tmp.name
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path,
                    "-ac", "1", "-ar", str(SR), "-f", "f32le", raw], check=True)
    data = np.fromfile(raw, dtype=np.float32)
    os.unlink(raw)
    return data


def trim_silence(sig):
    """Remove silencio inicial e final abaixo do limiar."""
    thr = 10 ** (SILENCE_DB / 20)
    hop = 512
    n = len(sig) // hop
    env = np.sqrt((sig[: n * hop].reshape(n, hop) ** 2).mean(axis=1))
    above = np.where(env > thr)[0]
    if len(above) == 0:
        return sig
    start = max(0, above[0] * hop - int(SR * 0.1))
    end = min(len(sig), (above[-1] + 1) * hop + int(SR * 0.3))
    return sig[start:end]


def make_loop(sig):
    """Crossfade do fim para o inicio: a cauda dobra e funde-se com a abertura."""
    x = int(SR * XFADE)
    if len(sig) < x * 3:
        return sig
    head = sig[:x].copy()
    tail = sig[-x:].copy()
    fade_in = np.linspace(0, 1, x) ** 1.5
    fade_out = np.linspace(1, 0, x) ** 0.7
    # o fim funde-se com o inicio
    blended_end = tail * fade_out + head * fade_in
    out = sig[:-x].copy()
    out[-x:] = blended_end
    return out


def measure_lufs(path):
    """Loudness integrado via ffmpeg ebur128."""
    res = subprocess.run(
        ["ffmpeg", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True, text=True)
    for line in res.stderr.splitlines():
        if "I:" in line and "LUFS" in line:
            try:
                return float(line.split("I:")[1].split("LUFS")[0].strip())
            except (ValueError, IndexError):
                continue
    return None


def save_opus(sig, path):
    pcm = (np.clip(sig, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav = tmp.name
        data = pcm.tobytes()
        tmp.write(b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVEfmt " +
                  struct.pack("<IHHIIHH", 16, 1, 1, SR, SR * 2, 2, 16) +
                  b"data" + struct.pack("<I", len(data)) + data)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav,
                    "-codec:a", "libopus", "-b:a", "128k", "-ar", "48000", path], check=True)
    os.unlink(wav)


def process(path):
    name = os.path.basename(path)
    backup = path.replace(".opus", ".full.opus")
    if not os.path.exists(backup):
        os.rename(path, backup)
    sig = load(backup)
    sig = trim_silence(sig)
    sig = make_loop(sig)
    save_opus(sig, path)
    dur = len(sig) / SR
    lufs = measure_lufs(path)
    print(f"{name}: {dur:.0f}s loop continuo, {lufs} LUFS, {os.path.getsize(path)//1024} KB")


def main():
    only = None
    args = sys.argv[1:]
    if "--only" in args:
        only = args[args.index("--only") + 1]
    for f in sorted(os.listdir(DIR)):
        if not f.endswith(".opus") or f.endswith(".full.opus"):
            continue
        if only and f != only + ".opus":
            continue
        process(os.path.join(DIR, f))
    print("Concluido.")


if __name__ == "__main__":
    main()
