import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, ArrowRight, Loader2, Database } from 'lucide-react';
import { signInWithSupabase, signUpWithSupabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any, isNewUser?: boolean) => void;
  isSupabaseConfigured: boolean;
  onOpenSupabaseConfig?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  isSupabaseConfigured,
  onOpenSupabaseConfig,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const data = await signInWithSupabase(email, password);
        if (data.user) {
          onAuthSuccess(data.user, false);
          onClose();
        }
      } else {
        const data = await signUpWithSupabase(email, password, name);
        if (data.user) {
          onAuthSuccess(data.user, true);
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Lỗi xác thực:', err);
      setErrorMsg(err?.message || 'Xác thực thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#FAF7F2] border border-[#EBE4D8] rounded-sm shadow-2xl p-6 sm:p-8 text-[#141210]">
        {/* Close button */}
        <button
          id="close-auth-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#FFFFFF]/80 hover:bg-[#FFFFFF] text-[#78716A] hover:text-[#141210] transition-colors border border-[#EBE4D8]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-10 h-10 rounded-sm bg-[#8B1E1E] flex items-center justify-center text-[#FAF7F2] font-serif font-bold text-xl mx-auto shadow-xs">
            V
          </div>
          <h2 className="text-2xl font-serif font-medium text-[#141210] tracking-tight">
            {mode === 'signin' ? 'Đăng Nhập' : 'Đăng Ký'}
          </h2>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#F4EFE5] rounded-sm border border-[#EBE4D8] mb-6 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-sm uppercase tracking-wider text-[11px] transition-all ${
              mode === 'signin'
                ? 'bg-[#FFFFFF] text-[#141210] font-semibold shadow-xs'
                : 'text-[#78716A] hover:text-[#141210]'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-sm uppercase tracking-wider text-[11px] transition-all ${
              mode === 'signup'
                ? 'bg-[#FFFFFF] text-[#141210] font-semibold shadow-xs'
                : 'text-[#78716A] hover:text-[#141210]'
            }`}
          >
            Đăng Ký
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-name-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210] font-medium">
                Họ và Tên
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-[#8A8277]" />
                <input
                  id="auth-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Hoàng Lan Anh"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210] font-medium">
              Địa Chỉ Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#8A8277]" />
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lananh@viestyle.vn"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-password-input" className="block text-xs font-mono uppercase tracking-wider text-[#141210] font-medium">
              Mật Khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#8A8277]" />
              <input
                id="auth-password-input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#EBE4D8] rounded-sm text-[#141210] text-xs focus:outline-none focus:border-[#8B1E1E] transition-colors"
              />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-sm bg-[#8B1E1E] hover:bg-[#721616] text-[#FAF7F2] font-medium text-xs uppercase tracking-[0.18em] transition-all shadow-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? 'Đăng Nhập Tài Khoản' : 'Tạo Tài Khoản Mới'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {!isSupabaseConfigured && (
          <div className="mt-6 p-4 rounded-sm bg-[#FFFFFF] border border-[#EBE4D8] flex items-start gap-3 text-xs text-[#59534B]">
            <Database className="w-4 h-4 text-[#8B1E1E] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-[#141210]">Chưa kết nối Supabase?</p>
              <p className="text-[11px] leading-relaxed">
                Vui lòng cấu hình Supabase URL & Anon Key tại tab <strong>Supabase SQL</strong> để kích hoạt xác thực và lưu trữ dữ liệu.
              </p>
              {onOpenSupabaseConfig && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSupabaseConfig();
                  }}
                  className="text-[11px] font-semibold text-[#8B1E1E] hover:underline pt-1 inline-block"
                >
                  Mở trang cấu hình Supabase →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
