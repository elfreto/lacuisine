import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NO_DAY, type PlanDay, type PlannedMeal, type Recipe, type ReserveItem, type ShoppingList, type Tab, type WishItem } from './types';
import { useLocalStorage } from './lib/storage';
import { uid } from './lib/id';
import { normalize } from './lib/text';
import { generateShoppingList, planSignature } from './lib/shopping';
import { isLow, isReserveKey, ofaeReserve, reserveToShopping, round, syncOfae, toBuyOf } from './lib/reserve';
import { sampleRecipes } from './data/sampleRecipes';
import { Header } from './components/Header';
import { RecipeList } from './components/RecipeList';
import { RecipeForm } from './components/RecipeForm';
import { RecipeDetail } from './components/RecipeDetail';
import { ExcelImport, type ConflictMode } from './components/ExcelImport';
import { MealPlanner } from './components/MealPlanner';
import { ShoppingListView } from './components/ShoppingListView';
import { WishlistView } from './components/WishlistView';
import { useWishes } from './lib/useWishes';
import { isWishKey, wishesToShopping } from './lib/wishes';
import { ReserveView } from './components/ReserveView';
import { Toast } from './components/ui';

/** Dans l'aperçu autonome, les téléchargements et l'impression sont bloqués par le navigateur hôte. */
const IS_PREVIEW = import.meta.env.MODE === 'preview';
const TABS: Tab[] = ['recettes', 'planning', 'courses', 'souhaits', 'reserve'];

const readHash = (): Tab => {
  const h = window.location.hash.replace('#', '') as Tab;
  return TABS.includes(h) ? h : 'recettes';
};

/** Données de démonstration de l'aperçu : 5 recettes et un menu déjà composé. */
const previewSeed = () => {
  const recipes = sampleRecipes();
  const meals: PlannedMeal[] = [
    { id: uid(), recipeId: recipes[0].id, people: 6, day: 'Samedi' },
    { id: uid(), recipeId: recipes[1].id, people: 4, day: 'Mardi' },
    { id: uid(), recipeId: recipes[2].id, people: 4, day: 'Mercredi' },
    { id: uid(), recipeId: recipes[3].id, people: 2, day: 'Jeudi' },
  ];
  return { recipes, meals, reserve: ofaeReserve() };
};
const seed = IS_PREVIEW ? previewSeed() : { recipes: [] as Recipe[], meals: [] as PlannedMeal[], reserve: ofaeReserve() };

type Dialog =
  | { kind: 'form'; recipe?: Recipe }
  | { kind: 'detail'; recipe: Recipe }
  | { kind: 'import' }
  | null;

