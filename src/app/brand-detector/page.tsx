'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Notification from '@/components/Notification';
import { Tags, Image as ImageIcon, Search } from 'lucide-react';

interface DetectedBrand {
  brand: string;
  score: number;
  bounds: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  enhanced?: boolean;
  mistralAnalysis?: string;
  description?: string;
  location?: string;
}

interface NotificationState {
  isVisible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function BrandDetectorPage() {
  const [imageUrl, setImageUrl] = useState('');
  const [results, setResults] = useState<DetectedBrand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({
    isVisible: false,
    type: 'success',
    title: '',
    message: '',
  });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setImageSize({ width: naturalWidth, height: naturalHeight });
  };
  
  const handleDetection = async () => {
    if (!imageUrl) {
      setNotification({
        isVisible: true,
        type: 'error',
        title: 'Image URL Required',
        message: 'Please provide an image URL for brand detection.',
      });
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      const response = await fetch('/api/brand-detector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to detect brands.');
      }

      const data: DetectedBrand[] = await response.json();
      setResults(data);
      
      setNotification({
        isVisible: true,
        type: 'success',
        title: 'Detection Complete',
        message: data.length > 0 ? `Successfully found ${data.length} brand(s).` : 'No recognizable brands were detected.',
      });

    } catch (error: any) {
      setNotification({
        isVisible: true,
        type: 'error',
        title: 'Detection Failed',
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Tags className="h-6 w-6 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Brand Detector</h1>
        </div>
        
        <p className="text-gray-400 mb-8 max-w-2xl">
          Instantly find and identify brand logos in any image. Powered by advanced AI, our Brand Detector gives you fast, accurate results—just paste an image URL and discover the brands inside!
        </p>

        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex flex-col space-y-4 bg-gray-900/50 border border-gray-700/50 rounded-lg p-6">
            <div className="flex gap-4">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste an image URL here..."
                className="flex-grow rounded-lg border px-4 py-2 text-gray-200 bg-gray-800/80 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 border-gray-600/50"
              />
              <button
                onClick={handleDetection}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-white font-semibold shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Detect Brands</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative">
                <h2 className="text-xl font-semibold text-white mb-4">Image Preview</h2>
                <div className="relative overflow-hidden rounded-lg border border-gray-700/50" style={{ width: imageSize.width, height: imageSize.height }}>
                  <img src={imageUrl} alt="Analyzed" className="w-full h-auto object-contain" onLoad={handleImageLoad} />
                  {results.map((result, index) => {
                    const { xmin, ymin, xmax, ymax } = result.bounds;
                    return (
                      <div
                        key={index}
                        className="absolute border-2 border-purple-500"
                        style={{
                          left: `${xmin}%`,
                          top: `${ymin}%`,
                          width: `${xmax - xmin}%`,
                          height: `${ymax - ymin}%`,
                        }}
                      >
                        <span className="absolute -top-6 left-0 text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded-sm">
                          {result.brand}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Detected Brands</h2>
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div key={index} className="p-4 bg-gray-900/50 border border-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg text-gray-200">{result.brand}</span>
                        <div className="flex items-center gap-2">
                          {result.enhanced && (
                            <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-md">
                              Enhanced
                            </span>
                          )}
                          <span className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded-md">
                            Confidence: {(result.score * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      {result.description && (
                        <div className="mt-2 text-sm text-gray-400 leading-relaxed">
                          <span className="font-semibold text-gray-300"></span> {result.description}
                        </div>
                      )}
                      {result.location && (
                        <div className="mt-1 text-sm text-gray-400">
                          <span className="font-semibold text-gray-300">Location:</span> {result.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Results will be displayed here</h3>
              <p>Enter an image URL to begin the detection process.</p>
            </div>
          )}
        </div>
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