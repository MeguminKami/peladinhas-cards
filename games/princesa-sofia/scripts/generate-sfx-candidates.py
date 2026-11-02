"""Gera candidatos de efeitos com a ElevenLabs para a pagina de teste de som.

Le ELEVENLABS_API_KEY do ficheiro .env desta pasta (ou do ambiente). Para cada som grava
audio-lab/candidates/<som>/eleven-1.mp3, eleven-2.mp3, ... ja com o volume final
(loudness por categoria, igual aos efeitos v2), prontos para ouvir em /audio-lab.html.

Uso (PowerShell, nesta pasta):
  python scripts/generate-sfx-candidates.py                 # todos, 3 variantes cada
  python scripts/generate-sfx-candidates.py --only hit-small,magic-cast --n 4
  python scripts/generate-sfx-candidates.py --dry-run       # so mostra o que faria
So usa a biblioteca padrao do Python e o ffmpeg (no PATH).
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "audio-lab", "candidates")
API = "https://api.elevenlabs.io/v1/sound-generation"

# Estilo comum: magia suave, nada estridente. Repetido em todos os pedidos.
STYLE = ("soft, gentle and warm fairytale magic, delicate fairy dust sparkle, rounded and pleasant to the ear, "
         "mellow highs, no harsh or piercing high frequencies, no metallic clang, no casino coins, no voice, clean, dry studio")

# som -> (descricao, duracao em segundos, loudness alvo LUFS)
CUES = {
    "spin-whoosh": ("a soft airy magical swoosh rising gently, light shimmer of tiny celesta notes", 1.0, -27),
    "symbols-land": ("a very soft padded wooden tap with a tiny glassy bell tail, subtle", 0.5, -32),
    "cascade-dissolve": ("magical crystals gently dissolving into fairy dust, soft descending shimmer", 0.9, -30),
    "hit-small": ("a tiny happy sparkle, two or three soft celesta notes rising, short", 0.6, -27),
    "hit-medium": ("a sweet magical arpeggio on harp and celesta with a soft sparkle tail", 1.0, -25),
    "hit-large": ("a joyful magical flourish, harp glissando and warm strings with fairy dust sparkles", 1.5, -23),
    "hit-epic": ("a big but soft magical celebration, harp glissando, warm orchestral chord, cascading gentle chimes and fairy dust", 2.2, -21),
    "win-count": ("a gentle seamless music box ticking pulse for counting coins up, calm, no melody, loopable", 2.0, -34),
    "win-count-end": ("a soft resolving music box chord with a tiny shimmer, final and satisfying", 0.8, -27),
    "xp-fly": ("tiny sparkles flying through the air, a soft airy whoosh with twinkling fairy dust", 0.7, -31),
    "magic-ready": ("a magic wand charging up, soft suspended shimmer swelling, anticipation", 1.2, -26),
    "magic-cast": ("a fairy casting a gentle spell, soft harp glissando upward, warm bloom of fairy dust, brief airy choir pad", 2.0, -22),
    "wild-place": ("a single soft crystal chime landing with a gentle magical pop, short and round", 0.5, -27),
    "scatter-land": ("a magical flower blooming, soft bell with a gentle sparkle, slightly special", 0.7, -26),
    "scatter-converge": ("magic flowers gathering together, rising airy whoosh with ascending soft chimes, ending suspended", 1.1, -25),
    "music-transition": ("a dreamy soft fairy dust swell, airy rising breath with gentle sparkles, transition between two songs", 2.2, -29),
    "bonus-trigger": ("a magical bonus fanfare transition, harp glissando, warm strings and soft glockenspiel, three ascending chords resolving brightly, no drums", 2.5, -22),
    "intro-common": ("welcoming enchanted garden stinger, cheerful flute, harp arpeggios, flowers blooming in soft bells, bright major key, instrumental", 4.5, -23),
    "intro-super": ("elegant moonlit ballroom waltz stinger, graceful strings and celesta, romantic clarinet, 3/4 feel, instrumental", 4.5, -23),
    "intro-secret": ("ethereal aurora borealis reveal stinger, soft wordless choir, crystalline bells, ambient pads swelling gently, majestic and rare, instrumental", 5.5, -23),
    "retrigger": ("short joyful magical flourish for extra free spins, quick ascending celesta notes, warm string chord, soft sparkles", 1.5, -23),
    "purchase-flowers": ("five magical flowers appearing one by one with soft bell notes, then a shimmering gathering whoosh", 2.0, -24),
    "bonus-end": ("warm gentle closing fanfare, strings and harp resolving to a soft major chord, shimmering bell tail", 3.0, -23),
    "max-win": ("the biggest magical celebration, full warm orchestra and wordless choir, cascading gentle chimes and fairy dust, majestic sustained finale", 5.0, -20),
    "ui-click": ("a tiny soft wooden and glass click, very short and subtle", 0.5, -32),
    "ui-spin-press": ("a soft rounded button press with a tiny magical glint, short", 0.5, -30),
    "ui-bet-step": ("a tiny soft music box tick, very short", 0.5, -34),
    "ui-dialog-open": ("a short soft airy whoosh opening with a gentle rising glint", 0.5, -32),
    "ui-dialog-close": ("a short soft airy whoosh closing with a gentle falling glint", 0.5, -32),
    "ui-hunt-on": ("a short soft magical rising three-note chime, special mode on", 0.6, -30),
    "ui-hunt-off": ("a short soft falling two-note chime, neutral", 0.5, -32),
    "ui-speed": ("a soft double crystal tick, quick", 0.5, -33),
    "ui-auto-start": ("a short soft ascending three-note celesta arpeggio", 0.6, -31),
    "ui-auto-stop": ("two soft descending celesta notes", 0.5, -32),
}


def load_key():
    key = os.environ.get("ELEVENLABS_API_KEY")
    env = os.path.join(ROOT, ".env")
    if not key and os.path.exists(env):
        for line in open(env, encoding="utf-8"):
            m = re.match(r"\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$", line)
            if m:
                key = m.group(1).strip().strip('"').strip("'")
    if not key:
        sys.exit("Falta ELEVENLABS_API_KEY no .env desta pasta.")
    return key


def request(key, text, duration, loop=False):
    body = {"text": text, "duration_seconds": max(0.5, duration), "prompt_influence": 0.55}
    if loop:
        body["loop"] = True
    req = urllib.request.Request(API, data=json.dumps(body).encode(), method="POST", headers={
        "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=180) as res:
        data = res.read()
    if len(data) < 1000:
        raise RuntimeError(f"resposta demasiado pequena ({len(data)} bytes)")
    return data


def measure(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    blob = r.stderr[r.stderr.rfind("{"): r.stderr.rfind("}") + 1]
    d = json.loads(blob)
    return float(d["input_i"]), float(d["input_tp"])


def normalize(src, dst, lufs):
    i, tp = measure(src)
    gain = lufs - i
    if tp + gain > -1.5:
        gain = -1.5 - tp
    # corta silencio no inicio (ataque imediato) e escurece ligeiramente os agudos extremos
    af = f"silenceremove=start_periods=1:start_threshold=-55dB,volume={gain:.2f}dB,lowpass=f=12000"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", af, "-ar", "44100", "-ac", "2",
                    "-c:a", "libmp3lame", "-b:a", "160k", dst], check=True)


def main():
    args = sys.argv[1:]
    only = set(args[args.index("--only") + 1].split(",")) if "--only" in args else None
    n = int(args[args.index("--n") + 1]) if "--n" in args else 3
    dry = "--dry-run" in args
    key = None if dry else load_key()
    todo = [c for c in CUES if not only or c in only]
    print(f"{len(todo)} sons x {n} variantes = {len(todo) * n} pedidos a ElevenLabs")
    for cue in todo:
        desc, dur, lufs = CUES[cue]
        folder = os.path.join(OUT, cue)
        os.makedirs(folder, exist_ok=True)
        existing = [f for f in os.listdir(folder) if re.match(r"eleven-\d+\.mp3$", f)]
        start = len(existing) + 1
        for i in range(start, start + n):
            dst = os.path.join(folder, f"eleven-{i}.mp3")
            text = f"{desc}. {STYLE}"
            if dry:
                print("faria", dst, "|", text[:90]); continue
            for attempt in range(3):
                try:
                    try:
                        data = request(key, text, dur, loop=(cue == "win-count"))
                    except urllib.error.HTTPError as e:
                        if cue == "win-count" and e.code in (400, 422):
                            data = request(key, text, dur)
                        else:
                            raise
                    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as t:
                        t.write(data); raw = t.name
                    normalize(raw, dst, lufs)
                    os.unlink(raw)
                    print("ok ", cue, f"eleven-{i}")
                    break
                except urllib.error.HTTPError as e:
                    msg = e.read().decode(errors="replace")[:300]
                    if e.code in (401, 403):
                        sys.exit(f"Chave recusada pela ElevenLabs ({e.code}): {msg}")
                    if e.code == 429 or e.code >= 500:
                        time.sleep(5 * (attempt + 1)); continue
                    print("ERRO", cue, e.code, msg); break
                except Exception as e:  # rede, ffmpeg
                    print("ERRO", cue, e); time.sleep(3)
    print("Feito. Abre http://127.0.0.1:4175/audio-lab.html (npm.cmd run dev) e recarrega a pagina.")


if __name__ == "__main__":
    main()
