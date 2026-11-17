import * as XLSX from 'xlsx';
import type { Category, Ingredient, Recipe, ShoppingItem } from '../types';
import { CATEGORIES, EXPECTED_COLUMNS } from '../types';
import { matchCategory } from './categories';
import { uid } from './id';
import { normalize, parseQuantity } from './text';
import { formatAmounts } from './units';
import { groupByCategory } from './shopping';

export interface ImportResult {
  recipes: Recipe[];
  warnings: string[];
  rowCount: number;
}

type Column = 'recipe' | 'ingredient' | 'quantity' | 'unit' | 'category' | 'servings' | 'prepTime' | 'instructions' | 'rating';

const detectColumn = (header: string): Column | null => {
  const h = normalize(header);
  if (!h) return null;
  if (h === 'note' || h.includes('etoile') || h.includes('notation')) return 'rating';
  if (h.includes('ingredient') || h === 'produit' || h === 'aliment') return 'ingredient';
  if (h.includes('recette') || h === 'plat' || h === 'nom') return 'recipe';
  if (h.includes('quantit') || h === 'qte' || h === 'qty') return 'quantity';
  if (h.includes('unite') || h === 'unit') return 'unit';
  if (h.includes('categ') || h === 'rayon') return 'category';
  if (h.includes('portion') || h.includes('personne') || h.includes('couvert')) return 'servings';
  if (h.includes('temps') || h.includes('duree') || h.includes('minute')) return 'prepTime';
  if (h.includes('instruction') || h.includes('etape') || h.includes('preparation') || h.includes('consigne')) return 'instructions';
  return null;
};


/**
 * Lit un classeur Excel : une ligne par ingrédient, regroupée par « Nom de la recette ».
 * Colonnes facultatives reconnues : « Temps de préparation (min) », « Instructions ».
 * Une cellule « Nom de la recette » vide reprend la recette de la ligne précédente.
 */
export const parseRecipesWorkbook = (data: ArrayBuffer): ImportResult => {
  const wb = XLSX.read(data, { type: 'array' });
  const warnings: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: '', blankrows: false });
    const headerIndex = rows.findIndex((r) => r.filter((c) => detectColumn(String(c)) !== null).length >= 2);
    if (headerIndex === -1) continue;

    const cols: Partial<Record<Column, number>> = {};
    rows[headerIndex].forEach((c, i) => {
      const col = detectColumn(String(c));
      if (col && cols[col] === undefined) cols[col] = i;
    });
    if (cols.recipe === undefined || cols.ingredient === undefined) {
      throw new Error(
        `La feuille « ${sheetName} » doit contenir au moins les colonnes « Nom de la recette » et « Ingrédient ».`,
      );
    }

    const cell = (row: unknown[], col: Column): unknown => (cols[col] === undefined ? '' : row[cols[col]!]);
    const byName = new Map<string, Recipe>();
    const unknownCategories = new Set<string>();
    const badQuantities: string[] = [];
    let current = '';
    let rowCount = 0;

    for (const row of rows.slice(headerIndex + 1)) {
      const recipeName = String(cell(row, 'recipe') ?? '').trim() || current;
      const ingName = String(cell(row, 'ingredient') ?? '').trim();
      if (!recipeName) continue;
      current = recipeName;

      const key = normalize(recipeName);
      let recipe = byName.get(key);
      if (!recipe) {
        const now = Date.now();
        recipe = { id: uid(), name: recipeName, servings: 0, instructions: '', ingredients: [], createdAt: now, updatedAt: now };
        byName.set(key, recipe);
      }

      const servings = parseQuantity(cell(row, 'servings')).value;
      if (!recipe.servings && servings > 0) recipe.servings = Math.round(servings);
      const prep = parseQuantity(cell(row, 'prepTime')).value;
      if (!recipe.prepTime && prep > 0) recipe.prepTime = Math.round(prep);
      const rating = parseQuantity(cell(row, 'rating')).value;
      if (!recipe.rating && rating >= 1 && rating <= 5) recipe.rating = Math.round(rating);
      const instr = String(cell(row, 'instructions') ?? '').trim();
      if (instr && !recipe.instructions) recipe.instructions = instr;

      if (!ingName) continue;
      rowCount++;

      const q = parseQuantity(cell(row, 'quantity'));
      let unit = String(cell(row, 'unit') ?? '').trim();
      if (!unit && q.rest) unit = q.rest.trim(); // « 200 g » dans la colonne quantité
      let quantity = q.value;
      if (Number.isNaN(quantity)) {
        badQuantities.push(`${ingName} (${recipeName})`);
        quantity = 0;
      }

      const rawCat = String(cell(row, 'category') ?? '').trim();
      let category: Category | null = matchCategory(rawCat);
      if (!category) {
        unknownCategories.add(rawCat || '(vide)');
        category = 'Autres';
      }

      const ing: Ingredient = { id: uid(), name: ingName, quantity, unit, category };
      recipe.ingredients.push(ing);
    }

    const recipes = [...byName.values()].filter((r) => r.ingredients.length > 0);
    for (const r of recipes) {
      if (!r.servings) {
        r.servings = 4;
        warnings.push(`« ${r.name} » : portions de base absentes, 4 portions retenues.`);
      }
    }
    if (unknownCategories.size) {
      warnings.push(
        `Catégories non reconnues classées dans « Autres » : ${[...unknownCategories].join(', ')}. Catégories attendues : ${CATEGORIES.join(', ')}.`,
      );
    }
    if (badQuantities.length) {
      warnings.push(`Quantités illisibles, importées « selon goût » : ${badQuantities.slice(0, 5).join(', ')}${badQuantities.length > 5 ? '…' : ''}.`);
    }
    if (!recipes.length) throw new Error('Aucune recette avec ingrédients n’a été trouvée dans le fichier.');
    return { recipes, warnings, rowCount };
  }

  throw new Error(`Colonnes introuvables. En-têtes attendus : ${EXPECTED_COLUMNS.join(', ')}.`);
};

