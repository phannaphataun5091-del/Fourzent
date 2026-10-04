-- Fourzent: รันไฟล์นี้ทั้งไฟล์ใน Supabase > SQL Editor
create extension if not exists pgcrypto;

-- ========== ตาราง ==========
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'Fourzent',
  tagline text default '',
  cover_url text,
  gif_url text,
  music_url text,
  music_title text default '',
  accent_color text not null default '#2F80ED',
  reviews_open boolean not null default true,
  footer_text text default '',
  contacts jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;

create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  customer_name text default '',
  detail text default '',
  image_url text,
  credit_date date default current_date,
  is_visible boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'ไม่ระบุชื่อ' check (char_length(name) <= 60),
  rating int not null check (rating between 1 and 5),
  message text not null default '' check (char_length(message) <= 1000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  url text not null,
  created_at timestamptz default now()
);

create trigger trg_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger trg_credits_updated before update on public.credits
  for each row execute function public.set_updated_at();
create trigger trg_reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

-- ========== สิทธิ์ (RLS) ==========
alter table public.admins enable row level security;
alter table public.site_settings enable row level security;
alter table public.credits enable row level security;
alter table public.reviews enable row level security;
alter table public.review_images enable row level security;

create policy "admins read own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

create policy "settings public read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "settings admin update" on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "credits read" on public.credits
  for select to anon, authenticated using (is_visible or public.is_admin());
create policy "credits admin write" on public.credits
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ลูกค้า: ดูได้, ส่งใหม่ได้ (ไม่มี update/delete)
create policy "reviews read" on public.reviews
  for select to anon, authenticated using (status = 'visible' or public.is_admin());
create policy "reviews customer insert" on public.reviews
  for insert to anon, authenticated with check (status = 'visible');
create policy "reviews admin write" on public.reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "review images read" on public.review_images
  for select to anon, authenticated using (
    public.is_admin() or exists (select 1 from public.reviews r where r.id = review_id and r.status = 'visible')
  );
-- ลูกค้าแนบรูปได้เฉพาะรีวิวที่เพิ่งส่งใน 10 นาที
create policy "review images customer insert" on public.review_images
  for insert to anon, authenticated with check (
    exists (select 1 from public.reviews r where r.id = review_id and r.created_at > now() - interval '10 minutes')
  );
create policy "review images admin write" on public.review_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ========== ที่เก็บไฟล์ (รูป/เพลง/GIF) ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp4','audio/ogg','audio/wav'])
on conflict (id) do nothing;

create policy "media customer upload to reviews folder" on storage.objects
  for insert to anon, authenticated with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'reviews'
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif')
  );
create policy "media admin all" on storage.objects
  for all to authenticated using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

-- ========== หลังสร้างผู้ใช้แอดมินแล้ว (Authentication > Users > Add user) ==========
-- insert into public.admins (user_id) select id from auth.users where email = 'อีเมลแอดมิน';
