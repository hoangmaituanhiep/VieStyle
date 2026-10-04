/**
 * VieStyle AI Mix & Match Master Prompt Generator
 * Translates Vietnamese traditional and contemporary garments, colors, and accessories
 * into high-fidelity, culturally authentic, high-fashion English visual prompts for Flux / modern AI image generators.
 */

export interface GarmentDetails {
  garment_type: string;
  garment_image_url?: string;
  garment_description?: string;
  garment_tags?: string[] | string;
  garment_colors?: string[] | string;
  accessories?: string[];
  primary_color: string;
  secondary_color?: string;
  background_vibe?: string;
  pose_framing?: string;
  lighting_mood?: string;
  style_notes?: string;
  seed?: number;
}

// 1. Traditional Vietnamese Garment Structural Anatomy & Visual Signatures
export const VIETNAMESE_GARMENTS_MAP: Record<string, { enName: string; anatomy: string }> = {
  'áo tấc': {
    enName: 'Imperial Ao Tac (Nguyen Dynasty aristocratic formal robe)',
    anatomy:
      'an authentic Vietnamese Ao Tac, an aristocratic Nguyen Dynasty five-panel silk robe with iconic dramatic extra-wide bell sleeves (tay thung) that drape down gracefully past the hands, high standing upright mandarin collar fastened along the right side with five ornate antique buttons, layered over pure ivory white mulberry silk loose-flowing wide-leg trousers',
  },
  'áo nhật bình': {
    enName: 'Royal Ao Nhat Binh (Nguyen Dynasty imperial court robe)',
    anatomy:
      'an authentic royal Vietnamese Ao Nhat Binh court robe, featuring the iconic wide rectangular embroidered collar (cổ hình chữ nhật) framing the neck with imperial phoenix, floral, and sacred cloud motifs, distinctive five-element rainbow striped ribbon bands (ngũ sắc) bordering the sleeve cuffs, draped gracefully over an inner silk robe and pleated silk skirt/trousers',
  },
  'áo ngũ thân': {
    enName: 'Classic Ao Ngu Than (Vietnamese five-panel tailored robe)',
    anatomy:
      'an authentic Vietnamese Ao Ngu Than, a tailored five-panel silk robe with an upright standing mandarin collar, five ornate buttons fastening diagonally down to the right armpit, sleek fitted sleeves (tay chẽn), layered over loose-flowing traditional trousers with clean dignified lines',
  },
  'áo dài': {
    enName: 'Classic Vietnamese Ao Dai tunic',
    anatomy:
      'a timeless Vietnamese Ao Dai tunic, featuring a high graceful mandarin collar, form-fitting slender bodice hugging the waist, with two long sweeping split panels extending past the knees over wide-leg fluid silk trousers, showcasing an elegant Vietnamese silhouette',
  },
  'áo giao lĩnh': {
    enName: 'Ancient Ao Giao Linh (Vietnamese cross-collared robe)',
    anatomy:
      'an ancient Vietnamese Ao Giao Linh heritage robe from the Le/Ly dynasties, featuring sweeping cross-collared overlapping front lapels forming an elegant deep V-neckline, cinched at the waist with an intricately embroidered flowing silk sash, with wide cascading sleeves',
  },
  'áo tứ thân': {
    enName: 'Traditional Northern Vietnamese Ao Tu Than',
    anatomy:
      'a traditional Northern Vietnamese Ao Tu Than, featuring a four-panel open flowing silk gown tied gracefully at the front waist with a vibrant contrasting silk sash, worn open over an inner embroidered silk Yem (halter neck bodice), layered over a sweeping flared dark silk skirt',
  },
  'áo bà ba': {
    enName: 'Southern Vietnamese Ao Ba Ba silk blouse',
    anatomy:
      'a traditional Southern Vietnamese Ao Ba Ba, a fluid silk blouse with subtle raglan sleeves, delicate front button closure, gentle scoop collar, split side vents at the hips, paired with matching loose-flowing silk trousers',
  },
  'áo đối khâm': {
    enName: 'Ancient Vietnamese Ao Doi Kham open-front robe',
    anatomy:
      'an authentic ancient Vietnamese Ao Doi Kham robe, featuring straight parallel vertical lapels running down from the shoulders worn open over an embroidered inner cross-collar silk garment, with billowing draped sleeves',
  },
};

