// Contexte commun aux deux fonctions : extensions (les mêmes fichiers JSON que le jeu), thèmes, récompenses, base.
import { catalogue, erreursCatalogue } from '../../src/catalogue';
import { disponiblesPourDraft } from '../../src/core/catalogue';
import { lundiSemaineIso, type Theme } from '../../src/core/draft';
import themesDraft from '../../src/data/themes-draft.json';
import quetes from '../../src/data/quetes.json';
import { creerBaseRest } from './base-rest';
import type { ContexteServeur } from './draft-serveur';

declare const Deno: { env: { get(nom: string): string | undefined } };

export function contexteServeur(): ContexteServeur {
  if (erreursCatalogue.length > 0) throw new Error(`Données du jeu invalides : ${erreursCatalogue.join(' ')}`);
  const url = Deno.env.get('SUPABASE_URL');
  const cle = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !cle) throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquent (fournies par Supabase aux fonctions).');
  return {
    // Mêmes extensions que le jeu : celles sorties au lundi de la semaine (src/main.ts).
    sources: (semaine) => disponiblesPourDraft(catalogue, lundiSemaineIso(semaine)),
    themes: themesDraft.themes as Theme[],
    recompenses: quetes.hebdomadaire.recompensesDraft,
    base: creerBaseRest(url, cle),
    maintenant: () => new Date(),
  };
}
