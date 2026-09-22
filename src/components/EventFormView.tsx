import React, { useState } from 'react';
import { Sparkles, Calendar, MapPin, ArrowRight, Loader2, CheckCircle, Star } from 'lucide-react';
import { EventContext, UserPreferences, SuggestionHistory } from '../types';

interface EventFormViewProps {
  user: any | null;
  preferences: UserPreferences | null;
  history?: SuggestionHistory[];
  pastHistory?: SuggestionHistory[];
  onSubmit: (context: EventContext) => Promise<void>;
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

export const EventFormView: React.FC<EventFormViewProps> = ({
  user,
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

    await onSubmit({
      event_name: eventName.trim(),
      event_place: eventPlace.trim(),
      event_type: eventType,
      dress_code: dressCode.trim() || undefined,
      weather_notes: weatherNotes.trim() || undefined,
    });
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
    </div>
  );
};
