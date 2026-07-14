import {
  Company,
  Site,
  POS,
  Warehouse,
  Product,
  POSProductAlias,
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
  ExternalPOSImportRun,
  DeliveryOrder,
  CashSession,
  PMSRoom,
  PMSFolio,
  PMSGuest,
  PMSReservation,
  PMSHousekeepingTask,
  PMSNightAudit,
  PMSMigrationRun,
  PMSSettings,
  PMSRatePlan,
  PMSGroupBooking,
  PMSEvent,
  PMSInvoice,
  PMSMaintenanceTicket,
  PMSServiceRequest,
  PMSRateOverride,
  PMSChannel,
  PMSNotification,
  PMSAuditLog,
  PMSPropertySummary,
  User,
  createEmptyPaymentTotals
} from './types';

export interface DatabaseState {
  companies: Company[];
  sites: Site[];
  posList: POS[];
  warehouses: Warehouse[];
  products: Product[];
  posProductAliases: POSProductAlias[];
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
  externalPOSImportRuns: ExternalPOSImportRun[];
  deliveryOrders: DeliveryOrder[];
  cashSessions: CashSession[];
  pmsRooms: PMSRoom[];
  pmsFolios: PMSFolio[];
  pmsGuests: PMSGuest[];
  pmsReservations: PMSReservation[];
  pmsHousekeepingTasks: PMSHousekeepingTask[];
  pmsNightAudits: PMSNightAudit[];
  pmsMigrationRuns: PMSMigrationRun[];
  pmsSettings: PMSSettings;
  pmsRatePlans: PMSRatePlan[];
  pmsGroups: PMSGroupBooking[];
  pmsEvents: PMSEvent[];
  pmsInvoices: PMSInvoice[];
  pmsMaintenanceTickets: PMSMaintenanceTicket[];
  pmsServiceRequests: PMSServiceRequest[];
  pmsRateOverrides: PMSRateOverride[];
  pmsChannels: PMSChannel[];
  pmsNotifications: PMSNotification[];
  pmsAuditLogs: PMSAuditLog[];
  pmsPropertySummaries: PMSPropertySummary[];
  pmsScenarioStep: number;
  users: User[];
  currentUser: User;
}

const DB_KEY = 'sartal_stock_db';
const DEMO_SEED_KEY = 'sartal_demo_seed_v11';

