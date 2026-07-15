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
  paymentStatus?: 'pending' | 'partial' | 'paid';
  paymentBreakdown?: Array<{
    amount: number;
    method: PaymentType;
    payerName?: string;
    paidAt: string;
  }>;
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
  originalProductId?: string;
  substitutionProductId?: string;
  substitutionPolicy?: 'replace' | 'contact' | 'refund' | 'cancel_order';
  substitutionStatus?: 'proposed' | 'approved' | 'rejected';
  substitutionRequestedAt?: string;
  note?: string;
}

export interface DeliveryOrder {
  id: string;
  customerId?: string;
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
  deliverySlotId?: string;
  deliverySlotLabel?: string;
  paymentAdjustment?: number;
  zone?: string;
  estimatedMinutes?: number;
  driverName?: string;
  driverPhone?: string;
  amountCollected?: number;
  deliveryIssue?: string;
  landmark?: string;
  deliveryInstructions?: string;
  verificationCode?: string;
  proofStatus?: 'pending' | 'code_verified' | 'photo_confirmed';
  proofPhotoLabel?: string;
  proofSignature?: string;
  proofLatitude?: number;
  proofLongitude?: number;
  proofCompletedAt?: string;
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

export interface SartalCustomerAddress {
  id: string;
  label: string;
  address: string;
  zone: string;
  landmark: string;
  instructions?: string;
  isDefault: boolean;
}

export interface SartalRestaurantPreferences {
  seatingArea: 'no_preference' | 'quiet' | 'terrace' | 'accessible';
  servicePace: 'relaxed' | 'standard' | 'quick';
  dietaryStyle: 'none' | 'vegetarian' | 'halal' | 'low_salt';
  defaultPartySize: number;
}

export interface SartalDeliveryPreferences {
  substitutionPolicy: 'contact' | 'replace' | 'refund';
  dropoffMethod: 'hand_delivery' | 'doorstep' | 'reception';
  preferredWindow: 'morning' | 'afternoon' | 'evening';
  callOnArrival: boolean;
  ecoPackaging: boolean;
}

export interface SartalNotificationPreferences {
  serviceUpdates: boolean;
  reservationReminders: boolean;
  deliveryTracking: boolean;
  loyaltyNews: boolean;
}

export interface SartalPrivacyPreferences {
  shareAcrossServices: boolean;
  personalizedRecommendations: boolean;
  anonymousAnalytics: boolean;
}

export interface SartalCustomer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  preferredLanguage: 'fr' | 'en' | 'wo';
  preferredChannel?: 'whatsapp' | 'sms' | 'email' | 'portal';
  birthday?: string;
  preferences?: string;
  allergies?: string;
  profileConsent: boolean;
  marketingConsent?: boolean;
  guestSession?: boolean;
  defaultPaymentType?: PaymentType;
  restaurantPreferences?: SartalRestaurantPreferences;
  deliveryPreferences?: SartalDeliveryPreferences;
  notificationPreferences?: SartalNotificationPreferences;
  privacyPreferences?: SartalPrivacyPreferences;
  favoriteProductIds?: string[];
  lowBandwidthMode?: boolean;
  householdId?: string;
  corporateAccountId?: string;
  deliveryPlusStatus?: 'active' | 'paused';
  deliveryPlusRenewsAt?: string;
  deliveryPlusJoinedAt?: string;
  deliveryPlusMonthlyFee?: number;
  loyaltyPoints: number;
  loyaltyTier: 'welcome' | 'teranga' | 'signature';
  visits: number;
  totalSpend: number;
  addresses: SartalCustomerAddress[];
}

