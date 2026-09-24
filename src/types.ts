/**
 * TypeScript Interfaces for the Supabase Database Schema and AI Outfit Recommendation Engine
 */

export interface Profile {
  id: string; // References auth.users(id)
  email?: string;
  name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Outfit {
  id: string; // UUID primary key
  name: string;
  description: string;
  image_url: string;
  event_types: string[] | string; // Handled as string in Supabase text columns or string[]
  style_tags: string[] | string;  // Handled as string in Supabase text columns or string[]
  colors: string[] | string;      // Handled as string in Supabase text columns or string[]
  created_at?: string;
}

export interface UserPreferences {
  id?: string;
  user_id: string;       // References auth.users(id)
  name: string;
  age: number;
  personalities: string[]; // e.g. ['Avant-Garde', 'Minimalist', 'Extroverted']
  hobbies: string[];       // e.g. ['Art Galleries', 'Fine Dining', 'Live Music']
  favourite_color: string; // e.g. 'Midnight Blue' or '#1E293B'
  updated_at?: string;
}

export interface SuggestionHistory {
  id: string;            // UUID primary key
  user_id: string;       // References auth.users(id)
  outfit_id: string;     // References outfits(id)
  event_name: string;
  event_place: string;
  event_type: string;    // 'traditional' | 'formal' | 'informal' | 'entertainment' | etc.
  rating?: number | null; // 1-5 scale, null until user rates
  ai_reasoning?: string; // AI explanation for why this outfit was matched
  styling_tips?: string; // Shoes, accessories, layering advice
  created_at: string;
  outfit?: Outfit;       // Joined outfit details
}

export interface EventContext {
  event_name: string;
  event_place: string;
  event_type: 'traditional' | 'formal' | 'informal' | 'entertainment' | 'business' | 'date night' | 'festival' | 'casual' | 'lunar_new_year' | 'wedding' | string;
  dress_code?: string;
  weather_notes?: string;
}

export interface MixMatchItem {
  id: string;
  user_id?: string;
  garment_type: string;
  accessories: string[];
  primary_color: string;
  secondary_color?: string;
  background_vibe?: string;
  prompt_used?: string;
  image_url: string;
  created_at?: string;
}

export interface RecommendationRequest {
  user_id: string;
  user_profile: UserPreferences;
  event_context: EventContext;
  past_ratings?: Array<{
    outfit_id: string;
    outfit_name: string;
    event_type: string;
    rating: number;
    notes?: string;
  }>;
  mix_history?: MixMatchItem[];
  available_outfits: Outfit[];
}

export interface RecommendationResponse {
  selected_outfit_id: string;
  match_score: number; // 0 - 100
  ai_reasoning: string;
  styling_tips: string;
  alternative_outfit_id?: string;
  vibe_keywords?: string[];
}

/**
 * Parses a value that may be an Array or a Text/String from Supabase
 * (e.g. 'đỏ, xanh, vàng' or '["đỏ", "xanh"]' or ['đỏ', 'xanh']) into string[]
 */
export function parseStringOrArray(val: unknown): string[] {
  if (val === null || val === undefined) {
    return [];
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
      .filter((item) => item !== '' && item.toLowerCase() !== 'null');
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return [];
    }
    // Check if JSON array string
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
            .filter((item) => item !== '' && item.toLowerCase() !== 'null');
        }
      } catch {
        // Fallback to comma separation
      }
    }
    // Standard comma-delimited text from Supabase Text columns
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.toLowerCase() !== 'null');
  }
  return [];
}

/**
 * Normalizes an outfit raw record from Supabase, parsing text columns into arrays
 */
export function parseOutfitRow(row: any): Outfit {
  if (!row) {
    return {
      id: '',
      name: 'null',
      description: 'null',
      image_url: '',
      event_types: [],
      style_tags: [],
      colors: [],
    };
  }

  return {
    ...row,
    id: String(row.id || ''),
    name: row.name !== undefined && row.name !== null && String(row.name).trim() !== '' ? String(row.name).trim() : 'null',
    description: row.description !== undefined && row.description !== null && String(row.description).trim() !== '' ? String(row.description).trim() : 'null',
    image_url: row.image_url !== undefined && row.image_url !== null ? String(row.image_url).trim() : '',
    event_types: parseStringOrArray(row.event_types),
    style_tags: parseStringOrArray(row.style_tags),
    colors: parseStringOrArray(row.colors),
  };
}

/**
 * Normalization helpers to ensure missing or empty outfit data cells display 'null' as required
 */
export function normalizeOutfitValue(val: string | undefined | null): string {
  if (val === undefined || val === null) return 'null';
  const trimmed = String(val).trim();
  return trimmed === '' ? 'null' : trimmed;
}

export function normalizeOutfitArray(arr: string[] | string | undefined | null): string[] {
  if (arr === undefined || arr === null) return ['null'];
  if (typeof arr === 'string') {
    const parsed = parseStringOrArray(arr);
    return parsed.length > 0 ? parsed : ['null'];
  }
  if (Array.isArray(arr)) {
    const cleaned = arr
      .map((item) => (item === undefined || item === null ? '' : String(item).trim()))
      .filter((item) => item !== '' && item.toLowerCase() !== 'null');
    return cleaned.length > 0 ? cleaned : ['null'];
  }
  return ['null'];
}
