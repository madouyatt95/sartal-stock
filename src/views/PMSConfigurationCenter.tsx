import React, { useState } from 'react';
import {
  BedDouble,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ConciergeBell,
  Hotel,
  MessageCircle,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';

interface PMSConfigurationCenterProps {
  state: StockState;
  initialCollection?: PMSConfigCollection;
}

type PMSConfigCollection = Parameters<StockState['savePMSConfigRecord']>[0];
type PMSConfigRecord = Parameters<StockState['savePMSConfigRecord']>[1];

interface FieldOption { value: string; label: string; }
interface ConfigField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'time' | 'textarea' | 'select' | 'checkbox' | 'list';
  required?: boolean;
  min?: number;
  options?: FieldOption[] | (() => FieldOption[]);
  placeholder?: string;
}

interface ConfigDefinition {
  collection: PMSConfigCollection;
  label: string;
  singular: string;
  description: string;
  icon: React.ReactNode;
  fields: ConfigField[];
  create: () => Record<string, unknown>;
}

const select = (key: string, label: string, values: Array<[string, string]>): ConfigField => ({
  key,
  label,
  type: 'select',
  options: values.map(([value, optionLabel]) => ({ value, label: optionLabel }))
});

const getRecordTitle = (record: Record<string, unknown>, singular: string) => {
  if (record.roomNumber) return `Chambre ${record.roomNumber}`;
  if (record.fullName) return String(record.fullName);
  if (record.name) return String(record.name);
  if (record.label) return String(record.label);
  if (record.equipment) return String(record.equipment);
  return `${singular} ${String(record.id).slice(-5)}`;
};

const getRecordDetail = (record: Record<string, unknown>) => {
  const values = [
    record.roomType,
    record.floor,
    record.phone,
    record.type,
    record.channel,
    record.status,
    record.assignedTo,
    record.city,
    record.arrivalDate,
    record.date
  ].filter(Boolean);
  return values.slice(0, 3).join(' · ') || 'Configuration enregistrée';
};

