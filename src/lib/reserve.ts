import type { Category, ReserveItem, ReserveSection, ShoppingItem } from '../types';
import { normalize } from './text';
import { toAmount } from './units';

/** Différence entre prévu et stock, jamais négative. */
export const suggestedToBuy = (i: ReserveItem): number => Math.max(0, round(i.planned - i.stock));
/** Quantité à acheter retenue : la valeur choisie à la main, sinon la différence. */
export const toBuyOf = (i: ReserveItem): number => i.toBuy ?? suggestedToBuy(i);
export const isLow = (i: ReserveItem): boolean => i.threshold > 0 && i.stock < i.threshold;

export const round = (n: number): number => Math.round(n * 100) / 100;

export const RESERVE_KEY_PREFIX = 'reserve:';
export const isReserveKey = (key: string): boolean => key.startsWith(RESERVE_KEY_PREFIX);

/** Convertit les articles choisis en lignes de liste de courses. */
export const reserveToShopping = (items: ReserveItem[]): ShoppingItem[] =>
  items
    .filter((i) => toBuyOf(i) > 0)
    .map((i) => ({
      key: RESERVE_KEY_PREFIX + i.id,
      name: i.name,
      category: i.category,
      amounts: [toAmount(toBuyOf(i), i.unit)],
      sources: ['Réserve de survie'],
    }));

type Seed = [name: string, note: string, planned: number, unit: string, category: Category];
const A = 'Alimentation', H = 'Articles d’hygiène', M = 'Articles médicaux', O = 'Autres';

/**
 * Liste de l'OFAE (Approvisionnement économique du pays, « reserve.pdf ») :
 * désignation, précision et quantité recommandée. Stock à 0, seuil d'alerte à la moitié du prévu.
 */
