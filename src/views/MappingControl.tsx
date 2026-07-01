import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  FileSpreadsheet,
  GitBranch,
  Package,
  Puzzle,
  Warehouse
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';

interface MappingControlProps {
  state: StockState;
  setView: (view: string) => void;
}

const discoveredPOS = [
  { externalCode: 'Restaurant Le Jardin', detectedRows: 3 },
  { externalCode: 'Bar des Machines à Sous', detectedRows: 2 },
  { externalCode: 'Night Club', detectedRows: 3 },
  { externalCode: 'Piscine Lounge', detectedRows: 4 },
  { externalCode: 'MiniBar PMS', detectedRows: 9 }
];

const discoveredProducts = [
  { externalSku: 'COCA33', label: 'Coca-Cola 33 cl', count: 6 },
  { externalSku: 'STEAKFRITES', label: 'Steak frites', count: 1 },
  { externalSku: 'BURGER', label: 'Burger maison', count: 2 },
  { externalSku: 'GINTONIC', label: 'Gin tonic', count: 3 },
  { externalSku: 'VINROUGE75', label: 'Vin rouge maison', count: 1 },
  { externalSku: 'UNKNOWN01', label: 'Produit inconnu caisse', count: 1 },
  { externalSku: 'MOJITO', label: 'Mojito classique', count: 5 },
  { externalSku: 'EAUMIN', label: 'Eau minérale 50 cl', count: 12 }
];

