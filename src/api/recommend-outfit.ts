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
            outfit_id: matchedOutfit.id,
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

    const safeArray = (v: any) => {
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (!trimmed || trimmed === 'null') return [];
        return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [];
    };

    // Mảng rút gọn của các trang phục hiện có (chỉ gửi id, name, event_types, style_tags để tiết kiệm Context Window)
    const compactCatalog = available_outfits.map((o: any) => ({
      id: o.id,
      name: o.name,
      event_types: safeArray(o.event_types),
      style_tags: safeArray(o.style_tags),
    }));

    // Câu lệnh prompt yêu cầu AI theo chuẩn tối ưu cực hạn
    const userPrompt = `Bạn là hệ thống match trang phục. Dựa vào yêu cầu của người dùng, hãy chọn ra 1 trang phục phù hợp nhất từ danh sách. BẮT BUỘC chỉ trả về 1 chuỗi JSON duy nhất, không có văn bản giải thích, không bọc markdown (\`\`\`json). Cấu trúc: {"outfit_id": "chuỗi_uuid_được_chọn"}.

Yêu cầu người dùng:
- Sự kiện: ${inputEventName || ''} (${inputEventType || ''})
- Địa điểm: ${inputEventPlace || ''}
${event_context.dress_code ? `- Dress code: ${event_context.dress_code}` : ''}
${user_profile?.favourite_color ? `- Màu ưa thích: ${user_profile.favourite_color}` : ''}
${user_profile?.personalities?.length ? `- Phong cách: ${user_profile.personalities.join(', ')}` : ''}

Danh sách trang phục:
${JSON.stringify(compactCatalog)}`;

    // Gọi bản gemini-3.8-flash
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });
    } catch (genaiErr: any) {
      console.error('Call to Gemini Flash failed:', genaiErr?.message);
      return res.status(500).json({
        error: genaiErr?.message || 'Lỗi máy chủ',
      });
    }

    let parsed: any = {};
    try {
      let rawText = (response.text || '').trim();
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      } else if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(rawText || '{}');
    } catch (parseErr) {
      console.warn('Failed to parse JSON response from Gemini:', response.text);
      const idMatch = response.text?.match(/"outfit_id"\s*:\s*"([^"]+)"/);
      if (idMatch && idMatch[1]) {
        parsed = { outfit_id: idMatch[1] };
      }
    }

    let selectedOutfitId = parsed?.outfit_id || parsed?.selected_outfit_id;
    const exists = available_outfits.some((o: any) => o.id === selectedOutfitId);
    if (!exists) {
      selectedOutfitId = available_outfits[0].id;
    }

    // Lưu kết quả này vào bảng suggestions_history để làm Caching cho những user/lần sau
    if (supabase) {
      try {
        const cacheUserId = user_id || user_profile?.id || 'dae05a68-ee99-470f-8f17-7db434e65f8d';
        // RÀNG BUỘC INSERT: CHỈ DÙNG các cột: user_id, outfit_id, event_name, event_place, event_type
        const cachePayload = {
          user_id: cacheUserId,
          outfit_id: selectedOutfitId,
          event_name: inputEventName || 'Sự kiện',
          event_place: inputEventPlace || 'Địa điểm',
          event_type: inputEventType,
        };

        await supabase.from('suggestions_history').insert([cachePayload]);
        console.log(`[Cache Miss -> Stored] Đã lưu caching outfit_id (${selectedOutfitId}) vào suggestions_history cho dịp: ${inputEventType}`);
      } catch (insertErr: any) {
        console.warn('Lỗi ghi suggestions_history cache:', insertErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      cached: false,
      outfit_id: selectedOutfitId,
      recommendation: {
        selected_outfit_id: selectedOutfitId,
      },
      engine: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    // =========================================================================
    // BƯỚC 3: ERROR HANDLING
    // =========================================================================
    console.error('Pages route exception caught:', error?.message);
    return res.status(500).json({
      error: error?.message || 'Lỗi máy chủ',
    });
  }
}
