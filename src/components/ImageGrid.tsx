'use client';

import { Image } from '@/app/page';
import ImageCard from './ImageCard';

interface ImageGridProps {
  images: Image[];
  onDownload: (url: string, filename: string) => void;
}

export default function ImageGrid({ images, onDownload }: ImageGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
        <p className="text-center text-gray-500">
          No images found. Enter a URL and click "Scrape" to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {images.map((image, index) => (
        <div
          key={image.url}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ImageCard image={image} onDownload={onDownload} />
        </div>
      ))}
    </div>
  );
} 