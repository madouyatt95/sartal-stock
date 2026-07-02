import { useState, useEffect, useCallback } from 'react';
import { getDB, saveDB, DatabaseState } from '../db';
import * as stockEngine from '../services/stockEngine';
import { ExternalPOSSaleRow, LossReason, PaymentTotals, POSType, Product, Supplier } from '../types';

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
      folioId?: string;
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

  const updateProduct = (productId: string, patch: Partial<Omit<Product, 'id'>>) => {
    const newDb = getDB();
    const product = newDb.products.find(item => item.id === productId);
    if (!product) throw new Error("Produit introuvable");

    Object.assign(product, patch);
    saveDB(newDb);
    refresh();
  };

  const deleteProduct = (productId: string) => {
    const newDb = getDB();
    const product = newDb.products.find(item => item.id === productId);
    if (!product) throw new Error("Produit introuvable");

    newDb.products = newDb.products.filter(item => item.id !== productId);
    newDb.posPricing = newDb.posPricing.filter(item => item.productId !== productId);
    newDb.posProductAliases = newDb.posProductAliases.filter(item => item.productId !== productId);
    newDb.recipes = newDb.recipes
      .filter(recipe => recipe.productId !== productId)
      .map(recipe => ({
        ...recipe,
        ingredients: recipe.ingredients.filter(ingredient => ingredient.productId !== productId)
      }));
    newDb.stocks = newDb.stocks.filter(item => item.productId !== productId);
    newDb.batches = newDb.batches.filter(item => item.productId !== productId);
    newDb.movements = newDb.movements.filter(item => item.productId !== productId);
    newDb.losses = newDb.losses.filter(item => item.productId !== productId);
    newDb.supplierOrders = newDb.supplierOrders.map(order => ({
      ...order,
      items: order.items.filter(item => item.productId !== productId)
    }));
    newDb.transfers = newDb.transfers.map(transfer => ({
      ...transfer,
      items: transfer.items.filter(item => item.productId !== productId)
    }));
    newDb.inventories = newDb.inventories.map(inventory => ({
      ...inventory,
      items: inventory.items.filter(item => item.productId !== productId)
    }));
    newDb.externalSales = newDb.externalSales
      .map(sale => ({ ...sale, items: sale.items.filter(item => item.productId !== productId) }))
      .filter(sale => sale.items.length > 0);

    saveDB(newDb);
    refresh();
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

  const updatePOS = (posId: string, patch: { name: string; type: POSType; defaultWarehouseId: string }) => {
    const newDb = getDB();
    const pos = newDb.posList.find(item => item.id === posId);
    if (!pos) throw new Error("Point de vente introuvable");

    pos.name = patch.name;
    pos.type = patch.type;
    pos.defaultWarehouseId = patch.defaultWarehouseId;
    saveDB(newDb);
    refresh();
  };

  const deletePOS = (posId: string) => {
    const newDb = getDB();
    const pos = newDb.posList.find(item => item.id === posId);
    if (!pos) throw new Error("Point de vente introuvable");

    newDb.posList = newDb.posList.filter(item => item.id !== posId);
    newDb.posPricing = newDb.posPricing.filter(item => item.posId !== posId);
    newDb.posProductAliases = newDb.posProductAliases.filter(item => item.posId !== posId);
    newDb.movements = newDb.movements.filter(item => item.posId !== posId);
    newDb.externalSales = newDb.externalSales.filter(item => item.posId !== posId);
    newDb.externalPOSImportRuns = newDb.externalPOSImportRuns.map(run => ({
      ...run,
      issues: run.issues.filter(issue => !issue.message.includes(pos.name))
    }));
    newDb.cashSessions = newDb.cashSessions.filter(item => item.posId !== posId);
    newDb.pmsFolios = newDb.pmsFolios.map(folio => ({
      ...folio,
      charges: folio.charges.filter(charge => charge.posId !== posId)
    }));
    newDb.users = newDb.users.map(user => user.posId === posId ? { ...user, posId: undefined } : user);

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

  const updateWarehouse = (warehouseId: string, patch: { name: string; isColdStorage: boolean }) => {
    const newDb = getDB();
    const warehouse = newDb.warehouses.find(item => item.id === warehouseId);
    if (!warehouse) throw new Error("Dépôt introuvable");

    warehouse.name = patch.name;
    warehouse.isColdStorage = patch.isColdStorage;
    saveDB(newDb);
    refresh();
  };

  const deleteWarehouse = (warehouseId: string) => {
    const newDb = getDB();
    const warehouse = newDb.warehouses.find(item => item.id === warehouseId);
    if (!warehouse) throw new Error("Dépôt introuvable");

    const fallbackWarehouse = newDb.warehouses.find(item => item.id !== warehouseId);
    newDb.posList = newDb.posList.map(pos => (
      pos.defaultWarehouseId === warehouseId && fallbackWarehouse
        ? { ...pos, defaultWarehouseId: fallbackWarehouse.id }
        : pos
    ));
    newDb.posPricing = newDb.posPricing.map(rule => (
      rule.defaultWarehouseId === warehouseId
        ? { ...rule, defaultWarehouseId: undefined }
        : rule
    ));
    newDb.warehouses = newDb.warehouses.filter(item => item.id !== warehouseId);
    newDb.stocks = newDb.stocks.filter(item => item.warehouseId !== warehouseId);
    newDb.batches = newDb.batches.filter(item => item.warehouseId !== warehouseId);
    newDb.movements = newDb.movements.filter(item => item.warehouseId !== warehouseId);
    newDb.losses = newDb.losses.filter(item => item.warehouseId !== warehouseId);
    newDb.transfers = newDb.transfers.filter(item => item.sourceWarehouseId !== warehouseId && item.destinationWarehouseId !== warehouseId);
    newDb.inventories = newDb.inventories.filter(item => item.warehouseId !== warehouseId);

    saveDB(newDb);
    refresh();
  };

  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newDb = getDB();
    const id = `sup-${Date.now()}`;
    newDb.suppliers.push({ id, ...supplier });
    saveDB(newDb);
    refresh();
    return id;
  };

  const updateSupplier = (supplierId: string, patch: Omit<Supplier, 'id'>) => {
    const newDb = getDB();
    const supplier = newDb.suppliers.find(item => item.id === supplierId);
    if (!supplier) throw new Error("Fournisseur introuvable");

    Object.assign(supplier, patch);
    saveDB(newDb);
    refresh();
  };

  const deleteSupplier = (supplierId: string) => {
    const newDb = getDB();
    const fallbackSupplier = newDb.suppliers.find(item => item.id !== supplierId);

    newDb.suppliers = newDb.suppliers.filter(item => item.id !== supplierId);
    newDb.products = newDb.products.map(product => product.mainSupplierId === supplierId
      ? { ...product, mainSupplierId: fallbackSupplier?.id }
      : product
    );
    newDb.batches = newDb.batches.map(batch => batch.supplierId === supplierId
      ? { ...batch, supplierId: fallbackSupplier?.id || 'unknown' }
      : batch
    );
    newDb.supplierOrders = newDb.supplierOrders.filter(order => order.supplierId !== supplierId);

    saveDB(newDb);
    refresh();
  };

  const resetAllData = () => {
    localStorage.removeItem('sartal_stock_db');
    refresh();
  };

  const togglePMSExport = (saleId: string) => {
    const newDb = getDB();
    const sale = newDb.externalSales.find(s => s.id === saleId);
    if (sale) {
      sale.exportedToPms = !sale.exportedToPms;
      const folio = newDb.pmsFolios.find(f => f.id === sale.paymentContext.folioId);
      const folioCharge = folio?.charges.find(charge => charge.saleId === sale.id);
      if (folioCharge) {
        folioCharge.status = sale.exportedToPms ? 'exported' : 'pending';
      }
      saveDB(newDb);
      refresh();
    }
  };

  const importExternalPOSSales = (sourceName: string, rows: ExternalPOSSaleRow[]) => {
    const issues: Array<{ rowNumber: number; ticketId: string; message: string }> = [];
    const acceptedRows: Array<ExternalPOSSaleRow & { productId: string; posId: string; rowNumber: number }> = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 1;
      const pos = db.posList.find(p => p.id === row.posCode || p.name.toLowerCase() === row.posCode.toLowerCase());
      if (!pos) {
        issues.push({ rowNumber, ticketId: row.ticketId, message: `POS inconnu: ${row.posCode}` });
        return;
      }

      const alias = db.posProductAliases.find(mapping => {
        const skuMatch = mapping.externalSku.toLowerCase() === row.externalSku.toLowerCase();
        const posMatch = !mapping.posId || mapping.posId === pos.id;
        return skuMatch && posMatch;
      });
      const product = alias
        ? db.products.find(p => p.id === alias.productId)
        : db.products.find(p => p.sku.toLowerCase() === row.externalSku.toLowerCase());

      if (!product) {
        issues.push({ rowNumber, ticketId: row.ticketId, message: `Produit POS non mappé: ${row.externalSku} - ${row.label}` });
        return;
      }

      acceptedRows.push({ ...row, productId: product.id, posId: pos.id, rowNumber });
    });

    const groupedTickets = acceptedRows.reduce<Record<string, typeof acceptedRows>>((acc, row) => {
      const key = `${row.posId}-${row.ticketId}`;
      acc[key] = acc[key] || [];
      acc[key].push(row);
      return acc;
    }, {});

    let successCount = 0;
    let rejectedCount = 0;

    Object.values(groupedTickets).forEach(ticketRows => {
      const firstRow = ticketRows[0];
      const result = stockEngine.processExternalSale(
        {
          externalSaleId: `IMPORT-${firstRow.ticketId}`,
          siteId: 'site-1',
          posId: firstRow.posId,
          items: ticketRows.map(row => ({ productId: row.productId, quantity: row.quantity })),
          paymentContext: {
            type: firstRow.paymentType,
            roomNumber: firstRow.roomNumber,
            amount: ticketRows.reduce((sum, row) => sum + row.amount, 0)
          }
        },
        db.currentUser.id,
        db.currentUser.name
      );

      if (result.success) {
        successCount += 1;
      } else {
        rejectedCount += 1;
        issues.push({
          rowNumber: firstRow.rowNumber,
          ticketId: firstRow.ticketId,
          message: result.error || 'Ticket rejeté'
        });
      }
    });

    const newDb = getDB();
    const run = {
      id: `IMP-${Date.now().toString().slice(-6)}`,
      sourceName,
      importedAt: new Date().toISOString(),
      rowCount: rows.length,
      ticketCount: Object.keys(groupedTickets).length,
      successCount,
      rejectedCount: rejectedCount + issues.filter(issue => issue.message.includes('inconnu') || issue.message.includes('mappé')).length,
      issues
    };
    newDb.externalPOSImportRuns.push(run);
    saveDB(newDb);
    refresh();
    return run;
  };

  const openCashSession = (posId: string, openingFloat: number) => {
    const newDb = getDB();
    const pos = newDb.posList.find(p => p.id === posId);
    if (!pos) throw new Error("Point de vente introuvable");

    const existingOpenSession = newDb.cashSessions.find(session => session.posId === posId && session.status === 'open');
    if (existingOpenSession) {
      throw new Error(`Une session est déjà ouverte pour ${pos.name}`);
    }

    const sessionId = `CS-${Date.now().toString().slice(-6)}`;
    newDb.cashSessions.push({
      id: sessionId,
      posId,
      userId: newDb.currentUser.id,
      userName: newDb.currentUser.name,
      openedAt: new Date().toISOString(),
      openingFloat,
      status: 'open',
      saleIds: [],
      paymentTotals: {
        cash: 0,
        card: 0,
        room_charge: 0,
        other: 0
      },
      totalSales: 0
    });
    saveDB(newDb);
    refresh();
    return sessionId;
  };

  const closeCashSession = (sessionId: string, closingCashDeclared: number, notes?: string) => {
    const newDb = getDB();
    const session = newDb.cashSessions.find(s => s.id === sessionId);
    if (!session) throw new Error("Session de caisse introuvable");
    if (session.status === 'closed') throw new Error("Cette session est déjà clôturée");

    const sessionSales = newDb.externalSales.filter(sale => sale.cashSessionId === session.id);
    const paymentTotals: PaymentTotals = {
      cash: 0,
      card: 0,
      room_charge: 0,
      other: 0
    };

    sessionSales.forEach(sale => {
      paymentTotals[sale.paymentContext.type] += sale.paymentContext.amount;
    });

    const totalSales = Object.values(paymentTotals).reduce((sum, amount) => sum + amount, 0);
    const expectedCash = session.openingFloat + paymentTotals.cash;

    session.status = 'closed';
    session.closedAt = new Date().toISOString();
    session.closedBy = newDb.currentUser.id;
    session.closedByName = newDb.currentUser.name;
    session.closingCashDeclared = closingCashDeclared;
    session.expectedCash = expectedCash;
    session.cashDifference = closingCashDeclared - expectedCash;
    session.paymentTotals = paymentTotals;
    session.totalSales = totalSales;
    session.saleIds = sessionSales.map(sale => sale.id);
    session.zReportNumber = `Z-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${session.id.slice(-4)}`;
    session.notes = notes;

    saveDB(newDb);
    refresh();
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
    updateProduct,
    deleteProduct,
    updateProductPricing,
    addRecipe,
    addPOS,
    updatePOS,
    deletePOS,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    togglePMSExport,
    importExternalPOSSales,
    openCashSession,
    closeCashSession,
    resetAllData
  };
};
export type StockState = ReturnType<typeof useStockState>;
