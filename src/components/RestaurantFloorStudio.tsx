import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  ArrowLeftRight,
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock3,
  Columns3,
  Copy,
  DoorOpen,
  FileImage,
  Grid3X3,
  History,
  Layers,
  LayoutGrid,
  MapPin,
  Maximize2,
  Merge,
  MousePointer2,
  Move,
  PencilRuler,
  Plus,
  QrCode,
  ReceiptText,
  Redo2,
  RotateCw,
  Save,
  ScanLine,
  Split,
  Tablet,
  Trash2,
  Undo2,
  Upload,
  UserPlus,
  Users,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import RestaurantTableOrderPanel from './RestaurantTableOrderPanel';
import {
  RestaurantDiningTable,
  RestaurantDiningTablePart,
  RestaurantDiningTableShape,
  RestaurantFloorElement,
  RestaurantFloorElementType,
  RestaurantFloorPlanSettings,
  RestaurantFloorPlanVersion
} from '../types';

type FloorStatus = 'free' | 'reserved' | 'occupied' | 'kitchen' | 'ready' | 'bill';
type SelectedObject = { kind: 'table' | 'element'; id: string };
type StudioSnapshot = { tables: RestaurantDiningTable[]; elements: RestaurantFloorElement[]; settings: RestaurantFloorPlanSettings };

interface RestaurantFloorStudioProps {
  state: StockState;
  posId: string;
  editable?: boolean;
  compact?: boolean;
  operatorName?: string;
}

const STATUS_LABELS: Record<FloorStatus, string> = { free: 'Libre', reserved: 'Réservée', occupied: 'Installée', kitchen: 'En cuisine', ready: 'À servir', bill: 'Addition' };
const SHAPE_LABELS: Record<RestaurantDiningTableShape, string> = { round: 'Ronde', square: 'Carrée', rectangle: 'Rectangle' };
const WAITER_COLORS = ['#55d6b3', '#f2bd4c', '#6db2ff', '#d99bf6', '#ff8f70'];
const ELEMENT_CATALOG: Array<{ type: RestaurantFloorElementType; label: string; width: number; height: number }> = [
  { type: 'wall', label: 'Mur', width: 28, height: 2 },
  { type: 'door', label: 'Porte', width: 12, height: 3 },
  { type: 'window', label: 'Fenêtre', width: 16, height: 2 },
  { type: 'counter', label: 'Comptoir', width: 20, height: 8 },
  { type: 'kitchen', label: 'Passe cuisine', width: 22, height: 9 },
  { type: 'column', label: 'Pilier', width: 5, height: 5 },
  { type: 'stage', label: 'Scène', width: 24, height: 10 }
];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const runtimeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;

