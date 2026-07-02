import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Activity, Search, Filter } from 'lucide-react';
import { StockMovement } from '../types';

interface MovementsProps {
  state: StockState;
}

export const Movements: React.FC<MovementsProps> = ({ state }) => {
  const { db } = state;
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Formatter FCFA
  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA');
  };

  const getMovementColorClass = (type: StockMovement['type']) => {
    switch (type) {
      case 'purchase_received': return 'badge-green';
      case 'sale_consumption': return 'badge-blue';
      case 'transfer_out':
      case 'transfer_in': return 'badge-info';
      case 'inventory_adjustment': return 'badge-purple';
      case 'loss': return 'badge-red';
      default: return 'badge-yellow';
    }
  };

  const getMovementLabel = (type: StockMovement['type']) => {
    switch (type) {
      case 'purchase_received': return 'Réception';
      case 'sale_consumption': return 'Vente (POS)';
      case 'transfer_out': return 'Transfert Sortant';
      case 'transfer_in': return 'Transfert Entrant';
      case 'inventory_adjustment': return 'Inventaire';
      case 'loss': return 'Perte';
      default: return 'Manuel';
    }
  };

  // Filter movements
  const filteredMovements = db.movements.filter(m => {
    const prod = db.products.find(p => p.id === m.productId);
    if (!prod) return false;

    if (selectedType !== 'all' && m.type !== selectedType) return false;
    if (selectedWarehouseId !== 'all' && m.warehouseId !== selectedWarehouseId) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchProd = prod.name.toLowerCase().includes(q);
      const matchReason = m.reason.toLowerCase().includes(q);
      const matchRef = m.externalReference?.toLowerCase().includes(q);
      if (!matchProd && !matchReason && !matchRef) return false;
    }

    return true;
  });

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Journal stock</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Examinez la traçabilité complète de vos stocks. Aucun produit ne peut être ajouté ou retiré sans historique.</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', padding: '16px' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="Rechercher par produit, motif ou référence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '38px', width: '100%' }}
          />
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--text-secondary)" />
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="form-control"
            style={{ fontWeight: 600 }}
          >
            <option value="all">Tous les types</option>
            <option value="purchase_received">Réception Fournisseur</option>
            <option value="sale_consumption">Consommation Vente POS</option>
            <option value="transfer_in">Transfert Entrant</option>
            <option value="transfer_out">Transfert Sortant</option>
            <option value="inventory_adjustment">Ajustement Inventaire</option>
            <option value="loss">Déclaration Perte</option>
          </select>
        </div>

        {/* Depot Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select 
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="form-control"
            style={{ fontWeight: 600 }}
          >
            <option value="all">Tous les dépôts</option>
            {db.warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Movements Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Historique d'Écritures</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ fontSize: '0.825rem' }}>
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th>Type</th>
                <th>Produit</th>
                <th>Dépôt</th>
                <th>N° Lot</th>
                <th>Quantité</th>
                <th>Coût Unitaire</th>
                <th>Valorisation</th>
                <th>Auteur</th>
                <th>Motif / Réf.</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.slice().reverse().map(m => {
                const prod = db.products.find(p => p.id === m.productId);
                const wh = db.warehouses.find(w => w.id === m.warehouseId);
                const batch = db.batches.find(b => b.id === m.batchId);
                
                const val = Math.abs(m.quantity) * m.cost;
                const formattedDate = new Date(m.date).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                });

                return (
                  <tr key={m.id}>
                    <td>{formattedDate}</td>
                    <td>
                      <span className={`badge ${getMovementColorClass(m.type)}`}>
                        {getMovementLabel(m.type)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{prod?.name}</td>
                    <td style={{ fontWeight: 600 }}>{wh?.name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{batch?.batchNumber || 'N/A'}</td>
                    <td style={{ fontWeight: 800, color: m.quantity < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                    </td>
                    <td>{formatFCFA(m.cost)}</td>
                    <td style={{ fontWeight: 700 }}>{formatFCFA(val)}</td>
                    <td>{m.userName}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {m.reason} {m.externalReference && `(Réf: ${m.externalReference})`}
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    Aucun mouvement enregistré correspondant aux critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
export default Movements;