export interface RestaurantTableReservation {
  id: string;
  customerId: string;
  posId: string;
  date: string;
  time: string;
  guests: number;
  occasion: 'meal' | 'birthday' | 'business' | 'family';
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled';
  tableNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface RestaurantGuestOrderItem {
  productId: string;
  quantity: number;
  salePrice: number;
  note?: string;
}

export interface RestaurantGuestOrderPayment {
  id: string;
  amount: number;
  method: PaymentType;
  paidAt: string;
  payerName?: string;
  cashSessionId?: string;
}

export interface RestaurantGuestOrder {
  id: string;
  customerId: string;
  posId: string;
  reservationId?: string;
  tableNumber?: string;
  folioId?: string;
  roomNumber?: string;
  serviceType: 'dine_in' | 'takeaway' | 'room_service';
  intendedPaymentMethod?: PaymentType;
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
  paymentStatus?: 'pending' | 'partial' | 'paid';
  loyaltyCreditedAt?: string;
  items: RestaurantGuestOrderItem[];
  payments: RestaurantGuestOrderPayment[];
  total: number;
  estimatedMinutes: number;
  createdAt: string;
  updatedAt: string;
  kitchenStartedAt?: string;
  readyAt?: string;
  servedAt?: string;
}

export interface SartalCustomerMessage {
  id: string;
  customerId: string;
  context: 'restaurant' | 'delivery';
  referenceId?: string;
  sender: 'customer' | 'team';
  senderName: string;
  content: string;
  channel?: 'portal' | 'whatsapp' | 'voice' | 'photo';
  attachmentLabel?: string;
  sentAt: string;
  status: 'sent' | 'read';
}

export interface SartalCustomerFeedback {
  id: string;
  customerId: string;
  context: 'restaurant' | 'delivery';
  referenceId: string;
  score: number;
  note?: string;
  submittedAt: string;
  recoveryStatus: 'not_needed' | 'open' | 'resolved';
  assignedTo?: string;
  promisedAt?: string;
  solution?: string;
  compensationPoints?: number;
  resolvedAt?: string;
}

export interface SartalClientAccess {
  id: string;
  customerId: string;
  channel: 'qr' | 'whatsapp' | 'sms';
  destination: string;
  code: string;
  linkToken: string;
  status: 'active' | 'used' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface SartalServiceRequest {
  id: string;
  customerId: string;
  context: 'restaurant' | 'delivery' | 'hotel';
  referenceId?: string;
  type: 'water' | 'waiter' | 'bill' | 'reception' | 'delivery_help' | 'product_help' | 'other';
  label: string;
  note?: string;
  status: 'requested' | 'accepted' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent';
  assignedTo?: string;
  requestedAt: string;
  promisedAt: string;
  completedAt?: string;
}

export interface RestaurantGuestInvite {
  id: string;
  orderId: string;
  fullName: string;
  phone: string;
  status: 'invited' | 'joined' | 'paid';
  shareAmount: number;
  paidAmount?: number;
  paymentMethod?: PaymentType;
  accessCode: string;
  invitedAt: string;
  paidAt?: string;
}

export interface SartalLoyaltyTransaction {
  id: string;
  customerId: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'compensation';
  points: number;
  label: string;
  referenceId?: string;
  date: string;
}

export interface SartalJourneyItem {
  id: string;
  customerId: string;
  context: 'restaurant' | 'delivery' | 'hotel' | 'transport';
  title: string;
  detail: string;
  scheduledAt: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  referenceId?: string;
}

export interface SartalOccasionPlan {
  id: string;
  customerId: string;
  reservationId: string;
  occasion: 'birthday' | 'business' | 'family' | 'romantic' | 'ceremony';
  label: string;
  status: 'planned' | 'ready' | 'completed';
  checklist: Array<{ id: string; label: string; assignedTo: string; completed: boolean }>;
}

export interface SartalHousehold {
  id: string;
  name: string;
  primaryCustomerId: string;
  memberCustomerIds: string[];
  sharedPoints: number;
  sharedPaymentAllowed: boolean;
  sharedCartItems?: Array<{
    productId: string;
    quantity: number;
    addedByCustomerId: string;
    addedAt: string;
  }>;
  sharedCartUpdatedAt?: string;
}

export interface SartalCorporateAccount {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  employeeCustomerIds: string[];
  monthlyLimit: number;
  currentBalance: number;
  billingDay: number;
  status: 'active' | 'suspended';
  benefits: string[];
}

export interface SartalRecurringOrder {
  id: string;
  customerId: string;
  name: string;
  items: Array<{ productId: string; quantity: number }>;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  nextRunAt: string;
  active: boolean;
  lastOrderId?: string;
}

export interface RestaurantWaitlistEntry {
  id: string;
  customerId: string;
  posId: string;
  guests: number;
  quotedMinutes: number;
  status: 'waiting' | 'notified' | 'seated' | 'cancelled';
  joinedAt: string;
  notifiedAt?: string;
  tableNumber?: string;
}

export interface SartalRecoveryPlaybook {
  id: string;
  name: string;
  context: 'restaurant' | 'delivery' | 'all';
  maxScore: number;
  solution: string;
  compensationPoints: number;
  targetMinutes: number;
  managerApproval: boolean;
  active: boolean;
}

export type SartalModule = 'stock' | 'restaurant' | 'delivery' | 'pms';

export interface SartalSiteBrandProfile {
  siteId: string;
  displayName: string;
  primaryColor: string;
  accentColor: string;
  supportPhone: string;
  welcomeMessage: string;
}

export interface SartalBrandSettings {
  establishmentName: string;
  backOfficeName: string;
  staffAppName: string;
  clientAppName: string;
  hotelAppName: string;
  primaryColor: string;
  accentColor: string;
  welcomeTone: 'warm' | 'formal' | 'concise';
  supportPhone: string;
  lowBandwidthDefault: boolean;
  enabledModules: SartalModule[];
  siteProfiles: SartalSiteBrandProfile[];
}

export interface SartalOfflineAction {
  id: string;
  customerId: string;
  actionType: 'service_request' | 'message' | 'feedback' | 'profile';
  summary: string;
  status: 'queued' | 'synced' | 'error';
  createdAt: string;
  syncedAt?: string;
}

export interface SartalDemoRun {
  id: string;
  scenario: 'hotel_restaurant' | 'family_delivery' | 'group_payment';
  label: string;
  evidence: string[];
  status: 'completed';
  completedAt: string;
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
  features?: string[];
  keyStatus?: 'ready' | 'issued' | 'blocked';
  keyCode?: string;
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
  preCheckInStatus?: 'not_started' | 'in_progress' | 'completed';
  consentSignedAt?: string;
  preferredLanguage?: 'fr' | 'en' | 'wo';
  profileConsent?: boolean;
  allergies?: string;
  pillowPreference?: 'soft' | 'firm' | 'none';
  roomTemperature?: 'cool' | 'balanced' | 'warm';
  roomLocationPreference?: 'quiet' | 'high_floor' | 'near_elevator' | 'accessible';
  housekeepingPreference?: 'morning' | 'afternoon' | 'on_request';
  minibarPreference?: 'standard' | 'empty' | 'family';
  communicationPreference?: 'whatsapp' | 'sms' | 'email' | 'portal';
  dietaryPreferences?: string;
  accessibilityNeeds?: string;
  doNotDisturb?: boolean;
  returnStayRequestedAt?: string;
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
  prepayments?: PMSFolioPayment[];
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
  allottedRooms?: number;
  roomingListReceived?: number;
  releaseDate?: string;
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
  type: 'airport_transfer' | 'breakfast' | 'baby_bed' | 'laundry' | 'late_arrival' | 'special_request' | 'room_service' | 'guest_recovery' | 'checkout';
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
  ratesSynced?: number;
  inventorySynced?: number;
  lastError?: string;
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

export interface PMSPackage {
  id: string;
  name: string;
  mealPlan: 'room_only' | 'breakfast' | 'half_board' | 'full_board' | 'experience';
  pricePerNight: number;
  includedServices: string[];
  active: boolean;
}

export interface PMSDoorKey {
  id: string;
  roomId: string;
  reservationId: string;
  code: string;
  status: 'active' | 'revoked' | 'expired';
  issuedAt: string;
  validUntil: string;
  sharedWithIds?: string[];
}

export interface PMSGuestMessage {
  id: string;
  reservationId: string;
  sender: 'guest' | 'team';
  senderName: string;
  channel: 'portal' | 'whatsapp';
  content: string;
  sentAt: string;
  status: 'sent' | 'read';
}

export interface PMSStayCompanion {
  id: string;
  reservationId: string;
  fullName: string;
  phone: string;
  relationship: string;
  invitedAt: string;
  status: 'invited' | 'active';
}

export interface PMSGuestFeedback {
  id: string;
  reservationId: string;
  stage: 'in_stay' | 'post_stay';
  score: number;
  note?: string;
  submittedAt: string;
  recoveryStatus: 'not_needed' | 'open' | 'resolved';
}

export interface PMSDebtorAccount {
  id: string;
  name: string;
  type: 'company' | 'agency' | 'guest';
  balance: number;
  creditLimit: number;
  dueDate: string;
  status: 'current' | 'due' | 'blocked';
}

export interface PMSAutomationRule {
  id: string;
  name: string;
  trigger: 'booking_confirmed' | 'before_arrival' | 'room_ready' | 'balance_due' | 'after_checkout';
  channel: 'whatsapp' | 'sms' | 'email';
  active: boolean;
  sentCount: number;
}

export interface PMSBookingEngineSettings {
  enabled: boolean;
  publicUrl: string;
  depositPercent: number;
  instantConfirmation: boolean;
  lastBookingAt?: string;
  bookingsToday: number;
}

export type EmployeeRole =
  | 'waiter'
  | 'cashier'
  | 'kitchen'
  | 'receptionist'
  | 'housekeeper'
  | 'storekeeper'
  | 'picker'
  | 'driver'
  | 'customer_experience'
  | 'service_manager';

export interface EmployeeProfile {
  id: string;
  employeeNumber: string;
  name: string;
  role: EmployeeRole;
  siteId: string;
  phone: string;
  posId?: string;
  warehouseId?: string;
  active: boolean;
}

export interface EmployeeShift {
  id: string;
  employeeId: string;
  siteId: string;
  role: EmployeeRole;
  assignmentId?: string;
  assignmentLabel: string;
  deviceLabel: string;
  status: 'open' | 'closed';
  startedAt: string;
  endedAt?: string;
}

export interface EmployeeHandover {
  id: string;
  shiftId: string;
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  notes: string;
  incidents: string;
  amountsToCheck: string;
  customersToFollow: string;
  status: 'submitted' | 'acknowledged';
  submittedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface EmployeeMessage {
  id: string;
  siteId: string;
  senderId: string;
  senderName: string;
  audience: EmployeeRole | 'all';
  content: string;
  priority: 'normal' | 'urgent';
  sentAt: string;
  readByEmployeeIds: string[];
}

export type EmployeeApprovalType =
  | 'discount'
  | 'complimentary'
  | 'void'
  | 'cash_difference'
  | 'stock_loss'
  | 'substitution';

export interface EmployeeApproval {
  id: string;
  type: EmployeeApprovalType;
  referenceId: string;
  requestedBy: string;
  requestedByName: string;
  label: string;
  reason: string;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
}

export type UserRole = 'admin' | 'director' | 'stock_manager' | 'storekeeper' | 'pos_manager' | 'auditor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  posId?: string; // For pos_manager, limits access to this POS only
}
