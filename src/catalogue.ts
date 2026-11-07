// Chargement des extensions listées dans src/data/extensions.json (fichiers JSON de src/data, inclus au build).
import liste from './data/extensions.json';
import { construireCatalogue, type EntreeExtension } from './core/catalogue';

const modules = import.meta.glob<unknown>('./data/*.json', { eager: true, import: 'default' });
/** Nom de fichier (« extension-renforts.json ») → contenu. */
const fichiers = Object.fromEntries(Object.entries(modules).map(([chemin, contenu]) => [chemin.replace('./data/', ''), contenu]));

export const { catalogue, erreurs: erreursCatalogue } = construireCatalogue(liste.extensions as EntreeExtension[], fichiers);
