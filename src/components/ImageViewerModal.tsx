'use client';

import { useState, useRef, useEffect } from 'react';
import { Image } from '@/app/page';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { X, Download, Upload, ExternalLink } from 'lucide-react';
import ShopifyPushModal from './ShopifyPushModal';

interface ImageViewerModalProps {
  image: Image;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (url: string, filename: string) => void;
  onAuthRequired?: () => void;
  onShowResult?: (result: { type: 'success' | 'error'; title: string; message: string }) => void;
}

export default function ImageViewerModal({
  image,
  isOpen,
  onClose,
  onDownload,
  onAuthRequired,
  onShowResult
}: ImageViewerModalProps) {
  const [isWordPressPushing, setIsWordPressPushing] = useState(false);
  const [isShopifyPushing, setIsShopifyPushing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { user } = useAuth();
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyModalLoading, setShopifyModalLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePushToWordPress = async () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }

    setIsWordPressPushing(true);
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
      setIsWordPressPushing(false);
    }
  };

  const handlePushToShopify = async (opts?: { mode: 'gallery' | 'product'; productId?: string }) => {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    setIsShopifyPushing(true);
    setShopifyModalLoading(true);
    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }
      const body: any = { image };
      if (opts?.mode === 'product' && opts.productId) {
        body.productId = opts.productId;
      }
      const response = await fetch('/api/push/shopify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to push to Shopify');
      }
      const result = await response.json();
      onShowResult?.({
        type: 'success',
        title: 'Shopify Push Successful!',
        message: `Successfully pushed "${image.filename}" to Shopify.\n\nLocation: ${result.location || 'Shopify Files'}\n${result.instructions || 'Check your Shopify admin to find the uploaded file.'}`
      });
      setShowShopifyModal(false);
    } catch (error) {
      onShowResult?.({
        type: 'error',
        title: 'Shopify Push Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred while pushing to Shopify.'
      });
    } finally {
      setIsShopifyPushing(false);
      setShopifyModalLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Fullscreen API handlers
  useEffect(() => {
    if (!isFullscreen) return;
    const el = imageContainerRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen();
    }
    const handleExit = () => {
      setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) handleExit();
    });
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleExit();
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) handleExit();
      });
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isFullscreen]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={handleBackdropClick}>
      <div className="relative max-w-4xl max-h-[90vh] w-full mx-4 bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate" title={image.filename}>
              {image.filename}
            </h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              {image.width && image.height && (
                <span>{image.width} × {image.height}</span>
              )}
              {image.size && (
                <span>{formatFileSize(image.size)}</span>
              )}
              {image.type && (
                <span className="uppercase">{image.type.split('/')[1]}</span>
              )}
              {image.quality && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  image.quality === 'high' ? 'bg-green-100 text-green-800' :
                  image.quality === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {image.quality.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image Display */}
        <div
          ref={imageContainerRef}
          className={`relative bg-gray-100 flex items-center justify-center ${isFullscreen ? 'fixed inset-0 z-[100] bg-black max-w-none max-h-none w-screen h-screen' : ''}`}
          style={isFullscreen ? { minHeight: '100vh', maxHeight: '100vh' } : { minHeight: '400px', maxHeight: '60vh' }}
        >
          {/* Zoom/Fullscreen Button */}
          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-4 left-4 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-colors z-20"
              title="View fullscreen"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 3H5a2 2 0 00-2 2v3m0 8v3a2 2 0 002 2h3m8-16h3a2 2 0 012 2v3m0 8v3a2 2 0 01-2 2h-3" /></svg>
            </button>
          )}
          {isFullscreen && (
            <button
              onClick={() => {
                setIsFullscreen(false);
                if (document.fullscreenElement) document.exitFullscreen();
              }}
              className="absolute top-4 left-4 p-2 bg-black bg-opacity-70 text-white rounded-lg hover:bg-opacity-90 transition-colors z-20"
              title="Exit fullscreen"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
            </div>
          )}
          
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="mt-2">Failed to load image</p>
              </div>
            </div>
          )}

          <img
            src={image.url}
            alt={image.filename}
            className={`object-contain ${isFullscreen ? 'max-w-full max-h-full w-auto h-auto' : 'max-w-full max-h-full'}`}
            style={isFullscreen ? { width: '100vw', height: '100vh' } : {}}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageLoaded(true);
              setImageError(true);
            }}
          />

          {/* View Original Link */}
          {!isFullscreen && (
            <a
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-colors"
              title="View original image"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Download Button */}
            <button
              onClick={() => onDownload(image.url, image.filename)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>

            {/* Push Buttons */}
            <div className="flex gap-3">
              {/* WordPress Push */}
              <button
                onClick={handlePushToWordPress}
                disabled={isWordPressPushing || !user}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={!user ? "Login required" : "Push to WordPress"}
              >
                {isWordPressPushing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Pushing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    WordPress
                  </>
                )}
              </button>

              {/* Shopify Push */}
              <button
                onClick={() => setShowShopifyModal(true)}
                disabled={isShopifyPushing || !user}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={!user ? "Login required" : "Push to Shopify"}
              >
                {isShopifyPushing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Pushing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Shopify
                  </>
                )}
              </button>
            </div>

            {!user && (
              <p className="text-sm text-gray-500">
                <button
                  onClick={onAuthRequired}
                  className="text-orange-600 hover:text-orange-700 underline"
                >
                  Login
                </button>
                {' '}to push images to WordPress and Shopify
              </p>
            )}
          </div>
        </div>
      </div>
      <ShopifyPushModal
        isOpen={showShopifyModal}
        onClose={() => setShowShopifyModal(false)}
        onConfirm={opts => {
          setShowShopifyModal(false);
          handlePushToShopify(opts);
        }}
        loading={shopifyModalLoading}
      />
    </div>
  );
} 