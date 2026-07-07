import React, { useMemo, useState } from 'react';
import { ArrowRight, BedDouble, CheckCircle, Package, PlayCircle, ReceiptText, RefreshCcw, Warehouse } from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { PAYMENT_TYPE_LABELS, PaymentType, StockMovement } from '../types';

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
  quantity: number;
  salePrice: number;
  totalAmount: number;
  paymentLabel: string;
  folioLabel?: string;
}

interface DemoScenario {
  id: string;
  title: string;
  posId: string;
  quantity: number;
  paymentType: PaymentType;
  story: string;
}

export const BehaviorSimulation: React.FC<BehaviorSimulationProps> = ({ state, setView }) => {
  const { db, processSale, resetAllData } = state;
  const coca = db.products.find(product => product.id === 'prod-coca');
  const demoPOS = db.posList.filter(pos => ['pos-1', 'pos-2', 'pos-3'].includes(pos.id));
  const demoScenarios: DemoScenario[] = [
    {
      id: 'restaurant',
      title: 'Vente au restaurant',
      posId: 'pos-1',
      quantity: 2,
      paymentType: 'orange_money',
      story: 'Le serveur vend 2 Coca à une table, réglés en Orange Money. Le prix restaurant s’applique et le dépôt restaurant est décrémenté.'
    },
    {
      id: 'bar',
      title: 'Vente au bar casino',
      posId: 'pos-2',
      quantity: 2,
      paymentType: 'wave',
      story: 'Le barman vend le même Coca plus cher, payé par Wave. Le dépôt bar casino est impacté, pas celui du restaurant.'
    },
    {
      id: 'nightclub',
      title: 'Vente au night-club',
      posId: 'pos-3',
      quantity: 2,
      paymentType: 'room_charge',
      story: 'Le night-club vend le même produit avec son prix et sa TVA, puis impute la consommation sur chambre.'
    }
  ];
  const [selectedPosId, setSelectedPosId] = useState(demoPOS[0]?.id || '');
  const [quantity, setQuantity] = useState(2);
  const [paymentType, setPaymentType] = useState<PaymentType>('orange_money');
  const [selectedFolioId, setSelectedFolioId] = useState(db.pmsFolios.find(folio => folio.status === 'open')?.id || '');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [scenarioResults, setScenarioResults] = useState<SimulationResult[]>([]);

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
      quantity,
      salePrice: selectedPricing.salePrice,
      totalAmount: saleAmount,
      paymentLabel: PAYMENT_TYPE_LABELS[paymentType],
      folioLabel: paymentType === 'room_charge' && selectedFolio && selectedRoom
        ? `Chambre ${selectedRoom.roomNumber} - ${selectedFolio.guestName}`
        : undefined
    });
    setScenarioResults([]);
  };

  const runScenarioTour = () => {
    if (!coca) return;
    if (!selectedFolio && demoScenarios.some(scenario => scenario.paymentType === 'room_charge')) return;

    const stockDeductions: Record<string, number> = {};
    const results: SimulationResult[] = [];

    demoScenarios.forEach((scenario, index) => {
      const pos = db.posList.find(item => item.id === scenario.posId);
      const pricing = db.posPricing.find(item => item.productId === coca.id && item.posId === scenario.posId);
      const warehouse = db.warehouses.find(item => item.id === (pricing?.defaultWarehouseId || pos?.defaultWarehouseId));
      const stock = db.stocks.find(item => item.productId === coca.id && item.warehouseId === warehouse?.id);
      if (!pos || !pricing || !warehouse || !stock) return;

      const reference = `TOUR-${Date.now().toString().slice(-6)}-${index + 1}`;
      const previousDeduction = stockDeductions[warehouse.id] || 0;
      const beforeQty = stock.quantityAvailable - previousDeduction;
      const saleAmount = pricing.salePrice * scenario.quantity;
      const saleResult = processSale({
        externalSaleId: reference,
        siteId: pos.siteId,
        posId: pos.id,
        items: [{ productId: coca.id, quantity: scenario.quantity }],
        paymentContext: {
          type: scenario.paymentType,
          roomNumber: scenario.paymentType === 'room_charge' ? selectedRoom?.roomNumber : undefined,
          folioId: scenario.paymentType === 'room_charge' ? selectedFolioId : undefined,
          amount: saleAmount
        }
      });

      if (saleResult.success) {
        stockDeductions[warehouse.id] = previousDeduction + scenario.quantity;
      }

      results.push({
        success: saleResult.success,
        error: saleResult.error,
        reference,
        movements: saleResult.movements,
        beforeQty,
        afterQty: saleResult.success ? beforeQty - scenario.quantity : beforeQty,
        posName: pos.name,
        warehouseName: warehouse.name,
        quantity: scenario.quantity,
        salePrice: pricing.salePrice,
        totalAmount: saleAmount,
        paymentLabel: PAYMENT_TYPE_LABELS[scenario.paymentType],
        folioLabel: scenario.paymentType === 'room_charge' && selectedFolio && selectedRoom
          ? `Chambre ${selectedRoom.roomNumber} - ${selectedFolio.guestName}`
          : undefined
      });
    });

    setScenarioResults(results);
    setResult(results[results.length - 1] || null);
  };

  const total = (selectedPricing?.salePrice || 0) * quantity;

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Démo multi-POS</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Scénario de vente contrôlé : même produit, prix par point de vente, dépôt de sortie automatique et imputation chambre.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setView('pricing')}>
            Prix par canal
          </button>
          <button className="btn btn-primary" onClick={() => setView('stock-control')}>
            Voir stock réel
          </button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Produit référentiel</p>
          <h2 style={{ marginTop: '8px', fontSize: '1.25rem' }}>{coca?.name}</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Prix actifs</p>
          <h2 style={{ marginTop: '8px', fontSize: '1.25rem' }}>{posCards.length} points de vente</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Dépôts isolés</p>
          <h2 style={{ marginTop: '8px', fontSize: '1.25rem' }}>{new Set(posCards.map(card => card.warehouse?.id)).size} stocks séparés</h2>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Parcours de présentation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Choisis une étape ou lance les trois ventes à la suite.</p>
          </div>
          <button className="btn btn-secondary" onClick={runScenarioTour}>
            Simuler les 3 ventes <ArrowRight size={17} />
          </button>
        </div>
        <div className="grid-3">
        {demoScenarios.map(scenario => {
          const card = posCards.find(item => item.pos.id === scenario.posId);
          if (!card) return null;
          const isActive = card.pos.id === selectedPosId;
          return (
            <button
              key={scenario.id}
              className="card"
              onClick={() => {
                setSelectedPosId(card.pos.id);
                setQuantity(scenario.quantity);
                setPaymentType(scenario.paymentType);
                setResult(null);
                setScenarioResults([]);
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
                <strong>{scenario.title}</strong>
                {isActive && <CheckCircle size={18} color="var(--primary)" />}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.45 }}>{scenario.story}</p>
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
                setScenarioResults([]);
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Paiement</label>
            <select
	              className="form-control"
	              value={paymentType}
	              onChange={(event) => {
	                setPaymentType(event.target.value as PaymentType);
	                setResult(null);
	                setScenarioResults([]);
	              }}
	            >
	              <option value="orange_money">Orange Money</option>
	              <option value="wave">Wave</option>
	              <option value="card">Carte bancaire</option>
	              <option value="cash">Espèces</option>
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
              setScenarioResults([]);
            }}
          >
            <RefreshCcw size={18} /> Réinitialiser la démo
          </button>
        </div>

        <div className="card proof-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Package size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Résultat attendu</h3>
          </div>
          {[
            ['Prix', 'Prix appliqué selon le point de vente'],
            ['Dépôt', 'Sortie stock sur le dépôt associé'],
            ['Produit', 'Référentiel unique Coca-Cola 33 cl'],
            ['Traçabilité', 'Chaque sortie reste consultable'],
            ['PMS', 'Imputation chambre possible']
          ].map(item => (
            <div key={item[0]} className="proof-row">
              <CheckCircle size={16} color="var(--success)" style={{ flexShrink: 0 }} />
              <strong>{item[0]}</strong>
              <span>{item[1]}</span>
            </div>
          ))}
        </div>
      </div>

      {scenarioResults.length > 1 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Impact des 3 ventes simulées</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Chaque vente touche son propre dépôt, même si le produit catalogue reste identique.</p>
          </div>
          <div className="grid-3">
            {scenarioResults.map(item => (
              <div key={item.reference} style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', display: 'grid', gap: '8px' }}>
                <strong>{item.posName}</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{item.warehouseName}</span>
                <span className={`badge ${item.success ? 'badge-green' : 'badge-red'}`}>{item.success ? 'Stock déduit' : 'Rejetée'}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span>Stock Coca</span>
                  <strong>{formatQty(item.beforeQty)} → {formatQty(item.afterQty)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span>{item.quantity} × {formatFCFA(item.salePrice)}</span>
                  <strong>{formatFCFA(item.totalAmount)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div className="grid-4">
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
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '8px' }}>Total vente</p>
                  <strong>{result.quantity} × {formatFCFA(result.salePrice)} = {formatFCFA(result.totalAmount)}</strong>
                </div>
                <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                  <ReceiptText size={18} color="var(--primary)" />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '8px' }}>Paiement</p>
                  <strong>{result.paymentLabel}</strong>
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
