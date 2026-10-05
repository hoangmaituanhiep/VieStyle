-- ============================================================================
-- AURASTYLE: SUPABASE DATABASE SCHEMA SETUP
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE TABLE: profiles (links to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  age INTEGER,
  gender TEXT DEFAULT 'nữ',
  personalities TEXT[] DEFAULT '{}',
  hobbies TEXT[] DEFAULT '{}',
  favourite_color TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE TABLE: outfits (Curated Wardrobe Inventory)
CREATE TABLE IF NOT EXISTS public.outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  style_tags TEXT[] NOT NULL DEFAULT '{}',
  colors TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE TABLE: user_preferences (Onboarding Style Questionnaire)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 10 AND age <= 120),
  personalities TEXT[] NOT NULL DEFAULT '{}',
  hobbies TEXT[] NOT NULL DEFAULT '{}',
  favourite_color TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE TABLE: suggestions_history (Generated Outfits & User Feedback)
CREATE TABLE IF NOT EXISTS public.suggestions_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  event_place TEXT NOT NULL,
  event_type TEXT NOT NULL,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  ai_reasoning TEXT,
  styling_tips TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDEXES FOR HIGH-PERFORMANCE QUERIES
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON public.suggestions_history(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_outfit_id ON public.suggestions_history(outfit_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_event_type ON public.suggestions_history(event_type);
CREATE INDEX IF NOT EXISTS idx_outfits_event_types ON public.outfits USING GIN(event_types);
CREATE INDEX IF NOT EXISTS idx_outfits_style_tags ON public.outfits USING GIN(style_tags);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Outfits Policies (Catalog is readable by authenticated and anon users; managed by admins)
CREATE POLICY "Outfits are viewable by everyone" 
  ON public.outfits FOR SELECT USING (true);

CREATE POLICY "Outfits can be inserted by authenticated users" 
  ON public.outfits FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- User Preferences Policies
CREATE POLICY "Users can view their own preferences" 
  ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
  ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
  ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Suggestions History Policies
CREATE POLICY "Users can view their own suggestions history" 
  ON public.suggestions_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert suggestions for themselves" 
  ON public.suggestions_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestion ratings" 
  ON public.suggestions_history FOR UPDATE USING (auth.uid() = user_id);

-- 8. TRIGGER: Automatic Profile Creation upon Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

