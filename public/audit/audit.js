const STORAGE_KEY = 'sartal-audit-workspace-v1';

const MODULES = [
  { id: 'pms', label: 'Hôtel / PMS' },
  { id: 'restaurant', label: 'Restaurant / POS' },
  { id: 'stock', label: 'Stock / achats' },
  { id: 'finance', label: 'Finance / caisses' },
  { id: 'customer', label: 'Expérience client' },
  { id: 'online', label: 'Vente en ligne' },
  { id: 'it', label: 'IT / matériel' },
  { id: 'data', label: 'Données / migration' },
];

const STATUS = {
  yes: { label: 'Conforme', score: 4, className: 'good' },
  partial: { label: 'Partiel', score: 2, className: 'partial' },
  no: { label: 'Non', score: 0, className: 'bad' },
  unknown: { label: 'À vérifier', score: 1, className: 'unknown' },
  na: { label: 'N/A', score: null, className: 'na' },
};

const SEVERITIES = {
  critical: { label: 'P1 Critique', short: 'P1' },
  major: { label: 'P2 Majeur', short: 'P2' },
  medium: { label: 'P3 Moyen', short: 'P3' },
  opportunity: { label: 'P4 Opportunité', short: 'P4' },
};

const DOMAINS = [
  {
    id: 'direction',
    short: 'DIR',
    label: 'Direction et gouvernance',
    description: 'Objectifs, organisation, irritants et indicateurs de pilotage.',
    modules: [],
    questions: [
      q('dir-01', 'Les objectifs de l’audit et du futur système sont formalisés et priorisés.', 'Demander ce qui doit absolument être amélioré, conservé ou supprimé.', 3, true),
      q('dir-02', 'Le périmètre des sites, bâtiments, restaurants, bars, dépôts et chambres est documenté.', 'Relever les volumes : sites, chambres, tables, caisses, dépôts et utilisateurs.', 3, true),
      q('dir-03', 'Les difficultés actuelles sont classées par impact client, financier et opérationnel.', 'Distinguer les symptômes quotidiens des causes structurelles.', 3, true),
      q('dir-04', 'Chaque processus critique possède un responsable clairement identifié.', 'Réservation, caisse, stock, clôture, maintenance, données et sécurité.', 2, true),
      q('dir-05', 'Les indicateurs transmis à la direction sont produits régulièrement et jugés fiables.', 'Demander des exemples récents et vérifier leur mode de calcul.', 3, true),
      q('dir-06', 'Les rôles, validations et limites de responsabilité sont compris par les équipes.', 'Remises, annulations, offerts, transferts, inventaires et clôtures.', 2, false),
      q('dir-07', 'Les incidents et changements de configuration suivent un processus de validation.', 'Identifier qui peut modifier les prix, taxes, chambres, droits et dépôts.', 2, false),
      q('dir-08', 'Les contrats, coûts, licences et dépendances fournisseurs sont connus.', 'Relever les échéances, engagements, matériels loués et coûts cachés.', 2, false),
    ],
  },
  {
    id: 'pms',
    short: 'PMS',
    label: 'Hôtel et PMS',
    description: 'Réservations, chambres, folios, housekeeping et clôture hôtelière.',
    modules: ['pms'],
    questions: [
      q('pms-01', 'Le référentiel des chambres, catégories, capacités et statuts est à jour.', 'Comparer le PMS à la réalité terrain et aux chambres indisponibles.', 3, true),
      q('pms-02', 'Les tarifs, contrats, packages et règles d’occupation sont centralisés.', 'Vérifier les tarifs entreprise, groupes, saisonnalité et gratuités.', 2, false),
      q('pms-03', 'Les canaux de réservation mettent à jour la disponibilité sans double saisie.', 'Site, téléphone, agences, OTA et réservations sur place.', 3, true),
      q('pms-04', 'Les risques de surbooking et de réservation en doublon sont contrôlés.', 'Demander les incidents récents et leur méthode de résolution.', 3, true),
      q('pms-05', 'Le check-in et le check-out suivent un parcours standard et traçable.', 'Identité, garantie, clés, soldes, facture et consentements.', 2, false),
      q('pms-06', 'Chaque charge, transfert, correction et paiement du folio garde son auteur.', 'Tester une modification et demander le journal d’audit.', 3, true),
      q('pms-07', 'Les consommations restaurant peuvent être imputées sur la bonne chambre sans ressaisie.', 'Contrôler recherche chambre, identité, statut du folio et retour d’erreur.', 3, true),
      q('pms-08', 'Les statuts housekeeping et maintenance sont partagés en temps réel.', 'Libre, occupée, sale, propre, contrôlée, maintenance et bloquée.', 3, true),
      q('pms-09', 'La clôture de nuit bloque les anomalies avant de changer de journée.', 'Folios ouverts, paiements, no-show, charges POS et écarts.', 3, true),
      q('pms-10', 'Les profils clients, préférences et consentements sont exploitables sans doublon.', 'Rechercher un client récurrent et vérifier historique et restrictions.', 2, false),
      q('pms-11', 'Orchestra permet des exports complets et documentés des données nécessaires.', 'Réservations, chambres, clients, folios, paiements, tarifs et utilisateurs.', 3, true),
      q('pms-12', 'La propriété, la profondeur historique et les conditions de récupération des données sont claires.', 'Vérifier contrat, format, coût et délai de remise des données.', 3, true),
    ],
  },
  {
    id: 'restaurant',
    short: 'POS',
    label: 'Restaurant et POS',
    description: 'Salle, commandes, cuisine, caisse, prix et paiements.',
    modules: ['restaurant'],
    questions: [
      q('pos-01', 'Tous les points de vente et caisses sont rattachés au bon établissement et à la bonne activité.', 'Lister chaque caisse, terminal, imprimante et zone de service.', 3, true),
      q('pos-02', 'Le plan des salles et l’état des tables correspondent à la réalité du service.', 'Vérifier réservations, transfert de table et historique de l’addition.', 2, false),
      q('pos-03', 'Le catalogue des produits reste unique entre les différents points de vente.', 'Détecter les doublons créés pour gérer les prix ou les dépôts.', 3, true),
      q('pos-04', 'Les prix, taxes et disponibilités sont configurables par point de vente.', 'Tester le même produit dans deux POS avec des tarifs différents.', 3, true),
      q('pos-05', 'Chaque commande est envoyée uniquement au bon poste de production.', 'Cuisine, boissons, dessert, passe et imprimantes de secours.', 3, true),
      q('pos-06', 'Les allergies, préférences et consignes sont visibles jusqu’au service.', 'Suivre une allergie depuis la table jusqu’au ticket cuisine.', 3, true),
      q('pos-07', 'Les remises, annulations, offerts et repas du personnel nécessitent les bonnes validations.', 'Contrôler motif, auteur, approbateur et impact financier/stock.', 3, true),
      q('pos-08', 'Les moyens de paiement locaux sont séparés et rapprochables.', 'Espèces, carte, Wave, Orange Money, compte client et chambre.', 3, true),
      q('pos-09', 'Chaque caisse possède une ouverture, un fonds, un rapport X/Z et un écart expliqué.', 'Observer une ouverture et demander la dernière clôture.', 3, true),
      q('pos-10', 'Le partage d’addition et les paiements multiples sont gérés sans recréer le ticket.', 'Par article, par convive, par montant libre et par moyen de paiement.', 2, false),
      q('pos-11', 'Les ventes détaillées sont exportables ligne par ligne avec leurs annulations et paiements.', 'Exiger les identifiants ticket, ligne, produit, POS, caisse et opérateur.', 3, true),
      q('pos-12', 'Le service peut continuer pendant une coupure réseau sans perdre les opérations.', 'Tester le comportement offline et la reprise des conflits.', 2, false),
    ],
  },
  {
    id: 'stock',
    short: 'STK',
    label: 'Stock, achats et recettes',
    description: 'Dépôts, fournisseurs, recettes, mouvements, pertes et inventaires.',
    modules: ['stock'],
    questions: [
      q('stk-01', 'La cartographie des dépôts correspond aux lieux physiques et aux responsabilités.', 'Central, restaurant, bar, cuisine, froid, économat et préparation.', 3, true),
      q('stk-02', 'Les catégories, unités et conversions sont uniformes dans tout le catalogue.', 'Unité, bouteille, pack, kilogramme, litre et conditionnement fournisseur.', 3, true),
      q('stk-03', 'Les stocks initiaux possèdent une date, une méthode et un validateur.', 'Identifier la dernière base fiable et les corrections postérieures.', 3, true),
      q('stk-04', 'Les achats et réceptions distinguent commandé, reçu, refusé et facturé.', 'Contrôler prix, quantité, lot, date, écart et justificatif.', 3, true),
      q('stk-05', 'Les transferts entre dépôts possèdent une sortie, une réception et une preuve.', 'Tester un transfert en cours et les écarts de réception.', 3, true),
      q('stk-06', 'Les recettes et fiches techniques sont à jour avec rendement et pertes.', 'Portions, sous-recettes, pertes cuisson et substitutions.', 3, true),
      q('stk-07', 'Chaque vente déduit automatiquement le produit ou les ingrédients du bon dépôt.', 'Tester le même article depuis plusieurs POS et dépôts.', 3, true),
      q('stk-08', 'Les casses, pertes, péremptions et consommations internes sont déclarées séparément.', 'Vérifier motifs, preuve, valeur et validation manager.', 3, true),
      q('stk-09', 'Les inventaires sont réalisés à l’aveugle puis validés avec écarts valorisés.', 'Comparer procédure théorique et dernière feuille de comptage.', 3, true),
      q('stk-10', 'Les lots, dates de péremption et règles FIFO/FEFO sont suivis lorsque nécessaire.', 'Produits frais, surgelés, boissons et produits d’accueil.', 2, false),
      q('stk-11', 'Les seuils et propositions de réapprovisionnement utilisent la consommation réelle.', 'Délai fournisseur, saisonnalité, événements et stock de sécurité.', 2, false),
      q('stk-12', 'La valorisation, le coût matière et la marge sont jugés fiables.', 'Comparer coût théorique, coût réel et prix de vente.', 3, true),
    ],
  },
  {
    id: 'finance',
    short: 'FIN',
    label: 'Finance, caisses et paiements',
    description: 'Encaissements, clôtures, rapprochements et comptabilité.',
    modules: ['finance'],
    questions: [
      q('fin-01', 'Chaque paiement est rattaché à une vente, un folio ou un compte identifié.', 'Rechercher les paiements orphelins ou reclassés manuellement.', 3, true),
      q('fin-02', 'Les entrées et sorties d’espèces hors vente sont enregistrées avec justificatif.', 'Fonds, dépense, remboursement, apport et retrait.', 3, true),
      q('fin-03', 'Les rapports X/Z sont produits par caisse, opérateur et journée métier.', 'Vérifier réouverture, correction et conservation des rapports.', 3, true),
      q('fin-04', 'Wave et Orange Money sont rapprochés avec les références opérateur.', 'Comparer journal de caisse et relevé du fournisseur de paiement.', 3, true),
      q('fin-05', 'Les revenus PMS, restaurant et vente en ligne sont consolidés sans double comptage.', 'Contrôler imputations chambre et annulations croisées.', 3, true),
      q('fin-06', 'Les écarts de caisse suivent un circuit d’explication et de validation.', 'Montant, motif, responsable, décision et écriture finale.', 3, true),
      q('fin-07', 'Les taxes et règles de facturation sont configurées et contrôlées.', 'TVA, exonérations, service, facture et numérotation.', 2, false),
      q('fin-08', 'Les comptes clients et fournisseurs possèdent soldes et échéances fiables.', 'Acompte, crédit, remboursement, dette et ancienneté.', 2, false),
      q('fin-09', 'Les écritures nécessaires sont exportables vers la comptabilité.', 'Plan de comptes, journaux, axes analytiques et pièces.', 3, true),
    ],
  },
  {
    id: 'customer',
    short: 'CX',
    label: 'Expérience client et CRM',
    description: 'Profil, préférences, demandes, réclamations et fidélité.',
    modules: ['customer'],
    questions: [
      q('cx-01', 'Le client possède un profil unique entre hôtel, restaurant et vente en ligne.', 'Tester doublons par téléphone, e-mail et orthographe du nom.', 3, true),
      q('cx-02', 'Les consentements et préférences de communication sont enregistrés.', 'WhatsApp, SMS, e-mail, langue et fréquence.', 2, false),
      q('cx-03', 'Les allergies, préférences et occasions spéciales suivent le client.', 'Vérifier accès selon les rôles et confidentialité.', 3, true),
      q('cx-04', 'Les demandes client sont suivies jusqu’à confirmation de résolution.', 'Promesse, responsable, délai, relance et escalade.', 3, true),
      q('cx-05', 'Les réclamations déclenchent une reprise de service et une validation adaptée.', 'Cause, geste, coût, suivi et satisfaction finale.', 2, false),
      q('cx-06', 'Les règles de fidélité sont compréhensibles et correctement appliquées.', 'Gains, utilisation, expiration, fraude et multi-activité.', 2, false),
      q('cx-07', 'Les parcours client peuvent s’intégrer aux sites et canaux existants.', 'Lien, QR, widget, API, identité et paiement.', 3, true),
      q('cx-08', 'La satisfaction est mesurée et reliée à des actions concrètes.', 'Avis, enquête, score, motif et responsable de reprise.', 2, false),
    ],
  },
  {
    id: 'online',
    short: 'WEB',
    label: 'Vente en ligne et livraison',
    description: 'Catalogue, disponibilité, préparation, tournée et preuve de remise.',
    modules: ['online'],
    questions: [
      q('web-01', 'Le catalogue en ligne est synchronisé avec le référentiel produit.', 'Prix, description, unité, image, disponibilité et catégorie.', 3, true),
      q('web-02', 'Le stock affiché tient compte des quantités déjà réservées.', 'Tester deux commandes simultanées sur un stock faible.', 3, true),
      q('web-03', 'Une commande confirmée réserve le stock sans le sortir physiquement.', 'Identifier le moment exact de la réservation et de l’annulation.', 3, true),
      q('web-04', 'Les zones, frais et délais de livraison sont paramétrables.', 'Quartier, distance, créneau, surcharge et minimum de commande.', 2, false),
      q('web-05', 'Le picking guide le préparateur et encadre les substitutions.', 'Emplacement, quantité, contrôle, alternative et accord client.', 3, true),
      q('web-06', 'Le dispatch attribue tournée, livreur et montant à encaisser.', 'Capacité, zone, priorité, départ et retour.', 2, false),
      q('web-07', 'La remise est prouvée par un contrôle adapté.', 'Code client, signature, photo, position ou autre preuve.', 3, true),
      q('web-08', 'Les absences, refus, retours et produits endommagés gardent une trace.', 'Impact stock, paiement, remboursement et service client.', 3, true),
      q('web-09', 'Les paiements en ligne et à la livraison sont rapprochables.', 'Wave, Orange Money, carte et espèces livreur.', 3, true),
    ],
  },
  {
    id: 'it',
    short: 'IT',
    label: 'IT, matériel et sécurité',
    description: 'Applications, terminaux, réseau, sauvegarde et sécurité.',
    modules: ['it'],
    questions: [
      q('it-01', 'Un inventaire à jour recense logiciels, serveurs, postes, terminaux et imprimantes.', 'Noter modèle, emplacement, propriétaire, âge et état.', 3, true),
      q('it-02', 'La couverture réseau et Wi-Fi est suffisante dans toutes les zones critiques.', 'Réception, salles, cuisine, caisses, étages, dépôts et bureaux.', 3, true),
      q('it-03', 'Une solution de continuité existe en cas de panne Internet ou électrique.', 'Lien secondaire, 4G/5G, onduleur, groupe et mode offline.', 3, true),
      q('it-04', 'L’architecture locale, cloud et les flux entre systèmes sont documentés.', 'Serveurs, VPN, ports, domaines, certificats et dépendances.', 3, true),
      q('it-05', 'Les sauvegardes sont automatiques, surveillées et restaurées régulièrement.', 'Demander date et preuve du dernier test de restauration.', 3, true),
      q('it-06', 'Chaque utilisateur possède un compte individuel.', 'Repérer les comptes partagés, génériques ou non désactivés.', 3, true),
      q('it-07', 'Les droits suivent le principe du besoin réel et sont revus périodiquement.', 'Admin, direction, réception, caisse, cuisine, stock et prestataire.', 3, true),
      q('it-08', 'Les journaux techniques et incidents sont centralisés et exploitables.', 'Pannes, erreurs, accès, modification, export et conservation.', 2, false),
      q('it-09', 'Le matériel critique possède maintenance, pièces de secours et responsable.', 'Imprimantes, tiroirs, lecteurs, terminaux, routeurs et onduleurs.', 2, false),
      q('it-10', 'Les mises à jour, antivirus et mesures de cybersécurité sont suivis.', 'Correctifs, mots de passe, MFA, accès distant et prestataires.', 3, true),
    ],
  },
  {
    id: 'data',
    short: 'DATA',
    label: 'Données, intégrations et migration',
    description: 'Exports, API, qualité, historique et stratégie de bascule.',
    modules: ['data'],
    questions: [
      q('data-01', 'Les propriétaires et responsables des données sont identifiés.', 'Client, produit, chambre, vente, paiement, stock et utilisateur.', 3, true),
      q('data-02', 'Chaque système permet l’export des données nécessaires dans un format exploitable.', 'CSV, Excel, JSON, base de données ou API documentée.', 3, true),
      q('data-03', 'Les identifiants restent stables entre les exports et les systèmes.', 'Produit, ticket, réservation, folio, client, paiement et mouvement.', 3, true),
      q('data-04', 'Les doublons, champs manquants et valeurs incohérentes sont mesurés.', 'Faire un échantillon sur produits, clients et ventes.', 3, true),
      q('data-05', 'La profondeur historique à reprendre est décidée par type de donnée.', 'Données actives, soldes, historique légal et archives consultables.', 2, false),
      q('data-06', 'Les API, webhooks et fréquences de synchronisation sont documentés.', 'Limites, authentification, erreurs, reprise et responsabilité.', 3, true),
      q('data-07', 'Des échantillons réels ont été obtenus pour tester la migration.', 'Un export récent de chaque source critique.', 3, true),
      q('data-08', 'Une base de rapprochement permet de prouver les soldes après migration.', 'CA, paiements, folios, stocks, dettes et réservations.', 3, true),
      q('data-09', 'Un environnement de test permet aux équipes de valider les parcours.', 'Cas nominaux, erreurs, droits, performance et matériel.', 2, false),
      q('data-10', 'La bascule prévoit gel, sauvegarde, contrôle et retour arrière.', 'Responsables, horaires, critères go/no-go et communication.', 3, true),
    ],
  },
];

