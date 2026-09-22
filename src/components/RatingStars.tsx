import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  value?: number | null;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Chưa phù hợp',
  2: 'Tạm chấp nhận',
  3: 'Khá hài hòa',
  4: 'Rất ấn tượng',
  5: 'Bản phối hoàn hảo',
};

export const RatingStars: React.FC<RatingStarsProps> = ({
  value = null,
  onChange,
  readOnly = false,
  size = 'md',
  showLabel = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const activeRating = hoverValue !== null ? hoverValue : (value || 0);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;
          return (
            <button
              key={star}
              type="button"
              id={`rating-star-${star}`}
              disabled={readOnly}
              onClick={() => {
                if (!readOnly && onChange) {
                  onChange(star);
                }
              }}
              onMouseEnter={() => !readOnly && setHoverValue(star)}
              onMouseLeave={() => !readOnly && setHoverValue(null)}
              className={`p-0.5 transition-all duration-150 rounded ${
                readOnly
                  ? 'cursor-default'
                  : 'cursor-pointer hover:scale-110 active:scale-95'
              }`}
              title={RATING_LABELS[star]}
            >
              <Star
                className={`${starSizes[size]} transition-colors duration-150 ${
                  isFilled
                    ? 'text-[#B37D50] fill-[#B37D50]'
                    : 'text-[#D8CEBD] hover:text-[#B37D50]'
                }`}
              />
            </button>
          );
        })}
        {value && !showLabel && (
          <span className="ml-1 text-xs font-mono font-medium text-[#B37D50]">
            {value}/5
          </span>
        )}
      </div>
      {showLabel && activeRating > 0 && (
        <span className="text-[11px] text-[#8C5D36] font-medium tracking-wide">
          {RATING_LABELS[activeRating]}
        </span>
      )}
    </div>
  );
};

