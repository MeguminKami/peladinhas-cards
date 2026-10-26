import {defineConfig} from 'vite';
export default defineConfig({build:{outDir:'dist/sdk',emptyOutDir:true,lib:{entry:'src/sdk.ts',formats:['es'],fileName:'blackjack',cssFileName:'blackjack'},rollupOptions:{output:{manualChunks:{three:['three']}}}}});