export const MappingControl: React.FC<MappingControlProps> = ({ state, setView }) => {
  const { db } = state;

  const mappedPOS = discoveredPOS.filter(item => (
    db.posList.some(pos => pos.id === item.externalCode || pos.name.toLowerCase() === item.externalCode.toLowerCase())
  ));

  const mappedProducts = discoveredProducts.filter(item => (
    db.posProductAliases.some(alias => alias.externalSku.toLowerCase() === item.externalSku.toLowerCase()) ||
    db.products.some(product => product.sku.toLowerCase() === item.externalSku.toLowerCase())
  ));

  const recipesWithMissingIngredients = db.recipes.filter(recipe => (
    recipe.ingredients.some(ingredient => !db.products.some(product => product.id === ingredient.productId))
  ));

  const posCoverage = Math.round((mappedPOS.length / discoveredPOS.length) * 100);
  const productCoverage = Math.round((mappedProducts.length / discoveredProducts.length) * 100);
  const depotCoverage = Math.round((db.posList.filter(pos => !!pos.defaultWarehouseId).length / db.posList.length) * 100);
  const recipeCoverage = Math.round(((db.recipes.length - recipesWithMissingIngredients.length) / Math.max(1, db.recipes.length)) * 100);
  const readiness = Math.round((posCoverage + productCoverage + depotCoverage + recipeCoverage) / 4);

  const readinessColor = readiness >= 85 ? 'var(--success)' : readiness >= 60 ? 'var(--warning)' : 'var(--danger)';

  const statusBadge = (ok: boolean) => (
    <span className={`badge ${ok ? 'badge-green' : 'badge-red'}`}>
      {ok ? 'Mappé' : 'À relier'}
    </span>
  );

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Cartographie & Mapping</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            On ne suppose pas que les données sont propres. Sartal détecte les POS, produits et dépôts à partir des exports, puis montre ce qui doit être relié avant l'audit stock.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setView('pos-imports')}>
            Voir l'export POS
          </button>
          <button className="btn btn-primary" onClick={() => setView('stock-audit')}>
            Lancer l'audit
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '24px', alignItems: 'center' }}>
        <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: `conic-gradient(${readinessColor} ${readiness * 3.6}deg, var(--border-color) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '112px', height: '112px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <strong style={{ fontSize: '1.8rem', color: readinessColor }}>{readiness}%</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700 }}>Prêt audit</span>
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Fiabilité de cartographie</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.6 }}>
            Tant que les POS, produits et dépôts ne sont pas reliés, l'audit signale des zones non fiables au lieu de forcer un résultat faux.
          </p>
          <div className="grid-4" style={{ marginTop: '18px' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>POS</p>
              <strong>{mappedPOS.length}/{discoveredPOS.length}</strong>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Produits</p>
              <strong>{mappedProducts.length}/{discoveredProducts.length}</strong>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Dépôts reliés</p>
              <strong>{depotCoverage}%</strong>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Recettes</p>
              <strong>{recipeCoverage}%</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-4">
        {[
          { label: 'POS détectés', value: discoveredPOS.length, sub: `${mappedPOS.length} reliés`, icon: <FileSpreadsheet size={20} />, color: 'var(--primary)' },
          { label: 'Produits externes', value: discoveredProducts.length, sub: `${discoveredProducts.length - mappedProducts.length} à mapper`, icon: <Package size={20} />, color: 'var(--warning)' },
          { label: 'Dépôts Sartal', value: db.warehouses.length, sub: `${db.posList.length} POS avec dépôt`, icon: <Warehouse size={20} />, color: 'var(--success)' },
          { label: 'Recettes BOM', value: db.recipes.length, sub: `${recipesWithMissingIngredients.length} incomplètes`, icon: <Puzzle size={20} />, color: 'var(--purple)' }
        ].map(card => (
          <div key={card.label} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>{card.label}</span>
              <span style={{ color: card.color }}>{card.icon}</span>
            </div>
            <h2 style={{ marginTop: '10px' }}>{card.value}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitBranch size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>POS détectés dans les exports</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Code/Nom export</th>
                  <th>POS Sartal</th>
                  <th>Dépôt</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {discoveredPOS.map(item => {
                  const pos = db.posList.find(p => p.id === item.externalCode || p.name.toLowerCase() === item.externalCode.toLowerCase());
                  const warehouse = db.warehouses.find(w => w.id === pos?.defaultWarehouseId);
                  return (
                    <tr key={item.externalCode}>
                      <td style={{ fontWeight: 700 }}>{item.externalCode}</td>
                      <td>{pos?.name || 'Non relié'}</td>
                      <td>{warehouse?.name || 'Dépôt inconnu'}</td>
                      <td>{statusBadge(!!pos && !!warehouse)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Produits externes à rapprocher</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>SKU export</th>
                  <th>Libellé caisse</th>
                  <th>Produit Sartal</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {discoveredProducts.map(item => {
                  const alias = db.posProductAliases.find(mapping => mapping.externalSku.toLowerCase() === item.externalSku.toLowerCase());
                  const product = alias
                    ? db.products.find(p => p.id === alias.productId)
                    : db.products.find(p => p.sku.toLowerCase() === item.externalSku.toLowerCase());
                  return (
                    <tr key={item.externalSku}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.externalSku}</td>
                      <td>{item.label}</td>
                      <td>{product?.name || 'Suggestion requise'}</td>
                      <td>{statusBadge(!!product)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Puzzle size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Recettes qui expliquent le stock</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Produit vendu</th>
                  <th>Ingrédients</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {db.recipes.map(recipe => {
                  const product = db.products.find(p => p.id === recipe.productId);
                  const missing = recipe.ingredients.filter(ingredient => !db.products.some(p => p.id === ingredient.productId));
                  return (
                    <tr key={recipe.id}>
                      <td style={{ fontWeight: 700 }}>{product?.name || recipe.name}</td>
                      <td>{recipe.ingredients.length} ingrédient(s)</td>
                      <td>{statusBadge(missing.length === 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <AlertTriangle size={20} color="var(--warning)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Ce que cette page prouve</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              'On ne demande pas au gérant d’avoir déjà une organisation propre.',
              'On part des exports disponibles, même désordonnés.',
              'On détecte les POS, produits et recettes qui empêchent un audit fiable.',
              'On montre précisément ce qu’il faut relier avant de conclure sur les écarts.',
              'Une fois la cartographie prête, Audit Stock peut expliquer les pertes et incohérences.'
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <CheckCircle size={18} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setView('products')}>
              Corriger produits
            </button>
            <button className="btn btn-secondary" onClick={() => setView('warehouses')}>
              Corriger dépôts/POS
            </button>
            <button className="btn btn-primary" onClick={() => setView('stock-audit')}>
              Continuer <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MappingControl;
