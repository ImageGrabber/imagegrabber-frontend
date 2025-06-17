'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ImageGrid from '@/components/ImageGrid';

export interface Image {
  url: string;
  filename: string;
}

export default function Home() {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- SCRAPING ---------------- */
  const handleScrape = async (url: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Failed to scrape images');
      const data = await res.json();
      setImages(data.images);
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
    if (!images.length) return;

    try {
      const res = await fetch('/api/download-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: images }),
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

  /* ------------------ RENDER ----------------- */
  return (
    <>
      <Header />

      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 min-h-screen">
        {/* Hero Section with Background */}
        <HeroSection isLoading={isLoading} onScrape={handleScrape} />

        {/* scrape-results area (search + grid) */}
        {images.length > 0 && (
          <main className="container mx-auto max-w-6xl px-4 pb-16 mt-30">
            <div className="mb-8 flex justify-end">
              <button
                onClick={handleDownloadAll}
                disabled={images.length === 0}
                className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                Download All ({images.length})
              </button>
            </div>

            <ImageGrid images={images} onDownload={handleDownload} />
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
    </>
  );
}




