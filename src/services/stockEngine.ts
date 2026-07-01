import { getDB, saveDB, DatabaseState } from '../db';
import {
  Batch,
  Stock,
  StockMovement,
  Recipe,
  UnitConversion,
  ExternalSale,
  SupplierOrder,
  Transfer,
  Inventory,
  Loss,
  Product,
  StockMovementType,
  LossReason
} from '../types';

// Helper to generate IDs
const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Find the unit conversion factor between fromUnit and toUnit for a product
 */
export const getConversionFactor = (
  db: DatabaseState,
  productId: string,
  fromUnit: string,
  toUnit: string
): number => {
  if (fromUnit === toUnit) return 1;

  // Search product-specific conversion first
  const prodConv = db.conversions.find(
    c => c.productId === productId && c.fromUnit.toLowerCase() === fromUnit.toLowerCase() && c.toUnit.toLowerCase() === toUnit.toLowerCase()
  );
  if (prodConv) return prodConv.factor;

  // Search generic conversion
  const genericConv = db.conversions.find(
    c => !c.productId && c.fromUnit.toLowerCase() === fromUnit.toLowerCase() && c.toUnit.toLowerCase() === toUnit.toLowerCase()
  );
  if (genericConv) return genericConv.factor;

  // Reverse conversion
  const reverseProdConv = db.conversions.find(
    c => c.productId === productId && c.fromUnit.toLowerCase() === toUnit.toLowerCase() && c.toUnit.toLowerCase() === fromUnit.toLowerCase()
  );
  if (reverseProdConv) return 1 / reverseProdConv.factor;

  const reverseGenericConv = db.conversions.find(
    c => !c.productId && c.fromUnit.toLowerCase() === toUnit.toLowerCase() && c.toUnit.toLowerCase() === fromUnit.toLowerCase()
  );
  if (reverseGenericConv) return 1 / reverseGenericConv.factor;

  return 1; // Fallback
};

/**
 * FIFO Deduction Engine
 * Deducts quantity from warehouse batches and records stock movements.
 * Throws error if stock is insufficient.
 */
export const deductStockFIFO = (
  db: DatabaseState,
  productId: string,
  warehouseId: string,
  qtyToDeduct: number,
  movementType: StockMovementType,
  reason: string,
  userId: string,
  userName: string,
  posId?: string,
  externalRef?: string
): { movements: StockMovement[]; updatedBatches: Batch[] } => {
  const product = db.products.find(p => p.id === productId);
  if (!product) throw new Error(`Produit introuvable : ${productId}`);
  
  const warehouse = db.warehouses.find(w => w.id === warehouseId);
  if (!warehouse) throw new Error(`Dépôt introuvable : ${warehouseId}`);

  if (!product.isStockable) {
    // Non-stockable products do not hold physical inventory
    return { movements: [], updatedBatches: [] };
  }

  // Find all batches for this product in this warehouse with remaining quantity > 0
  const productBatches = db.batches.filter(
    b => b.productId === productId && b.warehouseId === warehouseId && b.quantity > 0
  );

  const totalAvailable = productBatches.reduce((sum, b) => sum + b.quantity, 0);
  if (totalAvailable < qtyToDeduct) {
    throw new Error(
      `Stock insuffisant pour "${product.name}" dans le dépôt "${warehouse.name}". Requis: ${qtyToDeduct} ${product.baseUnit}, Disponible: ${totalAvailable} ${product.baseUnit}`
    );
  }

  // FIFO sorting:
  // 1. By expiryDate ascending (earliest expiry first). Nulls/empty go last.
  // 2. By createdAt ascending (earliest received first).
  const sortedBatches = [...productBatches].sort((a, b) => {
    if (a.expiryDate && b.expiryDate) {
      return a.expiryDate.localeCompare(b.expiryDate);
    }
    if (a.expiryDate && !b.expiryDate) return -1; // a expires, b doesn't -> a first
    if (!a.expiryDate && b.expiryDate) return 1;  // b expires, a doesn't -> b first
    // If neither expires or they expire at the same time, sort by creation date
    return a.createdAt.localeCompare(b.createdAt);
  });

  let remainingToDeduct = qtyToDeduct;
  const createdMovements: StockMovement[] = [];
  const updatedBatches: Batch[] = [];

  for (const batch of sortedBatches) {
    if (remainingToDeduct <= 0) break;

    const deductFromThisBatch = Math.min(batch.quantity, remainingToDeduct);
    batch.quantity -= deductFromThisBatch;
    remainingToDeduct -= deductFromThisBatch;

    updatedBatches.push(batch);

    // Create stock movement
    const movement: StockMovement = {
      id: genId('mvt'),
      companyId: 'comp-1',
      siteId: warehouse.siteId,
      posId,
      warehouseId,
      productId,
      batchId: batch.id,
      type: movementType,
      quantity: -deductFromThisBatch,
      unit: product.baseUnit,
      cost: batch.purchaseCost,
      userId,
      userName,
      date: new Date().toISOString(),
      reason,
      externalReference: externalRef
    };

    db.movements.push(movement);
    createdMovements.push(movement);
  }

  // Update Stock summary record
  const stockIndex = db.stocks.findIndex(s => s.productId === productId && s.warehouseId === warehouseId);
  const remainingBatches = db.batches.filter(b => b.productId === productId && b.warehouseId === warehouseId && b.quantity > 0);
  const newTotalQty = remainingBatches.reduce((sum, b) => sum + b.quantity, 0);

  if (stockIndex >= 0) {
    const stock = db.stocks[stockIndex];
    stock.quantityAvailable = newTotalQty;
    stock.lastUpdated = new Date().toISOString();
    
    // Recalculate average cost based on remaining batches
    if (newTotalQty > 0) {
      const totalCost = remainingBatches.reduce((sum, b) => sum + (b.quantity * b.purchaseCost), 0);
      stock.averageCost = totalCost / newTotalQty;
    }
  } else {
    // Should not happen since we checked stock availability, but just in case
    db.stocks.push({
      productId,
      warehouseId,
      quantityAvailable: newTotalQty,
      quantityReserved: 0,
      alertThreshold: product.globalAlertThreshold || 0,
      averageCost: 0,
      lastUpdated: new Date().toISOString()
    });
  }

  return { movements: createdMovements, updatedBatches };
};

