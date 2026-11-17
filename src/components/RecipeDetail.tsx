import { useState } from 'react';
import { CalendarPlus, Clock, Pencil, Users } from 'lucide-react';
import type { Recipe } from '../types';
import { scaleRatio } from '../lib/shopping';
import { formatDuration, formatNumber } from '../lib/text';
import { formatIngredientQuantity } from '../lib/units';
import { CategoryIcon, Modal, Stepper } from './ui';

export function RecipeDetail({
  recipe,
  onClose,
  onEdit,
  onPlan,
}: {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
  onPlan: (people: number) => void;
}) {
  const [people, setPeople] = useState(recipe.servings);
  const ratio = scaleRatio(people, recipe.servings);
  const steps = recipe.instructions.split('\n').map((s) => s.trim()).filter(Boolean);

  return (
    <Modal
      title={recipe.name}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn-secondary" onClick={onEdit}><Pencil size={16} /> Modifier</button>
          <button className="btn-primary" onClick={() => onPlan(people)}><CalendarPlus size={16} /> Ajouter au planning ({people} pers.)</button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        <span className="flex items-center gap-1.5"><Users size={16} /> Recette de base : {recipe.servings} portion(s)</span>
        {formatDuration(recipe.prepTime) && <span className="flex items-center gap-1.5"><Clock size={16} /> {formatDuration(recipe.prepTime)}</span>}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Ajuster pour</p>
          <p className="text-xs text-muted">Quantités × {formatNumber(ratio)} ({people} ÷ {recipe.servings})</p>
        </div>
        <div className="flex items-center gap-2">
          <Stepper value={people} onChange={setPeople} label="Nombre de personnes" />
          <span className="text-sm text-muted">pers.</span>
        </div>
      </div>

      <h3 className="mt-6 font-display text-lg font-bold">Ingrédients</h3>
      <ul className="mt-2 divide-y divide-line">
        {recipe.ingredients.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2.5">
            <CategoryIcon category={i.category} size={14} />
            <span className="min-w-0 flex-1">{i.name}</span>
            <span className="font-semibold tabular-nums">{formatIngredientQuantity(i.quantity * ratio, i.unit)}</span>
          </li>
        ))}
      </ul>

      {steps.length > 0 && (
        <>
          <h3 className="mt-6 font-display text-lg font-bold">Préparation</h3>
          <ol className="mt-3 flex flex-col gap-3">
            {steps.map((s, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken text-xs font-bold tabular-nums">{idx + 1}</span>
                <p className="leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </Modal>
  );
}
