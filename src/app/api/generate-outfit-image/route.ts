import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Next.js App Router API Route: /api/generate-outfit-image
 * Mix & Match Image Generation using Self-Hosted Stable Diffusion XL (Google Colab + Ngrok)
 * (Master Prompt Template góc rộng 35mm wide-angle lens, f/8 sắc nét toàn cảnh di sản)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      garment_type = 'traditional Vietnamese dress',
      accessories = [],
      primary_color = 'Crimson Red',
      secondary_color,
      background_vibe,
      style_notes,
    } = body || {};

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

    // 2. Master Prompt Template góc rộng lấy cảnh sắc nét (35mm f/8)
    const promptText = `Photorealistic, RAW photo, Fujifilm XT4, 35mm wide-angle lens, f/8, natural cinematic lighting, wide environmental shot. Full-body wide shot of a cute Vietnamese model wearing authentic traditional Vietnamese clothing: ${garment_type}. The outfit features Vietnamese flowing silk and intricate cultural patterns, meticulously crafted in ${colorScheme}. She is gracefully styled with ${accessoriesText}. She is standing gracefully in ${settingText}. The breathtaking background architecture and scenery are clearly visible, expansive, and in sharp focus. Hyperrealistic fabric texture, vivid colors, editorial high-fashion composition, 8k resolution, ultra-detailed environment${styleNotesText ? ', ' + styleNotesText : ''} that features Vietnamese culture and traditions.`;

    // 3. Gọi Server SDXL Colab qua Ngrok bằng axios (không cần Authorization)
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

    // 4. Chuyển đổi dữ liệu nhị phân (Buffer) sang Base64
    const mimeType = (response.headers['content-type'] as string) || 'image/jpeg';
    const base64Image = Buffer.from(response.data).toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    // 5. Trả về JSON cho Frontend
    return NextResponse.json({
      imageUrl,
      image_url: imageUrl,
      prompt_used: promptText,
    });
  } catch (error: any) {
    console.error('Error generating outfit image from Colab SDXL:', error?.message);
    let errorMessage = error?.message || 'Lỗi kết nối máy chủ SDXL';
    if (error?.response?.data) {
      try {
        errorMessage = Buffer.from(error.response.data).toString('utf-8');
      } catch {
        // fallback
      }
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: error?.response?.status || 500 }
    );
  }
}
