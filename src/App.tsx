import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useStockState } from './hooks/useStockState';
import { 
  LayoutDashboard, 
  PlayCircle,
  CircleDollarSign,
  ShieldCheck,
  FileSearch,
  GitBranch,
  Package, 
  Warehouse, 
  Layers, 
  ShoppingCart, 
  ClipboardCheck, 
  ArrowRightLeft, 
  Trash2, 
  Activity, 
  AlertTriangle, 
  Users, 
  Settings as SettingsIcon, 
  Network, 
  FileSpreadsheet,
  Download,
  Moon,
  Sun,
  Menu,
  X,
  User,
  Truck,
  Search,
  Bell,
  BellRing,
  BedDouble,
  HeartHandshake,
  UsersRound,
  CheckCheck,
  Cloud,
  Command,
  LogIn,
  Radio,
  RefreshCw,
  WifiOff,
  ChevronDown,
  ArrowLeft,
  Landmark,
  ContactRound
} from 'lucide-react';
import { canUserAccessBackofficeView, type BackofficeViewId } from './accessControl';
import { DEMO_ACCESS_POLICIES, getDemoPerspective, getDemoUniverse, type DemoPerspective, type DemoUniverse } from './demoPortalConfig';
import { USER_ROLE_LABELS, describeUserScope, scopeDatabaseForUser } from './accessGovernance';

const Dashboard = lazy(() => import('./views/Dashboard'));
const ManagerAnswer = lazy(() => import('./views/ManagerAnswer'));
const BehaviorSimulation = lazy(() => import('./views/BehaviorSimulation'));
const StockControl = lazy(() => import('./views/StockControl'));
const StockAudit = lazy(() => import('./views/StockAudit'));
const MappingControl = lazy(() => import('./views/MappingControl'));
const Products = lazy(() => import('./views/Products'));
const Warehouses = lazy(() => import('./views/Warehouses'));
const Stocks = lazy(() => import('./views/Stocks'));
const Purchases = lazy(() => import('./views/Purchases'));
const Receiving = lazy(() => import('./views/Receiving'));
const Transfers = lazy(() => import('./views/Transfers'));
const Inventories = lazy(() => import('./views/Inventories'));
const Losses = lazy(() => import('./views/Losses'));
const Movements = lazy(() => import('./views/Movements'));
const Reorder = lazy(() => import('./views/Reorder'));
const Suppliers = lazy(() => import('./views/Suppliers'));
const Settings = lazy(() => import('./views/Settings'));
const Connectors = lazy(() => import('./views/Connectors'));
const POSImports = lazy(() => import('./views/POSImports'));
const Exports = lazy(() => import('./views/Exports'));
const POSPricing = lazy(() => import('./views/POSPricing'));
const DeliveryDemo = lazy(() => import('./views/DeliveryDemo'));
const GuidedDemo = lazy(() => import('./views/GuidedDemo'));
const BusinessProblems = lazy(() => import('./views/BusinessProblems'));
const SmartAlerts = lazy(() => import('./views/SmartAlerts'));
const PMSHotel = lazy(() => import('./views/PMSHotel'));
const PMSGuestExperiencePortal = lazy(() => import('./views/PMSSignatureExperience').then(module => ({ default: module.PMSGuestExperiencePortal })));
const PMSPublicBooking = lazy(() => import('./views/PMSPublicBooking'));
const SartalClient = lazy(() => import('./views/SartalClient'));
const RestaurantGuestPaymentPortal = lazy(() => import('./views/RestaurantGuestPaymentPortal'));
const CustomerExperienceCockpit = lazy(() => import('./views/CustomerExperienceCockpit'));
const CustomerGrowthCenter = lazy(() => import('./views/CustomerGrowthCenter'));
const FinanceCenter = lazy(() => import('./views/FinanceCenter'));
const EmployeeWorkspace = lazy(() => import('./views/EmployeeWorkspace'));
const TeamManagement = lazy(() => import('./views/TeamManagement'));
const SartalAccessCenter = lazy(() => import('./views/SartalAccessCenter'));
const SartalPulse = lazy(() => import('./views/SartalPulse'));
const DemoPortal = lazy(() => import('./views/DemoPortal'));

const AppLoading = () => <div className="app-route-loading"><img src="./brand-mark.svg" alt="" /><span>Chargement du poste…</span></div>;
const PublicAccessError: React.FC<{ eyebrow: string; title: string; message: string; supportPhone?: string }> = ({ eyebrow, title, message, supportPhone }) => <main className="public-access-error"><section><img src="./brand-mark.svg" alt="Sártal" /><span>{eyebrow}</span><h1>{title}</h1><p>{message}</p>{supportPhone && <a href={`tel:${supportPhone.replace(/\s/g, '')}`}><HeartHandshake size={17} /> Contacter l’établissement · {supportPhone}</a>}<small>Vos données restent protégées. Aucun accès au back-office n’a été ouvert.</small></section></main>;

const returnToDemoPortal = (universe: DemoUniverse) => {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('demo', 'portal');
  url.searchParams.set('univers', universe.id);
  window.location.assign(url.toString());
};

const DemoExperienceBar: React.FC<{ universe: DemoUniverse; perspective: DemoPerspective }> = ({ universe, perspective }) => (
  <header className="demo-experience-bar">
    <button onClick={() => returnToDemoPortal(universe)}><ArrowLeft size={17} /><span>Retour aux profils</span></button>
    <div><small>{universe.label}</small><strong>{perspective.label}</strong></div>
    <b>MODE DÉMO</b>
  </header>
);

const DemoExperienceFrame: React.FC<React.PropsWithChildren<{ universe: DemoUniverse; perspective: DemoPerspective }>> = ({ universe, perspective, children }) => (
  <div className="demo-experience-frame"><DemoExperienceBar universe={universe} perspective={perspective} />{children}</div>
);

