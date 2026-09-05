# VOYAGE — conseiller de voyage intelligent

MVP d'une agence de voyage en ligne capable de répondre à une seule question :

> « Où puis-je partir aux dates choisies, avec la meilleure météo possible,
> dans mon budget et au meilleur rapport qualité/prix ? »

L'application filtre 35 destinations européennes selon le budget, la météo
attendue, la durée de trajet, la composition du foyer et les envies, puis les
classe avec un score sur 100 et explique chaque recommandation en français.

## Démarrage

```bash
npm install
npm run dev
```

L'application est disponible sur <http://localhost:3000>. **Aucune clé d'API
n'est requise** : tous les providers basculent automatiquement en mode simulé
et la carte utilise les tuiles OpenStreetMap.

| Commande            | Rôle                                                        |
| ------------------- | ----------------------------------------------------------- |
| `npm run dev`       | Serveur de développement                                    |
| `npm run build`     | Build de production                                         |
| `npm run start`     | Serveur de production                                       |
| `npm run lint`      | ESLint 9 (flat config)                                      |
| `npm run typecheck` | `tsc --noEmit`                                              |
| `npm run smoke`     | 41 contrôles du moteur, des providers et du parser, sans navigateur |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5.9 · Tailwind CSS v4 ·
composants shadcn/ui · Lucide Icons · MapLibre GL (compatible Mapbox) ·
Supabase (optionnel).

---

## 1. Arborescence

```
app/
├── api/
│   ├── parse/route.ts          POST — langage naturel → SearchCriteria
│   ├── recommend/route.ts      GET  — moteur de recommandation en JSON
│   └── weather/route.ts        GET  — provider météo actif
├── compare/                    Comparateur (4 destinations maximum)
│   ├── CompareClient.tsx
│   └── page.tsx
├── destination/[slug]/page.tsx Fiche destination complète
├── favorites/                  Favoris (localStorage)
│   ├── FavoritesClient.tsx
│   └── page.tsx
├── search/
│   ├── loading.tsx             Skeletons de chargement
│   └── page.tsx                Résultats de recherche
├── error.tsx                   Frontière d'erreur
├── globals.css                 Design tokens et animations
├── layout.tsx
├── not-found.tsx
└── page.tsx                    Homepage

components/
├── ui/                         Primitives shadcn/ui (15 composants)
├── BudgetBreakdown.tsx         Répartition transport/hébergement/sur place
├── CompareToggle.tsx           Ajout au comparateur
├── ComparisonTable.tsx         Tableau comparatif
├── DestinationCard.tsx         Carte de résultat (+ skeleton)
├── DestinationMap.tsx          Carte MapLibre + filtres de proximité
├── FavoriteButton.tsx          Cœur favori
├── FiltersPanel.tsx            Filtres desktop et feuille modale mobile
├── HotelComparison.tsx         Comparateur de prix multi-agences
├── NaturalLanguageSearch.tsx   « Décrivez votre voyage idéal »
├── Photo.tsx                   Image avec dégradé de repli
├── RentalGrid.tsx              Locations de vacances
├── SearchBar.tsx               Moteur de recherche (hero et compact)
├── SearchFilters.tsx           Recherche avancée
├── SiteFooter.tsx
├── SiteHeader.tsx
├── SortSelect.tsx              Tri des résultats
├── TransportOptions.tsx        Vols, trains, voiture
├── TravelScore.tsx             Score /100 et détail pondéré
├── WeatherCard.tsx             Prévision ou tendance climatique
└── WeatherIcon.tsx

data/
├── destinations.ts             35 destinations, normales climatiques, POI
└── origins.ts                  20 villes de départ

hooks/
├── useCompare.ts
├── useFavorites.ts
├── useLastSearch.ts            Mémorise la dernière recherche
└── useLocalStorage.ts

lib/
├── providers/
│   ├── destinationProvider.ts  Catalogue de destinations
│   ├── flightProvider.ts       Transport (vol, train, voiture)
│   ├── hotelProvider.ts        Hôtels et comparateur d'agences
│   ├── rentalProvider.ts       Locations
│   ├── weatherProvider.ts      Mock + OpenWeatherMap + WeatherAPI
│   ├── types.ts                Interfaces communes
│   └── index.ts
├── climate.ts                  Normales mensuelles → météo d'une période
├── geo.ts                      Haversine et estimation de trajet
├── mapStyle.ts                 Fond de carte OSM ou Mapbox
├── nlpParser.ts                Parser de langage naturel
├── recommendationEngine.ts     calculateDestinationScore, recommendDestinations
├── searchCriteria.ts           Sérialisation des critères dans l'URL
├── supabase.ts                 Client optionnel
└── utils.ts                    cn, formatage, aléatoire déterministe

scripts/smoke.mts               Vérification de bout en bout
types/index.ts                  Contrats partagés
```

