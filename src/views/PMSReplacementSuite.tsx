import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle,
  CircleDollarSign,
  CreditCard,
  Globe2,
  KeyRound,
  Link2,
  ListChecks,
  MessageCircle,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Users
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { getPMSAvailabilityByType } from '../utils/pmsAvailability';

interface PMSPanelProps { state: StockState; }

const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;
const addDays = (date: string, days: number) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); };

export const PMSDistributionHub: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, createPMSReservation, syncPMSChannel, updatePMSBookingEngine } = state;
  const [arrivalDate, setArrivalDate] = useState(addDays(db.pmsSettings.businessDate, 4));
  const [departureDate, setDepartureDate] = useState(addDays(db.pmsSettings.businessDate, 7));
  const [roomType, setRoomType] = useState(db.pmsRooms[0]?.roomType || 'Standard');
  const [guestName, setGuestName] = useState('Aïssatou Ba');
  const [phone, setPhone] = useState('+221 77 555 24 80');
  const [result, setResult] = useState('');
  const availability = useMemo(() => getPMSAvailabilityByType(db, arrivalDate, departureDate), [db, arrivalDate, departureDate]);
  const selected = availability.find(item => item.roomType === roomType);
  const book = () => {
    if (!selected || selected.available < 1 || selected.closed) { setResult('Cette catégorie n’est pas vendable sur la période.'); return; }
    const nights = Math.max(1, Math.ceil((new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) / 86400000));
    createPMSReservation({ guestName, phone, roomId: '', arrivalDate, departureDate, adults: 2, children: 0, source: 'online', nightlyRate: selected.price, depositAmount: Math.round(selected.price * nights * db.pmsBookingEngine.depositPercent / 100), requestedRoomType: roomType, guaranteeType: 'deposit', notes: 'Réservation directe depuis le moteur Sártal.' });
    updatePMSBookingEngine({ lastBookingAt: new Date().toISOString(), bookingsToday: db.pmsBookingEngine.bookingsToday + 1 });
    setResult('Réservation directe confirmée et acompte sécurisé.');
  };
  return (
    <section className="card pms-section-card pms-distribution-hub">
      <div className="pms-section-header"><div><span className="pms-eyebrow"><Globe2 size={15} /> Distribution</span><h2>Réservation directe et canaux</h2><p>Une même disponibilité alimente le site direct, les agences et les plateformes.</p></div><button className={`btn ${db.pmsBookingEngine.enabled ? 'btn-secondary' : 'btn-primary'}`} onClick={() => updatePMSBookingEngine({ enabled: !db.pmsBookingEngine.enabled })}>{db.pmsBookingEngine.enabled ? 'Vente directe active' : 'Activer la vente directe'}</button></div>
      <div className="pms-distribution-layout">
        <div className="pms-booking-engine">
          <header><div><strong>Moteur de réservation Sártal</strong><span>{db.pmsBookingEngine.publicUrl}</span></div><span className="badge badge-green">{db.pmsBookingEngine.bookingsToday} aujourd’hui</span></header>
          <div className="pms-booking-engine-fields"><label>Arrivée<input className="form-control" type="date" value={arrivalDate} onChange={event => setArrivalDate(event.target.value)} /></label><label>Départ<input className="form-control" type="date" min={arrivalDate} value={departureDate} onChange={event => setDepartureDate(event.target.value)} /></label><label>Catégorie<select className="form-control" value={roomType} onChange={event => setRoomType(event.target.value)}>{availability.map(item => <option key={item.roomType}>{item.roomType}</option>)}</select></label><label>Client<input className="form-control" value={guestName} onChange={event => setGuestName(event.target.value)} /></label><label>Téléphone<input className="form-control" value={phone} onChange={event => setPhone(event.target.value)} /></label></div>
          {selected && <div className={`pms-booking-quote ${selected.closed || selected.available < 1 ? 'closed' : ''}`}><div><span>Disponibilité en temps réel</span><strong>{selected.closed ? 'Ventes fermées' : `${selected.available} chambre(s)`}</strong></div><div><span>Prix par nuit</span><strong>{formatFCFA(selected.price)}</strong></div><div><span>Acompte</span><strong>{db.pmsBookingEngine.depositPercent}%</strong></div><button className="btn btn-primary" disabled={!db.pmsBookingEngine.enabled || selected.closed || selected.available < 1} onClick={book}>Réserver <ArrowRight size={16} /></button></div>}
          {result && <div className={result.includes('confirmée') ? 'alert alert-success' : 'alert alert-danger'}>{result}</div>}
        </div>
        <div className="pms-channel-command"><header><strong>Channel Manager</strong><span>Connecteurs à activer avec les identifiants du client.</span></header>{db.pmsChannels.map(channel => <article key={channel.id}><div><Link2 size={17} /><span><strong>{channel.name}</strong><small>{channel.inventorySynced || db.pmsRooms.length} disponibilités · {channel.ratesSynced || db.pmsRatePlans.length} tarifs</small></span></div><span className={`badge ${channel.status === 'connected' ? 'badge-green' : 'badge-yellow'}`}>{channel.status === 'connected' ? 'Synchronisé' : 'À contrôler'}</span><button className="btn btn-secondary" onClick={() => syncPMSChannel(channel.id)}><RefreshCcw size={15} /> Synchroniser</button></article>)}</div>
      </div>
    </section>
  );
};

