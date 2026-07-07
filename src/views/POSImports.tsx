import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, FileSpreadsheet, Network, PackageCheck, Upload } from 'lucide-react';
import { StockState } from '../hooks/useStockState';
import { ExternalPOSSaleRow, PAYMENT_TYPES } from '../types';

interface POSImportsProps {
  state: StockState;
  setView: (view: string) => void;
}

const SAMPLE_EXPORT = `date;posCode;ticketId;externalSku;label;quantity;amount;paymentType;roomNumber
2026-07-02T12:15:00;Restaurant La Terrasse;REST-1001;COCA33;Coca-Cola 33 cl;2;3000;cash;
2026-07-02T12:15:00;Restaurant La Terrasse;REST-1001;STEAKFRITES;Steak frites;1;6500;cash;
2026-07-02T12:44:00;Restaurant La Terrasse;REST-1002;BURGER;Burger maison;2;11000;orange_money;
2026-07-02T21:10:00;Bar des Machines à Sous;CAS-2201;TONICCITRON;Tonic citron;3;13500;wave;
2026-07-02T21:30:00;Bar des Machines à Sous;CAS-2202;COCA33;Coca-Cola 33 cl;4;8000;room_charge;204
2026-07-02T23:40:00;Night Club;NC-3301;BOUYE75;Jus bouye;1;18000;card;
2026-07-02T23:45:00;Night Club;NC-3302;GINGEMBRE33;Jus gingembre 33 cl;6;21000;cash;
2026-07-02T23:55:00;Night Club;NC-3303;UNKNOWN01;Produit inconnu caisse;1;5000;cash;`;

