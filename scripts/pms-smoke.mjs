import React from 'react';
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

const server = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true }
});

try {
  const { useStockState } = await server.ssrLoadModule('/src/hooks/useStockState.ts');
  const { getDB } = await server.ssrLoadModule('/src/db.ts');
  const { PMSHotel } = await server.ssrLoadModule('/src/views/PMSHotel.tsx');
  const tabs = {
    dashboard: 'Demandes et conciergerie',
    planning: 'Planning opérationnel jusqu’à 90 jours',
    reservations: 'Nouvelle réservation',
    rooms: 'Plan des chambres',
    guests: 'Dossier client 360',
    folios: 'Folios clients',
    housekeeping: 'Feuille de travail housekeeping',
    audit: 'Clôture du',
    reports: 'Calendrier tarifaire',
    settings: 'Configurer le PMS'
  };

  let state;
  for (const [tab, marker] of Object.entries(tabs)) {
    const Screen = () => {
      state = useStockState();
      return React.createElement(PMSHotel, { state, setView: () => {}, initialTab: tab });
    };
    const html = renderToStaticMarkup(React.createElement(Screen));
    assert(html.includes(marker), `Onglet PMS ${tab}: contenu attendu absent (${marker})`);
    assert(!html.includes('Chambre undefined'), `Onglet PMS ${tab}: chambre non attribuée mal affichée`);
  }

  let db = getDB();
  const reservation = db.pmsReservations.find(item => !item.roomId && item.status === 'confirmed');
  assert(reservation, 'Réservation sans chambre de démonstration absente');
  const room = db.pmsRooms.find(candidate => (
    candidate.status !== 'maintenance'
    && candidate.capacity >= reservation.adults + reservation.children
    && !db.pmsReservations.some(item => (
      item.id !== reservation.id
      && item.roomId === candidate.id
      && !['cancelled', 'no_show', 'checked_out', 'waitlisted'].includes(item.status)
      && reservation.arrivalDate < item.departureDate
      && reservation.departureDate > item.arrivalDate
    ))
  ));
  assert(room, 'Aucune chambre disponible pour tester l’attribution');

  state.holdPMSRoom(room.id, reservation.id);
  assert(getDB().pmsRooms.find(item => item.id === room.id).holdUntil, 'Mise en attente non enregistrée');
  let holdProtected = false;
  try {
    state.holdPMSRoom(room.id, 'another-reservation');
  } catch {
    holdProtected = true;
  }
  assert(holdProtected, 'La mise en attente devrait protéger la chambre d’une autre réservation');
  state.releasePMSRoomHold(room.id);
  assert(!getDB().pmsRooms.find(item => item.id === room.id).holdUntil, 'Mise en attente non libérée');

  state.assignPMSRoom(reservation.id, room.id, true);
  db = getDB();
  const assigned = db.pmsReservations.find(item => item.id === reservation.id);
  assert(assigned.roomId === room.id && assigned.roomAssignmentLocked, 'Attribution verrouillée non enregistrée');

  const charge = db.pmsFolios.flatMap(folio => folio.charges).find(Boolean);
  assert(charge, 'Charge de folio de démonstration absente');
  state.routePMSFolioCharge(charge.id, 'company');
  assert(getDB().pmsFolios.flatMap(folio => folio.charges).find(item => item.id === charge.id).billingWindow === 'company', 'Routage de folio non enregistré');

  const task = getDB().pmsHousekeepingTasks[0];
  assert(task, 'Tâche housekeeping de démonstration absente');
  state.updatePMSHousekeepingDetails(task.id, { linenStatus: 'complete', minibarStatus: 'checked', photoCount: 2 });
  const updatedTask = getDB().pmsHousekeepingTasks.find(item => item.id === task.id);
  assert(updatedTask.linenStatus === 'complete' && updatedTask.photoCount === 2, 'Détails housekeeping non enregistrés');

  state.updatePMSRoom(room.id, { status: 'vacant', housekeepingStatus: 'inspected' });
  state.completePMSCheckIn(reservation.id, { identity: true, guarantee: true, payment: true, signature: true, keyIssued: true });
  assert(getDB().pmsReservations.find(item => item.id === reservation.id).status === 'checked_in', 'Check-in guidé non finalisé');

  db = getDB();
  const moveRoom = db.pmsRooms.find(candidate => (
    candidate.id !== room.id
    && candidate.status === 'vacant'
    && candidate.capacity >= reservation.adults + reservation.children
    && !db.pmsReservations.some(item => (
      item.id !== reservation.id
      && item.roomId === candidate.id
      && !['cancelled', 'no_show', 'checked_out', 'waitlisted'].includes(item.status)
      && reservation.arrivalDate < item.departureDate
      && reservation.departureDate > item.arrivalDate
    ))
  ));
  assert(moveRoom, 'Aucune seconde chambre disponible pour tester le changement');
  state.updatePMSRoom(moveRoom.id, { status: 'vacant', housekeepingStatus: 'inspected' });
  state.assignPMSRoom(reservation.id, moveRoom.id, true);
  db = getDB();
  assert(db.pmsRooms.find(item => item.id === room.id).housekeepingStatus === 'dirty', 'L’ancienne chambre devrait passer au nettoyage');
  assert(db.pmsRooms.find(item => item.id === moveRoom.id).status === 'occupied', 'La nouvelle chambre devrait être occupée');
  assert(db.pmsHousekeepingTasks.some(item => item.roomId === room.id && item.status === 'pending'), 'La tâche de nettoyage du changement de chambre est absente');

  const requestId = state.addPMSServiceRequest({ reservationId: reservation.id, roomId: moveRoom.id, type: 'breakfast', label: 'Petit-déjeuner en chambre', priority: 'normal', scheduledAt: new Date().toISOString(), assignedTo: 'Restaurant', amount: 9000 });
  state.updatePMSServiceRequest(requestId, 'assigned');
  assert(getDB().pmsServiceRequests.find(item => item.id === requestId).status === 'assigned', 'Demande client non affectée');

  const notificationId = state.schedulePMSNotification(reservation.id, 'room_ready', 'whatsapp');
  state.sendPMSNotification(notificationId);
  assert(getDB().pmsNotifications.find(item => item.id === notificationId).status === 'sent', 'Message WhatsApp non envoyé');

  state.upsertPMSRateOverride({ date: db.pmsSettings.businessDate, roomType: moveRoom.roomType, price: moveRoom.nightlyRate + 5000, reason: 'Forte demande', closed: false });
  assert(getDB().pmsRateOverrides.some(item => item.date === db.pmsSettings.businessDate && item.roomType === moveRoom.roomType && item.price === moveRoom.nightlyRate + 5000), 'Tarif journalier non enregistré');

  const maintenance = getDB().pmsMaintenanceTickets[0];
  state.updatePMSMaintenanceDetails(maintenance.id, { actualCost: 42000, photoCount: 3 });
  assert(getDB().pmsMaintenanceTickets.find(item => item.id === maintenance.id).actualCost === 42000, 'Détails de maintenance non enregistrés');

  db = getDB();
  const packageFolio = db.pmsFolios.find(item => item.status === 'open');
  const packageItem = db.pmsPackages[0];
  const chargeCount = packageFolio.charges.length;
  state.addPMSPackageToFolio(packageFolio.id, packageItem.id);
  assert(getDB().pmsFolios.find(item => item.id === packageFolio.id).charges.length === chargeCount + 1, 'Forfait séjour non ajouté au folio');

  const keyCode = state.issuePMSDoorKey(reservation.id);
  db = getDB();
  const issuedKey = db.pmsDoorKeys.find(item => item.code === keyCode && item.status === 'active');
  assert(issuedKey, 'Clé électronique non émise');
  state.revokePMSDoorKey(issuedKey.id);
  assert(getDB().pmsDoorKeys.find(item => item.id === issuedKey.id).status === 'revoked', 'Clé électronique non révoquée');

  state.completePMSPreCheckIn(reservation.id);
  db = getDB();
  assert(db.pmsGuests.find(item => item.id === reservation.guestId).preCheckInStatus === 'completed', 'Pré-check-in mobile non finalisé');

  const automation = db.pmsAutomationRules[0];
  const previousAutomationStatus = automation.active;
  state.togglePMSAutomationRule(automation.id);
  assert(getDB().pmsAutomationRules.find(item => item.id === automation.id).active !== previousAutomationStatus, 'Automatisation client non modifiée');

  const migration = getDB().pmsMigrationRuns[0];
  state.validatePMSMigrationRun(migration.id);
  assert(getDB().pmsMigrationRuns.find(item => item.id === migration.id).status === 'validated', 'Migration Orchestra non validée');

  const bookingEngineWasEnabled = getDB().pmsBookingEngine.enabled;
  state.updatePMSBookingEngine({ enabled: !bookingEngineWasEnabled });
  assert(getDB().pmsBookingEngine.enabled !== bookingEngineWasEnabled, 'Moteur de réservation non modifié');

  const roomTemplate = getDB().pmsRooms[0];
  const managedRoomId = state.savePMSConfigRecord('pmsRooms', { ...roomTemplate, id: '', roomNumber: 'TEST-901', status: 'vacant', housekeepingStatus: 'inspected' });
  assert(getDB().pmsRooms.some(item => item.id === managedRoomId && item.roomNumber === 'TEST-901'), 'Création de chambre configurable non enregistrée');
  state.savePMSConfigRecord('pmsRooms', { ...getDB().pmsRooms.find(item => item.id === managedRoomId), nightlyRate: 61000 });
  assert(getDB().pmsRooms.find(item => item.id === managedRoomId).nightlyRate === 61000, 'Modification de chambre configurable non enregistrée');
  state.deletePMSConfigRecord('pmsRooms', managedRoomId);
  assert(!getDB().pmsRooms.some(item => item.id === managedRoomId), 'Suppression de chambre sans historique non enregistrée');

  const managedGuestId = state.savePMSConfigRecord('pmsGuests', { id: '', fullName: 'Client Test CRUD', phone: '+221 77 000 00 00', email: 'crud@example.sn', nationality: 'Sénégalaise', stays: 0, loyaltyTier: 'standard' });
  const managedReservationId = state.createPMSReservation({ guestId: managedGuestId, guestName: 'Client Test CRUD', phone: '+221 77 000 00 00', roomId: '', requestedRoomType: roomTemplate.roomType, arrivalDate: '2027-01-10', departureDate: '2027-01-12', adults: 1, children: 0, source: 'direct', nightlyRate: 50000, depositAmount: 0 });
  state.deletePMSReservation(managedReservationId);
  assert(!getDB().pmsReservations.some(item => item.id === managedReservationId), 'Suppression de réservation sans folio non enregistrée');
  state.deletePMSConfigRecord('pmsGuests', managedGuestId);
  assert(!getDB().pmsGuests.some(item => item.id === managedGuestId), 'Suppression de client sans historique non enregistrée');

  let protectedGuest = false;
  try {
    state.deletePMSConfigRecord('pmsGuests', reservation.guestId);
  } catch {
    protectedGuest = true;
  }
  assert(protectedGuest, 'Un client avec historique devrait être protégé contre la suppression');

  const packageTemplate = getDB().pmsPackages[0];
  const managedPackageId = state.savePMSConfigRecord('pmsPackages', { ...packageTemplate, id: '', name: 'Forfait test configurable' });
  state.deletePMSConfigRecord('pmsPackages', managedPackageId);
  assert(!getDB().pmsPackages.some(item => item.id === managedPackageId), 'Suppression de forfait configurable non enregistrée');

  let auditBlocked = false;
  try {
    state.runPMSNightAudit();
  } catch {
    auditBlocked = true;
  }
  assert(auditBlocked, 'La clôture devrait être bloquée en présence d’anomalies');

  console.log(`PMS smoke test: ${Object.keys(tabs).length} onglets et 27 actions critiques validés.`);
} finally {
  await server.close();
}
