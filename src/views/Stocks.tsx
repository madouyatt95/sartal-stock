import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Search, Filter, AlertTriangle, Calendar, Info, Layers } from 'lucide-react';

interface StocksProps {
  state: StockState;
}

export const Stocks: React.FC<StocksProps> = ({ state }) => {
  const { db } = state;
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProductWhKey, setExpandedProductWhKey] = useState<string | null>(null);

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

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = product.name.toLowerCase().includes(q);
      const matchSKU = product.sku.toLowerCase().includes(q);
      const matchCat = product.category.toLowerCase().includes(q);
      if (!matchName && !matchSKU && !matchCat) return false;
    }

    return true;
  });

  const getStockStatusLabel = (qty: number, threshold: number) => {
    if (qty === 0) return { text: 'Rupture', class: 'badge-red' };
    if (qty < threshold) return { text: 'Alerte', class: 'badge-yellow' };
    return { text: 'Normal', class: 'badge-green' };
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Suivi des Stocks</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Visualisez les stocks réels par dépôt et examinez les lots par date de péremption</p>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', padding: '16px' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="Rechercher par produit, SKU, catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '38px', width: '100%' }}
          />
        </div>

        {/* Warehouse Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--text-secondary)" />
          <select 
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="form-control"
            style={{ fontWeight: 600 }}
          >
            <option value="all">Tous les dépôts</option>
            {db.warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
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
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Produit</th>
                <th>SKU</th>
                <th>Dépôt</th>
                <th>Quantité Disponible</th>
                <th>Coût Moyen (CUMP)</th>
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
                              <h4 style={{ fontSize: '0.875rem', fontWeight: 700 }}>Décomposition des lots en stock (Règle FIFO active)</h4>
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
      </div>

    </div>
  );
};
export default Stocks;
