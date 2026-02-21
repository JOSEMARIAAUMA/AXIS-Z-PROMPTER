-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Prompts Table
create table public.prompts (
  id text primary key, -- Changed from uuid to support legacy IDs (cam-1, etc.)
  title text not null,
  category text not null,
  subcategory text,
  content_es text,
  content_en text,
  tags text[] default '{}',
  tags_en text[] default '{}',
  images text[] default '{}',
  apps text[] default '{}',
  area text default 'IMAGE',
  is_favorite boolean default false,
  last_modified bigint not null,
  user_id uuid references auth.users(id)
);

-- 2. Settings Table
create table public.settings (
  id uuid primary key default uuid_generate_v4(),
  panel_widths jsonb,
  theme text,
  updated_at timestamp with time zone default now()
);

-- 3. Compositions Table
create table public.compositions (
  id text primary key, -- Changed to text for compatibility
  title text not null,
  data jsonb not null, 
  categories text[] default '{}',
  apps text[] default '{}',
  area text default 'IMAGE',
  last_modified bigint not null
);

-- 4. Custom Categories Table
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  map jsonb not null,
  updated_at timestamp with time zone default now()
);

-- 5. Helper Tables (App List)
create table public.app_lists (
  id uuid primary key default uuid_generate_v4(),
  apps text[] default '{}',
  updated_at timestamp with time zone default now()
);

-- RLS POLICIES (Development Mode: Public Access)
-- WARNING: In production with real users, you must change this to use auth.uid()

alter table public.prompts enable row level security;
create policy "Allow public read/write prompts" on public.prompts for all using (true) with check (true);

alter table public.settings enable row level security;
create policy "Allow public read/write settings" on public.settings for all using (true) with check (true);

alter table public.compositions enable row level security;
create policy "Allow public read/write compositions" on public.compositions for all using (true) with check (true);

alter table public.categories enable row level security;
create policy "Allow public read/write categories" on public.categories for all using (true) with check (true);

alter table public.app_lists enable row level security;
create policy "Allow public read/write app_lists" on public.app_lists for all using (true) with check (true);