### Principes d'architecture

- **Aucune logique métier dans l'UI.** Les composants consomment
  `DestinationRecommendation`, `HotelOffer`, `WeatherReport`… ; le calcul vit
  dans `lib/`.
- **L'URL est la source de vérité.** `criteriaFromSearchParams()` et
  `criteriaToSearchParams()` rendent chaque recherche partageable et
  rechargeable. La page `/search` est rendue côté serveur.
- **La dernière recherche est mémorisée.** Les pages Favoris et Comparateur
  recalculent les scores avec les critères réellement utilisés
  (`hooks/useLastSearch.ts`), pas avec les valeurs par défaut.
- **Les providers sont interchangeables.** Passer du mock à une vraie API ne
  change qu'une fonction `getXProvider()`, jamais un composant.

---

## 2. APIs à connecter ensuite

| Domaine       | Service recommandé                              | Point d'accroche                                        | État                                  |
| ------------- | ----------------------------------------------- | ------------------------------------------------------- | ------------------------------------- |
| Météo         | OpenWeatherMap, WeatherAPI                      | `lib/providers/weatherProvider.ts` — `getWeatherProvider()` | **Déjà implémenté**, s'active avec une clé |
| Météo long terme | Meteomatics (climatologie)                   | même fichier, nouveau provider                          | À écrire                              |
| Vols          | Amadeus *Flight Offers Search*, Duffel, Kiwi    | `lib/providers/flightProvider.ts` — `getFlightProvider()` | Simulé                                |
| Hôtels        | Amadeus *Hotel Search*, Booking Demand API, RapidAPI Hotels | `lib/providers/hotelProvider.ts` — `getHotelProvider()` | Simulé                                |
| Locations     | Vrdo/Airbnb via RapidAPI, Holidu                | `lib/providers/rentalProvider.ts` — `getRentalProvider()` | Simulé                                |
| Cartographie  | Mapbox (raster ou vector)                       | `lib/mapStyle.ts` — `getMapStyle()`                     | **Déjà implémenté**, OSM par défaut   |
| Photos        | Unsplash API, Pexels, ou CDN propriétaire       | champ `image` dans `data/destinations.ts` + `next.config.ts` | Images de démonstration (picsum)      |
| Langage naturel | API Claude (Anthropic)                        | `app/api/parse/route.ts` — `parseWithLlm()`             | Parser à règles                       |
| Comptes / favoris | Supabase (auth + table `favorites`)         | `lib/supabase.ts`, `hooks/useFavorites.ts`              | localStorage                          |

Chaque provider suit la même interface (`lib/providers/types.ts`) et renvoie le
contrat commun `TravelOffer`. Le branchement d'une vraie API consiste à :

1. écrire `createXProvider(config)` dans le fichier du domaine ;
2. le retourner depuis `getXProvider()` quand la clé est présente ;
3. conserver le repli sur le mock en cas d'erreur, comme le fait déjà
   `createOpenWeatherMapProvider()`.

### Schéma Supabase suggéré

```sql
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  item_id text not null,
  item_type text not null check (item_type in ('destination', 'hotel')),
  label text not null,
  destination text,
  created_at timestamptz default now(),
  unique (user_id, item_id)
);
alter table favorites enable row level security;
create policy "favoris personnels" on favorites
  for all using (auth.uid() = user_id);
```

