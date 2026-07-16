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

let databaseUpdateEvents = 0;
globalThis.window = {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: event => {
    if (event.type === 'sartal-db-updated') databaseUpdateEvents += 1;
    return true;
  },
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis)
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });

try {
  const { useStockState } = await server.ssrLoadModule('/src/hooks/useStockState.ts');
  const { getDB, saveDB } = await server.ssrLoadModule('/src/db.ts');
  const { EmployeeWorkspace } = await server.ssrLoadModule('/src/views/EmployeeWorkspace.tsx');
  const { TeamManagement } = await server.ssrLoadModule('/src/views/TeamManagement.tsx');
  const { RestaurantFloorStudio } = await server.ssrLoadModule('/src/components/RestaurantFloorStudio.tsx');
  const { getRestaurantProductAvailability, getRestaurantTableSuggestions } = await server.ssrLoadModule('/src/utils/restaurantService.ts');
  const { inferRestaurantProductRouting } = await server.ssrLoadModule('/src/utils/restaurantRouting.ts');
  const { getDefaultEmployeePermissions } = await server.ssrLoadModule('/src/employeePermissions.ts');
  let state;
  const Harness = () => {
    state = useStockState();
    return React.createElement(EmployeeWorkspace, { state });
  };

  const html = renderToStaticMarkup(React.createElement(Harness));
  ['SÁRTAL ÉQUIPE', 'Accès de démonstration', 'Code démo : 2468', 'Serveur / Chef de rang', 'Cuisine / KDS', 'Réceptionniste hôtel', 'Gouvernante', 'Responsable dispatch', 'Technicien maintenance', 'Préparateur livraison', 'Manager de service'].forEach(marker => {
    assert(html.includes(marker), `Interface employé incomplète : ${marker}`);
  });
  const teamHtml = renderToStaticMarkup(React.createElement(TeamManagement, { state }));
  ['Les bonnes personnes, au bon poste', 'Répertoire des collaborateurs', 'Ajouter un collaborateur'].forEach(marker => assert(teamHtml.includes(marker), `Centre de gestion des équipes incomplet : ${marker}`));
  const floorHtml = renderToStaticMarkup(React.createElement(RestaurantFloorStudio, { state, posId: 'pos-1', editable: true }));
  ['Plan de salle interactif', 'Ouvrir le Studio', 'T12', 'Addition'].forEach(marker => assert(floorHtml.includes(marker), `Plan de salle manager incomplet : ${marker}`));
  const floorSource = readFileSync(new URL('../src/components/RestaurantFloorStudio.tsx', import.meta.url), 'utf8');
  const orderPanelSource = readFileSync(new URL('../src/components/RestaurantTableOrderPanel.tsx', import.meta.url), 'utf8');
  const paymentPanelSource = readFileSync(new URL('../src/components/RestaurantTablePaymentPanel.tsx', import.meta.url), 'utf8');
  const serviceModalSource = readFileSync(new URL('../src/components/RestaurantTableServiceModal.tsx', import.meta.url), 'utf8');
  ['ELEMENT_CATALOG', 'Annuler', 'Magnétisme', 'Multi-sélection', 'chevauchement', 'Fusionner', 'Placement assisté', 'RADAR DU SERVICE', 'Mode coup de feu', 'Heatmap', 'Brouillon', 'Publier', 'Journal d’audit', 'Fond de plan', 'Mode tablette'].forEach(marker => {
    assert(floorSource.includes(marker), `Expérience Studio premium incomplète : ${marker}`);
  });
  ['Synthèse', 'Commande', 'Addition', 'Client', 'Historique', 'Installer et commander', 'Installer et prendre la commande', 'Transférer', 'RestaurantTablePaymentPanel'].forEach(marker => assert(serviceModalSource.includes(marker), `Fenêtre unifiée de table incomplète : ${marker}`));
  ['PRISE DE COMMANDE', 'Convive', 'Garder par service', 'Envoyer maintenant', 'Ticket en direct', 'getRestaurantProductAvailability', 'Alternative', 'operationRef', 'submittingRef', 'item.itemIds.join', 'requestEmployeeApproval', 'Automatique', 'Commande routée', 'RESTAURANT_STATION_LABELS'].forEach(marker => assert(orderPanelSource.includes(marker), `Commande tactile incomplète : ${marker}`));
  ['RestaurantTableServiceModal', 'selectTable', "setServiceTab('bill')", 'initialTab={serviceTab}'].forEach(marker => assert(floorSource.includes(marker), `Parcours table vers fenêtre unifiée incomplet : ${marker}`));
  ['restaurant-table-modal-backdrop', 'Encaisser à table', 'RestaurantTablePaymentPanel'].forEach(marker => assert(serviceModalSource.includes(marker), `Fenêtre d’action de table incomplète : ${marker}`));
  ['ENCAISSEMENT À TABLE', 'Activer la caisse de service', 'Convives', 'Articles', 'Parts égales', 'operationId', 'collectingRef', "readOnly={allocationMode !== 'free'}", 'pay_at_table'].forEach(marker => assert(paymentPanelSource.includes(marker), `Encaissement serveur incomplet : ${marker}`));
  assert(!/<button(?![^>]*\btype=)/.test(floorSource), 'Un bouton du plan de salle peut encore soumettre la page et perdre les paramètres de démonstration');
  assert(!/<button(?![^>]*\btype=)/.test(orderPanelSource), 'Un bouton de prise de commande peut encore soumettre la page et quitter le profil');
  assert(!/<button(?![^>]*\btype=)/.test(paymentPanelSource), 'Un bouton d’encaissement peut encore soumettre la page et quitter le profil');
  assert(!/<button(?![^>]*\btype=)/.test(serviceModalSource), 'Un bouton de la fenêtre unifiée peut encore soumettre la page et quitter le profil');
  const employeeSource = readFileSync(new URL('../src/views/EmployeeWorkspace.tsx', import.meta.url), 'utf8');
  const teamSource = readFileSync(new URL('../src/views/TeamManagement.tsx', import.meta.url), 'utf8');
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert(!employeeSource.includes('setView('), 'Sártal Équipe ne doit jamais ouvrir une vue du back-office');
  ['Collaborateurs', 'Affectations', 'Planning de l’équipe', 'Planifier un service', 'Droits & validations', 'Services & passations', 'Aperçu des postes'].forEach(marker => assert(teamSource.includes(marker), `Gestion des équipes incomplète : ${marker}`));
  ['team-planning-command', 'team-planning-matrix', 'team-planning-mobile-agenda', 'Couverture des services', 'Poste de pilotage', 'Copier la semaine précédente', 'Publier la semaine', 'team-role-coverage'].forEach(marker => assert(teamSource.includes(marker), `Planning manager incomplet : ${marker}`));
  assert(appSource.includes('Retour aux profils') && appSource.includes('Retour aux espaces'), 'Retour explicite absent des espaces de démonstration ou de connexion');
  ['Arrivées & séjours', 'Nouvelle réservation', 'RÉSERVATION SUR PLACE', 'État des chambres', 'Réceptions', 'Transferts', 'Inventaire', 'Journal'].forEach(marker => assert(employeeSource.includes(marker), `Poste employé autonome incomplet : ${marker}`));
  ['ASSISTANT DE SALLE', 'CONTRÔLE EN CONTINU', 'PILOTAGE KDS', 'ARRIVÉE SANS FRICTION', 'TOURNÉE OPTIMISÉE', 'STOCK PRÉDICTIF', 'PICKING SANS ERREUR', 'TOURNÉE ASSISTÉE', 'CLIENT 360°', 'CHEF D’ORCHESTRE DU SERVICE'].forEach(marker => {
    assert(employeeSource.includes(marker), `Assistant métier absent : ${marker}`);
  });
  ['Mon quotidien', 'Mon planning', "id: 'schedule'", 'Voir tout mon planning avant de commencer', 'RestaurantFloorStudio', 'staff-manager-floor', 'Ma progression', 'Aide et services', 'Ma passation', 'Accepter puis transmettre', 'QUALITÉ DU SERVICE ET DU TRAVAIL'].forEach(marker => {
    assert(employeeSource.includes(marker), `Expérience collaborateur incomplète : ${marker}`);
  });
  ['staff-planning-hero', 'staff-week-strip', 'Détail de mes services', 'staff-planning-scope', 'staff-team-planning-grid', 'Planning équipe', 'staff-dispatch-layout', 'staff-maintenance-layout', 'staff-housekeeping-quality', 'staff-reception-payment'].forEach(marker => assert(employeeSource.includes(marker), `Poste opérationnel premium incomplet : ${marker}`));
  ['PRODUCTION EN TEMPS RÉEL', 'Supervision', 'Bar / boissons', 'Desserts', 'Contrôler et appeler', 'updateRestaurantStationTicket', 'confirmRestaurantPassTicket'].forEach(marker => assert(employeeSource.includes(marker), `KDS premium incomplet : ${marker}`));
  ['updateRestaurantOrderItemStatus', 'confirmRestaurantPassItem', 'setRestaurantIngredientAvailability', 'Mode entraînement', 'housekeepingChecks', 'pickedLineIds', 'schedulePMSNotification', 'processSale', 'requestEmployeeApproval'].forEach(marker => {
    assert(employeeSource.includes(marker), `Action game changer non câblée : ${marker}`);
  });

  let db = getDB();
  databaseUpdateEvents = 0;
  getDB();
  assert(databaseUpdateEvents === 0, 'Une simple lecture de la base redéclenche une actualisation récursive');
  saveDB(getDB());
  assert(databaseUpdateEvents === 1, 'Une écriture doit émettre exactement un événement de synchronisation');
  const roles = new Set(db.employeeProfiles.map(item => item.role));
  ['waiter', 'cashier', 'kitchen', 'receptionist', 'housekeeper', 'housekeeping_manager', 'storekeeper', 'picker', 'dispatcher', 'driver', 'maintenance', 'customer_experience', 'service_manager'].forEach(role => {
    assert(roles.has(role), `Profil métier absent : ${role}`);
  });
  assert(getDefaultEmployeePermissions('housekeeper').includes('housekeeping_validation') === false, 'L’agent d’étage ne doit pas valider sa propre chambre');
  assert(getDefaultEmployeePermissions('housekeeping_manager').includes('housekeeping_validation'), 'La gouvernante doit pouvoir valider une chambre');
  assert(getDefaultEmployeePermissions('dispatcher').includes('delivery_dispatch'), 'Le dispatch doit pouvoir affecter une tournée');
  assert(getDefaultEmployeePermissions('maintenance').includes('maintenance_update'), 'Le technicien doit pouvoir documenter une intervention');
  assert(getDefaultEmployeePermissions('waiter').includes('team_schedule_view'), 'Le salarié doit pouvoir consulter le planning publié de son équipe par défaut');
  assert(db.products.every(product => product.restaurantStation && product.restaurantCourse && product.preparationMinutes > 0), 'Le routage KDS explicite manque sur certains produits');
  assert(inferRestaurantProductRouting(db.products.find(product => product.id === 'prod-coca')).station === 'drinks', 'Le Coca-Cola ne doit jamais être routé vers la cuisine');
  assert(inferRestaurantProductRouting(db.products.find(product => product.id === 'prod-yassa-poulet')).station === 'kitchen', 'Le Yassa doit être routé vers la cuisine');
  ['housekeeping_manager', 'dispatcher', 'maintenance'].forEach(role => {
    const profile = db.employeeProfiles.find(item => item.role === role && item.active);
    assert(db.employeeSchedules.some(schedule => schedule.employeeId === profile.id), `Le profil ${role} doit disposer d’un vrai planning visible`);
  });
  ['employeeShifts', 'employeeHandovers', 'employeeMessages', 'employeeApprovals', 'employeeSchedules', 'employeeWellbeingCheckIns', 'employeeSupportRequests', 'employeeBreaks', 'employeeRecognitions', 'employeeLearningModules', 'restaurantFloorElements', 'restaurantFloorPlanSettings', 'restaurantFloorPlanVersions', 'restaurantFloorAudit', 'restaurantServiceSections', 'restaurantServiceIncidents', 'restaurantTrainingRuns'].forEach(collection => {
    assert(Array.isArray(db[collection]), `Collection équipe absente : ${collection}`);
  });
  assert(db.restaurantFloorElements.length === 1 && db.restaurantFloorElements[0].type === 'door' && db.restaurantFloorElements[0].label === 'Entrée', 'Le plan initial doit conserver uniquement l’entrée');

  const originalDatabase = localStorage.getItem('sartal_stock_db');
  const legacyFloor = structuredClone(db);
  delete legacyFloor.restaurantDemoRevision;
  const entrance = legacyFloor.restaurantFloorElements[0];
  const retiredWall = { ...entrance, id: `floor-${entrance.posId}-wall-north`, type: 'wall', label: 'Mur principal' };
  legacyFloor.restaurantFloorElements.push(retiredWall);
  legacyFloor.restaurantFloorPlanVersions[0].elements.push(structuredClone(retiredWall));
  legacyFloor.restaurantGuestOrders = legacyFloor.restaurantGuestOrders.map(order => ({ ...order, status: 'paid', paymentStatus: 'paid' }));
  legacyFloor.restaurantReservations = legacyFloor.restaurantReservations.map(reservation => ({ ...reservation, status: 'cancelled' }));
  localStorage.setItem('sartal_stock_db', JSON.stringify(legacyFloor));
  const repairedFloor = getDB();
  assert(repairedFloor.restaurantDemoRevision === 1, 'La révision de démonstration de salle n’est pas appliquée');
  assert(!repairedFloor.restaurantFloorElements.some(element => element.id === retiredWall.id), 'Un ancien mur encombrant reste visible après migration');
  assert(!repairedFloor.restaurantFloorPlanVersions.some(version => version.elements.some(element => element.id === retiredWall.id)), 'Une ancienne version peut réintroduire les éléments encombrants');
  assert(repairedFloor.restaurantGuestOrders.some(order => !['paid', 'cancelled'].includes(order.status)), 'Une ancienne salle entièrement libre n’est pas préparée pour la démonstration');
  localStorage.setItem('sartal_stock_db', originalDatabase);

  const temporaryEmployeeId = state.saveEmployeeProfile({ employeeNumber: 'SAL-999', name: 'Profil Test Équipe', role: 'waiter', siteId: 'site-1', phone: '+221 70 000 09 99', posId: 'pos-1', active: true });
  assert(getDB().employeeProfiles.some(item => item.id === temporaryEmployeeId && item.posId === 'pos-1'), 'Création ou affectation employé non conservée');
  const alternatePosId = getDB().posList.find(item => item.siteId === 'site-1' && item.id !== 'pos-1')?.id || 'pos-1';
  state.saveEmployeeProfile({ ...getDB().employeeProfiles.find(item => item.id === temporaryEmployeeId), phone: '+221 70 000 10 00', posId: alternatePosId });
  assert(getDB().employeeProfiles.find(item => item.id === temporaryEmployeeId).posId === alternatePosId, 'Modification d’affectation employé non conservée');
  state.updateEmployeePermissions(temporaryEmployeeId, ['team_messages', 'discount_request']);
  assert(getDB().employeeProfiles.find(item => item.id === temporaryEmployeeId).permissions.join(',') === 'team_messages,discount_request', 'Droits individuels employé non conservés');
  state.deleteEmployeeProfile(temporaryEmployeeId);
  assert(!getDB().employeeProfiles.some(item => item.id === temporaryEmployeeId), 'Suppression d’un profil sans historique impossible');
  const outsideEmployeeId = state.saveEmployeeProfile({ employeeNumber: 'SAL-998', name: 'Serveur Autre POS', role: 'waiter', siteId: 'site-1', phone: '+221 70 000 09 98', posId: alternatePosId, active: true });

  const waiter = db.employeeProfiles.find(item => item.role === 'waiter');
  const planningDate = new Date();
  planningDate.setDate(planningDate.getDate() + 10);
  const planningDateKey = planningDate.toISOString().slice(0, 10);
  state.changeCurrentUser('user-pos-mgr');
  let outsideScheduleBlocked = false;
  try {
    state.saveEmployeeSchedule({ employeeId: outsideEmployeeId, siteId: 'site-1', date: planningDateKey, startTime: '09:00', endTime: '17:00', assignmentLabel: 'Autre point de vente', status: 'confirmed' }, 'user-pos-mgr');
  } catch {
    outsideScheduleBlocked = true;
  }
  assert(outsideScheduleBlocked, 'Le manager restaurant ne doit pas planifier un employé d’un autre POS');
  const temporaryTableId = state.saveRestaurantDiningTable({ posId: 'pos-1', label: 'T99', capacity: 4, shape: 'square', floor: 'RDC', zone: 'Salle test', x: 50, y: 50, rotation: 0, active: true });
  assert(getDB().restaurantDiningTables.some(item => item.id === temporaryTableId && item.label === 'T99'), 'Le manager restaurant ne peut pas ajouter une table au Studio');
  state.saveRestaurantDiningTable({ ...getDB().restaurantDiningTables.find(item => item.id === temporaryTableId), x: 72, y: 38, rotation: 45 });
  assert(getDB().restaurantDiningTables.find(item => item.id === temporaryTableId)?.x === 72, 'Le déplacement d’une table du Studio n’est pas conservé');
  state.deleteRestaurantDiningTable(temporaryTableId);
  assert(!getDB().restaurantDiningTables.some(item => item.id === temporaryTableId), 'Le manager restaurant ne peut pas retirer une table libre');

  const floorBeforeDraft = getDB();
  const liveTablesBeforeDraft = JSON.stringify(floorBeforeDraft.restaurantDiningTables.filter(item => item.posId === 'pos-1'));
  const floorPayload = {
    posId: 'pos-1',
    label: 'Organisation test premium',
    tables: structuredClone(floorBeforeDraft.restaurantDiningTables.filter(item => item.posId === 'pos-1')),
    elements: structuredClone(floorBeforeDraft.restaurantFloorElements.filter(item => item.posId === 'pos-1')),
    settings: structuredClone(floorBeforeDraft.restaurantFloorPlanSettings.find(item => item.posId === 'pos-1'))
  };
  const draftPlanId = state.saveRestaurantFloorPlanDraft(floorPayload);
  assert(getDB().restaurantFloorPlanVersions.find(item => item.id === draftPlanId)?.status === 'draft', 'Le brouillon du Studio n’est pas versionné');
  assert(JSON.stringify(getDB().restaurantDiningTables.filter(item => item.posId === 'pos-1')) === liveTablesBeforeDraft, 'Un brouillon ne doit jamais modifier la salle publiée');
  state.deleteRestaurantFloorPlanVersion(draftPlanId);
  assert(!getDB().restaurantFloorPlanVersions.some(item => item.id === draftPlanId), 'Le brouillon du Studio ne peut pas être supprimé');
  assert(getDB().restaurantFloorAudit.some(item => item.action === 'draft_deleted'), 'La suppression du brouillon n’est pas auditée');

  const collidingPayload = structuredClone(floorPayload);
  collidingPayload.tables[1].x = collidingPayload.tables[0].x;
  collidingPayload.tables[1].y = collidingPayload.tables[0].y;
  let collisionBlocked = false;
  try {
    state.publishRestaurantFloorPlan(collidingPayload);
  } catch {
    collisionBlocked = true;
  }
  assert(collisionBlocked, 'La publication doit bloquer les tables qui se chevauchent');

  const architecturalCollisionPayload = structuredClone(floorPayload);
  architecturalCollisionPayload.elements[0].x = architecturalCollisionPayload.tables[0].x;
  architecturalCollisionPayload.elements[0].y = architecturalCollisionPayload.tables[0].y;
  let architecturalCollisionBlocked = false;
  try {
    state.publishRestaurantFloorPlan(architecturalCollisionPayload);
  } catch {
    architecturalCollisionBlocked = true;
  }
  assert(architecturalCollisionBlocked, 'La publication doit bloquer une table posée sur un élément architectural');

  const versionToRestore = getDB().restaurantFloorPlanVersions.find(item => item.posId === 'pos-1' && item.status === 'published');
  const publishedPlanId = state.publishRestaurantFloorPlan(floorPayload);
  assert(getDB().restaurantFloorPlanVersions.find(item => item.id === publishedPlanId)?.status === 'published', 'Le plan validé n’est pas publié');
  assert(getDB().restaurantFloorAudit.some(item => item.action === 'published' && item.metadata?.versionId === publishedPlanId), 'La publication du plan n’est pas auditée');
  const restoredPlanId = state.restoreRestaurantFloorPlanVersion(versionToRestore.id);
  assert(getDB().restaurantFloorPlanVersions.find(item => item.id === restoredPlanId)?.status === 'published', 'La restauration ne recrée pas une version publiée');
  assert(getDB().restaurantFloorAudit.some(item => item.action === 'restored' && item.metadata?.versionId === restoredPlanId), 'La restauration du plan n’est pas auditée');

  state.changeCurrentUser('user-admin');
  const secondaryRestaurantName = `Restaurant test multi-POS ${Date.now()}`;
  state.addPOS(secondaryRestaurantName, 'restaurant', 'wh-restaurant');
  const secondaryRestaurant = getDB().posList.find(item => item.name === secondaryRestaurantName);
  const secondaryTableId = state.saveRestaurantDiningTable({ posId: secondaryRestaurant.id, label: 'S01', capacity: 2, shape: 'round', floor: 'RDC', zone: 'Salle secondaire', x: 50, y: 50, rotation: 0, active: true });
  state.changeCurrentUser('user-pos-mgr');
  state.publishRestaurantFloorPlan({ ...floorPayload, label: 'Contrôle isolation multi-POS' });
  assert(getDB().restaurantDiningTables.some(item => item.id === secondaryTableId && item.posId === secondaryRestaurant.id), 'Publier un restaurant ne doit pas effacer le plan d’un autre POS');
  state.changeCurrentUser('user-admin');
  state.deleteRestaurantDiningTable(secondaryTableId);
  state.deletePOS(secondaryRestaurant.id);
  state.changeCurrentUser('user-pos-mgr');

  const plannedServiceId = state.saveEmployeeSchedule({ employeeId: waiter.id, siteId: waiter.siteId, date: planningDateKey, startTime: '10:00', endTime: '18:00', assignmentLabel: 'Restaurant La Terrasse · Salle principale', status: 'confirmed' }, 'user-pos-mgr');
  assert(getDB().employeeSchedules.some(item => item.id === plannedServiceId && item.status === 'confirmed'), 'Le manager restaurant ne peut pas créer un service');
  state.saveEmployeeSchedule({ id: plannedServiceId, employeeId: waiter.id, siteId: waiter.siteId, date: planningDateKey, startTime: '11:00', endTime: '19:00', assignmentLabel: 'Restaurant La Terrasse · Terrasse', status: 'confirmed' }, 'user-pos-mgr');
  assert(getDB().employeeSchedules.find(item => item.id === plannedServiceId)?.startTime === '11:00', 'Le manager restaurant ne peut pas modifier un service');
  let overlappingScheduleBlocked = false;
  try {
    state.saveEmployeeSchedule({ employeeId: waiter.id, siteId: waiter.siteId, date: planningDateKey, startTime: '18:00', endTime: '20:00', assignmentLabel: 'Restaurant La Terrasse', status: 'confirmed' }, 'user-pos-mgr');
  } catch {
    overlappingScheduleBlocked = true;
  }
  assert(overlappingScheduleBlocked, 'Deux services qui se chevauchent ne doivent pas être acceptés');
  const sourceWeekDate = new Date(`${planningDateKey}T12:00:00`);
  sourceWeekDate.setDate(sourceWeekDate.getDate() - ((sourceWeekDate.getDay() || 7) - 1));
  const sourceWeekKey = sourceWeekDate.toISOString().slice(0, 10);
  const targetWeekDate = new Date(sourceWeekDate);
  targetWeekDate.setDate(targetWeekDate.getDate() + 7);
  const targetWeekKey = targetWeekDate.toISOString().slice(0, 10);
  const copiedWeek = state.copyEmployeeScheduleWeek(sourceWeekKey, targetWeekKey, 'user-pos-mgr');
  assert(copiedWeek.created > 0, 'La copie de semaine manager ne crée aucun brouillon');
  const copiedScheduleIds = getDB().employeeSchedules.filter(item => item.date >= targetWeekKey && item.date <= new Date(targetWeekDate.getTime() + 6 * 86400000).toISOString().slice(0, 10) && item.status === 'planned' && getDB().employeeProfiles.some(profile => profile.id === item.employeeId && profile.posId === 'pos-1' && ['waiter', 'cashier', 'kitchen'].includes(profile.role))).map(item => item.id);
  assert(copiedScheduleIds.length > 0, 'Les services copiés ne sont pas conservés comme brouillons');
  state.publishEmployeeScheduleWeek(copiedScheduleIds, 'user-pos-mgr');
  assert(getDB().employeeSchedules.filter(item => copiedScheduleIds.includes(item.id)).every(item => item.status === 'confirmed'), 'La publication groupée du planning ne confirme pas les services');
  state.deleteEmployeeSchedule(plannedServiceId, 'user-pos-mgr');
  assert(!getDB().employeeSchedules.some(item => item.id === plannedServiceId), 'Le manager restaurant ne peut pas retirer un service futur');
  state.changeCurrentUser('user-admin');
  state.deleteEmployeeProfile(outsideEmployeeId);
  const shiftId = state.startEmployeeShift(waiter.id, waiter.posId, 'Tablette de service');
  db = getDB();
  assert(db.employeeShifts.find(item => item.id === shiftId)?.status === 'open', 'Prise de service non enregistrée');
  assert(db.employeeShifts.find(item => item.id === shiftId)?.assignmentLabel.includes('Restaurant'), 'Affectation POS non résolue');

  const checkInId = state.submitEmployeeWellbeingCheckIn({ employeeId: waiter.id, shiftId, energy: 3, workload: 'busy', note: 'Service test soutenu.' });
  assert(getDB().employeeWellbeingCheckIns.find(item => item.id === checkInId)?.workload === 'busy', 'Ressenti de prise de service non conservé');
  const breakId = state.startEmployeeBreak(waiter.id, shiftId, 'rest');
  assert(getDB().employeeBreaks.find(item => item.id === breakId)?.status === 'started', 'Début de pause non conservé');
  state.completeEmployeeBreak(breakId, waiter.id);
  assert(getDB().employeeBreaks.find(item => item.id === breakId)?.status === 'completed', 'Fin de pause non conservée');
  state.updateEmployeeExperience(waiter.id, { preferences: { highContrast: true, language: 'wo' }, careerGoal: 'Devenir chef de rang test' });
  assert(getDB().employeeProfiles.find(item => item.id === waiter.id)?.experiencePreferences?.language === 'wo', 'Préférences personnelles non conservées');
  assert(getDB().employeeProfiles.find(item => item.id === waiter.id)?.careerGoal === 'Devenir chef de rang test', 'Objectif professionnel non conservé');
  const learning = getDB().employeeLearningModules.find(item => item.roles.includes('all') || item.roles.includes(waiter.role));
  state.completeEmployeeLearning(waiter.id, learning.id);
  assert(getDB().employeeLearningModules.find(item => item.id === learning.id)?.completedByEmployeeIds.includes(waiter.id), 'Capsule de progression non validée');

  const trainingOperationalSnapshot = JSON.stringify({ stocks: getDB().stocks, movements: getDB().movements, externalSales: getDB().externalSales, cashSessions: getDB().cashSessions });
  const trainingRunId = state.startRestaurantTrainingScenario(waiter.id, waiter.posId, 'allergy');
  for (let step = 0; step < 4; step += 1) state.advanceRestaurantTrainingRun(trainingRunId, waiter.name);
  assert(getDB().restaurantTrainingRuns.find(item => item.id === trainingRunId)?.status === 'completed', 'Scénario d’entraînement non terminable');
  assert(JSON.stringify({ stocks: getDB().stocks, movements: getDB().movements, externalSales: getDB().externalSales, cashSessions: getDB().cashSessions }) === trainingOperationalSnapshot, 'Le mode entraînement a modifié le stock, les ventes ou la caisse');

  const pendingHandover = db.employeeHandovers.find(item => item.role === 'waiter' && item.status === 'submitted');
  state.acknowledgeEmployeeHandover(pendingHandover.id, waiter.id);
  assert(getDB().employeeHandovers.find(item => item.id === pendingHandover.id).status === 'acknowledged', 'Reprise de passation non confirmée');

  const messageId = state.sendEmployeeMessage({ siteId: waiter.siteId, senderId: waiter.id, senderName: `${waiter.name} · Salle`, audience: 'kitchen', content: 'Table test prête à suivre.', priority: 'urgent' });
  const kitchen = getDB().employeeProfiles.find(item => item.role === 'kitchen');
  state.markEmployeeMessageRead(messageId, kitchen.id);
  assert(getDB().employeeMessages.find(item => item.id === messageId).readByEmployeeIds.includes(kitchen.id), 'Lecture du message équipe non tracée');

  const kitchenPricing = getDB().posPricing.find(item => item.posId === kitchen.posId && item.isAvailable);
  state.setPOSProductAvailability(kitchenPricing.productId, kitchenPricing.posId, false, `${kitchen.name} · Cuisine`);
  assert(getDB().posPricing.find(item => item.productId === kitchenPricing.productId && item.posId === kitchenPricing.posId).isAvailable === false, 'Rupture KDS non répercutée sur le canal de vente');
  assert(getDB().employeeMessages.some(item => item.audience === 'waiter' && item.content.includes('en rupture')), 'Salle non prévenue de la rupture KDS');
  state.setPOSProductAvailability(kitchenPricing.productId, kitchenPricing.posId, true, `${kitchen.name} · Cuisine`);

  const recipeForOutage = getDB().recipes.find(recipe => recipe.ingredients.length && getDB().posPricing.some(pricing => pricing.posId === kitchen.posId && pricing.productId === recipe.productId));
  const outageIngredientId = recipeForOutage.ingredients[0].productId;
  const recipePricingBeforeOutage = getDB().posPricing.find(item => item.posId === kitchen.posId && item.productId === recipeForOutage.productId).isAvailable;
  const affectedProductIds = state.setRestaurantIngredientAvailability(outageIngredientId, kitchen.posId, false, `${kitchen.name} · Cuisine`);
  assert(affectedProductIds.includes(recipeForOutage.productId), 'Une rupture ingrédient ne masque pas la recette concernée');
  assert(getDB().posPricing.find(item => item.posId === kitchen.posId && item.productId === recipeForOutage.productId).isAvailable === false, 'Le menu POS reste disponible malgré la rupture ingrédient');
  assert(getDB().restaurantServiceIncidents.some(item => item.ingredientProductId === outageIngredientId && item.status === 'open'), 'Incident de rupture non tracé');
  state.setRestaurantIngredientAvailability(outageIngredientId, kitchen.posId, true, `${kitchen.name} · Cuisine`);
  assert(getDB().posPricing.find(item => item.posId === kitchen.posId && item.productId === recipeForOutage.productId).isAvailable === recipePricingBeforeOutage, 'Le rétablissement ne restaure pas la disponibilité précédente');

  const approvalOrder = getDB().restaurantGuestOrders.find(item => item.posId === waiter.posId && !['paid', 'cancelled'].includes(item.status));
  const approvalId = state.requestEmployeeApproval({ type: 'complimentary', referenceId: approvalOrder.id, requestedBy: waiter.id, requestedByName: waiter.name, label: 'Attention client test', reason: 'Reprise de service vérifiée.', amount: 1500, metadata: { orderId: approvalOrder.id } });
  const manager = getDB().employeeProfiles.find(item => item.role === 'service_manager');
  const recognitionId = state.addEmployeeRecognition(waiter.id, manager.id, 'Merci pour une passation test très claire.');
  assert(getDB().employeeRecognitions.find(item => item.id === recognitionId)?.source === 'manager', 'Reconnaissance manager non conservée');
  const supportId = state.requestEmployeeSupport({ employeeId: waiter.id, siteId: waiter.siteId, shiftId, type: 'reinforcement', note: 'Renfort test pendant le pic.' });
  state.updateEmployeeSupportRequest(supportId, 'acknowledged', manager.id);
  assert(getDB().employeeSupportRequests.find(item => item.id === supportId)?.handledBy === manager.name, 'Prise en compte du renfort non tracée');
  state.updateEmployeeSupportRequest(supportId, 'resolved', manager.id);
  assert(getDB().employeeSupportRequests.find(item => item.id === supportId)?.status === 'resolved', 'Demande de renfort non résolue');

  const requesterSchedule = getDB().employeeSchedules.find(item => item.employeeId === waiter.id && item.status === 'planned');
  const colleagueSchedule = getDB().employeeSchedules.find(item => item.employeeId !== waiter.id && getDB().employeeProfiles.find(profile => profile.id === item.employeeId)?.role === waiter.role && item.siteId === waiter.siteId && item.status === 'planned' && (item.date !== requesterSchedule.date || item.startTime !== requesterSchedule.startTime || item.endTime !== requesterSchedule.endTime));
  const requesterSlot = { date: requesterSchedule.date, startTime: requesterSchedule.startTime, endTime: requesterSchedule.endTime };
  const colleagueSlot = { date: colleagueSchedule.date, startTime: colleagueSchedule.startTime, endTime: colleagueSchedule.endTime };
  state.requestEmployeeScheduleChange(requesterSchedule.id, waiter.id, 'swap', colleagueSchedule.employeeId, 'Échange test entre collègues.', colleagueSchedule.id);
  assert(getDB().employeeSchedules.find(item => item.id === requesterSchedule.id)?.status === 'swap_pending_colleague', 'Échange non transmis au collègue en premier');
  const alternateRequesterSchedule = getDB().employeeSchedules.find(item => item.employeeId === waiter.id && item.id !== requesterSchedule.id && item.status === 'planned');
  assert(alternateRequesterSchedule, 'Créneau alternatif absent pour tester les échanges concurrents');
  let concurrentSwapBlocked = false;
  try {
    state.requestEmployeeScheduleChange(colleagueSchedule.id, colleagueSchedule.employeeId, 'swap', waiter.id, 'Échange concurrent à bloquer.', alternateRequesterSchedule.id);
  } catch {
    concurrentSwapBlocked = true;
  }
  assert(concurrentSwapBlocked, 'Un créneau déjà engagé ne doit pas entrer dans un second échange');
  let concurrentLeaveBlocked = false;
  try {
    state.requestEmployeeScheduleChange(colleagueSchedule.id, colleagueSchedule.employeeId, 'leave', undefined, 'Absence concurrente à bloquer.');
  } catch {
    concurrentLeaveBlocked = true;
  }
  assert(concurrentLeaveBlocked, 'Un créneau déjà engagé ne doit pas accepter une demande d’absence concurrente');
  let prematureManagerReviewBlocked = false;
  try {
    state.reviewEmployeeScheduleChange(requesterSchedule.id, manager.id, true);
  } catch {
    prematureManagerReviewBlocked = true;
  }
  assert(prematureManagerReviewBlocked, 'Le manager ne doit pas pouvoir valider avant le collègue');
  state.respondEmployeeScheduleSwap(requesterSchedule.id, colleagueSchedule.employeeId, true);
  assert(getDB().employeeSchedules.find(item => item.id === requesterSchedule.id)?.status === 'swap_colleague_accepted', 'Accord du collègue non conservé');
  state.reviewEmployeeScheduleChange(requesterSchedule.id, manager.id, true);
  const swappedRequesterSchedule = getDB().employeeSchedules.find(item => item.id === requesterSchedule.id);
  const swappedColleagueSchedule = getDB().employeeSchedules.find(item => item.id === colleagueSchedule.id);
  assert(swappedRequesterSchedule.date === colleagueSlot.date && swappedRequesterSchedule.startTime === colleagueSlot.startTime && swappedRequesterSchedule.endTime === colleagueSlot.endTime, 'Créneau du demandeur non permuté après validation manager');
  assert(swappedColleagueSchedule.date === requesterSlot.date && swappedColleagueSchedule.startTime === requesterSlot.startTime && swappedColleagueSchedule.endTime === requesterSlot.endTime, 'Créneau du collègue non permuté après validation manager');
  state.decideEmployeeApproval(approvalId, manager.id, 'approved', 'Validé au test');
  assert(getDB().employeeApprovals.find(item => item.id === approvalId).status === 'approved', 'Validation manager non conservée');

  state.closeEmployeeShift(shiftId, { notes: 'Table test à suivre.', incidents: 'Aucun.', amountsToCheck: 'Aucun.', customersToFollow: 'Client test.' });
  db = getDB();
  assert(db.employeeShifts.find(item => item.id === shiftId).status === 'closed', 'Fin de service non enregistrée');
  assert(typeof db.employeeShifts.find(item => item.id === shiftId).durationMinutes === 'number', 'Durée du service non calculée');
  assert(db.employeeShifts.find(item => item.id === shiftId).serviceSummary.includes('passation enregistrée'), 'Bilan de service non conservé');
  assert(db.employeeHandovers.some(item => item.shiftId === shiftId && item.notes === 'Table test à suivre.'), 'Passation de fin de service absente');

  const cashier = db.employeeProfiles.find(item => item.role === 'cashier');
  const cashierShiftId = state.startEmployeeShift(cashier.id, cashier.posId, 'Terminal POS partagé');
  const cashSessionId = state.openCashSession(cashier.posId, 50000, { id: cashier.id, name: cashier.name });
  assert(getDB().cashSessions.find(item => item.id === cashSessionId).userName === cashier.name, 'Caisse non attribuée au caissier');
  const orderToPay = getDB().restaurantGuestOrders.find(item => item.posId === cashier.posId && !['paid', 'cancelled'].includes(item.status));
  state.addRestaurantGuestOrderPayment(orderToPay.id, 1000, 'wave', cashier.name, cashSessionId, { source: 'terminal', operatorId: cashier.id });
  assert(getDB().cashSessions.find(item => item.id === cashSessionId).paymentTotals.wave === 1000, 'Paiement addition non rattaché à la caisse');
  state.updateEmployeePermissions(cashier.id, ['team_messages']);
  let cashCloseProtected = false;
  try {
    state.closeCashSession(cashSessionId, 50000, 'Clôture sans droit', { id: cashier.id, name: cashier.name });
  } catch {
    cashCloseProtected = true;
  }
  assert(cashCloseProtected, 'Le retrait du droit de clôture caisse devrait bloquer l’action');
  state.updateEmployeePermissions(cashier.id, ['team_messages', 'discount_request', 'table_payment', 'cash_close']);
  state.closeCashSession(cashSessionId, 50000, 'Clôture test équipe', { id: cashier.id, name: cashier.name });
  assert(getDB().cashSessions.find(item => item.id === cashSessionId).cashDifference === 0, 'Écart caisse test incohérent');
  assert(getDB().cashSessions.find(item => item.id === cashSessionId).paymentTotals.wave === 1000, 'Rapport Z incomplet sur les additions');
  state.closeEmployeeShift(cashierShiftId, { notes: 'Caisse clôturée.', incidents: '', amountsToCheck: 'Rapport Z produit.', customersToFollow: '' });

  const storekeeper = getDB().employeeProfiles.find(item => item.role === 'storekeeper');
  const storekeeperShiftId = state.startEmployeeShift(storekeeper.id, storekeeper.warehouseId, 'Terminal dépôt');
  const supplierOrder = getDB().supplierOrders.find(item => ['ordered', 'partially_received'].includes(item.status));
  const supplierLine = supplierOrder.items.find(item => item.quantityOrdered > item.quantityReceived);
  state.receiveOrder(supplierOrder.id, storekeeper.warehouseId, [{ productId: supplierLine.productId, quantityReceived: 1, batchNumber: 'TEST-EQUIPE-REC' }], { id: storekeeper.id, name: storekeeper.name });
  assert(getDB().movements.some(item => item.externalReference === supplierOrder.id && item.userName === storekeeper.name), 'Réception employé non tracée au nom du magasinier');

  const transferableBatch = getDB().batches.find(item => item.warehouseId === storekeeper.warehouseId && item.quantity >= 2);
  const destination = getDB().warehouses.find(item => item.id !== storekeeper.warehouseId && item.siteId === storekeeper.siteId);
  state.transferStock(storekeeper.warehouseId, destination.id, [{ productId: transferableBatch.productId, quantity: 1 }], { id: storekeeper.id, name: storekeeper.name });
  assert(getDB().movements.some(item => item.type === 'transfer_out' && item.productId === transferableBatch.productId && item.userName === storekeeper.name), 'Transfert employé non tracé au nom du magasinier');

  const countedStock = getDB().stocks.find(item => item.warehouseId === storekeeper.warehouseId && item.productId === transferableBatch.productId);
  state.inventoryAdjustment(storekeeper.warehouseId, [{ productId: countedStock.productId, realQty: Math.max(0, countedStock.quantityAvailable - 1) }], { id: storekeeper.id, name: storekeeper.name });
  assert(getDB().movements.some(item => item.type === 'inventory_adjustment' && item.productId === countedStock.productId && item.userName === storekeeper.name), 'Inventaire employé non tracé au nom du magasinier');
  state.closeEmployeeShift(storekeeperShiftId, { notes: 'Réception, transfert et comptage terminés.', incidents: '', amountsToCheck: '', customersToFollow: '' });

  const serviceDb = getDB();
  const serviceDate = new Date().toISOString().slice(0, 10);
  const occupiedLabels = new Set([
    ...serviceDb.restaurantGuestOrders.filter(item => item.posId === 'pos-1' && !['paid', 'cancelled'].includes(item.status)).map(item => item.tableNumber),
    ...serviceDb.restaurantReservations.filter(item => item.posId === 'pos-1' && item.date === serviceDate && ['confirmed', 'seated'].includes(item.status)).map(item => item.tableNumber)
  ]);
  const serviceTables = serviceDb.restaurantDiningTables.filter(item => item.posId === 'pos-1' && item.active && !occupiedLabels.has(item.label));
  const sourceTable = serviceTables.find(item => item.capacity >= 2);
  assert(sourceTable, 'Une table libre est nécessaire au scénario salle');
  const targetTable = serviceTables.find(item => item.id !== sourceTable.id && item.capacity >= 2);
  assert(targetTable, 'Une table de transfert est nécessaire au scénario salle');
  const suggestedTables = getRestaurantTableSuggestions(serviceDb, 'pos-1', 2, 'customer-awa', 4);
  assert(suggestedTables.length > 0 && suggestedTables.every(item => item.table.capacity >= 2), 'Le placement assisté ne propose pas de table adaptée et réellement libre');
  const futureDate = new Date(`${serviceDate}T12:00:00`);
  futureDate.setDate(futureDate.getDate() + 4);
  const futureReservationId = state.createRestaurantReservation({ customerId: 'customer-awa', posId: 'pos-1', date: futureDate.toISOString().slice(0, 10), time: '19:30', guests: 2, occasion: 'business', durationMinutes: 120, notes: 'Affectation depuis le plan de salle.' });
  state.assignRestaurantReservationTable(futureReservationId, sourceTable.id, waiter.name);
  assert(getDB().restaurantReservations.find(item => item.id === futureReservationId)?.tableNumber === sourceTable.label, 'La réservation future ne peut pas être planifiée depuis le plan de salle');
  state.assignRestaurantDiningTableWaiter(sourceTable.id, waiter.id);
  assert(getDB().restaurantDiningTables.find(item => item.id === sourceTable.id)?.assignedEmployeeId === waiter.id, 'Affectation visuelle du serveur non conservée');
  const rebalancedSections = state.rebalanceRestaurantServiceSections('pos-1', manager.name);
  assert(rebalancedSections >= 1 && getDB().restaurantServiceSections.filter(item => item.posId === 'pos-1').every(item => item.tableIds.length > 0), 'Les secteurs de salle ne sont pas rééquilibrés');
  const walkInResult = state.seatRestaurantWalkIn({ tableId: sourceTable.id, guestName: 'Client Studio Test', guests: 2, actor: waiter.name });
  const tableOrderId = state.openRestaurantTableOrder(sourceTable.id, waiter.name);
  const orderProduct = getDB().posPricing.find(rule => rule.posId === 'pos-1' && rule.isAvailable && getDB().stocks.some(stock => stock.warehouseId === 'wh-restaurant' && stock.productId === rule.productId && stock.quantityAvailable >= 1));
  assert(orderProduct, 'Aucun produit disponible pour le scénario de commande à table');
  const orderWarehouseId = orderProduct.defaultWarehouseId || getDB().posList.find(item => item.id === 'pos-1').defaultWarehouseId;
  const productAvailability = getRestaurantProductAvailability(getDB(), 'pos-1', orderProduct.productId);
  assert(productAvailability.status !== 'out' && productAvailability.warehouseId === orderWarehouseId, 'La disponibilité affichée ne correspond pas au dépôt du POS');
  const stockBeforeOrder = getDB().stocks.find(item => item.productId === orderProduct.productId && item.warehouseId === orderWarehouseId).quantityAvailable;
  const orderOperationId = 'EMPLOYEE-SMOKE-ORDER-IDEMPOTENT';
  Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });
  state.appendRestaurantGuestOrderItems(tableOrderId, walkInResult.customerId, [{ productId: orderProduct.productId, quantity: 1, seatNumber: 1, course: 'main', modifiers: ['Sans piment'], status: 'held', actorName: waiter.name }], orderOperationId);
  state.appendRestaurantGuestOrderItems(tableOrderId, walkInResult.customerId, [{ productId: orderProduct.productId, quantity: 1, seatNumber: 1, course: 'main', modifiers: ['Sans piment'], status: 'held', actorName: waiter.name }], orderOperationId);
  let tableOrder = getDB().restaurantGuestOrders.find(item => item.id === tableOrderId);
  const serviceLine = tableOrder.items.find(item => item.productId === orderProduct.productId && item.seatNumber === 1 && item.status === 'held');
  assert(serviceLine?.id && serviceLine.course === 'main' && serviceLine.station === 'drinks' && serviceLine.targetPreparationMinutes > 0, 'La boisson n’est pas routée vers le bar avec son objectif de préparation');
  assert(tableOrder.items.filter(item => item.operationId === orderOperationId).length === 1, 'Un double appui recrée les lignes de commande');
  assert(getDB().stocks.find(item => item.productId === orderProduct.productId && item.warehouseId === orderWarehouseId).quantityAvailable === stockBeforeOrder - 1, 'La commande tactile ne déduit pas le dépôt configuré du POS');
  assert(getDB().movements.some(item => item.externalReference?.startsWith(`${tableOrderId}-ADD-`) && item.warehouseId === orderWarehouseId), 'Mouvement stock de la commande tactile absent ou mauvais dépôt');
  const queuedOrderActions = getDB().sartalOfflineActions.filter(item => item.operationId === orderOperationId && item.status === 'queued');
  assert(queuedOrderActions.length === 1, 'La commande hors connexion n’est pas mise une seule fois en file');
  assert(state.syncSartalOfflineActions() === 0 && getDB().sartalOfflineActions.find(item => item.operationId === orderOperationId)?.status === 'queued', 'Une action hors connexion ne doit pas être déclarée synchronisée sans réseau');
  Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
  state.syncSartalOfflineActions();
  assert(getDB().sartalOfflineActions.find(item => item.operationId === orderOperationId)?.status === 'synced', 'La commande hors connexion ne passe pas au statut synchronisé');
  state.sendRestaurantOrderItems(tableOrderId, [serviceLine.id], waiter.name, `SEND-${serviceLine.id}`);
  state.sendRestaurantOrderItems(tableOrderId, [serviceLine.id], waiter.name, `SEND-${serviceLine.id}`);
  assert(getDB().restaurantGuestOrders.find(item => item.id === tableOrderId).items.find(item => item.id === serviceLine.id).status === 'sent', 'Envoi salle vers bar non persistant');
  state.updateRestaurantStationTicket(tableOrderId, 'drinks', 'preparing', kitchen.name);
  state.updateRestaurantStationTicket(tableOrderId, 'drinks', 'ready', kitchen.name);
  let drinkPassBlocked = false;
  try {
    state.confirmRestaurantPassItem(tableOrderId, serviceLine.id, kitchen.name);
  } catch {
    drinkPassBlocked = true;
  }
  assert(drinkPassBlocked, 'Une boisson est encore envoyée inutilement au passe');
  state.updateRestaurantOrderItemStatus(tableOrderId, serviceLine.id, 'served', waiter.name);
  assert(getDB().restaurantGuestOrders.find(item => item.id === tableOrderId).status === 'served', 'Une boisson prête au bar ne peut pas être remise par le serveur');

  const kitchenProductId = 'prod-yassa-poulet';
  state.appendRestaurantGuestOrderItems(tableOrderId, walkInResult.customerId, [{ productId: kitchenProductId, quantity: 1, seatNumber: 1, status: 'sent', actorName: waiter.name }], 'EMPLOYEE-SMOKE-KITCHEN-ROUTING');
  tableOrder = getDB().restaurantGuestOrders.find(item => item.id === tableOrderId);
  const kitchenLine = tableOrder.items.find(item => item.operationId === 'EMPLOYEE-SMOKE-KITCHEN-ROUTING');
  assert(kitchenLine?.station === 'kitchen' && kitchenLine.course === 'main' && kitchenLine.targetPreparationMinutes > 0, 'Le plat n’est pas routé vers la cuisine avec son service et son objectif par défaut');
  state.updateRestaurantStationTicket(tableOrderId, 'kitchen', 'preparing', kitchen.name);
  assert(getDB().restaurantGuestOrders.find(item => item.id === tableOrderId).items.find(item => item.id === kitchenLine.id).status === 'preparing', 'La prise en charge groupée cuisine ne démarre pas le ticket');
  state.updateRestaurantStationTicket(tableOrderId, 'kitchen', 'ready', kitchen.name);
  let globalServiceBeforePassBlocked = false;
  try {
    state.updateRestaurantGuestOrderStatus(tableOrderId, 'served');
  } catch {
    globalServiceBeforePassBlocked = true;
  }
  assert(globalServiceBeforePassBlocked, 'Une action globale peut contourner le contrôle du passe');
  let servedBeforePassBlocked = false;
  try {
    state.updateRestaurantOrderItemStatus(tableOrderId, kitchenLine.id, 'served', waiter.name);
  } catch {
    servedBeforePassBlocked = true;
  }
  assert(servedBeforePassBlocked, 'Un plat peut partir en salle sans contrôle du passe');
  state.confirmRestaurantPassTicket(tableOrderId, kitchen.name);
  assert(getDB().restaurantGuestOrders.find(item => item.id === tableOrderId).items.find(item => item.id === kitchenLine.id).passedAt, 'Contrôle groupé du passe non conservé');
  state.updateRestaurantOrderItemStatus(tableOrderId, kitchenLine.id, 'served', waiter.name);
  assert(getDB().restaurantGuestOrders.find(item => item.id === tableOrderId).status === 'served', 'Le ticket ne se clôture pas après retrait par la salle');

  const stockBeforeVoidLine = getDB().stocks.find(item => item.productId === orderProduct.productId && item.warehouseId === orderWarehouseId).quantityAvailable;
  state.appendRestaurantGuestOrderItems(tableOrderId, walkInResult.customerId, [{ productId: orderProduct.productId, quantity: 1, seatNumber: 2, course: 'main', status: 'held', actorName: waiter.name }]);
  tableOrder = getDB().restaurantGuestOrders.find(item => item.id === tableOrderId);
  const voidLine = tableOrder.items.find(item => item.seatNumber === 2 && item.status === 'held');
  const voidApprovalId = state.requestEmployeeApproval({ type: 'void', referenceId: tableOrderId, requestedBy: waiter.id, requestedByName: waiter.name, label: 'Annulation ligne test', reason: 'Client change d’avis avant préparation.', amount: voidLine.salePrice, metadata: { orderId: tableOrderId, itemId: voidLine.id, disposition: 'restock' } });
  state.decideEmployeeApproval(voidApprovalId, manager.id, 'approved', 'Retour stock autorisé avant préparation.');
  assert(getDB().restaurantGuestOrders.find(item => item.id === tableOrderId).items.find(item => item.id === voidLine.id).status === 'voided', 'Annulation validée non appliquée au ticket');
  assert(getDB().stocks.find(item => item.productId === orderProduct.productId && item.warehouseId === orderWarehouseId).quantityAvailable === stockBeforeVoidLine, 'Annulation avant préparation ne restaure pas le stock');
  assert(getDB().movements.some(item => item.externalReference === voidApprovalId && item.type === 'correction'), 'Retour stock après annulation non tracé');

  const totalBeforeDiscount = getDB().restaurantGuestOrders.find(item => item.id === tableOrderId).total;
  const discountApprovalId = state.requestEmployeeApproval({ type: 'discount', referenceId: tableOrderId, requestedBy: waiter.id, requestedByName: waiter.name, label: 'Remise service test', reason: 'Validation du parcours commercial.', amount: 100, metadata: { orderId: tableOrderId } });
  state.decideEmployeeApproval(discountApprovalId, manager.id, 'approved', 'Remise validée.');
  assert(getDB().restaurantGuestOrders.find(item => item.id === tableOrderId).total === totalBeforeDiscount - 100, 'Remise validée non appliquée à l’addition');
  const tableAccess = state.createRestaurantTableQR(sourceTable.id, waiter.name);
  assert(tableAccess.status === 'active' && tableAccess.destination.includes(sourceTable.label), 'Accès QR de table non créé');
  const billRequestCountBefore = getDB().sartalServiceRequests.filter(item => item.referenceId === tableOrderId && item.type === 'bill').length;
  const billRequestId = state.requestRestaurantTableBill(sourceTable.id, waiter.name, 'EMPLOYEE-SMOKE-BILL-IDEMPOTENT');
  const duplicateBillRequestId = state.requestRestaurantTableBill(sourceTable.id, waiter.name, 'EMPLOYEE-SMOKE-BILL-IDEMPOTENT');
  assert(duplicateBillRequestId === billRequestId && getDB().sartalServiceRequests.filter(item => item.referenceId === tableOrderId && item.type === 'bill').length === billRequestCountBefore + 1, 'Un double appui recrée la demande d’addition');
  assert(getDB().sartalServiceRequests.find(item => item.id === billRequestId)?.type === 'bill', 'Demande d’addition non transmise à la caisse');
  state.transferRestaurantTable(sourceTable.id, targetTable.id, waiter.name);
  assert(getDB().restaurantGuestOrders.find(item => item.id === tableOrderId)?.tableNumber === targetTable.label, 'La commande ne suit pas le transfert de table');
  assert(getDB().restaurantReservations.find(item => item.id === walkInResult.reservationId)?.tableNumber === targetTable.label, 'La réservation ne suit pas le transfert de table');
  assert(getDB().restaurantReservations.find(item => item.id === futureReservationId)?.tableNumber === sourceTable.label, 'Une réservation future ne doit pas suivre le transfert du service en cours');
  assert(getDB().sartalClientAccess.find(item => item.id === tableAccess.id)?.destination === `Table ${targetTable.label}`, 'L’accès client ne suit pas le transfert de table');
  tableOrder = getDB().restaurantGuestOrders.find(item => item.id === tableOrderId);
  const tableCashSessionId = state.openCashSession('pos-1', 0, { id: waiter.id, name: waiter.name });
  let partialAllocationBlocked = false;
  try {
    state.addRestaurantGuestOrderPayment(tableOrderId, Math.max(1, Math.floor(tableOrder.total / 2)), 'wave', 'Client Studio Test', tableCashSessionId, { itemIds: [serviceLine.id], source: 'pay_at_table', operatorId: waiter.id, operationId: 'EMPLOYEE-SMOKE-PARTIAL-ITEM' });
  } catch {
    partialAllocationBlocked = true;
  }
  assert(partialAllocationBlocked, 'Un article peut être marqué réglé avec un paiement partiel incohérent');
  const paymentCountBefore = tableOrder.payments.length;
  const waveTotalBefore = getDB().cashSessions.find(item => item.id === tableCashSessionId).paymentTotals.wave;
  const paymentOperationId = 'EMPLOYEE-SMOKE-PAYMENT-IDEMPOTENT';
  const paymentAllocation = { seatNumbers: [1], itemIds: [serviceLine.id, kitchenLine.id], tipAmount: 250, reference: 'WAVE-TEST-001', source: 'pay_at_table', operatorId: waiter.id, operationId: paymentOperationId };
  state.addRestaurantGuestOrderPayment(tableOrderId, tableOrder.total, 'wave', 'Client Studio Test', tableCashSessionId, paymentAllocation);
  state.addRestaurantGuestOrderPayment(tableOrderId, tableOrder.total, 'wave', 'Client Studio Test', tableCashSessionId, paymentAllocation);
  const paidOrder = getDB().restaurantGuestOrders.find(item => item.id === tableOrderId);
  const detailedPayment = paidOrder.payments.find(item => item.operationId === paymentOperationId);
  assert(paidOrder.payments.length === paymentCountBefore + 1, 'Un double appui recrée le paiement à table');
  assert(getDB().cashSessions.find(item => item.id === tableCashSessionId).paymentTotals.wave === waveTotalBefore + tableOrder.total + 250, 'Un double appui modifie deux fois les totaux de caisse');
  assert(detailedPayment.seatNumbers?.includes(1) && detailedPayment.itemIds?.includes(serviceLine.id) && detailedPayment.tipAmount === 250 && detailedPayment.source === 'pay_at_table', 'Paiement à table détaillé non conservé');
  assert(detailedPayment.cashSessionId === tableCashSessionId, 'Paiement serveur non rattaché à la caisse du POS');
  assert(getDB().restaurantGuestOrders.find(item => item.id === tableOrderId).status === 'paid', 'Addition soldée non clôturée');
  assert(getDB().restaurantReservations.find(item => item.id === walkInResult.reservationId)?.status === 'completed', 'La réservation reste installée après le règlement complet');
  assert(!getDB().restaurantGuestOrders.some(item => item.posId === 'pos-1' && item.tableNumber === targetTable.label && !['paid', 'cancelled'].includes(item.status)), 'La table reste occupée après le règlement complet');
  assert(getDB().sartalServiceRequests.find(item => item.id === billRequestId)?.status === 'completed', 'La demande d’addition reste active après le règlement');
  assert(getDB().sartalClientAccess.find(item => item.id === tableAccess.id)?.status === 'expired', 'L’accès QR de table reste actif après la clôture du service');
  state.closeCashSession(tableCashSessionId, 0, 'Clôture de la caisse partagée du POS', { id: cashier.id, name: cashier.name });
  assert(getDB().cashSessions.find(item => item.id === tableCashSessionId)?.closedBy === cashier.id, 'Le caissier ne peut pas clôturer la caisse ouverte à table par le serveur');
  ['reservation_assigned', 'waiter_assigned', 'guest_seated', 'order_opened', 'order_sent', 'item_updated', 'adjustment_applied', 'qr_created', 'bill_requested', 'table_transferred', 'payment_recorded'].forEach(action => {
    assert(getDB().restaurantFloorAudit.some(item => item.action === action), `Action salle non auditée : ${action}`);
  });

  console.log('Sártal Équipe smoke test: postes métier, QVT, Studio premium et opérations de salle vérifiés.');
} finally {
  await server.close();
}
