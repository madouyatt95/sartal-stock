import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  BellRing,
  Building2,
  CalendarCheck,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Copy,
  ExternalLink,
  Fingerprint,
  KeyRound,
  Languages,
  MapPin,
  MessageCircle,
  MoonStar,
  PackageCheck,
  ReceiptText,
  Send,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  UserPlus,
  UserCheck,
  Users,
  UtensilsCrossed,
  WalletCards,
  WifiOff,
  Warehouse
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { PAYMENT_TYPE_LABELS, PMSGuest, PMSReservation, PMSServiceRequest } from '../types';
import { buildPMSUnifiedJourney, PMSJourneyEventType } from '../utils/pmsUnifiedJourney';

interface PMSPanelProps { state: StockState; }
type PMSWorkspaceTab = 'dashboard' | 'planning' | 'reservations' | 'rooms' | 'guests' | 'folios' | 'housekeeping' | 'audit' | 'reports' | 'settings';
type PMSWorkspaceRole = 'reception' | 'manager' | 'housekeeping' | 'night';
interface PMSSignatureWorkspaceProps extends PMSPanelProps {
  onNavigate: (tab: PMSWorkspaceTab) => void;
  canNavigate?: (tab: PMSWorkspaceTab) => boolean;
  initialRole?: PMSWorkspaceRole;
  allowedRoles?: readonly PMSWorkspaceRole[];
}

const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;
const formatDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export const PMSSignatureWorkspace: React.FC<PMSSignatureWorkspaceProps> = ({ state, onNavigate, canNavigate, initialRole = 'reception', allowedRoles }) => {
  const { db } = state;
  const [role, setRole] = useState<PMSWorkspaceRole>(initialRole);
  const today = db.pmsSettings.businessDate;
  const arrivals = db.pmsReservations.filter(item => item.arrivalDate === today && item.status === 'confirmed');
  const departures = db.pmsReservations.filter(item => item.departureDate === today && item.status === 'checked_in');
  const unassigned = db.pmsReservations.filter(item => !item.roomId && item.status === 'confirmed');
  const dirty = db.pmsRooms.filter(item => ['dirty', 'in_progress'].includes(item.housekeepingStatus));
  const pendingCharges = db.pmsFolios.flatMap(item => item.charges).filter(item => item.status === 'pending');
  const openBalance = db.pmsFolios.reduce((sum, folio) => sum + folio.charges.reduce((total, item) => total + item.amount, 0) - folio.payments.reduce((total, item) => total + item.amount, 0), 0);
  const occupied = db.pmsRooms.filter(item => item.status === 'occupied').length;
  const occupancy = Math.round((occupied / Math.max(1, db.pmsRooms.length)) * 100);

  const workspaces = {
    reception: {
      label: 'Réception', icon: <UserCheck size={18} />, promise: 'Accueillir sans attente et ne laisser aucun séjour incomplet.',
      highlight: `${arrivals.length} arrivée(s) à orchestrer`, highlightDetail: `${unassigned.length} sans chambre · ${departures.length} départ(s)`, target: 'dashboard' as const,
      actions: [
        { label: 'Arrivées à accueillir', count: arrivals.length, detail: 'Identité, garantie, chambre et clé', tab: 'dashboard' as const, tone: 'arrival' },
        { label: 'Chambres à attribuer', count: unassigned.length, detail: 'Catégorie vendue, numéro à choisir', tab: 'planning' as const, tone: 'warning' },
        { label: 'Soldes clients ouverts', count: db.pmsFolios.filter(folio => folio.status === 'open' && folio.charges.reduce((sum, item) => sum + item.amount, 0) > folio.payments.reduce((sum, item) => sum + item.amount, 0)).length, detail: formatFCFA(Math.max(0, openBalance)), tab: 'folios' as const, tone: 'money' }
      ]
    },
    manager: {
      label: 'Direction', icon: <Building2 size={18} />, promise: 'Piloter revenus, qualité et risques depuis une seule lecture.',
      highlight: `${occupancy}% d’occupation`, highlightDetail: `${occupied}/${db.pmsRooms.length} chambres · ${formatFCFA(openBalance)} à encaisser`, target: 'reports' as const,
      actions: [
        { label: 'Performance du jour', count: occupancy, suffix: '%', detail: 'Occupation, ADR et RevPAR', tab: 'reports' as const, tone: 'arrival' },
        { label: 'Consommations à rapprocher', count: pendingCharges.length, detail: 'POS, folio et stock à contrôler', tab: 'folios' as const, tone: 'warning' },
        { label: 'Alertes techniques', count: db.pmsMaintenanceTickets.filter(item => !['resolved', 'verified'].includes(item.status)).length, detail: 'Chambres et équipements indisponibles', tab: 'housekeeping' as const, tone: 'danger' }
      ]
    },
    housekeeping: {
      label: 'Gouvernante', icon: <Sparkles size={18} />, promise: 'Prioriser les chambres qui débloquent une arrivée ou une vente.',
      highlight: `${dirty.length} chambre(s) à préparer`, highlightDetail: `${db.pmsHousekeepingTasks.filter(item => item.status === 'completed').length} en attente de contrôle`, target: 'housekeeping' as const,
      actions: [
        { label: 'Nettoyages prioritaires', count: db.pmsHousekeepingTasks.filter(item => item.priority === 'urgent' && item.status !== 'inspected').length, detail: 'Arrivées proches et changements de chambre', tab: 'housekeeping' as const, tone: 'danger' },
        { label: 'Chambres à contrôler', count: db.pmsHousekeepingTasks.filter(item => item.status === 'completed').length, detail: 'Dernière validation avant remise en vente', tab: 'housekeeping' as const, tone: 'warning' },
        { label: 'Maintenance ouverte', count: db.pmsMaintenanceTickets.filter(item => ['open', 'in_progress'].includes(item.status)).length, detail: 'Suivi des interventions techniques', tab: 'housekeeping' as const, tone: 'money' }
      ]
    },
    night: {
      label: 'Veilleur', icon: <MoonStar size={18} />, promise: 'Clôturer une journée juste, rapprochée et totalement traçable.',
      highlight: pendingCharges.length ? `${pendingCharges.length} blocage(s) avant clôture` : 'Clôture prête', highlightDetail: `${db.pmsFolios.filter(item => item.status === 'open').length} folio(s) ouvert(s)`, target: 'audit' as const,
      actions: [
        { label: 'Tickets POS en attente', count: pendingCharges.length, detail: 'Rapprocher avant la clôture', tab: 'folios' as const, tone: 'warning' },
        { label: 'Départs non finalisés', count: departures.length, detail: 'Solde, facture et libération chambre', tab: 'reservations' as const, tone: 'danger' },
        { label: 'Contrôles de clôture', count: 4, detail: 'Folios, chambres, POS et journée', tab: 'audit' as const, tone: 'arrival' }
      ]
    }
  };
  const current = workspaces[role];

  return (
    <section className={`pms-signature-workspace role-${role}`}>
      <header className="pms-signature-header">
        <div><span className="pms-eyebrow"><Fingerprint size={15} /> Poste Sártal</span><h2>{current.label}, voici l’essentiel</h2><p>{current.promise}</p></div>
        {(allowedRoles?.length ?? 4) > 1 && <div className="pms-signature-role-switch">{(Object.keys(workspaces) as PMSWorkspaceRole[]).filter(item => !allowedRoles || allowedRoles.includes(item)).map(item => <button key={item} className={role === item ? 'active' : ''} onClick={() => setRole(item)}>{workspaces[item].icon}<span>{workspaces[item].label}</span></button>)}</div>}
      </header>
      <div className="pms-signature-body">
        {(canNavigate?.(current.target) ?? true) && <button className="pms-signature-highlight" onClick={() => onNavigate(current.target)}><span>Priorité maintenant</span><strong>{current.highlight}</strong><small>{current.highlightDetail}</small><b>Agir maintenant <ArrowRight size={16} /></b></button>}
        <div className="pms-signature-actions">{current.actions.filter(action => canNavigate?.(action.tab) ?? true).map(action => <button key={action.label} className={action.tone} onClick={() => onNavigate(action.tab)}><div><strong>{action.count}{'suffix' in action ? action.suffix : ''}</strong><ChevronRight size={18} /></div><span>{action.label}</span><small>{action.detail}</small></button>)}</div>
      </div>
      <footer><span><Clock3 size={15} /> Journée du {formatDate(today)}</span><span><ShieldCheck size={15} /> Données synchronisées entre les équipes</span><span><BellRing size={15} /> {db.pmsServiceRequests.filter(item => item.status !== 'completed').length} demande(s) active(s)</span></footer>
    </section>
  );
};

