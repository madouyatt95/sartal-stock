import React from 'react';
import { StockState } from '../hooks/useStockState';
import {
  AlertTriangle,
  ArrowRightLeft,
  ClipboardCheck,
  PackageCheck,
  PackageX,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Warehouse
} from 'lucide-react';
import { PAYMENT_TYPE_LABELS, StockMovement } from '../types';

interface StockControlProps {
  state: StockState;
  setView: (view: string) => void;
}

export const StockControl: React.FC<StockControlProps> = ({ state, setView }) => {
  const { db } = state;
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);

  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA');
  };

  const formatQty = (qty: number) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(qty);
  };

  const getProduct = (productId: string) => db.products.find(p => p.id === productId);
  const getWarehouse = (warehouseId: string) => db.warehouses.find(w => w.id === warehouseId);

  const stockValue = db.stocks.reduce((sum, stock) => sum + (stock.quantityAvailable * stock.averageCost), 0);
  const stockRows = db.stocks.map(stock => {
    const product = getProduct(stock.productId);
    const warehouse = getWarehouse(stock.warehouseId);
    const value = stock.quantityAvailable * stock.averageCost;
    const status = stock.quantityAvailable === 0 ? 'rupture' : stock.quantityAvailable < stock.alertThreshold ? 'alerte' : 'normal';
    return { stock, product, warehouse, value, status };
  });

  const criticalStocks = stockRows
    .filter(row => row.status !== 'normal')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'rupture' ? -1 : 1;
      return a.stock.quantityAvailable - b.stock.quantityAvailable;
    });

  const nearExpiryBatches = db.batches
    .filter(batch => {
      if (!batch.expiryDate || batch.quantity <= 0) return false;
      const expiry = new Date(batch.expiryDate);
      return expiry <= thirtyDaysLater;
    })
    .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''));

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lossesThisMonth = db.losses.filter(loss => new Date(loss.date) >= monthStart);
  const lossValueThisMonth = lossesThisMonth.reduce((sum, loss) => {
    const stock = db.stocks.find(s => s.productId === loss.productId && s.warehouseId === loss.warehouseId);
    return sum + (loss.quantity * (stock?.averageCost || 0));
  }, 0);

  const warehouseCards = db.warehouses.map(warehouse => {
    const rows = stockRows.filter(row => row.stock.warehouseId === warehouse.id);
    return {
      warehouse,
      value: rows.reduce((sum, row) => sum + row.value, 0),
      productCount: rows.length,
      alerts: rows.filter(row => row.status !== 'normal').length,
      recentOutCost: db.movements
        .filter(movement => movement.warehouseId === warehouse.id && movement.quantity < 0)
        .slice(-8)
        .reduce((sum, movement) => sum + Math.abs(movement.quantity * movement.cost), 0)
    };
  });

  const recentMovements = db.movements
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  const latestSales = db.externalSales
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const getMovementLabel = (type: StockMovement['type']) => {
    switch (type) {
      case 'purchase_received': return 'Réception';
      case 'sale_consumption': return 'Vente / livraison';
      case 'transfer_out': return 'Transfert sortant';
      case 'transfer_in': return 'Transfert entrant';
      case 'inventory_adjustment': return 'Inventaire';
      case 'loss': return 'Perte';
      case 'production': return 'Préparation';
      default: return 'Correction';
    }
  };

  const actionCards = [
    { label: 'Réceptionner', detail: 'Entrer des achats en stock', icon: <PackageCheck size={18} />, view: 'receiving' },
    { label: 'Transférer', detail: 'Rééquilibrer les dépôts', icon: <ArrowRightLeft size={18} />, view: 'transfers' },
    { label: 'Inventorier', detail: 'Comparer réel vs théorique', icon: <ClipboardCheck size={18} />, view: 'inventories' },
    { label: 'Déclarer perte', detail: 'Casse, vol, péremption', icon: <Trash2 size={18} />, view: 'losses' },
    { label: 'Réapprovisionner', detail: 'Créer les commandes', icon: <ShoppingCart size={18} />, view: 'reorder' }
  ];

  return (
    <div className="manager-mobile-page stock-control-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Stock réel par dépôt</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Stock disponible par dépôt, alertes, pertes, péremptions et détail des sorties liées aux ventes.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setView('stocks')}>
          <Warehouse size={18} /> Voir le détail des lots
        </button>
      </div>

      <div className="grid-4 stock-kpi-grid">
        <div className="card stock-kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Valeur du stock</span>
            <ShieldCheck size={20} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.6rem' }}>{formatFCFA(stockValue)}</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{db.stocks.length} positions produit/dépôt suivies</span>
        </div>

        <div className="card stock-kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Alertes rupture/seuil</span>
            <AlertTriangle size={20} color="var(--warning)" />
          </div>
          <h2 style={{ fontSize: '1.6rem' }}>{criticalStocks.length}</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>À commander ou transférer rapidement</span>
        </div>

        <div className="card stock-kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Lots à surveiller</span>
            <PackageX size={20} color="var(--danger)" />
          </div>
          <h2 style={{ fontSize: '1.6rem' }}>{nearExpiryBatches.length}</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Périmés ou DLC dans 30 jours</span>
        </div>

        <div className="card stock-kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Pertes du mois</span>
            <Trash2 size={20} color="var(--danger)" />
          </div>
          <h2 style={{ fontSize: '1.6rem' }}>{formatFCFA(lossValueThisMonth)}</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{lossesThisMonth.length} déclaration(s) de perte</span>
        </div>
      </div>

      <div className="grid-3">
        {actionCards.map(action => (
          <button
            key={action.view}
            onClick={() => setView(action.view)}
            className="card stock-action-card"
            style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', minHeight: '94px' }}
          >
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-lightest)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {action.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800 }}>{action.label}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>{action.detail}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Santé des dépôts</h3>
            <span className="badge badge-blue">{db.warehouses.length} dépôts</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {warehouseCards.map(card => (
              <div key={card.warehouse.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                <div>
                  <strong>{card.warehouse.name}</strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
                    {card.productCount} produit(s) suivis • coût des sorties récentes {formatFCFA(card.recentOutCost)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{formatFCFA(card.value)}</strong>
                  <div style={{ marginTop: '6px' }}>
                    <span className={`badge ${card.alerts > 0 ? 'badge-yellow' : 'badge-green'}`}>
                      {card.alerts > 0 ? `${card.alerts} alerte(s)` : 'OK'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Alertes prioritaires</h3>
            <button className="btn btn-secondary" onClick={() => setView('reorder')} style={{ padding: '7px 10px', fontSize: '0.78rem' }}>
              Réappro
            </button>
          </div>
          <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Dépôt</th>
                  <th>Stock</th>
                  <th>Seuil</th>
                </tr>
              </thead>
              <tbody>
                {criticalStocks.slice(0, 7).map(row => (
                  <tr key={`${row.stock.productId}-${row.stock.warehouseId}`}>
                    <td style={{ fontWeight: 700 }}>{row.product?.name}</td>
                    <td>{row.warehouse?.name}</td>
                    <td style={{ color: row.status === 'rupture' ? 'var(--danger)' : 'var(--warning)', fontWeight: 800 }}>
                      {formatQty(row.stock.quantityAvailable)} {row.product?.baseUnit}
                    </td>
                    <td>{formatQty(row.stock.alertThreshold)} {row.product?.baseUnit}</td>
                  </tr>
                ))}
                {criticalStocks.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      Aucun produit sous seuil.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {criticalStocks.slice(0, 7).map(row => (
              <div key={`${row.stock.productId}-${row.stock.warehouseId}`} className="mobile-data-card">
                <div className="mobile-data-header">
                  <div>
                    <div className="mobile-data-title">{row.product?.name || 'Produit inconnu'}</div>
                    <div className="mobile-data-subtitle">{row.warehouse?.name || 'Dépôt inconnu'}</div>
                  </div>
                  <span className={`badge ${row.status === 'rupture' ? 'badge-red' : 'badge-yellow'}`}>
                    {row.status === 'rupture' ? 'Rupture' : 'Sous seuil'}
                  </span>
                </div>
                <div className="mobile-data-row">
                  <span>Stock disponible</span>
                  <strong style={{ color: row.status === 'rupture' ? 'var(--danger)' : 'var(--warning)' }}>
                    {formatQty(row.stock.quantityAvailable)} {row.product?.baseUnit}
                  </strong>
                </div>
                <div className="mobile-data-row">
                  <span>Seuil</span>
                  <strong>{formatQty(row.stock.alertThreshold)} {row.product?.baseUnit}</strong>
                </div>
              </div>
            ))}
            {criticalStocks.length === 0 && (
              <div className="mobile-data-card" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                Aucun produit sous seuil.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Lots proches péremption</h3>
          </div>
          <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Dépôt</th>
                  <th>Lot</th>
                  <th>DLC</th>
                  <th>Qté</th>
                </tr>
              </thead>
              <tbody>
                {nearExpiryBatches.slice(0, 7).map(batch => {
                  const product = getProduct(batch.productId);
                  const warehouse = getWarehouse(batch.warehouseId);
                  const isExpired = batch.expiryDate && new Date(batch.expiryDate) < today;
                  return (
                    <tr key={batch.id}>
                      <td style={{ fontWeight: 700 }}>{product?.name}</td>
                      <td>{warehouse?.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{batch.batchNumber}</td>
                      <td>
                        <span className={`badge ${isExpired ? 'badge-red' : 'badge-yellow'}`}>
                          {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td>{formatQty(batch.quantity)} {product?.baseUnit}</td>
                    </tr>
                  );
                })}
                {nearExpiryBatches.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      Aucun lot critique sur les 30 prochains jours.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {nearExpiryBatches.slice(0, 7).map(batch => {
              const product = getProduct(batch.productId);
              const warehouse = getWarehouse(batch.warehouseId);
              const isExpired = batch.expiryDate && new Date(batch.expiryDate) < today;
              return (
                <div key={batch.id} className="mobile-data-card">
                  <div className="mobile-data-header">
                    <div>
                      <div className="mobile-data-title">{product?.name || 'Produit inconnu'}</div>
                      <div className="mobile-data-subtitle">{warehouse?.name || 'Dépôt inconnu'} • Lot {batch.batchNumber}</div>
                    </div>
                    <span className={`badge ${isExpired ? 'badge-red' : 'badge-yellow'}`}>
                      {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="mobile-data-row">
                    <span>Quantité</span>
                    <strong>{formatQty(batch.quantity)} {product?.baseUnit}</strong>
                  </div>
                </div>
              );
            })}
            {nearExpiryBatches.length === 0 && (
              <div className="mobile-data-card" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                Aucun lot critique sur les 30 prochains jours.
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ReceiptText size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Traçabilité des mouvements</h3>
          </div>
          <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Produit</th>
                  <th>Dépôt</th>
                  <th>Qté</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map(movement => {
                  const product = getProduct(movement.productId);
                  const warehouse = getWarehouse(movement.warehouseId);
                  return (
                    <tr key={movement.id}>
                      <td>{new Date(movement.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${movement.quantity < 0 ? 'badge-blue' : 'badge-green'}`}>
                          {getMovementLabel(movement.type)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{product?.name}</td>
                      <td>{warehouse?.name}</td>
                      <td style={{ color: movement.quantity < 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 800 }}>
                        {movement.quantity > 0 ? '+' : ''}{formatQty(movement.quantity)} {movement.unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {recentMovements.map(movement => {
              const product = getProduct(movement.productId);
              const warehouse = getWarehouse(movement.warehouseId);
              return (
                <div key={movement.id} className="mobile-data-card">
                  <div className="mobile-data-header">
                    <div>
                      <div className="mobile-data-title">{product?.name || 'Produit inconnu'}</div>
                      <div className="mobile-data-subtitle">{new Date(movement.date).toLocaleDateString()} • {warehouse?.name || 'Dépôt inconnu'}</div>
                    </div>
                    <span className={`badge ${movement.quantity < 0 ? 'badge-blue' : 'badge-green'}`}>
                      {getMovementLabel(movement.type)}
                    </span>
                  </div>
                  <div className="mobile-data-row">
                    <span>Quantité</span>
                    <strong style={{ color: movement.quantity < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {movement.quantity > 0 ? '+' : ''}{formatQty(movement.quantity)} {movement.unit}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Ventes et sorties de stock</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Chaque vente est reliée au point de vente, au dépôt concerné et aux quantités sorties.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => setView('connectors')}>
            Tester une vente
          </button>
        </div>
        <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Vente</th>
                <th>POS</th>
                <th>Produits vendus</th>
                <th>Paiement</th>
                <th>Mouvements stock</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {latestSales.map(sale => {
                const pos = db.posList.find(p => p.id === sale.posId);
                const relatedMovements = db.movements.filter(m => m.externalReference === sale.externalSaleId);
                return (
                  <tr key={sale.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{sale.externalSaleId}</td>
                    <td>{pos?.name}</td>
	                    <td>
	                      {sale.items.map(item => {
	                        const product = getProduct(item.productId);
	                        return `${item.quantity} x ${product?.name || item.productId}`;
	                      }).join(', ')}
	                    </td>
	                    <td>
	                      <span className="badge badge-blue">{PAYMENT_TYPE_LABELS[sale.paymentContext.type]}</span>
	                    </td>
	                    <td>
	                      <span className={`badge ${relatedMovements.length > 0 ? 'badge-green' : 'badge-yellow'}`}>
	                        {relatedMovements.length} mouvement(s)
                      </span>
                    </td>
                    <td style={{ fontWeight: 800 }}>{formatFCFA(sale.paymentContext.amount)}</td>
                  </tr>
                );
              })}
              {latestSales.length === 0 && (
                <tr>
	                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    Aucune vente encore enregistrée. Lancez une vente ou une livraison pour montrer la déduction automatique du dépôt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {latestSales.map(sale => {
            const pos = db.posList.find(p => p.id === sale.posId);
            const relatedMovements = db.movements.filter(m => m.externalReference === sale.externalSaleId);
            return (
              <div key={sale.id} className="mobile-data-card">
                <div className="mobile-data-header">
                  <div>
                    <div className="mobile-data-title">{sale.externalSaleId}</div>
                    <div className="mobile-data-subtitle">{pos?.name || 'Canal inconnu'}</div>
                  </div>
                  <span className="badge badge-blue">{PAYMENT_TYPE_LABELS[sale.paymentContext.type]}</span>
                </div>
                <div className="mobile-data-row">
                  <span>Produits</span>
                  <strong>
                    {sale.items.map(item => {
                      const product = getProduct(item.productId);
                      return `${item.quantity} x ${product?.name || item.productId}`;
                    }).join(', ')}
                  </strong>
                </div>
                <div className="mobile-data-row">
                  <span>Mouvements stock</span>
                  <strong>{relatedMovements.length}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Montant</span>
                  <strong>{formatFCFA(sale.paymentContext.amount)}</strong>
                </div>
              </div>
            );
          })}
          {latestSales.length === 0 && (
            <div className="mobile-data-card" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              Aucune vente encore enregistrée. Lancez une vente ou une livraison pour montrer la déduction automatique du dépôt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockControl;
