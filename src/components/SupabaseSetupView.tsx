import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, ShieldCheck, Terminal, Code2, Server, Key, AlertCircle, RefreshCw } from 'lucide-react';
import { saveSupabaseConfig, clearSupabaseConfig, getStoredSupabaseConfig, getSupabaseClient } from '../lib/supabase';

interface SupabaseSetupViewProps {
  isSupabaseConnected: boolean;
  onRefreshConnection: () => void;
}

const SQL_SCHEMA_CONTENT = `-- ============================================================================
-- VIESTYLE: SUPABASE DATABASE SCHEMA SETUP
-- Run this in Supabase: Dashboard > SQL Editor > New Query
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE TABLE: profiles (links to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE TABLE: outfits (Curated Wardrobe Inventory)
CREATE TABLE IF NOT EXISTS public.outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  style_tags TEXT[] NOT NULL DEFAULT '{}',
  colors TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE TABLE: user_preferences (Onboarding Style Questionnaire)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 10 AND age <= 120),
  personalities TEXT[] NOT NULL DEFAULT '{}',
  hobbies TEXT[] NOT NULL DEFAULT '{}',
  favourite_color TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE TABLE: suggestions_history (Generated Outfits & User Ratings)
CREATE TABLE IF NOT EXISTS public.suggestions_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  event_place TEXT NOT NULL,
  event_type TEXT NOT NULL,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  ai_reasoning TEXT,
  styling_tips TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDEXES FOR HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON public.suggestions_history(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_outfit_id ON public.suggestions_history(outfit_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_event_type ON public.suggestions_history(event_type);
CREATE INDEX IF NOT EXISTS idx_outfits_event_types ON public.outfits USING GIN(event_types);
CREATE INDEX IF NOT EXISTS idx_outfits_style_tags ON public.outfits USING GIN(style_tags);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Outfits are viewable by everyone" 
  ON public.outfits FOR SELECT USING (true);
CREATE POLICY "Outfits can be inserted by authenticated users" 
  ON public.outfits FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own preferences" 
  ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" 
  ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" 
  ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own suggestions history" 
  ON public.suggestions_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert suggestions for themselves" 
  ON public.suggestions_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own suggestion ratings" 
  ON public.suggestions_history FOR UPDATE USING (auth.uid() = user_id);

-- 8. TRIGGER FOR NEW USER REGISTRATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

export const SupabaseSetupView: React.FC<SupabaseSetupViewProps> = ({
  isSupabaseConnected,
  onRefreshConnection,
}) => {
  const currentConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(currentConfig.key);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedNextRoute, setCopiedNextRoute] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_CONTENT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(supabaseUrl, supabaseKey);
    setTestResult({ status: 'testing', message: 'Testing Supabase connection...' });

    try {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Please provide valid URL and Anon Key');
      }
      const { data, error } = await client.from('outfits').select('id').limit(1);
      if (error) {
        setTestResult({
          status: 'error',
          message: `Connected to Supabase endpoint, but table query returned: ${error.message}. Make sure you ran the SQL schema!`,
        });
      } else {
        setTestResult({
          status: 'success',
          message: 'Connected successfully to Supabase! Outfits table is live and accessible.',
        });
      }
      onRefreshConnection();
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: err?.message || 'Failed to reach Supabase project. Check project URL and Anon key.',
      });
    }
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setSupabaseUrl('');
    setSupabaseKey('');
    setTestResult({ status: 'idle', message: 'Đã xóa thông số kết nối Supabase.' });
    onRefreshConnection();
  };

  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto text-[#141210]">
      {/* Header */}
      <div className="border-b border-[#EBE4D8] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#8B1E1E] text-[10px] font-mono tracking-[0.25em] uppercase mb-1.5 font-semibold">
            <Database className="w-3.5 h-3.5 text-[#8B1E1E]" />
            Kiến Trúc Máy Chủ Cơ Sở Dữ Liệu Supabase
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#141210] tracking-tight">
            Cấu Trúc Lược Đồ SQL & Thông Số Kết Nối
          </h1>
          <p className="text-xs sm:text-sm text-[#59534B] mt-1 font-sans leading-relaxed">
            Xem xét lược đồ bảng PostgreSQL, sao chép tập lệnh SQL cấu hình bảng hoàn chỉnh và tùy chọn liên kết khóa API Supabase thực tế.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSupabaseConnected ? (
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Đã Kết Nối Supabase Thực Tế
            </span>
          ) : (
            <span className="text-xs font-mono text-[#8B1E1E] bg-[#FFFFFF] border border-[#EBE4D8] px-3 py-1.5 rounded-sm flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#8B1E1E]" /> Đang Chạy Chế Độ Mẫu Cục Bộ
            </span>
          )}
        </div>
      </div>

      {/* Connection Form */}
      <section className="bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#EBE4D8]">
          <div>
            <h2 className="text-base font-serif font-medium text-[#141210]">
              Kết Nối Dự Án Supabase (PostgreSQL & Auth)
            </h2>
            <p className="text-xs text-[#59534B] mt-0.5 font-sans">
              Nhập URL và Anon Key từ bảng điều khiển Supabase của bạn để kích hoạt xác thực người dùng và lưu trữ dữ liệu.
            </p>
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#8B1E1E] hover:text-[#721616] flex items-center gap-1 font-mono hover:underline font-medium"
          >
            Bảng Điều Khiển Supabase <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <form onSubmit={handleSaveConnection} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="supabase-url-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210] font-medium">
                Địa Chỉ URL Dự Án (Project URL)
              </label>
              <input
                id="supabase-url-input"
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="supabase-key-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210] font-medium">
                Khóa Công Khai (Project Anon Key)
              </label>
              <input
                id="supabase-key-input"
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] transition-colors font-mono"
              />
            </div>
          </div>

          {testResult.message && (
            <div
              className={`p-3 rounded-sm text-xs font-mono flex items-center gap-2 ${
                testResult.status === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : testResult.status === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-[#FAF7F2] border border-[#EBE4D8] text-[#59534B]'
              }`}
            >
              {testResult.status === 'testing' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8B1E1E]" />}
              {testResult.status === 'success' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
              {testResult.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              id="save-supabase-config-btn"
              type="submit"
              className="px-5 py-2.5 rounded-sm bg-[#8B1E1E] hover:bg-[#721616] text-[#FAF7F2] text-xs font-medium uppercase tracking-[0.15em] transition-all shadow-xs flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              Lưu & Kiểm Tra Kết Nối
            </button>
            {supabaseUrl && (
              <button
                id="clear-supabase-config-btn"
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 rounded-sm bg-[#FAF7F2] hover:bg-[#EBE4D8] border border-[#EBE4D8] text-[#141210] text-xs font-medium uppercase tracking-wider transition-colors"
              >
                Xóa Cấu Hình Đã Lưu
              </button>
            )}
          </div>
        </form>
      </section>

      {/* SQL Script Viewer */}
      <section className="bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#EBE4D8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#8B1E1E]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#141210] font-medium">
              Tập Lệnh SQL Khởi Tạo Lược Đồ Supabase
            </h2>
          </div>

          <button
            id="copy-sql-schema-btn"
            onClick={handleCopySql}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#FAF7F2] hover:bg-[#EBE4D8] text-[#141210] border border-[#EBE4D8] text-xs font-mono transition-all font-medium"
          >
            {copiedSql ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Đã Sao Chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#8B1E1E]" />
                <span>Sao Chép SQL</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-[#141210] font-mono text-xs text-[#FAF7F2]/90 max-h-96 overflow-y-auto leading-relaxed border-t border-[#EBE4D8]">
          <pre className="whitespace-pre-wrap">{SQL_SCHEMA_CONTENT}</pre>
        </div>
      </section>
    </div>
  );
};
