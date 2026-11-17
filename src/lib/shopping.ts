import { CATEGORIES, type Category, type PlannedMeal, type Recipe, type ShoppingItem, type ShoppingList } from '../types';
import { capitalize, ingredientKey } from './text';
import { toAmount } from './units';

/** Ratio appliqué à une recette : personnes souhaitées / portions de base. */
export const scaleRatio = (people: number, servings: number): number =>
  servings > 0 && people > 0 ? people / servings : 1;

/** Empreinte du planning : sert à signaler qu'une liste générée n'est plus à jour. */
export const planSignature = (meals: PlannedMeal[], recipes: Recipe[]): string => {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  return meals
    .map((m) => `${m.recipeId}:${m.people}:${byId.get(m.recipeId)?.updatedAt ?? 'x'}`)
    .sort()
    .join('|');
};

/**
 * Additionne les ingrédients de tous les repas planifiés.
 * - même ingrédient (au pluriel/accent près) = une seule ligne ;
 * - unités compatibles converties et additionnées (g + kg, cl + l, c. à soupe + c. à café) ;
 * - unités incompatibles conservées côte à côte (« 2 pièces + 150 g »).
 */
export const buildShoppingItems = (meals: PlannedMeal[], recipes: Recipe[]): ShoppingItem[] => {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const items = new Map<string, ShoppingItem>();

  for (const meal of meals) {
    const recipe = byId.get(meal.recipeId);
    if (!recipe) continue;
    const ratio = scaleRatio(meal.people, recipe.servings);

    for (const ing of recipe.ingredients) {
      const name = ing.name.trim();
      if (!name) continue;
      const key = ingredientKey(name);
      let item = items.get(key);
      if (!item) {
        item = { key, name: capitalize(name), category: ing.category, amounts: [], sources: [] };
        items.set(key, item);
      }
      if (!item.sources.includes(recipe.name)) item.sources.push(recipe.name);
      if (ing.quantity > 0) {
        const amount = toAmount(ing.quantity * ratio, ing.unit);
        const same = item.amounts.find((a) => a.family === amount.family);
        if (same) same.base += amount.base;
        else item.amounts.push(amount);
      }
    }
  }

  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
};

export const generateShoppingList = (meals: PlannedMeal[], recipes: Recipe[]): ShoppingList => ({
  generatedAt: Date.now(),
  signature: planSignature(meals, recipes),
  mealCount: meals.length,
  items: buildShoppingItems(meals, recipes),
});

export const groupByCategory = (items: ShoppingItem[]): Array<[Category, ShoppingItem[]]> =>
  CATEGORIES.map((c) => [c, items.filter((i) => i.category === c)] as [Category, ShoppingItem[]]).filter(
    ([, list]) => list.length > 0,
  );
