'use client';
// src/app/extract/page.tsx
import { useState, useMemo, ReactNode } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SearchInput from '@/components/SearchInput';
import ImageGrid from '@/components/ImageGrid';
import ImageFilterBar, { FilterOptions } from '@/components/ImageFilterBar';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { useSearchHistory } from '@/contexts/SearchHistoryContext';
import Link from 'next/link';
import { Image } from '@/app/page';

export default function ExtractPage() {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ReactNode | null>(null);
  const [lastSearchUrl, setLastSearchUrl] = useState<string>('');
  const [filters, setFilters] = useState<FilterOptions>({
    types: [],
    qualities: [],
    sortBy: 'filename',
    sortOrder: 'asc'
  });
  const [usePuppeteer, setUsePuppeteer] = useState(false);
  const [showExtractDialog, setShowExtractDialog] = useState(false);
  const [extractDialogMessage, setExtractDialogMessage] = useState('');

  const { user } = useAuth();
  const { openModal } = useModal();
  const { addToHistory } = useSearchHistory();

  const filteredAndSortedImages = useMemo(() => {
    let filtered = images;
    // ... filtering and sorting logic from original page.tsx ...
    return filtered;
  }, [images, filters]);

  const handleScrape = async (url: string) => {
    if (!user) {
      openModal('login', 'Please log in to scrape images.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastSearchUrl(url);
    setShowExtractDialog(true);
    setExtractDialogMessage(usePuppeteer
      ? 'Using Puppeteer (headless browser) to extract all images, including dynamic sliders...'
      : 'Using default extraction (fast, no JavaScript)...'
    );

    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        openModal('login', 'Your session has expired. Please sign in again.');
        setShowExtractDialog(false);
        return;
      }
      
      const res = await fetch(`/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        credentials: 'include',
        body: JSON.stringify({ url, puppeteer: usePuppeteer }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          const data = await res.json();
          setError(
            <span>
              {data.error || 'You are out of credits.'}{' '}
              <Link href="/pricing" className="underline font-semibold hover:text-orange-500">
                Please upgrade to continue.
              </Link>
            </span>
          );
          return;
        }
        throw new Error('Failed to scrape images');
      }

      const data = await res.json();
      setImages(data.images);
      
      window.dispatchEvent(new CustomEvent('creditsUpdated'));

      if (user) {
        const title = new URL(url).hostname;
        addToHistory(url, data.images.length, title);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong - try again');
    } finally {
      setIsLoading(false);
      setShowExtractDialog(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    // ... download logic ...
  };

  const handleDownloadAll = async () => {
    // ... download all logic ...
  };

  const handleAuthRequired = () => {
    openModal('login', 'Please log in or register to push images to your integrations.');
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Extraction method dialog */}
        {showExtractDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="rounded-xl bg-gray-900 border border-gray-700/50 p-6 shadow-xl text-center max-w-md w-full">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                <p className="text-lg text-white font-semibold">Extracting Images...</p>
                <p className="text-gray-300 text-sm">{extractDialogMessage}</p>
              </div>
            </div>
          </div>
        )}
        <div className="mb-8">
          <div className="max-w-4xl mx-auto">
            <div className="mt-10 mb-6">
              <h1 className="text-2xl font-semibold text-white mb-2">Extract Images</h1>
              <p className="text-gray-400">Enter a website URL to extract all images</p>
            </div>
            {/* Puppeteer toggle */}
            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="puppeteer-toggle"
                checked={usePuppeteer}
                onChange={e => setUsePuppeteer(e.target.checked)}
                className="h-4 w-4 rounded border-gray-400"
              />
              <label htmlFor="puppeteer-toggle" className="text-sm text-gray-200 select-none">
                Use Puppeteer (headless browser, best for dynamic sliders)
              </label>
            </div>
            <SearchInput 
              onScrape={handleScrape}
              isLoading={isLoading}
              initialUrl={lastSearchUrl}
              onUrlChange={setLastSearchUrl}
            />
          </div>
        </div>

        {images.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <ImageFilterBar
              onFilterChange={setFilters}
              imageCount={images.length}
              filteredCount={filteredAndSortedImages.length}
              onDownloadAll={handleDownloadAll}
              filteredAndSortedImages={filteredAndSortedImages}
            />
            <ImageGrid 
              images={filteredAndSortedImages} 
              onDownload={handleDownload} 
              onAuthRequired={handleAuthRequired}
            />
          </div>
        )}

        {error && (
          <div className="py-8">
            <div className="mx-auto max-w-xl rounded-2xl bg-red-900/50 border border-red-700/50 p-4 text-center">
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 