---

## 3. Variables d'environnement

Copier `.env.example` vers `.env.local`. **Toutes sont facultatives** : sans
elles, l'application tourne en mode simulé.

| Variable                        | Rôle                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| `WEATHER_PROVIDER`              | `mock` (défaut), `openweathermap`, `weatherapi` ou `auto`    |
| `OPENWEATHERMAP_API_KEY`        | Prévision réelle à 5 jours                                   |
| `WEATHERAPI_API_KEY`            | Prévision réelle à 14 jours                                  |
| `METEOMATICS_USERNAME` / `_PASSWORD` | Climatologie long terme (provider à écrire)            |
| `NEXT_PUBLIC_MAPBOX_TOKEN`      | Bascule la carte de OpenStreetMap vers Mapbox                |
| `NEXT_PUBLIC_MAP_PROVIDER`      | `osm` (défaut) ou `mapbox`                                   |
| `HOTEL_PROVIDER` / `FLIGHT_PROVIDER` / `RENTAL_PROVIDER` | `mock` (défaut)                      |
| `AMADEUS_CLIENT_ID` / `_SECRET` | Vols et hôtels Amadeus                                       |
| `BOOKING_API_KEY`, `RAPIDAPI_KEY` | Agrégateurs d'hébergement                                  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Projet Supabase                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Clé serveur (jamais exposée au navigateur)                   |
| `NLP_PROVIDER`                  | `rule-based` (défaut) ou `llm`                               |
| `ANTHROPIC_API_KEY`             | Recherche en langage naturel par LLM                         |

---

## 4. Fonctions encore simulées

Tout ce qui suit est **réellement implémenté et déterministe**, mais s'appuie
sur des données générées plutôt que sur une API tierce.

| Élément                                   | Fichier                             | Ce qui est simulé                                                                |
| ----------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| `mockWeatherProvider`                     | `lib/providers/weatherProvider.ts`  | Météo dérivée des normales mensuelles réelles, avec variabilité journalière       |
| `mockHotelProvider` / `generateHotels()`  | `lib/providers/hotelProvider.ts`    | 10 établissements par destination : prix, notes, équipements, tarifs par agence   |
| `buildRates()`                            | `lib/providers/hotelProvider.ts`    | Écarts de prix entre Booking, Expedia, Agoda et tarif direct                      |
| `mockRentalProvider`                      | `lib/providers/rentalProvider.ts`   | 8 locations, surface et capacité                                                  |
| `mockFlightProvider` / `estimateTransportCost()` | `lib/providers/flightProvider.ts` | Compagnies, horaires et prix ; le prix dérive du prix moyen et de la saison |
| `estimateTravel()`                        | `lib/geo.ts`                        | Durées calculées depuis la distance orthodromique, pas depuis un horaire réel     |
| `buildPoi()`                              | `data/destinations.ts`              | Positions des hôtels, plages et restaurants (déterministes, à l'échelle réelle)   |
| `parseWithLlm()`                          | `app/api/parse/route.ts`            | Retombe sur le parser à règles tant qu'aucune clé LLM n'est branchée              |
| Images                                    | `data/destinations.ts`              | Photographies de démonstration (picsum.photos), non liées aux lieux               |
| Notes et volumes d'avis                   | `data/destinations.ts`              | Valeurs plausibles saisies à la main                                              |

En revanche, **ne sont pas simulés** : les coordonnées géographiques, les
normales climatiques mensuelles (températures, précipitations, ensoleillement,
température de la mer), les codes d'aéroport, les distances, le moteur de
score, le calcul de budget et le parser de langage naturel.

### Garde-fou météo

Le produit ne présente jamais une prévision inventée. `WeatherReport.kind`
vaut `forecast` pour un départ à 14 jours ou moins, et `climate` au-delà ; la
`WeatherCard` affiche alors explicitement « Tendance climatique historique »
avec une note d'explication.

---

## 5. Prochaines étapes recommandées

1. **Brancher une vraie météo** (le plus rentable) : `OPENWEATHERMAP_API_KEY`
   suffit, le code est déjà écrit et testé.
2. **Connecter Amadeus** pour les vols puis les hôtels — c'est ce qui
   transforme le budget estimé en budget réservable. Prévoir un cache
   (Redis ou `unstable_cache`) : ces APIs sont lentes et facturées à l'appel.
3. **Remplacer les photos de démonstration** par l'API Unsplash ou une
   banque d'images sous licence, et servir des `blurDataURL`.
4. **Ajouter les comptes Supabase** pour synchroniser favoris et comparateur
   entre appareils, et enregistrer l'historique de recherche.
5. **Activer le parsing LLM** (`NLP_PROVIDER=llm`) pour absorber les
   formulations que les règles ne couvrent pas, avec validation du schéma
   et repli sur le parser actuel.
6. **Alertes de prix et de météo** : une recherche enregistrée, un cron, un
   e-mail quand le score d'une destination franchit un seuil.
7. **Élargir le catalogue** au-delà de l'Europe (Maghreb, Canaries déjà
   présentes, moyen-courrier) et enrichir les scores par saison.
