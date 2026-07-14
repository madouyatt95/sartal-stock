import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  BellRing,
  Building2,
  CheckCircle,
  Clock3,
  CreditCard,
  DoorOpen,
  FileText,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  Move,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  WalletCards,
  X
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { PMSReservation } from '../types';

interface PMSPanelProps {
  state: StockState;
}

const formatFCFA = (value: number) => new Intl.NumberFormat('fr-FR').format(Math.round(value)) + ' FCFA';
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const getAvailableRooms = (state: StockState, reservation: PMSReservation) => state.db.pmsRooms.filter(room => (
  room.status !== 'maintenance'
  && (!reservation.requestedRoomType || room.roomType === reservation.requestedRoomType)
  && room.capacity >= reservation.adults + reservation.children
  && !state.db.pmsReservations.some(item => (
    item.id !== reservation.id
    && item.roomId === room.id
    && !['cancelled', 'no_show', 'checked_out', 'waitlisted'].includes(item.status)
    && reservation.arrivalDate < item.departureDate
    && reservation.departureDate > item.arrivalDate
  ))
));

export const PMSFrontDeskCommand: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, assignPMSRoom, holdPMSRoom, completePMSCheckIn, sendPMSNotification } = state;
  const today = db.pmsSettings.businessDate;
  const arrivals = db.pmsReservations.filter(item => item.arrivalDate === today && item.status === 'confirmed');
  const departures = db.pmsReservations.filter(item => item.departureDate === today && item.status === 'checked_in');
  const inHouse = db.pmsReservations.filter(item => item.status === 'checked_in');
  const unassigned = db.pmsReservations.filter(item => !item.roomId && item.status === 'confirmed');
  const vipArrivals = arrivals.filter(item => db.pmsGuests.find(guest => guest.id === item.guestId)?.loyaltyTier === 'gold');
  const earlyArrivals = arrivals.filter(item => (item.estimatedArrivalTime || db.pmsSettings.checkInTime) < db.pmsSettings.checkInTime);
  const roomsNotReady = arrivals.filter(item => {
    const room = db.pmsRooms.find(roomItem => roomItem.id === item.roomId);
    return room && !['clean', 'inspected'].includes(room.housekeepingStatus);
  });
  const balancesDue = departures.filter(item => {
    const folio = db.pmsFolios.find(folioItem => folioItem.reservationId === item.id);
    return folio && folio.charges.reduce((sum, charge) => sum + charge.amount, 0) > folio.payments.reduce((sum, payment) => sum + payment.amount, 0);
  });
  const [selectedId, setSelectedId] = useState(arrivals[0]?.id || inHouse[0]?.id || unassigned[0]?.id || '');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [checkInId, setCheckInId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [checklist, setChecklist] = useState({ identity: false, guarantee: false, payment: false, signature: false, keyIssued: false });
  const selected = db.pmsReservations.find(item => item.id === selectedId);
  const selectedGuest = db.pmsGuests.find(item => item.id === selected?.guestId);
  const selectedRoom = db.pmsRooms.find(item => item.id === selected?.roomId);
  const selectedFolio = db.pmsFolios.find(item => item.reservationId === selected?.id);
  const selectedNotifications = db.pmsNotifications.filter(item => item.reservationId === selected?.id);
  const assignReservation = db.pmsReservations.find(item => item.id === assigningId);
  const checkInReservation = db.pmsReservations.find(item => item.id === checkInId);

  const openCheckIn = (reservation: PMSReservation) => {
    if (!reservation.roomId) {
      setAssigningId(reservation.id);
      return;
    }
    setError('');
    setChecklist({
      identity: Boolean(db.pmsGuests.find(item => item.id === reservation.guestId)?.documentNumber),
      guarantee: reservation.guaranteeStatus === 'secured',
      payment: reservation.depositAmount > 0,
      signature: false,
      keyIssued: false
    });
    setCheckInId(reservation.id);
  };

  const completeCheckIn = () => {
    if (!checkInId) return;
    try {
      completePMSCheckIn(checkInId, checklist);
      setCheckInId(null);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Check-in impossible');
    }
  };

  const lanes = [
    { id: 'arrivals', title: 'Arrivées', subtitle: 'À accueillir', icon: <DoorOpen size={18} />, rows: arrivals, tone: 'arrival' },
    { id: 'inhouse', title: 'En séjour', subtitle: 'Clients présents', icon: <BedDouble size={18} />, rows: inHouse, tone: 'inhouse' },
    { id: 'departures', title: 'Départs', subtitle: 'À clôturer', icon: <ArrowRight size={18} />, rows: departures, tone: 'departure' }
  ];

  return (
    <>
      <section className="pms-frontdesk-command">
        <div className="pms-frontdesk-heading">
          <div><span className="pms-eyebrow"><UserCheck size={16} /> Réception en direct</span><h2>Poste de réception</h2><p>Les actions du jour réunies dans une seule vue.</p></div>
          <div className="pms-frontdesk-time"><Clock3 size={18} /><span>Journée hôtelière</span><strong>{formatDate(today)}</strong></div>
        </div>
        <div className="pms-frontdesk-kpis">
          <div><DoorOpen size={19} /><span>Arrivées</span><strong>{arrivals.length}</strong></div>
          <div><BedDouble size={19} /><span>En séjour</span><strong>{inHouse.length}</strong></div>
          <div><ArrowRight size={19} /><span>Départs</span><strong>{departures.length}</strong></div>
          <div className={unassigned.length ? 'warning' : ''}><Move size={19} /><span>À attribuer</span><strong>{unassigned.length}</strong></div>
        </div>
        <div className="pms-frontdesk-alerts">
          <span className={vipArrivals.length ? 'highlight' : ''}><Star size={15} /> {vipArrivals.length} arrivée(s) VIP</span>
          <span className={earlyArrivals.length ? 'warning' : ''}><Clock3 size={15} /> {earlyArrivals.length} arrivée(s) anticipée(s)</span>
          <span className={roomsNotReady.length ? 'danger' : ''}><Sparkles size={15} /> {roomsNotReady.length} chambre(s) non prête(s)</span>
          <span className={balancesDue.length ? 'warning' : ''}><CreditCard size={15} /> {balancesDue.length} solde(s) à encaisser</span>
          <span><BellRing size={15} /> {db.pmsServiceRequests.filter(item => item.priority === 'urgent' && item.status !== 'completed').length} demande(s) urgente(s)</span>
        </div>
        <div className="pms-frontdesk-board">
          {lanes.map(lane => (
            <section className={`pms-frontdesk-lane ${lane.tone}`} key={lane.id}>
              <header><span>{lane.icon}</span><div><strong>{lane.title}</strong><small>{lane.subtitle}</small></div><b>{lane.rows.length}</b></header>
              <div>
                {lane.rows.map(reservation => {
                  const guest = db.pmsGuests.find(item => item.id === reservation.guestId);
                  const room = db.pmsRooms.find(item => item.id === reservation.roomId);
                  const folio = db.pmsFolios.find(item => item.reservationId === reservation.id);
                  const balance = folio ? folio.charges.reduce((sum, item) => sum + item.amount, 0) - folio.payments.reduce((sum, item) => sum + item.amount, 0) : 0;
                  return (
                    <button key={reservation.id} onClick={() => setSelectedId(reservation.id)} className={selectedId === reservation.id ? 'selected' : ''}>
                      <div><strong>{guest?.fullName}</strong><span>{room ? `Chambre ${room.roomNumber}` : reservation.requestedRoomType || 'Catégorie à confirmer'}</span></div>
                      <small>{reservation.estimatedArrivalTime ? `Prévue ${reservation.estimatedArrivalTime}` : reservation.confirmationNumber}</small>
                      {lane.id === 'arrivals' && <span className="pms-lane-action" onClick={event => { event.stopPropagation(); openCheckIn(reservation); }}>Check-in</span>}
                      {lane.id === 'departures' && <span className={balance > 0 ? 'pms-lane-balance due' : 'pms-lane-balance'}>{balance > 0 ? formatFCFA(balance) : 'Soldé'}</span>}
                    </button>
                  );
                })}
                {lane.rows.length === 0 && <div className="pms-lane-empty">Aucune opération</div>}
              </div>
            </section>
          ))}
        </div>
      </section>

      {unassigned.length > 0 && (
        <section className="card pms-section-card pms-unassigned-queue">
          <div className="pms-section-header"><div><h2>Réservations à attribuer</h2><p>La catégorie est vendue, le numéro de chambre sera choisi au meilleur moment.</p></div><span className="badge badge-yellow">{unassigned.length} en attente</span></div>
          {unassigned.map(reservation => {
            const guest = db.pmsGuests.find(item => item.id === reservation.guestId);
            return <article key={reservation.id}><div><strong>{guest?.fullName}</strong><span>{reservation.requestedRoomType} · {formatDate(reservation.arrivalDate)} → {formatDate(reservation.departureDate)}</span></div><span>{reservation.adults + reservation.children} voyageur(s)</span><button className="btn btn-primary" onClick={() => setAssigningId(reservation.id)}><BedDouble size={16} /> Attribuer</button></article>;
          })}
        </section>
      )}

      {selected && (
        <section className="card pms-stay-360">
          <div className="pms-section-header"><div><span className="pms-eyebrow"><ShieldCheck size={15} /> Séjour 360°</span><h2>{selectedGuest?.fullName}</h2><p>{selected.confirmationNumber} · {formatDate(selected.arrivalDate)} au {formatDate(selected.departureDate)}</p></div><span className={`badge ${selected.status === 'checked_in' ? 'badge-green' : 'badge-blue'}`}>{selected.status === 'checked_in' ? 'En séjour' : 'Confirmée'}</span></div>
          <div className="pms-stay-360-grid">
            <div><BedDouble size={18} /><span>Chambre</span><strong>{selectedRoom ? `${selectedRoom.roomNumber} · ${selectedRoom.roomType}` : selected.requestedRoomType || 'Non attribuée'}</strong></div>
            <div><Users size={18} /><span>Voyageurs</span><strong>{selected.adults} adulte(s) · {selected.children} enfant(s)</strong></div>
            <div><WalletCards size={18} /><span>Garantie</span><strong>{selected.guaranteeStatus === 'secured' ? 'Sécurisée' : 'À compléter'}</strong></div>
            <div><CreditCard size={18} /><span>Solde folio</span><strong>{selectedFolio ? formatFCFA(selectedFolio.charges.reduce((sum, item) => sum + item.amount, 0) - selectedFolio.payments.reduce((sum, item) => sum + item.amount, 0)) : 'Folio à ouvrir'}</strong></div>
          </div>
          <div className="pms-stay-journey">
            <div className="done"><CheckCircle size={16} /><span>Réservation confirmée</span></div>
            <div className={selectedNotifications.some(item => item.status === 'sent') ? 'done' : ''}><MessageCircle size={16} /><span>Message pré-arrivée</span></div>
            <div className={selected.status === 'checked_in' ? 'done' : ''}><KeyRound size={16} /><span>Check-in et clé</span></div>
            <div className={selected.status === 'checked_out' ? 'done' : ''}><FileText size={16} /><span>Départ et facture</span></div>
          </div>
          <div className="mobile-card-actions">
            {!selected.roomId && <button className="btn btn-secondary" onClick={() => setAssigningId(selected.id)}>Attribuer une chambre</button>}
            {selected.status === 'confirmed' && <button className="btn btn-primary" onClick={() => openCheckIn(selected)}>Démarrer le check-in</button>}
            {selectedNotifications.find(item => item.status !== 'sent') && <button className="btn btn-secondary" onClick={() => sendPMSNotification(selectedNotifications.find(item => item.status !== 'sent')!.id)}><MessageCircle size={16} /> Envoyer le message</button>}
          </div>
        </section>
      )}

      {assignReservation && (
        <div className="modal-overlay" onClick={() => setAssigningId(null)}>
          <section className="modal-card pms-assignment-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header"><div><h2>Attribuer une chambre</h2><p>{assignReservation.requestedRoomType} · {formatDate(assignReservation.arrivalDate)} au {formatDate(assignReservation.departureDate)}</p></div><button className="icon-btn" onClick={() => setAssigningId(null)}><X size={19} /></button></div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="pms-assignment-grid">
              {getAvailableRooms(state, assignReservation).map(room => {
                const held = room.holdUntil && new Date(room.holdUntil).getTime() > Date.now();
                return <article key={room.id} className={held ? 'held' : ''}><div><strong>Chambre {room.roomNumber}</strong><span>{room.roomType} · {room.floor}</span></div><span className={`badge ${room.housekeepingStatus === 'inspected' ? 'badge-green' : 'badge-yellow'}`}>{room.housekeepingStatus === 'inspected' ? 'Prête' : 'À contrôler'}</span><p>{formatFCFA(room.nightlyRate)} / nuit · {room.capacity} pers.</p>{held && <small><LockKeyhole size={13} /> En attente par {room.holdBy}</small>}<div><button className="btn btn-secondary" onClick={() => { try { holdPMSRoom(room.id, assignReservation.id); setError(''); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Action impossible'); } }}><Clock3 size={15} /> Bloquer 10 min</button><button className="btn btn-primary" onClick={() => { try { assignPMSRoom(assignReservation.id, room.id, true); setAssigningId(null); setSelectedId(assignReservation.id); setError(''); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Attribution impossible'); } }}>Attribuer</button></div></article>;
              })}
            </div>
          </section>
        </div>
      )}

      {checkInReservation && (
        <div className="modal-overlay" onClick={() => setCheckInId(null)}>
          <section className="modal-card modal-card-sm pms-checkin-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header"><div><span className="pms-eyebrow"><KeyRound size={15} /> Check-in guidé</span><h2>{db.pmsGuests.find(item => item.id === checkInReservation.guestId)?.fullName}</h2><p>Chambre {db.pmsRooms.find(item => item.id === checkInReservation.roomId)?.roomNumber}</p></div><button className="icon-btn" onClick={() => setCheckInId(null)}><X size={19} /></button></div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="pms-checkin-list">
              {[
                ['identity', 'Identité vérifiée', 'Pièce d’identité et coordonnées'],
                ['guarantee', 'Garantie sécurisée', 'Acompte, carte ou prise en charge'],
                ['payment', 'Paiement contrôlé', 'Acompte correctement enregistré'],
                ['signature', 'Fiche signée', 'Conditions du séjour acceptées'],
                ['keyIssued', 'Clé remise', 'Accès à la chambre activé']
              ].map(([key, label, detail]) => <label key={key}><input type="checkbox" checked={checklist[key as keyof typeof checklist]} onChange={event => setChecklist({ ...checklist, [key]: event.target.checked })} /><span><strong>{label}</strong><small>{detail}</small></span><CheckCircle size={18} /></label>)}
            </div>
            <button className="btn btn-primary" onClick={completeCheckIn}><KeyRound size={17} /> Confirmer le check-in</button>
          </section>
        </div>
      )}
    </>
  );
};

