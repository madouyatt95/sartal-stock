import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { ArrowRightLeft, Plus, Send } from 'lucide-react';

interface TransfersProps {
  state: StockState;
}

export const Transfers: React.FC<TransfersProps> = ({ state }) => {
  const { db, transferStock } = state;
  const [srcWhId, setSrcWhId] = useState('');
  const [destWhId, setDestWhId] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 1 }
  ]);

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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Transferts de Stock</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Déplacez des stocks entre vos dépôts (ex: Dépôt Central vers Dépôt Restaurant) en conservant la traçabilité des lots</p>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  {items.map((item, idx) => {
                    // Filter products that have stock in source warehouse
                    const sourceStocks = db.stocks.filter(s => s.warehouseId === srcWhId && s.quantityAvailable > 0);
                    
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                          {sourceStocks.map(s => {
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
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ marginTop: '12px' }}
                  onClick={() => setItems([...items, { productId: '', quantity: 1 }])}
                >
                  + Ajouter un produit
                </button>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
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
            <li>Les prélèvements dans le dépôt source s'effectuent de façon <strong>ordonnée (FIFO)</strong>.</li>
            <li>Le coût d'achat unitaire d'origine est intégralement conservé et transféré.</li>
            <li>Les numéros de lots et dates de péremption associés sont également reconduits vers le dépôt cible.</li>
            <li>Un mouvement de type <code>transfer_out</code> (négatif) est loggé pour la source et un <code>transfer_in</code> (positif) pour la cible.</li>
          </ul>
        </div>

      </div>

    </div>
  );
};
export default Transfers;
