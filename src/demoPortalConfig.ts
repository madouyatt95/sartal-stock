import type { EmployeeRole, UserRole } from './types';

export type DemoModule = 'stock' | 'restaurant' | 'delivery' | 'pms';

export type DemoTarget =
  | { type: 'backoffice'; view: string; role: UserRole }
  | { type: 'employee'; role: EmployeeRole }
  | { type: 'client'; mode: 'restaurant' | 'delivery'; initialHub?: boolean }
  | { type: 'hotel-client' };

export interface DemoPerspective {
  id: string;
  label: string;
  description: string;
  target: DemoTarget;
}

export interface DemoUniverse {
  id: string;
  eyebrow: string;
  label: string;
  description: string;
  modules: DemoModule[];
  features: string[];
  accent: string;
  recommended?: boolean;
  perspectives: DemoPerspective[];
}

export const DEMO_UNIVERSES: DemoUniverse[] = [
  {
    id: 'stock',
    eyebrow: 'SOCLE OPERATIONNEL',
    label: 'Sártal Stock',
    description: 'Piloter les produits, les dépôts, les achats, les inventaires et la valeur réelle du stock.',
    modules: ['stock'],
    features: ['Stock multi-dépôts', 'Achats & fournisseurs', 'Inventaires', 'Rapports'],
    accent: '#14745f',
    perspectives: [
      { id: 'direction', label: 'Direction', description: 'Indicateurs, alertes, valorisation et priorités de gestion.', target: { type: 'backoffice', view: 'pulse', role: 'director' } },
      { id: 'responsable-stock', label: 'Responsable stock', description: 'Stock disponible, seuils, dépôts et actions de correction.', target: { type: 'backoffice', view: 'stock-control', role: 'stock_manager' } },
      { id: 'magasinier', label: 'Magasinier', description: 'Réceptions, transferts, inventaires et scan depuis le dépôt.', target: { type: 'employee', role: 'storekeeper' } },
      { id: 'responsable-achats', label: 'Responsable achats', description: 'Commandes fournisseurs, coûts et réapprovisionnement.', target: { type: 'backoffice', view: 'purchases', role: 'stock_manager' } },
      { id: 'auditeur', label: 'Auditeur', description: 'Écarts valorisés, mouvements et traçabilité des opérations.', target: { type: 'backoffice', view: 'stock-audit', role: 'auditor' } }
    ]
  },
  {
    id: 'restaurant-stock',
    eyebrow: 'RESTAURATION',
    label: 'Restaurant + Stock',
    description: 'Relier les tables, les commandes, la caisse, la cuisine, les recettes et le stock réellement consommé.',
    modules: ['stock', 'restaurant'],
    features: ['Tables & caisse', 'Cuisine KDS', 'Recettes', 'Prix par POS'],
    accent: '#b65332',
    perspectives: [
      { id: 'direction', label: 'Direction', description: 'Ventes, expérience client, marge et alertes opérationnelles.', target: { type: 'backoffice', view: 'pulse', role: 'director' } },
      { id: 'manager-restaurant', label: 'Manager restaurant', description: 'Points de vente, prix, dépôts et fonctionnement du restaurant.', target: { type: 'backoffice', view: 'answer', role: 'pos_manager' } },
      { id: 'serveur', label: 'Serveur', description: 'Plan de salle, commandes, demandes clients et additions.', target: { type: 'employee', role: 'waiter' } },
      { id: 'caissier', label: 'Caissier', description: 'Ouverture, encaissements, Wave, Orange Money et clôture.', target: { type: 'employee', role: 'cashier' } },
      { id: 'cuisine', label: 'Cuisine', description: 'Tickets KDS, urgences, allergies et ruptures en temps réel.', target: { type: 'employee', role: 'kitchen' } },
      { id: 'responsable-stock', label: 'Responsable stock', description: 'Impact des ventes et recettes sur chaque dépôt.', target: { type: 'backoffice', view: 'stock-control', role: 'stock_manager' } },
      { id: 'client-restaurant', label: 'Client restaurant', description: 'Réservation, commande, demandes et fidélité côté client.', target: { type: 'client', mode: 'restaurant' } }
    ]
  },
  {
    id: 'delivery-stock',
    eyebrow: 'VENTE EN LIGNE',
    label: 'Vente en ligne + Stock',
    description: 'Transformer le stock disponible en commandes préparées, livrées et suivies jusqu’au client.',
    modules: ['stock', 'delivery'],
    features: ['Catalogue en ligne', 'Picking', 'Livraison', 'Suivi client'],
    accent: '#23649b',
    perspectives: [
      { id: 'direction-ecommerce', label: 'Direction e-commerce', description: 'Commandes, service, disponibilité et performance de livraison.', target: { type: 'backoffice', view: 'delivery', role: 'director' } },
      { id: 'responsable-stock', label: 'Responsable stock', description: 'Réservations de stock et disponibilité par dépôt.', target: { type: 'backoffice', view: 'stock-control', role: 'stock_manager' } },
      { id: 'preparateur', label: 'Préparateur', description: 'Parcours de picking, contrôle et substitutions.', target: { type: 'employee', role: 'picker' } },
      { id: 'livreur', label: 'Livreur', description: 'Tournée, encaissement, preuve de remise et incidents.', target: { type: 'employee', role: 'driver' } },
      { id: 'service-client', label: 'Service client', description: 'Promesses, retards, insatisfaction et reprise de service.', target: { type: 'employee', role: 'customer_experience' } },
      { id: 'client-en-ligne', label: 'Client vente en ligne', description: 'Catalogue, panier, créneau, paiement et suivi de commande.', target: { type: 'client', mode: 'delivery' } }
    ]
  },
  {
    id: 'pms-stock',
    eyebrow: 'HOTELLERIE',
    label: 'PMS Hôtel + Stock',
    description: 'Gérer les réservations, les chambres, les folios, le housekeeping et les consommations hôtelières.',
    modules: ['stock', 'pms'],
    features: ['Réservations', 'Chambres', 'Folios', 'Housekeeping'],
    accent: '#545bb0',
    perspectives: [
      { id: 'direction-hotel', label: 'Direction hôtel', description: 'Occupation, revenus, opérations et qualité de service.', target: { type: 'backoffice', view: 'pms', role: 'director' } },
      { id: 'reception', label: 'Réception', description: 'Arrivées, départs, chambres, garanties et folios.', target: { type: 'employee', role: 'receptionist' } },
      { id: 'gouvernante', label: 'Gouvernante', description: 'Priorités chambres, nettoyage, contrôle et anomalies.', target: { type: 'employee', role: 'housekeeper' } },
      { id: 'magasinier', label: 'Magasinier', description: 'Produits d’accueil, minibar, linge et mouvements de stock.', target: { type: 'employee', role: 'storekeeper' } },
      { id: 'controle-nuit', label: 'Contrôle de nuit', description: 'Clôture, écarts, folios et traçabilité hôtelière.', target: { type: 'backoffice', view: 'pms', role: 'auditor' } },
      { id: 'client-hotel', label: 'Client hôtel', description: 'Séjour, chambre, services, demandes et folio personnel.', target: { type: 'hotel-client' } }
    ]
  },
  {
    id: 'pms-restaurant-stock',
    eyebrow: 'COMPLEXE HOTELIER',
    label: 'PMS + Restaurant + Stock',
    description: 'Faire vivre ensemble la chambre, le restaurant, l’imputation sur folio et les stocks de chaque point de vente.',
    modules: ['stock', 'restaurant', 'pms'],
    features: ['PMS complet', 'Restaurant', 'Imputation chambre', 'Stock commun'],
    accent: '#8c5b24',
    recommended: true,
    perspectives: [
      { id: 'direction', label: 'Direction', description: 'Vue consolidée hôtel, restaurant, clients et stock.', target: { type: 'backoffice', view: 'pulse', role: 'director' } },
      { id: 'reception', label: 'Réception', description: 'Séjours, chambres, folios et consommations imputées.', target: { type: 'employee', role: 'receptionist' } },
      { id: 'manager-restaurant', label: 'Manager restaurant', description: 'POS, tables, prix, dépôts et ventes restaurant.', target: { type: 'backoffice', view: 'answer', role: 'pos_manager' } },
      { id: 'serveur', label: 'Serveur', description: 'Commande à table et imputation directe sur une chambre.', target: { type: 'employee', role: 'waiter' } },
      { id: 'cuisine', label: 'Cuisine', description: 'Tickets, urgences, allergies et disponibilité des plats.', target: { type: 'employee', role: 'kitchen' } },
      { id: 'gouvernante', label: 'Gouvernante', description: 'État des chambres, nettoyage et contrôle qualité.', target: { type: 'employee', role: 'housekeeper' } },
      { id: 'client-hotel', label: 'Client hôtel', description: 'Séjour et folio incluant les consommations restaurant.', target: { type: 'hotel-client' } },
      { id: 'client-restaurant', label: 'Client restaurant', description: 'Expérience de réservation et de service à table.', target: { type: 'client', mode: 'restaurant' } }
    ]
  },
  {
    id: 'suite-complete',
    eyebrow: 'OFFRE INTEGRALE',
    label: 'Suite complète Sártal',
    description: 'Explorer toute la plateforme: stock, hôtel, restaurant, vente en ligne, clients et équipes.',
    modules: ['stock', 'restaurant', 'delivery', 'pms'],
    features: ['Tous les modules', 'Toutes les équipes', 'Expérience client', 'Pilotage unifié'],
    accent: '#173f3a',
    perspectives: [
      { id: 'administration', label: 'Administration', description: 'Configuration, référentiels, droits et opérations de toute la suite.', target: { type: 'backoffice', view: 'dashboard', role: 'admin' } },
      { id: 'direction-generale', label: 'Direction générale', description: 'Priorités de l’ensemble des activités dans une vue unique.', target: { type: 'backoffice', view: 'pulse', role: 'director' } },
      { id: 'manager-service', label: 'Manager de service', description: 'Équipes, validations, retards et arbitrages en temps réel.', target: { type: 'employee', role: 'service_manager' } },
      { id: 'reception', label: 'Réception', description: 'Arrivées, séjours, chambres et folios.', target: { type: 'employee', role: 'receptionist' } },
      { id: 'serveur', label: 'Serveur', description: 'Tables, commandes, service et paiements.', target: { type: 'employee', role: 'waiter' } },
      { id: 'preparateur', label: 'Préparateur', description: 'Commandes en ligne, picking et remise au livreur.', target: { type: 'employee', role: 'picker' } },
      { id: 'livreur', label: 'Livreur', description: 'Tournée, contact client et preuve de livraison.', target: { type: 'employee', role: 'driver' } },
      { id: 'experience-client', label: 'Expérience client', description: 'Demandes, promesses, avis et reprises de service.', target: { type: 'employee', role: 'customer_experience' } },
      { id: 'client-sartal', label: 'Client Mon Sártal', description: 'Portail client réunissant restaurant et vente en ligne.', target: { type: 'client', mode: 'delivery', initialHub: true } }
    ]
  }
];

export const getDemoUniverse = (id: string | null | undefined) => DEMO_UNIVERSES.find(item => item.id === id);

export const getDemoPerspective = (universe: DemoUniverse | undefined, id: string | null | undefined) => universe?.perspectives.find(item => item.id === id);
