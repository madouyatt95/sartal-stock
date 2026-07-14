import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  RefreshCcw,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Undo2,
  Warehouse
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { DeliveryOrderStatus, PAYMENT_TYPE_LABELS } from '../types';

interface DeliveryDemoProps {
  state: StockState;
  setView: (view: string) => void;
}

const STATUS_LABELS: Record<DeliveryOrderStatus, string> = {
  confirmed: 'Commande confirmée',
  reserved: 'Stock réservé',
  preparing: 'En préparation',
  ready: 'Prête à livrer',
  out_for_delivery: 'En livraison',
  delivered: 'Livrée',
  failed: 'Non livrée',
  returned: 'Retour dépôt',
  cancelled: 'Annulée'
};

const STATUS_BADGES: Record<DeliveryOrderStatus, string> = {
  confirmed: 'badge-blue',
  reserved: 'badge-purple',
  preparing: 'badge-yellow',
  ready: 'badge-green',
  out_for_delivery: 'badge-blue',
  delivered: 'badge-green',
  failed: 'badge-red',
  returned: 'badge-yellow',
  cancelled: 'badge-red'
};

const STATUS_RANK: Record<DeliveryOrderStatus, number> = {
  confirmed: 1,
  reserved: 2,
  preparing: 3,
  ready: 4,
  out_for_delivery: 5,
  delivered: 6,
  failed: 5,
  returned: 0,
  cancelled: 0
};

const PAYMENT_STATUS_LABELS = {
  pending: 'À encaisser',
  paid: 'Payé',
  failed: 'Échec paiement'
};

const BASKET_TYPES = [
  { name: 'Panier famille', detail: 'Riz, eau, lait, huile, sucre', fee: '1 000 - 1 500 FCFA' },
  { name: 'Petit-déjeuner', detail: 'Café Touba, pain, lait, sucre', fee: '1 000 FCFA' },
  { name: 'Boissons soft', detail: 'Kirène, bissap, ditakh, Coca', fee: 'Selon quartier' },
  { name: 'Urgence hôtel', detail: 'Dépannage chambre ou room service', fee: 'Prioritaire' }
];

