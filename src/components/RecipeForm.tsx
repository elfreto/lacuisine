import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CATEGORIES, type Category, type Recipe } from '../types';
import { uid } from '../lib/id';
import { parseQuantity } from '../lib/text';
import { COMMON_UNITS } from '../lib/units';
import { Modal } from './ui';

interface DraftIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: Category | '';
}

const emptyIngredient = (): DraftIngredient => ({ id: uid(), name: '', quantity: '', unit: 'g', category: '' });

export function RecipeForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Recipe;
  onSave: (recipe: Recipe) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [servings, setServings] = useState(String(initial?.servings ?? 4));
  const [prepTime, setPrepTime] = useState(initial?.prepTime ? String(initial.prepTime) : '');
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(
    initial?.ingredients.length
      ? initial.ingredients.map((i) => ({ ...i, quantity: i.quantity ? String(i.quantity).replace('.', ',') : '' }))
      : [emptyIngredient()],
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const update = (id: string, patch: Partial<DraftIngredient>) =>
    setIngredients((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs: string[] = [];
    const serv = Number(servings);
    if (!name.trim()) errs.push('Donnez un nom à la recette.');
    if (!Number.isFinite(serv) || serv < 1) errs.push('Le nombre de portions doit être au moins 1.');
    const filled = ingredients.filter((i) => i.name.trim());
    if (!filled.length) errs.push('Ajoutez au moins un ingrédient.');
    filled.forEach((i) => {
      if (!i.category) errs.push(`Choisissez une catégorie pour « ${i.name.trim()} ».`);
      const q = parseQuantity(i.quantity).value;
      if (Number.isNaN(q) || q < 0) errs.push(`Quantité invalide pour « ${i.name.trim()} » (ex. 200 ou 1,5).`);
    });
    setErrors(errs);
    if (errs.length) return;

    const now = Date.now();
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      servings: Math.round(serv),
      prepTime: Number(prepTime) > 0 ? Math.round(Number(prepTime)) : undefined,
      instructions: instructions.trim(),
      ingredients: filled.map((i) => ({
        id: i.id,
        name: i.name.trim(),
        quantity: parseQuantity(i.quantity).value || 0,
        unit: i.unit.trim(),
        category: i.category as Category,
      })),
      rating: initial?.rating,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  };

  return (
    <Modal
      title={initial ? 'Modifier la recette' : 'Nouvelle recette'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="recipe-form" className="btn-primary">
            {initial ? 'Enregistrer' : 'Ajouter la recette'}
          </button>
        </>
      }
    >
      <form id="recipe-form" onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_auto_auto]">
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="r-name">Nom de la recette</label>
            <input id="r-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Gratin dauphinois" autoFocus />
          </div>
          <div className="sm:w-32">
            <label className="label" htmlFor="r-serv">Portions</label>
            <input id="r-serv" type="number" min={1} className="field tabular-nums" value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>
          <div className="sm:w-36">
            <label className="label" htmlFor="r-time">Préparation (min)</label>
            <input id="r-time" type="number" min={0} className="field tabular-nums" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="30" />
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-bold">Ingrédients</h3>
            <p className="text-xs text-muted">Quantités pour {servings || '…'} portion(s)</p>
          </div>
          <div className="hidden grid-cols-[1fr_6rem_8rem_12rem_2.25rem] gap-2 px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
            <span>Ingrédient</span><span>Quantité</span><span>Unité</span><span>Catégorie</span><span />
          </div>
          <ul className="flex flex-col gap-3 md:gap-2">
            {ingredients.map((ing, idx) => {
              const missingCat = submitted && ing.name.trim() && !ing.category;
              return (
                <li key={ing.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl bg-sunken p-3 md:grid-cols-[1fr_6rem_8rem_12rem_2.25rem] md:bg-transparent md:p-0">
                  <input
                    className="field col-span-2 md:col-span-1"
                    placeholder={idx === 0 ? 'Ex. Pommes de terre' : 'Ingrédient'}
                    value={ing.name}
                    aria-label="Nom de l'ingrédient"
                    onChange={(e) => update(ing.id, { name: e.target.value })}
                  />
                  <div className="col-span-2 grid grid-cols-2 gap-2 md:contents">
                    <input
                      className="field tabular-nums"
                      inputMode="decimal"
                      placeholder="200"
                      value={ing.quantity}
                      aria-label="Quantité"
                      onChange={(e) => update(ing.id, { quantity: e.target.value })}
                    />
                    <input
                      className="field"
                      list="units"
                      placeholder="g"
                      value={ing.unit}
                      aria-label="Unité"
                      onChange={(e) => update(ing.id, { unit: e.target.value })}
                    />
                  </div>
                  <select
                    className={`field ${missingCat ? 'border-tomato ring-2 ring-tomato/25' : ''} ${ing.category ? '' : 'text-muted'}`}
                    value={ing.category}
                    aria-label="Catégorie"
                    required
                    onChange={(e) => update(ing.id, { category: e.target.value as Category })}
                  >
                    <option value="" disabled>Catégorie…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="icon-btn self-center hover:text-tomato"
                    onClick={() => setIngredients((l) => (l.length > 1 ? l.filter((i) => i.id !== ing.id) : [emptyIngredient()]))}
                    aria-label="Retirer l'ingrédient"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
          <datalist id="units">
            {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
          </datalist>
          <button type="button" className="btn-ghost mt-2 -ml-2" onClick={() => setIngredients((l) => [...l, emptyIngredient()])}>
            <Plus size={16} /> Ajouter un ingrédient
          </button>
        </section>

        <div>
          <label className="label" htmlFor="r-instr">Instructions</label>
          <textarea
            id="r-instr"
            className="field min-h-[120px] leading-relaxed"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Une étape par ligne"
          />
        </div>

        {errors.length > 0 && (
          <ul className="rounded-2xl border border-tomato/30 bg-tomato/10 px-4 py-3 text-sm text-tomato" role="alert">
            {errors.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        )}
      </form>
    </Modal>
  );
}