// 2. Traditional Vietnamese Accessories Translation
export const ACCESSORY_MAP: Record<string, string> = {
  'kiềng bạc hoa sen chạm lộng':
    'an ornate solid polished silver torque collar necklace (Kiềng Bạc) meticulously hand-engraved with blooming lotus filigree motifs around the neck',
  'mấn gấm dệt chỉ vàng':
    'a traditional Vietnamese structured cylindrical silk brocade crown headpiece (Mấn) wrapped with shimmering golden metallic thread embroidery worn atop neatly pinned hair',
  'quạt phiến tơ vẽ tay':
    'a handheld round paddle fan made of translucent Vietnamese silk, hand-painted with delicate botanical watercolor flowers',
  'nón quai thao quai nhung':
    'a large iconic flat circular Vietnamese palm hat (Nón Quai Thao) with flowing black silk velvet ribbons framing the face',
  'khuyên tai bạc nụ sen':
    'delicate dangling silver drop earrings sculpted into the elegant shape of tender lotus buds',
  'chuỗi hạt trầm hương':
    'an aromatic polished natural Vietnamese agarwood (Trầm Hương) beaded rosary bracelet and necklace',
  'khăn lụa vạn phúc quàng vai':
    'a luxurious Van Phuc mulberry silk shawl with tone-on-tone cloud jacquard weave draped effortlessly across the shoulders',
  'guốc mộc truyền thống':
    'traditional artisan hand-carved polished wooden clogs (Guốc Mộc) with soft velvet straps',
};

// 3. Color & Textile Master Translations
export const PRIMARY_COLOR_MAP: Record<string, string> = {
  'đỏ son cung đình': 'imperial vermilion crimson red raw mulberry silk with a rich royal luster',
  'vàng hoàng yến': 'canary golden yellow silk brocade woven with subtle metallic gold threads',
  'trắng ngà tơ tằm': 'ivory eggshell white natural raw mulberry silk with a soft organic sheen',
  'xanh chàm thẫm': 'deep artisanal indigo blue natural dyed raw silk with rich visual depth',
  'hồng sen mộc': 'soft dusty antique lotus pink matte silk with delicate muted rose undertones',
  'nâu đất nung': 'earthy terracotta bronze brown raw silk with rustic artisan slub texture',
  'xanh ngọc cổ': 'antique celadon jade teal silk with smooth luminous drape',
  'đen tuyền': 'deep obsidian pitch black raw silk with understated matte texture',
};

export const ACCENT_COLOR_MAP: Record<string, string> = {
  'chỉ vàng kim': 'intricate metallic gold bullion thread embroidery and fine piping along hems and collar',
  'bạc ánh trăng': 'delicate shimmering silver bullion thread borders, edge trims, and filigree details',
  'xanh rêu cổ': 'antique moss green silk border trims and contrast collar piping',
  'đỏ ruby': 'vibrant ruby crimson embroidered floral flourishes and woven accent ribbons',
};

// 4. Backdrop & Atmosphere Translations
export const BACKDROP_MAP: Record<string, string> = {
  hue: 'sunlit weathered ancient stone courtyard of the Imperial Citadel of Hue, ancient moss-covered masonry, royal red lacquer wooden carved pillars, soft misty morning depth',
  hoian: 'historic atmospheric street of Hoi An Ancient Town, weathered golden-yellow ochre walls, hanging silk lanterns glowing softly, climbing pink bougainvillea vines',
  tearoom: 'minimalist serene Vietnamese traditional wooden tea pavilion, soft warm daylight filtering through bamboo blinds, polished dark ironwood architecture, minimalist ceramic aesthetics',
  studio: 'high-fashion minimalist editorial photo studio, soft diffused gallery key lighting, clean warm neutral travertine stone backdrop, gentle artistic shadow gradient',
};

// 5. Dynamic Camera Angles & Poses for Variety
export const POSE_VARIATIONS = [
  'full-length haute couture fashion photograph, model standing in a regal upright posture, wide sleeves hanging gracefully to showcase the full silhouette and floor-sweeping trousers',
  'dynamic three-quarter fashion portrait, model standing in a graceful turn, one hand gently lifting the wide silk sleeve revealing delicate wrist movements and jewelry',
  'candid editorial motion capture, model walking forward with quiet poise, causing the split silk panels and delicate hemline to ripple fluidly with breeze',
  'striking side-profile fashion editorial, showcasing the sharp silhouette of the upright collar, ornate silver jewelry, and a serene contemplative gaze toward soft ambient light',
];

// 6. Lighting Moods for Photorealistic Brilliance
export const LIGHTING_VARIATIONS = [
  'warm golden hour sunset light streaming softly, casting an ethereal warm rim glow across the silk fabric texture and hair',
  'cinematic diffused overcast natural daylight, soft gentle shadows, ultra-clean skin tones, true-to-life textile color fidelity',
  'atmospheric morning sun rays filtering gently through wooden latticework, creating soft artistic dappled lighting',
  'haute-couture editorial studio lighting, soft diffused beauty dish keylight, subtle rim light, delicate micro-contrast',
];

