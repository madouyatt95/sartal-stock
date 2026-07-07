import React, { useState } from 'react';
import { ArrowRight, CheckCircle, ClipboardCheck, Package, PlayCircle, ShieldCheck, Truck } from 'lucide-react';
import { StockState } from '../hooks/useStockState';

interface GuidedDemoProps {
  state: StockState;
  setView: (view: string) => void;
}

type DemoPath = 'restaurant' | 'delivery';

export const GuidedDemo: React.FC<GuidedDemoProps> = ({ state, setView }) => {
  const { db } = state;
  const [path, setPath] = useState<DemoPath>('restaurant');

  const restaurantSteps = [
    {
      title: 'Comprendre la problématique',
      detail: 'Un même produit doit rester unique, mais sortir du bon dépôt et prendre le bon prix selon le point de vente.',
      view: 'answer',
      action: 'Voir la réponse'
    },
    {
      title: 'Simuler les ventes',
      detail: 'Vente au restaurant, au bar puis au night-club, avec prix différents et stocks séparés.',
      view: 'simulation',
      action: 'Lancer la simulation'
    },
    {
      title: 'Contrôler le stock réel',
      detail: 'Vérifier que chaque vente a décrémenté uniquement le dépôt associé au canal.',
      view: 'stock-control',
      action: 'Voir le stock'
    },
    {
      title: 'Vérifier les prix et dépôts',
      detail: 'Contrôler les tarifs par canal, la TVA et le dépôt de sortie configuré.',
      view: 'pricing',
      action: 'Voir les prix'
    },
    {
      title: 'Lire les rapports',
      detail: 'Consulter les ventes, les mouvements stock et la valorisation par dépôt.',
      view: 'exports',
      action: 'Voir les rapports'
    }
  ];

  const deliverySteps = [
    {
      title: 'Comprendre la problématique',
      detail: 'La plateforme ne doit pas vendre un produit indisponible et doit réserver le stock avant préparation.',
      view: 'business-problems',
      action: 'Voir les problèmes'
    },
    {
      title: 'Traiter une commande',
      detail: 'Commande client, paiement Wave ou Orange Money, réservation puis préparation.',
      view: 'delivery',
      action: 'Ouvrir livraison'
    },
    {
      title: 'Valider la sortie stock',
      detail: 'À la livraison, le stock réservé devient une vraie sortie tracée dans le dépôt préparation.',
      view: 'delivery',
      action: 'Valider livraison'
    },
    {
      title: 'Contrôler le disponible',
      detail: 'Le stock vendable tient compte du physique moins les quantités déjà réservées.',
      view: 'stock-control',
      action: 'Voir le stock'
    },
    {
      title: 'Lire les rapports',
      detail: 'La commande livrée remonte dans les ventes par canal et dans le journal des mouvements.',
      view: 'exports',
      action: 'Voir les rapports'
    }
  ];

  const steps = path === 'restaurant' ? restaurantSteps : deliverySteps;

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="demo-page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Présentation guidée</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Un parcours simple à suivre quand un prospect parcourt l'application seul.
          </p>
        </div>
        <span className="badge badge-blue">Données de démonstration</span>
      </div>

      <div className="demo-switcher">
        <button className={path === 'restaurant' ? 'active' : ''} onClick={() => setPath('restaurant')}>
          <ClipboardCheck size={18} />
          Restaurant / POS
        </button>
        <button className={path === 'delivery' ? 'active' : ''} onClick={() => setPath('delivery')}>
          <Truck size={18} />
          Épicerie / Livraison
        </button>
      </div>

      <div className="card" style={{ display: 'grid', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PlayCircle size={22} color="var(--primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
            {path === 'restaurant' ? 'Parcours conseillé pour un restaurant ou hôtel' : 'Parcours conseillé pour une plateforme de livraison'}
          </h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {path === 'restaurant'
            ? 'Le fil rouge : même produit, prix différent, dépôt différent, puis preuve dans les rapports.'
            : 'Le fil rouge : commande client, stock disponible, réservation, préparation puis livraison.'}
        </p>
      </div>

      <div className="guided-steps">
        {steps.map((step, index) => (
          <div key={step.title} className="card guided-step-card">
            <div className="guided-step-number">{index + 1}</div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{step.title}</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>{step.detail}</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setView(step.view)}>
              {step.action} <ArrowRight size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="grid-3">
        <div className="card" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <CheckCircle size={22} color="var(--success)" />
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800 }}>Démonstration sans risque</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>Toutes les données sont fictives.</p>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <Package size={22} color="var(--primary)" />
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800 }}>{db.products.length} produits</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>Catalogue commun aux deux métiers.</p>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <ShieldCheck size={22} color="var(--warning)" />
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800 }}>{db.warehouses.length} dépôts</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '4px' }}>Stocks séparés mais pilotés ensemble.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedDemo;
