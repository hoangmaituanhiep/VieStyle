import React, { useState } from 'react';
import { Sparkles, Calendar, MapPin, ArrowRight, Loader2, CheckCircle, Star, X } from 'lucide-react';
import { EventContext, UserPreferences, SuggestionHistory, Outfit } from '../types';

interface EventFormViewProps {
  user: any | null;
  outfits?: Outfit[];
  preferences: UserPreferences | null;
  history?: SuggestionHistory[];
  pastHistory?: SuggestionHistory[];
  onSubmit: (context: EventContext) => Promise<any>;
  isLoading: boolean;
  onNavigateToPreferences: () => void;
  onOpenAuth?: () => void;
  prefilledOutfitName?: string;
}

const VIETNAMESE_EVENT_PRESETS = [
  {
    name: 'Tết Nguyên Đán',
    place: 'Hà Nội & Huế',
    type: 'lunar_new_year' as const,
    dressCode: 'Áo dài son đỏ hoặc gấm hoa',
    weatherNotes: '18°C se lạnh',
    badge: 'Tết',
  },
  {
    name: 'Lễ Cưới Truyền Thống',
    place: 'Trung Tâm Tiệc Cưới',
    type: 'wedding' as const,
    dressCode: 'Áo dài đoan trang, kiềng bạc',
    weatherNotes: 'Phòng tiệc máy lạnh',
    badge: 'Cưới',
  },
  {
    name: 'Thưởng Trà & Triển Lãm',
    place: 'Không Gian Văn Hóa',
    type: 'informal' as const,
    dressCode: 'Áo tứ thân hoặc giao lĩnh lụa sống',
    weatherNotes: 'Mát mẻ trong nhà',
    badge: 'Nghệ Thuật',
  },
  {
    name: 'Hội Nghị Ngoại Giao',
    place: 'Trung Tâm Hội Nghị Quốc Gia',
    type: 'formal' as const,
    dressCode: 'Áo ngũ thân tay chẽn tối giản',
    weatherNotes: '22°C điều hòa',
    badge: 'Trang Trọng',
  },
];

const normalizeOutfitArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null' || trimmed === '{}') return [];
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

