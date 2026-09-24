import React, { useState, useEffect } from 'react';
import { Check, Plus, CheckCircle2, User, Lock } from 'lucide-react';
import { UserPreferences } from '../types';
import { getSupabaseClient } from '../lib/supabase';

interface PreferencesViewProps {
  user: any | null;
  preferences: UserPreferences | null;
  onSave: (preferences: UserPreferences) => Promise<void>;
  onComplete?: () => void;
  onOpenAuth?: () => void;
}

const PRESET_PERSONALITIES = [
  'Cung Đình Triều Nguyễn',
  'Thanh Lịch Tinh Tế',
  'Trang Nghiêm Đoan Trang',
  'Mộc Mạc Dân Gian',
  'Phóng Khoáng Tự Do',
  'Trẻ Trung Đương Đại',
];

const PRESET_HOBBIES = [
  'Triển Lãm & Tranh Lụa',
  'Thưởng Trà Đạo',
  'Dạo Phố Cổ & Di Tích',
  'Hòa Nhạc & Nhà Hát',
  'Chụp Ảnh Cổ Phục',
  'Lễ Hội Truyền Thống',
];

const PRESET_COLORS = [
  { name: 'Đỏ Son Cung Đình', hex: '#8B1E1E' },
  { name: 'Vàng Hoàng Yến', hex: '#C5A059' },
  { name: 'Trắng Ngà Tơ Tằm', hex: '#FAF7F2' },
  { name: 'Xanh Chàm Sâu', hex: '#1B3B4B' },
  { name: 'Hồng Sen Mộc', hex: '#C47D8A' },
  { name: 'Nâu Trầm Đất', hex: '#5D4037' },
  { name: 'Xanh Ngọc Lam', hex: '#3B7A75' },
  { name: 'Đen Tuyền', hex: '#141210' },
];

