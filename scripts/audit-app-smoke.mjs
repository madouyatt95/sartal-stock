import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, js, manifest, serviceWorker] = await Promise.all([
  readFile('public/audit/index.html', 'utf8'),
  readFile('public/audit/audit.css', 'utf8'),
  readFile('public/audit/audit.js', 'utf8'),
  readFile('public/audit/manifest.webmanifest', 'utf8'),
  readFile('public/audit/sw.js', 'utf8'),
]);

assert.match(html, /Sártal Audit - Diagnostic hôtel et restaurant/);
assert.match(html, /manifest\.webmanifest/);
assert.match(html, /viewport-fit=cover/);

const questionIds = [...js.matchAll(/q\('((?:dir|pms|pos|stk|fin|cx|web|it|data)-[^']+)'/g)].map((match) => match[1]);
const questionCount = questionIds.length;
assert.equal(questionCount, 90, `Le questionnaire doit conserver ses 90 contrôles: ${questionCount}`);
assert.equal(new Set(questionIds).size, questionCount, 'Chaque contrôle doit posséder un identifiant unique');
for (const prefix of ['dir', 'pms', 'pos', 'stk', 'fin', 'cx', 'web', 'it', 'data']) {
  assert.ok(questionIds.some((id) => id.startsWith(`${prefix}-`)), `Domaine sans contrôle: ${prefix}`);
}

for (const marker of [
  'Direction et gouvernance',
  'Hôtel et PMS',
  'Restaurant et POS',
  'Stock, achats et recettes',
  'Finance, caisses et paiements',
  'Expérience client et CRM',
  'Vente en ligne et livraison',
  'IT, matériel et sécurité',
  'Données, intégrations et migration',
  'Orchestra',
  'print-report',
  'export-backup',
  'compressImage',
  'schedulePersist',
  'Constats terrain détaillés',
  'Entretiens réalisés',
  'Stockage local saturé',
  'ACCESS_SESSION_KEY',
  "ACCESS_CODE = '0134'",
  'audit-access-form',
  'inputmode="numeric"',
  'lock-audit',
  "updateViaCache: 'none'",
]) assert.ok(js.includes(marker), `Marqueur manquant: ${marker}`);

assert.match(css, /@media \(max-width: 720px\)/);
assert.match(css, /@media print/);
assert.match(css, /max-height: 92dvh/);
assert.match(css, /safe-area-inset-bottom/);
assert.match(css, /\.score-ring\s*\{[^}]*position: relative/s);
assert.match(css, /\.report-findings/);
assert.match(css, /\.audit-access-screen/);
assert.match(css, /\.audit-code-field input/);

const parsedManifest = JSON.parse(manifest);
assert.equal(parsedManifest.display, 'standalone');
assert.equal(parsedManifest.scope, './');
assert.equal(parsedManifest.icons.length, 3);

for (const asset of ['./index.html', './audit.css', './audit.js', './manifest.webmanifest']) {
  assert.ok(serviceWorker.includes(asset), `Ressource PWA non mise en cache: ${asset}`);
}
assert.ok(serviceWorker.includes("CACHE_NAME = 'sartal-audit-v2'"), 'Le cache PWA doit être renouvelé pour diffuser le verrou d’accès');

assert.doesNotMatch(js, /https?:\/\//, 'L’application d’audit ne doit dépendre d’aucun service externe');

console.log(`Sártal Audit: ${questionCount} contrôles, PWA offline, mobile et rapport imprimable validés.`);
