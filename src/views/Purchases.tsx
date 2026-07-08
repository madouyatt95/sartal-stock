import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Filter, Plus, Search, ShoppingBag } from 'lucide-react';

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
  const [orderSearch, setOrderSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');

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

  const formatFCFA = (value: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
  );

  const filteredOrders = db.supplierOrders.filter(order => {
    const supplier = db.suppliers.find(item => item.id === order.supplierId);
    const normalizedSearch = orderSearch.trim().toLowerCase();
    const hasProductMatch = order.items.some(item => {
      const product = db.products.find(prod => prod.id === item.productId);
      return product?.name.toLowerCase().includes(normalizedSearch) || product?.sku.toLowerCase().includes(normalizedSearch);
    });
    const matchesSearch = !normalizedSearch
      || order.id.toLowerCase().includes(normalizedSearch)
      || supplier?.name.toLowerCase().includes(normalizedSearch)
      || hasProductMatch;
    const matchesSupplier = supplierFilter === 'all' || order.supplierId === supplierFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesSupplier && matchesStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredProducts = db.products.filter(product => {
    if (!product.isStockable) return false;
    const normalizedSearch = productSearch.trim().toLowerCase();
    return !normalizedSearch
      || product.name.toLowerCase().includes(normalizedSearch)
      || product.sku.toLowerCase().includes(normalizedSearch)
      || product.category.toLowerCase().includes(normalizedSearch);
  });

  const filteredOrderValue = filteredOrders.reduce((sum, order) => (
    sum + order.items.reduce((orderTotal, item) => orderTotal + (item.quantityOrdered * item.purchasePrice), 0)
  ), 0);

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Commandes achats</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Créez et suivez vos bons de commandes fournisseurs avant réception</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Créer un bon de commande
        </button>
      </div>

      <div className="grid-4">
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Commandes</p>
          <strong style={{ fontSize: '1.45rem' }}>{filteredOrders.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>affichées</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Valeur</p>
          <strong style={{ fontSize: '1.25rem' }}>{formatFCFA(filteredOrderValue)}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>estimée</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>À recevoir</p>
          <strong style={{ fontSize: '1.45rem' }}>{db.supplierOrders.filter(order => order.status === 'ordered' || order.status === 'partially_received').length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>bons ouverts</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Fournisseurs</p>
          <strong style={{ fontSize: '1.45rem' }}>{db.suppliers.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>actifs</p>
        </div>
      </div>

      <div className="card product-filter-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Recherche et filtres</h3>
        </div>
        <div className="mobile-filter-grid purchase-filter-grid">
          <div className="form-group">
            <label className="form-label">Rechercher</label>
            <div className="input-with-icon">
              <Search size={16} />
              <input
                type="search"
                className="form-control"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="Bon, fournisseur ou produit"
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
            <label className="form-label">Statut</label>
            <select className="form-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Tous</option>
              <option value="ordered">Commandée</option>
              <option value="partially_received">Partielle</option>
              <option value="fully_received">Reçue</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShoppingBag size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Bons de commande</h3>
        </div>
        <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
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
              {filteredOrders.map(order => {
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
                      {formatFCFA(totalValue)}
                    </td>
                    <td>
                      <span className={`badge ${status.class}`}>
                        {status.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    Aucune commande en cours. Créez un bon pour démarrer le processus d'achat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {filteredOrders.map(order => {
            const supplier = db.suppliers.find(s => s.id === order.supplierId);
            const totalValue = order.items.reduce((sum, item) => sum + (item.quantityOrdered * item.purchasePrice), 0);
            const status = getStatusLabel(order.status);
            return (
              <div key={order.id} className="mobile-data-card">
                <div className="mobile-data-header">
                  <div>
                    <div className="mobile-data-title">{order.id}</div>
                    <div className="mobile-data-subtitle">{supplier?.name} • {new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`badge ${status.class}`}>{status.text}</span>
                </div>
                <div className="mobile-data-row">
                  <span>Articles</span>
                  <strong>{order.items.length}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Valeur estimée</span>
                  <strong>{formatFCFA(totalValue)}</strong>
                </div>
              </div>
            );
          })}
          {filteredOrders.length === 0 && (
            <div className="mobile-empty-state">Aucune commande ne correspond aux filtres.</div>
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Nouveau Bon de Commande</h3>
            
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                <div className="form-group" style={{ marginBottom: '6px' }}>
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
                {orderItems.map((item, idx) => (
                  <div key={idx} className="modal-line">
                    <select 
                      value={item.productId}
                      onChange={(e) => {
                        const newItems = [...orderItems];
                        const prod = db.products.find(p => p.id === e.target.value);
                        newItems[idx].productId = e.target.value;
                        newItems[idx].unit = prod?.baseUnit || 'unité';
                        // Pre-fill estimate cost
                        if (e.target.value === 'prod-coca') newItems[idx].purchasePrice = 380;
                        else if (e.target.value === 'prod-jus-gingembre') newItems[idx].purchasePrice = 600;
                        else if (e.target.value === 'prod-petillant-premium') newItems[idx].purchasePrice = 2200;
                        else if (e.target.value === 'prod-steak') newItems[idx].purchasePrice = 1500;
                        else if (e.target.value === 'prod-pdt') newItems[idx].purchasePrice = 0.5;
                        setOrderItems(newItems);
                      }}
                      className="form-control"
                      style={{ flexGrow: 1 }}
                      required
                    >
                      <option value="">Sélectionner un produit...</option>
                      {filteredProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.baseUnit})</option>
                      ))}
                    </select>
                    <input 
                      type="number"
                      min="1"
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
                      min="0"
                      step="any"
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

              <div className="modal-actions">
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