/**
 * Add stock to a warehouse (creating or updating a batch, updating stock averages, and logging movement)
 */
export const addStock = (
  db: DatabaseState,
  productId: string,
  warehouseId: string,
  quantity: number,
  purchaseCost: number,
  supplierId: string,
  movementType: StockMovementType,
  reason: string,
  userId: string,
  userName: string,
  batchNumber?: string,
  expiryDate?: string,
  externalRef?: string
): StockMovement => {
  const product = db.products.find(p => p.id === productId);
  if (!product) throw new Error(`Produit introuvable : ${productId}`);

  const warehouse = db.warehouses.find(w => w.id === warehouseId);
  if (!warehouse) throw new Error(`Dépôt introuvable : ${warehouseId}`);

  if (!product.isStockable) {
    return {
      id: genId('mvt-nonstock'),
      companyId: 'comp-1',
      siteId: warehouse.siteId,
      warehouseId,
      productId,
      type: movementType,
      quantity,
      unit: product.baseUnit,
      cost: purchaseCost,
      userId,
      userName,
      date: new Date().toISOString(),
      reason: `${reason} (Produit non stockable)`
    };
  }

  // Create Batch
  const finalBatchNumber = batchNumber || `LOT-REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  
  // Look for existing batch in same warehouse with same lot number, supplier, cost, and expiry date to combine
  let batch = db.batches.find(
    b => b.productId === productId && 
         b.warehouseId === warehouseId && 
         b.batchNumber === finalBatchNumber &&
         b.purchaseCost === purchaseCost &&
         b.expiryDate === expiryDate
  );

  if (batch) {
    batch.quantity += quantity;
    batch.initialQuantity += quantity;
  } else {
    batch = {
      id: genId('lot'),
      productId,
      warehouseId,
      batchNumber: finalBatchNumber,
      expiryDate,
      quantity,
      initialQuantity: quantity,
      supplierId,
      purchaseCost,
      createdAt: new Date().toISOString()
    };
    db.batches.push(batch);
  }

  // Create stock movement
  const movement: StockMovement = {
    id: genId('mvt'),
    companyId: 'comp-1',
    siteId: warehouse.siteId,
    warehouseId,
    productId,
    batchId: batch.id,
    type: movementType,
    quantity,
    unit: product.baseUnit,
    cost: purchaseCost,
    userId,
    userName,
    date: new Date().toISOString(),
    reason,
    externalReference: externalRef
  };
  db.movements.push(movement);

  // Update Stock Summary
  const stockIndex = db.stocks.findIndex(s => s.productId === productId && s.warehouseId === warehouseId);
  if (stockIndex >= 0) {
    const stock = db.stocks[stockIndex];
    const oldQty = stock.quantityAvailable;
    const oldCost = stock.averageCost;
    
    stock.quantityAvailable += quantity;
    stock.lastUpdated = new Date().toISOString();
    
    // Weighted average cost recalculation
    if (stock.quantityAvailable > 0) {
      stock.averageCost = ((oldQty * oldCost) + (quantity * purchaseCost)) / stock.quantityAvailable;
    }
  } else {
    db.stocks.push({
      productId,
      warehouseId,
      quantityAvailable: quantity,
      quantityReserved: 0,
      alertThreshold: product.globalAlertThreshold || 0,
      averageCost: purchaseCost,
      lastUpdated: new Date().toISOString()
    });
  }

  return movement;
};

/**
 * Process a POS Sale payload (POS API Simulator)
 */
export const processExternalSale = (
  salePayload: {
    externalSaleId: string;
    siteId: string;
    posId: string;
    items: Array<{ productId: string; quantity: number }>;
    paymentContext: {
      type: 'cash' | 'card' | 'room_charge' | 'other';
      roomNumber?: string;
      amount: number;
    };
  },
  userId: string,
  userName: string
): { success: boolean; error?: string; movements: StockMovement[] } => {
  const db = getDB();

  try {
    const pos = db.posList.find(p => p.id === salePayload.posId);
    if (!pos) throw new Error(`POS introuvable : ${salePayload.posId}`);

    const createdMovements: StockMovement[] = [];

    // Check availability first to avoid partial deductions
    for (const item of salePayload.items) {
      const product = db.products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Produit introuvable : ${item.productId}`);

      // Determine output warehouse
      const pricing = db.posPricing.find(p => p.productId === item.productId && p.posId === salePayload.posId);
      const targetWarehouseId = pricing?.defaultWarehouseId || pos.defaultWarehouseId;
      if (!targetWarehouseId) throw new Error(`Aucun dépôt configuré pour le point de vente "${pos.name}" ou le produit "${product.name}"`);

      // Resolve Recipe (BOM)
      const recipe = db.recipes.find(r => r.productId === product.id);

      if (recipe) {
        // Resolve ingredients
        for (const ing of recipe.ingredients) {
          const ingProduct = db.products.find(p => p.id === ing.productId);
          if (!ingProduct) throw new Error(`Ingrédient introuvable dans le catalogue : ${ing.productId}`);

          const totalNeeded = ing.quantity * item.quantity;
          
          // Verify stock in target warehouse
          const availableStock = db.stocks.find(s => s.productId === ing.productId && s.warehouseId === targetWarehouseId);
          const currentQty = availableStock?.quantityAvailable || 0;
          if (currentQty < totalNeeded) {
            throw new Error(
              `Stock insuffisant pour l'ingrédient "${ingProduct.name}" (Recette: ${product.name}) dans le dépôt "${db.warehouses.find(w => w.id === targetWarehouseId)?.name}". Requis: ${totalNeeded} ${ingProduct.baseUnit}, Disponible: ${currentQty} ${ingProduct.baseUnit}`
            );
          }
        }
      } else if (product.isStockable) {
        // Verify direct product stock
        const availableStock = db.stocks.find(s => s.productId === product.id && s.warehouseId === targetWarehouseId);
        const currentQty = availableStock?.quantityAvailable || 0;
        if (currentQty < item.quantity) {
          throw new Error(
            `Stock insuffisant pour "${product.name}" dans le dépôt "${db.warehouses.find(w => w.id === targetWarehouseId)?.name}". Requis: ${item.quantity} ${product.baseUnit}, Disponible: ${currentQty} ${product.baseUnit}`
          );
        }
      }
    }

    // All stocks verified, execute deductions
    for (const item of salePayload.items) {
      const product = db.products.find(p => p.id === item.productId)!;
      const pricing = db.posPricing.find(p => p.productId === item.productId && p.posId === salePayload.posId);
      const targetWarehouseId = pricing?.defaultWarehouseId || pos.defaultWarehouseId;
      const recipe = db.recipes.find(r => r.productId === product.id);

      const reason = `Vente POS ${pos.name} (${salePayload.externalSaleId})`;

      if (recipe) {
        // Deduct recipe ingredients
        for (const ing of recipe.ingredients) {
          const totalNeeded = ing.quantity * item.quantity;
          const { movements } = deductStockFIFO(
            db,
            ing.productId,
            targetWarehouseId,
            totalNeeded,
            'sale_consumption',
            `${reason} - Consommation ingrédient pour Recette "${product.name}"`,
            userId,
            userName,
            pos.id,
            salePayload.externalSaleId
          );
          createdMovements.push(...movements);
        }
      } else {
        // Deduct direct product
        const { movements } = deductStockFIFO(
          db,
          product.id,
          targetWarehouseId,
          item.quantity,
          'sale_consumption',
          reason,
          userId,
          userName,
          pos.id,
          salePayload.externalSaleId
        );
        createdMovements.push(...movements);
      }
    }

    // Save sale logs
    const saleItems = salePayload.items.map(item => {
      const pricing = db.posPricing.find(p => p.productId === item.productId && p.posId === salePayload.posId);
      return {
        productId: item.productId,
        quantity: item.quantity,
        salePrice: pricing?.salePrice || 0
      };
    });

    const newSale: ExternalSale = {
      id: genId('sale'),
      externalSaleId: salePayload.externalSaleId,
      siteId: salePayload.siteId,
      posId: salePayload.posId,
      items: saleItems,
      paymentContext: salePayload.paymentContext,
      exportedToPms: false,
      date: new Date().toISOString()
    };

    db.externalSales.push(newSale);
    saveDB(db);

    return { success: true, movements: createdMovements };
  } catch (error: any) {
    console.error("Sale process error: ", error.message);
    return { success: false, error: error.message, movements: [] };
  }
};

