import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock3,
  Layers,
  LayoutGrid,
  MapPin,
  Move,
  PencilRuler,
  Plus,
  ReceiptText,
  RotateCw,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { RestaurantDiningTable, RestaurantDiningTableShape } from '../types';

type FloorStatus = 'free' | 'reserved' | 'occupied' | 'kitchen' | 'ready' | 'bill';

interface RestaurantFloorStudioProps {
  state: StockState;
  posId: string;
  editable?: boolean;
  compact?: boolean;
  operatorName?: string;
}

const STATUS_LABELS: Record<FloorStatus, string> = {
  free: 'Libre',
  reserved: 'Réservée',
  occupied: 'Installée',
  kitchen: 'En cuisine',
  ready: 'À servir',
  bill: 'Addition'
};

const SHAPE_LABELS: Record<RestaurantDiningTableShape, string> = {
  round: 'Ronde',
  square: 'Carrée',
  rectangle: 'Rectangle'
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export const RestaurantFloorStudio: React.FC<RestaurantFloorStudioProps> = ({
  state,
  posId,
  editable = false,
  compact = false,
  operatorName
}) => {
  const { db } = state;
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; rect: DOMRect; moved: boolean } | null>(null);
  const tables = useMemo(
    () => db.restaurantDiningTables.filter(table => table.posId === posId && table.active),
    [db.restaurantDiningTables, posId]
  );
  const floors = useMemo(() => Array.from(new Set(tables.map(table => table.floor))), [tables]);
  const [selectedFloor, setSelectedFloor] = useState(floors[0] || 'RDC');
  const zones = useMemo(
    () => Array.from(new Set(tables.filter(table => table.floor === selectedFloor).map(table => table.zone))),
    [selectedFloor, tables]
  );
  const [selectedZone, setSelectedZone] = useState(zones[0] || 'Salle principale');
  const [studioMode, setStudioMode] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>();
  const [editorDraft, setEditorDraft] = useState<RestaurantDiningTable>();
  const [draftPositions, setDraftPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (!floors.includes(selectedFloor)) setSelectedFloor(floors[0] || 'RDC');
  }, [floors, selectedFloor]);

  useEffect(() => {
    if (!zones.includes(selectedZone)) setSelectedZone(zones[0] || 'Salle principale');
  }, [selectedZone, zones]);

  const selectedTable = tables.find(table => table.id === selectedTableId);
  useEffect(() => {
    setEditorDraft(selectedTable ? { ...selectedTable } : undefined);
  }, [selectedTable]);

  const today = new Date().toISOString().slice(0, 10);
  const tableRuntime = useMemo(() => tables.map(table => {
    const order = db.restaurantGuestOrders.find(item => item.posId === posId && item.tableNumber === table.label && !['paid', 'cancelled'].includes(item.status));
    const reservation = db.restaurantReservations.find(item => item.posId === posId && item.tableNumber === table.label && item.date === today && ['confirmed', 'seated'].includes(item.status));
    const request = order ? db.sartalServiceRequests.find(item => item.referenceId === order.id && !['completed', 'cancelled'].includes(item.status)) : undefined;
    const customerId = order?.customerId || reservation?.customerId;
    const customer = db.sartalCustomers.find(item => item.id === customerId);
    const status: FloorStatus = order?.status === 'ready'
      ? 'ready'
      : order && ['placed', 'confirmed', 'preparing'].includes(order.status)
        ? 'kitchen'
        : order?.status === 'served'
          ? 'bill'
          : order || reservation?.status === 'seated'
            ? 'occupied'
            : reservation?.status === 'confirmed'
              ? 'reserved'
              : 'free';
    return { table, order, reservation, request, customer, status };
  }), [db.restaurantGuestOrders, db.restaurantReservations, db.sartalCustomers, db.sartalServiceRequests, posId, tables, today]);

  const visibleTables = tableRuntime.filter(item => item.table.floor === selectedFloor && item.table.zone === selectedZone);
  const selectedRuntime = tableRuntime.find(item => item.table.id === selectedTableId);
  const activeCount = tableRuntime.filter(item => !['free', 'reserved'].includes(item.status)).length;
  const readyCount = tableRuntime.filter(item => item.status === 'ready').length;
  const seatCount = tables.reduce((sum, table) => sum + table.capacity, 0);

  const execute = (action: () => void, successMessage: string) => {
    try {
      action();
      setNotice(successMessage);
      window.setTimeout(() => setNotice(undefined), 2800);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Action impossible');
      window.setTimeout(() => setNotice(undefined), 2800);
      return false;
    }
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>, table: RestaurantDiningTable) => {
    if (!studioMode || !canvasRef.current) {
      setSelectedTableId(table.id);
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: table.id, rect: canvasRef.current.getBoundingClientRect(), moved: false };
    setSelectedTableId(table.id);
  };

  const moveTable = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.currentTarget.dataset.tableId) return;
    const x = clamp(((event.clientX - drag.rect.left) / drag.rect.width) * 100, 4, 96);
    const y = clamp(((event.clientY - drag.rect.top) / drag.rect.height) * 100, 8, 94);
    drag.moved = true;
    setDraftPositions(current => ({ ...current, [drag.id]: { x, y } }));
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>, table: RestaurantDiningTable) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== table.id) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const position = draftPositions[table.id] || {
      x: clamp(((event.clientX - drag.rect.left) / drag.rect.width) * 100, 4, 96),
      y: clamp(((event.clientY - drag.rect.top) / drag.rect.height) * 100, 8, 94)
    };
    if (drag.moved && position) {
      execute(() => state.saveRestaurantDiningTable({ ...table, ...position }), `Position de ${table.label} enregistrée.`);
      setDraftPositions(current => {
        const next = { ...current };
        delete next[table.id];
        return next;
      });
    }
    dragRef.current = null;
  };

  const addTable = () => {
    const maxNumber = tables.reduce((maximum, table) => Math.max(maximum, Number(table.label.replace(/\D/g, '')) || 0), 0);
    const label = `T${String(maxNumber + 1).padStart(2, '0')}`;
    const now = new Date().toISOString();
    const draft: RestaurantDiningTable = {
      id: '',
      posId,
      label,
      capacity: 4,
      shape: 'square',
      floor: selectedFloor,
      zone: selectedZone,
      x: 50,
      y: 50,
      rotation: 0,
      active: true,
      createdAt: now,
      updatedAt: now
    };
    try {
      const id = state.saveRestaurantDiningTable(draft);
      setSelectedTableId(id);
      setNotice(`${label} ajoutée au plan.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Ajout impossible');
    }
  };

  const saveEditor = () => {
    if (!editorDraft) return;
    execute(() => state.saveRestaurantDiningTable(editorDraft), `${editorDraft.label} mise à jour.`);
  };

  const deleteTable = () => {
    if (!selectedTable) return;
    if (execute(() => state.deleteRestaurantDiningTable(selectedTable.id), `${selectedTable.label} retirée du plan.`)) setSelectedTableId(undefined);
  };

  return (
    <section className={`restaurant-floor-studio ${compact ? 'compact' : ''} ${studioMode ? 'editing' : ''}`}>
      <header className="restaurant-floor-toolbar">
        <div>
          <span><i /> SALLE EN DIRECT</span>
          <h2>{studioMode ? 'Studio du plan de salle' : 'Plan de salle interactif'}</h2>
          <p>{studioMode ? 'Déplacez les tables puis configurez leur capacité, leur forme et leur zone.' : 'Réservations, cuisine, service et additions sur le plan configuré par le manager.'}</p>
        </div>
        <div className="restaurant-floor-toolbar-actions">
          <div className="restaurant-floor-live-stats">
            <span><strong>{activeCount}</strong> en service</span>
            <span className={readyCount ? 'attention' : ''}><strong>{readyCount}</strong> à servir</span>
            <span><strong>{seatCount}</strong> couverts</span>
          </div>
          {editable && <button className={studioMode ? 'active' : ''} onClick={() => { setStudioMode(value => !value); setSelectedTableId(undefined); }}>
            {studioMode ? <X size={18} /> : <PencilRuler size={18} />}
            {studioMode ? 'Quitter le Studio' : 'Ouvrir le Studio'}
          </button>}
        </div>
      </header>

      <div className="restaurant-floor-levels" aria-label="Niveaux du restaurant">
        {floors.map(floor => <button className={selectedFloor === floor ? 'active' : ''} key={floor} onClick={() => { setSelectedFloor(floor); setSelectedTableId(undefined); }}><Layers size={15} /> {floor}</button>)}
      </div>
      <div className="restaurant-floor-zones" aria-label="Zones du restaurant">
        {zones.map(zone => <button className={selectedZone === zone ? 'active' : ''} key={zone} onClick={() => { setSelectedZone(zone); setSelectedTableId(undefined); }}><MapPin size={14} /> {zone}</button>)}
        {studioMode && <button className="add" onClick={addTable}><Plus size={15} /> Ajouter une table ici</button>}
      </div>

      <div className={`restaurant-floor-workspace ${studioMode || selectedRuntime ? 'has-panel' : ''}`}>
        <div className="restaurant-floor-canvas" ref={canvasRef}>
          <div className="restaurant-floor-grid-lines" />
          <div className="restaurant-floor-orientation"><LayoutGrid size={15} /><span>{selectedFloor} · {selectedZone}</span>{studioMode && <b><Move size={14} /> Glisser-déposer actif</b>}</div>
          {visibleTables.map(({ table, status, order, request }) => {
            const position = draftPositions[table.id] || table;
            const selected = selectedTableId === table.id;
            const chairCount = Math.min(table.capacity, 10);
            return <button
              type="button"
              key={table.id}
              data-table-id={table.id}
              className={`restaurant-studio-table ${table.shape} ${status} ${selected ? 'selected' : ''}`}
              style={{ left: `${position.x}%`, top: `${position.y}%`, '--table-rotation': `${table.rotation}deg`, '--chair-count': chairCount } as React.CSSProperties}
              onPointerDown={event => startDrag(event, table)}
              onPointerMove={moveTable}
              onPointerUp={event => finishDrag(event, table)}
              onPointerCancel={event => finishDrag(event, table)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedTableId(table.id); }}
              aria-label={`${table.label}, ${STATUS_LABELS[status]}, ${table.capacity} places`}
            >
              <span className="restaurant-studio-table-wrap">
                {Array.from({ length: chairCount }, (_, index) => <i className="restaurant-studio-chair" key={index} style={{ '--chair-angle': `${(index * 360) / chairCount}deg` } as React.CSSProperties} />)}
                <span className="restaurant-studio-table-surface"><strong>{table.label}</strong><small>{status === 'ready' ? 'PRÊT' : status === 'kitchen' ? 'CUISINE' : `${table.capacity} pers.`}</small></span>
                {status === 'ready' && <em className="restaurant-studio-ready"><BellRing size={12} /></em>}
                {request && <em className="restaurant-studio-request"><BellRing size={12} /></em>}
                {order && <span className="restaurant-studio-timer"><Clock3 size={11} /> {Math.max(0, Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000))} min</span>}
              </span>
            </button>;
          })}
          {visibleTables.length === 0 && <div className="restaurant-floor-empty"><LayoutGrid size={32} /><strong>Aucune table dans cette zone</strong>{studioMode && <button onClick={addTable}><Plus size={16} /> Ajouter la première table</button>}</div>}
        </div>

        {studioMode && editorDraft ? <aside className="restaurant-studio-editor">
          <header><div><span>TABLE SÉLECTIONNÉE</span><h3>{editorDraft.label}</h3></div><button onClick={() => setSelectedTableId(undefined)} aria-label="Fermer la configuration"><X size={18} /></button></header>
          <div className="restaurant-studio-form">
            <label>Numéro<input value={editorDraft.label} onChange={event => setEditorDraft({ ...editorDraft, label: event.target.value })} /></label>
            <label>Capacité<input type="number" min="1" max="20" value={editorDraft.capacity} onChange={event => setEditorDraft({ ...editorDraft, capacity: Number(event.target.value) || 1 })} /></label>
            <label>Niveau<input value={editorDraft.floor} onChange={event => setEditorDraft({ ...editorDraft, floor: event.target.value })} /></label>
            <label>Zone<input value={editorDraft.zone} onChange={event => setEditorDraft({ ...editorDraft, zone: event.target.value })} /></label>
          </div>
          <fieldset><legend>Forme de la table</legend><div>{(Object.entries(SHAPE_LABELS) as Array<[RestaurantDiningTableShape, string]>).map(([shape, label]) => <button className={editorDraft.shape === shape ? 'active' : ''} key={shape} onClick={() => setEditorDraft({ ...editorDraft, shape })}><i className={shape} /> {label}</button>)}</div></fieldset>
          <label className="restaurant-studio-rotation"><span><RotateCw size={16} /> Orientation <b>{editorDraft.rotation}°</b></span><input type="range" min="0" max="345" step="15" value={editorDraft.rotation} onChange={event => setEditorDraft({ ...editorDraft, rotation: Number(event.target.value) })} /></label>
          <div className="restaurant-studio-editor-actions"><button className="danger" onClick={deleteTable}><Trash2 size={17} /> Supprimer</button><button className="save" onClick={saveEditor}><CheckCircle2 size={17} /> Enregistrer</button></div>
        </aside> : selectedRuntime && !studioMode ? <aside className={`restaurant-floor-detail ${selectedRuntime.status}`}>
          <header><div><span>{STATUS_LABELS[selectedRuntime.status]}</span><h3>{selectedRuntime.table.label}</h3><p>{selectedRuntime.table.capacity} places · {selectedRuntime.table.zone}</p></div><button onClick={() => setSelectedTableId(undefined)} aria-label="Fermer le détail"><X size={18} /></button></header>
          {selectedRuntime.customer ? <div className="restaurant-floor-customer"><Users size={18} /><span><small>Client</small><strong>{selectedRuntime.customer.fullName}</strong>{selectedRuntime.customer.allergies && <em>Allergie : {selectedRuntime.customer.allergies}</em>}</span></div> : <div className="restaurant-floor-customer"><Users size={18} /><span><small>Disponibilité</small><strong>Prête à accueillir</strong></span></div>}
          {selectedRuntime.order && <div className="restaurant-floor-order"><span><ChefHat size={17} /> {selectedRuntime.order.items.reduce((sum, item) => sum + item.quantity, 0)} article(s)</span><strong>{new Intl.NumberFormat('fr-FR').format(selectedRuntime.order.total)} FCFA</strong></div>}
          {selectedRuntime.reservation && <div className="restaurant-floor-reservation"><MapPin size={16} /><span><strong>{selectedRuntime.reservation.guests} personne(s) à {selectedRuntime.reservation.time}</strong><small>{selectedRuntime.reservation.notes || 'Réservation confirmée'}</small></span></div>}
          {selectedRuntime.request && <button className="restaurant-floor-primary" onClick={() => execute(() => state.updateSartalServiceRequest(selectedRuntime.request!.id, selectedRuntime.request!.status === 'requested' ? 'accepted' : 'completed', operatorName || db.currentUser.name), 'Demande client mise à jour.')}><BellRing size={16} /> {selectedRuntime.request.status === 'requested' ? 'Prendre la demande' : 'Confirmer effectué'}</button>}
          {!selectedRuntime.request && selectedRuntime.order?.status === 'ready' && <button className="restaurant-floor-primary" onClick={() => execute(() => state.updateRestaurantGuestOrderStatus(selectedRuntime.order!.id, 'served'), `${selectedRuntime.table.label} marquée servie.`)}><CheckCircle2 size={16} /> Confirmer le service</button>}
          {selectedRuntime.order?.status === 'served' && <div className="restaurant-floor-bill"><ReceiptText size={17} /><span><small>Addition en attente</small><strong>{new Intl.NumberFormat('fr-FR').format(Math.max(0, selectedRuntime.order.total - selectedRuntime.order.payments.reduce((sum, payment) => sum + payment.amount, 0)))} FCFA</strong></span></div>}
        </aside> : studioMode ? <aside className="restaurant-studio-help"><Move size={28} /><h3>Composez votre salle</h3><p>Glissez une table pour la déplacer ou touchez-la pour modifier ses propriétés.</p><button onClick={addTable}><Plus size={16} /> Ajouter une table</button></aside> : null}
      </div>

      <footer className="restaurant-floor-legend">
        {(Object.entries(STATUS_LABELS) as Array<[FloorStatus, string]>).map(([status, label]) => <span className={status} key={status}><i /> {label}</span>)}
        <b>{visibleTables.length} table(s) dans cette zone</b>
      </footer>
      {notice && <div className="restaurant-floor-notice">{notice}</div>}
    </section>
  );
};

export default RestaurantFloorStudio;
