-- Private friendship letter. The note is staged separately, never embedded in public frontend source.
-- No public/anonymous read access. The intended account must be explicitly linked by an admin.
create table public.friendship_letter_pages (
  page_number smallint primary key check (page_number between 1 and 3),
  owner_id uuid references auth.users(id) on delete set null,
  heading text not null check (char_length(heading) between 1 and 100),
  paragraphs text[] not null check (cardinality(paragraphs) between 1 and 8),
  created_at timestamptz not null default now()
);

create index friendship_letter_pages_owner on public.friendship_letter_pages (owner_id, page_number);
alter table public.friendship_letter_pages enable row level security;

create policy friendship_letter_pages_select on public.friendship_letter_pages
for select to authenticated
using ((select auth.uid()) = owner_id);

-- Content is managed server-side only. No authenticated insert/update/delete policy.
