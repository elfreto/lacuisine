import { useRef, useState, type DragEvent } from 'react';
import { AlertTriangle, FileSpreadsheet, Download, Upload } from 'lucide-react';
import { EXPECTED_COLUMNS, type Recipe } from '../types';
import type { ImportResult } from '../lib/excel';
import { normalize } from '../lib/text';
import { Modal } from './ui';

export type ConflictMode = 'replace' | 'keep';

export function ExcelImport({
  existing,
  onImport,
  onClose,
  allowDownloads,
}: {
  existing: Recipe[];
  onImport: (recipes: Recipe[], mode: ConflictMode) => void;
  onClose: () => void;
  allowDownloads: boolean;
}) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ConflictMode>('replace');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const existingNames = new Set(existing.map((r) => normalize(r.name)));
  const conflicts = result?.recipes.filter((r) => existingNames.has(normalize(r.name))) ?? [];

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setResult(null);
    try {
      // SheetJS est chargé à la demande pour alléger le premier affichage.
      const { parseRecipesWorkbook } = await import('../lib/excel');
      setResult(parseRecipesWorkbook(await file.arrayBuffer()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le fichier n’a pas pu être lu.');
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <Modal
      title="Importer un fichier Excel"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" disabled={!result} onClick={() => result && onImport(result.recipes, mode)}>
            <Upload size={16} />
            {result ? `Importer ${result.recipes.length} recette(s)` : 'Importer'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragging ? 'border-accent bg-accent-soft' : 'border-line bg-sunken'
          }`}
        >
          <FileSpreadsheet size={36} className="text-accent" strokeWidth={1.6} />
          <div>
            <p className="font-semibold">{fileName || 'Glissez votre fichier .xlsx ici'}</p>
            <p className="text-sm text-muted">ou choisissez-le sur votre appareil</p>
          </div>
          <button className="btn-secondary" onClick={() => inputRef.current?.click()}>Choisir un fichier</button>
          <input
            ref={inputRef}
            id="excel-file"
            type="file"
            accept=".xlsx,.xls,.ods,.csv"
            className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
          />
        </div>

        {error && (
          <p className="flex gap-2 rounded-2xl border border-tomato/30 bg-tomato/10 px-4 py-3 text-sm text-tomato" role="alert">
            <AlertTriangle size={18} className="shrink-0" /> {error}
          </p>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              <strong>{result.recipes.length} recette(s)</strong> et {result.rowCount} ingrédient(s) trouvés.
            </p>
            <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-2xl border border-line">
              {result.recipes.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-medium">{r.name}</span>
                  <span className="shrink-0 text-muted">
                    {r.ingredients.length} ingr. · {r.servings} pers.
                    {existingNames.has(normalize(r.name)) && <span className="ml-2 rounded-full bg-tomato/15 px-2 py-0.5 text-xs font-semibold text-tomato">existe déjà</span>}
                  </span>
                </li>
              ))}
            </ul>
            {conflicts.length > 0 && (
              <fieldset className="rounded-2xl bg-sunken px-4 py-3 text-sm">
                <legend className="sr-only">Recettes déjà présentes</legend>
                <p className="mb-2 font-semibold">{conflicts.length} recette(s) portent le même nom qu’une recette existante :</p>
                <label className="flex items-center gap-2 py-1">
                  <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} className="accent-[rgb(var(--accent))]" />
                  Remplacer les recettes existantes
                </label>
                <label className="flex items-center gap-2 py-1">
                  <input type="radio" name="mode" checked={mode === 'keep'} onChange={() => setMode('keep')} className="accent-[rgb(var(--accent))]" />
                  Garder les deux versions
                </label>
              </fieldset>
            )}
            {result.warnings.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-2xl border border-sun/50 bg-sun/15 px-4 py-3 text-sm text-sun-ink">
                {result.warnings.map((w) => <li key={w}>• {w}</li>)}
              </ul>
            )}
          </div>
        )}

        <details className="rounded-2xl border border-line px-4 py-3 text-sm" open={!result}>
          <summary className="cursor-pointer font-semibold">Format attendu</summary>
          <p className="mt-2 text-muted">
            Une ligne par ingrédient. Les lignes qui partagent le même nom de recette sont regroupées. Colonnes facultatives : « Temps de préparation (min) », « Instructions ».
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead>
                <tr>{EXPECTED_COLUMNS.map((c) => <th key={c} className="border border-line bg-sunken px-2 py-1.5 font-semibold">{c}</th>)}</tr>
              </thead>
              <tbody className="tabular-nums">
                <tr>{['Poulet basquaise', 'Poivrons', '3', 'pièce(s)', 'Légumes', '4'].map((c, i) => <td key={i} className="border border-line px-2 py-1.5">{c}</td>)}</tr>
                <tr>{['Poulet basquaise', 'Riz basmati', '300', 'g', 'Féculents', '4'].map((c, i) => <td key={i} className="border border-line px-2 py-1.5">{c}</td>)}</tr>
              </tbody>
            </table>
          </div>
          {allowDownloads && (
            <button className="btn-ghost mt-3 -ml-2" onClick={() => import('../lib/excel').then((m) => m.downloadTemplate())}>
              <Download size={16} /> Télécharger le modèle Excel
            </button>
          )}
        </details>
      </div>
    </Modal>
  );
}
