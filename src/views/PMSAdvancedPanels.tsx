import React, { useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  CalendarCheck,
  CheckCircle,
  CircleGauge,
  CreditCard,
  Download,
  FileText,
  Hotel,
  Play,
  Camera,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Tag,
  Trash2,
  Wifi,
  WifiOff,
  Wrench
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { PMSInvoice } from '../types';
import { downloadPMSPdf } from '../utils/pmsPdf';

interface PMSPanelProps {
  state: StockState;
}

const formatFCFA = (value: number) => new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';

const useOnlineStatus = () => {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const setConnected = () => setOnline(true);
    const setDisconnected = () => setOnline(false);
    window.addEventListener('online', setConnected);
    window.addEventListener('offline', setDisconnected);
    return () => {
      window.removeEventListener('online', setConnected);
      window.removeEventListener('offline', setDisconnected);
    };
  }, []);
  return online;
};

export const PMSRoleDashboard: React.FC<PMSPanelProps> = ({ state }) => {
  const { db } = state;
  const [role, setRole] = useState<'reception' | 'housekeeping' | 'manager' | 'night'>('reception');
  const online = useOnlineStatus();
  const profiles = {
    reception: {
      label: 'Réception',
      focus: 'Arrivées, départs et soldes clients',
      metrics: [
        ['Arrivées', db.pmsReservations.filter(item => item.arrivalDate === db.pmsSettings.businessDate && item.status === 'confirmed').length],
        ['Départs', db.pmsReservations.filter(item => item.departureDate === db.pmsSettings.businessDate && item.status === 'checked_in').length],
        ['Liste d’attente', db.pmsReservations.filter(item => item.status === 'waitlisted').length]
      ]
    },
    housekeeping: {
      label: 'Gouvernante',
      focus: 'Nettoyage, contrôle et chambres prioritaires',
      metrics: [
        ['À nettoyer', db.pmsRooms.filter(item => item.housekeepingStatus === 'dirty').length],
        ['En cours', db.pmsHousekeepingTasks.filter(item => item.status === 'in_progress').length],
        ['À contrôler', db.pmsHousekeepingTasks.filter(item => item.status === 'completed').length]
      ]
    },
    manager: {
      label: 'Direction',
      focus: 'Occupation, revenus et alertes de gestion',
      metrics: [
        ['Occupation', `${Math.round((db.pmsRooms.filter(item => item.status === 'occupied').length / Math.max(1, db.pmsRooms.length)) * 100)}%`],
        ['Revenus folios', formatFCFA(db.pmsFolios.flatMap(item => item.charges).reduce((sum, item) => sum + item.amount, 0))],
        ['Alertes', db.pmsChannels.reduce((sum, item) => sum + item.availabilityIssues, 0) + db.pmsMaintenanceTickets.filter(item => !['resolved', 'verified'].includes(item.status)).length]
      ]
    },
    night: {
      label: 'Veilleur',
      focus: 'Rapprochement, soldes ouverts et clôture',
      metrics: [
        ['POS à rapprocher', db.pmsFolios.flatMap(item => item.charges).filter(item => item.status === 'pending').length],
        ['Folios ouverts', db.pmsFolios.filter(item => item.status === 'open').length],
        ['Clôtures', db.pmsNightAudits.length]
      ]
    }
  } as const;
  const current = profiles[role];

  return (
    <section className="card pms-section-card pms-role-dashboard">
      <div className="pms-section-header">
        <div><h2>Poste de travail</h2><p>Chaque équipe voit ses priorités sans parcourir tout le PMS.</p></div>
        <span className={`pms-connectivity ${online ? 'online' : 'offline'}`}>{online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? 'Synchronisé' : 'Mode hors-ligne'}</span>
      </div>
      <div className="pms-role-switcher">
        {(Object.keys(profiles) as Array<keyof typeof profiles>).map(item => <button className={role === item ? 'active' : ''} key={item} onClick={() => setRole(item)}>{profiles[item].label}</button>)}
      </div>
      <div className="pms-role-focus"><div><CircleGauge size={22} /><div><strong>{current.label}</strong><span>{current.focus}</span></div></div><div>{current.metrics.map(metric => <span key={metric[0]}><small>{metric[0]}</small><strong>{metric[1]}</strong></span>)}</div></div>
    </section>
  );
};

