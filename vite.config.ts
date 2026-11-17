import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single`  : un unique fichier HTML autonome (dist-single/index.html), à ouvrir directement.
// `npm run build:preview` : variante de démonstration (données d'exemple, sans téléchargements).
export default defineConfig(({ mode }) => {
  const single = mode === 'single' || mode === 'preview';
  return {
    plugins: single ? [react(), viteSingleFile()] : [react()],
    build: { outDir: mode === 'preview' ? 'dist-preview' : single ? 'dist-single' : 'dist' },
  };
});
