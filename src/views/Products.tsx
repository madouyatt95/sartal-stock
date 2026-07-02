import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Pencil, Plus, Settings, Trash2 } from 'lucide-react';

interface ProductsProps {
  state: StockState;
}

export const Products: React.FC<ProductsProps> = ({ state }) => {
  const { db, addProduct, updateProduct, deleteProduct, addRecipe } = state;
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const productCategories = Array.from(new Set([
    'Boissons',
    'Boissons premium',
    'Alimentation',
    'Plats',
    'Cocktails',
    'Services',
    ...db.products.map(product => product.category).filter(Boolean)
  ]));
  const productUnits = Array.from(new Set([
    'unité',
    'bouteille',
    'verre',
    'portion',
    'ml',
    'g',
    'kg',
    'litre',
    'tranche',
    'carton',
    ...db.products.map(product => product.baseUnit).filter(Boolean)
  ]));
  
  // Modals / forms state
  const [showAddProd, setShowAddProd] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProd, setNewProd] = useState({
    name: '', sku: '', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 10
  });

  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{ productId: string; quantity: number; unit: string }>>([
    { productId: '', quantity: 1, unit: 'unité' }
  ]);

  const resetProductForm = () => {
    setShowAddProd(false);
    setEditingProductId(null);
    setNewProd({ name: '', sku: '', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 10 });
  };

  const openEditProduct = (productId: string) => {
    const product = db.products.find(item => item.id === productId);
    if (!product) return;
    setEditingProductId(productId);
    setNewProd({
      name: product.name,
      sku: product.sku,
      category: product.category,
      baseUnit: product.baseUnit,
      isStockable: product.isStockable,
      globalAlertThreshold: product.globalAlertThreshold
    });
    setShowAddProd(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.sku) return;
    const duplicateSku = db.products.some(product => (
      product.id !== editingProductId && product.sku.toLowerCase() === newProd.sku.trim().toLowerCase()
    ));
    if (duplicateSku) {
      alert("Ce code article est déjà utilisé par un autre produit.");
      return;
    }
    const normalizedProduct = { ...newProd, name: newProd.name.trim(), sku: newProd.sku.trim().toUpperCase() };
    if (editingProductId) {
      updateProduct(editingProductId, normalizedProduct);
    } else {
      addProduct(normalizedProduct);
    }
    resetProductForm();
  };

  const handleDeleteProduct = (productId: string) => {
    const product = db.products.find(item => item.id === productId);
    if (!product) return;
    if (!window.confirm(`Supprimer "${product.name}" et ses règles associées ?`)) return;
    deleteProduct(productId);
    if (selectedProduct === productId) setSelectedProduct(null);
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

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Produits & recettes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gérez vos articles, unités, seuils et recettes de préparation</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingProductId(null);
          setNewProd({ name: '', sku: '', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 10 });
          setShowAddProd(true);
        }}>
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
                  <th>Code article</th>
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
                        <div className="entity-row-actions">
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditProduct(p.id);
                            }}
                          >
                            <Pencil size={14} /> Modifier
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteProduct(p.id);
                            }}
                          >
                            <Trash2 size={14} /> Suppr.
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: recipe config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedProdObj ? (
            <>
              {/* Product Info Summary Card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{selectedProdObj.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Code article :</span>
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
                    <strong className="badge badge-blue">Lots les plus anciens utilisés en premier</strong>
                  </div>
                </div>
              </div>

              {/* Recipe card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={20} color="var(--purple)" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Fiche recette</h3>
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
              Sélectionnez un produit pour configurer sa recette.
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal Overlay */}
      {showAddProd && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{editingProductId ? 'Modifier le produit' : 'Nouveau produit'}</h3>
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                <label className="form-label">Code article</label>
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
                  <select
                    value={newProd.category} 
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })} 
                    className="form-control"
                    required
                  >
                    {productCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unité de base</label>
                  <select
                    value={newProd.baseUnit} 
                    onChange={(e) => setNewProd({ ...newProd, baseUnit: e.target.value })} 
                    className="form-control"
                    required
                  >
                    {productUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
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
                    min="0"
                    value={newProd.globalAlertThreshold} 
                    onChange={(e) => setNewProd({ ...newProd, globalAlertThreshold: parseInt(e.target.value) || 0 })} 
                    className="form-control"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetProductForm}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editingProductId ? 'Enregistrer' : 'Créer le produit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Recipe Modal Overlay */}
      {showAddRecipe && selectedProdObj && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Créer la recette de "{selectedProdObj.name}"</h3>
            <form onSubmit={handleAddRecipe} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recipeIngredients.map((item, idx) => (
                  <div key={idx} className="modal-line">
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
                      min="0.01"
                      step="any"
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
              <div className="modal-actions">
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
