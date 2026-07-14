import React, { useState, useEffect } from 'react';
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
  BedDouble,
  HeartHandshake
} from 'lucide-react';

// Subviews
import Dashboard from './views/Dashboard';
import ManagerAnswer from './views/ManagerAnswer';
import BehaviorSimulation from './views/BehaviorSimulation';
import StockControl from './views/StockControl';
import StockAudit from './views/StockAudit';
import MappingControl from './views/MappingControl';
import Products from './views/Products';
import Warehouses from './views/Warehouses';
import Stocks from './views/Stocks';
import Purchases from './views/Purchases';
import Receiving from './views/Receiving';
import Transfers from './views/Transfers';
import Inventories from './views/Inventories';
import Losses from './views/Losses';
import Movements from './views/Movements';
import Reorder from './views/Reorder';
import Suppliers from './views/Suppliers';
import Settings from './views/Settings';
import Connectors from './views/Connectors';
import POSImports from './views/POSImports';
import Exports from './views/Exports';
import POSPricing from './views/POSPricing';
import DeliveryDemo from './views/DeliveryDemo';
import GuidedDemo from './views/GuidedDemo';
import BusinessProblems from './views/BusinessProblems';
import SmartAlerts from './views/SmartAlerts';
import PMSHotel from './views/PMSHotel';
import { PMSGuestExperiencePortal } from './views/PMSSignatureExperience';
import SartalClient from './views/SartalClient';

