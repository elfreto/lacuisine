import { useMemo, useState } from 'react';
import { BookOpen, CalendarDays, ListChecks, Plus, Search, Trash2, Users } from 'lucide-react';
import { DAYS, NO_DAY, type PlanDay, type PlannedMeal, type Recipe } from '../types';
import { scaleRatio } from '../lib/shopping';
import { formatNumber, normalize } from '../lib/text';
import { EmptyState, Stepper } from './ui';

const DAY_ORDER: PlanDay[] = [...DAYS, NO_DAY];

export function MealPlanner({
  recipes,
  meals,
  defaultPeople,
  onDefaultPeople,
  onAdd,
  onUpdate,
  onRemove,
  onClear,
  onGenerate,
  onGoRecipes,
}: {
  recipes: Recipe[];
  meals: PlannedMeal[];
  defaultPeople: number;
  onDefaultPeople: (n: number) => void;
  onAdd: (recipeId: string, people: number, day: PlanDay) => void;
  onUpdate: (id: string, patch: Partial<PlannedMeal>) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onGenerate: () => void;
  onGoRecipes: () => void;
}) {
  const [query, setQuery] = useState('');
  const [addDay, setAddDay] = useState<PlanDay>(NO_DAY);
  const [confirmClear, setConfirmClear] = useState(false);
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const validMeals = meals.filter((m) => byId.has(m.recipeId));
  const totalPeople = validMeals.reduce((s, m) => s + m.people, 0);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return [...recipes]
      .filter((r) => !q || normalize(r.name).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [recipes, query]);

  if (!recipes.length) {
    return (
      <EmptyState icon={CalendarDays} title="Rien à planifier pour l’instant" text="Le planning s’appuie sur votre carnet. Ajoutez d’abord quelques recettes, puis composez votre menu de la semaine ou d’un repas de fête.">
        <button className="btn-primary" onClick={onGoRecipes}><BookOpen size={16} /> Aller aux recettes</button>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* Menu planifié */}
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Mon menu</h2>
            <p className="text-sm text-muted">
              {validMeals.length ? `${validMeals.length} repas · ${totalPeople} couverts au total` : 'Choisissez des recettes dans la colonne de droite.'}
            </p>
          </div>
          {validMeals.length > 0 && (
            confirmClear ? (
              <span className="flex items-center gap-1 text-sm">
                Vider le menu ?
                <button className="btn-ghost px-3 py-1.5" onClick={() => setConfirmClear(false)}>Non</button>
                <button className="btn-danger px-3 py-1.5" onClick={() => { onClear(); setConfirmClear(false); }}>Vider</button>
              </span>
            ) : (
              <button className="btn-ghost px-3 py-1.5" onClick={() => setConfirmClear(true)}><Trash2 size={16} /> Vider</button>
            )
          )}
        </div>

        {validMeals.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Votre menu est vide" text="Ajoutez des recettes avec le bouton +, choisissez le jour et le nombre de convives : les quantités s’adaptent toutes seules." />
        ) : (
          <div className="flex flex-col gap-5">
            {DAY_ORDER.map((day) => {
              const dayMeals = validMeals.filter((m) => m.day === day);
              if (!dayMeals.length) return null;
              return (
                <div key={day}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{day === NO_DAY ? 'Sans jour précis' : day}</h3>
                  <ul className="flex flex-col gap-2">
                    {dayMeals.map((m) => {
                      const r = byId.get(m.recipeId)!;
                      const ratio = scaleRatio(m.people, r.servings);
                      return (
                        <li key={m.id} className="panel flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                          <div className="min-w-0 flex-1 basis-48">
                            <p className="truncate font-semibold">{r.name}</p>
                            <p className="text-xs text-muted">
                              Base {r.servings} pers. ·{' '}
                              <span className={ratio !== 1 ? 'font-semibold text-accent' : ''}>quantités × {formatNumber(ratio)}</span>
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Stepper value={m.people} onChange={(people) => onUpdate(m.id, { people })} label={`Personnes pour ${r.name}`} />
                            <select
                              className="field w-auto py-2"
                              value={m.day}
                              aria-label="Jour"
                              onChange={(e) => onUpdate(m.id, { day: e.target.value as PlanDay })}
                            >
                              {DAY_ORDER.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <button className="icon-btn hover:text-tomato" onClick={() => onRemove(m.id)} aria-label={`Retirer ${r.name}`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <div className="sticky z-10 mt-2 rounded-2xl bg-bg/90 py-2 backdrop-blur lg:static lg:bg-transparent lg:p-0" style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <button className="btn-primary w-full py-3.5 text-base" disabled={!validMeals.length} onClick={onGenerate}>
            <ListChecks size={20} /> Générer la liste de courses
          </button>
        </div>
      </section>

      {/* Sélecteur de recettes */}
      <aside className="panel flex min-w-0 flex-col self-start lg:sticky lg:top-24">
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <h2 className="font-display text-lg font-bold">Ajouter au menu</h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="default-people"><Users size={12} className="mr-1 inline" />Personnes</label>
              <Stepper value={defaultPeople} onChange={onDefaultPeople} label="Nombre de personnes par défaut" />
            </div>
            <div>
              <label className="label" htmlFor="add-day">Jour</label>
              <select id="add-day" className="field py-2" value={addDay} onChange={(e) => setAddDay(e.target.value as PlanDay)}>
                {DAY_ORDER.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input id="planner-search" className="field pl-9" placeholder="Filtrer les recettes" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
          {filtered.map((r) => {
            const count = validMeals.filter((m) => m.recipeId === r.id).length;
            return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted">{r.servings} pers. de base{count ? ` · ${count}× au menu` : ''}</p>
                </div>
                <button
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition hover:bg-accent hover:text-accent-ink"
                  onClick={() => onAdd(r.id, defaultPeople, addDay)}
                  aria-label={`Ajouter ${r.name} au menu`}
                >
                  <Plus size={18} />
                </button>
              </li>
            );
          })}
          {!filtered.length && <li className="px-4 py-6 text-center text-sm text-muted">Aucune recette trouvée.</li>}
        </ul>
      </aside>
    </div>
  );
}
