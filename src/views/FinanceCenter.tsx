import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Download,
  FileCheck2,
  Landmark,
  ReceiptText,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { PaymentType } from '../types';

const formatFCFA = (amount: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} FCFA`;

const PAYMENT_LABELS: Record<PaymentType, string> = {
  cash: 'Espèces',
  card: 'Carte',
  wave: 'Wave',
  orange_money: 'Orange Money',
  room_charge: 'Imputation chambre',
  other: 'Autre'
};

interface FinanceCenterProps {
  state: StockState;
}

export const FinanceCenter: React.FC<FinanceCenterProps> = ({ state }) => {
  const { db } = state;
  const [siteId, setSiteId] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const siteIds = siteId === 'all' ? new Set(db.sites.map(site => site.id)) : new Set([siteId]);
  const posIds = new Set(db.posList.filter(pos => siteIds.has(pos.siteId)).map(pos => pos.id));
  const warehouseIds = new Set(db.warehouses.filter(warehouse => siteIds.has(warehouse.siteId)).map(warehouse => warehouse.id));
  const roomIds = new Set(db.pmsRooms.filter(room => siteIds.has(room.siteId)).map(room => room.id));
  const folios = db.pmsFolios.filter(folio => roomIds.has(folio.roomId));
  const restaurantOrders = db.restaurantGuestOrders.filter(order => posIds.has(order.posId) && order.status !== 'cancelled');
  const deliveryOrders = db.deliveryOrders.filter(order => warehouseIds.has(order.warehouseId) && order.status !== 'cancelled');
  const cashSessions = db.cashSessions.filter(session => posIds.has(session.posId));
  const restaurantRevenue = restaurantOrders.reduce((sum, order) => sum + order.payments.filter(payment => payment.method !== 'room_charge').reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0);
  const hotelRevenue = folios.reduce((sum, folio) => sum + folio.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0);
  const deliveryRevenue = deliveryOrders.filter(order => order.paymentStatus === 'paid').reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity * item.salePrice, 0) + order.deliveryFee, 0);
  const totalRevenue = restaurantRevenue + hotelRevenue + deliveryRevenue;
  const supplierCommitments = db.supplierOrders.filter(order => !['cancelled', 'fully_received'].includes(order.status)).reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Math.max(0, item.quantityOrdered - item.quantityReceived) * item.purchasePrice, 0), 0);
  const pendingCOD = deliveryOrders.filter(order => order.paymentStatus !== 'paid' && ['out_for_delivery', 'delivered', 'failed'].includes(order.status)).reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity * item.salePrice, 0) + order.deliveryFee, 0);
  const folioBalance = folios.filter(folio => folio.status === 'open').reduce((sum, folio) => sum + Math.max(0, folio.charges.reduce((chargeSum, charge) => chargeSum + charge.amount, 0) - folio.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0)), 0);
  const paymentTotals = useMemo(() => {
    const totals: Record<PaymentType, number> = { cash: 0, card: 0, wave: 0, orange_money: 0, room_charge: 0, other: 0 };
    restaurantOrders.flatMap(order => order.payments).forEach(payment => { totals[payment.method] += payment.amount; });
    folios.flatMap(folio => folio.payments).forEach(payment => { totals[payment.method] += payment.amount; });
    deliveryOrders.filter(order => order.paymentStatus === 'paid').forEach(order => { totals[order.paymentType] += order.items.reduce((sum, item) => sum + item.quantity * item.salePrice, 0) + order.deliveryFee; });
    return totals;
  }, [deliveryOrders, folios, restaurantOrders]);
  const trackedPaymentFlows = Object.values(paymentTotals).reduce((sum, amount) => sum + amount, 0);
  const pendingCharges = folios.flatMap(folio => folio.charges.map(charge => ({ folio, charge }))).filter(item => item.charge.status !== 'reconciled');
  const cashDifferences = cashSessions.filter(session => session.status === 'closed' && Math.abs(session.cashDifference || 0) > 0);
  const reconciliationRows = [
    ...pendingCharges.map(item => ({ id: item.charge.id, type: 'PMS', label: item.charge.label, detail: `${item.folio.guestName} · ${item.charge.status}`, amount: item.charge.amount, tone: item.charge.status === 'pending' ? 'warning' : 'info', action: () => state.togglePMSExport(item.charge.id), actionLabel: item.charge.status === 'pending' ? 'Marquer exporté' : 'Rapprocher' })),
    ...cashDifferences.map(session => ({ id: session.id, type: 'Caisse', label: `Écart ${session.zReportNumber || session.id}`, detail: `${session.userName} · ${db.posList.find(pos => pos.id === session.posId)?.name || 'POS'}`, amount: session.cashDifference || 0, tone: 'danger', action: undefined, actionLabel: '' })),
    ...deliveryOrders.filter(order => order.paymentStatus !== 'paid' && ['delivered', 'failed'].includes(order.status)).map(order => ({ id: order.id, type: 'Livraison', label: `${order.id} · encaissement`, detail: `${order.customerName} · ${order.status}`, amount: order.items.reduce((sum, item) => sum + item.quantity * item.salePrice, 0) + order.deliveryFee, tone: 'danger', action: undefined, actionLabel: '' }))
  ].filter(row => `${row.type} ${row.label} ${row.detail}`.toLowerCase().includes(query.trim().toLowerCase()));

  const execute = (action: () => void, message: string) => {
    try {
      action();
      setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Action impossible');
    }
  };

  const exportReconciliation = () => {
    const rows = [['Type', 'Référence', 'Détail', 'Montant FCFA'], ...reconciliationRows.map(row => [row.type, row.label, row.detail, String(row.amount)])];
    const blob = new Blob([rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sartal-rapprochement-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <section className="finance-center-page">
    <header className="finance-hero"><div><span>FINANCE & RAPPROCHEMENT</span><h1>Chaque encaissement retrouve son opération</h1><p>Caisse, mobile money, livraisons, folios et engagements fournisseurs dans une lecture commune.</p></div><label><Building2 size={17} /><span>Établissement</span><select value={siteId} onChange={event => setSiteId(event.target.value)}><option value="all">Tous les établissements</option>{db.sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label></header>

    <section className="finance-kpis"><article><CircleDollarSign size={22} /><span><small>Encaissements suivis</small><strong>{formatFCFA(totalRevenue)}</strong><em>Restaurant, hôtel et livraison</em></span></article><article><ReceiptText size={22} /><span><small>Soldes folios ouverts</small><strong>{formatFCFA(folioBalance)}</strong><em>{folios.filter(folio => folio.status === 'open').length} folio(s)</em></span></article><article><Banknote size={22} /><span><small>Espèces livraison à récupérer</small><strong>{formatFCFA(pendingCOD)}</strong><em>Courses livrées ou en incident</em></span></article><article><Landmark size={22} /><span><small>Engagements fournisseurs</small><strong>{formatFCFA(supplierCommitments)}</strong><em>Reliquats non réceptionnés</em></span></article></section>

    <div className="finance-main-grid"><section className="finance-payment-board"><header><CreditCard size={20} /><div><strong>Répartition des flux de paiement</strong><small>Encaissements et imputations chambre distingués sans double comptage</small></div></header><div>{(Object.keys(PAYMENT_LABELS) as PaymentType[]).map(method => <article key={method}><span>{method === 'wave' || method === 'orange_money' ? <Smartphone size={18} /> : method === 'cash' ? <Banknote size={18} /> : <CreditCard size={18} />}{PAYMENT_LABELS[method]}</span><strong>{formatFCFA(paymentTotals[method])}</strong><i><b style={{ width: `${trackedPaymentFlows ? Math.max(2, paymentTotals[method] / trackedPaymentFlows * 100) : 0}%` }} /></i></article>)}</div></section><aside className="finance-closing-board"><header><FileCheck2 size={20} /><div><strong>Clôtures caisse</strong><small>X/Z et écarts déclarés</small></div></header>{cashSessions.slice(0, 8).map(session => <article key={session.id}><span className={session.status}><i />{session.status === 'open' ? 'Ouverte' : session.zReportNumber || 'Clôturée'}</span><div><strong>{db.posList.find(pos => pos.id === session.posId)?.name}</strong><small>{session.userName} · {new Date(session.openedAt).toLocaleString('fr-FR')}</small></div><b className={(session.cashDifference || 0) ? 'danger' : ''}>{session.status === 'open' ? formatFCFA(session.totalSales) : `${(session.cashDifference || 0) > 0 ? '+' : ''}${formatFCFA(session.cashDifference || 0)}`}</b></article>)}{cashSessions.length === 0 && <div className="finance-empty"><CheckCircle2 size={26} /><strong>Aucune session caisse</strong></div>}</aside></div>

    <section className="finance-reconciliation"><header><div><RefreshCw size={20} /><span><strong>File de rapprochement</strong><small>Les opérations non soldées restent visibles jusqu’à leur résolution</small></span></div><div><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Référence, client, type..." /><button onClick={exportReconciliation}><Download size={16} /> Exporter</button></div></header>{notice && <p className="finance-notice">{notice}</p>}<div>{reconciliationRows.map(row => <article className={row.tone} key={`${row.type}-${row.id}`}><span>{row.tone === 'danger' ? <AlertCircle size={18} /> : <RefreshCw size={18} />}</span><div><small>{row.type}</small><strong>{row.label}</strong><p>{row.detail}</p></div><b>{formatFCFA(row.amount)}</b>{row.action ? <button onClick={() => execute(row.action!, `${row.label} avancé dans le rapprochement.`)}>{row.actionLabel}</button> : <em>Contrôle requis</em>}</article>)}{reconciliationRows.length === 0 && <div className="finance-empty"><CheckCircle2 size={30} /><strong>Tout est rapproché</strong><small>Aucune anomalie ne correspond à ce filtre.</small></div>}</div></section>
  </section>;
};

export default FinanceCenter;
