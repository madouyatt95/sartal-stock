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
  ['Choisissez votre point de vue', 'Pilotage et responsables', 'Équipes opérationnelles', 'Expériences client', 'Direction', 'Manager PMS', 'Réception', 'Manager restaurant', 'Serveur', 'Caissier restaurant', 'Cuisine', 'Gouvernante', 'Responsable stock', 'Finance', 'Client hôtel', 'Client restaurant'].forEach(marker => {
    assert(combinedHtml.includes(marker), `Point de vue complexe hôtelier absent : ${marker}`);
  });

  assert(DEMO_UNIVERSES.length === 6, 'Le portail doit présenter exactement six offres');
  assert(DEMO_UNIVERSES.flatMap(universe => universe.perspectives).length === 92, 'Le portail doit relier exactement 92 points de vue');
  assert(BACKOFFICE_VIEW_IDS.length === 32, 'La matrice doit couvrir les 32 vues du back-office');
  const db = getDB();
  const requiredPerspectives = {
    stock: ['direction', 'responsable-stock', 'magasinier', 'responsable-achats', 'auditeur'],
    'restaurant-stock': ['direction', 'manager-restaurant', 'manager-service', 'serveur', 'caissier', 'cuisine', 'experience-client', 'responsable-stock', 'magasinier', 'responsable-achats', 'auditeur-stock', 'finance', 'crm', 'client-restaurant'],
    'delivery-stock': ['direction-ecommerce', 'responsable-stock', 'responsable-achats', 'auditeur-stock', 'magasinier', 'dispatch', 'preparateur', 'livreur', 'service-client', 'crm', 'finance', 'client-en-ligne'],
    'pms-stock': ['direction-hotel', 'manager-pms', 'responsable-stock', 'responsable-achats', 'auditeur-stock', 'crm', 'reception', 'gouvernante', 'agent-etage', 'maintenance', 'magasinier', 'experience-client', 'controle-nuit', 'finance', 'client-hotel'],
    'pms-restaurant-stock': ['direction', 'manager-pms', 'reception', 'manager-restaurant', 'manager-service', 'serveur', 'caissier', 'cuisine', 'gouvernante', 'agent-etage', 'maintenance', 'responsable-stock', 'magasinier', 'responsable-achats', 'controle-nuit', 'finance', 'auditeur-stock', 'crm', 'experience-client', 'client-hotel', 'client-restaurant'],
    'suite-complete': ['administration', 'direction-generale', 'manager-pms', 'manager-restaurant', 'finance', 'crm', 'responsable-stock', 'responsable-achats', 'controle-nuit', 'auditeur-stock', 'manager-service', 'reception', 'serveur', 'caissier', 'cuisine', 'magasinier', 'preparateur', 'dispatch', 'livreur', 'gouvernante', 'agent-etage', 'maintenance', 'experience-client', 'client-hotel', 'client-sartal']
  };
  const moduleForEmployeeRole = {
    waiter: 'restaurant', cashier: 'restaurant', kitchen: 'restaurant',
    receptionist: 'pms', housekeeper: 'pms', housekeeping_manager: 'pms', maintenance: 'pms', storekeeper: 'stock',
    picker: 'delivery', dispatcher: 'delivery', driver: 'delivery'
  };
  const usedPolicies = new Set();
  DEMO_UNIVERSES.forEach(universe => {
    assert(universe.modules.includes('stock'), `${universe.label} doit inclure le socle stock`);
    assert(universe.perspectives.length >= 5, `${universe.label} manque de points de vue`);
    const ids = new Set(universe.perspectives.map(item => item.id));
    assert(ids.size === universe.perspectives.length, `${universe.label} contient des profils en double`);
    requiredPerspectives[universe.id].forEach(id => assert(ids.has(id), `${universe.label} ne propose pas le profil ${id}`));
    assert(ids.size === requiredPerspectives[universe.id].length, `${universe.label} contient un profil non audité`);
    universe.perspectives.forEach(perspective => {
      const target = perspective.target;
      if (target.type === 'backoffice') {
        const policy = DEMO_ACCESS_POLICIES[target.policy];
        usedPolicies.add(target.policy);
        assert(policy, `${universe.label} / ${perspective.label} n’a pas de politique d’accès`);
        assert(db.users.some(user => user.role === target.role), `${universe.label} / ${perspective.label} n’a pas de compte back-office de démonstration`);
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
        if (policy.pmsTabs?.includes('settings')) assert(['suite_admin', 'pms_manager'].includes(target.policy), `${target.policy} expose les réglages PMS sans responsabilité de configuration`);
      }
      if (target.type === 'employee') {
        const profile = db.employeeProfiles.find(item => item.role === target.role && item.active);
        assert(profile, `${universe.label} / ${perspective.label} n’a pas de profil employé actif`);
        const requiredModule = moduleForEmployeeRole[target.role];
        if (requiredModule) assert(universe.modules.includes(requiredModule), `${universe.label} ouvre ${target.role} sans module ${requiredModule}`);
        if (target.role === 'customer_experience') assert(['restaurant', 'delivery', 'pms'].some(module => universe.modules.includes(module)), `${universe.label} ouvre l’expérience client sans métier client`);
        if (['waiter', 'cashier', 'kitchen'].includes(target.role)) assert(profile.posId && db.posList.some(item => item.id === profile.posId), `${target.role} n’a pas de POS valide`);
        if (['storekeeper', 'picker', 'dispatcher', 'driver'].includes(target.role)) assert(profile.warehouseId && db.warehouses.some(item => item.id === profile.warehouseId), `${target.role} n’a pas de dépôt valide`);
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
  assert(canAccessBackofficeView('pms_manager', ['stock', 'pms'], 'pms'), 'Le manager PMS doit accéder au module hôtel');
  assert(canAccessBackofficeView('pms_manager', ['stock', 'pms'], 'employees'), 'Le manager PMS doit accéder au planning de son équipe');
  assert(!canAccessBackofficeView('pms_manager', ['stock', 'pms'], 'settings'), 'Le manager PMS ne doit pas hériter des réglages administrateur');
  assert(!canAccessBackofficeView('pms_manager', ['stock', 'restaurant', 'pms'], 'answer'), 'Le manager PMS ne doit pas hériter du cockpit restaurant même dans une suite multi-module');
  assert(!canAccessBackofficeView('pos_manager', ['stock', 'restaurant', 'pms'], 'pms'), 'Le manager restaurant ne doit pas devenir manager PMS parce que le module est acheté');
  assert(DEMO_ACCESS_POLICIES.restaurant_manager.views.includes('employees'), 'Le parcours manager restaurant doit proposer Gestion des équipes');
  assert(DEMO_UNIVERSES.find(item => item.id === 'restaurant-stock').perspectives.find(item => item.id === 'manager-restaurant').target.view === 'employees', 'Le manager restaurant doit arriver directement sur le planning de son équipe');
  assert(canAccessBackofficeView('director', ['stock', 'restaurant'], 'finance'), 'La direction restaurant doit accéder au rapprochement financier');
  assert(canAccessBackofficeView('director', ['stock', 'pms'], 'crm'), 'La direction hôtel doit accéder au CRM consenti');
  assert(canAccessBackofficeView('purchasing_manager', ['stock'], 'purchases'), 'Le responsable achats doit accéder aux commandes fournisseurs');
  assert(!canAccessBackofficeView('purchasing_manager', ['stock', 'pms'], 'finance'), 'Le responsable achats ne doit pas accéder aux rapprochements financiers');
  assert(canAccessBackofficeView('finance_manager', ['stock', 'restaurant', 'pms'], 'finance'), 'Le responsable finance doit accéder au rapprochement');
  assert(!canAccessBackofficeView('finance_manager', ['stock', 'restaurant', 'pms'], 'settings'), 'Le responsable finance ne doit pas accéder aux réglages système');
  assert(canAccessBackofficeView('crm_manager', ['stock', 'restaurant'], 'crm'), 'Le responsable CRM doit accéder au pilotage client');
  assert(!canAccessBackofficeView('crm_manager', ['stock', 'restaurant', 'pms'], 'pms'), 'Le responsable CRM ne doit pas exploiter le PMS');
  assert(canAccessBackofficeView('ecommerce_manager', ['stock', 'delivery'], 'delivery'), 'La direction e-commerce doit accéder aux commandes en ligne');
  assert(!canAccessBackofficeView('ecommerce_manager', ['stock', 'delivery', 'pms'], 'pms'), 'La direction e-commerce ne doit pas exploiter le PMS');
  assert(canAccessBackofficeView('night_auditor', ['stock', 'pms'], 'pms'), 'Le contrôleur de nuit doit accéder à la clôture PMS');
  assert(!canAccessBackofficeView('night_auditor', ['stock', 'pms'], 'settings'), 'Le contrôleur de nuit ne doit pas accéder aux réglages système');

  ['stock_direction', 'restaurant_direction', 'delivery_direction', 'hotel_direction', 'complex_direction', 'suite_direction'].forEach(policyId => {
    const policy = DEMO_ACCESS_POLICIES[policyId];
    ['employees', 'products', 'pricing', 'warehouses'].forEach(view => {
      assert(policy.views.includes(view), `${policyId} doit exposer ${view}, inclus dans le socle Stock de l’offre`);
    });
  });
  assert(!canAccessBackofficeView('director', ['stock'], 'delivery'), 'Un module non acheté ne doit jamais être ouvert');

  assert(DEMO_ACCESS_POLICIES.night_audit.initialPmsTab === 'audit', 'Le contrôle de nuit doit démarrer sur la clôture');
  assert(DEMO_ACCESS_POLICIES.pms_manager.initialPmsTab === 'planning', 'Le manager PMS doit démarrer sur le planning hôtelier');
  assert(DEMO_ACCESS_POLICIES.pms_manager.pmsTabs.includes('settings'), 'Le manager PMS doit pouvoir configurer son PMS sans accéder aux réglages système');
  assert(!DEMO_ACCESS_POLICIES.night_audit.pmsTabs.includes('settings'), 'Le contrôle de nuit ne doit jamais ouvrir les réglages PMS');
  assert(!DEMO_ACCESS_POLICIES.complex_restaurant_manager.views.includes('pms'), 'Le manager restaurant ne doit pas hériter du PMS acheté par l’entreprise');

  const targetTypes = new Set(DEMO_UNIVERSES.flatMap(universe => universe.perspectives.map(item => item.target.type)));
  ['backoffice', 'employee', 'client', 'hotel-client'].forEach(type => assert(targetTypes.has(type), `Type d’interface non relié : ${type}`));

  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  ['DemoPortal', "queryParams.get('profil')", "queryParams.get('pilotage')", "queryParams.get('apercu')", "pilotageMode !== '1'", 'DemoExperienceFrame', 'demoBackoffice', 'accessPreviewUser', 'AccessPreviewBar', 'scopeDatabaseForUser', 'enabledModules: demoUniverse.modules', 'canUserAccessBackofficeView', 'demoPolicy.views.includes', 'state={experienceState}'].forEach(marker => {
    assert(appSource.includes(marker), `Routage de démonstration incomplet : ${marker}`);
  });
  assert(appSource.includes('demoRoleUser') && appSource.includes("label: 'Salle & opérations'"), 'Le manager restaurant doit conserver son POS et rejoindre le cockpit de salle');
  const managerSource = readFileSync(new URL('../src/views/ManagerAnswer.tsx', import.meta.url), 'utf8');
  ['RestaurantFloorStudio', 'editable={canOperateRestaurant}', 'Équipes & planning'].forEach(marker => assert(managerSource.includes(marker), `Cockpit manager restaurant incomplet : ${marker}`));
  const floorStudioSource = readFileSync(new URL('../src/components/RestaurantFloorStudio.tsx', import.meta.url), 'utf8');
  ['SALLE EN DIRECT', 'Plan de salle interactif', 'Ouvrir le Studio', 'Studio premium du plan de salle', 'Multi-sélection', 'Fusionner', 'Heatmap', 'Fond de plan', 'Mode tablette', 'Versions & journal'].forEach(marker => assert(floorStudioSource.includes(marker), `Studio de salle incomplet : ${marker}`));

  const accessSource = readFileSync(new URL('../src/views/SartalAccessCenter.tsx', import.meta.url), 'utf8');
  assert(accessSource.includes("navigate('pilotage', '1')"), 'Le centre d’accès ne rejoint pas le pilotage explicite');
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert(manifest.start_url === './', 'La PWA doit démarrer sur le portail de démonstration');
  assert(manifest.shortcuts.some(item => item.short_name === 'Pulse' && item.url.includes('pilotage=1')), 'Le raccourci Pulse ne rejoint pas le pilotage');

  const employeeSource = readFileSync(new URL('../src/views/EmployeeWorkspace.tsx', import.meta.url), 'utf8');
  ['initialRole', 'demoAutoStart', 'Poste de démonstration', 'staff-demo-opening', 'assignedRestaurantOrders', 'RestaurantFloorStudio', 'item.id === employee.posId', 'item.id === employee.warehouseId', 'customerContextAllowed'].forEach(marker => {
    assert(employeeSource.includes(marker), `Accès direct employé incomplet : ${marker}`);
  });

  const clientSource = readFileSync(new URL('../src/views/SartalClient.tsx', import.meta.url), 'utf8');
  ['restaurantEnabled', 'deliveryEnabled', "if (nextMode === 'restaurant' ? !restaurantEnabled : !deliveryEnabled) return"].forEach(marker => {
    assert(clientSource.includes(marker), `Cloisonnement de l’application client incomplet : ${marker}`);
  });
  const pmsSource = readFileSync(new URL('../src/views/PMSHotel.tsx', import.meta.url), 'utf8');
  ['allowedTabs', 'canOpenTab', "canOpenTab('settings')", "canAccessView?.('connectors')", 'PMS_ROLE_TABS', 'pmsWorkspaceRoles', "['director', 'pms_manager', 'finance_manager']"].forEach(marker => {
    assert(pmsSource.includes(marker), `Cloisonnement PMS incomplet : ${marker}`);
  });
  const deliverySource = readFileSync(new URL('../src/views/DeliveryDemo.tsx', import.meta.url), 'utf8');
  ['canManageStockWorkflow', 'canManageDeliveryWorkflow', 'canResetDemoData'].forEach(marker => {
    assert(deliverySource.includes(marker), `Droits du pilotage livraison incomplets : ${marker}`);
  });

  console.log('Portail de démonstration: 6 offres, 92 profils et matrice complète de droits validés.');
} finally {
  await server.close();
}
