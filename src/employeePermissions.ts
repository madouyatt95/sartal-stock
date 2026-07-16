import type { EmployeePermission, EmployeeProfile, EmployeeRole } from './types';

export interface EmployeePermissionDefinition {
  id: EmployeePermission;
  group: 'Communication' | 'Restaurant & caisse' | 'Hôtel & PMS' | 'Stock' | 'Expérience client';
  label: string;
  description: string;
}

export const EMPLOYEE_PERMISSION_DEFINITIONS: readonly EmployeePermissionDefinition[] = [
  { id: 'team_messages', group: 'Communication', label: 'Messages d’équipe', description: 'Écrire aux équipes et diffuser une consigne de service.' },
  { id: 'discount_request', group: 'Restaurant & caisse', label: 'Demander une remise', description: 'Soumettre une remise ou un offert à la validation du manager.' },
  { id: 'table_payment', group: 'Restaurant & caisse', label: 'Encaisser à table', description: 'Enregistrer un règlement sur le terminal de service et le rattacher à la caisse du POS.' },
  { id: 'cash_close', group: 'Restaurant & caisse', label: 'Clôturer une caisse', description: 'Saisir le comptage final et produire le rapport de clôture.' },
  { id: 'reservation_create', group: 'Hôtel & PMS', label: 'Créer une réservation', description: 'Enregistrer une réservation sur place ou à distance.' },
  { id: 'room_assignment', group: 'Hôtel & PMS', label: 'Attribuer une chambre', description: 'Choisir une chambre et finaliser le check-in.' },
  { id: 'folio_payment', group: 'Hôtel & PMS', label: 'Encaisser un folio', description: 'Enregistrer les règlements liés au séjour.' },
  { id: 'housekeeping_validation', group: 'Hôtel & PMS', label: 'Valider une chambre', description: 'Passer une chambre nettoyée au statut contrôlé.' },
  { id: 'maintenance_update', group: 'Hôtel & PMS', label: 'Intervenir en maintenance', description: 'Prendre un ticket, documenter l’intervention et déclarer sa résolution.' },
  { id: 'delivery_dispatch', group: 'Stock', label: 'Piloter les tournées', description: 'Affecter un livreur, lancer une tournée et traiter les incidents de livraison.' },
  { id: 'stock_transfer', group: 'Stock', label: 'Transférer du stock', description: 'Déplacer des produits entre deux dépôts.' },
  { id: 'stock_adjustment', group: 'Stock', label: 'Valider un inventaire', description: 'Enregistrer un comptage et son écart de stock.' },
  { id: 'stock_loss', group: 'Stock', label: 'Déclarer une perte', description: 'Déduire une casse, une perte ou un produit périmé.' },
  { id: 'customer_recovery', group: 'Expérience client', label: 'Déclencher une reprise client', description: 'Engager un geste et suivre la résolution d’une insatisfaction.' },
  { id: 'sensitive_approval', group: 'Expérience client', label: 'Valider les actions sensibles', description: 'Accepter ou refuser remises, offerts et exceptions opérationnelles.' }
];

const roleDefaults: Record<EmployeeRole, readonly EmployeePermission[]> = {
  waiter: ['team_messages', 'discount_request', 'table_payment'],
  cashier: ['team_messages', 'discount_request', 'table_payment', 'cash_close'],
  kitchen: ['team_messages'],
  receptionist: ['team_messages', 'reservation_create', 'room_assignment', 'folio_payment'],
  housekeeper: ['team_messages'],
  housekeeping_manager: ['team_messages', 'housekeeping_validation'],
  storekeeper: ['team_messages', 'stock_transfer', 'stock_adjustment', 'stock_loss'],
  picker: ['team_messages'],
  dispatcher: ['team_messages', 'delivery_dispatch'],
  driver: ['team_messages'],
  maintenance: ['team_messages', 'maintenance_update'],
  customer_experience: ['team_messages', 'customer_recovery'],
  service_manager: EMPLOYEE_PERMISSION_DEFINITIONS.map(item => item.id)
};

export const getDefaultEmployeePermissions = (role: EmployeeRole) => [...roleDefaults[role]];

export const getEmployeePermissions = (employee: Pick<EmployeeProfile, 'role' | 'permissions'>) => (
  employee.permissions ? [...employee.permissions] : getDefaultEmployeePermissions(employee.role)
);

export const hasEmployeePermission = (
  employee: Pick<EmployeeProfile, 'role' | 'permissions'>,
  permission: EmployeePermission
) => getEmployeePermissions(employee).includes(permission);

export const normalizeEmployeePermissions = (permissions: readonly EmployeePermission[]) => (
  EMPLOYEE_PERMISSION_DEFINITIONS.map(item => item.id).filter(permission => permissions.includes(permission))
);
