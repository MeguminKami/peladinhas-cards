import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({base:'./',build:{rollupOptions:{preserveEntrySignatures:'exports-only',input:{main:resolve('index.html'),embed:resolve('embed.html'),demo:resolve('host-demo.html'),'slot-host':resolve('web/host-sdk.ts')},output:{entryFileNames:chunk=>chunk.name==='slot-host'?'slot-host.js':'assets/[name]-[hash].js'}}}});
