import React, { useMemo, useState } from 'react';
import { StockState } from '../hooks/useStockState';
import {
  Banknote,
  BedDouble,
  Calculator,
  CheckCircle,
  CreditCard,
  FileSpreadsheet,
  LockKeyhole,
  Minus,
  Network,
  Plus,
  RefreshCcw,
  ReceiptText,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  UnlockKeyhole
} from 'lucide-react';
import { PAYMENT_TYPE_LABELS, PaymentType, StockMovement } from '../types';

interface ConnectorsProps {
  state: StockState;
}

interface CartLine {
  productId: string;
  quantity: number;
}

interface SaleResult {
  success: boolean;
  error?: string;
  movements: StockMovement[];
  reference?: string;
}

export const Connectors: React.FC<ConnectorsProps> = ({ state }) => {
  const { db, processSale, togglePMSExport, openCashSession, closeCashSession } = state;

  const defaultPosId = db.currentUser.posId || db.posList[0]?.id || '';
  const [selectedPosId, setSelectedPosId] = useState(defaultPosId);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [selectedFolioId, setSelectedFolioId] = useState('');
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
  const [openingFloat, setOpeningFloat] = useState(50000);
  const [closingCashDeclared, setClosingCashDeclared] = useState(0);
  const [closingNotes, setClosingNotes] = useState('');

  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'pms' | 'sessions'>('pos');

  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA');
  };

  const selectedPOS = db.posList.find(p => p.id === selectedPosId);
  const targetWarehouse = db.warehouses.find(w => w.id === selectedPOS?.defaultWarehouseId);
  const activeSession = db.cashSessions.find(session => session.posId === selectedPosId && session.status === 'open');
  const activeFolios = db.pmsFolios.filter(folio => folio.status === 'open');
  const selectedFolio = db.pmsFolios.find(folio => folio.id === selectedFolioId);
  const selectedFolioRoom = db.pmsRooms.find(room => room.id === selectedFolio?.roomId);
  const selectedPOSSessions = db.cashSessions
    .filter(session => session.posId === selectedPosId)
    .slice()
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  const paymentOptions: Array<{ value: PaymentType; label: string; icon: React.ReactNode }> = [
    { value: 'cash', label: 'Espèces', icon: <Banknote size={16} /> },
    { value: 'card', label: 'Carte', icon: <CreditCard size={16} /> },
    { value: 'wave', label: 'Wave', icon: <Network size={16} /> },
    { value: 'orange_money', label: 'Orange Money', icon: <Network size={16} /> },
    { value: 'room_charge', label: 'Chambre', icon: <BedDouble size={16} /> },
    { value: 'other', label: 'Autre', icon: <Network size={16} /> }
  ];
  const paymentBreakdown = activeSession
    ? paymentOptions.map(option => ({
      ...option,
      amount: activeSession.paymentTotals[option.value] || 0
    })).filter(option => option.amount > 0 || ['wave', 'orange_money'].includes(option.value))
    : [];

  const availableProducts = useMemo(() => {
    return db.products
      .filter(product => product.isActive)
      .map(product => {
        const pricing = db.posPricing.find(p => p.productId === product.id && p.posId === selectedPosId && p.isAvailable);
        return { product, pricing };
      })
      .filter(item => item.pricing);
  }, [db.posPricing, db.products, selectedPosId]);

  const categories = useMemo(() => {
    return Array.from(new Set(availableProducts.map(item => item.product.category))).sort();
  }, [availableProducts]);

  const displayedProducts = availableProducts.filter(item => {
    return selectedCategory === 'all' || item.product.category === selectedCategory;
  });

  const cartDetails = cart.map(line => {
    const product = db.products.find(p => p.id === line.productId);
    const pricing = db.posPricing.find(p => p.productId === line.productId && p.posId === selectedPosId);
    return {
      ...line,
      product,
      pricing,
      lineTotal: (pricing?.salePrice || 0) * line.quantity
    };
  });

  const subtotal = cartDetails.reduce((sum, line) => sum + line.lineTotal, 0);
  const totalTax = cartDetails.reduce((sum, line) => {
    const taxRate = line.pricing?.taxRate || 0;
    return sum + (line.lineTotal * taxRate) / (100 + taxRate);
  }, 0);

  const addToCart = (productId: string) => {
    setSaleResult(null);
    setCart(current => {
      const existingLine = current.find(line => line.productId === productId);
      if (existingLine) {
        return current.map(line => (
          line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line
        ));
      }
      return [...current, { productId, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    setSaleResult(null);
    if (quantity <= 0) {
      setCart(current => current.filter(line => line.productId !== productId));
      return;
    }
    setCart(current => current.map(line => (
      line.productId === productId ? { ...line, quantity } : line
    )));
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOS || cart.length === 0) return;
    if (!activeSession) return;
    if (paymentType === 'room_charge' && !selectedFolio) return;

    const saleReference = `POS-${Date.now().toString().slice(-6)}`;
    const result = processSale({
      externalSaleId: saleReference,
      siteId: selectedPOS.siteId,
      posId: selectedPOS.id,
      items: cart.map(line => ({ productId: line.productId, quantity: line.quantity })),
      paymentContext: {
        type: paymentType,
        roomNumber: paymentType === 'room_charge' ? selectedFolioRoom?.roomNumber : undefined,
        folioId: paymentType === 'room_charge' ? selectedFolioId : undefined,
        amount: subtotal
      }
    });

    setSaleResult({ ...result, reference: saleReference });

    if (result.success) {
      setCart([]);
      setSelectedFolioId('');
    }
  };

  const handlePOSChange = (posId: string) => {
    setSelectedPosId(posId);
    setSelectedCategory('all');
    setCart([]);
    setSaleResult(null);
  };

  const roomChargeSales = db.externalSales.filter(s => s.paymentContext.type === 'room_charge');
  const pmsCharges = db.pmsFolios.flatMap(folio => (
    folio.charges.map(charge => {
      const room = db.pmsRooms.find(r => r.id === folio.roomId);
      return { folio, charge, room };
    })
  ));

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOS) return;
    try {
      openCashSession(selectedPOS.id, openingFloat);
      setOpeningFloat(50000);
    } catch (err: any) {
      alert(err.message || "Impossible d'ouvrir la session");
    }
  };

  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    try {
      closeCashSession(activeSession.id, closingCashDeclared, closingNotes);
      setClosingCashDeclared(0);
      setClosingNotes('');
    } catch (err: any) {
      alert(err.message || "Impossible de clôturer la session");
    }
  };

  const handleExportPMSCSV = () => {
    if (roomChargeSales.length === 0) {
      alert("Aucune consommation chambre disponible pour l'export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Vente;Date;Point de Vente;Chambre;Client;Montant (FCFA);PMS Status\n";

    roomChargeSales.forEach(sale => {
      const pos = db.posList.find(p => p.id === sale.posId);
      const folio = db.pmsFolios.find(f => f.id === sale.paymentContext.folioId);
      const date = new Date(sale.date).toLocaleDateString();
      csvContent += `${sale.externalSaleId};${date};${pos?.name};${sale.paymentContext.roomNumber};${folio?.guestName || ''};${sale.paymentContext.amount};${sale.exportedToPms ? 'Exported' : 'Pending'}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sartal_pms_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Caisse POS & Connexion PMS</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Encaissez les ventes par point de vente, déduisez le stock du dépôt lié au POS et imputez les consommations sur chambre.
        </p>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setActiveSubTab('pos'); setSaleResult(null); }}
          style={{ padding: '12px 6px', fontSize: '0.95rem', fontWeight: 700, border: 'none', background: 'none', borderBottom: activeSubTab === 'pos' ? '3px solid var(--primary)' : 'none', color: activeSubTab === 'pos' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Caisse POS
        </button>
        <button
          onClick={() => setActiveSubTab('sessions')}
          style={{ padding: '12px 6px', fontSize: '0.95rem', fontWeight: 700, border: 'none', background: 'none', borderBottom: activeSubTab === 'sessions' ? '3px solid var(--primary)' : 'none', color: activeSubTab === 'sessions' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Sessions X/Z
        </button>
        <button
          onClick={() => setActiveSubTab('pms')}
          style={{ padding: '12px 6px', fontSize: '0.95rem', fontWeight: 700, border: 'none', background: 'none', borderBottom: activeSubTab === 'pms' ? '3px solid var(--primary)' : 'none', color: activeSubTab === 'pms' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Imputations Chambre (PMS)
        </button>
      </div>

      {activeSubTab === 'pos' && (
        <div className="pos-workspace">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            <div className="card" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', padding: '16px' }}>
              <div className="form-group" style={{ minWidth: '260px', flex: 1, marginBottom: 0 }}>
                <label className="form-label">Point de vente actif</label>
                <select
                  value={selectedPosId}
                  onChange={(e) => handlePOSChange(e.target.value)}
                  className="form-control"
                >
                  {db.posList.map(pos => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge badge-blue">{selectedPOS?.type.replace('_', ' ')}</span>
                <span className="badge badge-info">Dépôt: {targetWarehouse?.name || 'Non configuré'}</span>
                <span className="badge badge-green">{availableProducts.length} articles tarifés</span>
                <span className={`badge ${activeSession ? 'badge-green' : 'badge-red'}`}>
                  {activeSession ? `Session ${activeSession.id}` : 'Caisse fermée'}
                </span>
              </div>
            </div>

            {!activeSession && (
              <div className="card" style={{ borderColor: 'var(--warning)', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
                  <LockKeyhole size={20} />
                  Ouvrez une session de caisse avant d'encaisser sur {selectedPOS?.name}.
                </div>
                <button className="btn btn-secondary" onClick={() => setActiveSubTab('sessions')}>
                  Ouvrir la caisse
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={selectedCategory === 'all' ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setSelectedCategory('all')}
              >
                Tous
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  className={selectedCategory === category ? 'btn btn-primary' : 'btn btn-secondary'}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="grid-3">
              {displayedProducts.map(({ product, pricing }) => {
                const stockWarehouseId = pricing?.defaultWarehouseId || selectedPOS?.defaultWarehouseId;
                const stock = db.stocks.find(s => s.productId === product.id && s.warehouseId === stockWarehouseId);
                const recipe = db.recipes.find(r => r.productId === product.id);

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product.id)}
                    className="card"
                    style={{ textAlign: 'left', cursor: 'pointer', borderColor: 'var(--border-color)', minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'start' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1.3 }}>{product.name}</h3>
                        <Plus size={18} color="var(--primary)" />
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '6px' }}>
                        {product.sku} • {recipe ? 'Recette détaillée' : product.baseUnit}
                      </p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '10px' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{formatFCFA(pricing?.salePrice || 0)}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'right' }}>
                        {recipe ? `${recipe.ingredients.length} ingrédients` : `Stock: ${stock?.quantityAvailable || 0}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {displayedProducts.length === 0 && (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                Aucun article tarifé pour ce point de vente.
              </div>
            )}
          </div>

          <form onSubmit={handleCheckout} className="card" style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingCart size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Ticket en cours</h3>
              </div>
              <span className="badge badge-blue">{cart.length} lignes</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '150px' }}>
              {cartDetails.map(line => (
                <div key={line.productId} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{line.product?.name}</strong>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{formatFCFA(line.pricing?.salePrice || 0)} / unité</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(line.productId, 0)}
                      style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => updateCartQuantity(line.productId, line.quantity - 1)}>
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateCartQuantity(line.productId, parseInt(e.target.value) || 1)}
                        className="form-control"
                        style={{ width: '70px', textAlign: 'center' }}
                      />
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => updateCartQuantity(line.productId, line.quantity + 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <strong>{formatFCFA(line.lineTotal)}</strong>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.875rem' }}>Ajoutez des articles depuis la grille.</p>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <span>TVA incluse estimée</span>
                <strong>{formatFCFA(totalTax)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800 }}>
                <span>Total</span>
                <span>{formatFCFA(subtotal)}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mode de paiement</label>
              <div className="grid-2" style={{ gap: '8px' }}>
                {paymentOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setPaymentType(option.value as PaymentType);
                      if (option.value !== 'room_charge') setSelectedFolioId('');
                    }}
                    className={paymentType === option.value ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '9px 10px' }}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>
            </div>

            {paymentType === 'room_charge' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Folio PMS ouvert</label>
                <select
                  value={selectedFolioId}
                  onChange={(e) => setSelectedFolioId(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="">Sélectionner une chambre...</option>
                  {activeFolios.map(folio => {
                    const room = db.pmsRooms.find(r => r.id === folio.roomId);
                    return (
                      <option key={folio.id} value={folio.id}>
                        Chambre {room?.roomNumber} - {folio.guestName} ({folio.reservationNumber})
                      </option>
                    );
                  })}
                </select>
                {selectedFolio && (
                  <div style={{ marginTop: '8px', padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--info-light)', color: 'var(--info)', fontSize: '0.8rem', fontWeight: 700 }}>
                    Folio {selectedFolio.reservationNumber} • Départ {new Date(selectedFolio.departureDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={cart.length === 0 || !activeSession || (paymentType === 'room_charge' && !selectedFolio)} style={{ width: '100%', padding: '13px 16px' }}>
              Encaisser et déduire le stock
            </button>

            {saleResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {saleResult.success ? (
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-light)', color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={18} />
                      Ticket {saleResult.reference} validé.
                    </div>
                    <p style={{ marginTop: '6px', fontWeight: 500 }}>
                      {saleResult.movements.length} sortie(s) de stock enregistrée(s).
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 700, fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldAlert size={18} />
                      Vente refusée
                    </div>
                    <p style={{ marginTop: '6px', fontWeight: 500 }}>{saleResult.error}</p>
                  </div>
                )}

                {saleResult.movements.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '170px', overflowY: 'auto' }}>
                    {saleResult.movements.map((movement, idx) => {
                      const prod = db.products.find(p => p.id === movement.productId);
                      const wh = db.warehouses.find(w => w.id === movement.warehouseId);
                      const batch = db.batches.find(b => b.id === movement.batchId);
                      return (
                        <div key={`${movement.id}-${idx}`} style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', backgroundColor: 'var(--bg-app)' }}>
                          <strong style={{ color: 'var(--danger)' }}>{movement.quantity} {movement.unit}</strong> {prod?.name}
                          <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{wh?.name} • Lot {batch?.batchNumber}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button type="button" className="btn btn-secondary" onClick={() => setSaleResult(null)} style={{ gap: '6px' }}>
                  <RefreshCcw size={16} /> Masquer le résultat
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {activeSubTab === 'sessions' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', padding: '16px' }}>
              <div className="form-group" style={{ minWidth: '260px', flex: 1, marginBottom: 0 }}>
                <label className="form-label">Point de vente</label>
                <select
                  value={selectedPosId}
                  onChange={(e) => handlePOSChange(e.target.value)}
                  className="form-control"
                >
                  {db.posList.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.name}</option>
                  ))}
                </select>
              </div>
              <span className={`badge ${activeSession ? 'badge-green' : 'badge-red'}`}>
                {activeSession ? 'Session ouverte' : 'Aucune session ouverte'}
              </span>
            </div>

            {!activeSession ? (
              <form onSubmit={handleOpenSession} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UnlockKeyhole size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Ouverture de caisse</h3>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fond de caisse initial</label>
                  <input
                    type="number"
                    min="0"
                    value={openingFloat || ''}
                    onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                    className="form-control"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Ouvrir la session
                </button>
              </form>
            ) : (
              <form onSubmit={handleCloseSession} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calculator size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Clôture X/Z</h3>
                </div>

                <div className="grid-2">
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Session</p>
                    <strong>{activeSession.id}</strong>
                  </div>
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Ouverte par</p>
                    <strong>{activeSession.userName}</strong>
                  </div>
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Ventes totales</p>
                    <strong>{formatFCFA(activeSession.totalSales)}</strong>
                  </div>
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Espèces attendues</p>
                    <strong>{formatFCFA(activeSession.openingFloat + activeSession.paymentTotals.cash)}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '8px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>Répartition encaissements</p>
                  <div className="grid-2">
                    {paymentBreakdown.map(item => (
                      <div key={item.value} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: item.value === 'wave' || item.value === 'orange_money' ? 'var(--info-light)' : 'var(--bg-app)', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>{PAYMENT_TYPE_LABELS[item.value]}</span>
                        <strong>{formatFCFA(item.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Espèces comptées</label>
                    <input
                      type="number"
                      min="0"
                      value={closingCashDeclared || ''}
                      onChange={(e) => setClosingCashDeclared(parseFloat(e.target.value) || 0)}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Note de clôture</label>
                    <input
                      type="text"
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      className="form-control"
                      placeholder="Ex: RAS"
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-danger">
                  Clôturer et générer le Z
                </button>
              </form>
            )}
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ReceiptText size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Historique X/Z</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Statut</th>
                    <th>Total</th>
                    <th>Moyens</th>
                    <th>Écart cash</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPOSSessions.map(session => {
                    const sessionPaymentMix = paymentOptions
                      .map(option => ({ ...option, amount: session.paymentTotals[option.value] || 0 }))
                      .filter(option => option.amount > 0);

                    return (
                      <tr key={session.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong>{session.zReportNumber || session.id}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                              {new Date(session.openedAt).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${session.status === 'open' ? 'badge-green' : 'badge-blue'}`}>
                            {session.status === 'open' ? 'Ouverte' : 'Clôturée'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatFCFA(session.totalSales)}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '145px' }}>
                            {sessionPaymentMix.length > 0 ? sessionPaymentMix.map(item => (
                              <span key={item.value} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>{PAYMENT_TYPE_LABELS[item.value]}</strong> {formatFCFA(item.amount)}
                              </span>
                            )) : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Aucun encaissement</span>}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: (session.cashDifference || 0) === 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {session.status === 'closed' ? formatFCFA(session.cashDifference || 0) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {selectedPOSSessions.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                        Aucune session de caisse pour ce POS.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'pms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="grid-3">
            <div className="card">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>Folios ouverts</p>
              <h2 style={{ marginTop: '8px' }}>{activeFolios.length}</h2>
            </div>
            <div className="card">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>Charges PMS en attente</p>
              <h2 style={{ marginTop: '8px' }}>{pmsCharges.filter(item => item.charge.status === 'pending').length}</h2>
            </div>
            <div className="card">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>Montant chambre</p>
              <h2 style={{ marginTop: '8px' }}>{formatFCFA(roomChargeSales.reduce((sum, sale) => sum + sale.paymentContext.amount, 0))}</h2>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Journal des imputations chambre</h3>
              <button className="btn btn-secondary" onClick={handleExportPMSCSV} style={{ gap: '6px', fontSize: '0.825rem', padding: '8px 12px' }}>
                <FileSpreadsheet size={16} /> Exporter vers le PMS
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Réf Vente</th>
                    <th>Date / Heure</th>
                    <th>Point de Vente</th>
                    <th>Chambre / Client</th>
                    <th>Montant</th>
                    <th>Statut PMS</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roomChargeSales.slice().reverse().map(sale => {
                    const pos = db.posList.find(p => p.id === sale.posId);
                    const folio = db.pmsFolios.find(f => f.id === sale.paymentContext.folioId);
                    const room = db.pmsRooms.find(r => r.id === folio?.roomId);
                    return (
                      <tr key={sale.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{sale.externalSaleId}</td>
                        <td>{new Date(sale.date).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{pos?.name}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: 'var(--primary)' }}>Chambre {room?.roomNumber || sale.paymentContext.roomNumber}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{folio?.guestName || 'Folio non lié'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatFCFA(sale.paymentContext.amount)}</td>
                        <td>
                          <span className={`badge ${sale.exportedToPms ? 'badge-green' : 'badge-yellow'}`}>
                            {sale.exportedToPms ? 'Exporté vers PMS' : 'En Attente Sync'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary"
                            onClick={() => togglePMSExport(sale.id)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            {sale.exportedToPms ? 'Marquer En attente' : 'Marquer Transmis'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {roomChargeSales.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                        Aucune vente imputée sur chambre pour l'instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Connectors;
