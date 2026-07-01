import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  ClipboardCheck,
  FileSearch,
  FileSpreadsheet,
  PackageX,
  ReceiptText,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { StockState } from '../hooks/useStockState';

interface StockAuditProps {
  state: StockState;
  setView: (view: string) => void;
}

interface AuditRow {
  productId: string;
  warehouseId: string;
  theoreticalQty: number;
  countedQty: number;
  gap: number;
  valueGap: number;
  probableCause: string;
  severity: 'ok' | 'warning' | 'critical';
}

const forcedCountGaps: Record<string, number> = {
  'prod-coca-wh-bar-casino': -15,
  'prod-heineken-wh-nightclub': -8,
  'prod-pain-burger-wh-restaurant': -6,
  'prod-creme-wh-cold': 3,
  'prod-vin-rouge-wh-nightclub': -2
};

export const StockAudit: React.FC<StockAuditProps> = ({ state, setView }) => {
  const { db } = state;

  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA');
  };

  const formatQty = (qty: number) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(qty);
  };

  const getProduct = (productId: string) => db.products.find(p => p.id === productId);
  const getWarehouse = (warehouseId: string) => db.warehouses.find(w => w.id === warehouseId);

  const auditRows = useMemo<AuditRow[]>(() => {
    return db.stocks
      .map(stock => {
        const key = `${stock.productId}-${stock.warehouseId}`;
        const forcedGap = forcedCountGaps[key] || 0;
        const recentSalesOut = db.movements.filter(movement =>
          movement.productId === stock.productId &&
          movement.warehouseId === stock.warehouseId &&
          movement.type === 'sale_consumption'
        ).length;
        const recentLosses = db.losses.filter(loss => loss.productId === stock.productId && loss.warehouseId === stock.warehouseId).length;
        const transfers = db.movements.filter(movement =>
          movement.productId === stock.productId &&
          movement.warehouseId === stock.warehouseId &&
          (movement.type === 'transfer_in' || movement.type === 'transfer_out')
        ).length;

        let probableCause = 'Stock cohérent';
        if (forcedGap < 0 && recentSalesOut === 0) probableCause = 'Sortie physique non saisie ou vente externe non importée';
        else if (forcedGap < 0 && recentLosses === 0) probableCause = 'Perte/casse probable non déclarée';
        else if (forcedGap < 0) probableCause = 'Écart négatif après ventes POS, vérifier pertes ou transferts';
        else if (forcedGap > 0 && transfers === 0) probableCause = 'Entrée ou transfert reçu non enregistré';

        const absoluteGap = Math.abs(forcedGap);
        const severity: AuditRow['severity'] = absoluteGap === 0 ? 'ok' : absoluteGap >= Math.max(5, stock.alertThreshold * 0.15) ? 'critical' : 'warning';

        return {
          productId: stock.productId,
          warehouseId: stock.warehouseId,
          theoreticalQty: stock.quantityAvailable,
          countedQty: Math.max(0, stock.quantityAvailable + forcedGap),
          gap: forcedGap,
          valueGap: forcedGap * stock.averageCost,
          probableCause,
          severity
        };
      })
      .filter(row => row.severity !== 'ok')
      .sort((a, b) => Math.abs(b.valueGap) - Math.abs(a.valueGap));
  }, [db.losses, db.movements, db.stocks]);

  const totalGapValue = auditRows.reduce((sum, row) => sum + Math.abs(row.valueGap), 0);
  const criticalRows = auditRows.filter(row => row.severity === 'critical');
  const importedTickets = db.externalPOSImportRuns.reduce((sum, run) => sum + run.successCount, 0);
  const rejectedTickets = db.externalPOSImportRuns.reduce((sum, run) => sum + run.rejectedCount, 0);

  const unmappedAliases = db.externalPOSImportRuns.flatMap(run => run.issues).filter(issue => issue.message.includes('mappé') || issue.message.includes('inconnu'));

  const auditFlow = [
    {
      title: '1. Stock logiciel',
      detail: 'On importe ou lit le stock théorique existant par dépôt.',
      icon: <FileSpreadsheet size={20} />
    },
    {
      title: '2. Ventes POS',
      detail: 'On importe les exports caisse et on vérifie les produits/dépôts.',
      icon: <ReceiptText size={20} />
    },
    {
      title: '3. Mouvements métier',
      detail: 'On intègre pertes, transferts, réceptions et inventaires.',
      icon: <ArrowRightLeft size={20} />
    },
    {
      title: '4. Écarts expliqués',
      detail: 'On compare au comptage réel et on propose les causes probables.',
      icon: <FileSearch size={20} />
    }
  ];

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Audit Stock Existant</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            On ne remplace pas leur logiciel au départ : on contrôle ses données, on détecte les écarts et on explique pourquoi le stock n'est pas fiable.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setView('pos-imports')}>
            Importer ventes POS
          </button>
          <button className="btn btn-primary" onClick={() => setView('stock-control')}>
            Voir contrôle stock
          </button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Valeur d'écart estimée</span>
            <ShieldAlert size={20} color="var(--danger)" />
          </div>
          <h2 style={{ marginTop: '10px' }}>{formatFCFA(totalGapValue)}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>Sur le comptage simulé de contrôle</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Écarts critiques</span>
            <AlertTriangle size={20} color="var(--warning)" />
          </div>
          <h2 style={{ marginTop: '10px' }}>{criticalRows.length}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>À expliquer avant clôture</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Tickets POS intégrés</span>
            <ShieldCheck size={20} color="var(--success)" />
          </div>
          <h2 style={{ marginTop: '10px' }}>{importedTickets}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>Depuis les exports importés</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Tickets / lignes rejetés</span>
            <PackageX size={20} color="var(--danger)" />
          </div>
          <h2 style={{ marginTop: '10px' }}>{rejectedTickets}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>Produits inconnus, stock insuffisant, POS absent</p>
        </div>
      </div>

      <div className="grid-4">
        {auditFlow.map(step => (
          <div key={step.title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--primary-lightest)', color: 'var(--primary)' }}>
              {step.icon}
            </div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800 }}>{step.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5 }}>{step.detail}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Écarts inventaire expliqués</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}>
              Exemple de restitution au gérant : stock attendu vs comptage réel, valeur perdue et cause probable.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => setView('inventories')}>
            <ClipboardCheck size={16} /> Lancer inventaire
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Dépôt</th>
                <th>Stock attendu</th>
                <th>Compté réel</th>
                <th>Écart</th>
                <th>Valeur</th>
                <th>Cause probable</th>
              </tr>
            </thead>
            <tbody>
              {auditRows.map(row => {
                const product = getProduct(row.productId);
                const warehouse = getWarehouse(row.warehouseId);
                return (
                  <tr key={`${row.productId}-${row.warehouseId}`}>
                    <td style={{ fontWeight: 700 }}>{product?.name}</td>
                    <td>{warehouse?.name}</td>
                    <td>{formatQty(row.theoreticalQty)} {product?.baseUnit}</td>
                    <td style={{ fontWeight: 700 }}>{formatQty(row.countedQty)} {product?.baseUnit}</td>
                    <td style={{ color: row.gap < 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 800 }}>
                      {row.gap > 0 ? '+' : ''}{formatQty(row.gap)} {product?.baseUnit}
                    </td>
                    <td style={{ fontWeight: 800 }}>{formatFCFA(Math.abs(row.valueGap))}</td>
                    <td>
                      <span className={`badge ${row.severity === 'critical' ? 'badge-red' : 'badge-yellow'}`}>
                        {row.probableCause}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Ce que l'audit prouve</h3>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              'Le logiciel actuel peut être gardé au départ.',
              'Sartal se branche sur les exports et contrôle la cohérence.',
              'Les produits non mappés et dépôts mal configurés ressortent immédiatement.',
              'Le gérant obtient une valeur d’écart et des causes probables.',
              'Une fois la confiance gagnée, Sartal peut remplacer progressivement certains modules.'
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <ShieldCheck size={18} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Anomalies de connexion</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Anomalie</th>
                </tr>
              </thead>
              <tbody>
                {unmappedAliases.slice(0, 6).map(issue => (
                  <tr key={`${issue.rowNumber}-${issue.ticketId}-${issue.message}`}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{issue.ticketId}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{issue.message}</td>
                  </tr>
                ))}
                {unmappedAliases.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      Aucune anomalie d'import POS pour le moment. Lancez l'exemple dans Imports POS pour faire ressortir un produit non mappé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAudit;
