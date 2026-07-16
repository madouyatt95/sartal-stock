import type { DatabaseState } from '../db';
import type { RestaurantDiningTable } from '../types';

export type RestaurantAvailabilityStatus = 'available' | 'low' | 'out';

export interface RestaurantProductAvailability {
  status: RestaurantAvailabilityStatus;
  availableUnits: number;
  warehouseId?: string;
  warehouseName?: string;
  limitingProductName?: string;
  label: string;
}

export interface RestaurantProductPresentation {
  description: string;
  dietaryTags: string[];
  allergens: string[];
  preparationMinutes: number;
  imageUrl: string;
  imagePosition: string;
}

const PRODUCT_PRESENTATIONS: Record<string, RestaurantProductPresentation> = {
  'prod-thieb-signature': {
    description: 'Riz parfumé, poisson rôti et légumes mijotés, dressés minute.',
    dietaryTags: ['Signature', 'Poisson'],
    allergens: ['Poisson'],
    preparationMinutes: 24,
    imageUrl: './sartal-client-restaurant.jpg',
    imagePosition: '63% 78%'
  },
  'prod-yassa-poulet': {
    description: 'Poulet tendre, oignons fondants et citron, servi avec son accompagnement.',
    dietaryTags: ['Maison', 'Sans arachides'],
    allergens: [],
    preparationMinutes: 20,
    imageUrl: './sartal-client-restaurant.jpg',
    imagePosition: '22% 65%'
  },
  'prod-mafe-boeuf': {
    description: 'Boeuf mijoté dans une sauce onctueuse aux arachides et légumes.',
    dietaryTags: ['Mijoté'],
    allergens: ['Arachides'],
    preparationMinutes: 22,
    imageUrl: './sartal-client-restaurant.jpg',
    imagePosition: '52% 44%'
  },
  'prod-thiakry': {
    description: 'Dessert frais au mil et lait parfumé, préparé dans notre cuisine.',
    dietaryTags: ['Dessert frais', 'Végétarien'],
    allergens: ['Lait'],
    preparationMinutes: 5,
    imageUrl: './sartal-client-restaurant.jpg',
    imagePosition: '88% 48%'
  },
  'prod-jus-gingembre': {
    description: 'Gingembre pressé, citron et sucre dosé à la demande.',
    dietaryTags: ['Local', 'Sans alcool'],
    allergens: [],
    preparationMinutes: 3,
    imageUrl: './sartal-client-restaurant.jpg',
    imagePosition: '73% 34%'
  },
  'prod-jus-bissap': {
    description: 'Infusion d’hibiscus bien fraîche, délicatement parfumée.',
    dietaryTags: ['Local', 'Sans alcool'],
    allergens: [],
    preparationMinutes: 3,
    imageUrl: './sartal-client-restaurant.jpg',
    imagePosition: '30% 32%'
  },
  'prod-jus-ditakh': {
    description: 'Jus de ditakh frais aux notes acidulées, servi très frais.',
    dietaryTags: ['Local', 'Sans alcool'],
    allergens: [],
    preparationMinutes: 3,
    imageUrl: './sartal-client-restaurant.jpg',
    imagePosition: '73% 34%'
  }
};

export const getRestaurantProductPresentation = (productId: string, category: string): RestaurantProductPresentation => (
  PRODUCT_PRESENTATIONS[productId] || {
    description: category === 'Boissons' ? 'Servi frais et préparé selon votre préférence.' : category === 'Desserts' ? 'Préparé avec soin par notre équipe.' : 'Préparé à la commande avec des produits suivis en cuisine.',
    dietaryTags: category === 'Boissons' ? ['Sans alcool'] : [],
    allergens: [],
    preparationMinutes: category === 'Boissons' ? 3 : category === 'Desserts' ? 6 : 18,
    imageUrl: './sartal-client-restaurant.jpg',
    imagePosition: category === 'Boissons' ? '30% 32%' : category === 'Desserts' ? '88% 48%' : '63% 76%'
  }
);

const usableStock = (database: DatabaseState, productId: string, warehouseId: string) => {
  const stock = database.stocks.find(item => item.productId === productId && item.warehouseId === warehouseId);
  return Math.max(0, (stock?.quantityAvailable || 0) - (stock?.quantityReserved || 0));
};

