'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchHistory, SearchHistoryItem } from '@/contexts/SearchHistoryContext';
import { useClassificationHistory, ClassificationHistoryItem } from '@/contexts/ClassificationHistoryContext';
import { History, Search, Trash2, ExternalLink, Calendar, Image as ImageIcon, Globe, ChevronDown, Eye, Brain, FileText, ShoppingCart, Newspaper, Star, Home } from 'lucide-react';
import Link from 'next/link';
import ImageGrid from '@/components/ImageGrid';

type HistoryTab = 'extractions' | 'classifications';

export default function HistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HistoryTab>('extractions');

  // Redirect to home if not authenticated (client-side only)
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'extractions':
        return <ExtractionHistory />;
      case 'classifications':
        return <ClassificationHistory />;
      default:
        return <ExtractionHistory />;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <History className="h-6 w-6 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">History</h1>
        </div>

        {/* Tab Navigation */}
        <div className="inline-flex p-1 mb-8 space-x-1 bg-gray-900/50 border border-gray-700/50 rounded-lg">
          <button
            onClick={() => setActiveTab('extractions')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'extractions'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            <Eye className="h-4 w-4" />
            Extractions
          </button>
          <button
            onClick={() => setActiveTab('classifications')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'classifications'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            <Brain className="h-4 w-4" />
            Classifications
          </button>
        </div>

        {renderContent()}
      </div>
    </DashboardLayout>
  );
}

// Extraction History Component
const ExtractionHistory = () => {
  const { history, clearHistory, removeFromHistory } = useSearchHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleToggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const filteredHistory = history.filter(item =>
    item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.title?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-white">Image Extraction History</h1>
        <p className="text-gray-400">Review your image extraction results</p>
      </div>
      
      {/* Search and Actions */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md mx-auto sm:mx-0">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search extractions..."
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
            Clear Extractions
          </button>
        )}
      </div>
      {/* History List */}
      {filteredHistory.length > 0 ? (
         <div className="space-y-4">
            {filteredHistory.map((item: SearchHistoryItem) => (
              <div key={item.id} className="rounded-2xl bg-gray-900/80 border border-gray-700/50 p-6 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-200 truncate">{item.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate">{item.url}</span>
                    </div>
                  </div>
                   <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => handleToggleExpand(item.id)} className="flex items-center gap-2 rounded-full bg-gray-700/80 px-4 py-2 text-white">
                      {expandedItems.has(item.id) ? 'Hide' : 'View'} Images
                    </button>
                    <button onClick={() => removeFromHistory(item.id)} className="p-2 rounded-full hover:bg-red-600/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {expandedItems.has(item.id) && <div className="mt-4 pt-4 border-t border-gray-700/50"><ImageGrid images={item.results} onDownload={handleDownload} /></div>}
              </div>
            ))}
          </div>
      ) : (
        <div className="text-center py-12">
          <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">No Extraction History</h3>
          <p className="text-gray-400">Run an image extraction to see your history here.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700/50 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Clear All Extractions</h3>
            <p className="text-gray-400 mb-6">Are you sure you want to clear all extraction history? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-full border border-gray-600 py-3 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearHistory();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 rounded-full bg-red-600 py-3 text-white hover:bg-red-700"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Classification History Component
const ClassificationHistory = () => {
  const { history, clearHistory, removeFromHistory, loading } = useClassificationHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  
  const contentTypeIcons = { product: ShoppingCart, blog: FileText, review: Star, landing: Home, article: Newspaper, other: FileText };
  const getMethodDisplay = (method: string) => {
    if (method === 'openai') return { icon: '🤖', name: 'OpenAI' };
    if (method === 'huggingface') return { icon: '🤗', name: 'HuggingFace' };
    return { icon: '🔍', name: 'Keyword' };
  };

  const filteredHistory = history.filter(item =>
    item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      await clearHistory();
    } catch (error) {
      console.error('Failed to clear history:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleRemoveItem = async (id: string) => {
    setDeletingItems(prev => new Set(prev).add(id));
    try {
      await removeFromHistory(id);
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  return (
    <div>
       <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Content Classification History</h1>
          <p className="text-gray-400">Review your content analysis results</p>
        </div>
      
      {/* Search */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md mx-auto sm:mx-0">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search classifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full border border-gray-600/50 bg-gray-800/80 py-3 pl-12 pr-4 text-gray-200 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-500/50 focus:bg-gray-800/90 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            disabled={isClearing}
            className="flex items-center gap-2 rounded-full bg-red-600/80 border border-red-500/50 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-red-500/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClearing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isClearing ? 'Clearing...' : 'Clear History'}
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading classification history...</p>
        </div>
      )}

      {/* Classifications List */}
      {!loading && filteredHistory.length > 0 ? (
        <div className="space-y-4">
          {filteredHistory.map((item: ClassificationHistoryItem) => {
            const IconComponent = contentTypeIcons[item.contentType as keyof typeof contentTypeIcons] || FileText;
            const methodInfo = getMethodDisplay(item.method);
            const isDeleting = deletingItems.has(item.id);
            
            return (
              <div key={item.id} className="rounded-2xl bg-gray-900/80 border border-gray-700/50 p-6 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <IconComponent className="h-5 w-5 text-blue-400 flex-shrink-0" />
                      <h3 className="text-lg font-semibold text-gray-200 truncate">{item.title}</h3>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                      <ExternalLink className="h-3 w-3" />
                      <Link href={item.url} target="_blank" className="truncate hover:text-blue-400 transition-colors">
                        {item.url}
                      </Link>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mb-3">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30">
                        <span className="text-xs font-medium text-blue-300">
                          {item.contentType.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-600/20 border border-green-500/30">
                        <span className="text-xs font-medium text-green-300">
                          {Math.round(item.confidence * 100)}% confidence
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/30">
                        <span className="text-xs">{methodInfo.icon}</span>
                        <span className="text-xs font-medium text-purple-300">{methodInfo.name}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        <span>{item.images.length} images</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={isDeleting}
                    className="p-2 rounded-full hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading && (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">No Classification History</h3>
          <p className="text-gray-400">Run a content classification to see your history here.</p>
        </div>
      )}
    </div>
  );
}; 