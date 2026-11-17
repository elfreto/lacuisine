import { useCallback, useEffect, useRef, useState } from 'react';
import type { NewWish, WishItem } from '../types';
import { wishStore } from './wishStore';

const POLL_MS = 15_000;

/** Liste de souhaits, rafraîchie régulièrement et au retour sur l'onglet pour voir les ajouts des autres. */
export function useWishes() {
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const items = await wishStore.list();
      if (alive.current) {
        setWishes(items);
        setError(null);
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Liste de souhaits indisponible.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh();
    const timer = window.setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      alive.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  /** Exécute une écriture puis recharge la liste ; renvoie false en cas d'échec. */
  const run = useCallback(
    async (op: () => Promise<unknown>) => {
      try {
        await op();
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'L’opération a échoué.');
        return false;
      }
    },
    [refresh],
  );

  return {
    wishes,
    loading,
    error,
    shared: wishStore.shared,
    refresh,
    add: (w: NewWish) => run(() => wishStore.add(w)),
    validate: (ids: string[]) => run(() => wishStore.update(ids, { status: 'validated', validatedAt: Date.now() })),
    remove: (ids: string[]) => run(() => wishStore.remove(ids)),
  };
}
