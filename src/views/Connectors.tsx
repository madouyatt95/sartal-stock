import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Network, Play, ShieldAlert, CheckCircle, RefreshCcw, FileSpreadsheet } from 'lucide-react';
import { POSPricing } from '../types';

interface ConnectorsProps {
  state: StockState;
}

export const Connectors: React.FC<ConnectorsProps> = ({ state }) => {
  const { db, processSale, togglePMSExport } = state;

  // Simulator Form State
  const [selectedPosId, setSelectedPosId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'room_charge' | 'other'>('cash');
  const [roomNumber, setRoomNumber] = useState('');
  const [saleResult, setSaleResult] = useState<{ success: boolean; error?: string; movements?: any[] } | null>(null);

  // Tab State
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'pms'>('simulator');

  // Formatter FCFA
  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA');
  };

  // Find pricing for display
  const posPricing = db.posPricing.find(p => p.productId === selectedProductId && p.posId === selectedPosId);
  const selectedPOS = db.posList.find(p => p.id === selectedPosId);
  const selectedProd = db.products.find(p => p.id === selectedProductId);

  // Auto-calculated amount
  const computedAmount = posPricing ? posPricing.salePrice * quantity : 0;

  const handleSimulateSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosId || !selectedProductId || quantity <= 0) return;

    const payload = {
      externalSaleId: `SALE-${Date.now().toString().slice(-6)}`,
      siteId: 'site-1',
      posId: selectedPosId,
      items: [{ productId: selectedProductId, quantity }],
      paymentContext: {
        type: paymentType,
        roomNumber: paymentType === 'room_charge' ? roomNumber : undefined,
        amount: computedAmount
      }
    };

    const result = processSale(payload);
    setSaleResult({
      success: result.success,
      error: result.error,
      movements: result.movements
    });
  };

  // Filter Room Charges for PMS tab
  const roomChargeSales = db.externalSales.filter(s => s.paymentContext.type === 'room_charge');

  // Export room charges CSV
  const handleExportPMSCSV = () => {
    if (roomChargeSales.length === 0) {
      alert("Aucune consommation chambre disponible pour l'export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Vente;Date;Point de Vente;Chambre;Montant (FCFA);PMS Status\n";

    roomChargeSales.forEach(sale => {
      const pos = db.posList.find(p => p.id === sale.posId);
      const date = new Date(sale.date).toLocaleDateString();
      csvContent += `${sale.externalSaleId};${date};${pos?.name};${sale.paymentContext.roomNumber};${sale.paymentContext.amount};${sale.exportedToPms ? 'Exported' : 'Pending'}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sartal_pms_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Intégrations & Simulateur API</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Simulez des événements de vente provenant de caisses POS externes et gérez l'imputation de factures sur chambre (export PMS).
        </p>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '24px' }}>
        <button 
          onClick={() => { setActiveSubTab('simulator'); setSaleResult(null); }}
          style={{ padding: '12px 6px', fontSize: '0.95rem', fontWeight: 700, border: 'none', background: 'none', borderBottom: activeSubTab === 'simulator' ? '3px solid var(--primary)' : 'none', color: activeSubTab === 'simulator' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Simulateur de Vente POS (API)
        </button>
        <button 
          onClick={() => setActiveSubTab('pms')}
          style={{ padding: '12px 6px', fontSize: '0.95rem', fontWeight: 700, border: 'none', background: 'none', borderBottom: activeSubTab === 'pms' ? '3px solid var(--primary)' : 'none', color: activeSubTab === 'pms' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Imputations Chambre (PMS)
        </button>
      </div>

      {activeSubTab === 'simulator' && (
        <div className="grid-2" style={{ gridTemplateColumns: '0.9fr 1.1fr' }}>
          
          {/* Simulator Form */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Network size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Simulateur de Caisse Externe</h3>
            </div>

            <form onSubmit={handleSimulateSale} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Point de vente (POS) émetteur</label>
                <select 
                  value={selectedPosId} 
                  onChange={(e) => setSelectedPosId(e.target.value)} 
                  className="form-control"
                  required
                >
                  <option value="">Sélectionner le point de vente...</option>
                  {db.posList.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.name} (Sortie: {db.warehouses.find(w => w.id === pos.defaultWarehouseId)?.name})</option>
                  ))}
                </select>
              </div>

              {selectedPosId && (
                <>
                  <div className="form-group">
                    <label className="form-label">Article vendu</label>
                    <select 
                      value={selectedProductId} 
                      onChange={(e) => setSelectedProductId(e.target.value)} 
                      className="form-control"
                      required
                    >
                      <option value="">Sélectionner l'article...</option>
                      {db.products.map(prod => {
                        const pricing = db.posPricing.find(p => p.productId === prod.id && p.posId === selectedPosId);
                        const priceText = pricing ? ` - Vendu à ${formatFCFA(pricing.salePrice)}` : ' - Non disponible';
                        return (
                          <option key={prod.id} value={prod.id} disabled={!pricing}>
                            {prod.name} ({prod.isStockable ? 'Direct' : 'BOM / Recette'}) {priceText}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Quantité vendue</label>
                      <input 
                        type="number" 
                        value={quantity} 
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} 
                        className="form-control"
                        min="1"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contexte de paiement</label>
                      <select 
                        value={paymentType} 
                        onChange={(e) => setPaymentType(e.target.value as any)} 
                        className="form-control"
                        required
                      >
                        <option value="cash">Espèces (Cash)</option>
                        <option value="card">Carte Bancaire</option>
                        <option value="room_charge">Imputation Chambre (Chambre N°)</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                  </div>

                  {paymentType === 'room_charge' && (
                    <div className="form-group">
                      <label className="form-label">Numéro de chambre</label>
                      <input 
                        type="text" 
                        value={roomNumber} 
                        onChange={(e) => setRoomNumber(e.target.value)} 
                        className="form-control"
                        placeholder="Ex: 204"
                        required
                      />
                    </div>
                  )}

                  {selectedProd && posPricing && (
                    <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Dépôt de déduction ciblé:</span>
                        <strong style={{ color: 'var(--primary)' }}>
                          {db.warehouses.find(w => w.id === (posPricing.defaultWarehouseId || selectedPOS?.defaultWarehouseId))?.name}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Type de produit:</span>
                        <strong>{selectedProd.isStockable ? 'Produit Simple' : 'Recette (BOM Ingred.)'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, marginTop: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                        <span>Montant Total à imputer:</span>
                        <span>{formatFCFA(computedAmount)}</span>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ gap: '8px', marginTop: '10px' }}>
                    <Play size={16} /> Déclencher l'événement API Vente
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Simulation Output */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Réponse de l'API & Traçabilité</h3>
            
            {saleResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {saleResult.success ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-light)', color: 'var(--success)', fontWeight: 700, fontSize: '0.9rem' }}>
                      <CheckCircle size={20} />
                      <span>CODE 200 OK : Stock déduit avec succès !</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Mouvements de stock générés (FIFO) :</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                        {saleResult.movements?.map((m, idx) => {
                          const prod = db.products.find(p => p.id === m.productId);
                          const wh = db.warehouses.find(w => w.id === m.warehouseId);
                          const batch = db.batches.find(b => b.id === m.batchId);
                          return (
                            <div key={idx} style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-app)' }}>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{m.quantity} {m.unit}</span> de <strong>{prod?.name}</strong>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>Dépôt: {wh?.name} • Lot: {batch?.batchNumber}</p>
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>CUMP: {formatFCFA(m.cost)}</span>
                            </div>
                          );
                        })}
                        {saleResult.movements?.length === 0 && (
                          <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                            Aucun impact physique de stock (Produit non stockable et sans recette).
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 700, fontSize: '0.9rem' }}>
                    <ShieldAlert size={20} />
                    <span>CODE 400 BAD REQUEST : {saleResult.error}</span>
                  </div>
                )}

                <button className="btn btn-secondary" onClick={() => setSaleResult(null)} style={{ gap: '6px' }}>
                  <RefreshCcw size={16} /> Tester une autre simulation
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <Network size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.875rem' }}>En attente de soumission du payload API...</p>
              </div>
            )}

          </div>

        </div>
      )}

      {activeSubTab === 'pms' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Journal des imputations chambre</h3>
            <button className="btn btn-secondary" onClick={handleExportPMSCSV} style={{ gap: '6px', fontSize: '0.825rem', padding: '8px 12px' }}>
              <FileSpreadsheet size={16} /> Exporter au format PMS (CSV)
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Réf Vente</th>
                  <th>Date / Heure</th>
                  <th>Point de Vente (POS)</th>
                  <th>Chambre Cible</th>
                  <th>Montant Vente</th>
                  <th>Statut Exportation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roomChargeSales.slice().reverse().map(sale => {
                  const pos = db.posList.find(p => p.id === sale.posId);
                  return (
                    <tr key={sale.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{sale.externalSaleId}</td>
                      <td>{new Date(sale.date).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{pos?.name}</td>
                      <td style={{ fontWeight: 800, color: 'var(--primary)' }}>Chambre {sale.paymentContext.roomNumber}</td>
                      <td style={{ fontWeight: 700 }}>{formatFCFA(sale.paymentContext.amount)}</td>
                      <td>
                        <span className={`badge ${sale.exportedToPms ? 'badge-green' : 'badge-yellow'}`}>
                          {sale.exportedToPms ? 'Exporté vers PMS' : 'En Attente Sync'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => togglePMSExport(sale.id)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          {sale.exportedToPms ? 'Marquer En attente' : 'Marquer Transmis'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {roomChargeSales.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                      Aucune vente imputée sur chambre pour l'instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
export default Connectors;
