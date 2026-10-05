import express from 'express';
import path from 'path';
import axios from 'axios';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// CommonJS build compatibility (avoid import.meta warning in CJS format)
const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Initialize Supabase Server Client for Caching
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

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// API Route: Outfit Recommendation Engine with Supabase Database Caching
app.post('/api/recommend-outfit', async (req, res) => {
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
        error: 'Missing required parameters: event_context and available_outfits are required.',
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

        // 1.1 Thử tìm khớp chính xác event_name, event_type và event_place
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

        // CACHE HIT: Nếu tìm thấy bản ghi có outfit_id hợp lệ
        if (cachedRow && cachedRow.outfit_id) {
          const cachedOutfitId = String(cachedRow.outfit_id).trim();
          const matchedOutfit = available_outfits.find((o: any) => o.id === cachedOutfitId) || available_outfits[0];

          console.log(`⚡ [Cache Hit] Trả về outfit_id (${matchedOutfit.id}) từ suggestions_history cho dịp: "${inputEventType}". BỎ QUA Gemini API.`);

          return res.json({
            success: true,
            cached: true,
            outfit_id: matchedOutfit.id,
            recommendation: {
              selected_outfit_id: matchedOutfit.id,
              match_score: 96,
              ai_reasoning: `Gợi ý được đồng bộ tức thì từ cơ sở dữ liệu kinh nghiệm VieStyle cho dịp ${inputEventType} tại ${inputEventPlace || 'không gian tương tự'}. Thiết kế "${matchedOutfit.name}" bảo chứng sự hoàn mỹ và đúng chuẩn nghi thức.`,
              styling_tips: `Giữ phom dáng thanh thoát, kết hợp hài nhung truyền thống và điểm xuyết trang sức tối giản để tôn vinh chất liệu.`,
              alternative_outfit_id: available_outfits.find((o: any) => o.id !== matchedOutfit.id)?.id || matchedOutfit.id,
              vibe_keywords: ['Di Sản', 'Đúng Chuẩn', 'Kinh Nghiệm'],
            },
            engine: 'supabase_cache_hit',
          });
        }
      } catch (cacheErr: any) {
        console.warn('Lỗi kiểm tra cache Supabase (chuyển sang gọi AI):', cacheErr?.message);
      }
    }

    // =========================================================================
    // BƯỚC 2: GỌI AI & LƯU CACHING (CACHE MISS)
    // =========================================================================
    const ai = getGeminiClient();

    // If Gemini API Key is missing, use intelligent rule-based engine
    if (!ai) {
      console.warn('GEMINI_API_KEY not configured. Using rule-based sartorial recommendation matching.');
      const fallbackRec = generateRuleBasedRecommendation(user_profile, event_context, past_ratings, mix_history, available_outfits);
      return res.json(fallbackRec);
    }

    // Format past ratings learning context
    const pastRatingsText = (past_ratings || []).map((r: any) => {
      const outfitName = r.outfit_name || r.outfit?.name || 'Outfit';
      const eventType = r.event_type || 'event';
      const rating = r.rating || 3;
      return `- Đánh giá trước: "${outfitName}" được ${rating}/5 sao cho dịp ${eventType}. Ghi chú: ${r.notes || 'Không'}`;
    }).join('\n') || 'Chưa có lịch sử đánh giá. Dựa trên thông tin phong cách ưu tiên.';

    // Format mix & match studio experiments learning context
    const mixHistoryText = (mix_history || []).slice(0, 6).map((m: any) => {
      const garment = m.garment_type || 'Trang phục';
      const colors = [m.primary_color, m.secondary_color].filter(Boolean).join(' & ');
      const acc = Array.isArray(m.accessories) && m.accessories.length > 0 ? m.accessories.join(', ') : 'Tối giản';
      const bg = m.background_vibe || 'Không gian truyền thống';
      return `- Thử nghiệm phối đồ: "${garment}" | Tông màu: ${colors} | Phụ kiện: ${acc} | Bối cảnh: ${bg}`;
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

    // Mảng dữ liệu trang phục đầy đủ gửi tới AI để hiểu rõ kiểu dáng, hoa văn, chất liệu
    const compactCatalog = available_outfits.map((o: any) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      event_types: safeArray(o.event_types),
      style_tags: safeArray(o.style_tags),
      colors: safeArray(o.colors),
    }));

    // System Prompt chuyên gia Cổ Phục & chống thiên kiến Áo Dài
    const systemInstruction = `Bạn là một chuyên gia hàng đầu về Cổ phục và Trang phục truyền thống Việt Nam.

TUYỆT ĐỐI KHÔNG được lạm dụng Áo Dài. Bạn PHẢI xem xét và ưu tiên gợi ý các loại trang phục đa dạng khác dựa trên tiêu chí của người dùng, bao gồm nhưng không giới hạn: Áo Tấc (cho dịp trang trọng), Áo Nhật Bình (cho hoàng tộc/sang trọng), Áo Giao Lĩnh (thời Lê/cổ điển), Áo Viên Lĩnh, Áo Tứ Thân (dân dã/hội hè Bắc Bộ), Áo Ngũ Thân tay chẽn, Yếm lụa, Áo Mớ Ba Mớ Bảy.

Chỉ thị bắt buộc:
1. Phân tích ngữ cảnh và lý do chọn lựa (ai_reasoning): Hãy phân tích sâu sắc tại sao bộ trang phục đó (như Áo Tấc, Nhật Bình, Giao Lĩnh, Viên Lĩnh, Tứ Thân, Ngũ Thân...) lại phù hợp hoàn hảo với tính chất sự kiện, không gian địa điểm, tính cách và thời tiết của người dùng thay vì chỉ chọn Áo Dài theo thói quen. CHỈ chọn Áo Dài khi tiêu chí người dùng thực sự chỉ phù hợp với Áo Dài hoặc người dùng chỉ định rõ.
2. outfit_id BẮT BUỘC phải là một 'id' chính xác có trong danh sách trang phục được cung cấp. Tuyệt đối không tự bịa ID.
3. Cung cấp match_score (85-99), ai_reasoning tinh tế đậm đà văn hóa và styling_tips phụ kiện chi tiết.`;

    // Câu lệnh prompt yêu cầu AI theo chuẩn tối ưu cực hạn
    const userPrompt = `Dựa vào hồ sơ người dùng và hoàn cảnh sự kiện dưới đây, hãy chọn ra 1 trang phục cổ phục / truyền thống phù hợp nhất từ kho trang phục.

Yêu cầu người dùng:
- Sự kiện: ${inputEventName || ''} (${inputEventType || ''})
- Địa điểm: ${inputEventPlace || ''}
${event_context.dress_code ? `- Dress code: ${event_context.dress_code}` : ''}
${event_context.weather_notes ? `- Thời tiết / Bối cảnh: ${event_context.weather_notes}` : ''}
${user_profile?.favourite_color ? `- Màu ưa thích: ${user_profile.favourite_color}` : ''}
${user_profile?.personalities?.length ? `- Phong cách: ${user_profile.personalities.join(', ')}` : ''}
${user_profile?.hobbies?.length ? `- Sở thích: ${user_profile.hobbies.join(', ')}` : ''}

Lịch sử đánh giá của người dùng:
${pastRatingsText}

Thử nghiệm Mix & Match gần đây:
${mixHistoryText}

Danh sách trang phục trong kho:
${JSON.stringify(compactCatalog, null, 2)}`;

    let response;
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.35,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                outfit_id: { type: Type.STRING },
                match_score: { type: Type.INTEGER },
                ai_reasoning: { type: Type.STRING },
                styling_tips: { type: Type.STRING },
                vibe_keywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['outfit_id', 'ai_reasoning', 'styling_tips'],
            },
          },
        });
        if (response) break;
      } catch (err: any) {
        lastError = err;
        const isDemand = err?.message?.includes('503') || err?.message?.includes('high demand') || err?.status === 503;
        if (attempt === 0 && isDemand) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        break;
      }
    }

    if (!response) {
      console.warn('Gemini Flash call encountered issue, falling back to heuristic engine:', lastError?.message);
      const fallbackRec = generateRuleBasedRecommendation(user_profile, event_context, past_ratings, mix_history, available_outfits);
      return res.json({
        ...fallbackRec,
        engine: 'fallback_heuristic',
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
    // Validate that the returned ID actually exists in available outfits
    const exists = available_outfits.some((o: any) => o.id === selectedOutfitId);
    if (!exists) {
      selectedOutfitId = available_outfits[0].id;
    }

    const matchedOutfit = available_outfits.find((o: any) => o.id === selectedOutfitId);

    // Lưu kết quả này vào bảng suggestions_history để làm Caching cho những user/lần sau
    if (supabase) {
      try {
        const cacheUserId = user_id || user_profile?.id || 'dae05a68-ee99-470f-8f17-7db434e65f8d';
        // RÀNG BUỘC INSERT: CHỈ DÙNG các cột hợp lệ: user_id, outfit_id, event_name, event_place, event_type
        const cachePayload = {
          user_id: cacheUserId,
          outfit_id: selectedOutfitId,
          event_name: inputEventName || 'Sự kiện',
          event_place: inputEventPlace || 'Địa điểm',
          event_type: inputEventType,
        };

        const { error: insertCacheErr } = await supabase
          .from('suggestions_history')
          .insert([cachePayload]);

        if (insertCacheErr) {
          console.warn('Lỗi ghi suggestions_history cache:', insertCacheErr.message);
        } else {
          console.log(`[Cache Miss -> Stored] Đã lưu caching outfit_id (${selectedOutfitId}) vào suggestions_history cho dịp: ${inputEventType}`);
        }
      } catch (cacheSaveErr: any) {
        console.warn('Lỗi ghi cache suggestions_history:', cacheSaveErr?.message);
      }
    }

    return res.json({
      success: true,
      cached: false,
      outfit_id: selectedOutfitId,
      recommendation: {
        selected_outfit_id: selectedOutfitId,
        match_score: parsed?.match_score || 95,
        ai_reasoning: parsed?.ai_reasoning || `Thiết kế "${matchedOutfit?.name || 'Cổ phục'}" mang lại phong thái trang nhã, đúng chuẩn mực nghi thức cho ${inputEventName || inputEventType} tại ${inputEventPlace || 'không gian sự kiện'}.`,
        styling_tips: parsed?.styling_tips || `Kết hợp cùng hài nhung truyền thống, trang sức bạc đúc thủ công và giữ nét chỉn chu trong từng tà áo.`,
        alternative_outfit_id: available_outfits.find((o: any) => o.id !== selectedOutfitId)?.id || selectedOutfitId,
        vibe_keywords: parsed?.vibe_keywords || ['Cổ Phục', 'Di Sản', 'Đúng Chuẩn'],
      },
      engine: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    // =========================================================================
    // BƯỚC 3: ĐẢM BẢO ĐỘ BỀN BỈ (ERROR HANDLING)
    // =========================================================================
    console.error('API Route /api/recommend-outfit fatal error:', error?.message);
    return res.status(500).json({
      error: error?.message || 'Lỗi máy chủ',
    });
  }
});

// API Route: Provide Supabase connection configuration if configured on server
app.get('/api/supabase-config', (req, res) => {
  res.json({
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    key: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  });
});

// API Route: AI Mix & Match Image Generation (Self-Hosted Stable Diffusion XL via Google Colab & Ngrok)
app.post('/api/generate-outfit-image', async (req, res) => {
  try {
    const {
      garment_type = 'traditional Vietnamese dress',
      accessories = [],
      primary_color = 'Crimson Red',
      secondary_color,
      background_vibe,
      style_notes,
    } = req.body || {};

    // 1. Fallback & chuẩn hóa các biến
    const accessoriesText =
      Array.isArray(accessories) && accessories.length > 0
        ? accessories.join(', ')
        : 'traditional Vietnamese silver filigree jewelry';

    const colorScheme = secondary_color
      ? `${primary_color} with accents of ${secondary_color}`
      : `monochromatic ${primary_color}`;

    const settingText =
      background_vibe || 'courtyard of Imperial Citadel of Hue with ancient weathered moss-stone architecture';

    const styleNotesText = style_notes || '';

    // Master Prompt Template góc rộng lấy cảnh sắc nét (35mm f/8)
    const promptText = `Photorealistic, RAW photo, Fujifilm XT4, 35mm wide-angle lens, f/8, natural cinematic lighting, wide environmental shot. Full-body wide shot of a gorgeous Vietnamese model wearing authentic traditional Vietnamese clothing: ${garment_type}. The outfit features premium flowing silk and intricate cultural patterns, meticulously crafted in ${colorScheme}. She is gracefully styled with ${accessoriesText}. She is standing gracefully in ${settingText}. The breathtaking background architecture and scenery are clearly visible, expansive, and in sharp focus. Hyperrealistic fabric texture, vivid colors, editorial high-fashion composition, 8k resolution, ultra-detailed environment${styleNotesText ? ', ' + styleNotesText : ''}.`;

    // 2. Gọi Server Colab Ngrok bằng axios (không cần Authorization)
    const response = await axios.post(
      'https://correct-posh-juice.ngrok-free.dev/api/generate',
      { inputs: promptText },
      {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        responseType: 'arraybuffer',
        timeout: 180000,
      }
    );

    // 3. Đọc dữ liệu nhị phân (Buffer) và chuyển sang Base64
    const mimeType = (response.headers['content-type'] as string) || 'image/jpeg';
    const base64Image = Buffer.from(response.data).toString('base64');
    const finalImageUrl = `data:${mimeType};base64,${base64Image}`;

    return res.json({
      imageUrl: finalImageUrl,
      image_url: finalImageUrl,
      prompt_used: promptText,
    });
  } catch (error: any) {
    console.error('Outfit image generation server error:', error?.message);
    let errorMessage = error?.message || 'Lỗi máy chủ tạo ảnh SDXL';
    if (error?.response?.data) {
      try {
        errorMessage = Buffer.from(error.response.data).toString('utf-8');
      } catch {
        // fallback
      }
    }
    return res.status(error?.response?.status || 500).json({
      error: errorMessage,
    });
  }
});

// Heuristic fallback matching engine
function generateRuleBasedRecommendation(
  userProfile: any,
  eventContext: any,
  pastRatings: any[] = [],
  mixHistory: any[] = [],
  outfits: any[] = []
) {
  const eventType = (eventContext?.event_type || '').toLowerCase();
  const eventName = (eventContext?.event_name || '').toLowerCase();
  const favColor = (userProfile?.favourite_color || '').toLowerCase();
  const personalities = (userProfile?.personalities || []).map((p: string) => p.toLowerCase());

  let bestMatch = outfits[0];
  let highestScore = -1;

  const safeList = (v: any) => {
    if (Array.isArray(v)) return v.map((s) => String(s).toLowerCase().trim());
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t || t === 'null') return [];
      return t.split(',').map((s) => s.toLowerCase().trim()).filter(Boolean);
    }
    return [];
  };

  for (const outfit of outfits) {
    let score = 50;

    // Event type match
    const eventTypes = safeList(outfit.event_types);
    if (eventTypes.includes(eventType)) score += 30;

    // Place / text keyword match
    const desc = (outfit.description || '').toLowerCase();
    const name = (outfit.name || '').toLowerCase();
    if (desc.includes(eventType) || name.includes(eventType)) score += 10;
    if (eventName && (desc.includes(eventName) || name.includes(eventName))) score += 5;

    // Color match with user preferences
    const colors = safeList(outfit.colors);
    if (favColor && colors.some((c: string) => c.includes(favColor) || favColor.includes(c))) {
      score += 15;
    }

    // Style tags match with personalities
    const tags = safeList(outfit.style_tags);
    personalities.forEach((p: string) => {
      if (tags.some((t: string) => t.includes(p) || p.includes(t))) {
        score += 8;
      }
    });

    // Past rating influence
    if (Array.isArray(pastRatings)) {
      pastRatings.forEach((ratingItem: any) => {
        if (ratingItem.outfit_id === outfit.id || ratingItem.outfit?.id === outfit.id) {
          const userStars = ratingItem.rating || 3;
          if (userStars >= 4) score += 20;
          if (userStars <= 2) score -= 25;
        }
      });
    }

    // Personalization from Mix & Match Studio history
    if (Array.isArray(mixHistory) && mixHistory.length > 0) {
      mixHistory.forEach((mix: any) => {
        const garmentType = (mix.garment_type || '').toLowerCase();
        const primaryCol = (mix.primary_color || '').toLowerCase();
        // If outfit name or tags contain user's preferred mixed garment
        if (name.includes(garmentType) || desc.includes(garmentType) || tags.some((t: string) => garmentType.includes(t))) {
          score += 16;
        }
        // If outfit color matches user's mixed colors
        if (colors.some((c: string) => c.includes(primaryCol) || primaryCol.includes(c))) {
          score += 10;
        }
      });
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = outfit;
    }
  }

  const alternative = outfits.find((o) => o.id !== bestMatch.id) || outfits[1] || outfits[0];

  return {
    success: true,
    recommendation: {
      selected_outfit_id: bestMatch.id,
      match_score: Math.min(98, Math.max(84, Math.round(highestScore * 0.9))),
      ai_reasoning: `Thiết kế "${bestMatch.name}" mang lại sự cân bằng chuẩn mực cho ${eventContext.event_name} tại ${eventContext.event_place}. Tinh thần ${bestMatch.style_tags?.slice(0, 2).join(' và ') || 'truyền thống'} đồng điệu tuyệt đối với gu thẩm mỹ và phong cách thử nghiệm Mix & Match của bạn.`,
      styling_tips: `Kết hợp cùng hài nhung hoặc guốc mộc truyền thống, điểm xuyết kiềng bạc tinh giản, giữ phom dáng nguyên bản để tôn vinh chất liệu tơ tằm.`,
      alternative_outfit_id: alternative.id,
      vibe_keywords: bestMatch.style_tags?.slice(0, 3) || ['Chuẩn Mực', 'Di Sản', 'Đương Đại'],
    },
  };
}

// Start Server with Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VieStyle Server running on http://localhost:${PORT}`);
  });
}

startServer();
