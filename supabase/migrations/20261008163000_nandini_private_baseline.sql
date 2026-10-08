-- Nandini's independent, initially empty backend. Apply only to a NEW Supabase project.
-- Never copy users, photos, diary rows, saved memories or storage objects from another app.
create table public.diary_entries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 200),
 content text not null check (char_length(content) between 1 and 20000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz
);
create index diary_entries_owner_date on public.diary_entries (user_id, created_at desc);
alter table public.diary_entries enable row level security;
create policy diary_entries_select on public.diary_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy diary_entries_insert on public.diary_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy diary_entries_update on public.diary_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy diary_entries_delete on public.diary_entries for delete to authenticated using ((select auth.uid()) = user_id);

create table public.diary_drafts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 entry_date date not null default current_date,
 mood text not null default '😊' check (char_length(mood) between 1 and 16),
 content text not null default '' check (char_length(content) <= 20000),
 updated_at timestamptz not null default now()
);
alter table public.diary_drafts enable row level security;
create policy diary_drafts_select on public.diary_drafts for select to authenticated using ((select auth.uid()) = user_id);
create policy diary_drafts_insert on public.diary_drafts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy diary_drafts_update on public.diary_drafts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy diary_drafts_delete on public.diary_drafts for delete to authenticated using ((select auth.uid()) = user_id);

create table public.gallery_photos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 path text not null unique,
 caption text not null default 'Photo' check (char_length(caption) between 1 and 120),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz,
 memory_date date,
 is_favorite boolean not null default false
);
create index gallery_photos_owner_date on public.gallery_photos (user_id, created_at desc);
alter table public.gallery_photos enable row level security;
create policy gallery_photos_select on public.gallery_photos for select to authenticated using ((select auth.uid()) = user_id);
create policy gallery_photos_insert on public.gallery_photos for insert to authenticated with check ((select auth.uid()) = user_id and split_part(path, '/', 1) = (select auth.uid())::text);
create policy gallery_photos_update on public.gallery_photos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and split_part(path, '/', 1) = (select auth.uid())::text);
create policy gallery_photos_delete on public.gallery_photos for delete to authenticated using ((select auth.uid()) = user_id);

create table public.together_diary_entries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 author text not null check (author in ('nandini','sambhav')),
 entry_date date not null default current_date,
 mood text not null default '💗' check (char_length(mood) between 1 and 8),
 content text not null check (char_length(content) between 1 and 20000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz
);
create index together_diary_owner_date on public.together_diary_entries (user_id,entry_date desc,created_at desc);
alter table public.together_diary_entries enable row level security;
create policy together_diary_select on public.together_diary_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy together_diary_insert on public.together_diary_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy together_diary_update on public.together_diary_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy together_diary_delete on public.together_diary_entries for delete to authenticated using ((select auth.uid()) = user_id);

create table public.voice_conversation_turns (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('user','assistant')),
 content text not null check (char_length(content) between 1 and 4000),
 source_key text not null,
 is_memory boolean not null default false,
 created_at timestamptz not null default now(),
 unique (user_id,source_key)
);
create index voice_conversation_owner_date on public.voice_conversation_turns (user_id,created_at desc);
create index voice_conversation_owner_memory on public.voice_conversation_turns (user_id,created_at desc) where is_memory = true;
alter table public.voice_conversation_turns enable row level security;
create policy voice_conversation_select on public.voice_conversation_turns for select to authenticated using ((select auth.uid()) = user_id);
create policy voice_conversation_insert on public.voice_conversation_turns for insert to authenticated with check ((select auth.uid()) = user_id);
create policy voice_conversation_delete on public.voice_conversation_turns for delete to authenticated using ((select auth.uid()) = user_id);

-- PRIVATE BY DEFAULT. Media rows and storage objects must both be owner-scoped.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
 ('gallery','gallery',false,null,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime','video/x-m4v','video/3gpp']),
 ('home-private','home-private',false,20971520,array['image/jpeg','image/png','image/webp','application/json']);

create policy nandini_gallery_objects_select on storage.objects for select to authenticated
 using (bucket_id = 'gallery' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy nandini_gallery_objects_insert on storage.objects for insert to authenticated
 with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy nandini_gallery_objects_update on storage.objects for update to authenticated
 using (bucket_id = 'gallery' and (storage.foldername(name))[1] = (select auth.uid())::text)
 with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy nandini_gallery_objects_delete on storage.objects for delete to authenticated
 using (bucket_id = 'gallery' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy nandini_home_objects_select on storage.objects for select to authenticated
 using (bucket_id = 'home-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
