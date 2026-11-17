import { useEffect, useState } from 'react';

const PREFIX = 'cuisine-ac:';

/** État React synchronisé avec localStorage (tolère un stockage indisponible). */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* stockage plein ou bloqué : l'application continue en mémoire */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