const DOCUMENT_TEMPLATES = [
  doc('doc-pms-rooms', 'PMS', 'Liste des chambres, catégories et statuts', ['pms']),
  doc('doc-pms-bookings', 'PMS', 'Export des réservations actives et historiques', ['pms']),
  doc('doc-pms-folios', 'PMS', 'Folios, charges, paiements et soldes', ['pms']),
  doc('doc-pms-night', 'PMS', 'Derniers rapports de clôture de nuit', ['pms']),
  doc('doc-pms-users', 'PMS', 'Utilisateurs, rôles et permissions Orchestra', ['pms']),
  doc('doc-pos-list', 'Restaurant', 'Liste des POS, caisses, terminaux et imprimantes', ['restaurant']),
  doc('doc-pos-products', 'Restaurant', 'Catalogue, prix, taxes et disponibilités par POS', ['restaurant']),
  doc('doc-pos-sales', 'Restaurant', 'Export détaillé des ventes, lignes et paiements', ['restaurant']),
  doc('doc-pos-z', 'Restaurant', 'Rapports X/Z et écarts de caisse récents', ['restaurant', 'finance']),
  doc('doc-stock-products', 'Stock', 'Catalogue produits, unités et catégories', ['stock']),
  doc('doc-stock-levels', 'Stock', 'État du stock par dépôt à une date donnée', ['stock']),
  doc('doc-stock-moves', 'Stock', 'Achats, réceptions, transferts, pertes et inventaires', ['stock']),
  doc('doc-stock-recipes', 'Stock', 'Recettes, fiches techniques et rendements', ['stock', 'restaurant']),
  doc('doc-payments', 'Finance', 'Relevés Wave, Orange Money, carte et espèces', ['finance']),
  doc('doc-accounting', 'Finance', 'Exports comptables et plan de comptes', ['finance']),
  doc('doc-systems', 'IT', 'Inventaire des logiciels, contrats et licences', ['it']),
  doc('doc-hardware', 'IT', 'Inventaire du matériel et plan réseau', ['it']),
  doc('doc-backups', 'IT', 'Procédure de sauvegarde et dernier test de restauration', ['it']),
  doc('doc-api', 'Données', 'Documentation API, exports et interfaces disponibles', ['data']),
  doc('doc-samples', 'Données', 'Échantillon réel de chaque export critique', ['data']),
];

