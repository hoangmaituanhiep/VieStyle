/**
 * AuraStyle - AI-Powered Outfit Recommendation Web Application
 * Tech Stack: React 19, Vite, Tailwind CSS, Supabase (PostgreSQL / Auth), Google Gemini API
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { MixMatchStudioView } from './components/MixMatchStudioView';
import { EventFormView } from './components/EventFormView';
import { PreferencesView } from './components/PreferencesView';
import { WardrobeCatalogView } from './components/WardrobeCatalogView';
import { SupabaseSetupView } from './components/SupabaseSetupView';
import { OutfitDetailModal } from './components/OutfitDetailModal';
import { AuthModal } from './components/AuthModal';
import { Outfit, SuggestionHistory, UserPreferences, EventContext, MixMatchItem } from './types';
import {
  fetchOutfits,
  fetchUserPreferences,
  saveUserPreferences,
  fetchSuggestionsHistory,
  saveSuggestion,
  updateSuggestionRating,
  fetchMixHistory,
  saveMixHistory,
  getAuthSession,
  signOutSupabase,
  getSupabaseClient,
  subscribeToAuthChanges,
} from './lib/supabase';

const ADMIN_UUID = 'dae05a68-ee99-470f-8f17-7db434e65f8d';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'event-form' | 'preferences' | 'catalog' | 'supabase' | 'mix-match'>('dashboard');
  const [user, setUser] = useState<any | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [outfitsError, setOutfitsError] = useState<string | null>(null);
  const [history, setHistory] = useState<SuggestionHistory[]>([]);
  const [mixHistory, setMixHistory] = useState<MixMatchItem[]>([]);
  const [latestSuggestion, setLatestSuggestion] = useState<SuggestionHistory | null>(null);

  // Modals & detail views
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionHistory | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // States
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Helper to load authenticated user's preferences & history
  const loadUserData = async (userId: string) => {
    try {
      const [userPrefs, userHistory, userMixHistory] = await Promise.all([
        fetchUserPreferences(userId),
        fetchSuggestionsHistory(userId),
        fetchMixHistory(userId),
      ]);
      setPreferences(userPrefs);
      setHistory(userHistory);
      setMixHistory(userMixHistory);
      setLatestSuggestion(userHistory.length > 0 ? userHistory[0] : null);
    } catch (err) {
      console.warn('Error loading user data:', err);
    }
  };

  // Initialize Data and listen to live Supabase Auth state changes
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setIsInitializing(true);
      try {
        // 1. Check Supabase client connectivity
        const client = getSupabaseClient();
        if (isMounted) {
          setIsSupabaseConnected(!!client);
        }

        // 2. Fetch outfits catalog (publicly accessible)
        const { data: loadedOutfits, error: fetchError } = await fetchOutfits();
        if (isMounted) {
          if (fetchError) {
            setOutfitsError(fetchError);
            setOutfits([]);
          } else {
            setOutfits(loadedOutfits || []);
            setOutfitsError(null);
          }
        }

        // 3. Check existing Supabase session
        const { user: authUser } = await getAuthSession();
        if (isMounted) {
          setUser(authUser);
          if (authUser) {
            await loadUserData(authUser.id);
          } else {
            setPreferences(null);
            setHistory([]);
            setMixHistory([]);
            setLatestSuggestion(null);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    init();

    // 4. Supabase onAuthStateChange listener: updates React state instantly on login/logout/refresh
    const unsubscribe = subscribeToAuthChanges(async (event, session) => {
      console.log('Supabase Auth Event received:', event, session?.user?.email);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadUserData(currentUser.id);
      } else {
        setPreferences(null);
        setHistory([]);
        setMixHistory([]);
        setLatestSuggestion(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Restrict Supabase SQL tab to designated admin only
  useEffect(() => {
    if (activeTab === 'supabase' && user?.id !== ADMIN_UUID) {
      setActiveTab('dashboard');
    }
  }, [activeTab, user]);

  // Handle Event Context AI Styling Submission
  const handleEventFormSubmit = async (eventContext: EventContext) => {
    if (!user) {
      showNotification('Vui lòng đăng nhập để tạo gợi ý trang phục.', 'info');
      setIsAuthModalOpen(true);
      return;
    }

    if (outfits.length === 0) {
      showNotification('Kho lưu trữ trang phục hiện chưa sẵn sàng. Vui lòng thử lại.', 'error');
      return;
    }

    const activePrefs: UserPreferences = preferences || {
      user_id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Thành viên',
      age: 28,
      personalities: ['Tối Giản Mộc Mạc (Rustic Minimalist)', 'Sang Trọng Thầm Lặng (Quiet Luxury)'],
      hobbies: ['Triển Lãm & Thưởng Thức Nghệ Thuật'],
      favourite_color: 'Nâu Đất Nung (Terracotta)',
    };

    setIsLoadingAI(true);
    try {
      // Prepare past ratings memory to inform AI
      const pastRatingsSummary = history
        .filter((h) => h.rating && h.rating > 0)
        .map((h) => ({
          outfit_id: h.outfit_id,
          outfit_name: h.outfit?.name || 'Outfit',
          event_type: h.event_type,
          rating: h.rating as number,
        }));

      // Call Full-Stack Backend API route (/api/recommend-outfit) with mix_history personalization
      const res = await fetch('/api/recommend-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_profile: activePrefs,
          event_context: eventContext,
          past_ratings: pastRatingsSummary,
          mix_history: mixHistory,
          available_outfits: outfits,
        }),
      });

      if (!res.ok) {
        throw new Error(`Lỗi máy chủ AI: ${res.statusText}`);
      }

      const data = await res.json();
      const rec = data.recommendation;

      if (!rec || !rec.selected_outfit_id) {
        throw new Error('Không nhận được gợi ý hợp lệ.');
      }

      // Save suggestion in Supabase suggestions_history
      const newRecord = await saveSuggestion({
        user_id: user.id,
        outfit_id: rec.selected_outfit_id,
        event_name: eventContext.event_name,
        event_place: eventContext.event_place,
        event_type: eventContext.event_type,
        rating: null,
        ai_reasoning: rec.ai_reasoning,
        styling_tips: rec.styling_tips,
      });

      // Update state
      const updatedHistory = [newRecord, ...history];
      setHistory(updatedHistory);
      setLatestSuggestion(newRecord);
      setActiveTab('dashboard');

      showNotification('Gợi ý trang phục đã được phân tích và đồng bộ.');
    } catch (err: any) {
      console.error('Styling error:', err);
      showNotification(err?.message || 'Không thể tạo gợi ý trang phục. Vui lòng thử lại.', 'error');
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Handle Save Mix History from Mix & Match Studio
  const handleSaveMixHistory = async (item: Omit<MixMatchItem, 'id' | 'created_at'>) => {
    try {
      const saved = await saveMixHistory(item);
      setMixHistory((prev) => [saved, ...prev]);
      showNotification('Bản phối độc bản đã được lưu vào hồ sơ cá nhân.');
    } catch (err: any) {
      console.error('Save mix history error:', err);
      showNotification('Không thể lưu bản phối.', 'error');
    }
  };

  // Handle Star Rating submission (AI feedback learning)
  const handleRateSuggestion = async (suggestionId: string, rating: number) => {
    try {
      await updateSuggestionRating(suggestionId, rating);

      // Update local history state
      const updated = history.map((item) =>
        item.id === suggestionId ? { ...item, rating } : item
      );
      setHistory(updated);

      if (latestSuggestion?.id === suggestionId) {
        setLatestSuggestion({ ...latestSuggestion, rating });
      }

      showNotification(`Đã đánh giá ${rating}/5 sao.`);
    } catch (err) {
      console.error('Error rating suggestion:', err);
    }
  };

  // Handle Save Preferences
  const handleSavePreferences = async (newPrefs: UserPreferences) => {
    if (!user) {
      showNotification('Vui lòng đăng nhập tài khoản để lưu hồ sơ cá nhân.', 'error');
      setIsAuthModalOpen(true);
      return;
    }
    const saved = await saveUserPreferences({
      ...newPrefs,
      user_id: user.id,
    });
    setPreferences(saved);
    showNotification('Hồ sơ phong cách thời trang đã được lưu.');
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await signOutSupabase();
    } catch (err) {
      console.warn('Supabase signout error:', err);
    }
    setUser(null);
    setPreferences(null);
    setHistory([]);
    setMixHistory([]);
    setLatestSuggestion(null);
    showNotification('Đã đăng xuất tài khoản.');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#141210] flex flex-col font-sans selection:bg-[#8B1E1E]/20 selection:text-[#141210]">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-sm shadow-md text-xs font-medium font-sans border backdrop-blur-md ${
              notification.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-[#FFFFFF] border-[#8B1E1E]/40 text-[#141210]'
            }`}
          >
            {notification.text}
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        preferences={preferences}
        isSupabaseConnected={isSupabaseConnected}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {isInitializing ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="w-12 h-12 rounded-sm bg-[#8B1E1E] flex items-center justify-center text-[#FAF7F2] font-serif font-bold text-2xl animate-pulse shadow-xs">
              V
            </div>
            <p className="text-xs font-mono tracking-[0.25em] uppercase text-[#78716A]">
              Đang Tải Kho Cổ Phục VieStyle
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                outfits={outfits}
                latestSuggestion={latestSuggestion}
                history={history}
                preferences={preferences}
                onRateSuggestion={handleRateSuggestion}
                onSelectOutfit={(outfit, sug) => {
                  setSelectedOutfit(outfit);
                  setSelectedSuggestion(sug || null);
                }}
                onNavigateToEventForm={() => setActiveTab('event-form')}
                onNavigateToPreferences={() => setActiveTab('preferences')}
                onNavigateToMixMatch={() => setActiveTab('mix-match')}
                isLoading={isLoadingAI}
              />
            )}

            {activeTab === 'mix-match' && (
              <MixMatchStudioView
                user={user}
                outfits={outfits}
                mixHistory={mixHistory}
                onSaveMix={handleSaveMixHistory}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {activeTab === 'event-form' && (
              <EventFormView
                user={user}
                onSubmit={handleEventFormSubmit}
                isLoading={isLoadingAI}
                preferences={preferences}
                history={history}
                pastHistory={history}
                onNavigateToPreferences={() => setActiveTab('preferences')}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {activeTab === 'preferences' && (
              <PreferencesView
                user={user}
                preferences={preferences}
                onSave={handleSavePreferences}
                onComplete={() => setActiveTab('dashboard')}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {activeTab === 'catalog' && (
              <WardrobeCatalogView
                outfits={outfits}
                onSelectOutfit={(outfit) => {
                  setSelectedOutfit(outfit);
                  setSelectedSuggestion(null);
                }}
                onStyleWithOutfit={(outfit) => {
                  setSelectedOutfit(null);
                  setActiveTab('event-form');
                }}
              />
            )}

            {activeTab === 'supabase' && user?.id === ADMIN_UUID && (
              <SupabaseSetupView
                isSupabaseConnected={isSupabaseConnected}
                onRefreshConnection={async () => {
                  const client = getSupabaseClient();
                  setIsSupabaseConnected(!!client);
                  const { data: loadedOutfits, error: fetchErr } = await fetchOutfits();
                  if (fetchErr) {
                    setOutfitsError(fetchErr);
                    setOutfits([]);
                  } else {
                    setOutfits(loadedOutfits || []);
                    setOutfitsError(null);
                  }
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Outfit Detail Modal */}
      <OutfitDetailModal
        outfit={selectedOutfit}
        suggestion={selectedSuggestion}
        isOpen={!!selectedOutfit}
        onClose={() => {
          setSelectedOutfit(null);
          setSelectedSuggestion(null);
        }}
        onRate={(rating) => {
          if (selectedSuggestion) {
            handleRateSuggestion(selectedSuggestion.id, rating);
          }
        }}
        onStyleThisForEvent={(outfit) => {
          setSelectedOutfit(null);
          setSelectedSuggestion(null);
          setActiveTab('event-form');
        }}
      />

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u, isNewUser) => {
          setUser(u);
          if (isNewUser) {
            setActiveTab('preferences');
            showNotification('Đăng ký thành công! Hãy hoàn thiện thông tin phong cách của bạn.');
          } else {
            showNotification('Đăng nhập thành công!');
          }
        }}
        isSupabaseConfigured={isSupabaseConnected}
        onOpenSupabaseConfig={() => {
          if (user?.id === ADMIN_UUID) {
            setActiveTab('supabase');
          }
        }}
      />

      {/* Refined Footer */}
      <footer className="border-t border-[#EBE4D8] bg-[#FFFFFF] py-8 text-center text-xs text-[#78716A] font-sans mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 font-serif text-[#141210]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B1E1E]" />
            <span className="font-bold tracking-tight text-sm">VieStyle</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-[#78716A]">
            {user?.id === ADMIN_UUID && (
              <>
                <button onClick={() => setActiveTab('supabase')} className="hover:text-[#8B1E1E] transition-colors">
                  Lược Đồ SQL
                </button>
                <span>·</span>
              </>
            )}
            <button onClick={() => setActiveTab('catalog')} className="hover:text-[#8B1E1E] transition-colors">
              Kho Trang Phục
            </button>
            <span>·</span>
            <button onClick={() => setIsAuthModalOpen(true)} className="hover:text-[#8B1E1E] transition-colors">
              Tài Khoản
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
