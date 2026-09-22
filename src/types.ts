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
  event_types: string[]; // e.g. ['formal', 'gala', 'cocktail']
  style_tags: string[];  // e.g. ['minimalist', 'monochrome', 'tailored']
  colors: string[];      // e.g. ['navy', 'charcoal', 'white']
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
