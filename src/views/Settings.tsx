import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { BedDouble, Building2, Check, CheckCircle2, ClipboardList, Network, PackageCheck, Palette, RefreshCw, Save, Shield, Smartphone, Truck, UtensilsCrossed } from 'lucide-react';
import { SartalModule, SartalSiteBrandProfile } from '../types';

interface SettingsProps {
  state: StockState;
}

export const Settings: React.FC<SettingsProps> = ({ state }) => {
  const { db, resetAllData, updateSartalBrandSettings } = state;
  const [brand, setBrand] = useState(db.sartalBrandSettings);
  const [selectedSiteId, setSelectedSiteId] = useState(db.sites[0]?.id || '');
  const [brandMessage, setBrandMessage] = useState('');
  const selectedSiteProfile = brand.siteProfiles.find(profile => profile.siteId === selectedSiteId);
  const posRoles = new Set(['waiter', 'cashier', 'kitchen']);
  const warehouseRoles = new Set(['storekeeper', 'picker', 'dispatcher', 'driver']);
  const activeEmployees = db.employeeProfiles.filter(employee => employee.active);
  const mappedEmployees = activeEmployees.filter(employee => (
    Boolean(employee.siteId)
    && (!posRoles.has(employee.role) || Boolean(employee.posId))
    && (!warehouseRoles.has(employee.role) || Boolean(employee.warehouseId))
  ));
  const deploymentChecks = [
    { label: 'Offre activée', detail: `${brand.enabledModules.length} module(s) disponible(s)`, complete: brand.enabledModules.includes('stock') },
    { label: 'Établissements identifiés', detail: `${db.sites.length} site(s) avec identité dédiée`, complete: db.sites.length > 0 && db.sites.every(site => brand.siteProfiles.some(profile => profile.siteId === site.id && profile.displayName.trim())) },
    { label: 'Canaux reliés aux dépôts', detail: `${db.posList.length} canal(aux) contrôlé(s)`, complete: db.posList.length > 0 && db.posList.every(pos => db.warehouses.some(warehouse => warehouse.id === pos.defaultWarehouseId && warehouse.siteId === pos.siteId)) },
    { label: 'Équipes affectées', detail: `${mappedEmployees.length}/${activeEmployees.length} profil(s) opérationnel(s)`, complete: activeEmployees.length > 0 && mappedEmployees.length === activeEmployees.length },
    { label: 'Catalogue exploitable', detail: `${db.products.filter(product => product.isActive).length} produit(s) actif(s)`, complete: db.products.some(product => product.isActive) && db.stocks.length > 0 },
    { label: 'Hôtel prêt', detail: brand.enabledModules.includes('pms') ? `${db.pmsRooms.length} chambre(s) configurée(s)` : 'Module non souscrit', complete: !brand.enabledModules.includes('pms') || db.pmsRooms.length > 0 },
    { label: 'Restaurant prêt', detail: brand.enabledModules.includes('restaurant') ? `${db.restaurantDiningTables.filter(table => table.active).length} table(s) publiée(s)` : 'Module non souscrit', complete: !brand.enabledModules.includes('restaurant') || db.restaurantDiningTables.some(table => table.active) },
    { label: 'Livraison prête', detail: brand.enabledModules.includes('delivery') ? `${db.posList.filter(pos => pos.type === 'online_grocery').length} canal(aux) en ligne` : 'Module non souscrit', complete: !brand.enabledModules.includes('delivery') || db.posList.some(pos => pos.type === 'online_grocery' && db.warehouses.some(warehouse => warehouse.id === pos.defaultWarehouseId)) }
  ];
  const completedDeploymentChecks = deploymentChecks.filter(item => item.complete).length;
  const deploymentScore = Math.round(completedDeploymentChecks / deploymentChecks.length * 100);
  const moduleOptions: Array<{ id: SartalModule; label: string; detail: string; icon: React.ReactNode }> = [
    { id: 'stock', label: 'Sártal Stock', detail: 'Catalogue, dépôts, achats et contrôle', icon: <PackageCheck size={20} /> },
    { id: 'restaurant', label: 'Restaurant', detail: 'POS, salle, cuisine et expérience client', icon: <UtensilsCrossed size={20} /> },
    { id: 'delivery', label: 'Livraison', detail: 'Boutique, préparation et tournée', icon: <Truck size={20} /> },
    { id: 'pms', label: 'Hôtel / PMS', detail: 'Réservations, chambres, folios et séjour', icon: <BedDouble size={20} /> }
  ];
  const permissionRows = [
    { role: 'Administrateur', badge: 'Accès complet', className: 'badge-green', detail: 'Paramètres, achats, réceptions, transferts, inventaires, pertes et ventes.' },
    { role: 'Directeur', badge: 'Pilotage global', className: 'badge-info', detail: 'Rapports, prix, produits, fournisseurs, achats et organisation des dépôts.' },
    { role: 'Responsable Stock', badge: 'Gestion stock', className: 'badge-blue', detail: "Commandes d'achats, transferts inter-dépôts, inventaires et pertes." },
    { role: 'Magasinier', badge: 'Saisie logistique', className: 'badge-yellow', detail: 'Réceptions réelles, saisies physiques, inventaires et transferts sortants.' },
    { role: 'Responsable POS', badge: 'Vue point de vente', className: 'badge-purple', detail: 'Consultation des ventes, tarifs et stocks opérationnels des points de vente.' },
    { role: 'Auditeur', badge: 'Audit seul', className: 'badge-secondary', detail: 'Consultation en lecture seule du journal des mouvements de stock.' }
  ];

  const handleReset = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser la base de données ? Toutes les ventes simulées, commandes et transferts seront perdus.")) {
      resetAllData();
      alert("Base de données réinitialisée !");
      window.location.reload();
    }
  };

  const saveBrand = () => {
    try {
      updateSartalBrandSettings(brand);
      setBrandMessage('Identité client enregistrée. L’aperçu Mon Sártal est déjà à jour.');
    } catch (error) {
      setBrandMessage(error instanceof Error ? error.message : 'Enregistrement impossible');
    }
  };

  const toggleModule = (module: SartalModule) => {
    setBrand(current => ({ ...current, enabledModules: current.enabledModules.includes(module) ? current.enabledModules.filter(item => item !== module) : [...current.enabledModules, module] }));
  };

  const updateSiteProfile = (patch: Partial<SartalSiteBrandProfile>) => {
    setBrand(current => ({ ...current, siteProfiles: current.siteProfiles.map(profile => profile.siteId === selectedSiteId ? { ...profile, ...patch } : profile) }));
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Paramétrage</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Choisissez les modules actifs et adaptez chaque interface à vos établissements.</p>
      </div>

      <section className="card settings-deployment-center">
        <header><div><ClipboardList size={22} /><span><small>MISE EN SERVICE</small><h2>Préparation du déploiement</h2><p>Une lecture claire des prérequis avant d’ouvrir les accès aux équipes.</p></span></div><strong>{deploymentScore}%<small> prêt</small></strong></header>
        <div className="settings-deployment-progress"><i style={{ width: `${deploymentScore}%` }} /></div>
        <div className="settings-deployment-checks">{deploymentChecks.map(item => <article className={item.complete ? 'complete' : 'pending'} key={item.label}>{item.complete ? <CheckCircle2 size={19} /> : <span /> }<div><strong>{item.label}</strong><small>{item.detail}</small></div></article>)}</div>
        <div className="settings-site-readiness">{db.sites.map(site => { const sitePOS = db.posList.filter(pos => pos.siteId === site.id); const siteWarehouses = db.warehouses.filter(warehouse => warehouse.siteId === site.id); const siteEmployees = db.employeeProfiles.filter(employee => employee.siteId === site.id && employee.active); return <article key={site.id}><Building2 size={20} /><div><strong>{brand.siteProfiles.find(profile => profile.siteId === site.id)?.displayName || site.name}</strong><small>{sitePOS.length} canal(aux) · {siteWarehouses.length} dépôt(s) · {siteEmployees.length} collaborateur(s)</small></div><span><Network size={15} /> {sitePOS.every(pos => siteWarehouses.some(warehouse => warehouse.id === pos.defaultWarehouseId)) ? 'Affectations cohérentes' : 'Affectations à vérifier'}</span></article>; })}</div>
      </section>

      <section className="card sartal-module-settings">
        <header><Building2 size={21} /><div><h2>Offre et modules activés</h2><p>Les utilisateurs ne voient que les activités souscrites par l’établissement.</p></div></header>
        <div>{moduleOptions.map(module => <button className={brand.enabledModules.includes(module.id) ? 'active' : ''} key={module.id} onClick={() => toggleModule(module.id)}>{module.icon}<span><strong>{module.label}</strong><small>{module.detail}</small></span><i>{brand.enabledModules.includes(module.id) && <Check size={15} />}</i></button>)}</div>
      </section>

      <section className="card sartal-brand-settings">
        <header><Palette size={21} /><div><h2>Identité des interfaces</h2><p>Les noms et couleurs sont appliqués aux espaces direction, équipe, client et séjour.</p></div></header>
        <div className="sartal-brand-layout">
          <div className="sartal-brand-form">
            <label>Nom de l’établissement<input className="form-control" value={brand.establishmentName} onChange={event => setBrand({ ...brand, establishmentName: event.target.value })} /></label>
            <label>Nom du back-office<input className="form-control" value={brand.backOfficeName} onChange={event => setBrand({ ...brand, backOfficeName: event.target.value })} /></label>
            <label>Nom de l’espace employés<input className="form-control" value={brand.staffAppName} onChange={event => setBrand({ ...brand, staffAppName: event.target.value })} /></label>
            <label>Nom de l’application client<input className="form-control" value={brand.clientAppName} onChange={event => setBrand({ ...brand, clientAppName: event.target.value })} /></label>
            <label>Nom du portail hôtel<input className="form-control" value={brand.hotelAppName} onChange={event => setBrand({ ...brand, hotelAppName: event.target.value })} /></label>
            <div className="sartal-site-profile-heading"><label>Établissement<select className="form-control" value={selectedSiteId} onChange={event => setSelectedSiteId(event.target.value)}>{db.sites.map(site => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label></div>
            {selectedSiteProfile && <div className="sartal-site-profile-fields">
              <label>Nom affiché<input className="form-control" value={selectedSiteProfile.displayName} onChange={event => updateSiteProfile({ displayName: event.target.value })} /></label>
              <label>Message d’accueil<input className="form-control" value={selectedSiteProfile.welcomeMessage} onChange={event => updateSiteProfile({ welcomeMessage: event.target.value })} /></label>
              <label>Couleur du site<div className="sartal-color-field"><input type="color" value={selectedSiteProfile.primaryColor} onChange={event => updateSiteProfile({ primaryColor: event.target.value })} /><input className="form-control" value={selectedSiteProfile.primaryColor} onChange={event => updateSiteProfile({ primaryColor: event.target.value })} /></div></label>
              <label>Accent du site<div className="sartal-color-field"><input type="color" value={selectedSiteProfile.accentColor} onChange={event => updateSiteProfile({ accentColor: event.target.value })} /><input className="form-control" value={selectedSiteProfile.accentColor} onChange={event => updateSiteProfile({ accentColor: event.target.value })} /></div></label>
              <label>Téléphone du site<input className="form-control" value={selectedSiteProfile.supportPhone} onChange={event => updateSiteProfile({ supportPhone: event.target.value })} /></label>
            </div>}
            <label>Couleur principale<div className="sartal-color-field"><input type="color" value={brand.primaryColor} onChange={event => setBrand({ ...brand, primaryColor: event.target.value })} /><input className="form-control" value={brand.primaryColor} onChange={event => setBrand({ ...brand, primaryColor: event.target.value })} /></div></label>
            <label>Couleur d’accent<div className="sartal-color-field"><input type="color" value={brand.accentColor} onChange={event => setBrand({ ...brand, accentColor: event.target.value })} /><input className="form-control" value={brand.accentColor} onChange={event => setBrand({ ...brand, accentColor: event.target.value })} /></div></label>
            <label>Ton d’accueil<select className="form-control" value={brand.welcomeTone} onChange={event => setBrand({ ...brand, welcomeTone: event.target.value as typeof brand.welcomeTone })}><option value="warm">Chaleureux</option><option value="formal">Institutionnel</option><option value="concise">Direct</option></select></label>
            <label>Téléphone assistance<input className="form-control" value={brand.supportPhone} onChange={event => setBrand({ ...brand, supportPhone: event.target.value })} /></label>
            <label className="sartal-setting-toggle"><input type="checkbox" checked={brand.lowBandwidthDefault} onChange={event => setBrand({ ...brand, lowBandwidthDefault: event.target.checked })} /><span><strong>Mode léger par défaut</strong><small>Pour les nouveaux profils sur réseau limité.</small></span></label>
            <button className="btn btn-primary" onClick={saveBrand}><Save size={17} /> Enregistrer l’identité</button>
            {brandMessage && <p className="sartal-brand-message">{brandMessage}</p>}
          </div>
          <aside style={{ '--brand-preview': brand.primaryColor, '--brand-accent': brand.accentColor } as React.CSSProperties}>
            <Smartphone size={22} />
            <span>{brand.clientAppName.toUpperCase()}</span>
            <h3>Bonjour Aminata</h3>
            <p>{brand.welcomeTone === 'formal' ? `Bienvenue dans l’espace client de ${brand.establishmentName}.` : brand.welcomeTone === 'concise' ? 'Vos services et avantages, au même endroit.' : `Heureux de vous retrouver chez ${brand.establishmentName}.`}</p>
            <button>Continuer</button>
            <small>Aide · {brand.supportPhone}</small>
          </aside>
        </div>
      </section>

      <div className="grid-2">
        
        {/* Profile Permissions Info */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Shield size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Droits par profil back-office</h3>
          </div>
          
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Le système restreint ou autorise les opérations en fonction du profil utilisateur sélectionné :
          </p>

          <div className="desktop-table-only">
            <table className="custom-table" style={{ fontSize: '0.825rem' }}>
              <thead>
                <tr>
                  <th>Rôle / Profil</th>
                  <th>Permissions activées</th>
                </tr>
              </thead>
              <tbody>
                {permissionRows.map(row => (
                  <tr key={row.role}>
                    <td style={{ fontWeight: 700 }}>{row.role}</td>
                    <td><span className={`badge ${row.className}`}>{row.badge}</span> • {row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list no-padding">
            {permissionRows.map(row => (
              <div key={row.role} className="mobile-data-card">
                <div className="mobile-data-header">
                  <div className="mobile-data-title">{row.role}</div>
                  <span className={`badge ${row.className}`}>{row.badge}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.84rem' }}>{row.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <details className="card settings-demo-data">
          <summary><RefreshCw size={19} /><span><strong>Données de démonstration</strong><small>Outils réservés à la préparation d’une présentation</small></span></summary>
          <div><p>Repartir des exemples de départ : catalogue, stocks initiaux, commandes, prix par canal et historiques d’essai.</p><button className="btn btn-danger" onClick={handleReset}><RefreshCw size={18} /> Réinitialiser les exemples</button></div>
        </details>

      </div>

    </div>
  );
};
export default Settings;
