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

-- 9. SEED DATA: Predefined Curated Wardrobe Inventory
INSERT INTO public.outfits (id, name, description, image_url, event_types, style_tags, colors)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Architectural Charcoal Tailored Suit', 'Double-breasted Italian wool blend blazer with relaxed pleated trousers, clean modern lines, and silk-cotton inner tee.', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80', ARRAY['formal', 'business', 'entertainment'], ARRAY['tailored', 'minimalist', 'quiet luxury', 'modern classic'], ARRAY['charcoal', 'black', 'crisp white']),
  ('c1000000-0000-0000-0000-000000000002', 'Emerald Silk Slip Midi & Cashmere Wrap', 'Fluid bias-cut mulberry silk midi dress in jewel emerald paired with a draped neutral cashmere cardigan and delicate gold jewelry.', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80', ARRAY['formal', 'entertainment', 'date_night', 'cocktail'], ARRAY['chic', 'elegant', 'romantic', 'refined'], ARRAY['emerald green', 'champagne', 'gold']),
  ('c1000000-0000-0000-0000-000000000003', 'Modern Neo-Traditional Linen Brocade Ensemble', 'Heritage-inspired mandarin collar jacket in textured raw linen with embroidered geometric motifs and tapered trousers.', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80', ARRAY['traditional', 'formal', 'festival'], ARRAY['heritage', 'artisan', 'avant-garde', 'cultural'], ARRAY['ochre', 'cream', 'bronze', 'terracotta']),
  ('c1000000-0000-0000-0000-000000000004', 'Tokyo Streetwear Layered Silhouette', 'Oversized structured kimono blazer over heavyweight drop-shoulder tee, asymmetric pocket cargo trousers, and clean designer leather runners.', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1000&q=80', ARRAY['informal', 'entertainment', 'festival'], ARRAY['streetwear', 'contemporary', 'urban', 'edgy'], ARRAY['matte black', 'stone grey', 'olive']),
  ('c1000000-0000-0000-0000-000000000005', 'Riviera Linen Resort Blazer & Chinos', 'Unstructured breathable beige linen blazer, light sky-blue oxford popover shirt, ecru relaxed chinos, and woven leather loafers.', 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1000&q=80', ARRAY['informal', 'date_night', 'business'], ARRAY['preppy', 'resort', 'casual chic', 'smart casual'], ARRAY['sand beige', 'sky blue', 'ecru']),
  ('c1000000-0000-0000-0000-000000000006', 'Midnight Velvet Cocktail Tuxedo', 'Plush midnight-blue velvet dinner jacket with black grosgrain shawl lapels, tailored dress trousers, and patent leather dress shoes.', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=80', ARRAY['formal', 'entertainment', 'gala'], ARRAY['glamour', 'black tie', 'bold luxury', 'dramatic'], ARRAY['midnight blue', 'jet black', 'silver']),
  ('c1000000-0000-0000-0000-000000000007', 'Bohemian Artisan Kimono & Wide-Leg Trousers', 'Flowing printed botanical silk-chiffon duster jacket over a ribbed neutral tank top, fluid high-waisted palazzo pants, and woven sandals.', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80', ARRAY['informal', 'festival', 'entertainment'], ARRAY['bohemian', 'artistic', 'free-spirited', 'vibrant'], ARRAY['warm amber', 'sage green', 'ivory', 'rust']),
  ('c1000000-0000-0000-0000-000000000008', 'Monochrome Knit Column & Leather Trench', 'Sleek ribbed merino wool turtleneck maxi dress paired with a structured vegan leather trench coat and pointed ankle boots.', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80', ARRAY['informal', 'business', 'date_night'], ARRAY['minimalist', 'high fashion', 'sleek', 'autumnal'], ARRAY['espresso brown', 'camel', 'black']),
  ('c1000000-0000-0000-0000-000000000009', 'Royal Heritage Silk Saree / Brocade Robe', 'Intricately woven golden zari border silk ensemble with handwoven motifs, jewel-tone rich fabric, and artisan jewelry pairings.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80', ARRAY['traditional', 'formal', 'festival'], ARRAY['cultural', 'regal', 'ornate', 'traditional'], ARRAY['ruby red', 'antique gold', 'crimson']),
  ('c1000000-0000-0000-0000-000000000010', 'Sculptural Asymmetric Jumpsuit', 'One-shoulder crepe tailored jumpsuit with draped diagonal neckline, cinched belt with brushed brass buckle, and wide flowing legs.', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80', ARRAY['formal', 'entertainment', 'cocktail', 'date_night'], ARRAY['avant-garde', 'architectural', 'bold', 'modern'], ARRAY['cobalt blue', 'black', 'brass']),
  ('c1000000-0000-0000-0000-000000000011', 'Smart Weekend Suede Overshirt & Raw Denim', 'Buttery camel goatskin suede overshirt, heavyweight white tee, selvedge raw indigo denim, and hand-crafted Chelsea boots.', 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1000&q=80', ARRAY['informal', 'entertainment', 'date_night'], ARRAY['rugged refined', 'casual', 'heritage', 'timeless'], ARRAY['camel tan', 'indigo blue', 'white']),
  ('c1000000-0000-0000-0000-000000000012', 'Nordic Minimalist Pastel Wool Coat & Trousers', 'Clean-cut double-faced lavender-tinted wool coat, ivory mock-neck knit, and relaxed tailored wool trousers in soft dove grey.', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80', ARRAY['informal', 'business', 'entertainment'], ARRAY['scandinavian', 'minimalist', 'soft luxury', 'pastel'], ARRAY['soft lavender', 'dove grey', 'ivory'])
ON CONFLICT (id) DO NOTHING;