const returnToAccessCenter = () => {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('connexion', '1');
  window.location.assign(url.toString());
};

const AccessExperienceBar = () => (
  <header className="demo-experience-bar access-experience-bar">
    <button onClick={returnToAccessCenter}><ArrowLeft size={17} /><span>Retour aux espaces</span></button>
    <div><small>Centre d’accès Sártal</small><strong>Espace sélectionné</strong></div>
    <b>ACCÈS</b>
  </header>
);

const AccessExperienceFrame: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="access-experience-frame"><AccessExperienceBar />{children}</div>
);

const leaveAccessPreview = () => {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('pilotage', '1');
  window.location.assign(url.toString());
};

const AccessPreviewBar: React.FC<{ userName: string; roleLabel: string; scopeLabel: string }> = ({ userName, roleLabel, scopeLabel }) => (
  <header className="access-preview-bar">
    <button type="button" onClick={leaveAccessPreview}><ArrowLeft size={17} /><span>Quitter l’aperçu</span></button>
    <div><small>APERÇU ISOLÉ · LECTURE SEULE</small><strong>{userName} · {roleLabel}</strong><span>{scopeLabel}</span></div>
    <b><ShieldCheck size={15} /> Aucun impact sur la session</b>
  </header>
);

export const App: React.FC = () => {
  const state = useStockState();
  const rawDb = state.db;
  const queryParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const demoMode = queryParams.get('demo');
  const accessPreviewId = queryParams.get('apercu');
  const pilotageMode = queryParams.get('pilotage');
  const accessCenterOrigin = queryParams.get('origine') === 'connexion';
  const demoUniverse = demoMode !== 'portal' ? getDemoUniverse(demoMode) : undefined;
  const demoPerspective = getDemoPerspective(demoUniverse, queryParams.get('profil'));
  const demoBackoffice = demoPerspective?.target.type === 'backoffice' ? demoPerspective.target : undefined;
  const demoPolicy = demoBackoffice ? DEMO_ACCESS_POLICIES[demoBackoffice.policy] : undefined;
  const demoRoleUser = demoBackoffice ? rawDb.users.find(user => user.role === demoBackoffice.role) : undefined;
  const accessPreviewUser = !demoUniverse && ['admin', 'director'].includes(rawDb.currentUser.role)
    ? rawDb.users.find(user => user.id === accessPreviewId && user.status === 'active' && (rawDb.currentUser.role === 'admin' || user.role !== 'admin'))
    : undefined;
  const identityDb = demoUniverse ? {
    ...rawDb,
    currentUser: demoBackoffice
      ? { ...rawDb.currentUser, ...demoRoleUser, name: demoPerspective?.label || demoRoleUser?.name || rawDb.currentUser.name, role: demoBackoffice.role }
      : rawDb.currentUser,
    sartalBrandSettings: { ...rawDb.sartalBrandSettings, enabledModules: demoUniverse.modules }
  } : accessPreviewUser ? { ...rawDb, currentUser: accessPreviewUser } : rawDb;
  const db = scopeDatabaseForUser(identityDb, identityDb.currentUser);
  const scopedState = { ...state, db };
  const experienceState = accessPreviewUser ? new Proxy(scopedState, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (property === 'db' || typeof value !== 'function') return value;
      return () => window.alert('Mode aperçu en lecture seule : quittez l’aperçu pour effectuer une modification.');
    }
  }) : scopedState;
  const [view, setView] = useState<string>(demoBackoffice?.view || accessPreviewUser?.allowedViews?.[0] || 'pulse');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [expandedSidebarSections, setExpandedSidebarSections] = useState<Set<string>>(() => new Set());
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState(() => new Date().toISOString());
  const [storageProtected, setStorageProtected] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sartal_read_notifications') || '[]') as string[]); }
    catch { return new Set(); }
  });
  const frameAccessExperience = (content: React.ReactNode) => accessCenterOrigin ? <AccessExperienceFrame>{content}</AccessExperienceFrame> : content;

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setOfflineOpen(false);
      }
    };
    const handleOnline = () => {
      setIsOnline(true);
      state.syncSartalOfflineActions();
      setLastSyncAt(new Date().toISOString());
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state]);

  useEffect(() => {
    localStorage.setItem('sartal_read_notifications', JSON.stringify([...readNotificationIds]));
  }, [readNotificationIds]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      if (window.matchMedia('(max-width: 768px)').matches) window.scrollTo({ top: 0, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  if (demoMode === 'portal') {
    return <Suspense fallback={<AppLoading />}><DemoPortal initialUniverseId={queryParams.get('univers') || undefined} /></Suspense>;
  }
  if (demoUniverse && demoPerspective && demoPerspective.target.type !== 'backoffice') {
    const target = demoPerspective.target;
    if (target.type === 'employee') {
      return <DemoExperienceFrame universe={demoUniverse} perspective={demoPerspective}><Suspense fallback={<AppLoading />}><main className="sartal-public-employee-app"><EmployeeWorkspace state={experienceState} initialRole={target.role} demoAutoStart /></main></Suspense></DemoExperienceFrame>;
    }
    if (target.type === 'client') {
      return <DemoExperienceFrame universe={demoUniverse} perspective={demoPerspective}><Suspense fallback={<AppLoading />}><main className="sartal-public-client-app"><SartalClient state={experienceState} initialMode={target.mode} initialHub={target.initialHub} standalone /></main></Suspense></DemoExperienceFrame>;
    }
    const demoReservation = db.pmsReservations.find(item => item.status === 'checked_in') || db.pmsReservations.find(item => item.status === 'confirmed') || db.pmsReservations[0];
    return <DemoExperienceFrame universe={demoUniverse} perspective={demoPerspective}><Suspense fallback={<AppLoading />}><main className="pms-public-guest-app"><PMSGuestExperiencePortal state={experienceState} initialReservationId={demoReservation?.id} standalone /></main></Suspense></DemoExperienceFrame>;
  }
  if (demoMode && demoMode !== 'portal' && (!demoUniverse || !demoPerspective)) {
    return <Suspense fallback={<AppLoading />}><DemoPortal initialUniverseId={demoUniverse?.id} /></Suspense>;
  }

  const accessCenterMode = queryParams.get('connexion');
  if (accessCenterMode !== null) {
    if (accessCenterMode === '1') return <Suspense fallback={<AppLoading />}><SartalAccessCenter state={state} /></Suspense>;
    return <PublicAccessError eyebrow="CENTRE D’ACCÈS" title="Adresse de connexion incorrecte" message="Utilisez le raccourci officiel de votre établissement pour ouvrir votre espace." supportPhone={db.sartalBrandSettings.supportPhone} />;
  }
  const guestReservationId = queryParams.get('sejour');
  if (guestReservationId !== null) {
    if (guestReservationId && db.pmsReservations.some(item => item.id === guestReservationId)) {
      return <Suspense fallback={<AppLoading />}>{frameAccessExperience(<main className="pms-public-guest-app"><PMSGuestExperiencePortal state={state} initialReservationId={guestReservationId} standalone requireAccess /></main>)}</Suspense>;
    }
    return <PublicAccessError eyebrow="MON SÉJOUR" title="Ce lien de séjour n’est plus disponible" message="Demandez un nouveau lien privé à la réception pour retrouver votre chambre, vos services et votre folio." supportPhone={db.sartalBrandSettings.supportPhone} />;
  }
  const publicHotelBooking = queryParams.get('reservation');
  if (publicHotelBooking !== null) {
    if (publicHotelBooking === 'hotel' && db.sartalBrandSettings.enabledModules.includes('pms')) {
      return <Suspense fallback={<AppLoading />}>{frameAccessExperience(<PMSPublicBooking state={state} />)}</Suspense>;
    }
    return <PublicAccessError eyebrow="RÉSERVATION HÔTEL" title="La réservation directe n’est pas disponible" message="Ce module est désactivé ou l’adresse utilisée n’est pas valide. Contactez la réception pour réserver." supportPhone={db.sartalBrandSettings.supportPhone} />;
  }
  const publicClientMode = queryParams.get('client');
  const publicEmployeeMode = queryParams.get('equipe');
  const restaurantInviteToken = queryParams.get('invite');
  const restaurantInvite = db.restaurantGuestInvites.find(item => item.linkToken === restaurantInviteToken && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now()));
  if (restaurantInviteToken !== null) {
    if (restaurantInvite) {
      return <Suspense fallback={<AppLoading />}><main className="sartal-public-client-app"><RestaurantGuestPaymentPortal state={state} inviteId={restaurantInvite.id} /></main></Suspense>;
    }
    return <PublicAccessError eyebrow="ADDITION PARTAGÉE" title="Cette invitation n’est plus disponible" message="Le lien a expiré ou a été remplacé. Demandez simplement une nouvelle invitation à l’hôte de la table." supportPhone={db.sartalBrandSettings.supportPhone} />;
  }
  const publicAccessToken = queryParams.get('access');
  const publicAccess = db.sartalClientAccess.find(item => item.linkToken === publicAccessToken && item.status === 'active' && new Date(item.expiresAt).getTime() > Date.now());
  if (publicAccessToken !== null) {
    if (publicAccess) {
      const accessCustomer = db.sartalCustomers.find(item => item.id === publicAccess.customerId);
      if (!accessCustomer) {
        return <PublicAccessError eyebrow="MON SÁRTAL" title="Profil client indisponible" message="Ce lien ne correspond plus à un profil actif. Demandez un nouvel accès personnel à l’établissement." supportPhone={db.sartalBrandSettings.supportPhone} />;
      }
      const accessMode = db.restaurantGuestOrders.some(item => item.customerId === accessCustomer?.id && !['paid', 'cancelled'].includes(item.status)) ? 'restaurant' : 'delivery';
      return <Suspense fallback={<AppLoading />}><main className="sartal-public-client-app"><SartalClient state={state} initialMode={accessMode} initialCustomerId={publicAccess.customerId} initialHub standalone /></main></Suspense>;
    }
    return <PublicAccessError eyebrow="MON SÁRTAL" title="Votre accès personnel a expiré" message="Ce lien temporaire a été fermé pour protéger votre compte. Demandez simplement un nouveau lien par WhatsApp, SMS ou QR code." supportPhone={db.sartalBrandSettings.supportPhone} />;
  }
  if (publicClientMode !== null) {
    if (publicClientMode === 'restaurant' || publicClientMode === 'delivery') {
      return <Suspense fallback={<AppLoading />}>{frameAccessExperience(<main className="sartal-public-client-app"><SartalClient state={state} initialMode={publicClientMode} standalone requireAccess /></main>)}</Suspense>;
    }
    return <PublicAccessError eyebrow="MON SÁRTAL" title="Adresse client incorrecte" message="Le service demandé n’existe pas ou n’est plus actif. Utilisez le lien transmis par l’établissement." supportPhone={db.sartalBrandSettings.supportPhone} />;
  }
  if (publicEmployeeMode !== null) {
    if (publicEmployeeMode === '1') {
      return <Suspense fallback={<AppLoading />}>{frameAccessExperience(<main className="sartal-public-employee-app"><EmployeeWorkspace state={state} /></main>)}</Suspense>;
    }
    return <PublicAccessError eyebrow="SÁRTAL ÉQUIPE" title="Poste employé introuvable" message="Ouvrez Sártal Équipe depuis le raccourci installé sur votre appareil ou contactez votre responsable." />;
  }
  if (!demoBackoffice && pilotageMode !== '1') {
    return <Suspense fallback={<AppLoading />}><DemoPortal /></Suspense>;
  }

  // Navigation visible par role, organisee autour des parcours metier et du socle stock commun.
  const sidebarLinks: Array<{ id: BackofficeViewId; label: string; mobileLabel?: string; icon: React.ReactNode; section: string }> = [
    { id: 'pulse', label: 'Sártal Pulse', mobileLabel: 'Pulse', icon: <Radio size={18} />, section: 'Accueil' },
    { id: 'dashboard', label: 'Tableau de bord', mobileLabel: 'Accueil', icon: <LayoutDashboard size={18} />, section: 'Accueil' },
    { id: 'guided-demo', label: 'Présentation guidée', mobileLabel: 'Guide', icon: <PlayCircle size={18} />, section: 'Accueil' },
    { id: 'business-problems', label: 'Problèmes métier', mobileLabel: 'Cas', icon: <FileSearch size={18} />, section: 'Accueil' },
    { id: 'client', label: 'Suivi clients en direct', mobileLabel: 'Clients', icon: <HeartHandshake size={18} />, section: 'Accueil' },

    { id: 'crm', label: 'CRM & fidélité', mobileLabel: 'CRM', icon: <ContactRound size={18} />, section: 'Clients' },

    { id: 'employees', label: ['admin', 'director'].includes(db.currentUser.role) ? 'Organisation & accès' : 'Équipes & planning', mobileLabel: 'Équipes', icon: <UsersRound size={18} />, section: 'Équipes' },

    { id: 'answer', label: 'Salle & opérations', mobileLabel: 'Salle', icon: <ClipboardCheck size={18} />, section: 'Restaurant' },
    { id: 'simulation', label: 'Simulation multi-POS', mobileLabel: 'Démo', icon: <PlayCircle size={18} />, section: 'Restaurant' },
    { id: 'connectors', label: 'Caisse POS', icon: <Network size={18} />, section: 'Restaurant' },
    { id: 'pos-imports', label: 'Reprendre ventes caisse', mobileLabel: 'Ventes', icon: <FileSpreadsheet size={18} />, section: 'Restaurant' },

    { id: 'pms', label: 'Hôtel / PMS', mobileLabel: 'PMS', icon: <BedDouble size={18} />, section: 'Hôtel' },

    { id: 'delivery', label: 'Parcours livraison', mobileLabel: 'Livraison', icon: <Truck size={18} />, section: 'Livraison' },

    { id: 'stock-control', label: 'Stock réel', mobileLabel: 'Stock', icon: <ShieldCheck size={18} />, section: 'Socle stock' },
    { id: 'products', label: 'Catalogue & recettes', icon: <Package size={18} />, section: 'Socle stock' },
    { id: 'pricing', label: 'Prix par canal', icon: <CircleDollarSign size={18} />, section: 'Socle stock' },
    { id: 'warehouses', label: 'Canaux & dépôts', icon: <Warehouse size={18} />, section: 'Socle stock' },
    { id: 'stocks', label: 'Lots de stock', icon: <Layers size={18} />, section: 'Socle stock' },

    { id: 'reorder', label: 'À commander', icon: <AlertTriangle size={18} />, section: 'Opérations' },
    { id: 'purchases', label: 'Achats fournisseurs', icon: <ShoppingCart size={18} />, section: 'Opérations' },
    { id: 'receiving', label: 'Réceptions stock', icon: <ClipboardCheck size={18} />, section: 'Opérations' },
    { id: 'transfers', label: 'Transferts dépôts', icon: <ArrowRightLeft size={18} />, section: 'Opérations' },
    { id: 'inventories', label: 'Inventaires', icon: <ClipboardCheck size={18} />, section: 'Opérations' },
    { id: 'losses', label: 'Pertes & casses', icon: <Trash2 size={18} />, section: 'Opérations' },
    { id: 'suppliers', label: 'Fournisseurs', icon: <Users size={18} />, section: 'Opérations' },

    { id: 'stock-audit', label: 'Audit des écarts', mobileLabel: 'Écarts', icon: <FileSearch size={18} />, section: 'Contrôle' },
    { id: 'finance', label: 'Finance & rapprochement', mobileLabel: 'Finance', icon: <Landmark size={18} />, section: 'Contrôle' },
    { id: 'smart-alerts', label: 'Alertes intelligentes', mobileLabel: 'Alertes', icon: <Bell size={18} />, section: 'Contrôle' },
    { id: 'mapping-control', label: 'Contrôle des données', mobileLabel: 'Dépôts', icon: <GitBranch size={18} />, section: 'Contrôle' },
    { id: 'movements', label: 'Journal stock', icon: <Activity size={18} />, section: 'Contrôle' },
    { id: 'exports', label: 'Rapports', mobileLabel: 'Rapports', icon: <Download size={18} />, section: 'Contrôle' },
    { id: 'settings', label: 'Réglages', icon: <SettingsIcon size={18} />, section: 'Réglages' }
  ];

  const allowedLinks = sidebarLinks.filter(link => (
    canUserAccessBackofficeView(db.currentUser, db.sartalBrandSettings.enabledModules, link.id)
    && (!demoPolicy || demoPolicy.views.includes(link.id))
  ));
  const canOpenView = (candidate: string) => allowedLinks.some(link => link.id === candidate);
  const sidebarSections = [
    { id: 'Accueil', label: 'Accueil' },
    { id: 'Clients', label: 'Clients & fidélité' },
    { id: 'Équipes', label: 'Gestion des équipes' },
    { id: 'Restaurant', label: 'Parcours restaurant' },
    { id: 'Hôtel', label: 'Module Hôtel / PMS' },
    { id: 'Livraison', label: 'Parcours livraison' },
    { id: 'Socle stock', label: 'Socle stock commun' },
    { id: 'Opérations', label: 'Opérations stock' },
    { id: 'Contrôle', label: 'Contrôle & rapports' },
    { id: 'Réglages', label: 'Réglages' }
  ];
  const mobilePrimaryOrder = ['pulse', 'employees', 'client', 'pms', 'stock-control'];
  const mobilePrimaryLinks = mobilePrimaryOrder
    .map(id => allowedLinks.find(link => link.id === id))
    .filter((link): link is NonNullable<typeof link> => Boolean(link));
  const currentNavLink = sidebarLinks.find(link => link.id === view);
  const currentSection = sidebarSections.find(section => section.id === currentNavLink?.section);
  const globalSearchResults = (() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return [];
    const navMatches = allowedLinks
      .filter(link => `${link.label} ${link.section}`.toLowerCase().includes(query))
      .map(link => ({ id: `nav-${link.id}`, category: 'Navigation', label: link.label, detail: link.section, view: link.id }));
    const productMatches = db.products
      .filter(product => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query))
      .slice(0, 5)
      .map(product => ({ id: `product-${product.id}`, category: 'Produit', label: product.name, detail: `${product.sku} · ${product.category}`, view: 'products' }));
    const warehouseMatches = db.warehouses
      .filter(warehouse => warehouse.name.toLowerCase().includes(query))
      .slice(0, 3)
      .map(warehouse => ({ id: `warehouse-${warehouse.id}`, category: 'Dépôt', label: warehouse.name, detail: db.sites.find(site => site.id === warehouse.siteId)?.name || 'Dépôt', view: 'warehouses' }));
    const orderMatches = db.deliveryOrders
      .filter(order => `${order.id} ${order.customerName} ${order.address}`.toLowerCase().includes(query))
      .slice(0, 3)
      .map(order => ({ id: `order-${order.id}`, category: 'Livraison', label: order.id, detail: `${order.customerName} · ${order.status}`, view: 'delivery' }));
    const pmsMatches = db.pmsReservations
      .filter(reservation => {
        const room = db.pmsRooms.find(item => item.id === reservation.roomId);
        const guest = db.pmsGuests.find(item => item.id === reservation.guestId);
        return `${guest?.fullName || ''} ${guest?.phone || ''} ${reservation.confirmationNumber} ${room?.roomNumber || ''}`.toLowerCase().includes(query);
      })
      .slice(0, 3)
      .map(reservation => {
        const room = db.pmsRooms.find(item => item.id === reservation.roomId);
        const guest = db.pmsGuests.find(item => item.id === reservation.guestId);
        return { id: `reservation-${reservation.id}`, category: 'Séjour', label: room ? `Chambre ${room.roomNumber}` : reservation.confirmationNumber, detail: `${guest?.fullName || reservation.confirmationNumber} · ${reservation.status}`, view: 'pms' };
      });
    const customerMatches = db.sartalCustomers
      .filter(customer => `${customer.fullName} ${customer.phone} ${customer.email || ''}`.toLowerCase().includes(query))
      .slice(0, 4)
      .map(customer => ({ id: `customer-${customer.id}`, category: 'Client', label: customer.fullName, detail: `${customer.phone} · ${customer.loyaltyTier}`, view: 'client' }));
    const supplierMatches = db.suppliers
      .filter(supplier => `${supplier.name} ${supplier.contact} ${supplier.phone}`.toLowerCase().includes(query))
      .slice(0, 3)
      .map(supplier => ({ id: `supplier-${supplier.id}`, category: 'Fournisseur', label: supplier.name, detail: `${supplier.contact} · ${supplier.phone}`, view: 'suppliers' }));
    const posMatches = db.posList
      .filter(pos => `${pos.name} ${pos.type}`.toLowerCase().includes(query))
      .slice(0, 3)
      .map(pos => ({ id: `pos-${pos.id}`, category: 'Canal de vente', label: pos.name, detail: db.warehouses.find(item => item.id === pos.defaultWarehouseId)?.name || pos.type, view: 'warehouses' }));
    const employeeMatches = db.employeeProfiles
      .filter(employee => `${employee.name} ${employee.employeeNumber} ${employee.role}`.toLowerCase().includes(query))
      .slice(0, 3)
      .map(employee => ({ id: `employee-${employee.id}`, category: 'Équipe', label: employee.name, detail: `${employee.employeeNumber} · ${employee.role.replaceAll('_', ' ')}`, view: 'employees' }));
    return [...navMatches, ...customerMatches, ...pmsMatches, ...orderMatches, ...productMatches, ...warehouseMatches, ...supplierMatches, ...posMatches, ...employeeMatches]
      .filter(result => allowedLinks.some(link => link.id === result.view))
      .slice(0, 18);
  })();

  const operationalNotifications = (() => {
    const items: Array<{ id: string; tone: 'danger' | 'warning' | 'info'; title: string; detail: string; view: string }> = [];
    db.sartalCustomerFeedback.filter(item => item.recoveryStatus === 'open').forEach(item => items.push({ id: `feedback-${item.id}`, tone: 'danger', title: `Client insatisfait · ${item.score}/5`, detail: `${item.assignedTo || 'Relation client'} doit reprendre contact`, view: 'client' }));
    db.deliveryOrders.filter(item => item.status === 'failed').forEach(item => items.push({ id: `delivery-${item.id}`, tone: 'danger', title: `Incident ${item.id}`, detail: `${item.customerName} · ${item.deliveryIssue || 'Livraison interrompue'}`, view: 'delivery' }));
    db.employeeApprovals.filter(item => item.status === 'pending').forEach(item => items.push({ id: `approval-${item.id}`, tone: 'warning', title: item.label, detail: `${item.requestedByName} attend une validation`, view: 'employees' }));
    db.pmsMaintenanceTickets.filter(item => !['resolved', 'verified'].includes(item.status)).forEach(item => items.push({ id: `maintenance-${item.id}`, tone: item.priority === 'critical' ? 'danger' : 'warning', title: item.equipment, detail: `Maintenance hôtel · ${item.assignedTo}`, view: 'pms' }));
    db.employeeMessages.filter(item => item.priority === 'urgent').forEach(item => items.push({ id: `message-${item.id}`, tone: 'info', title: `Consigne urgente · ${item.senderName}`, detail: item.content, view: 'employees' }));
    db.stocks.filter(item => item.quantityAvailable - item.quantityReserved <= item.alertThreshold).slice(0, 5).forEach(item => items.push({ id: `stock-${item.productId}-${item.warehouseId}`, tone: 'warning', title: db.products.find(product => product.id === item.productId)?.name || 'Stock faible', detail: `${db.warehouses.find(warehouse => warehouse.id === item.warehouseId)?.name} · seuil atteint`, view: 'stock-control' }));
    return items.filter(item => allowedLinks.some(link => link.id === item.view)).slice(0, 16);
  })();
  const unreadNotifications = operationalNotifications.filter(item => !readNotificationIds.has(item.id));
  const queuedOfflineActions = db.sartalOfflineActions.filter(item => item.status === 'queued');

  const openView = (nextView: string) => {
    if (!canOpenView(nextView)) return;
    setView(nextView);
    setExpandedSidebarSections(new Set());
    setMobileMenuOpen(false);
    setGlobalSearch('');
    setSearchOpen(false);
    setNotificationsOpen(false);
  };

  const openNotification = (id: string, nextView: string) => {
    setReadNotificationIds(current => new Set([...current, id]));
    openView(nextView);
  };

  const syncOfflineActions = () => {
    if (!isOnline) return;
    state.syncSartalOfflineActions();
    setLastSyncAt(new Date().toISOString());
  };

  const protectLocalStorage = async () => {
    const protectedStorage = await navigator.storage?.persist?.();
    setStorageProtected(Boolean(protectedStorage));
  };

  const activeSiteProfile = db.sartalBrandSettings.siteProfiles.find(item => item.siteId === db.sites[0]?.id);

  const renderView = () => {
    // Role checks fallback
    const currentLink = sidebarLinks.find(l => l.id === view);
    if (currentLink && !allowedLinks.some(link => link.id === currentLink.id)) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={50} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <h2>Accès Refusé</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Votre profil ou l’offre active de cet établissement ne permet pas d’accéder à cette vue.
          </p>
        </div>
      );
    }

    switch (view) {
      case 'pulse':
        return <SartalPulse state={experienceState} setView={openView} canAccessView={canOpenView} />;
      case 'dashboard':
        return <Dashboard state={experienceState} setView={openView} canAccessView={canOpenView} showRoleSwitcher={!demoBackoffice && db.currentUser.role === 'admin'} />;
      case 'guided-demo':
        return <GuidedDemo state={experienceState} setView={openView} />;
      case 'business-problems':
        return <BusinessProblems state={experienceState} setView={openView} />;
      case 'client':
        return <CustomerExperienceCockpit state={experienceState} />;
      case 'crm':
        return <CustomerGrowthCenter state={experienceState} />;
      case 'employees':
        return <TeamManagement state={experienceState} />;
      case 'finance':
        return <FinanceCenter state={experienceState} />;
      case 'answer':
        return <ManagerAnswer state={experienceState} setView={openView} canAccessView={canOpenView} />;
      case 'simulation':
        return <BehaviorSimulation state={experienceState} setView={openView} />;
      case 'delivery':
        return <DeliveryDemo state={experienceState} setView={openView} canAccessView={canOpenView} />;
      case 'pms':
        return <PMSHotel state={experienceState} setView={openView} initialTab={demoPolicy?.initialPmsTab} allowedTabs={demoPolicy?.pmsTabs} canAccessView={canOpenView} />;
      case 'stock-control':
        return <StockControl state={experienceState} setView={openView} canAccessView={canOpenView} />;
      case 'mapping-control':
        return <MappingControl state={experienceState} setView={openView} canAccessView={canOpenView} />;
      case 'stock-audit':
        return <StockAudit state={experienceState} setView={openView} canAccessView={canOpenView} />;
      case 'smart-alerts':
        return <SmartAlerts state={experienceState} setView={openView} canAccessView={canOpenView} />;
      case 'products':
        return <Products state={experienceState} />;
      case 'pricing':
        return <POSPricing state={experienceState} />;
      case 'warehouses':
        return <Warehouses state={experienceState} />;
      case 'stocks':
        return <Stocks state={experienceState} />;
      case 'purchases':
        return <Purchases state={experienceState} />;
      case 'receiving':
        return <Receiving state={experienceState} />;
      case 'transfers':
        return <Transfers state={experienceState} />;
      case 'inventories':
        return <Inventories state={experienceState} />;
      case 'losses':
        return <Losses state={experienceState} />;
      case 'movements':
        return <Movements state={experienceState} />;
      case 'reorder':
        return <Reorder state={experienceState} setView={openView} />;
      case 'suppliers':
        return <Suppliers state={experienceState} />;
      case 'connectors':
        return <Connectors state={experienceState} />;
      case 'pos-imports':
        return <POSImports state={experienceState} setView={openView} />;
      case 'exports':
        return <Exports state={experienceState} />;
      case 'settings':
        return <Settings state={experienceState} />;
      default:
        return <SartalPulse state={experienceState} setView={openView} canAccessView={canOpenView} />;
    }
  };

  return (
    <>
    {demoBackoffice && demoUniverse && demoPerspective && <DemoExperienceBar universe={demoUniverse} perspective={demoPerspective} />}
    {accessPreviewUser && <AccessPreviewBar userName={accessPreviewUser.name} roleLabel={USER_ROLE_LABELS[accessPreviewUser.role]} scopeLabel={describeUserScope(accessPreviewUser, rawDb).slice(0, 3).join(' · ')} />}
    {accessCenterOrigin && !demoBackoffice && <AccessExperienceBar />}
    <div className={`app-container ${demoBackoffice ? 'demo-backoffice-app' : ''} ${accessPreviewUser ? 'access-preview-app' : ''} ${accessCenterOrigin && !demoBackoffice ? 'access-backoffice-app' : ''}`} style={{ '--primary': activeSiteProfile?.primaryColor || db.sartalBrandSettings.primaryColor, '--brand-accent': activeSiteProfile?.accentColor || db.sartalBrandSettings.accentColor } as React.CSSProperties}>
      
      {/* Sidebar Panel */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        
        {/* Sidebar Brand header */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-lockup">
            <img src="./brand-mark.svg" alt="" />
            <span>
              <strong>SÁRTAL</strong>
              <small>{db.sartalBrandSettings.backOfficeName}</small>
            </span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="mobile-close-btn"
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Role Quick Indicator */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            <User size={14} />
          </div>
          <div>
            <span>Session active</span>
            <strong>{db.currentUser.name}</strong>
            <small>{USER_ROLE_LABELS[db.currentUser.role]}</small>
          </div>
        </div>

        {/* Sidebar Links Navigation */}
        <nav className="sidebar-navigation" aria-label="Navigation du back-office">
          {sidebarSections.map(section => {
            const sectionLinks = allowedLinks.filter(link => link.section === section.id);
            if (sectionLinks.length === 0) return null;
            const isCurrentSection = currentNavLink?.section === section.id;
            const isExpanded = isCurrentSection || expandedSidebarSections.has(section.id);
            const sectionPanelId = `sidebar-section-${section.id.toLowerCase().replaceAll(' ', '-')}`;

            return (
              <div
                className={`sidebar-section ${['Restaurant', 'Livraison'].includes(section.id) ? 'sidebar-section-business' : ''} ${isCurrentSection ? 'current' : ''}`}
                key={section.id}
              >
                <button
                  type="button"
                  className="sidebar-section-toggle"
                  aria-expanded={isExpanded}
                  aria-controls={sectionPanelId}
                  disabled={isCurrentSection}
                  onClick={() => {
                    if (isCurrentSection) return;
                    setExpandedSidebarSections(current => {
                      if (current.has(section.id)) return new Set();
                      return new Set([section.id]);
                    });
                  }}
                >
                  <span>{section.label}</span>
                  <span className="sidebar-section-count">{sectionLinks.length}</span>
                  <ChevronDown className={isExpanded ? 'expanded' : ''} size={16} aria-hidden="true" />
                </button>
                {isExpanded && (
                  <div className="sidebar-section-links" id={sectionPanelId}>
                    {sectionLinks.map(link => {
                      const isActive = view === link.id;
                      return (
                        <button
                          key={link.id}
                          onClick={() => openView(link.id)}
                          className={`sidebar-link ${isActive ? 'active' : ''}`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span className="sidebar-link-icon">{link.icon}</span>
                          <span className="sidebar-link-label">{link.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer (Light/Dark mode) */}
        <div className="sidebar-footer">
          <span>Version 1.0.0</span>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? 'Activer le thème clair' : 'Activer le thème sombre'}
            title={darkMode ? 'Thème clair' : 'Thème sombre'}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

      </aside>

      {mobileMenuOpen && (
        <button
          className="mobile-sidebar-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main View Area */}
      <main className="main-content" data-section={currentNavLink?.section || 'Accueil'}>
        
        {/* Global Navbar Header */}
        <header className="app-header">

          <div className="nav-current-wrapper">
            {/* Menu button for mobile */}
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={24} />
            </button>

            <div className="nav-current-view">
              <span>{currentSection?.label || 'Sartal Stock'}</span>
              <strong>{currentNavLink?.label || 'Accueil'}</strong>
            </div>
          </div>

          {/* Org & Info filters */}
          <div className="app-header-tools">
            <div className="global-search">
              <div className="input-with-icon">
                <Search size={16} />
                <input
                  className="form-control"
                  value={globalSearch}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => { setGlobalSearch(event.target.value); setSearchOpen(true); }}
                  placeholder="Rechercher partout..."
                  type="search"
                />
                <kbd>⌘K</kbd>
              </div>
            </div>
            <button className={`app-header-status ${isOnline ? 'online' : 'offline'}`} onClick={() => setOfflineOpen(true)} title="État réseau et synchronisation">{isOnline ? <Cloud size={17} /> : <WifiOff size={17} />}<span>{isOnline ? queuedOfflineActions.length ? `${queuedOfflineActions.length} à synchroniser` : 'Synchronisé' : 'Hors connexion'}</span></button>
            <button className="app-header-icon notification-trigger" onClick={() => setNotificationsOpen(true)} title="Notifications"><Bell size={18} />{unreadNotifications.length > 0 && <b>{unreadNotifications.length}</b>}</button>
            <button className="app-header-icon" onClick={() => { const url = new URL(window.location.href); url.search = ''; url.searchParams.set('connexion', '1'); window.open(url.toString(), '_blank', 'noopener,noreferrer'); }} title="Ouvrir le centre d’accès"><LogIn size={18} /></button>
            <span className="demo-mode-pill">Démo</span>
            
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', fontSize: '0.75rem' }} className="nav-company-details">
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Entreprise</span>
              <strong style={{ color: 'var(--text-primary)' }}>{db.companies[0]?.name}</strong>
            </div>

            <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)' }} className="nav-divider" />

            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', fontSize: '0.75rem' }} className="nav-site-details">
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Site Actuel</span>
              <strong style={{ color: 'var(--text-primary)' }}>{db.sites[0]?.name}</strong>
            </div>

          </div>

        </header>

        {/* Tab View Component Render */}
        <div className="main-view-scroll" ref={mainScrollRef}>
          <Suspense fallback={<AppLoading />}>{renderView()}</Suspense>
        </div>

        <nav className="mobile-bottom-nav" aria-label="Navigation principale mobile">
          {mobilePrimaryLinks.map(link => (
            <button
              key={link.id}
              onClick={() => {
                openView(link.id);
              }}
              className={view === link.id ? 'active' : ''}
            >
              {link.icon}
              <span>{link.mobileLabel || link.label}</span>
            </button>
          ))}
        </nav>

      </main>

      {/* Responsive Inline CSS overrides */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: grid !important;
          }
          .mobile-close-btn {
            display: grid !important;
          }
          .nav-company-details, .nav-site-details, .nav-divider {
            display: none !important;
          }
        }
      `}</style>

    </div>

    {searchOpen && <div className="sartal-command-backdrop" onMouseDown={() => setSearchOpen(false)}>
      <section className="sartal-command-panel" onMouseDown={event => event.stopPropagation()}>
        <header><Search size={20} /><input autoFocus value={globalSearch} onChange={event => setGlobalSearch(event.target.value)} placeholder="Produit, client, chambre, commande, fournisseur..." /><kbd>Échap</kbd></header>
        <div className="sartal-command-results">
          {globalSearch.trim() ? globalSearchResults.map(result => <button key={result.id} onClick={() => openView(result.view)}><span>{result.category}</span><div><strong>{result.label}</strong><small>{result.detail}</small></div><ArrowRightLeft size={15} /></button>) : <>
            <div className="sartal-command-intro"><Command size={22} /><div><strong>Aller directement à l’essentiel</strong><small>La recherche respecte les droits et les modules activés.</small></div></div>
            <div className="sartal-command-shortcuts">{allowedLinks.filter(link => ['pulse', 'stock-control', 'client', 'pms', 'delivery', 'employees'].includes(link.id)).map(link => <button key={link.id} onClick={() => openView(link.id)}>{link.icon}<span>{link.label}</span></button>)}</div>
          </>}
          {globalSearch.trim() && globalSearchResults.length === 0 && <div className="sartal-command-empty"><Search size={26} /><strong>Aucun résultat accessible</strong><small>Essayez un nom, un numéro, un code article ou une chambre.</small></div>}
        </div>
      </section>
    </div>}

    {notificationsOpen && <div className="sartal-drawer-backdrop" onMouseDown={() => setNotificationsOpen(false)}>
      <aside className="sartal-app-drawer notification-center" onMouseDown={event => event.stopPropagation()}>
        <header><div><BellRing size={21} /><span><strong>Centre de notifications</strong><small>{unreadNotifications.length} non lue(s) · {operationalNotifications.length} signal(s)</small></span></div><button onClick={() => setNotificationsOpen(false)}><X size={19} /></button></header>
        <div className="notification-actions"><button onClick={() => setReadNotificationIds(new Set(operationalNotifications.map(item => item.id)))}><CheckCheck size={16} /> Tout marquer comme lu</button><button onClick={() => openView('pulse')}><Radio size={16} /> Ouvrir Pulse</button></div>
        <div className="notification-list">{operationalNotifications.map(item => <button className={`${item.tone} ${readNotificationIds.has(item.id) ? 'read' : ''}`} key={item.id} onClick={() => openNotification(item.id, item.view)}><i /> <span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowRightLeft size={15} /></button>)}{operationalNotifications.length === 0 && <div className="notification-empty"><CheckCheck size={28} /><strong>Tout est à jour</strong><small>Aucun signal ne requiert votre attention.</small></div>}</div>
      </aside>
    </div>}

    {offlineOpen && <div className="sartal-drawer-backdrop" onMouseDown={() => setOfflineOpen(false)}>
      <aside className="sartal-app-drawer offline-center" onMouseDown={event => event.stopPropagation()}>
        <header><div>{isOnline ? <Cloud size={21} /> : <WifiOff size={21} />}<span><strong>Continuité de service</strong><small>{isOnline ? 'Connexion disponible' : 'Mode hors connexion actif'}</small></span></div><button onClick={() => setOfflineOpen(false)}><X size={19} /></button></header>
        <section className={`offline-state-card ${isOnline ? 'online' : 'offline'}`}><i /> <div><strong>{isOnline ? 'Les échanges peuvent être synchronisés' : 'Les actions restent enregistrées sur cet appareil'}</strong><small>Dernière synchronisation · {new Date(lastSyncAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></div></section>
        <section className="offline-capabilities"><h3>Disponible même avec un réseau faible</h3><div><span><Package size={17} /> Consultation stock</span><span><UsersRound size={17} /> Postes employés</span>{db.sartalBrandSettings.enabledModules.includes('pms') && <span><BedDouble size={17} /> Chambres et tâches</span>}{db.sartalBrandSettings.enabledModules.includes('delivery') && <span><Truck size={17} /> Tournées préparées</span>}</div></section>
        <section className="offline-queue"><header><span><strong>File de reprise</strong><small>{queuedOfflineActions.length} action(s) en attente</small></span><button disabled={!isOnline || queuedOfflineActions.length === 0} onClick={syncOfflineActions}><RefreshCw size={15} /> Synchroniser</button></header>{queuedOfflineActions.map(item => <article key={item.id}><i /><div><strong>{item.summary}</strong><small>{item.actionType.replace('_', ' ')} · {new Date(item.createdAt).toLocaleString('fr-FR')}</small></div></article>)}{queuedOfflineActions.length === 0 && <div className="offline-empty"><CheckCheck size={22} /><span><strong>Aucune action en attente</strong><small>La file locale est à jour.</small></span></div>}</section>
        <section className="offline-storage"><ShieldCheck size={21} /><div><strong>Protection du stockage local</strong><small>Demandez au navigateur de conserver les données PWA prioritaires sur cet appareil.</small></div><button disabled={storageProtected} onClick={protectLocalStorage}>{storageProtected ? 'Protégé' : 'Sécuriser'}</button></section>
      </aside>
    </div>}
    </>
  );
};
export default App;
