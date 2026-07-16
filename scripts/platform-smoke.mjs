import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
  clear: () => values.clear(),
  key: index => [...values.keys()][index] ?? null,
  get length() { return values.size; }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });

try {
  const { useStockState } = await server.ssrLoadModule('/src/hooks/useStockState.ts');
  const { getDB } = await server.ssrLoadModule('/src/db.ts');
  const { SartalAccessCenter } = await server.ssrLoadModule('/src/views/SartalAccessCenter.tsx');
  const { SartalPulse } = await server.ssrLoadModule('/src/views/SartalPulse.tsx');
  const { Settings } = await server.ssrLoadModule('/src/views/Settings.tsx');
  const { FinanceCenter } = await server.ssrLoadModule('/src/views/FinanceCenter.tsx');
  const { CustomerGrowthCenter } = await server.ssrLoadModule('/src/views/CustomerGrowthCenter.tsx');
  let state;
  const Harness = ({ screen }) => {
    state = useStockState();
    return screen === 'access'
      ? React.createElement(SartalAccessCenter, { state })
      : React.createElement(SartalPulse, { state, setView: () => {} });
  };

  const accessHtml = renderToStaticMarkup(React.createElement(Harness, { screen: 'access' }));
  ['CENTRE D’ACCÈS', 'Sártal Pilotage', 'Sártal Équipe', 'Mon Sártal', 'Mon séjour Sártal', 'Accès orienté par profil'].forEach(marker => assert(accessHtml.includes(marker), `Centre d’accès incomplet : ${marker}`));

  const pulseHtml = renderToStaticMarkup(React.createElement(Harness, { screen: 'pulse' }));
  ['SÁRTAL PULSE', 'Tous les établissements', 'Comparaison des établissements', 'Priorités maintenant', 'Flux opérationnel', 'Tenir les promesses clients', 'Sécuriser le stock'].forEach(marker => assert(pulseHtml.includes(marker), `Sártal Pulse incomplet : ${marker}`));

  const settingsHtml = renderToStaticMarkup(React.createElement(Settings, { state }));
  ['Préparation du déploiement', 'Canaux reliés aux dépôts', 'Équipes affectées', 'Données de démonstration'].forEach(marker => assert(settingsHtml.includes(marker), `Centre de déploiement incomplet : ${marker}`));
  const financeHtml = renderToStaticMarkup(React.createElement(FinanceCenter, { state }));
  ['Chaque encaissement retrouve son opération', 'Répartition des flux de paiement', 'sans double comptage', 'Clôtures caisse', 'File de rapprochement'].forEach(marker => assert(financeHtml.includes(marker), `Centre finance incomplet : ${marker}`));
  const crmHtml = renderToStaticMarkup(React.createElement(CustomerGrowthCenter, { state }));
  ['Reconnaître le client avant de lui parler', 'Répertoire client', 'CAMPAGNE CONSENTIE', 'Reprises prioritaires'].forEach(marker => assert(crmHtml.includes(marker), `Centre CRM incomplet : ${marker}`));

  let db = getDB();
  assert(db.sartalBrandSettings.enabledModules.length === 4, 'Modules actifs absents de la configuration');
  assert(db.sartalBrandSettings.siteProfiles.some(item => item.siteId === 'site-1'), 'Identité par établissement absente');
  state.updateSartalBrandSettings({
    enabledModules: ['stock', 'restaurant'],
    siteProfiles: db.sartalBrandSettings.siteProfiles.map(profile => profile.siteId === 'site-1' ? { ...profile, displayName: 'Sártal Dakar Test', welcomeMessage: 'Bienvenue au test.' } : profile)
  });
  db = getDB();
  assert(db.sartalBrandSettings.enabledModules.length === 2 && db.sartalBrandSettings.enabledModules.includes('stock'), 'Activation des modules non conservée');
  assert(db.sartalBrandSettings.siteProfiles.find(item => item.siteId === 'site-1').displayName === 'Sártal Dakar Test', 'Personnalisation du site non conservée');

  const campaignMessagesBefore = db.sartalCustomerMessages.length;
  const campaignRecipients = state.launchSartalCampaign({ name: 'Test qualité CRM', segment: 'signature', context: 'restaurant', channel: 'whatsapp', content: 'Message de contrôle consenti.', bonusPoints: 25, actorName: 'Direction test' });
  assert(campaignRecipients > 0, 'La campagne consentie ne trouve aucun destinataire');
  assert(getDB().sartalCustomerMessages.length === campaignMessagesBefore + campaignRecipients, 'Les messages de campagne ne sont pas tracés');
  const dispatchOrder = getDB().deliveryOrders.find(item => ['ready', 'out_for_delivery', 'failed'].includes(item.status));
  const driver = getDB().employeeProfiles.find(item => item.role === 'driver' && item.active);
  state.assignDeliveryDriver(dispatchOrder.id, driver.name, driver.phone, 'Responsable dispatch test');
  assert(getDB().deliveryOrders.find(item => item.id === dispatchOrder.id).driverName === driver.name, 'L’affectation du livreur n’est pas conservée');

  const queuedId = state.queueSartalOfflineAction('customer-awa', 'message', 'Message créé sans réseau');
  assert(getDB().sartalOfflineActions.find(item => item.id === queuedId).status === 'queued', 'Action hors connexion non mise en file');
  const synced = state.syncSartalOfflineActions();
  assert(synced === 1 && getDB().sartalOfflineActions.find(item => item.id === queuedId).status === 'synced', 'Reprise réseau non synchronisée');

  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  ['connexion', 'SartalPulse', 'globalSearchResults', 'operationalNotifications', 'queuedOfflineActions', 'navigator.storage'].forEach(marker => assert(appSource.includes(marker), `Service transversal absent : ${marker}`));
  ['customerMatches', 'supplierMatches', 'employeeMatches', 'pmsMatches', 'orderMatches'].forEach(marker => assert(appSource.includes(marker), `Recherche universelle incomplète : ${marker}`));
  const swSource = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert(swSource.includes('offline.html') && swSource.includes('sartal-stock-v14'), 'Cache PWA hors connexion incomplet');
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert(manifest.start_url === './', 'La PWA ne démarre pas sur le portail de démonstration');
  assert(manifest.shortcuts.some(item => item.short_name === 'Connexion' && item.url.includes('connexion=1')), 'Le Centre d’accès PWA est introuvable');
  assert(manifest.shortcuts.some(item => item.short_name === 'Pulse' && item.url.includes('pilotage=1')), 'Le raccourci PWA Pulse ne rejoint pas le pilotage');
  assert(manifest.shortcuts.some(item => item.short_name === 'Pulse') && manifest.shortcuts.some(item => item.short_name === 'Équipe'), 'Raccourcis PWA incomplets');

  console.log('Plateforme Sártal smoke test: 6 services premium et 31 contrôles validés.');
} finally {
  await server.close();
}
