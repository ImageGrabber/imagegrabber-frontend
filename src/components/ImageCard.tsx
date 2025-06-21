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
  onImageClick?: (image: Image) => void;
}

export default function ImageCard({ image, onDownload, onSelect, isSelected = false, onAuthRequired, onShowResult, onImageClick }: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isWordPressPushing, setIsWordPressPushing] = useState(false);
  const [isShopifyPushing, setIsShopifyPushing] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressInfo, setProgressInfo] = useState<{ platform: string; status: string } | null>(null);
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

    setIsWordPressPushing(true);
    setProgressInfo({ platform: 'WordPress', status: 'Preparing upload...' });
    setShowProgressDialog(true);

    try {
      // Get the user's session token
      setProgressInfo({ platform: 'WordPress', status: 'Authenticating...' });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      setProgressInfo({ platform: 'WordPress', status: `Uploading "${image.filename}"...` });
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
      
      setProgressInfo({ platform: 'WordPress', status: 'Upload completed successfully!' });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Show success for 1 second
      
      const result = await response.json();
      setShowProgressDialog(false);
      onShowResult?.({
        type: 'success',
        title: 'WordPress Push Successful!',
        message: `Successfully pushed "${image.filename}" to WordPress.`
      });
    } catch (error) {
      setShowProgressDialog(false);
      onShowResult?.({
        type: 'error',
        title: 'WordPress Push Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred while pushing to WordPress.'
      });
    } finally {
      setIsWordPressPushing(false);
      setProgressInfo(null);
    }
  };

  const handlePushToShopify = async () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }

    setIsShopifyPushing(true);
    setProgressInfo({ platform: 'Shopify', status: 'Preparing upload...' });
    setShowProgressDialog(true);

    try {
      // Get the user's session token
      setProgressInfo({ platform: 'Shopify', status: 'Authenticating...' });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      setProgressInfo({ platform: 'Shopify', status: `Uploading "${image.filename}"...` });
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
      
      setProgressInfo({ platform: 'Shopify', status: 'Upload completed successfully!' });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Show success for 1 second
      
      const result = await response.json();
      setShowProgressDialog(false);
      onShowResult?.({
        type: 'success',
        title: 'Shopify Push Successful!',
        message: `Successfully pushed "${image.filename}" to Shopify.`
      });
    } catch (error) {
      setShowProgressDialog(false);
      onShowResult?.({
        type: 'error',
        title: 'Shopify Push Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred while pushing to Shopify.'
      });
    } finally {
      setIsShopifyPushing(false);
      setProgressInfo(null);
    }
  };

  return (
    <>
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
        <div 
          className="aspect-square w-full overflow-hidden cursor-pointer"
          onClick={() => onImageClick?.(image)}
        >
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
              onClick={e => { e.stopPropagation(); onDownload(image.url, image.filename); }}
              className="rounded-full bg-gray-800/90 p-3 text-gray-200 shadow-lg transition-all duration-200 hover:bg-blue-600 hover:text-white disabled:opacity-50 border border-gray-600/50"
              title="Download"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); handlePushToWordPress(); }}
              disabled={isWordPressPushing || isShopifyPushing}
              className="rounded-full bg-gray-800/90 p-3 text-gray-200 shadow-lg transition-all duration-200 hover:bg-blue-600 hover:text-white disabled:opacity-50 border border-gray-600/50"
              title={user ? "Push to WordPress" : "Login required to push to WordPress"}
            >
              {isWordPressPushing ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-transparent"></div>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </button>
            <button
              onClick={e => { e.stopPropagation(); handlePushToShopify(); }}
              disabled={isWordPressPushing || isShopifyPushing}
              className="rounded-full bg-gray-800/90 p-3 text-gray-200 shadow-lg transition-all duration-200 hover:bg-green-600 hover:text-white disabled:opacity-50 border border-gray-600/50"
              title={user ? "Push to Shopify" : "Login required to push to Shopify"}
            >
              {isShopifyPushing ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-transparent"></div>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Info section */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate" title={image.filename}>
              {image.filename}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{formatFileSize(image.size || 0)}</span>
            <span className="capitalize">{image.type}</span>
          </div>
          {image.quality && (
            <div className="mt-1">
              <span className="text-xs text-gray-500">Quality: {image.quality}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Dialog */}
      {showProgressDialog && progressInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Uploading to {progressInfo.platform}
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img 
                  src={image.url} 
                  alt={image.filename}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {image.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(image.size || 0)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                </div>
                <p className="text-sm text-gray-600">
                  {progressInfo.status}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 