// Fonction Supabase « reclamer-draft » (source). `npm run fonctions` la regroupe, avec src/core et les données,
// dans supabase/functions/reclamer-draft/index.ts, le fichier déployé (docs/SUPABASE.md, section 10).
import { contexteServeur } from './contexte';
import { traiterReclamation } from './draft-serveur';

declare const Deno: { serve(f: (r: Request) => Promise<Response>): void };

const contexte = contexteServeur();
Deno.serve((requete) => traiterReclamation(requete, contexte));
