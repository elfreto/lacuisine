# La cuisine de Anne-Cécile

Application web de recettes, de planification de repas et de liste de courses consolidée.
React 18 · TypeScript · Tailwind CSS · Lucide React · SheetJS (xlsx). Tout fonctionne dans le navigateur,
sans serveur : les données sont enregistrées dans le `localStorage` de l'appareil.

## Démarrer

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # version de production dans dist/
npm run build:single # un seul fichier HTML autonome dans dist-single/
```

## Fonctionnalités

- **Recettes** : saisie manuelle (nom, portions de base, temps, instructions, ingrédients avec quantité,
  unité et catégorie obligatoire), modification, suppression, recherche par nom ou ingrédient.
- **Import Excel** : glisser-déposer d'un `.xlsx`, aperçu avant import, gestion des doublons, avertissements
  (catégorie inconnue, portions absentes, quantité illisible). Un modèle est téléchargeable depuis la fenêtre d'import.
- **Planning** : menu par jour de la semaine, nombre de personnes par repas, ratio
  `personnes ÷ portions de base` affiché et appliqué à chaque ingrédient.
- **Liste de courses** : agrégation des ingrédients identiques (pluriel et accents ignorés), conversion des unités
  compatibles (g/kg, ml/cl/l, c. à soupe/c. à café), classement par rayon, cases à cocher persistantes, suppression d'un article (ou de tous les articles achetés) avec possibilité de les rétablir, détection
  d'un menu modifié, export presse-papiers / .txt / Excel et impression.

- **Réserve de survie** : uniquement les 36 articles de la liste de l'OFAE (Approvisionnement économique du pays), en deux parties : « Biens de consommation courante » (avec sous-groupes) et « Objets usuels ». On ne peut ni ajouter ni supprimer d'article ; tout autre article enregistré est retiré au chargement, les saisies des articles OFAE sont conservées. Pour chaque article :
  désignation, unité, quantité prévue, quantité en stock, quantité à acheter (prévu − stock par défaut,
  modifiable article par article) et seuil d'alerte. Les articles dont le stock passe sous le seuil sont signalés
  (bandeau, badge rouge sur l'onglet). Sélection individuelle ou par partie, puis « Ajouter à la liste de courses »
  (les articles restent dans la liste quand on la régénère depuis le planning) ou « Marquer acheté » (stock mis à jour).

- **Notes** : chaque recette se note de 1 à 5 étoiles (sur la carte ou la fiche) ; tri « Mieux notées » ; colonne `Note` reconnue à l'import Excel.
- **Souhaits** : chacun propose ce qu'il aimerait qu'on achète (quantité, rayon, prénom, précision). « Valider la liste » envoie les souhaits en attente dans la liste de courses ; ils restent visibles dans « Déjà validés ».

## Liste de souhaits partagée

Les souhaits sont partagés entre tous les appareils quand `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY` sont définis
(voir `.env.example`, table `lacuisine_souhaits`, schéma dans `supabase/souhaits.sql`). Sans ces variables, ils restent sur l'appareil.

## Mise en ligne

- **Vercel** : importer le dépôt sur vercel.com (le fichier `vercel.json` règle le build). Ajouter les deux variables `VITE_SUPABASE_*` dans Settings → Environment Variables.
- **GitHub Pages** : le workflow `.github/workflows/pages.yml` publie `https://elfreto.github.io/lacuisine/` à chaque push sur `main`. Une seule fois : Settings → Pages → Source « GitHub Actions ».

## Format du fichier Excel

Une ligne par ingrédient ; les lignes au même « Nom de la recette » sont regroupées (une cellule vide reprend la recette précédente).

| Nom de la recette | Ingrédient | Quantité | Unité | Catégorie | Portions de base |
|---|---|---|---|---|---|
| Poulet basquaise | Poivrons | 3 | pièce(s) | Légumes | 4 |
| Poulet basquaise | Riz basmati | 300 | g | Féculents | 4 |

Colonnes facultatives : `Temps de préparation (min)`, `Instructions`.
Catégories : Légumes, Féculents, Viandes, Poissons & Fruits de mer, Produits laitiers, Épicerie & Condiments, Fruits, Boissons, Autres
(les variantes courantes comme « viande », « crèmerie » ou « épices » sont reconnues).

## Organisation du code

```
src/
  types.ts                  modèles (Recipe, Ingredient, PlannedMeal, ShoppingList…) et catégories
  lib/units.ts              reconnaissance et conversion des unités, mise en forme des quantités
  lib/shopping.ts           ratio de portions, agrégation, regroupement par catégorie
  lib/excel.ts              lecture du classeur, modèle et export Excel (chargé à la demande)
  lib/categories.ts         icônes Lucide et reconnaissance des catégories
  lib/reserve.ts            calculs de la réserve (à acheter, alerte), envoi vers la liste, réserve type
  lib/storage.ts            hook useLocalStorage
  lib/text.ts, exportText.ts, id.ts
  data/sampleRecipes.ts     5 recettes d'exemple
  components/               Header, RecipeList, RecipeForm, RecipeDetail, ExcelImport,
                            MealPlanner, ShoppingListView, ReserveView, ui (Modal, Stepper, EmptyState…)
```
