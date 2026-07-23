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

const questionIds = [...js.matchAll(/q\('([^']+)'/g)].map((match) => match[1]);
const replacementQuestionIds = questionIds.filter((id) => !id.startsWith('new-'));
const greenfieldQuestionIds = questionIds.filter((id) => id.startsWith('new-'));
assert.equal(replacementQuestionIds.length, 90, `Le questionnaire de remplacement doit conserver ses 90 contrôles: ${replacementQuestionIds.length}`);
assert.equal(greenfieldQuestionIds.length, 73, `Le questionnaire de premier déploiement doit conserver ses 73 contrôles: ${greenfieldQuestionIds.length}`);
assert.equal(new Set(questionIds).size, questionIds.length, 'Chaque contrôle doit posséder un identifiant unique');
for (const prefix of ['dir', 'pms', 'pos', 'stk', 'fin', 'cx', 'web', 'it', 'data']) {
  assert.ok(replacementQuestionIds.some((id) => id.startsWith(`${prefix}-`)), `Domaine de remplacement sans contrôle: ${prefix}`);
  assert.ok(greenfieldQuestionIds.some((id) => id.startsWith(`new-${prefix}-`)), `Domaine de premier déploiement sans contrôle: ${prefix}`);
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
  'PROJECT_TYPES',
  'Remplacer un système existant',
  'Déployer un premier système',
  'GREENFIELD_DOMAINS',
  'GREENFIELD_DOCUMENT_TEMPLATES',
  'GREENFIELD_VISIT_PLAN',
  'Le matériel de caisse existant',
  'Premier déploiement',
  'Orchestra',
  'Indiquer la taille du projet',
  'Périmètre à chiffrer',
  'Plan d’action CSV',
  'copy-client-followup',
  'exportActionPlan',
  'clientRequestItems',
  'Que devez-vous faire maintenant ?',
  'Noter ce qui compte',
  'Je ne sais pas',
  'open-notes',
  'INTERLOCUTORS',
  'Qui allez-vous rencontrer ?',
  'Rapide · 45 à 60 min',
  'renderGuidedQuestion',
  'Demandez simplement à voir',
  'Exemple concret',
  'Voir le contrôle détaillé',
  'plainQuestionCopy',
  'La liste des chambres correspond-elle à la réalité aujourd’hui ?',
  'Avez-vous une seule fiche Coca-Cola',
  'Quand un Coca-Cola est vendu',
  'Pouvez-vous récupérer les données de chaque logiciel',
  'Qui décidera, le jour du lancement',
  'Dicter une note',
  'data-question-photo',
  'Je vérifierai plus tard',
  'guidedSessions',
  'followUps',
  'completeGuidedInterview',
  'openVisitCheck',
  'Avant de quitter l’établissement',
  'Ce qui fonctionne',
  'Ce qui pose problème',
  'Ce qu’il faut faire ensuite',
  'responsibleParty',
  'socle inclus',
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
assert.match(css, /\.project-type-options/);
assert.match(css, /\.mission-type-summary/);
assert.match(css, /\.scope-brief/);
assert.match(css, /\.report-scope-grid/);
assert.match(css, /\.action-meta/);
assert.match(css, /\.client-request-box/);
assert.match(css, /\.journey-card/);
assert.match(css, /\.advanced-details/);
assert.match(css, /\.report-tools/);
assert.match(css, /\.interlocutor-grid/);
assert.match(css, /\.guided-question-shell/);
assert.match(css, /\.proof-box/);
assert.match(css, /\.plain-example/);
assert.match(css, /\.technical-context/);
assert.match(css, /\.visit-check-list/);
assert.match(css, /\.simple-result-grid/);

const parsedManifest = JSON.parse(manifest);
assert.equal(parsedManifest.display, 'standalone');
assert.equal(parsedManifest.scope, './');
assert.equal(parsedManifest.icons.length, 3);

for (const asset of ['./index.html', './audit.css', './audit.js', './manifest.webmanifest']) {
  assert.ok(serviceWorker.includes(asset), `Ressource PWA non mise en cache: ${asset}`);
}
assert.ok(serviceWorker.includes("CACHE_NAME = 'sartal-audit-v7'"), 'Le cache PWA doit être renouvelé pour diffuser les questions en langage simple');

assert.doesNotMatch(js, /https?:\/\//, 'L’application d’audit ne doit dépendre d’aucun service externe');

console.log(`Sártal Audit: ${questionIds.length} contrôles sur deux parcours, PWA offline, mobile et rapports adaptés validés.`);
