import React, { useState, useEffect } from 'react';
import { useStockState } from './hooks/useStockState';
import { 
  LayoutDashboard, 
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
  Search,
  Bell
} from 'lucide-react';

// Subviews
import Dashboard from './views/Dashboard';
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

export const App: React.FC = () => {
  const state = useStockState();
  const { db } = state;
  const [view, setView] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Navigation visible par role, avec des libelles orientes demo terrain.
  const sidebarLinks = [
    { id: 'dashboard', label: 'Accueil', icon: <LayoutDashboard size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'], section: 'Pilotage' },
    { id: 'stock-control', label: 'Pilotage stock', mobileLabel: 'Stock', icon: <ShieldCheck size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'auditor'], section: 'Pilotage' },
    { id: 'mapping-control', label: 'Mise en ordre', mobileLabel: 'Ordre', icon: <GitBranch size={18} />, roles: ['admin', 'director', 'stock_manager', 'auditor'], section: 'Pilotage' },
    { id: 'stock-audit', label: 'Audit écarts', mobileLabel: 'Audit', icon: <FileSearch size={18} />, roles: ['admin', 'director', 'stock_manager', 'auditor'], section: 'Pilotage' },
    { id: 'pos-imports', label: 'Imports ventes', mobileLabel: 'Ventes', icon: <FileSpreadsheet size={18} />, roles: ['admin', 'director', 'stock_manager', 'auditor'], section: 'Pilotage' },
    { id: 'stocks', label: 'Stocks & lots', icon: <Layers size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'], section: 'Operations' },
    { id: 'receiving', label: 'Entrées dépôt', icon: <ClipboardCheck size={18} />, roles: ['admin', 'storekeeper'], section: 'Operations' },
    { id: 'transfers', label: 'Transferts dépôt', icon: <ArrowRightLeft size={18} />, roles: ['admin', 'stock_manager', 'storekeeper'], section: 'Operations' },
    { id: 'inventories', label: 'Comptages', icon: <ClipboardCheck size={18} />, roles: ['admin', 'stock_manager', 'storekeeper'], section: 'Operations' },
    { id: 'losses', label: 'Casses & pertes', icon: <Trash2 size={18} />, roles: ['admin', 'stock_manager'], section: 'Operations' },
    { id: 'products', label: 'Catalogue', icon: <Package size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Referentiel' },
    { id: 'warehouses', label: 'Sites & dépôts', icon: <Warehouse size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Referentiel' },
    { id: 'purchases', label: 'Achats', icon: <ShoppingCart size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Referentiel' },
    { id: 'reorder', label: 'À commander', icon: <AlertTriangle size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Referentiel' },
    { id: 'suppliers', label: 'Fournisseurs', icon: <Users size={18} />, roles: ['admin', 'director', 'stock_manager'], section: 'Referentiel' },
    { id: 'movements', label: 'Journal stock', icon: <Activity size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'auditor'], section: 'Avance' },
    { id: 'connectors', label: 'Caisse & PMS', icon: <Network size={18} />, roles: ['admin'], section: 'Avance' },
    { id: 'exports', label: 'Exports', icon: <Download size={18} />, roles: ['admin', 'director', 'auditor'], section: 'Avance' },
    { id: 'settings', label: 'Réglages', icon: <SettingsIcon size={18} />, roles: ['admin'], section: 'Avance' }
  ];

  const allowedLinks = sidebarLinks.filter(link => link.roles.includes(db.currentUser.role));
  const sidebarSections = [
    { id: 'Pilotage', label: 'Pilotage' },
    { id: 'Operations', label: 'Opérations stock' },
    { id: 'Referentiel', label: 'Données métier' },
    { id: 'Avance', label: 'Avancé' }
  ];
  const mobilePrimaryLinks = allowedLinks.filter(link => ['stock-control', 'mapping-control', 'stock-audit', 'pos-imports'].includes(link.id));

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
      case 'stock-control':
        return <StockControl state={state} setView={setView} />;
      case 'mapping-control':
        return <MappingControl state={state} setView={setView} />;
      case 'stock-audit':
        return <StockAudit state={state} setView={setView} />;
      case 'products':
        return <Products state={state} />;
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', fontSize: '1.2rem' }}>
              S
            </div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.05em', color: 'white' }}>
              SÁRTAL STOCK
            </span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            style={{ display: 'none', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            className="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Role Quick Indicator */}
        <div style={{ padding: '16px 20px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <User size={14} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Rôle actif</span>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'white', textTransform: 'capitalize' }}>
              {db.currentUser.role.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Sidebar Links Navigation */}
        <nav style={{ flexGrow: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {sidebarSections.map(section => {
            const sectionLinks = allowedLinks.filter(link => link.section === section.id);
            if (sectionLinks.length === 0) return null;

            return (
              <div className="sidebar-section" key={section.id}>
                <span className="sidebar-section-title">{section.label}</span>
                {sectionLinks.map(link => {
                  const isActive = view === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => {
                        setView(link.id);
                        setMobileMenuOpen(false);
                      }}
                      className="sidebar-link"
                      style={{
                        backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                        color: isActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                        fontWeight: isActive ? 700 : 500
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-sidebar-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {link.icon}
                      <span>{link.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer (Light/Dark mode) */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Version 1.0.0</span>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer'
            }}
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
      <main className="main-content">
        
        {/* Global Navbar Header */}
        <header className="app-header" style={{
          height: '70px',
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: 'var(--shadow-sm)',
          transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
        }}>
          
          {/* Menu button for mobile */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <Menu size={24} />
          </button>

          {/* Dummy search bar */}
          <div style={{ position: 'relative', width: '300px', display: 'flex', alignItems: 'center' }} className="nav-search-bar">
            <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Recherche rapide... (Ctrl + K)" 
              disabled
              className="form-control" 
              style={{ width: '100%', paddingLeft: '32px', fontSize: '0.775rem', height: '34px', background: 'var(--bg-app)' }}
            />
          </div>

          {/* Org & Info filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', fontSize: '0.75rem' }} className="nav-company-details">
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Entreprise</span>
              <strong style={{ color: 'var(--text-primary)' }}>{db.companies[0]?.name}</strong>
            </div>

            <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)' }} className="nav-divider" />

            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', fontSize: '0.75rem' }} className="nav-site-details">
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Site Actuel</span>
              <strong style={{ color: 'var(--text-primary)' }}>{db.sites[0]?.name}</strong>
            </div>

            <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)' }} className="nav-divider" />

            {/* Notification indicator */}
            <div style={{ position: 'relative', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <Bell size={20} />
              <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: 'var(--danger)', borderRadius: '50%' }} />
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
                setView(link.id);
                setMobileMenuOpen(false);
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
            display: block !important;
          }
          .mobile-close-btn {
            display: block !important;
          }
          .nav-search-bar, .nav-company-details, .nav-site-details, .nav-divider {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};
export default App;
