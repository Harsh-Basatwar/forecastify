create table public.activity_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    activity_type text not null,
    activity_title text not null,
    activity_description text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policies
alter table public.activity_logs enable row level security;

create policy "Users can view their own activity logs"
    on public.activity_logs for select
    using ( auth.uid() = user_id );

create policy "Users can insert their own activity logs"
    on public.activity_logs for insert
    with check ( auth.uid() = user_id );

-- Indexes for performance
create index idx_activity_logs_user_id on public.activity_logs(user_id);
create index idx_activity_logs_created_at on public.activity_logs(created_at desc);
