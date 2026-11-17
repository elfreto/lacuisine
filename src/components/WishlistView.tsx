import { useState, type FormEvent } from 'react';
import { AlertTriangle, Check, CloudOff, Gift, ListChecks, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { CATEGORIES, type Category, type NewWish, type WishItem } from '../types';
import { COMMON_UNITS, formatIngredientQuantity } from '../lib/units';
import { parseQuantity } from '../lib/text';
import { useLocalStorage } from '../lib/storage';
import { CategoryIcon, EmptyState } from './ui';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function WishlistView({
  wishes,
  loading,
  error,
  shared,
  onAdd,
  onValidate,
  onRemove,
  onRefresh,
}: {
  wishes: WishItem[];
  loading: boolean;
  error: string | null;
  shared: boolean;
  onAdd: (w: NewWish) => Promise<boolean>;
  onValidate: (items: WishItem[]) => Promise<void>;
  onRemove: (ids: string[]) => Promise<boolean>;
  onRefresh: () => void;
}) {
  const [author, setAuthor] = useLocalStorage<string>('wishAuthor', '');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<Category>('Autres');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmValidate, setConfirmValidate] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const pending = wishes.filter((w) => w.status === 'pending');
  const validated = wishes.filter((w) => w.status === 'validated').sort((a, b) => (b.validatedAt ?? 0) - (a.validatedAt ?? 0));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = parseQuantity(quantity).value;
    if (!name.trim()) return setFormError('Indiquez ce que vous souhaitez.');
    if (Number.isNaN(q) || q < 0) return setFormError('Quantité invalide (ex. 2 ou 1,5).');
    setFormError(null);
    setBusy(true);
    const ok = await onAdd({ name: name.trim().slice(0, 120), quantity: q || undefined, unit: unit.trim() || undefined, category, author: author.trim().slice(0, 40) || undefined, note: note.trim().slice(0, 200) || undefined });
    setBusy(false);
    if (ok) {
      setName('');
      setQuantity('');
      setUnit('');
      setNote('');
    }
  };

  const validateAll = async () => {
    setBusy(true);
    await onValidate(pending);
    setBusy(false);
    setConfirmValidate(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      {/* Formulaire d'ajout */}
      <aside className="flex min-w-0 flex-col gap-4 self-start lg:sticky lg:top-24">
        <div>
          <h2 className="font-display text-2xl font-bold">Souhaits</h2>
          <p className="mt-1 flex items-start gap-2 text-sm text-muted">
            {shared ? (
              <><Users size={16} className="mt-0.5 shrink-0" /> Liste partagée : tous ceux qui utilisent l’application voient et complètent les mêmes souhaits.</>
            ) : (
              <><CloudOff size={16} className="mt-0.5 shrink-0" /> Liste enregistrée sur cet appareil uniquement (partage non configuré).</>
            )}
          </p>
        </div>
        <form onSubmit={submit} className="panel flex flex-col gap-3 p-4" noValidate>
          <div>
            <label className="label" htmlFor="w-name">Je souhaite</label>
            <input id="w-name" className="field" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Ex. Yaourts à la fraise" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="w-qty">Quantité</label>
              <input id="w-qty" className="field tabular-nums" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="facultatif" />
            </div>
            <div>
              <label className="label" htmlFor="w-unit">Unité</label>
              <input id="w-unit" className="field" maxLength={30} list="wish-units" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pièce(s)" />
              <datalist id="wish-units">{COMMON_UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="w-cat">Rayon</label>
            <select id="w-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="w-author">Votre prénom</label>
              <input id="w-author" className="field" value={author} maxLength={40} onChange={(e) => setAuthor(e.target.value)} placeholder="Ex. Léa" />
            </div>
            <div>
              <label className="label" htmlFor="w-note">Précision</label>
              <input id="w-note" className="field" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="marque, goût…" />
            </div>
          </div>
          {formError && <p className="text-sm text-tomato" role="alert">{formError}</p>}
          <button type="submit" className="btn-primary" disabled={busy}><Plus size={16} /> Ajouter à la liste</button>
        </form>
      </aside>

      {/* Liste */}
      <section className="flex min-w-0 flex-col gap-4">
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tomato/30 bg-tomato/10 px-4 py-3 text-sm text-tomato" role="alert">
            <span className="flex items-center gap-2"><AlertTriangle size={18} /> {error}</span>
            <button className="btn-secondary py-1.5" onClick={onRefresh}><RefreshCw size={16} /> Réessayer</button>
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold">À valider</h3>
            <p className="text-sm text-muted">{pending.length ? `${pending.length} souhait(s) en attente` : 'Aucun souhait en attente'}</p>
          </div>
          {pending.length > 0 && (
            confirmValidate ? (
              <span className="flex flex-wrap items-center gap-1 text-sm">
                Envoyer {pending.length} article(s) dans la liste de courses ?
                <button className="btn-ghost px-3 py-1.5" onClick={() => setConfirmValidate(false)}>Non</button>
                <button className="btn-primary px-3 py-1.5" disabled={busy} onClick={validateAll}><Check size={16} /> Valider</button>
              </span>
            ) : (
              <button className="btn-primary" onClick={() => setConfirmValidate(true)}><ListChecks size={18} /> Valider la liste</button>
            )
          )}
        </div>

        {loading && !wishes.length ? (
          <p className="py-10 text-center text-muted">Chargement des souhaits…</p>
        ) : pending.length === 0 ? (
          <EmptyState icon={Gift} title="Pas de souhait pour le moment" text="Chacun peut proposer ce qu’il aimerait qu’on achète. Une fois la liste validée, les articles passent dans la liste de courses." />
        ) : (
          <ul className="panel divide-y divide-line">
            {pending.map((w) => (
              <WishRow key={w.id} wish={w} onRemove={() => onRemove([w.id])} />
            ))}
          </ul>
        )}

        {validated.length > 0 && (
          <details className="panel">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
              <span className="font-semibold">Déjà validés ({validated.length})</span>
              <span className="text-xs text-muted">Envoyés dans la liste de courses</span>
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {validated.map((w) => (
                <WishRow key={w.id} wish={w} onRemove={() => onRemove([w.id])} muted />
              ))}
            </ul>
            <div className="flex justify-end border-t border-line px-3 py-2">
              {confirmPurge ? (
                <span className="flex items-center gap-1 text-sm">
                  Effacer l’historique ?
                  <button className="btn-ghost px-3 py-1.5" onClick={() => setConfirmPurge(false)}>Non</button>
                  <button className="btn-danger px-3 py-1.5" onClick={async () => { await onRemove(validated.map((w) => w.id)); setConfirmPurge(false); }}>Effacer</button>
                </span>
              ) : (
                <button className="btn-ghost px-3 py-1.5 hover:text-tomato" onClick={() => setConfirmPurge(true)}><Trash2 size={16} /> Effacer l’historique</button>
              )}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}

function WishRow({ wish: w, onRemove, muted = false }: { wish: WishItem; onRemove: () => void; muted?: boolean }) {
  const meta = [w.author ? `par ${w.author}` : '', muted && w.validatedAt ? `validé le ${dateFmt.format(w.validatedAt)}` : dateFmt.format(w.createdAt)].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <CategoryIcon category={w.category} size={14} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className={`font-medium ${muted ? 'text-muted' : ''}`}>{w.name}</span>
          {w.quantity ? <span className="text-sm font-semibold tabular-nums text-accent">{formatIngredientQuantity(w.quantity, w.unit ?? '')}</span> : null}
        </div>
        <p className="truncate text-xs text-muted">{[w.note, meta].filter(Boolean).join(' · ')}</p>
      </div>
      <button className="icon-btn hover:text-tomato" onClick={onRemove} aria-label={`Supprimer ${w.name}`} title="Supprimer">
        <Trash2 size={16} />
      </button>
    </li>
  );
}
