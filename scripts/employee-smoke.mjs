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
  let state;
  const Harness = () => {
    state = useStockState();
    return React.createElement(EmployeeWorkspace, { state });
  };

  const html = renderToStaticMarkup(React.createElement(Harness));
  ['SÁRTAL ÉQUIPE', 'Accès de démonstration', 'Code démo : 2468', 'Serveur / Chef de rang', 'Cuisine / KDS', 'Réceptionniste hôtel', 'Préparateur livraison', 'Manager de service'].forEach(marker => {
    assert(html.includes(marker), `Interface employé incomplète : ${marker}`);
  });
  const employeeSource = readFileSync(new URL('../src/views/EmployeeWorkspace.tsx', import.meta.url), 'utf8');
  assert(!employeeSource.includes('setView('), 'Sártal Équipe ne doit jamais ouvrir une vue du back-office');
  ['Arrivées & séjours', 'État des chambres', 'Réceptions', 'Transferts', 'Inventaire', 'Journal'].forEach(marker => assert(employeeSource.includes(marker), `Poste employé autonome incomplet : ${marker}`));

  let db = getDB();
  const roles = new Set(db.employeeProfiles.map(item => item.role));
  ['waiter', 'cashier', 'kitchen', 'receptionist', 'housekeeper', 'storekeeper', 'picker', 'driver', 'customer_experience', 'service_manager'].forEach(role => {
    assert(roles.has(role), `Profil métier absent : ${role}`);
  });
  ['employeeShifts', 'employeeHandovers', 'employeeMessages', 'employeeApprovals'].forEach(collection => {
    assert(Array.isArray(db[collection]), `Collection équipe absente : ${collection}`);
  });

  const waiter = db.employeeProfiles.find(item => item.role === 'waiter');
  const shiftId = state.startEmployeeShift(waiter.id, waiter.posId, 'Tablette de service');
  db = getDB();
  assert(db.employeeShifts.find(item => item.id === shiftId)?.status === 'open', 'Prise de service non enregistrée');
  assert(db.employeeShifts.find(item => item.id === shiftId)?.assignmentLabel.includes('Restaurant'), 'Affectation POS non résolue');

  const pendingHandover = db.employeeHandovers.find(item => item.role === 'waiter' && item.status === 'submitted');
  state.acknowledgeEmployeeHandover(pendingHandover.id, waiter.id);
  assert(getDB().employeeHandovers.find(item => item.id === pendingHandover.id).status === 'acknowledged', 'Reprise de passation non confirmée');

  const messageId = state.sendEmployeeMessage({ siteId: waiter.siteId, senderId: waiter.id, senderName: `${waiter.name} · Salle`, audience: 'kitchen', content: 'Table test prête à suivre.', priority: 'urgent' });
  const kitchen = getDB().employeeProfiles.find(item => item.role === 'kitchen');
  state.markEmployeeMessageRead(messageId, kitchen.id);
  assert(getDB().employeeMessages.find(item => item.id === messageId).readByEmployeeIds.includes(kitchen.id), 'Lecture du message équipe non tracée');

  const approvalId = state.requestEmployeeApproval({ type: 'complimentary', referenceId: 'TABLE-TEST', requestedBy: waiter.id, requestedByName: waiter.name, label: 'Attention client test', reason: 'Reprise de service vérifiée.', amount: 1500 });
  const manager = getDB().employeeProfiles.find(item => item.role === 'service_manager');
  state.decideEmployeeApproval(approvalId, manager.id, 'approved', 'Validé au test');
  assert(getDB().employeeApprovals.find(item => item.id === approvalId).status === 'approved', 'Validation manager non conservée');

  state.closeEmployeeShift(shiftId, { notes: 'Table test à suivre.', incidents: 'Aucun.', amountsToCheck: 'Aucun.', customersToFollow: 'Client test.' });
  db = getDB();
  assert(db.employeeShifts.find(item => item.id === shiftId).status === 'closed', 'Fin de service non enregistrée');
  assert(db.employeeHandovers.some(item => item.shiftId === shiftId && item.notes === 'Table test à suivre.'), 'Passation de fin de service absente');

  const cashier = db.employeeProfiles.find(item => item.role === 'cashier');
  const cashierShiftId = state.startEmployeeShift(cashier.id, cashier.posId, 'Terminal POS partagé');
  const cashSessionId = state.openCashSession(cashier.posId, 50000, { id: cashier.id, name: cashier.name });
  assert(getDB().cashSessions.find(item => item.id === cashSessionId).userName === cashier.name, 'Caisse non attribuée au caissier');
  const orderToPay = getDB().restaurantGuestOrders.find(item => item.posId === cashier.posId && !['paid', 'cancelled'].includes(item.status));
  state.addRestaurantGuestOrderPayment(orderToPay.id, 1000, 'wave', cashier.name, cashSessionId);
  assert(getDB().cashSessions.find(item => item.id === cashSessionId).paymentTotals.wave === 1000, 'Paiement addition non rattaché à la caisse');
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

  console.log('Sártal Équipe smoke test: 10 postes et 39 contrôles fonctionnels validés.');
} finally {
  await server.close();
}
