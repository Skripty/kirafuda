// npm run simuler            : taux des boosters (100 000 ouvertures comparées aux tables).
// npm run simuler -- joueurs : 500 joueurs sur 365 jours (assidu et occasionnel) avec les règles des quêtes.
declare const process: { argv: string[] };

if (process.argv.includes('joueurs')) await import('./simuler-joueurs');
else await import('./simuler-taux');

export {};