const VISIT_PLAN = [
  { time: '09:00', duration: '20 min', label: 'Direction', detail: 'Objectifs, périmètre, irritants et priorités.' },
  { time: '09:25', duration: '35 min', label: 'Réception / PMS', detail: 'Réservation, chambre, folio, housekeeping et clôture.' },
  { time: '10:05', duration: '45 min', label: 'Restaurant / caisses', detail: 'Table, commande, cuisine, paiement et rapport Z.' },
  { time: '11:00', duration: '35 min', label: 'Stock / achats', detail: 'Réception, transfert, recette, perte et inventaire.' },
  { time: '11:40', duration: '20 min', label: 'Finance', detail: 'Rapprochements, écarts et comptabilité.' },
  { time: '12:05', duration: '30 min', label: 'IT / données', detail: 'Matériel, réseau, accès, exports et sauvegardes.' },
  { time: '12:40', duration: '15 min', label: 'Débrief', detail: 'Faits critiques, pièces manquantes et prochaines étapes.' },
];

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
const backupImport = document.querySelector('#backup-import');

let workspace = loadWorkspace();
let saveStateTimer;
let persistTimer;

function q(id, label, help, weight = 2, required = false) {
  return { id, label, help, weight, required };
}

function doc(id, domain, label, modules) {
  return { id, domain, label, modules };
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function h(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function loadWorkspace() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed?.version === 1 && Array.isArray(parsed.audits)) return parsed;
  } catch (error) {
    console.warn('Sauvegarde illisible', error);
  }
  return {
    version: 1,
    activeAuditId: null,
    audits: [],
    ui: { view: 'overview', questionnaireDomain: 'direction', questionnaireMode: 'express', terrainTab: 'findings', query: '', severity: 'all' },
  };
}

function persist(showState = true) {
  const audit = activeAudit();
  if (audit) audit.updatedAt = new Date().toISOString();
  workspace.ui.saveError = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch (error) {
    workspace.ui.saveError = true;
    console.error('Sauvegarde locale impossible', error);
    document.querySelectorAll('[data-save-state]').forEach((element) => {
      element.textContent = 'Stockage saturé';
      element.classList.add('save-error');
    });
    if (showState) toast('Stockage local saturé. Exportez la mission en JSON avant de quitter.');
    return false;
  }
  if (showState) {
    document.querySelectorAll('[data-save-state]').forEach((element) => {
      element.textContent = 'Sauvegardé';
      element.classList.remove('save-error');
    });
    clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(() => {
      document.querySelectorAll('[data-save-state]').forEach((element) => {
        element.textContent = 'Autosauvegarde active';
      });
    }, 1200);
  }
  return true;
}

function schedulePersist() {
  clearTimeout(persistTimer);
  document.querySelectorAll('[data-save-state]').forEach((element) => {
    element.textContent = 'Enregistrement...';
  });
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persist();
  }, 450);
}

function activeAudit() {
  return workspace.audits.find((audit) => audit.id === workspace.activeAuditId);
}

function activeDomains(audit) {
  return DOMAINS.filter((domain) => domain.modules.length === 0 || domain.modules.some((module) => audit.modules.includes(module)));
}

function createAudit(data) {
  const modules = data.modules?.length ? data.modules : ['pms', 'restaurant', 'stock', 'finance', 'customer', 'it', 'data'];
  const audit = {
    id: uid('audit'),
    client: data.client.trim(),
    establishment: data.establishment.trim(),
    location: data.location.trim(),
    auditDate: data.auditDate || today(),
    auditor: data.auditor.trim(),
    contact: data.contact?.trim() || '',
    objectives: data.objectives?.trim() || '',
    modules,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    answers: {},
    findings: [],
    interviews: [],
    systems: [{
      id: uid('system'),
      name: 'Orchestra',
      domain: 'pms',
      vendor: 'À confirmer',
      version: 'À confirmer',
      deployment: 'À confirmer',
      users: '',
      api: 'unknown',
      decision: 'assess',
      owner: '',
      notes: 'PMS actuellement utilisé par le complexe hôtelier.',
    }],
    documents: DOCUMENT_TEMPLATES
      .filter((item) => item.modules.some((module) => modules.includes(module)))
      .map((item) => ({ ...item, status: 'requested', note: '' })),
  };
  workspace.audits.unshift(audit);
  workspace.activeAuditId = audit.id;
  workspace.ui.view = 'overview';
  workspace.ui.questionnaireDomain = 'direction';
  persist();
  return audit;
}

function domainMetrics(audit, domain, mode = 'complete') {
  const questions = mode === 'express' ? domain.questions.filter((item) => item.required) : domain.questions;
  const eligible = questions.filter((item) => audit.answers[item.id]?.status !== 'na');
  const answered = questions.filter((item) => Boolean(audit.answers[item.id]?.status));
  const scored = eligible.filter((item) => audit.answers[item.id]?.status);
  const earned = scored.reduce((sum, item) => sum + STATUS[audit.answers[item.id].status].score * item.weight, 0);
  const possible = scored.reduce((sum, item) => sum + 4 * item.weight, 0);
  const score = possible ? Math.round((earned / possible) * 100) : null;
  const risks = questions.filter((item) => ['no', 'partial'].includes(audit.answers[item.id]?.status)).length;
  return { questions, answered: answered.length, total: questions.length, progress: questions.length ? Math.round((answered.length / questions.length) * 100) : 0, score, risks };
}

function auditMetrics(audit) {
  const domains = activeDomains(audit);
  const rows = domains.map((domain) => ({ domain, ...domainMetrics(audit, domain, 'complete') }));
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const answered = rows.reduce((sum, row) => sum + row.answered, 0);
  const scored = rows.filter((row) => row.score !== null);
  const score = scored.length ? Math.round(scored.reduce((sum, row) => sum + row.score, 0) / scored.length) : 0;
  const critical = audit.findings.filter((finding) => finding.severity === 'critical' && finding.status !== 'closed').length;
  const major = audit.findings.filter((finding) => finding.severity === 'major' && finding.status !== 'closed').length;
  const verifiedDocs = audit.documents.filter((item) => item.status === 'verified').length;
  return { domains: rows, total, answered, progress: total ? Math.round((answered / total) * 100) : 0, score, critical, major, verifiedDocs };
}

function render() {
  const audit = activeAudit();
  if (!audit) {
    renderGateway();
    return;
  }
  const metrics = auditMetrics(audit);
  app.innerHTML = `
    <div class="app-shell">
      ${renderHeader(audit)}
      ${renderSidebar(audit, metrics)}
      <main class="audit-main">${renderCurrentView(audit, metrics)}</main>
      ${renderBottomNav(metrics)}
    </div>
  `;
}

