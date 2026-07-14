import React from 'react';
import { AlertTriangle, ArrowRight, BedDouble, CheckCircle, ChefHat, CircleDollarSign, Clock3, Package, ReceiptText, Users, Warehouse } from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { RestaurantGuestOrder } from '../types';

interface ManagerAnswerProps {
  state: StockState;
  setView: (view: string) => void;
}

export const ManagerAnswer: React.FC<ManagerAnswerProps> = ({ state, setView }) => {
  const { db, updateRestaurantGuestOrderStatus } = state;
  const coca = db.products.find(product => product.id === 'prod-coca');
  const demoPOS = db.posList.filter(pos => ['pos-1', 'pos-2', 'pos-3'].includes(pos.id));
  const openFolios = db.pmsFolios.filter(folio => folio.status === 'open');

  const formatFCFA = (value: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
  );

  const formatQty = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);

  const proofRows = demoPOS.map(pos => {
    const pricing = db.posPricing.find(item => item.productId === coca?.id && item.posId === pos.id);
    const warehouse = db.warehouses.find(item => item.id === (pricing?.defaultWarehouseId || pos.defaultWarehouseId));
    const stock = db.stocks.find(item => item.productId === coca?.id && item.warehouseId === warehouse?.id);
    return { pos, pricing, warehouse, stock };
  });

  const uniqueWarehouses = new Set(proofRows.map(row => row.warehouse?.id).filter(Boolean)).size;
  const uniquePrices = new Set(proofRows.map(row => row.pricing?.salePrice).filter(Boolean)).size;
  const activeOrders = db.restaurantGuestOrders.filter(order => !['paid', 'cancelled'].includes(order.status)).slice(0, 6);
  const upcomingReservations = db.restaurantReservations.filter(reservation => ['confirmed', 'seated'].includes(reservation.status)).slice(0, 5);
  const openFeedback = db.sartalCustomerFeedback.filter(feedback => feedback.context === 'restaurant' && feedback.recoveryStatus === 'open');
  const orderStatusLabels: Record<RestaurantGuestOrder['status'], string> = { placed: 'Reçue', confirmed: 'Confirmée', preparing: 'En cuisine', ready: 'Prête', served: 'Servie', paid: 'Payée', cancelled: 'Annulée' };
  const nextOrderStatus: Record<RestaurantGuestOrder['status'], RestaurantGuestOrder['status'] | null> = { placed: 'preparing', confirmed: 'preparing', preparing: 'ready', ready: 'served', served: null, paid: null, cancelled: null };
  const nextOrderLabels: Partial<Record<RestaurantGuestOrder['status'], string>> = { placed: 'Démarrer', confirmed: 'Démarrer', preparing: 'Marquer prête', ready: 'Servir' };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Restaurant / POS</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Un seul produit dans le catalogue, plusieurs prix de vente, plusieurs dépôts de sortie et une imputation chambre possible.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setView('client')}>Pilotage clients</button>
          <button className="btn btn-secondary" onClick={() => setView('pricing')}>
            Prix par canal
          </button>
          <button className="btn btn-primary" onClick={() => setView('simulation')}>
            Lancer le scénario <ArrowRight size={17} />
          </button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card">
          <Package size={22} color="var(--primary)" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '10px', fontWeight: 700, fontSize: '0.85rem' }}>Produit unique</p>
          <h2 style={{ marginTop: '6px' }}>{coca?.name || 'Coca-Cola 33 cl'}</h2>
        </div>
        <div className="card">
          <CircleDollarSign size={22} color="var(--success)" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '10px', fontWeight: 700, fontSize: '0.85rem' }}>Prix différents</p>
          <h2 style={{ marginTop: '6px' }}>{uniquePrices} tarifs actifs</h2>
        </div>
        <div className="card">
          <Warehouse size={22} color="var(--warning)" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '10px', fontWeight: 700, fontSize: '0.85rem' }}>Stocks séparés</p>
          <h2 style={{ marginTop: '6px' }}>{uniqueWarehouses} dépôts</h2>
        </div>
        <div className="card">
          <BedDouble size={22} color="var(--purple)" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '10px', fontWeight: 700, fontSize: '0.85rem' }}>PMS hôtel</p>
          <h2 style={{ marginTop: '6px' }}>{openFolios.length} folios ouverts</h2>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Fonctionnement proposé</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}>
              Le même Coca-Cola est vendu dans trois points de vente, sans dupliquer le produit.
            </p>
          </div>
          <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Point de vente</th>
                  <th>Prix</th>
                  <th>TVA</th>
                  <th>Dépôt impacté</th>
                  <th>Stock actuel</th>
                </tr>
              </thead>
              <tbody>
                {proofRows.map(row => (
                  <tr key={row.pos.id}>
                    <td style={{ fontWeight: 800 }}>{row.pos.name}</td>
                    <td>{formatFCFA(row.pricing?.salePrice || 0)}</td>
                    <td>{row.pricing?.taxRate || 0}%</td>
                    <td>{row.warehouse?.name}</td>
                    <td>{formatQty(row.stock?.quantityAvailable || 0)} {coca?.baseUnit || 'unité'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {proofRows.map(row => (
              <div key={row.pos.id} className="mobile-data-card">
                <div className="mobile-data-header">
                  <div>
                    <div className="mobile-data-title">{row.pos.name}</div>
                    <div className="mobile-data-subtitle">{row.warehouse?.name || 'Dépôt non configuré'}</div>
                  </div>
                  <span className="badge badge-blue">{formatFCFA(row.pricing?.salePrice || 0)}</span>
                </div>
                <div className="mobile-data-row">
                  <span>TVA</span>
                  <strong>{row.pricing?.taxRate || 0}%</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Stock actuel</span>
                  <strong>{formatQty(row.stock?.quantityAvailable || 0)} {coca?.baseUnit || 'unité'}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card proof-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <ReceiptText size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Bénéfices pour l'établissement</h3>
          </div>
          {[
            ['Produit', 'Le produit reste unique : pas de doublon Coca par bar ou restaurant.'],
            ['Prix', 'Le tarif vient du point de vente qui réalise la vente.'],
            ['Stock', 'La sortie se fait sur le dépôt associé au POS.'],
            ['PMS', 'Une consommation peut être envoyée sur le folio chambre.'],
            ['Audit', 'Chaque vente laisse un mouvement stock traçable.']
          ].map(item => (
            <div key={item[0]} className="proof-row">
              <CheckCircle size={16} color="var(--success)" style={{ flexShrink: 0 }} />
              <strong>{item[0]}</strong>
              <span>{item[1]}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="restaurant-operations">
        <header>
          <div>
            <span>EXPÉRIENCE CLIENT · CÔTÉ ÉQUIPE</span>
            <h2>Le service en temps réel</h2>
            <p>Les demandes du client deviennent immédiatement des actions pour la salle, la cuisine et le responsable.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setView('client')}>Suivre l’expérience client <ArrowRight size={16} /></button>
        </header>
        <div className="restaurant-operations-grid">
          <article className="restaurant-operation-panel">
            <div className="restaurant-operation-title"><Users size={19} /><div><strong>Réservations & arrivées</strong><span>{upcomingReservations.length} à préparer</span></div></div>
            <div className="restaurant-operation-list">
              {upcomingReservations.map(reservation => {
                const customer = db.sartalCustomers.find(item => item.id === reservation.customerId);
                return <div className="restaurant-reservation-row" key={reservation.id}><time>{reservation.time}</time><div><strong>{customer?.fullName || 'Client'}</strong><span>{reservation.guests} pers. · {reservation.tableNumber || 'Table à attribuer'}</span>{customer?.allergies && <small><AlertTriangle size={13} /> Allergie : {customer.allergies}</small>}</div><b>{reservation.status === 'seated' ? 'Installé' : 'Confirmé'}</b></div>;
              })}
              {upcomingReservations.length === 0 && <p className="restaurant-operation-empty">Aucune arrivée à préparer.</p>}
            </div>
          </article>

          <article className="restaurant-operation-panel kitchen">
            <div className="restaurant-operation-title"><ChefHat size={19} /><div><strong>File cuisine</strong><span>{activeOrders.length} commande(s) active(s)</span></div></div>
            <div className="restaurant-operation-list">
              {activeOrders.map(order => {
                const customer = db.sartalCustomers.find(item => item.id === order.customerId);
                const nextStatus = nextOrderStatus[order.status];
                return <div className="restaurant-kds-row" key={order.id}><div className="restaurant-kds-head"><div><strong>{order.tableNumber ? `Table ${order.tableNumber}` : order.roomNumber ? `Chambre ${order.roomNumber}` : 'À emporter'}</strong><span>{customer?.fullName}</span></div><b data-status={order.status}>{orderStatusLabels[order.status]}</b></div><ul>{order.items.map((item, index) => <li key={`${item.productId}-${index}`}><strong>{item.quantity}×</strong>{db.products.find(product => product.id === item.productId)?.name || 'Article'}</li>)}</ul>{customer?.allergies && <small className="restaurant-kds-alert"><AlertTriangle size={13} /> Sans {customer.allergies.toLowerCase()}</small>}<footer><span><Clock3 size={13} /> {order.estimatedMinutes} min</span>{nextStatus && <button onClick={() => updateRestaurantGuestOrderStatus(order.id, nextStatus)}>{nextOrderLabels[order.status]} <ArrowRight size={14} /></button>}</footer></div>;
              })}
              {activeOrders.length === 0 && <p className="restaurant-operation-empty">Aucune commande en attente.</p>}
            </div>
          </article>

          <article className="restaurant-operation-panel">
            <div className="restaurant-operation-title"><AlertTriangle size={19} /><div><strong>Attention client</strong><span>{openFeedback.length} situation(s) à reprendre</span></div></div>
            <div className="restaurant-operation-list">
              {openFeedback.map(feedback => {
                const customer = db.sartalCustomers.find(item => item.id === feedback.customerId);
                return <div className="restaurant-feedback-row" key={feedback.id}><b>{feedback.score}/5</b><div><strong>{customer?.fullName || 'Client'}</strong><span>{feedback.note || 'Retour client à traiter'}</span></div></div>;
              })}
              {openFeedback.length === 0 && <div className="restaurant-service-ok"><CheckCircle size={22} /><strong>Aucune réclamation ouverte</strong><span>L’équipe peut se concentrer sur le service en cours.</span></div>}
            </div>
          </article>
        </div>
      </section>

      <div className="card" style={{ display: 'grid', gap: '14px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Une mise en place progressive</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Sartal peut d'abord se connecter aux ventes existantes pour relier chaque point de vente à son dépôt, fiabiliser le stock et conserver un catalogue unique. Les autres modules peuvent ensuite être déployés progressivement, sans remplacement brutal des outils actuels.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setView('simulation')}>Simuler les ventes</button>
          <button className="btn btn-secondary" onClick={() => setView('exports')}>Voir les rapports</button>
        </div>
      </div>
    </div>
  );
};

export default ManagerAnswer;
