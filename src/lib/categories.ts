import { Apple, Beef, Carrot, Fish, GlassWater, Milk, Package, ShoppingBasket, Wheat, type LucideIcon } from 'lucide-react';
import { CATEGORIES, type Category } from '../types';
import { normalize } from './text';

export const CATEGORY_META: Record<Category, { icon: LucideIcon; tone: string }> = {
  Légumes: { icon: Carrot, tone: 'bg-sage/25 text-sage-ink' },
  Féculents: { icon: Wheat, tone: 'bg-sun/25 text-sun-ink' },
  Viandes: { icon: Beef, tone: 'bg-red/15 text-red-ink' },
  'Poissons & Fruits de mer': { icon: Fish, tone: 'bg-salmon/25 text-salmon-ink' },
  'Produits laitiers': { icon: Milk, tone: 'bg-cream text-ink/70' },
  'Épicerie & Condiments': { icon: Package, tone: 'bg-orange/15 text-orange-ink' },
  Fruits: { icon: Apple, tone: 'bg-sun/20 text-orange-ink' },
  Boissons: { icon: GlassWater, tone: 'bg-sage/15 text-sage-ink' },
  Autres: { icon: ShoppingBasket, tone: 'bg-sunken text-muted' },
};

// Mots-clés pour reconnaître une catégorie écrite librement (import Excel).
const SYNONYMS: Array<[string[], Category]> = [
  [['poisson', 'fruits de mer', 'fruit de mer', 'crustace', 'coquillage'], 'Poissons & Fruits de mer'],
  [['legume', 'crudite', 'salade', 'herbe'], 'Légumes'],
  [['feculent', 'pate', 'riz', 'cereale', 'pain', 'pomme de terre', 'legumineuse'], 'Féculents'],
  [['viande', 'volaille', 'charcuterie', 'boucherie'], 'Viandes'],
  [['laitier', 'lait', 'fromage', 'cremerie', 'oeuf', 'yaourt'], 'Produits laitiers'],
  [['epicerie', 'condiment', 'epice', 'sauce', 'huile', 'conserve', 'sucre'], 'Épicerie & Condiments'],
  [['fruit'], 'Fruits'],
  [['boisson', 'vin', 'jus', 'eau'], 'Boissons'],
  [['autre', 'divers'], 'Autres'],
];

/** Retrouve une catégorie officielle à partir d'un libellé libre. `null` si inconnue. */
export const matchCategory = (raw: string): Category | null => {
  const n = normalize(raw);
  if (!n) return null;
  const exact = CATEGORIES.find((c) => normalize(c) === n);
  if (exact) return exact;
  for (const [keys, cat] of SYNONYMS) if (keys.some((k) => n.includes(k))) return cat;
  return null;
};
