import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';

interface InventoriesProps {
  state: StockState;
}

export const Inventories: React.FC<InventoriesProps> = ({ state }) => {
  const { db, inventoryAdjustment } = state;
  const [selectedWhId, setSelectedWhId] = useState('');
  const [auditFields, setAuditFields] = useState<Record<string, number>>({});

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
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
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
                    {db.products.filter(p => p.isStockable).map(prod => {
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
                              <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>Correction FIFO ({gap})</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
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
