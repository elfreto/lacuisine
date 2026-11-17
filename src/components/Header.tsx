import { BookOpen, CalendarDays, ChefHat, Moon, ShieldCheck, Sun, ShoppingCart, type LucideIcon } from 'lucide-react';
import type { Tab } from '../types';

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'recettes', label: 'Recettes', icon: BookOpen },
  { id: 'planning', label: 'Planning', icon: CalendarDays },
  { id: 'courses', label: 'Courses', icon: ShoppingCart },
  { id: 'reserve', label: 'Réserve', icon: ShieldCheck },
];

/** `alerts` : onglets dont le compteur signale un problème (badge rouge). */
export function Header({
  tab,
  onTab,
  counts,
  alerts = [],
  theme,
  onTheme,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  counts: Record<Tab, number>;
  alerts?: Tab[];
  theme: 'light' | 'dark';
  onTheme: () => void;
}) {
  return (
    <>
      <header className="no-print sticky z-30 border-b border-black/5 bg-header/95 text-header-ink backdrop-blur dark:border-line" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="gutter mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-peach dark:bg-accent dark:text-accent-ink">
              <ChefHat size={22} />
            </span>
            <div className="leading-tight">
              <p className="font-display text-lg font-bold">La cuisine de Anne-Cécile</p>
              <p className="hidden text-xs text-header-muted sm:block">Recettes, menus, courses et réserve</p>
            </div>
          </div>
          <nav className="ml-auto hidden gap-1 rounded-2xl bg-white/35 p-1 md:flex dark:bg-sunken" aria-label="Sections">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm lg:px-4 font-semibold transition ${
                  tab === id ? 'bg-surface text-ink shadow-sm' : 'text-header-muted hover:text-header-ink'
                }`}
              >
                <Icon size={16} />
                {label}
                {counts[id] > 0 && (
                  <span className={`rounded-full px-1.5 text-xs tabular-nums ${alerts.includes(id) ? 'bg-tomato text-white' : tab === id ? 'bg-accent text-accent-ink' : 'bg-black/10 text-header-ink dark:bg-line dark:text-muted'}`}>
                    {counts[id]}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <button
            className="icon-btn shrink-0 text-header-muted hover:bg-white/30 hover:text-header-ink dark:hover:bg-sunken"
            onClick={onTheme}
            aria-label={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
            title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Navigation mobile en bas d'écran */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Sections"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-xs font-semibold ${tab === id ? 'text-accent' : 'text-muted'}`}
          >
            <span className="relative">
              <Icon size={22} />
              {counts[id] > 0 && (
                <span className={`absolute -right-3 -top-1.5 rounded-full px-1.5 text-[10px] leading-4 tabular-nums ${alerts.includes(id) ? 'bg-tomato text-white' : 'bg-accent text-accent-ink'}`}>
                  {counts[id]}
                </span>
              )}
            </span>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
