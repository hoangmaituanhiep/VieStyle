import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Palette,
  Check,
  RefreshCw,
  BookmarkPlus,
  Download,
  Eye,
  Layers,
  Compass,
  Image as ImageIcon,
  Loader2,
  Camera,
  Sun,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MixMatchItem, UserPreferences, Outfit, normalizeOutfitArray, normalizeOutfitValue } from '../types';
import { fetchOutfits } from '../lib/supabase';

interface MixMatchStudioViewProps {
  user: any | null;
  preferences?: UserPreferences | null;
  mixHistory: MixMatchItem[];
  outfits?: Outfit[];
  onSaveMix?: (item: Omit<MixMatchItem, 'id' | 'created_at'>) => Promise<void>;
  onSaveMixHistory?: (item: Omit<MixMatchItem, 'id' | 'created_at'>) => Promise<void>;
  onOpenAuth: () => void;
  onNavigateToEventForm?: () => void;
}

// Kho Cổ Phục & Trang Phục Truyền Thống Việt Nam chuẩn mực, giàu chi tiết cấu trúc với hình ảnh chân thực
const CURATED_HERITAGE_GARMENTS: Outfit[] = [
  {
    id: 'heritage-ao-tac',
    name: 'Áo Tấc Ngũ Thân Tay Thụng',
    description:
      'Cổ phục quý tộc triều Nguyễn, áo ngũ thân tay thụng buông dài qua tay khi buông thõng, cổ đứng năm khuy cài bên phải, mặc cùng quần lụa trắng và mấn.',
    image_url:
      'https://image.pollinations.ai/prompt/Authentic%20Vietnamese%20Ao%20Tac%20Nguyen%20Dynasty%20five-panel%20robe%20with%20wide%20hanging%20bell%20sleeves%20tay%20thung%2C%20standing%20collar%20buttoned%20on%20right%2C%20pure%20white%20mulberry%20silk%20trousers%2C%20ancient%20Vietnamese%20heritage%20courtyard%2C%20high-fashion%20editorial%20photography%2C%20photorealistic%2C%208k?width=800&height=1000&seed=1902&model=flux&nologo=true',
    event_types: ['traditional', 'formal', 'festival'],
    style_tags: ['Cổ Phục', 'Triều Nguyễn', 'Tay Thụng', 'Trang Trọng'],
    colors: ['Đỏ Son Cung Đình', 'Vàng Hoàng Yến', 'Trắng Ngà Tơ Tằm'],
  },
  {
    id: 'heritage-ao-nhat-binh',
    name: 'Áo Nhật Bình Hoàng Gia',
    description:
      'Triều phục hoàng tộc thời Nguyễn với cổ áo hình chữ nhật đặc trưng thêu hoa văn ngũ hành và phượng vũ, tay áo viền dải ngũ sắc rực rỡ.',
    image_url:
      'https://image.pollinations.ai/prompt/Authentic%20Vietnamese%20royal%20Ao%20Nhat%20Binh%20court%20robe%2C%20iconic%20wide%20rectangular%20embroidered%20collar%20with%20phoenix%20and%20cloud%20motifs%2C%20rainbow%20five-color%20striped%20ribbon%20cuffs%20on%20sleeves%2C%20traditional%20Vietnamese%20man%20headpiece%2C%20Imperial%20Citadel%20Hue%2C%20high-fashion%20editorial%20photography%2C%20photorealistic%2C%208k?width=800&height=1000&seed=2903&model=flux&nologo=true',
    event_types: ['traditional', 'formal', 'ceremony'],
    style_tags: ['Cổ Phục', 'Hoàng Tộc', 'Cổ Chữ Nhật', 'Cung Đình'],
    colors: ['Đỏ Son Cung Đình', 'Xanh Ngọc Cổ', 'Vàng Hoàng Yến'],
  },
  {
    id: 'heritage-ao-dai',
    name: 'Áo Dài Lụa Truyền Thống',
    description:
      'Áo dài lụa tơ tằm thanh thoát với cổ đứng đoan trang, tà áo thướt tha dài qua gối ôm nhẹ đường cong, xẻ tà ngang hông phối quần suông lụa.',
    image_url:
      'https://image.pollinations.ai/prompt/Authentic%20Vietnamese%20Ao%20Dai%2C%20graceful%20high%20mandarin%20collar%2C%20slender%20bodice%2C%20two%20long%20flowing%20split%20panels%20past%20knees%20over%20wide-leg%20silk%20trousers%2C%20Hoi%20An%20ancient%20street%2C%20high-fashion%20editorial%20photography%2C%20photorealistic%2C%208k?width=800&height=1000&seed=3904&model=flux&nologo=true',
    event_types: ['traditional', 'formal', 'casual', 'festival'],
    style_tags: ['Áo Dài', 'Thanh Thoát', 'Lụa Tơ Tằm', 'Di Sản'],
    colors: ['Trắng Ngà Tơ Tằm', 'Hồng Sen Mộc', 'Xanh Chàm Thẫm'],
  },
  {
    id: 'heritage-ao-ngu-than',
    name: 'Áo Ngũ Thân Tay Chẽn',
    description:
      'Áo năm thân gọn gàng với cổ đứng cài năm khuy đồng chéo sang nách phải, tay áo bó chẽn thanh nhã, tôn lên phong thái nho nhã tri thức.',
    image_url:
      'https://image.pollinations.ai/prompt/Authentic%20Vietnamese%20Ao%20Ngu%20Than%20tay%20chen%2C%20tailored%20five-panel%20silk%20robe%2C%20high%20mandarin%20collar%20with%20five%20buttons%20fastening%20to%20right%20armpit%2C%20fitted%20sleeves%2C%20loose%20silk%20trousers%2C%20traditional%20Vietnamese%20courtyard%2C%20high-fashion%20editorial%20photography%2C%20photorealistic%2C%208k?width=800&height=1000&seed=4905&model=flux&nologo=true',
    event_types: ['traditional', 'formal', 'business'],
    style_tags: ['Cổ Phục', 'Ngũ Thân', 'Tay Chẽn', 'Thanh Nhã'],
    colors: ['Xanh Chàm Thẫm', 'Đen Tuyền', 'Nâu Đất Nung'],
  },
  {
    id: 'heritage-ao-giao-linh',
    name: 'Áo Giao Lĩnh Cổ Phục',
    description:
      'Cổ phục thời Lê - Lý - Trần với vạt áo vắt chéo hình chữ V, thắt dải lụa ngang eo, tay áo rộng thanh thoát mang hơi thở cổ phong hào sảng.',
    image_url:
      'https://image.pollinations.ai/prompt/Authentic%20ancient%20Vietnamese%20Ao%20Giao%20Linh%20heritage%20robe%20Le%20dynasty%2C%20cross-collared%20overlapping%20front%20lapels%20forming%20V-neck%2C%20embroidered%20silk%20sash%20at%20waist%2C%20sweeping%20wide%20sleeves%2C%20ancient%20temple%20background%2C%20high-fashion%20editorial%20photography%2C%20photorealistic%2C%208k?width=800&height=1000&seed=5906&model=flux&nologo=true',
    event_types: ['traditional', 'festival', 'entertainment'],
    style_tags: ['Cổ Phục', 'Thời Lê', 'Giao Lĩnh', 'Cổ Phong'],
    colors: ['Xanh Ngọc Cổ', 'Đỏ Son Cung Đình', 'Trắng Ngà Tơ Tằm'],
  },
  {
    id: 'heritage-ao-tu-than',
    name: 'Áo Tứ Thân Kinh Bắc',
    description:
      'Trang phục bốn thân vùng đồng bằng Bắc Bộ, hai vạt trước buộc lại nhẹ nhàng, bên trong mặc yếm lụa thêu hoa sen và váy lĩnh đen mềm rủ.',
    image_url:
      'https://image.pollinations.ai/prompt/Authentic%20traditional%20Northern%20Vietnamese%20Ao%20Tu%20Than%2C%20four-panel%20flowing%20silk%20robe%20tied%20at%20waist%2C%20worn%20over%20silk%20Yem%20halter%20bodice%2C%20sweeping%20dark%20silk%20skirt%2C%20large%20flat%20palm%20hat%20Non%20Quai%20Thao%2C%20high-fashion%20editorial%20photography%2C%20photorealistic%2C%208k?width=800&height=1000&seed=6907&model=flux&nologo=true',
    event_types: ['traditional', 'festival', 'culture'],
    style_tags: ['Bắc Bộ', 'Tứ Thân', 'Yếm Lụa', 'Hội Làng'],
    colors: ['Nâu Đất Nung', 'Hồng Sen Mộc', 'Đỏ Ruby'],
  },
  {
    id: 'heritage-ao-ba-ba',
    name: 'Áo Bà Ba Nam Bộ',
    description:
      'Áo bà ba lụa gấm phương Nam xẻ tà hông, cổ tròn cài cúc giữa thanh lịch, tay ráp lăng mềm mại, đi cùng quần đen lụa và khăn rằn mộc mạc.',
    image_url:
      'https://image.pollinations.ai/prompt/Authentic%20traditional%20Southern%20Vietnamese%20Ao%20Ba%20Ba%2C%20delicate%20silk%20blouse%20with%20split%20side%20vents%2C%20round%20neck%20with%20front%20buttons%2C%20loose%20silk%20trousers%2C%20rustic%20Mekong%20riverbank%20lotus%20courtyard%2C%20high-fashion%20editorial%20photography%2C%20photorealistic%2C%208k?width=800&height=1000&seed=7908&model=flux&nologo=true',
    event_types: ['informal', 'traditional', 'casual'],
    style_tags: ['Nam Bộ', 'Bà Ba', 'Mộc Mạc', 'Dịu Dàng'],
    colors: ['Xanh Chàm Thẫm', 'Hồng Sen Mộc', 'Nâu Đất Nung'],
  },
];

