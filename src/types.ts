export const CATEGORIES = [
  'Légumes',
  'Féculents',
  'Viandes',
  'Poissons & Fruits de mer',
  'Produits laitiers',
  'Épicerie & Condiments',
  'Fruits',
  'Boissons',
  'Autres',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Ingredient {
  id: string;
  name: string;
  /** Quantité pour le nombre de portions de base de la recette. 0 = « selon goût ». */
  quantity: number;
  unit: string;
  category: Category;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  /** Temps de préparation en minutes. */
  prepTime?: number;
  instructions: string;
  ingredients: Ingredient[];
  createdAt: number;
  updatedAt: number;
}

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;
export const NO_DAY = 'Sans jour';
export type PlanDay = (typeof DAYS)[number] | typeof NO_DAY;

export interface PlannedMeal {
  id: string;
  recipeId: string;
  people: number;
  day: PlanDay;
}

export interface ShoppingAmount {
  /** Famille d'unité (masse, volume, pièce, cuillère, ou unité libre). */
  family: string;
  /** Quantité exprimée dans l'unité de base de la famille. */
  base: number;
  /** Libellé d'unité à utiliser pour une unité libre. */
  label: string;
}

export interface ShoppingItem {
  key: string;
  name: string;
  category: Category;
  amounts: ShoppingAmount[];
  sources: string[];
}

export interface ShoppingList {
  generatedAt: number;
  signature: string;
  mealCount: number;
  items: ShoppingItem[];
  /** Articles retirés à la main : ils ne reviennent pas quand la liste est régénérée. */
  removed?: ShoppingItem[];
}

export type Tab = 'recettes' | 'planning' | 'courses' | 'reserve';

/** Les deux constituantes de la réserve de survie. */
export const RESERVE_SECTIONS = [
  { id: 'vivres', label: 'Biens de consommation courante', hint: 'Boissons, aliments, hygiène, médical : à renouveler' },
  { id: 'materiel', label: 'Objets usuels', hint: 'Lampe, réchaud, radio, piles… : à avoir une fois' },
] as const;
export type ReserveSection = (typeof RESERVE_SECTIONS)[number]['id'];

export interface ReserveItem {
  id: string;
  /** Désignation. */
  name: string;
  /** Précision : format, exemples, alternative. */
  note?: string;
  /** Sous-groupe affiché dans la partie (ex. « Articles d'hygiène »). */
  group?: string;
  section: ReserveSection;
  unit: string;
  /** Quantité prévue (objectif de la réserve). */
  planned: number;
  /** Quantité actuellement en stock. */
  stock: number;
  /** Seuil d'alerte : alerte quand le stock passe en dessous. 0 = pas d'alerte. */
  threshold: number;
  /** Quantité à acheter choisie à la main ; absente = prévue − stock. */
  toBuy?: number;
  /** Rayon utilisé quand l'article part dans la liste de courses. */
  category: Category;
}

/** En-têtes du fichier Excel d'import. */
export const EXPECTED_COLUMNS = ['Nom de la recette', 'Ingrédient', 'Quantité', 'Unité', 'Catégorie', 'Portions de base'];
