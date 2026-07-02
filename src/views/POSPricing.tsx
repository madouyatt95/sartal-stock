import React, { useMemo, useState } from 'react';
import { CircleDollarSign, Save, Store, Warehouse } from 'lucide-react';
import { StockState } from '../hooks/useStockState';

interface POSPricingProps {
  state: StockState;
}

export const POSPricing: React.FC<POSPricingProps> = ({ state }) => {
  const { db, updateProductPricing } = state;
  const [selectedProductId, setSelectedProductId] = useState('prod-coca');
  const [pricingFields, setPricingFields] = useState<Record<string, { salePrice: number; taxRate: number }>>({});

  const productsWithPricing = useMemo(() => {
    return db.products
      .filter(product => product.isActive)
      .map(product => {
        const prices = db.posList.map(pos => {
          const pricing = db.posPricing.find(item => item.productId === product.id && item.posId === pos.id);
          const warehouse = db.warehouses.find(item => item.id === (pricing?.defaultWarehouseId || pos.defaultWarehouseId));
          return { pos, pricing, warehouse };
        });
        const activePrices = prices.filter(item => item.pricing?.isAvailable);
        const uniquePrices = new Set(activePrices.map(item => item.pricing?.salePrice || 0));
        return { product, prices, activePrices, hasMultiPrice: uniquePrices.size > 1 };
      });
  }, [db.posList, db.posPricing, db.products, db.warehouses]);

  const selectedProduct = db.products.find(product => product.id === selectedProductId) || db.products[0];
  const selectedRows = db.posList.map(pos => {
    const pricing = db.posPricing.find(item => item.productId === selectedProduct?.id && item.posId === pos.id);
    const warehouse = db.warehouses.find(item => item.id === (pricing?.defaultWarehouseId || pos.defaultWarehouseId));
    const field = pricingFields[pos.id] || {
      salePrice: pricing?.salePrice || 0,
      taxRate: pricing?.taxRate || 18
    };
    return { pos, pricing, warehouse, field };
  });

  const formatFCFA = (value: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
  );

  const loadProduct = (productId: string) => {
    const fields: Record<string, { salePrice: number; taxRate: number }> = {};
    db.posList.forEach(pos => {
      const pricing = db.posPricing.find(item => item.productId === productId && item.posId === pos.id);
      fields[pos.id] = {
        salePrice: pricing?.salePrice || 0,
        taxRate: pricing?.taxRate || 18
      };
    });
    setSelectedProductId(productId);
    setPricingFields(fields);
  };

  const savePricing = () => {
    if (!selectedProduct) return;
    selectedRows.forEach(row => {
      if (row.field.salePrice > 0) {
        updateProductPricing(selectedProduct.id, row.pos.id, row.field.salePrice, row.field.taxRate);
      }
    });
  };

  const configuredPrices = db.posPricing.filter(item => item.isAvailable).length;
  const multiPriceCount = productsWithPricing.filter(item => item.hasMultiPrice).length;

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Prix par point de vente</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Un produit unique peut avoir un prix, une TVA et un dépôt de sortie différent selon le restaurant, le bar ou le night-club.
          </p>
        </div>
        <button className="btn btn-primary" onClick={savePricing}>
          <Save size={18} /> Enregistrer les prix
        </button>
      </div>

      <div className="grid-3">
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Points de vente</p>
          <h2 style={{ marginTop: '8px' }}>{db.posList.length}</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Règles tarifaires</p>
          <h2 style={{ marginTop: '8px' }}>{configuredPrices}</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Produits multi-prix</p>
          <h2 style={{ marginTop: '8px' }}>{multiPriceCount}</h2>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CircleDollarSign size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Matrice prix / dépôts</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  {db.posList.map(pos => <th key={pos.id}>{pos.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {productsWithPricing.map(row => (
                  <tr key={row.product.id} style={{ cursor: 'pointer' }} onClick={() => loadProduct(row.product.id)}>
                    <td style={{ fontWeight: 800 }}>{row.product.name}</td>
                    <td>{row.product.category}</td>
                    {row.prices.map(price => (
                      <td key={price.pos.id}>
                        {price.pricing ? (
                          <div style={{ display: 'grid', gap: '4px' }}>
                            <strong>{formatFCFA(price.pricing.salePrice)}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{price.warehouse?.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Non vendu</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{selectedProduct?.name || 'Produit'}</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}>
              Réglez le prix par POS. Le dépôt affiché vient du point de vente ou d'une règle spécifique produit/POS.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Produit à configurer</label>
            <select className="form-control" value={selectedProductId} onChange={(event) => loadProduct(event.target.value)}>
              {db.products.filter(product => product.isActive).map(product => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {selectedRows.map(row => (
              <div key={row.pos.id} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Store size={16} color="var(--primary)" /> {row.pos.name}
                    </strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                      <Warehouse size={14} /> {row.warehouse?.name}
                    </span>
                  </div>
                  <span className="badge badge-blue">{row.pricing?.isAvailable ? 'Actif' : 'À configurer'}</span>
                </div>
                <div className="grid-2" style={{ gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Prix FCFA</label>
                    <input
                      className="form-control"
                      type="number"
                      value={row.field.salePrice || ''}
                      onChange={(event) => setPricingFields({
                        ...pricingFields,
                        [row.pos.id]: { ...row.field, salePrice: Number(event.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">TVA %</label>
                    <input
                      className="form-control"
                      type="number"
                      value={row.field.taxRate || ''}
                      onChange={(event) => setPricingFields({
                        ...pricingFields,
                        [row.pos.id]: { ...row.field, taxRate: Number(event.target.value) || 0 }
                      })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={savePricing}>
            <Save size={18} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSPricing;
