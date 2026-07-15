import React, { useState } from 'react';
import {
  BellRing,
  Check,
  CreditCard,
  Download,
  Home,
  Languages,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  Truck,
  UserRound,
  UtensilsCrossed,
  WifiOff
} from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { PaymentType, SartalCustomer, SartalCustomerAddress } from '../types';

type ProfileSection = 'identity' | 'restaurant' | 'delivery' | 'addresses' | 'notifications' | 'privacy';

interface SartalClientProfileCenterProps {
  state: StockState;
  customer: SartalCustomer;
  restaurantEnabled: boolean;
  deliveryEnabled: boolean;
  onMessage: (message: string) => void;
}

const emptyAddress = (): Omit<SartalCustomerAddress, 'id'> & { id?: string } => ({
  label: '', address: '', zone: 'Point E / Fann', landmark: '', instructions: '', isDefault: false
});

export const SartalClientProfileCenter: React.FC<SartalClientProfileCenterProps> = ({ state, customer, restaurantEnabled, deliveryEnabled, onMessage }) => {
  const {
    updateSartalCustomerProfile, saveSartalCustomerAddress, setDefaultSartalCustomerAddress,
    deleteSartalCustomerAddress, revokeSartalClientAccess, toggleLowBandwidthMode,
    syncSartalOfflineActions, db
  } = state;
  const [section, setSection] = useState<ProfileSection>('identity');
  const [addressForm, setAddressForm] = useState(emptyAddress());
  const [editingAddress, setEditingAddress] = useState(false);
  const [profile, setProfile] = useState(() => ({
    fullName: customer.fullName,
    email: customer.email || '',
    birthday: customer.birthday || '',
    preferredLanguage: customer.preferredLanguage,
    preferredChannel: customer.preferredChannel || 'whatsapp' as const,
    preferences: customer.preferences || '',
    allergies: customer.allergies || '',
    profileConsent: customer.profileConsent,
    marketingConsent: customer.marketingConsent ?? false,
    defaultPaymentType: customer.defaultPaymentType || 'wave' as PaymentType,
    restaurantPreferences: customer.restaurantPreferences || { seatingArea: 'no_preference' as const, servicePace: 'standard' as const, dietaryStyle: 'none' as const, defaultPartySize: 2 },
    deliveryPreferences: customer.deliveryPreferences || { substitutionPolicy: 'contact' as const, dropoffMethod: 'hand_delivery' as const, preferredWindow: 'evening' as const, callOnArrival: true, ecoPackaging: false },
    notificationPreferences: customer.notificationPreferences || { serviceUpdates: true, reservationReminders: true, deliveryTracking: true, loyaltyNews: false },
    privacyPreferences: customer.privacyPreferences || { shareAcrossServices: true, personalizedRecommendations: true, anonymousAnalytics: false }
  }));
  const activeAccess = db.sartalClientAccess.filter(item => item.customerId === customer.id && item.status === 'active' && new Date(item.expiresAt).getTime() > Date.now());
  const queuedOfflineActions = db.sartalOfflineActions.filter(item => item.customerId === customer.id && item.status === 'queued');

  const saveProfile = () => {
    updateSartalCustomerProfile(customer.id, profile);
    onMessage('Vos réglages ont été enregistrés et appliqués aux services autorisés.');
  };

  const startAddress = (address?: SartalCustomerAddress) => {
    setAddressForm(address ? { ...address } : emptyAddress());
    setEditingAddress(true);
  };

  const saveAddress = () => {
    try {
      saveSartalCustomerAddress(customer.id, addressForm);
      setAddressForm(emptyAddress());
      setEditingAddress(false);
      onMessage(addressForm.id ? 'Adresse mise à jour.' : 'Nouvelle adresse enregistrée.');
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Adresse non enregistrée'); }
  };

  const exportProfile = () => {
    const data = JSON.stringify({ profile: customer, restaurantReservations: db.restaurantReservations.filter(item => item.customerId === customer.id), restaurantOrders: db.restaurantGuestOrders.filter(item => item.customerId === customer.id), deliveryOrders: db.deliveryOrders.filter(item => item.customerId === customer.id) }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `mon-sartal-${customer.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onMessage('Votre copie de données personnelles a été préparée.');
  };

  const sections = ([
    { id: 'identity', label: 'Identité', icon: <UserRound size={17} />, visible: true },
    { id: 'restaurant', label: 'Restaurant', icon: <UtensilsCrossed size={17} />, visible: restaurantEnabled },
    { id: 'delivery', label: 'Livraison', icon: <Truck size={17} />, visible: deliveryEnabled },
    { id: 'addresses', label: 'Adresses', icon: <MapPin size={17} />, visible: deliveryEnabled },
    { id: 'notifications', label: 'Notifications', icon: <BellRing size={17} />, visible: true },
    { id: 'privacy', label: 'Confidentialité', icon: <ShieldCheck size={17} />, visible: true }
  ] satisfies Array<{ id: ProfileSection; label: string; icon: React.ReactNode; visible: boolean }>).filter(item => item.visible);

  return <section className="sartal-profile-center">
    <header><div><UserRound size={22} /><span><h2>Mes réglages</h2><p>Une identité unique, avec des choix adaptés à chaque service.</p></span></div><button onClick={saveProfile}><Save size={16} /> Enregistrer</button></header>
    <nav>{sections.map(item => <button className={section === item.id ? 'active' : ''} key={item.id} onClick={() => setSection(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>

    {section === 'identity' && <div className="sartal-profile-section">
      <div className="sartal-profile-section-heading"><UserRound size={20} /><div><h3>Identité et préférences générales</h3><p>Le téléphone vérifié relie vos expériences sans multiplier les comptes.</p></div></div>
      <div className="client-form-grid">
        <label>Nom complet<input className="form-control" value={profile.fullName} onChange={event => setProfile({ ...profile, fullName: event.target.value })} /></label>
        <label>Téléphone vérifié<div className="sartal-verified-field"><Smartphone size={16} /><span>{customer.guestSession ? 'Session sans profil' : customer.phone}</span><Check size={15} /></div></label>
        <label>E-mail<input className="form-control" type="email" value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value })} /></label>
        <label>Date de naissance<input className="form-control" type="date" value={profile.birthday} onChange={event => setProfile({ ...profile, birthday: event.target.value })} /></label>
        <label><Languages size={14} /> Langue<select className="form-control" value={profile.preferredLanguage} onChange={event => setProfile({ ...profile, preferredLanguage: event.target.value as typeof profile.preferredLanguage })}><option value="fr">Français</option><option value="wo">Wolof</option><option value="en">English</option></select></label>
        <label>Canal préféré<select className="form-control" value={profile.preferredChannel} onChange={event => setProfile({ ...profile, preferredChannel: event.target.value as typeof profile.preferredChannel })}><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">E-mail</option><option value="portal">Portail uniquement</option></select></label>
      </div>
      <label>Ce qui rend le service plus agréable<textarea className="form-control" value={profile.preferences} onChange={event => setProfile({ ...profile, preferences: event.target.value })} placeholder="Rythme, habitudes, occasions importantes…" /></label>
      <label>Allergies et besoins importants<textarea className="form-control" value={profile.allergies} onChange={event => setProfile({ ...profile, allergies: event.target.value })} placeholder="Informations visibles uniquement par les équipes concernées" /></label>
      <div className="sartal-consent-row"><label><input type="checkbox" checked={profile.profileConsent} onChange={event => setProfile({ ...profile, profileConsent: event.target.checked })} /><span><strong>Mémoire de service</strong><small>Retrouver ces choix lors de votre prochaine visite.</small></span></label><label><input type="checkbox" checked={profile.marketingConsent} onChange={event => setProfile({ ...profile, marketingConsent: event.target.checked })} /><span><strong>Offres choisies</strong><small>Recevoir des offres pertinentes, jamais activées par défaut.</small></span></label></div>
    </div>}

    {section === 'restaurant' && <div className="sartal-profile-section">
      <div className="sartal-profile-section-heading"><UtensilsCrossed size={20} /><div><h3>Mon expérience restaurant</h3><p>Ces choix aident la salle et la cuisine à préparer votre venue.</p></div></div>
      <div className="client-form-grid">
        <label>Emplacement préféré<select className="form-control" value={profile.restaurantPreferences.seatingArea} onChange={event => setProfile({ ...profile, restaurantPreferences: { ...profile.restaurantPreferences, seatingArea: event.target.value as typeof profile.restaurantPreferences.seatingArea } })}><option value="no_preference">Sans préférence</option><option value="quiet">Table calme</option><option value="terrace">Terrasse</option><option value="accessible">Accès facilité</option></select></label>
        <label>Rythme du service<select className="form-control" value={profile.restaurantPreferences.servicePace} onChange={event => setProfile({ ...profile, restaurantPreferences: { ...profile.restaurantPreferences, servicePace: event.target.value as typeof profile.restaurantPreferences.servicePace } })}><option value="relaxed">Prendre le temps</option><option value="standard">Classique</option><option value="quick">Service rapide</option></select></label>
        <label>Habitude alimentaire<select className="form-control" value={profile.restaurantPreferences.dietaryStyle} onChange={event => setProfile({ ...profile, restaurantPreferences: { ...profile.restaurantPreferences, dietaryStyle: event.target.value as typeof profile.restaurantPreferences.dietaryStyle } })}><option value="none">Aucune</option><option value="vegetarian">Végétarien</option><option value="halal">Halal</option><option value="low_salt">Peu salé</option></select></label>
        <label>Nombre habituel de convives<input className="form-control" type="number" min="1" max="20" value={profile.restaurantPreferences.defaultPartySize} onChange={event => setProfile({ ...profile, restaurantPreferences: { ...profile.restaurantPreferences, defaultPartySize: Number(event.target.value) } })} /></label>
      </div>
      <div className="sartal-profile-callout"><BellRing size={18} /><span><strong>Utilisation concrète</strong><small>La préférence de table apparaît lors de la réservation, le rythme est visible du chef de rang et les besoins alimentaires sont signalés en cuisine.</small></span></div>
    </div>}

    {section === 'delivery' && <div className="sartal-profile-section">
      <div className="sartal-profile-section-heading"><Truck size={20} /><div><h3>Mes habitudes de livraison</h3><p>Préparez les décisions récurrentes avant chaque commande.</p></div></div>
      <div className="client-form-grid">
        <label>Si un produit manque<select className="form-control" value={profile.deliveryPreferences.substitutionPolicy} onChange={event => setProfile({ ...profile, deliveryPreferences: { ...profile.deliveryPreferences, substitutionPolicy: event.target.value as typeof profile.deliveryPreferences.substitutionPolicy } })}><option value="contact">Me demander</option><option value="replace">Remplacer au mieux</option><option value="refund">Rembourser</option></select></label>
        <label>Remise du panier<select className="form-control" value={profile.deliveryPreferences.dropoffMethod} onChange={event => setProfile({ ...profile, deliveryPreferences: { ...profile.deliveryPreferences, dropoffMethod: event.target.value as typeof profile.deliveryPreferences.dropoffMethod } })}><option value="hand_delivery">En main propre</option><option value="doorstep">Devant la porte</option><option value="reception">À l’accueil / gardien</option></select></label>
        <label>Créneau préféré<select className="form-control" value={profile.deliveryPreferences.preferredWindow} onChange={event => setProfile({ ...profile, deliveryPreferences: { ...profile.deliveryPreferences, preferredWindow: event.target.value as typeof profile.deliveryPreferences.preferredWindow } })}><option value="morning">Matin</option><option value="afternoon">Après-midi</option><option value="evening">Soir</option></select></label>
        <label><CreditCard size={14} /> Paiement habituel<select className="form-control" value={profile.defaultPaymentType} onChange={event => setProfile({ ...profile, defaultPaymentType: event.target.value as PaymentType })}><option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="card">Carte</option><option value="cash">Espèces à la livraison</option></select></label>
      </div>
      <div className="sartal-choice-grid"><label><input type="checkbox" checked={profile.deliveryPreferences.callOnArrival} onChange={event => setProfile({ ...profile, deliveryPreferences: { ...profile.deliveryPreferences, callOnArrival: event.target.checked } })} /><span><strong>M’appeler à l’arrivée</strong><small>Le livreur voit cette consigne.</small></span></label><label><input type="checkbox" checked={profile.deliveryPreferences.ecoPackaging} onChange={event => setProfile({ ...profile, deliveryPreferences: { ...profile.deliveryPreferences, ecoPackaging: event.target.checked } })} /><span><strong>Limiter les emballages</strong><small>Lorsque la préparation le permet.</small></span></label></div>
    </div>}

    {section === 'addresses' && <div className="sartal-profile-section">
      <div className="sartal-profile-section-heading"><MapPin size={20} /><div><h3>Mes adresses de livraison</h3><p>Repères et consignes sont transmis au préparateur puis au livreur.</p></div><button onClick={() => startAddress()}><Plus size={16} /> Ajouter</button></div>
      <div className="sartal-address-list">{customer.addresses.map(address => <article className={address.isDefault ? 'default' : ''} key={address.id}><span><Home size={18} /></span><div><strong>{address.label}{address.isDefault && <b>Par défaut</b>}</strong><p>{address.address}</p><small>{address.zone} · {address.landmark || 'Aucun repère'}</small></div><div><button title="Modifier" onClick={() => startAddress(address)}><Pencil size={15} /></button>{!address.isDefault && <button onClick={() => setDefaultSartalCustomerAddress(customer.id, address.id)}>Définir par défaut</button>}<button className="danger" title="Supprimer" onClick={() => { deleteSartalCustomerAddress(customer.id, address.id); onMessage('Adresse supprimée.'); }}><Trash2 size={15} /></button></div></article>)}{customer.addresses.length === 0 && <div className="sartal-address-empty"><MapPin size={25} /><strong>Aucune adresse enregistrée</strong><p>Ajoutez une adresse avant de confirmer une livraison.</p><button onClick={() => startAddress()}>Ajouter ma première adresse</button></div>}</div>
      {editingAddress && <div className="sartal-address-editor"><header><strong>{addressForm.id ? 'Modifier l’adresse' : 'Nouvelle adresse'}</strong><button onClick={() => setEditingAddress(false)}>Fermer</button></header><div className="client-form-grid"><label>Nom de l’adresse<input className="form-control" value={addressForm.label} onChange={event => setAddressForm({ ...addressForm, label: event.target.value })} placeholder="Maison, Bureau…" /></label><label>Zone<select className="form-control" value={addressForm.zone} onChange={event => setAddressForm({ ...addressForm, zone: event.target.value })}><option>Point E / Fann</option><option>Mermoz / Sacré-Coeur</option><option>Ouakam / Almadies</option><option>Parcelles / Grand Yoff</option><option>Plateau / Médina</option></select></label><label className="wide">Adresse complète<input className="form-control" value={addressForm.address} onChange={event => setAddressForm({ ...addressForm, address: event.target.value })} /></label><label>Repère utile<input className="form-control" value={addressForm.landmark} onChange={event => setAddressForm({ ...addressForm, landmark: event.target.value })} /></label><label>Instructions<input className="form-control" value={addressForm.instructions || ''} onChange={event => setAddressForm({ ...addressForm, instructions: event.target.value })} /></label></div><label className="sartal-inline-check"><input type="checkbox" checked={addressForm.isDefault} onChange={event => setAddressForm({ ...addressForm, isDefault: event.target.checked })} /> Utiliser par défaut</label><button className="btn btn-primary" onClick={saveAddress}><Save size={16} /> Enregistrer l’adresse</button></div>}
    </div>}

    {section === 'notifications' && <div className="sartal-profile-section">
      <div className="sartal-profile-section-heading"><BellRing size={20} /><div><h3>Notifications utiles</h3><p>Les alertes opérationnelles restent séparées des offres commerciales.</p></div></div>
      <div className="sartal-notification-settings"><label><span><strong>Suivi du service en direct</strong><small>Commande reçue, prête, addition ou demande prise en charge.</small></span><input type="checkbox" checked={profile.notificationPreferences.serviceUpdates} onChange={event => setProfile({ ...profile, notificationPreferences: { ...profile.notificationPreferences, serviceUpdates: event.target.checked } })} /></label>{restaurantEnabled && <label><span><strong>Rappels de réservation</strong><small>Confirmation et rappel avant votre table.</small></span><input type="checkbox" checked={profile.notificationPreferences.reservationReminders} onChange={event => setProfile({ ...profile, notificationPreferences: { ...profile.notificationPreferences, reservationReminders: event.target.checked } })} /></label>}{deliveryEnabled && <label><span><strong>Suivi du livreur</strong><small>Préparation, départ, arrivée et incident.</small></span><input type="checkbox" checked={profile.notificationPreferences.deliveryTracking} onChange={event => setProfile({ ...profile, notificationPreferences: { ...profile.notificationPreferences, deliveryTracking: event.target.checked } })} /></label>}<label><span><strong>Nouveaux avantages fidélité</strong><small>Uniquement si les offres personnalisées sont autorisées.</small></span><input type="checkbox" checked={profile.notificationPreferences.loyaltyNews} onChange={event => setProfile({ ...profile, notificationPreferences: { ...profile.notificationPreferences, loyaltyNews: event.target.checked } })} /></label></div>
    </div>}

    {section === 'privacy' && <div className="sartal-profile-section">
      <div className="sartal-profile-section-heading"><ShieldCheck size={20} /><div><h3>Confidentialité et appareils</h3><p>Décidez ce qui est partagé et fermez un accès à tout moment.</p></div></div>
      <div className="sartal-notification-settings"><label><span><strong>Relier mes services</strong><small>Permettre au restaurant de reconnaître un séjour ou à la livraison de retrouver vos préférences.</small></span><input type="checkbox" checked={profile.privacyPreferences.shareAcrossServices} onChange={event => setProfile({ ...profile, privacyPreferences: { ...profile.privacyPreferences, shareAcrossServices: event.target.checked } })} /></label><label><span><strong>Recommandations personnalisées</strong><small>Adapter les propositions sans modifier les prix.</small></span><input type="checkbox" checked={profile.privacyPreferences.personalizedRecommendations} onChange={event => setProfile({ ...profile, privacyPreferences: { ...profile.privacyPreferences, personalizedRecommendations: event.target.checked } })} /></label><label><span><strong>Mesure d’usage anonyme</strong><small>Aider à améliorer l’application sans rattacher les statistiques à votre nom.</small></span><input type="checkbox" checked={profile.privacyPreferences.anonymousAnalytics} onChange={event => setProfile({ ...profile, privacyPreferences: { ...profile.privacyPreferences, anonymousAnalytics: event.target.checked } })} /></label></div>
      <div className="sartal-security-list"><header><LockKeyhole size={18} /><span><strong>Accès temporaires actifs</strong><small>{activeAccess.length} session(s) encore ouverte(s)</small></span></header>{activeAccess.map(access => <article key={access.id}><Smartphone size={17} /><div><strong>{access.channel === 'qr' ? 'QR personnel' : access.channel === 'whatsapp' ? 'Lien WhatsApp' : 'Code SMS'}</strong><small>Expire à {new Date(access.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small></div><button onClick={() => { revokeSartalClientAccess(access.id); onMessage('Accès temporaire fermé.'); }}>Révoquer</button></article>)}{!activeAccess.length && <p>Aucun autre accès temporaire n’est actif.</p>}</div>
      <div className="sartal-low-data"><WifiOff size={19} /><span><strong>Mode réseau faible</strong><small>Allège les images et conserve les actions essentielles · {queuedOfflineActions.length} action(s) à synchroniser.</small></span><div><button className={customer.lowBandwidthMode ? 'active' : ''} onClick={() => { toggleLowBandwidthMode(customer.id, !customer.lowBandwidthMode); onMessage(!customer.lowBandwidthMode ? 'Mode léger activé.' : 'Mode complet réactivé.'); }}>{customer.lowBandwidthMode ? 'Activé' : 'Activer'}</button>{queuedOfflineActions.length > 0 && <button onClick={() => { const count = syncSartalOfflineActions(); onMessage(`${count} action(s) synchronisée(s).`); }}>Synchroniser</button>}</div></div>
      <button className="sartal-export-data" onClick={exportProfile}><Download size={16} /> Télécharger une copie de mes données</button>
    </div>}
  </section>;
};

export default SartalClientProfileCenter;
