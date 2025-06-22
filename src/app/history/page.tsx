'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { useSearchHistory, SearchHistoryItem } from '@/contexts/SearchHistoryContext';
import { History, Search, Trash2, ExternalLink, Calendar, Image as ImageIcon, Globe, ChevronDown, Eye } from 'lucide-react';
import Link from 'next/link';
import ImageGrid from '@/components/ImageGrid';

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { openModal } = useModal();
  const { history, clearHistory, removeFromHistory } = useSearchHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Use dashboard layout - it handles authentication
  if (!user) {
    return <DashboardLayout><div /></DashboardLayout>;
  }

  // Filter history based on search term
  const filteredHistory = history.filter(item =>
    item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchAgain = (url: string) => {
    router.push(`/?url=${encodeURIComponent(url)}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleToggleExpand = (id: string) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(id)) {
      newExpandedItems.delete(id);
    } else {
      newExpandedItems.add(id);
    }
    setExpandedItems(newExpandedItems);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      // You could show a notification to the user here
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    setShowDeleteConfirm(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/50 border border-gray-700/50">
            <History className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white">Search History</h1>
          <p className="text-gray-400">View and manage your image extraction history</p>
        </div>

        {/* Search and Actions */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md mx-auto sm:mx-0">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-gray-600/50 bg-gray-800/80 py-3 pl-12 pr-4 text-gray-200 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-500/50 focus:bg-gray-800/90 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          
          {history.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-full bg-red-600/80 border border-red-500/50 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-red-500/80"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          )}
        </div>

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-800/50 border border-gray-700/50">
              <History className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">
              {history.length === 0 ? 'No search history yet' : 'No matching searches'}
            </h3>
            <p className="mb-6 text-gray-400">
              {history.length === 0 
                ? 'Start extracting images to build your search history'
                : 'Try adjusting your search terms'
              }
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600/80 border border-blue-500/50 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-blue-500/80"
            >
              <Globe className="h-4 w-4" />
              Start Extracting
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item: SearchHistoryItem) => (
              <div
                key={item.id}
                className="rounded-2xl bg-gray-900/80 border border-gray-700/50 p-6 backdrop-blur-sm transition-all duration-200 hover:bg-gray-900/90"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-200 truncate">
                        {item.title}
                      </h3>
                      {item.image_count && (
                        <span className="flex items-center gap-1 rounded-full bg-blue-900/50 border border-blue-700/50 px-3 py-1 text-sm text-blue-300">
                          <ImageIcon className="h-3 w-3" />
                          {item.image_count} images
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate">{item.url}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.created_at)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleExpand(item.id)}
                      className="flex items-center gap-2 rounded-full bg-gray-700/80 border border-gray-600/50 px-4 py-2 font-medium text-white transition-all duration-200 hover:bg-gray-600/80"
                    >
                      {expandedItems.has(item.id) ? <ChevronDown className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      View Images
                    </button>
                    <button
                      onClick={() => removeFromHistory(item.id)}
                      className="rounded-full p-2 text-gray-400 transition-all duration-200 hover:bg-red-600/20 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {expandedItems.has(item.id) && (
                  <div className="mt-6 border-t border-gray-700/50 pt-6">
                    <ImageGrid images={item.results} onDownload={handleDownload} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {history.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              Showing {filteredHistory.length} of {history.length} searches
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-gray-800/80 border border-gray-600/50 px-6 py-3 font-medium text-gray-200 transition-all duration-200 hover:bg-gray-700/80"
          >
            <Globe className="h-4 w-4" />
            Extract Images
          </Link>
          
          <Link
            href="/credits"
            className="flex items-center gap-2 rounded-full bg-gray-800/80 border border-gray-600/50 px-6 py-3 font-medium text-gray-200 transition-all duration-200 hover:bg-gray-700/80"
          >
            <History className="h-4 w-4" />
            View Credits
          </Link>
        </div>
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700/50 p-6 shadow-2xl">
              <div className="mb-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-200">
                  Clear Search History
                </h3>
                <p className="text-gray-400">
                  Are you sure you want to clear all search history? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-full bg-gray-800/80 border border-gray-600/50 px-4 py-2 font-medium text-gray-200 transition-all duration-200 hover:bg-gray-700/80"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearHistory}
                  className="rounded-full bg-red-600/80 border border-red-500/50 px-4 py-2 font-medium text-white transition-all duration-200 hover:bg-red-500/80"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
} 