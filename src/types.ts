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
  | 'online_grocery'
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

export type DeliveryOrderStatus =
  | 'confirmed'
  | 'reserved'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'cancelled';

export type DeliveryPaymentStatus = 'pending' | 'paid' | 'failed';

export interface DeliveryOrderItem {
  productId: string;
  quantity: number;
  salePrice: number;
  substitutionProductId?: string;
  note?: string;
}

export interface DeliveryOrder {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  channelId: string;
  warehouseId: string;
  status: DeliveryOrderStatus;
  paymentType: PaymentType;
  paymentStatus: DeliveryPaymentStatus;
  items: DeliveryOrderItem[];
  deliveryFee: number;
  zone?: string;
  estimatedMinutes?: number;
  driverName?: string;
  driverPhone?: string;
  amountCollected?: number;
  deliveryIssue?: string;
  returnAction?: 'restocked' | 'loss_declared' | 'pending_manager_review';
  createdAt: string;
  updatedAt: string;
  reservedAt?: string;
  preparedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  returnedAt?: string;
  note?: string;
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
export type PMSReservationStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show' | 'waitlisted';
export type PMSHousekeepingStatus = 'clean' | 'dirty' | 'inspected' | 'in_progress';

export interface PMSRoom {
  id: string;
  siteId: string;
  roomNumber: string;
  roomType: string;
  floor: string;
  capacity: number;
  nightlyRate: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  housekeepingStatus: PMSHousekeepingStatus;
  maintenanceNote?: string;
  holdUntil?: string;
  holdBy?: string;
  holdReservationId?: string;
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
  category?: 'room' | 'restaurant' | 'service' | 'tax' | 'adjustment';
  billingWindow?: 'guest' | 'company' | 'agency' | 'group';
}

export interface PMSFolioPayment {
  id: string;
  amount: number;
  method: PaymentType;
  date: string;
  reference?: string;
  kind?: 'deposit' | 'payment' | 'refund' | 'guarantee';
  originPaymentId?: string;
}

export interface PMSFolio {
  id: string;
  roomId: string;
  guestId?: string;
  reservationId?: string;
  guestName: string;
  reservationNumber: string;
  arrivalDate: string;
  departureDate: string;
  status: PMSFolioStatus;
  charges: PMSFolioCharge[];
  payments: PMSFolioPayment[];
}

export interface PMSGuest {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  nationality?: string;
  company?: string;
  preferences?: string;
  stays: number;
  documentType?: 'passport' | 'identity_card' | 'residence_permit';
  documentNumber?: string;
  loyaltyTier?: 'standard' | 'silver' | 'gold';
  incidentNote?: string;
}

export interface PMSReservation {
  id: string;
  confirmationNumber: string;
  guestId: string;
  roomId: string;
  requestedRoomType?: string;
  roomAssignmentLocked?: boolean;
  estimatedArrivalTime?: string;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  children: number;
  status: PMSReservationStatus;
  source: 'direct' | 'phone' | 'agency' | 'company' | 'online';
  nightlyRate: number;
  depositAmount: number;
  notes?: string;
  ratePlanId?: string;
  guaranteeType?: 'deposit' | 'company' | 'card' | 'none';
  guaranteeStatus?: 'secured' | 'pending';
  groupId?: string;
  checkInChecklist?: {
    identity: boolean;
    guarantee: boolean;
    payment: boolean;
    signature: boolean;
    keyIssued: boolean;
    completedAt?: string;
  };
}

export interface PMSHousekeepingTask {
  id: string;
  roomId: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'inspected';
  priority: 'normal' | 'urgent';
  scheduledDate: string;
  note?: string;
  startedAt?: string;
  completedAt?: string;
  linenStatus?: 'complete' | 'missing' | 'damaged';
  minibarStatus?: 'checked' | 'restock';
  photoCount?: number;
}

export interface PMSNightAudit {
  id: string;
  businessDate: string;
  completedAt: string;
  completedBy: string;
  occupiedRooms: number;
  roomRevenue: number;
  posRevenue: number;
  openBalance: number;
  status: 'completed';
}

export interface PMSMigrationRun {
  id: string;
  source: string;
  importedAt: string;
  rooms: number;
  guests: number;
  reservations: number;
  warnings: number;
  status: 'validated' | 'review';
  mappedFields?: number;
  rejectedRows?: number;
  balanceDifference?: number;
}

export interface PMSSettings {
  hotelName: string;
  checkInTime: string;
  checkOutTime: string;
  cityTax: number;
  vatRate: number;
  currency: 'XOF';
  businessDate: string;
  allowOverbooking: boolean;
  overbookingLimit: number;
}

export interface PMSRatePlan {
  id: string;
  name: string;
  roomType: string;
  baseRate: number;
  weekendMultiplier: number;
  validFrom: string;
  validTo: string;
  audience: 'public' | 'company' | 'agency' | 'group';
  active: boolean;
  minStay?: number;
  occupancyAdjustment?: number;
}

export interface PMSGroupBooking {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  roomIds: string[];
  arrivalDate: string;
  departureDate: string;
  billingMode: 'central' | 'individual' | 'mixed';
  status: 'option' | 'confirmed' | 'in_house' | 'closed';
  depositAmount: number;
}

export interface PMSEvent {
  id: string;
  name: string;
  type: 'seminar' | 'meeting' | 'ceremony' | 'banquet';
  date: string;
  venue: string;
  attendees: number;
  cateringAmount: number;
  status: 'option' | 'confirmed' | 'completed';
  groupId?: string;
}

export interface PMSInvoice {
  id: string;
  folioId: string;
  number: string;
  type: 'proforma' | 'invoice' | 'credit_note' | 'receipt';
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  issuedAt: string;
  billedTo: string;
  subtotal: number;
  taxAmount: number;
  cityTaxAmount: number;
  total: number;
}

export interface PMSMaintenanceTicket {
  id: string;
  roomId: string;
  equipment: string;
  priority: 'normal' | 'urgent' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'verified';
  assignedTo: string;
  openedAt: string;
  estimatedCost: number;
  actualCost?: number;
  unavailableUntil?: string;
  photoCount?: number;
  resolvedAt?: string;
  note: string;
}

export interface PMSServiceRequest {
  id: string;
  reservationId: string;
  roomId?: string;
  type: 'airport_transfer' | 'breakfast' | 'baby_bed' | 'laundry' | 'late_arrival' | 'special_request';
  label: string;
  status: 'requested' | 'assigned' | 'in_progress' | 'completed';
  priority: 'normal' | 'urgent';
  scheduledAt: string;
  assignedTo: string;
  amount: number;
  note?: string;
}

export interface PMSRateOverride {
  id: string;
  date: string;
  roomType: string;
  price: number;
  reason: string;
  closed: boolean;
}

export interface PMSChannel {
  id: string;
  name: string;
  type: 'direct' | 'ota' | 'agency' | 'corporate';
  status: 'connected' | 'warning' | 'disconnected';
  lastSync: string;
  reservationsToday: number;
  availabilityIssues: number;
}

export interface PMSNotification {
  id: string;
  reservationId: string;
  channel: 'whatsapp' | 'sms' | 'email';
  type: 'confirmation' | 'arrival_reminder' | 'room_ready' | 'balance_due' | 'post_stay';
  recipient: string;
  status: 'scheduled' | 'sent' | 'failed';
  scheduledAt: string;
  sentAt?: string;
}

export interface PMSAuditLog {
  id: string;
  date: string;
  userName: string;
  action: string;
  entity: string;
  detail: string;
}

export interface PMSPropertySummary {
  id: string;
  name: string;
  city: string;
  rooms: number;
  occupiedRooms: number;
  revenueToday: number;
  alerts: number;
  adr?: number;
  revPar?: number;
  outOfOrderRooms?: number;
}

export type UserRole = 'admin' | 'director' | 'stock_manager' | 'storekeeper' | 'pos_manager' | 'auditor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  posId?: string; // For pos_manager, limits access to this POS only
}
