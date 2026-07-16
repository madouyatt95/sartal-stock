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

globalThis.window = {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => true,
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis)
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });

try {
  const { useStockState } = await server.ssrLoadModule('/src/hooks/useStockState.ts');
  const { getDB } = await server.ssrLoadModule('/src/db.ts');
  const { AccessGovernanceCenter } = await server.ssrLoadModule('/src/views/AccessGovernanceCenter.tsx');
  const { USER_ROLES, BACKOFFICE_VIEW_IDS, canUserAccessBackofficeView } = await server.ssrLoadModule('/src/accessControl.ts');
  const { FORMULA_OPTIONS, createDefaultUserScope, scopeDatabaseForUser } = await server.ssrLoadModule('/src/accessGovernance.ts');

  let state;
  const Harness = () => {
    state = useStockState();
    return React.createElement(AccessGovernanceCenter, { state });
  };

  const html = renderToStaticMarkup(React.createElement(Harness));
  ['GOUVERNANCE DES ACCÈS', 'Comptes back-office', 'Comptes &amp; périmètres', 'Modèles &amp; droits', 'Mise en service', 'Scénarios &amp; journal', 'Inviter un utilisateur'].forEach(marker => {
    assert(html.includes(marker), `Centre Organisation & accès incomplet : ${marker}`);
  });

  let db = getDB();
  assert(USER_ROLES.length === 12, 'Les 12 rôles spécialisés doivent être déclarés');
  assert(db.accessRoleTemplates.filter(template => template.active).length === USER_ROLES.length, 'Chaque rôle doit posséder un modèle actif');
  USER_ROLES.forEach(role => {
    assert(db.users.some(user => user.role === role), `Compte de démonstration absent pour ${role}`);
    assert(db.accessRoleTemplates.some(template => template.role === role), `Modèle de droits absent pour ${role}`);
  });
  assert(FORMULA_OPTIONS.length === 6, 'Les six offres commerciales doivent être disponibles dans l’onboarding');
  assert(BACKOFFICE_VIEW_IDS.length === 32, 'La gouvernance doit couvrir les 32 interfaces du back-office');

  const purchasing = db.users.find(user => user.role === 'purchasing_manager');
  const finance = db.users.find(user => user.role === 'finance_manager');
  const crm = db.users.find(user => user.role === 'crm_manager');
  const ecommerce = db.users.find(user => user.role === 'ecommerce_manager');
  const night = db.users.find(user => user.role === 'night_auditor');
  assert(canUserAccessBackofficeView(purchasing, db.sartalBrandSettings.enabledModules, 'purchases'), 'Le responsable achats doit ouvrir les achats');
  assert(!canUserAccessBackofficeView(purchasing, db.sartalBrandSettings.enabledModules, 'finance'), 'Le responsable achats ne doit pas ouvrir la finance');
  assert(canUserAccessBackofficeView(finance, db.sartalBrandSettings.enabledModules, 'finance'), 'Le responsable finance doit ouvrir les rapprochements');
  assert(!canUserAccessBackofficeView(finance, db.sartalBrandSettings.enabledModules, 'settings'), 'Le responsable finance ne doit pas ouvrir les réglages');
  assert(canUserAccessBackofficeView(crm, db.sartalBrandSettings.enabledModules, 'crm'), 'Le responsable CRM doit ouvrir le CRM');
  assert(!canUserAccessBackofficeView(crm, db.sartalBrandSettings.enabledModules, 'pms'), 'Le responsable CRM ne doit pas exploiter le PMS');
  assert(canUserAccessBackofficeView(ecommerce, db.sartalBrandSettings.enabledModules, 'delivery'), 'La direction e-commerce doit ouvrir la livraison');
  assert(!canUserAccessBackofficeView(ecommerce, db.sartalBrandSettings.enabledModules, 'pms'), 'La direction e-commerce ne doit pas ouvrir le PMS');
  assert(canUserAccessBackofficeView(night, db.sartalBrandSettings.enabledModules, 'pms'), 'Le contrôleur de nuit doit ouvrir le PMS');
  assert(!canUserAccessBackofficeView(night, db.sartalBrandSettings.enabledModules, 'settings'), 'Le contrôleur de nuit ne doit pas ouvrir les réglages');

  const suspendedFinance = { ...finance, status: 'suspended' };
  assert(!canUserAccessBackofficeView(suspendedFinance, db.sartalBrandSettings.enabledModules, 'finance'), 'Un compte suspendu ne doit ouvrir aucune interface');
  const limitedFinance = { ...finance, allowedViews: ['pulse'] };
  assert(!canUserAccessBackofficeView(limitedFinance, db.sartalBrandSettings.enabledModules, 'finance'), 'Les restrictions individuelles doivent primer sur le modèle');
  const blockedFinance = { ...finance, allowedViews: [] };
  assert(!canUserAccessBackofficeView(blockedFinance, db.sartalBrandSettings.enabledModules, 'finance'), 'Une liste vide d’interfaces doit refuser tout accès');

  const scopedEcommerce = scopeDatabaseForUser(db, ecommerce);
  assert(scopedEcommerce.posList.every(pos => ecommerce.scope.posIds.includes(pos.id)), 'La direction e-commerce voit un POS hors périmètre');
  assert(scopedEcommerce.warehouses.every(warehouse => ecommerce.scope.warehouseIds.includes(warehouse.id)), 'La direction e-commerce voit un dépôt hors périmètre');
  assert(scopedEcommerce.pmsRooms.length === 0, 'Un profil e-commerce ne doit recevoir aucune donnée PMS');
  assert(scopedEcommerce.pmsNightAudits.length === 0 && scopedEcommerce.pmsAuditLogs.length === 0, 'Des données de contrôle PMS restent exposées au profil e-commerce');
  assert(scopedEcommerce.users.length === 1 && scopedEcommerce.users[0].id === ecommerce.id, 'Un profil non dirigeant reçoit le répertoire des comptes back-office');
  const posManager = db.users.find(user => user.role === 'pos_manager');
  const scopedRestaurant = scopeDatabaseForUser(db, posManager);
  assert(scopedRestaurant.posList.length === 1 && scopedRestaurant.posList[0].id === posManager.posId, 'Le manager restaurant doit rester isolé sur son POS');
  assert(posManager.scope.warehouseIds.includes(scopedRestaurant.posList[0].defaultWarehouseId), 'Le manager restaurant doit hériter du dépôt de son POS');
  assert(scopedRestaurant.stocks.every(stock => posManager.scope.warehouseIds.includes(stock.warehouseId)), 'Le manager restaurant voit un stock hors dépôt');

  const originalDatabase = localStorage.getItem('sartal_stock_db');
  state.changeCurrentUser('user-director');
  let directorBlockedFromAdmin = false;
  try {
    state.recordAccessPreview('user-admin');
  } catch {
    directorBlockedFromAdmin = true;
  }
  assert(directorBlockedFromAdmin, 'La direction ne doit pas prévisualiser un compte Administrateur');
  directorBlockedFromAdmin = false;
  try {
    state.updateBackofficeUserStatus('user-admin', 'suspended');
  } catch {
    directorBlockedFromAdmin = true;
  }
  assert(directorBlockedFromAdmin, 'La direction ne doit pas modifier le statut d’un Administrateur');
  state.changeCurrentUser('user-admin');
  db = getDB();
  const template = db.accessRoleTemplates.find(item => item.role === 'pos_manager');
  const restaurantPOS = db.posList.find(pos => pos.id === 'pos-1');
  const scope = createDefaultUserScope('pos_manager', {
    companyId: db.companies[0].id,
    siteIds: db.sites.map(site => site.id),
    posIds: db.posList.map(pos => pos.id),
    warehouseIds: db.warehouses.map(warehouse => warehouse.id),
    enabledModules: db.sartalBrandSettings.enabledModules,
    preferredSiteId: restaurantPOS.siteId,
    preferredPosId: restaurantPOS.id,
    preferredWarehouseId: restaurantPOS.defaultWarehouseId
  });
  const testUserId = state.saveBackofficeUser({
    name: 'Manager Restaurant Test',
    email: 'manager.test@sartal.sn',
    phone: '+221 77 000 11 22',
    role: 'pos_manager',
    status: 'invited',
    roleTemplateId: template.id,
    scope,
    allowedViews: template.viewIds
  });
  db = getDB();
  assert(db.users.some(user => user.id === testUserId && user.status === 'invited'), 'L’invitation avec périmètre n’est pas persistée');
  assert(db.accessAuditEvents.some(event => event.action === 'invite' && event.targetId === testUserId), 'La création d’invitation n’est pas auditée');
  state.updateBackofficeUserStatus(testUserId, 'active');
  state.recordAccessPreview(testUserId);
  db = getDB();
  assert(db.accessAuditEvents.some(event => event.action === 'preview_opened' && event.targetId === testUserId), 'Le test en lecture seule n’est pas audité');
  state.updateBackofficeUserStatus(testUserId, 'suspended');
  const suspendedUser = getDB().users.find(user => user.id === testUserId);
  assert(!canUserAccessBackofficeView(suspendedUser, getDB().sartalBrandSettings.enabledModules, 'employees'), 'La suspension ne coupe pas immédiatement l’accès');

  const purchasingTemplate = getDB().accessRoleTemplates.find(item => item.role === 'purchasing_manager');
  state.saveAccessRoleTemplate({ ...purchasingTemplate, description: 'Achats, fournisseurs, coûts et disponibilité matière contrôlés.' });
  assert(getDB().accessRoleTemplates.find(item => item.id === purchasingTemplate.id).description.includes('disponibilité matière'), 'Le modèle de rôle modifié n’est pas persisté');
  assert(getDB().accessAuditEvents.some(event => event.action === 'rights_updated' && event.targetId === purchasingTemplate.id), 'La modification du modèle n’est pas auditée');

  state.completeAccessOnboarding({ formulaId: 'pms-restaurant-stock', siteIds: ['site-1'], adminName: 'Admin Déploiement', adminEmail: 'deploiement@sartal.sn' });
  const deployed = getDB();
  assert(deployed.sartalBrandSettings.subscriptionFormula === 'pms-restaurant-stock', 'La formule choisie par l’onboarding n’est pas enregistrée');
  assert(deployed.sartalBrandSettings.enabledModules.join(',') === 'stock,restaurant,pms', 'Les modules de la formule ne sont pas appliqués');
  assert(deployed.currentUser.email === 'deploiement@sartal.sn', 'Le compte responsable n’est pas finalisé');
  assert(deployed.accessAuditEvents.some(event => event.action === 'onboarding_completed'), 'La mise en service n’est pas auditée');
  localStorage.setItem('sartal_stock_db', originalDatabase);

  const source = readFileSync(new URL('../src/views/AccessGovernanceCenter.tsx', import.meta.url), 'utf8');
  ['Contrôle automatique des profils', 'saveBackofficeUser', 'updateBackofficeUserStatus', 'saveAccessRoleTemplate', 'recordAccessPreview', 'completeAccessOnboarding', 'runSartalCommercialScenario', 'advancePMSDayScenario', 'accessAuditEvents', 'pmsAuditLogs', 'restaurantFloorAudit', 'employeeApprovals', 'movements'].forEach(marker => {
    assert(source.includes(marker), `Fonction de gouvernance non reliée : ${marker}`);
  });
  assert(!/<button(?![^>]*\btype=)/.test(source), 'Un bouton du centre d’accès peut soumettre un formulaire ou quitter le parcours');
  const deliverySource = readFileSync(new URL('../src/views/DeliveryDemo.tsx', import.meta.url), 'utf8');
  assert(deliverySource.includes("['admin', 'ecommerce_manager'].includes(db.currentUser.role)"), 'La direction e-commerce doit pouvoir piloter son workflow sans rôle Administrateur');

  console.log('Organisation & accès: 12 rôles, 6 offres, périmètres, aperçu, onboarding et journal unifié validés.');
} finally {
  await server.close();
}
