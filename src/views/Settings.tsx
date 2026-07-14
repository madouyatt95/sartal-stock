import React, { useState } from 'react';
import { StockState } from '../hooks/useStockState';
import { Palette, RefreshCw, Save, Shield, Smartphone } from 'lucide-react';

interface SettingsProps {
  state: StockState;
}

export const Settings: React.FC<SettingsProps> = ({ state }) => {
  const { db, resetAllData, updateSartalBrandSettings } = state;
  const [brand, setBrand] = useState(db.sartalBrandSettings);
  const [brandMessage, setBrandMessage] = useState('');
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

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Paramétrage</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Personnalisez l’expérience client, les habilitations et les données de démonstration.</p>
      </div>

      <section className="card sartal-brand-settings">
        <header><Palette size={21} /><div><h2>Identité de l’espace client</h2><p>Adaptez Mon Sártal à l’établissement sans modifier les parcours métier.</p></div></header>
        <div className="sartal-brand-layout">
          <div className="sartal-brand-form">
            <label>Nom de l’établissement<input className="form-control" value={brand.establishmentName} onChange={event => setBrand({ ...brand, establishmentName: event.target.value })} /></label>
            <label>Nom de l’application client<input className="form-control" value={brand.clientAppName} onChange={event => setBrand({ ...brand, clientAppName: event.target.value })} /></label>
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Matrice de Droits & Habilitations</h3>
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

        {/* Database Management Card */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <RefreshCw size={20} color="var(--danger)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Remettre les exemples à zéro</h3>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Vous pouvez repartir des exemples de départ : catalogue, stocks initiaux, commandes livraison, prix par canal et historiques d'essai.
          </p>

          <button className="btn btn-danger" onClick={handleReset} style={{ gap: '8px', width: '100%' }}>
            <RefreshCw size={18} /> Réinitialiser les exemples
          </button>
        </div>

      </div>

    </div>
  );
};
export default Settings;
