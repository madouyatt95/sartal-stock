import React from 'react';
import {
  AlertTriangle, ArrowRight, BellRing, CalendarCheck, CheckCircle, ClipboardCheck,
  Clock3, HeartHandshake, ListChecks, MessageCircle, ShieldCheck, Sparkles,
  UserCheck, Users
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import SartalClient from './SartalClient';

interface CustomerExperienceCockpitProps { state: StockState }

export const CustomerExperienceCockpit: React.FC<CustomerExperienceCockpitProps> = ({ state }) => {
  const {
    db, updateSartalServiceRequest, applySartalRecoveryPlaybook,
    escalateOverdueSartalRequests, updateSartalOccasionTask, completeSartalOccasionPlan,
    updateRestaurantWaitlistStatus, updateSartalJourneyItemStatus
  } = state;
  const openRequests = db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status));
  const recoveries = db.sartalCustomerFeedback.filter(item => item.recoveryStatus === 'open');
  const activeCustomerIds = new Set<string>([
    ...db.restaurantGuestOrders.filter(item => !['paid', 'cancelled'].includes(item.status)).map(item => item.customerId),
    ...db.deliveryOrders.filter(item => !['delivered', 'returned', 'cancelled'].includes(item.status)).map(item => item.customerId).filter((id): id is string => Boolean(id)),
    ...db.sartalServiceRequests.filter(item => !['completed', 'cancelled'].includes(item.status)).map(item => item.customerId)
  ]);
  const recognizedProfiles = db.sartalCustomers.filter(item => item.profileConsent).length;
  const lateRequests = openRequests.filter(item => new Date(item.promisedAt).getTime() < Date.now());
  const activeOccasions = db.sartalOccasionPlans.filter(item => item.status !== 'completed');
  const activeWaitlist = db.restaurantWaitlist.filter(item => ['waiting', 'notified'].includes(item.status));
  const liveJourneys = db.sartalJourneyItems.filter(item => ['upcoming', 'in_progress'].includes(item.status)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

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
      <header><div><span><Sparkles size={15} /> PILOTAGE CLIENTS · ÉQUIPE INTERNE</span><h1>Voir, comprendre, agir</h1><p>Chaque attente client devient une action attribuée, chronométrée et visible jusqu’à sa résolution.</p></div><div className="cx-header-actions"><div className="cx-live-indicator"><i /> Service en direct</div>{lateRequests.length > 0 && <button onClick={() => escalateOverdueSartalRequests()}><BellRing size={15} /> Escalader {lateRequests.length}</button>}</div></header>
      <div className="cx-metrics">
        <article><Users size={20} /><span>Clients servis maintenant</span><strong>{activeCustomerIds.size}</strong><small>Restaurant, hôtel et livraison</small></article>
        <article><MessageCircle size={20} /><span>Demandes actives</span><strong>{openRequests.length}</strong><small>{lateRequests.length ? `${lateRequests.length} délai(s) dépassé(s)` : 'Tous les délais sont tenus'}</small></article>
        <article className={recoveries.length ? 'attention' : ''}><HeartHandshake size={20} /><span>Reprises prioritaires</span><strong>{recoveries.length}</strong><small>{recoveries.length ? 'Responsable assigné' : 'Aucun client en risque'}</small></article>
        <article><ShieldCheck size={20} /><span>Profils consentis</span><strong>{Math.round((recognizedProfiles / Math.max(1, db.sartalCustomers.length)) * 100)}%</strong><small>Préférences utilisables</small></article>
      </div>
      <section className="cx-service-brief"><header><ClipboardCheck size={19} /><div><strong>Brief avant service</strong><span>Ce qui change réellement l’accueil de chaque client</span></div></header><div>{[...activeCustomerIds].map(customerId => {
        const customer = db.sartalCustomers.find(item => item.id === customerId);
        const occasion = db.sartalOccasionPlans.find(item => item.customerId === customerId && item.status !== 'completed');
        const waitlist = db.restaurantWaitlist.find(item => item.customerId === customerId && ['waiting', 'notified'].includes(item.status));
        const nextJourney = db.sartalJourneyItems.find(item => item.customerId === customerId && ['upcoming', 'in_progress'].includes(item.status));
        const household = db.sartalHouseholds.find(item => item.id === customer?.householdId);
        const company = db.sartalCorporateAccounts.find(item => item.id === customer?.corporateAccountId);
        return <article key={customerId}><div className="cx-avatar">{customer?.fullName.split(' ').map(part => part[0]).join('').slice(0, 2)}</div><div><strong>{customer?.fullName}</strong><small>{customer?.preferredLanguage?.toUpperCase()} · {customer?.preferredChannel || 'portail'} · niveau {customer?.loyaltyTier}</small></div><div className="cx-brief-tags">{customer?.allergies && <b className="alert">Allergie : {customer.allergies}</b>}{occasion && <b>{occasion.label}</b>}{waitlist && <b>{waitlist.status === 'notified' ? 'Table prête' : `Attente ${waitlist.quotedMinutes} min`}</b>}{nextJourney && <b>{nextJourney.title}</b>}{household && <b>{household.name}</b>}{company && <b>{company.name}</b>}</div></article>;
      })}</div></section>
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

        <section className="cx-recovery-queue"><header><HeartHandshake size={19} /><div><strong>Ne laisser personne déçu</strong><span>Protocoles adaptés au contexte et à la gravité</span></div></header><div>{recoveries.map(feedback => {
          const customer = db.sartalCustomers.find(item => item.id === feedback.customerId);
          const playbooks = db.sartalRecoveryPlaybooks.filter(item => item.active && item.maxScore >= feedback.score && (item.context === 'all' || item.context === feedback.context));
          return <article key={feedback.id}><div className="cx-score">{feedback.score}/5</div><div><strong>{customer?.fullName}</strong><p>{feedback.note || 'Retour à reprendre'}</p><small>{feedback.assignedTo} · promis avant {feedback.promisedAt ? new Date(feedback.promisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'rapidement'}</small></div><div className="cx-playbook-actions">{playbooks.map(playbook => <button key={playbook.id} onClick={() => applySartalRecoveryPlaybook(feedback.id, playbook.id)}><span>{playbook.name}</span><small>{playbook.targetMinutes} min · +{playbook.compensationPoints} pts{playbook.managerApproval ? ' · direction' : ''}</small></button>)}</div></article>;
        })}{recoveries.length === 0 && <div className="cx-empty"><HeartHandshake size={24} /><strong>Tous les retours sont résolus</strong></div>}</div></section>
      </div>
      <div className="cx-service-controls">
        <section><header><CalendarCheck size={19} /><div><strong>Occasions spéciales</strong><span>Préparations partagées entre les équipes</span></div></header><div>{activeOccasions.map(plan => <article key={plan.id}><div><strong>{plan.label}</strong><small>{db.sartalCustomers.find(item => item.id === plan.customerId)?.fullName} · {plan.status === 'ready' ? 'tout est prêt' : 'préparation en cours'}</small></div>{plan.checklist.map(task => <button className={task.completed ? 'done' : ''} key={task.id} onClick={() => updateSartalOccasionTask(plan.id, task.id, !task.completed)}>{task.completed ? <CheckCircle size={15} /> : <ListChecks size={15} />}<span>{task.label}<small>{task.assignedTo}</small></span></button>)}<button className="cx-occasion-complete" disabled={plan.status !== 'ready'} onClick={() => completeSartalOccasionPlan(plan.id)}>Clôturer après l’événement</button></article>)}{activeOccasions.length === 0 && <div className="cx-empty"><CheckCircle size={22} /><strong>Toutes les attentions sont prêtes</strong></div>}</div></section>
        <section><header><Clock3 size={19} /><div><strong>Liste d’attente intelligente</strong><span>Promesse claire, notification et attribution</span></div></header><div>{activeWaitlist.map(entry => <article key={entry.id}><div><strong>{db.sartalCustomers.find(item => item.id === entry.customerId)?.fullName}</strong><small>{entry.guests} personne(s) · estimation {entry.quotedMinutes} min</small></div><span className={`badge ${entry.status === 'notified' ? 'badge-green' : 'badge-yellow'}`}>{entry.status === 'notified' ? 'Table prête' : 'En attente'}</span><footer>{entry.status === 'waiting' && <button onClick={() => updateRestaurantWaitlistStatus(entry.id, 'notified')}>Prévenir</button>}<button onClick={() => updateRestaurantWaitlistStatus(entry.id, 'seated', entry.tableNumber || 'T08')}>Installer · T08</button></footer></article>)}{activeWaitlist.length === 0 && <div className="cx-empty"><CheckCircle size={22} /><strong>Aucune attente active</strong></div>}</div></section>
        <section><header><UserCheck size={19} /><div><strong>Parcours à tenir</strong><span>Le prochain engagement de chaque service</span></div></header><div>{liveJourneys.slice(0, 6).map(item => <article key={item.id}><div><strong>{item.title}</strong><small>{db.sartalCustomers.find(customer => customer.id === item.customerId)?.fullName} · {item.assignedTo}</small></div><time>{new Date(item.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time><button onClick={() => updateSartalJourneyItemStatus(item.id, item.status === 'upcoming' ? 'in_progress' : 'completed')}>{item.status === 'upcoming' ? 'Démarrer' : 'Terminer'}</button></article>)}</div></section>
      </div>
    </section>
    <section className="cx-client-preview"><header><div><span>APERÇU DU PORTAIL PUBLIC</span><h2>Ce que le client voit réellement</h2></div><small><AlertTriangle size={14} /> Données de démonstration interactives</small></header><SartalClient state={state} /></section>
  </div>;
};

export default CustomerExperienceCockpit;