export const PMSConfigurationCenter: React.FC<PMSConfigurationCenterProps> = ({ state, initialCollection = 'pmsRooms' }) => {
  const { db, savePMSConfigRecord, deletePMSConfigRecord } = state;
  const roomOptions = () => db.pmsRooms.map(room => ({ value: room.id, label: `Chambre ${room.roomNumber} · ${room.roomType}` }));
  const reservationOptions = () => db.pmsReservations.map(reservation => ({ value: reservation.id, label: `${reservation.confirmationNumber} · ${db.pmsGuests.find(guest => guest.id === reservation.guestId)?.fullName || 'Client'}` }));
  const roomTypes = Array.from(new Set(db.pmsRooms.map(room => room.roomType)));
  const today = db.pmsSettings.businessDate;

  const definitions: ConfigDefinition[] = [
    {
      collection: 'pmsRooms', label: 'Chambres', singular: 'chambre', description: 'Numéros, catégories, étages, capacités, tarifs et états.', icon: <BedDouble size={17} />,
      fields: [
        { key: 'roomNumber', label: 'Numéro', required: true }, { key: 'roomType', label: 'Catégorie', required: true }, { key: 'floor', label: 'Étage', required: true },
        { key: 'capacity', label: 'Capacité', type: 'number', min: 1 }, { key: 'nightlyRate', label: 'Tarif par nuit', type: 'number', min: 0 },
        select('status', 'État commercial', [['vacant', 'Libre'], ['occupied', 'Occupée'], ['maintenance', 'Maintenance']]),
        select('housekeepingStatus', 'État entretien', [['clean', 'Propre'], ['dirty', 'À nettoyer'], ['inspected', 'Contrôlée'], ['in_progress', 'En cours']]),
        { key: 'features', label: 'Équipements', type: 'list', placeholder: 'Wi-Fi, balcon, climatisation' }, { key: 'maintenanceNote', label: 'Note maintenance', type: 'textarea' }
      ],
      create: () => ({ id: '', siteId: db.sites[0]?.id || '', roomNumber: '', roomType: roomTypes[0] || 'Standard', floor: 'Rez-de-chaussée', capacity: 2, nightlyRate: 45000, status: 'vacant', housekeepingStatus: 'inspected', features: [] })
    },
    {
      collection: 'pmsGuests', label: 'Clients', singular: 'client', description: 'Coordonnées, identité, entreprise, préférences et fidélité.', icon: <Users size={17} />,
      fields: [
        { key: 'fullName', label: 'Nom complet', required: true }, { key: 'phone', label: 'Téléphone', required: true }, { key: 'email', label: 'E-mail' }, { key: 'nationality', label: 'Nationalité' }, { key: 'company', label: 'Entreprise' },
        { key: 'preferences', label: 'Préférences', type: 'textarea' }, select('loyaltyTier', 'Fidélité', [['standard', 'Standard'], ['silver', 'Silver'], ['gold', 'Gold']]),
        select('documentType', 'Pièce d’identité', [['', 'Non renseignée'], ['identity_card', 'Carte d’identité'], ['passport', 'Passeport'], ['residence_permit', 'Titre de séjour']]), { key: 'documentNumber', label: 'Numéro de pièce' }, { key: 'incidentNote', label: 'Note interne', type: 'textarea' }
      ],
      create: () => ({ id: '', fullName: '', phone: '', email: '', nationality: 'Sénégalaise', company: '', preferences: '', stays: 0, loyaltyTier: 'standard', preCheckInStatus: 'not_started' })
    },
    {
      collection: 'pmsRatePlans', label: 'Tarifs', singular: 'plan tarifaire', description: 'Tarifs publics, entreprises, agences et règles de séjour.', icon: <Tag size={17} />,
      fields: [
        { key: 'name', label: 'Nom du plan', required: true }, { key: 'roomType', label: 'Catégorie', required: true }, { key: 'baseRate', label: 'Tarif de base', type: 'number', min: 0 }, { key: 'weekendMultiplier', label: 'Coefficient week-end', type: 'number', min: 0 },
        { key: 'validFrom', label: 'Valable du', type: 'date' }, { key: 'validTo', label: 'Valable au', type: 'date' }, select('audience', 'Clientèle', [['public', 'Public'], ['company', 'Entreprise'], ['agency', 'Agence'], ['group', 'Groupe']]),
        { key: 'minStay', label: 'Séjour minimum', type: 'number', min: 1 }, { key: 'occupancyAdjustment', label: 'Majoration forte occupation (%)', type: 'number' }, { key: 'active', label: 'Plan actif', type: 'checkbox' }
      ],
      create: () => ({ id: '', name: '', roomType: roomTypes[0] || 'Standard', baseRate: 45000, weekendMultiplier: 1, validFrom: today, validTo: `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`, audience: 'public', active: true, minStay: 1, occupancyAdjustment: 10 })
    },
    {
      collection: 'pmsPackages', label: 'Forfaits', singular: 'forfait', description: 'Pensions, services inclus, expériences et supplément par nuit.', icon: <PackageCheck size={17} />,
      fields: [{ key: 'name', label: 'Nom', required: true }, select('mealPlan', 'Formule', [['room_only', 'Chambre seule'], ['breakfast', 'Petit-déjeuner'], ['half_board', 'Demi-pension'], ['full_board', 'Pension complète'], ['experience', 'Expérience']]), { key: 'pricePerNight', label: 'Supplément par nuit', type: 'number', min: 0 }, { key: 'includedServices', label: 'Services inclus', type: 'list' }, { key: 'active', label: 'Forfait actif', type: 'checkbox' }],
      create: () => ({ id: '', name: '', mealPlan: 'breakfast', pricePerNight: 0, includedServices: [], active: true })
    },
    {
      collection: 'pmsChannels', label: 'Canaux', singular: 'canal', description: 'Vente directe, plateformes, agences et état des connexions.', icon: <Settings2 size={17} />,
      fields: [{ key: 'name', label: 'Nom', required: true }, select('type', 'Type', [['direct', 'Direct'], ['ota', 'Plateforme OTA'], ['agency', 'Agence'], ['corporate', 'Entreprise']]), select('status', 'Connexion', [['connected', 'Connectée'], ['warning', 'À contrôler'], ['disconnected', 'Déconnectée']]), { key: 'reservationsToday', label: 'Réservations du jour', type: 'number', min: 0 }, { key: 'availabilityIssues', label: 'Anomalies de disponibilité', type: 'number', min: 0 }, { key: 'lastError', label: 'Dernière erreur', type: 'textarea' }],
      create: () => ({ id: '', name: '', type: 'ota', status: 'disconnected', lastSync: new Date().toISOString(), reservationsToday: 0, availabilityIssues: 0, ratesSynced: 0, inventorySynced: 0 })
    },
    {
      collection: 'pmsGroups', label: 'Groupes', singular: 'groupe', description: 'Allotements, contacts, rooming-lists, acomptes et facturation.', icon: <Building2 size={17} />,
      fields: [{ key: 'name', label: 'Nom du groupe', required: true }, { key: 'contactName', label: 'Contact', required: true }, { key: 'contactPhone', label: 'Téléphone' }, { key: 'arrivalDate', label: 'Arrivée', type: 'date' }, { key: 'departureDate', label: 'Départ', type: 'date' }, select('billingMode', 'Facturation', [['central', 'Centrale'], ['individual', 'Individuelle'], ['mixed', 'Mixte']]), select('status', 'Statut', [['option', 'Option'], ['confirmed', 'Confirmé'], ['in_house', 'En séjour'], ['closed', 'Clôturé']]), { key: 'depositAmount', label: 'Acompte', type: 'number', min: 0 }, { key: 'allottedRooms', label: 'Chambres allouées', type: 'number', min: 0 }, { key: 'roomingListReceived', label: 'Noms reçus', type: 'number', min: 0 }, { key: 'releaseDate', label: 'Date de rétrocession', type: 'date' }],
      create: () => ({ id: '', name: '', contactName: '', contactPhone: '', roomIds: [], arrivalDate: today, departureDate: today, billingMode: 'central', status: 'option', depositAmount: 0, allottedRooms: 5, roomingListReceived: 0, releaseDate: today })
    },
    {
      collection: 'pmsEvents', label: 'Événements', singular: 'événement', description: 'Séminaires, réunions, cérémonies et banquets.', icon: <CalendarDays size={17} />,
      fields: [{ key: 'name', label: 'Nom', required: true }, select('type', 'Type', [['seminar', 'Séminaire'], ['meeting', 'Réunion'], ['ceremony', 'Cérémonie'], ['banquet', 'Banquet']]), { key: 'date', label: 'Date', type: 'date' }, { key: 'venue', label: 'Salle ou espace' }, { key: 'attendees', label: 'Participants', type: 'number', min: 1 }, { key: 'cateringAmount', label: 'Montant restauration', type: 'number', min: 0 }, select('status', 'Statut', [['option', 'Option'], ['confirmed', 'Confirmé'], ['completed', 'Terminé']])],
      create: () => ({ id: '', name: '', type: 'meeting', date: today, venue: '', attendees: 10, cateringAmount: 0, status: 'option' })
    },
    {
      collection: 'pmsHousekeepingTasks', label: 'Entretien', singular: 'tâche', description: 'Affectation, priorité, date, état et consignes de nettoyage.', icon: <Sparkles size={17} />,
      fields: [{ key: 'roomId', label: 'Chambre', type: 'select', options: roomOptions }, { key: 'assignedTo', label: 'Agent', required: true }, select('status', 'Statut', [['pending', 'À faire'], ['in_progress', 'En cours'], ['completed', 'Nettoyée'], ['inspected', 'Contrôlée']]), select('priority', 'Priorité', [['normal', 'Normale'], ['urgent', 'Urgente']]), { key: 'scheduledDate', label: 'Date prévue', type: 'date' }, { key: 'note', label: 'Consigne', type: 'textarea' }, select('linenStatus', 'Linge', [['complete', 'Complet'], ['missing', 'Manquant'], ['damaged', 'Endommagé']]), select('minibarStatus', 'Minibar', [['checked', 'Contrôlé'], ['restock', 'À réassortir']])],
      create: () => ({ id: '', roomId: db.pmsRooms[0]?.id || '', assignedTo: '', status: 'pending', priority: 'normal', scheduledDate: today, note: '', linenStatus: 'complete', minibarStatus: 'checked', photoCount: 0 })
    },
    {
      collection: 'pmsMaintenanceTickets', label: 'Maintenance', singular: 'ticket', description: 'Équipement, responsable, urgence, coûts et indisponibilité.', icon: <Wrench size={17} />,
      fields: [{ key: 'roomId', label: 'Chambre', type: 'select', options: roomOptions }, { key: 'equipment', label: 'Équipement', required: true }, select('priority', 'Priorité', [['normal', 'Normale'], ['urgent', 'Urgente'], ['critical', 'Critique']]), select('status', 'Statut', [['open', 'Ouvert'], ['in_progress', 'En cours'], ['resolved', 'Réparé'], ['verified', 'Contrôlé']]), { key: 'assignedTo', label: 'Responsable' }, { key: 'estimatedCost', label: 'Coût estimé', type: 'number', min: 0 }, { key: 'actualCost', label: 'Coût réel', type: 'number', min: 0 }, { key: 'unavailableUntil', label: 'Indisponible jusqu’au', type: 'date' }, { key: 'note', label: 'Description', type: 'textarea', required: true }],
      create: () => ({ id: '', roomId: db.pmsRooms[0]?.id || '', equipment: '', priority: 'normal', status: 'open', assignedTo: '', openedAt: new Date().toISOString(), estimatedCost: 0, actualCost: 0, photoCount: 0, note: '' })
    },
    {
      collection: 'pmsServiceRequests', label: 'Services', singular: 'demande', description: 'Conciergerie, transfert, petit-déjeuner, blanchisserie et demandes spéciales.', icon: <ConciergeBell size={17} />,
      fields: [{ key: 'reservationId', label: 'Séjour', type: 'select', options: reservationOptions }, select('type', 'Service', [['airport_transfer', 'Transfert aéroport'], ['breakfast', 'Petit-déjeuner'], ['baby_bed', 'Lit bébé'], ['laundry', 'Blanchisserie'], ['late_arrival', 'Arrivée tardive'], ['special_request', 'Demande spéciale']]), { key: 'label', label: 'Libellé', required: true }, select('status', 'Statut', [['requested', 'Demandée'], ['assigned', 'Affectée'], ['in_progress', 'En cours'], ['completed', 'Terminée']]), select('priority', 'Priorité', [['normal', 'Normale'], ['urgent', 'Urgente']]), { key: 'scheduledAt', label: 'Date prévue', type: 'date' }, { key: 'assignedTo', label: 'Responsable' }, { key: 'amount', label: 'Montant', type: 'number', min: 0 }, { key: 'note', label: 'Note', type: 'textarea' }],
      create: () => ({ id: '', reservationId: db.pmsReservations[0]?.id || '', roomId: db.pmsReservations[0]?.roomId || '', type: 'special_request', label: '', status: 'requested', priority: 'normal', scheduledAt: today, assignedTo: 'Réception', amount: 0, note: '' })
    },
    {
      collection: 'pmsAutomationRules', label: 'Automatisations', singular: 'règle', description: 'Déclencheurs et canaux des messages envoyés aux clients.', icon: <MessageCircle size={17} />,
      fields: [{ key: 'name', label: 'Nom', required: true }, select('trigger', 'Déclencheur', [['booking_confirmed', 'Réservation confirmée'], ['before_arrival', 'Avant arrivée'], ['room_ready', 'Chambre prête'], ['balance_due', 'Solde à régler'], ['after_checkout', 'Après départ']]), select('channel', 'Canal', [['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'E-mail']]), { key: 'active', label: 'Règle active', type: 'checkbox' }],
      create: () => ({ id: '', name: '', trigger: 'booking_confirmed', channel: 'whatsapp', active: true, sentCount: 0 })
    },
    {
      collection: 'pmsDebtorAccounts', label: 'Débiteurs', singular: 'compte', description: 'Entreprises, agences, plafonds de crédit, soldes et échéances.', icon: <CircleDollarSign size={17} />,
      fields: [{ key: 'name', label: 'Compte', required: true }, select('type', 'Type', [['company', 'Entreprise'], ['agency', 'Agence'], ['guest', 'Client']]), { key: 'balance', label: 'Solde', type: 'number', min: 0 }, { key: 'creditLimit', label: 'Plafond de crédit', type: 'number', min: 0 }, { key: 'dueDate', label: 'Échéance', type: 'date' }, select('status', 'Statut', [['current', 'À jour'], ['due', 'Échu'], ['blocked', 'Bloqué']])],
      create: () => ({ id: '', name: '', type: 'company', balance: 0, creditLimit: 500000, dueDate: today, status: 'current' })
    },
    {
      collection: 'pmsPropertySummaries', label: 'Établissements', singular: 'établissement', description: 'Périmètre multi-hôtels et indicateurs consolidés.', icon: <Hotel size={17} />,
      fields: [{ key: 'name', label: 'Nom', required: true }, { key: 'city', label: 'Ville', required: true }, { key: 'rooms', label: 'Nombre de chambres', type: 'number', min: 0 }, { key: 'occupiedRooms', label: 'Chambres occupées', type: 'number', min: 0 }, { key: 'revenueToday', label: 'Revenu du jour', type: 'number', min: 0 }, { key: 'alerts', label: 'Alertes', type: 'number', min: 0 }, { key: 'adr', label: 'ADR', type: 'number', min: 0 }, { key: 'revPar', label: 'RevPAR', type: 'number', min: 0 }, { key: 'outOfOrderRooms', label: 'Hors service', type: 'number', min: 0 }],
      create: () => ({ id: '', name: '', city: 'Dakar', rooms: 0, occupiedRooms: 0, revenueToday: 0, alerts: 0, adr: 0, revPar: 0, outOfOrderRooms: 0 })
    }
  ];

  const [collection, setCollection] = useState<PMSConfigCollection>(initialCollection);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const active = definitions.find(item => item.collection === collection) || definitions[0];
  const records = (db[active.collection] as unknown as PMSConfigRecord[]).map(item => item as unknown as Record<string, unknown>);
  const filtered = records.filter(record => `${getRecordTitle(record, active.singular)} ${getRecordDetail(record)}`.toLowerCase().includes(query.trim().toLowerCase()));

  const updateDraft = (field: ConfigField, rawValue: string | boolean) => {
    if (!draft) return;
    let value: unknown = rawValue;
    if (field.type === 'number') value = Number(rawValue);
    if (field.type === 'list') value = String(rawValue).split(',').map(item => item.trim()).filter(Boolean);
    setDraft({ ...draft, [field.key]: value });
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    try {
      savePMSConfigRecord(active.collection, draft as unknown as PMSConfigRecord);
      setDraft(null);
      setMessage({ tone: 'success', text: `${active.singular.charAt(0).toUpperCase()}${active.singular.slice(1)} enregistré avec succès.` });
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'Enregistrement impossible.' });
    }
  };

  const remove = () => {
    if (!deleteTarget) return;
    try {
      deletePMSConfigRecord(active.collection, String(deleteTarget.id));
      setDeleteTarget(null);
      setMessage({ tone: 'success', text: `${active.singular.charAt(0).toUpperCase()}${active.singular.slice(1)} supprimé.` });
    } catch (error) {
      setDeleteTarget(null);
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'Suppression impossible.' });
    }
  };

  return (
    <section className="card pms-section-card pms-config-center">
      <div className="pms-section-header">
        <div><span className="pms-eyebrow"><Settings2 size={15} /> Administration</span><h2>Configurer le PMS</h2><p>Ajoutez, modifiez ou supprimez les données utilisées dans chaque écran.</p></div>
        <span className="badge badge-blue">{definitions.length} référentiels configurables</span>
      </div>

      <div className="pms-config-tabs" role="tablist">
        {definitions.map(item => <button role="tab" aria-selected={collection === item.collection} className={collection === item.collection ? 'active' : ''} key={item.collection} onClick={() => { setCollection(item.collection); setQuery(''); setMessage(null); }}>{item.icon}<span>{item.label}</span><b>{(db[item.collection] as unknown[]).length}</b></button>)}
      </div>

      <div className="pms-config-toolbar">
        <div><h3>{active.label}</h3><p>{active.description}</p></div>
        <div className="input-with-icon"><Search size={16} /><input className="form-control" type="search" placeholder={`Rechercher dans ${active.label.toLowerCase()}...`} value={query} onChange={event => setQuery(event.target.value)} /></div>
        <button className="btn btn-primary" onClick={() => { setDraft(active.create()); setMessage(null); }}><Plus size={16} /> Ajouter</button>
      </div>

      {message && <div className={`alert ${message.tone === 'success' ? 'alert-success' : 'alert-danger'}`}>{message.text}</div>}

      <div className="pms-config-list">
        {filtered.map(record => <article key={String(record.id)}><div className="pms-config-record-icon">{active.icon}</div><div><strong>{getRecordTitle(record, active.singular)}</strong><span>{getRecordDetail(record)}</span></div><div className="pms-config-record-actions"><button className="btn btn-secondary" onClick={() => { setDraft({ ...record }); setMessage(null); }}><Pencil size={15} /> Modifier</button><button className="btn btn-danger-soft" onClick={() => setDeleteTarget(record)}><Trash2 size={15} /> Supprimer</button></div></article>)}
        {filtered.length === 0 && <div className="mobile-empty-state">Aucun résultat. Utilisez « Ajouter » pour créer le premier élément.</div>}
      </div>

      {draft && (
        <div className="modal-overlay" onClick={() => setDraft(null)}>
          <form className="modal-card pms-config-modal" onSubmit={save} onClick={event => event.stopPropagation()}>
            <div className="modal-header"><div><span className="pms-eyebrow">{active.icon} {active.label}</span><h2>{draft.id ? 'Modifier' : 'Ajouter'} {active.singular}</h2><p>Ces informations seront utilisées immédiatement dans tout le PMS.</p></div><button type="button" className="icon-btn" onClick={() => setDraft(null)} aria-label="Fermer"><X size={19} /></button></div>
            <div className="pms-config-form-grid">
              {active.fields.map(field => {
                const value = draft[field.key];
                const options = typeof field.options === 'function' ? field.options() : field.options;
                if (field.type === 'checkbox') return <label className="pms-setting-toggle pms-config-checkbox" key={field.key}><input type="checkbox" checked={Boolean(value)} onChange={event => updateDraft(field, event.target.checked)} /><span><strong>{field.label}</strong><small>Activez ou désactivez cette option.</small></span></label>;
                if (field.type === 'textarea') return <div className="form-group pms-config-field-wide" key={field.key}><label className="form-label">{field.label}</label><textarea className="form-control" rows={3} required={field.required} value={String(value ?? '')} onChange={event => updateDraft(field, event.target.value)} /></div>;
                if (field.type === 'select') return <div className="form-group" key={field.key}><label className="form-label">{field.label}</label><select className="form-control" required={field.required} value={String(value ?? '')} onChange={event => updateDraft(field, event.target.value)}>{options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
                return <div className="form-group" key={field.key}><label className="form-label">{field.label}</label><input className="form-control" type={field.type === 'list' ? 'text' : field.type || 'text'} min={field.min} required={field.required} placeholder={field.placeholder} value={field.type === 'list' && Array.isArray(value) ? value.join(', ') : String(value ?? '')} onChange={event => updateDraft(field, event.target.value)} /></div>;
              })}
            </div>
            <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setDraft(null)}>Annuler</button><button type="submit" className="btn btn-primary"><Pencil size={16} /> Enregistrer</button></div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <section className="modal-card modal-card-sm" onClick={event => event.stopPropagation()}>
            <div className="modal-header"><div><h2>Confirmer la suppression</h2><p>{getRecordTitle(deleteTarget, active.singular)}</p></div><button className="icon-btn" onClick={() => setDeleteTarget(null)}><X size={19} /></button></div>
            <div className="alert alert-danger">La suppression sera refusée si cet élément possède un historique devant rester traçable.</div>
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Conserver</button><button className="btn btn-danger" onClick={remove}><Trash2 size={16} /> Supprimer</button></div>
          </section>
        </div>
      )}
    </section>
  );
};

export default PMSConfigurationCenter;
