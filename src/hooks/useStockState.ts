import { useState, useEffect, useCallback } from 'react';
import { getDB, saveDB, DatabaseState } from '../db';
import * as stockEngine from '../services/stockEngine';
import { LossReason, POSType } from '../types';

export const useStockState = () => {
  const [db, setDb] = useState<DatabaseState>(() => getDB());

  const refresh = useCallback(() => {
    setDb(getDB());
  }, []);

  // Listen to local storage changes to keep tabs synchronized if they open multiple windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sartal_stock_db') {
        refresh();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  const changeCurrentUser = (userId: string) => {
    const user = db.users.find(u => u.id === userId);
    if (user) {
      const newDb = { ...db, currentUser: user };
      saveDB(newDb);
      setDb(newDb);
    }
  };

  const handleProcessSale = (salePayload: {
    externalSaleId: string;
    siteId: string;
    posId: string;
    items: Array<{ productId: string; quantity: number }>;
    paymentContext: {
      type: 'cash' | 'card' | 'room_charge' | 'other';
      roomNumber?: string;
      amount: number;
    };
  }) => {
    const result = stockEngine.processExternalSale(
      salePayload,
      db.currentUser.id,
      db.currentUser.name
    );
    refresh();
    return result;
  };

  const handleReceiveOrder = (
    orderId: string,
    targetWarehouseId: string,
    itemsReceived: Array<{
      productId: string;
      quantityReceived: number;
      expiryDate?: string;
      batchNumber?: string;
    }>
  ) => {
    stockEngine.receiveSupplierOrder(
      orderId,
      targetWarehouseId,
      itemsReceived,
      db.currentUser.id,
      db.currentUser.name
    );
    refresh();
  };

  const handleTransfer = (
    sourceWarehouseId: string,
    destinationWarehouseId: string,
    items: Array<{ productId: string; quantity: number }>
  ) => {
    stockEngine.executeTransfer(
      sourceWarehouseId,
      destinationWarehouseId,
      items,
      db.currentUser.id,
      db.currentUser.name
    );
    refresh();
  };

  const handleInventory = (
    warehouseId: string,
    items: Array<{ productId: string; realQty: number }>
  ) => {
    stockEngine.executeInventoryAdjustment(
      warehouseId,
      items,
      db.currentUser.id,
      db.currentUser.name
    );
    refresh();
  };

  const handleLoss = (
    productId: string,
    warehouseId: string,
    quantity: number,
    reason: LossReason,
    note: string
  ) => {
    stockEngine.declareLoss(
      productId,
      warehouseId,
      quantity,
      reason,
      note,
      db.currentUser.id,
      db.currentUser.name
    );
    refresh();
  };

  const createSupplierOrder = (
    supplierId: string,
    items: Array<{ productId: string; quantityOrdered: number; purchasePrice: number; unit: string }>
  ) => {
    const newDb = getDB();
    const orderId = `PO-${Date.now().toString().slice(-6)}`;
    const newOrder = {
      id: orderId,
      supplierId,
      status: 'ordered' as const,
      items: items.map(item => ({
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: 0,
        purchasePrice: item.purchasePrice,
        unit: item.unit
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    newDb.supplierOrders.push(newOrder);
    saveDB(newDb);
    refresh();
    return orderId;
  };

  const addProduct = (product: {
    name: string;
    sku: string;
    category: string;
    baseUnit: string;
    isStockable: boolean;
    globalAlertThreshold: number;
    mainSupplierId?: string;
  }) => {
    const newDb = getDB();
    const prodId = `prod-${Date.now()}`;
    const newProd = {
      id: prodId,
      ...product,
      isActive: true
    };
    newDb.products.push(newProd);
    saveDB(newDb);
    refresh();
    return prodId;
  };

  const updateProductPricing = (productId: string, posId: string, salePrice: number, taxRate: number) => {
    const newDb = getDB();
    const idx = newDb.posPricing.findIndex(p => p.productId === productId && p.posId === posId);
    if (idx >= 0) {
      newDb.posPricing[idx].salePrice = salePrice;
      newDb.posPricing[idx].taxRate = taxRate;
    } else {
      newDb.posPricing.push({
        productId,
        posId,
        salePrice,
        taxRate,
        isAvailable: true
      });
    }
    saveDB(newDb);
    refresh();
  };

  const addRecipe = (productId: string, name: string, ingredients: Array<{ productId: string; quantity: number; unit: string }>) => {
    const newDb = getDB();
    const recipeId = `rec-${Date.now()}`;
    const newRecipe = {
      id: recipeId,
      productId,
      name,
      ingredients
    };
    newDb.recipes.push(newRecipe);
    saveDB(newDb);
    refresh();
  };

  const addPOS = (name: string, type: POSType, defaultWarehouseId: string) => {
    const newDb = getDB();
    const posId = `pos-${Date.now()}`;
    newDb.posList.push({
      id: posId,
      siteId: 'site-1',
      name,
      type,
      defaultWarehouseId,
      authorizedRoles: ['admin', 'director', 'pos_manager']
    });
    saveDB(newDb);
    refresh();
  };

  const addWarehouse = (name: string, isColdStorage: boolean) => {
    const newDb = getDB();
    const whId = `wh-${Date.now()}`;
    newDb.warehouses.push({
      id: whId,
      siteId: 'site-1',
      name,
      isColdStorage
    });
    saveDB(newDb);
    refresh();
  };

  const resetAllData = () => {
    const newDb = getDB();
    localStorage.removeItem('sartal_stock_db');
    refresh();
  };

  const togglePMSExport = (saleId: string) => {
    const newDb = getDB();
    const sale = newDb.externalSales.find(s => s.id === saleId);
    if (sale) {
      sale.exportedToPms = !sale.exportedToPms;
      saveDB(newDb);
      refresh();
    }
  };

  return {
    db,
    changeCurrentUser,
    processSale: handleProcessSale,
    receiveOrder: handleReceiveOrder,
    transferStock: handleTransfer,
    inventoryAdjustment: handleInventory,
    declareLoss: handleLoss,
    createSupplierOrder,
    addProduct,
    updateProductPricing,
    addRecipe,
    addPOS,
    addWarehouse,
    togglePMSExport,
    resetAllData
  };
};
export type StockState = ReturnType<typeof useStockState>;
