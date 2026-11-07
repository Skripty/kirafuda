// Version des images des cartes : empreinte du contenu de public/cartes, calculée au build.
// Les adresses d'images portent « ?v=<empreinte> » : public/_headers peut les mettre en cache un an,
// et une image remplacée (admin, npm run images) change l'empreinte, donc l'adresse, au déploiement suivant.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export function versionImages(racine: string): string {
  const dossier = path.join(racine, 'public', 'cartes');
  const hash = createHash('sha256');
  const parcourir = (d: string): void => {
    for (const nom of readdirSync(d).sort()) {
      const chemin = path.join(d, nom);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else hash.update(path.relative(dossier, chemin).split(path.sep).join('/')).update('\0').update(readFileSync(chemin));
    }
  };
  try { parcourir(dossier); } catch { return 'sans-images'; }
  return hash.digest('hex').slice(0, 10);
}
