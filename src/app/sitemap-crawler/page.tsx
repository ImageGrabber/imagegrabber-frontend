'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Network, Loader2, Link as LinkIcon, AlertTriangle, Play, List, Image as ImageIcon, CheckCircle, XCircle, Coins } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

type CrawlerStep = 'input' | 'confirm' | 'progress' | 'results';

interface SitemapJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_urls: number;
  processed_urls: number;
  results: { url: string; images: { url: string }[] }[];
  error?: string;
}

export default function SitemapCrawlerPage() {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<CrawlerStep>('input');
  const [job, setJob] = useState<SitemapJob | null>(null);
  const { user } = useAuth();

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/sitemap/status?jobId=${jobId}`);
      if (!response.ok) throw new Error('Failed to get job status');
      const data = await response.json();
      setJob(data.job);
      if (data.job.status === 'completed' || data.job.status === 'failed') {
        setStep('results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while polling for job status.');
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (job && (job.status === 'pending' || job.status === 'processing')) {
      interval = setInterval(() => {
        pollJobStatus(job.id);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [job, pollJobStatus]);
  
  useEffect(() => {
    if (step === 'confirm') {
      setSelectedUrls(new Set(discoveredUrls));
    }
  }, [step, discoveredUrls]);

  const handleFetchSitemap = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitemapUrl }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || 'Failed to fetch sitemap');
      }
      const data = await response.json();
      setDiscoveredUrls(data.urls);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCrawl = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sitemap/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitemapUrl, urls: Array.from(selectedUrls) }),
      });
      
      if (response.status === 402) {
        const errorData = await response.json();
        setError(errorData.error);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start crawl job');
      }
      
      const data = await response.json();
      setStep('progress');
      pollJobStatus(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while starting the job.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReset = () => {
    setSitemapUrl('');
    setDiscoveredUrls([]);
    setSelectedUrls(new Set());
    setError(null);
    setJob(null);
    setStep('input');
  }
  
  const handleUrlSelection = (url: string) => {
    const newSelection = new Set(selectedUrls);
    if (newSelection.has(url)) {
      newSelection.delete(url);
    } else {
      newSelection.add(url);
    }
    setSelectedUrls(newSelection);
  };
  
  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedUrls(new Set(discoveredUrls));
    } else {
      setSelectedUrls(new Set());
    }
  };

  const renderProgressBar = () => {
    if (!job) return null;
    const progress = job.total_urls > 0 ? (job.processed_urls / job.total_urls) * 100 : 0;
    return (
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mt-10 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                <Network />
                Sitemap Crawler
              </h1>
              <p className="text-gray-400">
                Automatically discover and extract images from all pages in a website's sitemap.
              </p>
            </div>
            {(step === 'results' || step === 'confirm') && (
              <button onClick={handleReset} className="px-4 py-2 text-sm font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-lg">
                Start New Crawl
              </button>
            )}
          </div>
          
          {step === 'input' && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 space-y-4">
              <div>
                <label htmlFor="sitemap-url" className="block text-sm font-medium text-gray-200 mb-2">
                  Enter Sitemap URL
                </label>
                <div className="relative">
                  <input
                    id="sitemap-url"
                    type="text"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    placeholder="e.g., https://www.example.com/sitemap.xml"
                    className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-3 pl-4 pr-32 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  />
                  <button
                    onClick={handleFetchSitemap}
                    disabled={isLoading || !sitemapUrl}
                    className="absolute inset-y-1 right-1 flex items-center px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Fetch URLs'}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-900/30 border border-red-500/30 rounded-lg p-3">
                  <AlertTriangle size={18} />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <List />
                    Confirm URLs
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Found {discoveredUrls.length} URLs in the sitemap. Select the ones you want to crawl.
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-yellow-400">
                    <Coins size={16} />
                    <span className="text-sm font-semibold">
                      This crawl will cost {selectedUrls.size} credits ({selectedUrls.size} URLs × 1 credit each)
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleStartCrawl}
                  disabled={isLoading || selectedUrls.size === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Play size={16} />}
                  Start Crawl ({selectedUrls.size} URLs)
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4">
                  <AlertTriangle size={18} />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center mb-2">
                  <input
                      id="select-all"
                      type="checkbox"
                      checked={discoveredUrls.length > 0 && selectedUrls.size === discoveredUrls.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="select-all" className="ml-2 text-sm font-medium text-gray-300">
                      Select All ({selectedUrls.size} / {discoveredUrls.length} selected)
                  </label>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                  {discoveredUrls.map((url, index) => (
                    <div key={index} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-md">
                      <input
                        type="checkbox"
                        checked={selectedUrls.has(url)}
                        onChange={() => handleUrlSelection(url)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <LinkIcon size={14} className="text-gray-500" />
                      <p className="text-sm text-gray-300 truncate">{url}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'progress' && job && (
             <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center">
               <h2 className="text-xl font-semibold text-white flex items-center justify-center gap-2">
                 <Loader2 className="animate-spin" />
                 Crawling in progress...
               </h2>
               <p className="text-gray-400 mt-2">
                 Processed {job.processed_urls} of {job.total_urls} URLs.
               </p>
               <div className="mt-4">
                 {renderProgressBar()}
               </div>
             </div>
          )}

          {step === 'results' && job && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  {job.status === 'completed' ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
                  Crawl {job.status}
                </h2>
              </div>
              {job.error && (
                 <div className="flex items-center gap-2 text-red-400 bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4">
                  <AlertTriangle size={18} />
                  <p className="text-sm">Error: {job.error}</p>
                </div>
              )}
              <div className="space-y-6">
                {job.results && job.results.map((result, index) => (
                  <div key={index}>
                    <div className="flex items-center gap-2">
                      <LinkIcon size={16} className="text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-200">{result.url}</h3>
                    </div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {result.images.map((image, imgIndex) => (
                        <div key={imgIndex} className="relative aspect-square rounded-lg overflow-hidden border border-gray-700">
                          <Image src={image.url} alt={result.url} layout="fill" objectFit="cover" />
                        </div>
                      ))}
                    </div>
                    {result.images.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">No images found on this page.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 