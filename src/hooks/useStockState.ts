import { useState, useEffect, useCallback } from 'react';
import { getDB, saveDB, DatabaseState } from '../db';
import * as stockEngine from '../services/stockEngine';
import { getDefaultEmployeePermissions, hasEmployeePermission, normalizeEmployeePermissions } from '../employeePermissions';
import {
  createEmptyPaymentTotals,
  DeliveryOrder,
  EmployeeApproval,
  EmployeeBreak,
  EmployeeExperiencePreferences,
  EmployeeHandover,
  EmployeeMessage,
  EmployeeProfile,
  EmployeeRecognition,
  EmployeeSchedule,
  EmployeeShift,
  EmployeeSupportRequest,
  EmployeeWellbeingCheckIn,
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
  RestaurantGuestOrder,
  RestaurantDiningTable,
  RestaurantWaitlistEntry,
  RestaurantTableReservation,
  SartalBrandSettings,
  SartalCustomer,
  SartalCustomerFeedback,
  SartalCustomerMessage,
  SartalDemoRun,
  SartalJourneyItem,
  SartalOfflineAction,
  SartalServiceRequest,
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

const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine;
const createRuntimeId = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const POS_EMPLOYEE_ROLES: EmployeeProfile['role'][] = ['waiter', 'cashier', 'kitchen'];
const WAREHOUSE_EMPLOYEE_ROLES: EmployeeProfile['role'][] = ['storekeeper', 'picker', 'driver'];

const canManageEmployeeSchedule = (database: DatabaseState, employee: EmployeeProfile, managerId?: string) => {
  const staffManager = managerId
    ? database.employeeProfiles.find(item => item.id === managerId && item.role === 'service_manager' && item.active)
    : undefined;
  if (staffManager?.siteId === employee.siteId) return true;
  if (['admin', 'director'].includes(database.currentUser.role)) return true;
  if (database.currentUser.role === 'pos_manager') {
    const managerPOS = database.posList.find(item => item.id === database.currentUser.posId);
    return Boolean(managerPOS && employee.posId === managerPOS.id && POS_EMPLOYEE_ROLES.includes(employee.role));
  }
  if (database.currentUser.role === 'stock_manager') return WAREHOUSE_EMPLOYEE_ROLES.includes(employee.role);
  return false;
};

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
    const currentDb = getDB();
    const user = currentDb.users.find(u => u.id === userId);
    if (user) {
      const newDb = { ...currentDb, currentUser: user };
      saveDB(newDb);
      setDb(newDb);
    }
  };

  const saveEmployeeProfile = (payload: Omit<EmployeeProfile, 'id'> & { id?: string }) => {
    const newDb = getDB();
    if (!['admin', 'director'].includes(newDb.currentUser.role)) {
      throw new Error('Seule la direction peut créer ou modifier un profil collaborateur');
    }
    const id = payload.id?.trim() || createRuntimeId('EMP');
    const existing = newDb.employeeProfiles.find(item => item.id === id);
    const employeeNumber = payload.employeeNumber.trim().toUpperCase();
    const name = payload.name.trim();
    const phone = payload.phone.trim();
    const phoneDigits = phone.replace(/\D/g, '');
    const site = newDb.sites.find(item => item.id === payload.siteId);
    if (!employeeNumber || !name || !phone || !site) throw new Error('Matricule, nom, téléphone et établissement sont obligatoires');
    if (phoneDigits.length < 9) throw new Error('Saisissez un numéro de téléphone complet');
    if (newDb.employeeProfiles.some(item => item.id !== id && item.employeeNumber.toLowerCase() === employeeNumber.toLowerCase())) {
      throw new Error('Ce matricule est déjà utilisé');
    }
    if (newDb.employeeProfiles.some(item => item.id !== id && item.phone.replace(/\D/g, '') === phoneDigits)) {
      throw new Error('Ce téléphone est déjà rattaché à un collaborateur');
    }

    const posRoles: EmployeeProfile['role'][] = ['waiter', 'cashier', 'kitchen'];
    const warehouseRoles: EmployeeProfile['role'][] = ['storekeeper', 'picker', 'driver'];
    const posId = posRoles.includes(payload.role) ? payload.posId : undefined;
    const warehouseId = warehouseRoles.includes(payload.role) ? payload.warehouseId : undefined;
    if (posRoles.includes(payload.role) && !newDb.posList.some(item => item.id === posId && item.siteId === payload.siteId)) {
      throw new Error('Choisissez un point de vente de cet établissement');
    }
    if (warehouseRoles.includes(payload.role) && !newDb.warehouses.some(item => item.id === warehouseId && item.siteId === payload.siteId)) {
      throw new Error('Choisissez un dépôt de cet établissement');
    }

    const openShift = existing && newDb.employeeShifts.find(item => item.employeeId === existing.id && item.status === 'open');
    const criticalAssignmentChanged = existing && (
      existing.role !== payload.role
      || existing.siteId !== payload.siteId
      || existing.posId !== posId
      || existing.warehouseId !== warehouseId
      || (existing.active && !payload.active)
    );
    if (openShift && criticalAssignmentChanged) throw new Error('Terminez le service ouvert avant de modifier le rôle, l’affectation ou le statut');

    const activeManagers = newDb.employeeProfiles.filter(item => item.role === 'service_manager' && item.active && item.id !== id);
    if (existing?.role === 'service_manager' && existing.active && (payload.role !== 'service_manager' || !payload.active) && activeManagers.length === 0) {
      throw new Error('Conservez au moins un manager de service actif');
    }

    const profile: EmployeeProfile = {
      id,
      employeeNumber,
      name,
      role: payload.role,
      siteId: payload.siteId,
      phone,
      posId,
      warehouseId,
      active: payload.active,
      permissions: normalizeEmployeePermissions(payload.permissions || (existing?.role === payload.role && existing?.permissions) || getDefaultEmployeePermissions(payload.role)),
      experiencePreferences: payload.experiencePreferences || existing?.experiencePreferences || { language: 'fr', highContrast: false, lowBandwidth: payload.role === 'driver', quietNotifications: true, voiceAssistance: false },
      skills: payload.skills || existing?.skills || [],
      careerGoal: payload.careerGoal || existing?.careerGoal || 'Renforcer mes compétences métier'
    };
    if (existing) Object.assign(existing, profile);
    else newDb.employeeProfiles.unshift(profile);
    saveDB(newDb);
    refresh();
    return id;
  };

  const deleteEmployeeProfile = (employeeId: string) => {
    const newDb = getDB();
    if (!['admin', 'director'].includes(newDb.currentUser.role)) {
      throw new Error('Seule la direction peut supprimer un profil collaborateur');
    }
    const employee = newDb.employeeProfiles.find(item => item.id === employeeId);
    if (!employee) throw new Error('Collaborateur introuvable');
    const hasHistory = newDb.employeeShifts.some(item => item.employeeId === employeeId)
      || newDb.employeeHandovers.some(item => item.employeeId === employeeId)
      || newDb.employeeMessages.some(item => item.senderId === employeeId)
      || newDb.employeeApprovals.some(item => item.requestedBy === employeeId)
      || newDb.employeeWellbeingCheckIns.some(item => item.employeeId === employeeId)
      || newDb.employeeSupportRequests.some(item => item.employeeId === employeeId)
      || newDb.employeeBreaks.some(item => item.employeeId === employeeId)
      || newDb.employeeRecognitions.some(item => item.employeeId === employeeId)
      || newDb.employeeSchedules.some(item => item.employeeId === employeeId && !['planned', 'confirmed'].includes(item.status))
      || newDb.employeeSchedules.some(item => item.requestedColleagueId === employeeId && ['swap_pending_colleague', 'swap_colleague_accepted'].includes(item.status))
      || newDb.cashSessions.some(item => item.userId === employeeId)
      || newDb.movements.some(item => item.userId === employeeId);
    if (hasHistory) throw new Error('Ce collaborateur possède un historique. Désactivez son accès pour conserver la traçabilité.');
    if (employee.role === 'service_manager' && employee.active && newDb.employeeProfiles.filter(item => item.role === 'service_manager' && item.active).length === 1) {
      throw new Error('Conservez au moins un manager de service actif');
    }
    newDb.employeeProfiles = newDb.employeeProfiles.filter(item => item.id !== employeeId);
    newDb.employeeSchedules = newDb.employeeSchedules.filter(item => item.employeeId !== employeeId);
    newDb.employeeLearningModules.forEach(module => {
      module.completedByEmployeeIds = module.completedByEmployeeIds.filter(id => id !== employeeId);
    });
    saveDB(newDb);
    refresh();
  };

  const updateEmployeeAssignment = (employeeId: string, assignmentId: string) => {
    const newDb = getDB();
    const employee = newDb.employeeProfiles.find(item => item.id === employeeId);
    if (!employee) throw new Error('Collaborateur introuvable');
    if (!['admin', 'director', 'stock_manager', 'pos_manager'].includes(newDb.currentUser.role)) {
      throw new Error('Votre rôle ne permet pas de modifier les affectations');
    }
    if (newDb.employeeShifts.some(item => item.employeeId === employeeId && item.status === 'open')) {
      throw new Error('Terminez le service ouvert avant de modifier cette affectation');
    }

    const posRoles: EmployeeProfile['role'][] = ['waiter', 'cashier', 'kitchen'];
    const warehouseRoles: EmployeeProfile['role'][] = ['storekeeper', 'picker', 'driver'];
    if (posRoles.includes(employee.role)) {
      const target = newDb.posList.find(item => item.id === assignmentId && item.siteId === employee.siteId);
      if (!target) throw new Error('Choisissez un point de vente de cet établissement');
      if (newDb.currentUser.role === 'stock_manager') throw new Error('Le responsable stock ne peut pas affecter les équipes restaurant');
      if (newDb.currentUser.role === 'pos_manager') {
        const managerPOS = newDb.posList.find(item => item.id === newDb.currentUser.posId);
        if (!managerPOS || employee.posId !== managerPOS.id || target.id !== managerPOS.id) throw new Error('Ce collaborateur ne relève pas de votre point de vente');
      }
      employee.posId = target.id;
      employee.warehouseId = undefined;
    } else if (warehouseRoles.includes(employee.role)) {
      const target = newDb.warehouses.find(item => item.id === assignmentId && item.siteId === employee.siteId);
      if (!target) throw new Error('Choisissez un dépôt de cet établissement');
      if (newDb.currentUser.role === 'pos_manager') throw new Error('Le manager restaurant ne peut pas affecter les équipes stock');
      employee.warehouseId = target.id;
      employee.posId = undefined;
    } else {
      throw new Error('Ce métier ne possède pas d’affectation POS ou dépôt');
    }
    saveDB(newDb);
    refresh();
  };

  const updateEmployeePermissions = (employeeId: string, permissions: EmployeeProfile['permissions']) => {
    const newDb = getDB();
    if (!['admin', 'director'].includes(newDb.currentUser.role)) {
      throw new Error('Seule la direction peut attribuer des droits individuels');
    }
    const employee = newDb.employeeProfiles.find(item => item.id === employeeId);
    if (!employee) throw new Error('Collaborateur introuvable');
    employee.permissions = normalizeEmployeePermissions(permissions || []);
    saveDB(newDb);
    refresh();
  };

  const startEmployeeShift = (employeeId: string, assignmentId?: string, deviceLabel = 'Terminal partagé') => {
    const newDb = getDB();
    const employee = newDb.employeeProfiles.find(item => item.id === employeeId && item.active);
    if (!employee) throw new Error('Profil employé introuvable ou inactif');
    if (newDb.employeeShifts.some(item => item.employeeId === employeeId && item.status === 'open')) {
      throw new Error('Un service est déjà ouvert pour cet employé');
    }
    const effectiveAssignmentId = assignmentId || employee.posId || employee.warehouseId;
    const assignmentLabel = newDb.posList.find(item => item.id === effectiveAssignmentId)?.name
      || newDb.warehouses.find(item => item.id === effectiveAssignmentId)?.name
      || (['receptionist', 'housekeeper'].includes(employee.role) ? 'Hôtel / PMS' : newDb.sites.find(item => item.id === employee.siteId)?.name)
      || 'Affectation générale';
    const shift: EmployeeShift = {
      id: `SHIFT-${Date.now().toString().slice(-7)}`,
      employeeId: employee.id,
      siteId: employee.siteId,
      role: employee.role,
      assignmentId: effectiveAssignmentId,
      assignmentLabel,
      deviceLabel,
      status: 'open',
      startedAt: new Date().toISOString()
    };
    newDb.employeeShifts.unshift(shift);
    saveDB(newDb);
    refresh();
    return shift.id;
  };

  const closeEmployeeShift = (
    shiftId: string,
    payload: Pick<EmployeeHandover, 'notes' | 'incidents' | 'amountsToCheck' | 'customersToFollow'>
  ) => {
    const newDb = getDB();
    const shift = newDb.employeeShifts.find(item => item.id === shiftId && item.status === 'open');
    const employee = shift && newDb.employeeProfiles.find(item => item.id === shift.employeeId);
    if (!shift || !employee) throw new Error('Service employé introuvable');
    if (!payload.notes.trim()) throw new Error('Indiquez au moins ce qui reste à faire');
    const now = new Date().toISOString();
    const activeBreak = newDb.employeeBreaks.find(item => item.shiftId === shift.id && item.status === 'started');
    if (activeBreak) {
      activeBreak.status = 'completed';
      activeBreak.endedAt = now;
    }
    const breakMinutes = newDb.employeeBreaks
      .filter(item => item.shiftId === shift.id && item.startedAt && item.endedAt)
      .reduce((total, item) => total + Math.max(0, Math.round((new Date(item.endedAt!).getTime() - new Date(item.startedAt!).getTime()) / 60000)), 0);
    const durationMinutes = Math.max(0, Math.round((new Date(now).getTime() - new Date(shift.startedAt).getTime()) / 60000));
    shift.status = 'closed';
    shift.endedAt = now;
    shift.durationMinutes = durationMinutes;
    shift.breakMinutes = breakMinutes;
    shift.serviceSummary = `${durationMinutes} min de service · ${breakMinutes} min de pause · passation enregistrée`;
    newDb.employeeHandovers.unshift({
      id: `HANDOVER-${Date.now().toString().slice(-7)}`,
      shiftId: shift.id,
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role,
      notes: payload.notes.trim(),
      incidents: payload.incidents.trim() || 'Aucun incident signalé.',
      amountsToCheck: payload.amountsToCheck.trim() || 'Aucun montant à contrôler.',
      customersToFollow: payload.customersToFollow.trim() || 'Aucun client à suivre.',
      status: 'submitted',
      submittedAt: now
    });
    saveDB(newDb);
    refresh();
  };

  const submitEmployeeWellbeingCheckIn = (payload: Omit<EmployeeWellbeingCheckIn, 'id' | 'createdAt'>) => {
    const newDb = getDB();
    if (!newDb.employeeProfiles.some(item => item.id === payload.employeeId && item.active)) throw new Error('Collaborateur introuvable ou inactif');
    if (payload.energy < 1 || payload.energy > 5) throw new Error('Choisissez un niveau d’énergie entre 1 et 5');
    const id = createRuntimeId('CHECKIN');
    newDb.employeeWellbeingCheckIns.unshift({ ...payload, id, note: payload.note?.trim(), createdAt: new Date().toISOString() });
    saveDB(newDb);
    refresh();
    return id;
  };

  const requestEmployeeSupport = (payload: Pick<EmployeeSupportRequest, 'employeeId' | 'siteId' | 'shiftId' | 'type' | 'note' | 'requestedFor'>) => {
    const newDb = getDB();
    const employee = newDb.employeeProfiles.find(item => item.id === payload.employeeId && item.active);
    if (!employee || employee.siteId !== payload.siteId) throw new Error('Collaborateur ou établissement introuvable');
    if (!payload.note.trim()) throw new Error('Précisez brièvement votre besoin');
    if (newDb.employeeSupportRequests.some(item => item.employeeId === payload.employeeId && item.type === payload.type && item.status !== 'resolved')) {
      throw new Error('Une demande de ce type est déjà en cours');
    }
    const labels: Record<EmployeeSupportRequest['type'], string> = {
      reinforcement: 'Besoin de renfort',
      transport: 'Organisation du retour',
      confidential: 'Échange confidentiel'
    };
    const id = createRuntimeId('SUPPORT');
    newDb.employeeSupportRequests.unshift({
      ...payload,
      id,
      label: labels[payload.type],
      note: payload.note.trim(),
      confidential: payload.type === 'confidential',
      status: 'open',
      createdAt: new Date().toISOString()
    });
    saveDB(newDb);
    refresh();
    return id;
  };

  const updateEmployeeSupportRequest = (requestId: string, status: 'acknowledged' | 'resolved', managerId: string) => {
    const newDb = getDB();
    const request = newDb.employeeSupportRequests.find(item => item.id === requestId);
    const manager = newDb.employeeProfiles.find(item => item.id === managerId && item.role === 'service_manager' && item.active);
    if (!request || !manager || request.siteId !== manager.siteId) throw new Error('Demande ou manager introuvable');
    const now = new Date().toISOString();
    request.status = status;
    request.handledBy = manager.name;
    if (status === 'acknowledged') request.acknowledgedAt = now;
    if (status === 'resolved') {
      request.acknowledgedAt ||= now;
      request.resolvedAt = now;
    }
    saveDB(newDb);
    refresh();
  };

  const requestEmployeeScheduleChange = (scheduleId: string, employeeId: string, action: 'swap' | 'leave', colleagueId?: string, note = '', colleagueScheduleId?: string) => {
    const newDb = getDB();
    const schedule = newDb.employeeSchedules.find(item => item.id === scheduleId && item.employeeId === employeeId);
    const requester = newDb.employeeProfiles.find(item => item.id === employeeId && item.active);
    if (!schedule) throw new Error('Créneau de planning introuvable');
    if (['swap_requested', 'swap_pending_colleague', 'swap_colleague_accepted', 'leave_requested'].includes(schedule.status)) throw new Error('Une demande est déjà en attente pour ce créneau');
    if (action === 'swap' && (!colleagueId || colleagueId === employeeId)) throw new Error('Choisissez un collègue pour proposer l’échange');
    const colleague = action === 'swap' ? newDb.employeeProfiles.find(item => item.id === colleagueId && item.active) : undefined;
    if (action === 'swap' && (!requester || !colleague || requester.role !== colleague.role)) throw new Error('Un échange nécessite un collègue habilité sur le même métier');
    const colleagueSchedule = action === 'swap' ? newDb.employeeSchedules.find(item => item.id === colleagueScheduleId && item.employeeId === colleagueId && item.siteId === schedule.siteId) : undefined;
    if (action === 'swap' && (!colleagueSchedule || !['planned', 'confirmed', 'change_rejected', 'swap_colleague_rejected'].includes(colleagueSchedule.status))) {
      throw new Error('Choisissez un créneau disponible du collègue');
    }
    if (colleagueSchedule && colleagueSchedule.date === schedule.date && colleagueSchedule.startTime === schedule.startTime && colleagueSchedule.endTime === schedule.endTime) {
      throw new Error('Ces deux créneaux sont identiques');
    }
    if (colleagueSchedule && newDb.employeeSchedules.some(item => item.id !== schedule.id && item.requestedColleagueScheduleId === colleagueSchedule.id && ['swap_pending_colleague', 'swap_colleague_accepted'].includes(item.status))) {
      throw new Error('Ce créneau fait déjà l’objet d’une demande d’échange');
    }
    if (newDb.employeeSchedules.some(item => item.id !== schedule.id && item.requestedColleagueScheduleId === schedule.id && ['swap_pending_colleague', 'swap_colleague_accepted'].includes(item.status))) {
      throw new Error('Votre créneau est déjà engagé dans une proposition d’échange');
    }
    schedule.status = action === 'swap' ? 'swap_pending_colleague' : 'leave_requested';
    schedule.requestedColleagueId = action === 'swap' ? colleagueId : undefined;
    schedule.requestedColleagueScheduleId = action === 'swap' ? colleagueScheduleId : undefined;
    schedule.requestNote = note.trim() || (action === 'swap' ? 'Échange de service proposé.' : 'Demande d’absence envoyée.');
    schedule.managerNote = undefined;
    schedule.colleagueResponseAt = undefined;
    saveDB(newDb);
    refresh();
  };

  const respondEmployeeScheduleSwap = (scheduleId: string, colleagueId: string, accepted: boolean) => {
    const newDb = getDB();
    const schedule = newDb.employeeSchedules.find(item => item.id === scheduleId && item.requestedColleagueId === colleagueId && item.status === 'swap_pending_colleague');
    const colleagueSchedule = schedule && newDb.employeeSchedules.find(item => item.id === schedule.requestedColleagueScheduleId && item.employeeId === colleagueId);
    if (!schedule || !colleagueSchedule) throw new Error('Proposition d’échange introuvable');
    if (accepted && !['planned', 'confirmed', 'change_rejected', 'swap_colleague_rejected'].includes(colleagueSchedule.status)) throw new Error('Votre créneau n’est plus disponible pour cet échange');
    schedule.status = accepted ? 'swap_colleague_accepted' : 'swap_colleague_rejected';
    schedule.colleagueResponseAt = new Date().toISOString();
    schedule.managerNote = accepted ? 'Accord du collègue reçu · validation manager requise' : 'Le collègue a refusé la proposition';
    saveDB(newDb);
    refresh();
  };

  const saveEmployeeSchedule = (
    payload: Pick<EmployeeSchedule, 'employeeId' | 'siteId' | 'date' | 'startTime' | 'endTime' | 'assignmentLabel'> & {
      id?: string;
      status?: Extract<EmployeeSchedule['status'], 'planned' | 'confirmed'>;
    },
    managerId?: string
  ) => {
    const newDb = getDB();
    const employee = newDb.employeeProfiles.find(item => item.id === payload.employeeId && item.active);
    if (!employee || employee.siteId !== payload.siteId) throw new Error('Collaborateur ou établissement invalide');
    if (!canManageEmployeeSchedule(newDb, employee, managerId)) throw new Error('Votre périmètre ne permet pas de planifier ce collaborateur');
    const existing = payload.id ? newDb.employeeSchedules.find(item => item.id === payload.id) : undefined;
    if (payload.id && !existing) throw new Error('Service planifié introuvable');
    if (existing && existing.employeeId !== employee.id) throw new Error('Le collaborateur d’un service existant ne peut pas être remplacé');
    if (existing && ['swap_pending_colleague', 'swap_colleague_accepted', 'leave_requested'].includes(existing.status)) {
      throw new Error('Traitez la demande en cours avant de modifier ce service');
    }
    if (!payload.date || payload.date < new Date().toISOString().slice(0, 10)) throw new Error('Choisissez une date à partir d’aujourd’hui');
    if (!payload.startTime || !payload.endTime || payload.startTime >= payload.endTime) throw new Error('Les horaires du service sont invalides');
    const assignmentLabel = payload.assignmentLabel.trim();
    if (!assignmentLabel) throw new Error('Précisez le poste ou la zone de service');
    const overlap = newDb.employeeSchedules.some(item => (
      item.id !== existing?.id
      && item.employeeId === employee.id
      && item.date === payload.date
      && payload.startTime < item.endTime
      && payload.endTime > item.startTime
    ));
    if (overlap) throw new Error('Ce collaborateur possède déjà un service sur cette plage horaire');
    const schedule: EmployeeSchedule = {
      id: existing?.id || createRuntimeId('SCHEDULE'),
      employeeId: employee.id,
      siteId: employee.siteId,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      assignmentLabel,
      status: payload.status || 'confirmed'
    };
    if (existing) Object.assign(existing, schedule);
    else newDb.employeeSchedules.push(schedule);
    newDb.employeeSchedules.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
    saveDB(newDb);
    refresh();
    return schedule.id;
  };

  const deleteEmployeeSchedule = (scheduleId: string, managerId?: string) => {
    const newDb = getDB();
    const schedule = newDb.employeeSchedules.find(item => item.id === scheduleId);
    const employee = schedule && newDb.employeeProfiles.find(item => item.id === schedule.employeeId);
    if (!schedule || !employee) throw new Error('Service planifié introuvable');
    if (!canManageEmployeeSchedule(newDb, employee, managerId)) throw new Error('Votre périmètre ne permet pas de supprimer ce service');
    const engaged = ['swap_pending_colleague', 'swap_colleague_accepted', 'leave_requested'].includes(schedule.status)
      || newDb.employeeSchedules.some(item => item.requestedColleagueScheduleId === schedule.id && ['swap_pending_colleague', 'swap_colleague_accepted'].includes(item.status));
    if (engaged) throw new Error('Traitez la demande ou l’échange en cours avant de supprimer ce service');
    if (schedule.date < new Date().toISOString().slice(0, 10)) throw new Error('Un service passé reste conservé dans l’historique');
    newDb.employeeSchedules = newDb.employeeSchedules.filter(item => item.id !== schedule.id);
    saveDB(newDb);
    refresh();
  };

  const reviewEmployeeScheduleChange = (scheduleId: string, managerId: string, approved: boolean, note = '') => {
    const newDb = getDB();
    const schedule = newDb.employeeSchedules.find(item => item.id === scheduleId && ['swap_colleague_accepted', 'leave_requested'].includes(item.status));
    const scheduledEmployee = schedule && newDb.employeeProfiles.find(item => item.id === schedule.employeeId);
    const staffManager = newDb.employeeProfiles.find(item => item.id === managerId && item.role === 'service_manager' && item.active);
    if (!schedule || !scheduledEmployee || !canManageEmployeeSchedule(newDb, scheduledEmployee, managerId)) throw new Error('Demande de planning ou manager introuvable');
    const managerName = staffManager?.name || newDb.currentUser.name;
    if (approved && schedule.status === 'swap_colleague_accepted') {
      const colleagueSchedule = newDb.employeeSchedules.find(item => item.id === schedule.requestedColleagueScheduleId && item.employeeId === schedule.requestedColleagueId);
      if (!colleagueSchedule || !['planned', 'confirmed', 'change_rejected', 'swap_colleague_rejected'].includes(colleagueSchedule.status)) throw new Error('Le créneau du collègue n’est plus disponible');
      const requesterSlot = { date: schedule.date, startTime: schedule.startTime, endTime: schedule.endTime, assignmentLabel: schedule.assignmentLabel };
      schedule.date = colleagueSchedule.date;
      schedule.startTime = colleagueSchedule.startTime;
      schedule.endTime = colleagueSchedule.endTime;
      schedule.assignmentLabel = colleagueSchedule.assignmentLabel;
      colleagueSchedule.date = requesterSlot.date;
      colleagueSchedule.startTime = requesterSlot.startTime;
      colleagueSchedule.endTime = requesterSlot.endTime;
      colleagueSchedule.assignmentLabel = requesterSlot.assignmentLabel;
      colleagueSchedule.status = 'change_approved';
      colleagueSchedule.managerNote = `Échange validé par ${managerName}`;
    }
    schedule.status = approved ? 'change_approved' : 'change_rejected';
    schedule.managerNote = note.trim() || (approved ? `Validé par ${managerName}` : `Refusé par ${managerName}`);
    saveDB(newDb);
    refresh();
  };

  const startEmployeeBreak = (employeeId: string, shiftId: string, type: EmployeeBreak['type'] = 'rest') => {
    const newDb = getDB();
    const shift = newDb.employeeShifts.find(item => item.id === shiftId && item.employeeId === employeeId && item.status === 'open');
    if (!shift) throw new Error('Aucun service ouvert pour cette pause');
    if (newDb.employeeBreaks.some(item => item.employeeId === employeeId && item.status === 'started')) throw new Error('Une pause est déjà en cours');
    const now = new Date().toISOString();
    const id = createRuntimeId('BREAK');
    newDb.employeeBreaks.unshift({ id, employeeId, shiftId, type, status: 'started', plannedAt: now, startedAt: now });
    saveDB(newDb);
    refresh();
    return id;
  };

  const completeEmployeeBreak = (breakId: string, employeeId: string) => {
    const newDb = getDB();
    const employeeBreak = newDb.employeeBreaks.find(item => item.id === breakId && item.employeeId === employeeId && item.status === 'started');
    if (!employeeBreak) throw new Error('Pause active introuvable');
    employeeBreak.status = 'completed';
    employeeBreak.endedAt = new Date().toISOString();
    saveDB(newDb);
    refresh();
  };

  const addEmployeeRecognition = (employeeId: string, authorEmployeeId: string, message: string) => {
    const newDb = getDB();
    const recipient = newDb.employeeProfiles.find(item => item.id === employeeId && item.active);
    const author = newDb.employeeProfiles.find(item => item.id === authorEmployeeId && item.active);
    if (!recipient || !author || recipient.siteId !== author.siteId) throw new Error('Collaborateur ou auteur introuvable');
    if (!message.trim()) throw new Error('Écrivez un remerciement concret');
    const recognition: EmployeeRecognition = {
      id: createRuntimeId('THANKS'),
      employeeId,
      source: author.role === 'service_manager' ? 'manager' : 'peer',
      authorName: author.name,
      message: message.trim(),
      createdAt: new Date().toISOString()
    };
    newDb.employeeRecognitions.unshift(recognition);
    saveDB(newDb);
    refresh();
    return recognition.id;
  };

  const completeEmployeeLearning = (employeeId: string, moduleId: string) => {
    const newDb = getDB();
    const employee = newDb.employeeProfiles.find(item => item.id === employeeId && item.active);
    const learning = newDb.employeeLearningModules.find(item => item.id === moduleId);
    if (!employee || !learning) throw new Error('Collaborateur ou formation introuvable');
    const eligibleRoles = learning.roles as string[];
    const isEligible = eligibleRoles.includes('all') || eligibleRoles.includes(employee.role);
    if (!isEligible) throw new Error('Cette capsule ne correspond pas à votre poste');
    if (!learning.completedByEmployeeIds.includes(employeeId)) learning.completedByEmployeeIds.push(employeeId);
    employee.skills ||= [];
    if (!employee.skills.includes(learning.skill)) employee.skills.push(learning.skill);
    saveDB(newDb);
    refresh();
  };

  const updateEmployeeExperience = (employeeId: string, payload: { preferences?: Partial<EmployeeExperiencePreferences>; careerGoal?: string }) => {
    const newDb = getDB();
    const employee = newDb.employeeProfiles.find(item => item.id === employeeId && item.active);
    if (!employee) throw new Error('Collaborateur introuvable');
    const defaults: EmployeeExperiencePreferences = { language: 'fr', highContrast: false, lowBandwidth: employee.role === 'driver', quietNotifications: true, voiceAssistance: false };
    employee.experiencePreferences = { ...defaults, ...employee.experiencePreferences, ...payload.preferences };
    if (payload.careerGoal !== undefined) {
      if (!payload.careerGoal.trim()) throw new Error('Précisez votre objectif professionnel');
      employee.careerGoal = payload.careerGoal.trim();
    }
    saveDB(newDb);
    refresh();
  };

  const acknowledgeEmployeeHandover = (handoverId: string, employeeId: string) => {
    const newDb = getDB();
    const handover = newDb.employeeHandovers.find(item => item.id === handoverId);
    const employee = newDb.employeeProfiles.find(item => item.id === employeeId);
    if (!handover || !employee) throw new Error('Passation ou employé introuvable');
    handover.status = 'acknowledged';
    handover.acknowledgedAt = new Date().toISOString();
    handover.acknowledgedBy = employee.name;
    saveDB(newDb);
    refresh();
  };

  const sendEmployeeMessage = (payload: Omit<EmployeeMessage, 'id' | 'sentAt' | 'readByEmployeeIds'>) => {
    const newDb = getDB();
    const sender = newDb.employeeProfiles.find(item => item.id === payload.senderId);
    if (sender && !hasEmployeePermission(sender, 'team_messages')) throw new Error('Votre profil ne permet pas d’envoyer des messages d’équipe');
    if (!payload.content.trim()) throw new Error('Le message est vide');
    const id = `STAFF-MSG-${Date.now().toString().slice(-7)}`;
    newDb.employeeMessages.unshift({ ...payload, id, content: payload.content.trim(), sentAt: new Date().toISOString(), readByEmployeeIds: [payload.senderId] });
    saveDB(newDb);
    refresh();
    return id;
  };

  const markEmployeeMessageRead = (messageId: string, employeeId: string) => {
    const newDb = getDB();
    const message = newDb.employeeMessages.find(item => item.id === messageId);
    if (!message) throw new Error('Message introuvable');
    if (!message.readByEmployeeIds.includes(employeeId)) message.readByEmployeeIds.push(employeeId);
    saveDB(newDb);
    refresh();
  };

  const requestEmployeeApproval = (payload: Omit<EmployeeApproval, 'id' | 'status' | 'createdAt' | 'decidedAt' | 'decidedBy' | 'decisionNote'>) => {
    const newDb = getDB();
    const requester = newDb.employeeProfiles.find(item => item.id === payload.requestedBy);
    if (requester && ['discount', 'complimentary'].includes(payload.type) && !hasEmployeePermission(requester, 'discount_request')) {
      throw new Error('Votre profil ne permet pas de demander une remise ou un offert');
    }
    if (!payload.reason.trim()) throw new Error('Le motif est obligatoire');
    const id = `APPROVAL-${Date.now().toString().slice(-7)}`;
    newDb.employeeApprovals.unshift({ ...payload, id, reason: payload.reason.trim(), status: 'pending', createdAt: new Date().toISOString() });
    saveDB(newDb);
    refresh();
    return id;
  };

  const decideEmployeeApproval = (approvalId: string, managerId: string, decision: 'approved' | 'rejected', note = '') => {
    const newDb = getDB();
    const approval = newDb.employeeApprovals.find(item => item.id === approvalId && item.status === 'pending');
    const manager = newDb.employeeProfiles.find(item => item.id === managerId && item.role === 'service_manager');
    if (!approval || !manager) throw new Error('Validation ou manager introuvable');
    if (!hasEmployeePermission(manager, 'sensitive_approval')) throw new Error('Ce manager ne possède pas le droit de validation sensible');
    approval.status = decision;
    approval.decidedAt = new Date().toISOString();
    approval.decidedBy = manager.name;
    approval.decisionNote = note.trim();
    saveDB(newDb);
    refresh();
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
    }>,
    actor?: { id: string; name: string }
  ) => {
    stockEngine.receiveSupplierOrder(
      orderId,
      targetWarehouseId,
      itemsReceived,
      actor?.id || db.currentUser.id,
      actor?.name || db.currentUser.name
    );
    refresh();
  };

  const handleTransfer = (
    sourceWarehouseId: string,
    destinationWarehouseId: string,
    items: Array<{ productId: string; quantity: number }>,
    actor?: { id: string; name: string }
  ) => {
    const employee = actor ? getDB().employeeProfiles.find(item => item.id === actor.id) : undefined;
    if (employee && !hasEmployeePermission(employee, 'stock_transfer')) throw new Error('Votre profil ne permet pas de transférer du stock');
    stockEngine.executeTransfer(
      sourceWarehouseId,
      destinationWarehouseId,
      items,
      actor?.id || db.currentUser.id,
      actor?.name || db.currentUser.name
    );
    refresh();
  };

  const handleInventory = (
    warehouseId: string,
    items: Array<{ productId: string; realQty: number }>,
    actor?: { id: string; name: string }
  ) => {
    const employee = actor ? getDB().employeeProfiles.find(item => item.id === actor.id) : undefined;
    if (employee && !hasEmployeePermission(employee, 'stock_adjustment')) throw new Error('Votre profil ne permet pas de valider un inventaire');
    stockEngine.executeInventoryAdjustment(
      warehouseId,
      items,
      actor?.id || db.currentUser.id,
      actor?.name || db.currentUser.name
    );
    refresh();
  };

  const handleLoss = (
    productId: string,
    warehouseId: string,
    quantity: number,
    reason: LossReason,
    note: string,
    actor?: { id: string; name: string }
  ) => {
    const employee = actor ? getDB().employeeProfiles.find(item => item.id === actor.id) : undefined;
    if (employee && !hasEmployeePermission(employee, 'stock_loss')) throw new Error('Votre profil ne permet pas de déclarer une perte');
    stockEngine.declareLoss(
      productId,
      warehouseId,
      quantity,
      reason,
      note,
      actor?.id || db.currentUser.id,
      actor?.name || db.currentUser.name
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

  const setPOSProductAvailability = (productId: string, posId: string, isAvailable: boolean, actorName?: string) => {
    const newDb = getDB();
    const pricing = newDb.posPricing.find(item => item.productId === productId && item.posId === posId);
    const product = newDb.products.find(item => item.id === productId);
    const pos = newDb.posList.find(item => item.id === posId);
    if (!pricing || !product || !pos) throw new Error('Article ou canal de vente introuvable');
    pricing.isAvailable = isAvailable;
    newDb.employeeMessages.unshift({
      id: `availability-${Date.now()}`,
      siteId: pos.siteId,
      senderId: newDb.currentUser.id,
      senderName: actorName || newDb.currentUser.name,
      audience: 'waiter',
      content: `${product.name} est ${isAvailable ? 'de nouveau disponible' : 'en rupture'} sur ${pos.name}. Le catalogue de vente a été mis à jour.`,
      priority: isAvailable ? 'normal' : 'urgent',
      sentAt: new Date().toISOString(),
      readByEmployeeIds: []
    });
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
    newDb.employeeProfiles = newDb.employeeProfiles.map(employee => employee.posId === posId ? { ...employee, posId: undefined } : employee);

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
    newDb.employeeProfiles = newDb.employeeProfiles.map(employee => employee.warehouseId === warehouseId
      ? { ...employee, warehouseId: fallbackWarehouse?.id }
      : employee
    );

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

  const appendPMSAudit = (targetDb: ReturnType<typeof getDB>, action: string, entity: string, detail: string, actorName?: string) => {
    targetDb.pmsAuditLogs.unshift({
      id: `pms-audit-${Date.now()}-${targetDb.pmsAuditLogs.length}`,
      date: new Date().toISOString(),
      userName: actorName || targetDb.currentUser.name,
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
    newDb.pmsGuestMessages = newDb.pmsGuestMessages.filter(item => item.reservationId !== reservationId);
    newDb.pmsStayCompanions = newDb.pmsStayCompanions.filter(item => item.reservationId !== reservationId);
    newDb.pmsGuestFeedback = newDb.pmsGuestFeedback.filter(item => item.reservationId !== reservationId);
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
          payments: reservation.prepayments?.length ? reservation.prepayments.map(payment => ({ ...payment })) : reservation.depositAmount > 0 ? [{
            id: `pay-deposit-${Date.now()}`,
            amount: reservation.depositAmount,
            method: 'other',
            date: new Date().toISOString(),
            reference: 'Acompte réservation',
            kind: 'deposit'
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

  const updatePMSHousekeepingTask = (taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'inspected', actorName?: string) => {
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
    appendPMSAudit(newDb, 'Entretien chambre', `Chambre ${room?.roomNumber || task.roomId}`, `Tâche passée au statut ${status}.`, actorName);
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

  const updatePMSHousekeepingDetails = (taskId: string, patch: Partial<Pick<PMSHousekeepingTask, 'assignedTo' | 'priority' | 'note' | 'linenStatus' | 'minibarStatus' | 'photoCount'>>, actorName?: string) => {
    const newDb = getDB();
    const task = newDb.pmsHousekeepingTasks.find(item => item.id === taskId);
    if (!task) throw new Error("Tâche d'entretien introuvable");
    Object.assign(task, patch);
    appendPMSAudit(newDb, 'Détail entretien', taskId, `Affectation ${task.assignedTo}, linge ${task.linenStatus}, minibar ${task.minibarStatus}.`, actorName);
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

  const addPMSReservationPayment = (reservationId: string, amount: number, method: PaymentType, reference?: string) => {
    if (amount <= 0) throw new Error('Le montant doit être supérieur à zéro.');
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    if (!reservation) throw new Error('Réservation introuvable');
    const folio = newDb.pmsFolios.find(item => item.reservationId === reservationId && item.status === 'open');
    const payment = { id: `pay-guest-${Date.now()}`, amount, method, date: new Date().toISOString(), reference, kind: folio ? 'payment' as const : 'deposit' as const };
    if (folio) folio.payments.push(payment);
    else {
      reservation.prepayments = [...(reservation.prepayments || []), payment];
      reservation.depositAmount += amount;
      reservation.guaranteeType = 'deposit';
      reservation.guaranteeStatus = 'secured';
    }
    appendPMSAudit(newDb, folio ? 'Paiement portail client' : 'Acompte portail client', reservation.confirmationNumber, `${amount} FCFA réglés par ${method}${reference ? ` · ${reference}` : ''}.`);
    saveDB(newDb);
    refresh();
    return payment.id;
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

  const updatePMSServiceRequest = (requestId: string, status: PMSServiceRequest['status'], actorName?: string) => {
    const newDb = getDB();
    const request = newDb.pmsServiceRequests.find(item => item.id === requestId);
    if (!request) throw new Error('Demande client introuvable');
    request.status = status;
    appendPMSAudit(newDb, 'Suivi demande client', request.label, `Statut ${status}, responsable ${request.assignedTo}.`, actorName);
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

  const completePMSPreCheckIn = (reservationId: string, payload?: Partial<Pick<PMSGuest, 'phone' | 'email' | 'nationality' | 'preferences' | 'documentType' | 'documentNumber'>> & { estimatedArrivalTime?: string }) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    const guest = newDb.pmsGuests.find(item => item.id === reservation?.guestId);
    if (!reservation || !guest) throw new Error('Séjour ou client introuvable');
    if (payload) {
      const { estimatedArrivalTime, ...guestPatch } = payload;
      Object.assign(guest, guestPatch);
      if (estimatedArrivalTime) reservation.estimatedArrivalTime = estimatedArrivalTime;
    }
    guest.preCheckInStatus = 'completed';
    guest.consentSignedAt = new Date().toISOString();
    if (!guest.documentType) guest.documentType = 'identity_card';
    if (!guest.documentNumber) guest.documentNumber = `SN-${Date.now().toString().slice(-8)}`;
    appendPMSAudit(newDb, 'Pré-check-in mobile', reservation.confirmationNumber, `${guest.fullName} a transmis son identité, ses préférences et son heure d’arrivée.`);
    saveDB(newDb);
    refresh();
  };

  const updatePMSGuestExperienceProfile = (reservationId: string, payload: Partial<Pick<PMSGuest,
    'preferredLanguage' | 'profileConsent' | 'allergies' | 'pillowPreference' | 'preferences' |
    'roomTemperature' | 'roomLocationPreference' | 'housekeepingPreference' | 'minibarPreference' |
    'communicationPreference' | 'dietaryPreferences' | 'accessibilityNeeds' | 'doNotDisturb'
  >>) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    const guest = newDb.pmsGuests.find(item => item.id === reservation?.guestId);
    if (!reservation || !guest) throw new Error('Séjour ou client introuvable');
    Object.assign(guest, payload);
    appendPMSAudit(newDb, 'Préférences client', reservation.confirmationNumber, `Profil d’expérience mis à jour avec consentement ${guest.profileConsent ? 'actif' : 'désactivé'}.`);
    saveDB(newDb);
    refresh();
  };

  const sendPMSGuestMessage = (reservationId: string, content: string, channel: 'portal' | 'whatsapp' = 'portal') => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    const guest = newDb.pmsGuests.find(item => item.id === reservation?.guestId);
    if (!reservation || !guest || !content.trim()) throw new Error('Message ou séjour invalide');
    const id = `guest-message-${Date.now()}`;
    newDb.pmsGuestMessages.push({ id, reservationId, sender: 'guest', senderName: guest.fullName, channel, content: content.trim(), sentAt: new Date().toISOString(), status: 'sent' });
    appendPMSAudit(newDb, 'Message client', reservation.confirmationNumber, `Message ${channel} transmis à la réception.`);
    saveDB(newDb);
    refresh();
    return id;
  };

  const addPMSStayCompanion = (reservationId: string, payload: { fullName: string; phone: string; relationship: string }) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    if (!reservation || !payload.fullName.trim() || !payload.phone.trim()) throw new Error('Nom et téléphone de l’accompagnant obligatoires');
    const id = `companion-${Date.now()}`;
    newDb.pmsStayCompanions.push({ id, reservationId, fullName: payload.fullName.trim(), phone: payload.phone.trim(), relationship: payload.relationship.trim() || 'Accompagnant', invitedAt: new Date().toISOString(), status: 'invited' });
    appendPMSAudit(newDb, 'Invitation accompagnant', reservation.confirmationNumber, `${payload.fullName} invité dans le séjour.`);
    saveDB(newDb);
    refresh();
    return id;
  };

  const sharePMSDoorKey = (keyId: string, companionId: string) => {
    const newDb = getDB();
    const key = newDb.pmsDoorKeys.find(item => item.id === keyId && item.status === 'active');
    const companion = newDb.pmsStayCompanions.find(item => item.id === companionId && item.reservationId === key?.reservationId);
    if (!key || !companion) throw new Error('Clé active ou accompagnant introuvable');
    key.sharedWithIds = Array.from(new Set([...(key.sharedWithIds || []), companion.id]));
    companion.status = 'active';
    appendPMSAudit(newDb, 'Partage clé mobile', key.code, `Accès transmis à ${companion.fullName}.`);
    saveDB(newDb);
    refresh();
  };

  const submitPMSGuestFeedback = (reservationId: string, score: number, note: string, stage: 'in_stay' | 'post_stay' = 'in_stay') => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    if (!reservation || score < 1 || score > 5) throw new Error('Évaluation invalide');
    const needsRecovery = score <= 3;
    newDb.pmsGuestFeedback.unshift({ id: `feedback-${Date.now()}`, reservationId, stage, score, note: note.trim(), submittedAt: new Date().toISOString(), recoveryStatus: needsRecovery ? 'open' : 'not_needed' });
    if (needsRecovery) {
      newDb.pmsServiceRequests.unshift({ id: `recovery-${Date.now()}`, reservationId, roomId: reservation.roomId, type: 'guest_recovery', label: 'Rappel satisfaction prioritaire', status: 'requested', priority: 'urgent', scheduledAt: new Date().toISOString(), assignedTo: 'Responsable relation client', amount: 0, note: note.trim() || `Satisfaction ${score}/5 transmise depuis le portail.` });
    }
    appendPMSAudit(newDb, 'Satisfaction client', reservation.confirmationNumber, needsRecovery ? `Alerte ${score}/5 transmise au manager.` : `Retour positif ${score}/5 enregistré.`);
    saveDB(newDb);
    refresh();
  };

  const completePMSGuestCheckout = (reservationId: string) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    const folio = newDb.pmsFolios.find(item => item.reservationId === reservationId && item.status === 'open');
    const room = newDb.pmsRooms.find(item => item.id === reservation?.roomId);
    if (!reservation || reservation.status !== 'checked_in' || !folio || !room) throw new Error('Départ autonome indisponible pour ce séjour');
    const balance = folio.charges.reduce((sum, item) => sum + item.amount, 0) - folio.payments.reduce((sum, item) => sum + item.amount, 0);
    if (balance > 0) throw new Error('Le folio doit être soldé avant le départ');
    reservation.status = 'checked_out';
    folio.status = 'closed';
    room.status = 'vacant';
    room.housekeepingStatus = 'dirty';
    newDb.pmsDoorKeys.filter(item => item.reservationId === reservationId && item.status === 'active').forEach(item => { item.status = 'expired'; });
    newDb.pmsHousekeepingTasks.unshift({ id: `hk-checkout-${Date.now()}`, roomId: room.id, assignedTo: 'Équipe étage', status: 'pending', priority: 'urgent', scheduledDate: newDb.pmsSettings.businessDate, note: 'Départ autonome confirmé depuis le portail client.' });
    newDb.pmsNotifications.unshift({ id: `post-stay-${Date.now()}`, reservationId, channel: 'whatsapp', type: 'post_stay', recipient: newDb.pmsGuests.find(item => item.id === reservation.guestId)?.phone || '', status: 'scheduled', scheduledAt: new Date(Date.now() + 3600000).toISOString() });
    appendPMSAudit(newDb, 'Départ autonome', reservation.confirmationNumber, `Folio soldé, clés expirées et chambre ${room.roomNumber} transmise au nettoyage.`);
    saveDB(newDb);
    refresh();
  };

  const requestPMSReturnStay = (reservationId: string) => {
    const newDb = getDB();
    const reservation = newDb.pmsReservations.find(item => item.id === reservationId);
    const guest = newDb.pmsGuests.find(item => item.id === reservation?.guestId);
    if (!reservation || !guest) throw new Error('Séjour introuvable');
    guest.returnStayRequestedAt = new Date().toISOString();
    newDb.pmsServiceRequests.unshift({ id: `return-stay-${Date.now()}`, reservationId, roomId: reservation.roomId, type: 'special_request', label: 'Projet de prochain séjour', status: 'requested', priority: 'normal', scheduledAt: new Date().toISOString(), assignedTo: 'Réservations', amount: 0, note: 'Le client souhaite recevoir une proposition directe personnalisée.' });
    appendPMSAudit(newDb, 'Intention de retour', reservation.confirmationNumber, `${guest.fullName} souhaite préparer un nouveau séjour.`);
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

  const openCashSession = (posId: string, openingFloat: number, actor?: { id: string; name: string }) => {
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
      userId: actor?.id || newDb.currentUser.id,
      userName: actor?.name || newDb.currentUser.name,
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

  const closeCashSession = (sessionId: string, closingCashDeclared: number, notes?: string, actor?: { id: string; name: string }) => {
    const newDb = getDB();
    const employee = actor ? newDb.employeeProfiles.find(item => item.id === actor.id) : undefined;
    if (employee && !hasEmployeePermission(employee, 'cash_close')) throw new Error('Votre profil ne permet pas de clôturer une caisse');
    const session = newDb.cashSessions.find(s => s.id === sessionId);
    if (!session) throw new Error("Session de caisse introuvable");
    if (session.status === 'closed') throw new Error("Cette session est déjà clôturée");

    const sessionSales = newDb.externalSales.filter(sale => sale.cashSessionId === session.id);
    const restaurantPayments = newDb.restaurantGuestOrders.flatMap(order => (
      order.payments.filter(payment => payment.cashSessionId === session.id).map(payment => ({ orderId: order.id, payment }))
    ));
    const paymentTotals: PaymentTotals = createEmptyPaymentTotals();

    sessionSales.forEach(sale => {
      paymentTotals[sale.paymentContext.type] += sale.paymentContext.amount;
    });
    restaurantPayments.forEach(({ payment }) => {
      paymentTotals[payment.method] += payment.amount;
    });

    const totalSales = Object.values(paymentTotals).reduce((sum, amount) => sum + amount, 0);
    const expectedCash = session.openingFloat + paymentTotals.cash;

    session.status = 'closed';
    session.closedAt = new Date().toISOString();
    session.closedBy = actor?.id || newDb.currentUser.id;
    session.closedByName = actor?.name || newDb.currentUser.name;
    session.closingCashDeclared = closingCashDeclared;
    session.expectedCash = expectedCash;
    session.cashDifference = closingCashDeclared - expectedCash;
    session.paymentTotals = paymentTotals;
    session.totalSales = totalSales;
    session.saleIds = [...new Set([...sessionSales.map(sale => sale.id), ...restaurantPayments.map(item => item.orderId)])];
    session.zReportNumber = `Z-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${session.id.slice(-4)}`;
    session.notes = notes;

    saveDB(newDb);
    refresh();
  };

  const reserveDeliveryOrder = (orderId: string, actor?: { id: string; name: string }) => {
    const result = stockEngine.reserveDeliveryOrder(orderId, actor?.id || db.currentUser.id, actor?.name || db.currentUser.name);
    refresh();
    return result;
  };

  const startDeliveryPreparation = (orderId: string, actor?: { id: string; name: string }) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'preparing', actor?.id || db.currentUser.id, actor?.name || db.currentUser.name);
    refresh();
    return result;
  };

  const markDeliveryReady = (orderId: string, actor?: { id: string; name: string }) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'ready', actor?.id || db.currentUser.id, actor?.name || db.currentUser.name);
    refresh();
    return result;
  };

  const dispatchDeliveryOrder = (orderId: string, actor?: { id: string; name: string }) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'out_for_delivery', actor?.id || db.currentUser.id, actor?.name || db.currentUser.name);
    refresh();
    return result;
  };

  const failDeliveryOrder = (orderId: string, issue?: string, actor?: { id: string; name: string }) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'failed', actor?.id || db.currentUser.id, actor?.name || db.currentUser.name, issue);
    refresh();
    return result;
  };

  const returnDeliveryOrder = (orderId: string, actor?: { id: string; name: string }) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'returned', actor?.id || db.currentUser.id, actor?.name || db.currentUser.name);
    refresh();
    return result;
  };

  const cancelDeliveryOrder = (orderId: string, actor?: { id: string; name: string }) => {
    const result = stockEngine.updateDeliveryOrderStatus(orderId, 'cancelled', actor?.id || db.currentUser.id, actor?.name || db.currentUser.name);
    refresh();
    return result;
  };

  const deliverDeliveryOrder = (orderId: string, actor?: { id: string; name: string }) => {
    const order = getDB().deliveryOrders.find(item => item.id === orderId);
    if (!order || order.status !== 'out_for_delivery') {
      return { success: false, error: 'La commande doit être confiée au livreur avant validation', movements: [] };
    }
    if (order.proofStatus !== 'photo_confirmed') {
      return { success: false, error: 'Code, signature et photo sont requis avant de clôturer la livraison', movements: [] };
    }
    const result = stockEngine.deliverDeliveryOrder(orderId, actor?.id || db.currentUser.id, actor?.name || db.currentUser.name);
    refresh();
    return result;
  };

  const saveRestaurantDiningTable = (payload: Omit<RestaurantDiningTable, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const newDb = getDB();
    const pos = newDb.posList.find(item => item.id === payload.posId && item.type === 'restaurant');
    const canManage = ['admin', 'director'].includes(newDb.currentUser.role)
      || (newDb.currentUser.role === 'pos_manager' && newDb.currentUser.posId === payload.posId);
    if (!canManage) throw new Error('Seul un manager autorisé peut modifier le plan de salle');
    if (!pos) throw new Error('Restaurant introuvable');

    const label = payload.label.trim().toUpperCase();
    const floor = payload.floor.trim();
    const zone = payload.zone.trim();
    const capacity = Math.round(payload.capacity);
    if (!label || !floor || !zone) throw new Error('Numéro, niveau et zone sont obligatoires');
    if (capacity < 1 || capacity > 20) throw new Error('La capacité doit être comprise entre 1 et 20 personnes');

    const id = payload.id || createRuntimeId('TABLE');
    const existing = newDb.restaurantDiningTables.find(item => item.id === id);
    if (existing && existing.posId !== payload.posId) throw new Error('Une table ne peut pas être déplacée vers un autre point de vente');
    if (newDb.restaurantDiningTables.some(item => item.id !== id && item.posId === pos.id && item.label === label)) {
      throw new Error(`La table ${label} existe déjà dans ce restaurant`);
    }
    const now = new Date().toISOString();
    const record: RestaurantDiningTable = {
      ...payload,
      id,
      label,
      floor,
      zone,
      capacity,
      x: Math.min(96, Math.max(4, payload.x)),
      y: Math.min(94, Math.max(8, payload.y)),
      rotation: Math.round(payload.rotation || 0) % 360,
      active: payload.active !== false,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    if (existing) Object.assign(existing, record);
    else newDb.restaurantDiningTables.push(record);
    saveDB(newDb);
    refresh();
    return id;
  };

  const deleteRestaurantDiningTable = (tableId: string) => {
    const newDb = getDB();
    const table = newDb.restaurantDiningTables.find(item => item.id === tableId);
    if (!table) throw new Error('Table introuvable');
    const canManage = ['admin', 'director'].includes(newDb.currentUser.role)
      || (newDb.currentUser.role === 'pos_manager' && newDb.currentUser.posId === table.posId);
    if (!canManage) throw new Error('Seul un manager autorisé peut supprimer une table');
    const hasOpenOrder = newDb.restaurantGuestOrders.some(order => order.posId === table.posId && order.tableNumber === table.label && !['paid', 'cancelled'].includes(order.status));
    const hasOpenReservation = newDb.restaurantReservations.some(reservation => reservation.posId === table.posId && reservation.tableNumber === table.label && ['confirmed', 'seated'].includes(reservation.status));
    if (hasOpenOrder || hasOpenReservation) throw new Error('Libérez la table et ses réservations avant de la supprimer');
    newDb.restaurantDiningTables = newDb.restaurantDiningTables.filter(item => item.id !== tableId);
    saveDB(newDb);
    refresh();
  };

  const createRestaurantReservation = (payload: Omit<RestaurantTableReservation, 'id' | 'status' | 'createdAt'>) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === payload.customerId);
    const pos = newDb.posList.find(item => item.id === payload.posId && item.type === 'restaurant');
    if (!customer || !pos) throw new Error('Client ou restaurant introuvable');
    if (payload.guests < 1 || payload.guests > 20) throw new Error('Nombre de personnes invalide');
    const id = `TABLE-${Date.now().toString().slice(-6)}`;
    newDb.restaurantReservations.unshift({ ...payload, id, status: 'confirmed', createdAt: new Date().toISOString() });
    if (payload.occasion !== 'meal') {
      const labels = { birthday: 'Anniversaire à préparer', business: 'Accueil déjeuner professionnel', family: 'Repas familial à préparer' } as const;
      const attention = payload.occasion === 'birthday' ? 'Attention anniversaire préparée' : payload.occasion === 'business' ? 'Table et rythme de service confirmés' : 'Accueil familial préparé';
      newDb.sartalOccasionPlans.unshift({ id: `occasion-${id}`, customerId: customer.id, reservationId: id, occasion: payload.occasion, label: labels[payload.occasion], status: 'planned', checklist: [
        { id: `occasion-${id}-table`, label: 'Table et placement confirmés', assignedTo: 'Salle', completed: false },
        { id: `occasion-${id}-kitchen`, label: customer.allergies ? `Allergie ${customer.allergies} transmise` : 'Préférences transmises à la cuisine', assignedTo: 'Cuisine', completed: false },
        { id: `occasion-${id}-attention`, label: attention, assignedTo: 'Responsable expérience', completed: false }
      ] });
    }
    newDb.sartalCustomerMessages.push({ id: `message-${Date.now()}`, customerId: customer.id, context: 'restaurant', referenceId: id, sender: 'team', senderName: `${pos.name} · Réservations`, content: `Votre table pour ${payload.guests} personne(s) est confirmée le ${payload.date} à ${payload.time}.`, sentAt: new Date().toISOString(), status: 'sent' });
    saveDB(newDb);
    refresh();
    return id;
  };

  const updateRestaurantReservation = (reservationId: string, patch: Partial<Pick<RestaurantTableReservation, 'date' | 'time' | 'guests' | 'occasion' | 'notes'>>) => {
    const newDb = getDB();
    const reservation = newDb.restaurantReservations.find(item => item.id === reservationId);
    if (!reservation || reservation.status !== 'confirmed') throw new Error('Cette réservation ne peut plus être modifiée');
    Object.assign(reservation, patch);
    saveDB(newDb);
    refresh();
  };

  const cancelRestaurantReservation = (reservationId: string) => {
    const newDb = getDB();
    const reservation = newDb.restaurantReservations.find(item => item.id === reservationId);
    if (!reservation || !['confirmed', 'seated'].includes(reservation.status)) throw new Error('Réservation non annulable');
    reservation.status = 'cancelled';
    saveDB(newDb);
    refresh();
  };

  const placeRestaurantGuestOrder = (payload: {
    customerId: string;
    posId: string;
    reservationId?: string;
    tableNumber?: string;
    folioId?: string;
    roomNumber?: string;
    serviceType: RestaurantGuestOrder['serviceType'];
    items: Array<{ productId: string; quantity: number; note?: string }>;
    paymentMethod: PaymentType;
  }) => {
    const snapshot = getDB();
    const customer = snapshot.sartalCustomers.find(item => item.id === payload.customerId);
    const pos = snapshot.posList.find(item => item.id === payload.posId && item.type === 'restaurant');
    if (!customer || !pos || payload.items.length === 0) throw new Error('Commande restaurant invalide');
    const items = payload.items.map(item => {
      const price = snapshot.posPricing.find(rule => rule.posId === pos.id && rule.productId === item.productId && rule.isAvailable);
      if (!price || item.quantity <= 0) throw new Error('Un article est indisponible');
      return { ...item, salePrice: price.salePrice };
    });
    const total = items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
    if (payload.paymentMethod === 'room_charge') {
      const folio = snapshot.pmsFolios.find(item => item.id === payload.folioId && item.status === 'open');
      const room = snapshot.pmsRooms.find(item => item.id === folio?.roomId);
      if (!folio || !room || room.roomNumber !== payload.roomNumber) {
        throw new Error('Aucun séjour actif ne permet une imputation sur chambre');
      }
    }
    const id = createRuntimeId('REST');
    const deferredPayment = payload.serviceType === 'dine_in' && payload.paymentMethod !== 'room_charge';
    const recordedPaymentMethod: PaymentType = deferredPayment ? 'other' : payload.paymentMethod;
    const result = stockEngine.processExternalSale({
      externalSaleId: id,
      siteId: pos.siteId,
      posId: pos.id,
      items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
      paymentContext: {
        type: recordedPaymentMethod,
        amount: total,
        folioId: payload.paymentMethod === 'room_charge' ? payload.folioId : undefined,
        roomNumber: payload.paymentMethod === 'room_charge' ? payload.roomNumber : undefined
      }
    }, snapshot.currentUser.id, snapshot.currentUser.name);
    if (!result.success) throw new Error(result.error || 'Commande impossible');
    const newDb = getDB();
    const now = new Date().toISOString();
    const sale = newDb.externalSales.find(item => item.externalSaleId === id && item.posId === pos.id);
    if (sale) {
      sale.paymentStatus = deferredPayment ? 'pending' : 'paid';
      sale.paymentBreakdown = deferredPayment ? [] : [{ amount: total, method: payload.paymentMethod, payerName: customer.fullName, paidAt: now }];
    }
    const payments = deferredPayment ? [] : [{ id: createRuntimeId('rest-payment'), amount: total, method: payload.paymentMethod, paidAt: now, payerName: customer.fullName }];
    newDb.restaurantGuestOrders.unshift({ id, customerId: customer.id, posId: pos.id, reservationId: payload.reservationId, tableNumber: payload.tableNumber, folioId: payload.folioId, roomNumber: payload.roomNumber, serviceType: payload.serviceType, intendedPaymentMethod: payload.paymentMethod, status: 'confirmed', paymentStatus: deferredPayment ? 'pending' : 'paid', loyaltyCreditedAt: deferredPayment ? undefined : now, items, payments, total, estimatedMinutes: 30, createdAt: now, updatedAt: now });
    const storedCustomer = newDb.sartalCustomers.find(item => item.id === customer.id);
    if (storedCustomer && !deferredPayment) {
      const earnedPoints = Math.floor(total / 500);
      storedCustomer.loyaltyPoints += earnedPoints;
      storedCustomer.totalSpend += total;
      storedCustomer.visits += 1;
      newDb.sartalLoyaltyTransactions.unshift({ id: createRuntimeId('loyalty'), customerId: customer.id, type: 'earned', points: earnedPoints, label: `Commande ${pos.name}`, referenceId: id, date: now });
    }
    saveDB(newDb);
    refresh();
    return id;
  };

  const appendRestaurantGuestOrderItems = (orderId: string, customerId: string, payloadItems: Array<{ productId: string; quantity: number; note?: string }>) => {
    const snapshot = getDB();
    const order = snapshot.restaurantGuestOrders.find(item => item.id === orderId && item.customerId === customerId);
    const pos = snapshot.posList.find(item => item.id === order?.posId && item.type === 'restaurant');
    if (!order || !pos || order.serviceType !== 'dine_in' || !['placed', 'confirmed'].includes(order.status)) throw new Error('La commande ne peut plus recevoir de complément');
    if (!payloadItems.length) throw new Error('Ajoutez au moins un article');
    const items = payloadItems.map(item => {
      const price = snapshot.posPricing.find(rule => rule.posId === pos.id && rule.productId === item.productId && rule.isAvailable);
      if (!price || item.quantity <= 0) throw new Error('Un article du complément est indisponible');
      return { ...item, salePrice: price.salePrice };
    });
    const additionTotal = items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
    const externalSaleId = createRuntimeId(`${order.id}-ADD`);
    const result = stockEngine.processExternalSale({ externalSaleId, siteId: pos.siteId, posId: pos.id, items: items.map(item => ({ productId: item.productId, quantity: item.quantity })), paymentContext: { type: 'other', amount: additionTotal } }, snapshot.currentUser.id, snapshot.currentUser.name);
    if (!result.success) throw new Error(result.error || 'Complément impossible');
    const newDb = getDB();
    const storedOrder = newDb.restaurantGuestOrders.find(item => item.id === order.id)!;
    items.forEach(item => {
      const existing = storedOrder.items.find(line => line.productId === item.productId && line.note === item.note);
      if (existing) existing.quantity += item.quantity;
      else storedOrder.items.push(item);
    });
    storedOrder.total += additionTotal;
    storedOrder.paymentStatus = storedOrder.payments.reduce((sum, item) => sum + item.amount, 0) > 0 ? 'partial' : 'pending';
    storedOrder.updatedAt = new Date().toISOString();
    const sale = newDb.externalSales.find(item => item.externalSaleId === externalSaleId);
    if (sale) { sale.paymentStatus = 'pending'; sale.paymentBreakdown = []; }
    saveDB(newDb);
    refresh();
    return additionTotal;
  };

  const updateRestaurantGuestOrderItemNote = (orderId: string, customerId: string, productId: string, note: string) => {
    const newDb = getDB();
    const order = newDb.restaurantGuestOrders.find(item => item.id === orderId && item.customerId === customerId);
    const line = order?.items.find(item => item.productId === productId);
    if (!order || !line || !['placed', 'confirmed'].includes(order.status)) throw new Error('La cuisine ne peut plus modifier cette ligne');
    line.note = note.trim();
    order.updatedAt = new Date().toISOString();
    saveDB(newDb);
    refresh();
  };

  const updateRestaurantGuestOrderStatus = (orderId: string, status: RestaurantGuestOrder['status']) => {
    const newDb = getDB();
    const order = newDb.restaurantGuestOrders.find(item => item.id === orderId);
    if (!order || ['paid', 'cancelled'].includes(order.status)) throw new Error('Commande restaurant non modifiable');
    if (status === 'paid' && order.paymentStatus !== 'paid') throw new Error('L’addition doit être soldée avant de clôturer la commande');
    order.status = status === 'served' && order.paymentStatus === 'paid' ? 'paid' : status;
    order.updatedAt = new Date().toISOString();
    if (status === 'preparing') order.kitchenStartedAt = order.updatedAt;
    if (status === 'ready') order.readyAt = order.updatedAt;
    if (status === 'served') order.servedAt = order.updatedAt;
    saveDB(newDb);
    refresh();
  };

  const addRestaurantGuestOrderPayment = (orderId: string, amount: number, method: PaymentType, payerName?: string, cashSessionId?: string) => {
    const newDb = getDB();
    const order = newDb.restaurantGuestOrders.find(item => item.id === orderId);
    if (!order || amount <= 0) throw new Error('Paiement invalide');
    if (order.status === 'cancelled') throw new Error('Une commande annulée ne peut pas être réglée');
    const cashSession = cashSessionId ? newDb.cashSessions.find(item => item.id === cashSessionId && item.status === 'open' && item.posId === order.posId) : undefined;
    if (cashSessionId && !cashSession) throw new Error('La session de caisse ne correspond pas à cette addition');
    if (method === 'room_charge' && (!order.folioId || !newDb.pmsFolios.some(item => item.id === order.folioId && item.status === 'open'))) {
      throw new Error('Aucun folio actif n’est rattaché à cette addition');
    }
    const paid = order.payments.reduce((sum, item) => sum + item.amount, 0);
    const accepted = Math.min(amount, Math.max(0, order.total - paid));
    if (accepted <= 0) throw new Error('Cette addition est déjà soldée');
    const paidAt = new Date().toISOString();
    order.payments.push({ id: createRuntimeId('rest-payment'), amount: accepted, method, paidAt, payerName, cashSessionId });
    const linkedSales = newDb.externalSales.filter(item => item.posId === order.posId && (item.externalSaleId === order.id || item.externalSaleId.startsWith(`${order.id}-ADD-`)));
    const deferredPayment = linkedSales.some(item => item.paymentStatus === 'pending' || item.paymentStatus === 'partial');
    const primarySale = linkedSales[0];
    if (primarySale) {
      primarySale.paymentBreakdown = [...(primarySale.paymentBreakdown || []), { amount: accepted, method, payerName, paidAt }];
    }
    if (method === 'room_charge' && order.folioId) {
      const folio = newDb.pmsFolios.find(item => item.id === order.folioId);
      if (folio) folio.charges.push({ id: createRuntimeId('charge-rest'), saleId: order.id, externalSaleId: order.id, posId: order.posId, label: `Addition ${order.tableNumber || order.id}`, amount: accepted, date: paidAt, status: 'pending', category: 'restaurant', billingWindow: 'guest' });
    }
    const effectiveCashSession = cashSession || newDb.cashSessions.find(item => item.id === primarySale?.cashSessionId && item.status === 'open');
    if (effectiveCashSession) {
      if (deferredPayment) {
        effectiveCashSession.paymentTotals.other = Math.max(0, effectiveCashSession.paymentTotals.other - accepted);
        effectiveCashSession.paymentTotals[method] += accepted;
      } else {
        effectiveCashSession.paymentTotals[method] += accepted;
        effectiveCashSession.totalSales += accepted;
      }
      if (!effectiveCashSession.saleIds.includes(order.id)) effectiveCashSession.saleIds.push(order.id);
    }
    const nextPaid = paid + accepted;
    order.paymentStatus = nextPaid >= order.total ? 'paid' : 'partial';
    linkedSales.forEach(item => { item.paymentStatus = order.paymentStatus; });
    if (order.paymentStatus === 'paid' && !order.loyaltyCreditedAt) {
      const customer = newDb.sartalCustomers.find(item => item.id === order.customerId);
      if (customer) {
        const earnedPoints = Math.floor(order.total / 500);
        customer.loyaltyPoints += earnedPoints;
        customer.totalSpend += order.total;
        customer.visits += 1;
        newDb.sartalLoyaltyTransactions.unshift({ id: createRuntimeId('loyalty'), customerId: customer.id, type: 'earned', points: earnedPoints, label: `Addition ${order.tableNumber || order.id}`, referenceId: order.id, date: paidAt });
      }
      order.loyaltyCreditedAt = paidAt;
    }
    if (order.paymentStatus === 'paid' && order.status === 'served') order.status = 'paid';
    order.updatedAt = new Date().toISOString();
    saveDB(newDb);
    refresh();
    return accepted;
  };

  const createDeliveryCustomerOrder = (payload: {
    customerId: string;
    addressId: string;
    items: Array<{ productId: string; quantity: number; substitutionPolicy: DeliveryOrder['items'][number]['substitutionPolicy'] }>;
    paymentType: PaymentType;
    deliverySlot?: { id: string; label: string; feeDelta?: number; capacity?: number };
  }) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === payload.customerId);
    const address = customer?.addresses.find(item => item.id === payload.addressId);
    const channel = newDb.posList.find(item => item.type === 'online_grocery');
    const warehouse = newDb.warehouses.find(item => item.id === channel?.defaultWarehouseId);
    if (!customer || !address || !channel || !warehouse || payload.items.length === 0) throw new Error('Panier ou adresse invalide');
    if (payload.deliverySlot?.capacity && newDb.deliveryOrders.filter(order => order.deliverySlotId === payload.deliverySlot?.id && !['cancelled', 'returned'].includes(order.status)).length >= payload.deliverySlot.capacity) throw new Error('Ce créneau vient d’être complet. Choisissez-en un autre.');
    const items = payload.items.map(item => {
      const pricing = newDb.posPricing.find(rule => rule.posId === channel.id && rule.productId === item.productId && rule.isAvailable);
      const stock = newDb.stocks.find(entry => entry.productId === item.productId && entry.warehouseId === warehouse.id);
      if (!pricing || !stock || stock.quantityAvailable - stock.quantityReserved < item.quantity) throw new Error('Un produit du panier n’est plus disponible');
      return { productId: item.productId, quantity: item.quantity, salePrice: pricing.salePrice, substitutionPolicy: item.substitutionPolicy };
    });
    const zoneFees: Record<string, { fee: number; minutes: number }> = { 'Point E / Fann': { fee: 1000, minutes: 45 }, 'Mermoz / Sacré-Coeur': { fee: 1200, minutes: 50 }, 'Ouakam / Almadies': { fee: 1500, minutes: 65 } };
    const delivery = zoneFees[address.zone] || { fee: 2000, minutes: 75 };
    const deliveryFee = customer.deliveryPlusStatus === 'active' ? 0 : Math.max(0, delivery.fee + (payload.deliverySlot?.feeDelta || 0));
    const id = `CMD-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    newDb.deliveryOrders.unshift({ id, customerId: customer.id, customerName: customer.fullName, phone: customer.phone, address: address.address, channelId: channel.id, warehouseId: warehouse.id, status: 'confirmed', paymentType: payload.paymentType, paymentStatus: payload.paymentType === 'cash' ? 'pending' : 'paid', items, deliveryFee, deliverySlotId: payload.deliverySlot?.id, deliverySlotLabel: payload.deliverySlot?.label, zone: address.zone, estimatedMinutes: delivery.minutes, landmark: address.landmark, deliveryInstructions: address.instructions, verificationCode: id.slice(-4), proofStatus: 'pending', createdAt: now, updatedAt: now });
    const orderTotal = items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0) + deliveryFee;
    const earnedPoints = Math.floor(orderTotal / 500);
    customer.loyaltyPoints += earnedPoints;
    customer.totalSpend += orderTotal;
    customer.visits += 1;
    newDb.sartalLoyaltyTransactions.unshift({ id: `loyalty-${Date.now()}`, customerId: customer.id, type: 'earned', points: earnedPoints, label: 'Commande épicerie en ligne', referenceId: id, date: now });
    newDb.sartalCustomerMessages.push({ id: `message-${Date.now()}`, customerId: customer.id, context: 'delivery', referenceId: id, sender: 'team', senderName: 'Sártal Livraison', content: `Commande ${id} confirmée${payload.deliverySlot ? ` pour ${payload.deliverySlot.label}` : ''}.`, sentAt: now, status: 'sent' });
    saveDB(newDb);
    refresh();
    return id;
  };

  const updateDeliverySubstitutionPolicy = (orderId: string, productId: string, policy: NonNullable<DeliveryOrder['items'][number]['substitutionPolicy']>) => {
    const newDb = getDB();
    const order = newDb.deliveryOrders.find(item => item.id === orderId && item.status === 'confirmed');
    const line = order?.items.find(item => item.productId === productId);
    if (!order || !line) throw new Error('Cette commande ne peut plus être modifiée');
    line.substitutionPolicy = policy;
    order.updatedAt = new Date().toISOString();
    saveDB(newDb);
    refresh();
  };

  const updateConfirmedDeliveryOrder = (orderId: string, customerId: string, payload: {
    items: Array<{ productId: string; quantity: number; substitutionPolicy: DeliveryOrder['items'][number]['substitutionPolicy'] }>;
    deliverySlot?: { id: string; label: string; feeDelta?: number; capacity?: number };
  }) => {
    const newDb = getDB();
    const order = newDb.deliveryOrders.find(item => item.id === orderId && item.customerId === customerId);
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    const channel = newDb.posList.find(item => item.id === order?.channelId && item.type === 'online_grocery');
    const warehouse = newDb.warehouses.find(item => item.id === order?.warehouseId);
    if (!order || order.status !== 'confirmed' || !customer || !channel || !warehouse || payload.items.length === 0) throw new Error('Cette commande est déjà en préparation et ne peut plus être modifiée');
    if (payload.deliverySlot?.capacity && newDb.deliveryOrders.filter(entry => entry.id !== order.id && entry.deliverySlotId === payload.deliverySlot?.id && !['cancelled', 'returned'].includes(entry.status)).length >= payload.deliverySlot.capacity) throw new Error('Ce créneau vient d’être complet. Choisissez-en un autre.');
    const items = payload.items.map(item => {
      const pricing = newDb.posPricing.find(rule => rule.posId === channel.id && rule.productId === item.productId && rule.isAvailable);
      const stock = newDb.stocks.find(entry => entry.productId === item.productId && entry.warehouseId === warehouse.id);
      if (!pricing || !stock || item.quantity <= 0 || stock.quantityAvailable - stock.quantityReserved < item.quantity) throw new Error('Un produit modifié n’est plus disponible');
      return { productId: item.productId, quantity: item.quantity, salePrice: pricing.salePrice, substitutionPolicy: item.substitutionPolicy };
    });
    const zoneFees: Record<string, number> = { 'Point E / Fann': 1000, 'Mermoz / Sacré-Coeur': 1200, 'Ouakam / Almadies': 1500 };
    const nextFee = customer.deliveryPlusStatus === 'active' ? 0 : Math.max(0, (zoneFees[order.zone || ''] || 2000) + (payload.deliverySlot?.feeDelta || 0));
    const previousTotal = order.items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0) + order.deliveryFee;
    const nextTotal = items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0) + nextFee;
    const adjustment = nextTotal - previousTotal;
    order.items = items;
    order.deliveryFee = nextFee;
    order.deliverySlotId = payload.deliverySlot?.id;
    order.deliverySlotLabel = payload.deliverySlot?.label;
    order.paymentAdjustment = (order.paymentAdjustment || 0) + adjustment;
    order.paymentStatus = order.paymentType === 'cash' ? 'pending' : adjustment === 0 ? order.paymentStatus : 'pending';
    order.updatedAt = new Date().toISOString();
    customer.totalSpend = Math.max(0, customer.totalSpend + adjustment);
    const pointAdjustment = Math.floor(nextTotal / 500) - Math.floor(previousTotal / 500);
    if (pointAdjustment !== 0) {
      customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints + pointAdjustment);
      newDb.sartalLoyaltyTransactions.unshift({ id: `loyalty-edit-${Date.now()}`, customerId, type: pointAdjustment > 0 ? 'earned' : 'redeemed', points: Math.abs(pointAdjustment), label: `Ajustement commande ${order.id}`, referenceId: order.id, date: order.updatedAt });
    }
    newDb.sartalCustomerMessages.push({ id: `message-edit-${Date.now()}`, customerId, context: 'delivery', referenceId: order.id, sender: 'team', senderName: 'Sártal Livraison', content: adjustment === 0 ? 'Vos modifications sont enregistrées, sans changement de montant.' : `Vos modifications sont enregistrées. Ajustement : ${adjustment > 0 ? '+' : ''}${adjustment.toLocaleString('fr-FR')} FCFA.`, sentAt: order.updatedAt, status: 'sent' });
    saveDB(newDb);
    refresh();
    return adjustment;
  };

  const decideDeliverySubstitution = (orderId: string, customerId: string, productId: string, decision: 'approved' | 'rejected') => {
    const newDb = getDB();
    const order = newDb.deliveryOrders.find(item => item.id === orderId && item.customerId === customerId && item.status === 'confirmed');
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    const line = order?.items.find(item => item.productId === productId || item.originalProductId === productId);
    if (!order || !customer || !line?.substitutionProductId || (line.substitutionStatus && line.substitutionStatus !== 'proposed')) throw new Error('Cette proposition n’est plus disponible');
    const now = new Date().toISOString();
    if (decision === 'approved') {
      const pricing = newDb.posPricing.find(item => item.posId === order.channelId && item.productId === line.substitutionProductId && item.isAvailable);
      const stock = newDb.stocks.find(item => item.productId === line.substitutionProductId && item.warehouseId === order.warehouseId);
      if (!pricing || !stock || stock.quantityAvailable - stock.quantityReserved < line.quantity) throw new Error('Le produit proposé n’est plus disponible');
      const previousLineTotal = line.salePrice * line.quantity;
      const originalProductId = line.originalProductId || line.productId;
      line.productId = line.substitutionProductId;
      line.originalProductId = originalProductId;
      line.salePrice = pricing.salePrice;
      line.substitutionStatus = 'approved';
      const adjustment = line.salePrice * line.quantity - previousLineTotal;
      order.paymentAdjustment = (order.paymentAdjustment || 0) + adjustment;
      if (adjustment !== 0 && order.paymentType !== 'cash') order.paymentStatus = 'pending';
      customer.totalSpend = Math.max(0, customer.totalSpend + adjustment);
      const nextOrderTotal = order.items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0) + order.deliveryFee;
      const previousOrderTotal = nextOrderTotal - adjustment;
      const pointAdjustment = Math.floor(nextOrderTotal / 500) - Math.floor(previousOrderTotal / 500);
      if (pointAdjustment !== 0) {
        customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints + pointAdjustment);
        newDb.sartalLoyaltyTransactions.unshift({ id: `loyalty-substitution-${Date.now()}`, customerId, type: pointAdjustment > 0 ? 'earned' : 'redeemed', points: Math.abs(pointAdjustment), label: `Substitution commande ${order.id}`, referenceId: order.id, date: now });
      }
    } else {
      line.substitutionStatus = 'rejected';
      line.substitutionPolicy = 'refund';
    }
    line.substitutionRequestedAt = line.substitutionRequestedAt || now;
    order.updatedAt = now;
    const originalName = newDb.products.find(item => item.id === (line.originalProductId || productId))?.name || 'article';
    const replacementName = newDb.products.find(item => item.id === line.substitutionProductId)?.name || 'équivalent';
    newDb.sartalCustomerMessages.push({ id: `message-substitution-${Date.now()}`, customerId, context: 'delivery', referenceId: order.id, sender: 'team', senderName: 'Sártal Livraison', content: decision === 'approved' ? `Remplacement validé : ${originalName} par ${replacementName}.` : `Remplacement refusé pour ${originalName}. Cet article ne sera pas facturé s’il manque.`, sentAt: now, status: 'sent' });
    saveDB(newDb);
    refresh();
    return decision;
  };

  const reorderDeliveryOrder = (orderId: string) => {
    const source = getDB().deliveryOrders.find(item => item.id === orderId);
    if (!source?.customerId) throw new Error('Commande source introuvable');
    const customer = getDB().sartalCustomers.find(item => item.id === source.customerId);
    const address = customer?.addresses.find(item => item.isDefault) || customer?.addresses[0];
    if (!address) throw new Error('Adresse client introuvable');
    return createDeliveryCustomerOrder({ customerId: source.customerId, addressId: address.id, items: source.items.map(item => ({ productId: item.productId, quantity: item.quantity, substitutionPolicy: item.substitutionPolicy || 'contact' })), paymentType: source.paymentType });
  };

  const sendSartalCustomerMessage = (customerId: string, context: 'restaurant' | 'delivery', content: string, referenceId?: string, channel: NonNullable<SartalCustomerMessage['channel']> = 'portal', attachmentLabel?: string) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    if (!customer || !content.trim()) throw new Error('Message invalide');
    const id = `customer-message-${Date.now()}`;
    newDb.sartalCustomerMessages.push({ id, customerId, context, referenceId, sender: 'customer', senderName: customer.fullName, content: content.trim(), channel, attachmentLabel, sentAt: new Date().toISOString(), status: 'sent' });
    if (isOffline()) newDb.sartalOfflineActions.unshift({ id: `offline-${Date.now()}`, customerId, actionType: 'message', summary: `Message ${context} conservé hors connexion`, status: 'queued', createdAt: new Date().toISOString() });
    saveDB(newDb);
    refresh();
    return id;
  };

  const submitSartalCustomerFeedback = (payload: Omit<SartalCustomerFeedback, 'id' | 'submittedAt' | 'recoveryStatus'>) => {
    const newDb = getDB();
    if (!newDb.sartalCustomers.some(item => item.id === payload.customerId) || payload.score < 1 || payload.score > 5) throw new Error('Avis invalide');
    const now = new Date();
    const feedback: SartalCustomerFeedback = { ...payload, id: `customer-feedback-${Date.now()}`, submittedAt: now.toISOString(), recoveryStatus: payload.score <= 3 ? 'open' : 'not_needed', assignedTo: payload.score <= 3 ? 'Responsable relation client' : undefined, promisedAt: payload.score <= 3 ? new Date(now.getTime() + 20 * 60000).toISOString() : undefined };
    newDb.sartalCustomerFeedback.unshift(feedback);
    if (payload.context === 'delivery' && payload.score <= 3) {
      const order = newDb.deliveryOrders.find(item => item.id === payload.referenceId);
      if (order) order.deliveryIssue = payload.note || `Insatisfaction client ${payload.score}/5`;
    }
    if (payload.score <= 3) {
      newDb.sartalServiceRequests.unshift({ id: `recovery-${Date.now()}`, customerId: payload.customerId, context: payload.context, referenceId: payload.referenceId, type: 'other', label: 'Reprendre une insatisfaction client', note: payload.note, status: 'requested', priority: 'urgent', assignedTo: 'Responsable relation client', requestedAt: now.toISOString(), promisedAt: new Date(now.getTime() + 20 * 60000).toISOString() });
    }
    if (isOffline()) newDb.sartalOfflineActions.unshift({ id: `offline-${Date.now()}`, customerId: payload.customerId, actionType: 'feedback', summary: 'Retour client conservé hors connexion', status: 'queued', createdAt: now.toISOString() });
    saveDB(newDb);
    refresh();
    return feedback.id;
  };

  const confirmDeliveryProof = (orderId: string, code: string) => {
    const newDb = getDB();
    const order = newDb.deliveryOrders.find(item => item.id === orderId);
    if (!order || code !== order.verificationCode) throw new Error('Code de livraison incorrect');
    order.proofStatus = 'code_verified';
    saveDB(newDb);
    refresh();
  };

  const updateSartalCustomerProfile = (customerId: string, patch: Partial<Pick<SartalCustomer, 'fullName' | 'email' | 'preferredLanguage' | 'preferredChannel' | 'birthday' | 'preferences' | 'allergies' | 'profileConsent' | 'marketingConsent' | 'defaultPaymentType' | 'restaurantPreferences' | 'deliveryPreferences' | 'notificationPreferences' | 'privacyPreferences'>>) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    if (!customer) throw new Error('Profil client introuvable');
    Object.assign(customer, patch);
    if (isOffline()) newDb.sartalOfflineActions.unshift({ id: `offline-${Date.now()}`, customerId, actionType: 'profile', summary: 'Préférences conservées hors connexion', status: 'queued', createdAt: new Date().toISOString() });
    saveDB(newDb);
    refresh();
  };

  const findOrCreateSartalCustomer = (payload: { fullName: string; phone: string; preferredLanguage?: SartalCustomer['preferredLanguage'] }) => {
    const newDb = getDB();
    const phoneDigits = payload.phone.replace(/\D/g, '');
    const normalizedPhone = phoneDigits.slice(-9);
    if (normalizedPhone.length < 9) throw new Error('Numéro de téléphone incomplet');
    const existing = newDb.sartalCustomers.find(item => item.phone.replace(/\D/g, '').slice(-9) === normalizedPhone && !item.guestSession);
    if (existing) return existing.id;
    if (payload.fullName.trim().length < 2) throw new Error('Indiquez votre nom pour créer votre profil');
    const id = createRuntimeId('customer');
    const canonicalPhone = phoneDigits.length === 9
      ? `+221 ${normalizedPhone.slice(0, 2)} ${normalizedPhone.slice(2, 5)} ${normalizedPhone.slice(5, 7)} ${normalizedPhone.slice(7, 9)}`
      : payload.phone.trim();
    newDb.sartalCustomers.unshift({
      id,
      fullName: payload.fullName.trim(),
      phone: canonicalPhone,
      preferredLanguage: payload.preferredLanguage || 'fr',
      preferredChannel: 'whatsapp',
      profileConsent: false,
      marketingConsent: false,
      defaultPaymentType: 'wave',
      restaurantPreferences: { seatingArea: 'no_preference', servicePace: 'standard', dietaryStyle: 'none', defaultPartySize: 2 },
      deliveryPreferences: { substitutionPolicy: 'contact', dropoffMethod: 'hand_delivery', preferredWindow: 'evening', callOnArrival: true, ecoPackaging: false },
      notificationPreferences: { serviceUpdates: true, reservationReminders: true, deliveryTracking: true, loyaltyNews: false },
      privacyPreferences: { shareAcrossServices: true, personalizedRecommendations: true, anonymousAnalytics: false },
      loyaltyPoints: 0,
      loyaltyTier: 'welcome',
      visits: 0,
      totalSpend: 0,
      addresses: []
    });
    saveDB(newDb);
    refresh();
    return id;
  };

  const createSartalGuestSession = (label: string) => {
    const newDb = getDB();
    const now = Date.now();
    const id = createRuntimeId('customer-guest');
    newDb.sartalCustomers.unshift({
      id,
      fullName: label.trim() || 'Client visiteur',
      phone: `guest-${now}`,
      preferredLanguage: 'fr',
      preferredChannel: 'portal',
      profileConsent: false,
      marketingConsent: false,
      guestSession: true,
      defaultPaymentType: 'wave',
      loyaltyPoints: 0,
      loyaltyTier: 'welcome',
      visits: 0,
      totalSpend: 0,
      addresses: []
    });
    saveDB(newDb);
    refresh();
    return id;
  };

  const saveSartalCustomerAddress = (customerId: string, payload: Omit<SartalCustomer['addresses'][number], 'id'> & { id?: string }) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    if (!customer || !payload.label.trim() || !payload.address.trim() || !payload.zone.trim()) throw new Error('Adresse incomplète');
    const existing = payload.id ? customer.addresses.find(item => item.id === payload.id) : undefined;
    const id = existing?.id || createRuntimeId('address');
    const shouldBeDefault = payload.isDefault || customer.addresses.length === 0;
    if (shouldBeDefault) customer.addresses.forEach(item => { item.isDefault = false; });
    const next = { ...payload, id, label: payload.label.trim(), address: payload.address.trim(), zone: payload.zone.trim(), landmark: payload.landmark.trim(), instructions: payload.instructions?.trim(), isDefault: shouldBeDefault };
    if (existing) Object.assign(existing, next);
    else customer.addresses.push(next);
    saveDB(newDb);
    refresh();
    return id;
  };

  const setDefaultSartalCustomerAddress = (customerId: string, addressId: string) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    if (!customer?.addresses.some(item => item.id === addressId)) throw new Error('Adresse introuvable');
    customer.addresses.forEach(item => { item.isDefault = item.id === addressId; });
    saveDB(newDb);
    refresh();
  };

  const deleteSartalCustomerAddress = (customerId: string, addressId: string) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    const address = customer?.addresses.find(item => item.id === addressId);
    if (!customer || !address) throw new Error('Adresse introuvable');
    customer.addresses = customer.addresses.filter(item => item.id !== addressId);
    if (address.isDefault && customer.addresses.length) customer.addresses[0].isDefault = true;
    saveDB(newDb);
    refresh();
  };

  const createSartalClientAccess = (customerId: string, channel: 'qr' | 'whatsapp' | 'sms') => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    if (!customer) throw new Error('Client introuvable');
    newDb.sartalClientAccess.filter(item => item.customerId === customerId && item.status === 'active').forEach(item => { item.status = 'expired'; });
    const now = new Date();
    const id = createRuntimeId('access');
    const access = { id, customerId, channel, destination: channel === 'qr' ? 'QR personnel' : customer.phone, code: String(Math.floor(1000 + Math.random() * 9000)), linkToken: createRuntimeId(customer.id), status: 'active' as const, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 30 * 60000).toISOString() };
    newDb.sartalClientAccess.unshift(access);
    saveDB(newDb);
    refresh();
    return access;
  };

  const revokeSartalClientAccess = (accessId: string) => {
    const newDb = getDB();
    const access = newDb.sartalClientAccess.find(item => item.id === accessId && item.status === 'active');
    if (!access) throw new Error('Accès déjà fermé ou introuvable');
    access.status = 'expired';
    saveDB(newDb);
    refresh();
  };

  const requestSartalService = (payload: { customerId: string; context: SartalServiceRequest['context']; referenceId?: string; type: SartalServiceRequest['type']; label: string; note?: string; priority?: SartalServiceRequest['priority'] }) => {
    const newDb = getDB();
    if (!newDb.sartalCustomers.some(item => item.id === payload.customerId)) throw new Error('Client introuvable');
    const existing = newDb.sartalServiceRequests.find(item => item.customerId === payload.customerId && item.referenceId === payload.referenceId && item.type === payload.type && (payload.type !== 'other' || item.label === payload.label) && ['requested', 'accepted'].includes(item.status));
    if (existing) return existing.id;
    const now = new Date();
    const priority = payload.priority || (payload.type === 'bill' || payload.type === 'reception' ? 'urgent' : 'normal');
    const assignedTo = payload.context === 'restaurant' ? 'Moussa · Salle' : payload.context === 'delivery' ? 'Fatou · Service client' : 'Awa · Réception';
    const id = `service-${Date.now()}`;
    newDb.sartalServiceRequests.unshift({ ...payload, id, priority, assignedTo, status: 'requested', requestedAt: now.toISOString(), promisedAt: new Date(now.getTime() + (priority === 'urgent' ? 3 : 5) * 60000).toISOString() });
    if (isOffline()) newDb.sartalOfflineActions.unshift({ id: `offline-${Date.now()}`, customerId: payload.customerId, actionType: 'service_request', summary: payload.label, status: 'queued', createdAt: now.toISOString() });
    saveDB(newDb);
    refresh();
    return id;
  };

  const updateSartalServiceRequest = (requestId: string, status: SartalServiceRequest['status'], assignedTo?: string) => {
    const newDb = getDB();
    const request = newDb.sartalServiceRequests.find(item => item.id === requestId);
    if (!request) throw new Error('Demande client introuvable');
    request.status = status;
    if (assignedTo) request.assignedTo = assignedTo;
    if (status === 'completed') request.completedAt = new Date().toISOString();
    saveDB(newDb);
    refresh();
  };

  const inviteRestaurantGuest = (orderId: string, payload: { fullName: string; phone: string; shareAmount?: number }) => {
    const newDb = getDB();
    const order = newDb.restaurantGuestOrders.find(item => item.id === orderId);
    if (!order || !payload.fullName.trim() || !payload.phone.trim()) throw new Error('Commande ou invité invalide');
    const remaining = Math.max(0, order.total - order.payments.reduce((sum, item) => sum + item.amount, 0));
    if (remaining <= 0) throw new Error('Cette addition est déjà soldée');
    const suggestedShare = Math.ceil(remaining / (newDb.restaurantGuestInvites.filter(item => item.orderId === orderId && item.status !== 'paid').length + 2));
    const shareAmount = Math.min(remaining, Math.max(1, Math.round(payload.shareAmount || suggestedShare)));
    const id = createRuntimeId('invite');
    newDb.restaurantGuestInvites.push({ id, orderId, fullName: payload.fullName.trim(), phone: payload.phone.trim(), status: 'invited', shareAmount, accessCode: `${order.tableNumber || 'ST'}-${Math.floor(10 + Math.random() * 90)}`, invitedAt: new Date().toISOString() });
    saveDB(newDb);
    refresh();
    return id;
  };

  const payRestaurantGuestShare = (inviteId: string, method: PaymentType) => {
    const snapshot = getDB();
    const invite = snapshot.restaurantGuestInvites.find(item => item.id === inviteId && item.status !== 'paid');
    const order = snapshot.restaurantGuestOrders.find(item => item.id === invite?.orderId);
    if (!invite || !order) throw new Error('Part invité introuvable');
    const paid = order.payments.reduce((sum, item) => sum + item.amount, 0);
    const amount = Math.min(invite.shareAmount, Math.max(0, order.total - paid));
    if (amount <= 0) throw new Error('Addition déjà soldée');
    const accepted = addRestaurantGuestOrderPayment(order.id, amount, method, invite.fullName);
    const newDb = getDB();
    const storedInvite = newDb.restaurantGuestInvites.find(item => item.id === invite.id)!;
    const now = new Date().toISOString();
    storedInvite.status = 'paid';
    storedInvite.paidAmount = accepted;
    storedInvite.paymentMethod = method;
    storedInvite.paidAt = now;
    saveDB(newDb);
    refresh();
    return accepted;
  };

  const redeemSartalPoints = (customerId: string, points: number, label: string) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    if (!customer || points < 100 || customer.loyaltyPoints < points) throw new Error('Solde de points insuffisant');
    customer.loyaltyPoints -= points;
    newDb.sartalLoyaltyTransactions.unshift({ id: `loyalty-${Date.now()}`, customerId, type: 'redeemed', points: -points, label, date: new Date().toISOString() });
    saveDB(newDb);
    refresh();
  };

  const resolveSartalCustomerFeedback = (feedbackId: string, solution: string, compensationPoints = 0) => {
    const newDb = getDB();
    const feedback = newDb.sartalCustomerFeedback.find(item => item.id === feedbackId && item.recoveryStatus === 'open');
    const customer = newDb.sartalCustomers.find(item => item.id === feedback?.customerId);
    if (!feedback || !customer || !solution.trim()) throw new Error('Reprise client invalide');
    feedback.recoveryStatus = 'resolved';
    feedback.solution = solution.trim();
    feedback.compensationPoints = Math.max(0, compensationPoints);
    feedback.resolvedAt = new Date().toISOString();
    if (feedback.compensationPoints > 0) {
      customer.loyaltyPoints += feedback.compensationPoints;
      newDb.sartalLoyaltyTransactions.unshift({ id: `loyalty-${Date.now()}`, customerId: customer.id, type: 'compensation', points: feedback.compensationPoints, label: 'Attention suite à votre retour', referenceId: feedback.id, date: feedback.resolvedAt });
    }
    newDb.sartalServiceRequests.filter(item => item.referenceId === feedback.referenceId && item.label.includes('insatisfaction')).forEach(item => { item.status = 'completed'; item.completedAt = feedback.resolvedAt; });
    saveDB(newDb);
    refresh();
  };

  const updateSartalJourneyItemStatus = (itemId: string, status: SartalJourneyItem['status']) => {
    const newDb = getDB();
    const item = newDb.sartalJourneyItems.find(entry => entry.id === itemId);
    if (!item) throw new Error('Étape de parcours introuvable');
    item.status = status;
    saveDB(newDb);
    refresh();
  };

  const updateSartalOccasionTask = (planId: string, taskId: string, completed: boolean) => {
    const newDb = getDB();
    const plan = newDb.sartalOccasionPlans.find(entry => entry.id === planId);
    const task = plan?.checklist.find(entry => entry.id === taskId);
    if (!plan || !task) throw new Error('Préparation spéciale introuvable');
    task.completed = completed;
    plan.status = plan.checklist.every(entry => entry.completed)
      ? 'ready'
      : 'planned';
    saveDB(newDb);
    refresh();
  };

  const completeSartalOccasionPlan = (planId: string) => {
    const newDb = getDB();
    const plan = newDb.sartalOccasionPlans.find(entry => entry.id === planId);
    if (!plan || !plan.checklist.every(entry => entry.completed)) throw new Error('Toutes les attentions doivent être prêtes avant clôture');
    plan.status = 'completed';
    saveDB(newDb);
    refresh();
  };

  const toggleFavoriteProduct = (customerId: string, productId: string) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(entry => entry.id === customerId);
    if (!customer || !newDb.products.some(entry => entry.id === productId)) throw new Error('Client ou produit introuvable');
    const favorites = customer.favoriteProductIds || [];
    const enabled = !favorites.includes(productId);
    customer.favoriteProductIds = enabled ? [...favorites, productId] : favorites.filter(id => id !== productId);
    saveDB(newDb);
    refresh();
    return enabled;
  };

  const toggleSartalRecurringOrder = (recurringOrderId: string) => {
    const newDb = getDB();
    const recurringOrder = newDb.sartalRecurringOrders.find(entry => entry.id === recurringOrderId);
    if (!recurringOrder) throw new Error('Commande récurrente introuvable');
    recurringOrder.active = !recurringOrder.active;
    saveDB(newDb);
    refresh();
    return recurringOrder.active;
  };

  const runSartalRecurringOrder = (recurringOrderId: string) => {
    const snapshot = getDB();
    const recurringOrder = snapshot.sartalRecurringOrders.find(entry => entry.id === recurringOrderId);
    const customer = snapshot.sartalCustomers.find(entry => entry.id === recurringOrder?.customerId);
    const address = customer?.addresses.find(entry => entry.isDefault) || customer?.addresses[0];
    if (!recurringOrder || !customer || !address || !recurringOrder.active) throw new Error('Commande récurrente inactive ou incomplète');
    const orderId = createDeliveryCustomerOrder({
      customerId: customer.id,
      addressId: address.id,
      items: recurringOrder.items.map(item => ({ ...item, substitutionPolicy: 'contact' })),
      paymentType: 'wave'
    });
    const newDb = getDB();
    const storedRecurringOrder = newDb.sartalRecurringOrders.find(entry => entry.id === recurringOrderId);
    if (storedRecurringOrder) {
      const baseTime = Number.isFinite(Date.parse(storedRecurringOrder.nextRunAt))
        ? Math.max(Date.now(), Date.parse(storedRecurringOrder.nextRunAt))
        : Date.now();
      const nextRun = new Date(baseTime);
      if (storedRecurringOrder.cadence === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);
      else nextRun.setDate(nextRun.getDate() + (storedRecurringOrder.cadence === 'biweekly' ? 14 : 7));
      storedRecurringOrder.lastOrderId = orderId;
      storedRecurringOrder.nextRunAt = nextRun.toISOString();
    }
    saveDB(newDb);
    refresh();
    return orderId;
  };

  const joinRestaurantWaitlist = (customerId: string, posId: string, guests: number) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(entry => entry.id === customerId);
    const pos = newDb.posList.find(entry => entry.id === posId && entry.type === 'restaurant');
    if (!customer || !pos || guests < 1 || guests > 20) throw new Error('Demande de liste d’attente invalide');
    const existing = newDb.restaurantWaitlist.find(entry => entry.customerId === customerId && entry.posId === posId && ['waiting', 'notified'].includes(entry.status));
    if (existing) return existing.id;
    const activeQueue = newDb.restaurantWaitlist.filter(entry => entry.posId === posId && ['waiting', 'notified'].includes(entry.status)).length;
    const quotedMinutes = Math.min(60, 10 + activeQueue * 5 + guests * 2);
    const now = new Date().toISOString();
    const id = `waitlist-${Date.now()}`;
    newDb.restaurantWaitlist.unshift({ id, customerId, posId, guests, quotedMinutes, status: 'waiting', joinedAt: now });
    newDb.sartalJourneyItems.unshift({ id: `journey-${id}`, customerId, context: 'restaurant', title: `Table pour ${guests} personne(s)`, detail: `Temps estimé : ${quotedMinutes} minutes`, scheduledAt: new Date(Date.now() + quotedMinutes * 60000).toISOString(), status: 'upcoming', assignedTo: `${pos.name} · Accueil`, referenceId: id });
    newDb.sartalCustomerMessages.push({ id: `message-${Date.now()}`, customerId, context: 'restaurant', referenceId: id, sender: 'team', senderName: `${pos.name} · Accueil`, content: `Vous êtes sur la liste d’attente. Estimation : ${quotedMinutes} minutes. Nous vous prévenons dès que votre table est prête.`, sentAt: now, status: 'sent' });
    saveDB(newDb);
    refresh();
    return id;
  };

  const updateRestaurantWaitlistStatus = (entryId: string, status: RestaurantWaitlistEntry['status'], tableNumber?: string) => {
    const newDb = getDB();
    const entry = newDb.restaurantWaitlist.find(item => item.id === entryId);
    const customer = newDb.sartalCustomers.find(item => item.id === entry?.customerId);
    const pos = newDb.posList.find(item => item.id === entry?.posId);
    if (!entry || !customer || !pos) throw new Error('Entrée de liste d’attente introuvable');
    if (status === 'seated' && !tableNumber?.trim()) throw new Error('Numéro de table requis');
    entry.status = status;
    if (status === 'notified') entry.notifiedAt = new Date().toISOString();
    if (status === 'seated') {
      entry.tableNumber = tableNumber?.trim();
      const reservationId = `waitlist-table-${entry.id}`;
      if (!newDb.restaurantReservations.some(item => item.id === reservationId)) {
        const now = new Date();
        newDb.restaurantReservations.unshift({ id: reservationId, customerId: entry.customerId, posId: entry.posId, date: now.toISOString().slice(0, 10), time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), guests: entry.guests, occasion: 'meal', status: 'seated', tableNumber: entry.tableNumber, notes: 'Table attribuée depuis la liste d’attente Sártal.', createdAt: entry.joinedAt });
      }
    }
    newDb.sartalJourneyItems.filter(item => item.referenceId === entry.id).forEach(item => {
      item.status = status === 'seated' ? 'completed' : status === 'cancelled' ? 'cancelled' : status === 'notified' ? 'in_progress' : 'upcoming';
      if (status === 'seated') item.detail = `Table ${entry.tableNumber} attribuée`;
    });
    const message = status === 'notified'
      ? `Votre table est prête. Merci de vous présenter à l’accueil de ${pos.name}.`
      : status === 'seated' ? `Bienvenue. Votre table ${entry.tableNumber} vous attend.` : status === 'cancelled' ? 'Votre demande de table a été annulée.' : 'Votre attente reste bien enregistrée.';
    newDb.sartalCustomerMessages.push({ id: `message-${Date.now()}`, customerId: customer.id, context: 'restaurant', referenceId: entry.id, sender: 'team', senderName: `${pos.name} · Accueil`, content: message, sentAt: new Date().toISOString(), status: 'sent' });
    saveDB(newDb);
    refresh();
  };

  const completeDeliveryProof = (orderId: string, proof: { code: string; signature: string; photoLabel: string; latitude: number; longitude: number }) => {
    const newDb = getDB();
    const order = newDb.deliveryOrders.find(item => item.id === orderId);
    if (!order || order.status !== 'out_for_delivery') throw new Error('La commande doit être en cours de livraison');
    if (proof.code.trim() !== order.verificationCode) throw new Error('Code de livraison incorrect');
    if (!proof.signature.trim() || !proof.photoLabel.trim()) throw new Error('Signature et photo sont obligatoires');
    if (!Number.isFinite(proof.latitude) || !Number.isFinite(proof.longitude) || Math.abs(proof.latitude) > 90 || Math.abs(proof.longitude) > 180) throw new Error('Position GPS invalide');
    order.proofStatus = 'photo_confirmed';
    order.proofSignature = proof.signature.trim();
    order.proofPhotoLabel = proof.photoLabel.trim();
    order.proofLatitude = proof.latitude;
    order.proofLongitude = proof.longitude;
    order.proofCompletedAt = new Date().toISOString();
    order.updatedAt = order.proofCompletedAt;
    if (order.customerId) {
      newDb.sartalCustomerMessages.push({ id: `message-${Date.now()}`, customerId: order.customerId, context: 'delivery', referenceId: order.id, sender: 'team', senderName: 'Sártal Livraison', content: 'Votre code, votre signature et la photo de remise ont été confirmés.', sentAt: order.proofCompletedAt, status: 'sent' });
    }
    saveDB(newDb);
    refresh();
  };

  const applySartalRecoveryPlaybook = (feedbackId: string, playbookId: string) => {
    const snapshot = getDB();
    const feedback = snapshot.sartalCustomerFeedback.find(item => item.id === feedbackId && item.recoveryStatus === 'open');
    const playbook = snapshot.sartalRecoveryPlaybooks.find(item => item.id === playbookId && item.active);
    if (!feedback || !playbook || (playbook.context !== 'all' && playbook.context !== feedback.context) || feedback.score > playbook.maxScore) throw new Error('Ce protocole ne correspond pas au retour client');
    resolveSartalCustomerFeedback(feedback.id, `${playbook.managerApproval ? 'Validation direction · ' : ''}${playbook.solution}`, playbook.compensationPoints);
    return playbook.name;
  };

  const escalateOverdueSartalRequests = () => {
    const newDb = getDB();
    const now = Date.now();
    const overdue = newDb.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status) && new Date(item.promisedAt).getTime() < now);
    overdue.forEach(item => {
      item.priority = 'urgent';
      item.assignedTo = 'Responsable expérience client';
    });
    saveDB(newDb);
    refresh();
    return overdue.length;
  };

  const transferSartalHouseholdPoints = (householdId: string, customerId: string, points: number) => {
    const newDb = getDB();
    const household = newDb.sartalHouseholds.find(item => item.id === householdId);
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    if (!household || !customer || !household.memberCustomerIds.includes(customerId) || points < 100 || household.sharedPoints < points) throw new Error('Transfert de points famille impossible');
    household.sharedPoints -= points;
    customer.loyaltyPoints += points;
    newDb.sartalLoyaltyTransactions.unshift({ id: `loyalty-${Date.now()}`, customerId, type: 'bonus', points, label: `Transfert ${household.name}`, referenceId: household.id, date: new Date().toISOString() });
    saveDB(newDb);
    refresh();
  };

  const saveSartalHouseholdCart = (householdId: string, customerId: string, items: Array<{ productId: string; quantity: number }>) => {
    const newDb = getDB();
    const household = newDb.sartalHouseholds.find(item => item.id === householdId);
    if (!household || !household.memberCustomerIds.includes(customerId)) throw new Error('Panier familial inaccessible');
    const now = new Date().toISOString();
    const otherMembersItems = (household.sharedCartItems || []).filter(item => item.addedByCustomerId !== customerId);
    const customerItems = items
      .filter(item => item.quantity > 0 && newDb.products.some(product => product.id === item.productId))
      .map(item => ({ ...item, addedByCustomerId: customerId, addedAt: now }));
    household.sharedCartItems = [...otherMembersItems, ...customerItems];
    household.sharedCartUpdatedAt = now;
    saveDB(newDb);
    refresh();
    return household.sharedCartItems.length;
  };

  const toggleSartalDeliveryPlus = (customerId: string) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    if (!customer) throw new Error('Client introuvable');
    const now = new Date();
    const active = customer.deliveryPlusStatus !== 'active';
    customer.deliveryPlusStatus = active ? 'active' : 'paused';
    customer.deliveryPlusMonthlyFee = 3500;
    if (active) {
      customer.deliveryPlusJoinedAt = customer.deliveryPlusJoinedAt || now.toISOString();
      customer.deliveryPlusRenewsAt = new Date(now.getTime() + 30 * 86400000).toISOString();
    }
    newDb.sartalCustomerMessages.push({ id: `message-delivery-plus-${Date.now()}`, customerId, context: 'delivery', sender: 'team', senderName: 'Sártal Livraison+', content: active ? 'Livraison+ est active : livraisons offertes et créneaux prioritaires.' : 'Livraison+ est en pause. Vos avantages restent disponibles jusqu’à la fin de la période.', sentAt: now.toISOString(), status: 'sent' });
    saveDB(newDb);
    refresh();
    return customer.deliveryPlusStatus;
  };

  const chargeSartalCorporateAccount = (accountId: string, customerId: string, amount: number) => {
    const newDb = getDB();
    const account = newDb.sartalCorporateAccounts.find(item => item.id === accountId && item.status === 'active');
    if (!account || !account.employeeCustomerIds.includes(customerId) || amount <= 0 || account.currentBalance + amount > account.monthlyLimit) throw new Error('Plafond ou compte entreprise invalide');
    account.currentBalance += amount;
    saveDB(newDb);
    refresh();
    return account.currentBalance;
  };

  const updateSartalBrandSettings = (patch: Partial<SartalBrandSettings>) => {
    const newDb = getDB();
    const next = { ...newDb.sartalBrandSettings, ...patch };
    const siteProfilesValid = next.siteProfiles.every(profile => profile.displayName.trim() && profile.supportPhone.trim() && /^#[0-9a-f]{6}$/i.test(profile.primaryColor) && /^#[0-9a-f]{6}$/i.test(profile.accentColor));
    if (!next.establishmentName.trim() || !next.backOfficeName.trim() || !next.staffAppName.trim() || !next.clientAppName.trim() || !next.hotelAppName.trim() || next.enabledModules.length === 0 || !siteProfilesValid || !/^#[0-9a-f]{6}$/i.test(next.primaryColor) || !/^#[0-9a-f]{6}$/i.test(next.accentColor)) throw new Error('Identité visuelle ou modules incomplets');
    newDb.sartalBrandSettings = next;
    saveDB(newDb);
    refresh();
  };

  const toggleLowBandwidthMode = (customerId: string, enabled: boolean) => {
    const newDb = getDB();
    const customer = newDb.sartalCustomers.find(item => item.id === customerId);
    if (!customer) throw new Error('Client introuvable');
    customer.lowBandwidthMode = enabled;
    saveDB(newDb);
    refresh();
  };

  const queueSartalOfflineAction = (customerId: string, actionType: SartalOfflineAction['actionType'], summary: string) => {
    const newDb = getDB();
    if (!newDb.sartalCustomers.some(item => item.id === customerId) || !summary.trim()) throw new Error('Action hors connexion invalide');
    const id = `offline-${Date.now()}`;
    newDb.sartalOfflineActions.unshift({ id, customerId, actionType, summary: summary.trim(), status: 'queued', createdAt: new Date().toISOString() });
    saveDB(newDb);
    refresh();
    return id;
  };

  const syncSartalOfflineActions = () => {
    const newDb = getDB();
    const now = new Date().toISOString();
    const queued = newDb.sartalOfflineActions.filter(item => item.status === 'queued');
    queued.forEach(item => { item.status = 'synced'; item.syncedAt = now; });
    saveDB(newDb);
    refresh();
    return queued.length;
  };

  const runSartalCommercialScenario = (scenario: SartalDemoRun['scenario']) => {
    const newDb = getDB();
    const definitions: Record<SartalDemoRun['scenario'], { label: string; evidence: string[] }> = {
      hotel_restaurant: {
        label: 'Séjour + dîner imputé sur chambre',
        evidence: [
          `${newDb.pmsReservations.filter(item => item.status === 'checked_in').length} séjour(s) actif(s) reconnu(s)`,
          `${newDb.externalSales.filter(item => item.paymentContext.type === 'room_charge').length} vente(s) restaurant reliée(s) à un folio`,
          `${newDb.movements.filter(item => item.type === 'sale_consumption' && Boolean(item.posId)).length} mouvement(s) stock traçable(s)`
        ]
      },
      family_delivery: {
        label: 'Famille + panier récurrent livré',
        evidence: [
          `${newDb.sartalHouseholds.length} compte(s) famille avec points partagés`,
          `${newDb.sartalRecurringOrders.filter(item => item.active).length} panier(s) récurrent(s) actif(s)`,
          `${newDb.deliveryOrders.filter(item => Boolean(item.customerId)).length} livraison(s) rattachée(s) au passeport client`
        ]
      },
      group_payment: {
        label: 'Table partagée + paiements séparés',
        evidence: [
          `${newDb.restaurantGuestInvites.length} invité(s) relié(s) à une table`,
          `${newDb.restaurantGuestInvites.filter(item => item.status === 'paid').length} part(s) réglée(s) séparément`,
          `${newDb.restaurantGuestOrders.filter(item => item.payments.length > 1).length} addition(s) multi-payeurs`
        ]
      }
    };
    const definition = definitions[scenario];
    const run: SartalDemoRun = { id: `demo-run-${Date.now()}`, scenario, label: definition.label, evidence: definition.evidence, status: 'completed', completedAt: new Date().toISOString() };
    newDb.sartalDemoRuns.unshift(run);
    saveDB(newDb);
    refresh();
    return run;
  };

  return {
    db,
    changeCurrentUser,
    saveEmployeeProfile,
    deleteEmployeeProfile,
    updateEmployeeAssignment,
    updateEmployeePermissions,
    startEmployeeShift,
    closeEmployeeShift,
    submitEmployeeWellbeingCheckIn,
    requestEmployeeSupport,
    updateEmployeeSupportRequest,
    requestEmployeeScheduleChange,
    respondEmployeeScheduleSwap,
    saveEmployeeSchedule,
    deleteEmployeeSchedule,
    reviewEmployeeScheduleChange,
    startEmployeeBreak,
    completeEmployeeBreak,
    addEmployeeRecognition,
    completeEmployeeLearning,
    updateEmployeeExperience,
    acknowledgeEmployeeHandover,
    sendEmployeeMessage,
    markEmployeeMessageRead,
    requestEmployeeApproval,
    decideEmployeeApproval,
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
    setPOSProductAvailability,
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
    addPMSReservationPayment,
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
    updatePMSGuestExperienceProfile,
    sendPMSGuestMessage,
    addPMSStayCompanion,
    sharePMSDoorKey,
    submitPMSGuestFeedback,
    completePMSGuestCheckout,
    requestPMSReturnStay,
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
    saveRestaurantDiningTable,
    deleteRestaurantDiningTable,
    createRestaurantReservation,
    updateRestaurantReservation,
    cancelRestaurantReservation,
    placeRestaurantGuestOrder,
    appendRestaurantGuestOrderItems,
    updateRestaurantGuestOrderItemNote,
    updateRestaurantGuestOrderStatus,
    addRestaurantGuestOrderPayment,
    createDeliveryCustomerOrder,
    updateDeliverySubstitutionPolicy,
    updateConfirmedDeliveryOrder,
    decideDeliverySubstitution,
    reorderDeliveryOrder,
    sendSartalCustomerMessage,
    submitSartalCustomerFeedback,
    confirmDeliveryProof,
    updateSartalCustomerProfile,
    findOrCreateSartalCustomer,
    createSartalGuestSession,
    saveSartalCustomerAddress,
    setDefaultSartalCustomerAddress,
    deleteSartalCustomerAddress,
    createSartalClientAccess,
    revokeSartalClientAccess,
    requestSartalService,
    updateSartalServiceRequest,
    inviteRestaurantGuest,
    payRestaurantGuestShare,
    redeemSartalPoints,
    resolveSartalCustomerFeedback,
    updateSartalJourneyItemStatus,
    updateSartalOccasionTask,
    completeSartalOccasionPlan,
    toggleFavoriteProduct,
    toggleSartalRecurringOrder,
    runSartalRecurringOrder,
    joinRestaurantWaitlist,
    updateRestaurantWaitlistStatus,
    completeDeliveryProof,
    applySartalRecoveryPlaybook,
    escalateOverdueSartalRequests,
    transferSartalHouseholdPoints,
    saveSartalHouseholdCart,
    toggleSartalDeliveryPlus,
    chargeSartalCorporateAccount,
    updateSartalBrandSettings,
    toggleLowBandwidthMode,
    queueSartalOfflineAction,
    syncSartalOfflineActions,
    runSartalCommercialScenario,
    resetAllData
  };
};
export type StockState = ReturnType<typeof useStockState>;
