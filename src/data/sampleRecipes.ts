import type { Category, Recipe } from '../types';
import { uid } from '../lib/id';

type Row = [name: string, quantity: number, unit: string, category: Category];

const make = (name: string, servings: number, prepTime: number, instructions: string, rows: Row[]): Recipe => {
  const now = Date.now();
  return {
    id: uid(),
    name,
    servings,
    prepTime,
    instructions,
    ingredients: rows.map(([n, quantity, unit, category]) => ({ id: uid(), name: n, quantity, unit, category })),
    createdAt: now,
    updatedAt: now,
  };
};

/** Recettes d'exemple, proposées quand la bibliothèque est vide. */
export const sampleRecipes = (): Recipe[] => [
  make(
    'Poulet basquaise',
    4,
    70,
    'Faire dorer les cuisses de poulet dans l’huile d’olive. Réserver.\nFaire revenir oignons, ail et poivrons émincés 10 min.\nAjouter les tomates concassées, le piment d’Espelette et remettre le poulet.\nCouvrir et laisser mijoter 45 min. Servir avec le riz.',
    [
      ['Cuisses de poulet', 4, 'pièce(s)', 'Viandes'],
      ['Poivrons', 3, 'pièce(s)', 'Légumes'],
      ['Oignons', 2, 'pièce(s)', 'Légumes'],
      ['Ail', 3, 'gousse(s)', 'Légumes'],
      ['Tomates concassées', 400, 'g', 'Épicerie & Condiments'],
      ['Huile d’olive', 2, 'c. à soupe', 'Épicerie & Condiments'],
      ['Piment d’Espelette', 1, 'c. à café', 'Épicerie & Condiments'],
      ['Riz basmati', 300, 'g', 'Féculents'],
    ],
  ),
  make(
    'Risotto aux champignons',
    2,
    35,
    'Faire suer l’oignon dans le beurre, ajouter le riz et le nacrer 2 min.\nDéglacer au vin blanc puis ajouter le bouillon louche par louche.\nIncorporer les champignons poêlés, finir avec le parmesan.',
    [
      ['Riz arborio', 160, 'g', 'Féculents'],
      ['Champignons de Paris', 250, 'g', 'Légumes'],
      ['Oignon', 1, 'pièce(s)', 'Légumes'],
      ['Bouillon de volaille', 75, 'cl', 'Épicerie & Condiments'],
      ['Vin blanc sec', 10, 'cl', 'Boissons'],
      ['Parmesan', 50, 'g', 'Produits laitiers'],
      ['Beurre', 30, 'g', 'Produits laitiers'],
    ],
  ),
  make(
    'Ratatouille',
    4,
    60,
    'Couper tous les légumes en dés.\nLes faire revenir séparément à l’huile d’olive, puis les réunir avec l’ail et le thym.\nLaisser compoter 30 min à feu doux.',
    [
      ['Courgettes', 2, 'pièce(s)', 'Légumes'],
      ['Aubergine', 1, 'pièce(s)', 'Légumes'],
      ['Poivron', 2, 'pièce(s)', 'Légumes'],
      ['Tomates', 500, 'g', 'Légumes'],
      ['Oignon', 1, 'pièce(s)', 'Légumes'],
      ['Ail', 2, 'gousse(s)', 'Légumes'],
      ['Huile d’olive', 4, 'c. à soupe', 'Épicerie & Condiments'],
      ['Thym', 0, '', 'Épicerie & Condiments'],
    ],
  ),
  make(
    'Saumon en papillote',
    2,
    25,
    'Déposer chaque pavé sur une feuille de papier cuisson avec rondelles de citron, aneth et un filet d’huile.\nFermer et enfourner 15 min à 200 °C. Servir avec les pommes de terre vapeur.',
    [
      ['Pavés de saumon', 2, 'pièce(s)', 'Poissons & Fruits de mer'],
      ['Citron', 1, 'pièce(s)', 'Fruits'],
      ['Aneth', 1, 'botte(s)', 'Légumes'],
      ['Pommes de terre', 400, 'g', 'Féculents'],
      ['Huile d’olive', 1, 'c. à café', 'Épicerie & Condiments'],
    ],
  ),
  make(
    'Crêpes de la Chandeleur',
    4,
    20,
    'Mélanger farine et sucre, creuser un puits et ajouter les œufs.\nVerser le lait petit à petit en fouettant, puis le beurre fondu.\nLaisser reposer 1 h et cuire dans une poêle chaude.',
    [
      ['Farine', 250, 'g', 'Épicerie & Condiments'],
      ['Œufs', 4, 'pièce(s)', 'Produits laitiers'],
      ['Lait', 0.5, 'l', 'Produits laitiers'],
      ['Beurre', 50, 'g', 'Produits laitiers'],
      ['Sucre', 2, 'c. à soupe', 'Épicerie & Condiments'],
    ],
  ),
];