export const PMSDayScenario: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, advancePMSDayScenario, resetPMSDayScenario } = state;
  const steps = [
    ['Check-in', 'La cliente arrive et son folio est ouvert.'],
    ['Vente restaurant', 'Un dîner est imputé sur la chambre 118.'],
    ['Rapprochement', 'Le ticket POS est contrôlé dans le folio.'],
    ['Paiement', 'Le solde est réglé par Orange Money.'],
    ['Check-out', 'Le folio est clôturé et la chambre libérée.'],
    ['Entretien', 'La chambre est nettoyée puis contrôlée.']
  ];
  const currentStep = db.pmsScenarioStep;
  return (
    <section className="card pms-section-card pms-day-scenario">
      <div className="pms-section-header"><div><h2>Journée complète en un parcours</h2><p>Rejouez devant le gérant toute la chaîne hôtel, POS et entretien.</p></div><span className="badge badge-blue">{currentStep}/6 étapes</span></div>
      <div className="pms-scenario-steps">{steps.map((step, index) => <div className={index < currentStep ? 'done' : index === currentStep ? 'current' : ''} key={step[0]}><span>{index < currentStep ? <CheckCircle size={17} /> : index + 1}</span><div><strong>{step[0]}</strong><small>{step[1]}</small></div></div>)}</div>
      <div className="pms-scenario-actions"><button className="btn btn-secondary" onClick={resetPMSDayScenario}><RotateCcw size={16} /> Recommencer</button><button className="btn btn-primary" disabled={currentStep >= steps.length} onClick={advancePMSDayScenario}><Play size={16} /> {currentStep >= steps.length ? 'Parcours terminé' : `Exécuter : ${steps[currentStep][0]}`}</button></div>
    </section>
  );
};

export const PMSGroupsEvents: React.FC<PMSPanelProps> = ({ state }) => {
  const { db } = state;
  return (
    <section className="card pms-section-card"><div className="pms-section-header"><div><h2>Événements et banquets</h2><p>Salles, restauration et groupes hébergés.</p></div><CalendarCheck size={21} color="var(--primary)" /></div><div className="pms-stack">{db.pmsEvents.map(event => <article className="pms-advanced-row" key={event.id}><div><strong>{event.name}</strong><span>{event.venue} · {new Date(`${event.date}T12:00:00`).toLocaleDateString('fr-FR')}</span></div><span className={`badge ${event.status === 'confirmed' ? 'badge-green' : 'badge-yellow'}`}>{event.status === 'confirmed' ? 'Confirmé' : 'Option'}</span><div><span>{event.attendees} participants</span><strong>Restauration {formatFCFA(event.cateringAmount)}</strong></div></article>)}</div></section>
  );
};