8. **Tests** : `npm run smoke` couvre le moteur ; ajouter Vitest sur
   `lib/` et Playwright sur les parcours clés (recherche, favoris,
   comparateur).
9. **Observabilité** : brancher un service d'erreurs dans `app/error.tsx` et
   mesurer les Web Vitals.
10. **Accessibilité et i18n** : audit clavier/lecteur d'écran complet, puis
    extraction des chaînes (l'interface est aujourd'hui en français uniquement).

---

## Le moteur en bref

`calculateDestinationScore()` (`lib/recommendationEngine.ts`) renvoie un score
sur 100 pondéré ainsi :

| Critère     | Poids | Ce qui est mesuré                                                     |
| ----------- | ----- | --------------------------------------------------------------------- |
| Météo       | 25    | Écart à la température souhaitée, ensoleillement, précipitations       |
| Prix        | 25    | Part du budget consommée et rapport qualité/prix local                 |
| Transport   | 15    | Durée porte-à-porte, escales, bonus train                              |
| Hébergement | 15    | Qualité du parc, adéquation famille et équipements demandés            |
| Activités   | 10    | Correspondance avec les types de séjour sélectionnés                   |
| Avis        | 10    | Note voyageurs pondérée par le volume d'avis                           |

`recommendDestinations()` élimine d'abord les destinations incompatibles
(budget, température minimale, durée de trajet, mode de transport, type de
séjour, équipements), puis classe les survivantes.

`searchDestinations()` est la variante utilisée par l'interface : si aucune
destination ne satisfait tous les critères, elle les assouplit un par un — du
plus secondaire au plus structurant — et l'indique à l'utilisateur.

### Exemple de référence

Départ Luxembourg · 2 adultes + 1 enfant de 9 ans · 4 nuits · 2 000 € ·
soleil, piscine, plage · > 23 °C · trajet < 4 h

```
1. Majorque      85/100 · 24 °C · 2 h 14 · 1 851 €
2. Valence       85/100 · 25 °C · 2 h 22 · 1 628 €
3. Split         83/100 · 24 °C · 2 h 04 · 1 850 €
4. Andalousie    82/100 · 26 °C · 2 h 58 · 1 680 €
5. Sicile        82/100 · 26 °C · 2 h 35 · 1 718 €
6. Sardaigne     82/100 · 24 °C · 2 h 16 · 1 966 €
…  Algarve, Malte et Crète suivent — 25 destinations écartées.
```

Reproductible sans navigateur :

```bash
npm run smoke
curl "http://localhost:3000/api/recommend?origin=luxembourg&start=2027-07-11&end=2027-07-15&adults=2&children=1&ages=9&budget=2000&maxTravel=4&minTemp=23&weather=sunny&amenities=pool,beach&types=beach,family"
```

## Avertissement

Les prix, disponibilités, notes et photographies sont **simulés** à des fins de
démonstration. Les tendances climatiques s'appuient sur des normales mensuelles
réelles mais ne constituent pas des prévisions.
