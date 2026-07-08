import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { AlertTriangle, Filter, Search, ShoppingCart } from 'lucide-react';

interface ReorderProps {
  state: StockState;
  setView: (view: string) => void;
}

export const Reorder: React.FC<ReorderProps> = ({ state, setView }) => {
  const { db, createSupplierOrder } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const productCategories = Array.from(new Set(db.products.map(product => product.category).filter(Boolean)));

  // Formatter FCFA
  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA');
  };

  // Find products below threshold
  const reorderSuggestions = db.products
    .filter(p => p.isStockable)
    .map(p => {
      const currentStock = db.stocks
        .filter(s => s.productId === p.id)
        .reduce((sum, s) => sum + s.quantityAvailable, 0);

      const isBelow = currentStock < p.globalAlertThreshold;
      const suggestQty = isBelow ? (p.globalAlertThreshold * 2) - currentStock : 0;
      
      // Try to estimate purchase price based on last batches
      const productBatches = db.batches.filter(b => b.productId === p.id);
      const lastPrice = productBatches.length > 0 ? productBatches[productBatches.length - 1].purchaseCost : 400;

      // Assign default supplier if none
      const supplierId = p.mainSupplierId || (p.category === 'Boissons' ? 'sup-drinks' : 'sup-market');
      const supplierObj = db.suppliers.find(s => s.id === supplierId);

      return {
        product: p,
        currentStock,
        threshold: p.globalAlertThreshold,
        isBelow,
        suggestQty,
        lastPrice,
        supplierId,
        supplierName: supplierObj?.name || 'Inconnu'
      };
    })
    .filter(item => item.isBelow);

  const filteredSuggestions = reorderSuggestions.filter(item => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const severity = item.currentStock === 0 ? 'rupture' : 'below';
    const matchesSearch = !normalizedSearch
      || item.product.name.toLowerCase().includes(normalizedSearch)
      || item.product.sku.toLowerCase().includes(normalizedSearch)
      || item.product.category.toLowerCase().includes(normalizedSearch)
      || item.supplierName.toLowerCase().includes(normalizedSearch);
    const matchesSupplier = supplierFilter === 'all' || item.supplierId === supplierFilter;
    const matchesCategory = categoryFilter === 'all' || item.product.category === categoryFilter;
    const matchesSeverity = severityFilter === 'all' || severityFilter === severity;
    return matchesSearch && matchesSupplier && matchesCategory && matchesSeverity;
  }).sort((a, b) => {
    if (a.currentStock === 0 && b.currentStock !== 0) return -1;
    if (a.currentStock !== 0 && b.currentStock === 0) return 1;
    return (b.suggestQty * b.lastPrice) - (a.suggestQty * a.lastPrice);
  });

  const suggestedValue = filteredSuggestions.reduce((sum, item) => sum + (item.suggestQty * item.lastPrice), 0);

  const handleCreateSuggestedOrder = (item: typeof reorderSuggestions[0]) => {
    createSupplierOrder(item.supplierId, [
      {
        productId: item.product.id,
        quantityOrdered: item.suggestQty,
        purchasePrice: item.lastPrice,
        unit: item.product.baseUnit
      }
    ]);
    alert(`Bon de commande généré pour ${item.supplierName} avec succès !`);
    setView('purchases');
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>À commander</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Réapprovisionnez intelligemment. Le système détecte les articles sous le seuil critique et propose des quantités de réapprovisionnement.
        </p>
      </div>

      <div className="grid-4">
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Suggestions</p>
          <strong style={{ fontSize: '1.45rem' }}>{filteredSuggestions.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>affichées</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Ruptures</p>
          <strong style={{ fontSize: '1.45rem' }}>{filteredSuggestions.filter(item => item.currentStock === 0).length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>prioritaires</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Valeur</p>
          <strong style={{ fontSize: '1.25rem' }}>{formatFCFA(suggestedValue)}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>à commander</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Fournisseurs</p>
          <strong style={{ fontSize: '1.45rem' }}>{new Set(filteredSuggestions.map(item => item.supplierId)).size}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>concernés</p>
        </div>
      </div>

      <div className="card product-filter-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Recherche et filtres</h3>
        </div>
        <div className="mobile-filter-grid reorder-filter-grid">
          <div className="form-group">
            <label className="form-label">Rechercher</label>
            <div className="input-with-icon">
              <Search size={16} />
              <input
                type="search"
                className="form-control"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Produit, code, catégorie, fournisseur"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Fournisseur</label>
            <select className="form-control" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
              <option value="all">Tous</option>
              {db.suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Catégorie</label>
            <select className="form-control" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">Toutes</option>
              {productCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priorité</label>
            <select className="form-control" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
              <option value="all">Toutes</option>
              <option value="rupture">Rupture</option>
              <option value="below">Sous seuil</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} color="var(--warning)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Suggestions actives</h3>
        </div>
        <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Code article</th>
                <th>Stock Actuel</th>
                <th>Seuil d'Alerte</th>
                <th>Fournisseur Suggéré</th>
                <th>Dernier Prix</th>
                <th>Quantité Recommandée</th>
                <th>Coût Estimé</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuggestions.map(item => (
                <tr key={item.product.id}>
                  <td style={{ fontWeight: 700 }}>{item.product.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{item.product.sku}</td>
                  <td style={{ fontWeight: 800, color: item.currentStock === 0 ? 'var(--danger)' : 'var(--warning)' }}>
                    {item.currentStock} {item.product.baseUnit}
                  </td>
                  <td>{item.threshold} {item.product.baseUnit}</td>
                  <td style={{ fontWeight: 600 }}>{item.supplierName}</td>
                  <td>{formatFCFA(item.lastPrice)}</td>
                  <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                    {item.suggestQty} {item.product.baseUnit}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {formatFCFA(item.suggestQty * item.lastPrice)}
                  </td>
                  <td>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleCreateSuggestedOrder(item)}
                      style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }}
                    >
                      <ShoppingCart size={14} /> Commander
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSuggestions.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    Aucun produit sous le seuil d'alerte. Vos niveaux de stock sont optimaux.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {filteredSuggestions.map(item => (
            <div key={item.product.id} className="mobile-data-card">
              <div className="mobile-data-header">
                <div>
                  <div className="mobile-data-title">{item.product.name}</div>
                  <div className="mobile-data-subtitle">{item.product.sku} • {item.product.category}</div>
                </div>
                <span className={`badge ${item.currentStock === 0 ? 'badge-red' : 'badge-yellow'}`}>
                  {item.currentStock === 0 ? 'Rupture' : 'Sous seuil'}
                </span>
              </div>
              <div className="mobile-data-row">
                <span>Stock / seuil</span>
                <strong>{item.currentStock} / {item.threshold} {item.product.baseUnit}</strong>
              </div>
              <div className="mobile-data-row">
                <span>Fournisseur</span>
                <strong>{item.supplierName}</strong>
              </div>
              <div className="mobile-data-row">
                <span>Quantité conseillée</span>
                <strong>{item.suggestQty} {item.product.baseUnit}</strong>
              </div>
              <div className="mobile-data-row">
                <span>Coût estimé</span>
                <strong>{formatFCFA(item.suggestQty * item.lastPrice)}</strong>
              </div>
              <button className="btn btn-primary" onClick={() => handleCreateSuggestedOrder(item)}>
                <ShoppingCart size={16} /> Commander
              </button>
            </div>
          ))}
          {filteredSuggestions.length === 0 && (
            <div className="mobile-empty-state">Aucun produit à commander selon les filtres.</div>
          )}
        </div>
      </div>

    </div>
  );
};
export default Reorder;
