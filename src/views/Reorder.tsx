import React from 'react';
import { StockState } from '../hooks/useStockState';
import { AlertTriangle, ShoppingCart } from 'lucide-react';

interface ReorderProps {
  state: StockState;
  setView: (view: string) => void;
}

export const Reorder: React.FC<ReorderProps> = ({ state, setView }) => {
  const { db, createSupplierOrder } = state;

  // Formatter FCFA
  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA');
  };

  // Find products below threshold
  const reorderSuggestions = db.products
    .filter(p => p.isStockable)
    .map(p => {
      const currentStock = db.stocks
        .filter(s => s.productId === p.id)
        .reduce((sum, s) => sum + s.quantityAvailable, 0);

      const isBelow = currentStock < p.globalAlertThreshold;
      const suggestQty = isBelow ? (p.globalAlertThreshold * 2) - currentStock : 0;
      
      // Try to estimate purchase price based on last batches
      const productBatches = db.batches.filter(b => b.productId === p.id);
      const lastPrice = productBatches.length > 0 ? productBatches[productBatches.length - 1].purchaseCost : 400;

      // Assign default supplier if none
      const supplierId = p.mainSupplierId || (p.category === 'Boissons' ? 'sup-drinks' : 'sup-market');
      const supplierObj = db.suppliers.find(s => s.id === supplierId);

      return {
        product: p,
        currentStock,
        threshold: p.globalAlertThreshold,
        isBelow,
        suggestQty,
        lastPrice,
        supplierId,
        supplierName: supplierObj?.name || 'Inconnu'
      };
    })
    .filter(item => item.isBelow);

  const handleCreateSuggestedOrder = (item: typeof reorderSuggestions[0]) => {
    createSupplierOrder(item.supplierId, [
      {
        productId: item.product.id,
        quantityOrdered: item.suggestQty,
        purchasePrice: item.lastPrice,
        unit: item.product.baseUnit
      }
    ]);
    alert(`Bon de commande généré pour ${item.supplierName} avec succès !`);
    setView('purchases');
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>À commander</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Réapprovisionnez intelligemment. Le système détecte les articles sous le seuil critique et propose des quantités de réapprovisionnement.
        </p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} color="var(--warning)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Suggestions actives</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Code article</th>
                <th>Stock Actuel</th>
                <th>Seuil d'Alerte</th>
                <th>Fournisseur Suggéré</th>
                <th>Dernier Prix</th>
                <th>Quantité Recommandée</th>
                <th>Coût Estimé</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reorderSuggestions.map(item => (
                <tr key={item.product.id}>
                  <td style={{ fontWeight: 700 }}>{item.product.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{item.product.sku}</td>
                  <td style={{ fontWeight: 800, color: item.currentStock === 0 ? 'var(--danger)' : 'var(--warning)' }}>
                    {item.currentStock} {item.product.baseUnit}
                  </td>
                  <td>{item.threshold} {item.product.baseUnit}</td>
                  <td style={{ fontWeight: 600 }}>{item.supplierName}</td>
                  <td>{formatFCFA(item.lastPrice)}</td>
                  <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                    {item.suggestQty} {item.product.baseUnit}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {formatFCFA(item.suggestQty * item.lastPrice)}
                  </td>
                  <td>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleCreateSuggestedOrder(item)}
                      style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }}
                    >
                      <ShoppingCart size={14} /> Commander
                    </button>
                  </td>
                </tr>
              ))}
              {reorderSuggestions.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    Aucun produit sous le seuil d'alerte. Vos niveaux de stock sont optimaux.
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
export default Reorder;
