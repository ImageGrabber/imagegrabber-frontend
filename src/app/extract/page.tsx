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

    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        openModal('login', 'Your session has expired. Please sign in again.');
        return;
      }
      
      const res = await fetch(`/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        credentials: 'include',
        body: JSON.stringify({ url }),
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
        <div className="mb-8">
          <div className="max-w-4xl mx-auto">
            <div className="mt-10 mb-6">
              <h1 className="text-2xl font-semibold text-white mb-2">Extract Images</h1>
              <p className="text-gray-400">Enter a website URL to extract all images</p>
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