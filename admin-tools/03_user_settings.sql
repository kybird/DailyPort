-- Create a table to store user settings (Telegram, etc.)
create table if not exists public.user_settings (
  user_id uuid references auth.users not null primary key,
  telegram_chat_id text,
  telegram_bot_token text, -- Optional: if user wants to use their own bot
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.user_settings enable row level security;

-- Policies
create policy "Users can view their own settings."
  on public.user_settings for select
  using ( auth.uid() = user_id );

create policy "Users can update their own settings."
  on public.user_settings for update
  using ( auth.uid() = user_id );

create policy "Users can insert their own settings."
  on public.user_settings for insert
  with check ( auth.uid() = user_id );
