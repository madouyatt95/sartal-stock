import React, { useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle,
  ClipboardCheck,
  CreditCard,
  Download,
  FileSpreadsheet,
  Filter,
  Hotel,
  LayoutDashboard,
  LogIn,
  LogOut,
  MoonStar,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { PAYMENT_TYPE_LABELS, PaymentType, PMSReservation, PMSReservationStatus, PMSSettings } from '../types';
import {
  PMSAuditTrail,
  PMSBillingPanel,
  PMSCommercialSettings,
  PMSDayScenario,
  PMSGroupsEvents,
  PMSGuestRelations,
  PMSMaintenancePanel,
  PMSMultiSitePanel,
  PMSRoleDashboard
} from './PMSAdvancedPanels';
import {
  PMSFrontDeskCommand,
  PMSHousekeepingMobile,
  PMSRevenueIntelligence,
  PMSRoomRack
} from './PMSPremiumOperations';

interface PMSHotelProps {
  state: StockState;
  setView: (view: string) => void;
  initialTab?: PMSTab;
}

type PMSTab = 'dashboard' | 'planning' | 'reservations' | 'rooms' | 'guests' | 'folios' | 'housekeeping' | 'audit' | 'reports' | 'settings';

const formatFCFA = (value: number) => (
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
);

const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

const reservationMeta: Record<PMSReservationStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmée', className: 'badge-blue' },
  checked_in: { label: 'Présent', className: 'badge-green' },
  checked_out: { label: 'Parti', className: 'badge-gray' },
  cancelled: { label: 'Annulée', className: 'badge-red' },
  no_show: { label: 'Non présenté', className: 'badge-yellow' },
  waitlisted: { label: 'Liste d’attente', className: 'badge-yellow' }
};

const sourceLabels: Record<PMSReservation['source'], string> = {
  direct: 'Direct',
  phone: 'Téléphone',
  agency: 'Agence',
  company: 'Entreprise',
  online: 'En ligne'
};

const housekeepingLabels = {
  clean: 'Propre',
  dirty: 'À nettoyer',
  inspected: 'Contrôlée',
  in_progress: 'En cours'
};

const taskLabels = {
  pending: 'À faire',
  in_progress: 'En cours',
  completed: 'Nettoyée',
  inspected: 'Contrôlée'
};

const getNights = (arrival: string, departure: string) => Math.max(1, Math.ceil((new Date(departure).getTime() - new Date(arrival).getTime()) / 86400000));

