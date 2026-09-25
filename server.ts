import express from 'express';
import path from 'path';
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

        // 1.1 Thử tìm khớp chính xác event_type và event_place
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

        // 1.2 Nếu chưa thấy, tìm gợi ý gần nhất theo event_type
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

        // CACHE HIT: Nếu tìm thấy bản ghi có outfit_id hợp lệ
        if (cachedRow && cachedRow.outfit_id) {
          const cachedOutfitId = String(cachedRow.outfit_id).trim();
          const matchedOutfit = available_outfits.find((o: any) => o.id === cachedOutfitId) || available_outfits[0];

          console.log(`⚡ [Cache Hit] Trả về outfit_id (${matchedOutfit.id}) từ suggestions_history cho dịp: "${inputEventType}". BỎ QUA Gemini API.`);

          return res.json({
            success: true,
            cached: true,
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

    const catalogSummary = available_outfits.map((o: any) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      event_types: safeArray(o.event_types),
      style_tags: safeArray(o.style_tags),
      colors: safeArray(o.colors),
    }));

    const systemInstruction = `You are VieStyle's Chief AI Stylist and Vietnamese Traditional Outfit Club Director.
Your task is to select the single optimal outfit from the provided catalog that best complements the user's personal aesthetic, age, hobbies, favorite color, and especially the specific event context (venue, formality, and event type).

Crucial Instructions:
1. Pay deep attention to BOTH the user's PAST RATINGS and their recent MIX & MATCH STUDIO EXPERIMENTS.
2. The selected_outfit_id MUST be an exact 'id' from the provided inventory list. Do not make up non-existent IDs.
3. Provide an elevated, articulate, high-fashion explanation for the choice, and concrete styling tips (footwear, jewelry/watch, outerwear, grooming, and color accents).`;

    const userPrompt = `
=== CLIENT STYLE PROFILE ===
Name: ${user_profile?.name || 'Client'}
Age: ${user_profile?.age || '??'}
Style Personalities: ${user_profile?.personalities?.join(', ') || 'Chic, Minimalist'}
Hobbies & Interests: ${user_profile?.hobbies?.join(', ') || 'Art, Dining, Travel'}
Favorite Color: ${user_profile?.favourite_color || 'Light Yellow'}

=== UPCOMING EVENT CONTEXT ===
Event Name: ${event_context.event_name}
Place / Venue: ${event_context.event_place}
Event Type: ${event_context.event_type}
Dress Code / Notes: ${event_context.dress_code || 'Appropriate for venue'}
Weather / Season: ${event_context.weather_notes || 'Pleasant'}

=== USER'S HISTORICAL RATINGS (LEARNING CONTEXT) ===
${pastRatingsText}

=== USER'S MIX & MATCH STUDIO EXPERIMENTS (AESTHETIC TASTE CONTEXT) ===
${mixHistoryText}

=== AVAILABLE WARDROBE INVENTORY ===
${JSON.stringify(catalogSummary, null, 2)}

Analyze the inventory, cross-reference the event venue, past user ratings, and mix & match styling history. Select the optimal outfit ID, and return the structured recommendation.
`;

    let response;
    try {
      // Ưu tiên bản gemini-3.8-flash
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
              selected_outfit_id: {
                type: Type.STRING,
                description: 'The exact ID of the best matching outfit from the provided catalog',
              },
              match_score: {
                type: Type.INTEGER,
                description: 'Sartorial compatibility score between 80 and 99',
              },
              ai_reasoning: {
                type: Type.STRING,
                description: 'Expert fashion rationale explaining why this piece fits the venue, event type, personal aesthetic, past ratings, and mix & match history',
              },
              styling_tips: {
                type: Type.STRING,
                description: 'Actionable high-fashion styling advice on footwear, jewelry, layering, and color harmony',
              },
              alternative_outfit_id: {
                type: Type.STRING,
                description: 'A second viable alternative outfit ID from the catalog',
              },
              vibe_keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-4 concise aesthetic keywords describing the look',
              },
            },
            required: ['selected_outfit_id', 'match_score', 'ai_reasoning', 'styling_tips'],
          },
        },
      });
    } catch (genaiError: any) {
      console.error('Call to Gemini Flash failed:', genaiError?.message);
      return res.status(500).json({
        error: genaiError?.message || 'Lỗi máy chủ',
      });
    }

    const parsed = JSON.parse(response.text || '{}');

    // Validate that the returned ID actually exists in available outfits
    const exists = available_outfits.some((o: any) => o.id === parsed.selected_outfit_id);
    if (!exists) {
      parsed.selected_outfit_id = available_outfits[0].id;
    }

    // Lưu kết quả này vào bảng suggestions_history để làm Caching cho những user/lần sau
    if (supabase) {
      try {
        const cacheUserId = user_id || user_profile?.id || 'dae05a68-ee99-470f-8f17-7db434e65f8d';
        // RÀNG BUỘC INSERT: CHỈ DÙNG các cột hợp lệ: user_id, outfit_id, event_name, event_place, event_type
        const cachePayload = {
          user_id: cacheUserId,
          outfit_id: parsed.selected_outfit_id,
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
          console.log(`[Cache Miss -> Stored] Đã lưu caching outfit_id vào suggestions_history cho dịp: ${inputEventType}`);
        }
      } catch (cacheSaveErr: any) {
        console.warn('Lỗi ghi cache suggestions_history:', cacheSaveErr?.message);
      }
    }

    return res.json({
      success: true,
      cached: false,
      recommendation: parsed,
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

// API Route: AI Mix & Match Image Generation (Gemini 1.5 Flash Prompt Generator + Pollinations.ai)
app.post('/api/generate-outfit-image', async (req, res) => {
  try {
    const {
      garment_type,
      accessories,
      primary_color,
      secondary_color,
      background_vibe,
      style_notes,
    } = req.body || {};

    if (!garment_type || !primary_color) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: garment_type hoặc primary_color.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Lỗi server: Chưa cấu hình GEMINI_API_KEY.');
      return res.status(500).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên môi trường máy chủ.',
      });
    }

    const accessoriesText = Array.isArray(accessories) && accessories.length > 0
      ? accessories.join(', ')
      : 'minimalist fine silver traditional Vietnamese ornaments';

    const colorScheme = secondary_color
      ? `${primary_color} harmonized with accents of ${secondary_color}`
      : primary_color;

    const settingText = background_vibe || 'minimalist ancient Vietnamese heritage courtyard architecture';

    const userPrompt = `Dựa trên các tuỳ chọn phối đồ này, hãy viết một câu miêu tả hình ảnh bằng TIẾNG ANH (Image Prompt) thật chi tiết, mang phong cách thời trang cao cấp (high-fashion editorial), rõ ràng về màu sắc và chất liệu truyền thống Việt Nam. CHỈ trả về câu prompt, không giải thích.

Thông tin phối đồ:
- Trang phục: ${garment_type}
- Màu sắc chủ đạo: ${primary_color}
- Màu sắc điểm xuyết: ${secondary_color || 'Không'}
- Phụ kiện truyền thống: ${accessoriesText}
- Bối cảnh: ${settingText}
${style_notes ? `- Ghi chú phong cách: ${style_notes}` : ''}`.trim();

    // Sinh prompt chi tiết bằng gemini-3.8-flash
    let promptText = '';
    try {
      const ai = getGeminiClient();
      if (ai) {
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
        });
        promptText = (geminiRes.text || '').trim();
      }
    } catch (genErr: any) {
      console.warn('Gemini client attempt error, trying standard fallback prompt...', genErr?.message);
    }

    // Nếu Gemini không trả về prompt, sử dụng prompt dự phòng chuẩn xác
    if (!promptText) {
      promptText = `A high-fashion magazine editorial photograph of an elegant Vietnamese model in authentic ${garment_type}, crafted in raw silk and brocade in ${colorScheme}, styled with ${accessoriesText}, set against ${settingText}, cinematic lighting, 8k resolution, minimalist Vogue editorial aesthetics`;
    }

    // Mã hoá prompt bằng encodeURIComponent()
    const encodedPrompt = encodeURIComponent(promptText);

    // Tạo URL ảnh tĩnh qua Pollinations.ai
    const finalImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=1000&nologo=true`;

    return res.json({
      success: true,
      imageUrl: finalImageUrl,
      image_url: finalImageUrl,
      prompt_used: promptText,
    });
  } catch (error: any) {
    console.error('Outfit image generation server error:', error);
    return res.status(500).json({
      error: error?.message || 'Lỗi máy chủ không xác định khi tạo ảnh.',
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
    console.log(`AuraStyle Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
