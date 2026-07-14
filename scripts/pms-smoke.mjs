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
    planning: 'Planning opérationnel sur 7 jours',
    reservations: 'Nouvelle réservation',
    rooms: 'Plan des chambres',
    guests: 'Dossier client 360',
    folios: 'Folios clients',
    housekeeping: 'Feuille de travail housekeeping',
    audit: 'Clôture du',
    reports: 'Calendrier tarifaire',
    settings: 'Paramètres de l’hôtel'
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

  let auditBlocked = false;
  try {
    state.runPMSNightAudit();
  } catch {
    auditBlocked = true;
  }
  assert(auditBlocked, 'La clôture devrait être bloquée en présence d’anomalies');

  console.log(`PMS smoke test: ${Object.keys(tabs).length} onglets et 13 actions critiques validés.`);
} finally {
  await server.close();
}
