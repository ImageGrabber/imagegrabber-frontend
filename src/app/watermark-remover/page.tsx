'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Notification from '@/components/Notification';
import { Droplet, Sparkles, Download, Search } from 'lucide-react';

interface WatermarkResult {
  hasWatermark?: boolean;
  originalUrl?: string;
  processedUrl?: string;
  creditsUsed?: number;
}

interface NotificationState {
  isVisible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function WatermarkRemoverPage() {
  const [imageUrl, setImageUrl] = useState('');
  const [result, setResult] = useState<WatermarkResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingMode, setProcessingMode] = useState<'detect' | 'remove' | null>(null);
  const [notification, setNotification] = useState<NotificationState>({ isVisible: false, type: 'success', title: '', message: '' });

  const handleProcessImage = async (mode: 'detect' | 'remove') => {
    if (!imageUrl) {
      setNotification({ isVisible: true, type: 'error', title: 'Image URL Required', message: 'Please provide an image URL to process.' });
      return;
    }

    setIsLoading(true);
    setProcessingMode(mode);
    setResult(null);

    try {
      const response = await fetch('/api/watermark-remover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, mode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process the image.');
      }

      const data: WatermarkResult = await response.json();
      setResult(data);

      let successMessage = 'Detection complete.';
      if (mode === 'remove') {
        successMessage = 'Watermark removal complete.';
      }
      
      setNotification({
        isVisible: true,
        type: 'success',
        title: 'Processing Complete',
        message: successMessage,
      });

    } catch (error: any) {
      setNotification({
        isVisible: true,
        type: 'error',
        title: 'Processing Failed',
        message: error.message,
      });
    } finally {
      setIsLoading(false);
      setProcessingMode(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Droplet className="h-6 w-6 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Watermark Detection & Removal</h1>
        </div>

        <p className="text-gray-400 mb-8 max-w-2xl">
          Automatically detect and remove watermarks from your images with a single click. Paste an image URL to get started.
        </p>

        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex flex-col space-y-4 bg-gray-900/50 border border-gray-700/50 rounded-lg p-6">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste an image URL here..."
              className="w-full rounded-lg border px-4 py-2 text-gray-200 bg-gray-800/80 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 border-gray-600/50"
            />
            <div className="flex gap-4">
              <button
                onClick={() => handleProcessImage('detect')}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-600 px-6 py-2 text-white font-semibold shadow-lg hover:bg-gray-700 disabled:opacity-50 transition-all"
              >
                {isLoading && processingMode === 'detect' ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Detecting...</span>
                  </>
                ) : (
                  <><Search className="h-4 w-4" /> Detect Only</>
                )}
              </button>
              <button
                onClick={() => handleProcessImage('remove')}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white font-semibold shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {isLoading && processingMode === 'remove' ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Removing...</span>
                  </>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Detect & Remove</>
                )}
              </button>
            </div>
          </div>
        </div>

        {isLoading && (
            <div className="text-center p-8">
                <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-400">Analyzing image...</p>
            </div>
        )}

        {result && (
          <div className="text-center">
            {result.hasWatermark ? (
              <p className="text-lg font-semibold text-green-400 mb-6">Watermark Detected!</p>
            ) : (
              <p className="text-lg font-semibold text-yellow-400 mb-6">No Watermark Detected.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-white">Original Image</h3>
                <img src={result.originalUrl} alt="Original" className="rounded-lg shadow-lg mx-auto" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-white">Processed Image</h3>
                {result.processedUrl ? (
                  <>
                    <img src={result.processedUrl} alt="Processed" className="rounded-lg shadow-lg mx-auto" />
                    <a 
                      href={result.processedUrl} 
                      download 
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white font-semibold hover:bg-green-700"
                    >
                      <Download className="h-4 w-4" /> Download Result
                    </a>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-900/50 rounded-lg">
                    <p className="text-gray-400">Removal result will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
      <Notification
        isVisible={notification.isVisible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isVisible: false })}
      />
    </DashboardLayout>
  );
} 