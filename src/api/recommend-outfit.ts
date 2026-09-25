import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI, Type } from '@google/genai';

/**
 * Next.js Pages API Route: /api/recommend-outfit
 * Wraps @google/genai completely in try...catch and always returns JSON
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user_profile, event_context, past_ratings, mix_history, available_outfits } = req.body || {};

    if (!event_context || !available_outfits || !Array.isArray(available_outfits) || available_outfits.length === 0) {
      return res.status(400).json({
        error: 'Missing required parameters: event_context and available_outfits.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
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
      console.error('Call to @google/genai in Pages route caught:', genaiErr?.message);
      return res.status(500).json({
        error: genaiErr?.message || 'Lỗi kết nối từ Gemini AI.',
      });
    }

    const parsed = JSON.parse(response.text || '{}');
    const exists = available_outfits.some((o: any) => o.id === parsed.selected_outfit_id);
    if (!exists) {
      parsed.selected_outfit_id = available_outfits[0].id;
    }

    return res.status(200).json({
      success: true,
      recommendation: parsed,
      engine: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Pages route exception caught:', error?.message);
    return res.status(500).json({
      error: error?.message || 'Internal Server Error',
    });
  }
}
