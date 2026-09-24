import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// API Route: Outfit Recommendation Engine (Personalized with Past Ratings & Mix History)
app.post('/api/recommend-outfit', async (req, res) => {
  try {
    const { user_profile, event_context, past_ratings, mix_history, available_outfits } = req.body;

    if (!event_context || !available_outfits || !Array.isArray(available_outfits) || available_outfits.length === 0) {
      return res.status(400).json({
        error: 'Missing required parameters: event_context and available_outfits are required.',
      });
    }

    const ai = getGeminiClient();

    // If Gemini API Key is missing or fallback needed
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

    // Format outfit catalog for LLM
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
   - If the user has experimented with specific silhouettes (e.g., Áo Nhật Bình, Áo Tứ Thân, Áo Ngũ Thân, or Áo Dài), favorite color palettes, or accessories in their Mix & Match studio, heavily favor catalog outfits that resonate with those personal artistic inclinations.
   - If they gave 4-5 stars to certain styles in the past, reinforce that preference. If they gave 1-2 stars, avoid those silhouettes.
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

    const response = await ai.models.generateContent({
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

    const parsed = JSON.parse(response.text || '{}');

    // Validate that the returned ID actually exists in available outfits
    const exists = available_outfits.some((o: any) => o.id === parsed.selected_outfit_id);
    if (!exists) {
      parsed.selected_outfit_id = available_outfits[0].id;
    }

    return res.json({
      success: true,
      recommendation: parsed,
      engine: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Gemini recommendation error:', error);
    // Fallback to intelligent rule-based engine on error so user is never blocked
    const fallback = generateRuleBasedRecommendation(
      req.body.user_profile,
      req.body.event_context,
      req.body.past_ratings,
      req.body.mix_history,
      req.body.available_outfits
    );
    return res.json({
      ...fallback,
      engine: 'fallback_heuristic',
      notice: 'Generated using sartorial heuristics engine.',
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

// API Route: AI Mix & Match Image Generation (Google Gemini / Imagen API)
app.post('/api/generate-outfit-image', async (req, res) => {
  try {
    const {
      garment_type,
      accessories,
      primary_color,
      secondary_color,
      background_vibe,
      style_notes,
    } = req.body;

    if (!garment_type || !primary_color) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: garment_type hoặc primary_color.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên môi trường máy chủ. Vui lòng thêm key trong bảng Settings > Secrets.',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: 'Không thể khởi tạo Google GenAI client.' });
    }

    const accessoriesText = Array.isArray(accessories) && accessories.length > 0
      ? accessories.join(', ')
      : 'minimalist fine silver traditional Vietnamese ornaments';

    const colorScheme = secondary_color
      ? `${primary_color} harmonized with accents of ${secondary_color}`
      : primary_color;

    const settingText = background_vibe || 'minimalist ancient Vietnamese heritage courtyard architecture';

    // Crafted high-fashion editorial prompt for authentic Vietnamese traditional attire
    const editorialPrompt = `A high-fashion magazine editorial full-length photograph of an elegant Vietnamese fashion model wearing authentic high-couture Vietnamese traditional costume: ${garment_type}. The garment is crafted in exquisite raw silk and brocade in ${colorScheme}. Styled with traditional Vietnamese accessories: ${accessoriesText}. Set against ${settingText} with soft directional daylight, subtle shadows, realistic silk texture drapery, cinematic lighting, 8k resolution, minimalist Vogue editorial aesthetics, hyper-detailed photography, authentic Vietnamese cultural heritage. ${style_notes || ''}`.trim();

    let generatedImageUrl = '';
    let usedModel = 'gemini-3.1-flash-image';

    // Attempt generation with gemini-3.1-flash-image
    try {
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts: [{ text: editorialPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '3:4',
          },
        },
      });

      for (const part of aiResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          generatedImageUrl = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (primaryErr: any) {
      console.warn('Primary model (gemini-3.1-flash-image) attempt notice:', primaryErr?.message);
      
      // Fallback attempt with gemini-2.5-flash-image
      try {
        usedModel = 'gemini-2.5-flash-image';
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: editorialPrompt }],
          },
        });

        for (const part of fallbackResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData?.data) {
            generatedImageUrl = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch (fallbackErr: any) {
        console.error('Fallback model generation error:', fallbackErr?.message);
        throw new Error(
          primaryErr?.message?.includes('quota') || primaryErr?.message?.includes('RESOURCE_EXHAUSTED')
            ? 'Đã vượt hạn mức gọi API tạo ảnh Google Gemini. Vui lòng kiểm tra gói dịch vụ hoặc kích hoạt Billing.'
            : (primaryErr?.message || 'Không thể tạo hình ảnh qua Google Gemini API.')
        );
      }
    }

    if (!generatedImageUrl) {
      throw new Error('Mô hình Google Gemini không trả về dữ liệu ảnh hợp lệ.');
    }

    return res.json({
      success: true,
      image_url: generatedImageUrl,
      prompt_used: editorialPrompt,
      model: usedModel,
      garment_type,
      accessories: Array.isArray(accessories) ? accessories : [],
      primary_color,
      secondary_color: secondary_color || null,
      background_vibe: settingText,
    });
  } catch (error: any) {
    console.error('Outfit image generation error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate outfit image.' });
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
