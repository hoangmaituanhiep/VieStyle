import { createClient, SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Outfit, UserPreferences, SuggestionHistory, MixMatchItem, parseOutfitRow, parseStringOrArray } from '../types';

const STORAGE_KEYS = {
  SUPABASE_URL: 'aurastyle_supabase_url',
  SUPABASE_ANON_KEY: 'aurastyle_supabase_key',
  MIX_HISTORY: 'aurastyle_mix_history',
};

// Retrieve environment credentials or stored settings across Vite and Next.js environments
export function getStoredSupabaseConfig(): { url: string; key: string; error: string | null } {
  // 1. Vite environment variables
  let viteUrl = '';
  let viteKey = '';
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      viteUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
      viteKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
    }
  } catch {
    // ignore
  }

  // 2. Next.js / Node process environment variables
  let nextUrl = '';
  let nextKey = '';
  try {
    if (typeof process !== 'undefined' && process.env) {
      nextUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        '';
      nextKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        '';
    }
  } catch {
    // ignore
  }

  // 3. Stored browser settings in localStorage
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY) || '' : '';

  const url = (storedUrl || viteUrl || nextUrl || '').trim();
  const key = (storedKey || viteKey || nextKey || '').trim();

  const error = !url || !key ? 'Thiếu biến môi trường Supabase' : null;

  return { url, key, error };
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, error } = getStoredSupabaseConfig();
  if (error || !url || !key) {
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

export async function fetchOutfits(): Promise<{ data: Outfit[] | null; error: string | null }> {
  let { url, key, error: configError } = getStoredSupabaseConfig();

  // If missing on client, attempt to sync from server proxy config
  if ((!url || !key) && typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/supabase-config');
      if (res.ok) {
        const serverConfig = await res.json();
        if (serverConfig?.url && serverConfig?.key) {
          saveSupabaseConfig(serverConfig.url, serverConfig.key);
          url = serverConfig.url.trim();
          key = serverConfig.key.trim();
          configError = null;
        }
      }
    } catch {
      // server route may not be reached
    }
  }

  if (configError || !url || !key) {
    return {
      data: null,
      error: 'Thiếu biến môi trường Supabase',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      data: null,
      error: 'Thiếu biến môi trường Supabase',
    };
  }

  try {
    const { data, error: queryError } = await client
      .from('outfits')
      .select('*')
      .order('name');

    if (queryError) {
      console.error('Supabase fetch outfits error:', queryError);
      return {
        data: null,
        error: queryError.message || 'Lỗi truy vấn bảng outfits từ Supabase',
      };
    }

    if (!data) {
      return {
        data: [],
        error: null,
      };
    }

    const parsedOutfits: Outfit[] = data.map((row: any) => parseOutfitRow(row));

    return {
      data: parsedOutfits,
      error: null,
    };
  } catch (err: any) {
    console.error('Failed to query Supabase outfits table:', err);
    return {
      data: null,
      error: err?.message || 'Không thể kết nối đến máy chủ Supabase',
    };
  }
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences | null> {
  if (!userId) return null;
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      const rawAge = data.age;
      const parsedAge = typeof rawAge === 'number' ? Math.floor(rawAge) : (parseInt(String(rawAge), 10) || 26);
      return {
        id: data.id,
        user_id: data.id,
        name: data.name || '',
        age: parsedAge,
        personalities: parseStringOrArray(data.personalities),
        hobbies: parseStringOrArray(data.hobbies),
        favourite_color: data.favourite_color || '',
        updated_at: data.updated_at,
      };
    }
  } catch (err) {
    console.warn('Supabase fetch profiles error:', err);
  }
  return null;
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not connected. Please configure your Supabase URL & Anon Key.');
  }

  const userId = preferences.user_id;
  const ageInt = typeof preferences.age === 'number'
    ? Math.floor(preferences.age)
    : (parseInt(String(preferences.age), 10) || 26);
  const personalitiesArray: string[] = parseStringOrArray(preferences.personalities);
  const hobbiesArray: string[] = parseStringOrArray(preferences.hobbies);
  const nameStr = (preferences.name || '').trim();
  const colorStr = (preferences.favourite_color || '').trim();

  // BẮT BUỘC: Sử dụng lệnh update để điền thông tin vào row đã có sẵn
  // await supabase.from('profiles').update({ name, age, personalities, hobbies, favourite_color }).eq('id', user.id);
  const { data, error } = await client
    .from('profiles')
    .update({
      name: nameStr,
      age: ageInt,
      personalities: personalitiesArray,
      hobbies: hobbiesArray,
      favourite_color: colorStr,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update profiles in Supabase:', error);
    throw error;
  }

  return {
    id: data?.id || userId,
    user_id: data?.id || userId,
    name: data?.name !== undefined && data?.name !== null ? data.name : nameStr,
    age: typeof data?.age === 'number' ? data.age : ageInt,
    personalities: parseStringOrArray(data?.personalities || personalitiesArray),
    hobbies: parseStringOrArray(data?.hobbies || hobbiesArray),
    favourite_color: data?.favourite_color !== undefined && data?.favourite_color !== null ? data.favourite_color : colorStr,
    updated_at: data?.updated_at,
  };
}

