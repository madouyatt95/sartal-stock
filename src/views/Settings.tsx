import React from 'react';
import { StockState } from '../hooks/useStockState';
import { Shield, RefreshCw } from 'lucide-react';

interface SettingsProps {
  state: StockState;
}

export const Settings: React.FC<SettingsProps> = ({ state }) => {
  const { resetAllData } = state;

  const handleReset = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser la base de données ? Toutes les ventes simulées, commandes et transferts seront perdus.")) {
      resetAllData();
      alert("Base de données réinitialisée !");
      window.location.reload();
    }
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Paramétrage</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configurez les habilitations de profils et gérez les données système</p>
      </div>

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

          <table className="custom-table" style={{ fontSize: '0.825rem' }}>
            <thead>
              <tr>
                <th>Rôle / Profil</th>
                <th>Permissions Activées</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700 }}>Administrateur (Admin)</td>
                <td><span className="badge badge-green">Accès complet</span> • Paramètres, achats, réceptions, transferts, inventaires, pertes et ventes</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>Directeur</td>
                <td><span className="badge badge-info">Lecture Seule globale</span> • Consultation de tous les rapports et indicateurs, pas de saisie d'écriture</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>Responsable Stock</td>
                <td><span className="badge badge-blue">Gestion Stock</span> • Commandes d'achats, transferts inter-dépôts, inventaires d'ajustements, déclarations de pertes</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>Magasinier</td>
                <td><span className="badge badge-yellow">Saisie Logistique</span> • Enregistrement des réceptions réelles, saisies physiques d'inventaires, transferts sortants</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>Responsable POS</td>
                <td><span className="badge badge-purple">Vue Point de Vente</span> • Visualisation exclusive du stock affecté à son point de vente / dépôt associé</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>Auditeur</td>
                <td><span className="badge-secondary badge">Audit Seul</span> • Consultation en lecture seule du grand livre des écritures comptables</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Database Management Card */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <RefreshCw size={20} color="var(--danger)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Maintenance des Données</h3>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Si vous souhaitez purger l'historique de vos simulations et restaurer le catalogue de produits de départ (Coca-Cola 33 cl, recette Steak Frites, stocks initiaux et prix POS) :
          </p>

          <button className="btn btn-danger" onClick={handleReset} style={{ gap: '8px', width: '100%' }}>
            <RefreshCw size={18} /> Réinitialiser la base de démonstration
          </button>
        </div>

      </div>

    </div>
  );
};
export default Settings;
