import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

/**
 * Next.js App Router API Route: /api/recommend-outfit
 * Wraps @google/genai completely in try...catch and always returns JSON
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_profile, event_context, past_ratings, mix_history, available_outfits } = body || {};

    if (!event_context || !available_outfits || !Array.isArray(available_outfits) || available_outfits.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: event_context and available_outfits.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    let ai: GoogleGenAI;
    try {
      ai = new GoogleGenAI({ apiKey });
    } catch (clientErr: any) {
      return NextResponse.json(
        { error: clientErr?.message || 'Failed to initialize Google GenAI client.' },
        { status: 500 }
      );
    }

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
3. Provide an elevated, articulate, high-fashion explanation for the choice, and concrete styling tips.`;

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

=== USER'S HISTORICAL RATINGS ===
${pastRatingsText}

=== USER'S MIX & MATCH EXPERIMENTS ===
${mixHistoryText}

=== AVAILABLE WARDROBE INVENTORY ===
${JSON.stringify(catalogSummary, null, 2)}
`;

    // Wrap the exact @google/genai call in try...catch
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
      console.error('Call to @google/genai in Next.js route caught:', genaiErr?.message);
      return NextResponse.json(
        { error: genaiErr?.message || 'Lỗi kết nối từ Gemini AI.' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(response.text || '{}');
    const exists = available_outfits.some((o: any) => o.id === parsed.selected_outfit_id);
    if (!exists) {
      parsed.selected_outfit_id = available_outfits[0].id;
    }

    return NextResponse.json({
      success: true,
      recommendation: parsed,
      engine: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('API route exception caught:', error?.message);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
