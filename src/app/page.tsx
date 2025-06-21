'use client';

import { useState, useMemo, ReactNode } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ImageGrid from '@/components/ImageGrid';
import ImageFilterBar, { FilterOptions } from '@/components/ImageFilterBar';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { useSearchHistory } from '@/contexts/SearchHistoryContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export interface Image {
  url: string;
  filename: string;
  size?: number; // in bytes
  width?: number;
  height?: number;
  type?: string; // image/jpeg, image/png, etc.
  quality?: 'low' | 'medium' | 'high';
}

export default function Home() {
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

  const { user, refreshSession } = useAuth();
  const { openModal } = useModal();
  const { addToHistory } = useSearchHistory();
  const router = useRouter();

  // Filter and sort images based on current filters
  const filteredAndSortedImages = useMemo(() => {
    let filtered = images;

    // Apply filters
    if (filters.minSize) {
      filtered = filtered.filter(img => (img.size || 0) >= filters.minSize!);
    }
    if (filters.maxSize) {
      filtered = filtered.filter(img => (img.size || 0) <= filters.maxSize!);
    }
    if (filters.types.length > 0) {
      filtered = filtered.filter(img => img.type && filters.types.includes(img.type));
    }
    if (filters.qualities.length > 0) {
      filtered = filtered.filter(img => img.quality && filters.qualities.includes(img.quality));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'filename':
          aValue = a.filename.toLowerCase();
          bValue = b.filename.toLowerCase();
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'width':
          aValue = a.width || 0;
          bValue = b.width || 0;
          break;
        case 'height':
          aValue = a.height || 0;
          bValue = b.height || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [images, filters]);

  /* ---------------- SCRAPING ---------------- */
  const handleScrape = async (url: string) => {
    // Client-side check to prevent unnecessary API calls
    if (!user) {
      openModal('login', 'Please log in to scrape images.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastSearchUrl(url);

    try {
      // Use Supabase client to make authenticated request
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        openModal('login', 'Your session has expired. Please sign in again.');
        return;
      }
      
      const res = await fetch(`/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          // This means the server session is stale/expired despite client thinking it's valid
          openModal('login', 'Your session has expired. Please sign in again.');
          return;
        }
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
      
      // Trigger credits refresh
      window.dispatchEvent(new CustomEvent('creditsUpdated'));

      // Update history with image count if user is logged in
      if (user) {
        const title = new URL(url).hostname;
        addToHistory(url, data.images.length, title);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong - try again'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* --------------- DOWNLOAD ONE -------------- */
  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const link = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = link;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(link);
      a.remove();
    } catch (err) {
      console.error(err);
    }
  };

  /* --------------- DOWNLOAD ALL -------------- */
  const handleDownloadAll = async () => {
    if (!filteredAndSortedImages.length) return;

    try {
      const res = await fetch('/api/download-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: filteredAndSortedImages }),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const link = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = link;
      a.download = 'images.zip';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(link);
      a.remove();
    } catch (err) {
      console.error(err);
    }
  };

  /* --------------- AUTH REQUIRED -------------- */
  const handleAuthRequired = () => {
    openModal('login', 'Please log in or register to push images to your integrations.');
  };

  /* ------------------ RENDER ----------------- */
  return (
    <div className="min-h-screen">
      <Header />

      <div>
        {/* Hero Section with Background */}
        <HeroSection isLoading={isLoading} onScrape={handleScrape} />

        {/* Results area with filters */}
        {images.length > 0 && (
          <main className="container mx-auto mt-30 max-w-6xl px-4 pb-16">
            {/* Filter Bar */}
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
          </main>
        )}

        {error && (
          <div className="py-8">
            <p className="mx-auto max-w-xl rounded-lg bg-red-50 p-4 text-center text-red-700">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}




