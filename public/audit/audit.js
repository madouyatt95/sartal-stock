const STORAGE_KEY = 'sartal-audit-workspace-v1';
const ACCESS_SESSION_KEY = 'sartal-audit-access-v1';
const ACCESS_CODE = '0134';

const MODULES = [
  { id: 'pms', label: 'Hôtel / PMS' },
  { id: 'restaurant', label: 'Restaurant / caisses' },
  { id: 'stock', label: 'Stock / achats' },
  { id: 'finance', label: 'Finance / caisses' },
  { id: 'customer', label: 'Expérience client' },
  { id: 'online', label: 'Vente en ligne' },
  { id: 'it', label: 'Matériel / réseau' },
  { id: 'data', label: 'Données à reprendre' },
];

const PROJECT_TYPES = {
  replacement: {
    label: 'Remplacer un système existant',
    choiceLabel: 'Le client utilise déjà un logiciel',
    choiceDescription: 'Exemple : Orchestra est relié aux caisses et doit être remplacé sans perdre les données.',
    shortLabel: 'Remplacement',
    description: 'Cartographier Orchestra, les caisses et les interfaces afin de conserver, connecter, migrer ou remplacer sans interrompre l’activité.',
    objective: 'Évaluer le système actuel, sécuriser la récupération des données et préparer un remplacement progressif sans rupture d’exploitation.',
    scoreLabel: 'maturité actuelle',
    scoreShortLabel: 'maturité',
    reportTitle: 'Rapport d’audit du système existant',
  },
  greenfield: {
    label: 'Déployer un premier système',
    choiceLabel: 'Le client n’a pas encore de logiciel',
    choiceDescription: 'Il a peut-être déjà des caisses ou des imprimantes, mais aucun système de gestion central.',
    shortLabel: 'Premier déploiement',
    description: 'Partir des opérations et du matériel déjà disponibles pour concevoir la configuration, les données initiales et le plan de mise en service.',
    objective: 'Cadrer le premier système de gestion, vérifier la compatibilité du matériel et préparer un déploiement opérationnel adapté à l’activité.',
    scoreLabel: 'préparation au déploiement',
    scoreShortLabel: 'préparation',
    reportTitle: 'Rapport de cadrage du premier déploiement',
  },
};

const STATUS = {
  yes: { label: 'Oui', score: 4, className: 'good' },
  partial: { label: 'En partie', score: 2, className: 'partial' },
  no: { label: 'Non', score: 0, className: 'bad' },
  unknown: { label: 'Je ne sais pas', score: 1, className: 'unknown' },
  na: { label: 'Non concerné', score: null, className: 'na' },
};

const SEVERITIES = {
  critical: { label: 'Urgent (P1)', short: 'P1' },
  major: { label: 'Important (P2)', short: 'P2' },
  medium: { label: 'À prévoir (P3)', short: 'P3' },
  opportunity: { label: 'Amélioration (P4)', short: 'P4' },
};

const INTERLOCUTORS = [
  { id: 'direction', label: 'Direction', detail: 'Objectifs, organisation, finances et expérience client', domains: ['direction', 'finance', 'customer'] },
  { id: 'reception', label: 'Réception hôtel', detail: 'Réservations, chambres, folios et demandes clients', domains: ['pms', 'customer'] },
  { id: 'restaurant', label: 'Manager restaurant', detail: 'Salle, caisse, cuisine, recettes et stock', domains: ['restaurant', 'finance', 'stock'] },
  { id: 'cashier', label: 'Caissier', detail: 'Encaissements, clôtures, moyens de paiement et écarts', domains: ['restaurant', 'finance'] },
  { id: 'stock', label: 'Responsable stock', detail: 'Achats, dépôts, inventaires, transferts et données produit', domains: ['stock', 'data'] },
  { id: 'it', label: 'Responsable matériel', detail: 'Logiciels, caisses, réseau, sécurité et récupération des données', domains: ['it', 'data'] },
  { id: 'online', label: 'Responsable vente en ligne', detail: 'Catalogue, commandes, préparation, livraison et service client', domains: ['online', 'stock', 'customer'] },
  { id: 'overview', label: 'Tour complet', detail: 'Toutes les activités incluses dans cette mission', domains: ['*'] },
];

const PROOFS_BY_DOMAIN = {
  direction: ['Un organigramme ou la liste des responsables', 'Un rapport récent utilisé par la direction'],
  pms: ['Un dossier de réservation ou un folio réel', 'Un écran de chambre et un export disponible'],
  restaurant: ['Un ticket réel et une clôture de caisse', 'Le parcours d’une commande jusqu’à la cuisine'],
  stock: ['Une fiche de stock ou un inventaire récent', 'Un bon de réception, transfert ou sortie'],
  finance: ['Un rapport X/Z et un exemple d’écart', 'Un relevé de paiement espèces, carte, Wave ou Orange Money'],
  customer: ['Une réclamation ou demande client récente', 'Un exemple de fiche client ou de suivi effectué'],
  online: ['Une commande réelle de bout en bout', 'Un écran de disponibilité, préparation ou livraison'],
  it: ['La référence du matériel et une photo des branchements', 'La méthode de sauvegarde, d’accès ou de support'],
  data: ['Un export réel ouvert et lisible', 'Les champs produit, client, stock ou historique disponibles'],
};

const SIMPLE_QUESTIONS = {
  'dir-01': 'Les trois améliorations les plus importantes attendues du futur système sont-elles clairement écrites ?',
  'dir-02': 'Avez-vous une liste complète des sites, restaurants, dépôts, chambres, tables et caisses concernés ?',
  'dir-03': 'Avez-vous classé les problèmes actuels selon leurs conséquences pour les clients, les équipes et les finances ?',
  'dir-04': 'Pour chaque tâche importante, une personne responsable est-elle clairement désignée ?',
  'dir-05': 'Les chiffres reçus par la direction sont-ils réguliers et suffisamment fiables pour prendre des décisions ?',
  'pms-02': 'Les tarifs, forfaits et règles de séjour sont-ils regroupés au même endroit ?',
  'pos-01': 'Chaque caisse est-elle reliée au bon restaurant, au bon bar ou à la bonne activité ?',
  'pos-02': 'Le plan des tables visible à l’écran correspond-il à la salle réelle ?',
  'data-05': 'Avez-vous décidé combien d’années d’historique doivent être récupérées pour chaque type d’information ?',
  'data-09': 'Les équipes disposent-elles d’une version d’essai pour tester leur travail avant le changement ?',
  'new-dir-01': 'Avez-vous décidé quelles activités équiper en premier ?',
  'new-dir-02': 'Avez-vous compté les sites, restaurants, dépôts, chambres, tables, caisses et utilisateurs à équiper ?',
  'new-dir-03': 'Avez-vous choisi une date de lancement qui évite les périodes les plus chargées ?',
  'new-dir-04': 'Une personne peut-elle prendre les décisions et une personne de chaque métier peut-elle valider les réglages ?',
  'new-dir-05': 'Chaque équipe peut-elle expliquer simplement son travail, du début à la fin ?',
  'new-dir-08': 'Le budget couvre-t-il le logiciel, le matériel, le réseau, l’installation, la formation et l’assistance ?',
  'new-pms-01': 'La liste complète des chambres, catégories, capacités et équipements est-elle prête ?',
  'new-pms-02': 'Les tarifs, saisons, forfaits et règles de séjour sont-ils décidés ?',
  'new-pms-03': 'Avez-vous choisi comment les clients pourront réserver : téléphone, réception, site ou agence ?',
  'new-stk-01': 'Avez-vous listé chaque réserve ou dépôt avec sa personne responsable ?',
  'new-stk-02': 'La liste des produits utilise-t-elle partout les mêmes catégories, unités et formats d’achat ?',
  'new-data-01': 'Pour chaque fichier à préparer avant le lancement, une personne responsable et une date limite sont-elles fixées ?',
  'pms-01': 'La liste des chambres correspond-elle à la réalité aujourd’hui ?',
  'pms-03': 'Quand une réservation arrive par téléphone, par le site ou par une agence, la chambre devient-elle indisponible partout ?',
  'pms-04': 'Le système empêche-t-il de réserver deux fois la même chambre ?',
  'pms-05': 'Tous les réceptionnistes suivent-ils les mêmes étapes pour l’arrivée et le départ d’un client ?',
  'pms-06': 'Quand le compte d’une chambre est modifié, peut-on savoir qui a fait le changement ?',
  'pms-07': 'Une dépense du restaurant peut-elle être ajoutée directement au compte de la bonne chambre ?',
  'pms-08': 'La réception voit-elle immédiatement si une chambre est propre, occupée ou en maintenance ?',
  'pms-09': 'Avant de terminer la journée, le système signale-t-il les comptes de chambre et paiements à corriger ?',
  'pms-11': 'Pouvez-vous récupérer dans des fichiers lisibles les réservations, chambres, clients et paiements d’Orchestra ?',
  'pms-12': 'Savez-vous combien d’années de données Orchestra peuvent être récupérées, sous quel format, à quel coût et sous quel délai ?',
  'pos-03': 'Avez-vous une seule fiche Coca-Cola, même s’il est vendu dans plusieurs restaurants ou caisses ?',
  'pos-04': 'Le même Coca-Cola peut-il avoir un prix différent selon le restaurant ou la caisse ?',
  'pos-05': 'Les plats vont-ils seulement en cuisine et les boissons seulement au bar ?',
  'pos-07': 'Une remise, un offert ou une annulation doit-il être justifié et validé par la bonne personne ?',
  'pos-08': 'Pouvez-vous comparer séparément les encaissements espèces, carte, Wave et Orange Money avec les montants réellement reçus ?',
  'pos-09': 'Pour chaque caisse, connaissez-vous le fonds de départ, le total encaissé et l’écart de fin de service ?',
  'pos-11': 'Pouvez-vous récupérer le détail de chaque article vendu, annulé et payé ?',
  'pos-12': 'Les équipes peuvent-elles continuer à travailler sans Internet puis retrouver toutes les opérations au retour du réseau ?',
  'stk-01': 'Chaque réserve ou dépôt correspond-il à un lieu réel avec une personne responsable ?',
  'stk-03': 'Savez-vous à quelle date le stock de départ a été compté, comment et par qui ?',
  'stk-04': 'À la livraison, distinguez-vous ce qui a été commandé, reçu, refusé et facturé ?',
  'stk-05': 'Lorsqu’un produit change de dépôt, peut-on prouver sa sortie et sa réception ?',
  'stk-06': 'Pour chaque plat, connaissez-vous les ingrédients, les quantités et les pertes de préparation ?',
  'stk-07': 'Quand un Coca-Cola est vendu, le stock baisse-t-il dans la réserve du bon restaurant ?',
  'stk-09': 'Pendant un inventaire, les équipes comptent-elles sans voir le stock attendu, puis les écarts sont-ils chiffrés en FCFA ?',
  'stk-10': 'Pour les produits concernés, utilisez-vous d’abord les plus anciens ou ceux qui périment le plus tôt ?',
  'stk-12': 'Connaissez-vous la valeur réelle du stock, le coût des ingrédients et la marge de chaque produit ?',
  'fin-01': 'Chaque paiement peut-il être relié à une vente, une chambre ou un compte client précis ?',
  'fin-03': 'Chaque caisse fournit-elle un résumé pendant le service et une clôture définitive en fin de journée ?',
  'fin-04': 'Les montants Wave et Orange Money enregistrés en caisse correspondent-ils aux relevés des opérateurs ?',
  'fin-05': 'Une dépense restaurant ajoutée à une chambre n’est-elle comptée qu’une seule fois dans le chiffre d’affaires ?',
  'fin-06': 'Quand une caisse présente un écart, sait-on qui doit l’expliquer et le valider ?',
  'fin-09': 'La comptabilité peut-elle recevoir un fichier utilisable sans tout ressaisir ?',
  'cx-01': 'Un même client est-il reconnu comme une seule personne à l’hôtel, au restaurant et en ligne ?',
  'cx-04': 'Chaque demande client a-t-elle un responsable et reste-t-elle suivie jusqu’à sa résolution ?',
  'cx-07': 'Les parcours Sártal peuvent-ils être ajoutés au site actuel par un lien, un QR code ou une connexion automatique ?',
  'web-01': 'Les prix, photos et disponibilités visibles en ligne correspondent-ils à la liste de produits interne ?',
  'web-02': 'Le site évite-t-il de vendre deux fois le dernier article disponible ?',
  'web-03': 'Dès qu’une commande est confirmée, la quantité est-elle mise de côté jusqu’à sa préparation ou son annulation ?',
  'web-05': 'Le préparateur sait-il où trouver chaque produit et quoi proposer s’il manque ?',
  'web-06': 'Chaque commande est-elle attribuée au bon livreur avec sa zone et le montant à encaisser ?',
  'web-07': 'Pouvez-vous prouver que la commande a bien été remise au client ?',
  'web-09': 'Pouvez-vous comparer les paiements en ligne et à la livraison avec les montants réellement reçus ?',
  'it-01': 'Avez-vous une liste à jour de tous les logiciels, caisses, imprimantes, terminaux et serveurs ?',
  'it-03': 'En cas de coupure d’Internet ou de courant, l’activité peut-elle continuer sans perdre de vente ?',
  'it-04': 'Savez-vous où sont installés les logiciels et comment ils échangent leurs informations ?',
  'it-05': 'Les sauvegardes sont-elles automatiques et avez-vous déjà vérifié qu’elles peuvent être restaurées ?',
  'it-06': 'Chaque employé utilise-t-il son propre compte ?',
  'it-07': 'Chaque employé voit-il uniquement ce dont il a besoin pour son travail ?',
  'it-08': 'Pouvez-vous retrouver au même endroit les pannes, erreurs et modifications importantes ?',
  'it-10': 'Les mots de passe, mises à jour, antivirus et accès à distance sont-ils régulièrement contrôlés ?',
  'data-01': 'Pour chaque liste importante, savez-vous qui doit la tenir correcte et à jour ?',
  'data-02': 'Pouvez-vous récupérer les données de chaque logiciel dans un fichier qui s’ouvre et se réutilise facilement ?',
  'data-03': 'Un produit, un ticket ou une réservation garde-t-il le même numéro dans tous les fichiers récupérés ?',
  'data-04': 'Savez-vous combien de doublons, d’informations manquantes ou d’erreurs existent dans les données ?',
  'data-06': 'Savez-vous quelles informations passent automatiquement d’un logiciel à l’autre, à quel rythme et que faire en cas d’erreur ?',
  'data-07': 'Avez-vous déjà récupéré un vrai fichier de chaque logiciel pour tester la reprise des anciennes données ?',
  'data-08': 'Après la reprise des données, pourrez-vous prouver que les ventes, paiements, stocks et comptes de chambre sont identiques ?',
  'data-10': 'Le jour du changement de système, savez-vous qui intervient, quoi vérifier et comment revenir en arrière si nécessaire ?',
  'new-pms-04': 'Les étapes et documents nécessaires pour l’arrivée et le départ d’un client sont-ils décidés ?',
  'new-pms-05': 'Avez-vous décidé qui pourra modifier, déplacer ou rembourser une somme sur le compte d’une chambre ?',
  'new-pms-06': 'Avez-vous défini qui indique qu’une chambre est sale, propre, contrôlée ou en maintenance ?',
  'new-pms-07': 'Avez-vous décidé comment une dépense restaurant ou minibar sera ajoutée au compte de la bonne chambre ?',
  'new-pms-08': 'Avez-vous défini les vérifications à faire avant de terminer chaque journée de l’hôtel ?',
  'new-pos-03': 'Un même produit gardera-t-il une seule fiche, même avec plusieurs prix ou plusieurs caisses ?',
  'new-pos-04': 'Avez-vous décidé le prix et la taxe de chaque produit pour chaque restaurant ou caisse ?',
  'new-pos-05': 'Avez-vous décidé quels tickets vont en cuisine, au bar ou au dessert ?',
  'new-pos-07': 'Les comptes espèces, carte, Wave et Orange Money sont-ils prêts et séparés ?',
  'new-pos-08': 'Avez-vous défini comment ouvrir, contrôler et fermer chaque caisse ?',
  'new-pos-09': 'Pouvez-vous tester chaque caisse, imprimante, tiroir et terminal déjà disponible ?',
  'new-pos-10': 'Avez-vous décidé comment les équipes travailleront pendant une coupure d’Internet ou de courant ?',
  'new-stk-03': 'Avez-vous prévu une date, une méthode et un responsable pour compter le stock de départ ?',
  'new-stk-05': 'Avez-vous défini les étapes entre la commande au fournisseur, la livraison, le refus éventuel et la facture ?',
  'new-stk-06': 'Les ingrédients et quantités des plats les plus vendus sont-ils prêts ?',
  'new-stk-07': 'Avez-vous choisi quelle réserve doit baisser pour chaque restaurant ou caisse ?',
  'new-stk-09': 'Avez-vous décidé quand compter chaque famille de produits et à partir de quel niveau recommander ?',
  'new-fin-04': 'Avez-vous défini l’heure de fin de journée et la personne qui valide chaque clôture de caisse ?',
  'new-fin-06': 'Savez-vous exactement quel fichier la comptabilité souhaite recevoir ?',
  'new-fin-07': 'Dès le premier jour, pourrez-vous comparer les ventes aux espèces, cartes, Wave, Orange Money et banque ?',
  'new-cx-04': 'Avez-vous listé les sites, numéros WhatsApp, téléphones, QR codes et réseaux sociaux à relier ?',
  'new-web-02': 'Avez-vous décidé à quel moment un produit est mis de côté pour éviter de vendre deux fois le dernier article ?',
  'new-web-04': 'Avez-vous défini comment le préparateur trouve, contrôle et remplace les produits du panier ?',
  'new-web-06': 'Avez-vous défini comment attribuer une commande au livreur, encaisser et prouver la remise ?',
  'new-web-07': 'Les comptes Wave, Orange Money, carte et espèces sont-ils prêts pour comparer commandes et encaissements ?',
  'new-it-02': 'Pouvez-vous vérifier que les caisses et imprimantes fonctionneront avec Sártal ?',
  'new-it-05': 'Avez-vous une connexion Internet de secours si la connexion principale tombe ?',
  'new-it-08': 'Avez-vous défini les règles de mot de passe, de double vérification et d’accès à distance ?',
  'new-it-09': 'En cas de panne, chacun sait-il qui appeler, à quelles heures et sous quel délai ?',
  'new-it-10': 'Pouvez-vous tester les données, les droits, le réseau et les imprimantes avant le vrai lancement ?',
  'new-data-02': 'Avez-vous décidé comment nommer et numéroter les produits, dépôts, chambres, caisses et utilisateurs ?',
  'new-data-03': 'Les fichiers à remplir pour charger les premières données sont-ils prêts et sans doublons importants ?',
  'new-data-04': 'Avez-vous choisi un premier site, une caisse et une petite équipe pour tester avant le lancement général ?',
  'new-data-05': 'Avez-vous préparé des tests concrets de vente, paiement, stock, annulation et coupure ?',
  'new-data-06': 'Chaque métier aura-t-il une formation pratique avant le lancement ?',
  'new-data-07': 'Qui décidera, le jour du lancement, si tout est prêt ou s’il faut reporter ?',
  'new-data-08': 'Avez-vous défini ce qui devra être contrôlé après la première vente et la première clôture ?',
};