export const getRestaurantProductAvailability = (
  database: DatabaseState,
  posId: string,
  productId: string
): RestaurantProductAvailability => {
  const pos = database.posList.find(item => item.id === posId);
  const pricing = database.posPricing.find(item => item.posId === posId && item.productId === productId);
  const product = database.products.find(item => item.id === productId);
  const warehouseId = pricing?.defaultWarehouseId || pos?.defaultWarehouseId;
  const warehouseName = database.warehouses.find(item => item.id === warehouseId)?.name;

  if (!product || !pricing || !pricing.isAvailable || !warehouseId) {
    return { status: 'out', availableUnits: 0, warehouseId, warehouseName, label: 'Indisponible' };
  }

  const recipe = database.recipes.find(item => item.productId === productId);
  if (recipe?.ingredients.length) {
    const capacities = recipe.ingredients.map(ingredient => {
      const available = usableStock(database, ingredient.productId, warehouseId);
      return {
        portions: ingredient.quantity > 0 ? Math.floor(available / ingredient.quantity) : Number.MAX_SAFE_INTEGER,
        productName: database.products.find(item => item.id === ingredient.productId)?.name || ingredient.productId
      };
    }).sort((a, b) => a.portions - b.portions);
    const limiting = capacities[0];
    const portions = Math.max(0, limiting?.portions || 0);
    const status: RestaurantAvailabilityStatus = portions <= 0 ? 'out' : portions <= 4 ? 'low' : 'available';
    return {
      status,
      availableUnits: portions,
      warehouseId,
      warehouseName,
      limitingProductName: limiting?.productName,
      label: status === 'out' ? `Rupture · ${limiting?.productName || 'ingrédient'}` : status === 'low' ? `${portions} portion(s) · stock faible` : `${portions} portion(s)`
    };
  }

  if (!product.isStockable) {
    return { status: 'available', availableUnits: Number.MAX_SAFE_INTEGER, warehouseId, warehouseName, label: 'Disponible' };
  }

  const available = usableStock(database, productId, warehouseId);
  const stock = database.stocks.find(item => item.productId === productId && item.warehouseId === warehouseId);
  const threshold = Math.max(2, stock?.alertThreshold || product.globalAlertThreshold || 0);
  const status: RestaurantAvailabilityStatus = available <= 0 ? 'out' : available <= threshold ? 'low' : 'available';
  return {
    status,
    availableUnits: available,
    warehouseId,
    warehouseName,
    label: status === 'out' ? 'Rupture' : status === 'low' ? `${available} ${product.baseUnit} · stock faible` : `${available} ${product.baseUnit}`
  };
};

export const getRestaurantProductAlternatives = (
  database: DatabaseState,
  posId: string,
  productId: string,
  limit = 2
) => {
  const product = database.products.find(item => item.id === productId);
  if (!product) return [];
  return database.posPricing
    .filter(item => item.posId === posId && item.productId !== productId && item.isAvailable)
    .map(pricing => ({
      pricing,
      product: database.products.find(item => item.id === pricing.productId),
      availability: getRestaurantProductAvailability(database, posId, pricing.productId)
    }))
    .filter(item => item.product?.isActive && item.product.category === product.category && item.availability.status !== 'out')
    .sort((a, b) => b.availability.availableUnits - a.availability.availableUnits || a.pricing.salePrice - b.pricing.salePrice)
    .slice(0, limit);
};

export interface RestaurantTableSuggestion {
  table: RestaurantDiningTable;
  score: number;
  reasons: string[];
  waiterName?: string;
}

export const getRestaurantTableSuggestions = (
  database: DatabaseState,
  posId: string,
  guests: number,
  customerId?: string,
  limit = 4
): RestaurantTableSuggestion[] => {
  const today = new Date().toISOString().slice(0, 10);
  const customer = database.sartalCustomers.find(item => item.id === customerId);
  const seatingPreference = customer?.restaurantPreferences?.seatingArea;
  const activeOrders = database.restaurantGuestOrders.filter(item => item.posId === posId && !['paid', 'cancelled'].includes(item.status));
  const activeReservations = database.restaurantReservations.filter(item => item.posId === posId && item.date === today && ['confirmed', 'seated'].includes(item.status));
  const waiters = database.employeeProfiles.filter(item => item.posId === posId && item.role === 'waiter' && item.active);

  return database.restaurantDiningTables
    .filter(table => table.posId === posId && table.active && !table.blockedReason && table.capacity >= guests)
    .filter(table => !activeOrders.some(order => order.tableNumber === table.label) && !activeReservations.some(reservation => reservation.tableNumber === table.label))
    .map(table => {
      const waiter = waiters.find(item => item.id === table.assignedEmployeeId);
      const waiterLoad = waiter ? activeOrders.filter(order => database.restaurantDiningTables.find(item => item.posId === posId && item.label === order.tableNumber)?.assignedEmployeeId === waiter.id).length : 0;
      const spareSeats = table.capacity - guests;
      let score = 96 - spareSeats * 7 - waiterLoad * 4;
      const reasons: string[] = [];
      if (spareSeats === 0) reasons.push('capacité exacte');
      else if (spareSeats <= 2) reasons.push('capacité adaptée');
      else reasons.push(`${spareSeats} place(s) libre(s)`);
      if (waiter) reasons.push(`${waiter.name.split(' ')[0]} · ${waiterLoad} table(s)`);
      else reasons.push('équipe commune');
      const zone = table.zone.toLowerCase();
      if (seatingPreference === 'terrace' && zone.includes('terrasse')) { score += 12; reasons.push('préférence terrasse'); }
      if (seatingPreference === 'quiet' && (zone.includes('calme') || zone.includes('salon'))) { score += 12; reasons.push('zone calme'); }
      if (seatingPreference === 'accessible' && (zone.includes('pmr') || table.floor.toLowerCase() === 'rdc')) { score += 12; reasons.push('accès facilité'); }
      return { table, score: Math.max(1, Math.min(100, score)), reasons, waiterName: waiter?.name };
    })
    .sort((a, b) => b.score - a.score || a.table.label.localeCompare(b.table.label))
    .slice(0, limit);
};