export const RestaurantFloorStudio: React.FC<RestaurantFloorStudioProps> = ({ state, posId, editable = false, compact = false, operatorName }) => {
  const { db } = state;
  const actor = operatorName || db.currentUser.name;
  const canvasRef = useRef<HTMLDivElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    kind: 'table' | 'element';
    id: string;
    rect: DOMRect;
    startX: number;
    startY: number;
    initialPositions: Record<string, { x: number; y: number }>;
    snapshot: StudioSnapshot;
    moved: boolean;
  } | null>(null);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const liveTables = useMemo(() => db.restaurantDiningTables.filter(table => table.posId === posId && table.active), [db.restaurantDiningTables, posId]);
  const liveElements = useMemo(() => db.restaurantFloorElements.filter(element => element.posId === posId && element.active), [db.restaurantFloorElements, posId]);
  const liveSettings = useMemo<RestaurantFloorPlanSettings>(() => db.restaurantFloorPlanSettings.find(item => item.posId === posId) || { posId, gridSize: 5, snapToGrid: true, showGrid: true, backgrounds: [], updatedAt: new Date().toISOString() }, [db.restaurantFloorPlanSettings, posId]);
  const versions = useMemo(() => db.restaurantFloorPlanVersions.filter(item => item.posId === posId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db.restaurantFloorPlanVersions, posId]);
  const auditEntries = useMemo(() => db.restaurantFloorAudit.filter(item => item.posId === posId).slice(0, 30), [db.restaurantFloorAudit, posId]);
  const waiters = useMemo(() => db.employeeProfiles.filter(employee => employee.active && employee.role === 'waiter' && employee.posId === posId), [db.employeeProfiles, posId]);

  const [studioMode, setStudioMode] = useState(false);
  const [draftTables, setDraftTables] = useState<RestaurantDiningTable[]>([]);
  const [draftElements, setDraftElements] = useState<RestaurantFloorElement[]>([]);
  const [draftSettings, setDraftSettings] = useState<RestaurantFloorPlanSettings>(clone(liveSettings));
  const [draftLabel, setDraftLabel] = useState('Nouvelle organisation de salle');
  const [dirty, setDirty] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [undoStack, setUndoStack] = useState<StudioSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<StudioSnapshot[]>([]);
  const [selectedObject, setSelectedObject] = useState<SelectedObject>();
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(() => new Set());
  const [tableEditor, setTableEditor] = useState<RestaurantDiningTable>();
  const [elementEditor, setElementEditor] = useState<RestaurantFloorElement>();
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState('RDC');
  const [selectedZone, setSelectedZone] = useState('Salle principale');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [tabletMode, setTabletMode] = useState(false);
  const [showGovernance, setShowGovernance] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkIn, setWalkIn] = useState({ name: 'Client de passage', guests: 2 });
  const [reservationChoice, setReservationChoice] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [orderPanelOrderId, setOrderPanelOrderId] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string }>();

  const workingTables = studioMode ? draftTables : liveTables;
  const workingElements = studioMode ? draftElements : liveElements;
  const workingSettings = studioMode ? draftSettings : liveSettings;
  const floors = useMemo(() => Array.from(new Set([...workingTables.map(table => table.floor), ...workingElements.map(element => element.floor)])), [workingElements, workingTables]);
  const zones = useMemo(() => Array.from(new Set([...workingTables.filter(table => table.floor === selectedFloor).map(table => table.zone), ...workingElements.filter(element => element.floor === selectedFloor).map(element => element.zone)])), [selectedFloor, workingElements, workingTables]);

  useEffect(() => { if (floors.length && !floors.includes(selectedFloor)) setSelectedFloor(floors[0]); }, [floors, selectedFloor]);
  useEffect(() => { if (zones.length && !zones.includes(selectedZone)) setSelectedZone(zones[0]); }, [selectedZone, zones]);
  useEffect(() => {
    if (selectedObject?.kind === 'table') setTableEditor(clone(workingTables.find(table => table.id === selectedObject.id)));
    else setTableEditor(undefined);
    if (selectedObject?.kind === 'element') setElementEditor(clone(workingElements.find(element => element.id === selectedObject.id)));
    else setElementEditor(undefined);
  }, [selectedObject, workingElements, workingTables]);

  const currentSnapshot = (): StudioSnapshot => ({ tables: clone(draftTables), elements: clone(draftElements), settings: clone(draftSettings) });
  const applySnapshot = (snapshot: StudioSnapshot) => { setDraftTables(clone(snapshot.tables)); setDraftElements(clone(snapshot.elements)); setDraftSettings(clone(snapshot.settings)); };
  const mutateDraft = (mutator: (snapshot: StudioSnapshot) => void) => {
    const before = currentSnapshot();
    const next = clone(before);
    mutator(next);
    setUndoStack(stack => [...stack.slice(-29), before]);
    setRedoStack([]);
    applySnapshot(next);
    setDirty(true);
  };
  const undo = () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setRedoStack(stack => [...stack, currentSnapshot()]);
    setUndoStack(stack => stack.slice(0, -1));
    applySnapshot(previous);
    setDirty(true);
  };
  const redo = () => {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setUndoStack(stack => [...stack, currentSnapshot()]);
    setRedoStack(stack => stack.slice(0, -1));
    applySnapshot(next);
    setDirty(true);
  };

  const showNotice = (text: string, tone: 'success' | 'danger' = 'success') => {
    setNotice({ text, tone });
    window.setTimeout(() => setNotice(undefined), 3200);
  };
  const execute = <T,>(action: () => T, success: string): T | undefined => {
    try { const result = action(); showNotice(success); return result; }
    catch (error) { showNotice(error instanceof Error ? error.message : 'Action impossible', 'danger'); return undefined; }
  };

  const enterStudio = (version?: RestaurantFloorPlanVersion) => {
    const source = version ? { tables: version.tables, elements: version.elements, settings: version.settings } : { tables: liveTables, elements: liveElements, settings: liveSettings };
    setDraftTables(clone(source.tables));
    setDraftElements(clone(source.elements));
    setDraftSettings(clone(source.settings));
    setDraftLabel(version?.status === 'draft' ? version.label : `Plan ${new Date().toLocaleDateString('fr-FR')}`);
    setStudioMode(true);
    setDirty(false);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedObject(undefined);
    setSelectedTableIds(new Set());
  };
  const leaveStudio = () => {
    if (dirty) { setConfirmExit(true); return; }
    setStudioMode(false);
    setSelectedObject(undefined);
    setSelectedTableIds(new Set());
  };
  const forceLeaveStudio = () => { setConfirmExit(false); setStudioMode(false); setDirty(false); setSelectedObject(undefined); setSelectedTableIds(new Set()); };

  const today = new Date().toISOString().slice(0, 10);
  const tableRuntime = useMemo(() => workingTables.map(table => {
    const order = db.restaurantGuestOrders.find(item => item.posId === posId && item.tableNumber === table.label && !['paid', 'cancelled'].includes(item.status));
    const reservation = db.restaurantReservations.find(item => item.posId === posId && item.tableNumber === table.label && item.date === today && ['confirmed', 'seated'].includes(item.status));
    const request = order ? db.sartalServiceRequests.find(item => item.referenceId === order.id && !['completed', 'cancelled'].includes(item.status)) : undefined;
    const customer = db.sartalCustomers.find(item => item.id === (order?.customerId || reservation?.customerId));
    const waiter = waiters.find(employee => employee.id === table.assignedEmployeeId);
    const status: FloorStatus = order?.status === 'ready' ? 'ready' : order && ['placed', 'confirmed', 'preparing'].includes(order.status) ? 'kitchen' : order?.status === 'served' ? 'bill' : order || reservation?.status === 'seated' ? 'occupied' : reservation?.status === 'confirmed' ? 'reserved' : 'free';
    const elapsed = order ? Math.max(0, Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)) : 0;
    return { table, order, reservation, request, customer, waiter, status, elapsed };
  }), [db.restaurantGuestOrders, db.restaurantReservations, db.sartalCustomers, db.sartalServiceRequests, posId, today, waiters, workingTables]);
  const visibleTables = tableRuntime.filter(item => item.table.floor === selectedFloor && item.table.zone === selectedZone);
  const visibleElements = workingElements.filter(element => element.floor === selectedFloor && element.zone === selectedZone && element.active);
  const selectedRuntime = studioMode ? undefined : tableRuntime.find(item => item.table.id === selectedObject?.id);
  const orderPanelOrder = db.restaurantGuestOrders.find(item => item.id === orderPanelOrderId && item.posId === posId && !['paid', 'cancelled'].includes(item.status));
  const orderPanelTable = workingTables.find(item => item.label === orderPanelOrder?.tableNumber);
  const selectedUpcomingReservation = selectedRuntime ? db.restaurantReservations
    .filter(item => item.posId === posId && item.tableNumber === selectedRuntime.table.label && item.date > today && item.status === 'confirmed')
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0] : undefined;
  const activeCount = tableRuntime.filter(item => !['free', 'reserved'].includes(item.status)).length;
  const readyCount = tableRuntime.filter(item => item.status === 'ready').length;
  const seatCount = workingTables.reduce((sum, table) => sum + table.capacity, 0);
  const unassignedReservations = db.restaurantReservations.filter(item => item.posId === posId && item.date >= today && item.status === 'confirmed' && !item.tableNumber).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const activeWaitlist = db.restaurantWaitlist.filter(item => item.posId === posId && ['waiting', 'notified'].includes(item.status)).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  const freeTransferTargets = tableRuntime.filter(item => item.status === 'free' && item.table.id !== selectedRuntime?.table.id);
  const selectedAccess = selectedRuntime?.customer && db.sartalClientAccess.find(item => item.customerId === selectedRuntime.customer!.id && item.status === 'active');
  const currentBackground = workingSettings.backgrounds.find(background => background.floor === selectedFloor && background.zone === selectedZone);

  const collisionPairs = useMemo(() => {
    const pairs: Array<[string, string]> = [];
    for (let index = 0; index < visibleTables.length; index += 1) {
      for (let comparison = index + 1; comparison < visibleTables.length; comparison += 1) {
        const first = visibleTables[index].table;
        const second = visibleTables[comparison].table;
        const horizontalLimit = first.shape === 'rectangle' || second.shape === 'rectangle' ? 11 : 8;
        if (Math.abs(first.x - second.x) < horizontalLimit && Math.abs(first.y - second.y) < 10) pairs.push([first.id, second.id]);
      }
      const table = visibleTables[index].table;
      const tableHalfWidth = table.shape === 'rectangle' ? 6 : 4.5;
      visibleElements.forEach(element => {
        if (Math.abs(table.x - element.x) < tableHalfWidth + element.width / 2 && Math.abs(table.y - element.y) < 5 + element.height / 2) pairs.push([table.id, element.id]);
      });
    }
    return pairs;
  }, [visibleElements, visibleTables]);
  const collisionIds = useMemo(() => new Set(collisionPairs.flat()), [collisionPairs]);

  const snap = (value: number) => workingSettings.snapToGrid ? Math.round(value / workingSettings.gridSize) * workingSettings.gridSize : value;
  const selectTable = (table: RestaurantDiningTable) => {
    if (studioMode && multiSelect) setSelectedTableIds(current => new Set([...current, table.id]));
    else setSelectedTableIds(new Set([table.id]));
    setSelectedObject({ kind: 'table', id: table.id });
  };

  const startObjectDrag = (event: React.PointerEvent<HTMLButtonElement>, kind: 'table' | 'element', id: string) => {
    event.stopPropagation();
    const table = kind === 'table' ? workingTables.find(item => item.id === id) : undefined;
    if (!studioMode) { if (table) selectTable(table); return; }
    if (!canvasRef.current) return;
    if (kind === 'table' && table) selectTable(table);
    if (kind === 'element') { setSelectedObject({ kind, id }); setSelectedTableIds(new Set()); }
    const selectedIds = kind === 'table' && selectedTableIds.has(id) ? [...selectedTableIds] : [id];
    const initialPositions: Record<string, { x: number; y: number }> = {};
    if (kind === 'table') draftTables.filter(item => selectedIds.includes(item.id)).forEach(item => { initialPositions[item.id] = { x: item.x, y: item.y }; });
    else { const element = draftElements.find(item => item.id === id); if (element) initialPositions[id] = { x: element.x, y: element.y }; }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { kind, id, rect: canvasRef.current.getBoundingClientRect(), startX: event.clientX, startY: event.clientY, initialPositions, snapshot: currentSnapshot(), moved: false };
  };
  const moveObject = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.currentTarget.dataset.objectId) return;
    const deltaX = ((event.clientX - drag.startX) / drag.rect.width / zoom) * 100;
    const deltaY = ((event.clientY - drag.startY) / drag.rect.height / zoom) * 100;
    if (!drag.moved && (Math.abs(deltaX) > 0.3 || Math.abs(deltaY) > 0.3)) {
      drag.moved = true;
      setUndoStack(stack => [...stack.slice(-29), drag.snapshot]);
      setRedoStack([]);
      setDirty(true);
    }
    if (!drag.moved) return;
    if (drag.kind === 'table') setDraftTables(tables => tables.map(table => drag.initialPositions[table.id] ? { ...table, x: clamp(snap(drag.initialPositions[table.id].x + deltaX), 4, 96), y: clamp(snap(drag.initialPositions[table.id].y + deltaY), 8, 94) } : table));
    else setDraftElements(elements => elements.map(element => element.id === drag.id ? { ...element, x: clamp(snap(drag.initialPositions[drag.id].x + deltaX), 2, 98), y: clamp(snap(drag.initialPositions[drag.id].y + deltaY), 2, 98) } : element));
  };
  const finishObjectDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!panMode || target.closest('.restaurant-studio-table, .restaurant-floor-element')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y };
  };
  const movePan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current || panRef.current.pointerId !== event.pointerId) return;
    setPan({ x: panRef.current.originX + event.clientX - panRef.current.startX, y: panRef.current.originY + event.clientY - panRef.current.startY });
  };
  const finishPan = (event: React.PointerEvent<HTMLDivElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); panRef.current = null; };

  const addTable = () => {
    const maxNumber = draftTables.reduce((maximum, table) => Math.max(maximum, Number(table.label.replace(/\D/g, '')) || 0), 0);
    const now = new Date().toISOString();
    const table: RestaurantDiningTable = { id: runtimeId('TABLE'), posId, label: `T${String(maxNumber + 1).padStart(2, '0')}`, capacity: 4, shape: 'square', floor: selectedFloor, zone: selectedZone, x: 50, y: 50, rotation: 0, assignedEmployeeId: waiters[0]?.id, active: true, createdAt: now, updatedAt: now };
    mutateDraft(snapshot => { snapshot.tables.push(table); });
    selectTable(table);
  };
  const addElement = (definition: typeof ELEMENT_CATALOG[number]) => {
    const now = new Date().toISOString();
    const element: RestaurantFloorElement = { id: runtimeId(`ELEMENT-${definition.type}`), posId, floor: selectedFloor, zone: selectedZone, type: definition.type, label: definition.label, x: 50, y: 50, width: definition.width, height: definition.height, rotation: 0, active: true, createdAt: now, updatedAt: now };
    mutateDraft(snapshot => { snapshot.elements.push(element); });
    setSelectedObject({ kind: 'element', id: element.id });
    setSelectedTableIds(new Set());
  };
  const saveTableEditor = () => {
    if (!tableEditor) return;
    if (draftTables.some(table => table.id !== tableEditor.id && table.label.toUpperCase() === tableEditor.label.trim().toUpperCase())) { showNotice('Ce numéro de table existe déjà.', 'danger'); return; }
    const next = { ...tableEditor, label: tableEditor.label.trim().toUpperCase(), updatedAt: new Date().toISOString() };
    mutateDraft(snapshot => { snapshot.tables = snapshot.tables.map(table => table.id === next.id ? next : table); });
    setSelectedFloor(next.floor); setSelectedZone(next.zone);
  };
  const saveElementEditor = () => {
    if (!elementEditor) return;
    const next = { ...elementEditor, label: elementEditor.label.trim(), width: clamp(elementEditor.width, 1, 100), height: clamp(elementEditor.height, 1, 100), updatedAt: new Date().toISOString() };
    mutateDraft(snapshot => { snapshot.elements = snapshot.elements.map(element => element.id === next.id ? next : element); });
    setSelectedFloor(next.floor); setSelectedZone(next.zone);
  };
  const removeSelection = () => {
    if (selectedObject?.kind === 'element') {
      mutateDraft(snapshot => { snapshot.elements = snapshot.elements.filter(element => element.id !== selectedObject.id); });
      setSelectedObject(undefined); return;
    }
    const ids = selectedTableIds.size ? [...selectedTableIds] : selectedObject?.kind === 'table' ? [selectedObject.id] : [];
    const protectedLabels = new Set(tableRuntime.filter(item => ids.includes(item.table.id) && (item.order || item.reservation)).map(item => item.table.label));
    if (protectedLabels.size) { showNotice(`Libérez d’abord : ${[...protectedLabels].join(', ')}`, 'danger'); return; }
    mutateDraft(snapshot => { snapshot.tables = snapshot.tables.filter(table => !ids.includes(table.id)); });
    setSelectedObject(undefined); setSelectedTableIds(new Set());
  };
  const duplicateSelection = () => {
    const selected = draftTables.filter(table => selectedTableIds.has(table.id));
    if (!selected.length) return;
    const now = new Date().toISOString();
    const copies = selected.map((table, index) => ({ ...clone(table), id: runtimeId('TABLE'), label: `${table.label}B${index || ''}`, x: clamp(table.x + 7, 4, 96), y: clamp(table.y + 7, 8, 94), mergedFrom: undefined, createdAt: now, updatedAt: now }));
    mutateDraft(snapshot => { snapshot.tables.push(...copies); });
    setSelectedTableIds(new Set(copies.map(table => table.id)));
    setSelectedObject({ kind: 'table', id: copies[0].id });
  };
  const alignSelection = (mode: 'center' | 'column' | 'distribute') => {
    const selected = draftTables.filter(table => selectedTableIds.has(table.id)).sort((a, b) => a.x - b.x);
    if (selected.length < 2) return;
    mutateDraft(snapshot => {
      if (mode === 'center') { const average = selected.reduce((sum, table) => sum + table.y, 0) / selected.length; snapshot.tables = snapshot.tables.map(table => selectedTableIds.has(table.id) ? { ...table, y: average } : table); }
      if (mode === 'column') { const average = selected.reduce((sum, table) => sum + table.x, 0) / selected.length; snapshot.tables = snapshot.tables.map(table => selectedTableIds.has(table.id) ? { ...table, x: average } : table); }
      if (mode === 'distribute' && selected.length > 2) { const start = selected[0].x; const gap = (selected[selected.length - 1].x - start) / (selected.length - 1); snapshot.tables = snapshot.tables.map(table => { const index = selected.findIndex(item => item.id === table.id); return index >= 0 ? { ...table, x: start + gap * index } : table; }); }
    });
  };
  const mergeSelection = () => {
    const selected = draftTables.filter(table => selectedTableIds.has(table.id));
    if (selected.length < 2) return;
    if (new Set(selected.map(table => `${table.floor}|${table.zone}`)).size > 1) { showNotice('Les tables doivent appartenir à la même zone.', 'danger'); return; }
    if (selected.some(table => tableRuntime.find(item => item.table.id === table.id)?.order || tableRuntime.find(item => item.table.id === table.id)?.reservation)) { showNotice('Une table active ne peut pas être fusionnée.', 'danger'); return; }
    const capacity = selected.reduce((sum, table) => sum + table.capacity, 0);
    if (capacity > 20) { showNotice('La capacité fusionnée dépasse 20 personnes.', 'danger'); return; }
    const now = new Date().toISOString();
    const mergedFrom: RestaurantDiningTablePart[] = selected.map(({ id, label, capacity: seats, shape, floor, zone, x, y, rotation, assignedEmployeeId }) => ({ id, label, capacity: seats, shape, floor, zone, x, y, rotation, assignedEmployeeId }));
    const merged: RestaurantDiningTable = { id: runtimeId('TABLE-MERGED'), posId, label: selected.map(table => table.label).join('+'), capacity, shape: 'rectangle', floor: selected[0].floor, zone: selected[0].zone, x: selected.reduce((sum, table) => sum + table.x, 0) / selected.length, y: selected.reduce((sum, table) => sum + table.y, 0) / selected.length, rotation: 0, assignedEmployeeId: selected[0].assignedEmployeeId, mergedFrom, active: true, createdAt: now, updatedAt: now };
    mutateDraft(snapshot => { snapshot.tables = [...snapshot.tables.filter(table => !selectedTableIds.has(table.id)), merged]; });
    setSelectedTableIds(new Set([merged.id])); setSelectedObject({ kind: 'table', id: merged.id });
  };
  const splitSelection = () => {
    const table = draftTables.find(item => selectedTableIds.has(item.id));
    if (!table?.mergedFrom?.length) return;
    const now = new Date().toISOString();
    const restored = table.mergedFrom.map(part => ({ ...part, posId, active: true, createdAt: now, updatedAt: now } as RestaurantDiningTable));
    mutateDraft(snapshot => { snapshot.tables = [...snapshot.tables.filter(item => item.id !== table.id), ...restored]; });
    setSelectedTableIds(new Set(restored.map(item => item.id))); setSelectedObject({ kind: 'table', id: restored[0].id });
  };

  const saveDraft = () => {
    const id = execute(() => state.saveRestaurantFloorPlanDraft({ posId, label: draftLabel, tables: draftTables, elements: draftElements, settings: draftSettings }), 'Brouillon enregistré sans modifier la salle en direct.');
    if (id) setDirty(false);
  };
  const publish = () => {
    if (collisionPairs.length) { showNotice(`Corrigez ${collisionPairs.length} chevauchement(s) avant publication.`, 'danger'); return; }
    const id = execute(() => state.publishRestaurantFloorPlan({ posId, label: draftLabel, tables: draftTables, elements: draftElements, settings: draftSettings }), 'Plan publié. Tous les postes voient maintenant cette organisation.');
    if (id) { setDirty(false); setStudioMode(false); setSelectedObject(undefined); setSelectedTableIds(new Set()); }
  };
  const restoreVersion = (version: RestaurantFloorPlanVersion) => { if (execute(() => state.restoreRestaurantFloorPlanVersion(version.id), `Version « ${version.label} » restaurée et publiée.`)) setShowGovernance(false); };

  const importBackground = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1_500_000) { showNotice('Choisissez une image PNG, JPEG ou WebP inférieure à 1,5 Mo.', 'danger'); return; }
    const reader = new FileReader();
    reader.onload = () => mutateDraft(snapshot => {
      snapshot.settings.backgrounds = [...snapshot.settings.backgrounds.filter(background => background.floor !== selectedFloor || background.zone !== selectedZone), { floor: selectedFloor, zone: selectedZone, name: file.name, imageDataUrl: String(reader.result), opacity: 0.45 }];
    });
    reader.readAsDataURL(file);
  };
  const updateBackgroundOpacity = (opacity: number) => mutateDraft(snapshot => { const background = snapshot.settings.backgrounds.find(item => item.floor === selectedFloor && item.zone === selectedZone); if (background) background.opacity = opacity; });
  const removeBackground = () => mutateDraft(snapshot => { snapshot.settings.backgrounds = snapshot.settings.backgrounds.filter(background => background.floor !== selectedFloor || background.zone !== selectedZone); });

  const activeCountForWaiter = (employeeId: string) => tableRuntime.filter(item => item.table.assignedEmployeeId === employeeId && !['free', 'reserved'].includes(item.status)).length;
  const runWalkIn = (tableId: string) => {
    const result = execute(() => state.seatRestaurantWalkIn({ tableId, guestName: walkIn.name, guests: walkIn.guests, actor }), `${walkIn.name || 'Client'} installé.`);
    if (result) { setWalkInOpen(false); setWalkIn({ name: 'Client de passage', guests: 2 }); }
  };
  const createTableQR = (tableId: string) => {
    try { const access = state.createRestaurantTableQR(tableId, actor); showNotice(`Accès QR créé. Code client : ${access.code}`); }
    catch (error) { showNotice(error instanceof Error ? error.message : 'QR impossible', 'danger'); }
  };
  const seatReservationAndTakeOrder = (reservationId: string, tableId: string) => {
    try {
      state.seatRestaurantReservation(reservationId, tableId, actor);
      const orderId = state.openRestaurantTableOrder(tableId, actor);
      setOrderPanelOrderId(orderId);
      showNotice('Arrivée confirmée. La commande est prête à être saisie.');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Impossible d’ouvrir la commande', 'danger');
    }
  };

  return <section className={`restaurant-floor-studio ${compact ? 'compact' : ''} ${studioMode ? 'editing' : ''} ${tabletMode ? 'tablet-mode' : ''} ${heatmap ? 'heatmap-mode' : ''}`}>
    <header className="restaurant-floor-toolbar">
      <div><span><i /> {studioMode ? 'BROUILLON NON VISIBLE EN SALLE' : 'SALLE EN DIRECT'}</span><h2>{studioMode ? 'Studio premium du plan de salle' : 'Plan de salle interactif'}</h2><p>{studioMode ? 'Composez, contrôlez les collisions et publiez uniquement lorsque le plan est prêt.' : 'Réservations, cuisine, demandes, serveurs et additions réunis sur le plan publié.'}</p></div>
      <div className="restaurant-floor-toolbar-actions">
        <div className="restaurant-floor-live-stats"><span><strong>{activeCount}</strong> en service</span><span className={readyCount ? 'attention' : ''}><strong>{readyCount}</strong> à servir</span><span><strong>{seatCount}</strong> couverts</span></div>
        <button type="button" className={heatmap ? 'active secondary' : 'secondary'} onClick={() => setHeatmap(value => !value)}><ScanLine size={18} /> {heatmap ? 'Vue normale' : 'Heatmap'}</button>
        <button type="button" className={tabletMode ? 'active secondary' : 'secondary'} onClick={() => setTabletMode(value => !value)}>{tabletMode ? <Maximize2 size={18} /> : <Tablet size={18} />}{tabletMode ? 'Quitter tablette' : 'Mode tablette'}</button>
        {editable && <button type="button" className={studioMode ? 'active' : ''} onClick={() => studioMode ? leaveStudio() : enterStudio()}>{studioMode ? <X size={18} /> : <PencilRuler size={18} />}{studioMode ? 'Quitter le Studio' : 'Ouvrir le Studio'}</button>}
      </div>
    </header>

    <div className="restaurant-floor-levels" aria-label="Niveaux du restaurant">{floors.map(floor => <button type="button" className={selectedFloor === floor ? 'active' : ''} key={floor} onClick={() => { setSelectedFloor(floor); setSelectedObject(undefined); }}><Layers size={15} /> {floor}</button>)}</div>
    <div className="restaurant-floor-zones" aria-label="Zones du restaurant">{zones.map(zone => <button type="button" className={selectedZone === zone ? 'active' : ''} key={zone} onClick={() => { setSelectedZone(zone); setSelectedObject(undefined); }}><MapPin size={14} /> {zone}</button>)}</div>

    {studioMode && <section className="restaurant-studio-commandbar">
      <div className="restaurant-studio-command-group"><button type="button" disabled={!undoStack.length} onClick={undo} title="Annuler"><Undo2 size={18} /></button><button type="button" disabled={!redoStack.length} onClick={redo} title="Rétablir"><Redo2 size={18} /></button><button type="button" onClick={() => setZoom(value => clamp(value - 0.1, 0.65, 1.7))} title="Dézoomer"><ZoomOut size={18} /></button><b>{Math.round(zoom * 100)}%</b><button type="button" onClick={() => setZoom(value => clamp(value + 0.1, 0.65, 1.7))} title="Zoomer"><ZoomIn size={18} /></button><button type="button" className={panMode ? 'active' : ''} onClick={() => setPanMode(value => !value)}><Move size={17} /> Déplacer</button><button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Maximize2 size={17} /> Recentrer</button></div>
      <div className="restaurant-studio-command-group"><button type="button" className={draftSettings.showGrid ? 'active' : ''} onClick={() => mutateDraft(snapshot => { snapshot.settings.showGrid = !snapshot.settings.showGrid; })}><Grid3X3 size={17} /> Grille</button><button type="button" className={draftSettings.snapToGrid ? 'active' : ''} onClick={() => mutateDraft(snapshot => { snapshot.settings.snapToGrid = !snapshot.settings.snapToGrid; })}><MousePointer2 size={17} /> Magnétisme</button><button type="button" className={multiSelect ? 'active' : ''} onClick={() => { setMultiSelect(value => !value); setSelectedTableIds(new Set()); }}><Columns3 size={17} /> Multi-sélection</button></div>
      <div className="restaurant-studio-publish"><input value={draftLabel} onChange={event => setDraftLabel(event.target.value)} aria-label="Nom du plan" /><button type="button" onClick={saveDraft}><Save size={17} /> Brouillon</button><button type="button" className="publish" onClick={publish}><CheckCircle2 size={17} /> Publier</button></div>
    </section>}

    {studioMode && selectedTableIds.size > 0 && <section className="restaurant-studio-selectionbar"><span><strong>{selectedTableIds.size}</strong> table(s) sélectionnée(s)</span><button type="button" onClick={() => alignSelection('center')}><AlignCenter size={16} /> Aligner ligne</button><button type="button" onClick={() => alignSelection('column')}><Columns3 size={16} /> Aligner colonne</button><button type="button" onClick={() => alignSelection('distribute')}><ArrowLeftRight size={16} /> Distribuer</button><button type="button" onClick={duplicateSelection}><Copy size={16} /> Dupliquer</button><button type="button" disabled={selectedTableIds.size < 2} onClick={mergeSelection}><Merge size={16} /> Fusionner</button><button type="button" disabled={selectedTableIds.size !== 1 || !draftTables.find(table => selectedTableIds.has(table.id))?.mergedFrom?.length} onClick={splitSelection}><Split size={16} /> Séparer</button><button type="button" className="danger" onClick={removeSelection}><Trash2 size={16} /> Retirer</button><button type="button" onClick={() => { setSelectedTableIds(new Set()); setSelectedObject(undefined); }}>Désélectionner</button></section>}

    <div className={`restaurant-floor-workspace ${studioMode || selectedRuntime || orderPanelOrderId ? 'has-panel' : ''} ${orderPanelOrderId ? 'has-order-panel' : ''}`}>
      <div className={`restaurant-floor-canvas ${panMode ? 'panning' : ''}`} ref={canvasRef} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={finishPan} onPointerCancel={finishPan}>
        <div className="restaurant-floor-stage" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, '--floor-grid-size': `${Math.max(20, workingSettings.gridSize * 8)}px` } as React.CSSProperties}>
          {currentBackground && <img className="restaurant-floor-background" src={currentBackground.imageDataUrl} alt={`Plan importé ${currentBackground.name}`} style={{ opacity: currentBackground.opacity }} />}
          {workingSettings.showGrid && <div className="restaurant-floor-grid-lines" />}
          <div className="restaurant-floor-orientation"><LayoutGrid size={15} /><span>{selectedFloor} · {selectedZone}</span>{studioMode && <b><Move size={14} /> {workingSettings.snapToGrid ? 'Grille magnétique' : 'Placement libre'}</b>}</div>
          {heatmap && <div className="restaurant-floor-heatmap-key"><span>Fluide</span><i /><span>À surveiller</span><i /><span>Urgent</span></div>}

          {visibleElements.map(element => <button type="button" key={element.id} data-object-id={element.id} className={`restaurant-floor-element ${element.type} ${selectedObject?.kind === 'element' && selectedObject.id === element.id ? 'selected' : ''} ${collisionIds.has(element.id) ? 'collision' : ''}`} style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${element.height}%`, '--element-rotation': `${element.rotation}deg` } as React.CSSProperties} onPointerDown={event => startObjectDrag(event, 'element', element.id)} onPointerMove={moveObject} onPointerUp={finishObjectDrag} onPointerCancel={finishObjectDrag}><span>{element.label}</span></button>)}

          {visibleTables.map(({ table, status, order, request, waiter, elapsed }) => {
            const selected = selectedTableIds.has(table.id);
            const chairCount = Math.min(table.capacity, 10);
            const waiterIndex = waiter ? Math.max(0, waiters.findIndex(item => item.id === waiter.id)) : 0;
            const heat = elapsed > 35 || request?.priority === 'urgent' ? 'heat-high' : elapsed > 20 || status === 'ready' ? 'heat-medium' : 'heat-low';
            return <button type="button" key={table.id} data-object-id={table.id} className={`restaurant-studio-table ${table.shape} ${status} ${selected ? 'selected' : ''} ${collisionIds.has(table.id) ? 'collision' : ''} ${heat}`} style={{ left: `${table.x}%`, top: `${table.y}%`, '--table-rotation': `${table.rotation}deg`, '--waiter-color': WAITER_COLORS[waiterIndex % WAITER_COLORS.length] } as React.CSSProperties} onPointerDown={event => startObjectDrag(event, 'table', table.id)} onPointerMove={moveObject} onPointerUp={finishObjectDrag} onPointerCancel={finishObjectDrag} aria-label={`${table.label}, ${STATUS_LABELS[status]}, ${table.capacity} places`}>
              <span className="restaurant-studio-table-wrap">{Array.from({ length: chairCount }, (_, index) => <i className="restaurant-studio-chair" key={index} style={{ '--chair-angle': `${(index * 360) / chairCount}deg` } as React.CSSProperties} />)}<span className="restaurant-studio-table-surface"><strong>{table.label}</strong><small>{status === 'ready' ? 'PRÊT' : status === 'kitchen' ? 'CUISINE' : `${table.capacity} pers.`}</small></span>{status === 'ready' && <em className="restaurant-studio-ready"><BellRing size={12} /></em>}{request && <em className="restaurant-studio-request"><BellRing size={12} /></em>}{order && <span className="restaurant-studio-timer"><Clock3 size={11} /> {elapsed} min</span>}{waiter && <span className="restaurant-studio-waiter">{waiter.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span>}{table.mergedFrom?.length && <span className="restaurant-studio-merged"><Merge size={11} /> {table.mergedFrom.length}</span>}</span>
            </button>;
          })}
          {visibleTables.length === 0 && <div className="restaurant-floor-empty"><LayoutGrid size={32} /><strong>Aucune table dans cette zone</strong>{studioMode && <button type="button" onClick={addTable}><Plus size={16} /> Ajouter la première table</button>}</div>}
        </div>
      </div>

      {!studioMode && orderPanelOrder && orderPanelTable ? <RestaurantTableOrderPanel state={state} orderId={orderPanelOrder.id} tableLabel={orderPanelTable.label} capacity={orderPanelTable.capacity} actor={actor} onClose={() => setOrderPanelOrderId('')} /> : studioMode && tableEditor ? <aside className="restaurant-studio-editor">
        <header><div><span>TABLE SÉLECTIONNÉE</span><h3>{tableEditor.label}</h3></div><button type="button" onClick={() => setSelectedObject(undefined)} aria-label="Fermer"><X size={18} /></button></header>
        <div className="restaurant-studio-form"><label>Numéro<input value={tableEditor.label} onChange={event => setTableEditor({ ...tableEditor, label: event.target.value })} /></label><label>Capacité<input type="number" min="1" max="20" value={tableEditor.capacity} onChange={event => setTableEditor({ ...tableEditor, capacity: Number(event.target.value) || 1 })} /></label><label>Niveau<input value={tableEditor.floor} onChange={event => setTableEditor({ ...tableEditor, floor: event.target.value })} /></label><label>Zone<input value={tableEditor.zone} onChange={event => setTableEditor({ ...tableEditor, zone: event.target.value })} /></label><label className="wide">Serveur affecté<select value={tableEditor.assignedEmployeeId || ''} onChange={event => setTableEditor({ ...tableEditor, assignedEmployeeId: event.target.value || undefined })}><option value="">Équipe commune</option>{waiters.map(waiter => <option value={waiter.id} key={waiter.id}>{waiter.name} · {activeCountForWaiter(waiter.id)} table(s) active(s)</option>)}</select></label><label className="wide">Blocage éventuel<input value={tableEditor.blockedReason || ''} onChange={event => setTableEditor({ ...tableEditor, blockedReason: event.target.value || undefined })} placeholder="Ex. accès PMR temporairement indisponible" /></label></div>
        <fieldset><legend>Forme</legend><div>{(Object.entries(SHAPE_LABELS) as Array<[RestaurantDiningTableShape, string]>).map(([shape, label]) => <button type="button" className={tableEditor.shape === shape ? 'active' : ''} key={shape} onClick={() => setTableEditor({ ...tableEditor, shape })}><i className={shape} /> {label}</button>)}</div></fieldset>
        <label className="restaurant-studio-rotation"><span><RotateCw size={16} /> Orientation <b>{tableEditor.rotation}°</b></span><input type="range" min="0" max="345" step="15" value={tableEditor.rotation} onChange={event => setTableEditor({ ...tableEditor, rotation: Number(event.target.value) })} /></label>
        <div className="restaurant-studio-editor-actions"><button type="button" className="danger" onClick={removeSelection}><Trash2 size={17} /> Retirer</button><button type="button" className="save" onClick={saveTableEditor}><CheckCircle2 size={17} /> Appliquer</button></div>
      </aside> : studioMode && elementEditor ? <aside className="restaurant-studio-editor">
        <header><div><span>ÉLÉMENT ARCHITECTURAL</span><h3>{elementEditor.label}</h3></div><button type="button" onClick={() => setSelectedObject(undefined)}><X size={18} /></button></header>
        <div className="restaurant-studio-form"><label className="wide">Nom<input value={elementEditor.label} onChange={event => setElementEditor({ ...elementEditor, label: event.target.value })} /></label><label>Largeur (%)<input type="number" min="1" max="100" value={elementEditor.width} onChange={event => setElementEditor({ ...elementEditor, width: Number(event.target.value) || 1 })} /></label><label>Hauteur (%)<input type="number" min="1" max="100" value={elementEditor.height} onChange={event => setElementEditor({ ...elementEditor, height: Number(event.target.value) || 1 })} /></label><label>Niveau<input value={elementEditor.floor} onChange={event => setElementEditor({ ...elementEditor, floor: event.target.value })} /></label><label>Zone<input value={elementEditor.zone} onChange={event => setElementEditor({ ...elementEditor, zone: event.target.value })} /></label></div>
        <label className="restaurant-studio-rotation"><span><RotateCw size={16} /> Orientation <b>{elementEditor.rotation}°</b></span><input type="range" min="0" max="345" step="15" value={elementEditor.rotation} onChange={event => setElementEditor({ ...elementEditor, rotation: Number(event.target.value) })} /></label>
        <div className="restaurant-studio-editor-actions"><button type="button" className="danger" onClick={removeSelection}><Trash2 size={17} /> Retirer</button><button type="button" className="save" onClick={saveElementEditor}><CheckCircle2 size={17} /> Appliquer</button></div>
      </aside> : studioMode ? <aside className="restaurant-studio-palette">
        <header><PencilRuler size={20} /><div><strong>Bibliothèque du Studio</strong><small>Mobilier et structure de la zone</small></div></header>
        <button type="button" className="restaurant-studio-add-table" onClick={addTable}><Plus size={18} /> Ajouter une table</button>
        <div className="restaurant-studio-elements">{ELEMENT_CATALOG.map(item => <button type="button" key={item.type} onClick={() => addElement(item)}><i className={item.type} /><span>{item.label}</span></button>)}</div>
        <section className="restaurant-studio-background"><header><FileImage size={18} /><div><strong>Fond de plan</strong><small>{currentBackground?.name || 'Aucun plan importé'}</small></div></header><input ref={backgroundInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => importBackground(event.target.files?.[0])} /><button type="button" onClick={() => backgroundInputRef.current?.click()}><Upload size={16} /> Importer une image</button>{currentBackground && <><label>Opacité <b>{Math.round(currentBackground.opacity * 100)}%</b><input type="range" min="0.1" max="0.9" step="0.05" value={currentBackground.opacity} onChange={event => updateBackgroundOpacity(Number(event.target.value))} /></label><button type="button" className="danger" onClick={removeBackground}><Trash2 size={15} /> Retirer le fond</button></>}</section>
        <section className={`restaurant-studio-collision-report ${collisionPairs.length ? 'danger' : 'clear'}`}><ScanLine size={20} /><div><strong>{collisionPairs.length ? `${collisionPairs.length} chevauchement(s)` : 'Circulation contrôlée'}</strong><small>{collisionPairs.length ? 'Les tables concernées sont cerclées en rouge.' : 'Aucun conflit détecté dans cette zone.'}</small></div></section>
      </aside> : selectedRuntime ? <aside className={`restaurant-floor-detail ${selectedRuntime.status}`}>
        <header><div><span>{STATUS_LABELS[selectedRuntime.status]}</span><h3>{selectedRuntime.table.label}</h3><p>{selectedRuntime.table.capacity} places · {selectedRuntime.table.zone}</p></div><button type="button" onClick={() => setSelectedObject(undefined)}><X size={18} /></button></header>
        {selectedRuntime.waiter && <div className="restaurant-floor-waiter"><span style={{ background: WAITER_COLORS[Math.max(0, waiters.findIndex(item => item.id === selectedRuntime.waiter!.id)) % WAITER_COLORS.length] }}>{selectedRuntime.waiter.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><small>Responsable de table</small><strong>{selectedRuntime.waiter.name}</strong></div></div>}
        {editable && <label className="restaurant-floor-waiter-select">Réaffecter<select value={selectedRuntime.table.assignedEmployeeId || ''} onChange={event => execute(() => state.assignRestaurantDiningTableWaiter(selectedRuntime.table.id, event.target.value || undefined), 'Affectation mise à jour en direct.')}><option value="">Équipe commune</option>{waiters.map(waiter => <option value={waiter.id} key={waiter.id}>{waiter.name}</option>)}</select></label>}
        {selectedRuntime.customer ? <div className="restaurant-floor-customer"><Users size={18} /><span><small>Client</small><strong>{selectedRuntime.customer.fullName}</strong>{selectedRuntime.customer.allergies && <em>Allergie : {selectedRuntime.customer.allergies}</em>}</span></div> : <div className="restaurant-floor-customer"><Users size={18} /><span><small>Disponibilité</small><strong>Prête à accueillir</strong></span></div>}
        {selectedRuntime.order && <div className="restaurant-floor-order"><span><ChefHat size={17} /> {selectedRuntime.order.items.reduce((sum, item) => sum + item.quantity, 0)} article(s)</span><strong>{formatFCFA(selectedRuntime.order.total)}</strong></div>}
        {selectedRuntime.reservation && <div className="restaurant-floor-reservation"><MapPin size={16} /><span><strong>{selectedRuntime.reservation.guests} personne(s) à {selectedRuntime.reservation.time}</strong><small>{selectedRuntime.reservation.notes || 'Réservation confirmée'}</small></span></div>}
        {!selectedRuntime.reservation && selectedUpcomingReservation && <div className="restaurant-floor-reservation future"><MapPin size={16} /><span><strong>Prochaine réservation · {new Date(`${selectedUpcomingReservation.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {selectedUpcomingReservation.time}</strong><small>La table reste libre pour le service actuel jusqu’à l’arrivée du client.</small></span></div>}
        {selectedRuntime.status === 'free' && <div className="restaurant-floor-live-actions"><button type="button" onClick={() => setWalkInOpen(value => !value)}><UserPlus size={16} /> Installer sans réservation</button>{walkInOpen && <div className="restaurant-floor-inline-form"><input value={walkIn.name} onChange={event => setWalkIn({ ...walkIn, name: event.target.value })} placeholder="Nom du client" /><input type="number" min="1" max={selectedRuntime.table.capacity} value={walkIn.guests} onChange={event => setWalkIn({ ...walkIn, guests: Number(event.target.value) || 1 })} /><button type="button" onClick={() => runWalkIn(selectedRuntime.table.id)}>Installer</button></div>}{unassignedReservations.length > 0 && <><select value={reservationChoice} onChange={event => setReservationChoice(event.target.value)}><option value="">Planifier une réservation sur cette table</option>{unassignedReservations.filter(reservation => reservation.guests <= selectedRuntime.table.capacity).map(reservation => <option key={reservation.id} value={reservation.id}>{reservation.date === today ? 'Aujourd’hui' : new Date(`${reservation.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {reservation.time} · {db.sartalCustomers.find(customer => customer.id === reservation.customerId)?.fullName} · {reservation.guests} pers.</option>)}</select><button type="button" disabled={!reservationChoice} onClick={() => { if (execute(() => state.assignRestaurantReservationTable(reservationChoice, selectedRuntime.table.id, actor), 'Table planifiée sans installer prématurément le client.')) setReservationChoice(''); }}><MapPin size={16} /> Planifier cette table</button></>}{activeWaitlist[0] && <div className="restaurant-floor-waitlist"><span><Clock3 size={15} /><strong>{db.sartalCustomers.find(customer => customer.id === activeWaitlist[0].customerId)?.fullName}</strong><small>{activeWaitlist[0].guests} pers. · attente annoncée {activeWaitlist[0].quotedMinutes} min</small></span><button type="button" onClick={() => execute(() => state.updateRestaurantWaitlistStatus(activeWaitlist[0].id, 'seated', selectedRuntime.table.label), 'Client de la liste d’attente installé et informé.')}><DoorOpen size={15} /> Installer</button></div>}</div>}
        {selectedRuntime.status === 'reserved' && selectedRuntime.reservation && <button type="button" className="restaurant-floor-primary" onClick={() => seatReservationAndTakeOrder(selectedRuntime.reservation!.id, selectedRuntime.table.id)}><DoorOpen size={16} /> Installer et prendre la commande</button>}
        {selectedRuntime.status === 'occupied' && !selectedRuntime.order && <button type="button" className="restaurant-floor-primary" onClick={() => { const id = execute(() => state.openRestaurantTableOrder(selectedRuntime.table.id, actor), 'Commande ouverte et visible par la salle.'); if (id) setOrderPanelOrderId(id); }}><ReceiptText size={16} /> Ouvrir et prendre la commande</button>}
        {selectedRuntime.order && !['paid', 'cancelled'].includes(selectedRuntime.order.status) && <button type="button" className="restaurant-floor-primary restaurant-floor-order-button" onClick={() => setOrderPanelOrderId(selectedRuntime.order!.id)}><ReceiptText size={16} /> Prendre ou compléter la commande</button>}
        {selectedRuntime.request && <button type="button" className="restaurant-floor-primary" onClick={() => execute(() => state.updateSartalServiceRequest(selectedRuntime.request!.id, selectedRuntime.request!.status === 'requested' ? 'accepted' : 'completed', actor), 'Demande client mise à jour.')}><BellRing size={16} /> {selectedRuntime.request.status === 'requested' ? 'Prendre la demande' : 'Confirmer effectué'}</button>}
        {!selectedRuntime.request && selectedRuntime.order?.status === 'ready' && <button type="button" className="restaurant-floor-primary" onClick={() => execute(() => state.updateRestaurantGuestOrderStatus(selectedRuntime.order!.id, 'served'), `${selectedRuntime.table.label} marquée servie.`)}><CheckCircle2 size={16} /> Confirmer le service</button>}
        {selectedRuntime.order?.status === 'served' && <><div className="restaurant-floor-bill"><ReceiptText size={17} /><span><small>Addition en attente</small><strong>{formatFCFA(Math.max(0, selectedRuntime.order.total - selectedRuntime.order.payments.reduce((sum, payment) => sum + payment.amount, 0)))}</strong></span></div><button type="button" className="restaurant-floor-primary" onClick={() => execute(() => state.requestRestaurantTableBill(selectedRuntime.table.id, actor), 'Demande d’addition transmise à la caisse.')}><ReceiptText size={16} /> Demander l’addition</button></>}
        {selectedRuntime.customer && <button type="button" className="restaurant-floor-secondary" onClick={() => createTableQR(selectedRuntime.table.id)}><QrCode size={16} /> Créer l’accès QR client</button>}
        {selectedAccess && <div className="restaurant-floor-access"><QrCode size={18} /><span><small>Accès actif</small><strong>Code {selectedAccess.code}</strong></span></div>}
        {!['free', 'reserved'].includes(selectedRuntime.status) && <div className="restaurant-floor-transfer"><select value={transferTargetId} onChange={event => setTransferTargetId(event.target.value)}><option value="">Transférer vers une table libre</option>{freeTransferTargets.filter(item => item.table.capacity >= (selectedRuntime.reservation?.guests || 1)).map(item => <option key={item.table.id} value={item.table.id}>{item.table.label} · {item.table.capacity} places</option>)}</select><button type="button" disabled={!transferTargetId} onClick={() => { if (execute(() => state.transferRestaurantTable(selectedRuntime.table.id, transferTargetId, actor), 'Table transférée avec sa commande et sa réservation.')) setTransferTargetId(''); }}><ArrowLeftRight size={16} /> Transférer</button></div>}
      </aside> : null}
    </div>

    <footer className="restaurant-floor-legend"><div>{(Object.entries(STATUS_LABELS) as Array<[FloorStatus, string]>).map(([status, label]) => <span className={status} key={status}><i /> {label}</span>)}</div><div className="restaurant-floor-waiter-legend">{waiters.map((waiter, index) => <span key={waiter.id}><i style={{ background: WAITER_COLORS[index % WAITER_COLORS.length] }} /> {waiter.name.split(' ')[0]} <b>{activeCountForWaiter(waiter.id)}</b></span>)}</div>{editable && <button type="button" onClick={() => execute(() => state.rebalanceRestaurantServiceSections(posId, actor), 'Secteurs rééquilibrés selon l’équipe disponible.')}><Users size={16} /> Rééquilibrer les secteurs</button>}<button type="button" onClick={() => setShowGovernance(value => !value)}><History size={16} /> Versions & journal</button><b>{visibleTables.length} table(s)</b></footer>

    {showGovernance && <section className="restaurant-floor-governance"><header><div><span>GOUVERNANCE DU PLAN</span><h3>Versions publiées et traçabilité</h3></div><button type="button" onClick={() => setShowGovernance(false)}><X size={18} /></button></header><div><section><h4><History size={17} /> Versions</h4>{versions.map(version => <article key={version.id}><div><span className={version.status}>{version.status === 'published' ? 'Publié' : version.status === 'draft' ? 'Brouillon' : 'Archivé'}</span><strong>{version.label}</strong><small>{version.createdBy} · {new Date(version.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></div><footer>{version.status === 'draft' && <button type="button" onClick={() => enterStudio(version)}><PencilRuler size={14} /> Ouvrir</button>}{editable && version.status !== 'published' && <button type="button" onClick={() => restoreVersion(version)}><History size={14} /> Restaurer</button>}{version.status === 'draft' && <button type="button" className="danger" onClick={() => execute(() => state.deleteRestaurantFloorPlanVersion(version.id), 'Brouillon supprimé.')}><Trash2 size={14} /></button>}</footer></article>)}</section><section><h4><ScanLine size={17} /> Journal d’audit</h4>{auditEntries.map(entry => <article key={entry.id}><div><span>{entry.action.replaceAll('_', ' ')}</span><strong>{entry.summary}</strong><small>{entry.actor} · {new Date(entry.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></div></article>)}{auditEntries.length === 0 && <p>Aucune modification enregistrée.</p>}</section></div></section>}

    {confirmExit && <div className="restaurant-floor-confirm"><section><h3>Quitter sans publier ?</h3><p>Les modifications locales non enregistrées seront perdues. Le plan actuellement publié restera inchangé.</p><div><button type="button" onClick={() => setConfirmExit(false)}>Continuer le Studio</button><button type="button" className="danger" onClick={forceLeaveStudio}>Quitter sans enregistrer</button></div></section></div>}
    {notice && <div className={`restaurant-floor-notice ${notice.tone}`}>{notice.text}</div>}
  </section>;
};

export default RestaurantFloorStudio;