const SIMPLE_TEXT_REPLACEMENTS = [
  [/\bLe périmètre des\b/g, 'La liste des'],
  [/\bselon le périmètre\b/gi, 'selon les activités prévues'],
  [/\bChaque processus critique\b/g, 'Chaque tâche importante'],
  [/\bLa profondeur historique\b/g, 'Le nombre d’années d’historique'],
  [/\bUn environnement de test\b/g, 'Une version d’essai'],
  [/\bréférentiel produit\b/gi, 'liste de produits'],
  [/\bréférentiel des chambres\b/gi, 'liste des chambres'],
  [/\bréférentiel\b/gi, 'liste de référence'],
  [/\bPOS\b/g, 'point de vente'],
  [/\bPMS\b/g, 'logiciel hôtelier'],
  [/\bfolios?\b/gi, 'comptes de chambre'],
  [/\bhousekeeping\b/gi, 'nettoyage des chambres'],
  [/\bcheck-in\/check-out\b/gi, 'arrivée et départ du client'],
  [/\bcheck-in\b/gi, 'arrivée du client'],
  [/\bcheck-out\b/gi, 'départ du client'],
  [/\bpackages?\b/gi, 'forfaits'],
  [/\bOTA\b/g, 'sites de réservation'],
  [/\bsurbooking\b/gi, 'trop de réservations'],
  [/\bno-show\b/gi, 'clients absents'],
  [/\bimputées?\b/gi, 'ajoutées'],
  [/\bimputation\b/gi, 'ajout'],
  [/\bsans ressaisie\b/gi, 'sans retaper les informations'],
  [/\brapprochables?\b/gi, 'comparables aux montants réellement reçus'],
  [/\brapprochement\b/gi, 'comparaison des montants'],
  [/\boffline\b/gi, 'sans Internet'],
  [/\broutage\b/gi, 'envoi au bon poste'],
  [/\bpicking\b/gi, 'préparation du panier'],
  [/\bdispatch\b/gi, 'attribution au livreur'],
  [/\bFIFO\/FEFO\b/g, 'sortie des produits les plus anciens ou proches de la péremption'],
  [/\bécarts valorisés\b/gi, 'écarts chiffrés en FCFA'],
  [/\bvalorisation\b/gi, 'valeur du stock en FCFA'],
  [/\bcoût matière\b/gi, 'coût des ingrédients'],
  [/\baxes analytiques\b/gi, 'répartition par activité ou service'],
  [/\bAPI, webhooks et fréquences de synchronisation\b/gi, 'connexions automatiques entre logiciels et leur fréquence de mise à jour'],
  [/\bAPI\b/g, 'connexion automatique'],
  [/\bwebhooks?\b/gi, 'alertes automatiques entre logiciels'],
  [/\bmigration\b/gi, 'reprise des anciennes données'],
  [/\bbascule\b/gi, 'changement de système'],
  [/\bgo\/no-go\b/gi, 'décision de démarrer ou reporter'],
  [/\bMFA\b/g, 'double vérification à la connexion'],
  [/\bcloud\b/gi, 'hébergement en ligne'],
  [/\barchitecture locale\b/gi, 'installation sur place'],
  [/\bflux entre systèmes\b/gi, 'échanges entre logiciels'],
  [/\bformalisés?\b/gi, 'écrits'],
  [/\bpriorisés?\b/gi, 'classés par importance'],
  [/\bpérimètre\b/gi, 'activités concernées'],
  [/\bprocessus critiques?\b/gi, 'tâches importantes'],
  [/\bindicateurs\b/gi, 'chiffres utiles'],
  [/\bparamétrables?\b/gi, 'modifiables dans les réglages'],
  [/\bcentralisés?\b/gi, 'regroupés au même endroit'],
  [/\btraçable\b/gi, 'avec un historique des actions'],
  [/\bjournal d’audit\b/gi, 'historique des modifications'],
  [/\bprofondeur historique\b/gi, 'nombre d’années d’historique'],
  [/\bcartographie\b/gi, 'liste'],
  [/\bdécrémenté\b/gi, 'diminué'],
  [/\bscénarios de recette\b/gi, 'tests avant lancement'],
  [/\benvironnement de test\b/gi, 'version d’essai'],
  [/\bpilote limité\b/gi, 'premier test à petite échelle'],
  [/\bconventions de nommage\b/gi, 'règles pour nommer les éléments'],
  [/\bmodèles d’import\b/gi, 'fichiers à remplir pour charger les données'],
  [/\bprocédure d’escalade\b/gi, 'liste des personnes à appeler si le problème continue'],
  [/\bconsentements\b/gi, 'autorisations données par le client'],
  [/\bconsentement\b/gi, 'autorisation donnée par le client'],
  [/\bescalade\b/gi, 'personne suivante à prévenir'],
  [/\breprise de service\b/gi, 'solution proposée au client'],
  [/\bmulti-activité\b/gi, 'utilisation dans plusieurs activités'],
  [/\bconditionnements?\b/gi, 'formats d’achat'],
  [/\bcriticité\b/gi, 'importance'],
  [/\bscénarios métier\b/gi, 'situations réelles'],
  [/\bsupport\b/gi, 'assistance'],
];

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