const ACCESSORY_OPTIONS = [
  'Kiềng bạc hoa sen chạm lộng',
  'Mấn gấm dệt chỉ vàng',
  'Quạt phiến tơ vẽ tay',
  'Nón quai thao quai nhung',
  'Guốc mộc truyền thống',
  'Khuyên tai bạc nụ sen',
  'Chuỗi hạt trầm hương',
  'Khăn lụa Vạn Phúc quàng vai',
];

const PRIMARY_COLORS = [
  { name: 'Đỏ Son Cung Đình', hex: '#8B1E1E' },
  { name: 'Vàng Hoàng Yến', hex: '#C5A059' },
  { name: 'Trắng Ngà Tơ Tằm', hex: '#FAF7F2', border: true },
  { name: 'Xanh Chàm Thẫm', hex: '#1B3B4B' },
  { name: 'Hồng Sen Mộc', hex: '#C47D8A' },
  { name: 'Nâu Đất Nung', hex: '#5D4037' },
  { name: 'Xanh Ngọc Cổ', hex: '#2E6B65' },
  { name: 'Đen Tuyền', hex: '#141210' },
];

const ACCENT_COLORS = [
  { name: 'Chỉ Vàng Kim', hex: '#D4AF37' },
  { name: 'Bạc Ánh Trăng', hex: '#E2E8F0' },
  { name: 'Xanh Rêu Cổ', hex: '#4A5D4E' },
  { name: 'Đỏ Ruby', hex: '#9B111E' },
];