export const POSImports: React.FC<POSImportsProps> = ({ state, setView }) => {
  const { db, importExternalPOSSales } = state;
  const [csvText, setCsvText] = useState(SAMPLE_EXPORT);
  const [sourceName, setSourceName] = useState('Export POS existant - journée test');
  const [lastRunId, setLastRunId] = useState<string | null>(null);

  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(val).replace('XOF', 'FCFA');
  };

  const parseRows = (input: string): { rows: ExternalPOSSaleRow[]; parseIssues: string[] } => {
    const lines = input.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const parseIssues: string[] = [];
    if (lines.length <= 1) return { rows: [], parseIssues: ['Aucune ligne de vente trouvée.'] };

    const header = lines[0].split(';').map(col => col.trim());
    const requiredColumns = ['date', 'posCode', 'ticketId', 'externalSku', 'label', 'quantity', 'amount', 'paymentType'];
    requiredColumns.forEach(column => {
      if (!header.includes(column)) parseIssues.push(`Colonne manquante: ${column}`);
    });

    if (parseIssues.length > 0) return { rows: [], parseIssues };

    const rows = lines.slice(1).map((line, index) => {
      const values = line.split(';');
      const read = (key: string) => values[header.indexOf(key)]?.trim() || '';
      const paymentType = read('paymentType') as ExternalPOSSaleRow['paymentType'];
      if (!PAYMENT_TYPES.includes(paymentType)) {
        parseIssues.push(`Ligne ${index + 2}: moyen de paiement invalide (${paymentType})`);
      }

      return {
        date: read('date'),
        posCode: read('posCode'),
        ticketId: read('ticketId'),
        externalSku: read('externalSku'),
        label: read('label'),
        quantity: parseFloat(read('quantity')) || 0,
        amount: parseFloat(read('amount')) || 0,
        paymentType,
        roomNumber: read('roomNumber') || undefined
      };
    });

    rows.forEach((row, index) => {
      if (!row.ticketId || !row.posCode || !row.externalSku || row.quantity <= 0) {
        parseIssues.push(`Ligne ${index + 2}: ticket/POS/produit/quantité invalide`);
      }
    });

    return { rows: parseIssues.length > 0 ? [] : rows, parseIssues };
  };

  const preview = useMemo(() => parseRows(csvText), [csvText]);
  const previewTickets = useMemo(() => {
    return Object.values(preview.rows.reduce<Record<string, ExternalPOSSaleRow[]>>((acc, row) => {
      const key = `${row.posCode}-${row.ticketId}`;
      acc[key] = acc[key] || [];
      acc[key].push(row);
      return acc;
    }, {}));
  }, [preview.rows]);

  const mappedRows = preview.rows.map(row => {
    const pos = db.posList.find(p => p.id === row.posCode || p.name.toLowerCase() === row.posCode.toLowerCase());
    const alias = db.posProductAliases.find(mapping => mapping.externalSku.toLowerCase() === row.externalSku.toLowerCase() && (!mapping.posId || mapping.posId === pos?.id));
    const product = alias
      ? db.products.find(p => p.id === alias.productId)
      : db.products.find(p => p.sku.toLowerCase() === row.externalSku.toLowerCase());
    const warehouse = db.warehouses.find(w => w.id === pos?.defaultWarehouseId);
    return { row, pos, product, warehouse };
  });

  const readyRows = mappedRows.filter(item => item.pos && item.product).length;
  const totalAmount = preview.rows.reduce((sum, row) => sum + row.amount, 0);
  const lastRun = db.externalPOSImportRuns.find(run => run.id === lastRunId) || db.externalPOSImportRuns.slice().sort((a, b) => b.importedAt.localeCompare(a.importedAt))[0];

  const handleImport = () => {
    if (preview.rows.length === 0) return;
    const run = importExternalPOSSales(sourceName, preview.rows);
    setLastRunId(run.id);
  };

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Reprendre les ventes existantes</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Collez un export de caisse, Sartal reconnaît les produits, rattache le point de vente au bon dépôt et rejoue les ventes pour calculer le stock réel.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setView('stock-control')}>
          <PackageCheck size={18} /> Voir l'impact stock
        </button>
      </div>

      <div className="grid-4">
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Lignes export</p>
          <h2 style={{ marginTop: '8px' }}>{preview.rows.length}</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Tickets POS</p>
          <h2 style={{ marginTop: '8px' }}>{previewTickets.length}</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Lignes reconnues</p>
          <h2 style={{ marginTop: '8px' }}>{readyRows}</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Montant export</p>
          <h2 style={{ marginTop: '8px' }}>{formatFCFA(totalAmount)}</h2>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nom de la source</label>
            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} className="form-control" />
          </div>
          <details style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Afficher ou modifier les données importées</summary>
            <div className="form-group" style={{ margin: '12px 0 0' }}>
              <label className="form-label">Contenu du fichier de ventes</label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="form-control"
                rows={12}
                style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
              />
            </div>
          </details>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setCsvText(SAMPLE_EXPORT)} type="button">
              Charger l'exemple
            </button>
            <button className="btn btn-primary" onClick={handleImport} disabled={preview.rows.length === 0 || preview.parseIssues.length > 0} type="button">
              <Upload size={18} /> Importer et déduire le stock
            </button>
          </div>

          {preview.parseIssues.length > 0 && (
            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertTriangle size={18} />
              <div>
                <strong>Export invalide</strong>
                {preview.parseIssues.map(issue => <p key={issue} style={{ marginTop: '4px', fontSize: '0.82rem' }}>{issue}</p>)}
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Rapprochement avant import</h3>
          </div>
          <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>POS / Dépôt</th>
                  <th>Produit externe</th>
                  <th>Produit Sartal</th>
                </tr>
              </thead>
              <tbody>
                {mappedRows.map((item, index) => (
                  <tr key={`${item.row.ticketId}-${item.row.externalSku}-${index}`}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{item.row.ticketId}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{item.pos?.name || item.row.posCode}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{item.warehouse?.name || 'Dépôt non trouvé'}</span>
                      </div>
                    </td>
                    <td>{item.row.externalSku}</td>
                    <td>
                      <span className={`badge ${item.product ? 'badge-green' : 'badge-red'}`}>
                        {item.product?.name || 'À identifier'}
                      </span>
                    </td>
                  </tr>
                ))}
                {mappedRows.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      Aucun export à prévisualiser.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {mappedRows.map((item, index) => (
              <div key={`${item.row.ticketId}-${item.row.externalSku}-${index}`} className="mobile-data-card">
                <div className="mobile-data-header">
                  <div>
                    <div className="mobile-data-title">{item.row.ticketId}</div>
                    <div className="mobile-data-subtitle">{item.pos?.name || item.row.posCode}</div>
                  </div>
                  <span className={`badge ${item.product ? 'badge-green' : 'badge-red'}`}>
                    {item.product ? 'Reconnu' : 'À identifier'}
                  </span>
                </div>
                <div className="mobile-data-row">
                  <span>Dépôt</span>
                  <strong>{item.warehouse?.name || 'Non trouvé'}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Code export</span>
                  <strong>{item.row.externalSku}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Produit Sartal</span>
                  <strong>{item.product?.name || 'À identifier'}</strong>
                </div>
              </div>
            ))}
            {mappedRows.length === 0 && (
              <div className="mobile-data-card" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                Aucun export à prévisualiser.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Derniers imports</h3>
          </div>
          <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Tickets OK</th>
                  <th>Rejets</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {db.externalPOSImportRuns.slice().sort((a, b) => b.importedAt.localeCompare(a.importedAt)).slice(0, 6).map(run => (
                  <tr key={run.id}>
                    <td style={{ fontWeight: 700 }}>{run.sourceName}</td>
                    <td><span className="badge badge-green">{run.successCount}</span></td>
                    <td><span className={run.rejectedCount > 0 ? 'badge badge-red' : 'badge badge-green'}>{run.rejectedCount}</span></td>
                    <td>{new Date(run.importedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {db.externalPOSImportRuns.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      Aucun import encore lancé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {db.externalPOSImportRuns.slice().sort((a, b) => b.importedAt.localeCompare(a.importedAt)).slice(0, 6).map(run => (
              <div key={run.id} className="mobile-data-card">
                <div className="mobile-data-title">{run.sourceName}</div>
                <div className="mobile-data-row">
                  <span>Tickets OK</span>
                  <strong>{run.successCount}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Rejets</span>
                  <strong style={{ color: run.rejectedCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{run.rejectedCount}</strong>
                </div>
                <div className="mobile-data-row">
                  <span>Date</span>
                  <strong>{new Date(run.importedAt).toLocaleString()}</strong>
                </div>
              </div>
            ))}
            {db.externalPOSImportRuns.length === 0 && (
              <div className="mobile-data-card" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                Aucun import encore lancé.
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={20} color="var(--success)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Résultat du dernier import</h3>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lastRun ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-light)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Tickets acceptés</p>
                    <strong style={{ color: 'var(--success)' }}>{lastRun.successCount}</strong>
                  </div>
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: lastRun.rejectedCount > 0 ? 'var(--danger-light)' : 'var(--success-light)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Rejets / corrections</p>
                    <strong style={{ color: lastRun.rejectedCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{lastRun.rejectedCount}</strong>
                  </div>
                </div>
                {lastRun.issues.length > 0 ? (
                  lastRun.issues.map(issue => (
                    <div key={`${issue.rowNumber}-${issue.message}`} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontSize: '0.82rem' }}>
                      Ligne {issue.rowNumber} / ticket {issue.ticketId}: {issue.message}
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>Aucune anomalie sur le dernier import. Les sorties stock ont été générées.</p>
                )}
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Lancez un import pour voir les tickets acceptés, les rejets et l'impact sur le stock.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSImports;
