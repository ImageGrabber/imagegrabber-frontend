'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ImageGrid from '@/components/ImageGrid';
import ImageFilterBar, { FilterOptions } from '@/components/ImageFilterBar';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchHistory } from '@/contexts/SearchHistoryContext';
import { useRouter } from 'next/navigation';

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
  const [error, setError] = useState<string | null>(null);
  const [lastSearchUrl, setLastSearchUrl] = useState<string>('');
  const [filters, setFilters] = useState<FilterOptions>({
    types: [],
    qualities: [],
    sortBy: 'filename',
    sortOrder: 'asc'
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState<string>('');

  const { user } = useAuth();
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
    setIsLoading(true);
    setError(null);
    setLastSearchUrl(url);

    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Failed to scrape images');
      const data = await res.json();
      setImages(data.images);

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
    setAuthMessage('Please log in or register to push images to WordPress and Shopify. After logging in, configure your integration settings to start pushing images.');
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setAuthMessage('');
    // Redirect to settings page after successful authentication
    router.push('/settings');
  };

  /* ------------------ RENDER ----------------- */
  return (
    <>
      <Header />

      <div className="bg-blue-900 min-h-screen">
        {/* Hero Section with Background */}
        <HeroSection isLoading={isLoading} onScrape={handleScrape} />

        {/* Results area with filters */}
        {images.length > 0 && (
          <main className="container mx-auto max-w-6xl px-4 pb-16 mt-30">
            {/* Filter Bar */}
            <ImageFilterBar
              onFilterChange={setFilters}
              imageCount={images.length}
              filteredCount={filteredAndSortedImages.length}
            />

            <div className="mb-8 flex justify-end">
              <button
                onClick={handleDownloadAll}
                disabled={filteredAndSortedImages.length === 0}
                className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                Download {filteredAndSortedImages.length > 0 ? `Filtered (${filteredAndSortedImages.length})` : 'All'} Images
              </button>
            </div>

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

      {/* Auth Modal for Push Operations */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthMessage('');
        }}
        initialMode="register"
        customMessage={authMessage}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}




