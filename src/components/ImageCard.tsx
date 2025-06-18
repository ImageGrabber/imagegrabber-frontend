'use client';

import { useState } from 'react';
import { Image } from '@/app/page';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ImageCardProps {
  image: Image;
  onDownload: (url: string, filename: string) => void;
  onSelect?: (image: Image, selected: boolean) => void;
  isSelected?: boolean;
  onAuthRequired?: () => void;
  onShowResult?: (result: { type: 'success' | 'error'; title: string; message: string }) => void;
}

export default function ImageCard({ image, onDownload, onSelect, isSelected = false, onAuthRequired, onShowResult }: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const { user } = useAuth();

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError(true);
  };

  const handlePushToWordPress = async () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }

    setIsPushing(true);
    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch('/api/push/wordpress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ image }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to push to WordPress');
      }
      
      const result = await response.json();
      onShowResult?.({
        type: 'success',
        title: 'WordPress Push Successful!',
        message: `Successfully pushed "${image.filename}" to WordPress.`
      });
    } catch (error) {
      onShowResult?.({
        type: 'error',
        title: 'WordPress Push Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred while pushing to WordPress.'
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePushToShopify = async () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }

    setIsPushing(true);
    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch('/api/push/shopify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ image }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to push to Shopify');
      }
      
      const result = await response.json();
      onShowResult?.({
        type: 'success',
        title: 'Shopify Push Successful!',
        message: `Successfully pushed "${image.filename}" to Shopify.`
      });
    } catch (error) {
      onShowResult?.({
        type: 'error',
        title: 'Shopify Push Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred while pushing to Shopify.'
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className={`group relative overflow-hidden rounded-lg bg-white shadow-md transition-all duration-300 hover:shadow-xl ${isSelected ? 'ring-2 ring-orange-500' : ''}`}>
      {/* Selection checkbox */}
      {onSelect && (
        <div className="absolute top-2 right-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(image, e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          />
        </div>
      )}

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
        <div className="flex gap-2 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            onClick={() => onDownload(image.url, image.filename)}
            className="rounded-full bg-white p-3 text-gray-800 shadow-lg transition-colors hover:bg-primary hover:text-white"
            title="Download image"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={handlePushToWordPress}
            disabled={isPushing}
            className="rounded-full bg-white p-3 text-gray-800 shadow-lg transition-colors hover:bg-blue-500 hover:text-white disabled:opacity-50"
            title={user ? "Push to WordPress" : "Login required to push to WordPress"}
          >
            {isPushing ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-800 border-t-transparent"></div>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </button>
          <button
            onClick={handlePushToShopify}
            disabled={isPushing}
            className="rounded-full bg-white p-3 text-gray-800 shadow-lg transition-colors hover:bg-green-500 hover:text-white disabled:opacity-50"
            title={user ? "Push to Shopify" : "Login required to push to Shopify"}
          >
            {isPushing ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-800 border-t-transparent"></div>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Filename and metadata */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        <p className="truncate text-sm text-white font-medium">{image.filename}</p>
        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-300">
          {image.type && (
            <span className="bg-black/30 px-2 py-0.5 rounded">
              {image.type.split('/')[1].toUpperCase()}
            </span>
          )}
          {image.width && image.height && (
            <span className="bg-black/30 px-2 py-0.5 rounded">
              {image.width}×{image.height}
            </span>
          )}
          {image.size && (
            <span className="bg-black/30 px-2 py-0.5 rounded">
              {formatFileSize(image.size)}
            </span>
          )}
          {image.quality && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              image.quality === 'high' ? 'bg-green-500/80 text-white' :
              image.quality === 'medium' ? 'bg-yellow-500/80 text-white' :
              'bg-red-500/80 text-white'
            }`}>
              {image.quality.toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* Helper function to format file size */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
} 