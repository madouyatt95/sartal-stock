import React, { useMemo, useState } from 'react';
import {
  ArrowRight, BedDouble, CalendarDays, CheckCircle, ChefHat, CircleDollarSign, Clock3,
  Camera, Gift, Heart, HeartHandshake, MapPin, MessageCircle, Mic, Minus, PackageCheck, Phone,
  Plus, ReceiptText, Search, Send, ShoppingBag, Sparkles, Star, Store, Truck, UserPlus, UserRound,
  UtensilsCrossed, WalletCards
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { DeliveryOrderStatus, PAYMENT_TYPE_LABELS, PaymentType, RestaurantGuestOrder } from '../types';
import SartalClientAccessGateway from './SartalClientAccessGateway';
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
  requireAccess?: boolean;
}

const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;
const formatDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });

const restaurantStatus: Record<RestaurantGuestOrder['status'], string> = {
  placed: 'Reçue', confirmed: 'Confirmée', preparing: 'En cuisine', ready: 'Prête', served: 'Servie', paid: 'Payée', cancelled: 'Annulée'
};

const deliveryStatus: Record<DeliveryOrderStatus, string> = {
  confirmed: 'Confirmée', reserved: 'Stock réservé', preparing: 'Préparation', ready: 'Prête', out_for_delivery: 'Livreur en route', delivered: 'Livrée', failed: 'Incident', returned: 'Retour dépôt', cancelled: 'Annulée'
};

interface SpeechRecognitionEventLike {
  results: ArrayLike<{ 0: { transcript: string } }>;
}

interface SpeechRecognitionLike {
  lang: string;
  start: () => void;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const normalizeSearchTerm = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const SartalClient: React.FC<SartalClientProps> = ({ state, initialMode = 'restaurant', standalone = false, initialCustomerId, initialHub = false, requireAccess = false }) => {
  const {
    db, createRestaurantReservation, updateRestaurantReservation, cancelRestaurantReservation,
    placeRestaurantGuestOrder, addRestaurantGuestOrderPayment, createDeliveryCustomerOrder,
    updateConfirmedDeliveryOrder, decideDeliverySubstitution, reorderDeliveryOrder, sendSartalCustomerMessage,
    submitSartalCustomerFeedback, requestSartalService, inviteRestaurantGuest,
    payRestaurantGuestShare, toggleFavoriteProduct, saveSartalHouseholdCart, toggleSartalDeliveryPlus,
    appendRestaurantGuestOrderItems, updateRestaurantGuestOrderItemNote
  } = state;
  const brandSettings = db.sartalBrandSettings;
  const restaurantEnabled = brandSettings.enabledModules.includes('restaurant');
  const deliveryEnabled = brandSettings.enabledModules.includes('delivery');
  const availableInitialMode: ClientMode = initialMode === 'restaurant' && restaurantEnabled
    ? 'restaurant'
    : initialMode === 'delivery' && deliveryEnabled
      ? 'delivery'
      : restaurantEnabled ? 'restaurant' : 'delivery';
  const [space, setSpace] = useState<'hub' | 'service'>(initialHub || !standalone ? 'hub' : 'service');
  const [hubInitialTab, setHubInitialTab] = useState<'today' | 'passport' | 'wallet' | 'history'>('today');
  const [mode, setMode] = useState<ClientMode>(availableInitialMode);
  const [restaurantTab, setRestaurantTab] = useState<RestaurantTab>('welcome');
  const [deliveryTab, setDeliveryTab] = useState<DeliveryTab>('shop');
  const [customerId, setCustomerId] = useState(initialCustomerId || (availableInitialMode === 'restaurant' ? 'customer-aminata' : 'customer-awa'));
  const [accessGranted, setAccessGranted] = useState(!requireAccess || Boolean(initialCustomerId));
  const [restaurantCart, setRestaurantCart] = useState<Record<string, number>>({});
  const [deliveryCart, setDeliveryCart] = useState<Record<string, number>>({});
  const [substitutionPolicies, setSubstitutionPolicies] = useState<Record<string, 'replace' | 'contact' | 'refund' | 'cancel_order'>>({});
  const [search, setSearch] = useState('');
  const [smartListText, setSmartListText] = useState('');
  const [smartListPhoto, setSmartListPhoto] = useState('');
  const [budget, setBudget] = useState('25000');
  const [selectedDeliverySlotId, setSelectedDeliverySlotId] = useState('');
  const [editingDeliveryOrderId, setEditingDeliveryOrderId] = useState('');
  const [serviceType, setServiceType] = useState<RestaurantGuestOrder['serviceType']>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<PaymentType>('wave');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState('');
  const [feedbackScore, setFeedbackScore] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [inviteForm, setInviteForm] = useState({ fullName: '', phone: '' });
  const [inviteShareAmount, setInviteShareAmount] = useState('');
  const [splitPayment, setSplitPayment] = useState({ payerName: '', amount: '', method: 'wave' as PaymentType });
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({});
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [reservationForm, setReservationForm] = useState({ date: tomorrow, time: '20:00', guests: 2, occasion: 'meal' as const, notes: '' });

  const customer = db.sartalCustomers.find(item => item.id === customerId);
  const restaurant = db.posList.find(item => item.type === 'restaurant');
  const deliveryChannel = db.posList.find(item => item.type === 'online_grocery');
  const deliveryWarehouse = db.warehouses.find(item => item.id === deliveryChannel?.defaultWarehouseId);
  const activeSiteId = mode === 'restaurant' ? restaurant?.siteId : deliveryChannel?.siteId;
  const siteBrand = brandSettings.siteProfiles.find(item => item.siteId === activeSiteId);
  const restaurantReservations = db.restaurantReservations.filter(item => item.customerId === customer?.id && item.status !== 'cancelled');
  const upcomingReservation = restaurantReservations.find(item => ['confirmed', 'seated'].includes(item.status));
  const restaurantOrders = db.restaurantGuestOrders.filter(item => item.customerId === customer?.id);
  const activeRestaurantOrder = restaurantOrders.find(item => !['paid', 'cancelled'].includes(item.status)) || restaurantOrders[0];
  const restaurantPaid = activeRestaurantOrder?.payments.reduce((sum, item) => sum + item.amount, 0) || 0;
  const restaurantRemaining = Math.max(0, (activeRestaurantOrder?.total || 0) - restaurantPaid);
  const restaurantOrderEditable = Boolean(activeRestaurantOrder && ['placed', 'confirmed'].includes(activeRestaurantOrder.status));
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

  const onlineCatalog = useMemo(() => {
    if (!deliveryChannel || !deliveryWarehouse) return [];
    return db.posPricing.filter(item => item.posId === deliveryChannel.id && item.isAvailable).map(item => {
      const product = db.products.find(productItem => productItem.id === item.productId);
      const stock = db.stocks.find(stockItem => stockItem.productId === item.productId && stockItem.warehouseId === deliveryWarehouse.id);
      return { product, price: item.salePrice, available: Math.max(0, (stock?.quantityAvailable || 0) - (stock?.quantityReserved || 0)) };
    }).filter(item => item.product && item.available > 0);
  }, [db, deliveryChannel, deliveryWarehouse]);
  const onlineProducts = useMemo(() => onlineCatalog
    .filter(item => `${item.product!.name} ${item.product!.category}`.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 24), [onlineCatalog, search]);

  if (!accessGranted) {
    return <SartalClientAccessGateway state={state} mode={availableInitialMode} onAuthenticated={authenticatedCustomerId => {
      setCustomerId(authenticatedCustomerId);
      setAccessGranted(true);
    }} />;
  }

  if (!customer || !restaurant || !deliveryChannel || !deliveryWarehouse) {
    return <main className="portal-unavailable">
      <section>
        <img src="./brand-mark.svg" alt="Sártal" />
        <span>MON SÁRTAL</span>
        <h1>Votre espace se prépare</h1>
        <p>Le restaurant ou le service de livraison n’est pas disponible pour le moment. Notre équipe peut vous accompagner directement.</p>
        <a href={`tel:${(siteBrand?.supportPhone || brandSettings.supportPhone).replace(/\s/g, '')}`}><Phone size={17} /> Appeler le {siteBrand?.supportPhone || brandSettings.supportPhone}</a>
      </section>
    </main>;
  }

  const restaurantTotal = Object.entries(restaurantCart).reduce((sum, [productId, quantity]) => sum + (db.posPricing.find(item => item.posId === restaurant.id && item.productId === productId)?.salePrice || 0) * quantity, 0);
  const deliverySubtotal = Object.entries(deliveryCart).reduce((sum, [productId, quantity]) => sum + (db.posPricing.find(item => item.posId === deliveryChannel.id && item.productId === productId)?.salePrice || 0) * quantity, 0);
  const defaultAddress = customer.addresses.find(item => item.isDefault) || customer.addresses[0];
  const today = new Date();
  const dayLabel = (offset: number) => {
    const date = new Date(today.getTime() + offset * 86400000);
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  };
  const slotDateId = (offset: number) => new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);
  const deliverySlots = [
    { offset: 0, startHour: 18, endHour: 19, capacity: 4, feeDelta: 300, priority: true },
    { offset: 0, startHour: 19, endHour: 20, capacity: 4, feeDelta: 0, priority: false },
    { offset: 1, startHour: 9, endHour: 11, capacity: 6, feeDelta: 0, priority: false },
    { offset: 1, startHour: 16, endHour: 18, capacity: 6, feeDelta: 0, priority: false },
    { offset: 1, startHour: 18, endHour: 19, capacity: 4, feeDelta: 300, priority: true },
    { offset: 2, startHour: 9, endHour: 11, capacity: 6, feeDelta: 0, priority: false }
  ].filter(slot => slot.offset > 0 || today.getHours() < slot.startHour).slice(0, 4).map(slot => {
    const id = `${slotDateId(slot.offset)}-${String(slot.startHour).padStart(2, '0')}-${String(slot.endHour).padStart(2, '0')}`;
    return { ...slot, id, label: `${dayLabel(slot.offset)} · ${slot.startHour}h–${slot.endHour}h`, booked: db.deliveryOrders.filter(order => order.deliverySlotId === id && !['cancelled', 'returned'].includes(order.status)).length };
  });
  const selectedSlot = deliverySlots.find(slot => slot.id === selectedDeliverySlotId && slot.booked < slot.capacity)
    || deliverySlots.find(slot => slot.booked < slot.capacity);
  const zoneDeliveryFee = defaultAddress?.zone === 'Point E / Fann' ? 1000 : defaultAddress?.zone === 'Mermoz / Sacré-Coeur' ? 1200 : 1500;
  const deliveryPlusActive = customer.deliveryPlusStatus === 'active';
  const deliveryFee = deliveryPlusActive ? 0 : zoneDeliveryFee + (selectedSlot?.feeDelta || 0);
  const household = db.sartalHouseholds.find(item => item.id === customer.householdId || item.memberCustomerIds.includes(customer.id));
  const currentTab = mode === 'restaurant' ? restaurantTab : deliveryTab;

