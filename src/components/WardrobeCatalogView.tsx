import React, { useState } from 'react';
import { Search, Eye, Sparkles } from 'lucide-react';
import { Outfit } from '../types';

interface WardrobeCatalogViewProps {
  outfits: Outfit[];
  onSelectOutfit: (outfit: Outfit) => void;
  onStyleWithOutfit: (outfit: Outfit) => void;
}

export const WardrobeCatalogView: React.FC<WardrobeCatalogViewProps> = ({
  outfits,
  onSelectOutfit,
  onStyleWithOutfit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const allEventTypes = Array.from(
    new Set(outfits.flatMap((o) => o.event_types || []))
  );

  const allTags = Array.from(
    new Set(outfits.flatMap((o) => o.style_tags || []))
  );

  const filteredOutfits = outfits.filter((outfit) => {
    const matchesSearch =
      outfit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      outfit.style_tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesEventType =
      selectedEventType === 'all' ||
      outfit.event_types.includes(selectedEventType);

    const matchesTag =
      selectedTag === 'all' ||
      outfit.style_tags.includes(selectedTag);

    return matchesSearch && matchesEventType && matchesTag;
  });

  return (
    <div className="space-y-8 pb-28 text-[#141210]">
      {/* Editorial Header - Pure & Minimalist */}
      <div className="border-b border-[#EBE4D8] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#8B1E1E] font-semibold block mb-1">
            VIESTYLE ARCHIVE
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#141210] tracking-tight">
            Kho Cổ Phục ({outfits.length})
          </h1>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8A8277]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full pl-9 pr-3 py-2 bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] placeholder:text-[#9E9689]"
            />
          </div>

          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="px-3 py-2 bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] cursor-pointer font-sans"
          >
            <option value="all">Tất Cả Dịp</option>
            {allEventTypes.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-3 py-2 bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] cursor-pointer font-sans"
          >
            <option value="all">Tất Cả Thẻ</option>
            {allTags.map((t) => (
              <option key={t} value={t} className="capitalize">
                #{t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Editorial Garment Gallery Grid: Prominent Images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
        {filteredOutfits.map((outfit) => (
          <div
            key={outfit.id}
            className="group bg-[#FFFFFF] border border-[#EBE4D8] hover:border-[#8B1E1E] rounded-sm overflow-hidden shadow-xs transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Photo Mockup Container */}
              <div
                onClick={() => onSelectOutfit(outfit)}
                className="relative h-80 overflow-hidden cursor-pointer bg-[#EAE3D6]"
              >
                <img
                  src={outfit.image_url}
                  alt={outfit.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                  {outfit.event_types.slice(0, 2).map((et) => (
                    <span
                      key={et}
                      className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-sm bg-[#FAF7F2]/90 text-[#141210] border border-[#EBE4D8]"
                    >
                      {et}
                    </span>
                  ))}
                </div>

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-3.5 py-1.5 rounded-sm bg-[#FAF7F2]/95 text-[#141210] border border-[#EBE4D8] text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <Eye className="w-3.5 h-3.5 text-[#8B1E1E]" /> Xem Ảnh
                  </span>
                </div>
              </div>

              {/* Minimalist Card Content - Purely Name and Tags */}
              <div className="p-4 space-y-2">
                <h3
                  onClick={() => onSelectOutfit(outfit)}
                  className="font-serif font-medium text-[#141210] text-base leading-snug line-clamp-1 cursor-pointer group-hover:text-[#8B1E1E] transition-colors"
                >
                  {outfit.name}
                </h3>

                <div className="flex flex-wrap gap-1">
                  {outfit.style_tags.map((tag) => (
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

            {/* Footer Action */}
            <div className="p-4 pt-2 border-t border-[#F0EAE0] bg-[#FAF7F2] flex items-center gap-2">
              <button
                onClick={() => onSelectOutfit(outfit)}
                className="flex-1 py-2 px-2.5 rounded-sm bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#EBE4D8] text-[#141210] text-xs font-medium transition-colors uppercase tracking-wider text-center"
              >
                Chi Tiết
              </button>
              <button
                onClick={() => onStyleWithOutfit(outfit)}
                className="py-2 px-3 rounded-sm bg-[#8B1E1E] hover:bg-[#721616] text-[#FAF7F2] text-xs font-medium transition-colors flex items-center gap-1 uppercase tracking-wider shadow-xs"
              >
                <Sparkles className="w-3 h-3" />
                Phối Đồ
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredOutfits.length === 0 && (
        <div className="p-12 text-center bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm text-[#78716A] text-xs">
          Không tìm thấy thiết kế phù hợp.
        </div>
      )}
    </div>
  );
};
