import { NextResponse } from 'next/server';

/**
 * Next.js App Router API Route: /api/generate-outfit-image
 * Mix & Match Image Generation using Pollinations Flux Pro Static URL
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

    // 1. Master Prompt Template góc rộng lấy cảnh sắc nét (35mm f/8)
    const promptText = `Photorealistic, RAW photo, Fujifilm XT4, 35mm wide-angle lens, f/8, natural cinematic lighting, wide environmental shot. Full-body wide shot of a gorgeous Vietnamese model wearing authentic traditional Vietnamese clothing: ${garment_type}. The outfit features premium flowing silk and intricate cultural patterns, meticulously crafted in ${colorScheme}. She is gracefully styled with ${accessoriesText}. She is standing gracefully in ${settingText}. The breathtaking background architecture and scenery are clearly visible, expansive, and in sharp focus. Hyperrealistic fabric texture, vivid colors, editorial high-fashion composition, 8k resolution, ultra-detailed environment${styleNotesText ? ', ' + styleNotesText : ''}.`;

    // 2. Tạo URL Pollinations Flux Pro
    const encodedPrompt = encodeURIComponent(promptText);
    const finalImageUrl =
      'https://image.pollinations.ai/prompt/' +
      encodedPrompt +
      '?width=800&height=1000&nologo=true&model=flux-pro';

    // 3. Trả về JSON cho Frontend
    return NextResponse.json({
      imageUrl: finalImageUrl,
      image_url: finalImageUrl,
      prompt_used: promptText,
    });
  } catch (error: any) {
    console.error('Error generating outfit image URL:', error?.message);
    return NextResponse.json(
      { error: error?.message || 'Lỗi máy chủ' },
      { status: 500 }
    );
  }
}
