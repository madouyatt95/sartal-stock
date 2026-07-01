import {
  Company,
  Site,
  POS,
  Warehouse,
  Product,
  POSPricing,
  Stock,
  Batch,
  StockMovement,
  Recipe,
  UnitConversion,
  Supplier,
  SupplierOrder,
  Transfer,
  Inventory,
  Loss,
  ExternalSale,
  CashSession,
  User
} from './types';

export interface DatabaseState {
  companies: Company[];
  sites: Site[];
  posList: POS[];
  warehouses: Warehouse[];
  products: Product[];
  posPricing: POSPricing[];
  stocks: Stock[];
  batches: Batch[];
  movements: StockMovement[];
  recipes: Recipe[];
  conversions: UnitConversion[];
  suppliers: Supplier[];
  supplierOrders: SupplierOrder[];
  transfers: Transfer[];
  inventories: Inventory[];
  losses: Loss[];
  externalSales: ExternalSale[];
  cashSessions: CashSession[];
  users: User[];
  currentUser: User;
}

const DB_KEY = 'sartal_stock_db';

const initialDB = (): DatabaseState => {
  const companies: Company[] = [
    { id: 'comp-1', name: 'Sártal Demo Hospitality' }
  ];

  const sites: Site[] = [
    { id: 'site-1', companyId: 'comp-1', name: 'Complexe Hôtelier Dakar' }
  ];

  const warehouses: Warehouse[] = [
    { id: 'wh-restaurant', siteId: 'site-1', name: 'Dépôt Restaurant', isColdStorage: false },
    { id: 'wh-bar-casino', siteId: 'site-1', name: 'Dépôt Bar Casino', isColdStorage: false },
    { id: 'wh-nightclub', siteId: 'site-1', name: 'Dépôt Night Club', isColdStorage: false },
    { id: 'wh-central', siteId: 'site-1', name: 'Dépôt Central', isColdStorage: false },
    { id: 'wh-cold', siteId: 'site-1', name: 'Chambre Froide', isColdStorage: true },
    { id: 'wh-cave', siteId: 'site-1', name: 'Cave', isColdStorage: false }
  ];

  const posList: POS[] = [
    { id: 'pos-1', siteId: 'site-1', name: 'Restaurant Le Jardin', type: 'restaurant', defaultWarehouseId: 'wh-restaurant', authorizedRoles: ['admin', 'director', 'pos_manager'] },
    { id: 'pos-2', siteId: 'site-1', name: 'Bar des Machines à Sous', type: 'casino', defaultWarehouseId: 'wh-bar-casino', authorizedRoles: ['admin', 'director', 'pos_manager'] },
    { id: 'pos-3', siteId: 'site-1', name: 'Night Club', type: 'night_club', defaultWarehouseId: 'wh-nightclub', authorizedRoles: ['admin', 'director', 'pos_manager'] },
    { id: 'pos-4', siteId: 'site-1', name: 'Room Service', type: 'room_service', defaultWarehouseId: 'wh-central', authorizedRoles: ['admin', 'director', 'pos_manager'] }
  ];

  const products: Product[] = [
    { id: 'prod-coca', name: 'Coca-Cola 33 cl', sku: 'COCA33', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 50, isActive: true },
    { id: 'prod-heineken', name: 'Heineken 33 cl', sku: 'HEIN33', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 40, isActive: true },
    { id: 'prod-steak', name: 'Steak de Boeuf', sku: 'STEAK', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-pdt', name: 'Pommes de terre', sku: 'PDT', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 50000, isActive: true },
    { id: 'prod-huile', name: 'Huile', sku: 'HUILE', category: 'Alimentation', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 10000, isActive: true },
    { id: 'prod-sel', name: 'Sel', sku: 'SEL', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 1000, isActive: true },
    { id: 'prod-steak-frites', name: 'Steak Frites', sku: 'STEAKFRITES', category: 'Plats', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-creme', name: 'Crème liquide 1L', sku: 'CREM1L', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 10, isActive: true }
  ];

  const posPricing: POSPricing[] = [
    // Coca-Cola pricing
    { productId: 'prod-coca', posId: 'pos-1', salePrice: 1500, taxRate: 18, isAvailable: true },
    { productId: 'prod-coca', posId: 'pos-2', salePrice: 2000, taxRate: 18, isAvailable: true },
    { productId: 'prod-coca', posId: 'pos-3', salePrice: 2500, taxRate: 18, isAvailable: true },
    { productId: 'prod-coca', posId: 'pos-4', salePrice: 2000, taxRate: 18, isAvailable: true },
    // Heineken pricing
    { productId: 'prod-heineken', posId: 'pos-1', salePrice: 2500, taxRate: 18, isAvailable: true },
    { productId: 'prod-heineken', posId: 'pos-2', salePrice: 3000, taxRate: 18, isAvailable: true },
    { productId: 'prod-heineken', posId: 'pos-3', salePrice: 3500, taxRate: 18, isAvailable: true },
    // Steak Frites pricing
    { productId: 'prod-steak-frites', posId: 'pos-1', salePrice: 6500, taxRate: 18, isAvailable: true },
    { productId: 'prod-steak-frites', posId: 'pos-4', salePrice: 7000, taxRate: 18, isAvailable: true }
  ];

  const suppliers: Supplier[] = [
    { id: 'sup-drinks', name: 'Soberka Boissons', contact: 'Mamadou Diallo', phone: '+221 33 821 44 55', email: 'contact@soberka.sn' },
    { id: 'sup-market', name: 'Marché Kermel Fruits & Viandes', contact: 'Fatou Sow', phone: '+221 77 645 12 89', email: 'fatousow@kermel.sn' }
  ];

  const conversions: UnitConversion[] = [
    { id: 'conv-coca-carton', productId: 'prod-coca', fromUnit: 'carton-24', toUnit: 'unité', factor: 24 },
    { id: 'conv-heineken-carton', productId: 'prod-heineken', fromUnit: 'carton-24', toUnit: 'unité', factor: 24 },
    { id: 'conv-pdt-sac', productId: 'prod-pdt', fromUnit: 'sac-10kg', toUnit: 'g', factor: 10000 }
  ];

  const recipes: Recipe[] = [
    {
      id: 'rec-steak-frites',
      productId: 'prod-steak-frites',
      name: 'Steak Frites',
      ingredients: [
        { productId: 'prod-steak', quantity: 1, unit: 'unité' },
        { productId: 'prod-pdt', quantity: 200, unit: 'g' },
        { productId: 'prod-huile', quantity: 20, unit: 'ml' },
        { productId: 'prod-sel', quantity: 2, unit: 'g' }
      ]
    }
  ];

  // Batches (Seed data with date of creation 1 month ago)
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const dateStr = oneMonthAgo.toISOString();

  const batches: Batch[] = [
    // Coca-Cola in Restaurant: 100 units
    { id: 'lot-coca-rest-1', productId: 'prod-coca', warehouseId: 'wh-restaurant', batchNumber: 'LOT-COCA-REST-01', expiryDate: '2026-10-31', quantity: 100, initialQuantity: 100, supplierId: 'sup-drinks', purchaseCost: 400, createdAt: dateStr },
    // Coca-Cola in Bar Casino: 150 units
    { id: 'lot-coca-cas-1', productId: 'prod-coca', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-COCA-CAS-01', expiryDate: '2026-09-30', quantity: 150, initialQuantity: 150, supplierId: 'sup-drinks', purchaseCost: 400, createdAt: dateStr },
    // Coca-Cola in Night Club: 80 units
    { id: 'lot-coca-nc-1', productId: 'prod-coca', warehouseId: 'wh-nightclub', batchNumber: 'LOT-COCA-NC-01', expiryDate: '2026-08-15', quantity: 80, initialQuantity: 80, supplierId: 'sup-drinks', purchaseCost: 400, createdAt: dateStr },
    // Coca-Cola in Central: 500 units
    { id: 'lot-coca-cent-1', productId: 'prod-coca', warehouseId: 'wh-central', batchNumber: 'LOT-COCA-CENT-01', expiryDate: '2027-01-31', quantity: 500, initialQuantity: 500, supplierId: 'sup-drinks', purchaseCost: 380, createdAt: dateStr },
    
    // Heineken in Bar Casino: 120 units
    { id: 'lot-hein-cas-1', productId: 'prod-heineken', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-HEIN-CAS-01', expiryDate: '2026-09-15', quantity: 120, initialQuantity: 120, supplierId: 'sup-drinks', purchaseCost: 600, createdAt: dateStr },
    // Heineken in Night Club: 90 units
    { id: 'lot-hein-nc-1', productId: 'prod-heineken', warehouseId: 'wh-nightclub', batchNumber: 'LOT-HEIN-NC-01', expiryDate: '2026-08-20', quantity: 90, initialQuantity: 90, supplierId: 'sup-drinks', purchaseCost: 600, createdAt: dateStr },
    
    // Steak in cold warehouse: 50 units
    { id: 'lot-steak-1', productId: 'prod-steak', warehouseId: 'wh-cold', batchNumber: 'LOT-STEAK-01', expiryDate: '2026-07-10', quantity: 50, initialQuantity: 50, supplierId: 'sup-market', purchaseCost: 1500, createdAt: dateStr },
    // Potatoes in Restaurant warehouse: 100 kg (100,000 g)
    { id: 'lot-pdt-1', productId: 'prod-pdt', warehouseId: 'wh-restaurant', batchNumber: 'LOT-PDT-01', expiryDate: '2026-07-20', quantity: 100000, initialQuantity: 100000, supplierId: 'sup-market', purchaseCost: 0.5, createdAt: dateStr },
    // Oil in Restaurant warehouse: 20 L (20,000 ml)
    { id: 'lot-oil-1', productId: 'prod-huile', warehouseId: 'wh-restaurant', batchNumber: 'LOT-HUILE-01', expiryDate: '2026-12-31', quantity: 20000, initialQuantity: 20000, supplierId: 'sup-market', purchaseCost: 1.5, createdAt: dateStr },
    // Salt in Restaurant warehouse: 5 kg (5,000 g)
    { id: 'lot-salt-1', productId: 'prod-sel', warehouseId: 'wh-restaurant', batchNumber: 'LOT-SEL-01', expiryDate: '2027-12-31', quantity: 5000, initialQuantity: 5000, supplierId: 'sup-market', purchaseCost: 0.1, createdAt: dateStr },

    // Crème liquide 1L in Cold storage: 15 units (near expiry!)
    { id: 'lot-creme-1', productId: 'prod-creme', warehouseId: 'wh-cold', batchNumber: 'LOT-CREME-01', expiryDate: '2026-07-04', quantity: 15, initialQuantity: 15, supplierId: 'sup-market', purchaseCost: 1200, createdAt: dateStr }
  ];

  // Initialize stocks based on batches
  const stocks: Stock[] = [];
  warehouses.forEach(w => {
    products.forEach(p => {
      if (!p.isStockable) return;
      const productBatches = batches.filter(b => b.productId === p.id && b.warehouseId === w.id);
      const totalQty = productBatches.reduce((acc, curr) => acc + curr.quantity, 0);
      if (totalQty > 0) {
        const totalCost = productBatches.reduce((acc, curr) => acc + (curr.quantity * curr.purchaseCost), 0);
        stocks.push({
          productId: p.id,
          warehouseId: w.id,
          quantityAvailable: totalQty,
          quantityReserved: 0,
          alertThreshold: p.id === 'prod-coca' ? 20 : (p.id === 'prod-pdt' ? 10000 : 5),
          averageCost: totalCost / totalQty,
          lastUpdated: dateStr
        });
      }
    });
  });

  // Also seed some initial Steak stock in wh-restaurant since the Steak Frites sale recipe requires Steak to be in the wh-restaurant or output warehouse!
  // Wait! The user says: "Tester vente Steak Frites depuis Restaurant: déduit les ingrédients depuis Dépôt Restaurant ou dépôt configuré pour le POS."
  // Wait, our Steak lot is in "wh-cold" (Chambre Froide). But the Restaurant POS default warehouse is "wh-restaurant" (Dépôt Restaurant).
  // Let's copy/transfer 30 steaks to "wh-restaurant" so that the restaurant actually has steaks to prepare Steak Frites, or let the user transfer it, OR seed it directly in both!
  // Let's seed 30 steaks in "wh-restaurant" as well to avoid stockouts on the Steak Frites test.
  batches.push({
    id: 'lot-steak-rest-1',
    productId: 'prod-steak',
    warehouseId: 'wh-restaurant',
    batchNumber: 'LOT-STEAK-R01',
    expiryDate: '2026-07-12',
    quantity: 30,
    initialQuantity: 30,
    supplierId: 'sup-market',
    purchaseCost: 1550,
    createdAt: dateStr
  });
  // Update stock for Steak in wh-restaurant
  stocks.push({
    productId: 'prod-steak',
    warehouseId: 'wh-restaurant',
    quantityAvailable: 30,
    quantityReserved: 0,
    alertThreshold: 5,
    averageCost: 1550,
    lastUpdated: dateStr
  });

  // Seed initial movements for demo
  const movements: StockMovement[] = batches.map((b, index) => ({
    id: `mvt-init-${index}`,
    companyId: 'comp-1',
    siteId: 'site-1',
    warehouseId: b.warehouseId,
    productId: b.productId,
    batchId: b.id,
    type: 'purchase_received',
    quantity: b.initialQuantity,
    unit: products.find(p => p.id === b.productId)?.baseUnit || 'unité',
    cost: b.purchaseCost,
    userId: 'user-system',
    userName: 'Système Seeding',
    date: dateStr,
    reason: 'Initialisation de stock de départ'
  }));

  const users: User[] = [
    { id: 'user-admin', name: 'Admin', role: 'admin' },
    { id: 'user-director', name: 'Directeur Général', role: 'director' },
    { id: 'user-stock-mgr', name: 'Responsable Stock', role: 'stock_manager' },
    { id: 'user-keeper', name: 'Magasinier Central', role: 'storekeeper' },
    { id: 'user-pos-mgr', name: 'Responsable Resto', role: 'pos_manager', posId: 'pos-1' },
    { id: 'user-auditor', name: 'Auditeur Externe', role: 'auditor' }
  ];

  return {
    companies,
    sites,
    posList,
    warehouses,
    products,
    posPricing,
    stocks,
    batches,
    movements,
    recipes,
    conversions,
    suppliers,
    supplierOrders: [],
    transfers: [],
    inventories: [],
    losses: [],
    externalSales: [],
    cashSessions: [],
    users,
    currentUser: users[0] // Admin by default
  };
};

const migrateDB = (state: Partial<DatabaseState>): DatabaseState => {
  return {
    ...state,
    companies: state.companies || [],
    sites: state.sites || [],
    posList: state.posList || [],
    warehouses: state.warehouses || [],
    products: state.products || [],
    posPricing: state.posPricing || [],
    stocks: state.stocks || [],
    batches: state.batches || [],
    movements: state.movements || [],
    recipes: state.recipes || [],
    conversions: state.conversions || [],
    suppliers: state.suppliers || [],
    supplierOrders: state.supplierOrders || [],
    transfers: state.transfers || [],
    inventories: state.inventories || [],
    losses: state.losses || [],
    externalSales: state.externalSales || [],
    cashSessions: state.cashSessions || [],
    users: state.users || [],
    currentUser: state.currentUser || state.users?.[0] || { id: 'user-admin', name: 'Admin', role: 'admin' }
  };
};

export const getDB = (): DatabaseState => {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    const newState = initialDB();
    saveDB(newState);
    return newState;
  }
  try {
    const parsedState = migrateDB(JSON.parse(data));
    saveDB(parsedState);
    return parsedState;
  } catch (e) {
    console.error("Failed to parse DB, resetting", e);
    const newState = initialDB();
    saveDB(newState);
    return newState;
  }
};

export const saveDB = (state: DatabaseState): void => {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
};

export const resetDB = (): DatabaseState => {
  const newState = initialDB();
  saveDB(newState);
  return newState;
};