const GREENFIELD_DOMAINS = [
  {
    id: 'direction', short: 'PROJ', label: 'Projet et organisation', modules: [],
    description: 'Périmètre, volumes, responsabilités, calendrier et critères de réussite du premier déploiement.',
    questions: [
      q('new-dir-01', 'Les activités à équiper et leur ordre de priorité sont décidés.', 'Restaurant, hôtel, stock, livraison, caisse, finance et expérience client.', 3, true),
      q('new-dir-02', 'Les sites, points de vente, dépôts, chambres, tables et postes sont recensés.', 'Mesurer les volumes actuels et ceux prévus à douze mois.', 3, true),
      q('new-dir-03', 'Une date cible réaliste et les périodes à éviter sont identifiées.', 'Ouverture, haute saison, événements, clôtures et indisponibilités des équipes.', 3, true),
      q('new-dir-04', 'Un responsable de décision et un référent par métier sont nommés.', 'Direction, restaurant, stock, finance, IT et hôtel selon le périmètre.', 3, true),
      q('new-dir-05', 'Les processus actuels, même manuels, peuvent être expliqués de bout en bout.', 'Observer qui fait quoi, avec quel document, quel contrôle et quelle validation.', 3, true),
      q('new-dir-06', 'Les règles de remises, annulations, pertes, crédits et validations sont décidées.', 'Éviter de numériser des pratiques encore contradictoires.', 2, false),
      q('new-dir-07', 'Les indicateurs attendus par la direction sont priorisés.', 'Chiffre d’affaires, marge, stock, pertes, caisse, occupation et satisfaction.', 2, false),
      q('new-dir-08', 'Le budget inclut logiciel, matériel, réseau, installation, formation et support.', 'Distinguer investissement initial et coûts récurrents.', 3, true),
    ],
  },
  {
    id: 'pms', short: 'PMS', label: 'Organisation hôtel et futur PMS', modules: ['pms'],
    description: 'Données chambres, réservations, folios, housekeeping et règles à configurer.',
    questions: [
      q('new-pms-01', 'La liste des chambres, catégories, capacités et équipements est prête.', 'Inclure chambres indisponibles, communicantes et contraintes particulières.', 3, true),
      q('new-pms-02', 'Les tarifs, saisons, packages, entreprises et règles d’occupation sont définis.', 'Identifier les décisions encore dépendantes de la direction.', 3, true),
      q('new-pms-03', 'Les canaux de réservation à ouvrir sont choisis.', 'Téléphone, réception, site, agences, OTA et réservation sur place.', 2, false),
      q('new-pms-04', 'Le parcours check-in/check-out et les documents obligatoires sont formalisés.', 'Identité, garantie, acompte, clé, facture, consentement et solde.', 3, true),
      q('new-pms-05', 'Les règles de folio, acompte, transfert, correction et remboursement sont décidées.', 'Préciser les rôles autorisés et les justificatifs nécessaires.', 3, true),
      q('new-pms-06', 'Les statuts et responsabilités housekeeping/maintenance sont définis.', 'Sale, propre, contrôlée, occupée, bloquée, maintenance et priorités.', 3, true),
      q('new-pms-07', 'L’imputation des consommations restaurant et minibar sur chambre est cadrée.', 'Recherche client, autorisation, plafond, signature et rapprochement.', 3, true),
      q('new-pms-08', 'La clôture de nuit et les contrôles avant changement de journée sont définis.', 'Folios, no-show, paiements, consommations, caisse et anomalies.', 2, false),
    ],
  },
  {
    id: 'restaurant', short: 'POS', label: 'Restaurant et futures caisses', modules: ['restaurant'],
    description: 'Points de vente, salle, commandes, production, encaissement et matériel de caisse.',
    questions: [
      q('new-pos-01', 'Chaque point de vente, zone de service et caisse à équiper est identifié.', 'Restaurant, terrasse, comptoir, room service et autres activités.', 3, true),
      q('new-pos-02', 'Les plans de salle, tables, capacités et règles de réservation sont disponibles.', 'Prévoir déplacements, regroupements et transferts de table.', 2, false),
      q('new-pos-03', 'Le catalogue initial est structuré sans créer un produit par prix ou par caisse.', 'Un produit unique doit pouvoir porter plusieurs prix et disponibilités.', 3, true),
      q('new-pos-04', 'Les prix, taxes et services sont décidés par point de vente.', 'Tester le même produit vendu à des prix différents selon le POS.', 3, true),
      q('new-pos-05', 'Le routage cuisine, boisson, dessert et imprimantes est cartographié.', 'Associer chaque famille au bon poste de préparation et au secours prévu.', 3, true),
      q('new-pos-06', 'Les droits de remise, offert, annulation et repas du personnel sont définis.', 'Rôle, plafond, motif, approbation et impact stock.', 3, true),
      q('new-pos-07', 'Les moyens de paiement à accepter et leurs comptes de rapprochement sont prêts.', 'Espèces, carte, Wave, Orange Money, crédit et chambre.', 3, true),
      q('new-pos-08', 'La procédure d’ouverture, fonds, contrôle X/Z et clôture de caisse est décidée.', 'Responsable, horaires, écart, justification et validation.', 3, true),
      q('new-pos-09', 'Le matériel de caisse existant est inventorié et testable.', 'Écran, unité centrale, tiroir, imprimante, terminal, scanner et connectique.', 3, true),
      q('new-pos-10', 'Le fonctionnement attendu pendant une coupure réseau ou électrique est défini.', 'Mode dégradé, reprise, synchronisation et responsable de décision.', 2, false),
    ],
  },
  {
    id: 'stock', short: 'STK', label: 'Stock, achats et données initiales', modules: ['stock'],
    description: 'Dépôts, catalogue, fournisseurs, recettes, inventaire initial et règles de mouvement.',
    questions: [
      q('new-stk-01', 'Les dépôts physiques et leurs responsables sont clairement délimités.', 'Central, cuisine, restaurant, froid, réserve et préparation.', 3, true),
      q('new-stk-02', 'Le catalogue produit initial possède catégories, unités et conditionnements cohérents.', 'Unité, carton, pack, kilogramme, litre et conversions fournisseur.', 3, true),
      q('new-stk-03', 'Une méthode d’inventaire initial avec date et validation est planifiée.', 'Comptage à l’aveugle, écarts, valorisation et gel des mouvements.', 3, true),
      q('new-stk-04', 'Les fournisseurs, délais, tarifs et conditions d’achat sont recensés.', 'Contacts, minimum, livraison, paiement et produits habituels.', 3, true),
      q('new-stk-05', 'Le processus commande, réception, refus et facture est défini.', 'Séparer demandé, reçu, accepté et facturé.', 3, true),
      q('new-stk-06', 'Les recettes et portions prioritaires sont disponibles pour le démarrage.', 'Ingrédients, unités, rendement, sous-recettes et pertes cuisson.', 3, true),
      q('new-stk-07', 'Chaque POS est associé au dépôt qui doit réellement être décrémenté.', 'Valider le comportement pour un même produit vendu dans plusieurs points de vente.', 3, true),
      q('new-stk-08', 'Les motifs de perte, casse, péremption et consommation interne sont décidés.', 'Définir preuves et niveaux de validation.', 2, false),
      q('new-stk-09', 'La fréquence d’inventaire et les seuils de réapprovisionnement sont définis.', 'Adapter par famille, valeur, criticité et délai fournisseur.', 2, false),
    ],
  },
  {
    id: 'finance', short: 'FIN', label: 'Paiements, caisse et finance', modules: ['finance'],
    description: 'Contrats de paiement, règles de caisse, fiscalité, rapprochement et comptabilité.',
    questions: [
      q('new-fin-01', 'Les comptes Wave, Orange Money, carte et banque à utiliser sont identifiés.', 'Titulaire, terminal, frais, versement et accès aux relevés.', 3, true),
      q('new-fin-02', 'Les règles de fonds de caisse, retrait, dépense et remboursement sont définies.', 'Justificatif, plafond, auteur et validation.', 3, true),
      q('new-fin-03', 'Les taxes, services, exonérations et règles de facturation sont confirmés.', 'Faire valider les règles applicables avant configuration.', 3, true),
      q('new-fin-04', 'La journée métier et les responsabilités de clôture sont décidées.', 'Horaires, rapport Z, écart, approbation et conservation.', 3, true),
      q('new-fin-05', 'Les comptes clients, crédits et acomptes à reprendre au démarrage sont recensés.', 'Solde, preuve, échéance et responsable de validation.', 2, false),
      q('new-fin-06', 'Le format attendu par la comptabilité est connu.', 'Plan de comptes, journaux, axes analytiques, périodicité et pièces.', 3, true),
      q('new-fin-07', 'Une méthode de rapprochement du premier jour est prévue.', 'Ventes, paiements, caisse physique, mobile money et banque.', 3, true),
    ],
  },
  {
    id: 'customer', short: 'CX', label: 'Expérience client à concevoir', modules: ['customer'],
    description: 'Identité, préférences, demandes, réclamations et canaux à relier.',
    questions: [
      q('new-cx-01', 'Les informations client réellement nécessaires sont décidées.', 'Identité, téléphone, e-mail, langue, historique et consentement.', 3, true),
      q('new-cx-02', 'Les allergies, préférences et occasions spéciales ont un traitement défini.', 'Saisie, visibilité, confidentialité et responsabilité.', 3, true),
      q('new-cx-03', 'Les demandes et réclamations suivent un responsable et un délai.', 'Promesse, escalade, geste commercial et confirmation de résolution.', 3, true),
      q('new-cx-04', 'Les canaux existants à intégrer sont recensés.', 'Site, WhatsApp, téléphone, QR, réseaux sociaux et réservation.', 3, true),
      q('new-cx-05', 'Le programme de fidélité est soit défini, soit explicitement reporté.', 'Éviter un mécanisme incompris au lancement.', 2, false),
      q('new-cx-06', 'Les messages et responsabilités avant, pendant et après service sont définis.', 'Confirmation, retard, indisponibilité, avis et reprise de service.', 2, false),
    ],
  },
  {
    id: 'online', short: 'WEB', label: 'Vente en ligne à lancer', modules: ['online'],
    description: 'Catalogue, stock promis, paiement, préparation, livraison et service client.',
    questions: [
      q('new-web-01', 'L’offre en ligne, ses catégories, prix et photos sont prêtes.', 'Distinguer les produits disponibles en ligne du catalogue interne.', 3, true),
      q('new-web-02', 'La règle de stock disponible et de réservation est décidée.', 'Éviter de vendre deux fois le dernier article.', 3, true),
      q('new-web-03', 'Les zones, frais, délais et minimums de livraison sont définis.', 'Quartiers, distance, créneau, surcharge et exceptions.', 3, true),
      q('new-web-04', 'Le parcours de picking et de contrôle du panier est défini.', 'Emplacement, quantité, substitution et validation finale.', 3, true),
      q('new-web-05', 'Les règles de substitution et de contact client sont décidées.', 'Alternative, différence de prix, refus et délai de réponse.', 2, false),
      q('new-web-06', 'Les livreurs, tournées, encaissements et preuves de remise sont cadrés.', 'Code, signature, photo, GPS, incident et retour dépôt.', 3, true),
      q('new-web-07', 'Les paiements en ligne et à la livraison sont prêts à être rapprochés.', 'Wave, Orange Money, carte et espèces livreur.', 3, true),
    ],
  },
  {
    id: 'it', short: 'IT', label: 'Matériel, réseau et sécurité', modules: ['it'],
    description: 'Compatibilité du matériel existant, couverture réseau, continuité et support.',
    questions: [
      q('new-it-01', 'Tout le matériel disponible est inventorié avec photo, modèle et état.', 'Caisses, écrans, imprimantes, tiroirs, scanners, terminaux et serveurs.', 3, true),
      q('new-it-02', 'Les systèmes d’exploitation, ports et pilotes peuvent être vérifiés.', 'Compatibilité, droits administrateur, mises à jour et connectique.', 3, true),
      q('new-it-03', 'Les imprimantes et tiroirs peuvent être testés sur chaque poste.', 'USB, série, réseau, Bluetooth, modèle et consommables.', 3, true),
      q('new-it-04', 'Le réseau et le Wi-Fi couvrent toutes les zones d’utilisation.', 'Salle, cuisine, caisse, dépôt, réception, étages et bureaux.', 3, true),
      q('new-it-05', 'La connexion Internet principale et une solution de secours sont prévues.', 'Fibre, 4G/5G, opérateur, débit, stabilité et bascule.', 3, true),
      q('new-it-06', 'L’alimentation électrique des postes critiques est protégée.', 'Onduleur, groupe, autonomie et arrêt propre.', 3, true),
      q('new-it-07', 'Les utilisateurs et rôles à créer sont recensés individuellement.', 'Éviter les comptes partagés dès le démarrage.', 3, true),
      q('new-it-08', 'Les règles de mots de passe, accès distant et administration sont définies.', 'MFA, prestataire, journal d’accès et révocation.', 2, false),
      q('new-it-09', 'Un responsable du support et une procédure d’escalade sont identifiés.', 'Heures couvertes, contact, délai et matériel de secours.', 3, true),
      q('new-it-10', 'Un environnement de test peut être installé avant le lancement.', 'Tester données, droits, réseau, imprimantes et scénarios métier.', 3, true),
    ],
  },
  {
    id: 'data', short: 'DATA', label: 'Configuration et mise en service', modules: ['data'],
    description: 'Données initiales, pilote, formation, validation et ouverture opérationnelle.',
    questions: [
      q('new-data-01', 'Les fichiers de configuration initiale ont un propriétaire et une date limite.', 'Produits, prix, fournisseurs, chambres, utilisateurs, clients et soldes.', 3, true),
      q('new-data-02', 'Les conventions de nommage et identifiants sont décidées.', 'Produit, POS, dépôt, chambre, caisse, utilisateur et fournisseur.', 3, true),
      q('new-data-03', 'Les modèles d’import peuvent être renseignés sans doublons majeurs.', 'Contrôler champs obligatoires, unités, numéros et références.', 3, true),
      q('new-data-04', 'Un pilote limité est choisi avant le déploiement général.', 'Un site, un POS, un dépôt et une équipe représentative.', 3, true),
      q('new-data-05', 'Les scénarios de recette couvrent ventes, stock, paiement et erreurs.', 'Prévoir cas normaux, annulations, coupure, retour et rapprochement.', 3, true),
      q('new-data-06', 'La formation est planifiée par rôle avec validation des acquis.', 'Direction, manager, caisse, service, stock, finance et support.', 3, true),
      q('new-data-07', 'Le jour de mise en service possède responsables et critères go/no-go.', 'Données chargées, matériel testé, assistance, sauvegarde et décision.', 3, true),
      q('new-data-08', 'Les contrôles du premier jour et de la première clôture sont définis.', 'Ventes, paiements, stocks, impressions, écarts et incidents.', 3, true),
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

const GREENFIELD_DOCUMENT_TEMPLATES = [
  doc('new-doc-scope', 'Projet', 'Liste des sites, activités, POS, dépôts et responsables', []),
  doc('new-doc-team', 'Projet', 'Liste des employés, rôles et affectations prévues', []),
  doc('new-doc-pms-rooms', 'PMS', 'Liste des chambres, catégories, capacités et tarifs', ['pms']),
  doc('new-doc-pms-rules', 'PMS', 'Règles de réservation, check-in, folio et clôture', ['pms']),
  doc('new-doc-pos-map', 'Restaurant', 'Liste des caisses, plans de salle et postes de production', ['restaurant']),
  doc('new-doc-pos-menu', 'Restaurant', 'Menus, produits, prix et taxes par point de vente', ['restaurant']),
  doc('new-doc-stock-products', 'Stock', 'Catalogue initial avec catégories, unités et conditionnements', ['stock']),
  doc('new-doc-stock-count', 'Stock', 'Feuille et procédure de comptage du stock initial', ['stock']),
  doc('new-doc-suppliers', 'Stock', 'Fournisseurs, tarifs, délais et conditions d’achat', ['stock']),
  doc('new-doc-recipes', 'Stock', 'Recettes et fiches techniques prioritaires', ['stock', 'restaurant']),
  doc('new-doc-payments', 'Finance', 'Comptes et contrats Wave, Orange Money, carte et banque', ['finance']),
  doc('new-doc-tax', 'Finance', 'Règles fiscales, facturation et plan comptable attendu', ['finance']),
  doc('new-doc-online', 'Vente en ligne', 'Catalogue en ligne, zones, tarifs et règles de livraison', ['online']),
  doc('new-doc-hardware', 'IT', 'Inventaire du matériel avec modèles, photos et état', ['it']),
  doc('new-doc-network', 'IT', 'Plan réseau, accès Internet, Wi-Fi et alimentation de secours', ['it']),
  doc('new-doc-imports', 'Données', 'Fichiers de configuration initiale complétés', ['data']),
  doc('new-doc-acceptance', 'Données', 'Scénarios de recette et critères de mise en service', ['data']),
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

const GREENFIELD_VISIT_PLAN = [
  { time: '09:00', duration: '25 min', label: 'Direction', detail: 'Activités, priorités, volumes, calendrier et critères de réussite.' },
  { time: '09:30', duration: '40 min', label: 'Opérations terrain', detail: 'Observer le service actuel, les documents et les validations manuelles.' },
  { time: '10:15', duration: '35 min', label: 'Caisses et matériel', detail: 'Inventorier et tester postes, imprimantes, tiroirs, terminaux et connectique.' },
  { time: '10:55', duration: '35 min', label: 'Stock et achats', detail: 'Dépôts, produits, unités, fournisseurs, recettes et inventaire initial.' },
  { time: '11:35', duration: '25 min', label: 'Paiements et finance', detail: 'Wave, Orange Money, espèces, carte, taxes et clôture.' },
  { time: '12:05', duration: '30 min', label: 'Réseau et lancement', detail: 'Wi-Fi, Internet, alimentation, utilisateurs, pilote et formation.' },
  { time: '12:40', duration: '20 min', label: 'Débrief de cadrage', detail: 'Matériel réutilisable, décisions manquantes, pilote et prochaines pièces.' },
];

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');
const backupImport = document.querySelector('#backup-import');

let workspace = loadWorkspace();
let saveStateTimer;
let persistTimer;
let auditUnlocked = readAccessSession();

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

function readAccessSession() {
  try {
    return sessionStorage.getItem(ACCESS_SESSION_KEY) === 'granted';
  } catch {
    return false;
  }
}

function writeAccessSession(unlocked) {
  auditUnlocked = unlocked;
  try {
    if (unlocked) sessionStorage.setItem(ACCESS_SESSION_KEY, 'granted');
    else sessionStorage.removeItem(ACCESS_SESSION_KEY);
  } catch {
    // Le verrou reste actif en memoire lorsque le stockage de session est indisponible.
  }
}

function loadWorkspace() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed?.version === 1 && Array.isArray(parsed.audits)) {
      parsed.audits = parsed.audits.map((audit) => normalizeAudit(audit));
      parsed.ui = { view: 'overview', questionnaireDomain: 'direction', questionnaireMode: 'express', guidedPersona: '', guidedIndex: 0, terrainTab: 'findings', query: '', severity: 'all', ...(parsed.ui || {}) };
      return parsed;
    }
  } catch (error) {
    console.warn('Sauvegarde illisible', error);
  }
  return {
    version: 1,
    activeAuditId: null,
    audits: [],
    ui: { view: 'overview', questionnaireDomain: 'direction', questionnaireMode: 'express', guidedPersona: '', guidedIndex: 0, terrainTab: 'findings', query: '', severity: 'all' },
  };
}

function normalizeAudit(audit) {
  return {
    ...audit,
    projectType: PROJECT_TYPES[audit.projectType] ? audit.projectType : 'replacement',
    modules: Array.isArray(audit.modules) ? [...new Set([...audit.modules, 'stock'])] : ['stock'],
    answers: Object.fromEntries(Object.entries(audit.answers || {}).map(([id, answer]) => [id, { attachments: [], ...answer }])),
    findings: Array.isArray(audit.findings) ? audit.findings.map((finding) => ({ responsibleParty: 'client', owner: '', dueDate: '', ...finding })) : [],
    interviews: Array.isArray(audit.interviews) ? audit.interviews : [],
    guidedSessions: Array.isArray(audit.guidedSessions) ? audit.guidedSessions : [],
    followUps: Array.isArray(audit.followUps) ? audit.followUps : [],
    systems: Array.isArray(audit.systems) ? audit.systems : [],
    documents: Array.isArray(audit.documents) ? audit.documents : [],
    sizing: { ...defaultSizing(), ...(audit.sizing || {}) },
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

function projectTypeOf(audit) {
  return PROJECT_TYPES[audit?.projectType] ? audit.projectType : 'replacement';
}

function projectConfig(audit) {
  return PROJECT_TYPES[projectTypeOf(audit)];
}

function activeDomains(audit) {
  const catalog = projectTypeOf(audit) === 'greenfield' ? GREENFIELD_DOMAINS : DOMAINS;
  return catalog.filter((domain) => domain.modules.length === 0 || domain.modules.some((module) => audit.modules.includes(module)));
}

function availableInterlocutors(audit) {
  const domainIds = new Set(activeDomains(audit).map((domain) => domain.id));
  return INTERLOCUTORS.filter((person) => person.domains.includes('*') || person.domains.some((domain) => domainIds.has(domain)));
}

function interlocutorFor(audit, id) {
  if (id?.startsWith('domain:')) {
    const domain = activeDomains(audit).find((item) => item.id === id.slice(7));
    return domain ? { id, label: domain.label, detail: domain.description, domains: [domain.id] } : null;
  }
  return availableInterlocutors(audit).find((person) => person.id === id) || null;
}

function guidedQuestions(audit, personaId, mode = 'express') {
  const persona = interlocutorFor(audit, personaId);
  if (!persona) return [];
  const domains = activeDomains(audit).filter((domain) => persona.domains.includes('*') || persona.domains.includes(domain.id));
  return domains.flatMap((domain) => domain.questions
    .filter((question) => mode === 'complete' || question.required)
    .map((question) => ({ domain, question })));
}

function questionContext(audit, questionId) {
  for (const domain of activeDomains(audit)) {
    const question = domain.questions.find((item) => item.id === questionId);
    if (question) return { domain, question };
  }
  return null;
}

function simplifyAuditText(value) {
  return SIMPLE_TEXT_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), String(value || ''));
}

function plainQuestionCopy(audit, question) {
  const directQuestion = SIMPLE_QUESTIONS[question.id];
  const statement = simplifyAuditText(question.label).replace(/\.$/, '');
  const prefix = projectTypeOf(audit) === 'greenfield' ? 'Avant le démarrage' : 'Aujourd’hui';
  return {
    question: directQuestion || `${prefix}, est-ce que ${statement.charAt(0).toLowerCase()}${statement.slice(1)} ?`,
    example: simplifyAuditText(question.help),
  };
}

function proofSuggestions(domain) {
  return (PROOFS_BY_DOMAIN[domain.id] || []).slice(0, 2);
}

function guidedSessionSummary(audit, personaId, mode) {
  const entries = guidedQuestions(audit, personaId, mode);
  const answered = entries.filter(({ question }) => audit.answers[question.id]?.status);
  const risks = entries.filter(({ question }) => ['no', 'partial'].includes(audit.answers[question.id]?.status));
  const deferred = entries.filter(({ question }) => audit.followUps.some((item) => item.questionId === question.id && item.status !== 'done'));
  const photos = entries.reduce((sum, { question }) => sum + (audit.answers[question.id]?.attachments?.length || 0), 0);
  return { total: entries.length, answered: answered.length, risks: risks.length, deferred: deferred.length, photos };
}

function simpleReportData(audit) {
  const positive = [];
  activeDomains(audit).forEach((domain) => domain.questions.forEach((question) => {
    if (audit.answers[question.id]?.status === 'yes') positive.push(question.label);
  }));
  const issues = buildPriorities(audit).slice(0, 8);
  const actions = [
    ...audit.followUps.filter((item) => item.status !== 'done').map((item) => item.evidence || item.title),
    ...clientRequestItems(audit).map((item) => `Obtenir : ${item.label}`),
    ...issues.map((item) => item.action || item.title),
  ].filter(Boolean).filter((item, index, rows) => rows.indexOf(item) === index).slice(0, 8);
  return { positive: positive.slice(0, 8), issues, actions };
}

function visitChecks(audit) {
  const required = activeDomains(audit).flatMap((domain) => domain.questions.filter((question) => question.required).map((question) => ({ domain, question })));
  const unanswered = required.filter(({ question }) => !audit.answers[question.id]?.status);
  const openFollowUps = audit.followUps.filter((item) => item.status !== 'done');
  const missingDocuments = audit.documents.filter((item) => ['requested', 'unavailable'].includes(item.status));
  const unassignedProblems = audit.findings.filter((item) => item.status !== 'closed' && (!item.owner || !item.dueDate));
  const photoCount = Object.values(audit.answers).reduce((sum, answer) => sum + (answer.attachments?.length || 0), 0)
    + audit.findings.reduce((sum, item) => sum + (item.attachments?.length || 0), 0)
    + audit.systems.reduce((sum, item) => sum + (item.attachments?.length || 0), 0);
  return [
    { label: 'Questions essentielles sans réponse', count: unanswered.length, action: 'Revenir à la visite', view: 'questionnaire', blocking: true },
    { label: 'Points à vérifier plus tard', count: openFollowUps.length, action: 'Voir les points', view: 'followups', blocking: true },
    { label: 'Documents encore manquants', count: missingDocuments.length, action: 'Voir les documents', view: 'documents', blocking: true },
    { label: 'Problèmes sans responsable ou date', count: unassignedProblems.length, action: 'Compléter les problèmes', view: 'findings', blocking: true },
    { label: 'Personnes rencontrées enregistrées', count: audit.guidedSessions.length + audit.interviews.length, action: 'Voir les entretiens', view: 'interviews', blocking: false, positive: true },
    { label: 'Photos et preuves ajoutées', count: photoCount, action: 'Voir les notes', view: 'systems', blocking: false, positive: true },
  ];
}

function documentTemplatesFor(projectType, modules) {
  const templates = projectType === 'greenfield' ? GREENFIELD_DOCUMENT_TEMPLATES : DOCUMENT_TEMPLATES;
  return templates.filter((item) => item.modules.length === 0 || item.modules.some((module) => modules.includes(module)));
}

function visitPlanFor(audit) {
  return projectTypeOf(audit) === 'greenfield' ? GREENFIELD_VISIT_PLAN : VISIT_PLAN;
}

function statusMeta(audit, value) {
  const meta = STATUS[value];
  if (!meta || projectTypeOf(audit) !== 'greenfield') return meta;
  return { ...meta, label: ({ yes: 'Prêt', partial: 'À compléter', no: 'Non défini', unknown: 'À confirmer', na: 'Non concerné' })[value] };
}

function defaultSizing() {
  return {
    sites: 1,
    pos: 0,
    cashRegisters: 0,
    warehouses: 0,
    rooms: 0,
    users: 0,
    printers: 0,
    products: 0,
    integrations: 0,
    historyYears: 0,
    pilot: '',
    targetDate: '',
    constraints: '',
    decisionMaker: '',
    nextStep: '',
    nextStepOwner: '',
    nextStepDate: '',
  };
}

function sizingSummary(audit) {
  const sizing = audit.sizing || defaultSizing();
  const required = ['sites', 'pos', 'cashRegisters', 'warehouses', 'users', 'products', 'pilot', 'targetDate'];
  const completed = required.filter((key) => key === 'pilot' || key === 'targetDate' ? Boolean(sizing[key]) : Number(sizing[key]) > 0).length;
  const load = Number(sizing.sites) * 3 + Number(sizing.pos) * 2 + Number(sizing.cashRegisters) + Number(sizing.warehouses) + Math.ceil(Number(sizing.users) / 10) + Number(sizing.integrations) * 3 + Math.ceil(Number(sizing.products) / 500) + Number(sizing.historyYears);
  const complexity = completed < 4 ? 'À cadrer' : load >= 28 ? 'Élevée' : load >= 14 ? 'Intermédiaire' : 'Ciblée';
  return { sizing, completed, total: required.length, progress: Math.round(completed / required.length * 100), complexity };
}

function reportSummary(audit, metrics) {
  if (projectTypeOf(audit) === 'greenfield') {
    if (metrics.progress < 40) return 'Le cadrage est encore incomplet. Le rapport identifie les décisions, données initiales et vérifications matérielles restant à obtenir.';
    if (metrics.critical) return `${metrics.critical} blocage(s) critique(s) doivent être levés avant de configurer le pilote et de fixer la date de mise en service.`;
    if (metrics.score >= 75) return 'L’organisation, le matériel et les données disponibles permettent de préparer un premier pilote contrôlé.';
    return 'Le projet est viable, mais des choix de configuration, tests matériels ou données initiales doivent encore être fiabilisés avant le démarrage.';
  }
  if (metrics.progress < 40) return 'L’audit est encore incomplet. Le rapport identifie surtout les zones à vérifier et les pièces manquantes.';
  if (metrics.critical) return `${metrics.critical} risque(s) critique(s) nécessitent une décision avant toute migration ou remplacement.`;
  if (metrics.score >= 75) return 'Le socle actuel présente plusieurs pratiques maîtrisées. La transformation peut être organisée par étapes contrôlées.';
  return 'Des écarts structurants doivent être traités avant de considérer les données et processus comme fiables.';
}

function roadmapFor(audit) {
  if (projectTypeOf(audit) === 'greenfield') {
    return [
      ['Cadrer et fiabiliser', 'Valider l’organisation cible, tester le matériel et compléter les modèles de données initiales.'],
      ['Configurer un pilote', 'Paramétrer un point de vente, un dépôt, les paiements et une équipe avec des données réelles contrôlées.'],
      ['Former et démarrer', 'Former les utilisateurs, exécuter les scénarios de recette puis accompagner les premières clôtures et inventaires.'],
    ];
  }
  return [
    ['Sécuriser et cartographier', 'Compléter les preuves, figer le périmètre, récupérer les exports et confirmer les responsables.'],
    ['Configurer un pilote', 'Reproduire les données réelles sur un restaurant, un dépôt et un parcours PMS contrôlé.'],
    ['Basculer progressivement', 'Former, rapprocher les soldes, mesurer les écarts puis étendre site par site.'],
  ];
}

function createAudit(data) {
  const selectedModules = data.modules?.length ? data.modules : ['pms', 'restaurant', 'stock', 'finance', 'customer', 'it', 'data'];
  const modules = [...new Set([...selectedModules, 'stock'])];
  const projectType = PROJECT_TYPES[data.projectType] ? data.projectType : 'replacement';
  const seedDomain = modules.includes('pms') ? 'pms' : modules.includes('restaurant') ? 'restaurant' : 'it';
  const audit = {
    id: uid('audit'),
    client: data.client.trim(),
    establishment: data.establishment.trim(),
    location: data.location.trim(),
    auditDate: data.auditDate || today(),
    auditor: data.auditor.trim(),
    contact: data.contact?.trim() || '',
    objectives: data.objectives?.trim() || PROJECT_TYPES[projectType].objective,
    projectType,
    modules,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    answers: {},
    findings: [],
    interviews: [],
    guidedSessions: [],
    followUps: [],
    systems: projectType === 'replacement' ? [{
      id: uid('system'),
      name: modules.includes('pms') ? 'Orchestra' : 'Système actuel',
      domain: seedDomain,
      vendor: 'À confirmer',
      version: 'À confirmer',
      deployment: 'À confirmer',
      users: '',
      api: 'unknown',
      decision: 'assess',
      owner: '',
      notes: modules.includes('pms') ? 'PMS actuellement utilisé par le complexe hôtelier.' : 'Solution actuellement utilisée et à cartographier.',
    }] : [],
    documents: documentTemplatesFor(projectType, modules)
      .map((item) => ({ ...item, status: 'requested', note: '' })),
    sizing: defaultSizing(),
  };
  workspace.audits.unshift(audit);
  workspace.activeAuditId = audit.id;
  workspace.ui.view = 'overview';
  workspace.ui.questionnaireDomain = 'direction';
  workspace.ui.guidedPersona = '';
  workspace.ui.guidedIndex = 0;
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
  if (!auditUnlocked) {
    renderAccessGate();
    return;
  }
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

function renderAccessGate() {
  app.innerHTML = `
    <main class="audit-access-screen">
      <section class="audit-access-panel">
        <div class="audit-access-brand"><img src="../brand-mark.svg" alt=""><span><strong>SÁRTAL AUDIT</strong><small>Diagnostic métier terrain</small></span></div>
        <span class="audit-access-badge">ESPACE PROTÉGÉ</span>
        <h1>Accéder aux missions d’audit</h1>
        <p>Saisissez le code à quatre chiffres transmis à l’auditeur.</p>
        <form id="audit-access-form" novalidate>
          <label class="field audit-code-field"><span>Code d’accès</span><input name="accessCode" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="one-time-code" required autofocus placeholder="4 chiffres"></label>
          <p class="audit-access-error" data-access-error role="alert"></p>
          <button class="primary-button" type="submit">Déverrouiller Sártal Audit</button>
        </form>
        <a class="audit-access-back" href="../">Retour au portail Sártal</a>
        <small class="audit-access-note">L’accès reste ouvert uniquement pendant cette session sur cet appareil.</small>
      </section>
    </main>
  `;
}

function renderGateway() {
  app.innerHTML = `
    <main class="mission-gateway">
      <button class="gateway-lock-button" data-action="lock-audit">Verrouiller</button>
      <section class="gateway-panel">
        <div class="gateway-intro">
          <div class="gateway-logo"><img src="../brand-mark.svg" alt=""><span><strong>SÁRTAL AUDIT</strong><small>Diagnostic métier terrain</small></span></div>
          <h1>Choisissez la situation du client.</h1>
          <p>Les bonnes questions seront ensuite affichées automatiquement.</p>
          <div class="gateway-points">
            <div><b>1</b><span>Préparez la visite</span></div>
            <div><b>2</b><span>Posez les questions</span></div>
            <div><b>3</b><span>Notez les problèmes</span></div>
            <div><b>4</b><span>Obtenez le résultat</span></div>
          </div>
        </div>
        <form class="gateway-form" id="create-mission-form">
          <h2>Nouvelle visite</h2>
          <p>Indiquez qui vous allez rencontrer et ce que vous devez examiner.</p>
          <div class="form-grid">
            <div class="field span-2"><span>Situation du client</span><div class="project-type-options">
              ${Object.entries(PROJECT_TYPES).map(([value, config], index) => `<label class="project-type-card"><input type="radio" name="projectType" value="${value}" ${index === 0 ? 'checked' : ''}><span><strong>${config.choiceLabel}</strong><small>${config.choiceDescription}</small></span></label>`).join('')}
            </div></div>
            <label class="field"><span>Client / groupe</span><input name="client" required placeholder="Nom du groupe ou du gérant"></label>
            <label class="field"><span>Établissement</span><input name="establishment" required placeholder="Complexe hôtelier et restaurant"></label>
            <label class="field"><span>Lieu</span><input name="location" placeholder="Ville, adresse ou site"></label>
            <label class="field"><span>Date de visite</span><input name="auditDate" type="date" value="${today()}" required></label>
            <label class="field"><span>Votre nom</span><input name="auditor" required placeholder="Nom de la personne qui fait la visite"></label>
            <label class="field"><span>Contact principal</span><input name="contact" placeholder="Nom, fonction, téléphone"></label>
            <label class="field span-2"><span>Ce que le client veut améliorer</span><textarea name="objectives" placeholder="Exemple : remplacer Orchestra sans interruption, ou utiliser les caisses existantes avec un premier système de gestion."></textarea></label>
            <div class="field span-2"><span>Activités concernées</span><div class="module-checks">
              ${MODULES.map((module) => `<label><input type="checkbox" name="modules" value="${module.id}" ${module.id === 'stock' ? 'checked disabled' : module.id === 'online' ? '' : 'checked'}><span>${module.label}${module.id === 'stock' ? ' · socle inclus' : ''}</span></label>`).join('')}
            </div></div>
          </div>
          <button class="primary-button" type="submit" style="width:100%;margin-top:18px">Commencer la préparation</button>
          ${workspace.audits.length ? `<button class="secondary-button" type="button" data-action="open-missions" style="width:100%;margin-top:9px">Reprendre une visite</button>` : ''}
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
      <button class="header-button audit-lock-button" data-action="lock-audit" aria-label="Verrouiller Sártal Audit">Verrouiller</button>
      <button class="icon-button" data-action="open-settings" aria-label="Paramètres de la mission">⋮</button>
    </header>
  `;
}

function renderSidebar(audit, metrics) {
  const config = projectConfig(audit);
  return `
    <aside class="audit-sidebar">
      <div class="sidebar-context"><span>${h(config.shortLabel)}</span><strong>${h(audit.client || audit.establishment)}</strong><small>${formatDate(audit.auditDate)} · ${h(audit.location || 'Lieu à confirmer')}</small></div>
      <nav class="sidebar-nav" aria-label="Navigation Sártal Audit">
        ${navButton('overview', '1', 'Accueil', `${metrics.progress}%`)}
        ${navButton('questionnaire', '2', 'Faire la visite', `${metrics.answered}/${metrics.total}`)}
        ${navButton('terrain', '3', 'Mes notes', audit.findings.length)}
        ${navButton('report', '4', 'Résultat', metrics.critical + metrics.major)}
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
    ['overview', '1', 'Accueil'],
    ['questionnaire', '2', 'Visite'],
    ['terrain', '3', 'Notes'],
    ['report', '4', 'Résultat'],
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
  const config = projectConfig(audit);
  const visitPlan = visitPlanFor(audit);
  const scope = sizingSummary(audit);
  const firstIncomplete = metrics.domains.find((row) => row.progress < 100)?.domain.id || metrics.domains[0]?.domain.id || 'direction';
  const noteCount = audit.findings.length + audit.interviews.length + audit.systems.length + audit.followUps.length;
  const nextButton = metrics.progress < 100
    ? `<button class="primary-button" data-action="continue-audit" data-domain="${firstIncomplete}">${metrics.answered ? 'Continuer la visite' : 'Commencer la visite'}</button>`
    : '<button class="primary-button" data-action="navigate" data-view="report">Voir le résultat</button>';
  return `<div class="page-container">
    <header class="page-heading simple-heading"><div><span class="eyebrow">${h(audit.establishment)}</span><h1>Que devez-vous faire maintenant ?</h1><p>Suivez les quatre étapes dans l’ordre. Tout est enregistré automatiquement sur cet appareil.</p></div><div class="action-row">${nextButton}</div></header>
    <section class="journey-card" aria-label="Étapes de la visite">
      <article class="journey-step">
        <span class="journey-number">1</span><div><h2>Préparer</h2><p>Vérifiez les personnes, accès, documents et matériels à prévoir.</p></div><span class="journey-status">À consulter</span><button class="secondary-button" data-action="open-preparation">Voir la liste</button>
      </article>
      <article class="journey-step">
        <span class="journey-number">2</span><div><h2>Faire la visite</h2><p>Posez les questions et choisissez une réponse simple pour chaque point.</p></div><span class="journey-status ${metrics.progress === 100 ? 'done' : ''}">${metrics.answered}/${metrics.total}</span><button class="secondary-button" data-action="continue-audit" data-domain="${firstIncomplete}">${metrics.answered ? 'Continuer' : 'Commencer'}</button>
      </article>
      <article class="journey-step">
        <span class="journey-number">3</span><div><h2>Noter ce qui compte</h2><p>Ajoutez les problèmes, les personnes rencontrées, le matériel et les documents.</p></div><span class="journey-status ${noteCount ? 'done' : ''}">${noteCount ? `${noteCount} ajouté${noteCount > 1 ? 's' : ''}` : 'À faire'}</span><button class="secondary-button" data-action="open-notes">Ouvrir</button>
      </article>
      <article class="journey-step">
        <span class="journey-number">4</span><div><h2>Obtenir le résultat</h2><p>Relisez les priorités, imprimez le dossier et envoyez la liste des pièces manquantes.</p></div><span class="journey-status ${metrics.answered ? 'done' : ''}">${metrics.answered ? 'Disponible' : 'À venir'}</span><button class="secondary-button" data-action="navigate" data-view="report">Ouvrir</button>
      </article>
    </section>
    <details class="advanced-details">
      <summary>Voir les détails et les indicateurs</summary>
      <div class="advanced-content">
        <section class="overview-hero">
          <article class="card mission-card"><span class="eyebrow">${h(audit.client || 'Client')}</span><h2>${h(audit.establishment)}</h2><p>${h(audit.objectives || config.objective)}</p><div class="mission-meta"><span>${h(config.label)}</span><span>${formatDate(audit.auditDate)}</span><span>${h(audit.location || 'Lieu à confirmer')}</span><span>${h(audit.auditor)}</span><span>${audit.modules.length} activités</span></div></article>
          <article class="card score-card"><div class="score-ring" style="--score:${metrics.score}"><span><strong>${metrics.score}%</strong><small>${h(config.scoreShortLabel)}</small></span></div><div><strong>${metrics.progress}% de la visite renseignée</strong><small>${metrics.answered} réponses sur ${metrics.total}</small></div></article>
        </section>
        <section class="kpi-grid">
          ${kpi('Questions traitées', `${metrics.answered}/${metrics.total}`, 'Progression globale', 'info')}
          ${kpi('Problèmes urgents', metrics.critical, 'À confirmer avant le départ', metrics.critical ? 'danger' : '')}
          ${kpi('Problèmes importants', metrics.major, 'À intégrer au plan d’action', metrics.major ? 'warning' : '')}
          ${kpi('Documents vérifiés', `${metrics.verifiedDocs}/${audit.documents.length}`, 'Fichiers et preuves reçus', '')}
        </section>
        <article class="card scope-brief"><header><div><span class="eyebrow">Pour préparer l’offre</span><h2>Taille du projet</h2><p>Indiquez les volumes connus pour préparer une proposition et un premier pilote.</p></div><div class="scope-progress"><strong>${scope.progress}%</strong><small>${scope.complexity}</small></div></header><div class="scope-facts">${[
          ['Sites', scope.sizing.sites], ['POS', scope.sizing.pos], ['Caisses', scope.sizing.cashRegisters], ['Dépôts', scope.sizing.warehouses], ['Chambres', scope.sizing.rooms], ['Utilisateurs', scope.sizing.users], ['Produits', scope.sizing.products], ['Connexions', scope.sizing.integrations],
        ].map(([label, value]) => scopeFact(label, value)).join('')}</div><footer><span><strong>Pilote :</strong> ${h(scope.sizing.pilot || 'À définir')}</span><span><strong>Date cible :</strong> ${formatDate(scope.sizing.targetDate)}</span><button class="secondary-button" data-action="open-sizing">Compléter</button></footer></article>
        <section class="overview-grid">
          <article class="card"><div class="card-header"><div><h2>Avancement par activité</h2><p>Les résultats se précisent au fil de vos réponses.</p></div></div><div class="card-body domain-grid">${metrics.domains.map((row) => renderDomainCard(row)).join('')}</div></article>
          <article class="card"><div class="card-header"><div><h2>Ordre conseillé sur place</h2><p>Vous pouvez adapter les horaires à la disponibilité des équipes.</p></div></div><div class="card-body visit-plan">${visitPlan.map((item) => `<article><time>${item.time}</time><span><strong>${item.label}</strong><small>${item.detail}</small></span><b>${item.duration}</b></article>`).join('')}</div></article>
        </section>
      </div>
    </details>
  </div>`;
}

function kpi(label, value, detail, tone) {
  return `<article class="card kpi ${tone}"><small>${label}</small><strong>${value}</strong><p>${detail}</p></article>`;
}

function scopeFact(label, value) {
  return `<span><small>${label}</small><strong>${Number(value) || 0}</strong></span>`;
}

function renderDomainCard(row) {
  return `<article class="domain-card"><header><div><h3>${row.domain.label}</h3><p>${row.domain.description}</p></div><span class="domain-score">${row.score === null ? 'À démarrer' : `${row.score}%`}</span></header><div class="progress-track"><i style="width:${row.progress}%"></i></div><footer><span>${row.answered}/${row.total} réponses</span><span>${row.risks} point(s) à traiter</span></footer><button data-action="select-domain" data-domain="${row.domain.id}">Ouvrir ce domaine</button></article>`;
}

function renderQuestionnaire(audit) {
  const mode = workspace.ui.questionnaireMode || 'express';
  const persona = interlocutorFor(audit, workspace.ui.guidedPersona);
  if (!persona) return renderInterlocutorSelector(audit, mode);
  const entries = guidedQuestions(audit, persona.id, mode);
  const index = Math.max(0, Math.min(Number(workspace.ui.guidedIndex) || 0, Math.max(0, entries.length - 1)));
  workspace.ui.guidedIndex = index;
  const entry = entries[index];
  if (!entry) return renderInterlocutorSelector(audit, mode);
  const answered = entries.filter(({ question }) => audit.answers[question.id]?.status).length;
  const progress = entries.length ? Math.round(answered / entries.length * 100) : 0;
  return `<div class="page-container">
    <header class="guided-heading"><div><span class="eyebrow">Étape 2 · ${h(persona.label)}</span><h1>${mode === 'express' ? 'Visite rapide' : 'Audit complet'}</h1><p>${h(persona.detail)}</p></div><div class="action-row"><button class="secondary-button" data-action="change-persona">Changer de personne</button><button class="secondary-button" data-action="open-visit-check">Contrôler avant de partir</button></div></header>
    <section class="guided-progress"><div><strong>Question ${index + 1} sur ${entries.length}</strong><span>${answered} réponse${answered > 1 ? 's' : ''} enregistrée${answered > 1 ? 's' : ''}</span></div><div class="progress-track"><i style="width:${progress}%"></i></div></section>
    ${renderGuidedQuestion(audit, entry.domain, entry.question, index, entries.length)}
  </div>`;
}

function renderInterlocutorSelector(audit, mode) {
  const people = availableInterlocutors(audit);
  return `<div class="page-container">
    <header class="page-heading"><div><span class="eyebrow">Étape 2 · Faire la visite</span><h1>Qui allez-vous rencontrer ?</h1><p>Choisissez la personne présente. Sártal affiche uniquement les questions utiles pour son travail.</p></div><div class="action-row"><button class="secondary-button" data-action="open-visit-check">Contrôler avant de partir</button></div></header>
    <section class="visit-mode-card"><div><strong>Durée de la visite</strong><p>Vous pourrez changer de mode à tout moment sans perdre de réponse.</p></div><div class="mode-toggle"><button class="${mode === 'express' ? 'active' : ''}" data-action="question-mode" data-mode="express">Rapide · 45 à 60 min</button><button class="${mode === 'complete' ? 'active' : ''}" data-action="question-mode" data-mode="complete">Audit complet</button></div></section>
    <section class="interlocutor-grid">${people.map((person) => {
      const summary = guidedSessionSummary(audit, person.id, mode);
      const completed = audit.guidedSessions.filter((session) => session.personaId === person.id).length;
      return `<article class="interlocutor-card"><div class="interlocutor-icon">${h(person.label.split(' ').map((word) => word[0]).join('').slice(0, 2))}</div><div><h2>${h(person.label)}</h2><p>${h(person.detail)}</p><small>${summary.answered}/${summary.total} réponses${completed ? ` · ${completed} entretien${completed > 1 ? 's' : ''} terminé${completed > 1 ? 's' : ''}` : ''}</small></div><button class="primary-button" data-action="start-persona" data-persona="${person.id}">${summary.answered ? 'Reprendre' : 'Commencer'}</button></article>`;
    }).join('')}</section>
  </div>`;
}

function renderGuidedQuestion(audit, domain, question, index, total) {
  const answer = audit.answers[question.id] || {};
  const status = answer.status ? statusMeta(audit, answer.status) : null;
  const copy = plainQuestionCopy(audit, question);
  const existingFinding = audit.findings.some((finding) => finding.sourceQuestionId === question.id);
  const existingFollowUp = audit.followUps.some((item) => item.questionId === question.id && item.status !== 'done');
  return `<section class="guided-question-shell">
  <article class="question-card guided-question ${status ? `answer-${status.className}` : ''}">
    <header><span class="question-index">${String(index + 1).padStart(2, '0')}</span><div class="question-copy"><span class="question-domain">${h(domain.label)}</span><h2>${h(copy.question)}</h2><div class="plain-example"><strong>Exemple concret</strong><span>${h(copy.example)}</span></div></div>${question.required ? '<span class="required-badge">Essentiel</span>' : ''}</header>
    <aside class="proof-box"><strong>Demandez simplement à voir</strong>${proofSuggestions(domain).map((proof) => `<span>${h(simplifyAuditText(proof))}</span>`).join('')}</aside>
    <div class="answer-segments">${Object.keys(STATUS).map((value) => { const meta = statusMeta(audit, value); return `<button data-action="answer" data-question="${question.id}" data-value="${value}" class="${answer.status === value ? 'active' : ''}">${meta.label}</button>`; }).join('')}</div>
    ${['no', 'partial'].includes(answer.status) ? `<div class="risk-prompt"><div><strong>Ce point mérite un suivi</strong><span>${existingFinding ? 'Il a déjà été ajouté aux problèmes.' : 'Souhaitez-vous l’ajouter aux problèmes à traiter ?'}</span></div>${existingFinding ? '<span class="risk-recorded">Ajouté</span>' : `<button class="primary-button" data-action="finding-from-question" data-question="${question.id}" data-domain="${domain.id}">Ajouter aux problèmes</button>`}</div>` : ''}
    <div class="question-note"><textarea data-question-note="${question.id}" placeholder="Votre note : ce que vous avez vu, un exemple ou le nom d’un document...">${h(answer.note || '')}</textarea></div>
    <div class="question-tools"><button class="secondary-button" data-action="dictate-note" data-question="${question.id}">Dicter une note</button><label class="secondary-button question-photo-button">Ajouter une photo<input data-question-photo="${question.id}" type="file" accept="image/*" capture="environment"></label><button class="secondary-button ${existingFollowUp ? 'active' : ''}" data-action="defer-question" data-question="${question.id}">${existingFollowUp ? 'À vérifier enregistré' : 'Je vérifierai plus tard'}</button></div>
    ${answer.attachments?.length ? `<div class="evidence-grid question-evidence">${answer.attachments.map((image) => `<img src="${image}" alt="Preuve ajoutée pour cette question">`).join('')}</div>` : ''}
    <details class="technical-context"><summary>Voir le contrôle détaillé</summary><p>${h(question.label)}</p><small>${h(question.help)}</small></details>
  </article>
  <nav class="guided-navigation"><button class="secondary-button" data-action="previous-question" ${index === 0 ? 'disabled' : ''}>Question précédente</button><button class="primary-button" data-action="next-question">${index + 1 === total ? 'Terminer cet entretien' : 'Question suivante'}</button></nav>
  </section>`;
}

function renderTerrain(audit) {
  const tab = workspace.ui.terrainTab || 'findings';
  const inventoryLabel = 'Matériel et logiciels';
  return `<div class="page-container">
    <header class="page-heading"><div><span class="eyebrow">Étape 3 · Mes notes</span><h1>Ce que vous avez observé</h1><p>Regroupez ici les problèmes, les personnes rencontrées, le matériel et les documents.</p></div><div class="action-row">${tabActionButton(tab)}</div></header>
    <nav class="section-tabs">${[
      ['findings', `Problèmes (${audit.findings.length})`],
      ['interviews', `Personnes (${audit.interviews.length + audit.guidedSessions.length})`],
      ['followups', `À vérifier (${audit.followUps.filter((item) => item.status !== 'done').length})`],
      ['systems', `${inventoryLabel} (${audit.systems.length})`],
      ['documents', `Documents (${audit.documents.length})`],
    ].map(([id, label]) => `<button class="${tab === id ? 'active' : ''}" data-action="terrain-tab" data-tab="${id}">${label}</button>`).join('')}</nav>
    ${tab === 'interviews' ? renderInterviews(audit) : tab === 'followups' ? renderFollowUps(audit) : tab === 'systems' ? renderSystems(audit) : tab === 'documents' ? renderDocuments(audit) : renderFindings(audit)}
  </div>`;
}

function tabActionButton(tab) {
  if (tab === 'documents') return '<button class="secondary-button" data-action="export-backup">Sauvegarder la visite</button>';
  if (tab === 'followups') return '<button class="primary-button" data-action="open-visit-check">Contrôler la visite</button>';
  const labels = { findings: 'Ajouter un problème', interviews: 'Ajouter une personne', systems: 'Ajouter un matériel ou logiciel' };
  const actions = { findings: 'add-finding', interviews: 'add-interview', systems: 'add-system' };
  return `<button class="primary-button" data-action="${actions[tab]}">${labels[tab]}</button>`;
}

function renderFindings(audit) {
  const query = (workspace.ui.query || '').toLowerCase();
  const severity = workspace.ui.severity || 'all';
  const rows = audit.findings.filter((finding) => (severity === 'all' || finding.severity === severity) && (!query || `${finding.title} ${finding.situation} ${finding.impact} ${finding.recommendation}`.toLowerCase().includes(query)));
  return `<div class="filter-bar"><input data-filter-query placeholder="Rechercher un problème" value="${h(workspace.ui.query || '')}"><select data-filter-severity><option value="all">Tous les niveaux</option>${Object.entries(SEVERITIES).map(([value, meta]) => `<option value="${value}" ${severity === value ? 'selected' : ''}>${meta.label}</option>`).join('')}</select><button class="primary-button" data-action="add-finding">Ajouter un problème</button></div>
    <section class="item-list">${rows.length ? rows.map((finding) => renderFindingCard(audit, finding)).join('') : emptyState('Aucun problème ajouté', 'Ajoutez ce que vous avez observé, son impact et l’action à prévoir.', 'add-finding', 'Ajouter le premier problème')}</section>`;
}

function renderFindingCard(audit, finding) {
  const domain = activeDomains(audit).find((item) => item.id === finding.domain);
  return `<article class="list-card"><span class="marker ${finding.severity}">${SEVERITIES[finding.severity]?.short || 'P?'}</span><div><h3>${h(finding.title)}</h3><p>${h(finding.situation)}</p>${finding.impact ? `<p><strong>Impact :</strong> ${h(finding.impact)}</p>` : ''}${finding.recommendation ? `<p><strong>Action :</strong> ${h(finding.recommendation)}</p>` : ''}<div class="action-meta"><span>${responsiblePartyLabel(finding.responsibleParty)}</span><span>${h(finding.owner || 'Responsable à nommer')}</span><span>${finding.dueDate ? `Échéance ${formatDate(finding.dueDate)}` : 'Échéance à fixer'}</span></div><small>${h(domain?.label || finding.domain)} · ${formatDateTime(finding.createdAt)} · ${finding.status === 'closed' ? 'Traité' : finding.status === 'confirmed' ? 'Confirmé' : 'Ouvert'}</small>${finding.attachments?.length ? `<div class="evidence-grid">${finding.attachments.map((image) => `<img src="${image}" alt="Preuve du constat">`).join('')}</div>` : ''}</div><div class="list-actions"><button data-action="edit-finding" data-id="${finding.id}">Modifier</button><button data-action="delete-finding" data-id="${finding.id}">Supprimer</button></div></article>`;
}

function renderInterviews(audit) {
  const guided = audit.guidedSessions.map((session) => `<article class="list-card guided-session-card"><span class="marker">${h((session.personaLabel || 'Visite').split(' ').map((part) => part[0]).join('').slice(0, 3).toUpperCase())}</span><div><h3>${h(session.personaLabel || 'Entretien guidé')}</h3><p>${session.answered}/${session.total} réponses · ${session.risks} problème(s) · ${session.deferred} point(s) à vérifier · ${session.photos} photo(s)</p><small>${session.mode === 'express' ? 'Visite rapide' : 'Audit complet'} · Terminé ${formatDateTime(session.completedAt)}</small></div></article>`).join('');
  const manual = audit.interviews.map((item) => `<article class="list-card"><span class="marker">${h(item.role.split(' ').map((part) => part[0]).join('').slice(0, 3).toUpperCase())}</span><div><h3>${h(item.role)}${item.name ? ` · ${h(item.name)}` : ''}</h3><p>${h(item.painPoints || 'Aucune difficulté saisie.')}</p>${item.needs ? `<p><strong>Attentes :</strong> ${h(item.needs)}</p>` : ''}<small>${h(item.tools || 'Outils non renseignés')} · ${item.duration || 0} min</small></div><div class="list-actions"><button data-action="edit-interview" data-id="${item.id}">Modifier</button><button data-action="delete-interview" data-id="${item.id}">Supprimer</button></div></article>`).join('');
  return `<section class="item-list">${guided || manual ? guided + manual : emptyState('Aucune personne ajoutée', 'Commencez une visite guidée ou ajoutez une personne rencontrée.', 'add-interview', 'Ajouter une personne')}</section>`;
}

function renderFollowUps(audit) {
  const rows = audit.followUps.slice().sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'));
  return `<section class="item-list">${rows.length ? rows.map((item) => `<article class="list-card ${item.status === 'done' ? 'completed-item' : ''}"><span class="marker">${item.status === 'done' ? 'OK' : '?'}</span><div><h3>${h(item.title)}</h3><p><strong>À vérifier :</strong> ${h(item.evidence)}</p><small>${h(item.owner || 'Personne à identifier')} · ${item.dueDate ? formatDate(item.dueDate) : 'Date à fixer'}</small></div><div class="list-actions"><button data-action="complete-followup" data-id="${item.id}">${item.status === 'done' ? 'Rouvrir' : 'Terminé'}</button><button data-action="edit-followup" data-id="${item.id}">Modifier</button><button data-action="delete-followup" data-id="${item.id}">Supprimer</button></div></article>`).join('') : emptyState('Rien à vérifier plus tard', 'Les questions reportées pendant la visite apparaîtront ici.', 'open-visit-check', 'Contrôler la visite')}</section>`;
}

function renderSystems(audit) {
  const greenfield = projectTypeOf(audit) === 'greenfield';
  const emptyTitle = greenfield ? 'Aucun équipement recensé' : 'Aucun outil recensé';
  const emptyBody = greenfield ? 'Ajoutez les caisses, imprimantes, tiroirs, terminaux de paiement, équipements réseau et services à connecter.' : 'Ajoutez les PMS, POS, logiciels de stock, moyens de paiement et outils comptables.';
  return `<section class="item-list">${audit.systems.length ? audit.systems.map((item) => `<article class="list-card"><span class="marker">${h((item.domain || 'IT').slice(0, 3).toUpperCase())}</span><div><h3>${h(item.name)}</h3><p>${h(item.vendor || (greenfield ? 'Marque à confirmer' : 'Éditeur à confirmer'))} · ${h(item.version || 'Modèle/version inconnu')} · ${h(item.deployment || 'Installation à confirmer')}</p>${greenfield && (item.location || item.serial || item.condition) ? `<p><strong>Emplacement :</strong> ${h(item.location || 'À confirmer')} · <strong>Identifiant :</strong> ${h(item.serial || 'Non relevé')} · <strong>État :</strong> ${hardwareConditionLabel(item.condition)}</p>` : ''}<p><strong>${greenfield ? 'Connexion / pilote' : 'Exports / API'} :</strong> ${connectionStatusLabel(audit, item.api)} · <strong>Décision :</strong> ${decisionLabel(item.decision)}</p>${item.notes ? `<p>${h(item.notes)}</p>` : ''}${item.attachments?.length ? `<div class="evidence-grid">${item.attachments.map((image) => `<img src="${image}" alt="Photo de ${h(item.name)}">`).join('')}</div>` : ''}<small>${h(item.owner || 'Responsable à identifier')}${item.users ? ` · ${h(item.users)} poste(s) / utilisateur(s)` : ''}</small></div><div class="list-actions"><button data-action="edit-system" data-id="${item.id}">Modifier</button><button data-action="delete-system" data-id="${item.id}">Supprimer</button></div></article>`).join('') : emptyState(emptyTitle, emptyBody, 'add-system', greenfield ? 'Ajouter le premier équipement' : 'Ajouter un outil')}</section>`;
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
  const config = projectConfig(audit);
  const priorities = buildPriorities(audit);
  const scope = sizingSummary(audit);
  const clientRequests = clientRequestItems(audit);
  const summary = reportSummary(audit, metrics);
  const roadmap = roadmapFor(audit);
  const greenfield = projectTypeOf(audit) === 'greenfield';
  const simple = simpleReportData(audit);
  const answerEvidence = activeDomains(audit).flatMap((domain) => domain.questions.map((question) => ({ domain, question, answer: audit.answers[question.id] })).filter((item) => item.answer?.attachments?.length));
  return `<div class="page-container">
    <header class="page-heading no-print"><div><span class="eyebrow">Étape 4 · Résultat</span><h1>Votre dossier est prêt</h1><p>Commencez par la synthèse simple, puis ouvrez le rapport détaillé uniquement si nécessaire.</p></div><div class="action-row"><button class="secondary-button" data-action="open-visit-check">Contrôler la visite</button><button class="secondary-button" data-action="copy-client-followup">Copier le message client</button><button class="primary-button" data-action="print-report">Imprimer / PDF</button></div></header>
    <details class="report-tools no-print"><summary>Autres exports</summary><div class="action-row"><button class="secondary-button" data-action="export-actions">Plan d’action CSV</button><button class="secondary-button" data-action="export-csv">Toutes les réponses CSV</button><button class="secondary-button" data-action="export-backup">Sauvegarde complète JSON</button></div></details>
    <section class="simple-result-grid">
      <article class="simple-result positive"><span>1</span><h2>Ce qui fonctionne</h2><div>${simple.positive.length ? simple.positive.map((item) => `<p>${h(item)}</p>`).join('') : '<p>Aucun point positif n’a encore été confirmé.</p>'}</div></article>
      <article class="simple-result warning"><span>2</span><h2>Ce qui pose problème</h2><div>${simple.issues.length ? simple.issues.map((item) => `<p><b>${h(item.priority)}</b>${h(item.title)}</p>`).join('') : '<p>Aucun problème prioritaire n’a encore été relevé.</p>'}</div></article>
      <article class="simple-result action"><span>3</span><h2>Ce qu’il faut faire ensuite</h2><div>${simple.actions.length ? simple.actions.map((item) => `<p>${h(item)}</p>`).join('') : '<p>Terminez la visite pour produire les prochaines actions.</p>'}</div></article>
    </section>
    <details class="report-details">
      <summary class="no-print">Voir le rapport détaillé</summary>
    <section class="report-page">
      <article class="card report-cover"><span class="eyebrow">${h(config.reportTitle)}</span><h1>${h(audit.establishment)}</h1><p>${h(summary)}</p><div class="report-meta"><span>${h(config.label)}</span><span>${h(audit.client)}</span><span>${formatDate(audit.auditDate)}</span><span>${h(audit.location || 'Lieu à confirmer')}</span><span>Auditeur : ${h(audit.auditor)}</span><span>Couverture : ${metrics.progress}%</span></div></article>
      <article class="card report-section"><header><div><h2>Synthèse exécutive</h2><p>Lecture consolidée des domaines inclus dans la mission.</p></div><strong>${metrics.score}% de ${h(config.scoreLabel)}</strong></header><div class="report-score-grid">${metrics.domains.map((row) => `<article class="report-score"><header><strong>${row.domain.label}</strong><b>${row.score === null ? 'À faire' : `${row.score}%`}</b></header><div class="progress-track"><i style="width:${row.score || 0}%"></i></div><small>${row.answered}/${row.total} réponses · ${row.risks} point(s) à traiter</small></article>`).join('')}</div></article>
      <article class="card report-section"><header><div><h2>Périmètre à chiffrer</h2><p>Volumes vérifiés pour dimensionner la configuration, le matériel, la reprise et la formation.</p></div><strong>${scope.progress}% cadré · ${scope.complexity}</strong></header><div class="report-scope-grid">${[
        ['Sites', scope.sizing.sites], ['Points de vente', scope.sizing.pos], ['Caisses', scope.sizing.cashRegisters], ['Dépôts', scope.sizing.warehouses], ['Chambres', scope.sizing.rooms], ['Utilisateurs', scope.sizing.users], ['Imprimantes / KDS', scope.sizing.printers], ['Produits / recettes', scope.sizing.products], ['Interfaces', scope.sizing.integrations], ...(greenfield ? [] : [['Historique', `${scope.sizing.historyYears || 0} an(s)`]]),
      ].map(([label, value]) => `<span><small>${label}</small><strong>${h(value)}</strong></span>`).join('')}</div><div class="scope-decision"><p><strong>Pilote :</strong> ${h(scope.sizing.pilot || 'À définir')}</p><p><strong>Date cible :</strong> ${formatDate(scope.sizing.targetDate)}</p><p><strong>Décideur :</strong> ${h(scope.sizing.decisionMaker || 'À identifier')}</p>${scope.sizing.constraints ? `<p><strong>Contraintes :</strong> ${h(scope.sizing.constraints)}</p>` : ''}<p><strong>Prochaine étape :</strong> ${h(scope.sizing.nextStep || 'À convenir')} · ${h(scope.sizing.nextStepOwner || 'responsable à nommer')} · ${formatDate(scope.sizing.nextStepDate)}</p></div></article>
      <article class="card report-section"><header><div><h2>Plan d’action prioritaire</h2><p>Décisions, responsables et échéances issus des constats et contrôles essentiels.</p></div><strong>${priorities.length} action(s)</strong></header><div class="priority-list">${priorities.length ? priorities.slice(0, 20).map((item) => `<article><b>${item.priority}</b><div><h3>${h(item.title)}</h3><p>${h(item.action || item.detail)}</p><div class="action-meta"><span>${responsiblePartyLabel(item.responsibleParty)}</span><span>${h(item.owner || 'Responsable à nommer')}</span><span>${item.dueDate ? formatDate(item.dueDate) : 'Échéance à fixer'}</span></div></div></article>`).join('') : '<p>Aucune action prioritaire n’a encore été identifiée.</p>'}</div></article>
      ${audit.findings.length ? `<article class="card report-section"><header><div><h2>Constats terrain détaillés</h2><p>Faits observés, impacts, recommandations et preuves collectées.</p></div><strong>${audit.findings.length} constat(s)</strong></header><div class="report-findings">${audit.findings.map((finding) => {
        const domain = activeDomains(audit).find((item) => item.id === finding.domain);
        return `<article><header><b class="report-priority ${finding.severity}">${SEVERITIES[finding.severity]?.short || 'P?'}</b><div><h3>${h(finding.title)}</h3><small>${h(domain?.label || finding.domain)} · ${finding.status === 'closed' ? 'Traité' : finding.status === 'confirmed' ? 'Confirmé' : 'Ouvert'}</small></div></header><p><strong>Observation :</strong> ${h(finding.situation)}</p>${finding.impact ? `<p><strong>Impact :</strong> ${h(finding.impact)}</p>` : ''}${finding.recommendation ? `<p><strong>Action :</strong> ${h(finding.recommendation)}</p>` : ''}<div class="action-meta"><span>${responsiblePartyLabel(finding.responsibleParty)}</span><span>${h(finding.owner || 'Responsable à nommer')}</span><span>${finding.dueDate ? formatDate(finding.dueDate) : 'Échéance à fixer'}</span></div>${finding.attachments?.length ? `<div class="evidence-grid">${finding.attachments.map((image) => `<img src="${image}" alt="Preuve du constat">`).join('')}</div>` : ''}</article>`;
      }).join('')}</div></article>` : ''}
      ${answerEvidence.length ? `<article class="card report-section"><header><div><h2>Photos prises pendant les questions</h2><p>Chaque image reste reliée au point contrôlé sur le terrain.</p></div><strong>${answerEvidence.reduce((sum, item) => sum + item.answer.attachments.length, 0)} photo(s)</strong></header><div class="report-findings">${answerEvidence.map((item) => `<article><header><div><h3>${h(item.question.label)}</h3><small>${h(item.domain.label)}</small></div></header>${item.answer.note ? `<p>${h(item.answer.note)}</p>` : ''}<div class="evidence-grid">${item.answer.attachments.map((image) => `<img src="${image}" alt="Preuve liée à la question">`).join('')}</div></article>`).join('')}</div></article>` : ''}
      ${audit.interviews.length || audit.guidedSessions.length ? `<article class="card report-section"><header><div><h2>Entretiens réalisés</h2><p>Personnes rencontrées et synthèses des parcours guidés.</p></div><strong>${audit.interviews.length + audit.guidedSessions.length} entretien(s)</strong></header><div class="report-interviews">${audit.guidedSessions.map((session) => `<article><header><h3>${h(session.personaLabel)}</h3><small>${formatDateTime(session.completedAt)}</small></header><p>${session.answered}/${session.total} réponses · ${session.risks} problème(s) · ${session.deferred} vérification(s) différée(s) · ${session.photos} photo(s)</p></article>`).join('')}${audit.interviews.map((item) => `<article><header><h3>${h(item.role)}${item.name ? ` · ${h(item.name)}` : ''}</h3><small>${item.duration || 0} min</small></header>${item.tools ? `<p><strong>Outils :</strong> ${h(item.tools)}</p>` : ''}${item.painPoints ? `<p><strong>Difficultés :</strong> ${h(item.painPoints)}</p>` : ''}${item.needs ? `<p><strong>Attentes :</strong> ${h(item.needs)}</p>` : ''}</article>`).join('')}</div></article>` : ''}
      ${audit.followUps.length ? `<article class="card report-section"><header><div><h2>Points à vérifier après la visite</h2><p>Personnes à recontacter et preuves qui n’ont pas pu être obtenues sur place.</p></div><strong>${audit.followUps.filter((item) => item.status !== 'done').length} ouvert(s)</strong></header><div class="report-findings">${audit.followUps.map((item) => `<article><header><b class="report-priority ${item.status === 'done' ? 'opportunity' : 'medium'}">${item.status === 'done' ? 'OK' : '?'}</b><div><h3>${h(item.title)}</h3><small>${h(item.owner || 'Personne à identifier')} · ${item.dueDate ? formatDate(item.dueDate) : 'Date à fixer'}</small></div></header><p>${h(item.evidence)}</p></article>`).join('')}</div></article>` : ''}
      <article class="card report-section"><header><div><h2>${greenfield ? 'Inventaire du matériel et des services' : 'Cartographie des outils'}</h2><p>${greenfield ? 'Équipements disponibles, compatibilité à confirmer et acquisitions éventuelles.' : 'Applications observées et décision à instruire.'}</p></div><strong>${audit.systems.length} élément(s)</strong></header><div class="item-list">${audit.systems.length ? audit.systems.map((item) => `<article class="list-card"><span class="marker">${h(item.domain.slice(0, 3).toUpperCase())}</span><div><h3>${h(item.name)}</h3><p>${h(item.vendor || 'À confirmer')} · ${h(item.version || 'À confirmer')} · ${h(item.deployment || 'À confirmer')}</p>${greenfield ? `<p>${h(item.location || 'Emplacement à confirmer')} · ${h(item.serial || 'Identifiant non relevé')} · ${hardwareConditionLabel(item.condition)}</p>` : ''}<small>${greenfield ? 'Connexion / test' : 'API'} : ${connectionStatusLabel(audit, item.api)} · ${decisionLabel(item.decision)}</small>${item.attachments?.length ? `<div class="evidence-grid">${item.attachments.map((image) => `<img src="${image}" alt="Photo de ${h(item.name)}">`).join('')}</div>` : ''}</div></article>`).join('') : '<p>Aucun élément inventorié à ce stade.</p>'}</div></article>
      <article class="card report-section"><header><div><h2>${greenfield ? 'Pièces et préparation de la configuration' : 'Pièces et capacité de migration'}</h2><p>${greenfield ? 'Disponibilité des référentiels, règles et données nécessaires à la configuration du pilote.' : 'Disponibilité des données nécessaires au chiffrage et au pilote.'}</p></div><strong>${metrics.verifiedDocs}/${audit.documents.length} vérifiées</strong></header>${clientRequests.length ? `<div class="client-request-box"><strong>À demander au client avant la prochaine étape</strong><div>${clientRequests.map((item) => `<p><b>${item.status === 'unavailable' ? 'ALTERNATIVE' : 'À FOURNIR'}</b><span>${h(item.label)}${item.note ? ` · ${h(item.note)}` : ''}</span></p>`).join('')}</div></div>` : '<div class="client-request-box complete"><strong>Toutes les pièces attendues ont été reçues ou vérifiées.</strong></div>'}<div class="document-list">${audit.documents.filter((item) => item.status !== 'na').map((item) => `<article class="document-row"><div><strong>${h(item.label)}</strong><small>${h(item.domain)}</small></div><strong>${documentStatusLabel(item.status)}</strong><span>${h(item.note || '')}</span></article>`).join('')}</div></article>
      <article class="card report-section"><header><div><h2>Trajectoire recommandée</h2><p>À confirmer après réception des données, tests matériels et arbitrage des priorités.</p></div></header><div class="roadmap">${roadmap.map((item, index) => `<article><small>Étape ${index + 1}</small><h3>${item[0]}</h3><p>${item[1]}</p></article>`).join('')}</div></article>
    </section>
    </details>
  </div>`;
}

function buildPriorities(audit) {
  const findingRows = audit.findings
    .filter((item) => item.status !== 'closed')
    .map((item) => ({ priority: SEVERITIES[item.severity]?.short || 'P?', title: item.title, detail: item.impact || item.situation, action: item.recommendation, responsibleParty: item.responsibleParty || 'client', owner: item.owner || '', dueDate: item.dueDate || '', status: item.status, source: 'Constat terrain', rank: ['critical', 'major', 'medium', 'opportunity'].indexOf(item.severity) }));
  const answerRows = [];
  activeDomains(audit).forEach((domain) => domain.questions.forEach((question) => {
    const answer = audit.answers[question.id];
    if (!['no', 'partial', 'unknown'].includes(answer?.status)) return;
    if (audit.findings.some((item) => item.sourceQuestionId === question.id && item.status !== 'closed')) return;
    if (answer.status === 'unknown' && audit.followUps.some((item) => item.questionId === question.id && item.status !== 'done')) return;
    answerRows.push({
      priority: answer.status === 'no' ? 'P1' : answer.status === 'partial' ? 'P2' : 'P3',
      title: question.label,
      detail: answer.note || `${domain.label} : preuve ou correction à obtenir.`,
      action: answer.note || 'Obtenir une décision ou une preuve vérifiable.',
      responsibleParty: 'client',
      owner: '',
      dueDate: '',
      status: 'open',
      source: domain.label,
      rank: answer.status === 'no' ? 0 : answer.status === 'partial' ? 1 : 2,
    });
  }));
  return [...findingRows, ...answerRows].sort((a, b) => a.rank - b.rank);
}

function clientRequestItems(audit) {
  return audit.documents.filter((item) => ['requested', 'unavailable'].includes(item.status));
}

function buildFollowUpText(audit) {
  const scope = sizingSummary(audit).sizing;
  const requests = clientRequestItems(audit);
  const priorities = buildPriorities(audit).slice(0, 8);
  const simple = simpleReportData(audit);
  const followUps = audit.followUps.filter((item) => item.status !== 'done');
  const modules = MODULES.filter((module) => audit.modules.includes(module.id)).map((module) => module.label).join(', ');
  const lines = [
    audit.contact ? `Bonjour ${audit.contact},` : 'Bonjour,',
    '',
    `Suite à notre visite de ${audit.establishment}, voici un premier résumé des éléments observés.`,
    '',
    `Périmètre : ${modules}.`,
    `Volumes : ${scope.sites || 0} site(s), ${scope.pos || 0} POS, ${scope.cashRegisters || 0} caisse(s), ${scope.warehouses || 0} dépôt(s), ${scope.rooms || 0} chambre(s), ${scope.users || 0} utilisateur(s) et ${scope.products || 0} produit(s).`,
    `Pilote proposé : ${scope.pilot || 'à définir'}.`,
    `Date cible : ${scope.targetDate ? formatDate(scope.targetDate) : 'à confirmer'}.`,
  ];
  if (simple.positive.length) {
    lines.push('', 'Ce qui fonctionne déjà :');
    simple.positive.slice(0, 5).forEach((item) => lines.push(`- ${item}`));
  }
  if (priorities.length) {
    lines.push('', 'Points à traiter en priorité :');
    priorities.forEach((item) => lines.push(`- ${item.priority} · ${item.title}${item.action ? ` · ${item.action}` : ''}`));
  }
  if (followUps.length) {
    lines.push('', 'Points restant à vérifier :');
    followUps.forEach((item) => lines.push(`- ${item.evidence}${item.owner ? ` · avec ${item.owner}` : ''}${item.dueDate ? ` · avant le ${formatDate(item.dueDate)}` : ''}`));
  }
  if (requests.length) {
    lines.push('', 'Documents à nous transmettre ou à arbitrer :');
    requests.forEach((item) => lines.push(`- ${item.label}${item.note ? ` : ${item.note}` : ''}`));
  }
  lines.push('', `Prochaine étape : ${scope.nextStep || 'à convenir'} · ${scope.nextStepOwner || 'responsable à nommer'} · ${scope.nextStepDate ? formatDate(scope.nextStepDate) : 'date à fixer'}.`, '', 'Cordialement,', audit.auditor || 'Sártal');
  return lines.join('\n');
}

function openModal({ title, subtitle = '', content, actions = '', wide = false }) {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${h(title)}" data-modal-panel><header><div><h2>${h(title)}</h2>${subtitle ? `<p>${h(subtitle)}</p>` : ''}</div><button data-action="close-modal" aria-label="Fermer">×</button></header><div class="modal-content">${content}</div>${actions ? `<footer class="modal-actions">${actions}</footer>` : ''}</section></div>`;
}

function closeModal() {
  modalRoot.innerHTML = '';
}

function openFindingModal(existing, prefill = {}) {
  const finding = existing || { id: '', sourceQuestionId: prefill.sourceQuestionId || '', severity: 'major', domain: prefill.domain || workspace.ui.questionnaireDomain || 'direction', title: prefill.title || '', situation: prefill.situation || '', impact: '', recommendation: '', responsibleParty: 'client', owner: '', dueDate: '', status: 'open', attachments: [] };
  openModal({
    title: existing ? 'Modifier le problème' : 'Ajouter un problème',
    subtitle: 'Décrivez simplement ce que vous avez vu, l’impact et l’action à prévoir.',
    wide: true,
    content: `<form id="finding-form"><input type="hidden" name="id" value="${h(finding.id)}"><input type="hidden" name="sourceQuestionId" value="${h(finding.sourceQuestionId || '')}"><div class="form-grid">
      <label class="field"><span>Importance</span><select name="severity">${Object.entries(SEVERITIES).map(([value, meta]) => `<option value="${value}" ${finding.severity === value ? 'selected' : ''}>${meta.label}</option>`).join('')}</select></label>
      <label class="field"><span>Activité concernée</span><select name="domain">${activeDomains(activeAudit()).map((domain) => `<option value="${domain.id}" ${finding.domain === domain.id ? 'selected' : ''}>${domain.label}</option>`).join('')}</select></label>
      <label class="field span-2"><span>Nom du problème</span><input name="title" required value="${h(finding.title)}" placeholder="Exemple : Les ventes bar sont déduites du dépôt restaurant"></label>
      <label class="field span-2"><span>Ce que vous avez vu</span><textarea name="situation" required>${h(finding.situation)}</textarea></label>
      <label class="field"><span>Impact</span><textarea name="impact" placeholder="Risque client, financier, opérationnel ou données">${h(finding.impact)}</textarea></label>
      <label class="field"><span>Action proposée</span><textarea name="recommendation" placeholder="Action concrète ou contrôle à réaliser">${h(finding.recommendation)}</textarea></label>
      <label class="field"><span>Qui doit agir ?</span><select name="responsibleParty"><option value="client" ${finding.responsibleParty === 'client' ? 'selected' : ''}>Client</option><option value="sartal" ${finding.responsibleParty === 'sartal' ? 'selected' : ''}>Sártal</option><option value="joint" ${finding.responsibleParty === 'joint' ? 'selected' : ''}>Client + Sártal</option><option value="third-party" ${finding.responsibleParty === 'third-party' ? 'selected' : ''}>Prestataire externe</option></select></label>
      <label class="field"><span>Responsable nommé</span><input name="owner" value="${h(finding.owner || '')}" placeholder="Nom ou fonction"></label>
      <label class="field"><span>Date cible</span><input name="dueDate" type="date" value="${h(finding.dueDate || '')}"></label>
      <label class="field"><span>Statut</span><select name="status"><option value="open" ${finding.status === 'open' ? 'selected' : ''}>Ouvert</option><option value="confirmed" ${finding.status === 'confirmed' ? 'selected' : ''}>Confirmé</option><option value="closed" ${finding.status === 'closed' ? 'selected' : ''}>Traité</option></select></label>
      <label class="field photo-picker"><span>Photos / preuves</span><input name="photos" type="file" accept="image/*" capture="environment" multiple><small class="photo-note">Maximum 3 images compressées. Elles seront incluses dans la sauvegarde.</small></label>
      ${finding.attachments?.length ? `<div class="span-2 evidence-grid">${finding.attachments.map((image) => `<img src="${image}" alt="Preuve existante">`).join('')}</div>` : ''}
    </div></form>`,
    actions: `<button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="finding-form">Enregistrer le problème</button>`,
  });
}

function openFollowUpModal(questionId, existing) {
  const context = questionContext(activeAudit(), questionId || existing?.questionId);
  if (!context) return;
  const item = existing || { id: '', questionId, title: context.question.label, evidence: context.question.help, owner: '', dueDate: '', status: 'open' };
  openModal({
    title: existing ? 'Modifier le point à vérifier' : 'Vérifier ce point plus tard',
    subtitle: 'Indiquez qui recontacter et la preuve précise à obtenir.',
    content: `<form id="followup-form"><input type="hidden" name="id" value="${h(item.id)}"><input type="hidden" name="questionId" value="${h(item.questionId)}"><div class="form-grid">
      <label class="field span-2"><span>Question concernée</span><input name="title" value="${h(item.title)}" required></label>
      <label class="field span-2"><span>Ce qu’il faut vérifier ou demander</span><textarea name="evidence" required>${h(item.evidence)}</textarea></label>
      <label class="field"><span>Personne à recontacter</span><input name="owner" value="${h(item.owner)}" placeholder="Nom ou fonction"></label>
      <label class="field"><span>Date prévue</span><input name="dueDate" type="date" value="${h(item.dueDate)}"></label>
    </div></form>`,
    actions: `<button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="followup-form">Enregistrer</button>`,
  });
}

function completeGuidedInterview(audit) {
  const persona = interlocutorFor(audit, workspace.ui.guidedPersona);
  if (!persona) return;
  const mode = workspace.ui.questionnaireMode || 'express';
  const summary = guidedSessionSummary(audit, persona.id, mode);
  audit.guidedSessions.unshift({ id: uid('session'), personaId: persona.id, personaLabel: persona.label, mode, ...summary, completedAt: new Date().toISOString() });
  workspace.ui.guidedPersona = '';
  workspace.ui.guidedIndex = 0;
  persist();
  render();
  openModal({
    title: `${persona.label} · entretien terminé`,
    subtitle: 'Voici ce qui a été enregistré avant de passer à la personne suivante.',
    content: `<section class="interview-summary"><article><strong>${summary.answered}/${summary.total}</strong><span>questions répondues</span></article><article><strong>${summary.risks}</strong><span>problème(s) relevé(s)</span></article><article><strong>${summary.deferred}</strong><span>point(s) à vérifier</span></article><article><strong>${summary.photos}</strong><span>photo(s) ajoutée(s)</span></article></section>${summary.answered < summary.total ? '<p class="summary-warning">Certaines questions restent sans réponse. Vous pourrez reprendre cet entretien depuis la liste.</p>' : '<p class="summary-success">Toutes les questions prévues pour cet entretien ont une réponse.</p>'}`,
    actions: `<button class="secondary-button" data-action="open-visit-check">Contrôler la visite</button><button class="primary-button" data-action="close-modal">Choisir la personne suivante</button>`,
  });
}

function openVisitCheck() {
  const audit = activeAudit();
  const checks = visitChecks(audit);
  const blockers = checks.filter((item) => item.blocking && item.count > 0).length;
  openModal({
    title: blockers ? 'Avant de quitter l’établissement' : 'La visite est prête à être restituée',
    subtitle: blockers ? `${blockers} catégorie(s) demandent encore votre attention.` : 'Les contrôles essentiels sont couverts. Vous pouvez préparer le résultat.',
    wide: true,
    content: `<section class="visit-check-list">${checks.map((item) => `<article class="${item.count === 0 && item.blocking ? 'check-ok' : item.positive ? 'check-info' : 'check-warning'}"><span>${item.count === 0 && item.blocking ? 'OK' : item.count}</span><div><strong>${h(item.label)}</strong><small>${item.count === 0 && item.blocking ? 'Aucun élément restant' : item.positive ? (item.count ? 'Éléments collectés pendant la visite' : 'Aucun élément collecté pour le moment') : 'À examiner avant la restitution'}</small></div><button data-action="visit-check-action" data-view="${item.view}">${h(item.action)}</button></article>`).join('')}</section>`,
    actions: `<button class="secondary-button" data-action="copy-client-followup">Copier le message client</button><button class="primary-button" data-action="visit-check-action" data-view="report">Voir le résultat</button>`,
  });
}

let speechRecognition;

function startDictation(questionId) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    toast('La dictée vocale n’est pas disponible sur ce navigateur. Utilisez le clavier du téléphone.');
    return;
  }
  if (speechRecognition) speechRecognition.stop();
  const recognition = new Recognition();
  speechRecognition = recognition;
  recognition.lang = 'fr-FR';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map((result) => result[0].transcript).join(' ').trim();
    const answer = activeAudit().answers[questionId] || { attachments: [] };
    answer.note = [answer.note, transcript].filter(Boolean).join(' ');
    answer.updatedAt = new Date().toISOString();
    activeAudit().answers[questionId] = answer;
    speechRecognition = null;
    persist();
    render();
    toast('Note vocale ajoutée.');
  };
  recognition.onerror = () => { speechRecognition = null; toast('La dictée n’a pas pu être enregistrée. Vous pouvez saisir la note au clavier.'); };
  recognition.onend = () => { speechRecognition = null; };
  recognition.start();
  toast('Dictée en cours… Parlez maintenant.');
}

