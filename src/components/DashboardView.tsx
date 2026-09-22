import React from 'react';
import { ArrowRight, Star, MapPin, ChevronRight, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { Outfit, SuggestionHistory, UserPreferences } from '../types';
import { RatingStars } from './RatingStars';

interface DashboardViewProps {
  latestSuggestion: SuggestionHistory | null;
  history: SuggestionHistory[];
  preferences: UserPreferences | null;
  onRateSuggestion: (suggestionId: string, rating: number) => void;
  onSelectOutfit: (outfit: Outfit, suggestion?: SuggestionHistory) => void;
  onNavigateToEventForm: () => void;
  onNavigateToPreferences: () => void;
  isLoading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  latestSuggestion,
  history,
  preferences,
  onRateSuggestion,
  onSelectOutfit,
  onNavigateToEventForm,
  onNavigateToPreferences,
  isLoading,
}) => {
  const currentOutfit = latestSuggestion?.outfit;
  const featuredImage = currentOutfit?.image_url || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1400&q=80';

  const previousSuggestions = latestSuggestion
    ? history.filter((h) => h.id !== latestSuggestion.id)
    : history;

  const heritageSilhouettes = [
    {
      title: 'Áo Dài',
      tag: 'Tơ Tằm Vạn Phúc',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
      event: 'Tết & Lễ Cưới',
    },
    {
      title: 'Nhật Bình',
      tag: 'Cung Đình Huế',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      event: 'Nghi Lễ & Dạ Tiệc',
    },
    {
      title: 'Áo Tứ Thân & Yếm',
      tag: 'Lụa Sống & Đũi Thô',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
      event: 'Lễ Hội & Trà Đạo',
    },
    {
      title: 'Áo Ngũ Thân',
      tag: 'Tay Chẽn Đương Đại',
      image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=80',
      event: 'Ngoại Giao & Hội Nghị',
    },
  ];

  return (
    <div className="space-y-20 sm:space-y-28 pb-32 text-[#141210]">
      {/* 1. EDITORIAL HERO: AIRY, ZERO FILLER */}
      <section className="pt-4 sm:pt-10 space-y-8">
        <div className="flex items-center justify-between text-[11px] tracking-[0.25em] uppercase text-[#78716A] border-b border-[#EBE4D8] pb-4">
          <span className="font-semibold text-[#8B1E1E]">VIESTYLE</span>
          <span className="font-mono">CỔ PHỤC VIỆT</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif leading-[1.08] tracking-tight text-[#141210] max-w-3xl">
            Cổ phục Việt{' '}
            <span className="italic font-serif text-[#8B1E1E]">trong nhịp sống</span>{' '}
            đương đại.
          </h1>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="hero-start-explore-btn"
              onClick={onNavigateToEventForm}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#8B1E1E] hover:bg-[#721616] text-[#FAF7F2] text-xs font-medium uppercase tracking-[0.18em] rounded-sm transition-all shadow-xs"
            >
              <span>Phối Đồ Sự Kiện</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              id="hero-manifesto-btn"
              onClick={onNavigateToPreferences}
              className="px-7 py-3.5 border border-[#DCD3C4] hover:border-[#8B1E1E] bg-[#FFFFFF] hover:bg-[#FAF7F2] text-[#141210] text-xs font-medium uppercase tracking-[0.18em] rounded-sm transition-all"
            >
              Gu Thẩm Mỹ
            </button>
          </div>
        </div>
      </section>

      {/* 2. CENTERPIECE PHOTOGRAPHIC SHOWCASE */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-[#EBE4D8] pb-3">
          <h2 className="text-xl sm:text-2xl font-serif text-[#141210] font-medium">
            {latestSuggestion ? 'Bản Phối Dành Cho Bạn' : 'Thiết Kế Tiêu Điểm'}
          </h2>

          <button
            onClick={onNavigateToEventForm}
            className="text-xs font-medium text-[#8B1E1E] hover:text-[#721616] flex items-center gap-1 uppercase tracking-wider transition-colors"
          >
            Phối Mới <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Large Stage Showcase */}
        <div className="relative rounded-sm overflow-hidden min-h-[500px] lg:min-h-[620px] bg-[#EDE6DB] border border-[#E3D9C8] group flex flex-col justify-end shadow-xs">
          <img
            src={featuredImage}
            alt={currentOutfit?.name || 'Trang phục truyền thống'}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-101 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

          {/* Minimalist Floating Overlay Card: No fluff paragraphs */}
          <div className="relative z-10 m-5 sm:m-8 sm:max-w-md sm:ml-auto bg-[#FFFFFF]/95 backdrop-blur-md border border-[#EBE4D8] rounded-sm p-5 sm:p-6 shadow-md space-y-3 text-[#141210]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[0.2em] font-semibold text-[#8B1E1E] uppercase">
                {latestSuggestion?.event_type || 'CỔ PHỤC'}
              </span>
              {latestSuggestion?.event_place && (
                <span className="text-[11px] text-[#78716A] flex items-center gap-1 font-mono">
                  <MapPin className="w-3 h-3 text-[#C5A059]" /> {latestSuggestion.event_place}
                </span>
              )}
            </div>

            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#141210] leading-snug">
                {currentOutfit?.name || 'Áo Dài Tơ Tằm Hà Đông'}
              </h3>
            </div>

            {/* Quick tags instead of paragraphs */}
            {currentOutfit?.style_tags && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentOutfit.style_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-sm bg-[#FAF7F2] text-[#59534B] border border-[#EBE4D8]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Rating & Actions */}
            <div className="pt-3 border-t border-[#EBE4D8] flex items-center justify-between gap-3">
              {latestSuggestion ? (
                <div className="flex items-center gap-2">
                  <RatingStars
                    value={latestSuggestion.rating}
                    onChange={(r) => onRateSuggestion(latestSuggestion.id, r)}
                    size="sm"
                  />
                  {latestSuggestion.rating && (
                    <span className="text-[10px] text-emerald-800 font-mono flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> {latestSuggestion.rating}/5
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] text-[#78716A] tracking-wider uppercase font-mono">
                  VieStyle Collection
                </span>
              )}

              {currentOutfit && (
                <button
                  id="inspect-featured-outfit-btn"
                  onClick={() => onSelectOutfit(currentOutfit, latestSuggestion || undefined)}
                  className="text-xs font-semibold text-[#8B1E1E] hover:text-[#721616] flex items-center gap-1 uppercase tracking-wider transition-colors"
                >
                  Xem Ảnh <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. BỘ TỨ PHONG THÁI CỔ PHỤC (HERITAGE SILHOUETTES) */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-[#EBE4D8] pb-3">
          <h2 className="text-xl sm:text-2xl font-serif text-[#141210] font-medium">
            Bộ Tứ Phong Thái Việt
          </h2>
        </div>

        {/* 4 Clean Editorial Visual Cards - No Filler Text */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {heritageSilhouettes.map((item, index) => (
            <div
              key={index}
              onClick={onNavigateToEventForm}
              className="group cursor-pointer bg-[#FFFFFF] border border-[#EBE4D8] hover:border-[#8B1E1E] rounded-sm overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="relative h-72 overflow-hidden bg-[#EAE3D6]">
                  <img
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-sm bg-[#FAF7F2]/90 text-[#141210] border border-[#EBE4D8] font-medium">
                      {item.tag}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <h3 className="font-serif text-lg text-[#141210] font-medium group-hover:text-[#8B1E1E] transition-colors">
                    {item.title}
                  </h3>
                </div>
              </div>

              <div className="p-4 pt-2 border-t border-[#F4EFE5] flex items-center justify-between text-[10px] text-[#8B1E1E] font-medium uppercase tracking-wider">
                <span>{item.event}</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PREVIOUS SUGGESTIONS / LỊCH SỬ GỢI Ý */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#EBE4D8] pb-3">
          <h2 className="text-xl sm:text-2xl font-serif text-[#141210] font-medium">
            Lịch Sử Gợi Ý ({previousSuggestions.length})
          </h2>

          <button
            onClick={onNavigateToEventForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#DCD3C4] hover:border-[#8B1E1E] text-[#141210] text-xs font-medium uppercase tracking-wider rounded-sm transition-all self-start sm:self-auto"
          >
            <SlidersHorizontal className="w-3 h-3 text-[#8B1E1E]" />
            Thêm Sự Kiện
          </button>
        </div>

        {previousSuggestions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {previousSuggestions.map((item) => {
              const outfit = item.outfit;
              if (!outfit) return null;

              return (
                <div
                  key={item.id}
                  className="group bg-[#FFFFFF] border border-[#EBE4D8] hover:border-[#8B1E1E] rounded-sm overflow-hidden shadow-xs transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div
                      onClick={() => onSelectOutfit(outfit, item)}
                      className="relative h-64 overflow-hidden cursor-pointer bg-[#EAE3D6]"
                    >
                      <img
                        src={outfit.image_url}
                        alt={outfit.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                      <span className="absolute top-3 left-3 text-[9px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-sm bg-[#FAF7F2]/90 text-[#141210] border border-[#EBE4D8]">
                        {item.event_type}
                      </span>

                      {item.rating && (
                        <span className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-sm bg-[#8B1E1E] text-[#FAF7F2] flex items-center gap-1 shadow-xs">
                          <Star className="w-3 h-3 fill-[#FAF7F2]" />
                          {item.rating}/5
                        </span>
                      )}

                      <div className="absolute bottom-3 left-3 right-3 text-left">
                        <div className="text-xs font-medium text-white truncate drop-shadow-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#C5A059] shrink-0" />
                          {item.event_name}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-1">
                      <h4 
                        onClick={() => onSelectOutfit(outfit, item)}
                        className="font-serif font-medium text-[#141210] text-base leading-snug line-clamp-1 cursor-pointer group-hover:text-[#8B1E1E] transition-colors"
                      >
                        {outfit.name}
                      </h4>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {outfit.style_tags.slice(0, 2).map((t) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#FAF7F2] text-[#78716A] border border-[#EBE4D8]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-[#F0EAE0] bg-[#FAF7F2] flex items-center justify-between">
                    <RatingStars
                      value={item.rating}
                      onChange={(r) => onRateSuggestion(item.id, r)}
                      size="sm"
                    />

                    <button
                      onClick={() => onSelectOutfit(outfit, item)}
                      className="text-xs text-[#8B1E1E] hover:text-[#721616] font-semibold flex items-center gap-0.5 uppercase tracking-wider transition-colors"
                    >
                      Chi Tiết <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm text-[#78716A] text-xs">
            Chưa có bản phối sự kiện nào được lưu trữ.
          </div>
        )}
      </section>
    </div>
  );
};
