import { BACKOFFICE_VIEW_IDS, USER_ROLES, canAccessBackofficeView, type BackofficeViewId } from './accessControl';
import type { DatabaseState } from './db';
import type { AccessRoleTemplate, SartalFormulaId, SartalModule, User, UserAccessScope, UserRole } from './types';

export const ALL_SARTAL_MODULES: readonly SartalModule[] = ['stock', 'restaurant', 'delivery', 'pms'];

export const FORMULA_OPTIONS: ReadonlyArray<{
  id: SartalFormulaId;
  label: string;
  description: string;
  modules: SartalModule[];
}> = [
  { id: 'stock', label: 'Sártal Stock', description: 'Stock, dépôts, achats, fournisseurs, inventaires et rapports.', modules: ['stock'] },
  { id: 'restaurant-stock', label: 'Restaurant + Stock', description: 'Restaurant, caisse, cuisine, recettes et stock.', modules: ['stock', 'restaurant'] },
  { id: 'delivery-stock', label: 'Vente en ligne + Stock', description: 'Catalogue, préparation, livraison et stock disponible.', modules: ['stock', 'delivery'] },
  { id: 'pms-stock', label: 'PMS Hôtel + Stock', description: 'Réservations, chambres, folios, housekeeping et stock hôtel.', modules: ['stock', 'pms'] },
  { id: 'pms-restaurant-stock', label: 'PMS + Restaurant + Stock', description: 'Hôtel, restaurant, folio chambre et stocks reliés.', modules: ['stock', 'restaurant', 'pms'] },
  { id: 'suite-complete', label: 'Suite complète Sártal', description: 'Tous les modules et toutes les équipes dans une organisation unique.', modules: ['stock', 'restaurant', 'delivery', 'pms'] }
];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  director: 'Direction générale',
  stock_manager: 'Responsable stock',
  storekeeper: 'Magasinier',
  pos_manager: 'Manager restaurant',
  pms_manager: 'Manager PMS',
  purchasing_manager: 'Responsable achats',
  finance_manager: 'Finance & contrôle',
  crm_manager: 'CRM & fidélité',
  ecommerce_manager: 'Direction e-commerce',
  night_auditor: 'Contrôleur de nuit',
  auditor: 'Auditeur stock'
};

export const BACKOFFICE_VIEW_LABELS: Record<BackofficeViewId, string> = {
  pulse: 'Sártal Pulse',
  dashboard: 'Tableau de bord',
  'guided-demo': 'Présentation guidée',
  'business-problems': 'Problèmes métier',
  client: 'Suivi clients en direct',
  crm: 'CRM & fidélité',
  employees: 'Organisation & accès',
  finance: 'Finance & rapprochement',
  answer: 'Salle & opérations',
  simulation: 'Simulation multi-POS',
  connectors: 'Caisse POS',
  'pos-imports': 'Reprendre ventes caisse',
  pms: 'Hôtel / PMS',
  delivery: 'Parcours livraison',
  'stock-control': 'Stock réel',
  products: 'Catalogue & recettes',
  pricing: 'Prix par canal',
  warehouses: 'Canaux & dépôts',
  stocks: 'Lots de stock',
  reorder: 'À commander',
  purchases: 'Achats fournisseurs',
  receiving: 'Réceptions stock',
  transfers: 'Transferts dépôts',
  inventories: 'Inventaires',
  losses: 'Pertes & casses',
  suppliers: 'Fournisseurs',
  'stock-audit': 'Audit des écarts',
  'smart-alerts': 'Alertes intelligentes',
  'mapping-control': 'Contrôle des données',
  movements: 'Journal stock',
  exports: 'Rapports',
  settings: 'Réglages'
};

