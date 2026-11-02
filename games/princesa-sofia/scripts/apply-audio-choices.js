// Aplica ao jogo as escolhas feitas na pagina de teste de som (audio-lab.html).
// Le audio-lab/choices.json e copia o candidato escolhido para ui/audio/sfx/<som>.mp3.
// "silencio" remove o ficheiro (o jogo fica calado nesse momento). Atualiza ui/audio/sfx/manifest.json.
// Uso: node scripts/apply-audio-choices.js
import { readFile, writeFile, copyFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SAFE = /^[a-z0-9-]+$/;

export async function listCandidates(root = ROOT) {
  const dir = join(root, 'audio-lab', 'candidates');
  const out = {};
  if (!existsSync(dir)) return out;
  for (const cue of (await readdir(dir)).sort()) {
    if (!SAFE.test(cue)) continue;
    const files = (await readdir(join(dir, cue))).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4)).filter(f => SAFE.test(f));
    out[cue] = files.sort((a, b) => (a === 'original' ? -1 : b === 'original' ? 1 : a.localeCompare(b)));
  }
  return out;
}

export async function applyChoices(root = ROOT) {
  const choices = JSON.parse(await readFile(join(root, 'audio-lab', 'choices.json'), 'utf8')).choices || {};
  const candidates = await listCandidates(root);
  const manifestPath = join(root, 'ui', 'audio', 'sfx', 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : {};
  const normalized = new Set(manifest.normalized || []);
  const report = [];
  for (const [cue, pick] of Object.entries(choices)) {
    if (!SAFE.test(cue) || !candidates[cue]) continue;
    const target = join(root, 'ui', 'audio', 'sfx', `${cue}.mp3`);
    if (pick === 'silencio') {
      await rm(target, { force: true }); normalized.delete(cue); report.push(`${cue}: silencio`);
    } else if (candidates[cue].includes(pick)) {
      await copyFile(join(root, 'audio-lab', 'candidates', cue, `${pick}.mp3`), target);
      if (pick === 'original') normalized.delete(cue); else normalized.add(cue);
      report.push(`${cue}: ${pick}`);
    }
  }
  manifest.normalized = [...normalized].sort();
  manifest.variants ||= {};
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  applyChoices().then(r => console.log(r.join('\n') || 'Sem escolhas.'), e => { console.error(e.message); process.exit(1); });
}
