import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileCheck2,
  Filter,
  KeyRound,
  Layers3,
  Mail,
  Pencil,
  Play,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
  X
} from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { AccessRoleTemplate, EmployeePermission, SartalFormulaId, SartalModule, User, UserAccessStatus } from '../types';
import { BACKOFFICE_VIEW_IDS, canAccessBackofficeView } from '../accessControl';
import {
  BACKOFFICE_VIEW_LABELS,
  FORMULA_OPTIONS,
  USER_ROLE_LABELS,
  createDefaultUserScope,
  describeUserScope
} from '../accessGovernance';
import { EMPLOYEE_PERMISSION_DEFINITIONS, getDefaultEmployeePermissions, getEmployeePermissions } from '../employeePermissions';

interface AccessGovernanceCenterProps {
  state: StockState;
}

type GovernanceTab = 'accounts' | 'roles' | 'deployment' | 'control';
type AccountDraft = Omit<User, 'id'> & { id?: string };

const STATUS_LABELS: Record<UserAccessStatus, string> = {
  active: 'Actif',
  invited: 'Invitation envoyée',
  suspended: 'Suspendu'
};

const MODULE_LABELS: Record<SartalModule, string> = {
  stock: 'Stock',
  restaurant: 'Restaurant',
  delivery: 'Vente en ligne',
  pms: 'PMS Hôtel'
};

const SCENARIOS = [
  { id: 'hotel_restaurant' as const, label: 'Séjour + restaurant + stock', description: 'Séjour actif, dîner imputé au folio et consommation déduite du dépôt restaurant.', modules: ['stock', 'restaurant', 'pms'] as SartalModule[] },
  { id: 'family_delivery' as const, label: 'Client famille + livraison', description: 'Compte famille, panier récurrent, préparation et livraison reliés au stock.', modules: ['stock', 'delivery'] as SartalModule[] },
  { id: 'group_payment' as const, label: 'Table + addition partagée', description: 'Invités, montants individuels et paiements séparés sur une même table.', modules: ['restaurant'] as SartalModule[] }
];

const PMS_SCENARIO_STEPS = [
  'Check-in et ouverture du folio',
  'Vente restaurant imputée à la chambre',
  'Rapprochement du ticket et du folio',
  'Paiement Orange Money',
  'Check-out et chambre à nettoyer',
  'Nettoyage contrôlé et chambre remise en vente'
];

const toggleValue = <T,>(values: T[], value: T) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];

