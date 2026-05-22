-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text,
  created_at timestamptz default now()
);

-- Leads table
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  permit_id text unique,
  address text,
  city text,
  state text,
  zip text,
  trade text,
  valuation numeric,
  description text,
  issued_date date,
  ai_score numeric,
  ai_summary text,
  source_url text,
  created_at timestamptz default now()
);

-- User preferences
create table public.user_preferences (
  user_id uuid references public.users on delete cascade primary key,
  trades text[],
  territories text[],
  email_frequency text default 'weekly',
  created_at timestamptz default now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Leads table policies (open read for now, will be refined with territory logic)
CREATE POLICY "Users can view leads"
  ON public.leads FOR SELECT
  USING (true);

CREATE POLICY "Users can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- User preferences policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
