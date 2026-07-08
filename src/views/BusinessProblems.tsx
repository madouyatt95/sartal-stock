import React from 'react';
import { ArrowRight, CheckCircle, Database, Link2, PackageX, ShieldCheck, Store, Truck } from 'lucide-react';
import { StockState } from '../hooks/useStockState';

interface BusinessProblemsProps {
  state: StockState;
  setView: (view: string) => void;
}

export const BusinessProblems: React.FC<BusinessProblemsProps> = ({ setView }) => {
  const problems = [
    {
      title: 'Même produit, plusieurs prix',
      problem: 'Le Coca, l’eau ou un plat peuvent être vendus à des prix différents selon le restaurant, le bar ou la plateforme.',
      answer: 'Sartal garde un seul produit dans le catalogue et applique le prix du canal qui vend.',
      icon: <Store size={20} />
    },
    {
      title: 'Stocks mélangés entre dépôts',
      problem: 'Une vente peut être comptée, mais sortir du mauvais dépôt si la caisse et le stock ne sont pas bien reliés.',
      answer: 'Chaque canal est relié à son dépôt de sortie : restaurant, bar, night-club ou dépôt livraison.',
      icon: <ShieldCheck size={20} />
    },
    {
      title: 'Vente en ligne sans stock fiable',
      problem: 'Une plateforme peut afficher un produit disponible alors qu’il est déjà réservé pour une autre commande.',
      answer: 'Le stock vendable tient compte du stock physique moins les quantités réservées.',
      icon: <Truck size={20} />
    },
    {
      title: 'Ruptures et substitutions',
      problem: 'En livraison, un produit peut manquer au moment de préparer la commande.',
      answer: 'La préparation affiche le stock, les alertes et les produits de remplacement possibles.',
      icon: <PackageX size={20} />
    }
  ];

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="demo-page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Problèmes métier</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Les situations terrain que Sartal Stock permet de clarifier et de contrôler rapidement.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setView('guided-demo')}>
          Présentation guidée <ArrowRight size={16} />
        </button>
      </div>

      <div className="card demo-mode-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={22} color="var(--primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Espace d'essai métier</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          L'application utilise des exemples réalistes : produits, dépôts, ventes, commandes, paiements et rapports. Vous pouvez cliquer, simuler et explorer sans modifier une exploitation réelle.
        </p>
        <div className="demo-mode-grid">
          <span className="badge badge-green">Aucun impact réel</span>
          <span className="badge badge-blue">Scénarios modifiables</span>
          <span className="badge badge-purple">Données réelles importables</span>
        </div>
      </div>

      <div className="problem-grid">
        {problems.map(item => (
          <div key={item.title} className="card problem-card">
            <div className="problem-icon">{item.icon}</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{item.title}</h3>
            <div>
              <p className="problem-label">Problème</p>
              <p>{item.problem}</p>
            </div>
            <div>
              <p className="problem-label">Réponse Sartal</p>
              <p>{item.answer}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-3">
        <div className="card" style={{ display: 'grid', gap: '12px' }}>
          <Link2 size={22} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Compléter l’existant</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Sartal peut d’abord se connecter aux exports caisse, ventes ou commandes pour fiabiliser le stock.
          </p>
        </div>
        <div className="card" style={{ display: 'grid', gap: '12px' }}>
          <ShieldCheck size={22} color="var(--success)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Contrôler le stock</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            L’objectif court terme est de prouver que le stock réel, les dépôts et les écarts sont maîtrisés.
          </p>
        </div>
        <div className="card" style={{ display: 'grid', gap: '12px' }}>
          <CheckCircle size={22} color="var(--warning)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Remplacer progressivement</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Une migration complète se prépare ensuite avec catalogue, dépôts, ventes, paiements et règles métier.
          </p>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: '14px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Données à récupérer pour passer au réel</h3>
        <div className="deployment-list">
          {[
            'Catalogue produits avec codes articles',
            'Liste des points de vente, canaux et dépôts',
            'Prix par restaurant, bar, boutique ou plateforme',
            'Exports de ventes ou commandes sur une période test',
            'Moyens de paiement utilisés : espèces, carte, Wave, Orange Money',
            'Règles de remises, annulations, pertes et validations manager'
          ].map(item => (
            <div key={item}>
              <CheckCircle size={16} color="var(--success)" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusinessProblems;