function renderGateway() {
  app.innerHTML = `
    <main class="mission-gateway">
      <section class="gateway-panel">
        <div class="gateway-intro">
          <div class="gateway-logo"><img src="../brand-mark.svg" alt=""><span><strong>SÁRTAL AUDIT</strong><small>Diagnostic métier terrain</small></span></div>
          <h1>Comprendre l’existant avant de proposer le futur.</h1>
          <p>Une mission guidée pour auditer hôtel, PMS, restaurant, caisses, stock, matériel et données.</p>
          <div class="gateway-points">
            <div><b>1</b><span>Questionnaire adapté aux métiers</span></div>
            <div><b>2</b><span>Constats et preuves terrain</span></div>
            <div><b>3</b><span>Fonctionnement hors connexion</span></div>
            <div><b>4</b><span>Rapport prêt à imprimer</span></div>
          </div>
        </div>
        <form class="gateway-form" id="create-mission-form">
          <h2>Créer la mission de samedi</h2>
          <p>Ces informations apparaîtront sur le rapport final. Elles restent sur cet appareil.</p>
          <div class="form-grid">
            <label class="field"><span>Client / groupe</span><input name="client" required placeholder="Nom du groupe ou du gérant"></label>
            <label class="field"><span>Établissement</span><input name="establishment" required placeholder="Complexe hôtelier et restaurant"></label>
            <label class="field"><span>Lieu</span><input name="location" placeholder="Ville, adresse ou site"></label>
            <label class="field"><span>Date de visite</span><input name="auditDate" type="date" value="${today()}" required></label>
            <label class="field"><span>Auditeur</span><input name="auditor" required placeholder="Votre nom"></label>
            <label class="field"><span>Contact principal</span><input name="contact" placeholder="Nom, fonction, téléphone"></label>
            <label class="field span-2"><span>Objectif annoncé</span><textarea name="objectives" placeholder="Exemple : cartographier l’existant et préparer le remplacement d’Orchestra et des outils restaurant."></textarea></label>
            <div class="field span-2"><span>Périmètre à auditer</span><div class="module-checks">
              ${MODULES.map((module) => `<label><input type="checkbox" name="modules" value="${module.id}" ${module.id === 'online' ? '' : 'checked'}><span>${module.label}</span></label>`).join('')}
            </div></div>
          </div>
          <button class="primary-button" type="submit" style="width:100%;margin-top:18px">Créer et préparer l’audit</button>
          ${workspace.audits.length ? `<button class="secondary-button" type="button" data-action="open-missions" style="width:100%;margin-top:9px">Reprendre une mission existante</button>` : ''}
        </form>
      </section>
    </main>
  `;
}

function renderHeader(audit) {
  const saveError = workspace.ui.saveError;
  return `
    <header class="audit-header">
      <div class="audit-brand"><img src="../brand-mark.svg" alt=""><span><strong>SÁRTAL AUDIT</strong><small>Diagnostic terrain</small></span></div>
      <div class="audit-header-mission"><small>Mission active</small><strong>${h(audit.establishment)}</strong></div>
      <span class="save-state ${saveError ? 'save-error' : ''}" data-save-state>${saveError ? 'Stockage saturé' : 'Autosauvegarde active'}</span>
      <button class="header-button" data-action="open-missions">Missions</button>
      <button class="icon-button" data-action="open-settings" aria-label="Paramètres de la mission">⋮</button>
    </header>
  `;
}

function renderSidebar(audit, metrics) {
  return `
    <aside class="audit-sidebar">
      <div class="sidebar-context"><span>Audit en cours</span><strong>${h(audit.client || audit.establishment)}</strong><small>${formatDate(audit.auditDate)} · ${h(audit.location || 'Lieu à confirmer')}</small></div>
      <nav class="sidebar-nav" aria-label="Navigation Sártal Audit">
        ${navButton('overview', 'SY', 'Synthèse', `${metrics.progress}%`)}
        ${navButton('questionnaire', 'AU', 'Questionnaire', `${metrics.answered}/${metrics.total}`)}
        ${navButton('terrain', 'TE', 'Terrain et preuves', audit.findings.length)}
        ${navButton('report', 'RA', 'Rapport', metrics.critical + metrics.major)}
      </nav>
      <div class="sidebar-footer">
        <button data-action="export-backup">Sauvegarder la mission</button>
        <button data-action="import-backup">Importer une sauvegarde</button>
      </div>
    </aside>
  `;
}

function navButton(view, icon, label, count) {
  return `<button class="${workspace.ui.view === view ? 'active' : ''}" data-action="navigate" data-view="${view}"><i>${icon}</i><span>${label}</span><b>${count}</b></button>`;
}

function renderBottomNav() {
  const items = [
    ['overview', 'SY', 'Synthèse'],
    ['questionnaire', 'AU', 'Audit'],
    ['terrain', 'TE', 'Terrain'],
    ['report', 'RA', 'Rapport'],
  ];
  return `<nav class="bottom-nav" aria-label="Navigation mobile">${items.map(([view, icon, label]) => `<button class="${workspace.ui.view === view ? 'active' : ''}" data-action="navigate" data-view="${view}"><i>${icon}</i><span>${label}</span></button>`).join('')}</nav>`;
}

function renderCurrentView(audit, metrics) {
  if (workspace.ui.view === 'questionnaire') return renderQuestionnaire(audit, metrics);
  if (workspace.ui.view === 'terrain') return renderTerrain(audit, metrics);
  if (workspace.ui.view === 'report') return renderReport(audit, metrics);
  return renderOverview(audit, metrics);
}

function renderOverview(audit, metrics) {
  const firstIncomplete = metrics.domains.find((row) => row.progress < 100)?.domain.id || metrics.domains[0]?.domain.id || 'direction';
  return `<div class="page-container">
    <header class="page-heading"><div><span class="eyebrow">Mission terrain</span><h1>Votre audit est prêt.</h1><p>Avancez domaine par domaine, consignez uniquement des faits observables et sauvegardez avant de quitter le site.</p></div><div class="action-row"><button class="secondary-button" data-action="open-preparation">Préparer la visite</button><button class="primary-button" data-action="continue-audit" data-domain="${firstIncomplete}">Continuer l’audit</button></div></header>
    <section class="overview-hero">
      <article class="card mission-card"><span class="eyebrow">${h(audit.client || 'Client')}</span><h2>${h(audit.establishment)}</h2><p>${h(audit.objectives || 'Cartographier les outils, sécuriser les données et préparer une trajectoire de remplacement réaliste.')}</p><div class="mission-meta"><span>${formatDate(audit.auditDate)}</span><span>${h(audit.location || 'Lieu à confirmer')}</span><span>${h(audit.auditor)}</span><span>${audit.modules.length} périmètres</span></div></article>
      <article class="card score-card"><div class="score-ring" style="--score:${metrics.score}"><span><strong>${metrics.score}%</strong><small>maturité</small></span></div><div><strong>${metrics.progress}% de l’audit renseigné</strong><small>${metrics.answered} réponses sur ${metrics.total}</small></div></article>
    </section>
    <section class="kpi-grid">
      ${kpi('Questions traitées', `${metrics.answered}/${metrics.total}`, 'Progression globale', 'info')}
      ${kpi('Constats critiques', metrics.critical, 'À confirmer avant le départ', metrics.critical ? 'danger' : '')}
      ${kpi('Constats majeurs', metrics.major, 'À intégrer au plan d’action', metrics.major ? 'warning' : '')}
      ${kpi('Pièces vérifiées', `${metrics.verifiedDocs}/${audit.documents.length}`, 'Exports et preuves reçus', '')}
    </section>
    <section class="overview-grid">
      <article class="card"><div class="card-header"><div><h2>Couverture par domaine</h2><p>Le score reflète seulement les réponses déjà renseignées.</p></div></div><div class="card-body domain-grid">${metrics.domains.map((row) => renderDomainCard(row)).join('')}</div></article>
      <article class="card"><div class="card-header"><div><h2>Parcours conseillé samedi</h2><p>Adaptez les horaires, mais gardez cet ordre.</p></div></div><div class="card-body visit-plan">${VISIT_PLAN.map((item) => `<article><time>${item.time}</time><span><strong>${item.label}</strong><small>${item.detail}</small></span><b>${item.duration}</b></article>`).join('')}</div></article>
    </section>
  </div>`;
}

function kpi(label, value, detail, tone) {
  return `<article class="card kpi ${tone}"><small>${label}</small><strong>${value}</strong><p>${detail}</p></article>`;
}

function renderDomainCard(row) {
  return `<article class="domain-card"><header><div><h3>${row.domain.label}</h3><p>${row.domain.description}</p></div><span class="domain-score">${row.score === null ? 'À démarrer' : `${row.score}%`}</span></header><div class="progress-track"><i style="width:${row.progress}%"></i></div><footer><span>${row.answered}/${row.total} réponses</span><span>${row.risks} point(s) à traiter</span></footer><button data-action="select-domain" data-domain="${row.domain.id}">Ouvrir ce domaine</button></article>`;
}

function renderQuestionnaire(audit) {
  const domains = activeDomains(audit);
  const requestedDomain = domains.find((item) => item.id === workspace.ui.questionnaireDomain) || domains[0];
  workspace.ui.questionnaireDomain = requestedDomain.id;
  const mode = workspace.ui.questionnaireMode || 'express';
  const metrics = domainMetrics(audit, requestedDomain, mode);
  const allMetrics = domainMetrics(audit, requestedDomain, 'complete');
  return `<div class="page-container">
    <header class="page-heading"><div><span class="eyebrow">Questionnaire métier</span><h1>${requestedDomain.label}</h1><p>${requestedDomain.description} Utilisez “À vérifier” lorsqu’une preuve manque.</p></div><div class="action-row"><button class="secondary-button" data-action="add-finding" data-domain="${requestedDomain.id}">Ajouter un constat</button></div></header>
    <section class="questionnaire-toolbar">
      <div class="toolbar-row"><div><strong>${metrics.answered}/${metrics.total} questions du mode ${mode === 'express' ? 'express' : 'complet'}</strong><div class="progress-track" style="width:min(420px,100%);margin-top:7px"><i style="width:${metrics.progress}%"></i></div></div><div class="mode-toggle"><button class="${mode === 'express' ? 'active' : ''}" data-action="question-mode" data-mode="express">Express</button><button class="${mode === 'complete' ? 'active' : ''}" data-action="question-mode" data-mode="complete">Complet (${allMetrics.total})</button></div></div>
      <div class="domain-tabs">${domains.map((domain) => `<button class="${domain.id === requestedDomain.id ? 'active' : ''}" data-action="select-domain" data-domain="${domain.id}">${domain.short} · ${domain.label}</button>`).join('')}</div>
    </section>
    <section class="question-list">${metrics.questions.map((question, index) => renderQuestion(audit, requestedDomain, question, index)).join('')}</section>
  </div>`;
}

