/**
 * ============================================================================
 * NEXT.JS APP ROUTER API ROUTE REFERENCE
 * Path in Next.js: /app/api/recommend-outfit/route.ts
 * ============================================================================
 * 
 * This route demonstrates how to:
 * 1. Authenticate with Supabase server client.
 * 2. Query user preferences, past ratings history, and available outfits.
 * 3. Leverage Google Gemini API (@google/genai) to select the optimal outfit match.
 * 4. Record the recommendation in the suggestions_history table.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Server-side initialization of Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, eventContext } = body;

    if (!userId || !eventContext) {
      return Response.json(
        { error: 'Missing userId or eventContext parameters' },
        { status: 400 }
      );
    }

    // 1. Initialize Supabase Server Client (Service role or anon with bearer token)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch User Style Preferences
    const { data: userPreferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      console.warn('Error fetching preferences:', prefError);
    }

    // 3. Fetch User Past Ratings History (Learning context)
    const { data: pastHistory, error: historyError } = await supabase
      .from('suggestions_history')
      .select('event_name, event_type, rating, outfit:outfits(name, style_tags, colors)')
      .eq('user_id', userId)
      .not('rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (historyError) {
      console.warn('Error fetching past history:', historyError);
    }

    // 4. Fetch Available Outfits from Inventory
    const { data: outfits, error: outfitsError } = await supabase
      .from('outfits')
      .select('*');

    if (outfitsError || !outfits || outfits.length === 0) {
      return Response.json(
        { error: 'No outfits found in wardrobe catalog' },
        { status: 404 }
      );
    }

    // 5. Construct AI Prompt with Sartorial Intelligence
    const pastRatingsSummary = (pastHistory || []).map((h: any) => {
      const outfitName = h.outfit?.name || 'Outfit';
      return `- Rated "${outfitName}" ${h.rating}/5 stars for a ${h.event_type} event ("${h.event_name}").`;
    }).join('\n') || 'No past rating feedback recorded yet.';

    const catalogSummary = outfits.map((o: any) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      event_types: o.event_types,
      style_tags: o.style_tags,
      colors: o.colors,
    }));

    const systemInstruction = `You are VieStyle's Chief AI Stylist and Vietnamese Traditional Outfit Club Director.
Your task is to recommend the single best outfit from the inventory that best matches the event context and user personality.
Incorporate past rating feedback: if the user gave 4 or 5 stars to certain styles/colors for similar events, favor those elements.
If they gave 1 or 2 stars, avoid those silhouettes and styling elements.
Always select a valid outfit ID that exists in the provided inventory list.`;

    const userPrompt = `
=== USER PROFILE ===
Name: ${userPreferences?.name || 'Client'}
Age: ${userPreferences?.age || 'Unspecified'}
Personality: ${userPreferences?.personalities?.join(', ') || 'Sophisticated, Modern'}
Hobbies: ${userPreferences?.hobbies?.join(', ') || 'Arts, Socializing'}
Favorite Color: ${userPreferences?.favourite_color || 'Neutral tones'}

=== TARGET EVENT CONTEXT ===
Event Name: ${eventContext.event_name}
Place / Venue: ${eventContext.event_place}
Event Type: ${eventContext.event_type}
Dress Code / Notes: ${eventContext.dress_code || 'Standard for event type'}

=== PAST USER FEEDBACK (AI LEARNING) ===
${pastRatingsSummary}

=== AVAILABLE OUTFIT INVENTORY ===
${JSON.stringify(catalogSummary, null, 2)}

Select the optimal outfit ID and return your recommendation in JSON format.
`;

    // 6. Call Gemini API with structured JSON Schema
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            selected_outfit_id: {
              type: Type.STRING,
              description: 'The exact ID of the best matching outfit from the inventory',
            },
            match_score: {
              type: Type.INTEGER,
              description: 'Compatibility score between 70 and 99 based on criteria fit',
            },
            ai_reasoning: {
              type: Type.STRING,
              description: 'Detailed explanation of why this outfit was selected for this specific venue, event type, and personal aesthetic',
            },
            styling_tips: {
              type: Type.STRING,
              description: 'Specific advice on footwear, jewelry, accessories, outer layer, and color accents',
            },
            alternative_outfit_id: {
              type: Type.STRING,
              description: 'A secondary alternative outfit ID from the inventory',
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

    const recommendationData = JSON.parse(response.text || '{}');

    // 7. Save the recommendation in suggestions_history
    const { data: savedHistory, error: saveError } = await supabase
      .from('suggestions_history')
      .insert([
        {
          user_id: userId,
          outfit_id: recommendationData.selected_outfit_id,
          event_name: eventContext.event_name,
          event_place: eventContext.event_place,
          event_type: eventContext.event_type,
          rating: null,
          ai_reasoning: recommendationData.ai_reasoning,
          styling_tips: recommendationData.styling_tips,
        },
      ])
      .select('*, outfit:outfits(*)')
      .single();

    if (saveError) {
      console.warn('Error recording suggestion to Supabase:', saveError);
    }

    return Response.json({
      success: true,
      recommendation: recommendationData,
      savedRecord: savedHistory,
    });
  } catch (error: any) {
    console.error('Error in /api/recommend-outfit:', error);
    return Response.json(
      { error: error?.message || 'Failed to generate recommendation' },
      { status: 500 }
    );
  }
}
