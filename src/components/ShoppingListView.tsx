import { useMemo, useState } from 'react';
import { CalendarDays, Check, Copy, Download, Eye, EyeOff, FileSpreadsheet, Printer, RefreshCw, RotateCcw, ShoppingCart, Trash2, Undo2 } from 'lucide-react';
import type { ShoppingList } from '../types';
import { groupByCategory } from '../lib/shopping';
import { formatAmounts } from '../lib/units';
import { isReserveKey } from '../lib/reserve';
import { isWishKey } from '../lib/wishes';
import { downloadText, shoppingListToText } from '../lib/exportText';
import { CategoryIcon, EmptyState } from './ui';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export function ShoppingListView({
  list,
  checked,
  stale,
  allowDownloads,
  onToggle,
  onReset,
  onRemove,
  onRestore,
  onClear,
  onRegenerate,
  onGoPlanning,
  notify,
}: {
  list: ShoppingList | null;
  checked: Record<string, boolean>;
  stale: boolean;
  allowDownloads: boolean;
  onToggle: (key: string) => void;
  onReset: () => void;
  onRemove: (keys: string[]) => void;
  onRestore: () => void;
  onClear: () => void;
  onRegenerate: () => void;
  onGoPlanning: () => void;
  notify: (msg: string) => void;
}) {
  const [hideDone, setHideDone] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const removedCount = list?.removed?.length ?? 0;
  const groups = useMemo(() => (list ? groupByCategory(list.items) : []), [list]);

  if (!list || !list.items.length) {
    return (
      <EmptyState icon={ShoppingCart} title="Pas encore de liste de courses" text="Composez votre menu dans le planning, puis cliquez sur « Générer la liste de courses » : les ingrédients sont additionnés et rangés par rayon.">
        <button className="btn-primary" onClick={onGoPlanning}><CalendarDays size={16} /> Ouvrir le planning</button>
        {removedCount > 0 && (
          <button className="btn-secondary" onClick={onRestore}><Undo2 size={16} /> Rétablir {removedCount} article(s) supprimé(s)</button>
        )}
      </EmptyState>
    );
  }

  const total = list.items.length;
  const done = list.items.filter((i) => checked[i.key]).length;
  const reserveCount = list.items.filter((i) => isReserveKey(i.key)).length;
  const wishCount = list.items.filter((i) => isWishKey(i.key)).length;
  const origin = [
    list.mealCount ? `${list.mealCount} repas` : '',
    reserveCount ? `${reserveCount} article${reserveCount > 1 ? 's' : ''} de réserve` : '',
    wishCount ? `${wishCount} souhait${wishCount > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' + ');
  const title = `Liste de courses · ${origin}`;
  const text = () => shoppingListToText(list.items, checked, title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      notify('Liste copiée dans le presse-papiers');
    } catch {
      notify('Copie impossible sur cet appareil');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="print-only">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>La cuisine de Anne-Cécile · {title}</h1>
        <p style={{ marginBottom: 12 }}>{dateFmt.format(list.generatedAt)}</p>
      </div>

      <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Liste de courses</h2>
          <p className="text-sm text-muted">Générée {dateFmt.format(list.generatedAt)} pour {origin}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={copy}><Copy size={16} /> Copier</button>
          {allowDownloads && (
            <>
              <button className="btn-secondary" onClick={() => downloadText(text(), 'liste-de-courses.txt')}><Download size={16} /> .txt</button>
              <button className="btn-secondary" onClick={() => import('../lib/excel').then((m) => m.exportShoppingListXlsx(list.items, checked))}><FileSpreadsheet size={16} /> Excel</button>
              <button className="btn-secondary" onClick={() => window.print()}><Printer size={16} /> Imprimer</button>
            </>
          )}
        </div>
      </div>

      {stale && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sun/50 bg-sun/15 px-4 py-3 text-sm text-sun-ink">
          <span>Le menu a changé depuis la création de cette liste.</span>
          <button className="btn-secondary py-1.5" onClick={onRegenerate}><RefreshCw size={16} /> Mettre à jour</button>
        </div>
      )}

      <div className="no-print panel flex flex-wrap items-center gap-4 p-4">
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">{done === total ? 'Tout est dans le panier !' : `${done} sur ${total} articles achetés`}</span>
            <span className="tabular-nums text-muted">{Math.round((done / total) * 100)} %</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <button className="btn-ghost whitespace-nowrap px-3 py-1.5" onClick={() => setHideDone((v) => !v)}>
            {hideDone ? <Eye size={16} /> : <EyeOff size={16} />} {hideDone ? 'Afficher les achetés' : 'Masquer les achetés'}
          </button>
          <button className="btn-ghost whitespace-nowrap px-3 py-1.5" onClick={onReset} disabled={!done}><RotateCcw size={16} /> Tout décocher</button>
          <button
            className="btn-ghost whitespace-nowrap px-3 py-1.5 hover:text-tomato"
            onClick={() => onRemove(list.items.filter((i) => checked[i.key]).map((i) => i.key))}
            disabled={!done}
          >
            <Trash2 size={16} /> Supprimer les achetés
          </button>
          {confirmClear ? (
            <span className="flex items-center gap-1 text-sm">
              Vider toute la liste ?
              <button className="btn-ghost px-3 py-1.5" onClick={() => setConfirmClear(false)}>Non</button>
              <button className="btn-danger px-3 py-1.5" onClick={() => { onClear(); setConfirmClear(false); }}>Vider</button>
            </span>
          ) : (
            <button className="btn-ghost whitespace-nowrap px-3 py-1.5 hover:text-tomato" onClick={() => setConfirmClear(true)}><Trash2 size={16} /> Vider la liste</button>
          )}
        </div>
      </div>

      {removedCount > 0 && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-sunken px-4 py-2.5 text-sm">
          <span className="text-muted">
            {removedCount === 1 ? `« ${list.removed![0].name} » a été retiré de la liste.` : `${removedCount} articles ont été retirés de la liste.`}
          </span>
          <button className="btn-ghost px-3 py-1.5" onClick={onRestore}><Undo2 size={16} /> Rétablir</button>
        </div>
      )}

      <div className="columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4">
        {groups.map(([cat, items]) => {
          const visible = hideDone ? items.filter((i) => !checked[i.key]) : items;
          const left = items.filter((i) => !checked[i.key]).length;
          if (!visible.length) return null;
          return (
            <section key={cat} className="panel break-inside-avoid overflow-hidden">
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <CategoryIcon category={cat} />
                <h3 className="flex-1 font-display font-bold">{cat}</h3>
                <span className="text-xs tabular-nums text-muted">{left ? `${left} à prendre` : 'fait'}</span>
              </header>
              <ul className="divide-y divide-line">
                {visible.map((item) => {
                  const isDone = !!checked[item.key];
                  return (
                    <li key={item.key} className="flex items-stretch transition hover:bg-sunken/60">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 py-3 pl-4 pr-2">
                        <input type="checkbox" className="peer sr-only" checked={isDone} onChange={() => onToggle(item.key)} />
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
                            isDone ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface'
                          }`}
                          aria-hidden
                        >
                          {isDone && <Check size={14} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className={`font-medium ${isDone ? 'text-muted line-through' : ''}`}>{item.name}</span>
                            <span className={`text-sm font-semibold tabular-nums ${isDone ? 'text-muted line-through' : 'text-accent'}`}>{formatAmounts(item.amounts)}</span>
                          </span>
                          <span className="block truncate text-xs text-muted">{item.sources.join(' · ')}</span>
                        </span>
                      </label>
                      <button
                        className="icon-btn no-print mr-2 self-center hover:text-tomato"
                        onClick={() => onRemove([item.key])}
                        aria-label={`Supprimer ${item.name} de la liste`}
                        title="Supprimer de la liste"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
