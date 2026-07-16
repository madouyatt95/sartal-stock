import type { SartalModule, User, UserRole } from './types';

export const BACKOFFICE_VIEW_IDS = [
  'pulse',
  'dashboard',
  'guided-demo',
  'business-problems',
  'client',
  'crm',
  'employees',
  'finance',
  'answer',
  'simulation',
  'connectors',
  'pos-imports',
  'pms',
  'delivery',
  'stock-control',
  'products',
  'pricing',
  'warehouses',
  'stocks',
  'reorder',
  'purchases',
  'receiving',
  'transfers',
  'inventories',
  'losses',
  'suppliers',
  'stock-audit',
  'smart-alerts',
  'mapping-control',
  'movements',
  'exports',
  'settings'
] as const;

export type BackofficeViewId = (typeof BACKOFFICE_VIEW_IDS)[number];

interface BackofficeAccessRule {
  roles: readonly UserRole[];
  module?: SartalModule;
  anyModule?: readonly SartalModule[];
}

export const USER_ROLES: readonly UserRole[] = [
  'admin',
  'director',
  'stock_manager',
  'storekeeper',
  'pos_manager',
  'pms_manager',
  'purchasing_manager',
  'finance_manager',
  'crm_manager',
  'ecommerce_manager',
  'night_auditor',
  'auditor'
];

const everyRole = USER_ROLES;

export const BACKOFFICE_ACCESS_RULES: Record<BackofficeViewId, BackofficeAccessRule> = {
  pulse: { roles: everyRole },
  dashboard: { roles: everyRole },
  'guided-demo': { roles: everyRole },
  'business-problems': { roles: everyRole },
  client: { roles: ['admin', 'director', 'pos_manager', 'pms_manager', 'crm_manager', 'ecommerce_manager'], anyModule: ['restaurant', 'delivery', 'pms'] },
  crm: { roles: ['admin', 'director', 'pos_manager', 'pms_manager', 'crm_manager', 'ecommerce_manager'], anyModule: ['restaurant', 'delivery', 'pms'] },
  employees: { roles: ['admin', 'director', 'stock_manager', 'pos_manager', 'pms_manager', 'ecommerce_manager'] },
  finance: { roles: ['admin', 'director', 'stock_manager', 'finance_manager', 'ecommerce_manager', 'night_auditor', 'auditor'], anyModule: ['restaurant', 'delivery', 'pms'] },
  answer: { roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'], module: 'restaurant' },
  simulation: { roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'], module: 'restaurant' },
  connectors: { roles: ['admin'], module: 'restaurant' },
  'pos-imports': { roles: ['admin', 'director', 'stock_manager', 'auditor'], module: 'restaurant' },
  pms: { roles: ['admin', 'director', 'pms_manager', 'finance_manager', 'night_auditor', 'auditor'], module: 'pms' },
  delivery: { roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'ecommerce_manager', 'auditor'], module: 'delivery' },
  'stock-control': { roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'pms_manager', 'purchasing_manager', 'finance_manager', 'ecommerce_manager', 'night_auditor', 'auditor'], module: 'stock' },
  products: { roles: ['admin', 'director', 'stock_manager', 'purchasing_manager', 'ecommerce_manager'], module: 'stock' },
  pricing: { roles: ['admin', 'director', 'stock_manager', 'pos_manager', 'ecommerce_manager'], module: 'stock' },
  warehouses: { roles: ['admin', 'director', 'stock_manager', 'purchasing_manager', 'ecommerce_manager'], module: 'stock' },
  stocks: { roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'pms_manager', 'purchasing_manager', 'finance_manager', 'ecommerce_manager', 'night_auditor', 'auditor'], module: 'stock' },
  reorder: { roles: ['admin', 'director', 'stock_manager', 'purchasing_manager', 'ecommerce_manager'], module: 'stock' },
  purchases: { roles: ['admin', 'director', 'stock_manager', 'purchasing_manager'], module: 'stock' },
  receiving: { roles: ['admin', 'storekeeper'], module: 'stock' },
  transfers: { roles: ['admin', 'stock_manager', 'storekeeper'], module: 'stock' },
  inventories: { roles: ['admin', 'stock_manager', 'storekeeper'], module: 'stock' },
  losses: { roles: ['admin', 'stock_manager'], module: 'stock' },
  suppliers: { roles: ['admin', 'director', 'stock_manager', 'purchasing_manager'], module: 'stock' },
  'stock-audit': { roles: ['admin', 'director', 'stock_manager', 'finance_manager', 'night_auditor', 'auditor'], module: 'stock' },
  'smart-alerts': { roles: ['admin', 'director', 'stock_manager', 'ecommerce_manager', 'auditor'], module: 'stock' },
  'mapping-control': { roles: ['admin', 'director', 'stock_manager', 'finance_manager', 'night_auditor', 'auditor'], module: 'stock' },
  movements: { roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'pms_manager', 'purchasing_manager', 'finance_manager', 'ecommerce_manager', 'night_auditor', 'auditor'], module: 'stock' },
  exports: { roles: ['admin', 'director', 'stock_manager', 'pos_manager', 'pms_manager', 'purchasing_manager', 'finance_manager', 'crm_manager', 'ecommerce_manager', 'night_auditor', 'auditor'], module: 'stock' },
  settings: { roles: ['admin'] }
};

export const isBackofficeViewId = (view: string): view is BackofficeViewId => (
  (BACKOFFICE_VIEW_IDS as readonly string[]).includes(view)
);

export const canAccessBackofficeView = (
  role: UserRole,
  enabledModules: readonly SartalModule[],
  view: string
) => {
  if (!isBackofficeViewId(view)) return false;
  const rule = BACKOFFICE_ACCESS_RULES[view];
  if (!rule.roles.includes(role)) return false;
  if (rule.module && !enabledModules.includes(rule.module)) return false;
  if (rule.anyModule && !rule.anyModule.some(module => enabledModules.includes(module))) return false;
  return true;
};

export const getUserEnabledModules = (user: User, enabledModules: readonly SartalModule[]) => {
  const scopedModules = user.scope?.modules?.length ? user.scope.modules : enabledModules;
  return enabledModules.filter(module => scopedModules.includes(module));
};

export const canUserAccessBackofficeView = (
  user: User,
  enabledModules: readonly SartalModule[],
  view: string
) => {
  if (user.status === 'suspended' || user.status === 'invited') return false;
  if (!canAccessBackofficeView(user.role, getUserEnabledModules(user, enabledModules), view)) return false;
  if (user.allowedViews && !user.allowedViews.includes(view)) return false;
  return true;
};
