import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildMasterOutfitPrompt,
  buildGeminiPromptInstruction,
  buildGeminiMultimodalPrompt,
  buildPollinationsUrl,
} from '../lib/outfit-prompt-builder';

/**
 * Next.js Pages API Route: /api/generate-outfit-image
 * Combination of Sample Image Multimodal Vision Analysis + Master Vietnamese Costume Anatomy + Gemini Expansion + Pollinations Flux
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const {
      garment_type = 'Áo Dài',
      garment_image_url,
      garment_description,
      garment_tags,
      garment_colors,
      accessories = [],
      primary_color = 'Trắng Ngà Tơ Tằm',
      secondary_color = '',
      background_vibe = '',
      pose_framing,
      lighting_mood,
      style_notes = '',
      seed: reqSeed,
    } = req.body || {};

    // 1. Sinh master prompt chuẩn mực với cấu trúc chi tiết cổ phục/trang phục, phụ kiện và màu sắc
    const { promptText: masterPrompt, seed } = buildMasterOutfitPrompt({
      garment_type,
      garment_image_url,
      garment_description,
      garment_tags,
      garment_colors,
      accessories,
      primary_color,
      secondary_color,
      background_vibe,
      pose_framing,
      lighting_mood,
      style_notes,
      seed: typeof reqSeed === 'number' ? reqSeed : undefined,
    });

    let promptText = masterPrompt;

    // 2. Tải và chuẩn bị ảnh mẫu (Sample Image) nếu được cung cấp để Gemini Vision phân tích
    let sampleImagePart: any = null;
    if (garment_image_url && typeof garment_image_url === 'string' && garment_image_url.startsWith('http')) {
      try {
        const imgFetch = await fetch(garment_image_url, { signal: AbortSignal.timeout(6000) });
        if (imgFetch.ok) {
          const arrBuf = await imgFetch.arrayBuffer();
          const mime = (imgFetch.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
          sampleImagePart = {
            inlineData: {
              data: Buffer.from(arrBuf).toString('base64'),
              mimeType: mime,
            },
          };
        }
      } catch (imgErr: any) {
        console.warn('Could not fetch sample image for Gemini Vision analysis:', imgErr?.message);
      }
    }

    // 3. Phân tích trực tiếp ảnh mẫu qua Gemini Multimodal Vision nếu có API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const details = {
          garment_type,
          garment_image_url,
          garment_description,
          garment_tags,
          garment_colors,
          accessories,
          primary_color,
          secondary_color,
          background_vibe,
          pose_framing,
          lighting_mood,
          style_notes,
        };

        const geminiInstruction = sampleImagePart
          ? buildGeminiMultimodalPrompt(details, masterPrompt)
          : buildGeminiPromptInstruction(details, masterPrompt);

        const geminiContents: any[] = sampleImagePart
          ? [sampleImagePart, geminiInstruction]
          : [geminiInstruction];

        const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.8-flash'];
        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(geminiContents);
            const candidateText = result.response.text().trim();
            if (candidateText && candidateText.length > 50) {
              promptText = candidateText
                .replace(/^```[a-z]*\s*/i, '')
                .replace(/\s*```$/i, '')
                .replace(/^["'`]+|["'`]+$/g, '')
                .trim();
              break;
            }
          } catch (modelErr: any) {
            console.warn(`Gemini (${modelName}) failed:`, modelErr?.message);
          }
        }
      } catch (err: any) {
        console.warn('Gemini client attempt error:', err?.message);
      }
    }

    // 4. Tạo URL ảnh tĩnh độ nét cao với Pollinations Flux và seed ngẫu nhiên
    const finalImageUrl = buildPollinationsUrl(promptText, seed);

    return res.status(200).json({
      success: true,
      imageUrl: finalImageUrl,
      image_url: finalImageUrl,
      prompt_used: promptText,
      seed,
    });
  } catch (error: any) {
    console.error('Error generating outfit image:', error?.message);
    return res.status(500).json({
      error: error?.message || 'Lỗi máy chủ',
    });
  }
}
