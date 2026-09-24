import React, { useState, useEffect } from 'react';
import { Sparkles, Palette, Check, RefreshCw, BookmarkPlus, Download, Eye, Layers, Compass, Image as ImageIcon, Loader2 } from 'lucide-react';
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
  { id: 'hue', name: 'Hoàng Thành Huế (Cổ Kính)', prompt: 'courtyard of Imperial Citadel of Hue with ancient weathered moss-stone architecture' },
  { id: 'hoian', name: 'Phố Cổ Hội An (Hoài Niệm)', prompt: 'heritage ancient streets of Hoi An with warm lanterns and weathered ochre walls' },
  { id: 'tearoom', name: 'Gian Trà Đạo Cổ (Trầm Lắng)', prompt: 'minimalist traditional Vietnamese wooden tea pavilion with bamboo blinds' },
  { id: 'studio', name: 'Studio Editorial Tối Giản', prompt: 'clean minimalist haute-couture photo studio with soft gallery spotlighting' },
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

  // Real outfits from Supabase database
  const [garments, setGarments] = useState<Outfit[]>(outfits && outfits.length > 0 ? outfits : []);
  const [isLoadingGarments, setIsLoadingGarments] = useState(false);

  useEffect(() => {
    if (outfits && outfits.length > 0) {
      setGarments(outfits);
    } else {
      let isMounted = true;
      const load = async () => {
        setIsLoadingGarments(true);
        try {
          const res = await fetchOutfits();
          if (isMounted && res.data && res.data.length > 0) {
            setGarments(res.data);
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
    return outfits && outfits.length > 0 ? outfits[0] : null;
  });

  useEffect(() => {
    if (garments.length > 0) {
      if (!selectedGarment || !garments.some((g) => g.id === selectedGarment.id)) {
        setSelectedGarment(garments[0]);
      }
    }
  }, [garments, selectedGarment]);

  const selectedGarmentName = selectedGarment && selectedGarment.name && selectedGarment.name !== 'null'
    ? selectedGarment.name
    : (garments[0]?.name && garments[0]?.name !== 'null' ? garments[0].name : 'Cổ Phục');

  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([
    'Kiềng bạc hoa sen chạm lộng',
    'Mấn gấm dệt chỉ vàng',
  ]);
  const [selectedPrimaryColor, setSelectedPrimaryColor] = useState(PRIMARY_COLORS[0]);
  const [selectedAccentColor, setSelectedAccentColor] = useState(ACCENT_COLORS[0]);
  const [selectedBackdrop, setSelectedBackdrop] = useState(BACKDROP_OPTIONS[0]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    imageUrl: string;
    promptUsed: string;
    model: string;
    isSaved: boolean;
  } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Toggle accessory
  const handleToggleAccessory = (acc: string) => {
    setSelectedAccessories((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  };

  // Generate Image via API Route
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const res = await fetch('/api/generate-outfit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garment_type: selectedGarmentName,
          accessories: selectedAccessories,
          primary_color: selectedPrimaryColor.name,
          secondary_color: selectedAccentColor.name,
          background_vibe: selectedBackdrop.prompt,
        }),
      });

      if (!res.ok) {
        throw new Error(`Lỗi máy chủ (${res.status}): Không thể tạo ảnh.`);
      }

      const data = await res.json();
      if (!data.image_url) {
        throw new Error(data.error || 'Không nhận được dữ liệu hình ảnh.');
      }

      const newResult = {
        imageUrl: data.image_url,
        promptUsed: data.prompt_used || '',
        model: data.model || 'gemini-3.1-flash-image',
        isSaved: false,
      };

      setGeneratedResult(newResult);

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
          image_url: data.image_url,
        });
        setGeneratedResult({ ...newResult, isSaved: true });
      }
    } catch (err: any) {
      console.error('Image generation error:', err);
      setGenerationError(err?.message || 'Không thể tạo hình ảnh. Vui lòng thử lại.');
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

  return (
    <div className="space-y-16 pb-28 text-[#141210]">
      {/* Studio Header */}
      <div className="border-b border-[#EBE4D8] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#8B1E1E] font-semibold block mb-1">
            VIESTYLE AI LAB
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#141210] tracking-tight">
            Mix & Match Studio
          </h1>
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
                1. Loại Trang Phục
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
            ) : garments.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {garments.map((garment) => {
                  const isSelected = selectedGarment?.id === garment.id;
                  const nameDisplay = normalizeOutfitValue(garment.name);
                  const styleTags = normalizeOutfitArray(garment.style_tags);
                  const firstTag = styleTags[0] && styleTags[0] !== 'null' ? styleTags[0] : 'Cổ Phục';
                  const descDisplay = garment.description && garment.description !== 'null' ? garment.description : '';
                  const hasImage = Boolean(garment.image_url && garment.image_url.trim() && garment.image_url !== 'null');

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
                              {descDisplay || 'null'}
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
            ) : (
              <div className="p-8 text-center text-xs text-[#78716A] border border-[#EBE4D8] rounded-sm bg-[#FFFFFF]">
                Kho cổ phục đang được kết nối.
              </div>
            )}
          </div>

          {/* 2. Chọn Phụ Kiện (Multi-Select) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#EBE4D8] pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#78716A]">
                2. Phụ Kiện Truyền Thống ({selectedAccessories.length})
              </span>
              <span className="text-[11px] text-[#78716A]">Tùy chọn đa dạng</span>
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

          {/* 3. Phối Màu Sắc */}
          <div className="space-y-4">
            <div className="border-b border-[#EBE4D8] pb-2 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#78716A]">
                3. Bảng Màu Sắc
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
              <span className="text-[11px] text-[#78716A] block">Màu Điểm Xuyết & Họa Tiết:</span>
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

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              id="generate-mix-btn"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 px-6 rounded-sm bg-[#8B1E1E] hover:bg-[#721616] disabled:opacity-50 text-[#FAF7F2] text-xs font-medium uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 transition-all shadow-xs"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FAF7F2]" />
                  <span>Đang Khởi Tạo Bản Phối AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#FAF7F2]" />
                  <span>Tạo Bản Phối AI</span>
                </>
              )}
            </button>

            {generationError && (
              <div className="mt-3 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-sm">
                {generationError}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: High-Fashion Preview Stage (5 cols) */}
        <div className="lg:col-span-5 sticky top-28 space-y-4">
          <div className="bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-mono text-[#78716A] border-b border-[#EBE4D8] pb-2">
              <span className="uppercase tracking-wider">Khung Trưng Bày AI</span>
              <span className="text-[#8B1E1E] font-sans">
                {generatedResult ? 'Đã Xuất Bản' : 'Xem Trước'}
              </span>
            </div>

            {/* Visual Box with aspect-[3/4] */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xs bg-[#EAE3D6] border border-[#E3D9C8]">
              {isGenerating ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4 bg-[#EDE6DB]/80 backdrop-blur-xs">
                  <div className="w-12 h-12 rounded-full border-2 border-[#8B1E1E] border-t-transparent animate-spin" />
                  <div className="text-center space-y-1">
                    <p className="font-serif text-[#141210] font-medium text-base">
                      Đang Tạo Tạo Tác Phục Trang
                    </p>
                    <p className="text-[11px] font-mono text-[#78716A]">
                      Google Gemini Image Model
                    </p>
                  </div>
                </div>
              ) : generatedResult ? (
                <img
                  src={generatedResult.imageUrl}
                  alt={selectedGarmentName}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#FAF7F2]">
                  <div className="w-12 h-12 rounded-full border border-[#EBE4D8] flex items-center justify-center bg-[#FFFFFF] text-[#8B1E1E] shadow-2xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif text-sm font-medium text-[#141210]">
                      Mix & Match Studio
                    </p>
                    <p className="text-[10px] font-mono text-[#78716A] uppercase tracking-wider">
                      Bấm "Tạo Bản Phối AI" Để Khởi Tạo
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
                {selectedAccessories.slice(0, 3).map((acc) => (
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
              <div className="pt-3 border-t border-[#EBE4D8] flex items-center gap-2">
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
          <div className="p-12 text-center border border-dashed border-[#DCD3C4] rounded-sm bg-[#FAF7F2] space-y-3">
            <Sparkles className="w-6 h-6 text-[#C5A059] mx-auto" />
            <p className="text-xs text-[#78716A] font-mono">
              Chưa có bản phối nào được lưu. Hãy chọn trang phục và nhấn "Tạo Bản Phối AI".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {mixHistory.map((item) => (
              <div
                key={item.id}
                className="group bg-[#FFFFFF] border border-[#EBE4D8] hover:border-[#8B1E1E] rounded-sm overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#EAE3D6]">
                    <img
                      src={item.image_url}
                      alt={item.garment_type}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-xs bg-[#FAF7F2]/90 text-[#141210] border border-[#EBE4D8] font-medium font-mono">
                        {item.primary_color}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-1">
                    <h4 className="font-serif text-[#141210] text-sm font-medium leading-snug line-clamp-1">
                      {item.garment_type}
                    </h4>
                    {item.accessories && item.accessories.length > 0 && (
                      <p className="text-[10px] text-[#78716A] line-clamp-1">
                        + {item.accessories.join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3 pt-1 border-t border-[#F4EFE5] flex items-center justify-between text-[10px] font-mono text-[#78716A]">
                  <span>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString('vi-VN')
                      : 'Mới phối'}
                  </span>
                  <button
                    onClick={() => {
                      const matchGarment = garments.find((g: Outfit) => g.name === item.garment_type);
                      if (matchGarment) setSelectedGarment(matchGarment);
                      if (item.accessories) setSelectedAccessories(item.accessories);
                      const matchColor = PRIMARY_COLORS.find((c) => c.name === item.primary_color);
                      if (matchColor) setSelectedPrimaryColor(matchColor);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-[#8B1E1E] hover:underline"
                  >
                    Tái Sử Dụng
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
