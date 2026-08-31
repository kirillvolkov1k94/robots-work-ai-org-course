create table if not exists public.course_progress (
  course_id text not null check (char_length(trim(course_id)) > 0),
  user_id uuid not null references auth.users(id) on delete cascade,
  progress jsonb not null check (jsonb_typeof(progress) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (course_id, user_id)
);

alter table public.course_progress enable row level security;

create or replace function public.set_course_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists course_progress_set_updated_at on public.course_progress;
create trigger course_progress_set_updated_at
before update on public.course_progress
for each row execute function public.set_course_progress_updated_at();

create policy "course progress is readable by its owner"
on public.course_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "course progress is insertable by its owner"
on public.course_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "course progress is updatable by its owner"
on public.course_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "course progress is deletable by its owner"
on public.course_progress
for delete
to authenticated
using (auth.uid() = user_id);