function openInterviewModal(existing) {
  const item = existing || { id: '', role: '', name: '', duration: 20, tools: '', painPoints: '', needs: '', notes: '' };
  openModal({
    title: existing ? 'Modifier la personne' : 'Ajouter une personne rencontrée',
    subtitle: 'Notez son rôle, les difficultés qu’elle rencontre et ce qu’elle attend.',
    content: `<form id="interview-form"><input type="hidden" name="id" value="${h(item.id)}"><div class="form-grid">
      <label class="field"><span>Rôle / service</span><input name="role" required value="${h(item.role)}" placeholder="Réceptionniste, manager restaurant..."></label>
      <label class="field"><span>Nom</span><input name="name" value="${h(item.name)}"></label>
      <label class="field"><span>Durée en minutes</span><input name="duration" type="number" min="1" value="${item.duration || 20}"></label>
      <label class="field"><span>Outils utilisés</span><input name="tools" value="${h(item.tools)}" placeholder="Orchestra, caisse, Excel..."></label>
      <label class="field span-2"><span>Difficultés rencontrées</span><textarea name="painPoints">${h(item.painPoints)}</textarea></label>
      <label class="field span-2"><span>Ce qu’elle attend du futur système</span><textarea name="needs">${h(item.needs)}</textarea></label>
      <label class="field span-2"><span>Notes complémentaires</span><textarea name="notes">${h(item.notes)}</textarea></label>
    </div></form>`,
    actions: `<button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="interview-form">Enregistrer</button>`,
  });
}