  const switchMode = (nextMode: ClientMode) => {
    if (nextMode === 'restaurant' ? !restaurantEnabled : !deliveryEnabled) return;
    setMode(nextMode);
    setSpace('service');
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
      const items = Object.entries(restaurantCart).map(([productId, quantity]) => ({ productId, quantity }));
      if (activeRestaurantOrder && activeRestaurantOrder.serviceType === 'dine_in' && ['placed', 'confirmed'].includes(activeRestaurantOrder.status)) {
        const amount = appendRestaurantGuestOrderItems(activeRestaurantOrder.id, customer.id, items);
        setRestaurantCart({});
        setMessage(`Complément de ${formatFCFA(amount)} ajouté en direct à la table ${activeRestaurantOrder.tableNumber || ''}.`);
        setRestaurantTab('order');
        return;
      }
      const id = placeRestaurantGuestOrder({ customerId: customer.id, posId: restaurant.id, reservationId: upcomingReservation?.id, tableNumber: upcomingReservation?.tableNumber, folioId: paymentMethod === 'room_charge' ? activePmsFolio?.id : undefined, roomNumber: paymentMethod === 'room_charge' ? activePmsRoom?.roomNumber : undefined, serviceType, items, paymentMethod });
      setRestaurantCart({});
      setMessage(`Commande ${id} transmise directement à la cuisine.`);
      setRestaurantTab('order');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Commande impossible'); }
  };
  const placeDeliveryOrder = () => {
    if (!defaultAddress) {
      setMessage('Ajoutez une adresse de livraison avant de confirmer votre commande.');
      return;
    }
    if (!selectedSlot) {
      setMessage('Choisissez un créneau de livraison avant de confirmer.');
      return;
    }
    try {
      const items = Object.entries(deliveryCart).map(([productId, quantity]) => ({ productId, quantity, substitutionPolicy: substitutionPolicies[productId] || 'contact' as const }));
      const slot = { id: selectedSlot.id, label: selectedSlot.label, feeDelta: selectedSlot.feeDelta, capacity: selectedSlot.capacity };
      if (editingDeliveryOrderId) {
        const adjustment = updateConfirmedDeliveryOrder(editingDeliveryOrderId, customer.id, { items, deliverySlot: slot });
        setMessage(adjustment === 0 ? `Commande ${editingDeliveryOrderId} mise à jour sans changement de montant.` : `Commande mise à jour · ajustement ${adjustment > 0 ? '+' : ''}${formatFCFA(adjustment)}.`);
        setEditingDeliveryOrderId('');
      } else {
        const id = createDeliveryCustomerOrder({ customerId: customer.id, addressId: defaultAddress.id, items, paymentType: paymentMethod, deliverySlot: slot });
        setMessage(`Commande ${id} confirmée pour ${selectedSlot.label}.`);
      }
      setDeliveryCart({});
      setDeliveryTab('tracking');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Commande impossible'); }
  };
  const applySmartList = (rawList: string) => {
    const aliases: Record<string, string> = {
      riz: 'prod-riz-5kg', huile: 'prod-huile-1l', lait: 'prod-lait-poudre', eau: 'prod-eau-pack',
      coca: 'prod-coca', bissap: 'prod-jus-bissap', sucre: 'prod-sucre-1kg', fonio: 'prod-fonio-1kg',
      niebe: 'prod-niebe-1kg', bouillon: 'prod-bouillon-sachet', cafe: 'prod-cafe-touba'
    };
    const nextCart: Record<string, number> = {};
    const unmatched: string[] = [];
    rawList.split(/[\n,;]+/).map(item => item.trim()).filter(Boolean).forEach(entry => {
      const normalized = normalizeSearchTerm(entry);
      const quantityMatch = normalized.match(/(?:^|\s)x\s*(\d+)(?:\s|$)/) || normalized.match(/^(\d+)\s+/) || normalized.match(/\s(\d+)\s*fois(?:\s|$)/);
      const quantity = Math.max(1, Math.min(20, Number(quantityMatch?.[1] || 1)));
      const aliasKey = Object.keys(aliases).find(key => normalized.includes(key));
      const directMatch = onlineCatalog.find(item => normalizeSearchTerm(`${item.product!.name} ${item.product!.sku}`).split(' ').some(word => word.length > 2 && normalized.includes(word)));
      const productId = aliasKey ? aliases[aliasKey] : directMatch?.product?.id;
      const catalogItem = onlineCatalog.find(item => item.product?.id === productId);
      if (!productId || !catalogItem) unmatched.push(entry);
      else nextCart[productId] = Math.min(catalogItem.available, (nextCart[productId] || 0) + quantity);
    });
    if (Object.keys(nextCart).length === 0) {
      setMessage('Aucun produit disponible reconnu. Essayez par exemple : riz x1, huile x2, lait x1.');
      return;
    }
    setDeliveryCart(current => ({ ...current, ...nextCart }));
    const count = Object.values(nextCart).reduce((sum, quantity) => sum + quantity, 0);
    setMessage(`${count} article(s) ajoutés${unmatched.length ? ` · ${unmatched.length} ligne(s) à préciser` : ''}. Vérifiez le panier avant de commander.`);
  };
  const startSmartListVoice = () => {
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage('La dictée vocale n’est pas disponible sur ce navigateur. Vous pouvez coller votre liste.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'fr-FR';
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      setSmartListText(transcript);
      applySmartList(transcript.replace(/ et /gi, ', '));
    };
    recognition.onerror = () => setMessage('La dictée a été interrompue. Votre liste écrite reste disponible.');
    recognition.start();
  };
  const handleSmartListPhoto = (file?: File) => {
    if (!file) return;
    const suggestedList = 'Riz x1, huile x2, lait x1, eau x1, café x1';
    setSmartListPhoto(file.name);
    setSmartListText(suggestedList);
    applySmartList(suggestedList);
  };
  const buildBudgetCart = () => {
    const maximum = Number(budget);
    const availableBudget = maximum - deliveryFee;
    if (!Number.isFinite(maximum) || availableBudget <= 0) {
      setMessage('Indiquez un budget supérieur aux frais de livraison.');
      return;
    }
    const priorityIds = ['prod-riz-5kg', 'prod-huile-1l', 'prod-lait-poudre', 'prod-sucre-1kg', 'prod-fonio-1kg', 'prod-niebe-1kg', 'prod-eau-pack', 'prod-cafe-touba'];
    const candidates = [...onlineCatalog].sort((a, b) => {
      const aRank = priorityIds.indexOf(a.product!.id);
      const bRank = priorityIds.indexOf(b.product!.id);
      if (aRank !== -1 || bRank !== -1) return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
      return a.price - b.price;
    });
    const nextCart: Record<string, number> = {};
    let spent = 0;
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const item of candidates) {
        const quantity = nextCart[item.product!.id] || 0;
        if (quantity >= Math.min(4, item.available) || spent + item.price > availableBudget) continue;
        nextCart[item.product!.id] = quantity + 1;
        spent += item.price;
        progressed = true;
      }
    }
    if (!Object.keys(nextCart).length) {
      setMessage('Ce budget ne permet pas encore d’ajouter un produit disponible.');
      return;
    }
    setDeliveryCart(nextCart);
    setMessage(`Panier proposé à ${formatFCFA(spent + deliveryFee)}, livraison comprise. Vous gardez la main sur chaque article.`);
    setDeliveryTab('basket');
  };
  const saveFamilyCart = () => {
    if (!household) return;
    try {
      const count = saveSartalHouseholdCart(household.id, customer.id, Object.entries(deliveryCart).map(([productId, quantity]) => ({ productId, quantity })));
      setMessage(`Votre contribution est enregistrée dans ${household.name} · ${count} ligne(s) au total.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Panier familial indisponible'); }
  };
  const loadFamilyCart = () => {
    if (!household?.sharedCartItems?.length) {
      setMessage('Le panier familial n’a pas encore reçu de contribution.');
      return;
    }
    let adjustedLines = 0;
    const merged = household.sharedCartItems.reduce<Record<string, number>>((result, item) => {
      const catalogItem = onlineCatalog.find(entry => entry.product?.id === item.productId);
      if (!catalogItem) {
        adjustedLines += 1;
        return result;
      }
      const requested = (result[item.productId] || 0) + item.quantity;
      const accepted = Math.min(requested, catalogItem.available);
      if (accepted < requested) adjustedLines += 1;
      return { ...result, [item.productId]: accepted };
    }, {});
    setDeliveryCart(merged);
    setMessage(`${household.name} chargé · ${household.memberCustomerIds.length} membre(s) peuvent contribuer${adjustedLines ? ` · ${adjustedLines} ligne(s) ajustée(s) au stock disponible` : ''}.`);
  };
  const startEditingDeliveryOrder = () => {
    if (!activeDeliveryOrder || activeDeliveryOrder.status !== 'confirmed') return;
    setDeliveryCart(Object.fromEntries(activeDeliveryOrder.items.map(item => [item.originalProductId || item.productId, item.quantity])));
    setSubstitutionPolicies(Object.fromEntries(activeDeliveryOrder.items.map(item => [item.originalProductId || item.productId, item.substitutionPolicy || 'contact'])));
    setSelectedDeliverySlotId(activeDeliveryOrder.deliverySlotId || selectedSlot?.id || '');
    setEditingDeliveryOrderId(activeDeliveryOrder.id);
    setDeliveryTab('basket');
    setMessage(`Commande ${activeDeliveryOrder.id} ouverte. Vous pouvez modifier les quantités avant préparation.`);
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
      inviteRestaurantGuest(activeRestaurantOrder.id, { ...inviteForm, shareAmount: Number(inviteShareAmount) || undefined });
      setInviteForm({ fullName: '', phone: '' });
      setInviteShareAmount('');
      setMessage('Invitation envoyée avec un accès personnel à l’addition.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Invitation impossible'); }
  };
  const saveOrderNote = (productId: string) => {
    if (!activeRestaurantOrder) return;
    try {
      updateRestaurantGuestOrderItemNote(activeRestaurantOrder.id, customer.id, productId, orderNotes[productId] || '');
      setMessage('Votre consigne a été transmise en direct à la salle et à la cuisine.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Consigne non modifiée'); }
  };
  const requestLineRemoval = (productId: string) => {
    if (!activeRestaurantOrder) return;
    const product = db.products.find(item => item.id === productId);
    requestSartalService({ customerId: customer.id, context: 'restaurant', referenceId: activeRestaurantOrder.id, type: 'other', label: `Valider le retrait de ${product?.name || 'cet article'}`, note: 'Demande client transmise avant modification du ticket et du stock.', priority: 'urgent' });
    setMessage('Demande de retrait envoyée. La cuisine confirme avant de corriger le ticket et le stock.');
  };
  const payCustomShare = () => {
    if (!activeRestaurantOrder) return;
    const requestedAmount = Number(splitPayment.amount);
    if (!splitPayment.payerName.trim() || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      setMessage('Indiquez le nom du payeur et un montant valide.');
      return;
    }
    try {
      const accepted = addRestaurantGuestOrderPayment(activeRestaurantOrder.id, requestedAmount, splitPayment.method, splitPayment.payerName.trim());
      setSplitPayment({ ...splitPayment, payerName: '', amount: '' });
      setMessage(`${splitPayment.payerName} a réglé ${formatFCFA(accepted)} par ${PAYMENT_TYPE_LABELS[splitPayment.method]}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Paiement impossible'); }
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
      style={{ '--client-brand': siteBrand?.primaryColor || brandSettings.primaryColor, '--client-accent': siteBrand?.accentColor || brandSettings.accentColor } as React.CSSProperties}
    >
      <header className="sartal-client-header">
        <div><span>{brandSettings.clientAppName.toUpperCase()}</span><strong>{mode === 'restaurant' ? restaurant.name : 'Épicerie & livraison'}</strong></div>
        <div className="client-mode-switch"><button className={space === 'hub' ? 'active' : ''} onClick={() => { setHubInitialTab('today'); setSpace('hub'); }}><UserRound size={17} /> Mon Sártal</button>{restaurantEnabled && <button className={space === 'service' && mode === 'restaurant' ? 'active' : ''} onClick={() => switchMode('restaurant')}><UtensilsCrossed size={17} /> À table</button>}{deliveryEnabled && <button className={space === 'service' && mode === 'delivery' ? 'active' : ''} onClick={() => switchMode('delivery')}><ShoppingBag size={17} /> Livraison</button>}</div>
        {!standalone && <div className="client-preview-controls"><select className="form-control" aria-label="Client affiché dans l’aperçu" value={customer.id} onChange={event => changeCustomer(event.target.value)}>{db.sartalCustomers.map(item => <option value={item.id} key={item.id}>{item.fullName}</option>)}</select></div>}
      </header>
      {space === 'hub' ? <main className="sartal-client-body hub-body"><SartalClientHub key={`${customer.id}-${hubInitialTab}`} state={state} customerId={customer.id} initialTab={hubInitialTab} onOpenRestaurant={() => switchMode('restaurant')} onOpenDelivery={() => switchMode('delivery')} onMessage={setMessage} /></main> : <>
      <nav className="sartal-client-tabs">{tabs.map(item => <button key={item.id} className={currentTab === item.id ? 'active' : ''} onClick={() => mode === 'restaurant' ? setRestaurantTab(item.id as RestaurantTab) : setDeliveryTab(item.id as DeliveryTab)}>{item.icon}<span>{item.label}</span>{item.id === 'basket' && Object.values(deliveryCart).reduce((sum, value) => sum + value, 0) > 0 && <b>{Object.values(deliveryCart).reduce((sum, value) => sum + value, 0)}</b>}</button>)}</nav>

      <main className="sartal-client-body">
        {mode === 'restaurant' && restaurantTab === 'welcome' && <>
          <section className="client-hero restaurant">{!customer.lowBandwidthMode && <img src="./sartal-client-restaurant.jpg" alt="Plats sénégalais servis au restaurant" />}<div><span>Bonsoir {customer.fullName.split(' ')[0]}</span><h1>Votre table, à votre façon</h1><p>{customer.preferences || 'Réservez, commandez et profitez du moment.'}</p><button onClick={() => setRestaurantTab(upcomingReservation ? 'order' : 'reserve')}>{upcomingReservation ? 'Voir ma table' : 'Réserver une table'} <ArrowRight size={17} /></button></div></section>
          <section className="client-quick-grid"><article><CalendarDays size={22} /><span>Prochaine réservation</span><strong>{upcomingReservation ? `${formatDate(upcomingReservation.date)} · ${upcomingReservation.time}` : 'Aucune réservation'}</strong><small>{upcomingReservation ? `${upcomingReservation.guests} personne(s) · ${upcomingReservation.tableNumber || 'Table à attribuer'}` : 'Choisissez votre moment en quelques secondes.'}</small></article><article><Gift size={22} /><span>Mes avantages</span><strong>{customer.loyaltyPoints} points</strong><small>Niveau {customer.loyaltyTier} · utilisables sur place et en ligne.</small></article><article><HeartHandshake size={22} /><span>Reconnu par l’équipe</span><strong>{customer.visits} visite(s)</strong><small>{customer.allergies ? `Allergie signalée : ${customer.allergies}` : 'Vos préférences sont prêtes.'}</small></article></section>
          <section className="client-attention"><Sparkles size={22} /><div><strong>Une attention pour vous</strong><p>La cuisine a bien reçu vos préférences. Une table calme a été privilégiée.</p></div><button onClick={() => { setChat('Merci de confirmer une table au calme.'); setRestaurantTab('order'); }}>Écrire à l’équipe</button></section>
        </>}

        {mode === 'restaurant' && restaurantTab === 'reserve' && <section className="client-split-layout"><div className="client-form-panel"><span>RÉSERVATION DIRECTE</span><h1>Choisissez votre table</h1><p>Confirmation immédiate, modification possible depuis votre espace.</p><div className="client-form-grid"><label>Date<input className="form-control" type="date" min={tomorrow} value={reservationForm.date} onChange={event => setReservationForm({ ...reservationForm, date: event.target.value })} /></label><label>Heure<select className="form-control" value={reservationForm.time} onChange={event => setReservationForm({ ...reservationForm, time: event.target.value })}>{['12:30', '13:00', '13:30', '19:30', '20:00', '20:30', '21:00'].map(time => <option key={time}>{time}</option>)}</select></label><label>Personnes<input className="form-control" type="number" min="1" max="20" value={reservationForm.guests} onChange={event => setReservationForm({ ...reservationForm, guests: Number(event.target.value) })} /></label><label>Occasion<select className="form-control" value={reservationForm.occasion} onChange={event => setReservationForm({ ...reservationForm, occasion: event.target.value as typeof reservationForm.occasion })}><option value="meal">Repas</option><option value="birthday">Anniversaire</option><option value="business">Déjeuner professionnel</option><option value="family">Repas familial</option></select></label></div><label>Une attention particulière ?<textarea className="form-control" placeholder="Table calme, poussette, anniversaire…" value={reservationForm.notes} onChange={event => setReservationForm({ ...reservationForm, notes: event.target.value })} /></label><button className="btn btn-primary" onClick={reserveTable}>Confirmer ma table <ArrowRight size={17} /></button></div><aside className="client-trust-panel"><Clock3 size={25} /><h2>Simple et flexible</h2><p>Vous recevez un rappel avant votre venue et gardez la main sur votre réservation.</p>{restaurantReservations.map(item => <article key={item.id}><strong>{formatDate(item.date)} à {item.time}</strong><span>{item.guests} personne(s) · {item.status === 'seated' ? 'Installé' : 'Confirmé'}</span>{item.status === 'confirmed' && <div><button onClick={() => updateRestaurantReservation(item.id, { time: item.time === '20:00' ? '20:30' : '20:00' })}>Décaler de 30 min</button><button onClick={() => cancelRestaurantReservation(item.id)}>Annuler</button></div>}</article>)}</aside></section>}

        {mode === 'restaurant' && restaurantTab === 'menu' && <><section className="client-section-title"><div><span>DISPONIBLE MAINTENANT</span><h1>La carte de La Terrasse</h1><p>Les indisponibilités de cuisine sont actualisées automatiquement.</p></div><div className="client-service-choice">{(['dine_in', 'takeaway', ...(activePmsFolio ? ['room_service' as const] : [])] as const).map(type => <button key={type} className={serviceType === type ? 'active' : ''} onClick={() => setServiceType(type)}>{type === 'dine_in' ? 'À table' : type === 'takeaway' ? 'À emporter' : `En chambre ${activePmsRoom?.roomNumber}`}</button>)}</div></section>{activePmsFolio && <div className="client-room-link"><BedDouble size={18} /><span>Séjour reconnu</span><strong>Chambre {activePmsRoom?.roomNumber} · imputation folio disponible</strong></div>}<div className="client-product-grid restaurant-menu">{restaurantMenu.map(item => <article className={!item.available ? 'unavailable' : ''} key={item.product!.id}><div className="client-menu-photo" style={{ backgroundImage: customer.lowBandwidthMode ? 'none' : `url('./sartal-client-restaurant.jpg')` }}><span>{item.product!.category}</span><button className={customer.favoriteProductIds?.includes(item.product!.id) ? 'client-favorite-button active' : 'client-favorite-button'} title="Ajouter aux favoris" onClick={() => toggleFavorite(item.product!.id)}><Heart size={15} fill={customer.favoriteProductIds?.includes(item.product!.id) ? 'currentColor' : 'none'} /></button></div><div><h3>{item.product!.name}</h3><p>{item.recipe ? `${item.recipe.ingredients.length} ingrédients suivis en stock` : 'Préparé à la demande'}</p>{customer.allergies && item.recipe?.ingredients.some(ingredient => db.products.find(product => product.id === ingredient.productId)?.name.toLowerCase().includes('arachide')) && <small className="allergy-alert">Contient votre allergène</small>}<footer><strong>{formatFCFA(item.price)}</strong><div className="client-quantity"><button onClick={() => changeQuantity('restaurant', item.product!.id, -1)}><Minus size={15} /></button><span>{restaurantCart[item.product!.id] || 0}</span><button disabled={!item.available} onClick={() => changeQuantity('restaurant', item.product!.id, 1)}><Plus size={15} /></button></div></footer></div></article>)}</div>{restaurantTotal > 0 && <div className="client-sticky-cart"><div><span>{Object.values(restaurantCart).reduce((sum, value) => sum + value, 0)} article(s)</span><strong>{formatFCFA(restaurantTotal)}</strong></div><select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentType)}><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="card">Carte</option>{activePmsFolio && <option value="room_charge">Chambre {activePmsRoom?.roomNumber}</option>}</select><button onClick={placeRestaurantOrder}>Commander <ArrowRight size={16} /></button></div>}</>}

        {mode === 'restaurant' && restaurantTab === 'order' && <section className="client-order-layout">
          <div>{activeRestaurantOrder ? <>
            <div className="client-order-heading">
              <span>COMMANDE {activeRestaurantOrder.id}</span>
              <h1>{restaurantStatus[activeRestaurantOrder.status]}</h1>
              <p>{activeRestaurantOrder.tableNumber ? `Table ${activeRestaurantOrder.tableNumber}` : activeRestaurantOrder.roomNumber ? `Chambre ${activeRestaurantOrder.roomNumber}` : 'Commande personnelle'} · environ {activeRestaurantOrder.estimatedMinutes} min</p>
              <b className={restaurantOrderEditable ? 'live' : 'locked'}>{restaurantOrderEditable ? 'Modifiable en direct' : 'Préparation verrouillée'}</b>
            </div>
            <div className="client-progress">{(['confirmed', 'preparing', 'ready', 'served'] as const).map((status, index) => { const ranks = ['placed', 'confirmed', 'preparing', 'ready', 'served', 'paid']; const done = ranks.indexOf(activeRestaurantOrder.status) >= ranks.indexOf(status); return <article className={done ? 'done' : ''} key={status}><span>{done ? <CheckCircle size={17} /> : index + 1}</span><strong>{restaurantStatus[status]}</strong></article>; })}</div>
            <section className="client-live-basket">
              <header><div><ShoppingBag size={19} /><span><strong>Mon panier en direct</strong><small>Ajoutez un complément ou transmettez une consigne avant le verrouillage cuisine.</small></span></div>{restaurantOrderEditable && <button onClick={() => setRestaurantTab('menu')}><Plus size={15} /> Ajouter un article</button>}</header>
              <div className="client-order-lines">{activeRestaurantOrder.items.map((item, index) => {
                const product = db.products.find(productItem => productItem.id === item.productId);
                return <article key={`${item.productId}-${index}`}>
                  <div><span>{item.quantity} × {product?.name}</span><strong>{formatFCFA(item.quantity * item.salePrice)}</strong></div>
                  {item.note && <small>Consigne : {item.note}</small>}
                  {restaurantOrderEditable && <div className="client-order-line-tools"><input className="form-control" value={orderNotes[item.productId] ?? item.note ?? ''} onChange={event => setOrderNotes({ ...orderNotes, [item.productId]: event.target.value })} placeholder="Sans sauce, cuisson, allergie…" /><button onClick={() => saveOrderNote(item.productId)}>Transmettre</button><button className="danger" onClick={() => requestLineRemoval(item.productId)}>Demander le retrait</button></div>}
                </article>;
              })}<footer><span>Total actualisé</span><strong>{formatFCFA(activeRestaurantOrder.total)}</strong></footer></div>
            </section>
            <div className="client-table-actions"><button onClick={() => requestService('water', 'Apporter une carafe d’eau')}><Phone size={17} /> Demander de l’eau</button><button onClick={() => requestService('bill', 'Préparer et apporter l’addition')}><ReceiptText size={17} /> Demander l’addition</button><button onClick={() => requestService('waiter', 'Passage du serveur à table')}><MessageCircle size={17} /> Appeler le serveur</button></div>
            {activeServiceRequests.length > 0 && <div className="client-live-requests">{activeServiceRequests.map(item => <article key={item.id}><span className={item.status}><i />{item.status === 'accepted' ? 'Pris en charge' : 'Reçu'}</span><div><strong>{item.label}</strong><small>{item.assignedTo} · avant {new Date(item.promisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></div></article>)}</div>}
            <section className="client-split-payment">
              <header><CircleDollarSign size={21} /><div><strong>Partager l’addition librement</strong><small>{restaurantRemaining > 0 ? `${formatFCFA(restaurantRemaining)} reste à répartir` : 'Addition entièrement réglée'}</small></div><b>{formatFCFA(restaurantPaid)} payé</b></header>
              {restaurantRemaining > 0 && <>
                <div className="client-split-shortcuts"><button onClick={() => setSplitPayment({ ...splitPayment, payerName: splitPayment.payerName || customer.fullName, amount: String(Math.ceil(restaurantRemaining / 2)) })}>Moitié · {formatFCFA(Math.ceil(restaurantRemaining / 2))}</button><button onClick={() => { const people = upcomingReservation?.guests || customer.restaurantPreferences?.defaultPartySize || 2; setSplitPayment({ ...splitPayment, payerName: splitPayment.payerName || customer.fullName, amount: String(Math.ceil(restaurantRemaining / people)) }); }}>Par convive</button><button onClick={() => setSplitPayment({ ...splitPayment, payerName: splitPayment.payerName || customer.fullName, amount: String(restaurantRemaining) })}>Tout le solde</button></div>
                <div className="client-split-form"><label>Qui paie ?<input className="form-control" value={splitPayment.payerName} onChange={event => setSplitPayment({ ...splitPayment, payerName: event.target.value })} placeholder="Prénom ou nom" /></label><label>Montant<input className="form-control" type="number" min="1" max={restaurantRemaining} value={splitPayment.amount} onChange={event => setSplitPayment({ ...splitPayment, amount: event.target.value })} /></label><label>Moyen<select className="form-control" value={splitPayment.method} onChange={event => setSplitPayment({ ...splitPayment, method: event.target.value as PaymentType })}><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="card">Carte</option><option value="cash">Espèces</option>{activePmsFolio && <option value="room_charge">Chambre {activePmsRoom?.roomNumber}</option>}</select></label><button onClick={payCustomShare}>Régler cette part</button></div>
              </>}
              {activeRestaurantOrder.payments.length > 0 && <div className="client-payment-history">{activeRestaurantOrder.payments.map(payment => <article key={payment.id}><CheckCircle size={15} /><span><strong>{payment.payerName || 'Payeur'}</strong><small>{PAYMENT_TYPE_LABELS[payment.method]}</small></span><b>{formatFCFA(payment.amount)}</b></article>)}</div>}
            </section>
            <section className="client-group-bill"><header><UserPlus size={20} /><div><strong>Inviter un convive à payer</strong><small>Choisissez sa part puis envoyez un accès personnel par téléphone.</small></div></header><div className="client-invite-form"><input className="form-control" placeholder="Prénom et nom" value={inviteForm.fullName} onChange={event => setInviteForm({ ...inviteForm, fullName: event.target.value })} /><input className="form-control" placeholder="+221 77…" value={inviteForm.phone} onChange={event => setInviteForm({ ...inviteForm, phone: event.target.value })} /><input className="form-control" type="number" min="1" max={restaurantRemaining} placeholder="Montant FCFA" value={inviteShareAmount} onChange={event => setInviteShareAmount(event.target.value)} /><button disabled={restaurantRemaining <= 0} onClick={inviteGuest}>Inviter</button></div>{restaurantInvites.map(invite => <article key={invite.id}><div><strong>{invite.fullName}</strong><small>Code {invite.accessCode} · {invite.status === 'paid' ? `réglé par ${PAYMENT_TYPE_LABELS[invite.paymentMethod || 'other']}` : invite.status === 'joined' ? 'a rejoint la table' : 'invitation envoyée'}</small></div><b>{formatFCFA(invite.paidAmount ?? invite.shareAmount)}</b>{invite.status !== 'paid' && <div className="client-invite-payments"><button onClick={() => { const amount = payRestaurantGuestShare(invite.id, 'wave'); setMessage(`${invite.fullName} a réglé ${formatFCFA(amount)} par Wave.`); }}>Wave</button><button onClick={() => { const amount = payRestaurantGuestShare(invite.id, 'orange_money'); setMessage(`${invite.fullName} a réglé ${formatFCFA(amount)} par Orange Money.`); }}>Orange Money</button></div>}</article>)}</section>
          </> : <div className="client-empty"><ChefHat size={32} /><h2>Aucune commande en cours</h2><button onClick={() => setRestaurantTab('menu')}>Découvrir la carte</button></div>}</div>
          <aside className="client-conversation"><header><span>M</span><div><strong>Moussa · Votre serveur</strong><small>Disponible maintenant</small></div></header><div className="client-message-thread">{conversations.map(item => <div className={item.sender} key={item.id}><span>{item.content}</span>{item.attachmentLabel && <b>{item.channel === 'voice' ? <Mic size={13} /> : <Camera size={13} />}{item.attachmentLabel}</b>}<small>{item.senderName}</small></div>)}</div><div className="client-rich-message"><button title="Envoyer une note vocale" onClick={() => sendRichMessage('voice')}><Mic size={16} /></button><button title="Joindre une photo" onClick={() => sendRichMessage('photo')}><Camera size={16} /></button></div><footer><input className="form-control" placeholder="Écrire à l’équipe…" value={chat} onChange={event => setChat(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') sendMessage(); }} /><button onClick={sendMessage}><Send size={17} /></button></footer></aside>
        </section>}

        {mode === 'delivery' && deliveryTab === 'shop' && <>
          <section className="client-hero grocery">
            {!customer.lowBandwidthMode && <img src="./sartal-client-grocery.jpg" alt="Panier de produits d’épicerie disponibles en livraison" />}
            <div><span>Livraison à {defaultAddress?.zone || 'Dakar'}</span><h1>Les essentiels, vraiment disponibles</h1><p>Le catalogue reflète le stock vendable du dépôt qui prépare votre commande.</p><div className="client-search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Riz, huile, bissap…" /></div></div>
          </section>
          <section className="client-smart-shopping">
            <article className="client-smart-list">
              <header><Sparkles size={21} /><div><span>LISTE INTELLIGENTE</span><h2>Transformez votre liste en panier</h2></div></header>
              <textarea value={smartListText} onChange={event => setSmartListText(event.target.value)} placeholder="Collez un message WhatsApp : riz x1, huile x2, lait x1…" />
              <div className="client-smart-actions">
                <label><Camera size={16} /> Photographier<input type="file" accept="image/*" capture="environment" onChange={event => handleSmartListPhoto(event.target.files?.[0])} /></label>
                <button onClick={startSmartListVoice}><Mic size={16} /> Dicter</button>
                <button className="primary" disabled={!smartListText.trim()} onClick={() => applySmartList(smartListText)}><ShoppingBag size={16} /> Créer le panier</button>
              </div>
              {smartListPhoto && <small><CheckCircle size={13} /> {smartListPhoto} · propositions ajoutées, à vérifier</small>}
            </article>
            <article className="client-budget-planner">
              <header><WalletCards size={21} /><div><span>MODE BUDGET</span><h2>Combien voulez-vous dépenser ?</h2></div></header>
              <label><span>Budget livraison comprise</span><div><input type="number" min="3000" step="500" value={budget} onChange={event => setBudget(event.target.value)} /><b>FCFA</b></div></label>
              <p>Nous proposons un panier d’essentiels disponibles sans dépasser votre montant. Chaque quantité reste modifiable.</p>
              <button onClick={buildBudgetCart}>Composer mon panier <ArrowRight size={16} /></button>
            </article>
          </section>
          <div className="client-product-grid grocery-grid">{onlineProducts.map(item => <article key={item.product!.id}><div className="grocery-product-visual"><PackageCheck size={28} /><span>{item.available} disponible(s)</span><button className={customer.favoriteProductIds?.includes(item.product!.id) ? 'client-favorite-button active' : 'client-favorite-button'} title="Ajouter aux favoris" onClick={() => toggleFavorite(item.product!.id)}><Heart size={15} fill={customer.favoriteProductIds?.includes(item.product!.id) ? 'currentColor' : 'none'} /></button></div><div><small>{item.product!.category}</small><h3>{item.product!.name}</h3><footer><strong>{formatFCFA(item.price)}</strong><div className="client-quantity"><button onClick={() => changeQuantity('delivery', item.product!.id, -1)}><Minus size={15} /></button><span>{deliveryCart[item.product!.id] || 0}</span><button onClick={() => changeQuantity('delivery', item.product!.id, 1)}><Plus size={15} /></button></div></footer></div></article>)}</div>
          {Object.keys(deliveryCart).length > 0 && <button className="client-basket-fab" onClick={() => setDeliveryTab('basket')}><ShoppingBag size={19} /><span>Voir mon panier</span><strong>{formatFCFA(deliverySubtotal)}</strong></button>}
        </>}

        {mode === 'delivery' && deliveryTab === 'basket' && <section className="client-checkout-layout">
          <div className="client-basket-panel">
            {editingDeliveryOrderId && <div className="client-editing-order"><ReceiptText size={19} /><div><strong>Modification de {editingDeliveryOrderId}</strong><small>Possible jusqu’au début de la préparation. Le nouveau montant sera recalculé.</small></div><button onClick={() => { setEditingDeliveryOrderId(''); setDeliveryCart({}); setDeliveryTab('tracking'); }}>Annuler</button></div>}
            <span>MON PANIER</span><h1>{editingDeliveryOrderId ? 'Modifier ma commande' : 'Vérifier avant de commander'}</h1>
            {Object.entries(deliveryCart).map(([productId, quantity]) => { const product = db.products.find(item => item.id === productId); const price = db.posPricing.find(item => item.posId === deliveryChannel.id && item.productId === productId)?.salePrice || 0; return <article key={productId}><div><strong>{product?.name}</strong><small>{quantity} × {formatFCFA(price)}</small></div><div className="client-quantity"><button onClick={() => changeQuantity('delivery', productId, -1)}><Minus size={15} /></button><span>{quantity}</span><button onClick={() => changeQuantity('delivery', productId, 1)}><Plus size={15} /></button></div><label>Si indisponible<select value={substitutionPolicies[productId] || 'contact'} onChange={event => setSubstitutionPolicies({ ...substitutionPolicies, [productId]: event.target.value as typeof substitutionPolicies[string] })}><option value="replace">Remplacer par un équivalent</option><option value="contact">Me contacter</option><option value="refund">Rembourser cet article</option><option value="cancel_order">Annuler toute la commande</option></select></label></article>; })}
            {Object.keys(deliveryCart).length === 0 && <div className="client-empty"><ShoppingBag size={30} /><h2>Votre panier est vide</h2><button onClick={() => setDeliveryTab('shop')}>Retour à la boutique</button></div>}
            {household && <section className="client-family-cart"><header><UserPlus size={20} /><div><span>PANIER PARTAGÉ</span><h2>{household.name}</h2></div><b>{household.memberCustomerIds.length} membres</b></header><p>Chacun ajoute ses produits. Le panier final regroupe les contributions sans écraser celles des autres.</p>{household.sharedCartItems?.length ? <div className="client-family-contributions">{household.memberCustomerIds.map(memberId => { const member = db.sartalCustomers.find(item => item.id === memberId); const lines = household.sharedCartItems?.filter(item => item.addedByCustomerId === memberId).length || 0; return <span key={memberId}><i>{member?.fullName.split(' ').map(part => part[0]).join('').slice(0, 2)}</i><strong>{member?.fullName}</strong><small>{lines} ligne(s)</small></span>; })}</div> : <small>Aucune contribution partagée pour le moment.</small>}<footer><button disabled={!Object.keys(deliveryCart).length} onClick={saveFamilyCart}>Ajouter ma contribution</button><button disabled={!household.sharedCartItems?.length} onClick={loadFamilyCart}>Charger le panier famille</button><button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Rejoins le panier ${household.name} dans Mon Sártal pour ajouter tes courses.`)}`, '_blank', 'noopener,noreferrer')}><MessageCircle size={15} /> Inviter par WhatsApp</button></footer></section>}
          </div>
          <aside className="client-delivery-summary">
            <section className={`client-delivery-plus ${deliveryPlusActive ? 'active' : ''}`}><div><Gift size={21} /><span><strong>Livraison+</strong><small>{deliveryPlusActive ? `Actif · renouvellement ${customer.deliveryPlusRenewsAt ? formatDate(customer.deliveryPlusRenewsAt) : 'dans 30 jours'}` : 'Livraisons offertes et créneaux prioritaires'}</small></span></div><b>{deliveryPlusActive ? '0 FCFA' : '3 500 FCFA/mois'}</b><button onClick={() => { const status = toggleSartalDeliveryPlus(customer.id); setMessage(status === 'active' ? 'Livraison+ activée. Les frais de ce panier passent à 0 FCFA.' : 'Livraison+ est désormais en pause.'); }}>{deliveryPlusActive ? 'Mettre en pause' : 'Activer Livraison+'}</button></section>
            {defaultAddress ? <div className="client-address"><MapPin size={21} /><div><span>Livrer à</span><strong>{defaultAddress.label} · {defaultAddress.address}</strong><small>{defaultAddress.landmark}</small><small>{defaultAddress.instructions}</small></div></div> : <div className="client-address missing"><MapPin size={21} /><div><span>Adresse requise</span><strong>Où souhaitez-vous être livré ?</strong><small>La zone permettra de calculer les frais et les créneaux disponibles.</small><button onClick={() => { setHubInitialTab('passport'); setSpace('hub'); }}>Ajouter une adresse</button></div></div>}
            <section className="client-slot-picker"><header><Clock3 size={18} /><div><strong>Choisir un créneau réel</strong><small>Les places se mettent à jour selon les commandes.</small></div></header><div>{deliverySlots.map(slot => { const full = slot.booked >= slot.capacity; return <button key={slot.id} disabled={full} className={selectedSlot?.id === slot.id ? 'active' : ''} onClick={() => setSelectedDeliverySlotId(slot.id)}><strong>{slot.label}</strong><small>{full ? 'Complet' : `${slot.capacity - slot.booked} place(s)`}{slot.priority ? ' · prioritaire' : ''}</small>{slot.feeDelta > 0 && !deliveryPlusActive ? <b>+{formatFCFA(slot.feeDelta)}</b> : null}</button>; })}</div></section>
            <div className="client-summary-lines"><span>Sous-total <b>{formatFCFA(deliverySubtotal)}</b></span><span>Livraison{defaultAddress ? ` · ${defaultAddress.zone}` : ''} <b>{defaultAddress ? (deliveryPlusActive ? 'Offerte' : formatFCFA(deliveryFee)) : 'À calculer'}</b></span><strong>Total <b>{formatFCFA(deliverySubtotal + (defaultAddress ? deliveryFee : 0))}</b></strong></div>
            <div className="client-payment-methods">{(['wave', 'orange_money', 'cash'] as const).map(method => <button key={method} className={paymentMethod === method ? 'active' : ''} onClick={() => setPaymentMethod(method)}><WalletCards size={16} /> {PAYMENT_TYPE_LABELS[method]}</button>)}</div>
            <button className="btn btn-primary" disabled={deliverySubtotal <= 0 || !selectedSlot || !defaultAddress} onClick={placeDeliveryOrder}>{editingDeliveryOrderId ? 'Enregistrer les modifications' : 'Confirmer la commande'} <ArrowRight size={17} /></button>
            <small>{selectedSlot ? `Livraison prévue ${selectedSlot.label}.` : 'Aucun créneau disponible.'} Aucun produit indisponible ne sera facturé.</small>
          </aside>
        </section>}

        {mode === 'delivery' && deliveryTab === 'tracking' && <section className="client-tracking-layout">{activeDeliveryOrder ? <>
          <div className="client-delivery-map"><div className="map-road road-one" /><div className="map-road road-two" /><span className="map-origin"><Store size={18} /></span><span className="map-driver"><Truck size={18} /></span><span className="map-destination"><MapPin size={18} /></span><div className="map-status"><span>{deliveryStatus[activeDeliveryOrder.status]}</span><strong>{activeDeliveryOrder.deliverySlotLabel || `${activeDeliveryOrder.estimatedMinutes || 45} min estimées`}</strong></div></div>
          <div className="client-tracking-detail">
            <span>{activeDeliveryOrder.id}</span><h1>{deliveryStatus[activeDeliveryOrder.status]}</h1><p>{activeDeliveryOrder.address} · {activeDeliveryOrder.landmark}</p>
            {activeDeliveryOrder.deliverySlotLabel && <div className="client-order-slot"><Clock3 size={17} /><span><small>Créneau réservé</small><strong>{activeDeliveryOrder.deliverySlotLabel}</strong></span></div>}
            {activeDeliveryOrder.status === 'confirmed' && <button className="client-edit-order-button" onClick={startEditingDeliveryOrder}><ReceiptText size={17} /><span><strong>Modifier ma commande</strong><small>Articles, quantités ou créneau · avant préparation</small></span><ArrowRight size={16} /></button>}
            {activeDeliveryOrder.items.filter(item => item.substitutionProductId && (!item.substitutionStatus || item.substitutionStatus === 'proposed')).map(item => { const original = db.products.find(product => product.id === item.productId); const replacement = db.products.find(product => product.id === item.substitutionProductId); const replacementPrice = db.posPricing.find(price => price.posId === activeDeliveryOrder.channelId && price.productId === item.substitutionProductId)?.salePrice || item.salePrice; const difference = (replacementPrice - item.salePrice) * item.quantity; return <section className="client-substitution-live" key={item.productId}><header><PackageCheck size={20} /><div><span>VOTRE CHOIX EST ATTENDU</span><h2>Un remplacement est proposé</h2></div></header><div><article><small>Article commandé</small><strong>{item.quantity} × {original?.name}</strong><b>{formatFCFA(item.salePrice * item.quantity)}</b></article><ArrowRight size={18} /><article><small>Produit disponible</small><strong>{item.quantity} × {replacement?.name}</strong><b>{formatFCFA(replacementPrice * item.quantity)}{difference !== 0 ? ` · ${difference > 0 ? '+' : ''}${formatFCFA(difference)}` : ''}</b></article></div><p>Votre commande reste en attente de cette décision. Aucun remplacement ne sera imposé.</p><footer><button onClick={() => { decideDeliverySubstitution(activeDeliveryOrder.id, customer.id, item.productId, 'rejected'); setMessage('Remplacement refusé. L’article manquant ne sera pas facturé.'); }}>Refuser</button><button className="primary" onClick={() => { decideDeliverySubstitution(activeDeliveryOrder.id, customer.id, item.productId, 'approved'); setMessage('Remplacement confirmé et montant mis à jour.'); }}>Accepter le remplacement</button></footer></section>; })}
            {activeDeliveryOrder.paymentAdjustment !== undefined && activeDeliveryOrder.paymentAdjustment !== 0 && <div className="client-payment-adjustment"><WalletCards size={17} /><span><strong>Ajustement de paiement {activeDeliveryOrder.paymentAdjustment > 0 ? '+' : ''}{formatFCFA(activeDeliveryOrder.paymentAdjustment)}</strong><small>{activeDeliveryOrder.paymentStatus === 'pending' ? 'Validation du nouveau montant en attente' : 'Montant régularisé'}</small></span></div>}
            <div className="client-progress vertical">{[['confirmed', 'Commande reçue'], ['preparing', 'Préparation et contrôle'], ['out_for_delivery', 'Livreur en route'], ['delivered', 'Livraison confirmée']].map(([status, label]) => { const ranks: DeliveryOrderStatus[] = ['confirmed', 'reserved', 'preparing', 'ready', 'out_for_delivery', 'delivered']; const done = ranks.indexOf(activeDeliveryOrder.status) >= ranks.indexOf(status as DeliveryOrderStatus); return <article className={done ? 'done' : ''} key={status}><span>{done ? <CheckCircle size={16} /> : null}</span><div><strong>{label}</strong><small>{status === 'out_for_delivery' ? activeDeliveryOrder.driverName || 'Livreur à affecter' : status === 'delivered' ? `Code ${activeDeliveryOrder.verificationCode}` : 'Mise à jour automatique'}</small></div></article>; })}</div>
            {activeDeliveryOrder.proofStatus === 'photo_confirmed' ? <div className="client-proof-confirmation"><CheckCircle size={19} /><span><strong>Remise certifiée</strong><small>Code, signature et photo confirmés{activeDeliveryOrder.proofCompletedAt ? ` · ${new Date(activeDeliveryOrder.proofCompletedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}</small></span></div> : activeDeliveryOrder.status === 'out_for_delivery' ? <div className="client-proof-confirmation pending"><PackageCheck size={19} /><span><strong>Votre code de remise : {activeDeliveryOrder.verificationCode}</strong><small>Communiquez-le au livreur uniquement lorsque la commande est devant vous.</small></span></div> : null}
            {activeDeliveryOrder.driverName && <div className="client-driver"><span>{activeDeliveryOrder.driverName.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><div><strong>{activeDeliveryOrder.driverName}</strong><small>Votre livreur · {activeDeliveryOrder.driverPhone}</small></div><button onClick={() => setDeliveryTab('help')}><Phone size={17} /></button></div>}
            {['delivered', 'returned'].includes(activeDeliveryOrder.status) && <button className="btn btn-secondary" onClick={() => { const id = reorderDeliveryOrder(activeDeliveryOrder.id); setMessage(`Votre panier a été recréé dans la commande ${id}.`); }}>Recommander ce panier</button>}
          </div>
        </> : <div className="client-empty"><Truck size={34} /><h2>Aucune livraison à suivre</h2><button onClick={() => setDeliveryTab('shop')}>Découvrir la boutique</button></div>}</section>}

        {mode === 'delivery' && deliveryTab === 'help' && <section className="client-help-layout"><div className="client-conversation"><header><span>F</span><div><strong>Fatou · Service client</strong><small>Réponse moyenne : 4 min</small></div></header><div className="client-message-thread">{conversations.map(item => <div className={item.sender} key={item.id}><span>{item.content}</span>{item.attachmentLabel && <b>{item.channel === 'voice' ? <Mic size={13} /> : <Camera size={13} />}{item.attachmentLabel}</b>}<small>{item.senderName}</small></div>)}</div><div className="client-rich-message"><button onClick={() => sendRichMessage('voice')}><Mic size={16} /> Note vocale</button><button onClick={() => sendRichMessage('photo')}><Camera size={16} /> Photo</button><button onClick={() => requestService('delivery_help', 'Être rappelé par le service livraison')}><Phone size={16} /> Me rappeler</button></div><footer><input className="form-control" placeholder="Écrire au service client…" value={chat} onChange={event => setChat(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') sendMessage(); }} /><button onClick={sendMessage}><Send size={17} /></button></footer>{activeServiceRequests.map(item => <div className="client-help-request" key={item.id}><Clock3 size={16} /><span><strong>{item.label}</strong><small>{item.assignedTo} · réponse promise avant {new Date(item.promisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></span></div>)}</div><div className="client-feedback-panel">{activeFeedback ? <><HeartHandshake size={25} /><span className={`client-recovery-status ${activeFeedback.recoveryStatus}`}>{activeFeedback.recoveryStatus === 'open' ? 'Suivi prioritaire en cours' : 'Situation résolue'}</span><h2>{activeFeedback.assignedTo || 'Relation client'}</h2><p>{activeFeedback.recoveryStatus === 'open' ? `Vous recontacte avant ${activeFeedback.promisedAt ? new Date(activeFeedback.promisedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'quelques minutes'}.` : activeFeedback.solution}</p>{activeFeedback.compensationPoints ? <strong>+{activeFeedback.compensationPoints} points offerts</strong> : null}<small>Votre dossier reste lié à la commande {activeFeedback.referenceId}.</small></> : <><HeartHandshake size={25} /><h2>Tout s’est bien passé ?</h2><p>Un problème signalé est suivi jusqu’à sa résolution.</p><div className="client-rating">{[1, 2, 3, 4, 5].map(score => <button className={feedbackScore >= score ? 'active' : ''} key={score} onClick={() => setFeedbackScore(score)}><Star size={22} /></button>)}</div><textarea className="form-control" placeholder="Article manquant, endommagé, retard…" value={feedbackNote} onChange={event => setFeedbackNote(event.target.value)} /><button className="btn btn-primary" disabled={!activeDeliveryOrder} onClick={sendFeedback}>Envoyer mon retour</button></>}</div></section>}

      </main>
      </>}
      {message && <div className="client-toast"><CheckCircle size={18} /> {message}</div>}
      {standalone && <footer className="sartal-client-footer"><span>{siteBrand?.displayName || brandSettings.establishmentName} · aide {siteBrand?.supportPhone || brandSettings.supportPhone}</span><span>Paiements sécurisés · Wave · Orange Money</span></footer>}
    </section>
  );
};

export default SartalClient;
