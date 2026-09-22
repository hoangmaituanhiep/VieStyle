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

// API Route: Outfit Recommendation Engine
app.post('/api/recommend-outfit', async (req, res) => {
  try {
    const { user_profile, event_context, past_ratings, available_outfits } = req.body;

    if (!event_context || !available_outfits || !Array.isArray(available_outfits) || available_outfits.length === 0) {
      return res.status(400).json({
        error: 'Missing required parameters: event_context and available_outfits are required.',
      });
    }

    const ai = getGeminiClient();

    // If Gemini API Key is missing or user wants smart fallback
    if (!ai) {
      console.warn('GEMINI_API_KEY not configured. Using rule-based sartorial recommendation matching.');
      const fallbackRec = generateRuleBasedRecommendation(user_profile, event_context, past_ratings, available_outfits);
      return res.json(fallbackRec);
    }

    // Format past ratings learning context
    const pastRatingsText = (past_ratings || []).map((r: any) => {
      const outfitName = r.outfit_name || r.outfit?.name || 'Outfit';
      const eventType = r.event_type || 'event';
      const rating = r.rating || 3;
      return `- User rated "${outfitName}" ${rating}/5 stars for a ${eventType} event. Notes: ${r.notes || 'None'}`;
    }).join('\n') || 'No past rating records yet. Treat user preferences with primary priority.';

    // Format outfit catalog for LLM
    const catalogSummary = available_outfits.map((o: any) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      event_types: o.event_types || [],
      style_tags: o.style_tags || [],
      colors: o.colors || [],
    }));

    const systemInstruction = `You are VieStyle's Chief AI Stylist and Vietnamese Traditional Outfit Club Director.
Your task is to select the single optimal outfit from the provided catalog that best complements the user's personal aesthetic, age, hobbies, favorite color, and especially the specific event context (venue, formality, and event type).

Crucial Instruction:
1. Pay deep attention to the user's PAST RATINGS. If the user previously rated tailored or minimalist styles 5 stars for formal events, heavily favor similar aesthetics. If they gave 1 or 2 stars to certain styles, avoid them.
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

=== AVAILABLE WARDROBE INVENTORY ===
${JSON.stringify(catalogSummary, null, 2)}

Analyze the inventory, cross-reference the event venue and past user ratings, select the optimal outfit ID, and return the structured recommendation.
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
              description: 'Expert fashion rationale explaining why this piece fits the venue, event type, personal aesthetic, and past rating preferences',
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
      req.body.available_outfits
    );
    return res.json({
      ...fallback,
      engine: 'fallback_heuristic',
      notice: 'Generated using sartorial heuristics engine.',
    });
  }
});

// Heuristic fallback matching engine
function generateRuleBasedRecommendation(
  userProfile: any,
  eventContext: any,
  pastRatings: any[],
  outfits: any[]
) {
  const eventType = (eventContext?.event_type || '').toLowerCase();
  const eventName = (eventContext?.event_name || '').toLowerCase();
  const eventPlace = (eventContext?.event_place || '').toLowerCase();
  const favColor = (userProfile?.favourite_color || '').toLowerCase();
  const personalities = (userProfile?.personalities || []).map((p: string) => p.toLowerCase());

  let bestMatch = outfits[0];
  let highestScore = -1;

  for (const outfit of outfits) {
    let score = 50;

    // Event type match
    const eventTypes = (outfit.event_types || []).map((e: string) => e.toLowerCase());
    if (eventTypes.includes(eventType)) score += 30;

    // Place / text keyword match
    const desc = outfit.description.toLowerCase();
    const name = outfit.name.toLowerCase();
    if (desc.includes(eventType) || name.includes(eventType)) score += 10;
    if (eventName && (desc.includes(eventName) || name.includes(eventName))) score += 5;

    // Color match
    const colors = (outfit.colors || []).map((c: string) => c.toLowerCase());
    if (favColor && colors.some((c: string) => c.includes(favColor) || favColor.includes(c))) {
      score += 15;
    }

    // Style tags match with personalities
    const tags = (outfit.style_tags || []).map((t: string) => t.toLowerCase());
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
      ai_reasoning: `The "${bestMatch.name}" creates an exquisite equilibrium for ${eventContext.event_name} at ${eventContext.event_place}. Its ${bestMatch.style_tags?.slice(0, 2).join(' and ')} characteristics harmonize seamlessly with your ${userProfile?.personalities?.[0] || 'discerning'} aesthetic while honoring the ${eventContext.event_type} formality requirements.`,
      styling_tips: `Pair with structured leather footwear in complimentary dark tones, a minimalist timepiece, and let the clean silhouette speak without excess ornamentation.`,
      alternative_outfit_id: alternative.id,
      vibe_keywords: bestMatch.style_tags?.slice(0, 3) || ['Refined', 'Tailored', 'Contemporary'],
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
