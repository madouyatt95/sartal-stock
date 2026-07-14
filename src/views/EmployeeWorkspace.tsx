import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BedDouble,
  Bell,
  Boxes,
  CalendarCheck,
  Camera,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CreditCard,
  DoorOpen,
  HandCoins,
  HeartHandshake,
  Home,
  LayoutGrid,
  LockKeyhole,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Navigation,
  PackageCheck,
  PackageSearch,
  Phone,
  ReceiptText,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  UsersRound,
  UtensilsCrossed,
  WalletCards,
  Warehouse,
  WifiOff,
  XCircle,
  type LucideIcon
} from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { EmployeeRole, PaymentType } from '../types';

type StaffTab = 'today' | 'tasks' | 'action' | 'messages' | 'more';
type TaskTone = 'urgent' | 'active' | 'waiting' | 'done';
type ReceptionWorkspace = 'arrivals' | 'rooms';
type StockWorkspace = 'scan' | 'receiving' | 'transfers' | 'inventory' | 'journal';

interface EmployeeWorkspaceProps {
  state: StockState;
}

interface RoleConfig {
  label: string;
  team: string;
  actionLabel: string;
  icon: LucideIcon;
  color: string;
}

interface StaffTask {
  id: string;
  title: string;
  detail: string;
  meta: string;
  tone: TaskTone;
  actionLabel?: string;
  action?: () => void;
}

const ROLE_CONFIG: Record<EmployeeRole, RoleConfig> = {
  waiter: { label: 'Serveur / Chef de rang', team: 'Salle', actionLabel: 'Table', icon: UtensilsCrossed, color: '#17786c' },
  cashier: { label: 'Caissier', team: 'Caisse', actionLabel: 'Caisse', icon: WalletCards, color: '#2463a9' },
  kitchen: { label: 'Cuisine / KDS', team: 'Cuisine', actionLabel: 'Ticket', icon: ChefHat, color: '#be5e31' },
  receptionist: { label: 'Réceptionniste hôtel', team: 'Réception', actionLabel: 'Chambre', icon: BedDouble, color: '#5b5eb5' },
  housekeeper: { label: 'Gouvernante / Étages', team: 'Étages', actionLabel: 'Chambre', icon: Sparkles, color: '#9a4678' },
  storekeeper: { label: 'Magasinier', team: 'Stock', actionLabel: 'Scanner', icon: Warehouse, color: '#14745f' },
  picker: { label: 'Préparateur livraison', team: 'Préparation', actionLabel: 'Picking', icon: PackageCheck, color: '#7b651b' },
  driver: { label: 'Livreur', team: 'Livraison', actionLabel: 'Livraison', icon: Truck, color: '#326894' },
  customer_experience: { label: 'Responsable expérience client', team: 'Expérience', actionLabel: 'Client', icon: HeartHandshake, color: '#a34b52' },
  service_manager: { label: 'Manager de service', team: 'Pilotage', actionLabel: 'Valider', icon: ShieldCheck, color: '#173f3a' }
};

const PAYMENT_LABELS: Record<PaymentType, string> = {
  cash: 'Espèces',
  card: 'Carte',
  wave: 'Wave',
  orange_money: 'Orange Money',
  room_charge: 'Chambre',
  other: 'Autre'
};

const ORDER_STATUS: Record<string, string> = {
  placed: 'Reçue',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready: 'Prête',
  served: 'Servie',
  paid: 'Payée',
  cancelled: 'Annulée',
  reserved: 'Stock réservé',
  out_for_delivery: 'En livraison',
  delivered: 'Livrée',
  failed: 'Incident',
  returned: 'Retournée',
  requested: 'À prendre',
  accepted: 'Prise en charge',
  completed: 'Terminée',
  assigned: 'Affectée',
  in_progress: 'En cours',
  pending: 'À faire',
  inspected: 'Contrôlée'
};

