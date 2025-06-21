'use client';

import { useState, useRef, useMemo, ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import DashboardLayout from '@/components/DashboardLayout';
import ImageGrid from '@/components/ImageGrid';
import ImageFilterBar, { FilterOptions } from '@/components/ImageFilterBar';
import { Image } from '../page';
import { Upload, FileText, Globe, Download, AlertCircle, CheckCircle, Clock, X, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';

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
  images?: Image[];
}

export default function BatchPage() {
  const { user } = useAuth();
  const { openModal } = useModal();
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewingJobId, setViewingJobId] = useState<string | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    types: [],
    qualities: [],
    sortBy: 'filename',
    sortOrder: 'asc'
  });

  if (!user) {
    return <DashboardLayout><div /></DashboardLayout>;
  }

  const viewingJob = useMemo(() => {
    if (!viewingJobId) return null;
    return jobs.find(j => j.id === viewingJobId) || null;
  }, [jobs, viewingJobId]);
  
  const successfulLinks = useMemo(() => {
    if (!viewingJob) return [];
    return viewingJob.results
        .filter(r => r.status === 'success' && r.images && r.images.length > 0)
        .map(r => r.url);
  }, [viewingJob]);
  
  const imageCount = useMemo(() => {
    if (!viewingJob) return 0;
    return viewingJob.results.reduce((acc, r) => acc + (r.imageCount || 0), 0);
  }, [viewingJob]);

  const filteredGroupedResults = useMemo(() => {
    if (!viewingJob) return [];

    const sortFn = (a: Image, b: Image) => {
        let aValue: any, bValue: any;
        switch (filters.sortBy) {
            case 'filename': aValue = a.filename.toLowerCase(); bValue = b.filename.toLowerCase(); break;
            case 'size': aValue = a.size || 0; bValue = b.size || 0; break;
            case 'width': aValue = a.width || 0; bValue = b.width || 0; break;
            case 'height': aValue = a.height || 0; bValue = b.height || 0; break;
            default: return 0;
        }
        if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
        return 0;
    };

    return viewingJob.results
        .filter(result => 
            result.status === 'success' && 
            result.images && 
            result.images.length > 0 &&
            selectedLinks.includes(result.url)
        )
        .map(result => {
            let filtered = [...result.images!];

            // Apply filters
            if (filters.minSize) {
                filtered = filtered.filter(img => (img.size || 0) >= filters.minSize!);
            }
            if (filters.maxSize) {
                filtered = filtered.filter(img => (img.size || 0) <= filters.maxSize!);
            }
            if (filters.types.length > 0) {
                filtered = filtered.filter(img => img.type && filters.types.includes(img.type));
            }
            if (filters.qualities.length > 0) {
                filtered = filtered.filter(img => img.quality && filters.qualities.includes(img.quality));
            }

            // Apply sorting
            filtered.sort(sortFn);
            
            return { ...result, images: filtered };
        })
        .filter(result => result.images.length > 0);

  }, [viewingJob, filters, selectedLinks]);

  const flatFilteredImages = useMemo(() => {
    return filteredGroupedResults.flatMap(r => r.images || []);
  }, [filteredGroupedResults]);
  
  const filteredCount = useMemo(() => {
    return flatFilteredImages.length;
  }, [flatFilteredImages]);

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
          let errorMessage = 'Extraction failed';
          try {
            const errorData = await res.json();
            if (res.status === 402) {
               errorMessage = errorData.error || 'You are out of credits. Please upgrade to continue.';
            } else {
               errorMessage = errorData.error || 'Extraction failed';
            }
          } catch (e) {
            errorMessage = 'Extraction failed with a non-JSON response.';
          }
          
          results.push({
            url,
            status: 'failed',
            error: errorMessage,
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
            }
          : j
      ));

      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Mark as completed and set final results
    setJobs(prev => prev.map(j => 
      j.id === job.id 
        ? { ...j, status: 'completed' as const, results: results }
        : j
    ));

    // Trigger credits refresh
    window.dispatchEvent(new CustomEvent('creditsUpdated'));
  };

  const handleToggleImages = (jobId: string) => {
    if (viewingJobId === jobId) {
      setViewingJobId(null);
      setSelectedLinks([]);
    } else {
      setViewingJobId(jobId);
      // Reset filters when viewing a new job
      setFilters({
        types: [],
        qualities: [],
        sortBy: 'filename',
        sortOrder: 'asc'
      });
      // By default, all links are selected when first opening
      const job = jobs.find(j => j.id === jobId);
      if (job) {
          const allSuccessfulLinks = job.results
              .filter(r => r.status === 'success' && r.images && r.images.length > 0)
              .map(r => r.url);
          setSelectedLinks(allSuccessfulLinks);
      }
    }
  };

  const handleLinkSelectionChange = (link: string) => {
      setSelectedLinks(prev => 
          prev.includes(link) 
              ? prev.filter(l => l !== link)
              : [...prev, link]
      );
  };

  const handleSelectAllLinks = () => {
      if (selectedLinks.length === successfulLinks.length) {
          setSelectedLinks([]);
      } else {
          setSelectedLinks(successfulLinks);
      }
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

  /* --------------- DOWNLOAD ONE -------------- */
  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const link = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = link;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(link);
      a.remove();
    } catch (err) {
      console.error(err);
    }
  };

  /* --------------- DOWNLOAD ALL -------------- */
  const handleDownloadAll = async () => {
    if (!flatFilteredImages.length) return;

    try {
      const res = await fetch('/api/download-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: flatFilteredImages }),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const link = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = link;
      a.download = 'images.zip';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(link);
      a.remove();
    } catch (err) {
      console.error(err);
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
                    
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleImages(job.id)}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                        title={viewingJobId === job.id ? "Hide Images" : "View Images"}
                      >
                        {viewingJobId === job.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        <span>{viewingJobId === job.id ? "Hide" : "View"} Images</span>
                      </button>
                      <button
                        onClick={() => downloadResults(job)}
                        className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition-colors"
                      >
                        <Download size={16} />
                        <span>Download Report</span>
                      </button>
                      <button
                        onClick={() => removeJob(job.id)}
                        className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/10"
                      >
                        <X size={18} />
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
                    <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="text-green-500" size={20} />
                          <span className="font-semibold text-white text-lg">{job.results.filter(r => r.status === 'success').length}</span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Successful</div>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex items-center justify-center gap-2">
                          <AlertCircle className="text-red-500" size={20} />
                          <span className="font-semibold text-white text-lg">{job.results.filter(r => r.status === 'failed').length}</span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Failed</div>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex items-center justify-center gap-2">
                          <Globe className="text-blue-500" size={20} />
                          <span className="font-semibold text-white text-lg">{job.results.filter(r => r.status === 'success').reduce((acc, r) => acc + (r.imageCount || 0), 0)}</span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Total Images</div>
                      </div>
                    </div>
                  )}

                  {viewingJobId === job.id && (
                    <div className="mt-6 border-t border-gray-700 pt-6">
                      {imageCount > 0 ? (
                        <>
                          <ImageFilterBar
                            onFilterChange={setFilters}
                            imageCount={imageCount}
                            filteredCount={filteredCount}
                            onDownloadAll={handleDownloadAll}
                            filteredAndSortedImages={flatFilteredImages}
                          />

                          {/* Link Filter Section */}
                          <div className="my-6 p-4 border border-gray-700/50 rounded-lg bg-gray-900/50">
                              <h3 className="text-md font-semibold text-gray-200 mb-3 flex items-center gap-2">
                                  <LinkIcon size={18} />
                                  Filter by Source URL
                              </h3>
                              <div className="flex items-center mb-3">
                                  <input
                                      type="checkbox"
                                      id="select-all-links"
                                      checked={selectedLinks.length === successfulLinks.length}
                                      onChange={handleSelectAllLinks}
                                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                                  />
                                  <label htmlFor="select-all-links" className="ml-2 text-sm text-gray-300 font-medium">
                                      Select All ({selectedLinks.length} / {successfulLinks.length})
                                  </label>
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                  {successfulLinks.map(link => (
                                      <div key={link} className="flex items-center">
                                          <input
                                              type="checkbox"
                                              id={`link-${link}`}
                                              checked={selectedLinks.includes(link)}
                                              onChange={() => handleLinkSelectionChange(link)}
                                              className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                                          />
                                          <label htmlFor={`link-${link}`} className="ml-2 text-sm text-gray-400 break-all truncate" title={link}>
                                              {link}
                                          </label>
                                      </div>
                                  ))}
                              </div>
                          </div>

                         

                          {filteredGroupedResults.length > 0 ? (
                            filteredGroupedResults.map(result => (
                              <div key={result.url} className="mb-10 mt-2">
                                <div className="pb-4 border-b border-gray-700 mb-4">
                                    <h3 className="text-lg font-semibold text-gray-200 break-all">{result.url}</h3>
                                    <p className="text-sm text-gray-400">{result.images!.length} images found</p>
                                </div>
                                <ImageGrid 
                                    images={result.images!} 
                                    onDownload={handleDownload} 
                                    onAuthRequired={() => openModal('login', 'Please log in or register to push images to your integrations.')}
                                />
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              No images match the current filters.
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          No images found for this batch job.
                        </div>
                      )}
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