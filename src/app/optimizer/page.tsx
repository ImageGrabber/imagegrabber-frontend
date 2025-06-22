'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import DashboardLayout from '@/components/DashboardLayout';
import { Scaling, Upload, Image as ImageIcon, Loader2, Download, RefreshCw, Sun, Contrast, Palette } from 'lucide-react';

type OutputFormat = 'original' | 'jpeg' | 'png' | 'webp' | 'avif';

export default function OptimizerPage() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [optimizedImage, setOptimizedImage] = useState<string | null>(null);
  const [optimizedSize, setOptimizedSize] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [quality, setQuality] = useState(80);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [format, setFormat] = useState<OutputFormat>('original');
  
  // Enhancement controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [gamma, setGamma] = useState(100);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setOriginalImage(file);
      setOriginalPreview(URL.createObjectURL(file));
      setOptimizedImage(null);
      setOptimizedSize(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false,
  });

  // Real-time preview function
  const updatePreview = useCallback(async () => {
    if (!originalImage) return;
    
    setIsPreviewLoading(true);
    const formData = new FormData();
    formData.append('file', originalImage);
    formData.append('quality', String(quality));
    formData.append('format', format);
    if (width) formData.append('width', width);
    if (height) formData.append('height', height);
    
    // Enhancement parameters
    formData.append('brightness', String(brightness));
    formData.append('contrast', String(contrast));
    formData.append('saturation', String(saturation));
    formData.append('gamma', String(gamma));
    formData.append('preview', 'true'); // Flag for preview mode

    try {
      const response = await fetch('/api/optimizer', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setOptimizedImage(data.image);
        setOptimizedSize(data.size);
      }
    } catch (error) {
      console.error('Preview error:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [originalImage, quality, format, width, height, brightness, contrast, saturation, gamma]);

  // Debounced preview update
  useEffect(() => {
    if (!originalImage) return;
    
    const timeoutId = setTimeout(() => {
      updatePreview();
    }, 300); // 300ms delay to avoid too many requests

    return () => clearTimeout(timeoutId);
  }, [originalImage, quality, format, width, height, brightness, contrast, saturation, gamma, updatePreview]);

  const handleOptimize = async () => {
    if (!originalImage) return;
    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', originalImage);
    formData.append('quality', String(quality));
    formData.append('format', format);
    if (width) formData.append('width', width);
    if (height) formData.append('height', height);
    
    // Enhancement parameters
    formData.append('brightness', String(brightness));
    formData.append('contrast', String(contrast));
    formData.append('saturation', String(saturation));
    formData.append('gamma', String(gamma));

    try {
      const response = await fetch('/api/optimizer', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Optimization failed');
      }

      const data = await response.json();
      setOptimizedImage(data.image);
      setOptimizedSize(data.size);
    } catch (error) {
      console.error(error);
      // Handle error display to user
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReset = () => {
    setOriginalImage(null);
    setOriginalPreview(null);
    setOptimizedImage(null);
    setOptimizedSize(null);
    // Reset enhancement values
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setGamma(100);
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Scaling />
              Image Optimizer
            </h1>
            <p className="text-gray-400 mt-2">Compress, resize, and enhance your images for different use cases.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Controls */}
            <div className="lg:col-span-1 bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 h-fit">
              <h2 className="text-lg font-semibold text-white mb-4">Optimization Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="quality" className="block text-sm font-medium text-gray-300 mb-2">Quality ({quality}%)</label>
                  <input
                    id="quality"
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => {
                      const newQuality = Number(e.target.value);
                      console.log('Quality changed to:', newQuality);
                      setQuality(newQuality);
                    }}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label htmlFor="format" className="block text-sm font-medium text-gray-300 mb-2">Convert Format</label>
                  <select
                    id="format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as OutputFormat)}
                    className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  >
                    <option value="original">Keep Original Format</option>
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                    <option value="avif">AVIF</option>
                  </select>
                </div>

                <div>
                  <p className="block text-sm font-medium text-gray-300 mb-2">Resize (optional)</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Width"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-2 px-3 text-white placeholder-gray-500"
                    />
                    <span className="text-gray-500">x</span>
                    <input
                      type="number"
                      placeholder="Height"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-2 px-3 text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Enhancement Controls */}
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Image Enhancement
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="brightness" className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <Sun className="h-3 w-3" />
                        Brightness ({brightness}%)
                      </label>
                      <input
                        id="brightness"
                        type="range"
                        min="50"
                        max="200"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <label htmlFor="contrast" className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <Contrast className="h-3 w-3" />
                        Contrast ({contrast}%)
                      </label>
                      <input
                        id="contrast"
                        type="range"
                        min="50"
                        max="200"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <label htmlFor="saturation" className="block text-sm font-medium text-gray-300 mb-2">
                        Saturation ({saturation}%)
                      </label>
                      <input
                        id="saturation"
                        type="range"
                        min="0"
                        max="200"
                        value={saturation}
                        onChange={(e) => setSaturation(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <label htmlFor="gamma" className="block text-sm font-medium text-gray-300 mb-2">
                        Gamma ({gamma}%)
                      </label>
                      <input
                        id="gamma"
                        type="range"
                        min="50"
                        max="200"
                        value={gamma}
                        onChange={(e) => setGamma(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleOptimize}
                  disabled={!originalImage || isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Optimize Image'}
                </button>
              </div>
            </div>

            {/* Image Views */}
            <div className="lg:col-span-2">
              {!originalImage ? (
                <div {...getRootProps()} className="border-2 border-dashed border-gray-600 rounded-xl h-full flex items-center justify-center text-center p-8 cursor-pointer hover:border-blue-500 transition-colors">
                  <input {...getInputProps()} />
                  <div className="text-gray-400">
                    <Upload className="mx-auto h-12 w-12" />
                    {isDragActive ? (
                      <p className="mt-2 text-lg">Drop the image here ...</p>
                    ) : (
                      <p className="mt-2 text-lg">Drag & drop an image here, or click to select a file</p>
                    )}
                    <p className="text-sm mt-1">PNG, JPG, or WEBP</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Original Image */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Original</h3>
                    <div className="aspect-video bg-gray-900/50 rounded-lg overflow-hidden flex items-center justify-center">
                      <img src={originalPreview!} alt="Original" className="max-h-full max-w-full" />
                    </div>
                    <p className="text-sm text-center text-gray-400">
                      Size: {formatBytes(originalImage.size)}
                    </p>
                  </div>

                  {/* Optimized Image */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Optimized</h3>
                     <div className="aspect-video bg-gray-900/50 rounded-lg overflow-hidden flex items-center justify-center relative">
                        {isLoading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="animate-spin h-8 w-8 text-white" />
                          </div>
                        )}
                        {optimizedImage ? (
                          <img src={optimizedImage} alt="Optimized" className="max-h-full max-w-full" />
                        ) : (
                          !isLoading && <p className="text-gray-500">Awaiting optimization</p>
                        )}
                     </div>
                    {optimizedSize && (
                      <div className="flex justify-center items-center gap-4">
                        <p className="text-sm text-center text-gray-400">
                          Size: {formatBytes(optimizedSize)}
                        </p>
                        <a
                          href={optimizedImage!}
                          download={`optimized-${originalImage.name.split('.')[0]}.${format === 'original' ? originalImage.name.split('.').pop() : format}`}
                          className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                        >
                          <Download size={14} />
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 