const formatFCFA = (amount: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} FCFA`;
const formatTime = (date: string) => new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const elapsedMinutes = (date: string) => Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));

export const EmployeeWorkspace: React.FC<EmployeeWorkspaceProps> = ({ state }) => {
  const { db } = state;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(db.employeeProfiles[0]?.id || '');
  const [pin, setPin] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<StaffTab>('today');
  const [assignmentId, setAssignmentId] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('Téléphone personnel');
  const [notice, setNotice] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState<'open' | 'urgent' | 'all'>('open');
  const [messageText, setMessageText] = useState('');
  const [messageAudience, setMessageAudience] = useState<EmployeeRole | 'all'>('service_manager');
  const [openingFloat, setOpeningFloat] = useState('50000');
  const [closingCash, setClosingCash] = useState('50000');
  const [paymentMethod, setPaymentMethod] = useState<PaymentType>('wave');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [scanQuery, setScanQuery] = useState('COCA33');
  const [lossQuantity, setLossQuantity] = useState('1');
  const [receptionWorkspace, setReceptionWorkspace] = useState<ReceptionWorkspace>('arrivals');
  const [selectedReservationId, setSelectedReservationId] = useState('');
  const [stockWorkspace, setStockWorkspace] = useState<StockWorkspace>('scan');
  const [selectedSupplierOrderId, setSelectedSupplierOrderId] = useState('');
  const [transferDestinationId, setTransferDestinationId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('1');
  const [inventoryCount, setInventoryCount] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [deliverySignature, setDeliverySignature] = useState('');
  const [handover, setHandover] = useState({ notes: '', incidents: '', amountsToCheck: '', customersToFollow: '' });

  const employee = db.employeeProfiles.find(item => item.id === selectedEmployeeId);
  const activeShift = db.employeeShifts.find(item => item.employeeId === employee?.id && item.status === 'open');
  const role = employee?.role;
  const roleConfig = role ? ROLE_CONFIG[role] : ROLE_CONFIG.waiter;

  useEffect(() => {
    setAssignmentId(employee?.posId || employee?.warehouseId || employee?.siteId || '');
    setTab('today');
  }, [employee?.id, employee?.posId, employee?.siteId, employee?.warehouseId]);

  const roleAssignments = useMemo(() => {
    if (!employee) return [];
    if (['waiter', 'cashier', 'kitchen'].includes(employee.role)) {
      return db.posList.filter(item => ['restaurant', 'room_service'].includes(item.type)).map(item => ({ id: item.id, label: item.name }));
    }
    if (['storekeeper', 'picker', 'driver'].includes(employee.role)) {
      return db.warehouses
        .filter(item => employee.role === 'storekeeper' || item.id === employee.warehouseId || item.id === 'wh-delivery')
        .map(item => ({ id: item.id, label: item.name }));
    }
    return db.sites.filter(item => item.id === employee.siteId).map(item => ({ id: item.id, label: ['receptionist', 'housekeeper'].includes(employee.role) ? `${item.name} · Hôtel / PMS` : item.name }));
  }, [db.posList, db.sites, db.warehouses, employee]);

  const visibleMessages = employee
    ? db.employeeMessages.filter(item => item.siteId === employee.siteId && (item.audience === 'all' || item.audience === employee.role || item.senderId === employee.id))
    : [];
  const unreadMessages = employee ? visibleMessages.filter(item => !item.readByEmployeeIds.includes(employee.id)).length : 0;
  const handoverRoleFallback: Partial<Record<EmployeeRole, EmployeeRole[]>> = {
    cashier: ['cashier', 'waiter'],
    kitchen: ['kitchen', 'waiter'],
    driver: ['driver', 'picker'],
    customer_experience: ['customer_experience', 'receptionist'],
    service_manager: ['service_manager', 'receptionist', 'waiter']
  };
  const relevantHandover = employee
    ? db.employeeHandovers.find(item => (handoverRoleFallback[employee.role] || [employee.role]).includes(item.role) && item.status === 'submitted')
    : undefined;

  const execute = (action: () => unknown, success: string) => {
    try {
      const result = action();
      if (result && typeof result === 'object' && 'success' in result && !(result as { success: boolean }).success) {
        throw new Error((result as { error?: string }).error || 'Action impossible');
      }
      setNotice(success);
      window.setTimeout(() => setNotice(''), 3200);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Action impossible');
      window.setTimeout(() => setNotice(''), 4200);
    }
  };

  const openReceptionWorkspace = (workspace: ReceptionWorkspace, reservationId = '') => {
    setReceptionWorkspace(workspace);
    setSelectedReservationId(reservationId);
    setTab('action');
  };

  const openStockWorkspace = (workspace: StockWorkspace, referenceId = '') => {
    setStockWorkspace(workspace);
    if (workspace === 'receiving') setSelectedSupplierOrderId(referenceId);
    setTab('action');
  };

  const getRoleTasks = (): StaffTask[] => {
    if (!employee) return [];
    const tasks: StaffTask[] = [];

    if (employee.role === 'waiter') {
      db.sartalServiceRequests.filter(item => item.context === 'restaurant' && !['completed', 'cancelled'].includes(item.status)).forEach(item => {
        const customer = db.sartalCustomers.find(customerItem => customerItem.id === item.customerId);
        tasks.push({
          id: item.id,
          title: item.label,
          detail: `${customer?.fullName || 'Client'} · ${item.assignedTo || 'À affecter'}`,
          meta: `Promis à ${formatTime(item.promisedAt)}`,
          tone: item.priority === 'urgent' || new Date(item.promisedAt).getTime() < Date.now() ? 'urgent' : 'active',
          actionLabel: item.status === 'requested' ? 'Prendre' : 'Terminer',
          action: () => execute(() => state.updateSartalServiceRequest(item.id, item.status === 'requested' ? 'accepted' : 'completed', employee.name), item.status === 'requested' ? 'Demande prise en charge.' : 'Demande client terminée.')
        });
      });
      db.restaurantReservations.filter(item => ['confirmed', 'seated'].includes(item.status)).forEach(item => {
        const customer = db.sartalCustomers.find(customerItem => customerItem.id === item.customerId);
        tasks.push({ id: item.id, title: `Table ${item.tableNumber || 'à attribuer'} · ${item.guests} pers.`, detail: `${customer?.fullName || 'Client'}${customer?.allergies ? ` · Allergie ${customer.allergies}` : ''}`, meta: `${item.date} à ${item.time}`, tone: customer?.allergies ? 'urgent' : 'waiting', actionLabel: 'Voir la table', action: () => setTab('action') });
      });
    }

    if (employee.role === 'cashier') {
      db.restaurantGuestOrders.filter(item => !['paid', 'cancelled'].includes(item.status)).forEach(item => {
        const paid = item.payments.reduce((sum, payment) => sum + payment.amount, 0);
        tasks.push({ id: item.id, title: `Addition ${item.tableNumber || item.id}`, detail: `${formatFCFA(item.total - paid)} à encaisser`, meta: `${item.payments.length} paiement(s) enregistré(s)`, tone: item.status === 'served' ? 'active' : 'waiting', actionLabel: 'Encaisser', action: () => { setSelectedOrderId(item.id); setPaymentAmount(String(item.total - paid)); setTab('action'); } });
      });
      db.employeeApprovals.filter(item => item.requestedBy === employee.id && item.status === 'pending').forEach(item => tasks.push({ id: item.id, title: item.label, detail: 'En attente de validation manager', meta: item.reason, tone: 'waiting' }));
    }

    if (employee.role === 'kitchen') {
      db.restaurantGuestOrders.filter(item => ['placed', 'confirmed', 'preparing'].includes(item.status)).forEach(item => {
        const customer = db.sartalCustomers.find(customerItem => customerItem.id === item.customerId);
        const nextStatus = item.status === 'preparing' ? 'ready' : 'preparing';
        tasks.push({
          id: item.id,
          title: `${item.tableNumber || 'À emporter'} · ${item.items.length} ligne(s)`,
          detail: item.items.map(line => `${line.quantity}× ${db.products.find(product => product.id === line.productId)?.name || line.productId}`).join(' · '),
          meta: `${elapsedMinutes(item.createdAt)} min${customer?.allergies ? ` · ALLERGIE ${customer.allergies.toUpperCase()}` : ''}`,
          tone: customer?.allergies || elapsedMinutes(item.createdAt) > item.estimatedMinutes ? 'urgent' : item.status === 'preparing' ? 'active' : 'waiting',
          actionLabel: nextStatus === 'ready' ? 'Plat prêt' : 'Démarrer',
          action: () => execute(() => state.updateRestaurantGuestOrderStatus(item.id, nextStatus), nextStatus === 'ready' ? 'La salle est prévenue : plat prêt.' : 'Préparation démarrée.')
        });
      });
    }

    if (employee.role === 'receptionist') {
      db.pmsReservations.filter(item => ['confirmed', 'checked_in'].includes(item.status)).forEach(item => {
        const guest = db.pmsGuests.find(guestItem => guestItem.id === item.guestId);
        const room = db.pmsRooms.find(roomItem => roomItem.id === item.roomId);
        tasks.push({ id: item.id, title: item.status === 'confirmed' ? `Arrivée · ${guest?.fullName}` : `Séjour · chambre ${room?.roomNumber || 'à attribuer'}`, detail: `${item.confirmationNumber} · ${item.adults + item.children} personne(s)`, meta: item.status === 'confirmed' ? `${item.estimatedArrivalTime || 'Heure à confirmer'} · garantie ${item.guaranteeStatus || 'à contrôler'}` : `Départ ${item.departureDate}`, tone: !room || item.guaranteeStatus === 'pending' ? 'urgent' : 'active', actionLabel: 'Ouvrir', action: () => openReceptionWorkspace('arrivals', item.id) });
      });
      db.pmsServiceRequests.filter(item => !['completed'].includes(item.status)).forEach(item => tasks.push({ id: item.id, title: item.label, detail: item.assignedTo, meta: `${item.priority === 'urgent' ? 'Urgent · ' : ''}${formatTime(item.scheduledAt)}`, tone: item.priority === 'urgent' ? 'urgent' : 'waiting', actionLabel: item.status === 'requested' ? 'Affecter' : 'Avancer', action: () => execute(() => state.updatePMSServiceRequest(item.id, item.status === 'requested' ? 'assigned' : item.status === 'assigned' ? 'in_progress' : 'completed', employee.name), 'Demande de séjour mise à jour.') }));
    }

    if (employee.role === 'housekeeper') {
      db.pmsHousekeepingTasks.filter(item => !['inspected'].includes(item.status)).forEach(item => {
        const room = db.pmsRooms.find(roomItem => roomItem.id === item.roomId);
        const nextStatus = item.status === 'pending' ? 'in_progress' : item.status === 'in_progress' ? 'completed' : 'inspected';
        tasks.push({ id: item.id, title: `Chambre ${room?.roomNumber || item.roomId}`, detail: `${room?.roomType || ''} · ${item.note || 'Entretien planifié'}`, meta: `${item.priority === 'urgent' ? 'PRIORITAIRE · ' : ''}${item.linenStatus === 'missing' ? 'Linge manquant' : 'Linge complet'}`, tone: item.priority === 'urgent' || item.linenStatus === 'missing' ? 'urgent' : item.status === 'in_progress' ? 'active' : 'waiting', actionLabel: nextStatus === 'in_progress' ? 'Démarrer' : nextStatus === 'completed' ? 'Terminer' : 'Contrôler', action: () => execute(() => state.updatePMSHousekeepingTask(item.id, nextStatus, employee.name), `Chambre ${room?.roomNumber || ''} : ${ORDER_STATUS[nextStatus].toLowerCase()}.`) });
      });
    }

    if (employee.role === 'storekeeper') {
      const warehouseId = activeShift?.assignmentId || employee.warehouseId;
      db.stocks.filter(item => item.warehouseId === warehouseId && item.quantityAvailable - item.quantityReserved <= item.alertThreshold).forEach(item => {
        const product = db.products.find(productItem => productItem.id === item.productId);
        tasks.push({ id: `${item.warehouseId}-${item.productId}`, title: product?.name || item.productId, detail: `${item.quantityAvailable - item.quantityReserved} ${product?.baseUnit || ''} disponible(s)`, meta: `Seuil ${item.alertThreshold} · ${formatFCFA(item.averageCost * item.quantityAvailable)}`, tone: item.quantityAvailable <= 0 ? 'urgent' : 'waiting', actionLabel: 'Voir le stock', action: () => { setScanQuery(product?.sku || item.productId); openStockWorkspace('scan'); } });
      });
      db.supplierOrders.filter(item => ['ordered', 'partially_received'].includes(item.status)).forEach(item => tasks.push({ id: item.id, title: `Réception ${item.id}`, detail: `${item.items.length} ligne(s) fournisseur`, meta: ORDER_STATUS[item.status] || item.status, tone: 'active', actionLabel: 'Réceptionner', action: () => openStockWorkspace('receiving', item.id) }));
    }

    if (employee.role === 'picker') {
      db.deliveryOrders.filter(item => ['confirmed', 'reserved', 'preparing'].includes(item.status)).forEach(item => {
        const next = item.status === 'confirmed' ? 'reserve' : item.status === 'reserved' ? 'prepare' : 'ready';
        tasks.push({ id: item.id, title: `${item.id} · ${item.customerName}`, detail: `${item.items.reduce((sum, line) => sum + line.quantity, 0)} article(s) · ${item.zone || item.address}`, meta: `${ORDER_STATUS[item.status]} · promis ${item.estimatedMinutes || 45} min`, tone: elapsedMinutes(item.createdAt) > (item.estimatedMinutes || 45) ? 'urgent' : item.status === 'preparing' ? 'active' : 'waiting', actionLabel: next === 'reserve' ? 'Réserver' : next === 'prepare' ? 'Préparer' : 'Panier prêt', action: () => runDeliveryStep(item.id, next) });
      });
    }

    if (employee.role === 'driver') {
      db.deliveryOrders.filter(item => ['ready', 'out_for_delivery', 'failed'].includes(item.status)).forEach(item => tasks.push({ id: item.id, title: `${item.id} · ${item.customerName}`, detail: `${item.address} · ${item.landmark || 'Repère à confirmer'}`, meta: item.status === 'failed' ? item.deliveryIssue || 'Incident à traiter' : `${item.paymentStatus === 'paid' ? 'Déjà payé' : `${formatFCFA(item.items.reduce((sum, line) => sum + line.salePrice * line.quantity, 0) + item.deliveryFee)} à encaisser`}`, tone: item.status === 'failed' ? 'urgent' : item.status === 'out_for_delivery' ? 'active' : 'waiting', actionLabel: item.status === 'ready' ? 'Prendre la course' : item.status === 'out_for_delivery' ? 'Remettre' : 'Signaler retour', action: () => { if (item.status === 'ready') runDeliveryStep(item.id, 'dispatch'); else { setSelectedDeliveryId(item.id); setDeliveryCode(item.verificationCode || ''); setTab('action'); } } }));
    }

    if (employee.role === 'customer_experience') {
      db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status)).forEach(item => {
        const customer = db.sartalCustomers.find(customerItem => customerItem.id === item.customerId);
        tasks.push({ id: item.id, title: item.label, detail: `${customer?.fullName || 'Client'} · ${item.context}`, meta: `${new Date(item.promisedAt).getTime() < Date.now() ? 'PROMESSE DÉPASSÉE' : `avant ${formatTime(item.promisedAt)}`}`, tone: new Date(item.promisedAt).getTime() < Date.now() || item.priority === 'urgent' ? 'urgent' : 'active', actionLabel: item.status === 'requested' ? 'Prendre' : 'Résoudre', action: () => execute(() => state.updateSartalServiceRequest(item.id, item.status === 'requested' ? 'accepted' : 'completed', employee.name), 'Engagement client mis à jour.') });
      });
      db.sartalCustomerFeedback.filter(item => item.recoveryStatus === 'open').forEach(item => tasks.push({ id: item.id, title: `Avis ${item.score}/5`, detail: item.note || 'Retour client à traiter', meta: item.assignedTo || 'À affecter', tone: 'urgent', actionLabel: 'Reprendre', action: () => setTab('action') }));
    }

    if (employee.role === 'service_manager') {
      db.employeeApprovals.filter(item => item.status === 'pending').forEach(item => tasks.push({ id: item.id, title: item.label, detail: `${item.requestedByName} · ${item.reason}`, meta: item.amount ? formatFCFA(item.amount) : item.referenceId, tone: 'urgent', actionLabel: 'Décider', action: () => setTab('action') }));
      const overdue = db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status) && new Date(item.promisedAt).getTime() < Date.now());
      overdue.forEach(item => tasks.push({ id: item.id, title: `Promesse dépassée · ${item.label}`, detail: item.assignedTo || 'Sans responsable', meta: `Depuis ${formatTime(item.promisedAt)}`, tone: 'urgent', actionLabel: 'Escalader', action: () => execute(() => state.escalateOverdueSartalRequests(), 'Les demandes en retard sont passées en priorité manager.') }));
    }

    return tasks;
  };

  const runDeliveryStep = (orderId: string, step: 'reserve' | 'prepare' | 'ready' | 'dispatch') => {
    if (!employee) return;
    const actions = {
      reserve: state.reserveDeliveryOrder,
      prepare: state.startDeliveryPreparation,
      ready: state.markDeliveryReady,
      dispatch: state.dispatchDeliveryOrder
    };
    const labels = { reserve: 'Stock réservé pour la commande.', prepare: 'Préparation démarrée.', ready: 'Panier contrôlé et prêt.', dispatch: 'Commande confiée au livreur.' };
    execute(() => actions[step](orderId, { id: employee.id, name: employee.name }), labels[step]);
  };

  const tasks = getRoleTasks();
  const filteredTasks = tasks.filter(item => {
    const matchesSearch = `${item.title} ${item.detail} ${item.meta}`.toLowerCase().includes(taskSearch.trim().toLowerCase());
    const matchesFilter = taskFilter === 'all' || (taskFilter === 'urgent' ? item.tone === 'urgent' : item.tone !== 'done');
    return matchesSearch && matchesFilter;
  });

  const metrics = (() => {
    if (!employee) return [];
    const pendingApprovals = db.employeeApprovals.filter(item => item.status === 'pending').length;
    const openRequests = db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status)).length;
    const roleMetrics: Record<EmployeeRole, Array<{ label: string; value: string | number; tone?: string }>> = {
      waiter: [
        { label: 'Tables actives', value: db.restaurantReservations.filter(item => item.status === 'seated').length },
        { label: 'Demandes', value: db.sartalServiceRequests.filter(item => item.context === 'restaurant' && !['completed', 'cancelled'].includes(item.status)).length, tone: 'alert' },
        { label: 'Plats prêts', value: db.restaurantGuestOrders.filter(item => item.status === 'ready').length, tone: 'success' },
        { label: 'Additions', value: db.restaurantGuestOrders.filter(item => item.status === 'served').length }
      ],
      cashier: [
        { label: 'Caisse', value: db.cashSessions.some(item => item.userId === employee.id && item.status === 'open') ? 'Ouverte' : 'Fermée', tone: activeShift ? 'success' : 'alert' },
        { label: 'À encaisser', value: db.restaurantGuestOrders.filter(item => !['paid', 'cancelled'].includes(item.status)).length },
        { label: 'Paiements mobile', value: db.restaurantGuestOrders.flatMap(item => item.payments).filter(item => ['wave', 'orange_money'].includes(item.method)).length },
        { label: 'Validations', value: pendingApprovals, tone: pendingApprovals ? 'alert' : 'success' }
      ],
      kitchen: [
        { label: 'À lancer', value: db.restaurantGuestOrders.filter(item => ['placed', 'confirmed'].includes(item.status)).length },
        { label: 'En préparation', value: db.restaurantGuestOrders.filter(item => item.status === 'preparing').length },
        { label: 'En retard', value: tasks.filter(item => item.tone === 'urgent').length, tone: 'alert' },
        { label: 'Prêts', value: db.restaurantGuestOrders.filter(item => item.status === 'ready').length, tone: 'success' }
      ],
      receptionist: [
        { label: 'Arrivées', value: db.pmsReservations.filter(item => item.status === 'confirmed').length },
        { label: 'Départs', value: db.pmsReservations.filter(item => item.status === 'checked_in').length },
        { label: 'Sans chambre', value: db.pmsReservations.filter(item => item.status === 'confirmed' && !item.roomId).length, tone: 'alert' },
        { label: 'Demandes', value: db.pmsServiceRequests.filter(item => item.status !== 'completed').length }
      ],
      housekeeper: [
        { label: 'À nettoyer', value: db.pmsHousekeepingTasks.filter(item => item.status === 'pending').length },
        { label: 'En cours', value: db.pmsHousekeepingTasks.filter(item => item.status === 'in_progress').length },
        { label: 'À contrôler', value: db.pmsHousekeepingTasks.filter(item => item.status === 'completed').length },
        { label: 'Urgentes', value: db.pmsHousekeepingTasks.filter(item => item.priority === 'urgent' && item.status !== 'inspected').length, tone: 'alert' }
      ],
      storekeeper: [
        { label: 'Réceptions', value: db.supplierOrders.filter(item => ['ordered', 'partially_received'].includes(item.status)).length },
        { label: 'Sous seuil', value: tasks.filter(item => item.tone === 'urgent' || item.tone === 'waiting').length, tone: tasks.length ? 'alert' : 'success' },
        { label: 'Transferts', value: db.transfers.filter(item => item.status !== 'received').length },
        { label: 'Mouvements jour', value: db.movements.filter(item => item.date.slice(0, 10) === new Date().toISOString().slice(0, 10)).length }
      ],
      picker: [
        { label: 'À réserver', value: db.deliveryOrders.filter(item => item.status === 'confirmed').length },
        { label: 'À préparer', value: db.deliveryOrders.filter(item => item.status === 'reserved').length },
        { label: 'En picking', value: db.deliveryOrders.filter(item => item.status === 'preparing').length },
        { label: 'Incidents', value: db.deliveryOrders.filter(item => item.status === 'failed').length, tone: 'alert' }
      ],
      driver: [
        { label: 'À prendre', value: db.deliveryOrders.filter(item => item.status === 'ready').length },
        { label: 'En tournée', value: db.deliveryOrders.filter(item => item.status === 'out_for_delivery').length },
        { label: 'À encaisser', value: formatFCFA(db.deliveryOrders.filter(item => item.status === 'out_for_delivery' && item.paymentStatus !== 'paid').reduce((sum, item) => sum + item.items.reduce((lineSum, line) => lineSum + line.quantity * line.salePrice, 0) + item.deliveryFee, 0)) },
        { label: 'Incidents', value: db.deliveryOrders.filter(item => item.status === 'failed').length, tone: 'alert' }
      ],
      customer_experience: [
        { label: 'Demandes ouvertes', value: openRequests },
        { label: 'En retard', value: db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status) && new Date(item.promisedAt).getTime() < Date.now()).length, tone: 'alert' },
        { label: 'Avis à reprendre', value: db.sartalCustomerFeedback.filter(item => item.recoveryStatus === 'open').length, tone: 'alert' },
        { label: 'Occasions', value: db.sartalOccasionPlans.filter(item => item.status !== 'completed').length }
      ],
      service_manager: [
        { label: 'Postes ouverts', value: db.employeeShifts.filter(item => item.status === 'open').length },
        { label: 'À valider', value: pendingApprovals, tone: pendingApprovals ? 'alert' : 'success' },
        { label: 'Promesses en retard', value: db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status) && new Date(item.promisedAt).getTime() < Date.now()).length, tone: 'alert' },
        { label: 'Ruptures critiques', value: db.stocks.filter(item => item.quantityAvailable - item.quantityReserved <= 0).length, tone: 'alert' }
      ]
    };
    return roleMetrics[employee.role];
  })();

  if (!employee) {
    return <section className="staff-empty"><UsersRound size={34} /><h2>Aucun profil employé</h2><p>Ajoutez les collaborateurs autorisés dans la configuration.</p></section>;
  }

  const RoleIcon = roleConfig.icon;
  const openShift = () => execute(() => state.startEmployeeShift(employee.id, assignmentId, deviceLabel), `Service ouvert pour ${employee.name}.`);

  const renderLogin = () => (
    <section className="staff-login-shell">
      <div className="staff-login-brand">
        <img src="./brand-mark.svg" alt="" />
        <span><strong>SÁRTAL ÉQUIPE</strong><small>Le bon poste, au bon moment</small></span>
      </div>
      <div className="staff-login-layout">
        <section className="staff-login-intro">
          <span className="staff-kicker"><ShieldCheck size={15} /> Accès de démonstration</span>
          <h1>Chaque équipe voit seulement ce qu’elle doit réussir aujourd’hui.</h1>
          <p>Choisissez un profil pour découvrir son poste. En production, le compte, le site et les permissions seront fournis par l’authentification sécurisée.</p>
          <div className="staff-login-promise"><LockKeyhole size={20} /><div><strong>Connexion prévue en exploitation</strong><small>Matricule ou téléphone + code personnel sur terminal partagé. Mot de passe et OTP pour les managers.</small></div></div>
        </section>
        <section className="staff-login-panel">
          <header><div><span>1</span><strong>Choisir un collaborateur</strong></div><small>{db.employeeProfiles.filter(item => item.active).length} profils de démonstration</small></header>
          <div className="staff-profile-picker">
            {db.employeeProfiles.filter(item => item.active).map(profile => {
              const config = ROLE_CONFIG[profile.role];
              const Icon = config.icon;
              return <button key={profile.id} className={selectedEmployeeId === profile.id ? 'active' : ''} onClick={() => { setSelectedEmployeeId(profile.id); setPin(''); }} style={{ '--staff-role': config.color } as React.CSSProperties}>
                <span><Icon size={18} /></span>
                <div><strong>{profile.name}</strong><small>{config.label}</small></div>
                {selectedEmployeeId === profile.id && <Check size={17} />}
              </button>;
            })}
          </div>
          <div className="staff-pin-box">
            <label><span>2</span><div><strong>Code personnel</strong><small>Code démo : 2468</small></div></label>
            <div><input inputMode="numeric" maxLength={4} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} placeholder="••••" onKeyDown={event => { if (event.key === 'Enter' && pin === '2468') setLoggedIn(true); }} /><button disabled={pin.length !== 4} onClick={() => pin === '2468' ? setLoggedIn(true) : setNotice('Code de démonstration incorrect.')}><LogIn size={18} /> Entrer</button></div>
          </div>
        </section>
      </div>
    </section>
  );

  const renderShiftStart = () => (
    <section className="staff-shift-start" style={{ '--staff-role': roleConfig.color } as React.CSSProperties}>
      <header className="staff-shift-identity">
        <div className="staff-avatar"><RoleIcon size={28} /></div>
        <div><span>Bonjour {employee.name.split(' ')[0]}</span><h1>Prêt à prendre votre service ?</h1><p>{roleConfig.label} · {employee.employeeNumber}</p></div>
        <button onClick={() => { setLoggedIn(false); setPin(''); }}><LogOut size={17} /> Changer de profil</button>
      </header>
      <div className="staff-shift-grid">
        <section className="staff-start-form">
          <div className="staff-step-heading"><span>1</span><div><strong>Confirmer l’affectation</strong><small>Ces informations déterminent les données accessibles.</small></div></div>
          <label>Établissement<input value={db.sites.find(item => item.id === employee.siteId)?.name || ''} disabled /></label>
          <label>Poste<input value={roleConfig.label} disabled /></label>
          <label>POS, dépôt ou zone<select value={assignmentId} onChange={event => setAssignmentId(event.target.value)}>{roleAssignments.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>Appareil<select value={deviceLabel} onChange={event => setDeviceLabel(event.target.value)}><option>Téléphone personnel</option><option>Tablette de service</option><option>Terminal POS partagé</option><option>Terminal dépôt</option></select></label>
          <button className="staff-primary-action" onClick={openShift}><DoorOpen size={19} /> Ouvrir mon service <ArrowRight size={18} /></button>
        </section>
        <section className="staff-handover-preview">
          <div className="staff-step-heading"><span>2</span><div><strong>Reprendre les consignes</strong><small>La continuité du service commence ici.</small></div></div>
          {relevantHandover ? <article>
            <header><span className={relevantHandover.status}><i /> Équipe précédente</span><time>{formatTime(relevantHandover.submittedAt)}</time></header>
            <h3>{relevantHandover.employeeName}</h3>
            <dl><div><dt>À poursuivre</dt><dd>{relevantHandover.notes}</dd></div><div><dt>Incident</dt><dd>{relevantHandover.incidents}</dd></div><div><dt>À contrôler</dt><dd>{relevantHandover.amountsToCheck}</dd></div><div><dt>Client à suivre</dt><dd>{relevantHandover.customersToFollow}</dd></div></dl>
            <button onClick={() => execute(() => state.acknowledgeEmployeeHandover(relevantHandover.id, employee.id), 'Passation confirmée.')}><CheckCircle2 size={17} /> Confirmer la reprise</button>
          </article> : <div className="staff-no-handover"><CheckCircle2 size={28} /><strong>Aucune passation en attente</strong><small>Le poste peut être repris sans point bloquant.</small></div>}
        </section>
      </div>
    </section>
  );

  const renderTaskList = (items: StaffTask[], compact = false) => (
    <div className={`staff-task-list ${compact ? 'compact' : ''}`}>
      {items.map(item => <article className={`staff-task ${item.tone}`} key={item.id}>
        <span className="staff-task-state">{item.tone === 'urgent' ? <AlertCircle size={18} /> : item.tone === 'done' ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}</span>
        <div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.meta}</small></div>
        {item.action && <button onClick={item.action}>{item.actionLabel}<ChevronRight size={15} /></button>}
      </article>)}
      {items.length === 0 && <div className="staff-list-empty"><CheckCircle2 size={30} /><strong>Tout est à jour</strong><small>Aucune tâche ne correspond à ce filtre.</small></div>}
    </div>
  );

  const renderToday = () => (
    <div className="staff-today">
      <section className="staff-today-hero" style={{ '--staff-role': roleConfig.color } as React.CSSProperties}>
        <div><span><i /> Service en cours</span><h1>{roleConfig.team}, votre priorité est claire.</h1><p>{tasks.filter(item => item.tone === 'urgent').length ? `${tasks.filter(item => item.tone === 'urgent').length} point(s) demandent votre attention maintenant.` : 'Aucun blocage critique. Gardez le rythme et les promesses annoncées.'}</p></div>
        <div className="staff-shift-clock"><Clock3 size={18} /><span><small>Service ouvert à</small><strong>{activeShift ? formatTime(activeShift.startedAt) : '--:--'}</strong></span></div>
      </section>
      <section className="staff-metrics">{metrics.map(item => <article className={item.tone || ''} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}</section>
      <div className="staff-today-grid">
        <section className="staff-priority-panel"><header><div><Bell size={19} /><span><strong>À traiter maintenant</strong><small>Classé par urgence et promesse client</small></span></div><button onClick={() => setTab('tasks')}>Tout voir <ArrowRight size={15} /></button></header>{renderTaskList(tasks.slice(0, 4), true)}</section>
        <aside className="staff-service-brief">
          <header><ClipboardCheck size={19} /><div><strong>Brief de service</strong><small>Consigne commune</small></div></header>
          <p>{visibleMessages[0]?.content || 'Aucune nouvelle consigne pour ce poste.'}</p>
          <button onClick={() => setTab('messages')}>Voir les messages {unreadMessages > 0 && <b>{unreadMessages}</b>}</button>
          <div className="staff-network-state"><WifiOff size={17} /><span><strong>Mode réseau faible prêt</strong><small>Les actions essentielles peuvent être mises en attente.</small></span></div>
        </aside>
      </div>
    </div>
  );

  const renderTasks = () => (
    <section className="staff-page-section">
      <header className="staff-section-heading"><div><span>MON POSTE</span><h2>Mes tâches</h2><p>Une file priorisée pour éviter le scroll sans fin.</p></div><b>{filteredTasks.length} résultat(s)</b></header>
      <div className="staff-list-tools"><div className="staff-search"><Search size={17} /><input value={taskSearch} onChange={event => setTaskSearch(event.target.value)} placeholder="Table, chambre, client, commande..." /></div><div className="staff-segmented"><button className={taskFilter === 'open' ? 'active' : ''} onClick={() => setTaskFilter('open')}>À faire</button><button className={taskFilter === 'urgent' ? 'active' : ''} onClick={() => setTaskFilter('urgent')}>Urgent</button><button className={taskFilter === 'all' ? 'active' : ''} onClick={() => setTaskFilter('all')}>Tout</button></div></div>
      {renderTaskList(filteredTasks)}
    </section>
  );

  const renderWaiterAction = () => {
    const orders = db.restaurantGuestOrders.filter(item => !['cancelled'].includes(item.status));
    return <section className="staff-action-layout">
      <div className="staff-action-main"><header><LayoutGrid size={20} /><div><h2>Plan de salle</h2><p>Tables, commandes et demandes client au même endroit.</p></div></header><div className="staff-table-board">{orders.map(order => {
        const customer = db.sartalCustomers.find(item => item.id === order.customerId);
        const requests = db.sartalServiceRequests.filter(item => item.referenceId === order.id && !['completed', 'cancelled'].includes(item.status));
        return <article className={order.status} key={order.id}><header><strong>{order.tableNumber || 'À emporter'}</strong><span>{ORDER_STATUS[order.status]}</span></header><h3>{customer?.fullName || 'Client de passage'}</h3>{customer?.allergies && <p className="staff-allergy"><AlertCircle size={15} /> Allergie : {customer.allergies}</p>}<div><span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} article(s)</span><b>{formatFCFA(order.total)}</b></div>{requests.map(request => <button key={request.id} onClick={() => execute(() => state.updateSartalServiceRequest(request.id, request.status === 'requested' ? 'accepted' : 'completed', employee.name), 'Demande de table mise à jour.')}><Bell size={14} /> {request.label}</button>)}{order.status === 'ready' && <button className="staff-card-primary" onClick={() => execute(() => state.updateRestaurantGuestOrderStatus(order.id, 'served'), `Table ${order.tableNumber} servie.`)}><Check size={15} /> Marquer servi</button>}</article>;
      })}</div></div>
      <aside className="staff-action-side"><header><ReceiptText size={19} /><div><strong>Prochaine addition</strong><small>Table servie</small></div></header>{orders.filter(item => item.status === 'served').slice(0, 2).map(order => <article key={order.id}><span>Table {order.tableNumber}</span><strong>{formatFCFA(order.total - order.payments.reduce((sum, payment) => sum + payment.amount, 0))}</strong><small>{order.roomNumber ? `Imputable chambre ${order.roomNumber}` : 'Paiement sur place'}</small><button onClick={() => { setSelectedOrderId(order.id); setTab('action'); }}>Préparer l’addition</button></article>)}<button className="staff-secondary-link" onClick={() => setTab('tasks')}>Voir toutes les tâches de salle <ArrowRight size={15} /></button></aside>
    </section>;
  };

  const renderCashierAction = () => {
    const cashSession = db.cashSessions.find(item => item.userId === employee.id && item.status === 'open');
    const unpaidOrders = db.restaurantGuestOrders.filter(item => !['paid', 'cancelled'].includes(item.status));
    const selectedOrder = unpaidOrders.find(item => item.id === selectedOrderId) || unpaidOrders[0];
    const paid = selectedOrder?.payments.reduce((sum, item) => sum + item.amount, 0) || 0;
    const remaining = Math.max(0, (selectedOrder?.total || 0) - paid);
    const paymentTotals = cashSession?.paymentTotals || db.restaurantGuestOrders.flatMap(item => item.payments).reduce<Record<PaymentType, number>>((totals, payment) => ({ ...totals, [payment.method]: totals[payment.method] + payment.amount }), { cash: 0, card: 0, wave: 0, orange_money: 0, room_charge: 0, other: 0 });
    return <section className="staff-cashier-layout">
      <div className="staff-cash-session"><header><div><span className={cashSession ? 'open' : 'closed'}><i /> {cashSession ? 'Caisse ouverte' : 'Caisse fermée'}</span><h2>{cashSession ? cashSession.id : 'Ouvrir la caisse'}</h2><p>{cashSession ? `${employee.name} · depuis ${formatTime(cashSession.openedAt)}` : 'Confirmez le fonds initial avant le premier encaissement.'}</p></div><Banknote size={28} /></header>{!cashSession ? <div className="staff-cash-open"><label>Fonds initial (FCFA)<input inputMode="numeric" value={openingFloat} onChange={event => setOpeningFloat(event.target.value.replace(/\D/g, ''))} /></label><button onClick={() => execute(() => state.openCashSession(employee.posId || 'pos-1', Number(openingFloat), { id: employee.id, name: employee.name }), 'Caisse ouverte et fonds initial enregistré.')}><DoorOpen size={18} /> Ouvrir la caisse</button></div> : <><div className="staff-payment-totals">{(['wave', 'orange_money', 'cash', 'card'] as PaymentType[]).map(method => <article key={method}><span>{PAYMENT_LABELS[method]}</span><strong>{formatFCFA(paymentTotals[method])}</strong></article>)}</div><div className="staff-cash-close"><label>Espèces comptées<input inputMode="numeric" value={closingCash} onChange={event => setClosingCash(event.target.value.replace(/\D/g, ''))} /></label><button onClick={() => execute(() => state.closeCashSession(cashSession.id, Number(closingCash), 'Clôture depuis Sártal Équipe', { id: employee.id, name: employee.name }), 'Rapport Z produit et caisse clôturée.')}><LockKeyhole size={17} /> Clôturer X/Z</button></div></>}</div>
      <div className="staff-checkout-panel">
        <header><CreditCard size={20} /><div><h2>Encaisser une addition</h2><p>Wave, Orange Money, espèces, carte ou chambre.</p></div></header>
        {selectedOrder ? <>
          <div className="staff-order-selector">{unpaidOrders.map(order => <button className={selectedOrder.id === order.id ? 'active' : ''} key={order.id} onClick={() => {
            setSelectedOrderId(order.id);
            setPaymentAmount(String(order.total - order.payments.reduce((sum, payment) => sum + payment.amount, 0)));
            if (!order.folioId && paymentMethod === 'room_charge') setPaymentMethod('wave');
          }}><span>Table {order.tableNumber || order.id}</span><strong>{formatFCFA(order.total - order.payments.reduce((sum, payment) => sum + payment.amount, 0))}</strong></button>)}</div>
          <section className="staff-checkout-summary"><span>Reste à payer</span><strong>{formatFCFA(remaining)}</strong><small>{selectedOrder.payments.length ? `${selectedOrder.payments.length} règlement(s) déjà reçu(s)` : 'Aucun paiement reçu'}</small></section>
          <div className="staff-checkout-form">
            <label>Montant<input inputMode="numeric" value={paymentAmount || String(remaining)} onChange={event => setPaymentAmount(event.target.value.replace(/\D/g, ''))} /></label>
            <label>Moyen de paiement<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentType)}>{Object.entries(PAYMENT_LABELS).filter(([value]) => value !== 'room_charge' || Boolean(selectedOrder.folioId)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <button disabled={!cashSession} onClick={() => execute(() => state.addRestaurantGuestOrderPayment(selectedOrder.id, Number(paymentAmount || remaining), paymentMethod, employee.name, cashSession?.id), `Paiement ${PAYMENT_LABELS[paymentMethod]} enregistré et rattaché à la caisse.`)}><HandCoins size={18} /> Valider {formatFCFA(Number(paymentAmount || remaining))}</button>
          </div>
          <button className="staff-approval-request" onClick={() => execute(() => state.requestEmployeeApproval({ type: 'discount', referenceId: selectedOrder.id, requestedBy: employee.id, requestedByName: employee.name, label: `Remise table ${selectedOrder.tableNumber || selectedOrder.id}`, reason: 'Geste commercial demandé par le client.', amount: Math.round(selectedOrder.total * 0.1) }), 'Demande de remise envoyée au manager.')}><ShieldCheck size={16} /> Demander une remise de 10 %</button>
        </> : <div className="staff-list-empty"><CheckCircle2 size={30} /><strong>Aucune addition à encaisser</strong></div>}
      </div>
    </section>;
  };

  const renderKitchenAction = () => {
    const tickets = db.restaurantGuestOrders.filter(item => ['placed', 'confirmed', 'preparing', 'ready'].includes(item.status));
    return <section className="staff-kds"><header><div><span>KDS CUISINE</span><h2>Tickets par urgence</h2><p>Les allergies restent visibles à chaque étape.</p></div><b><i /> Cuisine en service</b></header><div className="staff-kds-board">{tickets.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(order => {
      const customer = db.sartalCustomers.find(item => item.id === order.customerId);
      const next = order.status === 'preparing' ? 'ready' : 'preparing';
      return <article className={`${order.status} ${customer?.allergies ? 'allergy' : ''}`} key={order.id}><header><strong>{order.tableNumber || 'À emporter'}</strong><time>{elapsedMinutes(order.createdAt)} min</time></header>{customer?.allergies && <div className="staff-kds-allergy"><AlertCircle size={17} /> ALLERGIE {customer.allergies.toUpperCase()}</div>}<div className="staff-kds-items">{order.items.map(item => <div key={item.productId}><b>{item.quantity}×</b><span><strong>{db.products.find(product => product.id === item.productId)?.name || item.productId}</strong>{item.note && <small>{item.note}</small>}</span></div>)}</div><footer><span>{ORDER_STATUS[order.status]}</span>{order.status !== 'ready' && <button onClick={() => execute(() => state.updateRestaurantGuestOrderStatus(order.id, next), next === 'ready' ? `Ticket ${order.tableNumber} prêt.` : `Ticket ${order.tableNumber} démarré.`)}>{next === 'ready' ? <><CheckCircle2 size={16} /> Plat prêt</> : <><ChefHat size={16} /> Démarrer</>}</button>}<button className="staff-kds-issue" onClick={() => execute(() => state.sendEmployeeMessage({ siteId: employee.siteId, senderId: employee.id, senderName: `${employee.name} · Cuisine`, audience: 'waiter', content: `Rupture à confirmer sur le ticket ${order.tableNumber || order.id}. Merci de prévenir le client.`, priority: 'urgent' }), 'La salle a été prévenue de la rupture.')}><AlertCircle size={15} /> Rupture</button></footer></article>;
    })}</div></section>;
  };

  const renderReceptionAction = () => {
    const reservations = db.pmsReservations.filter(item => ['confirmed', 'checked_in'].includes(item.status));
    const selectedReservation = reservations.find(item => item.id === selectedReservationId);
    const selectedGuest = db.pmsGuests.find(item => item.id === selectedReservation?.guestId);
    const selectedRoom = db.pmsRooms.find(item => item.id === selectedReservation?.roomId);
    const selectedFolio = db.pmsFolios.find(item => item.reservationId === selectedReservation?.id);
    const availableRooms = selectedReservation ? db.pmsRooms.filter(room => room.status === 'vacant' && ['clean', 'inspected'].includes(room.housekeepingStatus) && room.capacity >= selectedReservation.adults + selectedReservation.children).slice(0, 6) : [];

    return <section className="staff-reception-workspace">
      <nav className="staff-workspace-switch"><button className={receptionWorkspace === 'arrivals' ? 'active' : ''} onClick={() => setReceptionWorkspace('arrivals')}><CalendarCheck size={17} /> Arrivées & séjours</button><button className={receptionWorkspace === 'rooms' ? 'active' : ''} onClick={() => setReceptionWorkspace('rooms')}><BedDouble size={17} /> État des chambres</button></nav>
      {receptionWorkspace === 'rooms' ? <div className="staff-room-status-board">{db.pmsRooms.map(room => {
        const reservation = db.pmsReservations.find(item => item.roomId === room.id && item.status === 'checked_in');
        const guest = db.pmsGuests.find(item => item.id === reservation?.guestId);
        const visualStatus = room.status === 'maintenance' ? 'maintenance' : room.status === 'occupied' ? 'occupied' : room.housekeepingStatus === 'dirty' ? 'dirty' : 'vacant';
        return <article className={visualStatus} key={room.id}><header><span><BedDouble size={19} /> Chambre</span><strong>{room.roomNumber}</strong></header><h3>{room.roomType}</h3><p>{guest?.fullName || (visualStatus === 'vacant' ? 'Disponible à la vente' : room.maintenanceNote || 'À préparer')}</p><footer><b>{visualStatus === 'vacant' ? 'Libre' : visualStatus === 'occupied' ? 'Occupée' : visualStatus === 'dirty' ? 'À nettoyer' : 'Maintenance'}</b><small>{room.floor} · {room.housekeepingStatus}</small></footer></article>;
      })}</div> : <section className="staff-reception-layout"><div className="staff-reception-list"><header><CalendarCheck size={20} /><div><h2>Arrivées et séjours</h2><p>Chambre, garantie, clé et folio dans le même contrôle.</p></div></header>{reservations.map(reservation => {
      const guest = db.pmsGuests.find(item => item.id === reservation.guestId);
      const room = db.pmsRooms.find(item => item.id === reservation.roomId);
      const folio = db.pmsFolios.find(item => item.reservationId === reservation.id);
      const balance = folio ? folio.charges.reduce((sum, item) => sum + item.amount, 0) - folio.payments.reduce((sum, item) => sum + item.amount, 0) : reservation.nightlyRate - reservation.depositAmount;
      return <article className={selectedReservationId === reservation.id ? 'selected' : ''} key={reservation.id}><span className={`staff-room-color ${room?.status || 'unassigned'}`}><BedDouble size={20} /></span><div><strong>{guest?.fullName || reservation.confirmationNumber}</strong><p>{room ? `Chambre ${room.roomNumber} · ${room.roomType}` : `${reservation.requestedRoomType} · chambre à attribuer`}</p><small>{reservation.status === 'confirmed' ? `Arrivée ${reservation.estimatedArrivalTime || 'à confirmer'}` : `Départ ${reservation.departureDate}`}</small></div><div className="staff-reception-flags"><span className={reservation.guaranteeStatus === 'secured' ? 'ok' : 'alert'}>{reservation.guaranteeStatus === 'secured' ? 'Garantie OK' : 'Garantie à faire'}</span><span className={room && ['clean', 'inspected'].includes(room.housekeepingStatus) ? 'ok' : 'alert'}>{room ? `Chambre ${room.housekeepingStatus}` : 'Non attribuée'}</span><b>{formatFCFA(Math.max(0, balance))}</b></div><button onClick={() => setSelectedReservationId(reservation.id)}>Traiter <ChevronRight size={16} /></button></article>;
    })}</div>{selectedReservation ? <aside className="staff-reception-detail"><header><span>{selectedReservation.confirmationNumber}</span><h3>{selectedGuest?.fullName}</h3><p>{selectedReservation.adults + selectedReservation.children} personne(s) · départ {selectedReservation.departureDate}</p></header><div className="staff-reception-checks"><span className={selectedReservation.guaranteeStatus === 'secured' ? 'ok' : 'alert'}>{selectedReservation.guaranteeStatus === 'secured' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} Garantie {selectedReservation.guaranteeStatus === 'secured' ? 'sécurisée' : 'à contrôler'}</span><span className={selectedRoom && ['clean', 'inspected'].includes(selectedRoom.housekeepingStatus) ? 'ok' : 'alert'}>{selectedRoom && ['clean', 'inspected'].includes(selectedRoom.housekeepingStatus) ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {selectedRoom ? `Chambre ${selectedRoom.roomNumber} · ${selectedRoom.housekeepingStatus}` : 'Chambre non attribuée'}</span><span className={selectedFolio ? 'ok' : 'alert'}>{selectedFolio ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} Folio {selectedFolio ? 'ouvert' : 'à créer au check-in'}</span></div>{!selectedRoom && <section><h4>Chambres prêtes</h4><div className="staff-room-options">{availableRooms.map(room => <button key={room.id} onClick={() => execute(() => state.assignPMSRoom(selectedReservation.id, room.id, true), `Chambre ${room.roomNumber} attribuée.`)}><strong>{room.roomNumber}</strong><span>{room.roomType}</span><small>{formatFCFA(room.nightlyRate)}</small></button>)}</div></section>}{selectedRoom && selectedReservation.status === 'confirmed' && <button className="staff-primary-action" disabled={selectedReservation.guaranteeStatus !== 'secured' || !['clean', 'inspected'].includes(selectedRoom.housekeepingStatus)} onClick={() => execute(() => state.completePMSCheckIn(selectedReservation.id, { identity: true, guarantee: true, payment: true, signature: true, keyIssued: true }), `Check-in terminé · chambre ${selectedRoom.roomNumber}.`)}><DoorOpen size={17} /> Finaliser le check-in</button>}{selectedReservation.status === 'checked_in' && <div className="staff-stay-active"><CheckCircle2 size={21} /><span><strong>Séjour actif</strong><small>{selectedRoom ? `Clé chambre ${selectedRoom.roomNumber}` : 'Chambre à vérifier'} · solde {formatFCFA(Math.max(0, (selectedFolio?.charges.reduce((sum, item) => sum + item.amount, 0) || 0) - (selectedFolio?.payments.reduce((sum, item) => sum + item.amount, 0) || 0)))}</small></span></div>}</aside> : <aside className="staff-room-legend"><h3>État des chambres</h3>{[['vacant', 'Libre'], ['occupied', 'Occupée'], ['dirty', 'À nettoyer'], ['maintenance', 'Maintenance']].map(([status, label]) => <div key={status}><i className={status} /><span>{label}</span><strong>{status === 'dirty' ? db.pmsRooms.filter(item => item.housekeepingStatus === 'dirty').length : db.pmsRooms.filter(item => item.status === status).length}</strong></div>)}<button onClick={() => setReceptionWorkspace('rooms')}><BedDouble size={16} /> Voir toutes les chambres</button></aside>}</section>}
    </section>;
  };

  const renderHousekeeperAction = () => (
    <section className="staff-housekeeping"><header><div><span>ÉTAGES</span><h2>Chambres par priorité</h2><p>Nettoyage, linge, minibar, photos et contrôle gouvernante.</p></div><div className="staff-room-legend-inline"><span><i className="dirty" /> À faire</span><span><i className="in_progress" /> En cours</span><span><i className="clean" /> Propre</span><span><i className="inspected" /> Contrôlée</span></div></header><div className="staff-room-task-grid">{db.pmsHousekeepingTasks.map(task => {
      const room = db.pmsRooms.find(item => item.id === task.roomId);
      const nextStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : task.status === 'completed' ? 'inspected' : 'inspected';
      return <article className={`${task.status} ${task.priority}`} key={task.id}>
        <header><div><strong>{room?.roomNumber}</strong><span>{room?.floor}</span></div><b>{task.priority === 'urgent' ? 'PRIORITAIRE' : ORDER_STATUS[task.status]}</b></header>
        <h3>{room?.roomType}</h3><p>{task.note || 'Entretien standard'}</p>
        <div className="staff-room-checks"><span className={task.linenStatus === 'complete' ? 'ok' : 'alert'}>Linge : {task.linenStatus || 'à vérifier'}</span><span className={task.minibarStatus === 'checked' ? 'ok' : 'alert'}>Minibar : {task.minibarStatus || 'à vérifier'}</span><span><Camera size={13} /> {task.photoCount || 0} photo(s)</span></div>
        <footer>{task.status !== 'inspected' && <button onClick={() => execute(() => state.updatePMSHousekeepingTask(task.id, nextStatus, employee.name), `Chambre ${room?.roomNumber} : ${ORDER_STATUS[nextStatus].toLowerCase()}.`)}>{nextStatus === 'in_progress' ? 'Démarrer' : nextStatus === 'completed' ? 'Terminer' : 'Valider'}</button>}<button className="staff-photo-action" onClick={() => execute(() => state.updatePMSHousekeepingDetails(task.id, { photoCount: (task.photoCount || 0) + 1 }, employee.name), `Photo ajoutée à la chambre ${room?.roomNumber}.`)}><Camera size={15} /> Photo</button></footer>
      </article>;
    })}</div></section>
  );

  const renderStorekeeperAction = () => {
    const warehouseId = activeShift?.assignmentId || employee.warehouseId || db.warehouses[0]?.id;
    const product = db.products.find(item => `${item.sku} ${item.barcode || ''} ${item.name}`.toLowerCase().includes(scanQuery.trim().toLowerCase()));
    const stock = product && db.stocks.find(item => item.productId === product.id && item.warehouseId === warehouseId);
    const batches = product ? db.batches.filter(item => item.productId === product.id && item.warehouseId === warehouseId && item.quantity > 0) : [];
    const pendingOrders = db.supplierOrders.filter(item => ['ordered', 'partially_received'].includes(item.status));
    const selectedSupplierOrder = pendingOrders.find(item => item.id === selectedSupplierOrderId) || pendingOrders[0];
    const sourceStocks = db.stocks.filter(item => item.warehouseId === warehouseId && item.quantityAvailable - item.quantityReserved > 0);
    const transferStockRow = sourceStocks.find(item => item.productId === transferProductId);
    const journalRows = [...db.movements].filter(item => item.warehouseId === warehouseId && `${db.products.find(productItem => productItem.id === item.productId)?.name || ''} ${item.reason} ${item.externalReference || ''}`.toLowerCase().includes(movementSearch.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
    const movementLabels: Record<string, string> = { purchase_received: 'Réception', sale_consumption: 'Vente', transfer_out: 'Transfert sortant', transfer_in: 'Transfert entrant', inventory_adjustment: 'Inventaire', loss: 'Perte / casse', production: 'Production', manual_entry: 'Entrée manuelle', correction: 'Correction' };

    return <section className="staff-stock-workspace">
      <nav className="staff-workspace-switch staff-stock-switch"><button className={stockWorkspace === 'scan' ? 'active' : ''} onClick={() => setStockWorkspace('scan')}><ScanLine size={17} /> Scanner</button><button className={stockWorkspace === 'receiving' ? 'active' : ''} onClick={() => setStockWorkspace('receiving')}><PackageCheck size={17} /> Réceptions</button><button className={stockWorkspace === 'transfers' ? 'active' : ''} onClick={() => setStockWorkspace('transfers')}><Boxes size={17} /> Transferts</button><button className={stockWorkspace === 'inventory' ? 'active' : ''} onClick={() => setStockWorkspace('inventory')}><ClipboardCheck size={17} /> Inventaire</button><button className={stockWorkspace === 'journal' ? 'active' : ''} onClick={() => setStockWorkspace('journal')}><ReceiptText size={17} /> Journal</button></nav>
      {stockWorkspace === 'scan' && <section className="staff-stock-action"><div className="staff-scan-panel">
        <header><ScanLine size={23} /><div><h2>Scanner ou rechercher</h2><p>SKU, code-barres ou nom du produit.</p></div></header>
        <div className="staff-scan-input"><ScanLine size={21} /><input autoComplete="off" value={scanQuery} onChange={event => setScanQuery(event.target.value)} placeholder="Ex. COCA33" /><button><Search size={18} /></button></div>
        {product && stock ? <article className="staff-scan-result">
          <header><div><span>{product.category}</span><h3>{product.name}</h3><small>{product.sku} · {product.baseUnit}</small></div><strong>{stock.quantityAvailable - stock.quantityReserved}<small> disponible(s)</small></strong></header>
          <div><span>Dépôt<strong>{db.warehouses.find(item => item.id === warehouseId)?.name}</strong></span><span>Réservé<strong>{stock.quantityReserved}</strong></span><span>Coût moyen<strong>{formatFCFA(stock.averageCost)}</strong></span></div>
          <section><h4>Lots disponibles</h4>{batches.slice(0, 3).map(batch => <p key={batch.id}><span>{batch.batchNumber}</span><strong>{batch.quantity}</strong><small>{batch.expiryDate ? `Expire le ${batch.expiryDate}` : 'Sans péremption'}</small></p>)}</section>
          <footer><label>Casse / perte<input inputMode="decimal" value={lossQuantity} onChange={event => setLossQuantity(event.target.value.replace(/[^\d.]/g, ''))} /></label><button onClick={() => execute(() => state.declareLoss(product.id, warehouseId, Number(lossQuantity), 'casse', `Déclaration depuis Sártal Équipe par ${employee.name}`, { id: employee.id, name: employee.name }), `${lossQuantity} ${product.baseUnit} déclaré(s) en casse.`)}><XCircle size={16} /> Déclarer</button></footer>
        </article> : <div className="staff-list-empty"><PackageSearch size={30} /><strong>Produit non trouvé dans ce dépôt</strong><small>Vérifiez le code ou changez d’affectation.</small></div>}
      </div>
      <aside className="staff-stock-shortcuts"><h3>Opérations du poste</h3><button onClick={() => setStockWorkspace('receiving')}><PackageCheck size={19} /><span><strong>Réception fournisseur</strong><small>Contrôler quantité, lot et péremption</small></span><ChevronRight size={17} /></button><button onClick={() => setStockWorkspace('transfers')}><Boxes size={19} /><span><strong>Transfert dépôt</strong><small>Préparer ou confirmer une sortie</small></span><ChevronRight size={17} /></button><button onClick={() => setStockWorkspace('inventory')}><ClipboardCheck size={19} /><span><strong>Inventaire</strong><small>Compter sans afficher le théorique</small></span><ChevronRight size={17} /></button><button onClick={() => setStockWorkspace('journal')}><ReceiptText size={19} /><span><strong>Journal du dépôt</strong><small>Retrouver chaque mouvement</small></span><ChevronRight size={17} /></button></aside></section>}
      {stockWorkspace === 'receiving' && <section className="staff-stock-operation"><div className="staff-operation-list"><header><PackageCheck size={21} /><div><h2>Bons à réceptionner</h2><p>{db.warehouses.find(item => item.id === warehouseId)?.name}</p></div><b>{pendingOrders.length}</b></header>{pendingOrders.map(order => { const remaining = order.items.reduce((sum, item) => sum + Math.max(0, item.quantityOrdered - item.quantityReceived), 0); return <button className={selectedSupplierOrder?.id === order.id ? 'active' : ''} key={order.id} onClick={() => setSelectedSupplierOrderId(order.id)}><span><strong>{order.id}</strong><small>{db.suppliers.find(item => item.id === order.supplierId)?.name || 'Fournisseur'}</small></span><b>{remaining} unité(s)</b><ChevronRight size={17} /></button>; })}</div>{selectedSupplierOrder ? <div className="staff-operation-form"><header><span>RÉCEPTION</span><h2>{selectedSupplierOrder.id}</h2><p>{db.suppliers.find(item => item.id === selectedSupplierOrder.supplierId)?.name}</p></header><div className="staff-operation-lines">{selectedSupplierOrder.items.map(line => { const remaining = Math.max(0, line.quantityOrdered - line.quantityReceived); return <div key={line.productId}><span><strong>{db.products.find(item => item.id === line.productId)?.name}</strong><small>{line.quantityReceived} reçu(s) sur {line.quantityOrdered}</small></span><b>{remaining} restant(s)</b></div>; })}</div><button className="staff-primary-action" onClick={() => execute(() => state.receiveOrder(selectedSupplierOrder.id, warehouseId, selectedSupplierOrder.items.map(line => ({ productId: line.productId, quantityReceived: Math.max(0, line.quantityOrdered - line.quantityReceived), batchNumber: line.batchNumber || `REC-${Date.now().toString().slice(-6)}`, expiryDate: line.expiryDate })).filter(line => line.quantityReceived > 0), { id: employee.id, name: employee.name }), `Réception ${selectedSupplierOrder.id} enregistrée et stock mis à jour.`)}><PackageCheck size={18} /> Réceptionner le reliquat</button></div> : <div className="staff-list-empty"><CheckCircle2 size={30} /><strong>Aucune réception en attente</strong></div>}</section>}
      {stockWorkspace === 'transfers' && <section className="staff-stock-single-form"><header><Boxes size={22} /><div><h2>Transfert inter-dépôts</h2><p>La sortie et l’entrée seront tracées au nom de {employee.name}.</p></div></header><div className="staff-stock-form-grid"><label>Dépôt source<input value={db.warehouses.find(item => item.id === warehouseId)?.name || ''} disabled /></label><label>Dépôt destination<select value={transferDestinationId} onChange={event => setTransferDestinationId(event.target.value)}><option value="">Choisir un dépôt</option>{db.warehouses.filter(item => item.id !== warehouseId).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Produit<select value={transferProductId} onChange={event => { setTransferProductId(event.target.value); setTransferQuantity('1'); }}><option value="">Choisir un produit</option>{sourceStocks.map(item => <option value={item.productId} key={item.productId}>{db.products.find(productItem => productItem.id === item.productId)?.name} · {item.quantityAvailable - item.quantityReserved} disponible(s)</option>)}</select></label><label>Quantité<input inputMode="decimal" value={transferQuantity} onChange={event => setTransferQuantity(event.target.value.replace(/[^\d.]/g, ''))} /></label></div><div className="staff-operation-summary"><span>Disponible<strong>{transferStockRow ? transferStockRow.quantityAvailable - transferStockRow.quantityReserved : 0}</strong></span><span>À transférer<strong>{Number(transferQuantity) || 0}</strong></span><span>Destination<strong>{db.warehouses.find(item => item.id === transferDestinationId)?.name || 'À choisir'}</strong></span></div><button className="staff-primary-action" disabled={!transferDestinationId || !transferProductId || Number(transferQuantity) <= 0 || Number(transferQuantity) > (transferStockRow ? transferStockRow.quantityAvailable - transferStockRow.quantityReserved : 0)} onClick={() => execute(() => { state.transferStock(warehouseId, transferDestinationId, [{ productId: transferProductId, quantity: Number(transferQuantity) }], { id: employee.id, name: employee.name }); setTransferProductId(''); setTransferQuantity('1'); }, 'Transfert validé et mouvements enregistrés dans les deux dépôts.')}><Boxes size={18} /> Valider le transfert</button></section>}
      {stockWorkspace === 'inventory' && <section className="staff-stock-single-form"><header><ClipboardCheck size={22} /><div><h2>Comptage ciblé</h2><p>Saisissez le stock réellement compté sans modifier le dépôt théorique à l’écran.</p></div></header><div className="staff-scan-input"><Search size={20} /><input value={scanQuery} onChange={event => { setScanQuery(event.target.value); setInventoryCount(''); }} placeholder="SKU, code-barres ou produit" /><button><Search size={18} /></button></div>{product && stock ? <div className="staff-inventory-count"><span>{product.category}</span><h3>{product.name}</h3><small>{product.sku} · {db.warehouses.find(item => item.id === warehouseId)?.name}</small><label>Quantité comptée<input autoFocus inputMode="decimal" value={inventoryCount} onChange={event => setInventoryCount(event.target.value.replace(/[^\d.]/g, ''))} placeholder="Saisir le comptage" /></label><button className="staff-primary-action" disabled={inventoryCount === ''} onClick={() => execute(() => { state.inventoryAdjustment(warehouseId, [{ productId: product.id, realQty: Number(inventoryCount) }], { id: employee.id, name: employee.name }); setInventoryCount(''); }, `Comptage de ${product.name} enregistré et écart tracé.`)}><ClipboardCheck size={18} /> Valider le comptage</button></div> : <div className="staff-list-empty"><PackageSearch size={30} /><strong>Scannez un produit du dépôt</strong></div>}</section>}
      {stockWorkspace === 'journal' && <section className="staff-stock-journal"><header><ReceiptText size={21} /><div><h2>Journal du dépôt</h2><p>Les 30 mouvements les plus récents.</p></div></header><div className="staff-search"><Search size={17} /><input value={movementSearch} onChange={event => setMovementSearch(event.target.value)} placeholder="Produit, motif ou référence" /></div><div>{journalRows.map(movement => { const movementProduct = db.products.find(item => item.id === movement.productId); return <article key={movement.id}><span className={movement.quantity >= 0 ? 'in' : 'out'}>{movement.quantity >= 0 ? '+' : '−'}</span><div><strong>{movementProduct?.name}</strong><p>{movementLabels[movement.type] || movement.type} · {movement.reason}</p><small>{new Date(movement.date).toLocaleString('fr-FR')} · {movement.userName}</small></div><b>{movement.quantity > 0 ? '+' : ''}{movement.quantity} {movement.unit}</b></article>; })}{journalRows.length === 0 && <div className="staff-list-empty"><ReceiptText size={28} /><strong>Aucun mouvement trouvé</strong></div>}</div></section>}
    </section>;
  };

  const renderPickerAction = () => {
    const orders = db.deliveryOrders.filter(item => ['confirmed', 'reserved', 'preparing', 'ready'].includes(item.status));
    return <section className="staff-picking"><header><div><span>PRÉPARATION</span><h2>Parcours de picking</h2><p>La liste reste courte, contrôlée et triée par promesse.</p></div><b>{orders.length} commande(s)</b></header><div className="staff-picking-list">{orders.map(order => <article key={order.id} className={order.status}><header><div><span>{order.id}</span><h3>{order.customerName}</h3><small>{order.zone || order.address} · {order.paymentStatus === 'paid' ? 'Payée' : 'À encaisser'}</small></div><b>{ORDER_STATUS[order.status]}</b></header><div className="staff-picking-items">{order.items.map(line => { const product = db.products.find(item => item.id === line.productId); const stock = db.stocks.find(item => item.productId === line.productId && item.warehouseId === order.warehouseId); return <div key={line.productId}><span className={stock && stock.quantityAvailable - stock.quantityReserved >= line.quantity ? 'ok' : 'alert'}>{stock && stock.quantityAvailable - stock.quantityReserved >= line.quantity ? <Check size={15} /> : <AlertCircle size={15} />}</span><strong>{line.quantity}× {product?.name || line.productId}</strong><small>{line.substitutionPolicy === 'replace' ? 'Substitution autorisée' : line.substitutionPolicy === 'refund' ? 'Rembourser si absent' : 'Contacter le client si absent'}</small></div>; })}</div><footer><span><MapPin size={15} /> {order.landmark || 'Repère à confirmer'}</span>{order.status === 'confirmed' && <button onClick={() => runDeliveryStep(order.id, 'reserve')}>Réserver le stock</button>}{order.status === 'reserved' && <button onClick={() => runDeliveryStep(order.id, 'prepare')}>Démarrer le picking</button>}{order.status === 'preparing' && <button onClick={() => runDeliveryStep(order.id, 'ready')}>Contrôler et fermer</button>}{order.status === 'ready' && <button onClick={() => runDeliveryStep(order.id, 'dispatch')}>Remettre au livreur</button>}</footer></article>)}</div></section>;
  };

  const renderDriverAction = () => {
    const routes = db.deliveryOrders.filter(item => ['ready', 'out_for_delivery', 'failed'].includes(item.status));
    const selected = routes.find(item => item.id === selectedDeliveryId) || routes.find(item => item.status === 'out_for_delivery') || routes[0];
      return <section className="staff-driver-layout"><div className="staff-route-list"><header><Navigation size={21} /><div><h2>Tournée du jour</h2><p>Les informations essentielles restent disponibles en réseau faible.</p></div></header>{routes.map(order => <button className={`${order.status} ${selected?.id === order.id ? 'active' : ''}`} key={order.id} onClick={() => { setSelectedDeliveryId(order.id); setDeliveryCode(order.verificationCode || ''); }}><span><i />{ORDER_STATUS[order.status]}</span><strong>{order.customerName}</strong><small>{order.zone || order.address}</small><b>{order.paymentStatus === 'paid' ? 'Payée' : 'À encaisser'}</b><ChevronRight size={17} /></button>)}</div>{selected ? <div className="staff-delivery-proof"><header><div><span>{selected.id}</span><h2>{selected.customerName}</h2><p>{selected.address}</p></div><Truck size={25} /></header><div className="staff-delivery-contact"><a href={`tel:${selected.phone}`}><Phone size={18} /><span><strong>Appeler le client</strong><small>{selected.phone}</small></span></a><button><Navigation size={18} /><span><strong>Itinéraire</strong><small>{selected.landmark}</small></span></button></div>{selected.status === 'ready' ? <button className="staff-primary-action" onClick={() => runDeliveryStep(selected.id, 'dispatch')}><Truck size={18} /> Prendre la livraison</button> : selected.status === 'out_for_delivery' ? <><section className="staff-proof-checklist"><h3>Preuve de remise</h3><label>Code client <span>Code démo : {selected.verificationCode}</span><input inputMode="numeric" value={deliveryCode} onChange={event => setDeliveryCode(event.target.value.replace(/\D/g, ''))} /></label><label>Signature <input value={deliverySignature} onChange={event => setDeliverySignature(event.target.value)} placeholder="Nom du signataire" /></label><div><button><Camera size={17} /> Photo de remise prête</button><button><MapPin size={17} /> GPS 14.7167, -17.4677</button></div></section><button className="staff-primary-action" onClick={() => execute(() => { state.completeDeliveryProof(selected.id, { code: deliveryCode, signature: deliverySignature, photoLabel: `Remise ${selected.id}`, latitude: 14.7167, longitude: -17.4677 }); const result = state.deliverDeliveryOrder(selected.id, { id: employee.id, name: employee.name }); if (!result.success) throw new Error(result.error); }, 'Livraison clôturée avec code, signature, photo et GPS.')}><CheckCircle2 size={18} /> Confirmer la remise</button><button className="staff-delivery-incident" onClick={() => execute(() => state.failDeliveryOrder(selected.id, 'Client injoignable depuis l’interface livreur.', { id: employee.id, name: employee.name }), 'Incident transmis au manager et au dépôt.')}><AlertCircle size={16} /> Signaler un incident</button></> : <div className="staff-delivery-alert"><AlertCircle size={20} /><span><strong>Incident en cours</strong><small>{selected.deliveryIssue}</small></span><button onClick={() => execute(() => state.returnDeliveryOrder(selected.id, { id: employee.id, name: employee.name }), 'Retour au dépôt enregistré.')} >Retour dépôt</button></div>}</div> : <div className="staff-list-empty"><CheckCircle2 size={30} /><strong>Aucune course en attente</strong></div>}</section>;
  };

  const renderCustomerExperienceAction = () => {
    const requests = db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status));
    const feedback = db.sartalCustomerFeedback.filter(item => item.recoveryStatus === 'open');
    return <section className="staff-cx-layout"><div className="staff-cx-queue"><header><HeartHandshake size={21} /><div><h2>Demandes et promesses</h2><p>Personne ne doit se demander qui s’occupe de lui.</p></div></header>{requests.map(request => { const customer = db.sartalCustomers.find(item => item.id === request.customerId); const late = new Date(request.promisedAt).getTime() < Date.now(); return <article className={late ? 'late' : ''} key={request.id}><span>{request.context}</span><div><strong>{request.label}</strong><p>{customer?.fullName} · {request.assignedTo}</p><small>{late ? `Promesse dépassée depuis ${formatTime(request.promisedAt)}` : `Promis avant ${formatTime(request.promisedAt)}`}</small></div><button onClick={() => execute(() => state.updateSartalServiceRequest(request.id, request.status === 'requested' ? 'accepted' : 'completed', employee.name), request.status === 'requested' ? 'Demande prise personnellement.' : 'Promesse tenue et demande clôturée.')}>{request.status === 'requested' ? 'Prendre' : 'Terminer'}</button></article>; })}</div><aside className="staff-recovery-queue"><header><Sparkles size={20} /><div><h2>Reprise client</h2><p>Un protocole clair, une personne responsable.</p></div></header>{feedback.map(item => { const customer = db.sartalCustomers.find(customerItem => customerItem.id === item.customerId); const playbook = db.sartalRecoveryPlaybooks.find(playbookItem => playbookItem.active && (playbookItem.context === 'all' || playbookItem.context === item.context) && item.score <= playbookItem.maxScore); return <article key={item.id}><div className="staff-feedback-score">{item.score}/5</div><div><strong>{customer?.fullName}</strong><p>{item.note}</p><small>{item.context} · {item.assignedTo}</small></div>{playbook && <button onClick={() => execute(() => state.applySartalRecoveryPlaybook(item.id, playbook.id), `${playbook.name} appliqué et client informé.`)}><HeartHandshake size={16} /> {playbook.name}</button>}</article>; })}{feedback.length === 0 && <div className="staff-list-empty"><CheckCircle2 size={28} /><strong>Aucune reprise ouverte</strong></div>}</aside></section>;
  };

  const renderManagerAction = () => {
    const approvals = db.employeeApprovals.filter(item => item.status === 'pending');
    return <section className="staff-manager-action"><div className="staff-approval-queue"><header><ShieldCheck size={21} /><div><h2>Validations sensibles</h2><p>Remises, offerts, annulations, écarts et substitutions.</p></div><b>{approvals.length}</b></header>{approvals.map(approval => <article key={approval.id}><span className={approval.type}><ShieldCheck size={18} /></span><div><strong>{approval.label}</strong><p>{approval.reason}</p><small>{approval.requestedByName} · {approval.referenceId} · {formatTime(approval.createdAt)}</small></div>{approval.amount && <b>{formatFCFA(approval.amount)}</b>}<footer><button onClick={() => execute(() => state.decideEmployeeApproval(approval.id, employee.id, 'rejected', 'Refus manager depuis le cockpit.'), 'Demande refusée et auteur prévenu.')}><XCircle size={16} /> Refuser</button><button onClick={() => execute(() => state.decideEmployeeApproval(approval.id, employee.id, 'approved', 'Validé pendant le service.'), 'Demande validée et tracée.')}><CheckCircle2 size={16} /> Valider</button></footer></article>)}{approvals.length === 0 && <div className="staff-list-empty"><CheckCircle2 size={30} /><strong>Aucune validation en attente</strong></div>}</div><aside className="staff-live-operations"><h3>Opérations en direct</h3>{db.employeeProfiles.map(profile => { const shift = db.employeeShifts.find(item => item.employeeId === profile.id && item.status === 'open'); const config = ROLE_CONFIG[profile.role]; const Icon = config.icon; return <div key={profile.id}><span style={{ background: config.color }}><Icon size={15} /></span><div><strong>{config.team}</strong><small>{profile.name}</small></div><b className={shift ? 'online' : ''}>{shift ? 'En service' : 'Hors service'}</b></div>; })}<button onClick={() => setTab('messages')}><Send size={16} /> Envoyer une consigne</button></aside></section>;
  };

  const renderRoleAction = () => {
    switch (employee.role) {
      case 'waiter': return renderWaiterAction();
      case 'cashier': return renderCashierAction();
      case 'kitchen': return renderKitchenAction();
      case 'receptionist': return renderReceptionAction();
      case 'housekeeper': return renderHousekeeperAction();
      case 'storekeeper': return renderStorekeeperAction();
      case 'picker': return renderPickerAction();
      case 'driver': return renderDriverAction();
      case 'customer_experience': return renderCustomerExperienceAction();
      case 'service_manager': return renderManagerAction();
    }
  };

  const renderMessages = () => (
    <section className="staff-messages-layout"><div className="staff-message-thread"><header><MessageCircle size={20} /><div><h2>Messages d’équipe</h2><p>Consignes opérationnelles liées au service.</p></div><b>{unreadMessages} non lu(s)</b></header>{visibleMessages.map(message => <button className={`${message.priority} ${message.readByEmployeeIds.includes(employee.id) ? 'read' : 'unread'}`} key={message.id} onClick={() => execute(() => state.markEmployeeMessageRead(message.id, employee.id), 'Message marqué comme lu.')}><span>{message.senderName.split(' ').slice(0, 2).map(part => part[0]).join('')}</span><div><strong>{message.senderName}</strong><p>{message.content}</p><small>{message.audience === 'all' ? 'Toute l’équipe' : ROLE_CONFIG[message.audience].team} · {formatTime(message.sentAt)}</small></div>{message.priority === 'urgent' && <b>URGENT</b>}</button>)}</div><aside className="staff-message-compose"><header><Send size={19} /><div><strong>Nouvelle consigne</strong><small>Elle sera conservée dans le service.</small></div></header><label>Destinataires<select value={messageAudience} onChange={event => setMessageAudience(event.target.value as EmployeeRole | 'all')}><option value="service_manager">Manager de service</option><option value="all">Toute l’équipe</option>{Object.entries(ROLE_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.team}</option>)}</select></label><label>Message<textarea value={messageText} onChange={event => setMessageText(event.target.value)} placeholder="Décrivez le fait, l’action attendue et le délai." /></label><button onClick={() => execute(() => { state.sendEmployeeMessage({ siteId: employee.siteId, senderId: employee.id, senderName: `${employee.name} · ${roleConfig.team}`, audience: messageAudience, content: messageText, priority: messageText.toLowerCase().includes('urgent') ? 'urgent' : 'normal' }); setMessageText(''); }, 'Consigne envoyée à l’équipe.')} disabled={!messageText.trim()}><Send size={17} /> Envoyer</button></aside></section>
  );

  const renderMore = () => (
    <section className="staff-more-layout"><div className="staff-profile-panel"><header><div className="staff-avatar"><RoleIcon size={24} /></div><div><span>{employee.employeeNumber}</span><h2>{employee.name}</h2><p>{roleConfig.label}</p></div></header><dl><div><dt>Établissement</dt><dd>{db.sites.find(item => item.id === employee.siteId)?.name}</dd></div><div><dt>Affectation</dt><dd>{activeShift?.assignmentLabel}</dd></div><div><dt>Appareil</dt><dd>{activeShift?.deviceLabel}</dd></div><div><dt>Connexion</dt><dd><i /> Session personnelle active</dd></div></dl><button onClick={() => { setLoggedIn(false); setPin(''); }}><LogOut size={16} /> Verrouiller l’écran</button></div><div className="staff-handover-form"><header><ClipboardCheck size={21} /><div><h2>Terminer et passer le service</h2><p>L’équipe suivante devra confirmer la reprise.</p></div></header><label>Ce qui reste à faire <textarea value={handover.notes} onChange={event => setHandover(current => ({ ...current, notes: event.target.value }))} placeholder="Ex. Table T12 attend l’addition..." /></label><div><label>Incidents<textarea value={handover.incidents} onChange={event => setHandover(current => ({ ...current, incidents: event.target.value }))} placeholder="Matériel, retard, anomalie..." /></label><label>Montants à contrôler<textarea value={handover.amountsToCheck} onChange={event => setHandover(current => ({ ...current, amountsToCheck: event.target.value }))} placeholder="Écart caisse, paiement en attente..." /></label></div><label>Clients à suivre <textarea value={handover.customersToFollow} onChange={event => setHandover(current => ({ ...current, customersToFollow: event.target.value }))} placeholder="Nom, engagement et délai promis..." /></label><button className="staff-end-shift" disabled={!handover.notes.trim()} onClick={() => execute(() => { if (!activeShift) throw new Error('Aucun service ouvert'); state.closeEmployeeShift(activeShift.id, handover); setLoggedIn(false); setPin(''); setHandover({ notes: '', incidents: '', amountsToCheck: '', customersToFollow: '' }); }, 'Passation enregistrée et service terminé.')}><LogOut size={18} /> Enregistrer la passation et terminer</button></div><aside className="staff-access-summary"><ShieldCheck size={24} /><h3>Sécurité du poste</h3><p>Cette session est limitée à votre rôle, votre établissement et votre affectation du jour.</p><ul><li><Check size={14} /> Actions métier autorisées</li><li><Check size={14} /> Traçabilité nominative</li><li><Check size={14} /> Validation manager sensible</li><li><XCircle size={14} /> Réglages administrateur masqués</li></ul></aside></section>
  );

  if (!loggedIn) return <div className="employee-workspace">{renderLogin()}{notice && <div className="staff-toast">{notice}</div>}</div>;
  if (!activeShift) return <div className="employee-workspace">{renderShiftStart()}{notice && <div className="staff-toast">{notice}</div>}</div>;

  const tabs: Array<{ id: StaffTab; label: string; icon: LucideIcon }> = [
    { id: 'today', label: "Aujourd'hui", icon: Home },
    { id: 'tasks', label: 'Mes tâches', icon: ClipboardCheck },
    { id: 'action', label: roleConfig.actionLabel, icon: roleConfig.icon },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'more', label: 'Plus', icon: MoreHorizontal }
  ];

  return <section className="employee-workspace staff-app" style={{ '--staff-role': roleConfig.color } as React.CSSProperties}>
    <header className="staff-app-header"><div className="staff-app-brand"><img src="./brand-mark.svg" alt="" /><span><strong>SÁRTAL ÉQUIPE</strong><small>{activeShift.assignmentLabel}</small></span></div><div className="staff-app-context"><span><i /> En service</span><strong>{roleConfig.team}</strong></div><button className="staff-header-profile" onClick={() => setTab('more')}><span>{employee.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{employee.name}</strong><small>{roleConfig.label}</small></div><ChevronRight size={16} /></button></header>
    <nav className="staff-desktop-nav">{tabs.map(item => { const Icon = item.icon; return <button className={`${tab === item.id ? 'active' : ''} ${item.id === 'action' ? 'central' : ''}`} key={item.id} onClick={() => setTab(item.id)}><Icon size={18} /><span>{item.label}</span>{item.id === 'messages' && unreadMessages > 0 && <b>{unreadMessages}</b>}</button>; })}</nav>
    <main className="staff-app-content">{tab === 'today' && renderToday()}{tab === 'tasks' && renderTasks()}{tab === 'action' && renderRoleAction()}{tab === 'messages' && renderMessages()}{tab === 'more' && renderMore()}</main>
    <nav className="staff-mobile-nav">{tabs.map(item => { const Icon = item.icon; return <button className={`${tab === item.id ? 'active' : ''} ${item.id === 'action' ? 'central' : ''}`} key={item.id} onClick={() => setTab(item.id)}><span><Icon size={item.id === 'action' ? 22 : 19} />{item.id === 'messages' && unreadMessages > 0 && <b>{unreadMessages}</b>}</span><small>{item.label}</small></button>; })}</nav>
    {notice && <div className="staff-toast">{notice}</div>}
  </section>;
};

export default EmployeeWorkspace;