export const EventFormView: React.FC<EventFormViewProps> = ({
  user,
  outfits = [],
  preferences,
  history = [],
  pastHistory = [],
  onSubmit,
  isLoading,
  onNavigateToPreferences,
  onOpenAuth,
  prefilledOutfitName,
}) => {
  const [eventName, setEventName] = useState('');
  const [eventPlace, setEventPlace] = useState('');
  const [eventType, setEventType] = useState<EventContext['event_type']>('traditional');
  const [dressCode, setDressCode] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('');
  const [suggestedOutfit, setSuggestedOutfit] = useState<Outfit | null>(null);

  const allHistory = history.length > 0 ? history : pastHistory;
  const ratedHistory = allHistory.filter((h) => h.rating && h.rating > 0);

  const applyPreset = (preset: (typeof VIETNAMESE_EVENT_PRESETS)[0]) => {
    setEventName(preset.name);
    setEventPlace(preset.place);
    setEventType(preset.type);
    setDressCode(preset.dressCode);
    setWeatherNotes(preset.weatherNotes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !eventPlace.trim()) return;

    const result = await onSubmit({
      event_name: eventName.trim(),
      event_place: eventPlace.trim(),
      event_type: eventType,
      dress_code: dressCode.trim() || undefined,
      weather_notes: weatherNotes.trim() || undefined,
    });

    if (result) {
      const targetId =
        result.outfit_id ||
        result.selected_outfit_id ||
        (result.outfit && result.outfit.id) ||
        result.id;
      const found = (outfits || []).find((o) => o.id === targetId) || result.outfit || null;
      if (found) {
        setSuggestedOutfit(found);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 text-[#141210]">
      {/* Minimal Header */}
      <div className="space-y-2 border-b border-[#EBE4D8] pb-5">
        <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#8B1E1E] font-semibold block">
          VIESTYLE LAB
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#141210] tracking-tight">
          Phối Đồ Cho Sự Kiện
        </h1>

        {prefilledOutfitName && (
          <div className="p-3 rounded-sm bg-[#FFFFFF] border border-[#EBE4D8] text-xs text-[#141210] flex items-center gap-2 mt-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Mẫu đã chọn: <strong className="text-[#8B1E1E]">{prefilledOutfitName}</strong></span>
          </div>
        )}
      </div>

      {/* Cultural Quick Presets */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#78716A] block">
          Bối Cảnh Mẫu
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {VIETNAMESE_EVENT_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-left p-3 rounded-sm bg-[#FFFFFF] border border-[#EBE4D8] hover:border-[#8B1E1E] transition-all group"
            >
              <span className="text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-sm bg-[#FAF7F2] text-[#8B1E1E] border border-[#EBE4D8] font-semibold block w-fit mb-1.5">
                {p.badge}
              </span>
              <p className="font-serif text-xs font-medium text-[#141210] group-hover:text-[#8B1E1E] truncate">
                {p.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Name & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label htmlFor="event-name-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210]">
              Tên Sự Kiện <span className="text-[#8B1E1E]">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8A8277]" />
              <input
                id="event-name-input"
                type="text"
                required
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Ví dụ: Tết Nguyên Đán, Lễ Cưới"
                className="w-full pl-9 pr-3 py-2.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] placeholder:text-[#9E9689]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="event-place-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210]">
              Địa Điểm <span className="text-[#8B1E1E]">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-3.5 h-3.5 text-[#8A8277]" />
              <input
                id="event-place-input"
                type="text"
                required
                value={eventPlace}
                onChange={(e) => setEventPlace(e.target.value)}
                placeholder="Ví dụ: Hoàng Thành, Hà Nội"
                className="w-full pl-9 pr-3 py-2.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] placeholder:text-[#9E9689]"
              />
            </div>
          </div>
        </div>

        {/* Type & Dress Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label htmlFor="event-type-select" className="block text-xs font-mono uppercase tracking-wider text-[#141210]">
              Phân Loại <span className="text-[#8B1E1E]">*</span>
            </label>
            <select
              id="event-type-select"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventContext['event_type'])}
              className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] cursor-pointer font-sans"
            >
              <option value="traditional">Truyền Thống</option>
              <option value="wedding">Lễ Cưới</option>
              <option value="formal">Dạ Tiệc Trang Trọng</option>
              <option value="informal">Nghệ Thuật & Trà Đạo</option>
              <option value="business">Công Sở & Hội Nghị</option>
              <option value="date_night">Hẹn Hò & Dạo Phố</option>
              <option value="festival">Lễ Hội Dân Gian</option>
              <option value="casual">Thường Nhật</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="dress-code-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210]">
              Dress Code
            </label>
            <input
              id="dress-code-input"
              type="text"
              value={dressCode}
              onChange={(e) => setDressCode(e.target.value)}
              placeholder="Ví dụ: Áo dài đỏ, tơ tằm"
              className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] placeholder:text-[#9E9689]"
            />
          </div>
        </div>

        {/* Weather */}
        <div className="space-y-1.5">
          <label htmlFor="weather-notes-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210]">
            Thời Tiết
          </label>
          <input
            id="weather-notes-input"
            type="text"
            value={weatherNotes}
            onChange={(e) => setWeatherNotes(e.target.value)}
            placeholder="Ví dụ: 20°C, se lạnh"
            className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] placeholder:text-[#9E9689]"
          />
        </div>

        {/* Profile Status Bar */}
        <div className="p-3.5 rounded-sm bg-[#FAF7F2] border border-[#EBE4D8] flex items-center justify-between text-xs text-[#59534B]">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8B1E1E]" />
            {user ? (
              preferences?.name ? `Hồ sơ: ${preferences.name}` : `Tài khoản: ${user.email}`
            ) : (
              'Chưa đăng nhập'
            )}
          </span>

          {ratedHistory.length > 0 && (
            <span className="text-[11px] text-[#78716A] flex items-center gap-1">
              <Star className="w-3 h-3 text-[#C5A059] fill-[#C5A059]" /> {ratedHistory.length} đánh giá
            </span>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end">
          <button
            id="trigger-ai-suggestion-btn"
            type="submit"
            disabled={isLoading || !eventName.trim() || !eventPlace.trim()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-sm bg-[#8B1E1E] hover:bg-[#721616] text-[#FAF7F2] font-medium text-xs uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang Gợi Ý...</span>
              </>
            ) : (
              <>
                <span>Phối Đồ Ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Overlay Toàn Màn Hình Hiển Thị Trang Phục Được Chọn (Chuẩn VieStyle Minimalist) */}
      {suggestedOutfit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          {/* Nút Đóng đặt ở góc phải trên cùng gọn gàng */}
          <button
            type="button"
            onClick={() => setSuggestedOutfit(null)}
            className="absolute top-5 right-5 sm:top-7 sm:right-7 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors z-20 focus:outline-none"
            aria-label="Đóng"
          >
            <X className="w-6 h-6 stroke-[1.5]" />
          </button>

          {/* Visual Card giống hệt như khi xem trong Kho trang phục */}
          <div className="w-full max-w-xs sm:max-w-sm bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Hình ảnh to, sắc nét, bọc viền tinh tế */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#EAE3D6]">
              {suggestedOutfit.image_url ? (
                <img
                  src={suggestedOutfit.image_url}
                  alt={suggestedOutfit.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center font-mono text-xs text-[#78716A] bg-[#EDE6DB]">
                  Trang Phục Được Chọn
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

              <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                {normalizeOutfitArray(suggestedOutfit.event_types).slice(0, 2).map((et) => (
                  <span
                    key={et}
                    className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-sm bg-[#FAF7F2]/90 text-[#141210] border border-[#EBE4D8]"
                  >
                    {et}
                  </span>
                ))}
              </div>
            </div>

            {/* Ràng buộc Minimalist: Chữ chỉ chiếm 10% (Tên, mô tả ngắn gọn) */}
            <div className="p-4 space-y-1.5 bg-[#FFFFFF]">
              <h3 className="font-serif font-medium text-[#141210] text-base sm:text-lg leading-snug line-clamp-1">
                {suggestedOutfit.name}
              </h3>
              {suggestedOutfit.description && (
                <p className="text-xs text-[#59534B] font-sans line-clamp-1">
                  {suggestedOutfit.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {normalizeOutfitArray(suggestedOutfit.style_tags).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#FAF7F2] text-[#78716A] border border-[#EBE4D8]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