export const PMSHotel: React.FC<PMSHotelProps> = ({ state, setView, initialTab = 'dashboard' }) => {
  const {
    db,
    togglePMSExport,
    createPMSReservation,
    updatePMSReservation,
    updatePMSReservationStatus,
    updatePMSRoom,
    updatePMSHousekeepingTask,
    addPMSFolioPayment,
    transferPMSFolioCharge,
    routePMSFolioCharge,
    runPMSNightAudit,
    updatePMSSettings
  } = state;
  const [activeTab, setActiveTab] = useState<PMSTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [roomFilter, setRoomFilter] = useState('all');
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [reservationStep, setReservationStep] = useState<1 | 2 | 3>(1);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [paymentFolioId, setPaymentFolioId] = useState<string | null>(null);
  const [transferChargeId, setTransferChargeId] = useState<string | null>(null);
  const [transferForm, setTransferForm] = useState({ targetFolioId: '', amount: 0 });
  const [selectedFolioId, setSelectedFolioId] = useState(db.pmsFolios.find(item => item.status === 'open')?.id || '');
  const [actionError, setActionError] = useState('');
  const [reservationForm, setReservationForm] = useState({
    guestName: '', phone: '', email: '', roomId: db.pmsRooms.find(room => room.status === 'vacant')?.id || '',
    arrivalDate: db.pmsSettings.businessDate, departureDate: '', adults: 1, children: 0,
    source: 'direct' as PMSReservation['source'], nightlyRate: 0, depositAmount: 0, notes: '',
    requestedRoomType: '', estimatedArrivalTime: '15:00',
    ratePlanId: '', guaranteeType: 'none' as NonNullable<PMSReservation['guaranteeType']>
  });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'wave' as PaymentType, reference: '' });
  const [settingsForm, setSettingsForm] = useState<PMSSettings>(db.pmsSettings);

  const today = db.pmsSettings.businessDate;
  const chargeRows = db.pmsFolios.flatMap(folio => folio.charges.map(charge => ({ folio, charge })));
  const openFolios = db.pmsFolios.filter(folio => folio.status === 'open');
  const occupiedRooms = db.pmsRooms.filter(room => room.status === 'occupied');
  const pendingCharges = chargeRows.filter(row => row.charge.status === 'pending');
  const arrivalsToday = db.pmsReservations.filter(item => item.arrivalDate === today && item.status === 'confirmed');
  const departuresToday = db.pmsReservations.filter(item => item.departureDate === today && item.status === 'checked_in');
  const dirtyRooms = db.pmsRooms.filter(room => room.housekeepingStatus === 'dirty' || room.housekeepingStatus === 'in_progress');
  const roomTypes = Array.from(new Set(db.pmsRooms.map(room => room.roomType)));

  const folioTotals = (folioId: string) => {
    const folio = db.pmsFolios.find(item => item.id === folioId);
    const charges = folio?.charges.reduce((sum, charge) => sum + charge.amount, 0) || 0;
    const payments = folio?.payments.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    return { charges, payments, balance: charges - payments };
  };

  const totalRevenue = db.pmsFolios.reduce((sum, folio) => sum + folio.charges.reduce((total, charge) => total + charge.amount, 0), 0);
  const totalPayments = db.pmsFolios.reduce((sum, folio) => sum + folio.payments.reduce((total, payment) => total + payment.amount, 0), 0);
  const occupancyRate = db.pmsRooms.length > 0 ? Math.round((occupiedRooms.length / db.pmsRooms.length) * 100) : 0;
  const averageRate = occupiedRooms.length > 0 ? Math.round(occupiedRooms.reduce((sum, room) => sum + room.nightlyRate, 0) / occupiedRooms.length) : 0;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredReservations = db.pmsReservations.filter(reservation => {
    const guest = db.pmsGuests.find(item => item.id === reservation.guestId);
    const room = db.pmsRooms.find(item => item.id === reservation.roomId);
    const matchesSearch = !normalizedSearch || `${guest?.fullName} ${guest?.phone} ${room?.roomNumber} ${reservation.requestedRoomType} ${reservation.confirmationNumber}`.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && ['confirmed', 'checked_in', 'waitlisted'].includes(reservation.status))
      || reservation.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));

  const getRoomVisualStatus = (room: (typeof db.pmsRooms)[number]) => {
    if (room.status === 'maintenance') return 'maintenance';
    if (room.status === 'occupied') return 'occupied';
    if (room.housekeepingStatus === 'dirty' || room.housekeepingStatus === 'in_progress') return 'dirty';
    return 'available';
  };

  const roomVisualMeta = {
    available: { label: 'Libre et prête', className: 'room-available' },
    occupied: { label: 'Occupée', className: 'room-occupied' },
    dirty: { label: 'À nettoyer', className: 'room-dirty' },
    maintenance: { label: 'Maintenance', className: 'room-maintenance' }
  };

  const filteredRooms = db.pmsRooms.filter(room => {
    const visualStatus = getRoomVisualStatus(room);
    return roomFilter === 'all'
      || roomFilter === visualStatus
      || (roomFilter === 'vacant' && room.status === 'vacant');
  });

  const availableRoomsForReservation = db.pmsRooms.filter(room => {
    if (room.status === 'maintenance' || room.capacity < reservationForm.adults + reservationForm.children || (reservationForm.requestedRoomType && room.roomType !== reservationForm.requestedRoomType)) return false;
    return !db.pmsReservations.some(reservation => (
      reservation.id !== editingReservationId
      && reservation.roomId === room.id
      && !['cancelled', 'no_show', 'checked_out', 'waitlisted'].includes(reservation.status)
      && reservationForm.arrivalDate < reservation.departureDate
      && reservationForm.departureDate > reservation.arrivalDate
    ));
  });
  const selectedReservationRoom = db.pmsRooms.find(room => room.id === reservationForm.roomId);
  const reservationNights = reservationForm.arrivalDate && reservationForm.departureDate
    ? getNights(reservationForm.arrivalDate, reservationForm.departureDate)
    : 0;

  const tabs: Array<{ id: PMSTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Tableau hôtel', icon: <LayoutDashboard size={17} /> },
    { id: 'planning', label: 'Planning', icon: <CalendarDays size={17} /> },
    { id: 'reservations', label: 'Réservations', icon: <ClipboardCheck size={17} /> },
    { id: 'rooms', label: 'Chambres', icon: <BedDouble size={17} /> },
    { id: 'guests', label: 'Clients', icon: <Users size={17} /> },
    { id: 'folios', label: 'Folios', icon: <ReceiptText size={17} /> },
    { id: 'housekeeping', label: 'Entretien', icon: <Sparkles size={17} /> },
    { id: 'audit', label: 'Clôture', icon: <MoonStar size={17} /> },
    { id: 'reports', label: 'Rapports', icon: <FileSpreadsheet size={17} /> },
    { id: 'settings', label: 'Réglages', icon: <Settings size={17} /> }
  ];

  const openCreateReservation = () => {
    const departure = new Date(`${today}T12:00:00`);
    departure.setDate(departure.getDate() + 2);
    const departureDate = departure.toISOString().slice(0, 10);
    const room = db.pmsRooms.find(item => (
      item.status === 'vacant'
      && item.housekeepingStatus !== 'dirty'
      && !db.pmsReservations.some(reservation => (
        reservation.roomId === item.id
        && !['cancelled', 'no_show', 'checked_out', 'waitlisted'].includes(reservation.status)
        && today < reservation.departureDate
        && departureDate > reservation.arrivalDate
      ))
    ));
    setEditingReservationId(null);
    setReservationForm({
      guestName: '', phone: '', email: '', roomId: room?.id || '', arrivalDate: today,
      departureDate, adults: 1, children: 0,
      source: 'direct', nightlyRate: room?.nightlyRate || 0, depositAmount: 0, notes: '',
      requestedRoomType: room?.roomType || db.pmsRooms[0]?.roomType || 'Standard', estimatedArrivalTime: '15:00',
      ratePlanId: '', guaranteeType: 'none'
    });
    setActionError('');
    setReservationStep(1);
    setReservationModalOpen(true);
  };

  const openEditReservation = (reservation: PMSReservation) => {
    const guest = db.pmsGuests.find(item => item.id === reservation.guestId);
    setEditingReservationId(reservation.id);
    setReservationForm({
      guestName: guest?.fullName || '', phone: guest?.phone || '', email: guest?.email || '',
      roomId: reservation.roomId, arrivalDate: reservation.arrivalDate, departureDate: reservation.departureDate,
      adults: reservation.adults, children: reservation.children, source: reservation.source,
      nightlyRate: reservation.nightlyRate, depositAmount: reservation.depositAmount, notes: reservation.notes || '',
      requestedRoomType: reservation.requestedRoomType || db.pmsRooms.find(item => item.id === reservation.roomId)?.roomType || 'Standard', estimatedArrivalTime: reservation.estimatedArrivalTime || '15:00',
      ratePlanId: reservation.ratePlanId || '', guaranteeType: reservation.guaranteeType || 'none'
    });
    setActionError('');
    setReservationStep(1);
    setReservationModalOpen(true);
  };

  const moveReservationStep = (nextStep: 1 | 2 | 3) => {
    setActionError('');
    if (nextStep > reservationStep && reservationStep === 1 && (
      !reservationForm.arrivalDate
      || !reservationForm.departureDate
      || reservationForm.departureDate <= reservationForm.arrivalDate
      || reservationForm.adults < 1
    )) {
      setActionError('Choisissez des dates valides et au moins un adulte.');
      return;
    }
    if (nextStep > reservationStep && reservationStep === 2 && reservationForm.roomId && !availableRoomsForReservation.some(room => room.id === reservationForm.roomId)) {
      setActionError('Sélectionnez une chambre disponible ou choisissez l’attribution ultérieure.');
      return;
    }
    setReservationStep(nextStep);
  };

  const saveReservation = (event: React.FormEvent) => {
    event.preventDefault();
    if (reservationStep < 3) {
      moveReservationStep((reservationStep + 1) as 2 | 3);
      return;
    }
    setActionError('');
    if (!reservationForm.requestedRoomType || !reservationForm.guestName.trim() || !reservationForm.phone.trim() || reservationForm.departureDate <= reservationForm.arrivalDate) {
      setActionError('Renseignez le client, son téléphone, la catégorie et des dates de séjour valides.');
      return;
    }
    try {
      if (editingReservationId) {
        updatePMSReservation(editingReservationId, {
          roomId: reservationForm.roomId,
          requestedRoomType: reservationForm.requestedRoomType,
          estimatedArrivalTime: reservationForm.estimatedArrivalTime,
          arrivalDate: reservationForm.arrivalDate,
          departureDate: reservationForm.departureDate,
          adults: reservationForm.adults,
          children: reservationForm.children,
          source: reservationForm.source,
          nightlyRate: reservationForm.nightlyRate,
          depositAmount: reservationForm.depositAmount,
          notes: reservationForm.notes,
          ratePlanId: reservationForm.ratePlanId,
          guaranteeType: reservationForm.guaranteeType
        });
      } else {
        createPMSReservation(reservationForm);
      }
      setReservationModalOpen(false);
      setActiveTab('reservations');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Impossible d’enregistrer cette réservation');
    }
  };

  const changeReservationStatus = (reservationId: string, status: PMSReservationStatus) => {
    try {
      setActionError('');
      updatePMSReservationStatus(reservationId, status);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Action impossible');
    }
  };

  const openPayment = (folioId: string) => {
    const totals = folioTotals(folioId);
    setPaymentForm({ amount: Math.max(0, totals.balance), method: 'wave', reference: '' });
    setPaymentFolioId(folioId);
  };

  const savePayment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentFolioId || paymentForm.amount <= 0) return;
    addPMSFolioPayment(paymentFolioId, paymentForm.amount, paymentForm.method, paymentForm.reference);
    setPaymentFolioId(null);
  };

  const openChargeTransfer = (chargeId: string, amount: number, sourceFolioId: string) => {
    const target = db.pmsFolios.find(item => item.id !== sourceFolioId && item.status === 'open');
    setTransferChargeId(chargeId);
    setTransferForm({ targetFolioId: target?.id || '', amount });
    setActionError('');
  };

  const saveChargeTransfer = (event: React.FormEvent) => {
    event.preventDefault();
    if (!transferChargeId) return;
    try {
      transferPMSFolioCharge(transferChargeId, transferForm.targetFolioId, transferForm.amount);
      setTransferChargeId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Transfert impossible');
    }
  };

  const exportFolios = () => {
    const rows = db.pmsFolios.map(folio => {
      const room = db.pmsRooms.find(item => item.id === folio.roomId);
      const totals = folioTotals(folio.id);
      return [folio.reservationNumber, room?.roomNumber || '', folio.guestName, folio.arrivalDate, folio.departureDate, totals.charges, totals.payments, totals.balance, folio.status];
    });
    const csv = ['Réservation;Chambre;Client;Arrivée;Départ;Charges;Paiements;Solde;Statut', ...rows.map(row => row.join(';'))].join('\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${csv}`)}`;
    link.download = `sartal_pms_folios_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderKpis = () => (
    <div className="grid-4 pms-kpi-grid">
      {[
        { icon: <Hotel size={21} />, label: 'Occupation', value: `${occupancyRate}%`, detail: `${occupiedRooms.length}/${db.pmsRooms.length} chambres` },
        { icon: <LogIn size={21} />, label: 'Arrivées du jour', value: arrivalsToday.length, detail: `${departuresToday.length} départ(s)` },
        { icon: <ReceiptText size={21} />, label: 'Solde à encaisser', value: formatFCFA(Math.max(0, totalRevenue - totalPayments)), detail: `${openFolios.length} folio(s) ouvert(s)` },
        { icon: <RefreshCcw size={21} />, label: 'À rapprocher', value: pendingCharges.length, detail: 'Consommations POS' }
      ].map(item => (
        <div className="card pms-kpi" key={item.label}>
          <div className="pms-kpi-icon">{item.icon}</div>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.detail}</small>
        </div>
      ))}
    </div>
  );

  const renderDashboard = () => (
    <>
      {renderKpis()}
      <PMSFrontDeskCommand state={state} />
      <PMSRoleDashboard state={state} />
      <section className="card pms-section-card">
        <div className="pms-section-header"><div><h2>Situation des chambres</h2><p>Disponibilité et état d’entretien.</p></div><button className="btn btn-secondary" onClick={() => setActiveTab('rooms')}>Voir les chambres</button></div>
        <div className="pms-room-summary">
          {[
            { label: 'Occupées', value: occupiedRooms.length, filter: 'occupied' },
            { label: 'Libres et prêtes', value: db.pmsRooms.filter(room => room.status === 'vacant' && ['clean', 'inspected'].includes(room.housekeepingStatus)).length, filter: 'available' },
            { label: 'À nettoyer', value: dirtyRooms.length, filter: 'dirty' },
            { label: 'Maintenance', value: db.pmsRooms.filter(room => room.status === 'maintenance').length, filter: 'maintenance' }
          ].map(item => <button key={item.label} onClick={() => { setRoomFilter(item.filter); setActiveTab('rooms'); }}><span>{item.label}</span><strong>{item.value}</strong></button>)}
        </div>
      </section>

      <section className="card pms-section-card">
        <div className="pms-section-header"><div><h2>Parcours opérationnel</h2><p>Les actions principales restent accessibles sans changer de module.</p></div></div>
        <div className="grid-4 pms-shortcuts">
          {[
            { icon: <Plus size={20} />, label: 'Nouvelle réservation', action: openCreateReservation },
            { icon: <CalendarDays size={20} />, label: 'Voir le planning', action: () => setActiveTab('planning') },
            { icon: <CreditCard size={20} />, label: 'Imputer une vente POS', action: () => setView('connectors') },
            { icon: <MoonStar size={20} />, label: 'Préparer la clôture', action: () => setActiveTab('audit') }
          ].map(item => <button key={item.label} onClick={item.action}>{item.icon}<span>{item.label}</span><ArrowRight size={17} /></button>)}
        </div>
      </section>
      <PMSDayScenario state={state} />
    </>
  );

  const renderPlanning = () => <PMSRoomRack state={state} />;

  const renderReservations = () => (
    <>
      <div className="card product-filter-panel pms-filter-bar">
        <div className="input-with-icon"><Search size={16} /><input type="search" className="form-control" placeholder="Client, téléphone, chambre, réservation..." value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /></div>
        <select className="form-control" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
          <option value="active">Séjours actifs</option><option value="all">Toutes</option><option value="confirmed">Confirmées</option><option value="waitlisted">Liste d’attente</option><option value="checked_in">Clients présents</option><option value="checked_out">Départs effectués</option><option value="no_show">Non présentés</option><option value="cancelled">Annulées</option>
        </select>
        <button className="btn btn-primary" onClick={openCreateReservation}><Plus size={17} /> Nouvelle réservation</button>
      </div>
      {actionError && <div className="alert alert-danger">{actionError}</div>}
      <div className="pms-reservation-list">
        {filteredReservations.map(reservation => {
          const guest = db.pmsGuests.find(item => item.id === reservation.guestId);
          const room = db.pmsRooms.find(item => item.id === reservation.roomId);
          return (
            <article className="card pms-reservation-card" key={reservation.id}>
              <div className="pms-reservation-main">
                <div><span className={`badge ${reservationMeta[reservation.status].className}`}>{reservationMeta[reservation.status].label}</span><h3>{guest?.fullName}</h3><p>{reservation.confirmationNumber} · {sourceLabels[reservation.source]}</p></div>
                <div className="pms-stay-dates"><span>{formatDate(reservation.arrivalDate)}</span><ArrowRight size={16} /><span>{formatDate(reservation.departureDate)}</span><small>{getNights(reservation.arrivalDate, reservation.departureDate)} nuit(s)</small></div>
              </div>
              <div className="pms-reservation-details"><span>{room ? 'Chambre' : 'Catégorie'} <strong>{room?.roomNumber || reservation.requestedRoomType || 'À attribuer'}</strong></span><span>{reservation.adults} adulte(s) · {reservation.children} enfant(s)</span><span><strong>{formatFCFA(reservation.nightlyRate)}</strong> / nuit</span><span>Acompte <strong>{formatFCFA(reservation.depositAmount)}</strong></span></div>
              <div className="mobile-card-actions pms-reservation-actions">
                <button className="btn btn-secondary" onClick={() => openEditReservation(reservation)}><Pencil size={16} /> Modifier</button>
                {reservation.status === 'confirmed' && <>{reservation.roomId ? <button className="btn btn-primary" onClick={() => setActiveTab('dashboard')}><LogIn size={16} /> Accueillir</button> : <button className="btn btn-primary" onClick={() => setActiveTab('dashboard')}><BedDouble size={16} /> Attribuer</button>}<button className="btn btn-secondary" onClick={() => changeReservationStatus(reservation.id, 'no_show')}>Non présenté</button><button className="btn btn-secondary" onClick={() => changeReservationStatus(reservation.id, 'cancelled')}>Annuler</button></>}
                {reservation.status === 'checked_in' && <button className="btn btn-primary" onClick={() => changeReservationStatus(reservation.id, 'checked_out')}><LogOut size={16} /> Check-out</button>}
                {reservation.status === 'waitlisted' && <button className="btn btn-primary" onClick={() => changeReservationStatus(reservation.id, 'confirmed')}>Confirmer si disponible</button>}
              </div>
            </article>
          );
        })}
      </div>
      <PMSGroupsEvents state={state} />
    </>
  );

  const renderRooms = () => (
    <>
      <div className="card pms-filter-bar">
        <div><Filter size={18} /><strong>État des chambres</strong></div>
        <select className="form-control" value={roomFilter} onChange={event => setRoomFilter(event.target.value)}><option value="all">Toutes les chambres</option><option value="available">Libres et prêtes</option><option value="occupied">Occupées</option><option value="dirty">À nettoyer</option><option value="maintenance">Maintenance</option></select>
        <div className="pms-room-legend" aria-label="Légende des états de chambre">
          {Object.entries(roomVisualMeta).map(([status, meta]) => <span key={status} className={meta.className}><i />{meta.label}</span>)}
        </div>
      </div>
      <div className="grid-4 pms-room-grid">
        {filteredRooms.map(room => {
          const reservation = db.pmsReservations.find(item => item.roomId === room.id && item.status === 'checked_in');
          const guest = reservation ? db.pmsGuests.find(item => item.id === reservation.guestId) : undefined;
          const visualStatus = getRoomVisualStatus(room);
          const visualMeta = roomVisualMeta[visualStatus];
          return (
            <article className={`card pms-room-card ${visualMeta.className}`} key={room.id}>
              <div className="pms-room-card-header"><div><strong>{room.roomNumber}</strong><span>{room.floor}</span></div><span className="pms-room-state-label"><i />{visualMeta.label}</span></div>
              <h3>{room.roomType}</h3><p>{room.capacity} personne(s) · {formatFCFA(room.nightlyRate)}/nuit</p>
              <div className="pms-room-statuses"><span className="badge pms-room-primary-badge">{visualMeta.label}</span><span className="badge badge-gray">Entretien : {housekeepingLabels[room.housekeepingStatus]}</span></div>
              {guest && <div className="pms-room-guest"><Users size={15} /><span>{guest.fullName}</span></div>}
              {room.maintenanceNote && <p className="pms-maintenance-note">{room.maintenanceNote}</p>}
              <div className="mobile-card-actions">
                {room.status !== 'occupied' && <button className="btn btn-secondary" onClick={() => updatePMSRoom(room.id, { status: room.status === 'maintenance' ? 'vacant' : 'maintenance', maintenanceNote: room.status === 'maintenance' ? '' : 'Contrôle technique demandé.' })}><Wrench size={15} /> {room.status === 'maintenance' ? 'Remettre en vente' : 'Maintenance'}</button>}
                {room.housekeepingStatus === 'dirty' && <button className="btn btn-primary" onClick={() => { setActiveTab('housekeeping'); }}>Nettoyer</button>}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );

  const renderGuests = () => (
    <>
      <div className="card pms-filter-bar"><div className="input-with-icon"><Search size={16} /><input className="form-control" placeholder="Nom, téléphone, entreprise..." value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /></div><span className="badge badge-blue">{db.pmsGuests.length} clients</span></div>
      <div className="grid-3">
        {db.pmsGuests.filter(guest => !normalizedSearch || `${guest.fullName} ${guest.phone} ${guest.company}`.toLowerCase().includes(normalizedSearch)).map(guest => {
          const reservations = db.pmsReservations.filter(item => item.guestId === guest.id);
          return <article className="card pms-guest-card" key={guest.id}><div className="pms-avatar">{guest.fullName.split(' ').map(part => part[0]).slice(0, 2).join('')}</div><div><div className="pms-guest-heading"><h3>{guest.fullName}</h3><span className={`badge ${guest.loyaltyTier === 'gold' ? 'badge-yellow' : guest.loyaltyTier === 'silver' ? 'badge-blue' : 'badge-gray'}`}>{guest.loyaltyTier || 'standard'}</span></div><p>{guest.phone}</p><p>{guest.email || 'E-mail non renseigné'}</p></div><div className="pms-guest-meta"><span>{guest.nationality || 'Nationalité non renseignée'}</span><span>{guest.company || 'Client particulier'}</span><span>{guest.documentType ? `${guest.documentType.replace('_', ' ')} · ${guest.documentNumber}` : 'Pièce d’identité à renseigner'}</span><strong>{guest.stays} séjour(s) · {reservations.length} réservation(s)</strong></div>{guest.preferences && <div className="pms-preference">Préférence : {guest.preferences}</div>}{guest.incidentNote && <div className="pms-maintenance-note">Incident : {guest.incidentNote}</div>}</article>;
        })}
      </div>
      <PMSGuestRelations state={state} />
    </>
  );

  const renderFolios = () => (
    <div className="pms-folio-layout">
      <section className="card pms-folio-list">
        <div className="pms-section-header"><div><h2>Folios clients</h2><p>Charges, paiements et solde du séjour.</p></div><button className="btn btn-secondary" onClick={exportFolios}><Download size={16} /> Exporter</button></div>
        {db.pmsFolios.map(folio => {
          const room = db.pmsRooms.find(item => item.id === folio.roomId);
          const totals = folioTotals(folio.id);
          return <button key={folio.id} className={selectedFolioId === folio.id ? 'active' : ''} onClick={() => setSelectedFolioId(folio.id)}><div><strong>Chambre {room?.roomNumber} · {folio.guestName}</strong><span>{folio.reservationNumber} · {folio.status === 'open' ? 'Ouvert' : 'Clôturé'}</span></div><strong className={totals.balance > 0 ? 'balance-due' : 'balance-paid'}>{formatFCFA(totals.balance)}</strong></button>;
        })}
      </section>
      {(() => {
        const folio = db.pmsFolios.find(item => item.id === selectedFolioId) || db.pmsFolios[0];
        if (!folio) return <section className="card mobile-empty-state">Aucun folio disponible.</section>;
        const room = db.pmsRooms.find(item => item.id === folio.roomId);
        const totals = folioTotals(folio.id);
        return (
          <section className="card pms-folio-detail">
            <div className="pms-folio-heading"><div><span>Folio {folio.reservationNumber}</span><h2>{folio.guestName}</h2><p>Chambre {room?.roomNumber} · {formatDate(folio.arrivalDate)} au {formatDate(folio.departureDate)}</p></div><button className="btn btn-primary" onClick={() => openPayment(folio.id)} disabled={totals.balance <= 0}><CreditCard size={16} /> Encaisser</button></div>
            <div className="pms-folio-totals"><div><span>Charges</span><strong>{formatFCFA(totals.charges)}</strong></div><div><span>Paiements</span><strong>{formatFCFA(totals.payments)}</strong></div><div className={totals.balance > 0 ? 'due' : 'paid'}><span>Solde</span><strong>{formatFCFA(totals.balance)}</strong></div></div>
            <h3>Charges du séjour</h3>
            <div className="pms-ledger">
              {folio.charges.map(charge => <div key={charge.id}><div><strong>{charge.label}</strong><span>{new Date(charge.date).toLocaleString('fr-FR')} · {charge.externalSaleId}</span></div><span className={`badge ${charge.status === 'pending' ? 'badge-yellow' : charge.status === 'exported' ? 'badge-blue' : 'badge-green'}`}>{charge.status === 'pending' ? 'À envoyer' : charge.status === 'exported' ? 'Envoyé' : 'Rapproché'}</span><strong>{formatFCFA(charge.amount)}</strong><div className="pms-ledger-actions"><select className="form-control pms-routing-select" aria-label="Destination de facturation" value={charge.billingWindow || 'guest'} onChange={event => routePMSFolioCharge(charge.id, event.target.value as 'guest' | 'company' | 'agency' | 'group')}><option value="guest">Client</option><option value="company">Entreprise</option><option value="agency">Agence</option><option value="group">Groupe</option></select>{charge.category === 'restaurant' && <button className="btn btn-secondary" onClick={() => togglePMSExport(charge.saleId)}>{charge.status === 'pending' ? 'Envoyer' : charge.status === 'exported' ? 'Rapprocher' : 'Rouvrir'}</button>}<button className="btn btn-secondary" onClick={() => openChargeTransfer(charge.id, charge.amount, folio.id)}>Transférer</button></div></div>)}
            </div>
            <h3>Paiements</h3>
            <div className="pms-ledger compact">{folio.payments.map(payment => <div key={payment.id}><div><strong>{PAYMENT_TYPE_LABELS[payment.method]}</strong><span>{new Date(payment.date).toLocaleString('fr-FR')} · {payment.reference || 'Sans référence'}</span></div><strong>{formatFCFA(payment.amount)}</strong></div>)}{folio.payments.length === 0 && <div className="mobile-empty-state">Aucun paiement enregistré.</div>}</div>
            <PMSBillingPanel state={state} folioId={folio.id} />
          </section>
        );
      })()}
    </div>
  );

  const renderHousekeeping = () => (
    <>
      <div className="grid-4 pms-kpi-grid">
        {(['pending', 'in_progress', 'completed', 'inspected'] as const).map(status => <div className="card pms-kpi" key={status}><Sparkles size={20} /><span>{taskLabels[status]}</span><strong>{db.pmsHousekeepingTasks.filter(task => task.status === status).length}</strong><small>Tâches du jour</small></div>)}
      </div>
      <div className="pms-task-board">
        {db.pmsHousekeepingTasks.map(task => {
          const room = db.pmsRooms.find(item => item.id === task.roomId);
          return <article className="card pms-task-card" key={task.id}><div><span className={`badge ${task.priority === 'urgent' ? 'badge-red' : 'badge-gray'}`}>{task.priority === 'urgent' ? 'Urgent' : 'Normal'}</span><h3>Chambre {room?.roomNumber}</h3><p>{room?.roomType} · {task.assignedTo}</p></div><p>{task.note || 'Entretien standard de la chambre.'}</p><div className="pms-task-progress">{(['pending', 'in_progress', 'completed', 'inspected'] as const).map(status => <button key={status} className={task.status === status ? 'active' : ''} onClick={() => updatePMSHousekeepingTask(task.id, status)}>{taskLabels[status]}</button>)}</div></article>;
        })}
      </div>
      <PMSHousekeepingMobile state={state} />
      <PMSMaintenancePanel state={state} />
    </>
  );

  const renderAudit = () => {
    const blockers = [
      { label: 'Consommations POS à envoyer', count: pendingCharges.length, action: () => setActiveTab('folios') },
      { label: 'Départs du jour non clôturés', count: departuresToday.length, action: () => setActiveTab('reservations') },
      { label: 'Arrivées sans chambre', count: db.pmsReservations.filter(item => !item.roomId && item.status === 'confirmed' && item.arrivalDate <= today).length, action: () => setActiveTab('dashboard') },
      { label: 'Chambres occupées incohérentes', count: db.pmsRooms.filter(room => room.status === 'occupied' && ['dirty', 'in_progress'].includes(room.housekeepingStatus)).length, action: () => setActiveTab('housekeeping') }
    ];
    const blockerCount = blockers.reduce((sum, item) => sum + item.count, 0);
    const closeDay = () => {
      try {
        setActionError('');
        runPMSNightAudit();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Clôture impossible');
      }
    };
    return (
      <>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card pms-section-card"><div className="pms-audit-title"><MoonStar size={26} /><div><h2>Clôture du {formatDate(today)}</h2><p>La journée ne peut avancer tant qu’une anomalie critique reste ouverte.</p></div></div>{actionError && <div className="alert alert-danger">{actionError}</div>}<div className="pms-audit-checks">{blockers.map(item => <button key={item.label} onClick={item.action}><span className={item.count === 0 ? 'check-ok' : 'check-warning'}>{item.count === 0 ? <CheckCircle size={19} /> : item.count}</span><strong>{item.label}</strong><ArrowRight size={17} /></button>)}</div><button className="btn btn-primary pms-audit-button" disabled={blockerCount > 0} onClick={closeDay}><MoonStar size={17} /> {blockerCount > 0 ? `Clôture bloquée · ${blockerCount} point(s)` : 'Clôturer la journée et passer au lendemain'}</button><p className="pms-audit-note">Chaque contrôle doit être au vert. La clôture produit ensuite un rapport horodaté et verrouille la journée.</p></section>
        <section className="card pms-section-card"><div className="pms-section-header"><div><h2>Historique des clôtures</h2><p>Recettes et soldes contrôlés par journée.</p></div></div><div className="pms-stack">{db.pmsNightAudits.map(audit => <div className="pms-night-row" key={audit.id}><div><strong>{formatDate(audit.businessDate)}</strong><span>{audit.completedBy} · {new Date(audit.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div><div><span>Hébergement {formatFCFA(audit.roomRevenue)}</span><span>POS {formatFCFA(audit.posRevenue)}</span><strong>Solde {formatFCFA(audit.openBalance)}</strong></div></div>)}</div></section>
      </div>
      <PMSAuditTrail state={state} />
      </>
    );
  };

  const renderReports = () => {
    const sources = (Object.keys(sourceLabels) as PMSReservation['source'][]).map(source => ({ source, count: db.pmsReservations.filter(item => item.source === source).length }));
    const maxSource = Math.max(1, ...sources.map(item => item.count));
    return <><PMSRevenueIntelligence state={state} /><div className="grid-4 pms-kpi-grid"><div className="card pms-kpi"><Hotel size={20} /><span>Taux d’occupation</span><strong>{occupancyRate}%</strong><small>{occupiedRooms.length} chambres occupées</small></div><div className="card pms-kpi"><ReceiptText size={20} /><span>Prix moyen</span><strong>{formatFCFA(averageRate)}</strong><small>Par chambre occupée</small></div><div className="card pms-kpi"><CreditCard size={20} /><span>Chiffre folios</span><strong>{formatFCFA(totalRevenue)}</strong><small>Hébergement et services</small></div><div className="card pms-kpi"><RefreshCcw size={20} /><span>Ventes POS chambre</span><strong>{formatFCFA(chargeRows.filter(row => row.charge.category === 'restaurant').reduce((sum, row) => sum + row.charge.amount, 0))}</strong><small>Restaurant vers PMS</small></div></div><div className="grid-2"><section className="card pms-section-card"><div className="pms-section-header"><div><h2>Origine des réservations</h2><p>Répartition des canaux de vente.</p></div></div><div className="pms-bars">{sources.map(item => <div key={item.source}><span>{sourceLabels[item.source]}</span><div><i style={{ width: `${(item.count / maxSource) * 100}%` }} /></div><strong>{item.count}</strong></div>)}</div></section><section className="card pms-section-card"><div className="pms-section-header"><div><h2>Exports de gestion</h2><p>Données directement exploitables pour le contrôle.</p></div></div><div className="pms-export-actions"><button className="btn btn-secondary" onClick={exportFolios}><FileSpreadsheet size={17} /> Folios et soldes</button><button className="btn btn-secondary" onClick={() => setView('exports')}><ReceiptText size={17} /> Rapports stock et POS</button><button className="btn btn-secondary" onClick={() => setActiveTab('audit')}><MoonStar size={17} /> Rapports de clôture</button></div></section></div><PMSMultiSitePanel state={state} /></>;
  };

  const renderSettings = () => (
    <>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <form className="card pms-section-card" onSubmit={event => { event.preventDefault(); updatePMSSettings(settingsForm); }}>
          <div className="pms-section-header"><div><h2>Paramètres de l’hôtel</h2><p>Horaires, fiscalité, journée d’exploitation et surbooking.</p></div></div>
          <div className="form-group"><label className="form-label">Nom de l’établissement</label><input className="form-control" value={settingsForm.hotelName} onChange={event => setSettingsForm({ ...settingsForm, hotelName: event.target.value })} /></div>
          <div className="grid-2"><div className="form-group"><label className="form-label">Heure d’arrivée</label><input type="time" className="form-control" value={settingsForm.checkInTime} onChange={event => setSettingsForm({ ...settingsForm, checkInTime: event.target.value })} /></div><div className="form-group"><label className="form-label">Heure de départ</label><input type="time" className="form-control" value={settingsForm.checkOutTime} onChange={event => setSettingsForm({ ...settingsForm, checkOutTime: event.target.value })} /></div></div>
          <div className="grid-2"><div className="form-group"><label className="form-label">Taxe de séjour / nuit</label><input type="number" className="form-control" value={settingsForm.cityTax} onChange={event => setSettingsForm({ ...settingsForm, cityTax: Number(event.target.value) })} /></div><div className="form-group"><label className="form-label">Taux de TVA (%)</label><input type="number" min="0" className="form-control" value={settingsForm.vatRate} onChange={event => setSettingsForm({ ...settingsForm, vatRate: Number(event.target.value) })} /></div></div>
          <div className="form-group"><label className="form-label">Journée hôtelière</label><input type="date" className="form-control" value={settingsForm.businessDate} onChange={event => setSettingsForm({ ...settingsForm, businessDate: event.target.value })} /></div>
          <label className="pms-setting-toggle"><input type="checkbox" checked={settingsForm.allowOverbooking} onChange={event => setSettingsForm({ ...settingsForm, allowOverbooking: event.target.checked })} /><span><strong>Autoriser le surbooking contrôlé</strong><small>Sinon, toute réservation en conflit passe automatiquement en liste d’attente.</small></span></label>
          {settingsForm.allowOverbooking && <div className="form-group"><label className="form-label">Limite de surbooking</label><input type="number" min="0" className="form-control" value={settingsForm.overbookingLimit} onChange={event => setSettingsForm({ ...settingsForm, overbookingLimit: Number(event.target.value) })} /></div>}
          <button className="btn btn-primary" type="submit"><ShieldCheck size={17} /> Enregistrer</button>
        </form>
        <section className="card pms-section-card"><div className="pms-section-header"><div><h2>Contrôles actifs</h2><p>Règles visibles par les équipes.</p></div></div>{['Une chambre en maintenance ne peut pas être attribuée.', 'Un conflit passe en liste d’attente si le surbooking est désactivé.', 'Le check-in ouvre automatiquement un folio.', 'Une vente restaurant conserve son ticket et son point de vente.', 'Le check-out clôture le folio et crée une tâche de nettoyage.', 'Chaque action sensible alimente le journal de sécurité.'].map(rule => <div className="proof-row" key={rule}><CheckCircle size={17} color="var(--success)" /><span>{rule}</span></div>)}</section>
      </div>
      <PMSCommercialSettings state={state} />
    </>
  );

  return (
    <div className="manager-mobile-page pms-page">
      <div className="demo-page-header pms-page-header">
        <div><span className="pms-eyebrow"><Hotel size={16} /> {db.pmsSettings.hotelName}</span><h1>Hôtel / PMS</h1><p>Réservations, réception, chambres, folios, entretien et clôture dans un parcours unique.</p></div>
        <div><button className="btn btn-secondary" onClick={() => setView('connectors')}><CreditCard size={17} /> Ouvrir la caisse POS</button><button className="btn btn-primary" onClick={openCreateReservation}><Plus size={17} /> Nouvelle réservation</button></div>
      </div>

      <nav className="pms-tabs" aria-label="Navigation du module Hôtel">
        {tabs.map(tab => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}>{tab.icon}<span>{tab.label}</span></button>)}
      </nav>

      <main className="pms-tab-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'planning' && renderPlanning()}
        {activeTab === 'reservations' && renderReservations()}
        {activeTab === 'rooms' && renderRooms()}
        {activeTab === 'guests' && renderGuests()}
        {activeTab === 'folios' && renderFolios()}
        {activeTab === 'housekeeping' && renderHousekeeping()}
        {activeTab === 'audit' && renderAudit()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {reservationModalOpen && (
        <div className="modal-overlay" onClick={() => setReservationModalOpen(false)}>
          <form className="modal-card pms-modal pms-reservation-modal" onSubmit={saveReservation} onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div><span className="pms-eyebrow"><CalendarDays size={15} /> Réservation</span><h2>{editingReservationId ? 'Modifier le séjour' : 'Nouvelle réservation'}</h2><p>Trois étapes pour vérifier la disponibilité et éviter les erreurs.</p></div>
              <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => setReservationModalOpen(false)}><X size={20} /></button>
            </div>

            <div className="pms-booking-steps">
              {[
                { step: 1 as const, label: 'Séjour', icon: <CalendarDays size={17} /> },
                { step: 2 as const, label: 'Chambre', icon: <BedDouble size={17} /> },
                { step: 3 as const, label: 'Client & tarif', icon: <Users size={17} /> }
              ].map(item => (
                <button key={item.step} type="button" className={reservationStep === item.step ? 'active' : reservationStep > item.step ? 'done' : ''} disabled={item.step > reservationStep} onClick={() => moveReservationStep(item.step)}>
                  <span>{reservationStep > item.step ? <CheckCircle size={17} /> : item.icon}</span><strong>{item.step}. {item.label}</strong>
                </button>
              ))}
            </div>

            {actionError && <div className="alert alert-danger">{actionError}</div>}

            <div className="pms-booking-body">
              {reservationStep === 1 && (
                <section className="pms-booking-section">
                  <div className="pms-booking-section-heading"><CalendarDays size={20} /><div><h3>Dates et voyageurs</h3><p>Les chambres proposées à l’étape suivante seront réellement disponibles.</p></div></div>
                  <div className="grid-2">
                    <div className="form-group"><label className="form-label">Date d’arrivée</label><input type="date" className="form-control" value={reservationForm.arrivalDate} onChange={event => setReservationForm({ ...reservationForm, arrivalDate: event.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Date de départ</label><input type="date" min={reservationForm.arrivalDate} className="form-control" value={reservationForm.departureDate} onChange={event => setReservationForm({ ...reservationForm, departureDate: event.target.value })} /></div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group"><label className="form-label">Adultes</label><input type="number" min="1" max="8" className="form-control" value={reservationForm.adults} onChange={event => setReservationForm({ ...reservationForm, adults: Number(event.target.value) })} /></div>
                    <div className="form-group"><label className="form-label">Enfants</label><input type="number" min="0" max="8" className="form-control" value={reservationForm.children} onChange={event => setReservationForm({ ...reservationForm, children: Number(event.target.value) })} /></div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group"><label className="form-label">Catégorie demandée</label><select className="form-control" value={reservationForm.requestedRoomType} onChange={event => { const roomType = event.target.value; const referenceRoom = db.pmsRooms.find(room => room.roomType === roomType); setReservationForm({ ...reservationForm, requestedRoomType: roomType, roomId: '', nightlyRate: referenceRoom?.nightlyRate || reservationForm.nightlyRate }); }}>{roomTypes.map(roomType => <option value={roomType} key={roomType}>{roomType}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">Heure d’arrivée estimée</label><input type="time" className="form-control" value={reservationForm.estimatedArrivalTime} onChange={event => setReservationForm({ ...reservationForm, estimatedArrivalTime: event.target.value })} /></div>
                  </div>
                  <div className="pms-booking-highlight"><MoonStar size={19} /><div><strong>{reservationNights} nuit(s) · {reservationForm.requestedRoomType}</strong><span>{reservationForm.adults + reservationForm.children} voyageur(s) · arrivée estimée à {reservationForm.estimatedArrivalTime || db.pmsSettings.checkInTime}</span></div></div>
                </section>
              )}

              {reservationStep === 2 && (
                <section className="pms-booking-section">
                  <div className="pms-booking-section-heading"><BedDouble size={20} /><div><h3>Attribuer la chambre</h3><p>{availableRoomsForReservation.length} chambre(s) {reservationForm.requestedRoomType} disponible(s). Le numéro peut être choisi plus tard.</p></div></div>
                  <button type="button" className={`pms-booking-later ${reservationForm.roomId ? '' : 'selected'}`} onClick={() => setReservationForm({ ...reservationForm, roomId: '' })}><CalendarDays size={19} /><span><strong>Attribuer le numéro plus tard</strong><small>La catégorie reste garantie et la réception choisira la meilleure chambre avant l’arrivée.</small></span><CheckCircle size={19} /></button>
                  <div className="pms-booking-room-grid">
                    {availableRoomsForReservation.map(room => {
                      const ready = ['clean', 'inspected'].includes(room.housekeepingStatus);
                      return (
                        <button key={room.id} type="button" className={`${reservationForm.roomId === room.id ? 'selected' : ''} ${ready ? 'ready' : 'prepare'}`} onClick={() => setReservationForm({ ...reservationForm, roomId: room.id, nightlyRate: room.nightlyRate })}>
                          <div><strong>Chambre {room.roomNumber}</strong><span>{room.roomType} · {room.floor}</span></div>
                          <span className="pms-booking-room-state"><i />{ready ? 'Prête' : 'À préparer'}</span>
                          <p>{room.capacity} personne(s)</p><strong>{formatFCFA(room.nightlyRate)} <small>/ nuit</small></strong>
                        </button>
                      );
                    })}
                  </div>
                  {availableRoomsForReservation.length === 0 && <div className="mobile-empty-state">Aucun numéro disponible immédiatement. La réservation peut rester confirmée par catégorie et être attribuée ultérieurement.</div>}
                </section>
              )}

              {reservationStep === 3 && (
                <section className="pms-booking-section">
                  <div className="pms-booking-section-heading"><Users size={20} /><div><h3>Client et conditions</h3><p>Coordonnées, origine de la réservation et garantie.</p></div></div>
                  <div className="grid-2"><div className="form-group"><label className="form-label">Nom complet</label><input className="form-control" required disabled={Boolean(editingReservationId)} value={reservationForm.guestName} onChange={event => setReservationForm({ ...reservationForm, guestName: event.target.value })} /></div><div className="form-group"><label className="form-label">Téléphone</label><input type="tel" className="form-control" required disabled={Boolean(editingReservationId)} value={reservationForm.phone} onChange={event => setReservationForm({ ...reservationForm, phone: event.target.value })} /></div></div>
                  <div className="form-group"><label className="form-label">E-mail <span className="form-optional">facultatif</span></label><input type="email" className="form-control" disabled={Boolean(editingReservationId)} value={reservationForm.email} onChange={event => setReservationForm({ ...reservationForm, email: event.target.value })} /></div>
                  <div className="pms-booking-subsection"><strong>Tarification et garantie</strong></div>
                  <div className="grid-2"><div className="form-group"><label className="form-label">Origine</label><select className="form-control" value={reservationForm.source} onChange={event => setReservationForm({ ...reservationForm, source: event.target.value as PMSReservation['source'] })}>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="form-group"><label className="form-label">Plan tarifaire</label><select className="form-control" value={reservationForm.ratePlanId} onChange={event => { const plan = db.pmsRatePlans.find(item => item.id === event.target.value); setReservationForm({ ...reservationForm, ratePlanId: event.target.value, nightlyRate: plan?.baseRate || selectedReservationRoom?.nightlyRate || reservationForm.nightlyRate }); }}><option value="">Tarif de la chambre</option>{db.pmsRatePlans.filter(plan => plan.active).map(plan => <option key={plan.id} value={plan.id}>{plan.name} · {formatFCFA(plan.baseRate)}</option>)}</select></div></div>
                  <div className="grid-2"><div className="form-group"><label className="form-label">Tarif par nuit</label><input type="number" min="0" className="form-control" value={reservationForm.nightlyRate} onChange={event => setReservationForm({ ...reservationForm, nightlyRate: Number(event.target.value) })} /></div><div className="form-group"><label className="form-label">Garantie</label><select className="form-control" value={reservationForm.guaranteeType} onChange={event => setReservationForm({ ...reservationForm, guaranteeType: event.target.value as NonNullable<PMSReservation['guaranteeType']> })}><option value="none">Sans garantie</option><option value="deposit">Acompte</option><option value="card">Carte bancaire</option><option value="company">Prise en charge entreprise</option></select></div></div>
                  {reservationForm.guaranteeType === 'deposit' && <div className="form-group"><label className="form-label">Montant de l’acompte</label><input type="number" min="0" className="form-control" value={reservationForm.depositAmount} onChange={event => setReservationForm({ ...reservationForm, depositAmount: Number(event.target.value) })} /></div>}
                  <div className="form-group"><label className="form-label">Notes du séjour <span className="form-optional">facultatif</span></label><textarea className="form-control" rows={2} value={reservationForm.notes} onChange={event => setReservationForm({ ...reservationForm, notes: event.target.value })} /></div>
                </section>
              )}
            </div>

            <div className="pms-booking-summary">
              <div><span>Séjour</span><strong>{formatDate(reservationForm.arrivalDate)} → {formatDate(reservationForm.departureDate)} · {reservationNights} nuit(s)</strong></div>
              <div><span>Hébergement</span><strong>{selectedReservationRoom ? `${selectedReservationRoom.roomNumber} · ${selectedReservationRoom.roomType}` : `${reservationForm.requestedRoomType} · attribution ultérieure`}</strong></div>
              <div><span>Total prévu</span><strong>{formatFCFA(reservationNights * reservationForm.nightlyRate)}</strong></div>
            </div>

            <div className="modal-actions pms-booking-actions">
              <button type="button" className="btn btn-secondary" onClick={() => reservationStep === 1 ? setReservationModalOpen(false) : moveReservationStep((reservationStep - 1) as 1 | 2)}>{reservationStep === 1 ? 'Annuler' : 'Retour'}</button>
              {reservationStep < 3
                ? <button type="submit" className="btn btn-primary">Continuer <ArrowRight size={17} /></button>
                : <button type="submit" className="btn btn-primary"><ClipboardCheck size={17} /> {editingReservationId ? 'Enregistrer les modifications' : 'Confirmer la réservation'}</button>}
            </div>
          </form>
        </div>
      )}

      {paymentFolioId && (
        <div className="modal-overlay" onClick={() => setPaymentFolioId(null)}>
          <form className="modal-card modal-card-sm" onSubmit={savePayment} onClick={event => event.stopPropagation()}><div className="modal-header"><div><h2>Encaisser le folio</h2><p>Le paiement réduit immédiatement le solde du client.</p></div><button type="button" className="icon-btn" onClick={() => setPaymentFolioId(null)}><X size={20} /></button></div><div className="form-group"><label className="form-label">Montant</label><input type="number" min="1" className="form-control" value={paymentForm.amount} onChange={event => setPaymentForm({ ...paymentForm, amount: Number(event.target.value) })} /></div><div className="form-group"><label className="form-label">Moyen de paiement</label><select className="form-control" value={paymentForm.method} onChange={event => setPaymentForm({ ...paymentForm, method: event.target.value as PaymentType })}>{(['cash', 'card', 'wave', 'orange_money', 'other'] as PaymentType[]).map(method => <option value={method} key={method}>{PAYMENT_TYPE_LABELS[method]}</option>)}</select></div><div className="form-group"><label className="form-label">Référence</label><input className="form-control" value={paymentForm.reference} onChange={event => setPaymentForm({ ...paymentForm, reference: event.target.value })} placeholder="Transaction, reçu ou note" /></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setPaymentFolioId(null)}>Annuler</button><button className="btn btn-primary" type="submit"><CreditCard size={17} /> Valider le paiement</button></div></form>
        </div>
      )}

      {transferChargeId && (
        <div className="modal-overlay" onClick={() => setTransferChargeId(null)}>
          <form className="modal-card modal-card-sm" onSubmit={saveChargeTransfer} onClick={event => event.stopPropagation()}><div className="modal-header"><div><h2>Transférer une charge</h2><p>Déplacez tout ou partie de la charge vers un autre folio ouvert.</p></div><button type="button" className="icon-btn" onClick={() => setTransferChargeId(null)}><X size={20} /></button></div>{actionError && <div className="alert alert-danger">{actionError}</div>}<div className="form-group"><label className="form-label">Folio de destination</label><select className="form-control" value={transferForm.targetFolioId} onChange={event => setTransferForm({ ...transferForm, targetFolioId: event.target.value })}>{db.pmsFolios.filter(folio => folio.status === 'open' && folio.id !== selectedFolioId).map(folio => <option value={folio.id} key={folio.id}>{folio.guestName} · {folio.reservationNumber}</option>)}</select></div><div className="form-group"><label className="form-label">Montant à transférer</label><input type="number" min="1" className="form-control" value={transferForm.amount} onChange={event => setTransferForm({ ...transferForm, amount: Number(event.target.value) })} /></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setTransferChargeId(null)}>Annuler</button><button className="btn btn-primary" type="submit"><ArrowRight size={17} /> Transférer</button></div></form>
        </div>
      )}
    </div>
  );
};

export default PMSHotel;
