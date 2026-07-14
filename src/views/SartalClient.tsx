import React, { useMemo, useState } from 'react';
import {
  ArrowRight, BedDouble, CalendarDays, CheckCircle, ChefHat, CircleDollarSign, Clock3,
  Camera, Gift, Heart, HeartHandshake, MapPin, MessageCircle, Mic, Minus, PackageCheck, Phone,
  Plus, ReceiptText, Search, Send, ShoppingBag, Sparkles, Star, Store, Truck, UserPlus, UserRound,
  UtensilsCrossed, WalletCards
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { DeliveryOrderStatus, PAYMENT_TYPE_LABELS, PaymentType, RestaurantGuestOrder } from '../types';
import SartalClientHub from './SartalClientHub';

type ClientMode = 'restaurant' | 'delivery';
type RestaurantTab = 'welcome' | 'reserve' | 'menu' | 'order';
type DeliveryTab = 'shop' | 'basket' | 'tracking' | 'help';

interface SartalClientProps {
  state: StockState;
  initialMode?: ClientMode;
  standalone?: boolean;
  initialCustomerId?: string;
  initialHub?: boolean;
}

const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;
const formatDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });

const restaurantStatus: Record<RestaurantGuestOrder['status'], string> = {
  placed: 'Reçue', confirmed: 'Confirmée', preparing: 'En cuisine', ready: 'Prête', served: 'Servie', paid: 'Payée', cancelled: 'Annulée'
};

const deliveryStatus: Record<DeliveryOrderStatus, string> = {
  confirmed: 'Confirmée', reserved: 'Stock réservé', preparing: 'Préparation', ready: 'Prête', out_for_delivery: 'Livreur en route', delivered: 'Livrée', failed: 'Incident', returned: 'Retour dépôt', cancelled: 'Annulée'
};