/**
 * Receive a Supplier Purchase Order
 */
export const receiveSupplierOrder = (
  orderId: string,
  targetWarehouseId: string,
  itemsReceived: Array<{
    productId: string;
    quantityReceived: number;
    expiryDate?: string;
    batchNumber?: string;
  }>,
  userId: string,
  userName: string
): void => {
  const db = getDB();
  const orderIndex = db.supplierOrders.findIndex(o => o.id === orderId);
  if (orderIndex < 0) throw new Error(`Commande fournisseur introuvable : ${orderId}`);

  const order = db.supplierOrders[orderIndex];

  itemsReceived.forEach(receiptItem => {
    const orderItem = order.items.find(item => item.productId === receiptItem.productId);
    if (!orderItem) return;

    if (receiptItem.quantityReceived <= 0) return;

    orderItem.quantityReceived += receiptItem.quantityReceived;
    orderItem.expiryDate = receiptItem.expiryDate;
    orderItem.batchNumber = receiptItem.batchNumber;

    // Add stock
    addStock(
      db,
      receiptItem.productId,
      targetWarehouseId,
      receiptItem.quantityReceived,
      orderItem.purchasePrice,
      order.supplierId,
      'purchase_received',
      `Réception commande fournisseur ${order.id}`,
      userId,
      userName,
      receiptItem.batchNumber,
      receiptItem.expiryDate,
      order.id
    );
  });

  // Re-evaluate order status
  let allFullyReceived = true;
  let hasSomeReceived = false;

  order.items.forEach(item => {
    if (item.quantityReceived < item.quantityOrdered) {
      allFullyReceived = false;
    }
    if (item.quantityReceived > 0) {
      hasSomeReceived = true;
    }
  });

  if (allFullyReceived) {
    order.status = 'fully_received';
  } else if (hasSomeReceived) {
    order.status = 'partially_received';
  }

  order.updatedAt = new Date().toISOString();
  saveDB(db);
};

