import React, { useState } from 'react';
import { AlertTriangle, Bell, CircleDollarSign, Filter, PackageX, Search, ShieldCheck } from 'lucide-react';
import { StockState } from '../hooks/useStockState';

interface SmartAlertsProps {
  state: StockState;
  setView: (view: string) => void;
}

type AlertSeverity = 'critical' | 'warning' | 'info';

interface SmartAlert {
  id: string;
  title: string;
  detail: string;
  severity: AlertSeverity;
  family: 'stock' | 'pricing' | 'mapping' | 'delivery' | 'loss';
  view: string;
  action: string;
  value?: number;
}

export const SmartAlerts: React.FC<SmartAlertsProps> = ({ state, setView }) => {
  const { db } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const formatFCFA = (value: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
  );

  const alerts: SmartAlert[] = [];

  db.stocks.forEach(stock => {
    const product = db.products.find(item => item.id === stock.productId);
    const warehouse = db.warehouses.find(item => item.id === stock.warehouseId);
    if (!product || !warehouse) return;
    const sellable = stock.quantityAvailable - stock.quantityReserved;

    if (stock.quantityAvailable === 0 || sellable <= 0) {
      alerts.push({
        id: `stock-out-${stock.productId}-${stock.warehouseId}`,
        title: `${product.name} indisponible à la vente`,
        detail: `${warehouse.name} : ${stock.quantityAvailable} ${product.baseUnit} physique, ${stock.quantityReserved} réservé.`,
        severity: 'critical',
        family: 'stock',
        view: 'stocks',
        action: 'Voir les lots'
      });
    } else if (stock.quantityAvailable <= stock.alertThreshold) {
      alerts.push({
        id: `stock-low-${stock.productId}-${stock.warehouseId}`,
        title: `${product.name} sous seuil`,
        detail: `${warehouse.name} : ${stock.quantityAvailable} ${product.baseUnit}, seuil ${stock.alertThreshold}.`,
        severity: 'warning',
        family: 'stock',
        view: 'reorder',
        action: 'Préparer commande',
        value: Math.max(0, stock.alertThreshold - stock.quantityAvailable) * stock.averageCost
      });
    }
  });

  db.products.filter(product => product.isActive).forEach(product => {
    const activeRules = db.posPricing.filter(rule => rule.productId === product.id && rule.isAvailable);
    const missingChannels = db.posList.filter(pos => !activeRules.some(rule => rule.posId === pos.id));
    if (product.isStockable && !product.mainSupplierId) {
      alerts.push({
        id: `supplier-${product.id}`,
        title: `${product.name} sans fournisseur principal`,
        detail: 'Le réapprovisionnement automatique sera moins fiable sans fournisseur par défaut.',
        severity: 'info',
        family: 'mapping',
        view: 'products',
        action: 'Compléter produit'
      });
    }
    if (missingChannels.length > 0 && activeRules.length > 0) {
      alerts.push({
        id: `pricing-${product.id}`,
        title: `${product.name} non tarifé sur ${missingChannels.length} canal(aux)`,
        detail: `Exemples : ${missingChannels.slice(0, 2).map(pos => pos.name).join(', ')}.`,
        severity: 'warning',
        family: 'pricing',
        view: 'pricing',
        action: 'Voir prix'
      });
    }
  });

  db.posList.forEach(pos => {
    const warehouse = db.warehouses.find(item => item.id === pos.defaultWarehouseId);
    if (!warehouse) {
      alerts.push({
        id: `pos-warehouse-${pos.id}`,
        title: `${pos.name} sans dépôt fiable`,
        detail: 'Les ventes de ce canal risquent de sortir du mauvais stock.',
        severity: 'critical',
        family: 'mapping',
        view: 'warehouses',
        action: 'Relier dépôt'
      });
    }
  });

  db.deliveryOrders
    .filter(order => ['confirmed', 'reserved', 'preparing', 'ready', 'out_for_delivery', 'failed'].includes(order.status))
    .forEach(order => {
      if (order.status === 'failed') {
        alerts.push({
          id: `delivery-failed-${order.id}`,
          title: `${order.id} non livrée`,
          detail: `${order.customerName} : ${order.deliveryIssue || 'incident livraison à traiter'}.`,
          severity: 'warning',
          family: 'delivery',
          view: 'delivery',
          action: 'Voir livraison'
        });
      }
      if (order.paymentType === 'cash' && order.paymentStatus === 'pending') {
        alerts.push({
          id: `delivery-cash-${order.id}`,
          title: `${order.id} à encaisser`,
          detail: `${order.customerName} paie en espèces, rapprochement nécessaire.`,
          severity: 'info',
          family: 'delivery',
          view: 'delivery',
          action: 'Contrôler'
        });
      }
    });

  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const lossesByWarehouse = db.losses
    .filter(loss => new Date(loss.date).getTime() >= thirtyDaysAgo)
    .reduce<Record<string, number>>((totals, loss) => {
      const stock = db.stocks.find(item => item.productId === loss.productId && item.warehouseId === loss.warehouseId);
      totals[loss.warehouseId] = (totals[loss.warehouseId] || 0) + loss.quantity * (stock?.averageCost || 0);
      return totals;
    }, {});

  Object.entries(lossesByWarehouse).forEach(([warehouseId, value]) => {
    if (value < 20000) return;
    const warehouse = db.warehouses.find(item => item.id === warehouseId);
    alerts.push({
      id: `loss-${warehouseId}`,
      title: `Pertes élevées sur ${warehouse?.name || 'dépôt inconnu'}`,
      detail: `Valeur estimée sur 30 jours : ${formatFCFA(value)}.`,
      severity: value > 50000 ? 'critical' : 'warning',
      family: 'loss',
      view: 'losses',
      action: 'Analyser pertes',
      value
    });
  });

  const filteredAlerts = alerts.filter(alert => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || alert.title.toLowerCase().includes(normalizedSearch)
      || alert.detail.toLowerCase().includes(normalizedSearch);
    const matchesFamily = familyFilter === 'all' || alert.family === familyFilter;
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    return matchesSearch && matchesFamily && matchesSeverity;
  }).sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 };
    return rank[a.severity] - rank[b.severity];
  });

  const severityMeta: Record<AlertSeverity, { label: string; className: string }> = {
    critical: { label: 'Critique', className: 'badge-red' },
    warning: { label: 'À surveiller', className: 'badge-yellow' },
    info: { label: 'Info', className: 'badge-blue' }
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Alertes intelligentes</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Contrôlez les risques métier avant qu'ils deviennent des écarts de stock ou de caisse.</p>
      </div>

      <div className="grid-4">
        <div className="card" style={{ padding: '16px' }}>
          <Bell size={20} color="var(--primary)" />
          <h2 style={{ marginTop: '8px' }}>{filteredAlerts.length}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>alertes affichées</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <PackageX size={20} color="var(--danger)" />
          <h2 style={{ marginTop: '8px' }}>{alerts.filter(alert => alert.severity === 'critical').length}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>critiques</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <AlertTriangle size={20} color="var(--warning)" />
          <h2 style={{ marginTop: '8px' }}>{alerts.filter(alert => alert.severity === 'warning').length}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>à surveiller</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <CircleDollarSign size={20} color="var(--success)" />
          <h2 style={{ marginTop: '8px' }}>{formatFCFA(alerts.reduce((sum, alert) => sum + (alert.value || 0), 0))}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>valeur exposée</p>
        </div>
      </div>

      <div className="card product-filter-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Filtrer les alertes</h3>
        </div>
        <div className="mobile-filter-grid smart-alert-filter-grid">
          <div className="form-group">
            <label className="form-label">Rechercher</label>
            <div className="input-with-icon">
              <Search size={16} />
              <input className="form-control" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Produit, dépôt, commande..." />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Famille</label>
            <select className="form-control" value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value)}>
              <option value="all">Toutes</option>
              <option value="stock">Stock</option>
              <option value="pricing">Prix</option>
              <option value="mapping">Données</option>
              <option value="delivery">Livraison</option>
              <option value="loss">Pertes</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Niveau</label>
            <select className="form-control" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
              <option value="all">Tous</option>
              <option value="critical">Critique</option>
              <option value="warning">À surveiller</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Risques détectés</h3>
        </div>
        <div className="mobile-card-list">
          {filteredAlerts.map(alert => (
            <div key={alert.id} className="mobile-data-card">
              <div className="mobile-data-header">
                <div>
                  <div className="mobile-data-title">{alert.title}</div>
                  <div className="mobile-data-subtitle">{alert.detail}</div>
                </div>
                <span className={`badge ${severityMeta[alert.severity].className}`}>{severityMeta[alert.severity].label}</span>
              </div>
              <div className="mobile-card-actions">
                <button className="btn btn-primary" onClick={() => setView(alert.view)}>{alert.action}</button>
              </div>
            </div>
          ))}
          {filteredAlerts.length === 0 && (
            <div className="mobile-empty-state">Aucune alerte ne correspond aux filtres.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartAlerts;
