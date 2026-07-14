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
  let state;
  const StateHarness = ({ mode }) => {
    state = useStockState();
    return React.createElement(SartalClient, { state, initialMode: mode, standalone: true });
  };

  const restaurantHtml = renderToStaticMarkup(React.createElement(StateHarness, { mode: 'restaurant' }));
  ['À table', 'Réserver', 'La carte', 'Ma table', 'Fidélité'].forEach(marker => assert(restaurantHtml.includes(marker), `Parcours restaurant incomplet : ${marker}`));
  assert(restaurantHtml.includes('Votre table, à votre façon'), 'Accueil personnalisé du restaurant absent');

  const deliveryHtml = renderToStaticMarkup(React.createElement(StateHarness, { mode: 'delivery' }));
  ['Boutique', 'Panier', 'Suivi', 'Aide', 'Fidélité'].forEach(marker => assert(deliveryHtml.includes(marker), `Parcours livraison incomplet : ${marker}`));
  assert(deliveryHtml.includes('Les essentiels, vraiment disponibles'), 'Promesse de stock réel absente de la boutique');

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

  const hotelCustomer = getDB().sartalCustomers.find(item => item.id === 'customer-aminata');
  const hotelFolio = getDB().pmsFolios.find(item => item.guestId === 'guest-aminata' && item.status === 'open');
  const hotelRoom = getDB().pmsRooms.find(item => item.id === hotelFolio.roomId);
  const roomOrderId = state.placeRestaurantGuestOrder({ customerId: hotelCustomer.id, posId: restaurant.id, serviceType: 'room_service', folioId: hotelFolio.id, roomNumber: hotelRoom.roomNumber, items: [{ productId: 'prod-coca', quantity: 1 }], paymentMethod: 'room_charge' });
  db = getDB();
  assert(db.restaurantGuestOrders.find(item => item.id === roomOrderId).roomNumber === hotelRoom.roomNumber, 'Chambre absente de la commande room service');
  assert(db.pmsFolios.find(item => item.id === hotelFolio.id).charges.some(item => item.externalSaleId === roomOrderId), 'Commande restaurant non imputée au folio PMS');

  const splitOrder = getDB().restaurantGuestOrders.find(item => item.id === 'REST-CLIENT-204');
  state.addRestaurantGuestOrderPayment(splitOrder.id, 10000, 'wave', 'Aminata');
  state.addRestaurantGuestOrderPayment(splitOrder.id, 9500, 'orange_money', 'Mame');
  assert(getDB().restaurantGuestOrders.find(item => item.id === splitOrder.id).status === 'paid', 'Addition partagée non soldée');

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

  state.cancelRestaurantReservation(reservationId);
  assert(getDB().restaurantReservations.find(item => item.id === reservationId).status === 'cancelled', 'Annulation autonome de réservation non enregistrée');

  console.log('Sártal Client smoke test: 12 axes client et 20 contrôles fonctionnels validés.');
} finally {
  await server.close();
}