/**
 * Normalizes text for key lookup
 */
function cleanKey(text?: string): string {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolves garment anatomy and description
 */
export function resolveGarmentDescription(
  garmentType: string,
  garmentDescription?: string,
  garmentTags?: string[] | string
): string {
  const key = cleanKey(garmentType);

  // 1. Direct match with Vietnamese historical costume map
  for (const [vKey, vVal] of Object.entries(VIETNAMESE_GARMENTS_MAP)) {
    if (key.includes(vKey)) {
      if (garmentDescription && garmentDescription !== 'null' && garmentDescription.length > 20) {
        return `${vVal.anatomy}, detailed with: ${garmentDescription}`;
      }
      return vVal.anatomy;
    }
  }

  // 2. If it's a known catalog outfit with rich description (e.g. suits, modern brocade, slip dresses)
  if (garmentDescription && garmentDescription !== 'null' && garmentDescription.trim().length > 10) {
    const tagsText = Array.isArray(garmentTags)
      ? garmentTags.filter(Boolean).join(', ')
      : typeof garmentTags === 'string'
      ? garmentTags
      : '';
    return `a meticulously tailored high-fashion ensemble: ${garmentType} (${garmentDescription})${
      tagsText ? `, styled with aesthetic elements of ${tagsText}` : ''
    }`;
  }

  // 3. Fallback to generic elegant Vietnamese garment
  return `an authentic high-fashion Vietnamese traditional garment (${garmentType}), handcrafted with tailored seams, graceful draping silhouette, and authentic cultural detailing`;
}

/**
 * Resolves accessories into descriptive visual phrases
 */
export function resolveAccessories(accessories?: string[]): string {
  if (!accessories || !Array.isArray(accessories) || accessories.length === 0) {
    return 'minimalist fine silver traditional Vietnamese ornaments, subtle hairpins';
  }

  const translated = accessories.map((acc) => {
    const key = cleanKey(acc);
    for (const [aKey, aVal] of Object.entries(ACCESSORY_MAP)) {
      if (key.includes(aKey)) {
        return aVal;
      }
    }
    // If not found in map, clean up accessory name
    return `fine artisanal Vietnamese accessory: ${acc}`;
  });

  return translated.join('; complemented with ');
}

/**
 * Resolves primary and secondary colors into rich textile descriptions
 */
export function resolveColors(primaryColor: string, secondaryColor?: string): string {
  const pKey = cleanKey(primaryColor);
  let pDesc = 'imperial vermilion crimson raw silk';

  for (const [cKey, cVal] of Object.entries(PRIMARY_COLOR_MAP)) {
    if (pKey.includes(cKey)) {
      pDesc = cVal;
      break;
    }
  }

  if (!secondaryColor || cleanKey(secondaryColor) === 'không' || cleanKey(secondaryColor) === 'none') {
    return `crafted from luxurious ${pDesc}`;
  }

  const sKey = cleanKey(secondaryColor);
  let sDesc = 'shimmering golden thread embroidery';

  for (const [aKey, aVal] of Object.entries(ACCENT_COLOR_MAP)) {
    if (sKey.includes(aKey)) {
      sDesc = aVal;
      break;
    }
  }

  return `crafted primarily from luxurious ${pDesc}, ${sDesc}`;
}

/**
 * Resolves backdrop environment
 */
export function resolveBackdrop(backgroundVibe?: string): string {
  if (!backgroundVibe) {
    return BACKDROP_MAP.hue;
  }

  const bKey = cleanKey(backgroundVibe);
  for (const [k, v] of Object.entries(BACKDROP_MAP)) {
    if (bKey.includes(k) || (k === 'tearoom' && bKey.includes('trà')) || (k === 'studio' && bKey.includes('studio'))) {
      return v;
    }
  }

  return backgroundVibe;
}

/**
 * Builds the Master Photorealistic Image Prompt
 * This prompt is used directly for rendering or as reference for Gemini expansion.
 */
export function buildMasterOutfitPrompt(details: GarmentDetails): {
  promptText: string;
  seed: number;
} {
  const seed = details.seed ?? Math.floor(Math.random() * 10000000);

  // Deterministically select varied pose & lighting based on seed or details
  const poseIndex = Math.abs(seed) % POSE_VARIATIONS.length;
  const lightingIndex = Math.abs(seed >> 2) % LIGHTING_VARIATIONS.length;

  const poseDesc = details.pose_framing || POSE_VARIATIONS[poseIndex];
  const lightingDesc = details.lighting_mood || LIGHTING_VARIATIONS[lightingIndex];

  const garmentAnatomy = resolveGarmentDescription(
    details.garment_type,
    details.garment_description,
    details.garment_tags
  );

  const colorText = resolveColors(details.primary_color, details.secondary_color);
  const accessoriesText = resolveAccessories(details.accessories);
  const backdropText = resolveBackdrop(details.background_vibe);
  const extraNotes = details.style_notes ? `, ${details.style_notes}` : '';

  // Core High-Fashion Flux / SDXL Master Prompt
  const masterPrompt = [
    `Award-winning high-fashion editorial photograph for Vogue Vietnam, featuring an elegant Vietnamese model with natural refined features and graceful poise`,
    `${poseDesc}`,
    `Wearing ${garmentAnatomy}`,
    `${colorText}`,
    `Adorned with ${accessoriesText}`,
    `Set against ${backdropText}`,
    `${lightingDesc}`,
    `Shot on Hasselblad H6D-100c medium format camera with 85mm f/1.4 lens, natural skin texture with subtle pores, visible slub weave of authentic Vietnamese mulberry silk (lụa tơ tằm) and intricate metallic brocade embroidery, cinematic depth of field, photorealistic, 8k resolution, impeccable cultural authenticity${extraNotes}`,
  ].join(', ');

  return {
    promptText: masterPrompt,
    seed,
  };
}

/**
 * Generates an expert system instruction for Gemini to refine or elaborate the image prompt
 */
export function buildGeminiPromptInstruction(details: GarmentDetails, masterPrompt: string): string {
  return `Bạn là một Chuyên gia Lịch sử Cổ phục Việt Nam kiêm Giám đốc Hình ảnh Thời trang Cao cấp (Creative Director cho Tạp chí Vogue / Harper's Bazaar Việt Nam).

Nhiệm vụ của bạn: Viết một câu Image Prompt duy nhất bằng TIẾNG ANH (không quá 180 từ) cho mô hình tạo ảnh thế hệ mới (Flux / Midjourney).
Mục tiêu tối thượng:
1. BÁM SÁT 100% CẤU TRÚC VÀ CHI TIẾT TRANG PHỤC:
   - Nếu là Cổ phục Việt Nam (Áo Tấc, Áo Nhật Bình, Áo Ngũ Thân, Áo Dài, Áo Giao Lĩnh...): Phải miêu tả chuẩn xác kiểu cổ (cổ đứng/cổ hình chữ nhật viền ngũ sắc/cổ giao lĩnh), tay áo (tay thụng rộng buông dài qua tay hoặc tay chẽn), tà áo, cúc cài và quần lụa tơ tằm mặc trong.
   - Nếu là trang phục có mô tả cụ thể: Bám sát form dáng, chất liệu và đường cắt may.
2. MÀU SẮC CHÍNH XÁC: Màu chủ đạo (${details.primary_color}) và màu điểm xuyết thêu họa tiết (${details.secondary_color || 'tự nhiên'}).
3. PHỤ KIỆN VIỆT NAM ĐẶC TRƯNG: Dịch và mô tả chân thực phụ kiện truyền thống Việt Nam (${details.accessories?.join(', ') || 'tối giản'}).
4. CHẤT LƯỢNG ẢNH CAO CẤP: Chụp máy ảnh medium format Hasselblad 85mm f/1.4, ánh sáng tự nhiên mềm mại, da người thật có lỗ chân lông, thớ vải lụa tơ tằm sắc nét, góc máy tinh tế. Tránh hoàn toàn vẻ ngoài hoạt hình hay da sáp nhựa giả tạo.
5. ĐA DẠNG HÓA GÓC NHÌN & DÁNG: Đảm bảo góc chụp, ánh sáng và dáng người thanh lịch, sống động, không rập khuôn.

Thông tin phối đồ người dùng chọn:
- Tên trang phục: ${details.garment_type}
${details.garment_description ? `- Chi tiết may mặc: ${details.garment_description}` : ''}
- Màu sắc chủ đạo: ${details.primary_color}
- Màu sắc điểm xuyết/thêu: ${details.secondary_color || 'Không'}
- Phụ kiện đi kèm: ${details.accessories?.join(', ') || 'Không phụ kiện'}
- Bối cảnh: ${details.background_vibe || 'Kiến trúc cổ Việt Nam'}
${details.style_notes ? `- Ghi chú riêng: ${details.style_notes}` : ''}

Prompt mẫu đạt chuẩn bạn có thể tham khảo và nâng tầm:
"${masterPrompt}"

CHỈ TRẢ VỀ DUY NHẤT CÂU PROMPT BẰNG TIẾNG ANH, KHÔNG GIẢI THÍCH, KHÔNG MARKDOWN.`.trim();
}

/**
 * Generates an expert multimodal instruction for Gemini Vision when a sample outfit image is provided
 */
export function buildGeminiMultimodalPrompt(details: GarmentDetails, masterPrompt: string): string {
  return `BẠN LÀ CHUYÊN GIA LỊCH SỬ CỔ PHỤC VIỆT NAM & GIÁM ĐỐC HÌNH ẢNH CHO TẠP CHÍ VOGUE VIETNAM.
Trước mặt bạn là HÌNH ẢNH MẪU TRANG PHỤC THỰC TẾ (${details.garment_type}) được người dùng cung cấp.

HÃY QUAN SÁT KỸ VÀ SAO CHÉP CHÍNH XÁC CẤU TRÚC MAY MẶC CỔ PHỤC TỪ HÌNH ẢNH MẪU NÀY:
1. Kiểu cổ áo: Quan sát chính xác cổ áo trong ảnh mẫu (ví dụ: cổ hình chữ nhật thêu hoa văn ngũ hành triều Nguyễn của Áo Nhật Bình; cổ đứng năm khuy cài chéo sang nách phải của Áo Tấc / Áo Ngũ Thân; cổ giao lĩnh vạt chéo chữ V; hay cổ đứng truyền thống của Áo Dài).
2. Kiểu tay áo: Quan sát độ rộng và độ dài tay áo (tay thụng buông dài rộng quá bàn tay, tay chẽn ôm cổ tay, viền dải ngũ sắc...).
3. Vạt áo và tà áo: Vạt năm thân, bốn thân hay hai tà xẻ hông; lớp áo lót bên trong và quần lụa mặc kèm.
4. Họa tiết thêu và hoa văn đặc trưng trên áo mẫu.

NHIỆM VỤ: Viết một câu Image Prompt duy nhất bằng TIẾNG ANH (tối đa 160 từ) cho mô hình Flux để tạo ra bức ảnh thời trang cao cấp người mẫu Việt Nam mặc TRANG PHỤC CÓ PHOM DÁNG VÀ CHI TIẾT CỔ PHỤC BÁM SÁT 100% NHƯ TRONG ẢNH MẪU ĐƯỢC CUNG CẤP, với các tùy chỉnh sau:
- Tên trang phục: ${details.garment_type}
- Màu sắc chủ đạo vải chính: ${details.primary_color}
- Màu sắc điểm xuyết / thêu viền: ${details.secondary_color || 'tương phản nhẹ'}
- Phụ kiện phối cùng: ${details.accessories && details.accessories.length > 0 ? details.accessories.join(', ') : 'tối giản, thanh lịch'}
- Bối cảnh: ${details.background_vibe || 'Kiến trúc cổ Việt Nam'}
- Góc máy & dáng người: ${details.pose_framing || 'thanh lịch, trang trọng'}
- Ánh sáng: ${details.lighting_mood || 'ánh sáng tự nhiên mềm mại'}

TIÊU CHUẨN KỸ THUẬT:
- Shot on Hasselblad H6D-100c medium format camera, 85mm f/1.4 lens, natural skin texture with visible pores, visible slub weave of authentic Vietnamese mulberry silk (lụa tơ tằm).
- Tuyệt đối giữ đúng bản sắc văn hóa Cổ phục Việt Nam, không biến thành trang phục của nước khác (saree Ấn Độ, kimono Nhật Bản, hanfu Trung Quốc).
- Prompt mẫu tham khảo: "${masterPrompt}"
- CHỈ TRẢ VỀ DUY NHẤT CÂU PROMPT TIẾNG ANH, KHÔNG GIẢI THÍCH, KHÔNG MARKDOWN.`.trim();
}

/**
 * Builds the final Pollinations.ai image URL with high-definition parameters
 */
export function buildPollinationsUrl(prompt: string, seed: number): string {
  // Clean prompt for URL safety
  const sanitizedPrompt = prompt.replace(/\s+/g, ' ').trim();
  const encodedPrompt = encodeURIComponent(sanitizedPrompt);

  // Pollinations options:
  // - width=800&height=1000 (standard high-fashion 4:5 portrait ratio)
  // - seed: ensures distinct non-repetitive results
  // - nologo=true: removes any watermark
  // - model=flux: highest fidelity model
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=1000&seed=${seed}&model=flux&nologo=true`;
}