/**
 * Execute inter-warehouse stock transfer
 */
export const executeTransfer = (
  sourceWarehouseId: string,
  destinationWarehouseId: string,
  items: Array<{ productId: string; quantity: number }>,
  userId: string,
  userName: string
): void => {
  const db = getDB();

  const sourceWh = db.warehouses.find(w => w.id === sourceWarehouseId);
  const destWh = db.warehouses.find(w => w.id === destinationWarehouseId);
  if (!sourceWh || !destWh) throw new Error("Dépôt source ou destination introuvable");

  const transferId = genId('trans');

  // Verify stock availability in source depot first
  items.forEach(item => {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) throw new Error(`Produit introuvable: ${item.productId}`);
    if (!product.isStockable) return;

    const available = db.stocks.find(s => s.productId === item.productId && s.warehouseId === sourceWarehouseId);
    const qty = available?.quantityAvailable || 0;
    if (qty < item.quantity) {
      throw new Error(`Stock insuffisant de "${product.name}" dans "${sourceWh.name}". Requis: ${item.quantity}, Disponible: ${qty}`);
    }
  });

  // Create Transfer document
  const transfer: Transfer = {
    id: transferId,
    sourceWarehouseId,
    destinationWarehouseId,
    status: 'received', // Auto-receive for simplicity of simulation
    items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  items.forEach(item => {
    const product = db.products.find(p => p.id === item.productId)!;
    if (!product.isStockable) return;

    // Get FIFO details of deducted batches to transfer them with exact batch info (cost, expiry, lot number)
    const { movements } = deductStockFIFO(
      db,
      item.productId,
      sourceWarehouseId,
      item.quantity,
      'transfer_out',
      `Transfert vers ${destWh.name} (Ref: ${transferId})`,
      userId,
      userName,
      undefined,
      transferId
    );

    // Recreate those exact batches in destination warehouse
    movements.forEach(mvt => {
      // Deducted quantity is negative in movement, so make it positive for receiving
      const qtyTransferred = Math.abs(mvt.quantity);
      // Find original batch details
      const originalBatch = db.batches.find(b => b.id === mvt.batchId);
      const batchNumber = originalBatch?.batchNumber || `LOT-TR-${transferId}`;
      const expiryDate = originalBatch?.expiryDate;
      const supplierId = originalBatch?.supplierId || 'unknown';

      addStock(
        db,
        item.productId,
        destinationWarehouseId,
        qtyTransferred,
        mvt.cost, // keep original cost
        supplierId,
        'transfer_in',
        `Transfert depuis ${sourceWh.name} (Ref: ${transferId})`,
        userId,
        userName,
        batchNumber,
        expiryDate,
        transferId
      );
    });
  });

  db.transfers.push(transfer);
  saveDB(db);
};