export const PMSGroupAllotments: React.FC<PMSPanelProps> = ({ state }) => {
  const { db } = state;
  return <section className="card pms-section-card"><div className="pms-section-header"><div><span className="pms-eyebrow"><Users size={15} /> Groupes & événements</span><h2>Allotements et rooming-lists</h2><p>Suivez les chambres bloquées, les noms reçus, l’acompte et la date de rétrocession.</p></div></div><div className="pms-allotment-list">{db.pmsGroups.map(group => { const allotted = group.allottedRooms || group.roomIds.length; const named = group.roomingListReceived ?? Math.max(1, group.roomIds.length - 1); const progress = Math.round((named / Math.max(1, allotted)) * 100); return <article key={group.id}><header><div><Building2 size={18} /><span><strong>{group.name}</strong><small>{group.contactName} · {group.contactPhone}</small></span></div><span className={`badge ${group.status === 'confirmed' ? 'badge-green' : 'badge-yellow'}`}>{group.status === 'confirmed' ? 'Confirmé' : 'Option'}</span></header><div className="pms-allotment-stats"><div><span>Allotement</span><strong>{allotted} chambres</strong></div><div><span>Rooming-list</span><strong>{named}/{allotted}</strong></div><div><span>Acompte</span><strong>{formatFCFA(group.depositAmount)}</strong></div><div><span>Rétrocession</span><strong>{group.releaseDate || addDays(group.arrivalDate, -5)}</strong></div></div><div className="pms-progress"><i style={{ width: `${Math.min(100, progress)}%` }} /></div><small>{progress}% des occupants renseignés · facturation {group.billingMode === 'central' ? 'centrale' : group.billingMode === 'mixed' ? 'mixte' : 'individuelle'}</small></article>; })}</div></section>;
};

export const PMSPackageManager: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, addPMSPackageToFolio } = state;
  const [folioId, setFolioId] = useState(db.pmsFolios.find(item => item.status === 'open')?.id || '');
  const [message, setMessage] = useState('');
  return <section className="card pms-section-card"><div className="pms-section-header"><div><span className="pms-eyebrow"><PackageCheck size={15} /> Forfaits</span><h2>Pensions et expériences</h2><p>Hébergement et prestations sont ajoutés ensemble au séjour.</p></div><select className="form-control" value={folioId} onChange={event => setFolioId(event.target.value)}>{db.pmsFolios.filter(item => item.status === 'open').map(folio => <option key={folio.id} value={folio.id}>{folio.reservationNumber} · {folio.guestName}</option>)}</select></div><div className="pms-package-grid">{db.pmsPackages.map(item => <article key={item.id}><PackageCheck size={22} /><div><strong>{item.name}</strong><span>{item.includedServices.join(' · ')}</span></div><b>+ {formatFCFA(item.pricePerNight)} / nuit</b><button className="btn btn-secondary" onClick={() => { addPMSPackageToFolio(folioId, item.id); setMessage(`${item.name} ajouté au folio.`); }}>Ajouter au séjour</button></article>)}</div>{message && <div className="alert alert-success">{message}</div>}</section>;
};

