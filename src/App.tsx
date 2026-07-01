import React, { useState, useEffect } from 'react';
import { useStockState } from './hooks/useStockState';
import { 
  LayoutDashboard, 
  ShieldCheck,
  FileSearch,
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

  // Sidebar links filtering based on user roles
  const sidebarLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'] },
    { id: 'stock-control', label: 'Contrôle Stock', icon: <ShieldCheck size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'auditor'] },
    { id: 'stock-audit', label: 'Audit Stock', icon: <FileSearch size={18} />, roles: ['admin', 'director', 'stock_manager', 'auditor'] },
    { id: 'products', label: 'Produits / BOM', icon: <Package size={18} />, roles: ['admin', 'director', 'stock_manager'] },
    { id: 'warehouses', label: 'Dépôts & POS', icon: <Warehouse size={18} />, roles: ['admin', 'director', 'stock_manager'] },
    { id: 'stocks', label: 'Suivi Stocks', icon: <Layers size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'pos_manager', 'auditor'] },
    { id: 'purchases', label: 'Achats', icon: <ShoppingCart size={18} />, roles: ['admin', 'director', 'stock_manager'] },
    { id: 'receiving', label: 'Réceptions', icon: <ClipboardCheck size={18} />, roles: ['admin', 'storekeeper'] },
    { id: 'transfers', label: 'Transferts', icon: <ArrowRightLeft size={18} />, roles: ['admin', 'stock_manager', 'storekeeper'] },
    { id: 'inventories', label: 'Inventaires', icon: <ClipboardCheck size={18} />, roles: ['admin', 'stock_manager', 'storekeeper'] },
    { id: 'losses', label: 'Pertes', icon: <Trash2 size={18} />, roles: ['admin', 'stock_manager'] },
    { id: 'movements', label: 'Mouvements', icon: <Activity size={18} />, roles: ['admin', 'director', 'stock_manager', 'storekeeper', 'auditor'] },
    { id: 'reorder', label: 'Réappro', icon: <AlertTriangle size={18} />, roles: ['admin', 'director', 'stock_manager'] },
    { id: 'suppliers', label: 'Fournisseurs', icon: <Users size={18} />, roles: ['admin', 'director', 'stock_manager'] },
    { id: 'pos-imports', label: 'Imports POS', icon: <FileSpreadsheet size={18} />, roles: ['admin', 'director', 'stock_manager', 'auditor'] },
    { id: 'connectors', label: 'Connecteurs API', icon: <Network size={18} />, roles: ['admin'] },
    { id: 'exports', label: 'Exports CSV', icon: <Download size={18} />, roles: ['admin', 'director', 'auditor'] },
    { id: 'settings', label: 'Paramètres', icon: <SettingsIcon size={18} />, roles: ['admin'] }
  ];

  const allowedLinks = sidebarLinks.filter(link => link.roles.includes(db.currentUser.role));

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
        <nav style={{ flexGrow: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {allowedLinks.map(link => {
            const isActive = view === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  setView(link.id);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all var(--transition-fast)'
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

      {/* Main View Area */}
      <main className="main-content">
        
        {/* Global Navbar Header */}
        <header style={{
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
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          {renderView()}
        </div>

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