function renderQuestion(audit, domain, question, index) {
  const answer = audit.answers[question.id] || {};
  const status = answer.status ? STATUS[answer.status] : null;
  return `<article class="question-card ${status ? `answer-${status.className}` : ''}">
    <header><span class="question-index">${String(index + 1).padStart(2, '0')}</span><div class="question-copy"><h3>${question.label}</h3><p>${question.help}</p></div>${question.required ? '<span class="required-badge">Essentiel</span>' : ''}</header>
    <div class="answer-segments">${Object.entries(STATUS).map(([value, meta]) => `<button data-action="answer" data-question="${question.id}" data-value="${value}" class="${answer.status === value ? 'active' : ''}">${meta.label}</button>`).join('')}</div>
    <div class="question-note"><textarea data-question-note="${question.id}" placeholder="Fait observé, exemple, nom de l’écran, référence ou pièce à demander...">${h(answer.note || '')}</textarea><button data-action="finding-from-question" data-question="${question.id}" data-domain="${domain.id}">Créer un constat</button></div>
  </article>`;
}

function renderTerrain(audit) {
  const tab = workspace.ui.terrainTab || 'findings';
  return `<div class="page-container">
    <header class="page-heading"><div><span class="eyebrow">Terrain et preuves</span><h1>Conserver les faits, pas les impressions.</h1><p>Constats, entretiens, outils et pièces restent liés à la mission et seront repris dans le rapport.</p></div><div class="action-row">${tabActionButton(tab)}</div></header>
    <nav class="section-tabs">${[
      ['findings', `Constats (${audit.findings.length})`],
      ['interviews', `Entretiens (${audit.interviews.length})`],
      ['systems', `Outils (${audit.systems.length})`],
      ['documents', `Pièces (${audit.documents.length})`],
    ].map(([id, label]) => `<button class="${tab === id ? 'active' : ''}" data-action="terrain-tab" data-tab="${id}">${label}</button>`).join('')}</nav>
    ${tab === 'interviews' ? renderInterviews(audit) : tab === 'systems' ? renderSystems(audit) : tab === 'documents' ? renderDocuments(audit) : renderFindings(audit)}
  </div>`;
}

function tabActionButton(tab) {
  if (tab === 'documents') return '<button class="secondary-button" data-action="export-backup">Sauvegarder</button>';
  const labels = { findings: 'Nouveau constat', interviews: 'Nouvel entretien', systems: 'Ajouter un outil' };
  const actions = { findings: 'add-finding', interviews: 'add-interview', systems: 'add-system' };
  return `<button class="primary-button" data-action="${actions[tab]}">${labels[tab]}</button>`;
}

function renderFindings(audit) {
  const query = (workspace.ui.query || '').toLowerCase();
  const severity = workspace.ui.severity || 'all';
  const rows = audit.findings.filter((finding) => (severity === 'all' || finding.severity === severity) && (!query || `${finding.title} ${finding.situation} ${finding.impact} ${finding.recommendation}`.toLowerCase().includes(query)));
  return `<div class="filter-bar"><input data-filter-query placeholder="Rechercher dans les constats" value="${h(workspace.ui.query || '')}"><select data-filter-severity><option value="all">Toutes les criticités</option>${Object.entries(SEVERITIES).map(([value, meta]) => `<option value="${value}" ${severity === value ? 'selected' : ''}>${meta.label}</option>`).join('')}</select><button class="primary-button" data-action="add-finding">Nouveau constat</button></div>
    <section class="item-list">${rows.length ? rows.map(renderFindingCard).join('') : emptyState('Aucun constat pour ce filtre', 'Ajoutez un fait observé, son impact et la recommandation associée.', 'add-finding', 'Créer le premier constat')}</section>`;
}

function renderFindingCard(finding) {
  const domain = DOMAINS.find((item) => item.id === finding.domain);
  return `<article class="list-card"><span class="marker ${finding.severity}">${SEVERITIES[finding.severity]?.short || 'P?'}</span><div><h3>${h(finding.title)}</h3><p>${h(finding.situation)}</p>${finding.impact ? `<p><strong>Impact :</strong> ${h(finding.impact)}</p>` : ''}${finding.recommendation ? `<p><strong>Recommandation :</strong> ${h(finding.recommendation)}</p>` : ''}<small>${h(domain?.label || finding.domain)} · ${formatDateTime(finding.createdAt)} · ${finding.status === 'closed' ? 'Traité' : 'Ouvert'}</small>${finding.attachments?.length ? `<div class="evidence-grid">${finding.attachments.map((image) => `<img src="${image}" alt="Preuve du constat">`).join('')}</div>` : ''}</div><div class="list-actions"><button data-action="edit-finding" data-id="${finding.id}" aria-label="Modifier">MOD</button><button data-action="delete-finding" data-id="${finding.id}" aria-label="Supprimer">SUP</button></div></article>`;
}

function renderInterviews(audit) {
  return `<section class="item-list">${audit.interviews.length ? audit.interviews.map((item) => `<article class="list-card"><span class="marker">${h(item.role.split(' ').map((part) => part[0]).join('').slice(0, 3).toUpperCase())}</span><div><h3>${h(item.role)}${item.name ? ` · ${h(item.name)}` : ''}</h3><p>${h(item.painPoints || 'Aucun irritant saisi.')}</p>${item.needs ? `<p><strong>Attentes :</strong> ${h(item.needs)}</p>` : ''}<small>${h(item.tools || 'Outils non renseignés')} · ${item.duration || 0} min</small></div><div class="list-actions"><button data-action="edit-interview" data-id="${item.id}">MOD</button><button data-action="delete-interview" data-id="${item.id}">SUP</button></div></article>`).join('') : emptyState('Aucun entretien saisi', 'Interviewez au minimum la direction, la réception, la caisse, le stock et l’IT.', 'add-interview', 'Ajouter un entretien')}</section>`;
}

function renderSystems(audit) {
  return `<section class="item-list">${audit.systems.length ? audit.systems.map((item) => `<article class="list-card"><span class="marker">${h((item.domain || 'IT').slice(0, 3).toUpperCase())}</span><div><h3>${h(item.name)}</h3><p>${h(item.vendor || 'Éditeur à confirmer')} · ${h(item.version || 'Version inconnue')} · ${h(item.deployment || 'Déploiement à confirmer')}</p><p><strong>Exports / API :</strong> ${item.api === 'yes' ? 'Disponible' : item.api === 'no' ? 'Absent' : 'À vérifier'} · <strong>Décision :</strong> ${decisionLabel(item.decision)}</p>${item.notes ? `<p>${h(item.notes)}</p>` : ''}<small>${h(item.owner || 'Responsable à identifier')}${item.users ? ` · ${h(item.users)} utilisateur(s)` : ''}</small></div><div class="list-actions"><button data-action="edit-system" data-id="${item.id}">MOD</button><button data-action="delete-system" data-id="${item.id}">SUP</button></div></article>`).join('') : emptyState('Aucun outil recensé', 'Ajoutez les PMS, POS, logiciels de stock, moyens de paiement et outils comptables.', 'add-system', 'Ajouter un outil')}</section>`;
}

