import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarHeart,
  CheckCircle2,
  Gift,
  HeartHandshake,
  Mail,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRoundSearch,
  UsersRound
} from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { SartalCustomerMessage } from '../types';

type SegmentId = 'all' | 'signature' | 'inactive' | 'birthday' | 'restaurant' | 'delivery';

const SEGMENTS: Array<{ id: SegmentId; label: string; detail: string }> = [
  { id: 'all', label: 'Tous les consentants', detail: 'Base marketing active' },
  { id: 'signature', label: 'Clients Signature', detail: 'Forte valeur et fidélité' },
  { id: 'inactive', label: 'À réactiver', detail: 'Trois visites ou moins' },
  { id: 'birthday', label: 'Anniversaires', detail: 'Ce mois-ci' },
  { id: 'restaurant', label: 'Restaurant', detail: 'Ont déjà commandé à table' },
  { id: 'delivery', label: 'Livraison', detail: 'Ont déjà commandé en ligne' }
];

const formatFCFA = (amount: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} FCFA`;

interface CustomerGrowthCenterProps {
  state: StockState;
}

export const CustomerGrowthCenter: React.FC<CustomerGrowthCenterProps> = ({ state }) => {
  const { db } = state;
  const [segment, setSegment] = useState<SegmentId>('all');
  const [query, setQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(db.sartalCustomers[0]?.id || '');
  const [campaignName, setCampaignName] = useState('Invitation Teranga');
  const [campaignMessage, setCampaignMessage] = useState('Bonjour, une attention Sártal vous attend lors de votre prochaine visite.');
  const [campaignChannel, setCampaignChannel] = useState<NonNullable<SartalCustomerMessage['channel']>>('whatsapp');
  const [campaignContext, setCampaignContext] = useState<'restaurant' | 'delivery'>('restaurant');
  const [campaignPoints, setCampaignPoints] = useState('0');
  const [notice, setNotice] = useState('');
  const currentMonth = new Date().getMonth() + 1;
  const matchesSegment = (customerId: string, segmentId = segment) => {
    const customer = db.sartalCustomers.find(item => item.id === customerId);
    if (!customer) return false;
    if (segmentId === 'signature') return customer.loyaltyTier === 'signature';
    if (segmentId === 'inactive') return customer.visits <= 3;
    if (segmentId === 'birthday') return Number(customer.birthday?.slice(5, 7)) === currentMonth;
    if (segmentId === 'restaurant') return db.restaurantGuestOrders.some(order => order.customerId === customer.id);
    if (segmentId === 'delivery') return db.deliveryOrders.some(order => order.customerId === customer.id);
    return true;
  };
  const filteredCustomers = db.sartalCustomers.filter(customer => matchesSegment(customer.id) && `${customer.fullName} ${customer.phone} ${customer.email || ''} ${customer.loyaltyTier}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selectedCustomer = db.sartalCustomers.find(item => item.id === selectedCustomerId) || filteredCustomers[0] || db.sartalCustomers[0];
  const consentedCustomers = db.sartalCustomers.filter(customer => customer.profileConsent && customer.marketingConsent && !customer.guestSession);
  const eligibleCampaignCount = consentedCustomers.filter(customer => matchesSegment(customer.id)).length;
  const openFeedback = db.sartalCustomerFeedback.filter(item => item.recoveryStatus === 'open');
  const averageSpend = db.sartalCustomers.length ? db.sartalCustomers.reduce((sum, customer) => sum + customer.totalSpend, 0) / db.sartalCustomers.length : 0;
  const messages = selectedCustomer ? db.sartalCustomerMessages.filter(item => item.customerId === selectedCustomer.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt)) : [];
  const customerTimeline = useMemo(() => {
    if (!selectedCustomer) return [];
    const items = [
      ...db.restaurantGuestOrders.filter(order => order.customerId === selectedCustomer.id).map(order => ({ id: order.id, date: order.updatedAt, type: 'Restaurant', label: order.tableNumber ? `Table ${order.tableNumber}` : order.id, value: order.total })),
      ...db.deliveryOrders.filter(order => order.customerId === selectedCustomer.id).map(order => ({ id: order.id, date: order.updatedAt, type: 'Livraison', label: `${order.id} · ${order.status}`, value: order.items.reduce((sum, item) => sum + item.quantity * item.salePrice, 0) + order.deliveryFee })),
      ...db.sartalLoyaltyTransactions.filter(item => item.customerId === selectedCustomer.id).map(item => ({ id: item.id, date: item.date, type: 'Fidélité', label: item.label, value: item.points }))
    ];
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [db.deliveryOrders, db.restaurantGuestOrders, db.sartalLoyaltyTransactions, selectedCustomer]);

  const execute = (action: () => unknown, success: string) => {
    try {
      const result = action();
      setNotice(typeof result === 'number' ? `${success} ${result} destinataire(s).` : success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Action impossible');
    }
  };

  return <section className="growth-center-page">
    <header className="growth-hero"><div><span>CRM, FIDÉLITÉ & RELATION CLIENT</span><h1>Reconnaître le client avant de lui parler</h1><p>Une vue consentie des préférences, visites, achats, messages et attentions de fidélité.</p></div><div><article><UsersRound size={20} /><span><small>Profils consentants</small><strong>{consentedCustomers.length}</strong></span></article><article><HeartHandshake size={20} /><span><small>Reprises ouvertes</small><strong>{openFeedback.length}</strong></span></article></div></header>

    <section className="growth-kpis"><article><TrendingUp size={20} /><span><small>Dépense moyenne</small><strong>{formatFCFA(averageSpend)}</strong><em>Sur tous les parcours</em></span></article><article><Sparkles size={20} /><span><small>Clients Signature</small><strong>{db.sartalCustomers.filter(item => item.loyaltyTier === 'signature').length}</strong><em>Segment haute fidélité</em></span></article><article><Gift size={20} /><span><small>Points en circulation</small><strong>{new Intl.NumberFormat('fr-FR').format(db.sartalCustomers.reduce((sum, item) => sum + item.loyaltyPoints, 0))}</strong><em>Solde disponible</em></span></article><article><CalendarHeart size={20} /><span><small>Anniversaires du mois</small><strong>{db.sartalCustomers.filter(item => Number(item.birthday?.slice(5, 7)) === currentMonth).length}</strong><em>Attention personnalisable</em></span></article></section>

    <nav className="growth-segments">{SEGMENTS.map(item => <button className={segment === item.id ? 'active' : ''} key={item.id} onClick={() => setSegment(item.id)}><strong>{item.label}</strong><small>{item.detail}</small><b>{db.sartalCustomers.filter(customer => matchesSegment(customer.id, item.id)).length}</b></button>)}</nav>

    <div className="growth-main-grid"><section className="growth-directory"><header><div><UserRoundSearch size={20} /><span><strong>Répertoire client</strong><small>{filteredCustomers.length} profil(s) dans ce segment</small></span></div><label><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, téléphone, niveau..." /></label></header><div>{filteredCustomers.map(customer => <button className={selectedCustomer?.id === customer.id ? 'active' : ''} key={customer.id} onClick={() => setSelectedCustomerId(customer.id)}><span className="growth-avatar">{customer.fullName.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{customer.fullName}</strong><small>{customer.phone} · {customer.visits} visite(s)</small><em>{customer.preferences || 'Préférences à enrichir'}</em></div><span className={customer.loyaltyTier}>{customer.loyaltyTier}</span><b>{new Intl.NumberFormat('fr-FR').format(customer.loyaltyPoints)} pts</b></button>)}{filteredCustomers.length === 0 && <div className="growth-empty"><Search size={28} /><strong>Aucun client dans ce segment</strong></div>}</div></section>{selectedCustomer && <aside className="growth-customer-card"><header><span className="growth-avatar">{selectedCustomer.fullName.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><small>{selectedCustomer.loyaltyTier.toUpperCase()}</small><h2>{selectedCustomer.fullName}</h2><p>{selectedCustomer.phone} · {selectedCustomer.preferredChannel || 'canal à confirmer'}</p></div></header><div className="growth-customer-flags">{selectedCustomer.allergies && <span className="alert"><AlertCircle size={14} /> Allergie {selectedCustomer.allergies}</span>}<span><ShieldCheck size={14} /> Profil {selectedCustomer.profileConsent ? 'consenti' : 'limité'}</span><span className={selectedCustomer.marketingConsent ? 'ok' : 'muted'}><Mail size={14} /> Marketing {selectedCustomer.marketingConsent ? 'autorisé' : 'refusé'}</span></div><dl><div><dt>Dépense cumulée</dt><dd>{formatFCFA(selectedCustomer.totalSpend)}</dd></div><div><dt>Solde fidélité</dt><dd>{new Intl.NumberFormat('fr-FR').format(selectedCustomer.loyaltyPoints)} pts</dd></div><div><dt>Préférence</dt><dd>{selectedCustomer.preferences || 'Non renseignée'}</dd></div></dl><section className="growth-consent-controls"><button className={selectedCustomer.marketingConsent ? 'active' : ''} onClick={() => execute(() => state.updateSartalCustomerProfile(selectedCustomer.id, { marketingConsent: !selectedCustomer.marketingConsent }), 'Préférence marketing mise à jour avec traçabilité.') }><span><strong>Communications personnalisées</strong><small>Respecte le choix explicite du client</small></span><i /></button></section><section className="growth-timeline"><header><strong>Dernières interactions</strong><small>{messages.length} message(s) conservé(s)</small></header>{customerTimeline.map(item => <article key={`${item.type}-${item.id}`}><i /><span><strong>{item.type}</strong><small>{item.label}</small></span><b>{item.type === 'Fidélité' ? `${item.value > 0 ? '+' : ''}${item.value} pts` : formatFCFA(item.value)}</b><time>{new Date(item.date).toLocaleDateString('fr-FR')}</time></article>)}</section></aside>}</div>

    <div className="growth-actions-grid"><section className="growth-campaign"><header><Send size={21} /><div><span>CAMPAGNE CONSENTIE</span><h2>Créer une attention utile</h2><p>Seuls les clients ayant autorisé les communications seront contactés.</p></div><b>{eligibleCampaignCount} destinataire(s)</b></header><div><label>Nom de campagne<input value={campaignName} onChange={event => setCampaignName(event.target.value)} /></label><label>Canal<select value={campaignChannel} onChange={event => setCampaignChannel(event.target.value as NonNullable<SartalCustomerMessage['channel']>)}><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">E-mail</option><option value="portal">Portail client</option></select></label><label>Parcours<select value={campaignContext} onChange={event => setCampaignContext(event.target.value as 'restaurant' | 'delivery')}><option value="restaurant">Restaurant</option><option value="delivery">Vente en ligne</option></select></label><label>Bonus fidélité<input inputMode="numeric" value={campaignPoints} onChange={event => setCampaignPoints(event.target.value.replace(/\D/g, ''))} /></label><label className="wide">Message<textarea value={campaignMessage} onChange={event => setCampaignMessage(event.target.value)} /></label></div><footer><span><ShieldCheck size={16} /> Segment : {SEGMENTS.find(item => item.id === segment)?.label}</span><button disabled={!campaignName.trim() || !campaignMessage.trim() || eligibleCampaignCount === 0} onClick={() => execute(() => state.launchSartalCampaign({ name: campaignName, segment, context: campaignContext, channel: campaignChannel, content: campaignMessage, bonusPoints: Number(campaignPoints) || 0, actorName: `${db.currentUser.name} · Relation client` }), 'Campagne envoyée à') }><Send size={17} /> Envoyer la campagne</button></footer>{notice && <p className="growth-notice">{notice}</p>}</section><aside className="growth-recovery"><header><HeartHandshake size={20} /><div><strong>Reprises prioritaires</strong><small>Transformer une insatisfaction en engagement tenu</small></div><b>{openFeedback.length}</b></header>{openFeedback.slice(0, 6).map(feedback => { const customer = db.sartalCustomers.find(item => item.id === feedback.customerId); return <article key={feedback.id}><span>{feedback.score}/5</span><div><strong>{customer?.fullName || 'Client'}</strong><p>{feedback.note || 'Retour sans commentaire'}</p><small>{feedback.context} · {feedback.assignedTo || 'À affecter'}</small></div><button onClick={() => execute(() => state.resolveSartalCustomerFeedback(feedback.id, 'Client rappelé, solution confirmée et suivi planifié.', 250), 'Reprise clôturée et 250 points ajoutés.') }><CheckCircle2 size={15} /> Résoudre</button></article>; })}{openFeedback.length === 0 && <div className="growth-empty"><CheckCircle2 size={28} /><strong>Aucune reprise ouverte</strong></div>}</aside></div>
  </section>;
};

export default CustomerGrowthCenter;
