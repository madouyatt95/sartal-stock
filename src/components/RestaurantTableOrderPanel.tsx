import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChefHat, Clock3, Minus, Plus, Search, Send, Trash2, Users, X } from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { RestaurantServiceCourse } from '../types';

interface RestaurantTableOrderPanelProps {
  state: StockState;
  orderId: string;
  tableLabel: string;
  capacity: number;
  actor: string;
  onClose: () => void;
}

interface CartLine {
  key: string;
  productId: string;
  quantity: number;
  seatNumber?: number;
  course: RestaurantServiceCourse;
  modifiers: string[];
  note?: string;
}

const COURSE_LABELS: Record<RestaurantServiceCourse, string> = { drinks: 'Boissons', starter: 'Entrées', main: 'Plats', dessert: 'Desserts' };
const STATUS_LABELS = { held: 'En attente', sent: 'Envoyé', preparing: 'En préparation', ready: 'Prêt', served: 'Servi', voided: 'Annulé' } as const;
const QUICK_MODIFIERS = ['Sans piment', 'Sans sel', 'Bien cuit', 'Très frais'];
const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;

export const RestaurantTableOrderPanel: React.FC<RestaurantTableOrderPanelProps> = ({ state, orderId, tableLabel, capacity, actor, onClose }) => {
  const { db } = state;
  const order = db.restaurantGuestOrders.find(item => item.id === orderId);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tout');
  const [seatNumber, setSeatNumber] = useState(1);
  const [course, setCourse] = useState<RestaurantServiceCourse>('drinks');
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string }>();

  const menu = useMemo(() => db.posPricing
    .filter(pricing => pricing.posId === order?.posId && pricing.isAvailable)
    .map(pricing => ({ pricing, product: db.products.find(product => product.id === pricing.productId) }))
    .filter(item => item.product?.isActive), [db.posPricing, db.products, order?.posId]);
  const categories = useMemo(() => ['Tout', ...Array.from(new Set(menu.map(item => item.product!.category)))], [menu]);
  const visibleMenu = menu.filter(item => (category === 'Tout' || item.product!.category === category) && `${item.product!.name} ${item.product!.sku}`.toLowerCase().includes(search.toLowerCase()));
  const warehouse = db.warehouses.find(item => item.id === (menu[0]?.pricing.defaultWarehouseId || db.posList.find(item => item.id === order?.posId)?.defaultWarehouseId));
  const heldByCourse = (Object.keys(COURSE_LABELS) as RestaurantServiceCourse[]).map(value => ({ course: value, count: order?.items.filter(item => item.course === value && item.status === 'held').length || 0 }));

  if (!order) return null;

  const execute = (action: () => unknown, success: string) => {
    try { action(); setNotice({ tone: 'success', text: success }); window.setTimeout(() => setNotice(undefined), 2600); }
    catch (error) { setNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Action impossible' }); }
  };
  const addProduct = (productId: string) => {
    const key = `${productId}-${seatNumber}-${course}-${modifiers.join('|')}-${note.trim()}`;
    setCart(current => {
      const existing = current.find(item => item.key === key);
      return existing ? current.map(item => item.key === key ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { key, productId, quantity: 1, seatNumber, course, modifiers, note: note.trim() || undefined }];
    });
  };
  const changeQuantity = (key: string, delta: number) => setCart(current => current.map(item => item.key === key ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0));
  const submitCart = (status: 'held' | 'sent') => {
    if (!cart.length) throw new Error('Ajoutez au moins un article');
    state.appendRestaurantGuestOrderItems(order.id, order.customerId, cart.map(item => ({ productId: item.productId, quantity: item.quantity, seatNumber: item.seatNumber, course: item.course, modifiers: item.modifiers, note: item.note, status, actorName: actor })));
    setCart([]);
  };
  const cartTotal = cart.reduce((sum, line) => sum + line.quantity * (menu.find(item => item.product!.id === line.productId)?.pricing.salePrice || 0), 0);

  return <aside className="restaurant-order-panel" aria-label={`Commande ${tableLabel}`}>
    <header className="restaurant-order-panel-header"><div><span>PRISE DE COMMANDE</span><h2>Table {tableLabel}</h2><p>{order.items.filter(item => item.status !== 'voided').length} ligne(s) · sortie {warehouse?.name || 'dépôt du POS'}</p></div><button onClick={onClose} aria-label="Fermer la commande"><X size={21} /></button></header>
    <div className="restaurant-order-context">
      <section><small>Convive</small><div className="restaurant-seat-picker"><button className={seatNumber === 0 ? 'active' : ''} onClick={() => setSeatNumber(0)}><Users size={15} /> Table</button>{Array.from({ length: capacity }, (_, index) => index + 1).map(seat => <button className={seatNumber === seat ? 'active' : ''} key={seat} onClick={() => setSeatNumber(seat)}>{seat}</button>)}</div></section>
      <section><small>Service</small><div className="restaurant-course-picker">{(Object.entries(COURSE_LABELS) as Array<[RestaurantServiceCourse, string]>).map(([value, label]) => <button className={course === value ? 'active' : ''} key={value} onClick={() => setCourse(value)}>{label}</button>)}</div></section>
    </div>
    <div className="restaurant-order-tools"><label><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un plat, une boisson..." /></label><div>{categories.map(item => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
    <div className="restaurant-order-menu">{visibleMenu.map(item => <button key={item.product!.id} onClick={() => addProduct(item.product!.id)}><span><strong>{item.product!.name}</strong><small>{item.product!.category} · {COURSE_LABELS[course]} · convive {seatNumber || 'table'}</small></span><b>{formatFCFA(item.pricing.salePrice)}</b><Plus size={17} /></button>)}{visibleMenu.length === 0 && <p>Aucun article disponible pour ce filtre.</p>}</div>
    <section className="restaurant-order-options"><div>{QUICK_MODIFIERS.map(item => <button className={modifiers.includes(item) ? 'active' : ''} key={item} onClick={() => setModifiers(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item])}>{modifiers.includes(item) && <Check size={13} />}{item}</button>)}</div><input value={note} onChange={event => setNote(event.target.value)} placeholder="Consigne cuisine pour les prochains articles" /></section>
    <section className="restaurant-order-cart"><header><div><strong>À ajouter</strong><small>{cart.length ? `${cart.reduce((sum, item) => sum + item.quantity, 0)} article(s)` : 'Touchez un produit'}</small></div><b>{formatFCFA(cartTotal)}</b></header>{cart.map(line => { const product = db.products.find(item => item.id === line.productId); return <article key={line.key}><span><strong>{product?.name}</strong><small>Convive {line.seatNumber || 'table'} · {COURSE_LABELS[line.course]}{line.modifiers.length ? ` · ${line.modifiers.join(', ')}` : ''}</small></span><div><button onClick={() => changeQuantity(line.key, -1)}><Minus size={14} /></button><b>{line.quantity}</b><button onClick={() => changeQuantity(line.key, 1)}><Plus size={14} /></button></div></article>; })}<footer><button disabled={!cart.length} onClick={() => execute(() => submitCart('held'), 'Lignes gardées. Elles partiront avec le service choisi.')}><Clock3 size={17} /> Garder par service</button><button disabled={!cart.length} className="primary" onClick={() => execute(() => submitCart('sent'), 'Commande envoyée aux postes de préparation.')}><Send size={17} /> Envoyer maintenant</button></footer></section>
    <section className="restaurant-order-ticket"><header><div><ChefHat size={18} /><span><strong>Ticket en direct</strong><small>État partagé salle, cuisine et caisse</small></span></div><b>{formatFCFA(order.total)}</b></header>{heldByCourse.some(item => item.count > 0) && <div className="restaurant-course-fire">{heldByCourse.filter(item => item.count > 0).map(item => <button key={item.course} onClick={() => execute(() => state.fireRestaurantOrderCourse(order.id, item.course, actor), `${COURSE_LABELS[item.course]} envoyé(s) en préparation.`)}><Send size={14} /> Envoyer {COURSE_LABELS[item.course]} · {item.count}</button>)}</div>}<div>{order.items.filter(item => item.status !== 'voided').map(line => { const product = db.products.find(item => item.id === line.productId); return <article className={line.status || 'held'} key={line.id || `${line.productId}-${line.seatNumber}`}><span><strong>{line.quantity}× {product?.name}</strong><small>Convive {line.seatNumber || 'table'} · {COURSE_LABELS[line.course || 'main']} · {STATUS_LABELS[line.status || 'held']}</small>{line.note && <em>{line.note}</em>}</span>{line.status === 'ready' ? <button className="serve" onClick={() => execute(() => state.updateRestaurantOrderItemStatus(order.id, line.id!, 'served', actor), `${product?.name} servi.`)}><Check size={15} /> Servi</button> : ['held', 'sent'].includes(line.status || 'held') ? <button className="void" onClick={() => execute(() => state.requestEmployeeApproval({ type: 'void', referenceId: order.id, requestedBy: db.employeeProfiles.find(item => item.name === actor)?.id || db.currentUser.id, requestedByName: actor, label: `Annulation ${product?.name} · ${tableLabel}`, reason: 'Annulation demandée avant préparation.', amount: line.quantity * line.salePrice, metadata: { orderId: order.id, itemId: line.id || '', disposition: 'restock' } }), 'Annulation envoyée au manager.')}><Trash2 size={15} /></button> : null}</article>; })}</div>{order.items.some(item => item.status === 'voided') && <p className="restaurant-order-audit"><AlertTriangle size={15} /> Les lignes annulées restent visibles dans l’historique d’audit.</p>}</section>
    {notice && <div className={`restaurant-order-notice ${notice.tone}`}>{notice.text}</div>}
  </aside>;
};

export default RestaurantTableOrderPanel;