function renderDocuments(audit) {
  const verified = audit.documents.filter((item) => item.status === 'verified').length;
  return `<article class="card" style="margin-bottom:14px"><div class="card-body"><strong>${verified}/${audit.documents.length} pièces vérifiées</strong><div class="progress-track" style="margin-top:9px"><i style="width:${audit.documents.length ? Math.round(verified / audit.documents.length * 100) : 0}%"></i></div><p style="color:var(--muted);margin:10px 0 0">“Reçu” signifie que le fichier existe. “Vérifié” signifie que son contenu et ses identifiants ont été contrôlés.</p></div></article><section class="document-list">${audit.documents.map((item) => `<article class="document-row"><div><strong>${h(item.label)}</strong><small>${h(item.domain)}</small></div><select data-document-status="${item.id}">${[
    ['requested', 'Demandé'], ['received', 'Reçu'], ['verified', 'Vérifié'], ['unavailable', 'Indisponible'], ['na', 'Non applicable'],
  ].map(([value, label]) => `<option value="${value}" ${item.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select><input data-document-note="${item.id}" value="${h(item.note || '')}" placeholder="Nom du fichier ou remarque"></article>`).join('')}</section>`;
}

function emptyState(title, body, action, label) {
  return `<div class="empty-state"><strong>${title}</strong><p>${body}</p><button class="primary-button" data-action="${action}">${label}</button></div>`;
}

function renderReport(audit, metrics) {
  const priorities = buildPriorities(audit);
  const summary = metrics.progress < 40
    ? 'L’audit est encore incomplet. Le rapport identifie surtout les zones à vérifier et les pièces manquantes.'
    : metrics.critical
      ? `${metrics.critical} risque(s) critique(s) nécessitent une décision avant toute migration ou remplacement.`
      : metrics.score >= 75
        ? 'Le socle actuel présente plusieurs pratiques maîtrisées. La transformation peut être organisée par étapes contrôlées.'
        : 'Des écarts structurants doivent être traités avant de considérer les données et processus comme fiables.';
  return `<div class="page-container">
    <header class="page-heading no-print"><div><span class="eyebrow">Rapport automatique</span><h1>Préparer la restitution.</h1><p>Le rapport se met à jour avec les réponses, constats, outils et pièces de la mission.</p></div><div class="action-row"><button class="secondary-button" data-action="export-csv">Exporter CSV</button><button class="secondary-button" data-action="export-backup">Sauvegarde JSON</button><button class="primary-button" data-action="print-report">Imprimer / PDF</button></div></header>
    <section class="report-page">
      <article class="card report-cover"><span class="eyebrow">Rapport d’audit des systèmes métier</span><h1>${h(audit.establishment)}</h1><p>${h(summary)}</p><div class="report-meta"><span>${h(audit.client)}</span><span>${formatDate(audit.auditDate)}</span><span>${h(audit.location || 'Lieu à confirmer')}</span><span>Auditeur : ${h(audit.auditor)}</span><span>Couverture : ${metrics.progress}%</span></div></article>
      <article class="card report-section"><header><div><h2>Synthèse exécutive</h2><p>Lecture consolidée des domaines inclus dans la mission.</p></div><strong>${metrics.score}% de maturité observée</strong></header><div class="report-score-grid">${metrics.domains.map((row) => `<article class="report-score"><header><strong>${row.domain.label}</strong><b>${row.score === null ? 'N/A' : `${row.score}%`}</b></header><div class="progress-track"><i style="width:${row.score || 0}%"></i></div><small>${row.answered}/${row.total} réponses · ${row.risks} écart(s)</small></article>`).join('')}</div></article>
      <article class="card report-section"><header><div><h2>Priorités identifiées</h2><p>Constats terrain et contrôles essentiels non conformes.</p></div><strong>${priorities.length} point(s)</strong></header><div class="priority-list">${priorities.length ? priorities.slice(0, 15).map((item) => `<article><b>${item.priority}</b><div><h3>${h(item.title)}</h3><p>${h(item.detail)}</p></div></article>`).join('') : '<p>Aucune priorité n’a encore été identifiée.</p>'}</div></article>
      ${audit.findings.length ? `<article class="card report-section"><header><div><h2>Constats terrain détaillés</h2><p>Faits observés, impacts, recommandations et preuves collectées.</p></div><strong>${audit.findings.length} constat(s)</strong></header><div class="report-findings">${audit.findings.map((finding) => {
        const domain = DOMAINS.find((item) => item.id === finding.domain);
        return `<article><header><b class="report-priority ${finding.severity}">${SEVERITIES[finding.severity]?.short || 'P?'}</b><div><h3>${h(finding.title)}</h3><small>${h(domain?.label || finding.domain)} · ${finding.status === 'closed' ? 'Traité' : finding.status === 'confirmed' ? 'Confirmé' : 'Ouvert'}</small></div></header><p><strong>Observation :</strong> ${h(finding.situation)}</p>${finding.impact ? `<p><strong>Impact :</strong> ${h(finding.impact)}</p>` : ''}${finding.recommendation ? `<p><strong>Recommandation :</strong> ${h(finding.recommendation)}</p>` : ''}${finding.attachments?.length ? `<div class="evidence-grid">${finding.attachments.map((image) => `<img src="${image}" alt="Preuve du constat">`).join('')}</div>` : ''}</article>`;
      }).join('')}</div></article>` : ''}
      ${audit.interviews.length ? `<article class="card report-section"><header><div><h2>Entretiens réalisés</h2><p>Rôles rencontrés, outils utilisés et irritants exprimés.</p></div><strong>${audit.interviews.length} entretien(s)</strong></header><div class="report-interviews">${audit.interviews.map((item) => `<article><header><h3>${h(item.role)}${item.name ? ` · ${h(item.name)}` : ''}</h3><small>${item.duration || 0} min</small></header>${item.tools ? `<p><strong>Outils :</strong> ${h(item.tools)}</p>` : ''}${item.painPoints ? `<p><strong>Irritants :</strong> ${h(item.painPoints)}</p>` : ''}${item.needs ? `<p><strong>Attentes :</strong> ${h(item.needs)}</p>` : ''}</article>`).join('')}</div></article>` : ''}
      <article class="card report-section"><header><div><h2>Cartographie des outils</h2><p>Applications observées et décision à instruire.</p></div><strong>${audit.systems.length} outil(s)</strong></header><div class="item-list">${audit.systems.map((item) => `<article class="list-card"><span class="marker">${h(item.domain.slice(0, 3).toUpperCase())}</span><div><h3>${h(item.name)}</h3><p>${h(item.vendor)} · ${h(item.version)} · ${h(item.deployment)}</p><small>API : ${item.api === 'yes' ? 'oui' : item.api === 'no' ? 'non' : 'à vérifier'} · ${decisionLabel(item.decision)}</small></div></article>`).join('')}</div></article>
      <article class="card report-section"><header><div><h2>Pièces et capacité de migration</h2><p>Disponibilité des données nécessaires au chiffrage et au pilote.</p></div><strong>${metrics.verifiedDocs}/${audit.documents.length} vérifiées</strong></header><div class="document-list">${audit.documents.filter((item) => item.status !== 'na').map((item) => `<article class="document-row"><div><strong>${h(item.label)}</strong><small>${h(item.domain)}</small></div><strong>${documentStatusLabel(item.status)}</strong><span>${h(item.note || '')}</span></article>`).join('')}</div></article>
      <article class="card report-section"><header><div><h2>Trajectoire recommandée</h2><p>À confirmer après réception des données et arbitrage des priorités.</p></div></header><div class="roadmap"><article><small>Étape 1</small><h3>Sécuriser et cartographier</h3><p>Compléter les preuves, figer le périmètre, récupérer les exports et confirmer les responsables.</p></article><article><small>Étape 2</small><h3>Configurer un pilote</h3><p>Reproduire les données réelles sur un restaurant, un dépôt et un parcours PMS contrôlé.</p></article><article><small>Étape 3</small><h3>Basculer progressivement</h3><p>Former, rapprocher les soldes, mesurer les écarts puis étendre site par site.</p></article></div></article>
    </section>
  </div>`;
}

function buildPriorities(audit) {
  const findingRows = audit.findings
    .filter((item) => item.status !== 'closed')
    .map((item) => ({ priority: SEVERITIES[item.severity]?.short || 'P?', title: item.title, detail: item.impact || item.situation, rank: ['critical', 'major', 'medium', 'opportunity'].indexOf(item.severity) }));
  const answerRows = [];
  activeDomains(audit).forEach((domain) => domain.questions.filter((question) => question.required).forEach((question) => {
    const answer = audit.answers[question.id];
    if (!['no', 'partial', 'unknown'].includes(answer?.status)) return;
    answerRows.push({
      priority: answer.status === 'no' ? 'P1' : answer.status === 'partial' ? 'P2' : 'P3',
      title: question.label,
      detail: answer.note || `${domain.label} : preuve ou correction à obtenir.`,
      rank: answer.status === 'no' ? 0 : answer.status === 'partial' ? 1 : 2,
    });
  }));
  return [...findingRows, ...answerRows].sort((a, b) => a.rank - b.rank);
}

function openModal({ title, subtitle = '', content, actions = '', wide = false }) {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${h(title)}" data-modal-panel><header><div><h2>${h(title)}</h2>${subtitle ? `<p>${h(subtitle)}</p>` : ''}</div><button data-action="close-modal" aria-label="Fermer">×</button></header><div class="modal-content">${content}</div>${actions ? `<footer class="modal-actions">${actions}</footer>` : ''}</section></div>`;
}

function closeModal() {
  modalRoot.innerHTML = '';
}

function openFindingModal(existing, prefill = {}) {
  const finding = existing || { id: '', severity: 'major', domain: prefill.domain || workspace.ui.questionnaireDomain || 'direction', title: prefill.title || '', situation: prefill.situation || '', impact: '', recommendation: '', status: 'open', attachments: [] };
  openModal({
    title: existing ? 'Modifier le constat' : 'Nouveau constat',
    subtitle: 'Décrivez un fait précis, son impact et la décision attendue.',
    wide: true,
    content: `<form id="finding-form"><input type="hidden" name="id" value="${h(finding.id)}"><div class="form-grid">
      <label class="field"><span>Criticité</span><select name="severity">${Object.entries(SEVERITIES).map(([value, meta]) => `<option value="${value}" ${finding.severity === value ? 'selected' : ''}>${meta.label}</option>`).join('')}</select></label>
      <label class="field"><span>Domaine</span><select name="domain">${activeDomains(activeAudit()).map((domain) => `<option value="${domain.id}" ${finding.domain === domain.id ? 'selected' : ''}>${domain.label}</option>`).join('')}</select></label>
      <label class="field span-2"><span>Titre du constat</span><input name="title" required value="${h(finding.title)}" placeholder="Exemple : Les ventes bar sont déduites du dépôt restaurant"></label>
      <label class="field span-2"><span>Situation observée</span><textarea name="situation" required>${h(finding.situation)}</textarea></label>
      <label class="field"><span>Impact</span><textarea name="impact" placeholder="Risque client, financier, opérationnel ou données">${h(finding.impact)}</textarea></label>
      <label class="field"><span>Recommandation</span><textarea name="recommendation" placeholder="Action ou contrôle recommandé">${h(finding.recommendation)}</textarea></label>
      <label class="field"><span>Statut</span><select name="status"><option value="open" ${finding.status === 'open' ? 'selected' : ''}>Ouvert</option><option value="confirmed" ${finding.status === 'confirmed' ? 'selected' : ''}>Confirmé</option><option value="closed" ${finding.status === 'closed' ? 'selected' : ''}>Traité</option></select></label>
      <label class="field photo-picker"><span>Photos / preuves</span><input name="photos" type="file" accept="image/*" capture="environment" multiple><small class="photo-note">Maximum 3 images compressées. Elles seront incluses dans la sauvegarde.</small></label>
      ${finding.attachments?.length ? `<div class="span-2 evidence-grid">${finding.attachments.map((image) => `<img src="${image}" alt="Preuve existante">`).join('')}</div>` : ''}
    </div></form>`,
    actions: `<button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="finding-form">Enregistrer le constat</button>`,
  });
}

