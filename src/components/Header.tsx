import React from 'react';
import { Sparkles, Shirt, Database, User, LogOut, SlidersHorizontal } from 'lucide-react';
import { UserPreferences } from '../types';

const ADMIN_UUID = 'dae05a68-ee99-470f-8f17-7db434e65f8d';

interface HeaderProps {
  activeTab: 'dashboard' | 'event-form' | 'preferences' | 'catalog' | 'supabase' | 'mix-match';
  setActiveTab: (tab: 'dashboard' | 'event-form' | 'preferences' | 'catalog' | 'supabase' | 'mix-match') => void;
  user: any | null;
  preferences: UserPreferences | null;
  isSupabaseConnected: boolean;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  preferences,
  isSupabaseConnected,
  onOpenAuth,
  onSignOut,
}) => {
  const isAdmin = user?.id === ADMIN_UUID;

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EBE4D8] text-[#141210]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Mark */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-sm bg-[#8B1E1E] flex items-center justify-center text-[#FAF7F2] font-serif font-bold text-xl shadow-xs group-hover:bg-[#721616] transition-all">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif tracking-tight font-bold text-xl text-[#141210]">
                  VieStyle
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-[#F2EDE2] text-[#8B1E1E] border border-[#E3D9C8] font-medium">
                  Cổ Phục Việt
                </span>
              </div>
            </div>
          </div>

          {/* Minimalist Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-3">
            <button
              id="nav-dashboard-btn"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 text-xs font-medium tracking-wider uppercase transition-all rounded-sm ${
                activeTab === 'dashboard'
                  ? 'text-[#8B1E1E] font-semibold bg-[#F4EFE5]'
                  : 'text-[#59534B] hover:text-[#141210] hover:bg-[#F6F2EA]'
              }`}
            >
              Trang Chủ
            </button>

            <button
              id="nav-mix-match-btn"
              onClick={() => setActiveTab('mix-match')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium tracking-wider uppercase transition-all rounded-sm ${
                activeTab === 'mix-match'
                  ? 'text-[#8B1E1E] font-semibold bg-[#F4EFE5]'
                  : 'text-[#59534B] hover:text-[#141210] hover:bg-[#F6F2EA]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8B1E1E]" />
              Mix & Match
            </button>

            <button
              id="nav-event-form-btn"
              onClick={() => setActiveTab('event-form')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium tracking-wider uppercase transition-all rounded-sm ${
                activeTab === 'event-form'
                  ? 'text-[#8B1E1E] font-semibold bg-[#F4EFE5]'
                  : 'text-[#59534B] hover:text-[#141210] hover:bg-[#F6F2EA]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Gợi Ý Sự Kiện
            </button>

            <button
              id="nav-preferences-btn"
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium tracking-wider uppercase transition-all rounded-sm ${
                activeTab === 'preferences'
                  ? 'text-[#8B1E1E] font-semibold bg-[#F4EFE5]'
                  : 'text-[#59534B] hover:text-[#141210] hover:bg-[#F6F2EA]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Gu Thời Trang
            </button>

            <button
              id="nav-catalog-btn"
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium tracking-wider uppercase transition-all rounded-sm ${
                activeTab === 'catalog'
                  ? 'text-[#8B1E1E] font-semibold bg-[#F4EFE5]'
                  : 'text-[#59534B] hover:text-[#141210] hover:bg-[#F6F2EA]'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              Kho Trang Phục
            </button>

            {/* Restricted SQL Admin Tab: Strictly visible ONLY to designated ADMIN_UUID */}
            {isAdmin && (
              <button
                id="nav-supabase-btn"
                onClick={() => setActiveTab('supabase')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium tracking-wider uppercase transition-all rounded-sm ${
                  activeTab === 'supabase'
                    ? 'text-[#8B1E1E] font-semibold bg-[#F4EFE5]'
                    : 'text-[#78716A] hover:text-[#141210] hover:bg-[#F6F2EA]'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Supabase SQL
                {isSupabaseConnected ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                )}
              </button>
            )}
          </nav>

          {/* Right Action: User account / Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5 bg-[#FFFFFF] px-3.5 py-1.5 rounded-full border border-[#EBE4D8] shadow-xs">
                <div 
                  onClick={() => setActiveTab('preferences')}
                  className="w-7 h-7 rounded-full bg-[#8B1E1E] flex items-center justify-center text-xs font-bold text-[#FAF7F2] uppercase cursor-pointer hover:opacity-90 transition-opacity"
                  title="Hồ sơ phong cách"
                >
                  {preferences?.name ? preferences.name.charAt(0) : (user.email?.charAt(0) || 'V')}
                </div>
                <div className="hidden sm:block text-left pr-1">
                  <div className="text-xs font-medium text-[#141210] truncate max-w-[130px]">
                    {preferences?.name || user.email?.split('@')[0] || 'Thành viên'}
                  </div>
                </div>
                <button
                  id="header-signout-btn"
                  onClick={onSignOut}
                  title="Đăng xuất"
                  className="p-1 text-[#8A8277] hover:text-[#8B1E1E] hover:bg-[#F6F2EA] rounded-full transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  id="header-login-btn"
                  onClick={onOpenAuth}
                  className="text-xs font-medium tracking-widest text-[#141210] hover:text-[#8B1E1E] transition-colors uppercase px-3 py-2"
                >
                  ĐĂNG NHẬP
                </button>
                <button
                  id="header-signup-btn"
                  onClick={onOpenAuth}
                  className="text-xs font-medium tracking-widest text-[#FAF7F2] bg-[#8B1E1E] hover:bg-[#721616] transition-all uppercase px-5 py-2.5 rounded-sm shadow-xs"
                >
                  ĐĂNG KÝ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex items-center justify-around py-2.5 px-2 bg-[#FAF7F2] border-t border-[#EBE4D8] text-[10px]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded ${activeTab === 'dashboard' ? 'text-[#8B1E1E] font-semibold' : 'text-[#78716A]'}`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Trang Chủ</span>
        </button>
        <button
          onClick={() => setActiveTab('mix-match')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded ${activeTab === 'mix-match' ? 'text-[#8B1E1E] font-semibold' : 'text-[#78716A]'}`}
        >
          <Sparkles className="w-4 h-4 text-[#8B1E1E]" />
          <span>Mix&Match</span>
        </button>
        <button
          onClick={() => setActiveTab('event-form')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded ${activeTab === 'event-form' ? 'text-[#8B1E1E] font-semibold' : 'text-[#78716A]'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Sự Kiện</span>
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded ${activeTab === 'preferences' ? 'text-[#8B1E1E] font-semibold' : 'text-[#78716A]'}`}
        >
          <User className="w-4 h-4" />
          <span>Gu Riêng</span>
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded ${activeTab === 'catalog' ? 'text-[#8B1E1E] font-semibold' : 'text-[#78716A]'}`}
        >
          <Shirt className="w-4 h-4" />
          <span>Kho Áo</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded ${activeTab === 'supabase' ? 'text-[#8B1E1E] font-semibold' : 'text-[#78716A]'}`}
          >
            <Database className="w-4 h-4" />
            <span>SQL</span>
          </button>
        )}
      </div>
    </header>
  );
};