function openSystemModal(existing) {
  const audit = activeAudit();
  const greenfield = projectTypeOf(audit) === 'greenfield';
  const defaultDomain = activeDomains(audit).find((domain) => domain.modules.length)?.id || 'it';
  const item = existing || { id: '', name: '', domain: defaultDomain, vendor: '', version: '', deployment: '', users: '', api: 'unknown', decision: 'assess', owner: '', location: '', serial: '', condition: 'unknown', notes: '', attachments: [] };
  openModal({
    title: existing ? 'Modifier le matériel ou logiciel' : 'Ajouter un matériel ou logiciel',
    subtitle: greenfield ? 'Ajoutez les caisses, imprimantes, terminaux, équipements réseau et services à connecter.' : 'Ajoutez aussi les fichiers Excel et les outils utilisés sans contrat.',
    content: `<form id="system-form"><input type="hidden" name="id" value="${h(item.id)}"><div class="form-grid">
      <label class="field"><span>${greenfield ? 'Équipement / service' : 'Nom de l’outil'}</span><input name="name" required value="${h(item.name)}" placeholder="${greenfield ? 'Caisse tactile, imprimante, Wave...' : 'Orchestra, logiciel de caisse...'}"></label>
      <label class="field"><span>Domaine</span><select name="domain">${activeDomains(activeAudit()).map((domain) => `<option value="${domain.id}" ${item.domain === domain.id ? 'selected' : ''}>${domain.label}</option>`).join('')}</select></label>
      <label class="field"><span>${greenfield ? 'Marque / prestataire' : 'Éditeur / prestataire'}</span><input name="vendor" value="${h(item.vendor)}"></label>
      <label class="field"><span>${greenfield ? 'Modèle / version' : 'Version'}</span><input name="version" value="${h(item.version)}"></label>
      <label class="field"><span>${greenfield ? 'Installation / connexion' : 'Déploiement'}</span><select name="deployment"><option value="À confirmer" ${item.deployment === 'À confirmer' ? 'selected' : ''}>À confirmer</option><option value="Cloud" ${item.deployment === 'Cloud' ? 'selected' : ''}>Cloud</option><option value="Serveur local" ${item.deployment === 'Serveur local' ? 'selected' : ''}>Serveur local</option><option value="Poste local" ${item.deployment === 'Poste local' ? 'selected' : ''}>Poste local</option><option value="USB / série / réseau" ${item.deployment === 'USB / série / réseau' ? 'selected' : ''}>USB / série / réseau</option><option value="Hybride" ${item.deployment === 'Hybride' ? 'selected' : ''}>Hybride</option></select></label>
      <label class="field"><span>${greenfield ? 'Quantité / emplacements' : 'Nombre d’utilisateurs / postes'}</span><input name="users" value="${h(item.users)}"></label>
      <label class="field"><span>${greenfield ? 'Compatibilité / test' : 'Exports ou API'}</span><select name="api"><option value="unknown" ${item.api === 'unknown' ? 'selected' : ''}>${greenfield ? 'À tester' : 'À vérifier'}</option><option value="yes" ${item.api === 'yes' ? 'selected' : ''}>${greenfield ? 'Test confirmé' : 'Disponible'}</option><option value="no" ${item.api === 'no' ? 'selected' : ''}>${greenfield ? 'Incompatible / absent' : 'Absent'}</option></select></label>
      <label class="field"><span>Orientation</span><select name="decision"><option value="assess" ${item.decision === 'assess' ? 'selected' : ''}>À évaluer</option><option value="keep" ${item.decision === 'keep' ? 'selected' : ''}>À conserver</option><option value="connect" ${item.decision === 'connect' ? 'selected' : ''}>À connecter</option><option value="replace" ${item.decision === 'replace' ? 'selected' : ''}>À remplacer</option><option value="equip" ${item.decision === 'equip' ? 'selected' : ''}>À acquérir</option><option value="retire" ${item.decision === 'retire' ? 'selected' : ''}>À retirer</option></select></label>
      ${greenfield ? `<label class="field"><span>Emplacement</span><input name="location" value="${h(item.location)}" placeholder="Caisse principale, cuisine..."></label><label class="field"><span>N° série / identifiant</span><input name="serial" value="${h(item.serial)}"></label><label class="field"><span>État constaté</span><select name="condition"><option value="unknown" ${item.condition === 'unknown' ? 'selected' : ''}>À contrôler</option><option value="good" ${item.condition === 'good' ? 'selected' : ''}>Bon état</option><option value="limited" ${item.condition === 'limited' ? 'selected' : ''}>Utilisable avec réserve</option><option value="out" ${item.condition === 'out' ? 'selected' : ''}>Hors service</option></select></label><label class="field photo-picker"><span>Photos de l’équipement</span><input name="photos" type="file" accept="image/*" capture="environment" multiple><small class="photo-note">Maximum 2 images compressées.</small></label>${item.attachments?.length ? `<div class="span-2 evidence-grid">${item.attachments.map((image) => `<img src="${image}" alt="Photo existante">`).join('')}</div>` : ''}` : ''}
      <label class="field span-2"><span>Responsable / support</span><input name="owner" value="${h(item.owner)}"></label>
      <label class="field span-2"><span>Notes, dépendances et limites</span><textarea name="notes">${h(item.notes)}</textarea></label>
    </div></form>`,
    actions: `<button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="system-form">Enregistrer</button>`,
  });
}

