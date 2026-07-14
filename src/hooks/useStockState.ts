import { useState, useEffect, useCallback } from 'react';
import { getDB, saveDB, DatabaseState } from '../db';
import * as stockEngine from '../services/stockEngine';
import {
  createEmptyPaymentTotals,
  ExternalPOSSaleRow,
  LossReason,
  PaymentTotals,
  PaymentType,
  PMSAutomationRule,
  PMSChannel,
  PMSDebtorAccount,
  PMSEvent,
  PMSGroupBooking,
  PMSGuest,
  PMSHousekeepingStatus,
  PMSHousekeepingTask,
  PMSFolioCharge,
  PMSInvoice,
  PMSMaintenanceTicket,
  PMSNotification,
  PMSPackage,
  PMSPropertySummary,
  PMSRatePlan,
  PMSRateOverride,
  PMSReservation,
  PMSReservationStatus,
  PMSRoom,
  PMSServiceRequest,
  PMSSettings,
  POSType,
  Product,
  Supplier
} from '../types';

type PMSConfigCollection =
  | 'pmsRooms'
  | 'pmsGuests'
  | 'pmsRatePlans'
  | 'pmsPackages'
  | 'pmsChannels'
  | 'pmsGroups'
  | 'pmsEvents'
  | 'pmsHousekeepingTasks'
  | 'pmsMaintenanceTickets'
  | 'pmsServiceRequests'
  | 'pmsAutomationRules'
  | 'pmsDebtorAccounts'
  | 'pmsPropertySummaries';

