import React from 'react';
import { StockState } from '../hooks/useStockState';
import { 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Trash2, 
  ShoppingCart, 
  ArrowRightLeft, 
  ClipboardList, 
  ChevronRight,
  Database,
  Package,
  PlayCircle,
  ShieldCheck,
  Truck,
  Utensils
} from 'lucide-react';
import { StockMovement } from '../types';

interface DashboardProps {
  state: StockState;
  setView: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, setView }) => {
  const { db } = state;

  // 1. Calculate KPIs
  // Total stock value = sum of stock qty * avgCost
  const totalStockValue = db.stocks.reduce((sum, s) => sum + (s.quantityAvailable * s.averageCost), 0);

  // Products under safety threshold
  const underThresholdProducts = db.products.filter(p => {
    if (!p.isStockable) return false;
    const totalQty = db.stocks
      .filter(s => s.productId === p.id)
      .reduce((sum, s) => sum + s.quantityAvailable, 0);
    return totalQty < p.globalAlertThreshold;
  });

  // Near expiry batches (within 30 days)
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);

  const nearExpiryBatches = db.batches.filter(b => {
    if (!b.expiryDate || b.quantity <= 0) return false;
    const expiry = new Date(b.expiryDate);
    return expiry >= today && expiry <= thirtyDaysLater;
  });

  // Out of stock products
  const outOfStockProducts = db.products.filter(p => {
    if (!p.isStockable) return false;
    const totalQty = db.stocks
      .filter(s => s.productId === p.id)
      .reduce((sum, s) => sum + s.quantityAvailable, 0);
    return totalQty === 0;
  });

  // Losses this month
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lossesThisMonth = db.losses.filter(l => new Date(l.date) >= firstDayOfMonth);
  const totalLossCost = lossesThisMonth.reduce((sum, l) => {
    const mvt = db.movements.find(m => m.batchId === l.batchId && m.type === 'loss');
    const cost = mvt ? Math.abs(mvt.cost) : 0;
    return sum + (l.quantity * cost);
  }, 0);

  // 2. Charts calculations
  // Consumption by POS (Donut Chart)
  // Let's compute total consumption value per POS from externalSales
  const posConsumptionMap: Record<string, number> = {};
  const salesThisMonth = db.externalSales.filter(sale => new Date(sale.date) >= firstDayOfMonth);
  salesThisMonth.forEach(sale => {
    const saleTotal = sale.items.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0);
    posConsumptionMap[sale.posId] = (posConsumptionMap[sale.posId] || 0) + saleTotal;
  });

  // Ensure default POS are in list
  db.posList.forEach(pos => {
    if (!posConsumptionMap[pos.id]) posConsumptionMap[pos.id] = 0;
  });

  const totalPosSales = Object.values(posConsumptionMap).reduce((sum, v) => sum + v, 0) || 1; // avoid divide by zero

  // Sales revenue routed to each output warehouse by the POS/product configuration.
  const depotSalesMap: Record<string, number> = {};
  salesThisMonth.forEach(sale => {
    const pos = db.posList.find(item => item.id === sale.posId);
    if (!pos) return;

    sale.items.forEach(item => {
      const pricing = db.posPricing.find(rule => rule.productId === item.productId && rule.posId === sale.posId);
      const warehouseId = pricing?.defaultWarehouseId || pos.defaultWarehouseId;
      const saleValue = item.quantity * item.salePrice;
      depotSalesMap[warehouseId] = (depotSalesMap[warehouseId] || 0) + saleValue;
    });
  });

  // Ensure warehouses are in list
  db.warehouses.forEach(w => {
    if (!depotSalesMap[w.id]) depotSalesMap[w.id] = 0;
  });

  // Formatter FCFA
  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA');
  };

  const getMovementColorClass = (type: StockMovement['type']) => {
    switch (type) {
      case 'purchase_received': return 'badge-green';
      case 'sale_consumption': return 'badge-blue';
      case 'transfer_out':
      case 'transfer_in': return 'badge-info';
      case 'inventory_adjustment': return 'badge-purple';
      case 'loss': return 'badge-red';
      default: return 'badge-yellow';
    }
  };

  const getMovementLabel = (type: StockMovement['type']) => {
    switch (type) {
      case 'purchase_received': return 'Réception';
      case 'sale_consumption': return 'Vente / livraison';
      case 'transfer_out': return 'Transfert Sortant';
      case 'transfer_in': return 'Transfert Entrant';
      case 'inventory_adjustment': return 'Inventaire';
      case 'loss': return 'Perte';
      default: return 'Manuel';
    }
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Welcome banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Choisir le contexte à présenter
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Restaurant, hôtel, bar ou plateforme de livraison : le stock reste commun, la présentation s'adapte au métier.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={db.currentUser.id} 
            onChange={(e) => state.changeCurrentUser(e.target.value)}
            className="form-control"
            style={{ fontWeight: 600 }}
          >
            {db.users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role.toUpperCase()})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-3 demo-choice-grid">
        <button
          className="card business-entry-card"
          onClick={() => setView('answer')}
          style={{ textAlign: 'left', cursor: 'pointer', display: 'grid', gap: '14px' }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-lightest)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Utensils size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem' }}>Restaurant / POS</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
              Même produit, prix différent par point de vente, dépôt différent, caisse, paiements et PMS hôtel.
            </p>
          </div>
          <span style={{ color: 'var(--primary)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Ouvrir la réponse <ChevronRight size={17} />
          </span>
        </button>

        <button
          className="card business-entry-card"
          onClick={() => setView('delivery')}
          style={{ textAlign: 'left', cursor: 'pointer', display: 'grid', gap: '14px' }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem' }}>Épicerie en ligne / Livraison</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
              Commande client, stock disponible, réservation, préparation, substitution et sortie stock à la livraison.
            </p>
          </div>
          <span style={{ color: 'var(--success)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Ouvrir la livraison <ChevronRight size={17} />
          </span>
        </button>

        <button
          className="card business-entry-card"
          onClick={() => setView('stock-control')}
          style={{ textAlign: 'left', cursor: 'pointer', display: 'grid', gap: '14px' }}
        >
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem' }}>Stock commun</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
              Catalogue unique, stocks par dépôt, réservations, mouvements, pertes, inventaires et rapports.
            </p>
          </div>
          <span style={{ color: 'var(--warning)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Voir le stock réel <ChevronRight size={17} />
          </span>
        </button>
      </div>

      <div className="card demo-mode-strip">
        <div>
          <Database size={20} color="var(--primary)" />
          <strong>Données de démonstration</strong>
          <span>Vous pouvez cliquer, simuler et modifier sans conséquence réelle.</span>
        </div>
        <div>
          <PlayCircle size={20} color="var(--success)" />
          <strong>Guide autonome</strong>
          <span>La page Présentation guidée donne le pas-à-pas complet quand le prospect navigue seul.</span>
        </div>
        <div>
          <Package size={20} color="var(--warning)" />
          <strong>Passage au réel</strong>
          <span>Catalogue, dépôts, prix et exports pourront être remplacés par des données client.</span>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Vue de gestion du stock commun</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Ces indicateurs servent aux deux parcours : restaurant comme livraison.
        </p>
      </div>

      {/* KPI Section */}
      <div className="grid-4">
        
        {/* KPI 1 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Valeur totale du stock</span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-lightest)', color: 'var(--primary)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800 }}>{formatFCFA(totalStockValue)}</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', marginTop: '4px' }}>
              Valorisation au coût moyen actuel
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setView('stock-control')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Produits sous seuil</span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800 }}>{underThresholdProducts.length}</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Voir la liste <ChevronRight size={16} />
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setView('stock-control')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Produits bientôt périmés</span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800 }}>{nearExpiryBatches.length}</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Voir la liste <ChevronRight size={16} />
            </p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pertes ce mois</span>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--purple-light)', color: 'var(--purple)' }}>
              <Trash2 size={20} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800 }}>{formatFCFA(totalLossCost)}</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', marginTop: '4px' }}>
              Pertes déclarées depuis le début du mois
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid-3 dashboard-analytics-grid" style={{ gridTemplateColumns: '1fr 1fr 280px' }}>
        
        {/* Consommation par POS */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Ventes par canal (ce mois)</h3>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexGrow: 1 }}>
            
            {/* Custom SVG Donut Chart */}
            <div style={{ width: '130px', height: '130px', position: 'relative', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                {(() => {
                  let accumulatedPercent = 0;
                  const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#94a3b8'];
                  
                  return db.posList.map((pos, idx) => {
                    const sales = posConsumptionMap[pos.id] || 0;
                    const percent = (sales / totalPosSales) * 100;
                    if (percent <= 0) return null;

                    const strokeDash = `${percent} ${100 - percent}`;
                    const strokeOffset = 100 - accumulatedPercent + 25; // 25 is to start from top
                    accumulatedPercent += percent;

                    return (
                      <circle 
                        key={pos.id}
                        cx="18" 
                        cy="18" 
                        r="15.915" 
                        fill="none" 
                        stroke={colors[idx % colors.length]} 
                        strokeWidth="3.5" 
                        strokeDasharray={strokeDash}
                        strokeDashoffset={strokeOffset}
                      />
                    );
                  });
                })()}
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>
                  {totalPosSales > 1 ? formatFCFA(totalPosSales).split(' ')[0] : '0'}
                </span>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>FCFA</span>
              </div>
            </div>

            {/* Legends */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {(() => {
                const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#94a3b8'];
                return db.posList.map((pos, idx) => {
                  const sales = posConsumptionMap[pos.id] || 0;
                  const pct = totalPosSales > 1 ? Math.round((sales / totalPosSales) * 100) : 0;
                  return (
                    <div key={pos.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[idx % colors.length] }} />
                        <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{pos.name}</span>
                      </div>
                      <span style={{ fontWeight: 700 }}>{pct}%</span>
                    </div>
                  );
                });
              })()}
            </div>

          </div>
        </div>

        {/* Ventes par dépôt de sortie */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Ventes par dépôt de sortie (ce mois)</h3>
          
          {/* Custom CSS Bar Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center', flexGrow: 1 }}>
            {(() => {
              const maxVal = Math.max(...Object.values(depotSalesMap), 1);
              return db.warehouses.map(w => {
                const sales = depotSalesMap[w.id] || 0;
                const pct = (sales / maxVal) * 100;
                return (
                  <div key={w.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{w.name}</span>
                      <span>{formatFCFA(sales)}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--success)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Sidebar Alerts */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Alertes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger-light)', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Ruptures de stock</span>
              <span style={{ fontWeight: 800, color: 'var(--danger)' }}>{outOfStockProducts.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--warning-light)', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--warning)' }}>Produits sous seuil</span>
              <span style={{ fontWeight: 800, color: 'var(--warning)' }}>{underThresholdProducts.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger-light)', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Lots bientôt périmés</span>
              <span style={{ fontWeight: 800, color: 'var(--danger)' }}>{nearExpiryBatches.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-lightest)', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Commandes livraison</span>
              <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                {db.deliveryOrders.filter(order => ['confirmed', 'reserved', 'preparing', 'ready', 'out_for_delivery', 'failed'].includes(order.status)).length}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Row */}
      <div className="grid-3 dashboard-bottom-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr 1fr' }}>
        
        {/* Recent Movements */}
        <div className="card" style={{ overflow: 'hidden', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Mouvements récents</h3>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setView('movements')}>
              Voir tout
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Produit</th>
                  <th>Dépôt</th>
                  <th>Qté</th>
                  <th>Utilisateur</th>
                </tr>
              </thead>
              <tbody>
                {db.movements.slice(-5).reverse().map((mvt) => {
                  const prod = db.products.find(p => p.id === mvt.productId);
                  const wh = db.warehouses.find(w => w.id === mvt.warehouseId);
                  return (
                    <tr key={mvt.id}>
                      <td>
                        <span className={`badge ${getMovementColorClass(mvt.type)}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          {getMovementLabel(mvt.type)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{prod?.name}</td>
                      <td>{wh?.name}</td>
                      <td style={{ fontWeight: 700, color: mvt.quantity < 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {mvt.quantity > 0 ? `+${mvt.quantity}` : mvt.quantity} {mvt.unit}
                      </td>
                      <td>{mvt.userName}</td>
                    </tr>
                  );
                })}
                {db.movements.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                      Aucun mouvement récent
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Consumed Products */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Top produits consommés</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(() => {
              // Calculate total quantity consumed (movements where quantity < 0 and type is sale_consumption)
              const consumptionByProd: Record<string, number> = {};
              db.movements
                .filter(m => m.quantity < 0 && m.type === 'sale_consumption')
                .forEach(mvt => {
                  consumptionByProd[mvt.productId] = (consumptionByProd[mvt.productId] || 0) + Math.abs(mvt.quantity);
                });

              const sortedProds = Object.entries(consumptionByProd)
                .map(([id, qty]) => ({ id, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);

              return sortedProds.map((item, index) => {
                const prod = db.products.find(p => p.id === item.id);
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-muted)', width: '16px' }}>
                      {index + 1}
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={16} color="var(--primary)" />
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      <p style={{ fontSize: '0.825rem', fontWeight: 700 }}>{prod?.name}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Code article : {prod?.sku}</p>
                    </div>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700 }}>
                      {item.qty} {prod?.baseUnit}
                    </span>
                  </div>
                );
              });
            })()}
            {Object.keys(db.movements.filter(m => m.quantity < 0 && m.type === 'sale_consumption')).length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem', padding: '10px' }}>
                Aucune consommation enregistrée
              </p>
            )}
          </div>
        </div>

        {/* Expiring Lots */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Lots bientôt périmés</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {nearExpiryBatches.slice(0, 3).map(b => {
              const prod = db.products.find(p => p.id === b.productId);
              const wh = db.warehouses.find(w => w.id === b.warehouseId);
              const daysLeft = Math.ceil((new Date(b.expiryDate!).getTime() - today.getTime()) / (1000 * 3600 * 24));
              return (
                <div key={b.id} style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '0.825rem', fontWeight: 700 }}>{prod?.name}</h4>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lot: {b.batchNumber} • Dépôt: {wh?.name}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>
                      {daysLeft} jours
                    </span>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '4px' }}>{b.quantity} {prod?.baseUnit}</p>
                  </div>
                </div>
              );
            })}
            {nearExpiryBatches.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem', padding: '10px' }}>
                Aucun lot proche de la péremption
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Quick actions panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Actions rapides</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setView('purchases')} style={{ flexGrow: 1 }}>
            <ShoppingCart size={18} /> Nouvelle commande fournisseur
          </button>
          <button className="btn btn-secondary" onClick={() => setView('transfers')} style={{ flexGrow: 1 }}>
            <ArrowRightLeft size={18} /> Transférer du stock
          </button>
          <button className="btn btn-secondary" onClick={() => setView('inventories')} style={{ flexGrow: 1 }}>
            <ClipboardList size={18} /> Nouvel inventaire
          </button>
          <button className="btn btn-secondary" onClick={() => setView('losses')} style={{ flexGrow: 1 }}>
            <Trash2 size={18} /> Déclarer une perte
          </button>
        </div>
      </div>

    </div>
  );
};
export default Dashboard;
