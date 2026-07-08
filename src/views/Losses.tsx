import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Filter, Search, Trash2 } from 'lucide-react';
import { LossReason } from '../types';

interface LossesProps {
  state: StockState;
}

export const Losses: React.FC<LossesProps> = ({ state }) => {
  const { db, declareLoss } = state;
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<LossReason>('casse');
  const [note, setNote] = useState('');
  const [lossSearch, setLossSearch] = useState('');
  const [lossWarehouseFilter, setLossWarehouseFilter] = useState('all');
  const [lossReasonFilter, setLossReasonFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');

  const handleDeclareLoss = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !warehouseId || qty <= 0) return;

    try {
      declareLoss(productId, warehouseId, qty, reason, note);
      
      // Reset state
      setProductId('');
      setWarehouseId('');
      setQty(1);
      setReason('casse');
      setNote('');
      
      alert("Perte enregistrée. Le stock du dépôt a été mis à jour.");
    } catch (err: any) {
      alert(err.message || "Erreur lors de la déclaration");
    }
  };

  const getReasonLabel = (r: LossReason) => {
    switch (r) {
      case 'casse': return 'Casse / Dommage';
      case 'vol': return 'Vol / Disparition';
      case 'peremption': return 'Péremption (Périmé)';
      case 'erreur_cuisine': return 'Erreur cuisine / Préparation';
      case 'offert': return 'Offert commercialement';
      case 'consommation_personnel': return 'Consommation Personnel';
      case 'autre': return 'Autre motif';
      default: return r;
    }
  };

  const availableProducts = db.stocks.filter(stock => stock.warehouseId === warehouseId && stock.quantityAvailable > 0).filter(stock => {
    const product = db.products.find(item => item.id === stock.productId);
    const normalizedSearch = productSearch.trim().toLowerCase();
    return !normalizedSearch
      || product?.name.toLowerCase().includes(normalizedSearch)
      || product?.sku.toLowerCase().includes(normalizedSearch)
      || product?.category.toLowerCase().includes(normalizedSearch);
  });

  const isInPeriod = (isoDate: string) => {
    if (periodFilter === 'all') return true;
    const date = new Date(isoDate).getTime();
    const now = Date.now();
    const days = periodFilter === 'today' ? 1 : periodFilter === '7d' ? 7 : 30;
    return now - date <= days * 24 * 3600 * 1000;
  };

  const filteredLosses = db.losses.filter(loss => {
    const product = db.products.find(item => item.id === loss.productId);
    const warehouse = db.warehouses.find(item => item.id === loss.warehouseId);
    const normalizedSearch = lossSearch.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || product?.name.toLowerCase().includes(normalizedSearch)
      || product?.sku.toLowerCase().includes(normalizedSearch)
      || warehouse?.name.toLowerCase().includes(normalizedSearch)
      || loss.userName.toLowerCase().includes(normalizedSearch)
      || loss.note.toLowerCase().includes(normalizedSearch);
    const matchesWarehouse = lossWarehouseFilter === 'all' || loss.warehouseId === lossWarehouseFilter;
    const matchesReason = lossReasonFilter === 'all' || loss.reason === lossReasonFilter;
    return matchesSearch && matchesWarehouse && matchesReason && isInPeriod(loss.date);
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredLossValue = filteredLosses.reduce((sum, loss) => {
    const stock = db.stocks.find(item => item.productId === loss.productId && item.warehouseId === loss.warehouseId);
    return sum + loss.quantity * (stock?.averageCost || 0);
  }, 0);
  const formatFCFA = (value: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
  );

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Pertes & casses</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Déclarez la casse, le vol, les péremptions ou les erreurs de préparation et retirez-les immédiatement du stock</p>
      </div>

      <div className="grid-4">
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Pertes</p>
          <strong style={{ fontSize: '1.45rem' }}>{filteredLosses.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>selon filtres</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Valeur</p>
          <strong style={{ fontSize: '1.25rem' }}>{formatFCFA(filteredLossValue)}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>estimée</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Motifs</p>
          <strong style={{ fontSize: '1.45rem' }}>{new Set(filteredLosses.map(loss => loss.reason)).size}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>observés</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Dépôts</p>
          <strong style={{ fontSize: '1.45rem' }}>{new Set(filteredLosses.map(loss => loss.warehouseId)).size}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>impactés</p>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '0.8fr 1.2fr' }}>
        
        {/* Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Trash2 size={20} color="var(--danger)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Déclarer une perte</h3>
          </div>

          <form onSubmit={handleDeclareLoss} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div className="form-group">
              <label className="form-label">Dépôt concerné</label>
              <select 
                value={warehouseId} 
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  setProductId('');
                }}
                className="form-control"
                required
              >
                <option value="">Sélectionner un dépôt...</option>
                {db.warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {warehouseId && (
              <>
                <div className="form-group">
                  <label className="form-label">Filtrer les produits</label>
                  <div className="input-with-icon">
                    <Search size={16} />
                    <input
                      type="search"
                      className="form-control"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="Nom, code ou catégorie"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Produit perdu</label>
                  <select 
                    value={productId} 
                    onChange={(e) => setProductId(e.target.value)}
                    className="form-control"
                    required
                  >
                    <option value="">Sélectionner un produit...</option>
                    {availableProducts
                      .map(s => {
                        const prod = db.products.find(p => p.id === s.productId)!;
                        return (
                          <option key={s.productId} value={s.productId}>
                            {prod.name} (En stock: {s.quantityAvailable} {prod.baseUnit})
                          </option>
                        );
                      })}
                  </select>
                  {availableProducts.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '6px' }}>
                      Aucun produit disponible avec ce filtre.
                    </p>
                  )}
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Quantité perdue</label>
                    <input 
                      type="number"
                      min="0.01"
                      step="any"
                      value={qty || ''}
                      onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Motif de la perte</label>
                    <select 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value as LossReason)}
                      className="form-control"
                      required
                    >
                      <option value="casse">Casse / Dommage</option>
                      <option value="vol">Vol / Disparition</option>
                      <option value="peremption">Péremption (DLC dépassée)</option>
                      <option value="erreur_cuisine">Erreur cuisine / Préparation</option>
                      <option value="offert">Offert commercialement</option>
                      <option value="consommation_personnel">Consommation Personnel</option>
                      <option value="autre">Autre motif</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Note / Explications</label>
                  <textarea 
                    value={note} 
                    onChange={(e) => setNote(e.target.value)}
                    className="form-control"
                    placeholder="Précisez le contexte..."
                    rows={3}
                  />
                </div>

                <button type="submit" className="btn btn-danger" style={{ marginTop: '10px' }}>
                  Déclarer la perte
                </button>
              </>
            )}

            {!warehouseId && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                Sélectionnez un dépôt pour voir les articles disponibles en stock.
              </div>
            )}

          </form>
        </div>

        {/* History Table */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Historique des pertes</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
              {filteredLosses.length} déclaration{filteredLosses.length > 1 ? 's' : ''} affichée{filteredLosses.length > 1 ? 's' : ''}.
            </p>
          </div>
          <div className="card product-filter-panel" style={{ margin: '16px', padding: '14px', background: 'var(--bg-app)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} color="var(--primary)" />
              <strong style={{ fontSize: '0.9rem' }}>Filtrer l'historique</strong>
            </div>
            <div className="mobile-filter-grid loss-filter-grid">
              <div className="form-group">
                <label className="form-label">Rechercher</label>
                <div className="input-with-icon">
                  <Search size={16} />
                  <input
                    type="search"
                    className="form-control"
                    value={lossSearch}
                    onChange={(event) => setLossSearch(event.target.value)}
                    placeholder="Produit, dépôt, note, déclarant"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Dépôt</label>
                <select className="form-control" value={lossWarehouseFilter} onChange={(event) => setLossWarehouseFilter(event.target.value)}>
                  <option value="all">Tous</option>
                  {db.warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Motif</label>
                <select className="form-control" value={lossReasonFilter} onChange={(event) => setLossReasonFilter(event.target.value)}>
                  <option value="all">Tous</option>
                  <option value="casse">Casse</option>
                  <option value="vol">Vol</option>
                  <option value="peremption">Péremption</option>
                  <option value="erreur_cuisine">Erreur préparation</option>
                  <option value="offert">Offert</option>
                  <option value="consommation_personnel">Personnel</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Période</label>
                <select className="form-control" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>
                  <option value="all">Tout</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="7d">7 jours</option>
                  <option value="30d">30 jours</option>
                </select>
              </div>
            </div>
          </div>
          <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Dépôt</th>
                  <th>Qté</th>
                  <th>Motif</th>
                  <th>Déclarant</th>
                </tr>
              </thead>
              <tbody>
                {filteredLosses.map(loss => {
                  const prod = db.products.find(p => p.id === loss.productId);
                  const wh = db.warehouses.find(w => w.id === loss.warehouseId);
                  return (
                    <tr key={loss.id}>
                      <td>{new Date(loss.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 700 }}>{prod?.name}</td>
                      <td>{wh?.name}</td>
                      <td style={{ fontWeight: 800, color: 'var(--danger)' }}>-{loss.quantity} {prod?.baseUnit}</td>
                      <td>
                        <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>
                          {getReasonLabel(loss.reason)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{loss.userName}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{loss.note}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredLosses.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                      Aucune perte déclarée ce mois-ci.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {filteredLosses.map(loss => {
              const prod = db.products.find(p => p.id === loss.productId);
              const wh = db.warehouses.find(w => w.id === loss.warehouseId);
              return (
                <div key={loss.id} className="mobile-data-card">
                  <div className="mobile-data-header">
                    <div>
                      <div className="mobile-data-title">{prod?.name || 'Produit inconnu'}</div>
                      <div className="mobile-data-subtitle">{new Date(loss.date).toLocaleDateString()} • {wh?.name || 'Dépôt inconnu'}</div>
                    </div>
                    <span className="badge badge-red">{getReasonLabel(loss.reason)}</span>
                  </div>
                  <div className="mobile-data-row">
                    <span>Quantité</span>
                    <strong style={{ color: 'var(--danger)' }}>-{loss.quantity} {prod?.baseUnit}</strong>
                  </div>
                  <div className="mobile-data-row">
                    <span>Déclarant</span>
                    <strong>{loss.userName}</strong>
                  </div>
                  {loss.note && (
                    <div className="mobile-data-row">
                      <span>Note</span>
                      <strong>{loss.note}</strong>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredLosses.length === 0 && (
              <div className="mobile-empty-state">
                Aucune perte ne correspond aux filtres.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
export default Losses;