export const AccessGovernanceCenter: React.FC<AccessGovernanceCenterProps> = ({ state }) => {
  const { db } = state;
  const configuredFormula = FORMULA_OPTIONS.find(option => option.modules.length === db.sartalBrandSettings.enabledModules.length && option.modules.every(module => db.sartalBrandSettings.enabledModules.includes(module)));
  const [tab, setTab] = useState<GovernanceTab>('accounts');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<UserAccessStatus | 'all'>('all');
  const [accountDraft, setAccountDraft] = useState<AccountDraft | null>(null);
  const [accountStep, setAccountStep] = useState<1 | 2>(1);
  const [templateDraft, setTemplateDraft] = useState<AccessRoleTemplate | null>(null);
  const [employeeId, setEmployeeId] = useState(db.employeeProfiles.find(item => item.active)?.id || '');
  const [employeePermissions, setEmployeePermissions] = useState<EmployeePermission[]>(() => {
    const employee = db.employeeProfiles.find(item => item.active);
    return employee ? getEmployeePermissions(employee) : [];
  });
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [formulaId, setFormulaId] = useState<SartalFormulaId>(configuredFormula?.id || db.sartalBrandSettings.subscriptionFormula || 'suite-complete');
  const [wizardSiteIds, setWizardSiteIds] = useState<string[]>(db.sites.map(site => site.id));
  const [wizardAdmin, setWizardAdmin] = useState({ name: db.currentUser.name, email: db.currentUser.email || 'admin@sartal.sn' });
  const [auditQuery, setAuditQuery] = useState('');
  const [auditSource, setAuditSource] = useState('all');
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const currentFormula = FORMULA_OPTIONS.find(item => item.id === formulaId) || FORMULA_OPTIONS[0];
  const activeTemplates = db.accessRoleTemplates.filter(template => template.active);
  const manageableTemplates = db.currentUser.role === 'admin' ? activeTemplates : activeTemplates.filter(template => template.role !== 'admin');
  const activeUsers = db.users.filter(user => user.status === 'active').length;
  const pendingInvites = db.users.filter(user => user.status === 'invited').length;
  const selectedEmployee = db.employeeProfiles.find(item => item.id === employeeId) || db.employeeProfiles.find(item => item.active);
  const permissionGroups = [...new Set(EMPLOYEE_PERMISSION_DEFINITIONS.map(item => item.group))];
  const profileControls = db.users.map(user => {
    const issues: string[] = [];
    const template = db.accessRoleTemplates.find(item => item.id === user.roleTemplateId && item.active);
    const scope = user.scope;
    if (!template || template.role !== user.role) issues.push('Modèle de rôle absent ou incompatible');
    if (!user.email || !/^\S+@\S+\.\S+$/.test(user.email)) issues.push('Adresse e-mail à corriger');
    if (!scope?.modules.length || !scope.siteIds.length) issues.push('Périmètre incomplet');
    if (scope?.modules.some(module => !db.sartalBrandSettings.enabledModules.includes(module) || !template?.modules.includes(module))) issues.push('Module hors abonnement ou hors modèle');
    if (scope?.siteIds.some(siteId => !db.sites.some(site => site.id === siteId))) issues.push('Établissement introuvable');
    if (scope?.posIds.some(posId => !db.posList.some(pos => pos.id === posId && scope.siteIds.includes(pos.siteId)))) issues.push('POS hors périmètre');
    if (scope?.warehouseIds.some(warehouseId => !db.warehouses.some(warehouse => warehouse.id === warehouseId && scope.siteIds.includes(warehouse.siteId)))) issues.push('Dépôt hors périmètre');
    if (!user.allowedViews?.length || user.allowedViews.some(view => !scope || !canAccessBackofficeView(user.role, scope.modules, view))) issues.push('Interfaces incohérentes avec le rôle');
    if (user.role === 'pos_manager' && (!scope?.posIds.length || !scope.warehouseIds.length)) issues.push('POS ou dépôt restaurant manquant');
    if (['storekeeper', 'ecommerce_manager'].includes(user.role) && !scope?.warehouseIds.length) issues.push('Dépôt opérationnel manquant');
    return { user, issues };
  });
  const compliantProfiles = profileControls.filter(item => item.issues.length === 0).length;

  const filteredUsers = db.users.filter(user => {
    const normalized = query.trim().toLowerCase();
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (statusFilter !== 'all' && (user.status || 'active') !== statusFilter) return false;
    return !normalized || `${user.name} ${user.email} ${USER_ROLE_LABELS[user.role]} ${describeUserScope(user, db).join(' ')}`.toLowerCase().includes(normalized);
  });

  const unifiedAudit = useMemo(() => {
    const entries = [
      ...db.accessAuditEvents.map(event => ({ id: event.id, date: event.date, source: 'access', title: event.targetLabel, detail: event.detail, actor: event.actorName, severity: event.severity })),
      ...db.pmsAuditLogs.map(event => ({ id: `pms-${event.id}`, date: event.date, source: 'pms', title: `${event.action} · ${event.entity}`, detail: event.detail, actor: event.userName, severity: 'info' as const })),
      ...db.restaurantFloorAudit.map(event => ({ id: `restaurant-${event.id}`, date: event.createdAt, source: 'restaurant', title: event.summary, detail: 'Décision ou opération restaurant tracée.', actor: event.actor, severity: event.action === 'adjustment_applied' ? 'sensitive' as const : 'info' as const })),
      ...db.employeeApprovals.map(event => ({ id: `approval-${event.id}`, date: event.decidedAt || event.createdAt, source: 'validation', title: event.label, detail: `${event.status === 'pending' ? 'Décision en attente' : event.status === 'approved' ? 'Validée' : 'Refusée'} · ${event.reason}`, actor: event.decidedBy || event.requestedByName, severity: ['void', 'discount', 'complimentary'].includes(event.type) ? 'sensitive' as const : 'info' as const })),
      ...db.movements.slice(0, 80).map(event => ({ id: `stock-${event.id}`, date: event.date, source: 'stock', title: event.reason, detail: `${event.type} · ${event.quantity} ${event.unit}`, actor: event.userName, severity: event.type === 'correction' ? 'sensitive' as const : 'info' as const }))
    ].sort((a, b) => b.date.localeCompare(a.date));
    const normalized = auditQuery.trim().toLowerCase();
    return entries.filter(entry => (auditSource === 'all' || entry.source === auditSource) && (!normalized || `${entry.title} ${entry.detail} ${entry.actor}`.toLowerCase().includes(normalized)));
  }, [auditQuery, auditSource, db.accessAuditEvents, db.employeeApprovals, db.movements, db.pmsAuditLogs, db.restaurantFloorAudit]);

  const execute = (action: () => unknown, success: string) => {
    try {
      action();
      setNotice({ tone: 'success', text: success });
      return true;
    } catch (error) {
      setNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Action impossible' });
      return false;
    }
  };

  const buildScope = (template: AccessRoleTemplate) => createDefaultUserScope(template.role, {
    ...(() => {
      const preferredPOS = template.role === 'ecommerce_manager'
        ? db.posList.find(pos => pos.type === 'online_grocery')
        : template.role === 'pos_manager'
          ? db.posList.find(pos => pos.type === 'restaurant')
          : undefined;
      return {
        preferredPosId: preferredPOS?.id,
        preferredWarehouseId: preferredPOS?.defaultWarehouseId
          || (template.role === 'ecommerce_manager' ? db.warehouses.find(warehouse => warehouse.id === 'wh-delivery')?.id : db.warehouses[0]?.id)
      };
    })(),
    companyId: db.companies[0]?.id,
    siteIds: db.sites.map(site => site.id),
    posIds: db.posList.map(pos => pos.id),
    warehouseIds: db.warehouses.map(warehouse => warehouse.id),
    enabledModules: db.sartalBrandSettings.enabledModules,
    preferredSiteId: db.sites[0]?.id
  });

  const createAccount = (requestedTemplate?: AccessRoleTemplate) => {
    const template = requestedTemplate || manageableTemplates.find(item => item.role === 'director') || manageableTemplates.find(item => item.role !== 'admin') || manageableTemplates[0];
    if (!template) return;
    setAccountStep(1);
    setAccountDraft({
      name: '',
      email: '',
      phone: '+221 ',
      role: template.role,
      status: 'invited',
      roleTemplateId: template.id,
      scope: buildScope(template),
      allowedViews: [...template.viewIds]
    });
  };

  const selectAccountTemplate = (templateId: string) => {
    const template = manageableTemplates.find(item => item.id === templateId);
    if (!template) return;
    setAccountDraft(current => current ? { ...current, role: template.role, roleTemplateId: template.id, scope: buildScope(template), allowedViews: [...template.viewIds] } : current);
  };

  const editAccount = (user: User) => {
    const template = activeTemplates.find(item => item.role === user.role);
    const modules = (user.scope || buildScope(template || activeTemplates[0])).modules.filter(module => template?.modules.includes(module) && db.sartalBrandSettings.enabledModules.includes(module));
    setAccountStep(1);
    setAccountDraft({
      ...user,
      status: user.status || 'active',
      scope: { ...(user.scope || buildScope(template || activeTemplates[0])), modules },
      allowedViews: (user.allowedViews || template?.viewIds || []).filter(view => canAccessBackofficeView(user.role, modules, view))
    });
  };

  const saveAccount = () => {
    if (!accountDraft) return;
    const saved = execute(() => state.saveBackofficeUser(accountDraft), accountDraft.id ? 'Accès et périmètre mis à jour.' : 'Invitation créée avec son périmètre complet.');
    if (saved) setAccountDraft(null);
  };

  const previewAccount = (user: User) => {
    try {
      state.recordAccessPreview(user.id);
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('apercu', user.id);
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } catch (error) {
      setNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Aperçu impossible' });
    }
  };

  const selectEmployee = (nextEmployeeId: string) => {
    const employee = db.employeeProfiles.find(item => item.id === nextEmployeeId);
    if (!employee) return;
    setEmployeeId(employee.id);
    setEmployeePermissions(getEmployeePermissions(employee));
  };

  const saveEmployeeRights = () => {
    if (!selectedEmployee) return;
    execute(() => state.updateEmployeePermissions(selectedEmployee.id, employeePermissions), `Droits terrain de ${selectedEmployee.name} enregistrés.`);
  };

  const updateDraftScope = (field: 'siteIds' | 'posIds' | 'warehouseIds', value: string) => {
    setAccountDraft(current => {
      if (!current?.scope) return current;
      const nextValues = toggleValue(current.scope[field], value);
      if (field !== 'siteIds') return { ...current, scope: { ...current.scope, [field]: nextValues } };
      const nextSites = new Set(nextValues);
      return {
        ...current,
        scope: {
          ...current.scope,
          siteIds: nextValues,
          posIds: current.scope.posIds.filter(posId => nextSites.has(db.posList.find(pos => pos.id === posId)?.siteId || '')),
          warehouseIds: current.scope.warehouseIds.filter(warehouseId => nextSites.has(db.warehouses.find(warehouse => warehouse.id === warehouseId)?.siteId || ''))
        }
      };
    });
  };

  const updateDraftModules = (module: SartalModule) => {
    setAccountDraft(current => {
      if (!current?.scope) return current;
      const modules = toggleValue(current.scope.modules, module);
      return {
        ...current,
        scope: { ...current.scope, modules },
        allowedViews: (current.allowedViews || []).filter(view => canAccessBackofficeView(current.role, modules, view))
      };
    });
  };

  const finishOnboarding = () => {
    const completed = execute(() => state.completeAccessOnboarding({ formulaId, siteIds: wizardSiteIds, adminName: wizardAdmin.name, adminEmail: wizardAdmin.email }), 'Mise en service enregistrée et journalisée.');
    if (completed) setWizardStep(1);
  };

  const runScenario = (scenario: (typeof SCENARIOS)[number]) => {
    execute(() => state.runSartalCommercialScenario(scenario.id), `${scenario.label} certifié avec ses preuves métier.`);
  };

  const accountTemplate = accountDraft ? activeTemplates.find(item => item.id === accountDraft.roleTemplateId) : undefined;
  const accountCandidatePOS = accountDraft?.scope ? db.posList.filter(pos => accountDraft.scope?.siteIds.includes(pos.siteId)) : [];
  const accountCandidateWarehouses = accountDraft?.scope ? db.warehouses.filter(warehouse => accountDraft.scope?.siteIds.includes(warehouse.siteId)) : [];
  const accountAccessibleViews = (accountDraft?.allowedViews || [])
    .filter(view => Boolean(accountDraft?.scope && canAccessBackofficeView(accountDraft.role, accountDraft.scope.modules, view)))
    .map(view => BACKOFFICE_VIEW_LABELS[view as keyof typeof BACKOFFICE_VIEW_LABELS])
    .filter(Boolean);

  const tabs: Array<{ id: GovernanceTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'accounts', label: 'Comptes & périmètres', icon: <UsersRound size={17} />, badge: pendingInvites },
    { id: 'roles', label: 'Modèles & droits', icon: <KeyRound size={17} /> },
    { id: 'deployment', label: 'Mise en service', icon: <Layers3 size={17} /> },
    { id: 'control', label: 'Scénarios & journal', icon: <FileCheck2 size={17} /> }
  ];

  return <section className="access-governance-center">
    <header className="access-governance-header">
      <div><span>GOUVERNANCE DES ACCÈS</span><h2>Organisation & accès</h2><p>Une seule vue pour les comptes, les rôles, les périmètres, la mise en service et les preuves de contrôle.</p></div>
      <button type="button" className="btn btn-primary" onClick={() => createAccount()}><Plus size={17} /> Inviter un utilisateur</button>
    </header>

    <div className="access-governance-kpis">
      <article><UserCheck size={20} /><span><small>Accès actifs</small><strong>{activeUsers}</strong></span></article>
      <article><Mail size={20} /><span><small>Invitations</small><strong>{pendingInvites}</strong></span></article>
      <article><KeyRound size={20} /><span><small>Modèles actifs</small><strong>{activeTemplates.length}</strong></span></article>
      <article><Activity size={20} /><span><small>Événements tracés</small><strong>{unifiedAudit.length}</strong></span></article>
    </div>

    <nav className="access-governance-tabs" aria-label="Organisation et accès">
      {tabs.map(item => <button type="button" className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => setTab(item.id)}>{item.icon}<span>{item.label}</span>{Boolean(item.badge) && <b>{item.badge}</b>}</button>)}
    </nav>

    {notice && <div className={`team-notice ${notice.tone}`}><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Fermer"><X size={16} /></button></div>}

    {tab === 'accounts' && <section className="access-governance-panel">
      <header><div><h3>Comptes back-office</h3><p>Chaque compte possède un rôle, des interfaces autorisées et un périmètre de données explicite.</p></div><b>{filteredUsers.length} résultat(s)</b></header>
      <div className="access-account-filters">
        <label><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, e-mail, rôle, site…" /></label>
        <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="all">Tous les rôles</option>{activeTemplates.map(template => <option value={template.role} key={template.id}>{template.name}</option>)}</select>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">Tous les statuts</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      </div>
      <div className="access-account-list">
        {!filteredUsers.length && <div className="access-empty-state"><Search size={22} /><strong>Aucun compte ne correspond</strong><span>Modifiez les filtres ou invitez un nouvel utilisateur.</span><button type="button" onClick={() => { setQuery(''); setRoleFilter('all'); setStatusFilter('all'); }}>Effacer les filtres</button></div>}
        {filteredUsers.map(user => {
          const scope = describeUserScope(user, db);
          const status = user.status || 'active';
          const canManageAccount = db.currentUser.role === 'admin' || user.role !== 'admin';
          const canChangeStatus = canManageAccount && user.id !== db.currentUser.id;
          return <article className={status} key={user.id}>
            <span className="access-account-avatar">{user.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span>
            <div className="access-account-identity"><header><strong>{user.name}</strong><em>{STATUS_LABELS[status]}</em></header><span>{USER_ROLE_LABELS[user.role]}</span><small>{user.email}</small></div>
            <div className="access-account-scope"><small>Périmètre appliqué</small><strong>{scope.slice(0, 2).join(' · ') || 'À vérifier'}</strong><span>{user.scope?.modules.map(module => MODULE_LABELS[module]).join(' · ')}</span></div>
            <div className="access-account-views"><small>Interfaces</small><strong>{user.allowedViews?.length || 0}</strong><span>{user.scope?.posIds.length || 0} POS · {user.scope?.warehouseIds.length || 0} dépôt(s)</span></div>
            <footer><button type="button" disabled={!canManageAccount} title={!canManageAccount ? 'Réservé à un administrateur' : undefined} onClick={() => editAccount(user)}><Pencil size={15} /> Modifier</button><button type="button" disabled={status !== 'active' || !canManageAccount} title={!canManageAccount ? 'Réservé à un administrateur' : undefined} onClick={() => previewAccount(user)}><Eye size={15} /> Tester</button><button type="button" disabled={!canChangeStatus} title={!canChangeStatus ? user.id === db.currentUser.id ? 'Votre propre session ne peut pas être suspendue ici' : 'Réservé à un administrateur' : undefined} className={status === 'suspended' ? 'activate' : 'suspend'} onClick={() => execute(() => state.updateBackofficeUserStatus(user.id, status === 'suspended' ? 'active' : 'suspended'), status === 'suspended' ? 'Accès réactivé.' : 'Accès suspendu immédiatement.')}><Power size={15} /> {status === 'suspended' ? 'Réactiver' : 'Suspendre'}</button></footer>
          </article>;
        })}
      </div>
    </section>}

    {tab === 'roles' && <section className="access-governance-panel access-role-panel">
      <header><div><h3>Modèles de rôles back-office</h3><p>Les modèles fournissent une base sûre. Les interfaces peuvent ensuite être retirées au niveau d’un utilisateur.</p></div><b>{activeTemplates.length} modèle(s)</b></header>
      <div className="access-role-grid">{activeTemplates.map(template => <article key={template.id}><header><span><ShieldCheck size={18} /></span><div><strong>{template.name}</strong><small>{template.scopeLevel === 'company' ? 'Entreprise' : template.scopeLevel === 'site' ? 'Établissement' : 'POS ou dépôt'}</small></div></header><p>{template.description}</p><div>{template.modules.map(module => <span key={module}>{MODULE_LABELS[module]}</span>)}</div><footer><b>{template.viewIds.length} interface(s)</b>{db.currentUser.role === 'admin' && <button type="button" onClick={() => setTemplateDraft({ ...template, modules: [...template.modules], viewIds: [...template.viewIds] })}><Pencil size={15} /> Configurer</button>}<button type="button" onClick={() => createAccount(template)}><Plus size={15} /> Utiliser</button></footer></article>)}</div>

      <section className="access-profile-control">
        <header><div><ShieldCheck size={20} /><span><strong>Contrôle automatique des profils</strong><small>Modèle, abonnement, établissement, POS, dépôt et interfaces sont vérifiés ensemble.</small></span></div><b className={compliantProfiles === profileControls.length ? 'complete' : 'warning'}>{compliantProfiles}/{profileControls.length} conformes</b></header>
        <div>{profileControls.map(item => {
          const canManageAccount = db.currentUser.role === 'admin' || item.user.role !== 'admin';
          return <article className={item.issues.length ? 'warning' : 'complete'} key={item.user.id}><span className="access-account-avatar">{item.user.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{item.user.name}</strong><small>{USER_ROLE_LABELS[item.user.role]}</small><p>{item.issues[0] || 'Rôle, périmètre et interfaces cohérents'}</p></div><b>{item.issues.length ? `${item.issues.length} point(s)` : <Check size={15} />}</b>{item.issues.length > 0 && canManageAccount && <button type="button" onClick={() => editAccount(item.user)}>Corriger</button>}</article>;
        })}</div>
      </section>

      {selectedEmployee && <section className="access-staff-rights">
        <header><div><h3>Droits des équipes terrain</h3><p>Les habilitations opérationnelles complètent le rôle métier du collaborateur.</p></div><select value={selectedEmployee.id} onChange={event => selectEmployee(event.target.value)}>{db.employeeProfiles.filter(item => item.active).map(employee => <option value={employee.id} key={employee.id}>{employee.name} · {employee.role}</option>)}</select></header>
        <div className="access-staff-rights-layout"><aside><span className="access-account-avatar">{selectedEmployee.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><strong>{selectedEmployee.name}</strong><small>{selectedEmployee.employeeNumber} · {db.sites.find(site => site.id === selectedEmployee.siteId)?.name}</small><button type="button" onClick={() => setEmployeePermissions(getDefaultEmployeePermissions(selectedEmployee.role))}><RefreshCw size={15} /> Revenir au modèle métier</button></aside><div>{permissionGroups.map(group => <section key={group}><header><strong>{group}</strong><small>{EMPLOYEE_PERMISSION_DEFINITIONS.filter(item => item.group === group && employeePermissions.includes(item.id)).length} actif(s)</small></header>{EMPLOYEE_PERMISSION_DEFINITIONS.filter(item => item.group === group).map(permission => <label className={employeePermissions.includes(permission.id) ? 'active' : ''} key={permission.id}><input type="checkbox" checked={employeePermissions.includes(permission.id)} onChange={() => setEmployeePermissions(current => toggleValue(current, permission.id))} /><span><strong>{permission.label}</strong><small>{permission.description}</small></span></label>)}</section>)}</div></div>
        <footer><span><ShieldCheck size={16} /> Toute modification est enregistrée dans le journal unifié.</span><button type="button" className="btn btn-primary" onClick={saveEmployeeRights}><CheckCircle2 size={16} /> Enregistrer les droits terrain</button></footer>
      </section>}
    </section>}

    {tab === 'deployment' && <section className="access-governance-panel access-deployment-panel">
      <header><div><h3>Assistant de mise en service</h3><p>Une ouverture guidée de l’abonnement jusqu’au premier compte responsable.</p></div><b>Étape {wizardStep}/4</b></header>
      <ol className="access-wizard-steps">{['Formule', 'Établissements', 'Responsable', 'Validation'].map((label, index) => <li className={wizardStep === index + 1 ? 'active' : wizardStep > index + 1 ? 'complete' : ''} key={label}><span>{wizardStep > index + 1 ? <Check size={14} /> : index + 1}</span><strong>{label}</strong></li>)}</ol>
      {wizardStep === 1 && <div className="access-formula-grid">{FORMULA_OPTIONS.map(formula => <button type="button" className={formulaId === formula.id ? 'active' : ''} key={formula.id} onClick={() => setFormulaId(formula.id)}><span>{formula.modules.length} MODULE(S)</span><strong>{formula.label}</strong><p>{formula.description}</p><div>{formula.modules.map(module => <b key={module}>{MODULE_LABELS[module]}</b>)}</div></button>)}</div>}
      {wizardStep === 2 && <div className="access-site-selection"><header><Building2 size={22} /><div><strong>Établissements couverts</strong><small>Les POS et dépôts correspondants seront inclus dans le premier périmètre administrateur.</small></div></header>{db.sites.map(site => <label className={wizardSiteIds.includes(site.id) ? 'active' : ''} key={site.id}><input type="checkbox" checked={wizardSiteIds.includes(site.id)} onChange={() => setWizardSiteIds(current => toggleValue(current, site.id))} /><Building2 size={18} /><span><strong>{site.name}</strong><small>{db.posList.filter(pos => pos.siteId === site.id).length} POS · {db.warehouses.filter(warehouse => warehouse.siteId === site.id).length} dépôt(s)</small></span></label>)}</div>}
      {wizardStep === 3 && <div className="access-admin-form"><header><UserCheck size={22} /><div><strong>Premier responsable</strong><small>Ce compte conservera la maîtrise des abonnements, des rôles et des invitations.</small></div></header><label>Nom complet<input value={wizardAdmin.name} onChange={event => setWizardAdmin({ ...wizardAdmin, name: event.target.value })} /></label><label>Adresse e-mail<input type="email" value={wizardAdmin.email} onChange={event => setWizardAdmin({ ...wizardAdmin, email: event.target.value })} /></label><div><ShieldCheck size={18} /><span><strong>Modèle Administrateur</strong><small>Accès complet uniquement aux modules de la formule sélectionnée.</small></span></div></div>}
      {wizardStep === 4 && <div className="access-deployment-review"><header><ClipboardCheck size={24} /><div><span>PRÊT À ACTIVER</span><h3>{currentFormula.label}</h3><p>Vérifiez cette synthèse avant d’appliquer la configuration.</p></div></header><div><article><small>Modules</small><strong>{currentFormula.modules.map(module => MODULE_LABELS[module]).join(' · ')}</strong></article><article><small>Établissements</small><strong>{db.sites.filter(site => wizardSiteIds.includes(site.id)).map(site => site.name).join(' · ')}</strong></article><article><small>Compte responsable</small><strong>{wizardAdmin.name} · {wizardAdmin.email}</strong></article><article><small>Périmètre initial</small><strong>{db.posList.filter(pos => wizardSiteIds.includes(pos.siteId)).length} POS · {db.warehouses.filter(warehouse => wizardSiteIds.includes(warehouse.siteId)).length} dépôt(s)</strong></article></div><footer><ShieldCheck size={17} /> Cette activation sera ajoutée au journal avec l’auteur et l’heure exacte.</footer></div>}
      <footer className="access-wizard-actions"><button type="button" disabled={wizardStep === 1} onClick={() => setWizardStep(current => Math.max(1, current - 1) as typeof wizardStep)}><ArrowLeft size={16} /> Retour</button>{wizardStep < 4 ? <button type="button" className="btn btn-primary" disabled={(wizardStep === 2 && !wizardSiteIds.length) || (wizardStep === 3 && (!wizardAdmin.name.trim() || !wizardAdmin.email.trim()))} onClick={() => setWizardStep(current => Math.min(4, current + 1) as typeof wizardStep)}>Continuer <ArrowRight size={16} /></button> : <button type="button" className="btn btn-primary" onClick={finishOnboarding}><CheckCircle2 size={16} /> Activer la configuration</button>}</footer>
    </section>}

    {tab === 'control' && <section className="access-governance-panel access-control-panel">
      <header><div><h3>Scénarios intermodules certifiés</h3><p>Chaque scénario produit des preuves à partir des données et workflows réellement présents.</p></div><b>{db.sartalDemoRuns.length} exécution(s)</b></header>
      <div className="access-scenario-grid">{SCENARIOS.map(scenario => {
        const enabled = scenario.modules.every(module => db.sartalBrandSettings.enabledModules.includes(module));
        const lastRun = db.sartalDemoRuns.find(run => run.scenario === scenario.id);
        return <article className={!enabled ? 'disabled' : ''} key={scenario.id}><header><span><Play size={18} /></span><div><strong>{scenario.label}</strong><small>{scenario.modules.map(module => MODULE_LABELS[module]).join(' + ')}</small></div></header><p>{scenario.description}</p>{lastRun && <div>{lastRun.evidence.map(evidence => <span key={evidence}><Check size={13} /> {evidence}</span>)}</div>}<footer><b>{lastRun ? `Certifié ${new Date(lastRun.completedAt).toLocaleDateString('fr-FR')}` : enabled ? 'Prêt à vérifier' : 'Modules non souscrits'}</b><button type="button" disabled={!enabled} onClick={() => runScenario(scenario)}><Play size={15} /> {lastRun ? 'Rejouer' : 'Exécuter'}</button></footer></article>;
      })}</div>

      {db.sartalBrandSettings.enabledModules.includes('pms') && db.sartalBrandSettings.enabledModules.includes('restaurant') && <section className="access-pms-scenario"><header><div><Sparkles size={20} /><span><strong>Parcours opérationnel PMS + Restaurant</strong><small>Une vraie journée, étape par étape, avec impact folio et stock.</small></span></div><b>{db.pmsScenarioStep}/6</b></header><div>{PMS_SCENARIO_STEPS.map((label, index) => <article className={db.pmsScenarioStep > index ? 'complete' : db.pmsScenarioStep === index ? 'current' : ''} key={label}><span>{db.pmsScenarioStep > index ? <Check size={14} /> : index + 1}</span><strong>{label}</strong></article>)}</div><footer><button type="button" onClick={() => execute(() => state.resetPMSDayScenario(), 'Scénario PMS réinitialisé.')}><RefreshCw size={15} /> Réinitialiser</button><button type="button" className="btn btn-primary" disabled={db.pmsScenarioStep >= 6} onClick={() => execute(() => state.advancePMSDayScenario(), `Étape ${Math.min(6, db.pmsScenarioStep + 1)} validée et tracée.`)}><Play size={15} /> Exécuter l’étape suivante</button></footer></section>}

      <section className="access-unified-audit"><header><div><Activity size={20} /><span><strong>Journal unifié des accès et décisions</strong><small>Droits, affectations, validations, remises, annulations, PMS et mouvements sensibles.</small></span></div><b>{unifiedAudit.length} événement(s)</b></header><div className="access-audit-filters"><label><Search size={16} /><input value={auditQuery} onChange={event => setAuditQuery(event.target.value)} placeholder="Rechercher une action, une personne, une référence…" /></label><label><Filter size={15} /><select value={auditSource} onChange={event => setAuditSource(event.target.value)}><option value="all">Toutes les sources</option><option value="access">Accès</option><option value="pms">PMS</option><option value="restaurant">Restaurant</option><option value="validation">Validations</option><option value="stock">Stock</option></select></label></div><div className="access-audit-list">{unifiedAudit.slice(0, 60).map(entry => <article className={entry.severity} key={entry.id}><span>{entry.source.slice(0, 3).toUpperCase()}</span><div><strong>{entry.title}</strong><p>{entry.detail}</p><small>{entry.actor} · {new Date(entry.date).toLocaleString('fr-FR')}</small></div></article>)}</div></section>
    </section>}

    {accountDraft && <div className="modal-overlay" onClick={() => setAccountDraft(null)}><section className="modal-card access-account-modal" onClick={event => event.stopPropagation()}><div className="modal-header"><div><span>COMPTE & PÉRIMÈTRE</span><h2>{accountDraft.id ? 'Modifier l’accès' : accountStep === 1 ? 'Préparer une invitation' : 'Vérifier avant l’envoi'}</h2><p>{accountStep === 1 ? 'Identité, modèle, modules et données autorisées.' : 'Cette synthèse correspond exactement à ce que verra l’utilisateur.'}</p></div><button type="button" className="icon-btn" onClick={() => setAccountDraft(null)} aria-label="Fermer"><X size={19} /></button></div>{accountStep === 1 ? <div className="access-account-form"><section><h3>Identité et rôle</h3><label>Nom complet<input value={accountDraft.name} onChange={event => setAccountDraft({ ...accountDraft, name: event.target.value })} /></label><label>Adresse e-mail<input type="email" value={accountDraft.email || ''} onChange={event => setAccountDraft({ ...accountDraft, email: event.target.value })} /></label><label>Téléphone<input value={accountDraft.phone || ''} onChange={event => setAccountDraft({ ...accountDraft, phone: event.target.value })} /></label><label>Modèle de rôle<select value={accountDraft.roleTemplateId} onChange={event => selectAccountTemplate(event.target.value)}>{manageableTemplates.map(template => <option value={template.id} key={template.id}>{template.name}</option>)}</select></label><label>Statut<select value={accountDraft.status || 'invited'} onChange={event => setAccountDraft({ ...accountDraft, status: event.target.value as UserAccessStatus })}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></section><section><h3>Modules autorisés</h3><div className="access-check-grid">{(accountTemplate?.modules || []).filter(module => db.sartalBrandSettings.enabledModules.includes(module)).map(module => <label className={accountDraft.scope?.modules.includes(module) ? 'active' : ''} key={module}><input type="checkbox" checked={accountDraft.scope?.modules.includes(module) || false} onChange={() => updateDraftModules(module)} /><span><strong>{MODULE_LABELS[module]}</strong></span></label>)}</div><h3>Établissements</h3><div className="access-check-grid">{db.sites.map(site => <label className={accountDraft.scope?.siteIds.includes(site.id) ? 'active' : ''} key={site.id}><input type="checkbox" checked={accountDraft.scope?.siteIds.includes(site.id) || false} onChange={() => updateDraftScope('siteIds', site.id)} /><span><strong>{site.name}</strong></span></label>)}</div><h3>Points de vente</h3><div className="access-check-grid compact">{accountCandidatePOS.map(pos => <label className={accountDraft.scope?.posIds.includes(pos.id) ? 'active' : ''} key={pos.id}><input type="checkbox" checked={accountDraft.scope?.posIds.includes(pos.id) || false} onChange={() => updateDraftScope('posIds', pos.id)} /><span><strong>{pos.name}</strong></span></label>)}</div><h3>Dépôts</h3><div className="access-check-grid compact">{accountCandidateWarehouses.map(warehouse => <label className={accountDraft.scope?.warehouseIds.includes(warehouse.id) ? 'active' : ''} key={warehouse.id}><input type="checkbox" checked={accountDraft.scope?.warehouseIds.includes(warehouse.id) || false} onChange={() => updateDraftScope('warehouseIds', warehouse.id)} /><span><strong>{warehouse.name}</strong></span></label>)}</div></section><section className="wide"><h3>Interfaces autorisées</h3><div className="access-view-permissions">{(accountTemplate?.viewIds || []).filter(view => Boolean(accountDraft.scope && canAccessBackofficeView(accountDraft.role, accountDraft.scope.modules, view))).map(view => <label className={accountDraft.allowedViews?.includes(view) ? 'active' : ''} key={view}><input type="checkbox" checked={accountDraft.allowedViews?.includes(view) || false} onChange={() => setAccountDraft(current => current ? { ...current, allowedViews: toggleValue(current.allowedViews || [], view) } : current)} /><span>{BACKOFFICE_VIEW_LABELS[view as keyof typeof BACKOFFICE_VIEW_LABELS]}</span></label>)}</div></section></div> : <div className="access-invite-summary"><header><span className="access-account-avatar">{accountDraft.name.split(' ').map(part => part[0]).join('').slice(0, 2) || '?'}</span><div><strong>{accountDraft.name || 'Nom à compléter'}</strong><span>{accountTemplate?.name}</span><small>{accountDraft.email}</small></div></header><section><h3>Cette personne pourra consulter</h3><div>{accountAccessibleViews.map(label => <span key={label}><Check size={13} /> {label}</span>)}</div></section><section><h3>Périmètre de données appliqué</h3><div>{describeUserScope(accountDraft as User, db).map(label => <span key={label}><Building2 size={13} /> {label}</span>)}</div></section><aside><ShieldCheck size={19} /><span><strong>{accountDraft.scope?.modules.length || 0} module(s) · {accountAccessibleViews.length} interface(s)</strong><small>Les autres modules, menus, POS et dépôts resteront invisibles.</small></span></aside></div>}<div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => accountStep === 1 ? setAccountDraft(null) : setAccountStep(1)}>{accountStep === 1 ? 'Annuler' : 'Modifier'}</button>{accountStep === 1 ? <button type="button" className="btn btn-primary" disabled={!accountDraft.name.trim() || !accountDraft.email?.trim() || !accountDraft.scope?.modules.length || !accountDraft.scope.siteIds.length || !accountDraft.allowedViews?.length} onClick={() => setAccountStep(2)}>Vérifier l’accès <ArrowRight size={16} /></button> : <button type="button" className="btn btn-primary" onClick={saveAccount}><Mail size={16} /> {accountDraft.id ? 'Enregistrer' : 'Créer l’invitation'}</button>}</div></section></div>}

    {templateDraft && <div className="modal-overlay" onClick={() => setTemplateDraft(null)}><section className="modal-card access-template-modal" onClick={event => event.stopPropagation()}><div className="modal-header"><div><span>MODÈLE DE RÔLE</span><h2>Configurer {templateDraft.name}</h2><p>Une permission ne peut jamais dépasser les limites techniques du rôle.</p></div><button type="button" className="icon-btn" onClick={() => setTemplateDraft(null)} aria-label="Fermer"><X size={19} /></button></div><div className="access-template-form"><label>Nom du modèle<input value={templateDraft.name} onChange={event => setTemplateDraft({ ...templateDraft, name: event.target.value })} /></label><label>Description<textarea value={templateDraft.description} onChange={event => setTemplateDraft({ ...templateDraft, description: event.target.value })} /></label><section><h3>Modules</h3><div className="access-check-grid">{db.sartalBrandSettings.enabledModules.map(module => <label className={templateDraft.modules.includes(module) ? 'active' : ''} key={module}><input type="checkbox" checked={templateDraft.modules.includes(module)} onChange={() => setTemplateDraft({ ...templateDraft, modules: toggleValue(templateDraft.modules, module) })} /><span><strong>{MODULE_LABELS[module]}</strong></span></label>)}</div></section><section><h3>Interfaces permises par le rôle</h3><div className="access-view-permissions">{BACKOFFICE_VIEW_IDS.filter(view => canAccessBackofficeView(templateDraft.role, templateDraft.modules, view)).map(view => <label className={templateDraft.viewIds.includes(view) ? 'active' : ''} key={view}><input type="checkbox" checked={templateDraft.viewIds.includes(view)} onChange={() => setTemplateDraft({ ...templateDraft, viewIds: toggleValue(templateDraft.viewIds, view) })} /><span>{BACKOFFICE_VIEW_LABELS[view]}</span></label>)}</div></section></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setTemplateDraft(null)}>Annuler</button><button type="button" className="btn btn-primary" onClick={() => { const saved = execute(() => state.saveAccessRoleTemplate(templateDraft), 'Modèle de rôle enregistré et journalisé.'); if (saved) setTemplateDraft(null); }}><CheckCircle2 size={16} /> Enregistrer le modèle</button></div></section></div>}
  </section>;
};

export default AccessGovernanceCenter;
