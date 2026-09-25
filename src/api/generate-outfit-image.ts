import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Next.js Pages API Route: /api/generate-outfit-image
 * Direct REST Fetch to Google Imagen 3 API with proper error forwarding (NO MOCK IMAGE)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const {
    garment_type = 'Áo Dài',
    accessories = [],
    primary_color = 'Trắng Tinh Khôi',
    secondary_color = '',
    background_vibe = '',
    style_notes = '',
  } = req.body || {};

  const accessoriesText =
    Array.isArray(accessories) && accessories.length > 0
      ? accessories.join(', ')
      : 'minimalist fine silver traditional Vietnamese ornaments';

  const colorScheme = secondary_color
    ? `${primary_color} harmonized with accents of ${secondary_color}`
    : primary_color;

  const settingText =
    background_vibe || 'minimalist ancient Vietnamese heritage courtyard architecture';

  const finalPrompt = `A high-fashion magazine editorial full-length photograph of an elegant Vietnamese fashion model wearing authentic high-couture Vietnamese traditional costume: ${garment_type}. The garment is crafted in exquisite raw silk and brocade in ${colorScheme}. Styled with traditional Vietnamese accessories: ${accessoriesText}. Set against ${settingText} with soft directional daylight, subtle shadows, realistic silk texture drapery, cinematic lighting, 8k resolution, minimalist Vogue editorial aesthetics, hyper-detailed photography, authentic Vietnamese cultural heritage. ${style_notes}`.trim();

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not defined in environment variables.',
    });
  }

  try {
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

          return res.status(200).json({
            success: true,
            image_url: imageUrl,
            prompt_used: finalPrompt,
            model: 'imagen-3.0-generate-001',
            garment_type,
            accessories,
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
    return res.status(lastStatusCode).json({
      error: formattedError,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to generate outfit image.',
    });
  }
}