function openInterviewModal(existing) {
  const item = existing || { id: '', role: '', name: '', duration: 20, tools: '', painPoints: '', needs: '', notes: '' };
  openModal({
    title: existing ? 'Modifier l’entretien' : 'Nouvel entretien',
    subtitle: 'Conservez les faits, exemples et mots utilisés par l’interlocuteur.',
    content: `<form id="interview-form"><input type="hidden" name="id" value="${h(item.id)}"><div class="form-grid">
      <label class="field"><span>Rôle / service</span><input name="role" required value="${h(item.role)}" placeholder="Réceptionniste, manager restaurant..."></label>
      <label class="field"><span>Nom</span><input name="name" value="${h(item.name)}"></label>
      <label class="field"><span>Durée en minutes</span><input name="duration" type="number" min="1" value="${item.duration || 20}"></label>
      <label class="field"><span>Outils utilisés</span><input name="tools" value="${h(item.tools)}" placeholder="Orchestra, caisse, Excel..."></label>
      <label class="field span-2"><span>Irritants et contournements</span><textarea name="painPoints">${h(item.painPoints)}</textarea></label>
      <label class="field span-2"><span>Attentes prioritaires</span><textarea name="needs">${h(item.needs)}</textarea></label>
      <label class="field span-2"><span>Notes complémentaires</span><textarea name="notes">${h(item.notes)}</textarea></label>
    </div></form>`,
    actions: `<button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="interview-form">Enregistrer</button>`,
  });
}

function openSystemModal(existing) {
  const item = existing || { id: '', name: '', domain: 'pms', vendor: '', version: '', deployment: '', users: '', api: 'unknown', decision: 'assess', owner: '', notes: '' };
  openModal({
    title: existing ? 'Modifier l’outil' : 'Ajouter un outil',
    subtitle: 'Recensez aussi les fichiers Excel et les outils informels.',
    content: `<form id="system-form"><input type="hidden" name="id" value="${h(item.id)}"><div class="form-grid">
      <label class="field"><span>Nom de l’outil</span><input name="name" required value="${h(item.name)}" placeholder="Orchestra, logiciel de caisse..."></label>
      <label class="field"><span>Domaine</span><select name="domain">${activeDomains(activeAudit()).map((domain) => `<option value="${domain.id}" ${item.domain === domain.id ? 'selected' : ''}>${domain.label}</option>`).join('')}</select></label>
      <label class="field"><span>Éditeur / prestataire</span><input name="vendor" value="${h(item.vendor)}"></label>
      <label class="field"><span>Version</span><input name="version" value="${h(item.version)}"></label>
      <label class="field"><span>Déploiement</span><select name="deployment"><option value="À confirmer" ${item.deployment === 'À confirmer' ? 'selected' : ''}>À confirmer</option><option value="Cloud" ${item.deployment === 'Cloud' ? 'selected' : ''}>Cloud</option><option value="Serveur local" ${item.deployment === 'Serveur local' ? 'selected' : ''}>Serveur local</option><option value="Poste local" ${item.deployment === 'Poste local' ? 'selected' : ''}>Poste local</option><option value="Hybride" ${item.deployment === 'Hybride' ? 'selected' : ''}>Hybride</option></select></label>
      <label class="field"><span>Nombre d’utilisateurs / postes</span><input name="users" value="${h(item.users)}"></label>
      <label class="field"><span>Exports ou API</span><select name="api"><option value="unknown" ${item.api === 'unknown' ? 'selected' : ''}>À vérifier</option><option value="yes" ${item.api === 'yes' ? 'selected' : ''}>Disponible</option><option value="no" ${item.api === 'no' ? 'selected' : ''}>Absent</option></select></label>
      <label class="field"><span>Orientation</span><select name="decision"><option value="assess" ${item.decision === 'assess' ? 'selected' : ''}>À évaluer</option><option value="keep" ${item.decision === 'keep' ? 'selected' : ''}>À conserver</option><option value="connect" ${item.decision === 'connect' ? 'selected' : ''}>À connecter</option><option value="replace" ${item.decision === 'replace' ? 'selected' : ''}>À remplacer</option><option value="retire" ${item.decision === 'retire' ? 'selected' : ''}>À retirer</option></select></label>
      <label class="field span-2"><span>Responsable / support</span><input name="owner" value="${h(item.owner)}"></label>
      <label class="field span-2"><span>Notes, dépendances et limites</span><textarea name="notes">${h(item.notes)}</textarea></label>
    </div></form>`,
    actions: `<button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="system-form">Enregistrer</button>`,
  });
}

function openMissionSettings() {
  const audit = activeAudit();
  openModal({
    title: 'Paramètres de la mission',
    subtitle: 'Mettez à jour le périmètre sans perdre les réponses existantes.',
    wide: true,
    content: `<form id="mission-settings-form"><div class="form-grid">
      <label class="field"><span>Client / groupe</span><input name="client" required value="${h(audit.client)}"></label>
      <label class="field"><span>Établissement</span><input name="establishment" required value="${h(audit.establishment)}"></label>
      <label class="field"><span>Lieu</span><input name="location" value="${h(audit.location)}"></label>
      <label class="field"><span>Date</span><input name="auditDate" type="date" value="${h(audit.auditDate)}"></label>
      <label class="field"><span>Auditeur</span><input name="auditor" value="${h(audit.auditor)}"></label>
      <label class="field"><span>Contact</span><input name="contact" value="${h(audit.contact)}"></label>
      <label class="field span-2"><span>Objectif</span><textarea name="objectives">${h(audit.objectives)}</textarea></label>
      <div class="field span-2"><span>Périmètre</span><div class="module-checks">${MODULES.map((module) => `<label><input type="checkbox" name="modules" value="${module.id}" ${audit.modules.includes(module.id) ? 'checked' : ''}><span>${module.label}</span></label>`).join('')}</div></div>
    </div></form>`,
    actions: `<button class="danger-button" data-action="delete-audit">Supprimer</button><button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="mission-settings-form">Enregistrer</button>`,
  });
}

function openMissions() {
  openModal({
    title: 'Missions d’audit',
    subtitle: 'Ouvrez une mission existante ou préparez un nouvel établissement.',
    content: `<section class="item-list">${workspace.audits.map((audit) => `<article class="list-card"><span class="marker">${auditMetrics(audit).progress}%</span><div><h3>${h(audit.establishment)}</h3><p>${h(audit.client)} · ${formatDate(audit.auditDate)}</p><small>Dernière sauvegarde ${formatDateTime(audit.updatedAt)}</small></div><div class="list-actions"><button data-action="switch-audit" data-id="${audit.id}">OUV</button></div></article>`).join('')}</section>`,
    actions: `<button class="secondary-button" data-action="close-modal">Fermer</button><button class="primary-button" data-action="new-audit">Nouvelle mission</button>`,
  });
}

function openPreparation() {
  openModal({
    title: 'Préparer la visite de samedi',
    subtitle: 'À vérifier avant de commencer les entretiens.',
    content: `<div class="item-list">${[
      'Confirmer les interlocuteurs : direction, réception, restaurant, stock, finance et IT.',
      'Demander l’autorisation de photographier les écrans, matériels et documents.',
      'Prévoir chargeur, batterie externe et connexion de secours.',
      'Obtenir un accès de consultation aux outils, sans compte administrateur partagé.',
      'Demander un export récent de chaque système critique.',
      'Commencer par observer un parcours réel avant de poser les questions détaillées.',
      'Exporter la sauvegarde JSON avant de quitter l’établissement.',
    ].map((item, index) => `<article class="list-card"><span class="marker">${index + 1}</span><div><h3>${item}</h3></div></article>`).join('')}</div>`,
    actions: `<button class="primary-button" data-action="close-modal">J’ai préparé la visite</button>`,
  });
}

function decisionLabel(value) {
  return ({ assess: 'À évaluer', keep: 'À conserver', connect: 'À connecter', replace: 'À remplacer', retire: 'À retirer' })[value] || 'À évaluer';
}

function documentStatusLabel(value) {
  return ({ requested: 'Demandé', received: 'Reçu', verified: 'Vérifié', unavailable: 'Indisponible', na: 'Non applicable' })[value] || value;
}

function formatDate(value) {
  if (!value) return 'Date à confirmer';
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function toast(message) {
  toastRoot.innerHTML = `<div class="toast">${h(message)}</div>`;
  setTimeout(() => { toastRoot.innerHTML = ''; }, 2600);
}

function downloadBlob(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  const audit = activeAudit();
  downloadBlob(`sartal-audit-${slug(audit.establishment)}-${audit.auditDate}.json`, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), audit }, null, 2), 'application/json');
  toast('Sauvegarde JSON téléchargée.');
}

