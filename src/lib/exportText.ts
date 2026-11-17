import type { ShoppingItem } from '../types';
import { groupByCategory } from './shopping';
import { formatAmounts } from './units';

/** Version texte de la liste, pour le presse-papiers ou un fichier .txt. */
export const shoppingListToText = (items: ShoppingItem[], checked: Record<string, boolean>, title: string): string => {
  const lines = [title, ''];
  for (const [cat, list] of groupByCategory(items)) {
    lines.push(cat.toUpperCase());
    for (const i of list) lines.push(`${checked[i.key] ? '[x]' : '[ ]'} ${i.name} : ${formatAmounts(i.amounts)}`);
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
};

export const downloadText = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
