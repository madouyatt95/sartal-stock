import React, { useMemo, useState } from 'react';
import { BedDouble, CheckCircle, Package, PlayCircle, ReceiptText, RefreshCcw, Warehouse } from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { StockMovement } from '../types';

interface BehaviorSimulationProps {
  state: StockState;
  setView: (view: string) => void;
}

interface SimulationResult {
  success: boolean;
  error?: string;
  reference: string;
  movements: StockMovement[];
  beforeQty: number;
  afterQty: number;
  posName: string;
  warehouseName: string;
  salePrice: number;
  folioLabel?: string;
}

export const BehaviorSimulation: React.FC<BehaviorSimulationProps> = ({ state, setView }) => {
  const { db, processSale, resetAllData } = state;
  const coca = db.products.find(product => product.id === 'prod-coca');
  const demoPOS = db.posList.filter(pos => ['pos-1', 'pos-2', 'pos-3'].includes(pos.id));
  const [selectedPosId, setSelectedPosId] = useState(demoPOS[0]?.id || '');
  const [quantity, setQuantity] = useState(2);
  const [paymentType, setPaymentType] = useState<'card' | 'room_charge'>('card');
  const [selectedFolioId, setSelectedFolioId] = useState(db.pmsFolios.find(folio => folio.status === 'open')?.id || '');
  const [result, setResult] = useState<SimulationResult | null>(null);

  const selectedPOS = db.posList.find(pos => pos.id === selectedPosId);
  const selectedWarehouse = db.warehouses.find(warehouse => warehouse.id === selectedPOS?.defaultWarehouseId);
  const selectedPricing = db.posPricing.find(pricing => pricing.productId === coca?.id && pricing.posId === selectedPOS?.id);
  const selectedStock = db.stocks.find(stock => stock.productId === coca?.id && stock.warehouseId === selectedWarehouse?.id);
  const openFolios = db.pmsFolios.filter(folio => folio.status === 'open');
  const selectedFolio = db.pmsFolios.find(folio => folio.id === selectedFolioId);
  const selectedRoom = db.pmsRooms.find(room => room.id === selectedFolio?.roomId);

  const posCards = useMemo(() => {
    return demoPOS.map(pos => {
      const warehouse = db.warehouses.find(item => item.id === pos.defaultWarehouseId);
      const pricing = db.posPricing.find(item => item.productId === coca?.id && item.posId === pos.id);
      const stock = db.stocks.find(item => item.productId === coca?.id && item.warehouseId === warehouse?.id);
      return { pos, warehouse, pricing, stock };
    });
  }, [coca?.id, db.posPricing, db.stocks, db.warehouses, demoPOS]);

  const formatFCFA = (val: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA')
  );

  const formatQty = (val: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(val);

  const runSimulation = () => {
    if (!coca || !selectedPOS || !selectedWarehouse || !selectedPricing || !selectedStock) return;
    if (paymentType === 'room_charge' && !selectedFolio) return;

    const reference = `SIM-${Date.now().toString().slice(-6)}`;
    const beforeQty = selectedStock.quantityAvailable;
    const saleAmount = selectedPricing.salePrice * quantity;
    const saleResult = processSale({
      externalSaleId: reference,
      siteId: selectedPOS.siteId,
      posId: selectedPOS.id,
      items: [{ productId: coca.id, quantity }],
      paymentContext: {
        type: paymentType,
        roomNumber: paymentType === 'room_charge' ? selectedRoom?.roomNumber : undefined,
        folioId: paymentType === 'room_charge' ? selectedFolioId : undefined,
        amount: saleAmount
      }
    });

    const freshStock = saleResult.success
      ? selectedStock.quantityAvailable - quantity
      : selectedStock.quantityAvailable;

    setResult({
      success: saleResult.success,
      error: saleResult.error,
      reference,
      movements: saleResult.movements,
      beforeQty,
      afterQty: freshStock,
      posName: selectedPOS.name,
      warehouseName: selectedWarehouse.name,
      salePrice: selectedPricing.salePrice,
      folioLabel: paymentType === 'room_charge' && selectedFolio && selectedRoom
        ? `Chambre ${selectedRoom.roomNumber} - ${selectedFolio.guestName}`
        : undefined
    });
  };

  const total = (selectedPricing?.salePrice || 0) * quantity;

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Simulation multi-POS</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Même Coca 33 cl, prix différent selon le point de vente, sortie automatique du dépôt associé et option d'imputation chambre.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => setView('stock-control')}>
          Voir stock réel
        </button>
      </div>

      <div className="grid-3">
        {posCards.map(card => {
          const isActive = card.pos.id === selectedPosId;
          return (
            <button
              key={card.pos.id}
              className="card"
              onClick={() => {
                setSelectedPosId(card.pos.id);
                setResult(null);
              }}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: isActive ? 'var(--primary)' : 'var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                <strong>{card.pos.name}</strong>
                {isActive && <CheckCircle size={18} color="var(--primary)" />}
              </div>
              <span className="badge badge-blue">{formatFCFA(card.pricing?.salePrice || 0)} / Coca</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                Sortie stock : <strong>{card.warehouse?.name}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Disponible : {formatQty(card.stock?.quantityAvailable || 0)} {coca?.baseUnit}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ReceiptText size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Ticket simulé</h3>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Quantité vendue</label>
            <input
              className="form-control"
              type="number"
              min="1"
              max="24"
              value={quantity}
              onChange={(event) => {
                setQuantity(Math.max(1, Number(event.target.value) || 1));
                setResult(null);
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Paiement</label>
            <select
              className="form-control"
              value={paymentType}
              onChange={(event) => {
                setPaymentType(event.target.value as 'card' | 'room_charge');
                setResult(null);
              }}
            >
              <option value="card">Carte / caisse</option>
              <option value="room_charge">Imputer sur chambre PMS</option>
            </select>
          </div>

          {paymentType === 'room_charge' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Folio chambre</label>
              <select className="form-control" value={selectedFolioId} onChange={(event) => setSelectedFolioId(event.target.value)}>
                {openFolios.map(folio => {
                  const room = db.pmsRooms.find(item => item.id === folio.roomId);
                  return (
                    <option key={folio.id} value={folio.id}>
                      Chambre {room?.roomNumber} - {folio.guestName}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-lightest)', display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span>Produit</span>
              <strong>{coca?.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span>Prix appliqué</span>
              <strong>{formatFCFA(selectedPricing?.salePrice || 0)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span>Total ticket</span>
              <strong>{formatFCFA(total)}</strong>
            </div>
          </div>

          <button className="btn btn-primary" onClick={runSimulation}>
            <PlayCircle size={18} /> Simuler la vente
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              resetAllData();
              setResult(null);
            }}
          >
            <RefreshCcw size={18} /> Réinitialiser la démo
          </button>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Ce que la simulation prouve</h3>
          </div>
          {[
            'Le prix vient du point de vente sélectionné.',
            'Le dépôt de sortie vient du paramétrage du POS.',
            'Le produit reste unique dans le référentiel.',
            'La vente crée un mouvement stock traçable.',
            'Une consommation peut être imputée sur une chambre PMS.'
          ].map(item => (
            <div key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle size={18} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {result && (
        <div className="card" style={{ borderColor: result.success ? 'var(--success)' : 'var(--danger)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {result.success ? 'Résultat de la vente simulée' : 'Simulation rejetée'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Référence {result.reference}</p>
            </div>
            <span className={`badge ${result.success ? 'badge-green' : 'badge-red'}`}>
              {result.success ? 'Stock déduit' : 'À corriger'}
            </span>
          </div>

          {result.success ? (
            <>
              <div className="grid-3">
                <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                  <Warehouse size={18} color="var(--primary)" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '8px' }}>Dépôt impacté</p>
                  <strong>{result.warehouseName}</strong>
                </div>
                <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                  <Package size={18} color="var(--primary)" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '8px' }}>Stock Coca</p>
                  <strong>{formatQty(result.beforeQty)} → {formatQty(result.afterQty)}</strong>
                </div>
                <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                  <ReceiptText size={18} color="var(--primary)" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '8px' }}>Prix POS</p>
                  <strong>{formatFCFA(result.salePrice)}</strong>
                </div>
              </div>

              {result.folioLabel && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                  <BedDouble size={18} />
                  <strong>Imputation PMS créée : {result.folioLabel}</strong>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Mouvements générés</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {result.movements.map(movement => (
                    <div key={movement.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
                      <span>{movement.reason}</span>
                      <strong style={{ color: 'var(--danger)' }}>{formatQty(movement.quantity)} {movement.unit}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--danger)', fontWeight: 700 }}>{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BehaviorSimulation;
