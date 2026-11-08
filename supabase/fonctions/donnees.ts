// Données du jeu utiles au draft, et seulement elles : extensions (cartes, personnages, attaques), boosters,
// liste des extensions. Les thèmes et les récompenses sont importés par contexte.ts. La cote (popularite*.json)
// et les autres réglages n'entrent pas dans les fonctions : les modifier n'oblige pas à les redéployer.
import liste from '../../src/data/extensions.json';
import { construireCatalogue, type EntreeExtension } from '../../src/core/catalogue';

const modules = import.meta.glob<unknown>(['../../src/data/extension-*.json', '../../src/data/booster-*.json'], { eager: true, import: 'default' });
/** Nom de fichier (« extension-renforts.json ») → contenu. */
const fichiers = Object.fromEntries(Object.entries(modules).map(([chemin, contenu]) => [chemin.replace('../../src/data/', ''), contenu]));

export const { catalogue, erreurs: erreursCatalogue } = construireCatalogue(liste.extensions as EntreeExtension[], fichiers);
