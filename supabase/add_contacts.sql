-- รันครั้งเดียวใน Supabase > SQL Editor ถ้าเคยรัน schema.sql ไปแล้ว
alter table public.site_settings add column if not exists contacts jsonb not null default '[]'::jsonb;
