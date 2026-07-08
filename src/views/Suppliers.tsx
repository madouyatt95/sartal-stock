import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Filter, Mail, Pencil, Phone, Plus, Search, Trash2, User, Users } from 'lucide-react';

interface SuppliersProps {
  state: StockState;
}

export const Suppliers: React.FC<SuppliersProps> = ({ state }) => {
  const { db, addSupplier, updateSupplier, deleteSupplier } = state;
  const [showAdd, setShowAdd] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [newSup, setNewSup] = useState({ name: '', contact: '', phone: '', email: '' });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');

  const closeModal = () => {
    setShowAdd(false);
    setEditingSupplierId(null);
    setNewSup({ name: '', contact: '', phone: '', email: '' });
  };

  const openEditSupplier = (supplierId: string) => {
    const supplier = db.suppliers.find(item => item.id === supplierId);
    if (!supplier) return;
    setEditingSupplierId(supplierId);
    setNewSup({
      name: supplier.name,
      contact: supplier.contact,
      phone: supplier.phone,
      email: supplier.email
    });
    setShowAdd(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSup.name) return;

    if (editingSupplierId) {
      updateSupplier(editingSupplierId, newSup);
    } else {
      addSupplier(newSup);
    }
    closeModal();
  };

  const handleDeleteSupplier = (supplierId: string) => {
    const supplier = db.suppliers.find(item => item.id === supplierId);
    if (!supplier) return;
    if (!window.confirm(`Supprimer le fournisseur "${supplier.name}" ?`)) return;
    deleteSupplier(supplierId);
  };

  const getSupplierOrderStats = (supplierId: string) => {
    const orders = db.supplierOrders.filter(order => order.supplierId === supplierId);
    return {
      count: orders.length,
      open: orders.filter(order => order.status === 'ordered' || order.status === 'partially_received').length,
      value: orders.reduce((sum, order) => (
        sum + order.items.reduce((orderTotal, item) => orderTotal + (item.quantityOrdered * item.purchasePrice), 0)
      ), 0)
    };
  };

  const formatFCFA = (value: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
  );

  const filteredSuppliers = db.suppliers.filter(supplier => {
    const stats = getSupplierOrderStats(supplier.id);
    const normalizedSearch = supplierSearch.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || supplier.name.toLowerCase().includes(normalizedSearch)
      || supplier.contact.toLowerCase().includes(normalizedSearch)
      || supplier.phone.toLowerCase().includes(normalizedSearch)
      || supplier.email.toLowerCase().includes(normalizedSearch);
    const matchesActivity = activityFilter === 'all'
      || (activityFilter === 'open' && stats.open > 0)
      || (activityFilter === 'used' && stats.count > 0)
      || (activityFilter === 'unused' && stats.count === 0);
    return matchesSearch && matchesActivity;
  });

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Répertoire Fournisseurs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gérez vos contacts d'approvisionnement pour vos commandes d'achats</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingSupplierId(null);
          setNewSup({ name: '', contact: '', phone: '', email: '' });
          setShowAdd(true);
        }}>
          <Plus size={18} /> Ajouter un fournisseur
        </button>
      </div>

      <div className="grid-4">
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Fournisseurs</p>
          <strong style={{ fontSize: '1.45rem' }}>{filteredSuppliers.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>affichés</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Avec commandes</p>
          <strong style={{ fontSize: '1.45rem' }}>{db.suppliers.filter(supplier => getSupplierOrderStats(supplier.id).count > 0).length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>actifs</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Ouverts</p>
          <strong style={{ fontSize: '1.45rem' }}>{db.suppliers.reduce((sum, supplier) => sum + getSupplierOrderStats(supplier.id).open, 0)}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>bons à suivre</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Valeur achats</p>
          <strong style={{ fontSize: '1.25rem' }}>{formatFCFA(db.suppliers.reduce((sum, supplier) => sum + getSupplierOrderStats(supplier.id).value, 0))}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>estimée</p>
        </div>
      </div>

      <div className="card product-filter-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Recherche et filtres</h3>
        </div>
        <div className="mobile-filter-grid supplier-filter-grid">
          <div className="form-group">
            <label className="form-label">Rechercher</label>
            <div className="input-with-icon">
              <Search size={16} />
              <input
                type="search"
                className="form-control"
                value={supplierSearch}
                onChange={(event) => setSupplierSearch(event.target.value)}
                placeholder="Société, contact, téléphone, email"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Activité</label>
            <select className="form-control" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
              <option value="all">Tous</option>
              <option value="open">Commande ouverte</option>
              <option value="used">Déjà utilisé</option>
              <option value="unused">Sans commande</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid-3">
        {filteredSuppliers.map(sup => {
          const stats = getSupplierOrderStats(sup.id);
          return (
          <div key={sup.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-lightest)', color: 'var(--primary)' }}>
                <Users size={20} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{sup.name}</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} />
                <span>Contact: <strong>{sup.contact}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} />
                <span>Tél: <strong>{sup.phone}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} />
                <span>Email: <strong>{sup.email}</strong></span>
              </div>
            </div>

            <div className="mobile-data-row" style={{ paddingTop: '10px' }}>
              <span>Commandes / ouvertes</span>
              <strong>{stats.count} / {stats.open}</strong>
            </div>
            <div className="mobile-data-row">
              <span>Valeur estimée</span>
              <strong>{formatFCFA(stats.value)}</strong>
            </div>

            <div className="entity-row-actions">
              <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => openEditSupplier(sup.id)}>
                <Pencil size={14} /> Modifier
              </button>
              <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => handleDeleteSupplier(sup.id)}>
                <Trash2 size={14} /> Suppr.
              </button>
            </div>
          </div>
          );
        })}
        {filteredSuppliers.length === 0 && (
          <div className="mobile-empty-state">Aucun fournisseur ne correspond aux filtres.</div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="card modal-card modal-card-sm">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{editingSupplierId ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nom de la société</label>
                <input 
                  type="text" 
                  value={newSup.name} 
                  onChange={(e) => setNewSup({ ...newSup, name: e.target.value })} 
                  className="form-control"
                  placeholder="Ex: Soberka Boissons"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Interlocuteur</label>
                <input 
                  type="text" 
                  value={newSup.contact} 
                  onChange={(e) => setNewSup({ ...newSup, contact: e.target.value })} 
                  className="form-control"
                  placeholder="Ex: Mamadou Diallo"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Numéro de téléphone</label>
                <input 
                  type="text" 
                  value={newSup.phone} 
                  onChange={(e) => setNewSup({ ...newSup, phone: e.target.value })} 
                  className="form-control"
                  placeholder="Ex: +221 33..."
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse Email</label>
                <input 
                  type="email" 
                  value={newSup.email} 
                  onChange={(e) => setNewSup({ ...newSup, email: e.target.value })} 
                  className="form-control"
                  placeholder="Ex: contact@..."
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Suppliers;
