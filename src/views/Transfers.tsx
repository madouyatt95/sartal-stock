import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { ArrowRightLeft, Filter, Search, Send } from 'lucide-react';

interface TransfersProps {
  state: StockState;
}

export const Transfers: React.FC<TransfersProps> = ({ state }) => {
  const { db, transferStock } = state;
  const [srcWhId, setSrcWhId] = useState('');
  const [destWhId, setDestWhId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 1 }
  ]);
  const productCategories = Array.from(new Set(db.products.map(product => product.category).filter(Boolean)));
  const sourceStocks = db.stocks.filter(stock => stock.warehouseId === srcWhId && stock.quantityAvailable > 0);
  const availableSourceStocks = sourceStocks.filter(stock => {
    const product = db.products.find(item => item.id === stock.productId);
    if (!product) return false;
    const normalizedSearch = productSearch.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || product.name.toLowerCase().includes(normalizedSearch)
      || product.sku.toLowerCase().includes(normalizedSearch)
      || product.category.toLowerCase().includes(normalizedSearch);
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  const selectedTransferValue = items.reduce((total, item) => {
    const stock = db.stocks.find(stockItem => stockItem.productId === item.productId && stockItem.warehouseId === srcWhId);
    return total + ((stock?.averageCost || 0) * item.quantity);
  }, 0);
  const formatFCFA = (value: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
  );

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srcWhId || !destWhId) return;
    if (srcWhId === destWhId) {
      alert("Le dépôt source et destination doivent être différents");
      return;
    }

    const finalItems = items.filter(i => i.productId && i.quantity > 0);
    if (finalItems.length === 0) return;

    try {
      transferStock(srcWhId, destWhId, finalItems);
      setSrcWhId('');
      setDestWhId('');
      setItems([{ productId: '', quantity: 1 }]);
      alert("Transfert validé et réceptionné !");
    } catch (err: any) {
      alert(err.message || "Erreur lors du transfert");
    }
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Transferts inter-dépôts</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Déplacez des stocks entre vos dépôts (ex: Dépôt Central vers Dépôt Restaurant) en conservant la traçabilité des lots</p>
      </div>

      <div className="grid-4">
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Produits source</p>
          <strong style={{ fontSize: '1.45rem' }}>{availableSourceStocks.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{srcWhId ? 'disponibles' : 'choisir dépôt'}</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Lignes</p>
          <strong style={{ fontSize: '1.45rem' }}>{items.filter(item => item.productId && item.quantity > 0).length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>à transférer</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Valeur</p>
          <strong style={{ fontSize: '1.25rem' }}>{formatFCFA(selectedTransferValue)}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>estimée</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Dépôts</p>
          <strong style={{ fontSize: '1.45rem' }}>{db.warehouses.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>configurés</p>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
        
        {/* Transfer form */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <ArrowRightLeft size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Bon de Transfert</h3>
          </div>

          <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Dépôt Source</label>
                <select 
                  value={srcWhId} 
                  onChange={(e) => setSrcWhId(e.target.value)} 
                  className="form-control"
                  required
                >
                  <option value="">Sélectionner source...</option>
                  {db.warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dépôt Destination</label>
                <select 
                  value={destWhId} 
                  onChange={(e) => setDestWhId(e.target.value)} 
                  className="form-control"
                  required
                >
                  <option value="">Sélectionner destination...</option>
                  {db.warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transfer line items */}
            {srcWhId && (
              <div style={{ marginTop: '10px' }}>
                <label className="form-label">Produits à transférer</label>
                <div className="card product-filter-panel" style={{ padding: '14px', marginTop: '10px', marginBottom: '12px', background: 'var(--bg-app)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} color="var(--primary)" />
                    <strong style={{ fontSize: '0.9rem' }}>Filtrer les produits disponibles</strong>
                  </div>
                  <div className="mobile-filter-grid transfer-filter-grid">
                    <div className="form-group">
                      <label className="form-label">Rechercher</label>
                      <div className="input-with-icon">
                        <Search size={16} />
                        <input
                          type="search"
                          className="form-control"
                          value={productSearch}
                          onChange={(event) => setProductSearch(event.target.value)}
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
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  {items.map((item, idx) => {
                    return (
                      <div key={idx} className="modal-line">
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].productId = e.target.value;
                            setItems(newItems);
                          }}
                          className="form-control"
                          style={{ flexGrow: 1 }}
                          required
                        >
                          <option value="">Sélectionner un produit...</option>
                          {availableSourceStocks.map(s => {
                            const prod = db.products.find(p => p.id === s.productId)!;
                            return (
                              <option key={s.productId} value={s.productId}>
                                {prod.name} (Dispo: {s.quantityAvailable} {prod.baseUnit})
                              </option>
                            );
                          })}
                        </select>

                        <input 
                          type="number"
                          min="0.01"
                          step="any"
                          placeholder="Qté"
                          value={item.quantity || ''}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].quantity = parseFloat(e.target.value) || 0;
                            setItems(newItems);
                          }}
                          className="form-control"
                          style={{ width: '90px' }}
                          required
                        />

                        <button 
                          type="button" 
                          className="btn btn-danger" 
                          style={{ padding: '6px 10px' }}
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        >
                          Suppr.
                        </button>
                      </div>
                    );
                  })}
                  {availableSourceStocks.length === 0 && (
                    <div className="mobile-empty-state">Aucun produit disponible avec ces filtres dans le dépôt source.</div>
                  )}
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ marginTop: '12px' }}
                  onClick={() => setItems([...items, { productId: '', quantity: 1 }])}
                >
                  + Ajouter un produit
                </button>

                <div className="receiving-submit-bar">
                  <div>
                    <strong>{formatFCFA(selectedTransferValue)}</strong>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>valeur transférée estimée</p>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
                    <Send size={16} /> Lancer le transfert
                  </button>
                </div>
              </div>
            )}

            {!srcWhId && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                Sélectionnez d'abord un dépôt source pour voir les produits disponibles au transfert.
              </div>
            )}

          </form>
        </div>

        {/* Info panel */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>Règles de Transfert</h4>
          <ul style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Les lots les plus anciens sont prélevés en premier dans le dépôt source.</li>
            <li>Le coût d'achat unitaire d'origine est intégralement conservé et transféré.</li>
            <li>Les numéros de lots et dates de péremption associés sont également reconduits vers le dépôt cible.</li>
            <li>La sortie du dépôt source et l'entrée dans le dépôt destinataire sont enregistrées séparément.</li>
          </ul>
        </div>

      </div>

    </div>
  );
};
export default Transfers;
