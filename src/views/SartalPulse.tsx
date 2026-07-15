import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BedDouble, BellRing, CheckCircle2, CircleDollarSign, Clock3, PackageCheck, Radio, ShieldCheck, Truck, UsersRound, UtensilsCrossed, Warehouse } from 'lucide-react';
import { StockState } from '../hooks/useStockState';

interface SartalPulseProps {
  state: StockState;
  setView: (view: string) => void;
}

const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;

export const SartalPulse: React.FC<SartalPulseProps> = ({ state, setView }) => {
  const { db } = state;
  const [siteId, setSiteId] = useState(db.sites[0]?.id || '');
  const brand = db.sartalBrandSettings;
  const site = db.sites.find(item => item.id === siteId);
  const siteProfile = brand.siteProfiles.find(item => item.siteId === siteId);
  const warehouses = db.warehouses.filter(item => item.siteId === siteId);
  const warehouseIds = new Set(warehouses.map(item => item.id));
  const posIds = new Set(db.posList.filter(item => item.siteId === siteId).map(item => item.id));
  const stocks = db.stocks.filter(item => warehouseIds.has(item.warehouseId));
  const lowStocks = stocks.filter(item => item.quantityAvailable - item.quantityReserved <= item.alertThreshold);
  const sales = db.externalSales.filter(item => item.siteId === siteId);
  const revenue = sales.reduce((sum, sale) => sum + sale.items.reduce((total, item) => total + item.quantity * item.salePrice, 0), 0);
  const activeDeliveries = db.deliveryOrders.filter(item => posIds.has(item.channelId) && !['delivered', 'returned', 'cancelled'].includes(item.status));
  const rooms = db.pmsRooms.filter(item => item.siteId === siteId);
  const occupiedRooms = rooms.filter(item => item.status === 'occupied');
  const staffOnDuty = db.employeeShifts.filter(item => item.siteId === siteId && item.status === 'open');
  const overdueRequests = db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status) && new Date(item.promisedAt).getTime() < Date.now());

  const signals = useMemo(() => {
    const items: Array<{ id: string; tone: 'danger' | 'warning' | 'info'; title: string; detail: string; view: string }> = [];
    db.deliveryOrders.filter(item => item.status === 'failed').forEach(item => items.push({ id: `delivery-${item.id}`, tone: 'danger', title: `Livraison ${item.id} en incident`, detail: `${item.customerName} · ${item.deliveryIssue || 'Action manager requise'}`, view: 'delivery' }));
    db.sartalCustomerFeedback.filter(item => item.recoveryStatus === 'open').forEach(item => items.push({ id: `feedback-${item.id}`, tone: 'danger', title: `Client à reprendre · ${item.score}/5`, detail: `${item.assignedTo || 'Relation client'} · engagement en cours`, view: 'client' }));
    db.employeeApprovals.filter(item => item.status === 'pending').forEach(item => items.push({ id: `approval-${item.id}`, tone: 'warning', title: item.label, detail: `${item.requestedByName} · validation attendue`, view: 'employees' }));
    lowStocks.slice(0, 4).forEach(item => items.push({ id: `stock-${item.productId}-${item.warehouseId}`, tone: 'warning', title: db.products.find(product => product.id === item.productId)?.name || 'Stock faible', detail: `${db.warehouses.find(warehouse => warehouse.id === item.warehouseId)?.name} · ${item.quantityAvailable - item.quantityReserved} disponible`, view: 'stock-control' }));
    db.pmsMaintenanceTickets.filter(item => !['resolved', 'verified'].includes(item.status)).forEach(item => items.push({ id: `maintenance-${item.id}`, tone: 'info', title: item.equipment, detail: `Maintenance hôtel · ${item.assignedTo || 'À affecter'}`, view: 'pms' }));
    return items.filter(item => item.view === 'delivery' ? brand.enabledModules.includes('delivery') : item.view === 'pms' ? brand.enabledModules.includes('pms') : item.view === 'stock-control' ? brand.enabledModules.includes('stock') : item.view === 'client' ? brand.enabledModules.includes('restaurant') || brand.enabledModules.includes('delivery') : true).slice(0, 8);
  }, [brand.enabledModules, db, lowStocks]);

  const moduleCards = [
    { module: 'stock', icon: <Warehouse size={22} />, label: 'Stock', value: `${lowStocks.length} alerte(s)`, detail: `${warehouses.length} dépôts reliés`, view: 'stock-control', tone: lowStocks.length ? 'warning' : 'good' },
    { module: 'restaurant', icon: <UtensilsCrossed size={22} />, label: 'Restaurant', value: formatFCFA(revenue), detail: `${sales.length} vente(s) tracée(s)`, view: 'answer', tone: 'restaurant' },
    { module: 'delivery', icon: <Truck size={22} />, label: 'Livraison', value: `${activeDeliveries.length} en cours`, detail: `${db.deliveryOrders.filter(item => item.status === 'failed').length} incident(s)`, view: 'delivery', tone: 'delivery' },
    { module: 'pms', icon: <BedDouble size={22} />, label: 'Hôtel / PMS', value: `${occupiedRooms.length}/${rooms.length} occupées`, detail: `${db.pmsReservations.filter(item => item.arrivalDate === db.pmsSettings.businessDate && item.status === 'confirmed').length} arrivée(s)`, view: 'pms', tone: 'hotel' }
  ].filter(card => brand.enabledModules.includes(card.module as 'stock' | 'restaurant' | 'delivery' | 'pms'));

  return <div className="sartal-pulse" style={{ '--pulse-primary': siteProfile?.primaryColor || brand.primaryColor, '--pulse-accent': siteProfile?.accentColor || brand.accentColor } as React.CSSProperties}>
    <header className="pulse-hero">
      <div><span><Radio size={15} /> SÁRTAL PULSE · EN DIRECT</span><h1>Bonjour, voici ce qui mérite votre attention.</h1><p>{siteProfile?.welcomeMessage || 'Une seule lecture pour décider, agir et suivre les engagements.'}</p></div>
      <label>Établissement<select value={siteId} onChange={event => setSiteId(event.target.value)}>{db.sites.map(item => <option value={item.id} key={item.id}>{brand.siteProfiles.find(profile => profile.siteId === item.id)?.displayName || item.name}</option>)}</select></label>
    </header>

    <section className="pulse-command-strip">
      <article><UsersRound size={21} /><span><strong>{staffOnDuty.length}</strong><small>personnes en service</small></span></article>
      <article><BellRing size={21} /><span><strong>{signals.length}</strong><small>signaux à traiter</small></span></article>
      <article><Clock3 size={21} /><span><strong>{overdueRequests.length}</strong><small>engagements dépassés</small></span></article>
      <article><ShieldCheck size={21} /><span><strong>{signals.filter(item => item.tone === 'danger').length ? 'À agir' : 'Maîtrisé'}</strong><small>niveau opérationnel</small></span></article>
    </section>

    <section className="pulse-module-grid">{moduleCards.map(card => <button className={card.tone} key={card.module} onClick={() => setView(card.view)}><span>{card.icon}{card.label}</span><strong>{card.value}</strong><small>{card.detail}</small><ArrowRight size={17} /></button>)}</section>

    <div className="pulse-main-grid">
      <section className="pulse-priorities">
        <header><div><AlertTriangle size={20} /><span><strong>Priorités maintenant</strong><small>Classées selon l’impact client et financier</small></span></div><b>{signals.length}</b></header>
        <div>{signals.map(signal => <button className={signal.tone} key={signal.id} onClick={() => setView(signal.view)}><i>{signal.tone === 'danger' ? <AlertTriangle size={17} /> : signal.tone === 'warning' ? <Clock3 size={17} /> : <BellRing size={17} />}</i><span><strong>{signal.title}</strong><small>{signal.detail}</small></span><ArrowRight size={16} /></button>)}{signals.length === 0 && <div className="pulse-empty"><CheckCircle2 size={28} /><strong>Aucune priorité critique</strong><small>Les opérations sont sous contrôle sur {site?.name}.</small></div>}</div>
      </section>

      <aside className="pulse-live-flow">
        <header><Radio size={19} /><div><strong>Flux opérationnel</strong><small>Derniers événements tracés</small></div></header>
        {db.movements.filter(item => item.siteId === siteId).slice(0, 6).map(movement => <article key={movement.id}><span className={movement.quantity >= 0 ? 'in' : 'out'}>{movement.quantity >= 0 ? '+' : '−'}</span><div><strong>{db.products.find(item => item.id === movement.productId)?.name}</strong><small>{movement.reason}</small></div><time>{new Date(movement.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time></article>)}
        <button onClick={() => setView('movements')}>Voir toute la traçabilité <ArrowRight size={15} /></button>
      </aside>
    </div>

    <section className="pulse-decision-row">
      {brand.enabledModules.includes('stock') && <button onClick={() => setView('smart-alerts')}><BellRing size={20} /><span><strong>Arbitrer les alertes</strong><small>Priorités stock et opérations</small></span><ArrowRight size={16} /></button>}
      {(brand.enabledModules.includes('restaurant') || brand.enabledModules.includes('delivery')) && <button onClick={() => setView('client')}><UsersRound size={20} /><span><strong>Tenir les promesses clients</strong><small>Demandes et reprises en cours</small></span><ArrowRight size={16} /></button>}
      {brand.enabledModules.includes('stock') && <button onClick={() => setView('exports')}><CircleDollarSign size={20} /><span><strong>Lire la performance</strong><small>Ventes, coûts et écarts</small></span><ArrowRight size={16} /></button>}
      {brand.enabledModules.includes('stock') && <button onClick={() => setView('stock-control')}><PackageCheck size={20} /><span><strong>Sécuriser le stock</strong><small>Disponible réel par dépôt</small></span><ArrowRight size={16} /></button>}
    </section>
  </div>;
};

export default SartalPulse;
