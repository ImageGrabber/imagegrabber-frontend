'use client';

import { useState } from 'react';
import { ArrowRight, Briefcase, History, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchHistory } from '@/contexts/SearchHistoryContext';
import Link from 'next/link';

interface Props {
  isLoading: boolean;
  onScrape: (url: string) => void;
}

export default function HeroSection({ isLoading, onScrape }: Props) {
  const [url, setUrl] = useState('');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const { user } = useAuth();
  const { history } = useSearchHistory();

  const handleSearch = () => {
    if (!url.trim()) return;
    onScrape(url.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const selectFromHistory = (historicalUrl: string) => {
    setUrl(historicalUrl);
    setShowHistoryDropdown(false);
  };

  // Get recent history (last 5 items)
  const recentHistory = history.slice(0, 5);

  return (
    <>
      <section className="relative min-h-[800px] pt-40 pb-20 flex items-center">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/30 rounded-full filter blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/30 rounded-full filter blur-3xl opacity-50 animate-pulse delay-2000"></div>
          <div className="absolute -top-20 -left-40 w-[400px] h-[400px] border-4 border-white/5 rounded-full" />
          <div className="absolute -bottom-20 -right-40 w-[400px] h-[400px] border-2 border-white/5 rounded-full" />
          
          {/* Floating Particles */}
          <div className="absolute inset-0">
            {/* Large particles */}
            <div className="absolute top-20 left-20 w-6 h-6 bg-white/20 rounded-full animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}></div>
            <div className="absolute top-40 right-32 w-5 h-5 bg-blue-400/30 rounded-full animate-bounce" style={{animationDelay: '1s', animationDuration: '4s'}}></div>
            <div className="absolute top-60 left-1/3 w-4 h-4 bg-purple-400/40 rounded-full animate-bounce" style={{animationDelay: '2s', animationDuration: '2.5s'}}></div>
            <div className="absolute bottom-40 right-20 w-7 h-7 bg-white/15 rounded-full animate-bounce" style={{animationDelay: '0.5s', animationDuration: '3.5s'}}></div>
            <div className="absolute bottom-60 left-24 w-5 h-5 bg-blue-300/25 rounded-full animate-bounce" style={{animationDelay: '1.5s', animationDuration: '4.5s'}}></div>
            
            {/* Medium particles */}
            <div className="absolute top-32 right-1/4 w-3 h-3 bg-white/30 rounded-full animate-pulse" style={{animationDelay: '0s', animationDuration: '2s'}}></div>
            <div className="absolute top-72 left-40 w-2 h-2 bg-purple-300/50 rounded-full animate-pulse" style={{animationDelay: '1s', animationDuration: '3s'}}></div>
            <div className="absolute bottom-32 right-40 w-3 h-3 bg-blue-200/35 rounded-full animate-pulse" style={{animationDelay: '2s', animationDuration: '2.5s'}}></div>
            <div className="absolute bottom-20 left-1/2 w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{animationDelay: '0.5s', animationDuration: '4s'}}></div>
            
            {/* Small particles */}
            <div className="absolute top-16 left-1/2 w-2 h-2 bg-white/25 rounded-full animate-ping" style={{animationDelay: '0s', animationDuration: '3s'}}></div>
            <div className="absolute top-80 right-16 w-1.5 h-1.5 bg-blue-100/40 rounded-full animate-ping" style={{animationDelay: '1s', animationDuration: '2s'}}></div>
            <div className="absolute bottom-16 left-16 w-2 h-2 bg-purple-200/30 rounded-full animate-ping" style={{animationDelay: '2s', animationDuration: '4s'}}></div>
            <div className="absolute bottom-80 right-1/3 w-1.5 h-1.5 bg-white/35 rounded-full animate-ping" style={{animationDelay: '1.5s', animationDuration: '3.5s'}}></div>
            
            {/* Floating particles with custom animation */}
            <div className="absolute top-24 right-12 w-4 h-4 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full" style={{animation: 'float 6s ease-in-out infinite'}}></div>
            <div className="absolute top-56 left-12 w-5 h-5 bg-gradient-to-r from-purple-300/15 to-blue-300/15 rounded-full" style={{animation: 'float 8s ease-in-out infinite reverse'}}></div>
            <div className="absolute bottom-24 right-1/4 w-4 h-4 bg-gradient-to-r from-white/20 to-blue-200/20 rounded-full" style={{animation: 'float 7s ease-in-out infinite'}}></div>
            <div className="absolute bottom-56 left-1/4 w-3 h-3 bg-gradient-to-r from-blue-100/30 to-purple-100/30 rounded-full" style={{animation: 'float 5s ease-in-out infinite reverse'}}></div>
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl px-4 text-center z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 mb-6">
            <div className="h-2 w-2 rounded-full bg-white"></div>
            <span className="text-sm font-medium text-white">FlowManager</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            <span className="bg-gradient-to-b from-gray-300 via-gray-100 to-gray-400 bg-clip-text text-transparent" style={{textShadow: '0 0 8px rgba(255,255,255,0.2)'}}>AI-Powered</span> Image <br /> Management Platform
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10">
            Transform your digital asset management with AI-powered content extraction, 
            automated optimization, and seamless integration across all your business platforms.
          </p>

          {/* Search bar */}
          <div className="mx-auto max-w-2xl">
             <div className="relative">
                <input
                  type="url"
                  placeholder="Have a site in mind? Paste a URL to get started..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full rounded-lg border border-white/20 bg-white/5 py-4 pl-5 pr-40 text-lg text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {/* History Button - Only show when logged in */}
                  {user && (
                    <div className="relative">
                      <button 
                        onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                        className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-all duration-200"
                        title="Search History"
                      >
                        <History className="h-5 w-5" />
                      </button>

                      {/* History Dropdown */}
                      {showHistoryDropdown && (
                        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700/50 rounded-xl shadow-xl z-10">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-medium text-gray-200">Recent Searches</h3>
                              <Link 
                                href="/history"
                                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                onClick={() => setShowHistoryDropdown(false)}
                              >
                                <Eye className="h-3 w-3" />
                                View All
                              </Link>
                            </div>
                            
                            {recentHistory.length > 0 ? (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {recentHistory.map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => selectFromHistory(item.url)}
                                    className="w-full text-left p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                                  >
                                    <div className="text-sm font-medium text-gray-200 truncate">
                                      {item.title}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate">
                                      {item.url}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {item.image_count && `${item.image_count} images • `}
                                      {new Date(item.created_at).toLocaleDateString()}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 text-center py-4">
                                No search history yet
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    disabled={isLoading || !url.trim()}
                    onClick={handleSearch}
                    className="rounded-md bg-gray-600/50 px-5 py-2 text-white font-semibold transition-colors hover:bg-gray-500/50 disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Grab'}
                  </button>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Click outside to close dropdown */}
      {showHistoryDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowHistoryDropdown(false)}
        />
      )}
    </>
  );
} 