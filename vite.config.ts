import { defineConfig } from 'vite';
import { adminImages } from './outils/vite-admin';
import { versionImages } from './outils/version-images';

export default defineConfig(({ command }) => ({
  server: { port: 5173 },
  // Version des images (adresses « ?v=… », cache long) : empreinte de public/cartes au build, « dev » sinon.
  define: { __VERSION_IMAGES__: JSON.stringify(command === 'build' ? versionImages(process.cwd()) : 'dev') },
  // Page d'admin des images : routes /__admin/* actives seulement avec `npm run dev`.
  // Le build ne prend que index.html : ni admin.html ni galerie.html n'y figurent.
  plugins: [adminImages()],
}));
