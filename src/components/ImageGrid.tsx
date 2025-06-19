'use client';

import { useState } from 'react';
import { Image } from '@/app/page';
import ImageCard from './ImageCard';
import ImageViewerModal from './ImageViewerModal';
import Notification from './Notification';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ShopifyPushModal from './ShopifyPushModal';

interface ImageGridProps {
  images: Image[];
  onDownload: (url: string, filename: string) => void;
  onAuthRequired?: () => void;
}

interface ProgressInfo {
  platform: string;
  currentIndex: number;
  totalImages: number;
  currentImage: Image;
  status: string;
}

export default function ImageGrid({ images, onDownload, onAuthRequired }: ImageGridProps) {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isWordPressPushing, setIsWordPressPushing] = useState(false);
  const [isShopifyPushing, setIsShopifyPushing] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const { user } = useAuth();
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyModalLoading, setShopifyModalLoading] = useState(false);
  const [shopifyBulkOpts, setShopifyBulkOpts] = useState<{ mode: 'gallery' | 'product'; productId?: string } | null>(null);

  // Create unique identifier for each image to fix duplicate selection issue
  const getImageId = (image: Image, index: number) => `${index}-${image.url}`;

  const handleImageClick = (image: Image) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const handleCloseModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const handleShowResult = (result: { type: 'success' | 'error'; title: string; message: string }) => {
    setNotificationData(result);
    setShowNotification(true);
  };

  const handleCloseNotification = () => {
    setShowNotification(false);
    setNotificationData(null);
  };

  const handleSelect = (image: Image, index: number, selected: boolean) => {
    const imageId = getImageId(image, index);
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(imageId);
      } else {
        newSet.delete(imageId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map((img, index) => getImageId(img, index))));
    }
  };

  const handleBulkPushToWordPress = async () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }

    setIsWordPressPushing(true);
    const selectedImagesList = images.filter((img, index) => 
      selectedImages.has(getImageId(img, index))
    );

    // Show progress dialog
    setShowProgressDialog(true);
    
    try {
      // Get the user's session token
      setProgressInfo({
        platform: 'WordPress',
        currentIndex: 0,
        totalImages: selectedImagesList.length,
        currentImage: selectedImagesList[0],
        status: 'Authenticating...'
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Upload images sequentially to avoid overwhelming WordPress
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      let lastError = null;

      for (let i = 0; i < selectedImagesList.length; i++) {
        const image = selectedImagesList[i];
        
        setProgressInfo({
          platform: 'WordPress',
          currentIndex: i + 1,
          totalImages: selectedImagesList.length,
          currentImage: image,
          status: `Uploading "${image.filename}"...`
        });

        try {
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
            throw new Error(errorData.error || `Failed to push ${image.filename} to WordPress`);
          }
          
          const result = await response.json();
          results.push(result);
          successCount++;
          
          // Update progress with success
          setProgressInfo({
            platform: 'WordPress',
            currentIndex: i + 1,
            totalImages: selectedImagesList.length,
            currentImage: image,
            status: `✓ "${image.filename}" uploaded successfully`
          });
          
          // Add a small delay between uploads to be nice to WordPress
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          errorCount++;
          lastError = error;
          console.error(`Failed to push ${image.filename}:`, error);
          
          // Update progress with error
          setProgressInfo({
            platform: 'WordPress',
            currentIndex: i + 1,
            totalImages: selectedImagesList.length,
            currentImage: image,
            status: `✗ Failed to upload "${image.filename}"`
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Hide progress dialog
      setShowProgressDialog(false);
      
      // Show result dialog based on outcomes
      if (errorCount === 0) {
        // All successful
        setResultMessage({
          type: 'success',
          title: 'WordPress Push Successful!',
          message: `Successfully pushed ${successCount} image${successCount !== 1 ? 's' : ''} to WordPress.`
        });
        setShowResultDialog(true);
        // Clear selection after successful push
        setSelectedImages(new Set());
      } else if (successCount === 0) {
        // All failed
        setResultMessage({
          type: 'error',
          title: 'WordPress Push Failed',
          message: `Failed to push all ${selectedImagesList.length} images to WordPress. ${lastError instanceof Error ? lastError.message : 'Unknown error occurred.'}`
        });
        setShowResultDialog(true);
      } else {
        // Partial success
        setResultMessage({
          type: 'error',
          title: 'WordPress Push Partially Failed',
          message: `Successfully pushed ${successCount} image${successCount !== 1 ? 's' : ''}, but ${errorCount} failed. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`
        });
        setShowResultDialog(true);
        // Don't clear selection so user can retry failed ones
      }
    } catch (error) {
      // Hide progress dialog and show error dialog
      setShowProgressDialog(false);
      setResultMessage({
        type: 'error',
        title: 'WordPress Push Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred while pushing to WordPress.'
      });
      setShowResultDialog(true);
    } finally {
      setIsWordPressPushing(false);
      setProgressInfo(null);
    }
  };

  const handleBulkPushToShopify = async (opts?: { mode: 'gallery' | 'product'; productId?: string }) => {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    setIsShopifyPushing(true);
    setShopifyModalLoading(true);
    const selectedImagesList = images.filter((img, index) => 
      selectedImages.has(getImageId(img, index))
    );
    setShowProgressDialog(true);
    try {
      setProgressInfo({
        platform: 'Shopify',
        currentIndex: 0,
        totalImages: selectedImagesList.length,
        currentImage: selectedImagesList[0],
        status: 'Authenticating...'
      });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      let lastError = null;
      for (let i = 0; i < selectedImagesList.length; i++) {
        const image = selectedImagesList[i];
        setProgressInfo({
          platform: 'Shopify',
          currentIndex: i + 1,
          totalImages: selectedImagesList.length,
          currentImage: image,
          status: `Uploading "${image.filename}"...`
        });
        try {
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
            throw new Error(errorData.error || `Failed to push ${image.filename} to Shopify`);
          }
          const result = await response.json();
          results.push(result);
          successCount++;
          setProgressInfo({
            platform: 'Shopify',
            currentIndex: i + 1,
            totalImages: selectedImagesList.length,
            currentImage: image,
            status: `✓ "${image.filename}" uploaded successfully`
          });
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          errorCount++;
          lastError = error;
          setProgressInfo({
            platform: 'Shopify',
            currentIndex: i + 1,
            totalImages: selectedImagesList.length,
            currentImage: image,
            status: `✗ Failed to upload "${image.filename}"`
          });
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      setShowProgressDialog(false);
      if (errorCount === 0) {
        setResultMessage({
          type: 'success',
          title: 'Shopify Push Successful!',
          message: `Successfully pushed ${successCount} image${successCount !== 1 ? 's' : ''} to Shopify.`
        });
        setShowResultDialog(true);
        setSelectedImages(new Set());
      } else if (successCount === 0) {
        setResultMessage({
          type: 'error',
          title: 'Shopify Push Failed',
          message: `Failed to push all ${selectedImagesList.length} images to Shopify. ${lastError instanceof Error ? lastError.message : 'Unknown error occurred.'}`
        });
        setShowResultDialog(true);
      } else {
        setResultMessage({
          type: 'error',
          title: 'Shopify Push Partially Failed',
          message: `Successfully pushed ${successCount} image${successCount !== 1 ? 's' : ''}, but ${errorCount} failed. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`
        });
        setShowResultDialog(true);
      }
      setShowShopifyModal(false);
    } catch (error) {
      setShowProgressDialog(false);
      setResultMessage({
        type: 'error',
        title: 'Shopify Push Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred while pushing to Shopify.'
      });
      setShowResultDialog(true);
    } finally {
      setIsShopifyPushing(false);
      setProgressInfo(null);
      setShopifyModalLoading(false);
    }
  };

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
    <div className="space-y-6">
      {/* Selection controls */}
      <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <input
              type="checkbox"
              checked={selectedImages.size === images.length && images.length > 0}
              onChange={() => {}} // Handled by button click
              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            {selectedImages.size === images.length && images.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          {selectedImages.size > 0 && (
            <span className="text-sm text-gray-600">
              {selectedImages.size} image{selectedImages.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        
        {selectedImages.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleBulkPushToWordPress}
              disabled={isWordPressPushing || isShopifyPushing}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
              title={user ? "Push selected images to WordPress" : "Login required to push to WordPress"}
            >
              {isWordPressPushing ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              Push to WordPress
            </button>
            <button
              onClick={() => setShowShopifyModal(true)}
              disabled={isWordPressPushing || isShopifyPushing}
              className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
              title={user ? "Push selected images to Shopify" : "Login required to push to Shopify"}
            >
              {isShopifyPushing ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              )}
              Push to Shopify
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={getImageId(image, index)}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ImageCard
              image={image}
              onDownload={onDownload}
              onSelect={(img, selected) => handleSelect(img, index, selected)}
              isSelected={selectedImages.has(getImageId(image, index))}
              onAuthRequired={onAuthRequired}
              onShowResult={(result) => {
                setResultMessage(result);
                setShowResultDialog(true);
              }}
              onImageClick={handleImageClick}
            />
          </div>
        ))}
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
            
            <div className="space-y-4">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-gray-900 font-medium">
                    {progressInfo.currentIndex} of {progressInfo.totalImages}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{width: `${(progressInfo.currentIndex / progressInfo.totalImages) * 100}%`}}
                  ></div>
                </div>
              </div>

              {/* Current Image */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <img 
                  src={progressInfo.currentImage.url} 
                  alt={progressInfo.currentImage.filename}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {progressInfo.currentImage.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(progressInfo.currentImage.size || 0)}
                  </p>
                </div>
              </div>
              
              {/* Status */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {progressInfo.status}
                </p>
                {progressInfo.status.includes('Uploading') && (
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Dialog */}
      {showResultDialog && resultMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              {resultMessage.type === 'success' ? (
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {resultMessage.title}
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              {resultMessage.message}
            </p>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowResultDialog(false);
                  setResultMessage(null);
                }}
                className="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewerModal
          image={selectedImage}
          isOpen={showImageModal}
          onClose={handleCloseModal}
          onDownload={onDownload}
          onAuthRequired={onAuthRequired}
          onShowResult={handleShowResult}
        />
      )}

      {/* Notification */}
      {notificationData && (
        <Notification
          type={notificationData.type}
          title={notificationData.title}
          message={notificationData.message}
          isVisible={showNotification}
          onClose={handleCloseNotification}
        />
      )}

      <ShopifyPushModal
        isOpen={showShopifyModal}
        onClose={() => setShowShopifyModal(false)}
        onConfirm={opts => handleBulkPushToShopify(opts)}
        loading={shopifyModalLoading}
      />
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 