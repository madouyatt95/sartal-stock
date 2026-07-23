const STORAGE_KEY = 'sartal-audit-workspace-v1';
const ACCESS_SESSION_KEY = 'sartal-audit-access-v1';
const ACCESS_CODE = '0134';

const MODULES = [
  { id: 'pms', label: 'Hôtel / PMS' },
  { id: 'restaurant', label: 'Restaurant / POS' },
  { id: 'stock', label: 'Stock / achats' },
  { id: 'finance', label: 'Finance / caisses' },
  { id: 'customer', label: 'Expérience client' },
  { id: 'online', label: 'Vente en ligne' },
  { id: 'it', label: 'IT / matériel' },
  { id: 'data', label: 'Données / déploiement' },
];

const PROJECT_TYPES = {
  replacement: {
    label: 'Remplacer un système existant',
    shortLabel: 'Remplacement',
    description: 'Cartographier Orchestra, les caisses et les interfaces afin de conserver, connecter, migrer ou remplacer sans interrompre l’activité.',
    objective: 'Évaluer le système actuel, sécuriser la récupération des données et préparer un remplacement progressif sans rupture d’exploitation.',
    scoreLabel: 'maturité actuelle',
    scoreShortLabel: 'maturité',
    reportTitle: 'Rapport d’audit du système existant',
  },
  greenfield: {
    label: 'Déployer un premier système',
    shortLabel: 'Premier déploiement',
    description: 'Partir des opérations et du matériel déjà disponibles pour concevoir la configuration, les données initiales et le plan de mise en service.',
    objective: 'Cadrer le premier système de gestion, vérifier la compatibilité du matériel et préparer un déploiement opérationnel adapté à l’activité.',
    scoreLabel: 'préparation au déploiement',
    scoreShortLabel: 'préparation',
    reportTitle: 'Rapport de cadrage du premier déploiement',
  },
};

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
      parsed.ui = { view: 'overview', questionnaireDomain: 'direction', questionnaireMode: 'express', terrainTab: 'findings', query: '', severity: 'all', ...(parsed.ui || {}) };
      return parsed;
    }
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

