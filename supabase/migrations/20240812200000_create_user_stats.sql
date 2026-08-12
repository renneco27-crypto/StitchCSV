-- Create user_stats table to store global streaks and studied today stats
create table if not exists public.user_stats (
    user_id uuid references auth.users not null primary key,
    total_streak integer default 0,
    studied_today integer default 0,
    last_studied date,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.user_stats enable row level security;

create policy "Users can view own stats."
    on user_stats for select
    using ( auth.uid() = user_id );

create policy "Users can update own stats."
    on user_stats for update
    using ( auth.uid() = user_id );

create policy "Users can insert own stats."
    on user_stats for insert
    with check ( auth.uid() = user_id );

-- Function to update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger on_user_stats_updated
    before update on public.user_stats
    for each row
    execute procedure public.handle_updated_at();
