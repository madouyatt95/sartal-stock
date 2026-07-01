import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Users, Plus, Phone, Mail, User } from 'lucide-react';

interface SuppliersProps {
  state: StockState;
}

export const Suppliers: React.FC<SuppliersProps> = ({ state }) => {
  const { db } = state;
  const [showAdd, setShowAdd] = useState(false);
  const [newSup, setNewSup] = useState({ name: '', contact: '', phone: '', email: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSup.name) return;

    const newDb = { ...db };
    const id = `sup-${Date.now()}`;
    newDb.suppliers.push({ id, ...newSup });
    localStorage.setItem('sartal_stock_db', JSON.stringify(newDb));
    state.db.suppliers.push({ id, ...newSup }); // directly update in-memory state for quick render
    setShowAdd(false);
    setNewSup({ name: '', contact: '', phone: '', email: '' });
    alert("Fournisseur enregistré !");
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Répertoire Fournisseurs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gérez vos contacts d'approvisionnement pour vos commandes d'achats</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Ajouter un fournisseur
        </button>
      </div>

      <div className="grid-3">
        {db.suppliers.map(sup => (
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
          </div>
        ))}
      </div>

      {/* Add Supplier Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Nouveau Fournisseur</h3>
            
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Annuler</button>
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
