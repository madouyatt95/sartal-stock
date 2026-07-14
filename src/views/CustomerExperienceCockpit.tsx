import React from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle, Clock3, HeartHandshake, MessageCircle,
  ShieldCheck, Sparkles, UserCheck, Users
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import SartalClient from './SartalClient';

interface CustomerExperienceCockpitProps { state: StockState }

export const CustomerExperienceCockpit: React.FC<CustomerExperienceCockpitProps> = ({ state }) => {
  const { db, updateSartalServiceRequest, resolveSartalCustomerFeedback } = state;
  const openRequests = db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status));
  const recoveries = db.sartalCustomerFeedback.filter(item => item.recoveryStatus === 'open');
  const activeCustomerIds = new Set<string>([
    ...db.restaurantGuestOrders.filter(item => !['paid', 'cancelled'].includes(item.status)).map(item => item.customerId),
    ...db.deliveryOrders.filter(item => !['delivered', 'returned', 'cancelled'].includes(item.status)).map(item => item.customerId).filter((id): id is string => Boolean(id)),
    ...db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status)).map(item => item.customerId)
  ]);
  const recognizedProfiles = db.sartalCustomers.filter(item => item.profileConsent).length;
  const lateRequests = openRequests.filter(item => new Date(item.promisedAt).getTime() < Date.now());

  const customerContext = (customerId: string) => {
    const restaurant = db.restaurantGuestOrders.find(item => item.customerId === customerId && !['paid', 'cancelled'].includes(item.status));
    const delivery = db.deliveryOrders.find(item => item.customerId === customerId && !['delivered', 'returned', 'cancelled'].includes(item.status));
    const customer = db.sartalCustomers.find(item => item.id === customerId);
    const guest = db.pmsGuests.find(item => item.phone.replace(/\s/g, '') === customer?.phone.replace(/\s/g, ''));
    const stay = db.pmsReservations.find(item => item.guestId === guest?.id && item.status === 'checked_in');
    return { restaurant, delivery, stay };
  };

  return <div className="customer-experience-workspace">
    <section className="cx-cockpit">
      <header><div><span><Sparkles size={15} /> POSTE EXPÉRIENCE CLIENT</span><h1>Voir, comprendre, agir</h1><p>Chaque attente client devient une action attribuée, chronométrée et visible jusqu’à sa résolution.</p></div><div className="cx-live-indicator"><i /> Service en direct</div></header>
      <div className="cx-metrics">
        <article><Users size={20} /><span>Clients servis maintenant</span><strong>{activeCustomerIds.size}</strong><small>Restaurant, hôtel et livraison</small></article>
        <article><MessageCircle size={20} /><span>Demandes actives</span><strong>{openRequests.length}</strong><small>{lateRequests.length ? `${lateRequests.length} délai(s) dépassé(s)` : 'Tous les délais sont tenus'}</small></article>
        <article className={recoveries.length ? 'attention' : ''}><HeartHandshake size={20} /><span>Reprises prioritaires</span><strong>{recoveries.length}</strong><small>{recoveries.length ? 'Responsable assigné' : 'Aucun client en risque'}</small></article>
        <article><ShieldCheck size={20} /><span>Profils consentis</span><strong>{Math.round((recognizedProfiles / Math.max(1, db.sartalCustomers.length)) * 100)}%</strong><small>Préférences utilisables</small></article>
      </div>
      <div className="cx-board">
        <section className="cx-live-customers"><header><UserCheck size={19} /><div><strong>Parcours en cours</strong><span>Le contexte utile, sans chercher dans plusieurs modules</span></div></header><div>{[...activeCustomerIds].map(customerId => {
          const customer = db.sartalCustomers.find(item => item.id === customerId);
          const context = customerContext(customerId);
          return <article key={customerId}><div className="cx-avatar">{customer?.fullName.split(' ').map(part => part[0]).join('').slice(0, 2)}</div><div><strong>{customer?.fullName}</strong><span>{customer?.allergies ? `Attention : ${customer.allergies}` : customer?.preferences || 'Profil standard'}</span><div>{context.restaurant && <b>Table {context.restaurant.tableNumber || 'en cours'}</b>}{context.delivery && <b>Livraison {context.delivery.id}</b>}{context.stay && <b>Séjour {context.stay.confirmationNumber}</b>}</div></div><small>{db.sartalServiceRequests.filter(item => item.customerId === customerId && !['completed', 'cancelled'].includes(item.status)).length} demande(s)</small></article>;
        })}</div></section>

        <section className="cx-request-queue"><header><Clock3 size={19} /><div><strong>Demandes à tenir</strong><span>Promesse affichée au client</span></div></header><div>{openRequests.map(request => {
          const customer = db.sartalCustomers.find(item => item.id === request.customerId);
          const late = new Date(request.promisedAt).getTime() < Date.now();
          return <article className={late ? 'late' : ''} key={request.id}><div><span>{request.context}</span><strong>{request.label}</strong><small>{customer?.fullName} · {request.assignedTo}</small></div><time>{late ? 'Délai dépassé' : `Avant ${new Date(request.promisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}</time>{request.status === 'requested' ? <button onClick={() => updateSartalServiceRequest(request.id, 'accepted')}>Prendre en charge <ArrowRight size={14} /></button> : <button onClick={() => updateSartalServiceRequest(request.id, 'completed')}><CheckCircle size={14} /> Terminer</button>}</article>;
        })}{openRequests.length === 0 && <div className="cx-empty"><CheckCircle size={24} /><strong>Aucune demande en attente</strong></div>}</div></section>

        <section className="cx-recovery-queue"><header><HeartHandshake size={19} /><div><strong>Ne laisser personne déçu</strong><span>Reprise suivie jusqu’à la solution</span></div></header><div>{recoveries.map(feedback => {
          const customer = db.sartalCustomers.find(item => item.id === feedback.customerId);
          return <article key={feedback.id}><div className="cx-score">{feedback.score}/5</div><div><strong>{customer?.fullName}</strong><p>{feedback.note || 'Retour à reprendre'}</p><small>{feedback.assignedTo} · promis avant {feedback.promisedAt ? new Date(feedback.promisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'rapidement'}</small></div><button onClick={() => resolveSartalCustomerFeedback(feedback.id, 'Client rappelé, contrôle effectué et solution confirmée.', 250)}>Résoudre · +250 points</button></article>;
        })}{recoveries.length === 0 && <div className="cx-empty"><HeartHandshake size={24} /><strong>Tous les retours sont résolus</strong></div>}</div></section>
      </div>
    </section>
    <section className="cx-client-preview"><header><div><span>APERÇU CLIENT</span><h2>Ce que le client voit réellement</h2></div><small><AlertTriangle size={14} /> Données de démonstration interactives</small></header><SartalClient state={state} /></section>
  </div>;
};

export default CustomerExperienceCockpit;