export const PMSGuestRelations: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, sendPMSNotification, schedulePMSNotification, deletePMSNotification } = state;
  const activeReservations = db.pmsReservations.filter(item => ['confirmed', 'checked_in'].includes(item.status));
  const [reservationId, setReservationId] = useState(activeReservations[0]?.id || '');
  const automations = [
    { type: 'confirmation' as const, label: 'Confirmation' },
    { type: 'room_ready' as const, label: 'Chambre prête' },
    { type: 'balance_due' as const, label: 'Solde à régler' },
    { type: 'post_stay' as const, label: 'Après séjour' }
  ];
  return (
    <section className="card pms-section-card">
      <div className="pms-section-header"><div><h2>Messages clients</h2><p>Confirmations, rappels d’arrivée, soldes et messages après séjour.</p></div><Bell size={21} color="var(--primary)" /></div>
      <div className="pms-message-automation"><div><MessageCircle size={20} /><span><strong>Automatisations WhatsApp</strong><small>Programmez un message lié au séjour en un geste.</small></span></div><select className="form-control" value={reservationId} onChange={event => setReservationId(event.target.value)}>{activeReservations.map(reservation => <option key={reservation.id} value={reservation.id}>{reservation.confirmationNumber} · {db.pmsGuests.find(guest => guest.id === reservation.guestId)?.fullName}</option>)}</select><div>{automations.map(item => <button className="btn btn-secondary" disabled={!reservationId} key={item.type} onClick={() => schedulePMSNotification(reservationId, item.type, 'whatsapp')}>{item.label}</button>)}</div></div>
      <div className="pms-notification-grid">{db.pmsNotifications.map(notification => {
        const reservation = db.pmsReservations.find(item => item.id === notification.reservationId);
        const guest = db.pmsGuests.find(item => item.id === reservation?.guestId);
        return <article key={notification.id}><div><strong>{guest?.fullName || notification.recipient}</strong><span>{notification.type.replaceAll('_', ' ')} · {notification.channel}</span></div><span className={`badge ${notification.status === 'sent' ? 'badge-green' : notification.status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>{notification.status === 'sent' ? 'Envoyé' : notification.status === 'failed' ? 'Échec' : 'Programmé'}</span>{notification.status !== 'sent' && <><button className="btn btn-secondary" onClick={() => sendPMSNotification(notification.id)}><Send size={15} /> Envoyer</button><button className="btn btn-danger-soft" onClick={() => deletePMSNotification(notification.id)} title="Supprimer le message"><Trash2 size={15} /></button></>}</article>;
      })}</div>
    </section>
  );
};

interface PMSBillingPanelProps extends PMSPanelProps {
  folioId: string;
}

export const PMSBillingPanel: React.FC<PMSBillingPanelProps> = ({ state, folioId }) => {
  const { db, issuePMSDocument, refundPMSPayment } = state;
  const folio = db.pmsFolios.find(item => item.id === folioId);
  if (!folio) return null;
  const documents = db.pmsInvoices.filter(item => item.folioId === folioId);
  const refundablePayment = folio.payments.find(payment => {
    if (payment.amount <= 0) return false;
    const refunded = Math.abs(folio.payments.filter(item => item.kind === 'refund' && item.originPaymentId === payment.id).reduce((sum, item) => sum + item.amount, 0));
    return refunded < payment.amount;
  });
  const issue = (type: PMSInvoice['type']) => issuePMSDocument(folioId, type, folio.guestName);
  const downloadDocument = (document: PMSInvoice) => downloadPMSPdf(`${document.number}.pdf`, `${document.number} - ${folio.guestName}`, [`Document : ${document.type.replace('_', ' ')}`, `Client : ${document.billedTo}`, `Reservation : ${folio.reservationNumber}`, `Arrivee : ${folio.arrivalDate}`, `Depart : ${folio.departureDate}`, `Montant total : ${formatFCFA(document.total)}`, `Statut : ${document.status}`]);
  return (
    <section className="pms-billing-panel">
      <div className="pms-section-header"><div><h3>Facturation</h3><p>Proforma, facture, reçu ou avoir rattaché au folio.</p></div><FileText size={20} color="var(--primary)" /></div>
      <div className="pms-document-actions"><button className="btn btn-secondary" onClick={() => issue('proforma')}>Proforma</button><button className="btn btn-secondary" onClick={() => issue('invoice')}>Facture</button><button className="btn btn-secondary" onClick={() => issue('receipt')}>Reçu</button><button className="btn btn-secondary" onClick={() => issue('credit_note')}>Avoir</button></div>
      <div className="pms-document-list">{documents.map(document => <div key={document.id}><div><strong>{document.number}</strong><span>{document.type.replace('_', ' ')} · {document.billedTo}</span></div><span className="badge badge-blue">{document.status}</span><strong>{formatFCFA(document.total)}</strong><button className="btn btn-secondary" onClick={() => downloadDocument(document)}><Download size={15} /> PDF</button></div>)}{documents.length === 0 && <div className="mobile-empty-state">Aucun document émis pour ce folio.</div>}</div>
      {refundablePayment && <div className="pms-refund-row"><span>Remboursement disponible sur un paiement encaissé.</span><button className="btn btn-secondary" onClick={() => { const refunded = Math.abs(folio.payments.filter(item => item.kind === 'refund' && item.originPaymentId === refundablePayment.id).reduce((sum, item) => sum + item.amount, 0)); refundPMSPayment(folio.id, refundablePayment.id, refundablePayment.amount - refunded); }}><CreditCard size={15} /> Rembourser le paiement</button></div>}
    </section>
  );
};

export const PMSMaintenancePanel: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, updatePMSMaintenanceTicket, updatePMSMaintenanceDetails, deletePMSConfigRecord } = state;
  const statuses = ['open', 'in_progress', 'resolved', 'verified'] as const;
  const labels = { open: 'Ouvert', in_progress: 'En cours', resolved: 'Réparé', verified: 'Contrôlé' };
  return (
    <section className="card pms-section-card"><div className="pms-section-header"><div><h2>Maintenance technique</h2><p>Équipements, coûts et durée d’indisponibilité des chambres.</p></div><Wrench size={21} color="var(--primary)" /></div><div className="pms-maintenance-grid">{db.pmsMaintenanceTickets.map(ticket => {
      const room = db.pmsRooms.find(item => item.id === ticket.roomId);
      return <article key={ticket.id}><div><span className={`badge ${ticket.priority === 'critical' ? 'badge-red' : ticket.priority === 'urgent' ? 'badge-yellow' : 'badge-gray'}`}>{ticket.priority}</span><h3>Chambre {room?.roomNumber} · {ticket.equipment}</h3><p>{ticket.note}</p></div><div><span>{ticket.assignedTo}</span><strong>Coût estimé {formatFCFA(ticket.estimatedCost)}</strong></div><div className="pms-maintenance-details"><label>Coût réel<input className="form-control" type="number" defaultValue={ticket.actualCost || 0} onBlur={event => updatePMSMaintenanceDetails(ticket.id, { actualCost: Number(event.target.value) })} /></label><label>Indisponible jusqu’au<input className="form-control" type="date" defaultValue={ticket.unavailableUntil || ''} onBlur={event => updatePMSMaintenanceDetails(ticket.id, { unavailableUntil: event.target.value })} /></label><button className="btn btn-secondary" onClick={() => updatePMSMaintenanceDetails(ticket.id, { photoCount: (ticket.photoCount || 0) + 1 })}><Camera size={15} /> {ticket.photoCount || 0} photo(s)</button><button className="btn btn-danger-soft" onClick={() => deletePMSConfigRecord('pmsMaintenanceTickets', ticket.id)}><Trash2 size={15} /> Supprimer</button></div><div className="pms-task-progress">{statuses.map(status => <button key={status} className={ticket.status === status ? 'active' : ''} onClick={() => updatePMSMaintenanceTicket(ticket.id, status)}>{labels[status]}</button>)}</div>{ticket.resolvedAt && <small>Réparation enregistrée le {new Date(ticket.resolvedAt).toLocaleString('fr-FR')}</small>}</article>;
    })}</div></section>
  );
};

export const PMSAuditTrail: React.FC<PMSPanelProps> = ({ state }) => {
  const { db } = state;
  return (
    <section className="card pms-section-card"><div className="pms-section-header"><div><h2>Journal de sécurité</h2><p>Modifications, annulations, transferts, tarifs et clôtures.</p></div><ShieldCheck size={21} color="var(--success)" /></div><div className="pms-audit-log">{db.pmsAuditLogs.slice(0, 12).map(log => <article key={log.id}><span>{new Date(log.date).toLocaleString('fr-FR')}</span><div><strong>{log.action}</strong><small>{log.entity} · {log.detail}</small></div><span className="badge badge-gray">{log.userName}</span></article>)}</div></section>
  );
};

export const PMSMultiSitePanel: React.FC<PMSPanelProps> = ({ state }) => {
  const { db } = state;
  const totalRevenue = db.pmsPropertySummaries.reduce((sum, item) => sum + item.revenueToday, 0);
  const totalRooms = db.pmsPropertySummaries.reduce((sum, item) => sum + item.rooms, 0);
  const totalOccupied = db.pmsPropertySummaries.reduce((sum, item) => sum + item.occupiedRooms, 0);
  const totalAlerts = db.pmsPropertySummaries.reduce((sum, item) => sum + item.alerts, 0);
  return (
    <section className="card pms-section-card"><div className="pms-section-header"><div><h2>Direction multi-hôtels</h2><p>Occupation, performance et alertes consolidées entre les établissements.</p></div><Building2 size={21} color="var(--primary)" /></div><div className="pms-property-executive"><div><span>Occupation groupe</span><strong>{Math.round((totalOccupied / Math.max(1, totalRooms)) * 100)}%</strong></div><div><span>Revenu du jour</span><strong>{formatFCFA(totalRevenue)}</strong></div><div><span>Chambres</span><strong>{totalOccupied}/{totalRooms}</strong></div><div><span>Alertes actives</span><strong>{totalAlerts}</strong></div></div><div className="pms-property-grid">{db.pmsPropertySummaries.map(property => <article key={property.id}><div><Hotel size={20} /><div><strong>{property.name}</strong><span>{property.city} · {property.rooms} chambres</span></div></div><div><span>Occupation</span><strong>{Math.round((property.occupiedRooms / property.rooms) * 100)}%</strong></div><div><span>ADR / RevPAR</span><strong>{formatFCFA(property.adr || 0)} / {formatFCFA(property.revPar || 0)}</strong></div><div><span>Revenu du jour</span><strong>{formatFCFA(property.revenueToday)}</strong></div><div><span>Hors service</span><strong>{property.outOfOrderRooms || 0}</strong></div><span className={`badge ${property.alerts > 0 ? 'badge-yellow' : 'badge-green'}`}>{property.alerts} alerte(s)</span></article>)}</div></section>
  );
};

export const PMSCommercialSettings: React.FC<PMSPanelProps> = ({ state }) => {
  const { db, updatePMSRatePlan } = state;
  const online = useOnlineStatus();
  return (
    <div className="grid-2 pms-advanced-grid">
      <section className="card pms-section-card"><div className="pms-section-header"><div><h2>Plans tarifaires</h2><p>Public, week-end, entreprise, agence et groupe.</p></div><Tag size={21} color="var(--primary)" /></div><div className="pms-rate-plans">{db.pmsRatePlans.map(plan => <article key={plan.id}><div><strong>{plan.name}</strong><span>{plan.roomType} · {plan.audience}</span></div><div><input className="form-control" type="number" defaultValue={plan.baseRate} onBlur={event => updatePMSRatePlan(plan.id, { baseRate: Number(event.target.value) })} /><small>FCFA · coefficient week-end {plan.weekendMultiplier}</small></div><button className={`btn ${plan.active ? 'btn-secondary' : 'btn-primary'}`} onClick={() => updatePMSRatePlan(plan.id, { active: !plan.active })}>{plan.active ? 'Actif' : 'Réactiver'}</button></article>)}</div></section>
      <section className="card pms-section-card"><div className="pms-section-header"><div><h2>Continuité de service PWA</h2><p>Consultation et saisie locale pendant une coupure réseau.</p></div>{online ? <Wifi size={21} color="var(--success)" /> : <WifiOff size={21} color="var(--warning)" />}</div><div className="pms-offline-proof">{['Application installable sur mobile et tablette.', 'Écrans et données de travail conservés en cache.', 'Indicateur immédiat de perte de connexion.', 'Saisies locales conservées jusqu’au retour du réseau.'].map(item => <div key={item}><CheckCircle size={17} /><span>{item}</span></div>)}</div><span className={`pms-connectivity ${online ? 'online' : 'offline'}`}>{online ? 'Connexion disponible' : 'Travail hors-ligne actif'}</span></section>
    </div>
  );
};
