import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Next.js Pages API Route: /api/generate-outfit-image
 * Combination of Gemini 1.5 Flash (for prompt generation) + Pollinations.ai (for image rendering)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const {
      garment_type = 'Áo Dài',
      accessories = [],
      primary_color = 'Trắng Tinh Khôi',
      secondary_color = '',
      background_vibe = '',
      style_notes = '',
    } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên môi trường máy chủ.',
      });
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

    const userPrompt = `Dựa trên các tuỳ chọn phối đồ này, hãy viết một câu miêu tả hình ảnh bằng TIẾNG ANH (Image Prompt) thật chi tiết, mang phong cách thời trang cao cấp (high-fashion editorial), rõ ràng về màu sắc và chất liệu truyền thống Việt Nam. CHỈ trả về câu prompt, không giải thích.

Thông tin phối đồ:
- Trang phục: ${garment_type}
- Màu sắc chủ đạo: ${primary_color}
- Màu sắc điểm xuyết: ${secondary_color || 'Không'}
- Phụ kiện truyền thống: ${accessoriesText}
- Bối cảnh: ${settingText}
${style_notes ? `- Ghi chú phong cách: ${style_notes}` : ''}`.trim();

    let promptText = '';
    try {
      const result = await model.generateContent(userPrompt);
      promptText = result.response.text().trim();
    } catch (err: any) {
      console.warn('Gemini 3.8 flash prompt generation error:', err?.message);
    }

    if (!promptText) {
      promptText = `A high-fashion magazine editorial photograph of an elegant Vietnamese model in authentic ${garment_type}, crafted in raw silk and brocade in ${colorScheme}, styled with ${accessoriesText}, set against ${settingText}, cinematic lighting, 8k resolution, minimalist Vogue editorial aesthetics`;
    }

    // Mã hoá bằng encodeURIComponent()
    const encodedPrompt = encodeURIComponent(promptText);

    // Tạo URL ảnh tĩnh
    const finalImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=1000&nologo=true`;

    return res.status(200).json({
      imageUrl: finalImageUrl,
      image_url: finalImageUrl,
      prompt_used: promptText,
    });
  } catch (error: any) {
    console.error('Error generating outfit image:', error?.message);
    return res.status(500).json({
      error: error?.message || 'Lỗi máy chủ',
    });
  }
}