const journeyIcons: Record<PMSJourneyEventType, React.ReactNode> = {
  reservation: <CalendarCheck size={17} />, room: <BedDouble size={17} />, folio: <ReceiptText size={17} />, pos: <ShoppingBag size={17} />,
  stock: <Warehouse size={17} />, payment: <WalletCards size={17} />, service: <PackageCheck size={17} />, audit: <ShieldCheck size={17} />
};

export const PMSUnifiedJourneyPanel: React.FC<PMSPanelProps> = ({ state }) => {
  const { db } = state;
  const eligible = db.pmsReservations.filter(item => db.pmsFolios.some(folio => folio.reservationId === item.id));
  const preferred = eligible.find(item => db.externalSales.some(sale => db.pmsFolios.find(folio => folio.reservationId === item.id)?.id === sale.paymentContext.folioId));
  const [reservationId, setReservationId] = useState(preferred?.id || eligible[0]?.id || db.pmsReservations[0]?.id || '');
  const reservation = db.pmsReservations.find(item => item.id === reservationId);
  const guest = db.pmsGuests.find(item => item.id === reservation?.guestId);
  const room = db.pmsRooms.find(item => item.id === reservation?.roomId);
  const journey = useMemo(() => buildPMSUnifiedJourney(db, reservationId), [db, reservationId]);

  return (
    <section className="card pms-section-card pms-unified-journey">
      <div className="pms-section-header"><div><span className="pms-eyebrow"><Fingerprint size={15} /> Vérité métier unique</span><h2>Un séjour, une seule histoire</h2><p>Chaque opération garde la même référence depuis la chambre jusqu’au dépôt.</p></div><select className="form-control" value={reservationId} onChange={event => setReservationId(event.target.value)}>{db.pmsReservations.map(item => <option key={item.id} value={item.id}>{item.confirmationNumber} · {db.pmsGuests.find(guestItem => guestItem.id === item.guestId)?.fullName}</option>)}</select></div>
      <div className="pms-truth-summary">
        <div className={`pms-truth-score ${journey.score === 100 ? 'perfect' : ''}`}><strong>{journey.score}%</strong><span>Cohérence du séjour</span><small>{journey.checks.filter(item => item.passed).length}/{journey.checks.length} contrôles validés</small></div>
        <div className="pms-truth-identity"><span>{reservation?.confirmationNumber}</span><h3>{guest?.fullName}</h3><p>{room ? `Chambre ${room.roomNumber} · ${room.roomType}` : reservation?.requestedRoomType || 'Chambre à attribuer'}</p><div><b>{journey.linkedSales} ticket(s) POS</b><b>{journey.linkedMovements} mouvement(s) stock</b></div></div>
        <div className="pms-truth-chain"><div><CalendarCheck size={18} /><span>Réservation</span></div><i /><div><ReceiptText size={18} /><span>Folio</span></div><i /><div><ShoppingBag size={18} /><span>POS</span></div><i /><div><Warehouse size={18} /><span>Stock</span></div></div>
      </div>
      <div className="pms-truth-layout">
        <div className="pms-truth-checks">{journey.checks.map(check => <article className={check.passed ? 'passed' : 'warning'} key={check.id}><span>{check.passed ? <CheckCircle size={18} /> : <BellRing size={18} />}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div></article>)}</div>
        <div className="pms-truth-timeline">{journey.events.slice(0, 12).map(event => <article key={event.id}><span className={`event-${event.type}`}>{journeyIcons[event.type]}</span><div><header><strong>{event.title}</strong>{typeof event.amount === 'number' && <b>{formatFCFA(event.amount)}</b>}</header><p>{event.detail}</p><small>{event.source} · {new Date(event.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>{event.correlationId && <code>{event.correlationId}</code>}</div></article>)}</div>
      </div>
    </section>
  );
};

const portalFormFor = (db: StockState['db'], reservation?: PMSReservation) => {
  const guest = db.pmsGuests.find(item => item.id === reservation?.guestId);
  return {
    phone: guest?.phone || '', email: guest?.email || '', nationality: guest?.nationality || '', preferences: guest?.preferences || '',
    documentType: guest?.documentType || 'identity_card' as const, documentNumber: guest?.documentNumber || '', estimatedArrivalTime: reservation?.estimatedArrivalTime || db.pmsSettings.checkInTime
  };
};

interface PMSGuestAccessGatewayProps {
  db: StockState['db'];
  reservation: PMSReservation;
  guest: PMSGuest;
  onAuthenticated: () => void;
}

const PMSGuestAccessGateway: React.FC<PMSGuestAccessGatewayProps> = ({ db, reservation, guest, onAuthenticated }) => {
  const [step, setStep] = useState<'identity' | 'verification'>('identity');
  const [phone, setPhone] = useState('+221 ');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const normalizedGuestPhone = guest.phone.replace(/\D/g, '').slice(-9);

  const sendCode = () => {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
    if (normalizedPhone.length !== 9 || normalizedPhone !== normalizedGuestPhone) {
      setError('Ce numéro ne correspond pas à la réservation. Vérifiez-le ou contactez la réception.');
      return;
    }
    setGeneratedCode(String(Math.floor(1000 + Math.random() * 9000)));
    setCode('');
    setError('');
    setStep('verification');
  };

  const verifyCode = () => {
    if (code !== generatedCode) {
      setError('Le code saisi ne correspond pas au code reçu.');
      return;
    }
    onAuthenticated();
  };

  return <main className="pms-guest-access-gateway">
    <section className="pms-guest-access-visual">
      <img src="./pms-room-categories.jpg" alt="Chambre préparée pour le séjour" />
      <div><span><BedDouble size={17} /> {db.pmsSettings.hotelName}</span><h1>Votre séjour commence ici</h1><p>Préparez votre arrivée, suivez votre chambre, échangez avec la réception et gardez la main sur vos préférences.</p></div>
    </section>
    <section className="pms-guest-access-panel">
      <header><img src="./brand-mark.svg" alt="Sártal" /><div><span>MON SÉJOUR</span><strong>Réservation ••••{reservation.confirmationNumber.slice(-4)}</strong></div></header>
      {step === 'identity' ? <div className="pms-guest-access-form">
        <div className="pms-guest-access-promise"><ShieldCheck size={20} /><span><strong>Accès privé</strong><small>Confirmez le téléphone utilisé lors de la réservation. Aucun mot de passe à mémoriser.</small></span></div>
        <label>Numéro de téléphone<input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+221 77 000 00 00" /></label>
        {error && <p className="pms-guest-access-error">{error}</p>}
        <button className="pms-guest-access-primary" onClick={sendCode}><Smartphone size={17} /> Recevoir mon code <ArrowRight size={17} /></button>
        <small>Les informations du séjour ne sont affichées qu’après cette vérification.</small>
      </div> : <div className="pms-guest-access-form verification">
        <button className="pms-guest-access-back" onClick={() => { setStep('identity'); setError(''); }}>Modifier le numéro</button>
        <div className="pms-guest-access-code"><Smartphone size={23} /><span>Code reçu</span><strong>{generatedCode}</strong><small>Valable pendant 5 minutes</small></div>
        <label>Code à 4 chiffres<input autoFocus inputMode="numeric" maxLength={4} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" /></label>
        {error && <p className="pms-guest-access-error">{error}</p>}
        <button className="pms-guest-access-primary" disabled={code.length !== 4} onClick={verifyCode}><ShieldCheck size={17} /> Ouvrir mon séjour <ArrowRight size={17} /></button>
      </div>}
      <footer><MessageCircle size={15} /> Besoin d’aide ? {db.sartalBrandSettings.supportPhone}</footer>
    </section>
  </main>;
};

type GuestPortalTab = 'home' | 'services' | 'concierge' | 'stay' | 'profile' | 'departure';

export const PMSGuestExperiencePortal: React.FC<PMSPanelProps & { initialReservationId?: string; standalone?: boolean; requireAccess?: boolean }> = ({ state, initialReservationId, standalone = false, requireAccess = false }) => {
  const {
    db, completePMSPreCheckIn, addPMSServiceRequest, addPMSReservationPayment, processSale,
    updatePMSGuestExperienceProfile, sendPMSGuestMessage, addPMSStayCompanion, sharePMSDoorKey,
    submitPMSGuestFeedback, completePMSGuestCheckout, requestPMSReturnStay
  } = state;
  const active = db.pmsReservations.filter(item => ['confirmed', 'checked_in', 'checked_out'].includes(item.status));
  const initial = active.find(item => item.id === initialReservationId) || active.find(item => item.status === 'confirmed') || active[0];
  const initialGuest = initial ? db.pmsGuests.find(item => item.id === initial.guestId) : undefined;
  const [reservationId, setReservationId] = useState(initial?.id || '');
  const [tab, setTab] = useState<GuestPortalTab>('home');
  const [accessGranted, setAccessGranted] = useState(!requireAccess);
  const reservation = db.pmsReservations.find(item => item.id === reservationId);
  const guest = db.pmsGuests.find(item => item.id === reservation?.guestId);
  const room = db.pmsRooms.find(item => item.id === reservation?.roomId);
  const folio = db.pmsFolios.find(item => item.reservationId === reservationId && item.status === 'open');
  const services = db.pmsServiceRequests.filter(item => item.reservationId === reservationId);
  const activeKey = db.pmsDoorKeys.find(item => item.reservationId === reservationId && item.status === 'active');
  const conversations = db.pmsGuestMessages.filter(item => item.reservationId === reservationId).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const companions = db.pmsStayCompanions.filter(item => item.reservationId === reservationId);
  const feedback = db.pmsGuestFeedback.find(item => item.reservationId === reservationId && item.stage === (reservation?.status === 'checked_out' ? 'post_stay' : 'in_stay'));
  const [form, setForm] = useState(() => portalFormFor(db, initial));
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money'>('wave');
  const folioBalance = folio ? folio.charges.reduce((sum, item) => sum + item.amount, 0) - folio.payments.reduce((sum, item) => sum + item.amount, 0) : 0;
  const [paymentAmount, setPaymentAmount] = useState(25000);
  const [message, setMessage] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [feedbackScore, setFeedbackScore] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [companionForm, setCompanionForm] = useState({ fullName: '', phone: '', relationship: 'Accompagnant' });
  const [language, setLanguage] = useState<'fr' | 'en' | 'wo'>(initialGuest?.preferredLanguage || 'fr');
  const [lowData, setLowData] = useState(false);
  const [profileConsent, setProfileConsent] = useState(initialGuest?.profileConsent ?? true);
  const [allergies, setAllergies] = useState(initialGuest?.allergies || '');
  const [pillowPreference, setPillowPreference] = useState<'soft' | 'firm' | 'none'>(initialGuest?.pillowPreference || 'none');
  const [roomTemperature, setRoomTemperature] = useState<NonNullable<PMSGuest['roomTemperature']>>(initialGuest?.roomTemperature || 'balanced');
  const [roomLocationPreference, setRoomLocationPreference] = useState<NonNullable<PMSGuest['roomLocationPreference']>>(initialGuest?.roomLocationPreference || 'quiet');
  const [housekeepingPreference, setHousekeepingPreference] = useState<NonNullable<PMSGuest['housekeepingPreference']>>(initialGuest?.housekeepingPreference || 'morning');
  const [minibarPreference, setMinibarPreference] = useState<NonNullable<PMSGuest['minibarPreference']>>(initialGuest?.minibarPreference || 'standard');
  const [communicationPreference, setCommunicationPreference] = useState<NonNullable<PMSGuest['communicationPreference']>>(initialGuest?.communicationPreference || 'whatsapp');
  const [dietaryPreferences, setDietaryPreferences] = useState(initialGuest?.dietaryPreferences || '');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState(initialGuest?.accessibilityNeeds || '');
  const [doNotDisturb, setDoNotDisturb] = useState(initialGuest?.doNotDisturb ?? false);

  const chooseReservation = (id: string) => {
    const next = db.pmsReservations.find(item => item.id === id);
    setReservationId(id);
    setForm(portalFormFor(db, next));
    const nextGuest = db.pmsGuests.find(item => item.id === next?.guestId);
    setLanguage(nextGuest?.preferredLanguage || 'fr');
    setProfileConsent(nextGuest?.profileConsent ?? true);
    setAllergies(nextGuest?.allergies || '');
    setPillowPreference(nextGuest?.pillowPreference || 'none');
    setRoomTemperature(nextGuest?.roomTemperature || 'balanced');
    setRoomLocationPreference(nextGuest?.roomLocationPreference || 'quiet');
    setHousekeepingPreference(nextGuest?.housekeepingPreference || 'morning');
    setMinibarPreference(nextGuest?.minibarPreference || 'standard');
    setCommunicationPreference(nextGuest?.communicationPreference || 'whatsapp');
    setDietaryPreferences(nextGuest?.dietaryPreferences || '');
    setAccessibilityNeeds(nextGuest?.accessibilityNeeds || '');
    setDoNotDisturb(nextGuest?.doNotDisturb ?? false);
    setTab('home');
    setMessage('');
  };
  const savePreCheckIn = () => {
    if (!reservation) return;
    completePMSPreCheckIn(reservation.id, form);
    setMessage('Pré-check-in enregistré. La réception voit immédiatement vos informations.');
  };
  const requestService = (type: PMSServiceRequest['type'], label: string, amount: number, assignedTo: string) => {
    if (!reservation) return;
    addPMSServiceRequest({ reservationId: reservation.id, roomId: reservation.roomId, type, label, priority: type === 'airport_transfer' ? 'urgent' : 'normal', scheduledAt: new Date().toISOString(), assignedTo, amount, note: 'Demande envoyée depuis le portail client.' });
    setMessage(`${label} demandé. L’équipe ${assignedTo} a été notifiée.`);
  };
  const pay = () => {
    if (!reservation || paymentAmount <= 0) return;
    const paidAmount = Math.min(paymentAmount, amountDue);
    addPMSReservationPayment(reservation.id, paidAmount, paymentMethod, `${paymentMethod === 'wave' ? 'WAVE' : 'OM'}-PORTAIL-${Date.now().toString().slice(-5)}`);
    setMessage(`${formatFCFA(paidAmount)} réglés par ${PAYMENT_TYPE_LABELS[paymentMethod]}.`);
  };
  const sendMessage = () => {
    if (!chatMessage.trim()) return;
    sendPMSGuestMessage(reservationId, chatMessage, 'portal');
    setChatMessage('');
    setMessage('Votre message a été transmis à la réception.');
  };
  const inviteCompanion = () => {
    const companionId = addPMSStayCompanion(reservationId, companionForm);
    if (activeKey) sharePMSDoorKey(activeKey.id, companionId);
    setCompanionForm({ fullName: '', phone: '', relationship: 'Accompagnant' });
    setMessage(activeKey ? 'Invitation envoyée avec un accès mobile à la chambre.' : 'Invitation envoyée. La clé pourra être partagée après le check-in.');
  };
  const saveExperienceProfile = () => {
    updatePMSGuestExperienceProfile(reservationId, {
      preferredLanguage: language, profileConsent, allergies, pillowPreference, preferences: form.preferences,
      roomTemperature, roomLocationPreference, housekeepingPreference, minibarPreference,
      communicationPreference, dietaryPreferences, accessibilityNeeds, doNotDisturb
    });
    setMessage(profileConsent ? 'Vos préférences seront retrouvées lors de votre prochain séjour.' : 'Vos préférences restent limitées à ce séjour.');
  };
  const clearExperienceProfile = () => {
    setProfileConsent(false);
    setAllergies('');
    setPillowPreference('none');
    setRoomTemperature('balanced');
    setRoomLocationPreference('quiet');
    setHousekeepingPreference('on_request');
    setMinibarPreference('standard');
    setCommunicationPreference('portal');
    setDietaryPreferences('');
    setAccessibilityNeeds('');
    setDoNotDisturb(false);
    setForm(current => ({ ...current, preferences: '' }));
    updatePMSGuestExperienceProfile(reservationId, {
      profileConsent: false, allergies: '', pillowPreference: 'none', preferences: '', roomTemperature: 'balanced',
      roomLocationPreference: 'quiet', housekeepingPreference: 'on_request', minibarPreference: 'standard',
      communicationPreference: 'portal', dietaryPreferences: '', accessibilityNeeds: '', doNotDisturb: false
    });
    setMessage('Vos préférences mémorisées ont été effacées. Les informations obligatoires du séjour restent conservées.');
  };
  const sendFeedback = () => {
    submitPMSGuestFeedback(reservationId, feedbackScore, feedbackNote, reservation?.status === 'checked_out' ? 'post_stay' : 'in_stay');
    setMessage(feedbackScore <= 3 ? 'Merci. Un responsable a été alerté et vous contactera rapidement.' : 'Merci, votre retour a été transmis à l’équipe.');
  };
  const orderRoomService = (productId: string, label: string) => {
    if (!reservation || !folio || !room) return;
    const pos = db.posList.find(item => item.id === 'pos-1');
    const pricing = db.posPricing.find(item => item.posId === pos?.id && item.productId === productId);
    if (!pos || !pricing) return;
    const reference = `ROOM-${room.roomNumber}-${Date.now().toString().slice(-5)}`;
    const result = processSale({ externalSaleId: reference, siteId: pos.siteId, posId: pos.id, items: [{ productId, quantity: 1 }], paymentContext: { type: 'room_charge', roomNumber: room.roomNumber, folioId: folio.id, amount: pricing.salePrice } });
    if (!result.success) { setMessage(result.error || 'Commande indisponible.'); return; }
    addPMSServiceRequest({ reservationId, roomId: room.id, type: 'room_service', label, priority: 'normal', scheduledAt: new Date().toISOString(), assignedTo: 'Restaurant La Terrasse', amount: pricing.salePrice, note: `Commande ${reference} depuis le portail, imputée au folio et déduite du stock.` });
    setMessage(`${label} commandé. Préparation estimée : 25 minutes.`);
  };
  const checkout = () => {
    try {
      completePMSGuestCheckout(reservationId);
      setMessage('Départ confirmé. Votre facture est disponible et l’équipe a été prévenue.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Départ impossible.');
    }
  };
  const openGuestPortal = async () => {
    const url = `${window.location.origin}${window.location.pathname}?sejour=${reservationId}`;
    await navigator.clipboard?.writeText(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!reservation || !guest) {
    return <main className="portal-unavailable">
      <section>
        <img src="./brand-mark.svg" alt="Sártal" />
        <span>{db.sartalBrandSettings.hotelAppName.toUpperCase()}</span>
        <h1>Aucun séjour actif</h1>
        <p>Votre séjour n’est pas encore disponible dans cet espace. La réception peut vérifier votre réservation et vous transmettre un nouveau lien privé.</p>
        <a href={`tel:${db.sartalBrandSettings.supportPhone.replace(/\s/g, '')}`}><MessageCircle size={17} /> Contacter l’établissement · {db.sartalBrandSettings.supportPhone}</a>
      </section>
    </main>;
  }
  if (!accessGranted) {
    return <PMSGuestAccessGateway db={db} reservation={reservation} guest={guest} onAuthenticated={() => setAccessGranted(true)} />;
  }
  const preCheckComplete = guest.preCheckInStatus === 'completed';
  const roomReady = room && ['clean', 'inspected'].includes(room.housekeepingStatus);
  const nights = Math.max(1, Math.ceil((new Date(reservation.departureDate).getTime() - new Date(reservation.arrivalDate).getTime()) / 86400000));
  const amountDue = folio ? Math.max(0, folioBalance) : Math.max(0, (reservation.nightlyRate * nights) - reservation.depositAmount);
  const phase = reservation.status === 'checked_out' ? 'after' : reservation.status === 'checked_in' ? 'stay' : 'before';
  const roomServiceItems = [
    { productId: 'prod-thieb-signature', label: 'Thieboudienne signature', detail: 'Plat complet · 35 min' },
    { productId: 'prod-yassa-poulet', label: 'Yassa poulet', detail: 'Plat complet · 30 min' },
    { productId: 'prod-jus-bissap', label: 'Jus de bissap', detail: 'Frais · 15 min' }
  ].map(item => ({ ...item, price: db.posPricing.find(price => price.posId === 'pos-1' && price.productId === item.productId)?.salePrice || 0 })).filter(item => item.price > 0);
  const portalTabs: Array<{ id: GuestPortalTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Mon séjour', icon: <BedDouble size={18} /> },
    { id: 'services', label: 'Services', icon: <Sparkles size={18} /> },
    { id: 'concierge', label: 'Conciergerie', icon: <MessageCircle size={18} /> },
    { id: 'stay', label: 'Ma chambre', icon: <KeyRound size={18} /> },
    { id: 'profile', label: 'Mes préférences', icon: <ShieldCheck size={18} /> },
    { id: 'departure', label: phase === 'after' ? 'Après-séjour' : 'Départ', icon: <ReceiptText size={18} /> }
  ];

  return (
    <section className={`pms-guest-experience ${standalone ? 'standalone' : ''} ${lowData ? 'low-data' : ''}`}>
      <div className="pms-guest-experience-heading">
        <div><span className="pms-eyebrow"><MessageCircle size={15} /> {standalone ? db.pmsSettings.hotelName : 'Aperçu du portail séjour'}</span><h2>{db.sartalBrandSettings.hotelAppName}</h2><p>Votre chambre, vos services et votre équipe au même endroit.</p></div>
        {!standalone && <div className="pms-guest-preview-tools"><select className="form-control" value={reservationId} onChange={event => chooseReservation(event.target.value)}>{active.map(item => <option key={item.id} value={item.id}>{item.confirmationNumber} · {db.pmsGuests.find(guestItem => guestItem.id === item.guestId)?.fullName}</option>)}</select><button className="btn btn-primary" onClick={openGuestPortal}><ExternalLink size={16} /> Ouvrir le portail client</button></div>}
        {standalone && <div className="pms-guest-accessibility"><label><Languages size={16} /><select value={language} onChange={event => setLanguage(event.target.value as 'fr' | 'en' | 'wo')}><option value="fr">Français</option><option value="en">English</option><option value="wo">Wolof</option></select></label><button className={lowData ? 'active' : ''} onClick={() => setLowData(value => !value)}><WifiOff size={16} /> Mode léger</button></div>}
      </div>
      <nav className="pms-guest-tabs" aria-label="Navigation du séjour">{portalTabs.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>
      <div className="pms-guest-portal-shell">
        <aside className="pms-guest-stay-card">
          <div className="pms-guest-stay-photo"><span>{phase === 'after' ? 'Merci pour votre séjour' : phase === 'stay' ? 'Séjour en cours' : 'Arrivée prochaine'}</span></div>
          <div className="pms-guest-stay-copy"><small>{db.pmsSettings.hotelName}</small><h3>Bonjour {guest.fullName.split(' ')[0]}</h3><p>{formatDate(reservation.arrivalDate)} → {formatDate(reservation.departureDate)}</p><div><span><BedDouble size={16} /> {room ? `Chambre ${room.roomNumber}` : reservation.requestedRoomType}</span><span><Users size={16} /> {reservation.adults + reservation.children} voyageur(s)</span></div></div>
          <div className="pms-guest-progress">{[
            ['Réservé', true], ['Pré-check-in', preCheckComplete], ['Chambre prête', Boolean(roomReady)], ['Clé active', Boolean(activeKey)]
          ].map(([label, done]) => <div className={done ? 'done' : ''} key={String(label)}><span>{done ? <CheckCircle size={14} /> : null}</span><small>{label}</small></div>)}</div>
          <div className="pms-guest-live-status"><span className={roomReady ? 'ready' : 'waiting'}><i />{roomReady ? 'Votre chambre est prête' : 'Préparation en cours'}</span>{activeKey && <b><KeyRound size={15} /> Clé {activeKey.code}</b>}</div>
          <div className="pms-guest-host"><span>Votre contact pendant le séjour</span><strong>Awa · Réception</strong><small>Réponse moyenne : moins de 5 min</small></div>
        </aside>

        <div className="pms-guest-portal-content">
          {tab === 'home' && <>
            <section className="pms-guest-next-action"><div><span>{phase === 'before' ? 'Avant votre arrivée' : phase === 'stay' ? 'Pour profiter de votre séjour' : 'Votre séjour continue avec nous'}</span><h3>{phase === 'before' && !preCheckComplete ? 'Complétez votre arrivée en 2 minutes' : phase === 'stay' ? 'Tout est prêt, que souhaitez-vous faire ?' : 'Facture, retour et prochain séjour'}</h3><p>{phase === 'before' ? 'Votre équipe préparera la chambre selon vos préférences.' : phase === 'stay' ? 'Commandez, écrivez-nous ou partagez votre accès.' : 'Retrouvez vos documents et vos préférences.'}</p></div><button className="btn btn-primary" onClick={() => setTab(phase === 'before' ? 'stay' : phase === 'stay' ? 'services' : 'departure')}><ArrowRight size={17} /> Continuer</button></section>
            <section className="pms-guest-moments">{[
              { label: 'Réservation confirmée', detail: reservation.confirmationNumber, done: true },
              { label: 'Pré-check-in', detail: preCheckComplete ? 'Informations vérifiées' : 'À compléter', done: preCheckComplete },
              { label: 'Chambre', detail: roomReady ? 'Prête à vous accueillir' : 'Préparation suivie en direct', done: Boolean(roomReady) },
              { label: 'Départ', detail: `${formatDate(reservation.departureDate)} avant ${db.pmsSettings.checkOutTime}`, done: phase === 'after' }
            ].map(item => <article className={item.done ? 'done' : ''} key={item.label}><span>{item.done ? <CheckCircle size={18} /> : <Clock3 size={18} />}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div></article>)}</section>
            <section className="card pms-guest-welcome"><Sparkles size={22} /><div><strong>Une attention pour vous</strong><p>{guest.preferences ? `Nous avons bien noté : ${guest.preferences}.` : 'Dites-nous ce qui rendrait votre séjour plus agréable.'}</p></div><button onClick={() => setTab('concierge')}>Écrire à Awa</button></section>
          </>}

          {tab === 'services' && <>
            <section className="card pms-guest-portal-section"><header><span><Sparkles size={19} /></span><div><h3>Services recommandés pour vous</h3><p>Disponibles maintenant et transmis directement aux équipes.</p></div></header><div className="pms-guest-service-options"><button onClick={() => requestService('airport_transfer', 'Transfert aéroport', 25000, 'Conciergerie')}><span>Transfert aéroport</span><small>Chauffeur et suivi du vol</small><strong>{formatFCFA(25000)}</strong></button><button onClick={() => requestService('breakfast', 'Petit-déjeuner', 9000, 'Restaurant')}><span>Petit-déjeuner</span><small>Selon vos préférences</small><strong>{formatFCFA(9000)}</strong></button><button onClick={() => requestService('laundry', 'Blanchisserie express', 6000, 'Service étage')}><span>Blanchisserie express</span><small>Retour le jour même</small><strong>{formatFCFA(6000)}</strong></button><button onClick={() => requestService('special_request', 'Départ tardif demandé', 0, 'Réception')}><span>Départ tardif</span><small>Selon disponibilité</small><strong>Sur demande</strong></button></div></section>
            {reservation.status === 'checked_in' && <section className="card pms-guest-portal-section"><header><span><UtensilsCrossed size={19} /></span><div><h3>Commander en chambre</h3><p>La commande rejoint le restaurant, votre folio et le stock.</p></div></header><div className="pms-room-service-menu">{roomServiceItems.map(item => <article key={item.productId}><div><strong>{item.label}</strong><small>{item.detail}</small></div><b>{formatFCFA(item.price)}</b><button onClick={() => orderRoomService(item.productId, item.label)}>Commander</button></article>)}</div></section>}
            {services.length > 0 && <section className="card pms-guest-portal-section"><header><span><PackageCheck size={19} /></span><div><h3>Suivi de mes demandes</h3><p>Une information claire à chaque étape.</p></div></header><div className="pms-guest-request-list">{services.slice(0, 6).map(service => <div key={service.id}><span><i />{service.label}</span><b>{service.status === 'completed' ? 'Terminé' : service.status === 'in_progress' ? 'En cours' : service.status === 'assigned' ? 'Confirmé' : 'Reçu'}</b></div>)}</div></section>}
          </>}

          {tab === 'concierge' && <>
            <section className="card pms-guest-chat"><header><div><span>A</span><div><strong>Awa · Votre réception</strong><small><i /> Disponible maintenant</small></div></div><b>WhatsApp + Portail</b></header><div className="pms-guest-chat-thread">{conversations.length ? conversations.map(item => <div className={item.sender} key={item.id}><span>{item.content}</span><small>{item.senderName} · {new Date(item.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></div>) : <div className="team"><span>Bonjour {guest.fullName.split(' ')[0]}, comment pouvons-nous rendre votre séjour plus agréable ?</span><small>Awa · Réception</small></div>}</div><footer><input className="form-control" placeholder="Écrivez votre demande…" value={chatMessage} onChange={event => setChatMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') sendMessage(); }} /><button onClick={sendMessage} aria-label="Envoyer"><Send size={18} /></button></footer></section>
            <section className="card pms-guest-satisfaction"><div><strong>Comment se passe votre séjour ?</strong><p>Votre réponse reste privée et nous aide à agir immédiatement.</p></div><div className="pms-guest-rating">{[1, 2, 3, 4, 5].map(score => <button key={score} className={feedbackScore >= score ? 'active' : ''} onClick={() => setFeedbackScore(score)}><Star size={20} /></button>)}</div><textarea className="form-control" placeholder="Dites-nous ce que nous pouvons améliorer…" value={feedbackNote} onChange={event => setFeedbackNote(event.target.value)} /><button className="btn btn-primary" onClick={sendFeedback} disabled={Boolean(feedback)}>Envoyer mon retour</button>{feedback && <small className="pms-feedback-received"><CheckCircle size={15} /> Retour reçu · {feedback.recoveryStatus === 'open' ? 'Un responsable vous recontacte' : 'Merci pour votre confiance'}</small>}</section>
          </>}

          {tab === 'stay' && <>
            {!preCheckComplete && <section className="card pms-guest-portal-section"><header><span><UserCheck size={19} /></span><div><h3>Préparer mon arrivée</h3><p>Ces informations sont transmises à la réception.</p></div></header><div className="grid-2"><label>Téléphone<input className="form-control" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label><label>E-mail<input type="email" className="form-control" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label><label>Pièce d’identité<select className="form-control" value={form.documentType} onChange={event => setForm({ ...form, documentType: event.target.value as 'passport' | 'identity_card' | 'residence_permit' })}><option value="identity_card">Carte d’identité</option><option value="passport">Passeport</option><option value="residence_permit">Titre de séjour</option></select></label><label>Numéro<input className="form-control" value={form.documentNumber} onChange={event => setForm({ ...form, documentNumber: event.target.value })} /></label><label>Arrivée estimée<input type="time" className="form-control" value={form.estimatedArrivalTime} onChange={event => setForm({ ...form, estimatedArrivalTime: event.target.value })} /></label><label>Préférences<input className="form-control" placeholder="Chambre calme…" value={form.preferences} onChange={event => setForm({ ...form, preferences: event.target.value })} /></label></div><button className="btn btn-primary" onClick={savePreCheckIn}><ShieldCheck size={16} /> Terminer mon pré-check-in</button></section>}
            <section className="pms-guest-key-card"><div><KeyRound size={28} /><span>{activeKey ? 'Clé mobile active' : 'Clé disponible après le check-in'}</span><strong>{activeKey?.code || '•••• ••••'}</strong><small>{room ? `Chambre ${room.roomNumber} · valable jusqu’au ${formatDate(reservation.departureDate)}` : 'Chambre en cours d’attribution'}</small></div>{activeKey && <button><Smartphone size={18} /> Ajouter au téléphone</button>}</section>
            <section className="card pms-guest-portal-section"><header><span><UserPlus size={19} /></span><div><h3>Mes accompagnants</h3><p>Invitez un proche et partagez son accès de manière contrôlée.</p></div><b>{companions.length}/{Math.max(1, reservation.adults + reservation.children - 1)}</b></header>{companions.map(item => <div className="pms-companion" key={item.id}><span>{item.fullName.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><strong>{item.fullName}</strong><small>{item.relationship} · {item.status === 'active' ? 'Accès actif' : 'Invitation envoyée'}</small></div>{activeKey?.sharedWithIds?.includes(item.id) && <KeyRound size={16} />}</div>)}<div className="pms-companion-form"><input className="form-control" placeholder="Nom complet" value={companionForm.fullName} onChange={event => setCompanionForm({ ...companionForm, fullName: event.target.value })} /><input className="form-control" placeholder="Téléphone" value={companionForm.phone} onChange={event => setCompanionForm({ ...companionForm, phone: event.target.value })} /><button className="btn btn-secondary" onClick={inviteCompanion} disabled={!companionForm.fullName || !companionForm.phone}><UserPlus size={16} /> Inviter</button></div></section>
            <section className="card pms-guest-preference-shortcut"><ShieldCheck size={21} /><div><strong>Votre chambre, selon vos habitudes</strong><p>Température, oreiller, ménage, minibar et besoins importants sont entièrement modifiables.</p></div><button onClick={() => setTab('profile')}>Configurer mes préférences</button></section>
            <section className="card pms-local-guide"><MapPin size={21} /><div><strong>Votre guide à Dakar</strong><p>Île de Gorée, Musée des Civilisations Noires et bonnes adresses choisies par l’équipe.</p></div><button onClick={() => { setChatMessage('Pouvez-vous me conseiller une sortie à Dakar ?'); setTab('concierge'); }}>Demander conseil</button></section>
          </>}

          {tab === 'profile' && <>
            <section className="card pms-guest-portal-section pms-guest-preferences">
              <header><span><ShieldCheck size={19} /></span><div><h3>Mes préférences de séjour</h3><p>L’équipe voit uniquement les choix utiles à votre confort et à votre sécurité.</p></div><b>{profileConsent ? 'Mémorisées' : 'Ce séjour uniquement'}</b></header>
              <div className="pms-guest-preference-summary">
                <article><Languages size={18} /><span><strong>{language === 'fr' ? 'Français' : language === 'wo' ? 'Wolof' : 'English'}</strong><small>Langue de service</small></span></article>
                <article><BedDouble size={18} /><span><strong>{roomLocationPreference === 'quiet' ? 'Chambre calme' : roomLocationPreference === 'high_floor' ? 'Étage élevé' : roomLocationPreference === 'near_elevator' ? 'Près de l’ascenseur' : 'Accès facilité'}</strong><small>Emplacement souhaité</small></span></article>
                <article><Sparkles size={18} /><span><strong>{housekeepingPreference === 'morning' ? 'Ménage le matin' : housekeepingPreference === 'afternoon' ? 'Ménage l’après-midi' : 'Sur demande'}</strong><small>Passage en chambre</small></span></article>
              </div>
              <div className="grid-2 pms-guest-preference-grid">
                <label>Langue de service<select className="form-control" value={language} onChange={event => setLanguage(event.target.value as 'fr' | 'en' | 'wo')}><option value="fr">Français</option><option value="en">English</option><option value="wo">Wolof</option></select></label>
                <label>Canal de contact<select className="form-control" value={communicationPreference} onChange={event => setCommunicationPreference(event.target.value as NonNullable<PMSGuest['communicationPreference']>)}><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">E-mail</option><option value="portal">Portail uniquement</option></select></label>
                <label>Emplacement de chambre<select className="form-control" value={roomLocationPreference} onChange={event => setRoomLocationPreference(event.target.value as NonNullable<PMSGuest['roomLocationPreference']>)}><option value="quiet">Zone calme</option><option value="high_floor">Étage élevé</option><option value="near_elevator">Près de l’ascenseur</option><option value="accessible">Accès facilité</option></select></label>
                <label>Température souhaitée<select className="form-control" value={roomTemperature} onChange={event => setRoomTemperature(event.target.value as NonNullable<PMSGuest['roomTemperature']>)}><option value="cool">Fraîche</option><option value="balanced">Équilibrée</option><option value="warm">Douce</option></select></label>
                <label>Type d’oreiller<select className="form-control" value={pillowPreference} onChange={event => setPillowPreference(event.target.value as 'soft' | 'firm' | 'none')}><option value="none">Sans préférence</option><option value="soft">Souple</option><option value="firm">Ferme</option></select></label>
                <label>Passage du ménage<select className="form-control" value={housekeepingPreference} onChange={event => setHousekeepingPreference(event.target.value as NonNullable<PMSGuest['housekeepingPreference']>)}><option value="morning">Le matin</option><option value="afternoon">L’après-midi</option><option value="on_request">Uniquement sur demande</option></select></label>
                <label>Préparation du minibar<select className="form-control" value={minibarPreference} onChange={event => setMinibarPreference(event.target.value as NonNullable<PMSGuest['minibarPreference']>)}><option value="standard">Assortiment standard</option><option value="empty">Minibar vide</option><option value="family">Sélection familiale sans alcool</option></select></label>
                <label>Ce qui rend le séjour plus agréable<input className="form-control" value={form.preferences} onChange={event => setForm({ ...form, preferences: event.target.value })} placeholder="Calme, lumière, occasion spéciale…" /></label>
              </div>
              <div className="pms-guest-preference-notes">
                <label>Habitudes alimentaires<textarea className="form-control" value={dietaryPreferences} onChange={event => setDietaryPreferences(event.target.value)} placeholder="Végétarien, peu salé, repas enfant…" /></label>
                <label>Allergies et informations importantes<textarea className="form-control" value={allergies} onChange={event => setAllergies(event.target.value)} placeholder="Signalées uniquement aux équipes concernées" /></label>
                <label>Accessibilité ou assistance<textarea className="form-control" value={accessibilityNeeds} onChange={event => setAccessibilityNeeds(event.target.value)} placeholder="Mobilité, audition, vision, accompagnement…" /></label>
              </div>
              <div className="pms-guest-consent-stack">
                <label className="pms-consent-toggle"><input type="checkbox" checked={doNotDisturb} onChange={event => setDoNotDisturb(event.target.checked)} /><span><strong>Ne pas déranger</strong><small>Le ménage et les appels non urgents attendent votre autorisation.</small></span></label>
                <label className="pms-consent-toggle"><input type="checkbox" checked={profileConsent} onChange={event => setProfileConsent(event.target.checked)} /><span><strong>Retrouver mes choix au prochain séjour</strong><small>Vous pouvez les modifier ou les effacer à tout moment.</small></span></label>
              </div>
              <div className="pms-guest-profile-actions"><button className="btn btn-primary" onClick={saveExperienceProfile}>Enregistrer et transmettre</button><button className="btn btn-secondary danger" onClick={clearExperienceProfile}>Effacer mes préférences</button></div>
            </section>
            <section className="card pms-guest-profile-privacy"><ShieldCheck size={20} /><div><strong>Vos choix restent sous votre contrôle</strong><p>Téléphone vérifié : {guest.phone}. Les documents obligatoires, factures et paiements suivent leurs durées légales de conservation.</p></div></section>
          </>}

          {tab === 'departure' && <>
            <section className="card pms-guest-portal-section"><header><span><CircleDollarSign size={19} /></span><div><h3>{phase === 'after' ? 'Ma facture' : 'Préparer mon départ'}</h3><p>Chaque ligne de votre séjour reste visible avant paiement.</p></div><b>{amountDue > 0 ? formatFCFA(amountDue) : 'Soldé'}</b></header>{folio && <div className="pms-guest-folio-lines">{folio.charges.map(charge => <div key={charge.id}><span>{charge.label}<small>{new Date(charge.date).toLocaleDateString('fr-FR')}</small></span><strong>{formatFCFA(charge.amount)}</strong></div>)}</div>}{amountDue > 0 ? <div className="pms-guest-payment"><div className="pms-payment-choice">{(['wave', 'orange_money'] as const).map(method => <button key={method} className={paymentMethod === method ? 'active' : ''} onClick={() => setPaymentMethod(method)}><CreditCard size={16} />{PAYMENT_TYPE_LABELS[method]}</button>)}</div><label>Montant<input className="form-control" type="number" min="1" max={amountDue} value={Math.min(paymentAmount, amountDue)} onChange={event => setPaymentAmount(Number(event.target.value))} /></label><button className="btn btn-primary" onClick={pay}><WalletCards size={16} /> Régler</button></div> : <div className="pms-guest-paid"><CheckCircle size={18} /> Aucun paiement en attente.</div>}</section>
            {reservation.status === 'checked_in' && <section className="pms-guest-checkout"><div><strong>Tout est prêt pour votre départ</strong><p>Le folio sera clôturé, les clés désactivées et la chambre transmise à l’équipe.</p></div><button className="btn btn-primary" onClick={checkout} disabled={amountDue > 0}>Confirmer mon départ <ArrowRight size={17} /></button></section>}
            {phase === 'after' && <section className="card pms-guest-return"><Sparkles size={23} /><div><strong>Au plaisir de vous revoir</strong><p>Recevez une proposition directe qui reprend vos préférences, sans tout recommencer.</p></div><button className="btn btn-primary" onClick={() => { requestPMSReturnStay(reservationId); setMessage('L’équipe réservation prépare une proposition personnalisée.'); }} disabled={Boolean(guest.returnStayRequestedAt)}>{guest.returnStayRequestedAt ? 'Demande transmise' : 'Préparer mon prochain séjour'}</button></section>}
          </>}
          {message && <div className="alert alert-success pms-guest-feedback">{message}</div>}
        </div>
      </div>
      {standalone && <footer className="pms-guest-public-footer"><span><ShieldCheck size={15} /> Lien privé et sécurisé</span><span><Copy size={15} /> Référence {reservation.confirmationNumber}</span><span>Besoin d’aide ? +221 33 800 00 00</span></footer>}
    </section>
  );
};