function openMissionSettings() {
  const audit = activeAudit();
  const config = projectConfig(audit);
  openModal({
    title: 'Paramètres de la mission',
    subtitle: 'Mettez à jour le périmètre sans perdre les réponses existantes.',
    wide: true,
    content: `<form id="mission-settings-form"><div class="form-grid">
      <div class="mission-type-summary span-2"><small>Type de mission</small><strong>${h(config.label)}</strong><p>${h(config.description)} Le type est figé pour préserver la cohérence des réponses et du rapport.</p></div>
      <label class="field"><span>Client / groupe</span><input name="client" required value="${h(audit.client)}"></label>
      <label class="field"><span>Établissement</span><input name="establishment" required value="${h(audit.establishment)}"></label>
      <label class="field"><span>Lieu</span><input name="location" value="${h(audit.location)}"></label>
      <label class="field"><span>Date</span><input name="auditDate" type="date" value="${h(audit.auditDate)}"></label>
      <label class="field"><span>Auditeur</span><input name="auditor" value="${h(audit.auditor)}"></label>
      <label class="field"><span>Contact</span><input name="contact" value="${h(audit.contact)}"></label>
      <label class="field span-2"><span>Objectif</span><textarea name="objectives">${h(audit.objectives)}</textarea></label>
      <div class="field span-2"><span>Activités concernées</span><div class="module-checks">${MODULES.map((module) => `<label><input type="checkbox" name="modules" value="${module.id}" ${audit.modules.includes(module.id) ? 'checked' : ''} ${module.id === 'stock' ? 'disabled' : ''}><span>${module.label}${module.id === 'stock' ? ' · socle inclus' : ''}</span></label>`).join('')}</div></div>
    </div></form>`,
    actions: `<button class="danger-button" data-action="delete-audit">Supprimer</button><button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="mission-settings-form">Enregistrer</button>`,
  });
}