const ROLE_META: Record<UserRole, { description: string; modules: SartalModule[]; scopeLevel: AccessRoleTemplate['scopeLevel'] }> = {
  admin: { description: 'Paramétrage complet, abonnements, comptes et référentiels.', modules: [...ALL_SARTAL_MODULES], scopeLevel: 'company' },
  director: { description: 'Pilotage consolidé de toutes les activités souscrites.', modules: [...ALL_SARTAL_MODULES], scopeLevel: 'company' },
  stock_manager: { description: 'Stocks, dépôts, inventaires, pertes et réapprovisionnement.', modules: ['stock'], scopeLevel: 'site' },
  storekeeper: { description: 'Réceptions, mouvements et opérations physiques du dépôt.', modules: ['stock'], scopeLevel: 'operational' },
  pos_manager: { description: 'Équipe, salle, prix et opérations de son restaurant.', modules: ['stock', 'restaurant'], scopeLevel: 'operational' },
  pms_manager: { description: 'Exploitation, planning et paramétrage opérationnel hôtelier.', modules: ['stock', 'pms'], scopeLevel: 'site' },
  purchasing_manager: { description: 'Commandes, fournisseurs, coûts et disponibilité matière.', modules: ['stock'], scopeLevel: 'site' },
  finance_manager: { description: 'Caisses, folios, rapprochements et contrôles financiers.', modules: [...ALL_SARTAL_MODULES], scopeLevel: 'company' },
  crm_manager: { description: 'Profils clients, consentements, fidélité et qualité de service.', modules: ['stock', 'restaurant', 'delivery', 'pms'], scopeLevel: 'company' },
  ecommerce_manager: { description: 'Catalogue en ligne, commandes, préparation et livraison.', modules: ['stock', 'delivery'], scopeLevel: 'site' },
  night_auditor: { description: 'Clôture hôtelière, folios et contrôles de fin de journée.', modules: ['stock', 'pms'], scopeLevel: 'site' },
  auditor: { description: 'Lecture des écarts, mouvements et preuves de traçabilité.', modules: ['stock'], scopeLevel: 'company' }
};

export const createDefaultAccessRoleTemplates = (): AccessRoleTemplate[] => USER_ROLES.map(role => {
  const meta = ROLE_META[role];
  return {
    id: `role-${role.replaceAll('_', '-')}`,
    name: USER_ROLE_LABELS[role],
    description: meta.description,
    role,
    modules: [...meta.modules],
    viewIds: BACKOFFICE_VIEW_IDS.filter(view => canAccessBackofficeView(role, meta.modules, view)),
    scopeLevel: meta.scopeLevel,
    protected: ['admin', 'director'].includes(role),
    active: true
  };
});

export interface AccessScopeContext {
  companyId?: string;
  siteIds: string[];
  posIds: string[];
  warehouseIds: string[];
  enabledModules: readonly SartalModule[];
  preferredSiteId?: string;
  preferredPosId?: string;
  preferredWarehouseId?: string;
}

export const createDefaultUserScope = (role: UserRole, context: AccessScopeContext): UserAccessScope => {
  const meta = ROLE_META[role];
  const modules = meta.modules.filter(module => context.enabledModules.includes(module));
  const allSites = context.siteIds;
  const siteIds = meta.scopeLevel === 'company'
    ? allSites
    : [context.preferredSiteId || allSites[0]].filter(Boolean) as string[];
  const posIds = meta.scopeLevel === 'company'
    ? context.posIds
    : role === 'pos_manager'
      ? [context.preferredPosId || context.posIds[0]].filter(Boolean) as string[]
      : role === 'ecommerce_manager'
        ? context.posIds.filter(id => id === context.preferredPosId)
        : [];
  const warehouseIds = meta.scopeLevel === 'company' || ['stock_manager', 'purchasing_manager', 'auditor'].includes(role)
    ? context.warehouseIds
    : ['storekeeper', 'pos_manager', 'ecommerce_manager', 'pms_manager', 'night_auditor'].includes(role)
      ? [context.preferredWarehouseId || context.warehouseIds[0]].filter(Boolean) as string[]
      : [];
  return { companyId: context.companyId, siteIds, posIds, warehouseIds, modules };
};

const emailSlug = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

export const normalizeUserAccess = (
  user: User,
  context: AccessScopeContext,
  templates: readonly AccessRoleTemplate[]
): User => {
  const template = templates.find(item => item.id === user.roleTemplateId) || templates.find(item => item.role === user.role);
  return {
    ...user,
    email: user.email || `${emailSlug(user.name) || user.id}@demo.sartal.sn`,
    phone: user.phone || '+221 77 000 00 00',
    status: user.status || 'active',
    roleTemplateId: template?.id,
    scope: user.scope || createDefaultUserScope(user.role, context),
    allowedViews: user.allowedViews?.length ? user.allowedViews.filter(view => BACKOFFICE_VIEW_IDS.includes(view as BackofficeViewId)) : template?.viewIds || [],
    lastLoginAt: user.lastLoginAt || new Date(Date.now() - 45 * 60000).toISOString()
  };
};

