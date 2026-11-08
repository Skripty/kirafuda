// Fonction Supabase « soumettre-draft » (source). `npm run fonctions` la regroupe, avec src/core et les données du draft,
// dans supabase/functions/soumettre-draft/index.ts, le fichier déployé (docs/SUPABASE.md, section 10).
import { contexteServeur } from './contexte';
import { traiterSoumission } from './draft-serveur';

declare const Deno: { serve(f: (r: Request) => Promise<Response>): void };

const contexte = contexteServeur();
Deno.serve((requete) => traiterSoumission(requete, contexte));
