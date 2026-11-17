import { useEffect, type ReactNode } from 'react';
import { Minus, Plus, X, type LucideIcon } from 'lucide-react';
import type { Category } from '../types';
import { CATEGORY_META } from '../lib/categories';

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <footer
            className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-3 rounded-full bg-accent-soft" />
        <Icon className="relative text-accent" size={40} strokeWidth={1.6} />
      </div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-muted">{text}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function CategoryIcon({ category, size = 16 }: { category: Category; size?: number }) {
  const { icon: Icon, tone } = CATEGORY_META[category];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-lg ${tone}`} style={{ width: size + 14, height: size + 14 }} title={category}>
      <Icon size={size} />
    </span>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v) || min)));
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-surface" role="group" aria-label={label}>
      <button type="button" className="icon-btn h-9 w-9" onClick={() => set(value - 1)} disabled={value <= min} aria-label="Diminuer">
        <Minus size={16} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        className="w-10 bg-transparent text-center font-semibold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        value={value}
        min={min}
        max={max}
        aria-label={label}
        onChange={(e) => set(Number(e.target.value))}
      />
      <button type="button" className="icon-btn h-9 w-9" onClick={() => set(value + 1)} disabled={value >= max} aria-label="Augmenter">
        <Plus size={16} />
      </button>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="no-print pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
      role="status"
    >
      <div className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg shadow-lg">{message}</div>
    </div>
  );
}
