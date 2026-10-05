import { NextResponse } from 'next/server';
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
 * Next.js App Router API Route: /api/recommend-outfit
 * 3-Step Architecture:
 * 1. Cache Hit check via Supabase suggestions_history
 * 2. Cache Miss: Call Gemini Flash & Store in suggestions_history (strict valid columns)
 * 3. Resilient Error Handling (returns 503 JSON, never crashes to HTML)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      user_profile,
      event_context,
      past_ratings,
      mix_history,
      available_outfits,
      supabase_url,
      supabase_key,
    } = body || {};

    if (!event_context || !available_outfits || !Array.isArray(available_outfits) || available_outfits.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: event_context and available_outfits.' },
        { status: 400 }
      );
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

        // Thử tìm khớp chính xác event_name, event_type và event_place
        if (inputEventPlace && inputEventName) {
          const { data: exactMatch } = await supabase
            .from('suggestions_history')
            .select('*')
            .eq('event_type', inputEventType)
            .eq('event_place', inputEventPlace)
            .eq('event_name', inputEventName)
            .order('created_at', { ascending: false })
            .limit(1);

          if (exactMatch && exactMatch.length > 0 && exactMatch[0]?.outfit_id) {
            cachedRow = exactMatch[0];
          }
        }

        // Cache Hit check: Nếu tìm thấy dữ liệu có outfit_id hợp lệ
        if (cachedRow && cachedRow.outfit_id) {
          const cachedOutfitId = String(cachedRow.outfit_id).trim();
          const matchedOutfit = available_outfits.find((o: any) => o.id === cachedOutfitId) || available_outfits[0];

          console.log(`⚡ [Cache Hit] Trả về outfit_id (${matchedOutfit.id}) từ suggestions_history cho dịp: ${inputEventType}. BỎ QUA Gemini API.`);

          return NextResponse.json({
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
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format past ratings learning context
    const pastRatingsText = (past_ratings || []).map((r: any) => {
      const outfitName = r.outfit_name || r.outfit?.name || 'Outfit';
      const eventType = r.event_type || 'event';
      const rating = r.rating || 3;
      return `- Đánh giá trước: "${outfitName}" được ${rating}/5 sao cho dịp ${eventType}. Ghi chú: ${r.notes || 'Không'}`;
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

    const systemInstruction = `Bạn là một chuyên gia hàng đầu về Cổ phục và Trang phục truyền thống Việt Nam.

TUYỆT ĐỐI KHÔNG được lạm dụng Áo Dài. Bạn PHẢI xem xét và ưu tiên gợi ý các loại trang phục đa dạng khác dựa trên tiêu chí của người dùng, bao gồm nhưng không giới hạn: Áo Tấc (cho dịp trang trọng), Áo Nhật Bình (cho hoàng tộc/sang trọng), Áo Giao Lĩnh (thời Lê/cổ điển), Áo Viên Lĩnh, Áo Tứ Thân (dân dã/hội hè Bắc Bộ), Áo Ngũ Thân tay chẽn, Yếm lụa, Áo Mớ Ba Mớ Bảy.

Chỉ thị quan trọng:
1. Phân tích ngữ cảnh và lý do chọn lựa (ai_reasoning): Hãy phân tích sâu sắc tại sao bộ trang phục đó (như Áo Tấc, Nhật Bình, Giao Lĩnh, Viên Lĩnh, Tứ Thân, Ngũ Thân...) lại phù hợp hoàn hảo với tính chất sự kiện, không gian địa điểm, tính cách và thời tiết của người dùng thay vì chỉ chọn Áo Dài theo thói quen. CHỈ chọn Áo Dài khi tiêu chí người dùng thực sự chỉ phù hợp với Áo Dài hoặc người dùng chỉ định rõ.
2. selected_outfit_id BẮT BUỘC phải là một 'id' chính xác có trong danh sách trang phục được cung cấp (AVAILABLE WARDROBE INVENTORY). Tuyệt đối không tự bịa ID.
3. Cung cấp match_score (từ 85 đến 99), lý giải ai_reasoning mang tính học thuật và thẩm mỹ cao, cùng hướng dẫn phối đồ styling_tips chi tiết (phụ kiện, hài/guốc, cách vấn khăn hoặc trang sức đi kèm).`;

    const userPrompt = `
=== HỒ SƠ PHONG CÁCH NGƯỜI DÙNG ===
Họ và tên: ${user_profile?.name || 'Khách Quý'}
Độ tuổi: ${user_profile?.age || '26'}
Tính cách / Phong cách: ${user_profile?.personalities?.join(', ') || 'Thanh lịch, Hoài cổ'}
Sở thích & Quan tâm: ${user_profile?.hobbies?.join(', ') || 'Nghệ thuật, Văn hóa di sản'}
Màu sắc yêu thích: ${user_profile?.favourite_color || 'Tự nhiên'}

=== BỐI CẢNH SỰ KIỆN ===
Tên sự kiện: ${event_context.event_name}
Địa điểm / Không gian: ${event_context.event_place}
Dịp / Phân loại sự kiện: ${event_context.event_type}
Quy định trang phục (Dress Code): ${event_context.dress_code || 'Trang phục truyền thống tao nhã'}
Thời tiết / Mùa: ${event_context.weather_notes || 'Thuận lợi'}

=== LỊCH SỬ ĐÁNH GIÁ CỦA NGƯỜI DÙNG ===
${pastRatingsText}

=== THỬ NGHIỆM MIX & MATCH GẦN ĐÂY ===
${mixHistoryText}

=== DANH SÁCH TRANG PHỤC CÓ SẴN (AVAILABLE WARDROBE INVENTORY) ===
${JSON.stringify(catalogSummary, null, 2)}
`;

    // Gọi bản gemini-3.8-flash
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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
      console.error('Gemini Flash call failed:', genaiErr?.message);
      const isOverloaded = genaiErr?.message?.includes('503') || genaiErr?.message?.includes('high demand') || genaiErr?.status === 503;
      return NextResponse.json(
        { error: isOverloaded ? 'Máy chủ AI đang quá tải, vui lòng thử lại sau giây lát.' : (genaiErr?.message || 'Lỗi máy chủ') },
        { status: isOverloaded ? 503 : 500 }
      );
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

    return NextResponse.json({
      success: true,
      cached: false,
      recommendation: parsed,
      engine: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    // =========================================================================
    // BƯỚC 3: ERROR HANDLING
    // =========================================================================
    console.error('API route exception caught:', error?.message);
    return NextResponse.json(
      { error: error?.message || 'Lỗi máy chủ' },
      { status: 500 }
    );
  }
}
