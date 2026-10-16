import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, relative } from 'node:path';
import { readFileSync, existsSync, statSync } from 'node:fs';

const project = process.cwd();
export default defineConfig(({ mode }) => ({
  root: resolve(project, 'frontend'),
  base: './',
  publicDir: false,
  plugins: [react(), {
    name: 'peladinhas-public-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname;
        if (!/^\/(?:assets|css)\//.test(pathname) && !['/manifest.webmanifest', '/offline.html', '/sw.js'].includes(pathname)) return next();
        const path = resolve(project, `.${decodeURIComponent(pathname)}`);
        const publicPath = relative(project,path).replaceAll('\\','/');
        if (!/^(?:assets|css)\//.test(publicPath) && !['manifest.webmanifest','offline.html','sw.js'].includes(publicPath)) return next();
        if (!path.startsWith(project + requireSeparator()) || !existsSync(path) || !statSync(path).isFile()) return next();
        const types: Record<string, string> = {css:'text/css', svg:'image/svg+xml', webp:'image/webp', png:'image/png', woff:'font/woff', js:'text/javascript', webmanifest:'application/manifest+json', html:'text/html'};
        response.setHeader('Content-Type', types[path.split('.').pop() || ''] || 'application/octet-stream');
        response.setHeader('Cache-Control', 'no-store');
        response.end(readFileSync(path));
      });
    },
  }],
  resolve: {
    alias: [
      { find: '/src', replacement: resolve(project, 'src') },
      ...(mode === 'test' ? [
        { find: /^(?:.*\/)?firebase\.js$/, replacement: resolve(project, 'src/testing/firebase.ts') },
        { find: /^(?:.*\/)?auth\.js$/, replacement: resolve(project, 'tests/fixtures/auth.js') },
        { find: /^(?:.*\/)?db\.js$/, replacement: resolve(project, 'tests/fixtures/db.js') },
        { find: /^\.\/(photo-upload|ovr-presets)\.js$/, replacement: resolve(project, 'js/$1.js') },
      ] : []),
      { find: /^https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/firebase-(app|auth|firestore|storage|functions)\.js$/, replacement: 'firebase/$1' },
    ],
  },
  server: {
    host: '127.0.0.1',
    fs: { strict: true, allow: [resolve(project, 'frontend'), resolve(project, 'src'), resolve(project, 'js'), resolve(project, 'node_modules'), resolve(project, 'tests/fixtures')], deny: ['**/.*/**', '**/*.rules', '**/*.env*', '**/.secret*', '**/functions/**', '**/package*.json', '**/firebase*.json'] },
  },
  build: {outDir: resolve(project, '.firebase/react-site'), emptyOutDir: true, sourcemap: false},
}));
function requireSeparator() { return process.platform === 'win32' ? '\\' : '/'; }