export const App: React.FC = () => {
  const state = useStockState();
  const { db } = state;
  const [view, setView] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const guestReservationId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('sejour') : null;
  if (guestReservationId && db.pmsReservations.some(item => item.id === guestReservationId)) {
    return <main className="pms-public-guest-app"><PMSGuestExperiencePortal state={state} initialReservationId={guestReservationId} standalone /></main>;
  }
  const publicClientMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('client') : null;
  if (publicClientMode === 'restaurant' || publicClientMode === 'delivery') {
    return <main className="sartal-public-client-app"><SartalClient state={state} initialMode={publicClientMode} standalone /></main>;
  }

  // Navigation visible par role, organisee autour des parcours metier et du socle stock commun.
  const sidebarLinks = [
    { id: 'dashboard', label: 'Accueil', mobileLabel: 'Accueil', icon: <LayoutDashboard size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'], section: 'Accueil' },
    { id: 'guided-demo', label: 'Présentation guidée', mobileLabel: 'Guide', icon: <PlayCircle size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'], section: 'Accueil' },
    { id: 'business-problems', label: 'Problèmes métier', mobileLabel: 'Cas', icon: <FileSearch size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'], section: 'Accueil' },
    { id: 'client', label: 'Expérience client', mobileLabel: 'Client', icon: <HeartHandshake size={18} />, roles: ['admin', 'director', 'pos_manager'], section: 'Accueil' },

    { id: 'answer', label: 'Parcours restaurant', mobileLabel: 'Restau', icon: <ClipboardCheck size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'], section: 'Restaurant' },
    { id: 'simulation', label: 'Simulation multi-POS', mobileLabel: 'Démo', icon: <PlayCircle size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'], section: 'Restaurant' },
    { id: 'connectors', label: 'Caisse POS', icon: <Network size={18} />, roles: ['admin'], section: 'Restaurant' },
    { id: 'pos-imports', label: 'Reprendre ventes caisse', mobileLabel: 'Ventes', icon: <FileSpreadsheet size={18} />, roles: ['admin', 'director', 'stock_manager', 'auditor'], section: 'Restaurant' },

    { id: 'pms', label: 'Hôtel / PMS', mobileLabel: 'PMS', icon: <BedDouble size={18} />, roles: ['admin', 'director', 'pos_manager', 'auditor'], section: 'Hôtel' },

    { id: 'delivery', label: 'Parcours livraison', mobileLabel: 'Livraison', icon: <Truck size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'auditor'], section: 'Livraison' },

    { id: 'stock-control', label: 'Stock réel', mobileLabel: 'Stock', icon: <ShieldCheck size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'auditor'], section: 'Socle stock' },
    { id: 'products', label: 'Catalogue & recettes', icon: <Package size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Socle stock' },
    { id: 'pricing', label: 'Prix par canal', icon: <CircleDollarSign size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Socle stock' },
    { id: 'warehouses', label: 'Canaux & dépôts', icon: <Warehouse size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Socle stock' },
    { id: 'stocks', label: 'Lots de stock', icon: <Layers size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'], section: 'Socle stock' },

    { id: 'reorder', label: 'À commander', icon: <AlertTriangle size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Opérations' },
    { id: 'purchases', label: 'Achats fournisseurs', icon: <ShoppingCart size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Opérations' },
    { id: 'receiving', label: 'Réceptions stock', icon: <ClipboardCheck size={18} />, roles: ['admin', 'storekeeper'], section: 'Opérations' },
    { id: 'transfers', label: 'Transferts dépôts', icon: <ArrowRightLeft size={18} />, roles: ['admin', 'stock_manager', 'storekeeper'], section: 'Opérations' },
    { id: 'inventories', label: 'Inventaires', icon: <ClipboardCheck size={18} />, roles: ['admin', 'stock_manager', 'storekeeper'], section: 'Opérations' },
    { id: 'losses', label: 'Pertes & casses', icon: <Trash2 size={18} />, roles: ['admin', 'stock_manager'], section: 'Opérations' },
    { id: 'suppliers', label: 'Fournisseurs', icon: <Users size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Opérations' },

    { id: 'stock-audit', label: 'Audit des écarts', mobileLabel: 'Écarts', icon: <FileSearch size={18} />, roles: ['admin', 'director', 'stock_manager', 'auditor'], section: 'Contrôle' },
    { id: 'smart-alerts', label: 'Alertes intelligentes', mobileLabel: 'Alertes', icon: <Bell size={18} />, roles: ['admin', 'director', 'stock_manager', 'auditor'], section: 'Contrôle' },
    { id: 'mapping-control', label: 'Contrôle des données', mobileLabel: 'Dépôts', icon: <GitBranch size={18} />, roles: ['admin', 'director', 'stock_manager', 'auditor'], section: 'Contrôle' },
    { id: 'movements', label: 'Journal stock', icon: <Activity size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'auditor'], section: 'Contrôle' },
    { id: 'exports', label: 'Rapports', mobileLabel: 'Rapports', icon: <Download size={18} />, roles: ['admin', 'director', 'auditor'], section: 'Contrôle' },
    { id: 'settings', label: 'Réglages', icon: <SettingsIcon size={18} />, roles: ['admin'], section: 'Réglages' }
  ];

  const allowedLinks = sidebarLinks.filter(link => link.roles.includes(db.currentUser.role));
  const sidebarSections = [
    { id: 'Accueil', label: 'Accueil' },
    { id: 'Restaurant', label: 'Parcours restaurant' },
    { id: 'Hôtel', label: 'Module Hôtel / PMS' },
    { id: 'Livraison', label: 'Parcours livraison' },
    { id: 'Socle stock', label: 'Socle stock commun' },
    { id: 'Opérations', label: 'Opérations stock' },
    { id: 'Contrôle', label: 'Contrôle & rapports' },
    { id: 'Réglages', label: 'Réglages' }
  ];
  const mobilePrimaryOrder = ['dashboard', 'client', 'pms', 'delivery', 'stock-control'];
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
      .map(link => ({ id: `nav-${link.id}`, label: link.label, detail: link.section, view: link.id }));
    const productMatches = db.products
      .filter(product => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query))
      .slice(0, 5)
      .map(product => ({ id: `product-${product.id}`, label: product.name, detail: `${product.sku} · ${product.category}`, view: 'products' }));
    const warehouseMatches = db.warehouses
      .filter(warehouse => warehouse.name.toLowerCase().includes(query))
      .slice(0, 3)
      .map(warehouse => ({ id: `warehouse-${warehouse.id}`, label: warehouse.name, detail: 'Dépôt', view: 'warehouses' }));
    const orderMatches = db.deliveryOrders
      .filter(order => `${order.id} ${order.customerName} ${order.address}`.toLowerCase().includes(query))
      .slice(0, 3)
      .map(order => ({ id: `order-${order.id}`, label: order.id, detail: `${order.customerName} · Livraison`, view: 'delivery' }));
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
        return { id: `reservation-${reservation.id}`, label: `Chambre ${room?.roomNumber || ''}`, detail: `${guest?.fullName || reservation.confirmationNumber} · PMS`, view: 'pms' };
      });
    return [...navMatches, ...productMatches, ...warehouseMatches, ...orderMatches, ...pmsMatches].slice(0, 8);
  })();

  const openView = (nextView: string) => {
    setView(nextView);
    setMobileMenuOpen(false);
    setGlobalSearch('');
  };

  const renderView = () => {
    // Role checks fallback
    const currentLink = sidebarLinks.find(l => l.id === view);
    if (currentLink && !currentLink.roles.includes(db.currentUser.role)) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={50} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <h2>Accès Refusé</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Votre profil actuel (<strong>{db.currentUser.role.toUpperCase()}</strong>) ne dispose pas des droits nécessaires pour accéder à cette vue.
          </p>
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard state={state} setView={setView} />;
      case 'guided-demo':
        return <GuidedDemo state={state} setView={setView} />;
      case 'business-problems':
        return <BusinessProblems state={state} setView={setView} />;
      case 'client':
        return <SartalClient state={state} />;
      case 'answer':
        return <ManagerAnswer state={state} setView={setView} />;
      case 'simulation':
        return <BehaviorSimulation state={state} setView={setView} />;
      case 'delivery':
        return <DeliveryDemo state={state} setView={setView} />;
      case 'pms':
        return <PMSHotel state={state} setView={setView} />;
      case 'stock-control':
        return <StockControl state={state} setView={setView} />;
      case 'mapping-control':
        return <MappingControl state={state} setView={setView} />;
      case 'stock-audit':
        return <StockAudit state={state} setView={setView} />;
      case 'smart-alerts':
        return <SmartAlerts state={state} setView={setView} />;
      case 'products':
        return <Products state={state} />;
      case 'pricing':
        return <POSPricing state={state} />;
      case 'warehouses':
        return <Warehouses state={state} />;
      case 'stocks':
        return <Stocks state={state} />;
      case 'purchases':
        return <Purchases state={state} />;
      case 'receiving':
        return <Receiving state={state} />;
      case 'transfers':
        return <Transfers state={state} />;
      case 'inventories':
        return <Inventories state={state} />;
      case 'losses':
        return <Losses state={state} />;
      case 'movements':
        return <Movements state={state} />;
      case 'reorder':
        return <Reorder state={state} setView={setView} />;
      case 'suppliers':
        return <Suppliers state={state} />;
      case 'connectors':
        return <Connectors state={state} />;
      case 'pos-imports':
        return <POSImports state={state} setView={setView} />;
      case 'exports':
        return <Exports state={state} />;
      case 'settings':
        return <Settings state={state} />;
      default:
        return <Dashboard state={state} setView={setView} />;
    }
  };

  return (
    <div className="app-container">
      
      {/* Sidebar Panel */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        
        {/* Sidebar Brand header */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-lockup">
            <img src="./brand-mark.svg" alt="" />
            <span>
              <strong>SÁRTAL</strong>
              <small>Stock & opérations</small>
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
            <strong>
              {db.currentUser.role.replace('_', ' ')}
            </strong>
          </div>
        </div>

        {/* Sidebar Links Navigation */}
        <nav style={{ flexGrow: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {sidebarSections.map(section => {
            const sectionLinks = allowedLinks.filter(link => link.section === section.id);
            if (sectionLinks.length === 0) return null;

            return (
              <div
                className={`sidebar-section ${['Restaurant', 'Livraison'].includes(section.id) ? 'sidebar-section-business' : ''}`}
                key={section.id}
              >
                <span className="sidebar-section-title">{section.label}</span>
                {sectionLinks.map(link => {
                  const isActive = view === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => {
                        openView(link.id);
                      }}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      style={{
                        color: isActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                        fontWeight: isActive ? 700 : 500
                      }}
                    >
                      <span className="sidebar-link-icon">{link.icon}</span>
                      <span>{link.label}</span>
                    </button>
                  );
                })}
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
                  onChange={(event) => setGlobalSearch(event.target.value)}
                  placeholder="Rechercher Coca, dépôt, livraison..."
                  type="search"
                />
              </div>
              {globalSearchResults.length > 0 && (
                <div className="global-search-results">
                  {globalSearchResults.map(result => (
                    <button key={result.id} onClick={() => openView(result.view)}>
                      <strong>{result.label}</strong>
                      <span>{result.detail}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="demo-mode-pill">Mode découverte</span>
            
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
        <div className="main-view-scroll" style={{ flexGrow: 1, overflowY: 'auto' }}>
          {renderView()}
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
  );
};
export default App;
