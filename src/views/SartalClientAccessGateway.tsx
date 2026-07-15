import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  MessageCircle,
  Phone,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  UtensilsCrossed
} from 'lucide-react';
import type { StockState } from '../hooks/useStockState';

type ClientMode = 'restaurant' | 'delivery';

interface SartalClientAccessGatewayProps {
  state: StockState;
  mode: ClientMode;
  onAuthenticated: (customerId: string) => void;
}

export const SartalClientAccessGateway: React.FC<SartalClientAccessGatewayProps> = ({ state, mode, onAuthenticated }) => {
  const { db, findOrCreateSartalCustomer, createSartalGuestSession } = state;
  const params = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const tableNumber = params.get('table');
  const [step, setStep] = useState<'identity' | 'verification' | 'registration'>('identity');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+221 ');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const isRestaurant = mode === 'restaurant';
  const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
  const existingCustomer = db.sartalCustomers.find(item => item.phone.replace(/\D/g, '').slice(-9) === normalizedPhone && !item.guestSession);

  const sendCode = () => {
    if (normalizedPhone.length < 9) {
      setError('Saisissez un numéro de téléphone complet.');
      return;
    }
    const nextCode = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedCode(nextCode);
    setCode('');
    setError('');
    setStep('verification');
  };

  const verify = () => {
    if (code !== generatedCode) {
      setError('Le code saisi ne correspond pas au code reçu.');
      return;
    }
    if (existingCustomer) onAuthenticated(existingCustomer.id);
    else { setError(''); setStep('registration'); }
  };

  const createProfile = () => {
    if (fullName.trim().length < 2) {
      setError('Indiquez votre prénom et votre nom.');
      return;
    }
    try { onAuthenticated(findOrCreateSartalCustomer({ fullName, phone })); }
    catch (accessError) { setError(accessError instanceof Error ? accessError.message : 'Accès indisponible'); }
  };

  const continueAtTable = () => {
    const customerId = createSartalGuestSession(tableNumber ? `Client table ${tableNumber}` : 'Client restaurant');
    onAuthenticated(customerId);
  };

  return <main className={`client-access-gateway ${mode}`}>
    <section className="client-access-story">
      <img src={isRestaurant ? './sartal-client-restaurant.jpg' : './sartal-client-grocery.jpg'} alt={isRestaurant ? 'Table dressée au restaurant' : 'Produits disponibles pour la livraison'} />
      <div className="client-access-story-copy">
        <span>{isRestaurant ? <UtensilsCrossed size={17} /> : <ShoppingBag size={17} />}{isRestaurant ? 'RESTAURANT' : 'VENTE EN LIGNE'}</span>
        <h1>{isRestaurant ? (tableNumber ? `Bienvenue à la table ${tableNumber}` : 'Votre table, simplement') : 'Vos courses, sans mauvaise surprise'}</h1>
        <p>{isRestaurant ? 'Commandez, suivez la cuisine, échangez avec l’équipe et partagez l’addition depuis votre téléphone.' : 'Retrouvez le stock disponible, choisissez vos remplacements et suivez chaque étape de la livraison.'}</p>
        <div>
          <span><CheckCircle2 size={16} /> Aucun mot de passe à mémoriser</span>
          <span><CheckCircle2 size={16} /> Un seul profil pour tous les services</span>
          <span><CheckCircle2 size={16} /> Vos préférences restent sous votre contrôle</span>
        </div>
      </div>
    </section>

    <section className="client-access-panel">
      <header>
        <img src="./brand-mark.svg" alt="Sártal" />
        <div><span>MON SÁRTAL</span><strong>{isRestaurant ? 'Accéder à mon expérience restaurant' : 'Accéder à ma boutique'}</strong></div>
      </header>

      {step === 'identity' ? <div className="client-access-form">
        <div className="client-access-promise"><ShieldCheck size={20} /><span><strong>Reconnaissance par téléphone</strong><small>Nous retrouvons vos commandes et vos préférences sans exposer vos données.</small></span></div>
        <label>Numéro de téléphone<input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+221 77 000 00 00" /></label>
        {error && <p className="client-access-error">{error}</p>}
        <button className="client-access-primary" onClick={sendCode}><MessageCircle size={17} /> Recevoir mon code <ArrowRight size={17} /></button>
        {isRestaurant && tableNumber && <button className="client-access-guest" onClick={continueAtTable}><QrCode size={17} /> Consulter et commander sans créer de profil</button>}
        <small className="client-access-legal">En continuant, vous acceptez uniquement l’utilisation des données nécessaires au service. Les offres commerciales restent désactivées par défaut.</small>
      </div> : step === 'verification' ? <div className="client-access-form verification">
        <button className="client-access-back" onClick={() => { setStep('identity'); setError(''); }}><ArrowLeft size={16} /> Modifier le numéro</button>
        <div className="client-access-code-icon"><KeyRound size={25} /></div>
        <span>CODE ENVOYÉ</span>
        <h2>Vérifiez votre téléphone</h2>
        <p>Un code à 4 chiffres a été envoyé au <strong>{phone}</strong>.</p>
        <div className="client-access-demo-code"><span>Code reçu</span><strong>{generatedCode}</strong><small>Valable pendant 5 minutes</small></div>
        <label>Code de vérification<input autoFocus inputMode="numeric" maxLength={4} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" /></label>
        {error && <p className="client-access-error">{error}</p>}
        <button className="client-access-primary" disabled={code.length !== 4} onClick={verify}><Phone size={17} /> Ouvrir mon espace <ArrowRight size={17} /></button>
      </div> : <div className="client-access-form registration">
        <div className="client-access-code-icon"><CheckCircle2 size={25} /></div>
        <span>NUMÉRO VÉRIFIÉ</span>
        <h2>Comment devons-nous vous appeler ?</h2>
        <p>Cette information permet aux équipes de personnaliser le service. Les offres commerciales restent désactivées.</p>
        <label>Prénom et nom<input autoFocus autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Prénom et nom" /></label>
        {error && <p className="client-access-error">{error}</p>}
        <button className="client-access-primary" onClick={createProfile}><CheckCircle2 size={17} /> Créer mon espace <ArrowRight size={17} /></button>
      </div>}

      <footer><ShieldCheck size={15} /><span>Accès privé. Le personnel ne voit que les informations utiles au service.</span></footer>
    </section>
  </main>;
};

export default SartalClientAccessGateway;