function normalizeAudit(audit) {
  return {
    ...audit,
    projectType: PROJECT_TYPES[audit.projectType] ? audit.projectType : 'replacement',
    modules: Array.isArray(audit.modules) ? audit.modules : ['stock'],
    answers: audit.answers || {},
    findings: Array.isArray(audit.findings) ? audit.findings : [],
    interviews: Array.isArray(audit.interviews) ? audit.interviews : [],
    systems: Array.isArray(audit.systems) ? audit.systems : [],
    documents: Array.isArray(audit.documents) ? audit.documents : [],
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
  return { ...meta, label: ({ yes: 'Prêt', partial: 'À compléter', no: 'Non défini', unknown: 'À confirmer', na: 'N/A' })[value] };
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
  const modules = data.modules?.length ? data.modules : ['pms', 'restaurant', 'stock', 'finance', 'customer', 'it', 'data'];
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
          <h1>Le bon diagnostic pour chaque point de départ.</h1>
          <p>Remplacer un système existant ou équiper une entreprise pour la première fois exige deux démarches différentes.</p>
          <div class="gateway-points">
            <div><b>1</b><span>Remplacement sans rupture</span></div>
            <div><b>2</b><span>Premier équipement opérationnel</span></div>
            <div><b>3</b><span>Matériel et données vérifiés</span></div>
            <div><b>4</b><span>Plan d’action prêt à chiffrer</span></div>
          </div>
        </div>
        <form class="gateway-form" id="create-mission-form">
          <h2>Créer une mission d’audit</h2>
          <p>Choisissez d’abord la situation réelle du client. Le questionnaire, les pièces et le rapport s’adapteront automatiquement.</p>
          <div class="form-grid">
            <div class="field span-2"><span>Situation du client</span><div class="project-type-options">
              ${Object.entries(PROJECT_TYPES).map(([value, config], index) => `<label class="project-type-card"><input type="radio" name="projectType" value="${value}" ${index === 0 ? 'checked' : ''}><span><strong>${config.label}</strong><small>${config.description}</small></span></label>`).join('')}
            </div></div>
            <label class="field"><span>Client / groupe</span><input name="client" required placeholder="Nom du groupe ou du gérant"></label>
            <label class="field"><span>Établissement</span><input name="establishment" required placeholder="Complexe hôtelier et restaurant"></label>
            <label class="field"><span>Lieu</span><input name="location" placeholder="Ville, adresse ou site"></label>
            <label class="field"><span>Date de visite</span><input name="auditDate" type="date" value="${today()}" required></label>
            <label class="field"><span>Auditeur</span><input name="auditor" required placeholder="Votre nom"></label>
            <label class="field"><span>Contact principal</span><input name="contact" placeholder="Nom, fonction, téléphone"></label>
            <label class="field span-2"><span>Objectif annoncé</span><textarea name="objectives" placeholder="Exemple : remplacer Orchestra sans rupture, ou déployer un premier système autour du matériel existant."></textarea></label>
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
      <button class="icon-button audit-lock-button" data-action="lock-audit" aria-label="Verrouiller Sártal Audit">VR</button>
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
  const config = projectConfig(audit);
  const visitPlan = visitPlanFor(audit);
  const firstIncomplete = metrics.domains.find((row) => row.progress < 100)?.domain.id || metrics.domains[0]?.domain.id || 'direction';
  return `<div class="page-container">
    <header class="page-heading"><div><span class="eyebrow">${h(config.shortLabel)}</span><h1>Votre mission est prête.</h1><p>${h(config.description)}</p></div><div class="action-row"><button class="secondary-button" data-action="open-preparation">Préparer la visite</button><button class="primary-button" data-action="continue-audit" data-domain="${firstIncomplete}">Commencer le diagnostic</button></div></header>
    <section class="overview-hero">
      <article class="card mission-card"><span class="eyebrow">${h(audit.client || 'Client')}</span><h2>${h(audit.establishment)}</h2><p>${h(audit.objectives || config.objective)}</p><div class="mission-meta"><span>${h(config.label)}</span><span>${formatDate(audit.auditDate)}</span><span>${h(audit.location || 'Lieu à confirmer')}</span><span>${h(audit.auditor)}</span><span>${audit.modules.length} périmètres</span></div></article>
      <article class="card score-card"><div class="score-ring" style="--score:${metrics.score}"><span><strong>${metrics.score}%</strong><small>${h(config.scoreShortLabel)}</small></span></div><div><strong>${metrics.progress}% du diagnostic renseigné</strong><small>${metrics.answered} réponses sur ${metrics.total}</small></div></article>
    </section>
    <section class="kpi-grid">
      ${kpi('Questions traitées', `${metrics.answered}/${metrics.total}`, 'Progression globale', 'info')}
      ${kpi('Constats critiques', metrics.critical, 'À confirmer avant le départ', metrics.critical ? 'danger' : '')}
      ${kpi('Constats majeurs', metrics.major, 'À intégrer au plan d’action', metrics.major ? 'warning' : '')}
      ${kpi('Pièces vérifiées', `${metrics.verifiedDocs}/${audit.documents.length}`, 'Exports et preuves reçus', '')}
    </section>
    <section class="overview-grid">
      <article class="card"><div class="card-header"><div><h2>Couverture par domaine</h2><p>Le score reflète seulement les réponses déjà renseignées.</p></div></div><div class="card-body domain-grid">${metrics.domains.map((row) => renderDomainCard(row)).join('')}</div></article>
      <article class="card"><div class="card-header"><div><h2>Parcours conseillé sur site</h2><p>Adaptez les horaires, mais gardez cet ordre.</p></div></div><div class="card-body visit-plan">${visitPlan.map((item) => `<article><time>${item.time}</time><span><strong>${item.label}</strong><small>${item.detail}</small></span><b>${item.duration}</b></article>`).join('')}</div></article>
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
  const status = answer.status ? statusMeta(audit, answer.status) : null;
  return `<article class="question-card ${status ? `answer-${status.className}` : ''}">
    <header><span class="question-index">${String(index + 1).padStart(2, '0')}</span><div class="question-copy"><h3>${question.label}</h3><p>${question.help}</p></div>${question.required ? '<span class="required-badge">Essentiel</span>' : ''}</header>
    <div class="answer-segments">${Object.keys(STATUS).map((value) => { const meta = statusMeta(audit, value); return `<button data-action="answer" data-question="${question.id}" data-value="${value}" class="${answer.status === value ? 'active' : ''}">${meta.label}</button>`; }).join('')}</div>
    <div class="question-note"><textarea data-question-note="${question.id}" placeholder="Fait observé, exemple, nom de l’écran, référence ou pièce à demander...">${h(answer.note || '')}</textarea><button data-action="finding-from-question" data-question="${question.id}" data-domain="${domain.id}">Créer un constat</button></div>
  </article>`;
}

function renderTerrain(audit) {
  const tab = workspace.ui.terrainTab || 'findings';
  const inventoryLabel = projectTypeOf(audit) === 'greenfield' ? 'Matériel et services' : 'Outils';
  return `<div class="page-container">
    <header class="page-heading"><div><span class="eyebrow">Terrain et preuves</span><h1>Conserver les faits, pas les impressions.</h1><p>Constats, entretiens, inventaire et pièces restent liés à la mission et seront repris dans le rapport.</p></div><div class="action-row">${tabActionButton(tab, audit)}</div></header>
    <nav class="section-tabs">${[
      ['findings', `Constats (${audit.findings.length})`],
      ['interviews', `Entretiens (${audit.interviews.length})`],
      ['systems', `${inventoryLabel} (${audit.systems.length})`],
      ['documents', `Pièces (${audit.documents.length})`],
    ].map(([id, label]) => `<button class="${tab === id ? 'active' : ''}" data-action="terrain-tab" data-tab="${id}">${label}</button>`).join('')}</nav>
    ${tab === 'interviews' ? renderInterviews(audit) : tab === 'systems' ? renderSystems(audit) : tab === 'documents' ? renderDocuments(audit) : renderFindings(audit)}
  </div>`;
}

function tabActionButton(tab, audit) {
  if (tab === 'documents') return '<button class="secondary-button" data-action="export-backup">Sauvegarder</button>';
  const labels = { findings: 'Nouveau constat', interviews: 'Nouvel entretien', systems: projectTypeOf(audit) === 'greenfield' ? 'Ajouter un équipement' : 'Ajouter un outil' };
  const actions = { findings: 'add-finding', interviews: 'add-interview', systems: 'add-system' };
  return `<button class="primary-button" data-action="${actions[tab]}">${labels[tab]}</button>`;
}

function renderFindings(audit) {
  const query = (workspace.ui.query || '').toLowerCase();
  const severity = workspace.ui.severity || 'all';
  const rows = audit.findings.filter((finding) => (severity === 'all' || finding.severity === severity) && (!query || `${finding.title} ${finding.situation} ${finding.impact} ${finding.recommendation}`.toLowerCase().includes(query)));
  return `<div class="filter-bar"><input data-filter-query placeholder="Rechercher dans les constats" value="${h(workspace.ui.query || '')}"><select data-filter-severity><option value="all">Toutes les criticités</option>${Object.entries(SEVERITIES).map(([value, meta]) => `<option value="${value}" ${severity === value ? 'selected' : ''}>${meta.label}</option>`).join('')}</select><button class="primary-button" data-action="add-finding">Nouveau constat</button></div>
    <section class="item-list">${rows.length ? rows.map((finding) => renderFindingCard(audit, finding)).join('') : emptyState('Aucun constat pour ce filtre', 'Ajoutez un fait observé, son impact et la recommandation associée.', 'add-finding', 'Créer le premier constat')}</section>`;
}

function renderFindingCard(audit, finding) {
  const domain = activeDomains(audit).find((item) => item.id === finding.domain);
  return `<article class="list-card"><span class="marker ${finding.severity}">${SEVERITIES[finding.severity]?.short || 'P?'}</span><div><h3>${h(finding.title)}</h3><p>${h(finding.situation)}</p>${finding.impact ? `<p><strong>Impact :</strong> ${h(finding.impact)}</p>` : ''}${finding.recommendation ? `<p><strong>Recommandation :</strong> ${h(finding.recommendation)}</p>` : ''}<small>${h(domain?.label || finding.domain)} · ${formatDateTime(finding.createdAt)} · ${finding.status === 'closed' ? 'Traité' : 'Ouvert'}</small>${finding.attachments?.length ? `<div class="evidence-grid">${finding.attachments.map((image) => `<img src="${image}" alt="Preuve du constat">`).join('')}</div>` : ''}</div><div class="list-actions"><button data-action="edit-finding" data-id="${finding.id}" aria-label="Modifier">MOD</button><button data-action="delete-finding" data-id="${finding.id}" aria-label="Supprimer">SUP</button></div></article>`;
}

function renderInterviews(audit) {
  return `<section class="item-list">${audit.interviews.length ? audit.interviews.map((item) => `<article class="list-card"><span class="marker">${h(item.role.split(' ').map((part) => part[0]).join('').slice(0, 3).toUpperCase())}</span><div><h3>${h(item.role)}${item.name ? ` · ${h(item.name)}` : ''}</h3><p>${h(item.painPoints || 'Aucun irritant saisi.')}</p>${item.needs ? `<p><strong>Attentes :</strong> ${h(item.needs)}</p>` : ''}<small>${h(item.tools || 'Outils non renseignés')} · ${item.duration || 0} min</small></div><div class="list-actions"><button data-action="edit-interview" data-id="${item.id}">MOD</button><button data-action="delete-interview" data-id="${item.id}">SUP</button></div></article>`).join('') : emptyState('Aucun entretien saisi', 'Interviewez au minimum la direction, la réception, la caisse, le stock et l’IT.', 'add-interview', 'Ajouter un entretien')}</section>`;
}

function renderSystems(audit) {
  const greenfield = projectTypeOf(audit) === 'greenfield';
  const emptyTitle = greenfield ? 'Aucun équipement recensé' : 'Aucun outil recensé';
  const emptyBody = greenfield ? 'Ajoutez les caisses, imprimantes, tiroirs, terminaux de paiement, équipements réseau et services à connecter.' : 'Ajoutez les PMS, POS, logiciels de stock, moyens de paiement et outils comptables.';
  return `<section class="item-list">${audit.systems.length ? audit.systems.map((item) => `<article class="list-card"><span class="marker">${h((item.domain || 'IT').slice(0, 3).toUpperCase())}</span><div><h3>${h(item.name)}</h3><p>${h(item.vendor || (greenfield ? 'Marque à confirmer' : 'Éditeur à confirmer'))} · ${h(item.version || 'Modèle/version inconnu')} · ${h(item.deployment || 'Installation à confirmer')}</p>${greenfield && (item.location || item.serial || item.condition) ? `<p><strong>Emplacement :</strong> ${h(item.location || 'À confirmer')} · <strong>Identifiant :</strong> ${h(item.serial || 'Non relevé')} · <strong>État :</strong> ${hardwareConditionLabel(item.condition)}</p>` : ''}<p><strong>${greenfield ? 'Connexion / pilote' : 'Exports / API'} :</strong> ${connectionStatusLabel(audit, item.api)} · <strong>Décision :</strong> ${decisionLabel(item.decision)}</p>${item.notes ? `<p>${h(item.notes)}</p>` : ''}${item.attachments?.length ? `<div class="evidence-grid">${item.attachments.map((image) => `<img src="${image}" alt="Photo de ${h(item.name)}">`).join('')}</div>` : ''}<small>${h(item.owner || 'Responsable à identifier')}${item.users ? ` · ${h(item.users)} poste(s) / utilisateur(s)` : ''}</small></div><div class="list-actions"><button data-action="edit-system" data-id="${item.id}">MOD</button><button data-action="delete-system" data-id="${item.id}">SUP</button></div></article>`).join('') : emptyState(emptyTitle, emptyBody, 'add-system', greenfield ? 'Ajouter le premier équipement' : 'Ajouter un outil')}</section>`;
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
  const summary = reportSummary(audit, metrics);
  const roadmap = roadmapFor(audit);
  const greenfield = projectTypeOf(audit) === 'greenfield';
  return `<div class="page-container">
    <header class="page-heading no-print"><div><span class="eyebrow">Rapport automatique</span><h1>Préparer la restitution.</h1><p>Le rapport se met à jour avec les réponses, constats, outils et pièces de la mission.</p></div><div class="action-row"><button class="secondary-button" data-action="export-csv">Exporter CSV</button><button class="secondary-button" data-action="export-backup">Sauvegarde JSON</button><button class="primary-button" data-action="print-report">Imprimer / PDF</button></div></header>
    <section class="report-page">
      <article class="card report-cover"><span class="eyebrow">${h(config.reportTitle)}</span><h1>${h(audit.establishment)}</h1><p>${h(summary)}</p><div class="report-meta"><span>${h(config.label)}</span><span>${h(audit.client)}</span><span>${formatDate(audit.auditDate)}</span><span>${h(audit.location || 'Lieu à confirmer')}</span><span>Auditeur : ${h(audit.auditor)}</span><span>Couverture : ${metrics.progress}%</span></div></article>
      <article class="card report-section"><header><div><h2>Synthèse exécutive</h2><p>Lecture consolidée des domaines inclus dans la mission.</p></div><strong>${metrics.score}% de ${h(config.scoreLabel)}</strong></header><div class="report-score-grid">${metrics.domains.map((row) => `<article class="report-score"><header><strong>${row.domain.label}</strong><b>${row.score === null ? 'N/A' : `${row.score}%`}</b></header><div class="progress-track"><i style="width:${row.score || 0}%"></i></div><small>${row.answered}/${row.total} réponses · ${row.risks} point(s) à traiter</small></article>`).join('')}</div></article>
      <article class="card report-section"><header><div><h2>Priorités identifiées</h2><p>Constats terrain et contrôles essentiels non conformes.</p></div><strong>${priorities.length} point(s)</strong></header><div class="priority-list">${priorities.length ? priorities.slice(0, 15).map((item) => `<article><b>${item.priority}</b><div><h3>${h(item.title)}</h3><p>${h(item.detail)}</p></div></article>`).join('') : '<p>Aucune priorité n’a encore été identifiée.</p>'}</div></article>
      ${audit.findings.length ? `<article class="card report-section"><header><div><h2>Constats terrain détaillés</h2><p>Faits observés, impacts, recommandations et preuves collectées.</p></div><strong>${audit.findings.length} constat(s)</strong></header><div class="report-findings">${audit.findings.map((finding) => {
        const domain = activeDomains(audit).find((item) => item.id === finding.domain);
        return `<article><header><b class="report-priority ${finding.severity}">${SEVERITIES[finding.severity]?.short || 'P?'}</b><div><h3>${h(finding.title)}</h3><small>${h(domain?.label || finding.domain)} · ${finding.status === 'closed' ? 'Traité' : finding.status === 'confirmed' ? 'Confirmé' : 'Ouvert'}</small></div></header><p><strong>Observation :</strong> ${h(finding.situation)}</p>${finding.impact ? `<p><strong>Impact :</strong> ${h(finding.impact)}</p>` : ''}${finding.recommendation ? `<p><strong>Recommandation :</strong> ${h(finding.recommendation)}</p>` : ''}${finding.attachments?.length ? `<div class="evidence-grid">${finding.attachments.map((image) => `<img src="${image}" alt="Preuve du constat">`).join('')}</div>` : ''}</article>`;
      }).join('')}</div></article>` : ''}
      ${audit.interviews.length ? `<article class="card report-section"><header><div><h2>Entretiens réalisés</h2><p>Rôles rencontrés, outils utilisés et irritants exprimés.</p></div><strong>${audit.interviews.length} entretien(s)</strong></header><div class="report-interviews">${audit.interviews.map((item) => `<article><header><h3>${h(item.role)}${item.name ? ` · ${h(item.name)}` : ''}</h3><small>${item.duration || 0} min</small></header>${item.tools ? `<p><strong>Outils :</strong> ${h(item.tools)}</p>` : ''}${item.painPoints ? `<p><strong>Irritants :</strong> ${h(item.painPoints)}</p>` : ''}${item.needs ? `<p><strong>Attentes :</strong> ${h(item.needs)}</p>` : ''}</article>`).join('')}</div></article>` : ''}
      <article class="card report-section"><header><div><h2>${greenfield ? 'Inventaire du matériel et des services' : 'Cartographie des outils'}</h2><p>${greenfield ? 'Équipements disponibles, compatibilité à confirmer et acquisitions éventuelles.' : 'Applications observées et décision à instruire.'}</p></div><strong>${audit.systems.length} élément(s)</strong></header><div class="item-list">${audit.systems.length ? audit.systems.map((item) => `<article class="list-card"><span class="marker">${h(item.domain.slice(0, 3).toUpperCase())}</span><div><h3>${h(item.name)}</h3><p>${h(item.vendor || 'À confirmer')} · ${h(item.version || 'À confirmer')} · ${h(item.deployment || 'À confirmer')}</p>${greenfield ? `<p>${h(item.location || 'Emplacement à confirmer')} · ${h(item.serial || 'Identifiant non relevé')} · ${hardwareConditionLabel(item.condition)}</p>` : ''}<small>${greenfield ? 'Connexion / test' : 'API'} : ${connectionStatusLabel(audit, item.api)} · ${decisionLabel(item.decision)}</small>${item.attachments?.length ? `<div class="evidence-grid">${item.attachments.map((image) => `<img src="${image}" alt="Photo de ${h(item.name)}">`).join('')}</div>` : ''}</div></article>`).join('') : '<p>Aucun élément inventorié à ce stade.</p>'}</div></article>
      <article class="card report-section"><header><div><h2>${greenfield ? 'Pièces et préparation de la configuration' : 'Pièces et capacité de migration'}</h2><p>${greenfield ? 'Disponibilité des référentiels, règles et données nécessaires à la configuration du pilote.' : 'Disponibilité des données nécessaires au chiffrage et au pilote.'}</p></div><strong>${metrics.verifiedDocs}/${audit.documents.length} vérifiées</strong></header><div class="document-list">${audit.documents.filter((item) => item.status !== 'na').map((item) => `<article class="document-row"><div><strong>${h(item.label)}</strong><small>${h(item.domain)}</small></div><strong>${documentStatusLabel(item.status)}</strong><span>${h(item.note || '')}</span></article>`).join('')}</div></article>
      <article class="card report-section"><header><div><h2>Trajectoire recommandée</h2><p>À confirmer après réception des données, tests matériels et arbitrage des priorités.</p></div></header><div class="roadmap">${roadmap.map((item, index) => `<article><small>Étape ${index + 1}</small><h3>${item[0]}</h3><p>${item[1]}</p></article>`).join('')}</div></article>
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
  const audit = activeAudit();
  const greenfield = projectTypeOf(audit) === 'greenfield';
  const defaultDomain = activeDomains(audit).find((domain) => domain.modules.length)?.id || 'it';
  const item = existing || { id: '', name: '', domain: defaultDomain, vendor: '', version: '', deployment: '', users: '', api: 'unknown', decision: 'assess', owner: '', location: '', serial: '', condition: 'unknown', notes: '', attachments: [] };
  openModal({
    title: existing ? (greenfield ? 'Modifier l’équipement' : 'Modifier l’outil') : (greenfield ? 'Ajouter un équipement ou service' : 'Ajouter un outil'),
    subtitle: greenfield ? 'Recensez les caisses, imprimantes, tiroirs, terminaux, équipements réseau et services à connecter.' : 'Recensez aussi les fichiers Excel et les outils informels.',
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
      <div class="field span-2"><span>Périmètre</span><div class="module-checks">${MODULES.map((module) => `<label><input type="checkbox" name="modules" value="${module.id}" ${audit.modules.includes(module.id) ? 'checked' : ''}><span>${module.label}</span></label>`).join('')}</div></div>
    </div></form>`,
    actions: `<button class="danger-button" data-action="delete-audit">Supprimer</button><button class="secondary-button" data-action="close-modal">Annuler</button><button class="primary-button" type="submit" form="mission-settings-form">Enregistrer</button>`,
  });
}

function openMissions() {
  openModal({
    title: 'Missions d’audit',
    subtitle: 'Ouvrez une mission existante ou préparez un nouvel établissement.',
    content: `<section class="item-list">${workspace.audits.map((audit) => `<article class="list-card"><span class="marker">${auditMetrics(audit).progress}%</span><div><h3>${h(audit.establishment)}</h3><p>${h(projectConfig(audit).label)} · ${h(audit.client)} · ${formatDate(audit.auditDate)}</p><small>Dernière sauvegarde ${formatDateTime(audit.updatedAt)}</small></div><div class="list-actions"><button data-action="switch-audit" data-id="${audit.id}">OUV</button></div></article>`).join('')}</section>`,
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
  const rows = [['Domaine', 'Question', 'Statut', 'Note', 'Essentiel']];
  activeDomains(audit).forEach((domain) => domain.questions.forEach((question) => {
    const answer = audit.answers[question.id] || {};
    rows.push([domain.label, question.label, statusMeta(audit, answer.status)?.label || 'Non renseigné', answer.note || '', question.required ? 'Oui' : 'Non']);
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
    audit.modules = data.getAll('modules');
    audit.documents = documentTemplatesFor(projectTypeOf(audit), audit.modules).map((template) => {
      const existing = audit.documents.find((item) => item.id === template.id);
      return existing ? { ...template, status: existing.status, note: existing.note } : { ...template, status: 'requested', note: '' };
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
    const domain = activeDomains(audit).find((item) => item.id === target.dataset.domain);
    const question = domain?.questions.find((item) => item.id === target.dataset.question);
    const answer = audit.answers[target.dataset.question];
    if (domain && question) openFindingModal(null, { domain: domain.id, title: question.label, situation: answer?.note || question.help });
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
  if (action === 'delete-system') removeById('systems', target.dataset.id, projectTypeOf(audit) === 'greenfield' ? 'cet équipement' : 'cet outil');
  if (action === 'open-settings') openMissionSettings();
  if (action === 'open-missions') openMissions();
  if (action === 'switch-audit') { workspace.activeAuditId = target.dataset.id; workspace.ui.view = 'overview'; closeModal(); persist(); render(); }
  if (action === 'new-audit') { workspace.activeAuditId = null; closeModal(); persist(false); render(); }
  if (action === 'open-preparation') openPreparation();
  if (action === 'lock-audit') { writeAccessSession(false); closeModal(); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
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
  if (event.target.matches('[name="accessCode"]')) {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
    return;
  }
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
