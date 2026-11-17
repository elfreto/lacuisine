import type { NewWish, WishItem } from '../types';
import { CATEGORIES } from '../types';
import { uid } from './id';

/**
 * Stockage de la liste de souhaits.
 * - Avec VITE_SUPABASE_URL et VITE_SUPABASE_KEY : table partagée `lacuisine_souhaits` (tous les appareils voient la même liste).
 * - Sans configuration : liste locale à l'appareil (localStorage).
 */
export interface WishStore {
  shared: boolean;
  list(): Promise<WishItem[]>;
  add(w: NewWish): Promise<WishItem>;
  update(ids: string[], patch: Partial<Pick<WishItem, 'status' | 'validatedAt'>>): Promise<void>;
  remove(ids: string[]): Promise<void>;
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
const TABLE = 'lacuisine_souhaits';

// ---------------------------------------------------------------- local
const LOCAL_KEY = 'cuisine-ac:wishes';
const readLocal = (): WishItem[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as WishItem[];
  } catch {
    return [];
  }
};
const writeLocal = (items: WishItem[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch {
    /* stockage indisponible */
  }
};

const localStore: WishStore = {
  shared: false,
  list: async () => readLocal(),
  add: async (w) => {
    const item: WishItem = { ...w, id: uid(), status: 'pending', createdAt: Date.now() };
    writeLocal([...readLocal(), item]);
    return item;
  },
  update: async (ids, patch) => {
    const set = new Set(ids);
    writeLocal(readLocal().map((i) => (set.has(i.id) ? { ...i, ...patch } : i)));
  },
  remove: async (ids) => {
    const set = new Set(ids);
    writeLocal(readLocal().filter((i) => !set.has(i.id)));
  },
};

// ---------------------------------------------------------------- Supabase (API REST PostgREST)
interface Row {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  author: string | null;
  note: string | null;
  status: 'pending' | 'validated';
  created_at: string;
  validated_at: string | null;
}

const fromRow = (r: Row): WishItem => ({
  id: r.id,
  name: r.name,
  quantity: r.quantity ?? undefined,
  unit: r.unit ?? undefined,
  category: (CATEGORIES as readonly string[]).includes(r.category) ? (r.category as WishItem['category']) : 'Autres',
  author: r.author ?? undefined,
  note: r.note ?? undefined,
  status: r.status,
  createdAt: Date.parse(r.created_at),
  validatedAt: r.validated_at ? Date.parse(r.validated_at) : undefined,
});

const request = async (path: string, init: RequestInit = {}) => {
  const headers: Record<string, string> = { apikey: SUPABASE_KEY!, 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  // Les anciennes clés « anon » (JWT) passent aussi en Authorization ; les clés sb_publishable_ seulement en apikey.
  if (SUPABASE_KEY && !SUPABASE_KEY.startsWith('sb_')) headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`Serveur de souhaits indisponible (${res.status}).`);
  return res.status === 204 ? null : res.json();
};

const inList = (ids: string[]) => `id=in.(${ids.map(encodeURIComponent).join(',')})`;

const supabaseStore: WishStore = {
  shared: true,
  list: async () => ((await request(`${TABLE}?select=*&order=created_at.asc`)) as Row[]).map(fromRow),
  add: async (w) => {
    const rows = (await request(TABLE, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        name: w.name,
        quantity: w.quantity ?? null,
        unit: w.unit || null,
        category: w.category,
        author: w.author || null,
        note: w.note || null,
      }),
    })) as Row[];
    return fromRow(rows[0]);
  },
  update: async (ids, patch) => {
    if (!ids.length) return;
    const body: Record<string, unknown> = {};
    if (patch.status) body.status = patch.status;
    if ('validatedAt' in patch) body.validated_at = patch.validatedAt ? new Date(patch.validatedAt).toISOString() : null;
    await request(`${TABLE}?${inList(ids)}`, { method: 'PATCH', body: JSON.stringify(body) });
  },
  remove: async (ids) => {
    if (!ids.length) return;
    await request(`${TABLE}?${inList(ids)}`, { method: 'DELETE' });
  },
};

const IS_PREVIEW = import.meta.env.MODE === 'preview';

// Aperçu de démonstration : quelques souhaits d'exemple, et jamais de connexion au serveur.
if (IS_PREVIEW) {
  try {
    if (localStorage.getItem(LOCAL_KEY) === null) {
      const now = Date.now();
      writeLocal([
        { id: uid(), name: 'Yaourts à la fraise', quantity: 8, unit: 'pièce(s)', category: 'Produits laitiers', author: 'Léa', status: 'pending', createdAt: now - 3_600_000 },
        { id: uid(), name: 'Céréales au chocolat', category: 'Épicerie & Condiments', author: 'Tom', note: 'la grande boîte', status: 'pending', createdAt: now - 1_800_000 },
        { id: uid(), name: 'Clémentines', quantity: 1, unit: 'kg', category: 'Fruits', author: 'Anne-Cécile', status: 'pending', createdAt: now - 600_000 },
      ]);
    }
  } catch {
    /* stockage indisponible */
  }
}

export const wishStore: WishStore = !IS_PREVIEW && SUPABASE_URL && SUPABASE_KEY ? supabaseStore : localStore;
