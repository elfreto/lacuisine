import { Fragment, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Minus, PackageCheck, Pencil, Plus, RotateCcw, ShieldCheck, ShoppingCart, X } from 'lucide-react';
import { CATEGORIES, RESERVE_SECTIONS, type Category, type ReserveItem } from '../types';
import { isLow, round, suggestedToBuy, toBuyOf } from '../lib/reserve';
import { COMMON_UNITS } from '../lib/units';
import { formatNumber } from '../lib/text';
import { Modal } from './ui';

const parse = (s: string): number => {
  const n = Number(s.replace(',', '.').trim());
  return Number.isFinite(n) && n >= 0 ? round(n) : NaN;
};

/** Regroupe les articles par sous-groupe en gardant l'ordre de première apparition. */
const groupRows = (rows: ReserveItem[]): ReserveItem[] => {
  const order = [...new Set(rows.map((r) => r.group ?? ''))];
  return order.flatMap((g) => rows.filter((r) => (r.group ?? '') === g));
};

/** Champ numérique tolérant la virgule, avec boutons − / + facultatifs. */
function NumField({
  value,
  onChange,
  label,
  steppers = false,
  tone = '',
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  steppers?: boolean;
  tone?: string;
}) {
  const [text, setText] = useState(formatNumber(value));
  useEffect(() => {
    if (parse(text) !== value) setText(formatNumber(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const set = (v: number) => onChange(Math.max(0, round(v)));
  return (
    <div className={`inline-flex h-9 items-center rounded-xl border border-line bg-surface ${tone}`} role="group" aria-label={label}>
      {steppers && (
        <button type="button" className="icon-btn h-9 w-7 sm:w-8" onClick={() => set(value - 1)} disabled={value <= 0} aria-label={`${label} : diminuer`}>
          <Minus size={14} />
        </button>
      )}
      <input
        inputMode="decimal"
        className={`w-10 sm:w-12 bg-transparent text-center text-sm font-semibold tabular-nums focus:outline-none ${steppers ? '' : 'px-2'}`}
        value={text}
        aria-label={label}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setText(e.target.value);
          const n = parse(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        onBlur={() => setText(formatNumber(value))}
      />
      {steppers && (
        <button type="button" className="icon-btn h-9 w-7 sm:w-8" onClick={() => set(value + 1)} aria-label={`${label} : augmenter`}>
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} aria-label={label} />
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
          checked ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface'
        }`}
        aria-hidden
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
    </label>
  );
}

export function ReserveView({
  items,
  selected,
  onSave,
  onUpdate,
  onToggle,
  onSelect,
  onClearSelection,
  onSendToList,
  onRestock,
}: {
  items: ReserveItem[];
  selected: Record<string, boolean>;
  onSave: (item: ReserveItem) => void;
  onUpdate: (id: string, patch: Partial<ReserveItem>) => void;
  onToggle: (id: string) => void;
  onSelect: (ids: string[], value: boolean) => void;
  onClearSelection: () => void;
  onSendToList: (items: ReserveItem[]) => void;
  onRestock: (items: ReserveItem[]) => void;
}) {
  const [editing, setEditing] = useState<ReserveItem | null>(null);
  const low = useMemo(() => items.filter(isLow), [items]);
  const chosen = items.filter((i) => selected[i.id]);
  const chosenToBuy = chosen.filter((i) => toBuyOf(i) > 0);

  const dialog = editing && (
    <ReserveForm initial={editing} onSave={(i) => { onSave(i); setEditing(null); }} onClose={() => setEditing(null)} />
  );

  return (
    <div className="flex flex-col gap-5 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Réserve de survie</h2>
          <p className="text-sm text-muted">
            Les {items.length} articles recommandés par l’OFAE · saisissez votre stock, cochez ce qu’il faut racheter
          </p>
        </div>
      </div>

      {low.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-tomato/30 bg-tomato/10 px-4 py-3 text-sm" role="alert">
          <AlertTriangle size={20} className="shrink-0 text-tomato" />
          <p className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto">
            <span className="font-semibold text-tomato">
              {low.length} article{low.length > 1 ? 's' : ''} sous le seuil d’alerte :
            </span>{' '}
            {low.slice(0, 6).map((i) => i.name).join(', ')}
            {low.length > 6 && ` et ${low.length - 6} autre${low.length > 7 ? 's' : ''}`}
          </p>
          <button className="btn-secondary py-1.5" onClick={() => onSelect(low.map((i) => i.id), true)}>Sélectionner ces articles</button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-sage/40 bg-sage/15 px-4 py-3 text-sm">
          <ShieldCheck size={20} className="shrink-0 text-sage-ink" />
          <span>Tous les stocks sont au-dessus de leur seuil d’alerte.</span>
        </div>
      )}

      {RESERVE_SECTIONS.map((sec) => {
        const rows = groupRows(items.filter((i) => i.section === sec.id));
        const allOn = rows.length > 0 && rows.every((i) => selected[i.id]);
        return (
          <section key={sec.id} className="panel overflow-hidden">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-2 py-2 sm:px-3">
              <Checkbox
                checked={allOn}
                onChange={() => onSelect(rows.map((i) => i.id), !allOn)}
                label={`Tout sélectionner : ${sec.label}`}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-bold">{sec.label}</h3>
                <p className="text-xs text-muted">{sec.hint}</p>
              </div>
            </header>

            {rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">Aucun article dans cette partie.</p>
            ) : (
              <>
                <div className="hidden grid-cols-[2.25rem_minmax(0,1fr)_6rem_8rem_8.5rem_2.25rem] items-center gap-3 border-b border-line bg-sunken/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
                  <span />
                  <span>Désignation</span>
                  <span className="text-center">Prévu</span>
                  <span className="text-center">En stock</span>
                  <span className="text-center">À acheter</span>
                  <span />
                </div>
                <ul className="divide-y divide-line">
                  {rows.map((item, idx) => (
                    <Fragment key={item.id}>
                    {item.group && item.group !== rows[idx - 1]?.group && (
                      <li className="bg-sunken/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted md:pl-[3.75rem]">{item.group}</li>
                    )}
                    <ReserveRow
                      key={item.id}
                      item={item}
                      selected={!!selected[item.id]}
                      onToggle={() => onToggle(item.id)}
                      onUpdate={(patch) => onUpdate(item.id, patch)}
                      onEdit={() => setEditing(item)}
                    />
                    </Fragment>
                  ))}
                </ul>
              </>
            )}
          </section>
        );
      })}

      {chosen.length > 0 && (
        <div
          className="no-print fixed inset-x-0 z-20 flex justify-center px-4"
          style={{ bottom: 'calc(var(--bottom-nav, 0px) + 1rem)' }}
        >
          <div className="flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2 pl-4 shadow-xl">
            <span className="min-w-0 flex-1 basis-[calc(100%-3rem)] text-sm sm:basis-auto">
              <span className="font-semibold">{chosen.length} sélectionné{chosen.length > 1 ? 's' : ''}</span>
              <span className="text-muted"> · {chosenToBuy.length} à acheter</span>
            </span>
            <button className="icon-btn" onClick={onClearSelection} aria-label="Tout désélectionner" title="Tout désélectionner"><X size={18} /></button>
            <button className="btn-secondary flex-1 py-2 sm:flex-none" disabled={!chosenToBuy.length} onClick={() => onRestock(chosenToBuy)} title="Ajoute la quantité à acheter au stock">
              <PackageCheck size={16} /> <span className="sm:hidden">Acheté</span><span className="hidden sm:inline">Marquer acheté</span>
            </button>
            <button className="btn-primary flex-1 py-2 sm:flex-none" disabled={!chosenToBuy.length} onClick={() => onSendToList(chosenToBuy)}>
              <ShoppingCart size={16} /> <span className="sm:hidden">Vers les courses</span><span className="hidden sm:inline">Ajouter à la liste de courses</span>
            </button>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}

function ReserveRow({
  item,
  selected,
  onToggle,
  onUpdate,
  onEdit,
}: {
  item: ReserveItem;
  selected: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<ReserveItem>) => void;
  onEdit: () => void;
}) {
  const low = isLow(item);
  const toBuy = toBuyOf(item);
  const custom = item.toBuy !== undefined && item.toBuy !== suggestedToBuy(item);
  const unit = item.unit.trim();

  return (
    <li
      className={`grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-x-3 gap-y-2 px-2 py-3 sm:px-3 md:grid-cols-[2.25rem_minmax(0,1fr)_6rem_8rem_8.5rem_2.25rem] ${
        selected ? 'bg-sage/15' : ''
      }`}
    >
      <Checkbox checked={selected} onChange={onToggle} label={`Sélectionner ${item.name}`} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          <span>{item.name}</span>
          {low && (
            <span className="inline-flex items-center gap-1 rounded-full bg-tomato/15 px-2 py-0.5 text-xs font-semibold text-tomato">
              <AlertTriangle size={12} /> Stock bas
            </span>
          )}
        </p>
        {item.note && <p className="text-sm text-muted">{item.note}</p>}
        <p className="text-xs text-muted">
          {unit || 'sans unité'} · {item.threshold > 0 ? `alerte sous ${formatNumber(item.threshold)}` : 'pas de seuil'}
        </p>
      </div>
      <button className="icon-btn md:order-last" onClick={onEdit} aria-label={`Modifier ${item.name}`} title="Modifier">
        <Pencil size={16} />
      </button>

      {/* Quantités : une ligne sous la désignation sur mobile, des colonnes sur grand écran */}
      <div className="col-span-3 col-start-1 grid grid-cols-3 gap-2 pl-1 md:contents">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted md:hidden">Prévu</span>
          <NumField value={item.planned} label={`Quantité prévue de ${item.name}`} onChange={(planned) => onUpdate({ planned, toBuy: undefined })} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted md:hidden">En stock</span>
          <NumField
            value={item.stock}
            steppers
            label={`Stock de ${item.name}`}
            tone={low ? 'border-tomato/60 text-tomato' : ''}
            onChange={(stock) => onUpdate({ stock, toBuy: undefined })}
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted md:hidden">
            À acheter
            {custom && (
              <button className="-my-1 rounded p-0.5 text-accent" onClick={() => onUpdate({ toBuy: undefined })} aria-label={`Revenir à la différence (${formatNumber(suggestedToBuy(item))})`}>
                <RotateCcw size={12} />
              </button>
            )}
          </span>
          <div className="flex items-center gap-1">
            <NumField
              value={toBuy}
              steppers
              label={`Quantité à acheter de ${item.name}`}
              tone={toBuy > 0 ? 'text-accent' : 'text-muted'}
              onChange={(v) => onUpdate({ toBuy: v === suggestedToBuy(item) ? undefined : v })}
            />
            {custom && (
              <button
                className="icon-btn hidden h-7 w-7 md:inline-flex"
                onClick={() => onUpdate({ toBuy: undefined })}
                aria-label={`Revenir à la différence (${formatNumber(suggestedToBuy(item))})`}
                title={`Revenir à prévu − stock (${formatNumber(suggestedToBuy(item))})`}
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function ReserveForm({ initial, onSave, onClose }: { initial: ReserveItem; onSave: (item: ReserveItem) => void; onClose: () => void }) {
  const [unit, setUnit] = useState(initial.unit);
  const [planned, setPlanned] = useState(formatNumber(initial.planned));
  const [stock, setStock] = useState(formatNumber(initial.stock));
  const [threshold, setThreshold] = useState(formatNumber(initial.threshold));
  const [category, setCategory] = useState<Category>(initial.category);
  const [tried, setTried] = useState(false);

  const num = (s: string) => (s.trim() === '' ? 0 : parse(s));
  const values = { planned: num(planned), stock: num(stock), threshold: num(threshold) };
  const invalid = Object.values(values).some(Number.isNaN);

  const submit = () => {
    setTried(true);
    if (invalid) return;
    const changedQty = initial.planned !== values.planned || initial.stock !== values.stock;
    onSave({ ...initial, unit: unit.trim(), ...values, toBuy: changedQty ? undefined : initial.toBuy, category });
  };

  const err = (bad: boolean) => (tried && bad ? 'border-tomato focus:border-tomato focus:ring-tomato/25' : '');

  return (
    <Modal
      title={initial.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={submit}>Enregistrer</button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {initial.note && <p className="text-sm text-muted sm:col-span-2">{initial.note}</p>}
        <div>
          <label className="label" htmlFor="r-planned">Quantité prévue</label>
          <input id="r-planned" inputMode="decimal" className={`field ${err(Number.isNaN(values.planned))}`} value={planned} onChange={(e) => setPlanned(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label" htmlFor="r-stock">Quantité en stock</label>
          <input id="r-stock" inputMode="decimal" className={`field ${err(Number.isNaN(values.stock))}`} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" autoFocus />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="r-threshold">Seuil d’alerte</label>
          <input id="r-threshold" inputMode="decimal" className={`field ${err(Number.isNaN(values.threshold))}`} value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="Vide ou 0 : pas d’alerte" />
          <p className="mt-1.5 text-xs text-muted">Une alerte s’affiche dès que le stock descend sous ce seuil.</p>
        </div>
        <div>
          <label className="label" htmlFor="r-unit">Unité</label>
          <input id="r-unit" className="field" list="r-units" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <datalist id="r-units">{COMMON_UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        </div>
        <div>
          <label className="label" htmlFor="r-cat">Rayon (liste de courses)</label>
          <select id="r-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
