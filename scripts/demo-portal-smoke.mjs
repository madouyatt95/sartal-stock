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
  const { DemoPortal } = await server.ssrLoadModule('/src/views/DemoPortal.tsx');
  const { DEMO_ACCESS_POLICIES, DEMO_UNIVERSES } = await server.ssrLoadModule('/src/demoPortalConfig.ts');
  const { BACKOFFICE_VIEW_IDS, canAccessBackofficeView } = await server.ssrLoadModule('/src/accessControl.ts');
  const { getDB } = await server.ssrLoadModule('/src/db.ts');

  const portalHtml = renderToStaticMarkup(React.createElement(DemoPortal));
  ['Choisissez l’univers à découvrir', 'Sártal Stock', 'Restaurant + Stock', 'Vente en ligne + Stock', 'PMS Hôtel + Stock', 'PMS + Restaurant + Stock', 'Suite complète Sártal'].forEach(marker => {
    assert(portalHtml.includes(marker), `Offre absente du portail : ${marker}`);
  });

  const combinedHtml = renderToStaticMarkup(React.createElement(DemoPortal, { initialUniverseId: 'pms-restaurant-stock' }));
  ['Choisissez votre point de vue', 'Direction', 'Réception', 'Manager restaurant', 'Serveur', 'Cuisine', 'Gouvernante', 'Client hôtel', 'Client restaurant'].forEach(marker => {
    assert(combinedHtml.includes(marker), `Point de vue complexe hôtelier absent : ${marker}`);
  });

  assert(DEMO_UNIVERSES.length === 6, 'Le portail doit présenter exactement six offres');
  assert(DEMO_UNIVERSES.flatMap(universe => universe.perspectives).length === 41, 'Le portail doit relier exactement 41 points de vue');
  assert(BACKOFFICE_VIEW_IDS.length === 30, 'La matrice doit couvrir les 30 vues du back-office');
  const db = getDB();
  const moduleForEmployeeRole = {
    waiter: 'restaurant', cashier: 'restaurant', kitchen: 'restaurant',
    receptionist: 'pms', housekeeper: 'pms', storekeeper: 'stock',
    picker: 'delivery', driver: 'delivery'
  };
  const usedPolicies = new Set();
  DEMO_UNIVERSES.forEach(universe => {
    assert(universe.modules.includes('stock'), `${universe.label} doit inclure le socle stock`);
    assert(universe.perspectives.length >= 5, `${universe.label} manque de points de vue`);
    const ids = new Set(universe.perspectives.map(item => item.id));
    assert(ids.size === universe.perspectives.length, `${universe.label} contient des profils en double`);
    universe.perspectives.forEach(perspective => {
      const target = perspective.target;
      if (target.type === 'backoffice') {
        const policy = DEMO_ACCESS_POLICIES[target.policy];
        usedPolicies.add(target.policy);
        assert(policy, `${universe.label} / ${perspective.label} n’a pas de politique d’accès`);
        assert(new Set(policy.views).size === policy.views.length, `${target.policy} contient une vue en double`);
        assert(policy.views.includes(target.view), `${universe.label} / ${perspective.label} ne peut pas ouvrir sa vue initiale`);
        policy.views.forEach(view => {
          assert(BACKOFFICE_VIEW_IDS.includes(view), `${target.policy} référence une vue inconnue : ${view}`);
          assert(canAccessBackofficeView(target.role, universe.modules, view), `${universe.label} / ${perspective.label} contourne la matrice sur ${view}`);
        });
        if (policy.views.includes('pms')) {
          assert(universe.modules.includes('pms'), `${target.policy} ouvre le PMS sans module hôtel`);
          assert(policy.pmsTabs?.length, `${target.policy} n’encadre pas les sous-menus PMS`);
          assert(policy.pmsTabs.includes(policy.initialPmsTab), `${target.policy} ne peut pas ouvrir son onglet PMS initial`);
        }
        if (policy.pmsTabs?.includes('settings')) assert(target.policy === 'suite_admin', `${target.policy} expose les réglages PMS hors administration`);
      }
      if (target.type === 'employee') {
        const profile = db.employeeProfiles.find(item => item.role === target.role && item.active);
        assert(profile, `${universe.label} / ${perspective.label} n’a pas de profil employé actif`);
        const requiredModule = moduleForEmployeeRole[target.role];
        if (requiredModule) assert(universe.modules.includes(requiredModule), `${universe.label} ouvre ${target.role} sans module ${requiredModule}`);
        if (target.role === 'customer_experience') assert(universe.modules.includes('restaurant') || universe.modules.includes('delivery'), `${universe.label} ouvre l’expérience client sans métier client`);
        if (['waiter', 'cashier', 'kitchen'].includes(target.role)) assert(profile.posId && db.posList.some(item => item.id === profile.posId), `${target.role} n’a pas de POS valide`);
        if (['storekeeper', 'picker', 'driver'].includes(target.role)) assert(profile.warehouseId && db.warehouses.some(item => item.id === profile.warehouseId), `${target.role} n’a pas de dépôt valide`);
        assert(profile.siteId && db.sites.some(item => item.id === profile.siteId), `${target.role} n’a pas d’établissement valide`);
      }
      if (target.type === 'client') assert(universe.modules.includes(target.mode), `${universe.label} ouvre le client ${target.mode} sans module actif`);
      if (target.type === 'hotel-client') assert(universe.modules.includes('pms'), `${universe.label} ouvre le client hôtel sans PMS`);
    });
  });

  assert(usedPolicies.size === Object.keys(DEMO_ACCESS_POLICIES).length, 'Chaque profil back-office doit avoir une politique explicite et utilisée');
  assert(canAccessBackofficeView('admin', ['stock', 'restaurant', 'delivery', 'pms'], 'settings'), 'L’administration doit conserver les réglages');
  assert(!canAccessBackofficeView('director', ['stock', 'restaurant', 'delivery', 'pms'], 'settings'), 'La direction ne doit pas hériter des réglages administrateur');
  assert(!canAccessBackofficeView('auditor', ['stock'], 'inventories'), 'L’auditeur ne doit pas lancer un inventaire');
  assert(canAccessBackofficeView('pos_manager', ['stock', 'restaurant'], 'pricing'), 'Le manager restaurant doit pouvoir gérer ses prix');
  assert(canAccessBackofficeView('pos_manager', ['stock', 'restaurant'], 'employees'), 'Le manager restaurant doit accéder aux affectations de son équipe');
  assert(canAccessBackofficeView('stock_manager', ['stock'], 'employees'), 'Le responsable stock doit accéder aux affectations de son équipe');
  assert(DEMO_ACCESS_POLICIES.restaurant_manager.views.includes('employees'), 'Le parcours manager restaurant doit proposer Gestion des équipes');

  ['stock_direction', 'restaurant_direction', 'delivery_direction', 'hotel_direction', 'complex_direction', 'suite_direction'].forEach(policyId => {
    const policy = DEMO_ACCESS_POLICIES[policyId];
    ['employees', 'products', 'pricing', 'warehouses'].forEach(view => {
      assert(policy.views.includes(view), `${policyId} doit exposer ${view}, inclus dans le socle Stock de l’offre`);
    });
  });
  assert(!canAccessBackofficeView('director', ['stock'], 'delivery'), 'Un module non acheté ne doit jamais être ouvert');

  assert(DEMO_ACCESS_POLICIES.night_audit.initialPmsTab === 'audit', 'Le contrôle de nuit doit démarrer sur la clôture');
  assert(!DEMO_ACCESS_POLICIES.night_audit.pmsTabs.includes('settings'), 'Le contrôle de nuit ne doit jamais ouvrir les réglages PMS');
  assert(!DEMO_ACCESS_POLICIES.complex_restaurant_manager.views.includes('pms'), 'Le manager restaurant ne doit pas hériter du PMS acheté par l’entreprise');

  const targetTypes = new Set(DEMO_UNIVERSES.flatMap(universe => universe.perspectives.map(item => item.target.type)));
  ['backoffice', 'employee', 'client', 'hotel-client'].forEach(type => assert(targetTypes.has(type), `Type d’interface non relié : ${type}`));

  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  ['DemoPortal', "queryParams.get('profil')", "queryParams.get('pilotage')", "pilotageMode !== '1'", 'DemoExperienceFrame', 'demoBackoffice', 'enabledModules: demoUniverse.modules', 'canAccessBackofficeView', 'demoPolicy.views.includes', 'state={experienceState}'].forEach(marker => {
    assert(appSource.includes(marker), `Routage de démonstration incomplet : ${marker}`);
  });

  const accessSource = readFileSync(new URL('../src/views/SartalAccessCenter.tsx', import.meta.url), 'utf8');
  assert(accessSource.includes("navigate('pilotage', '1')"), 'Le centre d’accès ne rejoint pas le pilotage explicite');
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert(manifest.start_url === './', 'La PWA doit démarrer sur le portail de démonstration');
  assert(manifest.shortcuts.some(item => item.short_name === 'Pulse' && item.url.includes('pilotage=1')), 'Le raccourci Pulse ne rejoint pas le pilotage');

  const employeeSource = readFileSync(new URL('../src/views/EmployeeWorkspace.tsx', import.meta.url), 'utf8');
  ['initialRole', 'demoAutoStart', 'Poste de démonstration', 'staff-demo-opening', 'assignedRestaurantOrders', 'item.id === employee.posId', 'item.id === employee.warehouseId', 'customerContextAllowed'].forEach(marker => {
    assert(employeeSource.includes(marker), `Accès direct employé incomplet : ${marker}`);
  });

  const clientSource = readFileSync(new URL('../src/views/SartalClient.tsx', import.meta.url), 'utf8');
  ['restaurantEnabled', 'deliveryEnabled', "if (nextMode === 'restaurant' ? !restaurantEnabled : !deliveryEnabled) return"].forEach(marker => {
    assert(clientSource.includes(marker), `Cloisonnement de l’application client incomplet : ${marker}`);
  });
  const pmsSource = readFileSync(new URL('../src/views/PMSHotel.tsx', import.meta.url), 'utf8');
  ['allowedTabs', 'canOpenTab', "canOpenTab('settings')", "canAccessView?.('connectors')", 'pmsWorkspaceRoles'].forEach(marker => {
    assert(pmsSource.includes(marker), `Cloisonnement PMS incomplet : ${marker}`);
  });
  const deliverySource = readFileSync(new URL('../src/views/DeliveryDemo.tsx', import.meta.url), 'utf8');
  ['canManageStockWorkflow', 'canManageDeliveryWorkflow', 'canResetDemoData'].forEach(marker => {
    assert(deliverySource.includes(marker), `Droits du pilotage livraison incomplets : ${marker}`);
  });

  console.log('Portail de démonstration: 6 offres, 41 profils et matrice complète de droits validés.');
} finally {
  await server.close();
}