/** Télécharge un modèle Excel pré-rempli avec deux recettes d'exemple. */
export const downloadTemplate = () => {
  const rows = [
    [...EXPECTED_COLUMNS, 'Temps de préparation (min)', 'Instructions'],
    ['Poulet basquaise', 'Cuisses de poulet', 4, 'pièce(s)', 'Viandes', 4, 60, 'Faire dorer le poulet, ajouter les légumes et mijoter 45 min.'],
    ['Poulet basquaise', 'Poivrons', 3, 'pièce(s)', 'Légumes', 4, '', ''],
    ['Poulet basquaise', 'Tomates', 400, 'g', 'Légumes', 4, '', ''],
    ['Poulet basquaise', 'Oignon', 2, 'pièce(s)', 'Légumes', 4, '', ''],
    ['Poulet basquaise', 'Riz basmati', 300, 'g', 'Féculents', 4, '', ''],
    ['Pâtes au saumon', 'Tagliatelles', 200, 'g', 'Féculents', 2, 20, 'Cuire les pâtes, poêler le saumon, lier à la crème.'],
    ['Pâtes au saumon', 'Pavé de saumon', 2, 'pièce(s)', 'Poissons & Fruits de mer', 2, '', ''],
    ['Pâtes au saumon', 'Crème fraîche', 20, 'cl', 'Produits laitiers', 2, '', ''],
    ['Pâtes au saumon', 'Oignon', 1, 'pièce(s)', 'Légumes', 2, '', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [24, 22, 10, 12, 24, 16, 24, 50].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recettes');
  XLSX.writeFile(wb, 'modele-recettes.xlsx');
};

/** Exporte la liste de courses en Excel (une feuille, triée par catégorie). */
export const exportShoppingListXlsx = (items: ShoppingItem[], checked: Record<string, boolean>) => {
  const rows: unknown[][] = [['Catégorie', 'Article', 'Quantité', 'Recettes', 'Acheté']];
  for (const [cat, list] of groupByCategory(items)) {
    for (const i of list) rows.push([cat, i.name, formatAmounts(i.amounts), i.sources.join(', '), checked[i.key] ? 'oui' : '']);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [24, 28, 22, 40, 8].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Liste de courses');
  XLSX.writeFile(wb, 'liste-de-courses.xlsx');
};
