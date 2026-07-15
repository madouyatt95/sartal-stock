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
  const { EmployeeWorkspace } = await server.ssrLoadModule('/src/views/EmployeeWorkspace.tsx');
  const { TeamManagement } = await server.ssrLoadModule('/src/views/TeamManagement.tsx');
  const { RestaurantFloorStudio } = await server.ssrLoadModule('/src/components/RestaurantFloorStudio.tsx');
  let state;
  const Harness = () => {
    state = useStockState();
    return React.createElement(EmployeeWorkspace, { state });
  };

  const html = renderToStaticMarkup(React.createElement(Harness));
  ['SÁRTAL ÉQUIPE', 'Accès de démonstration', 'Code démo : 2468', 'Serveur / Chef de rang', 'Cuisine / KDS', 'Réceptionniste hôtel', 'Préparateur livraison', 'Manager de service'].forEach(marker => {
    assert(html.includes(marker), `Interface employé incomplète : ${marker}`);
  });
  const teamHtml = renderToStaticMarkup(React.createElement(TeamManagement, { state }));
  ['Les bonnes personnes, au bon poste', 'Répertoire des collaborateurs', 'Ajouter un collaborateur'].forEach(marker => assert(teamHtml.includes(marker), `Centre de gestion des équipes incomplet : ${marker}`));
  const floorHtml = renderToStaticMarkup(React.createElement(RestaurantFloorStudio, { state, posId: 'pos-1', editable: true }));
  ['Plan de salle interactif', 'Ouvrir le Studio', 'T12', 'Addition'].forEach(marker => assert(floorHtml.includes(marker), `Plan de salle manager incomplet : ${marker}`));
  const employeeSource = readFileSync(new URL('../src/views/EmployeeWorkspace.tsx', import.meta.url), 'utf8');
  const teamSource = readFileSync(new URL('../src/views/TeamManagement.tsx', import.meta.url), 'utf8');
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert(!employeeSource.includes('setView('), 'Sártal Équipe ne doit jamais ouvrir une vue du back-office');
  ['Collaborateurs', 'Affectations', 'Planning de l’équipe', 'Planifier un service', 'Droits & validations', 'Services & passations', 'Aperçu des postes'].forEach(marker => assert(teamSource.includes(marker), `Gestion des équipes incomplète : ${marker}`));
  assert(appSource.includes('Retour aux profils') && appSource.includes('Retour aux espaces'), 'Retour explicite absent des espaces de démonstration ou de connexion');
  ['Arrivées & séjours', 'Nouvelle réservation', 'RÉSERVATION SUR PLACE', 'État des chambres', 'Réceptions', 'Transferts', 'Inventaire', 'Journal'].forEach(marker => assert(employeeSource.includes(marker), `Poste employé autonome incomplet : ${marker}`));
  ['ASSISTANT DE SALLE', 'CONTRÔLE EN CONTINU', 'PILOTAGE KDS', 'ARRIVÉE SANS FRICTION', 'TOURNÉE OPTIMISÉE', 'STOCK PRÉDICTIF', 'PICKING SANS ERREUR', 'TOURNÉE ASSISTÉE', 'CLIENT 360°', 'TOUR DE CONTRÔLE'].forEach(marker => {
    assert(employeeSource.includes(marker), `Assistant métier absent : ${marker}`);
  });
  ['Mon quotidien', 'Mon planning', "id: 'schedule'", 'Voir tout mon planning avant de commencer', 'RestaurantFloorStudio', 'Ma progression', 'Aide et services', 'Ma passation', 'Accepter puis transmettre', 'QUALITÉ DU SERVICE ET DU TRAVAIL'].forEach(marker => {
    assert(employeeSource.includes(marker), `Expérience collaborateur incomplète : ${marker}`);
  });
  ['kdsItemProgress', 'housekeepingChecks', 'pickedLineIds', 'schedulePMSNotification', 'processSale', 'requestEmployeeApproval', 'setPOSProductAvailability'].forEach(marker => {
    assert(employeeSource.includes(marker), `Action game changer non câblée : ${marker}`);
  });

  let db = getDB();
  const roles = new Set(db.employeeProfiles.map(item => item.role));
  ['waiter', 'cashier', 'kitchen', 'receptionist', 'housekeeper', 'storekeeper', 'picker', 'driver', 'customer_experience', 'service_manager'].forEach(role => {
    assert(roles.has(role), `Profil métier absent : ${role}`);
  });
  ['employeeShifts', 'employeeHandovers', 'employeeMessages', 'employeeApprovals', 'employeeSchedules', 'employeeWellbeingCheckIns', 'employeeSupportRequests', 'employeeBreaks', 'employeeRecognitions', 'employeeLearningModules'].forEach(collection => {
    assert(Array.isArray(db[collection]), `Collection équipe absente : ${collection}`);
  });

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

  const approvalId = state.requestEmployeeApproval({ type: 'complimentary', referenceId: 'TABLE-TEST', requestedBy: waiter.id, requestedByName: waiter.name, label: 'Attention client test', reason: 'Reprise de service vérifiée.', amount: 1500 });
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
  state.addRestaurantGuestOrderPayment(orderToPay.id, 1000, 'wave', cashier.name, cashSessionId);
  assert(getDB().cashSessions.find(item => item.id === cashSessionId).paymentTotals.wave === 1000, 'Paiement addition non rattaché à la caisse');
  state.updateEmployeePermissions(cashier.id, ['team_messages']);
  let cashCloseProtected = false;
  try {
    state.closeCashSession(cashSessionId, 50000, 'Clôture sans droit', { id: cashier.id, name: cashier.name });
  } catch {
    cashCloseProtected = true;
  }
  assert(cashCloseProtected, 'Le retrait du droit de clôture caisse devrait bloquer l’action');
  state.updateEmployeePermissions(cashier.id, ['team_messages', 'discount_request', 'cash_close']);
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

  console.log('Sártal Équipe smoke test: postes métier, QVT et double validation des échanges vérifiés.');
} finally {
  await server.close();
}
