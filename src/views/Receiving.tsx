import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { CheckSquare, PackageOpen, Layers } from 'lucide-react';

interface ReceivingProps {
  state: StockState;
}

export const Receiving: React.FC<ReceivingProps> = ({ state }) => {
  const { db, receiveOrder } = state;
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  
  // Map of product ID -> quantity received, batch code, and expiry date
  const [receiptFields, setReceiptFields] = useState<Record<string, {
    qty: number;
    lot: string;
    expiry: string;
  }>>({});

  const pendingOrders = db.supplierOrders.filter(
    o => o.status === 'ordered' || o.status === 'partially_received'
  );

  const activeOrder = db.supplierOrders.find(o => o.id === selectedOrderId);

  const initReceiptFields = (orderId: string) => {
    const order = db.supplierOrders.find(o => o.id === orderId);
    if (!order) return;
    const fields: typeof receiptFields = {};
    order.items.forEach(item => {
      const remaining = item.quantityOrdered - item.quantityReceived;
      fields[item.productId] = {
        qty: remaining > 0 ? remaining : 0,
        lot: `LOT-${order.id}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        expiry: ''
      };
    });
    setReceiptFields(fields);
  };

  const handleReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !targetWarehouseId) return;

    const items = Object.entries(receiptFields).map(([prodId, vals]) => ({
      productId: prodId,
      quantityReceived: vals.qty,
      batchNumber: vals.lot,
      expiryDate: vals.expiry || undefined
    })).filter(i => i.quantityReceived > 0);

    if (items.length === 0) {
      alert("Veuillez saisir au moins une quantité positive à recevoir");
      return;
    }

    receiveOrder(selectedOrderId, targetWarehouseId, items);
    
    // Reset state
    setSelectedOrderId('');
    setTargetWarehouseId('');
    setReceiptFields({});
    alert("Réception enregistrée avec succès ! Les stocks et lots ont été mis à jour.");
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Réceptions</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Réceptionnez vos commandes fournisseurs, attribuez les numéros de lots et dates de péremption</p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
        
        {/* Step 1 & 2 Form */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <PackageOpen size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Bon de Réception</h3>
          </div>

          <form onSubmit={handleReceive} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Sélectionner une commande en attente</label>
                <select 
                  value={selectedOrderId} 
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    initReceiptFields(e.target.value);
                  }}
                  className="form-control"
                  required
                >
                  <option value="">Sélectionner une commande...</option>
                  {pendingOrders.map(o => {
                    const sup = db.suppliers.find(s => s.id === o.supplierId);
                    return (
                      <option key={o.id} value={o.id}>{o.id} - {sup?.name} ({o.status === 'partially_received' ? 'Partiel' : 'Nouveau'})</option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Dépôt de réception</label>
                <select 
                  value={targetWarehouseId} 
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="">Sélectionner le dépôt cible...</option>
                  {db.warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Order lines detailing */}
            {activeOrder && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} /> Produits commandés
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {activeOrder.items.map(item => {
                    const prod = db.products.find(p => p.id === item.productId);
                    const fields = receiptFields[item.productId] || { qty: 0, lot: '', expiry: '' };
                    return (
                      <div key={item.productId} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-app)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>{prod?.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Commandé : <strong>{item.quantityOrdered}</strong> | Déjà reçu : <strong>{item.quantityReceived}</strong>
                          </span>
                        </div>
                        <div className="grid-3" style={{ gridTemplateColumns: '80px 1.2fr 1fr' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Qté Reçue</label>
                            <input 
                              type="number" 
                              min="0.01"
                              step="any"
                              max={item.quantityOrdered - item.quantityReceived}
                              value={fields.qty || ''} 
                              onChange={(e) => setReceiptFields({
                                ...receiptFields,
                                [item.productId]: { ...fields, qty: parseFloat(e.target.value) || 0 }
                              })}
                              className="form-control"
                              style={{ padding: '6px 10px' }}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Code Lot / Batch</label>
                            <input 
                              type="text" 
                              value={fields.lot} 
                              onChange={(e) => setReceiptFields({
                                ...receiptFields,
                                [item.productId]: { ...fields, lot: e.target.value }
                              })}
                              className="form-control"
                              style={{ padding: '6px 10px' }}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Date Péremption (DLC)</label>
                            <input 
                              type="date" 
                              value={fields.expiry} 
                              onChange={(e) => setReceiptFields({
                                ...receiptFields,
                                [item.productId]: { ...fields, expiry: e.target.value }
                              })}
                              className="form-control"
                              style={{ padding: '6px 10px' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
                    <CheckSquare size={18} /> Enregistrer la réception
                  </button>
                </div>
              </div>
            )}

            {!activeOrder && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                Sélectionnez un bon de commande en attente pour commencer la réception.
              </div>
            )}

          </form>
        </div>

        {/* Sidebar Help / Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '10px', color: 'var(--primary)' }}>Processus de Réception</h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Lors de la réception physique des colis :
            </p>
            <ol style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              <li>Vérifiez la concordance des quantités livrées avec le bon de commande.</li>
              <li>Saisissez le <strong>numéro de lot</strong> inscrit sur les bouteilles ou cartons pour assurer la traçabilité.</li>
              <li>Indiquez la <strong>date limite de consommation (DLC)</strong> si applicable.</li>
              <li>Le système recalculera automatiquement le <strong>coût moyen</strong> de l'article dans le dépôt ciblé.</li>
            </ol>
          </div>
        </div>

      </div>

    </div>
  );
};
export default Receiving;
