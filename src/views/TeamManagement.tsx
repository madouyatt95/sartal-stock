import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Eye,
  KeyRound,
  MapPin,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X
} from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { EmployeeProfile, EmployeeRole, EmployeeSchedule } from '../types';
import { EMPLOYEE_PERMISSION_DEFINITIONS, getDefaultEmployeePermissions, getEmployeePermissions } from '../employeePermissions';
import EmployeeWorkspace from './EmployeeWorkspace';

type TeamTab = 'directory' | 'assignments' | 'planning' | 'permissions' | 'services' | 'preview';

type ScheduleDraft = Pick<EmployeeSchedule, 'employeeId' | 'siteId' | 'date' | 'startTime' | 'endTime' | 'assignmentLabel'> & {
  id?: string;
  status: Extract<EmployeeSchedule['status'], 'planned' | 'confirmed'>;
};

const ROLE_LABELS: Record<EmployeeRole, string> = {
  waiter: 'Serveur / Chef de rang',
  cashier: 'Caissier',
  kitchen: 'Cuisine / KDS',
  receptionist: 'Réceptionniste hôtel',
  housekeeper: 'Gouvernante / Étages',
  storekeeper: 'Magasinier',
  picker: 'Préparateur livraison',
  driver: 'Livreur',
  customer_experience: 'Responsable expérience client',
  service_manager: 'Manager de service'
};

const POS_ROLES: EmployeeRole[] = ['waiter', 'cashier', 'kitchen'];
const WAREHOUSE_ROLES: EmployeeRole[] = ['storekeeper', 'picker', 'driver'];

const SCHEDULE_STATUS_LABELS: Record<EmployeeSchedule['status'], string> = {
  planned: 'Planifié',
  confirmed: 'Confirmé',
  swap_requested: 'Échange demandé',
  swap_pending_colleague: 'Attente collègue',
  swap_colleague_accepted: 'À valider',
  swap_colleague_rejected: 'Échange refusé',
  leave_requested: 'Absence demandée',
  change_approved: 'Changement validé',
  change_rejected: 'Changement refusé'
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (dateKey: string, amount: number) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return formatDateKey(date);
};

const weekStartFor = (date = new Date()) => {
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return formatDateKey(date);
};

const roleScope = (role: EmployeeRole) => {
  if (POS_ROLES.includes(role)) return 'Point de vente';
  if (WAREHOUSE_ROLES.includes(role)) return 'Dépôt';
  if (['receptionist', 'housekeeper'].includes(role)) return 'Hôtel / PMS';
  return 'Établissement';
};