export const describeUserScope = (user: User, database: Pick<DatabaseState, 'companies' | 'sites' | 'posList' | 'warehouses'>) => {
  const scope = user.scope;
  if (!scope) return ['Périmètre hérité du rôle'];
  const labels: string[] = [];
  if (scope.companyId) labels.push(database.companies.find(item => item.id === scope.companyId)?.name || 'Entreprise');
  scope.siteIds.forEach(id => labels.push(database.sites.find(item => item.id === id)?.name || id));
  scope.posIds.forEach(id => labels.push(database.posList.find(item => item.id === id)?.name || id));
  scope.warehouseIds.forEach(id => labels.push(database.warehouses.find(item => item.id === id)?.name || id));
  return [...new Set(labels)];
};

export const scopeDatabaseForUser = (database: DatabaseState, user: User): DatabaseState => {
  const scope = user.scope;
  if (!scope) return database;
  const siteIds = new Set(scope.siteIds);
  const posIds = new Set(scope.posIds);
  const warehouseIds = new Set(scope.warehouseIds);
  const employeeProfiles = database.employeeProfiles.filter(employee => (
    siteIds.has(employee.siteId)
    && (!employee.posId || posIds.has(employee.posId))
    && (!employee.warehouseId || warehouseIds.has(employee.warehouseId))
  ));
  const employeeIds = new Set(employeeProfiles.map(employee => employee.id));
  const pmsEnabled = scope.modules.includes('pms') && (siteIds.size === 0 || siteIds.has(database.sites[0]?.id));
  const canGovernAccess = ['admin', 'director'].includes(user.role);
  const visibleUsers = canGovernAccess
    ? database.users.filter(candidate => user.role === 'admin' || !candidate.scope?.siteIds.length || candidate.scope.siteIds.some(siteId => siteIds.has(siteId)))
    : database.users.filter(candidate => candidate.id === user.id);

  return {
    ...database,
    sites: database.sites.filter(site => siteIds.has(site.id)),
    posList: database.posList.filter(pos => posIds.has(pos.id)),
    warehouses: database.warehouses.filter(warehouse => warehouseIds.has(warehouse.id)),
    posProductAliases: database.posProductAliases.filter(alias => !alias.posId || posIds.has(alias.posId)),
    posPricing: database.posPricing.filter(pricing => posIds.has(pricing.posId)),
    stocks: database.stocks.filter(stock => warehouseIds.has(stock.warehouseId)),
    batches: database.batches.filter(batch => warehouseIds.has(batch.warehouseId)),
    movements: database.movements.filter(movement => (
      (!movement.siteId || siteIds.has(movement.siteId))
      && (!movement.posId || posIds.has(movement.posId))
      && (!movement.warehouseId || warehouseIds.has(movement.warehouseId))
    )),
    transfers: database.transfers.filter(transfer => warehouseIds.has(transfer.sourceWarehouseId) || warehouseIds.has(transfer.destinationWarehouseId)),
    inventories: database.inventories.filter(inventory => warehouseIds.has(inventory.warehouseId)),
    losses: database.losses.filter(loss => warehouseIds.has(loss.warehouseId)),
    externalSales: database.externalSales.filter(sale => siteIds.has(sale.siteId) && posIds.has(sale.posId)),
    deliveryOrders: database.deliveryOrders.filter(order => warehouseIds.has(order.warehouseId) && posIds.has(order.channelId)),
    restaurantDiningTables: database.restaurantDiningTables.filter(item => posIds.has(item.posId)),
    restaurantFloorElements: database.restaurantFloorElements.filter(item => posIds.has(item.posId)),
    restaurantFloorPlanSettings: database.restaurantFloorPlanSettings.filter(item => posIds.has(item.posId)),
    restaurantFloorPlanVersions: database.restaurantFloorPlanVersions.filter(item => posIds.has(item.posId)),
    restaurantFloorAudit: database.restaurantFloorAudit.filter(item => posIds.has(item.posId)),
    restaurantReservations: database.restaurantReservations.filter(item => posIds.has(item.posId)),
    restaurantGuestOrders: database.restaurantGuestOrders.filter(item => posIds.has(item.posId)),
    restaurantServiceSections: database.restaurantServiceSections.filter(item => posIds.has(item.posId)),
    restaurantServiceIncidents: database.restaurantServiceIncidents.filter(item => posIds.has(item.posId)),
    restaurantTrainingRuns: database.restaurantTrainingRuns.filter(item => posIds.has(item.posId)),
    employeeProfiles,
    employeeShifts: database.employeeShifts.filter(item => employeeIds.has(item.employeeId)),
    employeeSchedules: database.employeeSchedules.filter(item => employeeIds.has(item.employeeId)),
    employeeMessages: database.employeeMessages.filter(item => siteIds.has(item.siteId)),
    employeeApprovals: database.employeeApprovals.filter(item => employeeIds.has(item.requestedBy)),
    employeeWellbeingCheckIns: database.employeeWellbeingCheckIns.filter(item => employeeIds.has(item.employeeId)),
    employeeSupportRequests: database.employeeSupportRequests.filter(item => employeeIds.has(item.employeeId) && siteIds.has(item.siteId)),
    employeeBreaks: database.employeeBreaks.filter(item => employeeIds.has(item.employeeId)),
    employeeRecognitions: database.employeeRecognitions.filter(item => employeeIds.has(item.employeeId)),
    cashSessions: database.cashSessions.filter(item => posIds.has(item.posId)),
    pmsRooms: pmsEnabled ? database.pmsRooms : [],
    pmsFolios: pmsEnabled ? database.pmsFolios : [],
    pmsGuests: pmsEnabled ? database.pmsGuests : [],
    pmsReservations: pmsEnabled ? database.pmsReservations : [],
    pmsHousekeepingTasks: pmsEnabled ? database.pmsHousekeepingTasks : [],
    pmsMaintenanceTickets: pmsEnabled ? database.pmsMaintenanceTickets : [],
    pmsServiceRequests: pmsEnabled ? database.pmsServiceRequests : [],
    pmsNightAudits: pmsEnabled ? database.pmsNightAudits : [],
    pmsMigrationRuns: pmsEnabled ? database.pmsMigrationRuns : [],
    pmsRatePlans: pmsEnabled ? database.pmsRatePlans : [],
    pmsGroups: pmsEnabled ? database.pmsGroups : [],
    pmsEvents: pmsEnabled ? database.pmsEvents : [],
    pmsInvoices: pmsEnabled ? database.pmsInvoices : [],
    pmsRateOverrides: pmsEnabled ? database.pmsRateOverrides : [],
    pmsChannels: pmsEnabled ? database.pmsChannels : [],
    pmsNotifications: pmsEnabled ? database.pmsNotifications : [],
    pmsAuditLogs: pmsEnabled ? database.pmsAuditLogs : [],
    pmsPropertySummaries: pmsEnabled ? database.pmsPropertySummaries : [],
    pmsPackages: pmsEnabled ? database.pmsPackages : [],
    pmsDoorKeys: pmsEnabled ? database.pmsDoorKeys : [],
    pmsDebtorAccounts: pmsEnabled ? database.pmsDebtorAccounts : [],
    pmsAutomationRules: pmsEnabled ? database.pmsAutomationRules : [],
    pmsGuestMessages: pmsEnabled ? database.pmsGuestMessages : [],
    pmsStayCompanions: pmsEnabled ? database.pmsStayCompanions : [],
    pmsGuestFeedback: pmsEnabled ? database.pmsGuestFeedback : [],
    pmsScenarioStep: pmsEnabled ? database.pmsScenarioStep : 0,
    users: visibleUsers,
    accessRoleTemplates: canGovernAccess ? database.accessRoleTemplates : database.accessRoleTemplates.filter(template => template.role === user.role),
    accessAuditEvents: canGovernAccess
      ? database.accessAuditEvents.filter(event => !event.siteId || siteIds.has(event.siteId))
      : database.accessAuditEvents.filter(event => event.actorId === user.id || event.targetId === user.id),
    currentUser: user
  };
};
