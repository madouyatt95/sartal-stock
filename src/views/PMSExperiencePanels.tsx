import React, { useMemo, useState } from 'react';
import {
  BedDouble,
  BellRing,
  CalendarDays,
  Car,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  FileCheck2,
  KeyRound,
  MapPinned,
  Search,
  Shirt,
  Sparkles,
  Star,
  UserRound,
  UtensilsCrossed
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { PMSServiceRequest } from '../types';
import { downloadPMSPdf } from '../utils/pmsPdf';

interface PMSPanelProps {
  state: StockState;
}

const formatFCFA = (value: number) => new Intl.NumberFormat('fr-FR').format(Math.round(value)) + ' FCFA';
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

interface SearchProps extends PMSPanelProps {
  onNavigate: (tab: 'dashboard' | 'reservations' | 'rooms' | 'guests' | 'folios' | 'housekeeping') => void;
}

export const PMSGlobalSearch: React.FC<SearchProps> = ({ state, onNavigate }) => {
  const { db } = state;
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (normalized.length < 2) return [];
    const guests = db.pmsGuests.filter(guest => `${guest.fullName} ${guest.phone} ${guest.email || ''} ${guest.company || ''}`.toLowerCase().includes(normalized)).map(guest => ({ id: `guest-${guest.id}`, title: guest.fullName, detail: `${guest.phone} · ${guest.stays} séjour(s)`, tab: 'guests' as const, icon: <UserRound size={17} /> }));
    const reservations = db.pmsReservations.filter(reservation => { const guest = db.pmsGuests.find(item => item.id === reservation.guestId); const room = db.pmsRooms.find(item => item.id === reservation.roomId); return `${reservation.confirmationNumber} ${guest?.fullName || ''} ${room?.roomNumber || ''}`.toLowerCase().includes(normalized); }).map(reservation => ({ id: `reservation-${reservation.id}`, title: reservation.confirmationNumber, detail: `${db.pmsGuests.find(item => item.id === reservation.guestId)?.fullName} · ${reservation.roomId ? `chambre ${db.pmsRooms.find(item => item.id === reservation.roomId)?.roomNumber}` : 'à attribuer'}`, tab: 'reservations' as const, icon: <CalendarDays size={17} /> }));
    const rooms = db.pmsRooms.filter(room => `${room.roomNumber} ${room.roomType} ${room.floor}`.toLowerCase().includes(normalized)).map(room => ({ id: `room-${room.id}`, title: `Chambre ${room.roomNumber}`, detail: `${room.roomType} · ${room.floor}`, tab: 'rooms' as const, icon: <BedDouble size={17} /> }));
    const folios = db.pmsFolios.filter(folio => `${folio.guestName} ${folio.reservationNumber}`.toLowerCase().includes(normalized)).map(folio => ({ id: `folio-${folio.id}`, title: `Folio ${folio.reservationNumber}`, detail: folio.guestName, tab: 'folios' as const, icon: <CircleDollarSign size={17} /> }));
    const requests = db.pmsServiceRequests.filter(request => `${request.label} ${request.assignedTo}`.toLowerCase().includes(normalized)).map(request => ({ id: `request-${request.id}`, title: request.label, detail: `${request.assignedTo} · ${request.status}`, tab: 'dashboard' as const, icon: <BellRing size={17} /> }));
    return [...guests, ...reservations, ...rooms, ...folios, ...requests].slice(0, 8);
  }, [db, normalized]);

  return (
    <div className="pms-global-search">
      <div className="input-with-icon"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} className="form-control" type="search" placeholder="Rechercher client, chambre, réservation, folio..." /></div>
      {results.length > 0 && <div className="pms-global-results">{results.map(result => <button key={result.id} onClick={() => { onNavigate(result.tab); setQuery(''); }}>{result.icon}<span><strong>{result.title}</strong><small>{result.detail}</small></span><ChevronRight size={16} /></button>)}</div>}
    </div>
  );
};