type PMSConfigRecord =
  | PMSRoom
  | PMSGuest
  | PMSRatePlan
  | PMSPackage
  | PMSChannel
  | PMSGroupBooking
  | PMSEvent
  | PMSHousekeepingTask
  | PMSMaintenanceTicket
  | PMSServiceRequest
  | PMSAutomationRule
  | PMSDebtorAccount
  | PMSPropertySummary;

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
      type: PaymentType;
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

  const appendPMSAudit = (targetDb: ReturnType<typeof getDB>, action: string, entity: string, detail: string) => {
    targetDb.pmsAuditLogs.unshift({
      id: `pms-audit-${Date.now()}-${targetDb.pmsAuditLogs.length}`,
      date: new Date().toISOString(),
      userName: targetDb.currentUser.name,
      action,
      entity,
      detail
    });
  };

  const pmsConfigLabels: Record<PMSConfigCollection, string> = {
    pmsRooms: 'Chambre',
    pmsGuests: 'Client',
    pmsRatePlans: 'Plan tarifaire',
    pmsPackages: 'Forfait',
    pmsChannels: 'Canal de vente',
    pmsGroups: 'Groupe',
    pmsEvents: 'Événement',
    pmsHousekeepingTasks: 'Tâche entretien',
    pmsMaintenanceTickets: 'Ticket maintenance',
    pmsServiceRequests: 'Demande client',
    pmsAutomationRules: 'Automatisation',
    pmsDebtorAccounts: 'Compte débiteur',
    pmsPropertySummaries: 'Établissement'
  };

  const pmsConfigPrefixes: Record<PMSConfigCollection, string> = {
    pmsRooms: 'room',
    pmsGuests: 'guest',
    pmsRatePlans: 'rate-plan',
    pmsPackages: 'package',
    pmsChannels: 'channel',
    pmsGroups: 'group',
    pmsEvents: 'event',
    pmsHousekeepingTasks: 'hk',
    pmsMaintenanceTickets: 'maintenance',
    pmsServiceRequests: 'request',
    pmsAutomationRules: 'automation',
    pmsDebtorAccounts: 'debtor',
    pmsPropertySummaries: 'property'
  };

  const getPMSConfigRecordName = (collection: PMSConfigCollection, record: PMSConfigRecord) => {
    if ('roomNumber' in record) return `Chambre ${record.roomNumber}`;
    if ('fullName' in record) return record.fullName;
    if ('equipment' in record) return record.equipment;
    if ('label' in record) return record.label;
    if ('name' in record) return record.name;
    return `${pmsConfigLabels[collection]} ${record.id}`;
  };

  const savePMSConfigRecord = (collection: PMSConfigCollection, payload: PMSConfigRecord) => {
    const newDb = getDB();
    const records = newDb[collection] as unknown as PMSConfigRecord[];
    const record = { ...payload } as PMSConfigRecord;
    const isNew = !record.id;
    if (isNew) record.id = `${pmsConfigPrefixes[collection]}-${Date.now()}`;

    if (collection === 'pmsRooms') {
      const room = record as PMSRoom;
      if (!room.roomNumber.trim() || !room.roomType.trim()) throw new Error('Le numéro et la catégorie de chambre sont obligatoires.');
      if (records.some(item => item.id !== room.id && 'roomNumber' in item && item.roomNumber.toLowerCase() === room.roomNumber.toLowerCase())) throw new Error('Ce numéro de chambre existe déjà.');
    }
    if (collection === 'pmsGuests') {
      const guest = record as PMSGuest;
      if (!guest.fullName.trim() || !guest.phone.trim()) throw new Error('Le nom et le téléphone du client sont obligatoires.');
    }
    if (collection === 'pmsRatePlans') {
      const plan = record as PMSRatePlan;
      if (!plan.name.trim() || !plan.roomType.trim() || plan.baseRate < 0) throw new Error('Le plan tarifaire doit avoir un nom, une catégorie et un tarif valide.');
    }

    const existingIndex = records.findIndex(item => item.id === record.id);
    if (existingIndex >= 0) records[existingIndex] = record;
    else records.unshift(record);
    appendPMSAudit(newDb, isNew ? `Création ${pmsConfigLabels[collection]}` : `Modification ${pmsConfigLabels[collection]}`, getPMSConfigRecordName(collection, record), 'Paramètres enregistrés depuis l’administration PMS.');
    saveDB(newDb);
    refresh();
    return record.id;
  };

  const deletePMSConfigRecord = (collection: PMSConfigCollection, recordId: string) => {
    const newDb = getDB();
    const records = newDb[collection] as unknown as PMSConfigRecord[];
    const record = records.find(item => item.id === recordId);
    if (!record) throw new Error(`${pmsConfigLabels[collection]} introuvable.`);

    if (collection === 'pmsRooms') {
      const linked = newDb.pmsReservations.some(item => item.roomId === recordId)
        || newDb.pmsFolios.some(item => item.roomId === recordId)
        || newDb.pmsHousekeepingTasks.some(item => item.roomId === recordId)
        || newDb.pmsMaintenanceTickets.some(item => item.roomId === recordId)
        || newDb.pmsDoorKeys.some(item => item.roomId === recordId);
      if (linked) throw new Error('Cette chambre possède un historique. Modifiez-la ou mettez-la en maintenance au lieu de la supprimer.');
    }
    if (collection === 'pmsGuests' && (newDb.pmsReservations.some(item => item.guestId === recordId) || newDb.pmsFolios.some(item => item.guestId === recordId))) {
      throw new Error('Ce client possède un historique de séjour ou de facturation et ne peut pas être supprimé.');
    }
    if (collection === 'pmsRatePlans' && newDb.pmsReservations.some(item => item.ratePlanId === recordId)) {
      throw new Error('Ce plan tarifaire est utilisé par une réservation. Désactivez-le au lieu de le supprimer.');
    }
    if (collection === 'pmsGroups' && (newDb.pmsReservations.some(item => item.groupId === recordId) || newDb.pmsEvents.some(item => item.groupId === recordId))) {
      throw new Error('Ce groupe est lié à des réservations ou événements et ne peut pas être supprimé.');
    }

    (newDb as unknown as Record<PMSConfigCollection, PMSConfigRecord[]>)[collection] = records.filter(item => item.id !== recordId);
    appendPMSAudit(newDb, `Suppression ${pmsConfigLabels[collection]}`, getPMSConfigRecordName(collection, record), 'Suppression confirmée depuis l’administration PMS.');
    saveDB(newDb);
    refresh();
  };

  const deletePMSReservation = (reservationId: string) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    if (!reservation) throw new Error('Réservation introuvable.');
    if (['checked_in', 'checked_out'].includes(reservation.status) || newDb.pmsFolios.some(item => item.reservationId === reservationId)) {
      throw new Error('Un séjour ou un folio existe déjà. Annulez la réservation afin de conserver la traçabilité.');
    }
    newDb.pmsReservations = newDb.pmsReservations.filter(item => item.id !== reservationId);
    newDb.pmsNotifications = newDb.pmsNotifications.filter(item => item.reservationId !== reservationId);
    newDb.pmsServiceRequests = newDb.pmsServiceRequests.filter(item => item.reservationId !== reservationId);
    newDb.pmsDoorKeys = newDb.pmsDoorKeys.filter(item => item.reservationId !== reservationId);
    appendPMSAudit(newDb, 'Suppression réservation', reservation.confirmationNumber, 'Réservation sans séjour ni folio supprimée.');
    saveDB(newDb);
    refresh();
  };

  const deletePMSNotification = (notificationId: string) => {
    const newDb = getDB();
    const notification = newDb.pmsNotifications.find(item => item.id === notificationId);
    if (!notification) return;
    if (notification.status === 'sent') throw new Error('Un message déjà envoyé reste conservé dans l’historique client.');
    newDb.pmsNotifications = newDb.pmsNotifications.filter(item => item.id !== notificationId);
    appendPMSAudit(newDb, 'Suppression message', notification.type, `Message ${notification.channel} retiré de la file d’envoi.`);
    saveDB(newDb);
    refresh();
  };

  const deletePMSRateOverride = (overrideId: string) => {
    const newDb = getDB();
    const override = newDb.pmsRateOverrides.find(item => item.id === overrideId);
    if (!override) return;
    newDb.pmsRateOverrides = newDb.pmsRateOverrides.filter(item => item.id !== overrideId);
    appendPMSAudit(newDb, 'Suppression tarif journalier', `${override.roomType} · ${override.date}`, 'Retour au tarif du plan actif.');
    saveDB(newDb);
    refresh();
  };

  const togglePMSExport = (saleId: string) => {
    const newDb = getDB();
    const sale = newDb.externalSales.find(s => s.id === saleId);
    const folio = sale
      ? newDb.pmsFolios.find(f => f.id === sale.paymentContext.folioId)
      : newDb.pmsFolios.find(item => item.charges.some(charge => charge.saleId === saleId));
    const folioCharge = folio?.charges.find(charge => charge.saleId === saleId);
    if (folioCharge) {
      folioCharge.status = folioCharge.status === 'pending'
        ? 'exported'
        : folioCharge.status === 'exported'
          ? 'reconciled'
          : 'pending';
      if (sale) sale.exportedToPms = folioCharge.status !== 'pending';
      appendPMSAudit(newDb, 'Statut imputation POS', folio?.reservationNumber || saleId, `${folioCharge.label} : ${folioCharge.status}`);
      saveDB(newDb);
      refresh();
    }
  };

  const createPMSReservation = (payload: {
    guestId?: string;
    guestName: string;
    phone: string;
    email?: string;
    roomId: string;
    arrivalDate: string;
    departureDate: string;
    adults: number;
    children: number;
    source: PMSReservation['source'];
    nightlyRate: number;
    depositAmount: number;
    notes?: string;
    ratePlanId?: string;
    guaranteeType?: PMSReservation['guaranteeType'];
    requestedRoomType?: string;
    estimatedArrivalTime?: string;
  }) => {
    const newDb = getDB();
    const conflicts = payload.roomId ? newDb.pmsReservations.filter(item => (
      item.roomId === payload.roomId
      && !['cancelled', 'no_show', 'checked_out'].includes(item.status)
      && payload.arrivalDate < item.departureDate
      && payload.departureDate > item.arrivalDate
    )) : [];
    const overbookingAllowed = newDb.pmsSettings.allowOverbooking && conflicts.length <= newDb.pmsSettings.overbookingLimit;
    let guest = payload.guestId ? newDb.pmsGuests.find(item => item.id === payload.guestId) : undefined;
    if (!guest) {
      guest = {
        id: `guest-${Date.now()}`,
        fullName: payload.guestName.trim(),
        phone: payload.phone.trim(),
        email: payload.email?.trim(),
        nationality: 'Sénégalaise',
        stays: 0
      };
      newDb.pmsGuests.push(guest);
    }

    const reservation: PMSReservation = {
      id: `res-${Date.now()}`,
      confirmationNumber: `RSV-${Date.now().toString().slice(-6)}`,
      guestId: guest.id,
      roomId: payload.roomId,
      requestedRoomType: payload.requestedRoomType || newDb.pmsRooms.find(item => item.id === payload.roomId)?.roomType || 'Standard',
      arrivalDate: payload.arrivalDate,
      departureDate: payload.departureDate,
      adults: payload.adults,
      children: payload.children,
      status: conflicts.length > 0 && !overbookingAllowed ? 'waitlisted' : 'confirmed',
      source: payload.source,
      nightlyRate: payload.nightlyRate,
      depositAmount: payload.depositAmount,
      notes: payload.notes?.trim(),
      ratePlanId: payload.ratePlanId,
      guaranteeType: payload.guaranteeType || (payload.depositAmount > 0 ? 'deposit' : 'none'),
      guaranteeStatus: payload.depositAmount > 0 ? 'secured' : 'pending',
      estimatedArrivalTime: payload.estimatedArrivalTime
    };
    newDb.pmsReservations.push(reservation);
    appendPMSAudit(
      newDb,
      reservation.status === 'waitlisted' ? 'Ajout liste d’attente' : 'Création réservation',
      reservation.confirmationNumber,
      `${guest.fullName} · ${newDb.pmsRooms.find(item => item.id === reservation.roomId)?.roomNumber ? `chambre ${newDb.pmsRooms.find(item => item.id === reservation.roomId)?.roomNumber}` : `${reservation.requestedRoomType}, attribution à faire`}`
    );
    saveDB(newDb);
    refresh();
    return reservation.id;
  };

  const updatePMSReservation = (reservationId: string, patch: Partial<Pick<PMSReservation, 'roomId' | 'requestedRoomType' | 'roomAssignmentLocked' | 'estimatedArrivalTime' | 'arrivalDate' | 'departureDate' | 'adults' | 'children' | 'source' | 'nightlyRate' | 'depositAmount' | 'notes' | 'ratePlanId' | 'guaranteeType'>>) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    if (!reservation) throw new Error('Réservation introuvable');
    const nextRoomId = patch.roomId ?? reservation.roomId;
    const nextArrival = patch.arrivalDate || reservation.arrivalDate;
    const nextDeparture = patch.departureDate || reservation.departureDate;
    const conflict = nextRoomId ? newDb.pmsReservations.find(item => (
      item.id !== reservationId
      && item.roomId === nextRoomId
      && !['cancelled', 'no_show', 'checked_out'].includes(item.status)
      && nextArrival < item.departureDate
      && nextDeparture > item.arrivalDate
    )) : undefined;
    if (conflict) throw new Error(`La chambre est déjà réservée sur cette période (${conflict.confirmationNumber})`);
    Object.assign(reservation, patch);
    const folio = newDb.pmsFolios.find(item => item.reservationId === reservationId);
    if (folio && reservation.roomId) {
      folio.roomId = reservation.roomId;
      folio.arrivalDate = reservation.arrivalDate;
      folio.departureDate = reservation.departureDate;
    }
    appendPMSAudit(newDb, 'Modification réservation', reservation.confirmationNumber, 'Dates, chambre ou conditions du séjour modifiées.');
    saveDB(newDb);
    refresh();
  };

  const updatePMSReservationStatus = (reservationId: string, status: PMSReservationStatus) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    if (!reservation) throw new Error('Réservation introuvable');
    const room = newDb.pmsRooms.find(item => item.id === reservation.roomId);
    const guest = newDb.pmsGuests.find(item => item.id === reservation.guestId);
    if (!guest) throw new Error('Client introuvable');
    if (['checked_in', 'checked_out'].includes(status) && !room) throw new Error('Attribuez une chambre avant cette opération');

    if (status === 'confirmed' && reservation.status === 'waitlisted') {
      const conflict = reservation.roomId ? newDb.pmsReservations.find(item => (
        item.id !== reservation.id
        && item.roomId === reservation.roomId
        && !['cancelled', 'no_show', 'checked_out', 'waitlisted'].includes(item.status)
        && reservation.arrivalDate < item.departureDate
        && reservation.departureDate > item.arrivalDate
      )) : undefined;
      if (conflict) throw new Error(`La chambre reste indisponible (${conflict.confirmationNumber})`);
    }

    reservation.status = status;
    if (status === 'checked_in') {
      if (!room) throw new Error('Attribuez une chambre avant le check-in');
      if (room.status === 'maintenance') throw new Error('Cette chambre est en maintenance');
      const occupant = newDb.pmsReservations.find(item => item.id !== reservation.id && item.roomId === room.id && item.status === 'checked_in');
      if (occupant) throw new Error('Cette chambre est déjà occupée');
      room.status = 'occupied';
      room.housekeepingStatus = 'inspected';
      guest.stays += 1;
      const existingFolio = newDb.pmsFolios.find(item => item.reservationId === reservation.id && item.status === 'open');
      if (!existingFolio) {
        const nights = Math.max(1, Math.ceil((new Date(reservation.departureDate).getTime() - new Date(reservation.arrivalDate).getTime()) / 86400000));
        newDb.pmsFolios.push({
          id: `folio-${Date.now()}`,
          roomId: room.id,
          guestId: guest.id,
          reservationId: reservation.id,
          guestName: guest.fullName,
          reservationNumber: reservation.confirmationNumber,
          arrivalDate: reservation.arrivalDate,
          departureDate: reservation.departureDate,
          status: 'open',
          charges: [{
            id: `charge-room-${Date.now()}`,
            saleId: `stay-${reservation.id}`,
            externalSaleId: `SEJOUR-${room.roomNumber}-${reservation.confirmationNumber.slice(-4)}`,
            posId: newDb.posList[0]?.id || '',
            label: `${nights} nuitée(s) ${room.roomType}`,
            amount: nights * reservation.nightlyRate,
            date: new Date().toISOString(),
            status: 'reconciled',
            category: 'room'
          }],
          payments: reservation.depositAmount > 0 ? [{
            id: `pay-deposit-${Date.now()}`,
            amount: reservation.depositAmount,
            method: 'other',
            date: new Date().toISOString(),
            reference: 'Acompte réservation'
          }] : []
        });
      }
    }

    if (status === 'checked_out') {
      if (!room) throw new Error('Chambre introuvable');
      const folio = newDb.pmsFolios.find(item => item.reservationId === reservation.id && item.status === 'open');
      if (folio) {
        const charges = folio.charges.reduce((sum, charge) => sum + charge.amount, 0);
        const payments = folio.payments.reduce((sum, payment) => sum + payment.amount, 0);
        if (charges - payments > 0) throw new Error(`Le folio doit encore être soldé : ${charges - payments} FCFA`);
      }
      room.status = 'vacant';
      room.housekeepingStatus = 'dirty';
      if (folio) folio.status = 'closed';
      newDb.pmsHousekeepingTasks.push({
        id: `hk-${Date.now()}`,
        roomId: room.id,
        assignedTo: 'À affecter',
        status: 'pending',
        priority: 'normal',
        scheduledDate: new Date().toISOString().slice(0, 10),
        note: 'Nettoyage après départ.'
      });
    }

    appendPMSAudit(newDb, `Réservation ${status}`, reservation.confirmationNumber, `${guest.fullName}${room ? ` · chambre ${room.roomNumber}` : ' · sans chambre attribuée'}`);

    saveDB(newDb);
    refresh();
  };

  const updatePMSRoom = (roomId: string, patch: { status?: 'occupied' | 'vacant' | 'maintenance'; housekeepingStatus?: PMSHousekeepingStatus; maintenanceNote?: string; nightlyRate?: number }) => {
    const newDb = getDB();
    const room = newDb.pmsRooms.find(item => item.id === roomId);
    if (!room) throw new Error('Chambre introuvable');
    Object.assign(room, patch);
    appendPMSAudit(newDb, 'Modification chambre', `Chambre ${room.roomNumber}`, patch.maintenanceNote || `Statut ${patch.status || room.status}, entretien ${patch.housekeepingStatus || room.housekeepingStatus}`);
    saveDB(newDb);
    refresh();
  };

  const updatePMSHousekeepingTask = (taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'inspected') => {
    const newDb = getDB();
    const task = newDb.pmsHousekeepingTasks.find(item => item.id === taskId);
    if (!task) throw new Error("Tâche d'entretien introuvable");
    task.status = status;
    if (status === 'in_progress' && !task.startedAt) task.startedAt = new Date().toISOString();
    if (['completed', 'inspected'].includes(status)) task.completedAt = new Date().toISOString();
    const room = newDb.pmsRooms.find(item => item.id === task.roomId);
    if (room) {
      room.housekeepingStatus = status === 'in_progress' ? 'in_progress' : status === 'completed' ? 'clean' : status === 'inspected' ? 'inspected' : room.housekeepingStatus;
    }
    appendPMSAudit(newDb, 'Entretien chambre', `Chambre ${room?.roomNumber || task.roomId}`, `Tâche passée au statut ${status}.`);
    saveDB(newDb);
    refresh();
  };

  const assignPMSRoom = (reservationId: string, roomId: string, lockAssignment = false) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    const room = newDb.pmsRooms.find(item => item.id === roomId);
    if (!reservation || !room) throw new Error('Réservation ou chambre introuvable');
    if (room.status === 'maintenance') throw new Error('Cette chambre est en maintenance');
    if (room.holdUntil && new Date(room.holdUntil).getTime() > Date.now() && room.holdReservationId && room.holdReservationId !== reservationId) {
      throw new Error(`Cette chambre est temporairement bloquée par ${room.holdBy || 'un autre agent'}`);
    }
    if (room.capacity < reservation.adults + reservation.children) throw new Error('La capacité de la chambre est insuffisante');
    const conflict = newDb.pmsReservations.find(item => (
      item.id !== reservation.id
      && item.roomId === roomId
      && !['cancelled', 'no_show', 'checked_out', 'waitlisted'].includes(item.status)
      && reservation.arrivalDate < item.departureDate
      && reservation.departureDate > item.arrivalDate
    ));
    if (conflict) throw new Error(`Chambre indisponible sur ces dates (${conflict.confirmationNumber})`);
    const previousRoom = newDb.pmsRooms.find(item => item.id === reservation.roomId);
    if (reservation.status === 'checked_in' && !['clean', 'inspected'].includes(room.housekeepingStatus)) {
      throw new Error('La nouvelle chambre doit être propre et contrôlée');
    }
    reservation.roomId = roomId;
    reservation.requestedRoomType = room.roomType;
    reservation.roomAssignmentLocked = lockAssignment;
    const folio = newDb.pmsFolios.find(item => item.reservationId === reservation.id);
    if (folio) folio.roomId = roomId;
    if (reservation.status === 'checked_in' && previousRoom && previousRoom.id !== room.id) {
      previousRoom.status = 'vacant';
      previousRoom.housekeepingStatus = 'dirty';
      room.status = 'occupied';
      if (!newDb.pmsHousekeepingTasks.some(task => task.roomId === previousRoom.id && !['completed', 'inspected'].includes(task.status))) {
        newDb.pmsHousekeepingTasks.push({
          id: `hk-${Date.now()}`,
          roomId: previousRoom.id,
          assignedTo: 'Équipe étage',
          status: 'pending',
          priority: 'urgent',
          scheduledDate: newDb.pmsSettings.businessDate,
          note: `Nettoyage après changement vers la chambre ${room.roomNumber}.`,
          linenStatus: 'missing',
          minibarStatus: 'checked',
          photoCount: 0
        });
      }
    }
    room.holdUntil = undefined;
    room.holdBy = undefined;
    room.holdReservationId = undefined;
    appendPMSAudit(newDb, 'Attribution chambre', reservation.confirmationNumber, `Chambre ${room.roomNumber}${lockAssignment ? ' verrouillée' : ' attribuée'}.`);
    saveDB(newDb);
    refresh();
  };

  const holdPMSRoom = (roomId: string, reservationId?: string) => {
    const newDb = getDB();
    const room = newDb.pmsRooms.find(item => item.id === roomId);
    if (!room) throw new Error('Chambre introuvable');
    if (room.status === 'maintenance') throw new Error('Cette chambre est en maintenance');
    if (room.holdUntil && new Date(room.holdUntil).getTime() > Date.now() && room.holdReservationId !== reservationId) {
      throw new Error(`Chambre déjà mise en attente par ${room.holdBy}`);
    }
    room.holdUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    room.holdBy = newDb.currentUser.name;
    room.holdReservationId = reservationId;
    appendPMSAudit(newDb, 'Mise en attente chambre', `Chambre ${room.roomNumber}`, 'Bloquée pendant 10 minutes pour finaliser l’attribution.');
    saveDB(newDb);
    refresh();
  };

  const releasePMSRoomHold = (roomId: string) => {
    const newDb = getDB();
    const room = newDb.pmsRooms.find(item => item.id === roomId);
    if (!room) return;
    room.holdUntil = undefined;
    room.holdBy = undefined;
    room.holdReservationId = undefined;
    appendPMSAudit(newDb, 'Libération attente', `Chambre ${room.roomNumber}`, 'La chambre redevient disponible à l’attribution.');
    saveDB(newDb);
    refresh();
  };

  const completePMSCheckIn = (reservationId: string, checklist: NonNullable<PMSReservation['checkInChecklist']>) => {
    const required = checklist.identity && checklist.guarantee && checklist.payment && checklist.signature && checklist.keyIssued;
    if (!required) throw new Error('Tous les contrôles du check-in doivent être validés');
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    if (!reservation) throw new Error('Réservation introuvable');
    const room = newDb.pmsRooms.find(item => item.id === reservation.roomId);
    if (!room) throw new Error('Attribuez une chambre avant le check-in');
    if (!['clean', 'inspected'].includes(room.housekeepingStatus)) throw new Error('La chambre doit être propre et contrôlée');
    reservation.checkInChecklist = { ...checklist, completedAt: new Date().toISOString() };
    saveDB(newDb);
    updatePMSReservationStatus(reservationId, 'checked_in');
  };

  const updatePMSHousekeepingDetails = (taskId: string, patch: Partial<Pick<PMSHousekeepingTask, 'assignedTo' | 'priority' | 'note' | 'linenStatus' | 'minibarStatus' | 'photoCount'>>) => {
    const newDb = getDB();
    const task = newDb.pmsHousekeepingTasks.find(item => item.id === taskId);
    if (!task) throw new Error("Tâche d'entretien introuvable");
    Object.assign(task, patch);
    appendPMSAudit(newDb, 'Détail entretien', taskId, `Affectation ${task.assignedTo}, linge ${task.linenStatus}, minibar ${task.minibarStatus}.`);
    saveDB(newDb);
    refresh();
  };

  const routePMSFolioCharge = (chargeId: string, billingWindow: NonNullable<PMSFolioCharge['billingWindow']>) => {
    const newDb = getDB();
    const folio = newDb.pmsFolios.find(item => item.charges.some(charge => charge.id === chargeId));
    const charge = folio?.charges.find(item => item.id === chargeId);
    if (!folio || !charge) throw new Error('Charge introuvable');
    charge.billingWindow = billingWindow;
    appendPMSAudit(newDb, 'Routage folio', folio.reservationNumber, `${charge.label} dirigé vers ${billingWindow}.`);
    saveDB(newDb);
    refresh();
  };

  const addPMSFolioPayment = (folioId: string, amount: number, method: PaymentType, reference?: string) => {
    const newDb = getDB();
    const folio = newDb.pmsFolios.find(item => item.id === folioId);
    if (!folio) throw new Error('Folio introuvable');
    folio.payments.push({ id: `pay-${Date.now()}`, amount, method, date: new Date().toISOString(), reference, kind: 'payment' });
    appendPMSAudit(newDb, 'Paiement folio', folio.reservationNumber, `${amount} FCFA par ${method}.`);
    saveDB(newDb);
    refresh();
  };

  const transferPMSFolioCharge = (chargeId: string, targetFolioId: string, amount: number) => {
    const newDb = getDB();
    const sourceFolio = newDb.pmsFolios.find(item => item.charges.some(charge => charge.id === chargeId));
    const targetFolio = newDb.pmsFolios.find(item => item.id === targetFolioId && item.status === 'open');
    const charge = sourceFolio?.charges.find(item => item.id === chargeId);
    if (!sourceFolio || !targetFolio || !charge) throw new Error('Charge ou folio de destination introuvable');
    if (sourceFolio.id === targetFolio.id) throw new Error('Choisissez un autre folio');
    if (amount <= 0 || amount > charge.amount) throw new Error('Montant de transfert invalide');

    if (amount === charge.amount) {
      sourceFolio.charges = sourceFolio.charges.filter(item => item.id !== chargeId);
    } else {
      charge.amount -= amount;
    }
    targetFolio.charges.push({
      ...charge,
      id: `charge-transfer-${Date.now()}`,
      amount,
      label: `${charge.label} (transféré depuis ${sourceFolio.reservationNumber})`,
      status: 'pending'
    });
    appendPMSAudit(newDb, 'Transfert de charge', sourceFolio.reservationNumber, `${amount} FCFA transférés vers ${targetFolio.reservationNumber}.`);
    saveDB(newDb);
    refresh();
  };

  const issuePMSDocument = (folioId: string, type: PMSInvoice['type'], billedTo: string) => {
    const newDb = getDB();
    const folio = newDb.pmsFolios.find(item => item.id === folioId);
    if (!folio) throw new Error('Folio introuvable');
    const baseSubtotal = folio.charges.reduce((sum, charge) => sum + charge.amount, 0);
    const subtotal = type === 'credit_note' ? -baseSubtotal : baseSubtotal;
    const nights = Math.max(1, Math.ceil((new Date(folio.departureDate).getTime() - new Date(folio.arrivalDate).getTime()) / 86400000));
    const taxAmount = Math.round(subtotal * (newDb.pmsSettings.vatRate / 100));
    const cityTaxAmount = type === 'credit_note' ? 0 : nights * newDb.pmsSettings.cityTax;
    const prefix = type === 'proforma' ? 'PRO' : type === 'credit_note' ? 'AVO' : type === 'receipt' ? 'REC' : 'FAC';
    const document: PMSInvoice = {
      id: `invoice-${Date.now()}`,
      folioId,
      number: `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      type,
      status: type === 'proforma' ? 'draft' : 'issued',
      issuedAt: new Date().toISOString(),
      billedTo: billedTo.trim() || folio.guestName,
      subtotal,
      taxAmount,
      cityTaxAmount,
      total: subtotal + taxAmount + cityTaxAmount
    };
    newDb.pmsInvoices.unshift(document);
    appendPMSAudit(newDb, 'Document de facturation', folio.reservationNumber, `${document.number} émis pour ${document.billedTo}.`);
    saveDB(newDb);
    refresh();
    return document.id;
  };

  const refundPMSPayment = (folioId: string, paymentId: string, amount: number) => {
    const newDb = getDB();
    const folio = newDb.pmsFolios.find(item => item.id === folioId);
    const payment = folio?.payments.find(item => item.id === paymentId);
    if (!folio || !payment) throw new Error('Paiement introuvable');
    const alreadyRefunded = Math.abs(folio.payments.filter(item => item.kind === 'refund' && item.originPaymentId === paymentId).reduce((sum, item) => sum + item.amount, 0));
    if (amount <= 0 || amount > payment.amount - alreadyRefunded) throw new Error('Montant de remboursement invalide');
    folio.payments.push({
      id: `refund-${Date.now()}`,
      amount: -amount,
      method: payment.method,
      date: new Date().toISOString(),
      reference: `Remboursement ${payment.reference || payment.id}`,
      kind: 'refund',
      originPaymentId: payment.id
    });
    appendPMSAudit(newDb, 'Remboursement', folio.reservationNumber, `${amount} FCFA remboursés par ${payment.method}.`);
    saveDB(newDb);
    refresh();
  };

  const updatePMSMaintenanceTicket = (ticketId: string, status: 'open' | 'in_progress' | 'resolved' | 'verified') => {
    const newDb = getDB();
    const ticket = newDb.pmsMaintenanceTickets.find(item => item.id === ticketId);
    if (!ticket) throw new Error('Ticket de maintenance introuvable');
    ticket.status = status;
    if (status === 'resolved') ticket.resolvedAt = new Date().toISOString();
    const room = newDb.pmsRooms.find(item => item.id === ticket.roomId);
    if (room && status === 'verified') {
      room.status = 'vacant';
      room.housekeepingStatus = 'inspected';
      room.maintenanceNote = '';
    }
    appendPMSAudit(newDb, 'Maintenance', `Chambre ${room?.roomNumber || ticket.roomId}`, `${ticket.equipment} : ${status}.`);
    saveDB(newDb);
    refresh();
  };

  const updatePMSMaintenanceDetails = (ticketId: string, patch: Partial<Pick<PMSMaintenanceTicket, 'assignedTo' | 'estimatedCost' | 'actualCost' | 'unavailableUntil' | 'photoCount' | 'note' | 'priority'>>) => {
    const newDb = getDB();
    const ticket = newDb.pmsMaintenanceTickets.find(item => item.id === ticketId);
    if (!ticket) throw new Error('Ticket de maintenance introuvable');
    Object.assign(ticket, patch);
    const room = newDb.pmsRooms.find(item => item.id === ticket.roomId);
    appendPMSAudit(newDb, 'Détail maintenance', `Chambre ${room?.roomNumber || ticket.roomId}`, `${ticket.equipment} · ${ticket.assignedTo} · coût ${ticket.actualCost || 0} FCFA.`);
    saveDB(newDb);
    refresh();
  };

  const addPMSServiceRequest = (payload: Omit<PMSServiceRequest, 'id' | 'status'>) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === payload.reservationId);
    if (!reservation) throw new Error('Réservation introuvable');
    const request: PMSServiceRequest = { ...payload, id: `request-${Date.now()}`, status: 'requested' };
    newDb.pmsServiceRequests.unshift(request);
    appendPMSAudit(newDb, 'Demande client', reservation.confirmationNumber, `${request.label} confié à ${request.assignedTo}.`);
    saveDB(newDb);
    refresh();
    return request.id;
  };

  const updatePMSServiceRequest = (requestId: string, status: PMSServiceRequest['status']) => {
    const newDb = getDB();
    const request = newDb.pmsServiceRequests.find(item => item.id === requestId);
    if (!request) throw new Error('Demande client introuvable');
    request.status = status;
    appendPMSAudit(newDb, 'Suivi demande client', request.label, `Statut ${status}, responsable ${request.assignedTo}.`);
    saveDB(newDb);
    refresh();
  };

  const sendPMSNotification = (notificationId: string) => {
    const newDb = getDB();
    const notification = newDb.pmsNotifications.find(item => item.id === notificationId);
    if (!notification) throw new Error('Notification introuvable');
    notification.status = 'sent';
    notification.sentAt = new Date().toISOString();
    appendPMSAudit(newDb, 'Notification client', notification.reservationId, `${notification.type} envoyé par ${notification.channel}.`);
    saveDB(newDb);
    refresh();
  };

  const schedulePMSNotification = (reservationId: string, type: PMSNotification['type'], channel: PMSNotification['channel'] = 'whatsapp') => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    const guest = newDb.pmsGuests.find(item => item.id === reservation?.guestId);
    if (!reservation || !guest) throw new Error('Séjour ou client introuvable');
    const recipient = channel === 'email' ? guest.email || guest.phone : guest.phone;
    const notification: PMSNotification = {
      id: `notif-${Date.now()}`,
      reservationId,
      channel,
      type,
      recipient,
      status: 'scheduled',
      scheduledAt: new Date().toISOString()
    };
    newDb.pmsNotifications.unshift(notification);
    appendPMSAudit(newDb, 'Programmation message', reservation.confirmationNumber, `${type} programmé par ${channel}.`);
    saveDB(newDb);
    refresh();
    return notification.id;
  };

  const syncPMSChannel = (channelId: string) => {
    const newDb = getDB();
    const channel = newDb.pmsChannels.find(item => item.id === channelId);
    if (!channel) throw new Error('Canal introuvable');
    channel.status = 'connected';
    channel.lastSync = new Date().toISOString();
    channel.availabilityIssues = 0;
    channel.ratesSynced = newDb.pmsRatePlans.filter(item => item.active).length;
    channel.inventorySynced = newDb.pmsRooms.filter(item => item.status !== 'maintenance').length;
    channel.lastError = undefined;
    appendPMSAudit(newDb, 'Synchronisation canal', channel.name, 'Disponibilités et tarifs synchronisés.');
    saveDB(newDb);
    refresh();
  };

  const updatePMSRatePlan = (ratePlanId: string, patch: { baseRate?: number; weekendMultiplier?: number; active?: boolean }) => {
    const newDb = getDB();
    const plan = newDb.pmsRatePlans.find(item => item.id === ratePlanId);
    if (!plan) throw new Error('Plan tarifaire introuvable');
    Object.assign(plan, patch);
    appendPMSAudit(newDb, 'Modification tarif', plan.name, `Tarif de base ${plan.baseRate} FCFA.`);
    saveDB(newDb);
    refresh();
  };

  const upsertPMSRateOverride = (payload: Omit<PMSRateOverride, 'id'>) => {
    const newDb = getDB();
    const existing = newDb.pmsRateOverrides.find(item => item.date === payload.date && item.roomType === payload.roomType);
    if (existing) Object.assign(existing, payload);
    else newDb.pmsRateOverrides.push({ ...payload, id: `rate-override-${Date.now()}` });
    appendPMSAudit(newDb, 'Calendrier tarifaire', `${payload.roomType} · ${payload.date}`, payload.closed ? 'Vente fermée.' : `${payload.price} FCFA · ${payload.reason}.`);
    saveDB(newDb);
    refresh();
  };

  const addPMSPackageToFolio = (folioId: string, packageId: string) => {
    const newDb = getDB();
    const folio = newDb.pmsFolios.find(item => item.id === folioId);
    const packageItem: PMSPackage | undefined = newDb.pmsPackages.find(item => item.id === packageId && item.active);
    if (!folio || !packageItem) throw new Error('Folio ou forfait introuvable');
    const nights = Math.max(1, Math.ceil((new Date(folio.departureDate).getTime() - new Date(folio.arrivalDate).getTime()) / 86400000));
    folio.charges.push({ id: `charge-package-${Date.now()}`, saleId: `package-${packageItem.id}`, externalSaleId: `FORFAIT-${Date.now().toString().slice(-6)}`, posId: newDb.posList[0]?.id || '', label: `${packageItem.name} · ${nights} nuit(s)`, amount: packageItem.pricePerNight * nights, date: new Date().toISOString(), status: 'reconciled', category: 'service', billingWindow: 'guest' });
    appendPMSAudit(newDb, 'Forfait séjour', folio.reservationNumber, `${packageItem.name} ajouté pour ${packageItem.pricePerNight * nights} FCFA.`);
    saveDB(newDb);
    refresh();
  };

  const issuePMSDoorKey = (reservationId: string) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    const room = newDb.pmsRooms.find(item => item.id === reservation?.roomId);
    if (!reservation || !room) throw new Error('Réservation ou chambre introuvable');
    if (room.status === 'maintenance') throw new Error('Clé impossible pour une chambre en maintenance');
    newDb.pmsDoorKeys.filter(item => item.reservationId === reservationId && item.status === 'active').forEach(item => { item.status = 'revoked'; });
    const code = `K${room.roomNumber}-${Date.now().toString().slice(-4)}`;
    newDb.pmsDoorKeys.unshift({ id: `key-${Date.now()}`, roomId: room.id, reservationId, code, status: 'active', issuedAt: new Date().toISOString(), validUntil: `${reservation.departureDate}T${newDb.pmsSettings.checkOutTime}:00.000Z` });
    room.keyStatus = 'issued';
    room.keyCode = code;
    appendPMSAudit(newDb, 'Clé chambre', reservation.confirmationNumber, `Clé ${code} émise pour la chambre ${room.roomNumber}.`);
    saveDB(newDb);
    refresh();
    return code;
  };

  const revokePMSDoorKey = (keyId: string) => {
    const newDb = getDB();
    const key = newDb.pmsDoorKeys.find(item => item.id === keyId);
    if (!key) throw new Error('Clé introuvable');
    key.status = 'revoked';
    const room = newDb.pmsRooms.find(item => item.id === key.roomId);
    if (room) { room.keyStatus = 'ready'; room.keyCode = undefined; }
    appendPMSAudit(newDb, 'Révocation clé', room ? `Chambre ${room.roomNumber}` : key.roomId, `Clé ${key.code} désactivée.`);
    saveDB(newDb);
    refresh();
  };

  const completePMSPreCheckIn = (reservationId: string) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    const guest = newDb.pmsGuests.find(item => item.id === reservation?.guestId);
    if (!reservation || !guest) throw new Error('Séjour ou client introuvable');
    guest.preCheckInStatus = 'completed';
    guest.consentSignedAt = new Date().toISOString();
    if (!guest.documentType) guest.documentType = 'identity_card';
    if (!guest.documentNumber) guest.documentNumber = `SN-${Date.now().toString().slice(-8)}`;
    appendPMSAudit(newDb, 'Pré-check-in mobile', reservation.confirmationNumber, `${guest.fullName} a transmis son identité et signé.`);
    saveDB(newDb);
    refresh();
  };

  const togglePMSAutomationRule = (ruleId: string) => {
    const newDb = getDB();
    const rule = newDb.pmsAutomationRules.find(item => item.id === ruleId);
    if (!rule) throw new Error('Automatisation introuvable');
    rule.active = !rule.active;
    appendPMSAudit(newDb, 'Automatisation client', rule.name, rule.active ? 'Règle activée.' : 'Règle suspendue.');
    saveDB(newDb);
    refresh();
  };

  const validatePMSMigrationRun = (runId: string) => {
    const newDb = getDB();
    const run = newDb.pmsMigrationRuns.find(item => item.id === runId);
    if (!run) throw new Error('Reprise introuvable');
    run.mappedFields = 48;
    run.rejectedRows = 0;
    run.balanceDifference = 0;
    run.warnings = 0;
    run.status = 'validated';
    appendPMSAudit(newDb, 'Validation reprise Orchestra', run.source, 'Chambres, clients, réservations et soldes rapprochés.');
    saveDB(newDb);
    refresh();
  };

  const updatePMSBookingEngine = (patch: Partial<DatabaseState['pmsBookingEngine']>) => {
    const newDb = getDB();
    Object.assign(newDb.pmsBookingEngine, patch);
    appendPMSAudit(newDb, 'Moteur de réservation', newDb.pmsBookingEngine.publicUrl, newDb.pmsBookingEngine.enabled ? 'Vente directe active.' : 'Vente directe suspendue.');
    saveDB(newDb);
    refresh();
  };

  const advancePMSDayScenario = () => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === 'res-118');
    const room = newDb.pmsRooms.find(item => item.id === 'room-118');
    const guest = newDb.pmsGuests.find(item => item.id === 'guest-sarah');
    if (!reservation || !room || !guest) throw new Error('Scénario hôtel indisponible');
    const step = newDb.pmsScenarioStep;

    if (step === 1) {
      const existingSale = newDb.externalSales.find(item => item.externalSaleId === 'SCENARIO-PMS-118');
      if (!existingSale) {
        const result = stockEngine.processExternalSale(
          {
            externalSaleId: 'SCENARIO-PMS-118',
            siteId: 'site-1',
            posId: 'pos-1',
            items: [{ productId: 'prod-thieb-signature', quantity: 1 }],
            paymentContext: { type: 'room_charge', roomNumber: '118', folioId: 'folio-118', amount: 9500 }
          },
          newDb.currentUser.id,
          newDb.currentUser.name
        );
        if (!result.success) throw new Error(result.error || 'Vente POS impossible');
      }
      const updatedDb = getDB();
      updatedDb.pmsScenarioStep = 2;
      appendPMSAudit(updatedDb, 'Scénario : vente POS', reservation.confirmationNumber, 'Thieboudienne à 9 500 FCFA imputé sur la chambre et déduit du dépôt restaurant.');
      saveDB(updatedDb);
      refresh();
      return;
    }

    if (step === 0) {
      reservation.status = 'checked_in';
      room.status = 'occupied';
      room.housekeepingStatus = 'inspected';
      if (!newDb.pmsFolios.some(item => item.id === 'folio-118')) {
        newDb.pmsFolios.push({
          id: 'folio-118', roomId: room.id, guestId: guest.id, reservationId: reservation.id,
          guestName: guest.fullName, reservationNumber: reservation.confirmationNumber,
          arrivalDate: reservation.arrivalDate, departureDate: reservation.departureDate, status: 'open',
          charges: [{ id: 'charge-118-room', saleId: 'stay-118', externalSaleId: 'SEJOUR-118', posId: newDb.posList[0]?.id || '', label: '2 nuitées Chambre Supérieure', amount: 110000, date: new Date().toISOString(), status: 'reconciled', category: 'room' }],
          payments: [{ id: 'deposit-118', amount: 25000, method: 'wave', date: new Date().toISOString(), reference: 'Acompte réservation', kind: 'deposit' }]
        });
      }
      appendPMSAudit(newDb, 'Scénario : check-in', reservation.confirmationNumber, 'Client installé en chambre 118.');
    } else if (step === 2) {
      const charge = newDb.pmsFolios.find(item => item.id === 'folio-118')?.charges.find(item => item.externalSaleId === 'SCENARIO-PMS-118');
      if (charge) charge.status = 'reconciled';
      appendPMSAudit(newDb, 'Scénario : rapprochement', reservation.confirmationNumber, 'Ticket restaurant rapproché avec le folio.');
    } else if (step === 3) {
      const folio = newDb.pmsFolios.find(item => item.id === 'folio-118');
      if (folio) {
        const balance = folio.charges.reduce((sum, item) => sum + item.amount, 0) - folio.payments.reduce((sum, item) => sum + item.amount, 0);
        if (balance > 0) folio.payments.push({ id: 'payment-118-final', amount: balance, method: 'orange_money', date: new Date().toISOString(), reference: 'OM-SOLDE-118', kind: 'payment' });
      }
      appendPMSAudit(newDb, 'Scénario : paiement', reservation.confirmationNumber, 'Solde réglé par Orange Money.');
    } else if (step === 4) {
      reservation.status = 'checked_out';
      room.status = 'vacant';
      room.housekeepingStatus = 'dirty';
      const folio = newDb.pmsFolios.find(item => item.id === 'folio-118');
      if (folio) folio.status = 'closed';
      if (!newDb.pmsHousekeepingTasks.some(item => item.id === 'hk-scenario-118')) newDb.pmsHousekeepingTasks.push({ id: 'hk-scenario-118', roomId: room.id, assignedTo: 'Mariama Sarr', status: 'pending', priority: 'urgent', scheduledDate: newDb.pmsSettings.businessDate, note: 'Nettoyage après départ scénario.' });
      appendPMSAudit(newDb, 'Scénario : check-out', reservation.confirmationNumber, 'Folio soldé et chambre libérée.');
    } else if (step === 5) {
      const task = newDb.pmsHousekeepingTasks.find(item => item.id === 'hk-scenario-118');
      if (task) task.status = 'inspected';
      room.housekeepingStatus = 'inspected';
      appendPMSAudit(newDb, 'Scénario : chambre prête', 'Chambre 118', 'Nettoyage terminé et contrôlé.');
    }
    newDb.pmsScenarioStep = Math.min(6, step + 1);
    saveDB(newDb);
    refresh();
  };

  const resetPMSDayScenario = () => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === 'res-118');
    const room = newDb.pmsRooms.find(item => item.id === 'room-118');
    if (reservation) reservation.status = 'confirmed';
    if (room) { room.status = 'vacant'; room.housekeepingStatus = 'inspected'; }
    newDb.pmsFolios = newDb.pmsFolios.filter(item => item.id !== 'folio-118');
    newDb.pmsHousekeepingTasks = newDb.pmsHousekeepingTasks.filter(item => item.id !== 'hk-scenario-118');
    const scenarioSales = newDb.externalSales.filter(item => item.externalSaleId === 'SCENARIO-PMS-118');
    const scenarioSaleIds = new Set(scenarioSales.map(item => item.id));
    const scenarioMovements = newDb.movements.filter(item => item.externalReference === 'SCENARIO-PMS-118');
    scenarioMovements.forEach(movement => {
      const quantityToRestore = Math.abs(movement.quantity);
      const batch = newDb.batches.find(item => item.id === movement.batchId);
      const stock = newDb.stocks.find(item => item.productId === movement.productId && item.warehouseId === movement.warehouseId);
      if (batch) batch.quantity += quantityToRestore;
      if (stock) stock.quantityAvailable += quantityToRestore;
    });
    scenarioSales.forEach(sale => {
      const session = newDb.cashSessions.find(item => item.id === sale.cashSessionId);
      if (session) {
        session.totalSales = Math.max(0, session.totalSales - sale.paymentContext.amount);
        session.paymentTotals[sale.paymentContext.type] = Math.max(0, session.paymentTotals[sale.paymentContext.type] - sale.paymentContext.amount);
      }
    });
    newDb.externalSales = newDb.externalSales.filter(item => item.externalSaleId !== 'SCENARIO-PMS-118');
    newDb.movements = newDb.movements.filter(item => item.externalReference !== 'SCENARIO-PMS-118');
    newDb.cashSessions = newDb.cashSessions.map(session => ({ ...session, saleIds: session.saleIds.filter(id => !scenarioSaleIds.has(id)) }));
    newDb.pmsScenarioStep = 0;
    appendPMSAudit(newDb, 'Réinitialisation scénario', 'Parcours journée hôtel', 'Le scénario est prêt à être rejoué.');
    saveDB(newDb);
    refresh();
  };

  const runPMSNightAudit = () => {
    const newDb = getDB();
    const pendingPOS = newDb.pmsFolios.flatMap(folio => folio.charges).filter(charge => charge.status === 'pending').length;
    const pendingDepartures = newDb.pmsReservations.filter(reservation => reservation.status === 'checked_in' && reservation.departureDate <= newDb.pmsSettings.businessDate).length;
    const unassignedArrivals = newDb.pmsReservations.filter(reservation => !reservation.roomId && reservation.status === 'confirmed' && reservation.arrivalDate <= newDb.pmsSettings.businessDate).length;
    const inconsistentRooms = newDb.pmsRooms.filter(room => room.status === 'occupied' && ['dirty', 'in_progress'].includes(room.housekeepingStatus)).length;
    const blockers = [pendingPOS, pendingDepartures, unassignedArrivals, inconsistentRooms].reduce((sum, count) => sum + count, 0);
    if (blockers > 0) {
      throw new Error(`Clôture bloquée : ${pendingPOS} charge(s) POS, ${pendingDepartures} départ(s), ${unassignedArrivals} arrivée(s) sans chambre et ${inconsistentRooms} chambre(s) incohérente(s).`);
    }
    const occupiedRooms = newDb.pmsRooms.filter(room => room.status === 'occupied').length;
    const openFolios = newDb.pmsFolios.filter(folio => folio.status === 'open');
    const roomRevenue = openFolios.flatMap(folio => folio.charges).filter(charge => charge.category === 'room').reduce((sum, charge) => sum + charge.amount, 0);
    const posRevenue = openFolios.flatMap(folio => folio.charges).filter(charge => charge.category === 'restaurant').reduce((sum, charge) => sum + charge.amount, 0);
    const openBalance = openFolios.reduce((sum, folio) => {
      const charges = folio.charges.reduce((total, charge) => total + charge.amount, 0);
      const payments = folio.payments.reduce((total, payment) => total + payment.amount, 0);
      return sum + Math.max(0, charges - payments);
    }, 0);
    newDb.pmsNightAudits.unshift({
      id: `audit-night-${Date.now()}`,
      businessDate: newDb.pmsSettings.businessDate,
      completedAt: new Date().toISOString(),
      completedBy: newDb.currentUser.name,
      occupiedRooms,
      roomRevenue,
      posRevenue,
      openBalance,
      status: 'completed'
    });
    appendPMSAudit(newDb, 'Clôture journalière', newDb.pmsSettings.businessDate, `${occupiedRooms} chambres occupées, solde ouvert ${openBalance} FCFA.`);
    const nextDate = new Date(`${newDb.pmsSettings.businessDate}T12:00:00`);
    nextDate.setDate(nextDate.getDate() + 1);
    newDb.pmsSettings.businessDate = nextDate.toISOString().slice(0, 10);
    saveDB(newDb);
    refresh();
  };

  const updatePMSSettings = (settings: PMSSettings) => {
    const newDb = getDB();
    newDb.pmsSettings = settings;
    appendPMSAudit(newDb, 'Réglages PMS', settings.hotelName, `Journée hôtelière ${settings.businessDate}.`);
    saveDB(newDb);
    refresh();
  };

  const simulatePMSMigration = () => {
    const newDb = getDB();
    newDb.pmsMigrationRuns.unshift({
      id: `migration-${Date.now()}`,
      source: 'Orchestra - fichier de reprise',
      importedAt: new Date().toISOString(),
      rooms: newDb.pmsRooms.length,
      guests: newDb.pmsGuests.length,
      reservations: newDb.pmsReservations.length,
      warnings: 0,
      status: 'validated',
      mappedFields: 24,
      rejectedRows: 0,
      balanceDifference: 0
    });
    appendPMSAudit(newDb, 'Migration Orchestra', 'Reprise des données', 'Import contrôlé, soldes équilibrés et aucune ligne rejetée.');
    saveDB(newDb);
    refresh();
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
        issues.push({ rowNumber, ticketId: row.ticketId, message: `Produit de caisse non reconnu : ${row.externalSku} - ${row.label}` });
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
      const pos = db.posList.find(item => item.id === firstRow.posId);
      const hasMixedPayments = ticketRows.some(row => row.paymentType !== firstRow.paymentType);
      if (!pos || hasMixedPayments) {
        rejectedCount += 1;
        issues.push({
          rowNumber: firstRow.rowNumber,
          ticketId: firstRow.ticketId,
          message: !pos ? 'Point de vente introuvable' : 'Plusieurs moyens de paiement sur un même ticket ne sont pas encore pris en charge'
        });
        return;
      }

      const room = firstRow.roomNumber
        ? db.pmsRooms.find(item => item.roomNumber === firstRow.roomNumber)
        : undefined;
      const folio = room
        ? db.pmsFolios.find(item => item.roomId === room.id && item.status === 'open')
        : undefined;
      if (firstRow.paymentType === 'room_charge' && !folio) {
        rejectedCount += 1;
        issues.push({
          rowNumber: firstRow.rowNumber,
          ticketId: firstRow.ticketId,
          message: `Aucun folio PMS ouvert pour la chambre ${firstRow.roomNumber || 'non renseignée'}`
        });
        return;
      }

      const result = stockEngine.processExternalSale(
        {
          externalSaleId: `IMPORT-${firstRow.ticketId}`,
          siteId: pos.siteId,
          posId: firstRow.posId,
          items: ticketRows.map(row => ({ productId: row.productId, quantity: row.quantity })),
          paymentContext: {
            type: firstRow.paymentType,
            roomNumber: firstRow.roomNumber,
            folioId: folio?.id,
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
      paymentTotals: createEmptyPaymentTotals(),
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
    const paymentTotals: PaymentTotals = createEmptyPaymentTotals();

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

  const reserveDeliveryOrder = (orderId: string) => {
    const result = stockEngine.reserveDeliveryOrder(orderId, db.currentUser.id, db.currentUser.name);
    refresh();
    return result;
  };

  const startDeliveryPreparation = (orderId: string) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'preparing', db.currentUser.id, db.currentUser.name);
    refresh();
    return result;
  };

  const markDeliveryReady = (orderId: string) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'ready', db.currentUser.id, db.currentUser.name);
    refresh();
    return result;
  };

  const dispatchDeliveryOrder = (orderId: string) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'out_for_delivery', db.currentUser.id, db.currentUser.name);
    refresh();
    return result;
  };

  const failDeliveryOrder = (orderId: string, issue?: string) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'failed', db.currentUser.id, db.currentUser.name, issue);
    refresh();
    return result;
  };

  const returnDeliveryOrder = (orderId: string) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'returned', db.currentUser.id, db.currentUser.name);
    refresh();
    return result;
  };

  const cancelDeliveryOrder = (orderId: string) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'cancelled', db.currentUser.id, db.currentUser.name);
    refresh();
    return result;
  };

  const deliverDeliveryOrder = (orderId: string) => {
    const result = stockEngine.deliverDeliveryOrder(orderId, db.currentUser.id, db.currentUser.name);
    refresh();
    return result;
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
    savePMSConfigRecord,
    deletePMSConfigRecord,
    createPMSReservation,
    updatePMSReservation,
    deletePMSReservation,
    updatePMSReservationStatus,
    assignPMSRoom,
    holdPMSRoom,
    releasePMSRoomHold,
    completePMSCheckIn,
    updatePMSRoom,
    updatePMSHousekeepingTask,
    updatePMSHousekeepingDetails,
    addPMSFolioPayment,
    transferPMSFolioCharge,
    routePMSFolioCharge,
    issuePMSDocument,
    refundPMSPayment,
    updatePMSMaintenanceTicket,
    updatePMSMaintenanceDetails,
    addPMSServiceRequest,
    updatePMSServiceRequest,
    sendPMSNotification,
    schedulePMSNotification,
    deletePMSNotification,
    syncPMSChannel,
    updatePMSRatePlan,
    upsertPMSRateOverride,
    deletePMSRateOverride,
    addPMSPackageToFolio,
    issuePMSDoorKey,
    revokePMSDoorKey,
    completePMSPreCheckIn,
    togglePMSAutomationRule,
    validatePMSMigrationRun,
    updatePMSBookingEngine,
    advancePMSDayScenario,
    resetPMSDayScenario,
    runPMSNightAudit,
    updatePMSSettings,
    simulatePMSMigration,
    importExternalPOSSales,
    openCashSession,
    closeCashSession,
    reserveDeliveryOrder,
    startDeliveryPreparation,
    markDeliveryReady,
    dispatchDeliveryOrder,
    failDeliveryOrder,
    returnDeliveryOrder,
    cancelDeliveryOrder,
    deliverDeliveryOrder,
    resetAllData
  };
};
export type StockState = ReturnType<typeof useStockState>;
