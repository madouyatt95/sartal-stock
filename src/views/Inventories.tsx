import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { ClipboardCheck, CheckCircle2, Filter, Search } from 'lucide-react';

interface InventoriesProps {
  state: StockState;
}

export const Inventories: React.FC<InventoriesProps> = ({ state }) => {
  const { db, inventoryAdjustment } = state;
  const [selectedWhId, setSelectedWhId] = useState('');
  const [lineSearch, setLineSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [gapFilter, setGapFilter] = useState('all');
  const [auditFields, setAuditFields] = useState<Record<string, number>>({});
  const productCategories = Array.from(new Set(db.products.map(product => product.category).filter(Boolean)));

  const handleSelectWh = (whId: string) => {
    setSelectedWhId(whId);
    if (!whId) {
      setAuditFields({});
      return;
    }
    
    // Seed audit inputs with theoretical quantities
    const fields: typeof auditFields = {};
    db.products.forEach(p => {
      if (!p.isStockable) return;
      const stock = db.stocks.find(s => s.productId === p.id && s.warehouseId === whId);
      fields[p.id] = stock?.quantityAvailable || 0;
    });
    setAuditFields(fields);
  };

  const inventoryRows = db.products.filter(product => {
    if (!product.isStockable || !selectedWhId) return false;
    const stock = db.stocks.find(item => item.productId === product.id && item.warehouseId === selectedWhId);
    const theoretical = stock?.quantityAvailable || 0;
    const real = auditFields[product.id] !== undefined ? auditFields[product.id] : theoretical;
    const gap = real - theoretical;
    const normalizedSearch = lineSearch.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || product.name.toLowerCase().includes(normalizedSearch)
      || product.sku.toLowerCase().includes(normalizedSearch)
      || product.category.toLowerCase().includes(normalizedSearch);
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesGap = gapFilter === 'all'
      || (gapFilter === 'with_gap' && gap !== 0)
      || (gapFilter === 'positive' && gap > 0)
      || (gapFilter === 'negative' && gap < 0)
      || (gapFilter === 'zero' && gap === 0);

    return matchesSearch && matchesCategory && matchesGap;
  });

  const gapRows = db.products.filter(product => {
    if (!product.isStockable || !selectedWhId) return false;
    const stock = db.stocks.find(item => item.productId === product.id && item.warehouseId === selectedWhId);
    const theoretical = stock?.quantityAvailable || 0;
    const real = auditFields[product.id] !== undefined ? auditFields[product.id] : theoretical;
    return real - theoretical !== 0;
  });

  const handleSubmitInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWhId) return;

    const items = Object.entries(auditFields).map(([productId, realQty]) => ({
      productId,
      realQty
    }));

    inventoryAdjustment(selectedWhId, items);
    
    // Reset state
    setSelectedWhId('');
    setAuditFields({});
    alert("Inventaire enregistré et validé ! Les mouvements d'ajustements ont été générés.");
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Fiches d'Inventaires</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Réalisez vos audits périodiques par dépôt et régularisez les écarts de stock</p>
      </div>

      <div className="grid-4">
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Produits</p>
          <strong style={{ fontSize: '1.45rem' }}>{inventoryRows.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>affichés</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Écarts</p>
          <strong style={{ fontSize: '1.45rem' }}>{gapRows.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>modifiés</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Dépôts</p>
          <strong style={{ fontSize: '1.45rem' }}>{db.warehouses.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>auditables</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Mode</p>
          <strong style={{ fontSize: '1.1rem' }}>{selectedWhId ? 'Comptage' : 'Choisir dépôt'}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>mobile ready</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <ClipboardCheck size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Inventaire de Dépôt</h3>
        </div>

        <form onSubmit={handleSubmitInventory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label className="form-label">Sélectionner le dépôt à auditer</label>
            <select 
              value={selectedWhId} 
              onChange={(e) => handleSelectWh(e.target.value)}
              className="form-control"
              required
            >
              <option value="">Sélectionner un dépôt...</option>
              {db.warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {selectedWhId && (
            <div style={{ marginTop: '16px' }}>
              <div className="card product-filter-panel" style={{ padding: '14px', marginBottom: '14px', background: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={16} color="var(--primary)" />
                  <strong style={{ fontSize: '0.9rem' }}>Filtrer les lignes d'inventaire</strong>
                </div>
                <div className="mobile-filter-grid inventory-filter-grid">
                  <div className="form-group">
                    <label className="form-label">Rechercher</label>
                    <div className="input-with-icon">
                      <Search size={16} />
                      <input
                        type="search"
                        className="form-control"
                        value={lineSearch}
                        onChange={(event) => setLineSearch(event.target.value)}
                        placeholder="Produit, code ou catégorie"
                      />
                    </div>
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
                    <label className="form-label">Écart</label>
                    <select className="form-control" value={gapFilter} onChange={(event) => setGapFilter(event.target.value)}>
                      <option value="all">Tous</option>
                      <option value="with_gap">Avec écart</option>
                      <option value="negative">Manquant</option>
                      <option value="positive">Surplus</option>
                      <option value="zero">Sans écart</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="desktop-table-only" style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Code article</th>
                      <th>Théorique (Système)</th>
                      <th style={{ width: '150px' }}>Réel Compté</th>
                      <th>Écart / Variance</th>
                      <th>Impact Mouvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryRows.map(prod => {
                      const stock = db.stocks.find(s => s.productId === prod.id && s.warehouseId === selectedWhId);
                      const theoretical = stock?.quantityAvailable || 0;
                      const real = auditFields[prod.id] !== undefined ? auditFields[prod.id] : theoretical;
                      const gap = real - theoretical;

                      return (
                        <tr key={prod.id}>
                          <td style={{ fontWeight: 700 }}>{prod.name}</td>
                          <td style={{ fontFamily: 'monospace' }}>{prod.sku}</td>
                          <td style={{ fontWeight: 600 }}>{theoretical} {prod.baseUnit}</td>
                          <td>
                            <input 
                              type="number"
                              min="0"
                              step="any"
                              value={real}
                              onChange={(e) => setAuditFields({
                                ...auditFields,
                                [prod.id]: parseFloat(e.target.value) || 0
                              })}
                              className="form-control"
                              style={{ padding: '6px 10px', width: '100px', fontWeight: 700 }}
                              required
                            />
                          </td>
                          <td style={{ fontWeight: 800, color: gap === 0 ? 'var(--text-secondary)' : gap > 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {gap > 0 ? `+${gap}` : gap} {prod.baseUnit}
                          </td>
                          <td>
                            {gap === 0 ? (
                              <span style={{ color: 'var(--text-muted)' }}>Aucun</span>
                            ) : gap > 0 ? (
                              <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Entrée Stock (+{gap})</span>
                            ) : (
                              <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>Écart de {gap}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {inventoryRows.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                          Aucun produit ne correspond aux filtres.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mobile-card-list no-padding">
                {inventoryRows.map(prod => {
                  const stock = db.stocks.find(s => s.productId === prod.id && s.warehouseId === selectedWhId);
                  const theoretical = stock?.quantityAvailable || 0;
                  const real = auditFields[prod.id] !== undefined ? auditFields[prod.id] : theoretical;
                  const gap = real - theoretical;
                  return (
                    <div key={prod.id} className="mobile-data-card">
                      <div className="mobile-data-header">
                        <div>
                          <div className="mobile-data-title">{prod.name}</div>
                          <div className="mobile-data-subtitle">{prod.sku} • {prod.category}</div>
                        </div>
                        <span className={`badge ${gap === 0 ? 'badge-secondary' : gap > 0 ? 'badge-green' : 'badge-red'}`}>
                          {gap === 0 ? 'OK' : gap > 0 ? `+${gap}` : gap}
                        </span>
                      </div>
                      <div className="mobile-data-row">
                        <span>Théorique</span>
                        <strong>{theoretical} {prod.baseUnit}</strong>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Réel compté</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={real}
                          onChange={(e) => setAuditFields({
                            ...auditFields,
                            [prod.id]: parseFloat(e.target.value) || 0
                          })}
                          className="form-control"
                          required
                        />
                      </div>
                    </div>
                  );
                })}
                {inventoryRows.length === 0 && (
                  <div className="mobile-empty-state">Aucun produit ne correspond aux filtres.</div>
                )}
              </div>

              <div className="receiving-submit-bar">
                <div>
                  <strong>{gapRows.length} écart{gapRows.length > 1 ? 's' : ''}</strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>seront transformés en mouvements</p>
                </div>
                <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
                  <CheckCircle2 size={18} /> Valider l'inventaire
                </button>
              </div>
            </div>
          )}

          {!selectedWhId && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              Sélectionnez un dépôt physique pour afficher sa fiche d'inventaire et démarrer la saisie.
            </div>
          )}

        </form>
      </div>

    </div>
  );
};
export default Inventories;
