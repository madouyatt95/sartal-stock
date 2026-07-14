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

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });

try {
  const { useStockState } = await server.ssrLoadModule('/src/hooks/useStockState.ts');
  const { getDB } = await server.ssrLoadModule('/src/db.ts');
  const { SartalClient } = await server.ssrLoadModule('/src/views/SartalClient.tsx');
  const { CustomerExperienceCockpit } = await server.ssrLoadModule('/src/views/CustomerExperienceCockpit.tsx');
  let state;
  const StateHarness = ({ mode }) => {
    state = useStockState();
    return React.createElement(SartalClient, { state, initialMode: mode, standalone: true });
  };

  const restaurantHtml = renderToStaticMarkup(React.createElement(StateHarness, { mode: 'restaurant' }));
  ['Mon Sártal', 'À table', 'Réserver', 'La carte', 'Ma table'].forEach(marker => assert(restaurantHtml.includes(marker), `Parcours restaurant incomplet : ${marker}`));
  assert(restaurantHtml.includes('Votre table, à votre façon'), 'Accueil personnalisé du restaurant absent');

  const deliveryHtml = renderToStaticMarkup(React.createElement(StateHarness, { mode: 'delivery' }));
  ['Mon Sártal', 'Boutique', 'Panier', 'Suivi', 'Aide'].forEach(marker => assert(deliveryHtml.includes(marker), `Parcours livraison incomplet : ${marker}`));
  assert(deliveryHtml.includes('Les essentiels, vraiment disponibles'), 'Promesse de stock réel absente de la boutique');

  const hubHtml = renderToStaticMarkup(React.createElement(SartalClient, { state, initialMode: 'restaurant', initialCustomerId: 'customer-aminata', initialHub: true, standalone: true }));
  ['Mon Sártal', 'Aujourd', 'Passeport', 'Portefeuille', 'Mon histoire', 'Entrer sans mot de passe'].forEach(marker => assert(hubHtml.includes(marker), `Espace client universel incomplet : ${marker}`));
  const cockpitHtml = renderToStaticMarkup(React.createElement(CustomerExperienceCockpit, { state }));
  ['POSTE EXPÉRIENCE CLIENT', 'Parcours en cours', 'Demandes à tenir', 'Ne laisser personne déçu'].forEach(marker => assert(cockpitHtml.includes(marker), `Cockpit expérience client incomplet : ${marker}`));

  let db = getDB();
  const customer = db.sartalCustomers.find(item => item.id === 'customer-awa');
  const restaurant = db.posList.find(item => item.type === 'restaurant');
  const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const reservationId = state.createRestaurantReservation({ customerId: customer.id, posId: restaurant.id, date: futureDate, time: '20:00', guests: 3, occasion: 'family', notes: 'Table calme' });
  state.updateRestaurantReservation(reservationId, { time: '20:30', guests: 4 });
  assert(getDB().restaurantReservations.find(item => item.id === reservationId).time === '20:30', 'Modification de réservation restaurant non enregistrée');

  const stockBefore = getDB().stocks.find(item => item.productId === 'prod-coca' && item.warehouseId === restaurant.defaultWarehouseId).quantityAvailable;
  const restaurantOrderId = state.placeRestaurantGuestOrder({ customerId: customer.id, posId: restaurant.id, reservationId, tableNumber: 'T08', serviceType: 'dine_in', items: [{ productId: 'prod-coca', quantity: 1 }], paymentMethod: 'wave' });
  db = getDB();
  assert(db.restaurantGuestOrders.some(item => item.id === restaurantOrderId), 'Commande restaurant client non enregistrée');
  assert(db.stocks.find(item => item.productId === 'prod-coca' && item.warehouseId === restaurant.defaultWarehouseId).quantityAvailable === stockBefore - 1, 'Commande restaurant non déduite du bon dépôt');
  assert(db.movements.some(item => item.externalReference === restaurantOrderId), 'Mouvement stock de la commande restaurant absent');
  state.updateRestaurantGuestOrderStatus(restaurantOrderId, 'preparing');
  state.updateRestaurantGuestOrderStatus(restaurantOrderId, 'ready');
  assert(getDB().restaurantGuestOrders.find(item => item.id === restaurantOrderId).readyAt, 'Suivi cuisine non mis à jour');

  state.updateSartalCustomerProfile(customer.id, { preferredLanguage: 'wo', preferredChannel: 'sms', preferences: 'Livraison après 18 h', marketingConsent: false });
  assert(getDB().sartalCustomers.find(item => item.id === customer.id).preferredChannel === 'sms', 'Passeport client non mis à jour');
  const access = state.createSartalClientAccess(customer.id, 'sms');
  assert(access.code.length === 4 && getDB().sartalClientAccess.find(item => item.id === access.id).status === 'active', 'Accès client temporaire non créé');
  const serviceRequestId = state.requestSartalService({ customerId: customer.id, context: 'restaurant', referenceId: restaurantOrderId, type: 'waiter', label: 'Passage du serveur' });
  state.updateSartalServiceRequest(serviceRequestId, 'accepted', 'Moussa · Salle');
  assert(getDB().sartalServiceRequests.find(item => item.id === serviceRequestId).status === 'accepted', 'Demande de service non prise en charge');

  const groupOrder = getDB().restaurantGuestOrders.find(item => item.id === 'REST-CLIENT-204');
  const inviteId = state.inviteRestaurantGuest(groupOrder.id, { fullName: 'Astou Diop', phone: '+221 77 111 22 33' });
  const invitedAmount = state.payRestaurantGuestShare(inviteId, 'orange_money');
  assert(invitedAmount > 0 && getDB().restaurantGuestInvites.find(item => item.id === inviteId).status === 'paid', 'Paiement invité non enregistré');
  const voiceMessageId = state.sendSartalCustomerMessage(customer.id, 'restaurant', 'Note vocale envoyée', restaurantOrderId, 'voice', 'Note vocale · 12 sec');
  assert(getDB().sartalCustomerMessages.find(item => item.id === voiceMessageId).channel === 'voice', 'Message vocal non conservé');

  const hotelCustomer = getDB().sartalCustomers.find(item => item.id === 'customer-aminata');
  const hotelFolio = getDB().pmsFolios.find(item => item.guestId === 'guest-aminata' && item.status === 'open');
  const hotelRoom = getDB().pmsRooms.find(item => item.id === hotelFolio.roomId);
  const roomOrderId = state.placeRestaurantGuestOrder({ customerId: hotelCustomer.id, posId: restaurant.id, serviceType: 'room_service', folioId: hotelFolio.id, roomNumber: hotelRoom.roomNumber, items: [{ productId: 'prod-coca', quantity: 1 }], paymentMethod: 'room_charge' });
  db = getDB();
  assert(db.restaurantGuestOrders.find(item => item.id === roomOrderId).roomNumber === hotelRoom.roomNumber, 'Chambre absente de la commande room service');
  assert(db.pmsFolios.find(item => item.id === hotelFolio.id).charges.some(item => item.externalSaleId === roomOrderId), 'Commande restaurant non imputée au folio PMS');

  const splitOrder = getDB().restaurantGuestOrders.find(item => item.id === 'REST-CLIENT-204');
  const splitRemaining = splitOrder.total - splitOrder.payments.reduce((sum, item) => sum + item.amount, 0);
  state.addRestaurantGuestOrderPayment(splitOrder.id, Math.ceil(splitRemaining / 2), 'wave', 'Aminata');
  state.addRestaurantGuestOrderPayment(splitOrder.id, splitRemaining, 'orange_money', 'Mame');
  assert(getDB().restaurantGuestOrders.find(item => item.id === splitOrder.id).status === 'paid', 'Addition partagée non soldée');

  const pointsBeforeRedemption = getDB().sartalCustomers.find(item => item.id === customer.id).loyaltyPoints;
  state.redeemSartalPoints(customer.id, 500, 'Livraison offerte');
  assert(getDB().sartalCustomers.find(item => item.id === customer.id).loyaltyPoints === pointsBeforeRedemption - 500, 'Utilisation des points non appliquée');

  const address = customer.addresses.find(item => item.isDefault);
  const deliveryOrderId = state.createDeliveryCustomerOrder({ customerId: customer.id, addressId: address.id, items: [{ productId: 'prod-riz-5kg', quantity: 1, substitutionPolicy: 'contact' }], paymentType: 'orange_money' });
  state.updateDeliverySubstitutionPolicy(deliveryOrderId, 'prod-riz-5kg', 'refund');
  db = getDB();
  const deliveryOrder = db.deliveryOrders.find(item => item.id === deliveryOrderId);
  assert(deliveryOrder.status === 'confirmed' && deliveryOrder.paymentStatus === 'paid', 'Commande en ligne non confirmée ou non payée');
  assert(deliveryOrder.items[0].substitutionPolicy === 'refund', 'Choix de substitution non conservé');
  assert(deliveryOrder.landmark && deliveryOrder.verificationCode, 'Adresse locale ou preuve de livraison absente');

  const messageId = state.sendSartalCustomerMessage(customer.id, 'delivery', 'Merci de m’appeler au repère.', deliveryOrderId);
  assert(getDB().sartalCustomerMessages.some(item => item.id === messageId), 'Message client livraison non enregistré');
  const feedbackId = state.submitSartalCustomerFeedback({ customerId: customer.id, context: 'delivery', referenceId: deliveryOrderId, score: 2, note: 'Un produit est endommagé.' });
  db = getDB();
  assert(db.sartalCustomerFeedback.find(item => item.id === feedbackId).recoveryStatus === 'open', 'Réclamation client non ouverte');
  assert(db.deliveryOrders.find(item => item.id === deliveryOrderId).deliveryIssue.includes('endommagé'), 'Incident non rattaché à la commande');
  const pointsBeforeRecovery = db.sartalCustomers.find(item => item.id === customer.id).loyaltyPoints;
  state.resolveSartalCustomerFeedback(feedbackId, 'Produit remplacé et client rappelé.', 250);
  db = getDB();
  assert(db.sartalCustomerFeedback.find(item => item.id === feedbackId).recoveryStatus === 'resolved', 'Reprise client non résolue');
  assert(db.sartalCustomers.find(item => item.id === customer.id).loyaltyPoints === pointsBeforeRecovery + 250, 'Compensation fidélité non créditée');

  state.cancelRestaurantReservation(reservationId);
  assert(getDB().restaurantReservations.find(item => item.id === reservationId).status === 'cancelled', 'Annulation autonome de réservation non enregistrée');

  console.log('Sártal Client smoke test: 12 axes client et 32 contrôles fonctionnels validés.');
} finally {
  await server.close();
}
