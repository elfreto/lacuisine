/** Minuscules, sans accents, espaces normalisés. */
export const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Clé d'agrégation d'un ingrédient : « Oignons rouges » et « oignon rouge » donnent la même clé. */
export const ingredientKey = (name: string): string =>
  normalize(name)
    .split(' ')
    .map((w) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w))
    .join(' ');

export const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
export const formatNumber = (n: number): string => nf.format(Math.round(n * 100) / 100);

/** Accepte 200, "1,5", "1.5", "1/2", "1 1/2", "200 g". Renvoie NaN si rien de lisible. */
export const parseQuantity = (raw: unknown): { value: number; rest: string } => {
  if (typeof raw === 'number') return { value: raw, rest: '' };
  const s = String(raw ?? '').trim();
  if (!s) return { value: 0, rest: '' };
  const m = s.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (m) return { value: Number(m[1]) + Number(m[2]) / Number(m[3]), rest: m[4] };
  const f = s.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (f) return { value: Number(f[1]) / Number(f[2]), rest: f[3] };
  const d = s.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (d) return { value: Number(d[1].replace(',', '.')), rest: d[2] };
  return { value: NaN, rest: s };
};

export const formatDuration = (minutes?: number): string | null => {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
};