export const DeliveryDemo: React.FC<DeliveryDemoProps> = ({ state, setView }) => {
  const {
    db,
    reserveDeliveryOrder,
    startDeliveryPreparation,
    markDeliveryReady,
    dispatchDeliveryOrder,
    failDeliveryOrder,
    returnDeliveryOrder,
    deliverDeliveryOrder,
    completeDeliveryProof,
    cancelDeliveryOrder,
    resetAllData
  } = state;
  const deliveryChannel = db.posList.find(pos => pos.id === 'pos-5') || db.posList.find(pos => pos.type === 'online_grocery');
  const deliveryWarehouse = db.warehouses.find(warehouse => warehouse.id === deliveryChannel?.defaultWarehouseId) || db.warehouses.find(warehouse => warehouse.id === 'wh-delivery');
  const orders = db.deliveryOrders.filter(order => order.channelId === deliveryChannel?.id);
  const activeOrderFallback = orders.find(order => !['delivered', 'returned', 'cancelled'].includes(order.status)) || orders[0];
  const [selectedOrderId, setSelectedOrderId] = useState(activeOrderFallback?.id || '');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [proofDrafts, setProofDrafts] = useState<Record<string, { code: string; signature: string; photoLabel: string; latitude: number; longitude: number }>>({});

  const selectedOrder = orders.find(order => order.id === selectedOrderId) || activeOrderFallback;
  const proofDraft = selectedOrder ? proofDrafts[selectedOrder.id] || { code: '', signature: selectedOrder.customerName, photoLabel: `Remise ${selectedOrder.id}`, latitude: 14.7167, longitude: -17.4677 } : null;

  const formatFCFA = (value: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
  );

  const formatQty = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
  const getProduct = (productId: string) => db.products.find(product => product.id === productId);
  const getStock = (productId: string, warehouseId?: string) => db.stocks.find(stock => stock.productId === productId && stock.warehouseId === warehouseId);

  const onlinePricing = db.posPricing.filter(rule => rule.posId === deliveryChannel?.id && rule.isAvailable);
  const onlineStockRows = onlinePricing
    .map(rule => {
      const product = getProduct(rule.productId);
      const stock = getStock(rule.productId, deliveryWarehouse?.id);
      return { product, stock, rule };
    })
    .filter(row => row.product?.isStockable);

  const visibleOnlineProducts = onlineStockRows.filter(row => (row.stock?.quantityAvailable || 0) - (row.stock?.quantityReserved || 0) > 0).length;
  const unavailableOnlineProducts = onlineStockRows.filter(row => (row.stock?.quantityAvailable || 0) - (row.stock?.quantityReserved || 0) <= 0).length;
  const reservedUnits = deliveryWarehouse
    ? db.stocks
        .filter(stock => stock.warehouseId === deliveryWarehouse.id)
        .reduce((sum, stock) => sum + stock.quantityReserved, 0)
    : 0;
  const pendingOrders = orders.filter(order => ['confirmed', 'reserved', 'preparing', 'ready', 'out_for_delivery', 'failed'].includes(order.status)).length;
  const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
  const issueOrders = orders.filter(order => ['failed', 'returned', 'cancelled'].includes(order.status)).length;
  const cashToCollect = orders
    .filter(order => !['delivered', 'returned', 'cancelled'].includes(order.status) && order.paymentStatus === 'pending')
    .reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity * item.salePrice), 0) + order.deliveryFee, 0);

  const orderTotal = selectedOrder
    ? selectedOrder.items.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0) + selectedOrder.deliveryFee
    : 0;
  const reservedBySelectedOrder = selectedOrder && ['reserved', 'preparing', 'ready', 'out_for_delivery', 'failed'].includes(selectedOrder.status);

  const itemRows = selectedOrder.items.map(item => {
    const product = getProduct(item.productId);
    const stock = getStock(item.productId, selectedOrder.warehouseId);
    const ownReservation = reservedBySelectedOrder ? item.quantity : 0;
    const availableForOrder = (stock?.quantityAvailable || 0) - (stock?.quantityReserved || 0) + ownReservation;
    const projectedAfterDelivery = selectedOrder.status === 'delivered'
      ? (stock?.quantityAvailable || 0)
      : Math.max(0, (stock?.quantityAvailable || 0) - item.quantity);
    const substitution = item.substitutionProductId ? getProduct(item.substitutionProductId) : undefined;

    return {
      item,
      product,
      stock,
      substitution,
      availableForOrder,
      projectedAfterDelivery,
      isAvailable: availableForOrder >= item.quantity
    };
  });

  const runAction = (
    label: string,
    action: () => { success: boolean; error?: string; movements?: unknown[] }
  ) => {
    const result = action();
    if (result.success) {
      setMessage({
        type: 'success',
        text: result.movements
          ? `${label} : stock sorti et ${result.movements.length} mouvement(s) créé(s).`
          : `${label} : action enregistrée.`
      });
    } else {
      setMessage({ type: 'error', text: result.error || 'Action impossible' });
    }
  };

  const updateProofDraft = (patch: Partial<NonNullable<typeof proofDraft>>) => {
    if (!selectedOrder || !proofDraft) return;
    setProofDrafts(current => ({ ...current, [selectedOrder.id]: { ...proofDraft, ...patch } }));
  };

  const validateProof = () => {
    if (!selectedOrder || !proofDraft) return;
    try {
      completeDeliveryProof(selectedOrder.id, proofDraft);
      setMessage({ type: 'success', text: 'Preuve complète enregistrée : code, signature, photo et position GPS.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Preuve de livraison invalide' });
    }
  };

  if (!deliveryChannel || !deliveryWarehouse || !selectedOrder) {
    return (
      <div className="manager-mobile-page" style={{ padding: '24px' }}>
        <div className="card" style={{ display: 'grid', gap: '12px' }}>
          <AlertTriangle size={28} color="var(--warning)" />
          <h1>Épicerie / Livraison</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Les exemples livraison ne sont pas encore disponibles. Réinitialisez les exemples pour les recharger.
          </p>
          <button className="btn btn-primary" onClick={resetAllData}>
            Recharger les exemples
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { label: 'Commande confirmée', detail: 'Le client a payé ou confirmé son panier.', rank: 1 },
    { label: 'Stock réservé', detail: 'Les quantités ne sont plus vendables ailleurs.', rank: 2 },
    { label: 'Préparation', detail: "L'équipe prépare le panier sur mobile.", rank: 3 },
    { label: 'Départ livreur', detail: 'Le livreur prend la commande et le suivi démarre.', rank: 5 },
    { label: 'Livraison', detail: 'Le stock sort réellement du dépôt.', rank: 6 }
  ];

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Épicerie en ligne / Livraison</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Parcours dédié : commande client, stock disponible, réservation, préparation, livraison et impact stock.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setView('client')}>Pilotage clients</button>
          <button className="btn btn-secondary" onClick={() => setView('stock-control')}>
            Stock réel
          </button>
          <button className="btn btn-primary" onClick={() => setView('exports')}>
            Rapports
          </button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <ShoppingBag size={22} color="var(--primary)" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Commandes à traiter</p>
          <h2>{pendingOrders}</h2>
        </div>
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <PackageCheck size={22} color="var(--success)" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Produits disponibles en ligne</p>
          <h2>{visibleOnlineProducts}</h2>
        </div>
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <Warehouse size={22} color="var(--warning)" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Quantités réservées</p>
          <h2>{formatQty(reservedUnits)}</h2>
        </div>
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <Truck size={22} color="var(--purple)" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Commandes livrées</p>
          <h2>{deliveredOrders}</h2>
        </div>
      </div>

      <div className="grid-3">
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <MapPin size={22} color="var(--primary)" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Zone sélectionnée</p>
          <h3 style={{ fontSize: '1.05rem' }}>{selectedOrder.zone || 'Zone non définie'}</h3>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Frais: {formatFCFA(selectedOrder.deliveryFee)} • délai cible {selectedOrder.estimatedMinutes || 45} min
          </span>
        </div>
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <Phone size={22} color="var(--success)" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Livreur</p>
          <h3 style={{ fontSize: '1.05rem' }}>{selectedOrder.driverName || 'Non affecté'}</h3>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{selectedOrder.driverPhone || 'Aucun téléphone'}</span>
        </div>
        <div className="card" style={{ display: 'grid', gap: '10px' }}>
          <CircleDollarSign size={22} color="var(--warning)" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>À encaisser</p>
          <h3 style={{ fontSize: '1.05rem' }}>{formatFCFA(cashToCollect)}</h3>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{issueOrders} commande(s) avec incident ou retour.</span>
        </div>
      </div>

      <div className="grid-2 delivery-layout" style={{ alignItems: 'start' }}>
        <div className="card" style={{ display: 'grid', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Commande client</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Sélectionnez une commande puis déroulez le parcours.
              </p>
            </div>
            <select
              className="form-control"
              value={selectedOrder.id}
              onChange={(event) => {
                setSelectedOrderId(event.target.value);
                setMessage(null);
              }}
              style={{ minWidth: '190px' }}
            >
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.id} - {order.customerName}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gap: '10px', padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-lightest)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <strong>{selectedOrder.customerName}</strong>
              <span className={`badge ${STATUS_BADGES[selectedOrder.status]}`}>{STATUS_LABELS[selectedOrder.status]}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
              {selectedOrder.phone} • {selectedOrder.address}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }} className="delivery-info-grid">
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>Canal</p>
                <strong>{deliveryChannel.name}</strong>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>Dépôt</p>
                <strong>{deliveryWarehouse.name}</strong>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>Paiement</p>
                <strong>{PAYMENT_TYPE_LABELS[selectedOrder.paymentType]} • {PAYMENT_STATUS_LABELS[selectedOrder.paymentStatus]}</strong>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>Total</p>
                <strong>{formatFCFA(orderTotal)}</strong>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>Zone</p>
                <strong>{selectedOrder.zone || 'Non définie'}</strong>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700 }}>Livreur</p>
                <strong>{selectedOrder.driverName || 'Non affecté'}</strong>
              </div>
            </div>
            {selectedOrder.deliveryIssue && (
              <div className="badge badge-red" style={{ justifyContent: 'flex-start', whiteSpace: 'normal', lineHeight: 1.4 }}>
                Incident : {selectedOrder.deliveryIssue}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {steps.map(step => {
              const done = selectedOrder.status !== 'cancelled' && STATUS_RANK[selectedOrder.status] >= step.rank;
              return (
                <div key={step.label} className="delivery-step">
                  <div className={done ? 'delivery-step-icon done' : 'delivery-step-icon'}>
                    {done ? <CheckCircle size={16} /> : <span />}
                  </div>
                  <div>
                    <strong>{step.label}</strong>
                    <p>{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <section className={`delivery-proof-panel ${selectedOrder.proofStatus === 'photo_confirmed' ? 'complete' : ''}`}>
            <header><div><ShieldCheck size={20} /><span><strong>Preuve de remise</strong><small>La sortie finale exige le code client, une signature, une photo et la position.</small></span></div><b>{selectedOrder.proofStatus === 'photo_confirmed' ? 'Complète' : 'À recueillir'}</b></header>
            {selectedOrder.proofStatus === 'photo_confirmed' ? <div className="delivery-proof-summary"><CheckCircle size={20} /><span><strong>{selectedOrder.proofSignature}</strong><small>{selectedOrder.proofPhotoLabel} · {selectedOrder.proofLatitude?.toFixed(4)}, {selectedOrder.proofLongitude?.toFixed(4)} · {selectedOrder.proofCompletedAt ? new Date(selectedOrder.proofCompletedAt).toLocaleString('fr-FR') : ''}</small></span></div> : <div className="delivery-proof-form"><label>Code client<input className="form-control" inputMode="numeric" placeholder="4 chiffres" value={proofDraft?.code || ''} onChange={event => updateProofDraft({ code: event.target.value })} /></label><label>Nom / signature<input className="form-control" value={proofDraft?.signature || ''} onChange={event => updateProofDraft({ signature: event.target.value })} /></label><label><Camera size={14} /> Photo de remise<input className="form-control" value={proofDraft?.photoLabel || ''} onChange={event => updateProofDraft({ photoLabel: event.target.value })} /></label><div className="delivery-proof-coordinates"><label>Latitude<input className="form-control" type="number" step="0.0001" value={proofDraft?.latitude || 0} onChange={event => updateProofDraft({ latitude: Number(event.target.value) })} /></label><label>Longitude<input className="form-control" type="number" step="0.0001" value={proofDraft?.longitude || 0} onChange={event => updateProofDraft({ longitude: Number(event.target.value) })} /></label></div><small>Code client de démonstration : <strong>{selectedOrder.verificationCode}</strong></small><button className="btn btn-secondary" disabled={selectedOrder.status !== 'out_for_delivery'} onClick={validateProof}><ShieldCheck size={16} /> Certifier la remise</button></div>}
          </section>

          {message && (
            <div className={`badge ${message.type === 'success' ? 'badge-green' : 'badge-red'}`} style={{ justifyContent: 'flex-start', whiteSpace: 'normal', lineHeight: 1.4 }}>
              {message.text}
            </div>
          )}

          <div className="delivery-actions">
            <button
              className="btn btn-primary"
              disabled={selectedOrder.status !== 'confirmed'}
              onClick={() => runAction('Réservation stock', () => reserveDeliveryOrder(selectedOrder.id))}
            >
              Réserver le stock
            </button>
            <button
              className="btn btn-secondary"
              disabled={selectedOrder.status !== 'reserved'}
              onClick={() => runAction('Préparation', () => startDeliveryPreparation(selectedOrder.id))}
            >
              Préparer
            </button>
            <button
              className="btn btn-secondary"
              disabled={!['reserved', 'preparing'].includes(selectedOrder.status)}
              onClick={() => runAction('Commande prête', () => markDeliveryReady(selectedOrder.id))}
            >
              Marquer prête
            </button>
            <button
              className="btn btn-primary"
              disabled={selectedOrder.status !== 'ready'}
              onClick={() => runAction('Départ livreur', () => dispatchDeliveryOrder(selectedOrder.id))}
            >
              Départ livreur <Truck size={16} />
            </button>
            <button
              className="btn btn-primary"
              disabled={selectedOrder.status !== 'out_for_delivery' || selectedOrder.proofStatus !== 'photo_confirmed'}
              onClick={() => runAction('Livraison validée', () => deliverDeliveryOrder(selectedOrder.id))}
            >
              Valider livraison <ArrowRight size={16} />
            </button>
            <button
              className="btn btn-secondary"
              disabled={selectedOrder.status !== 'out_for_delivery'}
              onClick={() => runAction('Livraison non aboutie', () => failDeliveryOrder(selectedOrder.id, 'Client absent ou injoignable'))}
            >
              Client absent
            </button>
            <button
              className="btn btn-secondary"
              disabled={selectedOrder.status !== 'failed'}
              onClick={() => runAction('Retour dépôt', () => returnDeliveryOrder(selectedOrder.id))}
            >
              <Undo2 size={16} /> Retour dépôt
            </button>
            <button
              className="btn btn-secondary"
              disabled={['delivered', 'returned', 'cancelled'].includes(selectedOrder.status)}
              onClick={() => runAction('Annulation', () => cancelDeliveryOrder(selectedOrder.id))}
            >
              Annuler
            </button>
          </div>
        </div>

        <div className="card" style={{ display: 'grid', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardCheck size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Ce que le parcours montre</h3>
          </div>
          {[
            ['Catalogue', 'Un produit reste unique, même vendu en restaurant et en ligne.'],
            ['Disponibilité', 'Le stock vendable tient compte des quantités déjà réservées.'],
            ['Réservation', 'Une commande confirmée bloque le stock sans le sortir physiquement.'],
            ['Préparation', "L'équipe sait quoi prendre dans le dépôt de livraison."],
            ['Zones', 'Les frais, délais et livreurs changent selon le quartier.'],
            ['Incidents', 'Une commande non livrée garde sa trace et peut revenir au dépôt.'],
            ['Preuve de remise', 'Code client, signature, photo et position sont exigés avant la sortie définitive.'],
            ['Livraison', 'La validation crée la sortie stock et la vente dans les rapports.']
          ].map(item => (
            <div key={item[0]} className="proof-row">
              <CheckCircle size={16} color="var(--success)" style={{ flexShrink: 0 }} />
              <strong>{item[0]}</strong>
              <span>{item[1]}</span>
            </div>
          ))}
          <button className="btn btn-secondary" onClick={resetAllData}>
            <RefreshCcw size={16} /> Réinitialiser les exemples
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Préparation du panier</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Le préparateur voit les quantités à prendre, le stock disponible et l'impact attendu.
            </p>
          </div>
          <span className="badge badge-blue">{selectedOrder.items.length} ligne(s)</span>
        </div>

        <div className="delivery-items-grid">
          {itemRows.map(row => (
            <div key={row.item.productId} className="delivery-item-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <strong>{row.product?.name}</strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
                    À préparer : {formatQty(row.item.quantity)} {row.product?.baseUnit}
                  </p>
                </div>
                <span className={`badge ${row.isAvailable ? 'badge-green' : 'badge-red'}`}>
                  {row.isAvailable ? 'Disponible' : 'Rupture'}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span>Prix ligne</span>
                  <strong>{formatFCFA(row.item.quantity * row.item.salePrice)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span>Stock physique</span>
                  <strong>{formatQty(row.stock?.quantityAvailable || 0)} {row.product?.baseUnit}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span>Déjà réservé</span>
                  <strong>{formatQty(row.stock?.quantityReserved || 0)} {row.product?.baseUnit}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span>Disponible à vendre</span>
                  <strong>{formatQty(Math.max(0, (row.stock?.quantityAvailable || 0) - (row.stock?.quantityReserved || 0)))} {row.product?.baseUnit}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span>Après livraison</span>
                  <strong>{formatQty(row.projectedAfterDelivery)} {row.product?.baseUnit}</strong>
                </div>
              </div>
              {row.substitution && (
                <div style={{ marginTop: '12px', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--warning-light)', color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                  Remplacement possible : <strong>{row.substitution.name}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid-3">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Package size={22} color="var(--primary)" />
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800 }}>Stock en ligne</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
              {unavailableOnlineProducts} produit(s) masquable(s) si rupture.
            </p>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <CreditCard size={22} color="var(--success)" />
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800 }}>Paiements locaux</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
              Wave, Orange Money, espèces et carte.
            </p>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <CircleDollarSign size={22} color="var(--warning)" />
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800 }}>Prix par canal</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
              Le prix en ligne peut être différent du prix restaurant.
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Paniers types</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Exemples de commandes locales pour vérifier les prix, la disponibilité et la préparation.
          </p>
        </div>
        <div className="grid-4">
          {BASKET_TYPES.map(basket => (
            <div key={basket.name} className="delivery-item-card">
              <strong>{basket.name}</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '6px' }}>{basket.detail}</p>
              <span className="badge badge-blue" style={{ marginTop: '12px' }}>{basket.fee}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeliveryDemo;
