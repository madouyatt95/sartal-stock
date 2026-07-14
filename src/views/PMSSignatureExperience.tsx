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
  Fingerprint,
  KeyRound,
  MessageCircle,
  MoonStar,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Users,
  WalletCards,
  Warehouse
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { PAYMENT_TYPE_LABELS, PMSReservation } from '../types';
import { buildPMSUnifiedJourney, PMSJourneyEventType } from '../utils/pmsUnifiedJourney';

interface PMSPanelProps { state: StockState; }
type PMSWorkspaceTab = 'dashboard' | 'planning' | 'reservations' | 'rooms' | 'guests' | 'folios' | 'housekeeping' | 'audit' | 'reports' | 'settings';
interface PMSSignatureWorkspaceProps extends PMSPanelProps { onNavigate: (tab: PMSWorkspaceTab) => void; }

const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;
const formatDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export const PMSSignatureWorkspace: React.FC<PMSSignatureWorkspaceProps> = ({ state, onNavigate }) => {
  const { db } = state;
  const [role, setRole] = useState<'reception' | 'manager' | 'housekeeping' | 'night'>('reception');
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
        <div className="pms-signature-role-switch">{(Object.keys(workspaces) as Array<keyof typeof workspaces>).map(item => <button key={item} className={role === item ? 'active' : ''} onClick={() => setRole(item)}>{workspaces[item].icon}<span>{workspaces[item].label}</span></button>)}</div>
      </header>
      <div className="pms-signature-body">
        <button className="pms-signature-highlight" onClick={() => onNavigate(current.target)}><span>Priorité maintenant</span><strong>{current.highlight}</strong><small>{current.highlightDetail}</small><b>Agir maintenant <ArrowRight size={16} /></b></button>
        <div className="pms-signature-actions">{current.actions.map(action => <button key={action.label} className={action.tone} onClick={() => onNavigate(action.tab)}><div><strong>{action.count}{'suffix' in action ? action.suffix : ''}</strong><ChevronRight size={18} /></div><span>{action.label}</span><small>{action.detail}</small></button>)}</div>
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

export const PMSGuestExperiencePortal: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, completePMSPreCheckIn, addPMSServiceRequest, addPMSReservationPayment } = state;
  const active = db.pmsReservations.filter(item => ['confirmed', 'checked_in'].includes(item.status));
  const initial = active.find(item => item.status === 'confirmed') || active[0];
  const [reservationId, setReservationId] = useState(initial?.id || '');
  const reservation = db.pmsReservations.find(item => item.id === reservationId);
  const guest = db.pmsGuests.find(item => item.id === reservation?.guestId);
  const room = db.pmsRooms.find(item => item.id === reservation?.roomId);
  const folio = db.pmsFolios.find(item => item.reservationId === reservationId && item.status === 'open');
  const services = db.pmsServiceRequests.filter(item => item.reservationId === reservationId);
  const activeKey = db.pmsDoorKeys.find(item => item.reservationId === reservationId && item.status === 'active');
  const [form, setForm] = useState(() => portalFormFor(db, initial));
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money'>('wave');
  const folioBalance = folio ? folio.charges.reduce((sum, item) => sum + item.amount, 0) - folio.payments.reduce((sum, item) => sum + item.amount, 0) : 0;
  const [paymentAmount, setPaymentAmount] = useState(25000);
  const [message, setMessage] = useState('');

  const chooseReservation = (id: string) => {
    const next = db.pmsReservations.find(item => item.id === id);
    setReservationId(id);
    setForm(portalFormFor(db, next));
    setMessage('');
  };
  const savePreCheckIn = () => {
    if (!reservation) return;
    completePMSPreCheckIn(reservation.id, form);
    setMessage('Pré-check-in enregistré. La réception voit immédiatement vos informations.');
  };
  const requestService = (type: 'airport_transfer' | 'breakfast' | 'special_request', label: string, amount: number, assignedTo: string) => {
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

  if (!reservation || !guest) return null;
  const preCheckComplete = guest.preCheckInStatus === 'completed';
  const roomReady = room && ['clean', 'inspected'].includes(room.housekeepingStatus);
  const nights = Math.max(1, Math.ceil((new Date(reservation.departureDate).getTime() - new Date(reservation.arrivalDate).getTime()) / 86400000));
  const amountDue = folio ? Math.max(0, folioBalance) : Math.max(0, (reservation.nightlyRate * nights) - reservation.depositAmount);

  return (
    <section className="pms-guest-experience">
      <div className="pms-guest-experience-heading"><div><span className="pms-eyebrow"><MessageCircle size={15} /> Expérience client</span><h2>Mon séjour Sártal</h2><p>Un portail mobile réellement connecté aux équipes, au folio et aux paiements.</p></div><select className="form-control" value={reservationId} onChange={event => chooseReservation(event.target.value)}>{active.map(item => <option key={item.id} value={item.id}>{item.confirmationNumber} · {db.pmsGuests.find(guestItem => guestItem.id === item.guestId)?.fullName}</option>)}</select></div>
      <div className="pms-guest-portal-shell">
        <aside className="pms-guest-stay-card">
          <div className="pms-guest-stay-photo"><span>{reservation.status === 'checked_in' ? 'Séjour en cours' : 'Arrivée prochaine'}</span></div>
          <div className="pms-guest-stay-copy"><small>{db.pmsSettings.hotelName}</small><h3>Bonjour {guest.fullName.split(' ')[0]}</h3><p>{formatDate(reservation.arrivalDate)} → {formatDate(reservation.departureDate)}</p><div><span><BedDouble size={16} /> {room ? `Chambre ${room.roomNumber}` : reservation.requestedRoomType}</span><span><Users size={16} /> {reservation.adults + reservation.children} voyageur(s)</span></div></div>
          <div className="pms-guest-progress">{[
            ['Réservé', true], ['Pré-check-in', preCheckComplete], ['Chambre prête', Boolean(roomReady)], ['Clé active', Boolean(activeKey)]
          ].map(([label, done]) => <div className={done ? 'done' : ''} key={String(label)}><span>{done ? <CheckCircle size={14} /> : null}</span><small>{label}</small></div>)}</div>
          <div className="pms-guest-live-status"><span className={roomReady ? 'ready' : 'waiting'}><i />{roomReady ? 'Votre chambre est prête' : 'Préparation en cours'}</span>{activeKey && <b><KeyRound size={15} /> Clé {activeKey.code}</b>}</div>
        </aside>

        <div className="pms-guest-portal-content">
          <section className="card pms-guest-portal-section"><header><span><UserCheck size={19} /></span><div><h3>Préparer mon arrivée</h3><p>Ces informations sont transmises à la réception.</p></div>{preCheckComplete && <b><CheckCircle size={15} /> Terminé</b>}</header><div className="grid-2"><label>Téléphone<input className="form-control" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label><label>E-mail<input type="email" className="form-control" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label><label>Pièce d’identité<select className="form-control" value={form.documentType} onChange={event => setForm({ ...form, documentType: event.target.value as 'passport' | 'identity_card' | 'residence_permit' })}><option value="identity_card">Carte d’identité</option><option value="passport">Passeport</option><option value="residence_permit">Titre de séjour</option></select></label><label>Numéro<input className="form-control" value={form.documentNumber} onChange={event => setForm({ ...form, documentNumber: event.target.value })} /></label><label>Arrivée estimée<input type="time" className="form-control" value={form.estimatedArrivalTime} onChange={event => setForm({ ...form, estimatedArrivalTime: event.target.value })} /></label><label>Préférences<input className="form-control" placeholder="Chambre calme, allergies..." value={form.preferences} onChange={event => setForm({ ...form, preferences: event.target.value })} /></label></div><button className="btn btn-primary" onClick={savePreCheckIn}><ShieldCheck size={16} /> {preCheckComplete ? 'Mettre à jour mes informations' : 'Terminer mon pré-check-in'}</button></section>

          <section className="card pms-guest-portal-section"><header><span><PackageCheck size={19} /></span><div><h3>Personnaliser mon séjour</h3><p>Chaque demande arrive dans le poste de travail de la bonne équipe.</p></div></header><div className="pms-guest-service-options"><button onClick={() => requestService('airport_transfer', 'Transfert aéroport', 25000, 'Conciergerie')}><span>Transfert aéroport</span><strong>{formatFCFA(25000)}</strong></button><button onClick={() => requestService('breakfast', 'Petit-déjeuner', 9000, 'Restaurant')}><span>Petit-déjeuner</span><strong>{formatFCFA(9000)}</strong></button><button onClick={() => requestService('special_request', 'Départ tardif demandé', 0, 'Réception')}><span>Départ tardif</span><strong>Sur demande</strong></button></div>{services.length > 0 && <div className="pms-guest-request-list">{services.slice(0, 3).map(service => <div key={service.id}><span><i />{service.label}</span><b>{service.status === 'completed' ? 'Terminé' : service.status === 'in_progress' ? 'En cours' : 'Reçu'}</b></div>)}</div>}</section>

          <section className="card pms-guest-portal-section"><header><span><CircleDollarSign size={19} /></span><div><h3>Payer simplement</h3><p>Acompte ou solde immédiatement rattaché au séjour.</p></div><b>{amountDue > 0 ? formatFCFA(amountDue) : 'Soldé'}</b></header>{amountDue > 0 ? <div className="pms-guest-payment"><div className="pms-payment-choice">{(['wave', 'orange_money'] as const).map(method => <button key={method} className={paymentMethod === method ? 'active' : ''} onClick={() => setPaymentMethod(method)}><CreditCard size={16} />{PAYMENT_TYPE_LABELS[method]}</button>)}</div><label>Montant<input className="form-control" type="number" min="1" max={amountDue} value={Math.min(paymentAmount, amountDue)} onChange={event => setPaymentAmount(Number(event.target.value))} /></label><button className="btn btn-primary" onClick={pay}><WalletCards size={16} /> Régler maintenant</button></div> : <div className="pms-guest-paid"><CheckCircle size={18} /> Aucun paiement en attente.</div>}</section>
          {message && <div className="alert alert-success pms-guest-feedback">{message}</div>}
        </div>
      </div>
    </section>
  );
};