export const PreferencesView: React.FC<PreferencesViewProps> = ({
  user,
  preferences,
  onSave,
  onComplete,
  onOpenAuth,
}) => {
  const [name, setName] = useState(preferences?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || '');
  const [age, setAge] = useState(preferences?.age?.toString() || '26');
  const [personalities, setPersonalities] = useState<string[]>(preferences?.personalities || ['Cung Đình Triều Nguyễn', 'Thanh Lịch Tinh Tế']);
  const [hobbies, setHobbies] = useState<string[]>(preferences?.hobbies || ['Triển Lãm & Tranh Lụa', 'Thưởng Trà Đạo']);
  const [favouriteColor, setFavouriteColor] = useState(preferences?.favourite_color || 'Đỏ Son Cung Đình');
  
  const [customPersonality, setCustomPersonality] = useState('');
  const [customHobby, setCustomHobby] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (preferences) {
      setName(preferences.name || '');
      setAge(preferences.age ? preferences.age.toString() : '26');
      setPersonalities(preferences.personalities || []);
      setHobbies(preferences.hobbies || []);
      setFavouriteColor(preferences.favourite_color || 'Đỏ Son Cung Đình');
    } else if (user) {
      if (!name) {
        setName(user.user_metadata?.name || user.email?.split('@')[0] || '');
      }
    }
  }, [preferences, user]);

  const togglePersonality = (p: string) => {
    if (personalities.includes(p)) {
      setPersonalities(personalities.filter((item) => item !== p));
    } else {
      setPersonalities([...personalities, p]);
    }
  };

  const addCustomPersonality = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPersonality.trim() && !personalities.includes(customPersonality.trim())) {
      setPersonalities([...personalities, customPersonality.trim()]);
      setCustomPersonality('');
    }
  };

  const toggleHobby = (h: string) => {
    if (hobbies.includes(h)) {
      setHobbies(hobbies.filter((item) => item !== h));
    } else {
      setHobbies([...hobbies, h]);
    }
  };

  const addCustomHobby = (e: React.FormEvent) => {
    e.preventDefault();
    if (customHobby.trim() && !hobbies.includes(customHobby.trim())) {
      setHobbies([...hobbies, customHobby.trim()]);
      setCustomHobby('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      // Chuyển đổi đúng định dạng kiểu dữ liệu:
      // age: số nguyên (int4)
      // personalities, hobbies: mảng chuỗi (text[])
      const parsedAge = parseInt(String(age), 10);
      const safeAge = isNaN(parsedAge) ? 26 : Math.max(1, Math.min(120, Math.floor(parsedAge)));
      const safePersonalities = Array.isArray(personalities)
        ? personalities.map((p) => String(p).trim()).filter(Boolean)
        : [];
      const safeHobbies = Array.isArray(hobbies)
        ? hobbies.map((h) => String(h).trim()).filter(Boolean)
        : [];
      const safeName = name.trim();
      const safeColor = (favouriteColor || '').trim();

      // Cú pháp bắt buộc theo yêu cầu:
      // await supabase.from('profiles').update({ name, age, personalities, hobbies, favourite_color }).eq('id', user.id);
      const client = getSupabaseClient();
      if (client && user.id) {
        const { error: updateErr } = await client
          .from('profiles')
          .update({
            name: safeName,
            age: safeAge,
            personalities: safePersonalities,
            hobbies: safeHobbies,
            favourite_color: safeColor,
          })
          .eq('id', user.id);

        if (updateErr) {
          console.error('Lỗi cập nhật bảng profiles:', updateErr);
          throw updateErr;
        }
      }

      await onSave({
        user_id: user.id,
        name: safeName,
        age: safeAge,
        personalities: safePersonalities,
        hobbies: safeHobbies,
        favourite_color: safeColor,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (onComplete) onComplete();
    } catch (err: any) {
      console.error('Lỗi khi lưu thông tin:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 text-[#141210]">
      {/* Unauthenticated Alert */}
      {!user && (
        <div className="p-4 rounded-sm bg-[#FFFFFF] border border-[#EBE4D8] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-[#141210]">
            <Lock className="w-4 h-4 text-[#8B1E1E]" />
            <span>Chưa đăng nhập tài khoản.</span>
          </div>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-4 py-1.5 rounded-sm bg-[#8B1E1E] hover:bg-[#721616] text-[#FAF7F2] text-xs font-medium uppercase tracking-wider"
            >
              Đăng Nhập
            </button>
          )}
        </div>
      )}

      {/* Header - No Fluff */}
      <div className="space-y-2 border-b border-[#EBE4D8] pb-5">
        <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#8B1E1E] font-semibold block">
          VIESTYLE PROFILE
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#141210] tracking-tight">
          Hồ Sơ Phong Cách
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm p-6 sm:p-8 space-y-8 shadow-xs">
        {/* Identity */}
        <div className="space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider text-[#8B1E1E] font-semibold block">
            1. Thông Tin Cá Nhân
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="pref-name-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210]">
                Tên / Danh Xưng <span className="text-[#8B1E1E]">*</span>
              </label>
              <input
                id="pref-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Lan Anh"
                className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pref-age-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210]">
                Độ Tuổi
              </label>
              <input
                id="pref-age-input"
                type="number"
                min={10}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E]"
              />
            </div>
          </div>
        </div>

        {/* Personalities */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8B1E1E] font-semibold">
              2. Cá Tính Thẩm Mỹ
            </span>
            <span className="text-[11px] font-mono text-[#78716A]">
              ({personalities.length})
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_PERSONALITIES.map((p) => {
              const isSelected = personalities.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePersonality(p)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#8B1E1E] text-[#FAF7F2]'
                      : 'bg-[#FAF7F2] text-[#59534B] border border-[#EBE4D8] hover:border-[#8B1E1E]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  {p}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 max-w-sm pt-1">
            <input
              type="text"
              value={customPersonality}
              onChange={(e) => setCustomPersonality(e.target.value)}
              placeholder="Thêm cá tính..."
              className="px-3 py-1.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-xs text-[#141210] focus:outline-none focus:border-[#8B1E1E] flex-1"
            />
            <button
              type="button"
              onClick={addCustomPersonality}
              className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#EBE4D8] border border-[#EBE4D8] text-[#141210] rounded-sm text-xs font-mono flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
        </div>

        {/* Hobbies */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8B1E1E] font-semibold">
              3. Sở Thích & Không Gian
            </span>
            <span className="text-[11px] font-mono text-[#78716A]">
              ({hobbies.length})
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESET_HOBBIES.map((h) => {
              const isSelected = hobbies.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleHobby(h)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#8B1E1E] text-[#FAF7F2]'
                      : 'bg-[#FAF7F2] text-[#59534B] border border-[#EBE4D8] hover:border-[#8B1E1E]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  {h}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 max-w-sm pt-1">
            <input
              type="text"
              value={customHobby}
              onChange={(e) => setCustomHobby(e.target.value)}
              placeholder="Thêm sở thích..."
              className="px-3 py-1.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-xs text-[#141210] focus:outline-none focus:border-[#8B1E1E] flex-1"
            />
            <button
              type="button"
              onClick={addCustomHobby}
              className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#EBE4D8] border border-[#EBE4D8] text-[#141210] rounded-sm text-xs font-mono flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Thêm
            </button>
          </div>
        </div>

        {/* Favorite Color */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8B1E1E] font-semibold">
              4. Tông Màu Chủ Đạo
            </span>
            <span className="text-xs font-mono text-[#8B1E1E]">
              {favouriteColor}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRESET_COLORS.map((c) => {
              const isSelected = favouriteColor === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setFavouriteColor(c.name)}
                  className={`p-2.5 rounded-sm border text-left transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'border-[#8B1E1E] bg-[#FAF7F2] ring-1 ring-[#8B1E1E]'
                      : 'border-[#EBE4D8] bg-[#FAF7F2] hover:border-[#8B1E1E]'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-xs font-medium text-[#141210] truncate">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <div className="pt-4 border-t border-[#EBE4D8] flex items-center justify-between">
          <div>
            {savedSuccess && (
              <span className="text-xs font-mono text-emerald-800 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã lưu thành công!
              </span>
            )}
          </div>

          <button
            id="save-preferences-btn"
            type="submit"
            disabled={isSaving || !name.trim()}
            className="px-8 py-3 rounded-sm bg-[#8B1E1E] hover:bg-[#721616] text-[#FAF7F2] font-medium text-xs uppercase tracking-[0.18em] transition-all shadow-xs disabled:opacity-50"
          >
            {isSaving ? 'Đang Lưu...' : 'Lưu Hồ Sơ'}
          </button>
        </div>
      </form>
    </div>
  );
};