function openSizingModal() {
  const audit = activeAudit();
  const sizing = audit.sizing || defaultSizing();
  const replacement = projectTypeOf(audit) === 'replacement';
  const numberField = (name, label, value) => `<label class="field"><span>${label}</span><input name="${name}" type="number" min="0" step="1" value="${Number(value) || 0}"></label>`;
  openModal({
    title: 'Indiquer la taille du projet',
    subtitle: 'Renseignez seulement les quantités que vous connaissez. Elles aideront à préparer la proposition.',
    wide: true,
    content: `<form id="sizing-form"><div class="form-grid">
      <div class="form-section-title span-2"><strong>Volumes du périmètre</strong><small>Ne comptez que les éléments réellement inclus dans le projet.</small></div>
      ${numberField('sites', 'Sites / établissements', sizing.sites)}
      ${numberField('pos', 'Points de vente', sizing.pos)}
      ${numberField('cashRegisters', 'Postes de caisse', sizing.cashRegisters)}
      ${numberField('warehouses', 'Dépôts / zones de stock', sizing.warehouses)}
      ${numberField('rooms', 'Chambres', sizing.rooms)}
      ${numberField('users', 'Utilisateurs à former', sizing.users)}
      ${numberField('printers', 'Imprimantes / KDS', sizing.printers)}
      ${numberField('products', 'Produits et recettes', sizing.products)}
      ${numberField('integrations', replacement ? 'Interfaces / sources à reprendre' : 'Services / interfaces à connecter', sizing.integrations)}
      ${replacement ? numberField('historyYears', 'Années d’historique à reprendre', sizing.historyYears) : ''}
      <div class="form-section-title span-2"><strong>Pilote et décision</strong><small>Une prochaine étape datée évite que l’audit reste sans suite.</small></div>
      <label class="field span-2"><span>Périmètre du pilote</span><input name="pilot" value="${h(sizing.pilot)}" placeholder="Exemple : restaurant principal, caisse 1, dépôt cuisine, équipe du matin"></label>
      <label class="field"><span>Date cible de mise en service</span><input name="targetDate" type="date" value="${h(sizing.targetDate)}"></label>
      <label class="field"><span>Décideur final</span><input name="decisionMaker" value="${h(sizing.decisionMaker)}" placeholder="Nom et fonction"></label>
      <label class="field span-2"><span>Contraintes de déploiement</span><textarea name="constraints" placeholder="Saison, horaires, réseau, disponibilité des équipes, contrat Orchestra...">${h(sizing.constraints)}</textarea></label>
      <label class="field span-2"><span>Prochaine étape convenue</span><input name="nextStep" value="${h(sizing.nextStep)}" placeholder="Exemple : réception des exports puis atelier de validation du périmètre"></label>
      <label class="field"><span>Responsable de la prochaine étape</span><input name="nextStepOwner" value="${h(sizing.nextStepOwner)}"></label>
      <label class="field"><span>Date de la prochaine étape</span><input name="nextStepDate" type="date" value="${h(sizing.nextStepDate)}"></label>
    </div></form>`,
    actions: `<button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="sizing-form">Enregistrer</button>`,
  });
}

function openMissions() {
  openModal({
    title: 'Missions d’audit',
    subtitle: 'Ouvrez une mission existante ou préparez un nouvel établissement.',
    content: `<section class="item-list">${workspace.audits.map((audit) => `<article class="list-card"><span class="marker">${auditMetrics(audit).progress}%</span><div><h3>${h(audit.establishment)}</h3><p>${h(projectConfig(audit).label)} · ${h(audit.client)} · ${formatDate(audit.auditDate)}</p><small>Dernière sauvegarde ${formatDateTime(audit.updatedAt)}</small></div><div class="list-actions"><button data-action="switch-audit" data-id="${audit.id}">Ouvrir</button></div></article>`).join('')}</section>`,
    actions: `<button class="secondary-button" data-action="close-modal">Fermer</button><button class="primary-button" data-action="new-audit">Nouvelle mission</button>`,
  });
}

