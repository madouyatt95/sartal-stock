import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Search, Filter, Layers } from 'lucide-react';

interface StocksProps {
  state: StockState;
}

export const Stocks: React.FC<StocksProps> = ({ state }) => {
  const { db } = state;
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('value');
  const [expandedProductWhKey, setExpandedProductWhKey] = useState<string | null>(null);
  const productCategories = Array.from(new Set(db.products.map(product => product.category).filter(Boolean)));

  // Formatter FCFA
  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA');
  };

  // Filter stocks
  const filteredStocks = db.stocks.filter(stock => {
    const product = db.products.find(p => p.id === stock.productId);
    if (!product) return false;

    // Filter by warehouse
    if (selectedWarehouseId !== 'all' && stock.warehouseId !== selectedWarehouseId) {
      return false;
    }

    if (selectedCategory !== 'all' && product.category !== selectedCategory) {
      return false;
    }

    const statusKey = stock.quantityAvailable === 0 ? 'rupture' : stock.quantityAvailable < stock.alertThreshold ? 'alerte' : 'normal';
    if (selectedStatus !== 'all' && statusKey !== selectedStatus) {
      return false;
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = product.name.toLowerCase().includes(q);
      const matchSKU = product.sku.toLowerCase().includes(q);
      const matchCat = product.category.toLowerCase().includes(q);
      if (!matchName && !matchSKU && !matchCat) return false;
    }

    return true;
  }).sort((a, b) => {
    const productA = db.products.find(p => p.id === a.productId);
    const productB = db.products.find(p => p.id === b.productId);
    if (sortBy === 'product') return (productA?.name || '').localeCompare(productB?.name || '');
    if (sortBy === 'qty') return b.quantityAvailable - a.quantityAvailable;
    if (sortBy === 'alert') return (a.quantityAvailable - a.alertThreshold) - (b.quantityAvailable - b.alertThreshold);
    return (b.quantityAvailable * b.averageCost) - (a.quantityAvailable * a.averageCost);
  });

  const stockValue = filteredStocks.reduce((sum, stock) => sum + (stock.quantityAvailable * stock.averageCost), 0);
  const alertCount = filteredStocks.filter(stock => stock.quantityAvailable > 0 && stock.quantityAvailable < stock.alertThreshold).length;
  const ruptureCount = filteredStocks.filter(stock => stock.quantityAvailable === 0).length;

  const getStockStatusLabel = (qty: number, threshold: number) => {
    if (qty === 0) return { text: 'Rupture', class: 'badge-red' };
    if (qty < threshold) return { text: 'Alerte', class: 'badge-yellow' };
    return { text: 'Normal', class: 'badge-green' };
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Lots & stocks</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Visualisez les stocks réels par dépôt et examinez les lots par date de péremption</p>
      </div>

      <div className="grid-4">
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Positions</p>
          <strong style={{ fontSize: '1.45rem' }}>{filteredStocks.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>selon filtres</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Valeur</p>
          <strong style={{ fontSize: '1.25rem' }}>{formatFCFA(stockValue)}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>stock affiché</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Alertes</p>
          <strong style={{ fontSize: '1.45rem' }}>{alertCount}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>sous seuil</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Ruptures</p>
          <strong style={{ fontSize: '1.45rem' }}>{ruptureCount}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>à traiter</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card product-filter-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Recherche et filtres</h3>
        </div>
        <div className="mobile-filter-grid stock-filter-grid">
          <div className="form-group">
            <label className="form-label">Rechercher</label>
            <div className="input-with-icon">
              <Search size={16} />
              <input
                type="search"
                placeholder="Produit, code article, catégorie"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Dépôt</label>
            <select value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)} className="form-control">
              <option value="all">Tous les dépôts</option>
              {db.warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Catégorie</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="form-control">
              <option value="all">Toutes</option>
              {productCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Statut</label>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="form-control">
              <option value="all">Tous</option>
              <option value="normal">Normal</option>
              <option value="alerte">Alerte</option>
              <option value="rupture">Rupture</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tri</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-control">
              <option value="value">Valeur stock</option>
              <option value="qty">Quantité</option>
              <option value="alert">Priorité alerte</option>
              <option value="product">Produit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Grid Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Inventaire de Stock</h3>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {filteredStocks.length} enregistrements trouvés
          </span>
        </div>
        <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Produit</th>
                <th>Code article</th>
                <th>Dépôt</th>
                <th>Quantité Disponible</th>
                <th>Coût moyen</th>
                <th>Valeur du Stock</th>
                <th>Alerte Seuil</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map(stock => {
                const product = db.products.find(p => p.id === stock.productId)!;
                const warehouse = db.warehouses.find(w => w.id === stock.warehouseId)!;
                const status = getStockStatusLabel(stock.quantityAvailable, stock.alertThreshold);
                const key = `${stock.productId}-${stock.warehouseId}`;
                const isExpanded = expandedProductWhKey === key;
                
                // Get batches for this specific row
                const rowBatches = db.batches.filter(b => b.productId === stock.productId && b.warehouseId === stock.warehouseId && b.quantity > 0);

                return (
                  <React.Fragment key={key}>
                    <tr 
                      onClick={() => setExpandedProductWhKey(isExpanded ? null : key)}
                      style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          ▶
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{product.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{product.category}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{product.sku}</td>
                      <td style={{ fontWeight: 600 }}>{warehouse.name}</td>
                      <td style={{ fontWeight: 800 }}>{stock.quantityAvailable} {product.baseUnit}</td>
                      <td>{formatFCFA(stock.averageCost)}</td>
                      <td style={{ fontWeight: 700 }}>{formatFCFA(stock.quantityAvailable * stock.averageCost)}</td>
                      <td>{stock.alertThreshold} {product.baseUnit}</td>
                      <td>
                        <span className={`badge ${status.class}`}>
                          {status.text}
                        </span>
                      </td>
                    </tr>
                    
                    {/* Expandable batch details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ backgroundColor: 'var(--bg-app)', padding: '16px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                              <Layers size={16} />
                              <h4 style={{ fontSize: '0.875rem', fontWeight: 700 }}>Détail des lots disponibles</h4>
                            </div>
                            {rowBatches.length > 0 ? (
                              <table className="custom-table" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.825rem' }}>
                                <thead>
                                  <tr>
                                    <th>N° Lot</th>
                                    <th>Date Réception</th>
                                    <th>Date Péremption</th>
                                    <th>Fournisseur</th>
                                    <th>Coût Achat</th>
                                    <th>Quantité Restante</th>
                                    <th>Statut Lot</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rowBatches.map(batch => {
                                    const supplier = db.suppliers.find(s => s.id === batch.supplierId);
                                    
                                    // Check expiry
                                    const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                                    const isExpiringSoon = batch.expiryDate && !isExpired && 
                                      (new Date(batch.expiryDate).getTime() - new Date().getTime()) < (30 * 24 * 3600 * 1000);

                                    return (
                                      <tr key={batch.id}>
                                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{batch.batchNumber}</td>
                                        <td>{new Date(batch.createdAt).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: batch.expiryDate ? 600 : 400 }}>
                                          {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td>{supplier?.name || 'Inconnu'}</td>
                                        <td>{formatFCFA(batch.purchaseCost)}</td>
                                        <td style={{ fontWeight: 800 }}>{batch.quantity} {product.baseUnit}</td>
                                        <td>
                                          {isExpired ? (
                                            <span className="badge badge-red">Périmé</span>
                                          ) : isExpiringSoon ? (
                                            <span className="badge badge-yellow">DLC Proche</span>
                                          ) : (
                                            <span className="badge badge-green">Conforme</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.825rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                Aucun lot disponible pour ce produit dans ce dépôt
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredStocks.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    Aucun stock correspondant aux filtres
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {filteredStocks.map(stock => {
            const product = db.products.find(p => p.id === stock.productId)!;
            const warehouse = db.warehouses.find(w => w.id === stock.warehouseId)!;
            const status = getStockStatusLabel(stock.quantityAvailable, stock.alertThreshold);
            const key = `${stock.productId}-${stock.warehouseId}`;
            const isExpanded = expandedProductWhKey === key;
            const rowBatches = db.batches.filter(b => b.productId === stock.productId && b.warehouseId === stock.warehouseId && b.quantity > 0);
            return (
              <div key={key} className="mobile-data-card" role="button" tabIndex={0} onClick={() => setExpandedProductWhKey(isExpanded ? null : key)}>
                <div className="mobile-data-header">
                  <div>
                    <div className="mobile-data-title">{product.name}</div>
                    <div className="mobile-data-subtitle">{product.sku} • {product.category} • {warehouse.name}</div>
                  </div>
                  <span className={`badge ${status.class}`}>{status.text}</span>
                </div>
                <div className="mobile-data-row">
                  <span>Disponible</span>
                  <strong>{stock.quantityAvailable} {product.baseUnit}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Réservé</span>
                  <strong>{stock.quantityReserved} {product.baseUnit}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Valeur</span>
                  <strong>{formatFCFA(stock.quantityAvailable * stock.averageCost)}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Lots disponibles</span>
                  <strong>{rowBatches.length}</strong>
                </div>
                {isExpanded && (
                  <div className="mobile-nested-list">
                    {rowBatches.length > 0 ? rowBatches.map(batch => (
                      <div key={batch.id} className="mobile-nested-row">
                        <strong>{batch.batchNumber}</strong>
                        <span>{batch.quantity} {product.baseUnit} • {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'DLC non saisie'}</span>
                      </div>
                    )) : (
                      <div className="mobile-empty-state">Aucun lot disponible pour cette position.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredStocks.length === 0 && (
            <div className="mobile-empty-state">Aucun stock correspondant aux filtres.</div>
          )}
        </div>
      </div>

    </div>
  );
};
export default Stocks;
