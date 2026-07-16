import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  KeyRound,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  UtensilsCrossed
} from 'lucide-react';
import type { StockState } from '../hooks/useStockState';
import type { PaymentType } from '../types';

interface RestaurantGuestPaymentPortalProps {
  state: StockState;
  inviteId: string;
}

const formatFCFA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value))} FCFA`;
const createOperationId = (inviteId: string) => `GUEST-PAY-${inviteId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const RestaurantGuestPaymentPortal: React.FC<RestaurantGuestPaymentPortalProps> = ({ state, inviteId }) => {
  const { db, joinRestaurantGuestInvite, payRestaurantGuestShare } = state;
  const invite = db.restaurantGuestInvites.find(item => item.id === inviteId);
  const order = db.restaurantGuestOrders.find(item => item.id === invite?.orderId);
  const restaurant = db.posList.find(item => item.id === order?.posId);
  const [method, setMethod] = useState<Extract<PaymentType, 'wave' | 'orange_money' | 'card'>>('wave');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const joinedRef = useRef(false);
  const pendingRef = useRef(false);
  const operationRef = useRef(createOperationId(inviteId));

  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    try { joinRestaurantGuestInvite(inviteId); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Invitation indisponible'); }
  }, [inviteId, joinRestaurantGuestInvite]);

  if (!invite || !order) return null;

  const expired = Boolean(invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now());

  const pay = () => {
    if (pendingRef.current || invite.status === 'paid' || expired) return;
    pendingRef.current = true;
    setPending(true);
    try {
      const accepted = payRestaurantGuestShare(invite.id, method, operationRef.current);
      setMessage(`Paiement confirmé · ${formatFCFA(accepted)} par ${method === 'wave' ? 'Wave' : method === 'orange_money' ? 'Orange Money' : 'carte'}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Paiement impossible');
    } finally {
      window.setTimeout(() => {
        pendingRef.current = false;
        setPending(false);
      }, 500);
    }
  };

  return <main className="restaurant-guest-payment-portal">
    <section className="restaurant-guest-payment-shell">
      <header>
        <img src="./brand-mark.svg" alt="Sártal" />
        <div><span>INVITATION PERSONNELLE</span><strong>{restaurant?.name || 'Restaurant'}</strong></div>
        <ShieldCheck size={22} />
      </header>

      {invite.status === 'paid' ? <section className="restaurant-guest-payment-success">
        <CheckCircle2 size={44} />
        <span>PAIEMENT CONFIRMÉ</span>
        <h1>Merci {invite.fullName.split(' ')[0]}</h1>
        <p>Votre part de l’addition a été enregistrée en temps réel sur la table {order.tableNumber || 'en cours'}.</p>
        <strong>{formatFCFA(invite.paidAmount || invite.shareAmount)}</strong>
        <div><ReceiptText size={18} /><span><b>Reçu envoyé</b><small>{invite.paymentMethod === 'wave' ? 'Wave' : invite.paymentMethod === 'orange_money' ? 'Orange Money' : 'Carte'} · référence {invite.paymentOperationId || invite.id}</small></span></div>
      </section> : expired ? <section className="restaurant-guest-payment-expired">
        <Clock3 size={38} />
        <h1>Ce lien a expiré</h1>
        <p>Demandez à l’hôte de la table de créer une nouvelle invitation. Aucun paiement n’a été effectué.</p>
      </section> : <>
        <section className="restaurant-guest-payment-intro">
          <span><UtensilsCrossed size={16} /> TABLE {order.tableNumber || 'EN COURS'}</span>
          <h1>{invite.fullName}, votre part est prête</h1>
          <p>Vous voyez uniquement le montant qui vous a été attribué. Le reste de l’addition et les données des autres convives restent privés.</p>
          <strong>{formatFCFA(invite.shareAmount)}</strong>
          <small><KeyRound size={14} /> Accès {invite.accessCode} · valable jusqu’à {invite.expiresAt ? new Date(invite.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'la fin du service'}</small>
        </section>

        <section className="restaurant-guest-privacy-note">
          <ShieldCheck size={19} />
          <span><strong>Part personnelle uniquement</strong><small>Les articles, les autres convives et leurs règlements ne sont jamais affichés depuis ce lien.</small></span>
        </section>

        <section className="restaurant-guest-payment-methods">
          <h2>Choisir mon moyen de paiement</h2>
          <button className={method === 'wave' ? 'active' : ''} onClick={() => setMethod('wave')}><Smartphone size={19} /><span><strong>Wave</strong><small>Validation sécurisée sur votre téléphone</small></span></button>
          <button className={method === 'orange_money' ? 'active' : ''} onClick={() => setMethod('orange_money')}><Smartphone size={19} /><span><strong>Orange Money</strong><small>Confirmation avec votre compte mobile</small></span></button>
          <button className={method === 'card' ? 'active' : ''} onClick={() => setMethod('card')}><CreditCard size={19} /><span><strong>Carte bancaire</strong><small>Paiement chiffré et reçu immédiat</small></span></button>
          <button className="restaurant-guest-pay-button" disabled={pending} onClick={pay}>{pending ? 'Confirmation en cours…' : `Payer ${formatFCFA(invite.shareAmount)}`}</button>
          <small><ShieldCheck size={14} /> Un double appui ne peut pas créer un second paiement.</small>
        </section>
      </>}

      {message && <div className="restaurant-guest-payment-message">{message}</div>}
      <footer>{db.sartalBrandSettings.establishmentName} · assistance {db.sartalBrandSettings.supportPhone}</footer>
    </section>
  </main>;
};

export default RestaurantGuestPaymentPortal;
