import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

/**
 * Next.js App Router API Route: /api/generate-outfit-image
 * Uses Google Gemini API (Imagen 3 / gemini-3.1-flash-image)
 * Reads GEMINI_API_KEY from environment variables
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      garment_type,
      accessories,
      primary_color,
      secondary_color,
      background_vibe,
      style_notes,
    } = body;

    if (!garment_type || !primary_color) {
      return NextResponse.json(
        { error: 'Missing required fields: garment_type and primary_color are required.' },
        { status: 400 }
      );
    }

    const accessoriesText =
      Array.isArray(accessories) && accessories.length > 0
        ? accessories.join(', ')
        : 'traditional Vietnamese minimalist fine jewelry';

    const colorScheme = secondary_color
      ? `${primary_color} harmonized with accents of ${secondary_color}`
      : primary_color;

    const settingText =
      background_vibe || 'minimalist ancient Vietnamese heritage courtyard architecture';

    // Construct high-fashion editorial descriptive prompt
    const prompt = `A high-fashion magazine editorial full-length photograph of an elegant Vietnamese fashion model wearing authentic high-couture Vietnamese traditional costume: ${garment_type}. The garment is crafted in exquisite raw silk and brocade in ${colorScheme}. Styled with traditional Vietnamese accessories: ${accessoriesText}. Set against ${settingText} with soft directional daylight, subtle shadows, realistic silk texture drapery, cinematic lighting, 8k resolution, minimalist Vogue editorial aesthetics, hyper-detailed photography, authentic Vietnamese cultural heritage.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not defined in environment variables.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Call Google Gemini API (Imagen 3 / gemini-3.1-flash-image)
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: '3:4',
        },
      },
    });

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image data returned from Gemini API.', prompt_used: prompt },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      prompt_used: prompt,
      model: 'gemini-3.1-flash-image',
      garment_type,
      accessories: Array.isArray(accessories) ? accessories : [],
      primary_color,
      secondary_color: secondary_color || null,
      background_vibe: settingText,
    });
  } catch (error: any) {
    console.error('Error in Next.js App Router generate-outfit-image:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate outfit image.' },
      { status: 500 }
    );
  }
}
