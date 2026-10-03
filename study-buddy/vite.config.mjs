import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
export default defineConfig(({command})=>({ plugins: [react(), tailwind(), ...(command==='serve'?[{name:'development-csp',transformIndexHtml:html=>html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*\/>/,'')}]:[])], base: './', build: { outDir: 'dist' }, server: { host: '127.0.0.1', strictPort: true, port: 5173 } }));