const OFAE: Record<string, Seed[]> = {
  [A]: [
    ['Eau minérale', 'Bouteilles de 1,5 litre, pour boire et cuisiner !', 66, 'bouteille(s)', 'Boissons'],
    ['Autres boissons', 'Jus de fruits et de légumes, boissons sucrées de 1 litre', 7, 'unité(s)', 'Boissons'],
    ['Thé', 'env. 100 g', 4, 'unité(s)', 'Boissons'],
    ['Café', '1 kg', 1, 'unité(s)', 'Boissons'],
    ['Lait ou alternative au lait', '1 litre', 7, 'unité(s)', 'Produits laitiers'],
    ['Légumes', 'Conserves de légumes p. ex. (maïs, tomates, champignons, petits pois et carottes) (env. 300 g)', 30, 'unité(s)', 'Légumes'],
    ['Fruits', 'Compote de pommes, conserves d’ananas ou fruits secs, p. ex. (env. 300 g)', 23, 'unité(s)', 'Fruits'],
    ['Sauces', 'Sauce tomate, pesto, ketchup, mayonnaise, moutarde, p. ex. (env. 200 g)', 10, 'unité(s)', 'Épicerie & Condiments'],
    ['Soupes', 'Bouillon en cubes, soupes prêtes à l’emploi et lyophilisées aux tomates, vermicelles, p. ex. (env. 200 g)', 10, 'unité(s)', 'Épicerie & Condiments'],
    ['Produits céréaliers', 'Pâtes, riz, galettes de riz, muesli, p. ex., ou alternative sans gluten (env. 500 g)', 14, 'unité(s)', 'Féculents'],
    ['Plats cuisinés', 'Risotto prêt à l’emploi, rösti, p. ex. (env. 250 g)', 17, 'unité(s)', 'Épicerie & Condiments'],
    ['Légumineuses', 'Pois chiches, haricots à la sauce tomate, lentilles en conserve ou sèches, p. ex. (env. 400 g)', 20, 'unité(s)', 'Féculents'],
    ['Viande', 'Viande des Grisons, jambon cru, salami, fromage d’Italie en conserve, p. ex. (env. 100 g)', 10, 'unité(s)', 'Viandes'],
    ['Poisson', 'Sardines, thon en conserve, p. ex. (env. 100 g)', 17, 'unité(s)', 'Poissons & Fruits de mer'],
    ['Produits laitiers', 'Fromage à pâte dure p. ex. (env. 300 g)', 4, 'unité(s)', 'Produits laitiers'],
    ['Noix', 'Noix de cajou, amandes, noisettes, p. ex. (env. 200 g)', 4, 'unité(s)', 'Épicerie & Condiments'],
    ['Huile', 'Huile d’olive, huile de colza, p. ex. (env. 1 litre)', 1, 'unité(s)', 'Épicerie & Condiments'],
    ['Épices', 'Sel, poivre, sucre, édulcorant, p. ex.', 1, 'unité(s)', 'Épicerie & Condiments'],
    ['Snacks', 'Aliments sucrés, salés (chips, chocolat, p. ex.)', 14, 'unité(s)', 'Épicerie & Condiments'],
  ],
  [H]: [
    ['Soins du corps', 'Savon, shampoing, déodorant, dentifrice, rasoir, p. ex.', 5, 'unité(s)', 'Autres'],
    ['Protections et préservatifs', 'Protège-slips, tampons, préservatifs, p. ex.', 5, 'unité(s)', 'Autres'],
    ['Papier toilette', 'Paquets', 5, 'paquet(s)', 'Autres'],
    ['Mouchoirs en papier', 'Paquets', 5, 'paquet(s)', 'Autres'],
    ['Détergents', '', 5, 'unité(s)', 'Autres'],
  ],
  [M]: [
    ['Masques', 'Nombre de pièces', 250, 'pièce(s)', 'Autres'],
    ['Désinfectant pour les mains', 'env. 100 ml', 10, 'unité(s)', 'Autres'],
  ],
  [O]: [
    ['Sacs poubelle', '', 5, 'unité(s)', 'Autres'],
    ['Bougies', '', 24, 'pièce(s)', 'Autres'],
  ],
};
const OFAE_OBJECTS: Seed[] = [
  ['Lampe de poche', 'Alternative pour une durée limitée : téléphone portable', 1, 'pièce(s)', 'Autres'],
  ['Réchaud à gaz', 'Alternatives : barbecue à gaz ou au charbon de bois, réchaud à fondue + gel combustible, cheminée, foyer extérieur', 1, 'pièce(s)', 'Autres'],
  ['Piles de rechange', '', 1, 'lot(s)', 'Autres'],
  ['Radio à piles', 'Pour la réception de la radio IPCC ; à piles ou à l’énergie solaire', 1, 'pièce(s)', 'Autres'],
  ['Batterie externe', 'Fonctionnant idéalement sur piles ; de préférence à piles ou à énergie solaire', 1, 'pièce(s)', 'Autres'],
  ['Allumettes', 'Alternative : briquet', 1, 'boîte(s)', 'Autres'],
  ['Thermomètre médical', '', 1, 'pièce(s)', 'Autres'],
  ['Ouvre-boîte', 'Alternative : couteau de poche', 1, 'pièce(s)', 'Autres'],
];

/** Identifiant stable dérivé de la désignation : les saisies survivent aux mises à jour de la liste. */
const ofaeId = (name: string): string => 'ofae-' + normalize(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const make = ([name, note, planned, unit, category]: Seed, section: ReserveSection, group?: string): ReserveItem => ({
  id: ofaeId(name),
  name,
  note: note || undefined,
  group,
  section,
  unit,
  planned,
  stock: 0,
  threshold: Math.ceil(planned / 2),
  category,
});

/** Les 36 articles recommandés par l'OFAE, stock à 0. */
export const ofaeReserve = (): ReserveItem[] => [
  ...Object.entries(OFAE).flatMap(([group, seeds]) => seeds.map((s) => make(s, 'vivres', group))),
  ...OFAE_OBJECTS.map((s) => make(s, 'materiel')),
];

/**
 * La réserve contient exactement les articles OFAE : on reprend les saisies déjà faites
 * (prévu, stock, seuil, à acheter, unité, rayon) pour les articles reconnus, le reste est retiré.
 */
export const syncOfae = (stored: ReserveItem[]): ReserveItem[] => {
  const byKey = new Map<string, ReserveItem>();
  for (const i of stored) {
    byKey.set(i.id, i);
    byKey.set(ofaeId(i.name), i);
  }
  return ofaeReserve().map((base) => {
    const old = byKey.get(base.id);
    if (!old) return base;
    const { planned, stock, threshold, toBuy, unit, category } = old;
    return { ...base, planned, stock, threshold, toBuy, unit, category };
  });
};
