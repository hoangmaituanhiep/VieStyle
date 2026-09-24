import React from 'react';
import { X, SlidersHorizontal, MapPin } from 'lucide-react';
import { Outfit, SuggestionHistory, normalizeOutfitValue, normalizeOutfitArray } from '../types';
import { RatingStars } from './RatingStars';

interface OutfitDetailModalProps {
  outfit: Outfit | null;
  suggestion?: SuggestionHistory | null;
  isOpen: boolean;
  onClose: () => void;
  onRate?: (rating: number) => void;
  onStyleThisForEvent?: (outfit: Outfit) => void;
}

export const OutfitDetailModal: React.FC<OutfitDetailModalProps> = ({
  outfit,
  suggestion,
  isOpen,
  onClose,
  onRate,
  onStyleThisForEvent,
}) => {
  if (!isOpen || !outfit) return null;

  const outfitId = normalizeOutfitValue(outfit.id);
  const outfitName = normalizeOutfitValue(outfit.name);
  const outfitDesc = normalizeOutfitValue(outfit.description);
  const eventTypes = normalizeOutfitArray(outfit.event_types);
  const styleTags = normalizeOutfitArray(outfit.style_tags);
  const colors = normalizeOutfitArray(outfit.colors);
  const imageUrl = outfit.image_url && outfit.image_url.trim() !== '' ? outfit.image_url : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm shadow-2xl overflow-hidden text-[#141210]">
        {/* Close Button */}
        <button
          id="close-outfit-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] text-[#141210] transition-colors border border-[#EBE4D8] shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[85vh] overflow-y-auto">
          {/* Visual Column - Uniform aspect-[3/4] Image */}
          <div className="md:col-span-7 relative bg-[#EAE3D6] flex items-center justify-center aspect-[3/4] md:aspect-auto min-h-[380px] md:min-h-[560px] overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={outfitName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center font-mono text-sm text-[#78716A] bg-[#EDE6DB]">
                null
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Details Column - Minimalist & Airy */}
          <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-[#FAF7F2]">
            <div className="space-y-5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B1E1E] font-semibold block mb-1">
                  VIESTYLE
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#141210] tracking-tight leading-snug">
                  {outfitName}
                </h2>
                <p className="text-xs text-[#59534B] font-sans pt-2">
                  {outfitDesc}
                </p>
              </div>

              {/* Event types */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase font-mono tracking-wider text-[#78716A] block">
                  Dịp Sự Kiện
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {eventTypes.map((et) => (
                    <span
                      key={et}
                      className="text-xs px-2.5 py-0.5 rounded-sm bg-[#FFFFFF] text-[#141210] border border-[#EBE4D8] capitalize font-medium"
                    >
                      {et}
                    </span>
                  ))}
                </div>
              </div>

              {/* Style tags */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase font-mono tracking-wider text-[#78716A] block">
                  Phong Cách
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {styleTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-0.5 rounded-sm bg-[#FFFFFF] text-[#8B1E1E] border border-[#EBE4D8] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase font-mono tracking-wider text-[#78716A] block">
                  Màu Sắc
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {colors.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-sm bg-[#FFFFFF] border border-[#EBE4D8] text-[#141210]"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#8B1E1E]" />
                      <span className="capitalize">{color}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Suggestion Context if present */}
              {suggestion && (
                <div className="pt-3 border-t border-[#EBE4D8] space-y-2 bg-[#FFFFFF] p-4 rounded-sm border border-[#EBE4D8]">
                  <div className="text-xs text-[#141210] font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8B1E1E]" />
                    {suggestion.event_name || 'null'} — {suggestion.event_place || 'null'}
                  </div>

                  {suggestion.ai_reasoning && (
                    <p className="text-xs text-[#59534B] italic bg-[#FAF7F2] p-2.5 rounded-sm border border-[#EBE4D8]">
                      "{suggestion.ai_reasoning}"
                    </p>
                  )}

                  {suggestion.styling_tips && (
                    <div className="text-xs text-[#59534B]">
                      <strong className="text-[#8B1E1E]">Phối đồ:</strong> {suggestion.styling_tips}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#F0EAE0] flex items-center justify-between">
                    <span className="text-xs text-[#78716A]">Đánh giá:</span>
                    <RatingStars
                      value={suggestion.rating}
                      onChange={(r) => onRate && onRate(r)}
                      size="sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#EBE4D8] flex items-center gap-2">
              {onStyleThisForEvent && (
                <button
                  id="modal-style-for-event-btn"
                  onClick={() => {
                    onStyleThisForEvent(outfit);
                    onClose();
                  }}
                  className="flex-1 py-3 px-4 rounded-sm bg-[#8B1E1E] hover:bg-[#721616] text-[#FAF7F2] font-medium text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Phối Đồ Sự Kiện
                </button>
              )}
              <button
                id="modal-close-btn"
                onClick={onClose}
                className="py-3 px-4 rounded-sm bg-[#FFFFFF] hover:bg-[#FAF7F2] border border-[#EBE4D8] text-[#141210] text-xs font-medium uppercase tracking-wider transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
