"""Gera os efeitos orquestrais/organicos da slot Princesa Sofia via ElevenLabs SFX.

Requer a variavel de ambiente ELEVENLABS_API_KEY (nunca escrever a chave em ficheiros).
Uso: python scripts/generate-sfx-elevenlabs.py [--only nome1,nome2]
Os ficheiros sao gravados em ui/audio/sfx/ com os nomes fixos do documento 04-sons-musicas.md.
"""
import os
import sys
import time
import urllib.request
import json

API = "https://api.elevenlabs.io/v1/sound-generation"
OUT = os.path.join(os.path.dirname(__file__), "..", "ui", "audio", "sfx")

# nome -> (prompt, duracao alvo em segundos)
CUES = {
    "bonus-trigger": ("Magical bonus fanfare transition, harp glissando, warm strings and glockenspiel, three ascending chords resolving brightly, fairytale slot game, no drums", 2.5),
    "intro-common": ("Welcoming enchanted garden stinger, cheerful flute melody, harp arpeggios, flowers blooming in soft bells, bright major key, fairytale, instrumental", 4.5),
    "intro-super": ("Elegant moonlit ballroom waltz stinger, graceful strings and celesta, romantic clarinet, curtains opening to a candlelit royal ball, 3/4 feel, instrumental", 4.5),
    "intro-secret": ("Ethereal aurora borealis reveal stinger, soft wordless choir, crystalline bells, ambient pads swelling gently, majestic and rare, instrumental", 5.5),
    "retrigger": ("Short euphoric retrigger fanfare, quick ascending celesta notes, warm string chord, sparkling bells, celebratory but light, fairytale slot game", 1.5),
    "bonus-end": ("Warm orchestral closing fanfare, strings and harp resolving to a gentle major chord, shimmering bell tail, fairytale ending, instrumental", 3.0),
    "max-win": ("Huge magical celebration, full orchestra and choir, cascading bells and fairy dust sparkles, majestic sustained finale, the biggest win moment of a fairytale slot game", 5.0),
    "purchase-flowers": ("Sequential magical flower bells, three to five soft chime notes one after another, then a shimmering convergence whoosh, fairytale slot game", 2.0),
}


def generate(key, name, prompt, duration):
    body = json.dumps({
        "text": prompt,
        "duration_seconds": duration,
        "prompt_influence": 0.4,
    }).encode()
    req = urllib.request.Request(API, data=body, method="POST", headers={
        "xi-api-key": key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    })
    with urllib.request.urlopen(req, timeout=120) as res:
        data = res.read()
    if len(data) < 1000:
        raise RuntimeError(f"resposta demasiado pequena ({len(data)} bytes)")
    path = os.path.join(OUT, name + ".mp3")
    with open(path, "wb") as f:
        f.write(data)
    print(f"OK  {name}.mp3  ({len(data)//1024} KB)")


def get_key():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if key:
        return key
    if sys.platform == "win32":
        import winreg
        for root in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
            try:
                with winreg.OpenKey(root, r"Environment") as k:
                    return winreg.QueryValueEx(k, "ELEVENLABS_API_KEY")[0]
            except OSError:
                continue
    return None


def main():
    key = get_key()
    if not key:
        sys.exit("ELEVENLABS_API_KEY nao definida. Corre: setx ELEVENLABS_API_KEY \"...\" e abre um terminal novo.")
    os.makedirs(OUT, exist_ok=True)
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    failed = []
    for name, (prompt, duration) in CUES.items():
        if only and name not in only:
            continue
        target = os.path.join(OUT, name + ".mp3")
        if os.path.exists(target):
            print(f"SKIP {name}.mp3 (ja existe)")
            continue
        try:
            generate(key, name, prompt, duration)
            time.sleep(1)  # ritmo suave para o free tier
        except Exception as exc:
            print(f"ERRO {name}: {exc}")
            failed.append(name)
    if failed:
        sys.exit("Falharam: " + ", ".join(failed))
    print("Concluido.")


if __name__ == "__main__":
    main()
