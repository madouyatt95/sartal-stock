import React, { useState } from 'react';
import { ArrowRight, BedDouble, Building2, CheckCircle2, LockKeyhole, PackageCheck, ShieldCheck, Truck, UsersRound, UtensilsCrossed } from 'lucide-react';
import { StockState } from '../hooks/useStockState';

interface SartalAccessCenterProps {
  state: StockState;
  embedded?: boolean;
  onOpenBackOffice?: () => void;
}

const moduleLabels = {
  stock: 'Stock & opérations',
  restaurant: 'Restaurant',
  delivery: 'Livraison',
  pms: 'Hôtel / PMS'
};

export const SartalAccessCenter: React.FC<SartalAccessCenterProps> = ({ state, embedded = false, onOpenBackOffice }) => {
  const { db } = state;
  const { sartalBrandSettings: brand } = db;
  const [siteId, setSiteId] = useState(db.sites[0]?.id || '');
  const profile = brand.siteProfiles.find(item => item.siteId === siteId);
  const activeReservation = db.pmsReservations.find(item => ['confirmed', 'checked_in'].includes(item.status));
  const clientMode = brand.enabledModules.includes('restaurant') ? 'restaurant' : 'delivery';

  const navigate = (key?: string, value?: string) => {
    if (!key && embedded && onOpenBackOffice) {
      onOpenBackOffice();
      return;
    }
    const url = new URL(window.location.href);
    url.search = '';
    if (key && value) url.searchParams.set(key, value);
    if (!embedded && key && value) url.searchParams.set('origine', 'connexion');
    if (embedded) window.open(url.toString(), '_blank', 'noopener,noreferrer');
    else window.location.assign(url.toString());
  };

  const spaces = [
    {
      id: 'direction',
      icon: <Building2 size={25} />,
      eyebrow: 'DIRECTION & MANAGERS',
      title: brand.backOfficeName,
      detail: 'Pilotage temps réel, stocks, ventes, opérations et contrôle selon vos habilitations.',
      badges: brand.enabledModules.map(module => moduleLabels[module]),
      action: 'Ouvrir le pilotage',
      onClick: () => embedded ? navigate() : navigate('pilotage', '1')
    },
    {
      id: 'staff',
      icon: <UsersRound size={25} />,
      eyebrow: 'COLLABORATEURS',
      title: brand.staffAppName,
      detail: 'Un poste simple et limité au métier, à l’établissement et à l’affectation du jour.',
      badges: ['Prise de service', 'Tâches', 'Passation'],
      action: 'Ouvrir mon poste',
      onClick: () => navigate('equipe', '1')
    },
    {
      id: 'client',
      icon: brand.enabledModules.includes('restaurant') ? <UtensilsCrossed size={25} /> : <Truck size={25} />,
      eyebrow: 'CLIENTS RESTAURANT & LIVRAISON',
      title: brand.clientAppName,
      detail: 'Réservations, commandes, suivi, fidélité et demandes de service dans un espace personnel.',
      badges: [brand.enabledModules.includes('restaurant') ? 'Restaurant' : '', brand.enabledModules.includes('delivery') ? 'Livraison' : '', 'Fidélité'].filter(Boolean),
      action: 'Voir l’espace client',
      disabled: !brand.enabledModules.includes('restaurant') && !brand.enabledModules.includes('delivery'),
      onClick: () => navigate('client', clientMode)
    },
    {
      id: 'stay',
      icon: <BedDouble size={25} />,
      eyebrow: 'VOYAGEURS',
      title: brand.hotelAppName,
      detail: 'Pré-arrivée, chambre, services, folio et départ réunis sans exposer le back-office.',
      badges: ['Séjour', 'Conciergerie', 'Folio'],
      action: 'Voir le portail séjour',
      disabled: !brand.enabledModules.includes('pms') || !activeReservation,
      onClick: () => activeReservation && navigate('sejour', activeReservation.id)
    }
  ];

  return <main className={`sartal-access-center ${embedded ? 'embedded' : ''}`} style={{ '--access-primary': profile?.primaryColor || brand.primaryColor, '--access-accent': profile?.accentColor || brand.accentColor } as React.CSSProperties}>
    <header>
      <div className="sartal-access-brand"><img src="./brand-mark.svg" alt="Sártal" /><span><strong>SÁRTAL</strong><small>Un accès, le bon espace</small></span></div>
      <div className="sartal-access-security"><ShieldCheck size={18} /><span><strong>Accès orienté par profil</strong><small>Les autres interfaces restent invisibles</small></span></div>
    </header>
    <section className="sartal-access-intro">
      <div><span>CENTRE D’ACCÈS</span><h1>Que souhaitez-vous ouvrir aujourd’hui ?</h1><p>{profile?.welcomeMessage || 'Chaque utilisateur retrouve directement les outils utiles à son rôle.'}</p></div>
      <label>Établissement<select value={siteId} onChange={event => setSiteId(event.target.value)}>{db.sites.map(item => <option value={item.id} key={item.id}>{brand.siteProfiles.find(profileItem => profileItem.siteId === item.id)?.displayName || item.name}</option>)}</select></label>
    </section>
    <section className="sartal-access-grid">
      {spaces.map(space => <article className={space.disabled ? 'disabled' : ''} key={space.id}>
        <div className="sartal-access-icon">{space.icon}</div>
        <span>{space.eyebrow}</span>
        <h2>{space.title}</h2>
        <p>{space.detail}</p>
        <div>{space.badges.map(badge => <small key={badge}><CheckCircle2 size={13} /> {badge}</small>)}</div>
        <button disabled={space.disabled} onClick={space.onClick}>{space.disabled ? 'Module non activé' : space.action}<ArrowRight size={17} /></button>
      </article>)}
    </section>
    <footer><LockKeyhole size={16} /><span>Votre identité, votre rôle, votre établissement et les modules souscrits déterminent l’espace proposé.</span><PackageCheck size={16} /></footer>
  </main>;
};

export default SartalAccessCenter;
