import { createClient, SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Outfit, UserPreferences, SuggestionHistory } from '../types';
import { DEFAULT_OUTFITS } from '../data/defaultOutfits';

const STORAGE_KEYS = {
  SUPABASE_URL: 'aurastyle_supabase_url',
  SUPABASE_ANON_KEY: 'aurastyle_supabase_key',
};

// Retrieve environment credentials or stored settings
export function getStoredSupabaseConfig(): { url: string; key: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY) || '' : '';

  return {
    url: (storedUrl || envUrl || '').trim(),
    key: (storedKey || envKey || '').trim(),
  };
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getStoredSupabaseConfig();
  if (!url || !key) {
    supabaseInstance = null;
    return null;
  }

  // Validate URL format before calling createClient to avoid preview crash
  try {
    new URL(url);
  } catch {
    console.warn('Invalid Supabase URL format:', url);
    return null;
  }

  const configKey = `${url}___${key}`;
  if (!supabaseInstance || currentConfigKey !== configKey) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      currentConfigKey = configKey;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      supabaseInstance = null;
      return null;
    }
  }
  return supabaseInstance;
}

export function saveSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
    localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, key.trim());
    supabaseInstance = null; // force re-initialization
    currentConfigKey = '';
  }
}

export function clearSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_ANON_KEY);
    supabaseInstance = null;
    currentConfigKey = '';
  }
}

// ----------------------------------------------------------------------------
// DATA ACCESS LAYER
// ----------------------------------------------------------------------------

export async function fetchOutfits(): Promise<Outfit[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('outfits')
        .select('*')
        .order('name');
      if (!error && data && data.length > 0) {
        return data as Outfit[];
      }
    } catch (err) {
      console.warn('Supabase fetch outfits error, falling back to curated assets:', err);
    }
  }
  // Curated fallback outfits ensure the AI styling model always has garments to inspect
  return DEFAULT_OUTFITS;
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences | null> {
  if (!userId) return null;
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      return data as UserPreferences;
    }
  } catch (err) {
    console.warn('Supabase fetch preferences error:', err);
  }
  return null;
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not connected. Please configure your Supabase URL & Anon Key.');
  }

  const { data, error } = await client
    .from('user_preferences')
    .upsert(
      {
        user_id: preferences.user_id,
        name: preferences.name,
        age: preferences.age,
        personalities: preferences.personalities,
        hobbies: preferences.hobbies,
        favourite_color: preferences.favourite_color,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to save user preferences:', error);
    throw error;
  }

  return data as UserPreferences;
}

export async function fetchSuggestionsHistory(userId: string): Promise<SuggestionHistory[]> {
  if (!userId) return [];
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('suggestions_history')
      .select('*, outfit:outfits(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as SuggestionHistory[];
    }
  } catch (err) {
    console.warn('Supabase fetch history error:', err);
  }
  return [];
}

export async function saveSuggestion(suggestion: Omit<SuggestionHistory, 'id' | 'created_at'>): Promise<SuggestionHistory> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not connected. Please sign in and connect Supabase.');
  }

  const { data, error } = await client
    .from('suggestions_history')
    .insert([
      {
        user_id: suggestion.user_id,
        outfit_id: suggestion.outfit_id,
        event_name: suggestion.event_name,
        event_place: suggestion.event_place,
        event_type: suggestion.event_type,
        rating: suggestion.rating ?? null,
        ai_reasoning: suggestion.ai_reasoning ?? '',
        styling_tips: suggestion.styling_tips ?? '',
      },
    ])
    .select('*, outfit:outfits(*)')
    .single();

  if (error) {
    console.error('Failed to save suggestion to Supabase:', error);
    throw error;
  }

  return data as SuggestionHistory;
}

export async function updateSuggestionRating(id: string, rating: number): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('suggestions_history')
      .update({ rating })
      .eq('id', id);

    if (error) {
      console.warn('Supabase rating update error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase rating update exception:', err);
    return false;
  }
}

// ----------------------------------------------------------------------------
// SUPABASE AUTHENTICATION & onAuthStateChange SUBSCRIPTION
// ----------------------------------------------------------------------------

export async function getAuthSession(): Promise<{ user: User | null; session: Session | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, session: null };
  }

  try {
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn('Supabase session fetch error:', error);
      return { user: null, session: null };
    }
    return { user: data.session?.user ?? null, session: data.session ?? null };
  } catch (err) {
    console.warn('Supabase session retrieval error:', err);
    return { user: null, session: null };
  }
}

/**
 * Subscribes to Supabase auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, INITIAL_SESSION).
 * Automatically executes the callback so React state updates instantly.
 */
export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }

  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function signUpWithSupabase(email: string, password: string, name?: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not connected. Please provide your Supabase URL & Anon Key in the "Supabase SQL" tab.');
  }
  const cleanEmail = email.trim();
  const cleanName = (name || email.split('@')[0]).trim();

  const { data, error } = await client.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: { name: cleanName },
    },
  });
  if (error) throw error;

  // When Confirm Email is disabled, session is attached immediately.
  // In case session wasn't auto-attached by client response, immediately sign in to register global auth state.
  if (!data.session && data.user) {
    try {
      const signInRes = await client.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInRes.data?.session) {
        return signInRes.data;
      }
    } catch (err) {
      console.warn('Auto-login post-signup note:', err);
    }
  }

  return data;
}

export async function signInWithSupabase(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not connected. Please provide your Supabase URL & Anon Key in the "Supabase SQL" tab.');
  }
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOutSupabase() {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
}