function exportCsv() {
  const audit = activeAudit();
  const rows = [['Domaine', 'Question', 'Statut', 'Note', 'Essentiel']];
  activeDomains(audit).forEach((domain) => domain.questions.forEach((question) => {
    const answer = audit.answers[question.id] || {};
    rows.push([domain.label, question.label, STATUS[answer.status]?.label || 'Non renseigné', answer.note || '', question.required ? 'Oui' : 'Non']);
  }));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
  downloadBlob(`sartal-audit-${slug(audit.establishment)}-questions.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8');
  toast('Matrice de questionnaire exportée.');
}

function slug(value) {
  return String(value || 'mission').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function compressImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
  const max = 900;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.58);
}

function removeById(collection, id, label) {
  const audit = activeAudit();
  const index = audit[collection].findIndex((item) => item.id === id);
  if (index < 0) return;
  if (!window.confirm(`Supprimer ${label} ?`)) return;
  audit[collection].splice(index, 1);
  persist();
  render();
}

document.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);

  if (form.id === 'create-mission-form') {
    createAudit({
      client: data.get('client'), establishment: data.get('establishment'), location: data.get('location'), auditDate: data.get('auditDate'), auditor: data.get('auditor'), contact: data.get('contact'), objectives: data.get('objectives'), modules: data.getAll('modules'),
    });
    render();
    toast(workspace.ui.saveError ? 'Mission créée dans cette session. Exportez-la en JSON.' : 'Mission créée et sauvegardée.');
  }

  if (form.id === 'finding-form') {
    const audit = activeAudit();
    const id = data.get('id');
    const existing = audit.findings.find((item) => item.id === id);
    const photos = Array.from(data.getAll('photos')).filter((file) => file instanceof File && file.size).slice(0, Math.max(0, 3 - (existing?.attachments?.length || 0)));
    const attachments = [...(existing?.attachments || [])];
    for (const photo of photos) attachments.push(await compressImage(photo));
    const item = {
      id: id || uid('finding'), severity: data.get('severity'), domain: data.get('domain'), title: data.get('title').trim(), situation: data.get('situation').trim(), impact: data.get('impact').trim(), recommendation: data.get('recommendation').trim(), status: data.get('status'), attachments, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    if (existing) Object.assign(existing, item); else audit.findings.unshift(item);
    closeModal();
    const saved = persist();
    render();
    toast(saved ? 'Constat enregistré.' : 'Constat conservé dans cette session. Exportez la mission en JSON.');
  }

  if (form.id === 'interview-form') {
    const audit = activeAudit();
    const id = data.get('id');
    const existing = audit.interviews.find((item) => item.id === id);
    const item = { id: id || uid('interview'), role: data.get('role').trim(), name: data.get('name').trim(), duration: Number(data.get('duration')) || 0, tools: data.get('tools').trim(), painPoints: data.get('painPoints').trim(), needs: data.get('needs').trim(), notes: data.get('notes').trim(), createdAt: existing?.createdAt || new Date().toISOString() };
    if (existing) Object.assign(existing, item); else audit.interviews.unshift(item);
    closeModal();
    const saved = persist();
    render();
    toast(saved ? 'Entretien enregistré.' : 'Entretien conservé dans cette session. Exportez la mission en JSON.');
  }

  if (form.id === 'system-form') {
    const audit = activeAudit();
    const id = data.get('id');
    const existing = audit.systems.find((item) => item.id === id);
    const item = { id: id || uid('system'), name: data.get('name').trim(), domain: data.get('domain'), vendor: data.get('vendor').trim(), version: data.get('version').trim(), deployment: data.get('deployment'), users: data.get('users').trim(), api: data.get('api'), decision: data.get('decision'), owner: data.get('owner').trim(), notes: data.get('notes').trim() };
    if (existing) Object.assign(existing, item); else audit.systems.unshift(item);
    closeModal();
    const saved = persist();
    render();
    toast(saved ? 'Outil enregistré.' : 'Outil conservé dans cette session. Exportez la mission en JSON.');
  }

  if (form.id === 'mission-settings-form') {
    const audit = activeAudit();
    const previousModules = new Set(audit.modules);
    audit.client = data.get('client').trim();
    audit.establishment = data.get('establishment').trim();
    audit.location = data.get('location').trim();
    audit.auditDate = data.get('auditDate');
    audit.auditor = data.get('auditor').trim();
    audit.contact = data.get('contact').trim();
    audit.objectives = data.get('objectives').trim();
    audit.modules = data.getAll('modules');
    DOCUMENT_TEMPLATES.filter((item) => item.modules.some((module) => audit.modules.includes(module) && !previousModules.has(module))).forEach((template) => {
      if (!audit.documents.some((item) => item.id === template.id)) audit.documents.push({ ...template, status: 'requested', note: '' });
    });
    closeModal();
    const saved = persist();
    render();
    toast(saved ? 'Mission mise à jour.' : 'Mission modifiée dans cette session. Exportez-la en JSON.');
  }
});

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const audit = activeAudit();

  if (action === 'close-modal') {
    if (event.target.matches('.modal-backdrop') || target.closest('[data-modal-panel]') === null || target.tagName === 'BUTTON') closeModal();
    return;
  }
  if (action === 'navigate') { workspace.ui.view = target.dataset.view; persist(false); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (action === 'select-domain' || action === 'continue-audit') { workspace.ui.view = 'questionnaire'; workspace.ui.questionnaireDomain = target.dataset.domain; persist(false); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (action === 'question-mode') { workspace.ui.questionnaireMode = target.dataset.mode; persist(false); render(); }
  if (action === 'answer') {
    const questionId = target.dataset.question;
    const current = audit.answers[questionId] || { note: '' };
    audit.answers[questionId] = { ...current, status: target.dataset.value, updatedAt: new Date().toISOString() };
    persist(); render();
  }
  if (action === 'finding-from-question') {
    const domain = DOMAINS.find((item) => item.id === target.dataset.domain);
    const question = domain?.questions.find((item) => item.id === target.dataset.question);
    const answer = audit.answers[target.dataset.question];
    openFindingModal(null, { domain: domain.id, title: question.label, situation: answer?.note || question.help });
  }
  if (action === 'terrain-tab') { workspace.ui.terrainTab = target.dataset.tab; persist(false); render(); }
  if (action === 'add-finding') openFindingModal(null, { domain: target.dataset.domain });
  if (action === 'edit-finding') openFindingModal(audit.findings.find((item) => item.id === target.dataset.id));
  if (action === 'delete-finding') removeById('findings', target.dataset.id, 'ce constat');
  if (action === 'add-interview') openInterviewModal();
  if (action === 'edit-interview') openInterviewModal(audit.interviews.find((item) => item.id === target.dataset.id));
  if (action === 'delete-interview') removeById('interviews', target.dataset.id, 'cet entretien');
  if (action === 'add-system') openSystemModal();
  if (action === 'edit-system') openSystemModal(audit.systems.find((item) => item.id === target.dataset.id));
  if (action === 'delete-system') removeById('systems', target.dataset.id, 'cet outil');
  if (action === 'open-settings') openMissionSettings();
  if (action === 'open-missions') openMissions();
  if (action === 'switch-audit') { workspace.activeAuditId = target.dataset.id; workspace.ui.view = 'overview'; closeModal(); persist(); render(); }
  if (action === 'new-audit') { workspace.activeAuditId = null; closeModal(); persist(false); render(); }
  if (action === 'open-preparation') openPreparation();
  if (action === 'export-backup') exportBackup();
  if (action === 'import-backup') backupImport.click();
  if (action === 'export-csv') exportCsv();
  if (action === 'print-report') window.print();
  if (action === 'delete-audit') {
    if (!window.confirm('Supprimer définitivement cette mission de cet appareil ? Exportez une sauvegarde avant de continuer.')) return;
    workspace.audits = workspace.audits.filter((item) => item.id !== audit.id);
    workspace.activeAuditId = workspace.audits[0]?.id || null;
    closeModal(); persist(false); render();
  }
});

document.addEventListener('input', (event) => {
  const audit = activeAudit();
  if (!audit) return;
  if (event.target.matches('[data-question-note]')) {
    const questionId = event.target.dataset.questionNote;
    audit.answers[questionId] = { ...(audit.answers[questionId] || {}), note: event.target.value, updatedAt: new Date().toISOString() };
    schedulePersist();
  }
  if (event.target.matches('[data-document-note]')) {
    const item = audit.documents.find((row) => row.id === event.target.dataset.documentNote);
    if (item) { item.note = event.target.value; schedulePersist(); }
  }
});

document.addEventListener('change', (event) => {
  const audit = activeAudit();
  if (!audit) return;
  if (event.target.matches('[data-document-status]')) {
    const item = audit.documents.find((row) => row.id === event.target.dataset.documentStatus);
    if (item) { item.status = event.target.value; persist(); render(); }
  }
  if (event.target.matches('[data-filter-severity]')) { workspace.ui.severity = event.target.value; persist(false); render(); }
  if (event.target.matches('[data-filter-query]')) { workspace.ui.query = event.target.value; persist(false); render(); }
});

backupImport.addEventListener('change', async () => {
  const file = backupImport.files?.[0];
  backupImport.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const audit = parsed.audit || parsed;
    if (!audit?.id || !audit?.establishment || !Array.isArray(audit.findings)) throw new Error('Format non reconnu');
    const existing = workspace.audits.findIndex((item) => item.id === audit.id);
    if (existing >= 0) workspace.audits[existing] = audit; else workspace.audits.unshift(audit);
    workspace.activeAuditId = audit.id;
    persist(); render(); toast('Sauvegarde importée.');
  } catch (error) {
    toast(`Import impossible : ${error.message}`);
  }
});

window.addEventListener('beforeunload', () => {
  clearTimeout(persistTimer);
  persist(false);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => console.warn('Service worker non disponible', error)));
}

render();
