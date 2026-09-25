import { NextResponse } from 'next/server';

/**
 * Next.js App Router API Route: /api/generate-outfit-image
 * Direct REST Fetch to Google Imagen 3 API with proper error forwarding (NO MOCK IMAGE)
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
    } = body || {};

    if (!garment_type || !primary_color) {
      return NextResponse.json(
        { error: 'Missing required fields: garment_type and primary_color are required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not defined in environment variables.' },
        { status: 500 }
      );
    }

    const accessoriesText =
      Array.isArray(accessories) && accessories.length > 0
        ? accessories.join(', ')
        : 'minimalist fine silver traditional Vietnamese ornaments';

    const colorScheme = secondary_color
      ? `${primary_color} harmonized with accents of ${secondary_color}`
      : primary_color;

    const settingText =
      background_vibe || 'minimalist ancient Vietnamese heritage courtyard architecture';

    const finalPrompt = `A high-fashion magazine editorial full-length photograph of an elegant Vietnamese fashion model wearing authentic high-couture Vietnamese traditional costume: ${garment_type}. The garment is crafted in exquisite raw silk and brocade in ${colorScheme}. Styled with traditional Vietnamese accessories: ${accessoriesText}. Set against ${settingText} with soft directional daylight, subtle shadows, realistic silk texture drapery, cinematic lighting, 8k resolution, minimalist Vogue editorial aesthetics, hyper-detailed photography, authentic Vietnamese cultural heritage. ${style_notes || ''}`.trim();

    const imagenEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`;

    let lastErrorMessage = '';
    let lastStatusCode = 500;

    try {
      const imagenResponse = await fetch(imagenEndpoint, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          numberOfImages: 1,
        }),
      });

      if (imagenResponse.ok) {
        const data = await imagenResponse.json();
        const base64Bytes =
          data?.generatedImages?.[0]?.image?.imageBytes ||
          data?.generatedImages?.[0]?.imageBytes ||
          data?.predictions?.[0]?.bytesBase64Encoded ||
          data?.predictions?.[0]?.image?.imageBytes;

        if (base64Bytes) {
          const imageUrl =
            typeof base64Bytes === 'string' && base64Bytes.startsWith('data:')
              ? base64Bytes
              : `data:image/jpeg;base64,${base64Bytes}`;

          return NextResponse.json({
            success: true,
            image_url: imageUrl,
            prompt_used: finalPrompt,
            model: 'imagen-3.0-generate-001',
            garment_type,
            accessories: Array.isArray(accessories) ? accessories : [],
            primary_color,
            secondary_color: secondary_color || null,
            background_vibe: settingText,
          });
        }
      } else {
        lastStatusCode = imagenResponse.status;
        try {
          const errJson = await imagenResponse.json();
          lastErrorMessage = errJson?.error?.message || errJson?.message || `Google Imagen API HTTP ${imagenResponse.status}`;
        } catch {
          const errText = await imagenResponse.text().catch(() => '');
          lastErrorMessage = errText || `Google Imagen API HTTP ${imagenResponse.status}`;
        }
      }
    } catch (fetchErr: any) {
      lastErrorMessage = fetchErr?.message || 'Lỗi kết nối khi gọi Imagen API';
    }

    const formattedError = `Google Imagen API HTTP ${lastStatusCode}: ${lastErrorMessage || 'Endpoint không khả dụng'}`;
    return NextResponse.json(
      { error: formattedError },
      { status: lastStatusCode }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate outfit image.' },
      { status: 500 }
    );
  }
}