interface TeamManagementProps {
  state: StockState;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ state }) => {
  const { db } = state;
  const initialWeekStart = weekStartFor();
  const [tab, setTab] = useState<TeamTab>(db.currentUser.role === 'pos_manager' ? 'planning' : 'directory');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [draft, setDraft] = useState<EmployeeProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeProfile | null>(null);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [permissionEmployeeId, setPermissionEmployeeId] = useState(db.employeeProfiles[0]?.id || '');
  const [permissionDraft, setPermissionDraft] = useState(() => getEmployeePermissions(db.employeeProfiles[0] || { role: 'waiter' }));
  const [planningWeekStart, setPlanningWeekStart] = useState(initialWeekStart);
  const [selectedPlanningDay, setSelectedPlanningDay] = useState(formatDateKey(new Date()));
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft | null>(null);
  const [scheduleDeleteTarget, setScheduleDeleteTarget] = useState<EmployeeSchedule | null>(null);
  const canEditProfiles = ['admin', 'director'].includes(db.currentUser.role);
  const canAssign = ['admin', 'director', 'stock_manager', 'pos_manager'].includes(db.currentUser.role);
  const canConfigureRights = canEditProfiles;
  const managerPOS = db.currentUser.role === 'pos_manager' ? db.posList.find(item => item.id === db.currentUser.posId) : undefined;
  const managedEmployees = db.employeeProfiles.filter(employee => {
    if (canEditProfiles) return true;
    if (db.currentUser.role === 'pos_manager') return POS_ROLES.includes(employee.role) && employee.posId === managerPOS?.id;
    if (db.currentUser.role === 'stock_manager') return WAREHOUSE_ROLES.includes(employee.role);
    return false;
  });
  const visibleShifts = db.employeeShifts.filter(shift => managedEmployees.some(employee => employee.id === shift.employeeId));
  const visibleHandovers = db.employeeHandovers.filter(handover => canEditProfiles || managedEmployees.some(employee => employee.role === handover.role));
  const visibleApprovals = db.employeeApprovals.filter(approval => canEditProfiles || managedEmployees.some(employee => employee.id === approval.requestedBy));
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(planningWeekStart, index));
  const visibleSchedules = db.employeeSchedules.filter(schedule => managedEmployees.some(employee => employee.id === schedule.employeeId));
  const weekSchedules = visibleSchedules.filter(schedule => schedule.date >= weekDays[0] && schedule.date <= weekDays[6]);
  const scheduleRequests = visibleSchedules.filter(schedule => ['swap_colleague_accepted', 'leave_requested'].includes(schedule.status));

  const assignmentFor = (employee: EmployeeProfile) => {
    if (employee.posId) return db.posList.find(item => item.id === employee.posId)?.name || 'POS à vérifier';
    if (employee.warehouseId) return db.warehouses.find(item => item.id === employee.warehouseId)?.name || 'Dépôt à vérifier';
    if (['receptionist', 'housekeeper'].includes(employee.role)) return 'Hôtel / PMS';
    if (employee.role === 'customer_experience') return 'Parcours clients';
    if (employee.role === 'service_manager') return 'Tous les services';
    return 'Non affecté';
  };

  const assignmentOptions = (employee: Pick<EmployeeProfile, 'role' | 'siteId'>) => {
    if (POS_ROLES.includes(employee.role)) return db.posList.filter(item => item.siteId === employee.siteId && (db.currentUser.role !== 'pos_manager' || item.id === managerPOS?.id)).map(item => ({ id: item.id, label: item.name }));
    if (WAREHOUSE_ROLES.includes(employee.role)) return db.warehouses.filter(item => item.siteId === employee.siteId).map(item => ({ id: item.id, label: item.name }));
    return [];
  };

  const assignmentIdFor = (employee: EmployeeProfile) => employee.posId || employee.warehouseId || employee.siteId;
  const openShiftFor = (employeeId: string) => db.employeeShifts.find(item => item.employeeId === employeeId && item.status === 'open');

  const filteredEmployees = (() => {
    const normalized = query.trim().toLowerCase();
    return managedEmployees.filter(employee => {
      if (roleFilter !== 'all' && employee.role !== roleFilter) return false;
      if (statusFilter === 'active' && !employee.active) return false;
      if (statusFilter === 'inactive' && employee.active) return false;
      return !normalized || `${employee.name} ${employee.employeeNumber} ${employee.phone} ${ROLE_LABELS[employee.role]} ${assignmentFor(employee)}`.toLowerCase().includes(normalized);
    });
  })();

  const execute = (action: () => unknown, success: string) => {
    try {
      action();
      setNotice({ tone: 'success', text: success });
    } catch (error) {
      setNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Action impossible' });
    }
  };

  const createDraft = () => {
    const siteId = db.sites[0]?.id || '';
    setFormError('');
    setDraft({
      id: '',
      employeeNumber: '',
      name: '',
      role: 'waiter',
      siteId,
      phone: '+221 ',
      posId: db.posList.find(item => item.siteId === siteId)?.id,
      active: true
    });
  };

  const updateDraftScope = (role: EmployeeRole, siteId: string) => {
    const options = assignmentOptions({ role, siteId });
    setDraft(current => current ? {
      ...current,
      role,
      siteId,
      posId: POS_ROLES.includes(role) ? options[0]?.id : undefined,
      warehouseId: WAREHOUSE_ROLES.includes(role) ? options[0]?.id : undefined
    } : current);
  };

  const saveDraft = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    try {
      state.saveEmployeeProfile(draft);
      setNotice({ tone: 'success', text: draft.id ? 'Profil et affectation mis à jour.' : 'Collaborateur ajouté à l’équipe.' });
      setDraft(null);
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Enregistrement impossible');
    }
  };

  const saveAssignment = (employee: EmployeeProfile, assignmentId: string) => {
    execute(() => state.updateEmployeeAssignment(employee.id, assignmentId), `Affectation de ${employee.name} mise à jour.`);
  };

  const movePlanningWeek = (days: number) => {
    const nextStart = addDays(planningWeekStart, days);
    setPlanningWeekStart(nextStart);
    setSelectedPlanningDay(nextStart);
  };

  const returnToCurrentWeek = () => {
    const today = formatDateKey(new Date());
    setPlanningWeekStart(weekStartFor());
    setSelectedPlanningDay(today);
  };

  const createScheduleDraft = (date = selectedPlanningDay) => {
    const employee = managedEmployees.find(item => item.active);
    if (!employee) {
      setNotice({ tone: 'danger', text: 'Aucun collaborateur actif dans votre périmètre.' });
      return;
    }
    setFormError('');
    setScheduleDraft({
      employeeId: employee.id,
      siteId: employee.siteId,
      date,
      startTime: POS_ROLES.includes(employee.role) ? '15:00' : '08:00',
      endTime: POS_ROLES.includes(employee.role) ? '23:30' : '16:00',
      assignmentLabel: assignmentFor(employee),
      status: 'confirmed'
    });
  };

  const editSchedule = (schedule: EmployeeSchedule) => {
    setFormError('');
    setScheduleDraft({
      id: schedule.id,
      employeeId: schedule.employeeId,
      siteId: schedule.siteId,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      assignmentLabel: schedule.assignmentLabel,
      status: schedule.status === 'planned' ? 'planned' : 'confirmed'
    });
  };

  const updateScheduleEmployee = (employeeId: string) => {
    const employee = managedEmployees.find(item => item.id === employeeId);
    if (!employee) return;
    setScheduleDraft(current => current ? {
      ...current,
      employeeId: employee.id,
      siteId: employee.siteId,
      assignmentLabel: assignmentFor(employee)
    } : current);
  };

  const saveSchedule = (event: React.FormEvent) => {
    event.preventDefault();
    if (!scheduleDraft) return;
    try {
      state.saveEmployeeSchedule(scheduleDraft, db.currentUser.id);
      setNotice({ tone: 'success', text: scheduleDraft.id ? 'Service mis à jour et visible dans le planning.' : 'Service ajouté au planning de l’équipe.' });
      setScheduleDraft(null);
      setSelectedPlanningDay(scheduleDraft.date);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Enregistrement du service impossible');
    }
  };

  const removeSchedule = () => {
    if (!scheduleDeleteTarget) return;
    try {
      state.deleteEmployeeSchedule(scheduleDeleteTarget.id, db.currentUser.id);
      setNotice({ tone: 'success', text: 'Service retiré du planning.' });
    } catch (error) {
      setNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Suppression du service impossible' });
    } finally {
      setScheduleDeleteTarget(null);
    }
  };

  const reviewScheduleRequest = (schedule: EmployeeSchedule, approved: boolean) => {
    const employee = managedEmployees.find(item => item.id === schedule.employeeId);
    execute(
      () => state.reviewEmployeeScheduleChange(schedule.id, db.currentUser.id, approved),
      `${approved ? 'Changement validé' : 'Demande refusée'} pour ${employee?.name || 'le collaborateur'}.`
    );
  };

  const toggleActive = (employee: EmployeeProfile) => {
    execute(
      () => state.saveEmployeeProfile({ ...employee, active: !employee.active }),
      employee.active ? `Accès de ${employee.name} désactivé.` : `Accès de ${employee.name} réactivé.`
    );
  };

  const remove = () => {
    if (!deleteTarget) return;
    try {
      state.deleteEmployeeProfile(deleteTarget.id);
      setNotice({ tone: 'success', text: `${deleteTarget.name} a été supprimé.` });
      setDeleteTarget(null);
    } catch (error) {
      setNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Suppression impossible' });
      setDeleteTarget(null);
    }
  };

  const openStandalone = () => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('equipe', '1');
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  const selectPermissionEmployee = (employeeId: string) => {
    const employee = db.employeeProfiles.find(item => item.id === employeeId);
    if (!employee) return;
    setPermissionEmployeeId(employee.id);
    setPermissionDraft(getEmployeePermissions(employee));
  };

  const savePermissions = () => {
    const employee = db.employeeProfiles.find(item => item.id === permissionEmployeeId);
    if (!employee) return;
    execute(() => state.updateEmployeePermissions(employee.id, permissionDraft), `Droits de ${employee.name} enregistrés.`);
  };

  const selectedPermissionEmployee = db.employeeProfiles.find(item => item.id === permissionEmployeeId) || db.employeeProfiles[0];
  const permissionGroups = Array.from(new Set(EMPLOYEE_PERMISSION_DEFINITIONS.map(item => item.group)));

  const tabs: Array<{ id: TeamTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'directory', label: 'Collaborateurs', icon: <UsersRound size={18} />, count: managedEmployees.length },
    { id: 'assignments', label: 'Affectations', icon: <MapPin size={18} />, count: managedEmployees.filter(item => item.active).length },
    { id: 'planning', label: 'Planning', icon: <CalendarDays size={18} />, count: scheduleRequests.length },
    ...(canConfigureRights ? [{ id: 'permissions' as const, label: 'Droits & validations', icon: <KeyRound size={18} /> }] : []),
    { id: 'services', label: 'Services & passations', icon: <Clock3 size={18} />, count: db.employeeShifts.filter(item => item.status === 'open' && managedEmployees.some(employee => employee.id === item.employeeId)).length },
    ...(canEditProfiles ? [{ id: 'preview' as const, label: 'Aperçu des postes', icon: <Eye size={18} /> }] : [])
  ];

  return <section className="team-management-page">
    <header className="team-management-hero">
      <div><span>ÉQUIPES & ACCÈS</span><h1>Les bonnes personnes, au bon poste</h1><p>{canEditProfiles ? 'Créez les profils, attribuez les métiers, les affectations et les droits individuels depuis un seul répertoire.' : 'Consultez votre équipe et adaptez les affectations opérationnelles sans modifier les profils collaborateurs.'}</p></div>
      {canEditProfiles ? <button className="btn btn-primary" onClick={createDraft}><Plus size={17} /> Ajouter un collaborateur</button> : <span className="team-readonly"><ShieldCheck size={17} /> Affectations et planning de mon équipe</span>}
    </header>

    <section className="team-kpis" aria-label="Situation des équipes">
      <article><UsersRound size={20} /><span><small>Collaborateurs actifs</small><strong>{managedEmployees.filter(item => item.active).length}</strong></span></article>
      <article><CheckCircle2 size={20} /><span><small>En service maintenant</small><strong>{db.employeeShifts.filter(item => item.status === 'open' && managedEmployees.some(employee => employee.id === item.employeeId)).length}</strong></span></article>
      <article><MapPin size={20} /><span><small>Affectations configurées</small><strong>{managedEmployees.filter(item => item.posId || item.warehouseId || ['receptionist', 'housekeeper', 'customer_experience', 'service_manager'].includes(item.role)).length}</strong></span></article>
      <article><AlertCircle size={20} /><span><small>Validations en attente</small><strong>{visibleApprovals.filter(item => item.status === 'pending').length}</strong></span></article>
    </section>

    <nav className="team-tabs" aria-label="Gestion des équipes">
      {tabs.map(item => <button className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => setTab(item.id)}>{item.icon}<span>{item.label}</span>{typeof item.count === 'number' && <b>{item.count}</b>}</button>)}
    </nav>

    {notice && <div className={`team-notice ${notice.tone}`}><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Fermer"><X size={16} /></button></div>}

    {tab === 'directory' && <section className="team-panel">
      <header className="team-panel-heading"><div><h2>Répertoire des collaborateurs</h2><p>Un profil unique pilote le poste, les droits métier et la traçabilité nominative.</p></div><b>{filteredEmployees.length} résultat(s)</b></header>
      <div className="team-filters">
        <label className="team-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, matricule, téléphone, affectation..." /></label>
        <select value={roleFilter} onChange={event => setRoleFilter(event.target.value as EmployeeRole | 'all')}><option value="all">Tous les métiers</option>{Object.entries(ROLE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">Tous les statuts</option><option value="active">Actifs</option><option value="inactive">Inactifs</option></select>
      </div>
      <div className="team-directory">
        {filteredEmployees.map(employee => {
          const shift = openShiftFor(employee.id);
          return <article className={!employee.active ? 'inactive' : ''} key={employee.id}>
            <span className="team-avatar">{employee.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span>
            <div className="team-identity"><header><strong>{employee.name}</strong><span className={employee.active ? 'active' : 'inactive'}>{employee.active ? 'Actif' : 'Inactif'}</span>{shift && <span className="on-shift">En service</span>}</header><p>{ROLE_LABELS[employee.role]}</p><small>{employee.employeeNumber} · {employee.phone}</small></div>
            <div className="team-assignment"><small>{roleScope(employee.role)}</small><strong>{assignmentFor(employee)}</strong><span>{db.sites.find(item => item.id === employee.siteId)?.name}</span></div>
            {canEditProfiles && <div className="team-row-actions"><button onClick={() => { setFormError(''); setDraft({ ...employee }); }} title="Modifier"><Pencil size={16} /><span>Modifier</span></button><button onClick={() => toggleActive(employee)} title={employee.active ? 'Désactiver' : 'Réactiver'}><Power size={16} /><span>{employee.active ? 'Désactiver' : 'Réactiver'}</span></button><button className="danger" onClick={() => setDeleteTarget(employee)} title="Supprimer"><Trash2 size={16} /><span>Supprimer</span></button></div>}
          </article>;
        })}
        {filteredEmployees.length === 0 && <div className="team-empty"><Search size={28} /><strong>Aucun collaborateur trouvé</strong><span>Modifiez la recherche ou les filtres.</span></div>}
      </div>
    </section>}

    {tab === 'assignments' && <section className="team-panel">
      <header className="team-panel-heading"><div><h2>Affectations opérationnelles</h2><p>Le POS ou le dépôt choisi limite les données et les actions disponibles pendant le service.</p></div><b>{db.sites.length} établissement(s)</b></header>
      <div className="team-assignment-list">
        {managedEmployees.filter(item => item.active).map(employee => {
          const options = assignmentOptions(employee);
          return <article key={employee.id}><span className="team-avatar">{employee.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{employee.name}</strong><small>{ROLE_LABELS[employee.role]} · {db.sites.find(item => item.id === employee.siteId)?.name}</small></div><label><span>{roleScope(employee.role)}</span>{options.length ? <select disabled={!canAssign || Boolean(openShiftFor(employee.id))} value={assignmentIdFor(employee)} onChange={event => saveAssignment(employee, event.target.value)}>{options.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select> : <strong>{assignmentFor(employee)}</strong>}</label><span className={openShiftFor(employee.id) ? 'assignment-locked' : 'assignment-ready'}>{openShiftFor(employee.id) ? 'Verrouillé pendant le service' : canAssign && options.length ? 'Modifiable immédiatement' : 'Consultation'}</span></article>;
        })}
      </div>
    </section>}

    {tab === 'planning' && <section className="team-panel team-planning-panel">
      <header className="team-panel-heading team-planning-heading">
        <div><h2>Planning de l’équipe</h2><p>Construisez la semaine, publiez les services et arbitrez les demandes après l’accord des collègues.</p></div>
        {canAssign && <button className="btn btn-primary" onClick={() => createScheduleDraft()}><Plus size={17} /> Planifier un service</button>}
      </header>

      <div className="team-planning-toolbar">
        <div className="team-week-navigation">
          <button onClick={() => movePlanningWeek(-7)} aria-label="Semaine précédente"><ChevronLeft size={18} /></button>
          <span><small>Semaine affichée</small><strong>{new Date(`${weekDays[0]}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - {new Date(`${weekDays[6]}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
          <button onClick={() => movePlanningWeek(7)} aria-label="Semaine suivante"><ChevronRight size={18} /></button>
        </div>
        <button className="team-today-button" onClick={returnToCurrentWeek}>Aujourd’hui</button>
        <div className="team-planning-summary"><span><strong>{weekSchedules.length}</strong><small>services</small></span><span><strong>{new Set(weekSchedules.map(item => item.employeeId)).size}</strong><small>personnes planifiées</small></span><span className={scheduleRequests.length ? 'attention' : ''}><strong>{scheduleRequests.length}</strong><small>demandes à décider</small></span></div>
      </div>

      {scheduleRequests.length > 0 && <section className="team-planning-requests">
        <header><AlertCircle size={19} /><div><strong>Décisions attendues</strong><small>Un échange n’arrive ici qu’après l’accord du collègue.</small></div></header>
        <div>{scheduleRequests.map(schedule => {
          const employee = managedEmployees.find(item => item.id === schedule.employeeId);
          const colleague = managedEmployees.find(item => item.id === schedule.requestedColleagueId);
          return <article key={schedule.id}><div><span>{schedule.status === 'swap_colleague_accepted' ? 'Échange accepté' : 'Demande d’absence'}</span><strong>{employee?.name || 'Collaborateur'} · {new Date(`${schedule.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</strong><p>{schedule.status === 'swap_colleague_accepted' ? `${colleague?.name || 'Le collègue'} a donné son accord. La décision finale vous revient.` : schedule.requestNote || 'Demande personnelle à examiner.'}</p><small>{schedule.startTime}-{schedule.endTime} · {schedule.assignmentLabel}</small></div><footer><button onClick={() => reviewScheduleRequest(schedule, false)}>Refuser</button><button className="primary" onClick={() => reviewScheduleRequest(schedule, true)}>Valider</button></footer></article>;
        })}</div>
      </section>}

      <nav className="team-mobile-days" aria-label="Jour du planning">
        {weekDays.map(day => <button className={selectedPlanningDay === day ? 'active' : ''} key={day} onClick={() => setSelectedPlanningDay(day)}><span>{new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' })}</span><strong>{new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit' })}</strong></button>)}
      </nav>

      <div className="team-planning-week">
        {weekDays.map(day => {
          const daySchedules = weekSchedules.filter(item => item.date === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
          const isToday = day === formatDateKey(new Date());
          return <section className={`${selectedPlanningDay === day ? 'selected' : ''} ${isToday ? 'today' : ''}`} key={day}>
            <header><span>{new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long' })}</span><strong>{new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</strong>{isToday && <b>Aujourd’hui</b>}</header>
            <div>{daySchedules.map(schedule => {
              const employee = managedEmployees.find(item => item.id === schedule.employeeId);
              const engaged = ['swap_pending_colleague', 'swap_colleague_accepted', 'leave_requested'].includes(schedule.status)
                || visibleSchedules.some(item => item.requestedColleagueScheduleId === schedule.id && ['swap_pending_colleague', 'swap_colleague_accepted'].includes(item.status));
              return <article className={schedule.status} key={schedule.id}>
                <header><span className="team-avatar">{employee?.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{employee?.name || 'Collaborateur'}</strong><small>{employee ? ROLE_LABELS[employee.role] : 'Profil introuvable'}</small></div><b>{SCHEDULE_STATUS_LABELS[schedule.status]}</b></header>
                <div className="team-schedule-time"><Clock3 size={16} /><strong>{schedule.startTime}-{schedule.endTime}</strong></div>
                <p><MapPin size={15} /> {schedule.assignmentLabel}</p>
                {schedule.managerNote && <small className="team-schedule-note">{schedule.managerNote}</small>}
                {canAssign && <footer><button disabled={engaged} onClick={() => editSchedule(schedule)}><Pencil size={15} /> Modifier</button><button className="danger" disabled={engaged} onClick={() => setScheduleDeleteTarget(schedule)}><Trash2 size={15} /> Retirer</button></footer>}
              </article>;
            })}{daySchedules.length === 0 && <button className="team-empty-day" disabled={!canAssign} onClick={() => createScheduleDraft(day)}><Plus size={17} /><span>Aucun service</span><small>{canAssign ? 'Ajouter sur ce jour' : 'Aucune affectation prévue'}</small></button>}</div>
          </section>;
        })}
      </div>
    </section>}

    {tab === 'permissions' && canConfigureRights && selectedPermissionEmployee && <section className="team-panel team-permissions-panel">
      <header className="team-panel-heading"><div><h2>Droits et validations</h2><p>Le métier fournit une base cohérente. La direction peut ensuite retirer ou ajouter une habilitation nominative.</p></div><b>{permissionDraft.length} droit(s) actif(s)</b></header>
      <div className="team-permission-layout">
        <aside><label>Collaborateur<select value={selectedPermissionEmployee.id} onChange={event => selectPermissionEmployee(event.target.value)}>{db.employeeProfiles.filter(item => item.active).map(employee => <option value={employee.id} key={employee.id}>{employee.name} · {ROLE_LABELS[employee.role]}</option>)}</select></label><div className="team-permission-person"><span className="team-avatar">{selectedPermissionEmployee.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{selectedPermissionEmployee.name}</strong><small>{ROLE_LABELS[selectedPermissionEmployee.role]}</small><span>{assignmentFor(selectedPermissionEmployee)}</span></div></div><button onClick={() => setPermissionDraft(getDefaultEmployeePermissions(selectedPermissionEmployee.role))}><RotateCcw size={15} /> Réinitialiser selon le métier</button></aside>
        <div className="team-permission-groups">{permissionGroups.map(group => <section key={group}><header><strong>{group}</strong><small>{EMPLOYEE_PERMISSION_DEFINITIONS.filter(item => item.group === group && permissionDraft.includes(item.id)).length}/{EMPLOYEE_PERMISSION_DEFINITIONS.filter(item => item.group === group).length} actif(s)</small></header>{EMPLOYEE_PERMISSION_DEFINITIONS.filter(item => item.group === group).map(permission => <label className={permissionDraft.includes(permission.id) ? 'active' : ''} key={permission.id}><input type="checkbox" checked={permissionDraft.includes(permission.id)} onChange={() => setPermissionDraft(current => current.includes(permission.id) ? current.filter(item => item !== permission.id) : [...current, permission.id])} /><span><strong>{permission.label}</strong><small>{permission.description}</small></span></label>)}</section>)}</div>
      </div>
      <footer className="team-permission-actions"><span><ShieldCheck size={17} /> Les changements s’appliquent à la prochaine action du collaborateur.</span><button className="btn btn-primary" onClick={savePermissions}><CheckCircle2 size={16} /> Enregistrer les droits</button></footer>
    </section>}

    {tab === 'services' && <section className="team-panel">
      <header className="team-panel-heading"><div><h2>Services et passations</h2><p>Suivez les postes ouverts, les appareils utilisés et les consignes transmises entre équipes.</p></div><b>{visibleShifts.length} service(s) tracé(s)</b></header>
      <div className="team-service-grid"><section><header><CheckCircle2 size={18} /><div><strong>Postes ouverts</strong><small>Situation en temps réel</small></div></header>{visibleShifts.filter(item => item.status === 'open').map(shift => { const employee = db.employeeProfiles.find(item => item.id === shift.employeeId); return <article key={shift.id}><span><strong>{employee?.name || 'Collaborateur'}</strong><small>{ROLE_LABELS[shift.role]} · {shift.assignmentLabel}</small></span><div><b>{new Date(shift.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</b><small>{shift.deviceLabel}</small></div></article>; })}{visibleShifts.every(item => item.status !== 'open') && <div className="team-empty compact"><Clock3 size={24} /><strong>Aucun poste ouvert</strong></div>}</section><section><header><ClipboardCheck size={18} /><div><strong>Dernières passations</strong><small>Continuité entre les équipes</small></div></header>{visibleHandovers.slice(0, 8).map(handover => <article key={handover.id}><span><strong>{handover.employeeName}</strong><small>{handover.notes}</small></span><div><b className={handover.status}>{handover.status === 'acknowledged' ? 'Reprise confirmée' : 'À reprendre'}</b><small>{new Date(handover.submittedAt).toLocaleString('fr-FR')}</small></div></article>)}</section></div>
    </section>}

    {tab === 'preview' && canEditProfiles && <section className="team-preview-panel"><header><div><span>APERÇU DES COLLABORATEURS</span><h2>{db.sartalBrandSettings.staffAppName}</h2><p>Testez ici le poste de chaque métier. L’interface autonome s’ouvre sans les menus de direction.</p></div><button className="btn btn-primary" onClick={openStandalone}><ExternalLink size={17} /> Ouvrir dans un nouvel onglet</button></header><EmployeeWorkspace state={state} /></section>}

    {scheduleDraft && <div className="modal-overlay" onClick={() => setScheduleDraft(null)}><form className="modal-card team-schedule-modal" onSubmit={saveSchedule} onClick={event => event.stopPropagation()}><div className="modal-header"><div><span>PLANNING ÉQUIPE</span><h2>{scheduleDraft.id ? 'Modifier le service' : 'Planifier un service'}</h2><p>Le collaborateur retrouvera immédiatement ce créneau dans son espace Planning.</p></div><button type="button" className="icon-btn" onClick={() => setScheduleDraft(null)} aria-label="Fermer"><X size={19} /></button></div>{formError && <div className="team-form-error"><AlertCircle size={17} /> {formError}</div>}<div className="team-schedule-form-grid"><label>Collaborateur<select className="form-control" value={scheduleDraft.employeeId} disabled={Boolean(scheduleDraft.id)} onChange={event => updateScheduleEmployee(event.target.value)}>{managedEmployees.filter(item => item.active).map(employee => <option value={employee.id} key={employee.id}>{employee.name} · {ROLE_LABELS[employee.role]}</option>)}</select></label><label>Date<input className="form-control" type="date" min={formatDateKey(new Date())} value={scheduleDraft.date} onChange={event => setScheduleDraft({ ...scheduleDraft, date: event.target.value })} required /></label><label>Début<input className="form-control" type="time" value={scheduleDraft.startTime} onChange={event => setScheduleDraft({ ...scheduleDraft, startTime: event.target.value })} required /></label><label>Fin<input className="form-control" type="time" value={scheduleDraft.endTime} onChange={event => setScheduleDraft({ ...scheduleDraft, endTime: event.target.value })} required /></label><label className="wide">Poste, POS ou zone<input className="form-control" value={scheduleDraft.assignmentLabel} onChange={event => setScheduleDraft({ ...scheduleDraft, assignmentLabel: event.target.value })} placeholder="Ex. Restaurant La Terrasse · Salle principale" required /></label><label className="wide">Visibilité<select className="form-control" value={scheduleDraft.status} onChange={event => setScheduleDraft({ ...scheduleDraft, status: event.target.value as ScheduleDraft['status'] })}><option value="confirmed">Confirmé à l’équipe</option><option value="planned">Planifié · à confirmer</option></select></label></div><div className="team-schedule-summary"><CalendarDays size={20} /><span><small>Créneau préparé</small><strong>{db.employeeProfiles.find(item => item.id === scheduleDraft.employeeId)?.name} · {new Date(`${scheduleDraft.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {scheduleDraft.startTime}-{scheduleDraft.endTime}</strong></span></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setScheduleDraft(null)}>Annuler</button><button className="btn btn-primary" type="submit"><CheckCircle2 size={16} /> Enregistrer le service</button></div></form></div>}

    {scheduleDeleteTarget && <div className="modal-overlay" onClick={() => setScheduleDeleteTarget(null)}><section className="modal-card modal-card-sm team-delete-modal" onClick={event => event.stopPropagation()}><div className="modal-header"><div><span>PLANNING ÉQUIPE</span><h2>Retirer ce service ?</h2><p>{db.employeeProfiles.find(item => item.id === scheduleDeleteTarget.employeeId)?.name} · {new Date(`${scheduleDeleteTarget.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {scheduleDeleteTarget.startTime}-{scheduleDeleteTarget.endTime}</p></div><button className="icon-btn" onClick={() => setScheduleDeleteTarget(null)} aria-label="Fermer"><X size={19} /></button></div><div className="modal-actions"><button className="btn btn-secondary" onClick={() => setScheduleDeleteTarget(null)}>Conserver</button><button className="btn btn-danger" onClick={removeSchedule}><Trash2 size={16} /> Retirer du planning</button></div></section></div>}

    {draft && <div className="modal-overlay" onClick={() => setDraft(null)}><form className="modal-card team-employee-modal" onSubmit={saveDraft} onClick={event => event.stopPropagation()}><div className="modal-header"><div><span>PROFIL & AFFECTATION</span><h2>{draft.id ? 'Modifier le collaborateur' : 'Ajouter un collaborateur'}</h2><p>Le métier et l’affectation déterminent son interface quotidienne.</p></div><button type="button" className="icon-btn" onClick={() => setDraft(null)} aria-label="Fermer"><X size={19} /></button></div>{formError && <div className="team-form-error"><AlertCircle size={17} /> {formError}</div>}<div className="team-form-grid"><label>Matricule<input className="form-control" value={draft.employeeNumber} onChange={event => setDraft({ ...draft, employeeNumber: event.target.value })} placeholder="SAL-001" required /></label><label>Nom complet<input className="form-control" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} required /></label><label>Téléphone<input className="form-control" type="tel" value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} required /></label><label>Établissement<select className="form-control" value={draft.siteId} onChange={event => updateDraftScope(draft.role, event.target.value)}>{db.sites.map(site => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label><label>Métier / rôle<select className="form-control" value={draft.role} onChange={event => updateDraftScope(event.target.value as EmployeeRole, draft.siteId)}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>{assignmentOptions(draft).length > 0 && <label>{roleScope(draft.role)}<select className="form-control" value={assignmentIdFor(draft)} onChange={event => setDraft({ ...draft, posId: POS_ROLES.includes(draft.role) ? event.target.value : undefined, warehouseId: WAREHOUSE_ROLES.includes(draft.role) ? event.target.value : undefined })}>{assignmentOptions(draft).map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>}<label className="team-active-field"><input type="checkbox" checked={draft.active} onChange={event => setDraft({ ...draft, active: event.target.checked })} /><span><strong>Accès actif</strong><small>Le collaborateur peut se connecter et prendre son service.</small></span></label></div><div className="team-scope-summary"><Building2 size={18} /><span><small>Périmètre appliqué</small><strong>{db.sites.find(item => item.id === draft.siteId)?.name} · {roleScope(draft.role)} · {assignmentFor(draft)}</strong></span></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setDraft(null)}>Annuler</button><button className="btn btn-primary" type="submit"><CheckCircle2 size={16} /> Enregistrer</button></div></form></div>}

    {deleteTarget && <div className="modal-overlay" onClick={() => setDeleteTarget(null)}><section className="modal-card modal-card-sm team-delete-modal" onClick={event => event.stopPropagation()}><div className="modal-header"><div><span>SUPPRESSION PROTÉGÉE</span><h2>Supprimer {deleteTarget.name} ?</h2><p>Si ce profil possède déjà un historique de service, Sártal demandera de le désactiver afin de conserver la traçabilité.</p></div><button className="icon-btn" onClick={() => setDeleteTarget(null)} aria-label="Fermer"><X size={19} /></button></div><div className="modal-actions"><button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Conserver</button><button className="btn btn-danger" onClick={remove}><Trash2 size={16} /> Supprimer</button></div></section></div>}
  </section>;
};

export default TeamManagement;
