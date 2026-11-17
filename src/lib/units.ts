import { formatNumber, normalize } from './text';
import type { ShoppingAmount } from '../types';

/** Unités proposées dans les formulaires. */
export const COMMON_UNITS = ['g', 'kg', 'ml', 'cl', 'l', 'pièce(s)', 'c. à soupe', 'c. à café', 'gousse(s)', 'tranche(s)', 'botte(s)', 'pincée(s)', 'boîte(s)', 'sachet(s)'];

interface UnitInfo {
  family: string;
  /** Multiplicateur vers l'unité de base de la famille. */
  factor: number;
  label: string;
}

// Unité de base : g pour la masse, ml pour le volume, c. à café pour les cuillères.
const TABLE: Array<[string[], UnitInfo]> = [
  [['mg', 'milligramme', 'milligrammes'], { family: 'mass', factor: 0.001, label: 'g' }],
  [['g', 'gr', 'grs', 'gramme', 'grammes'], { family: 'mass', factor: 1, label: 'g' }],
  [['kg', 'kgs', 'kilo', 'kilos', 'kilogramme', 'kilogrammes'], { family: 'mass', factor: 1000, label: 'g' }],
  [['ml', 'millilitre', 'millilitres'], { family: 'volume', factor: 1, label: 'ml' }],
  [['cl', 'centilitre', 'centilitres'], { family: 'volume', factor: 10, label: 'ml' }],
  [['dl', 'decilitre', 'decilitres'], { family: 'volume', factor: 100, label: 'ml' }],
  [['l', 'litre', 'litres', 'lt'], { family: 'volume', factor: 1000, label: 'ml' }],
  [
    ['', 'piece', 'pieces', 'piece(s)', 'pc', 'pcs', 'p', 'unite', 'unites', 'unite(s)', 'u', 'x'],
    { family: 'count', factor: 1, label: 'pièce(s)' },
  ],
  [
    ['c. a soupe', 'c.a soupe', 'c a soupe', 'cas', 'c.a.s', 'c.a.s.', 'cs', 'cuillere a soupe', 'cuilleres a soupe', 'cuillere(s) a soupe', 'cuil. a soupe', 'tbsp'],
    { family: 'spoon', factor: 3, label: 'c. à soupe' },
  ],
  [
    ['c. a cafe', 'c.a cafe', 'c a cafe', 'cac', 'c.a.c', 'c.a.c.', 'cc', 'cuillere a cafe', 'cuilleres a cafe', 'cuillere(s) a cafe', 'cuil. a cafe', 'tsp'],
    { family: 'spoon', factor: 1, label: 'c. à café' },
  ],
];

const LOOKUP = new Map<string, UnitInfo>();
for (const [aliases, info] of TABLE) for (const a of aliases) LOOKUP.set(a, info);

/** Traduit une unité saisie librement en famille + facteur de conversion. */
export const resolveUnit = (unit: string): UnitInfo => {
  const compact = normalize(unit);
  const hit = LOOKUP.get(compact) ?? LOOKUP.get(compact.replace(/\s+/g, ''));
  if (hit) return hit;
  // Unité libre (gousse, tranche…) : on regroupe sur sa forme sans « s » final.
  const key = compact.replace(/\(s\)$/, '').replace(/s$/, '');
  return { family: `other:${key}`, factor: 1, label: unit.trim() };
};

export const toAmount = (quantity: number, unit: string): ShoppingAmount => {
  const u = resolveUnit(unit);
  return { family: u.family, base: quantity * u.factor, label: u.label };
};

const roundUp = (v: number): number => Math.ceil(v - 0.001);

/** Met en forme une quantité agrégée dans l'unité la plus lisible. */
export const formatAmount = (a: ShoppingAmount): string => {
  const v = a.base;
  switch (a.family) {
    case 'mass':
      return v >= 1000 ? `${formatNumber(v / 1000)} kg` : `${formatNumber(v >= 10 ? Math.round(v) : v)} g`;
    case 'volume':
      if (v >= 1000) return `${formatNumber(v / 1000)} l`;
      if (v >= 100 && v % 10 === 0) return `${formatNumber(v / 10)} cl`;
      return `${formatNumber(Math.round(v))} ml`;
    case 'count':
      // On n'achète pas une demi-courgette : arrondi à l'unité supérieure.
      return formatNumber(roundUp(v));
    case 'spoon': {
      if (v < 3) return `${formatNumber(v)} c. à café`;
      const tbsp = v / 3;
      if (Math.abs(tbsp * 2 - Math.round(tbsp * 2)) < 0.01) return `${formatNumber(tbsp)} c. à soupe`;
      const whole = Math.floor(tbsp);
      return `${formatNumber(whole)} c. à soupe + ${formatNumber(v - whole * 3)} c. à café`;
    }
    default:
      return `${formatNumber(roundUp(v))} ${a.label}`;
  }
};

export const formatAmounts = (amounts: ShoppingAmount[]): string =>
  amounts.length ? amounts.map(formatAmount).join(' + ') : 'selon besoin';

/** Affiche une quantité de recette (non agrégée) en gardant l'unité d'origine. */
export const formatIngredientQuantity = (quantity: number, unit: string): string => {
  if (!quantity) return 'selon goût';
  const u = unit.trim();
  return u ? `${formatNumber(quantity)} ${u}` : formatNumber(quantity);
};
