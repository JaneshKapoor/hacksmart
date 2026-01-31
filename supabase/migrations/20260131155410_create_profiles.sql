-- Create a table for public users (replacing profiles)
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text, 
  password text, -- PLAIN TEXT PASSWORD (Prototype Only)
  full_name text,
  avatar_url text,
  role text default 'operator',
  company text default 'ElectriGo',
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;

create policy "Public users are viewable by everyone."
  on public.users for select
  using ( true );

create policy "Users can insert their own profile."
  on public.users for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.users for update
  using ( auth.uid() = id );

-- Trigger to create public.users entry on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (
    id, 
    email, 
    password, -- Store plain text password from metadata
    full_name, 
    avatar_url, 
    role
  )
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'password', 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url', 
    'operator'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