export const PMSFinanceCenter: React.FC<PMSPanelProps> = ({ state }) => {
  const { db } = state;
  const payments = db.pmsFolios.flatMap(folio => folio.payments);
  const paymentTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const debtorTotal = db.pmsDebtorAccounts.reduce((sum, account) => sum + account.balance, 0);
  return <section className="card pms-section-card"><div className="pms-section-header"><div><span className="pms-eyebrow"><CircleDollarSign size={15} /> Finance hôtelière</span><h2>Main courante et comptes débiteurs</h2><p>Encaissements, créances entreprises et échéances dans une même vue.</p></div></div><div className="pms-finance-kpis"><div><span>Encaissements PMS</span><strong>{formatFCFA(paymentTotal)}</strong></div><div><span>Créances</span><strong>{formatFCFA(debtorTotal)}</strong></div><div><span>Comptes échus</span><strong>{db.pmsDebtorAccounts.filter(item => item.status === 'due').length}</strong></div><div><span>Documents émis</span><strong>{db.pmsInvoices.length}</strong></div></div><div className="pms-debtor-list">{db.pmsDebtorAccounts.map(account => <article key={account.id}><div><Building2 size={17} /><span><strong>{account.name}</strong><small>{account.type} · échéance {account.dueDate}</small></span></div><div><span>Solde</span><strong>{formatFCFA(account.balance)}</strong></div><div><span>Plafond</span><strong>{formatFCFA(account.creditLimit)}</strong></div><span className={`badge ${account.status === 'due' ? 'badge-red' : account.status === 'blocked' ? 'badge-yellow' : 'badge-green'}`}>{account.status === 'due' ? 'À relancer' : account.status === 'blocked' ? 'Bloqué' : 'À jour'}</span></article>)}</div><div className="pms-payment-strip">{(['cash', 'card', 'wave', 'orange_money'] as const).map(method => <div key={method}><CreditCard size={16} /><span>{method === 'orange_money' ? 'Orange Money' : method === 'cash' ? 'Espèces' : method === 'card' ? 'Carte' : 'Wave'}</span><strong>{formatFCFA(payments.filter(item => item.method === method).reduce((sum, item) => sum + item.amount, 0))}</strong></div>)}</div></section>;
};

export const PMSAccessCenter: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, issuePMSDoorKey, revokePMSDoorKey } = state;
  const [message, setMessage] = useState('');
  const activeStays = db.pmsReservations.filter(item => ['confirmed', 'checked_in'].includes(item.status) && item.roomId);
  return <section className="card pms-section-card"><div className="pms-section-header"><div><span className="pms-eyebrow"><KeyRound size={15} /> Accès chambres</span><h2>Clés et serrures électroniques</h2><p>Émission, validité et révocation liées automatiquement au séjour.</p></div><span className="badge badge-blue">Interface serrure à configurer</span></div><div className="pms-key-list">{activeStays.map(reservation => { const room = db.pmsRooms.find(item => item.id === reservation.roomId); const guest = db.pmsGuests.find(item => item.id === reservation.guestId); const key = db.pmsDoorKeys.find(item => item.reservationId === reservation.id && item.status === 'active'); return <article key={reservation.id}><div><span className={`pms-key-icon ${key ? 'active' : ''}`}><KeyRound size={19} /></span><span><strong>Chambre {room?.roomNumber} · {guest?.fullName}</strong><small>{key ? `${key.code} · valide jusqu’au ${new Date(key.validUntil).toLocaleString('fr-FR')}` : 'Aucune clé active'}</small></span></div>{key ? <button className="btn btn-secondary" onClick={() => { revokePMSDoorKey(key.id); setMessage(`Clé ${key.code} révoquée.`); }}>Révoquer</button> : <button className="btn btn-primary" onClick={() => { const code = issuePMSDoorKey(reservation.id); setMessage(`Clé ${code} émise.`); }}>Émettre une clé</button>}</article>; })}</div>{message && <div className="alert alert-success">{message}</div>}</section>;
};

