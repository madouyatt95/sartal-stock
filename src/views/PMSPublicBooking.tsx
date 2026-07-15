import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, Check, CheckCircle2, CreditCard, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { PaymentType } from '../types';
import { getPMSAvailabilityByType } from '../utils/pmsAvailability';

interface PMSPublicBookingProps { state: StockState; }

const formatFCFA = (amount: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} FCFA`;
const addDays = (date: string, days: number) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); };

export const PMSPublicBooking: React.FC<PMSPublicBookingProps> = ({ state }) => {
  const { db } = state;
  const initialArrival = addDays(db.pmsSettings.businessDate || new Date().toISOString().slice(0, 10), 3);
  const [step, setStep] = useState(1);
  const [reservationId, setReservationId] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    arrivalDate: initialArrival,
    departureDate: addDays(initialArrival, 2),
    adults: 2,
    children: 0,
    roomType: db.pmsRooms[0]?.roomType || 'Standard',
    guestName: '',
    phone: '+221 ',
    email: '',
    paymentMethod: 'wave' as Exclude<PaymentType, 'room_charge' | 'other'>
  });
  const availability = useMemo(() => getPMSAvailabilityByType(db, form.arrivalDate, form.departureDate), [db, form.arrivalDate, form.departureDate]);
  const selected = availability.find(item => item.roomType === form.roomType) || availability[0];
  const nights = Math.max(1, Math.ceil((new Date(form.departureDate).getTime() - new Date(form.arrivalDate).getTime()) / 86400000));
  const total = (selected?.price || 0) * nights;
  const deposit = Math.round(total * db.pmsBookingEngine.depositPercent / 100);
  const reservation = db.pmsReservations.find(item => item.id === reservationId);
  const propertyName = db.sartalBrandSettings.siteProfiles.find(item => item.siteId === db.sites[0]?.id)?.displayName || db.sites[0]?.name || 'Hôtel Sártal';

  const next = () => {
    setError('');
    if (step === 1 && (form.departureDate <= form.arrivalDate || form.adults < 1)) { setError('Vérifiez les dates et le nombre de voyageurs.'); return; }
    if (step === 2 && (!selected || selected.closed || selected.available < 1)) { setError('Choisissez une catégorie disponible.'); return; }
    setStep(current => Math.min(3, current + 1));
  };

  const book = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!db.pmsBookingEngine.enabled) { setError('La réservation directe est temporairement suspendue.'); return; }
    if (!selected || selected.closed || selected.available < 1) { setError('Cette catégorie n’est plus disponible sur ces dates.'); return; }
    if (!form.guestName.trim() || form.phone.replace(/\D/g, '').length < 9) { setError('Renseignez votre nom et un numéro de téléphone complet.'); return; }
    try {
      const id = state.createPMSReservation({
        guestName: form.guestName,
        phone: form.phone,
        email: form.email,
        roomId: '',
        arrivalDate: form.arrivalDate,
        departureDate: form.departureDate,
        adults: form.adults,
        children: form.children,
        source: 'online',
        nightlyRate: selected.price,
        depositAmount: deposit,
        requestedRoomType: selected.roomType,
        guaranteeType: 'deposit',
        notes: `Réservation directe client · acompte ${form.paymentMethod}.`
      });
      state.updatePMSBookingEngine({ lastBookingAt: new Date().toISOString(), bookingsToday: db.pmsBookingEngine.bookingsToday + 1 });
      setReservationId(id);
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : 'La réservation n’a pas pu être créée.');
    }
  };
  const bookingSteps = [
    { number: 1, label: 'Séjour', icon: <CalendarDays size={16} /> },
    { number: 2, label: 'Chambre', icon: <BedDouble size={16} /> },
    { number: 3, label: 'Coordonnées', icon: <UsersRound size={16} /> }
  ];

  if (reservationId) return <main className="public-booking-page"><section className="public-booking-success"><div><CheckCircle2 size={34} /></div><span>RÉSERVATION CONFIRMÉE</span><h1>Votre séjour est réservé</h1><p>{propertyName} vous attend du {form.arrivalDate} au {form.departureDate}.</p><section><div><small>Confirmation</small><strong>{reservation?.confirmationNumber || 'Confirmation enregistrée'}</strong></div><div><small>Catégorie</small><strong>{form.roomType}</strong></div><div><small>Acompte sécurisé</small><strong>{formatFCFA(deposit)}</strong></div><div><small>Solde à régler</small><strong>{formatFCFA(total - deposit)}</strong></div></section><a href={`?sejour=${reservationId}&origine=connexion`}>Préparer mon séjour <ArrowRight size={17} /></a><small><ShieldCheck size={14} /> Une confirmation est associée au numéro {form.phone}.</small></section></main>;

  return <main className="public-booking-page">
    <header className="public-booking-header"><div><img src="./brand-mark.svg" alt="Sártal" /><span><strong>{propertyName}</strong><small>Réservation directe sécurisée par Sártal</small></span></div><span><LockKeyhole size={15} /> Disponibilité en temps réel</span></header>
    <section className="public-booking-shell">
      <header><span>RÉSERVER UN SÉJOUR</span><h1>Choisissez votre chambre</h1><p>Tarifs directs, disponibilité instantanée et confirmation immédiate.</p></header>
      <nav aria-label="Étapes de réservation">{bookingSteps.map(item => <button type="button" className={step === item.number ? 'active' : step > item.number ? 'done' : ''} onClick={() => item.number < step && setStep(item.number)} key={item.label}><span>{step > item.number ? <Check size={16} /> : item.icon}</span><strong>{item.number}. {item.label}</strong></button>)}</nav>
      <form onSubmit={book}>
        <div className="public-booking-body">
          {step === 1 && <section className="public-booking-step"><header><CalendarDays size={21} /><div><h2>Votre séjour</h2><p>Indiquez les dates et le nombre de voyageurs.</p></div></header><div className="public-booking-fields"><label>Arrivée<input type="date" min={db.pmsSettings.businessDate} value={form.arrivalDate} onChange={event => setForm({ ...form, arrivalDate: event.target.value })} /></label><label>Départ<input type="date" min={addDays(form.arrivalDate, 1)} value={form.departureDate} onChange={event => setForm({ ...form, departureDate: event.target.value })} /></label><label>Adultes<input type="number" min="1" max="8" value={form.adults} onChange={event => setForm({ ...form, adults: Number(event.target.value) })} /></label><label>Enfants<input type="number" min="0" max="8" value={form.children} onChange={event => setForm({ ...form, children: Number(event.target.value) })} /></label></div><div className="public-booking-highlight"><CalendarDays size={18} /><span><strong>{nights} nuit(s)</strong><small>{form.adults + form.children} voyageur(s) · du {form.arrivalDate} au {form.departureDate}</small></span></div></section>}
          {step === 2 && <section className="public-booking-step"><header><BedDouble size={21} /><div><h2>Votre chambre</h2><p>Les catégories indisponibles ne peuvent pas être sélectionnées.</p></div></header><div className="public-room-choice">{availability.map((item, index) => <button type="button" className={form.roomType === item.roomType ? 'selected' : ''} disabled={item.closed || item.available < 1} onClick={() => setForm({ ...form, roomType: item.roomType })} key={item.roomType}><span className="public-room-image" style={{ backgroundImage: "url('/pms-room-categories.jpg')", backgroundSize: '500% auto', backgroundPosition: `${Math.min(index, 4) * 25}% center` }}><small>{item.closed ? 'Vente fermée' : `${item.available} disponible(s)`}</small></span><span><strong>{item.roomType}</strong><small>Pour {form.adults + form.children} voyageur(s)</small><b>{formatFCFA(item.price)} / nuit</b></span>{form.roomType === item.roomType && <CheckCircle2 size={20} />}</button>)}</div></section>}
          {step === 3 && <section className="public-booking-step"><header><UsersRound size={21} /><div><h2>Vos coordonnées</h2><p>Nous les utiliserons uniquement pour votre réservation et votre séjour.</p></div></header><div className="public-booking-fields"><label>Prénom et nom<input value={form.guestName} onChange={event => setForm({ ...form, guestName: event.target.value })} autoComplete="name" required /></label><label>Téléphone<input type="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} autoComplete="tel" required /></label><label className="wide">E-mail (facultatif)<input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label></div><section className="public-payment-choice"><h3>Acompte de {formatFCFA(deposit)}</h3><p>Choisissez le moyen utilisé pour sécuriser la réservation.</p><div>{([['wave', 'Wave'], ['orange_money', 'Orange Money'], ['card', 'Carte bancaire']] as const).map(([value, label]) => <button type="button" className={form.paymentMethod === value ? 'selected' : ''} onClick={() => setForm({ ...form, paymentMethod: value })} key={value}><CreditCard size={17} /> {label}{form.paymentMethod === value && <Check size={15} />}</button>)}</div></section></section>}
          {error && <div className="public-booking-error">{error}</div>}
        </div>
        <aside className="public-booking-summary"><div><span>{form.roomType}</span><strong>{formatFCFA(total)}</strong><small>{nights} nuit(s) · {formatFCFA(selected?.price || 0)} par nuit</small></div><div><small>Acompte maintenant</small><strong>{formatFCFA(deposit)}</strong><small>Solde sur place : {formatFCFA(total - deposit)}</small></div></aside>
        <footer>{step > 1 ? <button type="button" className="secondary" onClick={() => setStep(current => current - 1)}><ArrowLeft size={16} /> Retour</button> : <span />}{step < 3 ? <button type="button" className="primary" onClick={next}>Continuer <ArrowRight size={16} /></button> : <button className="primary" type="submit"><ShieldCheck size={16} /> Confirmer et sécuriser</button>}</footer>
      </form>
    </section>
    <footer className="public-booking-trust"><ShieldCheck size={15} /> Réservation transmise directement à l’hôtel, sans intermédiaire.</footer>
  </main>;
};

export default PMSPublicBooking;