export const SartalClient: React.FC<SartalClientProps> = ({ state, initialMode = 'restaurant', standalone = false, initialCustomerId, initialHub = false }) => {
  const {
    db, createRestaurantReservation, updateRestaurantReservation, cancelRestaurantReservation,
    placeRestaurantGuestOrder, addRestaurantGuestOrderPayment, createDeliveryCustomerOrder,
    reorderDeliveryOrder, sendSartalCustomerMessage,
    submitSartalCustomerFeedback, requestSartalService, inviteRestaurantGuest,
    payRestaurantGuestShare, toggleFavoriteProduct
  } = state;
  const [space, setSpace] = useState<'hub' | 'service'>(initialHub || !standalone ? 'hub' : 'service');
  const [mode, setMode] = useState<ClientMode>(initialMode);
  const [restaurantTab, setRestaurantTab] = useState<RestaurantTab>('welcome');
  const [deliveryTab, setDeliveryTab] = useState<DeliveryTab>('shop');
  const [customerId, setCustomerId] = useState(initialCustomerId || (initialMode === 'restaurant' ? 'customer-aminata' : 'customer-awa'));
  const [restaurantCart, setRestaurantCart] = useState<Record<string, number>>({});
  const [deliveryCart, setDeliveryCart] = useState<Record<string, number>>({});
  const [substitutionPolicies, setSubstitutionPolicies] = useState<Record<string, 'replace' | 'contact' | 'refund' | 'cancel_order'>>({});
  const [search, setSearch] = useState('');
  const [serviceType, setServiceType] = useState<RestaurantGuestOrder['serviceType']>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<PaymentType>('wave');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState('');
  const [feedbackScore, setFeedbackScore] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [inviteForm, setInviteForm] = useState({ fullName: '', phone: '' });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [reservationForm, setReservationForm] = useState({ date: tomorrow, time: '20:00', guests: 2, occasion: 'meal' as const, notes: '' });

  const customer = db.sartalCustomers.find(item => item.id === customerId);
  const brandSettings = db.sartalBrandSettings;
  const restaurant = db.posList.find(item => item.type === 'restaurant');
  const deliveryChannel = db.posList.find(item => item.type === 'online_grocery');
  const deliveryWarehouse = db.warehouses.find(item => item.id === deliveryChannel?.defaultWarehouseId);
  const restaurantReservations = db.restaurantReservations.filter(item => item.customerId === customer?.id && item.status !== 'cancelled');
  const upcomingReservation = restaurantReservations.find(item => ['confirmed', 'seated'].includes(item.status));
  const restaurantOrders = db.restaurantGuestOrders.filter(item => item.customerId === customer?.id);
  const activeRestaurantOrder = restaurantOrders.find(item => !['paid', 'cancelled'].includes(item.status)) || restaurantOrders[0];
  const pmsGuest = db.pmsGuests.find(item => item.phone.replace(/\s/g, '') === customer?.phone.replace(/\s/g, ''));
  const activePmsFolio = db.pmsFolios.find(item => item.guestId === pmsGuest?.id && item.status === 'open');
  const activePmsRoom = db.pmsRooms.find(item => item.id === activePmsFolio?.roomId);
  const deliveryOrders = db.deliveryOrders.filter(item => item.customerId === customer?.id || item.phone === customer?.phone);
  const activeDeliveryOrder = deliveryOrders.find(item => !['delivered', 'returned', 'cancelled'].includes(item.status)) || deliveryOrders[0];
  const conversations = db.sartalCustomerMessages.filter(item => item.customerId === customer?.id && item.context === mode).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const activeServiceRequests = db.sartalServiceRequests.filter(item => item.customerId === customer?.id && item.referenceId === (mode === 'restaurant' ? activeRestaurantOrder?.id : activeDeliveryOrder?.id) && !['completed', 'cancelled'].includes(item.status));
  const restaurantInvites = db.restaurantGuestInvites.filter(item => item.orderId === activeRestaurantOrder?.id);
  const activeFeedback = db.sartalCustomerFeedback.find(item => item.customerId === customer?.id && item.referenceId === activeDeliveryOrder?.id);

  const restaurantMenu = useMemo(() => {
    if (!restaurant) return [];
    return db.posPricing.filter(item => item.posId === restaurant.id && item.isAvailable).map(item => {
      const product = db.products.find(productItem => productItem.id === item.productId);
      const warehouseId = item.defaultWarehouseId || restaurant.defaultWarehouseId;
      const stock = db.stocks.find(stockItem => stockItem.productId === item.productId && stockItem.warehouseId === warehouseId);
      const recipe = db.recipes.find(recipeItem => recipeItem.productId === item.productId);
      const available = product?.isStockable ? (stock?.quantityAvailable || 0) > 0 : recipe ? recipe.ingredients.every(ingredient => (db.stocks.find(stockItem => stockItem.productId === ingredient.productId && stockItem.warehouseId === warehouseId)?.quantityAvailable || 0) >= ingredient.quantity) : true;
      return { product, price: item.salePrice, available, recipe };
    }).filter(item => item.product && ['Plats', 'Desserts', 'Boissons'].includes(item.product.category));
  }, [db, restaurant]);

  const onlineProducts = useMemo(() => {
    if (!deliveryChannel || !deliveryWarehouse) return [];
    return db.posPricing.filter(item => item.posId === deliveryChannel.id && item.isAvailable).map(item => {
      const product = db.products.find(productItem => productItem.id === item.productId);
      const stock = db.stocks.find(stockItem => stockItem.productId === item.productId && stockItem.warehouseId === deliveryWarehouse.id);
      return { product, price: item.salePrice, available: Math.max(0, (stock?.quantityAvailable || 0) - (stock?.quantityReserved || 0)) };
    }).filter(item => item.product && item.available > 0 && `${item.product.name} ${item.product.category}`.toLowerCase().includes(search.toLowerCase())).slice(0, 16);
  }, [db, deliveryChannel, deliveryWarehouse, search]);

  if (!customer || !restaurant || !deliveryChannel || !deliveryWarehouse) {
    return <main className="portal-unavailable">
      <section>
        <img src="./brand-mark.svg" alt="Sártal" />
        <span>MON SÁRTAL</span>
        <h1>Votre espace se prépare</h1>
        <p>Le restaurant ou le service de livraison n’est pas disponible pour le moment. Notre équipe peut vous accompagner directement.</p>
        <a href={`tel:${brandSettings.supportPhone.replace(/\s/g, '')}`}><Phone size={17} /> Appeler le {brandSettings.supportPhone}</a>
      </section>
    </main>;
  }

  const restaurantTotal = Object.entries(restaurantCart).reduce((sum, [productId, quantity]) => sum + (db.posPricing.find(item => item.posId === restaurant.id && item.productId === productId)?.salePrice || 0) * quantity, 0);
  const deliverySubtotal = Object.entries(deliveryCart).reduce((sum, [productId, quantity]) => sum + (db.posPricing.find(item => item.posId === deliveryChannel.id && item.productId === productId)?.salePrice || 0) * quantity, 0);
  const defaultAddress = customer.addresses.find(item => item.isDefault) || customer.addresses[0];
  const deliveryFee = defaultAddress?.zone === 'Point E / Fann' ? 1000 : defaultAddress?.zone === 'Mermoz / Sacré-Coeur' ? 1200 : 1500;
  const currentTab = mode === 'restaurant' ? restaurantTab : deliveryTab;

  const switchMode = (nextMode: ClientMode) => {
    setMode(nextMode);
    setSpace('service');
    setCustomerId(nextMode === 'restaurant' ? 'customer-aminata' : 'customer-awa');
    setPaymentMethod('wave');
    setServiceType('dine_in');
    setMessage('');
  };
  const changeCustomer = (nextCustomerId: string) => {
    const nextCustomer = db.sartalCustomers.find(item => item.id === nextCustomerId);
    const nextGuest = db.pmsGuests.find(item => item.phone.replace(/\s/g, '') === nextCustomer?.phone.replace(/\s/g, ''));
    const canChargeRoom = db.pmsFolios.some(item => item.guestId === nextGuest?.id && item.status === 'open');
    setCustomerId(nextCustomerId);
    if (!canChargeRoom) {
      setPaymentMethod('wave');
      setServiceType('dine_in');
    }
  };
  const changeQuantity = (kind: ClientMode, productId: string, delta: number) => {
    const setter = kind === 'restaurant' ? setRestaurantCart : setDeliveryCart;
    setter(current => {
      const quantity = Math.max(0, (current[productId] || 0) + delta);
      const next = { ...current, [productId]: quantity };
      if (quantity === 0) delete next[productId];
      return next;
    });
  };
  const reserveTable = () => {
    const id = createRestaurantReservation({ customerId: customer.id, posId: restaurant.id, ...reservationForm });
    setMessage(`Réservation ${id} confirmée. Un rappel WhatsApp sera envoyé.`);
    setRestaurantTab('welcome');
  };
  const placeRestaurantOrder = () => {
    try {
      const id = placeRestaurantGuestOrder({ customerId: customer.id, posId: restaurant.id, reservationId: upcomingReservation?.id, tableNumber: upcomingReservation?.tableNumber, folioId: paymentMethod === 'room_charge' ? activePmsFolio?.id : undefined, roomNumber: paymentMethod === 'room_charge' ? activePmsRoom?.roomNumber : undefined, serviceType, items: Object.entries(restaurantCart).map(([productId, quantity]) => ({ productId, quantity })), paymentMethod });
      setRestaurantCart({});
      setMessage(`Commande ${id} transmise directement à la cuisine.`);
      setRestaurantTab('order');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Commande impossible'); }
  };
  const placeDeliveryOrder = () => {
    if (!defaultAddress) return;
    try {
      const id = createDeliveryCustomerOrder({ customerId: customer.id, addressId: defaultAddress.id, items: Object.entries(deliveryCart).map(([productId, quantity]) => ({ productId, quantity, substitutionPolicy: substitutionPolicies[productId] || 'contact' })), paymentType: paymentMethod });
      setDeliveryCart({});
      setMessage(`Commande ${id} confirmée. Le stock est prêt à être réservé.`);
      setDeliveryTab('tracking');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Commande impossible'); }
  };
  const sendMessage = () => {
    if (!chat.trim()) return;
    sendSartalCustomerMessage(customer.id, mode, chat, mode === 'restaurant' ? activeRestaurantOrder?.id : activeDeliveryOrder?.id);
    setChat('');
    setMessage('Votre message a été transmis à l’équipe.');
  };
  const sendRichMessage = (channel: 'voice' | 'photo') => {
    const content = channel === 'voice' ? 'Note vocale envoyée (0:12)' : 'Photo envoyée au service client';
    sendSartalCustomerMessage(customer.id, mode, content, mode === 'restaurant' ? activeRestaurantOrder?.id : activeDeliveryOrder?.id, channel, channel === 'voice' ? 'Note vocale · 12 sec' : 'Photo du produit');
    setMessage(channel === 'voice' ? 'Votre note vocale a été transmise.' : 'Votre photo a été jointe à la conversation.');
  };
  const requestService = (type: 'water' | 'waiter' | 'bill' | 'delivery_help' | 'product_help', label: string) => {
    const referenceId = mode === 'restaurant' ? activeRestaurantOrder?.id : activeDeliveryOrder?.id;
    requestSartalService({ customerId: customer.id, context: mode, referenceId, type, label });
    setMessage(`${label} · l’équipe vous répond avant ${new Date(Date.now() + (type === 'bill' ? 3 : 5) * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`);
  };
  const inviteGuest = () => {
    if (!activeRestaurantOrder) return;
    try {
      inviteRestaurantGuest(activeRestaurantOrder.id, inviteForm);
      setInviteForm({ fullName: '', phone: '' });
      setMessage('Invitation envoyée avec un accès personnel à l’addition.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Invitation impossible'); }
  };
  const sendFeedback = () => {
    const referenceId = mode === 'restaurant' ? activeRestaurantOrder?.id : activeDeliveryOrder?.id;
    if (!referenceId) return;
    submitSartalCustomerFeedback({ customerId: customer.id, context: mode, referenceId, score: feedbackScore, note: feedbackNote });
    setMessage(feedbackScore <= 3 ? 'Un responsable a été alerté pour vous recontacter.' : 'Merci, votre retour a été transmis.');
  };
  const toggleFavorite = (productId: string) => {
    try {
      const enabled = toggleFavoriteProduct(customer.id, productId);
      setMessage(enabled ? 'Ajouté à vos favoris Mon Sártal.' : 'Retiré de vos favoris.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Favori indisponible'); }
  };

  const restaurantTabs: Array<{ id: RestaurantTab; label: string; icon: React.ReactNode }> = [
    { id: 'welcome', label: 'Accueil', icon: <Sparkles size={18} /> }, { id: 'reserve', label: 'Réserver', icon: <CalendarDays size={18} /> },
    { id: 'menu', label: 'La carte', icon: <UtensilsCrossed size={18} /> }, { id: 'order', label: 'Ma table', icon: <ReceiptText size={18} /> },
  ];
  const deliveryTabs: Array<{ id: DeliveryTab; label: string; icon: React.ReactNode }> = [
    { id: 'shop', label: 'Boutique', icon: <Store size={18} /> }, { id: 'basket', label: 'Panier', icon: <ShoppingBag size={18} /> },
    { id: 'tracking', label: 'Suivi', icon: <Truck size={18} /> }, { id: 'help', label: 'Aide', icon: <MessageCircle size={18} /> },
  ];
  const tabs = mode === 'restaurant' ? restaurantTabs : deliveryTabs;

  return (
    <section
      className={`sartal-client ${standalone ? 'standalone' : ''} mode-${mode} ${customer.lowBandwidthMode ? 'low-bandwidth' : ''}`}
      style={{ '--client-brand': brandSettings.primaryColor, '--client-accent': brandSettings.accentColor } as React.CSSProperties}
    >
      <header className="sartal-client-header">
        <div><span>{brandSettings.clientAppName.toUpperCase()}</span><strong>{mode === 'restaurant' ? restaurant.name : 'Épicerie & livraison'}</strong></div>
        <div className="client-mode-switch"><button className={space === 'hub' ? 'active' : ''} onClick={() => setSpace('hub')}><UserRound size={17} /> Mon Sártal</button><button className={space === 'service' && mode === 'restaurant' ? 'active' : ''} onClick={() => switchMode('restaurant')}><UtensilsCrossed size={17} /> À table</button><button className={space === 'service' && mode === 'delivery' ? 'active' : ''} onClick={() => switchMode('delivery')}><ShoppingBag size={17} /> Livraison</button></div>
        {!standalone && <div className="client-preview-controls"><select className="form-control" value={customer.id} onChange={event => changeCustomer(event.target.value)}>{db.sartalCustomers.map(item => <option value={item.id} key={item.id}>{item.fullName}</option>)}</select><button className="btn btn-primary" onClick={() => window.open(`${window.location.origin}${window.location.pathname}?client=${mode}`, '_blank', 'noopener,noreferrer')}>Ouvrir comme client <ArrowRight size={16} /></button></div>}
      </header>
      {space === 'hub' ? <main className="sartal-client-body hub-body"><SartalClientHub key={customer.id} state={state} customerId={customer.id} onOpenRestaurant={() => switchMode('restaurant')} onOpenDelivery={() => switchMode('delivery')} onMessage={setMessage} /></main> : <>
      <nav className="sartal-client-tabs">{tabs.map(item => <button key={item.id} className={currentTab === item.id ? 'active' : ''} onClick={() => mode === 'restaurant' ? setRestaurantTab(item.id as RestaurantTab) : setDeliveryTab(item.id as DeliveryTab)}>{item.icon}<span>{item.label}</span>{item.id === 'basket' && Object.values(deliveryCart).reduce((sum, value) => sum + value, 0) > 0 && <b>{Object.values(deliveryCart).reduce((sum, value) => sum + value, 0)}</b>}</button>)}</nav>

      <main className="sartal-client-body">
        {mode === 'restaurant' && restaurantTab === 'welcome' && <>
          <section className="client-hero restaurant">{!customer.lowBandwidthMode && <img src="./sartal-client-restaurant.jpg" alt="Plats sénégalais servis au restaurant" />}<div><span>Bonsoir {customer.fullName.split(' ')[0]}</span><h1>Votre table, à votre façon</h1><p>{customer.preferences || 'Réservez, commandez et profitez du moment.'}</p><button onClick={() => setRestaurantTab(upcomingReservation ? 'order' : 'reserve')}>{upcomingReservation ? 'Voir ma table' : 'Réserver une table'} <ArrowRight size={17} /></button></div></section>
          <section className="client-quick-grid"><article><CalendarDays size={22} /><span>Prochaine réservation</span><strong>{upcomingReservation ? `${formatDate(upcomingReservation.date)} · ${upcomingReservation.time}` : 'Aucune réservation'}</strong><small>{upcomingReservation ? `${upcomingReservation.guests} personne(s) · ${upcomingReservation.tableNumber || 'Table à attribuer'}` : 'Choisissez votre moment en quelques secondes.'}</small></article><article><Gift size={22} /><span>Mes avantages</span><strong>{customer.loyaltyPoints} points</strong><small>Niveau {customer.loyaltyTier} · utilisables sur place et en ligne.</small></article><article><HeartHandshake size={22} /><span>Reconnu par l’équipe</span><strong>{customer.visits} visite(s)</strong><small>{customer.allergies ? `Allergie signalée : ${customer.allergies}` : 'Vos préférences sont prêtes.'}</small></article></section>
          <section className="client-attention"><Sparkles size={22} /><div><strong>Une attention pour vous</strong><p>La cuisine a bien reçu vos préférences. Une table calme a été privilégiée.</p></div><button onClick={() => { setChat('Merci de confirmer une table au calme.'); setRestaurantTab('order'); }}>Écrire à l’équipe</button></section>
        </>}

        {mode === 'restaurant' && restaurantTab === 'reserve' && <section className="client-split-layout"><div className="client-form-panel"><span>RÉSERVATION DIRECTE</span><h1>Choisissez votre table</h1><p>Confirmation immédiate, modification possible depuis votre espace.</p><div className="client-form-grid"><label>Date<input className="form-control" type="date" min={tomorrow} value={reservationForm.date} onChange={event => setReservationForm({ ...reservationForm, date: event.target.value })} /></label><label>Heure<select className="form-control" value={reservationForm.time} onChange={event => setReservationForm({ ...reservationForm, time: event.target.value })}>{['12:30', '13:00', '13:30', '19:30', '20:00', '20:30', '21:00'].map(time => <option key={time}>{time}</option>)}</select></label><label>Personnes<input className="form-control" type="number" min="1" max="20" value={reservationForm.guests} onChange={event => setReservationForm({ ...reservationForm, guests: Number(event.target.value) })} /></label><label>Occasion<select className="form-control" value={reservationForm.occasion} onChange={event => setReservationForm({ ...reservationForm, occasion: event.target.value as typeof reservationForm.occasion })}><option value="meal">Repas</option><option value="birthday">Anniversaire</option><option value="business">Déjeuner professionnel</option><option value="family">Repas familial</option></select></label></div><label>Une attention particulière ?<textarea className="form-control" placeholder="Table calme, poussette, anniversaire…" value={reservationForm.notes} onChange={event => setReservationForm({ ...reservationForm, notes: event.target.value })} /></label><button className="btn btn-primary" onClick={reserveTable}>Confirmer ma table <ArrowRight size={17} /></button></div><aside className="client-trust-panel"><Clock3 size={25} /><h2>Simple et flexible</h2><p>Vous recevez un rappel avant votre venue et gardez la main sur votre réservation.</p>{restaurantReservations.map(item => <article key={item.id}><strong>{formatDate(item.date)} à {item.time}</strong><span>{item.guests} personne(s) · {item.status === 'seated' ? 'Installé' : 'Confirmé'}</span>{item.status === 'confirmed' && <div><button onClick={() => updateRestaurantReservation(item.id, { time: item.time === '20:00' ? '20:30' : '20:00' })}>Décaler de 30 min</button><button onClick={() => cancelRestaurantReservation(item.id)}>Annuler</button></div>}</article>)}</aside></section>}

        {mode === 'restaurant' && restaurantTab === 'menu' && <><section className="client-section-title"><div><span>DISPONIBLE MAINTENANT</span><h1>La carte de La Terrasse</h1><p>Les indisponibilités de cuisine sont actualisées automatiquement.</p></div><div className="client-service-choice">{(['dine_in', 'takeaway', ...(activePmsFolio ? ['room_service' as const] : [])] as const).map(type => <button key={type} className={serviceType === type ? 'active' : ''} onClick={() => setServiceType(type)}>{type === 'dine_in' ? 'À table' : type === 'takeaway' ? 'À emporter' : `En chambre ${activePmsRoom?.roomNumber}`}</button>)}</div></section>{activePmsFolio && <div className="client-room-link"><BedDouble size={18} /><span>Séjour reconnu</span><strong>Chambre {activePmsRoom?.roomNumber} · imputation folio disponible</strong></div>}<div className="client-product-grid restaurant-menu">{restaurantMenu.map(item => <article className={!item.available ? 'unavailable' : ''} key={item.product!.id}><div className="client-menu-photo" style={{ backgroundImage: customer.lowBandwidthMode ? 'none' : `url('./sartal-client-restaurant.jpg')` }}><span>{item.product!.category}</span><button className={customer.favoriteProductIds?.includes(item.product!.id) ? 'client-favorite-button active' : 'client-favorite-button'} title="Ajouter aux favoris" onClick={() => toggleFavorite(item.product!.id)}><Heart size={15} fill={customer.favoriteProductIds?.includes(item.product!.id) ? 'currentColor' : 'none'} /></button></div><div><h3>{item.product!.name}</h3><p>{item.recipe ? `${item.recipe.ingredients.length} ingrédients suivis en stock` : 'Préparé à la demande'}</p>{customer.allergies && item.recipe?.ingredients.some(ingredient => db.products.find(product => product.id === ingredient.productId)?.name.toLowerCase().includes('arachide')) && <small className="allergy-alert">Contient votre allergène</small>}<footer><strong>{formatFCFA(item.price)}</strong><div className="client-quantity"><button onClick={() => changeQuantity('restaurant', item.product!.id, -1)}><Minus size={15} /></button><span>{restaurantCart[item.product!.id] || 0}</span><button disabled={!item.available} onClick={() => changeQuantity('restaurant', item.product!.id, 1)}><Plus size={15} /></button></div></footer></div></article>)}</div>{restaurantTotal > 0 && <div className="client-sticky-cart"><div><span>{Object.values(restaurantCart).reduce((sum, value) => sum + value, 0)} article(s)</span><strong>{formatFCFA(restaurantTotal)}</strong></div><select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentType)}><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="card">Carte</option>{activePmsFolio && <option value="room_charge">Chambre {activePmsRoom?.roomNumber}</option>}</select><button onClick={placeRestaurantOrder}>Commander <ArrowRight size={16} /></button></div>}</>}

        {mode === 'restaurant' && restaurantTab === 'order' && <section className="client-order-layout"><div>{activeRestaurantOrder ? <><div className="client-order-heading"><span>COMMANDE {activeRestaurantOrder.id}</span><h1>{restaurantStatus[activeRestaurantOrder.status]}</h1><p>{activeRestaurantOrder.tableNumber ? `Table ${activeRestaurantOrder.tableNumber}` : activeRestaurantOrder.roomNumber ? `Chambre ${activeRestaurantOrder.roomNumber}` : 'Commande personnelle'} · environ {activeRestaurantOrder.estimatedMinutes} min</p></div><div className="client-progress">{(['confirmed', 'preparing', 'ready', 'served'] as const).map((status, index) => { const ranks = ['placed', 'confirmed', 'preparing', 'ready', 'served', 'paid']; const done = ranks.indexOf(activeRestaurantOrder.status) >= ranks.indexOf(status); return <article className={done ? 'done' : ''} key={status}><span>{done ? <CheckCircle size={17} /> : index + 1}</span><strong>{restaurantStatus[status]}</strong></article>; })}</div><div className="client-order-lines">{activeRestaurantOrder.items.map(item => <div key={item.productId}><span>{item.quantity} × {db.products.find(product => product.id === item.productId)?.name}</span><strong>{formatFCFA(item.quantity * item.salePrice)}</strong></div>)}<footer><span>Total</span><strong>{formatFCFA(activeRestaurantOrder.total)}</strong></footer></div><div className="client-table-actions"><button onClick={() => requestService('water', 'Apporter une carafe d’eau')}><Phone size={17} /> Demander de l’eau</button><button onClick={() => requestService('bill', 'Préparer et apporter l’addition')}><ReceiptText size={17} /> Demander l’addition</button><button onClick={() => requestService('waiter', 'Passage du serveur à table')}><MessageCircle size={17} /> Appeler le serveur</button></div>{activeServiceRequests.length > 0 && <div className="client-live-requests">{activeServiceRequests.map(item => <article key={item.id}><span className={item.status}><i />{item.status === 'accepted' ? 'Pris en charge' : 'Reçu'}</span><div><strong>{item.label}</strong><small>{item.assignedTo} · avant {new Date(item.promisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></div></article>)}</div>}{activeRestaurantOrder.payments.reduce((sum, item) => sum + item.amount, 0) < activeRestaurantOrder.total && <div className="client-split-payment"><div><CircleDollarSign size={20} /><span><strong>Partager l’addition</strong><small>Chacun peut rejoindre la table et payer sa part.</small></span></div><button onClick={() => { const remaining = activeRestaurantOrder.total - activeRestaurantOrder.payments.reduce((sum, item) => sum + item.amount, 0); addRestaurantGuestOrderPayment(activeRestaurantOrder.id, Math.ceil(remaining / 2), 'wave', customer.fullName); setMessage('Votre part a été réglée par Wave.'); }}>Payer ma moitié</button></div>}<section className="client-group-bill"><header><UserPlus size={20} /><div><strong>Les convives de la table</strong><small>Invitation privée par téléphone avec code personnel.</small></div></header><div className="client-invite-form"><input className="form-control" placeholder="Prénom et nom" value={inviteForm.fullName} onChange={event => setInviteForm({ ...inviteForm, fullName: event.target.value })} /><input className="form-control" placeholder="+221 77…" value={inviteForm.phone} onChange={event => setInviteForm({ ...inviteForm, phone: event.target.value })} /><button onClick={inviteGuest}>Inviter</button></div>{restaurantInvites.map(invite => <article key={invite.id}><div><strong>{invite.fullName}</strong><small>Code {invite.accessCode} · {invite.status === 'paid' ? 'part réglée' : invite.status === 'joined' ? 'a rejoint la table' : 'invitation envoyée'}</small></div><b>{formatFCFA(invite.shareAmount)}</b>{invite.status !== 'paid' && <button onClick={() => { const amount = payRestaurantGuestShare(invite.id, 'orange_money'); setMessage(`${invite.fullName} a réglé ${formatFCFA(amount)} par Orange Money.`); }}>Payer sa part</button>}</article>)}</section></> : <div className="client-empty"><ChefHat size={32} /><h2>Aucune commande en cours</h2><button onClick={() => setRestaurantTab('menu')}>Découvrir la carte</button></div>}</div><aside className="client-conversation"><header><span>M</span><div><strong>Moussa · Votre serveur</strong><small>Disponible maintenant</small></div></header><div className="client-message-thread">{conversations.map(item => <div className={item.sender} key={item.id}><span>{item.content}</span>{item.attachmentLabel && <b>{item.channel === 'voice' ? <Mic size={13} /> : <Camera size={13} />}{item.attachmentLabel}</b>}<small>{item.senderName}</small></div>)}</div><div className="client-rich-message"><button title="Envoyer une note vocale" onClick={() => sendRichMessage('voice')}><Mic size={16} /></button><button title="Joindre une photo" onClick={() => sendRichMessage('photo')}><Camera size={16} /></button></div><footer><input className="form-control" placeholder="Écrire à l’équipe…" value={chat} onChange={event => setChat(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') sendMessage(); }} /><button onClick={sendMessage}><Send size={17} /></button></footer></aside></section>}

        {mode === 'delivery' && deliveryTab === 'shop' && <><section className="client-hero grocery">{!customer.lowBandwidthMode && <img src="./sartal-client-grocery.jpg" alt="Panier de produits d’épicerie disponibles en livraison" />}<div><span>Livraison à {defaultAddress?.zone || 'Dakar'}</span><h1>Les essentiels, vraiment disponibles</h1><p>Le catalogue reflète le stock vendable du dépôt qui prépare votre commande.</p><div className="client-search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Riz, huile, bissap…" /></div></div></section><div className="client-product-grid grocery-grid">{onlineProducts.map(item => <article key={item.product!.id}><div className="grocery-product-visual"><PackageCheck size={28} /><span>{item.available} disponible(s)</span><button className={customer.favoriteProductIds?.includes(item.product!.id) ? 'client-favorite-button active' : 'client-favorite-button'} title="Ajouter aux favoris" onClick={() => toggleFavorite(item.product!.id)}><Heart size={15} fill={customer.favoriteProductIds?.includes(item.product!.id) ? 'currentColor' : 'none'} /></button></div><div><small>{item.product!.category}</small><h3>{item.product!.name}</h3><footer><strong>{formatFCFA(item.price)}</strong><div className="client-quantity"><button onClick={() => changeQuantity('delivery', item.product!.id, -1)}><Minus size={15} /></button><span>{deliveryCart[item.product!.id] || 0}</span><button onClick={() => changeQuantity('delivery', item.product!.id, 1)}><Plus size={15} /></button></div></footer></div></article>)}</div>{Object.keys(deliveryCart).length > 0 && <button className="client-basket-fab" onClick={() => setDeliveryTab('basket')}><ShoppingBag size={19} /><span>Voir mon panier</span><strong>{formatFCFA(deliverySubtotal)}</strong></button>}</>}

        {mode === 'delivery' && deliveryTab === 'basket' && <section className="client-checkout-layout"><div className="client-basket-panel"><span>MON PANIER</span><h1>Vérifier avant de commander</h1>{Object.entries(deliveryCart).map(([productId, quantity]) => { const product = db.products.find(item => item.id === productId); const price = db.posPricing.find(item => item.posId === deliveryChannel.id && item.productId === productId)?.salePrice || 0; return <article key={productId}><div><strong>{product?.name}</strong><small>{quantity} × {formatFCFA(price)}</small></div><div className="client-quantity"><button onClick={() => changeQuantity('delivery', productId, -1)}><Minus size={15} /></button><span>{quantity}</span><button onClick={() => changeQuantity('delivery', productId, 1)}><Plus size={15} /></button></div><label>Si indisponible<select value={substitutionPolicies[productId] || 'contact'} onChange={event => setSubstitutionPolicies({ ...substitutionPolicies, [productId]: event.target.value as typeof substitutionPolicies[string] })}><option value="replace">Remplacer par un équivalent</option><option value="contact">Me contacter</option><option value="refund">Rembourser cet article</option><option value="cancel_order">Annuler toute la commande</option></select></label></article>; })}{Object.keys(deliveryCart).length === 0 && <div className="client-empty"><ShoppingBag size={30} /><h2>Votre panier est vide</h2><button onClick={() => setDeliveryTab('shop')}>Retour à la boutique</button></div>}</div><aside className="client-delivery-summary"><div className="client-address"><MapPin size={21} /><div><span>Livrer à</span><strong>{defaultAddress?.label} · {defaultAddress?.address}</strong><small>{defaultAddress?.landmark}</small><small>{defaultAddress?.instructions}</small></div></div><div className="client-summary-lines"><span>Sous-total <b>{formatFCFA(deliverySubtotal)}</b></span><span>Livraison · {defaultAddress?.zone} <b>{formatFCFA(deliveryFee)}</b></span><strong>Total <b>{formatFCFA(deliverySubtotal + deliveryFee)}</b></strong></div><div className="client-payment-methods">{(['wave', 'orange_money', 'cash'] as const).map(method => <button key={method} className={paymentMethod === method ? 'active' : ''} onClick={() => setPaymentMethod(method)}><WalletCards size={16} /> {PAYMENT_TYPE_LABELS[method]}</button>)}</div><button className="btn btn-primary" disabled={deliverySubtotal <= 0} onClick={placeDeliveryOrder}>Confirmer la commande <ArrowRight size={17} /></button><small>Livraison estimée en {defaultAddress?.zone === 'Point E / Fann' ? 45 : 60} min. Aucun produit indisponible ne sera facturé.</small></aside></section>}

        {mode === 'delivery' && deliveryTab === 'tracking' && <section className="client-tracking-layout">{activeDeliveryOrder ? <><div className="client-delivery-map"><div className="map-road road-one" /><div className="map-road road-two" /><span className="map-origin"><Store size={18} /></span><span className="map-driver"><Truck size={18} /></span><span className="map-destination"><MapPin size={18} /></span><div className="map-status"><span>{deliveryStatus[activeDeliveryOrder.status]}</span><strong>{activeDeliveryOrder.estimatedMinutes || 45} min estimées</strong></div></div><div className="client-tracking-detail"><span>{activeDeliveryOrder.id}</span><h1>{deliveryStatus[activeDeliveryOrder.status]}</h1><p>{activeDeliveryOrder.address} · {activeDeliveryOrder.landmark}</p><div className="client-progress vertical">{[['confirmed', 'Commande reçue'], ['preparing', 'Préparation et contrôle'], ['out_for_delivery', 'Livreur en route'], ['delivered', 'Livraison confirmée']].map(([status, label]) => { const ranks: DeliveryOrderStatus[] = ['confirmed', 'reserved', 'preparing', 'ready', 'out_for_delivery', 'delivered']; const done = ranks.indexOf(activeDeliveryOrder.status) >= ranks.indexOf(status as DeliveryOrderStatus); return <article className={done ? 'done' : ''} key={status}><span>{done ? <CheckCircle size={16} /> : null}</span><div><strong>{label}</strong><small>{status === 'out_for_delivery' ? activeDeliveryOrder.driverName || 'Livreur à affecter' : status === 'delivered' ? `Code ${activeDeliveryOrder.verificationCode}` : 'Mise à jour automatique'}</small></div></article>; })}</div>{activeDeliveryOrder.proofStatus === 'photo_confirmed' ? <div className="client-proof-confirmation"><CheckCircle size={19} /><span><strong>Remise certifiée</strong><small>Code, signature et photo confirmés{activeDeliveryOrder.proofCompletedAt ? ` · ${new Date(activeDeliveryOrder.proofCompletedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}</small></span></div> : activeDeliveryOrder.status === 'out_for_delivery' ? <div className="client-proof-confirmation pending"><PackageCheck size={19} /><span><strong>Votre code de remise : {activeDeliveryOrder.verificationCode}</strong><small>Communiquez-le au livreur uniquement lorsque la commande est devant vous.</small></span></div> : null}{activeDeliveryOrder.driverName && <div className="client-driver"><span>{activeDeliveryOrder.driverName.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{activeDeliveryOrder.driverName}</strong><small>Votre livreur · {activeDeliveryOrder.driverPhone}</small></div><button onClick={() => setDeliveryTab('help')}><Phone size={17} /></button></div>}{['delivered', 'returned'].includes(activeDeliveryOrder.status) && <button className="btn btn-secondary" onClick={() => { const id = reorderDeliveryOrder(activeDeliveryOrder.id); setMessage(`Votre panier a été recréé dans la commande ${id}.`); }}>Recommander ce panier</button>}</div></> : <div className="client-empty"><Truck size={34} /><h2>Aucune livraison à suivre</h2><button onClick={() => setDeliveryTab('shop')}>Découvrir la boutique</button></div>}</section>}

        {mode === 'delivery' && deliveryTab === 'help' && <section className="client-help-layout"><div className="client-conversation"><header><span>F</span><div><strong>Fatou · Service client</strong><small>Réponse moyenne : 4 min</small></div></header><div className="client-message-thread">{conversations.map(item => <div className={item.sender} key={item.id}><span>{item.content}</span>{item.attachmentLabel && <b>{item.channel === 'voice' ? <Mic size={13} /> : <Camera size={13} />}{item.attachmentLabel}</b>}<small>{item.senderName}</small></div>)}</div><div className="client-rich-message"><button onClick={() => sendRichMessage('voice')}><Mic size={16} /> Note vocale</button><button onClick={() => sendRichMessage('photo')}><Camera size={16} /> Photo</button><button onClick={() => requestService('delivery_help', 'Être rappelé par le service livraison')}><Phone size={16} /> Me rappeler</button></div><footer><input className="form-control" placeholder="Écrire au service client…" value={chat} onChange={event => setChat(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') sendMessage(); }} /><button onClick={sendMessage}><Send size={17} /></button></footer>{activeServiceRequests.map(item => <div className="client-help-request" key={item.id}><Clock3 size={16} /><span><strong>{item.label}</strong><small>{item.assignedTo} · réponse promise avant {new Date(item.promisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></span></div>)}</div><div className="client-feedback-panel">{activeFeedback ? <><HeartHandshake size={25} /><span className={`client-recovery-status ${activeFeedback.recoveryStatus}`}>{activeFeedback.recoveryStatus === 'open' ? 'Suivi prioritaire en cours' : 'Situation résolue'}</span><h2>{activeFeedback.assignedTo || 'Relation client'}</h2><p>{activeFeedback.recoveryStatus === 'open' ? `Vous recontacte avant ${activeFeedback.promisedAt ? new Date(activeFeedback.promisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'quelques minutes'}.` : activeFeedback.solution}</p>{activeFeedback.compensationPoints ? <strong>+{activeFeedback.compensationPoints} points offerts</strong> : null}<small>Votre dossier reste lié à la commande {activeFeedback.referenceId}.</small></> : <><HeartHandshake size={25} /><h2>Tout s’est bien passé ?</h2><p>Un problème signalé est suivi jusqu’à sa résolution.</p><div className="client-rating">{[1, 2, 3, 4, 5].map(score => <button className={feedbackScore >= score ? 'active' : ''} key={score} onClick={() => setFeedbackScore(score)}><Star size={22} /></button>)}</div><textarea className="form-control" placeholder="Article manquant, endommagé, retard…" value={feedbackNote} onChange={event => setFeedbackNote(event.target.value)} /><button className="btn btn-primary" disabled={!activeDeliveryOrder} onClick={sendFeedback}>Envoyer mon retour</button></>}</div></section>}

      </main>
      </>}
      {message && <div className="client-toast"><CheckCircle size={18} /> {message}</div>}
      {standalone && <footer className="sartal-client-footer"><span>{brandSettings.establishmentName} · aide {brandSettings.supportPhone}</span><span>Paiements sécurisés · Wave · Orange Money</span></footer>}
    </section>
  );
};

export default SartalClient;