export const PMSFloorPlan: React.FC<PMSPanelProps> = ({ state }) => {
  const { db } = state;
  const [selectedRoomId, setSelectedRoomId] = useState(db.pmsRooms[0]?.id || '');
  const floors = Array.from(new Set(db.pmsRooms.map(room => room.floor)));
  const selectedRoom = db.pmsRooms.find(room => room.id === selectedRoomId);
  const selectedReservation = db.pmsReservations.find(reservation => reservation.roomId === selectedRoomId && ['checked_in', 'confirmed'].includes(reservation.status));
  const selectedGuest = db.pmsGuests.find(guest => guest.id === selectedReservation?.guestId);
  const visual = (room: (typeof db.pmsRooms)[number]) => room.status === 'maintenance' ? 'maintenance' : room.status === 'occupied' ? 'occupied' : ['dirty', 'in_progress'].includes(room.housekeepingStatus) ? 'dirty' : db.pmsReservations.some(reservation => reservation.roomId === room.id && reservation.status === 'confirmed') ? 'reserved' : 'available';
  const labels = { available: 'Libre', occupied: 'Occupée', dirty: 'À nettoyer', maintenance: 'Maintenance', reserved: 'Réservée' };

  return (
    <section className="card pms-section-card pms-floor-plan">
      <div className="pms-section-header"><div><span className="pms-eyebrow"><MapPinned size={15} /> Vue par étage</span><h2>Plan des chambres</h2><p>L’état opérationnel de tout l’hôtel en un regard.</p></div><div className="pms-floor-legend">{Object.entries(labels).map(([status, label]) => <span className={status} key={status}><i />{label}</span>)}</div></div>
      <div className="pms-floor-layout"><div className="pms-floor-list">{floors.map(floor => <section key={floor}><strong>{floor}</strong><div>{db.pmsRooms.filter(room => room.floor === floor).map(room => { const status = visual(room); return <button key={room.id} className={`${status} ${selectedRoomId === room.id ? 'selected' : ''}`} onClick={() => setSelectedRoomId(room.id)}><BedDouble size={18} /><b>{room.roomNumber}</b><small>{labels[status]}</small></button>; })}</div></section>)}</div>{selectedRoom && <aside><span className={`pms-room-state ${visual(selectedRoom)}`}>{labels[visual(selectedRoom)]}</span><h3>Chambre {selectedRoom.roomNumber}</h3><p>{selectedRoom.roomType} · {selectedRoom.floor}</p><div><span>Capacité</span><strong>{selectedRoom.capacity} personne(s)</strong></div><div><span>Tarif</span><strong>{formatFCFA(selectedRoom.nightlyRate)}</strong></div><div><span>Client</span><strong>{selectedGuest?.fullName || 'Aucun client'}</strong></div><div><span>Entretien</span><strong>{selectedRoom.housekeepingStatus}</strong></div></aside>}</div>
    </section>
  );
};