function openPreparation() {
  const audit = activeAudit();
  const items = projectTypeOf(audit) === 'greenfield' ? [
    'Confirmer les responsables des opérations, des caisses, du stock, de la finance et du matériel.',
    'Demander l’autorisation de photographier les matériels, branchements, écrans et documents utiles.',
    'Obtenir la liste ou les factures des caisses, imprimantes, tiroirs, scanners, terminaux et équipements réseau.',
    'Prévoir un accès aux postes afin de relever système, ports, pilotes, réseau et périphériques sans modifier la configuration.',
    'Demander les catalogues, prix, fournisseurs, employés, dépôts, moyens de paiement et niveaux de stock disponibles.',
    'Observer une vente, un encaissement, une réception et une clôture tels qu’ils sont réellement exécutés aujourd’hui.',
    'Choisir avec le responsable un site, un POS, un dépôt et une équipe pour le futur pilote.',
    'Exporter la sauvegarde JSON avant de quitter l’établissement.',
  ] : [
    'Confirmer les interlocuteurs : direction, réception, restaurant, stock, finance et IT.',
    'Demander l’autorisation de photographier les écrans, matériels et documents.',
    'Prévoir chargeur, batterie externe et connexion de secours.',
    'Obtenir un accès de consultation aux outils, sans compte administrateur partagé.',
    'Demander un export récent de chaque système critique.',
    'Commencer par observer un parcours réel avant de poser les questions détaillées.',
    'Exporter la sauvegarde JSON avant de quitter l’établissement.',
  ];
  openModal({
    title: 'Préparer la visite terrain',
    subtitle: 'À vérifier avant de commencer les entretiens.',
    content: `<div class="item-list">${items.map((item, index) => `<article class="list-card"><span class="marker">${index + 1}</span><div><h3>${item}</h3></div></article>`).join('')}</div>`,
    actions: `<button class="primary-button" data-action="close-modal">J’ai préparé la visite</button>`,
  });
}

function decisionLabel(value) {
  return ({ assess: 'À évaluer', keep: 'À conserver', connect: 'À connecter', replace: 'À remplacer', equip: 'À acquérir', retire: 'À retirer' })[value] || 'À évaluer';
}

function responsiblePartyLabel(value) {
  return ({ client: 'Action client', sartal: 'Action Sártal', joint: 'Action conjointe', 'third-party': 'Action prestataire' })[value] || 'Responsabilité à confirmer';
}

function connectionStatusLabel(audit, value) {
  if (projectTypeOf(audit) === 'greenfield') return ({ yes: 'Test confirmé', no: 'Incompatible / absent', unknown: 'À tester' })[value] || 'À tester';
  return ({ yes: 'Disponible', no: 'Absent', unknown: 'À vérifier' })[value] || 'À vérifier';
}

function hardwareConditionLabel(value) {
  return ({ good: 'Bon état', limited: 'Utilisable avec réserve', out: 'Hors service', unknown: 'État à contrôler' })[value] || 'État à contrôler';
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
  const rows = [['Domaine', 'Question', 'Statut', 'Note', 'Photos', 'À vérifier plus tard', 'Essentiel']];
  activeDomains(audit).forEach((domain) => domain.questions.forEach((question) => {
    const answer = audit.answers[question.id] || {};
    const followUp = audit.followUps.find((item) => item.questionId === question.id && item.status !== 'done');
    rows.push([domain.label, question.label, statusMeta(audit, answer.status)?.label || 'Non renseigné', answer.note || '', answer.attachments?.length || 0, followUp ? `${followUp.evidence} · ${followUp.owner || 'personne à identifier'} · ${followUp.dueDate || 'date à fixer'}` : '', question.required ? 'Oui' : 'Non']);
  }));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
  downloadBlob(`sartal-audit-${slug(audit.establishment)}-questions.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8');
  toast('Matrice de questionnaire exportée.');
}

function exportActionPlan() {
  const audit = activeAudit();
  const rows = [['Priorité', 'Action', 'Détail', 'Responsabilité', 'Responsable', 'Échéance', 'Statut', 'Source']];
  buildPriorities(audit).forEach((item) => rows.push([item.priority, item.action || item.title, item.detail || '', responsiblePartyLabel(item.responsibleParty), item.owner || 'À nommer', item.dueDate || '', item.status || 'open', item.source || 'Audit']));
  audit.followUps.forEach((item) => rows.push(['P3', item.evidence, item.title, 'Action client', item.owner || 'À nommer', item.dueDate || '', item.status, 'Vérification différée']));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
  downloadBlob(`sartal-audit-${slug(audit.establishment)}-plan-action.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8');
  toast('Plan d’action exporté.');
}

async function copyClientFollowUp() {
  const audit = activeAudit();
  const content = buildFollowUpText(audit);
  try {
    await navigator.clipboard.writeText(content);
    toast('Message de suivi client copié.');
  } catch {
    downloadBlob(`sartal-audit-${slug(audit.establishment)}-suivi-client.txt`, content, 'text/plain;charset=utf-8');
    toast('Le message de suivi a été téléchargé.');
  }
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

  if (form.id === 'audit-access-form') {
    const code = String(data.get('accessCode') || '').replace(/\D/g, '').slice(0, 4);
    const field = form.querySelector('[name="accessCode"]');
    const error = form.querySelector('[data-access-error]');
    if (code === ACCESS_CODE) {
      writeAccessSession(true);
      render();
      toast('Accès à Sártal Audit autorisé.');
    } else {
      error.textContent = code.length === 4 ? 'Code incorrect. Vérifiez les quatre chiffres.' : 'Saisissez exactement quatre chiffres.';
      field.value = '';
      field.focus();
    }
    return;
  }

  if (form.id === 'create-mission-form') {
    createAudit({
      projectType: data.get('projectType'), client: data.get('client'), establishment: data.get('establishment'), location: data.get('location'), auditDate: data.get('auditDate'), auditor: data.get('auditor'), contact: data.get('contact'), objectives: data.get('objectives'), modules: data.getAll('modules'),
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
      id: id || uid('finding'), sourceQuestionId: data.get('sourceQuestionId') || '', severity: data.get('severity'), domain: data.get('domain'), title: data.get('title').trim(), situation: data.get('situation').trim(), impact: data.get('impact').trim(), recommendation: data.get('recommendation').trim(), responsibleParty: data.get('responsibleParty'), owner: data.get('owner').trim(), dueDate: data.get('dueDate'), status: data.get('status'), attachments, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    if (existing) Object.assign(existing, item); else audit.findings.unshift(item);
    closeModal();
    const saved = persist();
    render();
    toast(saved ? 'Problème enregistré.' : 'Problème conservé dans cette session. Sauvegardez la visite avant de quitter.');
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
    toast(saved ? 'Personne enregistrée.' : 'Personne conservée dans cette session. Sauvegardez la visite avant de quitter.');
  }

  if (form.id === 'followup-form') {
    const audit = activeAudit();
    const id = data.get('id');
    const existing = audit.followUps.find((item) => item.id === id);
    const item = { id: id || uid('followup'), questionId: data.get('questionId'), title: data.get('title').trim(), evidence: data.get('evidence').trim(), owner: data.get('owner').trim(), dueDate: data.get('dueDate'), status: existing?.status || 'open', createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (existing) Object.assign(existing, item); else audit.followUps.unshift(item);
    const answer = audit.answers[item.questionId] || { attachments: [] };
    if (!answer.status) answer.status = 'unknown';
    audit.answers[item.questionId] = { ...answer, updatedAt: new Date().toISOString() };
    closeModal();
    persist();
    render();
    toast('Point à vérifier enregistré.');
  }

  if (form.id === 'system-form') {
    const audit = activeAudit();
    const id = data.get('id');
    const existing = audit.systems.find((item) => item.id === id);
    const photos = Array.from(data.getAll('photos')).filter((file) => file instanceof File && file.size).slice(0, Math.max(0, 2 - (existing?.attachments?.length || 0)));
    const attachments = [...(existing?.attachments || [])];
    for (const photo of photos) attachments.push(await compressImage(photo));
    const item = {
      id: id || uid('system'), name: data.get('name').trim(), domain: data.get('domain'), vendor: data.get('vendor').trim(), version: data.get('version').trim(), deployment: data.get('deployment'), users: data.get('users').trim(), api: data.get('api'), decision: data.get('decision'), owner: data.get('owner').trim(), location: String(data.get('location') || '').trim(), serial: String(data.get('serial') || '').trim(), condition: data.get('condition') || 'unknown', notes: data.get('notes').trim(), attachments,
    };
    if (existing) Object.assign(existing, item); else audit.systems.unshift(item);
    closeModal();
    const saved = persist();
    render();
    const label = projectTypeOf(audit) === 'greenfield' ? 'Équipement' : 'Outil';
    toast(saved ? `${label} enregistré.` : `${label} conservé dans cette session. Exportez la mission en JSON.`);
  }

  if (form.id === 'mission-settings-form') {
    const audit = activeAudit();
    audit.client = data.get('client').trim();
    audit.establishment = data.get('establishment').trim();
    audit.location = data.get('location').trim();
    audit.auditDate = data.get('auditDate');
    audit.auditor = data.get('auditor').trim();
    audit.contact = data.get('contact').trim();
    audit.objectives = data.get('objectives').trim();
    audit.modules = [...new Set([...data.getAll('modules'), 'stock'])];
    audit.documents = documentTemplatesFor(projectTypeOf(audit), audit.modules).map((template) => {
      const existing = audit.documents.find((item) => item.id === template.id);
      return existing ? { ...template, status: existing.status, note: existing.note } : { ...template, status: 'requested', note: '' };
    });
    closeModal();
    const saved = persist();
    render();
    toast(saved ? 'Mission mise à jour.' : 'Mission modifiée dans cette session. Exportez-la en JSON.');
  }

  if (form.id === 'sizing-form') {
    const audit = activeAudit();
    const integer = (name) => Math.max(0, Number.parseInt(data.get(name), 10) || 0);
    audit.sizing = {
      sites: integer('sites'), pos: integer('pos'), cashRegisters: integer('cashRegisters'), warehouses: integer('warehouses'), rooms: integer('rooms'), users: integer('users'), printers: integer('printers'), products: integer('products'), integrations: integer('integrations'), historyYears: integer('historyYears'), pilot: data.get('pilot').trim(), targetDate: data.get('targetDate'), constraints: data.get('constraints').trim(), decisionMaker: data.get('decisionMaker').trim(), nextStep: data.get('nextStep').trim(), nextStepOwner: data.get('nextStepOwner').trim(), nextStepDate: data.get('nextStepDate'),
    };
    closeModal();
    const saved = persist();
    render();
    toast(saved ? 'Périmètre de chiffrage enregistré.' : 'Cadrage conservé dans cette session. Exportez la mission en JSON.');
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
  if (action === 'continue-audit') { workspace.ui.view = 'questionnaire'; workspace.ui.guidedPersona = ''; workspace.ui.guidedIndex = 0; persist(false); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (action === 'select-domain') { workspace.ui.view = 'questionnaire'; workspace.ui.guidedPersona = `domain:${target.dataset.domain}`; workspace.ui.guidedIndex = 0; persist(false); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (action === 'start-persona') {
    workspace.ui.guidedPersona = target.dataset.persona;
    const entries = guidedQuestions(audit, target.dataset.persona, workspace.ui.questionnaireMode || 'express');
    const firstUnanswered = entries.findIndex(({ question }) => !audit.answers[question.id]?.status);
    workspace.ui.guidedIndex = firstUnanswered >= 0 ? firstUnanswered : 0;
    persist(false); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (action === 'change-persona') { workspace.ui.guidedPersona = ''; workspace.ui.guidedIndex = 0; persist(false); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (action === 'open-notes') { workspace.ui.view = 'terrain'; workspace.ui.terrainTab = 'findings'; persist(false); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (action === 'question-mode') { workspace.ui.questionnaireMode = target.dataset.mode; workspace.ui.guidedIndex = 0; persist(false); render(); }
  if (action === 'previous-question') { workspace.ui.guidedIndex = Math.max(0, (Number(workspace.ui.guidedIndex) || 0) - 1); persist(false); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (action === 'next-question') {
    const entries = guidedQuestions(audit, workspace.ui.guidedPersona, workspace.ui.questionnaireMode || 'express');
    const index = Number(workspace.ui.guidedIndex) || 0;
    if (index + 1 >= entries.length) completeGuidedInterview(audit);
    else { workspace.ui.guidedIndex = index + 1; persist(false); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }
  if (action === 'answer') {
    const questionId = target.dataset.question;
    const current = audit.answers[questionId] || { note: '', attachments: [] };
    audit.answers[questionId] = { ...current, status: target.dataset.value, updatedAt: new Date().toISOString() };
    persist(); render();
  }
  if (action === 'finding-from-question') {
    const domain = activeDomains(audit).find((item) => item.id === target.dataset.domain);
    const question = domain?.questions.find((item) => item.id === target.dataset.question);
    const answer = audit.answers[target.dataset.question];
    if (domain && question) openFindingModal(null, { sourceQuestionId: question.id, domain: domain.id, title: question.label, situation: answer?.note || question.help });
  }
  if (action === 'defer-question') {
    const existing = audit.followUps.find((item) => item.questionId === target.dataset.question && item.status !== 'done');
    openFollowUpModal(target.dataset.question, existing);
  }
  if (action === 'dictate-note') startDictation(target.dataset.question);
  if (action === 'open-visit-check') openVisitCheck();
  if (action === 'visit-check-action') {
    closeModal();
    if (target.dataset.view === 'report') workspace.ui.view = 'report';
    else if (target.dataset.view === 'questionnaire') { workspace.ui.view = 'questionnaire'; workspace.ui.guidedPersona = ''; }
    else { workspace.ui.view = 'terrain'; workspace.ui.terrainTab = target.dataset.view; }
    persist(false); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (action === 'terrain-tab') { workspace.ui.terrainTab = target.dataset.tab; persist(false); render(); }
  if (action === 'add-finding') openFindingModal(null, { domain: target.dataset.domain });
  if (action === 'edit-finding') openFindingModal(audit.findings.find((item) => item.id === target.dataset.id));
  if (action === 'delete-finding') removeById('findings', target.dataset.id, 'ce problème');
  if (action === 'add-interview') openInterviewModal();
  if (action === 'edit-interview') openInterviewModal(audit.interviews.find((item) => item.id === target.dataset.id));
  if (action === 'delete-interview') removeById('interviews', target.dataset.id, 'cette personne');
  if (action === 'edit-followup') openFollowUpModal('', audit.followUps.find((item) => item.id === target.dataset.id));
  if (action === 'delete-followup') removeById('followUps', target.dataset.id, 'ce point à vérifier');
  if (action === 'complete-followup') {
    const item = audit.followUps.find((row) => row.id === target.dataset.id);
    if (item) { item.status = item.status === 'done' ? 'open' : 'done'; persist(); render(); }
  }
  if (action === 'add-system') openSystemModal();
  if (action === 'edit-system') openSystemModal(audit.systems.find((item) => item.id === target.dataset.id));
  if (action === 'delete-system') removeById('systems', target.dataset.id, projectTypeOf(audit) === 'greenfield' ? 'cet équipement' : 'cet outil');
  if (action === 'open-settings') openMissionSettings();
  if (action === 'open-sizing') openSizingModal();
  if (action === 'open-missions') openMissions();
  if (action === 'switch-audit') { workspace.activeAuditId = target.dataset.id; workspace.ui.view = 'overview'; closeModal(); persist(); render(); }
  if (action === 'new-audit') { workspace.activeAuditId = null; closeModal(); persist(false); render(); }
  if (action === 'open-preparation') openPreparation();
  if (action === 'lock-audit') { writeAccessSession(false); closeModal(); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
  if (action === 'export-backup') exportBackup();
  if (action === 'import-backup') backupImport.click();
  if (action === 'export-csv') exportCsv();
  if (action === 'export-actions') exportActionPlan();
  if (action === 'copy-client-followup') copyClientFollowUp();
  if (action === 'print-report') { document.querySelectorAll('.report-details').forEach((details) => { details.open = true; }); window.print(); }
  if (action === 'delete-audit') {
    if (!window.confirm('Supprimer définitivement cette mission de cet appareil ? Exportez une sauvegarde avant de continuer.')) return;
    workspace.audits = workspace.audits.filter((item) => item.id !== audit.id);
    workspace.activeAuditId = workspace.audits[0]?.id || null;
    closeModal(); persist(false); render();
  }
});

document.addEventListener('input', (event) => {
  if (event.target.matches('[name="accessCode"]')) {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
    return;
  }
  const audit = activeAudit();
  if (!audit) return;
  if (event.target.matches('[data-question-note]')) {
    const questionId = event.target.dataset.questionNote;
    audit.answers[questionId] = { attachments: [], ...(audit.answers[questionId] || {}), note: event.target.value, updatedAt: new Date().toISOString() };
    schedulePersist();
  }
  if (event.target.matches('[data-document-note]')) {
    const item = audit.documents.find((row) => row.id === event.target.dataset.documentNote);
    if (item) { item.note = event.target.value; schedulePersist(); }
  }
});

document.addEventListener('change', async (event) => {
  const audit = activeAudit();
  if (!audit) return;
  if (event.target.matches('[data-question-photo]')) {
    const file = event.target.files?.[0];
    if (!file) return;
    const questionId = event.target.dataset.questionPhoto;
    const answer = audit.answers[questionId] || { note: '', attachments: [] };
    const attachments = [...(answer.attachments || [])];
    if (attachments.length >= 3) { toast('Trois photos maximum par question.'); return; }
    attachments.push(await compressImage(file));
    audit.answers[questionId] = { ...answer, attachments, updatedAt: new Date().toISOString() };
    persist(); render(); toast('Photo ajoutée à la question.');
    return;
  }
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
    const imported = parsed.audit || parsed;
    if (!imported?.id || !imported?.establishment || !Array.isArray(imported.findings)) throw new Error('Format non reconnu');
    const audit = normalizeAudit(imported);
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
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).catch((error) => console.warn('Service worker non disponible', error)));
}

render();
