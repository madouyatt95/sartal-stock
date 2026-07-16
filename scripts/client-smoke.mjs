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
  const { getDB, saveDB } = await server.ssrLoadModule('/src/db.ts');
  const { SartalClient } = await server.ssrLoadModule('/src/views/SartalClient.tsx');
  const { RestaurantGuestPaymentPortal } = await server.ssrLoadModule('/src/views/RestaurantGuestPaymentPortal.tsx');
  const { getRestaurantProductAvailability } = await server.ssrLoadModule('/src/utils/restaurantService.ts');
  const { SartalClientHub } = await server.ssrLoadModule('/src/views/SartalClientHub.tsx');
  const { CustomerExperienceCockpit } = await server.ssrLoadModule('/src/views/CustomerExperienceCockpit.tsx');
  const { GuidedDemo } = await server.ssrLoadModule('/src/views/GuidedDemo.tsx');
  const { Settings } = await server.ssrLoadModule('/src/views/Settings.tsx');
  const { DeliveryDemo } = await server.ssrLoadModule('/src/views/DeliveryDemo.tsx');
  let state;
  const StateHarness = ({ mode }) => {
    state = useStockState();
    return React.createElement(SartalClient, { state, initialMode: mode, standalone: true });
  };

  const restaurantHtml = renderToStaticMarkup(React.createElement(StateHarness, { mode: 'restaurant' }));
  ['Mon Sártal', 'À table', 'Réserver', 'La carte', 'Ma table'].forEach(marker => assert(restaurantHtml.includes(marker), `Parcours restaurant incomplet : ${marker}`));
  assert(restaurantHtml.includes('Votre table, à votre façon'), 'Accueil personnalisé du restaurant absent');
  assert(!restaurantHtml.includes('Quitter'), 'Le portail client ne doit pas revenir vers le back-office par l’historique navigateur');
  const restaurantAccessHtml = renderToStaticMarkup(React.createElement(SartalClient, { state, initialMode: 'restaurant', standalone: true, requireAccess: true }));
  ['Reconnaissance par téléphone', 'Recevoir mon code', 'Vos préférences restent sous votre contrôle'].forEach(marker => assert(restaurantAccessHtml.includes(marker), `Accès restaurant incomplet : ${marker}`));

  const deliveryHtml = renderToStaticMarkup(React.createElement(StateHarness, { mode: 'delivery' }));
  ['Mon Sártal', 'Boutique', 'Panier', 'Suivi', 'Aide'].forEach(marker => assert(deliveryHtml.includes(marker), `Parcours livraison incomplet : ${marker}`));
  assert(deliveryHtml.includes('Les essentiels, vraiment disponibles'), 'Promesse de stock réel absente de la boutique');
  ['LISTE INTELLIGENTE', 'MODE BUDGET'].forEach(marker => assert(deliveryHtml.includes(marker), `Assistant d’achat absent : ${marker}`));

  const hubHtml = renderToStaticMarkup(React.createElement(SartalClient, { state, initialMode: 'restaurant', initialCustomerId: 'customer-aminata', initialHub: true, standalone: true }));
  ['Mon Sártal', 'Aujourd', 'Passeport', 'Portefeuille', 'Mon histoire', 'Entrer sans mot de passe', 'Ma journée Sártal', 'Mes favoris', 'Commande récurrente'].forEach(marker => assert(hubHtml.includes(marker), `Espace client universel incomplet : ${marker}`));
  const profileHtml = renderToStaticMarkup(React.createElement(SartalClientHub, { state, customerId: 'customer-aminata', initialTab: 'passport', onOpenRestaurant: () => {}, onOpenDelivery: () => {}, onMessage: () => {} }));
  ['Mes réglages', 'Restaurant', 'Livraison', 'Adresses', 'Notifications', 'Confidentialité'].forEach(marker => assert(profileHtml.includes(marker), `Réglages client incomplets : ${marker}`));
  const profileSource = readFileSync(new URL('../src/views/SartalClientProfileCenter.tsx', import.meta.url), 'utf8');
  ['Mon expérience restaurant', 'Mes habitudes de livraison', 'Mes adresses de livraison', 'Confidentialité et appareils'].forEach(marker => assert(profileSource.includes(marker), `Centre de préférences incomplet : ${marker}`));
  const cockpitHtml = renderToStaticMarkup(React.createElement(CustomerExperienceCockpit, { state }));
  ['SUIVI CLIENTS EN DIRECT · ÉQUIPE INTERNE', 'Brief avant service', 'Parcours en cours', 'Demandes à tenir', 'Ne laisser personne déçu', 'Occasions spéciales', 'Liste d’attente intelligente', 'Aperçu réservé aux équipes autorisées'].forEach(marker => assert(cockpitHtml.includes(marker), `Cockpit expérience client incomplet : ${marker}`));
  const guidedHtml = renderToStaticMarkup(React.createElement(GuidedDemo, { state, setView: () => {} }));
  ['Choisissez une histoire client', 'Séjour + dîner', 'Panier de famille', 'Table entre proches'].forEach(marker => assert(guidedHtml.includes(marker), `Présentation commerciale incomplète : ${marker}`));
  const settingsHtml = renderToStaticMarkup(React.createElement(Settings, { state }));
  ['Offre et modules activés', 'Identité des interfaces', 'Nom de l’application client', 'Mode léger par défaut'].forEach(marker => assert(settingsHtml.includes(marker), `Personnalisation établissement incomplète : ${marker}`));
  const deliveryDemoHtml = renderToStaticMarkup(React.createElement(DeliveryDemo, { state, setView: () => {} }));
  assert(deliveryDemoHtml.includes('Preuve de remise'), 'Preuve complète absente du parcours livraison');
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  ['PublicAccessError', 'guestReservationId !== null', 'restaurantInviteToken !== null', 'publicAccessToken !== null', 'publicClientMode !== null'].forEach(marker => assert(appSource.includes(marker), `Protection des routes publiques absente : ${marker}`));
  assert(appSource.includes('if (!accessCustomer)'), 'un jeton orphelin ne doit jamais ouvrir le profil d’un autre client');
  assert((appSource.match(/requireAccess/g) || []).length >= 2, 'Les accès publics client et séjour doivent exiger une vérification');
  const clientSource = readFileSync(new URL('../src/views/SartalClient.tsx', import.meta.url), 'utf8');
  assert(!clientSource.includes('Tester l’accès public'), 'Le cockpit interne ne doit plus proposer de raccourci de test public');
  assert(!clientSource.includes('|| db.sartalCustomers[0]'), 'un profil absent ne doit jamais retomber sur le premier client');
  ['PANIER PARTAGÉ', 'Choisir un créneau réel', 'Modifier ma commande', 'VOTRE CHOIX EST ATTENDU', 'Livraison+', 'Adresse requise'].forEach(marker => assert(clientSource.includes(marker), `Expérience livraison incomplète : ${marker}`));
  ['Mon panier en direct', 'Partager l’addition précisément', 'Parts égales', 'Par convive', 'Par article', 'Espèces à confirmer', 'Ajouter un pourboire', 'Recevoir le reçu', 'SESSION SÉCURISÉE', 'Mauvaise table', 'client-table-mobile-nav', 'appendRestaurantGuestOrderItems'].forEach(marker => assert(clientSource.includes(marker), `Expérience restaurant en direct incomplète : ${marker}`));
  ['getRestaurantProductAvailability', 'getRestaurantProductAlternatives', 'availability.availableUnits', 'presentation.allergens', 'shareGuestInvite'].forEach(marker => assert(clientSource.includes(marker), `Vérité stock ou présentation client absente : ${marker}`));
  assert(!clientSource.includes("payRestaurantGuestShare(invite.id"), 'L’hôte ne doit plus pouvoir payer à la place d’un invité');
  const guestPortalSource = readFileSync(new URL('../src/views/RestaurantGuestPaymentPortal.tsx', import.meta.url), 'utf8');
  ['INVITATION PERSONNELLE', 'Vous voyez uniquement le montant', 'Part personnelle uniquement', 'Un double appui ne peut pas créer un second paiement'].forEach(marker => assert(guestPortalSource.includes(marker), `Portail invité incomplet : ${marker}`));
  assert(!guestPortalSource.includes('restaurant-guest-order-glimpse'), 'Le lien invité ne doit pas exposer les articles ou les autres convives');
  const initialInvite = getDB().restaurantGuestInvites.find(item => item.linkToken);
  const guestPortalHtml = renderToStaticMarkup(React.createElement(RestaurantGuestPaymentPortal, { state, inviteId: initialInvite.id }));
  assert(guestPortalHtml.includes('votre part est prête') && !guestPortalHtml.includes('Mon Sártal'), 'Le portail invité doit rester isolé du compte de l’hôte');

  let db = getDB();
  ['sartalJourneyItems', 'sartalOccasionPlans', 'sartalHouseholds', 'sartalCorporateAccounts', 'sartalRecurringOrders', 'restaurantWaitlist', 'sartalRecoveryPlaybooks', 'sartalOfflineActions', 'sartalDemoRuns'].forEach(collection => assert(Array.isArray(db[collection]), `Collection expérience absente : ${collection}`));
  const customer = db.sartalCustomers.find(item => item.id === 'customer-awa');
  const restaurant = db.posList.find(item => item.type === 'restaurant');

  const firstVisitCustomerId = state.findOrCreateSartalCustomer({ fullName: 'Khady Ndiaye', phone: '+221 77 321 45 67' });
  assert(state.findOrCreateSartalCustomer({ fullName: 'Khady N.', phone: '+221 77 321 45 67' }) === firstVisitCustomerId, 'Un téléphone vérifié ne doit pas créer un second profil');
  state.updateSartalCustomerProfile(firstVisitCustomerId, {
    restaurantPreferences: { seatingArea: 'terrace', servicePace: 'relaxed', dietaryStyle: 'halal', defaultPartySize: 4 },
    deliveryPreferences: { substitutionPolicy: 'refund', dropoffMethod: 'reception', preferredWindow: 'evening', callOnArrival: true, ecoPackaging: true },
    notificationPreferences: { serviceUpdates: true, reservationReminders: true, deliveryTracking: true, loyaltyNews: false },
    privacyPreferences: { shareAcrossServices: false, personalizedRecommendations: true, anonymousAnalytics: false },
    defaultPaymentType: 'orange_money'
  });
  const firstAddressId = state.saveSartalCustomerAddress(firstVisitCustomerId, { label: 'Maison', address: 'Rue 12, Point E', zone: 'Point E / Fann', landmark: 'Près de la pharmacie', instructions: 'Appeler à l’arrivée', isDefault: true });
  await new Promise(resolve => setTimeout(resolve, 2));
  const secondAddressId = state.saveSartalCustomerAddress(firstVisitCustomerId, { label: 'Bureau', address: 'Route des Almadies', zone: 'Ouakam / Almadies', landmark: 'Immeuble Horizon', instructions: 'Remettre à l’accueil', isDefault: false });
  state.setDefaultSartalCustomerAddress(firstVisitCustomerId, secondAddressId);
  state.deleteSartalCustomerAddress(firstVisitCustomerId, firstAddressId);
  const firstVisitCustomer = getDB().sartalCustomers.find(item => item.id === firstVisitCustomerId);
  assert(firstVisitCustomer.addresses.length === 1 && firstVisitCustomer.addresses[0].isDefault, 'Gestion des adresses client incohérente');
  assert(firstVisitCustomer.restaurantPreferences.defaultPartySize === 4 && firstVisitCustomer.defaultPaymentType === 'orange_money', 'Préférences métier du client non conservées');
  const firstVisitAccess = state.createSartalClientAccess(firstVisitCustomerId, 'sms');
  state.revokeSartalClientAccess(firstVisitAccess.id);
  assert(getDB().sartalClientAccess.find(item => item.id === firstVisitAccess.id).status === 'expired', 'Session client non révoquée');
  const guestSessionId = state.createSartalGuestSession('Client table T12');
  assert(getDB().sartalCustomers.find(item => item.id === guestSessionId).guestSession === true, 'Accès restaurant sans profil non créé');

  const journey = db.sartalJourneyItems.find(item => item.customerId === 'customer-aminata' && item.status === 'in_progress');
  state.updateSartalJourneyItemStatus(journey.id, 'completed');
  assert(getDB().sartalJourneyItems.find(item => item.id === journey.id).status === 'completed', 'Étape de journée non terminée');
  const occasion = db.sartalOccasionPlans.find(item => item.id === 'occasion-aminata-family');
  const pendingOccasionTask = occasion.checklist.find(item => !item.completed);
  state.updateSartalOccasionTask(occasion.id, pendingOccasionTask.id, true);
  assert(getDB().sartalOccasionPlans.find(item => item.id === occasion.id).status === 'ready', 'Plan d’occasion non prêt après le dernier contrôle');
  state.completeSartalOccasionPlan(occasion.id);
  assert(getDB().sartalOccasionPlans.find(item => item.id === occasion.id).status === 'completed', 'Plan d’occasion non clôturé');
  const favoriteEnabled = state.toggleFavoriteProduct(customer.id, 'prod-coca');
  assert(favoriteEnabled && getDB().sartalCustomers.find(item => item.id === customer.id).favoriteProductIds.includes('prod-coca'), 'Favori client non ajouté');

  const recurring = getDB().sartalRecurringOrders.find(item => item.customerId === customer.id);
  const recurringOrderId = state.runSartalRecurringOrder(recurring.id);
  assert(getDB().sartalRecurringOrders.find(item => item.id === recurring.id).lastOrderId === recurringOrderId, 'Commande récurrente non exécutée');
  assert(state.toggleSartalRecurringOrder(recurring.id) === false && state.toggleSartalRecurringOrder(recurring.id) === true, 'Activation de commande récurrente incohérente');
  await new Promise(resolve => setTimeout(resolve, 2));

  const household = getDB().sartalHouseholds.find(item => item.id === 'household-diop');
  const householdPointsBefore = household.sharedPoints;
  state.transferSartalHouseholdPoints(household.id, customer.id, 500);
  assert(getDB().sartalHouseholds.find(item => item.id === household.id).sharedPoints === householdPointsBefore - 500, 'Points famille non transférés');
  state.saveSartalHouseholdCart(household.id, customer.id, [{ productId: 'prod-huile-1l', quantity: 2 }]);
  const sharedCart = getDB().sartalHouseholds.find(item => item.id === household.id).sharedCartItems;
  assert(sharedCart.some(item => item.addedByCustomerId === 'customer-aminata') && sharedCart.some(item => item.addedByCustomerId === customer.id && item.quantity === 2), 'Contributions du panier familial non conservées');
  assert(state.toggleSartalDeliveryPlus(customer.id) === 'active', 'Livraison+ non activée');
  assert(getDB().sartalCustomers.find(item => item.id === customer.id).deliveryPlusRenewsAt, 'Renouvellement Livraison+ absent');
  const company = getDB().sartalCorporateAccounts.find(item => item.id === 'corporate-ndar');
  const companyBalanceBefore = company.currentBalance;
  state.chargeSartalCorporateAccount(company.id, 'customer-moussa', 10000);
  assert(getDB().sartalCorporateAccounts.find(item => item.id === company.id).currentBalance === companyBalanceBefore + 10000, 'Compte entreprise non débité');

  const waitlistId = state.joinRestaurantWaitlist(customer.id, restaurant.id, 2);
  state.updateRestaurantWaitlistStatus(waitlistId, 'notified');
  state.updateRestaurantWaitlistStatus(waitlistId, 'seated', 'T08');
  assert(getDB().restaurantWaitlist.find(item => item.id === waitlistId).tableNumber === 'T08', 'Liste d’attente non convertie en table');
  assert(getDB().restaurantReservations.some(item => item.id === `waitlist-table-${waitlistId}` && item.status === 'seated'), 'Table issue de la liste d’attente absente des réservations');

  state.toggleLowBandwidthMode(customer.id, true);
  assert(getDB().sartalCustomers.find(item => item.id === customer.id).lowBandwidthMode === true, 'Mode réseau faible non enregistré');
  const offlineActionId = state.queueSartalOfflineAction(customer.id, 'message', 'Message conservé pendant la coupure');
  assert(getDB().sartalOfflineActions.find(item => item.id === offlineActionId).status === 'queued', 'Action hors connexion non mise en attente');
  assert(state.syncSartalOfflineActions() >= 1 && getDB().sartalOfflineActions.find(item => item.id === offlineActionId).status === 'synced', 'Synchronisation hors connexion non appliquée');

  state.updateSartalBrandSettings({ establishmentName: 'Sártal Signature Dakar', clientAppName: 'Mon Séjour', primaryColor: '#124c45', accentColor: '#f3c451' });
  assert(getDB().sartalBrandSettings.clientAppName === 'Mon Séjour', 'Personnalisation établissement non conservée');
  const scenarioRun = state.runSartalCommercialScenario('hotel_restaurant');
  assert(scenarioRun.evidence.length === 3 && getDB().sartalDemoRuns.some(item => item.id === scenarioRun.id), 'Scénario commercial non vérifié');
  const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const reservationId = state.createRestaurantReservation({ customerId: customer.id, posId: restaurant.id, date: futureDate, time: '20:00', guests: 3, occasion: 'family', notes: 'Table calme' });
  state.updateRestaurantReservation(reservationId, { time: '20:30', guests: 4 });
  assert(getDB().restaurantReservations.find(item => item.id === reservationId).time === '20:30', 'Modification de réservation restaurant non enregistrée');
  assert(getDB().sartalOccasionPlans.some(item => item.reservationId === reservationId && item.checklist.length === 3), 'Préparation d’occasion non créée avec la réservation');

  const stockBefore = getDB().stocks.find(item => item.productId === 'prod-coca' && item.warehouseId === restaurant.defaultWarehouseId).quantityAvailable;
  const customerAvailabilityBefore = getRestaurantProductAvailability(getDB(), restaurant.id, 'prod-coca').availableUnits;
  const loyaltyBeforeRestaurantOrder = getDB().sartalCustomers.find(item => item.id === customer.id).loyaltyPoints;
  const restaurantOrderPayload = { customerId: customer.id, posId: restaurant.id, operationId: 'CLIENT-ORDER-IDEMPOTENT', reservationId, tableNumber: 'T08', serviceType: 'dine_in', items: [{ productId: 'prod-coca', quantity: 1 }], paymentMethod: 'wave' };
  const restaurantOrderId = state.placeRestaurantGuestOrder(restaurantOrderPayload);
  assert(state.placeRestaurantGuestOrder(restaurantOrderPayload) === restaurantOrderId, 'Un double appui client recrée une commande restaurant');
  db = getDB();
  const initialRestaurantOrder = db.restaurantGuestOrders.find(item => item.id === restaurantOrderId);
  assert(initialRestaurantOrder?.paymentStatus === 'pending' && initialRestaurantOrder.payments.length === 0, 'Commande à table encaissée avant le partage de l’addition');
  assert(db.stocks.find(item => item.productId === 'prod-coca' && item.warehouseId === restaurant.defaultWarehouseId).quantityAvailable === stockBefore - 1, 'Commande restaurant non déduite du bon dépôt');
  assert(db.movements.some(item => item.externalReference === restaurantOrderId), 'Mouvement stock de la commande restaurant absent');
  const additionTotal = state.appendRestaurantGuestOrderItems(restaurantOrderId, customer.id, [{ productId: 'prod-coca', quantity: 1, note: 'Très frais' }], 'CLIENT-ADD-IDEMPOTENT');
  assert(state.appendRestaurantGuestOrderItems(restaurantOrderId, customer.id, [{ productId: 'prod-coca', quantity: 1, note: 'Très frais' }], 'CLIENT-ADD-IDEMPOTENT') === additionTotal, 'Un double appui client recrée un complément');
  const addedLineId = getDB().restaurantGuestOrders.find(item => item.id === restaurantOrderId).items.at(-1).id;
  state.updateRestaurantGuestOrderItemNote(restaurantOrderId, customer.id, addedLineId, 'Sans glaçons · allergie vérifiée');
  db = getDB();
  const supplementedOrder = db.restaurantGuestOrders.find(item => item.id === restaurantOrderId);
  assert(supplementedOrder.total === initialRestaurantOrder.total + additionTotal, 'Total du panier restaurant non actualisé après ajout');
  assert(db.stocks.find(item => item.productId === 'prod-coca' && item.warehouseId === restaurant.defaultWarehouseId).quantityAvailable === stockBefore - 2, 'Complément restaurant non déduit du stock réel');
  assert(supplementedOrder.items.find(item => item.id === addedLineId).note.includes('Sans glaçons'), 'Consigne client non transmise à la bonne ligne');
  assert(!supplementedOrder.items.find(item => item.id !== addedLineId && item.productId === 'prod-coca').note, 'Une consigne a modifié une autre ligne du même produit');
  assert(getRestaurantProductAvailability(db, restaurant.id, 'prod-coca').availableUnits === customerAvailabilityBefore - 2, 'La carte client ne reflète pas les consommations du dépôt restaurant');
  assert(db.sartalCustomers.find(item => item.id === customer.id).loyaltyPoints === loyaltyBeforeRestaurantOrder, 'Fidélité créditée avant le règlement de l’addition');
  state.updateRestaurantGuestOrderStatus(restaurantOrderId, 'preparing');
  let lateAdditionBlocked = false;
  try { state.appendRestaurantGuestOrderItems(restaurantOrderId, customer.id, [{ productId: 'prod-coca', quantity: 1 }]); } catch { lateAdditionBlocked = true; }
  assert(lateAdditionBlocked, 'La commande reste modifiable après le démarrage de la cuisine');
  state.updateRestaurantGuestOrderStatus(restaurantOrderId, 'ready');
  assert(getDB().restaurantGuestOrders.find(item => item.id === restaurantOrderId).readyAt, 'Suivi cuisine non mis à jour');
  state.updateRestaurantGuestOrderStatus(restaurantOrderId, 'served');
  const payableRestaurantOrder = getDB().restaurantGuestOrders.find(item => item.id === restaurantOrderId);
  const firstShare = Math.max(1, Math.floor(payableRestaurantOrder.total * 0.35));
  state.addRestaurantGuestOrderPayment(restaurantOrderId, firstShare, 'wave', 'Awa', undefined, { operationId: 'CLIENT-PAY-IDEMPOTENT', tipAmount: 500, receiptChannel: 'whatsapp', source: 'pay_at_table' });
  state.addRestaurantGuestOrderPayment(restaurantOrderId, firstShare, 'wave', 'Awa', undefined, { operationId: 'CLIENT-PAY-IDEMPOTENT', tipAmount: 500, receiptChannel: 'whatsapp', source: 'pay_at_table' });
  state.addRestaurantGuestOrderPayment(restaurantOrderId, payableRestaurantOrder.total, 'orange_money', 'Fatou');
  const paidRestaurantOrder = getDB().restaurantGuestOrders.find(item => item.id === restaurantOrderId);
  assert(paidRestaurantOrder.status === 'paid' && paidRestaurantOrder.paymentStatus === 'paid', 'Addition à table non clôturée après règlement complet');
  assert(paidRestaurantOrder.payments.some(item => item.payerName === 'Awa' && item.amount === firstShare && item.method === 'wave'), 'Montant libre du premier payeur non conservé');
  assert(paidRestaurantOrder.payments.filter(item => item.operationId === 'CLIENT-PAY-IDEMPOTENT').length === 1, 'Un double appui client crée deux paiements');
  assert(paidRestaurantOrder.payments.some(item => item.operationId === 'CLIENT-PAY-IDEMPOTENT' && item.tipAmount === 500 && item.receiptChannel === 'whatsapp' && item.receiptSentAt), 'Pourboire ou reçu client non conservé');
  assert(paidRestaurantOrder.payments.some(item => item.payerName === 'Fatou' && item.method === 'orange_money'), 'Second moyen de paiement non conservé');
  assert(new Set(paidRestaurantOrder.payments.map(item => item.id)).size === paidRestaurantOrder.payments.length, 'Identifiants de paiements restaurant dupliqués');
  assert(getDB().sartalCustomers.find(item => item.id === customer.id).loyaltyPoints === loyaltyBeforeRestaurantOrder + Math.floor(payableRestaurantOrder.total / 500), 'Fidélité non créditée après le paiement complet');

  state.updateSartalCustomerProfile(customer.id, { preferredLanguage: 'wo', preferredChannel: 'sms', preferences: 'Livraison après 18 h', marketingConsent: false });
  assert(getDB().sartalCustomers.find(item => item.id === customer.id).preferredChannel === 'sms', 'Passeport client non mis à jour');
  const access = state.createSartalClientAccess(customer.id, 'sms');
  assert(access.code.length === 4 && getDB().sartalClientAccess.find(item => item.id === access.id).status === 'active', 'Accès client temporaire non créé');
  const serviceRequestId = state.requestSartalService({ customerId: customer.id, context: 'restaurant', referenceId: restaurantOrderId, type: 'waiter', label: 'Passage du serveur' });
  state.updateSartalServiceRequest(serviceRequestId, 'accepted', 'Moussa · Salle');
  assert(getDB().sartalServiceRequests.find(item => item.id === serviceRequestId).status === 'accepted', 'Demande de service non prise en charge');
  const lateDb = getDB();
  lateDb.sartalServiceRequests.find(item => item.id === serviceRequestId).promisedAt = new Date(0).toISOString();
  saveDB(lateDb);
  assert(state.escalateOverdueSartalRequests() >= 1 && getDB().sartalServiceRequests.find(item => item.id === serviceRequestId).assignedTo === 'Responsable expérience client', 'SLA dépassé non escaladé');

  const editableRequestId = state.requestSartalService({ customerId: customer.id, context: 'restaurant', referenceId: restaurantOrderId, type: 'product_help', label: 'Précision sur un article' });
  state.updateCustomerSartalServiceRequest(editableRequestId, customer.id, { note: 'Merci de vérifier la température.' });
  assert(getDB().sartalServiceRequests.find(item => item.id === editableRequestId).note.includes('température'), 'Précision client non conservée avant prise en charge');
  state.cancelCustomerSartalServiceRequest(editableRequestId, customer.id);
  assert(getDB().sartalServiceRequests.find(item => item.id === editableRequestId).status === 'cancelled', 'Annulation client non conservée');

  const cashOrderId = state.placeRestaurantGuestOrder({ customerId: firstVisitCustomerId, posId: restaurant.id, operationId: 'CLIENT-CASH-ORDER', tableNumber: 'T06', serviceType: 'dine_in', items: [{ productId: 'prod-coca', quantity: 1 }], paymentMethod: 'cash' });
  state.updateRestaurantGuestOrderStatus(cashOrderId, 'preparing');
  state.updateRestaurantGuestOrderStatus(cashOrderId, 'ready');
  state.updateRestaurantGuestOrderStatus(cashOrderId, 'served');
  const cashRequestId = state.requestRestaurantCashPayment(cashOrderId, firstVisitCustomerId, 1000, 'Khady', 'CLIENT-CASH-REQUEST', 100, 'email');
  assert(getDB().restaurantGuestOrders.find(item => item.id === cashOrderId).payments.length === 0, 'Les espèces ont été comptées avant confirmation de l’équipe');
  state.updateSartalServiceRequest(cashRequestId, 'accepted', 'Ndeye Fall');
  const cashSessionId = state.openCashSession(restaurant.id, 10000, { id: 'emp-cashier', name: 'Ndeye Fall' });
  assert(state.confirmRestaurantCashPayment(cashRequestId, 'emp-cashier', cashSessionId) === 1000, 'Montant espèces confirmé incorrect');
  assert(state.confirmRestaurantCashPayment(cashRequestId, 'emp-cashier', cashSessionId) === 1000, 'Confirmation espèces idempotente incorrecte');
  const confirmedCashOrder = getDB().restaurantGuestOrders.find(item => item.id === cashOrderId);
  assert(confirmedCashOrder.payments.filter(item => item.operationId === 'cash-confirm-CLIENT-CASH-REQUEST').length === 1, 'Une double confirmation espèces crée deux paiements');
  assert(confirmedCashOrder.payments[0].tipAmount === 100 && confirmedCashOrder.payments[0].receiptChannel === 'email', 'Pourboire ou reçu espèces non conservé');
  assert(getDB().sartalServiceRequests.find(item => item.id === cashRequestId).status === 'completed', 'Demande espèces non clôturée après contrôle');
  assert(getDB().cashSessions.find(item => item.id === cashSessionId).paymentTotals.cash === 1100, 'Caisse non mise à jour avec espèces et pourboire');

  const groupOrder = getDB().restaurantGuestOrders.find(item => item.id === 'REST-CLIENT-204');
  const inviteId = state.inviteRestaurantGuest(groupOrder.id, { fullName: 'Astou Diop', phone: '+221 77 111 22 33', shareAmount: 3200 });
  const issuedInvite = getDB().restaurantGuestInvites.find(item => item.id === inviteId);
  assert(issuedInvite.linkToken && new Date(issuedInvite.expiresAt).getTime() > Date.now(), 'Lien invité temporaire non créé');
  state.joinRestaurantGuestInvite(inviteId);
  assert(getDB().restaurantGuestInvites.find(item => item.id === inviteId).status === 'joined', 'Ouverture du lien invité non tracée');
  const invitedAmount = state.payRestaurantGuestShare(inviteId, 'orange_money', 'INVITE-PAY-IDEMPOTENT');
  assert(state.payRestaurantGuestShare(inviteId, 'orange_money', 'INVITE-PAY-IDEMPOTENT') === invitedAmount, 'Double validation du lien invité non idempotente');
  const paidInvite = getDB().restaurantGuestInvites.find(item => item.id === inviteId);
  assert(invitedAmount === 3200 && paidInvite.status === 'paid' && paidInvite.paidAmount === 3200 && paidInvite.paymentMethod === 'orange_money', 'Montant exact du paiement invité non enregistré');
  assert(getDB().restaurantGuestOrders.find(item => item.id === groupOrder.id).payments.filter(item => item.operationId === 'INVITE-PAY-IDEMPOTENT').length === 1, 'Paiement invité dupliqué sur l’addition');
  const voiceMessageId = state.sendSartalCustomerMessage(customer.id, 'restaurant', 'Note vocale envoyée', restaurantOrderId, 'voice', 'Note vocale · 12 sec');
  assert(getDB().sartalCustomerMessages.find(item => item.id === voiceMessageId).channel === 'voice', 'Message vocal non conservé');

  const hotelCustomer = getDB().sartalCustomers.find(item => item.id === 'customer-aminata');
  const hotelFolio = getDB().pmsFolios.find(item => item.guestId === 'guest-aminata' && item.status === 'open');
  const hotelRoom = getDB().pmsRooms.find(item => item.id === hotelFolio.roomId);
  const roomOrderId = state.placeRestaurantGuestOrder({ customerId: hotelCustomer.id, posId: restaurant.id, serviceType: 'room_service', folioId: hotelFolio.id, roomNumber: hotelRoom.roomNumber, items: [{ productId: 'prod-coca', quantity: 1 }], paymentMethod: 'room_charge' });
  db = getDB();
  assert(db.restaurantGuestOrders.find(item => item.id === roomOrderId).roomNumber === hotelRoom.roomNumber, 'Chambre absente de la commande room service');
  assert(db.pmsFolios.find(item => item.id === hotelFolio.id).charges.some(item => item.externalSaleId === roomOrderId), 'Commande restaurant non imputée au folio PMS');

  assert(state.attachRestaurantOrderFolio(groupOrder.id, hotelCustomer.id, hotelFolio.id) === hotelRoom.roomNumber, 'Folio actif non rattaché à l’addition de la table');
  const folioLinkedOrder = getDB().restaurantGuestOrders.find(item => item.id === groupOrder.id);
  const seatOneTotal = folioLinkedOrder.items.filter(item => item.seatNumber === 1).reduce((sum, item) => sum + item.quantity * item.salePrice, 0);
  state.addRestaurantGuestOrderPayment(groupOrder.id, seatOneTotal, 'room_charge', hotelCustomer.fullName, undefined, { seatNumbers: [1], operationId: 'CLIENT-FOLIO-SEAT', receiptChannel: 'email', source: 'folio' });
  assert(getDB().restaurantGuestOrders.find(item => item.id === groupOrder.id).payments.some(item => item.operationId === 'CLIENT-FOLIO-SEAT' && item.seatNumbers.includes(1) && item.receiptChannel === 'email'), 'Paiement par convive ou reçu folio non conservé');
  assert(getDB().pmsFolios.find(item => item.id === hotelFolio.id).charges.some(item => item.externalSaleId === groupOrder.id), 'Paiement de table non imputé au folio vérifié');
  const paidSeatLine = folioLinkedOrder.items.find(item => item.seatNumber === 1 && item.id);
  let crossedAllocationBlocked = false;
  try { state.addRestaurantGuestOrderPayment(groupOrder.id, paidSeatLine.salePrice * paidSeatLine.quantity, 'wave', 'Double allocation', undefined, { itemIds: [paidSeatLine.id], operationId: 'CLIENT-CROSS-ALLOCATION' }); }
  catch (error) { crossedAllocationBlocked = error instanceof Error && error.message.includes('déjà comprise'); }
  assert(crossedAllocationBlocked, 'Un article déjà inclus dans une part par convive peut être réglé une seconde fois');

  let foreignFolioBlocked = false;
  try {
    state.placeRestaurantGuestOrder({ customerId: firstVisitCustomerId, posId: restaurant.id, operationId: 'CLIENT-FOREIGN-FOLIO', folioId: hotelFolio.id, roomNumber: hotelRoom.roomNumber, serviceType: 'room_service', items: [{ productId: 'prod-coca', quantity: 1 }], paymentMethod: 'room_charge' });
  } catch (error) { foreignFolioBlocked = error instanceof Error && error.message.includes('séjour actif'); }
  assert(foreignFolioBlocked, 'Un client peut imputer une commande sur le folio d’un autre séjour');

  const itemOrderId = state.placeRestaurantGuestOrder({ customerId: firstVisitCustomerId, posId: restaurant.id, operationId: 'CLIENT-ITEM-ORDER', tableNumber: 'T07', serviceType: 'dine_in', items: [{ productId: 'prod-coca', quantity: 1 }], paymentMethod: 'wave' });
  state.updateRestaurantGuestOrderStatus(itemOrderId, 'preparing');
  state.updateRestaurantGuestOrderStatus(itemOrderId, 'ready');
  state.updateRestaurantGuestOrderStatus(itemOrderId, 'served');
  const itemLine = getDB().restaurantGuestOrders.find(item => item.id === itemOrderId).items[0];
  state.addRestaurantGuestOrderPayment(itemOrderId, itemLine.salePrice, 'wave', 'Khady', undefined, { itemIds: [itemLine.id], operationId: 'CLIENT-ITEM-PAY', receiptChannel: 'whatsapp' });
  assert(getDB().restaurantGuestOrders.find(item => item.id === itemOrderId).payments.some(item => item.itemIds?.includes(itemLine.id)), 'Paiement par article non conservé');

  const splitOrder = getDB().restaurantGuestOrders.find(item => item.id === 'REST-CLIENT-204');
  const splitRemaining = splitOrder.total - splitOrder.payments.reduce((sum, item) => sum + item.amount, 0);
  state.addRestaurantGuestOrderPayment(splitOrder.id, Math.ceil(splitRemaining / 2), 'wave', 'Aminata');
  state.addRestaurantGuestOrderPayment(splitOrder.id, splitRemaining, 'orange_money', 'Mame');
  assert(getDB().restaurantGuestOrders.find(item => item.id === splitOrder.id).status === 'paid', 'Addition partagée non soldée');
  const restaurantFeedbackId = state.submitSartalCustomerFeedback({ customerId: hotelCustomer.id, context: 'restaurant', referenceId: splitOrder.id, score: 5, note: 'Service attentionné.' });
  assert(getDB().sartalCustomerFeedback.some(item => item.id === restaurantFeedbackId && item.context === 'restaurant'), 'Retour post-paiement restaurant non conservé');

  const pointsBeforeRedemption = getDB().sartalCustomers.find(item => item.id === customer.id).loyaltyPoints;
  state.redeemSartalPoints(customer.id, 500, 'Livraison offerte');
  assert(getDB().sartalCustomers.find(item => item.id === customer.id).loyaltyPoints === pointsBeforeRedemption - 500, 'Utilisation des points non appliquée');

  const address = customer.addresses.find(item => item.isDefault);
  const firstSlot = { id: 'slot-test-18-19', label: 'mer. 15 juil. · 18h–19h', feeDelta: 300, capacity: 1 };
  const secondSlot = { id: 'slot-test-19-20', label: 'mer. 15 juil. · 19h–20h', feeDelta: 0, capacity: 1 };
  const deliveryOrderId = state.createDeliveryCustomerOrder({ customerId: customer.id, addressId: address.id, items: [{ productId: 'prod-riz-5kg', quantity: 1, substitutionPolicy: 'contact' }, { productId: 'prod-coca', quantity: 1, substitutionPolicy: 'contact' }], paymentType: 'orange_money', deliverySlot: firstSlot });
  state.updateDeliverySubstitutionPolicy(deliveryOrderId, 'prod-riz-5kg', 'refund');
  const editAdjustment = state.updateConfirmedDeliveryOrder(deliveryOrderId, customer.id, { items: [{ productId: 'prod-riz-5kg', quantity: 2, substitutionPolicy: 'refund' }, { productId: 'prod-coca', quantity: 1, substitutionPolicy: 'contact' }], deliverySlot: secondSlot });
  assert(editAdjustment === 4500, 'Ajustement de commande incorrect');
  const substitutionDb = getDB();
  const substitutionOrder = substitutionDb.deliveryOrders.find(item => item.id === deliveryOrderId);
  const cocaLine = substitutionOrder.items.find(item => item.productId === 'prod-coca');
  cocaLine.substitutionProductId = 'prod-jus-bissap';
  cocaLine.substitutionStatus = 'proposed';
  saveDB(substitutionDb);
  state.decideDeliverySubstitution(deliveryOrderId, customer.id, 'prod-coca', 'approved');
  db = getDB();
  const deliveryOrder = db.deliveryOrders.find(item => item.id === deliveryOrderId);
  assert(deliveryOrder.status === 'confirmed' && deliveryOrder.paymentStatus === 'pending', 'Commande modifiée non confirmée ou paiement non réajusté');
  assert(deliveryOrder.items[0].substitutionPolicy === 'refund', 'Choix de substitution non conservé');
  assert(deliveryOrder.deliveryFee === 0 && deliveryOrder.deliverySlotId === secondSlot.id, 'Avantage Livraison+ ou créneau non conservé');
  assert(deliveryOrder.items.some(item => item.productId === 'prod-jus-bissap' && item.originalProductId === 'prod-coca' && item.substitutionStatus === 'approved'), 'Substitution client non appliquée');
  let duplicateDecisionBlocked = false;
  try { state.decideDeliverySubstitution(deliveryOrderId, customer.id, 'prod-coca', 'rejected'); } catch { duplicateDecisionBlocked = true; }
  assert(duplicateDecisionBlocked, 'Une substitution déjà décidée ne doit pas être rejouée');
  let fullSlotBlocked = false;
  try { state.createDeliveryCustomerOrder({ customerId: customer.id, addressId: address.id, items: [{ productId: 'prod-huile-1l', quantity: 1, substitutionPolicy: 'contact' }], paymentType: 'wave', deliverySlot: secondSlot }); } catch { fullSlotBlocked = true; }
  assert(fullSlotBlocked, 'Un créneau complet ne doit pas accepter une commande supplémentaire');
  assert(deliveryOrder.landmark && deliveryOrder.verificationCode, 'Adresse locale ou preuve de livraison absente');
  assert(state.reserveDeliveryOrder(deliveryOrderId).success, 'Réservation stock livraison impossible');
  let editBlocked = false;
  try { state.updateConfirmedDeliveryOrder(deliveryOrderId, customer.id, { items: [{ productId: 'prod-riz-5kg', quantity: 1, substitutionPolicy: 'contact' }] }); } catch { editBlocked = true; }
  assert(editBlocked, 'Une commande réservée ne doit plus être modifiable par le client');
  assert(state.startDeliveryPreparation(deliveryOrderId).success, 'Préparation livraison impossible');
  assert(state.markDeliveryReady(deliveryOrderId).success, 'Commande livraison non marquée prête');
  assert(state.dispatchDeliveryOrder(deliveryOrderId).success, 'Départ livreur impossible');
  assert(!state.deliverDeliveryOrder(deliveryOrderId).success, 'Livraison clôturée sans preuve complète');
  state.completeDeliveryProof(deliveryOrderId, { code: deliveryOrder.verificationCode, signature: customer.fullName, photoLabel: `Remise ${deliveryOrderId}`, latitude: 14.7167, longitude: -17.4677 });
  assert(state.deliverDeliveryOrder(deliveryOrderId).success, 'Livraison avec preuve complète non validée');
  assert(getDB().deliveryOrders.find(item => item.id === deliveryOrderId).proofStatus === 'photo_confirmed', 'Preuve complète non conservée');

  const messageId = state.sendSartalCustomerMessage(customer.id, 'delivery', 'Merci de m’appeler au repère.', deliveryOrderId);
  assert(getDB().sartalCustomerMessages.some(item => item.id === messageId), 'Message client livraison non enregistré');
  const feedbackId = state.submitSartalCustomerFeedback({ customerId: customer.id, context: 'delivery', referenceId: deliveryOrderId, score: 2, note: 'Un produit est endommagé.' });
  db = getDB();
  assert(db.sartalCustomerFeedback.find(item => item.id === feedbackId).recoveryStatus === 'open', 'Réclamation client non ouverte');
  assert(db.deliveryOrders.find(item => item.id === deliveryOrderId).deliveryIssue.includes('endommagé'), 'Incident non rattaché à la commande');
  const pointsBeforeRecovery = db.sartalCustomers.find(item => item.id === customer.id).loyaltyPoints;
  state.applySartalRecoveryPlaybook(feedbackId, 'playbook-delivery-product');
  db = getDB();
  assert(db.sartalCustomerFeedback.find(item => item.id === feedbackId).recoveryStatus === 'resolved', 'Reprise client non résolue');
  assert(db.sartalCustomers.find(item => item.id === customer.id).loyaltyPoints === pointsBeforeRecovery + 250, 'Compensation fidélité non créditée');

  state.cancelRestaurantReservation(reservationId);
  assert(getDB().restaurantReservations.find(item => item.id === reservationId).status === 'cancelled', 'Annulation autonome de réservation non enregistrée');

  console.log('Sártal Client smoke test: 20 axes premium et plus de 80 contrôles fonctionnels validés.');
} finally {
  await server.close();
}
