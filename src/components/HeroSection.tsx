'use client';

import { useState } from 'react';
import { Paperclip, History, Eye } from 'lucide-react';
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
  const { history, addToHistory } = useSearchHistory();

  const handleExtract = () => {
    if (!url.trim()) return;
    
    // Add to history when user is logged in
    if (user) {
      addToHistory(url.trim());
    }
    
    onScrape(url.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExtract();
    }
  };

  const selectFromHistory = (historicalUrl: string) => {
    setUrl(historicalUrl);
    setShowHistoryDropdown(false);
  };

  // Get recent history (last 5 items)
  const recentHistory = history.slice(0, 5);

  return (
    <section className="relative min-h-[600px] pt-20 pb-16">
      <div className="relative mx-auto max-w-7xl px-4 text-center">
        <div className="mb-12 pt-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Extract images
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            from specific URL and push to your desired sites
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl bg-white p-8 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-gray-50 p-2 focus-within:border-orange-500 focus-within:bg-white">
                <div className="flex items-center pl-4">
                  <Paperclip className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  placeholder="Where are you want to extract?"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 bg-transparent py-4 text-lg text-gray-900 placeholder-gray-500 outline-none"
                />
                <div className="flex items-center gap-2 pr-2">
                  {/* History Button - Only show when logged in */}
                  {user && (
                    <div className="relative">
                      <button 
                        onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                        className="rounded-xl p-3 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Search History"
                      >
                        <History className="h-5 w-5" />
                      </button>

                      {/* History Dropdown */}
                      {showHistoryDropdown && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-medium text-gray-900">Recent Searches</h3>
                              <Link 
                                href="/history"
                                className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 transition-colors"
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
                                    className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                      {item.title}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {item.url}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {item.imageCount && `${item.imageCount} images • `}
                                      {item.timestamp.toLocaleDateString()}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4">
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
                    onClick={handleExtract}
                    className="rounded-xl bg-orange-500 px-8 py-3 text-white font-semibold shadow-lg transition-all hover:bg-orange-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Extracting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Extract
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 text-sm">
                <span className="text-gray-500">Popular:</span>
                {['instagram', 'pinterest', 'unsplash', 'dribbble', 'behance'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setUrl(`https://${tag}.com`)}
                    className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showHistoryDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowHistoryDropdown(false)}
        />
      )}
    </section>
  );
} 