/**
 * Execute Inventory Adjustment
 */
export const executeInventoryAdjustment = (
  warehouseId: string,
  items: Array<{ productId: string; realQty: number }>,
  userId: string,
  userName: string
): void => {
  const db = getDB();
  const warehouse = db.warehouses.find(w => w.id === warehouseId);
  if (!warehouse) throw new Error("Dépôt introuvable");

  const inventoryId = genId('inv');
  const inventoryItems: Array<{ productId: string; theoreticalQty: number; realQty: number; gap: number }> = [];

  items.forEach(item => {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) return;

    const stock = db.stocks.find(s => s.productId === item.productId && s.warehouseId === warehouseId);
    const theoreticalQty = stock?.quantityAvailable || 0;
    const gap = item.realQty - theoreticalQty;

    inventoryItems.push({
      productId: item.productId,
      theoreticalQty,
      realQty: item.realQty,
      gap
    });

    if (gap === 0) return;

    if (gap < 0) {
      // Shortage -> Deduct FIFO
      deductStockFIFO(
        db,
        item.productId,
        warehouseId,
        Math.abs(gap),
        'inventory_adjustment',
        `Ajustement inventaire (Ref: ${inventoryId}) - Écart négatif`,
        userId,
        userName,
        undefined,
        inventoryId
      );
    } else {
      // Surplus -> Add stock
      const avgCost = stock?.averageCost || 0;
      addStock(
        db,
        item.productId,
        warehouseId,
        gap,
        avgCost, // Use average cost for adjustment surplus
        'unknown',
        'inventory_adjustment',
        `Ajustement inventaire (Ref: ${inventoryId}) - Écart positif`,
        userId,
        userName,
        `LOT-INV-${inventoryId}`,
        undefined,
        inventoryId
      );
    }
  });

  const newInventory: Inventory = {
    id: inventoryId,
    warehouseId,
    status: 'validated', // Auto-validated for simplicity
    items: inventoryItems,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  db.inventories.push(newInventory);
  saveDB(db);
};

/**
 * Declare Stock Loss
 */
export const declareLoss = (
  productId: string,
  warehouseId: string,
  quantity: number,
  reason: LossReason,
  note: string,
  userId: string,
  userName: string
): void => {
  const db = getDB();
  const product = db.products.find(p => p.id === productId);
  if (!product) throw new Error("Produit introuvable");

  const warehouse = db.warehouses.find(w => w.id === warehouseId);
  if (!warehouse) throw new Error("Dépôt introuvable");

  // FIFO Deduct
  const { movements } = deductStockFIFO(
    db,
    productId,
    warehouseId,
    quantity,
    'loss',
    `Déclaration de perte (${reason}): ${note}`,
    userId,
    userName
  );

  const lossId = genId('loss');
  const newLoss: Loss = {
    id: lossId,
    productId,
    warehouseId,
    batchId: movements[0]?.batchId, // link to first affected batch for tracking
    quantity,
    reason,
    date: new Date().toISOString(),
    userId,
    userName,
    note
  };

  db.losses.push(newLoss);
  saveDB(db);
};
