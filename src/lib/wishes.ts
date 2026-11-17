import type { ShoppingItem, WishItem } from '../types';
import { toAmount } from './units';

export const WISH_KEY_PREFIX = 'wish:';
export const isWishKey = (key: string): boolean => key.startsWith(WISH_KEY_PREFIX);

/** Convertit les souhaits validés en lignes de liste de courses. */
export const wishesToShopping = (items: WishItem[]): ShoppingItem[] =>
  items.map((w) => ({
    key: WISH_KEY_PREFIX + w.id,
    name: w.name,
    category: w.category,
    amounts: w.quantity && w.quantity > 0 ? [toAmount(w.quantity, w.unit ?? '')] : [],
    sources: [w.author ? `Souhait de ${w.author}` : 'Liste de souhaits'],
  }));
