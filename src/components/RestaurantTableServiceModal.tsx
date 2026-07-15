import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BellRing,
  CheckCircle2,
  Clock3,
  DoorOpen,
  HandCoins,
  History,
  MapPin,
  QrCode,
  ReceiptText,
  Sparkles,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { hasEmployeePermission } from '../employeePermissions';
import type { StockState } from '../hooks/useStockState';
import type { RestaurantFloorAuditEntry } from '../types';
import { getRestaurantTableSuggestions } from '../utils/restaurantService';
import RestaurantTableOrderPanel from './RestaurantTableOrderPanel';
import RestaurantTablePaymentPanel from './RestaurantTablePaymentPanel';

export type RestaurantTableServiceTab = 'summary' | 'order' | 'bill' | 'client' | 'history';

interface RestaurantTableServiceModalProps {
  state: StockState;
  posId: string;
  tableId: string;
  editable?: boolean;
  operatorId?: string;
  operatorName: string;
  initialTab?: RestaurantTableServiceTab;
  onClose: () => void;
  onTableChange?: (tableId: string) => void;
}

const STATUS_LABELS = { free: 'Libre', reserved: 'Réservée', occupied: 'Installée', kitchen: 'En cuisine', ready: 'À servir', bill: 'Addition' } as const;
const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;
const operationId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const RestaurantTableServiceModal: React.FC<RestaurantTableServiceModalProps> = ({ state, posId, tableId, editable = false, operatorId, operatorName, initialTab = 'summary', onClose, onTableChange }) => {
  const { db } = state;
  const table = db.restaurantDiningTables.find(item => item.id === tableId && item.posId === posId && item.active);
  const today = new Date().toISOString().slice(0, 10);
  const activeOrder = table ? db.restaurantGuestOrders.find(item => item.posId === posId && item.tableNumber === table.label && !['paid', 'cancelled'].includes(item.status)) : undefined;
  const activeReservation = table ? db.restaurantReservations.find(item => item.posId === posId && item.tableNumber === table.label && item.date === today && ['confirmed', 'seated'].includes(item.status)) : undefined;
  const [tab, setTab] = useState<RestaurantTableServiceTab>(initialTab);
  const [focusedOrderId, setFocusedOrderId] = useState(activeOrder?.id || '');
  const [walkIn, setWalkIn] = useState({ name: 'Client de passage', guests: 2 });
  const [reservationChoice, setReservationChoice] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [pending, setPending] = useState('');
  const pendingRef = useRef(false);
  const walkInOperationRef = useRef(operationId(`WALKIN-${tableId}`));
  const qrOperationRef = useRef(operationId(`QR-${tableId}`));
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string }>();

  useEffect(() => { setTab(initialTab); }, [initialTab, tableId]);
  useEffect(() => {
    if (activeOrder?.id) setFocusedOrderId(activeOrder.id);
  }, [activeOrder?.id]);

  const order = db.restaurantGuestOrders.find(item => item.id === focusedOrderId) || activeOrder;
  const reservation = activeReservation || (order?.reservationId ? db.restaurantReservations.find(item => item.id === order.reservationId) : undefined);
  const customer = db.sartalCustomers.find(item => item.id === (order?.customerId || reservation?.customerId));
  const waiters = db.employeeProfiles.filter(item => item.active && item.role === 'waiter' && item.posId === posId);
  const waiter = waiters.find(item => item.id === table?.assignedEmployeeId);
  const operator = operatorId ? db.employeeProfiles.find(item => item.id === operatorId && item.active) : undefined;
  const canCollect = Boolean(operator && hasEmployeePermission(operator, 'table_payment'));
  const request = activeOrder ? db.sartalServiceRequests.find(item => item.referenceId === activeOrder.id && !['completed', 'cancelled'].includes(item.status)) : undefined;
  const access = customer ? db.sartalClientAccess.find(item => item.customerId === customer.id && item.status === 'active' && item.destination === `Table ${table?.label}`) : undefined;
  const upcomingReservation = table ? db.restaurantReservations.filter(item => item.posId === posId && item.tableNumber === table.label && item.date > today && item.status === 'confirmed').sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0] : undefined;
  const unassignedReservations = db.restaurantReservations.filter(item => item.posId === posId && item.date >= today && item.status === 'confirmed' && !item.tableNumber).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const activeWaitlist = db.restaurantWaitlist.filter(item => item.posId === posId && ['waiting', 'notified'].includes(item.status)).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  const freeTransferTargets = db.restaurantDiningTables.filter(candidate => candidate.posId === posId && candidate.active && candidate.id !== tableId && !candidate.blockedReason && !db.restaurantGuestOrders.some(item => item.posId === posId && item.tableNumber === candidate.label && !['paid', 'cancelled'].includes(item.status)) && !db.restaurantReservations.some(item => item.posId === posId && item.tableNumber === candidate.label && item.date === today && ['confirmed', 'seated'].includes(item.status)));
  const paid = order?.payments.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const remaining = Math.max(0, (order?.total || 0) - paid);
  const productionStarted = Boolean(activeOrder && (activeOrder.status === 'preparing' || activeOrder.items.some(item => ['sent', 'preparing', 'ready'].includes(item.status || 'held'))));
  const status = activeOrder?.status === 'ready' ? 'ready' : activeOrder?.status === 'served' ? 'bill' : productionStarted ? 'kitchen' : activeOrder || activeReservation?.status === 'seated' ? 'occupied' : activeReservation?.status === 'confirmed' ? 'reserved' : 'free';
  const smartScore = useMemo(() => table ? getRestaurantTableSuggestions(db, posId, walkIn.guests, customer?.id, 50).find(item => item.table.id === table.id) : undefined, [customer?.id, db, posId, table, walkIn.guests]);

  const timeline = useMemo(() => {
    if (!table) return [];
    const rows: Array<{ id: string; date: string; label: string; actor: string; operationId?: string; action?: RestaurantFloorAuditEntry['action'] }> = [];
    order?.serviceEvents?.forEach(event => rows.push({ id: event.id, date: event.createdAt, label: event.label, actor: event.actor, operationId: event.operationId }));
    db.restaurantFloorAudit.filter(entry => entry.posId === posId && (entry.metadata?.tableId === table.id || entry.metadata?.sourceTableId === table.id || entry.metadata?.targetTableId === table.id || entry.metadata?.orderId === order?.id || entry.summary.includes(table.label))).forEach(entry => rows.push({ id: entry.id, date: entry.createdAt, label: entry.summary, actor: entry.actor, operationId: typeof entry.metadata?.operationId === 'string' ? entry.metadata.operationId : undefined, action: entry.action }));
    if (reservation) rows.push({ id: `reservation-${reservation.id}`, date: reservation.createdAt, label: `Réservation ${reservation.status} · ${reservation.guests} personne(s)`, actor: customer?.fullName || 'Accueil' });
    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  }, [customer?.fullName, db.restaurantFloorAudit, order, posId, reservation, table]);

  if (!table) return null;

  const execute = <T,>(key: string, action: () => T, success: string, onSuccess?: (result: T) => void) => {
    if (pendingRef.current) return undefined;
    pendingRef.current = true;
    setPending(key);
    try {
      const result = action();
      setNotice({ tone: 'success', text: success });
      onSuccess?.(result);
      return result;
    } catch (error) {
      setNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Action impossible' });
      return undefined;
    } finally {
      window.setTimeout(() => {
        pendingRef.current = false;
        setPending('');
      }, 400);
    }
  };

  const openOrder = () => execute('open-order', () => state.openRestaurantTableOrder(table.id, operatorName, operationId(`OPEN-${table.id}`)), 'Commande ouverte et reliée à cette table.', id => {
    setFocusedOrderId(id);
    setTab('order');
  });

  const seatReservationAndOrder = () => {
    if (!activeReservation) return;
    execute('seat-reservation', () => {
      state.seatRestaurantReservation(activeReservation.id, table.id, operatorName, `SEAT-${activeReservation.id}-${table.id}`);
      return state.openRestaurantTableOrder(table.id, operatorName, `OPEN-${activeReservation.id}-${table.id}`);
    }, 'Arrivée confirmée. La commande est prête à être saisie.', id => {
      setFocusedOrderId(id);
      setTab('order');
    });
  };

  const seatWalkInAndOrder = () => execute('walk-in', () => {
    const result = state.seatRestaurantWalkIn({ tableId: table.id, guestName: walkIn.name, guests: walkIn.guests, actor: operatorName, operationId: walkInOperationRef.current });
    const id = state.openRestaurantTableOrder(table.id, operatorName, `OPEN-${walkInOperationRef.current}`);
    return { ...result, orderId: id };
  }, `${walkIn.name || 'Client'} installé et commande ouverte.`, result => {
    setFocusedOrderId(result.orderId);
    setTab('order');
    walkInOperationRef.current = operationId(`WALKIN-${table.id}`);
  });

  const createAccess = () => execute('qr', () => state.createRestaurantTableQR(table.id, operatorName, qrOperationRef.current), 'Accès client créé.', result => {
    qrOperationRef.current = operationId(`QR-${table.id}`);
    setNotice({ tone: 'success', text: `Accès QR créé. Code client : ${result.code}` });
  });

  const tabs: Array<{ id: RestaurantTableServiceTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'summary', label: 'Synthèse', icon: <Sparkles size={16} /> },
    { id: 'order', label: 'Commande', icon: <ReceiptText size={16} />, badge: activeOrder?.items.filter(item => item.status !== 'voided').length },
    { id: 'bill', label: 'Addition', icon: <HandCoins size={16} />, badge: order?.payments.length },
    { id: 'client', label: 'Client', icon: <Users size={16} /> },
    { id: 'history', label: 'Historique', icon: <History size={16} />, badge: timeline.length }
  ];

  return <div className="restaurant-table-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <aside className={`restaurant-table-service-modal restaurant-table-modal-shell ${status}`} role="dialog" aria-modal="true" aria-label={`Actions table ${table.label}`} onMouseDown={event => event.stopPropagation()}>
      <header className="restaurant-table-service-header"><div><span>{STATUS_LABELS[status]}</span><h2>Table {table.label}</h2><p>{table.capacity} places · {table.zone}{waiter ? ` · ${waiter.name}` : ''}</p></div><button type="button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></header>
      <nav className="restaurant-table-service-tabs" aria-label="Détails de la table">{tabs.map(item => <button type="button" className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => setTab(item.id)}>{item.icon}<span>{item.label}</span>{Boolean(item.badge) && <b>{item.badge}</b>}</button>)}</nav>

      <div className="restaurant-table-service-content">
        {tab === 'summary' && <section className="restaurant-table-summary">
          <div className="restaurant-table-summary-grid">
            <article><small>État du service</small><strong>{STATUS_LABELS[status]}</strong><span>{activeOrder ? `${Math.max(0, Math.round((Date.now() - new Date(activeOrder.createdAt).getTime()) / 60000))} min depuis la commande` : activeReservation ? `${activeReservation.guests} personne(s) · ${activeReservation.time}` : 'Disponible maintenant'}</span></article>
            <article><small>Addition</small><strong>{order ? formatFCFA(remaining) : 'Aucune'}</strong><span>{order?.payments.length ? `${order.payments.length} règlement(s)` : 'À ouvrir avec la commande'}</span></article>
            <article><small>Responsable</small><strong>{waiter?.name || 'Équipe commune'}</strong><span>{request ? `Demande ${request.priority}` : 'Aucune demande en retard'}</span></article>
          </div>

          {editable && <label className="restaurant-floor-waiter-select">Réaffecter la table<select value={table.assignedEmployeeId || ''} onChange={event => execute('waiter', () => state.assignRestaurantDiningTableWaiter(table.id, event.target.value || undefined), 'Affectation mise à jour en direct.')}><option value="">Équipe commune</option>{waiters.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
          {customer ? <div className="restaurant-floor-customer"><Users size={18} /><span><small>Client</small><strong>{customer.fullName}</strong>{customer.allergies && <em>Allergie : {customer.allergies}</em>}</span></div> : <div className="restaurant-floor-customer"><Users size={18} /><span><small>Disponibilité</small><strong>Prête à accueillir</strong></span></div>}
          {activeReservation && <div className="restaurant-floor-reservation"><MapPin size={16} /><span><strong>{activeReservation.guests} personne(s) à {activeReservation.time}</strong><small>{activeReservation.notes || 'Réservation confirmée'}</small></span></div>}
          {!activeReservation && upcomingReservation && <div className="restaurant-floor-reservation future"><MapPin size={16} /><span><strong>Prochaine réservation · {new Date(`${upcomingReservation.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {upcomingReservation.time}</strong><small>La table reste libre pour le service actuel.</small></span></div>}

          {status === 'free' && <section className="restaurant-smart-table-card"><header><Sparkles size={18} /><span><strong>{smartScore ? `${smartScore.score}% compatible` : 'Placement à vérifier'}</strong><small>{smartScore?.reasons.join(' · ') || 'Ajustez le nombre de personnes.'}</small></span></header><div><input value={walkIn.name} onChange={event => setWalkIn({ ...walkIn, name: event.target.value })} placeholder="Nom du client" /><input type="number" min="1" max={table.capacity} value={walkIn.guests} onChange={event => setWalkIn({ ...walkIn, guests: Number(event.target.value) || 1 })} /><button type="button" disabled={Boolean(pending)} onClick={seatWalkInAndOrder}><UserPlus size={16} /> Installer et commander</button></div>{unassignedReservations.length > 0 && <footer><select value={reservationChoice} onChange={event => setReservationChoice(event.target.value)}><option value="">Affecter une réservation</option>{unassignedReservations.filter(item => item.guests <= table.capacity).map(item => <option key={item.id} value={item.id}>{item.date === today ? 'Aujourd’hui' : new Date(`${item.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {item.time} · {db.sartalCustomers.find(customerItem => customerItem.id === item.customerId)?.fullName} · {item.guests} pers.</option>)}</select><button type="button" disabled={!reservationChoice || Boolean(pending)} onClick={() => execute('assign-reservation', () => state.assignRestaurantReservationTable(reservationChoice, table.id, operatorName), 'Table planifiée sans installer prématurément le client.', () => setReservationChoice(''))}><MapPin size={16} /> Planifier</button></footer>}</section>}
          {status === 'reserved' && <button type="button" className="restaurant-floor-primary" disabled={Boolean(pending)} onClick={seatReservationAndOrder}><DoorOpen size={16} /> Installer et prendre la commande</button>}
          {status === 'occupied' && !activeOrder && <button type="button" className="restaurant-floor-primary" disabled={Boolean(pending)} onClick={openOrder}><ReceiptText size={16} /> Ouvrir et prendre la commande</button>}
          {activeOrder && <button type="button" className="restaurant-floor-primary restaurant-floor-order-button" onClick={() => setTab('order')}><ReceiptText size={16} /> Prendre ou compléter la commande</button>}
          {request && <button type="button" className="restaurant-floor-primary" onClick={() => execute('request', () => state.updateSartalServiceRequest(request.id, request.status === 'requested' ? 'accepted' : 'completed', operatorName), 'Demande client mise à jour.')}><BellRing size={16} /> {request.status === 'requested' ? 'Prendre la demande' : 'Confirmer effectué'}</button>}
          {!request && activeOrder?.status === 'ready' && <button type="button" className="restaurant-floor-primary" onClick={() => execute('serve', () => state.updateRestaurantGuestOrderStatus(activeOrder.id, 'served'), `${table.label} marquée servie.`)}><CheckCircle2 size={16} /> Confirmer le service</button>}
          {activeOrder?.status === 'served' && <div className="restaurant-table-bill-actions"><button type="button" className="restaurant-floor-primary" onClick={() => setTab('bill')}><HandCoins size={17} /> {canCollect ? 'Encaisser à table' : 'Voir l’addition'}</button><button type="button" className="restaurant-floor-secondary" onClick={() => execute('bill-request', () => state.requestRestaurantTableBill(table.id, operatorName, `BILL-${activeOrder.id}`), 'Demande d’addition transmise à la caisse.')}><ReceiptText size={16} /> Transmettre à la caisse</button></div>}
          {activeWaitlist[0] && status === 'free' && <div className="restaurant-floor-waitlist"><span><Clock3 size={15} /><strong>{db.sartalCustomers.find(item => item.id === activeWaitlist[0].customerId)?.fullName}</strong><small>{activeWaitlist[0].guests} pers. · attente annoncée {activeWaitlist[0].quotedMinutes} min</small></span><button type="button" onClick={() => execute('waitlist', () => state.updateRestaurantWaitlistStatus(activeWaitlist[0].id, 'seated', table.label), 'Client de la liste d’attente installé et informé.')}><DoorOpen size={15} /> Installer</button></div>}
          {!['free', 'reserved'].includes(status) && <div className="restaurant-floor-transfer"><select value={transferTargetId} onChange={event => setTransferTargetId(event.target.value)}><option value="">Transférer vers une table libre</option>{freeTransferTargets.filter(item => item.capacity >= (reservation?.guests || 1)).map(item => <option key={item.id} value={item.id}>{item.label} · {item.capacity} places</option>)}</select><button type="button" disabled={!transferTargetId || Boolean(pending)} onClick={() => { const targetId = transferTargetId; execute('transfer', () => state.transferRestaurantTable(table.id, targetId, operatorName, `TRANSFER-${activeOrder?.id || reservation?.id}-${targetId}`), 'Table transférée avec sa commande, sa réservation et son accès client.', () => { setTransferTargetId(''); onTableChange?.(targetId); }); }}><ArrowLeftRight size={16} /> Transférer</button></div>}
        </section>}

        {tab === 'order' && (activeOrder ? <RestaurantTableOrderPanel embedded state={state} orderId={activeOrder.id} tableLabel={table.label} capacity={table.capacity} actor={operatorName} onClose={() => setTab('summary')} /> : <section className="restaurant-table-empty-tab"><ReceiptText size={32} /><h3>Aucune commande ouverte</h3><p>Installez le client puis ouvrez la commande depuis cette même fenêtre.</p>{status === 'reserved' ? <button type="button" onClick={seatReservationAndOrder}>Installer et commander</button> : status === 'occupied' ? <button type="button" onClick={openOrder}>Ouvrir la commande</button> : <button type="button" onClick={() => setTab('summary')}>Revenir au placement</button>}</section>)}

        {tab === 'bill' && order ? (operatorId && canCollect ? <RestaurantTablePaymentPanel embedded state={state} orderId={order.id} tableLabel={table.label} actorId={operatorId} actorName={operatorName} onClose={onClose} /> : <section className="restaurant-table-empty-tab"><HandCoins size={32} /><h3>{formatFCFA(remaining)} à encaisser</h3><p>Ce profil ne peut pas enregistrer directement un règlement. La caisse peut reprendre cette addition sans ressaisie.</p>{activeOrder?.status === 'served' && <button type="button" onClick={() => execute('bill-request', () => state.requestRestaurantTableBill(table.id, operatorName, `BILL-${activeOrder.id}`), 'Addition transmise à la caisse.')}>Transmettre à la caisse</button>}</section>) : <section className="restaurant-table-empty-tab"><HandCoins size={32} /><h3>Aucune addition active</h3><p>Les lignes commandées apparaîtront ici avec leur répartition par convive.</p><button type="button" onClick={() => setTab('order')}>Ouvrir la commande</button></section>}

        {tab === 'client' && <section className="restaurant-table-client-tab">{customer ? <><header><span>{customer.fullName.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><small>Client de la table</small><h3>{customer.fullName}</h3><p>{customer.phone}</p></div></header><div className="restaurant-table-client-facts"><article><small>Préférences</small><strong>{customer.preferences || customer.restaurantPreferences?.seatingArea || 'À confirmer'}</strong></article><article className={customer.allergies ? 'alert' : ''}><small>Allergies</small><strong>{customer.allergies || 'Aucune signalée'}</strong></article><article><small>Fidélité</small><strong>{customer.loyaltyPoints} points · {customer.loyaltyTier}</strong></article></div><button type="button" className="restaurant-floor-primary" disabled={Boolean(pending)} onClick={createAccess}><QrCode size={16} /> {access ? 'Renouveler l’accès QR' : 'Créer l’accès QR client'}</button>{access && <div className="restaurant-floor-access"><QrCode size={18} /><span><small>Accès actif</small><strong>Code {access.code}</strong></span></div>}</> : <div className="restaurant-table-empty-tab"><Users size={32} /><h3>Aucun client installé</h3><p>Le profil, les préférences et l’accès QR apparaîtront après le placement.</p><button type="button" onClick={() => setTab('summary')}>Installer un client</button></div>}</section>}

        {tab === 'history' && <section className="restaurant-table-history"><header><div><History size={19} /><span><strong>Chronologie de la table</strong><small>Les opérations financières et les mouvements de service ne sont jamais supprimés.</small></span></div><b>{timeline.length} événement(s)</b></header><div>{timeline.map(item => { const sync = item.operationId ? db.sartalOfflineActions.find(action => action.operationId === item.operationId) : undefined; return <article key={item.id}><i /><span><strong>{item.label}</strong><small>{item.actor} · {new Date(item.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span>{sync && <em className={sync.status}>{sync.status === 'queued' ? 'À synchroniser' : sync.status === 'error' ? 'Conflit' : 'Synchronisé'}</em>}</article>; })}{timeline.length === 0 && <div className="restaurant-table-empty-tab"><History size={28} /><h3>Aucun événement</h3><p>La chronologie commencera à la première installation.</p></div>}</div></section>}
      </div>

      {notice && <div className={`restaurant-table-service-notice ${notice.tone}`}>{notice.text}</div>}
    </aside>
  </div>;
};

export default RestaurantTableServiceModal;
