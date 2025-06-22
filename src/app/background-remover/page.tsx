'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import DashboardLayout from '@/components/DashboardLayout';
import { Sparkles, Upload, Image as ImageIcon, Loader2, Download } from 'lucide-react';

export default function BackgroundRemoverPage() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setOriginalImage(file);
      setOriginalPreview(URL.createObjectURL(file));
      setProcessedImage(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false,
  });

  const handleRemoveBackground = async () => {
    if (!originalImage) return;
    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', originalImage);

    try {
      const response = await fetch('/api/remove-background', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Background removal failed');
      }

      const data = await response.json();
      setProcessedImage(data.image);

    } catch (error) {
      console.error(error);
      // Handle error display to user
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 Bytes';
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
              <Sparkles />
              AI Background Remover
            </h1>
            <p className="text-gray-400 mt-2">Automatically remove the background from any image.</p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8">
            {!originalImage ? (
              <div {...getRootProps()} className="border-2 border-dashed border-gray-600 rounded-xl h-64 flex items-center justify-center text-center p-8 cursor-pointer hover:border-blue-500 transition-colors">
                <input {...getInputProps()} />
                <div className="text-gray-400">
                  <Upload className="mx-auto h-12 w-12" />
                  {isDragActive ? (
                    <p className="mt-2 text-lg">Drop the image here ...</p>
                  ) : (
                    <p className="mt-2 text-lg">Drag & drop an image here, or click to select a file</p>
                  )}
                  <p className="text-sm mt-1">Supports PNG, JPG, WEBP</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Original Image */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white text-center">Original</h3>
                  <div className="aspect-video bg-gray-900/50 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={originalPreview!} alt="Original" className="max-h-full max-w-full" />
                  </div>
                  <p className="text-sm text-center text-gray-400">
                    Size: {formatBytes(originalImage.size)}
                  </p>
                </div>

                {/* Processed Image */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white text-center">Background Removed</h3>
                   <div className="aspect-video bg-gray-900/50 rounded-lg overflow-hidden flex items-center justify-center relative bg-[url(/transparent-bg.png)] bg-repeat">
                      {isLoading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="animate-spin h-8 w-8 text-white" />
                        </div>
                      )}
                      {processedImage ? (
                        <img src={processedImage} alt="Processed" className="max-h-full max-w-full" />
                      ) : (
                        !isLoading && <p className="text-gray-500">Awaiting processing</p>
                      )}
                   </div>
                  {processedImage && (
                    <div className="text-center">
                       <a
                        href={processedImage!}
                        download={`bg-removed-${originalImage.name.split('.')[0]}.png`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                      >
                        <Download size={16} />
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
             {originalImage && !processedImage && !isLoading && (
                <div className="text-center mt-8">
                    <button
                        onClick={handleRemoveBackground}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 text-md font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                        >
                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                        Remove Background
                    </button>
                </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 