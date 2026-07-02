import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Pencil, Plus, Trash2, Warehouse, Landmark, ThermometerSnowflake } from 'lucide-react';
import { POSType } from '../types';

interface WarehousesProps {
  state: StockState;
}

export const Warehouses: React.FC<WarehousesProps> = ({ state }) => {
  const { db, addWarehouse, updateWarehouse, deleteWarehouse, addPOS, updatePOS, deletePOS } = state;
  const [showAddWh, setShowAddWh] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [newWh, setNewWh] = useState({ name: '', isColdStorage: false });
  const [showAddPOS, setShowAddPOS] = useState(false);
  const [editingPOSId, setEditingPOSId] = useState<string | null>(null);
  const [newPOS, setNewPOS] = useState({ name: '', type: 'restaurant' as POSType, defaultWarehouseId: '' });

  const closeWarehouseModal = () => {
    setShowAddWh(false);
    setEditingWarehouseId(null);
    setNewWh({ name: '', isColdStorage: false });
  };

  const closePOSModal = () => {
    setShowAddPOS(false);
    setEditingPOSId(null);
    setNewPOS({ name: '', type: 'restaurant', defaultWarehouseId: '' });
  };

  const openEditWarehouse = (warehouseId: string) => {
    const warehouse = db.warehouses.find(item => item.id === warehouseId);
    if (!warehouse) return;
    setEditingWarehouseId(warehouseId);
    setNewWh({ name: warehouse.name, isColdStorage: warehouse.isColdStorage });
    setShowAddWh(true);
  };

  const openEditPOS = (posId: string) => {
    const pos = db.posList.find(item => item.id === posId);
    if (!pos) return;
    setEditingPOSId(posId);
    setNewPOS({ name: pos.name, type: pos.type, defaultWarehouseId: pos.defaultWarehouseId });
    setShowAddPOS(true);
  };

  const handleSaveWh = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWh.name) return;
    if (editingWarehouseId) {
      updateWarehouse(editingWarehouseId, newWh);
    } else {
      addWarehouse(newWh.name, newWh.isColdStorage);
    }
    closeWarehouseModal();
  };

  const handleSavePOS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPOS.name || !newPOS.defaultWarehouseId) return;
    if (editingPOSId) {
      updatePOS(editingPOSId, newPOS);
    } else {
      addPOS(newPOS.name, newPOS.type, newPOS.defaultWarehouseId);
    }
    closePOSModal();
  };

  const handleDeleteWarehouse = (warehouseId: string) => {
    const warehouse = db.warehouses.find(item => item.id === warehouseId);
    if (!warehouse) return;
    if (db.warehouses.length <= 1) {
      alert("Il faut conserver au moins un dépôt.");
      return;
    }
    if (!window.confirm(`Supprimer "${warehouse.name}" et ses stocks associés ?`)) return;
    deleteWarehouse(warehouseId);
  };

  const handleDeletePOS = (posId: string) => {
    const pos = db.posList.find(item => item.id === posId);
    if (!pos) return;
    if (!window.confirm(`Supprimer le point de vente "${pos.name}" et ses règles associées ?`)) return;
    deletePOS(posId);
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Points de vente & dépôts</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configurez la cartographie de stockage et d'écoulement de votre complexe</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => {
            setEditingPOSId(null);
            setNewPOS({ name: '', type: 'restaurant', defaultWarehouseId: db.warehouses[0]?.id || '' });
            setShowAddPOS(true);
          }}>
            <Plus size={18} /> Nouveau POS
          </button>
          <button className="btn btn-primary" onClick={() => {
            setEditingWarehouseId(null);
            setNewWh({ name: '', isColdStorage: false });
            setShowAddWh(true);
          }}>
            <Plus size={18} /> Nouveau Dépôt
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* Warehouses list */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Warehouse size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Dépôts Physiques</h3>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {db.warehouses.map(w => {
              // Calculate value in this warehouse
              const whStock = db.stocks.filter(s => s.warehouseId === w.id);
              const totalVal = whStock.reduce((sum, s) => sum + (s.quantityAvailable * s.averageCost), 0);
              const productsCount = whStock.filter(s => s.quantityAvailable > 0).length;

              return (
                <div key={w.id} className="entity-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: w.isColdStorage ? 'var(--info-light)' : 'var(--primary-lightest)', color: w.isColdStorage ? 'var(--info)' : 'var(--primary)' }}>
                      {w.isColdStorage ? <ThermometerSnowflake size={20} /> : <Warehouse size={20} />}
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700 }}>{w.name}</h4>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{productsCount} produits en stock</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Valeur Estimée</span>
                    <h5 style={{ fontWeight: 800, fontSize: '1rem' }}>
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(totalVal).replace('XOF', 'FCFA')}
                    </h5>
                    <div className="entity-row-actions" style={{ marginTop: '10px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => openEditWarehouse(w.id)}>
                        <Pencil size={14} /> Modifier
                      </button>
                      <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => handleDeleteWarehouse(w.id)}>
                        <Trash2 size={14} /> Suppr.
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* POS points list */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Landmark size={20} color="var(--success)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Points de Vente / POS</h3>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {db.posList.map(pos => {
              const defaultWh = db.warehouses.find(w => w.id === pos.defaultWarehouseId);
              return (
                <div key={pos.id} className="entity-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                      <Landmark size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700 }}>{pos.name}</h4>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Type: <strong style={{ textTransform: 'capitalize' }}>{pos.type.replace('_', ' ')}</strong></p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dépôt de déduction par défaut</span>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>{defaultWh?.name}</p>
                    <div className="entity-row-actions" style={{ marginTop: '10px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => openEditPOS(pos.id)}>
                        <Pencil size={14} /> Modifier
                      </button>
                      <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => handleDeletePOS(pos.id)}>
                        <Trash2 size={14} /> Suppr.
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Warehouse Modal */}
      {showAddWh && (
        <div className="modal-overlay">
          <div className="card modal-card modal-card-sm">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{editingWarehouseId ? 'Modifier le dépôt' : 'Nouveau dépôt'}</h3>
            <form onSubmit={handleSaveWh} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nom du dépôt</label>
                <input 
                  type="text" 
                  value={newWh.name} 
                  onChange={(e) => setNewWh({ ...newWh, name: e.target.value })} 
                  className="form-control"
                  placeholder="Ex: Cave Centrale"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={newWh.isColdStorage} 
                    onChange={(e) => setNewWh({ ...newWh, isColdStorage: e.target.checked })} 
                  />
                  Chambre Froide / Stockage réfrigéré
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeWarehouseModal}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editingWarehouseId ? 'Enregistrer' : 'Créer le dépôt'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add POS Modal */}
      {showAddPOS && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{editingPOSId ? 'Modifier le point de vente' : 'Nouveau point de vente'}</h3>
            <form onSubmit={handleSavePOS} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nom du POS</label>
                <input 
                  type="text" 
                  value={newPOS.name} 
                  onChange={(e) => setNewPOS({ ...newPOS, name: e.target.value })} 
                  className="form-control"
                  placeholder="Ex: Bar Piscine"
                  required
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Type de Point de Vente</label>
                  <select 
                    value={newPOS.type} 
                    onChange={(e) => setNewPOS({ ...newPOS, type: e.target.value as POSType })}
                    className="form-control"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="bar">Bar</option>
                    <option value="night_club">Night Club</option>
                    <option value="casino">Casino</option>
                    <option value="room_service">Room Service</option>
                    <option value="spa">Spa</option>
                    <option value="boutique">Boutique</option>
                    <option value="mini_bar">Mini-bar</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dépôt de déduction</label>
                  <select 
                    value={newPOS.defaultWarehouseId} 
                    onChange={(e) => setNewPOS({ ...newPOS, defaultWarehouseId: e.target.value })}
                    className="form-control"
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {db.warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closePOSModal}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editingPOSId ? 'Enregistrer' : 'Créer le point de vente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Warehouses;
