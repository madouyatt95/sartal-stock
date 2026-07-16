import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Boxes,
  Check,
  ChevronRight,
  CircleUserRound,
  Hotel,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed
} from 'lucide-react';
import { DEMO_UNIVERSES, getDemoUniverse, type DemoUniverse } from '../demoPortalConfig';

interface DemoPortalProps {
  initialUniverseId?: string;
}

const UNIVERSE_ICONS: Record<string, React.ElementType> = {
  stock: Package,
  'restaurant-stock': UtensilsCrossed,
  'delivery-stock': ShoppingBag,
  'pms-stock': BedDouble,
  'pms-restaurant-stock': Hotel,
  'suite-complete': Boxes
};

export const DemoPortal: React.FC<DemoPortalProps> = ({ initialUniverseId }) => {
  const queryUniverse = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('univers') : null;
  const [selectedUniverseId, setSelectedUniverseId] = useState(initialUniverseId || queryUniverse || '');
  const selectedUniverse = getDemoUniverse(selectedUniverseId);
  const perspectiveGroups = selectedUniverse ? [
    {
      id: 'pilotage',
      label: 'Pilotage et responsables',
      description: 'Direction, managers, finance, stock et contrôle.',
      perspectives: selectedUniverse.perspectives.filter(item => item.target.type === 'backoffice')
    },
    {
      id: 'operations',
      label: 'Équipes opérationnelles',
      description: 'Les postes utilisés chaque jour sur le terrain.',
      perspectives: selectedUniverse.perspectives.filter(item => item.target.type === 'employee')
    },
    {
      id: 'clients',
      label: 'Expériences client',
      description: 'Les interfaces accessibles sans ouvrir le back-office.',
      perspectives: selectedUniverse.perspectives.filter(item => ['client', 'hotel-client'].includes(item.target.type))
    }
  ].filter(group => group.perspectives.length > 0) : [];

  const selectUniverse = (universe: DemoUniverse) => {
    setSelectedUniverseId(universe.id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('demo', 'portal');
      url.searchParams.set('univers', universe.id);
      window.history.replaceState({}, '', url);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const returnToUniverses = () => {
    setSelectedUniverseId('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('demo', 'portal');
      window.history.replaceState({}, '', url);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const launchPerspective = (universe: DemoUniverse, perspectiveId: string) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('demo', universe.id);
    url.searchParams.set('profil', perspectiveId);
    window.location.assign(url.toString());
  };

  return (
    <main className="sartal-demo-portal">
      <header className="demo-portal-header">
        <a className="demo-portal-brand" href="./" aria-label="Retour au portail Sártal">
          <img src="./brand-mark.svg" alt="" />
          <span><strong>SÁRTAL</strong><small>Portail de démonstration</small></span>
        </a>
        <div className="demo-portal-status"><i /><span>Données de démonstration</span></div>
      </header>

      <section className="demo-portal-hero">
        <div>
          <span className="demo-portal-eyebrow"><Sparkles size={16} /> DÉCOUVRIR SÁRTAL</span>
          <h1>{selectedUniverse ? 'Choisissez votre point de vue' : 'Choisissez l’univers à découvrir'}</h1>
          <p>{selectedUniverse ? `Vous explorez ${selectedUniverse.label}. Ouvrez directement l’interface d’un utilisateur réel.` : 'Explorez une offre concrète, puis voyez exactement ce que chaque utilisateur utilise au quotidien.'}</p>
        </div>
        <ol className="demo-portal-steps" aria-label="Étapes de la démonstration">
          <li className={selectedUniverse ? 'complete' : 'active'}><span>{selectedUniverse ? <Check size={16} /> : '1'}</span><div><strong>Univers</strong><small>Modules inclus</small></div></li>
          <li className={selectedUniverse ? 'active' : ''}><span>2</span><div><strong>Point de vue</strong><small>Interface utilisateur</small></div></li>
        </ol>
      </section>

      {!selectedUniverse ? (
        <section className="demo-universe-section">
          <header><div><span>6 OFFRES À EXPLORER</span><h2>De la gestion de stock à la suite complète</h2></div><p>Le socle Sártal Stock est inclus dans chaque activité qui manipule des produits.</p></header>
          <div className="demo-universe-grid">
            {DEMO_UNIVERSES.map(universe => {
              const Icon = UNIVERSE_ICONS[universe.id] || Package;
              return (
                <button className={`demo-universe-card ${universe.recommended ? 'recommended' : ''}`} key={universe.id} style={{ '--demo-accent': universe.accent } as React.CSSProperties} onClick={() => selectUniverse(universe)}>
                  <header><span className="demo-universe-icon"><Icon size={24} /></span>{universe.recommended && <b>Recommandé complexe hôtelier</b>}<ChevronRight size={20} /></header>
                  <span className="demo-universe-eyebrow">{universe.eyebrow}</span>
                  <h2>{universe.label}</h2>
                  <p>{universe.description}</p>
                  <div>{universe.features.map(feature => <span key={feature}><Check size={13} /> {feature}</span>)}</div>
                  <footer><strong>Découvrir cette offre</strong><ArrowRight size={17} /></footer>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="demo-perspective-section" style={{ '--demo-accent': selectedUniverse.accent } as React.CSSProperties}>
          <button className="demo-portal-back" onClick={returnToUniverses}><ArrowLeft size={17} /> Changer d’univers</button>
          <div className="demo-selected-universe">
            <span><ShieldCheck size={19} /></span>
            <div><small>{selectedUniverse.eyebrow}</small><strong>{selectedUniverse.label}</strong><p>{selectedUniverse.features.join(' · ')}</p></div>
          </div>
          <header><div><span>{selectedUniverse.perspectives.length} INTERFACES DISPONIBLES</span><h2>Qui souhaitez-vous incarner ?</h2></div><p>Un clic ouvre le poste avec son rôle, ses droits et les modules de l’offre.</p></header>
          <div className="demo-perspective-groups">
            {perspectiveGroups.map(group => <section key={group.id} aria-labelledby={`demo-group-${group.id}`}>
              <header><div><span>{group.perspectives.length}</span><h3 id={`demo-group-${group.id}`}>{group.label}</h3></div><p>{group.description}</p></header>
              <div className="demo-perspective-grid">
                {group.perspectives.map(perspective => (
                  <button key={perspective.id} onClick={() => launchPerspective(selectedUniverse, perspective.id)}>
                    <span className="demo-perspective-icon"><CircleUserRound size={22} /></span>
                    <div><strong>{perspective.label}</strong><p>{perspective.description}</p></div>
                    <ArrowRight size={18} />
                  </button>
                ))}
              </div>
            </section>)}
          </div>
        </section>
      )}

      <footer className="demo-portal-footer"><ShieldCheck size={16} /><span>En production, l’entreprise active ses modules une seule fois et chaque utilisateur arrive directement sur son propre espace.</span></footer>
    </main>
  );
};

export default DemoPortal;
