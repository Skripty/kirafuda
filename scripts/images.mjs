// npm run images — prépare les images des cartes pour la mise en ligne.
//
// - Réduit les images trop lourdes : hauteur max 1400 px, WebP qualité 85,
//   2 Mo au plus pour une image fixe, 5 Mo au plus pour une animation (chargée seulement à l'affichage de la carte).
// - Convertit les animations GIF (animation.gif) en WebP animé (animation.webp).
// - Garde chaque original dans originaux-images/ (ignoré par git) avant de le remplacer.
// - Signale les cartes de la vague 1 sans image.
//
// La conversion est faite par Chrome (ou Edge) sans tête, avec le même code que la page d'admin
// (src/admin/webp.ts) : aucune dépendance à installer. Chemin du navigateur : variable CHROME si besoin.
//
// Options : --verifier          rien n'est modifié ; code de sortie 1 s'il reste une image à réduire.
//           --refaire <id-carte> refait les images de cette carte depuis ses originaux (originaux-images/cartes/<id>/),
//                                avec les limites actuelles ; les originaux restent en place.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformWithEsbuild } from 'vite';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dossierCartes = path.join(racine, 'public', 'cartes');
const dossierOriginaux = path.join(racine, 'originaux-images');
const HAUTEUR_MAX = 1400;
const POIDS_MAX = 2 * 1024 * 1024;           // image fixe (src/admin/webp.ts, POIDS_MAX)
const POIDS_MAX_ANIMATION = 5 * 1024 * 1024; // animation (src/admin/webp.ts, POIDS_MAX_ANIMATION)
const verifierSeulement = process.argv.includes('--verifier');
const iRefaire = process.argv.indexOf('--refaire');
const refaire = iRefaire >= 0 ? process.argv[iRefaire + 1] : null;
if (iRefaire >= 0 && (!refaire || !/^[a-z]+-\d+$/.test(refaire))) { console.error('Usage : npm run images -- --refaire <id-carte> (ex. lan-137)'); process.exit(1); }
/** Limite de poids d'un fichier : 5 Mo pour l'animation, 2 Mo pour une image fixe. */
const limite = (nom) => (nom.startsWith('animation.') ? POIDS_MAX_ANIMATION : POIDS_MAX);

const mo = (o) => `${(o / 1024 / 1024).toFixed(2).replace('.', ',')} Mo`;
const ko = (o) => (o < 1024 * 1024 ? `${Math.round(o / 1024)} Ko` : mo(o));

