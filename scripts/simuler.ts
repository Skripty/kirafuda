// npm run simuler            : taux des boosters (100 000 ouvertures comparées aux tables).
// npm run simuler -- joueurs : 500 joueurs sur 365 jours (assidu et occasionnel) avec les règles des quêtes.
// npm run simuler -- combat  : 5 000 parties de combat entre decks standardisés de série (IA gloutonnes).
declare const process: { argv: string[] };

if (process.argv.includes('joueurs')) await import('./simuler-joueurs');
else if (process.argv.includes('combat')) await import('./simuler-combat');
else await import('./simuler-taux');

export {};