export const PMSRoomRack: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, assignPMSRoom, releasePMSRoomHold } = state;
  const [draggedReservationId, setDraggedReservationId] = useState('');
  const [error, setError] = useState('');
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${db.pmsSettings.businessDate}T12:00:00`);
    date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  }), [db.pmsSettings.businessDate]);
  const activeReservations = db.pmsReservations.filter(item => !['cancelled', 'no_show', 'checked_out', 'waitlisted'].includes(item.status));
  const unassigned = activeReservations.filter(item => !item.roomId);
  const roomTypes = Array.from(new Set(db.pmsRooms.map(room => room.roomType)));

  const dropOnRoom = (roomId: string) => {
    if (!draggedReservationId) return;
    try {
      assignPMSRoom(draggedReservationId, roomId);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Déplacement impossible');
    }
    setDraggedReservationId('');
  };

  return (
    <>
      <section className="card pms-section-card pms-room-rack-section">
        <div className="pms-section-header"><div><span className="pms-eyebrow"><Move size={15} /> Room rack</span><h2>Planning opérationnel sur 7 jours</h2><p>Glissez une réservation vers une chambre pour l’attribuer ou la déplacer.</p></div><span className="badge badge-blue">{activeReservations.length} séjours actifs</span></div>
        {error && <div className="alert alert-danger">{error}</div>}
        {unassigned.length > 0 && <div className="pms-rack-unassigned"><strong>Sans chambre</strong>{unassigned.map(reservation => { const guest = db.pmsGuests.find(item => item.id === reservation.guestId); return <button draggable onDragStart={() => setDraggedReservationId(reservation.id)} key={reservation.id}><Move size={14} /><span>{guest?.fullName}<small>{reservation.requestedRoomType}</small></span></button>; })}</div>}
        <div className="pms-room-rack-wrap">
          <div className="pms-room-rack" style={{ '--rack-days': dates.length } as React.CSSProperties}>
            <div className="pms-rack-corner">Chambres</div>
            {dates.map(date => <div className="pms-rack-date" key={date}><strong>{new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' })}</strong><span>{formatDate(date)}</span></div>)}
            {db.pmsRooms.map(room => {
              const roomReservations = activeReservations.filter(item => item.roomId === room.id);
              const held = room.holdUntil && new Date(room.holdUntil).getTime() > Date.now();
              return <React.Fragment key={room.id}><div className="pms-rack-room"><strong>{room.roomNumber}</strong><span>{room.roomType}</span>{held && <button onClick={() => releasePMSRoomHold(room.id)} title="Libérer la mise en attente"><LockKeyhole size={13} /></button>}</div>{dates.map(date => { const reservation = roomReservations.find(item => date >= item.arrivalDate && date < item.departureDate); const guest = reservation ? db.pmsGuests.find(item => item.id === reservation.guestId) : undefined; const isStart = reservation?.arrivalDate === date || (reservation && date === dates[0]); return <div key={`${room.id}-${date}`} className={`pms-rack-cell ${reservation ? 'booked' : room.status === 'maintenance' ? 'maintenance' : 'available'}`} onDragOver={event => event.preventDefault()} onDrop={() => dropOnRoom(room.id)}>{reservation && isStart && <button draggable={!reservation.roomAssignmentLocked} onDragStart={() => setDraggedReservationId(reservation.id)} className={reservation.status === 'checked_in' ? 'inhouse' : ''} title={reservation.roomAssignmentLocked ? 'Attribution verrouillée' : 'Déplacer'}>{reservation.roomAssignmentLocked ? <LockKeyhole size={12} /> : <Move size={12} />}<span>{guest?.fullName?.split(' ')[0]}</span></button>}</div>; })}</React.Fragment>;
            })}
          </div>
        </div>
      </section>

      <section className="card pms-section-card">
        <div className="pms-section-header"><div><h2>Inventaire par catégorie</h2><p>La disponibilité se vend par type de chambre avant l’attribution du numéro.</p></div></div>
        <div className="pms-category-inventory">{roomTypes.map(type => { const rooms = db.pmsRooms.filter(room => room.roomType === type); const available = rooms.filter(room => room.status === 'vacant').length; const waiting = db.pmsReservations.filter(item => !item.roomId && item.requestedRoomType === type && item.status === 'confirmed').length; return <article key={type}><div><BedDouble size={19} /><strong>{type}</strong></div><span>{rooms.length} chambre(s)</span><b>{available} disponible(s)</b><small>{waiting} attribution(s) en attente</small></article>; })}</div>
      </section>
    </>
  );
};

export const PMSHousekeepingMobile: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, updatePMSHousekeepingTask, updatePMSHousekeepingDetails } = state;
  return (
    <section className="card pms-section-card pms-housekeeping-mobile">
      <div className="pms-section-header"><div><span className="pms-eyebrow"><Sparkles size={15} /> Équipe mobile</span><h2>Feuille de travail housekeeping</h2><p>Affectation, linge, minibar, preuves et temps d’intervention.</p></div></div>
      <div className="pms-housekeeping-mobile-list">
        {db.pmsHousekeepingTasks.map(task => {
          const room = db.pmsRooms.find(item => item.id === task.roomId);
          const elapsed = task.startedAt ? Math.max(1, Math.round((Date.now() - new Date(task.startedAt).getTime()) / 60000)) : 0;
          return <article key={task.id}><header><div><span className={`pms-room-dot ${room?.status}`} /><strong>Chambre {room?.roomNumber}</strong><small>{room?.roomType} · {task.assignedTo}</small></div><span className={`badge ${task.priority === 'urgent' ? 'badge-red' : 'badge-gray'}`}>{task.priority === 'urgent' ? 'Prioritaire' : 'Standard'}</span></header><div className="pms-housekeeping-facts"><button onClick={() => updatePMSHousekeepingDetails(task.id, { linenStatus: task.linenStatus === 'complete' ? 'missing' : 'complete' })}><span>Linge</span><strong>{task.linenStatus === 'complete' ? 'Complet' : 'À compléter'}</strong></button><button onClick={() => updatePMSHousekeepingDetails(task.id, { minibarStatus: task.minibarStatus === 'checked' ? 'restock' : 'checked' })}><span>Minibar</span><strong>{task.minibarStatus === 'checked' ? 'Contrôlé' : 'À réassortir'}</strong></button><button onClick={() => updatePMSHousekeepingDetails(task.id, { photoCount: (task.photoCount || 0) + 1 })}><span>Photos</span><strong>{task.photoCount || 0}</strong></button><div><span>Durée</span><strong>{elapsed ? `${elapsed} min` : 'Non démarrée'}</strong></div></div><div className="pms-housekeeping-actions">{task.status === 'pending' && <button className="btn btn-primary" onClick={() => updatePMSHousekeepingTask(task.id, 'in_progress')}>Démarrer</button>}{task.status === 'in_progress' && <button className="btn btn-primary" onClick={() => updatePMSHousekeepingTask(task.id, 'completed')}>Terminer</button>}{task.status === 'completed' && <button className="btn btn-primary" onClick={() => updatePMSHousekeepingTask(task.id, 'inspected')}>Contrôler</button>}{task.status === 'inspected' && <span className="badge badge-green"><CheckCircle size={14} /> Chambre prête</span>}</div></article>;
        })}
      </div>
    </section>
  );
};

export const PMSRevenueIntelligence: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, updatePMSRatePlan } = state;
  const [selectedPropertyId, setSelectedPropertyId] = useState(db.pmsPropertySummaries[0]?.id || '');
  const occupied = db.pmsRooms.filter(room => room.status === 'occupied').length;
  const occupancy = Math.round((occupied / Math.max(1, db.pmsRooms.length)) * 100);
  const roomRevenue = db.pmsFolios.flatMap(folio => folio.charges).filter(charge => charge.category === 'room').reduce((sum, charge) => sum + charge.amount, 0);
  const adr = occupied ? roomRevenue / occupied : 0;
  const revPar = db.pmsRooms.length ? roomRevenue / db.pmsRooms.length : 0;
  const noShows = db.pmsReservations.filter(item => item.status === 'no_show').length;
  const cancellations = db.pmsReservations.filter(item => item.status === 'cancelled').length;
  const forecast = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${db.pmsSettings.businessDate}T12:00:00`);
    date.setDate(date.getDate() + index);
    const iso = date.toISOString().slice(0, 10);
    const booked = db.pmsReservations.filter(item => !['cancelled', 'no_show', 'waitlisted'].includes(item.status) && item.arrivalDate <= iso && item.departureDate > iso).length;
    return { date: iso, occupancy: Math.round((booked / Math.max(1, db.pmsRooms.length)) * 100), booked };
  });
  const maxForecast = Math.max(1, ...forecast.map(item => item.occupancy));

  return (
    <>
      <section className="card pms-section-card pms-revenue-center">
        <div className="pms-section-header"><div><span className="pms-eyebrow"><TrendingUp size={15} /> Revenue management</span><h2>Performance et prévision</h2><p>Occupation, prix moyen, revenu disponible et rythme des réservations.</p></div></div>
        <div className="pms-revenue-kpis"><div><span>ADR</span><strong>{formatFCFA(adr)}</strong><small>Prix moyen vendu</small></div><div><span>RevPAR</span><strong>{formatFCFA(revPar)}</strong><small>Revenu par chambre disponible</small></div><div><span>Occupation</span><strong>{occupancy}%</strong><small>{occupied}/{db.pmsRooms.length} chambres</small></div><div><span>Annulations / no-show</span><strong>{cancellations + noShows}</strong><small>{noShows} non-présentation(s)</small></div></div>
        <div className="pms-forecast"><div><strong>Prévision 7 jours</strong><span>Chambres réservées et taux attendu</span></div><div className="pms-forecast-bars">{forecast.map(item => <div key={item.date}><i style={{ height: `${Math.max(8, (item.occupancy / maxForecast) * 100)}%` }} /><strong>{item.occupancy}%</strong><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' })}</span></div>)}</div></div>
      </section>

      <section className="card pms-section-card">
        <div className="pms-section-header"><div><h2>Suggestions tarifaires</h2><p>Le tarif conseillé applique la pression d’occupation configurée par plan.</p></div></div>
        <div className="pms-yield-grid">{db.pmsRatePlans.filter(plan => plan.active).map(plan => { const suggested = Math.round(plan.baseRate * (1 + (occupancy >= 70 ? (plan.occupancyAdjustment || 0) / 100 : 0))); return <article key={plan.id}><div><strong>{plan.name}</strong><span>{plan.roomType} · minimum {plan.minStay || 1} nuit(s)</span></div><div><small>Actuel</small><span>{formatFCFA(plan.baseRate)}</span></div><div><small>Conseillé</small><strong>{formatFCFA(suggested)}</strong></div><button className="btn btn-secondary" disabled={suggested === plan.baseRate} onClick={() => updatePMSRatePlan(plan.id, { baseRate: suggested })}>Appliquer</button></article>; })}</div>
      </section>

      <section className="card pms-section-card pms-central-reservation">
        <div className="pms-section-header"><div><span className="pms-eyebrow"><Building2 size={15} /> Réservation centrale</span><h2>Disponibilité multi-hôtels</h2><p>Comparer immédiatement les établissements du groupe.</p></div></div>
        <div>{db.pmsPropertySummaries.map(property => { const available = property.rooms - property.occupiedRooms; const selected = property.id === selectedPropertyId; return <article className={selected ? 'selected' : ''} key={property.id}><div><Building2 size={19} /><span><strong>{property.name}</strong><small>{property.city}</small></span></div><b>{available} chambre(s) disponible(s)</b><span>{Math.round((property.occupiedRooms / property.rooms) * 100)}% occupé</span><button className="btn btn-secondary" onClick={() => setSelectedPropertyId(property.id)}>{selected ? 'Sélectionné' : 'Consulter'}</button></article>; })}</div>
        {db.pmsPropertySummaries.find(property => property.id === selectedPropertyId) && <p className="pms-central-selection"><CheckCircle size={16} /> Établissement sélectionné pour la recherche centralisée et le suivi groupe.</p>}
      </section>
    </>
  );
};
