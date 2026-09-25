import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const getSupabaseServerClient = (reqUrl?: string, reqKey?: string) => {
  const url = (reqUrl || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (reqKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (e) {
    console.warn('Failed to initialize Supabase server client:', e);
    return null;
  }
};

/**
 * Next.js Pages API Route: /api/recommend-outfit
 * 3-Step Architecture:
 * 1. Cache Hit check via Supabase suggestions_history
 * 2. Cache Miss: Call Gemini Flash & Store in suggestions_history (strict valid columns)
 * 3. Resilient Error Handling (returns 503 JSON, never crashes to HTML)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      user_id,
      user_profile,
      event_context,
      past_ratings,
      mix_history,
      available_outfits,
      supabase_url,
      supabase_key,
    } = req.body || {};

    if (!event_context || !available_outfits || !Array.isArray(available_outfits) || available_outfits.length === 0) {
      return res.status(400).json({
        error: 'Missing required parameters: event_context and available_outfits.',
      });
    }

    const inputEventType = event_context.event_type;
    const inputEventPlace = event_context.event_place;
    const inputEventName = event_context.event_name;

    // =========================================================================
    // BƯỚC 1: KIỂM TRA CACHING (CACHE HIT) TỪ SUPABASE
    // =========================================================================
    const supabase = getSupabaseServerClient(supabase_url, supabase_key);

    if (supabase && inputEventType) {
      try {
        let cachedRow: any = null;

        if (inputEventPlace) {
          const { data: exactMatch } = await supabase
            .from('suggestions_history')
            .select('*')
            .eq('event_type', inputEventType)
            .eq('event_place', inputEventPlace)
            .order('created_at', { ascending: false })
            .limit(1);

          if (exactMatch && exactMatch.length > 0 && exactMatch[0]?.outfit_id) {
            cachedRow = exactMatch[0];
          }
        }

        if (!cachedRow) {
          const { data: typeMatch } = await supabase
            .from('suggestions_history')
            .select('*')
            .eq('event_type', inputEventType)
            .order('created_at', { ascending: false })
            .limit(1);

          if (typeMatch && typeMatch.length > 0 && typeMatch[0]?.outfit_id) {
            cachedRow = typeMatch[0];
          }
        }

        if (cachedRow && cachedRow.outfit_id) {
          const cachedOutfitId = String(cachedRow.outfit_id).trim();
          const matchedOutfit = available_outfits.find((o: any) => o.id === cachedOutfitId) || available_outfits[0];

          console.log(`⚡ [Cache Hit] Trả về outfit_id (${matchedOutfit.id}) từ suggestions_history cho dịp: ${inputEventType}. BỎ QUA Gemini API.`);

          return res.status(200).json({
            success: true,
            cached: true,
            recommendation: {
              selected_outfit_id: matchedOutfit.id,
              match_score: 96,
              ai_reasoning: `Gợi ý được đồng bộ tức thì từ cơ sở dữ liệu kinh nghiệm VieStyle cho hoàn cảnh ${inputEventType} tại ${inputEventPlace || 'không gian tương tự'}. Thiết kế "${matchedOutfit.name}" bảo chứng sự hoàn mỹ và đúng chuẩn nghi thức.`,
              styling_tips: `Giữ phom dáng thanh thoát, kết hợp hài nhung truyền thống và điểm xuyết trang sức tối giản để tôn vinh chất liệu.`,
              alternative_outfit_id: available_outfits.find((o: any) => o.id !== matchedOutfit.id)?.id || matchedOutfit.id,
              vibe_keywords: ['Di Sản', 'Đúng Chuẩn', 'Kinh Nghiệm'],
            },
            engine: 'supabase_cache_hit',
          });
        }
      } catch (cacheErr: any) {
        console.warn('Lỗi kiểm tra cache Supabase:', cacheErr?.message);
      }
    }

    // =========================================================================
    // BƯỚC 2: GỌI AI & LƯU CACHING (CACHE MISS)
    // =========================================================================
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const pastRatingsText = (past_ratings || []).map((r: any) => {
      const outfitName = r.outfit_name || r.outfit?.name || 'Outfit';
      const eventType = r.event_type || 'event';
      const rating = r.rating || 3;
      return `- Đánh giá trước: "${outfitName}" được ${rating}/5 sao cho dịp ${eventType}.`;
    }).join('\n') || 'Chưa có lịch sử đánh giá.';

    const mixHistoryText = (mix_history || []).slice(0, 6).map((m: any) => {
      const garment = m.garment_type || 'Trang phục';
      const colors = [m.primary_color, m.secondary_color].filter(Boolean).join(' & ');
      return `- Thử nghiệm phối đồ: "${garment}" | Tông màu: ${colors}`;
    }).join('\n') || 'Chưa có thử nghiệm Mix & Match trước đó.';

    const safeArray = (v: any) => {
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (!trimmed || trimmed === 'null') return [];
        return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [];
    };

    const catalogSummary = available_outfits.map((o: any) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      event_types: safeArray(o.event_types),
      style_tags: safeArray(o.style_tags),
      colors: safeArray(o.colors),
    }));

    const systemInstruction = `You are VieStyle's Chief AI Stylist and Vietnamese Traditional Outfit Club Director.
Your task is to select the single optimal outfit from the provided catalog.`;

    const userPrompt = `
=== CLIENT STYLE PROFILE ===
Name: ${user_profile?.name || 'Client'}
Age: ${user_profile?.age || '??'}
Favorite Color: ${user_profile?.favourite_color || 'Light Yellow'}

=== UPCOMING EVENT CONTEXT ===
Event Name: ${event_context.event_name}
Place / Venue: ${event_context.event_place}
Event Type: ${event_context.event_type}

=== USER'S HISTORICAL RATINGS ===
${pastRatingsText}

=== USER'S MIX & MATCH EXPERIMENTS ===
${mixHistoryText}

=== AVAILABLE WARDROBE INVENTORY ===
${JSON.stringify(catalogSummary, null, 2)}
`;

    // Gọi bản flash thay vì pro
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.65,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              selected_outfit_id: { type: Type.STRING },
              match_score: { type: Type.INTEGER },
              ai_reasoning: { type: Type.STRING },
              styling_tips: { type: Type.STRING },
              alternative_outfit_id: { type: Type.STRING },
              vibe_keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['selected_outfit_id', 'match_score', 'ai_reasoning', 'styling_tips'],
          },
        },
      });
    } catch (genaiErr: any) {
      console.error('Call to Gemini Flash failed:', genaiErr?.message);
      return res.status(503).json({
        error: 'Máy chủ AI đang quá tải, vui lòng thử lại sau vài phút.',
        details: genaiErr?.message,
      });
    }

    const parsed = JSON.parse(response.text || '{}');
    const exists = available_outfits.some((o: any) => o.id === parsed.selected_outfit_id);
    if (!exists) {
      parsed.selected_outfit_id = available_outfits[0].id;
    }

    // Lưu kết quả này vào bảng suggestions_history để làm Caching cho những user/lần sau
    if (supabase) {
      try {
        const cacheUserId = user_id || user_profile?.id || 'dae05a68-ee99-470f-8f17-7db434e65f8d';
        // RÀNG BUỘC INSERT: CHỈ DÙNG các cột: user_id, outfit_id, event_name, event_place, event_type
        const cachePayload = {
          user_id: cacheUserId,
          outfit_id: parsed.selected_outfit_id,
          event_name: inputEventName || 'Sự kiện',
          event_place: inputEventPlace || 'Địa điểm',
          event_type: inputEventType,
        };

        await supabase.from('suggestions_history').insert([cachePayload]);
        console.log(`[Cache Miss -> Stored] Đã lưu caching outfit_id vào suggestions_history cho dịp: ${inputEventType}`);
      } catch (insertErr: any) {
        console.warn('Lỗi ghi suggestions_history cache:', insertErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      cached: false,
      recommendation: parsed,
      engine: 'gemini-2.5-flash',
    });
  } catch (error: any) {
    // =========================================================================
    // BƯỚC 3: ERROR HANDLING
    // =========================================================================
    console.error('Pages route exception caught:', error?.message);
    return res.status(503).json({
      error: error?.message || 'Máy chủ AI đang quá tải, vui lòng thử lại sau vài phút.',
    });
  }
}