export default function App() {
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('recipes', seed.recipes);
  const [meals, setMeals] = useLocalStorage<PlannedMeal[]>('meals', seed.meals);
  const [defaultPeople, setDefaultPeople] = useLocalStorage<number>('defaultPeople', 4);
  const [list, setList] = useLocalStorage<ShoppingList | null>('shoppingList', null);
  const [checked, setChecked] = useLocalStorage<Record<string, boolean>>('checked', {});
  const [reserve, setReserve] = useLocalStorage<ReserveItem[]>('reserve', seed.reserve);
  const [reserveSel, setReserveSel] = useLocalStorage<Record<string, boolean>>('reserveSelected', {});
  // La réserve se limite aux 36 articles OFAE : tout autre article enregistré est retiré au chargement.
  useEffect(() => {
    const synced = syncOfae(reserve);
    if (JSON.stringify(synced) !== JSON.stringify(reserve)) setReserve(synced);
    const ids = new Set(synced.map((i) => i.id));
    setReserveSel((sel) => Object.fromEntries(Object.entries(sel).filter(([id]) => ids.has(id))));
    setList((l) => (l ? { ...l, items: l.items.filter((i) => !isReserveKey(i.key) || ids.has(i.key.slice('reserve:'.length))) } : l));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Mode clair par défaut, quel que soit le réglage de l'appareil ; bouton dans l'en-tête pour basculer.
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const [tab, setTabState] = useState<Tab>(readHash);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const setTab = (t: Tab) => {
    setTabState(t);
    if (window.location.hash !== `#${t}`) window.location.hash = t;
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    const onHash = () => setTabState(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // --- Recettes -------------------------------------------------------------
  const saveRecipe = (r: Recipe) => {
    setRecipes((list) => (list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r]));
    setDialog(null);
    notify(`« ${r.name} » enregistrée`);
  };

  // La note ne touche pas updatedAt : noter une recette ne rend pas la liste de courses « périmée ».
  const rateRecipe = (id: string, rating: number | undefined) =>
    setRecipes((list) => list.map((x) => (x.id === id ? { ...x, rating } : x)));

  const deleteRecipe = (r: Recipe) => {
    setRecipes((list) => list.filter((x) => x.id !== r.id));
    setMeals((list) => list.filter((m) => m.recipeId !== r.id));
    notify(`« ${r.name} » supprimée`);
  };

  const importRecipes = (incoming: Recipe[], mode: ConflictMode) => {
    setRecipes((list) => {
      if (mode === 'keep') return [...list, ...incoming];
      const next = [...list];
      for (const r of incoming) {
        const idx = next.findIndex((x) => normalize(x.name) === normalize(r.name));
        // On conserve l'identifiant existant pour que le menu reste lié à la recette.
        if (idx >= 0) next[idx] = { ...r, id: next[idx].id, createdAt: next[idx].createdAt };
        else next.push(r);
      }
      return next;
    });
    setDialog(null);
    notify(`${incoming.length} recette(s) importée(s)`);
  };

  const loadSamples = () => {
    setRecipes((list) => [...list, ...sampleRecipes()]);
    notify('5 recettes d’exemple ajoutées');
  };

  // --- Planning -------------------------------------------------------------
  const addMeal = (recipeId: string, people: number, day: PlanDay = NO_DAY) => {
    setMeals((list) => [...list, { id: uid(), recipeId, people, day }]);
    const name = recipes.find((r) => r.id === recipeId)?.name;
    notify(`« ${name} » ajoutée au menu (${people} pers.)`);
  };
  const updateMeal = (id: string, patch: Partial<PlannedMeal>) =>
    setMeals((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const removeMeal = (id: string) => setMeals((list) => list.filter((m) => m.id !== id));

  // --- Liste de courses -----------------------------------------------------
  const validMeals = useMemo(() => meals.filter((m) => recipes.some((r) => r.id === m.recipeId)), [meals, recipes]);
  const generate = () => {
    const generated = generateShoppingList(validMeals, recipes);
    // Les articles venus de la réserve et des souhaits restent dans la liste régénérée.
    const all = [...generated.items, ...(list?.items.filter((i) => isReserveKey(i.key) || isWishKey(i.key)) ?? [])];
    // Les articles supprimés à la main restent retirés (avec leurs quantités mises à jour, pour pouvoir les rétablir).
    const removedKeys = new Set((list?.removed ?? []).map((i) => i.key));
    const next = { ...generated, items: all.filter((i) => !removedKeys.has(i.key)), removed: all.filter((i) => removedKeys.has(i.key)) };
    // On garde les cases déjà cochées pour les articles toujours présents.
    setChecked((prev) => Object.fromEntries(next.items.filter((i) => prev[i.key]).map((i) => [i.key, true])));
    setList(next);
    setTab('courses');
    notify(`${next.items.length} articles dans la liste`);
  };
  const removeItems = (keys: string[]) => {
    if (!list || !keys.length) return;
    const drop = new Set(keys);
    const gone = list.items.filter((i) => drop.has(i.key));
    setList({ ...list, items: list.items.filter((i) => !drop.has(i.key)), removed: [...(list.removed ?? []), ...gone] });
    setChecked((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !drop.has(k))));
    notify(gone.length === 1 ? `« ${gone[0].name} » retiré de la liste` : `${gone.length} articles retirés de la liste`);
  };
  const restoreRemoved = () => {
    if (!list?.removed?.length) return;
    const back = list.removed;
    setList({ ...list, items: [...list.items, ...back], removed: [] });
    notify(`${back.length} article(s) rétabli(s)`);
  };
  const clearList = () => {
    setList(null);
    setChecked({});
    notify('Liste de courses vidée');
  };
  const stale = !!list && list.signature !== planSignature(validMeals, recipes);
  const remaining = list ? list.items.filter((i) => !checked[i.key]).length : 0;
  // --- Réserve de survie ----------------------------------------------------
  const saveReserveItem = (item: ReserveItem) => {
    setReserve((l) => l.map((x) => (x.id === item.id ? item : x)));
    notify(`« ${item.name} » enregistré`);
  };
  const updateReserveItem = (id: string, patch: Partial<ReserveItem>) =>
    setReserve((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const selectReserve = (ids: string[], value: boolean) =>
    setReserveSel((sel) => {
      const next = { ...sel };
      for (const id of ids) if (value) next[id] = true; else delete next[id];
      return next;
    });
  const sendReserveToList = (items: ReserveItem[]) => {
    const incoming = reserveToShopping(items);
    const keys = new Set(incoming.map((i) => i.key));
    setList((prev) => {
      const base = prev ?? { generatedAt: Date.now(), signature: '', mealCount: 0, items: [] };
      // Un article déjà envoyé est remplacé par sa nouvelle quantité.
      // Un article renvoyé depuis la réserve sort des articles supprimés.
      return { ...base, items: [...base.items.filter((i) => !keys.has(i.key)), ...incoming], removed: (base.removed ?? []).filter((i) => !keys.has(i.key)) };
    });
    setChecked((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !keys.has(k))));
    setReserveSel({});
    notify(`${incoming.length} article(s) ajouté(s) à la liste de courses`);
  };
  const restockReserve = (items: ReserveItem[]) => {
    const add = new Map(items.map((i) => [i.id, toBuyOf(i)]));
    setReserve((l) => l.map((x) => (add.has(x.id) ? { ...x, stock: round(x.stock + add.get(x.id)!), toBuy: undefined } : x)));
    setReserveSel({});
    notify(`Stock mis à jour pour ${items.length} article(s)`);
  };
  const lowCount = reserve.filter(isLow).length;
  // --- Souhaits -------------------------------------------------------------
  const wishes = useWishes();
  const pendingWishes = wishes.wishes.filter((w) => w.status === 'pending').length;
  const validateWishes = async (items: WishItem[]) => {
    if (!items.length) return;
    const ok = await wishes.validate(items.map((w) => w.id));
    if (!ok) return;
    const incoming = wishesToShopping(items);
    const keys = new Set(incoming.map((i) => i.key));
    setList((prev) => {
      const base = prev ?? { generatedAt: Date.now(), signature: '', mealCount: 0, items: [] };
      return { ...base, items: [...base.items.filter((i) => !keys.has(i.key)), ...incoming], removed: (base.removed ?? []).filter((i) => !keys.has(i.key)) };
    });
    notify(`${incoming.length} souhait(s) ajouté(s) à la liste de courses`);
  };

  const plannedIds = useMemo(() => new Set(validMeals.map((m) => m.recipeId)), [validMeals]);

  return (
    <div className="min-h-screen pb-28 lg:pb-12">
      <Header tab={tab} onTab={setTab} counts={{ recettes: recipes.length, planning: validMeals.length, courses: remaining, souhaits: pendingWishes, reserve: lowCount }} alerts={['reserve']} theme={theme} onTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} />

      <main className="gutter mx-auto max-w-6xl pt-6 md:pt-8">
        {tab === 'recettes' && (
          <RecipeList
            recipes={recipes}
            plannedIds={plannedIds}
            onCreate={() => setDialog({ kind: 'form' })}
            onImport={() => setDialog({ kind: 'import' })}
            onLoadSamples={loadSamples}
            onOpen={(recipe) => setDialog({ kind: 'detail', recipe })}
            onEdit={(recipe) => setDialog({ kind: 'form', recipe })}
            onDelete={deleteRecipe}
            onPlan={(r) => addMeal(r.id, defaultPeople)}
            onRate={(r, v) => rateRecipe(r.id, v)}
          />
        )}
        {tab === 'planning' && (
          <MealPlanner
            recipes={recipes}
            meals={meals}
            defaultPeople={defaultPeople}
            onDefaultPeople={setDefaultPeople}
            onAdd={addMeal}
            onUpdate={updateMeal}
            onRemove={removeMeal}
            onClear={() => setMeals([])}
            onGenerate={generate}
            onGoRecipes={() => setTab('recettes')}
          />
        )}
        {tab === 'courses' && (
          <ShoppingListView
            list={list}
            checked={checked}
            stale={stale}
            allowDownloads={!IS_PREVIEW}
            onToggle={(key) => setChecked((c) => ({ ...c, [key]: !c[key] }))}
            onReset={() => setChecked({})}
            onRemove={removeItems}
            onRestore={restoreRemoved}
            onClear={clearList}
            onRegenerate={generate}
            onGoPlanning={() => setTab('planning')}
            notify={notify}
          />
        )}
        {tab === 'souhaits' && (
          <WishlistView
            wishes={wishes.wishes}
            loading={wishes.loading}
            error={wishes.error}
            shared={wishes.shared}
            onAdd={async (w) => {
              const ok = await wishes.add(w);
              if (ok) notify(`« ${w.name} » ajouté aux souhaits`);
              return ok;
            }}
            onValidate={validateWishes}
            onRemove={wishes.remove}
            onRefresh={wishes.refresh}
          />
        )}
        {tab === 'reserve' && (
          <ReserveView
            items={reserve}
            selected={reserveSel}
            onSave={saveReserveItem}
            onUpdate={updateReserveItem}
            onToggle={(id) => selectReserve([id], !reserveSel[id])}
            onSelect={selectReserve}
            onClearSelection={() => setReserveSel({})}
            onSendToList={sendReserveToList}
            onRestock={restockReserve}
          />
        )}
      </main>

      {dialog?.kind === 'form' && <RecipeForm initial={dialog.recipe} onSave={saveRecipe} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'detail' && (
        <RecipeDetail
          recipe={dialog.recipe}
          onClose={() => setDialog(null)}
          onEdit={() => setDialog({ kind: 'form', recipe: dialog.recipe })}
          onPlan={(people) => { addMeal(dialog.recipe.id, people); setDialog(null); }}
          rating={recipes.find((x) => x.id === dialog.recipe.id)?.rating}
          onRate={(v) => rateRecipe(dialog.recipe.id, v)}
        />
      )}
      {dialog?.kind === 'import' && (
        <ExcelImport existing={recipes} onImport={importRecipes} onClose={() => setDialog(null)} allowDownloads={!IS_PREVIEW} />
      )}
      <Toast message={toast} />
    </div>
  );
}

