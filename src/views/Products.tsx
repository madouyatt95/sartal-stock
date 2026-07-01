import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Plus, Settings, CircleDollarSign } from 'lucide-react';

interface ProductsProps {
  state: StockState;
}

export const Products: React.FC<ProductsProps> = ({ state }) => {
  const { db, addProduct, updateProductPricing, addRecipe } = state;
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  
  // Modals / forms state
  const [showAddProd, setShowAddProd] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '', sku: '', category: '', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 10
  });

  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{ productId: string; quantity: number; unit: string }>>([
    { productId: '', quantity: 1, unit: 'unité' }
  ]);

  const [pricingFields, setPricingFields] = useState<Record<string, { salePrice: number; taxRate: number }>>({});

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.sku) return;
    addProduct(newProd);
    setShowAddProd(false);
    setNewProd({ name: '', sku: '', category: '', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 10 });
  };

  const handleSavePricing = (prodId: string) => {
    Object.entries(pricingFields).forEach(([posId, pricing]) => {
      updateProductPricing(prodId, posId, pricing.salePrice, pricing.taxRate);
    });
    alert("Tarifs enregistrés !");
  };

  const handleAddRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const finalIngs = recipeIngredients.filter(i => i.productId && i.quantity > 0);
    if (finalIngs.length === 0) return;

    const prod = db.products.find(p => p.id === selectedProduct);
    addRecipe(selectedProduct, prod?.name || 'Recette', finalIngs);
    setShowAddRecipe(false);
    setRecipeIngredients([{ productId: '', quantity: 1, unit: 'unité' }]);
  };

  const selectedProdObj = db.products.find(p => p.id === selectedProduct);
  const selectedRecipe = db.recipes.find(r => r.productId === selectedProduct);

  const initPricingFields = (prodId: string) => {
    const fields: Record<string, { salePrice: number; taxRate: number }> = {};
    db.posList.forEach(pos => {
      const pricing = db.posPricing.find(p => p.productId === prodId && p.posId === pos.id);
      fields[pos.id] = {
        salePrice: pricing?.salePrice || 0,
        taxRate: pricing?.taxRate || 18
      };
    });
    setPricingFields(fields);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Catalogue Produits</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gérez vos articles, tarifs POS et fiches techniques (BOM)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddProd(true)}>
          <Plus size={18} /> Ajouter un produit
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }} className="grid-2">
        {/* Left Side: Product List */}
        <div className="card" style={{ flexGrow: 2, padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Liste des Articles</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>SKU</th>
                  <th>Catégorie</th>
                  <th>Unité</th>
                  <th>Type</th>
                  <th>Seuil Alerte</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {db.products.map(p => (
                    <tr 
                      key={p.id} 
                      style={{ cursor: 'pointer', backgroundColor: selectedProduct === p.id ? 'var(--primary-lightest)' : undefined }}
                      onClick={() => {
                        setSelectedProduct(p.id);
                        initPricingFields(p.id);
                      }}
                    >
                      <td style={{ fontWeight: 700 }}>{p.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{p.sku}</td>
                      <td>{p.category}</td>
                      <td>{p.baseUnit}</td>
                      <td>
                        <span className={`badge ${p.isStockable ? 'badge-green' : 'badge-purple'}`}>
                          {p.isStockable ? 'Stockable' : 'Recette / Service'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{p.globalAlertThreshold}</td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                          Détails
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Pricing / BOM config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedProdObj ? (
            <>
              {/* Product Info Summary Card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{selectedProdObj.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>SKU:</span>
                    <strong style={{ fontFamily: 'monospace' }}>{selectedProdObj.sku}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Catégorie:</span>
                    <strong>{selectedProdObj.category}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Unité de base:</span>
                    <strong>{selectedProdObj.baseUnit}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Méthode de sortie:</span>
                    <strong className="badge badge-blue">FIFO (Obligatoire)</strong>
                  </div>
                </div>
              </div>

              {/* Pricing Config Card */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <CircleDollarSign size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Tarifs et Dépôts par Point de Vente</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {db.posList.map(pos => {
                    const fieldVal = pricingFields[pos.id] || { salePrice: 0, taxRate: 18 };
                    return (
                      <div key={pos.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', padding: '10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ flexGrow: 1, minWidth: '120px' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{pos.name}</span>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dépôt de sortie : {db.warehouses.find(w => w.id === pos.defaultWarehouseId)?.name}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="number"
                            placeholder="Prix de vente"
                            value={fieldVal.salePrice || ''}
                            onChange={(e) => setPricingFields({
                              ...pricingFields,
                              [pos.id]: { ...fieldVal, salePrice: parseFloat(e.target.value) || 0 }
                            })}
                            className="form-control"
                            style={{ width: '100px', fontSize: '0.825rem', padding: '6px 10px' }}
                          />
                          <input 
                            type="number"
                            placeholder="TVA %"
                            value={fieldVal.taxRate || ''}
                            onChange={(e) => setPricingFields({
                              ...pricingFields,
                              [pos.id]: { ...fieldVal, taxRate: parseFloat(e.target.value) || 0 }
                            })}
                            className="form-control"
                            style={{ width: '60px', fontSize: '0.825rem', padding: '6px 10px' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleSavePricing(selectedProdObj.id)}
                    style={{ marginTop: '8px' }}
                  >
                    Enregistrer les prix
                  </button>
                </div>
              </div>

              {/* Recipe / BOM Card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={20} color="var(--purple)" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Fiche Technique / Recette (BOM)</h3>
                  </div>
                  {!selectedRecipe && (
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setShowAddRecipe(true)}>
                      Créer
                    </button>
                  )}
                </div>
                {selectedRecipe ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ingrédients nécessaires pour faire 1 {selectedProdObj.baseUnit} de produit fini :</p>
                    <table className="custom-table" style={{ fontSize: '0.825rem' }}>
                      <thead>
                        <tr>
                          <th>Ingrédient</th>
                          <th>Qté</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRecipe.ingredients.map(ing => {
                          const ingProd = db.products.find(p => p.id === ing.productId);
                          return (
                            <tr key={ing.productId}>
                              <td style={{ fontWeight: 600 }}>{ingProd?.name}</td>
                              <td>{ing.quantity} {ing.unit}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Aucune recette associée. Ce produit sera déduit directement en cas de vente.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Sélectionnez un produit pour configurer ses prix et sa recette (BOM).
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal Overlay */}
      {showAddProd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Nouveau Produit</h3>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nom du produit</label>
                <input 
                  type="text" 
                  value={newProd.name} 
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} 
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">SKU (Code Unique)</label>
                <input 
                  type="text" 
                  value={newProd.sku} 
                  onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })} 
                  className="form-control"
                  required
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Catégorie</label>
                  <input 
                    type="text" 
                    value={newProd.category} 
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })} 
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unité de base</label>
                  <input 
                    type="text" 
                    value={newProd.baseUnit} 
                    onChange={(e) => setNewProd({ ...newProd, baseUnit: e.target.value })} 
                    className="form-control"
                    required
                  />
                </div>
              </div>
              <div className="grid-2" style={{ alignItems: 'center' }}>
                <div className="form-group">
                  <label className="form-label">Stockable ?</label>
                  <select 
                    value={newProd.isStockable ? 'yes' : 'no'}
                    onChange={(e) => setNewProd({ ...newProd, isStockable: e.target.value === 'yes' })}
                    className="form-control"
                  >
                    <option value="yes">Oui (Gère les stocks)</option>
                    <option value="no">Non (Recette / Plat préparé)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Seuil d'alerte global</label>
                  <input 
                    type="number" 
                    value={newProd.globalAlertThreshold} 
                    onChange={(e) => setNewProd({ ...newProd, globalAlertThreshold: parseInt(e.target.value) || 0 })} 
                    className="form-control"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProd(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer le produit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Recipe Modal Overlay */}
      {showAddRecipe && selectedProdObj && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '550px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Créer la recette de "{selectedProdObj.name}"</h3>
            <form onSubmit={handleAddRecipe} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recipeIngredients.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select 
                      value={item.productId}
                      onChange={(e) => {
                        const newIngs = [...recipeIngredients];
                        const targetProd = db.products.find(p => p.id === e.target.value);
                        newIngs[idx].productId = e.target.value;
                        newIngs[idx].unit = targetProd?.baseUnit || 'unité';
                        setRecipeIngredients(newIngs);
                      }}
                      className="form-control"
                      style={{ flexGrow: 1 }}
                      required
                    >
                      <option value="">Sélectionner un ingrédient</option>
                      {db.products.filter(p => p.isStockable).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.baseUnit})</option>
                      ))}
                    </select>
                    <input 
                      type="number"
                      placeholder="Quantité"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const newIngs = [...recipeIngredients];
                        newIngs[idx].quantity = parseFloat(e.target.value) || 0;
                        setRecipeIngredients(newIngs);
                      }}
                      className="form-control"
                      style={{ width: '80px' }}
                      required
                    />
                    <span style={{ fontSize: '0.875rem', width: '50px', color: 'var(--text-secondary)' }}>{item.unit}</span>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      style={{ padding: '6px 10px' }}
                      onClick={() => setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx))}
                    >
                      Suppr.
                    </button>
                  </div>
                ))}
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setRecipeIngredients([...recipeIngredients, { productId: '', quantity: 1, unit: 'unité' }])}
              >
                + Ajouter un ingrédient
              </button>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRecipe(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer la recette</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Products;