export const PMSGuestCommandCenter: React.FC<PMSPanelProps> = ({ state }) => {
  const { db } = state;
  const [selectedGuestId, setSelectedGuestId] = useState(db.pmsGuests[0]?.id || '');
  const selected = db.pmsGuests.find(guest => guest.id === selectedGuestId);
  const reservations = db.pmsReservations.filter(item => item.guestId === selectedGuestId);
  const folios = db.pmsFolios.filter(item => item.guestId === selectedGuestId);
  const notifications = db.pmsNotifications.filter(item => reservations.some(reservation => reservation.id === item.reservationId));
  const requests = db.pmsServiceRequests.filter(item => reservations.some(reservation => reservation.id === item.reservationId));
  const timeline = [
    ...reservations.map(item => ({ id: item.id, date: item.arrivalDate, title: `Séjour ${item.confirmationNumber}`, detail: `${formatDate(item.arrivalDate)} au ${formatDate(item.departureDate)} · ${item.status}` })),
    ...notifications.map(item => ({ id: item.id, date: item.sentAt || item.scheduledAt, title: `Message ${item.channel}`, detail: item.type.replaceAll('_', ' ') })),
    ...requests.map(item => ({ id: item.id, date: item.scheduledAt, title: item.label, detail: `${item.assignedTo} · ${item.status}` }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (!selected) return null;
  return (
    <section className="card pms-section-card pms-guest-command">
      <div className="pms-section-header"><div><span className="pms-eyebrow"><UserRound size={15} /> Relation client</span><h2>Dossier client 360°</h2><p>Séjours, préférences, dépenses, services et communications.</p></div></div>
      <div className="pms-guest-command-layout"><div className="pms-guest-selector">{db.pmsGuests.map(guest => <button className={guest.id === selectedGuestId ? 'active' : ''} key={guest.id} onClick={() => setSelectedGuestId(guest.id)}><span>{guest.fullName.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><strong>{guest.fullName}</strong><small>{guest.phone}</small></div></button>)}</div><div className="pms-guest-profile"><header><div className="pms-avatar large">{selected.fullName.split(' ').map(part => part[0]).slice(0, 2).join('')}</div><div><h3>{selected.fullName}</h3><p>{selected.nationality || 'Nationalité non renseignée'} · {selected.company || 'Client particulier'}</p></div><span className={`badge ${selected.loyaltyTier === 'gold' ? 'badge-yellow' : 'badge-blue'}`}><Star size={13} /> {selected.loyaltyTier || 'standard'}</span></header><div className="pms-guest-stats"><div><span>Séjours</span><strong>{selected.stays}</strong></div><div><span>Folios</span><strong>{folios.length}</strong></div><div><span>Dépenses</span><strong>{formatFCFA(folios.flatMap(folio => folio.charges).reduce((sum, charge) => sum + charge.amount, 0))}</strong></div><div><span>Demandes</span><strong>{requests.length}</strong></div></div><div className="pms-guest-preferences"><strong>Préférences</strong><span>{selected.preferences || 'Aucune préférence enregistrée'}</span><small>{selected.documentType ? `${selected.documentType.replace('_', ' ')} · ${selected.documentNumber}` : 'Identité à compléter'}</small></div><div className="pms-guest-timeline">{timeline.map(item => <article key={item.id}><i /><div><strong>{item.title}</strong><span>{item.detail}</span></div><time>{formatDate(item.date.slice(0, 10))}</time></article>)}</div></div></div>
    </section>
  );
};

const serviceTemplates: Array<{ type: PMSServiceRequest['type']; label: string; assignedTo: string; amount: number; icon: React.ReactNode }> = [
  { type: 'airport_transfer', label: 'Transfert aéroport', assignedTo: 'Conciergerie', amount: 25000, icon: <Car size={18} /> },
  { type: 'breakfast', label: 'Petit-déjeuner', assignedTo: 'Restaurant', amount: 9000, icon: <UtensilsCrossed size={18} /> },
  { type: 'laundry', label: 'Blanchisserie', assignedTo: 'Service étage', amount: 6000, icon: <Shirt size={18} /> },
  { type: 'special_request', label: 'Demande spéciale', assignedTo: 'Réception', amount: 0, icon: <Sparkles size={18} /> }
];

export const PMSServiceDesk: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, addPMSServiceRequest, updatePMSServiceRequest } = state;
  const activeReservations = db.pmsReservations.filter(item => item.status === 'checked_in');
  const [reservationId, setReservationId] = useState(activeReservations[0]?.id || '');
  const selectedReservation = db.pmsReservations.find(item => item.id === reservationId);
  const nextStatus: Record<PMSServiceRequest['status'], PMSServiceRequest['status']> = { requested: 'assigned', assigned: 'in_progress', in_progress: 'completed', completed: 'completed' };
  const statusLabels = { requested: 'Demandée', assigned: 'Affectée', in_progress: 'En cours', completed: 'Terminée' };
  const add = (template: typeof serviceTemplates[number]) => {
    if (!selectedReservation) return;
    addPMSServiceRequest({ reservationId: selectedReservation.id, roomId: selectedReservation.roomId, type: template.type, label: template.label, priority: template.type === 'airport_transfer' ? 'urgent' : 'normal', scheduledAt: new Date().toISOString(), assignedTo: template.assignedTo, amount: template.amount });
  };
  return (
    <section className="card pms-section-card pms-service-desk">
      <div className="pms-section-header"><div><span className="pms-eyebrow"><BellRing size={15} /> Services clients</span><h2>Demandes et conciergerie</h2><p>Chaque demande est affectée, suivie et éventuellement facturée.</p></div><select className="form-control" value={reservationId} onChange={event => setReservationId(event.target.value)}>{activeReservations.map(reservation => <option value={reservation.id} key={reservation.id}>Chambre {db.pmsRooms.find(room => room.id === reservation.roomId)?.roomNumber} · {db.pmsGuests.find(guest => guest.id === reservation.guestId)?.fullName}</option>)}</select></div>
      <div className="pms-service-quick">{serviceTemplates.map(template => <button key={template.type} onClick={() => add(template)}>{template.icon}<span><strong>{template.label}</strong><small>{template.amount ? formatFCFA(template.amount) : 'Sans frais'}</small></span></button>)}</div>
      <div className="pms-service-list">{db.pmsServiceRequests.map(request => { const reservation = db.pmsReservations.find(item => item.id === request.reservationId); const room = db.pmsRooms.find(item => item.id === (request.roomId || reservation?.roomId)); return <article key={request.id}><div><span className={`pms-service-status ${request.status}`}><i />{statusLabels[request.status]}</span><strong>{request.label}</strong><small>Chambre {room?.roomNumber} · {request.assignedTo}</small></div><div><time><Clock3 size={14} /> {new Date(request.scheduledAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time><strong>{request.amount ? formatFCFA(request.amount) : 'Inclus'}</strong></div><button className="btn btn-secondary" disabled={request.status === 'completed'} onClick={() => updatePMSServiceRequest(request.id, nextStatus[request.status])}>{request.status === 'completed' ? <><CheckCircle size={15} /> Terminée</> : 'Étape suivante'}</button></article>; })}</div>
    </section>
  );
};

export const PMSRateCalendar: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, upsertPMSRateOverride } = state;
  const roomTypes = Array.from(new Set(db.pmsRooms.map(room => room.roomType)));
  const [roomType, setRoomType] = useState(roomTypes[0] || 'Standard');
  const dates = Array.from({ length: 14 }, (_, index) => { const date = new Date(`${db.pmsSettings.businessDate}T12:00:00`); date.setDate(date.getDate() + index); return date.toISOString().slice(0, 10); });
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const plan = db.pmsRatePlans.find(item => item.roomType === roomType && item.active);
  const override = db.pmsRateOverrides.find(item => item.date === selectedDate && item.roomType === roomType);
  const [price, setPrice] = useState(override?.price || plan?.baseRate || 0);
  const [reason, setReason] = useState(override?.reason || 'Tarif public');
  const [closed, setClosed] = useState(override?.closed || false);
  const selectDate = (date: string) => { const current = db.pmsRateOverrides.find(item => item.date === date && item.roomType === roomType); setSelectedDate(date); setPrice(current?.price || plan?.baseRate || 0); setReason(current?.reason || 'Tarif public'); setClosed(current?.closed || false); };
  const changeType = (value: string) => { setRoomType(value); const nextPlan = db.pmsRatePlans.find(item => item.roomType === value && item.active); const current = db.pmsRateOverrides.find(item => item.date === selectedDate && item.roomType === value); setPrice(current?.price || nextPlan?.baseRate || 0); setReason(current?.reason || 'Tarif public'); setClosed(current?.closed || false); };
  return (
    <section className="card pms-section-card pms-rate-calendar">
      <div className="pms-section-header"><div><span className="pms-eyebrow"><CalendarDays size={15} /> Revenue management</span><h2>Calendrier tarifaire</h2><p>Prix et fermeture des ventes jour par jour.</p></div><select className="form-control" value={roomType} onChange={event => changeType(event.target.value)}>{roomTypes.map(type => <option key={type}>{type}</option>)}</select></div>
      <div className="pms-rate-days">{dates.map(date => { const item = db.pmsRateOverrides.find(entry => entry.date === date && entry.roomType === roomType); const value = item?.price || plan?.baseRate || 0; return <button className={`${selectedDate === date ? 'selected' : ''} ${item?.closed ? 'closed' : ''}`} key={date} onClick={() => selectDate(date)}><span>{new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' })}</span><strong>{formatDate(date)}</strong><b>{item?.closed ? 'Fermé' : formatFCFA(value)}</b></button>; })}</div>
      <div className="pms-rate-editor"><div><strong>{roomType} · {formatDate(selectedDate)}</strong><span>Tarif de base {formatFCFA(plan?.baseRate || 0)}</span></div><label>Prix<input className="form-control" type="number" value={price} onChange={event => setPrice(Number(event.target.value))} /></label><label>Motif<input className="form-control" value={reason} onChange={event => setReason(event.target.value)} /></label><label className="pms-rate-close"><input type="checkbox" checked={closed} onChange={event => setClosed(event.target.checked)} /> Fermer les ventes</label><button className="btn btn-primary" onClick={() => upsertPMSRateOverride({ date: selectedDate, roomType, price, reason, closed })}>Enregistrer</button></div>
    </section>
  );
};

export const PMSStayDocuments: React.FC<PMSPanelProps> = ({ state }) => {
  const { db } = state;
  const active = db.pmsReservations.filter(item => ['confirmed', 'checked_in'].includes(item.status));
  const [reservationId, setReservationId] = useState(active[0]?.id || '');
  const reservation = db.pmsReservations.find(item => item.id === reservationId);
  const guest = db.pmsGuests.find(item => item.id === reservation?.guestId);
  const room = db.pmsRooms.find(item => item.id === reservation?.roomId);
  const download = (kind: 'confirmation' | 'registration') => {
    if (!reservation || !guest) return;
    const title = kind === 'confirmation' ? 'Confirmation de reservation' : "Fiche d'arrivee";
    downloadPMSPdf(`${kind}-${reservation.confirmationNumber}.pdf`, `${db.pmsSettings.hotelName} - ${title}`, [
      `Reference : ${reservation.confirmationNumber}`,
      `Client : ${guest.fullName}`,
      `Telephone : ${guest.phone}`,
      `Arrivee : ${reservation.arrivalDate} a ${reservation.estimatedArrivalTime || db.pmsSettings.checkInTime}`,
      `Depart : ${reservation.departureDate}`,
      `Hebergement : ${room ? `Chambre ${room.roomNumber} - ${room.roomType}` : `${reservation.requestedRoomType} - attribution ulterieure`}`,
      `Voyageurs : ${reservation.adults} adulte(s), ${reservation.children} enfant(s)`,
      `Tarif : ${formatFCFA(reservation.nightlyRate)} par nuit`,
      kind === 'registration' ? 'Signature client : ______________________________' : 'Votre reservation est confirmee. Merci de votre confiance.'
    ]);
  };
  return (
    <section className="card pms-section-card pms-stay-documents"><div className="pms-section-header"><div><span className="pms-eyebrow"><FileCheck2 size={15} /> Documents clients</span><h2>Documents de séjour</h2><p>Des fichiers PDF prêts à envoyer ou imprimer.</p></div><select className="form-control" value={reservationId} onChange={event => setReservationId(event.target.value)}>{active.map(item => <option key={item.id} value={item.id}>{item.confirmationNumber} · {db.pmsGuests.find(guestItem => guestItem.id === item.guestId)?.fullName}</option>)}</select></div><div className="pms-document-premium"><article><FileCheck2 size={24} /><div><strong>Confirmation de réservation</strong><span>Dates, catégorie, tarif et référence.</span></div><button className="btn btn-secondary" onClick={() => download('confirmation')}><Download size={16} /> PDF</button></article><article><KeyRound size={24} /><div><strong>Fiche d’arrivée</strong><span>Identité, séjour, chambre et signature.</span></div><button className="btn btn-secondary" onClick={() => download('registration')}><Download size={16} /> PDF</button></article></div>
    </section>
  );
};