export const PMSGuestPortal: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, completePMSPreCheckIn, togglePMSAutomationRule } = state;
  const reservations = db.pmsReservations.filter(item => ['confirmed', 'checked_in'].includes(item.status));
  const [reservationId, setReservationId] = useState(reservations[0]?.id || '');
  const reservation = db.pmsReservations.find(item => item.id === reservationId);
  const guest = db.pmsGuests.find(item => item.id === reservation?.guestId);
  return <section className="card pms-section-card"><div className="pms-section-header"><div><span className="pms-eyebrow"><Smartphone size={15} /> Parcours client</span><h2>Pré-check-in et automatisations</h2><p>Le client prépare son arrivée depuis son téléphone, sans attente à la réception.</p></div><select className="form-control" value={reservationId} onChange={event => setReservationId(event.target.value)}>{reservations.map(item => <option key={item.id} value={item.id}>{item.confirmationNumber} · {db.pmsGuests.find(guestItem => guestItem.id === item.guestId)?.fullName}</option>)}</select></div><div className="pms-guest-portal-layout"><div className="pms-phone-preview"><header><ShieldCheck size={19} /><strong>Mon séjour Sártal</strong></header><h3>Bonjour {guest?.fullName.split(' ')[0]}</h3><p>Préparez votre arrivée du {reservation?.arrivalDate}.</p><div className="pms-mobile-checks">{[['Identité transmise', Boolean(guest?.documentNumber)], ['Conditions signées', Boolean(guest?.consentSignedAt)], ['Acompte sécurisé', reservation?.guaranteeStatus === 'secured'], ['Préférences enregistrées', Boolean(guest?.preferences)]].map(([label, done]) => <div key={String(label)} className={done ? 'done' : ''}>{done ? <CheckCircle size={17} /> : <span />}{label}</div>)}</div><button className="btn btn-primary" disabled={guest?.preCheckInStatus === 'completed'} onClick={() => completePMSPreCheckIn(reservationId)}>{guest?.preCheckInStatus === 'completed' ? 'Pré-check-in terminé' : 'Terminer le pré-check-in'}</button></div><div className="pms-automation-list"><header><MessageCircle size={19} /><div><strong>Messages automatiques</strong><span>WhatsApp, SMS et e-mail selon l’étape du séjour.</span></div></header>{db.pmsAutomationRules.map(rule => <article key={rule.id}><div><strong>{rule.name}</strong><span>{rule.channel} · {rule.sentCount} envoi(s)</span></div><button className={`pms-toggle ${rule.active ? 'active' : ''}`} onClick={() => togglePMSAutomationRule(rule.id)} aria-label={rule.active ? 'Suspendre' : 'Activer'}><i /></button></article>)}</div></div></section>;
};

export const PMSMigrationCockpit: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, simulatePMSMigration, validatePMSMigrationRun } = state;
  const run = db.pmsMigrationRuns[0];
  const checks = run ? [
    ['Chambres et catégories', run.rooms, run.rooms > 0],
    ['Fichier clients', run.guests, run.guests > 0],
    ['Réservations futures', run.reservations, run.reservations > 0],
    ['Rejets à corriger', run.rejectedRows || run.warnings, (run.rejectedRows || run.warnings) === 0],
    ['Écart des soldes', formatFCFA(run.balanceDifference || 0), (run.balanceDifference || 0) === 0]
  ] : [];
  return <section className="card pms-section-card pms-migration-cockpit"><div className="pms-section-header"><div><span className="pms-eyebrow"><RefreshCcw size={15} /> Reprise Orchestra</span><h2>Cockpit de migration contrôlée</h2><p>Chaque donnée importée doit être rapprochée avant la bascule définitive.</p></div><button className="btn btn-secondary" onClick={simulatePMSMigration}>Relancer l’import</button></div>{run && <><div className="pms-migration-overview"><div><span>Source</span><strong>{run.source}</strong></div><div><span>Champs mappés</span><strong>{run.mappedFields || 0}/48</strong></div><div><span>Avertissements</span><strong>{run.warnings}</strong></div><div><span>Statut</span><strong>{run.status === 'validated' ? 'Prêt à basculer' : 'Contrôle requis'}</strong></div></div><div className="pms-migration-checks">{checks.map(([label, value, ok]) => <article key={String(label)}><span className={ok ? 'ok' : 'warning'}>{ok ? <CheckCircle size={17} /> : <ListChecks size={17} />}</span><strong>{label}</strong><b>{String(value)}</b></article>)}</div><div className="pms-cutover-steps">{['Import test Orchestra', 'Rapprochement clients et séjours', 'Comparaison des soldes', 'Exploitation parallèle', 'Bascule établissement'].map((label, index) => <div className={run.status === 'validated' || index < 2 ? 'done' : ''} key={label}><span>{run.status === 'validated' || index < 2 ? <CheckCircle size={15} /> : index + 1}</span><strong>{label}</strong></div>)}</div><button className="btn btn-primary" disabled={run.status === 'validated'} onClick={() => validatePMSMigrationRun(run.id)}><ShieldCheck size={16} /> {run.status === 'validated' ? 'Reprise validée' : 'Rapprocher et valider la reprise'}</button></>}</section>;
};