const BACKDROP_OPTIONS = [
  {
    id: 'hue',
    name: 'Hoàng Thành Huế (Cổ Kính)',
    prompt:
      'sunlit weathered ancient stone courtyard of Imperial Citadel of Hue with ancient moss-covered masonry, royal wooden carved pillars, soft mist',
  },
  {
    id: 'hoian',
    name: 'Phố Cổ Hội An (Hoài Niệm)',
    prompt:
      'heritage atmospheric ancient streets of Hoi An with warm lanterns glowing softly and weathered golden-yellow ochre walls with bougainvillea',
  },
  {
    id: 'tearoom',
    name: 'Gian Trà Đạo Cổ (Trầm Lắng)',
    prompt:
      'minimalist serene traditional Vietnamese wooden tea pavilion with soft daylight filtering through bamboo blinds and dark ironwood',
  },
  {
    id: 'studio',
    name: 'Studio Editorial Tối Giản',
    prompt:
      'high-fashion minimalist editorial photo studio with soft diffused gallery key lighting and clean warm neutral travertine backdrop',
  },
];

const POSE_OPTIONS = [
  {
    id: 'full',
    name: 'Toàn Thân Thanh Thoát',
    desc: 'Lấy trọn tà áo và dáng đứng vương giả',
    prompt:
      'full-length haute couture fashion photograph, model standing in a regal upright posture, wide sleeves hanging gracefully to showcase the full silhouette and floor-sweeping trousers',
  },
  {
    id: 'three_quarter',
    name: 'Chân Dung 3/4 Sang Trọng',
    desc: 'Tập trung dáng áo, tay áo và phụ kiện',
    prompt:
      'dynamic three-quarter fashion portrait, model standing in a graceful turn, one hand gently lifting the wide silk sleeve revealing delicate wrist movements and jewelry',
  },
  {
    id: 'walking',
    name: 'Tà Áo Bay Chuyển Động',
    desc: 'Dáng bước đi nhẹ nhàng, tà áo lay động',
    prompt:
      'candid editorial motion capture, model walking forward with quiet poise, causing the split silk panels and delicate hemline to ripple fluidly with breeze',
  },
  {
    id: 'profile',
    name: 'Góc Nghiêng Tinh Tế',
    desc: 'Tôn vinh đường nét cổ áo và góc mặt',
    prompt:
      'striking side-profile fashion editorial, showcasing the sharp silhouette of the upright collar, ornate silver jewelry, and a serene contemplative gaze toward soft ambient light',
  },
];

const LIGHTING_OPTIONS = [
  {
    id: 'golden',
    name: 'Hoàng Hôn Cung Đình',
    desc: 'Ánh vàng ấm áp, viền sáng tơ tằm',
    prompt:
      'warm golden hour sunset light streaming softly, casting an ethereal warm rim glow across the silk fabric texture and hair',
  },
  {
    id: 'daylight',
    name: 'Nắng Ban Mai Dịu Nhẹ',
    desc: 'Ánh sáng tự nhiên, sắc màu chân thực',
    prompt:
      'cinematic diffused overcast natural daylight, soft gentle shadows, ultra-clean skin tones, true-to-life textile color fidelity',
  },
  {
    id: 'studio',
    name: 'Studio Tối Giản',
    desc: 'Ánh sáng chụp tạp chí sắc nét',
    prompt:
      'haute-couture editorial studio lighting, soft diffused beauty dish keylight, subtle rim light, delicate micro-contrast',
  },
  {
    id: 'lantern',
    name: 'Đèn Lồng Hoài Niệm',
    desc: 'Ánh sáng lung linh hoài cổ',
    prompt:
      'atmospheric warm lantern glow in a heritage Vietnamese courtyard, soft amber light accentuating silk sheen and ancient architecture',
  },
];

