'use client';

import { useState } from 'react';
import { Image } from '@/app/page';

interface ImageCardProps {
  image: Image;
  onDownload: (url: string, filename: string) => void;
}

export default function ImageCard({ image, onDownload }: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError(true);
  };

  return (
    <div className="group relative overflow-hidden rounded-lg bg-white shadow-md transition-all duration-300 hover:shadow-xl">
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="mt-2">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Image */}
      <div className="aspect-square w-full overflow-hidden">
        <img
          src={image.url}
          alt={image.filename}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      </div>

      {/* Overlay with actions */}
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-all duration-300 group-hover:bg-opacity-50">
        <div className="flex translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            onClick={() => onDownload(image.url, image.filename)}
            className="rounded-full bg-white p-3 text-gray-800 shadow-lg transition-colors hover:bg-primary hover:text-white"
            title="Download image"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filename */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        <p className="truncate text-sm text-white">{image.filename}</p>
      </div>
    </div>
  );
} 