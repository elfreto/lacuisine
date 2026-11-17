-- Table de la liste de souhaits partagée.
-- L'application n'a pas de comptes : la clé publique (anon / publishable) peut lire, ajouter, valider et supprimer.
create table if not exists public.lacuisine_souhaits (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  quantity numeric check (quantity is null or (quantity >= 0 and quantity < 100000)),
  unit text check (unit is null or char_length(unit) <= 30),
  category text not null default 'Autres' check (category in (
    'Légumes', 'Féculents', 'Viandes', 'Poissons & Fruits de mer', 'Produits laitiers',
    'Épicerie & Condiments', 'Fruits', 'Boissons', 'Autres')),
  author text check (author is null or char_length(author) <= 40),
  note text check (note is null or char_length(note) <= 200),
  status text not null default 'pending' check (status in ('pending', 'validated')),
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

alter table public.lacuisine_souhaits enable row level security;

create policy "souhaits lisibles" on public.lacuisine_souhaits for select to anon, authenticated using (true);
create policy "souhaits ajout" on public.lacuisine_souhaits for insert to anon, authenticated with check (status = 'pending');
create policy "souhaits validation" on public.lacuisine_souhaits for update to anon, authenticated using (true) with check (true);
create policy "souhaits suppression" on public.lacuisine_souhaits for delete to anon, authenticated using (true);
