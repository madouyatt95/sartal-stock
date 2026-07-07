import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Activity, Filter, Search } from 'lucide-react';
import { StockMovement } from '../types';

interface MovementsProps {
  state: StockState;
}

type DirectionFilter = 'all' | 'in' | 'out';
type PeriodFilter = 'all' | 'today' | '7d' | '30d';

export const Movements: React.FC<MovementsProps> = ({ state }) => {
  const { db } = state;
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<DirectionFilter>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
      case 'sale_consumption': return 'Vente / livraison';
      case 'transfer_out': return 'Transfert Sortant';
      case 'transfer_in': return 'Transfert Entrant';
      case 'inventory_adjustment': return 'Inventaire';
      case 'loss': return 'Perte';
      case 'production': return 'Préparation';
      case 'manual_entry': return 'Saisie manuelle';
      case 'correction': return 'Correction';
      default: return 'Manuel';
    }
  };

  const productCategories = Array.from(new Set(db.products.map(product => product.category).filter(Boolean))).sort();

  const periodStart = (() => {
    if (selectedPeriod === 'all') return null;
    const start = new Date();
    if (selectedPeriod === 'today') {
      start.setHours(0, 0, 0, 0);
      return start;
    }
    start.setDate(start.getDate() - (selectedPeriod === '7d' ? 7 : 30));
    return start;
  })();

  const filteredMovements = db.movements.filter(m => {
    const prod = db.products.find(p => p.id === m.productId);
    if (!prod) return false;

    if (selectedType !== 'all' && m.type !== selectedType) return false;
    if (selectedWarehouseId !== 'all' && m.warehouseId !== selectedWarehouseId) return false;
    if (selectedCategory !== 'all' && prod.category !== selectedCategory) return false;
    if (selectedDirection === 'in' && m.quantity <= 0) return false;
    if (selectedDirection === 'out' && m.quantity >= 0) return false;
    if (periodStart && new Date(m.date) < periodStart) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchProd = prod.name.toLowerCase().includes(q);
      const matchReason = m.reason.toLowerCase().includes(q);
      const matchRef = m.externalReference?.toLowerCase().includes(q);
      if (!matchProd && !matchReason && !matchRef) return false;
    }

    return true;
  }).slice().sort((a, b) => b.date.localeCompare(a.date));

  const incomingMovements = filteredMovements.filter(movement => movement.quantity > 0);
  const outgoingMovements = filteredMovements.filter(movement => movement.quantity < 0);
  const incomingValue = incomingMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity * movement.cost), 0);
  const outgoingValue = outgoingMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity * movement.cost), 0);

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Journal stock</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Examinez la traçabilité complète de vos stocks. Aucun produit ne peut être ajouté ou retiré sans historique.</p>
      </div>

      <div className="grid-4">
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Mouvements trouvés</p>
          <h2 style={{ marginTop: '8px' }}>{filteredMovements.length}</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Entrées stock</p>
          <h2 style={{ marginTop: '8px', color: 'var(--success)' }}>{incomingMovements.length}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{formatFCFA(incomingValue)}</p>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Sorties stock</p>
          <h2 style={{ marginTop: '8px', color: 'var(--danger)' }}>{outgoingMovements.length}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{formatFCFA(outgoingValue)}</p>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Valeur contrôlée</p>
          <h2 style={{ marginTop: '8px' }}>{formatFCFA(incomingValue + outgoingValue)}</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Filtres d'audit</h3>
        </div>
        <div className="mobile-filter-grid">
          <div className="form-group">
            <label className="form-label">Recherche</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Produit, motif, référence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '38px', width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Période</label>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value as PeriodFilter)} className="form-control">
              <option value="30d">30 derniers jours</option>
              <option value="7d">7 derniers jours</option>
              <option value="today">Aujourd'hui</option>
              <option value="all">Tout l'historique</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sens</label>
            <select value={selectedDirection} onChange={(e) => setSelectedDirection(e.target.value as DirectionFilter)} className="form-control">
              <option value="all">Entrées et sorties</option>
              <option value="out">Sorties uniquement</option>
              <option value="in">Entrées uniquement</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="form-control">
              <option value="all">Tous les types</option>
              <option value="purchase_received">Réception fournisseur</option>
              <option value="sale_consumption">Vente / livraison</option>
              <option value="transfer_in">Transfert entrant</option>
              <option value="transfer_out">Transfert sortant</option>
              <option value="inventory_adjustment">Ajustement inventaire</option>
              <option value="loss">Perte / casse</option>
              <option value="production">Préparation</option>
              <option value="manual_entry">Saisie manuelle</option>
              <option value="correction">Correction</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Dépôt</label>
            <select value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)} className="form-control">
              <option value="all">Tous les dépôts</option>
              {db.warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Catégorie</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="form-control">
              <option value="all">Toutes catégories</option>
              {productCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Historique des mouvements</h3>
        </div>
        <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ fontSize: '0.825rem' }}>
            <thead>
              <tr>
                <th>Date / Heure</th>
                <th>Type</th>
                <th>Produit</th>
                <th>Catégorie</th>
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
              {filteredMovements.map(m => {
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
                    <td>{prod?.category}</td>
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
                  <td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    Aucun mouvement enregistré correspondant aux critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-card-list">
          {filteredMovements.map(m => {
            const prod = db.products.find(p => p.id === m.productId);
            const wh = db.warehouses.find(w => w.id === m.warehouseId);
            const batch = db.batches.find(b => b.id === m.batchId);
            const val = Math.abs(m.quantity) * m.cost;
            const formattedDate = new Date(m.date).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div key={m.id} className="mobile-data-card">
                <div className="mobile-data-header">
                  <div>
                    <div className="mobile-data-title">{prod?.name || 'Produit inconnu'}</div>
                    <div className="mobile-data-subtitle">{formattedDate} • {wh?.name || 'Dépôt inconnu'}</div>
                  </div>
                  <span className={`badge ${getMovementColorClass(m.type)}`}>
                    {getMovementLabel(m.type)}
                  </span>
                </div>
                <div className="mobile-data-row">
                  <span>Quantité</span>
                  <strong style={{ color: m.quantity < 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                  </strong>
                </div>
                <div className="mobile-data-row">
                  <span>Valeur</span>
                  <strong>{formatFCFA(val)}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Lot</span>
                  <strong>{batch?.batchNumber || 'N/A'}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Motif</span>
                  <strong>{m.reason}</strong>
                </div>
                {m.externalReference && (
                  <div className="mobile-data-row">
                    <span>Référence</span>
                    <strong>{m.externalReference}</strong>
                  </div>
                )}
              </div>
            );
          })}
          {filteredMovements.length === 0 && (
            <div className="mobile-data-card" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              Aucun mouvement correspondant aux filtres.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
export default Movements;
