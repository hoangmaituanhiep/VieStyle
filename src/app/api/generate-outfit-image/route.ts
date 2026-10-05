import { NextResponse } from 'next/server';

/**
 * Next.js App Router API Route: /api/generate-outfit-image
 * Mix & Match Image Generation using Hugging Face Inference API (Stable Diffusion XL)
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

    // 2. Tích hợp Hugging Face API: Kiểm tra API Key
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error('Thiếu HUGGINGFACE_API_KEY');
    }

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

    const styleNotes = style_notes || '';

    // 1. Giữ nguyên Master Prompt Template (chuẩn Nhiếp ảnh gia, không dùng Gemini API)
    const promptText = `Photorealistic, RAW photo, Fujifilm XT4, 85mm lens, f/1.8, natural cinematic lighting, depth of field. Full-length scenery portrait of a gorgeous Vietnamese female model wearing authentic traditional Vietnamese clothing: ${garment_type}. The outfit features premium flowing silk and intricate cultural patterns, meticulously crafted in ${colorScheme}. She is gracefully styled with ${accessoriesText}. She is standing in ${settingText}. Hyperrealistic fabric texture, vivid colors, editorial high-fashion Vogue magazine cover, 8k resolution, ultra-detailed face and background${styleNotes ? ', ' + style_notes : ''}.`;

    // 2. Dùng fetch gọi POST tới endpoint Hugging Face SDXL
    const response = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: promptText }),
      }
    );

    // 4. Xử lý lỗi đặc thù (Model Loading - 503)
    if (response.status === 503) {
      return NextResponse.json(
        { error: 'Mô hình vẽ ảnh đang khởi động, vui lòng thử lại sau 20 giây' },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorMessage = `Hugging Face API lỗi (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData?.error) {
          if (
            typeof errorData.error === 'string' &&
            errorData.error.toLowerCase().includes('loading')
          ) {
            return NextResponse.json(
              { error: 'Mô hình vẽ ảnh đang khởi động, vui lòng thử lại sau 20 giây' },
              { status: 503 }
            );
          }
          errorMessage = errorData.error;
        }
      } catch (_) {
        // Non-JSON response
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status >= 500 ? response.status : 500 }
      );
    }

    // 3. Xử lý kết quả trả về nhị phân -> base64
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64Image = buffer.toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    return NextResponse.json({
      imageUrl,
      image_url: imageUrl,
      prompt_used: promptText,
    });
  } catch (error: any) {
    console.error('Error generating outfit image:', error?.message);
    const isModelLoading = error?.message?.includes('khởi động') || error?.status === 503;
    return NextResponse.json(
      {
        error: isModelLoading
          ? 'Mô hình vẽ ảnh đang khởi động, vui lòng thử lại sau 20 giây'
          : error?.message || 'Lỗi máy chủ',
      },
      { status: isModelLoading ? 503 : 500 }
    );
  }
}
