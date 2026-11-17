import { useMemo, useState } from 'react';
import { BookOpen, CalendarPlus, Clock, FileSpreadsheet, Pencil, Plus, Search, Sparkles, Trash2, Users } from 'lucide-react';
import { CATEGORIES, type Recipe } from '../types';
import { formatDuration, normalize } from '../lib/text';
import { CategoryIcon, EmptyState, StarRating } from './ui';

export function RecipeList({
  recipes,
  plannedIds,
  onCreate,
  onImport,
  onLoadSamples,
  onOpen,
  onEdit,
  onDelete,
  onPlan,
  onRate,
}: {
  recipes: Recipe[];
  plannedIds: Set<string>;
  onCreate: () => void;
  onImport: () => void;
  onLoadSamples: () => void;
  onOpen: (r: Recipe) => void;
  onEdit: (r: Recipe) => void;
  onDelete: (r: Recipe) => void;
  onPlan: (r: Recipe) => void;
  onRate: (r: Recipe, rating: number | undefined) => void;
}) {
  const [query, setQuery] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [sort, setSort] = useState<'nom' | 'note'>('nom');

  const filtered = useMemo(() => {
    const q = normalize(query);
    const list = q
      ? recipes.filter((r) => normalize(r.name).includes(q) || r.ingredients.some((i) => normalize(i.name).includes(q)))
      : recipes;
    return [...list].sort((a, b) => (sort === 'note' ? (b.rating ?? 0) - (a.rating ?? 0) : 0) || a.name.localeCompare(b.name, 'fr'));
  }, [recipes, query, sort]);

  if (!recipes.length) {
    return (
      <EmptyState icon={BookOpen} title="Votre carnet de recettes est vide" text="Ajoutez vos plats préférés à la main, importez-les depuis un fichier Excel, ou partez de quelques recettes d’exemple.">
        <button className="btn-primary" onClick={onCreate}><Plus size={16} /> Ajouter une recette</button>
        <button className="btn-secondary" onClick={onImport}><FileSpreadsheet size={16} /> Importer un fichier Excel</button>
        <button className="btn-ghost" onClick={onLoadSamples}><Sparkles size={16} /> Charger 5 recettes d’exemple</button>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="recipe-search"
            className="field pl-9"
            placeholder="Rechercher une recette ou un ingrédient"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select id="recipe-sort" className="field w-auto flex-1 sm:flex-none" value={sort} onChange={(e) => setSort(e.target.value as 'nom' | 'note')} aria-label="Trier les recettes">
            <option value="nom">De A à Z</option>
            <option value="note">Mieux notées</option>
          </select>
          <button className="btn-secondary flex-1 sm:flex-none" onClick={onImport}><FileSpreadsheet size={16} /> Importer</button>
          <button className="btn-primary flex-1 sm:flex-none" onClick={onCreate}><Plus size={16} /> Nouvelle recette</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-muted">Aucune recette ne correspond à « {query} ».</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const cats = CATEGORIES.filter((c) => r.ingredients.some((i) => i.category === c));
            const planned = plannedIds.has(r.id);
            return (
              <li key={r.id} className="panel group flex flex-col transition hover:border-accent/50 hover:shadow-md">
                <button className="flex flex-1 flex-col gap-3 p-5 text-left focus-visible:outline-none" onClick={() => onOpen(r)}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-bold leading-snug group-hover:text-accent">{r.name}</h3>
                    {planned && <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Au menu</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <span className="flex items-center gap-1.5"><Users size={14} /> {r.servings} pers.</span>
                    {formatDuration(r.prepTime) && <span className="flex items-center gap-1.5"><Clock size={14} /> {formatDuration(r.prepTime)}</span>}
                    <span>{r.ingredients.length} ingrédient(s)</span>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {cats.map((c) => <CategoryIcon key={c} category={c} size={14} />)}
                  </div>
                </button>
                <div className="-mt-1 px-4 pb-3">
                  <StarRating value={r.rating} onChange={(v) => onRate(r, v)} size={18} label={`Noter ${r.name}`} />
                </div>
                <div className="flex items-center justify-between border-t border-line px-3 py-2">
                  {confirmId === r.id ? (
                    <div className="flex w-full items-center justify-between gap-2 text-sm">
                      <span className="font-medium">Supprimer cette recette ?</span>
                      <span className="flex gap-1">
                        <button className="btn-ghost px-3 py-1.5" onClick={() => setConfirmId(null)}>Non</button>
                        <button className="btn-danger px-3 py-1.5" onClick={() => { onDelete(r); setConfirmId(null); }}>Supprimer</button>
                      </span>
                    </div>
                  ) : (
                    <>
                      <button className="btn-ghost px-3 py-1.5 text-accent hover:text-accent" onClick={() => onPlan(r)}>
                        <CalendarPlus size={16} /> Planifier
                      </button>
                      <span className="flex">
                        <button className="icon-btn" onClick={() => onEdit(r)} aria-label={`Modifier ${r.name}`}><Pencil size={16} /></button>
                        <button className="icon-btn hover:text-tomato" onClick={() => setConfirmId(r.id)} aria-label={`Supprimer ${r.name}`}><Trash2 size={16} /></button>
                      </span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
