import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Trash2 } from 'lucide-react';
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
      
      alert("Perte déclarée avec succès ! Le stock a été déduit via FIFO.");
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

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Déclaration de Pertes</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Déclarez la casse, le vol, les péremptions ou les erreurs de production et retirez-les immédiatement du stock</p>
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
                  <label className="form-label">Produit perdu</label>
                  <select 
                    value={productId} 
                    onChange={(e) => setProductId(e.target.value)}
                    className="form-control"
                    required
                  >
                    <option value="">Sélectionner un produit...</option>
                    {db.stocks
                      .filter(s => s.warehouseId === warehouseId && s.quantityAvailable > 0)
                      .map(s => {
                        const prod = db.products.find(p => p.id === s.productId)!;
                        return (
                          <option key={s.productId} value={s.productId}>
                            {prod.name} (En stock: {s.quantityAvailable} {prod.baseUnit})
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Quantité perdue</label>
                    <input 
                      type="number"
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
          </div>
          <div style={{ overflowX: 'auto' }}>
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
                {db.losses.map(loss => {
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
                {db.losses.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                      Aucune perte déclarée ce mois-ci.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
export default Losses;