// ---------- Dimensions lues dans l'en-tête (WebP, PNG, GIF, JPEG) ----------
function dimensions(o) {
  const a = (d, f) => o.toString('latin1', d, f);
  if (a(0, 4) === 'RIFF' && a(8, 12) === 'WEBP') {
    const t = a(12, 16);
    if (t === 'VP8X') return { l: 1 + o.readUIntLE(24, 3), h: 1 + o.readUIntLE(27, 3) };
    if (t === 'VP8 ') return { l: o.readUInt16LE(26) & 0x3fff, h: o.readUInt16LE(28) & 0x3fff };
    if (t === 'VP8L') { const v = o.readUInt32LE(21); return { l: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  }
  if (a(0, 3) === 'GIF') return { l: o.readUInt16LE(6), h: o.readUInt16LE(8) };
  if (o[0] === 0x89 && a(1, 4) === 'PNG') return { l: o.readUInt32BE(16), h: o.readUInt32BE(20) };
  if (o[0] === 0xff && o[1] === 0xd8) {
    for (let i = 2; i + 9 < o.length;) {
      if (o[i] !== 0xff) { i++; continue; }
      const m = o[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { l: o.readUInt16BE(i + 7), h: o.readUInt16BE(i + 5) };
      i += 2 + o.readUInt16BE(i + 2);
    }
  }
  return null;
}
const TYPES = { '.webp': 'image/webp', '.gif': 'image/gif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

// ---------- Inventaire ----------
async function inventaire() {
  const liste = [];
  for (const id of (await readdir(dossierCartes)).sort()) {
    const dossier = path.join(dossierCartes, id);
    if (!(await stat(dossier)).isDirectory()) continue;
    for (const nom of (await readdir(dossier)).sort()) {
      const ext = path.extname(nom).toLowerCase();
      if (!TYPES[ext]) continue;
      const chemin = path.join(dossier, nom);
      const octets = await readFile(chemin);
      const d = dimensions(octets);
      liste.push({ rel: `${id}/${nom}`, id, nom, ext, chemin, taille: octets.length, l: d?.l ?? 0, h: d?.h ?? 0 });
    }
  }
  return liste;
}

/** Ce qu'il faut faire d'un fichier : null si rien. */
function action(f) {
  const base = path.basename(f.nom, f.ext);
  if (base === 'animation' && f.ext === '.gif') return { mode: 'animation', sortie: 'animation.webp', raison: 'GIF converti en WebP animé' };
  const raisons = [];
  if (f.h > HAUTEUR_MAX) raisons.push(`${f.h} px de haut`);
  if (f.taille > limite(f.nom)) raisons.push(`${mo(f.taille)} (max ${mo(limite(f.nom))})`);
  if (f.ext !== '.webp') raisons.push(`format ${f.ext.slice(1).toUpperCase()}`);
  if (raisons.length === 0) return null;
  return { mode: base === 'animation' ? 'animation' : 'fixe', sortie: `${base}.webp`, raison: raisons.join(', ') };
}

// ---------- Chrome sans tête ----------
function trouverChrome() {
  const candidats = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
  ].filter(Boolean);
  return candidats.find((c) => existsSync(c));
}

async function demarrerConvertisseur() {
  const navigateur = trouverChrome();
  if (!navigateur) throw new Error('Chrome ou Edge introuvable. Indique son chemin dans la variable CHROME (ex. CHROME="/chemin/chrome" npm run images).');
  const source = await readFile(path.join(racine, 'src', 'admin', 'webp.ts'), 'utf8');
  const module = (await transformWithEsbuild(source, 'webp.ts', { loader: 'ts', format: 'esm', target: 'es2022' })).code;

  // Petit serveur local : la page vide, le module de conversion, et les images à convertir.
  const serveur = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    try {
      if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>images</title>'); return; }
      if (url.pathname === '/webp.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(module); return; }
      if (url.pathname === '/fichier') {
        const base = url.searchParams.get('depuis') === 'originaux' ? path.join(dossierOriginaux, 'cartes') : dossierCartes;
        const chemin = path.resolve(base, url.searchParams.get('p') ?? '');
        if (!chemin.startsWith(base + path.sep)) throw new Error('chemin refusé');
        res.setHeader('Content-Type', TYPES[path.extname(chemin).toLowerCase()] ?? 'application/octet-stream');
        res.end(await readFile(chemin));
        return;
      }
      res.statusCode = 404; res.end();
    } catch { res.statusCode = 500; res.end(); }
  });
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
  const port = serveur.address().port;

  const profil = path.join(tmpdir(), `kirafuda-images-${process.pid}`);
  const portDebug = 9300 + (process.pid % 500);
  const chrome = spawn(navigateur, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${portDebug}`, `--user-data-dir=${profil}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
  let cible;
  for (let i = 0; i < 80 && !cible; i++) {
    try { cible = (await (await fetch(`http://127.0.0.1:${portDebug}/json`)).json()).find((t) => t.type === 'page' && t.url.startsWith(`http://127.0.0.1:${port}`)); } catch { /* pas encore prêt */ }
    if (!cible) await new Promise((ok) => setTimeout(ok, 250));
  }
  if (!cible) { chrome.kill(); serveur.close(); throw new Error('Chrome n’a pas démarré.'); }
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
  let n = 0;
  const attente = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && attente.has(d.id)) { attente.get(d.id)(d); attente.delete(d.id); } };
  const evaluer = (expression) => new Promise((ok, ko) => {
    const id = ++n;
    attente.set(id, (d) => {
      const r = d.result;
      if (d.error) ko(new Error(d.error.message));
      else if (r?.exceptionDetails) ko(new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
      else ok(r?.result?.value);
    });
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });
  // Attendre que la page du serveur local soit chargée (sinon l'import du module échoue).
  const origine = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    const pret = await evaluer(`location.origin === ${JSON.stringify(origine)} && document.readyState === 'complete'`).catch(() => false);
    if (pret) break;
    await new Promise((ok) => setTimeout(ok, 100));
  }
  return {
    /** Convertit un fichier de public/cartes ; renvoie les octets WebP et les infos de conversion. */
    async convertir(rel, mode, depuis = 'cartes') {
      const r = await evaluer(`(async () => {
        const m = await import(location.origin + '/webp.js');
        const source = await (await fetch('/fichier?depuis=' + ${JSON.stringify(depuis)} + '&p=' + encodeURIComponent(${JSON.stringify(rel)}))).blob();
        const r = await (${JSON.stringify(mode)} === 'animation' ? m.animationEnWebp(source) : m.imageFixeEnWebp(source));
        let b = ''; for (let i = 0; i < r.octets.length; i += 0x8000) b += String.fromCharCode(...r.octets.subarray(i, i + 0x8000));
        return { base64: btoa(b), largeur: r.largeur, hauteur: r.hauteur, images: r.images, imagesSource: r.imagesSource };
      })()`);
      return { ...r, octets: Buffer.from(r.base64, 'base64') };
    },
    async fermer() {
      ws.close();
      chrome.kill();
      serveur.close();
      await new Promise((ok) => setTimeout(ok, 500));
      await rm(profil, { recursive: true, force: true }).catch(() => {});
    },
  };
}

/** Range l'original dans originaux-images/cartes/<id>/ (sans jamais écraser un original déjà gardé). */
async function garderOriginal(f) {
  const dossier = path.join(dossierOriginaux, 'cartes', f.id);
  await mkdir(dossier, { recursive: true });
  let cible = path.join(dossier, f.nom);
  if (existsSync(cible)) cible = path.join(dossier, `${path.basename(f.nom, f.ext)}-${new Date().toISOString().replace(/[:.]/g, '-')}${f.ext}`);
  await rename(f.chemin, cible);
  return path.relative(racine, cible).split(path.sep).join('/');
}

// ---------- Cartes de la vague 1 sans image ----------
async function cartesSansImage() {
  const liste = JSON.parse(await readFile(path.join(racine, 'src', 'data', 'extensions.json'), 'utf8'));
  const vague = liste.extensions[0].vagues[0];
  const ext = JSON.parse(await readFile(path.join(racine, 'src', 'data', vague.fichier), 'utf8'));
  const nomPerso = new Map(ext.personnages.map((p) => [p.id, p.nom]));
  const a = (id, nom) => existsSync(path.join(dossierCartes, id, nom));
  const remplacement = [], repriseBase = [], sansAnimation = [];
  for (const c of ext.cartes) {
    const libelle = `${c.id} (${nomPerso.get(c.personnage) ?? c.personnage}, ${c.finition})`;
    if (c.finition === 'immersive' && !a(c.id, 'animation.webp')) sansAnimation.push(libelle);
    if (a(c.id, 'illustration.webp')) continue;
    const base = c.secrete ? ext.cartes.find((b) => !b.secrete && b.personnage === c.personnage) : undefined;
    if (base && a(base.id, 'illustration.webp')) repriseBase.push(`${libelle} → image de ${base.id}`);
    else remplacement.push(libelle);
  }
  return { vague, total: ext.cartes.length, remplacement, repriseBase, sansAnimation };
}

// ---------- Refaire une carte depuis ses originaux ----------
async function refaireCarte(id) {
  const dossier = path.join(dossierOriginaux, 'cartes', id);
  if (!existsSync(dossier)) throw new Error(`Aucun original pour ${id} dans originaux-images/cartes/${id}/.`);
  // Un original par calque : le premier gardé (nom sans horodatage), sinon le plus ancien.
  const parCalque = new Map();
  for (const nom of (await readdir(dossier)).sort()) {
    const ext = path.extname(nom).toLowerCase();
    if (!TYPES[ext]) continue;
    const base = path.basename(nom, ext).replace(/-\d{4}-\d{2}-\d{2}T.*$/, '');
    if (!parCalque.has(base) || path.basename(nom, ext) === base) parCalque.set(base, nom);
  }
  if (parCalque.size === 0) throw new Error(`Aucune image dans originaux-images/cartes/${id}/.`);
  const conv = await demarrerConvertisseur();
  let echecs = 0;
  try {
    for (const [base, nom] of parCalque) {
      try {
        const original = await readFile(path.join(dossier, nom));
        const d = dimensions(original);
        const r = await conv.convertir(`${id}/${nom}`, base === 'animation' ? 'animation' : 'fixe', 'originaux');
        const sortie = path.join(dossierCartes, id, `${base}.webp`);
        const avant = existsSync(sortie) ? (await stat(sortie)).size : null;
        await mkdir(path.dirname(sortie), { recursive: true });
        await writeFile(`${sortie}.tmp-${process.pid}`, r.octets);
        await rename(`${sortie}.tmp-${process.pid}`, sortie);
        const images = r.imagesSource > 1 ? `, ${r.images}/${r.imagesSource} images` : '';
        console.log(`  originaux-images/cartes/${id}/${nom} (${d?.l}×${d?.h}, ${ko(original.length)}) → ${id}/${base}.webp (${r.largeur}×${r.hauteur}, ${ko(r.octets.length)}${images}, max ${mo(limite(base + '.webp'))})${avant !== null ? ` · remplace ${ko(avant)}` : ''}`);
      } catch (e) {
        echecs++;
        console.log(`  ${id}/${nom} : ÉCHEC — ${e.message}`);
      }
    }
  } finally {
    await conv.fermer();
  }
  return echecs;
}

// ---------- Programme ----------
let erreurs = 0;
if (refaire) {
  console.log(`Refaire ${refaire} depuis ses originaux :`);
  try { erreurs += await refaireCarte(refaire); } catch (e) { console.log(`  ${e.message}`); erreurs++; }
  console.log('');
}
const avant = await inventaire();
const aFaire = avant.map((f) => ({ f, a: action(f) })).filter((x) => x.a);
console.log(`Images des cartes : ${avant.length} fichiers, ${mo(avant.reduce((s, f) => s + f.taille, 0))}.`);

if (aFaire.length === 0) console.log('Aucune image à réduire.');
else if (verifierSeulement) {
  console.log(`${aFaire.length} image(s) à réduire (lance npm run images) :`);
  for (const { f, a } of aFaire) console.log(`  ${f.rel} : ${a.raison}`);
  erreurs = aFaire.length;
} else {
  console.log(`${aFaire.length} image(s) à réduire :`);
  const conv = await demarrerConvertisseur();
  try {
    for (const { f, a } of aFaire) {
      try {
        const r = await conv.convertir(f.rel, a.mode);
        const sortie = path.join(dossierCartes, f.id, a.sortie);
        const temporaire = `${sortie}.tmp-${process.pid}`;
        await writeFile(temporaire, r.octets);
        const original = await garderOriginal(f); // l'original est déplacé avant le remplacement
        await rename(temporaire, sortie);
        const images = r.images > 1 || r.imagesSource > 1 ? `, ${r.images}/${r.imagesSource} images` : '';
        console.log(`  ${f.rel} (${f.l}×${f.h}, ${ko(f.taille)}) → ${f.id}/${a.sortie} (${r.largeur}×${r.hauteur}, ${ko(r.octets.length)}${images}) · ${a.raison} · original : ${original}`);
      } catch (e) {
        erreurs++;
        console.log(`  ${f.rel} : ÉCHEC — ${e.message}`);
      }
    }
  } finally {
    await conv.fermer();
  }
}

// Contrôle final : images fixes ≤ 2 Mo, animations ≤ 5 Mo, aucune au-dessus de 1400 px de haut.
const apres = await inventaire();
const tropLourdes = apres.filter((f) => f.taille > limite(f.nom) || f.h > HAUTEUR_MAX);
console.log(`\nAprès : ${apres.length} fichiers, ${mo(apres.reduce((s, f) => s + f.taille, 0))} ; le plus lourd : ${(() => { const m = apres.reduce((x, f) => (f.taille > x.taille ? f : x), apres[0]); return m ? `${m.rel} (${ko(m.taille)})` : '—'; })()}.`);
if (tropLourdes.length) {
  console.log(`Encore trop lourdes ou trop hautes : ${tropLourdes.map((f) => `${f.rel} (${f.l}×${f.h}, ${ko(f.taille)})`).join(', ')}`);
  erreurs += verifierSeulement ? 0 : tropLourdes.length;
} else console.log('Images fixes ≤ 2 Mo, animations ≤ 5 Mo, aucune au-dessus de 1400 px de haut.');
const gifs = apres.filter((f) => f.ext === '.gif');
if (gifs.length) console.log(`GIF restants (le jeu ne les lit pas) : ${gifs.map((f) => f.rel).join(', ')}`);

const s = await cartesSansImage();
console.log(`\nVague 1 (${s.vague.nom}, ${s.total} cartes) :`);
console.log(`  sans aucune image, visuel de remplacement (${s.remplacement.length}) : ${s.remplacement.join(', ') || 'aucune'}`);
console.log(`  secrètes sans image propre, reprennent la carte de base (${s.repriseBase.length}) : ${s.repriseBase.join(', ') || 'aucune'}`);
console.log(`  immersives sans animation, image fixe affichée (${s.sansAnimation.length}) : ${s.sansAnimation.join(', ') || 'aucune'}`);

process.exitCode = erreurs ? 1 : 0;
