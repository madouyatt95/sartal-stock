import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Filter, Pencil, Plus, Search, Settings, Trash2 } from 'lucide-react';
import type { RestaurantProductionStation, RestaurantServiceCourse } from '../types';
import {
  inferRestaurantProductRouting,
  RESTAURANT_COURSE_LABELS,
  RESTAURANT_STATION_LABELS
} from '../utils/restaurantRouting';

interface ProductsProps {
  state: StockState;
}

const createProductDraft = () => ({
  name: '',
  sku: '',
  category: 'Boissons',
  baseUnit: 'unité',
  isStockable: true,
  globalAlertThreshold: 10,
  restaurantStation: 'drinks' as RestaurantProductionStation,
  restaurantCourse: 'drinks' as RestaurantServiceCourse,
  preparationMinutes: 4
});

export const Products: React.FC<ProductsProps> = ({ state }) => {
  const { db, addProduct, updateProduct, deleteProduct, addRecipe } = state;
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [recipeFilter, setRecipeFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const productCategories = Array.from(new Set([
    'Boissons',
    'Boissons premium',
    'Alimentation',
    'Boulangerie',
    'Produits frais',
    'Plats',
    'Desserts',
    'Snacking',
    'Épicerie',
    'Hygiène',
    'Mocktails',
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
  const [newProd, setNewProd] = useState(createProductDraft);

  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{ productId: string; quantity: number; unit: string }>>([
    { productId: '', quantity: 1, unit: 'unité' }
  ]);

  const getProductStock = (productId: string) => {
    return db.stocks
      .filter(stock => stock.productId === productId)
      .reduce((total, stock) => ({
        available: total.available + stock.quantityAvailable,
        reserved: total.reserved + stock.quantityReserved
      }), { available: 0, reserved: 0 });
  };

  const getRecipeCost = (productId: string) => {
    const recipe = db.recipes.find(item => item.productId === productId);
    if (!recipe) return null;
    return recipe.ingredients.reduce((total, ingredient) => {
      const stock = db.stocks.find(item => item.productId === ingredient.productId);
      return total + (stock?.averageCost || 0) * ingredient.quantity;
    }, 0);
  };

  const filteredProducts = db.products
    .filter(product => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const hasRecipe = db.recipes.some(recipe => recipe.productId === product.id);
      const stock = getProductStock(product.id);
      const matchesSearch = !normalizedSearch
        || product.name.toLowerCase().includes(normalizedSearch)
        || product.sku.toLowerCase().includes(normalizedSearch)
        || product.category.toLowerCase().includes(normalizedSearch);
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesType = typeFilter === 'all'
        || (typeFilter === 'stockable' && product.isStockable)
        || (typeFilter === 'prepared' && !product.isStockable);
      const matchesRecipe = recipeFilter === 'all'
        || (recipeFilter === 'with_recipe' && hasRecipe)
        || (recipeFilter === 'without_recipe' && !hasRecipe);
      const matchesStock = stockFilter === 'all'
        || (stockFilter === 'low' && product.isStockable && stock.available <= product.globalAlertThreshold)
        || (stockFilter === 'reserved' && stock.reserved > 0)
        || (stockFilter === 'inactive' && !product.isActive);

      return matchesSearch && matchesCategory && matchesType && matchesRecipe && matchesStock;
    })
    .sort((a, b) => {
      if (sortBy === 'category') return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      if (sortBy === 'stock') return getProductStock(b.id).available - getProductStock(a.id).available;
      if (sortBy === 'alert') return a.globalAlertThreshold - b.globalAlertThreshold;
      return a.name.localeCompare(b.name);
    });

  const filteredIngredients = db.products.filter(product => {
    if (!product.isStockable) return false;
    const normalizedSearch = ingredientSearch.trim().toLowerCase();
    return !normalizedSearch
      || product.name.toLowerCase().includes(normalizedSearch)
      || product.sku.toLowerCase().includes(normalizedSearch)
      || product.category.toLowerCase().includes(normalizedSearch);
  });

  const productsWithRecipes = db.products.filter(product => db.recipes.some(recipe => recipe.productId === product.id)).length;
  const lowStockProducts = db.products.filter(product => {
    const stock = getProductStock(product.id);
    return product.isStockable && stock.available <= product.globalAlertThreshold;
  }).length;

  const resetProductForm = () => {
    setShowAddProd(false);
    setEditingProductId(null);
    setNewProd(createProductDraft());
  };

  const openEditProduct = (productId: string) => {
    const product = db.products.find(item => item.id === productId);
    if (!product) return;
    const routing = inferRestaurantProductRouting(product);
    setEditingProductId(productId);
    setNewProd({
      name: product.name,
      sku: product.sku,
      category: product.category,
      baseUnit: product.baseUnit,
      isStockable: product.isStockable,
      globalAlertThreshold: product.globalAlertThreshold,
      restaurantStation: routing.station,
      restaurantCourse: routing.course,
      preparationMinutes: routing.preparationMinutes
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
  const selectedStock = selectedProduct ? getProductStock(selectedProduct) : null;
  const selectedRecipeCost = selectedProduct ? getRecipeCost(selectedProduct) : null;

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Produits & recettes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gérez vos articles, unités, seuils et recettes de préparation</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingProductId(null);
          setNewProd(createProductDraft());
          setShowAddProd(true);
        }}>
          <Plus size={18} /> Ajouter un produit
        </button>
      </div>

      <div className="grid-4">
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Catalogue</p>
          <strong style={{ fontSize: '1.45rem' }}>{db.products.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{filteredProducts.length} affichés</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Recettes</p>
          <strong style={{ fontSize: '1.45rem' }}>{productsWithRecipes}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>produits composés</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Alertes</p>
          <strong style={{ fontSize: '1.45rem' }}>{lowStockProducts}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>sous seuil global</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Catégories</p>
          <strong style={{ fontSize: '1.45rem' }}>{productCategories.length}</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>nomenclature uniforme</p>
        </div>
      </div>

      <div className="card product-filter-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Recherche et filtres</h3>
        </div>
        <div className="mobile-filter-grid product-filter-grid">
          <div className="form-group">
            <label className="form-label">Rechercher</label>
            <div className="input-with-icon">
              <Search size={16} />
              <input
                type="search"
                className="form-control"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nom, code article, catégorie"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Catégorie</label>
            <select className="form-control" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">Toutes</option>
              {productCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-control" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">Tous</option>
              <option value="stockable">Stockable</option>
              <option value="prepared">Recette / service</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Recette</label>
            <select className="form-control" value={recipeFilter} onChange={(event) => setRecipeFilter(event.target.value)}>
              <option value="all">Toutes</option>
              <option value="with_recipe">Avec recette</option>
              <option value="without_recipe">Sans recette</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Stock</label>
            <select className="form-control" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
              <option value="all">Tous</option>
              <option value="low">Sous seuil</option>
              <option value="reserved">Réservé</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tri</label>
            <select className="form-control" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="name">Nom</option>
              <option value="category">Catégorie</option>
              <option value="stock">Stock disponible</option>
              <option value="alert">Seuil d'alerte</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }} className="grid-2">
        {/* Left Side: Product List */}
        <div className="card" style={{ flexGrow: 2, padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Liste des articles</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} selon les filtres actifs.
            </p>
          </div>
          <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code article</th>
                  <th>Catégorie</th>
                  <th>Unité</th>
                  <th>Type</th>
                  <th>Poste restaurant</th>
                  <th>Seuil Alerte</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const stock = getProductStock(p.id);
                  const hasRecipe = db.recipes.some(recipe => recipe.productId === p.id);
                  return (
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
                      <td><span className="badge badge-blue">{RESTAURANT_STATION_LABELS[inferRestaurantProductRouting(p).station]}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        {p.globalAlertThreshold}
                        {hasRecipe && <span className="badge badge-blue" style={{ marginLeft: '8px' }}>Recette</span>}
                        {stock.available <= p.globalAlertThreshold && p.isStockable && <span className="badge badge-yellow" style={{ marginLeft: '8px' }}>Bas</span>}
                      </td>
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
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Aucun produit ne correspond aux filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {filteredProducts.map(p => {
              const stock = getProductStock(p.id);
              const hasRecipe = db.recipes.some(recipe => recipe.productId === p.id);
              const recipeCost = getRecipeCost(p.id);
              return (
              <div
                key={p.id}
                className={`mobile-data-card ${selectedProduct === p.id ? 'is-selected' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedProduct(p.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setSelectedProduct(p.id);
                }}
              >
                <div className="mobile-data-header">
                  <div>
                    <div className="mobile-data-title">{p.name}</div>
                    <div className="mobile-data-subtitle">{p.sku} • {p.category}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={`badge ${p.isStockable ? 'badge-green' : 'badge-purple'}`}>
                      {p.isStockable ? 'Stockable' : 'Recette'}
                    </span>
                    {hasRecipe && <span className="badge badge-blue">Fiche recette</span>}
                    {p.isStockable && stock.available <= p.globalAlertThreshold && <span className="badge badge-yellow">Alerte</span>}
                  </div>
                </div>
                <div className="mobile-data-row">
                  <span>Unité</span>
                  <strong>{p.baseUnit}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Disponible / réservé</span>
                  <strong>{stock.available} / {stock.reserved}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Seuil d'alerte</span>
                  <strong>{p.globalAlertThreshold}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Préparation restaurant</span>
                  <strong>{RESTAURANT_STATION_LABELS[inferRestaurantProductRouting(p).station]} · {inferRestaurantProductRouting(p).preparationMinutes} min</strong>
                </div>
                {recipeCost !== null && (
                  <div className="mobile-data-row">
                    <span>Coût recette estimé</span>
                    <strong>{Math.round(recipeCost).toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                )}
                <div className="mobile-card-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditProduct(p.id);
                    }}
                  >
                    <Pencil size={14} /> Modifier
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteProduct(p.id);
                    }}
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="mobile-empty-state">
                Aucun produit ne correspond aux filtres. Ajustez la recherche ou réinitialisez les critères.
              </div>
            )}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Routage restaurant:</span>
                    <strong>{RESTAURANT_STATION_LABELS[inferRestaurantProductRouting(selectedProdObj).station]} · {RESTAURANT_COURSE_LABELS[inferRestaurantProductRouting(selectedProdObj).course]} · {inferRestaurantProductRouting(selectedProdObj).preparationMinutes} min</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Disponible / réservé:</span>
                    <strong>{selectedStock?.available || 0} / {selectedStock?.reserved || 0}</strong>
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
                    {selectedRecipeCost !== null && (
                      <div className="badge badge-secondary" style={{ width: 'fit-content' }}>
                        Coût matière estimé : {Math.round(selectedRecipeCost).toLocaleString('fr-FR')} FCFA
                      </div>
                    )}
                    <table className="custom-table compact-table" style={{ fontSize: '0.825rem' }}>
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
              <fieldset className="product-routing-fields">
                <legend>Routage restaurant et KDS</legend>
                <p>Ce réglage détermine exactement l’écran qui reçoit l’article après l’envoi par la salle.</p>
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Poste de préparation</label>
                    <select className="form-control" value={newProd.restaurantStation} onChange={(event) => setNewProd({ ...newProd, restaurantStation: event.target.value as RestaurantProductionStation })}>
                      {(Object.entries(RESTAURANT_STATION_LABELS) as Array<[RestaurantProductionStation, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service par défaut</label>
                    <select className="form-control" value={newProd.restaurantCourse} onChange={(event) => setNewProd({ ...newProd, restaurantCourse: event.target.value as RestaurantServiceCourse })}>
                      {(Object.entries(RESTAURANT_COURSE_LABELS) as Array<[RestaurantServiceCourse, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temps cible</label>
                    <input className="form-control" type="number" min="1" max="180" value={newProd.preparationMinutes} onChange={(event) => setNewProd({ ...newProd, preparationMinutes: Math.max(1, Number(event.target.value) || 1) })} />
                  </div>
                </div>
              </fieldset>
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
              <div className="form-group">
                <label className="form-label">Filtrer les ingrédients</label>
                <div className="input-with-icon">
                  <Search size={16} />
                  <input
                    type="search"
                    value={ingredientSearch}
                    onChange={(event) => setIngredientSearch(event.target.value)}
                    className="form-control"
                    placeholder="Nom, code ou catégorie"
                  />
                </div>
              </div>
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
                      {filteredIngredients.map(p => (
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
