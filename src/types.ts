export interface Company {
  id: string;
  name: string;
}

export interface Site {
  id: string;
  companyId: string;
  name: string;
}

export type POSType =
  | 'restaurant'
  | 'bar'
  | 'night_club'
  | 'casino'
  | 'room_service'
  | 'spa'
  | 'boutique'
  | 'mini_bar'
  | 'other';

export interface POS {
  id: string;
  siteId: string;
  name: string;
  type: POSType;
  defaultWarehouseId: string;
  authorizedRoles: string[];
}

export interface Warehouse {
  id: string;
  siteId: string;
  name: string;
  isColdStorage: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  baseUnit: string;
  isStockable: boolean;
  globalAlertThreshold: number;
  mainSupplierId?: string;
  isActive: boolean;
  imageUrl?: string;
}

export interface POSPricing {
  productId: string;
  posId: string;
  salePrice: number;
  taxRate: number; // e.g., 18 for 18%
  isAvailable: boolean;
  defaultWarehouseId?: string; // Optional override
}

export interface POSProductAlias {
  externalSku: string;
  externalLabel: string;
  posId?: string;
  productId: string;
}

export interface Stock {
  productId: string;
  warehouseId: string;
  quantityAvailable: number;
  quantityReserved: number;
  alertThreshold: number;
  averageCost: number;
  lastUpdated: string; // ISO String
}

export interface Batch {
  id: string;
  productId: string;
  warehouseId: string;
  batchNumber: string;
  expiryDate?: string; // ISO Date (YYYY-MM-DD)
  quantity: number; // current quantity
  initialQuantity: number;
  supplierId: string;
  purchaseCost: number;
  createdAt: string; // ISO date-time
}

export type StockMovementType =
  | 'purchase_received'
  | 'sale_consumption'
  | 'transfer_out'
  | 'transfer_in'
  | 'inventory_adjustment'
  | 'loss'
  | 'production'
  | 'manual_entry'
  | 'correction';

export interface StockMovement {
  id: string;
  companyId: string;
  siteId: string;
  posId?: string; // if related to a POS sale
  warehouseId: string;
  productId: string;
  batchId?: string;
  type: StockMovementType;
  quantity: number; // positive for positive change, negative for reduction
  unit: string;
  cost: number;
  userId: string;
  userName: string;
  date: string; // ISO date-time
  reason: string;
  externalReference?: string;
}

export interface RecipeIngredient {
  productId: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  productId: string; // product that this recipe makes
  name: string;
  ingredients: RecipeIngredient[];
}

export interface UnitConversion {
  id: string;
  productId?: string; // if product-specific (e.g. carton of Coca vs carton of juice)
  fromUnit: string;
  toUnit: string;
  factor: number; // e.g. fromUnit: 'carton', toUnit: 'unité', factor: 24 (1 carton = 24 unités)
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
}

export type SupplierOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'fully_received' | 'cancelled';

export interface SupplierOrderItem {
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
  purchasePrice: number;
  unit: string;
  expiryDate?: string;
  batchNumber?: string;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  status: SupplierOrderStatus;
  items: SupplierOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export type TransferStatus = 'draft' | 'validated' | 'received' | 'cancelled';

export interface TransferItem {
  productId: string;
  quantity: number;
}

export interface Transfer {
  id: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: TransferStatus;
  items: TransferItem[];
  createdAt: string;
  updatedAt: string;
}

export type InventoryStatus = 'draft' | 'in_progress' | 'to_validate' | 'validated';

export interface InventoryItem {
  productId: string;
  theoreticalQty: number;
  realQty: number;
  gap: number;
}

export interface Inventory {
  id: string;
  warehouseId: string;
  status: InventoryStatus;
  items: InventoryItem[];
  date: string;
  createdAt: string;
}

export type LossReason =
  | 'casse'
  | 'vol'
  | 'peremption'
  | 'erreur_cuisine'
  | 'offert'
  | 'consommation_personnel'
  | 'autre';

export interface Loss {
  id: string;
  productId: string;
  warehouseId: string;
  batchId?: string;
  quantity: number;
  reason: LossReason;
  date: string;
  userId: string;
  userName: string;
  note: string;
}

export interface ExternalSaleItem {
  productId: string;
  quantity: number;
  salePrice: number;
}

export type PaymentType = 'cash' | 'card' | 'wave' | 'orange_money' | 'room_charge' | 'other';

export const PAYMENT_TYPES: PaymentType[] = ['cash', 'card', 'wave', 'orange_money', 'room_charge', 'other'];

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  cash: 'Espèces',
  card: 'Carte bancaire',
  wave: 'Wave',
  orange_money: 'Orange Money',
  room_charge: 'Chambre PMS',
  other: 'Autre'
};

export interface ExternalSale {
  id: string;
  externalSaleId: string;
  siteId: string;
  posId: string;
  cashSessionId?: string;
  items: ExternalSaleItem[];
  paymentContext: {
    type: PaymentType;
    roomNumber?: string;
    folioId?: string;
    amount: number;
  };
  exportedToPms: boolean;
  date: string;
}

export interface ExternalPOSSaleRow {
  date: string;
  posCode: string;
  ticketId: string;
  externalSku: string;
  label: string;
  quantity: number;
  amount: number;
  paymentType: PaymentType;
  roomNumber?: string;
}

export interface ExternalPOSImportIssue {
  rowNumber: number;
  ticketId: string;
  message: string;
}

export interface ExternalPOSImportRun {
  id: string;
  sourceName: string;
  importedAt: string;
  rowCount: number;
  ticketCount: number;
  successCount: number;
  rejectedCount: number;
  issues: ExternalPOSImportIssue[];
}

export type CashSessionStatus = 'open' | 'closed';

export type PaymentTotals = Record<PaymentType, number>;

export const createEmptyPaymentTotals = (): PaymentTotals => ({
  cash: 0,
  card: 0,
  wave: 0,
  orange_money: 0,
  room_charge: 0,
  other: 0
});

export interface CashSession {
  id: string;
  posId: string;
  userId: string;
  userName: string;
  openedAt: string;
  openingFloat: number;
  status: CashSessionStatus;
  saleIds: string[];
  paymentTotals: PaymentTotals;
  totalSales: number;
  closedAt?: string;
  closedBy?: string;
  closedByName?: string;
  closingCashDeclared?: number;
  expectedCash?: number;
  cashDifference?: number;
  zReportNumber?: string;
  notes?: string;
}

export type PMSFolioStatus = 'open' | 'closed';
export type PMSChargeStatus = 'pending' | 'exported' | 'reconciled';

export interface PMSRoom {
  id: string;
  siteId: string;
  roomNumber: string;
  roomType: string;
  status: 'occupied' | 'vacant' | 'maintenance';
}

export interface PMSFolioCharge {
  id: string;
  saleId: string;
  externalSaleId: string;
  posId: string;
  label: string;
  amount: number;
  date: string;
  status: PMSChargeStatus;
}

export interface PMSFolio {
  id: string;
  roomId: string;
  guestName: string;
  reservationNumber: string;
  arrivalDate: string;
  departureDate: string;
  status: PMSFolioStatus;
  charges: PMSFolioCharge[];
}

export type UserRole = 'admin' | 'director' | 'stock_manager' | 'storekeeper' | 'pos_manager' | 'auditor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  posId?: string; // For pos_manager, limits access to this POS only
}
