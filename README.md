# Sartal Stock ERP

ERP metier pour complexe hotelier integrant restauration, bars, night-club et casino.

Le projet part d'un socle POS multi-points de vente connecte au stock multi-depots et au PMS hotel. L'objectif est de conserver un catalogue produit unique tout en permettant a chaque point de vente d'avoir ses propres prix, depots, caisses, taxes, imprimantes, equipes et modes de paiement.

## Vision Produit

Un meme etablissement peut exploiter plusieurs POS:

- Restaurant La Terrasse
- Bar des Machines a Sous
- Night Club
- Bars piscine, room service, lounge ou autres espaces

Un meme produit peut etre vendu dans plusieurs POS avec un prix different, tout en etant deduit automatiquement du depot associe au point de vente.

Exemple:

- Coca-Cola 33 cl vendu 1 500 FCFA au Restaurant La Terrasse
- Coca-Cola 33 cl vendu 2 000 FCFA au Bar des Machines a Sous
- Coca-Cola 33 cl vendu 2 500 FCFA au Night Club

Le produit reste unique dans le referentiel, mais chaque vente utilise le tarif du POS et diminue le stock du depot configure pour ce POS.

## Socle Fonctionnel

### POS Multi-Points De Vente

- Parametrage par POS: prix, TVA, imprimantes, caisses, terminaux, modes de paiement, equipes et depot de sortie.
- Catalogue produit centralise avec disponibilite et tarification par POS.
- Paiements multiples: espece, carte, chambre, compte client ou autres moyens.
- Annulations, remises, offerts et consommations du personnel selon des regles metier.
- Rapports X/Z, clotures de caisse et tracabilite des sessions.

### Stock Multi-Depots

- Gestion des depots par zone: restaurant, bar, casino, night-club, central, froid, etc.
- Sortie automatique du stock selon le depot lie au POS.
- Suivi des lots, dates de peremption et cout moyen.
- Achats, receptions fournisseurs, transferts inter-depots, pertes et inventaires.
- Reapprovisionnement base sur les seuils d'alerte.

### Connexion PMS Hotel

- Imputation d'une consommation restaurant/bar sur le folio d'une chambre.
- Conservation de la tracabilite entre vente POS, paiement chambre, mouvement de stock et export PMS.
- Suivi des consommations non exportees, exportees ou a rapprocher.

## Modules ERP Cibles

- Gestion des achats et fournisseurs
- Préparation, recettes et fiches techniques
- Inventaires et transferts entre depots
- CRM et comptes clients
- Fidelite et avantages client
- Rapports X/Z et gestion des caisses
- KDS, ou Kitchen Display System
- Permissions fines par role, depot, POS et operation
- Moteur de regles metier: remises, annulations, consommation personnel, offerts, validation manager

## Etat Actuel Du Prototype

Le prototype React/Vite contient deja:

- tableau de bord stock
- catalogue produits et recettes
- depots et points de vente
- suivi des stocks par depot
- achats fournisseurs et receptions
- transferts, inventaires et pertes
- mouvements de stock
- seuils de reapprovisionnement
- simulation de ventes POS
- export PMS des imputations chambre
- roles utilisateurs et restrictions de navigation

## Prochaines Priorites

1. Transformer le simulateur POS en veritable ecran de caisse utilisable.
2. Formaliser les sessions de caisse avec ouverture, mouvements, cloture X/Z.
3. Renforcer le modele POS: taxes, imprimantes, terminaux, moyens de paiement et equipes.
4. Etendre la liaison PMS: recherche chambre, folio, statut d'export et rapprochement.
5. Ajouter un moteur de permissions operationnelles, pas seulement une restriction de menus.
6. Structurer les donnees pour preparer une future API/backend.

## Lancement Local

```bash
npm install
npm run dev
```

Verification:

```bash
npm run lint
npm run build
```