export const MixMatchStudioView: React.FC<MixMatchStudioViewProps> = ({
  user,
  preferences,
  mixHistory,
  outfits,
  onSaveMix,
  onSaveMixHistory,
  onOpenAuth,
  onNavigateToEventForm,
}) => {
  const saveCallback = onSaveMix || onSaveMixHistory;

  // Khởi tạo danh mục trang phục: Kết hợp Cổ Phục chuẩn mực với dữ liệu từ Supabase
  const [garments, setGarments] = useState<Outfit[]>(() => {
    const custom = outfits && outfits.length > 0 ? outfits : [];
    const combined = [...CURATED_HERITAGE_GARMENTS];
    for (const c of custom) {
      if (!combined.some((item) => item.name.toLowerCase() === c.name.toLowerCase())) {
        combined.push(c);
      }
    }
    return combined;
  });

  const [isLoadingGarments, setIsLoadingGarments] = useState(false);

  useEffect(() => {
    if (outfits && outfits.length > 0) {
      const combined = [...CURATED_HERITAGE_GARMENTS];
      for (const c of outfits) {
        if (!combined.some((item) => item.name.toLowerCase() === c.name.toLowerCase())) {
          combined.push(c);
        }
      }
      setGarments(combined);
    } else {
      let isMounted = true;
      const load = async () => {
        setIsLoadingGarments(true);
        try {
          const res = await fetchOutfits();
          if (isMounted && res.data && res.data.length > 0) {
            const combined = [...CURATED_HERITAGE_GARMENTS];
            for (const c of res.data) {
              if (!combined.some((item) => item.name.toLowerCase() === c.name.toLowerCase())) {
                combined.push(c);
              }
            }
            setGarments(combined);
          }
        } catch (err) {
          console.warn('Lỗi lấy danh mục outfits trong Mix & Match:', err);
        } finally {
          if (isMounted) setIsLoadingGarments(false);
        }
      };
      load();
      return () => {
        isMounted = false;
      };
    }
  }, [outfits]);

  const [selectedGarment, setSelectedGarment] = useState<Outfit | null>(() => {
    return CURATED_HERITAGE_GARMENTS[0];
  });

  useEffect(() => {
    if (garments.length > 0) {
      if (!selectedGarment || !garments.some((g) => g.id === selectedGarment.id)) {
        setSelectedGarment(garments[0]);
      }
    }
  }, [garments, selectedGarment]);

  const selectedGarmentName =
    selectedGarment && selectedGarment.name && selectedGarment.name !== 'null'
      ? selectedGarment.name
      : garments[0]?.name && garments[0]?.name !== 'null'
      ? garments[0].name
      : 'Áo Tấc Ngũ Thân';

  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([
    'Kiềng bạc hoa sen chạm lộng',
    'Mấn gấm dệt chỉ vàng',
  ]);
  const [selectedPrimaryColor, setSelectedPrimaryColor] = useState(PRIMARY_COLORS[0]);
  const [selectedAccentColor, setSelectedAccentColor] = useState(ACCENT_COLORS[0]);
  const [selectedBackdrop, setSelectedBackdrop] = useState(BACKDROP_OPTIONS[0]);
  const [selectedPose, setSelectedPose] = useState(POSE_OPTIONS[0]);
  const [selectedLighting, setSelectedLighting] = useState(LIGHTING_OPTIONS[0]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    imageUrl: string;
    promptUsed: string;
    model: string;
    seed?: number;
    isSaved: boolean;
  } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [previewMode, setPreviewMode] = useState<'ai' | 'sample' | 'compare'>('ai');

  // Toggle accessory
  const handleToggleAccessory = (acc: string) => {
    setSelectedAccessories((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  };

  // Generate Image via API Route
  const handleGenerate = async (randomizeSeed: boolean = false) => {
    setIsGenerating(true);
    setGenerationError(null);

    // Randomize seed if requested (e.g. "Tạo dáng mới")
    const newSeed = randomizeSeed
      ? Math.floor(Math.random() * 10000000)
      : undefined;

    // Optionally cycle pose when user asks for a new angle
    if (randomizeSeed) {
      const currentIdx = POSE_OPTIONS.findIndex((p) => p.id === selectedPose.id);
      const nextIdx = (currentIdx + 1) % POSE_OPTIONS.length;
      setSelectedPose(POSE_OPTIONS[nextIdx]);
    }

    try {
      const res = await fetch('/api/generate-outfit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garment_type: selectedGarmentName,
          garment_image_url: selectedGarment?.image_url,
          garment_description: selectedGarment?.description,
          garment_tags: selectedGarment?.style_tags,
          garment_colors: selectedGarment?.colors,
          accessories: selectedAccessories,
          primary_color: selectedPrimaryColor.name,
          secondary_color: selectedAccentColor.name,
          background_vibe: selectedBackdrop.prompt,
          pose_framing: selectedPose.prompt,
          lighting_mood: selectedLighting.prompt,
          seed: newSeed,
        }),
      });

      if (!res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('API không trả về JSON (HTTP ' + res.status + ')');
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMessage = errData?.error || `Lỗi máy chủ (${res.status})`;
        throw new Error(errMessage);
      }

      const data = await res.json();
      const imageUrl = data.imageUrl || data.image_url;
      if (!imageUrl) {
        throw new Error(data.error || 'Không nhận được dữ liệu hình ảnh.');
      }

      setGenerationError(null);

      const newResult = {
        imageUrl: imageUrl,
        promptUsed: data.prompt_used || '',
        model: 'flux-high-fashion-editorial',
        seed: data.seed,
        isSaved: false,
      };

      setGeneratedResult(newResult);
      setPreviewMode('ai');

      // Auto-save to personal mix history if user is logged in
      if (user && saveCallback) {
        await saveCallback({
          user_id: user.id,
          garment_type: selectedGarmentName,
          accessories: selectedAccessories,
          primary_color: selectedPrimaryColor.name,
          secondary_color: selectedAccentColor.name,
          background_vibe: selectedBackdrop.name,
          prompt_used: data.prompt_used || '',
          image_url: imageUrl,
        });
        setGeneratedResult({ ...newResult, isSaved: true });
      }
    } catch (err: any) {
      console.warn('Image generation error:', err?.message);
      setGenerationError(err?.message || 'Không thể tạo hình ảnh.');
      setGeneratedResult(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // Explicit Save action
  const handleSaveToHistory = async () => {
    if (!generatedResult) return;
    if (!user) {
      onOpenAuth();
      return;
    }
    if (saveCallback) {
      await saveCallback({
        user_id: user.id,
        garment_type: selectedGarmentName,
        accessories: selectedAccessories,
        primary_color: selectedPrimaryColor.name,
        secondary_color: selectedAccentColor.name,
        background_vibe: selectedBackdrop.name,
        prompt_used: generatedResult.promptUsed,
        image_url: generatedResult.imageUrl,
      });
      setGeneratedResult({ ...generatedResult, isSaved: true });
    }
  };

  const handleCopyPrompt = () => {
    if (generatedResult?.promptUsed) {
      navigator.clipboard.writeText(generatedResult.promptUsed);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  return (
    <div className="space-y-16 pb-28 text-[#141210]">
      {/* Studio Header */}
      <div className="border-b border-[#EBE4D8] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#8B1E1E] font-semibold block mb-1">
            VIESTYLE AI HAUTE COUTURE LAB
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#141210] tracking-tight">
            Mix & Match Studio
          </h1>
          <p className="text-xs text-[#78716A] mt-1">
            Tùy biến cổ phục, màu sắc dệt may, phụ kiện truyền thống và xuất bản hình ảnh thời trang siêu thực.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#78716A] font-mono">
            {mixHistory.length} Bản Phối Lưu
          </span>
        </div>
      </div>

      {/* Main Studio Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Selectors (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. Chọn Loại Trang Phục */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#EBE4D8] pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#78716A]">
                1. Loại Cổ Phục / Trang Phục
              </span>
              <span className="text-xs font-serif text-[#8B1E1E] font-medium">
                {selectedGarmentName}
              </span>
            </div>

            {isLoadingGarments && garments.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716A] border border-[#EBE4D8] rounded-sm bg-[#FFFFFF] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#8B1E1E]" />
                <span>Đang tải kho cổ phục...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {garments.map((garment) => {
                  const isSelected = selectedGarment?.id === garment.id;
                  const nameDisplay = normalizeOutfitValue(garment.name);
                  const styleTags = normalizeOutfitArray(garment.style_tags);
                  const firstTag = styleTags[0] && styleTags[0] !== 'null' ? styleTags[0] : 'Cổ Phục';
                  const descDisplay =
                    garment.description && garment.description !== 'null' ? garment.description : '';
                  const hasImage = Boolean(
                    garment.image_url && garment.image_url.trim() && garment.image_url !== 'null'
                  );

                  return (
                    <button
                      key={garment.id}
                      type="button"
                      onClick={() => setSelectedGarment(garment)}
                      className={`group text-left p-2.5 rounded-sm border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#8B1E1E] bg-[#FFFFFF] shadow-xs ring-1 ring-[#8B1E1E]/30'
                          : 'border-[#EBE4D8] bg-[#FAF7F2] hover:border-[#8B1E1E]/50 hover:bg-[#FFFFFF]'
                      }`}
                    >
                      <div className="aspect-[4/3] w-full rounded-xs bg-[#EDE6DB] mb-2 overflow-hidden relative border border-[#E3D9C8]/60 flex flex-col justify-between">
                        {hasImage ? (
                          <img
                            src={garment.image_url}
                            alt={nameDisplay}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full p-2.5 flex flex-col justify-between">
                            <span className="text-[9px] font-mono tracking-widest text-[#8B1E1E] uppercase font-semibold">
                              {firstTag}
                            </span>
                            <div className="text-[11px] text-[#59534B] italic line-clamp-2">
                              {descDisplay || 'Cổ phục Việt Nam'}
                            </div>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#8B1E1E] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#141210] line-clamp-1">
                          {nameDisplay}
                        </div>
                        <div className="text-[10px] text-[#78716A] font-mono truncate">
                          {firstTag}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Chọn Phụ Kiện (Multi-Select) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#EBE4D8] pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#78716A]">
                2. Phụ Kiện Truyền Thống ({selectedAccessories.length})
              </span>
              <span className="text-[11px] text-[#78716A]">Kiềng, Mấn, Nón, Quạt tơ...</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACCESSORY_OPTIONS.map((acc) => {
                const isChecked = selectedAccessories.includes(acc);
                return (
                  <button
                    key={acc}
                    onClick={() => handleToggleAccessory(acc)}
                    className={`px-3 py-2 rounded-sm border text-xs text-left transition-all flex items-center justify-between ${
                      isChecked
                        ? 'border-[#8B1E1E] bg-[#FFFFFF] text-[#8B1E1E] font-medium shadow-2xs'
                        : 'border-[#EBE4D8] bg-[#FAF7F2] text-[#59534B] hover:border-[#8B1E1E]/40 hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <span className="truncate pr-2">{acc}</span>
                    <span
                      className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 ${
                        isChecked
                          ? 'border-[#8B1E1E] bg-[#8B1E1E] text-white'
                          : 'border-[#DCD3C4]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Phối Màu Sắc Dệt May */}
          <div className="space-y-4">
            <div className="border-b border-[#EBE4D8] pb-2 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#78716A]">
                3. Bảng Màu Sắc Lụa Tơ Tằm & Gấm
              </span>
              <span className="text-xs font-medium text-[#141210]">
                {selectedPrimaryColor.name} + {selectedAccentColor.name}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] text-[#78716A] block">Màu Chủ Đạo Vải Chính:</span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRIMARY_COLORS.map((color) => {
                  const isSelected = selectedPrimaryColor.name === color.name;
                  return (
                    <button
                      key={color.name}
                      onClick={() => setSelectedPrimaryColor(color)}
                      title={color.name}
                      className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-sm border transition-all ${
                        isSelected
                          ? 'border-[#8B1E1E] bg-[#FFFFFF] shadow-xs ring-1 ring-[#8B1E1E]'
                          : 'border-[#EBE4D8] hover:border-[#8B1E1E]/40'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full shadow-2xs shrink-0 ${
                          color.border ? 'border border-[#DCD3C4]' : ''
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-[9px] text-[#59534B] truncate w-full text-center leading-tight">
                        {color.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-[11px] text-[#78716A] block">Màu Điểm Xuyết & Thêu Chỉ Kim Tuyến:</span>
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map((accent) => {
                  const isSelected = selectedAccentColor.name === accent.name;
                  return (
                    <button
                      key={accent.name}
                      onClick={() => setSelectedAccentColor(accent)}
                      className={`px-3 py-1.5 rounded-sm border text-xs flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'border-[#8B1E1E] bg-[#FFFFFF] text-[#8B1E1E] font-medium'
                          : 'border-[#EBE4D8] bg-[#FAF7F2] text-[#59534B] hover:border-[#8B1E1E]/40'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: accent.hex }}
                      />
                      <span>{accent.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Không Gian Bối Cảnh */}
          <div className="space-y-3">
            <div className="border-b border-[#EBE4D8] pb-2 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#78716A]">
                4. Bối Cảnh Không Gian
              </span>
              <span className="text-xs font-medium text-[#141210]">
                {selectedBackdrop.name.split(' ')[0]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {BACKDROP_OPTIONS.map((bg) => {
                const isSelected = selectedBackdrop.id === bg.id;
                return (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBackdrop(bg)}
                    className={`px-3 py-2 rounded-sm border text-xs text-left transition-all ${
                      isSelected
                        ? 'border-[#8B1E1E] bg-[#FFFFFF] text-[#8B1E1E] font-medium shadow-2xs'
                        : 'border-[#EBE4D8] bg-[#FAF7F2] text-[#59534B] hover:border-[#8B1E1E]/40'
                    }`}
                  >
                    {bg.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Góc Chụp & Dáng Vẻ (Camera Angle & Silhouette Pose) */}
          <div className="space-y-3">
            <div className="border-b border-[#EBE4D8] pb-2 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#78716A] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#8B1E1E]" />
                <span>5. Góc Chụp & Dáng Người</span>
              </span>
              <span className="text-xs font-medium text-[#141210]">
                {selectedPose.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {POSE_OPTIONS.map((p) => {
                const isSelected = selectedPose.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPose(p)}
                    className={`px-3 py-2 rounded-sm border text-xs text-left transition-all ${
                      isSelected
                        ? 'border-[#8B1E1E] bg-[#FFFFFF] text-[#8B1E1E] font-medium shadow-2xs'
                        : 'border-[#EBE4D8] bg-[#FAF7F2] text-[#59534B] hover:border-[#8B1E1E]/40'
                    }`}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[10px] text-[#78716A] truncate">{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Ánh Sáng & Thời Điểm (Lighting & Mood) */}
          <div className="space-y-3">
            <div className="border-b border-[#EBE4D8] pb-2 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#78716A] flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[#8B1E1E]" />
                <span>6. Ánh Sáng & Thời Điểm</span>
              </span>
              <span className="text-xs font-medium text-[#141210]">
                {selectedLighting.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LIGHTING_OPTIONS.map((l) => {
                const isSelected = selectedLighting.id === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLighting(l)}
                    className={`px-3 py-2 rounded-sm border text-xs text-left transition-all ${
                      isSelected
                        ? 'border-[#8B1E1E] bg-[#FFFFFF] text-[#8B1E1E] font-medium shadow-2xs'
                        : 'border-[#EBE4D8] bg-[#FAF7F2] text-[#59534B] hover:border-[#8B1E1E]/40'
                    }`}
                  >
                    <div className="font-medium">{l.name}</div>
                    <div className="text-[10px] text-[#78716A] truncate">{l.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              id="generate-mix-btn"
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
              className="w-full py-4 px-6 rounded-sm bg-[#8B1E1E] hover:bg-[#721616] disabled:opacity-50 text-[#FAF7F2] text-xs font-medium uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 transition-all shadow-xs"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FAF7F2]" />
                  <span>Đang Khởi Tạo Bản Phối AI Siêu Thực...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#FAF7F2]" />
                  <span>Tạo Bản Phối AI (High-Fashion)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: High-Fashion Preview Stage (5 cols) */}
        <div className="lg:col-span-5 sticky top-28 space-y-4">
          <div className="bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-mono text-[#78716A] border-b border-[#EBE4D8] pb-2">
              <span className="uppercase tracking-wider">Khung Trưng Bày AI</span>
              <span className="text-[#8B1E1E] font-sans font-medium flex items-center gap-1">
                {generatedResult ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Đã Xuất Bản</span>
                  </>
                ) : (
                  'Mẫu Tham Chiếu'
                )}
              </span>
            </div>

            {/* Segmented control to toggle views when result is generated */}
            {generatedResult && (
              <div className="flex items-center gap-1 p-1 bg-[#FAF7F2] border border-[#EBE4D8] rounded-xs text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setPreviewMode('ai')}
                  className={`flex-1 py-1 px-2 rounded-2xs text-center transition-all ${
                    previewMode === 'ai'
                      ? 'bg-[#8B1E1E] text-white font-medium shadow-2xs'
                      : 'text-[#59534B] hover:text-[#141210]'
                  }`}
                >
                  Bản Phối AI
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('sample')}
                  className={`flex-1 py-1 px-2 rounded-2xs text-center transition-all ${
                    previewMode === 'sample'
                      ? 'bg-[#8B1E1E] text-white font-medium shadow-2xs'
                      : 'text-[#59534B] hover:text-[#141210]'
                  }`}
                >
                  Ảnh Mẫu Gốc
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('compare')}
                  className={`flex-1 py-1 px-2 rounded-2xs text-center transition-all ${
                    previewMode === 'compare'
                      ? 'bg-[#8B1E1E] text-white font-medium shadow-2xs'
                      : 'text-[#59534B] hover:text-[#141210]'
                  }`}
                >
                  So Sánh
                </button>
              </div>
            )}

            {/* Visual Box with vertical 4:5 aspect ratio for full-body garment portrait */}
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xs bg-[#FAF7F2] border border-[#E3D9C8] flex items-center justify-center">
              {isGenerating ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#8B1E1E]" />
                  <div className="space-y-1">
                    <p className="font-serif text-sm text-[#141210] font-medium tracking-wide">
                      Đang phân tích mẫu & dệt hình ảnh AI...
                    </p>
                    <p className="font-mono text-[10px] text-[#78716A] uppercase tracking-wider">
                      Gemini Vision & Flux High-Fidelity
                    </p>
                  </div>
                </div>
              ) : generationError ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#FAF7F2] space-y-2">
                  <p className="font-mono text-xs text-[#8B1E1E] leading-relaxed max-w-[280px] break-words">
                    {generationError}
                  </p>
                  <button
                    onClick={() => handleGenerate(false)}
                    className="text-xs text-[#8B1E1E] underline hover:text-[#721616]"
                  >
                    Thử lại
                  </button>
                </div>
              ) : generatedResult ? (
                previewMode === 'compare' ? (
                  <div className="w-full h-full grid grid-cols-2 gap-1 p-1 bg-[#FAF7F2]">
                    <div className="relative h-full overflow-hidden rounded-xs bg-[#EDE6DB] border border-[#E3D9C8]">
                      {selectedGarment?.image_url ? (
                        <img
                          src={selectedGarment.image_url}
                          alt="Ảnh mẫu gốc"
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-[#78716A]">Không có ảnh mẫu</div>
                      )}
                      <span className="absolute bottom-2 left-2 text-[9px] font-mono px-1.5 py-0.5 rounded-2xs bg-black/75 text-white backdrop-blur-xs">
                        Mẫu Cổ Phục Gốc
                      </span>
                    </div>
                    <div className="relative h-full overflow-hidden rounded-xs bg-[#EDE6DB] border border-[#8B1E1E]/40">
                      <img
                        src={generatedResult.imageUrl}
                        alt={selectedGarmentName}
                        className="w-full h-full object-cover object-top"
                      />
                      <span className="absolute bottom-2 left-2 text-[9px] font-mono px-1.5 py-0.5 rounded-2xs bg-[#8B1E1E] text-white">
                        Bản Phối AI Mới
                      </span>
                    </div>
                  </div>
                ) : previewMode === 'sample' ? (
                  <div className="relative w-full h-full">
                    {selectedGarment?.image_url ? (
                      <img
                        src={selectedGarment.image_url}
                        alt="Ảnh mẫu tham chiếu"
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#78716A]">Chưa có ảnh mẫu</div>
                    )}
                    <span className="absolute top-2.5 left-2.5 text-[9px] font-mono px-2 py-0.5 rounded-2xs bg-black/75 text-white backdrop-blur-xs">
                      Ảnh Cổ Phục Gốc Dùng Làm Mẫu
                    </span>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={generatedResult.imageUrl}
                      alt={selectedGarmentName}
                      className="w-full h-full object-cover object-top"
                    />
                    <span className="absolute top-2.5 left-2.5 text-[9px] font-mono px-2 py-0.5 rounded-2xs bg-[#8B1E1E]/90 text-white backdrop-blur-xs">
                      Bản Phối AI High-Fashion
                    </span>
                  </div>
                )
              ) : selectedGarment?.image_url ? (
                <div className="relative w-full h-full group">
                  <img
                    src={selectedGarment.image_url}
                    alt={selectedGarmentName}
                    className="w-full h-full object-cover object-top filter brightness-[0.95]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/95 bg-black/60 px-2 py-0.5 rounded-2xs backdrop-blur-xs">
                        Ảnh Cổ Phục Chuẩn Làm Mẫu
                      </span>
                      <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-2xs border border-emerald-500/40">
                        Đang Chọn
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-serif text-sm font-medium text-white drop-shadow-xs">
                        {selectedGarmentName}
                      </p>
                      <p className="text-[10px] font-sans text-white/85 line-clamp-2 leading-relaxed">
                        AI sẽ bám sát chi tiết cổ áo, vạt năm thân/bốn thân và tay áo của mẫu này khi tạo ảnh mới.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#FAF7F2]">
                  <div className="w-12 h-12 rounded-full border border-[#EBE4D8] flex items-center justify-center bg-[#FFFFFF] text-[#8B1E1E] shadow-2xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif text-sm font-medium text-[#141210]">
                      Mix & Match Studio
                    </p>
                    <p className="text-[10px] font-mono text-[#78716A] uppercase tracking-wider max-w-[220px]">
                      Chọn cổ phục, phụ kiện và màu sắc rồi bấm "Tạo Bản Phối AI"
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Generated Recipe Summary */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between text-[#141210]">
                <span className="font-serif font-medium text-base text-[#141210]">
                  {selectedGarmentName}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-[#FAF7F2] text-[#8B1E1E] border border-[#EBE4D8]">
                  {selectedPrimaryColor.name}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {selectedAccessories.slice(0, 4).map((acc) => (
                  <span
                    key={acc}
                    className="text-[10px] px-2 py-0.5 rounded-xs bg-[#FAF7F2] text-[#59534B] border border-[#EBE4D8]"
                  >
                    {acc}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions for generated result */}
            {generatedResult && (
              <div className="space-y-2 pt-2 border-t border-[#EBE4D8]">
                {/* Secondary Regenerate Button: Instant Variation */}
                <button
                  onClick={() => handleGenerate(true)}
                  disabled={isGenerating}
                  className="w-full py-2.5 px-3 rounded-sm border border-[#EBE4D8] bg-[#FAF7F2] hover:bg-[#FFFFFF] text-[#59534B] hover:text-[#8B1E1E] text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                  title="Tạo dáng mới với hạt giống (seed) ngẫu nhiên"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tạo Dáng Mới (Góc Nhìn Khác)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveToHistory}
                    disabled={generatedResult.isSaved}
                    className={`flex-1 py-2.5 px-3 rounded-sm border text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      generatedResult.isSaved
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-[#8B1E1E] bg-[#FFFFFF] text-[#8B1E1E] hover:bg-[#8B1E1E] hover:text-[#FAF7F2]'
                    }`}
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>{generatedResult.isSaved ? 'Đã Lưu Vào Hồ Sơ' : 'Lưu Vào Hồ Sơ'}</span>
                  </button>

                  <button
                    onClick={onNavigateToEventForm}
                    className="py-2.5 px-3 rounded-sm bg-[#8B1E1E] text-[#FAF7F2] text-xs font-medium uppercase tracking-wider hover:bg-[#721616] transition-colors"
                    title="Phối với sự kiện"
                  >
                    Phối Sự Kiện
                  </button>
                </div>

                {/* Inspect AI Prompt Section */}
                <div className="pt-2 border-t border-[#EBE4D8]/60">
                  <button
                    onClick={() => setShowPromptDetails(!showPromptDetails)}
                    className="w-full text-left flex items-center justify-between text-[11px] font-mono text-[#78716A] hover:text-[#8B1E1E] py-1"
                  >
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#8B1E1E]" />
                      <span>Chi tiết Prompt AI Đã Dùng</span>
                    </span>
                    {showPromptDetails ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showPromptDetails && (
                    <div className="mt-2 p-2.5 rounded-sm bg-[#FAF7F2] border border-[#EBE4D8] text-[10px] text-[#59534B] space-y-2">
                      <p className="leading-relaxed font-mono break-words">
                        {generatedResult.promptUsed}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-[#EBE4D8]">
                        <span className="text-[9px] text-[#8B1E1E] font-semibold uppercase">
                          Engine: Flux Ultra-Fidelity
                        </span>
                        <button
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1 text-[10px] text-[#8B1E1E] hover:underline"
                        >
                          {copiedPrompt ? (
                            <>
                              <CheckCheck className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Đã sao chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép Prompt</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lịch Sử Phối Đồ AI (mix_history) */}
      <section className="space-y-6 pt-10 border-t border-[#EBE4D8]">
        <div className="flex items-baseline justify-between border-b border-[#EBE4D8] pb-3">
          <h2 className="text-xl sm:text-2xl font-serif text-[#141210] font-medium">
            Lịch Sử Thử Nghiệm Mix & Match ({mixHistory.length})
          </h2>
          <span className="text-xs font-mono text-[#78716A]">
            Dữ liệu cá nhân hóa cho AI Stylist
          </span>
        </div>

        {mixHistory.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#DCD3C4] rounded-sm bg-[#FAF7F2] text-xs text-[#78716A]">
            Chưa có bản phối nào được lưu. Hãy thử kết hợp trang phục và lưu lại tại đây!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mixHistory.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm overflow-hidden shadow-2xs group flex flex-col justify-between"
              >
                <div className="aspect-[4/5] w-full overflow-hidden bg-[#EDE6DB] relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.garment_type}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[#78716A]">
                      Chưa có ảnh
                    </div>
                  )}
                </div>

                <div className="p-2.5 space-y-1">
                  <div className="text-xs font-medium text-[#141210] truncate">
                    {item.garment_type}
                  </div>
                  <div className="text-[10px] text-[#8B1E1E] font-mono truncate">
                    {item.primary_color}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
