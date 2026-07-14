import React, { useMemo, useState } from 'react';
import {
  ArrowRight, BedDouble, Building2, CalendarCheck, CheckCircle, Clock3, Gift,
  Heart, HeartHandshake, History, KeyRound, Languages, LockKeyhole,
  MessageCircle, QrCode, ReceiptText, RefreshCw, ShieldCheck, ShoppingBag,
  Sparkles, Star, TicketCheck, Truck, UserRound, Users, UtensilsCrossed,
  WalletCards, WifiOff
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';

type HubTab = 'today' | 'passport' | 'wallet' | 'history';

interface SartalClientHubProps {
  state: StockState;
  customerId: string;
  onOpenRestaurant: () => void;
  onOpenDelivery: () => void;
  onMessage: (message: string) => void;
}

const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;
const formatMoment = (value: string) => new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const SartalClientHub: React.FC<SartalClientHubProps> = ({ state, customerId, onOpenRestaurant, onOpenDelivery, onMessage }) => {
  const {
    db, updateSartalCustomerProfile, createSartalClientAccess, requestSartalService,
    redeemSartalPoints, reorderDeliveryOrder, toggleFavoriteProduct,
    toggleSartalRecurringOrder, runSartalRecurringOrder, joinRestaurantWaitlist,
    toggleLowBandwidthMode, transferSartalHouseholdPoints, syncSartalOfflineActions
  } = state;
  const customer = db.sartalCustomers.find(item => item.id === customerId);
  const [tab, setTab] = useState<HubTab>('today');
  const [profile, setProfile] = useState(() => ({
    fullName: customer?.fullName || '',
    email: customer?.email || '',
    preferredLanguage: customer?.preferredLanguage || 'fr' as const,
    preferredChannel: customer?.preferredChannel || 'whatsapp' as const,
    preferences: customer?.preferences || '',
    allergies: customer?.allergies || '',
    profileConsent: customer?.profileConsent ?? false,
    marketingConsent: customer?.marketingConsent ?? false
  }));

  const restaurantOrder = db.restaurantGuestOrders.find(item => item.customerId === customerId && !['paid', 'cancelled'].includes(item.status)) || db.restaurantGuestOrders.find(item => item.customerId === customerId);
  const restaurantReservation = db.restaurantReservations.find(item => item.customerId === customerId && ['confirmed', 'seated'].includes(item.status));
  const deliveryOrder = db.deliveryOrders.find(item => item.customerId === customerId && !['delivered', 'returned', 'cancelled'].includes(item.status)) || db.deliveryOrders.find(item => item.customerId === customerId);
  const pmsGuest = db.pmsGuests.find(item => item.phone.replace(/\s/g, '') === customer?.phone.replace(/\s/g, ''));
  const pmsReservation = db.pmsReservations.find(item => item.guestId === pmsGuest?.id && ['confirmed', 'checked_in'].includes(item.status));
  const pmsRoom = db.pmsRooms.find(item => item.id === pmsReservation?.roomId);
  const activeAccess = db.sartalClientAccess.find(item => item.customerId === customerId && item.status === 'active' && new Date(item.expiresAt).getTime() > Date.now());
  const serviceRequests = db.sartalServiceRequests.filter(item => item.customerId === customerId && !['completed', 'cancelled'].includes(item.status));
  const loyalty = db.sartalLoyaltyTransactions.filter(item => item.customerId === customerId).sort((a, b) => b.date.localeCompare(a.date));
  const feedback = db.sartalCustomerFeedback.filter(item => item.customerId === customerId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const journeyItems = db.sartalJourneyItems.filter(item => item.customerId === customerId && item.status !== 'cancelled').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const favoriteProducts = db.products.filter(item => customer?.favoriteProductIds?.includes(item.id));
  const recurringOrder = db.sartalRecurringOrders.find(item => item.customerId === customerId);
  const waitlistEntry = db.restaurantWaitlist.find(item => item.customerId === customerId && ['waiting', 'notified'].includes(item.status));
  const household = db.sartalHouseholds.find(item => item.id === customer?.householdId);
  const corporateAccount = db.sartalCorporateAccounts.find(item => item.id === customer?.corporateAccountId);
  const queuedOfflineActions = db.sartalOfflineActions.filter(item => item.customerId === customerId && item.status === 'queued');

  const timeline = useMemo(() => {
    const events: Array<{ id: string; date: string; icon: React.ReactNode; title: string; detail: string; tone: string }> = [];
    db.restaurantReservations.filter(item => item.customerId === customerId).forEach(item => events.push({ id: item.id, date: item.createdAt, icon: <CalendarCheck size={17} />, title: 'Table réservée', detail: `${item.guests} personne(s) · ${item.time}`, tone: 'restaurant' }));
    db.restaurantGuestOrders.filter(item => item.customerId === customerId).forEach(item => events.push({ id: item.id, date: item.createdAt, icon: <UtensilsCrossed size={17} />, title: 'Commande restaurant', detail: `${formatFCFA(item.total)} · ${item.status}`, tone: 'restaurant' }));
    db.deliveryOrders.filter(item => item.customerId === customerId).forEach(item => events.push({ id: item.id, date: item.createdAt, icon: <Truck size={17} />, title: 'Commande livraison', detail: `${item.id} · ${item.status}`, tone: 'delivery' }));
    loyalty.forEach(item => events.push({ id: item.id, date: item.date, icon: <Gift size={17} />, title: item.label, detail: `${item.points > 0 ? '+' : ''}${item.points} points`, tone: 'loyalty' }));
    feedback.forEach(item => events.push({ id: item.id, date: item.submittedAt, icon: <HeartHandshake size={17} />, title: item.recoveryStatus === 'resolved' ? 'Votre retour a été résolu' : 'Votre retour est suivi', detail: item.solution || item.note || `${item.score}/5`, tone: item.recoveryStatus === 'open' ? 'alert' : 'loyalty' }));
    return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 16);
  }, [customerId, db, feedback, loyalty]);

  if (!customer) {
    return <section className="portal-unavailable compact">
      <section>
        <img src="./brand-mark.svg" alt="Sártal" />
        <span>MON SÁRTAL</span>
        <h1>Profil introuvable</h1>
        <p>Ce profil client n’est plus accessible. Demandez un nouveau lien personnel à l’établissement.</p>
      </section>
    </section>;
  }

  const issueAccess = (channel: 'qr' | 'whatsapp' | 'sms') => {
    const access = createSartalClientAccess(customer.id, channel);
    onMessage(`${channel === 'qr' ? 'QR personnel' : channel === 'whatsapp' ? 'Lien WhatsApp' : 'Code SMS'} créé · code ${access.code}, valable 30 min.`);
  };
  const saveProfile = () => {
    updateSartalCustomerProfile(customer.id, profile);
    onMessage('Votre passeport Sártal a été mis à jour avec votre consentement.');
  };
  const askReception = () => {
    requestSartalService({ customerId: customer.id, context: pmsReservation ? 'hotel' : restaurantOrder ? 'restaurant' : 'delivery', referenceId: pmsReservation?.id || restaurantOrder?.id || deliveryOrder?.id, type: pmsReservation ? 'reception' : restaurantOrder ? 'waiter' : 'delivery_help', label: pmsReservation ? 'Contacter la réception' : restaurantOrder ? 'Contacter le responsable de salle' : 'Être rappelé par le service livraison', priority: 'urgent' });
    onMessage('Votre demande est prise en compte. Une réponse est promise sous 3 minutes.');
  };
  const updateFavorite = (productId: string) => {
    try {
      const enabled = toggleFavoriteProduct(customer.id, productId);
      onMessage(enabled ? 'Ajouté à vos favoris.' : 'Retiré de vos favoris.');
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Favori indisponible'); }
  };
  const runRecurring = () => {
    if (!recurringOrder) return;
    try {
      const orderId = runSartalRecurringOrder(recurringOrder.id);
      onMessage(`Votre panier récurrent a créé la commande ${orderId}.`);
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Commande récurrente indisponible'); }
  };
  const joinWaitlist = () => {
    const restaurant = db.posList.find(item => item.type === 'restaurant');
    if (!restaurant) return;
    try {
      const id = joinRestaurantWaitlist(customer.id, restaurant.id, 2);
      onMessage(`Liste d’attente ${id} confirmée. Vous serez prévenu dès que la table est prête.`);
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Liste d’attente indisponible'); }
  };

  const hubTabs: Array<{ id: HubTab; label: string; icon: React.ReactNode }> = [
    { id: 'today', label: "Aujourd'hui", icon: <Sparkles size={17} /> },
    { id: 'passport', label: 'Passeport', icon: <UserRound size={17} /> },
    { id: 'wallet', label: 'Portefeuille', icon: <WalletCards size={17} /> },
    { id: 'history', label: 'Mon histoire', icon: <History size={17} /> }
  ];

  return <section className="sartal-hub">
    <header className="sartal-hub-heading">
      <div><span>MON SÁRTAL</span><h1>Bonjour {customer.fullName.split(' ')[0]}</h1><p>Vos services, préférences et avantages réunis dans un seul espace.</p></div>
      <div className="sartal-hub-identity"><ShieldCheck size={20} /><div><strong>Profil reconnu</strong><small>{customer.phone} · niveau {customer.loyaltyTier}</small></div></div>
    </header>
    <nav className="sartal-hub-tabs">{hubTabs.map(item => <button className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => setTab(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>

    {tab === 'today' && <div className="sartal-hub-today">
      <section className="sartal-now-card">
        <div><span>VOTRE PROCHAINE ACTION</span><h2>{restaurantOrder ? `Suivre la table ${restaurantOrder.tableNumber || ''}` : deliveryOrder ? 'Suivre votre livraison' : pmsReservation ? `Profiter de la chambre ${pmsRoom?.roomNumber || ''}` : 'Choisir votre prochaine expérience'}</h2><p>{restaurantOrder ? 'La cuisine et votre serveur partagent le même suivi.' : deliveryOrder ? 'Votre commande et votre livreur sont visibles en temps réel.' : pmsReservation ? 'Réception, folio et services sont déjà reliés.' : 'Restaurant et livraison sont accessibles avec le même profil.'}</p></div>
        <button onClick={restaurantOrder ? onOpenRestaurant : deliveryOrder ? onOpenDelivery : pmsReservation ? askReception : onOpenRestaurant}>Continuer <ArrowRight size={17} /></button>
      </section>
      <section className="sartal-day-plan">
        <header><div><CalendarCheck size={20} /><span><strong>Ma journée Sártal</strong><small>Chaque équipe voit la même chronologie.</small></span></div><b>{journeyItems.filter(item => item.status === 'completed').length}/{journeyItems.length} prévu(s)</b></header>
        <div>{journeyItems.map(item => <article className={item.status} key={item.id}><time>{new Date(item.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time><span>{item.status === 'completed' ? <CheckCircle size={17} /> : <Clock3 size={17} />}</span><div><strong>{item.title}</strong><small>{item.detail} · {item.assignedTo}</small></div><b>{item.status === 'completed' ? 'Terminé' : item.status === 'in_progress' ? 'En cours' : 'À venir'}</b></article>)}</div>
      </section>
      <div className="sartal-context-grid">
        <article className={restaurantOrder || restaurantReservation ? 'active' : ''}><span><UtensilsCrossed size={20} /> Restaurant</span><strong>{restaurantOrder ? `Table ${restaurantOrder.tableNumber || 'en cours'}` : restaurantReservation ? `${restaurantReservation.time} · ${restaurantReservation.guests} pers.` : 'Aucune table en cours'}</strong><small>{restaurantOrder ? `${restaurantOrder.items.length} ligne(s) · ${formatFCFA(restaurantOrder.total)}` : 'Réserver ou consulter la carte'}</small><button onClick={onOpenRestaurant}>Ouvrir <ArrowRight size={14} /></button></article>
        <article className={deliveryOrder ? 'active' : ''}><span><ShoppingBag size={20} /> Livraison</span><strong>{deliveryOrder ? deliveryOrder.id : 'Boutique disponible'}</strong><small>{deliveryOrder ? `${deliveryOrder.status} · ${deliveryOrder.estimatedMinutes || 45} min` : 'Stock réel et livraison à Dakar'}</small><button onClick={onOpenDelivery}>Ouvrir <ArrowRight size={14} /></button></article>
        <article className={pmsReservation ? 'active' : ''}><span><BedDouble size={20} /> Hôtel</span><strong>{pmsReservation ? `Chambre ${pmsRoom?.roomNumber || 'à attribuer'}` : 'Aucun séjour actif'}</strong><small>{pmsReservation ? `${pmsReservation.confirmationNumber} · réception disponible` : 'Le séjour apparaîtra automatiquement ici'}</small><button disabled={!pmsReservation} onClick={askReception}>{pmsReservation ? 'Contacter' : 'Non actif'} <ArrowRight size={14} /></button></article>
      </div>
      <div className="sartal-habit-grid">
        <section className="sartal-favorites"><header><Heart size={19} /><div><strong>Mes favoris</strong><small>Retrouvez vos choix sans recommencer.</small></div></header><div>{favoriteProducts.map(product => <button key={product.id} onClick={() => updateFavorite(product.id)}><span>{product.name}</span><Heart size={14} fill="currentColor" /></button>)}{favoriteProducts.length === 0 && <p>Ajoutez un produit depuis la carte ou la boutique.</p>}</div></section>
        <section className="sartal-recurring"><header><RefreshCw size={19} /><div><strong>Commande récurrente</strong><small>Votre panier essentiel, au bon rythme.</small></div></header>{recurringOrder ? <><div><span><strong>{recurringOrder.name}</strong><small>{recurringOrder.items.length} produit(s) · {recurringOrder.cadence === 'weekly' ? 'chaque semaine' : recurringOrder.cadence === 'biweekly' ? 'toutes les deux semaines' : 'chaque mois'}</small></span><b className={recurringOrder.active ? 'active' : ''}>{recurringOrder.active ? 'Active' : 'En pause'}</b></div><footer><button onClick={() => toggleSartalRecurringOrder(recurringOrder.id)}>{recurringOrder.active ? 'Mettre en pause' : 'Réactiver'}</button><button disabled={!recurringOrder.active} onClick={runRecurring}>Commander maintenant</button></footer></> : <p>Aucun panier récurrent configuré.</p>}</section>
      </div>
      <section className="sartal-waitlist-card"><div><Clock3 size={21} /><span><strong>{waitlistEntry ? 'Votre table se prépare' : 'Restaurant complet ?'}</strong><small>{waitlistEntry ? `${waitlistEntry.guests} personne(s) · estimation ${waitlistEntry.quotedMinutes} min · ${waitlistEntry.status === 'notified' ? 'table prête' : 'en attente'}` : 'Rejoignez la liste et continuez votre journée, nous vous prévenons.'}</small></span></div>{waitlistEntry ? <b>{waitlistEntry.status === 'notified' ? 'Présentez-vous à l’accueil' : `${waitlistEntry.quotedMinutes} min`}</b> : <button onClick={joinWaitlist}>Rejoindre pour 2</button>}</section>
      <section className="sartal-personal-attention"><Sparkles size={22} /><div><span>CHOISI POUR VOUS</span><strong>{customer.allergies ? `Des propositions sans ${customer.allergies.toLowerCase()}` : 'Vos habitudes sont prêtes'}</strong><p>{customer.preferences || 'Sártal adapte le service avec les informations que vous acceptez de partager.'}</p></div><button onClick={() => setTab('passport')}>Ajuster mes préférences</button></section>
      <section className="sartal-live-service"><header><div><MessageCircle size={20} /><span><strong>Service en direct</strong><small>{serviceRequests.length} demande(s) en cours</small></span></div><button onClick={askReception}>J’ai besoin d’aide</button></header>{serviceRequests.map(item => <article key={item.id}><span className={item.status}><i />{item.status === 'accepted' ? 'Prise en charge' : 'Demande reçue'}</span><div><strong>{item.label}</strong><small>{item.assignedTo} · avant {new Date(item.promisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></div></article>)}</section>
      <section className="sartal-access-card"><div><KeyRound size={22} /><span><strong>Entrer sans mot de passe</strong><small>Un accès personnel, temporaire et révocable.</small></span></div>{activeAccess ? <div className="sartal-active-access"><span>CODE ACTIF</span><strong>{activeAccess.code}</strong><small>{activeAccess.channel} · expire à {new Date(activeAccess.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small><div><button onClick={() => window.open(`${window.location.origin}${window.location.pathname}?access=${activeAccess.linkToken}`, '_blank', 'noopener,noreferrer')}>Ouvrir le lien</button><button onClick={() => issueAccess(activeAccess.channel)}>Renouveler</button></div></div> : <div className="sartal-access-actions"><button onClick={() => issueAccess('whatsapp')}><MessageCircle size={16} /> WhatsApp</button><button onClick={() => issueAccess('sms')}><LockKeyhole size={16} /> SMS</button><button onClick={() => issueAccess('qr')}><QrCode size={16} /> QR</button></div>}</section>
    </div>}

    {tab === 'passport' && <section className="sartal-passport-layout">
      <aside><div className="sartal-passport-monogram">{customer.fullName.split(' ').map(part => part[0]).join('').slice(0, 2)}</div><span>PASSEPORT SÁRTAL</span><h2>{customer.fullName}</h2><p>Depuis {customer.visits} visite(s)</p><div><strong>{customer.loyaltyTier}</strong><small>{customer.loyaltyPoints} points</small></div><ShieldCheck size={22} /></aside>
      <div className="sartal-passport-form"><header><UserRound size={22} /><div><h2>Ce que les équipes peuvent connaître</h2><p>Vous gardez la main sur les informations mémorisées.</p></div></header><div className="client-form-grid"><label>Nom complet<input className="form-control" value={profile.fullName} onChange={event => setProfile({ ...profile, fullName: event.target.value })} /></label><label>E-mail<input className="form-control" value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value })} /></label><label><Languages size={14} /> Langue<select className="form-control" value={profile.preferredLanguage} onChange={event => setProfile({ ...profile, preferredLanguage: event.target.value as typeof profile.preferredLanguage })}><option value="fr">Français</option><option value="wo">Wolof</option><option value="en">English</option></select></label><label>Canal préféré<select className="form-control" value={profile.preferredChannel} onChange={event => setProfile({ ...profile, preferredChannel: event.target.value as typeof profile.preferredChannel })}><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">E-mail</option><option value="portal">Portail uniquement</option></select></label></div><label>Mes préférences<textarea className="form-control" value={profile.preferences} onChange={event => setProfile({ ...profile, preferences: event.target.value })} /></label><label>Allergies et besoins importants<input className="form-control" value={profile.allergies} onChange={event => setProfile({ ...profile, allergies: event.target.value })} /></label><div className="sartal-consent-row"><label><input type="checkbox" checked={profile.profileConsent} onChange={event => setProfile({ ...profile, profileConsent: event.target.checked })} /><span><strong>Mémoire de service</strong><small>Autoriser les équipes à retrouver vos préférences.</small></span></label><label><input type="checkbox" checked={profile.marketingConsent} onChange={event => setProfile({ ...profile, marketingConsent: event.target.checked })} /><span><strong>Offres personnalisées</strong><small>Recevoir uniquement les attentions qui vous correspondent.</small></span></label></div><div className="sartal-low-data"><WifiOff size={19} /><span><strong>Mode réseau faible</strong><small>Allège les images et garde les actions essentielles disponibles · {queuedOfflineActions.length} action(s) à synchroniser.</small></span><div><button className={customer.lowBandwidthMode ? 'active' : ''} onClick={() => { toggleLowBandwidthMode(customer.id, !customer.lowBandwidthMode); onMessage(!customer.lowBandwidthMode ? 'Mode léger activé.' : 'Mode complet réactivé.'); }}>{customer.lowBandwidthMode ? 'Activé' : 'Activer'}</button>{queuedOfflineActions.length > 0 && <button onClick={() => { const count = syncSartalOfflineActions(); onMessage(`${count} action(s) synchronisée(s).`); }}>Synchroniser</button>}</div></div><button className="btn btn-primary" onClick={saveProfile}>Enregistrer mes choix</button></div>
    </section>}

    {tab === 'wallet' && <section className="sartal-wallet-layout">
      <div className="sartal-wallet-card"><span>SÁRTAL TERANGA</span><h2>{customer.loyaltyPoints}<small> points</small></h2><p>Niveau {customer.loyaltyTier} · utilisables dans tous vos services</p><div><TicketCheck size={20} /><span><strong>{Math.floor(customer.loyaltyPoints / 10) * 10} FCFA</strong><small>de valeur avantage indicative</small></span></div></div>
      <div className="sartal-reward-list"><header><Gift size={21} /><div><h2>Mes attentions disponibles</h2><p>Choisissez quand utiliser vos points.</p></div></header>{[{ points: 500, label: 'Livraison offerte' }, { points: 1000, label: 'Attention restaurant de 5 000 FCFA' }, { points: 1500, label: 'Départ tardif selon disponibilité' }].map(reward => <article key={reward.points}><div><strong>{reward.label}</strong><span>{reward.points} points</span></div><button disabled={customer.loyaltyPoints < reward.points} onClick={() => { try { redeemSartalPoints(customer.id, reward.points, reward.label); onMessage(`${reward.label} ajouté à votre portefeuille.`); } catch (error) { onMessage(error instanceof Error ? error.message : 'Avantage indisponible'); } }}>Utiliser</button></article>)}{household && <section className="sartal-shared-account"><Users size={19} /><div><strong>{household.name}</strong><small>{household.sharedPoints} points partagés · {household.memberCustomerIds.length} membres</small></div><button disabled={household.sharedPoints < 500} onClick={() => { try { transferSartalHouseholdPoints(household.id, customer.id, 500); onMessage('500 points famille transférés dans votre portefeuille.'); } catch (error) { onMessage(error instanceof Error ? error.message : 'Transfert indisponible'); } }}>Recevoir 500</button></section>}{corporateAccount && <section className="sartal-shared-account corporate"><Building2 size={19} /><div><strong>{corporateAccount.name}</strong><small>{formatFCFA(corporateAccount.monthlyLimit - corporateAccount.currentBalance)} encore disponible ce mois</small></div><b>Compte entreprise</b></section>}</div>
      <div className="sartal-wallet-history"><h3>Mouvements récents</h3>{loyalty.map(item => <article key={item.id}><span className={item.points > 0 ? 'plus' : 'minus'}>{item.points > 0 ? '+' : ''}{item.points}</span><div><strong>{item.label}</strong><small>{formatMoment(item.date)}</small></div></article>)}</div>
    </section>}

    {tab === 'history' && <section className="sartal-history-layout">
      <div className="sartal-story"><header><History size={21} /><div><h2>Votre histoire Sártal</h2><p>Une seule chronologie, sans mélanger les responsabilités des services.</p></div></header>{timeline.map(item => <article className={item.tone} key={`${item.id}-${item.date}`}><span>{item.icon}</span><div><strong>{item.title}</strong><p>{item.detail}</p><small>{formatMoment(item.date)}</small></div></article>)}</div>
      <aside className="sartal-experience-recap"><ReceiptText size={24} /><span>DERNIÈRE EXPÉRIENCE</span><h2>{deliveryOrder ? 'Votre panier épicerie' : restaurantOrder ? 'Votre moment à La Terrasse' : 'Bienvenue chez Sártal'}</h2>{deliveryOrder ? <><p>{deliveryOrder.items.length} produit(s) · livraison {deliveryOrder.status}</p><strong>{formatFCFA(deliveryOrder.items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0) + deliveryOrder.deliveryFee)}</strong><button onClick={() => { const id = reorderDeliveryOrder(deliveryOrder.id); onMessage(`Commande ${id} recréée à partir de votre historique.`); }}>Recommander <ArrowRight size={15} /></button></> : restaurantOrder ? <><p>{restaurantOrder.items.length} ligne(s) · {restaurantOrder.status}</p><strong>{formatFCFA(restaurantOrder.total)}</strong><button onClick={onOpenRestaurant}>Voir le détail <ArrowRight size={15} /></button></> : <button onClick={onOpenRestaurant}>Découvrir le restaurant</button>}<div className="sartal-recap-rating"><span>Votre avis compte</span><div>{[1, 2, 3, 4, 5].map(score => <Star key={score} size={17} className={score <= (feedback[0]?.score || 0) ? 'active' : ''} />)}</div><small>{feedback[0]?.recoveryStatus === 'open' ? `${feedback[0].assignedTo} suit personnellement votre retour.` : feedback[0]?.solution || 'Partagez votre expérience depuis le service concerné.'}</small></div></aside>
    </section>}
  </section>;
};

export default SartalClientHub;
