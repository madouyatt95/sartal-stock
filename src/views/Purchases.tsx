import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Plus, ShoppingBag } from 'lucide-react';

interface PurchasesProps {
  state: StockState;
}

export const Purchases: React.FC<PurchasesProps> = ({ state }) => {
  const { db, createSupplierOrder } = state;
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantityOrdered: number; purchasePrice: number; unit: string }>>([
    { productId: '', quantityOrdered: 10, purchasePrice: 400, unit: 'unité' }
  ]);
  const [showCreate, setShowCreate] = useState(false);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;
    const items = orderItems.filter(i => i.productId && i.quantityOrdered > 0);
    if (items.length === 0) return;

    createSupplierOrder(selectedSupplierId, items);
    setShowCreate(false);
    setSelectedSupplierId('');
    setOrderItems([{ productId: '', quantityOrdered: 10, purchasePrice: 400, unit: 'unité' }]);
    alert("Commande créée !");
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return { text: 'Brouillon', class: 'badge-yellow' };
      case 'ordered': return { text: 'Commandée', class: 'badge-blue' };
      case 'partially_received': return { text: 'Reçue Partiellement', class: 'badge-info' };
      case 'fully_received': return { text: 'Reçue Totalement', class: 'badge-green' };
      case 'cancelled': return { text: 'Annulée', class: 'badge-red' };
      default: return { text: 'Inconnu', class: 'badge-yellow' };
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Commandes d'Achats</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Créez et suivez vos bons de commandes fournisseurs avant réception</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Créer un bon de commande
        </button>
      </div>

      {/* Orders List */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShoppingBag size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Bons de commande</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>N° Commande</th>
                <th>Fournisseur</th>
                <th>Date Création</th>
                <th>Articles commandés</th>
                <th>Valeur estimée</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {db.supplierOrders.map(order => {
                const supplier = db.suppliers.find(s => s.id === order.supplierId);
                const totalItems = order.items.length;
                const totalValue = order.items.reduce((sum, item) => sum + (item.quantityOrdered * item.purchasePrice), 0);
                const status = getStatusLabel(order.status);

                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{order.id}</td>
                    <td style={{ fontWeight: 600 }}>{supplier?.name}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>{totalItems} types de produits</td>
                    <td style={{ fontWeight: 700 }}>
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(totalValue).replace('XOF', 'FCFA')}
                    </td>
                    <td>
                      <span className={`badge ${status.class}`}>
                        {status.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {db.supplierOrders.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    Aucune commande en cours. Créez un bon pour démarrer le processus d'achat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Nouveau Bon de Commande</h3>
            
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              <div className="form-group">
                <label className="form-label">Fournisseur</label>
                <select 
                  value={selectedSupplierId} 
                  onChange={(e) => setSelectedSupplierId(e.target.value)} 
                  className="form-control"
                  required
                >
                  <option value="">Sélectionner un fournisseur...</option>
                  {db.suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contact})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <label className="form-label">Lignes de commande</label>
                {orderItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select 
                      value={item.productId}
                      onChange={(e) => {
                        const newItems = [...orderItems];
                        const prod = db.products.find(p => p.id === e.target.value);
                        newItems[idx].productId = e.target.value;
                        newItems[idx].unit = prod?.baseUnit || 'unité';
                        // Pre-fill estimate cost
                        if (e.target.value === 'prod-coca') newItems[idx].purchasePrice = 380;
                        else if (e.target.value === 'prod-heineken') newItems[idx].purchasePrice = 580;
                        else if (e.target.value === 'prod-steak') newItems[idx].purchasePrice = 1500;
                        else if (e.target.value === 'prod-pdt') newItems[idx].purchasePrice = 0.5;
                        setOrderItems(newItems);
                      }}
                      className="form-control"
                      style={{ flexGrow: 1 }}
                      required
                    >
                      <option value="">Sélectionner un produit...</option>
                      {db.products.filter(p => p.isStockable).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.baseUnit})</option>
                      ))}
                    </select>
                    <input 
                      type="number"
                      placeholder="Qté"
                      value={item.quantityOrdered || ''}
                      onChange={(e) => {
                        const newItems = [...orderItems];
                        newItems[idx].quantityOrdered = parseInt(e.target.value) || 0;
                        setOrderItems(newItems);
                      }}
                      className="form-control"
                      style={{ width: '80px' }}
                      required
                    />
                    <input 
                      type="number"
                      placeholder="Coût achat"
                      value={item.purchasePrice || ''}
                      onChange={(e) => {
                        const newItems = [...orderItems];
                        newItems[idx].purchasePrice = parseFloat(e.target.value) || 0;
                        setOrderItems(newItems);
                      }}
                      className="form-control"
                      style={{ width: '100px' }}
                      required
                    />
                    <span style={{ fontSize: '0.825rem', width: '40px', color: 'var(--text-secondary)' }}>{item.unit}</span>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      style={{ padding: '6px 10px' }}
                      onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                    >
                      Suppr.
                    </button>
                  </div>
                ))}
              </div>

              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setOrderItems([...orderItems, { productId: '', quantityOrdered: 10, purchasePrice: 400, unit: 'unité' }])}
              >
                + Ajouter une ligne
              </button>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider la commande</button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
export default Purchases;
