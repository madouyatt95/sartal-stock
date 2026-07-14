import { DatabaseState } from '../db';

export type PMSJourneyEventType = 'reservation' | 'room' | 'folio' | 'pos' | 'stock' | 'payment' | 'service' | 'audit';

export interface PMSJourneyEvent {
  id: string;
  type: PMSJourneyEventType;
  date: string;
  title: string;
  detail: string;
  source: string;
  amount?: number;
  correlationId?: string;
}

export interface PMSJourneyCheck {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
}

export interface PMSUnifiedJourney {
  events: PMSJourneyEvent[];
  checks: PMSJourneyCheck[];
  score: number;
  linkedSales: number;
  linkedMovements: number;
}

export const buildPMSUnifiedJourney = (db: DatabaseState, reservationId: string): PMSUnifiedJourney => {
  const reservation = db.pmsReservations.find(item => item.id === reservationId);
  if (!reservation) return { events: [], checks: [], score: 0, linkedSales: 0, linkedMovements: 0 };

  const guest = db.pmsGuests.find(item => item.id === reservation.guestId);
  const room = db.pmsRooms.find(item => item.id === reservation.roomId);
  const folio = db.pmsFolios.find(item => item.reservationId === reservation.id);
  const events: PMSJourneyEvent[] = [{
    id: `journey-${reservation.id}`,
    type: 'reservation',
    date: `${reservation.arrivalDate}T00:00:00.000Z`,
    title: `Réservation ${reservation.confirmationNumber}`,
    detail: `${guest?.fullName || 'Client'} · ${reservation.source} · ${reservation.adults + reservation.children} voyageur(s)`,
    source: 'PMS Réservations',
    correlationId: reservation.confirmationNumber
  }];

  if (room) {
    events.push({
      id: `journey-room-${room.id}`,
      type: 'room',
      date: `${reservation.arrivalDate}T${reservation.estimatedArrivalTime || db.pmsSettings.checkInTime}:00.000Z`,
      title: `Chambre ${room.roomNumber} attribuée`,
      detail: `${room.roomType} · ${room.floor} · entretien ${room.housekeepingStatus}`,
      source: 'PMS Chambres',
      correlationId: reservation.confirmationNumber
    });
  }

  const linkedSales = folio ? db.externalSales.filter(sale => sale.paymentContext.folioId === folio.id || folio.charges.some(charge => charge.saleId === sale.id || charge.externalSaleId === sale.externalSaleId)) : [];
  const linkedMovements = db.movements.filter(movement => linkedSales.some(sale => movement.externalReference === sale.externalSaleId));

  folio?.charges.forEach(charge => {
    events.push({
      id: `journey-charge-${charge.id}`,
      type: 'folio',
      date: charge.date,
      title: charge.label,
      detail: `${charge.status === 'reconciled' ? 'Rapprochée' : charge.status === 'exported' ? 'Envoyée au PMS' : 'À rapprocher'} · fenêtre ${charge.billingWindow || 'guest'}`,
      source: 'PMS Folio',
      amount: charge.amount,
      correlationId: charge.externalSaleId
    });
  });

  folio?.payments.forEach(payment => events.push({
    id: `journey-payment-${payment.id}`,
    type: 'payment',
    date: payment.date,
    title: payment.kind === 'refund' ? 'Remboursement' : payment.kind === 'deposit' ? 'Acompte encaissé' : 'Paiement encaissé',
    detail: `${payment.method.replace('_', ' ')} · ${payment.reference || 'sans référence'}`,
    source: 'PMS Paiements',
    amount: payment.amount,
    correlationId: payment.reference
  }));

  if (!folio) reservation.prepayments?.forEach(payment => events.push({
    id: `journey-prepayment-${payment.id}`,
    type: 'payment',
    date: payment.date,
    title: 'Acompte avant séjour',
    detail: `${payment.method.replace('_', ' ')} · ${payment.reference || 'portail client'}`,
    source: 'Paiements réservation',
    amount: payment.amount,
    correlationId: payment.reference
  }));

  linkedSales.forEach(sale => {
    const pos = db.posList.find(item => item.id === sale.posId);
    events.push({
      id: `journey-sale-${sale.id}`,
      type: 'pos',
      date: sale.date,
      title: `Ticket ${sale.externalSaleId}`,
      detail: `${pos?.name || 'Point de vente'} · ${sale.items.reduce((sum, item) => sum + item.quantity, 0)} article(s) · chambre ${sale.paymentContext.roomNumber || room?.roomNumber || ''}`,
      source: 'POS Sártal',
      amount: sale.paymentContext.amount,
      correlationId: sale.externalSaleId
    });
  });

  linkedMovements.forEach(movement => {
    const product = db.products.find(item => item.id === movement.productId);
    const warehouse = db.warehouses.find(item => item.id === movement.warehouseId);
    events.push({
      id: `journey-movement-${movement.id}`,
      type: 'stock',
      date: movement.date,
      title: `${product?.name || 'Produit'} · ${movement.quantity} ${movement.unit}`,
      detail: `${warehouse?.name || 'Dépôt'} · ${movement.reason}`,
      source: 'Stock Sártal',
      correlationId: movement.externalReference
    });
  });

  db.pmsServiceRequests.filter(request => request.reservationId === reservation.id).forEach(request => events.push({
    id: `journey-service-${request.id}`,
    type: 'service',
    date: request.scheduledAt,
    title: request.label,
    detail: `${request.assignedTo} · ${request.status}`,
    source: 'Services clients',
    amount: request.amount,
    correlationId: reservation.confirmationNumber
  }));

  db.pmsAuditLogs.filter(log => log.entity.includes(reservation.confirmationNumber) || (room && log.entity.includes(`Chambre ${room.roomNumber}`))).forEach(log => events.push({
    id: `journey-audit-${log.id}`,
    type: 'audit',
    date: log.date,
    title: log.action,
    detail: `${log.userName} · ${log.detail}`,
    source: 'Journal de sécurité',
    correlationId: reservation.confirmationNumber
  }));

  const restaurantCharges = folio?.charges.filter(charge => charge.category === 'restaurant') || [];
  const salesMatchAmounts = restaurantCharges.every(charge => {
    const sale = linkedSales.find(item => item.id === charge.saleId || item.externalSaleId === charge.externalSaleId);
    return Boolean(sale && sale.paymentContext.amount === charge.amount);
  });
  const salesPointToFolio = linkedSales.every(sale => sale.paymentContext.folioId === folio?.id && sale.paymentContext.roomNumber === room?.roomNumber);
  const movementsUseExpectedWarehouse = linkedSales.every(sale => {
    const expectedWarehouse = db.posList.find(item => item.id === sale.posId)?.defaultWarehouseId;
    const saleMovements = linkedMovements.filter(item => item.externalReference === sale.externalSaleId);
    return saleMovements.length > 0 && saleMovements.every(item => item.warehouseId === expectedWarehouse);
  });
  const folioCharges = folio?.charges.reduce((sum, charge) => sum + charge.amount, 0) || 0;
  const folioPayments = folio?.payments.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const checks: PMSJourneyCheck[] = [
    { id: 'guest', label: 'Client unique', detail: guest ? `${guest.fullName} relie le séjour, les messages et le folio.` : 'Profil client introuvable.', passed: Boolean(guest) },
    { id: 'room', label: 'Chambre cohérente', detail: room ? `La chambre ${room.roomNumber} est commune à la réservation et aux imputations.` : 'Aucune chambre attribuée.', passed: Boolean(room) },
    { id: 'folio', label: 'Folio du séjour', detail: folio ? `${folio.reservationNumber} · solde ${folioCharges - folioPayments} FCFA.` : 'Le folio sera créé au check-in.', passed: Boolean(folio) },
    { id: 'sale', label: 'Ticket POS rapproché', detail: restaurantCharges.length === 0 ? 'Aucune consommation POS sur ce séjour.' : `${linkedSales.length}/${restaurantCharges.length} ticket(s) retrouvé(s) avec le même montant.`, passed: restaurantCharges.length === 0 || (linkedSales.length === restaurantCharges.length && salesMatchAmounts) },
    { id: 'routing', label: 'Imputation chambre', detail: linkedSales.length ? 'Chaque ticket pointe vers le bon folio et la bonne chambre.' : 'Aucun ticket chambre à contrôler.', passed: linkedSales.length === 0 || salesPointToFolio },
    { id: 'stock', label: 'Dépôt du POS', detail: linkedSales.length ? `${linkedMovements.length} mouvement(s) déduit(s) du dépôt paramétré.` : 'Aucun mouvement lié à contrôler.', passed: linkedSales.length === 0 || movementsUseExpectedWarehouse }
  ];
  const score = Math.round((checks.filter(check => check.passed).length / checks.length) * 100);

  return {
    events: events.sort((a, b) => b.date.localeCompare(a.date)),
    checks,
    score,
    linkedSales: linkedSales.length,
    linkedMovements: linkedMovements.length
  };
};
