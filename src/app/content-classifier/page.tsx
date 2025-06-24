"use client";

import { useState } from "react";
import React from "react";
import Notification from "@/components/Notification";
import DashboardLayout from "@/components/DashboardLayout";
import { Brain, Filter, SortAsc, SortDesc, Search, FileText, ShoppingCart, Newspaper, Star, Home } from "lucide-react";
import { useClassificationHistory } from '@/contexts/ClassificationHistoryContext';

interface NotificationState {
  isVisible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

interface ContentItem {
  id: string;
  url: string;
  title: string;
  description: string;
  contentType: 'product' | 'blog' | 'review' | 'landing' | 'article' | 'other';
  confidence: number;
  images: string[];
  created_at: string;
  method: 'openai' | 'huggingface' | 'keyword';
}

type SortField = 'title' | 'contentType' | 'confidence' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function ContentClassifierPage() {
  const [url, setUrl] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [latestClassification, setLatestClassification] = useState<ContentItem | null>(null);
  const { history: contentItems, addToHistory, loading: historyLoading } = useClassificationHistory();
  const [filterType, setFilterType] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState<NotificationState>({
    isVisible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const contentTypeIcons = {
    product: ShoppingCart,
    blog: FileText,
    review: Star,
    landing: Home,
    article: Newspaper,
    other: FileText,
  };

  const contentTypeColors = {
    product: 'bg-blue-500',
    blog: 'bg-green-500',
    review: 'bg-yellow-500',
    landing: 'bg-purple-500',
    article: 'bg-orange-500',
    other: 'bg-gray-500',
  };

  const getMethodDisplay = (method: string) => {
    switch (method) {
      case 'openai':
        return { icon: '🤖', name: 'OpenAI' };
      case 'huggingface':
        return { icon: '🤗', name: 'HuggingFace' };
      default:
        return { icon: '🔍', name: 'Keyword' };
    }
  };

  const handleClassify = async () => {
    if (!url) {
      setNotification({
        isVisible: true,
        type: 'error',
        title: "URL is required",
        message: "Please enter a URL to classify content.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/content-classifier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, useAI }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to classify content.");
      }

      const data = await response.json();
      const { id, created_at, ...restOfData } = data;
      
      // Save to database via context
      await addToHistory(data);

      setLatestClassification(data); // Store the latest result

      setNotification({
        isVisible: true,
        type: 'success',
        title: 'Classification Complete',
        message: `Content classified as: ${data.contentType} (${Math.round(data.confidence * 100)}% confidence) using ${getMethodDisplay(data.method).name}`,
      });
      
      // Clear the URL input after successful classification
      setUrl("");
    } catch (error: any) {
      setNotification({
        isVisible: true,
        type: 'error',
        title: "Classification Failed",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedItems = contentItems
    .filter(item => {
      const matchesType = filterType === 'all' || item.contentType === filterType;
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.url.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Brain className="h-6 w-6 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">AI Content Classifier</h1>
        </div>

        {/* Input Section */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex flex-col space-y-4 bg-gray-900/50 border border-gray-700/50 rounded-lg p-6">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter a website URL to classify..."
              className="w-full rounded-lg border px-4 py-2 text-gray-200 bg-gray-800/80 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600/50"
            />
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm">Use AI Classification (OpenAI/HuggingFace)</span>
              </label>
            </div>
            
            <button
              onClick={handleClassify}
              disabled={isLoading || historyLoading}
              className="w-full rounded-full bg-blue-600 py-3 text-white font-semibold shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Classifying...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Brain className="h-4 w-4" />
                  Classify Content
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Display Latest Classification Result */}
        {latestClassification && (
          <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-4 text-center">Classification Result</h2>
            <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-blue-400">{latestClassification.title}</h3>
                  <a href={latestClassification.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                    {latestClassification.url}
                  </a>
                </div>
                <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full ${contentTypeColors[latestClassification.contentType]}`}>
                  {React.createElement(contentTypeIcons[latestClassification.contentType], { className: "h-4 w-4" })}
                  <span>{latestClassification.contentType.charAt(0).toUpperCase() + latestClassification.contentType.slice(1)}</span>
                </div>
              </div>
              <p className="text-gray-300 mt-4">{latestClassification.description}</p>
              <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
                <span>
                  Confidence: <span className="font-semibold text-white">{Math.round(latestClassification.confidence * 100)}%</span>
                </span>
                <span>
                  Method: <span className="font-semibold text-white">{getMethodDisplay(latestClassification.method).name}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {historyLoading && (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-400">Loading classification history...</p>
          </div>
        )}

        {/* Filters and Search */}
        {!historyLoading && contentItems.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search content..."
                  className="pl-10 pr-4 py-2 rounded-lg border text-gray-200 bg-gray-800/80 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600/50"
                />
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 rounded-lg border text-gray-200 bg-gray-800/80 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600/50"
              >
                <option value="all">All Types</option>
                <option value="product">Products</option>
                <option value="blog">Blog Posts</option>
                <option value="review">Reviews</option>
                <option value="landing">Landing Pages</option>
                <option value="article">Articles</option>
                <option value="other">Other</option>
              </select>

              {/* Sort */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-4 py-2 rounded-lg border text-gray-200 bg-gray-800/80 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600/50"
              >
                <option value="created_at">Date</option>
                <option value="title">Title</option>
                <option value="contentType">Type</option>
                <option value="confidence">Confidence</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-lg border text-gray-200 bg-gray-800/80 hover:bg-gray-700/80 border-gray-600/50"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </button>
            </div>

            <div className="text-sm text-gray-400">
              Showing {filteredAndSortedItems.length} of {contentItems.length} items
            </div>
          </div>
        )}

        {/* Results */}
        {!historyLoading && filteredAndSortedItems.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedItems.map((item) => {
              const IconComponent = contentTypeIcons[item.contentType];
              const colorClass = contentTypeColors[item.contentType];
              const methodDisplay = getMethodDisplay(item.method);
              
              return (
                <div key={item.id} className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-6 hover:bg-gray-800/50 transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-300 capitalize">
                        {item.contentType}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        {Math.round(item.confidence * 100)}%
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>{methodDisplay.icon}</span>
                        <span>{methodDisplay.name}</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                    {item.title}
                  </h3>
                  
                  <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate max-w-48">{item.url}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>

                  {item.images.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      {item.images.slice(0, 3).map((image, index) => (
                        <div key={index} className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                          <img src={image} alt="" className="w-full h-full object-cover rounded-lg" />
                        </div>
                      ))}
                      {item.images.length > 3 && (
                        <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-400">
                          +{item.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!historyLoading && contentItems.length === 0 && (
          <div className="text-center py-12">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No content classified yet</h3>
            <p className="text-gray-400">Enter a URL above to start classifying content with AI</p>
          </div>
        )}
      </div>
      
      <Notification
        isVisible={notification.isVisible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isVisible: false })}
      />
    </DashboardLayout>
  );
} 