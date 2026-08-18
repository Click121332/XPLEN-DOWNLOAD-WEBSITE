create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size text not null,
  password text not null,
  extension text not null default 'FILE',
  section_id uuid not null references public.sections(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.approved_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  name text not null,
  password text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pending_requests (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('xplane-files', 'xplane-files', true)
on conflict (id) do update set public = true;

alter table public.sections enable row level security;
alter table public.files enable row level security;
alter table public.approved_users enable row level security;
alter table public.pending_requests enable row level security;

create policy "public sections access" on public.sections for all to anon, authenticated using (true) with check (true);
create policy "public files access" on public.files for all to anon, authenticated using (true) with check (true);
create policy "public approved users access" on public.approved_users for all to anon, authenticated using (true) with check (true);
create policy "public pending requests access" on public.pending_requests for all to anon, authenticated using (true) with check (true);
create policy "public file downloads" on storage.objects for select to anon, authenticated using (bucket_id = 'xplane-files');
create policy "public file uploads" on storage.objects for insert to anon, authenticated with check (bucket_id = 'xplane-files');
create policy "public file updates" on storage.objects for update to anon, authenticated using (bucket_id = 'xplane-files') with check (bucket_id = 'xplane-files');
create policy "public file deletes" on storage.objects for delete to anon, authenticated using (bucket_id = 'xplane-files');
