'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchHistory, SearchHistoryItem } from '@/contexts/SearchHistoryContext';
import { History, Search, Trash2, ExternalLink, Calendar, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { history, clearHistory, removeFromHistory } = useSearchHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-blue-900">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-4">Login Required</h1>
            <p className="text-blue-100 mb-6">You need to be logged in to view your search history.</p>
            <Link 
              href="/"
              className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter history based on search term
  const filteredHistory = history.filter(item =>
    item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchAgain = (url: string) => {
    router.push(`/?url=${encodeURIComponent(url)}`);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleClearHistory = () => {
    clearHistory();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="min-h-screen bg-blue-900">
      <Header />
      
      <div className="container mx-auto max-w-6xl px-4 py-8 pt-24">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-500 rounded-xl">
              <History className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Search History</h1>
              <p className="text-blue-100">View and manage your image extraction history</p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            
            {history.length > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <History className="h-12 w-12 text-white/50" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {history.length === 0 ? 'No search history yet' : 'No matching searches'}
            </h3>
            <p className="text-blue-100 mb-6">
              {history.length === 0 
                ? 'Start extracting images to build your search history'
                : 'Try adjusting your search terms'
              }
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Search className="h-4 w-4 mr-2" />
              Start Extracting
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item: SearchHistoryItem) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {item.title}
                      </h3>
                      {item.imageCount && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-sm">
                          <ImageIcon className="h-3 w-3" />
                          {item.imageCount} images
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate">{item.url}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.timestamp)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleSearchAgain(item.url)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Search className="h-3 w-3" />
                      Search Again
                    </button>
                    <button
                      onClick={() => removeFromHistory(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {history.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-blue-100 text-sm">
              Showing {filteredHistory.length} of {history.length} searches
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Clear Search History
              </h3>
              <p className="text-gray-600">
                Are you sure you want to clear all search history? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 