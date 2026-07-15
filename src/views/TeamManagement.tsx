import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X
} from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { EmployeeProfile, EmployeeRole } from '../types';
import EmployeeWorkspace from './EmployeeWorkspace';

type TeamTab = 'directory' | 'assignments' | 'services' | 'preview';

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
  const [tab, setTab] = useState<TeamTab>('directory');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [draft, setDraft] = useState<EmployeeProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeProfile | null>(null);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const canManage = ['admin', 'director'].includes(db.currentUser.role);

  const assignmentFor = (employee: EmployeeProfile) => {
    if (employee.posId) return db.posList.find(item => item.id === employee.posId)?.name || 'POS à vérifier';
    if (employee.warehouseId) return db.warehouses.find(item => item.id === employee.warehouseId)?.name || 'Dépôt à vérifier';
    if (['receptionist', 'housekeeper'].includes(employee.role)) return 'Hôtel / PMS';
    if (employee.role === 'customer_experience') return 'Parcours clients';
    if (employee.role === 'service_manager') return 'Tous les services';
    return 'Non affecté';
  };

  const assignmentOptions = (employee: Pick<EmployeeProfile, 'role' | 'siteId'>) => {
    if (POS_ROLES.includes(employee.role)) return db.posList.filter(item => item.siteId === employee.siteId).map(item => ({ id: item.id, label: item.name }));
    if (WAREHOUSE_ROLES.includes(employee.role)) return db.warehouses.filter(item => item.siteId === employee.siteId).map(item => ({ id: item.id, label: item.name }));
    return [];
  };

  const assignmentIdFor = (employee: EmployeeProfile) => employee.posId || employee.warehouseId || employee.siteId;
  const openShiftFor = (employeeId: string) => db.employeeShifts.find(item => item.employeeId === employeeId && item.status === 'open');

  const filteredEmployees = (() => {
    const normalized = query.trim().toLowerCase();
    return db.employeeProfiles.filter(employee => {
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
    const next = {
      ...employee,
      posId: POS_ROLES.includes(employee.role) ? assignmentId : undefined,
      warehouseId: WAREHOUSE_ROLES.includes(employee.role) ? assignmentId : undefined
    };
    execute(() => state.saveEmployeeProfile(next), `Affectation de ${employee.name} mise à jour.`);
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

  const tabs: Array<{ id: TeamTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'directory', label: 'Collaborateurs', icon: <UsersRound size={18} />, count: db.employeeProfiles.length },
    { id: 'assignments', label: 'Affectations', icon: <MapPin size={18} />, count: db.employeeProfiles.filter(item => item.active).length },
    { id: 'services', label: 'Services & passations', icon: <Clock3 size={18} />, count: db.employeeShifts.filter(item => item.status === 'open').length },
    { id: 'preview', label: 'Aperçu des postes', icon: <Eye size={18} /> }
  ];

  return <section className="team-management-page">
    <header className="team-management-hero">
      <div><span>ÉQUIPES & ACCÈS</span><h1>Les bonnes personnes, au bon poste</h1><p>Créez les collaborateurs, attribuez leur métier, leur établissement et leur POS ou dépôt. Leur espace de travail s’adapte automatiquement à cette affectation.</p></div>
      {canManage ? <button className="btn btn-primary" onClick={createDraft}><Plus size={17} /> Ajouter un collaborateur</button> : <span className="team-readonly"><ShieldCheck size={17} /> Consultation selon votre rôle</span>}
    </header>

    <section className="team-kpis" aria-label="Situation des équipes">
      <article><UsersRound size={20} /><span><small>Collaborateurs actifs</small><strong>{db.employeeProfiles.filter(item => item.active).length}</strong></span></article>
      <article><CheckCircle2 size={20} /><span><small>En service maintenant</small><strong>{db.employeeShifts.filter(item => item.status === 'open').length}</strong></span></article>
      <article><MapPin size={20} /><span><small>Affectations configurées</small><strong>{db.employeeProfiles.filter(item => item.posId || item.warehouseId || ['receptionist', 'housekeeper', 'customer_experience', 'service_manager'].includes(item.role)).length}</strong></span></article>
      <article><AlertCircle size={20} /><span><small>Validations en attente</small><strong>{db.employeeApprovals.filter(item => item.status === 'pending').length}</strong></span></article>
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
            {canManage && <div className="team-row-actions"><button onClick={() => { setFormError(''); setDraft({ ...employee }); }} title="Modifier"><Pencil size={16} /><span>Modifier</span></button><button onClick={() => toggleActive(employee)} title={employee.active ? 'Désactiver' : 'Réactiver'}><Power size={16} /><span>{employee.active ? 'Désactiver' : 'Réactiver'}</span></button><button className="danger" onClick={() => setDeleteTarget(employee)} title="Supprimer"><Trash2 size={16} /><span>Supprimer</span></button></div>}
          </article>;
        })}
        {filteredEmployees.length === 0 && <div className="team-empty"><Search size={28} /><strong>Aucun collaborateur trouvé</strong><span>Modifiez la recherche ou les filtres.</span></div>}
      </div>
    </section>}

    {tab === 'assignments' && <section className="team-panel">
      <header className="team-panel-heading"><div><h2>Affectations opérationnelles</h2><p>Le POS ou le dépôt choisi limite les données et les actions disponibles pendant le service.</p></div><b>{db.sites.length} établissement(s)</b></header>
      <div className="team-assignment-list">
        {db.employeeProfiles.filter(item => item.active).map(employee => {
          const options = assignmentOptions(employee);
          return <article key={employee.id}><span className="team-avatar">{employee.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{employee.name}</strong><small>{ROLE_LABELS[employee.role]} · {db.sites.find(item => item.id === employee.siteId)?.name}</small></div><label><span>{roleScope(employee.role)}</span>{options.length ? <select disabled={!canManage || Boolean(openShiftFor(employee.id))} value={assignmentIdFor(employee)} onChange={event => saveAssignment(employee, event.target.value)}>{options.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select> : <strong>{assignmentFor(employee)}</strong>}</label><span className={openShiftFor(employee.id) ? 'assignment-locked' : 'assignment-ready'}>{openShiftFor(employee.id) ? 'Verrouillé pendant le service' : canManage ? 'Modifiable immédiatement' : 'Consultation'}</span></article>;
        })}
      </div>
    </section>}

    {tab === 'services' && <section className="team-panel">
      <header className="team-panel-heading"><div><h2>Services et passations</h2><p>Suivez les postes ouverts, les appareils utilisés et les consignes transmises entre équipes.</p></div><b>{db.employeeShifts.length} service(s) tracé(s)</b></header>
      <div className="team-service-grid"><section><header><CheckCircle2 size={18} /><div><strong>Postes ouverts</strong><small>Situation en temps réel</small></div></header>{db.employeeShifts.filter(item => item.status === 'open').map(shift => { const employee = db.employeeProfiles.find(item => item.id === shift.employeeId); return <article key={shift.id}><span><strong>{employee?.name || 'Collaborateur'}</strong><small>{ROLE_LABELS[shift.role]} · {shift.assignmentLabel}</small></span><div><b>{new Date(shift.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</b><small>{shift.deviceLabel}</small></div></article>; })}{db.employeeShifts.every(item => item.status !== 'open') && <div className="team-empty compact"><Clock3 size={24} /><strong>Aucun poste ouvert</strong></div>}</section><section><header><ClipboardCheck size={18} /><div><strong>Dernières passations</strong><small>Continuité entre les équipes</small></div></header>{db.employeeHandovers.slice(0, 8).map(handover => <article key={handover.id}><span><strong>{handover.employeeName}</strong><small>{handover.notes}</small></span><div><b className={handover.status}>{handover.status === 'acknowledged' ? 'Reprise confirmée' : 'À reprendre'}</b><small>{new Date(handover.submittedAt).toLocaleString('fr-FR')}</small></div></article>)}</section></div>
    </section>}

    {tab === 'preview' && <section className="team-preview-panel"><header><div><span>APERÇU DES COLLABORATEURS</span><h2>{db.sartalBrandSettings.staffAppName}</h2><p>Testez ici le poste de chaque métier. L’interface autonome s’ouvre sans les menus de direction.</p></div><button className="btn btn-primary" onClick={openStandalone}><ExternalLink size={17} /> Ouvrir dans un nouvel onglet</button></header><EmployeeWorkspace state={state} /></section>}

    {draft && <div className="modal-overlay" onClick={() => setDraft(null)}><form className="modal-card team-employee-modal" onSubmit={saveDraft} onClick={event => event.stopPropagation()}><div className="modal-header"><div><span>PROFIL & AFFECTATION</span><h2>{draft.id ? 'Modifier le collaborateur' : 'Ajouter un collaborateur'}</h2><p>Le métier et l’affectation déterminent son interface quotidienne.</p></div><button type="button" className="icon-btn" onClick={() => setDraft(null)} aria-label="Fermer"><X size={19} /></button></div>{formError && <div className="team-form-error"><AlertCircle size={17} /> {formError}</div>}<div className="team-form-grid"><label>Matricule<input className="form-control" value={draft.employeeNumber} onChange={event => setDraft({ ...draft, employeeNumber: event.target.value })} placeholder="SAL-001" required /></label><label>Nom complet<input className="form-control" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} required /></label><label>Téléphone<input className="form-control" type="tel" value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} required /></label><label>Établissement<select className="form-control" value={draft.siteId} onChange={event => updateDraftScope(draft.role, event.target.value)}>{db.sites.map(site => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label><label>Métier / rôle<select className="form-control" value={draft.role} onChange={event => updateDraftScope(event.target.value as EmployeeRole, draft.siteId)}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>{assignmentOptions(draft).length > 0 && <label>{roleScope(draft.role)}<select className="form-control" value={assignmentIdFor(draft)} onChange={event => setDraft({ ...draft, posId: POS_ROLES.includes(draft.role) ? event.target.value : undefined, warehouseId: WAREHOUSE_ROLES.includes(draft.role) ? event.target.value : undefined })}>{assignmentOptions(draft).map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>}<label className="team-active-field"><input type="checkbox" checked={draft.active} onChange={event => setDraft({ ...draft, active: event.target.checked })} /><span><strong>Accès actif</strong><small>Le collaborateur peut se connecter et prendre son service.</small></span></label></div><div className="team-scope-summary"><Building2 size={18} /><span><small>Périmètre appliqué</small><strong>{db.sites.find(item => item.id === draft.siteId)?.name} · {roleScope(draft.role)} · {assignmentFor(draft)}</strong></span></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setDraft(null)}>Annuler</button><button className="btn btn-primary" type="submit"><CheckCircle2 size={16} /> Enregistrer</button></div></form></div>}

    {deleteTarget && <div className="modal-overlay" onClick={() => setDeleteTarget(null)}><section className="modal-card modal-card-sm team-delete-modal" onClick={event => event.stopPropagation()}><div className="modal-header"><div><span>SUPPRESSION PROTÉGÉE</span><h2>Supprimer {deleteTarget.name} ?</h2><p>Si ce profil possède déjà un historique de service, Sártal demandera de le désactiver afin de conserver la traçabilité.</p></div><button className="icon-btn" onClick={() => setDeleteTarget(null)} aria-label="Fermer"><X size={19} /></button></div><div className="modal-actions"><button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Conserver</button><button className="btn btn-danger" onClick={remove}><Trash2 size={16} /> Supprimer</button></div></section></div>}
  </section>;
};

export default TeamManagement;