export async function fetchSuggestionsHistory(userId: string): Promise<SuggestionHistory[]> {
  if (!userId) return [];
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    // Sử dụng đúng cú pháp join .select('*, outfits(*)') vì Foreign Key (outfit_id -> outfits.id) đã tồn tại
    const { data, error } = await client
      .from('suggestions_history')
      .select('*, outfits(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map((item: any) => {
        const outfitRaw = Array.isArray(item.outfits) ? item.outfits[0] : (item.outfits || item.outfit);
        return {
          ...item,
          outfit: outfitRaw ? parseOutfitRow(outfitRaw) : undefined,
        };
      }) as SuggestionHistory[];
    }

    if (error) {
      console.warn('Supabase join query error (PGRST200 hoặc schema cache), fallback sang query select(*):', error);
      // Query an toàn fallback nếu cache foreign key chưa đồng bộ
      const fallbackRes = await client
        .from('suggestions_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!fallbackRes.error && fallbackRes.data) {
        return fallbackRes.data.map((item: any) => ({
          ...item,
          outfit: undefined,
        })) as SuggestionHistory[];
      }
    }
  } catch (err) {
    console.warn('Supabase fetch history exception:', err);
  }
  return [];
}

export async function saveSuggestion(suggestion: Omit<SuggestionHistory, 'id' | 'created_at'>): Promise<SuggestionHistory> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not connected. Please sign in and connect Supabase.');
  }

  // Đảm bảo outfit_id truyền lên là string UUID hợp lệ của trang phục
  const outfitId = String(suggestion.outfit_id || '').trim();
  if (!outfitId) {
    throw new Error('Mã outfit_id không hợp lệ (yêu cầu UUID trang phục).');
  }

  // Bảng suggestions_history CHỈ CÓ các cột: user_id, outfit_id, event_name, event_place, event_type, rating
  const payload = {
    user_id: suggestion.user_id,
    outfit_id: outfitId,
    event_name: suggestion.event_name,
    event_place: suggestion.event_place,
    event_type: suggestion.event_type,
    rating: suggestion.rating ?? null,
  };

  try {
    const { data, error } = await client
      .from('suggestions_history')
      .insert([payload])
      .select('*, outfits(*)')
      .single();

    if (error) {
      console.warn('Lỗi khi insert với join .select(*, outfits(*)), fallback sang .select(*):', error);
      const fallback = await client
        .from('suggestions_history')
        .insert([payload])
        .select('*')
        .single();

      if (fallback.error) {
        console.error('Failed to save suggestion to Supabase:', fallback.error);
        throw fallback.error;
      }

      return {
        ...fallback.data,
        outfit: undefined,
      } as SuggestionHistory;
    }

    const outfitRaw = Array.isArray(data.outfits) ? data.outfits[0] : (data.outfits || data.outfit);

    return {
      ...data,
      outfit: outfitRaw ? parseOutfitRow(outfitRaw) : undefined,
    } as SuggestionHistory;
  } catch (err) {
    console.error('Save suggestion exception:', err);
    throw err;
  }
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
// MIX & MATCH AI STUDIO HISTORY
// ----------------------------------------------------------------------------

export async function fetchMixHistory(userId?: string): Promise<MixMatchItem[]> {
  const client = getSupabaseClient();
  let remoteData: MixMatchItem[] = [];

  if (client) {
    try {
      let query = client
        .from('mix_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;
      if (!error && data) {
        remoteData = data as MixMatchItem[];
      }
    } catch (err) {
      console.warn('Supabase fetch mix_history warning:', err);
    }
  }

  // Also read stored local mix history for instant responsiveness
  let localData: MixMatchItem[] = [];
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.MIX_HISTORY) : null;
    if (raw) {
      localData = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Local mix history parse error:', e);
  }

  // Merge unique by ID
  const map = new Map<string, MixMatchItem>();
  remoteData.forEach((item) => map.set(item.id, item));
  localData.forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });

  const merged = Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });

  return merged;
}

export async function saveMixHistory(
  item: Omit<MixMatchItem, 'id' | 'created_at'> & { id?: string }
): Promise<MixMatchItem> {
  const generatedId = item.id || `mix-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record: MixMatchItem = {
    id: generatedId,
    user_id: item.user_id,
    garment_type: item.garment_type,
    accessories: item.accessories || [],
    primary_color: item.primary_color,
    secondary_color: item.secondary_color,
    background_vibe: item.background_vibe,
    prompt_used: item.prompt_used,
    image_url: item.image_url,
    created_at: now,
  };

  // 1. Save to local storage first for resilience
  try {
    const existingRaw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.MIX_HISTORY) : null;
    const existingList: MixMatchItem[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updatedList = [record, ...existingList.filter((m) => m.id !== record.id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEYS.MIX_HISTORY, JSON.stringify(updatedList));
  } catch (err) {
    console.warn('Failed to save mix history locally:', err);
  }

  // 2. Save to Supabase if connected
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('mix_history')
        .insert([
          {
            user_id: record.user_id || null,
            garment_type: record.garment_type,
            accessories: record.accessories,
            primary_color: record.primary_color,
            secondary_color: record.secondary_color || null,
            background_vibe: record.background_vibe || null,
            prompt_used: record.prompt_used || null,
            image_url: record.image_url,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return data as MixMatchItem;
      }
    } catch (err) {
      console.warn('Supabase save mix_history error (falling back to local cache):', err);
    }
  }

  return record;
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