const getDemoSupplierId = (product: Pick<Product, 'id' | 'category'>): string => {
  if (product.category.includes('Boissons premium')) return 'sup-premium';
  if (
    product.category.includes('Boissons')
    || ['prod-coca', 'prod-jus-gingembre', 'prod-jus-bouye', 'prod-energy-25'].includes(product.id)
  ) return 'sup-drinks';
  if (
    product.category.includes('Produits frais')
    || ['prod-steak', 'prod-poulet', 'prod-poisson-dorade', 'prod-poisson-fume', 'prod-menthe'].includes(product.id)
  ) return 'sup-fresh';
  if (
    product.category.includes('Épicerie')
    || product.category.includes('Hygiène')
    || ['prod-riz-5kg', 'prod-fonio-1kg', 'prod-niebe-1kg', 'prod-bouillon-sachet'].includes(product.id)
  ) return 'sup-grocery';
  return 'sup-market';
};

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
    { id: 'wh-delivery', siteId: 'site-1', name: 'Dépôt Préparation Livraison', isColdStorage: false },
    { id: 'wh-cold', siteId: 'site-1', name: 'Chambre Froide', isColdStorage: true },
    { id: 'wh-reserve-seche', siteId: 'site-1', name: 'Réserve Sèche', isColdStorage: false }
  ];

  const posList: POS[] = [
    { id: 'pos-1', siteId: 'site-1', name: 'Restaurant La Terrasse', type: 'restaurant', defaultWarehouseId: 'wh-restaurant', authorizedRoles: ['admin', 'director', 'pos_manager'] },
    { id: 'pos-2', siteId: 'site-1', name: 'Bar des Machines à Sous', type: 'casino', defaultWarehouseId: 'wh-bar-casino', authorizedRoles: ['admin', 'director', 'pos_manager'] },
    { id: 'pos-3', siteId: 'site-1', name: 'Night Club', type: 'night_club', defaultWarehouseId: 'wh-nightclub', authorizedRoles: ['admin', 'director', 'pos_manager'] },
    { id: 'pos-4', siteId: 'site-1', name: 'Room Service', type: 'room_service', defaultWarehouseId: 'wh-central', authorizedRoles: ['admin', 'director', 'pos_manager'] },
    { id: 'pos-5', siteId: 'site-1', name: 'Plateforme Épicerie en ligne', type: 'online_grocery', defaultWarehouseId: 'wh-delivery', authorizedRoles: ['admin', 'director', 'stock_manager'] }
  ];

  const products: Product[] = [
    { id: 'prod-coca', name: 'Coca-Cola 33 cl', sku: 'COCA33', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 50, isActive: true },
    { id: 'prod-jus-gingembre', name: 'Jus gingembre 33 cl', sku: 'GINGEMBRE33', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 40, isActive: true },
    { id: 'prod-jus-bouye', name: 'Jus bouye 75 cl', sku: 'BOUYE75', category: 'Boissons', baseUnit: 'bouteille', isStockable: true, globalAlertThreshold: 12, isActive: true },
    { id: 'prod-sirop-tonic', name: 'Sirop tonic premium', sku: 'SIROPTONIC', category: 'Boissons', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 3000, isActive: true },
    { id: 'prod-tonic', name: 'Tonic 20 cl', sku: 'TONIC20', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 24, isActive: true },
    { id: 'prod-eau-50', name: 'Eau minérale 50 cl', sku: 'EAU50', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 60, isActive: true },
    { id: 'prod-petillant-premium', name: 'Boisson pétillante premium 75 cl', sku: 'PETILLANT75', category: 'Boissons premium', baseUnit: 'bouteille', isStockable: true, globalAlertThreshold: 8, isActive: true },
    { id: 'prod-sirop-menthe-citron', name: 'Sirop menthe citron', sku: 'SIROMENTHE', category: 'Boissons', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 3000, isActive: true },
    { id: 'prod-menthe', name: 'Menthe fraîche', sku: 'MENTHE', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 500, isActive: true },
    { id: 'prod-citron-vert', name: 'Citron vert', sku: 'CITRONVERT', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 30, isActive: true },
    { id: 'prod-sucre-canne', name: 'Sirop sucre de canne', sku: 'SUCRECANNE', category: 'Boissons', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 2000, isActive: true },
    { id: 'prod-steak', name: 'Steak de Boeuf', sku: 'STEAK', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-pain-burger', name: 'Pain burger', sku: 'PAINBURGER', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-fromage', name: 'Fromage cheddar', sku: 'CHEDDAR', category: 'Alimentation', baseUnit: 'tranche', isStockable: true, globalAlertThreshold: 30, isActive: true },
    { id: 'prod-pdt', name: 'Pommes de terre', sku: 'PDT', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 50000, isActive: true },
    { id: 'prod-huile', name: 'Huile', sku: 'HUILE', category: 'Alimentation', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 10000, isActive: true },
    { id: 'prod-sel', name: 'Sel', sku: 'SEL', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 1000, isActive: true },
    { id: 'prod-riz-parfume', name: 'Riz parfumé', sku: 'RIZPARF', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 25000, isActive: true },
    { id: 'prod-poisson-dorade', name: 'Dorade portion', sku: 'DORADE', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 12, isActive: true },
    { id: 'prod-legumes-mix', name: 'Légumes garniture', sku: 'LEGMIX', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 15000, isActive: true },
    { id: 'prod-steak-frites', name: 'Steak Frites', sku: 'STEAKFRITES', category: 'Plats', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-burger-maison', name: 'Burger Maison', sku: 'BURGERMAISON', category: 'Plats', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-tonic-citron', name: 'Tonic citron', sku: 'TONICCITRON', category: 'Mocktails', baseUnit: 'verre', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-mocktail-menthe', name: 'Mocktail menthe citron', sku: 'MOCKMENTHE', category: 'Mocktails', baseUnit: 'verre', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-thieb-signature', name: 'Thieboudienne signature', sku: 'THIEB', category: 'Plats', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-creme', name: 'Crème liquide 1L', sku: 'CREM1L', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 10, isActive: true },
    { id: 'prod-riz-5kg', name: 'Riz parfumé 5 kg', sku: 'RIZ5KG', category: 'Épicerie', baseUnit: 'sac', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-eau-pack', name: 'Pack eau minérale 1,5 L x6', sku: 'EAUPACK6', category: 'Épicerie', baseUnit: 'pack', isStockable: true, globalAlertThreshold: 25, isActive: true },
    { id: 'prod-lait-poudre', name: 'Lait en poudre 400 g', sku: 'LAIT400', category: 'Épicerie', baseUnit: 'boîte', isStockable: true, globalAlertThreshold: 18, isActive: true },
    { id: 'prod-huile-1l', name: 'Huile végétale 1 L', sku: 'HUILE1L', category: 'Épicerie', baseUnit: 'bouteille', isStockable: true, globalAlertThreshold: 24, isActive: true },
    { id: 'prod-oignon-1kg', name: 'Oignons filet 1 kg', sku: 'OIGNON1KG', category: 'Épicerie', baseUnit: 'filet', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-sucre-1kg', name: 'Sucre blanc 1 kg', sku: 'SUCRE1KG', category: 'Épicerie', baseUnit: 'paquet', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-jus-bissap', name: 'Jus bissap 50 cl', sku: 'BISSAP50', category: 'Boissons', baseUnit: 'bouteille', isStockable: true, globalAlertThreshold: 30, isActive: true },
    { id: 'prod-eau-kirene', name: 'Eau Kirène 50 cl', sku: 'KIRENE50', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 60, isActive: true },
    { id: 'prod-jus-ditakh', name: 'Jus ditakh 50 cl', sku: 'DITAKH50', category: 'Boissons', baseUnit: 'bouteille', isStockable: true, globalAlertThreshold: 24, isActive: true },
    { id: 'prod-baguette', name: 'Pain baguette Dakar', sku: 'BAGUETTE', category: 'Boulangerie', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 25, isActive: true },
    { id: 'prod-thon-boite', name: 'Thon en boîte 160 g', sku: 'THON160', category: 'Épicerie', baseUnit: 'boîte', isStockable: true, globalAlertThreshold: 18, isActive: true },
    { id: 'prod-mayonnaise', name: 'Mayonnaise seau 5 kg', sku: 'MAYO5KG', category: 'Épicerie', baseUnit: 'g', isStockable: true, globalAlertThreshold: 1200, isActive: true },
    { id: 'prod-couscous-mil', name: 'Couscous de mil', sku: 'MILCOUS', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 8000, isActive: true },
    { id: 'prod-lait-caille', name: 'Lait caillé', sku: 'LAITCAILLE', category: 'Produits frais', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 3000, isActive: true },
    { id: 'prod-pate-arachide', name: "Pâte d'arachide", sku: 'PATEARACH', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 3000, isActive: true },
    { id: 'prod-sucre-cuisine', name: 'Sucre cuisine', sku: 'SUCRECUIS', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 2500, isActive: true },
    { id: 'prod-sirop-cola-epice', name: 'Sirop cola épicé', sku: 'COLAEPICE', category: 'Boissons premium', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 5000, isActive: true },
    { id: 'prod-base-soda-premium', name: 'Base soda premium', sku: 'SODAPREMIUM', category: 'Boissons premium', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 5000, isActive: true },
    { id: 'prod-energy-25', name: 'Boisson énergisante 25 cl', sku: 'ENERGY25', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 36, isActive: true },
    { id: 'prod-arachides', name: 'Arachides grillées', sku: 'ARACHIDES', category: 'Snacking', baseUnit: 'g', isStockable: true, globalAlertThreshold: 3000, isActive: true },
    { id: 'prod-samoussa', name: 'Samoussa boeuf', sku: 'SAMOUSSA', category: 'Snacking', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 24, isActive: true },
    { id: 'prod-poulet', name: 'Poulet fermier portion', sku: 'POULET', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 18, isActive: true },
    { id: 'prod-oignon-cuisine', name: 'Oignons cuisine', sku: 'OIGNONCUIS', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 12000, isActive: true },
    { id: 'prod-moutarde', name: 'Moutarde', sku: 'MOUTARDE', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 1500, isActive: true },
    { id: 'prod-citron-jaune', name: 'Citron jaune', sku: 'CITRONJAUNE', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 25, isActive: true },
    { id: 'prod-energy-cola', name: 'Energy cola', sku: 'ENERGYCOLA', category: 'Mocktails', baseUnit: 'verre', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-tonic-premium', name: 'Tonic premium', sku: 'TONICPREMIUM', category: 'Mocktails', baseUnit: 'verre', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-assiette-tapas', name: 'Assiette tapas casino', sku: 'TAPAS', category: 'Plats', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-yassa-poulet', name: 'Yassa poulet', sku: 'YASSA', category: 'Plats', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-mafe-boeuf', name: 'Mafé boeuf', sku: 'MAFEBOEUF', category: 'Plats', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-thiakry', name: 'Thiakry maison', sku: 'THIAKRY', category: 'Desserts', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-sandwich-thon', name: 'Sandwich thon Dakar', sku: 'SANDTHON', category: 'Snacking', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-cafe-touba', name: 'Café Touba 250 g', sku: 'CAFE250', category: 'Épicerie', baseUnit: 'paquet', isStockable: true, globalAlertThreshold: 18, isActive: true },
    { id: 'prod-tomate-concentre', name: 'Tomate concentrée 400 g', sku: 'TOMATE400', category: 'Épicerie', baseUnit: 'boîte', isStockable: true, globalAlertThreshold: 24, isActive: true },
    { id: 'prod-savon-lessive', name: 'Savon lessive 400 g', sku: 'SAVON400', category: 'Hygiène', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-couches-bebe', name: 'Couches bébé taille M', sku: 'COUCHESM', category: 'Hygiène', baseUnit: 'pack', isStockable: true, globalAlertThreshold: 12, isActive: true },
    { id: 'prod-fonio-1kg', name: 'Fonio précuit 1 kg', sku: 'FONIO1KG', category: 'Épicerie', baseUnit: 'paquet', isStockable: true, globalAlertThreshold: 18, isActive: true },
    { id: 'prod-niebe-1kg', name: 'Niébé local 1 kg', sku: 'NIEBE1KG', category: 'Épicerie', baseUnit: 'paquet', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-attieke-500', name: 'Attiéké frais 500 g', sku: 'ATTIEKE500', category: 'Produits frais', baseUnit: 'barquette', isStockable: true, globalAlertThreshold: 16, isActive: true },
    { id: 'prod-bouillon-sachet', name: 'Bouillon cuisine sachet', sku: 'BOUILLON', category: 'Épicerie', baseUnit: 'sachet', isStockable: true, globalAlertThreshold: 40, isActive: true },
    { id: 'prod-poisson-fume', name: 'Poisson fumé local', sku: 'POISFUME', category: 'Produits frais', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 10, isActive: true }
  ];

  products.forEach(product => {
    if (product.isStockable && !product.mainSupplierId) {
      product.mainSupplierId = getDemoSupplierId(product);
    }
  });

  const posProductAliases: POSProductAlias[] = [
    { externalSku: 'COCA33', externalLabel: 'Coca-Cola 33 cl', productId: 'prod-coca' },
    { externalSku: 'GINGEMBRE33', externalLabel: 'Jus gingembre 33 cl', productId: 'prod-jus-gingembre' },
    { externalSku: 'STEAKFRITES', externalLabel: 'Steak frites', productId: 'prod-steak-frites' },
    { externalSku: 'BURGER', externalLabel: 'Burger maison', productId: 'prod-burger-maison' },
    { externalSku: 'TONICCITRON', externalLabel: 'Tonic citron', productId: 'prod-tonic-citron' },
    { externalSku: 'BOUYE75', externalLabel: 'Jus bouye 75 cl', productId: 'prod-jus-bouye' },
    { externalSku: 'EAU50', externalLabel: 'Eau minérale 50 cl', productId: 'prod-eau-50' },
    { externalSku: 'PETILLANT75', externalLabel: 'Boisson pétillante premium 75 cl', productId: 'prod-petillant-premium' },
    { externalSku: 'MOCKMENTHE', externalLabel: 'Mocktail menthe citron', productId: 'prod-mocktail-menthe' },
    { externalSku: 'THIEB', externalLabel: 'Thieboudienne signature', productId: 'prod-thieb-signature' },
    { externalSku: 'RIZ5KG', externalLabel: 'Riz parfumé 5 kg', posId: 'pos-5', productId: 'prod-riz-5kg' },
    { externalSku: 'EAUPACK6', externalLabel: 'Pack eau 1,5 L x6', posId: 'pos-5', productId: 'prod-eau-pack' },
    { externalSku: 'LAIT400', externalLabel: 'Lait en poudre 400 g', posId: 'pos-5', productId: 'prod-lait-poudre' },
    { externalSku: 'HUILE1L', externalLabel: 'Huile végétale 1 L', posId: 'pos-5', productId: 'prod-huile-1l' },
    { externalSku: 'OIGNON1KG', externalLabel: 'Oignons filet 1 kg', posId: 'pos-5', productId: 'prod-oignon-1kg' },
    { externalSku: 'SUCRE1KG', externalLabel: 'Sucre blanc 1 kg', posId: 'pos-5', productId: 'prod-sucre-1kg' },
    { externalSku: 'BISSAP50', externalLabel: 'Jus bissap 50 cl', posId: 'pos-5', productId: 'prod-jus-bissap' },
    { externalSku: 'KIRENE50', externalLabel: 'Eau Kirène 50 cl', productId: 'prod-eau-kirene' },
    { externalSku: 'DITAKH50', externalLabel: 'Jus ditakh 50 cl', productId: 'prod-jus-ditakh' },
    { externalSku: 'ENERGYCOLA', externalLabel: 'Energy cola', productId: 'prod-energy-cola' },
    { externalSku: 'TONICPREMIUM', externalLabel: 'Tonic premium', productId: 'prod-tonic-premium' },
    { externalSku: 'TAPAS', externalLabel: 'Assiette tapas casino', productId: 'prod-assiette-tapas' },
    { externalSku: 'YASSA', externalLabel: 'Yassa poulet', productId: 'prod-yassa-poulet' },
    { externalSku: 'MAFEBOEUF', externalLabel: 'Mafé boeuf', productId: 'prod-mafe-boeuf' },
    { externalSku: 'THIAKRY', externalLabel: 'Thiakry maison', productId: 'prod-thiakry' },
    { externalSku: 'SANDTHON', externalLabel: 'Sandwich thon Dakar', productId: 'prod-sandwich-thon' },
    { externalSku: 'CAFE250', externalLabel: 'Café Touba 250 g', posId: 'pos-5', productId: 'prod-cafe-touba' },
    { externalSku: 'TOMATE400', externalLabel: 'Tomate concentrée 400 g', posId: 'pos-5', productId: 'prod-tomate-concentre' },
    { externalSku: 'SAVON400', externalLabel: 'Savon lessive 400 g', posId: 'pos-5', productId: 'prod-savon-lessive' },
    { externalSku: 'COUCHESM', externalLabel: 'Couches bébé taille M', posId: 'pos-5', productId: 'prod-couches-bebe' },
    { externalSku: 'FONIO1KG', externalLabel: 'Fonio précuit 1 kg', posId: 'pos-5', productId: 'prod-fonio-1kg' },
    { externalSku: 'NIEBE1KG', externalLabel: 'Niébé local 1 kg', posId: 'pos-5', productId: 'prod-niebe-1kg' },
    { externalSku: 'ATTIEKE500', externalLabel: 'Attiéké frais 500 g', posId: 'pos-5', productId: 'prod-attieke-500' },
    { externalSku: 'BOUILLON', externalLabel: 'Bouillon cuisine sachet', posId: 'pos-5', productId: 'prod-bouillon-sachet' },
    { externalSku: 'POISFUME', externalLabel: 'Poisson fumé local', posId: 'pos-5', productId: 'prod-poisson-fume' }
  ];

  const posPricing: POSPricing[] = [
    // Coca-Cola pricing
    { productId: 'prod-coca', posId: 'pos-1', salePrice: 1500, taxRate: 18, isAvailable: true },
    { productId: 'prod-coca', posId: 'pos-2', salePrice: 2000, taxRate: 18, isAvailable: true },
    { productId: 'prod-coca', posId: 'pos-3', salePrice: 2500, taxRate: 20, isAvailable: true },
    { productId: 'prod-coca', posId: 'pos-4', salePrice: 2000, taxRate: 18, isAvailable: true },
    // Jus gingembre pricing
    { productId: 'prod-jus-gingembre', posId: 'pos-1', salePrice: 2500, taxRate: 18, isAvailable: true },
    { productId: 'prod-jus-gingembre', posId: 'pos-2', salePrice: 3000, taxRate: 18, isAvailable: true },
    { productId: 'prod-jus-gingembre', posId: 'pos-3', salePrice: 3500, taxRate: 18, isAvailable: true },
    // Jus premium pricing
    { productId: 'prod-jus-bouye', posId: 'pos-1', salePrice: 2500, taxRate: 18, isAvailable: true },
    { productId: 'prod-jus-bouye', posId: 'pos-3', salePrice: 4000, taxRate: 18, isAvailable: true },
    { productId: 'prod-jus-ditakh', posId: 'pos-1', salePrice: 1800, taxRate: 18, isAvailable: true },
    { productId: 'prod-jus-ditakh', posId: 'pos-2', salePrice: 2500, taxRate: 18, isAvailable: true },
    { productId: 'prod-jus-ditakh', posId: 'pos-3', salePrice: 3000, taxRate: 20, isAvailable: true },
    { productId: 'prod-jus-ditakh', posId: 'pos-5', salePrice: 1000, taxRate: 18, isAvailable: true, defaultWarehouseId: 'wh-delivery' },
    // Everyday product with different prices and tax setup
    { productId: 'prod-eau-50', posId: 'pos-1', salePrice: 1000, taxRate: 18, isAvailable: true },
    { productId: 'prod-eau-50', posId: 'pos-2', salePrice: 1500, taxRate: 18, isAvailable: true },
    { productId: 'prod-eau-50', posId: 'pos-3', salePrice: 2000, taxRate: 20, isAvailable: true },
    { productId: 'prod-eau-50', posId: 'pos-4', salePrice: 1200, taxRate: 18, isAvailable: true },
    { productId: 'prod-eau-kirene', posId: 'pos-1', salePrice: 800, taxRate: 18, isAvailable: true },
    { productId: 'prod-eau-kirene', posId: 'pos-2', salePrice: 1200, taxRate: 18, isAvailable: true },
    { productId: 'prod-eau-kirene', posId: 'pos-3', salePrice: 1500, taxRate: 20, isAvailable: true },
    { productId: 'prod-eau-kirene', posId: 'pos-4', salePrice: 1000, taxRate: 18, isAvailable: true },
    { productId: 'prod-eau-kirene', posId: 'pos-5', salePrice: 600, taxRate: 18, isAvailable: true, defaultWarehouseId: 'wh-delivery' },
    // Boissons soft premium
    { productId: 'prod-petillant-premium', posId: 'pos-2', salePrice: 6000, taxRate: 18, isAvailable: true },
    { productId: 'prod-petillant-premium', posId: 'pos-3', salePrice: 8000, taxRate: 20, isAvailable: true },
    { productId: 'prod-petillant-premium', posId: 'pos-4', salePrice: 7000, taxRate: 18, isAvailable: true },
    // Steak Frites pricing
    { productId: 'prod-steak-frites', posId: 'pos-1', salePrice: 6500, taxRate: 18, isAvailable: true },
    { productId: 'prod-steak-frites', posId: 'pos-4', salePrice: 7000, taxRate: 18, isAvailable: true },
    // Recettes et boissons composées
    { productId: 'prod-burger-maison', posId: 'pos-1', salePrice: 5500, taxRate: 18, isAvailable: true },
    { productId: 'prod-tonic-citron', posId: 'pos-2', salePrice: 4500, taxRate: 18, isAvailable: true },
    { productId: 'prod-tonic-citron', posId: 'pos-3', salePrice: 6000, taxRate: 20, isAvailable: true },
    { productId: 'prod-mocktail-menthe', posId: 'pos-2', salePrice: 5000, taxRate: 18, isAvailable: true },
    { productId: 'prod-mocktail-menthe', posId: 'pos-3', salePrice: 7000, taxRate: 20, isAvailable: true },
    { productId: 'prod-thieb-signature', posId: 'pos-1', salePrice: 9500, taxRate: 18, isAvailable: true },
    { productId: 'prod-thieb-signature', posId: 'pos-4', salePrice: 11000, taxRate: 18, isAvailable: true },
    { productId: 'prod-mafe-boeuf', posId: 'pos-1', salePrice: 7500, taxRate: 18, isAvailable: true },
    { productId: 'prod-mafe-boeuf', posId: 'pos-4', salePrice: 9000, taxRate: 18, isAvailable: true, defaultWarehouseId: 'wh-central' },
    { productId: 'prod-thiakry', posId: 'pos-1', salePrice: 2500, taxRate: 18, isAvailable: true },
    { productId: 'prod-thiakry', posId: 'pos-4', salePrice: 3000, taxRate: 18, isAvailable: true, defaultWarehouseId: 'wh-central' },
    { productId: 'prod-sandwich-thon', posId: 'pos-1', salePrice: 3000, taxRate: 18, isAvailable: true },
    { productId: 'prod-sandwich-thon', posId: 'pos-5', salePrice: 2500, taxRate: 18, isAvailable: true, defaultWarehouseId: 'wh-delivery' },
    // Online grocery channel pricing
    { productId: 'prod-coca', posId: 'pos-5', salePrice: 1200, taxRate: 18, isAvailable: true },
    { productId: 'prod-riz-5kg', posId: 'pos-5', salePrice: 4500, taxRate: 18, isAvailable: true },
    { productId: 'prod-eau-pack', posId: 'pos-5', salePrice: 2500, taxRate: 18, isAvailable: true },
    { productId: 'prod-lait-poudre', posId: 'pos-5', salePrice: 3500, taxRate: 18, isAvailable: true },
    { productId: 'prod-huile-1l', posId: 'pos-5', salePrice: 1600, taxRate: 18, isAvailable: true },
    { productId: 'prod-oignon-1kg', posId: 'pos-5', salePrice: 900, taxRate: 18, isAvailable: true },
    { productId: 'prod-sucre-1kg', posId: 'pos-5', salePrice: 850, taxRate: 18, isAvailable: true },
    { productId: 'prod-jus-bissap', posId: 'pos-5', salePrice: 1000, taxRate: 18, isAvailable: true },
    { productId: 'prod-energy-cola', posId: 'pos-2', salePrice: 6500, taxRate: 18, isAvailable: true },
    { productId: 'prod-energy-cola', posId: 'pos-3', salePrice: 8500, taxRate: 20, isAvailable: true },
    { productId: 'prod-tonic-premium', posId: 'pos-2', salePrice: 5500, taxRate: 18, isAvailable: true },
    { productId: 'prod-tonic-premium', posId: 'pos-3', salePrice: 7500, taxRate: 20, isAvailable: true },
    { productId: 'prod-assiette-tapas', posId: 'pos-2', salePrice: 7000, taxRate: 18, isAvailable: true },
    { productId: 'prod-assiette-tapas', posId: 'pos-4', salePrice: 8500, taxRate: 18, isAvailable: true, defaultWarehouseId: 'wh-central' },
    { productId: 'prod-yassa-poulet', posId: 'pos-1', salePrice: 8000, taxRate: 18, isAvailable: true },
    { productId: 'prod-yassa-poulet', posId: 'pos-4', salePrice: 9500, taxRate: 18, isAvailable: true, defaultWarehouseId: 'wh-central' },
    { productId: 'prod-cafe-touba', posId: 'pos-5', salePrice: 1800, taxRate: 18, isAvailable: true },
    { productId: 'prod-tomate-concentre', posId: 'pos-5', salePrice: 650, taxRate: 18, isAvailable: true },
    { productId: 'prod-savon-lessive', posId: 'pos-5', salePrice: 500, taxRate: 18, isAvailable: true },
    { productId: 'prod-couches-bebe', posId: 'pos-5', salePrice: 4200, taxRate: 18, isAvailable: true },
    { productId: 'prod-fonio-1kg', posId: 'pos-5', salePrice: 2200, taxRate: 18, isAvailable: true },
    { productId: 'prod-niebe-1kg', posId: 'pos-5', salePrice: 1300, taxRate: 18, isAvailable: true },
    { productId: 'prod-attieke-500', posId: 'pos-5', salePrice: 900, taxRate: 18, isAvailable: true },
    { productId: 'prod-bouillon-sachet', posId: 'pos-5', salePrice: 150, taxRate: 18, isAvailable: true },
    { productId: 'prod-poisson-fume', posId: 'pos-5', salePrice: 1800, taxRate: 18, isAvailable: true }
  ];

  const suppliers: Supplier[] = [
    { id: 'sup-drinks', name: 'Soberka Boissons', contact: 'Mamadou Diallo', phone: '+221 33 821 44 55', email: 'contact@soberka.sn' },
    { id: 'sup-market', name: 'Marché Kermel Fruits & Viandes', contact: 'Fatou Sow', phone: '+221 77 645 12 89', email: 'fatousow@kermel.sn' },
    { id: 'sup-premium', name: 'Grossiste Boissons Premium', contact: 'Ibrahima Sarr', phone: '+221 76 300 18 44', email: 'contact@boissonspremium.sn' },
    { id: 'sup-fresh', name: 'Fresh Dakar Volaille & Marée', contact: 'Aïssatou Ba', phone: '+221 78 110 22 90', email: 'orders@freshdakar.sn' },
    { id: 'sup-grocery', name: 'Grossiste Épicerie Médina', contact: 'Cheikh Fall', phone: '+221 77 901 11 32', email: 'medina@grossiste.sn' }
  ];

  const conversions: UnitConversion[] = [
    { id: 'conv-coca-carton', productId: 'prod-coca', fromUnit: 'carton-24', toUnit: 'unité', factor: 24 },
    { id: 'conv-gingembre-carton', productId: 'prod-jus-gingembre', fromUnit: 'carton-24', toUnit: 'unité', factor: 24 },
    { id: 'conv-pdt-sac', productId: 'prod-pdt', fromUnit: 'sac-10kg', toUnit: 'g', factor: 10000 },
    { id: 'conv-arachides-sac', productId: 'prod-arachides', fromUnit: 'sac-5kg', toUnit: 'g', factor: 5000 },
    { id: 'conv-oignon-sac', productId: 'prod-oignon-cuisine', fromUnit: 'sac-25kg', toUnit: 'g', factor: 25000 }
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
    },
    {
      id: 'rec-burger-maison',
      productId: 'prod-burger-maison',
      name: 'Burger Maison',
      ingredients: [
        { productId: 'prod-pain-burger', quantity: 1, unit: 'unité' },
        { productId: 'prod-steak', quantity: 1, unit: 'unité' },
        { productId: 'prod-fromage', quantity: 1, unit: 'tranche' },
        { productId: 'prod-pdt', quantity: 150, unit: 'g' }
      ]
    },
    {
      id: 'rec-tonic-citron',
      productId: 'prod-tonic-citron',
      name: 'Tonic citron',
      ingredients: [
        { productId: 'prod-sirop-tonic', quantity: 50, unit: 'ml' },
        { productId: 'prod-tonic', quantity: 1, unit: 'unité' }
      ]
    },
    {
      id: 'rec-mocktail-menthe',
      productId: 'prod-mocktail-menthe',
      name: 'Mocktail menthe citron',
      ingredients: [
        { productId: 'prod-sirop-menthe-citron', quantity: 50, unit: 'ml' },
        { productId: 'prod-menthe', quantity: 8, unit: 'g' },
        { productId: 'prod-citron-vert', quantity: 0.5, unit: 'unité' },
        { productId: 'prod-sucre-canne', quantity: 20, unit: 'ml' }
      ]
    },
    {
      id: 'rec-thieb-signature',
      productId: 'prod-thieb-signature',
      name: 'Thieboudienne signature',
      ingredients: [
        { productId: 'prod-poisson-dorade', quantity: 1, unit: 'unité' },
        { productId: 'prod-riz-parfume', quantity: 250, unit: 'g' },
        { productId: 'prod-legumes-mix', quantity: 180, unit: 'g' },
        { productId: 'prod-huile', quantity: 25, unit: 'ml' },
        { productId: 'prod-sel', quantity: 3, unit: 'g' }
      ]
    },
    {
      id: 'rec-energy-cola',
      productId: 'prod-energy-cola',
      name: 'Energy cola',
      ingredients: [
        { productId: 'prod-sirop-cola-epice', quantity: 50, unit: 'ml' },
        { productId: 'prod-energy-25', quantity: 1, unit: 'unité' }
      ]
    },
    {
      id: 'rec-tonic-premium',
      productId: 'prod-tonic-premium',
      name: 'Tonic premium',
      ingredients: [
        { productId: 'prod-base-soda-premium', quantity: 50, unit: 'ml' },
        { productId: 'prod-tonic', quantity: 1, unit: 'unité' }
      ]
    },
    {
      id: 'rec-assiette-tapas',
      productId: 'prod-assiette-tapas',
      name: 'Assiette tapas casino',
      ingredients: [
        { productId: 'prod-samoussa', quantity: 4, unit: 'unité' },
        { productId: 'prod-arachides', quantity: 80, unit: 'g' }
      ]
    },
    {
      id: 'rec-yassa-poulet',
      productId: 'prod-yassa-poulet',
      name: 'Yassa poulet',
      ingredients: [
        { productId: 'prod-poulet', quantity: 1, unit: 'unité' },
        { productId: 'prod-riz-parfume', quantity: 220, unit: 'g' },
        { productId: 'prod-oignon-cuisine', quantity: 180, unit: 'g' },
        { productId: 'prod-citron-jaune', quantity: 0.5, unit: 'unité' },
        { productId: 'prod-moutarde', quantity: 30, unit: 'g' },
        { productId: 'prod-huile', quantity: 20, unit: 'ml' }
      ]
    },
    {
      id: 'rec-mafe-boeuf',
      productId: 'prod-mafe-boeuf',
      name: 'Mafé boeuf',
      ingredients: [
        { productId: 'prod-steak', quantity: 1, unit: 'unité' },
        { productId: 'prod-riz-parfume', quantity: 220, unit: 'g' },
        { productId: 'prod-pate-arachide', quantity: 70, unit: 'g' },
        { productId: 'prod-legumes-mix', quantity: 160, unit: 'g' },
        { productId: 'prod-huile', quantity: 20, unit: 'ml' }
      ]
    },
    {
      id: 'rec-thiakry',
      productId: 'prod-thiakry',
      name: 'Thiakry maison',
      ingredients: [
        { productId: 'prod-couscous-mil', quantity: 120, unit: 'g' },
        { productId: 'prod-lait-caille', quantity: 180, unit: 'ml' },
        { productId: 'prod-sucre-cuisine', quantity: 25, unit: 'g' }
      ]
    },
    {
      id: 'rec-sandwich-thon',
      productId: 'prod-sandwich-thon',
      name: 'Sandwich thon Dakar',
      ingredients: [
        { productId: 'prod-baguette', quantity: 1, unit: 'unité' },
        { productId: 'prod-thon-boite', quantity: 1, unit: 'boîte' },
        { productId: 'prod-mayonnaise', quantity: 35, unit: 'g' }
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
    
    // Jus gingembre in Bar Casino: 120 units
    { id: 'lot-gingembre-cas-1', productId: 'prod-jus-gingembre', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-GINGEMBRE-CAS-01', expiryDate: '2026-09-15', quantity: 120, initialQuantity: 120, supplierId: 'sup-drinks', purchaseCost: 600, createdAt: dateStr },
    // Jus gingembre in Night Club: 90 units
    { id: 'lot-gingembre-nc-1', productId: 'prod-jus-gingembre', warehouseId: 'wh-nightclub', batchNumber: 'LOT-GINGEMBRE-NC-01', expiryDate: '2026-08-20', quantity: 90, initialQuantity: 90, supplierId: 'sup-drinks', purchaseCost: 600, createdAt: dateStr },
    { id: 'lot-gingembre-rest-1', productId: 'prod-jus-gingembre', warehouseId: 'wh-restaurant', batchNumber: 'LOT-GINGEMBRE-REST-01', expiryDate: '2026-09-30', quantity: 72, initialQuantity: 72, supplierId: 'sup-drinks', purchaseCost: 600, createdAt: dateStr },
    { id: 'lot-bouye-rest-1', productId: 'prod-jus-bouye', warehouseId: 'wh-restaurant', batchNumber: 'LOT-BOUYE-R01', expiryDate: '2028-12-31', quantity: 24, initialQuantity: 24, supplierId: 'sup-drinks', purchaseCost: 4500, createdAt: dateStr },
    { id: 'lot-bouye-nc-1', productId: 'prod-jus-bouye', warehouseId: 'wh-nightclub', batchNumber: 'LOT-BOUYE-NC01', expiryDate: '2028-12-31', quantity: 36, initialQuantity: 36, supplierId: 'sup-drinks', purchaseCost: 4500, createdAt: dateStr },
    { id: 'lot-sirop-tonic-cas-1', productId: 'prod-sirop-tonic', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-SIROPTONIC-CAS-01', expiryDate: '2028-06-30', quantity: 12000, initialQuantity: 12000, supplierId: 'sup-drinks', purchaseCost: 12, createdAt: dateStr },
    { id: 'lot-sirop-tonic-nc-1', productId: 'prod-sirop-tonic', warehouseId: 'wh-nightclub', batchNumber: 'LOT-SIROPTONIC-NC-01', expiryDate: '2028-06-30', quantity: 16000, initialQuantity: 16000, supplierId: 'sup-drinks', purchaseCost: 12, createdAt: dateStr },
    { id: 'lot-tonic-cas-1', productId: 'prod-tonic', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-TONIC-CAS-01', expiryDate: '2026-11-30', quantity: 72, initialQuantity: 72, supplierId: 'sup-drinks', purchaseCost: 300, createdAt: dateStr },
    { id: 'lot-tonic-nc-1', productId: 'prod-tonic', warehouseId: 'wh-nightclub', batchNumber: 'LOT-TONIC-NC-01', expiryDate: '2026-11-30', quantity: 96, initialQuantity: 96, supplierId: 'sup-drinks', purchaseCost: 300, createdAt: dateStr },
    { id: 'lot-eau-rest-1', productId: 'prod-eau-50', warehouseId: 'wh-restaurant', batchNumber: 'LOT-EAU-REST-01', expiryDate: '2027-02-28', quantity: 240, initialQuantity: 240, supplierId: 'sup-drinks', purchaseCost: 200, createdAt: dateStr },
    { id: 'lot-eau-cas-1', productId: 'prod-eau-50', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-EAU-CAS-01', expiryDate: '2027-02-28', quantity: 180, initialQuantity: 180, supplierId: 'sup-drinks', purchaseCost: 200, createdAt: dateStr },
    { id: 'lot-eau-nc-1', productId: 'prod-eau-50', warehouseId: 'wh-nightclub', batchNumber: 'LOT-EAU-NC-01', expiryDate: '2027-02-28', quantity: 120, initialQuantity: 120, supplierId: 'sup-drinks', purchaseCost: 200, createdAt: dateStr },
    { id: 'lot-petillant-cas-1', productId: 'prod-petillant-premium', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-PETILLANT-CAS-01', expiryDate: '2029-12-31', quantity: 12, initialQuantity: 12, supplierId: 'sup-drinks', purchaseCost: 2200, createdAt: dateStr },
    { id: 'lot-petillant-nc-1', productId: 'prod-petillant-premium', warehouseId: 'wh-nightclub', batchNumber: 'LOT-PETILLANT-NC-01', expiryDate: '2029-12-31', quantity: 18, initialQuantity: 18, supplierId: 'sup-drinks', purchaseCost: 2200, createdAt: dateStr },
    { id: 'lot-eau-central-1', productId: 'prod-eau-50', warehouseId: 'wh-central', batchNumber: 'LOT-EAU-CENT-01', expiryDate: '2027-02-28', quantity: 120, initialQuantity: 120, supplierId: 'sup-drinks', purchaseCost: 200, createdAt: dateStr },
    { id: 'lot-petillant-central-1', productId: 'prod-petillant-premium', warehouseId: 'wh-central', batchNumber: 'LOT-PETILLANT-CENT-01', expiryDate: '2029-12-31', quantity: 8, initialQuantity: 8, supplierId: 'sup-drinks', purchaseCost: 2200, createdAt: dateStr },
    { id: 'lot-sirop-menthe-cas-1', productId: 'prod-sirop-menthe-citron', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-SIROMENTHE-CAS-01', expiryDate: '2029-12-31', quantity: 9000, initialQuantity: 9000, supplierId: 'sup-drinks', purchaseCost: 10, createdAt: dateStr },
    { id: 'lot-sirop-menthe-nc-1', productId: 'prod-sirop-menthe-citron', warehouseId: 'wh-nightclub', batchNumber: 'LOT-SIROMENTHE-NC-01', expiryDate: '2029-12-31', quantity: 12000, initialQuantity: 12000, supplierId: 'sup-drinks', purchaseCost: 10, createdAt: dateStr },
    { id: 'lot-menthe-cas-1', productId: 'prod-menthe', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-MENTHE-CAS-01', expiryDate: '2026-07-06', quantity: 800, initialQuantity: 800, supplierId: 'sup-market', purchaseCost: 8, createdAt: dateStr },
    { id: 'lot-menthe-nc-1', productId: 'prod-menthe', warehouseId: 'wh-nightclub', batchNumber: 'LOT-MENTHE-NC-01', expiryDate: '2026-07-06', quantity: 1000, initialQuantity: 1000, supplierId: 'sup-market', purchaseCost: 8, createdAt: dateStr },
    { id: 'lot-citron-cas-1', productId: 'prod-citron-vert', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-CITRON-CAS-01', expiryDate: '2026-07-12', quantity: 60, initialQuantity: 60, supplierId: 'sup-market', purchaseCost: 150, createdAt: dateStr },
    { id: 'lot-citron-nc-1', productId: 'prod-citron-vert', warehouseId: 'wh-nightclub', batchNumber: 'LOT-CITRON-NC-01', expiryDate: '2026-07-12', quantity: 80, initialQuantity: 80, supplierId: 'sup-market', purchaseCost: 150, createdAt: dateStr },
    { id: 'lot-sucre-cas-1', productId: 'prod-sucre-canne', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-SUCRE-CAS-01', expiryDate: '2027-04-30', quantity: 3000, initialQuantity: 3000, supplierId: 'sup-drinks', purchaseCost: 2, createdAt: dateStr },
    { id: 'lot-sucre-nc-1', productId: 'prod-sucre-canne', warehouseId: 'wh-nightclub', batchNumber: 'LOT-SUCRE-NC-01', expiryDate: '2027-04-30', quantity: 4000, initialQuantity: 4000, supplierId: 'sup-drinks', purchaseCost: 2, createdAt: dateStr },
    
    // Steak in cold warehouse: 50 units
    { id: 'lot-steak-1', productId: 'prod-steak', warehouseId: 'wh-cold', batchNumber: 'LOT-STEAK-01', expiryDate: '2026-07-10', quantity: 50, initialQuantity: 50, supplierId: 'sup-market', purchaseCost: 1500, createdAt: dateStr },
    // Potatoes in Restaurant warehouse: 100 kg (100,000 g)
    { id: 'lot-pdt-1', productId: 'prod-pdt', warehouseId: 'wh-restaurant', batchNumber: 'LOT-PDT-01', expiryDate: '2026-07-20', quantity: 100000, initialQuantity: 100000, supplierId: 'sup-market', purchaseCost: 0.5, createdAt: dateStr },
    { id: 'lot-pain-burger-1', productId: 'prod-pain-burger', warehouseId: 'wh-restaurant', batchNumber: 'LOT-PAIN-BURGER-01', expiryDate: '2026-07-08', quantity: 60, initialQuantity: 60, supplierId: 'sup-market', purchaseCost: 250, createdAt: dateStr },
    { id: 'lot-cheddar-1', productId: 'prod-fromage', warehouseId: 'wh-restaurant', batchNumber: 'LOT-CHEDDAR-01', expiryDate: '2026-08-01', quantity: 120, initialQuantity: 120, supplierId: 'sup-market', purchaseCost: 150, createdAt: dateStr },
    // Oil in Restaurant warehouse: 20 L (20,000 ml)
    { id: 'lot-oil-1', productId: 'prod-huile', warehouseId: 'wh-restaurant', batchNumber: 'LOT-HUILE-01', expiryDate: '2026-12-31', quantity: 20000, initialQuantity: 20000, supplierId: 'sup-market', purchaseCost: 1.5, createdAt: dateStr },
    // Salt in Restaurant warehouse: 5 kg (5,000 g)
    { id: 'lot-salt-1', productId: 'prod-sel', warehouseId: 'wh-restaurant', batchNumber: 'LOT-SEL-01', expiryDate: '2027-12-31', quantity: 5000, initialQuantity: 5000, supplierId: 'sup-market', purchaseCost: 0.1, createdAt: dateStr },
    { id: 'lot-riz-rest-1', productId: 'prod-riz-parfume', warehouseId: 'wh-restaurant', batchNumber: 'LOT-RIZ-R01', expiryDate: '2027-01-31', quantity: 50000, initialQuantity: 50000, supplierId: 'sup-market', purchaseCost: 0.45, createdAt: dateStr },
    { id: 'lot-dorade-rest-1', productId: 'prod-poisson-dorade', warehouseId: 'wh-restaurant', batchNumber: 'LOT-DORADE-R01', expiryDate: '2026-07-08', quantity: 40, initialQuantity: 40, supplierId: 'sup-market', purchaseCost: 1800, createdAt: dateStr },
    { id: 'lot-legumes-rest-1', productId: 'prod-legumes-mix', warehouseId: 'wh-restaurant', batchNumber: 'LOT-LEG-R01', expiryDate: '2026-07-09', quantity: 30000, initialQuantity: 30000, supplierId: 'sup-market', purchaseCost: 0.35, createdAt: dateStr },
    { id: 'lot-steak-central-1', productId: 'prod-steak', warehouseId: 'wh-central', batchNumber: 'LOT-STEAK-CENT-01', expiryDate: '2026-07-12', quantity: 20, initialQuantity: 20, supplierId: 'sup-market', purchaseCost: 1550, createdAt: dateStr },
    { id: 'lot-pdt-central-1', productId: 'prod-pdt', warehouseId: 'wh-central', batchNumber: 'LOT-PDT-CENT-01', expiryDate: '2026-07-20', quantity: 50000, initialQuantity: 50000, supplierId: 'sup-market', purchaseCost: 0.5, createdAt: dateStr },
    { id: 'lot-oil-central-1', productId: 'prod-huile', warehouseId: 'wh-central', batchNumber: 'LOT-HUILE-CENT-01', expiryDate: '2026-12-31', quantity: 10000, initialQuantity: 10000, supplierId: 'sup-market', purchaseCost: 1.5, createdAt: dateStr },
    { id: 'lot-salt-central-1', productId: 'prod-sel', warehouseId: 'wh-central', batchNumber: 'LOT-SEL-CENT-01', expiryDate: '2027-12-31', quantity: 2000, initialQuantity: 2000, supplierId: 'sup-market', purchaseCost: 0.1, createdAt: dateStr },
    { id: 'lot-riz-central-1', productId: 'prod-riz-parfume', warehouseId: 'wh-central', batchNumber: 'LOT-RIZ-CENT-01', expiryDate: '2027-01-31', quantity: 20000, initialQuantity: 20000, supplierId: 'sup-market', purchaseCost: 0.45, createdAt: dateStr },
    { id: 'lot-dorade-central-1', productId: 'prod-poisson-dorade', warehouseId: 'wh-central', batchNumber: 'LOT-DORADE-CENT-01', expiryDate: '2026-07-08', quantity: 20, initialQuantity: 20, supplierId: 'sup-market', purchaseCost: 1800, createdAt: dateStr },
    { id: 'lot-legumes-central-1', productId: 'prod-legumes-mix', warehouseId: 'wh-central', batchNumber: 'LOT-LEG-CENT-01', expiryDate: '2026-07-09', quantity: 15000, initialQuantity: 15000, supplierId: 'sup-market', purchaseCost: 0.35, createdAt: dateStr },

    // Crème liquide 1L in Cold storage: 15 units (near expiry!)
    { id: 'lot-creme-1', productId: 'prod-creme', warehouseId: 'wh-cold', batchNumber: 'LOT-CREME-01', expiryDate: '2026-07-04', quantity: 15, initialQuantity: 15, supplierId: 'sup-market', purchaseCost: 1200, createdAt: dateStr },
    // Online grocery preparation depot
    { id: 'lot-coca-delivery-1', productId: 'prod-coca', warehouseId: 'wh-delivery', batchNumber: 'LOT-COCA-LIV-01', expiryDate: '2026-11-30', quantity: 96, initialQuantity: 96, supplierId: 'sup-drinks', purchaseCost: 390, createdAt: dateStr },
    { id: 'lot-riz5-delivery-1', productId: 'prod-riz-5kg', warehouseId: 'wh-delivery', batchNumber: 'LOT-RIZ5-LIV-01', expiryDate: '2027-02-28', quantity: 45, initialQuantity: 45, supplierId: 'sup-market', purchaseCost: 3000, createdAt: dateStr },
    { id: 'lot-eaupack-delivery-1', productId: 'prod-eau-pack', warehouseId: 'wh-delivery', batchNumber: 'LOT-EAUPACK-LIV-01', expiryDate: '2027-04-30', quantity: 60, initialQuantity: 60, supplierId: 'sup-drinks', purchaseCost: 1500, createdAt: dateStr },
    { id: 'lot-lait-delivery-1', productId: 'prod-lait-poudre', warehouseId: 'wh-delivery', batchNumber: 'LOT-LAIT-LIV-01', expiryDate: '2027-01-31', quantity: 36, initialQuantity: 36, supplierId: 'sup-market', purchaseCost: 2400, createdAt: dateStr },
    { id: 'lot-huile1-delivery-1', productId: 'prod-huile-1l', warehouseId: 'wh-delivery', batchNumber: 'LOT-HUILE1-LIV-01', expiryDate: '2027-06-30', quantity: 48, initialQuantity: 48, supplierId: 'sup-market', purchaseCost: 1050, createdAt: dateStr },
    { id: 'lot-oignon-delivery-1', productId: 'prod-oignon-1kg', warehouseId: 'wh-delivery', batchNumber: 'LOT-OIGNON-LIV-01', expiryDate: '2026-07-20', quantity: 32, initialQuantity: 32, supplierId: 'sup-market', purchaseCost: 520, createdAt: dateStr },
    { id: 'lot-sucre1-delivery-1', productId: 'prod-sucre-1kg', warehouseId: 'wh-delivery', batchNumber: 'LOT-SUCRE1-LIV-01', expiryDate: '2027-05-31', quantity: 40, initialQuantity: 40, supplierId: 'sup-market', purchaseCost: 550, createdAt: dateStr },
    { id: 'lot-sucre-cuisine-rest-1', productId: 'prod-sucre-cuisine', warehouseId: 'wh-restaurant', batchNumber: 'LOT-SUCRECUIS-REST-01', expiryDate: '2027-05-31', quantity: 18000, initialQuantity: 18000, supplierId: 'sup-market', purchaseCost: 0.55, createdAt: dateStr },
    { id: 'lot-sucre-cuisine-central-1', productId: 'prod-sucre-cuisine', warehouseId: 'wh-central', batchNumber: 'LOT-SUCRECUIS-CENT-01', expiryDate: '2027-05-31', quantity: 12000, initialQuantity: 12000, supplierId: 'sup-market', purchaseCost: 0.55, createdAt: dateStr },
    { id: 'lot-bissap-delivery-1', productId: 'prod-jus-bissap', warehouseId: 'wh-delivery', batchNumber: 'LOT-BISSAP-LIV-01', expiryDate: '2026-08-15', quantity: 72, initialQuantity: 72, supplierId: 'sup-drinks', purchaseCost: 420, createdAt: dateStr },
    { id: 'lot-kirene-rest-1', productId: 'prod-eau-kirene', warehouseId: 'wh-restaurant', batchNumber: 'LOT-KIRENE-REST-01', expiryDate: '2027-04-30', quantity: 180, initialQuantity: 180, supplierId: 'sup-drinks', purchaseCost: 220, createdAt: dateStr },
    { id: 'lot-kirene-cas-1', productId: 'prod-eau-kirene', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-KIRENE-CAS-01', expiryDate: '2027-04-30', quantity: 144, initialQuantity: 144, supplierId: 'sup-drinks', purchaseCost: 220, createdAt: dateStr },
    { id: 'lot-kirene-nc-1', productId: 'prod-eau-kirene', warehouseId: 'wh-nightclub', batchNumber: 'LOT-KIRENE-NC-01', expiryDate: '2027-04-30', quantity: 120, initialQuantity: 120, supplierId: 'sup-drinks', purchaseCost: 220, createdAt: dateStr },
    { id: 'lot-kirene-delivery-1', productId: 'prod-eau-kirene', warehouseId: 'wh-delivery', batchNumber: 'LOT-KIRENE-LIV-01', expiryDate: '2027-04-30', quantity: 240, initialQuantity: 240, supplierId: 'sup-drinks', purchaseCost: 210, createdAt: dateStr },
    { id: 'lot-ditakh-rest-1', productId: 'prod-jus-ditakh', warehouseId: 'wh-restaurant', batchNumber: 'LOT-DITAKH-REST-01', expiryDate: '2026-08-20', quantity: 60, initialQuantity: 60, supplierId: 'sup-drinks', purchaseCost: 520, createdAt: dateStr },
    { id: 'lot-ditakh-cas-1', productId: 'prod-jus-ditakh', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-DITAKH-CAS-01', expiryDate: '2026-08-20', quantity: 48, initialQuantity: 48, supplierId: 'sup-drinks', purchaseCost: 520, createdAt: dateStr },
    { id: 'lot-ditakh-nc-1', productId: 'prod-jus-ditakh', warehouseId: 'wh-nightclub', batchNumber: 'LOT-DITAKH-NC-01', expiryDate: '2026-08-20', quantity: 48, initialQuantity: 48, supplierId: 'sup-drinks', purchaseCost: 520, createdAt: dateStr },
    { id: 'lot-ditakh-delivery-1', productId: 'prod-jus-ditakh', warehouseId: 'wh-delivery', batchNumber: 'LOT-DITAKH-LIV-01', expiryDate: '2026-08-20', quantity: 72, initialQuantity: 72, supplierId: 'sup-drinks', purchaseCost: 500, createdAt: dateStr },
    { id: 'lot-baguette-rest-1', productId: 'prod-baguette', warehouseId: 'wh-restaurant', batchNumber: 'LOT-BAGUETTE-R01', expiryDate: '2026-07-03', quantity: 80, initialQuantity: 80, supplierId: 'sup-market', purchaseCost: 120, createdAt: dateStr },
    { id: 'lot-baguette-delivery-1', productId: 'prod-baguette', warehouseId: 'wh-delivery', batchNumber: 'LOT-BAGUETTE-LIV-01', expiryDate: '2026-07-03', quantity: 50, initialQuantity: 50, supplierId: 'sup-market', purchaseCost: 120, createdAt: dateStr },
    { id: 'lot-thon-rest-1', productId: 'prod-thon-boite', warehouseId: 'wh-restaurant', batchNumber: 'LOT-THON-R01', expiryDate: '2028-09-30', quantity: 72, initialQuantity: 72, supplierId: 'sup-grocery', purchaseCost: 650, createdAt: dateStr },
    { id: 'lot-thon-delivery-1', productId: 'prod-thon-boite', warehouseId: 'wh-delivery', batchNumber: 'LOT-THON-LIV-01', expiryDate: '2028-09-30', quantity: 48, initialQuantity: 48, supplierId: 'sup-grocery', purchaseCost: 650, createdAt: dateStr },
    { id: 'lot-mayo-rest-1', productId: 'prod-mayonnaise', warehouseId: 'wh-restaurant', batchNumber: 'LOT-MAYO-R01', expiryDate: '2027-01-31', quantity: 6000, initialQuantity: 6000, supplierId: 'sup-grocery', purchaseCost: 2, createdAt: dateStr },
    { id: 'lot-mayo-delivery-1', productId: 'prod-mayonnaise', warehouseId: 'wh-delivery', batchNumber: 'LOT-MAYO-LIV-01', expiryDate: '2027-01-31', quantity: 4000, initialQuantity: 4000, supplierId: 'sup-grocery', purchaseCost: 2, createdAt: dateStr },
    { id: 'lot-mil-rest-1', productId: 'prod-couscous-mil', warehouseId: 'wh-restaurant', batchNumber: 'LOT-MIL-R01', expiryDate: '2027-02-28', quantity: 18000, initialQuantity: 18000, supplierId: 'sup-market', purchaseCost: 0.65, createdAt: dateStr },
    { id: 'lot-mil-central-1', productId: 'prod-couscous-mil', warehouseId: 'wh-central', batchNumber: 'LOT-MIL-CENT-01', expiryDate: '2027-02-28', quantity: 12000, initialQuantity: 12000, supplierId: 'sup-market', purchaseCost: 0.65, createdAt: dateStr },
    { id: 'lot-laitcaille-rest-1', productId: 'prod-lait-caille', warehouseId: 'wh-restaurant', batchNumber: 'LOT-LAITCAILLE-R01', expiryDate: '2026-07-06', quantity: 12000, initialQuantity: 12000, supplierId: 'sup-fresh', purchaseCost: 1.1, createdAt: dateStr },
    { id: 'lot-laitcaille-central-1', productId: 'prod-lait-caille', warehouseId: 'wh-central', batchNumber: 'LOT-LAITCAILLE-CENT-01', expiryDate: '2026-07-06', quantity: 7000, initialQuantity: 7000, supplierId: 'sup-fresh', purchaseCost: 1.1, createdAt: dateStr },
    { id: 'lot-pate-arachide-rest-1', productId: 'prod-pate-arachide', warehouseId: 'wh-restaurant', batchNumber: 'LOT-PATEARACH-R01', expiryDate: '2027-05-31', quantity: 8000, initialQuantity: 8000, supplierId: 'sup-market', purchaseCost: 3.5, createdAt: dateStr },
    { id: 'lot-pate-arachide-central-1', productId: 'prod-pate-arachide', warehouseId: 'wh-central', batchNumber: 'LOT-PATEARACH-CENT-01', expiryDate: '2027-05-31', quantity: 5000, initialQuantity: 5000, supplierId: 'sup-market', purchaseCost: 3.5, createdAt: dateStr },
    { id: 'lot-cola-epice-cas-1', productId: 'prod-sirop-cola-epice', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-COLAEPICE-CAS-01', expiryDate: '2030-12-31', quantity: 14000, initialQuantity: 14000, supplierId: 'sup-premium', purchaseCost: 32, createdAt: dateStr },
    { id: 'lot-cola-epice-nc-1', productId: 'prod-sirop-cola-epice', warehouseId: 'wh-nightclub', batchNumber: 'LOT-COLAEPICE-NC-01', expiryDate: '2030-12-31', quantity: 21000, initialQuantity: 21000, supplierId: 'sup-premium', purchaseCost: 32, createdAt: dateStr },
    { id: 'lot-soda-premium-cas-1', productId: 'prod-base-soda-premium', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-SODAPREMIUM-CAS-01', expiryDate: '2030-12-31', quantity: 10500, initialQuantity: 10500, supplierId: 'sup-premium', purchaseCost: 24, createdAt: dateStr },
    { id: 'lot-soda-premium-nc-1', productId: 'prod-base-soda-premium', warehouseId: 'wh-nightclub', batchNumber: 'LOT-SODAPREMIUM-NC-01', expiryDate: '2030-12-31', quantity: 14000, initialQuantity: 14000, supplierId: 'sup-premium', purchaseCost: 24, createdAt: dateStr },
    { id: 'lot-energy-cas-1', productId: 'prod-energy-25', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-ENERGY-CAS-01', expiryDate: '2027-02-28', quantity: 96, initialQuantity: 96, supplierId: 'sup-drinks', purchaseCost: 450, createdAt: dateStr },
    { id: 'lot-energy-nc-1', productId: 'prod-energy-25', warehouseId: 'wh-nightclub', batchNumber: 'LOT-ENERGY-NC-01', expiryDate: '2027-02-28', quantity: 144, initialQuantity: 144, supplierId: 'sup-drinks', purchaseCost: 450, createdAt: dateStr },
    { id: 'lot-samoussa-cas-1', productId: 'prod-samoussa', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-SAMOUSSA-CAS-01', expiryDate: '2026-07-09', quantity: 80, initialQuantity: 80, supplierId: 'sup-fresh', purchaseCost: 250, createdAt: dateStr },
    { id: 'lot-samoussa-central-1', productId: 'prod-samoussa', warehouseId: 'wh-central', batchNumber: 'LOT-SAMOUSSA-CENT-01', expiryDate: '2026-07-09', quantity: 60, initialQuantity: 60, supplierId: 'sup-fresh', purchaseCost: 250, createdAt: dateStr },
    { id: 'lot-arachides-cas-1', productId: 'prod-arachides', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-ARACHIDES-CAS-01', expiryDate: '2026-11-30', quantity: 6000, initialQuantity: 6000, supplierId: 'sup-market', purchaseCost: 3, createdAt: dateStr },
    { id: 'lot-arachides-central-1', productId: 'prod-arachides', warehouseId: 'wh-central', batchNumber: 'LOT-ARACHIDES-CENT-01', expiryDate: '2026-11-30', quantity: 4000, initialQuantity: 4000, supplierId: 'sup-market', purchaseCost: 3, createdAt: dateStr },
    { id: 'lot-poulet-rest-1', productId: 'prod-poulet', warehouseId: 'wh-restaurant', batchNumber: 'LOT-POULET-R01', expiryDate: '2026-07-10', quantity: 45, initialQuantity: 45, supplierId: 'sup-fresh', purchaseCost: 1300, createdAt: dateStr },
    { id: 'lot-poulet-central-1', productId: 'prod-poulet', warehouseId: 'wh-central', batchNumber: 'LOT-POULET-CENT-01', expiryDate: '2026-07-10', quantity: 24, initialQuantity: 24, supplierId: 'sup-fresh', purchaseCost: 1300, createdAt: dateStr },
    { id: 'lot-oignon-cuisine-rest-1', productId: 'prod-oignon-cuisine', warehouseId: 'wh-restaurant', batchNumber: 'LOT-OIGNONCUIS-R01', expiryDate: '2026-07-22', quantity: 28000, initialQuantity: 28000, supplierId: 'sup-market', purchaseCost: 0.45, createdAt: dateStr },
    { id: 'lot-oignon-cuisine-central-1', productId: 'prod-oignon-cuisine', warehouseId: 'wh-central', batchNumber: 'LOT-OIGNONCUIS-CENT-01', expiryDate: '2026-07-22', quantity: 18000, initialQuantity: 18000, supplierId: 'sup-market', purchaseCost: 0.45, createdAt: dateStr },
    { id: 'lot-moutarde-rest-1', productId: 'prod-moutarde', warehouseId: 'wh-restaurant', batchNumber: 'LOT-MOUTARDE-R01', expiryDate: '2027-03-31', quantity: 3500, initialQuantity: 3500, supplierId: 'sup-market', purchaseCost: 3, createdAt: dateStr },
    { id: 'lot-moutarde-central-1', productId: 'prod-moutarde', warehouseId: 'wh-central', batchNumber: 'LOT-MOUTARDE-CENT-01', expiryDate: '2027-03-31', quantity: 2500, initialQuantity: 2500, supplierId: 'sup-market', purchaseCost: 3, createdAt: dateStr },
    { id: 'lot-citron-jaune-rest-1', productId: 'prod-citron-jaune', warehouseId: 'wh-restaurant', batchNumber: 'LOT-CITRONJAUNE-R01', expiryDate: '2026-07-14', quantity: 70, initialQuantity: 70, supplierId: 'sup-market', purchaseCost: 120, createdAt: dateStr },
    { id: 'lot-citron-jaune-central-1', productId: 'prod-citron-jaune', warehouseId: 'wh-central', batchNumber: 'LOT-CITRONJAUNE-CENT-01', expiryDate: '2026-07-14', quantity: 50, initialQuantity: 50, supplierId: 'sup-market', purchaseCost: 120, createdAt: dateStr },
    { id: 'lot-cafe-delivery-1', productId: 'prod-cafe-touba', warehouseId: 'wh-delivery', batchNumber: 'LOT-CAFE-LIV-01', expiryDate: '2027-03-31', quantity: 28, initialQuantity: 28, supplierId: 'sup-grocery', purchaseCost: 1100, createdAt: dateStr },
    { id: 'lot-tomate-delivery-1', productId: 'prod-tomate-concentre', warehouseId: 'wh-delivery', batchNumber: 'LOT-TOMATE-LIV-01', expiryDate: '2027-08-31', quantity: 72, initialQuantity: 72, supplierId: 'sup-grocery', purchaseCost: 390, createdAt: dateStr },
    { id: 'lot-savon-delivery-1', productId: 'prod-savon-lessive', warehouseId: 'wh-delivery', batchNumber: 'LOT-SAVON-LIV-01', expiryDate: '2028-12-31', quantity: 54, initialQuantity: 54, supplierId: 'sup-grocery', purchaseCost: 260, createdAt: dateStr },
    { id: 'lot-couches-delivery-1', productId: 'prod-couches-bebe', warehouseId: 'wh-delivery', batchNumber: 'LOT-COUCHES-LIV-01', expiryDate: '2029-12-31', quantity: 16, initialQuantity: 16, supplierId: 'sup-grocery', purchaseCost: 3100, createdAt: dateStr },
    { id: 'lot-fonio-delivery-1', productId: 'prod-fonio-1kg', warehouseId: 'wh-delivery', batchNumber: 'LOT-FONIO-LIV-01', expiryDate: '2027-04-30', quantity: 34, initialQuantity: 34, supplierId: 'sup-grocery', purchaseCost: 1450, createdAt: dateStr },
    { id: 'lot-niebe-delivery-1', productId: 'prod-niebe-1kg', warehouseId: 'wh-delivery', batchNumber: 'LOT-NIEBE-LIV-01', expiryDate: '2027-03-31', quantity: 42, initialQuantity: 42, supplierId: 'sup-grocery', purchaseCost: 820, createdAt: dateStr },
    { id: 'lot-attieke-delivery-1', productId: 'prod-attieke-500', warehouseId: 'wh-delivery', batchNumber: 'LOT-ATTIEKE-LIV-01', expiryDate: '2026-07-12', quantity: 22, initialQuantity: 22, supplierId: 'sup-fresh', purchaseCost: 520, createdAt: dateStr },
    { id: 'lot-bouillon-delivery-1', productId: 'prod-bouillon-sachet', warehouseId: 'wh-delivery', batchNumber: 'LOT-BOUILLON-LIV-01', expiryDate: '2027-10-31', quantity: 120, initialQuantity: 120, supplierId: 'sup-grocery', purchaseCost: 85, createdAt: dateStr },
    { id: 'lot-poisson-fume-delivery-1', productId: 'prod-poisson-fume', warehouseId: 'wh-delivery', batchNumber: 'LOT-POISFUME-LIV-01', expiryDate: '2026-07-14', quantity: 18, initialQuantity: 18, supplierId: 'sup-fresh', purchaseCost: 1100, createdAt: dateStr }
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
    userName: 'Données de départ',
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

  const hotelDate = (offset: number) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const today = hotelDate(0);

  const pmsRooms: PMSRoom[] = [
    { id: 'room-101', siteId: 'site-1', roomNumber: '101', roomType: 'Standard', floor: '1er étage', capacity: 2, nightlyRate: 45000, status: 'vacant', housekeepingStatus: 'clean' },
    { id: 'room-102', siteId: 'site-1', roomNumber: '102', roomType: 'Standard', floor: '1er étage', capacity: 2, nightlyRate: 45000, status: 'vacant', housekeepingStatus: 'dirty' },
    { id: 'room-118', siteId: 'site-1', roomNumber: '118', roomType: 'Supérieure', floor: '1er étage', capacity: 2, nightlyRate: 55000, status: 'vacant', housekeepingStatus: 'inspected' },
    { id: 'room-204', siteId: 'site-1', roomNumber: '204', roomType: 'Suite Junior', floor: '2e étage', capacity: 3, nightlyRate: 85000, status: 'occupied', housekeepingStatus: 'inspected' },
    { id: 'room-205', siteId: 'site-1', roomNumber: '205', roomType: 'Suite Junior', floor: '2e étage', capacity: 3, nightlyRate: 85000, status: 'vacant', housekeepingStatus: 'clean' },
    { id: 'room-301', siteId: 'site-1', roomNumber: '301', roomType: 'Chambre Deluxe', floor: '3e étage', capacity: 2, nightlyRate: 70000, status: 'occupied', housekeepingStatus: 'inspected' },
    { id: 'room-305', siteId: 'site-1', roomNumber: '305', roomType: 'Chambre Deluxe', floor: '3e étage', capacity: 2, nightlyRate: 70000, status: 'occupied', housekeepingStatus: 'clean' },
    { id: 'room-410', siteId: 'site-1', roomNumber: '410', roomType: 'Suite Présidentielle', floor: '4e étage', capacity: 4, nightlyRate: 160000, status: 'maintenance', housekeepingStatus: 'dirty', maintenanceNote: 'Climatisation à contrôler avant remise en vente.' }
  ];

  const pmsGuests: PMSGuest[] = [
    { id: 'guest-aminata', fullName: 'Aminata Diop', phone: '+221 77 245 18 09', email: 'aminata.diop@example.com', nationality: 'Sénégalaise', preferences: 'Petit-déjeuner sans sucre', stays: 3, documentType: 'identity_card', documentNumber: 'SN-1987-****-421', loyaltyTier: 'gold' },
    { id: 'guest-jean', fullName: 'Jean Morel', phone: '+33 6 24 18 40 10', email: 'jean.morel@example.com', nationality: 'Française', company: 'Sahel Conseil', stays: 2, documentType: 'passport', documentNumber: 'FR-22****19', loyaltyTier: 'silver' },
    { id: 'guest-sarah', fullName: 'Sarah Johnson', phone: '+44 7700 900123', email: 'sarah.j@example.com', nationality: 'Britannique', preferences: 'Chambre calme', stays: 1, documentType: 'passport', documentNumber: 'GB-51****83', loyaltyTier: 'standard' },
    { id: 'guest-moussa', fullName: 'Moussa Ndiaye', phone: '+221 78 610 44 20', email: 'm.ndiaye@example.com', nationality: 'Sénégalaise', company: 'Ndar Distribution', stays: 5 },
    { id: 'guest-fatou', fullName: 'Fatou Kane', phone: '+221 76 812 33 05', nationality: 'Sénégalaise', stays: 1 },
    { id: 'guest-ibrahima', fullName: 'Ibrahima Fall', phone: '+221 77 901 24 61', email: 'i.fall@example.com', nationality: 'Sénégalaise', stays: 0 },
    { id: 'guest-coumba', fullName: 'Coumba Diallo', phone: '+221 77 620 14 52', email: 'coumba.diallo@example.com', nationality: 'Sénégalaise', preferences: 'Étage élevé et chambre calme', stays: 2, loyaltyTier: 'silver' }
  ];

  const pmsReservations: PMSReservation[] = [
    { id: 'res-204', confirmationNumber: 'RSV-240701', guestId: 'guest-aminata', roomId: 'room-204', arrivalDate: hotelDate(-1), departureDate: hotelDate(3), adults: 2, children: 0, status: 'checked_in', source: 'direct', nightlyRate: 85000, depositAmount: 50000, notes: 'Arrivée confirmée par téléphone.', ratePlanId: 'rate-flex-suite', guaranteeType: 'deposit', guaranteeStatus: 'secured' },
    { id: 'res-305', confirmationNumber: 'RSV-240702', guestId: 'guest-jean', roomId: 'room-305', arrivalDate: hotelDate(-2), departureDate: hotelDate(1), adults: 1, children: 0, status: 'checked_in', source: 'company', nightlyRate: 70000, depositAmount: 40000, notes: 'Facturation société à valider au départ.', ratePlanId: 'rate-corporate', guaranteeType: 'company', guaranteeStatus: 'secured' },
    { id: 'res-301', confirmationNumber: 'RSV-240704', guestId: 'guest-moussa', roomId: 'room-301', arrivalDate: hotelDate(-1), departureDate: hotelDate(2), adults: 2, children: 1, status: 'checked_in', source: 'phone', nightlyRate: 70000, depositAmount: 70000 },
    { id: 'res-118', confirmationNumber: 'RSV-240703', guestId: 'guest-sarah', roomId: 'room-118', arrivalDate: today, departureDate: hotelDate(2), adults: 1, children: 0, status: 'confirmed', source: 'online', nightlyRate: 55000, depositAmount: 25000 },
    { id: 'res-101', confirmationNumber: 'RSV-240705', guestId: 'guest-fatou', roomId: 'room-101', arrivalDate: hotelDate(1), departureDate: hotelDate(4), adults: 2, children: 0, status: 'confirmed', source: 'agency', nightlyRate: 45000, depositAmount: 45000 },
    { id: 'res-302', confirmationNumber: 'RSV-240706', guestId: 'guest-ibrahima', roomId: 'room-205', arrivalDate: hotelDate(-1), departureDate: hotelDate(1), adults: 1, children: 0, status: 'no_show', source: 'phone', nightlyRate: 85000, depositAmount: 0, notes: 'Client non présenté, relance à effectuer.' },
    { id: 'res-unassigned', confirmationNumber: 'RSV-240707', guestId: 'guest-coumba', roomId: '', requestedRoomType: 'Chambre Deluxe', arrivalDate: hotelDate(2), departureDate: hotelDate(5), adults: 2, children: 0, status: 'confirmed', source: 'online', nightlyRate: 70000, depositAmount: 35000, notes: 'Chambre précise à attribuer avant l’arrivée.', guaranteeType: 'deposit', guaranteeStatus: 'secured', estimatedArrivalTime: '16:30' }
  ];

  const pmsFolios: PMSFolio[] = [
    {
      id: 'folio-204',
      roomId: 'room-204',
      guestId: 'guest-aminata',
      reservationId: 'res-204',
      guestName: 'Aminata Diop',
      reservationNumber: 'RSV-240701',
      arrivalDate: hotelDate(-1),
      departureDate: hotelDate(3),
      status: 'open',
      charges: [
        { id: 'charge-204-room', saleId: 'stay-204-night', externalSaleId: 'NUIT-204-01', posId: 'pos-1', label: 'Nuitée Suite Junior', amount: 85000, date: `${hotelDate(-1)}T22:00:00.000Z`, status: 'reconciled', category: 'room' },
        { id: 'charge-204-resto', saleId: 'sale-204-resto', externalSaleId: 'REST-204-0142', posId: 'pos-1', label: 'Dîner Restaurant La Terrasse', amount: 12500, date: `${today}T20:15:00.000Z`, status: 'pending', category: 'restaurant' },
        { id: 'charge-204-service', saleId: 'service-204-laundry', externalSaleId: 'SERV-204-008', posId: 'pos-1', label: 'Service blanchisserie', amount: 6000, date: `${today}T10:20:00.000Z`, status: 'exported', category: 'service' }
      ],
      payments: [{ id: 'pay-204', amount: 50000, method: 'wave', date: `${hotelDate(-1)}T14:05:00.000Z`, reference: 'WV-204-50000' }]
    },
    {
      id: 'folio-305',
      roomId: 'room-305',
      guestId: 'guest-jean',
      reservationId: 'res-305',
      guestName: 'Jean Morel',
      reservationNumber: 'RSV-240702',
      arrivalDate: hotelDate(-2),
      departureDate: hotelDate(1),
      status: 'open',
      charges: [
        { id: 'charge-305-room', saleId: 'stay-305-night', externalSaleId: 'NUIT-305-01', posId: 'pos-1', label: 'Nuitée Chambre Deluxe', amount: 140000, date: `${hotelDate(-1)}T23:05:00.000Z`, status: 'reconciled', category: 'room' },
        { id: 'charge-305-resto', saleId: 'sale-305-resto', externalSaleId: 'REST-305-0098', posId: 'pos-1', label: 'Déjeuner Restaurant La Terrasse', amount: 18500, date: `${today}T13:10:00.000Z`, status: 'exported', category: 'restaurant' }
      ],
      payments: [{ id: 'pay-305', amount: 40000, method: 'card', date: `${hotelDate(-2)}T16:30:00.000Z`, reference: 'TPE-845102' }]
    },
    {
      id: 'folio-301',
      roomId: 'room-301',
      guestId: 'guest-moussa',
      reservationId: 'res-301',
      guestName: 'Moussa Ndiaye',
      reservationNumber: 'RSV-240704',
      arrivalDate: hotelDate(-1),
      departureDate: hotelDate(2),
      status: 'open',
      charges: [
        { id: 'charge-301-room', saleId: 'stay-301-night', externalSaleId: 'NUIT-301-01', posId: 'pos-1', label: 'Nuitée Chambre Deluxe', amount: 70000, date: `${hotelDate(-1)}T22:45:00.000Z`, status: 'reconciled', category: 'room' },
        { id: 'charge-301-resto', saleId: 'sale-301-resto', externalSaleId: 'REST-301-0115', posId: 'pos-1', label: 'Petit-déjeuner en chambre', amount: 9000, date: `${today}T08:30:00.000Z`, status: 'pending', category: 'restaurant' }
      ],
      payments: [{ id: 'pay-301', amount: 70000, method: 'orange_money', date: `${hotelDate(-1)}T15:10:00.000Z`, reference: 'OM-301-70000' }]
    }
  ];

  const pmsHousekeepingTasks: PMSHousekeepingTask[] = [
    { id: 'hk-102', roomId: 'room-102', assignedTo: 'Mariama Sarr', status: 'pending', priority: 'urgent', scheduledDate: today, note: 'Préparer avant l’arrivée de 14h.' },
    { id: 'hk-204', roomId: 'room-204', assignedTo: 'Awa Cissé', status: 'completed', priority: 'normal', scheduledDate: today, note: 'Recouche effectuée.' },
    { id: 'hk-305', roomId: 'room-305', assignedTo: 'Mariama Sarr', status: 'in_progress', priority: 'normal', scheduledDate: today },
    { id: 'hk-410', roomId: 'room-410', assignedTo: 'Service technique', status: 'pending', priority: 'urgent', scheduledDate: today, note: 'Contrôle climatisation.' }
  ];

  const pmsNightAudits: PMSNightAudit[] = [
    { id: 'audit-night-1', businessDate: hotelDate(-1), completedAt: `${today}T01:45:00.000Z`, completedBy: 'Responsable de nuit', occupiedRooms: 3, roomRevenue: 225000, posRevenue: 31500, openBalance: 221000, status: 'completed' }
  ];

  const pmsMigrationRuns: PMSMigrationRun[] = [
    { id: 'migration-orchestra-1', source: 'Orchestra - reprise test', importedAt: `${hotelDate(-3)}T11:00:00.000Z`, rooms: 8, guests: 6, reservations: 6, warnings: 1, status: 'review' }
  ];

  const pmsSettings: PMSSettings = {
    hotelName: 'Complexe Hôtelier Dakar',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    cityTax: 1000,
    vatRate: 18,
    currency: 'XOF',
    businessDate: today,
    allowOverbooking: false,
    overbookingLimit: 0
  };

  const pmsRatePlans: PMSRatePlan[] = [
    { id: 'rate-flex-standard', name: 'Flexible public', roomType: 'Standard', baseRate: 45000, weekendMultiplier: 1.1, validFrom: hotelDate(-90), validTo: hotelDate(180), audience: 'public', active: true, minStay: 1, occupancyAdjustment: 12 },
    { id: 'rate-flex-superior', name: 'Flexible Supérieure', roomType: 'Supérieure', baseRate: 55000, weekendMultiplier: 1.1, validFrom: hotelDate(-90), validTo: hotelDate(180), audience: 'public', active: true, minStay: 1, occupancyAdjustment: 12 },
    { id: 'rate-flex-suite', name: 'Flexible Suite', roomType: 'Suite Junior', baseRate: 85000, weekendMultiplier: 1.15, validFrom: hotelDate(-90), validTo: hotelDate(180), audience: 'public', active: true, minStay: 2, occupancyAdjustment: 15 },
    { id: 'rate-corporate', name: 'Contrat entreprise Dakar', roomType: 'Chambre Deluxe', baseRate: 63000, weekendMultiplier: 1, validFrom: hotelDate(-120), validTo: hotelDate(240), audience: 'company', active: true, minStay: 1, occupancyAdjustment: 0 },
    { id: 'rate-group', name: 'Groupe & séminaire', roomType: 'Standard', baseRate: 40000, weekendMultiplier: 1, validFrom: hotelDate(-30), validTo: hotelDate(120), audience: 'group', active: true, minStay: 2, occupancyAdjustment: 0 }
  ];

  const pmsGroups: PMSGroupBooking[] = [
    { id: 'group-sahel', name: 'Séminaire Sahel Conseil', contactName: 'Jean Morel', contactPhone: '+33 6 24 18 40 10', roomIds: ['room-101', 'room-102', 'room-305'], arrivalDate: hotelDate(1), departureDate: hotelDate(4), billingMode: 'central', status: 'confirmed', depositAmount: 150000 },
    { id: 'group-lions', name: 'Délégation sportive Dakar', contactName: 'Mamadou Sow', contactPhone: '+221 77 330 41 20', roomIds: ['room-118', 'room-204', 'room-205'], arrivalDate: hotelDate(8), departureDate: hotelDate(11), billingMode: 'mixed', status: 'option', depositAmount: 0 }
  ];

  const pmsEvents: PMSEvent[] = [
    { id: 'event-sahel', name: 'Journée stratégique Sahel Conseil', type: 'seminar', date: hotelDate(2), venue: 'Salle Gorée', attendees: 28, cateringAmount: 420000, status: 'confirmed', groupId: 'group-sahel' },
    { id: 'event-teranga', name: 'Réception Teranga Digital', type: 'banquet', date: hotelDate(6), venue: 'Terrasse panoramique', attendees: 80, cateringAmount: 1200000, status: 'option' }
  ];

  const pmsInvoices: PMSInvoice[] = [
    { id: 'invoice-305', folioId: 'folio-305', number: 'FAC-2026-00305', type: 'invoice', status: 'draft', issuedAt: `${today}T10:00:00.000Z`, billedTo: 'Sahel Conseil', subtotal: 158500, taxAmount: 28530, cityTaxAmount: 3000, total: 190030 },
    { id: 'proforma-204', folioId: 'folio-204', number: 'PRO-2026-00204', type: 'proforma', status: 'issued', issuedAt: `${hotelDate(-1)}T15:00:00.000Z`, billedTo: 'Aminata Diop', subtotal: 103500, taxAmount: 18630, cityTaxAmount: 4000, total: 126130 }
  ];

  const pmsMaintenanceTickets: PMSMaintenanceTicket[] = [
    { id: 'maint-410', roomId: 'room-410', equipment: 'Climatisation', priority: 'critical', status: 'in_progress', assignedTo: 'Moussa Technique', openedAt: `${hotelDate(-1)}T09:20:00.000Z`, estimatedCost: 85000, actualCost: 42000, unavailableUntil: hotelDate(2), photoCount: 2, note: 'Compresseur à contrôler avant remise en vente.' },
    { id: 'maint-102', roomId: 'room-102', equipment: 'Serrure électronique', priority: 'normal', status: 'open', assignedTo: 'Service technique', openedAt: `${today}T08:10:00.000Z`, estimatedCost: 15000, actualCost: 0, unavailableUntil: today, photoCount: 1, note: 'Pile faible signalée par l’entretien.' }
  ];

  const pmsServiceRequests: PMSServiceRequest[] = [
    { id: 'request-204-breakfast', reservationId: 'res-204', roomId: 'room-204', type: 'breakfast', label: 'Petit-déjeuner sans sucre', status: 'completed', priority: 'normal', scheduledAt: `${today}T07:30:00.000Z`, assignedTo: 'Restaurant La Terrasse', amount: 9000, note: 'Préférence cliente enregistrée.' },
    { id: 'request-305-airport', reservationId: 'res-305', roomId: 'room-305', type: 'airport_transfer', label: 'Transfert aéroport', status: 'assigned', priority: 'urgent', scheduledAt: `${hotelDate(1)}T09:30:00.000Z`, assignedTo: 'Chauffeur Mamadou', amount: 25000, note: 'Vol Air Sénégal à 12h40.' },
    { id: 'request-301-laundry', reservationId: 'res-301', roomId: 'room-301', type: 'laundry', label: 'Blanchisserie express', status: 'in_progress', priority: 'normal', scheduledAt: `${today}T16:00:00.000Z`, assignedTo: 'Service étage', amount: 6000 }
  ];

  const pmsRateOverrides: PMSRateOverride[] = Array.from({ length: 7 }, (_, index) => {
    const date = hotelDate(index);
    const weekend = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
    return { id: `override-deluxe-${date}`, date, roomType: 'Chambre Deluxe', price: weekend ? 82000 : 70000, reason: weekend ? 'Week-end forte demande' : 'Tarif public', closed: false };
  });

  const pmsChannels: PMSChannel[] = [
    { id: 'channel-direct', name: 'Site direct Sartal', type: 'direct', status: 'connected', lastSync: `${today}T11:45:00.000Z`, reservationsToday: 3, availabilityIssues: 0 },
    { id: 'channel-agency', name: 'Agences partenaires', type: 'agency', status: 'connected', lastSync: `${today}T11:40:00.000Z`, reservationsToday: 2, availabilityIssues: 0 },
    { id: 'channel-ota', name: 'Plateforme de réservation', type: 'ota', status: 'warning', lastSync: `${today}T10:58:00.000Z`, reservationsToday: 4, availabilityIssues: 1 },
    { id: 'channel-corporate', name: 'Contrats entreprises', type: 'corporate', status: 'connected', lastSync: `${today}T09:30:00.000Z`, reservationsToday: 1, availabilityIssues: 0 }
  ];

  const pmsNotifications: PMSNotification[] = [
    { id: 'notif-118', reservationId: 'res-118', channel: 'whatsapp', type: 'arrival_reminder', recipient: '+44 7700 900123', status: 'sent', scheduledAt: `${hotelDate(-1)}T18:00:00.000Z`, sentAt: `${hotelDate(-1)}T18:01:00.000Z` },
    { id: 'notif-101', reservationId: 'res-101', channel: 'sms', type: 'arrival_reminder', recipient: '+221 76 812 33 05', status: 'scheduled', scheduledAt: `${today}T18:00:00.000Z` },
    { id: 'notif-305', reservationId: 'res-305', channel: 'email', type: 'balance_due', recipient: 'jean.morel@example.com', status: 'scheduled', scheduledAt: `${today}T17:00:00.000Z` }
  ];

  const pmsAuditLogs: PMSAuditLog[] = [
    { id: 'audit-log-1', date: `${today}T10:20:00.000Z`, userName: 'Responsable de nuit', action: 'Transfert de charge', entity: 'Folio RSV-240701', detail: 'Blanchisserie transférée vers le folio chambre 204.' },
    { id: 'audit-log-2', date: `${today}T09:15:00.000Z`, userName: 'Admin', action: 'Modification tarif', entity: 'Réservation RSV-240702', detail: 'Application du contrat entreprise Sahel Conseil.' },
    { id: 'audit-log-3', date: `${hotelDate(-1)}T23:50:00.000Z`, userName: 'Responsable de nuit', action: 'Clôture journalière', entity: hotelDate(-1), detail: 'Clôture validée avec 3 chambres occupées.' }
  ];

  const pmsPropertySummaries: PMSPropertySummary[] = [
    { id: 'property-dakar', name: 'Complexe Hôtelier Dakar', city: 'Dakar', rooms: 48, occupiedRooms: 35, revenueToday: 4860000, alerts: 2, adr: 72000, revPar: 52500, outOfOrderRooms: 1 },
    { id: 'property-saly', name: 'Résidence Sartal Saly', city: 'Saly', rooms: 26, occupiedRooms: 20, revenueToday: 2410000, alerts: 1, adr: 65000, revPar: 50000, outOfOrderRooms: 0 },
    { id: 'property-saint-louis', name: 'Maison Sartal Saint-Louis', city: 'Saint-Louis', rooms: 18, occupiedRooms: 11, revenueToday: 1260000, alerts: 0, adr: 54000, revPar: 33000, outOfOrderRooms: 0 }
  ];

  const deliveryOrders: DeliveryOrder[] = [
    {
      id: 'CMD-1024',
      customerName: 'Awa Diop',
      phone: '+221 77 200 14 14',
      address: 'Point E, Dakar',
      channelId: 'pos-5',
      warehouseId: 'wh-delivery',
      status: 'confirmed',
      paymentType: 'wave',
      paymentStatus: 'paid',
      deliveryFee: 1000,
      zone: 'Point E / Fann',
      estimatedMinutes: 45,
      driverName: 'Mamadou Ba',
      driverPhone: '+221 77 420 10 10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: 'Commande exemple pour démontrer réservation, préparation puis sortie stock.',
      items: [
        { productId: 'prod-riz-5kg', quantity: 2, salePrice: 4500 },
        { productId: 'prod-eau-pack', quantity: 3, salePrice: 2500 },
        { productId: 'prod-coca', quantity: 6, salePrice: 1200, substitutionProductId: 'prod-jus-bissap', note: 'Remplacement possible si le Coca passe sous seuil.' },
        { productId: 'prod-eau-kirene', quantity: 12, salePrice: 600 }
      ]
    },
    {
      id: 'CMD-1025',
      customerName: 'Moussa Ndiaye',
      phone: '+221 78 500 30 20',
      address: 'Mermoz, Dakar',
      channelId: 'pos-5',
      warehouseId: 'wh-delivery',
      status: 'confirmed',
      paymentType: 'orange_money',
      paymentStatus: 'paid',
      deliveryFee: 1200,
      zone: 'Mermoz / Sacré-Coeur',
      estimatedMinutes: 50,
      driverName: 'Aïcha Fall',
      driverPhone: '+221 78 311 02 02',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        { productId: 'prod-lait-poudre', quantity: 2, salePrice: 3500 },
        { productId: 'prod-huile-1l', quantity: 4, salePrice: 1600 },
        { productId: 'prod-oignon-1kg', quantity: 3, salePrice: 900 },
        { productId: 'prod-sucre-1kg', quantity: 2, salePrice: 850 },
        { productId: 'prod-jus-ditakh', quantity: 6, salePrice: 1000 }
      ]
    },
    {
      id: 'CMD-1026',
      customerName: 'Mariama Sène',
      phone: '+221 77 450 45 45',
      address: 'Sacré-Coeur 3, Dakar',
      channelId: 'pos-5',
      warehouseId: 'wh-delivery',
      status: 'confirmed',
      paymentType: 'wave',
      paymentStatus: 'paid',
      deliveryFee: 1200,
      zone: 'Mermoz / Sacré-Coeur',
      estimatedMinutes: 55,
      driverName: 'Aïcha Fall',
      driverPhone: '+221 78 311 02 02',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: 'Panier familial typique pour montrer un catalogue livraison plus réaliste.',
      items: [
        { productId: 'prod-cafe-touba', quantity: 3, salePrice: 1800 },
        { productId: 'prod-fonio-1kg', quantity: 2, salePrice: 2200 },
        { productId: 'prod-niebe-1kg', quantity: 2, salePrice: 1300 },
        { productId: 'prod-tomate-concentre', quantity: 6, salePrice: 650 },
        { productId: 'prod-savon-lessive', quantity: 4, salePrice: 500 },
        { productId: 'prod-couches-bebe', quantity: 1, salePrice: 4200 }
      ]
    },
    {
      id: 'CMD-1027',
      customerName: 'Ibrahima Sarr',
      phone: '+221 76 300 18 44',
      address: 'Ouakam, Dakar',
      channelId: 'pos-5',
      warehouseId: 'wh-delivery',
      status: 'confirmed',
      paymentType: 'cash',
      paymentStatus: 'pending',
      deliveryFee: 1500,
      zone: 'Ouakam / Almadies',
      estimatedMinutes: 65,
      driverName: 'Cheikh Ndiaye',
      driverPhone: '+221 76 980 12 12',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: 'Commande snacking local stockable pour tester la réservation et la sortie livraison.',
      items: [
        { productId: 'prod-baguette', quantity: 6, salePrice: 150 },
        { productId: 'prod-thon-boite', quantity: 4, salePrice: 900 },
        { productId: 'prod-attieke-500', quantity: 3, salePrice: 900 },
        { productId: 'prod-poisson-fume', quantity: 2, salePrice: 1800 },
        { productId: 'prod-jus-bissap', quantity: 4, salePrice: 1000 },
        { productId: 'prod-jus-ditakh', quantity: 4, salePrice: 1000 }
      ]
    },
    {
      id: 'CMD-1028',
      customerName: 'Fatou Kane',
      phone: '+221 77 881 22 10',
      address: 'Parcelles Assainies U17, Dakar',
      channelId: 'pos-5',
      warehouseId: 'wh-delivery',
      status: 'failed',
      paymentType: 'cash',
      paymentStatus: 'pending',
      deliveryFee: 2000,
      zone: 'Parcelles / Grand Yoff',
      estimatedMinutes: 80,
      driverName: 'Mamadou Ba',
      driverPhone: '+221 77 420 10 10',
      deliveryIssue: 'Client injoignable après trois appels.',
      returnAction: 'pending_manager_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failedAt: new Date().toISOString(),
      note: 'Cas réel pour montrer les commandes non livrées et le suivi retour.',
      items: [
        { productId: 'prod-lait-poudre', quantity: 1, salePrice: 3500 },
        { productId: 'prod-eau-kirene', quantity: 6, salePrice: 600 },
        { productId: 'prod-jus-bissap', quantity: 2, salePrice: 1000 }
      ]
    }
  ];

  const supplierOrders: SupplierOrder[] = [
    {
      id: 'PO-DAK-240701',
      supplierId: 'sup-premium',
      status: 'ordered',
      createdAt: '2026-07-01T09:15:00.000Z',
      updatedAt: '2026-07-01T09:15:00.000Z',
      items: [
        { productId: 'prod-sirop-cola-epice', quantityOrdered: 28000, quantityReceived: 0, purchasePrice: 32, unit: 'ml' },
        { productId: 'prod-base-soda-premium', quantityOrdered: 21000, quantityReceived: 0, purchasePrice: 24, unit: 'ml' },
        { productId: 'prod-petillant-premium', quantityOrdered: 12, quantityReceived: 0, purchasePrice: 2200, unit: 'bouteille' }
      ]
    },
    {
      id: 'PO-FRESH-240702',
      supplierId: 'sup-fresh',
      status: 'partially_received',
      createdAt: '2026-07-02T07:40:00.000Z',
      updatedAt: '2026-07-02T11:10:00.000Z',
      items: [
        { productId: 'prod-poulet', quantityOrdered: 80, quantityReceived: 45, purchasePrice: 1300, unit: 'unité', expiryDate: '2026-07-10', batchNumber: 'LOT-POULET-R01' },
        { productId: 'prod-samoussa', quantityOrdered: 180, quantityReceived: 140, purchasePrice: 250, unit: 'unité', expiryDate: '2026-07-09', batchNumber: 'LOT-SAMOUSSA-CAS-01' }
      ]
    },
    {
      id: 'PO-MED-240703',
      supplierId: 'sup-grocery',
      status: 'ordered',
      createdAt: '2026-07-03T15:20:00.000Z',
      updatedAt: '2026-07-03T15:20:00.000Z',
      items: [
        { productId: 'prod-cafe-touba', quantityOrdered: 48, quantityReceived: 0, purchasePrice: 1100, unit: 'paquet' },
        { productId: 'prod-fonio-1kg', quantityOrdered: 36, quantityReceived: 0, purchasePrice: 1450, unit: 'paquet' },
        { productId: 'prod-niebe-1kg', quantityOrdered: 48, quantityReceived: 0, purchasePrice: 820, unit: 'paquet' },
        { productId: 'prod-bouillon-sachet', quantityOrdered: 200, quantityReceived: 0, purchasePrice: 85, unit: 'sachet' },
        { productId: 'prod-tomate-concentre', quantityOrdered: 96, quantityReceived: 0, purchasePrice: 390, unit: 'boîte' },
        { productId: 'prod-couches-bebe', quantityOrdered: 24, quantityReceived: 0, purchasePrice: 3100, unit: 'pack' }
      ]
    }
  ];

  const losses: Loss[] = [
    {
      id: 'loss-demo-petillant-nc',
      productId: 'prod-petillant-premium',
      warehouseId: 'wh-nightclub',
      batchId: 'lot-petillant-nc-1',
      quantity: 1,
      reason: 'casse',
      date: '2026-07-02T23:40:00.000Z',
      userId: 'user-stock-mgr',
      userName: 'Responsable Stock',
      note: 'Bouteille cassée au service VIP.'
    },
    {
      id: 'loss-demo-menthe-cas',
      productId: 'prod-menthe',
      warehouseId: 'wh-bar-casino',
      batchId: 'lot-menthe-cas-1',
      quantity: 200,
      reason: 'peremption',
      date: '2026-07-03T10:15:00.000Z',
      userId: 'user-stock-mgr',
      userName: 'Responsable Stock',
      note: 'Menthe fanée après le service du week-end.'
    },
    {
      id: 'loss-demo-samoussa-cas',
      productId: 'prod-samoussa',
      warehouseId: 'wh-bar-casino',
      batchId: 'lot-samoussa-cas-1',
      quantity: 6,
      reason: 'erreur_cuisine',
      date: '2026-07-03T21:20:00.000Z',
      userId: 'user-stock-mgr',
      userName: 'Responsable Stock',
      note: 'Plateau renvoyé en cuisine, déclaré pour garder le coût matière.'
    }
  ];

  losses.forEach(loss => {
    const batch = batches.find(item => item.id === loss.batchId);
    const stock = stocks.find(item => item.productId === loss.productId && item.warehouseId === loss.warehouseId);
    const product = products.find(item => item.id === loss.productId);
    if (batch) batch.quantity = Math.max(0, batch.quantity - loss.quantity);
    if (stock) {
      stock.quantityAvailable = Math.max(0, stock.quantityAvailable - loss.quantity);
      stock.lastUpdated = loss.date;
    }
    movements.push({
      id: `mvt-${loss.id}`,
      companyId: 'comp-1',
      siteId: 'site-1',
      warehouseId: loss.warehouseId,
      productId: loss.productId,
      batchId: loss.batchId,
      type: 'loss',
      quantity: -loss.quantity,
      unit: product?.baseUnit || 'unité',
      cost: batch?.purchaseCost || stock?.averageCost || 0,
      userId: loss.userId,
      userName: loss.userName,
      date: loss.date,
      reason: `Perte déclarée : ${loss.note}`
    });
  });

  return {
    companies,
    sites,
    posList,
    warehouses,
    products,
    posProductAliases,
    posPricing,
    stocks,
    batches,
    movements,
    recipes,
    conversions,
    suppliers,
    supplierOrders,
    transfers: [],
    inventories: [],
    losses,
    externalSales: [],
    externalPOSImportRuns: [],
    deliveryOrders,
    cashSessions: [],
    pmsRooms,
    pmsFolios,
    pmsGuests,
    pmsReservations,
    pmsHousekeepingTasks,
    pmsNightAudits,
    pmsMigrationRuns,
    pmsSettings,
    pmsRatePlans,
    pmsGroups,
    pmsEvents,
    pmsInvoices,
    pmsMaintenanceTickets,
    pmsServiceRequests,
    pmsRateOverrides,
    pmsChannels,
    pmsNotifications,
    pmsAuditLogs,
    pmsPropertySummaries,
    pmsScenarioStep: 0,
    users,
    currentUser: users[0] // Admin by default
  };
};

const ensureHospitalityDemoData = (state: DatabaseState): DatabaseState => {
  if (localStorage.getItem(DEMO_SEED_KEY) === 'done') {
    return state;
  }

  const seedDate = new Date();
  seedDate.setMonth(seedDate.getMonth() - 1);
  const createdAt = seedDate.toISOString();

  if (!state.warehouses.some(item => item.id === 'wh-delivery')) {
    state.warehouses.push({ id: 'wh-delivery', siteId: 'site-1', name: 'Dépôt Préparation Livraison', isColdStorage: false });
  }

  if (!state.posList.some(item => item.id === 'pos-5')) {
    state.posList.push({
      id: 'pos-5',
      siteId: 'site-1',
      name: 'Plateforme Épicerie en ligne',
      type: 'online_grocery',
      defaultWarehouseId: 'wh-delivery',
      authorizedRoles: ['admin', 'director', 'stock_manager']
    });
  }

  const demoSuppliers: Supplier[] = [
    { id: 'sup-premium', name: 'Grossiste Boissons Premium', contact: 'Ibrahima Sarr', phone: '+221 76 300 18 44', email: 'contact@boissonspremium.sn' },
    { id: 'sup-fresh', name: 'Fresh Dakar Volaille & Marée', contact: 'Aïssatou Ba', phone: '+221 78 110 22 90', email: 'orders@freshdakar.sn' },
    { id: 'sup-grocery', name: 'Grossiste Épicerie Médina', contact: 'Cheikh Fall', phone: '+221 77 901 11 32', email: 'medina@grossiste.sn' }
  ];

  demoSuppliers.forEach(supplier => {
    if (!state.suppliers.some(item => item.id === supplier.id)) {
      state.suppliers.push(supplier);
    }
  });

  const demoProducts: Product[] = [
    { id: 'prod-eau-50', name: 'Eau minérale 50 cl', sku: 'EAU50', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 60, isActive: true },
    { id: 'prod-petillant-premium', name: 'Boisson pétillante premium 75 cl', sku: 'PETILLANT75', category: 'Boissons premium', baseUnit: 'bouteille', isStockable: true, globalAlertThreshold: 8, isActive: true },
    { id: 'prod-sirop-menthe-citron', name: 'Sirop menthe citron', sku: 'SIROMENTHE', category: 'Boissons', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 3000, isActive: true },
    { id: 'prod-menthe', name: 'Menthe fraîche', sku: 'MENTHE', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 500, isActive: true },
    { id: 'prod-citron-vert', name: 'Citron vert', sku: 'CITRONVERT', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 30, isActive: true },
    { id: 'prod-sucre-canne', name: 'Sirop sucre de canne', sku: 'SUCRECANNE', category: 'Boissons', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 2000, isActive: true },
    { id: 'prod-riz-parfume', name: 'Riz parfumé', sku: 'RIZPARF', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 25000, isActive: true },
    { id: 'prod-poisson-dorade', name: 'Dorade portion', sku: 'DORADE', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 12, isActive: true },
    { id: 'prod-legumes-mix', name: 'Légumes garniture', sku: 'LEGMIX', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 15000, isActive: true },
    { id: 'prod-mocktail-menthe', name: 'Mocktail menthe citron', sku: 'MOCKMENTHE', category: 'Mocktails', baseUnit: 'verre', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-thieb-signature', name: 'Thieboudienne signature', sku: 'THIEB', category: 'Plats', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-riz-5kg', name: 'Riz parfumé 5 kg', sku: 'RIZ5KG', category: 'Épicerie', baseUnit: 'sac', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-eau-pack', name: 'Pack eau minérale 1,5 L x6', sku: 'EAUPACK6', category: 'Épicerie', baseUnit: 'pack', isStockable: true, globalAlertThreshold: 25, isActive: true },
    { id: 'prod-lait-poudre', name: 'Lait en poudre 400 g', sku: 'LAIT400', category: 'Épicerie', baseUnit: 'boîte', isStockable: true, globalAlertThreshold: 18, isActive: true },
    { id: 'prod-huile-1l', name: 'Huile végétale 1 L', sku: 'HUILE1L', category: 'Épicerie', baseUnit: 'bouteille', isStockable: true, globalAlertThreshold: 24, isActive: true },
    { id: 'prod-oignon-1kg', name: 'Oignons filet 1 kg', sku: 'OIGNON1KG', category: 'Épicerie', baseUnit: 'filet', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-sucre-1kg', name: 'Sucre blanc 1 kg', sku: 'SUCRE1KG', category: 'Épicerie', baseUnit: 'paquet', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-jus-bissap', name: 'Jus bissap 50 cl', sku: 'BISSAP50', category: 'Boissons', baseUnit: 'bouteille', isStockable: true, globalAlertThreshold: 30, isActive: true },
    { id: 'prod-sirop-cola-epice', name: 'Sirop cola épicé', sku: 'COLAEPICE', category: 'Boissons premium', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 5000, isActive: true },
    { id: 'prod-base-soda-premium', name: 'Base soda premium', sku: 'SODAPREMIUM', category: 'Boissons premium', baseUnit: 'ml', isStockable: true, globalAlertThreshold: 5000, isActive: true },
    { id: 'prod-energy-25', name: 'Boisson énergisante 25 cl', sku: 'ENERGY25', category: 'Boissons', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 36, isActive: true },
    { id: 'prod-arachides', name: 'Arachides grillées', sku: 'ARACHIDES', category: 'Snacking', baseUnit: 'g', isStockable: true, globalAlertThreshold: 3000, isActive: true },
    { id: 'prod-samoussa', name: 'Samoussa boeuf', sku: 'SAMOUSSA', category: 'Snacking', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 24, isActive: true },
    { id: 'prod-poulet', name: 'Poulet fermier portion', sku: 'POULET', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 18, isActive: true },
    { id: 'prod-oignon-cuisine', name: 'Oignons cuisine', sku: 'OIGNONCUIS', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 12000, isActive: true },
    { id: 'prod-moutarde', name: 'Moutarde', sku: 'MOUTARDE', category: 'Alimentation', baseUnit: 'g', isStockable: true, globalAlertThreshold: 1500, isActive: true },
    { id: 'prod-citron-jaune', name: 'Citron jaune', sku: 'CITRONJAUNE', category: 'Alimentation', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 25, isActive: true },
    { id: 'prod-energy-cola', name: 'Energy cola', sku: 'ENERGYCOLA', category: 'Mocktails', baseUnit: 'verre', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-tonic-premium', name: 'Tonic premium', sku: 'TONICPREMIUM', category: 'Mocktails', baseUnit: 'verre', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-assiette-tapas', name: 'Assiette tapas casino', sku: 'TAPAS', category: 'Plats', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-yassa-poulet', name: 'Yassa poulet', sku: 'YASSA', category: 'Plats', baseUnit: 'portion', isStockable: false, globalAlertThreshold: 0, isActive: true },
    { id: 'prod-cafe-touba', name: 'Café Touba 250 g', sku: 'CAFE250', category: 'Épicerie', baseUnit: 'paquet', isStockable: true, globalAlertThreshold: 18, isActive: true },
    { id: 'prod-tomate-concentre', name: 'Tomate concentrée 400 g', sku: 'TOMATE400', category: 'Épicerie', baseUnit: 'boîte', isStockable: true, globalAlertThreshold: 24, isActive: true },
    { id: 'prod-savon-lessive', name: 'Savon lessive 400 g', sku: 'SAVON400', category: 'Hygiène', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-couches-bebe', name: 'Couches bébé taille M', sku: 'COUCHESM', category: 'Hygiène', baseUnit: 'pack', isStockable: true, globalAlertThreshold: 12, isActive: true },
    { id: 'prod-fonio-1kg', name: 'Fonio précuit 1 kg', sku: 'FONIO1KG', category: 'Épicerie', baseUnit: 'paquet', isStockable: true, globalAlertThreshold: 18, isActive: true },
    { id: 'prod-niebe-1kg', name: 'Niébé local 1 kg', sku: 'NIEBE1KG', category: 'Épicerie', baseUnit: 'paquet', isStockable: true, globalAlertThreshold: 20, isActive: true },
    { id: 'prod-attieke-500', name: 'Attiéké frais 500 g', sku: 'ATTIEKE500', category: 'Produits frais', baseUnit: 'barquette', isStockable: true, globalAlertThreshold: 16, isActive: true },
    { id: 'prod-bouillon-sachet', name: 'Bouillon cuisine sachet', sku: 'BOUILLON', category: 'Épicerie', baseUnit: 'sachet', isStockable: true, globalAlertThreshold: 40, isActive: true },
    { id: 'prod-poisson-fume', name: 'Poisson fumé local', sku: 'POISFUME', category: 'Produits frais', baseUnit: 'unité', isStockable: true, globalAlertThreshold: 10, isActive: true }
  ];

  demoProducts.forEach(product => {
    if (!state.products.some(item => item.id === product.id)) {
      state.products.push({
        ...product,
        mainSupplierId: product.isStockable ? getDemoSupplierId(product) : product.mainSupplierId
      });
    }
  });

  state.products.forEach(product => {
    if (product.isStockable && !product.mainSupplierId) {
      product.mainSupplierId = getDemoSupplierId(product);
    }
  });

  const aliases: POSProductAlias[] = [
    { externalSku: 'EAU50', externalLabel: 'Eau minérale 50 cl', productId: 'prod-eau-50' },
    { externalSku: 'PETILLANT75', externalLabel: 'Boisson pétillante premium 75 cl', productId: 'prod-petillant-premium' },
    { externalSku: 'MOCKMENTHE', externalLabel: 'Mocktail menthe citron', productId: 'prod-mocktail-menthe' },
    { externalSku: 'THIEB', externalLabel: 'Thieboudienne signature', productId: 'prod-thieb-signature' },
    { externalSku: 'RIZ5KG', externalLabel: 'Riz parfumé 5 kg', posId: 'pos-5', productId: 'prod-riz-5kg' },
    { externalSku: 'EAUPACK6', externalLabel: 'Pack eau 1,5 L x6', posId: 'pos-5', productId: 'prod-eau-pack' },
    { externalSku: 'LAIT400', externalLabel: 'Lait en poudre 400 g', posId: 'pos-5', productId: 'prod-lait-poudre' },
    { externalSku: 'HUILE1L', externalLabel: 'Huile végétale 1 L', posId: 'pos-5', productId: 'prod-huile-1l' },
    { externalSku: 'OIGNON1KG', externalLabel: 'Oignons filet 1 kg', posId: 'pos-5', productId: 'prod-oignon-1kg' },
    { externalSku: 'SUCRE1KG', externalLabel: 'Sucre blanc 1 kg', posId: 'pos-5', productId: 'prod-sucre-1kg' },
    { externalSku: 'BISSAP50', externalLabel: 'Jus bissap 50 cl', posId: 'pos-5', productId: 'prod-jus-bissap' },
    { externalSku: 'ENERGYCOLA', externalLabel: 'Energy cola', productId: 'prod-energy-cola' },
    { externalSku: 'TONICPREMIUM', externalLabel: 'Tonic premium', productId: 'prod-tonic-premium' },
    { externalSku: 'TAPAS', externalLabel: 'Assiette tapas casino', productId: 'prod-assiette-tapas' },
    { externalSku: 'YASSA', externalLabel: 'Yassa poulet', productId: 'prod-yassa-poulet' },
    { externalSku: 'CAFE250', externalLabel: 'Café Touba 250 g', posId: 'pos-5', productId: 'prod-cafe-touba' },
    { externalSku: 'TOMATE400', externalLabel: 'Tomate concentrée 400 g', posId: 'pos-5', productId: 'prod-tomate-concentre' },
    { externalSku: 'SAVON400', externalLabel: 'Savon lessive 400 g', posId: 'pos-5', productId: 'prod-savon-lessive' },
    { externalSku: 'COUCHESM', externalLabel: 'Couches bébé taille M', posId: 'pos-5', productId: 'prod-couches-bebe' },
    { externalSku: 'FONIO1KG', externalLabel: 'Fonio précuit 1 kg', posId: 'pos-5', productId: 'prod-fonio-1kg' },
    { externalSku: 'NIEBE1KG', externalLabel: 'Niébé local 1 kg', posId: 'pos-5', productId: 'prod-niebe-1kg' },
    { externalSku: 'ATTIEKE500', externalLabel: 'Attiéké frais 500 g', posId: 'pos-5', productId: 'prod-attieke-500' },
    { externalSku: 'BOUILLON', externalLabel: 'Bouillon cuisine sachet', posId: 'pos-5', productId: 'prod-bouillon-sachet' },
    { externalSku: 'POISFUME', externalLabel: 'Poisson fumé local', posId: 'pos-5', productId: 'prod-poisson-fume' }
  ];

  aliases.forEach(alias => {
    const exists = state.posProductAliases.some(item => (
      item.externalSku === alias.externalSku && item.productId === alias.productId && item.posId === alias.posId
    ));
    if (!exists) state.posProductAliases.push(alias);
  });

  const pricingRules: POSPricing[] = [
    { productId: 'prod-coca', posId: 'pos-3', salePrice: 2500, taxRate: 20, isAvailable: true },
    { productId: 'prod-tonic-citron', posId: 'pos-3', salePrice: 6000, taxRate: 20, isAvailable: true },
    { productId: 'prod-eau-50', posId: 'pos-1', salePrice: 1000, taxRate: 18, isAvailable: true },
    { productId: 'prod-eau-50', posId: 'pos-2', salePrice: 1500, taxRate: 18, isAvailable: true },
    { productId: 'prod-eau-50', posId: 'pos-3', salePrice: 2000, taxRate: 20, isAvailable: true },
    { productId: 'prod-eau-50', posId: 'pos-4', salePrice: 1200, taxRate: 18, isAvailable: true },
    { productId: 'prod-petillant-premium', posId: 'pos-2', salePrice: 6000, taxRate: 18, isAvailable: true },
    { productId: 'prod-petillant-premium', posId: 'pos-3', salePrice: 8000, taxRate: 20, isAvailable: true },
    { productId: 'prod-petillant-premium', posId: 'pos-4', salePrice: 7000, taxRate: 18, isAvailable: true },
    { productId: 'prod-mocktail-menthe', posId: 'pos-2', salePrice: 5000, taxRate: 18, isAvailable: true },
    { productId: 'prod-mocktail-menthe', posId: 'pos-3', salePrice: 7000, taxRate: 20, isAvailable: true },
    { productId: 'prod-thieb-signature', posId: 'pos-1', salePrice: 9500, taxRate: 18, isAvailable: true },
    { productId: 'prod-thieb-signature', posId: 'pos-4', salePrice: 11000, taxRate: 18, isAvailable: true },
    { productId: 'prod-coca', posId: 'pos-5', salePrice: 1200, taxRate: 18, isAvailable: true },
    { productId: 'prod-riz-5kg', posId: 'pos-5', salePrice: 4500, taxRate: 18, isAvailable: true },
    { productId: 'prod-eau-pack', posId: 'pos-5', salePrice: 2500, taxRate: 18, isAvailable: true },
    { productId: 'prod-lait-poudre', posId: 'pos-5', salePrice: 3500, taxRate: 18, isAvailable: true },
    { productId: 'prod-huile-1l', posId: 'pos-5', salePrice: 1600, taxRate: 18, isAvailable: true },
    { productId: 'prod-oignon-1kg', posId: 'pos-5', salePrice: 900, taxRate: 18, isAvailable: true },
    { productId: 'prod-sucre-1kg', posId: 'pos-5', salePrice: 850, taxRate: 18, isAvailable: true },
    { productId: 'prod-jus-bissap', posId: 'pos-5', salePrice: 1000, taxRate: 18, isAvailable: true },
    { productId: 'prod-energy-cola', posId: 'pos-2', salePrice: 6500, taxRate: 18, isAvailable: true },
    { productId: 'prod-energy-cola', posId: 'pos-3', salePrice: 8500, taxRate: 20, isAvailable: true },
    { productId: 'prod-tonic-premium', posId: 'pos-2', salePrice: 5500, taxRate: 18, isAvailable: true },
    { productId: 'prod-tonic-premium', posId: 'pos-3', salePrice: 7500, taxRate: 20, isAvailable: true },
    { productId: 'prod-assiette-tapas', posId: 'pos-2', salePrice: 7000, taxRate: 18, isAvailable: true },
    { productId: 'prod-assiette-tapas', posId: 'pos-4', salePrice: 8500, taxRate: 18, isAvailable: true, defaultWarehouseId: 'wh-central' },
    { productId: 'prod-yassa-poulet', posId: 'pos-1', salePrice: 8000, taxRate: 18, isAvailable: true },
    { productId: 'prod-yassa-poulet', posId: 'pos-4', salePrice: 9500, taxRate: 18, isAvailable: true, defaultWarehouseId: 'wh-central' },
    { productId: 'prod-cafe-touba', posId: 'pos-5', salePrice: 1800, taxRate: 18, isAvailable: true },
    { productId: 'prod-tomate-concentre', posId: 'pos-5', salePrice: 650, taxRate: 18, isAvailable: true },
    { productId: 'prod-savon-lessive', posId: 'pos-5', salePrice: 500, taxRate: 18, isAvailable: true },
    { productId: 'prod-couches-bebe', posId: 'pos-5', salePrice: 4200, taxRate: 18, isAvailable: true },
    { productId: 'prod-fonio-1kg', posId: 'pos-5', salePrice: 2200, taxRate: 18, isAvailable: true },
    { productId: 'prod-niebe-1kg', posId: 'pos-5', salePrice: 1300, taxRate: 18, isAvailable: true },
    { productId: 'prod-attieke-500', posId: 'pos-5', salePrice: 900, taxRate: 18, isAvailable: true },
    { productId: 'prod-bouillon-sachet', posId: 'pos-5', salePrice: 150, taxRate: 18, isAvailable: true },
    { productId: 'prod-poisson-fume', posId: 'pos-5', salePrice: 1800, taxRate: 18, isAvailable: true }
  ];

  pricingRules.forEach(rule => {
    const index = state.posPricing.findIndex(item => item.productId === rule.productId && item.posId === rule.posId);
    if (index >= 0) {
      state.posPricing[index] = { ...state.posPricing[index], ...rule };
    } else {
      state.posPricing.push(rule);
    }
  });

  const recipes: Recipe[] = [
    {
      id: 'rec-mocktail-menthe',
      productId: 'prod-mocktail-menthe',
      name: 'Mocktail menthe citron',
      ingredients: [
        { productId: 'prod-sirop-menthe-citron', quantity: 50, unit: 'ml' },
        { productId: 'prod-menthe', quantity: 8, unit: 'g' },
        { productId: 'prod-citron-vert', quantity: 0.5, unit: 'unité' },
        { productId: 'prod-sucre-canne', quantity: 20, unit: 'ml' }
      ]
    },
    {
      id: 'rec-thieb-signature',
      productId: 'prod-thieb-signature',
      name: 'Thieboudienne signature',
      ingredients: [
        { productId: 'prod-poisson-dorade', quantity: 1, unit: 'unité' },
        { productId: 'prod-riz-parfume', quantity: 250, unit: 'g' },
        { productId: 'prod-legumes-mix', quantity: 180, unit: 'g' },
        { productId: 'prod-huile', quantity: 25, unit: 'ml' },
        { productId: 'prod-sel', quantity: 3, unit: 'g' }
      ]
    },
    {
      id: 'rec-energy-cola',
      productId: 'prod-energy-cola',
      name: 'Energy cola',
      ingredients: [
        { productId: 'prod-sirop-cola-epice', quantity: 50, unit: 'ml' },
        { productId: 'prod-energy-25', quantity: 1, unit: 'unité' }
      ]
    },
    {
      id: 'rec-tonic-premium',
      productId: 'prod-tonic-premium',
      name: 'Tonic premium',
      ingredients: [
        { productId: 'prod-base-soda-premium', quantity: 50, unit: 'ml' },
        { productId: 'prod-tonic', quantity: 1, unit: 'unité' }
      ]
    },
    {
      id: 'rec-assiette-tapas',
      productId: 'prod-assiette-tapas',
      name: 'Assiette tapas casino',
      ingredients: [
        { productId: 'prod-samoussa', quantity: 4, unit: 'unité' },
        { productId: 'prod-arachides', quantity: 80, unit: 'g' }
      ]
    },
    {
      id: 'rec-yassa-poulet',
      productId: 'prod-yassa-poulet',
      name: 'Yassa poulet',
      ingredients: [
        { productId: 'prod-poulet', quantity: 1, unit: 'unité' },
        { productId: 'prod-riz-parfume', quantity: 220, unit: 'g' },
        { productId: 'prod-oignon-cuisine', quantity: 180, unit: 'g' },
        { productId: 'prod-citron-jaune', quantity: 0.5, unit: 'unité' },
        { productId: 'prod-moutarde', quantity: 30, unit: 'g' },
        { productId: 'prod-huile', quantity: 20, unit: 'ml' }
      ]
    }
  ];

  recipes.forEach(recipe => {
    if (!state.recipes.some(item => item.id === recipe.id)) {
      state.recipes.push(recipe);
    }
  });

  const batches: Batch[] = [
    { id: 'lot-eau-rest-1', productId: 'prod-eau-50', warehouseId: 'wh-restaurant', batchNumber: 'LOT-EAU-REST-01', expiryDate: '2027-02-28', quantity: 240, initialQuantity: 240, supplierId: 'sup-drinks', purchaseCost: 200, createdAt },
    { id: 'lot-eau-cas-1', productId: 'prod-eau-50', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-EAU-CAS-01', expiryDate: '2027-02-28', quantity: 180, initialQuantity: 180, supplierId: 'sup-drinks', purchaseCost: 200, createdAt },
    { id: 'lot-eau-nc-1', productId: 'prod-eau-50', warehouseId: 'wh-nightclub', batchNumber: 'LOT-EAU-NC-01', expiryDate: '2027-02-28', quantity: 120, initialQuantity: 120, supplierId: 'sup-drinks', purchaseCost: 200, createdAt },
    { id: 'lot-eau-central-1', productId: 'prod-eau-50', warehouseId: 'wh-central', batchNumber: 'LOT-EAU-CENT-01', expiryDate: '2027-02-28', quantity: 120, initialQuantity: 120, supplierId: 'sup-drinks', purchaseCost: 200, createdAt },
    { id: 'lot-petillant-cas-1', productId: 'prod-petillant-premium', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-PETILLANT-CAS-01', expiryDate: '2029-12-31', quantity: 12, initialQuantity: 12, supplierId: 'sup-drinks', purchaseCost: 2200, createdAt },
    { id: 'lot-petillant-nc-1', productId: 'prod-petillant-premium', warehouseId: 'wh-nightclub', batchNumber: 'LOT-PETILLANT-NC-01', expiryDate: '2029-12-31', quantity: 18, initialQuantity: 18, supplierId: 'sup-drinks', purchaseCost: 2200, createdAt },
    { id: 'lot-petillant-central-1', productId: 'prod-petillant-premium', warehouseId: 'wh-central', batchNumber: 'LOT-PETILLANT-CENT-01', expiryDate: '2029-12-31', quantity: 8, initialQuantity: 8, supplierId: 'sup-drinks', purchaseCost: 2200, createdAt },
    { id: 'lot-gingembre-rest-1', productId: 'prod-jus-gingembre', warehouseId: 'wh-restaurant', batchNumber: 'LOT-GINGEMBRE-REST-01', expiryDate: '2026-09-30', quantity: 72, initialQuantity: 72, supplierId: 'sup-drinks', purchaseCost: 600, createdAt },
    { id: 'lot-sirop-menthe-cas-1', productId: 'prod-sirop-menthe-citron', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-SIROMENTHE-CAS-01', expiryDate: '2029-12-31', quantity: 9000, initialQuantity: 9000, supplierId: 'sup-drinks', purchaseCost: 10, createdAt },
    { id: 'lot-sirop-menthe-nc-1', productId: 'prod-sirop-menthe-citron', warehouseId: 'wh-nightclub', batchNumber: 'LOT-SIROMENTHE-NC-01', expiryDate: '2029-12-31', quantity: 12000, initialQuantity: 12000, supplierId: 'sup-drinks', purchaseCost: 10, createdAt },
    { id: 'lot-menthe-cas-1', productId: 'prod-menthe', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-MENTHE-CAS-01', expiryDate: '2026-07-06', quantity: 800, initialQuantity: 800, supplierId: 'sup-market', purchaseCost: 8, createdAt },
    { id: 'lot-menthe-nc-1', productId: 'prod-menthe', warehouseId: 'wh-nightclub', batchNumber: 'LOT-MENTHE-NC-01', expiryDate: '2026-07-06', quantity: 1000, initialQuantity: 1000, supplierId: 'sup-market', purchaseCost: 8, createdAt },
    { id: 'lot-citron-cas-1', productId: 'prod-citron-vert', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-CITRON-CAS-01', expiryDate: '2026-07-12', quantity: 60, initialQuantity: 60, supplierId: 'sup-market', purchaseCost: 150, createdAt },
    { id: 'lot-citron-nc-1', productId: 'prod-citron-vert', warehouseId: 'wh-nightclub', batchNumber: 'LOT-CITRON-NC-01', expiryDate: '2026-07-12', quantity: 80, initialQuantity: 80, supplierId: 'sup-market', purchaseCost: 150, createdAt },
    { id: 'lot-sucre-cas-1', productId: 'prod-sucre-canne', warehouseId: 'wh-bar-casino', batchNumber: 'LOT-SUCRE-CAS-01', expiryDate: '2027-04-30', quantity: 3000, initialQuantity: 3000, supplierId: 'sup-drinks', purchaseCost: 2, createdAt },
    { id: 'lot-sucre-nc-1', productId: 'prod-sucre-canne', warehouseId: 'wh-nightclub', batchNumber: 'LOT-SUCRE-NC-01', expiryDate: '2027-04-30', quantity: 4000, initialQuantity: 4000, supplierId: 'sup-drinks', purchaseCost: 2, createdAt },
    { id: 'lot-riz-rest-1', productId: 'prod-riz-parfume', warehouseId: 'wh-restaurant', batchNumber: 'LOT-RIZ-R01', expiryDate: '2027-01-31', quantity: 50000, initialQuantity: 50000, supplierId: 'sup-market', purchaseCost: 0.45, createdAt },
    { id: 'lot-dorade-rest-1', productId: 'prod-poisson-dorade', warehouseId: 'wh-restaurant', batchNumber: 'LOT-DORADE-R01', expiryDate: '2026-07-08', quantity: 40, initialQuantity: 40, supplierId: 'sup-market', purchaseCost: 1800, createdAt },
    { id: 'lot-legumes-rest-1', productId: 'prod-legumes-mix', warehouseId: 'wh-restaurant', batchNumber: 'LOT-LEG-R01', expiryDate: '2026-07-09', quantity: 30000, initialQuantity: 30000, supplierId: 'sup-market', purchaseCost: 0.35, createdAt },
    { id: 'lot-steak-central-1', productId: 'prod-steak', warehouseId: 'wh-central', batchNumber: 'LOT-STEAK-CENT-01', expiryDate: '2026-07-12', quantity: 20, initialQuantity: 20, supplierId: 'sup-market', purchaseCost: 1550, createdAt },
    { id: 'lot-pdt-central-1', productId: 'prod-pdt', warehouseId: 'wh-central', batchNumber: 'LOT-PDT-CENT-01', expiryDate: '2026-07-20', quantity: 50000, initialQuantity: 50000, supplierId: 'sup-market', purchaseCost: 0.5, createdAt },
    { id: 'lot-oil-central-1', productId: 'prod-huile', warehouseId: 'wh-central', batchNumber: 'LOT-HUILE-CENT-01', expiryDate: '2026-12-31', quantity: 10000, initialQuantity: 10000, supplierId: 'sup-market', purchaseCost: 1.5, createdAt },
    { id: 'lot-salt-central-1', productId: 'prod-sel', warehouseId: 'wh-central', batchNumber: 'LOT-SEL-CENT-01', expiryDate: '2027-12-31', quantity: 2000, initialQuantity: 2000, supplierId: 'sup-market', purchaseCost: 0.1, createdAt },
    { id: 'lot-riz-central-1', productId: 'prod-riz-parfume', warehouseId: 'wh-central', batchNumber: 'LOT-RIZ-CENT-01', expiryDate: '2027-01-31', quantity: 20000, initialQuantity: 20000, supplierId: 'sup-market', purchaseCost: 0.45, createdAt },
    { id: 'lot-dorade-central-1', productId: 'prod-poisson-dorade', warehouseId: 'wh-central', batchNumber: 'LOT-DORADE-CENT-01', expiryDate: '2026-07-08', quantity: 20, initialQuantity: 20, supplierId: 'sup-market', purchaseCost: 1800, createdAt },
    { id: 'lot-legumes-central-1', productId: 'prod-legumes-mix', warehouseId: 'wh-central', batchNumber: 'LOT-LEG-CENT-01', expiryDate: '2026-07-09', quantity: 15000, initialQuantity: 15000, supplierId: 'sup-market', purchaseCost: 0.35, createdAt },
    { id: 'lot-coca-delivery-1', productId: 'prod-coca', warehouseId: 'wh-delivery', batchNumber: 'LOT-COCA-LIV-01', expiryDate: '2026-11-30', quantity: 96, initialQuantity: 96, supplierId: 'sup-drinks', purchaseCost: 390, createdAt },
    { id: 'lot-riz5-delivery-1', productId: 'prod-riz-5kg', warehouseId: 'wh-delivery', batchNumber: 'LOT-RIZ5-LIV-01', expiryDate: '2027-02-28', quantity: 45, initialQuantity: 45, supplierId: 'sup-market', purchaseCost: 3000, createdAt },
    { id: 'lot-eaupack-delivery-1', productId: 'prod-eau-pack', warehouseId: 'wh-delivery', batchNumber: 'LOT-EAUPACK-LIV-01', expiryDate: '2027-04-30', quantity: 60, initialQuantity: 60, supplierId: 'sup-drinks', purchaseCost: 1500, createdAt },
    { id: 'lot-lait-delivery-1', productId: 'prod-lait-poudre', warehouseId: 'wh-delivery', batchNumber: 'LOT-LAIT-LIV-01', expiryDate: '2027-01-31', quantity: 36, initialQuantity: 36, supplierId: 'sup-market', purchaseCost: 2400, createdAt },
    { id: 'lot-huile1-delivery-1', productId: 'prod-huile-1l', warehouseId: 'wh-delivery', batchNumber: 'LOT-HUILE1-LIV-01', expiryDate: '2027-06-30', quantity: 48, initialQuantity: 48, supplierId: 'sup-market', purchaseCost: 1050, createdAt },
    { id: 'lot-oignon-delivery-1', productId: 'prod-oignon-1kg', warehouseId: 'wh-delivery', batchNumber: 'LOT-OIGNON-LIV-01', expiryDate: '2026-07-20', quantity: 32, initialQuantity: 32, supplierId: 'sup-market', purchaseCost: 520, createdAt },
    { id: 'lot-sucre1-delivery-1', productId: 'prod-sucre-1kg', warehouseId: 'wh-delivery', batchNumber: 'LOT-SUCRE1-LIV-01', expiryDate: '2027-05-31', quantity: 40, initialQuantity: 40, supplierId: 'sup-market', purchaseCost: 550, createdAt },
    { id: 'lot-bissap-delivery-1', productId: 'prod-jus-bissap', warehouseId: 'wh-delivery', batchNumber: 'LOT-BISSAP-LIV-01', expiryDate: '2026-08-15', quantity: 72, initialQuantity: 72, supplierId: 'sup-drinks', purchaseCost: 420, createdAt },
    { id: 'lot-fonio-delivery-1', productId: 'prod-fonio-1kg', warehouseId: 'wh-delivery', batchNumber: 'LOT-FONIO-LIV-01', expiryDate: '2027-04-30', quantity: 34, initialQuantity: 34, supplierId: 'sup-grocery', purchaseCost: 1450, createdAt },
    { id: 'lot-niebe-delivery-1', productId: 'prod-niebe-1kg', warehouseId: 'wh-delivery', batchNumber: 'LOT-NIEBE-LIV-01', expiryDate: '2027-03-31', quantity: 42, initialQuantity: 42, supplierId: 'sup-grocery', purchaseCost: 820, createdAt },
    { id: 'lot-attieke-delivery-1', productId: 'prod-attieke-500', warehouseId: 'wh-delivery', batchNumber: 'LOT-ATTIEKE-LIV-01', expiryDate: '2026-07-12', quantity: 22, initialQuantity: 22, supplierId: 'sup-fresh', purchaseCost: 520, createdAt },
    { id: 'lot-bouillon-delivery-1', productId: 'prod-bouillon-sachet', warehouseId: 'wh-delivery', batchNumber: 'LOT-BOUILLON-LIV-01', expiryDate: '2027-10-31', quantity: 120, initialQuantity: 120, supplierId: 'sup-grocery', purchaseCost: 85, createdAt },
    { id: 'lot-poisson-fume-delivery-1', productId: 'prod-poisson-fume', warehouseId: 'wh-delivery', batchNumber: 'LOT-POISFUME-LIV-01', expiryDate: '2026-07-14', quantity: 18, initialQuantity: 18, supplierId: 'sup-fresh', purchaseCost: 1100, createdAt }
  ];

  batches.forEach(batch => {
    if (state.batches.some(item => item.id === batch.id)) return;

    state.batches.push(batch);
    const product = state.products.find(item => item.id === batch.productId);
    const stock = state.stocks.find(item => item.productId === batch.productId && item.warehouseId === batch.warehouseId);

    if (stock) {
      const currentValue = stock.quantityAvailable * stock.averageCost;
      stock.quantityAvailable += batch.quantity;
      stock.averageCost = stock.quantityAvailable > 0
        ? (currentValue + (batch.quantity * batch.purchaseCost)) / stock.quantityAvailable
        : batch.purchaseCost;
      stock.lastUpdated = createdAt;
    } else {
      state.stocks.push({
        productId: batch.productId,
        warehouseId: batch.warehouseId,
        quantityAvailable: batch.quantity,
        quantityReserved: 0,
        alertThreshold: product?.globalAlertThreshold || 5,
        averageCost: batch.purchaseCost,
        lastUpdated: createdAt
      });
    }

    const movementId = `mvt-${batch.id}`;
    if (!state.movements.some(item => item.id === movementId)) {
      state.movements.push({
        id: movementId,
        companyId: 'comp-1',
        siteId: 'site-1',
        warehouseId: batch.warehouseId,
        productId: batch.productId,
        batchId: batch.id,
        type: 'purchase_received',
        quantity: batch.initialQuantity,
        unit: product?.baseUnit || 'unité',
        cost: batch.purchaseCost,
        userId: 'user-system',
        userName: 'Données de départ',
        date: createdAt,
        reason: 'Ajout exemples métier'
      });
    }
  });

  const deliveryOrders: DeliveryOrder[] = [
    {
      id: 'CMD-1024',
      customerName: 'Awa Diop',
      phone: '+221 77 200 14 14',
      address: 'Point E, Dakar',
      channelId: 'pos-5',
      warehouseId: 'wh-delivery',
      status: 'confirmed',
      paymentType: 'wave',
      paymentStatus: 'paid',
      deliveryFee: 1000,
      zone: 'Point E / Fann',
      estimatedMinutes: 45,
      driverName: 'Mamadou Ba',
      driverPhone: '+221 77 420 10 10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: 'Commande exemple pour démontrer réservation, préparation puis sortie stock.',
      items: [
        { productId: 'prod-riz-5kg', quantity: 2, salePrice: 4500 },
        { productId: 'prod-eau-pack', quantity: 3, salePrice: 2500 },
        { productId: 'prod-coca', quantity: 6, salePrice: 1200, substitutionProductId: 'prod-jus-bissap', note: 'Remplacement possible si le Coca passe sous seuil.' },
        { productId: 'prod-eau-kirene', quantity: 12, salePrice: 600 }
      ]
    },
    {
      id: 'CMD-1025',
      customerName: 'Moussa Ndiaye',
      phone: '+221 78 500 30 20',
      address: 'Mermoz, Dakar',
      channelId: 'pos-5',
      warehouseId: 'wh-delivery',
      status: 'confirmed',
      paymentType: 'orange_money',
      paymentStatus: 'paid',
      deliveryFee: 1200,
      zone: 'Mermoz / Sacré-Coeur',
      estimatedMinutes: 50,
      driverName: 'Aïcha Fall',
      driverPhone: '+221 78 311 02 02',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        { productId: 'prod-lait-poudre', quantity: 2, salePrice: 3500 },
        { productId: 'prod-huile-1l', quantity: 4, salePrice: 1600 },
        { productId: 'prod-oignon-1kg', quantity: 3, salePrice: 900 },
        { productId: 'prod-sucre-1kg', quantity: 2, salePrice: 850 },
        { productId: 'prod-jus-ditakh', quantity: 6, salePrice: 1000 }
      ]
    },
    {
      id: 'CMD-1026',
      customerName: 'Mariama Sène',
      phone: '+221 77 450 45 45',
      address: 'Sacré-Coeur 3, Dakar',
      channelId: 'pos-5',
      warehouseId: 'wh-delivery',
      status: 'confirmed',
      paymentType: 'wave',
      paymentStatus: 'paid',
      deliveryFee: 1200,
      zone: 'Mermoz / Sacré-Coeur',
      estimatedMinutes: 55,
      driverName: 'Aïcha Fall',
      driverPhone: '+221 78 311 02 02',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: 'Panier familial typique pour montrer un catalogue livraison plus réaliste.',
      items: [
        { productId: 'prod-cafe-touba', quantity: 3, salePrice: 1800 },
        { productId: 'prod-fonio-1kg', quantity: 2, salePrice: 2200 },
        { productId: 'prod-niebe-1kg', quantity: 2, salePrice: 1300 },
        { productId: 'prod-tomate-concentre', quantity: 6, salePrice: 650 },
        { productId: 'prod-savon-lessive', quantity: 4, salePrice: 500 },
        { productId: 'prod-couches-bebe', quantity: 1, salePrice: 4200 }
      ]
    },
    {
      id: 'CMD-1027',
      customerName: 'Ibrahima Sarr',
      phone: '+221 76 300 18 44',
      address: 'Ouakam, Dakar',
      channelId: 'pos-5',
      warehouseId: 'wh-delivery',
      status: 'confirmed',
      paymentType: 'cash',
      paymentStatus: 'pending',
      deliveryFee: 1500,
      zone: 'Ouakam / Almadies',
      estimatedMinutes: 65,
      driverName: 'Cheikh Ndiaye',
      driverPhone: '+221 76 980 12 12',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: 'Commande snacking local stockable pour tester la réservation et la sortie livraison.',
      items: [
        { productId: 'prod-baguette', quantity: 6, salePrice: 150 },
        { productId: 'prod-thon-boite', quantity: 4, salePrice: 900 },
        { productId: 'prod-attieke-500', quantity: 3, salePrice: 900 },
        { productId: 'prod-poisson-fume', quantity: 2, salePrice: 1800 },
        { productId: 'prod-jus-bissap', quantity: 4, salePrice: 1000 },
        { productId: 'prod-jus-ditakh', quantity: 4, salePrice: 1000 }
      ]
    },
    {
      id: 'CMD-1028',
      customerName: 'Fatou Kane',
      phone: '+221 77 881 22 10',
      address: 'Parcelles Assainies U17, Dakar',
      channelId: 'pos-5',
      warehouseId: 'wh-delivery',
      status: 'failed',
      paymentType: 'cash',
      paymentStatus: 'pending',
      deliveryFee: 2000,
      zone: 'Parcelles / Grand Yoff',
      estimatedMinutes: 80,
      driverName: 'Mamadou Ba',
      driverPhone: '+221 77 420 10 10',
      deliveryIssue: 'Client injoignable après trois appels.',
      returnAction: 'pending_manager_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failedAt: new Date().toISOString(),
      note: 'Cas réel pour montrer les commandes non livrées et le suivi retour.',
      items: [
        { productId: 'prod-lait-poudre', quantity: 1, salePrice: 3500 },
        { productId: 'prod-eau-kirene', quantity: 6, salePrice: 600 },
        { productId: 'prod-jus-bissap', quantity: 2, salePrice: 1000 }
      ]
    }
  ];

  deliveryOrders.forEach(order => {
    const index = state.deliveryOrders.findIndex(item => item.id === order.id);
    if (index >= 0) {
      state.deliveryOrders[index] = { ...state.deliveryOrders[index], ...order };
    } else {
      state.deliveryOrders.push(order);
    }
  });

  localStorage.setItem(DEMO_SEED_KEY, 'done');
  return state;
};

const migrateDB = (state: Partial<DatabaseState>): DatabaseState => {
  const posList = (state.posList || []).map(pos => (
    pos.name === 'Restaurant Le Jardin' ? { ...pos, name: 'Restaurant La Terrasse' } : pos
  ));

  const cashSessions = (state.cashSessions || []).map(session => ({
    ...session,
    paymentTotals: {
      ...createEmptyPaymentTotals(),
      ...(session.paymentTotals || {})
    }
  }));
  const pmsRooms = (state.pmsRooms || []).map(room => (
    room.holdUntil && new Date(room.holdUntil).getTime() <= Date.now()
      ? { ...room, holdUntil: undefined, holdBy: undefined, holdReservationId: undefined }
      : room
  ));
  const pmsGuests = [...(state.pmsGuests || [])];
  if (!pmsGuests.some(guest => guest.id === 'guest-coumba')) {
    pmsGuests.push({ id: 'guest-coumba', fullName: 'Coumba Diallo', phone: '+221 77 620 14 52', email: 'coumba.diallo@example.com', nationality: 'Sénégalaise', preferences: 'Étage élevé et chambre calme', stays: 2, loyaltyTier: 'silver' });
  }
  const pmsReservations = (state.pmsReservations || []).map(reservation => ({
    ...reservation,
    requestedRoomType: reservation.requestedRoomType || pmsRooms.find(room => room.id === reservation.roomId)?.roomType || 'Standard'
  }));
  if (!pmsReservations.some(reservation => reservation.id === 'res-unassigned')) {
    const futureArrival = new Date();
    futureArrival.setDate(futureArrival.getDate() + 2);
    const futureDeparture = new Date(futureArrival);
    futureDeparture.setDate(futureDeparture.getDate() + 3);
    pmsReservations.push({
      id: 'res-unassigned', confirmationNumber: 'RSV-240707', guestId: 'guest-coumba', roomId: '', requestedRoomType: 'Chambre Deluxe',
      arrivalDate: futureArrival.toISOString().slice(0, 10), departureDate: futureDeparture.toISOString().slice(0, 10), adults: 2, children: 0,
      status: 'confirmed', source: 'online', nightlyRate: 70000, depositAmount: 35000, notes: 'Chambre précise à attribuer avant l’arrivée.',
      guaranteeType: 'deposit', guaranteeStatus: 'secured', estimatedArrivalTime: '16:30'
    });
  }

  const migratedState: DatabaseState = {
    ...state,
    companies: state.companies || [],
    sites: state.sites || [],
    posList,
    warehouses: state.warehouses || [],
    products: state.products || [],
    posProductAliases: state.posProductAliases || [],
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
    externalPOSImportRuns: state.externalPOSImportRuns || [],
    deliveryOrders: state.deliveryOrders || [],
    cashSessions,
    pmsRooms,
    pmsFolios: (state.pmsFolios || []).map(folio => ({ ...folio, payments: folio.payments || [], charges: (folio.charges || []).map(charge => ({ ...charge, billingWindow: charge.billingWindow || 'guest' })) })),
    pmsGuests,
    pmsReservations,
    pmsHousekeepingTasks: (state.pmsHousekeepingTasks || []).map(task => ({ ...task, linenStatus: task.linenStatus || 'complete', minibarStatus: task.minibarStatus || 'checked', photoCount: task.photoCount || 0 })),
    pmsNightAudits: state.pmsNightAudits || [],
    pmsMigrationRuns: state.pmsMigrationRuns || [],
    pmsRatePlans: (state.pmsRatePlans || []).map(plan => ({ ...plan, minStay: plan.minStay || 1, occupancyAdjustment: plan.occupancyAdjustment ?? (plan.audience === 'public' ? 10 : 0) })),
    pmsGroups: state.pmsGroups || [],
    pmsEvents: state.pmsEvents || [],
    pmsInvoices: state.pmsInvoices || [],
    pmsMaintenanceTickets: state.pmsMaintenanceTickets || [],
    pmsServiceRequests: state.pmsServiceRequests || [
      { id: 'request-204-breakfast', reservationId: 'res-204', roomId: 'room-204', type: 'breakfast', label: 'Petit-déjeuner sans sucre', status: 'completed', priority: 'normal', scheduledAt: new Date().toISOString(), assignedTo: 'Restaurant La Terrasse', amount: 9000 },
      { id: 'request-305-airport', reservationId: 'res-305', roomId: 'room-305', type: 'airport_transfer', label: 'Transfert aéroport', status: 'assigned', priority: 'urgent', scheduledAt: new Date(Date.now() + 86400000).toISOString(), assignedTo: 'Chauffeur Mamadou', amount: 25000 }
    ],
    pmsRateOverrides: state.pmsRateOverrides || Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${state.pmsSettings?.businessDate || new Date().toISOString().slice(0, 10)}T12:00:00`);
      date.setDate(date.getDate() + index);
      const iso = date.toISOString().slice(0, 10);
      const weekend = [0, 6].includes(date.getDay());
      return { id: `override-deluxe-${iso}`, date: iso, roomType: 'Chambre Deluxe', price: weekend ? 82000 : 70000, reason: weekend ? 'Week-end forte demande' : 'Tarif public', closed: false };
    }),
    pmsChannels: state.pmsChannels || [],
    pmsNotifications: state.pmsNotifications || [],
    pmsAuditLogs: state.pmsAuditLogs || [],
    pmsPropertySummaries: state.pmsPropertySummaries || [],
    pmsScenarioStep: state.pmsScenarioStep || 0,
    pmsSettings: state.pmsSettings || {
      hotelName: state.sites?.[0]?.name || 'Complexe Hôtelier Dakar',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      cityTax: 1000,
      vatRate: 18,
      currency: 'XOF',
      businessDate: new Date().toISOString().slice(0, 10),
      allowOverbooking: false,
      overbookingLimit: 0
    },
    users: state.users || [],
    currentUser: state.currentUser || state.users?.[0] || { id: 'user-admin', name: 'Admin', role: 'admin' }
  };

  return ensureHospitalityDemoData(migratedState);
};

export const getDB = (): DatabaseState => {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    const newState = initialDB();
    saveDB(newState);
    localStorage.setItem(DEMO_SEED_KEY, 'done');
    return newState;
  }
  if (localStorage.getItem(DEMO_SEED_KEY) !== 'done') {
    const newState = initialDB();
    saveDB(newState);
    localStorage.setItem(DEMO_SEED_KEY, 'done');
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
  localStorage.setItem(DEMO_SEED_KEY, 'done');
  return newState;
};
