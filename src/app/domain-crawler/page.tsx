'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Globe, Loader2, AlertTriangle, Play, List, Image as ImageIcon, CheckCircle, XCircle, Coins, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

type CrawlerStep = 'input' | 'confirm' | 'progress' | 'results';

interface DomainJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_urls: number;
  processed_urls: number;
  discovered_urls: string[];
  results: { url: string; images: { url: string }[] }[];
  error?: string;
}

interface CrawlSettings {
  maxDepth: number;
  maxPages: number;
  followExternalLinks: boolean;
  respectRobotsTxt: boolean;
  delayBetweenRequests: number;
}

export default function DomainCrawlerPage() {
  const [domainUrl, setDomainUrl] = useState('');
  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<CrawlerStep>('input');
  const [job, setJob] = useState<DomainJob | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [crawlSettings, setCrawlSettings] = useState<CrawlSettings>({
    maxDepth: 3,
    maxPages: 50,
    followExternalLinks: false,
    respectRobotsTxt: true,
    delayBetweenRequests: 1000
  });
  const { user } = useAuth();

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/domain-crawler/status?jobId=${jobId}`);
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

  const handleDiscoverPages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/domain-crawler/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domainUrl,
          settings: crawlSettings
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || 'Failed to discover pages');
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
      const response = await fetch('/api/domain-crawler/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domainUrl, 
          urls: Array.from(selectedUrls),
          settings: crawlSettings
        }),
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
    setDomainUrl('');
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

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mt-10 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                <Globe />
                Domain Crawler
              </h1>
              <p className="text-gray-400">
                Crawl entire domains with depth limits to extract images from all discovered pages.
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
                <label htmlFor="domain-url" className="block text-sm font-medium text-gray-200 mb-2">
                  Enter Domain URL
                </label>
                <div className="relative">
                  <input
                    id="domain-url"
                    type="text"
                    value={domainUrl}
                    onChange={(e) => setDomainUrl(e.target.value)}
                    placeholder="e.g., https://www.example.com"
                    className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-3 pl-4 pr-32 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  />
                  <button
                    onClick={handleDiscoverPages}
                    disabled={isLoading || !domainUrl}
                    className="absolute inset-y-1 right-1 flex items-center px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Discover Pages'}
                  </button>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white"
                >
                  <Settings size={16} />
                  Advanced Settings
                  {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showAdvancedSettings && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="max-depth" className="block text-sm font-medium text-gray-300 mb-1">
                          Max Depth
                        </label>
                        <input
                          id="max-depth"
                          type="number"
                          min="1"
                          max="10"
                          value={crawlSettings.maxDepth}
                          onChange={(e) => setCrawlSettings(prev => ({ ...prev, maxDepth: parseInt(e.target.value) }))}
                          className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">How deep to crawl (1-10 levels)</p>
                      </div>
                      <div>
                        <label htmlFor="max-pages" className="block text-sm font-medium text-gray-300 mb-1">
                          Max Pages
                        </label>
                        <input
                          id="max-pages"
                          type="number"
                          min="1"
                          max="500"
                          value={crawlSettings.maxPages}
                          onChange={(e) => setCrawlSettings(prev => ({ ...prev, maxPages: parseInt(e.target.value) }))}
                          className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Maximum pages to crawl (1-500)</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="delay" className="block text-sm font-medium text-gray-300 mb-1">
                          Delay Between Requests (ms)
                        </label>
                        <input
                          id="delay"
                          type="number"
                          min="0"
                          max="5000"
                          step="100"
                          value={crawlSettings.delayBetweenRequests}
                          onChange={(e) => setCrawlSettings(prev => ({ ...prev, delayBetweenRequests: parseInt(e.target.value) }))}
                          className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Delay to be respectful to servers</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={crawlSettings.followExternalLinks}
                          onChange={(e) => setCrawlSettings(prev => ({ ...prev, followExternalLinks: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-300">Follow external links</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={crawlSettings.respectRobotsTxt}
                          onChange={(e) => setCrawlSettings(prev => ({ ...prev, respectRobotsTxt: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-300">Respect robots.txt</span>
                      </label>
                    </div>
                  </div>
                )}
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
                    Confirm Pages to Crawl
                  </h2>
                  <p className="text-gray-400 mt-1">
                    Discovered {discoveredUrls.length} pages on {getDomainFromUrl(domainUrl)}. Select the ones you want to crawl.
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-yellow-400">
                    <Coins size={16} />
                    <span className="text-sm font-semibold">
                      This crawl will cost {selectedUrls.size} credits ({selectedUrls.size} pages × 1 credit each)
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleStartCrawl}
                  disabled={isLoading || selectedUrls.size === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Play size={16} />}
                  Start Crawl ({selectedUrls.size} pages)
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
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {discoveredUrls.map((url) => (
                    <label key={url} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50">
                      <input
                        type="checkbox"
                        checked={selectedUrls.has(url)}
                        onChange={() => handleUrlSelection(url)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300 truncate">{url}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'progress' && job && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Loader2 className="animate-spin h-6 w-6 text-blue-500" />
                <h2 className="text-xl font-semibold text-white">Crawling Domain</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{job.processed_urls} / {job.total_urls} pages</span>
                  </div>
                  {renderProgressBar()}
                </div>
                <div className="text-sm text-gray-400">
                  <p>Status: {job.status === 'processing' ? 'Crawling pages and extracting images...' : job.status}</p>
                  {job.error && (
                    <p className="text-red-400 mt-2">Error: {job.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'results' && job && (
            <div className="space-y-6">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  {job.status === 'completed' ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                  <h2 className="text-xl font-semibold text-white">
                    Crawl {job.status === 'completed' ? 'Completed' : 'Failed'}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-gray-400">Pages Crawled</div>
                    <div className="text-white font-semibold">{job.processed_urls}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-gray-400">Total Images Found</div>
                    <div className="text-white font-semibold">
                      {job.results.reduce((acc, result) => acc + result.images.length, 0)}
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-gray-400">Pages with Images</div>
                    <div className="text-white font-semibold">
                      {job.results.filter(r => r.images.length > 0).length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {job.results && job.results.map((result, index) => (
                  <div key={index} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon size={16} className="text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-200 truncate">{result.url}</h3>
                      <span className="text-sm text-gray-500">({result.images.length} images)</span>
                    </div>
                    {result.images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {result.images.map((image, imgIndex) => (
                          <div key={imgIndex} className="relative aspect-square rounded-lg overflow-hidden border border-gray-700">
                            <Image src={image.url} alt={result.url} layout="fill" objectFit="cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No images found on this page.</p>
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