import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  CircleGauge,
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
  MapPinned,
  MessageCircle,
  Navigation,
  PackageCheck,
  PackageSearch,
  Phone,
  ReceiptText,
  Route,
  ScanBarcode,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  TrendingUp,
  UserRoundSearch,
  UsersRound,
  UtensilsCrossed,
  WalletCards,
  Warehouse,
  WandSparkles,
  WifiOff,
  XCircle,
  type LucideIcon
} from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { EmployeeExperiencePreferences, EmployeeRole, PaymentType } from '../types';
import { hasEmployeePermission } from '../employeePermissions';
import { getPMSAvailabilityByType } from '../utils/pmsAvailability';

type StaffTab = 'today' | 'tasks' | 'action' | 'messages' | 'more';
type EmployeeLifeSection = 'overview' | 'schedule' | 'growth' | 'support' | 'handover';
type TaskTone = 'urgent' | 'active' | 'waiting' | 'done';
type ReceptionWorkspace = 'arrivals' | 'rooms' | 'booking';
type StockWorkspace = 'scan' | 'receiving' | 'transfers' | 'inventory' | 'journal';

interface EmployeeWorkspaceProps {
  state: StockState;
  initialRole?: EmployeeRole;
  demoAutoStart?: boolean;
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

const SCHEDULE_STATUS: Record<string, string> = {
  planned: 'Planifié',
  confirmed: 'Confirmé',
  swap_requested: 'Accord collègue reçu',
  swap_pending_colleague: 'En attente du collègue',
  swap_colleague_accepted: 'Accord collègue · manager requis',
  swap_colleague_rejected: 'Échange refusé par le collègue',
  leave_requested: 'Absence demandée',
  change_approved: 'Changement validé',
  change_rejected: 'Changement refusé'
};

const WORKLOAD_LABELS = {
  comfortable: 'Fluide',
  busy: 'Soutenu',
  overloaded: 'Surchargé'
} as const;

const formatFCFA = (amount: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} FCFA`;
const formatTime = (date: string) => new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const elapsedMinutes = (date: string) => Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));

interface SpeechRecognitionEventLike {
  results: ArrayLike<{ 0: { transcript: string } }>;
}

interface SpeechRecognitionLike {
  lang: string;
  start: () => void;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export const EmployeeWorkspace: React.FC<EmployeeWorkspaceProps> = ({ state, initialRole, demoAutoStart = false }) => {
  const { db } = state;
  const initialEmployee = initialRole ? db.employeeProfiles.find(item => item.role === initialRole && item.active) : db.employeeProfiles[0];
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployee?.id || '');
  const [pin, setPin] = useState('');
  const [loggedIn, setLoggedIn] = useState(Boolean(initialRole));
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
  const [receptionBooking, setReceptionBooking] = useState(() => {
    const arrivalDate = db.pmsSettings.businessDate || new Date().toISOString().slice(0, 10);
    const departure = new Date(`${arrivalDate}T12:00:00`);
    departure.setDate(departure.getDate() + 1);
    return { guestName: '', phone: '+221 ', arrivalDate, departureDate: departure.toISOString().slice(0, 10), adults: 1, children: 0, roomType: db.pmsRooms[0]?.roomType || 'Standard', estimatedArrivalTime: db.pmsSettings.checkInTime || '15:00' };
  });
  const [stockWorkspace, setStockWorkspace] = useState<StockWorkspace>('scan');
  const [selectedSupplierOrderId, setSelectedSupplierOrderId] = useState('');
  const [transferDestinationId, setTransferDestinationId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('1');
  const [inventoryCount, setInventoryCount] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [stockDocumentLabel, setStockDocumentLabel] = useState('');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [deliverySignature, setDeliverySignature] = useState('');
  const [kdsStation, setKdsStation] = useState<'all' | 'kitchen' | 'drinks'>('all');
  const [kdsItemProgress, setKdsItemProgress] = useState<Set<string>>(() => new Set());
  const [housekeepingChecks, setHousekeepingChecks] = useState<Record<string, string[]>>({});
  const [minibarProductId, setMinibarProductId] = useState('prod-eau-50');
  const [pickedLineIds, setPickedLineIds] = useState<Set<string>>(() => new Set());
  const [customerFocusId, setCustomerFocusId] = useState('');
  const [handover, setHandover] = useState({ notes: '', incidents: '', amountsToCheck: '', customersToFollow: '' });
  const [lifeSection, setLifeSection] = useState<EmployeeLifeSection>('overview');
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [workload, setWorkload] = useState<'comfortable' | 'busy' | 'overloaded'>('comfortable');
  const [supportType, setSupportType] = useState<'reinforcement' | 'transport' | 'confidential'>('reinforcement');
  const [supportNote, setSupportNote] = useState('');
  const [supportWhen, setSupportWhen] = useState('');
  const [scheduleSwapTargetId, setScheduleSwapTargetId] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [recognitionTargetId, setRecognitionTargetId] = useState('');
  const [recognitionMessage, setRecognitionMessage] = useState('');
  const demoShiftOpeningRef = useRef('');

  const employee = db.employeeProfiles.find(item => item.id === selectedEmployeeId);
  const canEmployee = (permission: Parameters<typeof hasEmployeePermission>[1]) => employee ? hasEmployeePermission(employee, permission) : false;
  const activeShift = db.employeeShifts.find(item => item.employeeId === employee?.id && item.status === 'open');
  const role = employee?.role;
  const roleConfig = role ? ROLE_CONFIG[role] : ROLE_CONFIG.waiter;
  const siteBrand = db.sartalBrandSettings.siteProfiles.find(item => item.siteId === employee?.siteId);
  const enabledModules = db.sartalBrandSettings.enabledModules;
  const assignedPosId = activeShift?.assignmentId || employee?.posId;
  const assignedRestaurantOrders = assignedPosId ? db.restaurantGuestOrders.filter(item => item.posId === assignedPosId) : [];
  const preferences = employee?.experiencePreferences || { language: 'fr' as const, highContrast: false, lowBandwidth: employee?.role === 'driver', quietNotifications: true, voiceAssistance: false };
  const employeeSchedules = employee ? db.employeeSchedules.filter(item => item.employeeId === employee.id).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)) : [];
  const engagedScheduleIds = new Set(db.employeeSchedules.filter(item => ['swap_pending_colleague', 'swap_colleague_accepted'].includes(item.status)).map(item => item.requestedColleagueScheduleId).filter((id): id is string => Boolean(id)));
  const employeeSupportRequests = employee ? db.employeeSupportRequests.filter(item => item.employeeId === employee.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const employeeRecognitions = employee ? db.employeeRecognitions.filter(item => item.employeeId === employee.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const employeeLearning = employee ? db.employeeLearningModules.filter(item => {
    const roles = item.roles as string[];
    return roles.includes('all') || roles.includes(employee.role);
  }) : [];
  const latestWellbeing = employee ? db.employeeWellbeingCheckIns.filter(item => item.employeeId === employee.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : undefined;
  const activeBreak = employee ? db.employeeBreaks.find(item => item.employeeId === employee.id && item.status === 'started') : undefined;
  const openReinforcement = employeeSupportRequests.find(item => item.type === 'reinforcement' && item.status !== 'resolved');
  const nextSchedule = employeeSchedules.find(item => item.date >= new Date().toISOString().slice(0, 10));
  const swapScheduleOptions = employee ? db.employeeSchedules.filter(item => item.employeeId !== employee.id && item.siteId === employee.siteId && item.date >= new Date().toISOString().slice(0, 10) && !engagedScheduleIds.has(item.id) && ['planned', 'confirmed', 'change_rejected', 'swap_colleague_rejected'].includes(item.status) && db.employeeProfiles.some(profile => profile.id === item.employeeId && profile.active && profile.role === employee.role)).sort((a, b) => {
    const aRole = db.employeeProfiles.find(profile => profile.id === a.employeeId)?.role;
    const bRole = db.employeeProfiles.find(profile => profile.id === b.employeeId)?.role;
    return Number(aRole !== employee.role) - Number(bRole !== employee.role) || `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`);
  }) : [];
  const incomingSwapRequests = employee ? db.employeeSchedules.filter(item => item.requestedColleagueId === employee.id && item.status === 'swap_pending_colleague') : [];
  const customerContextAllowed = (context: string) => (
    context === 'restaurant'
      ? enabledModules.includes('restaurant')
      : context === 'delivery'
        ? enabledModules.includes('delivery')
        : enabledModules.includes('pms')
  );

  useEffect(() => {
    if (!demoAutoStart || !loggedIn || !employee || activeShift) return;
    if (demoShiftOpeningRef.current === employee.id) return;
    demoShiftOpeningRef.current = employee.id;
    try {
      const shiftId = state.startEmployeeShift(employee.id, employee.posId || employee.warehouseId || employee.siteId, 'Poste de démonstration');
      state.submitEmployeeWellbeingCheckIn({ employeeId: employee.id, shiftId, energy, workload });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('déjà ouvert')) {
        setNotice(error instanceof Error ? error.message : 'Impossible de préparer le poste de démonstration.');
      }
    }
  }, [activeShift, demoAutoStart, employee, energy, loggedIn, state, workload]);

  useEffect(() => {
    setAssignmentId(employee?.posId || employee?.warehouseId || employee?.siteId || '');
    setTab('today');
    setLifeSection('overview');
    setCareerGoal(employee?.careerGoal || '');
    setScheduleSwapTargetId('');
  }, [employee?.careerGoal, employee?.id, employee?.posId, employee?.siteId, employee?.warehouseId]);

  const roleAssignments = useMemo(() => {
    if (!employee) return [];
    if (['waiter', 'cashier', 'kitchen'].includes(employee.role)) {
      return db.posList.filter(item => item.id === employee.posId).map(item => ({ id: item.id, label: item.name }));
    }
    if (['storekeeper', 'picker', 'driver'].includes(employee.role)) {
      return db.warehouses
        .filter(item => item.id === employee.warehouseId)
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

  const toggleProgress = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    setter(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleHousekeepingCheck = (taskId: string, check: string) => {
    setHousekeepingChecks(current => {
      const values = new Set(current[taskId] || []);
      if (values.has(check)) values.delete(check);
      else values.add(check);
      return { ...current, [taskId]: [...values] };
    });
  };

  const startVoiceInventoryCount = () => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice('La dictée vocale n’est pas disponible sur ce navigateur.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'fr-FR';
    recognition.onresult = event => {
      const spoken = event.results[0]?.[0]?.transcript || '';
      const normalized = spoken.replace(',', '.').match(/\d+(?:\.\d+)?/g)?.[0] || '';
      if (normalized) setInventoryCount(normalized);
      setNotice(normalized ? `Comptage vocal reconnu : ${normalized}` : 'Nombre non reconnu. Réessayez calmement.');
    };
    recognition.onerror = () => setNotice('La dictée vocale a été interrompue.');
    recognition.start();
  };

  const getPOSStock = (productId: string, posId: string) => {
    const pricing = db.posPricing.find(item => item.productId === productId && item.posId === posId && item.isAvailable);
    const pos = db.posList.find(item => item.id === posId);
    const warehouseId = pricing?.defaultWarehouseId || pos?.defaultWarehouseId;
    const stock = db.stocks.find(item => item.productId === productId && item.warehouseId === warehouseId);
    return { pricing, stock, available: stock ? stock.quantityAvailable - stock.quantityReserved : 0, warehouseId };
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
      const orderIds = new Set(assignedRestaurantOrders.map(item => item.id));
      db.sartalServiceRequests.filter(item => item.context === 'restaurant' && (!item.referenceId || orderIds.has(item.referenceId)) && !['completed', 'cancelled'].includes(item.status)).forEach(item => {
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
      db.restaurantReservations.filter(item => item.posId === assignedPosId && ['confirmed', 'seated'].includes(item.status)).forEach(item => {
        const customer = db.sartalCustomers.find(customerItem => customerItem.id === item.customerId);
        tasks.push({ id: item.id, title: `Table ${item.tableNumber || 'à attribuer'} · ${item.guests} pers.`, detail: `${customer?.fullName || 'Client'}${customer?.allergies ? ` · Allergie ${customer.allergies}` : ''}`, meta: `${item.date} à ${item.time}`, tone: customer?.allergies ? 'urgent' : 'waiting', actionLabel: 'Voir la table', action: () => setTab('action') });
      });
    }

    if (employee.role === 'cashier') {
      assignedRestaurantOrders.filter(item => !['paid', 'cancelled'].includes(item.status)).forEach(item => {
        const paid = item.payments.reduce((sum, payment) => sum + payment.amount, 0);
        tasks.push({ id: item.id, title: `Addition ${item.tableNumber || item.id}`, detail: `${formatFCFA(item.total - paid)} à encaisser`, meta: `${item.payments.length} paiement(s) enregistré(s)`, tone: item.status === 'served' ? 'active' : 'waiting', actionLabel: 'Encaisser', action: () => { setSelectedOrderId(item.id); setPaymentAmount(String(item.total - paid)); setTab('action'); } });
      });
      db.employeeApprovals.filter(item => item.requestedBy === employee.id && item.status === 'pending').forEach(item => tasks.push({ id: item.id, title: item.label, detail: 'En attente de validation manager', meta: item.reason, tone: 'waiting' }));
    }

    if (employee.role === 'kitchen') {
      assignedRestaurantOrders.filter(item => ['placed', 'confirmed', 'preparing'].includes(item.status)).forEach(item => {
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
      db.sartalServiceRequests.filter(item => customerContextAllowed(item.context) && !['completed', 'cancelled'].includes(item.status)).forEach(item => {
        const customer = db.sartalCustomers.find(customerItem => customerItem.id === item.customerId);
        tasks.push({ id: item.id, title: item.label, detail: `${customer?.fullName || 'Client'} · ${item.context}`, meta: `${new Date(item.promisedAt).getTime() < Date.now() ? 'PROMESSE DÉPASSÉE' : `avant ${formatTime(item.promisedAt)}`}`, tone: new Date(item.promisedAt).getTime() < Date.now() || item.priority === 'urgent' ? 'urgent' : 'active', actionLabel: item.status === 'requested' ? 'Prendre' : 'Résoudre', action: () => execute(() => state.updateSartalServiceRequest(item.id, item.status === 'requested' ? 'accepted' : 'completed', employee.name), 'Engagement client mis à jour.') });
      });
      db.sartalCustomerFeedback.filter(item => customerContextAllowed(item.context) && item.recoveryStatus === 'open').forEach(item => tasks.push({ id: item.id, title: `Avis ${item.score}/5`, detail: item.note || 'Retour client à traiter', meta: item.assignedTo || 'À affecter', tone: 'urgent', actionLabel: 'Reprendre', action: () => setTab('action') }));
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
  const openShift = () => execute(() => {
    const shiftId = state.startEmployeeShift(employee.id, assignmentId, deviceLabel);
    state.submitEmployeeWellbeingCheckIn({ employeeId: employee.id, shiftId, energy, workload });
  }, `Service ouvert pour ${employee.name}. Bonne prise de poste.`);

  const saveWellbeing = () => execute(
    () => state.submitEmployeeWellbeingCheckIn({ employeeId: employee.id, shiftId: activeShift?.id, energy, workload }),
    'Votre ressenti est enregistré. Il sert à ajuster le service, pas à vous évaluer.'
  );

  const submitSupport = () => execute(() => {
    state.requestEmployeeSupport({
      employeeId: employee.id,
      siteId: employee.siteId,
      shiftId: activeShift?.id,
      type: supportType,
      note: supportNote,
      requestedFor: supportWhen ? new Date(supportWhen).toISOString() : undefined
    });
    setSupportNote('');
    setSupportWhen('');
  }, supportType === 'confidential' ? 'Demande confidentielle transmise au référent habilité.' : 'Votre demande a été envoyée et reste visible dans son suivi.');

  const updatePreference = (patch: Partial<EmployeeExperiencePreferences>) => execute(
    () => state.updateEmployeeExperience(employee.id, { preferences: patch }),
    'Préférence appliquée à votre espace.'
  );

  const startVoiceHandover = () => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice('La dictée vocale n’est pas disponible sur ce navigateur.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = preferences.language === 'wo' ? 'fr-SN' : 'fr-FR';
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      setHandover(current => ({ ...current, notes: `${current.notes} ${transcript}`.trim() }));
      setNotice('La dictée a été ajoutée à la passation.');
    };
    recognition.onerror = () => setNotice('La dictée vocale a été interrompue.');
    recognition.start();
  };

  const renderLogin = () => (
    <section className="staff-login-shell">
      <div className="staff-login-brand">
        <img src="./brand-mark.svg" alt="" />
        <span><strong>{db.sartalBrandSettings.staffAppName.toUpperCase()}</strong><small>Le bon poste, au bon moment</small></span>
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
        {!demoAutoStart && <button onClick={() => { setLoggedIn(false); setPin(''); }}><LogOut size={17} /> Changer de profil</button>}
      </header>
      <div className="staff-shift-grid">
        <section className="staff-start-form">
          <div className="staff-step-heading"><span>1</span><div><strong>Confirmer l’affectation</strong><small>Ces informations déterminent les données accessibles.</small></div></div>
          <label>Établissement<input value={db.sites.find(item => item.id === employee.siteId)?.name || ''} disabled /></label>
          <label>Poste<input value={roleConfig.label} disabled /></label>
          <label>POS, dépôt ou zone<select value={assignmentId} onChange={event => setAssignmentId(event.target.value)}>{roleAssignments.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>Appareil<select value={deviceLabel} onChange={event => setDeviceLabel(event.target.value)}><option>Téléphone personnel</option><option>Tablette de service</option><option>Terminal POS partagé</option><option>Terminal dépôt</option></select></label>
          {nextSchedule && <div className="staff-next-shift"><CalendarCheck size={19} /><span><small>Planning confirmé</small><strong>{new Date(`${nextSchedule.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {nextSchedule.startTime}–{nextSchedule.endTime}</strong><em>{nextSchedule.assignmentLabel}</em></span></div>}
          <div className="staff-energy-check">
            <header><HeartHandshake size={18} /><span><strong>Comment démarrez-vous ?</strong><small>Ce signal aide à équilibrer la charge du service.</small></span></header>
            <div className="staff-energy-scale" aria-label="Niveau d’énergie">{([1, 2, 3, 4, 5] as const).map(level => <button className={energy === level ? 'active' : ''} key={level} onClick={() => setEnergy(level)} aria-label={`Énergie ${level} sur 5`}><b>{level}</b><small>{level === 1 ? 'Faible' : level === 3 ? 'Moyenne' : level === 5 ? 'Haute' : ''}</small></button>)}</div>
            <div className="staff-workload-choice">{(Object.entries(WORKLOAD_LABELS) as Array<[typeof workload, string]>).map(([value, label]) => <button className={workload === value ? 'active' : ''} key={value} onClick={() => setWorkload(value)}>{label}</button>)}</div>
          </div>
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
      <section className="staff-wellbeing-strip">
        <article><HeartHandshake size={20} /><span><small>Mon rythme</small><strong>{latestWellbeing ? `Énergie ${latestWellbeing.energy}/5 · ${WORKLOAD_LABELS[latestWellbeing.workload]}` : 'À renseigner'}</strong></span><button onClick={() => { setLifeSection('overview'); setTab('more'); }}>Actualiser</button></article>
        <article><Clock3 size={20} /><span><small>Pause</small><strong>{activeBreak ? `En cours depuis ${formatTime(activeBreak.startedAt || activeBreak.plannedAt)}` : 'Disponible quand nécessaire'}</strong></span>{activeBreak ? <button onClick={() => execute(() => state.completeEmployeeBreak(activeBreak.id, employee.id), 'Pause terminée. Bon retour au service.')}><Check size={15} /> Reprendre</button> : <button onClick={() => execute(() => state.startEmployeeBreak(employee.id, activeShift!.id, 'rest'), 'Pause démarrée. Votre équipe voit uniquement votre indisponibilité temporaire.')}><Clock3 size={15} /> Démarrer</button>}</article>
        <article className={openReinforcement ? 'active' : ''}><UsersRound size={20} /><span><small>Besoin d’aide</small><strong>{openReinforcement ? `Demande ${openReinforcement.status === 'acknowledged' ? 'prise en compte' : 'envoyée'}` : 'Un renfort en un geste'}</strong></span>{openReinforcement ? <button onClick={() => { setLifeSection('support'); setTab('more'); }}>Suivre</button> : <button onClick={() => execute(() => state.requestEmployeeSupport({ employeeId: employee.id, siteId: employee.siteId, shiftId: activeShift?.id, type: 'reinforcement', note: `Charge ${WORKLOAD_LABELS[latestWellbeing?.workload || workload].toLowerCase()} sur le poste ${roleConfig.team}.` }), 'Le manager a reçu votre demande de renfort.')}><Bell size={15} /> Demander</button>}</article>
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
    const orders = assignedRestaurantOrders.filter(item => !['cancelled'].includes(item.status));
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
    const unpaidOrders = assignedRestaurantOrders.filter(item => !['paid', 'cancelled'].includes(item.status));
    const selectedOrder = unpaidOrders.find(item => item.id === selectedOrderId) || unpaidOrders[0];
    const paid = selectedOrder?.payments.reduce((sum, item) => sum + item.amount, 0) || 0;
    const remaining = Math.max(0, (selectedOrder?.total || 0) - paid);
    const paymentTotals = cashSession?.paymentTotals || assignedRestaurantOrders.flatMap(item => item.payments).reduce<Record<PaymentType, number>>((totals, payment) => ({ ...totals, [payment.method]: totals[payment.method] + payment.amount }), { cash: 0, card: 0, wave: 0, orange_money: 0, room_charge: 0, other: 0 });
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
    const tickets = assignedRestaurantOrders.filter(item => ['placed', 'confirmed', 'preparing', 'ready'].includes(item.status));
    return <section className="staff-kds"><header><div><span>KDS CUISINE</span><h2>Tickets par urgence</h2><p>Chaque article doit être confirmé avant de déclarer le ticket prêt.</p></div><b><i /> Cuisine en service</b></header><div className="staff-kds-board">{tickets.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(order => {
      const customer = db.sartalCustomers.find(item => item.id === order.customerId);
      const next = order.status === 'preparing' ? 'ready' : 'preparing';
      const visibleItems = order.items.filter(item => {
        const category = db.products.find(product => product.id === item.productId)?.category || '';
        return kdsStation === 'all' || (kdsStation === 'drinks' ? /boisson|mocktail/i.test(category) : !/boisson|mocktail/i.test(category));
      });
      if (visibleItems.length === 0) return null;
      const allItemsChecked = visibleItems.length > 0 && visibleItems.every(item => kdsItemProgress.has(`${order.id}-${item.productId}`));
      const outageItem = visibleItems[0];
      const outageProduct = db.products.find(product => product.id === outageItem.productId);
      return <article className={`${order.status} ${customer?.allergies ? 'allergy' : ''}`} key={order.id}><header><strong>{order.tableNumber || 'À emporter'}</strong><time>{elapsedMinutes(order.createdAt)} min</time></header>{customer?.allergies && <div className="staff-kds-allergy"><AlertCircle size={17} /> ALLERGIE {customer.allergies.toUpperCase()}</div>}<div className="staff-kds-items">{visibleItems.map(item => { const key = `${order.id}-${item.productId}`; return <button className={kdsItemProgress.has(key) ? 'checked' : ''} key={item.productId} onClick={() => toggleProgress(setKdsItemProgress, key)}><b>{item.quantity}×</b><span><strong>{db.products.find(product => product.id === item.productId)?.name || item.productId}</strong>{item.note && <small>{item.note}</small>}</span><i>{kdsItemProgress.has(key) ? <Check size={15} /> : <Clock3 size={15} />}</i></button>; })}</div><footer><span>{ORDER_STATUS[order.status]}</span>{order.status !== 'ready' && <button disabled={next === 'ready' && !allItemsChecked} onClick={() => execute(() => state.updateRestaurantGuestOrderStatus(order.id, next), next === 'ready' ? `Ticket ${order.tableNumber} prêt.` : `Ticket ${order.tableNumber} démarré.`)}>{next === 'ready' ? <><CheckCircle2 size={16} /> {allItemsChecked ? 'Plat prêt' : 'Cocher les articles'}</> : <><ChefHat size={16} /> Démarrer</>}</button>}<button className="staff-kds-issue" onClick={() => execute(() => state.setPOSProductAvailability(outageItem.productId, order.posId, false, `${employee.name} · Cuisine`), `${outageProduct?.name || 'Article'} retiré immédiatement du canal de vente et salle prévenue.`)}><AlertCircle size={15} /> Rupture {outageProduct?.name}</button></footer></article>;
    })}</div></section>;
  };

  const renderReceptionAction = () => {
    const reservations = db.pmsReservations.filter(item => ['confirmed', 'checked_in'].includes(item.status));
    const selectedReservation = reservations.find(item => item.id === selectedReservationId);
    const selectedGuest = db.pmsGuests.find(item => item.id === selectedReservation?.guestId);
    const selectedRoom = db.pmsRooms.find(item => item.id === selectedReservation?.roomId);
    const selectedFolio = db.pmsFolios.find(item => item.reservationId === selectedReservation?.id);
    const availableRooms = selectedReservation ? db.pmsRooms.filter(room => room.status === 'vacant' && ['clean', 'inspected'].includes(room.housekeepingStatus) && room.capacity >= selectedReservation.adults + selectedReservation.children).slice(0, 6) : [];
    const bookingAvailability = getPMSAvailabilityByType(db, receptionBooking.arrivalDate, receptionBooking.departureDate);
    const selectedBookingType = bookingAvailability.find(item => item.roomType === receptionBooking.roomType) || bookingAvailability[0];
    const bookingNights = Math.max(1, Math.ceil((new Date(receptionBooking.departureDate).getTime() - new Date(receptionBooking.arrivalDate).getTime()) / 86400000));

    const createReceptionBooking = (event: React.FormEvent) => {
      event.preventDefault();
      if (!canEmployee('reservation_create')) { setNotice('Votre profil ne permet pas de créer une réservation.'); return; }
      if (!selectedBookingType || selectedBookingType.closed || selectedBookingType.available < 1) { setNotice('Cette catégorie n’est pas disponible sur les dates choisies.'); return; }
      if (!receptionBooking.guestName.trim() || receptionBooking.phone.replace(/\D/g, '').length < 9) { setNotice('Renseignez le nom et un numéro de téléphone complet.'); return; }
      try {
        const reservationId = state.createPMSReservation({
          guestName: receptionBooking.guestName,
          phone: receptionBooking.phone,
          roomId: '',
          arrivalDate: receptionBooking.arrivalDate,
          departureDate: receptionBooking.departureDate,
          adults: receptionBooking.adults,
          children: receptionBooking.children,
          source: 'direct',
          nightlyRate: selectedBookingType.price,
          depositAmount: 0,
          requestedRoomType: selectedBookingType.roomType,
          guaranteeType: 'none',
          estimatedArrivalTime: receptionBooking.estimatedArrivalTime,
          notes: `Réservation créée sur place par ${employee?.name || 'la réception'}.`
        });
        setSelectedReservationId(reservationId);
        setReceptionWorkspace('arrivals');
        setNotice(`Réservation confirmée pour ${receptionBooking.guestName}. Garantie à sécuriser à l’accueil.`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Réservation impossible');
      }
    };

    return <section className="staff-reception-workspace">
      <nav className="staff-workspace-switch"><button className={receptionWorkspace === 'arrivals' ? 'active' : ''} onClick={() => setReceptionWorkspace('arrivals')}><CalendarCheck size={17} /> Arrivées & séjours</button>{canEmployee('reservation_create') && <button className={receptionWorkspace === 'booking' ? 'active' : ''} onClick={() => setReceptionWorkspace('booking')}><CalendarCheck size={17} /> Nouvelle réservation</button>}<button className={receptionWorkspace === 'rooms' ? 'active' : ''} onClick={() => setReceptionWorkspace('rooms')}><BedDouble size={17} /> État des chambres</button></nav>
      {receptionWorkspace === 'booking' ? <form className="staff-reception-booking" onSubmit={createReceptionBooking}><header><div><span>RÉSERVATION SUR PLACE</span><h2>Créer un séjour sans quitter la réception</h2><p>Les disponibilités et les tarifs proviennent du même PMS que le site public.</p></div><b>{selectedBookingType?.available || 0} disponible(s)</b></header><div className="staff-booking-fields"><label>Arrivée<input type="date" value={receptionBooking.arrivalDate} onChange={event => setReceptionBooking({ ...receptionBooking, arrivalDate: event.target.value })} required /></label><label>Départ<input type="date" min={receptionBooking.arrivalDate} value={receptionBooking.departureDate} onChange={event => setReceptionBooking({ ...receptionBooking, departureDate: event.target.value })} required /></label><label>Adultes<input type="number" min="1" max="8" value={receptionBooking.adults} onChange={event => setReceptionBooking({ ...receptionBooking, adults: Number(event.target.value) })} /></label><label>Enfants<input type="number" min="0" max="8" value={receptionBooking.children} onChange={event => setReceptionBooking({ ...receptionBooking, children: Number(event.target.value) })} /></label><label className="wide">Nom du client<input value={receptionBooking.guestName} onChange={event => setReceptionBooking({ ...receptionBooking, guestName: event.target.value })} placeholder="Prénom et nom" required /></label><label>Téléphone<input type="tel" value={receptionBooking.phone} onChange={event => setReceptionBooking({ ...receptionBooking, phone: event.target.value })} required /></label><label>Arrivée estimée<input type="time" value={receptionBooking.estimatedArrivalTime} onChange={event => setReceptionBooking({ ...receptionBooking, estimatedArrivalTime: event.target.value })} /></label></div><section className="staff-booking-types"><h3>Catégorie de chambre</h3><div>{bookingAvailability.map(item => <button type="button" className={receptionBooking.roomType === item.roomType ? 'selected' : ''} disabled={item.closed || item.available < 1} onClick={() => setReceptionBooking({ ...receptionBooking, roomType: item.roomType })} key={item.roomType}><span><strong>{item.roomType}</strong><small>{item.closed ? 'Vente fermée' : `${item.available} disponible(s)`}</small></span><b>{formatFCFA(item.price)}<small>/ nuit</small></b></button>)}</div></section><footer><div><small>{bookingNights} nuit(s) · {receptionBooking.adults + receptionBooking.children} voyageur(s)</small><strong>{formatFCFA((selectedBookingType?.price || 0) * bookingNights)}</strong><span>Garantie à sécuriser au comptoir</span></div><button className="staff-primary-action" disabled={!selectedBookingType || selectedBookingType.closed || selectedBookingType.available < 1}><CalendarCheck size={17} /> Confirmer la réservation</button></footer></form> : receptionWorkspace === 'rooms' ? <div className="staff-room-status-board">{db.pmsRooms.map(room => {
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
    <section className="staff-housekeeping"><header><div><span>ÉTAGES</span><h2>Chambres par priorité</h2><p>Nettoyage, linge, minibar, salle de bain et preuve photo.</p></div><div className="staff-room-legend-inline"><span><i className="dirty" /> À faire</span><span><i className="in_progress" /> En cours</span><span><i className="clean" /> Propre</span><span><i className="inspected" /> Contrôlée</span></div></header><div className="staff-room-task-grid">{db.pmsHousekeepingTasks.slice().sort((a, b) => Number(b.priority === 'urgent') - Number(a.priority === 'urgent') || (db.pmsRooms.find(item => item.id === a.roomId)?.roomNumber || '').localeCompare(db.pmsRooms.find(item => item.id === b.roomId)?.roomNumber || '')).map(task => {
      const room = db.pmsRooms.find(item => item.id === task.roomId);
      const nextStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : task.status === 'completed' ? 'inspected' : 'inspected';
      const checks = housekeepingChecks[task.id] || [];
      const requiredChecks = ['linge', 'minibar', 'salle-de-bain', 'photo'];
      const checklistComplete = requiredChecks.every(check => checks.includes(check));
      return <article className={`${task.status} ${task.priority}`} key={task.id}>
        <header><div><strong>{room?.roomNumber}</strong><span>{room?.floor}</span></div><b>{task.priority === 'urgent' ? 'PRIORITAIRE' : ORDER_STATUS[task.status]}</b></header>
        <h3>{room?.roomType}</h3><p>{task.note || 'Entretien standard'}</p>
        <div className="staff-room-checks"><span className={task.linenStatus === 'complete' ? 'ok' : 'alert'}>Linge : {task.linenStatus || 'à vérifier'}</span><span className={task.minibarStatus === 'checked' ? 'ok' : 'alert'}>Minibar : {task.minibarStatus || 'à vérifier'}</span><span><Camera size={13} /> {task.photoCount || 0} photo(s)</span></div>
        {task.status !== 'pending' && <div className="staff-room-checklist">{requiredChecks.map(check => <button className={checks.includes(check) ? 'checked' : ''} key={check} onClick={() => toggleHousekeepingCheck(task.id, check)}>{checks.includes(check) ? <Check size={13} /> : <i />}{check === 'salle-de-bain' ? 'Salle de bain' : check.charAt(0).toUpperCase() + check.slice(1)}</button>)}</div>}
        <footer>{task.status !== 'inspected' && <button disabled={nextStatus === 'completed' && !checklistComplete} onClick={() => execute(() => state.updatePMSHousekeepingTask(task.id, nextStatus, employee.name), `Chambre ${room?.roomNumber} : ${ORDER_STATUS[nextStatus].toLowerCase()}.`)}>{nextStatus === 'in_progress' ? 'Démarrer' : nextStatus === 'completed' ? checklistComplete ? 'Terminer' : `${checks.length}/4 contrôles` : 'Valider'}</button>}<button className="staff-photo-action" onClick={() => execute(() => { state.updatePMSHousekeepingDetails(task.id, { photoCount: (task.photoCount || 0) + 1 }, employee.name); if (!checks.includes('photo')) toggleHousekeepingCheck(task.id, 'photo'); }, `Photo ajoutée à la chambre ${room?.roomNumber}.`)}><Camera size={15} /> Photo</button></footer>
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
    const zoneRank: Record<string, number> = { 'Point E / Fann': 1, 'Mermoz / Sacré-Coeur': 2, 'Ouakam / Almadies': 3 };
    const orders = db.deliveryOrders.filter(item => ['confirmed', 'reserved', 'preparing', 'ready'].includes(item.status)).sort((a, b) => (zoneRank[a.zone || ''] || 9) - (zoneRank[b.zone || ''] || 9) || a.createdAt.localeCompare(b.createdAt));
    return <section className="staff-picking"><header><div><span>PRÉPARATION</span><h2>Parcours de picking</h2><p>Chaque ligne est scannée avant le contrôle final du panier.</p></div><b>{orders.length} commande(s)</b></header><div className="staff-picking-list">{orders.map(order => { const lineKeys = order.items.map(line => `${order.id}-${line.productId}`); const allScanned = lineKeys.every(key => pickedLineIds.has(key)); return <article key={order.id} className={order.status}><header><div><span>{order.id}</span><h3>{order.customerName}</h3><small>{order.zone || order.address} · {order.paymentStatus === 'paid' ? 'Payée' : 'À encaisser'}</small></div><b>{ORDER_STATUS[order.status]}</b></header><div className="staff-picking-items">{order.items.map(line => { const key = `${order.id}-${line.productId}`; const product = db.products.find(item => item.id === line.productId); const stock = db.stocks.find(item => item.productId === line.productId && item.warehouseId === order.warehouseId); const stockOk = Boolean(stock && stock.quantityAvailable - stock.quantityReserved >= line.quantity); return <button className={pickedLineIds.has(key) ? 'checked' : ''} key={line.productId} onClick={() => toggleProgress(setPickedLineIds, key)}><span className={stockOk ? 'ok' : 'alert'}>{pickedLineIds.has(key) ? <Check size={15} /> : stockOk ? <ScanBarcode size={15} /> : <AlertCircle size={15} />}</span><strong>{line.quantity}× {product?.name || line.productId}</strong><small>{pickedLineIds.has(key) ? 'Article scanné et quantité confirmée' : line.substitutionPolicy === 'replace' ? 'Substitution autorisée' : line.substitutionPolicy === 'refund' ? 'Rembourser si absent' : 'Scanner pour confirmer'}</small></button>; })}</div><footer><span><MapPin size={15} /> {order.landmark || 'Repère à confirmer'}</span>{order.status === 'confirmed' && <button onClick={() => runDeliveryStep(order.id, 'reserve')}>Réserver le stock</button>}{order.status === 'reserved' && <button onClick={() => runDeliveryStep(order.id, 'prepare')}>Démarrer le picking</button>}{order.status === 'preparing' && <button disabled={!allScanned} onClick={() => runDeliveryStep(order.id, 'ready')}>{allScanned ? 'Contrôler et fermer' : `${lineKeys.filter(key => pickedLineIds.has(key)).length}/${lineKeys.length} scanné(s)`}</button>}{order.status === 'ready' && <button onClick={() => runDeliveryStep(order.id, 'dispatch')}>Remettre au livreur</button>}</footer></article>; })}</div></section>;
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

  const renderWaiterGameChanger = () => {
    const activeOrders = assignedRestaurantOrders.filter(item => !['paid', 'cancelled'].includes(item.status));
    const focusOrder = activeOrders.find(item => item.status === 'ready') || activeOrders.find(item => item.status === 'served') || activeOrders[0];
    const focusCustomer = db.sartalCustomers.find(item => item.id === focusOrder?.customerId);
    const activeOrderIds = new Set(activeOrders.map(item => item.id));
    const priorityRequest = db.sartalServiceRequests.find(item => item.context === 'restaurant' && (!item.referenceId || activeOrderIds.has(item.referenceId)) && !['completed', 'cancelled'].includes(item.status) && (item.priority === 'urgent' || new Date(item.promisedAt).getTime() < Date.now()));
    const suggestions = db.posPricing
      .filter(item => item.posId === assignedPosId && item.isAvailable && !focusOrder?.items.some(line => line.productId === item.productId))
      .map(pricing => {
        const product = db.products.find(item => item.id === pricing.productId);
        const stockInfo = getPOSStock(pricing.productId, pricing.posId);
        return { pricing, product, available: stockInfo.available, margin: pricing.salePrice - (stockInfo.stock?.averageCost || 0) };
      })
      .filter(item => item.product?.isActive && item.available > 0 && !focusCustomer?.allergies?.toLowerCase().includes(item.product!.name.toLowerCase()))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 3);
    const statusIndex = focusOrder ? ['confirmed', 'preparing', 'ready', 'served'].indexOf(focusOrder.status) : -1;
    const runNextAction = () => {
      if (priorityRequest) {
        execute(() => state.updateSartalServiceRequest(priorityRequest.id, priorityRequest.status === 'requested' ? 'accepted' : 'completed', employee.name), 'Priorité client traitée.');
      } else if (focusOrder?.status === 'ready') {
        execute(() => state.updateRestaurantGuestOrderStatus(focusOrder.id, 'served'), `Table ${focusOrder.tableNumber} servie et chronologie mise à jour.`);
      } else if (focusOrder?.status === 'served') {
        execute(() => state.sendEmployeeMessage({ siteId: employee.siteId, senderId: employee.id, senderName: `${employee.name} · Salle`, audience: 'cashier', content: `Addition table ${focusOrder.tableNumber || focusOrder.id} prête à encaisser.`, priority: 'normal' }), 'La caisse a reçu la demande d’addition.');
      }
    };
    const actionLabel = priorityRequest ? `Traiter · ${priorityRequest.label}` : focusOrder?.status === 'ready' ? `Servir la table ${focusOrder.tableNumber}` : focusOrder?.status === 'served' ? 'Prévenir la caisse' : 'Service sous contrôle';
    return <section className="staff-game-changer staff-waiter-intelligence"><header><WandSparkles size={22} /><div><span>ASSISTANT DE SALLE</span><h2>La prochaine meilleure action</h2></div><b>{activeOrders.length} table(s) suivie(s)</b></header><div className="staff-intelligence-grid"><article className="staff-next-action"><small>À faire maintenant</small><strong>{actionLabel}</strong><p>{priorityRequest ? `Promesse ${formatTime(priorityRequest.promisedAt)} · ${priorityRequest.assignedTo}` : focusOrder ? `${focusCustomer?.fullName || 'Client'} · ${elapsedMinutes(focusOrder.createdAt)} min depuis la commande` : 'Aucune table ne nécessite une intervention.'}</p>{(priorityRequest || ['ready', 'served'].includes(focusOrder?.status || '')) && <button onClick={runNextAction}><ArrowRight size={16} /> Exécuter</button>}</article><article className="staff-service-timeline"><small>Chronologie {focusOrder?.tableNumber ? `table ${focusOrder.tableNumber}` : ''}</small><div>{['Commande', 'Cuisine', 'Prêt', 'Servi'].map((label, index) => <span className={index <= statusIndex ? 'done' : index === statusIndex + 1 ? 'current' : ''} key={label}><i>{index < statusIndex ? <Check size={12} /> : index + 1}</i>{label}</span>)}</div></article><article className="staff-smart-suggestions"><small>Suggestions disponibles et rentables</small>{suggestions.map(item => <div key={item.product!.id}><span><strong>{item.product!.name}</strong><small>{item.available} disponible(s) · marge estimée {formatFCFA(item.margin)}</small></span><b>{formatFCFA(item.pricing.salePrice)}</b></div>)}{suggestions.length === 0 && <p>Aucune suggestion compatible avec le stock actuel.</p>}</article></div></section>;
  };

  const renderCashierGameChanger = () => {
    const cashSession = db.cashSessions.find(item => item.userId === employee.id && item.status === 'open');
    const posOrders = assignedRestaurantOrders;
    const payments = posOrders.flatMap(order => order.payments.map(payment => ({ order, payment })));
    const unlinked = cashSession ? payments.filter(item => item.payment.method !== 'room_charge' && !item.payment.cashSessionId && new Date(item.payment.paidAt).getTime() >= new Date(cashSession.openedAt).getTime()) : [];
    const duplicates = payments.filter((entry, index) => payments.some((other, otherIndex) => otherIndex < index && other.payment.method === entry.payment.method && other.payment.amount === entry.payment.amount && Math.abs(new Date(other.payment.paidAt).getTime() - new Date(entry.payment.paidAt).getTime()) < 60000));
    const mobileWithoutPayer = payments.filter(item => ['wave', 'orange_money'].includes(item.payment.method) && !item.payment.payerName);
    const expectedCash = (cashSession?.openingFloat || 0) + (cashSession?.paymentTotals.cash || 0);
    const auditIssues = unlinked.length + duplicates.length + mobileWithoutPayer.length + (cashSession ? 0 : 1);
    const score = Math.max(0, 100 - auditIssues * 18);
    const selectedOrder = posOrders.find(item => item.id === selectedOrderId) || posOrders.find(item => !['paid', 'cancelled'].includes(item.status));
    const splitGuests = selectedOrder ? db.restaurantGuestInvites.filter(item => item.orderId === selectedOrder.id) : [];
    const folioOpen = Boolean(selectedOrder?.folioId && db.pmsFolios.some(item => item.id === selectedOrder.folioId && item.status === 'open'));
    return <section className="staff-game-changer staff-cash-audit"><header><CircleGauge size={22} /><div><span>CONTRÔLE EN CONTINU</span><h2>Rapprochement automatique</h2></div><strong className={score >= 90 ? 'good' : score >= 70 ? 'warning' : 'danger'}>{score}% fiable</strong></header><div className="staff-intelligence-metrics"><article><small>Espèces attendues</small><strong>{formatFCFA(expectedCash)}</strong><button disabled={!cashSession} onClick={() => { setClosingCash(String(expectedCash)); setNotice('Montant attendu repris dans le comptage de clôture.'); }}>Reprendre le montant</button></article><article><small>Paiements non rattachés</small><strong>{unlinked.length}</strong><p>{unlinked.length ? 'À contrôler avant le rapport Z' : 'Tous les paiements sont reliés à la caisse'}</p></article><article><small>Doublons potentiels</small><strong>{duplicates.length}</strong><p>{duplicates.length ? 'Même moyen, montant et minute' : 'Aucun doublon détecté'}</p></article><article><small>Imputation chambre</small><strong>{folioOpen ? 'Autorisée' : 'Verrouillée'}</strong><p>{selectedOrder?.roomNumber ? `Chambre ${selectedOrder.roomNumber}` : 'Aucun folio actif sélectionné'}</p></article></div>{selectedOrder && <div className="staff-split-visual"><span><strong>Addition {selectedOrder.tableNumber || selectedOrder.id}</strong><small>{formatFCFA(selectedOrder.total)} · {selectedOrder.payments.length} paiement(s)</small></span><div>{splitGuests.map(guest => <i key={guest.id} style={{ flexGrow: guest.shareAmount || 1 }} title={`${guest.fullName} · ${formatFCFA(guest.shareAmount || 0)}`}>{guest.fullName.split(' ')[0]}</i>)}{splitGuests.length === 0 && <i style={{ flexGrow: 1 }}>Paiement unique ou libre</i>}</div></div>}</section>;
  };

  const renderKitchenGameChanger = () => {
    const tickets = assignedRestaurantOrders.filter(item => ['placed', 'confirmed', 'preparing'].includes(item.status));
    const routedItems = tickets.flatMap(order => order.items.map(line => ({ order, line, product: db.products.find(item => item.id === line.productId) })));
    const stationItems = routedItems.filter(item => kdsStation === 'all' || (kdsStation === 'drinks' ? /boisson|mocktail/i.test(item.product?.category || '') : !/boisson|mocktail/i.test(item.product?.category || '')));
    const overdue = tickets.filter(item => elapsedMinutes(item.createdAt) > item.estimatedMinutes).length;
    const workloadMinutes = Math.max(5, Math.ceil(stationItems.reduce((sum, item) => sum + item.line.quantity, 0) / 3) * 5);
    const directShortages = stationItems.filter(item => item.product?.isStockable && getPOSStock(item.line.productId, item.order.posId).available < item.line.quantity);
    return <section className="staff-game-changer staff-kitchen-intelligence"><header><CircleGauge size={22} /><div><span>PILOTAGE KDS</span><h2>Charge et routage en temps réel</h2></div><b className={overdue ? 'danger' : 'good'}>{overdue} ticket(s) en retard</b></header><div className="staff-station-tabs"><button className={kdsStation === 'all' ? 'active' : ''} onClick={() => setKdsStation('all')}>Tous · {routedItems.length}</button><button className={kdsStation === 'kitchen' ? 'active' : ''} onClick={() => setKdsStation('kitchen')}>Cuisine</button><button className={kdsStation === 'drinks' ? 'active' : ''} onClick={() => setKdsStation('drinks')}>Boissons</button></div><div className="staff-intelligence-metrics"><article><small>Charge estimée</small><strong>{workloadMinutes} min</strong><p>{stationItems.reduce((sum, item) => sum + item.line.quantity, 0)} préparation(s) à produire</p></article><article><small>Articles cochés</small><strong>{stationItems.filter(item => kdsItemProgress.has(`${item.order.id}-${item.line.productId}`)).length}/{stationItems.length}</strong><p>Validation article par article</p></article><article><small>Stock direct à confirmer</small><strong>{directShortages.length}</strong><p>{directShortages[0]?.product?.name || 'Aucune rupture directe détectée'}</p></article></div></section>;
  };

  const renderReceptionGameChanger = () => {
    const arrivals = db.pmsReservations.filter(item => item.status === 'confirmed');
    const reservation = arrivals.find(item => item.id === selectedReservationId) || arrivals[0];
    const guest = db.pmsGuests.find(item => item.id === reservation?.guestId);
    const notifications = db.pmsNotifications.filter(item => item.reservationId === reservation?.id);
    const roomScores = reservation ? db.pmsRooms
      .filter(room => room.status === 'vacant' && ['clean', 'inspected'].includes(room.housekeepingStatus) && room.capacity >= reservation.adults + reservation.children)
      .map(room => ({ room, score: 55 + (room.housekeepingStatus === 'inspected' ? 20 : 10) + (reservation.requestedRoomType && room.roomType.toLowerCase().includes(reservation.requestedRoomType.toLowerCase().replace('chambre ', '')) ? 20 : 0) + (Math.abs(room.nightlyRate - reservation.nightlyRate) <= 5000 ? 5 : 0) }))
      .sort((a, b) => b.score - a.score).slice(0, 3) : [];
    const folio = db.pmsFolios.find(item => item.reservationId === reservation?.id);
    const balance = folio ? folio.charges.reduce((sum, item) => sum + item.amount, 0) - folio.payments.reduce((sum, item) => sum + item.amount, 0) : Math.max(0, (reservation?.nightlyRate || 0) - (reservation?.depositAmount || 0));
    return <section className="staff-game-changer staff-reception-intelligence"><header><WandSparkles size={22} /><div><span>ARRIVÉE SANS FRICTION</span><h2>Client, chambre et folio réunis</h2></div><b>{arrivals.length} arrivée(s)</b></header>{reservation ? <div className="staff-reception-assistant"><article><small>Client</small><strong>{guest?.fullName}</strong><p>{guest?.preferences || 'Aucune préférence enregistrée'}{guest?.allergies ? ` · Allergie ${guest.allergies}` : ''}</p><div><span>Pré-check-in {guest?.preCheckInStatus === 'completed' ? 'terminé' : 'à envoyer'}</span><span>Solde {formatFCFA(Math.max(0, balance))}</span></div><button disabled={notifications.some(item => item.type === 'arrival_reminder' && item.status !== 'failed')} onClick={() => execute(() => state.schedulePMSNotification(reservation.id, 'arrival_reminder', 'whatsapp'), 'Pré-check-in et rappel d’arrivée programmés sur WhatsApp.')}><Send size={16} /> Envoyer le pré-check-in</button></article><section><small>Chambres recommandées</small>{roomScores.map(({ room, score }, index) => <button key={room.id} onClick={() => execute(() => state.assignPMSRoom(reservation.id, room.id, true), `Chambre ${room.roomNumber} attribuée avec un score de compatibilité de ${score}%.`)}><span><strong>{room.roomNumber}</strong><small>{room.roomType} · {room.housekeepingStatus}</small></span><b>{score}%{index === 0 && <small> Meilleur choix</small>}</b></button>)}</section><aside><small>Timeline du séjour</small><div><span className="done"><Check size={12} /> Réservation</span><span className={guest?.preCheckInStatus === 'completed' ? 'done' : 'current'}>Pré-check-in</span><span className={reservation.roomId ? 'done' : 'current'}>Chambre</span><span>Clé & arrivée</span></div></aside></div> : <div className="staff-list-empty"><CheckCircle2 size={28} /><strong>Aucune arrivée à préparer</strong></div>}</section>;
  };

  const renderHousekeeperGameChanger = () => {
    const route = db.pmsHousekeepingTasks.filter(item => item.status !== 'inspected').sort((a, b) => Number(b.priority === 'urgent') - Number(a.priority === 'urgent') || (db.pmsRooms.find(item => item.id === a.roomId)?.roomNumber || '').localeCompare(db.pmsRooms.find(item => item.id === b.roomId)?.roomNumber || ''));
    const roomService = db.posList.find(item => item.type === 'room_service');
    const minibarProducts = roomService ? db.posPricing.filter(item => item.posId === roomService.id && item.isAvailable).map(item => ({ pricing: item, product: db.products.find(product => product.id === item.productId) })).filter(item => item.product?.isStockable && getPOSStock(item.product.id, roomService.id).available > 0).slice(0, 8) : [];
    const occupiedTask = route.find(task => db.pmsRooms.find(room => room.id === task.roomId)?.status === 'occupied');
    const occupiedRoom = db.pmsRooms.find(item => item.id === occupiedTask?.roomId);
    const reservation = db.pmsReservations.find(item => item.roomId === occupiedRoom?.id && item.status === 'checked_in');
    const folio = db.pmsFolios.find(item => item.reservationId === reservation?.id && item.status === 'open');
    const minibarSelection = minibarProducts.find(item => item.product?.id === minibarProductId) || minibarProducts[0];
    const postMinibar = () => {
      if (!roomService || !occupiedRoom || !folio || !minibarSelection?.product) throw new Error('Aucune chambre occupée avec folio actif');
      const result = state.processSale({ externalSaleId: `MINIBAR-${occupiedRoom.roomNumber}-${Date.now()}`, siteId: roomService.siteId, posId: roomService.id, items: [{ productId: minibarSelection.product.id, quantity: 1 }], paymentContext: { type: 'room_charge', roomNumber: occupiedRoom.roomNumber, folioId: folio.id, amount: minibarSelection.pricing.salePrice } });
      if (!result.success) throw new Error(result.error || 'Imputation minibar impossible');
      if (occupiedTask) state.updatePMSHousekeepingDetails(occupiedTask.id, { minibarStatus: 'checked' }, employee.name);
    };
    return <section className="staff-game-changer staff-housekeeping-intelligence"><header><Route size={22} /><div><span>TOURNÉE OPTIMISÉE</span><h2>Priorité arrivée, étage et contrôle</h2></div><b>{route.length} chambre(s)</b></header><div className="staff-housekeeping-route"><ol>{route.slice(0, 5).map((task, index) => { const room = db.pmsRooms.find(item => item.id === task.roomId); return <li className={task.priority} key={task.id}><i>{index + 1}</i><span><strong>Chambre {room?.roomNumber}</strong><small>{room?.floor} · {task.priority === 'urgent' ? 'Arrivée prioritaire' : ORDER_STATUS[task.status]}</small></span><b>{(housekeepingChecks[task.id] || []).length}/4</b></li>; })}</ol><aside><small>Minibar connecté au folio et au stock</small><strong>{occupiedRoom ? `Chambre ${occupiedRoom.roomNumber}` : 'Aucune chambre occupée dans la tournée'}</strong><select value={minibarSelection?.product?.id || ''} onChange={event => setMinibarProductId(event.target.value)}>{minibarProducts.map(item => <option key={item.product!.id} value={item.product!.id}>{item.product!.name} · {formatFCFA(item.pricing.salePrice)}</option>)}</select><button disabled={!folio || !minibarSelection} onClick={() => execute(postMinibar, `${minibarSelection?.product?.name || 'Produit'} imputé au folio et déduit du dépôt Room Service.`)}><ScanBarcode size={16} /> Scanner une consommation</button></aside></div></section>;
  };

  const renderStorekeeperGameChanger = () => {
    const warehouseId = activeShift?.assignmentId || employee.warehouseId || db.warehouses[0]?.id;
    const sourceRows = db.stocks.filter(item => item.warehouseId === warehouseId);
    const expiringBatches = db.batches.filter(item => item.warehouseId === warehouseId && item.quantity > 0).sort((a, b) => (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999')).slice(0, 4);
    const transferSuggestions = db.stocks
      .filter(destination => destination.warehouseId !== warehouseId && destination.quantityAvailable - destination.quantityReserved <= destination.alertThreshold)
      .map(destination => {
        const source = sourceRows.find(item => item.productId === destination.productId);
        const product = db.products.find(item => item.id === destination.productId);
        const available = source ? source.quantityAvailable - source.quantityReserved : 0;
        const quantity = Math.max(0, Math.min(Math.floor(available - (source?.alertThreshold || 0)), Math.ceil(destination.alertThreshold * 2 - (destination.quantityAvailable - destination.quantityReserved))));
        return { destination, source, product, quantity };
      })
      .filter(item => item.product && item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
    return <section className="staff-game-changer staff-stock-intelligence"><header><TrendingUp size={22} /><div><span>STOCK PRÉDICTIF</span><h2>Agir avant la rupture</h2></div><b>{transferSuggestions.length} transfert(s) conseillé(s)</b></header><div className="staff-stock-intelligence-grid"><article><small>Sortie FEFO recommandée</small>{expiringBatches.map((batch, index) => <button key={batch.id} onClick={() => { setScanQuery(db.products.find(item => item.id === batch.productId)?.sku || batch.productId); setStockWorkspace('scan'); }}><i>{index + 1}</i><span><strong>{db.products.find(item => item.id === batch.productId)?.name}</strong><small>{batch.batchNumber} · {batch.expiryDate ? `expire le ${batch.expiryDate}` : 'sans péremption'}</small></span><b>{batch.quantity}</b></button>)}</article><article><small>Rééquilibrage entre dépôts</small>{transferSuggestions.map(item => <button key={`${item.destination.warehouseId}-${item.product!.id}`} onClick={() => { setTransferDestinationId(item.destination.warehouseId); setTransferProductId(item.product!.id); setTransferQuantity(String(item.quantity)); setStockWorkspace('transfers'); }}><span><strong>{item.product!.name}</strong><small>Vers {db.warehouses.find(warehouse => warehouse.id === item.destination.warehouseId)?.name}</small></span><b>{item.quantity} à envoyer</b></button>)}</article><aside><small>Capture et comptage terrain</small><label className="staff-document-capture"><ScanBarcode size={18} /><span><strong>{stockDocumentLabel || 'Photographier un bon fournisseur'}</strong><small>{stockDocumentLabel ? 'Document prêt à rapprocher avec la réception' : 'Caméra arrière ou fichier image'}</small></span><input type="file" accept="image/*" capture="environment" onChange={event => setStockDocumentLabel(event.target.files?.[0]?.name || '')} /></label><button onClick={() => { setStockWorkspace('inventory'); startVoiceInventoryCount(); }}><MessageCircle size={17} /> Dicter un comptage</button></aside></div></section>;
  };

  const renderPickerGameChanger = () => {
    const zoneRank: Record<string, number> = { 'Point E / Fann': 1, 'Mermoz / Sacré-Coeur': 2, 'Ouakam / Almadies': 3 };
    const orders = db.deliveryOrders.filter(item => ['confirmed', 'reserved', 'preparing'].includes(item.status)).sort((a, b) => (zoneRank[a.zone || ''] || 9) - (zoneRank[b.zone || ''] || 9) || a.createdAt.localeCompare(b.createdAt));
    const order = orders.find(item => item.status === 'preparing') || orders[0];
    const lineKeys = order?.items.map(item => `${order.id}-${item.productId}`) || [];
    const checked = lineKeys.filter(key => pickedLineIds.has(key)).length;
    const aisleFor = (productId: string) => {
      const category = db.products.find(item => item.id === productId)?.category || '';
      if (/frais|boulangerie/i.test(category)) return 'Zone fraîche';
      if (/boisson/i.test(category)) return 'Allée boissons';
      return 'Allée épicerie';
    };
    return <section className="staff-game-changer staff-picker-intelligence"><header><Route size={22} /><div><span>PICKING SANS ERREUR</span><h2>Parcours, scan et substitution client</h2></div><b>{order ? `${checked}/${lineKeys.length} scanné(s)` : 'Aucune commande'}</b></header>{order ? <div className="staff-picker-route"><article><small>Ordre de prélèvement · {order.id}</small>{order.items.slice().sort((a, b) => aisleFor(a.productId).localeCompare(aisleFor(b.productId))).map((line, index) => { const key = `${order.id}-${line.productId}`; const product = db.products.find(item => item.id === line.productId); const replacement = db.products.find(item => item.id === line.substitutionProductId); return <button className={pickedLineIds.has(key) ? 'checked' : ''} key={key} onClick={() => toggleProgress(setPickedLineIds, key)}><i>{pickedLineIds.has(key) ? <Check size={14} /> : index + 1}</i><span><strong>{line.quantity}× {product?.name}</strong><small>{aisleFor(line.productId)}{replacement ? ` · remplacement ${replacement.name}` : ''}</small></span><ScanBarcode size={18} /></button>; })}</article><aside><small>Décision de substitution</small>{order.items.filter(item => item.substitutionProductId).map(line => { const original = db.products.find(item => item.id === line.productId); const replacement = db.products.find(item => item.id === line.substitutionProductId); const substitutionMessage = `Bonjour ${order.customerName}, pouvons-nous remplacer ${original?.name} par ${replacement?.name} dans la commande ${order.id} ?`; const whatsappUrl = `https://wa.me/${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(substitutionMessage)}`; return <div key={line.productId}><strong>{original?.name}</strong><p>{replacement?.name} disponible comme alternative.</p><a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Demander sur WhatsApp</a><button onClick={() => execute(() => state.requestEmployeeApproval({ type: 'substitution', referenceId: order.id, requestedBy: employee.id, requestedByName: employee.name, label: `Substitution ${original?.name}`, reason: `Alternative proposée : ${replacement?.name}` }), 'Substitution transmise au manager avec le contexte produit.')}><ShieldCheck size={15} /> Faire valider</button></div>; })}<button className="staff-primary-action" disabled={order.status === 'preparing' && checked !== lineKeys.length} onClick={() => runDeliveryStep(order.id, order.status === 'confirmed' ? 'reserve' : order.status === 'reserved' ? 'prepare' : 'ready')}>{order.status === 'confirmed' ? 'Réserver le stock' : order.status === 'reserved' ? 'Démarrer le picking' : 'Contrôler et fermer le panier'}</button></aside></div> : <div className="staff-list-empty"><CheckCircle2 size={28} /><strong>Aucun panier à préparer</strong></div>}</section>;
  };

  const renderDriverGameChanger = () => {
    const zoneRank: Record<string, number> = { 'Point E / Fann': 1, 'Mermoz / Sacré-Coeur': 2, 'Ouakam / Almadies': 3 };
    const routes = db.deliveryOrders.filter(item => ['ready', 'out_for_delivery', 'failed'].includes(item.status)).sort((a, b) => (zoneRank[a.zone || ''] || 9) - (zoneRank[b.zone || ''] || 9));
    const next = routes.find(item => item.status === 'out_for_delivery') || routes.find(item => item.status === 'ready') || routes[0];
    const amountToCollect = routes.filter(item => item.paymentStatus !== 'paid').reduce((sum, item) => sum + item.items.reduce((lineSum, line) => lineSum + line.quantity * line.salePrice, 0) + item.deliveryFee, 0);
    const mapsUrl = next ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${next.address} ${next.landmark || ''}`)}` : '#';
    return <section className="staff-game-changer staff-driver-intelligence"><header><MapPinned size={22} /><div><span>TOURNÉE ASSISTÉE</span><h2>Le prochain arrêt est déjà prêt</h2></div><b className={navigator.onLine ? 'good' : 'warning'}>{navigator.onLine ? 'Carte en ligne' : 'Données hors ligne'}</b></header>{next ? <div className="staff-driver-route"><article><small>Prochain arrêt · {next.id}</small><strong>{next.customerName}</strong><p>{next.address} · {next.landmark}</p><div><span>{ORDER_STATUS[next.status]}</span><span>{next.paymentStatus === 'paid' ? 'Déjà payé' : `${formatFCFA(next.items.reduce((sum, line) => sum + line.quantity * line.salePrice, 0) + next.deliveryFee)} à encaisser`}</span></div><footer><a href={mapsUrl} target="_blank" rel="noreferrer"><Navigation size={17} /> Ouvrir l’itinéraire</a><a href={`tel:${next.phone}`}><Phone size={17} /> Appeler</a>{next.status === 'ready' && <button onClick={() => runDeliveryStep(next.id, 'dispatch')}><Truck size={17} /> Prendre la course</button>}</footer></article><ol>{routes.slice(0, 4).map((order, index) => <li key={order.id}><i>{index + 1}</i><span><strong>{order.zone || order.address}</strong><small>{order.customerName} · {ORDER_STATUS[order.status]}</small></span></li>)}</ol><aside><small>Réconciliation tournée</small><strong>{formatFCFA(amountToCollect)}</strong><p>À encaisser sur {routes.filter(item => item.paymentStatus !== 'paid').length} livraison(s).</p><span><WifiOff size={15} /> Codes, adresses et preuves conservés pour réseau faible.</span></aside></div> : <div className="staff-list-empty"><CheckCircle2 size={28} /><strong>Aucune tournée en attente</strong></div>}</section>;
  };

  const renderCustomerExperienceGameChanger = () => {
    const customerRisks = db.sartalCustomers.map(customer => {
      const overdue = db.sartalServiceRequests.filter(item => item.customerId === customer.id && customerContextAllowed(item.context) && !['completed', 'cancelled'].includes(item.status) && new Date(item.promisedAt).getTime() < Date.now()).length;
      const feedback = db.sartalCustomerFeedback.filter(item => item.customerId === customer.id && customerContextAllowed(item.context) && item.recoveryStatus === 'open').length;
      const deliveryIncidents = enabledModules.includes('delivery') ? db.deliveryOrders.filter(item => item.customerId === customer.id && item.status === 'failed').length : 0;
      return { customer, score: Math.min(100, overdue * 35 + feedback * 30 + deliveryIncidents * 25 + (customer.loyaltyTier === 'signature' ? 10 : 0)) };
    }).sort((a, b) => b.score - a.score);
    const focus = customerRisks.find(item => item.customer.id === customerFocusId) || customerRisks[0];
    const customer = focus?.customer;
    const guest = enabledModules.includes('pms') ? db.pmsGuests.find(item => item.phone === customer?.phone || item.fullName === customer?.fullName) : undefined;
    const reservationIds = enabledModules.includes('pms') ? db.pmsReservations.filter(item => item.guestId === guest?.id).map(item => item.id) : [];
    const timeline: Array<{ id: string; date: string; title: string; detail: string; tone: string }> = [];
    if (customer) {
      if (enabledModules.includes('restaurant')) db.restaurantGuestOrders.filter(item => item.customerId === customer.id).forEach(item => timeline.push({ id: item.id, date: item.updatedAt, title: `Restaurant · ${item.tableNumber || item.id}`, detail: `${formatFCFA(item.total)} · ${ORDER_STATUS[item.status]}`, tone: 'restaurant' }));
      if (enabledModules.includes('delivery')) db.deliveryOrders.filter(item => item.customerId === customer.id || item.phone === customer.phone).forEach(item => timeline.push({ id: item.id, date: item.updatedAt, title: `Livraison · ${item.id}`, detail: `${item.zone || item.address} · ${ORDER_STATUS[item.status]}`, tone: 'delivery' }));
      if (enabledModules.includes('pms')) db.pmsFolios.filter(item => reservationIds.includes(item.reservationId || '')).forEach(item => timeline.push({ id: item.id, date: item.departureDate, title: `Hôtel · ${item.reservationNumber}`, detail: `${item.guestName} · folio ${item.status}`, tone: 'hotel' }));
      db.sartalCustomerFeedback.filter(item => item.customerId === customer.id && customerContextAllowed(item.context)).forEach(item => timeline.push({ id: item.id, date: item.submittedAt, title: `Avis ${item.score}/5`, detail: item.note || 'Sans commentaire', tone: item.score <= 3 ? 'alert' : 'success' }));
    }
    timeline.sort((a, b) => b.date.localeCompare(a.date));
    const openFeedback = customer && db.sartalCustomerFeedback.find(item => item.customerId === customer.id && customerContextAllowed(item.context) && item.recoveryStatus === 'open');
    const playbook = openFeedback && db.sartalRecoveryPlaybooks.find(item => item.active && (item.context === 'all' || item.context === openFeedback.context) && openFeedback.score <= item.maxScore);
    return <section className="staff-game-changer staff-cx-intelligence"><header><UserRoundSearch size={22} /><div><span>CLIENT 360°</span><h2>Voir le risque avant la réclamation</h2></div><b className={focus && focus.score >= 50 ? 'danger' : 'good'}>{focus?.score || 0}% de vigilance</b></header>{customer && <div className="staff-cx-360"><aside><small>Clients à suivre</small>{customerRisks.slice(0, 5).map(item => <button className={item.customer.id === customer.id ? 'active' : ''} key={item.customer.id} onClick={() => setCustomerFocusId(item.customer.id)}><span><strong>{item.customer.fullName}</strong><small>{item.customer.loyaltyTier} · {item.customer.visits} visite(s)</small></span><b>{item.score}%</b></button>)}</aside><article><header><span><strong>{customer.fullName}</strong><small>{customer.preferredChannel || 'canal à confirmer'} · {customer.preferredLanguage}</small></span><a href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Contacter</a></header><p>{customer.preferences || 'Aucune préférence'}{customer.allergies ? ` · Allergie ${customer.allergies}` : ''}</p><div className="staff-customer-timeline">{timeline.slice(0, 6).map(item => <div className={item.tone} key={item.id}><i /><span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{new Date(item.date).toLocaleDateString('fr-FR')}</time></div>)}</div></article><section><small>Protocole recommandé</small>{openFeedback && playbook ? <><strong>{playbook.name}</strong><p>{playbook.solution}</p><span>{playbook.compensationPoints} point(s) · {playbook.managerApproval ? 'validation manager' : 'application immédiate'}</span><button onClick={() => execute(() => state.applySartalRecoveryPlaybook(openFeedback.id, playbook.id), `${playbook.name} appliqué et dossier client mis à jour.`)}><HeartHandshake size={16} /> Appliquer le protocole</button></> : <><CheckCircle2 size={26} /><strong>Aucune reprise urgente</strong><p>Le parcours reste surveillé automatiquement.</p></>}</section></div>}</section>;
  };

  const renderManagerGameChanger = () => {
    const bottlenecks = [
      { id: 'kitchen', label: 'Tickets cuisine en retard', count: db.restaurantGuestOrders.filter(item => ['confirmed', 'preparing'].includes(item.status) && elapsedMinutes(item.createdAt) > item.estimatedMinutes).length, owner: 'Cuisine' },
      { id: 'rooms', label: 'Chambres à nettoyer', count: db.pmsRooms.filter(item => item.housekeepingStatus === 'dirty').length, owner: 'Étages' },
      { id: 'stock', label: 'Ruptures critiques', count: db.stocks.filter(item => item.quantityAvailable - item.quantityReserved <= 0).length, owner: 'Stock' },
      { id: 'delivery', label: 'Livraisons en incident', count: db.deliveryOrders.filter(item => item.status === 'failed').length, owner: 'Livraison' },
      { id: 'approvals', label: 'Validations sensibles', count: db.employeeApprovals.filter(item => item.status === 'pending').length, owner: 'Manager' }
    ].sort((a, b) => b.count - a.count);
    const totalPressure = bottlenecks.reduce((sum, item) => sum + item.count, 0);
    const activeRoles = new Set(db.employeeShifts.filter(item => item.status === 'open').map(shift => db.employeeProfiles.find(profile => profile.id === shift.employeeId)?.role));
    const staffing = [
      { role: 'kitchen' as EmployeeRole, need: bottlenecks.find(item => item.id === 'kitchen')!.count },
      { role: 'housekeeper' as EmployeeRole, need: bottlenecks.find(item => item.id === 'rooms')!.count },
      { role: 'driver' as EmployeeRole, need: db.deliveryOrders.filter(item => item.status === 'ready').length }
    ].filter(item => item.need > 0 && !activeRoles.has(item.role));
    return <section className="staff-game-changer staff-manager-intelligence"><header><CircleGauge size={22} /><div><span>TOUR DE CONTRÔLE</span><h2>Les goulets d’étranglement, maintenant</h2></div><b className={totalPressure > 5 ? 'danger' : totalPressure ? 'warning' : 'good'}>{totalPressure} point(s) de pression</b></header><div className="staff-manager-command"><article>{bottlenecks.map((item, index) => <div className={item.count ? 'alert' : 'good'} key={item.id}><i>{index + 1}</i><span><strong>{item.label}</strong><small>Responsable · {item.owner}</small></span><b>{item.count}</b></div>)}</article><section><small>Recommandation d’affectation</small>{staffing.length ? staffing.map(item => <p key={item.role}><AlertCircle size={15} /> Ouvrir ou réaffecter un poste {ROLE_CONFIG[item.role].team} pour absorber {item.need} priorité(s).</p>) : <p><CheckCircle2 size={15} /> Les postes critiques disposent d’une présence active.</p>}<button onClick={() => execute(() => state.sendEmployeeMessage({ siteId: employee.siteId, senderId: employee.id, senderName: `${employee.name} · Manager`, audience: 'all', content: `Point service : ${bottlenecks.filter(item => item.count).map(item => `${item.label} (${item.count})`).join(', ') || 'aucun blocage critique'}. Merci de confirmer la prise en charge.`, priority: totalPressure > 5 ? 'urgent' : 'normal' }), 'Brief opérationnel envoyé à toutes les équipes.')}><Send size={16} /> Diffuser le point service</button></section><aside><small>Prévision des 30 prochaines minutes</small><strong>{totalPressure > 8 ? 'Saturation probable' : totalPressure > 3 ? 'Tension maîtrisable' : 'Flux normal'}</strong><p>{totalPressure > 8 ? 'Réaffecter une personne et geler les validations non urgentes.' : totalPressure > 3 ? 'Traiter cuisine, chambres et livraisons dans cet ordre.' : 'Maintenir les affectations et surveiller les promesses client.'}</p><button onClick={() => setTab('tasks')}><ArrowRight size={16} /> Ouvrir les priorités</button></aside></div></section>;
  };

  const renderManagerPeopleCare = () => {
    const team = db.employeeProfiles.filter(item => item.active && item.siteId === employee.siteId && item.id !== employee.id);
    const teamCheckIns = team.map(profile => ({
      profile,
      checkIn: db.employeeWellbeingCheckIns.filter(item => item.employeeId === profile.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    }));
    const checkedIn = teamCheckIns.filter(item => item.checkIn);
    const averageEnergy = checkedIn.length ? (checkedIn.reduce((sum, item) => sum + (item.checkIn?.energy || 0), 0) / checkedIn.length).toFixed(1) : '—';
    const overloaded = checkedIn.filter(item => item.checkIn?.workload === 'overloaded').length;
    const openSupport = db.employeeSupportRequests.filter(item => item.siteId === employee.siteId && item.status !== 'resolved');
    const scheduleRequests = db.employeeSchedules.filter(item => item.siteId === employee.siteId && ['swap_colleague_accepted', 'leave_requested'].includes(item.status));
    const recognitionTarget = recognitionTargetId || team[0]?.id || '';
    return <section className="staff-people-care">
      <header><HeartHandshake size={22} /><div><span>QUALITÉ DU SERVICE ET DU TRAVAIL</span><h2>Aider l’équipe avant que la pression ne déborde</h2><p>Les ressentis personnels restent privés. Seuls les signaux nécessaires à l’organisation sont présentés ici.</p></div></header>
      <div className="staff-care-metrics"><article><small>Énergie moyenne</small><strong>{averageEnergy}<i>/5</i></strong><span>{checkedIn.length} prise(s) de service</span></article><article className={overloaded ? 'alert' : ''}><small>Charge trop forte</small><strong>{overloaded}</strong><span>poste(s) à rééquilibrer</span></article><article className={openSupport.length ? 'alert' : ''}><small>Demandes d’aide</small><strong>{openSupport.length}</strong><span>à prendre en charge</span></article><article><small>Pauses en cours</small><strong>{db.employeeBreaks.filter(item => item.status === 'started').length}</strong><span>indisponibilité temporaire</span></article></div>
      <div className="staff-care-columns">
        <section><header><UsersRound size={18} /><span><strong>Demandes de l’équipe</strong><small>Sans exposer le contenu confidentiel</small></span></header><div className="staff-care-list">{openSupport.map(request => { const author = team.find(item => item.id === request.employeeId); return <article className={request.confidential ? 'confidential' : ''} key={request.id}><div><b>{request.type === 'reinforcement' ? 'Renfort' : request.type === 'transport' ? 'Transport' : 'Confidentiel'}</b><strong>{author?.name || 'Collaborateur'}</strong><p>{request.confidential ? 'Contenu réservé au référent habilité.' : request.note}</p><small>{formatTime(request.createdAt)} · {request.status === 'open' ? 'À prendre en compte' : 'Pris en compte'}</small></div><div>{request.status === 'open' && <button onClick={() => execute(() => state.updateEmployeeSupportRequest(request.id, 'acknowledged', employee.id), request.confidential ? 'Demande transmise au référent habilité.' : 'La demande est maintenant prise en compte.')}>{request.confidential ? 'Transmettre' : 'Prendre en compte'}</button>}{request.status === 'acknowledged' && !request.confidential && <button onClick={() => execute(() => state.updateEmployeeSupportRequest(request.id, 'resolved', employee.id), 'Demande clôturée avec traçabilité.')}>Résoudre</button>}</div></article>; })}{openSupport.length === 0 && <div className="staff-list-empty"><CheckCircle2 size={24} /><strong>Aucune demande en attente</strong></div>}</div></section>
        <section><header><CalendarCheck size={18} /><span><strong>Ajustements de planning</strong><small>Décision visible par le collaborateur</small></span></header><div className="staff-care-list">{scheduleRequests.map(schedule => { const author = team.find(item => item.id === schedule.employeeId); const colleague = team.find(item => item.id === schedule.requestedColleagueId); return <article key={schedule.id}><div><b>{schedule.status === 'swap_colleague_accepted' ? 'Échange' : 'Absence'}</b><strong>{author?.name} · {new Date(`${schedule.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</strong><p>{schedule.status === 'swap_colleague_accepted' ? `Accord de ${colleague?.name || 'un collègue'} reçu · contrôle manager` : schedule.requestNote}</p><small>{schedule.startTime}–{schedule.endTime} · {schedule.assignmentLabel}</small></div><div><button onClick={() => execute(() => state.reviewEmployeeScheduleChange(schedule.id, employee.id, false), 'Demande refusée avec retour au collaborateur.')}>Refuser</button><button className="primary" onClick={() => execute(() => state.reviewEmployeeScheduleChange(schedule.id, employee.id, true), 'Changement de planning validé.')}>Valider</button></div></article>; })}{scheduleRequests.length === 0 && <div className="staff-list-empty"><CheckCircle2 size={24} /><strong>Planning sans demande</strong></div>}</div></section>
        <aside className="staff-recognition-compose"><Sparkles size={21} /><h3>Faire vivre la reconnaissance</h3><p>Remercier un geste concret, sans classement ni compétition.</p><label>Collaborateur<select value={recognitionTarget} onChange={event => setRecognitionTargetId(event.target.value)}>{team.map(profile => <option key={profile.id} value={profile.id}>{profile.name} · {ROLE_CONFIG[profile.role].team}</option>)}</select></label><label>Message<textarea value={recognitionMessage} onChange={event => setRecognitionMessage(event.target.value)} placeholder="Ex. Merci pour la passation claire et l’aide apportée à l’équipe." /></label><button disabled={!recognitionTarget || !recognitionMessage.trim()} onClick={() => execute(() => { state.addEmployeeRecognition(recognitionTarget, employee.id, recognitionMessage); setRecognitionMessage(''); }, 'Remerciement envoyé dans l’espace personnel du collaborateur.')}><HeartHandshake size={16} /> Envoyer le remerciement</button></aside>
      </div>
    </section>;
  };

  const renderRoleGameChanger = () => {
    switch (employee.role) {
      case 'waiter': return renderWaiterGameChanger();
      case 'cashier': return renderCashierGameChanger();
      case 'kitchen': return renderKitchenGameChanger();
      case 'receptionist': return renderReceptionGameChanger();
      case 'housekeeper': return renderHousekeeperGameChanger();
      case 'storekeeper': return renderStorekeeperGameChanger();
      case 'picker': return renderPickerGameChanger();
      case 'driver': return renderDriverGameChanger();
      case 'customer_experience': return renderCustomerExperienceGameChanger();
      case 'service_manager': return renderManagerGameChanger();
    }
  };

  const renderRoleAction = () => {
    let workspace: React.ReactNode = null;
    switch (employee.role) {
      case 'waiter': workspace = renderWaiterAction(); break;
      case 'cashier': workspace = renderCashierAction(); break;
      case 'kitchen': workspace = renderKitchenAction(); break;
      case 'receptionist': workspace = renderReceptionAction(); break;
      case 'housekeeper': workspace = renderHousekeeperAction(); break;
      case 'storekeeper': workspace = renderStorekeeperAction(); break;
      case 'picker': workspace = renderPickerAction(); break;
      case 'driver': workspace = renderDriverAction(); break;
      case 'customer_experience': workspace = renderCustomerExperienceAction(); break;
      case 'service_manager': workspace = renderManagerAction(); break;
    }
    return <div className="staff-role-workspace">{renderRoleGameChanger()}{employee.role === 'service_manager' && renderManagerPeopleCare()}{workspace}</div>;
  };

  const renderMessages = () => (
    <section className="staff-messages-layout"><div className="staff-message-thread"><header><MessageCircle size={20} /><div><h2>Messages d’équipe</h2><p>Consignes opérationnelles liées au service.</p></div><b>{unreadMessages} non lu(s)</b></header>{visibleMessages.map(message => <button className={`${message.priority} ${message.readByEmployeeIds.includes(employee.id) ? 'read' : 'unread'}`} key={message.id} onClick={() => execute(() => state.markEmployeeMessageRead(message.id, employee.id), 'Message marqué comme lu.')}><span>{message.senderName.split(' ').slice(0, 2).map(part => part[0]).join('')}</span><div><strong>{message.senderName}</strong><p>{message.content}</p><small>{message.audience === 'all' ? 'Toute l’équipe' : ROLE_CONFIG[message.audience].team} · {formatTime(message.sentAt)}</small></div>{message.priority === 'urgent' && <b>URGENT</b>}</button>)}</div><aside className="staff-message-compose"><header><Send size={19} /><div><strong>Nouvelle consigne</strong><small>Elle sera conservée dans le service.</small></div></header><label>Destinataires<select value={messageAudience} onChange={event => setMessageAudience(event.target.value as EmployeeRole | 'all')}><option value="service_manager">Manager de service</option><option value="all">Toute l’équipe</option>{Object.entries(ROLE_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.team}</option>)}</select></label><label>Message<textarea value={messageText} onChange={event => setMessageText(event.target.value)} placeholder="Décrivez le fait, l’action attendue et le délai." /></label><button onClick={() => execute(() => { state.sendEmployeeMessage({ siteId: employee.siteId, senderId: employee.id, senderName: `${employee.name} · ${roleConfig.team}`, audience: messageAudience, content: messageText, priority: messageText.toLowerCase().includes('urgent') ? 'urgent' : 'normal' }); setMessageText(''); }, 'Consigne envoyée à l’équipe.')} disabled={!messageText.trim()}><Send size={17} /> Envoyer</button></aside></section>
  );

  const renderMore = () => {
    const completedLearning = employeeLearning.filter(item => item.completedByEmployeeIds.includes(employee.id)).length;
    const currentServiceMinutes = activeShift ? Math.max(0, Math.round((Date.now() - new Date(activeShift.startedAt).getTime()) / 60000)) : 0;
    const completedBreakMinutes = db.employeeBreaks.filter(item => item.employeeId === employee.id && item.shiftId === activeShift?.id && item.startedAt && item.endedAt).reduce((total, item) => total + Math.max(0, Math.round((new Date(item.endedAt!).getTime() - new Date(item.startedAt!).getTime()) / 60000)), 0);
    const lifeNav: Array<{ id: EmployeeLifeSection; label: string; icon: LucideIcon }> = [
      { id: 'overview', label: 'Mon quotidien', icon: Home },
      { id: 'schedule', label: 'Mon planning', icon: CalendarCheck },
      { id: 'growth', label: 'Ma progression', icon: TrendingUp },
      { id: 'support', label: 'Aide et services', icon: HeartHandshake },
      { id: 'handover', label: 'Ma passation', icon: ClipboardCheck }
    ];

    return <section className="staff-life-shell">
      <header className="staff-life-heading"><div className="staff-avatar"><RoleIcon size={24} /></div><div><span>MON ESPACE</span><h1>{employee.name}</h1><p>{roleConfig.label} · un espace personnel, utile avant, pendant et après le service.</p></div>{!demoAutoStart && <button onClick={() => { setLoggedIn(false); setPin(''); }}><LogOut size={16} /> Verrouiller</button>}</header>
      <nav className="staff-life-nav">{lifeNav.map(item => { const Icon = item.icon; return <button className={lifeSection === item.id ? 'active' : ''} key={item.id} onClick={() => setLifeSection(item.id)}><Icon size={17} /><span>{item.label}</span></button>; })}</nav>

      {lifeSection === 'overview' && <div className="staff-life-grid">
        <section className="staff-personal-card staff-identity-card"><header><div className="staff-avatar"><RoleIcon size={22} /></div><span><small>{employee.employeeNumber}</small><strong>{employee.name}</strong><em>{activeShift?.assignmentLabel}</em></span></header><dl><div><dt>Poste</dt><dd>{roleConfig.team}</dd></div><div><dt>Service</dt><dd>{currentServiceMinutes} min</dd></div><div><dt>Appareil</dt><dd>{activeShift?.deviceLabel}</dd></div><div><dt>Statut</dt><dd className="online"><i /> En service</dd></div></dl></section>
        <section className="staff-personal-card staff-personal-pulse"><header><HeartHandshake size={20} /><span><strong>Mon rythme aujourd’hui</strong><small>Une information d’organisation, jamais une note de performance.</small></span></header><div className="staff-energy-scale">{([1, 2, 3, 4, 5] as const).map(level => <button className={energy === level ? 'active' : ''} key={level} onClick={() => setEnergy(level)}><b>{level}</b><small>{level === 1 ? 'Faible' : level === 3 ? 'Moyen' : level === 5 ? 'Haut' : ''}</small></button>)}</div><div className="staff-workload-choice">{(Object.entries(WORKLOAD_LABELS) as Array<[typeof workload, string]>).map(([value, label]) => <button className={workload === value ? 'active' : ''} key={value} onClick={() => setWorkload(value)}>{label}</button>)}</div><button className="staff-card-primary" onClick={saveWellbeing}>Mettre à jour mon rythme</button></section>
        <section className="staff-personal-card staff-recognition-wall"><header><Sparkles size={20} /><span><strong>Ce que l’on a apprécié</strong><small>Des gestes concrets, sans classement.</small></span></header><div>{employeeRecognitions.slice(0, 3).map(item => <article key={item.id}><p>“{item.message}”</p><small>{item.authorName} · {item.source === 'client' ? 'Client' : item.source === 'manager' ? 'Manager' : 'Collègue'} · {new Date(item.createdAt).toLocaleDateString('fr-FR')}</small></article>)}{employeeRecognitions.length === 0 && <div className="staff-list-empty"><HeartHandshake size={24} /><strong>Les remerciements apparaîtront ici</strong></div>}</div></section>
        <section className="staff-personal-card staff-preferences"><header><ShieldCheck size={20} /><span><strong>Mon confort d’utilisation</strong><small>Réglages propres à votre compte.</small></span></header><div className="staff-language-choice"><button className={preferences.language === 'fr' ? 'active' : ''} onClick={() => updatePreference({ language: 'fr' })}>Français</button><button className={preferences.language === 'wo' ? 'active' : ''} onClick={() => updatePreference({ language: 'wo' })}>Wolof</button></div><button className={preferences.highContrast ? 'active' : ''} onClick={() => updatePreference({ highContrast: !preferences.highContrast })}><span><strong>Contraste renforcé</strong><small>Lecture plus nette en forte luminosité</small></span><i /></button><button className={preferences.lowBandwidth ? 'active' : ''} onClick={() => updatePreference({ lowBandwidth: !preferences.lowBandwidth })}><span><strong>Réseau faible</strong><small>Priorité au texte et aux actions essentielles</small></span><i /></button><button className={preferences.quietNotifications ? 'active' : ''} onClick={() => updatePreference({ quietNotifications: !preferences.quietNotifications })}><span><strong>Notifications calmes</strong><small>Urgences visibles, interruptions limitées</small></span><i /></button><button className={preferences.voiceAssistance ? 'active' : ''} onClick={() => updatePreference({ voiceAssistance: !preferences.voiceAssistance })}><span><strong>Assistance vocale</strong><small>Dictée disponible dans les saisies longues</small></span><i /></button></section>
      </div>}

      {lifeSection === 'schedule' && <div className="staff-schedule-space">
        <section>
          <header className="staff-section-heading"><div><span>ANTICIPER</span><h2>Mon planning</h2><p>Un échange suit toujours trois étapes : proposition, accord du collègue, validation manager.</p></div><b>{employeeSchedules.length} service(s)</b></header>
          {incomingSwapRequests.length > 0 && <div className="staff-incoming-swaps"><header><UsersRound size={18} /><span><strong>Propositions reçues</strong><small>Votre réponse précède obligatoirement la décision du manager.</small></span></header>{incomingSwapRequests.map(request => { const requester = db.employeeProfiles.find(profile => profile.id === request.employeeId); const mySlot = db.employeeSchedules.find(item => item.id === request.requestedColleagueScheduleId); return <article key={request.id}><div><b>{requester?.name || 'Un collègue'}</b><strong>{new Date(request.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} · {request.startTime}–{request.endTime}</strong><p>Contre votre service du {mySlot ? new Date(mySlot.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }) + ' · ' + mySlot.startTime + '–' + mySlot.endTime : 'créneau sélectionné'}.</p></div><footer><button onClick={() => execute(() => state.respondEmployeeScheduleSwap(request.id, employee.id, false), 'Proposition refusée. Le collègue en est informé.')}>Refuser</button><button className="primary" onClick={() => execute(() => state.respondEmployeeScheduleSwap(request.id, employee.id, true), 'Votre accord est enregistré. Le manager doit maintenant valider l’échange.')}>Accepter puis transmettre</button></footer></article>; })}</div>}
          {swapScheduleOptions.length > 0 && <label className="staff-colleague-picker">Créneau du collègue proposé<select value={scheduleSwapTargetId} onChange={event => setScheduleSwapTargetId(event.target.value)}><option value="">Choisir un créneau précis</option>{swapScheduleOptions.map(option => { const profile = db.employeeProfiles.find(item => item.id === option.employeeId); return <option key={option.id} value={option.id}>{profile?.name} · {ROLE_CONFIG[profile?.role || 'waiter'].team} · {new Date(option.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} {option.startTime}–{option.endTime}</option>; })}</select><small>Le manager vérifiera aussi la compatibilité du poste avant sa validation finale.</small></label>}
          <div className="staff-schedule-list">{employeeSchedules.map(schedule => <article className={schedule.status} key={schedule.id}><time><b>{new Date(schedule.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' })}</b><strong>{new Date(schedule.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit' })}</strong><small>{new Date(schedule.date + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'short' })}</small></time><div><span>{engagedScheduleIds.has(schedule.id) ? 'Échange proposé par un collègue' : SCHEDULE_STATUS[schedule.status]}</span><h3>{schedule.startTime}–{schedule.endTime}</h3><p>{schedule.assignmentLabel}</p>{schedule.managerNote && <small>{schedule.managerNote}</small>}</div>{['planned', 'confirmed', 'change_rejected', 'swap_colleague_rejected'].includes(schedule.status) && !engagedScheduleIds.has(schedule.id) && <footer><button disabled={!scheduleSwapTargetId} onClick={() => execute(() => { const target = db.employeeSchedules.find(item => item.id === scheduleSwapTargetId); if (!target) throw new Error('Choisissez le créneau du collègue'); state.requestEmployeeScheduleChange(schedule.id, employee.id, 'swap', target.employeeId, 'Proposition d’échange entre collègues.', target.id); }, 'Proposition envoyée au collègue. Le manager n’interviendra qu’après son accord.')}>Proposer un échange</button><button onClick={() => execute(() => state.requestEmployeeScheduleChange(schedule.id, employee.id, 'leave', undefined, 'Demande personnelle à examiner.'), 'Demande d’absence envoyée au manager.')}>Demander une absence</button></footer>}</article>)}</div>
        </section>
        <aside className="staff-transport-card"><Route size={23} /><h3>Retour après service</h3><p>Anticipez un service tardif. La demande est suivie par le manager.</p><label>Heure souhaitée<input type="datetime-local" value={supportWhen} onChange={event => setSupportWhen(event.target.value)} /></label><label>Précision<textarea value={supportType === 'transport' ? supportNote : ''} onFocus={() => setSupportType('transport')} onChange={event => { setSupportType('transport'); setSupportNote(event.target.value); }} placeholder="Quartier, contrainte ou point de rendez-vous." /></label><button disabled={!supportWhen || supportType !== 'transport' || !supportNote.trim()} onClick={submitSupport}>Demander l’organisation du retour</button></aside>
      </div>}

      {lifeSection === 'growth' && <div className="staff-growth-space">
        <section className="staff-personal-card staff-growth-profile"><header><TrendingUp size={21} /><span><strong>Mon parcours</strong><small>Des compétences visibles et un prochain pas concret.</small></span></header><label>Mon objectif professionnel<textarea value={careerGoal} onChange={event => setCareerGoal(event.target.value)} placeholder="Ex. devenir chef de rang, maîtriser la réception..." /></label><button onClick={() => execute(() => state.updateEmployeeExperience(employee.id, { careerGoal }), 'Votre objectif professionnel est enregistré.')}>Enregistrer mon objectif</button><div className="staff-skill-list"><small>Compétences acquises</small>{(employee.skills || []).map(skill => <span key={skill}><Check size={13} /> {skill}</span>)}{!(employee.skills || []).length && <p>Terminez une capsule pour ajouter votre première compétence.</p>}</div></section>
        <section className="staff-learning-board"><header className="staff-section-heading"><div><span>CAPSULES COURTES</span><h2>Apprendre dans le rythme du service</h2><p>Des contenus de 2 à 4 minutes adaptés à votre poste.</p></div><b>{completedLearning}/{employeeLearning.length}</b></header><div>{employeeLearning.map(module => { const completed = module.completedByEmployeeIds.includes(employee.id); return <article className={completed ? 'completed' : ''} key={module.id}><span>{completed ? <CheckCircle2 size={22} /> : <Clock3 size={22} />}</span><div><small>{module.durationMinutes} min · {module.skill}</small><h3>{module.title}</h3><p>{module.description}</p></div><button disabled={completed} onClick={() => execute(() => state.completeEmployeeLearning(employee.id, module.id), 'Capsule terminée et compétence ajoutée à votre parcours.')}>{completed ? 'Terminée' : 'Valider la capsule'}</button></article>; })}</div></section>
      </div>}

      {lifeSection === 'support' && <div className="staff-support-space">
        <section className="staff-support-form"><header><HeartHandshake size={22} /><div><span>BESOIN D’UN COUP DE MAIN</span><h2>Demander de l’aide simplement</h2><p>Chaque demande reçoit un statut. Le contenu confidentiel reste hors du cockpit opérationnel.</p></div></header><div className="staff-support-types"><button className={supportType === 'reinforcement' ? 'active' : ''} onClick={() => setSupportType('reinforcement')}><UsersRound size={20} /><strong>Renfort</strong><small>Charge trop forte ou priorité simultanée</small></button><button className={supportType === 'transport' ? 'active' : ''} onClick={() => setSupportType('transport')}><Route size={20} /><strong>Transport</strong><small>Retour après un horaire tardif</small></button><button className={supportType === 'confidential' ? 'active' : ''} onClick={() => setSupportType('confidential')}><LockKeyhole size={20} /><strong>Confidentiel</strong><small>Transmission au référent habilité</small></button></div>{supportType === 'transport' && <label>Quand ?<input type="datetime-local" value={supportWhen} onChange={event => setSupportWhen(event.target.value)} /></label>}<label>{supportType === 'confidential' ? 'Votre demande au référent' : 'Ce dont vous avez besoin'}<textarea value={supportNote} onChange={event => setSupportNote(event.target.value)} placeholder={supportType === 'reinforcement' ? 'Ex. deux priorités simultanées, renfort souhaité pendant 20 minutes.' : supportType === 'transport' ? 'Quartier et contrainte horaire.' : 'Expliquez uniquement ce que vous souhaitez transmettre.'} /></label><button disabled={!supportNote.trim() || (supportType === 'transport' && !supportWhen)} onClick={submitSupport}><Send size={16} /> Envoyer la demande</button></section>
        <section className="staff-support-history"><header><Clock3 size={20} /><div><strong>Suivi de mes demandes</strong><small>Vous savez toujours où elles en sont.</small></div></header>{employeeSupportRequests.map(request => <article key={request.id}><span className={request.status}><i /> {request.status === 'open' ? 'Envoyée' : request.status === 'acknowledged' ? 'Prise en compte' : 'Résolue'}</span><h3>{request.label}</h3><p>{request.note}</p><small>{new Date(request.createdAt).toLocaleString('fr-FR')} {request.handledBy ? '· ' + request.handledBy : ''}</small></article>)}{employeeSupportRequests.length === 0 && <div className="staff-list-empty"><CheckCircle2 size={25} /><strong>Aucune demande en cours</strong></div>}</section>
      </div>}

      {lifeSection === 'handover' && <div className="staff-handover-space">
        <aside className="staff-service-recap"><CircleGauge size={24} /><span>MON SERVICE</span><h2>{currentServiceMinutes} min</h2><p>Temps écoulé depuis la prise de poste.</p><dl><div><dt>Pauses terminées</dt><dd>{completedBreakMinutes} min</dd></div><div><dt>Tâches encore visibles</dt><dd>{tasks.length}</dd></div><div><dt>Messages non lus</dt><dd>{unreadMessages}</dd></div></dl><small>Le bilan final sera conservé avec la passation.</small></aside>
        <div className="staff-handover-form"><header><ClipboardCheck size={21} /><div><h2>Terminer et passer le service</h2><p>L’équipe suivante devra confirmer la reprise.</p></div><button className="staff-voice-button" onClick={startVoiceHandover}><MessageCircle size={16} /> Dicter</button></header><label>Ce qui reste à faire<textarea value={handover.notes} onChange={event => setHandover(current => ({ ...current, notes: event.target.value }))} placeholder="Ex. Table T12 attend l’addition..." /></label><div><label>Incidents<textarea value={handover.incidents} onChange={event => setHandover(current => ({ ...current, incidents: event.target.value }))} placeholder="Matériel, retard, anomalie..." /></label><label>Montants à contrôler<textarea value={handover.amountsToCheck} onChange={event => setHandover(current => ({ ...current, amountsToCheck: event.target.value }))} placeholder="Écart caisse, paiement en attente..." /></label></div><label>Clients à suivre<textarea value={handover.customersToFollow} onChange={event => setHandover(current => ({ ...current, customersToFollow: event.target.value }))} placeholder="Nom, engagement et délai promis..." /></label><button className="staff-end-shift" disabled={!handover.notes.trim()} onClick={() => execute(() => { if (!activeShift) throw new Error('Aucun service ouvert'); state.closeEmployeeShift(activeShift.id, handover); setLoggedIn(demoAutoStart); setPin(''); setHandover({ notes: '', incidents: '', amountsToCheck: '', customersToFollow: '' }); }, 'Passation enregistrée et service terminé.')}><LogOut size={18} /> Enregistrer la passation et terminer</button></div>
      </div>}
    </section>;
  };

  if (!loggedIn) return <div className="employee-workspace">{renderLogin()}{notice && <div className="staff-toast">{notice}</div>}</div>;
  if (demoAutoStart && !activeShift) return <div className="employee-workspace"><section className="staff-demo-opening"><img src="./brand-mark.svg" alt="" /><strong>Préparation du poste {roleConfig.label}</strong><small>Chargement des tâches et de l’affectation…</small></section></div>;
  if (!activeShift) return <div className="employee-workspace">{renderShiftStart()}{notice && <div className="staff-toast">{notice}</div>}</div>;

  const tabs: Array<{ id: StaffTab; label: string; icon: LucideIcon }> = [
    { id: 'today', label: preferences.language === 'wo' ? 'Tey' : "Aujourd'hui", icon: Home },
    { id: 'tasks', label: preferences.language === 'wo' ? 'Sama liggéey' : 'Mes tâches', icon: ClipboardCheck },
    { id: 'action', label: roleConfig.actionLabel, icon: roleConfig.icon },
    { id: 'messages', label: preferences.language === 'wo' ? 'Ekip' : 'Équipe', icon: UsersRound },
    { id: 'more', label: preferences.language === 'wo' ? 'Man' : 'Moi', icon: UserRoundSearch }
  ];

  return <section className={`employee-workspace staff-app ${preferences.highContrast ? 'staff-high-contrast' : ''} ${preferences.lowBandwidth ? 'staff-low-bandwidth' : ''}`} style={{ '--staff-role': roleConfig.color, '--staff-brand': siteBrand?.primaryColor || db.sartalBrandSettings.primaryColor } as React.CSSProperties}>
    <header className="staff-app-header"><div className="staff-app-brand"><img src="./brand-mark.svg" alt="" /><span><strong>{db.sartalBrandSettings.staffAppName.toUpperCase()}</strong><small>{activeShift.assignmentLabel}</small></span></div><div className="staff-app-context"><span><i /> En service</span><strong>{roleConfig.team}</strong></div><button className="staff-header-profile" onClick={() => setTab('more')}><span>{employee.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{employee.name}</strong><small>{roleConfig.label}</small></div><ChevronRight size={16} /></button></header>
    <nav className="staff-desktop-nav">{tabs.map(item => { const Icon = item.icon; return <button className={`${tab === item.id ? 'active' : ''} ${item.id === 'action' ? 'central' : ''}`} key={item.id} onClick={() => setTab(item.id)}><Icon size={18} /><span>{item.label}</span>{item.id === 'messages' && unreadMessages > 0 && <b>{unreadMessages}</b>}</button>; })}</nav>
    <main className="staff-app-content">{tab === 'today' && renderToday()}{tab === 'tasks' && renderTasks()}{tab === 'action' && renderRoleAction()}{tab === 'messages' && renderMessages()}{tab === 'more' && renderMore()}</main>
    <nav className="staff-mobile-nav">{tabs.map(item => { const Icon = item.icon; return <button className={`${tab === item.id ? 'active' : ''} ${item.id === 'action' ? 'central' : ''}`} key={item.id} onClick={() => setTab(item.id)}><span><Icon size={item.id === 'action' ? 22 : 19} />{item.id === 'messages' && unreadMessages > 0 && <b>{unreadMessages}</b>}</span><small>{item.label}</small></button>; })}</nav>
    {notice && <div className="staff-toast">{notice}</div>}
  </section>;
};

export default EmployeeWorkspace;
