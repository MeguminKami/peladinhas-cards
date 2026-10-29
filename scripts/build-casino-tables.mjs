import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const [source, directory, sdk] of [
  ["blackjack-3d", "blackjack", "blackjack"],
  ["roleta-europeia-3d", "roulette", "roleta"],
]) {
  const packageRoot = resolve(root, "games", source);
  const vite = resolve(packageRoot, "node_modules/vite/bin/vite.js");
  if (!existsSync(vite))
    throw Error(`Executa npm.cmd ci --prefix games/${source} para preparar o SDK local.`);
  const result = spawnSync(process.execPath, [vite, "build", "--config", "vite.sdk.config.mjs", "--configLoader", "native"], { cwd: packageRoot, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`Falhou a build do SDK de ${source}.`);
  const sourceSdk = resolve(root, "games", source, "dist/sdk");
  if (!existsSync(resolve(sourceSdk, `${sdk}.js`)))
    throw Error(`Falta o SDK de ${source}. Executa npm.cmd run build --prefix games/${source}.`);
  const target = resolve(root, "assets/games", directory);
  mkdirSync(target, { recursive: true });
  cpSync(sourceSdk, resolve(target, "sdk"), { recursive: true });
  writeFileSync(resolve(target, "embed.html"), `<!doctype html>
<html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${directory === "blackjack" ? "Blackjack" : "Roleta"}</title>
<link rel="stylesheet" href="./sdk/${sdk}.css">
<link rel="stylesheet" href="../../../css/casino-table-fit.css">
<style>html,body{margin:0;min-width:0;min-height:0}#game{min-width:0}</style>
<body><div id="game"></div><script type="module">
import * as SDK from './sdk/${sdk}.js';
const {mount,WalletDeclinedError}=SDK;
import {installCasinoTableFit} from '../../../js/casino-table-fit.js';
window.mountBlackjackMultiplayer = connection => {
const root=document.querySelector('#game');
const handle=SDK.mountMultiplayer(root,connection);
const fit=installCasinoTableFit(root);
window.setCasinoFit=value=>fit.set(value);
return {destroy(){fit.destroy();handle.destroy();}};
};
window.mountRouletteMultiplayer = connection => {
const root=document.querySelector('#game');
const handle=SDK.mount(root,{playerId:connection.uid,online:connection});
const fit=installCasinoTableFit(root);
window.setCasinoFit=value=>fit.set(value);
return {...handle,destroy(){fit.destroy();handle.destroy();}};
};
window.mountCasinoTable = ({playerId,wallet}) => {
const root=document.querySelector('#game');
const handle=mount(root, {
  mode:'integrated',playerId,wallet:{getBalance:()=>wallet.getBalance(),settle:async operation=>{
    try{return await wallet.settle(operation);}
    catch(error){if(error.applied===false)throw new WalletDeclinedError(error.message,error.balance);throw new Error(error.message);}
  }}
});
const fit=installCasinoTableFit(root);
window.setCasinoFit=value=>fit.set(value);
return {...handle,destroy(){fit.destroy();handle.destroy();}};
};
parent.postMessage({type:'peladinhas-table-ready'},location.origin);
</script></body></html>`);
}
console.log("SDKs integrados preparados: Blackjack e Roleta.");
