import React from 'react';
import { StockState } from '../hooks/useStockState';
import { FileSpreadsheet, Download } from 'lucide-react';

interface ExportsProps {
  state: StockState;
}

export const Exports: React.FC<ExportsProps> = ({ state }) => {
  const { db } = state;

  const triggerCSVDownload = (filename: string, headers: string[], rows: string[][]) => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Keep Excel-compatible accents
    csvContent += headers.join(";") + "\n";
    rows.forEach(row => {
      csvContent += row.join(";") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportInventory = () => {
    const headers = ["Produit", "Code article", "Categorie", "Depot", "Quantite Disponible", "Unite", "Cout moyen", "Valeur Totale", "Seuil d'Alerte"];
    const rows = db.stocks.map(s => {
      const prod = db.products.find(p => p.id === s.productId)!;
      const wh = db.warehouses.find(w => w.id === s.warehouseId)!;
      return [
        prod.name,
        prod.sku,
        prod.category,
        wh.name,
        s.quantityAvailable.toString(),
        prod.baseUnit,
        s.averageCost.toString(),
        (s.quantityAvailable * s.averageCost).toString(),
        s.alertThreshold.toString()
      ];
    });
    triggerCSVDownload("sartal_inventaire_global", headers, rows);
  };

  const exportMovements = () => {
    const headers = ["Date", "Type Mouvement", "Produit", "Code article", "Depot", "Quantite", "Unite", "Cout moyen", "Valorisation", "Utilisateur", "Raison / Reference"];
    const rows = db.movements.map(m => {
      const prod = db.products.find(p => p.id === m.productId);
      const wh = db.warehouses.find(w => w.id === m.warehouseId);
      return [
        new Date(m.date).toLocaleString(),
        m.type,
        prod?.name || '',
        prod?.sku || '',
        wh?.name || '',
        m.quantity.toString(),
        m.unit,
        m.cost.toString(),
        (Math.abs(m.quantity) * m.cost).toString(),
        m.userName,
        `${m.reason} ${m.externalReference ? `(Ref: ${m.externalReference})` : ''}`
      ];
    });
    triggerCSVDownload("sartal_journal_mouvements", headers, rows);
  };

  const exportLosses = () => {
    const headers = ["Date", "Produit", "Code article", "Depot", "Quantite", "Unite", "Motif Perte", "Utilisateur", "Note / Commentaire"];
    const rows = db.losses.map(l => {
      const prod = db.products.find(p => p.id === l.productId);
      const wh = db.warehouses.find(w => w.id === l.warehouseId);
      return [
        new Date(l.date).toLocaleDateString(),
        prod?.name || '',
        prod?.sku || '',
        wh?.name || '',
        l.quantity.toString(),
        prod?.baseUnit || '',
        l.reason,
        l.userName,
        l.note
      ];
    });
    triggerCSVDownload("sartal_rapport_pertes", headers, rows);
  };

  const exportPurchases = () => {
    const headers = ["ID Commande", "Fournisseur", "Date Creation", "Statut", "Total Items", "Valeur Estimee (FCFA)"];
    const rows = db.supplierOrders.map(o => {
      const sup = db.suppliers.find(s => s.id === o.supplierId);
      const val = o.items.reduce((acc, curr) => acc + (curr.quantityOrdered * curr.purchasePrice), 0);
      return [
        o.id,
        sup?.name || '',
        new Date(o.createdAt).toLocaleDateString(),
        o.status,
        o.items.length.toString(),
        val.toString()
      ];
    });
    triggerCSVDownload("sartal_commandes_achats", headers, rows);
  };

  const exportReorders = () => {
    const headers = ["Produit", "Code article", "Stock Disponible", "Seuil Securite", "Fournisseur Suggere", "Qté Recommandee", "Cout moyen estime", "Cout Total Estime"];
    
    const rows: string[][] = [];
    db.products.filter(p => p.isStockable).forEach(p => {
      const currentStock = db.stocks.filter(s => s.productId === p.id).reduce((acc, curr) => acc + curr.quantityAvailable, 0);
      if (currentStock < p.globalAlertThreshold) {
        const suggest = (p.globalAlertThreshold * 2) - currentStock;
        const b = db.batches.filter(x => x.productId === p.id);
        const lastCost = b.length > 0 ? b[b.length - 1].purchaseCost : 400;
        const supId = p.mainSupplierId || (p.category === 'Boissons' ? 'sup-drinks' : 'sup-market');
        const sup = db.suppliers.find(s => s.id === supId);

        rows.push([
          p.name,
          p.sku,
          currentStock.toString(),
          p.globalAlertThreshold.toString(),
          sup?.name || 'Inconnu',
          suggest.toString(),
          lastCost.toString(),
          (suggest * lastCost).toString()
        ]);
      }
    });

    triggerCSVDownload("sartal_suggestions_approvisionnement", headers, rows);
  };

  const exportPOSConsumption = () => {
    const headers = ["Point de Vente (POS)", "Nombre de ventes", "Montant Total (FCFA)", "Dépôt Principal"];
    const rows = db.posList.map(pos => {
      const sales = db.externalSales.filter(s => s.posId === pos.id);
      const totalAmount = sales.reduce((sum, s) => sum + s.paymentContext.amount, 0);
      const wh = db.warehouses.find(w => w.id === pos.defaultWarehouseId);
      return [
        pos.name,
        sales.length.toString(),
        totalAmount.toString(),
        wh?.name || ''
      ];
    });
    triggerCSVDownload("sartal_consommations_pos", headers, rows);
  };

  const formatFCFA = (value: number) => (
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value).replace('XOF', 'FCFA')
  );

  const stockValue = db.stocks.reduce((sum, stock) => sum + (stock.quantityAvailable * stock.averageCost), 0);
  const salesAmount = db.externalSales.reduce((sum, sale) => sum + sale.paymentContext.amount, 0);
  const lossValue = db.losses.reduce((sum, loss) => {
    const stock = db.stocks.find(item => item.productId === loss.productId && item.warehouseId === loss.warehouseId);
    return sum + (loss.quantity * (stock?.averageCost || 0));
  }, 0);
  const pendingPmsCharges = db.pmsFolios.flatMap(folio => folio.charges).filter(charge => charge.status === 'pending');
  const posSummary = db.posList.map(pos => {
    const sales = db.externalSales.filter(sale => sale.posId === pos.id);
    const warehouse = db.warehouses.find(item => item.id === pos.defaultWarehouseId);
    return {
      pos,
      warehouse,
      ticketCount: sales.length,
      amount: sales.reduce((sum, sale) => sum + sale.paymentContext.amount, 0)
    };
  });

  return (
    <div className="manager-mobile-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Rapports de pilotage</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Restitution gérant : valeur stock, ventes POS, pertes, PMS et exports exploitables.</p>
      </div>

      <div className="grid-4">
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Valeur stock</p>
          <h2 style={{ marginTop: '8px' }}>{formatFCFA(stockValue)}</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Ventes intégrées</p>
          <h2 style={{ marginTop: '8px' }}>{formatFCFA(salesAmount)}</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>Pertes valorisées</p>
          <h2 style={{ marginTop: '8px' }}>{formatFCFA(lossValue)}</h2>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>PMS à exporter</p>
          <h2 style={{ marginTop: '8px' }}>{pendingPmsCharges.length}</h2>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Restitution par point de vente</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}>
              Chaque POS garde son chiffre, son dépôt de sortie et sa traçabilité.
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Point de vente</th>
                  <th>Dépôt</th>
                  <th>Tickets</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                {posSummary.map(row => (
                  <tr key={row.pos.id}>
                    <td style={{ fontWeight: 800 }}>{row.pos.name}</td>
                    <td>{row.warehouse?.name}</td>
                    <td>{row.ticketCount}</td>
                    <td style={{ fontWeight: 800 }}>{formatFCFA(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Lecture gérant</h3>
          {[
            ['Stock', `${db.stocks.length} positions produit/dépôt suivies`],
            ['Ventes', `${db.externalSales.length} tickets ou imports caisse intégrés`],
            ['Traçabilité', `${db.movements.length} mouvements stock historisés`],
            ['PMS', `${pendingPmsCharges.length} consommation(s) chambre en attente d'export`]
          ].map(row => (
            <div key={row[0]} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: '10px', padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
              <strong>{row[0]}</strong>
              <span style={{ color: 'var(--text-secondary)' }}>{row[1]}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>Documents à remettre</h3>
        <div className="grid-3">
        
        {/* Card 1 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Inventaire valorisé</h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Niveaux de stocks actuels par produit et par dépôt avec coût moyen et valorisation totale.
          </p>
          <button className="btn btn-secondary" onClick={exportInventory} style={{ gap: '6px', width: '100%', marginTop: 'auto' }}>
            <Download size={16} /> Télécharger
          </button>
        </div>

        {/* Card 2 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} color="var(--info)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Journal des mouvements</h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Journal comptable chronologique de toutes les entrées, sorties, pertes, inventaires et transferts.
          </p>
          <button className="btn btn-secondary" onClick={exportMovements} style={{ gap: '6px', width: '100%', marginTop: 'auto' }}>
            <Download size={16} /> Télécharger
          </button>
        </div>

        {/* Card 3 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} color="var(--danger)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Pertes et casses</h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Rapport complet sur la casse, les vols, les invendus et les péremptions avec motifs saisis.
          </p>
          <button className="btn btn-secondary" onClick={exportLosses} style={{ gap: '6px', width: '100%', marginTop: 'auto' }}>
            <Download size={16} /> Télécharger
          </button>
        </div>

        {/* Card 4 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} color="var(--success)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Commandes fournisseurs</h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Historique de tous vos bons de commandes d'achats auprès de vos grossistes avec statut de livraison.
          </p>
          <button className="btn btn-secondary" onClick={exportPurchases} style={{ gap: '6px', width: '100%', marginTop: 'auto' }}>
            <Download size={16} /> Télécharger
          </button>
        </div>

        {/* Card 5 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} color="var(--warning)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Réapprovisionnements</h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Fiche de suggestions d'approvisionnement des produits sous seuil avec fournisseur et coût théorique.
          </p>
          <button className="btn btn-secondary" onClick={exportReorders} style={{ gap: '6px', width: '100%', marginTop: 'auto' }}>
            <Download size={16} /> Télécharger
          </button>
        </div>

        {/* Card 6 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={24} color="var(--purple)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Consommations par point de vente</h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Chiffre de sortie d'inventaire valorisé par point de vente (Restaurant, Casino, Bar, Room Service).
          </p>
          <button className="btn btn-secondary" onClick={exportPOSConsumption} style={{ gap: '6px', width: '100%', marginTop: 'auto' }}>
            <Download size={16} /> Télécharger
          </button>
        </div>

      </div>
      </div>

    </div>
  );
};
export default Exports;
