import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { CheckSquare, Filter, Layers, PackageOpen, Search } from 'lucide-react';

interface ReceivingProps {
  state: StockState;
}

export const Receiving: React.FC<ReceivingProps> = ({ state }) => {
  const { db, receiveOrder } = state;
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lineSearch, setLineSearch] = useState('');
  const [lineFilter, setLineFilter] = useState('remaining');
  
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
  const formatFCFA = (value: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
  );

  const getSupplierName = (supplierId: string) => db.suppliers.find(supplier => supplier.id === supplierId)?.name || 'Fournisseur inconnu';
  const getOrderTotal = (orderId: string) => {
    const order = db.supplierOrders.find(item => item.id === orderId);
    if (!order) return 0;
    return order.items.reduce((total, item) => total + (item.quantityOrdered * item.purchasePrice), 0);
  };
  const getOrderRemaining = (orderId: string) => {
    const order = db.supplierOrders.find(item => item.id === orderId);
    if (!order) return { qty: 0, lines: 0 };
    return order.items.reduce((total, item) => {
      const remaining = Math.max(0, item.quantityOrdered - item.quantityReceived);
      return {
        qty: total.qty + remaining,
        lines: total.lines + (remaining > 0 ? 1 : 0)
      };
    }, { qty: 0, lines: 0 });
  };

  const filteredOrders = pendingOrders.filter(order => {
    const supplierName = getSupplierName(order.supplierId);
    const normalizedSearch = orderSearch.trim().toLowerCase();
    const hasMatchingItem = order.items.some(item => {
      const product = db.products.find(prod => prod.id === item.productId);
      return product?.name.toLowerCase().includes(normalizedSearch) || product?.sku.toLowerCase().includes(normalizedSearch);
    });
    const matchesSearch = !normalizedSearch
      || order.id.toLowerCase().includes(normalizedSearch)
      || supplierName.toLowerCase().includes(normalizedSearch)
      || hasMatchingItem;
    const matchesSupplier = supplierFilter === 'all' || order.supplierId === supplierFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesSupplier && matchesStatus;
  });

  const selectedOrderRemaining = selectedOrderId ? getOrderRemaining(selectedOrderId) : { qty: 0, lines: 0 };
  const activeOrderSupplier = activeOrder ? getSupplierName(activeOrder.supplierId) : '';
  const activeOrderLines = activeOrder?.items.filter(item => {
    const product = db.products.find(prod => prod.id === item.productId);
    const remaining = Math.max(0, item.quantityOrdered - item.quantityReceived);
    const normalizedSearch = lineSearch.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || product?.name.toLowerCase().includes(normalizedSearch)
      || product?.sku.toLowerCase().includes(normalizedSearch)
      || product?.category.toLowerCase().includes(normalizedSearch);
    const matchesLineFilter = lineFilter === 'all'
      || (lineFilter === 'remaining' && remaining > 0)
      || (lineFilter === 'filled' && (receiptFields[item.productId]?.qty || 0) > 0);

    return matchesSearch && matchesLineFilter;
  }) || [];
  const currentReceiptTotal = Object.entries(receiptFields).reduce((total, [productId, values]) => {
    const item = activeOrder?.items.find(line => line.productId === productId);
    return total + ((values.qty || 0) * (item?.purchasePrice || 0));
  }, 0);

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
    setLineSearch('');
    alert("Réception enregistrée avec succès ! Les stocks et lots ont été mis à jour.");
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Réceptions</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Réceptionnez vos commandes fournisseurs, attribuez les numéros de lots et dates de péremption</p>
      </div>

      <div className="grid-4">
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>À réceptionner</p>
          <strong style={{ fontSize: '1.45rem' }}>{pendingOrders.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{filteredOrders.length} affichées</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Partielles</p>
          <strong style={{ fontSize: '1.45rem' }}>{pendingOrders.filter(order => order.status === 'partially_received').length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>à compléter</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Lignes restantes</p>
          <strong style={{ fontSize: '1.45rem' }}>{selectedOrderRemaining.lines}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{selectedOrderId ? 'bon sélectionné' : 'aucun bon sélectionné'}</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Réception saisie</p>
          <strong style={{ fontSize: '1.45rem' }}>{formatFCFA(currentReceiptTotal)}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>valeur estimée</p>
        </div>
      </div>

      <div className="card product-filter-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Trouver le bon de réception</h3>
        </div>
        <div className="mobile-filter-grid receiving-filter-grid">
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
              <option value="ordered">Nouveau</option>
              <option value="partially_received">Partiel</option>
            </select>
          </div>
        </div>
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
                  {filteredOrders.map(o => {
                    const remaining = getOrderRemaining(o.id);
                    return (
                      <option key={o.id} value={o.id}>
                        {o.id} - {getSupplierName(o.supplierId)} - {remaining.lines} ligne(s) restante(s) ({o.status === 'partially_received' ? 'Partiel' : 'Nouveau'})
                      </option>
                    );
                  })}
                </select>
                {filteredOrders.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '6px' }}>
                    Aucun bon ne correspond aux filtres.
                  </p>
                )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={16} /> Produits commandés
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
                      {activeOrder.id} - {activeOrderSupplier} - {formatFCFA(getOrderTotal(activeOrder.id))}
                    </p>
                  </div>
                  <span className="badge badge-blue">{activeOrderLines.length} ligne{activeOrderLines.length > 1 ? 's' : ''} affichée{activeOrderLines.length > 1 ? 's' : ''}</span>
                </div>
                <div className="mobile-filter-grid receiving-line-filter-grid" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Filtrer les lignes</label>
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
                    <label className="form-label">Affichage</label>
                    <select className="form-control" value={lineFilter} onChange={(event) => setLineFilter(event.target.value)}>
                      <option value="remaining">Restant à recevoir</option>
                      <option value="filled">Quantité saisie</option>
                      <option value="all">Toutes les lignes</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {activeOrderLines.map(item => {
                    const prod = db.products.find(p => p.id === item.productId);
                    const fields = receiptFields[item.productId] || { qty: 0, lot: '', expiry: '' };
                    const remaining = Math.max(0, item.quantityOrdered - item.quantityReceived);
                    return (
                      <div key={item.productId} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-app)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                          <div>
                            <span style={{ fontWeight: 800 }}>{prod?.name}</span>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>{prod?.sku} - {prod?.category}</p>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Commandé : <strong>{item.quantityOrdered}</strong> | Reçu : <strong>{item.quantityReceived}</strong> | Reste : <strong>{remaining}</strong>
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
                  {activeOrderLines.length === 0 && (
                    <div className="mobile-empty-state">
                      Aucune ligne ne correspond aux filtres de réception.
                    </div>
                  )}
                </div>

                <div className="receiving-submit-bar">
                  <div>
                    <strong>{formatFCFA(currentReceiptTotal)}</strong>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>sera ajouté au dépôt sélectionné</p>
                  </div>
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
          <div className="card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '10px', color: 'var(--primary)' }}>Lecture rapide</h4>
            <div className="proof-row">
              <span>1</span>
              <strong>Filtrer</strong>
              <span>Retrouver un bon par fournisseur, numéro ou produit.</span>
            </div>
            <div className="proof-row">
              <span>2</span>
              <strong>Contrôler</strong>
              <span>Voir les quantités commandées, reçues et restantes.</span>
            </div>
            <div className="proof-row">
              <span>3</span>
              <strong>Tracer</strong>
              <span>Renseigner lot, DLC et dépôt avant entrée en stock.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
export default Receiving;
