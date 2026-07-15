import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, BedDouble, CheckCircle2, CreditCard, HandCoins, LockKeyhole, Smartphone, UserRound, X } from 'lucide-react';
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
}

const PAYMENT_METHODS: Array<{ id: PaymentType; label: string; icon: React.ReactNode }> = [
  { id: 'wave', label: 'Wave', icon: <Smartphone size={18} /> },
  { id: 'orange_money', label: 'Orange Money', icon: <Smartphone size={18} /> },
  { id: 'cash', label: 'Espèces', icon: <Banknote size={18} /> },
  { id: 'card', label: 'Carte', icon: <CreditCard size={18} /> }
];

const PAYMENT_LABELS: Record<PaymentType, string> = {
  cash: 'Espèces',
  card: 'Carte',
  wave: 'Wave',
  orange_money: 'Orange Money',
  room_charge: 'Chambre',
  other: 'Autre'
};

const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;

export const RestaurantTablePaymentPanel: React.FC<RestaurantTablePaymentPanelProps> = ({ state, orderId, tableLabel, actorId, actorName, onClose }) => {
  const { db } = state;
  const order = db.restaurantGuestOrders.find(item => item.id === orderId);
  const customer = db.sartalCustomers.find(item => item.id === order?.customerId);
  const operator = db.employeeProfiles.find(item => item.id === actorId && item.active);
  const canCollect = Boolean(operator && hasEmployeePermission(operator, 'table_payment'));
  const openSession = db.cashSessions.find(item => item.posId === order?.posId && item.status === 'open');
  const paid = order?.payments.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const remaining = Math.max(0, (order?.total || 0) - paid);
  const availableMethods = useMemo(() => order?.folioId
    ? [...PAYMENT_METHODS, { id: 'room_charge' as PaymentType, label: `Chambre ${order.roomNumber || ''}`.trim(), icon: <BedDouble size={18} /> }]
    : PAYMENT_METHODS, [order?.folioId, order?.roomNumber]);
  const [method, setMethod] = useState<PaymentType>('wave');
  const [amount, setAmount] = useState(String(remaining));
  const [tip, setTip] = useState('0');
  const [payerName, setPayerName] = useState(customer?.fullName || 'Client');
  const [reference, setReference] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string }>();

  useEffect(() => {
    setAmount(String(remaining));
  }, [orderId, remaining]);

  useEffect(() => {
    setPayerName(customer?.fullName || 'Client');
  }, [customer?.fullName, orderId]);

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

  const collect = () => {
    if (!order) return;
    const requestedAmount = Math.min(remaining, Number(amount));
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      setNotice({ tone: 'danger', text: 'Saisissez un montant valide.' });
      return;
    }
    const collected = execute(() => state.addRestaurantGuestOrderPayment(
      order.id,
      requestedAmount,
      method,
      payerName.trim() || customer?.fullName || 'Client',
      method === 'room_charge' ? undefined : openSession?.id,
      { tipAmount: Number(tip) || 0, reference, source: method === 'room_charge' ? 'folio' : 'pay_at_table', operatorId: actorId }
    ), `${formatFCFA(requestedAmount)} encaissés par ${PAYMENT_LABELS[method]}.`);
    if (collected) {
      setTip('0');
      setReference('');
    }
  };

  if (!order) return null;

  const requestedAmount = Math.min(remaining, Number(amount) || 0);
  const sessionRequired = method !== 'room_charge';

  return <section className="restaurant-table-payment" aria-label={`Encaissement table ${tableLabel}`}>
    <header>
      <div><span>ENCAISSEMENT À TABLE</span><h2>Table {tableLabel}</h2><p>{openSession ? `${openSession.id} · ${openSession.userName}` : 'Terminal de service à activer'}</p></div>
      <button type="button" onClick={onClose} aria-label="Fermer l’encaissement"><X size={21} /></button>
    </header>

    {remaining <= 0 ? <div className="restaurant-payment-complete"><CheckCircle2 size={34} /><h3>Addition réglée</h3><p>Le paiement est rapproché, le service est clôturé et la table est de nouveau disponible.</p><button type="button" onClick={onClose}>Fermer et revenir au plan</button></div> : <>
      <section className="restaurant-payment-balance"><span>Reste à encaisser</span><strong>{formatFCFA(remaining)}</strong><small>{order.payments.length ? `${order.payments.length} règlement(s) déjà enregistré(s)` : `Addition totale · ${formatFCFA(order.total)}`}</small></section>

      {!canCollect && <div className="restaurant-payment-warning"><LockKeyhole size={19} /><span><strong>Encaissement non autorisé</strong><small>La direction doit activer le droit « Encaisser à table » pour ce profil.</small></span></div>}
      {canCollect && !openSession && <div className="restaurant-payment-warning service"><LockKeyhole size={19} /><span><strong>Aucune caisse ouverte sur ce POS</strong><small>Activez la caisse de service. Le fonds démarre à zéro et la clôture reste réservée au caissier ou au manager.</small></span><button type="button" onClick={activateServiceCash}>Activer la caisse de service</button></div>}

      <section className="restaurant-payment-methods"><small>Moyen de paiement</small><div>{availableMethods.map(item => <button type="button" className={method === item.id ? 'active' : ''} key={item.id} onClick={() => setMethod(item.id)}>{item.icon}<span>{item.label}</span></button>)}</div></section>

      <section className="restaurant-payment-form">
        <label><span><UserRound size={15} /> Payeur</span><input value={payerName} onChange={event => setPayerName(event.target.value)} /></label>
        <label><span>Montant</span><input inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value.replace(/\D/g, ''))} /></label>
        <div className="restaurant-payment-quick-amounts"><button type="button" onClick={() => setAmount(String(remaining))}>Tout</button><button type="button" onClick={() => setAmount(String(Math.ceil(remaining / 2)))}>1/2</button><button type="button" onClick={() => setAmount(String(Math.ceil(remaining / 3)))}>1/3</button></div>
        <label><span>Pourboire</span><input inputMode="numeric" value={tip} onChange={event => setTip(event.target.value.replace(/\D/g, ''))} /></label>
        {['wave', 'orange_money', 'card'].includes(method) && <label className="wide"><span>Référence terminal</span><input value={reference} onChange={event => setReference(event.target.value)} placeholder="Facultatif en démonstration" /></label>}
      </section>

      <button type="button" className="restaurant-payment-submit" disabled={!canCollect || (sessionRequired && !openSession) || requestedAmount <= 0} onClick={collect}><HandCoins size={19} /> Encaisser {formatFCFA(requestedAmount)}</button>

      {order.payments.length > 0 && <section className="restaurant-payment-history"><header><strong>Règlements reçus</strong><small>{formatFCFA(paid)} au total</small></header>{order.payments.map(payment => <article key={payment.id}><CheckCircle2 size={16} /><span><strong>{payment.payerName || 'Client'}</strong><small>{PAYMENT_LABELS[payment.method]} · {new Date(payment.paidAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></span><b>{formatFCFA(payment.amount)}</b></article>)}</section>}
    </>}

    {notice && <div className={`restaurant-payment-notice ${notice.tone}`}>{notice.text}</div>}
  </section>;
};

export default RestaurantTablePaymentPanel;
