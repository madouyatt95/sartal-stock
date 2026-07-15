import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, BedDouble, CheckCircle2, CreditCard, HandCoins, LockKeyhole, Smartphone, UserRound, WifiOff, X } from 'lucide-react';
import { hasEmployeePermission } from '../employeePermissions';
import type { StockState } from '../hooks/useStockState';
import type { PaymentType } from '../types';

interface RestaurantTablePaymentPanelProps {
  state: StockState;
  orderId: string;
  tableLabel: string;
  actorId: string;
  actorName: string;
  onClose: () => void;
  embedded?: boolean;
}

type AllocationMode = 'free' | 'seat' | 'item' | 'equal';

const PAYMENT_METHODS: Array<{ id: PaymentType; label: string; icon: React.ReactNode }> = [
  { id: 'wave', label: 'Wave', icon: <Smartphone size={18} /> },
  { id: 'orange_money', label: 'Orange Money', icon: <Smartphone size={18} /> },
  { id: 'cash', label: 'Espèces', icon: <Banknote size={18} /> },
  { id: 'card', label: 'Carte', icon: <CreditCard size={18} /> }
];

const PAYMENT_LABELS: Record<PaymentType, string> = {
  cash: 'Espèces', card: 'Carte', wave: 'Wave', orange_money: 'Orange Money', room_charge: 'Chambre', other: 'Autre'
};
const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;
const operationId = (orderId: string) => `PAY-${orderId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const RestaurantTablePaymentPanel: React.FC<RestaurantTablePaymentPanelProps> = ({ state, orderId, tableLabel, actorId, actorName, onClose, embedded = false }) => {
  const { db } = state;
  const order = db.restaurantGuestOrders.find(item => item.id === orderId);
  const customer = db.sartalCustomers.find(item => item.id === order?.customerId);
  const operator = db.employeeProfiles.find(item => item.id === actorId && item.active);
  const canCollect = Boolean(operator && hasEmployeePermission(operator, 'table_payment'));
  const openSession = db.cashSessions.find(item => item.posId === order?.posId && item.status === 'open');
  const paid = order?.payments.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const remaining = Math.max(0, (order?.total || 0) - paid);
  const operationRef = useRef(operationId(orderId));
  const collectingRef = useRef(false);
  const availableMethods = useMemo(() => order?.folioId
    ? [...PAYMENT_METHODS, { id: 'room_charge' as PaymentType, label: `Chambre ${order.roomNumber || ''}`.trim(), icon: <BedDouble size={18} /> }]
    : PAYMENT_METHODS, [order?.folioId, order?.roomNumber]);
  const [method, setMethod] = useState<PaymentType>('wave');
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('free');
  const [seatNumbers, setSeatNumbers] = useState<Set<number>>(() => new Set());
  const [itemIds, setItemIds] = useState<Set<string>>(() => new Set());
  const [equalParts, setEqualParts] = useState(2);
  const [amount, setAmount] = useState(String(remaining));
  const [tip, setTip] = useState('0');
  const [payerName, setPayerName] = useState(customer?.fullName || 'Client');
  const [reference, setReference] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string }>();

  const seats = useMemo(() => Array.from(new Set((order?.items || []).map(item => item.seatNumber).filter((value): value is number => Boolean(value)))).sort((a, b) => a - b), [order?.items]);

  useEffect(() => {
    if (allocationMode === 'free') setAmount(String(remaining));
    if (allocationMode === 'equal') setAmount(String(Math.ceil(remaining / equalParts)));
  }, [allocationMode, equalParts, orderId, remaining]);

  useEffect(() => { setPayerName(customer?.fullName || 'Client'); }, [customer?.fullName, orderId]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (!online && method !== 'cash') setMethod('cash');
  }, [method, online]);

  const execute = (action: () => unknown, success: string) => {
    try {
      action();
      setNotice({ tone: 'success', text: success });
      return true;
    } catch (error) {
      setNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Action impossible' });
      return false;
    }
  };

  const activateServiceCash = () => execute(
    () => state.openCashSession(order!.posId, 0, { id: actorId, name: actorName }),
    'Caisse de service activée. Les règlements seront rapprochés avec ce POS.'
  );

  const setMode = (mode: AllocationMode) => {
    setAllocationMode(mode);
    setSeatNumbers(new Set());
    setItemIds(new Set());
    if (mode === 'free') setAmount(String(remaining));
    if (mode === 'equal') setAmount(String(Math.ceil(remaining / equalParts)));
    if (mode === 'seat' || mode === 'item') setAmount('');
  };

  const toggleSeat = (seat: number) => {
    const next = new Set(seatNumbers);
    if (next.has(seat)) next.delete(seat); else next.add(seat);
    setSeatNumbers(next);
    const total = order?.items.filter(item => item.seatNumber && next.has(item.seatNumber) && item.status !== 'voided').reduce((sum, item) => sum + item.quantity * item.salePrice, 0) || 0;
    setAmount(String(Math.min(remaining, total)));
  };

  const toggleItem = (itemId: string) => {
    const next = new Set(itemIds);
    if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
    setItemIds(next);
    const total = order?.items.filter(item => item.id && next.has(item.id) && item.status !== 'voided').reduce((sum, item) => sum + item.quantity * item.salePrice, 0) || 0;
    setAmount(String(Math.min(remaining, total)));
  };

  const collect = () => {
    if (!order || collectingRef.current) return;
    const requestedAmount = Math.min(remaining, Number(amount));
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      setNotice({ tone: 'danger', text: 'Sélectionnez une part ou saisissez un montant valide.' });
      return;
    }
    collectingRef.current = true;
    setCollecting(true);
    const currentOperationId = operationRef.current;
    let shouldRotateOperation = false;
    try {
      const collected = execute(() => state.addRestaurantGuestOrderPayment(
        order.id,
        requestedAmount,
        method,
        payerName.trim() || customer?.fullName || 'Client',
        method === 'room_charge' ? undefined : openSession?.id,
        {
          seatNumbers: allocationMode === 'seat' ? [...seatNumbers] : undefined,
          itemIds: allocationMode === 'item' ? [...itemIds] : undefined,
          tipAmount: Number(tip) || 0,
          reference,
          source: method === 'room_charge' ? 'folio' : 'pay_at_table',
          operatorId: actorId,
          operationId: currentOperationId
        }
      ), online ? `${formatFCFA(requestedAmount)} encaissés par ${PAYMENT_LABELS[method]}.` : `${formatFCFA(requestedAmount)} en espèces conservés à synchroniser.`);
      if (collected) {
        setTip('0');
        setReference('');
        setSeatNumbers(new Set());
        setItemIds(new Set());
        shouldRotateOperation = true;
      }
    } finally {
      window.setTimeout(() => {
        if (shouldRotateOperation) operationRef.current = operationId(order.id);
        collectingRef.current = false;
        setCollecting(false);
      }, 400);
    }
  };

  if (!order) return null;

  const requestedAmount = Math.min(remaining, Number(amount) || 0);
  const sessionRequired = method !== 'room_charge';

  return <section className={`restaurant-table-payment ${embedded ? 'embedded' : ''}`} aria-label={`Encaissement table ${tableLabel}`}>
    {!embedded && <header><div><span>ENCAISSEMENT À TABLE</span><h2>Table {tableLabel}</h2><p>{openSession ? `${openSession.id} · ${openSession.userName}` : 'Terminal de service à activer'}</p></div><button type="button" onClick={onClose} aria-label="Fermer l’encaissement"><X size={21} /></button></header>}

    {remaining <= 0 ? <div className="restaurant-payment-complete"><CheckCircle2 size={34} /><h3>Addition réglée</h3><p>Le paiement est rapproché, le service est clôturé et la table est de nouveau disponible.</p><button type="button" onClick={onClose}>Fermer et revenir au plan</button></div> : <>
      <div className={`restaurant-payment-sync ${online ? 'synced' : 'queued'}`}><WifiOff size={17} /><span><strong>{online ? 'Terminal synchronisé' : 'Mode hors connexion'}</strong><small>{online ? 'Les moyens électroniques sont disponibles.' : 'Seules les espèces sont autorisées. Le rapprochement sera signalé à la reprise.'}</small></span></div>
      <section className="restaurant-payment-balance"><span>Reste à encaisser</span><strong>{formatFCFA(remaining)}</strong><small>{order.payments.length ? `${order.payments.length} règlement(s) déjà enregistré(s)` : `Addition totale · ${formatFCFA(order.total)}`}</small></section>

      {!canCollect && <div className="restaurant-payment-warning"><LockKeyhole size={19} /><span><strong>Encaissement non autorisé</strong><small>La direction doit activer le droit « Encaisser à table » pour ce profil.</small></span></div>}
      {canCollect && !openSession && <div className="restaurant-payment-warning service"><LockKeyhole size={19} /><span><strong>Aucune caisse ouverte sur ce POS</strong><small>Activez la caisse de service. Le fonds démarre à zéro et la clôture reste réservée au caissier ou au manager.</small></span><button type="button" onClick={activateServiceCash}>Activer la caisse de service</button></div>}

      <section className="restaurant-payment-allocation"><header><div><strong>Qui règle quoi ?</strong><small>Montant libre, convives, articles ou parts égales</small></div><div>{([['free', 'Libre'], ['seat', 'Convives'], ['item', 'Articles'], ['equal', 'Parts égales']] as Array<[AllocationMode, string]>).map(([value, label]) => <button type="button" className={allocationMode === value ? 'active' : ''} key={value} onClick={() => setMode(value)}>{label}</button>)}</div></header>
        {allocationMode === 'seat' && <div className="restaurant-payment-seat-list">{seats.map(seat => { const alreadyPaid = order.payments.some(payment => payment.seatNumbers?.includes(seat)); const total = order.items.filter(item => item.seatNumber === seat && item.status !== 'voided').reduce((sum, item) => sum + item.quantity * item.salePrice, 0); return <button type="button" disabled={alreadyPaid} className={seatNumbers.has(seat) ? 'active' : ''} key={seat} onClick={() => toggleSeat(seat)}><span>Convive {seat}</span><strong>{alreadyPaid ? 'Réglé' : formatFCFA(total)}</strong></button>; })}{seats.length === 0 && <p>Aucun convive n’a encore été affecté aux lignes de commande.</p>}</div>}
        {allocationMode === 'item' && <div className="restaurant-payment-item-list">{order.items.filter(item => item.status !== 'voided').map(line => { const alreadyPaid = order.payments.some(payment => line.id && payment.itemIds?.includes(line.id)); const product = db.products.find(item => item.id === line.productId); return <button type="button" disabled={alreadyPaid || !line.id} className={line.id && itemIds.has(line.id) ? 'active' : ''} key={line.id || line.productId} onClick={() => toggleItem(line.id!)}><span>{line.quantity}× {product?.name}</span><strong>{alreadyPaid ? 'Réglé' : formatFCFA(line.quantity * line.salePrice)}</strong></button>; })}</div>}
        {allocationMode === 'equal' && <div className="restaurant-payment-equal"><span>Diviser le solde en</span>{[2, 3, 4, 5, 6].map(parts => <button type="button" className={equalParts === parts ? 'active' : ''} key={parts} onClick={() => { setEqualParts(parts); setAmount(String(Math.ceil(remaining / parts))); }}>{parts} parts</button>)}<strong>Part actuelle · {formatFCFA(requestedAmount)}</strong></div>}
      </section>

      <section className="restaurant-payment-methods"><small>Moyen de paiement</small><div>{availableMethods.map(item => <button type="button" disabled={!online && item.id !== 'cash'} className={method === item.id ? 'active' : ''} key={item.id} onClick={() => setMethod(item.id)}>{item.icon}<span>{item.label}</span></button>)}</div></section>

      <section className="restaurant-payment-form">
        <label><span><UserRound size={15} /> Payeur</span><input value={payerName} onChange={event => setPayerName(event.target.value)} /></label>
        <label><span>Montant</span><input inputMode="numeric" readOnly={allocationMode !== 'free'} value={amount} onChange={event => setAmount(event.target.value.replace(/\D/g, ''))} /></label>
        {allocationMode === 'free' && <div className="restaurant-payment-quick-amounts"><button type="button" onClick={() => setAmount(String(remaining))}>Tout</button><button type="button" onClick={() => setAmount(String(Math.ceil(remaining / 2)))}>1/2</button><button type="button" onClick={() => setAmount(String(Math.ceil(remaining / 3)))}>1/3</button></div>}
        <label><span>Pourboire</span><input inputMode="numeric" value={tip} onChange={event => setTip(event.target.value.replace(/\D/g, ''))} /></label>
        {['wave', 'orange_money', 'card'].includes(method) && <label className="wide"><span>Référence terminal</span><input value={reference} onChange={event => setReference(event.target.value)} placeholder="Référence du terminal" /></label>}
      </section>

      <button type="button" className="restaurant-payment-submit" disabled={collecting || !canCollect || (sessionRequired && !openSession) || requestedAmount <= 0} onClick={collect}><HandCoins size={19} /> {collecting ? 'Encaissement...' : `Encaisser ${formatFCFA(requestedAmount)}`}</button>

      {order.payments.length > 0 && <section className="restaurant-payment-history"><header><strong>Règlements reçus</strong><small>{formatFCFA(paid)} au total</small></header>{order.payments.map(payment => { const sync = payment.operationId ? db.sartalOfflineActions.find(item => item.operationId === payment.operationId) : undefined; return <article key={payment.id}><CheckCircle2 size={16} /><span><strong>{payment.payerName || 'Client'}</strong><small>{PAYMENT_LABELS[payment.method]} · {payment.seatNumbers?.length ? `convive(s) ${payment.seatNumbers.join(', ')}` : payment.itemIds?.length ? `${payment.itemIds.length} article(s)` : 'montant libre'} · {new Date(payment.paidAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></span>{sync && <em className={sync.status}>{sync.status === 'queued' ? 'À synchroniser' : sync.status === 'error' ? 'Conflit' : 'Synchronisé'}</em>}<b>{formatFCFA(payment.amount)}</b></article>; })}</section>}
    </>}

    {notice && <div className={`restaurant-payment-notice ${notice.tone}`}>{notice.text}</div>}
  </section>;
};

export default RestaurantTablePaymentPanel;
