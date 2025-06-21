'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Upload, FileText, Globe, Download, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';

interface BatchJob {
  id: string;
  urls: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalUrls: number;
  completedUrls: number;
  results: BatchResult[];
  createdAt: Date;
}

interface BatchResult {
  url: string;
  status: 'success' | 'failed';
  imageCount?: number;
  error?: string;
  images?: any[];
}

export default function BatchPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return <DashboardLayout><div /></DashboardLayout>;
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;

    // Check file type
    const validTypes = ['text/plain', 'text/csv', 'application/csv'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      alert('Please upload a valid CSV or TXT file');
      return;
    }

    setUploading(true);
    
    try {
      const text = await file.text();
      const urls = parseUrls(text);
      
      if (urls.length === 0) {
        alert('No valid URLs found in the file');
        return;
      }

      if (urls.length > 100) {
        alert('Maximum 100 URLs allowed per batch');
        return;
      }

      // Create new batch job
      const newJob: BatchJob = {
        id: Date.now().toString(),
        urls,
        status: 'pending',
        progress: 0,
        totalUrls: urls.length,
        completedUrls: 0,
        results: [],
        createdAt: new Date(),
      };

      setJobs(prev => [newJob, ...prev]);
      
      // Start processing
      processBatch(newJob);
      
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const parseUrls = (text: string): string[] => {
    const lines = text.split('\n');
    const urls: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Handle CSV format (assume URL is in first column)
      const url = trimmed.split(',')[0].trim().replace(/"/g, '');
      
      // Basic URL validation
      try {
        new URL(url);
        urls.push(url);
      } catch {
        // Skip invalid URLs
        continue;
      }
    }
    
    return urls;
  };

  const processBatch = async (job: BatchJob) => {
    setJobs(prev => prev.map(j => 
      j.id === job.id 
        ? { ...j, status: 'processing' as const }
        : j
    ));

    const results: BatchResult[] = [];
    
    for (let i = 0; i < job.urls.length; i++) {
      const url = job.urls[i];
      
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Session expired');
        }

        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ url }),
        });

        if (res.ok) {
          const data = await res.json();
          results.push({
            url,
            status: 'success',
            imageCount: data.images.length,
            images: data.images,
          });
          
          // Transaction is now recorded automatically in the scrape API
          
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          results.push({
            url,
            status: 'failed',
            error: errorData.error || 'Extraction failed',
          });
        }
      } catch (error) {
        results.push({
          url,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Update progress
      const completedUrls = i + 1;
      const progress = Math.round((completedUrls / job.totalUrls) * 100);
      
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { 
              ...j, 
              progress,
              completedUrls,
              results: [...results],
            }
          : j
      ));

      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark as completed
    setJobs(prev => prev.map(j => 
      j.id === job.id 
        ? { ...j, status: 'completed' as const }
        : j
    ));

    // Trigger credits refresh
    window.dispatchEvent(new CustomEvent('creditsUpdated'));
  };

  const downloadResults = (job: BatchJob) => {
    const successfulResults = job.results.filter(r => r.status === 'success' && r.images);
    const allImages = successfulResults.flatMap(r => r.images || []);
    
    if (allImages.length === 0) {
      alert('No images to download');
      return;
    }

    // Create a summary report
    const report = {
      batchId: job.id,
      createdAt: job.createdAt,
      totalUrls: job.totalUrls,
      successfulUrls: successfulResults.length,
      totalImages: allImages.length,
      results: job.results.map(r => ({
        url: r.url,
        status: r.status,
        imageCount: r.imageCount || 0,
        error: r.error,
      })),
    };

    // Download report as JSON
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-report-${job.id}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  const removeJob = (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const getStatusIcon = (status: BatchJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'processing':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2">Batch Processing</h1>
            <p className="text-gray-400">Upload a CSV or TXT file with URLs to extract images from multiple websites at once</p>
          </div>

          {/* Upload Area */}
          <div className="mb-8">
            <div
              className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600/50 bg-gray-800/50 hover:border-gray-500/50 hover:bg-gray-800/70'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
              
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700/50">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    {uploading ? 'Processing file...' : 'Upload URL file'}
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Drag and drop your CSV or TXT file here, or click to browse
                  </p>
                  
                  <div className="text-sm text-gray-500">
                    <p>• One URL per line</p>
                    <p>• CSV format: URL in first column</p>
                    <p>• Maximum 100 URLs per batch</p>
                    <p>• Supported formats: .csv, .txt</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Jobs List */}
          {jobs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Batch Jobs</h2>
              
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl bg-gray-900/80 border border-gray-700/50 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <div>
                        <h3 className="font-medium text-gray-200">
                          Batch Job #{job.id}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {job.totalUrls} URLs • Created {job.createdAt.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {job.status === 'completed' && (
                        <button
                          onClick={() => downloadResults(job)}
                          className="flex items-center gap-2 rounded-full bg-blue-600/80 border border-blue-500/50 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-500/80"
                        >
                          <Download className="h-4 w-4" />
                          Download Report
                        </button>
                      )}
                      
                      <button
                        onClick={() => removeJob(job.id)}
                        className="flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:bg-red-600/20 hover:text-red-300 transition-all duration-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {job.status === 'processing' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">
                          Progress: {job.completedUrls} / {job.totalUrls}
                        </span>
                        <span className="text-sm text-gray-400">{job.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Results Summary */}
                  {job.results.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-lg bg-gray-800/50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-medium text-gray-200">Successful</span>
                        </div>
                        <p className="text-lg font-semibold text-green-400">
                          {job.results.filter(r => r.status === 'success').length}
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-gray-800/50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <span className="text-sm font-medium text-gray-200">Failed</span>
                        </div>
                        <p className="text-lg font-semibold text-red-400">
                          {job.results.filter(r => r.status === 'failed').length}
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-gray-800/50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium text-gray-200">Total Images</span>
                        </div>
                        <p className="text-lg font-semibold text-blue-400">
                          {job.results.reduce((sum, r) => sum + (r.imageCount || 0), 0)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 